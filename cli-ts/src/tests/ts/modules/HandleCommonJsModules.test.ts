/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.HandleCommonJsModulesTests
 * Tests for HandleCommonJsModules.ts - comprehensive test coverage matching the original Scala implementation
 */

import { none, type Option, some } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath, type CodePathHasPath } from "@/internal/ts/CodePath.js";
import { ExportType } from "@/internal/ts/ExportType.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { HandleCommonJsModules } from "@/internal/ts/modules/HandleCommonJsModules.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import {
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclInterface,
	TsDeclModule,
	TsDeclNamespace,
	TsDeclTypeAlias,
	TsExport,
	TsExporteeNames,
	TsIdent,
	type TsIdentLibrary,
	type TsIdentSimple,
	type TsMember,
	TsQIdent,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data specific to HandleCommonJsModules tests

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]): TsQIdent {
	return TsQIdent.ofStrings(...parts);
}

function createMockInterface(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclInterface {
	return TsDeclInterface.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		IArray.Empty, // inheritance
		members,
		codePath,
	);
}

function createMockClass(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclClass {
	return TsDeclClass.create(
		Comments.empty(),
		false, // declared
		false, // isAbstract
		createSimpleIdent(name),
		IArray.Empty, // tparams
		none, // parent
		IArray.Empty, // implements
		members,
		JsLocation.zero(),
		codePath,
	);
}

function createMockNamespace(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclNamespace {
	return TsDeclNamespace.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		members,
		codePath,
		JsLocation.zero(),
	);
}

function createMockModule(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclModule {
	return TsDeclModule.create(
		Comments.empty(),
		false, // declared
		TsIdent.module(none, [name]),
		members,
		codePath,
		JsLocation.zero(),
	);
}

function createCommonJsExport(targetName: string): TsExport {
	return TsExport.create(
		Comments.empty(),
		false, // typeOnly
		ExportType.namespaced(),
		TsExporteeNames.create(
			IArray.fromArray([
				[createQIdent(targetName), none as Option<TsIdentSimple>],
			]),
			none,
		),
	);
}

function createMockTypeAlias(
	name: string,
	alias: TsTypeRef = TsTypeRef.any,
	codePath: CodePath = CodePath.noPath(),
): TsDeclTypeAlias {
	return TsDeclTypeAlias.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		alias,
		codePath,
	);
}

function createMockScope(): TsTreeScope {
	const libName: TsIdentLibrary = TsIdent.librarySimple("test-lib");
	const logger = Logger.DevNull();
	const deps = new Map();
	return TsTreeScope.create(libName, false, deps, logger);
}

function createHasPath(...parts: string[]): CodePathHasPath {
	const lastPart = parts[parts.length - 1];
	return CodePath.hasPath(createSimpleIdent(lastPart), createQIdent(...parts));
}

describe("HandleCommonJsModules", () => {
	describe("HandleCommonJsModules - Basic Functionality", () => {
		test("transformation can be instantiated", () => {
			// Test that the transformation can be instantiated
			const transformation = new HandleCommonJsModules();
			expect(transformation).toBeInstanceOf(HandleCommonJsModules);
		});

		test("handles regular module without CommonJS export", () => {
			const interface1 = createMockInterface("TestInterface");
			const module = createMockModule(
				"TestModule",
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
				createHasPath("test", "TestModule"),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should return unchanged since no CommonJS export pattern
			expect(result).toBe(module);
		});
	});

	describe("HandleCommonJsModules - CommonJS Export Detection", () => {
		test("detects CommonJS export = pattern", () => {
			const targetClass = createMockClass(
				"MyClass",
				IArray.Empty,
				createHasPath("test", "MyClass"),
			);
			const commonJsExport = createCommonJsExport("MyClass");
			const module = createMockModule(
				"TestModule",
				IArray.fromArray([targetClass, commonJsExport] as TsContainerOrDecl[]),
				createHasPath("test", "TestModule"),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should process the CommonJS pattern
			expect(result.members.length).toBeGreaterThan(0);
			expect(result.members.toArray().some((m) => m === commonJsExport)).toBe(
				true,
			); // Should keep the export
		});

		test("ignores non-namespaced exports", () => {
			const targetClass = createMockClass("MyClass");
			const namedExport = TsExport.create(
				Comments.empty(),
				false, // typeOnly
				ExportType.named(),
				TsExporteeNames.create(
					IArray.fromArray([
						[createQIdent("MyClass"), none as Option<TsIdentSimple>],
					]),
					none,
				),
			);
			const module = createMockModule(
				"TestModule",
				IArray.fromArray([targetClass, namedExport] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should return unchanged since not a CommonJS export pattern
			expect(result).toBe(module);
		});
	});

	describe("HandleCommonJsModules - Namespace Flattening", () => {
		test("flattens namespace members when CommonJS export present", () => {
			const nestedInterface = createMockInterface("NestedInterface");
			const nestedTypeAlias = createMockTypeAlias("NestedType");
			const namespace = createMockNamespace(
				"MyClass",
				IArray.fromArray([
					nestedInterface,
					nestedTypeAlias,
				] as TsContainerOrDecl[]),
			);
			const targetClass = createMockClass("MyClass");
			const commonJsExport = createCommonJsExport("MyClass");

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([
					targetClass,
					namespace,
					commonJsExport,
				] as TsContainerOrDecl[]),
				createHasPath("test", "TestModule"),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should flatten namespace members and export them
			expect(result.members.length).toBeGreaterThan(3); // More than original due to flattening
			expect(result.members.toArray().some((m) => m._tag === "TsExport")).toBe(
				true,
			); // Should have exports from flattening
		});

		test("handles module without matching namespace", () => {
			const targetClass = createMockClass("MyClass");
			const otherNamespace = createMockNamespace("OtherClass");
			const commonJsExport = createCommonJsExport("MyClass");

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([
					targetClass,
					otherNamespace,
					commonJsExport,
				] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should return unchanged since no matching namespace
			expect(result).toBe(module);
		});
	});

	describe("HandleCommonJsModules - Reference Erasing", () => {
		test("erases namespace references in type references", () => {
			const nestedInterface = createMockInterface(
				"B",
				IArray.fromArray([
					{
						_tag: "TsMemberProperty",
						comments: Comments.empty(),
						level: { _tag: "Default" },
						name: createSimpleIdent("nested"),
						tpe: some(
							TsTypeRef.create(
								Comments.empty(),
								createQIdent("A", "B"),
								IArray.Empty,
							),
						),
						expr: none,
						isStatic: false,
						isReadOnly: false,
					} as any,
				]),
			);

			const typeAlias = createMockTypeAlias(
				"N",
				TsTypeRef.create(
					Comments.empty(),
					createQIdent("number"),
					IArray.Empty,
				),
			);

			const namespace = createMockNamespace(
				"A",
				IArray.fromArray([nestedInterface, typeAlias] as TsContainerOrDecl[]),
			);

			const targetClass = createMockClass(
				"A",
				IArray.Empty,
				createHasPath("test", "A"),
			);
			const commonJsExport = createCommonJsExport("A");

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([
					targetClass,
					namespace,
					commonJsExport,
				] as TsContainerOrDecl[]),
				createHasPath("test", "TestModule"),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should flatten namespace and keep the original class
			expect(result.members.length).toBeGreaterThan(0);
			expect(result.members.toArray().some((m) => m._tag === "TsExport")).toBe(
				true,
			); // Flattened exports
			expect(result.members.toArray().some((m) => m === targetClass)).toBe(
				true,
			); // Original class preserved
			expect(result.members.toArray().some((m) => m === commonJsExport)).toBe(
				true,
			); // Export statement preserved
		});

		test("handles import alias pattern", () => {
			// Tests the pattern: export import Types = A;
			const targetClass = createMockClass("A");
			const importAlias = {
				_tag: "TsImport",
				typeOnly: false,
				imported: IArray.fromArray([
					{ _tag: "TsImportedIdent", ident: createSimpleIdent("Types") },
				]),
				from: { _tag: "TsImporteeLocal", arg: createQIdent("A") },
			} as any;

			const exportedImport = TsExport.create(
				Comments.empty(),
				false, // typeOnly
				ExportType.named(),
				{ _tag: "TsExporteeTree", decl: importAlias } as any,
			);

			const namespace = createMockNamespace(
				"A",
				IArray.fromArray([exportedImport] as TsContainerOrDecl[]),
			);
			const commonJsExport = createCommonJsExport("A");

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([
					targetClass,
					namespace,
					commonJsExport,
				] as TsContainerOrDecl[]),
				createHasPath("test", "TestModule"),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should handle import alias transformation
			expect(result.members.length).toBeGreaterThan(0);
		});

		test("filters redundant type aliases", () => {
			// Tests filtering of type N = A.N pattern
			const targetClass = createMockClass("A");
			const redundantTypeAlias = createMockTypeAlias(
				"N",
				TsTypeRef.create(
					Comments.empty(),
					createQIdent("A", "N"),
					IArray.Empty,
				),
			);
			const namespace = createMockNamespace("A");
			const commonJsExport = createCommonJsExport("A");

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([
					targetClass,
					namespace,
					redundantTypeAlias,
					commonJsExport,
				] as TsContainerOrDecl[]),
				createHasPath("test", "TestModule"),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should filter out redundant type alias
			expect(
				result.members.toArray().some((m) => m === redundantTypeAlias),
			).toBe(false);
		});

		test("preserves non-redundant type aliases", () => {
			const targetClass = createMockClass("A");
			const nonRedundantTypeAlias = createMockTypeAlias(
				"Different",
				TsTypeRef.create(
					Comments.empty(),
					createQIdent("A", "N"),
					IArray.Empty,
				),
			);
			const namespace = createMockNamespace("A");
			const commonJsExport = createCommonJsExport("A");

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([
					targetClass,
					namespace,
					nonRedundantTypeAlias,
					commonJsExport,
				] as TsContainerOrDecl[]),
				createHasPath("test", "TestModule"),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should preserve non-redundant type alias (it may be reordered)
			expect(
				result.members.toArray().some((m) => {
					if (m._tag === "TsDeclTypeAlias") {
						const alias = m as TsDeclTypeAlias;
						return alias.name.value === "Different";
					}
					return false;
				}),
			).toBe(true);
		});
	});

	describe("HandleCommonJsModules - Integration Testing", () => {
		test("works with realistic CommonJS module structure", () => {
			// Simulates a real CommonJS module like those found in npm packages
			const mainClass = createMockClass(
				"MyLibrary",
				IArray.fromArray([
					{
						_tag: "TsMemberProperty",
						comments: Comments.empty(),
						level: { _tag: "Default" },
						name: createSimpleIdent("version"),
						tpe: some(TsTypeRef.string),
						expr: none,
						isStatic: false,
						isReadOnly: true,
					} as any,
				]),
				createHasPath("mylib", "MyLibrary"),
			);

			const helperInterface = createMockInterface("Helper");
			const utilsType = createMockTypeAlias("Utils", TsTypeRef.any);

			const namespace = createMockNamespace(
				"MyLibrary",
				IArray.fromArray([helperInterface, utilsType] as TsContainerOrDecl[]),
				createHasPath("mylib", "MyLibrary"),
			);

			const commonJsExport = createCommonJsExport("MyLibrary");

			const module = createMockModule(
				"mylib",
				IArray.fromArray([
					mainClass,
					namespace,
					commonJsExport,
				] as TsContainerOrDecl[]),
				createHasPath("mylib"),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should properly transform the CommonJS module
			expect(result.members.length).toBeGreaterThan(3); // Should have flattened content
			expect(result.members.toArray().some((m) => m === mainClass)).toBe(true); // Original class preserved
			expect(result.members.toArray().some((m) => m === commonJsExport)).toBe(
				true,
			); // Export preserved
			expect(result.members.toArray().some((m) => m._tag === "TsExport")).toBe(
				true,
			); // Flattened exports added
		});

		test("handles nested namespace structures", () => {
			const innerInterface = createMockInterface("InnerInterface");
			const innerNamespace = createMockNamespace(
				"Inner",
				IArray.fromArray([innerInterface] as TsContainerOrDecl[]),
			);
			const outerNamespace = createMockNamespace(
				"Outer",
				IArray.fromArray([innerNamespace] as TsContainerOrDecl[]),
			);
			const targetClass = createMockClass("Outer");
			const commonJsExport = createCommonJsExport("Outer");

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([
					targetClass,
					outerNamespace,
					commonJsExport,
				] as TsContainerOrDecl[]),
				createHasPath("test", "TestModule"),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should handle nested structures appropriately
			expect(result.members.length).toBeGreaterThan(0);
		});

		test("handles multiple target exports", () => {
			const targetClass1 = createMockClass("Target1");
			const targetClass2 = createMockClass("Target2");
			const namespace1 = createMockNamespace("Target1");
			const namespace2 = createMockNamespace("Target2");
			const commonJsExport1 = createCommonJsExport("Target1");
			const commonJsExport2 = createCommonJsExport("Target2");

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([
					targetClass1,
					targetClass2,
					namespace1,
					namespace2,
					commonJsExport1,
					commonJsExport2,
				] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should only process the first CommonJS export pattern found
			expect(result.members.length).toBeGreaterThan(0);
		});

		test("handles empty namespace with CommonJS export", () => {
			const targetClass = createMockClass("EmptyTarget");
			const emptyNamespace = createMockNamespace("EmptyTarget", IArray.Empty);
			const commonJsExport = createCommonJsExport("EmptyTarget");

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([
					targetClass,
					emptyNamespace,
					commonJsExport,
				] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should handle empty namespace gracefully
			expect(result.members.length).toBeGreaterThan(0);
			expect(result.members.toArray().some((m) => m === targetClass)).toBe(
				true,
			);
			expect(result.members.toArray().some((m) => m === commonJsExport)).toBe(
				true,
			);
		});

		test("preserves module structure when no namespace matches", () => {
			const targetClass = createMockClass("Target");
			const differentNamespace = createMockNamespace("Different");
			const commonJsExport = createCommonJsExport("Target");

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([
					targetClass,
					differentNamespace,
					commonJsExport,
				] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should return unchanged since no matching namespace
			expect(result).toBe(module);
		});

		test("handles complex export patterns with multiple identifiers", () => {
			// Test case where export has multiple identifiers (should not match)
			const targetClass = createMockClass("Target");
			const complexExport = TsExport.create(
				Comments.empty(),
				false, // typeOnly
				ExportType.namespaced(),
				TsExporteeNames.create(
					IArray.fromArray([
						[createQIdent("Target"), none as Option<TsIdentSimple>],
						[createQIdent("Other"), none as Option<TsIdentSimple>],
					]),
					none,
				),
			);

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([targetClass, complexExport] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should return unchanged since export pattern doesn't match
			expect(result).toBe(module);
		});

		test("handles export with alias (should not match)", () => {
			const targetClass = createMockClass("Target");
			const aliasedExport = TsExport.create(
				Comments.empty(),
				false, // typeOnly
				ExportType.namespaced(),
				TsExporteeNames.create(
					IArray.fromArray([
						[createQIdent("Target"), some(createSimpleIdent("Alias"))],
					]),
					none,
				),
			);

			const module = createMockModule(
				"TestModule",
				IArray.fromArray([targetClass, aliasedExport] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const transformation = new HandleCommonJsModules();
			const result = transformation.enterTsDeclModule(scope)(module);

			// Should return unchanged since export has alias
			expect(result).toBe(module);
		});
	});
});
