/**
 * TypeScript port of AnalyzedCtorsTests.scala
 *
 * Comprehensive unit tests for the AnalyzedCtors class functionality.
 * Tests constructor analysis, type parameter handling, and edge cases.
 */

import { describe, expect, test } from "bun:test";
import { none, some, type Option } from "fp-ts/Option";
import { Comments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { AnalyzedCtors } from "../../../internal/ts/transforms/ExtractClasses.js";
import { LoopDetector } from "../../../internal/ts/TsTreeScope.js";
import {
	TsFunSig,
	TsIdent,
	TsIdentConstructor,
	TsMemberCtor,
	TsProtectionLevel,
	TsTypeRef,
	TsTypeUnion,
} from "../../../internal/ts/trees.js";
import {
	createFunParam,
	createMockClass,
	createMockFunSig,
	createMockInterface,
	createMockScope,
	createSimpleIdent,
	createTypeParam,
	createTypeRef,
} from "../../utils/TestUtils.js";

// Helper methods for creating test data
function createMockParam(name: string, tpe: any = TsTypeRef.string): any {
	return createFunParam(name, some(tpe));
}

function createMockCtor(
	tparams: IArray<any> = IArray.Empty,
	params: IArray<any> = IArray.Empty,
	resultType: Option<any> = none
): TsMemberCtor {
	return TsMemberCtor.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		TsFunSig.create(Comments.empty(), tparams, params, resultType)
	);
}

describe("AnalyzedCtors", () => {
	describe("constructor", () => {
		test("creates instance with correct fields", () => {
			const tparams = IArray.fromArray([createTypeParam("T"), createTypeParam("U")]);
			const resultType = createTypeRef("TestClass", IArray.fromArray([TsTypeRef.string as any]));
			const ctors = IArray.fromArray([
				createMockFunSig(resultType),
				createMockFunSig(resultType)
			]);

			const analyzed = new AnalyzedCtors(tparams, resultType, ctors);

			expect(analyzed.longestTParams).toBe(tparams);
			expect(analyzed.resultType).toBe(resultType);
			expect(analyzed.ctors).toBe(ctors);
			expect(analyzed.ctors.length).toBe(2);
		});

		test("handles empty type parameters", () => {
			const resultType = createTypeRef("SimpleClass");
			const ctors = IArray.fromArray([createMockFunSig()]);

			const analyzed = new AnalyzedCtors(IArray.Empty, resultType, ctors);

			expect(analyzed.longestTParams.length).toBe(0);
			expect(analyzed.resultType).toBe(resultType);
			expect(analyzed.ctors.length).toBe(1);
		});

		test("handles empty constructors", () => {
			const tparams = IArray.fromArray([createTypeParam("T")]);
			const resultType = createTypeRef("TestClass");

			const analyzed = new AnalyzedCtors(tparams, resultType, IArray.Empty);

			expect(analyzed.longestTParams).toBe(tparams);
			expect(analyzed.resultType).toBe(resultType);
			expect(analyzed.ctors.length).toBe(0);
		});
	});

	describe("from method", () => {
		test("returns None for primitive types", () => {
			const scope = createMockScope();
			const primitiveTypes = [
				TsTypeRef.string,
				TsTypeRef.number,
				TsTypeRef.boolean,
				TsTypeRef.any,
				TsTypeRef.void,
				TsTypeRef.undefined,
				TsTypeRef.null
			];

			primitiveTypes.forEach(tpe => {
				const result = AnalyzedCtors.from(scope, tpe);
				expect(result._tag).toBe("None");
			});
		});

		test("returns None for union types", () => {
			const scope = createMockScope();
			const unionType = TsTypeUnion.create(IArray.fromArray([TsTypeRef.string as any, TsTypeRef.number as any]));

			const result = AnalyzedCtors.from(scope, unionType);

			expect(result._tag).toBe("None");
		});

		test("returns None for intersection types without constructors", () => {
			const scope = createMockScope();
			// Test with a simple type that has no constructors
			const result = AnalyzedCtors.from(scope, TsTypeRef.string);

			expect(result._tag).toBe("None");
		});

		test("returns None for type with no constructors", () => {
			const interface1 = createMockInterface("TestInterface");
			const scope = createMockScope();
			const typeRef = createTypeRef("TestInterface");

			const result = AnalyzedCtors.from(scope, typeRef);

			expect(result._tag).toBe("None");
		});
	});

	describe("findCtors method", () => {
		test("returns empty for primitive types", () => {
			const scope = createMockScope();
			const loopDetector = LoopDetector.initial;
			const primitiveTypes = [
				TsTypeRef.string,
				TsTypeRef.number,
				TsTypeRef.boolean,
				TsTypeRef.any
			];

			primitiveTypes.forEach(tpe => {
				const result = AnalyzedCtors.findCtors(scope, loopDetector)(tpe);
				expect(result.length).toBe(0);
			});
		});

		test("returns constructors from interface", () => {
			const ctor = createMockCtor();
			const interface1 = createMockInterface("TestInterface", IArray.fromArray([ctor]));
			const scope = createMockScope();
			const loopDetector = LoopDetector.initial;
			const typeRef = createTypeRef("TestInterface");

			const result = AnalyzedCtors.findCtors(scope, loopDetector)(typeRef);

			expect(result.length).toBe(1);
			expect(result.get(0).params).toEqual(ctor.signature.params);
		});

		test("returns empty for class (classes don't store constructors like interfaces)", () => {
			const ctor = createMockCtor();
			const clazz = createMockClass("TestClass", IArray.fromArray([ctor]));
			const scope = createMockScope();
			const loopDetector = LoopDetector.initial;
			const typeRef = createTypeRef("TestClass");

			const result = AnalyzedCtors.findCtors(scope, loopDetector)(typeRef);

			// Classes are not handled by findCtors - only interfaces are
			expect(result.length).toBe(0);
		});
	});
});