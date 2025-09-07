/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.Exports
 *
 * Provides functionality for expanding and processing TypeScript exports.
 * This module handles the complex logic of resolving export statements,
 * including re-exports, star exports, and import-then-export patterns.
 */

import { isNone, isSome, none, type Option, some } from "fp-ts/Option";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import type { CodePathHasPath } from "../CodePath.js";
import type { ExportType } from "../ExportType.js";
import { JsLocation } from "../JsLocation.js";
import { ModuleSpec } from "../ModuleSpec.js";
import { Picker } from "../Picker.js";
import type { LoopDetector, TsTreeScope } from "../TsTreeScope.js";
import {
	TsDeclNamespace,
	type TsDeclNamespaceOrModule,
	type TsExport,
	TsExporteeNames,
	type TsExporteeStar,
	TsExporteeTree,
	TsIdent,
	type TsIdentSimple,
	type TsImport,
	type TsImportedIdent,
	type TsNamedDecl,
} from "../trees.js";
import { DeriveCopy } from "./DeriveCopy.js";
import { ExpandedMod } from "./ExpandedMod.js";
import { Imports } from "./Imports.js";
import { ReplaceExports } from "./ReplaceExports.js";
import { Utils } from "./Utils.js";

/**
 * Interface for picked export results
 */
interface PickedExport {
	readonly export: TsExport;
	readonly newWanted: IArray<TsIdent>;
}

/**
 * Creates a PickedExport instance
 */
function createPickedExport(
	exportDecl: TsExport,
	newWanted: IArray<TsIdent>,
): PickedExport {
	return {
		export: exportDecl,
		newWanted,
	};
}

/**
 * Exports utility object providing the main export processing functions.
 * Equivalent to the Scala object Exports.
 */
export const Exports = {
	/**
	 * Expands an export statement into the actual declarations it represents.
	 * This handles all types of exports: tree exports, named exports, and star exports.
	 *
	 * @param scope The current tree scope
	 * @param jsLocation Function to determine JavaScript location for module specs
	 * @param e The export to expand
	 * @param loopDetector Loop detection for preventing infinite recursion
	 * @param owner The containing namespace or module
	 * @returns Array of named declarations that this export represents
	 */
	expandExport: (
		scope: TsTreeScope,
		jsLocation: (spec: ModuleSpec) => JsLocation,
		e: TsExport,
		loopDetector: LoopDetector,
		owner: TsDeclNamespaceOrModule,
	): IArray<TsNamedDecl> => {
		// Cache key for memoization
		const _key = `${scope.toString()}-${JSON.stringify(e)}`;

		// Check cache first (stub implementation)
		// if (scope.root.cache && scope.root.cache.expandExport.has(key)) {
		// 	return scope.root.cache.expandExport.get(key)!;
		// }

		const codePath = owner.codePath.forceHasPath();

		let ret: IArray<TsNamedDecl>;

		// Pattern match on export type
		if (e.exported._tag === "TsExporteeTree") {
			const exporteeTree = e.exported as TsExporteeTree;
			const exported = exporteeTree.decl;

			if (isNamedDecl(exported)) {
				ret = exportSingle(
					codePath,
					jsLocation,
					scope,
					e.tpe,
					exported,
					none,
					loopDetector,
				);
			} else if (exported._tag === "TsImport") {
				ret = handleImportExport(
					exported as TsImport,
					scope,
					loopDetector,
					codePath,
					jsLocation,
					e.tpe,
				);
			} else {
				ret = IArray.Empty;
			}
		} else if (e.exported._tag === "TsExporteeNames") {
			ret = handleNamedExports(
				e.exported as TsExporteeNames,
				scope,
				loopDetector,
				codePath,
				jsLocation,
				e.tpe,
			);
		} else if (e.exported._tag === "TsExporteeStar") {
			ret = handleStarExports(
				e.exported as TsExporteeStar,
				scope,
				loopDetector,
				codePath,
				jsLocation,
				e.tpe,
			);
		} else {
			ret = IArray.Empty;
		}

		// Apply code path transformation (stub)
		const ret2 = ret; // SetCodePath.visitTsNamedDecl(codePath)(decl)

		// Cache the result if non-empty (stub)
		// if (scope.root.cache && ret2.length > 0) {
		// 	scope.root.cache.expandExport.set(key, ret2);
		// }

		return ret2;
	},

	/**
	 * Exports a single named declaration with the specified export type.
	 * This is the core export logic that handles different export types and transformations.
	 *
	 * @param ownerCp The owner's code path
	 * @param jsLocation Function to determine JavaScript location for module specs
	 * @param scope The current tree scope
	 * @param exportType The type of export (Named, Defaulted, Namespaced)
	 * @param namedDecl The declaration to export
	 * @param renamedOpt Optional new name for the export
	 * @param loopDetector Loop detection for preventing infinite recursion
	 * @returns Array of exported declarations
	 */
	export: (
		ownerCp: CodePathHasPath,
		jsLocation: (spec: ModuleSpec) => JsLocation,
		scope: TsTreeScope,
		exportType: ExportType,
		namedDecl: TsNamedDecl,
		renamedOpt: Option<TsIdentSimple>,
		loopDetector: LoopDetector,
	): IArray<TsNamedDecl> => {
		// Limit scope to prevent self-reference issues (stub)
		const limitedScope = scope; // TODO: implement proper scope limiting

		// Rewrite exports if necessary
		const rewritten = rewriteExports(namedDecl, limitedScope, loopDetector);

		// Handle different export types
		if (exportType._tag === "Namespaced") {
			return handleNamespacedExport(rewritten, ownerCp, jsLocation);
		} else if (exportType._tag === "Named") {
			return handleNamedExport(rewritten, ownerCp, renamedOpt, jsLocation);
		} else if (exportType._tag === "Defaulted") {
			return handleDefaultedExport(rewritten, ownerCp, jsLocation);
		}

		return IArray.Empty;
	},

	/**
	 * Looks up exports from a scoped tree scope that match the wanted identifiers.
	 * This is used during import resolution to find matching exports.
	 *
	 * @param scope The scoped tree scope to search in
	 * @param picker The picker to filter declaration types
	 * @param wanted The identifiers to look for
	 * @param loopDetector Loop detection for preventing infinite recursion
	 * @param owner The containing namespace or module
	 * @returns Array of found declarations with their scopes
	 */
	lookupExportFrom: <T extends TsNamedDecl>(
		scope: TsTreeScope.Scoped,
		picker: { pick: (decl: TsNamedDecl) => Option<T> },
		wanted: IArray<TsIdent>,
		loopDetector: LoopDetector,
		owner: TsDeclNamespaceOrModule,
	): IArray<[T, TsTreeScope]> => {
		const pickedExports = pickExports(scope.exports, wanted);

		return pickedExports.flatMap((picked) => {
			const expanded = Exports.expandExport(
				scope,
				(ms) => rewriteLocationToOwner(owner.jsLocation, ms),
				picked.export,
				loopDetector,
				owner,
			);

			return Utils.searchAmong(
				scope,
				picker,
				picked.newWanted,
				expanded,
				loopDetector,
			);
		});
	},
};

// Helper functions

/**
 * Type guard to check if a tree node is a named declaration
 */
function isNamedDecl(tree: any): tree is TsNamedDecl {
	return tree && typeof tree === "object" && "name" in tree && "_tag" in tree;
}

/**
 * Handles import-then-export patterns
 */
function handleImportExport(
	importDecl: TsImport,
	scope: TsTreeScope,
	loopDetector: LoopDetector,
	codePath: CodePathHasPath,
	jsLocation: (spec: ModuleSpec) => JsLocation,
	exportType: ExportType,
): IArray<TsNamedDecl> {
	// Check if it's a single identifier import
	if (importDecl.imported.length === 1) {
		const imported = importDecl.imported.get(0);
		if (imported._tag === "TsImportedIdent") {
			const ident = (imported as TsImportedIdent).ident;
			const expandedImportee = Imports.expandImportee(
				importDecl.from,
				scope,
				loopDetector,
			);

			if (ExpandedMod.isPicked(expandedImportee)) {
				const picked = expandedImportee;
				return picked.things.flatMap(([m, newScope]: [any, any]) => {
					if (m === null) return IArray.Empty;
					return exportSingle(
						codePath,
						jsLocation,
						newScope,
						exportType,
						m,
						some(ident),
						loopDetector,
					);
				});
			} else if (ExpandedMod.isWhole(expandedImportee)) {
				const whole = expandedImportee;
				const restNs = TsDeclNamespace.create(
					Comments.empty(),
					false,
					ident,
					whole.rest as any, // TODO: fix type
					codePath, // TODO: fix noPath()
					JsLocation.zero(),
				);
				const allDecls = whole.defaults
					.concat(whole.namespaced)
					.concat(IArray.fromArray([restNs]));

				return allDecls.flatMap((m: any) =>
					exportSingle(
						codePath,
						jsLocation,
						whole.scope,
						exportType,
						m,
						some(ident),
						loopDetector,
					),
				);
			}

			// If import resolution fails, log warning and return empty
			scope.fatalMaybe(
				`Could not resolve import ${JSON.stringify(importDecl)}`,
			);
			return IArray.Empty;
		}
	}

	return IArray.Empty;
}

/**
 * Handles named exports (TsExporteeNames)
 */
function handleNamedExports(
	exporteeNames: TsExporteeNames,
	scope: TsTreeScope,
	loopDetector: LoopDetector,
	codePath: CodePathHasPath,
	jsLocation: (spec: ModuleSpec) => JsLocation,
	exportType: ExportType,
): IArray<TsNamedDecl> {
	const newScope = isSome(exporteeNames.fromOpt)
		? scope.moduleScopes.get(exporteeNames.fromOpt.value) || scope
		: scope;

	return exporteeNames.idents.flatMap(([qIdent, asNameOpt]) => {
		const found = newScope.lookupInternal(
			Picker.All,
			qIdent.parts,
			loopDetector,
		);
		if (found.length === 0 && newScope.root.pedantic) {
			// For debugging
			newScope.lookupInternal(Picker.All, qIdent.parts, loopDetector);
			newScope.logger.warn(`Could not resolve ${qIdent.toString()}`);
		}
		return found.flatMap(([foundDecl, newNewScope]) =>
			exportSingle(
				codePath,
				jsLocation,
				newNewScope,
				exportType,
				foundDecl,
				asNameOpt,
				loopDetector,
			),
		);
	});
}

/**
 * Handles star exports (TsExporteeStar)
 */
function handleStarExports(
	exporteeStar: TsExporteeStar,
	scope: TsTreeScope,
	loopDetector: LoopDetector,
	codePath: CodePathHasPath,
	jsLocation: (spec: ModuleSpec) => JsLocation,
	exportType: ExportType,
): IArray<TsNamedDecl> {
	const moduleScope = scope.moduleScopes.get(exporteeStar.from);
	if (moduleScope) {
		// TODO: check if scoped
		const scopedModule = moduleScope as any; // TsTreeScope.Scoped
		if (scopedModule.current._tag === "TsDeclModule") {
			const mod = scopedModule.current as any; // TsDeclModule
			const resolvedModule = scope.stack.includes(mod)
				? mod
				: ReplaceExports.cachedReplaceExports(scopedModule, loopDetector, mod);

			return resolvedModule.nameds.flatMap((n: TsNamedDecl) => {
				if (n.name === TsIdent.default()) {
					return IArray.Empty;
				}
				return exportSingle(
					codePath,
					jsLocation,
					scopedModule,
					exportType,
					n,
					none,
					loopDetector,
				);
			});
		}
	}

	scope.fatalMaybe(
		`Couldn't find expected module ${exporteeStar.from.toString()}`,
	);
	return IArray.Empty;
}

/**
 * Core export function for single declarations
 */
function exportSingle(
	ownerCp: CodePathHasPath,
	jsLocation: (spec: ModuleSpec) => JsLocation,
	scope: TsTreeScope,
	exportType: ExportType,
	namedDecl: TsNamedDecl,
	renamedOpt: Option<TsIdentSimple>,
	loopDetector: LoopDetector,
): IArray<TsNamedDecl> {
	return Exports.export(
		ownerCp,
		jsLocation,
		scope,
		exportType,
		namedDecl,
		renamedOpt,
		loopDetector,
	);
}

/**
 * Rewrites exports in modules and namespaces if they contain exports
 */
function rewriteExports(
	namedDecl: TsNamedDecl,
	scope: TsTreeScope,
	loopDetector: LoopDetector,
): TsNamedDecl {
	if (namedDecl._tag === "TsDeclModule") {
		const module = namedDecl as any; // TsDeclModule
		if (module.exports && module.exports.length > 0) {
			return ReplaceExports.cachedReplaceExports(scope, loopDetector, module);
		}
	} else if (namedDecl._tag === "TsDeclNamespace") {
		const namespace = namedDecl as any; // TsDeclNamespace
		if (namespace.exports && namespace.exports.length > 0) {
			return new ReplaceExports(loopDetector).visitTsDecl(scope)(
				namespace as any,
			) as TsNamedDecl;
		}
	}
	return namedDecl;
}

/**
 * Handles namespaced export type
 */
function handleNamespacedExport(
	rewritten: TsNamedDecl,
	ownerCp: CodePathHasPath,
	jsLocation: (spec: ModuleSpec) => JsLocation,
): IArray<TsNamedDecl> {
	if (isContainer(rewritten)) {
		const container = rewritten as any; // TsContainer
		const withLocation = Utils.withJsLocation(
			container,
			jsLocation(ModuleSpec.namespaced()),
		);

		return withLocation.members.flatMap((member: any) => {
			if (isNamedDecl(member)) {
				return DeriveCopy.apply(member, ownerCp, none);
			}
			return IArray.Empty;
		});
	} else {
		const withLocation = Utils.withJsLocation(
			rewritten,
			jsLocation(ModuleSpec.namespaced()),
		);
		return DeriveCopy.apply(withLocation, ownerCp, some(TsIdent.namespaced()));
	}
}

/**
 * Handles named export type
 */
function handleNamedExport(
	rewritten: TsNamedDecl,
	ownerCp: CodePathHasPath,
	renamedOpt: Option<TsIdentSimple>,
	jsLocation: (spec: ModuleSpec) => JsLocation,
): IArray<TsNamedDecl> {
	return DeriveCopy.apply(rewritten, ownerCp, renamedOpt).map((x) =>
		Utils.withJsLocation(x, jsLocation(ModuleSpec.apply(x.name))),
	);
}

/**
 * Handles defaulted export type
 */
function handleDefaultedExport(
	rewritten: TsNamedDecl,
	ownerCp: CodePathHasPath,
	jsLocation: (spec: ModuleSpec) => JsLocation,
): IArray<TsNamedDecl> {
	return DeriveCopy.apply(rewritten, ownerCp, some(TsIdent.default())).map(
		(x) => Utils.withJsLocation(x, jsLocation(ModuleSpec.defaulted())),
	);
}

/**
 * Type guard to check if a declaration is a container
 */
function isContainer(decl: TsNamedDecl): boolean {
	return (
		decl._tag === "TsDeclNamespace" ||
		decl._tag === "TsDeclModule" ||
		decl._tag === "TsDeclClass" ||
		decl._tag === "TsDeclInterface"
	);
}

/**
 * Picks exports that match the wanted identifiers.
 * This is used when resolving imports to find matching exports.
 */
function pickExports(
	exports: IArray<TsExport>,
	wanted: IArray<TsIdent>,
): IArray<PickedExport> {
	return exports.flatMap((e) => {
		if (e.tpe._tag === "Namespaced") {
			return IArray.fromArray([createPickedExport(e, wanted)]);
		} else if (e.tpe._tag === "Defaulted") {
			if (wanted.length > 0 && wanted.get(0) === TsIdent.default()) {
				return IArray.fromArray([createPickedExport(e, wanted.tail)]);
			}
			return IArray.Empty;
		} else if (e.tpe._tag === "Named") {
			const picked = pickNamedExport(e, wanted);
			return isSome(picked) ? IArray.fromArray([picked.value]) : IArray.Empty;
		}
		return IArray.Empty;
	});
}

/**
 * Picks a named export that matches the wanted identifiers
 */
function pickNamedExport(
	e: TsExport,
	wanted: IArray<TsIdent>,
): Option<PickedExport> {
	const exported = e.exported;

	if (exported._tag === "TsExporteeNames") {
		const exporteeNames = exported as TsExporteeNames;
		for (const [qIdent, aliasOpt] of exporteeNames.idents.toArray()) {
			if (isNone(aliasOpt) && wanted.startsWith(qIdent.parts)) {
				const newExported = TsExporteeNames.create(
					IArray.fromArray([[qIdent, aliasOpt as Option<TsIdentSimple>]]),
					exporteeNames.fromOpt,
				);
				const newExport = { ...e, exported: newExported };
				return some(
					createPickedExport(newExport, wanted.drop(qIdent.parts.length)),
				);
			}
		}
		return none;
	} else if (exported._tag === "TsExporteeTree") {
		const exporteeTree = exported as TsExporteeTree;
		if (exporteeTree.decl._tag === "TsImport") {
			const importDecl = exporteeTree.decl as TsImport;
			const validImport = Imports.validImport(wanted)(importDecl);
			if (isSome(validImport)) {
				const newExported = TsExporteeTree.create(validImport.value as any);
				const newExport = { ...e, exported: newExported };
				return some(createPickedExport(newExport, wanted));
			}
		} else if (isNamedDecl(exporteeTree.decl)) {
			const namedDecl = exporteeTree.decl as TsNamedDecl;
			if (wanted.length > 0 && wanted.get(0) === namedDecl.name) {
				return some(createPickedExport(e, wanted));
			}
		}
		return none;
	} else if (exported._tag === "TsExporteeStar") {
		return some(createPickedExport(e, wanted));
	}

	return none;
}

/**
 * Rewrites JavaScript location to match the owner's location.
 * This is used when structures come from imports and need their location
 * determined based on where they are exported.
 */
function rewriteLocationToOwner(
	jsLocation: JsLocation,
	ms: ModuleSpec,
): JsLocation {
	if (jsLocation._tag === "Module" && ms._tag === "Specified") {
		const moduleLocation = jsLocation as any; // JsLocationModule
		const specifiedSpec = ms as any; // SpecifiedModuleSpec
		return JsLocation.module(moduleLocation.module, specifiedSpec);
	} else if (jsLocation._tag === "Global" && ms._tag === "Specified") {
		const globalLocation = jsLocation as any; // JsLocationGlobal
		const specifiedSpec = ms as any; // SpecifiedModuleSpec
		return JsLocation.global(
			globalLocation.jsPath.concat(specifiedSpec.tsIdents),
		);
	} else if (jsLocation._tag === "Zero") {
		return JsLocation.zero();
	}

	// For other cases, return the original location
	return jsLocation;
}
