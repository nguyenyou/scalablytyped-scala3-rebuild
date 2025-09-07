/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.QualifyReferences
 * 
 * This transformation qualifies type references by resolving them to their fully qualified names.
 * It handles type references in various contexts including type aliases, class inheritance,
 * and general type usage.
 */

import { none, type Option, some } from "fp-ts/Option";
import { Comment } from "../../Comment.js";
import { Comments } from "../../Comments.js";
import { IArray, IArrayPatterns } from "../../IArray.js";
import { TsTreeScope } from "../TsTreeScope.js";
import { TsTypeFormatter } from "../TsTypeFormatter.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";

import {
	TsDeclClass,
	TsDeclTypeAlias,
	TsIdent,
	TsIdentLibrary,
	TsTypeIntersect,
	TsTypeRef,
	type TsNamedDecl,
	type TsQIdent,
	type TsType,
} from "../trees.js";

/**
 * Main QualifyReferences transformation object
 */
export const QualifyReferences = {
	/**
	 * Apply the QualifyReferences transformation to a parsed file
	 */
	apply: (skipValidation: boolean) => {
		return new QualifyReferencesVisitor(skipValidation);
	},
};

/**
 * Visitor that qualifies type references by resolving them to their fully qualified names
 */
class QualifyReferencesVisitor extends TreeTransformationScopedChanges {
	constructor(private readonly skipValidation: boolean) {
		super();
	}

	override enterTsType(scope: TsTreeScope): (x: TsType) => TsType {
		return (x: TsType) => {
			if (x._tag === "TsTypeRef") {
				const typeRef = x as TsTypeRef;
				const resolved = this.resolveTypeRef(scope, typeRef, none);
				// Cast TsTypeRef[] to TsType[] since TsTypeRef extends TsType
				const resolvedAsTypes = resolved as unknown as IArray<TsType>;
				return TsTypeIntersect.simplified(resolvedAsTypes);
			}
			return x;
		};
	}

	override enterTsTypeRef(scope: TsTreeScope): (x: TsTypeRef) => TsTypeRef {
		return (x: TsTypeRef) => {
			const resolved = this.resolveTypeRef(scope, x, none);
			const exactlyOne = IArrayPatterns.exactlyOne(resolved);
			if (exactlyOne !== undefined) {
				return exactlyOne;
			}
			
			// Due to the type signature we can't intersect these
			// Find one with std library or use the first one
			const stdRef = resolved.find(ref => 
				ref.name.parts.exists(part => TsIdent.equals(part, TsIdent.std))
			);
			return stdRef ?? resolved.apply(0);
		};
	}

	/**
	 * Special case because apparently this makes sense:
	 * ```typescript
	 * import {Options} from '...'
	 * export type Options = Options
	 * ```
	 */
	override enterTsDeclTypeAlias(scope: TsTreeScope): (x: TsDeclTypeAlias) => TsDeclTypeAlias {
		return (ta: TsDeclTypeAlias) => {
			if (ta.alias._tag === "TsTypeRef") {
				const typeRef = ta.alias as TsTypeRef;
				const filter = some((decl: TsNamedDecl) => {
					const declCodePath = decl.codePath.forceHasPath().codePath;
					const taCodePath = ta.codePath.forceHasPath().codePath;
					return !this.qidentEquals(declCodePath, taCodePath);
				});
				const resolved = this.resolveTypeRef(scope, typeRef, filter);
				// Cast TsTypeRef[] to TsType[] since TsTypeRef extends TsType
				const resolvedAsTypes = resolved as unknown as IArray<TsType>;
				const newAlias = TsTypeIntersect.simplified(resolvedAsTypes);
				return { ...ta, alias: newAlias };
			}
			return ta;
		};
	}

	override enterTsDeclClass(scope: TsTreeScope): (x: TsDeclClass) => TsDeclClass {
		return (x: TsDeclClass) => {
			// Process parent separately from implements, but filter out self-references
			let qualifiedParent = IArray.Empty;
			if (x.parent._tag === "Some") {
				const parentRef = x.parent.value;
				// Check if parent is a self-reference
				const exactlyOne = IArrayPatterns.exactlyOne(parentRef.name.parts);
				if (exactlyOne === undefined || !TsIdent.equals(exactlyOne, x.name)) {
					qualifiedParent = this.resolveTypeRef(scope, parentRef, none);
				}
			}

			// Filter out self-references from implements
			const filteredImplements: IArray<TsTypeRef> = x.implementsInterfaces.filter(typeRef => {
				// Check if this is a self-reference (same name as the class)
				const exactlyOne = IArrayPatterns.exactlyOne(typeRef.name.parts);
				if (exactlyOne !== undefined && TsIdent.equals(exactlyOne, x.name)) {
					return false;
				}
				return true;
			});

			const qualifiedImplements: IArray<TsTypeRef> = filteredImplements.flatMap(typeRef =>
				this.resolveTypeRef(scope, typeRef, none)
			);

			const newParent = qualifiedParent.length > 0 ? some(qualifiedParent.apply(0)) : none;

			return TsDeclClass.create(
				x.comments,
				x.declared,
				x.isAbstract,
				x.name,
				x.tparams,
				newParent,
				qualifiedImplements,
				x.members,
				x.jsLocation,
				x.codePath
			);
		};
	}

	/**
	 * Resolve a type reference to its fully qualified form
	 */
	private resolveTypeRef(
		scope: TsTreeScope,
		tr: TsTypeRef,
		maybeFilter: Option<(decl: TsNamedDecl) => boolean>
	): IArray<TsTypeRef> {
		if (!this.shouldQualify(tr.name, scope)) {
			return IArray.apply(tr);
		}

		const all: IArray<TsNamedDecl> = scope.lookupType(tr.name, this.skipValidation);

		const filtered: IArray<TsNamedDecl> = maybeFilter._tag === "Some"
			? all.filter(maybeFilter.value)
			: all;

		if (filtered.isEmpty) {
			if (this.skipValidation) {
				return IArray.apply(tr);
			} else {
				const msg = `Couldn't qualify ${TsTypeFormatter.apply(tr)}`;
				scope.logger.warn(msg);
				const warningComment = Comment.warning(msg);
				const anyWithWarning = { ...TsTypeRef.any, comments: Comments.fromComment(warningComment) };
				return IArray.apply(anyWithWarning);
			}
		}

		const many: IArray<TsTypeRef> = filtered.map(decl => {
			const location = decl.codePath.forceHasPath();
			return { ...tr, name: location.codePath };
		});

		// Return all qualified type references
		return many;
	}

	/**
	 * Determine if a qualified identifier should be qualified
	 */
	private shouldQualify(name: TsQIdent, scope: TsTreeScope): boolean {
		// Don't qualify primitive types
		if (this.isPrimitive(name)) {
			return false;
		}

		// Don't qualify library identifiers
		if (name.parts.length > 0 && this.isLibraryIdent(name.parts.apply(0))) {
			return false;
		}

		// Don't qualify abstract types (type parameters)
		if (scope.isAbstract(name)) {
			return false;
		}

		return true;
	}

	/**
	 * Check if a qualified identifier represents a primitive type
	 */
	private isPrimitive(name: TsQIdent): boolean {
		if (name.parts.length !== 1) return false;
		const identName = name.parts.apply(0).value;
		return [
			"any", "boolean", "number", "string", "symbol", "object",
			"undefined", "null", "void", "never", "unknown", "bigint"
		].includes(identName);
	}

	/**
	 * Check if an identifier is a library identifier
	 */
	private isLibraryIdent(ident: TsIdent): boolean {
		return ident._tag === "TsIdentLibrarySimple" || ident._tag === "TsIdentLibraryScoped";
	}

	/**
	 * Compare two qualified identifiers for equality
	 */
	private qidentEquals(a: TsQIdent, b: TsQIdent): boolean {
		if (a.parts.length !== b.parts.length) return false;
		for (let i = 0; i < a.parts.length; i++) {
			if (!TsIdent.equals(a.parts.apply(i), b.parts.apply(i))) {
				return false;
			}
		}
		return true;
	}
}
