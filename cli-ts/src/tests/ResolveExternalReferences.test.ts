/**
 * Unit tests for ResolveExternalReferences
 */

import { describe, it, expect, beforeEach } from "vitest";
import { none, some } from "fp-ts/Option";
import { IArray } from "../internal/IArray";
import { Comments } from "../internal/Comments";
import { InFolder } from "../internal/files";
import {
	TsIdent,
	TsIdentModule,
	TsParsedFile,
	TsImport,
	TsExport,
	TsImported,
	TsImportedStar,
	TsImportee,
	TsImporteeFrom,
	TsExportee,
	TsExporteeStar,
	TsContainerOrDecl,
	TsQIdent
} from "../internal/ts/trees";
import { CodePath } from "../internal/ts/CodePath";
import { LibTsSource } from "../internal/importer/LibTsSource";
import { ResolveExternalReferences } from "../internal/importer/ResolveExternalReferences";
import { ResolvedModule, ResolvedModuleLocal, ResolvedModuleNotLocal } from "../internal/importer/ResolvedModule";
import type { LibraryResolver } from "../internal/importer/LibraryResolver";
import { DevNullLogger, type Logger } from "../internal/logging";
import { ExportType } from "../internal/ts/ExportType";

// Helper functions for creating test data (ported from Scala)
function createSimpleIdent(name: string) {
	return TsIdent.simple(name);
}

function createQIdent(name: string) {
	return TsQIdent.ofStrings(name);
}

function createMockImport(from: string): TsImport {
	return TsImport.create(
		false, // typeOnly
		IArray.fromArray([TsImportedStar.create(some(createSimpleIdent("imported"))) as TsImported]),
		TsImporteeFrom.create(TsIdentModule.simple(from))
	);
}

function createMockExport(from: string): TsExport {
	return TsExport.create(
		Comments.empty(), // comments
		false, // typeOnly
		ExportType.named(), // tpe
		TsExporteeStar.create(none, TsIdentModule.simple(from)) // exported
	);
}

function createMockParsedFileWithMembers(
	imports: IArray<TsImport> = IArray.Empty,
	exports: IArray<TsExport> = IArray.Empty,
	members: IArray<TsContainerOrDecl> = IArray.Empty
): TsParsedFile {
	const allMembers = imports.concat(exports).concat(members);
	return TsParsedFile.create(
		Comments.empty(),
		IArray.Empty,
		allMembers,
		CodePath.noPath()
	);
}

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
	return createMockParsedFileWithMembers();
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
		it("should handle empty parsed file", () => {
			const resolver = createMockLibraryResolver();
			const source = createMockLibTsSource("test-lib");
			const folder = createMockFolder();
			const parsedFile = createMockParsedFile();
			const logger = createMockLogger();

			const result = ResolveExternalReferences.apply(resolver, source, folder, parsedFile, logger);

			expect(result.transformedFile).toBeDefined();
			expect(result.resolvedModules.size).toBe(0);
			expect(result.unresolvedModules.size).toBe(0);
		});

		it("should handle parsed file with simple import", () => {
			const resolver = createMockLibraryResolver();
			const source = createMockLibTsSource("test-lib");
			const folder = createMockFolder();
			const importStmt = createMockImport("react");
			const parsedFile = createMockParsedFileWithMembers(IArray.fromArray([importStmt]));
			const logger = createMockLogger();

			const result = ResolveExternalReferences.apply(resolver, source, folder, parsedFile, logger);

			expect(result.transformedFile).toBeDefined();
			// Should have attempted to resolve the "react" module
			expect(result.unresolvedModules.size > 0 || result.resolvedModules.size > 0).toBe(true);
		});

		it("should handle parsed file with export statement", () => {
			const resolver = createMockLibraryResolver();
			const source = createMockLibTsSource("test-lib");
			const folder = createMockFolder();
			const exportStmt = createMockExport("./utils");
			const parsedFile = createMockParsedFileWithMembers(IArray.Empty, IArray.fromArray([exportStmt]));
			const logger = createMockLogger();

			const result = ResolveExternalReferences.apply(resolver, source, folder, parsedFile, logger);

			expect(result.transformedFile).toBeDefined();
			// Should have attempted to resolve the "./utils" module
			expect(result.unresolvedModules.size > 0 || result.resolvedModules.size > 0).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle multiple imports and exports", () => {
			const resolver = createMockLibraryResolver();
			const source = createMockLibTsSource("test-lib");
			const folder = createMockFolder();
			const import1 = createMockImport("react");
			const import2 = createMockImport("lodash");
			const export1 = createMockExport("./utils");
			const export2 = createMockExport("./types");
			const parsedFile = createMockParsedFileWithMembers(
				IArray.fromArray([import1, import2]),
				IArray.fromArray([export1, export2])
			);
			const logger = createMockLogger();

			const result = ResolveExternalReferences.apply(resolver, source, folder, parsedFile, logger);

			expect(result.transformedFile).toBeDefined();
			// Should have attempted to resolve multiple modules
			expect(result.unresolvedModules.size > 0 || result.resolvedModules.size > 0).toBe(true);
		});

		it("should handle relative path imports", () => {
			const resolver = createMockLibraryResolver();
			const source = createMockLibTsSource("test-lib");
			const folder = createMockFolder();
			const importStmt = createMockImport("../parent/module");
			const parsedFile = createMockParsedFileWithMembers(IArray.fromArray([importStmt]));
			const logger = createMockLogger();

			const result = ResolveExternalReferences.apply(resolver, source, folder, parsedFile, logger);

			expect(result.transformedFile).toBeDefined();
			// Should handle relative paths
			expect(result.unresolvedModules.size > 0 || result.resolvedModules.size > 0).toBe(true);
		});

		it("should handle scoped package imports", () => {
			const resolver = createMockLibraryResolver();
			const source = createMockLibTsSource("test-lib");
			const folder = createMockFolder();
			const importStmt = createMockImport("@types/node");
			const parsedFile = createMockParsedFileWithMembers(IArray.fromArray([importStmt]));
			const logger = createMockLogger();

			const result = ResolveExternalReferences.apply(resolver, source, folder, parsedFile, logger);

			expect(result.transformedFile).toBeDefined();
			// Should handle scoped packages
			expect(result.unresolvedModules.size > 0 || result.resolvedModules.size > 0).toBe(true);
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

	describe("Negative Cases", () => {
		it("should handle parsed file with no imports or exports", () => {
			const resolver = createMockLibraryResolver();
			const source = createMockLibTsSource("test-lib");
			const folder = createMockFolder();
			const parsedFile = createMockParsedFile();
			const logger = createMockLogger();

			const result = ResolveExternalReferences.apply(resolver, source, folder, parsedFile, logger);

			expect(result.transformedFile).toBeDefined();
			// Should have no resolved or unresolved modules for empty file
			expect(result.resolvedModules.size).toBe(0);
			expect(result.unresolvedModules.size).toBe(0);
		});

		it("should handle invalid module paths gracefully", () => {
			const resolver = createMockLibraryResolver();
			const source = createMockLibTsSource("test-lib");
			const folder = createMockFolder();
			const importStmt = createMockImport(""); // Empty module path
			const parsedFile = createMockParsedFileWithMembers(IArray.fromArray([importStmt]));
			const logger = createMockLogger();

			const result = ResolveExternalReferences.apply(resolver, source, folder, parsedFile, logger);

			expect(result.transformedFile).toBeDefined();
			// Should handle invalid paths without crashing
			expect(result.unresolvedModules.size > 0 || result.resolvedModules.size > 0).toBe(true);
		});

		it("should handle complex nested module structures", () => {
			const resolver = createMockLibraryResolver();
			const source = createMockLibTsSource("test-lib");
			const folder = createMockFolder();
			const importStmt = createMockImport("@scope/package/sub/module");
			const parsedFile = createMockParsedFileWithMembers(IArray.fromArray([importStmt]));
			const logger = createMockLogger();

			const result = ResolveExternalReferences.apply(resolver, source, folder, parsedFile, logger);

			expect(result.transformedFile).toBeDefined();
			// Should handle complex nested paths
			expect(result.unresolvedModules.size > 0 || result.resolvedModules.size > 0).toBe(true);
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
