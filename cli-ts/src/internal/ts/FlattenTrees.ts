/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.FlattenTrees
 *
 * In TypeScript, classes, interfaces and namespaces can be extended, both within the same file, or by includes.
 * This module provides functionality to flatten and merge TypeScript trees.
 */

import { pipe } from "fp-ts/function";
import { none, type Option, some } from "fp-ts/Option";
import { IsTrivial } from "../Comment.js";
import { Comments } from "../Comments.js";
import { IArray, IArrayBuilder, partialFunction } from "../IArray.js";
import { CodePath } from "./CodePath.js";
import { JsLocation } from "./JsLocation.js";
import { TsTreeTraverse } from "./TsTreeTraverse.js";
import {
	type Indexing,
	TsAugmentedModule,
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclEnum,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclModule,
	TsDeclNamespace,
	TsDeclTypeAlias,
	TsDeclVar,
	TsGlobal,
	TsIdent,
	type TsMember,
	TsMemberIndex,
	TsMemberProperty,
	type TsNamedDecl,
	TsParsedFile,
	TsTree,
	type TsType,
	TsTypeIntersect,
	type TsTypeParam,
	TsTypeQuery,
} from "./trees.js";

/**
 * FlattenTrees utility object providing tree flattening and merging functionality.
 * This is a direct port of the Scala FlattenTrees object.
 */
export const FlattenTrees = {
	/**
	 * Empty file used as the base for merging operations
	 */
	EmptyFile: TsParsedFile.create(
		Comments.empty(),
		IArray.Empty,
		IArray.Empty,
		CodePath.noPath(),
	),

	/**
	 * Apply method for merging multiple files
	 * Equivalent to: def apply(files: IArray[TsParsedFile]): TsParsedFile = files.foldLeft(EmptyFile)(mergeFile)
	 */
	apply(files: IArray<TsParsedFile>): TsParsedFile {
		return files.foldLeft(FlattenTrees.EmptyFile, (acc, file) =>
			FlattenTrees.mergeFile(acc, file),
		);
	},

	/**
	 * Apply method for a single file
	 * Equivalent to: def apply(file: TsParsedFile): TsParsedFile = mergeFile(EmptyFile, file)
	 */
	applySingle(file: TsParsedFile): TsParsedFile {
		return FlattenTrees.mergeFile(FlattenTrees.EmptyFile, file);
	},

	/**
	 * Merge two code paths, giving priority to the first non-NoPath
	 * Equivalent to Scala's mergeCodePath method
	 */
	mergeCodePath(one: CodePath, two: CodePath): CodePath {
		if (CodePath.isNoPath(one)) {
			return two;
		} else {
			return one;
		}
	},

	/**
	 * Merge two JavaScript locations
	 * Equivalent to Scala's mergeJsLocation method
	 */
	mergeJsLocation(one: JsLocation, two: JsLocation): JsLocation {
		if (JsLocation.isGlobal(one) && JsLocation.isModule(two)) {
			return JsLocation.both(two, one);
		} else if (JsLocation.isModule(one) && JsLocation.isGlobal(two)) {
			return JsLocation.both(one, two);
		} else if (JsLocation.isZero(one)) {
			return two;
		} else {
			return one;
		}
	},

	/**
	 * Merge two parsed files
	 * Equivalent to Scala's mergeFile method
	 */
	mergeFile(one: TsParsedFile, two: TsParsedFile): TsParsedFile {
		return TsParsedFile.create(
			FlattenTrees.mergeComments(one.comments, two.comments),
			one.directives.appendedAll(two.directives).distinct(),
			FlattenTrees.newMembers(one.members, two.members),
			FlattenTrees.mergeCodePath(one.codePath, two.codePath),
		);
	},

	/**
	 * Merge comments, avoiding duplication if they're identical
	 * Equivalent to Scala's mergeComments method
	 */
	mergeComments(one: Comments, two: Comments): Comments {
		if (
			one.cs.length === two.cs.length &&
			one.cs.every((c, i) => c === two.cs[i])
		) {
			return one;
		} else {
			return two.cs.reduce((acc, comment) => acc.add(comment), one);
		}
	},

	/**
	 * Merge two arrays of container or declaration members
	 * Equivalent to Scala's newMembers method
	 */
	newMembers(
		these: IArray<TsContainerOrDecl>,
		thats: IArray<TsContainerOrDecl>,
	): IArray<TsContainerOrDecl> {
		// Partition into named and unnamed declarations
		const [theseNamedDecls, theseUnnamedDecls] = these.partitionCollect(
			partialFunction(
				(x: TsContainerOrDecl): x is TsNamedDecl => TsTree.isNamedDecl(x),
				(x: TsContainerOrDecl) => x as TsNamedDecl,
			),
		);

		const [thatsNamedDecls, thatsUnnamedDecls] = thats.partitionCollect(
			partialFunction(
				(x: TsContainerOrDecl): x is TsNamedDecl => TsTree.isNamedDecl(x),
				(x: TsContainerOrDecl) => x as TsNamedDecl,
			),
		);

		const rets = IArrayBuilder.fromIArray<TsContainerOrDecl>(
			theseUnnamedDecls,
			these.length + thats.length,
		);

		// Process unnamed members
		thatsUnnamedDecls.forEach((that) => {
			if (TsGlobal.isGlobal(that)) {
				const thatGlobal = that as TsGlobal;
				rets.addOrUpdateMatching(
					thatGlobal,
					(x: TsContainerOrDecl) => {
						if (TsGlobal.isGlobal(x)) {
							const xGlobal = x as TsGlobal;
							return xGlobal.withMembers(
								FlattenTrees.newMembers(IArray.Empty, xGlobal.members),
							);
						}
						return x;
					},
					partialFunction(
						(existing: TsContainerOrDecl): existing is TsGlobal =>
							TsGlobal.isGlobal(existing),
						(existing: TsContainerOrDecl) =>
							FlattenTrees.mergeGlobal(thatGlobal, existing as TsGlobal),
					),
				);
			} else {
				rets.addOne(that);
			}
		});

		// Add processed named members
		FlattenTrees.newNamedMembers(theseNamedDecls, thatsNamedDecls).forEach(
			(member) => {
				rets.addOne(member);
			},
		);

		return rets.result().distinct();
	},

	/**
	 * Merge two arrays of named declarations
	 * Equivalent to Scala's newNamedMembers method
	 */
	newNamedMembers(
		these: IArray<TsNamedDecl>,
		thats: IArray<TsNamedDecl>,
	): IArray<TsNamedDecl> {
		const rets = IArrayBuilder.empty<TsNamedDecl>();

		// Process all elements (both these and thats) through the same merging logic
		const allElements = these.concat(thats);
		allElements.forEach((that) => {
			if (TsDeclNamespace.isNamespace(that)) {
				const thatNamespace = that as TsDeclNamespace;
				rets.addOrUpdateMatching(
					thatNamespace,
					(x: TsNamedDecl) => {
						if (TsDeclNamespace.isNamespace(x)) {
							const xNamespace = x as TsDeclNamespace;
							return xNamespace.withMembers(
								FlattenTrees.newMembers(IArray.Empty, xNamespace.members),
							);
						}
						return x;
					},
					partialFunction(
						(existing: TsNamedDecl): boolean => {
							if (TsDeclNamespace.isNamespace(existing)) {
								const existingNamespace = existing as TsDeclNamespace;
								return (
									thatNamespace.name.value === existingNamespace.name.value
								);
							} else if (TsDeclFunction.isFunction(existing)) {
								const existingFunction = existing as TsDeclFunction;
								return thatNamespace.name.value === existingFunction.name.value;
							} else if (TsDeclVar.isVar(existing)) {
								const existingVar = existing as TsDeclVar;
								return thatNamespace.name.value === existingVar.name.value;
							}
							return false;
						},
						(existing: TsNamedDecl) => {
							if (TsDeclNamespace.isNamespace(existing)) {
								return FlattenTrees.mergeNamespaces(
									thatNamespace,
									existing as TsDeclNamespace,
								);
							} else if (TsDeclFunction.isFunction(existing)) {
								return FlattenTrees.mergeNamespaceAndFunction(
									thatNamespace,
									existing as TsDeclFunction,
								);
							} else if (TsDeclVar.isVar(existing)) {
								return FlattenTrees.mergeNamespaceAndVar(
									thatNamespace,
									existing as TsDeclVar,
								);
							}
							return existing;
						},
					),
				);
			} else if (TsDeclFunction.isFunction(that)) {
				const thatFunction = that as TsDeclFunction;
				rets.addOrUpdateMatching(
					thatFunction,
					(x: TsNamedDecl) => x,
					partialFunction(
						(existing: TsNamedDecl): boolean => {
							if (TsDeclNamespace.isNamespace(existing)) {
								const existingNamespace = existing as TsDeclNamespace;
								return thatFunction.name.value === existingNamespace.name.value;
							}
							return false;
						},
						(existing: TsNamedDecl) => {
							if (TsDeclNamespace.isNamespace(existing)) {
								return FlattenTrees.mergeNamespaceAndFunction(
									existing as TsDeclNamespace,
									thatFunction,
								);
							}
							return existing;
						},
					),
				);
			} else {
				// Handle other declaration types in the next chunk
				FlattenTrees.handleOtherNamedDeclarations(rets, that);
			}
		});

		return rets.result();
	},

	/**
	 * Handle other types of named declarations (modules, classes, interfaces, etc.)
	 * This is a helper method to break down the large newNamedMembers method
	 */
	handleOtherNamedDeclarations(
		rets: IArrayBuilder<TsNamedDecl>,
		that: TsNamedDecl,
	): void {
		if (TsDeclModule.isModule(that)) {
			const thatModule = that as TsDeclModule;
			rets.addOrUpdateMatching(
				thatModule,
				(x: TsNamedDecl) => {
					if (TsDeclModule.isModule(x)) {
						const xModule = x as TsDeclModule;
						return xModule.withMembers(
							FlattenTrees.newMembers(IArray.Empty, xModule.members),
						);
					}
					return x;
				},
				partialFunction(
					(existing: TsNamedDecl): boolean => {
						if (TsDeclModule.isModule(existing)) {
							const existingModule = existing as TsDeclModule;
							return thatModule.name.value === existingModule.name.value;
						}
						return false;
					},
					(existing: TsNamedDecl) => {
						if (TsDeclModule.isModule(existing)) {
							return FlattenTrees.mergeModule(
								thatModule,
								existing as TsDeclModule,
							);
						}
						return existing;
					},
				),
			);
		} else if (TsDeclClass.isClass(that)) {
			const thatClass = that as TsDeclClass;
			rets.addOrUpdateMatching(
				thatClass,
				(x: TsNamedDecl) => {
					if (TsDeclClass.isClass(x)) {
						const xClass = x as TsDeclClass;
						return TsDeclClass.create(
							xClass.comments,
							xClass.declared,
							xClass.isAbstract,
							xClass.name,
							xClass.tparams,
							xClass.parent,
							xClass.implementsInterfaces,
							FlattenTrees.newClassMembers(IArray.Empty, xClass.members),
							xClass.jsLocation,
							xClass.codePath,
						);
					}
					return x;
				},
				partialFunction(
					(existing: TsNamedDecl): boolean => {
						if (TsDeclClass.isClass(existing)) {
							const existingClass = existing as TsDeclClass;
							return thatClass.name.value === existingClass.name.value;
						} else if (TsDeclInterface.isInterface(existing)) {
							const existingInterface = existing as TsDeclInterface;
							return thatClass.name.value === existingInterface.name.value;
						}
						return false;
					},
					(existing: TsNamedDecl) => {
						if (TsDeclClass.isClass(existing)) {
							return FlattenTrees.mergeClass(
								thatClass,
								existing as TsDeclClass,
							);
						} else if (TsDeclInterface.isInterface(existing)) {
							return FlattenTrees.mergedClassAndInterface(
								thatClass,
								existing as TsDeclInterface,
							);
						}
						return existing;
					},
				),
			);
		} else {
			// Handle remaining types in next chunk
			FlattenTrees.handleRemainingNamedDeclarations(rets, that);
		}
	},

	/**
	 * Handle remaining types of named declarations (interfaces, enums, vars, type aliases, etc.)
	 */
	handleRemainingNamedDeclarations(
		rets: IArrayBuilder<TsNamedDecl>,
		that: TsNamedDecl,
	): void {
		if (TsDeclInterface.isInterface(that)) {
			const thatInterface = that as TsDeclInterface;
			rets.addOrUpdateMatching(
				TsDeclInterface.create(
					thatInterface.comments,
					thatInterface.declared,
					thatInterface.name,
					thatInterface.tparams,
					thatInterface.inheritance,
					FlattenTrees.newClassMembers(IArray.Empty, thatInterface.members),
					thatInterface.codePath,
				),
				(x: TsNamedDecl) => x,
				partialFunction(
					(existing: TsNamedDecl): boolean => {
						if (TsDeclInterface.isInterface(existing)) {
							const existingInterface = existing as TsDeclInterface;
							return thatInterface.name.value === existingInterface.name.value;
						} else if (TsDeclClass.isClass(existing)) {
							const existingClass = existing as TsDeclClass;
							return thatInterface.name.value === existingClass.name.value;
						}
						return false;
					},
					(existing: TsNamedDecl) => {
						if (TsDeclInterface.isInterface(existing)) {
							return FlattenTrees.mergeInterface(
								thatInterface,
								existing as TsDeclInterface,
							);
						} else if (TsDeclClass.isClass(existing)) {
							return FlattenTrees.mergedClassAndInterface(
								existing as TsDeclClass,
								thatInterface,
							);
						}
						return existing;
					},
				),
			);
		} else if (TsDeclEnum.isEnum(that)) {
			const thatEnum = that as TsDeclEnum;
			rets.addOrUpdateMatching(
				thatEnum,
				(x: TsNamedDecl) => x,
				partialFunction(
					(existing: TsNamedDecl): boolean => {
						if (TsDeclEnum.isEnum(existing)) {
							const existingEnum = existing as TsDeclEnum;
							return thatEnum.name.value === existingEnum.name.value;
						}
						return false;
					},
					(existing: TsNamedDecl) => {
						if (TsDeclEnum.isEnum(existing)) {
							return FlattenTrees.mergeEnum(thatEnum, existing as TsDeclEnum);
						}
						return existing;
					},
				),
			);
		} else if (TsDeclVar.isVar(that)) {
			const thatVar = that as TsDeclVar;
			rets.addOrUpdateMatching(
				thatVar,
				(x: TsNamedDecl) => x,
				partialFunction(
					(existing: TsNamedDecl): boolean => {
						if (TsDeclVar.isVar(existing)) {
							const existingVar = existing as TsDeclVar;
							return thatVar.name.value === existingVar.name.value;
						} else if (TsDeclNamespace.isNamespace(existing)) {
							const existingNamespace = existing as TsDeclNamespace;
							return thatVar.name.value === existingNamespace.name.value;
						}
						return false;
					},
					(existing: TsNamedDecl) => {
						if (TsDeclVar.isVar(existing)) {
							const existingVar = existing as TsDeclVar;
							return TsDeclVar.create(
								FlattenTrees.mergeComments(
									existingVar.comments,
									thatVar.comments,
								),
								existingVar.declared,
								existingVar.readOnly,
								existingVar.name,
								FlattenTrees.bothTypes(existingVar.tpe, thatVar.tpe),
								existingVar.expr,
								existingVar.jsLocation,
								existingVar.codePath,
							);
						} else if (TsDeclNamespace.isNamespace(existing)) {
							return FlattenTrees.mergeNamespaceAndVar(
								existing as TsDeclNamespace,
								thatVar,
							);
						}
						return existing;
					},
				),
			);
		} else {
			// Handle remaining types
			FlattenTrees.handleFinalNamedDeclarations(rets, that);
		}
	},

	/**
	 * Handle final types of named declarations (augmented modules, type aliases)
	 */
	handleFinalNamedDeclarations(
		rets: IArrayBuilder<TsNamedDecl>,
		that: TsNamedDecl,
	): void {
		if (TsAugmentedModule.isAugmentedModule(that)) {
			const thatAugmented = that as TsAugmentedModule;
			rets.addOrUpdateMatching(
				thatAugmented,
				(x: TsNamedDecl) => {
					if (TsAugmentedModule.isAugmentedModule(x)) {
						const xAugmented = x as TsAugmentedModule;
						return xAugmented.withMembers(
							FlattenTrees.newMembers(IArray.Empty, xAugmented.members),
						);
					}
					return x;
				},
				partialFunction(
					(existing: TsNamedDecl): boolean => {
						if (TsAugmentedModule.isAugmentedModule(existing)) {
							const existingAugmented = existing as TsAugmentedModule;
							return thatAugmented.name.value === existingAugmented.name.value;
						}
						return false;
					},
					(existing: TsNamedDecl) => {
						if (TsAugmentedModule.isAugmentedModule(existing)) {
							return FlattenTrees.mergeAugmentedModule(
								thatAugmented,
								existing as TsAugmentedModule,
							);
						}
						return existing;
					},
				),
			);
		} else if (TsDeclTypeAlias.isTypeAlias(that)) {
			const thatTypeAlias = that as TsDeclTypeAlias;
			rets.addOrUpdateMatching(
				thatTypeAlias,
				(x: TsNamedDecl) => x,
				partialFunction(
					(existing: TsNamedDecl): boolean => {
						if (TsDeclTypeAlias.isTypeAlias(existing)) {
							const existingTypeAlias = existing as TsDeclTypeAlias;
							return thatTypeAlias.name.value === existingTypeAlias.name.value;
						}
						return false;
					},
					(existing: TsNamedDecl) => {
						if (TsDeclTypeAlias.isTypeAlias(existing)) {
							const existingTypeAlias = existing as TsDeclTypeAlias;
							// TypeScript doesn't do this, but we do. The reason is that sometimes a file is included twice
							// and it's hard to avoid (see augmented-modules test, for instance). This ensures that we handle it
							const candidates = IArray.fromArray([
								existingTypeAlias,
								thatTypeAlias,
							]);
							const nonTrivialCandidates = candidates.filter(
								(ta) => !ta.comments.has(IsTrivial),
							);

							// If exactly one is non-trivial, use it; otherwise create intersection
							if (nonTrivialCandidates.length === 1) {
								return nonTrivialCandidates.apply(0);
							} else {
								return TsDeclTypeAlias.create(
									FlattenTrees.mergeComments(
										existingTypeAlias.comments,
										thatTypeAlias.comments,
									),
									existingTypeAlias.declared || thatTypeAlias.declared,
									existingTypeAlias.name,
									FlattenTrees.mergeTypeParams(
										existingTypeAlias.tparams,
										thatTypeAlias.tparams,
									),
									TsTypeIntersect.simplified(
										IArray.fromArray([
											existingTypeAlias.alias,
											thatTypeAlias.alias,
										]),
									),
									FlattenTrees.mergeCodePath(
										existingTypeAlias.codePath,
										thatTypeAlias.codePath,
									),
								);
							}
						}
						return existing;
					},
				),
			);
		} else {
			// Default case: just add the declaration
			rets.addOne(that);
		}
	},

	/**
	 * Merge class members (properties, methods, etc.)
	 * Equivalent to Scala's newClassMembers method
	 */
	newClassMembers(
		these: IArray<TsMember>,
		thats: IArray<TsMember>,
	): IArray<TsMember> {
		const rets = IArrayBuilder.empty<TsMember>();

		// Process all members from both arrays
		these.appendedAll(thats).forEach((member) => {
			if (TsMemberProperty.isMemberProperty(member)) {
				const thatProperty = member as TsMemberProperty;
				rets.addOrUpdateMatching(
					thatProperty,
					(x: TsMember) => x,
					partialFunction(
						(existing: TsMember): boolean => {
							if (TsMemberProperty.isMemberProperty(existing)) {
								const existingProperty = existing as TsMemberProperty;
								return (
									thatProperty.name.value === existingProperty.name.value &&
									thatProperty.isStatic === existingProperty.isStatic
								);
							}
							return false;
						},
						(existing: TsMember) => {
							if (TsMemberProperty.isMemberProperty(existing)) {
								const existingProperty = existing as TsMemberProperty;
								return TsMemberProperty.create(
									FlattenTrees.mergeComments(
										existingProperty.comments,
										thatProperty.comments,
									),
									existingProperty.level,
									existingProperty.name,
									FlattenTrees.bothTypes(
										existingProperty.tpe,
										thatProperty.tpe,
									),
									existingProperty.expr,
									existingProperty.isStatic,
									existingProperty.isReadOnly,
								);
							}
							return existing;
						},
					),
				);
			} else if (TsMemberIndex.isMemberIndex(member)) {
				const thatIndex = member as TsMemberIndex;
				rets.addOrUpdateMatching(
					thatIndex,
					(x: TsMember) => x,
					partialFunction(
						(existing: TsMember): boolean => {
							if (TsMemberIndex.isMemberIndex(existing)) {
								const existingIndex = existing as TsMemberIndex;
								return FlattenTrees.indexingEquals(
									thatIndex.indexing,
									existingIndex.indexing,
								);
							}
							return false;
						},
						(existing: TsMember) => {
							if (TsMemberIndex.isMemberIndex(existing)) {
								const existingIndex = existing as TsMemberIndex;
								const mergedValueType = pipe(
									IArray.fromOptions(
										existingIndex.valueType,
										thatIndex.valueType,
									),
									(types) =>
										types.isEmpty
											? none
											: some(TsTypeIntersect.simplified(types)),
								);
								return TsMemberIndex.create(
									FlattenTrees.mergeComments(
										existingIndex.comments,
										thatIndex.comments,
									),
									existingIndex.isReadOnly,
									existingIndex.level,
									existingIndex.indexing,
									mergedValueType,
								);
							}
							return existing;
						},
					),
				);
			} else {
				// Other member types (methods, constructors, etc.) are just added
				rets.addOne(member);
			}
		});

		return rets.result().distinct();
	},

	/**
	 * Helper method to check if two indexing patterns are equal
	 */
	indexingEquals(one: Indexing, two: Indexing): boolean {
		if (one._tag !== two._tag) return false;

		if (one._tag === "IndexingDict" && two._tag === "IndexingDict") {
			const oneDict = one as any; // IndexingDict interface
			const twoDict = two as any;
			return (
				oneDict.name.value === twoDict.name.value &&
				oneDict.tpe.asString === twoDict.tpe.asString
			);
		}

		return true; // For other indexing types, assume equal if tags match
	},

	/**
	 * Merge two optional types, handling type preferences
	 * Equivalent to Scala's bothTypes method
	 */
	bothTypes(one: Option<TsType>, two: Option<TsType>): Option<TsType> {
		const types = IArray.fromOptions(one, two);

		if (types.isEmpty) {
			return none;
		} else if (types.length === 1) {
			return some(types.apply(0));
		} else {
			// Filter out less preferred types
			const preferred = types.filter((tpe) => {
				// If we combine a type query with an actual type, drop the former
				if (TsTypeQuery.isTypeQuery(tpe)) {
					return false;
				}
				// Heuristic: filter out types containing 'never'
				const neverTypes = TsTreeTraverse.collect(tpe, (tree: TsTree) => {
					if (
						tree._tag === "TsTypeRef" &&
						(tree as any).name?.value === "never"
					) {
						return tree;
					}
					return undefined;
				});
				if (neverTypes.nonEmpty) {
					return false;
				}
				return true;
			});

			return preferred.headOption
				? some(preferred.headOption)
				: types.headOption
					? some(types.headOption)
					: none;
		}
	},

	/**
	 * Merge type parameters, preferring the longer array
	 * Equivalent to Scala's mergeTypeParams method
	 */
	mergeTypeParams(
		thats: IArray<TsTypeParam>,
		existings: IArray<TsTypeParam>,
	): IArray<TsTypeParam> {
		return thats.length >= existings.length ? thats : existings;
	},

	/**
	 * Merge two augmented modules
	 * Equivalent to Scala's mergeAugmentedModule method
	 */
	mergeAugmentedModule(
		that: TsAugmentedModule,
		existing: TsAugmentedModule,
	): TsAugmentedModule {
		return TsAugmentedModule.create(
			FlattenTrees.mergeComments(existing.comments, that.comments),
			existing.name,
			FlattenTrees.newMembers(existing.members, that.members),
			FlattenTrees.mergeCodePath(existing.codePath, that.codePath),
			that.jsLocation,
		);
	},

	/**
	 * Merge two interfaces
	 * Equivalent to Scala's mergeInterface method
	 */
	mergeInterface(
		that: TsDeclInterface,
		existing: TsDeclInterface,
	): TsDeclInterface {
		return TsDeclInterface.create(
			FlattenTrees.mergeComments(existing.comments, that.comments),
			existing.declared || that.declared,
			existing.name,
			FlattenTrees.mergeTypeParams(that.tparams, existing.tparams),
			existing.inheritance.appendedAll(that.inheritance).distinct(),
			FlattenTrees.newClassMembers(existing.members, that.members),
			FlattenTrees.mergeCodePath(existing.codePath, that.codePath),
		);
	},

	/**
	 * Merge two enums
	 * Equivalent to Scala's mergeEnum method
	 */
	mergeEnum(that: TsDeclEnum, existing: TsDeclEnum): TsDeclEnum {
		const both = IArray.fromArray([existing, that]);
		// Only get code paths from enums that have actual paths (not NoPath)
		const codePaths = new Set(
			both
				.mapNotNoneOption((e) => {
					const pathOpt = e.codePath.get();
					return pathOpt._tag === "Some"
						? some(pathOpt.value.codePath.asString)
						: none;
				})
				.toArray(),
		);
		const exportedFromOptions = both.mapNotNoneOption((e) => e.exportedFrom);
		const exportedFrom = exportedFromOptions.filter(
			(x) => !codePaths.has(x.name.asString),
		).headOption;

		return TsDeclEnum.create(
			FlattenTrees.mergeComments(existing.comments, that.comments),
			existing.declared || that.declared,
			existing.isConst,
			existing.name,
			existing.members,
			existing.isValue || that.isValue,
			exportedFrom ? some(exportedFrom) : none,
			FlattenTrees.mergeJsLocation(existing.jsLocation, that.jsLocation),
			existing.codePath,
		);
	},

	/**
	 * Merge two classes
	 * Equivalent to Scala's mergeClass method
	 */
	mergeClass(that: TsDeclClass, existing: TsDeclClass): TsDeclClass {
		const inheritance = IArray.fromOptions(existing.parent, that.parent)
			.appendedAll(existing.implementsInterfaces)
			.appendedAll(that.implementsInterfaces)
			.distinct();

		return TsDeclClass.create(
			FlattenTrees.mergeComments(existing.comments, that.comments),
			existing.declared || that.declared,
			existing.isAbstract && that.isAbstract,
			existing.name,
			FlattenTrees.mergeTypeParams(that.tparams, existing.tparams),
			inheritance.headOption ? some(inheritance.headOption) : none,
			inheritance.drop(1),
			FlattenTrees.newClassMembers(existing.members, that.members),
			FlattenTrees.mergeJsLocation(existing.jsLocation, that.jsLocation),
			FlattenTrees.mergeCodePath(existing.codePath, that.codePath),
		);
	},

	/**
	 * Merge two modules
	 * Equivalent to Scala's mergeModule method
	 */
	mergeModule(that: TsDeclModule, existing: TsDeclModule): TsDeclModule {
		return TsDeclModule.create(
			FlattenTrees.mergeComments(existing.comments, that.comments),
			existing.declared || that.declared,
			that.name,
			FlattenTrees.newMembers(existing.members, that.members),
			FlattenTrees.mergeCodePath(existing.codePath, that.codePath),
			FlattenTrees.mergeJsLocation(existing.jsLocation, that.jsLocation),
		);
	},

	/**
	 * Merge two global declarations
	 * Equivalent to Scala's mergeGlobal method
	 */
	mergeGlobal(that: TsGlobal, existing: TsGlobal): TsGlobal {
		return TsGlobal.create(
			FlattenTrees.mergeComments(existing.comments, that.comments),
			existing.declared || that.declared,
			FlattenTrees.newMembers(existing.members, that.members),
			FlattenTrees.mergeCodePath(existing.codePath, that.codePath),
		);
	},

	/**
	 * Merge two namespaces
	 * Equivalent to Scala's mergeNamespaces method
	 */
	mergeNamespaces(
		that: TsDeclNamespace,
		existing: TsDeclNamespace,
	): TsDeclNamespace {
		return TsDeclNamespace.create(
			FlattenTrees.mergeComments(existing.comments, that.comments),
			existing.declared || that.declared,
			existing.name,
			FlattenTrees.newMembers(existing.members, that.members),
			FlattenTrees.mergeCodePath(existing.codePath, that.codePath),
			FlattenTrees.mergeJsLocation(existing.jsLocation, that.jsLocation),
		);
	},

	/**
	 * Merge a namespace and a function with the same name
	 * Equivalent to Scala's mergeNamespaceAndFunction method
	 */
	mergeNamespaceAndFunction(
		ns: TsDeclNamespace,
		func: TsDeclFunction,
	): TsDeclNamespace {
		const namespacedFunction = TsDeclFunction.create(
			func.comments,
			func.declared,
			TsIdent.namespaced(),
			func.signature,
			func.jsLocation,
			func.codePath.replaceLast(TsIdent.namespaced()),
		);

		return ns.withMembers(ns.members.append(namespacedFunction));
	},

	/**
	 * Merge a namespace and a variable with the same name
	 * Equivalent to Scala's mergeNamespaceAndVar method
	 */
	mergeNamespaceAndVar(
		ns: TsDeclNamespace,
		variable: TsDeclVar,
	): TsDeclNamespace {
		const namespacedVar = TsDeclVar.create(
			variable.comments,
			variable.declared,
			variable.readOnly,
			TsIdent.namespaced(),
			variable.tpe,
			variable.expr,
			variable.jsLocation,
			variable.codePath.replaceLast(TsIdent.namespaced()),
		);

		return ns.withMembers(ns.members.append(namespacedVar));
	},

	/**
	 * Merge a class and an interface with the same name
	 * Equivalent to Scala's mergedClassAndInterface method
	 */
	mergedClassAndInterface(
		cls: TsDeclClass,
		iface: TsDeclInterface,
	): TsDeclClass {
		return TsDeclClass.create(
			FlattenTrees.mergeComments(iface.comments, cls.comments),
			iface.declared || cls.declared,
			cls.isAbstract,
			iface.name,
			FlattenTrees.mergeTypeParams(cls.tparams, iface.tparams),
			cls.parent,
			iface.inheritance.appendedAll(cls.implementsInterfaces).distinct(),
			FlattenTrees.newClassMembers(cls.members, iface.members),
			cls.jsLocation,
			FlattenTrees.mergeCodePath(cls.codePath, iface.codePath),
		);
	},
};
