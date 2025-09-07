/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.KeepTypesOnlyTests
 * Tests for KeepTypesOnly.ts - comprehensive test coverage matching the original Scala implementation
 */

import { isSome, none, some } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { ExportType } from "@/internal/ts/ExportType.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { MethodType } from "@/internal/ts/MethodType.js";
import { KeepTypesOnly } from "@/internal/ts/modules/KeepTypesOnly.js";
import {
	type TsAugmentedModule,
	TsAugmentedModule as TsAugmentedModuleConstructor,
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclEnum,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclNamespace,
	TsDeclTypeAlias,
	TsDeclVar,
	TsExport,
	TsExporteeTree,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	type TsMember,
	TsMemberCtor,
	TsMemberFunction,
	TsMemberProperty,
	TsProtectionLevel,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data specific to KeepTypesOnly tests

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createMockInterface(name: string): TsDeclInterface {
	return TsDeclInterface.create(
		Comments.empty(),
		false,
		createSimpleIdent(name),
		IArray.Empty, // tparams
		IArray.Empty, // inheritance
		IArray.Empty, // members
		CodePath.noPath(),
	);
}

function createMockTypeAlias(name: string): TsDeclTypeAlias {
	return TsDeclTypeAlias.create(
		Comments.empty(),
		false,
		createSimpleIdent(name),
		IArray.Empty, // tparams
		TsTypeRef.any,
		CodePath.noPath(),
	);
}

function createMockFunction(name: string): TsDeclFunction {
	return TsDeclFunction.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		TsFunSig.create(
			Comments.empty(),
			IArray.Empty, // tparams
			IArray.Empty, // params
			some(TsTypeRef.string), // resultType
		),
		JsLocation.zero(),
		CodePath.noPath(),
	);
}

function createMockVar(name: string): TsDeclVar {
	return TsDeclVar.create(
		Comments.empty(),
		false, // declared
		false, // readOnly
		createSimpleIdent(name),
		some(TsTypeRef.string), // tpe
		none, // expr
		JsLocation.zero(),
		CodePath.noPath(),
	);
}

function createMockClass(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
): TsDeclClass {
	return TsDeclClass.create(
		Comments.empty(),
		false, // declared
		false, // isAbstract
		createSimpleIdent(name),
		IArray.Empty, // tparams
		none, // parent
		IArray.Empty, // implementsInterfaces
		members,
		JsLocation.zero(),
		CodePath.noPath(),
	);
}

function createMockEnum(name: string, isValue: boolean = true): TsDeclEnum {
	return TsDeclEnum.create(
		Comments.empty(),
		false, // declared
		false, // isConst
		createSimpleIdent(name),
		IArray.Empty, // members
		isValue,
		none, // exportedFrom
		JsLocation.zero(),
		CodePath.noPath(),
	);
}

function createMockProperty(name: string): TsMemberProperty {
	return TsMemberProperty.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		some(TsTypeRef.string), // tpe
		none, // expr
		false, // isStatic
		false, // isReadOnly
	);
}

function createMockMethod(name: string): TsMemberFunction {
	return TsMemberFunction.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		MethodType.normal(),
		TsFunSig.create(
			Comments.empty(),
			IArray.Empty, // tparams
			IArray.Empty, // params
			some(TsTypeRef.void), // resultType
		),
		false, // isStatic
		false, // isReadOnly
	);
}

function createMockNamespace(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
): TsDeclNamespace {
	return TsDeclNamespace.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		members,
		CodePath.noPath(),
		JsLocation.zero(),
	);
}

function createMockAugmentedModule(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
): TsAugmentedModule {
	const moduleIdent = TsIdent.module(none, [name]);
	return TsAugmentedModuleConstructor.create(
		Comments.empty(),
		moduleIdent,
		members,
		CodePath.noPath(),
		JsLocation.zero(),
	);
}

describe("KeepTypesOnly", () => {
	describe("Basic Functionality", () => {
		test("apply method exists", () => {
			// Test that the apply method exists and can be called
			const interface_ = createMockInterface("TestInterface");
			const result = KeepTypesOnly.apply(interface_);
			expect(result).toBeDefined();
		});

		test("named method exists", () => {
			// Test that the named method exists and can be called
			const interface_ = createMockInterface("TestInterface");
			const result = KeepTypesOnly.named(interface_);
			expect(result).toBeDefined();
		});
	});

	describe("Type Declarations (Should Keep)", () => {
		test("keeps interfaces unchanged", () => {
			const interface_ = createMockInterface("TestInterface");
			const result = KeepTypesOnly.apply(interface_);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(result.value).toEqual(interface_);
			}
		});

		test("keeps type aliases unchanged", () => {
			const typeAlias = createMockTypeAlias("TestType");
			const result = KeepTypesOnly.apply(typeAlias);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(result.value).toEqual(typeAlias);
			}
		});

		test("keeps enums but sets isValue to false", () => {
			const enumDecl = createMockEnum("TestEnum", true);
			const result = KeepTypesOnly.apply(enumDecl);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				const resultEnum = result.value as TsDeclEnum;
				expect(resultEnum._tag).toBe("TsDeclEnum");
				expect(resultEnum.name.value).toBe("TestEnum");
				expect(resultEnum.isValue).toBe(false); // Should be set to false
			}
		});
	});

	describe("Value Declarations (Should Remove)", () => {
		test("removes function declarations", () => {
			const function_ = createMockFunction("testFunction");
			const result = KeepTypesOnly.apply(function_);

			expect(isSome(result)).toBe(false);
		});

		test("removes variable declarations", () => {
			const variable = createMockVar("testVar");
			const result = KeepTypesOnly.apply(variable);

			expect(isSome(result)).toBe(false);
		});

		test("transforms classes to interfaces", () => {
			const staticProperty = createMockProperty("staticProp");
			const staticPropertyWithStatic = { ...staticProperty, isStatic: true };

			const instanceProperty = createMockProperty("instanceProp");
			const instancePropertyWithStatic = {
				...instanceProperty,
				isStatic: false,
			};

			const constructor = TsMemberCtor.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsFunSig.create(Comments.empty(), IArray.Empty, IArray.Empty, none),
			);

			const staticMethod = createMockMethod("staticMethod");
			const staticMethodWithStatic = { ...staticMethod, isStatic: true };

			const instanceMethod = createMockMethod("instanceMethod");
			const instanceMethodWithStatic = { ...instanceMethod, isStatic: false };

			const constructorMethod = createMockMethod("constructor");

			const members = IArray.fromArray([
				staticPropertyWithStatic as TsMember,
				instancePropertyWithStatic as TsMember,
				constructor as TsMember,
				staticMethodWithStatic as TsMember,
				instanceMethodWithStatic as TsMember,
				constructorMethod as TsMember,
			]);

			const clazz = createMockClass("TestClass", members);
			const result = KeepTypesOnly.apply(clazz);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				const interface_ = result.value as TsDeclInterface;
				expect(interface_._tag).toBe("TsDeclInterface");
				expect(interface_.name.value).toBe("TestClass");
				// Should only keep non-static members, excluding constructors
				expect(interface_.members.length).toBe(2); // instanceProperty and instanceMethod
				expect(
					interface_.members.exists((member) => {
						return (
							member._tag === "TsMemberProperty" &&
							(member as TsMemberProperty).name.value === "instanceProp"
						);
					}),
				).toBe(true);
				expect(
					interface_.members.exists((member) => {
						return (
							member._tag === "TsMemberFunction" &&
							(member as TsMemberFunction).name.value === "instanceMethod"
						);
					}),
				).toBe(true);
			}
		});
	});

	describe("Container Declarations", () => {
		test("filters namespace members recursively", () => {
			const interface_ = createMockInterface("KeepMe");
			const function_ = createMockFunction("RemoveMe");
			const variable = createMockVar("AlsoRemoveMe");
			const typeAlias = createMockTypeAlias("AlsoKeepMe");

			const members = IArray.fromArray([
				interface_,
				function_,
				variable,
				typeAlias,
			] as TsContainerOrDecl[]);
			const namespace = createMockNamespace("TestNamespace", members);
			const result = KeepTypesOnly.apply(namespace);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				const ns = result.value as TsDeclNamespace;
				expect(ns._tag).toBe("TsDeclNamespace");
				expect(ns.name.value).toBe("TestNamespace");
				expect(ns.members.length).toBe(2); // Only interface and typeAlias should remain
				expect(
					ns.members.exists((member) => {
						return (
							member._tag === "TsDeclInterface" &&
							(member as TsDeclInterface).name.value === "KeepMe"
						);
					}),
				).toBe(true);
				expect(
					ns.members.exists((member) => {
						return (
							member._tag === "TsDeclTypeAlias" &&
							(member as TsDeclTypeAlias).name.value === "AlsoKeepMe"
						);
					}),
				).toBe(true);
			}
		});

		test("keeps empty namespace after filtering", () => {
			const function_ = createMockFunction("RemoveMe");
			const variable = createMockVar("AlsoRemoveMe");

			const members = IArray.fromArray([
				function_,
				variable,
			] as TsContainerOrDecl[]);
			const namespace = createMockNamespace("EmptyNamespace", members);
			const result = KeepTypesOnly.apply(namespace);

			expect(isSome(result)).toBe(true); // Namespace is kept even when empty
			if (isSome(result)) {
				const ns = result.value as TsDeclNamespace;
				expect(ns.name.value).toBe("EmptyNamespace");
				expect(ns.members.isEmpty).toBe(true); // All members should be removed
			}
		});

		test("filters augmented module members recursively", () => {
			const interface_ = createMockInterface("KeepMe");
			const function_ = createMockFunction("RemoveMe");

			const members = IArray.fromArray([
				interface_,
				function_,
			] as TsContainerOrDecl[]);
			const augmentedModule = createMockAugmentedModule("TestModule", members);
			const result = KeepTypesOnly.apply(augmentedModule);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				const am = result.value as TsAugmentedModule;
				expect(am._tag).toBe("TsAugmentedModule");
				expect(am.name.value).toBe("TestModule");
				expect(am.members.length).toBe(1); // Only interface should remain
				expect(
					am.members.exists((member) => {
						return (
							member._tag === "TsDeclInterface" &&
							(member as TsDeclInterface).name.value === "KeepMe"
						);
					}),
				).toBe(true);
			}
		});

		test("keeps empty augmented module after filtering", () => {
			const function_ = createMockFunction("RemoveMe");
			const variable = createMockVar("AlsoRemoveMe");

			const members = IArray.fromArray([
				function_,
				variable,
			] as TsContainerOrDecl[]);
			const augmentedModule = createMockAugmentedModule("EmptyModule", members);
			const result = KeepTypesOnly.apply(augmentedModule);

			expect(isSome(result)).toBe(true); // Module is kept even when empty
			if (isSome(result)) {
				const am = result.value as TsAugmentedModule;
				expect(am.name.value).toBe("EmptyModule");
				expect(am.members.isEmpty).toBe(true); // All members should be removed
			}
		});
	});

	describe("Export Handling", () => {
		test("filters exported declarations", () => {
			const interface_ = createMockInterface("ExportedInterface");
			const exportDecl = TsExport.create(
				Comments.empty(),
				false, // typeOnly
				ExportType.named(),
				TsExporteeTree.create(interface_),
			);

			const result = KeepTypesOnly.apply(exportDecl);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				const exportResult = result.value as TsExport;
				expect(exportResult._tag).toBe("TsExport");
				expect(exportResult.exported._tag).toBe("TsExporteeTree");
				const treeExportee = exportResult.exported as TsExporteeTree;
				expect(treeExportee.decl._tag).toBe("TsDeclInterface");
			}
		});

		test("removes exported functions", () => {
			const function_ = createMockFunction("ExportedFunction");
			const exportDecl = TsExport.create(
				Comments.empty(),
				false, // typeOnly
				ExportType.named(),
				TsExporteeTree.create(function_),
			);

			const result = KeepTypesOnly.apply(exportDecl);

			expect(isSome(result)).toBe(false); // Should be removed
		});
	});

	describe("Edge Cases", () => {
		test("handles empty class (no members)", () => {
			const clazz = createMockClass("EmptyClass", IArray.Empty);
			const result = KeepTypesOnly.apply(clazz);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				const interface_ = result.value as TsDeclInterface;
				expect(interface_._tag).toBe("TsDeclInterface");
				expect(interface_.name.value).toBe("EmptyClass");
				expect(interface_.members.isEmpty).toBe(true);
			}
		});

		test("handles class with only static members", () => {
			const staticProperty = createMockProperty("staticProp");
			const staticPropertyWithStatic = { ...staticProperty, isStatic: true };
			const staticMethod = createMockMethod("staticMethod");
			const staticMethodWithStatic = { ...staticMethod, isStatic: true };

			const members = IArray.fromArray([
				staticPropertyWithStatic as TsMember,
				staticMethodWithStatic as TsMember,
			]);

			const clazz = createMockClass("StaticOnlyClass", members);
			const result = KeepTypesOnly.apply(clazz);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				const interface_ = result.value as TsDeclInterface;
				expect(interface_._tag).toBe("TsDeclInterface");
				expect(interface_.name.value).toBe("StaticOnlyClass");
				expect(interface_.members.isEmpty).toBe(true); // All static members should be removed
			}
		});

		test("handles nested containers", () => {
			const innerInterface = createMockInterface("InnerInterface");
			const innerFunction = createMockFunction("InnerFunction");
			const innerMembers = IArray.fromArray([
				innerInterface,
				innerFunction,
			] as TsContainerOrDecl[]);
			const innerNamespace = createMockNamespace(
				"InnerNamespace",
				innerMembers,
			);

			const outerMembers = IArray.fromArray([
				innerNamespace,
			] as TsContainerOrDecl[]);
			const outerNamespace = createMockNamespace(
				"OuterNamespace",
				outerMembers,
			);
			const result = KeepTypesOnly.apply(outerNamespace);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				const ns = result.value as TsDeclNamespace;
				expect(ns._tag).toBe("TsDeclNamespace");
				expect(ns.name.value).toBe("OuterNamespace");
				expect(ns.members.length).toBe(1); // Inner namespace should remain

				const innerNs = ns.members.get(0) as TsDeclNamespace;
				expect(innerNs._tag).toBe("TsDeclNamespace");
				expect(innerNs.name.value).toBe("InnerNamespace");
				expect(innerNs.members.length).toBe(1); // Only interface should remain in inner namespace
			}
		});
	});
});
