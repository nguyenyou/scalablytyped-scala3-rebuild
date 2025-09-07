/**
 * TypeScript port of DefaultedTypeArgumentsTests.scala
 *
 * Tests for the DefaultedTypeArguments transformation functionality
 */

import { none, type Option, some } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { Comment } from "@/internal/Comment.js";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import { DefaultedTypeArguments } from "@/internal/ts/transforms/DefaultedTypeArguments.js";
import {
	TsDeclInterface,
	TsDeclTypeAlias,
	TsIdent,
	type TsIdentSimple,
	TsParsedFile,
	TsQIdent,
	type TsType,
	TsTypeParam,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// Helper functions for creating test data
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

function createTypeParam(
	name: string,
	default_?: Option<TsType>,
	upperBound?: Option<TsType>,
): TsTypeParam {
	return TsTypeParam.create(
		Comments.empty(),
		createSimpleIdent(name),
		upperBound || none,
		default_ || none,
	);
}

function createMockInterface(
	name: string,
	tparams: IArray<TsTypeParam> = IArray.Empty,
): TsDeclInterface {
	return TsDeclInterface.create(
		Comments.empty(),
		false,
		createSimpleIdent(name),
		tparams,
		IArray.Empty,
		IArray.Empty,
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
		false,
		createSimpleIdent(name),
		tparams,
		alias,
		CodePath.noPath(),
	);
}

function createMockScope(...declarations: any[]): TsTreeScope {
	const parsedFile = TsParsedFile.create(
		Comments.empty(),
		IArray.Empty,
		IArray.fromArray(declarations),
		CodePath.noPath(),
	);

	const root = TsTreeScope.create(
		TsIdent.librarySimple("test-lib"),
		false,
		new Map(),
		Logger.DevNull(),
	);

	// Create a scoped version that includes the parsed file
	return root["/"](parsedFile);
}

describe("DefaultedTypeArguments", () => {
	describe("Basic Functionality", () => {
		test("extends TreeTransformationScopedChanges", () => {
			const transform = new DefaultedTypeArguments();
			expect(typeof transform.enterTsTypeRef).toBe("function");
		});

		test("handles type reference with no missing arguments", () => {
			const typeParam1 = createTypeParam("T", some(TsTypeRef.string));
			const typeParam2 = createTypeParam("U", some(TsTypeRef.number));
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([typeParam1, typeParam2]),
			);
			const scope = createMockScope(interface_);

			const typeRef = createTypeRef(
				"TestInterface",
				IArray.fromArray([
					TsTypeRef.string as TsType,
					TsTypeRef.number as TsType,
				]),
			);
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should return unchanged since all type arguments are provided
			expect(result).toEqual(typeRef);
		});

		test("handles type reference with no type parameters", () => {
			const interface_ = createMockInterface("SimpleInterface");
			const scope = createMockScope(interface_);

			const typeRef = createTypeRef("SimpleInterface");
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should return unchanged since no type parameters expected
			expect(result).toEqual(typeRef);
		});
	});

	describe("Default Type Parameter Handling", () => {
		test("adds default type arguments when missing", () => {
			const typeParam1 = createTypeParam("T", some(TsTypeRef.string));
			const typeParam2 = createTypeParam("U", some(TsTypeRef.number));
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([typeParam1, typeParam2]),
			);
			const scope = createMockScope(interface_);

			// Provide only first type argument
			const typeRef = createTypeRef(
				"TestInterface",
				IArray.fromArray([TsTypeRef.boolean as TsType]),
			);
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should add the default for the second type parameter
			expect(result.tparams.length).toBe(2);

			// Check structural equality for type parameters
			const firstParam = result.tparams.get(0) as TsTypeRef;
			const secondParam = result.tparams.get(1) as TsTypeRef;

			expect(firstParam._tag).toBe("TsTypeRef");
			expect(firstParam.name.asString).toBe("TsQIdent(boolean)");
			expect(firstParam.tparams.length).toBe(0);

			expect(secondParam._tag).toBe("TsTypeRef");
			expect(secondParam.name.asString).toBe("TsQIdent(number)");
			expect(secondParam.tparams.length).toBe(0);
		});

		test("adds all default type arguments when none provided", () => {
			const typeParam1 = createTypeParam("T", some(TsTypeRef.string));
			const typeParam2 = createTypeParam("U", some(TsTypeRef.number));
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([typeParam1, typeParam2]),
			);
			const scope = createMockScope(interface_);

			const typeRef = createTypeRef("TestInterface");
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should add defaults for both type parameters
			expect(result.tparams.length).toBe(2);

			// Check structural equality instead of object reference equality
			const firstParam = result.tparams.get(0) as TsTypeRef;
			const secondParam = result.tparams.get(1) as TsTypeRef;

			expect(firstParam._tag).toBe("TsTypeRef");
			expect(firstParam.name.asString).toBe("TsQIdent(string)");
			expect(firstParam.tparams.length).toBe(0);

			expect(secondParam._tag).toBe("TsTypeRef");
			expect(secondParam.name.asString).toBe("TsQIdent(number)");
			expect(secondParam.tparams.length).toBe(0);
		});

		test("uses upper bound when no default is available", () => {
			const typeParam1 = createTypeParam("T", none, some(TsTypeRef.string));
			const typeParam2 = createTypeParam("U", some(TsTypeRef.number));
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([typeParam1, typeParam2]),
			);
			const scope = createMockScope(interface_);

			const typeRef = createTypeRef("TestInterface");
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should use upper bound for first, default for second
			expect(result.tparams.length).toBe(2);

			// Check structural equality for type parameters
			const firstParam = result.tparams.get(0) as TsTypeRef;
			const secondParam = result.tparams.get(1) as TsTypeRef;

			expect(firstParam._tag).toBe("TsTypeRef");
			expect(firstParam.name.asString).toBe("TsQIdent(string)");
			expect(firstParam.tparams.length).toBe(0);

			expect(secondParam._tag).toBe("TsTypeRef");
			expect(secondParam.name.asString).toBe("TsQIdent(number)");
			expect(secondParam.tparams.length).toBe(0);
		});

		test("uses any when no default or upper bound available", () => {
			const typeParam1 = createTypeParam("T");
			const typeParam2 = createTypeParam("U", some(TsTypeRef.number));
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([typeParam1, typeParam2]),
			);
			const scope = createMockScope(interface_);

			const typeRef = createTypeRef("TestInterface");
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should use any for first (with warning comment), default for second
			expect(result.tparams.length).toBe(2);

			// Check structural equality for type parameters
			const firstParam = result.tparams.get(0) as TsTypeRef;
			const secondParam = result.tparams.get(1) as TsTypeRef;

			expect(firstParam._tag).toBe("TsTypeRef");
			expect(firstParam.name.asString).toBe("TsQIdent(any)");
			expect(firstParam.tparams.length).toBe(0);

			expect(secondParam._tag).toBe("TsTypeRef");
			expect(secondParam.name.asString).toBe("TsQIdent(number)");
			expect(secondParam.tparams.length).toBe(0);
		});
	});

	describe("Self-Reference Handling", () => {
		test("handles self-referencing default types", () => {
			const selfRefDefault = createTypeRef(
				"TestInterface",
				IArray.fromArray<TsType>([TsTypeRef.string]),
			);
			const typeParam1 = createTypeParam("T", some(selfRefDefault));
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([typeParam1]),
			);
			const scope = createMockScope(interface_);

			const typeRef = createTypeRef("TestInterface");
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should replace self-reference with any to avoid infinite recursion
			expect(result.tparams.length).toBe(1);
			expect(result.tparams.get(0)._tag).toBe("TsTypeRef");
			const resultTypeRef = result.tparams.get(0) as TsTypeRef;
			expect(resultTypeRef.name.asString).toBe("TsQIdent(any)");
		});

		test("handles complex self-referencing scenarios", () => {
			const selfRefDefault = createTypeRef("TestInterface");
			const typeParam1 = createTypeParam("T", some(selfRefDefault));
			const typeParam2 = createTypeParam("U", some(TsTypeRef.string));
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([typeParam1, typeParam2]),
			);
			const scope = createMockScope(interface_);

			const typeRef = createTypeRef("TestInterface");
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should handle self-reference properly
			expect(result.tparams.length).toBe(2);

			// Check structural equality for second parameter
			const secondParam = result.tparams.get(1) as TsTypeRef;
			expect(secondParam._tag).toBe("TsTypeRef");
			expect(secondParam.name.asString).toBe("TsQIdent(string)");
			expect(secondParam.tparams.length).toBe(0);
		});
	});

	describe("Edge Cases", () => {
		test("handles non-existent type references", () => {
			const scope = createMockScope();

			const typeRef = createTypeRef(
				"NonExistentType",
				IArray.fromArray([TsTypeRef.string as TsType]),
			);
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should return unchanged when type is not found
			expect(result).toEqual(typeRef);
		});

		test("handles type aliases with defaults", () => {
			const typeParam1 = createTypeParam("T", some(TsTypeRef.string));
			const typeParam2 = createTypeParam("U", some(TsTypeRef.number));
			const typeAlias = createMockTypeAlias(
				"TestAlias",
				IArray.fromArray([typeParam1, typeParam2]),
			);
			const scope = createMockScope(typeAlias);

			const typeRef = createTypeRef("TestAlias");
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should work with type aliases too
			expect(result.tparams.length).toBe(2);

			// Check structural equality for type parameters
			const firstParam = result.tparams.get(0) as TsTypeRef;
			const secondParam = result.tparams.get(1) as TsTypeRef;

			expect(firstParam._tag).toBe("TsTypeRef");
			expect(firstParam.name.asString).toBe("TsQIdent(string)");
			expect(firstParam.tparams.length).toBe(0);

			expect(secondParam._tag).toBe("TsTypeRef");
			expect(secondParam.name.asString).toBe("TsQIdent(number)");
			expect(secondParam.tparams.length).toBe(0);
		});

		test("handles mixed provided and default arguments", () => {
			const typeParam1 = createTypeParam("T", some(TsTypeRef.string));
			const typeParam2 = createTypeParam("U", some(TsTypeRef.number));
			const typeParam3 = createTypeParam("V", some(TsTypeRef.boolean));
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([typeParam1, typeParam2, typeParam3]),
			);
			const scope = createMockScope(interface_);

			const typeRef = createTypeRef(
				"TestInterface",
				IArray.fromArray<TsType>([TsTypeRef.any, TsTypeRef.void]),
			);
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should keep provided arguments and add default for the last one
			expect(result.tparams.length).toBe(3);

			// Check structural equality for type parameters
			const firstParam = result.tparams.get(0) as TsTypeRef;
			const secondParam = result.tparams.get(1) as TsTypeRef;
			const thirdParam = result.tparams.get(2) as TsTypeRef;

			expect(firstParam._tag).toBe("TsTypeRef");
			expect(firstParam.name.asString).toBe("TsQIdent(any)");
			expect(firstParam.tparams.length).toBe(0);

			expect(secondParam._tag).toBe("TsTypeRef");
			expect(secondParam.name.asString).toBe("TsQIdent(void)");
			expect(secondParam.tparams.length).toBe(0);

			expect(thirdParam._tag).toBe("TsTypeRef");
			expect(thirdParam.name.asString).toBe("TsQIdent(boolean)");
			expect(thirdParam.tparams.length).toBe(0);
		});

		test("handles empty type parameter lists", () => {
			const interface_ = createMockInterface("EmptyInterface");
			const scope = createMockScope(interface_);

			const typeRef = createTypeRef("EmptyInterface");
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should return unchanged
			expect(result).toEqual(typeRef);
			expect(result.tparams.isEmpty).toBe(true);
		});

		test("preserves comments and other properties", () => {
			const typeParam1 = createTypeParam("T", some(TsTypeRef.string));
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.fromArray([typeParam1]),
			);
			const scope = createMockScope(interface_);

			const originalComments = Comments.apply([Comment.create("test comment")]);
			const typeRef = TsTypeRef.create(
				originalComments,
				createQIdent("TestInterface"),
				IArray.Empty,
			);
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(typeRef);

			// Should preserve original comments
			expect(result.comments).toEqual(originalComments);
			expect(result.name).toEqual(typeRef.name);
			expect(result.tparams.length).toBe(1);

			// Check structural equality for type parameter
			const firstParam = result.tparams.get(0) as TsTypeRef;
			expect(firstParam._tag).toBe("TsTypeRef");
			expect(firstParam.name.asString).toBe("TsQIdent(string)");
			expect(firstParam.tparams.length).toBe(0);
		});
	});

	describe("Integration Scenarios", () => {
		test("works with complex nested type structures", () => {
			const typeParam1 = createTypeParam("T", some(TsTypeRef.string));
			const typeParam2 = createTypeParam("U", some(TsTypeRef.number));
			const interface_ = createMockInterface(
				"Container",
				IArray.fromArray([typeParam1, typeParam2]),
			);
			const scope = createMockScope(interface_);

			const nestedTypeRef = createTypeRef(
				"Container",
				IArray.fromArray<TsType>([TsTypeRef.boolean]),
			);
			const transform = new DefaultedTypeArguments();
			const result = transform.enterTsTypeRef(scope)(nestedTypeRef);

			// Should handle nested structures correctly
			expect(result.tparams.length).toBe(2);

			// Check structural equality for type parameters
			const firstParam = result.tparams.get(0) as TsTypeRef;
			const secondParam = result.tparams.get(1) as TsTypeRef;

			expect(firstParam._tag).toBe("TsTypeRef");
			expect(firstParam.name.asString).toBe("TsQIdent(boolean)");
			expect(firstParam.tparams.length).toBe(0);

			expect(secondParam._tag).toBe("TsTypeRef");
			expect(secondParam.name.asString).toBe("TsQIdent(number)");
			expect(secondParam.tparams.length).toBe(0);
		});

		test("handles multiple type declarations in scope", () => {
			const typeParam1 = createTypeParam("T", some(TsTypeRef.string));
			const typeParam2 = createTypeParam("U", some(TsTypeRef.number));
			const interface1 = createMockInterface(
				"Interface1",
				IArray.fromArray([typeParam1]),
			);
			const interface2 = createMockInterface(
				"Interface2",
				IArray.fromArray([typeParam1, typeParam2]),
			);
			const scope = createMockScope(interface1, interface2);

			const typeRef1 = createTypeRef("Interface1");
			const typeRef2 = createTypeRef("Interface2");

			const transform = new DefaultedTypeArguments();
			const result1 = transform.enterTsTypeRef(scope)(typeRef1);
			const result2 = transform.enterTsTypeRef(scope)(typeRef2);

			// Should handle each type correctly
			expect(result1.tparams.length).toBe(1);

			// Check structural equality for result1
			const result1FirstParam = result1.tparams.get(0) as TsTypeRef;
			expect(result1FirstParam._tag).toBe("TsTypeRef");
			expect(result1FirstParam.name.asString).toBe("TsQIdent(string)");
			expect(result1FirstParam.tparams.length).toBe(0);

			expect(result2.tparams.length).toBe(2);

			// Check structural equality for result2
			const result2FirstParam = result2.tparams.get(0) as TsTypeRef;
			const result2SecondParam = result2.tparams.get(1) as TsTypeRef;

			expect(result2FirstParam._tag).toBe("TsTypeRef");
			expect(result2FirstParam.name.asString).toBe("TsQIdent(string)");
			expect(result2FirstParam.tparams.length).toBe(0);

			expect(result2SecondParam._tag).toBe("TsTypeRef");
			expect(result2SecondParam.name.asString).toBe("TsQIdent(number)");
			expect(result2SecondParam.tparams.length).toBe(0);
		});
	});
});
