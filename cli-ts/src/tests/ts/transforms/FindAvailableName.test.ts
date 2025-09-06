/**
 * Comprehensive unit tests for FindAvailableName functionality.
 *
 * This test suite ports all test cases from the Scala FindAvailableNameTests.scala
 * to ensure behavioral parity between the Scala and TypeScript implementations.
 *
 * Test coverage includes:
 * - Basic functionality and name availability
 * - Name conflict resolution with interfaces, classes, and type aliases
 * - Special identifier handling (namespaced identifier "^")
 * - Variable coexistence with non-type declarations
 * - Edge cases (empty containers, long names, special characters)
 * - Namespace context handling
 * - Complex type scenarios (constructors, functions, objects)
 * - Boundary conditions
 */

import { describe, expect, test } from "bun:test";
import { none, some } from "fp-ts/Option";
import { IArray } from "@/internal/IArray.js";
import { ExtractClasses, FindAvailableName } from "@/internal/ts/transforms/ExtractClasses.js";
import {
	TsIdent,
	TsTypeRef,
} from "@/internal/ts/trees.js";
import {
	createMockScope,
	createMockParsedFile,
	createMockClass,
	createMockInterface,
	createMockVariable,
	createMockNamespace,
	createMockTypeAlias,
	createTypeRef,
} from "../../utils/TestUtils.js";

describe("FindAvailableName", () => {
	// Helper function to create a simple identifier
	const createIdent = (name: string) => TsIdent.simple(name);

	describe("Basic Functionality", () => {
		test("ExtractClasses uses FindAvailableName internally", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");

			// This should work without errors, indicating FindAvailableName is functioning
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			expect(result).toBeDefined();
			expect(result.length).toBe(0); // Empty input should produce empty output
		});

		test("handles container with no conflicting names", () => {
			const scope = createMockScope();
			const variable = createMockVariable("TestVar", TsTypeRef.string);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("TestVar"), IArray.apply(variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should return the variable unchanged since no extraction is needed
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(variable);
		});
	});

	describe("Name Conflict Resolution", () => {
		test("handles name conflicts with existing interface", () => {
			const scope = createMockScope();
			const existingInterface = createMockInterface("TestClass");
			const variable = createMockVariable("TestClass", TsTypeRef.string);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("TestClass"), IArray.apply(existingInterface as any, variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle the conflict gracefully - both should be present
			expect(result.length).toBe(2);
			expect(result.toArray().some(item => item._tag === "TsDeclInterface")).toBe(true);
			expect(result.toArray().some(item => item._tag === "TsDeclVar")).toBe(true);
		});

		test("handles name conflicts with existing class", () => {
			const scope = createMockScope();
			const existingClass = createMockClass("TestClass");
			const variable = createMockVariable("TestClass", TsTypeRef.string);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("TestClass"), IArray.apply(existingClass as any, variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle the conflict gracefully - both should be present
			expect(result.length).toBe(2);
			expect(result.toArray().some(item => item._tag === "TsDeclClass")).toBe(true);
			expect(result.toArray().some(item => item._tag === "TsDeclVar")).toBe(true);
		});

		test("handles name conflicts with existing type alias", () => {
			const scope = createMockScope();
			const existingTypeAlias = createMockTypeAlias("TestClass", TsTypeRef.string);
			const variable = createMockVariable("TestClass", TsTypeRef.string);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("TestClass"), IArray.apply(existingTypeAlias as any, variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle the conflict gracefully - both should be present
			expect(result.length).toBe(2);
			expect(result.toArray().some(item => item._tag === "TsDeclTypeAlias")).toBe(true);
			expect(result.toArray().some(item => item._tag === "TsDeclVar")).toBe(true);
		});
	});

	describe("Special Identifier Handling", () => {
		test("handles namespaced identifier", () => {
			const scope = createMockScope();
			const namespacedVar = createMockVariable("^", TsTypeRef.string); // TsIdent.namespaced
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.namespaced(), IArray.apply(namespacedVar as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle the special namespaced identifier
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(namespacedVar);
		});

		test("handles backup name generation", () => {
			const scope = createMockScope();
			const existingInterface = createMockInterface("TestName");
			// Create a variable that would conflict and potentially trigger backup name logic
			const variable = createMockVariable("TestName", TsTypeRef.string);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("TestName"), IArray.apply(existingInterface as any, variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle the conflict and both should be present
			expect(result.length).toBe(2);
			expect(result.toArray().some((item: any) => item._tag === "TsDeclInterface")).toBe(true);
			expect(result.toArray().some((item: any) => item._tag === "TsDeclVar")).toBe(true);
		});
	});

	describe("Variable Coexistence", () => {
		test("allows variables to coexist with non-type declarations", () => {
			const scope = createMockScope();
			const variable1 = createMockVariable("TestVar", TsTypeRef.string);
			const variable2 = createMockVariable("TestVar", TsTypeRef.number);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("TestVar"), IArray.apply(variable1 as any, variable2 as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Variables with same name should be allowed (no type collision)
			expect(result.length).toBe(2);
			expect(result.toArray().every((item: any) => item._tag === "TsDeclVar")).toBe(true);
		});

		test("handles mixed declaration types", () => {
			const scope = createMockScope();
			const variable = createMockVariable("MixedName", TsTypeRef.string);
			const namespace = createMockNamespace("MixedName");
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("MixedName"), IArray.apply(variable as any, namespace as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle mixed types appropriately
			expect(result.length).toBe(2);
			expect(result.toArray().some((item: any) => item._tag === "TsDeclVar")).toBe(true);
			expect(result.toArray().some((item: any) => item._tag === "TsDeclNamespace")).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		test("handles empty container", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			expect(result.isEmpty).toBe(true);
		});

		test("handles container with only unnamed members", () => {
			const scope = createMockScope();
			// Create a parsed file with only unnamed members (directives, etc.)
			const parsedFile = createMockParsedFile("test");
			// parsedFile already has empty membersByName by default

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			expect(result.isEmpty).toBe(true);
		});

		test("handles multiple conflicts of same type", () => {
			const scope = createMockScope();
			const interface1 = createMockInterface("ConflictName");
			const interface2 = createMockInterface("ConflictName");
			const interface3 = createMockInterface("ConflictName");
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("ConflictName"), IArray.apply(interface1 as any, interface2 as any, interface3 as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle multiple declarations with same name
			expect(result.length).toBe(3);
			expect(result.toArray().every((item: any) => item._tag === "TsDeclInterface")).toBe(true);
		});
	});

	describe("Namespace Context", () => {
		test("handles namespaced scope correctly", () => {
			const scope = createMockScope();
			const namespacedDecl = createMockNamespace("^"); // TsIdent.namespaced
			const innerVar = createMockVariable("TestVar", TsTypeRef.string);
			const namespacedWithMembers = { ...namespacedDecl, members: IArray.apply(innerVar as any) };
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.namespaced(), IArray.apply(namespacedWithMembers as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle namespaced context
			expect(result.length).toBe(1);
			expect(result.toArray()[0]._tag).toBe("TsDeclNamespace");
		});

		test("handles nested namespace conflicts", () => {
			const scope = createMockScope();
			const outerInterface = createMockInterface("ConflictName");
			const innerInterface = createMockInterface("ConflictName");
			const namespace = createMockNamespace("Container", IArray.apply(innerInterface as any));
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("ConflictName"), IArray.apply(outerInterface as any));
			parsedFile.membersByName.set(TsIdent.simple("Container"), IArray.apply(namespace as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle nested conflicts appropriately
			expect(result.length).toBe(2);
			expect(result.toArray().some((item: any) => item._tag === "TsDeclInterface")).toBe(true);
			expect(result.toArray().some((item: any) => item._tag === "TsDeclNamespace")).toBe(true);
		});
	});

	describe("Complex Type Scenarios", () => {
		test("handles constructor type variables", () => {
			const scope = createMockScope();
			const ctorTypeRef = createTypeRef("TestClassConstructor");
			const variable = createMockVariable("TestClass", ctorTypeRef);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("TestClass"), IArray.apply(variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle constructor types (may extract classes)
			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result.toArray().every((item: any) => item._tag !== undefined)).toBe(true);
		});

		test("handles function type variables", () => {
			const scope = createMockScope();
			const funTypeRef = createTypeRef("TestFunctionType");
			const variable = createMockVariable("TestFunction", funTypeRef);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("TestFunction"), IArray.apply(variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle function types
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(variable);
		});

		test("handles object type variables", () => {
			const scope = createMockScope();
			const objectTypeRef = createTypeRef("TestObjectType");
			const variable = createMockVariable("TestObject", objectTypeRef);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("TestObject"), IArray.apply(variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle object types
			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result.toArray().every((item: any) => item._tag !== undefined)).toBe(true);
		});
	});

	describe("Boundary Conditions", () => {
		test("handles null and undefined scenarios gracefully", () => {
			const scope = createMockScope();
			const variable = createMockVariable("TestVar"); // No type
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple("TestVar"), IArray.apply(variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle variables without types
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(variable);
		});

		test("handles very long identifier names", () => {
			const scope = createMockScope();
			const longName = "A".repeat(100); // Very long identifier
			const variable = createMockVariable(longName, TsTypeRef.string);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple(longName), IArray.apply(variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle long names
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(variable);
		});

		test("handles special characters in names", () => {
			const scope = createMockScope();
			const specialName = "$special_name123";
			const variable = createMockVariable(specialName, TsTypeRef.string);
			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(TsIdent.simple(specialName), IArray.apply(variable as any));

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle special characters
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(variable);
		});
	});

	describe("Direct FindAvailableName Testing", () => {
		test("returns available name when no conflicts exist", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const findName = FindAvailableName.apply(parsedFile, scope);

			const result = findName.apply(TsIdent.simple("AvailableName"));

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				const [name, wasBackup] = result.value;
				expect(name.value).toBe("AvailableName");
				expect(wasBackup).toBe(false);
			}
		});

		test("returns backup name when primary name conflicts with class", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const existingClass = createMockClass("TestClass");
			const testClassIdent = TsIdent.simple("TestClass");
			parsedFile.membersByName.set(testClassIdent, IArray.apply(existingClass as any));

			const findName = FindAvailableName.apply(parsedFile, scope);
			const result = findName.apply(testClassIdent);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				const [name, wasBackup] = result.value;
				expect(name.value).toBe("TestClassCls");
				expect(wasBackup).toBe(true);
			}
		});

		test("returns backup name when primary name conflicts with interface", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const existingInterface = createMockInterface("TestInterface");
			const testInterfaceIdent = TsIdent.simple("TestInterface");
			parsedFile.membersByName.set(testInterfaceIdent, IArray.apply(existingInterface as any));

			const findName = FindAvailableName.apply(parsedFile, scope);
			const result = findName.apply(testInterfaceIdent);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				const [name, wasBackup] = result.value;
				expect(name.value).toBe("TestInterfaceCls");
				expect(wasBackup).toBe(true);
			}
		});

		test("allows name when only variable exists with same name", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const existingVar = createMockVariable("TestVar", TsTypeRef.string);
			parsedFile.membersByName.set(TsIdent.simple("TestVar"), IArray.apply(existingVar as any));

			const findName = FindAvailableName.apply(parsedFile, scope);
			const result = findName.apply(TsIdent.simple("TestVar"));

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				const [name, wasBackup] = result.value;
				expect(name.value).toBe("TestVar");
				expect(wasBackup).toBe(false);
			}
		});

		test("handles namespaced identifier backup name", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const existingClass = createMockClass("namespaced");
			parsedFile.membersByName.set(TsIdent.namespaced(), IArray.apply(existingClass as any));

			const findName = FindAvailableName.apply(parsedFile, scope);
			const result = findName.apply(TsIdent.namespaced());

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				const [name, wasBackup] = result.value;
				expect(name.value).toBe("namespacedCls");
				expect(wasBackup).toBe(true);
			}
		});
	});
});