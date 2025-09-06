/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.InlineTrivial
 *
 * This is the first part of a two-step process to eliminate the myriad of type aliases
 * and interfaces resulting from module resolution.
 *
 * This transform inlines trivial type aliases and interfaces by following chains of
 * type references to their final targets. A "trivial" declaration is one marked with
 * the IsTrivial marker that simply points to another type without adding any value.
 *
 * The second part of this process is done in scala.js (CleanupTrivial) to ensure
 * that all dependencies can resolve their uses of the intermediate type aliases.
 *
 * Example transformation:
 * ```typescript
 * // Before:
 * type TrivialAlias = TargetType; // marked as trivial
 * let x: TrivialAlias;
 *
 * // After:
 * let x: TargetType;
 * ```
 */

import { none, type Option, some } from "fp-ts/Option";
import { IsTrivial } from "../../Comment.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import { TsQIdentUtils } from "../TsTreeScope.js";
import type {
	TsDecl,
	TsDeclEnum,
	TsDeclInterface,
	TsDeclTypeAlias,
	TsNamedDecl,
	TsQIdent,
	TsType,
	TsTypeIntersect,
	TsTypeRef,
} from "../trees.js";

/**
 * Transform that inlines trivial type aliases and interfaces.
 *
 * This transform extends TreeTransformationScopedChanges and processes TsTypeRef nodes.
 * It looks up type references in scope and follows chains of trivial declarations
 * to their final targets.
 */
export class InlineTrivial extends TreeTransformationScopedChanges {
	/**
	 * Processes TsTypeRef nodes, inlining trivial type aliases and interfaces.
	 */
	override enterTsTypeRef(scope: TsTreeScope): (x: TsTypeRef) => TsTypeRef {
		return (x: TsTypeRef) => {
			const rewritten = this.rewritten(scope, x);
			return rewritten._tag === "Some" ? rewritten.value : x;
		};
	}

	/**
	 * Attempts to rewrite a type reference by following trivial declarations.
	 *
	 * @param scope The current tree scope
	 * @param x The type reference to potentially rewrite
	 * @returns Some(rewritten) if the reference was rewritten, None otherwise
	 */
	rewritten(scope: TsTreeScope, x: TsTypeRef): Option<TsTypeRef> {
		// Only process non-primitive type references
		if (TsQIdentUtils.Primitive(x.name) || x.tparams.length > 0) {
			return none;
		}

		const lookupResults = scope.lookupTypeIncludeScope(x.name);

		for (const [decl, newScope] of lookupResults) {
			// Handle exported enums
			if (decl._tag === "TsDeclEnum" && x.tparams.length === 0) {
				const enumDecl = decl as TsDeclEnum;
				if (enumDecl.exportedFrom && enumDecl.exportedFrom._tag === "Some") {
					return some({
						...x,
						name: enumDecl.exportedFrom.value.name,
					});
				}
			}

			// Handle trivial type aliases
			if (decl._tag === "TsDeclTypeAlias") {
				const alias = decl as TsDeclTypeAlias;
				const followResult = this.followTrivial(newScope, alias);
				if (followResult._tag === "Some") {
					return some({
						...x,
						name: followResult.value,
					});
				}
			}

			// Handle trivial interfaces
			if (decl._tag === "TsDeclInterface") {
				const interface_ = decl as TsDeclInterface;
				const followResult = this.followTrivial(newScope, interface_);
				if (followResult._tag === "Some") {
					return some({
						...x,
						name: followResult.value,
					});
				}
			}
		}

		return none;
	}

	/**
	 * Follows a chain of trivial declarations to find the final target.
	 *
	 * @param scope The current tree scope
	 * @param cur The current declaration to follow
	 * @returns Some(finalName) if a final target was found, None otherwise
	 */
	private followTrivial(scope: TsTreeScope, cur: TsDecl): Option<TsQIdent> {
		// Check if the declaration is marked as trivial
		// Only named declarations have comments
		if (!this.isNamedDecl(cur) || !cur.comments.has(IsTrivial.instance)) {
			return none;
		}

		if (cur._tag === "TsDeclInterface") {
			const interface_ = cur as TsDeclInterface;

			// Look for the first effective type reference in inheritance
			if (interface_.inheritance.length > 0) {
				const firstInheritance = interface_.inheritance.apply(0);
				const effectiveRef = this.extractEffectiveTypeRef(firstInheritance);

				if (effectiveRef._tag === "Some") {
					const nextName = effectiveRef.value.name;

					// Look up the next declaration and follow the chain
					const lookupResults = scope.lookupTypeIncludeScope(nextName);

					for (const [nextDecl, newScope] of lookupResults) {
						// Avoid infinite recursion by checking code paths
						if (
							this.isNamedDecl(nextDecl) &&
							!this.sameCodePath(nextDecl, cur)
						) {
							const followResult = this.followTrivial(newScope, nextDecl);
							if (followResult._tag === "Some") {
								return followResult;
							}
						}
					}

					// If we can't follow further, return the next name
					return some(nextName);
				}
			}
		}

		if (cur._tag === "TsDeclTypeAlias") {
			const alias = cur as TsDeclTypeAlias;
			const effectiveRef = this.extractEffectiveTypeRef(alias.alias);

			if (effectiveRef._tag === "Some") {
				const nextName = effectiveRef.value.name;

				// Look up the next declaration and follow the chain
				const lookupResults = scope.lookupTypeIncludeScope(nextName);

				for (const [nextDecl, newScope] of lookupResults) {
					// Avoid infinite recursion by checking code paths
					if (this.isNamedDecl(nextDecl) && !this.sameCodePath(nextDecl, cur)) {
						const followResult = this.followTrivial(newScope, nextDecl);
						if (followResult._tag === "Some") {
							return followResult;
						}
					}
				}

				// If we can't follow further, return the next name
				return some(nextName);
			}
		}

		return none;
	}

	/**
	 * Extracts an effective type reference from a type.
	 * This handles both direct type references and intersection types where
	 * all parts point to the same type.
	 */
	private extractEffectiveTypeRef(tpe: TsType): Option<TsTypeRef> {
		if (tpe._tag === "TsTypeRef") {
			return some(tpe as TsTypeRef);
		}

		if (tpe._tag === "TsTypeIntersect") {
			const intersect = tpe as TsTypeIntersect;
			const typeRefs: TsTypeRef[] = [];
			const nonTypeRefs: TsType[] = [];

			// Partition intersection types into type refs and others
			for (const type of intersect.types) {
				if (type._tag === "TsTypeRef") {
					typeRefs.push(type as TsTypeRef);
				} else {
					nonTypeRefs.push(type);
				}
			}

			// If all are type refs and they all point to the same type, return the first one
			if (nonTypeRefs.length === 0 && typeRefs.length > 0) {
				const distinctNames = new Set(
					typeRefs.map((ref) => {
						const lastPart = ref.name.parts.apply(ref.name.parts.length - 1);
						return lastPart ? lastPart.value : "";
					}),
				);
				if (distinctNames.size === 1) {
					return some(typeRefs[0]);
				}
			}
		}

		return none;
	}

	/**
	 * Checks if a declaration is a named declaration.
	 */
	private isNamedDecl(decl: TsDecl): decl is TsNamedDecl {
		return (
			decl._tag === "TsDeclClass" ||
			decl._tag === "TsDeclInterface" ||
			decl._tag === "TsDeclTypeAlias" ||
			decl._tag === "TsDeclEnum" ||
			decl._tag === "TsDeclFunction" ||
			decl._tag === "TsDeclVar" ||
			decl._tag === "TsDeclNamespace" ||
			decl._tag === "TsDeclModule"
		);
	}

	/**
	 * Checks if two declarations have the same code path.
	 * Used to avoid infinite recursion.
	 */
	private sameCodePath(decl1: TsNamedDecl, decl2: TsDecl): boolean {
		if (!("codePath" in decl1) || !("codePath" in decl2)) {
			return false;
		}

		const path1 = (decl1 as any).codePath;
		const path2 = (decl2 as any).codePath;

		// Simple equality check - in a real implementation this would be more sophisticated
		return JSON.stringify(path1) === JSON.stringify(path2);
	}
}

/**
 * Singleton instance of InlineTrivial for convenient usage.
 * Equivalent to the Scala object InlineTrivial.
 */
export const InlineTrivialTransform = new InlineTrivial();

/**
 * Static transform function for functional usage.
 */
export const InlineTrivialTransformFunction = {
	/**
	 * Transform function that can be used directly.
	 */
	enterTsTypeRef:
		(scope: TsTreeScope) =>
		(x: TsTypeRef): TsTypeRef => {
			return InlineTrivialTransform.enterTsTypeRef(scope)(x);
		},

	rewritten: (scope: TsTreeScope, x: TsTypeRef): Option<TsTypeRef> => {
		return InlineTrivialTransform.rewritten(scope, x);
	},

	withTree: (scope: TsTreeScope, tree: any): TsTreeScope => {
		return InlineTrivialTransform.withTree(scope, tree);
	},
};
