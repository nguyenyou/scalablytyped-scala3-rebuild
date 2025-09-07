/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.DeriveCopyTests
 * Tests for DeriveCopy.ts - comprehensive test coverage matching the original Scala implementation
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { DeriveCopy } from "@/internal/ts/modules/DeriveCopy.js";
import {
	TsDeclClass,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclTypeAlias,
	TsIdent,
	type TsIdentSimple,
	type TsMember,
	TsFunSig,
	TsQIdent,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data specific to DeriveCopy tests

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createHasPath(...parts: string[]): CodePath {
	if (parts.length === 0) {
		return CodePath.noPath();
	}
	const [library, ...pathParts] = parts;
	const libraryIdent = TsIdent.simple(library);
	const qident = pathParts.length > 0
		? TsQIdent.ofStrings(...pathParts)
		: TsQIdent.of(libraryIdent);
	return CodePath.hasPath(libraryIdent, qident);
}

function createMockInterface(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclInterface {
	return TsDeclInterface.create(
		Comments.empty(),
		false,
		createSimpleIdent(name),
		IArray.Empty, // tparams
		IArray.Empty, // inheritance
		members,
		codePath,
	);
}

describe("DeriveCopy", () => {
	describe("Basic Functionality", () => {
		test("apply method exists and can be called", () => {
			const interface_ = createMockInterface("TestInterface", IArray.Empty, createHasPath("test", "TestInterface"));
			const ownerCp = createHasPath("owner");
			const result = DeriveCopy.apply(interface_, ownerCp, none);
			expect(result.nonEmpty).toBe(true);
		});

		test("transforms interface to type alias", () => {
			const interface_ = createMockInterface("TestInterface", IArray.Empty, createHasPath("test", "TestInterface"));
			const ownerCp = createHasPath("owner");
			const result = DeriveCopy.apply(interface_, ownerCp, none);

			expect(result.length).toBe(1);
			expect(result.get(0).name.value).toBe("TestInterface");
			// DeriveCopy transforms interfaces to type aliases
			expect(result.get(0)._tag).toBe("TsDeclTypeAlias");
		});
	});

	describe("Path Matching", () => {
		test("creates type alias with updated path", () => {
			const ownerCp = createHasPath("owner");
			const childCp = createHasPath("owner", "TestInterface");
			const interface_ = createMockInterface("TestInterface", IArray.Empty, childCp);

			const result = DeriveCopy.apply(interface_, ownerCp, none);

			expect(result.length).toBe(1);
			expect(result.get(0)._tag).toBe("TsDeclTypeAlias");
			const typeAlias = result.get(0) as TsDeclTypeAlias;
			expect(typeAlias.name.value).toBe("TestInterface");

			// Check that the code path was updated correctly
			if (CodePath.isHasPath(typeAlias.codePath)) {
				expect(typeAlias.codePath.inLibrary.value).toBe("owner");
			} else {
				throw new Error("Expected HasPath but got NoPath");
			}
		});

		test("creates type alias when paths don't match", () => {
			const ownerCp = createHasPath("different");
			const childCp = createHasPath("owner", "TestInterface");
			const interface_ = createMockInterface("TestInterface", IArray.Empty, childCp);

			const result = DeriveCopy.apply(interface_, ownerCp, none);

			expect(result.length).toBe(1);
			expect(result.get(0).name.value).toBe("TestInterface");
			expect(result.get(0)._tag).toBe("TsDeclTypeAlias");
		});
	});
});