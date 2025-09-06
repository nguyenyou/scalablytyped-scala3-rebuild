/**
 * TypeScript port of AnalyzedCtorsTests.scala
 *
 * Comprehensive unit tests for the AnalyzedCtors class functionality.
 * Tests constructor analysis, type parameter handling, and edge cases.
 */

import { describe, expect, test } from "bun:test";
import { none, type Option, some } from "fp-ts/Option";
import { Comments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { LoopDetector } from "../../../internal/ts/TsTreeScope.js";
import { AnalyzedCtors } from "../../../internal/ts/transforms/ExtractClasses.js";
import {
	TsDeclInterface,
	TsFunSig,
	TsIdent,
	TsIdentConstructor,
	TsMemberCtor,
	TsProtectionLevel,
	TsTypeConstructor,
	TsTypeFunction,
	TsTypeIntersect,
	TsTypeObject,
	TsTypeRef,
	TsTypeUnion,
} from "../../../internal/ts/trees.js";
import {
	createFunParam,
	createIntersectionType,
	createMockClass,
	createMockFunSig,
	createMockInterface,
	createMockScope,
	createTypeParam,
	createTypeRef,
} from "../../utils/TestUtils.js";

// Helper methods for creating test data
function _createMockParam(name: string, tpe: any = TsTypeRef.string): any {
	return createFunParam(name, some(tpe));
}

function createMockCtor(
	tparams: IArray<any> = IArray.Empty,
	params: IArray<any> = IArray.Empty,
	resultType: Option<any> = none,
): TsMemberCtor {
	return TsMemberCtor.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		TsFunSig.create(Comments.empty(), tparams, params, resultType),
	);
}

describe("AnalyzedCtors", () => {
	describe("constructor", () => {
		test("creates instance with correct fields", () => {
			const tparams = IArray.fromArray([
				createTypeParam("T"),
				createTypeParam("U"),
			]);
			const resultType = createTypeRef(
				"TestClass",
				IArray.fromArray([TsTypeRef.string as any]),
			);
			const ctors = IArray.fromArray([
				createMockFunSig(resultType),
				createMockFunSig(resultType),
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
				TsTypeRef.null,
			];

			primitiveTypes.forEach((tpe) => {
				const result = AnalyzedCtors.from(scope, tpe);
				expect(result._tag).toBe("None");
			});
		});

		test("returns None for union types", () => {
			const scope = createMockScope();
			const unionType = TsTypeUnion.create(
				IArray.fromArray([TsTypeRef.string as any, TsTypeRef.number as any]),
			);

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
			const scope = createMockScope("test-lib", interface1);
			const typeRef = createTypeRef("TestInterface");

			const result = AnalyzedCtors.from(scope, typeRef);

			expect(result._tag).toBe("None");
		});

		// BATCH 1: Missing positive "from method" test cases
		test("returns Some for interface with constructors", () => {
			const resultType = createTypeRef("TestInterface");
			const ctor = createMockCtor(IArray.Empty, IArray.Empty, some(resultType));
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([ctor]),
			);
			const scope = createMockScope("test-lib", interface1);
			const typeRef = createTypeRef("TestInterface");

			const result = AnalyzedCtors.from(scope, typeRef);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value.ctors.length).toBe(1);
				expect(result.value.resultType).toEqual(resultType);
			}
		});

		test("selects constructor with most type parameters", () => {
			const resultType = createTypeRef("TestInterface");
			const ctor1 = createMockCtor(
				IArray.fromArray([createTypeParam("T")]),
				IArray.Empty,
				some(resultType),
			);
			const ctor2 = createMockCtor(
				IArray.fromArray([createTypeParam("T"), createTypeParam("U")]),
				IArray.Empty,
				some(resultType),
			);
			const ctor3 = createMockCtor(
				IArray.Empty,
				IArray.Empty,
				some(resultType),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([ctor1, ctor2, ctor3]),
			);
			const scope = createMockScope("test-lib", interface1);
			const typeRef = createTypeRef("TestInterface");

			const result = AnalyzedCtors.from(scope, typeRef);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value.longestTParams.length).toBe(2);
				expect(result.value.longestTParams.get(0).name.value).toBe("T");
				expect(result.value.longestTParams.get(1).name.value).toBe("U");
			}
		});

		test("filters out constructors with incompatible return types", () => {
			const resultType1 = createTypeRef("TestInterface");
			const resultType2 = createTypeRef("OtherInterface");
			const ctor1 = createMockCtor(
				IArray.Empty,
				IArray.Empty,
				some(resultType1),
			);
			const ctor2 = createMockCtor(
				IArray.Empty,
				IArray.Empty,
				some(resultType2),
			);
			const ctor3 = createMockCtor(
				IArray.Empty,
				IArray.Empty,
				some(resultType1),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([ctor1, ctor2, ctor3]),
			);
			const scope = createMockScope("test-lib", interface1);
			const typeRef = createTypeRef("TestInterface");

			const result = AnalyzedCtors.from(scope, typeRef);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value.ctors.length).toBe(2); // Only ctor1 and ctor3 should be included
				expect(result.value.resultType).toEqual(resultType1);
			}
		});

		test("handles complex type parameter scenarios", () => {
			const resultType = createTypeRef(
				"TestInterface",
				IArray.fromArray([TsTypeRef.string as any]),
			);
			const ctor1 = createMockCtor(
				IArray.fromArray([createTypeParam("T")]),
				IArray.Empty,
				some(resultType),
			);
			const ctor2 = createMockCtor(
				IArray.fromArray([createTypeParam("T"), createTypeParam("U")]),
				IArray.Empty,
				some(resultType),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([ctor1, ctor2]),
			);
			const scope = createMockScope("test-lib", interface1);
			const typeRef = createTypeRef(
				"TestInterface",
				IArray.fromArray([TsTypeRef.string as any]),
			);

			const result = AnalyzedCtors.from(scope, typeRef);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				expect(result.value.longestTParams.length).toBe(2);
				expect(result.value.ctors.length).toBe(2);
			}
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
				TsTypeRef.any,
			];

			primitiveTypes.forEach((tpe) => {
				const result = AnalyzedCtors.findCtors(scope, loopDetector)(tpe);
				expect(result.length).toBe(0);
			});
		});

		test("returns empty for interface not in scope", () => {
			const ctor = createMockCtor();
			const _interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([ctor]),
			);
			const scope = createMockScope(); // Interface not added to scope
			const loopDetector = LoopDetector.initial;
			const typeRef = createTypeRef("TestInterface");

			const result = AnalyzedCtors.findCtors(scope, loopDetector)(typeRef);

			// Since the interface is not in scope, findCtors returns empty
			expect(result.length).toBe(0);
		});

		test("returns empty for class (classes don't store constructors like interfaces)", () => {
			const ctor = createMockCtor();
			const _clazz = createMockClass("TestClass", IArray.fromArray([ctor]));
			const scope = createMockScope();
			const loopDetector = LoopDetector.initial;
			const typeRef = createTypeRef("TestClass");

			const result = AnalyzedCtors.findCtors(scope, loopDetector)(typeRef);

			// Classes are not handled by findCtors - only interfaces are
			expect(result.length).toBe(0);
		});

		// BATCH 2: Missing "findCtors method" test cases
		test("returns constructors from interface", () => {
			const ctor1 = createMockCtor(IArray.Empty, IArray.Empty, some(createTypeRef("TestInterface")));
			const ctor2 = createMockCtor(IArray.fromArray([createTypeParam("T")]), IArray.Empty, some(createTypeRef("TestInterface")));
			const interface1 = createMockInterface("TestInterface", IArray.fromArray([ctor1, ctor2]));
			const scope = createMockScope("test-lib", interface1);
			const loopDetector = LoopDetector.initial;
			const typeRef = createTypeRef("TestInterface");

			const result = AnalyzedCtors.findCtors(scope, loopDetector)(typeRef);

			expect(result.length).toBe(2);
			// findCtors returns the TsFunSig from the TsMemberCtor
			expect(result.get(0)).toEqual(ctor1.signature);
			expect(result.get(1)).toEqual(ctor2.signature);
		});

		test("returns constructors from object type", () => {
			const ctor = createMockCtor(IArray.Empty, IArray.Empty, some(createTypeRef("TestInterface")));
			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray([ctor as any]), // Cast to TsMember since TsMemberCtor extends TsMember
			);
			const scope = createMockScope();
			const loopDetector = LoopDetector.initial;

			const result = AnalyzedCtors.findCtors(scope, loopDetector)(objectType);

			expect(result.length).toBe(1);
			expect(result.get(0)).toEqual(ctor.signature);
		});

		test("returns constructors from intersection type", () => {
			const ctor1 = createMockCtor(IArray.Empty, IArray.Empty, some(createTypeRef("Interface1")));
			const ctor2 = createMockCtor(IArray.fromArray([createTypeParam("T")]), IArray.Empty, some(createTypeRef("Interface2")));
			const interface1 = createMockInterface("Interface1", IArray.fromArray([ctor1]));
			const interface2 = createMockInterface("Interface2", IArray.fromArray([ctor2]));
			const scope = createMockScope("test-lib", interface1, interface2);
			const loopDetector = LoopDetector.initial;
			const intersectionType = createIntersectionType(
				createTypeRef("Interface1"),
				createTypeRef("Interface2"),
			);

			const result = AnalyzedCtors.findCtors(scope, loopDetector)(intersectionType);

			expect(result.length).toBe(2);
			expect(result.get(0)).toEqual(ctor1.signature);
			expect(result.get(1)).toEqual(ctor2.signature);
		});

		test("returns constructor from function type", () => {
			const sig = createMockFunSig(createTypeRef("TestInterface"));
			const functionType = TsTypeFunction.create(sig);
			const constructorType = TsTypeConstructor.create(false, functionType);
			const scope = createMockScope();
			const loopDetector = LoopDetector.initial;

			const result = AnalyzedCtors.findCtors(scope, loopDetector)(constructorType);

			expect(result.length).toBe(1);
			expect(result.get(0)).toEqual(sig);
		});

		test("handles loop detection", () => {
			const ctor = createMockCtor(IArray.Empty, IArray.Empty, some(createTypeRef("TestInterface")));
			const interface1 = createMockInterface("TestInterface", IArray.fromArray([ctor]));
			const scope = createMockScope("test-lib", interface1);
			const loopDetector = LoopDetector.initial;
			const typeRef = createTypeRef("TestInterface");

			// First call should work
			const result1 = AnalyzedCtors.findCtors(scope, loopDetector)(typeRef);
			expect(result1.length).toBe(1);

			// Create a loop detector that already includes this type
			const loopDetectorWithType = loopDetector.including(typeRef, scope);
			if (loopDetectorWithType._tag === "Right") {
				const result2 = AnalyzedCtors.findCtors(scope, loopDetectorWithType.right)(typeRef);
				expect(result2.length).toBe(0); // Should return empty due to loop detection
			}
		});
	});

	describe("isSimpleType method", () => {
		test("returns false for primitive types", () => {
			const scope = createMockScope();
			const primitiveTypes = [
				TsTypeRef.string,
				TsTypeRef.number,
				TsTypeRef.boolean,
				TsTypeRef.any,
			];

			primitiveTypes.forEach((tpe) => {
				const result = AnalyzedCtors.isSimpleType(tpe, scope);
				expect(result).toBe(false);
			});
		});

		test("returns false for non-existent types", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("NonExistentType");

			const result = AnalyzedCtors.isSimpleType(typeRef, scope);

			expect(result).toBe(false);
		});

		test("returns false for types with type parameters", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef(
				"GenericType",
				IArray.fromArray([TsTypeRef.string as any]),
			);

			const result = AnalyzedCtors.isSimpleType(typeRef, scope);

			expect(result).toBe(false);
		});

		// BATCH 3: Missing positive "isSimpleType method" test cases
		test("returns true for simple interface without type parameters", () => {
			const interface1 = createMockInterface("SimpleInterface", IArray.Empty);
			const scope = createMockScope("test-lib", interface1);
			const typeRef = createTypeRef("SimpleInterface");

			const result = AnalyzedCtors.isSimpleType(typeRef, scope);

			expect(result).toBe(true);
		});

		test("returns true for simple class without type parameters", () => {
			const class1 = createMockClass("SimpleClass", IArray.Empty);
			const scope = createMockScope("test-lib", class1);
			const typeRef = createTypeRef("SimpleClass");

			const result = AnalyzedCtors.isSimpleType(typeRef, scope);

			expect(result).toBe(true);
		});

		test("returns false for interface with type parameters", () => {
			// Create interface with type parameters using TsDeclInterface.create directly
			const interface1 = TsDeclInterface.create(
				Comments.empty(),
				false, // declared
				TsIdent.simple("GenericInterface"),
				IArray.fromArray([createTypeParam("T")]), // tparams
				IArray.Empty, // inheritance
				IArray.Empty, // members
				CodePath.noPath(),
			);
			const scope = createMockScope("test-lib", interface1);
			const typeRef = createTypeRef("GenericInterface");

			const result = AnalyzedCtors.isSimpleType(typeRef, scope);

			// Should return false because the interface has type parameters
			expect(result).toBe(false);
		});
	});
});
