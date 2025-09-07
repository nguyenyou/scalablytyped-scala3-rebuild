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
import { AvoidCircularVisitor, PreferTypeAlias, type Rewrite } from "../../../internal/ts/transforms/PreferTypeAlias.js";
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
	TsTypeIntersect,
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



function createTypeIntersect(types: IArray<TsType>): TsTypeIntersect {
	return TsTypeIntersect.create(types);
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

	describe("Circular Group Detection", () => {
		it("finds empty groups for simple parsed file", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile();

			const groups = PreferTypeAlias.findGroups(parsedFile, scope);

			expect(groups.size).toBe(0);
		});

		it("finds groups for type aliases", () => {
			const scope = createMockScope();
			const stringType = createTypeRef("string");
			const alias = createMockTypeAlias("SimpleAlias", stringType);
			const parsedFile = createMockParsedFile(IArray.apply(alias as any));

			const groups = PreferTypeAlias.findGroups(parsedFile, scope);

			// Should not find circular groups for simple type aliases
			expect(groups.size).toBe(0);
		});

		it("handles nested containers", () => {
			const scope = createMockScope();
			const stringType = createTypeRef("string");
			const alias = createMockTypeAlias("NestedAlias", stringType);
			const parsedFile = createMockParsedFile(IArray.apply(alias as any));

			const groups = PreferTypeAlias.findGroups(parsedFile, scope);

			expect(groups.size).toBe(0);
		});
	});

	describe("Break Circular Groups", () => {
		it("handles empty groups", () => {
			const groups = new Set<any>();
			const preferredRewrites = new Set<any>();

			const rewrites = PreferTypeAlias.breakCircularGroups(groups, preferredRewrites);

			expect(rewrites.length).toBe(0);
		});

		it("breaks single group with preferred rewrite", () => {
			const typeRef1 = createTypeRef("Type1");
			const typeRef2 = createTypeRef("Type2");
			const group = { typeRefs: [typeRef1, typeRef2] };
			const groups = new Set([group]);
			const preferredRewrites = new Set([typeRef1.name]);

			const rewrites = PreferTypeAlias.breakCircularGroups(groups, preferredRewrites);

			expect(rewrites.length).toBe(1);
			expect(rewrites[0].target).toBe(typeRef1.name);
			expect(rewrites[0].circular.has(typeRef1.name)).toBe(true);
			expect(rewrites[0].circular.has(typeRef2.name)).toBe(true);
		});

		it("breaks single group without preferred rewrite", () => {
			const typeRef1 = createTypeRef("Type1");
			const typeRef2 = createTypeRef("Type2");
			const group = { typeRefs: [typeRef1, typeRef2] };
			const groups = new Set([group]);
			const preferredRewrites = new Set<any>();

			const rewrites = PreferTypeAlias.breakCircularGroups(groups, preferredRewrites);

			expect(rewrites.length).toBe(1);
			// Should pick one of the types (most frequent or first)
			expect(rewrites[0].circular.size).toBe(2);
		});

		it("breaks multiple groups", () => {
			const typeRef1 = createTypeRef("Type1");
			const typeRef2 = createTypeRef("Type2");
			const typeRef3 = createTypeRef("Type3");
			const typeRef4 = createTypeRef("Type4");

			const group1 = { typeRefs: [typeRef1, typeRef2] };
			const group2 = { typeRefs: [typeRef3, typeRef4] };
			const groups = new Set([group1, group2]);
			const preferredRewrites = new Set<any>();

			const rewrites = PreferTypeAlias.breakCircularGroups(groups, preferredRewrites);

			expect(rewrites.length).toBe(2);
		});
	});

	describe("Type Arguments Conversion", () => {
		it("converts empty type parameters", () => {
			const tparams = IArray.Empty;

			const result = PreferTypeAlias.asTypeArgs(tparams);

			expect(result.length).toBe(0);
		});

		it("converts type parameters to type arguments", () => {
			const tparam1 = { name: createSimpleIdent("T") };
			const tparam2 = { name: createSimpleIdent("U") };
			const tparams = IArray.apply(tparam1, tparam2);

			const result = PreferTypeAlias.asTypeArgs(tparams);

			expect(result.length).toBe(2);
			expect(result.apply(0)._tag).toBe("TsTypeRef");
			expect(result.apply(1)._tag).toBe("TsTypeRef");
		});
	});

	describe("Integration Tests", () => {
		it("applies full transformation pipeline", () => {
			const scope = createMockScope();

			// Create a mix of interfaces and type aliases
			const callSig = createFunSig();
			const callMember = createMemberCall(callSig);
			const functionInterface = createMockInterface("FunctionInterface", IArray.apply(callMember as TsMember));

			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const objectType = createTypeObject(IArray.apply(propMember as TsMember));
			const objectAlias = createMockTypeAlias("ObjectAlias", objectType);

			const parsedFile = createMockParsedFile(IArray.apply(functionInterface as any, objectAlias as any));

			const result = PreferTypeAlias.apply(parsedFile, scope);

			expect(result.members.length).toBe(2);

			// Function interface should be converted to type alias
			const firstMember = result.members.apply(0);
			expect(firstMember._tag).toBe("TsDeclTypeAlias");

			// Object alias should be converted to interface
			const secondMember = result.members.apply(1);
			expect(secondMember._tag).toBe("TsDeclInterface");
		});

		it("preserves non-convertible declarations", () => {
			const scope = createMockScope();

			// Create interface with inheritance (should not be converted)
			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const inheritance = IArray.apply(createTypeRef("BaseInterface"));
			const derivedInterface = createMockInterface("DerivedInterface", IArray.apply(propMember as TsMember), inheritance);

			// Create non-object type alias (should not be converted)
			const stringAlias = createMockTypeAlias("StringAlias", createTypeRef("string"));

			const parsedFile = createMockParsedFile(IArray.apply(derivedInterface as any, stringAlias as any));

			const result = PreferTypeAlias.apply(parsedFile, scope);

			expect(result.members.length).toBe(2);

			// Both should remain unchanged
			expect(result.members.apply(0)._tag).toBe("TsDeclInterface");
			expect(result.members.apply(1)._tag).toBe("TsDeclTypeAlias");
		});
	});

	describe("AvoidCircularVisitor", () => {
		it("creates visitor with correct map from rewrites", () => {
			const rewrite1: Rewrite = {
				target: createQIdent("test-lib", "Type1"),
				circular: new Set([createQIdent("test-lib", "Type2"), createQIdent("test-lib", "Type3")])
			};
			const rewrite2: Rewrite = {
				target: createQIdent("test-lib", "Type4"),
				circular: new Set([createQIdent("test-lib", "Type4")])
			};

			// Create visitor with rewrites
			const visitor = new AvoidCircularVisitor([rewrite1, rewrite2]);

			expect(visitor).toBeDefined();
			// Note: map is private, so we can't test it directly
			// Instead we test the behavior through the public interface
		});

		it("rewrites type alias with object type to interface", () => {
			const scope = createMockScope();
			const rewrite: Rewrite = {
				target: createQIdent("test-lib", "CircularType"),
				circular: new Set([createQIdent("test-lib", "CircularType"), createQIdent("test-lib", "OtherType")])
			};

			const visitor = new AvoidCircularVisitor([rewrite]);

			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const objectType = createTypeObject(IArray.apply(propMember as TsMember));
			const typeAlias = createMockTypeAlias("CircularType", objectType);
			// Set the codePath to match the rewrite target
			const aliasWithPath = {
				...typeAlias,
				codePath: {
					forceHasPath: () => ({ codePath: createQIdent("test-lib", "CircularType") })
				}
			};

			const result = visitor.enterTsDecl(scope)(aliasWithPath);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("CircularType");
			expect(resultInterface.members.length).toBe(1);
			expect(resultInterface.comments.rawCs.length).toBeGreaterThan(0);
			expect(resultInterface.comments.rawCs[0]).toContain("NOTE: Rewritten from type alias");
		});

		it("rewrites type alias with function type to interface with call signature", () => {
			const scope = createMockScope();
			const rewrite: Rewrite = {
				target: createQIdent("test-lib", "FunctionType"),
				circular: new Set([createQIdent("test-lib", "FunctionType")])
			};

			const visitor = new AvoidCircularVisitor([rewrite]);

			const funSig = createFunSig(
				IArray.apply(createFunParam("x", createTypeRef("number"))),
				createTypeRef("string")
			);
			const functionType = createTypeFunction(funSig);
			const typeAlias = createMockTypeAlias("FunctionType", functionType);
			const aliasWithPath = {
				...typeAlias,
				codePath: {
					forceHasPath: () => ({ codePath: createQIdent("test-lib", "FunctionType") })
				}
			};

			const result = visitor.enterTsDecl(scope)(aliasWithPath);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("FunctionType");
			expect(resultInterface.members.length).toBe(1);
			expect(resultInterface.members.apply(0)._tag).toBe("TsMemberCall");
		});

		it("rewrites type alias with type reference to interface with inheritance", () => {
			const scope = createMockScope();
			const rewrite: Rewrite = {
				target: createQIdent("test-lib", "AliasType"),
				circular: new Set([createQIdent("test-lib", "AliasType")])
			};

			const visitor = new AvoidCircularVisitor([rewrite]);

			const typeRef = createTypeRef("BaseType");
			const typeAlias = createMockTypeAlias("AliasType", typeRef);
			const aliasWithPath = {
				...typeAlias,
				codePath: {
					forceHasPath: () => ({ codePath: createQIdent("test-lib", "AliasType") })
				}
			};

			const result = visitor.enterTsDecl(scope)(aliasWithPath);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("AliasType");
			expect(resultInterface.inheritance.length).toBe(1);
			expect(resultInterface.inheritance.apply(0)._tag).toBe("TsTypeRef");
			expect(resultInterface.members.length).toBe(0);
		});

		it("rewrites interface by applying type replacement", () => {
			const scope = createMockScope();
			const rewrite: Rewrite = {
				target: createQIdent("test-lib", "CircularInterface"),
				circular: new Set([createQIdent("test-lib", "CircularInterface")])
			};

			const visitor = new AvoidCircularVisitor([rewrite]);

			const propMember = createMemberProperty("prop", createTypeRef("string"));
			const interface_ = createMockInterface("CircularInterface", IArray.apply(propMember as TsMember));
			const interfaceWithPath = {
				...interface_,
				codePath: {
					forceHasPath: () => ({ codePath: createQIdent("test-lib", "CircularInterface") })
				}
			};

			const result = visitor.enterTsDecl(scope)(interfaceWithPath);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("CircularInterface");
			expect(resultInterface.members.length).toBe(1); // Original members preserved
		});

		it("leaves non-circular declarations unchanged", () => {
			const scope = createMockScope();
			const rewrite: Rewrite = {
				target: createQIdent("test-lib", "CircularType"),
				circular: new Set([createQIdent("test-lib", "CircularType")])
			};

			const visitor = new AvoidCircularVisitor([rewrite]);

			const regularAlias = createMockTypeAlias("RegularType", createTypeRef("string"));
			const aliasWithPath = {
				...regularAlias,
				codePath: {
					forceHasPath: () => ({ codePath: createQIdent("test-lib", "RegularType") })
				}
			};

			const result = visitor.enterTsDecl(scope)(aliasWithPath);

			expect(result).toBe(aliasWithPath); // Should be unchanged
		});

		it("handles intersection types with all type references", () => {
			const scope = createMockScope();
			const rewrite: Rewrite = {
				target: createQIdent("test-lib", "IntersectionType"),
				circular: new Set([createQIdent("test-lib", "IntersectionType")])
			};

			const visitor = new AvoidCircularVisitor([rewrite]);

			const typeRef1 = createTypeRef("Type1");
			const typeRef2 = createTypeRef("Type2");
			const intersectionType = createTypeIntersect(IArray.apply<TsType>(typeRef1, typeRef2));
			const typeAlias = createMockTypeAlias("IntersectionType", intersectionType);
			const aliasWithPath = {
				...typeAlias,
				codePath: {
					forceHasPath: () => ({ codePath: createQIdent("test-lib", "IntersectionType") })
				}
			};

			const result = visitor.enterTsDecl(scope)(aliasWithPath);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("IntersectionType");
			expect(resultInterface.inheritance.length).toBe(2);
			expect(resultInterface.members.length).toBe(0);
		});

		it("includes circular group information in rewrite comment", () => {
			const scope = createMockScope();
			const rewrite: Rewrite = {
				target: createQIdent("test-lib", "CircularType"),
				circular: new Set([
					createQIdent("test-lib", "CircularType"),
					createQIdent("test-lib", "OtherType"),
					createQIdent("test-lib", "ThirdType")
				])
			};

			const visitor = new AvoidCircularVisitor([rewrite]);

			const objectType = createTypeObject(IArray.Empty);
			const typeAlias = createMockTypeAlias("CircularType", objectType);
			const aliasWithPath = {
				...typeAlias,
				codePath: {
					forceHasPath: () => ({ codePath: createQIdent("test-lib", "CircularType") })
				}
			};

			const result = visitor.enterTsDecl(scope)(aliasWithPath);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			const commentText = resultInterface.comments.rawCs.join("");
			expect(commentText).toContain("NOTE: Rewritten from type alias");
			expect(commentText).toContain("to avoid circular code involving");
			expect(commentText).toContain("CircularType");
			expect(commentText).toContain("OtherType");
			expect(commentText).toContain("ThirdType");
		});
	});
});
