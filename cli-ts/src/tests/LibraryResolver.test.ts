/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.LibraryResolverTests
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as O from "fp-ts/Option";
import { describe, expect, test } from "bun:test";
import { InFile, InFolder } from "../internal/files.js";
import { IArray } from "../internal/IArray.js";
import {
	LibraryResolver,
	LibraryResolverRes,
} from "../internal/importer/LibraryResolver.js";
import { LibTsSource } from "../internal/importer/LibTsSource.js";
import {
	ResolvedModuleLocal,
	ResolvedModuleNotLocal,
} from "../internal/importer/ResolvedModule.js";
import { TsIdentLibrary } from "../internal/ts/trees.js";

// Helper functions for test setup and cleanup
function withTempDir<T>(testName: string, test: (tempDir: string) => T): T {
	const tempDir = fs.mkdtempSync(
		path.join(os.tmpdir(), `library-resolver-test-${testName}-`),
	);
	try {
		return test(tempDir);
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
}

function createTestFile(filePath: string, content: string): void {
	const dir = path.dirname(filePath);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(filePath, content, "utf8");
}

function createTestDir(dirPath: string): void {
	fs.mkdirSync(dirPath, { recursive: true });
}

// Test fixtures
function createMockStdLib(tempDir: string): LibTsSource.StdLibSource {
	const stdLibDir = path.join(tempDir, "typescript", "lib");
	createTestDir(stdLibDir);
	createTestFile(
		path.join(stdLibDir, "lib.d.ts"),
		"declare var console: Console;",
	);
	createTestFile(
		path.join(stdLibDir, "lib.es6.d.ts"),
		"interface Promise<T> {}",
	);

	const stdLibFolder = new InFolder(stdLibDir);
	const stdLibFiles = IArray.fromArray([
		new InFile(path.join(stdLibDir, "lib.d.ts")),
		new InFile(path.join(stdLibDir, "lib.es6.d.ts")),
	]);
	return new LibTsSource.StdLibSource(
		stdLibFolder,
		stdLibFiles,
		TsIdentLibrary.construct("std"),
	);
}

function createMockLibrary(
	tempDir: string,
	libName: string,
	hasIndexDts: boolean = true,
): LibTsSource.FromFolder {
	const libDir = path.join(tempDir, "node_modules", libName);
	createTestDir(libDir);

	if (hasIndexDts) {
		createTestFile(
			path.join(libDir, "index.d.ts"),
			`export declare const ${libName}: any;`,
		);
	}
	createTestFile(
		path.join(libDir, "package.json"),
		`{"name": "${libName}", "version": "1.0.0"}`,
	);

	return new LibTsSource.FromFolder(
		new InFolder(libDir),
		TsIdentLibrary.construct(libName),
	);
}

function createMockScopedLibrary(
	tempDir: string,
	scope: string,
	name: string,
): LibTsSource.FromFolder {
	const libDir = path.join(tempDir, "node_modules", `@${scope}`, name);
	createTestDir(libDir);
	createTestFile(
		path.join(libDir, "index.d.ts"),
		`export declare const ${name}: any;`,
	);
	createTestFile(
		path.join(libDir, "package.json"),
		`{"name": "@${scope}/${name}", "version": "1.0.0"}`,
	);

	return new LibTsSource.FromFolder(
		new InFolder(libDir),
		TsIdentLibrary.construct(`@${scope}/${name}`),
	);
}

describe("LibraryResolver", () => {
	describe("Construction", () => {
		test("should initialize with empty sources", () => {
			withTempDir("empty-init", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const allSources = IArray.Empty;
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				expect(resolver.stdLib).toBe(stdLib);

				// Test that std library is available
				const result = resolver.library(TsIdentLibrary.construct("std"));
				expect(result.type).toBe("Found");
				if (result.type === "Found") {
					expect(result.source).toBe(stdLib);
				}
			});
		});

		test("should initialize with multiple sources", () => {
			withTempDir("multi-init", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const lodash = createMockLibrary(tempDir, "lodash");
				const react = createMockLibrary(tempDir, "react");
				const allSources = IArray.fromArray([lodash, react]);
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				// Test that all libraries are available
				const lodashResult = resolver.library(
					TsIdentLibrary.construct("lodash"),
				);
				expect(lodashResult.type).toBe("Found");
				if (lodashResult.type === "Found") {
					expect(lodashResult.source).toBe(lodash);
				}

				const reactResult = resolver.library(TsIdentLibrary.construct("react"));
				expect(reactResult.type).toBe("Found");
				if (reactResult.type === "Found") {
					expect(reactResult.source).toBe(react);
				}
			});
		});

		test("should handle duplicate library names by taking first", () => {
			withTempDir("duplicate-names", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);

				// Create two libraries with same name in different locations
				const lodash1 = createMockLibrary(
					path.join(tempDir, "location1"),
					"lodash",
				);
				const lodash2 = createMockLibrary(
					path.join(tempDir, "location2"),
					"lodash",
				);
				const allSources = IArray.fromArray([lodash1, lodash2]);
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				// Should return the first one
				const result = resolver.library(TsIdentLibrary.construct("lodash"));
				expect(result.type).toBe("Found");
				if (result.type === "Found") {
					expect(result.source).toBe(lodash1);
				}
			});
		});
	});

	describe("Library Resolution", () => {
		test("should find existing simple library", () => {
			withTempDir("find-simple", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const lodash = createMockLibrary(tempDir, "lodash");
				const allSources = IArray.fromArray([lodash]);
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				const result = resolver.library(TsIdentLibrary.construct("lodash"));
				expect(result.type).toBe("Found");
				if (result.type === "Found") {
					expect(result.source).toBe(lodash);
				}
			});
		});

		test("should find existing scoped library", () => {
			withTempDir("find-scoped", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const angular = createMockScopedLibrary(tempDir, "angular", "core");
				const allSources = IArray.fromArray([angular]);
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				const result = resolver.library(
					TsIdentLibrary.construct("@angular/core"),
				);
				expect(result.type).toBe("Found");
				if (result.type === "Found") {
					expect(result.source).toBe(angular);
				}
			});
		});

		test("should return NotAvailable for non-existent library", () => {
			withTempDir("not-found", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const allSources = IArray.Empty;
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				const result = resolver.library(
					TsIdentLibrary.construct("non-existent"),
				);
				expect(result.type).toBe("NotAvailable");
				if (result.type === "NotAvailable") {
					expect(result.name.value).toBe("non-existent");
				}
			});
		});

		test("should return Ignored for ignored library", () => {
			withTempDir("ignored", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const lodash = createMockLibrary(tempDir, "lodash");
				const allSources = IArray.fromArray([lodash]);
				const ignored = new Set([TsIdentLibrary.construct("lodash")]);

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				const result = resolver.library(TsIdentLibrary.construct("lodash"));
				expect(result.type).toBe("Ignored");
				if (result.type === "Ignored") {
					expect(result.name.value).toBe("lodash");
				}
			});
		});

		test("should prioritize ignored status over availability", () => {
			withTempDir("ignored-priority", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const lodash = createMockLibrary(tempDir, "lodash");
				const allSources = IArray.fromArray([lodash]);
				const ignored = new Set([TsIdentLibrary.construct("lodash")]);

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				// Even though lodash exists in allSources, it should be ignored
				const result = resolver.library(TsIdentLibrary.construct("lodash"));
				expect(result.type).toBe("Ignored");
				if (result.type === "Ignored") {
					expect(result.name.value).toBe("lodash");
				}
			});
		});
	});

	describe("Res ADT Behavior", () => {
		test("Found should convert to Some in toOption", () => {
			const found = LibraryResolverRes.Found("test-source");
			const option = LibraryResolverRes.toOption(found);
			expect(O.isSome(option)).toBe(true);
			if (O.isSome(option)) {
				expect(option.value).toBe("test-source");
			}
		});

		test("Ignored should convert to None in toOption", () => {
			const ignored = LibraryResolverRes.Ignored(
				TsIdentLibrary.construct("test"),
			);
			const option = LibraryResolverRes.toOption(ignored);
			expect(O.isNone(option)).toBe(true);
		});

		test("NotAvailable should convert to None in toOption", () => {
			const notAvailable = LibraryResolverRes.NotAvailable(
				TsIdentLibrary.construct("test"),
			);
			const option = LibraryResolverRes.toOption(notAvailable);
			expect(O.isNone(option)).toBe(true);
		});

		test("Found should map correctly", () => {
			const found = LibraryResolverRes.Found("test");
			const mapped = LibraryResolverRes.map((s: string) => s.toUpperCase())(
				found,
			);
			expect(mapped.type).toBe("Found");
			if (mapped.type === "Found") {
				expect(mapped.source).toBe("TEST");
			}
		});

		test("Ignored should preserve type in map", () => {
			const ignored = LibraryResolverRes.Ignored(
				TsIdentLibrary.construct("test"),
			);
			const mapped = LibraryResolverRes.map((s: any) => s.toString())(ignored);
			expect(mapped.type).toBe("Ignored");
			if (mapped.type === "Ignored") {
				expect(mapped.name.value).toBe("test");
			}
		});

		test("NotAvailable should preserve type in map", () => {
			const notAvailable = LibraryResolverRes.NotAvailable(
				TsIdentLibrary.construct("test"),
			);
			const mapped = LibraryResolverRes.map((s: any) => s.toString())(
				notAvailable,
			);
			expect(mapped.type).toBe("NotAvailable");
			if (mapped.type === "NotAvailable") {
				expect(mapped.name.value).toBe("test");
			}
		});
	});

	describe("Module Resolution", () => {
		test("should resolve local path modules", () => {
			withTempDir("local-modules", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const lodash = createMockLibrary(tempDir, "lodash");
				const allSources = IArray.fromArray([lodash]);
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				// Create a local file to resolve
				const sourceFolder = new InFolder(path.join(tempDir, "src"));
				createTestDir(sourceFolder.path);
				createTestFile(
					path.join(sourceFolder.path, "utils.ts"),
					"export const util = 'test';",
				);

				const result = resolver.module(lodash, sourceFolder, "./utils");
				expect(O.isSome(result)).toBe(true);
				if (O.isSome(result)) {
					expect(result.value).toBeInstanceOf(ResolvedModuleLocal);
					const local = result.value as ResolvedModuleLocal;
					expect(local.inFile.path.endsWith("utils.ts")).toBe(true);
					expect(local.moduleName.fragments.length).toBeGreaterThan(0);
				}
			});
		});

		test("should resolve global reference modules", () => {
			withTempDir("global-modules", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const lodash = createMockLibrary(tempDir, "lodash");
				const react = createMockLibrary(tempDir, "react");
				const allSources = IArray.fromArray([lodash, react]);
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				const sourceFolder = new InFolder(path.join(tempDir, "src"));
				createTestDir(sourceFolder.path);

				const result = resolver.module(lodash, sourceFolder, "react");
				expect(O.isSome(result)).toBe(true);
				if (O.isSome(result)) {
					expect(result.value).toBeInstanceOf(ResolvedModuleNotLocal);
					const notLocal = result.value as ResolvedModuleNotLocal;
					expect(notLocal.source).toBe(react);
					expect(notLocal.moduleName.value).toBe("react");
				}
			});
		});

		test("should return None for ignored global modules", () => {
			withTempDir("ignored-global", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const lodash = createMockLibrary(tempDir, "lodash");
				const react = createMockLibrary(tempDir, "react");
				const allSources = IArray.fromArray([lodash, react]);
				const ignored = new Set([TsIdentLibrary.construct("react")]);

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				const sourceFolder = new InFolder(path.join(tempDir, "src"));
				createTestDir(sourceFolder.path);

				const result = resolver.module(lodash, sourceFolder, "react");
				expect(O.isNone(result)).toBe(true);
			});
		});

		test("should return None for non-available global modules", () => {
			withTempDir("unavailable-global", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const lodash = createMockLibrary(tempDir, "lodash");
				const allSources = IArray.fromArray([lodash]);
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				const sourceFolder = new InFolder(path.join(tempDir, "src"));
				createTestDir(sourceFolder.path);

				const result = resolver.module(lodash, sourceFolder, "non-existent");
				expect(O.isNone(result)).toBe(true);
			});
		});

		test("should return None for non-existent local files", () => {
			withTempDir("missing-local", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const lodash = createMockLibrary(tempDir, "lodash");
				const allSources = IArray.fromArray([lodash]);
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				const sourceFolder = new InFolder(path.join(tempDir, "src"));
				createTestDir(sourceFolder.path);

				const result = resolver.module(lodash, sourceFolder, "./non-existent");
				expect(O.isNone(result)).toBe(true);
			});
		});
	});

	describe("File Resolution", () => {
		test("should find exact file match", () => {
			withTempDir("exact-file", (tempDir) => {
				const folder = new InFolder(tempDir);
				createTestFile(
					path.join(tempDir, "test.ts"),
					"export const test = 'value';",
				);

				const result = LibraryResolver.file(folder, "test.ts");
				expect(O.isSome(result)).toBe(true);
				if (O.isSome(result)) {
					expect(result.value.path.endsWith("test.ts")).toBe(true);
				}
			});
		});

		test("should find file with .ts extension added", () => {
			withTempDir("ts-extension", (tempDir) => {
				const folder = new InFolder(tempDir);
				createTestFile(
					path.join(tempDir, "test.ts"),
					"export const test = 'value';",
				);

				const result = LibraryResolver.file(folder, "test");
				expect(O.isSome(result)).toBe(true);
				if (O.isSome(result)) {
					expect(result.value.path.endsWith("test.ts")).toBe(true);
				}
			});
		});

		test("should find file with .d.ts extension added", () => {
			withTempDir("dts-extension", (tempDir) => {
				const folder = new InFolder(tempDir);
				createTestFile(
					path.join(tempDir, "test.d.ts"),
					"declare const test: string;",
				);

				const result = LibraryResolver.file(folder, "test");
				expect(O.isSome(result)).toBe(true);
				if (O.isSome(result)) {
					expect(result.value.path.endsWith("test.d.ts")).toBe(true);
				}
			});
		});

		test("should find index.d.ts in subdirectory", () => {
			withTempDir("index-subdir", (tempDir) => {
				const folder = new InFolder(tempDir);
				createTestDir(path.join(tempDir, "test"));
				createTestFile(
					path.join(tempDir, "test", "index.d.ts"),
					"declare const test: string;",
				);

				const result = LibraryResolver.file(folder, "test");
				expect(O.isSome(result)).toBe(true);
				if (O.isSome(result)) {
					expect(result.value.path.endsWith("test/index.d.ts")).toBe(true);
				}
			});
		});

		test("should return None for non-existent file", () => {
			withTempDir("non-existent", (tempDir) => {
				const folder = new InFolder(tempDir);

				const result = LibraryResolver.file(folder, "non-existent");
				expect(O.isNone(result)).toBe(true);
			});
		});

		test("should prioritize exact match over extensions", () => {
			withTempDir("priority", (tempDir) => {
				const folder = new InFolder(tempDir);
				createTestFile(path.join(tempDir, "test"), "exact match");
				createTestFile(path.join(tempDir, "test.ts"), "with .ts extension");
				createTestFile(path.join(tempDir, "test.d.ts"), "with .d.ts extension");

				const result = LibraryResolver.file(folder, "test");
				expect(O.isSome(result)).toBe(true);
				if (O.isSome(result)) {
					expect(result.value.path.endsWith("/test")).toBe(true);
					expect(!result.value.path.endsWith(".ts")).toBe(true);
				}
			});
		});

		test("should handle relative paths with leading slash", () => {
			withTempDir("leading-slash", (tempDir) => {
				const folder = new InFolder(tempDir);
				createTestFile(
					path.join(tempDir, "test.ts"),
					"export const test = 'value';",
				);

				const result = LibraryResolver.file(folder, "/test");
				expect(O.isSome(result)).toBe(true);
				if (O.isSome(result)) {
					expect(result.value.path.endsWith("test.ts")).toBe(true);
				}
			});
		});
	});

	describe("Module Name Generation", () => {
		test("should generate module names for simple library", () => {
			withTempDir("simple-module-names", (tempDir) => {
				const libDir = path.join(tempDir, "node_modules", "lodash");
				createTestDir(libDir);
				createTestFile(
					path.join(libDir, "index.d.ts"),
					"export declare const _: any;",
				);
				createTestFile(
					path.join(libDir, "utils.d.ts"),
					"export declare const utils: any;",
				);

				const source = new LibTsSource.FromFolder(
					new InFolder(libDir),
					TsIdentLibrary.construct("lodash"),
				);
				const file = new InFile(path.join(libDir, "utils.d.ts"));

				const moduleNames = LibraryResolver.moduleNameFor(source, file);
				expect(moduleNames.length).toBeGreaterThan(0);

				const longName = moduleNames.apply(moduleNames.length - 1);
				expect(longName.fragments.includes("lodash")).toBe(true);
				expect(longName.fragments.includes("utils")).toBe(true);
			});
		});

		test("should generate module names for scoped library", () => {
			withTempDir("scoped-module-names", (tempDir) => {
				const libDir = path.join(tempDir, "node_modules", "@angular", "core");
				createTestDir(libDir);
				createTestFile(
					path.join(libDir, "index.d.ts"),
					"export declare const core: any;",
				);
				createTestFile(
					path.join(libDir, "testing.d.ts"),
					"export declare const testing: any;",
				);

				const source = new LibTsSource.FromFolder(
					new InFolder(libDir),
					TsIdentLibrary.construct("@angular/core"),
				);
				const file = new InFile(path.join(libDir, "testing.d.ts"));

				const moduleNames = LibraryResolver.moduleNameFor(source, file);
				expect(moduleNames.length).toBeGreaterThan(0);

				const longName = moduleNames.apply(moduleNames.length - 1);
				// For scoped libraries, the scope and name are handled separately
				expect(O.isSome(longName.scopeOpt) && longName.scopeOpt.value).toBe(
					"angular",
				);
				expect(longName.fragments.includes("core")).toBe(true);
				expect(longName.fragments.includes("testing")).toBe(true);
			});
		});

		test("should handle lib/es parallel directory mapping", () => {
			withTempDir("parallel-dirs", (tempDir) => {
				const libDir = path.join(tempDir, "node_modules", "antd");
				createTestDir(libDir);
				createTestFile(
					path.join(libDir, "lib", "button.d.ts"),
					"export declare const Button: any;",
				);

				const source = new LibTsSource.FromFolder(
					new InFolder(libDir),
					TsIdentLibrary.construct("antd"),
				);
				const file = new InFile(path.join(libDir, "lib", "button.d.ts"));

				const moduleNames = LibraryResolver.moduleNameFor(source, file);

				// Should generate both lib and es versions
				const hasLibVersion = moduleNames
					.toArray()
					.some((m) => m.fragments.includes("lib"));
				const hasEsVersion = moduleNames
					.toArray()
					.some((m) => m.fragments.includes("es"));

				expect(hasLibVersion).toBe(true);
				expect(hasEsVersion).toBe(true);
			});
		});
	});

	describe("Edge Cases and Error Handling", () => {
		test("should handle empty library name", () => {
			withTempDir("empty-name", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const allSources = IArray.Empty;
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				const result = resolver.library(TsIdentLibrary.construct(""));
				expect(result.type).toBe("NotAvailable");
				if (result.type === "NotAvailable") {
					expect(result.name.value).toBe("");
				}
			});
		});

		test("should handle special characters in library names", () => {
			withTempDir("special-chars", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const specialLib = createMockLibrary(
					tempDir,
					"lib-with-dashes_and_underscores",
				);
				const allSources = IArray.fromArray([specialLib]);
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				const result = resolver.library(
					TsIdentLibrary.construct("lib-with-dashes_and_underscores"),
				);
				expect(result.type).toBe("Found");
				if (result.type === "Found") {
					expect(result.source).toBe(specialLib);
				}
			});
		});

		test("should handle case sensitivity", () => {
			withTempDir("case-sensitivity", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const lodash = createMockLibrary(tempDir, "lodash");
				const allSources = IArray.fromArray([lodash]);
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				// Different case should not match
				const result = resolver.library(TsIdentLibrary.construct("LODASH"));
				expect(result.type).toBe("NotAvailable");
				if (result.type === "NotAvailable") {
					expect(result.name.value).toBe("LODASH");
				}
			});
		});

		test("should handle malformed scoped library names", () => {
			withTempDir("malformed-scoped", (tempDir) => {
				const stdLib = createMockStdLib(tempDir);
				const allSources = IArray.Empty;
				const ignored = new Set<TsIdentLibrary>();

				const resolver = new LibraryResolver(stdLib, allSources, ignored);

				// Test various malformed scoped names
				const malformedNames = [
					"@",
					"@scope",
					"@scope/",
					"@/name",
					"@@scope/name",
				];

				malformedNames.forEach((name) => {
					const result = resolver.library(TsIdentLibrary.construct(name));
					expect(result.type).toBe("NotAvailable");
				});
			});
		});
	});
});
