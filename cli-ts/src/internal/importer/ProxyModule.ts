/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.ProxyModule
 *
 * Creates proxy modules that re-export content from other modules.
 * This is used to implement package.json exports field functionality.
 */

import { none, some, type Option } from "fp-ts/Option";
import * as fs from "node:fs";
import * as path from "node:path";
import { IArray } from "../IArray";
import type { Logger } from "../logging";
import { Comments } from "../Comments";
import { CodePath } from "../ts/CodePath";
import { ExportType } from "../ts/ExportType";
import { JsLocation } from "../ts/JsLocation";
import {
	type TsIdentLibrary,
	type TsIdentModule,
	TsIdent,
	TsDeclModule,
	TsExport,
	TsExporteeStar,
	TsQIdent
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
		const starExportee = TsExporteeStar.create(none, this.fromModule);
		const starExport = TsExport.create(
			Comments.empty(),
			false,
			ExportType.named(),
			starExportee
		);

		// Create the code path
		const codePath = CodePath.hasPath(this.libName, TsQIdent.of(this.toModule));

		return TsDeclModule.create(
			this.comments,
			false,
			this.toModule,
			IArray.fromArray([starExport as any]),
			codePath,
			JsLocation.zero()
		);
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
		// Expand glob patterns in exports
		const expandedGlobs = expandGlobPatterns(exports, source, logger);

		// Get the library module identifier
		const libModule = TsIdent.module(
			source.libName._tag === "TsIdentLibraryScoped" ? some((source.libName as any).scope) : none,
			source.libName._tag === "TsIdentLibraryScoped" ? [(source.libName as any).name] : [source.libName.value]
		);

		const result: ProxyModule[] = [];

		// Process each export
		for (const [name, types] of expandedGlobs) {
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
			const toModule = TsIdent.module(
				libModule.scopeOpt,
				[...libModule.fragments, ...nameParts]
			);

			// Check if module already exists
			if (existing(toModule)) {
				continue;
			}

			logger.info(`exposing module ${toModule.value} from ${fromModule.value}`);
			result.push(new ProxyModule(FromExports, source.libName, fromModule, toModule));
		}

		return result;
	}

	/**
	 * Expand glob patterns in export paths
	 * Complete port of the Scala implementation's glob expansion logic
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

				try {
					// Split the pre path and filter out "." entries
					const splitPrePath = pre.split('/').filter(part => part !== ".");

					// Last part of `pre` may not be a full path fragment, so drop it and consider it below
					const [folderPrePart, preFileNameStart] = pre.endsWith("/")
						? [splitPrePath, ""]
						: [splitPrePath.slice(0, -1), splitPrePath[splitPrePath.length - 1] || ""];

					// Build the lookup directory path
					const lookIn = path.resolve(source.folder.path, ...folderPrePart);

					// Find all matching files using filesystem walking
					const expandedFragments = walkDirectory(lookIn, preFileNameStart, post, lookIn);

					// Expand each fragment into both name and types
					for (const fragment of expandedFragments) {
						const expandedName = exportedName.replace("*", fragment);
						const expandedTypes = exportedTypesRelPath.replace("*", fragment);
						expanded.set(expandedName, expandedTypes);
					}
				} catch (error) {
					// If filesystem operations fail, log warning and skip this pattern
					logger.warn(`Failed to expand glob pattern ${exportedTypesRelPath}: ${error}`);
				}
			} else {
				// Multiple glob patterns not supported
				logger.fatal(`need to add support for more than one '*' in glob pattern ${exportedTypesRelPath}`);
			}
		}

		return expanded;
	}

	/**
	 * Walk directory recursively to find files matching the pattern
	 * Equivalent to Scala's os.walk(lookIn).flatMap { ... }
	 */
	function walkDirectory(
		dir: string,
		preFileNameStart: string,
		post: string,
		lookIn: string
	): string[] {
		const results: string[] = [];

		try {
			// Check if directory exists
			if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
				return results;
			}

			// Read directory contents
			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					// Recursively walk subdirectories
					results.push(...walkDirectory(fullPath, preFileNameStart, post, lookIn));
				} else if (entry.isFile()) {
					// Get relative path from lookIn directory
					const relPathString = path.relative(lookIn, fullPath);

					// Check if file matches the pattern
					if (relPathString.startsWith(preFileNameStart) && relPathString.endsWith(post)) {
						// Extract the fragment between prefix and suffix
						const fragment = relPathString
							.substring(preFileNameStart.length)
							.substring(0, relPathString.length - preFileNameStart.length - post.length);
						results.push(fragment);
					}
				}
			}
		} catch (error) {
			// Ignore filesystem errors and return empty results
		}

		return results;
	}


}
