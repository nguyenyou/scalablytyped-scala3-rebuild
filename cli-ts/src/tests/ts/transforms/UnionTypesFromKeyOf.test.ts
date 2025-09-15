/**
 * Tests for UnionTypesFromKeyOf transformation
 * Port of org.scalablytyped.converter.internal.ts.transforms.UnionTypesFromKeyOfTests
 */

import { describe, expect, test } from "bun:test";
import { IArray } from "@/internal/IArray.js";
import {
	UnionTypesFromKeyOf,
	UnionTypesFromKeyOfTransform,
} from "@/internal/ts/transforms/UnionTypesFromKeyOf.js";
import {
	createIArray,
	createKeyOfType,
	createMockInterface,
	createMockProperty,
	createMockScope,
	createTypeRef,
} from "@/tests/utils/TestUtils.js";

describe("UnionTypesFromKeyOf", () => {
	describe("Basic Functionality", () => {
		test("extends TreeTransformationScopedChanges", () => {
			const transformation = new UnionTypesFromKeyOf();
			expect(transformation).toBeInstanceOf(UnionTypesFromKeyOf);
			expect(typeof transformation.enterTsType).toBe("function");
		});

		test("has enterTsType method", () => {
			const scope = createMockScope();
			const keyOfType = createKeyOfType(createTypeRef("TestInterface"));
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);
			expect(result).toBeDefined();
			expect(result._tag).toBeDefined();
		});
	});

	describe("Interface Property Extraction", () => {
		test("converts keyof interface with properties to union of string literals", () => {
			const prop1 = createMockProperty("name");
			const prop2 = createMockProperty("age");
			const prop3 = createMockProperty("email");
			const personInterface = createMockInterface(
				"Person",
				createIArray([prop1, prop2, prop3]),
			);
			const scope = createMockScope("test-lib", personInterface);

			const keyOfType = createKeyOfType(createTypeRef("Person"));
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);

			expect(result._tag).toBe("TsTypeUnion");
			const union = result as any; // TsTypeUnion
			expect(union.types.length).toBe(3);

			// Check that all types are string literals
			const literals = union.types
				.toArray()
				.map((t: any) => t.literal?.value)
				.filter(Boolean);
			expect(literals).toContain("name");
			expect(literals).toContain("age");
			expect(literals).toContain("email");
		});

		test("handles interface with single property", () => {
			const prop = createMockProperty("singleProp");
			const singlePropInterface = createMockInterface(
				"SingleProp",
				createIArray([prop]),
			);
			const scope = createMockScope("test-lib", singlePropInterface);

			const keyOfType = createKeyOfType(createTypeRef("SingleProp"));
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);

			// Single property should result in a single literal type, not a union
			expect(result._tag).toBe("TsTypeLiteral");
			const literal = result as any; // TsTypeLiteral
			expect(literal.literal.value).toBe("singleProp");
		});

		test("handles interface with no properties", () => {
			const emptyInterface = createMockInterface(
				"EmptyInterface",
				IArray.Empty,
			);
			const scope = createMockScope("test-lib", emptyInterface);

			const keyOfType = createKeyOfType(createTypeRef("EmptyInterface"));
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);

			// Should preserve original keyof type when no properties
			expect(result._tag).toBe("TsTypeKeyOf");
			expect(result).toBe(keyOfType);
		});

		test("handles interface with mixed member types", () => {
			const prop1 = createMockProperty("normalProp");
			const prop2 = createMockProperty("optionalProp");
			const prop3 = createMockProperty("readonlyProp", undefined, false, true);

			// Note: In a real scenario, we might have methods and other members too,
			// but our transform only extracts properties
			const mixedInterface = createMockInterface(
				"MixedInterface",
				createIArray([prop1, prop2, prop3]),
			);
			const scope = createMockScope("test-lib", mixedInterface);

			const keyOfType = createKeyOfType(createTypeRef("MixedInterface"));
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);

			expect(result._tag).toBe("TsTypeUnion");
			const union = result as any; // TsTypeUnion
			expect(union.types.length).toBe(3);

			const literals = union.types
				.toArray()
				.map((t: any) => t.literal?.value)
				.filter(Boolean);
			expect(literals.sort()).toEqual([
				"normalProp",
				"optionalProp",
				"readonlyProp",
			]);
		});
	});

	describe("Non-Interface Types", () => {
		test("preserves keyof for non-existent types", () => {
			const scope = createMockScope(); // Empty scope

			const keyOfType = createKeyOfType(createTypeRef("NonExistentType"));
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);

			// Should preserve original keyof type since type doesn't exist
			expect(result._tag).toBe("TsTypeKeyOf");
			expect(result).toBe(keyOfType);
		});

		test("preserves keyof for type references with type parameters", () => {
			const prop = createMockProperty("value");
			const genericInterface = createMockInterface(
				"GenericInterface",
				createIArray([prop]),
			);
			const scope = createMockScope("test-lib", genericInterface);

			// Create a type reference with type parameters
			const genericTypeRef = createTypeRef(
				"GenericInterface",
				createIArray([createTypeRef("string")]),
			);
			const keyOfType = createKeyOfType(genericTypeRef);
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);

			// Should preserve original keyof type since it has type parameters
			expect(result._tag).toBe("TsTypeKeyOf");
			expect(result).toBe(keyOfType);
		});
	});

	describe("Edge Cases and Error Handling", () => {
		test("handles non-keyof types unchanged", () => {
			const scope = createMockScope();
			const regularType = createTypeRef("RegularType");
			const result =
				UnionTypesFromKeyOfTransform.enterTsType(scope)(regularType);

			// Should return the same type unchanged
			expect(result).toBe(regularType);
		});

		test("handles keyof with non-type-ref key", () => {
			const scope = createMockScope();
			// Create a keyof with a literal type as the key (unusual but possible)
			const literalType = {
				_tag: "TsTypeLiteral",
				literal: { value: "test" },
				asString: '"test"',
			} as any;
			const keyOfType = createKeyOfType(literalType);
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);

			// Should preserve original keyof type since key is not a type reference
			expect(result._tag).toBe("TsTypeKeyOf");
			expect(result).toBe(keyOfType);
		});
	});

	describe("Real-World Patterns", () => {
		test("handles DOM-like interface", () => {
			const idProp = createMockProperty("id");
			const classNameProp = createMockProperty("className");
			const tagNameProp = createMockProperty("tagName");
			const childrenProp = createMockProperty("children");

			const domElement = createMockInterface(
				"Element",
				createIArray([idProp, classNameProp, tagNameProp, childrenProp]),
			);
			const scope = createMockScope("test-lib", domElement);

			const keyOfType = createKeyOfType(createTypeRef("Element"));
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);

			expect(result._tag).toBe("TsTypeUnion");
			const union = result as any; // TsTypeUnion
			expect(union.types.length).toBe(4);

			const literals = union.types
				.toArray()
				.map((t: any) => t.literal?.value)
				.filter(Boolean);
			expect(literals.sort()).toEqual([
				"children",
				"className",
				"id",
				"tagName",
			]);
		});

		test("handles API response interface", () => {
			const dataProp = createMockProperty("data");
			const statusProp = createMockProperty("status");
			const messageProp = createMockProperty("message");
			const timestampProp = createMockProperty("timestamp");

			const apiResponse = createMockInterface(
				"ApiResponse",
				createIArray([dataProp, statusProp, messageProp, timestampProp]),
			);
			const scope = createMockScope("test-lib", apiResponse);

			const keyOfType = createKeyOfType(createTypeRef("ApiResponse"));
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);

			expect(result._tag).toBe("TsTypeUnion");
			const union = result as any; // TsTypeUnion
			expect(union.types.length).toBe(4);

			const literals = union.types
				.toArray()
				.map((t: any) => t.literal?.value)
				.filter(Boolean);
			expect(literals.sort()).toEqual([
				"data",
				"message",
				"status",
				"timestamp",
			]);
		});
	});

	describe("Integration", () => {
		test("works with transform instance", () => {
			const prop1 = createMockProperty("name");
			const prop2 = createMockProperty("value");
			const testInterface = createMockInterface(
				"TestInterface",
				createIArray([prop1, prop2]),
			);
			const scope = createMockScope("test-lib", testInterface);

			const keyOfType = createKeyOfType(createTypeRef("TestInterface"));
			const result = UnionTypesFromKeyOfTransform.enterTsType(scope)(keyOfType);

			expect(result._tag).toBe("TsTypeUnion");
			const union = result as any; // TsTypeUnion

			// Verify the union is properly formed for other transforms
			expect(union.types.length).toBe(2);
			expect(
				union.types.toArray().every((t: any) => t._tag === "TsTypeLiteral"),
			).toBe(true);
		});
	});
});
