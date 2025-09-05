/**
 * TypeScript port of LibraryVersionTests.scala
 *
 * Comprehensive unit tests for LibraryVersion and InGit classes
 */

import { describe, expect, test } from "bun:test";
import { pipe } from "fp-ts/function";
import { getOrElse, isNone, isSome } from "fp-ts/Option";
import { Digest } from "../internal/Digest.js";
import { IArray } from "../internal/IArray.js";
import { InGit, LibraryVersion } from "../internal/LibraryVersion.js";

describe("LibraryVersion", () => {
	describe("Basic Construction and Property Access", () => {
		test("should construct with all parameters", () => {
			// Test basic construction with all parameters
			const libraryVersion1 = LibraryVersion.create(false, "1.2.3", null);
			expect(libraryVersion1.isStdLib).toBe(false);
			expect(isSome(libraryVersion1.libraryVersion)).toBe(true);
			expect(
				pipe(
					libraryVersion1.libraryVersion,
					getOrElse(() => ""),
				),
			).toBe("1.2.3");
			expect(isNone(libraryVersion1.inGit)).toBe(true);

			// Test construction with stdlib flag
			const libraryVersion2 = LibraryVersion.create(true, "4.5.6", null);
			expect(libraryVersion2.isStdLib).toBe(true);
			expect(
				pipe(
					libraryVersion2.libraryVersion,
					getOrElse(() => ""),
				),
			).toBe("4.5.6");

			// Test construction with git information
			const gitInfo = new InGit(
				new URL("https://github.com/example/repo"),
				false,
				new Date("2023-01-15T10:30:00Z"),
			);
			const libraryVersion3 = LibraryVersion.create(false, "2.0.0", gitInfo);
			expect(isSome(libraryVersion3.inGit)).toBe(true);
			if (isSome(libraryVersion3.inGit)) {
				expect(libraryVersion3.inGit.value.repo.toString()).toBe(
					"https://github.com/example/repo",
				);
				expect(libraryVersion3.inGit.value.isDefinitelyTyped).toBe(false);
			}

			// Test construction with no library version
			const libraryVersion4 = LibraryVersion.create(false, null, null);
			expect(isNone(libraryVersion4.libraryVersion)).toBe(true);
		});
	});

	describe("Version Generation with Digest", () => {
		test("should generate versions with digest correctly", () => {
			// Create a test digest
			const testDigest = Digest.ofStrings(IArray.apply("test-content"));

			// Test version generation without git info
			const libraryVersion1 = LibraryVersion.create(false, "1.2.3", null);
			const version1 = libraryVersion1.version(testDigest);
			expect(version1.startsWith("1.2.3-")).toBe(true);
			expect(version1.endsWith(testDigest.hexString.substring(0, 6))).toBe(
				true,
			);
			expect(version1.split("-").length).toBe(2); // library version + digest

			// Test version generation with git info
			const gitInfo = new InGit(
				new URL("https://github.com/example/repo"),
				false,
				new Date("2023-01-15T10:30:00Z"),
			);
			const libraryVersion2 = LibraryVersion.create(false, "2.0.0", gitInfo);
			const version2 = libraryVersion2.version(testDigest);
			expect(version2.startsWith("2.0.0-")).toBe(true);
			expect(version2.includes("/example/repo-20230115Z")).toBe(true);
			expect(version2.endsWith(testDigest.hexString.substring(0, 6))).toBe(
				true,
			);
			expect(version2.split("-").length).toBe(4); // library version + git info (with Z) + digest

			// Test version generation with no library version
			const libraryVersion3 = LibraryVersion.create(false, null, null);
			const version3 = libraryVersion3.version(testDigest);
			expect(version3.startsWith("0.0-unknown-")).toBe(true);
			expect(version3.endsWith(testDigest.hexString.substring(0, 6))).toBe(
				true,
			);
		});
	});

	describe("StdLib Version Handling", () => {
		test("should handle stdlib version truncation correctly", () => {
			const testDigest = Digest.ofStrings(IArray.apply("stdlib-test"));

			// Test stdlib version truncation (removes minor version)
			const stdLibVersion = LibraryVersion.create(true, "4.5.6", null);
			const version = stdLibVersion.version(testDigest);
			expect(version.startsWith("4.5-")).toBe(true); // Should truncate the ".6" part
			expect(!version.startsWith("4.5.6-")).toBe(true);

			// Test non-stdlib version (should not truncate)
			const nonStdLibVersion = LibraryVersion.create(false, "4.5.6", null);
			const nonStdVersion = nonStdLibVersion.version(testDigest);
			expect(nonStdVersion.startsWith("4.5.6-")).toBe(true);

			// Test stdlib with two-part version (should truncate to major version)
			const twoPartVersion = LibraryVersion.create(true, "4.5", null);
			const twoPartResult = twoPartVersion.version(testDigest);
			expect(twoPartResult.startsWith("4-")).toBe(true); // Should truncate to just major version

			// Test stdlib with single part version (edge case - handled gracefully in TS)
			const singlePartVersion = LibraryVersion.create(true, "4", null);
			const singlePartResult = singlePartVersion.version(testDigest);
			// TypeScript implementation handles this gracefully (no exception)
			expect(singlePartResult.startsWith("4-")).toBe(true);
		});
	});

	describe("InGit Format Generation", () => {
		test("should format git information correctly", () => {
			// Test DefinitelyTyped repository formatting
			const dtGitInfo = new InGit(
				new URL("https://github.com/DefinitelyTyped/DefinitelyTyped"),
				true,
				new Date("2023-03-20T14:45:30Z"),
			);
			const dtFormat = dtGitInfo.format();
			expect(dtFormat).toBe("dt-20230320Z");

			// Test regular repository formatting
			const regularGitInfo = new InGit(
				new URL("https://github.com/facebook/react"),
				false,
				new Date("2023-03-20T14:45:30Z"),
			);
			const regularFormat = regularGitInfo.format();
			expect(regularFormat).toBe("/facebook/react-20230320Z");

			// Test with different date
			const differentDateGitInfo = new InGit(
				new URL("https://github.com/microsoft/typescript"),
				false,
				new Date("2022-12-01T09:15:45Z"),
			);
			const differentDateFormat = differentDateGitInfo.format();
			expect(differentDateFormat).toBe("/microsoft/typescript-20221201Z");
		});
	});

	describe("Edge Cases and Complex Scenarios", () => {
		test("should handle edge cases and complex scenarios", () => {
			const testDigest = Digest.ofStrings(IArray.apply("edge-case-test"));

			// Test with empty string library version
			const emptyVersionLib = LibraryVersion.create(false, "", null);
			const emptyVersionResult = emptyVersionLib.version(testDigest);
			// Empty string is treated as "no version" and defaults to "0.0-unknown"
			expect(emptyVersionResult.startsWith("0.0-unknown-")).toBe(true);

			// Test complex version string with stdlib
			const complexStdLibVersion = LibraryVersion.create(
				true,
				"1.2.3-beta.4",
				null,
			);
			const complexResult = complexStdLibVersion.version(testDigest);
			expect(complexResult.startsWith("1.2.3-beta-")).toBe(true); // Should truncate at last dot

			// Test with both DefinitelyTyped git info and stdlib
			const dtStdLibGitInfo = new InGit(
				new URL("https://github.com/DefinitelyTyped/DefinitelyTyped"),
				true,
				new Date("2023-06-15T12:00:00Z"),
			);
			const dtStdLibVersion = LibraryVersion.create(
				true,
				"3.1.4",
				dtStdLibGitInfo,
			);
			const dtStdLibResult = dtStdLibVersion.version(testDigest);
			expect(dtStdLibResult.startsWith("3.1-")).toBe(true); // Stdlib version truncation
			expect(dtStdLibResult.includes("dt-20230615Z")).toBe(true); // DT git formatting (includes Z)
			expect(
				dtStdLibResult.endsWith(testDigest.hexString.substring(0, 6)),
			).toBe(true);

			// Test digest hex string truncation
			const shortDigestTest = LibraryVersion.create(false, "test", null);
			const shortDigestResult = shortDigestTest.version(testDigest);
			const digestPart = shortDigestResult.split("-").pop()!;
			expect(digestPart.length).toBe(6); // Should be exactly 6 characters
			expect(digestPart).toBe(testDigest.hexString.substring(0, 6));
		});
	});
});
