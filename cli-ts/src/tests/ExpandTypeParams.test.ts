/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ExpandTypeParamsTests
 *
 * Tests for the ExpandTypeParams transform that expands type parameters in function signatures.
 */

import { describe, expect, it } from "bun:test";
import { isSome, none, some } from "fp-ts/Option";
import { Comments, NoComments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { MethodType } from "@/internal/ts/MethodType.js";
import { ExpandTypeParams } from "@/internal/ts/transforms/ExpandTypeParams.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import {
	type TsDecl,
	type TsDeclFunction,
	type TsDeclInterface,
	TsIdent,
	type TsIdentSimple,
	TsLiteral,
	type TsMember,
	type TsMemberCall,
	type TsMemberFunction,
	type TsMemberProperty,
	TsParsedFile,
	TsProtectionLevel,
	TsQIdent,
	type TsType,
	type TsTypeKeyOf,
	TsTypeLiteral,
	type TsTypeLookup,
	TsTypeRef,
	type TsTypeUnion,
	type TsFunParam,
	type TsFunSig,
	type TsTypeParam,
} from "@/internal/ts/trees.js";
import { createMockScope, createCommentsWithRaw } from "@/tests/utils/TestUtils.js";

describe("ExpandTypeParams", () => {
	// Helper methods for creating test data
	function createSimpleIdent(name: string): TsIdentSimple {
		return TsIdent.simple(name);
	}

	function createQIdent(name: string): TsQIdent {
		return TsQIdent.of(createSimpleIdent(name));
	}

	function createTypeRef(name: string, tparams: IArray<TsType> = IArray.Empty): TsTypeRef {
		return TsTypeRef.create(NoComments.instance, createQIdent(name), tparams);
	}

	function createTypeParam(
		name: string,
		upperBound?: TsType,
		defaultType?: TsType
	): TsTypeParam {
		return {
			_tag: "TsTypeParam",
			comments: NoComments.instance,
			name: createSimpleIdent(name),
			upperBound: upperBound ? some(upperBound) : none,
			default: defaultType ? some(defaultType) : none,
			asString: name,
			withComments: function(comments: Comments) { return { ...this, comments }; },
			addComment: function(comment: any) { return this.withComments(this.comments.add(comment)); },
		};
	}

	function createFunParam(name: string, tpe?: TsType): TsFunParam {
		return {
			_tag: "TsFunParam",
			comments: NoComments.instance,
			name: createSimpleIdent(name),
			tpe: tpe ? some(tpe) : some(TsTypeRef.string),
			asString: `${name}: ${tpe?.asString || "string"}`,
			withComments: function(comments: Comments) { return { ...this, comments }; },
			addComment: function(comment: any) { return this.withComments(this.comments.add(comment)); },
			equals: function(other: TsFunParam) { return this.name.value === other.name.value; },
		};
	}

	function createFunSig(
		tparams: IArray<TsTypeParam> = IArray.Empty,
		params: IArray<TsFunParam> = IArray.Empty,
		resultType?: TsType
	): TsFunSig {
		return {
			_tag: "TsFunSig",
			comments: NoComments.instance,
			tparams,
			params,
			resultType: resultType ? some(resultType) : some(TsTypeRef.void),
			asString: "function signature",
			withComments: function(comments: Comments) { return { ...this, comments }; },
			addComment: function(comment: any) { return this.withComments(this.comments.add(comment)); },
		};
	}

	function createMockCall(signature: TsFunSig): TsMemberCall {
		return {
			_tag: "TsMemberCall",
			comments: NoComments.instance,
			level: TsProtectionLevel.default(),
			signature,
			asString: "call signature",
			withComments: function(comments: Comments) { return { ...this, comments }; },
			addComment: function(comment: any) { return this.withComments(this.comments.add(comment)); },
		};
	}

	function createMockFunction(name: string, signature: TsFunSig): TsMemberFunction {
		return {
			_tag: "TsMemberFunction",
			comments: NoComments.instance,
			level: TsProtectionLevel.default(),
			name: createSimpleIdent(name),
			methodType: MethodType.normal(),
			signature,
			isStatic: false,
			isReadOnly: false,
			asString: `function ${name}`,
			withComments: function(comments: Comments) { return { ...this, comments }; },
			addComment: function(comment: any) { return this.withComments(this.comments.add(comment)); },
		};
	}

	function createMockDeclFunction(name: string, signature: TsFunSig): TsDeclFunction {
		return {
			_tag: "TsDeclFunction",
			comments: NoComments.instance,
			declared: false,
			name: createSimpleIdent(name),
			signature,
			jsLocation: JsLocation.zero(),
			codePath: CodePath.noPath(),
			asString: `declare function ${name}`,
			withComments: function(comments: Comments) { return { ...this, comments }; },
			addComment: function(comment: any) { return this.withComments(this.comments.add(comment)); },
			withCodePath: function(codePath: any) { return { ...this, codePath }; },
			withJsLocation: function(jsLocation: any) { return { ...this, jsLocation }; },
			withName: function(name: TsIdentSimple) { return { ...this, name }; },
		};
	}

	function createMockProperty(name: string, tpe?: TsType): TsMemberProperty {
		return {
			_tag: "TsMemberProperty",
			comments: NoComments.instance,
			level: TsProtectionLevel.default(),
			name: createSimpleIdent(name),
			tpe: tpe ? some(tpe) : some(TsTypeRef.string),
			expr: none,
			isStatic: false,
			isReadOnly: false,
			asString: `${name}: ${tpe?.asString || "string"}`,
			withComments: function(comments: Comments) { return { ...this, comments }; },
			addComment: function(comment: any) { return this.withComments(this.comments.add(comment)); },
		};
	}

	function createMockInterface(name: string, members: IArray<TsMember> = IArray.Empty): TsDeclInterface {
		return {
			_tag: "TsDeclInterface",
			comments: NoComments.instance,
			declared: false,
			name: createSimpleIdent(name),
			tparams: IArray.Empty,
			inheritance: IArray.Empty,
			members,
			membersByName: new Map(),
			unnamed: IArray.Empty,
			codePath: CodePath.noPath(),
			asString: `interface ${name}`,
			withComments: function(comments: Comments) { return { ...this, comments }; },
			addComment: function(comment: any) { return this.withComments(this.comments.add(comment)); },
			withCodePath: function(codePath: any) { return { ...this, codePath }; },
			withName: function(name: TsIdentSimple) { return { ...this, name }; },
		};
	}

	describe("Basic Functionality", () => {
		it("extends TransformMembers and TransformClassMembers", () => {
			const transform = ExpandTypeParams.instance;
			expect(transform).toBeDefined();
			expect(typeof transform.newMembers).toBe("function");
			expect(typeof transform.newClassMembers).toBe("function");
		});

		it("has newClassMembers method", () => {
			const scope = createMockScope();
			const interface_ = createMockInterface("test");
			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);
			expect(result).toBeDefined();
		});

		it("has newMembers method", () => {
			const scope = createMockScope();
			const parsedFile = TsParsedFile.create(NoComments.instance, IArray.Empty, IArray.Empty, CodePath.noPath());
			const result = ExpandTypeParams.instance.newMembers(scope, parsedFile);
			expect(result).toBeDefined();
		});

		it("leaves non-expandable members unchanged", () => {
			const scope = createMockScope();
			const sig = createFunSig();
			const method = createMockFunction("testMethod", sig);
			const interface_ = createMockInterface("test", IArray.fromArray([method as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.contains(method)).toBe(true);
		});
	});

	describe("KeyOf Expansion", () => {
		it("expands keyof type parameters", () => {
			const propA = createMockProperty("a", TsTypeRef.number);
			const propB = createMockProperty("b", TsTypeRef.string);
			const targetInterface = createMockInterface("Target", IArray.fromArray([propA as TsMember, propB as TsMember]));
			const scope = createMockScope("test-lib", targetInterface);

			const keyOfBound: TsTypeKeyOf = {
				_tag: "TsTypeKeyOf",
				key: createTypeRef("Target"),
				asString: "keyof Target",
			};
			const typeParam = createTypeParam("K", keyOfBound);
			const param1 = createFunParam("key", createTypeRef("K"));
			const lookupType: TsTypeLookup = {
				_tag: "TsTypeLookup",
				from: createTypeRef("Target"),
				key: createTypeRef("K"),
				asString: "Target[K]",
			};
			const param2 = createFunParam("value", lookupType);
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param1, param2]), TsTypeRef.void);
			const method = createMockFunction("testMethod", sig);
			const interface_ = createMockInterface("test", IArray.fromArray([method as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			// Should expand into multiple methods for each property
			expect(result.length).toBeGreaterThan(1);
			expect(result.forall(m => m._tag === "TsMemberFunction")).toBe(true);

			const methods = result.map(m => m as TsMemberFunction);
			expect(methods.forall(m => (m.name as TsIdentSimple).value === "testMethod")).toBe(true);
			expect(methods.forall(m => m.signature.tparams.isEmpty)).toBe(true); // Type parameters should be removed
		});

		it("handles keyof with type lookup", () => {
			const propName = createMockProperty("name", TsTypeRef.string);
			const propAge = createMockProperty("age", TsTypeRef.number);
			const targetInterface = createMockInterface("Person", IArray.fromArray([propName as TsMember, propAge as TsMember]));
			const scope = createMockScope("test-lib", targetInterface);

			const keyOfBound: TsTypeKeyOf = {
				_tag: "TsTypeKeyOf",
				key: createTypeRef("Person"),
				asString: "keyof Person",
			};
			const typeParam = createTypeParam("K", keyOfBound);
			const param1 = createFunParam("key", createTypeRef("K"));
			const lookupType: TsTypeLookup = {
				_tag: "TsTypeLookup",
				from: createTypeRef("Person"),
				key: createTypeRef("K"),
				asString: "Person[K]",
			};
			const param2 = createFunParam("value", lookupType);
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param1, param2]));
			const call = createMockCall(sig);
			const interface_ = createMockInterface("test", IArray.fromArray([call as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			expect(result.length).toBe(2); // One for each property
			expect(result.forall(m => m._tag === "TsMemberCall")).toBe(true);
		});
	});

	describe("Union Type Expansion", () => {
		it("expands union type parameters", () => {
			const interface1 = createMockInterface("TypeA");
			const interface2 = createMockInterface("TypeB");
			const scope = createMockScope();

			const unionBound: TsTypeUnion = {
				_tag: "TsTypeUnion",
				types: IArray.fromArray([createTypeRef("TypeA") as TsType, createTypeRef("TypeB") as TsType]),
				asString: "TypeA | TypeB",
			};
			const typeParam = createTypeParam("T", unionBound);
			const param = createFunParam("value", createTypeRef("T"));
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param]));
			const method = createMockFunction("testMethod", sig);
			const interface_ = createMockInterface("test", IArray.fromArray([method as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			// Should expand into multiple methods for each union member
			expect(result.length).toBeGreaterThan(1);
			expect(result.forall(m => m._tag === "TsMemberFunction")).toBe(true);

			const methods = result.map(m => m as TsMemberFunction);
			expect(methods.forall(m => (m.name as TsIdentSimple).value === "testMethod")).toBe(true);
		});

		it("handles mixed keyof and union bounds", () => {
			const propA = createMockProperty("a");
			const targetInterface = createMockInterface("Target", IArray.fromArray([propA as TsMember]));
			const otherInterface = createMockInterface("Other");
			const scope = createMockScope("test-lib", targetInterface, otherInterface);

			const keyOfType: TsTypeKeyOf = {
				_tag: "TsTypeKeyOf",
				key: createTypeRef("Target"),
				asString: "keyof Target",
			};
			const unionBound: TsTypeUnion = {
				_tag: "TsTypeUnion",
				types: IArray.fromArray([keyOfType as TsType, createTypeRef("Other") as TsType]),
				asString: "keyof Target | Other",
			};
			const typeParam = createTypeParam("T", unionBound);
			const param = createFunParam("value", createTypeRef("T"));
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param]));
			const method = createMockFunction("testMethod", sig);
			const interface_ = createMockInterface("test", IArray.fromArray([method as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			expect(result.length).toBeGreaterThan(1);
			expect(result.forall(m => m._tag === "TsMemberFunction")).toBe(true);
		});
	});

	describe("Function Declaration Expansion", () => {
		it("expands function declarations with type parameters", () => {
			const interface1 = createMockInterface("TypeA");
			const interface2 = createMockInterface("TypeB");
			const scope = createMockScope();

			const unionBound: TsTypeUnion = {
				_tag: "TsTypeUnion",
				types: IArray.fromArray([createTypeRef("TypeA") as TsType, createTypeRef("TypeB") as TsType]),
				asString: "TypeA | TypeB",
			};
			const typeParam = createTypeParam("T", unionBound);
			const param = createFunParam("value", createTypeRef("T"));
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param]));
			const funcDecl = createMockDeclFunction("testFunction", sig);

			const parsedFile = TsParsedFile.create(NoComments.instance, IArray.Empty, IArray.fromArray([funcDecl as any]), CodePath.noPath());
			const result = ExpandTypeParams.instance.newMembers(scope, parsedFile);

			expect(result.length).toBeGreaterThan(1);
			expect(result.forall(m => m._tag === "TsDeclFunction")).toBe(true);

			const functions = result.map(m => m as TsDeclFunction);
			expect(functions.forall(f => (f.name as TsIdentSimple).value === "testFunction")).toBe(true);
		});

		it("leaves non-expandable function declarations unchanged", () => {
			const scope = createMockScope();
			const sig = createFunSig();
			const funcDecl = createMockDeclFunction("simpleFunction", sig);

			const parsedFile = TsParsedFile.create(NoComments.instance, IArray.Empty, IArray.fromArray([funcDecl as any]), CodePath.noPath());
			const result = ExpandTypeParams.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(1);
			expect(result.contains(funcDecl)).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("handles empty type parameter bounds", () => {
			const scope = createMockScope();
			const typeParam = createTypeParam("T"); // No upper bound
			const param = createFunParam("value", createTypeRef("T"));
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param]));
			const method = createMockFunction("testMethod", sig);
			const interface_ = createMockInterface("test", IArray.fromArray([method as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			// Should not expand since no upper bound
			expect(result.length).toBe(1);
			expect(result.contains(method)).toBe(true);
		});

		it("handles type parameters not used in parameters", () => {
			const scope = createMockScope();
			const unionBound: TsTypeUnion = {
				_tag: "TsTypeUnion",
				types: IArray.fromArray([TsTypeRef.string as TsType, TsTypeRef.number as TsType]),
				asString: "string | number",
			};
			const typeParam = createTypeParam("T", unionBound);
			const param = createFunParam("value", TsTypeRef.string); // Not using T
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param]));
			const method = createMockFunction("testMethod", sig);
			const interface_ = createMockInterface("test", IArray.fromArray([method as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			// Should not expand since T is not used in parameters
			expect(result.length).toBe(1);
			expect(result.contains(method)).toBe(true);
		});

		it("handles circular type references", () => {
			const scope = createMockScope();
			const selfRef = createTypeRef("T");
			const unionBound: TsTypeUnion = {
				_tag: "TsTypeUnion",
				types: IArray.fromArray([selfRef as TsType, TsTypeRef.string as TsType]),
				asString: "T | string",
			};
			const typeParam = createTypeParam("T", unionBound);
			const param = createFunParam("value", createTypeRef("T"));
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param]));
			const method = createMockFunction("testMethod", sig);
			const interface_ = createMockInterface("test", IArray.fromArray([method as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			// Should handle circular references gracefully
			expect(result.length).toBeGreaterThan(0);
			expect(result.forall(m => m._tag === "TsMemberFunction")).toBe(true);
		});

		it("handles expansion limit", () => {
			const scope = createMockScope();

			// Create a large union type that would exceed the 200 expansion limit
			const manyTypes = Array.from({ length: 250 }, (_, i) => createTypeRef(`Type${i + 1}`));
			const largeBound: TsTypeUnion = {
				_tag: "TsTypeUnion",
				types: IArray.fromArray(manyTypes as TsType[]),
				asString: "Type1 | Type2 | ...",
			};
			const typeParam = createTypeParam("T", largeBound);
			const param = createFunParam("value", createTypeRef("T"));
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param]));
			const method = createMockFunction("testMethod", sig);
			const interface_ = createMockInterface("test", IArray.fromArray([method as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			// Should not expand due to limit
			expect(result.length).toBe(1);
			expect(result.contains(method)).toBe(true);
		});

		it("handles non-normal method types", () => {
			const scope = createMockScope();
			const unionBound: TsTypeUnion = {
				_tag: "TsTypeUnion",
				types: IArray.fromArray([TsTypeRef.string as TsType, TsTypeRef.number as TsType]),
				asString: "string | number",
			};
			const typeParam = createTypeParam("T", unionBound);
			const param = createFunParam("value", createTypeRef("T"));
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param]));
			const getter: TsMemberFunction = {
				_tag: "TsMemberFunction",
				comments: NoComments.instance,
				level: TsProtectionLevel.default(),
				name: createSimpleIdent("getter"),
				methodType: MethodType.getter(),
				signature: sig,
				isStatic: false,
				isReadOnly: false,
				asString: "get getter",
				withComments: function(comments: Comments) { return { ...this, comments }; },
				addComment: function(comment: any) { return this.withComments(this.comments.add(comment)); },
			};
			const interface_ = createMockInterface("test", IArray.fromArray([getter as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			// Should not expand non-normal methods
			expect(result.length).toBe(1);
			expect(result.contains(getter)).toBe(true);
		});
	});

	describe("Integration Scenarios", () => {
		it("handles complex keyof scenarios", () => {
			const propX = createMockProperty("x", TsTypeRef.number);
			const propY = createMockProperty("y", TsTypeRef.string);
			const propZ = createMockProperty("z", TsTypeRef.boolean);
			const targetInterface = createMockInterface("ComplexTarget", IArray.fromArray([propX as TsMember, propY as TsMember, propZ as TsMember]));
			const scope = createMockScope("test-lib", targetInterface);

			const keyOfBound: TsTypeKeyOf = {
				_tag: "TsTypeKeyOf",
				key: createTypeRef("ComplexTarget"),
				asString: "keyof ComplexTarget",
			};
			const typeParam = createTypeParam("K", keyOfBound);
			const param1 = createFunParam("key", createTypeRef("K"));
			const lookupType: TsTypeLookup = {
				_tag: "TsTypeLookup",
				from: createTypeRef("ComplexTarget"),
				key: createTypeRef("K"),
				asString: "ComplexTarget[K]",
			};
			const param2 = createFunParam("value", lookupType);
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param1, param2]));
			const method = createMockFunction("complexMethod", sig);
			const interface_ = createMockInterface("test", IArray.fromArray([method as TsMember]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			expect(result.length).toBe(3); // One for each property
			expect(result.forall(m => m._tag === "TsMemberFunction")).toBe(true);

			const methods = result.map(m => m as TsMemberFunction);
			expect(methods.forall(m => (m.name as TsIdentSimple).value === "complexMethod")).toBe(true);
			expect(methods.forall(m => m.signature.tparams.isEmpty)).toBe(true);
		});

		it("preserves comments and other properties", () => {
			const scope = createMockScope();
			const unionBound: TsTypeUnion = {
				_tag: "TsTypeUnion",
				types: IArray.fromArray([TsTypeRef.string as TsType, TsTypeRef.number as TsType]),
				asString: "string | number",
			};
			const typeParam = createTypeParam("T", unionBound);
			const param = createFunParam("value", createTypeRef("T"));
			const sig = createFunSig(IArray.fromArray([typeParam]), IArray.fromArray([param]));

			const originalComments = createCommentsWithRaw("test comment");
			const method: TsMemberFunction = {
				_tag: "TsMemberFunction",
				comments: originalComments,
				level: TsProtectionLevel.private(),
				name: createSimpleIdent("testMethod"),
				methodType: MethodType.normal(),
				signature: sig,
				isStatic: true,
				isReadOnly: true,
				asString: "function testMethod",
				withComments: function(comments: Comments) { return { ...this, comments }; },
				addComment: function(comment: any) { return this.withComments(this.comments.add(comment)); },
			};
			const interface_ = createMockInterface("test", IArray.fromArray<TsMember>([method]));

			const result = ExpandTypeParams.instance.newClassMembers(scope, interface_);

			expect(result.length).toBeGreaterThan(1);
			expect(result.forall(m => m._tag === "TsMemberFunction")).toBe(true);

			const methods = result.map(m => m as TsMemberFunction);
			// First method should preserve original comments, others should have reduced comments
			expect(methods.apply(0).comments.cs.length).toBeGreaterThan(0);
			expect(methods.forall(m => m.level === TsProtectionLevel.private())).toBe(true);
			expect(methods.forall(m => m.isStatic === true)).toBe(true);
			expect(methods.forall(m => m.isReadOnly === true)).toBe(true);
		});
	});
});