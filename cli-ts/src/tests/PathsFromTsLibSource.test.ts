import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { InFile, InFolder } from "@/internal/files";
import { PathsFromTsLibSource } from "@/internal/importer/PathsFromTsLibSource";

describe("PathsFromTsLibSource Tests", () => {
	// Helper methods for test setup and cleanup
	function withTempDir<T>(testName: string, test: (tempDir: string) => T): T {
		const tempDir = fs.mkdtempSync(
			path.join(os.tmpdir(), `paths-from-ts-lib-source-test-${testName}-`),
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

	describe("filesFrom method", () => {
		test("should return empty array for empty directory", () => {
			withTempDir("empty", (tempDir) => {
				const emptyDir = path.join(tempDir, "empty");
				createTestDir(emptyDir);

				const folder = new InFolder(emptyDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.isEmpty).toBe(true);
				expect(result.length).toBe(0);
			});
		});

		test("should find .d.ts files in root directory", () => {
			withTempDir("root-dts", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const test: string;",
				);
				createTestFile(
					path.join(tempDir, "types.d.ts"),
					"export interface TestInterface {}",
				);
				createTestFile(
					path.join(tempDir, "utils.d.ts"),
					"export declare function util(): void;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(3);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.every((p) => p.endsWith(".d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("index.d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("types.d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("utils.d.ts"))).toBe(true);
			});
		});

		test("should find .d.ts files in subdirectories", () => {
			withTempDir("subdirs", (tempDir) => {
				createTestFile(
					path.join(tempDir, "src", "index.d.ts"),
					"export declare const main: string;",
				);
				createTestFile(
					path.join(tempDir, "lib", "utils.d.ts"),
					"export declare function helper(): void;",
				);
				createTestFile(
					path.join(tempDir, "types", "interfaces.d.ts"),
					"export interface Config {}",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(3);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.every((p) => p.endsWith(".d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.includes("src"))).toBe(true);
				expect(filePaths.some((p) => p.includes("lib"))).toBe(true);
				expect(filePaths.some((p) => p.includes("types"))).toBe(true);
			});
		});

		test("should ignore non-.d.ts files", () => {
			withTempDir("mixed-files", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const test: string;",
				);
				createTestFile(
					path.join(tempDir, "index.ts"),
					"export const test = 'value';",
				);
				createTestFile(
					path.join(tempDir, "index.js"),
					"export const test = 'value';",
				);
				createTestFile(path.join(tempDir, "README.md"), "# Test Library");
				createTestFile(path.join(tempDir, "package.json"), '{"name": "test"}');

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(1);
				expect(result.apply(0).path.endsWith("index.d.ts")).toBe(true);
			});
		});

		test("should skip node_modules directories", () => {
			withTempDir("node-modules", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const main: string;",
				);
				createTestFile(
					path.join(tempDir, "node_modules", "lodash", "index.d.ts"),
					"export declare const _: any;",
				);
				createTestFile(
					path.join(tempDir, "node_modules", "react", "index.d.ts"),
					"export declare const React: any;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(1);
				expect(result.apply(0).path.endsWith("index.d.ts")).toBe(true);
				expect(result.apply(0).path.includes("node_modules")).toBe(false);
			});
		});

		test("should skip amd directories", () => {
			withTempDir("amd", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const main: string;",
				);
				createTestFile(
					path.join(tempDir, "amd", "module.d.ts"),
					"declare module 'amd-module' {}",
				);
				createTestFile(
					path.join(tempDir, "normal", "file.d.ts"),
					"export declare const normal: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				// Should find files in root and normal directory, but not in amd directory
				expect(result.length).toBe(2);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.some((p) => p.endsWith("index.d.ts"))).toBe(true);
				expect(
					filePaths.some(
						(p) =>
							p.endsWith("normal/file.d.ts") || p.endsWith("normal\\file.d.ts"),
					),
				).toBe(true);
				expect(
					filePaths.some((p) => p.includes("/amd/") || p.includes("\\amd\\")),
				).toBe(false);
			});
		});

		test("should skip umd directories", () => {
			withTempDir("umd", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const main: string;",
				);
				createTestFile(
					path.join(tempDir, "umd", "module.d.ts"),
					"declare module 'umd-module' {}",
				);
				createTestFile(
					path.join(tempDir, "normal", "file.d.ts"),
					"export declare const normal: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				// Should find files in root and normal directory, but not in umd directory
				expect(result.length).toBe(2);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.some((p) => p.endsWith("index.d.ts"))).toBe(true);
				expect(
					filePaths.some(
						(p) =>
							p.endsWith("normal/file.d.ts") || p.endsWith("normal\\file.d.ts"),
					),
				).toBe(true);
				expect(
					filePaths.some((p) => p.includes("/umd/") || p.includes("\\umd\\")),
				).toBe(false);
			});
		});

		test("should skip es directories", () => {
			withTempDir("es", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const main: string;",
				);
				createTestFile(
					path.join(tempDir, "es", "module.d.ts"),
					"declare module 'es-module' {}",
				);
				createTestFile(
					path.join(tempDir, "normal", "file.d.ts"),
					"export declare const normal: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				// Should find files in root and normal directory, but not in es directory
				expect(result.length).toBe(2);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.some((p) => p.endsWith("index.d.ts"))).toBe(true);
				expect(
					filePaths.some(
						(p) =>
							p.endsWith("normal/file.d.ts") || p.endsWith("normal\\file.d.ts"),
					),
				).toBe(true);
				expect(
					filePaths.some((p) => p.includes("/es/") || p.includes("\\es\\")),
				).toBe(false);
			});
		});

		test("should skip es6 directories", () => {
			withTempDir("es6", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const main: string;",
				);
				createTestFile(
					path.join(tempDir, "es6", "module.d.ts"),
					"declare module 'es6-module' {}",
				);
				createTestFile(
					path.join(tempDir, "normal", "file.d.ts"),
					"export declare const normal: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				// Should find files in root and normal directory, but not in es6 directory
				expect(result.length).toBe(2);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.some((p) => p.endsWith("index.d.ts"))).toBe(true);
				expect(
					filePaths.some(
						(p) =>
							p.endsWith("normal/file.d.ts") || p.endsWith("normal\\file.d.ts"),
					),
				).toBe(true);
				expect(
					filePaths.some((p) => p.includes("/es6/") || p.includes("\\es6\\")),
				).toBe(false);
			});
		});
		test("should skip TypeScript version directories (ts pattern)", () => {
			withTempDir("ts-version", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const main: string;",
				);
				createTestFile(
					path.join(tempDir, "ts3.8", "module.d.ts"),
					"declare module 'ts38-module' {}",
				);
				createTestFile(
					path.join(tempDir, "ts4.0", "module.d.ts"),
					"declare module 'ts40-module' {}",
				);
				createTestFile(
					path.join(tempDir, "ts4.5.2", "module.d.ts"),
					"declare module 'ts452-module' {}",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(1);
				expect(result.apply(0).path.endsWith("index.d.ts")).toBe(true);
				expect(result.apply(0).path.includes("ts3.8")).toBe(false);
				expect(result.apply(0).path.includes("ts4.0")).toBe(false);
				expect(result.apply(0).path.includes("ts4.5.2")).toBe(false);
			});
		});

		test("should skip version directories (v pattern)", () => {
			withTempDir("version", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const main: string;",
				);
				createTestFile(
					path.join(tempDir, "v1.0", "module.d.ts"),
					"declare module 'v1-module' {}",
				);
				createTestFile(
					path.join(tempDir, "v2.5.1", "module.d.ts"),
					"declare module 'v2-module' {}",
				);
				createTestFile(
					path.join(tempDir, "v10.15.3", "module.d.ts"),
					"declare module 'v10-module' {}",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(1);
				expect(result.apply(0).path.endsWith("index.d.ts")).toBe(true);
				expect(result.apply(0).path.includes("v1.0")).toBe(false);
				expect(result.apply(0).path.includes("v2.5.1")).toBe(false);
				expect(result.apply(0).path.includes("v10.15.3")).toBe(false);
			});
		});

		test("should filter out .src. files", () => {
			withTempDir("src-files", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const main: string;",
				);
				createTestFile(
					path.join(tempDir, "highlight.src.d.ts"),
					"declare module 'highlight-src' {}",
				);
				createTestFile(
					path.join(tempDir, "utils.src.d.ts"),
					"declare module 'utils-src' {}",
				);
				createTestFile(
					path.join(tempDir, "normal.d.ts"),
					"export declare const normal: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(2);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.every((p) => p.endsWith(".d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("index.d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("normal.d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.includes(".src."))).toBe(false);
			});
		});

		test("should handle complex directory structure with multiple skip patterns", () => {
			withTempDir("complex", (tempDir) => {
				// Valid files
				createTestFile(
					path.join(tempDir, "index.d.ts"),
					"export declare const main: string;",
				);
				createTestFile(
					path.join(tempDir, "src", "types.d.ts"),
					"export interface Config {}",
				);
				createTestFile(
					path.join(tempDir, "lib", "utils.d.ts"),
					"export declare function helper(): void;",
				);

				// Files that should be skipped
				createTestFile(
					path.join(tempDir, "node_modules", "lodash", "index.d.ts"),
					"export declare const _: any;",
				);
				createTestFile(
					path.join(tempDir, "amd", "module.d.ts"),
					"declare module 'amd-module' {}",
				);
				createTestFile(
					path.join(tempDir, "umd", "module.d.ts"),
					"declare module 'umd-module' {}",
				);
				createTestFile(
					path.join(tempDir, "es", "module.d.ts"),
					"declare module 'es-module' {}",
				);
				createTestFile(
					path.join(tempDir, "es6", "module.d.ts"),
					"declare module 'es6-module' {}",
				);
				createTestFile(
					path.join(tempDir, "ts4.0", "module.d.ts"),
					"declare module 'ts40-module' {}",
				);
				createTestFile(
					path.join(tempDir, "v2.0", "module.d.ts"),
					"declare module 'v2-module' {}",
				);
				createTestFile(
					path.join(tempDir, "highlight.src.d.ts"),
					"declare module 'highlight-src' {}",
				);

				// Non-.d.ts files
				createTestFile(
					path.join(tempDir, "index.ts"),
					"export const test = 'value';",
				);
				createTestFile(path.join(tempDir, "package.json"), '{"name": "test"}');

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(3);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.every((p) => p.endsWith(".d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("index.d.ts"))).toBe(true);
				expect(
					filePaths.some((p) => p.includes("src") && p.endsWith("types.d.ts")),
				).toBe(true);
				expect(
					filePaths.some((p) => p.includes("lib") && p.endsWith("utils.d.ts")),
				).toBe(true);

				// Verify none of the skipped patterns are included
				expect(filePaths.some((p) => p.includes("node_modules"))).toBe(false);
				expect(
					filePaths.some((p) => p.includes("/amd/") || p.includes("\\amd\\")),
				).toBe(false);
				expect(
					filePaths.some((p) => p.includes("/umd/") || p.includes("\\umd\\")),
				).toBe(false);
				expect(
					filePaths.some((p) => p.includes("/es/") || p.includes("\\es\\")),
				).toBe(false);
				expect(
					filePaths.some((p) => p.includes("/es6/") || p.includes("\\es6\\")),
				).toBe(false);
				expect(
					filePaths.some(
						(p) => p.includes("/ts4.0/") || p.includes("\\ts4.0\\"),
					),
				).toBe(false);
				expect(
					filePaths.some((p) => p.includes("/v2.0/") || p.includes("\\v2.0\\")),
				).toBe(false);
				expect(filePaths.some((p) => p.includes(".src."))).toBe(false);
			});
		});

		test("should return InFile instances with correct paths", () => {
			withTempDir("infile-paths", (tempDir) => {
				createTestFile(
					path.join(tempDir, "test.d.ts"),
					"export declare const test: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(1);

				const inFile = result.apply(0);
				expect(inFile).toBeInstanceOf(InFile);
				expect(inFile.path.endsWith("test.d.ts")).toBe(true);
				expect(inFile.folder.path).toBe(tempDir);
			});
		});

		test("should handle deeply nested directory structures", () => {
			withTempDir("deep-nested", (tempDir) => {
				const deepPath1 = path.join(tempDir, "a", "b", "c", "d", "e");
				const deepPath2 = path.join(tempDir, "x", "y", "z");
				createTestFile(
					path.join(deepPath1, "deep.d.ts"),
					"export declare const deep: string;",
				);
				createTestFile(
					path.join(deepPath2, "nested.d.ts"),
					"export declare const nested: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(2);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.some((p) => p.endsWith("deep.d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("nested.d.ts"))).toBe(true);
			});
		});
	});

	describe("Regex patterns", () => {
		test("V regex should match version patterns", () => {
			const vRegex = PathsFromTsLibSource.V;

			expect(vRegex.test("v1.0")).toBe(true);
			expect(vRegex.test("v2.5.1")).toBe(true);
			expect(vRegex.test("v10.15.3")).toBe(true);
			expect(vRegex.test("v0.1")).toBe(true);

			expect(vRegex.test("version")).toBe(false);
			expect(vRegex.test("v")).toBe(false);
			expect(vRegex.test("1.0")).toBe(false);
			expect(vRegex.test("ver1.0")).toBe(false);
		});

		test("TS regex should match TypeScript version patterns", () => {
			const tsRegex = PathsFromTsLibSource.TS;

			expect(tsRegex.test("ts3.8")).toBe(true);
			expect(tsRegex.test("ts4.0")).toBe(true);
			expect(tsRegex.test("ts4.5.2")).toBe(true);
			expect(tsRegex.test("ts2.1")).toBe(true);

			expect(tsRegex.test("typescript")).toBe(false);
			expect(tsRegex.test("ts")).toBe(false);
			expect(tsRegex.test("3.8")).toBe(false);
			expect(tsRegex.test("tsc4.0")).toBe(false);
		});
	});

	describe("Edge cases and boundary conditions", () => {
		test("should handle directory with only non-.d.ts files", () => {
			withTempDir("no-dts", (tempDir) => {
				createTestFile(
					path.join(tempDir, "index.ts"),
					"export const test = 'value';",
				);
				createTestFile(
					path.join(tempDir, "utils.js"),
					"export const util = () => {};",
				);
				createTestFile(path.join(tempDir, "README.md"), "# Test");

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.isEmpty).toBe(true);
			});
		});

		test("should handle directory with only skipped subdirectories", () => {
			withTempDir("only-skipped", (tempDir) => {
				createTestFile(
					path.join(tempDir, "node_modules", "test", "index.d.ts"),
					"export declare const test: string;",
				);
				createTestFile(
					path.join(tempDir, "amd", "module.d.ts"),
					"declare module 'amd' {}",
				);
				createTestFile(
					path.join(tempDir, "v1.0", "old.d.ts"),
					"export declare const old: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.isEmpty).toBe(true);
			});
		});

		test("should handle directory with only .src. files", () => {
			withTempDir("only-src", (tempDir) => {
				createTestFile(
					path.join(tempDir, "highlight.src.d.ts"),
					"declare module 'highlight' {}",
				);
				createTestFile(
					path.join(tempDir, "utils.src.d.ts"),
					"declare module 'utils' {}",
				);
				createTestFile(
					path.join(tempDir, "main.src.d.ts"),
					"declare module 'main' {}",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.isEmpty).toBe(true);
			});
		});

		test("should handle files with .d.ts in the middle of filename", () => {
			withTempDir("dts-middle", (tempDir) => {
				createTestFile(path.join(tempDir, "test.d.ts.backup"), "backup file");
				createTestFile(
					path.join(tempDir, "valid.d.ts"),
					"export declare const valid: string;",
				);
				createTestFile(path.join(tempDir, "another.d.ts.old"), "old file");

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(1);
				expect(result.apply(0).path.endsWith("valid.d.ts")).toBe(true);
			});
		});

		test("should handle symbolic links and special files", () => {
			withTempDir("special-files", (tempDir) => {
				createTestFile(
					path.join(tempDir, "normal.d.ts"),
					"export declare const normal: string;",
				);

				// Create a directory that looks like a file
				createTestDir(path.join(tempDir, "fake-file.d.ts"));
				createTestFile(
					path.join(tempDir, "fake-file.d.ts", "content.txt"),
					"not a .d.ts file",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(1);
				expect(result.apply(0).path.endsWith("normal.d.ts")).toBe(true);
			});
		});

		test("should handle very long file paths", () => {
			withTempDir("long-paths", (tempDir) => {
				const longPathSegments = Array.from(
					{ length: 10 },
					(_, i) => `very-long-directory-name-${i + 1}`,
				);
				const longPath = path.join(tempDir, ...longPathSegments);
				createTestFile(
					path.join(longPath, "deep.d.ts"),
					"export declare const deep: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(1);
				expect(result.apply(0).path.endsWith("deep.d.ts")).toBe(true);
			});
		});

		test("should handle files with special characters in names", () => {
			withTempDir("special-chars", (tempDir) => {
				createTestFile(
					path.join(tempDir, "test-file.d.ts"),
					"export declare const test: string;",
				);
				createTestFile(
					path.join(tempDir, "test_file.d.ts"),
					"export declare const test2: string;",
				);
				createTestFile(
					path.join(tempDir, "test.file.d.ts"),
					"export declare const test3: string;",
				);
				createTestFile(
					path.join(tempDir, "test@file.d.ts"),
					"export declare const test4: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(4);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.some((p) => p.endsWith("test-file.d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("test_file.d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("test.file.d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("test@file.d.ts"))).toBe(true);
			});
		});

		test("should handle file extension case sensitivity correctly", () => {
			withTempDir("case-sensitive", (tempDir) => {
				createTestFile(
					path.join(tempDir, "Test.d.ts"),
					"export declare const Test: string;",
				);
				createTestFile(
					path.join(tempDir, "another.d.ts"),
					"export declare const another: string;",
				);
				createTestFile(
					path.join(tempDir, "wrongext.D.TS"),
					"not a valid .d.ts file",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				// Only files ending with lowercase ".d.ts" should be included
				expect(result.length).toBe(2);

				const filePaths = result
					.map((file) => file.path)
					.toArray()
					.sort();
				expect(filePaths.some((p) => p.endsWith("Test.d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("another.d.ts"))).toBe(true);
				expect(filePaths.some((p) => p.endsWith("wrongext.D.TS"))).toBe(false);
			});
		});

		test("should handle mixed skip patterns in same directory tree", () => {
			withTempDir("mixed-skip", (tempDir) => {
				createTestFile(
					path.join(tempDir, "valid.d.ts"),
					"export declare const valid: string;",
				);
				createTestFile(
					path.join(tempDir, "node_modules", "v1.0", "test.d.ts"),
					"should be skipped",
				);
				createTestFile(
					path.join(tempDir, "amd", "ts4.0", "test.d.ts"),
					"should be skipped",
				);
				createTestFile(
					path.join(tempDir, "es", "umd", "test.d.ts"),
					"should be skipped",
				);
				createTestFile(
					path.join(tempDir, "normal", "es6", "test.d.ts"),
					"should be skipped",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(1);
				expect(result.apply(0).path.endsWith("valid.d.ts")).toBe(true);
			});
		});
	});

	describe("Performance and stress tests", () => {
		test("should handle large number of files efficiently", () => {
			withTempDir("many-files", (tempDir) => {
				// Create 100 .d.ts files
				for (let i = 1; i <= 100; i++) {
					createTestFile(
						path.join(tempDir, `file${i}.d.ts`),
						`export declare const file${i}: string;`,
					);
				}

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(100);

				// Verify all files are included
				const fileNumbers = result
					.toArray()
					.map((file) => file.path)
					.map((p) => path.basename(p))
					.map((name) => name.replace("file", "").replace(".d.ts", ""))
					.map((num) => parseInt(num, 10))
					.sort((a, b) => a - b);

				const expectedNumbers = Array.from({ length: 100 }, (_, i) => i + 1);
				expect(fileNumbers).toEqual(expectedNumbers);
			});
		});

		test("should handle deep directory nesting efficiently", () => {
			withTempDir("deep-nesting", (tempDir) => {
				// Create a 20-level deep directory structure
				const deepPathSegments = Array.from(
					{ length: 20 },
					(_, i) => `level${i + 1}`,
				);
				const deepPath = path.join(tempDir, ...deepPathSegments);
				createTestFile(
					path.join(deepPath, "deep.d.ts"),
					"export declare const deep: string;",
				);

				const folder = new InFolder(tempDir);
				const result = PathsFromTsLibSource.filesFrom(folder);

				expect(result.length).toBe(1);
				expect(result.apply(0).path.endsWith("deep.d.ts")).toBe(true);
			});
		});
	});
});
