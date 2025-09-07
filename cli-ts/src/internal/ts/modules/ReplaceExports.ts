/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.ReplaceExports
 *
 * Provides functionality for replacing export statements with their actual declarations.
 * This module handles the complex logic of expanding exports into concrete declarations,
 * managing caching, and ensuring type preservation during the transformation process.
 */

import { isLeft, isRight } from "fp-ts/Either";
import { isNone, isSome, none, type Option, some } from "fp-ts/Option";
import { Comments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import { ExportType } from "../ExportType.js";
import { FlattenTrees } from "../FlattenTrees.js";
import { JsLocation } from "../JsLocation.js";
import { KeepTypesOnly } from "./KeepTypesOnly.js"; // TODO: implement

import type { ModuleSpec } from "../ModuleSpec.js";
import { Picker } from "../Picker.js";
import { SetCodePath } from "../transforms/SetCodePath.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { LoopDetector, TsTreeScope } from "../TsTreeScope.js";
import {
	TsIdent,
	type TsAugmentedModule,
	type TsContainer,
	type TsContainerOrDecl,
	type TsDeclModule,
	type TsDeclNamespace,
	type TsDeclNamespaceOrModule,
	TsExport,
	TsExportee,
	TsExporteeNames,
	TsExporteeStar,
	TsExporteeTree,
	TsGlobal,
	type TsImport,
	TsImported,
	TsImportedIdent,
	TsImportee,
	TsImporteeLocal,
	type TsNamedDecl,
	type TsNamedValueDecl,
	type TsParsedFile,
	TsQIdent,
} from "../trees.js";
import { Exports } from "./Exports.js";
import { Utils } from "./Utils.js";

/**
 * Interface for tracking whether declarations can be shadowed
 */
interface CanBeShadowed {
	readonly maybe: boolean;
	readonly trees: IArray<TsContainerOrDecl>;
}

/**
 * Creates a CanBeShadowed instance
 */
function createCanBeShadowed(
	maybe: boolean,
	trees: IArray<TsContainerOrDecl>,
): CanBeShadowed {
	return { maybe, trees };
}

/**
 * Cached version of ReplaceExports that skips traversing the entire tree if the module is cached.
 * Equivalent to the Scala object CachedReplaceExports.
 */
export const CachedReplaceExports = {
	/**
	 * Applies cached replace exports transformation to a module
	 */
	apply: (
		scope: TsTreeScope,
		loopDetector: LoopDetector,
		x: TsDeclModule,
	): TsDeclModule => {
		const uniqueIdent = TsIdent.simple("__CachedReplaceExports__");

		// Check cache first (stub for now)
		// if (scope.root.cache && scope.root.cache.exports.has(x.name)) {
		// 	return scope.root.cache.exports.get(x.name);
		// }

		if (x.exports.length === 0) {
			return x;
		}

		// Bugfix for wrongly combined modules in @angular/core/testing
		const loopResult = loopDetector.including(
			IArray.fromArray([uniqueIdent as any, x.name as any]),
			scope,
		);

		if (isRight(loopResult)) {
			const newLoopDetector = loopResult.right;
			return new ReplaceExports(newLoopDetector).visitTsDeclModule(scope)(x);
		} else {
			// Left case - loop detected, return empty module
			return { ...x, members: IArray.Empty };
		}
	},
};

/**
 * Main ReplaceExports transformation class.
 * Extends TreeTransformationScopedChanges to provide scoped transformation capabilities.
 */
export class ReplaceExports extends TreeTransformationScopedChanges {
	constructor(private loopDetector: LoopDetector) {
		super();
	}

	/**
	 * Transforms a namespace by replacing its exports with actual declarations
	 */
	override enterTsDeclNamespace(scope: TsTreeScope) {
		return (x: TsDeclNamespace): TsDeclNamespace => {
			if (x.exports.length === 0 && x.imports.length === 0) {
				return x;
			}

			const newMembers: IArray<TsContainerOrDecl> = x.members.flatMap((member) => {
				if (member._tag === "TsExport") {
					const exportDecl = member as TsExport;

					// Handle tree exports
					if (
						exportDecl.tpe._tag === "Named" &&
						exportDecl.exported._tag === "TsExporteeTree"
					) {
						const exporteeTree = exportDecl.exported as TsExporteeTree;
						const tree = exporteeTree.decl;

						if (isNamedDecl(tree)) {
							const namedExport = tree as TsNamedDecl;
							return Exports.export(
								x.codePath.forceHasPath(),
								(_) => x.jsLocation, // TODO: proper implementation with namedExport.name
								scope,
								ExportType.named(),
								namedExport,
								none,
								this.loopDetector,
							);
						} else if (tree._tag === "TsImport") {
							const importDecl = tree as TsImport;
							// Handle import-then-export pattern
							if (
								importDecl.imported.length === 1 &&
								importDecl.imported.get(0)._tag === "TsImportedIdent" &&
								importDecl.from._tag === "TsImporteeLocal"
							) {
								const importedIdent = importDecl.imported.get(0) as TsImportedIdent;
								const to = importedIdent.ident;
								const from = (importDecl.from as TsImporteeLocal).qident;

								const found = scope.lookupInternal(
									Picker.ButNot(Picker.All, x),
									from.parts,
									this.loopDetector,
								);

								return found.map(([d, _]) => {
									const renamed = d.withName(to);
									return renamed; // TODO: SetCodePath.visitTsNamedDecl(x.codePath.forceHasPath())(renamed);
								});
							} else {
								scope.logger.fatal(`Unexpected import pattern: ${JSON.stringify(importDecl)}`);
								return IArray.Empty;
							}
						} else {
							scope.logger.fatal(`Unexpected export tree: ${JSON.stringify(tree)}`);
							return IArray.Empty;
						}
					}
					// Handle empty named exports
					else if (
						exportDecl.comments.isEmpty &&
						exportDecl.tpe._tag === "Named" &&
						exportDecl.exported._tag === "TsExporteeNames"
					) {
						const exporteeNames = exportDecl.exported as TsExporteeNames;
						if (exporteeNames.idents.length === 0 && isNone(exporteeNames.fromOpt)) {
							return IArray.Empty;
						}
					}
					// Handle other exports
					else {
						scope.fatalMaybe(`Dropping unexpected export in namespace: ${JSON.stringify(exportDecl)}`);
						return IArray.Empty;
					}
				} else if (member._tag === "TsImport") {
					// Remove imports
					return IArray.Empty;
				} else {
					// Keep other members
					return IArray.fromArray([member]);
				}

				return IArray.Empty;
			});

			return { ...x, members: newMembers };
		};
	}

	/**
	 * Transforms a module by replacing its exports with actual declarations
	 */
	override enterTsDeclModule(scope: TsTreeScope) {
		return (x: TsDeclModule): TsDeclModule => {
			// Check cache first (stub for now)
			// if (scope.root.cache && scope.root.cache.exports.has(x.name)) {
			// 	return scope.root.cache.exports.get(x.name);
			// }

			const step1 = {
				...x,
				members: this.newMembers(
					scope,
					x,
					(spec) => JsLocation.module(x.name, spec),
					x.members,
				),
			};

			const step2 = this.ensureTypesPresent(x, step1);
			const step3 = FlattenTrees.mergeModule(step2, { ...step2, members: IArray.Empty });

			// Cache the result (stub for now)
			// if (scope.root.cache) {
			// 	scope.root.cache.exports.set(x.name, step3);
			// }

			return step3;
		};
	}

	/**
	 * Transforms an augmented module by replacing its exports with actual declarations
	 */
	enterTsAugmentedModule(scope: TsTreeScope) {
		return (x: TsAugmentedModule): TsAugmentedModule => {
			const step1 = {
				...x,
				members: this.newMembers(
					scope,
					x,
					(spec) => JsLocation.module(x.name, spec),
					x.members,
				),
			};

			const step2 = this.ensureTypesPresent(x, step1);
			return FlattenTrees.mergeAugmentedModule(step2, { ...step2, members: IArray.Empty });
		};
	}

	/**
	 * Transforms a parsed file by cleaning up imports and exports
	 */
	override leaveTsParsedFile(scope: TsTreeScope) {
		return (x: TsParsedFile): TsParsedFile => {
			const newMembers = x.members.flatMap((member) => {
				if (member._tag === "TsImport") {
					return IArray.Empty;
				} else if (member._tag === "TsExport") {
					const exportDecl = member as TsExport;
					if (exportDecl.exported._tag === "TsExporteeTree") {
						const exporteeTree = exportDecl.exported as TsExporteeTree;
						return IArray.fromArray([exporteeTree.decl]);
					}
					return IArray.fromArray([member]);
				} else {
					return IArray.fromArray([member]);
				}
			});

			return { ...x, members: newMembers };
		};
	}

	/**
	 * Ensures that types present in the original container are preserved in the new one
	 */
	private ensureTypesPresent<T extends TsContainer>(old: T, newContainer: T): T {
		const newTypes = new Set<TsIdent>();
		newContainer.members.forEach((member) => {
			if (Picker.Types.pick && isNamedDecl(member)) {
				const picked = Picker.Types.pick(member as TsNamedDecl);
				if (isSome(picked)) {
					newTypes.add(picked.value.name);
				}
			}
		});

		const missingTypes: IArray<TsContainerOrDecl> = old.members.flatMap((member) => {
			if (member._tag === "TsExport") {
				const exportDecl = member as TsExport;
				if (exportDecl.exported._tag === "TsExporteeTree") {
					const exporteeTree = exportDecl.exported as TsExporteeTree;
					const tree = exporteeTree.decl;
					if (Picker.Types.pick && isNamedDecl(tree)) {
						const picked = Picker.Types.pick(tree as TsNamedDecl);
						if (isSome(picked) && !newTypes.has(picked.value.name)) {
							const kept = KeepTypesOnly.apply(picked.value);
							return isSome(kept) ? IArray.fromArray([kept.value]) : IArray.Empty;
						}
					}
				}
			} else if (Picker.Types.pick && isNamedDecl(member)) {
				const picked = Picker.Types.pick(member as TsNamedDecl);
				if (isSome(picked) && !newTypes.has(picked.value.name)) {
					const kept = KeepTypesOnly.apply(picked.value);
					return isSome(kept) ? IArray.fromArray([kept.value]) : IArray.Empty;
				}
			}
			return IArray.Empty;
		});

		return newContainer.withMembers(newContainer.members.concat(missingTypes)) as T;
	}

	/**
	 * Processes members and replaces exports with their expanded declarations
	 */
	private newMembers(
		scope: TsTreeScope,
		owner: TsDeclNamespaceOrModule,
		jsLocation: (spec: ModuleSpec) => JsLocation,
		trees: IArray<TsContainerOrDecl>,
	): IArray<TsContainerOrDecl> {
		const processed = trees.map((tree) =>
			this.newMember(scope, owner, jsLocation, tree),
		);

		const canBeShadowed = processed.filter((p) => p.maybe);
		const canNotBe = processed.filter((p) => !p.maybe);

		const keep = canNotBe.flatMap((p) => p.trees);

		const takenNames = new Set<TsIdent>();
		keep.forEach((tree) => {
			if (isNamedDecl(tree)) {
				takenNames.add((tree as TsNamedDecl).name);
			}
		});

		const keepMaybe = canBeShadowed.flatMap((p) =>
			p.trees.filter((tree) => {
				if (isNamedDecl(tree)) {
					return !takenNames.has((tree as TsNamedDecl).name);
				}
				return true;
			}),
		);

		return keepMaybe.concat(keep);
	}

	/**
	 * Processes a single member and determines if it can be shadowed
	 */
	private newMember(
		scope: TsTreeScope,
		owner: TsDeclNamespaceOrModule,
		jsLocation: (spec: ModuleSpec) => JsLocation,
		decl: TsContainerOrDecl,
	): CanBeShadowed {
		// Check if owner has exported values (lazy evaluation)
		const hasExportedValues = (): boolean => {
			return owner.exports.toArray().some((exportDecl: TsExport) => {
				if (exportDecl.exported._tag === "TsExporteeTree") {
					const tree = (exportDecl.exported as TsExporteeTree).decl;
					// Return false for interfaces and type aliases, true for others
					return !(tree._tag === "TsDeclInterface" || tree._tag === "TsDeclTypeAlias");
				}
				return true;
			});
		};

		if (decl._tag === "TsExport") {
			const exportDecl = decl as TsExport;

			// Fix for @angular/core - skip self-referencing star exports
			if (
				exportDecl.comments.isEmpty &&
				exportDecl.exported._tag === "TsExporteeStar"
			) {
				const starExport = exportDecl.exported as TsExporteeStar;
				if (owner.name === starExport.from) {
					return createCanBeShadowed(false, IArray.Empty);
				}
			}

			const ret = Exports.expandExport(scope, jsLocation, exportDecl, this.loopDetector, owner);

			if (ret.length === 0 && scope.root.pedantic) {
				// Handle empty exports
				if (
					exportDecl.tpe._tag === "Named" &&
					exportDecl.exported._tag === "TsExporteeNames"
				) {
					const exporteeNames = exportDecl.exported as TsExporteeNames;
					if (exporteeNames.idents.length === 0) {
						// Empty object export - this is fine
					} else {
						// For debugging
						Exports.expandExport(scope, jsLocation, exportDecl, this.loopDetector, owner);
						scope.logger.fatal(`Didn't expand to anything: ${JSON.stringify(exportDecl)}`);
					}
				} else {
					// For debugging
					Exports.expandExport(scope, jsLocation, exportDecl, this.loopDetector, owner);
					scope.logger.fatal(`Didn't expand to anything: ${JSON.stringify(exportDecl)}`);
				}
			}

			const canBeShadowed =
				exportDecl.tpe._tag === "Named" &&
				exportDecl.exported._tag === "TsExporteeStar";

			return createCanBeShadowed(canBeShadowed, ret as any); // TODO: fix type
		} else if (decl._tag === "TsGlobal") {
			const globalDecl = decl as TsGlobal;
			const ret: IArray<TsNamedDecl> = globalDecl.members.flatMap((member) => {
				if (isNamedDecl(member)) {
					const namedMember = member as TsNamedDecl;
					return IArray.fromArray([
						Utils.withJsLocation(
							namedMember,
							JsLocation.global(TsQIdent.of(namedMember.name)),
						),
					]);
				} else if (member._tag === "TsExport") {
					const exportMember = member as TsExport;
					if (exportMember.exported._tag === "TsExporteeTree") {
						const tree = (exportMember.exported as TsExporteeTree).decl;
						if (isNamedDecl(tree)) {
							const namedTree = tree as TsNamedDecl;
							return IArray.fromArray([
								Utils.withJsLocation(
									namedTree,
									JsLocation.global(TsQIdent.of(namedTree.name)),
								),
							]);
						}
					}
				}
				return IArray.Empty;
			});

			return createCanBeShadowed(false, IArray.fromArray([{ ...globalDecl, members: ret } as any])); // TODO: fix type
		} else if (decl._tag === "TsDeclModule") {
			return createCanBeShadowed(false, IArray.fromArray([decl]));
		} else if (decl._tag === "TsAugmentedModule") {
			return createCanBeShadowed(false, IArray.fromArray([decl]));
		} else if (decl._tag === "TsDeclTypeAlias") {
			// Might clash with an interface in the presence of CommonJS modules
			return createCanBeShadowed(true, IArray.fromArray([decl]));
		} else if (isNamedValueDecl(decl)) {
			const namedValueDecl = decl as TsNamedValueDecl;
			if (hasExportedValues()) {
				const kept = KeepTypesOnly.apply(namedValueDecl);
				return createCanBeShadowed(
					false,
					isSome(kept) ? IArray.fromArray([kept.value]) : IArray.Empty,
				);
			} else {
				return createCanBeShadowed(false, IArray.fromArray([decl as any]));
			}
		} else {
			return createCanBeShadowed(false, IArray.fromArray([decl]));
		}
	}

	/**
	 * Static method for cached replace exports (equivalent to CachedReplaceExports.apply)
	 */
	static cachedReplaceExports = CachedReplaceExports.apply;
}

// Helper functions

/**
 * Type guard to check if a tree node is a named declaration
 */
function isNamedDecl(tree: any): tree is TsNamedDecl {
	return tree && typeof tree === "object" && "name" in tree && "_tag" in tree;
}

/**
 * Type guard to check if a declaration is a named value declaration
 */
function isNamedValueDecl(decl: TsContainerOrDecl): decl is TsNamedValueDecl {
	return (
		decl._tag === "TsDeclClass" ||
		decl._tag === "TsDeclFunction" ||
		decl._tag === "TsDeclVar" ||
		decl._tag === "TsDeclEnum"
	);
}
