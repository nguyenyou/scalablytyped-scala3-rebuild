/**
 * Unit tests for ProxyModule
 */

import { describe, it, expect, beforeEach } from "vitest";
import { none, some } from "fp-ts/Option";
import { IArray } from "../internal/IArray";
import { Comments } from "../internal/Comments";
import { InFolder } from "../internal/files";
import { TsIdent, TsIdentModule, TsExport } from "../internal/ts/trees";
import { ProxyModule } from "../internal/importer/ProxyModule";
import { LibTsSource } from "../internal/importer/LibTsSource";
import { ResolvedModule, ResolvedModuleNotLocal } from "../internal/importer/ResolvedModule";
import type { LibraryResolver } from "../internal/importer/LibraryResolver";
import type { Logger } from "../internal/logging";

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
	
	class MockLibTsSource extends LibTsSource.FromFolder {
		constructor() {
			super(mockFolder, TsIdent.librarySimple(libName));
		}
	}
	
	return new MockLibTsSource();
}

function createMockLibraryResolver(
	moduleResults: Map<string, ResolvedModule | null> = new Map()
): LibraryResolver {
	return {
		module: (_source: LibTsSource, _folder: InFolder, value: string) => {
			const result = moduleResults.get(value);
			return result ? some(result) : none;
		}
	} as LibraryResolver;
}

describe("ProxyModule", () => {
	let mockLogger: Logger<void>;
	let mockSource: LibTsSource;

	beforeEach(() => {
		mockLogger = createMockLogger();
		mockSource = createMockLibTsSource("test-lib");
	});

	describe("Basic Functionality", () => {
		it("should create a ProxyModule with correct properties", () => {
			const comments = Comments.create("/* test comment */");
			const libName = TsIdent.librarySimple("test-lib");
			const fromModule = TsIdentModule.simple("source-module");
			const toModule = TsIdentModule.simple("target-module");

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);

			expect(proxyModule.comments).toBe(comments);
			expect(proxyModule.libName).toBe(libName);
			expect(proxyModule.fromModule).toBe(fromModule);
			expect(proxyModule.toModule).toBe(toModule);
		});

		it("should generate correct asModule TsDeclModule", () => {
			const comments = Comments.create("/* proxy module */");
			const libName = TsIdent.librarySimple("my-lib");
			const fromModule = TsIdentModule.simple("from");
			const toModule = TsIdentModule.simple("to");

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			expect(asModule._tag).toBe("TsDeclModule");
			expect(asModule.comments).toBe(comments);
			expect(asModule.declared).toBe(false);
			expect(asModule.name).toBe(toModule);
			expect(asModule.members.length).toBe(1);
			
			// Check that the member is a star export
			const exportMember = asModule.members.apply(0);
			expect(exportMember._tag).toBe("TsExport");
			const tsExport = exportMember as TsExport;
			expect(tsExport.exported._tag).toBe("TsExporteeStar");
		});
	});

	describe("fromExports Factory Method", () => {
		it("should create proxy modules from exports map", () => {
			const exports = new Map([
				["api", "./src/api.d.ts"],
				["utils", "./src/utils.d.ts"]
			]);

			const resolvedModule = new ResolvedModuleNotLocal(
				mockSource,
				TsIdentModule.simple("resolved-module")
			);
			const moduleResults = new Map<string, ResolvedModule | null>([
				["./src/api.d.ts", resolvedModule],
				["./src/utils.d.ts", resolvedModule]
			]);
			const mockResolver = createMockLibraryResolver(moduleResults);

			const existing = () => false; // No existing modules

			const proxyModules = ProxyModule.fromExports(
				mockSource,
				mockLogger,
				mockResolver,
				existing,
				exports
			);

			expect(proxyModules).toHaveLength(2);
			expect(proxyModules[0]).toBeInstanceOf(ProxyModule);
			expect(proxyModules[1]).toBeInstanceOf(ProxyModule);
		});

		it("should skip unresolved modules", () => {
			const exports = new Map([
				["api", "./src/api.d.ts"],
				["missing", "./src/missing.d.ts"]
			]);

			const resolvedModule = new ResolvedModuleNotLocal(
				mockSource,
				TsIdentModule.simple("resolved-module")
			);
			const moduleResults = new Map<string, ResolvedModule | null>([
				["./src/api.d.ts", resolvedModule]
				// "./src/missing.d.ts" is intentionally not included
			]);
			const mockResolver = createMockLibraryResolver(moduleResults);

			const existing = () => false;

			const proxyModules = ProxyModule.fromExports(
				mockSource,
				mockLogger,
				mockResolver,
				existing,
				exports
			);

			expect(proxyModules).toHaveLength(1);
			expect(proxyModules[0].fromModule.value).toBe("resolved-module");
		});

		it("should skip existing modules", () => {
			const exports = new Map([
				["api", "./src/api.d.ts"]
			]);

			const resolvedModule = new ResolvedModuleNotLocal(
				mockSource,
				TsIdentModule.simple("resolved-module")
			);
			const moduleResults = new Map<string, ResolvedModule | null>([
				["./src/api.d.ts", resolvedModule]
			]);
			const mockResolver = createMockLibraryResolver(moduleResults);

			const existing = () => true; // All modules already exist

			const proxyModules = ProxyModule.fromExports(
				mockSource,
				mockLogger,
				mockResolver,
				existing,
				exports
			);

			expect(proxyModules).toHaveLength(0);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty exports map", () => {
			const exports = new Map<string, string>();
			const mockResolver = createMockLibraryResolver();
			const existing = () => false;

			const proxyModules = ProxyModule.fromExports(
				mockSource,
				mockLogger,
				mockResolver,
				existing,
				exports
			);

			expect(proxyModules).toHaveLength(0);
		});

		it("should handle complex module paths", () => {
			const comments = Comments.create("/* complex module */");
			const libName = TsIdent.librarySimple("complex-lib");
			const fromModule = TsIdent.module(
				some("scope"),
				["nested", "deep", "module"]
			);
			const toModule = TsIdent.module(
				none,
				["public", "api"]
			);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			expect(asModule.name).toBe(toModule);
			expect(asModule._tag).toBe("TsDeclModule");
		});
	});
});
