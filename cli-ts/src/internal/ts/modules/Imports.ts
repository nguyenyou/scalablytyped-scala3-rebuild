/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.Imports
 *
 * Provides functionality for resolving and processing TypeScript imports.
 * This module handles the complex logic of import resolution, including
 * star imports, named imports, destructured imports, and import-then-export patterns.
 */

import { isNone, isSome, none, type Option, some } from "fp-ts/Option";
import { Comments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import { CodePath } from "../CodePath.js";
import { JsLocation } from "../JsLocation.js";
import { Picker } from "../Picker.js";
import type { LoopDetector, TsTreeScope } from "../TsTreeScope.js";
import {
	TsDeclNamespace,
	TsIdent,
	type TsIdentSimple,
	type TsImport,
	type TsImported,
	TsImportedDestructured,
	type TsImportedIdent,
	type TsImportedStar,
	type TsImportee,
	type TsImporteeFrom,
	type TsImporteeLocal,
	type TsImporteeRequired,
	type TsNamedDecl,
} from "../trees.js";
import { DeriveCopy } from "./DeriveCopy.js";
import { ExpandedMod } from "./ExpandedMod.js";
import { ReplaceExports } from "./ReplaceExports.js";
import { Utils } from "./Utils.js";

/**
 * Cache key for import lookups
 */
interface ImportCacheKey {
	scope: TsTreeScope;
	picker: any;
	wanted: IArray<TsIdent>;
}

/**
 * Imports utility object providing the main import processing functions.
 * Equivalent to the Scala object Imports.
 */
export const Imports = {
	/**
	 * Looks up declarations from imports that match the wanted identifiers.
	 * This is the main entry point for import resolution.
	 *
	 * @param scope The scoped tree scope to search in
	 * @param picker The picker to filter declaration types
	 * @param wanted The identifiers to look for
	 * @param loopDetector Loop detection for preventing infinite recursion
	 * @param imports The import statements to search through
	 * @returns Array of found declarations with their scopes
	 */
	lookupFromImports: <T extends TsNamedDecl>(
		scope: TsTreeScope.Scoped,
		picker: { pick: (decl: TsNamedDecl) => Option<T> },
		wanted: IArray<TsIdent>,
		loopDetector: LoopDetector,
		imports: IArray<TsImport>,
	): IArray<[T, TsTreeScope]> => {
		// Cache key for memoization
		const _key: ImportCacheKey = { scope, picker, wanted };

		// Check cache first (stub for now)
		// if (scope.root.cache && scope.root.cache.imports.has(key)) {
		// 	return scope.root.cache.imports.get(key) as IArray<[T, TsTreeScope]>;
		// }

		const ret: IArray<[T, TsTreeScope]> = pickImport(imports, wanted).flatMap(
			(chosenImport) => {
				const expanded: ExpandedMod = Imports.expandImportee(
					chosenImport.from,
					scope,
					loopDetector,
				);

				return chosenImport.imported.flatMap((imported) => {
					if (imported._tag === "TsImportedStar") {
						const starImport = imported as TsImportedStar;
						if (isSome(starImport.asOpt)) {
							// Star import with rename: import * as renamed from "module"
							const renamed = starImport.asOpt.value;
							const all: IArray<TsNamedDecl> = getDeclarationsFromExpanded(
								expanded,
								renamed,
								true, // include namespace
							);
							return Utils.searchAmong(
								scope,
								picker,
								wanted,
								all,
								loopDetector,
							);
						} else {
							// Star import without rename: import * from "module"
							const all: IArray<TsNamedDecl> = getDeclarationsFromExpanded(
								expanded,
								undefined,
								false, // no namespace
							);
							return Utils.searchAmong(
								scope,
								picker,
								wanted,
								all,
								loopDetector,
							);
						}
					} else if (imported._tag === "TsImportedIdent") {
						// Named import: import ident from "module"
						const identImport = imported as TsImportedIdent;
						const ident = identImport.ident;
						const all: IArray<TsNamedDecl> = getDeclarationsForIdent(
							expanded,
							ident,
						);
						return Utils.searchAmong(scope, picker, wanted, all, loopDetector);
					} else if (imported._tag === "TsImportedDestructured") {
						// Destructured import: import { a, b as c } from "module"
						const destructuredImport = imported as TsImportedDestructured;
						const all: IArray<TsNamedDecl> = getDeclarationsFromExpanded(
							expanded,
							undefined,
							false,
						);

						// Handle each destructured identifier
						return destructuredImport.idents.flatMap(([ident, renamedOpt]) => {
							if (isNone(renamedOpt)) {
								return Utils.searchAmong(
									scope,
									picker,
									wanted,
									all,
									loopDetector,
								);
							} else {
								const renamed = renamedOpt.value;
								const newWanted = wanted.startsWith(
									IArray.fromArray([renamed as any]),
								)
									? IArray.fromArray([ident as any]).concat(wanted.tail)
									: wanted;
								return Utils.searchAmong(
									scope,
									picker,
									newWanted,
									all,
									loopDetector,
								).map(
									([t, s]) => [t.withName(renamed) as T, s] as [T, TsTreeScope],
								);
							}
						});
					}

					return IArray.Empty;
				});
			},
		);

		// Cache the result if non-empty (stub for now)
		// if (scope.root.cache && ret.length > 0) {
		// 	scope.root.cache.imports.set(key, ret);
		// }

		return ret;
	},

	/**
	 * Expands an importee to determine what it resolves to.
	 * This handles module resolution and returns the expanded module information.
	 *
	 * @param from The importee to expand
	 * @param scope The current tree scope
	 * @param loopDetector Loop detection for preventing infinite recursion
	 * @returns Expanded module information
	 */
	expandImportee: (
		from: TsImportee,
		scope: TsTreeScope,
		loopDetector: LoopDetector,
	): ExpandedMod => {
		// Cache key for memoization
		const _key = `${scope.toString()}-${JSON.stringify(from)}`;

		// Check cache first (stub for now)
		// if (scope.root.cache && scope.root.cache.expandImportee.has(key)) {
		// 	return scope.root.cache.expandImportee.get(key);
		// }

		let ret: ExpandedMod;

		if (from._tag === "TsImporteeRequired") {
			ret = handleRequiredImport(
				from as TsImporteeRequired,
				scope,
				loopDetector,
			);
		} else if (from._tag === "TsImporteeFrom") {
			ret = handleFromImport(from as TsImporteeFrom, scope, loopDetector);
		} else if (from._tag === "TsImporteeLocal") {
			ret = handleLocalImport(from as TsImporteeLocal, scope, loopDetector);
		} else {
			ret = ExpandedMod.Picked(IArray.Empty);
		}

		// Cache the result if non-empty (stub for now)
		// if (scope.root.cache && ret.nonEmpty) {
		// 	scope.root.cache.expandImportee.set(key, ret);
		// }

		return ret;
	},

	/**
	 * Validates if an import matches the wanted identifiers.
	 * This filters import statements to only include relevant imports.
	 *
	 * @param wanted The identifiers to look for
	 * @returns Function that validates a single import
	 */
	validImport:
		(wanted: IArray<TsIdent>) =>
		(importDecl: TsImport): Option<TsImport> => {
			if (wanted.length === 0) {
				return none;
			}

			const first = wanted.get(0);
			const newImported: IArray<TsImported> = importDecl.imported.flatMap(
				(imported) => {
					if (imported._tag === "TsImportedIdent") {
						const identImport = imported as TsImportedIdent;
						if (identImport.ident === first) {
							return IArray.fromArray([imported]);
						}
						return IArray.Empty;
					} else if (imported._tag === "TsImportedDestructured") {
						const destructuredImport = imported as TsImportedDestructured;
						const matchingIdents = destructuredImport.idents.filter(
							([ident, asOpt]) => {
								return (
									ident === first || (isSome(asOpt) && asOpt.value === first)
								);
							},
						);
						if (matchingIdents.length > 0) {
							return IArray.fromArray([
								TsImportedDestructured.create(matchingIdents),
							]);
						}
						return IArray.Empty;
					} else if (imported._tag === "TsImportedStar") {
						const starImport = imported as TsImportedStar;
						if (isSome(starImport.asOpt) && starImport.asOpt.value === first) {
							return IArray.fromArray([imported]);
						}
						return IArray.Empty;
					}

					return IArray.Empty;
				},
			);

			if (newImported.length > 0) {
				return some({
					...importDecl,
					imported: newImported,
				});
			}

			return none;
		},
};

// Helper functions

/**
 * Picks imports that match the wanted identifiers
 */
function pickImport(
	imports: IArray<TsImport>,
	wanted: IArray<TsIdent>,
): IArray<TsImport> {
	return imports.flatMap((importDecl) => {
		const validImportResult = Imports.validImport(wanted)(importDecl);
		return isSome(validImportResult)
			? IArray.fromArray([validImportResult.value])
			: IArray.Empty;
	});
}

/**
 * Gets declarations from an expanded module for star imports
 */
function getDeclarationsFromExpanded(
	expanded: ExpandedMod,
	renamed?: TsIdentSimple,
	includeNamespace?: boolean,
): IArray<TsNamedDecl> {
	if (ExpandedMod.isPicked(expanded)) {
		return expanded.things.map(([decl]) => decl);
	} else if (ExpandedMod.isWhole(expanded)) {
		if (renamed && includeNamespace) {
			// Star import with rename: create namespace
			const ns = TsDeclNamespace.create(
				Comments.empty(),
				false,
				renamed,
				expanded.rest.concat(expanded.defaults) as any, // TODO: fix type
				CodePath.noPath(),
				JsLocation.zero(),
			);
			return IArray.fromArray([ns]).concat(
				expanded.namespaced.map((n) => n.withName(renamed)),
			);
		} else {
			// Star import without rename or regular processing
			return expanded.rest
				.concat(expanded.defaults)
				.concat(expanded.namespaced);
		}
	}
	return IArray.Empty;
}

/**
 * Gets declarations for a specific identifier import
 */
function getDeclarationsForIdent(
	expanded: ExpandedMod,
	ident: TsIdentSimple,
): IArray<TsNamedDecl> {
	if (ExpandedMod.isPicked(expanded)) {
		return expanded.things.map(([decl]) => decl);
	} else if (ExpandedMod.isWhole(expanded)) {
		if (expanded.defaults.length > 0) {
			// Use defaults and rename them
			return expanded.defaults.map((decl) => decl.withName(ident));
		} else {
			// Create namespace from rest and rename namespaceds
			const ns = TsDeclNamespace.create(
				Comments.empty(),
				false,
				ident,
				expanded.rest as any, // TODO: fix type
				CodePath.noPath(),
				JsLocation.zero(),
			);
			return expanded.namespaced
				.map((decl) => decl.withName(ident))
				.concat(IArray.fromArray([ns]));
		}
	}
	return IArray.Empty;
}

/**
 * Handles required imports (import = require("module"))
 */
function handleRequiredImport(
	from: TsImporteeRequired,
	scope: TsTreeScope,
	loopDetector: LoopDetector,
): ExpandedMod {
	const fromModule = from.from;
	const moduleScope = scope.moduleScopes.get(fromModule);

	if (moduleScope) {
		// TODO: check if scoped
		const scopedModule = moduleScope as any; // TsTreeScope.Scoped
		const mod = scopedModule.current;

		if (mod._tag === "TsDeclModule") {
			const newMod = ReplaceExports.cachedReplaceExports(
				scopedModule.outer,
				loopDetector,
				mod,
			);

			// Handle augmented modules (stub for now)
			const withAugmented = newMod; // TODO: implement augmented module merging

			// Partition members
			const namespaceds = withAugmented.members.filter(
				(member: any) => member._tag && member.name === TsIdent.namespaced(),
			);
			const rest = withAugmented.members.flatMap((member: any) => {
				if (member._tag && member.name !== TsIdent.namespaced()) {
					return DeriveCopy.apply(member, CodePath.noPath(), none);
				}
				return IArray.Empty;
			});

			return ExpandedMod.Whole(
				IArray.Empty,
				namespaceds as any,
				rest as any,
				scopedModule,
			);
		}
	}

	scope.fatalMaybe(`Couldn't find expected module ${fromModule.toString()}`);
	return ExpandedMod.Picked(IArray.Empty);
}

/**
 * Handles from imports (import ... from "module")
 */
function handleFromImport(
	from: TsImporteeFrom,
	scope: TsTreeScope,
	loopDetector: LoopDetector,
): ExpandedMod {
	const fromModule = from.from;
	const moduleScope = scope.moduleScopes.get(fromModule);

	if (moduleScope) {
		// TODO: check if scoped
		const scopedModule = moduleScope as any; // TsTreeScope.Scoped
		const mod = scopedModule.current;

		if (mod._tag === "TsDeclModule") {
			const newMod = ReplaceExports.cachedReplaceExports(
				scopedModule.outer,
				loopDetector,
				mod,
			);

			// Handle augmented modules (stub for now)
			const withAugmented = newMod; // TODO: implement augmented module merging

			// Partition members into defaults, namespaceds, and rest
			const defaults = withAugmented.members.filter(
				(member: any) => member._tag && member.name === TsIdent.default(),
			);
			const namespaceds = withAugmented.members.filter(
				(member: any) => member._tag && member.name === TsIdent.namespaced(),
			);
			const rest = withAugmented.members.filter(
				(member: any) =>
					member._tag &&
					member.name !== TsIdent.default() &&
					member.name !== TsIdent.namespaced(),
			);

			return ExpandedMod.Whole(
				defaults as any,
				namespaceds as any,
				rest as any,
				scopedModule,
			);
		}
	}

	// Don't fatal for from imports, just return empty
	return ExpandedMod.Picked(IArray.Empty);
}

/**
 * Handles local imports (import from local identifier)
 */
function handleLocalImport(
	from: TsImporteeLocal,
	scope: TsTreeScope,
	loopDetector: LoopDetector,
): ExpandedMod {
	const qident = from.qident;
	const found = scope.lookupInternal(
		Picker.NotModules,
		qident.parts,
		loopDetector,
	);
	return ExpandedMod.Picked(found);
}
