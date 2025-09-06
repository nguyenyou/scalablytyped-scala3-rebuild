/**
 * Tests for RewriteTypeThis transform.
 * 
 * Port of org.scalablytyped.converter.internal.ts.transforms.RewriteTypeThisTests
 */

import { describe, expect, it } from "bun:test";
import { IArray } from "@/internal/IArray.js";
import { RewriteTypeThis, RewriteTypeThisTransform } from "@/internal/ts/transforms/RewriteTypeThis.js";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import { TsIdent, TsQIdent } from "@/internal/ts/trees.js";
import {
	createKeyOfType,
	createMemberCtor,
	createMemberFunction,
	createMockClass,
	createMockInterface,
	createMockScope,
	createTypeConstructor,
	createTypeFunction,
	createTypeLookup,
	createTypeParam,
	createTypeRef,
	createTypeRefWithQIdent,
	createTypeThis,
} from "@/tests/utils/TestUtils.js";

describe("RewriteTypeThis", () => {
	describe("Basic Functionality", () => {
		it("extends TreeTransformationScopedChanges", () => {
			expect(RewriteTypeThisTransform).toBeInstanceOf(TreeTransformationScopedChanges);
		});

		it("has enterTsType method", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("string");
			const result = RewriteTypeThisTransform.enterTsType(scope)(typeRef);
			expect(result).toBeDefined();
			expect(result._tag).toBeDefined();
		});
	});

	describe("Type Reference to This Conversion", () => {
		it("converts self-reference in function to TsTypeThis", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			// Create a function type that references the class
			const functionType = createTypeFunction(createTypeRef("TestClass"));
			const method = createMemberFunction("method", functionType);
			const classWithFunction = {
				...clazz,
				members: IArray.fromArray([method]),
			};
			
			// Simulate being inside the function when processing the type reference
			const scopeWithClass = scope["/"](classWithFunction);
			const scopeWithMethod = scopeWithClass["/"](method);
			const scopeWithFunction = scopeWithMethod["/"](functionType);
			const selfRef = createTypeRef("TestClass");

			const result = RewriteTypeThisTransform.enterTsType(scopeWithFunction)(selfRef);
			
			expect(result._tag).toBe("TsTypeThis");
		});

		it("does not convert when not in function", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const scopeWithClass = scope["/"](clazz);
			const selfRef = createTypeRef("TestClass");

			const result = RewriteTypeThisTransform.enterTsType(scopeWithClass)(selfRef);
			
			expect(result._tag).toBe("TsTypeRef");
			expect(result).toBe(selfRef); // Should remain unchanged
		});

		it("does not convert when has type parameters", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const functionType = createTypeFunction();
			const scopeWithClass = scope["/"](clazz);
			const scopeWithFunction = scopeWithClass["/"](functionType);
			const selfRefWithTParams = createTypeRef("TestClass", IArray.fromArray([createTypeRef("T")]));

			const result = RewriteTypeThisTransform.enterTsType(scopeWithFunction)(selfRefWithTParams);
			
			expect(result._tag).toBe("TsTypeRef");
			expect(result).toBe(selfRefWithTParams); // Should remain unchanged
		});

		it("does not convert when not reference to owner", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const functionType = createTypeFunction();
			const scopeWithClass = scope["/"](clazz);
			const scopeWithFunction = scopeWithClass["/"](functionType);
			const otherRef = createTypeRef("OtherClass");

			const result = RewriteTypeThisTransform.enterTsType(scopeWithFunction)(otherRef);
			
			expect(result._tag).toBe("TsTypeRef");
			expect(result).toBe(otherRef); // Should remain unchanged
		});

		it("does not convert when in constructor", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const functionType = createTypeFunction(createTypeRef("TestClass"));
			const constructor = createMemberCtor();
			const scopeWithClass = scope["/"](clazz);
			const scopeWithConstructor = scopeWithClass["/"](constructor);
			const scopeWithFunction = scopeWithConstructor["/"](functionType);
			const selfRef = createTypeRef("TestClass");

			const result = RewriteTypeThisTransform.enterTsType(scopeWithFunction)(selfRef);
			
			expect(result._tag).toBe("TsTypeRef");
			expect(result).toBe(selfRef); // Should remain unchanged
		});

		it("does not convert when in type lookup", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const functionType = createTypeFunction();
			const lookupFrom = createTypeRef("TestClass");
			const typeLookup = createTypeLookup(lookupFrom, createTypeRef("string"));
			
			const scopeWithClass = scope["/"](clazz);
			const scopeWithFunction = scopeWithClass["/"](functionType);
			const scopeWithLookup = scopeWithFunction["/"](typeLookup);

			const result = RewriteTypeThisTransform.enterTsType(scopeWithLookup)(lookupFrom);
			
			expect(result._tag).toBe("TsTypeRef");
			expect(result).toBe(lookupFrom); // Should remain unchanged
		});

		it("does not convert when in index type", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const functionType = createTypeFunction();
			const selfRef = createTypeRef("TestClass");
			const keyOfType = createKeyOfType(selfRef);
			
			const scopeWithClass = scope["/"](clazz);
			const scopeWithFunction = scopeWithClass["/"](functionType);
			const scopeWithKeyOf = scopeWithFunction["/"](keyOfType);

			const result = RewriteTypeThisTransform.enterTsType(scopeWithKeyOf)(selfRef);
			
			expect(result._tag).toBe("TsTypeRef");
			expect(result).toBe(selfRef); // Should remain unchanged
		});

		it("handles qualified names correctly", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);

			const functionType = createTypeFunction();
			const scopeWithClass = scope["/"](clazz);
			const scopeWithFunction = scopeWithClass["/"](functionType);
			
			// Create a qualified reference where the last part matches
			const qualifiedName = TsQIdent.ofStrings("lib", "TestClass");
			const qualifiedRef = createTypeRefWithQIdent(qualifiedName);

			const result = RewriteTypeThisTransform.enterTsType(scopeWithFunction)(qualifiedRef);

			// Should convert to this because the last part matches
			expect(result._tag).toBe("TsTypeThis");
		});

		it("works with interface owners", () => {
			const interface_ = createMockInterface("TestInterface");
			const scope = createMockScope("test-lib", interface_);
			
			const functionType = createTypeFunction(createTypeRef("TestInterface"));
			const method = createMemberFunction("method", functionType);
			const interfaceWithFunction = {
				...interface_,
				members: IArray.fromArray([method]),
			};
			
			const scopeWithInterface = scope["/"](interfaceWithFunction);
			const scopeWithMethod = scopeWithInterface["/"](method);
			const scopeWithFunction = scopeWithMethod["/"](functionType);
			const selfRef = createTypeRef("TestInterface");

			const result = RewriteTypeThisTransform.enterTsType(scopeWithFunction)(selfRef);
			
			expect(result._tag).toBe("TsTypeThis");
		});
	});

	describe("TsTypeThis to Type Reference Conversion", () => {
		it("converts TsTypeThis to class reference in constructor", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const constructor = createMemberCtor();
			const scopeWithClass = scope["/"](clazz);
			const scopeWithConstructor = scopeWithClass["/"](constructor);
			const thisType = createTypeThis();

			const result = RewriteTypeThisTransform.enterTsType(scopeWithConstructor)(thisType);
			
			expect(result._tag).toBe("TsTypeRef");
			const typeRef = result as any;
			expect(typeRef.name.parts.get(typeRef.name.parts.length - 1)?.value).toBe("TestClass");
			expect(typeRef.tparams.length).toBe(0); // Should have empty type parameters
		});

		it("converts TsTypeThis to interface reference in constructor", () => {
			const interface_ = createMockInterface("TestInterface");
			const scope = createMockScope("test-lib", interface_);
			
			const constructor = createMemberCtor();
			const scopeWithInterface = scope["/"](interface_);
			const scopeWithConstructor = scopeWithInterface["/"](constructor);
			const thisType = createTypeThis();

			const result = RewriteTypeThisTransform.enterTsType(scopeWithConstructor)(thisType);
			
			expect(result._tag).toBe("TsTypeRef");
			const typeRef = result as any;
			expect(typeRef.name.parts.get(typeRef.name.parts.length - 1)?.value).toBe("TestInterface");
		});

		it("converts TsTypeThis to class reference in index type", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const thisType = createTypeThis();
			const keyOfType = createKeyOfType(thisType);
			const scopeWithClass = scope["/"](clazz);
			const scopeWithKeyOf = scopeWithClass["/"](keyOfType);

			const result = RewriteTypeThisTransform.enterTsType(scopeWithKeyOf)(thisType);
			
			expect(result._tag).toBe("TsTypeRef");
			const typeRef = result as any;
			expect(typeRef.name.parts.get(typeRef.name.parts.length - 1)?.value).toBe("TestClass");
		});

		it("does not convert TsTypeThis in normal function", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const functionType = createTypeFunction();
			const scopeWithClass = scope["/"](clazz);
			const scopeWithFunction = scopeWithClass["/"](functionType);
			const thisType = createTypeThis();

			const result = RewriteTypeThisTransform.enterTsType(scopeWithFunction)(thisType);
			
			expect(result._tag).toBe("TsTypeThis");
			expect(result).toBe(thisType); // Should remain unchanged
		});

		it("returns unchanged when no owner found", () => {
			const scope = createMockScope("test-lib");
			
			const constructor = createMemberCtor();
			const scopeWithConstructor = scope["/"](constructor);
			const thisType = createTypeThis();

			const result = RewriteTypeThisTransform.enterTsType(scopeWithConstructor)(thisType);
			
			expect(result._tag).toBe("TsTypeThis");
			expect(result).toBe(thisType); // Should remain unchanged when no owner found
		});
	});

	describe("Edge Cases", () => {
		it("handles constructor function member correctly", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			// Create a function member named "constructor"
			const constructorFunction = createMemberFunction("constructor", createTypeFunction());
			const scopeWithClass = scope["/"](clazz);
			const scopeWithConstructorFunction = scopeWithClass["/"](constructorFunction);
			const thisType = createTypeThis();

			const result = RewriteTypeThisTransform.enterTsType(scopeWithConstructorFunction)(thisType);
			
			expect(result._tag).toBe("TsTypeRef");
			const typeRef = result as any;
			expect(typeRef.name.parts.get(typeRef.name.parts.length - 1)?.value).toBe("TestClass");
		});

		it("handles constructor type correctly", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const constructorType = createTypeConstructor();
			const scopeWithClass = scope["/"](clazz);
			const scopeWithConstructorType = scopeWithClass["/"](constructorType);
			const thisType = createTypeThis();

			const result = RewriteTypeThisTransform.enterTsType(scopeWithConstructorType)(thisType);
			
			expect(result._tag).toBe("TsTypeRef");
			const typeRef = result as any;
			expect(typeRef.name.parts.get(typeRef.name.parts.length - 1)?.value).toBe("TestClass");
		});

		it("handles empty type parameters correctly", () => {
			const clazz = createMockClass("TestClass");
			const scope = createMockScope("test-lib", clazz);
			
			const constructor = createMemberCtor();
			const scopeWithClass = scope["/"](clazz);
			const scopeWithConstructor = scopeWithClass["/"](constructor);
			const thisType = createTypeThis();

			const result = RewriteTypeThisTransform.enterTsType(scopeWithConstructor)(thisType);
			
			expect(result._tag).toBe("TsTypeRef");
			const typeRef = result as any;
			expect(typeRef.tparams.length).toBe(0); // Should have empty type parameters
		});

		it("preserves other types unchanged", () => {
			const scope = createMockScope("test-lib");
			const stringType = createTypeRef("string");

			const result = RewriteTypeThisTransform.enterTsType(scope)(stringType);
			
			expect(result._tag).toBe("TsTypeRef");
			expect(result).toBe(stringType); // Should remain unchanged
		});
	});
});