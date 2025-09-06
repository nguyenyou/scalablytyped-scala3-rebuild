/**
 * Tests for InlineConstEnum transform.
 *
 * Port of org.scalablytyped.converter.internal.ts.transforms.InlineConstEnumTests
 */

import { describe, expect, it } from "bun:test";
import { none, some } from "fp-ts/Option";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import { InlineConstEnum } from "@/internal/ts/transforms/InlineConstEnum.js";
import { type TsType, TsTypeRef } from "@/internal/ts/trees.js";
import {
	createBoolLiteralExpr,
	createEnumMember,
	createLiteralExpr,
	createMockEnum,
	createMockScope,
	createNumLiteralExpr,
	createQIdentFromParts,
	createTypeRef,
	createTypeRefWithQIdent,
} from "@/tests/utils/TestUtils.js";

describe("InlineConstEnum", () => {
	describe("Basic Functionality", () => {
		it("extends TreeTransformationScopedChanges", () => {
			expect(InlineConstEnum.instance).toBeInstanceOf(
				TreeTransformationScopedChanges,
			);
		});

		it("has enterTsType method", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("TestType");
			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);
			expect(result).toBeDefined();
			expect(result._tag).toBeDefined();
		});

		it("leaves non-enum type references unchanged", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("RegularType");

			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			expect(result).toBe(typeRef); // Should be unchanged
		});

		it("leaves type references with type parameters unchanged", () => {
			const scope = createMockScope();
			const typeRef = TsTypeRef.create(
				Comments.empty(),
				createQIdentFromParts("test-lib", "GenericType"),
				IArray.fromArray<TsType>([TsTypeRef.string]),
			);

			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			expect(result).toBe(typeRef); // Should be unchanged due to type parameters
		});

		it("leaves type references with insufficient parts unchanged", () => {
			const scope = createMockScope();
			// Only 2 parts: libName + typeName (missing memberName)
			const typeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "SomeType"),
			);

			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			expect(result).toBe(typeRef); // Should be unchanged due to insufficient parts
		});
	});

	describe("Const Enum Inlining", () => {
		it("successfully inlines string const enum member", () => {
			const member = createEnumMember(
				"VALUE",
				some(createLiteralExpr("hello")),
			);
			const constEnum = createMockEnum(
				"StringEnum",
				IArray.fromArray([member]),
				true,
			);
			const scope = createMockScope("test-lib", constEnum);

			const typeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "StringEnum", "VALUE"),
			);
			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			// Should be inlined to a string literal type
			expect(result._tag).toBe("TsTypeLiteral");
			const literalType = result as any;
			expect(literalType.literal._tag).toBe("TsLiteralStr");
			expect(literalType.literal.value).toBe("hello");
		});

		it("successfully inlines number const enum member", () => {
			const member = createEnumMember(
				"VALUE",
				some(createNumLiteralExpr("42")),
			);
			const constEnum = createMockEnum(
				"NumberEnum",
				IArray.fromArray([member]),
				true,
			);
			const scope = createMockScope("test-lib", constEnum);

			const typeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "NumberEnum", "VALUE"),
			);
			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			// Should be inlined to a number literal type
			expect(result._tag).toBe("TsTypeLiteral");
			const literalType = result as any;
			expect(literalType.literal._tag).toBe("TsLiteralNum");
			expect(literalType.literal.value).toBe("42");
		});

		it("successfully inlines boolean const enum member", () => {
			const member = createEnumMember(
				"VALUE",
				some(createBoolLiteralExpr(true)),
			);
			const constEnum = createMockEnum(
				"BoolEnum",
				IArray.fromArray([member]),
				true,
			);
			const scope = createMockScope("test-lib", constEnum);

			const typeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "BoolEnum", "VALUE"),
			);
			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			// Should be inlined to a boolean literal type
			expect(result._tag).toBe("TsTypeLiteral");
			const literalType = result as any;
			expect(literalType.literal._tag).toBe("TsLiteralBool");
			expect(literalType.literal.value).toBe("true"); // Boolean literals are stored as strings
		});

		it("inlines const enum member without expression to union type", () => {
			const member = createEnumMember("VALUE", none); // No expression - should get default type
			const constEnum = createMockEnum(
				"DefaultEnum",
				IArray.fromArray([member]),
				true,
			);
			const scope = createMockScope("test-lib", constEnum);

			const typeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "DefaultEnum", "VALUE"),
			);
			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			// Should be inlined to a union type (string | number) - the default type for expressions
			expect(result._tag).toBe("TsTypeUnion");
			const unionType = result as any;
			expect(unionType.types.length).toBe(2);
		});

		it("ignores non-const enums", () => {
			const member = createEnumMember("VALUE", some(createLiteralExpr("test")));
			const regularEnum = createMockEnum(
				"RegularEnum",
				IArray.fromArray([member]),
				false,
			); // not const
			const scope = createMockScope("test-lib", regularEnum);

			const typeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "RegularEnum", "VALUE"),
			);
			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			expect(result).toBe(typeRef); // Should be unchanged for non-const enums
		});
	});

	describe("Edge Cases", () => {
		it("handles non-existent enum member", () => {
			const member = createEnumMember("VALUE", some(createLiteralExpr("test")));
			const constEnum = createMockEnum(
				"TestEnum",
				IArray.fromArray([member]),
				true,
			);
			const scope = createMockScope("test-lib", constEnum);

			const typeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "TestEnum", "NONEXISTENT"),
			);
			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			expect(result).toBe(typeRef); // Should be unchanged when member doesn't exist
		});

		it("handles non-existent enum", () => {
			const scope = createMockScope();
			const typeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "NonExistentEnum", "VALUE"),
			);

			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			expect(result).toBe(typeRef); // Should be unchanged when enum doesn't exist
		});

		it("handles enum with no members", () => {
			const constEnum = createMockEnum("EmptyEnum", IArray.Empty, true);
			const scope = createMockScope("test-lib", constEnum);

			const typeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "EmptyEnum", "VALUE"),
			);
			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			expect(result).toBe(typeRef); // Should be unchanged when enum has no members
		});

		it("handles complex qualified identifiers", () => {
			const member = createEnumMember(
				"VALUE",
				some(createLiteralExpr("nested")),
			);
			const constEnum = createMockEnum(
				"NestedEnum",
				IArray.fromArray([member]),
				true,
			);
			const scope = createMockScope("test-lib", constEnum);

			const typeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "namespace", "NestedEnum", "VALUE"),
			);
			const result = InlineConstEnum.instance.enterTsType(scope)(typeRef);

			// Should try to lookup but fail since the enum path doesn't match
			expect(result).toBe(typeRef); // Should be unchanged
		});
	});

	describe("Integration Scenarios", () => {
		it("handles multiple const enums in scope", () => {
			const enum1Member = createEnumMember(
				"VALUE1",
				some(createLiteralExpr("first")),
			);
			const enum2Member = createEnumMember(
				"VALUE2",
				some(createNumLiteralExpr("2")),
			);
			const constEnum1 = createMockEnum(
				"Enum1",
				IArray.fromArray([enum1Member]),
				true,
			);
			const constEnum2 = createMockEnum(
				"Enum2",
				IArray.fromArray([enum2Member]),
				true,
			);
			const scope = createMockScope("test-lib", constEnum1, constEnum2);

			const typeRef1 = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "Enum1", "VALUE1"),
			);
			const typeRef2 = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "Enum2", "VALUE2"),
			);

			const result1 = InlineConstEnum.instance.enterTsType(scope)(typeRef1);
			const result2 = InlineConstEnum.instance.enterTsType(scope)(typeRef2);

			// Both should be successfully inlined
			expect(result1._tag).toBe("TsTypeLiteral");
			expect((result1 as any).literal.value).toBe("first");

			expect(result2._tag).toBe("TsTypeLiteral");
			expect((result2 as any).literal.value).toBe("2");
		});

		it("handles mixed const and regular enums", () => {
			const constMember = createEnumMember(
				"CONST_VALUE",
				some(createLiteralExpr("const")),
			);
			const regularMember = createEnumMember(
				"REGULAR_VALUE",
				some(createLiteralExpr("regular")),
			);
			const constEnum = createMockEnum(
				"ConstEnum",
				IArray.fromArray([constMember]),
				true,
			);
			const regularEnum = createMockEnum(
				"RegularEnum",
				IArray.fromArray([regularMember]),
				false,
			);
			const scope = createMockScope("test-lib", constEnum, regularEnum);

			const constTypeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "ConstEnum", "CONST_VALUE"),
			);
			const regularTypeRef = createTypeRefWithQIdent(
				createQIdentFromParts("test-lib", "RegularEnum", "REGULAR_VALUE"),
			);

			const constResult =
				InlineConstEnum.instance.enterTsType(scope)(constTypeRef);
			const regularResult =
				InlineConstEnum.instance.enterTsType(scope)(regularTypeRef);

			// Const enum should be inlined, regular enum should be unchanged
			expect(constResult._tag).toBe("TsTypeLiteral");
			expect((constResult as any).literal.value).toBe("const");

			expect(regularResult).toBe(regularTypeRef); // Regular enum unchanged
		});
	});
});
