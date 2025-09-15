/**
 * Tests for CalculateLibraryVersion TypeScript port
 */

import * as O from "fp-ts/Option";
import { describe, expect, test } from "bun:test";
import { Comments } from "../internal/Comments.js";
import { InFolder } from "../internal/files.js";
import {
	CalculateLibraryVersion,
	PackageJsonOnly,
} from "../internal/ts/CalculateLibraryVersion.js";
import { PackageJson } from "../internal/ts/PackageJson.js";

// Mock Comments implementation for testing
const mockComments = Comments.empty();

describe("CalculateLibraryVersion", () => {
	const testFolder = new InFolder("/test/folder");

	describe("PackageJsonOnly", () => {
		test("should create LibraryVersion with version from package.json", () => {
			// Create a PackageJson with version
			const packageJson = new PackageJson(
				"1.2.3", // version
				undefined, // dependencies
				undefined, // devDependencies
				undefined, // peerDependencies
				undefined, // typings
				undefined, // module
				undefined, // types
				undefined, // files
				undefined, // dist
				undefined, // exports
			);

			const calculator = new PackageJsonOnly();
			const result = calculator.apply(
				testFolder,
				false, // isStdLib
				O.some(packageJson),
				mockComments,
			);

			expect(result.isStdLib).toBe(false);
			expect(O.isSome(result.libraryVersion)).toBe(true);
			if (O.isSome(result.libraryVersion)) {
				expect(result.libraryVersion.value).toBe("1.2.3");
			}
			expect(O.isNone(result.inGit)).toBe(true);
		});

		test("should create LibraryVersion with no version when package.json has no version", () => {
			// Create a PackageJson without version
			const packageJson = new PackageJson(
				undefined, // version
				undefined, // dependencies
				undefined, // devDependencies
				undefined, // peerDependencies
				undefined, // typings
				undefined, // module
				undefined, // types
				undefined, // files
				undefined, // dist
				undefined, // exports
			);

			const calculator = new PackageJsonOnly();
			const result = calculator.apply(
				testFolder,
				true, // isStdLib
				O.some(packageJson),
				mockComments,
			);

			expect(result.isStdLib).toBe(true);
			expect(O.isNone(result.libraryVersion)).toBe(true);
			expect(O.isNone(result.inGit)).toBe(true);
		});

		test("should create LibraryVersion with no version when no package.json provided", () => {
			const calculator = new PackageJsonOnly();
			const result = calculator.apply(
				testFolder,
				false, // isStdLib
				O.none, // no package.json
				mockComments,
			);

			expect(result.isStdLib).toBe(false);
			expect(O.isNone(result.libraryVersion)).toBe(true);
			expect(O.isNone(result.inGit)).toBe(true);
		});
	});

	describe("namespace static instance", () => {
		test("should provide static PackageJsonOnly instance", () => {
			const calculator = CalculateLibraryVersion.PackageJsonOnly;
			expect(calculator).toBeInstanceOf(PackageJsonOnly);

			// Test that it works the same as a new instance
			const packageJson = new PackageJson("2.0.0");
			const result = calculator.apply(
				testFolder,
				false,
				O.some(packageJson),
				mockComments,
			);

			expect(O.isSome(result.libraryVersion)).toBe(true);
			if (O.isSome(result.libraryVersion)) {
				expect(result.libraryVersion.value).toBe("2.0.0");
			}
		});
	});
});
