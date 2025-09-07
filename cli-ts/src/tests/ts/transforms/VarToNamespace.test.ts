/**
 * TypeScript port of VarToNamespaceTests.scala
 *
 * Tests for the VarToNamespace transform that converts variable declarations
 * with object types into namespace declarations.
 */

import { none, type Option, some } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { NoComments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { Hoisting } from "@/internal/ts/Hoisting.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import { VarToNamespaceTransform } from "@/internal/ts/transforms/VarToNamespace.js";
import {
	MethodType,
	TsDeclClass,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclNamespace,
	TsDeclVar,
	type TsExpr,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	TsMemberFunction,
	TsMemberProperty,
	TsParsedFile,
	TsProtectionLevel,
	TsQIdent,
	type TsType,
	TsTypeObject,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// ============================================================================
// Helper Functions for Creating Test Data
// ============================================================================

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]): TsQIdent {
	const identParts = parts.map((part) => createSimpleIdent(part));
	return TsQIdent.of(...identParts);
}

function createTypeRef(
	name: string,
	tparams: IArray<TsType> = IArray.Empty,
): TsTypeRef {
	return TsTypeRef.create(NoComments.instance, createQIdent(name), tparams);
}

function createMemberProperty(
	name: string,
	tpe: Option<TsType> = none,
	isStatic: boolean = false,
	isReadOnly: boolean = false,
): TsMemberProperty {
	return TsMemberProperty.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		tpe,
		none, // expr
		isStatic,
		isReadOnly,
	);
}

function createMemberFunction(
	name: string,
	signature: TsFunSig,
	isStatic: boolean = false,
): TsMemberFunction {
	return TsMemberFunction.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		MethodType.normal(),
		signature,
		isStatic,
		false, // isReadOnly
	);
}

function createFunSig(
	params: IArray<any> = IArray.Empty,
	ret: Option<TsType> = none,
): TsFunSig {
	return TsFunSig.create(
		NoComments.instance,
		IArray.Empty, // tparams
		params,
		ret,
	);
}

function createObjectType(members: IArray<any> = IArray.Empty): TsTypeObject {
	return TsTypeObject.create(NoComments.instance, members);
}

function createMockVar(
	name: string,
	tpe: Option<TsType> = none,
	expr: Option<TsExpr> = none,
	declared: boolean = false,
	readOnly: boolean = false,
	jsLocation: JsLocation = JsLocation.zero(),
	codePath: CodePath = CodePath.noPath(),
): TsDeclVar {
	const actualCodePath =
		codePath._tag === "NoPath"
			? CodePath.hasPath(createSimpleIdent("test-lib"), createQIdent(name))
			: codePath;

	return TsDeclVar.create(
		NoComments.instance,
		declared,
		readOnly,
		createSimpleIdent(name),
		tpe,
		expr,
		jsLocation,
		actualCodePath,
	);
}

function createMockScope(
	declarations: any[] = [],
	logger: Logger<void> = Logger.DevNull(),
): TsTreeScope {
	const libName = TsIdent.librarySimple("test-lib");
	const parsedFile = TsParsedFile.create(
		NoComments.instance,
		IArray.Empty, // directives
		IArray.fromArray(declarations),
		CodePath.noPath(),
	);
	const deps = new Map();
	return TsTreeScope.create(libName, false, deps, logger)["/"](parsedFile);
}

// ============================================================================
// Test Suite
// ============================================================================

describe("VarToNamespace", () => {
	describe("Basic Functionality", () => {
		test("extends TreeTransformationScopedChanges", () => {
			expect(VarToNamespaceTransform).toBeInstanceOf(
				TreeTransformationScopedChanges,
			);
		});

		test("has enterTsDecl method", () => {
			const scope = createMockScope([]);
			const variable = createMockVar("TestVar");
			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);
			expect(result).toBeDefined();
			expect(result._tag).toBeDefined();
		});
	});

	describe("Variable to Namespace Conversion", () => {
		test("converts variable with object type to namespace", () => {
			const prop1 = createMemberProperty(
				"prop1",
				some(createTypeRef("string")),
			);
			const prop2 = createMemberProperty(
				"prop2",
				some(createTypeRef("number")),
			);
			const objectType = createObjectType(IArray.fromArray([prop1, prop2]));

			const variable = createMockVar("TestNamespace", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.name.value).toBe("TestNamespace");
			expect(namespace.declared).toBe(false);
			expect(namespace.members.length).toBe(2);
		});

		test("converts declared variable with object type to declared namespace", () => {
			const prop = createMemberProperty("value", some(createTypeRef("string")));
			const objectType = createObjectType(IArray.fromArray([prop]));

			const variable = createMockVar(
				"DeclaredNamespace",
				some(objectType),
				none,
				true, // declared
			);
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.name.value).toBe("DeclaredNamespace");
			expect(namespace.declared).toBe(true);
			expect(namespace.members.length).toBe(1);
		});

		test("preserves jsLocation and codePath", () => {
			const prop = createMemberProperty("prop", some(createTypeRef("string")));
			const objectType = createObjectType(IArray.fromArray([prop]));
			const jsLocation = JsLocation.global(createQIdent("custom", "location"));
			const codePath = CodePath.hasPath(
				createSimpleIdent("custom-lib"),
				createQIdent("CustomNamespace"),
			);

			const variable = createMockVar(
				"CustomNamespace",
				some(objectType),
				none,
				false,
				false,
				jsLocation,
				codePath,
			);
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.jsLocation).toBe(jsLocation);
			expect(namespace.codePath).toBe(codePath);
		});
	});

	describe("Non-Convertible Variables", () => {
		test("preserves variable without type", () => {
			const variable = createMockVar("NoTypeVar", none);
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclVar");
			expect(result).toBe(variable);
		});

		test("preserves variable with non-object type", () => {
			const variable = createMockVar(
				"StringVar",
				some(createTypeRef("string")),
			);
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclVar");
			expect(result).toBe(variable);
		});

		test("preserves variable with initializer expression", () => {
			const objectType = createObjectType(IArray.Empty);
			const variable = createMockVar(
				"InitializedVar",
				some(objectType),
				some({} as TsExpr), // Mock expression
			);
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclVar");
			expect(result).toBe(variable);
		});
	});

	describe("Member Hoisting", () => {
		test("hoists property members to variable declarations", () => {
			const prop1 = createMemberProperty(
				"stringProp",
				some(createTypeRef("string")),
			);
			const prop2 = createMemberProperty(
				"numberProp",
				some(createTypeRef("number")),
			);
			const prop3 = createMemberProperty(
				"booleanProp",
				some(createTypeRef("boolean")),
			);
			const objectType = createObjectType(
				IArray.fromArray([prop1, prop2, prop3]),
			);

			const variable = createMockVar("PropsNamespace", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.members.length).toBe(3);

			const hoistedVars = namespace.members.filter(
				(m: any) => m._tag === "TsDeclVar",
			);
			expect(hoistedVars.length).toBe(3);

			const varNames = hoistedVars.map((v: any) => v.name.value);
			expect(new Set(varNames)).toEqual(
				new Set(["stringProp", "numberProp", "booleanProp"]),
			);
		});

		test("hoists function members to function declarations", () => {
			const func1 = createMemberFunction(
				"func1",
				createFunSig(IArray.Empty, some(createTypeRef("string"))),
			);
			const func2 = createMemberFunction(
				"func2",
				createFunSig(IArray.Empty, some(createTypeRef("number"))),
			);
			const objectType = createObjectType(IArray.fromArray([func1, func2]));

			const variable = createMockVar("FuncsNamespace", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.members.length).toBe(2);

			const hoistedFuncs = namespace.members.filter(
				(m: any) => m._tag === "TsDeclFunction",
			);
			expect(hoistedFuncs.length).toBe(2);

			const funcNames = hoistedFuncs.map((f: any) => f.name.value);
			expect(new Set(funcNames)).toEqual(new Set(["func1", "func2"]));
		});

		test("hoists mixed members correctly", () => {
			const prop = createMemberProperty("prop", some(createTypeRef("string")));
			const func = createMemberFunction(
				"func",
				createFunSig(IArray.Empty, some(createTypeRef("number"))),
			);
			const objectType = createObjectType(IArray.fromArray([prop, func]));

			const variable = createMockVar("MixedNamespace", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.members.length).toBe(2);

			const hoistedVars = namespace.members.filter(
				(m: any) => m._tag === "TsDeclVar",
			);
			const hoistedFuncs = namespace.members.filter(
				(m: any) => m._tag === "TsDeclFunction",
			);
			expect(hoistedVars.length).toBe(1);
			expect(hoistedFuncs.length).toBe(1);
			expect((hoistedVars.get(0) as any).name.value).toBe("prop");
			expect((hoistedFuncs.get(0) as any).name.value).toBe("func");
		});

		test("handles empty object type", () => {
			const objectType = createObjectType(IArray.Empty);
			const variable = createMockVar("EmptyNamespace", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.members.length).toBe(0);
		});
	});

	describe("Non-Variable Declarations", () => {
		test("preserves interface declarations unchanged", () => {
			const interface_ = TsDeclInterface.create(
				NoComments.instance,
				false,
				createSimpleIdent("TestInterface"),
				IArray.Empty,
				IArray.Empty,
				IArray.Empty,
				CodePath.hasPath(
					createSimpleIdent("test-lib"),
					createQIdent("TestInterface"),
				),
			);
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(interface_);

			expect(result._tag).toBe("TsDeclInterface");
			expect(result).toBe(interface_);
		});

		test("preserves function declarations unchanged", () => {
			const func = TsDeclFunction.create(
				NoComments.instance,
				false,
				createSimpleIdent("TestFunction"),
				createFunSig(IArray.Empty, some(createTypeRef("void"))),
				JsLocation.zero(),
				CodePath.hasPath(
					createSimpleIdent("test-lib"),
					createQIdent("TestFunction"),
				),
			);
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(func);

			expect(result._tag).toBe("TsDeclFunction");
			expect(result).toBe(func);
		});

		test("preserves class declarations unchanged", () => {
			const clazz = TsDeclClass.create(
				NoComments.instance,
				false,
				false,
				createSimpleIdent("TestClass"),
				IArray.Empty,
				none,
				IArray.Empty,
				IArray.Empty,
				JsLocation.zero(),
				CodePath.hasPath(
					createSimpleIdent("test-lib"),
					createQIdent("TestClass"),
				),
			);
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(clazz);

			expect(result._tag).toBe("TsDeclClass");
			expect(result).toBe(clazz);
		});

		test("preserves namespace declarations unchanged", () => {
			const namespace = TsDeclNamespace.create(
				NoComments.instance,
				false,
				createSimpleIdent("ExistingNamespace"),
				IArray.Empty,
				CodePath.hasPath(
					createSimpleIdent("test-lib"),
					createQIdent("ExistingNamespace"),
				),
				JsLocation.zero(),
			);
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(namespace);

			expect(result._tag).toBe("TsDeclNamespace");
			expect(result).toBe(namespace);
		});
	});

	describe("Edge Cases", () => {
		test("handles variable with complex object type", () => {
			const nestedProp = createMemberProperty(
				"nested",
				some(createTypeRef("string")),
			);
			const nestedObj = createObjectType(IArray.fromArray([nestedProp]));
			const complexProp = createMemberProperty("complex", some(nestedObj));
			const objectType = createObjectType(IArray.fromArray([complexProp]));

			const variable = createMockVar("ComplexNamespace", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.members.length).toBe(1);

			const hoistedVar = namespace.members.get(0) as any;
			expect(hoistedVar._tag).toBe("TsDeclVar");
			expect(hoistedVar.name.value).toBe("complex");
		});

		test("handles variable with static and instance members", () => {
			const instanceProp = createMemberProperty(
				"instanceProp",
				some(createTypeRef("string")),
				false, // isStatic
			);
			const staticProp = createMemberProperty(
				"staticProp",
				some(createTypeRef("number")),
				true, // isStatic
			);
			const objectType = createObjectType(
				IArray.fromArray([instanceProp, staticProp]),
			);

			const variable = createMockVar("StaticNamespace", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.members.length).toBe(2);

			const hoistedVars = namespace.members.filter(
				(m: any) => m._tag === "TsDeclVar",
			);
			expect(hoistedVars.length).toBe(2);

			const varNames = hoistedVars.map((v: any) => v.name.value);
			expect(new Set(varNames)).toEqual(
				new Set(["instanceProp", "staticProp"]),
			);
		});

		test("handles variable with readonly members", () => {
			const readonlyProp = createMemberProperty(
				"readonlyProp",
				some(createTypeRef("string")),
				false, // isStatic
				true, // isReadOnly
			);
			const normalProp = createMemberProperty(
				"normalProp",
				some(createTypeRef("number")),
				false, // isStatic
				false, // isReadOnly
			);
			const objectType = createObjectType(
				IArray.fromArray([readonlyProp, normalProp]),
			);

			const variable = createMockVar("ReadonlyNamespace", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.members.length).toBe(2);

			const hoistedVars = namespace.members.filter(
				(m: any) => m._tag === "TsDeclVar",
			);
			expect(hoistedVars.length).toBe(2);

			const varNames = hoistedVars.map((v: any) => v.name.value);
			expect(new Set(varNames)).toEqual(
				new Set(["readonlyProp", "normalProp"]),
			);

			// Check that readonly property is preserved
			const readonlyVar = hoistedVars.find(
				(v: any) => v.name.value === "readonlyProp",
			) as any;
			expect(readonlyVar.readOnly).toBe(true);

			const normalVar = hoistedVars.find(
				(v: any) => v.name.value === "normalProp",
			) as any;
			expect(normalVar.readOnly).toBe(false);
		});
	});

	describe("Real-World Patterns", () => {
		test("handles jQuery-like namespace pattern", () => {
			const fn = createMemberFunction(
				"fn",
				createFunSig(IArray.Empty, some(createTypeRef("JQuery"))),
			);
			const extend = createMemberFunction(
				"extend",
				createFunSig(IArray.Empty, some(createTypeRef("any"))),
			);
			const version = createMemberProperty(
				"version",
				some(createTypeRef("string")),
			);
			const objectType = createObjectType(
				IArray.fromArray([fn, extend, version]),
			);

			const variable = createMockVar("jQuery", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.name.value).toBe("jQuery");
			expect(namespace.members.length).toBe(3);

			const functions = namespace.members.filter(
				(m: any) => m._tag === "TsDeclFunction",
			);
			const variables = namespace.members.filter(
				(m: any) => m._tag === "TsDeclVar",
			);
			expect(functions.length).toBe(2);
			expect(variables.length).toBe(1);

			const funcNames = functions.map((f: any) => f.name.value);
			const varNames = variables.map((v: any) => v.name.value);
			expect(new Set(funcNames)).toEqual(new Set(["fn", "extend"]));
			expect(new Set(varNames)).toEqual(new Set(["version"]));
		});

		test("handles configuration object pattern", () => {
			const host = createMemberProperty("host", some(createTypeRef("string")));
			const port = createMemberProperty("port", some(createTypeRef("number")));
			const ssl = createMemberProperty("ssl", some(createTypeRef("boolean")));
			const objectType = createObjectType(IArray.fromArray([host, port, ssl]));

			const variable = createMockVar("Config", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.name.value).toBe("Config");
			expect(namespace.members.length).toBe(3);

			const variables = namespace.members.filter(
				(m: any) => m._tag === "TsDeclVar",
			);
			expect(variables.length).toBe(3);

			const varNames = variables.map((v: any) => v.name.value);
			expect(new Set(varNames)).toEqual(new Set(["host", "port", "ssl"]));
		});

		test("handles API client pattern", () => {
			const get = createMemberFunction(
				"get",
				createFunSig(IArray.Empty, some(createTypeRef("Promise"))),
			);
			const post = createMemberFunction(
				"post",
				createFunSig(IArray.Empty, some(createTypeRef("Promise"))),
			);
			const baseURL = createMemberProperty(
				"baseURL",
				some(createTypeRef("string")),
			);
			const timeout = createMemberProperty(
				"timeout",
				some(createTypeRef("number")),
			);
			const objectType = createObjectType(
				IArray.fromArray([get, post, baseURL, timeout]),
			);

			const variable = createMockVar("ApiClient", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;
			expect(namespace.name.value).toBe("ApiClient");
			expect(namespace.members.length).toBe(4);

			const functions = namespace.members.filter(
				(m: any) => m._tag === "TsDeclFunction",
			);
			const variables = namespace.members.filter(
				(m: any) => m._tag === "TsDeclVar",
			);
			expect(functions.length).toBe(2);
			expect(variables.length).toBe(2);

			const funcNames = functions.map((f: any) => f.name.value);
			const varNames = variables.map((v: any) => v.name.value);
			expect(new Set(funcNames)).toEqual(new Set(["get", "post"]));
			expect(new Set(varNames)).toEqual(new Set(["baseURL", "timeout"]));
		});
	});

	describe("Integration", () => {
		test("works with other transforms", () => {
			const prop = createMemberProperty("value", some(createTypeRef("string")));
			const objectType = createObjectType(IArray.fromArray([prop]));
			const variable = createMockVar("IntegrationTest", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;

			// Verify namespace properties for integration with other transforms
			expect(namespace.name.value).toBe("IntegrationTest");
			expect(namespace.declared).toBe(false);
			expect(namespace.members.length).toBe(1);
			expect(namespace.jsLocation).toEqual(JsLocation.zero());
			expect(namespace.codePath._tag).toBe("HasPath");
		});

		test("preserves structure for further processing", () => {
			const func = createMemberFunction(
				"method",
				createFunSig(IArray.Empty, some(createTypeRef("void"))),
			);
			const objectType = createObjectType(IArray.fromArray([func]));
			const variable = createMockVar("ProcessingTest", some(objectType));
			const scope = createMockScope([]);

			const result = VarToNamespaceTransform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclNamespace");
			const namespace = result as TsDeclNamespace;

			// Verify the hoisted function is properly structured
			const hoistedFunc = namespace.members.get(0) as any;
			expect(hoistedFunc._tag).toBe("TsDeclFunction");
			expect(hoistedFunc.name.value).toBe("method");
			expect(hoistedFunc.signature.resultType._tag).toBe("Some");
			expect(hoistedFunc.declared).toBe(Hoisting.declared);
		});
	});
});
