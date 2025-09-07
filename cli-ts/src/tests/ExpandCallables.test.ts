/**
 * Tests for ExpandCallables.ts - TypeScript port of ExpandCallablesTests.scala
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import { ExpandedCallables } from "@/internal/Comment.js";
import { NoComments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { TsProtectionLevel } from "@/internal/ts/TsProtectionLevel.js";
import { ExpandCallables } from "@/internal/ts/transforms/ExpandCallables.js";
import {
	type TsFunParam,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	type TsMember,
	type TsMemberFunction,
	type TsMemberProperty,
	TsQIdent,
	type TsType,
	type TsTypeConstructor,
	TsTypeFunction,
	type TsTypeIntersect,
	TsTypeObject,
	TsTypeRef,
	type TsTypeUnion,
} from "@/internal/ts/trees.js";
import {
	createMockInterface,
	createMockMemberCall,
	createMockMethod,
	createMockProperty,
	createMockScope,
	createMockTypeAlias,
	createTypeRef,
} from "@/tests/utils/TestUtils.js";

// Helper functions for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function _createQIdent(name: string): TsQIdent {
	return TsQIdent.of(createSimpleIdent(name));
}

function createFunSig(
	params: IArray<TsFunParam> = IArray.Empty,
	resultType: TsType = TsTypeRef.void,
): TsFunSig {
	return TsFunSig.create(
		NoComments.instance,
		IArray.Empty, // tparams
		params,
		some(resultType),
	);
}

describe("ExpandCallables", () => {
	const expandCallables = new ExpandCallables();

	describe("Basic Functionality", () => {
		it("extends TransformClassMembers", () => {
			expect(expandCallables).toBeInstanceOf(ExpandCallables);
		});

		it("has newClassMembers method", () => {
			const scope = createMockScope();
			const interface_ = createMockInterface("test");
			const result = expandCallables.newClassMembers(scope, interface_);
			expect(result).toBeDefined();
		});

		it("leaves non-property members unchanged", () => {
			const scope = createMockScope();
			const method = createMockMethod("testMethod");
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([method]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(method);
		});

		it("leaves properties without types unchanged", () => {
			const scope = createMockScope();
			const property = createMockProperty("testProp", none);
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(property);
		});

		it("leaves properties with expressions unchanged", () => {
			const scope = createMockScope();
			const property = {
				...createMockProperty("testProp"),
				expr: some({
					_tag: "TsExprLiteral" as const,
					literal: { _tag: "TsLiteral" as const },
				}),
			};
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(property);
		});
	});

	describe("Function Type Expansion", () => {
		it("expands property with function type", () => {
			const scope = createMockScope();
			const funType = TsTypeFunction.create(
				createFunSig(IArray.Empty, TsTypeRef.string),
			);
			const property = createMockProperty("callback", funType, false, true); // isReadOnly = true
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should create a method instead of keeping the property
			expect(result.length).toBe(1);
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
			const method = result.apply(0) as TsMemberFunction;
			expect(method.name.value).toBe("callback");
			expect(method.signature.resultType?._tag).toBe("Some");
			if (method.signature.resultType?._tag === "Some") {
				expect(method.signature.resultType.value._tag).toBe("TsTypeRef");
				expect(
					(method.signature.resultType.value as any).name.parts.apply(0).value,
				).toBe("string");
			}
			expect(method.isReadOnly).toBe(true);
		});

		it("keeps original property when not readonly", () => {
			const scope = createMockScope();
			const funType = TsTypeFunction.create(createFunSig());
			const property = createMockProperty("callback", funType, false, false); // isReadOnly = false
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should create both method and keep original property
			expect(result.length).toBe(2);
			expect(result.toArray().some((m) => m._tag === "TsMemberFunction")).toBe(
				true,
			);
			expect(result.toArray().some((m) => m._tag === "TsMemberProperty")).toBe(
				true,
			);

			const keptProperty = result
				.toArray()
				.find((m) => m._tag === "TsMemberProperty") as TsMemberProperty;
			expect(
				keptProperty.comments.cs.some((c) => c === ExpandedCallables.instance),
			).toBe(true);
		});
	});

	describe("Object Type Expansion", () => {
		it("expands property with callable object type", () => {
			const scope = createMockScope();
			const callMember = createMockMemberCall();
			const objType = TsTypeObject.create(
				NoComments.instance,
				IArray.fromArray([callMember as TsMember]),
			);
			const property = createMockProperty("callable", objType, false, true); // isReadOnly = true
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should create a method
			expect(result.length).toBe(1);
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
			const method = result.apply(0) as TsMemberFunction;
			expect(method.name.value).toBe("callable");
		});

		it("keeps original property when object has non-call members", () => {
			const scope = createMockScope();
			const callMember = createMockMemberCall();
			const propMember = createMockProperty("prop");
			const objType = TsTypeObject.create(
				NoComments.instance,
				IArray.fromArray<TsMember>([callMember, propMember]),
			);
			const property = createMockProperty("callable", objType, false, true); // isReadOnly = true
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should create both method and keep original property
			expect(result.length).toBe(2);
			expect(result.toArray().some((m) => m._tag === "TsMemberFunction")).toBe(
				true,
			);
			expect(result.toArray().some((m) => m._tag === "TsMemberProperty")).toBe(
				true,
			);
		});

		it("ignores object type without call members", () => {
			const scope = createMockScope();
			const propMember = createMockProperty("prop");
			const objType = TsTypeObject.create(
				NoComments.instance,
				IArray.fromArray<TsMember>([propMember]),
			);
			const property = createMockProperty("notCallable", objType);
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should keep original property unchanged
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(property);
		});
	});

	describe("Intersection Type Expansion", () => {
		it("expands intersection with function types", () => {
			const scope = createMockScope();
			const funType1 = TsTypeFunction.create(
				createFunSig(IArray.Empty, TsTypeRef.string),
			);
			const funType2 = TsTypeFunction.create(
				createFunSig(IArray.Empty, TsTypeRef.number),
			);
			const intersectionType: TsTypeIntersect = {
				_tag: "TsTypeIntersect",
				types: IArray.fromArray([funType1 as TsType, funType2 as TsType]),
				asString: "function & function",
			};
			const property = createMockProperty(
				"multiCallback",
				intersectionType,
				false,
				true,
			); // isReadOnly = true
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should create multiple methods
			expect(result.length).toBe(2);
			expect(result.toArray().every((m) => m._tag === "TsMemberFunction")).toBe(
				true,
			);
			const methods = result.toArray() as TsMemberFunction[];
			expect(methods.every((m) => m.name.value === "multiCallback")).toBe(true);

			const resultTypes = methods.map((m) => m.signature.resultType);
			const stringTypeFound = resultTypes.some(
				(rt) =>
					rt?._tag === "Some" &&
					rt.value._tag === "TsTypeRef" &&
					(rt.value as any).name.parts.apply(0).value === "string",
			);
			const numberTypeFound = resultTypes.some(
				(rt) =>
					rt?._tag === "Some" &&
					rt.value._tag === "TsTypeRef" &&
					(rt.value as any).name.parts.apply(0).value === "number",
			);
			expect(stringTypeFound).toBe(true);
			expect(numberTypeFound).toBe(true);
		});

		it("handles mixed intersection types", () => {
			const scope = createMockScope();
			const funType = TsTypeFunction.create(createFunSig());
			const stringType = TsTypeRef.string;
			const intersectionType: TsTypeIntersect = {
				_tag: "TsTypeIntersect",
				types: IArray.fromArray([funType as TsType, stringType as TsType]),
				asString: "function & string",
			};
			const property = createMockProperty(
				"mixed",
				intersectionType,
				false,
				true,
			); // isReadOnly = true
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should create one method from the function type
			expect(result.length).toBe(1);
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
		});
	});

	describe("Type Reference Expansion", () => {
		it("expands property with interface type reference", () => {
			const callMember = createMockMemberCall();
			const callableInterface = createMockInterface(
				"CallableInterface",
				IArray.fromArray([callMember]),
			);
			const scope = createMockScope("test-lib", callableInterface);

			const property = createMockProperty(
				"interfaceCallback",
				createTypeRef("CallableInterface"),
				false,
				true,
			); // isReadOnly = true
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should create a method
			expect(result.length).toBe(1);
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
			const method = result.apply(0) as TsMemberFunction;
			expect(method.name.value).toBe("interfaceCallback");
		});

		it("expands property with type alias reference", () => {
			const funType = TsTypeFunction.create(
				createFunSig(IArray.Empty, TsTypeRef.string),
			);
			const typeAlias = createMockTypeAlias("CallbackType", funType);
			const scope = createMockScope("test-lib", typeAlias);

			const property = createMockProperty(
				"aliasCallback",
				createTypeRef("CallbackType"),
				false,
				true,
			); // isReadOnly = true
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should create a method
			expect(result.length).toBe(1);
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
			const method = result.apply(0) as TsMemberFunction;
			expect(method.name.value).toBe("aliasCallback");
			expect(method.signature.resultType?._tag).toBe("Some");
			if (method.signature.resultType?._tag === "Some") {
				expect(method.signature.resultType.value._tag).toBe("TsTypeRef");
				expect(
					(method.signature.resultType.value as any).name.parts.apply(0).value,
				).toBe("string");
			}
		});

		it("ignores non-callable interface references", () => {
			const propMember = createMockProperty("prop");
			const nonCallableInterface = createMockInterface(
				"NonCallableInterface",
				IArray.fromArray([propMember]),
			);
			const scope = createMockScope("test-lib", nonCallableInterface);

			const property = createMockProperty(
				"interfaceProp",
				createTypeRef("NonCallableInterface"),
			);
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should keep original property unchanged
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(property);
		});

		it("ignores primitive type references", () => {
			const scope = createMockScope();
			const property = createMockProperty("stringProp", TsTypeRef.string);
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should keep original property unchanged
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(property);
		});

		it("ignores unknown type references", () => {
			const scope = createMockScope();
			const property = createMockProperty(
				"unknownProp",
				createTypeRef("UnknownType"),
			);
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should keep original property unchanged
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(property);
		});
	});

	describe("Edge Cases", () => {
		it("handles union types", () => {
			const scope = createMockScope();
			const unionType: TsTypeUnion = {
				_tag: "TsTypeUnion",
				types: IArray.fromArray([
					TsTypeRef.string as TsType,
					TsTypeRef.number as TsType,
				]),
				asString: "string | number",
			};
			const property = createMockProperty("unionProp", unionType);
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should keep original property unchanged (union types are not expanded)
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(property);
		});

		it("handles constructor types", () => {
			const scope = createMockScope();
			const ctorType: TsTypeConstructor = {
				_tag: "TsTypeConstructor",
				isAbstract: false,
				signature: TsTypeFunction.create(createFunSig()),
				asString: "new () => any",
			};
			const property = createMockProperty("ctorProp", ctorType);
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should keep original property unchanged (constructor types are not expanded)
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(property);
		});

		it("preserves static and protection level", () => {
			const scope = createMockScope();
			const funType = TsTypeFunction.create(createFunSig());
			const property = {
				...createMockProperty("staticCallback", funType, true, true), // isStatic = true, isReadOnly = true
				level: TsProtectionLevel.private(),
			};
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			expect(result.length).toBe(1);
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
			const method = result.apply(0) as TsMemberFunction;
			expect(method.isStatic).toBe(true);
			expect(method.level).toEqual(TsProtectionLevel.private());
		});

		it("handles multiple callable properties", () => {
			const scope = createMockScope();
			const funType1 = TsTypeFunction.create(
				createFunSig(IArray.Empty, TsTypeRef.string),
			);
			const funType2 = TsTypeFunction.create(
				createFunSig(IArray.Empty, TsTypeRef.number),
			);
			const property1 = createMockProperty("callback1", funType1, false, true); // isReadOnly = true
			const property2 = createMockProperty("callback2", funType2, false, true); // isReadOnly = true
			const interface_ = createMockInterface(
				"test",
				IArray.fromArray([property1, property2]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			expect(result.length).toBe(2);
			expect(result.toArray().every((m) => m._tag === "TsMemberFunction")).toBe(
				true,
			);
			const methods = result.toArray() as TsMemberFunction[];

			const methodNames = methods.map((m) => m.name.value);
			expect(methodNames).toContain("callback1");
			expect(methodNames).toContain("callback2");
		});
	});

	describe("Integration Scenarios", () => {
		it("works with complex nested scenarios", () => {
			const callMember = createMockMemberCall();
			const propMember = createMockProperty("data");
			const callableInterface = createMockInterface(
				"CallableInterface",
				IArray.fromArray([callMember, propMember]),
			);

			const funType = TsTypeFunction.create(
				createFunSig(IArray.Empty, TsTypeRef.string),
			);
			const typeAlias = createMockTypeAlias("FunctionAlias", funType);

			const scope = createMockScope("test-lib", callableInterface, typeAlias);

			const property1 = createMockProperty(
				"interfaceCallback",
				createTypeRef("CallableInterface"),
				false,
				true,
			); // isReadOnly = true
			const property2 = createMockProperty(
				"aliasCallback",
				createTypeRef("FunctionAlias"),
				false,
				true,
			); // isReadOnly = true
			const property3 = createMockProperty(
				"directCallback",
				funType,
				false,
				true,
			); // isReadOnly = true
			const normalProperty = createMockProperty("normalProp", TsTypeRef.string);

			const interface_ = createMockInterface(
				"ComplexInterface",
				IArray.fromArray([property1, property2, property3, normalProperty]),
			);

			const result = expandCallables.newClassMembers(scope, interface_);

			// Should have 3 methods + 1 kept property (interface has non-call members) + 1 normal property
			expect(result.length).toBe(5);

			const methods = result
				.toArray()
				.filter((m) => m._tag === "TsMemberFunction") as TsMemberFunction[];
			const properties = result
				.toArray()
				.filter((m) => m._tag === "TsMemberProperty");

			expect(methods.length).toBe(3); // 3 expanded methods
			expect(properties.length).toBe(2); // 1 kept from interface expansion + 1 normal

			const methodNames = methods.map((m) => m.name.value);
			expect(methodNames).toContain("interfaceCallback");
			expect(methodNames).toContain("aliasCallback");
			expect(methodNames).toContain("directCallback");
		});
	});
});
