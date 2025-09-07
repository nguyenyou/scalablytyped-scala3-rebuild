/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.LibrarySpecific
 *
 * Provides library-specific transformations for TypeScript AST trees.
 * Each library has its own set of patches to fix common issues or improve compatibility.
 */

import { none, some } from "fp-ts/Option";
import { Comments } from "../../Comments.js";
import { Comment } from "../../Comment.js";
import { IArray } from "../../IArray.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import { TypeRewriter } from "./TypeRewriter.js";
import type {
	TsDecl,
	TsDeclInterface,
	TsDeclModule,
	TsDeclTypeAlias,
	TsIdent,
	TsIdentLibrary,
	TsIdentLibrarySimple,
	TsIdentModule,
	TsIdentSimple,
	TsMember,
	TsMemberFunction,
	TsMemberIndex,
	TsMemberProperty,
	TsParsedFile,
	TsQIdent,
	TsType,
	TsTypeIntersect,
	TsTypeParam,
	TsTypeRef,
	TsTypeUnion,
} from "../trees.js";
import {
	TsIdent as TsIdentConstructor,
	TsQIdent as TsQIdentConstructor,
	TsTypeRef as TsTypeRefConstructor,
	TsTypeParam as TsTypeParamConstructor,
	TsTypeIntersect as TsTypeIntersectConstructor,
	TsTypeUnion as TsTypeUnionConstructor,
	TsMemberProperty as TsMemberPropertyConstructor,
	TsProtectionLevel
} from "../trees.js";

/**
 * Base interface for named library-specific transformations.
 * Each transformation is associated with a specific library.
 */
export interface Named extends TreeTransformationScopedChanges {
	readonly libName: TsIdentLibrary;
}

/**
 * Standard library patches
 */
class StdTransform extends TreeTransformationScopedChanges implements Named {
	readonly libName = TsIdentConstructor.librarySimple("std");

	override enterTsDecl(scope: TsTreeScope): (x: TsDecl) => TsDecl {
		return (x: TsDecl) => {
			if (x._tag === "TsDeclInterface") {
				const iface = x as TsDeclInterface;
				if (iface.name.value === "HTMLCollectionOf") {
					return {
						...iface,
						inheritance: IArray.Empty,
					};
				}
			}
			return x;
		};
	}
}

/**
 * Styled Components library patches
 */
class StyledComponentsTransform extends TreeTransformationScopedChanges implements Named {
	readonly libName = TsIdentConstructor.librarySimple("styled-components");

	override enterTsDecl(scope: TsTreeScope): (x: TsDecl) => TsDecl {
		return (x: TsDecl) => {
			if (x._tag === "TsDeclTypeAlias") {
				const ta = x as TsDeclTypeAlias;
				if (ta.name.value === "WithOptionalTheme" && ta.alias._tag === "TsTypeIntersect") {
					const intersect = ta.alias as TsTypeIntersect;
					if (intersect.types.length > 0) {
						const omit = intersect.types.head;
						const rest = intersect.types.tail;
						if (omit._tag === "TsTypeRef") {
							const omitRef = omit as TsTypeRef;
							if (omitRef.name.parts.last.value === "Omit") {
								const newTypes = IArray.fromArray([omitRef.tparams.head, ...rest.toArray()]);
								return {
									...ta,
									alias: TsTypeIntersectConstructor.create(newTypes),
								};
							}
						}
					}
				}
			}
			return x;
		};
	}
}

/**
 * AMap library patches
 */
class AMapTransform extends TreeTransformationScopedChanges implements Named {
	readonly libName = TsIdentConstructor.librarySimple("amap-js-api");

	override enterTsDeclTypeAlias(scope: TsTreeScope): (x: TsDeclTypeAlias) => TsDeclTypeAlias {
		return (x: TsDeclTypeAlias) => {
			if (x.name.value === "Merge") {
				// Avoid insane definition of `Merge`
				const typeArgs = TsTypeParamConstructor.asTypeArgs(x.tparams);
				// Cast TsTypeRef[] to TsType[] since TsTypeRef extends TsType
				const typeArgsAsTypes = typeArgs as unknown as IArray<TsType>;
				return {
					...x,
					alias: TsTypeIntersectConstructor.create(typeArgsAsTypes),
				};
			}
			return x;
		};
	}
}

/**
 * Semantic UI React library patches
 */
class SemanticUiReactTransform extends TreeTransformationScopedChanges implements Named {
	readonly libName = TsIdentConstructor.librarySimple("semantic-ui-react");

	private readonly removeIndex = new Set<string>([
		"InputProps",
		"TextAreaProps",
		"FormProps",
		"ButtonProps",
		"TableCellProps"
	]);

	override enterTsParsedFile(scope: TsTreeScope): (x: TsParsedFile) => TsParsedFile {
		return (x: TsParsedFile) => ({
			...x,
			members: x.members.filter(member => {
				if (member._tag === "TsDeclModule") {
					const module = member as TsDeclModule;
					return !module.name.fragments.includes("src");
				}
				return true;
			})
		});
	}

	override enterTsDeclInterface(_scope: TsTreeScope): (x: TsDeclInterface) => TsDeclInterface {
		return (x: TsDeclInterface) => {
			const shouldRemoveIndex = this.removeIndex.has(x.name.value);

			if (shouldRemoveIndex) {
				const newMembers = x.members.filter(member => member._tag !== "TsMemberIndex");
				return {
					...x,
					members: newMembers
				};
			}
			return x;
		};
	}
}

/**
 * React library patches
 */
class ReactTransform extends TreeTransformationScopedChanges implements Named {
	static readonly libName = TsIdentConstructor.librarySimple("react");
	readonly libName = ReactTransform.libName;

	private readonly DOMAttributes = TsIdentConstructor.simple("DOMAttributes");
	private readonly ReactElement = TsIdentConstructor.simple("ReactElement");
	private readonly ReactFragment = TsIdentConstructor.simple("ReactFragment");
	private readonly ReactNode = TsIdentConstructor.simple("ReactNode");
	private readonly CSSProperties = TsIdentConstructor.simple("CSSProperties");
	readonly Readonly = TsQIdentConstructor.of(TsIdentConstructor.simple("Readonly"));

	override enterTsDeclInterface(scope: TsTreeScope): (x: TsDeclInterface) => TsDeclInterface {
		return (x: TsDeclInterface) => {
			switch (x.name.value) {
				case "CSSProperties": {
					// Restore compatibility with old CSSProperties syntax
					const unionType = TsTypeUnionConstructor.create(
						IArray.fromArray([TsTypeRefConstructor.any, TsTypeRefConstructor.undefined] as TsType[])
					);
					const hack = TsMemberPropertyConstructor.create(
						Comments.create("/* fake member to keep old syntax */"),
						TsProtectionLevel.default(),
						TsIdentConstructor.simple("hack"),
						some(unionType),
						none,
						false, // isStatic
						false  // isReadOnly
					);
					return {
						...x,
						members: x.members.append(hack)
					};
				}
				case "ReactElement": {
					// Drop useless type parameters
					const newX = { ...x, tparams: IArray.Empty };
					const replacements = new Map<TsType, TsType>(
						x.tparams.toArray().map(tp => [TsTypeRefConstructor.fromIdent(tp.name), TsTypeRefConstructor.any])
					);
					return new TypeRewriter(newX).visitTsDeclInterface(replacements)(newX);
				}
				case "DOMAttributes": {
					// Filter out *Capture props to avoid parameter limit issues
					const newMembers = x.members.filter(member => {
						if (member._tag === "TsMemberFunction") {
							const func = member as TsMemberFunction;
							return !func.name.value.endsWith("Capture");
						}
						if (member._tag === "TsMemberProperty") {
							const prop = member as TsMemberProperty;
							return !prop.name.value.endsWith("Capture");
						}
						return true;
					});
					return { ...x, members: newMembers };
				}
				default:
					return x;
			}
		};
	}

	override enterTsDeclTypeAlias(scope: TsTreeScope): (x: TsDeclTypeAlias) => TsDeclTypeAlias {
		return (x: TsDeclTypeAlias) => {
			switch (x.name.value) {
				case "ReactFragment": {
					if (x.alias._tag === "TsTypeUnion") {
						const union = x.alias as TsTypeUnion;
						const dropObject = union.types.filter(type => type !== TsTypeRefConstructor.object);
						return {
							...x,
							alias: TsTypeUnionConstructor.simplified(dropObject)
						};
					}
					return x;
				}
				case "ReactNode": {
					if (x.alias._tag === "TsTypeUnion") {
						const union = x.alias as TsTypeUnion;
						const dropUseless = union.types.filter(type => type !== TsTypeRefConstructor.null);
						return {
							...x,
							alias: TsTypeUnionConstructor.simplified(dropUseless)
						};
					}
					return x;
				}
				default:
					return x;
			}
		};
	}
}

// Create instances of the transforms
const aMapTransform = new AMapTransform();
const reactTransform = new ReactTransform();
const semanticUiReactTransform = new SemanticUiReactTransform();
const stdTransform = new StdTransform();
const styledComponentsTransform = new StyledComponentsTransform();

// Map of library names to their transforms
const patches = new Map<string, Named>([
	[aMapTransform.libName.value, aMapTransform],
	[reactTransform.libName.value, reactTransform],
	[semanticUiReactTransform.libName.value, semanticUiReactTransform],
	[stdTransform.libName.value, stdTransform],
	[styledComponentsTransform.libName.value, styledComponentsTransform],
]);

/**
 * Main LibrarySpecific object providing access to library-specific transformations.
 */
export const LibrarySpecific = {
	/**
	 * Standard library transform
	 */
	std: stdTransform,

	/**
	 * React library transform
	 */
	react: reactTransform,

	/**
	 * Gets a transformation for the specified library.
	 * @param libName The library identifier
	 * @returns The transformation if available, undefined otherwise
	 */
	apply: (libName: TsIdentLibrary): TreeTransformationScopedChanges | undefined => {
		return patches.get(libName.value);
	},
};
