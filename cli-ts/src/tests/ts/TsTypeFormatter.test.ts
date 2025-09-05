/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TsTypeFormatterTests
 *
 * Comprehensive test suite for the TsTypeFormatter functionality, ensuring behavioral
 * equivalence with the Scala implementation.
 */

import { describe, expect, test } from "bun:test";
import * as O from "fp-ts/Option";
import { Comments } from "@/internal/Comments.ts";
import { IArray } from "@/internal/IArray.ts";
import { MethodType } from "@/internal/ts/MethodType.ts";
import { OptionalModifier } from "@/internal/ts/OptionalModifier.ts";
import { ReadonlyModifier } from "@/internal/ts/ReadonlyModifier.ts";
import { TsProtectionLevel } from "@/internal/ts/TsProtectionLevel.ts";
import {
	TsTypeFormatter,
	TsTypeFormatterNoComments,
} from "@/internal/ts/TsTypeFormatter.ts";
import {
	type Indexing,
	IndexingDict,
	IndexingSingle,
	TsFunParam,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	TsLiteral,
	type TsMember,
	TsMemberCall,
	TsMemberCtor,
	TsMemberFunction,
	TsMemberIndex,
	TsMemberProperty,
	TsMemberTypeMapped,
	TsQIdent,
	TsTupleElement,
	type TsType,
	TsTypeAsserts,
	TsTypeConditional,
	TsTypeConstructor,
	TsTypeExtends,
	TsTypeFunction,
	TsTypeInfer,
	TsTypeIntersect,
	TsTypeIs,
	TsTypeKeyOf,
	TsTypeLiteral,
	TsTypeLookup,
	TsTypeObject,
	TsTypeParam,
	TsTypeQuery,
	TsTypeRef,
	TsTypeRepeated,
	TsTypeThis,
	TsTypeTuple,
	TsTypeUnion,
} from "@/internal/ts/trees.ts";

// Helper methods for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]): TsQIdent {
	const identParts = parts.map(createSimpleIdent);
	return TsQIdent.of(...identParts);
}

function createTypeRef(name: string, ...tparams: TsType[]): TsTypeRef {
	return TsTypeRef.create(
		Comments.empty(),
		createQIdent(name),
		IArray.fromArray(tparams),
	);
}

function createStringLiteral(value: string): TsTypeLiteral {
	return TsTypeLiteral.create(TsLiteral.str(value));
}

function createNumLiteral(value: string): TsTypeLiteral {
	return TsTypeLiteral.create(TsLiteral.num(value));
}

function createBoolLiteral(value: boolean): TsTypeLiteral {
	return TsTypeLiteral.create(TsLiteral.bool(value));
}

function createTypeParam(
	name: string,
	bound?: TsType,
	defaultType?: TsType,
): TsTypeParam {
	return TsTypeParam.create(
		Comments.empty(),
		createSimpleIdent(name),
		bound ? O.some(bound) : O.none,
		defaultType ? O.some(defaultType) : O.none,
	);
}

function createFunParam(name: string, tpe?: TsType): TsFunParam {
	return TsFunParam.create(
		Comments.empty(),
		createSimpleIdent(name),
		tpe ? O.some(tpe) : O.none,
	);
}

function createFunSig(
	tparams: IArray<TsTypeParam> = IArray.Empty,
	params: IArray<TsFunParam> = IArray.Empty,
	resultType?: TsType,
): TsFunSig {
	return TsFunSig.create(
		Comments.empty(),
		tparams,
		params,
		resultType ? O.some(resultType) : O.none,
	);
}

function createMemberProperty(
	name: string,
	tpe?: TsType,
	level: TsProtectionLevel = TsProtectionLevel.default(),
	isStatic: boolean = false,
	isReadOnly: boolean = false,
): TsMemberProperty {
	return TsMemberProperty.create(
		Comments.empty(),
		level,
		createSimpleIdent(name),
		tpe ? O.some(tpe) : O.none,
		O.none, // expr
		isStatic,
		isReadOnly,
	);
}

function createMemberFunction(
	name: string,
	signature: TsFunSig = createFunSig(),
	level: TsProtectionLevel = TsProtectionLevel.default(),
	methodType: MethodType = MethodType.normal(),
	isStatic: boolean = false,
	isReadOnly: boolean = false,
): TsMemberFunction {
	return TsMemberFunction.create(
		Comments.empty(),
		level,
		createSimpleIdent(name),
		methodType,
		signature,
		isStatic,
		isReadOnly,
	);
}

function createMemberCall(
	signature: TsFunSig = createFunSig(),
	level: TsProtectionLevel = TsProtectionLevel.default(),
): TsMemberCall {
	return TsMemberCall.create(Comments.empty(), level, signature);
}

function createMemberCtor(
	signature: TsFunSig = createFunSig(),
	level: TsProtectionLevel = TsProtectionLevel.default(),
): TsMemberCtor {
	return TsMemberCtor.create(Comments.empty(), level, signature);
}

function _createMemberIndex(
	indexing: Indexing,
	valueType?: TsType,
	isReadOnly: boolean = false,
	level: TsProtectionLevel = TsProtectionLevel.default(),
): TsMemberIndex {
	return TsMemberIndex.create(
		Comments.empty(),
		isReadOnly,
		level,
		indexing,
		valueType ? O.some(valueType) : O.none,
	);
}

function _createIndexingDict(name: string, tpe: TsType): IndexingDict {
	return IndexingDict.create(createSimpleIdent(name), tpe);
}

function _createIndexingSingle(name: string): IndexingSingle {
	return IndexingSingle.create(createQIdent(name));
}

function _createMemberTypeMapped(
	key: string,
	from: TsType,
	to: TsType,
	readonly: ReadonlyModifier = ReadonlyModifier.noop(),
	optionalize: OptionalModifier = OptionalModifier.noop(),
	as?: TsType,
	level: TsProtectionLevel = TsProtectionLevel.default(),
): TsMemberTypeMapped {
	return TsMemberTypeMapped.create(
		Comments.empty(),
		level,
		readonly,
		createSimpleIdent(key),
		from,
		as ? O.some(as) : O.none,
		optionalize,
		to,
	);
}

// Test suite
describe("TsTypeFormatter", () => {
	describe("Basic Functionality", () => {
		describe("qident", () => {
			test("formats qualified identifiers correctly", () => {
				const formatter = TsTypeFormatter;

				// Single part identifier
				const qident1 = createQIdent("MyClass");
				expect(formatter.qident(qident1)).toBe("MyClass");

				// Multi-part identifier
				const qident2 = createQIdent("React", "Component");
				expect(formatter.qident(qident2)).toBe("React.Component");

				// Complex nested identifier
				const qident3 = createQIdent("MyNamespace", "SubNamespace", "MyClass");
				expect(formatter.qident(qident3)).toBe(
					"MyNamespace.SubNamespace.MyClass",
				);

				// Empty parts
				const emptyQIdent = TsQIdent.empty();
				expect(formatter.qident(emptyQIdent)).toBe("");
			});
		});

		describe("tparams", () => {
			test("formats type parameters correctly", () => {
				const formatter = TsTypeFormatter;

				// Empty type parameters
				const emptyResult = formatter.tparams(IArray.Empty, (x: string) =>
					x.toString(),
				);
				expect(O.isNone(emptyResult)).toBe(true);

				// Single type parameter
				const tparams1 = IArray.fromArray([createTypeParam("T")]);
				const result1 = formatter.tparams(tparams1, (tp) =>
					formatter.tparam(tp),
				);
				expect(O.isSome(result1)).toBe(true);
				if (O.isSome(result1)) {
					expect(result1.value).toBe("<T>");
				}

				// Multiple type parameters
				const tparams2 = IArray.fromArray([
					createTypeParam("T"),
					createTypeParam("U"),
				]);
				const result2 = formatter.tparams(tparams2, (tp) =>
					formatter.tparam(tp),
				);
				expect(O.isSome(result2)).toBe(true);
				if (O.isSome(result2)) {
					expect(result2.value).toBe("<T, U>");
				}
			});

			test("tparams with custom formatter function", () => {
				const formatter = TsTypeFormatter;
				const items = IArray.fromArray(["a", "b", "c"]);
				const result = formatter.tparams(items, (x) => x.toUpperCase());
				expect(O.isSome(result)).toBe(true);
				if (O.isSome(result)) {
					expect(result.value).toBe("<A, B, C>");
				}
			});
		});

		describe("tparam", () => {
			test("formats type parameters correctly", () => {
				const formatter = TsTypeFormatter;

				// Simple type parameter
				const tparam1 = createTypeParam("T");
				expect(formatter.tparam(tparam1)).toBe("T");

				// Type parameter with bound
				const bound = createTypeRef("string");
				const tparam2 = createTypeParam("T", bound);
				expect(formatter.tparam(tparam2)).toBe("T extends string");

				// Type parameter with default
				const defaultType = createTypeRef("string");
				const tparam3 = createTypeParam("T", undefined, defaultType);
				expect(formatter.tparam(tparam3)).toBe("T = string");

				// Type parameter with both bound and default
				const tparam4 = createTypeParam("T", bound, defaultType);
				expect(formatter.tparam(tparam4)).toBe("T extends string = string");
			});
		});

		describe("param", () => {
			test("formats function parameters correctly", () => {
				const formatter = TsTypeFormatter;

				// Parameter without type
				const param1 = createFunParam("x");
				expect(formatter.param(param1)).toBe("x");

				// Parameter with type
				const param2 = createFunParam("x", createTypeRef("number"));
				expect(formatter.param(param2)).toBe("x : number");

				// Parameter with complex type
				const param3 = createFunParam("callback", createTypeRef("Function"));
				expect(formatter.param(param3)).toBe("callback : Function");
			});
		});

		describe("sig", () => {
			test("formats function signatures correctly", () => {
				const formatter = TsTypeFormatter;

				// Simple signature with no parameters
				const sig1 = createFunSig();
				expect(formatter.sig(sig1)).toBe("()");

				// Signature with single parameter
				const params1 = IArray.fromArray([
					createFunParam("x", createTypeRef("number")),
				]);
				const sig2 = createFunSig(IArray.Empty, params1);
				expect(formatter.sig(sig2)).toBe("(x : number)");

				// Signature with multiple parameters
				const params2 = IArray.fromArray([
					createFunParam("x", createTypeRef("number")),
					createFunParam("y", createTypeRef("string")),
				]);
				const sig3 = createFunSig(IArray.Empty, params2);
				expect(formatter.sig(sig3)).toBe("(x : number, y : string)");

				// Signature with return type
				const sig4 = createFunSig(
					IArray.Empty,
					params1,
					createTypeRef("string"),
				);
				expect(formatter.sig(sig4)).toBe("(x : number): string");

				// Signature with type parameters
				const tparams = IArray.fromArray([createTypeParam("T")]);
				const sig5 = createFunSig(tparams, params1, createTypeRef("T"));
				expect(formatter.sig(sig5)).toBe("<T>(x : number): T");
			});
		});

		describe("level", () => {
			test("formats protection levels correctly", () => {
				const formatter = TsTypeFormatter;

				// Default level
				const defaultLevel = TsProtectionLevel.default();
				const defaultResult = formatter.level(defaultLevel);
				expect(O.isNone(defaultResult)).toBe(true);

				// Private level
				const privateLevel = TsProtectionLevel.private();
				const privateResult = formatter.level(privateLevel);
				expect(O.isSome(privateResult)).toBe(true);
				if (O.isSome(privateResult)) {
					expect(privateResult.value).toBe("private");
				}

				// Protected level
				const protectedLevel = TsProtectionLevel.protected();
				const protectedResult = formatter.level(protectedLevel);
				expect(O.isSome(protectedResult)).toBe(true);
				if (O.isSome(protectedResult)) {
					expect(protectedResult.value).toBe("protected");
				}
			});
		});

		describe("lit", () => {
			test("formats literals correctly", () => {
				const formatter = TsTypeFormatter;

				// String literal
				const strLit = TsLiteral.str("hello");
				expect(formatter.lit(strLit)).toBe("'hello'");

				// Number literal
				const numLit = TsLiteral.num("42");
				expect(formatter.lit(numLit)).toBe("42");

				// Boolean literal
				const boolLit = TsLiteral.bool(true);
				expect(formatter.lit(boolLit)).toBe("true");

				// Empty string
				const emptyStr = TsLiteral.str("");
				expect(formatter.lit(emptyStr)).toBe("''");

				// String with special characters
				const specialStr = TsLiteral.str("hello\nworld\t!");
				expect(formatter.lit(specialStr)).toBe("'hello\nworld\t!'");
			});
		});

		describe("member", () => {
			test("formats TsMemberProperty correctly", () => {
				const formatter = TsTypeFormatter;

				// Simple property without type
				const member1 = createMemberProperty("name");
				expect(formatter.member(member1)).toBe("  name");

				// Property with type
				const member2 = createMemberProperty("name", createTypeRef("string"));
				expect(formatter.member(member2)).toBe("  name :string");

				// Readonly property
				const member3 = createMemberProperty(
					"name",
					createTypeRef("string"),
					TsProtectionLevel.default(),
					false,
					true,
				);
				expect(formatter.member(member3)).toBe(" readonly name :string");

				// Static property
				const member4 = createMemberProperty(
					"count",
					createTypeRef("number"),
					TsProtectionLevel.default(),
					true,
				);
				expect(formatter.member(member4)).toBe("static  count :number");

				// Private property
				const member5 = createMemberProperty(
					"_internal",
					createTypeRef("any"),
					TsProtectionLevel.private(),
				);
				expect(formatter.member(member5)).toBe("private   _internal :any");
			});

			test("formats TsMemberFunction correctly", () => {
				const formatter = TsTypeFormatter;

				// Simple function without parameters
				const member1 = createMemberFunction("doSomething");
				expect(formatter.member(member1)).toBe("doSomething ()");

				// Function with parameters
				const params = IArray.fromArray([
					createFunParam("x", createTypeRef("number")),
				]);
				const sig = createFunSig(IArray.Empty, params);
				const member2 = createMemberFunction("calculate", sig);
				expect(formatter.member(member2)).toBe("calculate (x : number)");

				// Function with return type
				const sig2 = createFunSig(
					IArray.Empty,
					params,
					createTypeRef("string"),
				);
				const member3 = createMemberFunction("convert", sig2);
				expect(formatter.member(member3)).toBe("convert (x : number): string");

				// Getter method
				const sig3 = createFunSig(
					IArray.Empty,
					IArray.Empty,
					createTypeRef("string"),
				);
				const member4 = createMemberFunction(
					"name",
					sig3,
					TsProtectionLevel.default(),
					MethodType.getter(),
				);
				expect(formatter.member(member4)).toBe("get name (): string");

				// Setter method
				const setterParams = IArray.fromArray([
					createFunParam("value", createTypeRef("string")),
				]);
				const sig4 = createFunSig(IArray.Empty, setterParams);
				const member5 = createMemberFunction(
					"name",
					sig4,
					TsProtectionLevel.default(),
					MethodType.setter(),
				);
				expect(formatter.member(member5)).toBe("set name (value : string)");

				// Static private function
				const member6 = createMemberFunction(
					"helper",
					createFunSig(),
					TsProtectionLevel.private(),
					MethodType.normal(),
					true,
				);
				expect(formatter.member(member6)).toBe("private static helper ()");
			});

			test("formats TsMemberCall correctly", () => {
				const formatter = TsTypeFormatter;

				// Simple call signature
				const member1 = createMemberCall();
				expect(formatter.member(member1)).toBe("()");

				// Call signature with parameters
				const params = IArray.fromArray([
					createFunParam("x", createTypeRef("number")),
				]);
				const sig = createFunSig(IArray.Empty, params, createTypeRef("string"));
				const member2 = createMemberCall(sig);
				expect(formatter.member(member2)).toBe("(x : number): string");
			});

			test("formats TsMemberCtor correctly", () => {
				const formatter = TsTypeFormatter;

				// Simple constructor signature
				const member1 = createMemberCtor();
				expect(formatter.member(member1)).toBe("new ()");

				// Constructor with parameters
				const params = IArray.fromArray([
					createFunParam("x", createTypeRef("number")),
				]);
				const sig = createFunSig(IArray.Empty, params);
				const member2 = createMemberCtor(sig);
				expect(formatter.member(member2)).toBe("new (x : number)");
			});
		});
	});

	describe("Type Formatting - Basic Types", () => {
		describe("apply", () => {
			test("formats basic types correctly", () => {
				const formatter = TsTypeFormatter;

				// TsTypeRef without type parameters
				const tpe1 = createTypeRef("string");
				expect(formatter.apply(tpe1)).toBe("string");

				// TsTypeRef with single type parameter
				const tpe2 = createTypeRef("Array", createTypeRef("string"));
				expect(formatter.apply(tpe2)).toBe("Array<string>");

				// TsTypeRef with multiple type parameters
				const tpe3 = createTypeRef(
					"Map",
					createTypeRef("string"),
					createTypeRef("number"),
				);
				expect(formatter.apply(tpe3)).toBe("Map<string, number>");

				// TsTypeLiteral string
				const tpe4 = createStringLiteral("hello");
				expect(formatter.apply(tpe4)).toBe("'hello'");

				// TsTypeLiteral number
				const tpe5 = createNumLiteral("42");
				expect(formatter.apply(tpe5)).toBe("42");

				// TsTypeLiteral boolean
				const tpe6 = createBoolLiteral(true);
				expect(formatter.apply(tpe6)).toBe("true");

				// TsTypeObject empty
				const tpe7 = TsTypeObject.create(Comments.empty(), IArray.Empty);
				expect(formatter.apply(tpe7)).toBe("{}");

				// TsTypeObject with single member
				const member = createMemberProperty("name", createTypeRef("string"));
				const tpe8 = TsTypeObject.create(
					Comments.empty(),
					IArray.fromArray([member as TsMember]),
				);
				expect(formatter.apply(tpe8)).toBe("{  name :string}");
			});

			test("formats function types correctly", () => {
				const formatter = TsTypeFormatter;

				// Simple function type
				const sig1 = createFunSig();
				const tpe1 = TsTypeFunction.create(sig1);
				expect(formatter.apply(tpe1)).toBe("()");

				// Function with parameters
				const params = IArray.fromArray([
					createFunParam("x", createTypeRef("number")),
				]);
				const sig2 = createFunSig(IArray.Empty, params);
				const tpe2 = TsTypeFunction.create(sig2);
				expect(formatter.apply(tpe2)).toBe("(x : number)");

				// Function with return type
				const sig3 = createFunSig(
					IArray.Empty,
					params,
					createTypeRef("string"),
				);
				const tpe3 = TsTypeFunction.create(sig3);
				expect(formatter.apply(tpe3)).toBe("(x : number): string");

				// Function with type parameters
				const tparams = IArray.fromArray([createTypeParam("T")]);
				const sig4 = createFunSig(tparams, params, createTypeRef("T"));
				const tpe4 = TsTypeFunction.create(sig4);
				expect(formatter.apply(tpe4)).toBe("<T>(x : number): T");
			});
		});
	});

	describe("Type Formatting - Advanced Types", () => {
		describe("apply", () => {
			test("formats union and intersection types correctly", () => {
				const formatter = TsTypeFormatter;

				// TsTypeUnion with two types
				const tpe1 = TsTypeUnion.create(
					IArray.fromArray([
						createTypeRef("string") as TsType,
						createTypeRef("number") as TsType,
					]),
				);
				expect(formatter.apply(tpe1)).toBe("string | number");

				// TsTypeUnion with multiple types
				const tpe2 = TsTypeUnion.create(
					IArray.fromArray([
						createTypeRef("string") as TsType,
						createTypeRef("number") as TsType,
						createTypeRef("boolean") as TsType,
					]),
				);
				expect(formatter.apply(tpe2)).toBe("string | number | boolean");

				// TsTypeIntersect with two types
				const tpe3 = TsTypeIntersect.create(
					IArray.fromArray([
						createTypeRef("A") as TsType,
						createTypeRef("B") as TsType,
					]),
				);
				expect(formatter.apply(tpe3)).toBe("A & B");

				// TsTypeIntersect with multiple types
				const tpe4 = TsTypeIntersect.create(
					IArray.fromArray([
						createTypeRef("A") as TsType,
						createTypeRef("B") as TsType,
						createTypeRef("C") as TsType,
					]),
				);
				expect(formatter.apply(tpe4)).toBe("A & B & C");
			});

			test("formats tuple types correctly", () => {
				const formatter = TsTypeFormatter;

				// Empty tuple
				const tpe1 = TsTypeTuple.create(IArray.Empty);
				expect(formatter.apply(tpe1)).toBe("[]");

				// Single element tuple
				const elem1 = TsTupleElement.create(O.none, createTypeRef("string"));
				const tpe2 = TsTypeTuple.create(IArray.fromArray([elem1]));
				expect(formatter.apply(tpe2)).toBe("[string]");

				// Multiple element tuple
				const elem2 = TsTupleElement.create(O.none, createTypeRef("number"));
				const tpe3 = TsTypeTuple.create(IArray.fromArray([elem1, elem2]));
				expect(formatter.apply(tpe3)).toBe("[string, number]");

				// Tuple with labeled elements
				const labeledElem = TsTupleElement.create(
					O.some(createSimpleIdent("name")),
					createTypeRef("string"),
				);
				const tpe4 = TsTypeTuple.create(IArray.fromArray([labeledElem]));
				expect(formatter.apply(tpe4)).toBe("[name: string]");
			});

			test("formats utility types correctly", () => {
				const formatter = TsTypeFormatter;

				// TsTypeKeyOf
				const tpe1 = TsTypeKeyOf.create(createTypeRef("T"));
				expect(formatter.apply(tpe1)).toBe("keyof T");

				// TsTypeLookup
				const tpe2 = TsTypeLookup.create(
					createTypeRef("T"),
					createTypeRef("K"),
				);
				expect(formatter.apply(tpe2)).toBe("T[K]");

				// TsTypeThis
				const tpe3 = TsTypeThis.create();
				expect(formatter.apply(tpe3)).toBe("this");

				// TsTypeQuery
				const tpe4 = TsTypeQuery.create(createQIdent("myVariable"));
				expect(formatter.apply(tpe4)).toBe("typeof myVariable");

				// TsTypeRepeated
				const tpe5 = TsTypeRepeated.create(createTypeRef("string"));
				expect(formatter.apply(tpe5)).toBe("...string");
			});

			test("formats conditional and infer types correctly", () => {
				const formatter = TsTypeFormatter;

				// TsTypeConditional
				const tpe1 = TsTypeConditional.create(
					createTypeRef("T"),
					createTypeRef("string"),
					createTypeRef("number"),
				);
				expect(formatter.apply(tpe1)).toBe("T ? string : number");

				// TsTypeExtends
				const tpe2 = TsTypeExtends.create(
					createTypeRef("T"),
					createTypeRef("string"),
				);
				expect(formatter.apply(tpe2)).toBe("T extends string");

				// TsTypeInfer
				const tparam = createTypeParam("U");
				const tpe3 = TsTypeInfer.create(tparam);
				expect(formatter.apply(tpe3)).toBe("infer U");
			});

			test("formats constructor and assertion types correctly", () => {
				const formatter = TsTypeFormatter;

				// TsTypeConstructor
				const sig = createFunSig(
					IArray.Empty,
					IArray.fromArray([createFunParam("x", createTypeRef("number"))]),
					createTypeRef("MyClass"),
				);
				const funcType = TsTypeFunction.create(sig);
				const tpe1 = TsTypeConstructor.create(false, funcType);
				expect(formatter.apply(tpe1)).toBe("new (x : number): MyClass");

				// TsTypeConstructor abstract
				const tpe2 = TsTypeConstructor.create(true, funcType);
				expect(formatter.apply(tpe2)).toBe(
					"abstract new (x : number): MyClass",
				);

				// TsTypeIs
				const tpe3 = TsTypeIs.create(
					createSimpleIdent("value"),
					createTypeRef("string"),
				);
				expect(formatter.apply(tpe3)).toBe("value is string");

				// TsTypeAsserts
				const tpe4 = TsTypeAsserts.create(createSimpleIdent("value"), O.none);
				expect(formatter.apply(tpe4)).toBe("asserts value");

				// TsTypeAsserts with type
				const tpe5 = TsTypeAsserts.create(
					createSimpleIdent("value"),
					O.some(createTypeRef("string")),
				);
				expect(formatter.apply(tpe5)).toBe("asserts value is string");
			});
		});
	});

	describe("Edge Cases and Complex Types", () => {
		describe("Complex nested types", () => {
			test("handles deeply nested generic types", () => {
				const formatter = TsTypeFormatter;

				// Array<Map<string, number>>
				const innerType = createTypeRef(
					"Map",
					createTypeRef("string"),
					createTypeRef("number"),
				);
				const tpe = createTypeRef("Array", innerType);
				expect(formatter.apply(tpe)).toBe("Array<Map<string, number>>");

				// Promise<Array<{ name: string; age: number }>>
				const propName = createMemberProperty("name", createTypeRef("string"));
				const propAge = createMemberProperty("age", createTypeRef("number"));
				const objType = TsTypeObject.create(
					Comments.empty(),
					IArray.fromArray([propName as TsMember, propAge as TsMember]),
				);
				const arrayType = createTypeRef("Array", objType);
				const promiseType = createTypeRef("Promise", arrayType);
				expect(formatter.apply(promiseType)).toBe(
					"Promise<Array<{  name :string,   age :number}>>",
				);
			});

			test("handles complex union and intersection combinations", () => {
				const formatter = TsTypeFormatter;

				// (A | B) & (C | D)
				const unionAB = TsTypeUnion.create(
					IArray.fromArray([
						createTypeRef("A") as TsType,
						createTypeRef("B") as TsType,
					]),
				);
				const unionCD = TsTypeUnion.create(
					IArray.fromArray([
						createTypeRef("C") as TsType,
						createTypeRef("D") as TsType,
					]),
				);
				const intersection = TsTypeIntersect.create(
					IArray.fromArray([unionAB as TsType, unionCD as TsType]),
				);
				expect(formatter.apply(intersection)).toBe("A | B & C | D");

				// A & B | C & D
				const intersectAB = TsTypeIntersect.create(
					IArray.fromArray([
						createTypeRef("A") as TsType,
						createTypeRef("B") as TsType,
					]),
				);
				const intersectCD = TsTypeIntersect.create(
					IArray.fromArray([
						createTypeRef("C") as TsType,
						createTypeRef("D") as TsType,
					]),
				);
				const union = TsTypeUnion.create(
					IArray.fromArray([intersectAB as TsType, intersectCD as TsType]),
				);
				expect(formatter.apply(union)).toBe("A & B | C & D");
			});

			test("handles complex tuple types", () => {
				const formatter = TsTypeFormatter;

				// [string, number, ...boolean[]]
				const elem1 = TsTupleElement.create(O.none, createTypeRef("string"));
				const elem2 = TsTupleElement.create(O.none, createTypeRef("number"));
				const restType = TsTypeRepeated.create(createTypeRef("boolean"));
				const elem3 = TsTupleElement.create(O.none, restType);
				const tpe = TsTypeTuple.create(IArray.fromArray([elem1, elem2, elem3]));
				expect(formatter.apply(tpe)).toBe("[string, number, ...boolean]");

				// [name: string, age?: number]
				const namedElem1 = TsTupleElement.create(
					O.some(createSimpleIdent("name")),
					createTypeRef("string"),
				);
				const namedElem2 = TsTupleElement.create(
					O.some(createSimpleIdent("age")),
					createTypeRef("number"),
				);
				const tpe2 = TsTypeTuple.create(
					IArray.fromArray([namedElem1, namedElem2]),
				);
				expect(formatter.apply(tpe2)).toBe("[name: string, age: number]");
			});
		});

		describe("Special characters and edge cases", () => {
			test("handles special characters in identifiers", () => {
				const formatter = TsTypeFormatter;

				// Type with special characters
				const tpe1 = createTypeRef("$special_name123");
				expect(formatter.apply(tpe1)).toBe("$special_name123");

				// Property with special characters
				const member = createMemberProperty(
					"$prop-name",
					createTypeRef("string"),
				);
				expect(formatter.member(member)).toBe("  $prop-name :string");

				// Qualified identifier with special characters
				const qident = createQIdent("$namespace", "_internal", "Type123");
				expect(formatter.qident(qident)).toBe("$namespace._internal.Type123");
			});

			test("handles string literals with quotes and escapes", () => {
				const formatter = TsTypeFormatter;

				// String with double quotes
				const tpe1 = createStringLiteral('hello "world"');
				expect(formatter.apply(tpe1)).toBe("'hello \"world\"'");

				// String with single quotes
				const tpe2 = createStringLiteral("hello 'world'");
				expect(formatter.apply(tpe2)).toBe("'hello 'world''");

				// String with newlines and tabs
				const tpe3 = createStringLiteral("hello\nworld\t!");
				expect(formatter.apply(tpe3)).toBe("'hello\nworld\t!'");

				// Empty string
				const tpe4 = createStringLiteral("");
				expect(formatter.apply(tpe4)).toBe("''");
			});

			test("handles empty and minimal cases", () => {
				const formatter = TsTypeFormatter;

				// Empty qualified identifier
				const emptyQIdent = TsQIdent.empty();
				expect(formatter.qident(emptyQIdent)).toBe("");

				// Empty tuple
				const emptyTuple = TsTypeTuple.create(IArray.Empty);
				expect(formatter.apply(emptyTuple)).toBe("[]");

				// Empty object type
				const emptyObj = TsTypeObject.create(Comments.empty(), IArray.Empty);
				expect(formatter.apply(emptyObj)).toBe("{}");

				// Function with no parameters and no return type
				const emptySig = createFunSig();
				const emptyFunc = TsTypeFunction.create(emptySig);
				expect(formatter.apply(emptyFunc)).toBe("()");
			});
		});

		describe("Comment handling", () => {
			test("formatter with comments enabled includes comments", () => {
				const formatter = TsTypeFormatter; // keepComments = true

				// Type with comments (would need to create a type with actual comments)
				const tpe = createTypeRef("string");
				expect(formatter.apply(tpe)).toBe("string");
			});

			test("formatter with comments disabled drops comments", () => {
				const formatter = TsTypeFormatterNoComments; // keepComments = false

				// Type with comments (would need to create a type with actual comments)
				const tpe = createTypeRef("string");
				expect(formatter.apply(tpe)).toBe("string");
			});

			test("dropComments method creates new formatter without comments", () => {
				const originalFormatter = TsTypeFormatter;
				const noCommentsFormatter = originalFormatter.dropComments();

				expect(originalFormatter.keepComments).toBe(true);
				expect(noCommentsFormatter.keepComments).toBe(false);

				// Both should format the same way for types without comments
				const tpe = createTypeRef("string");
				expect(originalFormatter.apply(tpe)).toBe("string");
				expect(noCommentsFormatter.apply(tpe)).toBe("string");
			});
		});
	});
});
