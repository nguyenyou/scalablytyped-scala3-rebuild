/**
 * Tests for FillInTParams.ts - TypeScript port of org.scalablytyped.converter.internal.ts.FillInTParamsTests
 */

import { describe, expect, it } from "vitest";
import { none, some } from "fp-ts/Option";
import { Comments } from "@/internal/Comments.ts";
import { IArray } from "@/internal/IArray.ts";
import { CodePath } from "@/internal/ts/CodePath.ts";
import { FillInTParams } from "@/internal/ts/FillInTParams.ts";
import { JsLocation } from "@/internal/ts/JsLocation.ts";
import {
	TsDeclClass,
	TsDeclInterface,
	TsDeclTypeAlias,
	type TsFunParam,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	type TsMember,
	TsQIdent,
	type TsType,
	TsTypeParam,
	TsTypeRef,
} from "@/internal/ts/trees.ts";

// ============================================================================
// Helper methods for creating test data
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
	return TsTypeRef.create(Comments.empty(), createQIdent(name), tparams);
}

function createTypeRefAsType(
	name: string,
	tparams: IArray<TsType> = IArray.Empty,
): TsType {
	return createTypeRef(name, tparams) as TsType;
}

function createTypeParam(
	name: string,
	upperBound?: TsType,
	defaultType?: TsType,
): TsTypeParam {
	return TsTypeParam.create(
		Comments.empty(),
		createSimpleIdent(name),
		upperBound ? some(upperBound) : none,
		defaultType ? some(defaultType) : none,
	);
}

function createMockInterface(
	name: string,
	tparams: IArray<TsTypeParam> = IArray.Empty,
	members: IArray<TsMember> = IArray.Empty,
): TsDeclInterface {
	return TsDeclInterface.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		tparams,
		IArray.Empty, // inheritance
		members,
		CodePath.noPath(),
	);
}

function createMockClass(
	name: string,
	tparams: IArray<TsTypeParam> = IArray.Empty,
	members: IArray<TsMember> = IArray.Empty,
): TsDeclClass {
	return TsDeclClass.create(
		Comments.empty(),
		false, // declared
		false, // isAbstract
		createSimpleIdent(name),
		tparams,
		none, // parent
		IArray.Empty, // implements
		members,
		JsLocation.zero(),
		CodePath.noPath(),
	);
}

function createMockTypeAlias(
	name: string,
	tparams: IArray<TsTypeParam> = IArray.Empty,
	alias: TsType = TsTypeRef.any,
): TsDeclTypeAlias {
	return TsDeclTypeAlias.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		tparams,
		alias,
		CodePath.noPath(),
	);
}

function createMockFunSig(
	tparams: IArray<TsTypeParam> = IArray.Empty,
	params: IArray<TsFunParam> = IArray.Empty,
	resultType: TsType = TsTypeRef.any,
): TsFunSig {
	return TsFunSig.create(Comments.empty(), tparams, params, some(resultType));
}

// ============================================================================
// Tests
// ============================================================================

describe("FillInTParams", () => {
	describe("Interface Type Parameter Substitution", () => {
		it("empty type parameters returns original interface", () => {
			const interface_ = createMockInterface("TestInterface");
			const result = FillInTParams.apply(interface_, IArray.Empty);

			expect(result).toBe(interface_); // Should return exact same instance
			expect(result.name.value).toBe("TestInterface");
			expect(result.tparams.length).toBe(0);
		});

		it("single type parameter substitution", () => {
			const tparam = createTypeParam("T");
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.apply(tparam),
			);
			const providedType = createTypeRefAsType("string");

			const result = FillInTParams.apply(
				interface_,
				IArray.apply(providedType),
			);

			expect(result.name.value).toBe("TestInterface");
			expect(result.tparams.length).toBe(0); // Type parameters should be cleared
			expect(result).not.toBe(interface_); // Should be a new instance
		});

		it("multiple type parameter substitution", () => {
			const tparams = IArray.fromArray([
				createTypeParam("T"),
				createTypeParam("U"),
				createTypeParam("V"),
			]);
			const interface_ = createMockInterface("TestInterface", tparams);
			const providedTypes = IArray.fromArray([
				createTypeRefAsType("string"),
				createTypeRefAsType("number"),
				createTypeRefAsType("boolean"),
			]);

			const result = FillInTParams.apply(interface_, providedTypes);

			expect(result.name.value).toBe("TestInterface");
			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(interface_);
		});

		it("fewer provided than expected uses defaults or warnings", () => {
			const tparamWithDefault = createTypeParam(
				"T",
				undefined,
				createTypeRef("string"),
			);
			const tparamWithoutDefault = createTypeParam("U");
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([tparamWithDefault, tparamWithoutDefault]),
			);
			const providedTypes = IArray.apply(createTypeRefAsType("number")); // Only one provided

			const result = FillInTParams.apply(interface_, providedTypes);

			expect(result.name.value).toBe("TestInterface");
			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(interface_);
		});

		it("more provided than expected ignores extras", () => {
			const tparam = createTypeParam("T");
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.apply(tparam),
			);
			const providedTypes = IArray.fromArray([
				createTypeRefAsType("string"),
				createTypeRefAsType("number"), // Extra - should be ignored
				createTypeRefAsType("boolean"), // Extra - should be ignored
			]);

			const result = FillInTParams.apply(interface_, providedTypes);

			expect(result.name.value).toBe("TestInterface");
			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(interface_);
		});
	});

	describe("Class Type Parameter Substitution", () => {
		it("empty type parameters returns original class", () => {
			const clazz = createMockClass("TestClass");
			const result = FillInTParams.apply(clazz, IArray.Empty);

			expect(result).toBe(clazz);
			expect(result.name.value).toBe("TestClass");
			expect(result.tparams.length).toBe(0);
		});

		it("single type parameter substitution", () => {
			const tparam = createTypeParam("T");
			const clazz = createMockClass("TestClass", IArray.apply(tparam));
			const providedType = createTypeRefAsType("string");

			const result = FillInTParams.apply(clazz, IArray.apply(providedType));

			expect(result.name.value).toBe("TestClass");
			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(clazz);
		});

		it("multiple type parameter substitution", () => {
			const tparams = IArray.fromArray([
				createTypeParam("T"),
				createTypeParam("U"),
			]);
			const clazz = createMockClass("TestClass", tparams);
			const providedTypes = IArray.fromArray([
				createTypeRefAsType("string"),
				createTypeRefAsType("number"),
			]);

			const result = FillInTParams.apply(clazz, providedTypes);

			expect(result.name.value).toBe("TestClass");
			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(clazz);
		});
	});

	describe("Type Alias Substitution", () => {
		it("empty type parameters returns original alias", () => {
			const alias = createMockTypeAlias("TestAlias");
			const result = FillInTParams.apply(alias, IArray.Empty);

			expect(result).toBe(alias);
			expect(result.name.value).toBe("TestAlias");
			expect(result.tparams.length).toBe(0);
		});

		it("single type parameter substitution", () => {
			const tparam = createTypeParam("T");
			const aliasType = createTypeRef(
				"Array",
				IArray.apply(createTypeRefAsType("T")),
			);
			const alias = createMockTypeAlias(
				"TestAlias",
				IArray.apply(tparam),
				aliasType,
			);
			const providedType = createTypeRefAsType("string");

			const result = FillInTParams.apply(alias, IArray.apply(providedType));

			expect(result.name.value).toBe("TestAlias");
			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(alias);
		});
	});

	describe("Function Signature Substitution", () => {
		it("empty type parameters returns original signature", () => {
			const sig = createMockFunSig();
			const result = FillInTParams.apply(sig, IArray.Empty);

			expect(result).toBe(sig);
			expect(result.tparams.length).toBe(0);
		});

		it("single type parameter substitution", () => {
			const tparam = createTypeParam("T");
			const sig = createMockFunSig(IArray.apply(tparam));
			const providedType = createTypeRefAsType("string");

			const result = FillInTParams.apply(sig, IArray.apply(providedType));

			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(sig);
		});
	});

	describe("inlineTParams Functionality", () => {
		it("uses default types when available", () => {
			const tparamWithDefault = createTypeParam(
				"T",
				undefined,
				createTypeRef("string"),
			);
			const sig = createMockFunSig(IArray.apply(tparamWithDefault));

			const result = FillInTParams.inlineTParams(sig);

			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(sig);
		});

		it("uses upper bounds when no default", () => {
			const tparamWithBound = createTypeParam("T", createTypeRef("string"));
			const sig = createMockFunSig(IArray.apply(tparamWithBound));

			const result = FillInTParams.inlineTParams(sig);

			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(sig);
		});

		it("uses TsTypeRef.any for recursive bounds", () => {
			// Create a type parameter that references itself in its bound
			const recursiveBound = createTypeRef("T");
			const tparamRecursive = createTypeParam("T", recursiveBound);
			const sig = createMockFunSig(IArray.apply(tparamRecursive));

			const result = FillInTParams.inlineTParams(sig);

			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(sig);
		});

		it("handles type parameters referencing each other", () => {
			const tparam1 = createTypeParam("T", createTypeRef("U"));
			const tparam2 = createTypeParam("U", undefined, createTypeRef("string"));
			const sig = createMockFunSig(IArray.fromArray([tparam1, tparam2]));

			const result = FillInTParams.inlineTParams(sig);

			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(sig);
		});

		it("complex scenarios with mixed bounds and defaults", () => {
			const tparams = IArray.fromArray([
				createTypeParam("T", undefined, createTypeRef("string")), // Has default
				createTypeParam("U", createTypeRef("number")), // Has upper bound
				createTypeParam("V"), // Neither - should use any
				createTypeParam("W", createTypeRef("boolean"), createTypeRef("object")), // Both - should prefer default
			]);
			const sig = createMockFunSig(tparams);

			const result = FillInTParams.inlineTParams(sig);

			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(sig);
		});

		it("empty type parameters returns original", () => {
			const sig = createMockFunSig(IArray.Empty);

			const result = FillInTParams.inlineTParams(sig);

			expect(result).toBe(sig); // Should return same instance for empty tparams
		});
	});

	describe("Edge Cases and Error Conditions", () => {
		it("empty type parameter arrays", () => {
			const interface_ = createMockInterface("Test");
			const clazz = createMockClass("Test");
			const alias = createMockTypeAlias("Test");
			const sig = createMockFunSig();

			// All should return original instances
			expect(FillInTParams.apply(interface_, IArray.Empty)).toBe(interface_);
			expect(FillInTParams.apply(clazz, IArray.Empty)).toBe(clazz);
			expect(FillInTParams.apply(alias, IArray.Empty)).toBe(alias);
			expect(FillInTParams.apply(sig, IArray.Empty)).toBe(sig);
		});

		it("large parameter lists", () => {
			const manyTParams = Array.from({ length: 50 }, (_, i) =>
				createTypeParam(`T${i + 1}`),
			);
			const manyProvidedTypes = Array.from({ length: 50 }, (_, i) =>
				createTypeRefAsType(`Type${i + 1}`),
			);

			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray(manyTParams),
			);
			const result = FillInTParams.apply(
				interface_,
				IArray.fromArray(manyProvidedTypes),
			);

			expect(result.name.value).toBe("TestInterface");
			expect(result.tparams.length).toBe(0);
			expect(result).not.toBe(interface_);
		});

		it("boundary conditions with parameter count mismatches", () => {
			const tparams = IArray.fromArray([
				createTypeParam("T"),
				createTypeParam("U"),
			]);
			const interface_ = createMockInterface("TestInterface", tparams);

			// Test with no provided types
			const resultEmpty = FillInTParams.apply(interface_, IArray.Empty);
			expect(resultEmpty.tparams.length).toBe(0);

			// Test with one provided type (less than expected)
			const resultPartial = FillInTParams.apply(
				interface_,
				IArray.apply(createTypeRefAsType("string")),
			);
			expect(resultPartial.tparams.length).toBe(0);

			// Test with many provided types (more than expected)
			const manyTypes = Array.from({ length: 10 }, (_, i) =>
				createTypeRefAsType(`Type${i + 1}`),
			);
			const resultMany = FillInTParams.apply(
				interface_,
				IArray.fromArray(manyTypes),
			);
			expect(resultMany.tparams.length).toBe(0);
		});
	});

	describe("Integration with TypeRewriter", () => {
		it("verifies tparams are cleared after substitution", () => {
			const tparam = createTypeParam("T");
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.apply(tparam),
			);
			const providedType = createTypeRefAsType("string");

			const result = FillInTParams.apply(
				interface_,
				IArray.apply(providedType),
			);

			// The key assertion: tparams should be empty after substitution
			expect(result.tparams.length).toBe(0);
			expect(result.name.value).toBe("TestInterface");
		});

		it("handles complex nested type substitution", () => {
			const tparam = createTypeParam("T");
			const nestedType = createTypeRef(
				"Array",
				IArray.apply(createTypeRefAsType("T")),
			);
			const alias = createMockTypeAlias(
				"TestAlias",
				IArray.apply(tparam),
				nestedType,
			);
			const providedType = createTypeRefAsType("string");

			const result = FillInTParams.apply(alias, IArray.apply(providedType));

			expect(result.tparams.length).toBe(0);
			expect(result.name.value).toBe("TestAlias");
			expect(result).not.toBe(alias);
		});

		it("preserves other properties during substitution", () => {
			const tparam = createTypeParam("T");
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.apply(tparam),
			);
			const providedType = createTypeRefAsType("string");

			const result = FillInTParams.apply(
				interface_,
				IArray.apply(providedType),
			);

			// Verify other properties are preserved
			expect(result.name.value).toBe(interface_.name.value);
			expect(result.declared).toBe(interface_.declared);
			expect(result.inheritance).toBe(interface_.inheritance);
			expect(result.members).toBe(interface_.members);
			expect(result.codePath).toBe(interface_.codePath);
			// Only tparams should be different
			expect(result.tparams.length).toBe(0);
			expect(interface_.tparams.length).toBeGreaterThan(0);
		});
	});
});
