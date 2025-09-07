/**
 * TypeScript port of InferEnumTypesTests.scala
 *
 * Tests for the InferEnumTypes transform that infers enum types by initializing
 * unspecified members and replacing references to other enum members.
 */

import { describe, expect, test } from "vitest";
import { none, type Option, some } from "fp-ts/Option";
import { Comments, NoComments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import { InferEnumTypes } from "@/internal/ts/transforms/InferEnumTypes.js";
import {
	TsDeclEnum,
	TsEnumMember,
	type TsExpr,
	TsExprLiteral,
	TsExprRef,
	TsIdent,
	type TsIdentSimple,
	TsLiteral,
	TsParsedFile,
	TsQIdent,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// ============================================================================
// Helper Functions for Creating Test Data
// ============================================================================

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createEnumMember(name: string, expr: Option<TsExpr> = none): TsEnumMember {
	return TsEnumMember.create(
		NoComments.instance,
		createSimpleIdent(name),
		expr,
	);
}

function createLiteralExpr(value: string): TsExpr {
	return TsExprLiteral.create(TsLiteral.str(value));
}

function createNumLiteralExpr(value: string): TsExpr {
	return TsExprLiteral.create(TsLiteral.num(value));
}

function createRefExpr(name: string): TsExpr {
	return TsExprRef.create(TsQIdent.of(createSimpleIdent(name)));
}

function createMockEnum(
	name: string,
	members: IArray<TsEnumMember>,
	isConst: boolean = false,
): TsDeclEnum {
	return TsDeclEnum.create(
		NoComments.instance,
		false, // declared
		isConst,
		createSimpleIdent(name),
		members,
		true, // isValue
		none, // exportedFrom
		JsLocation.zero(),
		CodePath.noPath(),
	);
}

function createMockScope(...declarations: any[]): TsTreeScope {
	const libName = TsIdent.librarySimple("test-lib");
	const parsedFile = TsParsedFile.create(
		NoComments.instance,
		IArray.Empty, // directives
		IArray.fromArray(declarations),
		CodePath.noPath(),
	);
	const deps = new Map();
	const logger = Logger.DevNull();

	const root = TsTreeScope.create(libName, false, deps, logger);
	return root["/"](parsedFile);
}

// ============================================================================
// Test Suite
// ============================================================================

describe("InferEnumTypes", () => {
	describe("Basic Functionality", () => {
		test("extends TreeTransformationScopedChanges", () => {
			const inferEnumTypes = new InferEnumTypes();
			expect(inferEnumTypes).toBeInstanceOf(TreeTransformationScopedChanges);
		});

		test("has enterTsDeclEnum method", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const testEnum = createMockEnum("TestEnum", IArray.Empty);
			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsDeclEnum");
		});

		test("leaves enums with all explicit values unchanged", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const member1 = createEnumMember("A", some(createLiteralExpr("valueA")));
			const member2 = createEnumMember("B", some(createLiteralExpr("valueB")));
			const testEnum = createMockEnum("TestEnum", IArray.fromArray([member1, member2]));

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.length).toBe(2);
			expect(result.members.apply(0).expr._tag).toBe("Some");
			expect(result.members.apply(1).expr._tag).toBe("Some");

			const firstMemberExpr = result.members.apply(0).expr;
			const secondMemberExpr = result.members.apply(1).expr;

			if (firstMemberExpr._tag === "Some") {
				expect(firstMemberExpr.value).toEqual(createLiteralExpr("valueA"));
			}
			if (secondMemberExpr._tag === "Some") {
				expect(secondMemberExpr.value).toEqual(createLiteralExpr("valueB"));
			}
		});
	});

	describe("Member Initialization", () => {
		test("initializes members without expressions", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const member1 = createEnumMember("A"); // No expression
			const member2 = createEnumMember("B"); // No expression
			const testEnum = createMockEnum("TestEnum", IArray.fromArray([member1, member2]));

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.length).toBe(2);
			expect(result.members.apply(0).expr._tag).toBe("Some");
			expect(result.members.apply(1).expr._tag).toBe("Some");

			const firstMemberExpr = result.members.apply(0).expr;
			const secondMemberExpr = result.members.apply(1).expr;

			// First member should get 0
			if (firstMemberExpr._tag === "Some") {
				expect(firstMemberExpr.value).toEqual(createNumLiteralExpr("0"));
			}

			// Second member should get 1
			if (secondMemberExpr._tag === "Some") {
				expect(secondMemberExpr.value).toEqual(createNumLiteralExpr("1"));
			}
		});

		test("handles mixed explicit and implicit values", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const member1 = createEnumMember("A"); // No expression - should get 0
			const member2 = createEnumMember("B", some(createLiteralExpr("explicit"))); // Explicit value
			const member3 = createEnumMember("C"); // No expression - should get 1
			const testEnum = createMockEnum("TestEnum", IArray.fromArray([member1, member2, member3]));

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.length).toBe(3);
			expect(result.members.apply(0).expr._tag).toBe("Some");
			expect(result.members.apply(1).expr._tag).toBe("Some");
			expect(result.members.apply(2).expr._tag).toBe("Some");

			const firstMemberExpr = result.members.apply(0).expr;
			const secondMemberExpr = result.members.apply(1).expr;
			const thirdMemberExpr = result.members.apply(2).expr;

			// First member should get 0
			if (firstMemberExpr._tag === "Some") {
				expect(firstMemberExpr.value).toEqual(createNumLiteralExpr("0"));
			}

			// Second member should keep explicit value
			if (secondMemberExpr._tag === "Some") {
				expect(secondMemberExpr.value).toEqual(createLiteralExpr("explicit"));
			}

			// Third member should get 1 (continues from last unspecified index)
			if (thirdMemberExpr._tag === "Some") {
				expect(thirdMemberExpr.value).toEqual(createNumLiteralExpr("1"));
			}
		});

		test("handles sequential initialization", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const member1 = createEnumMember("A"); // Should get 0
			const member2 = createEnumMember("B"); // Should get 1
			const member3 = createEnumMember("C"); // Should get 2
			const member4 = createEnumMember("D"); // Should get 3
			const testEnum = createMockEnum("TestEnum", IArray.fromArray([member1, member2, member3, member4]));

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.length).toBe(4);

			for (let i = 0; i < 4; i++) {
				const memberExpr = result.members.apply(i).expr;
				expect(memberExpr._tag).toBe("Some");
				if (memberExpr._tag === "Some") {
					expect(memberExpr.value).toEqual(createNumLiteralExpr(i.toString()));
				}
			}
		});
	});

	describe("Reference Replacement", () => {
		test("replaces references to other enum members", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const member1 = createEnumMember("A", some(createLiteralExpr("valueA")));
			const member2 = createEnumMember("B", some(createRefExpr("A"))); // References A
			const testEnum = createMockEnum("TestEnum", IArray.fromArray([member1, member2]));

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.length).toBe(2);

			const firstMemberExpr = result.members.apply(0).expr;
			const secondMemberExpr = result.members.apply(1).expr;

			// First member should keep its value
			if (firstMemberExpr._tag === "Some") {
				expect(firstMemberExpr.value).toEqual(createLiteralExpr("valueA"));
			}

			// Second member should have reference replaced with A's value
			if (secondMemberExpr._tag === "Some") {
				expect(secondMemberExpr.value).toEqual(createLiteralExpr("valueA"));
			}
		});

		test("handles multiple references", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const member1 = createEnumMember("A", some(createLiteralExpr("valueA")));
			const member2 = createEnumMember("B", some(createRefExpr("A"))); // References A
			const member3 = createEnumMember("C", some(createRefExpr("A"))); // Also references A
			const testEnum = createMockEnum("TestEnum", IArray.fromArray([member1, member2, member3]));

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.length).toBe(3);

			const firstMemberExpr = result.members.apply(0).expr;
			const secondMemberExpr = result.members.apply(1).expr;
			const thirdMemberExpr = result.members.apply(2).expr;

			// All members should have the same resolved value
			if (firstMemberExpr._tag === "Some") {
				expect(firstMemberExpr.value).toEqual(createLiteralExpr("valueA"));
			}
			if (secondMemberExpr._tag === "Some") {
				expect(secondMemberExpr.value).toEqual(createLiteralExpr("valueA"));
			}
			if (thirdMemberExpr._tag === "Some") {
				expect(thirdMemberExpr.value).toEqual(createLiteralExpr("valueA"));
			}
		});

		test("handles chained references", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const member1 = createEnumMember("A", some(createLiteralExpr("valueA")));
			const member2 = createEnumMember("B", some(createRefExpr("A"))); // References A
			const member3 = createEnumMember("C", some(createRefExpr("B"))); // References B
			const testEnum = createMockEnum("TestEnum", IArray.fromArray([member1, member2, member3]));

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.length).toBe(3);

			const firstMemberExpr = result.members.apply(0).expr;
			const secondMemberExpr = result.members.apply(1).expr;
			const thirdMemberExpr = result.members.apply(2).expr;

			// First member keeps its value
			if (firstMemberExpr._tag === "Some") {
				expect(firstMemberExpr.value).toEqual(createLiteralExpr("valueA"));
			}

			// Second member gets A's value
			if (secondMemberExpr._tag === "Some") {
				expect(secondMemberExpr.value).toEqual(createLiteralExpr("valueA"));
			}

			// Third member references B, and since B references A, C gets A's reference
			// The implementation replaces B's reference with A's value, so C ends up referencing A
			if (thirdMemberExpr._tag === "Some") {
				expect(thirdMemberExpr.value).toEqual(createRefExpr("A"));
			}
		});

		test("handles references to initialized members", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const member1 = createEnumMember("A"); // Will get 0
			const member2 = createEnumMember("B", some(createRefExpr("A"))); // References A
			const testEnum = createMockEnum("TestEnum", IArray.fromArray([member1, member2]));

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.length).toBe(2);

			const firstMemberExpr = result.members.apply(0).expr;
			const secondMemberExpr = result.members.apply(1).expr;

			// First member gets initialized to 0
			if (firstMemberExpr._tag === "Some") {
				expect(firstMemberExpr.value).toEqual(createNumLiteralExpr("0"));
			}

			// Second member gets A's resolved value (0)
			if (secondMemberExpr._tag === "Some") {
				expect(secondMemberExpr.value).toEqual(createNumLiteralExpr("0"));
			}
		});
	});

	describe("Edge Cases", () => {
		test("handles empty enum", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const testEnum = createMockEnum("EmptyEnum", IArray.Empty);

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.isEmpty).toBe(true);
			expect(result.name.value).toBe("EmptyEnum");
		});

		test("handles single member enum", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const member = createEnumMember("ONLY");
			const testEnum = createMockEnum("SingleEnum", IArray.fromArray([member]));

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.length).toBe(1);

			const memberExpr = result.members.apply(0).expr;
			if (memberExpr._tag === "Some") {
				expect(memberExpr.value).toEqual(createNumLiteralExpr("0"));
			}
		});

		test("handles non-existent references", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const member1 = createEnumMember("A", some(createLiteralExpr("valueA")));
			const member2 = createEnumMember("B", some(createRefExpr("NonExistent"))); // References non-existent member
			const testEnum = createMockEnum("TestEnum", IArray.fromArray([member1, member2]));

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			expect(result.members.length).toBe(2);

			const firstMemberExpr = result.members.apply(0).expr;
			const secondMemberExpr = result.members.apply(1).expr;

			// First member should keep its value
			if (firstMemberExpr._tag === "Some") {
				expect(firstMemberExpr.value).toEqual(createLiteralExpr("valueA"));
			}

			// Second member should keep the unresolved reference
			if (secondMemberExpr._tag === "Some") {
				expect(secondMemberExpr.value).toEqual(createRefExpr("NonExistent"));
			}
		});

		test("preserves enum metadata", () => {
			const inferEnumTypes = new InferEnumTypes();
			const scope = createMockScope();
			const originalComments = Comments.create("Enum comment");
			const member = createEnumMember("A");
			const testEnum = TsDeclEnum.create(
				originalComments,
				true, // declared
				true, // isConst
				createSimpleIdent("TestEnum"),
				IArray.fromArray([member]),
				false, // isValue
				some(TsTypeRef.create(NoComments.instance, TsQIdent.of(createSimpleIdent("module")), IArray.Empty)),
				JsLocation.zero(),
				CodePath.noPath(),
			);

			const result = inferEnumTypes.enterTsDeclEnum(scope)(testEnum);

			// Should preserve all metadata
			expect(result.comments).toEqual(originalComments);
			expect(result.declared).toBe(true);
			expect(result.isConst).toBe(true);
			expect(result.isValue).toBe(false);
			expect(result.exportedFrom._tag).toBe("Some");
			expect(result.members.length).toBe(1);

			const memberExpr = result.members.apply(0).expr;
			if (memberExpr._tag === "Some") {
				expect(memberExpr.value).toEqual(createNumLiteralExpr("0"));
			}
		});
	});
});
