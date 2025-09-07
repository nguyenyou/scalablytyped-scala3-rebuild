/**
 * Tests for PreferTypeAlias.ts - TypeScript port of PreferTypeAliasTests.scala
 */

import { describe, expect, it } from "vitest";
import { none, some } from "fp-ts/Option";
import { Comment, Raw } from "../../../internal/Comment.js";
import { Comments, NoComments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { Logger } from "../../../internal/logging/index.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { JsLocation } from "../../../internal/ts/JsLocation.js";
import { PreferTypeAlias } from "../../../internal/ts/transforms/PreferTypeAlias.js";
import { TsProtectionLevel } from "../../../internal/ts/TsProtectionLevel.js";
import { TsTreeScope } from "../../../internal/ts/TsTreeScope.js";
import {
	TsDeclClass,
	TsDeclInterface,
	TsDeclTypeAlias,
	TsExprLiteral,
	TsFunParam,
	TsFunSig,
	TsIdent,
	TsMemberCall,
	TsMemberFunction,
	TsMemberProperty,
	TsParsedFile,
	TsQIdent,
	TsTypeFunction,
	TsTypeObject,
	TsTypeRef,
	type TsIdentSimple,
	type TsMember,
	type TsType,
} from "../../../internal/ts/trees.js";

// Helper methods for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]): TsQIdent {
	return TsQIdent.of(...parts.map(createSimpleIdent));
}

function createTypeRef(name: string, tparams: IArray<TsType> = IArray.Empty): TsTypeRef {
	return TsTypeRef.create(NoComments.instance, createQIdent(name), tparams);
}

function createFunSig(
	params: IArray<TsFunParam> = IArray.Empty,
	resultType: TsTypeRef = createTypeRef("void")
): TsFunSig {
	return TsFunSig.create(
		NoComments.instance,
		IArray.Empty, // tparams
		params,
		some(resultType)
	);
}

function createFunParam(name: string, tpe: TsTypeRef = createTypeRef("any")): TsFunParam {
	return TsFunParam.create(
		NoComments.instance,
		createSimpleIdent(name),
		some(tpe)
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
		sig
	);
}

function createMemberProperty(
	name: string,
	tpe?: TsType,
	isStatic: boolean = false,
	isReadOnly: boolean = false
): TsMemberProperty {
	return TsMemberProperty.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		tpe ? some(tpe) : none,
		none, // expr
		isStatic,
		isReadOnly
	);
}

function createMemberFunction(
	name: string,
	sig: TsFunSig,
	isStatic: boolean = false
): TsMemberFunction {
	return TsMemberFunction.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		{ _tag: "Normal" }, // MethodType.normal()
		sig,
		isStatic,
		false // isReadOnly
	);
}

function createMockInterface(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	inheritance: IArray<TsTypeRef> = IArray.Empty
): TsDeclInterface {
	return TsDeclInterface.create(
		NoComments.instance,
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		inheritance,
		members,
		CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent(name))
	);
}

function createMockTypeAlias(
	name: string,
	alias: TsType
): TsDeclTypeAlias {
	return TsDeclTypeAlias.create(
		NoComments.instance,
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		alias,
		CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent(name))
	);
}

function createMockParsedFile(
	declarations: IArray<any> = IArray.Empty
): TsParsedFile {
	return TsParsedFile.create(
		NoComments.instance,
		IArray.Empty, // directives
		declarations,
		CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent("index"))
	);
}

function createMockScope(...declarations: any[]): TsTreeScope {
	const libName = TsIdent.librarySimple("test-lib");
	const parsedFile = createMockParsedFile(IArray.fromArray(declarations));
	const deps = new Map();
	const logger = Logger.DevNull();

	const root = TsTreeScope.create(libName, false, deps, logger);
	return root["/"](parsedFile);
}

describe("PreferTypeAlias", () => {
	describe("Basic Functionality", () => {
		it("has apply method", () => {
			expect(PreferTypeAlias.apply).toBeDefined();
			expect(typeof PreferTypeAlias.apply).toBe("function");
		});

		it("has findGroups method", () => {
			expect(PreferTypeAlias.findGroups).toBeDefined();
			expect(typeof PreferTypeAlias.findGroups).toBe("function");
		});

		it("has isContainer method", () => {
			expect(PreferTypeAlias.isContainer).toBeDefined();
			expect(typeof PreferTypeAlias.isContainer).toBe("function");
		});

		it("has isTypeMapping method", () => {
			expect(PreferTypeAlias.isTypeMapping).toBeDefined();
			expect(typeof PreferTypeAlias.isTypeMapping).toBe("function");
		});

		it("has asTypeArgs method", () => {
			expect(PreferTypeAlias.asTypeArgs).toBeDefined();
			expect(typeof PreferTypeAlias.asTypeArgs).toBe("function");
		});

		it("has breakCircularGroups method", () => {
			expect(PreferTypeAlias.breakCircularGroups).toBeDefined();
			expect(typeof PreferTypeAlias.breakCircularGroups).toBe("function");
		});
	});

	describe("Container Detection", () => {
		it("identifies namespace as container", () => {
			const namespace = { _tag: "TsDeclNamespace" };
			expect(PreferTypeAlias.isContainer(namespace as any)).toBe(true);
		});

		it("identifies module as container", () => {
			const module = { _tag: "TsDeclModule" };
			expect(PreferTypeAlias.isContainer(module as any)).toBe(true);
		});

		it("identifies global as container", () => {
			const global = { _tag: "TsGlobal" };
			expect(PreferTypeAlias.isContainer(global as any)).toBe(true);
		});

		it("identifies parsed file as container", () => {
			const parsedFile = { _tag: "TsParsedFile" };
			expect(PreferTypeAlias.isContainer(parsedFile as any)).toBe(true);
		});

		it("does not identify interface as container", () => {
			const iface = { _tag: "TsDeclInterface" };
			expect(PreferTypeAlias.isContainer(iface as any)).toBe(false);
		});

		it("does not identify class as container", () => {
			const clazz = { _tag: "TsDeclClass" };
			expect(PreferTypeAlias.isContainer(clazz as any)).toBe(false);
		});
	});

	describe("Type Mapping Detection", () => {
		it("identifies single mapped type member as type mapping", () => {
			const mappedMember = { _tag: "TsMemberTypeMapped" };
			const members = IArray.apply(mappedMember as TsMember);
			expect(PreferTypeAlias.isTypeMapping(members)).toBe(true);
		});

		it("does not identify multiple members as type mapping", () => {
			const mappedMember = { _tag: "TsMemberTypeMapped" };
			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const members = IArray.apply(mappedMember as TsMember, propMember as TsMember);
			expect(PreferTypeAlias.isTypeMapping(members)).toBe(false);
		});

		it("does not identify empty members as type mapping", () => {
			const members = IArray.Empty;
			expect(PreferTypeAlias.isTypeMapping(members)).toBe(false);
		});

		it("does not identify non-mapped members as type mapping", () => {
			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const members = IArray.apply(propMember as TsMember);
			expect(PreferTypeAlias.isTypeMapping(members)).toBe(false);
		});
	});

	describe("PreferTypeAliasVisitor", () => {
		it("converts interface with only call signatures to type alias", () => {
			const scope = createMockScope();
			const sig = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("number"))),
				createTypeRef("string")
			);
			const callMember = createMemberCall(sig);
			const iface = createMockInterface("FunctionInterface", IArray.apply(callMember as TsMember));
			const parsedFile = createMockParsedFile(IArray.apply(iface as any));

			const result = PreferTypeAlias.apply(parsedFile, scope);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclTypeAlias");
			const alias = result.members.apply(0) as TsDeclTypeAlias;
			expect(alias.name.value).toBe("FunctionInterface");
			expect(alias.alias._tag).toBe("TsTypeObject");
		});

		it("converts interface with simple object members to type alias", () => {
			const scope = createMockScope();
			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const funcMember = createMemberFunction("method", createFunSig());
			const iface = createMockInterface("SimpleInterface", IArray.apply(propMember as TsMember, funcMember as TsMember));
			const parsedFile = createMockParsedFile(IArray.apply(iface as any));

			const result = PreferTypeAlias.apply(parsedFile, scope);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclTypeAlias");
			const alias = result.members.apply(0) as TsDeclTypeAlias;
			expect(alias.name.value).toBe("SimpleInterface");
			expect(alias.alias._tag).toBe("TsTypeObject");
		});

		it("does not convert interface with inheritance", () => {
			const scope = createMockScope();
			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const inheritance = IArray.apply(createTypeRef("BaseInterface"));
			const iface = createMockInterface("DerivedInterface", IArray.apply(propMember as TsMember), inheritance);
			const parsedFile = createMockParsedFile(IArray.apply(iface as any));

			const result = PreferTypeAlias.apply(parsedFile, scope);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclInterface");
			const resultIface = result.members.apply(0) as TsDeclInterface;
			expect(resultIface.name.value).toBe("DerivedInterface");
		});

		it("converts type alias with object type to interface", () => {
			const scope = createMockScope();
			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const objType = createTypeObject(IArray.apply(propMember as TsMember));
			const alias = createMockTypeAlias("ObjectAlias", objType);
			const parsedFile = createMockParsedFile(IArray.apply(alias as any));

			const result = PreferTypeAlias.apply(parsedFile, scope);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclInterface");
			const iface = result.members.apply(0) as TsDeclInterface;
			expect(iface.name.value).toBe("ObjectAlias");
			expect(iface.members.length).toBe(1);
		});

		it("does not convert type alias with non-object type", () => {
			const scope = createMockScope();
			const stringType = createTypeRef("string");
			const alias = createMockTypeAlias("StringAlias", stringType);
			const parsedFile = createMockParsedFile(IArray.apply(alias as any));

			const result = PreferTypeAlias.apply(parsedFile, scope);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclTypeAlias");
			const resultAlias = result.members.apply(0) as TsDeclTypeAlias;
			expect(resultAlias.name.value).toBe("StringAlias");
		});

		it("preserves metadata when converting interface to type alias", () => {
			const scope = createMockScope();
			const originalComments = Comments.apply([new Raw("Original interface comment")]);
			const sig = createFunSig();
			const callMember = createMemberCall(sig);
			const iface = TsDeclInterface.create(
				originalComments,
				true, // declared
				createSimpleIdent("TestInterface"),
				IArray.Empty, // tparams
				IArray.Empty, // inheritance
				IArray.apply(callMember as TsMember),
				CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent("TestInterface"))
			);
			const parsedFile = createMockParsedFile(IArray.apply(iface as any));

			const result = PreferTypeAlias.apply(parsedFile, scope);

			expect(result.members.length).toBe(1);
			const alias = result.members.apply(0) as TsDeclTypeAlias;
			expect(alias.comments).toBe(originalComments);
			expect(alias.declared).toBe(true);
		});

		it("preserves metadata when converting type alias to interface", () => {
			const scope = createMockScope();
			const originalComments = Comments.apply([new Raw("Original alias comment")]);
			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const objType = createTypeObject(IArray.apply(propMember as TsMember));
			const alias = TsDeclTypeAlias.create(
				originalComments,
				true, // declared
				createSimpleIdent("TestAlias"),
				IArray.Empty, // tparams
				objType,
				CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent("TestAlias"))
			);
			const parsedFile = createMockParsedFile(IArray.apply(alias as any));

			const result = PreferTypeAlias.apply(parsedFile, scope);

			expect(result.members.length).toBe(1);
			const iface = result.members.apply(0) as TsDeclInterface;
			expect(iface.comments).toBe(originalComments);
			expect(iface.declared).toBe(true);
		});
	});
});
