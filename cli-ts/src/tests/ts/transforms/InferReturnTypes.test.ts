/**
 * TypeScript port of InferReturnTypesTests.scala
 *
 * Tests for the InferReturnTypes transform that infers return types for functions
 * by looking at parent class/interface implementations with the same signature.
 */

import { none, type Option, some } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { NoComments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { MethodType } from "@/internal/ts/MethodType.js";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import { InferReturnTypesTransform } from "@/internal/ts/transforms/InferReturnTypes.js";
import {
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclInterface,
	TsFunParam,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	type TsMember,
	TsMemberFunction,
	TsMemberProperty,
	TsParsedFile,
	TsProtectionLevel,
	TsQIdent,
	type TsType,
	TsTypeRef,
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

function createFunParam(
	name: string,
	tpe: Option<TsType> = some(TsTypeRef.string),
): TsFunParam {
	return TsFunParam.create(NoComments.instance, createSimpleIdent(name), tpe);
}

function createFunSig(
	params: IArray<TsFunParam> = IArray.Empty,
	resultType: Option<TsType> = none,
	tparams: IArray<any> = IArray.Empty,
): TsFunSig {
	return TsFunSig.create(NoComments.instance, tparams, params, resultType);
}

function createMockFunction(
	name: string,
	params: IArray<TsFunParam> = IArray.Empty,
	resultType: Option<TsType> = none,
	methodType: MethodType = MethodType.normal(),
): TsMemberFunction {
	return TsMemberFunction.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		methodType,
		createFunSig(params, resultType),
		false, // isStatic
		false, // isReadOnly
	);
}

function _createMockProperty(
	name: string,
	tpe: Option<TsType> = some(TsTypeRef.string),
): TsMemberProperty {
	return TsMemberProperty.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		tpe,
		none, // expr
		false, // isStatic
		false, // isReadOnly
	);
}

function createMockInterface(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	inheritance: IArray<TsTypeRef> = IArray.Empty,
): TsDeclInterface {
	return TsDeclInterface.create(
		NoComments.instance,
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		inheritance,
		members,
		CodePath.noPath(),
	);
}

function createMockClass(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	parent: Option<TsTypeRef> = none,
	implementsInterfaces: IArray<TsTypeRef> = IArray.Empty,
): TsDeclClass {
	return TsDeclClass.create(
		NoComments.instance,
		false, // declared
		false, // isAbstract
		createSimpleIdent(name),
		IArray.Empty, // tparams
		parent,
		implementsInterfaces,
		members,
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

// Helper function to cast TsMemberFunction arrays to TsMember arrays
function membersArray(...members: TsMemberFunction[]): IArray<TsMember> {
	return IArray.fromArray(members as TsMember[]);
}

// Helper function for type references
function typeRefsArray(...refs: TsTypeRef[]): IArray<TsTypeRef> {
	return IArray.fromArray(refs);
}

// Helper function for function parameters
function paramsArray(...params: TsFunParam[]): IArray<TsFunParam> {
	return IArray.fromArray(params);
}

// ============================================================================
// Test Suite
// ============================================================================

describe("InferReturnTypes", () => {
	describe("Basic Functionality", () => {
		test("extends TreeTransformationScopedChanges", () => {
			expect(InferReturnTypesTransform).toBeInstanceOf(
				TreeTransformationScopedChanges,
			);
		});

		test("has enterTsMemberFunction method", () => {
			const scope = createMockScope();
			const function_ = createMockFunction("testMethod");
			const result =
				InferReturnTypesTransform.enterTsMemberFunction(scope)(function_);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsMemberFunction");
		});

		test("leaves functions with return types unchanged", () => {
			const scope = createMockScope();
			const stringType = TsTypeRef.string;
			const function_ = createMockFunction(
				"testMethod",
				IArray.Empty,
				some(stringType),
			);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(scope)(function_);

			expect(result).toBe(function_); // Should be unchanged
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(stringType));
		});

		test("leaves constructor functions unchanged", () => {
			const scope = createMockScope();
			const constructor = createMockFunction("constructor", IArray.Empty, none);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(scope)(constructor);

			expect(result).toBe(constructor); // Should be unchanged
			expect(result.signature.resultType._tag).toBe("None");
		});

		test("leaves functions without owner unchanged", () => {
			const scope = createMockScope();
			const function_ = createMockFunction("testMethod", IArray.Empty, none);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(scope)(function_);

			expect(result).toBe(function_); // Should be unchanged since no owner in scope
			expect(result.signature.resultType._tag).toBe("None");
		});
	});

	describe("Return Type Inference", () => {
		test("infers return type from parent interface", () => {
			const stringType = TsTypeRef.string;
			const parentMethod = createMockFunction(
				"testMethod",
				IArray.Empty,
				some(stringType),
			);
			const parentInterface = createMockInterface(
				"ParentInterface",
				membersArray(parentMethod),
			);

			const childMethod = createMockFunction("testMethod", IArray.Empty, none); // No return type
			const childInterface = createMockInterface(
				"ChildInterface",
				membersArray(childMethod),
				typeRefsArray(createTypeRef("ParentInterface")),
			);

			// Create scope with both declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([parentInterface, childInterface]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childInterface);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should infer return type from parent
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(stringType));
		});

		test("infers return type from parent class", () => {
			const numberType = TsTypeRef.number;
			const parentMethod = createMockFunction(
				"testMethod",
				IArray.Empty,
				some(numberType),
			);
			const parentClass = createMockClass(
				"ParentClass",
				membersArray(parentMethod),
			);

			const childMethod = createMockFunction("testMethod", IArray.Empty, none); // No return type
			const childClass = createMockClass(
				"ChildClass",
				membersArray(childMethod),
				some(createTypeRef("ParentClass")),
			);

			// Create scope with both declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([parentClass, childClass]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childClass);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should infer return type from parent
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(numberType));
		});

		test("matches parameter count for inference", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const parentMethod1 = createMockFunction(
				"testMethod",
				paramsArray(createFunParam("param1")),
				some(stringType),
			);
			const parentMethod2 = createMockFunction(
				"testMethod",
				paramsArray(createFunParam("param1"), createFunParam("param2")),
				some(numberType),
			);
			const parentInterface = createMockInterface(
				"ParentInterface",
				membersArray(parentMethod1, parentMethod2),
			);

			const childMethod = createMockFunction(
				"testMethod",
				paramsArray(createFunParam("param1"), createFunParam("param2")),
				none,
			);
			const childInterface = createMockInterface(
				"ChildInterface",
				membersArray(childMethod),
				typeRefsArray(createTypeRef("ParentInterface")),
			);

			// Create scope with both declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([parentInterface, childInterface]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childInterface);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should infer return type from method with matching parameter count
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(numberType));
		});

		test("does not infer from non-normal methods", () => {
			const stringType = TsTypeRef.string;
			const parentGetter = createMockFunction(
				"getValue",
				IArray.Empty,
				some(stringType),
				MethodType.getter(),
			);
			const parentInterface = createMockInterface(
				"ParentInterface",
				membersArray(parentGetter),
			);

			const childMethod = createMockFunction("getValue", IArray.Empty, none); // Normal method, not getter
			const childInterface = createMockInterface(
				"ChildInterface",
				membersArray(childMethod),
				typeRefsArray(createTypeRef("ParentInterface")),
			);

			// Create scope with both declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([parentInterface, childInterface]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childInterface);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should not infer from getter to normal method
			expect(result.signature.resultType._tag).toBe("None");
		});
	});

	describe("Multiple Inheritance", () => {
		test("infers from first matching parent", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const parent1Method = createMockFunction(
				"testMethod",
				IArray.Empty,
				some(stringType),
			);
			const parent1Interface = createMockInterface(
				"Parent1Interface",
				membersArray(parent1Method),
			);

			const parent2Method = createMockFunction(
				"testMethod",
				IArray.Empty,
				some(numberType),
			);
			const parent2Interface = createMockInterface(
				"Parent2Interface",
				membersArray(parent2Method),
			);

			const childMethod = createMockFunction("testMethod", IArray.Empty, none);
			const childInterface = createMockInterface(
				"ChildInterface",
				membersArray(childMethod),
				typeRefsArray(
					createTypeRef("Parent1Interface"),
					createTypeRef("Parent2Interface"),
				),
			);

			// Create scope with all declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([
					parent1Interface,
					parent2Interface,
					childInterface,
				]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childInterface);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should infer from first matching parent
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(stringType));
		});

		test("handles inheritance chain", () => {
			const booleanType = TsTypeRef.boolean;
			const grandparentMethod = createMockFunction(
				"testMethod",
				IArray.Empty,
				some(booleanType),
			);
			const grandparentInterface = createMockInterface(
				"GrandparentInterface",
				membersArray(grandparentMethod),
			);

			const parentInterface = createMockInterface(
				"ParentInterface",
				IArray.Empty,
				typeRefsArray(createTypeRef("GrandparentInterface")),
			);

			const childMethod = createMockFunction("testMethod", IArray.Empty, none);
			const childInterface = createMockInterface(
				"ChildInterface",
				membersArray(childMethod),
				typeRefsArray(createTypeRef("ParentInterface")),
			);

			// Create scope with all declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([
					grandparentInterface,
					parentInterface,
					childInterface,
				]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childInterface);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should infer from grandparent through parent
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(booleanType));
		});
	});

	describe("Edge Cases", () => {
		test("handles method not found in parents", () => {
			const stringType = TsTypeRef.string;
			const parentMethod = createMockFunction(
				"otherMethod",
				IArray.Empty,
				some(stringType),
			);
			const parentInterface = createMockInterface(
				"ParentInterface",
				membersArray(parentMethod),
			);

			const childMethod = createMockFunction("testMethod", IArray.Empty, none); // Different method name
			const childInterface = createMockInterface(
				"ChildInterface",
				membersArray(childMethod),
				typeRefsArray(createTypeRef("ParentInterface")),
			);

			// Create scope with both declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([parentInterface, childInterface]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childInterface);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should not infer anything
			expect(result.signature.resultType._tag).toBe("None");
		});

		test("handles parent without matching method signature", () => {
			const stringType = TsTypeRef.string;
			const parentMethod = createMockFunction(
				"testMethod",
				paramsArray(createFunParam("param1")),
				some(stringType),
			);
			const parentInterface = createMockInterface(
				"ParentInterface",
				membersArray(parentMethod),
			);

			const childMethod = createMockFunction("testMethod", IArray.Empty, none); // Different parameter count
			const childInterface = createMockInterface(
				"ChildInterface",
				membersArray(childMethod),
				typeRefsArray(createTypeRef("ParentInterface")),
			);

			// Create scope with both declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([parentInterface, childInterface]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childInterface);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should not infer due to parameter count mismatch
			expect(result.signature.resultType._tag).toBe("None");
		});

		test("handles non-existent parent", () => {
			const childMethod = createMockFunction("testMethod", IArray.Empty, none);
			const childInterface = createMockInterface(
				"ChildInterface",
				membersArray(childMethod),
				typeRefsArray(createTypeRef("NonExistentParent")),
			);

			// Create scope with only child declaration (parent doesn't exist)
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([childInterface]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childInterface);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should not infer anything
			expect(result.signature.resultType._tag).toBe("None");
		});

		test("preserves function metadata", () => {
			const stringType = TsTypeRef.string;
			const parentMethod = createMockFunction(
				"testMethod",
				IArray.Empty,
				some(stringType),
			);
			const parentInterface = createMockInterface(
				"ParentInterface",
				membersArray(parentMethod),
			);

			const originalComments = NoComments.instance;
			const childMethod = TsMemberFunction.create(
				originalComments,
				TsProtectionLevel.private(),
				createSimpleIdent("testMethod"),
				MethodType.normal(),
				createFunSig(IArray.Empty, none),
				true, // isStatic
				true, // isReadOnly
			);
			const childInterface = createMockInterface(
				"ChildInterface",
				membersArray(childMethod),
				typeRefsArray(createTypeRef("ParentInterface")),
			);

			// Create scope with both declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([parentInterface, childInterface]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childInterface);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should preserve all metadata except add return type
			expect(result.comments).toEqual(originalComments);
			expect(result.level).toEqual(TsProtectionLevel.private());
			expect(result.isStatic).toBe(true);
			expect(result.isReadOnly).toBe(true);
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(stringType));
		});
	});

	describe("Integration Scenarios", () => {
		test("complex inheritance with mixed classes and interfaces", () => {
			const stringType = TsTypeRef.string;
			const baseMethod = createMockFunction(
				"process",
				paramsArray(createFunParam("data")),
				some(stringType),
			);
			const baseInterface = createMockInterface(
				"BaseInterface",
				membersArray(baseMethod),
			);

			const middleClass = createMockClass(
				"MiddleClass",
				IArray.Empty,
				none,
				typeRefsArray(createTypeRef("BaseInterface")),
			);

			const childMethod = createMockFunction(
				"process",
				paramsArray(createFunParam("data")),
				none,
			);
			const childClass = createMockClass(
				"ChildClass",
				membersArray(childMethod),
				some(createTypeRef("MiddleClass")),
			);

			// Create scope with all declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([
					baseInterface,
					middleClass,
					childClass,
				]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childClass);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should infer through the inheritance chain
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(stringType));
		});

		test("handles overloaded methods", () => {
			const stringType = TsTypeRef.string;
			const numberType = TsTypeRef.number;
			const parentMethod1 = createMockFunction(
				"testMethod",
				IArray.Empty,
				some(stringType),
			);
			const parentMethod2 = createMockFunction(
				"testMethod",
				paramsArray(createFunParam("param")),
				some(numberType),
			);
			const parentInterface = createMockInterface(
				"ParentInterface",
				membersArray(parentMethod1, parentMethod2),
			);

			const childMethod = createMockFunction("testMethod", IArray.Empty, none); // Matches first overload
			const childInterface = createMockInterface(
				"ChildInterface",
				membersArray(childMethod),
				typeRefsArray(createTypeRef("ParentInterface")),
			);

			// Create scope with both declarations available for lookup
			const libName = TsIdent.librarySimple("test-lib");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty, // directives
				IArray.fromArray<TsContainerOrDecl>([parentInterface, childInterface]),
				CodePath.noPath(),
			);
			const deps = new Map();
			const logger = Logger.DevNull();

			const rootScope = TsTreeScope.create(libName, false, deps, logger);
			const scope = rootScope["/"](parsedFile);
			const childScope = scope["/"](childInterface);

			const result =
				InferReturnTypesTransform.enterTsMemberFunction(childScope)(
					childMethod,
				);

			// Should infer from matching overload
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(stringType));
		});
	});
});
