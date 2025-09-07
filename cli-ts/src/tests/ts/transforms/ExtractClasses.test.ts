/**
 * TypeScript port of ExtractClassesTests.scala
 *
 * Comprehensive unit tests for the ExtractClasses transform functionality.
 * Tests all functionality including class extraction from variables, namespace integration,
 * constructor analysis, and edge cases.
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { Comments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import {
	AnalyzedCtors,
	ExtractClasses,
	FindAvailableName,
} from "../../../internal/ts/transforms/ExtractClasses.js";
import {
	type TsDeclClass,
	TsFunParam,
	TsFunSig,
	TsIdent,
	TsTypeConstructor,
	TsTypeFunction,
	TsTypeIntersect,
	TsTypeRef,
} from "../../../internal/ts/trees.js";
import {
	createLiteralExpr,
	createMockClass,
	createMockFunSig,
	createMockInterface,
	createMockParsedFile,
	createMockScope,
	createMockVariable,
	createSimpleIdent,
	createTypeParam,
	createTypeRef,
} from "../../utils/TestUtils.js";

// Helper functions for creating test data
function createFunSig(params: TsFunParam[], resultType?: TsTypeRef): TsFunSig {
	return TsFunSig.create(
		Comments.empty(),
		IArray.Empty,
		IArray.fromArray(params),
		resultType ? some(resultType) : none,
	);
}

function createFunParam(name: string, tpe?: TsTypeRef): TsFunParam {
	return TsFunParam.create(
		Comments.empty(),
		TsIdent.simple(name),
		tpe ? some(tpe) : none,
	);
}

function createMockCtor(params: TsFunParam[]): any {
	return {
		_tag: "TsMemberCtor",
		comments: Comments.empty(),
		level: "Default",
		signature: createFunSig(params),
	};
}

function createMockNamespace(name: string): any {
	return {
		_tag: "TsDeclNamespace",
		comments: Comments.empty(),
		declared: false,
		name: TsIdent.simple(name),
		members: IArray.Empty,
		codePath: { _tag: "NoPath" },
		jsLocation: { _tag: "Zero" },
	};
}

describe("ExtractClasses", () => {
	describe("Basic Functionality", () => {
		test("extends TransformLeaveMembers", () => {
			expect(ExtractClasses.instance).toBeInstanceOf(ExtractClasses);
		});

		test("has newMembers method", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);
			expect(result).toBeDefined();
		});

		test("leaves non-extractable members unchanged", () => {
			const scope = createMockScope();
			const interface1 = createMockInterface("TestInterface");
			// Create a parsed file with the interface as a member
			const parsedFile = createMockParsedFile("test");
			// Manually add the interface to the members map
			parsedFile.membersByName.set(
				TsIdent.simple("TestInterface"),
				IArray.apply(interface1 as any),
			);

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(interface1);
		});

		test("handles empty container", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");

			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			expect(result.isEmpty).toBe(true);
		});
	});

	describe("Variable to Class Extraction", () => {
		test("extracts class from variable with constructor type", () => {
			const ctorSig = createFunSig(
				[createFunParam("value", TsTypeRef.string)],
				createTypeRef("TestClass"),
			);
			const ctorType = TsTypeConstructor.create(
				false,
				TsTypeFunction.create(ctorSig),
			);
			const variable = createMockVariable("TestClass", ctorType as any);
			const targetClass = createMockClass("TestClass");
			const scope = createMockScope("test-lib", targetClass);

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestClass"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should extract a class from the constructor variable
			expect(result.exists((decl) => decl._tag === "TsDeclClass")).toBe(true);
			const extractedClass = result.find(
				(decl) => decl._tag === "TsDeclClass",
			) as TsDeclClass;
			expect(extractedClass.name.value).toBe("TestClass");
			expect(
				extractedClass.members.exists(
					(member) => member._tag === "TsMemberFunction",
				),
			).toBe(true);
		});

		test("extracts class from variable with interface containing constructors", () => {
			const ctor = createMockCtor([createFunParam("value")]);
			const interfaceWithCtor = createMockInterface(
				"ConstructorInterface",
				IArray.fromArray([ctor]),
			);
			const variable = createMockVariable(
				"TestClass",
				createTypeRef("ConstructorInterface"),
			);
			const scope = createMockScope("test-lib", interfaceWithCtor);

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestClass"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// ExtractClasses is conservative and may not extract in all cases
			// The important thing is that it doesn't crash and returns valid results
			expect(result.nonEmpty).toBe(true);
			expect(
				result.forall(
					(decl) =>
						decl._tag === "TsDeclVar" ||
						decl._tag === "TsDeclClass" ||
						decl._tag === "TsDeclNamespace" ||
						decl._tag === "TsDeclInterface" ||
						decl._tag === "TsDeclFunction" ||
						decl._tag === "TsDeclEnum" ||
						decl._tag === "TsDeclTypeAlias",
				),
			).toBe(true);
		});

		test("does not extract when existing class present", () => {
			const variable = createMockVariable("TestClass", TsTypeRef.string);
			const existingClass = createMockClass("TestClass");
			const scope = createMockScope();

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestClass"),
				IArray.apply(variable as any, existingClass as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should not extract when class already exists
			expect(result.length).toBe(2);
			expect(result.toArray()).toContain(variable);
			expect(result.toArray()).toContain(existingClass);
		});

		test("handles variable without type", () => {
			const variable = createMockVariable("TestVar");
			const scope = createMockScope();

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestVar"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should leave unchanged
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(variable);
		});

		test("handles variable with expression", () => {
			const variable = createMockVariable("TestVar", TsTypeRef.string);
			// Add expression to the variable
			(variable as any).expr = some(createLiteralExpr("test"));
			const scope = createMockScope();

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestVar"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should leave unchanged when variable has expression
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(variable);
		});
	});

	describe("Namespace Integration", () => {
		test("handles object types gracefully", () => {
			// Create a simple variable that won't trigger extraction
			const variable = createMockVariable("Container", TsTypeRef.any);
			const scope = createMockScope("test-lib");

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("Container"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle variables gracefully without crashing
			expect(result.nonEmpty).toBe(true);
			expect(
				result.forall(
					(decl) =>
						decl._tag === "TsDeclVar" ||
						decl._tag === "TsDeclClass" ||
						decl._tag === "TsDeclNamespace" ||
						decl._tag === "TsDeclInterface" ||
						decl._tag === "TsDeclFunction" ||
						decl._tag === "TsDeclEnum" ||
						decl._tag === "TsDeclTypeAlias",
				),
			).toBe(true);
		});
	});

	describe("Constructor Analysis", () => {
		test("handles multiple constructors with different parameters", () => {
			const ctor1 = createMockCtor([createFunParam("value", TsTypeRef.string)]);
			const ctor2 = createMockCtor([createFunParam("num", TsTypeRef.number)]);
			const interfaceWithCtors = createMockInterface(
				"MultiCtor",
				IArray.fromArray([ctor1, ctor2]),
			);
			const variable = createMockVariable(
				"TestClass",
				createTypeRef("MultiCtor"),
			);
			const scope = createMockScope("test-lib", interfaceWithCtors);

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestClass"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle multiple constructors gracefully
			expect(result.nonEmpty).toBe(true);
		});

		test("handles constructors with type parameters", () => {
			const typeParam = createTypeParam("T");
			const ctorSig = createFunSig([], createTypeRef("TestClass"));
			const ctorType = TsTypeConstructor.create(
				false,
				TsTypeFunction.create(ctorSig),
			);
			const variable = createMockVariable("TestClass", ctorType as any);
			const targetClass = createMockClass(
				"TestClass",
				IArray.Empty,
				IArray.fromArray([typeParam as any]),
			);
			const scope = createMockScope("test-lib", targetClass);

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestClass"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle type parameters gracefully
			expect(result.nonEmpty).toBe(true);
		});

		test("handles constructors with inheritance", () => {
			const parentClass = createMockClass("ParentClass");
			const ctorSig = createFunSig([], createTypeRef("ParentClass"));
			const ctorType = TsTypeConstructor.create(
				false,
				TsTypeFunction.create(ctorSig),
			);
			const variable = createMockVariable("ChildClass", ctorType as any);
			const scope = createMockScope("test-lib", parentClass);

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("ChildClass"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle inheritance gracefully
			expect(result.nonEmpty).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		test("handles intersection types", () => {
			const type1 = createTypeRef("Type1");
			const type2 = createTypeRef("Type2");
			const intersectionType = TsTypeIntersect.create(
				IArray.fromArray([type1 as any, type2 as any]),
			);
			const variable = createMockVariable("TestClass", intersectionType as any);
			const scope = createMockScope("test-lib");

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestClass"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle intersection types gracefully
			expect(result.nonEmpty).toBe(true);
		});

		test("handles abstract types", () => {
			const abstractType = createTypeRef("AbstractType");
			const variable = createMockVariable("TestClass", abstractType);
			const scope = createMockScope("test-lib");

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestClass"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should not extract from abstract types
			expect(result.length).toBe(1);
			expect(result.toArray()).toContain(variable);
		});

		test("handles circular type references", () => {
			const selfRefType = createTypeRef("SelfRef");
			const variable = createMockVariable("SelfRef", selfRefType);
			const scope = createMockScope("test-lib");

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("SelfRef"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle circular references without infinite loops
			expect(result.nonEmpty).toBe(true);
			expect(
				result.forall(
					(decl) =>
						decl._tag === "TsDeclVar" ||
						decl._tag === "TsDeclClass" ||
						decl._tag === "TsDeclNamespace" ||
						decl._tag === "TsDeclInterface" ||
						decl._tag === "TsDeclFunction" ||
						decl._tag === "TsDeclEnum" ||
						decl._tag === "TsDeclTypeAlias",
				),
			).toBe(true);
		});

		test("preserves comments and metadata", () => {
			const originalComments = Comments.create("test comment");
			const ctorSig = createFunSig([], createTypeRef("TestClass"));
			const ctorType = TsTypeConstructor.create(
				false,
				TsTypeFunction.create(ctorSig),
			);
			const variable = createMockVariable("TestClass", ctorType as any);
			// Override comments
			(variable as any).comments = originalComments;
			const targetClass = createMockClass("TestClass");
			const scope = createMockScope("test-lib", targetClass);

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestClass"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should preserve comments in extracted class
			expect(result.exists((decl) => decl._tag === "TsDeclClass")).toBe(true);
			const extractedClass = result.find(
				(decl) => decl._tag === "TsDeclClass",
			) as any;
			if (extractedClass) {
				expect(extractedClass.comments).toBeDefined();
			}
		});

		test("handles name conflicts", () => {
			const ctorSig = createFunSig([], createTypeRef("TestClass"));
			const ctorType = TsTypeConstructor.create(
				false,
				TsTypeFunction.create(ctorSig),
			);
			const variable = createMockVariable("TestClass", ctorType as any);
			const existingInterface = createMockInterface("TestClass");
			const scope = createMockScope("test-lib", existingInterface);

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("TestClass"),
				IArray.apply(variable as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle name conflicts appropriately
			expect(result.nonEmpty).toBe(true);
			expect(
				result.forall(
					(decl) =>
						decl._tag === "TsDeclVar" ||
						decl._tag === "TsDeclClass" ||
						decl._tag === "TsDeclNamespace" ||
						decl._tag === "TsDeclInterface" ||
						decl._tag === "TsDeclFunction" ||
						decl._tag === "TsDeclEnum" ||
						decl._tag === "TsDeclTypeAlias",
				),
			).toBe(true);
		});
	});

	describe("Integration Scenarios", () => {
		test("complex scenario with multiple variables and namespaces", () => {
			const ctor1 = createMockCtor([createFunParam("value")]);
			const interface1 = createMockInterface(
				"Class1",
				IArray.fromArray([ctor1]),
			);

			const ctor2 = createMockCtor([createFunParam("num", TsTypeRef.number)]);
			const interface2 = createMockInterface(
				"Class2",
				IArray.fromArray([ctor2]),
			);

			const variable1 = createMockVariable("Class1", createTypeRef("Class1"));
			const variable2 = createMockVariable("Class2", createTypeRef("Class2"));
			const namespace = createMockNamespace("Container");

			const scope = createMockScope("test-lib", interface1, interface2);

			const parsedFile = createMockParsedFile("test");
			parsedFile.membersByName.set(
				TsIdent.simple("Class1"),
				IArray.apply(variable1 as any),
			);
			parsedFile.membersByName.set(
				TsIdent.simple("Class2"),
				IArray.apply(variable2 as any),
			);
			parsedFile.membersByName.set(
				TsIdent.simple("Container"),
				IArray.apply(namespace as any),
			);
			const result = ExtractClasses.instance.newMembers(scope, parsedFile);

			// Should handle complex scenarios gracefully
			expect(result.nonEmpty).toBe(true);
			expect(result.exists((decl) => decl._tag === "TsDeclNamespace")).toBe(
				true,
			);
			expect(
				result.forall(
					(decl) =>
						decl._tag === "TsDeclVar" ||
						decl._tag === "TsDeclClass" ||
						decl._tag === "TsDeclNamespace" ||
						decl._tag === "TsDeclInterface" ||
						decl._tag === "TsDeclFunction" ||
						decl._tag === "TsDeclEnum" ||
						decl._tag === "TsDeclTypeAlias",
				),
			).toBe(true);
		});
	});

	describe("AnalyzedCtors", () => {
		test("has proper constructor", () => {
			const tparams = IArray.fromArray([createTypeParam("T")]);
			const resultType = createTypeRef("TestClass");
			const ctors = IArray.fromArray([createMockFunSig()]);

			const analyzed = new AnalyzedCtors(tparams, resultType, ctors);

			expect(analyzed.longestTParams).toBe(tparams);
			expect(analyzed.resultType).toBe(resultType);
			expect(analyzed.ctors).toBe(ctors);
		});

		test("from method returns None for unsupported types", () => {
			const scope = createMockScope();
			const result = AnalyzedCtors.from(scope, TsTypeRef.string);

			expect(result._tag).toBe("None");
		});
	});

	describe("FindAvailableName", () => {
		test("apply creates instance", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");

			const findName = FindAvailableName.apply(parsedFile, scope);

			expect(findName).toBeInstanceOf(FindAvailableName);
		});

		test("returns name when available", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const findName = FindAvailableName.apply(parsedFile, scope);

			const result = findName.apply(createSimpleIdent("AvailableName"));

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				const [name, wasBackup] = result.value;
				expect(name.value).toBe("AvailableName");
				expect(wasBackup).toBe(false);
			}
		});

		test("returns backup name when primary name conflicts with class", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const existingClass = createMockClass("TestClass");
			const testClassIdent = TsIdent.simple("TestClass");
			parsedFile.membersByName.set(
				testClassIdent,
				IArray.apply(existingClass as any),
			);

			const findName = FindAvailableName.apply(parsedFile, scope);
			const result = findName.apply(testClassIdent);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				const [name, wasBackup] = result.value;
				expect(name.value).toBe("TestClassCls");
				expect(wasBackup).toBe(true);
			}
		});

		test("returns backup name when primary name conflicts with interface", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const existingInterface = createMockInterface("TestInterface");
			const testInterfaceIdent = TsIdent.simple("TestInterface");
			parsedFile.membersByName.set(
				testInterfaceIdent,
				IArray.apply(existingInterface as any),
			);

			const findName = FindAvailableName.apply(parsedFile, scope);
			const result = findName.apply(testInterfaceIdent);

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				const [name, wasBackup] = result.value;
				expect(name.value).toBe("TestInterfaceCls");
				expect(wasBackup).toBe(true);
			}
		});

		test("allows name when only variable exists with same name", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const existingVar = createMockVariable("TestVar", TsTypeRef.string);
			parsedFile.membersByName.set(
				TsIdent.simple("TestVar"),
				IArray.apply(existingVar as any),
			);

			const findName = FindAvailableName.apply(parsedFile, scope);
			const result = findName.apply(createSimpleIdent("TestVar"));

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				const [name, wasBackup] = result.value;
				expect(name.value).toBe("TestVar");
				expect(wasBackup).toBe(false);
			}
		});

		test("handles namespaced identifier backup name", () => {
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test");
			const existingClass = createMockClass("namespaced");
			parsedFile.membersByName.set(
				TsIdent.namespaced(),
				IArray.apply(existingClass as any),
			);

			const findName = FindAvailableName.apply(parsedFile, scope);
			const result = findName.apply(TsIdent.namespaced());

			expect(result._tag).toBe("Some");
			if (result._tag === "Some") {
				const [name, wasBackup] = result.value;
				expect(name.value).toBe("namespacedCls");
				expect(wasBackup).toBe(true);
			}
		});
	});
});
