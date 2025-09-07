/**
 * Tests for OptionalType.ts - TypeScript port of org.scalablytyped.converter.internal.ts.OptionalTypeTests
 * Comprehensive test suite ported from Scala OptionalTypeTests.scala to ensure behavioral parity
 */

import { describe, expect, test } from "vitest";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import {
	extractOptional,
	makeOptional,
	maybeOptional,
	OptionalType,
} from "@/internal/ts/OptionalType.js";
import {
	TsIdent,
	TsLiteral,
	TsQIdent,
	type TsType,
	TsTypeIntersect,
	TsTypeLiteral,
	TsTypeObject,
	TsTypeRef,
	TsTypeUnion,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data
const createSimpleIdent = (name: string): TsIdent => TsIdent.simple(name);
const createQIdent = (name: string): TsQIdent =>
	TsQIdent.of(createSimpleIdent(name));

const createMockTypeRef = (name: string): TsTypeRef =>
	TsTypeRef.create(Comments.empty(), createQIdent(name), IArray.Empty);

// Helper function to check if a union contains a type by string comparison
const unionContainsType = (union: TsTypeUnion, type: TsType): boolean => {
	return union.types.toArray().some((t) => t.asString === type.asString);
};

describe("OptionalType Tests", () => {
	describe("OptionalType - basic functionality", () => {
		test("makes a type optional by adding undefined", () => {
			const stringType = TsTypeRef.string;

			const result = OptionalType.apply(stringType);

			expect(result._tag).toBe("TsTypeUnion");
			const union = result as TsTypeUnion;
			expect(union.types.length).toBe(2);
			expect(unionContainsType(union, stringType)).toBe(true);
			expect(unionContainsType(union, TsTypeRef.undefined)).toBe(true);
		});

		test("makes custom type optional", () => {
			const customType = createMockTypeRef("MyType");

			const result = OptionalType.apply(customType);

			expect(result._tag).toBe("TsTypeUnion");
			const union = result as TsTypeUnion;
			expect(union.types.length).toBe(2);
			expect(unionContainsType(union, customType)).toBe(true);
			expect(unionContainsType(union, TsTypeRef.undefined)).toBe(true);
		});

		test("makes already optional type more optional", () => {
			const stringType = TsTypeRef.string;
			const optionalString = OptionalType.apply(stringType);

			const result = OptionalType.apply(optionalString);

			// Should create a union with the original optional type and undefined
			expect(result._tag).toBe("TsTypeUnion");
			const union = result as TsTypeUnion;
			// The simplified union should still contain string and undefined
			expect(unionContainsType(union, stringType)).toBe(true);
			expect(unionContainsType(union, TsTypeRef.undefined)).toBe(true);
		});

		test("handles primitive types", () => {
			const primitiveTypes = IArray.apply(
				TsTypeRef.string,
				TsTypeRef.number,
				TsTypeRef.boolean,
				TsTypeRef.any,
				TsTypeRef.never,
			);

			primitiveTypes.forEach((primitiveType) => {
				const result = OptionalType.apply(primitiveType);

				expect(result._tag).toBe("TsTypeUnion");
				const union = result as TsTypeUnion;
				expect(unionContainsType(union, primitiveType)).toBe(true);
				expect(unionContainsType(union, TsTypeRef.undefined)).toBe(true);
			});
		});
	});

	describe("OptionalType - unapply method (pattern matching)", () => {
		test("extracts type from simple optional type", () => {
			const stringType = TsTypeRef.string;
			const optionalString = TsTypeUnion.create(
				IArray.apply<TsType>(stringType, TsTypeRef.undefined),
			);

			const result = OptionalType.unapply(optionalString);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value).toBe(stringType);
			}
		});

		test("extracts type from optional type with null", () => {
			const numberType = TsTypeRef.number;
			const optionalNumber = TsTypeUnion.create(
				IArray.apply<TsType>(numberType, TsTypeRef.null),
			);

			const result = OptionalType.unapply(optionalNumber);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value).toBe(numberType);
			}
		});

		test("extracts type from optional type with both null and undefined", () => {
			const booleanType = TsTypeRef.boolean;
			const optionalBoolean = TsTypeUnion.create(
				IArray.apply<TsType>(booleanType, TsTypeRef.undefined, TsTypeRef.null),
			);

			const result = OptionalType.unapply(optionalBoolean);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value).toBe(booleanType);
			}
		});

		test("returns None for non-optional types", () => {
			const nonOptionalTypes = IArray.apply(
				TsTypeRef.string,
				TsTypeRef.number,
				createMockTypeRef("MyType"),
			);

			nonOptionalTypes.forEach((nonOptionalType) => {
				const result = OptionalType.unapply(nonOptionalType);
				expect(result._tag).toBe("None");
			});
		});

		test("returns None for union without undefined or null", () => {
			const unionWithoutOptional = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.string, TsTypeRef.number),
			);

			const result = OptionalType.unapply(unionWithoutOptional);

			expect(result._tag).toBe("None");
		});

		test("handles complex union types", () => {
			const complexUnion = TsTypeUnion.create(
				IArray.apply<TsType>(
					TsTypeRef.string,
					TsTypeRef.number,
					TsTypeRef.undefined,
				),
			);

			const result = OptionalType.unapply(complexUnion);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				// Should extract the union of string and number
				expect(result.value._tag).toBe("TsTypeUnion");
				const extractedUnion = result.value as TsTypeUnion;
				expect(unionContainsType(extractedUnion, TsTypeRef.string)).toBe(true);
				expect(unionContainsType(extractedUnion, TsTypeRef.number)).toBe(true);
				expect(unionContainsType(extractedUnion, TsTypeRef.undefined)).toBe(
					false,
				);
			}
		});
	});

	describe("OptionalType - maybe method", () => {
		test("makes type optional when isOptional is true", () => {
			const stringType = TsTypeRef.string;

			const result = OptionalType.maybe(stringType, true);

			expect(result._tag).toBe("TsTypeUnion");
			const union = result as TsTypeUnion;
			expect(unionContainsType(union, stringType)).toBe(true);
			expect(unionContainsType(union, TsTypeRef.undefined)).toBe(true);
		});

		test("returns original type when isOptional is false", () => {
			const numberType = TsTypeRef.number;

			const result = OptionalType.maybe(numberType, false);

			expect(result).toBe(numberType);
		});

		test("handles custom types with maybe", () => {
			const customType = createMockTypeRef("CustomType");

			const optionalResult = OptionalType.maybe(customType, true);
			const nonOptionalResult = OptionalType.maybe(customType, false);

			expect(optionalResult._tag).toBe("TsTypeUnion");
			expect(nonOptionalResult).toBe(customType);
		});
	});

	describe("OptionalType - nested optional types", () => {
		test("handles nested unapply on complex optional types", () => {
			const baseType = TsTypeRef.string;
			const optionalType = TsTypeUnion.create(
				IArray.apply<TsType>(baseType, TsTypeRef.undefined),
			);
			const nestedOptionalType = TsTypeUnion.create(
				IArray.apply<TsType>(optionalType, TsTypeRef.null),
			);

			const result = OptionalType.unapply(nestedOptionalType);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				// Should recursively extract the base type
				expect(result.value).toBe(baseType);
			}
		});

		test("handles deeply nested optional types", () => {
			const baseType = createMockTypeRef("BaseType");
			const level1 = TsTypeUnion.create(
				IArray.apply<TsType>(baseType, TsTypeRef.undefined),
			);
			const level2 = TsTypeUnion.create(
				IArray.apply<TsType>(level1, TsTypeRef.null),
			);
			const level3 = TsTypeUnion.create(
				IArray.apply<TsType>(level2, TsTypeRef.undefined),
			);

			const result = OptionalType.unapply(level3);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value).toBe(baseType);
			}
		});

		test("handles mixed optional types with multiple non-optional types", () => {
			const type1 = TsTypeRef.string;
			const type2 = TsTypeRef.number;
			const type3 = createMockTypeRef("CustomType");
			const mixedOptional = TsTypeUnion.create(
				IArray.apply<TsType>(
					type1,
					type2,
					type3,
					TsTypeRef.undefined,
					TsTypeRef.null,
				),
			);

			const result = OptionalType.unapply(mixedOptional);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value._tag).toBe("TsTypeUnion");
				const extractedUnion = result.value as TsTypeUnion;
				expect(unionContainsType(extractedUnion, type1)).toBe(true);
				expect(unionContainsType(extractedUnion, type2)).toBe(true);
				expect(unionContainsType(extractedUnion, type3)).toBe(true);
				expect(unionContainsType(extractedUnion, TsTypeRef.undefined)).toBe(
					false,
				);
				expect(unionContainsType(extractedUnion, TsTypeRef.null)).toBe(false);
			}
		});
	});

	describe("OptionalType - edge cases", () => {
		test("handles union with only undefined", () => {
			const onlyUndefined = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.undefined),
			);

			const result = OptionalType.unapply(onlyUndefined);

			// Should return Some(never) since simplified empty union becomes never
			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value.asString).toBe(TsTypeRef.never.asString);
			}
		});

		test("handles union with only null", () => {
			const onlyNull = TsTypeUnion.create(IArray.apply<TsType>(TsTypeRef.null));

			const result = OptionalType.unapply(onlyNull);

			// Should return Some(never) since simplified empty union becomes never
			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value.asString).toBe(TsTypeRef.never.asString);
			}
		});

		test("handles union with only null and undefined", () => {
			const onlyOptionals = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.undefined, TsTypeRef.null),
			);

			const result = OptionalType.unapply(onlyOptionals);

			// Should return Some(never) since simplified empty union becomes never
			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value.asString).toBe(TsTypeRef.never.asString);
			}
		});

		test("handles empty union", () => {
			const emptyUnion = TsTypeUnion.create(IArray.Empty);

			const result = OptionalType.unapply(emptyUnion);

			expect(result._tag).toBe("None");
		});

		test("handles single type union", () => {
			const singleTypeUnion = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.string),
			);

			const result = OptionalType.unapply(singleTypeUnion);

			expect(result._tag).toBe("None"); // No undefined or null, so not optional
		});
	});

	describe("OptionalType - complex type structures", () => {
		test("handles object types", () => {
			const objectType = TsTypeObject.create(Comments.empty(), IArray.Empty);

			const optionalObject = OptionalType.apply(objectType);
			const extractedObject = OptionalType.unapply(optionalObject);

			expect(optionalObject._tag).toBe("TsTypeUnion");
			expect(extractedObject._tag).toBe("Some");
			if (extractedObject._tag === "Some") {
				expect(extractedObject.value).toBe(objectType);
			}
		});

		test("handles intersection types", () => {
			const intersectionType = TsTypeIntersect.create(
				IArray.apply<TsType>(TsTypeRef.string, TsTypeRef.number),
			);

			const optionalIntersection = OptionalType.apply(intersectionType);
			const extractedIntersection = OptionalType.unapply(optionalIntersection);

			expect(optionalIntersection._tag).toBe("TsTypeUnion");
			expect(extractedIntersection._tag).toBe("Some");
			if (extractedIntersection._tag === "Some") {
				expect(extractedIntersection.value).toBe(intersectionType);
			}
		});

		test("handles literal types", () => {
			const literalType = TsTypeLiteral.create(TsLiteral.str("hello"));

			const optionalLiteral = OptionalType.apply(literalType);
			const extractedLiteral = OptionalType.unapply(optionalLiteral);

			expect(optionalLiteral._tag).toBe("TsTypeUnion");
			expect(extractedLiteral._tag).toBe("Some");
			if (extractedLiteral._tag === "Some") {
				expect(extractedLiteral.value).toBe(literalType);
			}
		});

		test("handles generic types", () => {
			const genericType = TsTypeRef.create(
				Comments.empty(),
				createQIdent("Array"),
				IArray.apply<TsType>(TsTypeRef.string),
			);

			const optionalGeneric = OptionalType.apply(genericType);
			const extractedGeneric = OptionalType.unapply(optionalGeneric);

			expect(optionalGeneric._tag).toBe("TsTypeUnion");
			expect(extractedGeneric._tag).toBe("Some");
			if (extractedGeneric._tag === "Some") {
				expect(extractedGeneric.value).toBe(genericType);
			}
		});
	});

	describe("OptionalType - undefineds set", () => {
		test("undefineds set contains correct types", () => {
			expect(OptionalType.undefineds.has("TsQIdent(undefined)")).toBe(true);
			expect(OptionalType.undefineds.has("TsQIdent(null)")).toBe(true);
			expect(OptionalType.undefineds.size).toBe(2);
		});

		test("undefineds set does not contain other types", () => {
			expect(OptionalType.undefineds.has("TsQIdent(string)")).toBe(false);
			expect(OptionalType.undefineds.has("TsQIdent(number)")).toBe(false);
			expect(OptionalType.undefineds.has("TsQIdent(boolean)")).toBe(false);
			expect(OptionalType.undefineds.has("TsQIdent(any)")).toBe(false);
			expect(OptionalType.undefineds.has("TsQIdent(never)")).toBe(false);
		});
	});

	describe("OptionalType - integration with TsTypeUnion.simplified", () => {
		test("apply method uses TsTypeUnion.simplified", () => {
			const stringType = TsTypeRef.string;

			const result = OptionalType.apply(stringType);

			// The result should be simplified - if string and undefined are duplicated, they should be deduplicated
			expect(result._tag).toBe("TsTypeUnion");
			const union = result as TsTypeUnion;
			expect(union.types.length).toBe(2);
			expect(unionContainsType(union, stringType)).toBe(true);
			expect(unionContainsType(union, TsTypeRef.undefined)).toBe(true);
		});

		test("apply method handles already undefined type", () => {
			const result = OptionalType.apply(TsTypeRef.undefined);

			// Should create union with undefined twice, but simplified should deduplicate to just undefined
			expect(result.asString).toBe(TsTypeRef.undefined.asString);
		});

		test("apply method handles already null type", () => {
			const result = OptionalType.apply(TsTypeRef.null);

			// Should create union with null and undefined, simplified
			expect(result._tag).toBe("TsTypeUnion");
			const union = result as TsTypeUnion;
			expect(unionContainsType(union, TsTypeRef.null)).toBe(true);
			expect(unionContainsType(union, TsTypeRef.undefined)).toBe(true);
		});
	});

	describe("OptionalType - pattern matching scenarios", () => {
		test("can be used in pattern matching", () => {
			const optionalString = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.string, TsTypeRef.undefined),
			);
			const nonOptionalNumber = TsTypeRef.number;

			const result1 = (() => {
				const extracted = OptionalType.unapply(optionalString);
				if (extracted._tag === "Some") {
					return `Optional: ${extracted.value.asString}`;
				} else {
					return `Not optional: ${optionalString.asString}`;
				}
			})();

			const result2 = (() => {
				const extracted = OptionalType.unapply(nonOptionalNumber);
				if (extracted._tag === "Some") {
					return `Optional: ${extracted.value.asString}`;
				} else {
					return `Not optional: ${nonOptionalNumber.asString}`;
				}
			})();

			expect(result1).toContain("Optional:");
			expect(result2).toContain("Not optional:");
		});

		test("pattern matching with nested optional types", () => {
			const baseType = createMockTypeRef("BaseType");
			const level1Optional = TsTypeUnion.create(
				IArray.apply<TsType>(baseType, TsTypeRef.undefined),
			);
			const level2Optional = TsTypeUnion.create(
				IArray.apply<TsType>(level1Optional, TsTypeRef.null),
			);

			const result = (() => {
				const extracted = OptionalType.unapply(level2Optional);
				if (extracted._tag === "Some") {
					return extracted.value;
				} else {
					return level2Optional;
				}
			})();

			// Should extract down to the base type
			expect(result).toBe(baseType);
		});
	});

	describe("OptionalType - performance and edge cases", () => {
		test("handles large union types efficiently", () => {
			const manyTypes = Array.from({ length: 50 }, (_, i) =>
				createMockTypeRef(`Type${i + 1}`),
			);
			const largeUnion = TsTypeUnion.create(
				IArray.fromArray<TsType>(manyTypes).append(TsTypeRef.undefined),
			);

			const result = OptionalType.unapply(largeUnion);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value._tag).toBe("TsTypeUnion");
				const extractedUnion = result.value as TsTypeUnion;
				expect(extractedUnion.types.length).toBe(50); // All types except undefined
				expect(unionContainsType(extractedUnion, TsTypeRef.undefined)).toBe(
					false,
				);
			}
		});

		test("handles union with duplicated optional types", () => {
			const stringType = TsTypeRef.string;
			const unionWithDuplicates = TsTypeUnion.create(
				IArray.apply<TsType>(
					stringType,
					TsTypeRef.undefined,
					TsTypeRef.null,
					TsTypeRef.undefined, // Duplicate
					TsTypeRef.null, // Duplicate
				),
			);

			const result = OptionalType.unapply(unionWithDuplicates);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value).toBe(stringType);
			}
		});

		test("handles complex nested union structures", () => {
			const innerUnion = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.string, TsTypeRef.number),
			);
			const outerUnion = TsTypeUnion.create(
				IArray.apply<TsType>(innerUnion, TsTypeRef.undefined),
			);

			const result = OptionalType.unapply(outerUnion);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value.asString).toBe(innerUnion.asString);
			}
		});
	});

	describe("OptionalType - function composition", () => {
		test("apply and unapply are inverse operations", () => {
			const originalTypes = IArray.apply(
				TsTypeRef.string,
				TsTypeRef.number,
				createMockTypeRef("CustomType"),
			);

			originalTypes.forEach((originalType) => {
				const optional = OptionalType.apply(originalType);
				const extracted = OptionalType.unapply(optional);

				expect(extracted._tag).toBe("Some");
				if (extracted._tag === "Some") {
					expect(extracted.value).toBe(originalType);
				}
			});
		});

		test("maybe with true is equivalent to apply", () => {
			const testTypes = IArray.apply(
				TsTypeRef.string,
				TsTypeRef.boolean,
				createMockTypeRef("TestType"),
			);

			testTypes.forEach((testType) => {
				const viaApply = OptionalType.apply(testType);
				const viaMaybe = OptionalType.maybe(testType, true);

				expect(viaApply.asString).toBe(viaMaybe.asString);
			});
		});

		test("maybe with false is identity", () => {
			const testTypes = IArray.apply(
				TsTypeRef.number,
				TsTypeRef.any,
				createMockTypeRef("IdentityType"),
			);

			testTypes.forEach((testType) => {
				const result = OptionalType.maybe(testType, false);
				expect(result).toBe(testType);
			});
		});
	});

	describe("OptionalType - convenience functions", () => {
		test("makeOptional is equivalent to OptionalType.apply", () => {
			const testType = TsTypeRef.string;

			const viaApply = OptionalType.apply(testType);
			const viaMakeOptional = makeOptional(testType);

			expect(viaApply.asString).toBe(viaMakeOptional.asString);
		});

		test("maybeOptional is equivalent to OptionalType.maybe", () => {
			const testType = TsTypeRef.number;

			const viaMethod = OptionalType.maybe(testType, true);
			const viaFunction = maybeOptional(testType, true);

			expect(viaMethod.asString).toBe(viaFunction.asString);

			const viaMethodFalse = OptionalType.maybe(testType, false);
			const viaFunctionFalse = maybeOptional(testType, false);

			expect(viaMethodFalse.asString).toBe(viaFunctionFalse.asString);
		});

		test("extractOptional is equivalent to OptionalType.unapply", () => {
			const optionalType = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.string, TsTypeRef.undefined),
			);

			const viaMethod = OptionalType.unapply(optionalType);
			const viaFunction = extractOptional(optionalType);

			expect(viaMethod).toEqual(viaFunction);
		});
	});

	describe("OptionalType - utility methods", () => {
		test("isOptionalMarker correctly identifies optional markers", () => {
			expect(OptionalType.isOptionalMarker(TsTypeRef.undefined)).toBe(true);
			expect(OptionalType.isOptionalMarker(TsTypeRef.null)).toBe(true);
			expect(OptionalType.isOptionalMarker(TsTypeRef.string)).toBe(false);
			expect(OptionalType.isOptionalMarker(TsTypeRef.number)).toBe(false);
		});

		test("isOptional correctly identifies optional types", () => {
			const optionalString = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.string, TsTypeRef.undefined),
			);
			const nonOptionalString = TsTypeRef.string;
			const unionWithoutOptional = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.string, TsTypeRef.number),
			);

			expect(OptionalType.isOptional(optionalString)).toBe(true);
			expect(OptionalType.isOptional(nonOptionalString)).toBe(false);
			expect(OptionalType.isOptional(unionWithoutOptional)).toBe(false);
		});

		test("isUnionType correctly identifies union types", () => {
			const unionType = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.string, TsTypeRef.number),
			);
			const nonUnionType = TsTypeRef.string;

			expect(OptionalType.isUnionType(unionType)).toBe(true);
			expect(OptionalType.isUnionType(nonUnionType)).toBe(false);
		});
	});
});
