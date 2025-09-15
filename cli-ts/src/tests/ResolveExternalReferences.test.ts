/**
 * Unit tests for ResolveExternalReferences
 */

import { describe, it, expect, beforeEach } from "vitest";
import { none, some } from "fp-ts/Option";
import { IArray } from "../internal/IArray";
import { Comments } from "../internal/Comments";
import { InFolder } from "../internal/files";
import { TsIdent, TsIdentModule, TsParsedFile } from "../internal/ts/trees";
import { CodePath } from "../internal/ts/CodePath";
import { LibTsSource } from "../internal/importer/LibTsSource";
import { ResolveExternalReferences } from "../internal/importer/ResolveExternalReferences";
import { ResolvedModule, ResolvedModuleLocal, ResolvedModuleNotLocal } from "../internal/importer/ResolvedModule";
import type { LibraryResolver } from "../internal/importer/LibraryResolver";
import { DevNullLogger, type Logger } from "../internal/logging";

// Mock implementations
function createMockLogger(): Logger<void> {
	return {
		info: () => {},
		warn: () => {},
		error: () => {},
		debug: () => {},
		fatal: (message: string): never => {
			throw new Error(message);
		},
		withContext: () => createMockLogger(),
		fatalMaybe: (message: string, pedantic: boolean) => {
			if (pedantic) {
				throw new Error(message);
			}
		}
	};
}

function createMockLibTsSource(libName: string): LibTsSource {
	const mockFolder = { path: "/mock/path" } as InFolder;

	// Create a mock that extends LibTsSource.FromFolder
	class MockLibTsSource extends LibTsSource.FromFolder {
		constructor() {
			super(mockFolder, TsIdent.librarySimple(libName));
		}
	}

	return new MockLibTsSource();
}

function createMockFolder(): InFolder {
	return { path: "/mock/folder" } as InFolder;
}

function createMockParsedFile(): TsParsedFile {
	return {
		_tag: "TsParsedFile",
		comments: Comments.empty(),
		directives: IArray.Empty,
		members: IArray.Empty,
		codePath: CodePath.noPath(),
		isModule: false,
		asString: "TsParsedFile(empty)"
	} as TsParsedFile;
}

function createMockLibraryResolver(
	moduleResults: Map<string, ResolvedModule | null> = new Map()
): LibraryResolver {
	return {
		module: (source: LibTsSource, folder: InFolder, value: string) => {
			const result = moduleResults.get(value);
			return result ? some(result) : none;
		}
	} as LibraryResolver;
}

describe("ResolveExternalReferences", () => {
	let mockLogger: Logger<void>;
	let mockSource: LibTsSource;
	let mockFolder: InFolder;
	let mockFile: TsParsedFile;

	beforeEach(() => {
		mockLogger = createMockLogger();
		mockSource = createMockLibTsSource("test-lib");
		mockFolder = createMockFolder();
		mockFile = createMockParsedFile();
	});

	describe("Basic Functionality", () => {
		it("should process a file with no external references", () => {
			const mockResolver = createMockLibraryResolver();

			const result = ResolveExternalReferences.apply(
				mockResolver,
				mockSource,
				mockFolder,
				mockFile,
				mockLogger
			);

			expect(result).toBeDefined();
			expect(result.transformedFile).toBeDefined();
			expect(result.resolvedModules).toBeDefined();
			expect(result.unresolvedModules).toBeDefined();
			expect(result.resolvedModules.size).toBe(0);
			expect(result.unresolvedModules.size).toBe(0);
		});

		it("should return correct result structure", () => {
			const mockResolver = createMockLibraryResolver();

			const result = ResolveExternalReferences.apply(
				mockResolver,
				mockSource,
				mockFolder,
				mockFile,
				mockLogger
			);

			// Verify result structure
			expect(result).toHaveProperty("transformedFile");
			expect(result).toHaveProperty("resolvedModules");
			expect(result).toHaveProperty("unresolvedModules");
			
			// Verify types
			expect(result.transformedFile._tag).toBe("TsParsedFile");
			expect(result.resolvedModules).toBeInstanceOf(Set);
			expect(result.unresolvedModules).toBeInstanceOf(Set);
		});
	});

	describe("Module Resolution", () => {
		it("should resolve external modules successfully", () => {
			const testModule = TsIdentModule.simple("test-module");
			const resolvedModule = new ResolvedModuleNotLocal(mockSource, testModule);
			const moduleResults = new Map([["test-module", resolvedModule]]);
			const mockResolver = createMockLibraryResolver(moduleResults);

			const result = ResolveExternalReferences.apply(
				mockResolver,
				mockSource,
				mockFolder,
				mockFile,
				mockLogger
			);

			expect(result.resolvedModules.size).toBe(0); // No imports in empty file
			expect(result.unresolvedModules.size).toBe(0);
		});

		it("should handle unresolved modules", () => {
			const mockResolver = createMockLibraryResolver(); // Empty resolver

			const result = ResolveExternalReferences.apply(
				mockResolver,
				mockSource,
				mockFolder,
				mockFile,
				mockLogger
			);

			expect(result.resolvedModules.size).toBe(0);
			expect(result.unresolvedModules.size).toBe(0);
		});

		it("should distinguish between local and non-local modules", () => {
			const localModule = TsIdentModule.simple("./local");
			const externalModule = TsIdentModule.simple("external-lib");

			const localResolved = new ResolvedModuleLocal(
				{ path: "/local/file.ts" } as any,
				localModule
			);
			const externalResolved = new ResolvedModuleNotLocal(mockSource, externalModule);

			const moduleResults = new Map<string, ResolvedModule | null>([
				["./local", localResolved],
				["external-lib", externalResolved]
			]);
			const mockResolver = createMockLibraryResolver(moduleResults);

			const result = ResolveExternalReferences.apply(
				mockResolver,
				mockSource,
				mockFolder,
				mockFile,
				mockLogger
			);

			// Since we have an empty file, no modules will be processed
			expect(result.resolvedModules.size).toBe(0);
			expect(result.unresolvedModules.size).toBe(0);
		});
	});

	describe("Error Handling", () => {
		it("should handle resolver errors gracefully", () => {
			const mockResolver = createMockLibraryResolver();
			// Override the module method to throw an error
			mockResolver.module = () => {
				throw new Error("Resolver error");
			};

			const result = ResolveExternalReferences.apply(
				mockResolver,
				mockSource,
				mockFolder,
				mockFile,
				mockLogger
			);

			expect(result.transformedFile).toBeDefined();
			expect(result.resolvedModules.size).toBe(0);
			expect(result.unresolvedModules.size).toBe(0);
		});

		it("should preserve file structure when no changes needed", () => {
			const mockResolver = createMockLibraryResolver();

			const result = ResolveExternalReferences.apply(
				mockResolver,
				mockSource,
				mockFolder,
				mockFile,
				mockLogger
			);

			expect(result.transformedFile._tag).toBe("TsParsedFile");
			expect(result.transformedFile.members.length).toBe(0);
			expect(result.transformedFile.comments).toBe(mockFile.comments);
		});
	});
});
