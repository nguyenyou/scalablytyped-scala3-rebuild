import * as fs from "node:fs";
import * as path from "node:path";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import { filesSync, InFile, InFolder } from "@/internal/files.ts";
import { IArray } from "@/internal/IArray.ts";
import type { ConversionOptions } from "@/internal/importer/ConversionOptions.ts";
import { LibraryResolver } from "@/internal/importer/LibraryResolver.ts";
import { LibTsSource } from "@/internal/importer/LibTsSource.ts";
import { TsIdent, TsIdentLibrary } from "@/internal/ts/trees.ts";

// TypeScript equivalent of Scala's LibraryResolver.Res
export type LibraryResolverRes<T> =
	| { type: "Found"; source: T }
	| { type: "Ignored"; name: TsIdentLibrary }
	| { type: "NotAvailable"; name: TsIdentLibrary };

// Helper functions for LibraryResolverRes
export const LibraryResolverRes = {
	Found: <T>(source: T): LibraryResolverRes<T> => ({ type: "Found", source }),
	Ignored: (name: TsIdentLibrary): LibraryResolverRes<never> => ({
		type: "Ignored",
		name,
	}),
	NotAvailable: (name: TsIdentLibrary): LibraryResolverRes<never> => ({
		type: "NotAvailable",
		name,
	}),

	toOption: <T>(res: LibraryResolverRes<T>): O.Option<T> =>
		res.type === "Found" ? O.some(res.source) : O.none,

	map:
		<T, U>(f: (value: T) => U) =>
		(res: LibraryResolverRes<T>): LibraryResolverRes<U> =>
			res.type === "Found"
				? LibraryResolverRes.Found(f(res.source))
				: (res as LibraryResolverRes<U>),
};

// TypeScript equivalent of Scala's Bootstrap.Unresolved
export class Unresolved {
	constructor(public readonly notAvailable: TsIdentLibrary[]) {}

	get msg(): string {
		return `Missing typescript definitions for the following libraries: ${this.notAvailable.map((lib) => lib.value).join(", ")}. Try to add a corresponding \`@types\` npm package, or use \`stIgnore\` to ignore`;
	}
}

// TypeScript equivalent of Scala's Bootstrap.Bootstrapped
export class Bootstrapped {
	constructor(
		public readonly inputFolders: IArray<InFolder>,
		public readonly libraryResolver: LibraryResolver,
		public readonly initialLibs: E.Either<Unresolved, LibTsSource[]>,
	) {}
}

export namespace Bootstrap {
	export function fromNodeModules(
		fromFolder: InFolder,
		conversion: ConversionOptions,
		wantedLibs: Set<TsIdentLibrary>,
	): Bootstrapped {
		const stdLibSource = createStdLibSource(fromFolder, conversion);

		const atTypes: O.Option<InFolder> = pipe(
			path.join(fromFolder.path, "@types"),
			O.fromPredicate(filesSync.isDir),
			O.map((typesPath) => new InFolder(typesPath)),
		);

		const inputFolders: IArray<InFolder> = IArray.fromOptions(
			atTypes,
			O.some(fromFolder),
		);

		// Find all sources
		const allSources: IArray<LibTsSource.FromFolder> =
			findSources(inputFolders);
		// Create library resolver
		const libraryResolver = new LibraryResolver(
			stdLibSource,
			allSources,
			conversion.ignoredLibs,
		);

		// Resolve all wanted libraries
		const initialLibs: E.Either<Unresolved, LibTsSource[]> = resolveAll(
			libraryResolver,
			wantedLibs,
		);

		return new Bootstrapped(inputFolders, libraryResolver, initialLibs);
	}

	function createStdLibSource(
		fromFolder: InFolder,
		conversion: ConversionOptions,
	): LibTsSource.StdLibSource {
		const folder = path.join(fromFolder.path, "typescript", "lib");

		// Validate that typescript lib folder exists
		if (!filesSync.exists(folder)) {
			throw new Error(
				`You must add typescript as a dependency. ${folder} must exist.`,
			);
		}

		// Validate that std is not ignored
		for (const ignoredLib of conversion.ignoredLibs) {
			if (ignoredLib.value === TsIdent.std.value) {
				throw new Error("You cannot ignore std");
			}
		}

		// Create files array
		const files = Array.from(conversion.stdLibs).map(
			(s) => new InFile(path.join(folder, `lib.${s}.d.ts`)),
		);

		return new LibTsSource.StdLibSource(
			new InFolder(folder),
			IArray.fromArray(files),
			TsIdent.std,
		);
	}

	function findSources(
		folders: IArray<InFolder>,
	): IArray<LibTsSource.FromFolder> {
		return folders.foldLeft<IArray<LibTsSource.FromFolder>>(
			IArray.Empty,
			(foundSources, next) => {
				const foundNames = new Set(
					foundSources.map((source) => source.libName.value).toArray(),
				);
				const newSources = forFolder(next).filter(
					(source) => !foundNames.has(source.libName.value),
				);

				return foundSources.appendedAll(newSources);
			},
		);
	}

	export function forFolder(folder: InFolder): IArray<LibTsSource.FromFolder> {
		try {
			// Get all entries in the folder
			const entries = fs.readdirSync(folder.path, { withFileTypes: true });

			// Filter to only directories
			const directories = entries
				.filter((entry) => entry.isDirectory())
				.map((entry) => path.join(folder.path, entry.name));

			// Process each directory
			const sources: LibTsSource.FromFolder[] = [];

			for (const dirPath of directories) {
				const dirName = path.basename(dirPath);

				if (dirName.startsWith("@")) {
					// Handle scoped packages (e.g., @types, @angular, etc.)
					if (dirName.startsWith("@types")) {
					} else {
						// For other scoped packages, list their subdirectories
						try {
							const scopedEntries = fs.readdirSync(dirPath, {
								withFileTypes: true,
							});
							const scopedDirs = scopedEntries
								.filter((entry) => entry.isDirectory())
								.map((entry) => path.join(dirPath, entry.name));

							for (const nestedPath of scopedDirs) {
								const nestedName = path.basename(nestedPath);
								const libName = TsIdentLibrary.construct(
									`${dirName}/${nestedName}`,
								);
								const source = new LibTsSource.FromFolder(
									new InFolder(nestedPath),
									libName,
								);

								// Only include if it has TypeScript sources
								if (LibTsSource.hasTypescriptSources(source.folder)) {
									sources.push(source);
								}
							}
						} catch {}
					}
				} else {
					// Handle regular packages
					const libName = TsIdentLibrary.construct(dirName);
					const source = new LibTsSource.FromFolder(
						new InFolder(dirPath),
						libName,
					);

					// Only include if it has TypeScript sources
					if (LibTsSource.hasTypescriptSources(source.folder)) {
						sources.push(source);
					}
				}
			}

			return IArray.fromArray(sources);
		} catch {
			// If we can't read the directory, return empty array
			return IArray.Empty;
		}
	}

	function resolveAll(
		libraryResolver: LibraryResolver,
		libs: Set<TsIdentLibrary>,
	): E.Either<Unresolved, LibTsSource[]> {
		const results = Array.from(libs).map((lib) => libraryResolver.library(lib));

		const found: LibTsSource[] = [];
		const notAvailable: TsIdentLibrary[] = [];

		for (const result of results) {
			switch (result.type) {
				case "Found":
					found.push(result.source);
					break;
				case "NotAvailable":
					notAvailable.push(result.name);
					break;
				case "Ignored":
					// Ignored libraries are not included in either list
					break;
			}
		}

		return notAvailable.length === 0
			? E.right(found)
			: E.left(new Unresolved(notAvailable));
	}
}
