/**
 * TypeScript port of Phase Integration tests
 * End-to-end tests for the complete phases framework
 */

import { describe, expect, test } from "bun:test";
import { Either, left, right } from "fp-ts/Either";
import { SortedMap, SortedSet } from "../../internal/collections";
import { Logger } from "../../internal/logging";
import {
	CollectingPhaseListener,
	PhaseEvent,
	PhaseListener,
} from "../../internal/phases/PhaseListener";
import { PhaseRes } from "../../internal/phases/PhaseRes";
import {
	Formatters,
	Orderings,
	PhaseRunner,
} from "../../internal/phases/PhaseRunner";
import { RecPhase } from "../../internal/phases/RecPhase";
import type { GetDeps, IsCircular, Phase } from "../../internal/phases/types";

// Test helper types
type FileId = string;
interface FileData {
	path: string;
	content: string;
	processed: boolean;
	dependencies: Set<FileId>;
	errors: string[];
}

interface ProcessedFile {
	id: FileId;
	originalPath: string;
	processedContent: string;
	dependencyCount: number;
	processingSteps: string[];
}

// Mock logger for testing
const mockLogger = Logger.DevNull();
const getLogger = (_id: FileId) => mockLogger;

// Helper functions for creating test data
const createFileData = (
	path: string,
	content: string,
	deps: FileId[] = [],
): FileData => ({
	path,
	content,
	processed: false,
	dependencies: new Set(deps),
	errors: [],
});

const createProcessedFile = (
	id: FileId,
	originalPath: string,
	content: string,
): ProcessedFile => ({
	id,
	originalPath,
	processedContent: content,
	dependencyCount: 0,
	processingSteps: [],
});

// Phase implementations for testing
const parsePhase: Phase<FileId, FileId, FileData> = (
	id: FileId,
	value: FileId,
	getDeps: GetDeps<FileId, FileData>,
	isCircular: IsCircular,
	logger: Logger<void>,
) => {
	// Simulate parsing a file
	const content = `parsed content for ${value}`;
	const deps: FileId[] = [];

	// Add some dependencies based on file name patterns
	if (value.includes("main")) {
		deps.push("utils.ts", "types.ts");
	} else if (value.includes("utils")) {
		deps.push("types.ts");
	}

	return PhaseRes.Ok(createFileData(value, content, deps));
};

const validatePhase: Phase<FileId, FileData, FileData> = (
	id: FileId,
	value: FileData,
	getDeps: GetDeps<FileId, FileData>,
	isCircular: IsCircular,
	logger: Logger<void>,
) => {
	// Simulate validation
	const errors: string[] = [];

	if (value.content.includes("error")) {
		errors.push("Validation error found");
	}

	if (isCircular) {
		errors.push("Circular dependency detected");
	}

	if (errors.length > 0) {
		return PhaseRes.Failure(new Map([[id, right(errors.join(", "))]]));
	}

	return PhaseRes.Ok({
		...value,
		processed: true,
		errors,
	});
};

const dependencyResolutionPhase: Phase<FileId, FileData, FileData> = (
	id: FileId,
	value: FileData,
	getDeps: GetDeps<FileId, FileData>,
	isCircular: IsCircular,
	logger: Logger<void>,
) => {
	if (value.dependencies.size === 0) {
		return PhaseRes.Ok(value);
	}

	const depsResult = getDeps(SortedSet.from(value.dependencies));
	if (depsResult._tag === "Ok") {
		// All dependencies resolved successfully
		return PhaseRes.Ok({
			...value,
			content: `${value.content} (with ${depsResult.value.size} resolved deps)`,
		});
	} else if (depsResult._tag === "Failure") {
		// Some dependencies failed
		return PhaseRes.Failure(depsResult.errors);
	} else {
		// Dependencies ignored
		return PhaseRes.Ignore();
	}
};

const transformPhase: Phase<FileId, FileData, ProcessedFile> = (
	id: FileId,
	value: FileData,
	getDeps: GetDeps<FileId, ProcessedFile>,
	isCircular: IsCircular,
	logger: Logger<void>,
) => {
	if (!value.processed) {
		return PhaseRes.Failure(new Map([[id, right("File not validated")]]));
	}

	const processed = createProcessedFile(
		id,
		value.path,
		value.content.toUpperCase(),
	);
	processed.dependencyCount = value.dependencies.size;
	processed.processingSteps = [
		"parsed",
		"validated",
		"dependencies-resolved",
		"transformed",
	];

	return PhaseRes.Ok(processed);
};

const optimizePhase: Phase<FileId, ProcessedFile, ProcessedFile> = (
	id: FileId,
	value: ProcessedFile,
	getDeps: GetDeps<FileId, ProcessedFile>,
	isCircular: IsCircular,
	logger: Logger<void>,
) => {
	return PhaseRes.Ok({
		...value,
		processedContent: value.processedContent.replace(/\s+/g, " ").trim(),
		processingSteps: [...value.processingSteps, "optimized"],
	});
};

describe("Phase Integration Tests", () => {
	describe("End-to-end pipeline execution", () => {
		test("should execute complete file processing pipeline", () => {
			const pipeline = RecPhase.apply<FileId>()
				.next(parsePhase, "parse")
				.next(validatePhase, "validate")
				.next(dependencyResolutionPhase, "resolve-deps")
				.next(transformPhase, "transform")
				.next(optimizePhase, "optimize");

			const listener = new CollectingPhaseListener<FileId>();
			const runner = PhaseRunner.apply(
				pipeline,
				getLogger,
				listener,
				Formatters.string(),
				Orderings.string(),
			);

			const result = runner("main.ts");

			expect(result._tag).toBe("Ok");
			if (result._tag === "Ok") {
				expect(result.value.id).toBe("main.ts");
				expect(result.value.originalPath).toBe("main.ts");
				expect(result.value.processedContent).toContain(
					"PARSED CONTENT FOR MAIN.TS",
				);
				expect(result.value.dependencyCount).toBe(2); // utils.ts and types.ts
				expect(result.value.processingSteps).toEqual([
					"parsed",
					"validated",
					"dependencies-resolved",
					"transformed",
					"optimized",
				]);
			}

			// Verify all phases were executed
			const events = listener.getEvents();
			const phaseNames = new Set(events.map((e) => e.phaseName));
			expect(phaseNames.has("parse")).toBe(true);
			expect(phaseNames.has("validate")).toBe(true);
			expect(phaseNames.has("resolve-deps")).toBe(true);
			expect(phaseNames.has("transform")).toBe(true);
			expect(phaseNames.has("optimize")).toBe(true);
		});

		test("should handle files with no dependencies", () => {
			const pipeline = RecPhase.apply<FileId>()
				.next(parsePhase, "parse")
				.next(validatePhase, "validate")
				.next(dependencyResolutionPhase, "resolve-deps")
				.next(transformPhase, "transform");

			const listener = new CollectingPhaseListener<FileId>();
			const runner = PhaseRunner.apply(
				pipeline,
				getLogger,
				listener,
				Formatters.string(),
				Orderings.string(),
			);

			const result = runner("standalone.ts");

			expect(result._tag).toBe("Ok");
			if (result._tag === "Ok") {
				expect(result.value.dependencyCount).toBe(0);
				expect(result.value.processedContent).toContain(
					"PARSED CONTENT FOR STANDALONE.TS",
				);
			}
		});
	});

	describe("Complex dependency scenarios", () => {
		test("should handle multiple files with dependencies", () => {
			const pipeline = RecPhase.apply<FileId>()
				.next(parsePhase, "parse")
				.next(validatePhase, "validate")
				.next(dependencyResolutionPhase, "resolve-deps");

			const listener = new CollectingPhaseListener<FileId>();
			const runner = PhaseRunner.apply(
				pipeline,
				getLogger,
				listener,
				Formatters.string(),
				Orderings.string(),
			);

			// Process main file which depends on utils and types
			const mainResult = runner("main.ts");
			expect(mainResult._tag).toBe("Ok");

			// Process utils file which depends on types
			const utilsResult = runner("utils.ts");
			expect(utilsResult._tag).toBe("Ok");

			// Process types file which has no dependencies
			const typesResult = runner("types.ts");
			expect(typesResult._tag).toBe("Ok");

			// Verify dependency resolution worked
			if (mainResult._tag === "Ok") {
				expect(mainResult.value.content).toContain("with 2 resolved deps");
			}
			if (utilsResult._tag === "Ok") {
				expect(utilsResult.value.content).toContain("with 1 resolved deps");
			}
			if (typesResult._tag === "Ok") {
				expect(typesResult.value.content).not.toContain("resolved deps");
			}
		});

		test("should handle circular dependencies", () => {
			const circularParsePhase: Phase<FileId, FileId, FileData> = (
				id: FileId,
				value: FileId,
				getDeps: GetDeps<FileId, FileData>,
				isCircular: IsCircular,
				logger: Logger<void>,
			) => {
				const content = `parsed content for ${value}`;
				let deps: FileId[] = [];

				// Create circular dependency: a -> b -> a
				if (value === "a.ts") {
					deps = ["b.ts"];
				} else if (value === "b.ts") {
					deps = ["a.ts"];
				}

				return PhaseRes.Ok(createFileData(value, content, deps));
			};

			const pipeline = RecPhase.apply<FileId>()
				.next(circularParsePhase, "parse")
				.next(validatePhase, "validate")
				.next(dependencyResolutionPhase, "resolve-deps");

			const listener = new CollectingPhaseListener<FileId>();
			const runner = PhaseRunner.apply(
				pipeline,
				getLogger,
				listener,
				Formatters.string(),
				Orderings.string(),
			);

			const result = runner("a.ts");

			// Should handle circular dependency gracefully
			expect(result._tag).toBe("Failure");
			if (result._tag === "Failure") {
				const errors = Array.from(result.errors.values());
				expect(
					errors.some(
						(error) =>
							error._tag === "Right" &&
							error.right.includes("Circular dependency"),
					),
				).toBe(true);
			}
		});
	});

	describe("Mixed success/failure/ignore scenarios", () => {
		test("should handle mixed results in dependency chain", () => {
			const conditionalParsePhase: Phase<FileId, FileId, FileData> = (
				id: FileId,
				value: FileId,
				getDeps: GetDeps<FileId, FileData>,
				isCircular: IsCircular,
				logger: Logger<void>,
			) => {
				if (value.includes("error")) {
					return PhaseRes.Failure(new Map([[id, right("Parse error")]]));
				} else if (value.includes("ignore")) {
					return PhaseRes.Ignore();
				} else {
					const content = `parsed content for ${value}`;
					const deps = value.includes("main")
						? ["dep1.ts", "error-dep.ts", "ignore-dep.ts"]
						: [];
					return PhaseRes.Ok(createFileData(value, content, deps));
				}
			};

			const pipeline = RecPhase.apply<FileId>()
				.next(conditionalParsePhase, "parse")
				.next(validatePhase, "validate")
				.next(dependencyResolutionPhase, "resolve-deps");

			const listener = new CollectingPhaseListener<FileId>();
			const runner = PhaseRunner.apply(
				pipeline,
				getLogger,
				listener,
				Formatters.string(),
				Orderings.string(),
			);

			// Test successful file
			const successResult = runner("success.ts");
			expect(successResult._tag).toBe("Ok");

			// Test failing file
			const errorResult = runner("error.ts");
			expect(errorResult._tag).toBe("Failure");

			// Test ignored file
			const ignoreResult = runner("ignore.ts");
			expect(ignoreResult._tag).toBe("Ignore");

			// Test file with mixed dependencies
			const mixedResult = runner("main-mixed.ts");
			expect(mixedResult._tag).toBe("Failure"); // Should fail due to error-dep.ts
		});

		test("should propagate failures through pipeline", () => {
			const failingValidatePhase: Phase<FileId, FileData, FileData> = (
				id: FileId,
				value: FileData,
				getDeps: GetDeps<FileId, FileData>,
				isCircular: IsCircular,
				logger: Logger<void>,
			) => {
				if (value.path.includes("invalid")) {
					return PhaseRes.Failure(new Map([[id, right("Validation failed")]]));
				}
				return PhaseRes.Ok({ ...value, processed: true });
			};

			const pipeline = RecPhase.apply<FileId>()
				.next(parsePhase, "parse")
				.next(failingValidatePhase, "validate")
				.next(transformPhase, "transform");

			const listener = new CollectingPhaseListener<FileId>();
			const runner = PhaseRunner.apply(
				pipeline,
				getLogger,
				listener,
				Formatters.string(),
				Orderings.string(),
			);

			const result = runner("invalid.ts");

			expect(result._tag).toBe("Failure");

			// Verify that transform phase was not successfully executed
			const events = listener.getEvents();
			const transformEvents = events.filter((e) => e.phaseName === "transform");
			const transformSuccessEvents = transformEvents.filter(
				(e) => e.event._tag === "Success",
			);
			expect(transformSuccessEvents.length).toBe(0);
		});
	});

	describe("Performance and stress tests", () => {
		test("should handle large number of files efficiently", () => {
			const pipeline = RecPhase.apply<FileId>()
				.next(parsePhase, "parse")
				.next(validatePhase, "validate")
				.next(transformPhase, "transform");

			const listener = new CollectingPhaseListener<FileId>();
			const runner = PhaseRunner.apply(
				pipeline,
				getLogger,
				listener,
				Formatters.string(),
				Orderings.string(),
			);

			const startTime = Date.now();
			const results: PhaseRes<FileId, ProcessedFile>[] = [];

			// Process 100 files
			for (let i = 0; i < 100; i++) {
				const result = runner(`file-${i}.ts`);
				results.push(result);
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			// All should succeed
			const successCount = results.filter((r) => r._tag === "Ok").length;
			expect(successCount).toBe(100);

			// Should complete in reasonable time (less than 1 second)
			expect(duration).toBeLessThan(1000);

			// Verify caching is working (should have events for all files)
			const events = listener.getEvents();
			expect(events.length).toBeGreaterThan(0);
		});

		test("should handle deep dependency chains", () => {
			const deepDependencyPhase: Phase<FileId, FileId, FileData> = (
				id: FileId,
				value: FileId,
				getDeps: GetDeps<FileId, FileData>,
				isCircular: IsCircular,
				logger: Logger<void>,
			) => {
				const content = `parsed content for ${value}`;
				const level = parseInt(value.replace("level-", "").replace(".ts", ""));
				const deps = level > 0 ? [`level-${level - 1}.ts`] : [];

				return PhaseRes.Ok(createFileData(value, content, deps));
			};

			const pipeline = RecPhase.apply<FileId>()
				.next(deepDependencyPhase, "parse")
				.next(validatePhase, "validate")
				.next(dependencyResolutionPhase, "resolve-deps");

			const listener = new CollectingPhaseListener<FileId>();
			const runner = PhaseRunner.apply(
				pipeline,
				getLogger,
				listener,
				Formatters.string(),
				Orderings.string(),
			);

			// Process file with deep dependency chain (level-10 -> level-9 -> ... -> level-0)
			const result = runner("level-10.ts");

			expect(result._tag).toBe("Ok");
			if (result._tag === "Ok") {
				expect(result.value.content).toContain("with 1 resolved deps");
			}

			// Should have processed all levels in the chain
			const events = listener.getEvents();
			const processedFiles = new Set(events.map((e) => e.id));

			// Should have processed multiple levels due to dependency resolution
			expect(processedFiles.size).toBeGreaterThan(1);
		});
	});
});
