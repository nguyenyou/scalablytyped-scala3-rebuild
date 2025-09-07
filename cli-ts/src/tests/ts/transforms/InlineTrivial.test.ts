/**
 * TypeScript port of InlineTrivialTests.scala
 *
 * Tests for the InlineTrivial transform that inlines trivial type aliases and interfaces
 * by following chains of type references to their final targets.
 */

import { none, type Option, some } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { Comment, IsTrivial } from "@/internal/Comment.js";
import { Comments, NoComments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import { InlineTrivialTransform } from "@/internal/ts/transforms/InlineTrivial.js";
import {
	TsDeclEnum,
	TsDeclInterface,
	TsDeclTypeAlias,
	TsIdent,
	type TsIdentSimple,
	TsParsedFile,
	TsQIdent,
	type TsType,
	TsTypeIntersect,
	TsTypeRef,
	TsTypeUnion,
} from "@/internal/ts/trees.js";

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

function createTypeRefWithComments(
	name: string,
	comments: Comments,
): TsTypeRef {
	return TsTypeRef.create(comments, createQIdent(name), IArray.Empty);
}

function createMockTypeAlias(
	name: string,
	alias: TsType,
	isTrivial: boolean = false,
): TsDeclTypeAlias {
	const comments = isTrivial
		? Comments.apply([IsTrivial.instance])
		: NoComments.instance;
	return TsDeclTypeAlias.create(
		comments,
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		alias,
		CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent(name)),
	);
}

function createMockInterface(
	name: string,
	inheritance: IArray<TsTypeRef> = IArray.Empty,
	isTrivial: boolean = false,
): TsDeclInterface {
	const comments = isTrivial
		? Comments.apply([IsTrivial.instance])
		: NoComments.instance;
	return TsDeclInterface.create(
		comments,
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		inheritance,
		IArray.Empty, // members
		CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent(name)),
	);
}

function createMockEnum(
	name: string,
	exportedFrom: Option<TsTypeRef> = none,
): TsDeclEnum {
	return TsDeclEnum.create(
		NoComments.instance,
		false, // declared
		false, // isConst
		createSimpleIdent(name),
		IArray.Empty, // members
		true, // isValue
		exportedFrom,
		JsLocation.zero(),
		CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent(name)),
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

describe("InlineTrivial", () => {
	describe("Basic Functionality", () => {
		test("extends TreeTransformationScopedChanges", () => {
			expect(InlineTrivialTransform).toBeInstanceOf(
				TreeTransformationScopedChanges,
			);
		});

		test("has enterTsTypeRef method", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("TestType");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsTypeRef");
		});

		test("has rewritten method", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("TestType");
			const result = InlineTrivialTransform.rewritten(scope, typeRef);
			expect(result._tag).toBe("None");
		});

		test("leaves primitive type references unchanged", () => {
			const scope = createMockScope();
			const stringRef = createTypeRef("string");
			const numberRef = createTypeRef("number");
			const booleanRef = createTypeRef("boolean");

			const result1 = InlineTrivialTransform.enterTsTypeRef(scope)(stringRef);
			const result2 = InlineTrivialTransform.enterTsTypeRef(scope)(numberRef);
			const result3 = InlineTrivialTransform.enterTsTypeRef(scope)(booleanRef);

			expect(result1).toBe(stringRef);
			expect(result2).toBe(numberRef);
			expect(result3).toBe(booleanRef);
		});

		test("leaves non-existent type references unchanged", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("NonExistentType");

			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			expect(result).toBe(typeRef);
		});
	});

	describe("Enum Inlining", () => {
		test("inlines enum with exportedFrom", () => {
			const exportedFromRef = createTypeRef("ExportedEnum");
			const enumDecl = createMockEnum("LocalEnum", some(exportedFromRef));
			const scope = createMockScope(enumDecl);

			const typeRef = createTypeRef("LocalEnum");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should inline to the exported enum reference
			expect(result.name.asString).toBe(exportedFromRef.name.asString);
			expect(result.tparams.length).toBe(0);
		});

		test("does not inline enum with type parameters", () => {
			const exportedFromRef = createTypeRef("ExportedEnum");
			const enumDecl = createMockEnum("LocalEnum", some(exportedFromRef));
			const scope = createMockScope(enumDecl);

			const typeRef = TsTypeRef.create(
				NoComments.instance,
				createQIdent("LocalEnum"),
				IArray.fromArray<TsType>([createTypeRef("string")]),
			);
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should not inline when type parameters are present
			expect(result).toBe(typeRef);
		});

		test("does not inline enum without exportedFrom", () => {
			const enumDecl = createMockEnum("LocalEnum", none);
			const scope = createMockScope(enumDecl);

			const typeRef = createTypeRef("LocalEnum");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should not inline when no exportedFrom
			expect(result).toBe(typeRef);
		});
	});

	describe("Type Alias Inlining", () => {
		test("inlines trivial type alias", () => {
			const targetRef = createTypeRef("TargetType");
			// Create a non-trivial target type alias so it exists in scope
			const targetAlias = createMockTypeAlias(
				"TargetType",
				createTypeRef("string"),
				false,
			);
			const trivialAlias = createMockTypeAlias("TrivialAlias", targetRef, true);
			const scope = createMockScope(targetAlias, trivialAlias);

			const typeRef = createTypeRef("TrivialAlias");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should inline to the target type
			expect(result.name.asString).toBe(targetRef.name.asString);
		});

		test("does not inline non-trivial type alias", () => {
			const targetRef = createTypeRef("TargetType");
			const nonTrivialAlias = createMockTypeAlias(
				"NonTrivialAlias",
				targetRef,
				false,
			);
			const scope = createMockScope(nonTrivialAlias);

			const typeRef = createTypeRef("NonTrivialAlias");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should not inline non-trivial aliases
			expect(result).toBe(typeRef);
		});

		test("follows chain of trivial type aliases", () => {
			const finalRef = createTypeRef("FinalType");
			const alias2 = createMockTypeAlias("Alias2", finalRef, true);
			const alias1 = createMockTypeAlias(
				"Alias1",
				createTypeRef("Alias2"),
				true,
			);
			const scope = createMockScope(alias1, alias2);

			const typeRef = createTypeRef("Alias1");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should follow the chain to the final type
			expect(result.name.asString).toBe(finalRef.name.asString);
		});

		test("handles complex type in alias", () => {
			const unionType = TsTypeUnion.create(
				IArray.fromArray<TsType>([
					createTypeRef("string"),
					createTypeRef("number"),
				]),
			);
			const alias = createMockTypeAlias("ComplexAlias", unionType, true);
			const scope = createMockScope(alias);

			const typeRef = createTypeRef("ComplexAlias");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should not inline complex types
			expect(result).toBe(typeRef);
		});
	});

	describe("Interface Inlining", () => {
		test("inlines trivial interface", () => {
			const targetRef = createTypeRef("TargetInterface");
			const trivialInterface = createMockInterface(
				"TrivialInterface",
				IArray.fromArray([targetRef]),
				true,
			);
			const scope = createMockScope(trivialInterface);

			const typeRef = createTypeRef("TrivialInterface");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should inline to the target interface
			expect(result.name.asString).toBe(targetRef.name.asString);
		});

		test("does not inline non-trivial interface", () => {
			const targetRef = createTypeRef("TargetInterface");
			const nonTrivialInterface = createMockInterface(
				"NonTrivialInterface",
				IArray.fromArray([targetRef]),
				false,
			);
			const scope = createMockScope(nonTrivialInterface);

			const typeRef = createTypeRef("NonTrivialInterface");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should not inline non-trivial interfaces
			expect(result).toBe(typeRef);
		});

		test("inlines interface with multiple inheritance to first target", () => {
			const targetRef1 = createTypeRef("TargetInterface1");
			const targetRef2 = createTypeRef("TargetInterface2");
			const multiInterface = createMockInterface(
				"MultiInterface",
				IArray.fromArray([targetRef1, targetRef2]),
				true,
			);
			const scope = createMockScope(multiInterface);

			const typeRef = createTypeRef("MultiInterface");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should inline to the first inheritance target
			expect(result.name.asString).toBe(targetRef1.name.asString);
		});

		test("follows chain of trivial interfaces", () => {
			const finalRef = createTypeRef("FinalInterface");
			const interface2 = createMockInterface(
				"Interface2",
				IArray.fromArray([finalRef]),
				true,
			);
			const interface1 = createMockInterface(
				"Interface1",
				IArray.fromArray([createTypeRef("Interface2")]),
				true,
			);
			const scope = createMockScope(interface1, interface2);

			const typeRef = createTypeRef("Interface1");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should follow the chain to the final interface
			expect(result.name.asString).toBe(finalRef.name.asString);
		});
	});

	describe("Edge Cases", () => {
		test("avoids infinite recursion with different code paths", () => {
			// The transform has protection against infinite recursion by checking codePath
			const alias1 = createMockTypeAlias(
				"Alias1",
				createTypeRef("Alias2"),
				true,
			);
			const alias2 = createMockTypeAlias(
				"Alias2",
				createTypeRef("FinalType"),
				true,
			);
			const scope = createMockScope(alias1, alias2);

			const typeRef = createTypeRef("Alias1");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should follow the chain safely
			expect(result.name.parts.apply(result.name.parts.length - 1)?.value).toBe(
				"FinalType",
			);
		});

		test("preserves type reference metadata", () => {
			const originalComments = Comments.apply([
				Comment.create("Type reference comment"),
			]);
			const targetRef = createTypeRef("TargetType");
			const trivialAlias = createMockTypeAlias("TrivialAlias", targetRef, true);
			const scope = createMockScope(trivialAlias);

			const typeRef = createTypeRefWithComments(
				"TrivialAlias",
				originalComments,
			);
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should preserve original comments
			expect(result.comments).toEqual(originalComments);
			expect(result.name.asString).toBe(targetRef.name.asString);
		});

		test("handles intersection types in EffectiveTypeRef", () => {
			const ref1 = createTypeRef("SameType");
			const ref2 = createTypeRef("SameType");
			const intersectionType = TsTypeIntersect.create(
				IArray.fromArray<TsType>([ref1, ref2]),
			);
			const alias = createMockTypeAlias(
				"IntersectionAlias",
				intersectionType,
				true,
			);
			const scope = createMockScope(alias);

			const typeRef = createTypeRef("IntersectionAlias");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should handle intersection types with same name
			expect(result.name.asString).toBe(ref1.name.asString);
		});

		test("does not inline intersection with different types", () => {
			const ref1 = createTypeRef("Type1");
			const ref2 = createTypeRef("Type2");
			const intersectionType = TsTypeIntersect.create(
				IArray.fromArray<TsType>([ref1, ref2]),
			);
			const alias = createMockTypeAlias(
				"IntersectionAlias",
				intersectionType,
				true,
			);
			const scope = createMockScope(alias);

			const typeRef = createTypeRef("IntersectionAlias");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should not inline intersection with different types
			expect(result).toBe(typeRef);
		});
	});

	describe("Integration Scenarios", () => {
		test("handles mixed trivial and non-trivial declarations", () => {
			const finalRef = createTypeRef("FinalType");
			const trivialAlias = createMockTypeAlias("TrivialAlias", finalRef, true);
			const nonTrivialAlias = createMockTypeAlias(
				"NonTrivialAlias",
				finalRef,
				false,
			);
			const scope = createMockScope(trivialAlias, nonTrivialAlias);

			const trivialTypeRef = createTypeRef("TrivialAlias");
			const nonTrivialTypeRef = createTypeRef("NonTrivialAlias");

			const result1 =
				InlineTrivialTransform.enterTsTypeRef(scope)(trivialTypeRef);
			const result2 =
				InlineTrivialTransform.enterTsTypeRef(scope)(nonTrivialTypeRef);

			// Should inline trivial but not non-trivial
			expect(result1.name.asString).toBe(finalRef.name.asString);
			expect(result2).toBe(nonTrivialTypeRef);
		});

		test("handles type alias to enum inlining", () => {
			const exportedFromRef = createTypeRef("ExportedEnum");
			const enumDecl = createMockEnum("LocalEnum", some(exportedFromRef));
			const trivialAlias = createMockTypeAlias(
				"AliasToEnum",
				createTypeRef("LocalEnum"),
				true,
			);
			const scope = createMockScope(enumDecl, trivialAlias);

			const typeRef = createTypeRef("AliasToEnum");
			const result = InlineTrivialTransform.enterTsTypeRef(scope)(typeRef);

			// Should inline the alias to the enum reference (not the exported enum)
			expect(result.name.parts.apply(result.name.parts.length - 1)?.value).toBe(
				"LocalEnum",
			);
		});

		test("does not inline type alias with type parameters", () => {
			const targetRef = createTypeRef("TargetType");
			const trivialAlias = createMockTypeAlias("TrivialAlias", targetRef, true);
			const scope = createMockScope(trivialAlias);

			const typeRefWithParams = TsTypeRef.create(
				NoComments.instance,
				createQIdent("TrivialAlias"),
				IArray.fromArray<TsType>([
					createTypeRef("string"),
					createTypeRef("number"),
				]),
			);
			const result =
				InlineTrivialTransform.enterTsTypeRef(scope)(typeRefWithParams);

			// Should not inline when type parameters are present
			expect(result).toBe(typeRefWithParams); // Should be unchanged
			expect(result.name.asString).toBe("TsQIdent(TrivialAlias)");
			expect(result.tparams.length).toBe(2);
		});
	});
});
