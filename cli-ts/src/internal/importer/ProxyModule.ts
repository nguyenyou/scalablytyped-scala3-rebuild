/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.ProxyModule
 *
 * Creates proxy modules that re-export content from other modules.
 * This is used to implement package.json exports field functionality.
 */

import { none, some, type Option } from "fp-ts/Option";
import { IArray } from "../IArray";
import type { Logger } from "../logging";
import { Comments } from "../Comments";
import { CodePath } from "../ts/CodePath";
import { JsLocation } from "../ts/JsLocation";
import {
	type TsIdentLibrary,
	type TsIdentModule,
	type TsIdent,
	TsDeclModule,
	TsExport
} from "../ts/trees";
import type { LibraryResolver } from "./LibraryResolver";
import type { LibTsSource } from "./LibTsSource";

/**
 * Represents a proxy module that re-exports content from another module
 */
export class ProxyModule {
	constructor(
		public readonly comments: Comments,
		public readonly libName: TsIdentLibrary,
		public readonly fromModule: TsIdentModule,
		public readonly toModule: TsIdentModule
	) {}

	/**
	 * Convert this proxy module to a TsDeclModule
	 */
	get asModule(): TsDeclModule {
		// Create a star export from the source module
		const starExport = TsExport.star(this.fromModule);

		// For now, create a simplified TsDeclModule
		// In a full implementation, this would use proper constructors
		return {
			_tag: "TsDeclModule",
			comments: this.comments,
			declared: false,
			name: this.toModule,
			members: IArray.fromArray([starExport as any]), // Cast to any for now
			codePath: CodePath.noPath(), // Simplified for now
			jsLocation: JsLocation.zero(),
			augmentedModules: IArray.Empty,
			asString: `TsDeclModule(${this.toModule.value})`
		} as TsDeclModule;
	}
}

/**
 * ProxyModule utility namespace providing factory methods
 */
export namespace ProxyModule {
	/**
	 * Comment used for proxy modules created from package.json exports
	 */
	const FromExports = Comments.create("/* from `exports` in `package.json` */\n");

	/**
	 * Create proxy modules from package.json exports field
	 *
	 * @param source The source library
	 * @param logger Logger for reporting
	 * @param resolve Library resolver for module resolution
	 * @param existing Function to check if a module already exists
	 * @param exports Map of export names to export paths from package.json
	 * @returns Iterable of proxy modules
	 */
	export function fromExports(
		source: LibTsSource,
		logger: Logger<void>,
		resolve: LibraryResolver,
		existing: (ident: TsIdent) => boolean,
		exports: Map<string, string>
	): ProxyModule[] {
		const result: ProxyModule[] = [];

		// Expand glob patterns in exports
		const expandedGlobs = expandGlobPatterns(exports, source, logger);

		// Get the library module identifier
		const libModule = createLibraryModule(source.libName);

		// Process each export
		for (const [name, types] of expandedGlobs) {
			try {
				// Resolve the target module
				const moduleResult = resolve.module(source, source.folder, types);
				if (moduleResult._tag === "None") {
					// exports are manually annotated, no surprise there are typos
					logger.warn(`couldn't resolve export ${name} -> ${types}`);
					continue;
				}

				const resolvedModule = moduleResult.value;
				const fromModule = resolvedModule.moduleName;

				// Create the target module name
				const nameParts = name.split("/").filter(part => part !== ".");
				const toModule = {
					...libModule,
					fragments: [...libModule.fragments, ...nameParts]
				};

				// Check if module already exists
				if (existing(toModule as any)) {
					continue;
				}

				logger.info(`exposing module ${toModule.value} from ${fromModule.value}`);
				result.push(new ProxyModule(FromExports, source.libName, fromModule, toModule));

			} catch (error) {
				logger.warn(`Error processing export ${name} -> ${types}: ${error}`);
			}
		}

		return result;
	}

	/**
	 * Expand glob patterns in export paths
	 */
	function expandGlobPatterns(
		exports: Map<string, string>,
		source: LibTsSource,
		logger: Logger<void>
	): Map<string, string> {
		const expanded = new Map<string, string>();

		for (const [exportedName, exportedTypesRelPath] of exports) {
			const parts = exportedTypesRelPath.split('*');
			
			if (parts.length === 1) {
				// No glob pattern, use as-is
				expanded.set(exportedName, exportedTypesRelPath);
			} else if (parts.length === 2) {
				// Simple glob pattern: prefix*suffix
				const [pre, post] = parts;
				
				// For now, implement a simplified glob expansion
				// In a full implementation, this would scan the filesystem
				// and find all matching files
				try {
					// Simplified: just use the pattern as-is for now
					expanded.set(exportedName, exportedTypesRelPath);
				} catch (error) {
					logger.warn(`Failed to expand glob pattern ${exportedTypesRelPath}: ${error}`);
				}
			} else {
				logger.warn(`Complex glob patterns not supported: ${exportedTypesRelPath}`);
			}
		}

		return expanded;
	}

	/**
	 * Create a library module identifier from a library name
	 */
	function createLibraryModule(libName: TsIdentLibrary): TsIdentModule {
		// This is a simplified implementation
		// In the full version, this would use TsIdentModule.fromLibrary
		return {
			_tag: "TsIdentModule",
			scopeOpt: libName._tag === "TsIdentLibraryScoped" ? some((libName as any).scope) : none,
			fragments: libName._tag === "TsIdentLibraryScoped" ? [(libName as any).name] : [libName.value],
			value: libName.value,
			inLibrary: libName,
			asString: `TsIdentModule(${libName.value})`
		};
	}
}
