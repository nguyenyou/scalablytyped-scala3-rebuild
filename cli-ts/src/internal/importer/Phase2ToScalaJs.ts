/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.Phase2ToScalaJs
 *
 * This phase starts by going from the typescript AST to the scala AST. Then the phase itself implements a bunch of
 * scala.js limitations, like ensuring no methods erase to the same signature
 */

import { right } from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { type SortedMap, SortedSet } from "../collections";
import type { Logger } from "../logging";
import { flatMap, PhaseRes } from "../phases/PhaseRes";
import type { GetDeps, IsCircular } from "../phases/types";
import type { Selection } from "../Selection";
import { Name } from "../scalajs/Name";
import { PackageTree } from "../scalajs/PackageTree";
import type { TsIdentLibrary } from "../ts/trees";
import type { ScalaVersion } from "./ConversionOptions";
import type { FlavourImpl } from "./FlavourImpl";
import { LibScalaJs } from "./LibScalaJs";
import type { LibTs } from "./LibTs";
import type { LibTsSource } from "./LibTsSource";

/**
 * Configuration for Phase2ToScalaJs
 */
export interface Phase2Config {
	readonly pedantic: boolean;
	readonly useDeprecatedModuleNames: boolean;
	readonly scalaVersion: ScalaVersion;
	readonly enableScalaJsDefined: Selection<TsIdentLibrary>;
	readonly outputPkg: Name;
	readonly flavour: FlavourImpl;
}

/**
 * This phase starts by going from the typescript AST to the scala AST. Then the phase itself implements a bunch of
 * scala.js limitations, like ensuring no methods erase to the same signature
 */
export class Phase2ToScalaJs {
	constructor(readonly _config: Phase2Config) {}

	/**
	 * Apply the phase transformation
	 */
	apply(
		source: LibTsSource,
		tsLibrary: LibTs,
		getDeps: GetDeps<LibTsSource, LibScalaJs>,
		_isCircular: IsCircular,
		logger: Logger<void>,
	): PhaseRes<LibTsSource, LibScalaJs> {
		// Always log to console for visibility, regardless of debug flag
		console.log(`🔄 [Phase2ToScalaJs] Starting conversion of: ${tsLibrary.name.value}`);

		logger.info(
			`Converting TypeScript library to Scala.js: ${tsLibrary.name.value}`,
		);

		try {
			// DUMMY IMPLEMENTATION: Get dependencies (but don't use them for real processing)
			console.log(`🔍 [Phase2ToScalaJs] Garbage collecting libraries for: ${tsLibrary.name.value}`);
			const knownLibs = this.garbageCollectLibs(tsLibrary, logger);

			return pipe(
				getDeps(knownLibs),
				flatMap((scalaDeps: SortedMap<LibTsSource, LibScalaJs>) => {
					console.log(`📦 [Phase2ToScalaJs] Processing ${tsLibrary.name.value} with ${scalaDeps.size} dependencies`);

					logger.info(
						`Processing ${tsLibrary.name.value} with ${scalaDeps.size} dependencies`,
					);

					// DUMMY IMPLEMENTATION: Create mock Scala.js library
					console.log(`🏗️  [Phase2ToScalaJs] Creating mock Scala.js library for: ${tsLibrary.name.value}`);
					const mockLibScalaJs = this.createMockLibScalaJs(
						source,
						tsLibrary,
						scalaDeps,
						logger,
					);

					console.log(`✅ [Phase2ToScalaJs] Successfully completed conversion of: ${tsLibrary.name.value}`);
					logger.info(
						`Successfully created mock LibScalaJs for ${tsLibrary.name.value}`,
					);
					return PhaseRes.Ok<LibTsSource, LibScalaJs>(mockLibScalaJs);
				}),
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(`❌ [Phase2ToScalaJs] Failed to convert ${tsLibrary.name.value}: ${errorMessage}`);

			logger.error(
				`Failed to convert ${tsLibrary.name.value} to Scala.js: ${errorMessage}`,
			);

			return PhaseRes.Failure<LibTsSource, LibScalaJs>(
				new Map([[source, right(`Phase2 processing failed: ${errorMessage}`)]]),
			);
		}
	}

	/**
	 * Garbage collect libraries (dummy implementation)
	 */
	private garbageCollectLibs(
		tsLibrary: LibTs,
		logger: Logger<void>,
	): SortedSet<LibTsSource> {
		console.log(`🗑️  [Phase2ToScalaJs] Garbage collecting ${tsLibrary.dependencies.size} dependencies for ${tsLibrary.name.value}`);

		logger.info(`Garbage collecting libraries for ${tsLibrary.name.value}`);

		// DUMMY IMPLEMENTATION: Just return the dependencies as a set
		const deps = new Set<LibTsSource>();
		for (const [source, _lib] of tsLibrary.dependencies) {
			console.log(`   📚 Adding dependency: ${source.libName.value}`);
			deps.add(source);
		}

		console.log(`🔗 [Phase2ToScalaJs] Collected ${deps.size} dependencies for ${tsLibrary.name.value}`);
		return new SortedSet(deps);
	}

	/**
	 * Create a mock LibScalaJs for dummy implementation
	 */
	private createMockLibScalaJs(
		source: LibTsSource,
		tsLibrary: LibTs,
		scalaDeps: SortedMap<LibTsSource, LibScalaJs>,
		logger: Logger<void>,
	): LibScalaJs {
		console.log(`🏭 [Phase2ToScalaJs] Creating mock Scala.js library for ${tsLibrary.name.value}`);

		logger.info(`Creating mock Scala.js library for ${tsLibrary.name.value}`);

		// Create mock Scala name
		const scalaName = new Name(tsLibrary.name.value.replace(/\./g, "_"));
		console.log(`📝 [Phase2ToScalaJs] Generated Scala name: ${scalaName.value}`);

		// Create mock package tree
		const mockPackageTree = this.createMockPackageTree(scalaName, logger);

		// Convert dependencies map
		const dependencies = new Map<LibTsSource, LibScalaJs>();
		scalaDeps.forEach((lib, source) => {
			console.log(`🔗 [Phase2ToScalaJs] Adding dependency mapping: ${source.libName.value} -> ${lib.scalaName.value}`);
			dependencies.set(source, lib);
		});

		console.log(`🎯 [Phase2ToScalaJs] Created LibScalaJs with ${dependencies.size} dependencies for ${tsLibrary.name.value}`);

		return new LibScalaJs(
			source,
			tsLibrary.name.value.replace(/\./g, "_dot_"), // libName
			scalaName, // scalaName
			tsLibrary.version, // libVersion
			mockPackageTree, // packageTree
			dependencies, // dependencies
			tsLibrary.parsed.isStdLib, // isStdLib
			LibScalaJs.createMock(source).names, // names (mock)
		);
	}

	/**
	 * Create a mock package tree
	 */
	private createMockPackageTree(
		scalaName: Name,
		logger: Logger<void>,
	): PackageTree {
		console.log(`🌳 [Phase2ToScalaJs] Creating mock package tree for ${scalaName.value}`);

		logger.info(`Creating mock package tree for ${scalaName.value}`);

		// DUMMY IMPLEMENTATION: In real implementation, this would involve complex AST transformations
		const mockTree = PackageTree.createMock(scalaName);
		console.log(`🌲 [Phase2ToScalaJs] Mock package tree created for ${scalaName.value}`);

		return mockTree;
	}

	/**
	 * Static factory method to create Phase2ToScalaJs with configuration
	 */
	static create(config: Phase2Config): Phase2ToScalaJs {
		return new Phase2ToScalaJs(config);
	}
}

/**
 * Companion object with utility methods
 */
export namespace Phase2ToScalaJs {
	/**
	 * Create mock Scala transformations for dummy implementation
	 */
	export function createMockScalaTransforms(
		outputPkg: Name,
		_scalaVersion: ScalaVersion,
		logger: Logger<void>,
	): ((tree: PackageTree) => PackageTree)[] {
		logger.info(`Creating mock Scala transforms for ${outputPkg.value}`);

		// DUMMY IMPLEMENTATION: Return identity transformations
		return [
			(tree: PackageTree) => {
				logger.info("Mock transformation: CleanupTrivial");
				return tree;
			},
			(tree: PackageTree) => {
				logger.info("Mock transformation: ModulesCombine");
				return tree;
			},
			(tree: PackageTree) => {
				logger.info("Mock transformation: TypeRewriterCast");
				return tree;
			},
			(tree: PackageTree) => {
				logger.info("Mock transformation: RemoveDuplicateInheritance");
				return tree;
			},
			(tree: PackageTree) => {
				logger.info("Mock transformation: CombineOverloads");
				return tree;
			},
		];
	}
}
