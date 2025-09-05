/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.Phase1ReadTypescript
 *
 * This phase parses files, implements the module system, and "implements" a bunch of typescript features by rewriting
 * the tree. For instance defaulted parameters are filled in. The point is to go from a complex tree to a simpler tree
 */

import { type Either, right } from "fp-ts/Either";
import type { InFile } from "../files";
import type { Logger } from "../logging";
import { PhaseRes } from "../phases/PhaseRes";
import type { GetDeps, IsCircular } from "../phases/types";
import type { Selection } from "../Selection";
import { type TsIdentLibrary, TsParsedFile } from "../ts/trees";
import type { CalculateLibraryVersion } from "./CalculateLibraryVersion";
import type { LibraryResolver } from "./LibraryResolver";
import { LibTs } from "./LibTs";
import type { LibTsSource } from "./LibTsSource";

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
		_getDeps: GetDeps<LibTsSource, LibTs>,
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
			// DUMMY IMPLEMENTATION: Create a mock LibTs instead of actual processing
			const mockParsedFile = this.createMockParsedFile(source, logger);
			const mockLibTs = LibTs.createMock(source, mockParsedFile);

			logger.info(
				`Successfully created mock LibTs for ${source.libName.value}`,
			);
			return PhaseRes.Ok<LibTsSource, LibTs>(mockLibTs);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error(
				`Failed to process ${source.libName.value}: ${errorMessage}`,
			);

			return PhaseRes.Failure<LibTsSource, LibTs>(
				new Map([[source, right(`Phase1 processing failed: ${errorMessage}`)]]),
			);
		}
	}

	/**
	 * Check if a library should be ignored
	 */
	private isIgnored(source: LibTsSource): boolean {
		return this.config.ignored.has(source.libName);
	}

	/**
	 * Create a mock parsed file for dummy implementation
	 */
	private createMockParsedFile(
		source: LibTsSource,
		logger: Logger<void>,
	): TsParsedFile {
		logger.info(`Creating mock parsed file for ${source.libName.value}`);

		// In a real implementation, this would parse actual TypeScript files
		// For now, we create a mock parsed file
		return TsParsedFile.createMock();
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
	 * Create a mock pipeline for dummy implementation
	 * In the real implementation, this would be a complex transformation pipeline
	 */
	export function createMockPipeline(
		libName: TsIdentLibrary,
		_expandTypeMappings: Selection<TsIdentLibrary>,
		involvesReact: boolean,
		logger: Logger<void>,
	): ((file: TsParsedFile) => TsParsedFile)[] {
		logger.info(
			`Creating mock pipeline for ${libName.value} (React: ${involvesReact})`,
		);

		// DUMMY IMPLEMENTATION: Return identity transformations
		return [
			(file: TsParsedFile) => {
				logger.info("Mock transformation: LibrarySpecific");
				return file;
			},
			(file: TsParsedFile) => {
				logger.info("Mock transformation: SetJsLocation");
				return file;
			},
			(file: TsParsedFile) => {
				logger.info("Mock transformation: SimplifyParents");
				return file;
			},
			(file: TsParsedFile) => {
				logger.info("Mock transformation: HandleCommonJsModules");
				return file;
			},
			(file: TsParsedFile) => {
				logger.info("Mock transformation: QualifyReferences");
				return file;
			},
		];
	}
}
