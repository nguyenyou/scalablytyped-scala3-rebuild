/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.LibraryResolver
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as O from "fp-ts/Option";
import { filesSync, InFile, InFolder } from "../files.js";
import { IArray } from "../IArray.js";
import { ModuleNameParser } from "../ts/ModuleNameParser.js";
import { TsIdent, TsIdentLibrary, type TsIdentModule } from "../ts/trees.js";
import { LibTsSource } from "./LibTsSource.js";
import { ResolvedModule } from "./ResolvedModule.js";

/**
 * Result type for library resolution
 */
export type LibraryResolverRes<T> =
	| { type: "Found"; source: T }
	| { type: "Ignored"; name: TsIdentLibrary }
	| { type: "NotAvailable"; name: TsIdentLibrary };

/**
 * Helper functions for LibraryResolverRes
 */
export namespace LibraryResolverRes {
	export function Found<T>(source: T): LibraryResolverRes<T> {
		return { type: "Found", source };
	}

	export function Ignored(name: TsIdentLibrary): LibraryResolverRes<never> {
		return { type: "Ignored", name };
	}

	export function NotAvailable(
		name: TsIdentLibrary,
	): LibraryResolverRes<never> {
		return { type: "NotAvailable", name };
	}

	export function toOption<T>(res: LibraryResolverRes<T>): O.Option<T> {
		return res.type === "Found" ? O.some(res.source) : O.none;
	}

	export function map<T, U>(
		f: (value: T) => U,
	): (res: LibraryResolverRes<T>) => LibraryResolverRes<U> {
		return (res: LibraryResolverRes<T>) =>
			res.type === "Found"
				? Found(f(res.source))
				: (res as LibraryResolverRes<U>);
	}
}

/**
 * Main LibraryResolver class
 */
export class LibraryResolver {
	private readonly byName: Map<string, LibTsSource>;

	constructor(
		public readonly stdLib: LibTsSource.StdLibSource,
		allSources: IArray<LibTsSource.FromFolder>,
		private readonly ignored: Set<TsIdentLibrary>,
	) {
		// Group sources by library name, taking the first one for duplicates
		this.byName = new Map();

		// Add all sources to the map
		for (const source of allSources.toArray()) {
			const key = source.libName.value;
			if (!this.byName.has(key)) {
				this.byName.set(key, source);
			}
		}

		// Add std library
		this.byName.set(TsIdent.std.value, stdLib);
	}

	/**
	 * Resolve a module reference from a source
	 */
	module(
		source: LibTsSource,
		folder: InFolder,
		value: string,
	): O.Option<ResolvedModule> {
		// Check if it's a local path (starts with ".")
		if (LibraryResolver.isLocalPath(value)) {
			const localPath = value;
			const fileOpt = LibraryResolver.file(folder, localPath);

			if (O.isSome(fileOpt)) {
				const inFile = fileOpt.value;
				const moduleNames = LibraryResolver.moduleNameFor(source, inFile);
				if (moduleNames.length > 0) {
					return O.some(ResolvedModule.Local(inFile, moduleNames.apply(0)));
				}
			}
			return O.none;
		} else {
			// Global reference
			const globalRef = value;
			const modName = ModuleNameParser.apply(globalRef.split("/"), true);
			const libraryResult = this.library(modName.inLibrary);

			switch (libraryResult.type) {
				case "Found":
					return O.some(ResolvedModule.NotLocal(libraryResult.source, modName));
				case "Ignored":
				case "NotAvailable":
					return O.none;
			}
		}
	}

	/**
	 * Resolve a library by name
	 */
	library(name: TsIdentLibrary): LibraryResolverRes<LibTsSource> {
		// Check if library is ignored
		if (this.isIgnored(name)) {
			return LibraryResolverRes.Ignored(name);
		}

		// Look up in byName map
		const source = this.byName.get(name.value);
		if (source) {
			return LibraryResolverRes.Found(source);
		} else {
			return LibraryResolverRes.NotAvailable(name);
		}
	}

	private isIgnored(name: TsIdentLibrary): boolean {
		for (const ignored of this.ignored) {
			if (ignored.value === name.value) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Create a mock LibraryResolver for testing
	 */
	static createMock(): LibraryResolver {
		const mockStdLib = new LibTsSource.StdLibSource(
			new InFolder("/mock/typescript"),
			IArray.Empty,
			TsIdent.librarySimple("typescript"),
		);
		const mockSources = IArray.Empty as IArray<LibTsSource.FromFolder>;
		const mockIgnored = new Set<TsIdentLibrary>();

		return new LibraryResolver(mockStdLib, mockSources, mockIgnored);
	}
}

/**
 * Static utility methods for LibraryResolver
 */
export namespace LibraryResolver {
	/**
	 * Generate module names for a source and file
	 */
	export function moduleNameFor(
		source: LibTsSource,
		file: InFile,
	): IArray<TsIdentModule> {
		const shortened: O.Option<TsIdentModule> = source.shortenedFiles.contains(
			file,
		)
			? O.some(
					(() => {
						if (TsIdentLibrary.isScoped(source.libName)) {
							return TsIdent.module(O.some(source.libName.scope), [
								source.libName.name,
							]);
						} else if (TsIdentLibrary.isSimple(source.libName)) {
							return TsIdent.module(O.none, [source.libName.value]);
						} else {
							throw new Error(`Unknown library type: ${source.libName}`);
						}
					})(),
				)
			: O.none;

		const longName: TsIdentModule = (() => {
			const keepIndexPath = (() => {
				const filePath = file.path;
				const fileName = path.basename(filePath);
				const dirName = path.dirname(filePath);

				if (fileName === "index.d.ts") {
					const parentDir = path.basename(dirName);
					const grandParentDir = path.dirname(dirName);
					const siblingFile = path.join(grandParentDir, `${parentDir}.d.ts`);
					return filesSync.exists(siblingFile);
				}
				return false;
			})();

			const relativePath = path.relative(source.folder.path, file.path);
			const segments = relativePath.split(path.sep).filter((s) => s.length > 0);

			// For scoped libraries, use the __value representation for module names
			const libFragment = source.libName.__value;
			const fragments = [libFragment, ...segments];

			return ModuleNameParser.apply(fragments, keepIndexPath);
		})();

		const ret = IArray.fromOptions(shortened, O.some(longName));

		// Handle parallel directory mapping (lib <-> es)
		const inParallelDirectory = ret
			.toArray()
			.map((module) => {
				if (module.fragments.includes("lib")) {
					return TsIdent.module(
						module.scopeOpt,
						module.fragments.map((f: string) => (f === "lib" ? "es" : f)),
					);
				} else if (module.fragments.includes("es")) {
					return TsIdent.module(
						module.scopeOpt,
						module.fragments.map((f: string) => (f === "es" ? "lib" : f)),
					);
				}
				return null;
			})
			.filter((m) => m !== null) as TsIdentModule[];

		return ret.concat(IArray.fromArray(inParallelDirectory));
	}

	/**
	 * Find a file within a folder by trying various extensions
	 */
	export function file(within: InFolder, fragment: string): O.Option<InFile> {
		const resolved = resolve(
			within.path,
			fragment,
			`${fragment}.ts`,
			`${fragment}.d.ts`,
			`${fragment}/index.d.ts`,
		);

		for (const filePath of resolved.toArray()) {
			if (filesSync.exists(filePath) && fs.statSync(filePath).isFile()) {
				return O.some(new InFile(filePath));
			}
		}

		return O.none;
	}

	/**
	 * Check if a value represents a local path (starts with ".")
	 */
	export function isLocalPath(s: string): boolean {
		return s.startsWith(".");
	}

	/**
	 * Resolve potential file paths by trying different fragments
	 */
	function resolve(within: string, ...frags: string[]): IArray<string> {
		const paths: string[] = [];

		for (const frag of frags) {
			const cleanFrag = frag.replace(/^\/+/, ""); // Remove leading slashes
			const fullPath = path.join(within, cleanFrag);
			if (filesSync.exists(fullPath)) {
				paths.push(fullPath);
			}
		}

		return IArray.fromArray(paths);
	}
}
