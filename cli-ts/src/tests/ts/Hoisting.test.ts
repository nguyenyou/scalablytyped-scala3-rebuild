/**
 * Tests for Hoisting.ts - TypeScript port of org.scalablytyped.converter.internal.ts.HoistingTests
 */

import { describe, expect, it } from "bun:test";
import { none, some } from "fp-ts/Option";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { Hoisting } from "@/internal/ts/Hoisting.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { MethodType } from "@/internal/ts/MethodType.js";
import { TsProtectionLevel } from "@/internal/ts/TsProtectionLevel.js";
import { LoopDetector, MockTsTreeScope } from "@/internal/ts/TsTreeScope.js";

// Import tree types and constructors
import {
	TsFunSig,
	TsIdent,
	TsIdentApply,
	type TsIdentSimple,
	type TsMember,
	TsMemberCall,
	TsMemberFunction,
	TsMemberProperty,
	TsQIdent,
	type TsType,
	TsTypeObject,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// Helper functions for creating test data
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
	return TsTypeRef.create(Comments.empty(), createQIdent(name), tparams);
}

function createMockScope(): MockTsTreeScope {
	return MockTsTreeScope.create() as MockTsTreeScope;
}

function createLoopDetector(): LoopDetector {
	return LoopDetector.initial;
}

function createCodePath(): CodePath {
	return CodePath.hasPath(
		TsIdent.librarySimple("test-lib"),
		TsQIdent.of(createSimpleIdent("TestPath")),
	);
}

function createJsLocation(): JsLocation {
	return JsLocation.zero();
}

function createMockMemberCall(): TsMemberCall {
	return TsMemberCall.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		TsFunSig.create(
			Comments.empty(),
			IArray.Empty,
			IArray.Empty,
			some(TsTypeRef.void),
		),
	);
}

function createMockMemberFunction(name: string): TsMemberFunction {
	return TsMemberFunction.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		MethodType.normal(),
		TsFunSig.create(
			Comments.empty(),
			IArray.Empty,
			IArray.Empty,
			some(TsTypeRef.void),
		),
		false,
		false,
	);
}

function createMockMemberProperty(name: string): TsMemberProperty {
	return TsMemberProperty.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		some(TsTypeRef.string),
		none,
		false,
		false,
	);
}

describe("Hoisting - Basic Functionality", () => {
	it("declared constant should be false", () => {
		expect(Hoisting.declared).toBe(false);
	});
});

describe("Hoisting.memberToDecl", () => {
	it("converts TsMemberCall to TsDeclFunction", () => {
		const ownerCp = createCodePath();
		const ownerLoc = createJsLocation();
		const memberCall = createMockMemberCall();

		const result = Hoisting.memberToDecl(ownerCp, ownerLoc)(memberCall);

		expect(result._tag).toBe("Some");
		if (result._tag === "Some") {
			const decl = result.value;
			expect(decl._tag).toBe("TsDeclFunction");
			if (decl._tag === "TsDeclFunction") {
				const funcDecl = decl as any; // Cast to access TsDeclFunction properties
				expect(funcDecl.comments).toBe(memberCall.comments);
				expect(funcDecl.declared).toBe(Hoisting.declared);
				expect(funcDecl.name).toBe(TsIdentApply);
				expect(funcDecl.signature).toBe(memberCall.signature);
				expect(funcDecl.jsLocation).toEqual(
					JsLocation.add(ownerLoc, TsIdentApply),
				);
				// Check codePath structure instead of exact equality
				const expectedCodePath = ownerCp.add(TsIdentApply);
				expect(funcDecl.codePath._tag).toBe(expectedCodePath._tag);
				expect(funcDecl.codePath.asString).toBe(expectedCodePath.asString);
			}
		}
	});

	it("converts TsMemberFunction with Normal method type to TsDeclFunction", () => {
		const ownerCp = createCodePath();
		const ownerLoc = createJsLocation();
		const memberFunction = createMockMemberFunction("testMethod");

		const result = Hoisting.memberToDecl(ownerCp, ownerLoc)(memberFunction);

		expect(result._tag).toBe("Some");
		if (result._tag === "Some") {
			const decl = result.value;
			expect(decl._tag).toBe("TsDeclFunction");
			if (decl._tag === "TsDeclFunction") {
				const funcDecl = decl as any; // Cast to access TsDeclFunction properties
				expect(funcDecl.comments).toBe(memberFunction.comments);
				expect(funcDecl.declared).toBe(Hoisting.declared);
				expect(funcDecl.name).toBe(memberFunction.name);
				expect(funcDecl.signature).toBe(memberFunction.signature);
				expect(funcDecl.jsLocation).toEqual(
					JsLocation.add(ownerLoc, memberFunction.name),
				);
				// Check codePath structure instead of exact equality
				const expectedCodePath = ownerCp.add(memberFunction.name);
				expect(funcDecl.codePath._tag).toBe(expectedCodePath._tag);
				expect(funcDecl.codePath.asString).toBe(expectedCodePath.asString);
			}
		}
	});

	it("converts TsMemberProperty to TsDeclVar", () => {
		const ownerCp = createCodePath();
		const ownerLoc = createJsLocation();
		const memberProperty = createMockMemberProperty("testProperty");

		const result = Hoisting.memberToDecl(ownerCp, ownerLoc)(memberProperty);

		expect(result._tag).toBe("Some");
		if (result._tag === "Some") {
			const decl = result.value;
			expect(decl._tag).toBe("TsDeclVar");
			if (decl._tag === "TsDeclVar") {
				const varDecl = decl as any; // Cast to access TsDeclVar properties
				expect(varDecl.comments).toBe(memberProperty.comments);
				expect(varDecl.declared).toBe(Hoisting.declared);
				expect(varDecl.readOnly).toBe(memberProperty.isReadOnly);
				expect(varDecl.name).toBe(memberProperty.name);
				expect(varDecl.tpe).toBe(memberProperty.tpe);
				expect(varDecl.expr).toBe(memberProperty.expr);
				expect(varDecl.jsLocation).toEqual(
					JsLocation.add(ownerLoc, memberProperty.name),
				);
				// Check codePath structure instead of exact equality
				const expectedCodePath = ownerCp.add(memberProperty.name);
				expect(varDecl.codePath._tag).toBe(expectedCodePath._tag);
				expect(varDecl.codePath.asString).toBe(expectedCodePath.asString);
			}
		}
	});

	it("returns None for unsupported member types", () => {
		const ownerCp = createCodePath();
		const ownerLoc = createJsLocation();

		// Create a getter function (should be filtered out)
		const getterFunction = createMockMemberFunction("getter");
		const getterWithType = {
			...getterFunction,
			methodType: MethodType.getter(),
		};

		const result = Hoisting.memberToDecl(
			ownerCp,
			ownerLoc,
		)(getterWithType as any);

		expect(result._tag).toBe("None");
	});
});

describe("Hoisting.fromType", () => {
	it("handles TsTypeObject by extracting members", () => {
		const scope = createMockScope();
		const ownerCp = createCodePath();
		const ownerLoc = createJsLocation();
		const ld = createLoopDetector();

		const memberCall = createMockMemberCall();
		const memberFunction = createMockMemberFunction("testMethod");
		const members = IArray.fromArray<TsMember>([memberCall, memberFunction]);
		const typeObject = TsTypeObject.create(Comments.empty(), members);

		const result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, typeObject);

		// Should convert the members that can be converted
		expect(result.length).toBe(2);
		expect(
			result.forall(
				(decl) => decl._tag === "TsDeclFunction" || decl._tag === "TsDeclVar",
			),
		).toBe(true);
	});

	it("returns empty for unsupported types", () => {
		const scope = createMockScope();
		const ownerCp = createCodePath();
		const ownerLoc = createJsLocation();
		const ld = createLoopDetector();

		// Test with various unsupported types
		const unsupportedTypes = [
			TsTypeRef.string,
			TsTypeRef.number,
			TsTypeRef.boolean,
		];

		unsupportedTypes.forEach((tpe) => {
			const result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, tpe);
			expect(result.isEmpty).toBe(true);
		});
	});
});

describe("Hoisting.fromRef", () => {
	it("returns empty for non-existent type reference", () => {
		const scope = createMockScope();
		const ownerCp = createCodePath();
		const ownerLoc = createJsLocation();
		const ld = createLoopDetector();
		const typeRef = createTypeRef("NonExistentType");

		const result = Hoisting.fromRef(scope, ownerCp, ownerLoc, ld, typeRef);

		// Since we don't have a proper scope setup, this should return empty
		expect(result.isEmpty).toBe(true);
	});
});

describe("Hoisting - Integration Tests", () => {
	it("fromType with TsTypeObject containing mixed member types", () => {
		const scope = createMockScope();
		const ownerCp = createCodePath();
		const ownerLoc = createJsLocation();
		const ld = createLoopDetector();

		const memberCall = createMockMemberCall();
		const memberFunction = createMockMemberFunction("testMethod");
		const memberProperty = createMockMemberProperty("testProperty");
		const getterFunction = createMockMemberFunction("getter");
		const getterWithType = {
			...getterFunction,
			methodType: MethodType.getter(),
		};

		const members = IArray.fromArray([
			memberCall,
			memberFunction,
			memberProperty,
			getterWithType as any,
		]);
		const typeObject = TsTypeObject.create(Comments.empty(), members);

		const result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, typeObject);

		// Should convert only the supported members (call, function, property)
		// Getter should be filtered out
		expect(result.length).toBe(3);
		expect(result.filter((decl) => decl._tag === "TsDeclFunction").length).toBe(
			2,
		); // call + function
		expect(result.filter((decl) => decl._tag === "TsDeclVar").length).toBe(1); // property
	});

	it("handles empty TsTypeObject", () => {
		const scope = createMockScope();
		const ownerCp = createCodePath();
		const ownerLoc = createJsLocation();
		const ld = createLoopDetector();

		const emptyTypeObject = TsTypeObject.create(Comments.empty(), IArray.Empty);

		const result = Hoisting.fromType(
			scope,
			ownerCp,
			ownerLoc,
			ld,
			emptyTypeObject,
		);

		expect(result.isEmpty).toBe(true);
	});

	it("handles readonly property correctly", () => {
		const ownerCp = createCodePath();
		const ownerLoc = createJsLocation();
		const readonlyProperty = createMockMemberProperty("readonlyProp");
		const readonlyWithFlag = { ...readonlyProperty, isReadOnly: true };

		const result = Hoisting.memberToDecl(
			ownerCp,
			ownerLoc,
		)(readonlyWithFlag as any);

		expect(result._tag).toBe("Some");
		if (result._tag === "Some") {
			const decl = result.value;
			expect(decl._tag).toBe("TsDeclVar");
			if (decl._tag === "TsDeclVar") {
				const varDecl = decl as any;
				expect(varDecl.readOnly).toBe(true);
			}
		}
	});
});
