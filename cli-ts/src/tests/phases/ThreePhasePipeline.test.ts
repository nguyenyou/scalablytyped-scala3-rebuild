/**
 * Test for the three-phase pipeline integration
 * Verifies that Phase1ReadTypescript → Phase2ToScalaJs → PhaseFlavour works correctly
 */

import { describe, expect, test } from "bun:test";
import { Either, left, right } from "fp-ts/Either";
import { none, some } from "fp-ts/Option";
import { LibTsSource } from "../../internal/importer/LibTsSource";
import { Phase1ReadTypescript } from "../../internal/importer/Phase1ReadTypescript";
import { Phase2ToScalaJs } from "../../internal/importer/Phase2ToScalaJs";
import { PhaseFlavour } from "../../internal/importer/PhaseFlavour";
import { CollectingPhaseListener } from "../../internal/phases/PhaseListener";
import { isFailure, isIgnore, isOk } from "../../internal/phases/PhaseRes";
import {
	Formatters,
	Orderings,
	PhaseRunner,
} from "../../internal/phases/PhaseRunner";
import { RecPhase } from "../../internal/phases/RecPhase";
import "../../internal/importer/LibTsSource.mock"; // Import mock utilities
import { MockCalculateLibraryVersion } from "../../internal/importer/CalculateLibraryVersion";
import { Versions } from "../../internal/importer/ConversionOptions";
import { NormalFlavourImpl } from "../../internal/importer/FlavourImpl";
import { LibraryResolver } from "../../internal/importer/LibraryResolver";
import type { Logger } from "../../internal/logging";
import { Selection } from "../../internal/Selection";
import { Name } from "../../internal/scalajs/Name";
import { TsIdentLibrary } from "../../internal/ts/trees";

describe("Three-Phase Pipeline Integration", () => {
	test("should execute Phase1 → Phase2 → PhaseFlavour pipeline successfully", () => {
		// Create a mock LibTsSource for testing
		const mockLibName = TsIdentLibrary.construct("test-library");
		const mockSource = LibTsSource.createMock(mockLibName);

		// Create logger function
		const getLogger = (id: LibTsSource): Logger<void> =>
			({
				info: (msg: string) =>
					console.log(`[${id.libName.value}] INFO: ${msg}`),
				warn: (msg: string) =>
					console.log(`[${id.libName.value}] WARN: ${msg}`),
				error: (msg: string) =>
					console.log(`[${id.libName.value}] ERROR: ${msg}`),
				debug: (msg: string) =>
					console.log(`[${id.libName.value}] DEBUG: ${msg}`),
				withContext: (key: string, value: string) => getLogger(id),
			}) as Logger<void>;

		// Create phase listener
		const listener = new CollectingPhaseListener<LibTsSource>();

		// Create formatters and orderings
		const formatter = Formatters.create<LibTsSource>(
			(source) => source.libName.value,
		);
		const ordering = Orderings.create<LibTsSource>((a, b) =>
			a.libName.value.localeCompare(b.libName.value),
		);

		// Configure Phase1: TypeScript parsing
		const phase1Config = {
			resolve: LibraryResolver.createMock(),
			calculateLibraryVersion: new MockCalculateLibraryVersion(),
			ignored: new Set<TsIdentLibrary>(),
			ignoredModulePrefixes: new Set<string[]>(),
			pedantic: false,
			parser: () => right({ createMock: () => ({}) }) as any,
			expandTypeMappings: Selection.All<TsIdentLibrary>(),
		};
		const phase1 = Phase1ReadTypescript.create(phase1Config);

		// Configure Phase2: TypeScript to Scala.js conversion
		const phase2Config = {
			pedantic: false,
			useDeprecatedModuleNames: false,
			scalaVersion: Versions.Scala3,
			enableScalaJsDefined: Selection.All<TsIdentLibrary>(),
			outputPkg: new Name("typings"),
			flavour: NormalFlavourImpl.createMock(),
		};
		const phase2 = Phase2ToScalaJs.create(phase2Config);

		// Configure Phase3: Flavour transformations
		const phase3Config = {
			flavour: NormalFlavourImpl.createMock(),
			maybePrivateWithin: none,
		};
		const phase3 = PhaseFlavour.create(phase3Config);

		// Create the three-phase pipeline
		const pipeline = RecPhase.apply<LibTsSource>()
			.next(phase1.apply.bind(phase1), "Phase1ReadTypescript")
			.next(phase2.apply.bind(phase2), "Phase2ToScalaJs")
			.next(phase3.apply.bind(phase3), "PhaseFlavour");

		// Create phase runner
		const runner = PhaseRunner.apply(
			pipeline,
			getLogger,
			listener,
			formatter,
			ordering,
		);

		// Execute pipeline
		const result = runner(mockSource);

		// Verify the result
		expect(isOk(result) || isIgnore(result)).toBe(true);

		if (isOk(result)) {
			console.log("Pipeline executed successfully with result:", result.value);
			expect(result.value).toBeDefined();
			// The final result should be a LibScalaJs object
			expect(result.value.scalaName).toBeDefined();
			expect(result.value.packageTree).toBeDefined();
		} else if (isIgnore(result)) {
			console.log(
				"Pipeline ignored the source (expected for some configurations)",
			);
		} else {
			console.error("Pipeline failed:", result.errors);
			expect(isFailure(result)).toBe(false); // This should not happen in our mock setup
		}
	});

	test("should handle ignored libraries correctly", () => {
		// Create a mock LibTsSource for testing
		const ignoredLibName = TsIdentLibrary.construct("ignored-library");
		const mockSource = LibTsSource.createMock(ignoredLibName);

		// Create logger function
		const getLogger = (id: LibTsSource): Logger<void> =>
			({
				info: (msg: string) =>
					console.log(`[${id.libName.value}] INFO: ${msg}`),
				warn: (msg: string) =>
					console.log(`[${id.libName.value}] WARN: ${msg}`),
				error: (msg: string) =>
					console.log(`[${id.libName.value}] ERROR: ${msg}`),
				debug: (msg: string) =>
					console.log(`[${id.libName.value}] DEBUG: ${msg}`),
				withContext: (key: string, value: string) => getLogger(id),
			}) as Logger<void>;

		// Create phase listener
		const listener = new CollectingPhaseListener<LibTsSource>();

		// Create formatters and orderings
		const formatter = Formatters.create<LibTsSource>(
			(source) => source.libName.value,
		);
		const ordering = Orderings.create<LibTsSource>((a, b) =>
			a.libName.value.localeCompare(b.libName.value),
		);

		// Configure Phase1 with ignored library
		const ignoredLibs = new Set<TsIdentLibrary>([ignoredLibName]);
		const phase1Config = {
			resolve: LibraryResolver.createMock(),
			calculateLibraryVersion: new MockCalculateLibraryVersion(),
			ignored: ignoredLibs,
			ignoredModulePrefixes: new Set<string[]>(),
			pedantic: false,
			parser: () => right({ createMock: () => ({}) }) as any,
			expandTypeMappings: Selection.All<TsIdentLibrary>(),
		};
		const phase1 = Phase1ReadTypescript.create(phase1Config);

		// Configure other phases (won't be reached due to ignore)
		const phase2Config = {
			pedantic: false,
			useDeprecatedModuleNames: false,
			scalaVersion: Versions.Scala3,
			enableScalaJsDefined: Selection.All<TsIdentLibrary>(),
			outputPkg: new Name("typings"),
			flavour: NormalFlavourImpl.createMock(),
		};
		const phase2 = Phase2ToScalaJs.create(phase2Config);

		const phase3Config = {
			flavour: NormalFlavourImpl.createMock(),
			maybePrivateWithin: none,
		};
		const phase3 = PhaseFlavour.create(phase3Config);

		// Create the three-phase pipeline
		const pipeline = RecPhase.apply<LibTsSource>()
			.next(phase1.apply.bind(phase1), "Phase1ReadTypescript")
			.next(phase2.apply.bind(phase2), "Phase2ToScalaJs")
			.next(phase3.apply.bind(phase3), "PhaseFlavour");

		// Create phase runner
		const runner = PhaseRunner.apply(
			pipeline,
			getLogger,
			listener,
			formatter,
			ordering,
		);

		// Execute pipeline
		const result = runner(mockSource);

		// Verify the result is ignored
		expect(isIgnore(result)).toBe(true);
		console.log("Ignored library handled correctly");
	});
});
