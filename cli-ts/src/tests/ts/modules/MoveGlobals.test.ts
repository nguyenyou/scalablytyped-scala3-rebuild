/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.MoveGlobalsTests
 * Tests for MoveGlobals.ts - comprehensive test coverage matching the original Scala implementation
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, test } from "bun:test";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { MoveGlobals } from "@/internal/ts/modules/MoveGlobals.js";
import {
	TsAugmentedModule,
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclEnum,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclModule,
	TsDeclNamespace,
	TsDeclTypeAlias,
	TsDeclVar,
	TsFunSig,
	TsIdent,
	TsIdentGlobal,
	type TsIdentSimple,
	type TsParsedFile,
	TsParsedFile as TsParsedFileConstructor,
	TsQIdent,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data specific to MoveGlobals tests

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createMockInterface(name: string): TsDeclInterface {
	return TsDeclInterface.create(
		Comments.empty(),
		false,
		createSimpleIdent(name),
		IArray.Empty, // tparams
		IArray.Empty, // inheritance
		IArray.Empty, // members
		CodePath.noPath(),
	);
}

function createMockTypeAlias(name: string): TsDeclTypeAlias {
	return TsDeclTypeAlias.create(
		Comments.empty(),
		false,
		createSimpleIdent(name),
		IArray.Empty, // tparams
		TsTypeRef.any,
		CodePath.noPath(),
	);
}

function createMockFunction(name: string, codePath?: CodePath): TsDeclFunction {
	return TsDeclFunction.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		TsFunSig.create(
			Comments.empty(),
			IArray.Empty, // tparams
			IArray.Empty, // params
			some(TsTypeRef.string), // resultType
		),
		JsLocation.zero(),
		codePath || createHasPath("test", "function"),
	);
}

function createMockVar(name: string, codePath?: CodePath): TsDeclVar {
	return TsDeclVar.create(
		Comments.empty(),
		false, // declared
		false, // readOnly
		createSimpleIdent(name),
		some(TsTypeRef.string), // tpe
		none, // expr
		JsLocation.zero(),
		codePath || createHasPath("test", "var"),
	);
}

function createMockClass(name: string, codePath?: CodePath): TsDeclClass {
	return TsDeclClass.create(
		Comments.empty(),
		false, // declared
		false, // isAbstract
		createSimpleIdent(name),
		IArray.Empty, // tparams
		none, // parent
		IArray.Empty, // implementsInterfaces
		IArray.Empty, // members
		JsLocation.zero(),
		codePath || createHasPath("test", "class"),
	);
}

function createMockEnum(name: string, codePath?: CodePath): TsDeclEnum {
	return TsDeclEnum.create(
		Comments.empty(),
		false, // declared
		false, // isConst
		createSimpleIdent(name),
		IArray.Empty, // members
		true, // isValue
		none, // exportedFrom
		JsLocation.zero(),
		codePath || createHasPath("test", "enum"),
	);
}

function createMockParsedFile(
	members: IArray<TsContainerOrDecl>,
	codePath?: CodePath,
): TsParsedFile {
	return TsParsedFileConstructor.create(
		Comments.empty(),
		IArray.Empty, // directives
		members,
		codePath || createHasPath("test"),
	);
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

describe("MoveGlobals", () => {
	describe("Basic Functionality", () => {
		test("apply method exists", () => {
			// Test that the apply method exists and can be called
			const file = createMockParsedFile(IArray.Empty);
			const result = MoveGlobals.apply(file);
			expect(result).toBeDefined();
		});

		test("returns original file when no global members", () => {
			// Test that files with no global members are returned unchanged
			const interface_ = createMockInterface("TestInterface");
			const typeAlias = createMockTypeAlias("TestType");
			const members = IArray.fromArray([
				interface_,
				typeAlias,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			expect(result).toBe(file); // Should return the same instance
		});

		test("moves value declarations to global namespace", () => {
			// Test that value declarations (functions, variables, classes, enums) are moved to global namespace
			const function_ = createMockFunction("testFunction");
			const variable = createMockVar("testVar");
			const clazz = createMockClass("TestClass");
			const enum_ = createMockEnum("TestEnum");

			const members = IArray.fromArray([
				function_,
				variable,
				clazz,
				enum_,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			expect(result).not.toBe(file); // Should return a new instance
			expect(result.members.length).toBeGreaterThan(0);

			// Should have a global namespace
			const globalNamespace = result.members.find(
				(member) =>
					member._tag === "TsDeclNamespace" &&
					(member as TsDeclNamespace).name.value === TsIdentGlobal.value,
			);
			expect(globalNamespace).toBeDefined();

			if (globalNamespace) {
				const ns = globalNamespace as TsDeclNamespace;
				expect(ns.members.length).toBeGreaterThan(0); // Should contain the moved declarations
			}
		});
	});

	describe("Type Preservation", () => {
		test("keeps type declarations at top level", () => {
			// Test that type declarations (interfaces, type aliases) remain at top level
			const interface_ = createMockInterface("TestInterface");
			const typeAlias = createMockTypeAlias("TestType");
			const function_ = createMockFunction("testFunction");

			const members = IArray.fromArray([
				interface_,
				typeAlias,
				function_,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			expect(result).not.toBe(file); // Should return a new instance

			// Should have interface and type alias at top level
			const topLevelInterface = result.members.find(
				(member) =>
					member._tag === "TsDeclInterface" &&
					(member as TsDeclInterface).name.value === "TestInterface",
			);
			const topLevelTypeAlias = result.members.find(
				(member) =>
					member._tag === "TsDeclTypeAlias" &&
					(member as TsDeclTypeAlias).name.value === "TestType",
			);

			expect(topLevelInterface).toBeDefined();
			expect(topLevelTypeAlias).toBeDefined();
		});

		test("transforms classes to interfaces at top level", () => {
			// Test that classes are transformed to interfaces at top level via KeepTypesOnly
			const clazz = createMockClass("TestClass");
			const function_ = createMockFunction("testFunction");

			const members = IArray.fromArray([
				clazz,
				function_,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			expect(result).not.toBe(file); // Should return a new instance

			// Should have interface at top level (class transformed to interface)
			const topLevelInterface = result.members.find(
				(member) =>
					member._tag === "TsDeclInterface" &&
					(member as TsDeclInterface).name.value === "TestClass",
			);

			expect(topLevelInterface).toBeDefined();
		});

		test("transforms enums to type-only at top level", () => {
			// Test that enums are transformed to type-only versions at top level
			const enum_ = createMockEnum("TestEnum");
			const function_ = createMockFunction("testFunction");

			const members = IArray.fromArray([
				enum_,
				function_,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			expect(result).not.toBe(file); // Should return a new instance

			// Should have enum at top level with isValue = false
			const topLevelEnum = result.members.find(
				(member) =>
					member._tag === "TsDeclEnum" &&
					(member as TsDeclEnum).name.value === "TestEnum",
			);

			expect(topLevelEnum).toBeDefined();
			if (topLevelEnum) {
				const enumDecl = topLevelEnum as TsDeclEnum;
				expect(enumDecl.isValue).toBe(false); // Should be type-only
			}
		});
	});

	describe("Global Namespace Creation", () => {
		test("creates global namespace with correct name", () => {
			// Test that the global namespace is created with the correct global identifier
			const function_ = createMockFunction("testFunction");
			const members = IArray.fromArray([function_] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			const globalNamespace = result.members.find(
				(member) =>
					member._tag === "TsDeclNamespace" &&
					(member as TsDeclNamespace).name.value === TsIdentGlobal.value,
			);

			expect(globalNamespace).toBeDefined();
			if (globalNamespace) {
				const ns = globalNamespace as TsDeclNamespace;
				expect(ns.name.value).toBe(TsIdentGlobal.value);
				expect(ns.declared).toBe(false); // Should not be declared
			}
		});

		test("global namespace contains derived copies", () => {
			// Test that the global namespace contains derived copies of value declarations
			const function_ = createMockFunction("testFunction");
			const variable = createMockVar("testVar");

			const members = IArray.fromArray([
				function_,
				variable,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			const globalNamespace = result.members.find(
				(member) => member._tag === "TsDeclNamespace",
			) as TsDeclNamespace;

			expect(globalNamespace).toBeDefined();
			expect(globalNamespace.members.length).toBeGreaterThan(0);

			// Should contain derived copies of the function and variable
			const hasFunction = globalNamespace.members.exists(
				(member) =>
					member._tag === "TsDeclFunction" &&
					(member as TsDeclFunction).name.value === "testFunction",
			);
			const hasVariable = globalNamespace.members.exists(
				(member) =>
					member._tag === "TsDeclVar" &&
					(member as TsDeclVar).name.value === "testVar",
			);

			expect(hasFunction).toBe(true);
			expect(hasVariable).toBe(true);
		});
	});

	describe("Module Handling", () => {
		test("preserves existing modules", () => {
			// Test that existing module declarations are preserved unchanged
			const module = TsDeclModule.create(
				Comments.empty(),
				false, // declared
				TsIdent.module(none, ["test-module"]),
				IArray.Empty, // members
				createHasPath("test", "module"),
				JsLocation.zero(),
			);
			const function_ = createMockFunction("testFunction");

			const members = IArray.fromArray([
				module,
				function_,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			// Should preserve the module
			const preservedModule = result.members.find(
				(member) => member._tag === "TsDeclModule",
			);

			expect(preservedModule).toBeDefined();
			expect(preservedModule).toBe(module); // Should be the same instance
		});

		test("preserves augmented modules", () => {
			// Test that augmented modules are preserved unchanged
			const augmentedModule = TsAugmentedModule.create(
				Comments.empty(),
				TsIdent.module(none, ["test-module"]),
				IArray.Empty, // members
				createHasPath("test", "augmented"),
				JsLocation.zero(),
			);
			const function_ = createMockFunction("testFunction");

			const members = IArray.fromArray([
				augmentedModule,
				function_,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			// Should preserve the augmented module
			const preservedAugModule = result.members.find(
				(member) => member._tag === "TsAugmentedModule",
			);

			expect(preservedAugModule).toBeDefined();
			expect(preservedAugModule).toBe(augmentedModule); // Should be the same instance
		});
	});

	describe("Edge Cases", () => {
		test("handles empty file", () => {
			// Test that empty files are handled correctly
			const file = createMockParsedFile(IArray.Empty);
			const result = MoveGlobals.apply(file);

			expect(result).toBe(file); // Should return the same instance
		});

		test("handles file with only type declarations", () => {
			// Test that files with only type declarations are returned unchanged
			const interface_ = createMockInterface("TestInterface");
			const typeAlias = createMockTypeAlias("TestType");

			const members = IArray.fromArray([
				interface_,
				typeAlias,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			expect(result).toBe(file); // Should return the same instance
		});

		test("merges with existing global namespace", () => {
			// Test that if a global namespace already exists, new globals are merged with it
			const existingGlobal = TsDeclNamespace.create(
				Comments.empty(),
				false, // declared
				TsIdentGlobal,
				IArray.fromArray([createMockVar("existingVar")] as TsContainerOrDecl[]),
				createHasPath("test", TsIdentGlobal.value),
				JsLocation.zero(),
			);
			const function_ = createMockFunction("newFunction");

			const members = IArray.fromArray([
				existingGlobal,
				function_,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			// Should have a single global namespace with merged content
			const globalNamespace = result.members.find(
				(member) =>
					member._tag === "TsDeclNamespace" &&
					(member as TsDeclNamespace).name.value === TsIdentGlobal.value,
			) as TsDeclNamespace;

			expect(globalNamespace).toBeDefined();
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.members.length).toBeGreaterThan(1); // Should contain both existing and new members
		});

		test("handles complex mixed content", () => {
			// Test with a complex mix of different declaration types
			const interface_ = createMockInterface("TestInterface");
			const clazz = createMockClass("TestClass");
			const function_ = createMockFunction("testFunction");
			const variable = createMockVar("testVar");
			const enum_ = createMockEnum("TestEnum");
			const typeAlias = createMockTypeAlias("TestType");

			const members = IArray.fromArray([
				interface_,
				clazz,
				function_,
				variable,
				enum_,
				typeAlias,
			] as TsContainerOrDecl[]);
			const file = createMockParsedFile(members);

			const result = MoveGlobals.apply(file);

			expect(result).not.toBe(file); // Should return a new instance

			// Should have type declarations at top level
			const topLevelTypes = result.members.filter(
				(member) =>
					member._tag === "TsDeclInterface" ||
					member._tag === "TsDeclTypeAlias" ||
					member._tag === "TsDeclEnum",
			);
			expect(topLevelTypes.length).toBe(4); // interface, class->interface, enum, typeAlias

			// Should have a global namespace with value declarations
			const globalNamespace = result.members.find(
				(member) => member._tag === "TsDeclNamespace",
			) as TsDeclNamespace;
			expect(globalNamespace).toBeDefined();
			expect(globalNamespace.members.length).toBeGreaterThan(0);
		});
	});
});
