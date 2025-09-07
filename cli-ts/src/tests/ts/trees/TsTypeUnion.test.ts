/**
 * Comprehensive unit tests for TsTypeUnion - TypeScript port of TsTypeUnionTests.scala
 *
 * This file ports all 35 test cases from the Scala version to ensure behavioral compatibility
 * between the Scala and TypeScript implementations of TsTypeUnion.
 */

import { describe, expect, it } from "vitest";
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
	TsQIdent,
	TsTupleElement,
	type TsType,
	TsTypeConditional,
	TsTypeFunction,
	TsTypeIntersect,
	TsTypeLiteral,
	TsTypeObject,
	TsTypeRef,
	TsTypeTuple,
	TsTypeUnion,
} from "@/internal/ts/trees.js";

describe("TsTypeUnion Tests", () => {
	describe("Construction and Basic Properties", () => {
		it("constructor creates union type with given types", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const types = IArray.fromArray<TsType>([stringType, numberType]);
			const unionType = TsTypeUnion.create(types);

			expect(unionType.types).toBe(types);
			expect(unionType.types.length).toBe(2);
			expect(unionType.types.apply(0)).toBe(stringType);
			expect(unionType.types.apply(1)).toBe(numberType);
		});

		it("constructor with empty types array", () => {
			const emptyTypes = IArray.Empty;
			const unionType = TsTypeUnion.create(emptyTypes);

			expect(unionType.types.isEmpty).toBe(true);
			expect(unionType.types.length).toBe(0);
		});

		it("constructor with single type", () => {
			const singleType = TsTypeRef.boolean;
			const types = IArray.fromArray<TsType>([singleType]);
			const unionType = TsTypeUnion.create(types);

			expect(unionType.types.length).toBe(1);
			expect(unionType.types.apply(0)).toBe(singleType);
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
			const unionType = TsTypeUnion.create(types);

			expect(unionType.types.length).toBe(3);
			expect(unionType.types.apply(0)).toBe(stringType);
			expect(unionType.types.apply(1)).toBe(numberType);
			expect(unionType.types.apply(2)).toBe(booleanType);
		});

		it("asString provides meaningful representation", () => {
			const types = IArray.fromArray<TsType>([
				TsTypeRef.string,
				TsTypeRef.number,
			]);
			const unionType = TsTypeUnion.create(types);

			expect(unionType.asString).toContain("TsTypeUnion");
		});
	});

	describe("TsTypeUnion.simplified - Basic Functionality", () => {
		it("empty union returns never", () => {
			const result = TsTypeUnion.simplified(IArray.Empty);

			expect(result.asString).toBe(TsTypeRef.never.asString);
		});

		it("single type union returns the type itself", () => {
			const stringType = TsTypeRef.string;
			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([stringType]),
			);

			expect(result.asString).toBe(stringType.asString);
		});

		it("two different primitive types remain as union", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([stringType, numberType]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				const typeStrings = unionResult.types.toArray().map((t) => t.asString);
				expect(typeStrings).toContain(stringType.asString);
				expect(typeStrings).toContain(numberType.asString);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("duplicate types are removed", () => {
			const stringType = TsTypeRef.string;
			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([stringType, stringType, stringType]),
			);

			expect(result.asString).toBe(stringType.asString);
		});

		it("multiple distinct types remain as union", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const booleanType = TsTypeRef.boolean;
			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([stringType, numberType, booleanType]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(3);
				expect(unionResult.types.toArray()).toContain(stringType);
				expect(unionResult.types.toArray()).toContain(numberType);
				expect(unionResult.types.toArray()).toContain(booleanType);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});
	});

	describe("TsTypeUnion.simplified - Nested Union Flattening", () => {
		it("flattens nested union types", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const booleanType = TsTypeRef.boolean;

			// Create nested union: (string | number) | boolean
			const innerUnion = TsTypeUnion.create(
				IArray.fromArray<TsType>([stringType, numberType]),
			);
			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([innerUnion, booleanType]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(3);
				expect(unionResult.types.toArray()).toContain(stringType);
				expect(unionResult.types.toArray()).toContain(numberType);
				expect(unionResult.types.toArray()).toContain(booleanType);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("flattens deeply nested union types", () => {
			const type1 = TsTypeRef.string;
			const type2 = TsTypeRef.number;
			const type3 = TsTypeRef.boolean;
			const type4 = TsTypeRef.any;

			// Create deeply nested: ((string | number) | boolean) | any
			const level1 = TsTypeUnion.create(
				IArray.fromArray<TsType>([type1, type2]),
			);
			const level2 = TsTypeUnion.create(
				IArray.fromArray<TsType>([level1, type3]),
			);
			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([level2, type4]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(4);
				expect(unionResult.types.toArray()).toContain(type1);
				expect(unionResult.types.toArray()).toContain(type2);
				expect(unionResult.types.toArray()).toContain(type3);
				expect(unionResult.types.toArray()).toContain(type4);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("flattens multiple nested unions", () => {
			const type1 = TsTypeRef.string;
			const type2 = TsTypeRef.number;
			const type3 = TsTypeRef.boolean;
			const type4 = TsTypeRef.any;

			// Create: (string | number) | (boolean | any)
			const union1 = TsTypeUnion.create(
				IArray.fromArray<TsType>([type1, type2]),
			);
			const union2 = TsTypeUnion.create(
				IArray.fromArray<TsType>([type3, type4]),
			);
			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([union1, union2]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(4);
				expect(unionResult.types.toArray()).toContain(type1);
				expect(unionResult.types.toArray()).toContain(type2);
				expect(unionResult.types.toArray()).toContain(type3);
				expect(unionResult.types.toArray()).toContain(type4);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("flattens nested unions with duplicates", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;

			// Create: (string | number) | (string | number) - should deduplicate
			const union1 = TsTypeUnion.create(
				IArray.fromArray<TsType>([stringType, numberType]),
			);
			const union2 = TsTypeUnion.create(
				IArray.fromArray<TsType>([stringType, numberType]),
			);
			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([union1, union2]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				expect(unionResult.types.toArray()).toContain(stringType);
				expect(unionResult.types.toArray()).toContain(numberType);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});
	});

	describe("Edge Cases and Boundary Conditions", () => {
		it("union with intersection types", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const booleanType = TsTypeRef.boolean;

			const intersectType = TsTypeIntersect.create(
				IArray.fromArray<TsType>([stringType, numberType]),
			);
			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([intersectType, booleanType]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				expect(unionResult.types.toArray()).toContain(intersectType);
				expect(unionResult.types.toArray()).toContain(booleanType);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("union with literal types", () => {
			const stringLiteral = TsTypeLiteral.create(TsLiteral.str("hello"));
			const numberLiteral = TsTypeLiteral.create(TsLiteral.num("42"));
			const booleanLiteral = TsTypeLiteral.create(TsLiteral.bool(true));

			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([
					stringLiteral,
					numberLiteral,
					booleanLiteral,
				]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(3);
				expect(unionResult.types.toArray()).toContain(stringLiteral);
				expect(unionResult.types.toArray()).toContain(numberLiteral);
				expect(unionResult.types.toArray()).toContain(booleanLiteral);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("union with function types", () => {
			const param = TsFunParam.create(
				Comments.empty(),
				TsIdent.simple("x"),
				some(TsTypeRef.number),
			);
			const signature = TsFunSig.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray([param]),
				some(TsTypeRef.string),
			);
			const functionType = TsTypeFunction.create(signature);

			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([functionType, TsTypeRef.string]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				const typeStrings = unionResult.types.toArray().map((t) => t.asString);
				expect(typeStrings).toContain(functionType.asString);
				expect(typeStrings).toContain(TsTypeRef.string.asString);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("union with object types", () => {
			const prop = TsMemberProperty.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsIdent.simple("prop"),
				some(TsTypeRef.string),
				none,
				false,
				false,
			);
			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray<TsMember>([prop]),
			);

			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([objectType, TsTypeRef.number]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				const typeStrings = unionResult.types.toArray().map((t) => t.asString);
				expect(typeStrings).toContain(objectType.asString);
				expect(typeStrings).toContain(TsTypeRef.number.asString);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("union with never type", () => {
			const neverType = TsTypeRef.never;
			const stringType = TsTypeRef.string;

			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([neverType, stringType]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				expect(unionResult.types.toArray()).toContain(neverType);
				expect(unionResult.types.toArray()).toContain(stringType);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("union with any type", () => {
			const anyType = TsTypeRef.any;
			const stringType = TsTypeRef.string;

			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([anyType, stringType]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				expect(unionResult.types.toArray()).toContain(anyType);
				expect(unionResult.types.toArray()).toContain(stringType);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("union with undefined and null", () => {
			const undefinedType = TsTypeRef.undefined;
			const nullType = TsTypeRef.null;
			const stringType = TsTypeRef.string;

			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([undefinedType, nullType, stringType]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(3);
				expect(unionResult.types.toArray()).toContain(undefinedType);
				expect(unionResult.types.toArray()).toContain(nullType);
				expect(unionResult.types.toArray()).toContain(stringType);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});
	});

	describe("Type System Integration", () => {
		it("union with type references", () => {
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

			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([customType1, customType2]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				expect(unionResult.types.toArray()).toContain(customType1);
				expect(unionResult.types.toArray()).toContain(customType2);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("union with generic types", () => {
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

			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([genericType1, genericType2]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				expect(unionResult.types.toArray()).toContain(genericType1);
				expect(unionResult.types.toArray()).toContain(genericType2);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("union with tuple types", () => {
			const tupleElement1 = TsTupleElement.create(none, TsTypeRef.string);
			const tupleElement2 = TsTupleElement.create(none, TsTypeRef.number);
			const tupleType = TsTypeTuple.create(
				IArray.fromArray([tupleElement1, tupleElement2]),
			);

			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([tupleType, TsTypeRef.boolean]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				const typeStrings = unionResult.types.toArray().map((t) => t.asString);
				expect(typeStrings).toContain(tupleType.asString);
				expect(typeStrings).toContain(TsTypeRef.boolean.asString);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("union with conditional types", () => {
			const conditionalType = TsTypeConditional.create(
				TsTypeRef.string,
				TsTypeRef.number,
				TsTypeRef.boolean,
			);

			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([conditionalType, TsTypeRef.any]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				const typeStrings = unionResult.types.toArray().map((t) => t.asString);
				expect(typeStrings).toContain(conditionalType.asString);
				expect(typeStrings).toContain(TsTypeRef.any.asString);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});
	});

	describe("Performance and Scalability", () => {
		it("large union types", () => {
			const types = IArray.fromArray<TsType>(
				Array.from({ length: 100 }, (_, i) =>
					TsTypeRef.create(
						Comments.empty(),
						TsQIdent.of(TsIdent.simple(`Type${i + 1}`)),
						IArray.Empty,
					),
				),
			);

			const result = TsTypeUnion.simplified(types);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(100);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("deeply nested union flattening", () => {
			// Create a deeply nested structure: ((((string | number) | boolean) | any) | void)
			const type1 = TsTypeRef.string;
			const type2 = TsTypeRef.number;
			const type3 = TsTypeRef.boolean;
			const type4 = TsTypeRef.any;
			const type5 = TsTypeRef.void;

			const level1 = TsTypeUnion.create(
				IArray.fromArray<TsType>([type1, type2]),
			);
			const level2 = TsTypeUnion.create(
				IArray.fromArray<TsType>([level1, type3]),
			);
			const level3 = TsTypeUnion.create(
				IArray.fromArray<TsType>([level2, type4]),
			);
			const result = TsTypeUnion.simplified(
				IArray.fromArray<TsType>([level3, type5]),
			);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(5);
				expect(unionResult.types.toArray()).toContain(type1);
				expect(unionResult.types.toArray()).toContain(type2);
				expect(unionResult.types.toArray()).toContain(type3);
				expect(unionResult.types.toArray()).toContain(type4);
				expect(unionResult.types.toArray()).toContain(type5);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});

		it("union with many duplicate types", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;

			// Create union with many duplicates
			const types = IArray.fromArray([
				...Array(50).fill(stringType),
				...Array(50).fill(numberType),
			]);

			const result = TsTypeUnion.simplified(types);

			if (result._tag === "TsTypeUnion") {
				const unionResult = result as TsTypeUnion;
				expect(unionResult.types.length).toBe(2);
				expect(unionResult.types.toArray()).toContain(stringType);
				expect(unionResult.types.toArray()).toContain(numberType);
			} else {
				expect(false).toBe(true); // Should be TsTypeUnion
			}
		});
	});

	describe("Equality and HashCode", () => {
		it("equal union types have same hash code", () => {
			const types1 = IArray.fromArray<TsType>([
				TsTypeRef.string,
				TsTypeRef.number,
			]);
			const types2 = IArray.fromArray<TsType>([
				TsTypeRef.string,
				TsTypeRef.number,
			]);
			const union1 = TsTypeUnion.create(types1);
			const union2 = TsTypeUnion.create(types2);

			// In TypeScript, we compare structural equality through asString
			expect(union1.asString).toBe(union2.asString);
			expect(union1._tag).toBe(union2._tag);
			expect(union1.types.length).toBe(union2.types.length);
		});

		it("different union types are not equal", () => {
			const union1 = TsTypeUnion.create(
				IArray.fromArray<TsType>([TsTypeRef.string, TsTypeRef.number]),
			);
			const union2 = TsTypeUnion.create(
				IArray.fromArray<TsType>([TsTypeRef.string, TsTypeRef.boolean]),
			);

			expect(union1.asString).not.toBe(union2.asString);
		});

		it("order matters for equality", () => {
			const union1 = TsTypeUnion.create(
				IArray.fromArray<TsType>([TsTypeRef.string, TsTypeRef.number]),
			);
			const union2 = TsTypeUnion.create(
				IArray.fromArray<TsType>([TsTypeRef.number, TsTypeRef.string]),
			);

			expect(union1.asString).not.toBe(union2.asString);
		});

		it("empty unions are equal", () => {
			const union1 = TsTypeUnion.create(IArray.Empty);
			const union2 = TsTypeUnion.create(IArray.Empty);

			expect(union1.asString).toBe(union2.asString);
			expect(union1._tag).toBe(union2._tag);
			expect(union1.types.length).toBe(union2.types.length);
		});
	});

	describe("String Representation", () => {
		it("asString contains type information", () => {
			const union = TsTypeUnion.create(
				IArray.fromArray<TsType>([TsTypeRef.string, TsTypeRef.number]),
			);
			const str = union.asString;

			expect(str).toContain("TsTypeUnion");
		});

		it("empty union asString", () => {
			const union = TsTypeUnion.create(IArray.Empty);
			const str = union.asString;

			expect(str).toContain("TsTypeUnion");
		});

		it("single type union asString", () => {
			const union = TsTypeUnion.create(
				IArray.fromArray<TsType>([TsTypeRef.string]),
			);
			const str = union.asString;

			expect(str).toContain("TsTypeUnion");
		});
	});
});
