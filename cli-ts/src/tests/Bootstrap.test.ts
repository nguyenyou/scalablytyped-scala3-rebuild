import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { InFolder } from "@/internal/files";
import { Bootstrap } from "@/internal/importer/Bootstrap";

describe("Bootstrap", () => {
	let tempDir: string;
	let testNodeModules: string;

	beforeEach(() => {
		// Create a temporary directory for testing
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-test-"));
		testNodeModules = path.join(tempDir, "node_modules");
		fs.mkdirSync(testNodeModules, { recursive: true });
	});

	afterEach(() => {
		// Clean up temporary directory
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("forFolder function", () => {
		test("should handle empty directory", () => {
			const emptyDir = path.join(tempDir, "empty");
			fs.mkdirSync(emptyDir);

			const folder = new InFolder(emptyDir);
			const result = Bootstrap.forFolder(folder);

			expect(result.isEmpty).toBe(true);
		});

		test("should find simple packages", () => {
			// Create simple package directories with .d.ts files
			const lodashDir = path.join(testNodeModules, "lodash");
			const reactDir = path.join(testNodeModules, "react");

			fs.mkdirSync(lodashDir, { recursive: true });
			fs.mkdirSync(reactDir, { recursive: true });

			// Add .d.ts files to make them valid TypeScript sources
			fs.writeFileSync(
				path.join(lodashDir, "index.d.ts"),
				"export declare const _: any;",
			);
			fs.writeFileSync(
				path.join(reactDir, "index.d.ts"),
				"export declare const React: any;",
			);

			const folder = new InFolder(testNodeModules);
			const result = Bootstrap.forFolder(folder);

			expect(result.length).toBe(2);

			const libNames = result
				.map((source) => source.libName.value)
				.toArray()
				.sort();
			expect(libNames).toEqual(["lodash", "react"]);
		});

		test("should handle scoped packages", () => {
			// Create scoped package directories
			const angularDir = path.join(testNodeModules, "@angular");
			const angularCoreDir = path.join(angularDir, "core");
			const angularCommonDir = path.join(angularDir, "common");

			fs.mkdirSync(angularCoreDir, { recursive: true });
			fs.mkdirSync(angularCommonDir, { recursive: true });

			// Add .d.ts files
			fs.writeFileSync(
				path.join(angularCoreDir, "index.d.ts"),
				"export declare const NgModule: any;",
			);
			fs.writeFileSync(
				path.join(angularCommonDir, "index.d.ts"),
				"export declare const CommonModule: any;",
			);

			const folder = new InFolder(testNodeModules);
			const result = Bootstrap.forFolder(folder);

			expect(result.length).toBe(2);

			const libNames = result
				.map((source) => source.libName.value)
				.toArray()
				.sort();
			expect(libNames).toEqual(["@angular/common", "@angular/core"]);
		});

		test("should skip @types directories", () => {
			// Create @types directory (should be skipped)
			const typesDir = path.join(testNodeModules, "@types");
			const typesNodeDir = path.join(typesDir, "node");

			fs.mkdirSync(typesNodeDir, { recursive: true });
			fs.writeFileSync(
				path.join(typesNodeDir, "index.d.ts"),
				"export declare const process: any;",
			);

			// Create regular package
			const lodashDir = path.join(testNodeModules, "lodash");
			fs.mkdirSync(lodashDir, { recursive: true });
			fs.writeFileSync(
				path.join(lodashDir, "index.d.ts"),
				"export declare const _: any;",
			);

			const folder = new InFolder(testNodeModules);
			const result = Bootstrap.forFolder(folder);

			expect(result.length).toBe(1);
			expect(result.apply(0).libName.value).toBe("lodash");
		});

		test("should skip packages without TypeScript sources", () => {
			// Create package without .d.ts files
			const packageWithoutTypes = path.join(testNodeModules, "no-types");
			fs.mkdirSync(packageWithoutTypes, { recursive: true });
			fs.writeFileSync(
				path.join(packageWithoutTypes, "index.js"),
				"module.exports = {};",
			);

			// Create package with .d.ts files
			const packageWithTypes = path.join(testNodeModules, "with-types");
			fs.mkdirSync(packageWithTypes, { recursive: true });
			fs.writeFileSync(
				path.join(packageWithTypes, "index.d.ts"),
				"export declare const test: any;",
			);

			const folder = new InFolder(testNodeModules);
			const result = Bootstrap.forFolder(folder);

			expect(result.length).toBe(1);
			expect(result.apply(0).libName.value).toBe("with-types");
		});

		test("should handle mixed simple and scoped packages", () => {
			// Create simple package
			const lodashDir = path.join(testNodeModules, "lodash");
			fs.mkdirSync(lodashDir, { recursive: true });
			fs.writeFileSync(
				path.join(lodashDir, "index.d.ts"),
				"export declare const _: any;",
			);

			// Create scoped package
			const angularDir = path.join(testNodeModules, "@angular");
			const angularCoreDir = path.join(angularDir, "core");
			fs.mkdirSync(angularCoreDir, { recursive: true });
			fs.writeFileSync(
				path.join(angularCoreDir, "index.d.ts"),
				"export declare const NgModule: any;",
			);

			// Create @types (should be skipped)
			const typesDir = path.join(testNodeModules, "@types");
			const typesNodeDir = path.join(typesDir, "node");
			fs.mkdirSync(typesNodeDir, { recursive: true });
			fs.writeFileSync(
				path.join(typesNodeDir, "index.d.ts"),
				"export declare const process: any;",
			);

			const folder = new InFolder(testNodeModules);
			const result = Bootstrap.forFolder(folder);

			expect(result.length).toBe(2);

			const libNames = result
				.map((source) => source.libName.value)
				.toArray()
				.sort();
			expect(libNames).toEqual(["@angular/core", "lodash"]);
		});

		test("should handle directory read errors gracefully", () => {
			// Test with non-existent directory
			const nonExistentDir = path.join(tempDir, "non-existent");
			const folder = new InFolder(nonExistentDir);
			const result = Bootstrap.forFolder(folder);

			expect(result.isEmpty).toBe(true);
		});
	});
});
