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
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclModule,
	type TsDeclTypeAlias,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	type TsMember,
	TsMemberProperty,
	TsProtectionLevel,
	TsQIdent,
	type TsType,
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
	const qident =
		pathParts.length > 0
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

function createMockClass(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclClass {
	return TsDeclClass.create(
		Comments.empty(),
		false, // declared
		false, // isAbstract
		createSimpleIdent(name),
		IArray.Empty, // tparams
		none, // parent
		IArray.Empty, // implements
		members,
		JsLocation.zero(),
		codePath,
	);
}

function createMockFunction(
	name: string,
	codePath: CodePath = CodePath.noPath(),
): TsDeclFunction {
	return TsDeclFunction.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		TsFunSig.create(
			Comments.empty(),
			IArray.Empty, // tparams
			IArray.Empty, // params
			some(TsTypeRef.any), // resultType
		),
		JsLocation.zero(),
		codePath,
	);
}

function createMockModule(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclModule {
	const moduleIdent = TsIdent.module(none, [name]);
	return TsDeclModule.create(
		Comments.empty(),
		false, // declared
		moduleIdent,
		members,
		codePath,
		JsLocation.zero(),
	);
}

function createMockProperty(name: string, tpe: TsType): TsMemberProperty {
	return TsMemberProperty.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		some(tpe),
		none, // expr
		false, // isStatic
		false, // isReadOnly
	);
}

describe("DeriveCopy", () => {
	describe("Basic Functionality", () => {
		test("apply method exists and can be called", () => {
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				createHasPath("test", "TestInterface"),
			);
			const ownerCp = createHasPath("owner");
			const result = DeriveCopy.apply(interface_, ownerCp, none);
			expect(result.nonEmpty).toBe(true);
		});

		test("transforms interface to type alias", () => {
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				createHasPath("test", "TestInterface"),
			);
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
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				childCp,
			);

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
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				childCp,
			);

			const result = DeriveCopy.apply(interface_, ownerCp, none);

			expect(result.length).toBe(1);
			expect(result.get(0).name.value).toBe("TestInterface");
			expect(result.get(0)._tag).toBe("TsDeclTypeAlias");
		});
	});

	describe("Renaming", () => {
		test("renames interface when rename provided", () => {
			const interface_ = createMockInterface(
				"OriginalName",
				IArray.Empty,
				createHasPath("test", "OriginalName"),
			);
			const ownerCp = createHasPath("owner");
			const newName = createSimpleIdent("NewName");

			const result = DeriveCopy.apply(interface_, ownerCp, some(newName));

			expect(result.length).toBe(1);
			expect(result.get(0).name.value).toBe("NewName");
			expect(result.get(0)._tag).toBe("TsDeclTypeAlias");
		});

		test("skips rename when new name equals original name", () => {
			const interface_ = createMockInterface(
				"SameName",
				IArray.Empty,
				createHasPath("test", "SameName"),
			);
			const ownerCp = createHasPath("owner");
			const sameName = createSimpleIdent("SameName");

			const result = DeriveCopy.apply(interface_, ownerCp, some(sameName));

			expect(result.length).toBe(1);
			expect(result.get(0).name.value).toBe("SameName");
			expect(result.get(0)._tag).toBe("TsDeclTypeAlias");
		});
	});

	describe("Different Declaration Types", () => {
		test("handles class declarations", () => {
			const clazz = createMockClass(
				"TestClass",
				IArray.Empty,
				createHasPath("test", "TestClass"),
			);
			const ownerCp = createHasPath("owner");

			const result = DeriveCopy.apply(clazz, ownerCp, none);

			expect(result.length).toBe(1);
			expect(result.get(0).name.value).toBe("TestClass");
			// Classes are copied with updated codePath but remain as classes
			expect(result.get(0)._tag).toBe("TsDeclClass");
			const resultClass = result.get(0) as TsDeclClass;

			// Check that the code path was updated correctly
			if (CodePath.isHasPath(resultClass.codePath)) {
				expect(resultClass.codePath.inLibrary.value).toBe("owner");
			} else {
				throw new Error("Expected HasPath but got NoPath");
			}
		});

		test("handles function declarations", () => {
			const func = createMockFunction(
				"testFunc",
				createHasPath("test", "testFunc"),
			);
			const ownerCp = createHasPath("owner");

			const result = DeriveCopy.apply(func, ownerCp, none);

			expect(result.length).toBe(1);
			expect(result.get(0).name.value).toBe("testFunc");
			// Functions are copied with updated codePath but remain as functions
			expect(result.get(0)._tag).toBe("TsDeclFunction");
			const resultFunction = result.get(0) as TsDeclFunction;

			// Check that the code path was updated correctly
			if (CodePath.isHasPath(resultFunction.codePath)) {
				expect(resultFunction.codePath.inLibrary.value).toBe("owner");
			} else {
				throw new Error("Expected HasPath but got NoPath");
			}
		});

		test("handles module declarations", () => {
			const module = createMockModule(
				"TestModule",
				IArray.Empty,
				createHasPath("test", "TestModule"),
			);
			const ownerCp = createHasPath("owner");

			const result = DeriveCopy.apply(module, ownerCp, none);

			expect(result.length).toBe(1);
			expect(result.get(0).name.value).toBe("TestModule");
			// Modules are copied with updated codePath but remain as modules
			expect(result.get(0)._tag).toBe("TsDeclModule");
			const resultModule = result.get(0) as TsDeclModule;

			// Check that the code path was updated correctly
			if (CodePath.isHasPath(resultModule.codePath)) {
				expect(resultModule.codePath.inLibrary.value).toBe("owner");
			} else {
				throw new Error("Expected HasPath but got NoPath");
			}
		});
	});

	describe("Edge Cases", () => {
		test("handles interface with members", () => {
			const member = createMockProperty("prop", TsTypeRef.any);
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([member as TsMember]),
				createHasPath("test", "TestInterface"),
			);
			const ownerCp = createHasPath("owner");

			const result = DeriveCopy.apply(interface_, ownerCp, none);

			expect(result.length).toBe(1);
			expect(result.get(0)._tag).toBe("TsDeclTypeAlias");
			const typeAlias = result.get(0) as TsDeclTypeAlias;
			expect(typeAlias.name.value).toBe("TestInterface");
		});

		test("handles complex path structures", () => {
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				createHasPath("deep", "nested", "path", "TestInterface"),
			);
			const ownerCp = createHasPath("owner", "sub");

			const result = DeriveCopy.apply(interface_, ownerCp, none);

			expect(result.length).toBe(1);
			expect(result.get(0)._tag).toBe("TsDeclTypeAlias");
			const typeAlias = result.get(0) as TsDeclTypeAlias;

			// Check that the code path was updated correctly
			if (CodePath.isHasPath(typeAlias.codePath)) {
				expect(typeAlias.codePath.inLibrary.value).toBe("owner");
			} else {
				throw new Error("Expected HasPath but got NoPath");
			}
		});
	});
});
