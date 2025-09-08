/**
 * TypeScript port of Phase1ReadTypescriptTest
 * Tests for Phase1ReadTypescript class functionality
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { none, some } from "fp-ts/Option";
import { right } from "fp-ts/Either";
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
});
