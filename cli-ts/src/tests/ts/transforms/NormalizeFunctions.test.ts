/**
 * Tests for NormalizeFunctions.ts - TypeScript port of NormalizeFunctionsTests.scala
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, it } from "bun:test";
import { Raw } from "../../../internal/Comment.js";
import { Comments, NoComments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { Logger } from "../../../internal/logging/index.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { JsLocation } from "../../../internal/ts/JsLocation.js";
import { TsProtectionLevel } from "../../../internal/ts/TsProtectionLevel.js";
import { TsTreeScope } from "../../../internal/ts/TsTreeScope.js";
import { NormalizeFunctions } from "../../../internal/ts/transforms/NormalizeFunctions.js";
import {
	TsDeclClass,
	TsDeclInterface,
	TsDeclVar,
	TsExprLiteral,
	TsFunParam,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	type TsMember,
	TsMemberCall,
	type TsMemberFunction,
	TsMemberProperty,
	TsParsedFile,
	TsQIdent,
	TsTypeFunction,
	TsTypeObject,
	TsTypeRef,
} from "../../../internal/ts/trees.js";

// Helper methods for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]): TsQIdent {
	return TsQIdent.of(...parts.map(createSimpleIdent));
}

function createTypeRef(
	name: string,
	tparams: IArray<any> = IArray.Empty,
): TsTypeRef {
	return TsTypeRef.create(NoComments.instance, createQIdent(name), tparams);
}

function createFunSig(
	params: IArray<TsFunParam> = IArray.Empty,
	resultType: TsTypeRef = createTypeRef("void"),
): TsFunSig {
	return TsFunSig.create(
		NoComments.instance,
		IArray.Empty, // tparams
		params,
		some(resultType),
	);
}

function createFunParam(
	name: string,
	tpe: TsTypeRef = createTypeRef("any"),
): TsFunParam {
	return TsFunParam.create(
		NoComments.instance,
		createSimpleIdent(name),
		some(tpe),
	);
}

function createTypeFunction(sig: TsFunSig): TsTypeFunction {
	return TsTypeFunction.create(sig);
}

function createTypeObject(members: IArray<TsMember>): TsTypeObject {
	return TsTypeObject.create(NoComments.instance, members);
}

function createMemberCall(sig: TsFunSig): TsMemberCall {
	return TsMemberCall.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		sig,
	);
}

function createMemberProperty(
	name: string,
	tpe?: any,
	isStatic: boolean = false,
	isReadOnly: boolean = false,
): TsMemberProperty {
	return TsMemberProperty.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		tpe ? some(tpe) : none,
		none, // expr
		isStatic,
		isReadOnly,
	);
}

function createMockClass(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
): TsDeclClass {
	return TsDeclClass.create(
		NoComments.instance,
		false, // declared
		false, // isAbstract
		createSimpleIdent(name),
		IArray.Empty, // tparams
		none, // parent
		IArray.Empty, // implements
		members,
		JsLocation.zero(),
		CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent(name)),
	);
}

function _createMockInterface(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
): TsDeclInterface {
	return TsDeclInterface.create(
		NoComments.instance,
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		IArray.Empty, // inheritance
		members,
		CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent(name)),
	);
}

function createMockVar(
	name: string,
	tpe?: any,
	isReadOnly: boolean = true,
): TsDeclVar {
	return TsDeclVar.create(
		NoComments.instance,
		false, // declared
		isReadOnly,
		createSimpleIdent(name),
		tpe ? some(tpe) : none,
		none, // expr
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

describe("NormalizeFunctions", () => {
	describe("Basic Functionality", () => {
		it("extends TransformMembers", () => {
			expect(NormalizeFunctions.instance).toBeInstanceOf(NormalizeFunctions);
		});

		it("has newClassMembers method", () => {
			const scope = createMockScope();
			const clazz = createMockClass("TestClass");
			const result = NormalizeFunctions.instance.newClassMembers(scope, clazz);
			expect(result).toBeDefined();
			expect(result).toBeInstanceOf(IArray);
		});

		it("has newMembers method", () => {
			const scope = createMockScope();
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.Empty,
				CodePath.noPath(),
			);
			const result = NormalizeFunctions.instance.newMembers(scope, parsedFile);
			expect(result).toBeDefined();
			expect(result).toBeInstanceOf(IArray);
		});

		it("has enterTsType method", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("string");
			const result = NormalizeFunctions.instance.enterTsType(scope)(typeRef);
			expect(result).toBeDefined();
		});
	});

	describe("ToRewrite Pattern Matching", () => {
		it("matches TsTypeFunction", () => {
			const sig = createFunSig();
			const funType = createTypeFunction(sig);

			// Access the private toRewrite method via reflection-like approach
			const toRewriteResult = (NormalizeFunctions as any).toRewrite(funType);

			expect(toRewriteResult._tag).toBe("Some");
			expect(toRewriteResult.value.length).toBe(1);
			expect(toRewriteResult.value.apply(0)).toBe(sig);
		});

		it("matches TsTypeObject with only call signatures", () => {
			const sig = createFunSig();
			const callMember = createMemberCall(sig);
			const objType = createTypeObject(IArray.apply(callMember as TsMember));

			const toRewriteResult = (NormalizeFunctions as any).toRewrite(objType);

			expect(toRewriteResult._tag).toBe("Some");
			expect(toRewriteResult.value.length).toBe(1);
			expect(toRewriteResult.value.apply(0)).toBe(sig);
		});

		it("does not match TsTypeObject with mixed members", () => {
			const sig = createFunSig();
			const callMember = createMemberCall(sig);
			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const objType = createTypeObject(
				IArray.apply(callMember as TsMember, propMember as TsMember),
			);

			const toRewriteResult = (NormalizeFunctions as any).toRewrite(objType);

			expect(toRewriteResult._tag).toBe("None");
		});

		it("does not match other types", () => {
			const stringType = createTypeRef("string");

			const toRewriteResult = (NormalizeFunctions as any).toRewrite(stringType);

			expect(toRewriteResult._tag).toBe("None");
		});
	});

	describe("Class Member Transformation", () => {
		it("converts function property to method", () => {
			const scope = createMockScope();
			const sig = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("number"))),
				createTypeRef("string"),
			);
			const funType = createTypeFunction(sig);
			const prop = createMemberProperty("myMethod", funType);
			const clazz = createMockClass(
				"TestClass",
				IArray.apply(prop as TsMember),
			);

			const result = NormalizeFunctions.instance.newClassMembers(scope, clazz);

			expect(result.length).toBe(1);
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
			const func = result.apply(0) as TsMemberFunction;
			expect(func.name.value).toBe("myMethod");
			expect(func.methodType._tag).toBe("Normal");
			expect(func.signature).toBe(sig);
		});

		it("converts object type with call signature to method", () => {
			const scope = createMockScope();
			const sig = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("number"))),
				createTypeRef("string"),
			);
			const callMember = createMemberCall(sig);
			const objType = createTypeObject(IArray.apply(callMember as TsMember));
			const prop = createMemberProperty("myMethod", objType);
			const clazz = createMockClass(
				"TestClass",
				IArray.apply(prop as TsMember),
			);

			const result = NormalizeFunctions.instance.newClassMembers(scope, clazz);

			expect(result.length).toBe(1);
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
			const func = result.apply(0) as TsMemberFunction;
			expect(func.name.value).toBe("myMethod");
			expect(func.signature).toBe(sig);
		});

		it("handles multiple call signatures", () => {
			const scope = createMockScope();
			const sig1 = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("number"))),
				createTypeRef("string"),
			);
			const sig2 = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("string"))),
				createTypeRef("number"),
			);
			const callMember1 = createMemberCall(sig1);
			const callMember2 = createMemberCall(sig2);
			const objType = createTypeObject(
				IArray.apply(callMember1 as TsMember, callMember2 as TsMember),
			);
			const prop = createMemberProperty("overloadedMethod", objType);
			const clazz = createMockClass(
				"TestClass",
				IArray.apply(prop as TsMember),
			);

			const result = NormalizeFunctions.instance.newClassMembers(scope, clazz);

			expect(result.length).toBe(2);
			expect(
				result.forall((member) => member._tag === "TsMemberFunction"),
			).toBe(true);
			const func1 = result.apply(0) as TsMemberFunction;
			const func2 = result.apply(1) as TsMemberFunction;
			expect(func1.name.value).toBe("overloadedMethod");
			expect(func2.name.value).toBe("overloadedMethod");
			expect(func1.signature).toBe(sig1);
			expect(func2.signature).toBe(sig2);
		});

		it("preserves member metadata when converting", () => {
			const scope = createMockScope();
			const originalComments = Comments.apply([
				new Raw("Original property comment"),
			]);
			const sig = createFunSig();
			const funType = createTypeFunction(sig);
			const prop = TsMemberProperty.create(
				originalComments,
				TsProtectionLevel.private(),
				createSimpleIdent("myMethod"),
				some(funType),
				none, // expr
				true, // isStatic
				true, // isReadOnly
			);
			const clazz = createMockClass(
				"TestClass",
				IArray.apply(prop as TsMember),
			);

			const result = NormalizeFunctions.instance.newClassMembers(scope, clazz);

			expect(result.length).toBe(1);
			const func = result.apply(0) as TsMemberFunction;
			expect(func.comments).toBe(originalComments);
			expect(func.level._tag).toBe("Private");
			expect(func.isStatic).toBe(true);
			expect(func.isReadOnly).toBe(true);
		});

		it("leaves non-function properties unchanged", () => {
			const scope = createMockScope();
			const stringProp = createMemberProperty(
				"stringProp",
				createTypeRef("string"),
			);
			const numberProp = createMemberProperty(
				"numberProp",
				createTypeRef("number"),
			);
			const clazz = createMockClass(
				"TestClass",
				IArray.apply(stringProp as TsMember, numberProp as TsMember),
			);

			const result = NormalizeFunctions.instance.newClassMembers(scope, clazz);

			expect(result.length).toBe(2);
			expect(result.apply(0)).toBe(stringProp);
			expect(result.apply(1)).toBe(numberProp);
		});

		it("leaves properties with expressions unchanged", () => {
			const scope = createMockScope();
			const sig = createFunSig();
			const funType = createTypeFunction(sig);
			const propWithExpr = TsMemberProperty.create(
				NoComments.instance,
				TsProtectionLevel.default(),
				createSimpleIdent("myMethod"),
				some(funType),
				some(TsExprLiteral.string("value")),
				false, // isStatic
				false, // isReadOnly
			);
			const clazz = createMockClass(
				"TestClass",
				IArray.apply(propWithExpr as TsMember),
			);

			const result = NormalizeFunctions.instance.newClassMembers(scope, clazz);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(propWithExpr);
		});

		it("leaves properties without types unchanged", () => {
			const scope = createMockScope();
			const propWithoutType = createMemberProperty("prop");
			const clazz = createMockClass(
				"TestClass",
				IArray.apply(propWithoutType as TsMember),
			);

			const result = NormalizeFunctions.instance.newClassMembers(scope, clazz);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(propWithoutType);
		});
	});

	describe("Variable Declaration Transformation", () => {
		it("converts readonly function variable to function declaration", () => {
			const scope = createMockScope();
			const sig = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("number"))),
				createTypeRef("string"),
			);
			const funType = createTypeFunction(sig);
			const varDecl = createMockVar("myFunction", funType, true);
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(varDecl as any),
				CodePath.noPath(),
			);

			const result = NormalizeFunctions.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(1);
			expect(result.apply(0)._tag).toBe("TsDeclFunction");
			const funcDecl = result.apply(0) as any;
			expect(funcDecl.name.value).toBe("myFunction");
			expect(funcDecl.signature).toBe(sig);
		});

		it("converts object type variable with call signature to function declaration", () => {
			const scope = createMockScope();
			const sig = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("number"))),
				createTypeRef("string"),
			);
			const callMember = createMemberCall(sig);
			const objType = createTypeObject(IArray.apply(callMember as TsMember));
			const varDecl = createMockVar("myFunction", objType, true);
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(varDecl as any),
				CodePath.noPath(),
			);

			const result = NormalizeFunctions.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(1);
			expect(result.apply(0)._tag).toBe("TsDeclFunction");
			const funcDecl = result.apply(0) as any;
			expect(funcDecl.name.value).toBe("myFunction");
			expect(funcDecl.signature).toBe(sig);
		});

		it("handles multiple call signatures in variable", () => {
			const scope = createMockScope();
			const sig1 = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("number"))),
				createTypeRef("string"),
			);
			const sig2 = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("string"))),
				createTypeRef("number"),
			);
			const callMember1 = createMemberCall(sig1);
			const callMember2 = createMemberCall(sig2);
			const objType = createTypeObject(
				IArray.apply(callMember1 as TsMember, callMember2 as TsMember),
			);
			const varDecl = createMockVar("overloadedFunction", objType, true);
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(varDecl as any),
				CodePath.noPath(),
			);

			const result = NormalizeFunctions.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(2);
			expect(result.forall((member) => member._tag === "TsDeclFunction")).toBe(
				true,
			);
			const funcDecl1 = result.apply(0) as any;
			const funcDecl2 = result.apply(1) as any;
			expect(funcDecl1.name.value).toBe("overloadedFunction");
			expect(funcDecl2.name.value).toBe("overloadedFunction");
			expect(funcDecl1.signature).toBe(sig1);
			expect(funcDecl2.signature).toBe(sig2);
		});

		it("preserves variable metadata when converting", () => {
			const scope = createMockScope();
			const originalComments = Comments.apply([
				new Raw("Original variable comment"),
			]);
			const sig = createFunSig();
			const funType = createTypeFunction(sig);
			const varDecl = TsDeclVar.create(
				originalComments,
				true, // declared
				true, // readOnly
				createSimpleIdent("myFunction"),
				some(funType),
				none, // expr
				JsLocation.zero(),
				CodePath.hasPath(
					TsIdent.librarySimple("test-lib"),
					createQIdent("myFunction"),
				),
			);
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(varDecl as any),
				CodePath.noPath(),
			);

			const result = NormalizeFunctions.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(1);
			const funcDecl = result.apply(0) as any;
			expect(funcDecl.comments).toBe(originalComments);
			expect(funcDecl.declared).toBe(true);
		});

		it("leaves non-readonly variables unchanged", () => {
			const scope = createMockScope();
			const sig = createFunSig();
			const funType = createTypeFunction(sig);
			const varDecl = createMockVar("myFunction", funType, false); // not readonly
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(varDecl as any),
				CodePath.noPath(),
			);

			const result = NormalizeFunctions.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(varDecl);
		});

		it("leaves variables with expressions unchanged", () => {
			const scope = createMockScope();
			const sig = createFunSig();
			const funType = createTypeFunction(sig);
			const varWithExpr = TsDeclVar.create(
				NoComments.instance,
				false, // declared
				true, // readOnly
				createSimpleIdent("myFunction"),
				some(funType),
				some(TsExprLiteral.string("value")),
				JsLocation.zero(),
				CodePath.hasPath(
					TsIdent.librarySimple("test-lib"),
					createQIdent("myFunction"),
				),
			);
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(varWithExpr as any),
				CodePath.noPath(),
			);

			const result = NormalizeFunctions.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(varWithExpr);
		});

		it("leaves variables without types unchanged", () => {
			const scope = createMockScope();
			const varWithoutType = createMockVar("myVar");
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(varWithoutType as any),
				CodePath.noPath(),
			);

			const result = NormalizeFunctions.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(varWithoutType);
		});
	});

	describe("Type Transformation", () => {
		it("converts object type with single call signature to function type", () => {
			const scope = createMockScope();
			const sig = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("number"))),
				createTypeRef("string"),
			);
			const callMember = createMemberCall(sig);
			const objType = createTypeObject(IArray.apply(callMember as TsMember));

			const result = NormalizeFunctions.instance.enterTsType(scope)(objType);

			expect(result._tag).toBe("TsTypeFunction");
			const funType = result as TsTypeFunction;
			expect(funType.signature).toBe(sig);
		});

		it("leaves object types with multiple members unchanged", () => {
			const scope = createMockScope();
			const sig = createFunSig();
			const callMember = createMemberCall(sig);
			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const objType = createTypeObject(
				IArray.apply(callMember as TsMember, propMember as TsMember),
			);

			const result = NormalizeFunctions.instance.enterTsType(scope)(objType);

			expect(result).toBe(objType);
		});

		it("leaves object types with multiple call signatures unchanged", () => {
			const scope = createMockScope();
			const sig1 = createFunSig();
			const sig2 = createFunSig();
			const callMember1 = createMemberCall(sig1);
			const callMember2 = createMemberCall(sig2);
			const objType = createTypeObject(
				IArray.apply(callMember1 as TsMember, callMember2 as TsMember),
			);

			const result = NormalizeFunctions.instance.enterTsType(scope)(objType);

			expect(result).toBe(objType);
		});

		it("leaves empty object types unchanged", () => {
			const scope = createMockScope();
			const objType = createTypeObject(IArray.Empty);

			const result = NormalizeFunctions.instance.enterTsType(scope)(objType);

			expect(result).toBe(objType);
		});

		it("leaves non-object types unchanged", () => {
			const scope = createMockScope();
			const stringType = createTypeRef("string");

			const result = NormalizeFunctions.instance.enterTsType(scope)(stringType);

			expect(result).toBe(stringType);
		});

		it("leaves function types unchanged", () => {
			const scope = createMockScope();
			const sig = createFunSig();
			const funType = createTypeFunction(sig);

			const result = NormalizeFunctions.instance.enterTsType(scope)(funType);

			expect(result).toBe(funType);
		});
	});
});
