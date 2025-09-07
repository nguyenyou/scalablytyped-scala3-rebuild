/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.AugmentModules
 *
 * Here be dragons, i guess. The implementation of augmented modules is the bare minimum to make a few key libraries,
 * like lodash, compile. We should really re-do all of this.
 */

import { isSome, none, type Option } from "fp-ts/Option";
import { IArray, IArrayBuilder } from "../../IArray.js";
import type { CodePath, CodePathHasPath } from "../CodePath.js";
import { ExportType } from "../ExportType.js";
import { FlattenTrees } from "../FlattenTrees.js";
import { AbstractTreeTransformation } from "../TreeTransformation.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import { SetCodePathTransformFunction } from "../transforms/SetCodePath.js";
import type {
	TsAugmentedModule,
	TsContainerOrDecl,
	TsDeclModule,
	TsDeclNamespace,
	TsExporteeNames,
	TsParsedFile,
} from "../trees.js";
import { KeepTypesOnly } from "./KeepTypesOnly.js";

/**
 * Determine which container to extend. By default it will be the provided module, but if it has a default or =
 * export of a namespace, we put it there instead
 */
function target(mod: TsDeclModule, scope: TsTreeScope): CodePathHasPath {
	let exportedNamespaceOpt: Option<CodePath> = none;

	// Look for default or = export of a namespace
	for (const exp of mod.exports.toArray()) {
		if (
			exp._tag === "TsExport" &&
			ExportType.isNotNamed(exp.tpe) &&
			exp.exported._tag === "TsExporteeNames"
		) {
			const exportee = exp.exported as TsExporteeNames;
			if (exportee.idents.length === 1) {
				const identTuple = exportee.idents.get(0);
				const [qIdent, alias] = identTuple;
				if (!alias) {
					// No alias, this is a direct export
					const moduleScope = scope["/"](mod);
					const lookupResults = moduleScope.lookup(qIdent, true); // skipValidation
					if (lookupResults.length > 0) {
						const namespace = lookupResults.get(0);
						exportedNamespaceOpt = { _tag: "Some", value: namespace.codePath };
						break;
					}
				}
			}
		}
	}

	const codePath: CodePath = isSome(exportedNamespaceOpt)
		? exportedNamespaceOpt.value
		: mod.codePath;
	return codePath.forceHasPath();
}

/**
 * AugmentModules utility object providing the main apply function.
 * Equivalent to the Scala object AugmentModules.
 */
export const AugmentModules = {
	/**
	 * Determine which container to extend.
	 */
	target,

	/**
	 * Apply augmented modules transformation to a parsed file.
	 *
	 * @param rootScope The root scope for lookups
	 * @returns A function that transforms a parsed file
	 */
	apply:
		(rootScope: TsTreeScope) =>
		(file: TsParsedFile): TsParsedFile => {
			// Group augmented modules by their target module
			const targetToAux = new Map<string, IArray<TsAugmentedModule>>();

			file.augmentedModules.forEach((aux) => {
				const targetModule = file.modules.get(aux.name);
				if (targetModule) {
					const targetPath = target(targetModule, rootScope);
					const key = targetPath.asString;
					const existing = targetToAux.get(key) ?? IArray.Empty;
					targetToAux.set(key, existing.concat(IArray.fromArray([aux])));
				} else {
					// No target module found, group under "none"
					const key = "none";
					const existing = targetToAux.get(key) ?? IArray.Empty;
					targetToAux.set(key, existing.concat(IArray.fromArray([aux])));
				}
			});

			const toRemove = new Set<string>();

			// First transformation: Merge augmented modules into their targets
			class MergeTransformation extends AbstractTreeTransformation<void> {
				withTree(_t: undefined, _tree: any) {
					return undefined;
				}

				override enterTsDeclNamespace(
					_t: undefined,
				): (x: TsDeclNamespace) => TsDeclNamespace {
					return (x: TsDeclNamespace) => {
						const targetPath = x.codePath.forceHasPath();
						const auxes = targetToAux.get(targetPath.asString);
						if (auxes?.nonEmpty) {
							// Collect all members from augmented modules
							const auxMembers: IArray<TsContainerOrDecl> = auxes.flatMap(
								(aux) => aux.members,
							);

							// Update code paths for the augmented members
							const updatedAuxMembers = auxMembers.map((am) => {
								if (
									am._tag === "TsDeclNamespace" ||
									am._tag === "TsDeclModule"
								) {
									return SetCodePathTransformFunction.enterTsContainer(
										targetPath,
									)(am as any) as TsContainerOrDecl;
								} else {
									return SetCodePathTransformFunction.enterTsDecl(targetPath)(
										am as any,
									) as TsContainerOrDecl;
								}
							});

							// Mark augmented modules for removal
							auxes.forEach((aux) => {
								toRemove.add(aux.codePath.asString);
							});

							// Merge members
							const newMembers = FlattenTrees.newMembers(
								x.members,
								updatedAuxMembers,
							);
							return x.withMembers(newMembers);
						}
						return x;
					};
				}

				override enterTsDeclModule(
					_t: undefined,
				): (x: TsDeclModule) => TsDeclModule {
					return (x: TsDeclModule) => {
						const targetPath = x.codePath.forceHasPath();
						const auxes = targetToAux.get(targetPath.asString);
						if (auxes?.nonEmpty) {
							// Collect all members from augmented modules
							const auxMembers: IArray<TsContainerOrDecl> = auxes.flatMap(
								(aux) => aux.members,
							);

							// Update code paths for the augmented members
							const updatedAuxMembers = auxMembers.map((am) => {
								if (
									am._tag === "TsDeclNamespace" ||
									am._tag === "TsDeclModule"
								) {
									return SetCodePathTransformFunction.enterTsContainer(
										targetPath,
									)(am as any) as TsContainerOrDecl;
								} else {
									return SetCodePathTransformFunction.enterTsDecl(targetPath)(
										am as any,
									) as TsContainerOrDecl;
								}
							});

							// Mark augmented modules for removal
							auxes.forEach((aux) => {
								toRemove.add(aux.codePath.asString);
							});

							// Merge members
							const newMembers = FlattenTrees.newMembers(
								x.members,
								updatedAuxMembers,
							);
							return x.withMembers(newMembers);
						}
						return x;
					};
				}
			}

			// Second transformation: Remove processed augmented modules
			class RemoveTransformation extends AbstractTreeTransformation<void> {
				withTree(_t: undefined, _tree: any) {
					return undefined;
				}

				override leaveTsParsedFile(
					_t: undefined,
				): (x: TsParsedFile) => TsParsedFile {
					return (x: TsParsedFile) => {
						const newMembers = x.members.filter((member) => {
							if (member._tag === "TsAugmentedModule") {
								const aux = member as TsAugmentedModule;
								return !toRemove.has(aux.codePath.asString);
							}
							return true;
						});
						return { ...x, members: newMembers };
					};
				}

				override leaveTsDeclModule(
					_t: undefined,
				): (x: TsDeclModule) => TsDeclModule {
					return (x: TsDeclModule) => {
						const newMembersBuilder = IArrayBuilder.empty<TsContainerOrDecl>();
						x.members.forEach((member) => {
							if (member._tag === "TsAugmentedModule") {
								const aux = member as TsAugmentedModule;
								if (toRemove.has(aux.codePath.asString)) {
									// Apply KeepTypesOnly to the augmented module
									const typeOnlyResult = KeepTypesOnly.apply(aux);
									if (typeOnlyResult && isSome(typeOnlyResult)) {
										newMembersBuilder.addOne(typeOnlyResult.value);
									}
								} else {
									newMembersBuilder.addOne(member);
								}
							} else {
								newMembersBuilder.addOne(member);
							}
						});
						return x.withMembers(newMembersBuilder.result());
					};
				}
			}

			// Apply both transformations in sequence
			const mergeTransform = new MergeTransformation();
			const removeTransform = new RemoveTransformation();
			const combinedTransform = mergeTransform[">>"](removeTransform);

			return combinedTransform.visitTsParsedFile(undefined)(
				file,
			) as TsParsedFile;
		},
};
