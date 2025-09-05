/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.PhaseFlavour
 *
 * Applies flavour-specific transformations to Scala.js libraries
 */

import { right } from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { none, type Option, some } from "fp-ts/Option";
import { type SortedMap, SortedSet } from "../collections";
import type { Logger } from "../logging";
import { flatMap, PhaseRes } from "../phases/PhaseRes";
import type { GetDeps, IsCircular } from "../phases/types";
import type { Name } from "../scalajs/Name";
import type { PackageTree } from "../scalajs/PackageTree";
import type { FlavourImpl } from "./FlavourImpl";
import { LibScalaJs } from "./LibScalaJs";
import type { LibTsSource } from "./LibTsSource";

/**
 * Configuration for PhaseFlavour
 */
export interface PhaseFlavourConfig {
	readonly flavour: FlavourImpl;
	readonly maybePrivateWithin: Option<Name>;
}

/**
 * Applies flavour-specific transformations to Scala.js libraries
 */
export class PhaseFlavour {
	constructor(private readonly config: PhaseFlavourConfig) {}

	/**
	 * Apply the phase transformation
	 */
	apply(
		source: LibTsSource,
		lib: LibScalaJs,
		getDeps: GetDeps<LibTsSource, LibScalaJs>,
		_isCircular: IsCircular,
		logger: Logger<void>,
	): PhaseRes<LibTsSource, LibScalaJs> {
		const flavourLogger = logger;

		flavourLogger.info(
			`Applying flavour transformations to ${lib.scalaName.value}`,
		);

		try {
			// Get dependencies
			const dependencyKeys = new SortedSet(new Set(lib.dependencies.keys()));

			return pipe(
				getDeps(dependencyKeys),
				flatMap((deps: SortedMap<LibTsSource, LibScalaJs>) => {
					flavourLogger.info(
						`Processing flavour with ${deps.size} dependencies`,
					);

					// DUMMY IMPLEMENTATION: Apply mock flavour transformations
					const transformedLib = this.applyMockFlavourTransformations(
						lib,
						deps,
						flavourLogger,
					);

					flavourLogger.info(
						`Successfully applied flavour transformations to ${lib.scalaName.value}`,
					);
					return PhaseRes.Ok<LibTsSource, LibScalaJs>(transformedLib);
				}),
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			flavourLogger.error(
				`Failed to apply flavour transformations to ${lib.scalaName.value}: ${errorMessage}`,
			);

			return PhaseRes.Failure<LibTsSource, LibScalaJs>(
				new Map([
					[source, right(`PhaseFlavour processing failed: ${errorMessage}`)],
				]),
			);
		}
	}

	/**
	 * Apply mock flavour transformations (dummy implementation)
	 */
	private applyMockFlavourTransformations(
		lib: LibScalaJs,
		deps: SortedMap<LibTsSource, LibScalaJs>,
		logger: Logger<void>,
	): LibScalaJs {
		logger.info(
			`Applying mock flavour transformations to ${lib.scalaName.value}`,
		);

		// DUMMY IMPLEMENTATION: In real implementation, this would apply complex transformations
		// based on the flavour configuration

		// Step 1: Create mock tree scope (would be real TreeScope.Root in actual implementation)
		const mockTreeScope = this.createMockTreeScope(lib, deps, logger);

		// Step 2: Apply flavour-specific tree transformations
		let transformedTree = lib.packageTree;

		// Mock transformation 1: Flavour rewritten tree
		transformedTree = this.applyMockFlavourRewrite(
			transformedTree,
			mockTreeScope,
			logger,
		);

		// Mock transformation 2: Mangler
		transformedTree = this.applyMockMangler(
			transformedTree,
			mockTreeScope,
			logger,
		);

		// Mock transformation 3: Private within (if configured)
		transformedTree = this.applyMockPrivateWithin(
			transformedTree,
			mockTreeScope,
			logger,
		);

		// Mock transformation 4: Sorter
		transformedTree = this.applyMockSorter(
			transformedTree,
			mockTreeScope,
			logger,
		);

		// Create new LibScalaJs with transformed tree and updated dependencies
		const dependenciesMap = new Map<LibTsSource, LibScalaJs>();
		deps.forEach((libScalaJs, source) =>
			dependenciesMap.set(source, libScalaJs),
		);

		return new LibScalaJs(
			lib.source,
			lib.libName,
			lib.scalaName,
			lib.libVersion,
			transformedTree,
			dependenciesMap,
			lib.isStdLib,
			lib.names,
		);
	}

	/**
	 * Create mock tree scope (dummy implementation)
	 */
	private createMockTreeScope(
		lib: LibScalaJs,
		deps: SortedMap<LibTsSource, LibScalaJs>,
		logger: Logger<void>,
	): any {
		logger.info(`Creating mock tree scope for ${lib.scalaName.value}`);

		// DUMMY IMPLEMENTATION: Would create actual TreeScope.Root in real implementation
		return {
			libName: lib.scalaName,
			dependencies: deps,
			outputPkg: this.config.flavour.outputPackage,
			pedantic: false,
		};
	}

	/**
	 * Apply mock flavour rewrite transformation
	 */
	private applyMockFlavourRewrite(
		tree: PackageTree,
		_scope: any,
		logger: Logger<void>,
	): PackageTree {
		logger.info("Mock transformation: Flavour rewritten tree");
		// DUMMY IMPLEMENTATION: Return unchanged tree
		return tree;
	}

	/**
	 * Apply mock mangler transformation
	 */
	private applyMockMangler(
		tree: PackageTree,
		_scope: any,
		logger: Logger<void>,
	): PackageTree {
		logger.info("Mock transformation: Mangler");
		// DUMMY IMPLEMENTATION: Return unchanged tree
		return tree;
	}

	/**
	 * Apply mock private within transformation
	 */
	private applyMockPrivateWithin(
		tree: PackageTree,
		_scope: any,
		logger: Logger<void>,
	): PackageTree {
		if (this.config.maybePrivateWithin._tag === "Some") {
			logger.info(
				`Mock transformation: SetPrivateWithin(${this.config.maybePrivateWithin.value.value})`,
			);
		}
		// DUMMY IMPLEMENTATION: Return unchanged tree
		return tree;
	}

	/**
	 * Apply mock sorter transformation
	 */
	private applyMockSorter(
		tree: PackageTree,
		_scope: any,
		logger: Logger<void>,
	): PackageTree {
		logger.info("Mock transformation: Sorter");
		// DUMMY IMPLEMENTATION: Return unchanged tree
		return tree;
	}

	/**
	 * Static factory method to create PhaseFlavour with configuration
	 */
	static create(config: PhaseFlavourConfig): PhaseFlavour {
		return new PhaseFlavour(config);
	}

	/**
	 * Static factory method with individual parameters
	 */
	static createWithParams(
		flavour: FlavourImpl,
		maybePrivateWithin?: Name,
	): PhaseFlavour {
		return new PhaseFlavour({
			flavour,
			maybePrivateWithin: maybePrivateWithin ? some(maybePrivateWithin) : none,
		});
	}
}
