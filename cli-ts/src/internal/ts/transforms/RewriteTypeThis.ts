/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.RewriteTypeThis
 *
 * This transform rewrites 'this' type references in TypeScript declarations.
 * It converts type references to the owning class/interface into 'this' types when appropriate,
 * and converts 'this' types back to class references in certain contexts like constructors.
 */

import { NoComments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import type {
	TsDeclClass,
	TsDeclInterface,
	TsMemberFunction,
	TsQIdent,
	TsTree,
	TsType,
	TsTypeParam,
	TsTypeRef,
	TsTypeThis,
} from "../trees.js";
import { TsIdent } from "../trees.js";

/**
 * Transform that rewrites 'this' type references.
 *
 * This transform extends TreeTransformationScopedChanges and processes TsType nodes.
 * It performs two main transformations:
 *
 * 1. Converts type references to the owning class/interface into 'this' types when:
 *    - The reference has no type parameters
 *    - The reference points to the current owner (class/interface)
 *    - The reference is inside a function type
 *    - The reference is NOT in an index type, type lookup, or constructor
 *
 * 2. Converts 'this' types back to class references when:
 *    - The 'this' type is referenced in a constructor or index type
 */
export class RewriteTypeThis extends TreeTransformationScopedChanges {
	/**
	 * Processes TsType nodes, applying this type rewriting logic.
	 */
	override enterTsType(scope: TsTreeScope): (tpe: TsType) => TsType {
		return (tpe: TsType) => {
			// Case 1: Convert type reference to 'this' type
			if (tpe._tag === "TsTypeRef") {
				const x = tpe as TsTypeRef;
				if (
					x.tparams.length === 0 &&
					this.isReferenceToOwner(scope.stack, x.name) &&
					this.isReferencedInFunction(scope.stack) &&
					!this.isReferencedInIndexType(scope.stack) &&
					!this.isReferencedInTypeLookup(scope.stack) &&
					!this.isReferencedInConstructor(scope.stack)
				) {
					return { _tag: "TsTypeThis" } as TsTypeThis;
				}
			}

			// Case 2: Convert 'this' type to class reference
			if (tpe._tag === "TsTypeThis") {
				const x = tpe as TsTypeThis;
				if (
					this.isReferencedInConstructor(scope.stack) ||
					this.isReferencedInIndexType(scope.stack)
				) {
					// Find the owning class or interface in the scope stack
					for (const tree of scope.stack) {
						if (tree._tag === "TsDeclClass") {
							const owner = tree as TsDeclClass;
							if (owner.codePath) {
								// Convert CodePath to TsQIdent
								const qident = {
									parts: IArray.fromArray([TsIdent.simple(owner.name.value)]),
									asString: owner.name.value,
								} as TsQIdent;
								return {
									_tag: "TsTypeRef",
									comments: NoComments.instance,
									name: qident,
									tparams: this.asTypeArgs(owner.tparams),
									asString: `TsTypeRef(${owner.name.value})`,
								} as TsTypeRef;
							}
						} else if (tree._tag === "TsDeclInterface") {
							const owner = tree as TsDeclInterface;
							if (owner.codePath) {
								// Convert CodePath to TsQIdent
								const qident = {
									parts: IArray.fromArray([TsIdent.simple(owner.name.value)]),
									asString: owner.name.value,
								} as TsQIdent;
								return {
									_tag: "TsTypeRef",
									comments: NoComments.instance,
									name: qident,
									tparams: this.asTypeArgs(owner.tparams),
									asString: `TsTypeRef(${owner.name.value})`,
								} as TsTypeRef;
							}
						}
					}
					// If no owner found, return unchanged
					return x;
				}
			}

			// Default case: return unchanged
			return tpe;
		};
	}

	/**
	 * Checks if a qualified name refers to the current owner (class or interface).
	 */
	private isReferenceToOwner(stack: TsTree[], ownerName: TsQIdent): boolean {
		return stack.some((tree) => {
			if (tree._tag === "TsDeclInterface") {
				const owner = tree as TsDeclInterface;
				const lastPart = ownerName.parts.get(ownerName.parts.length - 1);
				return lastPart && lastPart.value === owner.name.value;
			} else if (tree._tag === "TsDeclClass") {
				const owner = tree as TsDeclClass;
				const lastPart = ownerName.parts.get(ownerName.parts.length - 1);
				return lastPart && lastPart.value === owner.name.value;
			}
			return false;
		});
	}

	/**
	 * Checks if the current context is inside a function type.
	 */
	private isReferencedInFunction(stack: TsTree[]): boolean {
		return stack.some((tree) => tree._tag === "TsTypeFunction");
	}

	/**
	 * Checks if the current context is inside a constructor.
	 */
	private isReferencedInConstructor(stack: TsTree[]): boolean {
		return stack.some((tree) => {
			if (tree._tag === "TsTypeConstructor") {
				return true;
			} else if (tree._tag === "TsMemberFunction") {
				const member = tree as TsMemberFunction;
				return member.name.value === "constructor";
			} else if (tree._tag === "TsMemberCtor") {
				return true;
			}
			return false;
		});
	}

	/**
	 * Checks if the current context is inside a type lookup.
	 */
	private isReferencedInTypeLookup(stack: TsTree[]): boolean {
		return stack.some((tree) => tree._tag === "TsTypeLookup");
	}

	/**
	 * Checks if the current context is inside an index type (keyof).
	 */
	private isReferencedInIndexType(stack: TsTree[]): boolean {
		return stack.some((tree) => tree._tag === "TsTypeKeyOf");
	}

	/**
	 * Converts type parameters to type arguments.
	 * This is equivalent to TsTypeParam.asTypeArgs in Scala.
	 */
	private asTypeArgs(tparams: IArray<TsTypeParam>): IArray<TsType> {
		return tparams.map(
			(tparam) =>
				({
					_tag: "TsTypeRef",
					comments: NoComments.instance,
					name: {
						parts: IArray.fromArray([tparam.name]),
						asString: tparam.name.value,
					} as TsQIdent,
					tparams: IArray.Empty,
					asString: `TsTypeRef(${tparam.name.value})`,
				}) as TsTypeRef,
		) as unknown as IArray<TsType>;
	}
}

/**
 * Singleton instance of RewriteTypeThis for convenient usage.
 * Equivalent to the Scala object RewriteTypeThis.
 */
export const RewriteTypeThisTransform = new RewriteTypeThis();

/**
 * Static transform function for functional usage.
 */
export const RewriteTypeThisTransformFunction = {
	/**
	 * Transform function that can be used directly.
	 */
	enterTsType:
		(scope: TsTreeScope) =>
		(x: TsType): TsType => {
			return RewriteTypeThisTransform.enterTsType(scope)(x);
		},

	withTree: (scope: TsTreeScope, tree: TsTree): TsTreeScope => {
		return RewriteTypeThisTransform.withTree(scope, tree);
	},
};
