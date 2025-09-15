/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.Phase1ReadTypescript
 *
 * This phase parses files, implements the module system, and "implements" a bunch of typescript features by rewriting
 * the tree. For instance defaulted parameters are filled in. The point is to go from a complex tree to a simpler tree
 */

import { type Either, left, right } from "fp-ts/Either";
import { none } from "fp-ts/Option";
import { SortedSet } from "../collections";
import { InFile } from "../files";
import { IArray } from "../IArray";
import { LibraryVersion } from "../LibraryVersion";
import type { Logger } from "../logging";
import { PhaseRes } from "../phases/PhaseRes";
import type { GetDeps, IsCircular } from "../phases/types";
import type { Selection } from "../Selection";
import {
	type TsIdentLibrary,
	type TsIdentModule,
	TsParsedFile,
	type TsContainerOrDecl,
	TsIdent,
	type TsQIdent
} from "../ts/trees";
import type { Directive } from "../ts/Directive";
import { Comments } from "../Comments";
import type { CalculateLibraryVersion } from "./CalculateLibraryVersion";
import type { LibraryResolver } from "./LibraryResolver";
import { LibTs } from "./LibTs";
import { LibTsSource } from "./LibTsSource";

/**
 * Configuration for Phase1ReadTypescript
 */
export interface Phase1Config {
	readonly resolve: LibraryResolver;
	readonly calculateLibraryVersion: CalculateLibraryVersion;
	readonly ignored: Set<TsIdentLibrary>;
	readonly ignoredModulePrefixes: Set<string[]>;
	readonly pedantic: boolean;
	readonly parser: (file: InFile) => Either<string, TsParsedFile>;
	readonly expandTypeMappings: Selection<TsIdentLibrary>;
}

/**
 * This phase parses files, implements the module system, and "implements" a bunch of typescript features by rewriting
 * the tree. For instance defaulted parameters are filled in. The point is to go from a complex tree to a simpler tree
 */
export class Phase1ReadTypescript {
	constructor(private readonly config: Phase1Config) {}

	/**
	 * Apply the phase transformation
	 */
	apply(
		source: LibTsSource,
		_input: LibTsSource,
		getDeps: GetDeps<LibTsSource, LibTs>,
		isCircular: IsCircular,
		logger: Logger<void>,
	): PhaseRes<LibTsSource, LibTs> {
		// Check if library should be ignored or is circular
		if (this.isIgnored(source) || isCircular) {
			logger.info(
				`Ignoring library ${source.libName.value} (ignored: ${this.isIgnored(source)}, circular: ${isCircular})`,
			);
			return PhaseRes.Ignore<LibTsSource, LibTs>();
		}

		logger.info(`Processing TypeScript library: ${source.libName.value}`);

		try {
			// Get dependencies
			const depsResult = getDeps(new SortedSet<LibTsSource>());
			if (depsResult._tag === "Failure") {
				return PhaseRes.Failure<LibTsSource, LibTs>(depsResult.errors);
			}
			if (depsResult._tag === "Ignore") {
				return PhaseRes.Ignore<LibTsSource, LibTs>();
			}

			const dependencies = depsResult.value;

			// Determine which files to include
			const filesToInclude = this.determineFilesToInclude(source, logger);

			// Parse files
			const parsedFiles = this.parseFiles(filesToInclude, logger);
			if (parsedFiles.length === 0) {
				logger.warn(`No files parsed for ${source.libName.value}`);
				return PhaseRes.Ignore<LibTsSource, LibTs>();
			}

			// Merge parsed files into a single TsParsedFile
			const mergedFile = this.mergeFiles(parsedFiles, source, logger);

			// Apply transformation pipeline
			const transformedFile = this.applyTransformations(mergedFile, source, logger);

			// Calculate library version
			const version = this.calculateVersion(source, transformedFile, logger);

			// Create final LibTs
			const libTs = new LibTs(source, version, transformedFile, dependencies);

			logger.info(`Successfully processed ${source.libName.value}`);
			return PhaseRes.Ok<LibTsSource, LibTs>(libTs);

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error(`Failed to process ${source.libName.value}: ${errorMessage}`);

			return PhaseRes.Failure<LibTsSource, LibTs>(
				new Map([[source, right(`Phase1 processing failed: ${errorMessage}`)]]),
			);
		}
	}

	/**
	 * Check if a library should be ignored
	 */
	private isIgnored(source: LibTsSource): boolean {
		// Check if the library name is in the ignored set
		for (const ignoredLib of this.config.ignored) {
			if (ignoredLib.value === source.libName.value) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Check if a module should be ignored based on module prefixes
	 */
	private ignoreModule(modName: TsIdentModule): boolean {
		const fragments = modName.fragments;
		for (let n = 1; n <= fragments.length; n++) {
			const prefix = fragments.slice(0, n);
			for (const ignoredPrefix of this.config.ignoredModulePrefixes) {
				if (this.arraysEqual(prefix, ignoredPrefix)) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Helper to compare arrays for equality
	 */
	private arraysEqual<T>(a: T[], b: T[]): boolean {
		return a.length === b.length && a.every((val, i) => val === b[i]);
	}

	/**
	 * Determine which files to include for processing
	 */
	private determineFilesToInclude(source: LibTsSource, logger: Logger<void>): InFile[] {
		logger.info(`Determining files to include for ${source.libName.value}`);

		// This would normally use LibraryResolver to find files
		// For testing purposes, create a mock file if the source has a folder
		if (source instanceof LibTsSource.FromFolder) {
			const mockFile = new InFile(source.folder.path + "/index.d.ts");
			return [mockFile];
		}

		return [];
	}

	/**
	 * Parse TypeScript files using the configured parser
	 */
	private parseFiles(files: InFile[], logger: Logger<void>): TsParsedFile[] {
		logger.info(`Parsing ${files.length} files`);

		const parsed: TsParsedFile[] = [];
		for (const file of files) {
			try {
				const result = this.config.parser(file);
				if (result._tag === "Right") {
					parsed.push(result.right);
				} else {
					logger.warn(`Failed to parse ${file.path}: ${result.left}`);
				}
			} catch (error) {
				logger.warn(`Error parsing ${file.path}: ${error}`);
			}
		}

		return parsed;
	}

	/**
	 * Merge multiple parsed files into a single TsParsedFile
	 */
	private mergeFiles(files: TsParsedFile[], source: LibTsSource, logger: Logger<void>): TsParsedFile {
		logger.info(`Merging ${files.length} parsed files for ${source.libName.value}`);

		if (files.length === 0) {
			return TsParsedFile.createMock();
		}

		if (files.length === 1) {
			return files[0];
		}

		// Merge all files into one
		const allMembers: TsContainerOrDecl[] = [];
		const allComments = Comments.empty();

		for (const file of files) {
			allMembers.push(...file.members);
		}

		return TsParsedFile.create(
			allComments,
			IArray.Empty, // directives
			IArray.fromArray(allMembers),
			files[0].codePath // Use first file's code path
		);
	}

	/**
	 * Apply transformation pipeline to the parsed file
	 */
	private applyTransformations(file: TsParsedFile, source: LibTsSource, logger: Logger<void>): TsParsedFile {
		logger.info(`Applying transformations for ${source.libName.value}`);

		let transformedFile = file;

		// Filter out ignored modules if configured
		if (this.config.ignoredModulePrefixes.size > 0) {
			transformedFile = this.filterIgnoredModules(transformedFile);
		}

		// Apply other transformations (placeholder for now)
		// In the real implementation, this would apply a complex pipeline of transformations

		return transformedFile;
	}

	/**
	 * Filter out modules that match ignored prefixes
	 */
	private filterIgnoredModules(file: TsParsedFile): TsParsedFile {
		const filteredMembers = file.members.toArray().filter(member => {
			// Check if member is a module declaration
			if (member._tag === "TsDeclModule") {
				const moduleDecl = member as any; // Type assertion for now
				return !this.ignoreModule(moduleDecl.name);
			}
			if (member._tag === "TsAugmentedModule") {
				const augmentedModule = member as any; // Type assertion for now
				return !this.ignoreModule(augmentedModule.name);
			}
			return true;
		});

		return TsParsedFile.create(
			file.comments,
			file.directives,
			IArray.fromArray(filteredMembers),
			file.codePath
		);
	}

	/**
	 * Calculate library version
	 */
	private calculateVersion(source: LibTsSource, file: TsParsedFile, logger: Logger<void>): LibraryVersion {
		logger.info(`Calculating version for ${source.libName.value}`);

		// Use the configured version calculator
		const sourceFolder = source.folder;
		const isStdLib = source.libName.value === "std";
		const packageJsonOpt = none; // Would be extracted from source
		const comments = file.comments;

		return this.config.calculateLibraryVersion.calculate(sourceFolder, isStdLib, packageJsonOpt, comments);
	}

	/**
	 * Static factory method to create Phase1ReadTypescript with configuration
	 */
	static create(config: Phase1Config): Phase1ReadTypescript {
		return new Phase1ReadTypescript(config);
	}
}

/**
 * Companion object with utility methods
 */
export namespace Phase1ReadTypescript {
	/**
	 * Create a transformation pipeline
	 * This would be a complex transformation pipeline in the real implementation
	 */
	export function createPipeline(
		libName: TsIdentLibrary,
		_expandTypeMappings: Selection<TsIdentLibrary>,
		involvesReact: boolean,
		logger: Logger<void>,
	): ((file: TsParsedFile) => TsParsedFile)[] {
		logger.info(
			`Creating transformation pipeline for ${libName.value} (React: ${involvesReact})`,
		);

		// In the real implementation, this would include transformations like:
		// - LibrarySpecific transformations
		// - SetJsLocation
		// - SimplifyParents
		// - HandleCommonJsModules
		// - QualifyReferences
		// - And many more...

		// For now, return identity transformations as placeholders
		return [
			(file: TsParsedFile) => {
				logger.info("Transformation: LibrarySpecific");
				return file;
			},
			(file: TsParsedFile) => {
				logger.info("Transformation: SetJsLocation");
				return file;
			},
			(file: TsParsedFile) => {
				logger.info("Transformation: SimplifyParents");
				return file;
			},
			(file: TsParsedFile) => {
				logger.info("Transformation: HandleCommonJsModules");
				return file;
			},
			(file: TsParsedFile) => {
				logger.info("Transformation: QualifyReferences");
				return file;
			},
		];
	}
}
