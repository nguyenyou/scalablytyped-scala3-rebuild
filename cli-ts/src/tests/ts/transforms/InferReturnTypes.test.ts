/**
 * TypeScript port of InferReturnTypesTests.scala
 *
 * Tests for the InferReturnTypes transform that infers return types for functions
 * by looking at parent class/interface implementations with the same signature.
 */

import { describe, expect, test } from "bun:test";
import { none, some, type Option } from "fp-ts/Option";
import { Comments, NoComments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { MethodType } from "@/internal/ts/MethodType.js";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import {
  TsContainerOrDecl,
  TsDeclClass,
  TsDeclInterface,
  TsFunParam,
  TsFunSig,
  TsIdent,
  TsIdentSimple,
  TsMember,
  TsMemberFunction,
  TsMemberProperty,
  TsParsedFile,
  TsProtectionLevel,
  TsQIdent,
  type TsType,
  TsTypeRef,
} from "@/internal/ts/trees.js";
import {
	InferReturnTypes,
	InferReturnTypesTransform,
} from "@/internal/ts/transforms/InferReturnTypes.js";

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
	return TsFunParam.create(
		NoComments.instance,
		createSimpleIdent(name),
		tpe,
	);
}

function createFunSig(
	params: IArray<TsFunParam> = IArray.Empty,
	resultType: Option<TsType> = none,
	tparams: IArray<any> = IArray.Empty,
): TsFunSig {
	return TsFunSig.create(
		NoComments.instance,
		tparams,
		params,
		resultType,
	);
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

function createMockProperty(
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
			expect(InferReturnTypesTransform).toBeInstanceOf(TreeTransformationScopedChanges);
		});

		test("has enterTsMemberFunction method", () => {
			const scope = createMockScope();
			const function_ = createMockFunction("testMethod");
			const result = InferReturnTypesTransform.enterTsMemberFunction(scope)(function_);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsMemberFunction");
		});

		test("leaves functions with return types unchanged", () => {
			const scope = createMockScope();
			const stringType = TsTypeRef.string;
			const function_ = createMockFunction("testMethod", IArray.Empty, some(stringType));

			const result = InferReturnTypesTransform.enterTsMemberFunction(scope)(function_);

			expect(result).toBe(function_); // Should be unchanged
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(stringType));
		});

		test("leaves constructor functions unchanged", () => {
			const scope = createMockScope();
			const constructor = createMockFunction("constructor", IArray.Empty, none);
			
			const result = InferReturnTypesTransform.enterTsMemberFunction(scope)(constructor);
			
			expect(result).toBe(constructor); // Should be unchanged
			expect(result.signature.resultType._tag).toBe("None");
		});

		test("leaves functions without owner unchanged", () => {
			const scope = createMockScope();
			const function_ = createMockFunction("testMethod", IArray.Empty, none);
			
			const result = InferReturnTypesTransform.enterTsMemberFunction(scope)(function_);
			
			expect(result).toBe(function_); // Should be unchanged since no owner in scope
			expect(result.signature.resultType._tag).toBe("None");
		});
	});

	describe("Return Type Inference", () => {
		test("infers return type from parent interface", () => {
			const stringType = TsTypeRef.string;
			const parentMethod = createMockFunction("testMethod", IArray.Empty, some(stringType));
			const parentInterface = createMockInterface("ParentInterface", membersArray(parentMethod));

			const childMethod = createMockFunction("testMethod", IArray.Empty, none); // No return type
			const childInterface = createMockInterface("ChildInterface", membersArray(childMethod), typeRefsArray(createTypeRef("ParentInterface")));

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

			const result = InferReturnTypesTransform.enterTsMemberFunction(childScope)(childMethod);

			// Should infer return type from parent
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(stringType));
		});

		test("infers return type from parent class", () => {
			const numberType = TsTypeRef.number;
			const parentMethod = createMockFunction("testMethod", IArray.Empty, some(numberType));
			const parentClass = createMockClass("ParentClass", membersArray(parentMethod));

			const childMethod = createMockFunction("testMethod", IArray.Empty, none); // No return type
			const childClass = createMockClass("ChildClass", membersArray(childMethod), some(createTypeRef("ParentClass")));

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

			const result = InferReturnTypesTransform.enterTsMemberFunction(childScope)(childMethod);

			// Should infer return type from parent
			expect(result.signature.resultType._tag).toBe("Some");
			expect(result.signature.resultType).toEqual(some(numberType));
		});
	});
});