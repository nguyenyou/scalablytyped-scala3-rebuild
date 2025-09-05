/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.LibTsSource
 */

import * as fs from "fs";
import * as path from "path";
import { LibraryResolver } from "@/internal/importer/LibraryResolver.ts";
import { filesSync, InFile, type InFolder } from "../files.js";
import { IArray } from "../IArray.js";
import { PackageJson } from "../ts/PackageJson.js";
import type { TsLib } from "../ts/TsTreeScope.js";
import type { TsIdentLibrary } from "../ts/trees.js";

// TypingsJson interface (from metadata.scala)
export interface TypingsJson {
	name: string;
	main: string;
	files: string[];
	global: boolean;
}

// JSON utilities (simplified versions of the Scala Json object)
export const Json = {
	opt: <T>(filePath: string, decoder: (obj: any) => T): T | undefined => {
		if (filesSync.exists(filePath)) {
			try {
				const content = fs.readFileSync(filePath, "utf-8");
				const parsed = JSON.parse(content);
				return decoder(parsed);
			} catch {
				return undefined;
			}
		}
		return undefined;
	},

	force: <T>(filePath: string, decoder: (obj: any) => T): T => {
		try {
			const content = fs.readFileSync(filePath, "utf-8");
			const parsed = JSON.parse(content);
			return decoder(parsed);
		} catch (error) {
			throw new Error(`Error parsing JSON from ${filePath}: ${error}`);
		}
	},
};

// Base class for all LibTsSource types
export abstract class LibTsSource implements TsLib {
	abstract folder: InFolder;
	abstract libName: TsIdentLibrary;

	protected readonly pathString: string;

	constructor(folder: InFolder) {
		this.pathString = folder.path;
	}

	get path(): string {
		return this.folder.path;
	}

	get packageJsonOpt(): PackageJson | undefined {
		// Try to find package.json in current folder or parent folder
		let packageJsonPath = path.join(this.folder.path, "package.json");
		if (filesSync.exists(packageJsonPath)) {
			return Json.opt(packageJsonPath, (obj) => PackageJson.fromObject(obj));
		}

		// Try parent folder (for stdlib)
		packageJsonPath = path.join(path.dirname(this.folder.path), "package.json");
		if (filesSync.exists(packageJsonPath)) {
			return Json.opt(packageJsonPath, (obj) => PackageJson.fromObject(obj));
		}

		return undefined;
	}

	get tsConfig(): any | undefined {
		const tsConfigPath = path.join(this.folder.path, "tsconfig.json");
		return Json.opt(tsConfigPath, (obj) => obj); // TsConfig type would need to be ported separately
	}

	get shortenedFiles(): IArray<InFile> {
		return LibTsSource.findShortenedFiles(this);
	}

	// Static methods
	static hasTypescriptSourcesImpl(folder: InFolder): boolean {
		const walk = (dirPath: string, depth: number = 0): boolean => {
			if (depth > 10) return false; // Prevent infinite recursion

			try {
				const entries = fs.readdirSync(dirPath, { withFileTypes: true });

				for (const entry of entries) {
					if (entry.name === "node_modules") {
						continue; // Skip node_modules
					}

					const fullPath = path.join(dirPath, entry.name);

					if (entry.isFile() && entry.name.endsWith(".d.ts")) {
						return true;
					} else if (entry.isDirectory()) {
						if (walk(fullPath, depth + 1)) {
							return true;
						}
					}
				}
				return false;
			} catch {
				return false;
			}
		};

		return walk(folder.path);
	}

	private static findShortenedFiles(src: LibTsSource): IArray<InFile> {
		const fromTypingsJson = (
			fromFolder: LibTsSource.FromFolder,
			files: IArray<string> | undefined,
		): IArray<InFile> => {
			if (!files) return IArray.Empty;

			return files.collect({
				isDefinedAt: (pathStr: string) => pathStr.endsWith("typings.json"),
				apply: (pathStr: string) => {
					const typingsJsonPath = path.join(fromFolder.folder.path, pathStr);
					const typingsJson = Json.force(
						typingsJsonPath,
						(obj): TypingsJson => ({
							name: obj.name,
							main: obj.main,
							files: obj.files || [],
							global: obj.global || false,
						}),
					);
					const mainPath = path.join(
						path.dirname(typingsJsonPath),
						typingsJson.main,
					);
					return new InFile(mainPath);
				},
			});
		};

		const fromFileEntry = (
			fromFolder: LibTsSource.FromFolder,
			files: IArray<string> | undefined,
		): IArray<InFile> => {
			if (!files) return IArray.Empty;

			return files.mapNotNoneOption((file) =>
				LibraryResolver.file(fromFolder.folder, file),
			);
		};

		const fromModuleDeclaration = (
			fromFolder: LibTsSource.FromFolder,
			files: Map<string, string> | undefined,
		): IArray<InFile> => {
			const fileValues = files
				? IArray.fromTraversable(Array.from(files.values()))
				: IArray.Empty;

			return fileValues
				.mapNotNoneOption((file) =>
					LibraryResolver.file(fromFolder.folder, file),
				)
				.mapNotNone((existingFile) => {
					return LibTsSource.hasTypescriptSourcesImpl(existingFile.folder)
						? existingFile
						: undefined;
				});
		};

		// Pattern match on the source type
		if (src instanceof LibTsSource.StdLibSource) {
			return IArray.Empty;
		} else if (src instanceof LibTsSource.FromFolder) {
			const f = src as LibTsSource.FromFolder;
			// Need to get parsed types/typings from our custom PackageJson
			const customPkg = f.getCustomPackageJson();
			const fromTypings = IArray.fromArray([
				fromFileEntry(f, customPkg?.parsedTypes || customPkg?.parsedTypings),
				fromTypingsJson(f, customPkg?.parsedTypings),
			]).flatten();

			if (fromTypings.nonEmpty) {
				return fromTypings;
			} else {
				return fromModuleDeclaration(f, customPkg?.parsedModules);
			}
		} else {
			return IArray.Empty;
		}
	}

	protected getCustomPackageJson(): PackageJson | undefined {
		// Try to find package.json in current folder or parent folder
		let packageJsonPath = path.join(this.folder.path, "package.json");
		if (filesSync.exists(packageJsonPath)) {
			return Json.opt(packageJsonPath, (obj) => PackageJson.fromObject(obj));
		}

		// Try parent folder (for stdlib)
		packageJsonPath = path.join(path.dirname(this.folder.path), "package.json");
		if (filesSync.exists(packageJsonPath)) {
			return Json.opt(packageJsonPath, (obj) => PackageJson.fromObject(obj));
		}

		return undefined;
	}

	// Static ordering function
	static compareImpl(a: LibTsSource, b: LibTsSource): number {
		return a.pathString.localeCompare(b.pathString);
	}
}

// Export namespace with static utilities
export namespace LibTsSource {
	// StdLibSource implementation
	export class StdLibSource extends LibTsSource {
		constructor(
			public readonly folder: InFolder,
			public readonly files: IArray<InFile>,
			public readonly libName: TsIdentLibrary,
		) {
			super(folder);
		}
	}

	// FromFolder implementation
	export class FromFolder extends LibTsSource {
		constructor(
			public readonly folder: InFolder,
			public readonly libName: TsIdentLibrary,
		) {
			super(folder);
		}
	}

	export const hasTypescriptSources = LibTsSource.hasTypescriptSourcesImpl;
	export const compare = LibTsSource.compareImpl;
}
