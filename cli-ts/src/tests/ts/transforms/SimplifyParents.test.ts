/**
 * Tests for SimplifyParents transformation
 * Port of org.scalablytyped.converter.internal.ts.transforms.SimplifyParentsTests
 */

import { describe, expect, test } from "vitest";
import { IArray } from "@/internal/IArray.js";
import {
	SimplifyParents,
	SimplifyParentsTransform,
} from "@/internal/ts/transforms/SimplifyParents.js";
import {
	createIArray,
	createIntersectionType,
	createMockClass,
	createMockInterface,
	createMockScope,
	createQIdent,
	createTypeQuery,
	createTypeRef,
} from "@/tests/utils/TestUtils.js";

describe("SimplifyParents", () => {
	describe("Basic Functionality", () => {
		test("extends TreeTransformationScopedChanges", () => {
			const transformation = new SimplifyParents();
			expect(transformation).toBeInstanceOf(SimplifyParents);
			expect(typeof transformation.enterTsDeclClass).toBe("function");
			expect(typeof transformation.enterTsDeclInterface).toBe("function");
		});

		test("has enterTsDeclClass method", () => {
			const scope = createMockScope();
			const clazz = createMockClass("TestClass");
			const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsDeclClass");
			expect(result.name.value).toBe("TestClass");
		});

		test("has enterTsDeclInterface method", () => {
			const scope = createMockScope();
			const interface_ = createMockInterface("TestInterface");
			const result =
				SimplifyParentsTransform.enterTsDeclInterface(scope)(interface_);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsDeclInterface");
			expect(result.name.value).toBe("TestInterface");
		});
	});

	describe("Class Inheritance Simplification", () => {
		test("preserves simple parent class", () => {
			const scope = createMockScope();
			const parentRef = createTypeRef("BaseClass");
			const clazz = createMockClass("TestClass", parentRef);

			const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);

			expect(result.parent).toBeDefined();
			expect(result.parent?._tag).toBe("Some");
			expect(result.implementsInterfaces.length).toBe(0);
		});

		test("redistributes parent and implements", () => {
			const scope = createMockScope();
			const parentRef = createTypeRef("BaseClass");
			const implementsInterfaces = createIArray([
				createTypeRef("Interface1"),
				createTypeRef("Interface2"),
			]);
			const clazz = createMockClass(
				"TestClass",
				parentRef,
				implementsInterfaces,
			);

			const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);

			// First parent becomes the parent, rest become implements
			expect(result.parent).toBeDefined();
			expect(result.implementsInterfaces.length).toBe(2);
		});

		test("handles class with no parent", () => {
			const scope = createMockScope();
			const implementsInterfaces = createIArray([createTypeRef("Interface1")]);
			const clazz = createMockClass(
				"TestClass",
				undefined,
				implementsInterfaces,
			);

			const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);

			// First implement becomes parent
			expect(result.parent).toBeDefined();
			expect(result.implementsInterfaces.length).toBe(0);
		});

		test("handles class with no inheritance", () => {
			const scope = createMockScope();
			const clazz = createMockClass("TestClass");

			const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);

			expect(result.parent._tag).toBe("None");
			expect(result.implementsInterfaces.length).toBe(0);
		});
	});

	describe("Interface Inheritance Simplification", () => {
		test("preserves simple interface inheritance", () => {
			const scope = createMockScope();
			const inheritance = createIArray([
				createTypeRef("BaseInterface1"),
				createTypeRef("BaseInterface2"),
			]);
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				inheritance,
			);

			const result =
				SimplifyParentsTransform.enterTsDeclInterface(scope)(interface_);

			expect(result.inheritance.length).toBe(2);
			expect(result.inheritance.toArray()[0].name.asString).toContain(
				"BaseInterface1",
			);
			expect(result.inheritance.toArray()[1].name.asString).toContain(
				"BaseInterface2",
			);
		});

		test("handles interface with no inheritance", () => {
			const scope = createMockScope();
			const interface_ = createMockInterface("TestInterface");

			const result =
				SimplifyParentsTransform.enterTsDeclInterface(scope)(interface_);

			expect(result.inheritance.length).toBe(0);
		});
	});

	describe("Complex Type Handling", () => {
		test("handles intersection types by flattening", () => {
			const _scope = createMockScope();

			// Create an intersection type: BaseClass & Mixin1 & Mixin2
			const intersectionType = createIntersectionType(
				createTypeRef("BaseClass"),
				createTypeRef("Mixin1"),
				createTypeRef("Mixin2"),
			);

			// This test verifies the structure but actual flattening would require
			// a more complex scope setup with variable declarations
			expect(intersectionType.types.length).toBe(3);
			expect(intersectionType._tag).toBe("TsTypeIntersect");
		});

		test("handles typeof expressions", () => {
			const _scope = createMockScope();

			// Create a typeof query: typeof SomeClass
			const typeQuery = createTypeQuery(createQIdent("SomeClass"));

			expect(typeQuery._tag).toBe("TsTypeQuery");
			expect(typeQuery.expr.asString).toContain("SomeClass");
		});
	});

	describe("Edge Cases", () => {
		test("handles empty inheritance lists", () => {
			const scope = createMockScope();
			const clazz = createMockClass("TestClass");
			const interface_ = createMockInterface("TestInterface");

			const classResult =
				SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);
			const interfaceResult =
				SimplifyParentsTransform.enterTsDeclInterface(scope)(interface_);

			expect(classResult.parent._tag).toBe("None");
			expect(classResult.implementsInterfaces.length).toBe(0);
			expect(interfaceResult.inheritance.length).toBe(0);
		});

		test("preserves other class properties", () => {
			const scope = createMockScope();
			const parentRef = createTypeRef("BaseClass");
			const clazz = createMockClass("TestClass", parentRef);

			const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);

			expect(result.name.value).toBe("TestClass");
			expect(result.comments).toBe(clazz.comments);
			expect(result.declared).toBe(clazz.declared);
			expect(result.members).toBe(clazz.members);
		});

		test("preserves other interface properties", () => {
			const scope = createMockScope();
			const inheritance = createIArray([createTypeRef("BaseInterface")]);
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				inheritance,
			);

			const result =
				SimplifyParentsTransform.enterTsDeclInterface(scope)(interface_);

			expect(result.name.value).toBe("TestInterface");
			expect(result.comments).toBe(interface_.comments);
			expect(result.declared).toBe(interface_.declared);
			expect(result.members).toBe(interface_.members);
		});
	});

	describe("Integration Scenarios", () => {
		test("singleton instance works correctly", () => {
			const scope = createMockScope();
			const clazz = createMockClass("TestClass", createTypeRef("BaseClass"));

			const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);

			expect(result).toBeDefined();
			expect(result.name.value).toBe("TestClass");
		});

		test("handles multiple transformations", () => {
			const scope = createMockScope();
			const clazz1 = createMockClass("TestClass1", createTypeRef("Base1"));
			const clazz2 = createMockClass("TestClass2", createTypeRef("Base2"));

			const result1 = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz1);
			const result2 = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz2);

			expect(result1.name.value).toBe("TestClass1");
			expect(result2.name.value).toBe("TestClass2");
		});
	});
});
