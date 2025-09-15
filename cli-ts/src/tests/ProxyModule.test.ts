/**
 * Unit tests for ProxyModule
 * Port of ProxyModuleTests.scala with comprehensive test coverage
 */

import { describe, it, expect, beforeEach } from "vitest";
import { none, some } from "fp-ts/Option";
import { IArray } from "@/internal/IArray";
import { Comments } from "@/internal/Comments";
import { InFolder } from "@/internal/files";
import { ExportType } from "@/internal/ts/ExportType";
import { JsLocation } from "@/internal/ts/JsLocation";
import {
	TsIdent,
	TsIdentModule,
	TsExport,
	TsExporteeStar,
	type TsIdentLibrary,
	type TsIdentLibrarySimple,
	type TsIdentLibraryScoped
} from "@/internal/ts/trees";
import { ProxyModule } from "@/internal/importer/ProxyModule";
import { LibTsSource } from "@/internal/importer/LibTsSource";
import { ResolvedModule, ResolvedModuleNotLocal } from "@/internal/importer/ResolvedModule";
import type { LibraryResolver } from "@/internal/importer/LibraryResolver";
import type { Logger } from "@/internal/logging";

// Helper methods for creating test data (matching Scala test structure)
function createMockLibrarySimple(name: string): TsIdentLibrarySimple {
	return TsIdent.librarySimple(name);
}

function createMockLibraryScoped(scope: string, name: string): TsIdentLibraryScoped {
	return TsIdent.libraryScoped(scope, name);
}

function createMockModuleIdent(name: string): TsIdentModule {
	return TsIdent.module(none, [name]);
}

function createMockScopedModuleIdent(scope: string, name: string): TsIdentModule {
	return TsIdent.module(some(scope), [name]);
}

function createMockLibTsSource(libName: TsIdentLibrary): LibTsSource {
	const mockFolder = { path: "/mock/path" } as InFolder;

	class MockLibTsSource extends LibTsSource.FromFolder {
		constructor() {
			super(mockFolder, libName);
		}
	}

	return new MockLibTsSource();
}

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

function createMockResolvedModule(moduleName: TsIdentModule): ResolvedModuleNotLocal {
	const source = createMockLibTsSource(createMockLibrarySimple("test-lib"));
	return new ResolvedModuleNotLocal(source, moduleName);
}

describe("ProxyModule", () => {
	describe("Basic Functionality", () => {
		it("should create ProxyModule with correct properties", () => {
			const comments = Comments.create("/* test comment */");
			const libName = createMockLibrarySimple("test-lib");
			const fromModule = createMockModuleIdent("source-module");
			const toModule = createMockModuleIdent("target-module");

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);

			// Verify basic properties
			expect(proxyModule.comments).toBe(comments);
			expect(proxyModule.libName).toBe(libName);
			expect(proxyModule.fromModule).toBe(fromModule);
			expect(proxyModule.toModule).toBe(toModule);
		});

		it("should generate correct asModule TsDeclModule", () => {
			const comments = Comments.create("/* proxy module */");
			const libName = createMockLibrarySimple("my-lib");
			const fromModule = createMockModuleIdent("from");
			const toModule = createMockModuleIdent("to");

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Verify TsDeclModule properties
			expect(asModule.comments).toBe(comments);
			expect(asModule.declared).toBe(false);
			expect(asModule.name).toBe(toModule);
			expect(asModule.members.length).toBe(1);
			expect(asModule.jsLocation).toEqual(JsLocation.zero());

			// Verify the export member
			const exportMember = asModule.members.apply(0) as TsExport;
			expect(exportMember.comments).toEqual(Comments.empty());
			expect(exportMember.typeOnly).toBe(false);
			expect(exportMember.tpe).toEqual(ExportType.named());

			const exportee = exportMember.exported as TsExporteeStar;
			expect(exportee.as).toEqual(none);
			expect(exportee.from).toBe(fromModule);
		});

		it("should handle scoped library names", () => {
			const comments = Comments.empty();
			const libName = createMockLibraryScoped("types", "node");
			const fromModule = createMockScopedModuleIdent("types", "node");
			const toModule = createMockModuleIdent("index");

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);

			// Verify scoped library handling
			expect(proxyModule.libName._tag).toBe("TsIdentLibraryScoped");
			expect(proxyModule.fromModule.scopeOpt).toEqual(some("types"));
			expect(proxyModule.toModule.scopeOpt).toEqual(none);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty comments", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("empty-lib");
			const fromModule = createMockModuleIdent("src");
			const toModule = createMockModuleIdent("dist");

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Verify empty comments are preserved
			expect(asModule.comments).toEqual(Comments.empty());
			expect(asModule.members.length).toBe(1);
		});

		it("should handle complex module paths", () => {
			const comments = Comments.create("/* complex module */");
			const libName = createMockLibrarySimple("complex-lib");
			const fromModule = TsIdent.module(some("scope"), ["nested", "deep", "module"]);
			const toModule = TsIdent.module(none, ["public", "api"]);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Verify complex paths are handled correctly
			expect(asModule.name).toBe(toModule);
			const exportMember = asModule.members.apply(0) as TsExport;
			const exportee = exportMember.exported as TsExporteeStar;
			expect(exportee.from).toBe(fromModule);
		});
	});

	describe("Negative Cases", () => {
		it("should handle identical from and to modules", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("same-lib");
			const moduleIdent = createMockModuleIdent("same-module");

			const proxyModule = new ProxyModule(comments, libName, moduleIdent, moduleIdent);

			// Verify it still creates valid proxy even with same modules
			expect(proxyModule.fromModule).toBe(proxyModule.toModule);
			const asModule = proxyModule.asModule;
			expect(asModule.name).toBe(moduleIdent);
		});

		it("should handle very long module names", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("very-long-library-name-with-many-segments");
			const fromModule = TsIdent.module(none, ["very", "long", "nested", "module", "path", "with", "many", "segments"]);
			const toModule = TsIdent.module(none, ["another", "very", "long", "module", "path"]);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Verify long names are handled correctly
			expect(asModule.name).toBe(toModule);
			expect(asModule.members.length).toBe(1);
		});

		it("should handle special characters in module names", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("special-chars");
			const fromModule = TsIdent.module(none, ["module-with-dashes"]);
			const toModule = TsIdent.module(none, ["module_with_underscores"]);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);

			// Verify special characters are preserved
			expect(proxyModule.fromModule.fragments[0]).toBe("module-with-dashes");
			expect(proxyModule.toModule.fragments[0]).toBe("module_with_underscores");
		});
	});

	describe("Negative Cases", () => {
		it("should handle identical from and to modules", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("same-lib");
			const moduleIdent = createMockModuleIdent("same-module");

			const proxyModule = new ProxyModule(comments, libName, moduleIdent, moduleIdent);

			// Verify it still creates valid proxy even with same modules
			expect(proxyModule.fromModule).toBe(proxyModule.toModule);
			const asModule = proxyModule.asModule;
			expect(asModule.name).toBe(moduleIdent);
		});

		it("should handle very long module names", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("very-long-library-name-with-many-segments");
			const fromModule = TsIdent.module(none, ["very", "long", "nested", "module", "path", "with", "many", "segments"]);
			const toModule = TsIdent.module(none, ["another", "very", "long", "module", "path"]);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Verify long names are handled correctly
			expect(asModule.name).toBe(toModule);
			expect(asModule.members.length).toBe(1);
		});

		it("should handle special characters in module names", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("special-chars");
			const fromModule = TsIdent.module(none, ["module-with-dashes"]);
			const toModule = TsIdent.module(none, ["module_with_underscores"]);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);

			// Verify special characters are preserved
			expect(proxyModule.fromModule.fragments[0]).toBe("module-with-dashes");
			expect(proxyModule.toModule.fragments[0]).toBe("module_with_underscores");
		});
	});

	describe("Container Handling", () => {
		it("should handle CodePath generation correctly", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("path-lib");
			const fromModule = createMockModuleIdent("source");
			const toModule = createMockModuleIdent("target");

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Verify CodePath is generated correctly
			expect(asModule.codePath._tag).toBe("HasPath");
			const hasPath = asModule.codePath as any;
			expect(hasPath.inLibrary).toBe(libName);
		});

		it("should handle JsLocation correctly", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("location-lib");
			const fromModule = createMockModuleIdent("from");
			const toModule = createMockModuleIdent("to");

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Verify JsLocation is set to Zero
			expect(asModule.jsLocation).toEqual(JsLocation.zero());
		});
	});

	describe("Advanced Scenarios", () => {
		it("should handle multiple scoped modules", () => {
			const comments = Comments.create("/* multi-scope test */");
			const libName = createMockLibraryScoped("babel", "core");
			const fromModule = TsIdent.module(some("babel"), ["parser", "types"]);
			const toModule = TsIdent.module(some("babel"), ["core", "api"]);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Verify both modules have scopes
			expect(proxyModule.fromModule.scopeOpt).toEqual(some("babel"));
			expect(proxyModule.toModule.scopeOpt).toEqual(some("babel"));
			expect(asModule.name).toBe(toModule);
		});

		it("should handle mixed scope scenarios", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("mixed-lib");
			const fromModule = TsIdent.module(some("scoped"), ["module"]);
			const toModule = TsIdent.module(none, ["unscoped", "module"]);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);

			// Verify mixed scoping
			expect(proxyModule.fromModule.scopeOpt).toEqual(some("scoped"));
			expect(proxyModule.toModule.scopeOpt).toEqual(none);
		});

		it("should handle deeply nested module paths", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("deep-lib");
			const fromModule = TsIdent.module(none, ["level1", "level2", "level3", "level4", "level5"]);
			const toModule = TsIdent.module(none, ["api", "v1", "public"]);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Verify deep nesting is preserved
			expect(proxyModule.fromModule.fragments.length).toBe(5);
			expect(proxyModule.toModule.fragments.length).toBe(3);
			expect(asModule.name).toBe(toModule);
		});

		it("should handle empty module fragments", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("empty-fragments");
			const fromModule = TsIdent.module(none, []);
			const toModule = TsIdent.module(none, []);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);

			// Verify empty fragments are handled
			expect(proxyModule.fromModule.fragments.length).toBe(0);
			expect(proxyModule.toModule.fragments.length).toBe(0);
		});

		it("should handle complex comments", () => {
			const complexComment = "/* Multi-line\n * comment with\n * special chars: @#$%^&*() */";
			const comments = Comments.create(complexComment);
			const libName = createMockLibrarySimple("comment-lib");
			const fromModule = createMockModuleIdent("source");
			const toModule = createMockModuleIdent("target");

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Verify complex comments are preserved
			expect(asModule.comments).toBe(comments);
		});
	});

	describe("Comprehensive Integration", () => {
		it("should create valid TsDeclModule with all properties", () => {
			const comments = Comments.create("/* integration test */");
			const libName = createMockLibraryScoped("integration", "test");
			const fromModule = TsIdent.module(some("integration"), ["internal", "module"]);
			const toModule = TsIdent.module(some("integration"), ["public", "api"]);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);
			const asModule = proxyModule.asModule;

			// Comprehensive verification of TsDeclModule properties
			expect(asModule.comments).toBe(comments);
			expect(asModule.declared).toBe(false);
			expect(asModule.name).toBe(toModule);
			expect(asModule.members.length).toBe(1);
			expect(asModule.codePath._tag).toBe("HasPath");
			expect(asModule.jsLocation).toEqual(JsLocation.zero());

			// Verify the export member
			const exportMember = asModule.members.apply(0) as TsExport;
			expect(exportMember.comments).toEqual(Comments.empty());
			expect(exportMember.typeOnly).toBe(false);
			expect(exportMember.tpe).toEqual(ExportType.named());

			// Verify the exportee
			const exportee = exportMember.exported as TsExporteeStar;
			expect(exportee.as).toEqual(none);
			expect(exportee.from).toBe(fromModule);
		});

		it("should maintain referential integrity", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("integrity-lib");
			const fromModule = createMockModuleIdent("from");
			const toModule = createMockModuleIdent("to");

			const proxyModule1 = new ProxyModule(comments, libName, fromModule, toModule);
			const proxyModule2 = new ProxyModule(comments, libName, fromModule, toModule);

			// Verify different instances with same parameters are equal in behavior
			expect(proxyModule1.comments).toBe(proxyModule2.comments);
			expect(proxyModule1.libName).toBe(proxyModule2.libName);
			expect(proxyModule1.fromModule).toBe(proxyModule2.fromModule);
			expect(proxyModule1.toModule).toBe(proxyModule2.toModule);
		});

		it("should handle edge case with single character names", () => {
			const comments = Comments.empty();
			const libName = createMockLibrarySimple("x");
			const fromModule = TsIdent.module(none, ["a"]);
			const toModule = TsIdent.module(none, ["b"]);

			const proxyModule = new ProxyModule(comments, libName, fromModule, toModule);

			// Verify single character names work
			expect(proxyModule.fromModule.fragments[0]).toBe("a");
			expect(proxyModule.toModule.fragments[0]).toBe("b");
		});
	});
});
