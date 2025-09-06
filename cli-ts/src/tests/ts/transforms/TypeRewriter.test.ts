/**
 * TypeScript port of TypeRewriterTests.scala
 *
 * Tests for the TypeRewriter transform that provides type rewriting functionality
 * for transforming TypeScript AST trees by replacing types according to a replacement map.
 */

import { describe, expect, test } from "bun:test";
import { none, some, type Option } from "fp-ts/Option";
import { NoComments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import {
	TsDeclClass,
	TsDeclInterface,
	TsDeclTypeAlias,
	TsIdent,
	TsIdentSimple,
	TsQIdent,
	type TsTree,
	type TsType,
	TsTypeParam,
	TsTypeRef,
} from "@/internal/ts/trees.js";
import { TypeRewriter } from "@/internal/ts/transforms/TypeRewriter.js";

// ============================================================================
// Helper Functions for Creating Test Data
// ============================================================================

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(name: string): TsQIdent {
	return TsQIdent.of(createSimpleIdent(name));
}

function createTypeRef(
	name: string,
	tparams: IArray<TsType> = IArray.Empty,
): TsTypeRef {
	return TsTypeRef.create(NoComments.instance, createQIdent(name), tparams);
}

function createTypeParam(
	name: string,
	upperBound: Option<TsType> = none,
	default_: Option<TsType> = none,
): TsTypeParam {
	return TsTypeParam.create(
		NoComments.instance,
		createSimpleIdent(name),
		upperBound,
		default_,
	);
}

function createMockClass(
	name: string,
	tparams: IArray<TsTypeParam> = IArray.Empty,
): TsDeclClass {
	return TsDeclClass.create(
		NoComments.instance,
		false, // declared
		false, // isAbstract
		createSimpleIdent(name),
		tparams,
		none, // parent
		IArray.Empty, // implements
		IArray.Empty, // members
		JsLocation.zero(),
		CodePath.noPath(),
	);
}

function createMockInterface(
	name: string,
	tparams: IArray<TsTypeParam> = IArray.Empty,
): TsDeclInterface {
	return TsDeclInterface.create(
		NoComments.instance,
		false, // declared
		createSimpleIdent(name),
		tparams,
		IArray.Empty, // inheritance
		IArray.Empty, // members
		CodePath.noPath(),
	);
}

// ============================================================================
// Test Suite
// ============================================================================

describe("TypeRewriter", () => {
	describe("Basic Functionality", () => {
		test("basic type replacement", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create types for replacement
			const stringType = createTypeRef("string");
			const numberType = createTypeRef("number");
			const replacements = new Map<TsType, TsType>([[stringType, numberType]]);

			// Test leaveTsType method
			const result = rewriter.leaveTsType(replacements)(stringType);

			expect(result).toBe(numberType);
		});

		test("type replacement with no match returns original", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			const stringType = createTypeRef("string");
			const numberType = createTypeRef("number");
			const booleanType = createTypeRef("boolean");
			const replacements = new Map<TsType, TsType>([[stringType, numberType]]);

			// Test with type not in replacement map
			const result = rewriter.leaveTsType(replacements)(booleanType);

			expect(result).toBe(booleanType);
		});

		test("empty replacement map returns original types", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			const stringType = createTypeRef("string");
			const emptyReplacements = new Map<TsType, TsType>();

			const result = rewriter.leaveTsType(emptyReplacements)(stringType);

			expect(result).toBe(stringType);
		});

		test("multiple type replacements", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			const stringType = createTypeRef("string");
			const numberType = createTypeRef("number");
			const booleanType = createTypeRef("boolean");
			const anyType = createTypeRef("any");

			const replacements = new Map<TsType, TsType>([
				[stringType, numberType],
				[booleanType, anyType],
			]);

			expect(rewriter.leaveTsType(replacements)(stringType)).toBe(numberType);
			expect(rewriter.leaveTsType(replacements)(booleanType)).toBe(anyType);
			expect(rewriter.leaveTsType(replacements)(numberType)).toBe(numberType); // not replaced
		});
	});

	describe("Type Parameter Shadowing", () => {
		test("withTree returns same map when tree is base tree", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			const stringType = createTypeRef("string");
			const numberType = createTypeRef("number");
			const replacements = new Map<TsType, TsType>([[stringType, numberType]]);

			const result = rewriter.withTree(replacements, baseTree);

			expect(result).toBe(replacements);
		});

		test("withTree filters out shadowed type parameters", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create a type parameter T
			const tParam = createTypeParam("T");
			const classWithTParam = createMockClass("GenericClass", IArray.fromArray([tParam]));

			// Create a type reference to T that should be filtered out
			const tTypeRef = createTypeRef("T");
			const stringType = createTypeRef("string");
			const numberType = createTypeRef("number");

			const replacements = new Map<TsType, TsType>([
				[tTypeRef, stringType],    // This should be filtered out due to shadowing
				[stringType, numberType],  // This should remain
			]);

			const result = rewriter.withTree(replacements, classWithTParam);

			// T -> string should be filtered out due to shadowing
			expect(result.has(tTypeRef)).toBe(false);

			// string -> number should remain
			expect(result.has(stringType)).toBe(true);
			expect(result.get(stringType)).toBe(numberType);
		});

		test("withTree preserves non-shadowed replacements", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create a type parameter U
			const uParam = createTypeParam("U");
			const classWithUParam = createMockClass("GenericClass", IArray.fromArray([uParam]));

			// Create type references - T is not shadowed, U is shadowed
			const tTypeRef = createTypeRef("T");
			const uTypeRef = createTypeRef("U");
			const stringType = createTypeRef("string");
			const numberType = createTypeRef("number");

			const replacements = new Map<TsType, TsType>([
				[tTypeRef, stringType],    // This should remain (T is not a type param of this class)
				[uTypeRef, numberType],    // This should be filtered out (U is a type param)
				[stringType, numberType],  // This should remain
			]);

			const result = rewriter.withTree(replacements, classWithUParam);

			// T -> string should remain (T is not shadowed)
			expect(result.has(tTypeRef)).toBe(true);
			expect(result.get(tTypeRef)).toBe(stringType);

			// U -> number should be filtered out (U is shadowed)
			expect(result.has(uTypeRef)).toBe(false);

			// string -> number should remain
			expect(result.has(stringType)).toBe(true);
			expect(result.get(stringType)).toBe(numberType);
		});

		test("withTree handles multiple type parameters", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create multiple type parameters
			const tParam = createTypeParam("T");
			const uParam = createTypeParam("U");
			const vParam = createTypeParam("V");
			const classWithMultipleParams = createMockClass("GenericClass", IArray.fromArray([tParam, uParam, vParam]));

			const tTypeRef = createTypeRef("T");
			const uTypeRef = createTypeRef("U");
			const vTypeRef = createTypeRef("V");
			const wTypeRef = createTypeRef("W"); // Not a type parameter
			const stringType = createTypeRef("string");

			const replacements = new Map<TsType, TsType>([
				[tTypeRef, stringType],  // Should be filtered out
				[uTypeRef, stringType],  // Should be filtered out
				[vTypeRef, stringType],  // Should be filtered out
				[wTypeRef, stringType],  // Should remain
			]);

			const result = rewriter.withTree(replacements, classWithMultipleParams);

			// All type parameter references should be filtered out
			expect(result.has(tTypeRef)).toBe(false);
			expect(result.has(uTypeRef)).toBe(false);
			expect(result.has(vTypeRef)).toBe(false);

			// Non-type parameter reference should remain
			expect(result.has(wTypeRef)).toBe(true);
			expect(result.get(wTypeRef)).toBe(stringType);
		});

		test("withTree works with interfaces", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create an interface with type parameter
			const tParam = createTypeParam("T");
			const interfaceWithTParam = createMockInterface("GenericInterface", IArray.fromArray([tParam]));

			const tTypeRef = createTypeRef("T");
			const stringType = createTypeRef("string");
			const replacements = new Map<TsType, TsType>([[tTypeRef, stringType]]);

			const result = rewriter.withTree(replacements, interfaceWithTParam);

			// T should be filtered out due to shadowing
			expect(result.has(tTypeRef)).toBe(false);
		});

		test("withTree works with type aliases", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create a type alias with type parameter
			const tParam = createTypeParam("T");
			const stringType = createTypeRef("string");
			const typeAlias = TsDeclTypeAlias.create(
				NoComments.instance,
				false, // declared
				createSimpleIdent("GenericAlias"),
				IArray.fromArray([tParam]),
				stringType,
				CodePath.noPath(),
			);

			const tTypeRef = createTypeRef("T");
			const numberType = createTypeRef("number");
			const replacements = new Map<TsType, TsType>([[tTypeRef, numberType]]);

			const result = rewriter.withTree(replacements, typeAlias);

			// T should be filtered out due to shadowing
			expect(result.has(tTypeRef)).toBe(false);
		});

		test("withTree handles trees without type parameters", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create a class without type parameters
			const classWithoutParams = createMockClass("SimpleClass", IArray.Empty);

			const tTypeRef = createTypeRef("T");
			const stringType = createTypeRef("string");
			const replacements = new Map<TsType, TsType>([[tTypeRef, stringType]]);

			const result = rewriter.withTree(replacements, classWithoutParams);

			// All replacements should remain since no shadowing occurs
			expect(result).toEqual(replacements);
		});
	});

	describe("Edge Cases and Error Conditions", () => {
		test("handles complex type references with type parameters", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create a type parameter T
			const tParam = createTypeParam("T");
			const classWithTParam = createMockClass("GenericClass", IArray.fromArray([tParam]));

			// Create a complex type reference T<string> (T with type arguments)
			const stringType = createTypeRef("string");
			const complexTTypeRef = createTypeRef("T", IArray.fromArray<TsType>([stringType]));
			const numberType = createTypeRef("number");

			const replacements = new Map<TsType, TsType>([
				[complexTTypeRef, numberType],  // This should be filtered out
			]);

			const result = rewriter.withTree(replacements, classWithTParam);

			// Complex T reference should be filtered out due to shadowing
			expect(result.has(complexTTypeRef)).toBe(false);
		});

		test("handles qualified type references", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create a type parameter T
			const tParam = createTypeParam("T");
			const classWithTParam = createMockClass("GenericClass", IArray.fromArray([tParam]));

			// Create a qualified type reference (e.g., Namespace.T)
			const qualifiedTTypeRef = TsTypeRef.create(
				NoComments.instance,
				TsQIdent.of(createSimpleIdent("Namespace"), createSimpleIdent("T")),
				IArray.Empty,
			);
			const stringType = createTypeRef("string");

			const replacements = new Map<TsType, TsType>([[qualifiedTTypeRef, stringType]]);

			const result = rewriter.withTree(replacements, classWithTParam);

			// Qualified T reference should NOT be filtered out (it's not a simple T reference)
			expect(result.has(qualifiedTTypeRef)).toBe(true);
			expect(result.get(qualifiedTTypeRef)).toBe(stringType);
		});

		test("handles empty replacement map", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			const tParam = createTypeParam("T");
			const classWithTParam = createMockClass("GenericClass", IArray.fromArray([tParam]));

			const emptyReplacements = new Map<TsType, TsType>();

			const result = rewriter.withTree(emptyReplacements, classWithTParam);

			expect(result.size).toBe(0);
		});

		test("handles case sensitivity in type parameter names", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create type parameters with different cases
			const tParam = createTypeParam("T");
			const classWithTParam = createMockClass("GenericClass", IArray.fromArray([tParam]));

			const tLowerTypeRef = createTypeRef("t");  // lowercase t
			const TUpperTypeRef = createTypeRef("T");  // uppercase T
			const stringType = createTypeRef("string");

			const replacements = new Map<TsType, TsType>([
				[tLowerTypeRef, stringType],  // Should remain (different case)
				[TUpperTypeRef, stringType],  // Should be filtered out (exact match)
			]);

			const result = rewriter.withTree(replacements, classWithTParam);

			// lowercase t should remain (different case)
			expect(result.has(tLowerTypeRef)).toBe(true);
			expect(result.get(tLowerTypeRef)).toBe(stringType);

			// uppercase T should be filtered out (exact match)
			expect(result.has(TUpperTypeRef)).toBe(false);
		});
	});

	describe("Integration and Real-World Scenarios", () => {
		test("integration with TreeTransformation workflow", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Simulate a real transformation workflow
			const stringType = createTypeRef("string");
			const numberType = createTypeRef("number");
			const booleanType = createTypeRef("boolean");

			const replacements = new Map<TsType, TsType>([
				[stringType, numberType],
				[booleanType, stringType],
			]);

			// Test that the transformation works correctly
			expect(rewriter.leaveTsType(replacements)(stringType)).toBe(numberType);
			expect(rewriter.leaveTsType(replacements)(booleanType)).toBe(stringType);
			expect(rewriter.leaveTsType(replacements)(numberType)).toBe(numberType);
		});

		test("complex nested type parameter scenarios", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create nested generic structures
			const tParam = createTypeParam("T");
			const uParam = createTypeParam("U");

			// Outer class with T
			const outerClass = createMockClass("Outer", IArray.fromArray([tParam]));

			// Inner interface with U (nested inside outer)
			const innerInterface = createMockInterface("Inner", IArray.fromArray([uParam]));

			const tTypeRef = createTypeRef("T");
			const uTypeRef = createTypeRef("U");
			const stringType = createTypeRef("string");

			const replacements = new Map<TsType, TsType>([
				[tTypeRef, stringType],
				[uTypeRef, stringType],
			]);

			// Test with outer class (T should be filtered)
			const outerResult = rewriter.withTree(replacements, outerClass);
			expect(outerResult.has(tTypeRef)).toBe(false);
			expect(outerResult.has(uTypeRef)).toBe(true); // U is not shadowed in outer class

			// Test with inner interface (U should be filtered)
			const innerResult = rewriter.withTree(replacements, innerInterface);
			expect(innerResult.has(tTypeRef)).toBe(true); // T is not shadowed in inner interface
			expect(innerResult.has(uTypeRef)).toBe(false);
		});

		test("performance with large replacement maps", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Create a large replacement map
			const largeReplacements = new Map<TsType, TsType>();
			const stringType = createTypeRef("string");

			// Store the Type500 reference to use the same object instance
			let type500: TsType | undefined;

			for (let i = 1; i <= 1000; i++) {
				const typeI = createTypeRef(`Type${i}`);
				largeReplacements.set(typeI, stringType);
				if (i === 500) {
					type500 = typeI; // Store the same instance
				}
			}

			// Use the same object instance for lookup
			const result = rewriter.leaveTsType(largeReplacements)(type500!);
			expect(result).toBe(stringType);

			// Test withTree with large map
			const classWithoutParams = createMockClass("SimpleClass", IArray.Empty);
			const treeResult = rewriter.withTree(largeReplacements, classWithoutParams);
			expect(treeResult.size).toBe(1000);
		});

		test("real-world type alias scenario", () => {
			const baseTree = createMockClass("TestClass");
			const rewriter = new TypeRewriter(baseTree);

			// Simulate type alias expansion: type MyString<T> = string
			const tParam = createTypeParam("T");
			const stringType = createTypeRef("string");
			const myStringAlias = TsDeclTypeAlias.create(
				NoComments.instance,
				false, // declared
				createSimpleIdent("MyString"),
				IArray.fromArray([tParam]),
				stringType,
				CodePath.noPath(),
			);

			// Create replacement for the type parameter
			const tTypeRef = createTypeRef("T");
			const numberType = createTypeRef("number");
			const replacements = new Map<TsType, TsType>([[tTypeRef, numberType]]);

			// The T parameter should be shadowed in the type alias context
			const result = rewriter.withTree(replacements, myStringAlias);
			expect(result.has(tTypeRef)).toBe(false);
		});
	});
});