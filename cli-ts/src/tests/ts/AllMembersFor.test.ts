/**
 * Tests for AllMembersFor.ts - TypeScript port of org.scalablytyped.converter.internal.ts.AllMembersForTests
 */

import { describe, expect, it } from "vitest";
import { none, some } from "fp-ts/Option";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { AllMembersFor } from "@/internal/ts/AllMembersFor.js";
import { TsProtectionLevel } from "@/internal/ts/TsProtectionLevel.js";
import { LoopDetector } from "@/internal/ts/TsTreeScope.js";
// Import tree types and constructors
import type { TsMember, TsType } from "@/internal/ts/trees.ts";
import {
	TsFunSig,
	TsLiteral,
	TsMemberCall,
	TsMemberCtor,
	type TsMemberProperty,
	TsTypeAsserts,
	TsTypeConstructor as TsTypeConstructorConstructor,
	TsTypeFunction,
	TsTypeIntersect,
	TsTypeIs,
	TsTypeKeyOf,
	TsTypeLiteral,
	TsTypeLookup,
	TsTypeObject,
	TsTypeQuery,
	TsTypeRef,
	TsTypeRepeated,
	TsTypeThis,
	TsTypeTuple,
	TsTypeUnion,
} from "../../internal/ts/trees.js";
import {
	createLoopDetector,
	createMockInterface,
	createMockMethod,
	createMockProperty,
	createMockScope,
	createQIdent,
	createSimpleIdent,
	createTypeRef,
} from "../utils/TestUtils.js";

describe("AllMembersFor", () => {
	describe("forType", () => {
		it("returns empty for TsTypeUnion", () => {
			const scope = createMockScope();
			const loopDetector = createLoopDetector();
			const unionType = TsTypeUnion.create(
				IArray.fromArray([TsTypeRef.string, TsTypeRef.number] as TsType[]),
			);

			const result = AllMembersFor.forType(scope, loopDetector)(unionType);

			expect(result.isEmpty).toBe(true);
		});

		it("returns members for TsTypeObject", () => {
			const scope = createMockScope();
			const loopDetector = createLoopDetector();
			const property = createMockProperty("testProp");
			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([property]),
			);

			const result = AllMembersFor.forType(scope, loopDetector)(objectType);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(property);
		});

		it("returns empty for primitive types", () => {
			const scope = createMockScope();
			const loopDetector = createLoopDetector();
			const primitiveTypes = [
				TsTypeAsserts.create(createSimpleIdent("x"), some(TsTypeRef.string)),
				TsTypeLiteral.create(TsLiteral.str("test")),
				TsTypeFunction.create(
					TsFunSig.create(
						Comments.empty(),
						IArray.Empty,
						IArray.Empty,
						some(TsTypeRef.void),
					),
				),
				TsTypeConstructorConstructor.create(
					false,
					TsTypeFunction.create(
						TsFunSig.create(
							Comments.empty(),
							IArray.Empty,
							IArray.Empty,
							some(TsTypeRef.void),
						),
					),
				),
				TsTypeIs.create(createSimpleIdent("x"), TsTypeRef.string),
				TsTypeTuple.create(IArray.Empty),
				TsTypeQuery.create(createQIdent("test")),
				TsTypeRepeated.create(TsTypeRef.string),
				TsTypeKeyOf.create(TsTypeRef.string),
				TsTypeLookup.create(
					TsTypeRef.string,
					TsTypeLiteral.create(TsLiteral.str("key")),
				),
				TsTypeThis.create(),
			];

			primitiveTypes.forEach((tpe) => {
				const result = AllMembersFor.forType(scope, loopDetector)(tpe);
				expect(result.isEmpty).toBe(true);
			});
		});

		it("handles TsTypeIntersect by flattening members", () => {
			const scope = createMockScope();
			const loopDetector = createLoopDetector();
			const prop1 = createMockProperty("prop1");
			const prop2 = createMockProperty("prop2");
			const obj1 = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop1]),
			);
			const obj2 = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop2]),
			);
			const intersectType = TsTypeIntersect.create(
				IArray.fromArray<TsType>([obj1, obj2]),
			);

			const result = AllMembersFor.forType(scope, loopDetector)(intersectType);

			expect(result.length).toBe(2);
			expect(result.toArray()).toContain(prop1);
			expect(result.toArray()).toContain(prop2);
		});

		it("delegates to apply for TsTypeRef", () => {
			const scope = createMockScope();
			const loopDetector = createLoopDetector();
			const typeRef = createTypeRef("TestType");

			// This will return empty since we don't have a proper scope with lookups
			const result = AllMembersFor.forType(scope, loopDetector)(typeRef);

			expect(result.isEmpty).toBe(true);
		});
	});

	describe("handleOverridingFields", () => {
		it("combines members without conflicts", () => {
			const prop1 = createMockProperty("prop1");
			const prop2 = createMockProperty("prop2");
			const method1 = createMockMethod("method1");
			const fromThis = IArray.fromArray<TsMember>([prop1, method1]);
			const fromParents = IArray.fromArray<TsMember>([prop2]);

			const result = AllMembersFor.handleOverridingFields(
				fromThis,
				fromParents,
			);

			expect(result.length).toBe(3);
			expect(result.toArray()).toContain(prop1);
			expect(result.toArray()).toContain(prop2);
			expect(result.toArray()).toContain(method1);
		});

		it("filters out overridden properties from parents", () => {
			const thisProp = createMockProperty("sameName");
			const parentProp = createMockProperty("sameName");
			const otherProp = createMockProperty("otherName");
			const method = createMockMethod("method");
			const fromThis = IArray.fromArray<TsMember>([thisProp]);
			const fromParents = IArray.fromArray<TsMember>([
				parentProp,
				otherProp,
				method,
			]);

			const result = AllMembersFor.handleOverridingFields(
				fromThis,
				fromParents,
			);

			expect(result.length).toBe(3);
			expect(result.toArray()).toContain(thisProp);
			expect(result.toArray()).toContain(otherProp);
			expect(result.toArray()).toContain(method);

			// The parent property with the same name should not be in the result
			const parentPropsInResult = result
				.toArray()
				.filter(
					(m) =>
						m._tag === "TsMemberProperty" &&
						(m as TsMemberProperty).name.value === "sameName",
				);
			expect(parentPropsInResult.length).toBe(1);
			expect(parentPropsInResult[0]).toBe(thisProp);
		});

		it("preserves non-property members from parents", () => {
			const thisProp = createMockProperty("prop");
			const parentMethod = createMockMethod("method");
			const fromThis = IArray.fromArray<TsMember>([thisProp]);
			const fromParents = IArray.fromArray<TsMember>([parentMethod]);

			const result = AllMembersFor.handleOverridingFields(
				fromThis,
				fromParents,
			);

			expect(result.length).toBe(2);
			expect(result.toArray()).toContain(thisProp);
			expect(result.toArray()).toContain(parentMethod);
		});

		it("handles empty collections", () => {
			const result1 = AllMembersFor.handleOverridingFields(
				IArray.Empty,
				IArray.Empty,
			);
			expect(result1.isEmpty).toBe(true);

			const prop = createMockProperty("prop");
			const result2 = AllMembersFor.handleOverridingFields(
				IArray.fromArray<TsMember>([prop]),
				IArray.Empty,
			);
			expect(result2.length).toBe(1);
			expect(result2.apply(0)).toBe(prop);

			const result3 = AllMembersFor.handleOverridingFields(
				IArray.Empty,
				IArray.fromArray<TsMember>([prop]),
			);
			expect(result3.length).toBe(1);
			expect(result3.apply(0)).toBe(prop);
		});
	});

	describe("apply", () => {
		it("returns empty for circular reference", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("TestType");
			// Create a loop detector that already contains this type reference
			const loopResult = LoopDetector.initial.including(typeRef, scope);
			const loopDetector =
				loopResult._tag === "Right" ? loopResult.right : LoopDetector.initial;

			const result = AllMembersFor.apply(scope, loopDetector)(typeRef);

			expect(result.isEmpty).toBe(true);
		});

		it("returns empty when type not found in scope", () => {
			const scope = createMockScope();
			const loopDetector = createLoopDetector();
			const typeRef = createTypeRef("NonExistentType");

			const result = AllMembersFor.apply(scope, loopDetector)(typeRef);

			expect(result.isEmpty).toBe(true);
		});
	});

	describe("forInterface", () => {
		it("handles interface without inheritance", () => {
			const prop = createMockProperty("interfaceProp");
			const interfaceDecl = createMockInterface(
				"TestInterface",
				IArray.fromArray<TsMember>([prop]),
			);
			const scope = createMockScope();
			const loopDetector = createLoopDetector();

			const result = AllMembersFor.forInterface(
				loopDetector,
				interfaceDecl,
				scope,
				IArray.Empty,
			);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(prop);
		});

		it("handles interface with inheritance", () => {
			const prop1 = createMockProperty("prop1");
			const interfaceDecl = createMockInterface(
				"TestInterface",
				IArray.fromArray<TsMember>([prop1]),
				IArray.fromArray<TsTypeRef>([createTypeRef("BaseInterface")]),
			);
			const scope = createMockScope();
			const loopDetector = createLoopDetector();

			// Since we don't have a proper scope setup, inheritance will return empty
			const result = AllMembersFor.forInterface(
				loopDetector,
				interfaceDecl,
				scope,
				IArray.Empty,
			);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(prop1);
		});

		it("handles empty interface", () => {
			const interfaceDecl = createMockInterface("EmptyInterface");
			const scope = createMockScope();
			const loopDetector = createLoopDetector();

			const result = AllMembersFor.forInterface(
				loopDetector,
				interfaceDecl,
				scope,
				IArray.Empty,
			);

			expect(result.isEmpty).toBe(true);
		});

		it("handles interface with type parameters", () => {
			const prop = createMockProperty("genericProp");
			const interfaceDecl = createMockInterface(
				"GenericInterface",
				IArray.fromArray<TsMember>([prop]),
			);
			const scope = createMockScope();
			const loopDetector = createLoopDetector();
			const tparams = IArray.fromArray<TsType>([TsTypeRef.string]);

			const result = AllMembersFor.forInterface(
				loopDetector,
				interfaceDecl,
				scope,
				tparams,
			);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(prop);
		});
	});

	describe("Complex Scenarios", () => {
		it("handles multiple property overrides correctly", () => {
			const thisProp1 = createMockProperty("name");
			const thisProp2 = createMockProperty("value");
			const parentProp1 = createMockProperty("name"); // should be overridden
			const parentProp2 = createMockProperty("other");
			const parentMethod = createMockMethod("method");

			const fromThis = IArray.fromArray<TsMember>([thisProp1, thisProp2]);
			const fromParents = IArray.fromArray<TsMember>([
				parentProp1,
				parentProp2,
				parentMethod,
			]);

			const result = AllMembersFor.handleOverridingFields(
				fromThis,
				fromParents,
			);

			expect(result.length).toBe(4);
			expect(result.toArray()).toContain(thisProp1);
			expect(result.toArray()).toContain(thisProp2);
			expect(result.toArray()).toContain(parentProp2);
			expect(result.toArray()).toContain(parentMethod);

			// Check that only the "this" property with name "name" is in the result
			const namePropsInResult = result
				.toArray()
				.filter(
					(m) =>
						m._tag === "TsMemberProperty" &&
						(m as TsMemberProperty).name.value === "name",
				);
			expect(namePropsInResult.length).toBe(1);
			expect(namePropsInResult[0]).toBe(thisProp1);
		});

		it("preserves order of members", () => {
			const prop1 = createMockProperty("prop1");
			const prop2 = createMockProperty("prop2");
			const method1 = createMockMethod("method1");
			const method2 = createMockMethod("method2");

			const fromThis = IArray.fromArray<TsMember>([prop1, method1]);
			const fromParents = IArray.fromArray<TsMember>([prop2, method2]);

			const result = AllMembersFor.handleOverridingFields(
				fromThis,
				fromParents,
			);

			// Should maintain order: fromThis first, then non-overridden fromParents
			expect(result.length).toBe(4);
			expect(result.apply(0)).toBe(prop1);
			expect(result.apply(1)).toBe(method1);
			expect(result.apply(2)).toBe(prop2);
			expect(result.apply(3)).toBe(method2);
		});

		it("handles mixed member types correctly", () => {
			const property = createMockProperty("prop");
			const method = createMockMethod("method");
			const constructor = TsMemberCtor.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsFunSig.create(Comments.empty(), IArray.Empty, IArray.Empty, none),
			);
			const callSignature = TsMemberCall.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsFunSig.create(
					Comments.empty(),
					IArray.Empty,
					IArray.Empty,
					some(TsTypeRef.void),
				),
			);

			const fromThis = IArray.fromArray<TsMember>([property, constructor]);
			const fromParents = IArray.fromArray<TsMember>([method, callSignature]);

			const result = AllMembersFor.handleOverridingFields(
				fromThis,
				fromParents,
			);

			expect(result.length).toBe(4);
			expect(result.toArray()).toContain(property);
			expect(result.toArray()).toContain(method);
			expect(result.toArray()).toContain(constructor);
			expect(result.toArray()).toContain(callSignature);
		});
	});

	describe("Error Handling", () => {
		it("handles null or invalid inputs gracefully", () => {
			// Test with empty arrays
			const result1 = AllMembersFor.handleOverridingFields(
				IArray.Empty,
				IArray.Empty,
			);
			expect(result1.isEmpty).toBe(true);

			// Test forType with null-like scenarios
			const scope = createMockScope();
			const loopDetector = createLoopDetector();

			// Test with empty TsTypeIntersect
			const emptyIntersect = TsTypeIntersect.create(IArray.Empty);
			const result2 = AllMembersFor.forType(
				scope,
				loopDetector,
			)(emptyIntersect);
			expect(result2.isEmpty).toBe(true);

			// Test with TsTypeObject with empty members
			const emptyObject = TsTypeObject.create(Comments.empty(), IArray.Empty);
			const result3 = AllMembersFor.forType(scope, loopDetector)(emptyObject);
			expect(result3.isEmpty).toBe(true);
		});

		it("handles deeply nested type intersections", () => {
			const scope = createMockScope();
			const loopDetector = createLoopDetector();

			const prop1 = createMockProperty("prop1");
			const prop2 = createMockProperty("prop2");
			const prop3 = createMockProperty("prop3");

			const obj1 = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop1]),
			);
			const obj2 = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop2]),
			);
			const obj3 = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop3]),
			);

			const nestedIntersect = TsTypeIntersect.create(
				IArray.fromArray<TsType>([
					obj1,
					TsTypeIntersect.create(IArray.fromArray<TsType>([obj2, obj3])),
				]),
			);

			const result = AllMembersFor.forType(
				scope,
				loopDetector,
			)(nestedIntersect);

			expect(result.length).toBe(3);
			expect(result.toArray()).toContain(prop1);
			expect(result.toArray()).toContain(prop2);
			expect(result.toArray()).toContain(prop3);
		});
	});

	describe("Integration Tests", () => {
		it("forType correctly delegates to apply for type references", () => {
			const scope = createMockScope();
			const loopDetector = createLoopDetector();
			const typeRef = createTypeRef("TestType");

			// Mock the apply method behavior by testing the delegation
			const result1 = AllMembersFor.forType(scope, loopDetector)(typeRef);
			const result2 = AllMembersFor.apply(scope, loopDetector)(typeRef);

			// Both should return the same result (empty in this case due to no scope setup)
			expect(result1.isEmpty).toBe(result2.isEmpty);
		});

		it("maintains consistency across different input types", () => {
			const scope = createMockScope();
			const loopDetector = createLoopDetector();

			// All these should return empty
			const types = [
				TsTypeUnion.create(IArray.fromArray<TsType>([TsTypeRef.string])),
				TsTypeAsserts.create(createSimpleIdent("x"), some(TsTypeRef.string)),
				TsTypeLiteral.create(TsLiteral.str("test")),
				TsTypeFunction.create(
					TsFunSig.create(
						Comments.empty(),
						IArray.Empty,
						IArray.Empty,
						some(TsTypeRef.void),
					),
				),
				TsTypeThis.create(),
			];

			types.forEach((tpe) => {
				const result = AllMembersFor.forType(scope, loopDetector)(tpe);
				expect(result.isEmpty).toBe(true);
			});
		});
	});
});
