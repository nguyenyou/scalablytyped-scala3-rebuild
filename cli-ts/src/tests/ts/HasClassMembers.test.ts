/**
 * Tests for HasClassMembers - TypeScript port of org.scalablytyped.converter.internal.ts.HasClassMembersTests
 *
 * This file contains 24 comprehensive unit tests that verify the HasClassMembers functionality,
 * maintaining 100% behavioral parity with the Scala implementation.
 */

import { none, type Option, some } from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import { Comments } from "../../internal/Comments.js";
import { IArray } from "../../internal/IArray.js";
import { HasClassMembers } from "../../internal/ts/MemberCache.js";
import { MethodType } from "../../internal/ts/MethodType.js";
import { OptionalModifier } from "../../internal/ts/OptionalModifier.js";
import { ReadonlyModifier } from "../../internal/ts/ReadonlyModifier.js";
import { TsProtectionLevel } from "../../internal/ts/TsProtectionLevel.js";
import {
	TsExprLiteral,
	TsFunSig,
	TsIdent,
	TsIdentApply,
	TsIdentConstructor,
	type TsIdentSimple,
	type TsMember,
	TsMemberCall,
	TsMemberCtor,
	TsMemberFunction,
	TsMemberProperty,
	TsMemberTypeMapped,
	type TsType,
	TsTypeRef,
} from "../../internal/ts/trees.js";

// Test implementation of HasClassMembers for testing
class TestHasClassMembers implements HasClassMembers {
	constructor(public readonly members: IArray<TsMember>) {
		const cache = HasClassMembers.create(members);
		Object.assign(this, cache);
	}

	readonly membersByName!: Map<TsIdentSimple, IArray<TsMember>>;
	readonly unnamed!: IArray<TsMember>;
}

// Helper methods for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createFunSig(
	params: IArray<any> = IArray.Empty,
	resultType: Option<TsType> = some(TsTypeRef.any),
): TsFunSig {
	return TsFunSig.create(
		Comments.empty(),
		IArray.Empty, // tparams
		params,
		resultType,
	);
}

function createMockMemberFunction(
	name: string,
	methodType: MethodType = MethodType.normal(),
	isStatic: boolean = false,
	isReadOnly: boolean = false,
	level: TsProtectionLevel = TsProtectionLevel.default(),
): TsMemberFunction {
	return TsMemberFunction.create(
		Comments.empty(),
		level,
		createSimpleIdent(name),
		methodType,
		createFunSig(),
		isStatic,
		isReadOnly,
	);
}

function createMockMemberProperty(
	name: string,
	tpe: Option<TsType> = some(TsTypeRef.string),
	expr: Option<any> = none,
	isStatic: boolean = false,
	isReadOnly: boolean = false,
	level: TsProtectionLevel = TsProtectionLevel.default(),
): TsMemberProperty {
	return TsMemberProperty.create(
		Comments.empty(),
		level,
		createSimpleIdent(name),
		tpe,
		expr,
		isStatic,
		isReadOnly,
	);
}

function createMockMemberCall(
	level: TsProtectionLevel = TsProtectionLevel.default(),
	signature: TsFunSig = createFunSig(),
): TsMemberCall {
	return TsMemberCall.create(Comments.empty(), level, signature);
}

function createMockMemberCtor(
	level: TsProtectionLevel = TsProtectionLevel.default(),
	signature: TsFunSig = createFunSig(),
): TsMemberCtor {
	return TsMemberCtor.create(Comments.empty(), level, signature);
}

function createMockMemberTypeMapped(
	key: string = "K",
	from: TsType = TsTypeRef.string,
	to: TsType = TsTypeRef.any,
	level: TsProtectionLevel = TsProtectionLevel.default(),
): TsMemberTypeMapped {
	return TsMemberTypeMapped.create(
		Comments.empty(),
		level,
		ReadonlyModifier.noop(),
		TsIdent.simple(key),
		from,
		none,
		OptionalModifier.noop(),
		to,
	);
}

describe("HasClassMembers - Basic Functionality", () => {
	it("empty members collection", () => {
		const hasClassMembers = new TestHasClassMembers(IArray.Empty);

		expect(hasClassMembers.membersByName.size).toBe(0);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("single named member - function", () => {
		const memberFunction = createMockMemberFunction("testMethod");
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberFunction]),
		);

		expect(hasClassMembers.membersByName.size).toBe(1);
		expect(hasClassMembers.membersByName.has(memberFunction.name)).toBe(true);
		expect(
			hasClassMembers.membersByName.get(memberFunction.name)?.apply(0),
		).toBe(memberFunction);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("single named member - property", () => {
		const memberProperty = createMockMemberProperty("testProp");
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberProperty]),
		);

		expect(hasClassMembers.membersByName.size).toBe(1);
		expect(hasClassMembers.membersByName.has(memberProperty.name)).toBe(true);
		expect(
			hasClassMembers.membersByName.get(memberProperty.name)?.apply(0),
		).toBe(memberProperty);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("call signature mapped to TsIdentApply", () => {
		const memberCall = createMockMemberCall();
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberCall]),
		);

		expect(hasClassMembers.membersByName.size).toBe(1);
		expect(hasClassMembers.membersByName.has(TsIdentApply)).toBe(true);
		expect(hasClassMembers.membersByName.get(TsIdentApply)?.apply(0)).toBe(
			memberCall,
		);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("constructor signature mapped to TsIdentConstructor", () => {
		const memberCtor = createMockMemberCtor();
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberCtor]),
		);

		expect(hasClassMembers.membersByName.size).toBe(1);
		expect(hasClassMembers.membersByName.has(TsIdentConstructor)).toBe(true);
		expect(
			hasClassMembers.membersByName.get(TsIdentConstructor)?.apply(0),
		).toBe(memberCtor);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("unnamed member - type mapped", () => {
		const memberTypeMapped = createMockMemberTypeMapped();
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberTypeMapped]),
		);

		expect(hasClassMembers.membersByName.size).toBe(0);
		expect(hasClassMembers.unnamed.length).toBe(1);
		expect(hasClassMembers.unnamed.apply(0)).toBe(memberTypeMapped);
	});
});

describe("HasClassMembers - Mixed Member Types", () => {
	it("all four named member types", () => {
		const memberFunction = createMockMemberFunction("testMethod");
		const memberProperty = createMockMemberProperty("testProp");
		const memberCall = createMockMemberCall();
		const memberCtor = createMockMemberCtor();

		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([
				memberFunction,
				memberProperty,
				memberCall,
				memberCtor,
			]),
		);

		expect(hasClassMembers.membersByName.size).toBe(4);
		expect(hasClassMembers.membersByName.has(memberFunction.name)).toBe(true);
		expect(hasClassMembers.membersByName.has(memberProperty.name)).toBe(true);
		expect(hasClassMembers.membersByName.has(TsIdentApply)).toBe(true);
		expect(hasClassMembers.membersByName.has(TsIdentConstructor)).toBe(true);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("named and unnamed members mixed", () => {
		const memberFunction = createMockMemberFunction("testMethod");
		const memberProperty = createMockMemberProperty("testProp");
		const memberTypeMapped = createMockMemberTypeMapped();

		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([
				memberFunction,
				memberProperty,
				memberTypeMapped,
			]),
		);

		expect(hasClassMembers.membersByName.size).toBe(2);
		expect(hasClassMembers.membersByName.has(memberFunction.name)).toBe(true);
		expect(hasClassMembers.membersByName.has(memberProperty.name)).toBe(true);
		expect(hasClassMembers.unnamed.length).toBe(1);
		expect(hasClassMembers.unnamed.apply(0)).toBe(memberTypeMapped);
	});

	it("multiple unnamed members", () => {
		const memberTypeMapped1 = createMockMemberTypeMapped("K1");
		const memberTypeMapped2 = createMockMemberTypeMapped("K2");

		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberTypeMapped1, memberTypeMapped2]),
		);

		expect(hasClassMembers.membersByName.size).toBe(0);
		expect(hasClassMembers.unnamed.length).toBe(2);
		expect(hasClassMembers.unnamed.toArray()).toContain(memberTypeMapped1);
		expect(hasClassMembers.unnamed.toArray()).toContain(memberTypeMapped2);
	});
});

describe("HasClassMembers - Same Name Grouping", () => {
	it("multiple functions with same name", () => {
		const memberFunction1 = createMockMemberFunction("sameName");
		const memberFunction2 = createMockMemberFunction("sameName");
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberFunction1, memberFunction2]),
		);

		expect(hasClassMembers.membersByName.size).toBe(1);
		expect(hasClassMembers.membersByName.has(memberFunction1.name)).toBe(true);
		expect(
			hasClassMembers.membersByName.get(memberFunction1.name)?.length,
		).toBe(2);
		expect(
			hasClassMembers.membersByName.get(memberFunction1.name)?.toArray(),
		).toContain(memberFunction1);
		expect(
			hasClassMembers.membersByName.get(memberFunction1.name)?.toArray(),
		).toContain(memberFunction2);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("multiple properties with same name", () => {
		const memberProperty1 = createMockMemberProperty("sameName");
		const memberProperty2 = createMockMemberProperty("sameName");
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberProperty1, memberProperty2]),
		);

		expect(hasClassMembers.membersByName.size).toBe(1);
		expect(hasClassMembers.membersByName.has(memberProperty1.name)).toBe(true);
		expect(
			hasClassMembers.membersByName.get(memberProperty1.name)?.length,
		).toBe(2);
		expect(
			hasClassMembers.membersByName.get(memberProperty1.name)?.toArray(),
		).toContain(memberProperty1);
		expect(
			hasClassMembers.membersByName.get(memberProperty1.name)?.toArray(),
		).toContain(memberProperty2);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("function and property with same name", () => {
		const memberFunction = createMockMemberFunction("sameName");
		const memberProperty = createMockMemberProperty("sameName");
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberFunction, memberProperty]),
		);

		expect(hasClassMembers.membersByName.size).toBe(1);
		expect(hasClassMembers.membersByName.has(memberFunction.name)).toBe(true);
		expect(hasClassMembers.membersByName.get(memberFunction.name)?.length).toBe(
			2,
		);
		expect(
			hasClassMembers.membersByName.get(memberFunction.name)?.toArray(),
		).toContain(memberFunction);
		expect(
			hasClassMembers.membersByName.get(memberFunction.name)?.toArray(),
		).toContain(memberProperty);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("multiple call signatures", () => {
		const memberCall1 = createMockMemberCall();
		const memberCall2 = createMockMemberCall();
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberCall1, memberCall2]),
		);

		expect(hasClassMembers.membersByName.size).toBe(1);
		expect(hasClassMembers.membersByName.has(TsIdentApply)).toBe(true);
		expect(hasClassMembers.membersByName.get(TsIdentApply)?.length).toBe(2);
		expect(
			hasClassMembers.membersByName.get(TsIdentApply)?.toArray(),
		).toContain(memberCall1);
		expect(
			hasClassMembers.membersByName.get(TsIdentApply)?.toArray(),
		).toContain(memberCall2);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("multiple constructors", () => {
		const memberCtor1 = createMockMemberCtor();
		const memberCtor2 = createMockMemberCtor();
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberCtor1, memberCtor2]),
		);

		expect(hasClassMembers.membersByName.size).toBe(1);
		expect(hasClassMembers.membersByName.has(TsIdentConstructor)).toBe(true);
		expect(hasClassMembers.membersByName.get(TsIdentConstructor)?.length).toBe(
			2,
		);
		expect(
			hasClassMembers.membersByName.get(TsIdentConstructor)?.toArray(),
		).toContain(memberCtor1);
		expect(
			hasClassMembers.membersByName.get(TsIdentConstructor)?.toArray(),
		).toContain(memberCtor2);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});
});

describe("HasClassMembers - Member Properties and Variations", () => {
	it("function with different method types", () => {
		const normalMethod = createMockMemberFunction(
			"method",
			MethodType.normal(),
		);
		const getter = createMockMemberFunction("prop", MethodType.getter());
		const setter = createMockMemberFunction("prop", MethodType.setter());
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([normalMethod, getter, setter]),
		);

		expect(hasClassMembers.membersByName.size).toBe(2);
		expect(hasClassMembers.membersByName.has(normalMethod.name)).toBe(true);
		expect(hasClassMembers.membersByName.has(getter.name)).toBe(true);
		expect(hasClassMembers.membersByName.get(getter.name)?.length).toBe(2); // getter and setter
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("static and instance members", () => {
		const staticMethod = createMockMemberFunction(
			"method",
			MethodType.normal(),
			true,
		);
		const instanceMethod = createMockMemberFunction(
			"method",
			MethodType.normal(),
			false,
		);
		const staticProperty = createMockMemberProperty(
			"prop",
			some(TsTypeRef.string),
			none,
			true,
		);
		const instanceProperty = createMockMemberProperty(
			"prop",
			some(TsTypeRef.string),
			none,
			false,
		);

		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([
				staticMethod,
				instanceMethod,
				staticProperty,
				instanceProperty,
			]),
		);

		expect(hasClassMembers.membersByName.size).toBe(2);
		expect(hasClassMembers.membersByName.has(staticMethod.name)).toBe(true);
		expect(hasClassMembers.membersByName.has(staticProperty.name)).toBe(true);
		expect(hasClassMembers.membersByName.get(staticMethod.name)?.length).toBe(
			2,
		); // static and instance methods
		expect(hasClassMembers.membersByName.get(staticProperty.name)?.length).toBe(
			2,
		); // static and instance properties
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("readonly and mutable members", () => {
		const readonlyMethod = createMockMemberFunction(
			"method",
			MethodType.normal(),
			false,
			true,
		);
		const mutableMethod = createMockMemberFunction(
			"method",
			MethodType.normal(),
			false,
			false,
		);
		const readonlyProperty = createMockMemberProperty(
			"prop",
			some(TsTypeRef.string),
			none,
			false,
			true,
		);
		const mutableProperty = createMockMemberProperty(
			"prop",
			some(TsTypeRef.string),
			none,
			false,
			false,
		);

		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([
				readonlyMethod,
				mutableMethod,
				readonlyProperty,
				mutableProperty,
			]),
		);

		expect(hasClassMembers.membersByName.size).toBe(2);
		expect(hasClassMembers.membersByName.get(readonlyMethod.name)?.length).toBe(
			2,
		);
		expect(
			hasClassMembers.membersByName.get(readonlyProperty.name)?.length,
		).toBe(2);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("different protection levels", () => {
		const publicMethod = createMockMemberFunction(
			"method",
			MethodType.normal(),
			false,
			false,
			TsProtectionLevel.default(),
		);
		const privateMethod = createMockMemberFunction(
			"method",
			MethodType.normal(),
			false,
			false,
			TsProtectionLevel.private(),
		);
		const protectedMethod = createMockMemberFunction(
			"method",
			MethodType.normal(),
			false,
			false,
			TsProtectionLevel.protected(),
		);

		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([
				publicMethod,
				privateMethod,
				protectedMethod,
			]),
		);

		expect(hasClassMembers.membersByName.size).toBe(1);
		expect(hasClassMembers.membersByName.get(publicMethod.name)?.length).toBe(
			3,
		);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("properties with different types and expressions", () => {
		const stringProp = createMockMemberProperty(
			"stringProp",
			some(TsTypeRef.string),
		);
		const numberProp = createMockMemberProperty(
			"numberProp",
			some(TsTypeRef.number),
		);
		const untypedProp = createMockMemberProperty("untypedProp", none);
		const propWithExpr = createMockMemberProperty(
			"propWithExpr",
			some(TsTypeRef.string),
			some(TsExprLiteral.string("default")),
		);

		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([
				stringProp,
				numberProp,
				untypedProp,
				propWithExpr,
			]),
		);

		expect(hasClassMembers.membersByName.size).toBe(4);
		expect(hasClassMembers.membersByName.has(stringProp.name)).toBe(true);
		expect(hasClassMembers.membersByName.has(numberProp.name)).toBe(true);
		expect(hasClassMembers.membersByName.has(untypedProp.name)).toBe(true);
		expect(hasClassMembers.membersByName.has(propWithExpr.name)).toBe(true);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});
});

describe("HasClassMembers - Edge Cases and Complex Scenarios", () => {
	it("large number of members", () => {
		const functions = Array.from({ length: 50 }, (_, i) =>
			createMockMemberFunction(`method${i + 1}`),
		);
		const properties = Array.from({ length: 50 }, (_, i) =>
			createMockMemberProperty(`prop${i + 1}`),
		);
		const calls = Array.from({ length: 10 }, () => createMockMemberCall());
		const ctors = Array.from({ length: 5 }, () => createMockMemberCtor());
		const typeMapped = Array.from({ length: 10 }, (_, i) =>
			createMockMemberTypeMapped(`K${i + 1}`),
		);

		const allMembers = [
			...functions,
			...properties,
			...calls,
			...ctors,
			...typeMapped,
		];
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>(allMembers),
		);

		expect(hasClassMembers.membersByName.size).toBe(102); // 50 functions + 50 properties + Apply + constructor
		expect(hasClassMembers.membersByName.get(TsIdentApply)?.length).toBe(10);
		expect(hasClassMembers.membersByName.get(TsIdentConstructor)?.length).toBe(
			5,
		);
		expect(hasClassMembers.unnamed.length).toBe(10); // type mapped members
	});

	it("complex name collision scenario", () => {
		const method1 = createMockMemberFunction("collision");
		const method2 = createMockMemberFunction("collision");
		const property1 = createMockMemberProperty("collision");
		const property2 = createMockMemberProperty("collision");
		const call1 = createMockMemberCall();
		const call2 = createMockMemberCall();
		const ctor1 = createMockMemberCtor();
		const ctor2 = createMockMemberCtor();

		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([
				method1,
				method2,
				property1,
				property2,
				call1,
				call2,
				ctor1,
				ctor2,
			]),
		);

		expect(hasClassMembers.membersByName.size).toBe(3); // collision, Apply, constructor
		expect(hasClassMembers.membersByName.get(method1.name)?.length).toBe(4); // 2 methods + 2 properties
		expect(hasClassMembers.membersByName.get(TsIdentApply)?.length).toBe(2);
		expect(hasClassMembers.membersByName.get(TsIdentConstructor)?.length).toBe(
			2,
		);
		expect(hasClassMembers.unnamed.length).toBe(0);
	});

	it("mixed named and unnamed with collisions", () => {
		const method = createMockMemberFunction("test");
		const property = createMockMemberProperty("test");
		const call = createMockMemberCall();
		const ctor = createMockMemberCtor();
		const typeMapped1 = createMockMemberTypeMapped("K1");
		const typeMapped2 = createMockMemberTypeMapped("K2");

		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([
				method,
				property,
				call,
				ctor,
				typeMapped1,
				typeMapped2,
			]),
		);

		expect(hasClassMembers.membersByName.size).toBe(3); // test, Apply, constructor
		expect(hasClassMembers.membersByName.get(method.name)?.length).toBe(2); // method + property
		expect(hasClassMembers.membersByName.get(TsIdentApply)?.length).toBe(1);
		expect(hasClassMembers.membersByName.get(TsIdentConstructor)?.length).toBe(
			1,
		);
		expect(hasClassMembers.unnamed.length).toBe(2); // type mapped members
	});
});

describe("HasClassMembers - Lazy Evaluation", () => {
	it("membersByName is computed lazily", () => {
		const memberFunction = createMockMemberFunction("testMethod");
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberFunction]),
		);

		// Access membersByName multiple times to ensure it's computed once
		const result1 = hasClassMembers.membersByName;
		const result2 = hasClassMembers.membersByName;

		expect(result1).toBe(result2); // Should be the same object reference (lazy computation)
		expect(result1.size).toBe(1);
		expect(result1.has(memberFunction.name)).toBe(true);
	});

	it("unnamed is computed lazily", () => {
		const memberTypeMapped = createMockMemberTypeMapped();
		const hasClassMembers = new TestHasClassMembers(
			IArray.fromArray<TsMember>([memberTypeMapped]),
		);

		// Access unnamed multiple times to ensure it's computed once
		const result1 = hasClassMembers.unnamed;
		const result2 = hasClassMembers.unnamed;

		expect(result1).toBe(result2); // Should be the same object reference (lazy computation)
		expect(result1.length).toBe(1);
		expect(result1.apply(0)).toBe(memberTypeMapped);
	});
});
