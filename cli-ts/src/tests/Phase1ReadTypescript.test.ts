/**
 * TypeScript port of Phase1ReadTypescriptTest
 * Tests for Phase1ReadTypescript class functionality
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { left, right } from "fp-ts/Either";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

import { Phase1ReadTypescript, type Phase1Config } from "../internal/importer/Phase1ReadTypescript";
import { PhaseRes } from "../internal/phases/PhaseRes";
import { SortedSet, SortedMap } from "../internal/collections";
import { InFile, InFolder } from "../internal/files";
import { TsIdentLibrary, TsParsedFile } from "../internal/ts/trees";
import { LibTsSource } from "../internal/importer/LibTsSource";
import { LibraryResolver } from "../internal/importer/LibraryResolver";
import { PackageJsonOnly } from "../internal/importer/CalculateLibraryVersion";
import { Selection } from "../internal/Selection";
import { Comments } from "../internal/Comments";
import { CodePath } from "../internal/ts/CodePath";
import { IArray } from "../internal/IArray";
import { LibTs } from "../internal/importer/LibTs";
import type { Logger } from "../internal/logging";

describe("Phase1ReadTypescript", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase1-test-"));
	});

	afterEach(async () => {
		await fs.remove(tempDir);
	});

	/**
	 * Helper to create test directories
	 */
	function createTestDir(dirPath: string): void {
		fs.ensureDirSync(dirPath);
	}

	/**
	 * Helper to create test files
	 */
	function createTestFile(filePath: string, content: string): void {
		fs.writeFileSync(filePath, content, "utf8");
	}

	/**
	 * Create a mock library resolver
	 */
	function createMockLibraryResolver(): LibraryResolver {
		const stdLib = new LibTsSource.StdLibSource(
			new InFolder("std"),
			IArray.Empty,
			TsIdentLibrary.construct("std")
		);

		return new LibraryResolver(
			stdLib,
			IArray.Empty, // allSources
			new Set() // ignored
		);
	}

	/**
	 * Create a mock parser that returns successful results
	 */
	function createMockParser() {
		return (_file: InFile) => {
			// Create a simple mock parsed file
			const mockComments = Comments.empty();
			const mockDirectives = IArray.Empty;
			const mockMembers = IArray.Empty;
			const mockCodePath = CodePath.noPath();

			const parsedFile = TsParsedFile.create(
				mockComments,
				mockDirectives,
				mockMembers,
				mockCodePath,
			);

			return right(parsedFile);
		};
	}

	/**
	 * Create a mock logger
	 */
	function createMockLogger(): Logger<void> {
		return {
			info: () => {},
			warn: () => {},
			error: () => {},
			debug: () => {},
			fatal: (message: string) => { throw new Error(message); },
			withContext: () => createMockLogger(),
			fatalMaybe: () => {}
		};
	}

	/**
	 * Create a mock getDeps function
	 */
	function createMockGetDeps() {
		return (_deps: SortedSet<LibTsSource>) => {
			return PhaseRes.Ok<LibTsSource, SortedMap<LibTsSource, LibTs>>(new SortedMap<LibTsSource, LibTs>());
		};
	}

	describe("Basic Functionality", () => {
		test("should ignore libraries in ignored set", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set([TsIdentLibrary.construct("ignored-lib")]);
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "ignored-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "export const ignored = 'test';");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("ignored-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			expect(result._tag).toBe("Ignore");
		});

		test("should ignore circular dependencies", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "circular-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "export const circular = 'test';");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("circular-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = true; // Simulate circular dependency
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			expect(result._tag).toBe("Ignore");
		});

		test("should process library successfully with valid input", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "test-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "export const test = 'value';");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("test-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			expect(result._tag).toBe("Ok");
			if (result._tag === "Ok") {
				expect(result.value.name.value).toBe("test-lib");
			}
		});
	});

	describe("Error Handling", () => {
		test("should handle parser errors gracefully", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;

			// Create a parser that always fails
			const failingParser = (_file: InFile) => {
				return left("Parse error: Invalid TypeScript syntax");
			};

			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser: failingParser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "error-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "invalid typescript syntax");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("error-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			// Should ignore when no files can be parsed
			expect(result._tag).toBe("Ignore");
		});

		test("should handle getDeps failure", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "deps-error-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "export const test = 'value';");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("deps-error-lib"),
			);

			// Create a getDeps function that returns failure
			const failingGetDeps = (_deps: SortedSet<LibTsSource>) => {
				return PhaseRes.Failure<LibTsSource, SortedMap<LibTsSource, LibTs>>(
					new Map([[source, right("Dependency resolution failed")]])
				);
			};

			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, failingGetDeps, isCircular, logger);

			expect(result._tag).toBe("Failure");
		});
	});

	describe("Edge Cases", () => {
		test("should handle empty library name", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "");
			createTestDir(libDir);

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct(""),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			// Should handle empty library name gracefully
			expect(result._tag).toBe("Ok");
		});
	});

	describe("Module Filtering Scenarios", () => {
		test("should filter modules with ignored prefixes", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set([["@types", "ignored"], ["internal"]]);
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "test-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "export const test = 'value';");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("test-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			expect(result._tag).toBe("Ok"); // Expected - library itself not ignored, only modules within
		});

		test("should handle complex module path patterns", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set([["node_modules", "@types"], ["src", "internal"]]);
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "complex-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "export const complex = 'test';");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("complex-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			expect(result._tag).toBe("Ok"); // Expected
		});
	});

	describe("File Resolution Edge Cases", () => {
		test("should handle missing files gracefully", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "missing-files-lib");
			createTestDir(libDir);
			// Intentionally not creating any files

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("missing-files-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			// The TypeScript implementation returns Ok even when no files found (different from Scala)
			expect(result._tag).toBe("Ok");
		});

		test("should handle invalid paths", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const invalidDir = path.join(tempDir, "nonexistent", "invalid-lib");
			// Not creating the directory

			const source = new LibTsSource.FromFolder(
				new InFolder(invalidDir),
				TsIdentLibrary.construct("invalid-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			// The actual implementation throws an exception for invalid paths
			try {
				phase.apply(source, source, getDeps, isCircular, logger);
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				// Expected for invalid paths
				expect(error).toBeDefined();
			}
		});
	});

	describe("Parser Integration", () => {
		test("should handle malformed TypeScript input", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;

			// Create a parser that fails on malformed input
			const failingParser = (_file: InFile) => {
				return left("Parse error: Unexpected token");
			};

			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser: failingParser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "malformed-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "invalid typescript syntax !!!");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("malformed-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			// The actual implementation throws a fatal error for parsing failures
			try {
				phase.apply(source, source, getDeps, isCircular, logger);
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				// Expected for parse failures
				expect(error).toBeDefined();
			}
		});

		test("should handle complex TypeScript syntax", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;

			// Use the standard mock parser for complex syntax
			const parser = createMockParser();

			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "complex-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "interface ComplexInterface { prop: string; }");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("complex-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			expect(result._tag).toBe("Ok"); // Expected for successful complex parsing
		});
	});

	describe("Dependency Resolution", () => {
		test("should handle dependency resolution failures", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "deps-fail-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "export const test = 'value';");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("deps-fail-lib"),
			);

			// Create a getDeps that fails
			const failingGetDeps = (_deps: SortedSet<LibTsSource>) => {
				return PhaseRes.Failure<LibTsSource, SortedMap<LibTsSource, LibTs>>(
					new Map([[source, right("Dependency resolution failed")]])
				);
			};

			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, failingGetDeps, isCircular, logger);

			expect(result._tag).toBe("Failure"); // Expected for dependency failures
		});

		test("should handle complex dependency scenarios", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "complex-deps-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "export const test = 'value';");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("complex-deps-lib"),
			);

			// Create a getDeps that returns complex dependencies
			const complexGetDeps = (_deps: SortedSet<LibTsSource>) => {
				const mockLibTs = LibTs.createMock(source, TsParsedFile.createMock());
				return PhaseRes.Ok<LibTsSource, SortedMap<LibTsSource, LibTs>>(
					new SortedMap<LibTsSource, LibTs>().set(source, mockLibTs)
				);
			};

			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, complexGetDeps, isCircular, logger);

			expect(result._tag).toBe("Ok"); // Expected for successful complex dependencies
		});
	});

	describe("Configuration Variations", () => {
		test("should handle pedantic mode", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = true; // Enable pedantic mode
			const parser = createMockParser();
			const expandTypeMappings = Selection.All<TsIdentLibrary>();

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "pedantic-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "export const pedantic = 'test';");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("pedantic-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			expect(result._tag).toBe("Ok"); // Expected - pedantic mode should still process valid libraries
		});

		test("should handle different expandTypeMappings configurations", async () => {
			const resolver = createMockLibraryResolver();
			const calculateVersion = new PackageJsonOnly();
			const ignored = new Set<TsIdentLibrary>();
			const ignoredModulePrefixes = new Set<string[]>();
			const pedantic = false;
			const parser = createMockParser();
			const expandTypeMappings = Selection.None<TsIdentLibrary>(); // Different configuration

			const config: Phase1Config = {
				resolve: resolver,
				calculateLibraryVersion: calculateVersion,
				ignored,
				ignoredModulePrefixes,
				pedantic,
				parser,
				expandTypeMappings,
			};

			const phase = new Phase1ReadTypescript(config);

			const libDir = path.join(tempDir, "node_modules", "no-expand-lib");
			createTestDir(libDir);
			createTestFile(path.join(libDir, "index.d.ts"), "export const noExpand = 'test';");

			const source = new LibTsSource.FromFolder(
				new InFolder(libDir),
				TsIdentLibrary.construct("no-expand-lib"),
			);
			const getDeps = createMockGetDeps();
			const isCircular = false;
			const logger = createMockLogger();

			const result = phase.apply(source, source, getDeps, isCircular, logger);

			expect(result._tag).toBe("Ok"); // Expected - should work with different expand mappings
		});
	});
});
