/**
 * Tests for DropProperties transformation
 * Port of org.scalablytyped.converter.internal.ts.transforms.DropPropertiesTests
 */

import { describe, expect, test } from "vitest";
import { IArray } from "@/internal/IArray.js";
import {
	DropProperties,
	DropPropertiesTransform,
} from "@/internal/ts/transforms/DropProperties.js";
import { TsTypeRef } from "@/internal/ts/trees.js";
import {
	createIArray,
	createMockInterface,
	createMockMethod,
	createMockNamespace,
	createMockProperty,
	createMockScope,
	createMockVariable,
} from "@/tests/utils/TestUtils.js";

// Helper function to create a mock TsDeclVar (named value declaration)
// This is a specialized version for DropProperties tests
function createMockNamedValueDecl(name: string) {
	return createMockVariable(name, TsTypeRef.string);
}

describe("DropProperties", () => {
	describe("Basic Functionality", () => {
		test("extends TransformMembers and TransformClassMembers", () => {
			const transformation = new DropProperties();
			expect(transformation).toBeInstanceOf(DropProperties);
			expect(typeof transformation.newMembers).toBe("function");
			expect(typeof transformation.newClassMembers).toBe("function");
		});

		test("has newMembers method", () => {
			const scope = createMockScope();
			const namespace = createMockNamespace("test");
			const result = DropPropertiesTransform.newMembers(scope, namespace);
			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThanOrEqual(0);
		});

		test("has newClassMembers method", () => {
			const scope = createMockScope();
			const interface_ = createMockInterface("test");
			const result = DropPropertiesTransform.newClassMembers(scope, interface_);
			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Container Member Filtering", () => {
		test("filters out __promisify__ named value declarations", () => {
			const scope = createMockScope();
			const promisifyDecl = createMockNamedValueDecl("__promisify__");
			const normalDecl = createMockNamedValueDecl("normalVar");
			const namespace = createMockNamespace(
				"test",
				createIArray([promisifyDecl, normalDecl]),
			);

			const result = DropPropertiesTransform.newMembers(scope, namespace);

			expect(result.length).toBe(1);
			expect(
				result
					.toArray()
					.some(
						(decl: any) =>
							decl._tag === "TsDeclVar" && decl.name.value === "normalVar",
					),
			).toBe(true);
			expect(
				result
					.toArray()
					.some(
						(decl: any) =>
							decl._tag === "TsDeclVar" && decl.name.value === "__promisify__",
					),
			).toBe(false);
		});

		test("keeps non-__promisify__ declarations", () => {
			const scope = createMockScope();
			const normalDecl1 = createMockNamedValueDecl("normalVar1");
			const normalDecl2 = createMockNamedValueDecl("normalVar2");
			const namespace = createMockNamespace(
				"test",
				createIArray([normalDecl1, normalDecl2]),
			);

			const result = DropPropertiesTransform.newMembers(scope, namespace);

			expect(result.length).toBe(2);
			expect(result.toArray()).toContain(normalDecl1);
			expect(result.toArray()).toContain(normalDecl2);
		});

		test("handles mixed member types", () => {
			const scope = createMockScope();
			const promisifyDecl = createMockNamedValueDecl("__promisify__");
			const normalDecl = createMockNamedValueDecl("normalVar");
			const interface_ = createMockInterface("TestInterface");
			const namespace = createMockNamespace(
				"test",
				createIArray([promisifyDecl, normalDecl, interface_]),
			);

			const result = DropPropertiesTransform.newMembers(scope, namespace);

			expect(result.length).toBe(2);
			expect(result.toArray()).toContain(normalDecl);
			expect(result.toArray()).toContain(interface_);
			expect(result.toArray()).not.toContain(promisifyDecl);
		});
	});

	describe("Class Member Filtering", () => {
		test("filters out prototype properties", () => {
			const scope = createMockScope();
			const prototypeProperty = createMockProperty("prototype");
			const normalProperty = createMockProperty("normalProp");
			const interface_ = createMockInterface(
				"test",
				createIArray([prototypeProperty, normalProperty]),
			);

			const result = DropPropertiesTransform.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(normalProperty);
			expect(result.toArray()).not.toContain(prototypeProperty);
		});

		test("filters out unicode escape properties", () => {
			const scope = createMockScope();
			const unicodeProperty = createMockProperty("\\u0041"); // \u0041 is 'A'
			const normalProperty = createMockProperty("normalProp");
			const interface_ = createMockInterface(
				"test",
				createIArray([unicodeProperty, normalProperty]),
			);

			const result = DropPropertiesTransform.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(normalProperty);
			expect(result.toArray()).not.toContain(unicodeProperty);
		});

		test("filters out properties with never type", () => {
			const scope = createMockScope();
			const neverProperty = createMockProperty("neverProp", TsTypeRef.never);
			const normalProperty = createMockProperty("normalProp");
			const interface_ = createMockInterface(
				"test",
				createIArray([neverProperty, normalProperty]),
			);

			const result = DropPropertiesTransform.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(normalProperty);
			expect(result.toArray()).not.toContain(neverProperty);
		});

		test("keeps non-property members unchanged", () => {
			const scope = createMockScope();
			const method = createMockMethod("testMethod");
			const normalProperty = createMockProperty("normalProp");
			const interface_ = createMockInterface(
				"test",
				createIArray([method, normalProperty]),
			);

			const result = DropPropertiesTransform.newClassMembers(scope, interface_);

			expect(result.length).toBe(2);
			expect(result.toArray()).toContain(method);
			expect(result.toArray()).toContain(normalProperty);
		});

		test("handles all filtering rules together", () => {
			const scope = createMockScope();
			const prototypeProperty = createMockProperty("prototype");
			const unicodeProperty1 = createMockProperty("\\u0041");
			const normalProperty1 = createMockProperty("normalProp1");
			const unicodeProperty2 = createMockProperty("\\u1234");
			const neverProperty = createMockProperty("neverProp", TsTypeRef.never);
			const normalProperty2 = createMockProperty("normalProp2");
			const method = createMockMethod("testMethod");

			const interface_ = createMockInterface(
				"RealWorldInterface",
				createIArray([
					prototypeProperty,
					unicodeProperty1,
					normalProperty1,
					unicodeProperty2,
					neverProperty,
					normalProperty2,
					method,
				]),
			);

			const result = DropPropertiesTransform.newClassMembers(scope, interface_);

			expect(result.length).toBe(3);
			expect(result.toArray()).toContain(normalProperty1);
			expect(result.toArray()).toContain(normalProperty2);
			expect(result.toArray()).toContain(method);
			expect(result.toArray()).not.toContain(prototypeProperty);
			expect(result.toArray()).not.toContain(unicodeProperty1);
			expect(result.toArray()).not.toContain(unicodeProperty2);
			expect(result.toArray()).not.toContain(neverProperty);
		});
	});

	describe("Edge Cases", () => {
		test("handles properties with no type", () => {
			const scope = createMockScope();
			const noTypeProperty = createMockProperty("noTypeProp", undefined);
			const interface_ = createMockInterface(
				"test",
				createIArray([noTypeProperty]),
			);

			const result = DropPropertiesTransform.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(noTypeProperty);
		});

		test("handles unicode properties that don't start with \\u", () => {
			const scope = createMockScope();
			const unicodeInMiddle = createMockProperty("prop\\u1234");
			const interface_ = createMockInterface(
				"test",
				createIArray([unicodeInMiddle]),
			);

			const result = DropPropertiesTransform.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(unicodeInMiddle);
		});

		test("handles empty member lists", () => {
			const scope = createMockScope();
			const interface_ = createMockInterface("test", IArray.Empty);

			const result = DropPropertiesTransform.newClassMembers(scope, interface_);

			expect(result.length).toBe(0);
		});

		test("handles empty container member lists", () => {
			const scope = createMockScope();
			const namespace = createMockNamespace("test", IArray.Empty);

			const result = DropPropertiesTransform.newMembers(scope, namespace);

			expect(result.length).toBe(0);
		});
	});

	describe("Integration Scenarios", () => {
		test("works with classes", () => {
			const scope = createMockScope();
			const prototypeProperty = createMockProperty("prototype");
			const normalProperty = createMockProperty("normalProp");

			// Create a mock class with members - use interface as base since it has the right member type
			const interface_ = createMockInterface(
				"TestClass",
				createIArray([prototypeProperty, normalProperty]),
			);

			const result = DropPropertiesTransform.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(normalProperty);
		});

		test("singleton instance works correctly", () => {
			const scope = createMockScope();
			const promisifyDecl = createMockNamedValueDecl("__promisify__");
			const normalDecl = createMockNamedValueDecl("normalVar");
			const namespace = createMockNamespace(
				"test",
				createIArray([promisifyDecl, normalDecl]),
			);

			const result = DropPropertiesTransform.newMembers(scope, namespace);

			expect(result.length).toBe(1);
			expect(
				result
					.toArray()
					.some(
						(decl: any) =>
							decl._tag === "TsDeclVar" && decl.name.value === "normalVar",
					),
			).toBe(true);
		});
	});
});
