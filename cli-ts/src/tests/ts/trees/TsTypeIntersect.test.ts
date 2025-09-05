/**
 * Comprehensive unit tests for TsTypeIntersect - TypeScript port of TsTypeIntersectTests.scala
 *
 * This file ports all 27 test cases from the Scala version to ensure behavioral compatibility
 * between the Scala and TypeScript implementations of TsTypeIntersect.
 */

import { describe, expect, it } from "bun:test";
import { none, some } from "fp-ts/Option";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { TsProtectionLevel } from "@/internal/ts/TsProtectionLevel.js";
import {
	TsFunParam,
	TsFunSig,
	TsIdent,
	TsLiteral,
	type TsMember,
	TsMemberProperty,
	TsMemberTypeMapped,
	TsQIdent,
	TsTupleElement,
	TsType,
	TsTypeFunction,
	TsTypeIntersect,
	TsTypeLiteral,
	TsTypeObject,
	TsTypeRef,
	TsTypeTuple,
	TsTypeUnion,
} from "@/internal/ts/trees.js";

describe("TsTypeIntersect Tests", () => {
	describe("Construction and Basic Properties", () => {
		it("constructor creates intersection type with given types", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const types = IArray.fromArray<TsType>([stringType, numberType]);
			const intersectType = TsTypeIntersect.create(types);

			expect(intersectType.types).toBe(types);
			expect(intersectType.types.length).toBe(2);
			expect(intersectType.types.apply(0)).toBe(stringType);
			expect(intersectType.types.apply(1)).toBe(numberType);
		});

		it("constructor with empty types array", () => {
			const emptyTypes = IArray.Empty;
			const intersectType = TsTypeIntersect.create(emptyTypes);

			expect(intersectType.types.isEmpty).toBe(true);
			expect(intersectType.types.length).toBe(0);
		});

		it("constructor with single type", () => {
			const singleType = TsTypeRef.boolean;
			const types = IArray.fromArray<TsType>([singleType]);
			const intersectType = TsTypeIntersect.create(types);

			expect(intersectType.types.length).toBe(1);
			expect(intersectType.types.apply(0)).toBe(singleType);
		});

		it("constructor with multiple primitive types", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const booleanType = TsTypeRef.boolean;
			const types = IArray.fromArray<TsType>([
				stringType,
				numberType,
				booleanType,
			]);
			const intersectType = TsTypeIntersect.create(types);

			expect(intersectType.types.length).toBe(3);
			expect(intersectType.types.apply(0)).toBe(stringType);
			expect(intersectType.types.apply(1)).toBe(numberType);
			expect(intersectType.types.apply(2)).toBe(booleanType);
		});

		it("asString provides meaningful representation", () => {
			const types = IArray.fromArray<TsType>([
				TsTypeRef.string,
				TsTypeRef.number,
			]);
			const intersectType = TsTypeIntersect.create(types);

			expect(intersectType.asString).toContain("TsTypeIntersect");
		});
	});

	describe("TsTypeIntersect.simplified - Basic Functionality", () => {
		it("empty intersection returns never", () => {
			const result = TsTypeIntersect.simplified(IArray.Empty);

			expect(result._tag).toBe("TsTypeRef");
			expect((result as any).name.parts.apply(0).value).toBe("never");
		});

		it("single type intersection returns the type itself", () => {
			const stringType = TsTypeRef.string;
			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([stringType]),
			);

			expect(result).toBe(stringType);
		});

		it("two different primitive types remain as intersection", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([stringType, numberType]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				expect(intersectResult.types.toArray()).toContain(stringType);
				expect(intersectResult.types.toArray()).toContain(numberType);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});

		it("duplicate types are removed", () => {
			const stringType = TsTypeRef.string;
			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([stringType, stringType, stringType]),
			);

			expect(result).toBe(stringType);
		});
	});

	describe("TsTypeIntersect.simplified - Object Type Combination", () => {
		it("combines multiple object types into single object", () => {
			// Create property members for object types
			const prop1 = TsMemberProperty.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsIdent.simple("prop1"),
				some(TsTypeRef.string),
				none,
				false,
				false,
			);
			const prop2 = TsMemberProperty.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsIdent.simple("prop2"),
				some(TsTypeRef.number),
				none,
				false,
				false,
			);

			const obj1 = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop1]),
			);
			const obj2 = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop2]),
			);

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([obj1, obj2]),
			);

			if (result._tag === "TsTypeObject") {
				const objectResult = result as any;
				expect(objectResult.members.length).toBe(2);
				expect(objectResult.members.toArray()).toContain(prop1);
				expect(objectResult.members.toArray()).toContain(prop2);
			} else {
				expect(false).toBe(true); // Should be TsTypeObject
			}
		});

		it("single object type with other types preserves order", () => {
			const prop = TsMemberProperty.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsIdent.simple("prop"),
				some(TsTypeRef.string),
				none,
				false,
				false,
			);
			const objType = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop]),
			);
			const stringType = TsTypeRef.string;

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([objType, stringType]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				expect(intersectResult.types.apply(0)).toBe(objType);
				expect(intersectResult.types.apply(1)).toBe(stringType);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});
	});

	describe("TsTypeIntersect.simplified - Nested Intersection Flattening", () => {
		it("flattens nested intersection types", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const booleanType = TsTypeRef.boolean;

			// Create nested intersection: (string & number) & boolean
			const innerIntersect = TsTypeIntersect.create(
				IArray.fromArray<TsType>([stringType, numberType]),
			);
			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([innerIntersect, booleanType]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(3);
				expect(intersectResult.types.toArray()).toContain(stringType);
				expect(intersectResult.types.toArray()).toContain(numberType);
				expect(intersectResult.types.toArray()).toContain(booleanType);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});

		it("flattens deeply nested intersection types", () => {
			const type1 = TsTypeRef.string;
			const type2 = TsTypeRef.number;
			const type3 = TsTypeRef.boolean;
			const type4 = TsTypeRef.any;

			// Create deeply nested: ((string & number) & boolean) & any
			const level1 = TsTypeIntersect.create(
				IArray.fromArray<TsType>([type1, type2]),
			);
			const level2 = TsTypeIntersect.create(
				IArray.fromArray<TsType>([level1, type3]),
			);
			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([level2, type4]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(4);
				expect(intersectResult.types.toArray()).toContain(type1);
				expect(intersectResult.types.toArray()).toContain(type2);
				expect(intersectResult.types.toArray()).toContain(type3);
				expect(intersectResult.types.toArray()).toContain(type4);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});

		it("flattens multiple nested intersections", () => {
			const type1 = TsTypeRef.string;
			const type2 = TsTypeRef.number;
			const type3 = TsTypeRef.boolean;
			const type4 = TsTypeRef.any;

			// Create: (string & number) & (boolean & any)
			const intersect1 = TsTypeIntersect.create(
				IArray.fromArray<TsType>([type1, type2]),
			);
			const intersect2 = TsTypeIntersect.create(
				IArray.fromArray<TsType>([type3, type4]),
			);
			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([intersect1, intersect2]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(4);
				expect(intersectResult.types.toArray()).toContain(type1);
				expect(intersectResult.types.toArray()).toContain(type2);
				expect(intersectResult.types.toArray()).toContain(type3);
				expect(intersectResult.types.toArray()).toContain(type4);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});
	});

	describe("TsTypeIntersect.simplified - Complex Object Type Scenarios", () => {
		it("does not combine object types with mapped types", () => {
			// Create a mapped type member using the simple factory method
			const mappedMember = TsMemberTypeMapped.simple(
				TsIdent.simple("K"),
				TsTypeRef.string,
				TsTypeRef.number,
			);
			const mappedObj = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([mappedMember]),
			);

			const prop = TsMemberProperty.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsIdent.simple("prop"),
				some(TsTypeRef.string),
				none,
				false,
				false,
			);
			const normalObj = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop]),
			);

			// Verify our understanding of isTypeMapping
			expect(TsType.isTypeMapping(mappedObj.members)).toBe(true);
			expect(TsType.isTypeMapping(normalObj.members)).toBe(false);

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([mappedObj, normalObj]),
			);

			// Should remain as intersection since mapped types are not combined
			// This matches the Scala behavior exactly
			expect(result._tag).toBe("TsTypeIntersect");
			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				const resultTypes = intersectResult.types.toArray();
				expect(
					resultTypes.some(
						(t: any) =>
							t._tag === "TsTypeObject" && TsType.isTypeMapping(t.members),
					),
				).toBe(true);
				expect(
					resultTypes.some(
						(t: any) =>
							t._tag === "TsTypeObject" && !TsType.isTypeMapping(t.members),
					),
				).toBe(true);
			}
		});

		it("combines empty object types", () => {
			const emptyObj1 = TsTypeObject.create(Comments.empty(), IArray.Empty);
			const emptyObj2 = TsTypeObject.create(Comments.empty(), IArray.Empty);

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([emptyObj1, emptyObj2]),
			);

			if (result._tag === "TsTypeObject") {
				const objectResult = result as any;
				expect(objectResult.members.isEmpty).toBe(true);
			} else {
				expect(false).toBe(true); // Should be TsTypeObject
			}
		});

		it("preserves distinct members when combining objects", () => {
			const prop1 = TsMemberProperty.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsIdent.simple("prop1"),
				some(TsTypeRef.string),
				none,
				false,
				false,
			);
			const prop2 = TsMemberProperty.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsIdent.simple("prop2"),
				some(TsTypeRef.number),
				none,
				false,
				false,
			);

			// Create objects with overlapping and distinct members
			const obj1 = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop1, prop2]),
			);
			const obj2 = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop1]),
			); // prop1 appears in both

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([obj1, obj2]),
			);

			if (result._tag === "TsTypeObject") {
				const objectResult = result as any;
				// Should have distinct members only
				expect(objectResult.members.length).toBe(2);
				expect(objectResult.members.toArray()).toContain(prop1);
				expect(objectResult.members.toArray()).toContain(prop2);
			} else {
				expect(false).toBe(true); // Should be TsTypeObject
			}
		});
	});

	describe("Edge Cases and Boundary Conditions", () => {
		it("intersection with union types", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const booleanType = TsTypeRef.boolean;

			const unionType = TsTypeUnion.create(
				IArray.fromArray<TsType>([stringType, numberType]),
			);
			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([unionType, booleanType]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				expect(intersectResult.types.toArray()).toContain(unionType);
				expect(intersectResult.types.toArray()).toContain(booleanType);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});

		it("intersection with literal types", () => {
			const stringLiteral = TsTypeLiteral.create(TsLiteral.str("hello"));
			const numberLiteral = TsTypeLiteral.create(TsLiteral.num("42"));

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([stringLiteral, numberLiteral]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				expect(intersectResult.types.toArray()).toContain(stringLiteral);
				expect(intersectResult.types.toArray()).toContain(numberLiteral);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});

		it("intersection with function types", () => {
			const param = TsFunParam.typed(TsIdent.simple("x"), TsTypeRef.number);
			const signature = TsFunSig.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray([param]),
				some(TsTypeRef.string),
			);
			const functionType = TsTypeFunction.create(signature);

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([functionType, TsTypeRef.string]),
			);

			expect(result._tag).toBe("TsTypeIntersect");
			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				const resultTypes = intersectResult.types.toArray();
				expect(resultTypes.some((t: any) => t._tag === "TsTypeFunction")).toBe(
					true,
				);
				expect(
					resultTypes.some(
						(t: any) =>
							t._tag === "TsTypeRef" &&
							t.name.parts.apply(0).value === "string",
					),
				).toBe(true);
			}
		});

		it("intersection with never type", () => {
			const neverType = TsTypeRef.never;
			const stringType = TsTypeRef.string;

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([neverType, stringType]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				expect(intersectResult.types.toArray()).toContain(neverType);
				expect(intersectResult.types.toArray()).toContain(stringType);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});

		it("intersection with any type", () => {
			const anyType = TsTypeRef.any;
			const stringType = TsTypeRef.string;

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([anyType, stringType]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				expect(intersectResult.types.toArray()).toContain(anyType);
				expect(intersectResult.types.toArray()).toContain(stringType);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});
	});

	describe("Type System Integration", () => {
		it("intersection with type references", () => {
			const customType1 = TsTypeRef.create(
				Comments.empty(),
				TsQIdent.of(TsIdent.simple("CustomType1")),
				IArray.Empty,
			);
			const customType2 = TsTypeRef.create(
				Comments.empty(),
				TsQIdent.of(TsIdent.simple("CustomType2")),
				IArray.Empty,
			);

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([customType1, customType2]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				expect(intersectResult.types.toArray()).toContain(customType1);
				expect(intersectResult.types.toArray()).toContain(customType2);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});

		it("intersection with generic types", () => {
			const genericType1 = TsTypeRef.create(
				Comments.empty(),
				TsQIdent.of(TsIdent.simple("Array")),
				IArray.fromArray<TsType>([TsTypeRef.string]),
			);
			const genericType2 = TsTypeRef.create(
				Comments.empty(),
				TsQIdent.of(TsIdent.simple("Promise")),
				IArray.fromArray<TsType>([TsTypeRef.number]),
			);

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([genericType1, genericType2]),
			);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				expect(intersectResult.types.toArray()).toContain(genericType1);
				expect(intersectResult.types.toArray()).toContain(genericType2);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});

		it("intersection with tuple types", () => {
			const tupleElement1 = TsTupleElement.unlabeled(TsTypeRef.string);
			const tupleElement2 = TsTupleElement.unlabeled(TsTypeRef.number);
			const tupleType = TsTypeTuple.create(
				IArray.fromArray([tupleElement1, tupleElement2]),
			);

			const result = TsTypeIntersect.simplified(
				IArray.fromArray<TsType>([tupleType, TsTypeRef.boolean]),
			);

			expect(result._tag).toBe("TsTypeIntersect");
			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(2);
				const resultTypes = intersectResult.types.toArray();
				expect(resultTypes.some((t: any) => t._tag === "TsTypeTuple")).toBe(
					true,
				);
				expect(
					resultTypes.some(
						(t: any) =>
							t._tag === "TsTypeRef" &&
							t.name.parts.apply(0).value === "boolean",
					),
				).toBe(true);
			}
		});
	});

	describe("Performance and Scalability", () => {
		it("large intersection types", () => {
			const types = IArray.fromIterable<TsType>(
				Array.from({ length: 100 }, (_, i) =>
					TsTypeRef.create(
						Comments.empty(),
						TsQIdent.of(TsIdent.simple(`Type${i + 1}`)),
						IArray.Empty,
					),
				),
			);

			const result = TsTypeIntersect.simplified(types);

			if (result._tag === "TsTypeIntersect") {
				const intersectResult = result as any;
				expect(intersectResult.types.length).toBe(100);
			} else {
				expect(false).toBe(true); // Should be TsTypeIntersect
			}
		});

		it("deeply nested object combinations", () => {
			// Create multiple object types with different properties
			const obj1Props = IArray.fromArray<TsMember>([
				TsMemberProperty.create(
					Comments.empty(),
					TsProtectionLevel.default(),
					TsIdent.simple("prop1"),
					some(TsTypeRef.string),
					none,
					false,
					false,
				),
				TsMemberProperty.create(
					Comments.empty(),
					TsProtectionLevel.default(),
					TsIdent.simple("prop2"),
					some(TsTypeRef.number),
					none,
					false,
					false,
				),
			]);

			const obj2Props = IArray.fromArray<TsMember>([
				TsMemberProperty.create(
					Comments.empty(),
					TsProtectionLevel.default(),
					TsIdent.simple("prop3"),
					some(TsTypeRef.boolean),
					none,
					false,
					false,
				),
			]);

			const obj1 = TsTypeObject.create(Comments.empty(), obj1Props);
			const obj2 = TsTypeObject.create(Comments.empty(), obj2Props);
			const objects = IArray.fromArray<TsType>([obj1, obj2]);

			const result = TsTypeIntersect.simplified(objects);

			if (result._tag === "TsTypeObject") {
				const objectResult = result as any;
				expect(objectResult.members.length).toBe(3);
			} else {
				expect(false).toBe(true); // Should be TsTypeObject
			}
		});
	});
});
