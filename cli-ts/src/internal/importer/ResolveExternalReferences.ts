/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.ResolveExternalReferences
 *
 * Resolves external module references in TypeScript files by:
 * 1. Finding all import/export statements with module specifiers
 * 2. Resolving those module specifiers to actual library sources
 * 3. Rewriting module names to use resolved identifiers
 * 4. Tracking resolved and unresolved modules for dependency management
 */

import { type Either, left, right } from "fp-ts/Either";
import { none, some, type Option } from "fp-ts/Option";
import { IArray } from "../IArray";
import type { Logger } from "../logging";
import { TreeTransformationScopedChanges } from "../ts/TreeTransformations";
import type { TsTreeScope } from "../ts/TsTreeScope";
import {
	type TsIdentLibrary,
	type TsIdentModule,
	type TsParsedFile,
	type TsImport,
	type TsExport,
	type TsImportee,
	TsIdent
} from "../ts/trees";
import { InFolder } from "../files";
import type { LibraryResolver } from "./LibraryResolver";
import type { LibTsSource } from "./LibTsSource";
import { ResolvedModule, ResolvedModuleLocal, ResolvedModuleNotLocal } from "./ResolvedModule";

/**
 * Result of resolving external references
 */
export interface ResolveExternalReferencesResult {
	readonly transformedFile: TsParsedFile;
	readonly resolvedModules: Set<ResolvedModule>;
	readonly unresolvedModules: Set<TsIdentModule>;
}

/**
 * Visitor class for resolving external references
 */
class ResolveExternalReferencesVisitor extends TreeTransformationScopedChanges {
	public readonly resolvedModules = new Set<ResolvedModule>();
	public readonly unresolvedModules = new Set<TsIdentModule>();
	public readonly importTypes = new Map<string, TsIdent>();

	constructor(
		private readonly resolve: LibraryResolver,
		private readonly source: LibTsSource,
		private readonly folder: InFolder,
		private readonly logger: Logger<void>
	) {
		super();
	}

	/**
	 * Transform import statements to resolve external references
	 */
	enterTsImport(_scope: TsTreeScope): (x: TsImport) => TsImport {
		return (x: TsImport) => {
			if (x.from._tag === "TsImporteeFrom") {
				const importeeFrom = x.from as any; // Type assertion for now
				const resolved = this.resolveModule(importeeFrom.from);
				if (resolved) {
					// Update the import with resolved module name
					return {
						...x,
						from: {
							...importeeFrom,
							from: resolved.moduleName
						}
					};
				}
			}
			return x;
		};
	}

	/**
	 * Transform export statements to resolve external references
	 */
	enterTsExport(_scope: TsTreeScope): (x: TsExport) => TsExport {
		return (x: TsExport) => {
			// Handle export-from statements
			if (x.exported._tag === "TsExporteeNames") {
				const exporteeNames = x.exported as any; // Type assertion for now
				if (exporteeNames.fromOpt && exporteeNames.fromOpt._tag === "Some") {
					const resolved = this.resolveModule(exporteeNames.fromOpt.value);
					if (resolved) {
						// Update the export with resolved module name
						return {
							...x,
							exported: {
								...exporteeNames,
								fromOpt: { _tag: "Some", value: resolved.moduleName }
							}
						};
					}
				}
			}
			return x;
		};
	}

	/**
	 * Resolve a module identifier to a concrete module
	 */
	private resolveModule(moduleId: TsIdentModule): ResolvedModule | null {
		try {
			// Try to resolve as a library module
			const moduleResult = this.resolve.module(this.source, this.folder, moduleId.value);
			if (moduleResult._tag === "Some") {
				const resolved = moduleResult.value;
				if (resolved instanceof ResolvedModuleNotLocal) {
					this.resolvedModules.add(resolved);
					return resolved;
				} else if (resolved instanceof ResolvedModuleLocal) {
					this.resolvedModules.add(resolved);
					return resolved;
				}
			}

			// Module could not be resolved
			this.unresolvedModules.add(moduleId);
			this.logger.warn(`Could not resolve module: ${moduleId.value}`);
			return null;

		} catch (error) {
			this.logger.warn(`Error resolving module ${moduleId.value}: ${error}`);
			this.unresolvedModules.add(moduleId);
			return null;
		}
	}
}

/**
 * ResolveExternalReferences utility object providing the main apply function.
 * Equivalent to the Scala object ResolveExternalReferences.
 */
export const ResolveExternalReferences = {
	/**
	 * Apply external reference resolution to a parsed file.
	 *
	 * Resolves all external module references in import/export statements,
	 * tracks resolved and unresolved modules, and returns the transformed file.
	 *
	 * @param resolve The library resolver for module resolution
	 * @param source The source library being processed
	 * @param folder The folder context for relative resolution
	 * @param file The parsed file to transform
	 * @param logger Logger for reporting resolution results
	 * @returns Result containing transformed file and resolution information
	 */
	apply: (
		resolve: LibraryResolver,
		source: LibTsSource,
		folder: InFolder,
		file: TsParsedFile,
		logger: Logger<void>
	): ResolveExternalReferencesResult => {
		logger.info(`Resolving external references for ${source.libName.value}`);

		// Create a mock root scope for the transformation
		const mockScope = {
			root: {
				libName: source.libName,
				pedantic: true,
				logger
			}
		} as TsTreeScope;

		const visitor = new ResolveExternalReferencesVisitor(resolve, source, folder, logger);
		const transformedFile = visitor.visitTsParsedFile(mockScope)(file);

		// For now, skip adding import types as it requires more complex type construction
		// In a full implementation, this would create proper TsImport objects
		const finalFile = transformedFile;

		logger.info(
			`Resolved ${visitor.resolvedModules.size} modules, ` +
			`${visitor.unresolvedModules.size} unresolved for ${source.libName.value}`
		);

		return {
			transformedFile: finalFile,
			resolvedModules: visitor.resolvedModules,
			unresolvedModules: visitor.unresolvedModules
		};
	}
};

/**
 * Namespace for ResolveExternalReferences types and utilities
 */
export namespace ResolveExternalReferences {
	/**
	 * Result type alias for convenience
	 */
	export type Result = ResolveExternalReferencesResult;
}
