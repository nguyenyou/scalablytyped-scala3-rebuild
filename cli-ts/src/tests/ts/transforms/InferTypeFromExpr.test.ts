/**
 * TypeScript port of InferTypeFromExprTests.scala
 *
 * Tests for the InferTypeFromExpr transform that infers types from expressions
 * for properties and variables that have expressions but no explicit type annotations.
 */

import { describe, expect, test } from "bun:test";
import { none, some, type Option } from "fp-ts/Option";
import { Comments, NoComments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import {
	TsDeclVar,
	TsExpr,
	TsExprArrayOf,
	TsExprBinaryOp,
	TsExprCall,
	TsExprCast,
	TsExprLiteral,
	TsExprRef,
	TsExprUnary,
	TsIdent,
	TsIdentSimple,
	TsLiteral,
	TsMemberProperty,
	TsParsedFile,
	TsProtectionLevel,
	TsQIdent,
	type TsType,
	TsTypeRef,
	TsTypeUnion,
} from "@/internal/ts/trees.js";
import {
	InferTypeFromExpr,
	InferTypeFromExprTransform,
} from "@/internal/ts/transforms/InferTypeFromExpr.js";

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

function createLiteralExpr(value: string): TsExpr {
	return TsExprLiteral.create(TsLiteral.str(value));
}

function createNumLiteralExpr(value: string): TsExpr {
	return TsExprLiteral.create(TsLiteral.num(value));
}

function createBoolLiteralExpr(value: boolean): TsExpr {
	return TsExprLiteral.create(TsLiteral.bool(value));
}

function createRefExpr(name: string): TsExpr {
	return TsExprRef.create(createQIdent(name));
}

function createCallExpr(
	function_: TsExpr,
	params: IArray<TsExpr> = IArray.Empty,
): TsExpr {
	return TsExprCall.create(function_, params);
}

function createUnaryExpr(op: string, expr: TsExpr): TsExpr {
	return TsExprUnary.create(op, expr);
}

function createBinaryOpExpr(left: TsExpr, op: string, right: TsExpr): TsExpr {
	return TsExprBinaryOp.create(left, op, right);
}

function createCastExpr(expr: TsExpr, toType: TsType): TsExpr {
	return TsExprCast.create(expr, toType);
}

function createArrayOfExpr(expr: TsExpr): TsExpr {
	return TsExprArrayOf.create(expr);
}

function createMockProperty(
	name: string,
	tpe: Option<TsType> = none,
	expr: Option<TsExpr> = none,
): TsMemberProperty {
	return TsMemberProperty.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		tpe,
		expr,
		false, // isStatic
		false, // isReadOnly
	);
}

function createMockVar(
	name: string,
	tpe: Option<TsType> = none,
	expr: Option<TsExpr> = none,
): TsDeclVar {
	return TsDeclVar.create(
		NoComments.instance,
		false, // declared
		false, // readOnly
		createSimpleIdent(name),
		tpe,
		expr,
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

function assertHasComments(tpe: TsType): void {
	if (tpe._tag === "TsTypeRef") {
		const typeRef = tpe as TsTypeRef;
		expect(typeRef.comments.cs.length).toBeGreaterThan(0);
	}
	// Other types don't have comments added by InferTypeFromExpr
}

// Helper function to safely access Option values in tests
function expectSomeType(optType: Option<TsType>): TsType {
	expect(optType._tag).toBe("Some");
	if (optType._tag === "Some") {
		return optType.value;
	}
	throw new Error("Expected Some but got None");
}

// ============================================================================
// Test Suite
// ============================================================================

describe("InferTypeFromExpr", () => {
	describe("Basic Functionality", () => {
		test("extends TreeTransformationScopedChanges", () => {
			expect(InferTypeFromExprTransform).toBeInstanceOf(TreeTransformationScopedChanges);
		});

		test("has enterTsMemberProperty method", () => {
			const scope = createMockScope();
			const property = createMockProperty("testProp");
			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsMemberProperty");
		});

		test("has enterTsDeclVar method", () => {
			const scope = createMockScope();
			const variable = createMockVar("testVar");
			const result = InferTypeFromExprTransform.enterTsDeclVar(scope)(variable);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsDeclVar");
		});

		test("leaves properties with types unchanged", () => {
			const scope = createMockScope();
			const stringType = TsTypeRef.string;
			const property = createMockProperty("testProp", some(stringType), some(createLiteralExpr("value")));
			
			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);
			
			expect(result).toBe(property); // Should be unchanged
			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("Some");
		});

		test("leaves variables with types unchanged", () => {
			const scope = createMockScope();
			const stringType = TsTypeRef.string;
			const variable = createMockVar("testVar", some(stringType), some(createLiteralExpr("value")));
			
			const result = InferTypeFromExprTransform.enterTsDeclVar(scope)(variable);
			
			expect(result).toBe(variable); // Should be unchanged
			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("Some");
		});
	});

	describe("Property Type Inference", () => {
		test("infers type from string literal", () => {
			const scope = createMockScope();
			const property = createMockProperty("testProp", none, some(createLiteralExpr("hello")));
			
			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);
			
			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None"); // Expression should be removed
			const inferredType = expectSomeType(result.tpe);
			expect(inferredType).toEqual(TsTypeRef.string);
			// Should have comment with original expression (only for TsTypeRef)
			assertHasComments(inferredType);
		});

		test("infers type from number literal", () => {
			const scope = createMockScope();
			const property = createMockProperty("testProp", none, some(createNumLiteralExpr("42")));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			const inferredType = expectSomeType(result.tpe);
			expect(inferredType).toEqual(TsTypeRef.number);
			assertHasComments(inferredType);
		});

		test("infers type from boolean literal", () => {
			const scope = createMockScope();
			const property = createMockProperty("testProp", none, some(createBoolLiteralExpr(true)));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			const inferredType = expectSomeType(result.tpe);
			expect(inferredType).toEqual(TsTypeRef.boolean);
			assertHasComments(inferredType);
		});

		test("infers type from reference expression", () => {
			const scope = createMockScope();
			const property = createMockProperty("testProp", none, some(createRefExpr("someRef")));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			// Reference expressions get the default type (string | number)
			const inferredType = expectSomeType(result.tpe);
			expect(inferredType._tag).toBe("TsTypeUnion");
			assertHasComments(inferredType);
		});

		test("infers type from call expression", () => {
			const scope = createMockScope();
			const callExpr = createCallExpr(createRefExpr("someFunction"));
			const property = createMockProperty("testProp", none, some(callExpr));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			// Call expressions get the default type (string | number)
			const inferredType = expectSomeType(result.tpe);
			expect(inferredType._tag).toBe("TsTypeUnion");
			assertHasComments(inferredType);
		});

		test("infers type from cast expression", () => {
			const scope = createMockScope();
			const castExpr = createCastExpr(createLiteralExpr("value"), TsTypeRef.number);
			const property = createMockProperty("testProp", none, some(castExpr));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			const inferredType = expectSomeType(result.tpe); expect(inferredType).toEqual(TsTypeRef.number);
			assertHasComments(inferredType);
		});

		test("infers type from array expression", () => {
			const scope = createMockScope();
			const arrayExpr = createArrayOfExpr(createLiteralExpr("item"));
			const property = createMockProperty("testProp", none, some(arrayExpr));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			// Array expressions get the default type (string | number)
			const inferredType = expectSomeType(result.tpe);
			expect(inferredType._tag).toBe("TsTypeUnion");
			assertHasComments(inferredType);
		});
	});

	describe("Variable Type Inference", () => {
		test("infers type from string literal in variable", () => {
			const scope = createMockScope();
			const variable = createMockVar("testVar", none, some(createLiteralExpr("hello")));

			const result = InferTypeFromExprTransform.enterTsDeclVar(scope)(variable);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			const inferredType = expectSomeType(result.tpe); expect(inferredType).toEqual(TsTypeRef.string);
			assertHasComments(inferredType);
		});

		test("infers type from number literal in variable", () => {
			const scope = createMockScope();
			const variable = createMockVar("testVar", none, some(createNumLiteralExpr("3.14")));

			const result = InferTypeFromExprTransform.enterTsDeclVar(scope)(variable);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			const inferredType = expectSomeType(result.tpe); expect(inferredType).toEqual(TsTypeRef.number);
			assertHasComments(inferredType);
		});

		test("infers type from boolean literal in variable", () => {
			const scope = createMockScope();
			const variable = createMockVar("testVar", none, some(createBoolLiteralExpr(false)));

			const result = InferTypeFromExprTransform.enterTsDeclVar(scope)(variable);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			const inferredType = expectSomeType(result.tpe); expect(inferredType).toEqual(TsTypeRef.boolean);
			assertHasComments(inferredType);
		});

		test("preserves variable metadata", () => {
			const scope = createMockScope();
			const originalComments = NoComments.instance;
			const variable = TsDeclVar.create(
				originalComments,
				true, // declared
				true, // readOnly
				createSimpleIdent("testVar"),
				none,
				some(createLiteralExpr("value")),
				JsLocation.zero(),
				CodePath.noPath(),
			);

			const result = InferTypeFromExprTransform.enterTsDeclVar(scope)(variable);

			// Should preserve all metadata except add type and remove expression
			expect(result.comments).toEqual(originalComments);
			expect(result.declared).toBe(true);
			expect(result.readOnly).toBe(true);
			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			const inferredType = expectSomeType(result.tpe); expect(inferredType).toEqual(TsTypeRef.string);
		});
	});

	describe("Complex Expressions", () => {
		test("infers type from unary expression", () => {
			const scope = createMockScope();
			const unaryExpr = createUnaryExpr("!", createBoolLiteralExpr(true));
			const property = createMockProperty("testProp", none, some(unaryExpr));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			// Unary expressions get the default type (string | number)
			const inferredType = expectSomeType(result.tpe);
			expect(inferredType._tag).toBe("TsTypeUnion");
			assertHasComments(inferredType);
		});

		test("infers type from binary operation - addition", () => {
			const scope = createMockScope();
			const binaryExpr = createBinaryOpExpr(createNumLiteralExpr("5"), "+", createNumLiteralExpr("3"));
			const property = createMockProperty("testProp", none, some(binaryExpr));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			// Should compute 5 + 3 = 8 as literal type, then widen to number
			const inferredType = expectSomeType(result.tpe); expect(inferredType).toEqual(TsTypeRef.number);
			assertHasComments(inferredType);
		});

		test("infers type from binary operation - multiplication", () => {
			const scope = createMockScope();
			const binaryExpr = createBinaryOpExpr(createNumLiteralExpr("4"), "*", createNumLiteralExpr("2"));
			const property = createMockProperty("testProp", none, some(binaryExpr));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			// Should compute 4 * 2 = 8 as literal type, then widen to number
			const inferredType = expectSomeType(result.tpe); expect(inferredType).toEqual(TsTypeRef.number);
			assertHasComments(inferredType);
		});

		test("infers type from binary operation - bit shift", () => {
			const scope = createMockScope();
			const binaryExpr = createBinaryOpExpr(createNumLiteralExpr("8"), "<<", createNumLiteralExpr("2"));
			const property = createMockProperty("testProp", none, some(binaryExpr));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			// Should compute 8 << 2 = 32 as literal type, then widen to number
			const inferredType = expectSomeType(result.tpe); expect(inferredType).toEqual(TsTypeRef.number);
			assertHasComments(inferredType);
		});

		test("infers type from nested expressions", () => {
			const scope = createMockScope();
			const innerExpr = createBinaryOpExpr(createNumLiteralExpr("2"), "+", createNumLiteralExpr("3"));
			const outerExpr = createUnaryExpr("-", innerExpr);
			const property = createMockProperty("testProp", none, some(outerExpr));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			const inferredType = expectSomeType(result.tpe); expect(inferredType).toEqual(TsTypeRef.number);
			assertHasComments(inferredType);
		});
	});

	describe("Edge Cases", () => {
		test("leaves properties without expressions unchanged", () => {
			const scope = createMockScope();
			const property = createMockProperty("testProp", none, none);

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result).toBe(property); // Should be unchanged
			expect(result.tpe._tag).toBe("None");
			expect(result.expr._tag).toBe("None");
		});

		test("leaves variables without expressions unchanged", () => {
			const scope = createMockScope();
			const variable = createMockVar("testVar", none, none);

			const result = InferTypeFromExprTransform.enterTsDeclVar(scope)(variable);

			expect(result).toBe(variable); // Should be unchanged
			expect(result.tpe._tag).toBe("None");
			expect(result.expr._tag).toBe("None");
		});

		test("handles complex type inference", () => {
			const scope = createMockScope();
			const complexExpr = createCallExpr(
				createRefExpr("complexFunction"),
				IArray.fromArray([createLiteralExpr("arg1"), createNumLiteralExpr("42")])
			);
			const property = createMockProperty("testProp", none, some(complexExpr));

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			// Complex call expressions get the default type (string | number)
			const inferredType = expectSomeType(result.tpe);
			expect(inferredType._tag).toBe("TsTypeUnion");
			assertHasComments(inferredType);
		});

		test("preserves property metadata", () => {
			const scope = createMockScope();
			const originalComments = NoComments.instance;
			const property = TsMemberProperty.create(
				originalComments,
				TsProtectionLevel.private(),
				createSimpleIdent("testProp"),
				none,
				some(createLiteralExpr("value")),
				true, // isStatic
				true, // isReadOnly
			);

			const result = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property);

			// Should preserve all metadata except add type and remove expression
			expect(result.comments).toEqual(originalComments);
			expect(result.level).toEqual(TsProtectionLevel.private());
			expect(result.isStatic).toBe(true);
			expect(result.isReadOnly).toBe(true);
			expect(result.tpe._tag).toBe("Some");
			expect(result.expr._tag).toBe("None");
			const inferredType = expectSomeType(result.tpe); expect(inferredType).toEqual(TsTypeRef.string);
		});
	});

	describe("Integration Scenarios", () => {
		test("handles mixed property and variable inference", () => {
			const scope = createMockScope();

			const property1 = createMockProperty("prop1", none, some(createLiteralExpr("string")));
			const property2 = createMockProperty("prop2", none, some(createNumLiteralExpr("123")));
			const variable1 = createMockVar("var1", none, some(createBoolLiteralExpr(true)));
			const variable2 = createMockVar("var2", none, some(createRefExpr("reference")));

			const resultProp1 = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property1);
			const resultProp2 = InferTypeFromExprTransform.enterTsMemberProperty(scope)(property2);
			const resultVar1 = InferTypeFromExprTransform.enterTsDeclVar(scope)(variable1);
			const resultVar2 = InferTypeFromExprTransform.enterTsDeclVar(scope)(variable2);

			// All should have inferred types and no expressions
			expect(resultProp1.tpe._tag).toBe("Some");
			expect(resultProp1.expr._tag).toBe("None");
			expect(resultProp2.tpe._tag).toBe("Some");
			expect(resultProp2.expr._tag).toBe("None");
			expect(resultVar1.tpe._tag).toBe("Some");
			expect(resultVar1.expr._tag).toBe("None");
			expect(resultVar2.tpe._tag).toBe("Some");
			expect(resultVar2.expr._tag).toBe("None");

			// Check specific types
			const inferredTypeProp1 = expectSomeType(resultProp1.tpe);
			expect(inferredTypeProp1).toEqual(TsTypeRef.string);
			const inferredTypeProp2 = expectSomeType(resultProp2.tpe);
			expect(inferredTypeProp2).toEqual(TsTypeRef.number);
			const inferredTypeVar1 = expectSomeType(resultVar1.tpe);
			expect(inferredTypeVar1).toEqual(TsTypeRef.boolean);
			const inferredTypeVar2 = expectSomeType(resultVar2.tpe);
			expect(inferredTypeVar2._tag).toBe("TsTypeUnion"); // Default type for references
		});
	});
});