/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.ModuleAsGlobalNamespaceTests
 * Tests for ModuleAsGlobalNamespace.ts - comprehensive test coverage matching the original Scala implementation
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, test } from "bun:test";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { ModuleAsGlobalNamespace } from "@/internal/ts/modules/ModuleAsGlobalNamespace.js";
import {
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclFunction,
	TsDeclInterface,
	type TsDeclModule,
	TsDeclModule as TsDeclModuleConstructor,
	type TsDeclNamespace,
	TsDeclNamespace as TsDeclNamespaceConstructor,
	TsExportAsNamespace,
	TsFunSig,
	TsIdent,
	type TsIdentLibrary,
	type TsIdentSimple,
	type TsMember,
	type TsParsedFile,
	TsParsedFile as TsParsedFileConstructor,
	TsQIdent,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data specific to ModuleAsGlobalNamespace tests

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createLibraryIdent(name: string): TsIdentLibrary {
	return TsIdent.librarySimple(name);
}

function createModuleIdent(name: string) {
	return TsIdent.module(none, [name]);
}

function createMockInterface(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	codePath: CodePath = CodePath.hasPath(
		createSimpleIdent("test"),
		TsQIdent.ofStrings("interface"),
	),
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
	codePath: CodePath = CodePath.hasPath(
		createSimpleIdent("test"),
		TsQIdent.ofStrings("class"),
	),
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

function createMockModule(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
	codePath: CodePath = CodePath.hasPath(
		createSimpleIdent("test"),
		TsQIdent.ofStrings("module"),
	),
): TsDeclModule {
	return TsDeclModuleConstructor.create(
		Comments.empty(),
		false, // declared
		createModuleIdent(name),
		members,
		codePath,
		JsLocation.zero(),
	);
}

function createMockNamespace(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
	codePath: CodePath = CodePath.hasPath(
		createSimpleIdent("test"),
		TsQIdent.ofStrings("namespace"),
	),
): TsDeclNamespace {
	return TsDeclNamespaceConstructor.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		members,
		codePath,
		JsLocation.zero(),
	);
}

function createMockParsedFile(
	members: IArray<TsContainerOrDecl>,
	codePath: CodePath = CodePath.hasPath(
		createSimpleIdent("test"),
		TsQIdent.ofStrings("file"),
	),
): TsParsedFile {
	return TsParsedFileConstructor.create(
		Comments.empty(),
		IArray.Empty, // directives
		members,
		codePath,
	);
}

function createExportAsNamespace(name: string) {
	return TsExportAsNamespace.create(createSimpleIdent(name));
}

function createMockFunction(
	name: string,
	codePath: CodePath = CodePath.hasPath(
		createSimpleIdent("test"),
		TsQIdent.ofStrings("function"),
	),
): TsDeclFunction {
	return TsDeclFunction.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		TsFunSig.create(
			Comments.empty(),
			IArray.Empty, // tparams
			IArray.Empty, // params
			some(
				TsTypeRef.create(
					Comments.empty(),
					TsQIdent.ofStrings("void"),
					IArray.Empty,
				),
			),
		),
		JsLocation.zero(),
		codePath,
	);
}

describe("ModuleAsGlobalNamespace", () => {
	describe("ModuleAsGlobalNamespace - Basic Functionality", () => {
		test("returns original file when no top-level module exists", () => {
			const libName = createLibraryIdent("test-lib");
			const interface1 = createMockInterface("TestInterface");
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result).toBe(file);
			expect(result.members.length).toBe(1);
			expect((result.members.get(0) as TsDeclInterface).name.value).toBe(
				"TestInterface",
			);
		});

		test("returns original file when top-level module has no export-as-namespace", () => {
			const libName = createLibraryIdent("test-lib");
			const interface1 = createMockInterface("TestInterface");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([topLevelModule] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result).toBe(file);
			expect(result.members.length).toBe(1);
			expect((result.members.get(0) as TsDeclModule).name.value).toBe(
				"test-lib",
			);
		});
	});

	describe("ModuleAsGlobalNamespace - Export As Namespace Detection", () => {
		test("creates global namespace when export-as-namespace is present in module", () => {
			const libName = createLibraryIdent("test-lib");
			const interface1 = createMockInterface("TestInterface");
			const exportAsNamespace = createExportAsNamespace("MyGlobal");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([
					interface1,
					exportAsNamespace,
				] as TsContainerOrDecl[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([topLevelModule] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(2);

			// First member should be the global namespace
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);
			expect(globalNamespace.members.length).toBeGreaterThan(0);

			// Second member should be the original module
			const originalModule = result.members.get(1) as TsDeclModule;
			expect(originalModule._tag).toBe("TsDeclModule");
			expect(originalModule.name.value).toBe("test-lib");
		});

		test("creates global namespace when export-as-namespace is present in file", () => {
			const libName = createLibraryIdent("test-lib");
			const interface1 = createMockInterface("TestInterface");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const exportAsNamespace = createExportAsNamespace("MyGlobal");
			const file = createMockParsedFile(
				IArray.fromArray([
					topLevelModule,
					exportAsNamespace,
				] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(3); // global namespace + original module + file export

			// First member should be the global namespace
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);
			expect(globalNamespace.members.length).toBeGreaterThan(0);
		});
	});

	describe("ModuleAsGlobalNamespace - Default Export Handling", () => {
		test("creates type alias when default export exists", () => {
			const libName = createLibraryIdent("test-lib");
			const _defaultClass = createMockClass("DefaultClass");
			const defaultClassWithDefaultName = createMockClass("default");
			const exportAsNamespace = createExportAsNamespace("MyGlobal");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([
					defaultClassWithDefaultName,
					exportAsNamespace,
				] as TsContainerOrDecl[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([topLevelModule] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(2);

			// First member should be the global namespace
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);
			expect(globalNamespace.members.length).toBeGreaterThan(0);

			// Second member should be the original module
			const originalModule = result.members.get(1) as TsDeclModule;
			expect(originalModule._tag).toBe("TsDeclModule");
			expect(originalModule.name.value).toBe("test-lib");
		});

		test("creates namespace when no default export exists", () => {
			const libName = createLibraryIdent("test-lib");
			const interface1 = createMockInterface("TestInterface");
			const function1 = createMockFunction("testFunction");
			const exportAsNamespace = createExportAsNamespace("MyGlobal");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([
					interface1,
					function1,
					exportAsNamespace,
				] as TsContainerOrDecl[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([topLevelModule] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(2);

			// First member should be the global namespace
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);

			// The global namespace should contain a namespace with the export name
			expect(globalNamespace.members.length).toBeGreaterThan(0);
			const innerNamespace = globalNamespace.members.get(0) as TsDeclNamespace;
			expect(innerNamespace._tag).toBe("TsDeclNamespace");
			expect(innerNamespace.name.value).toBe("MyGlobal");
		});
	});

	describe("ModuleAsGlobalNamespace - Complex Scenarios", () => {
		test("handles multiple export-as-namespace declarations", () => {
			const libName = createLibraryIdent("test-lib");
			const interface1 = createMockInterface("TestInterface");
			const exportAsNamespace1 = createExportAsNamespace("Global1");
			const exportAsNamespace2 = createExportAsNamespace("Global2");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([
					interface1,
					exportAsNamespace1,
					exportAsNamespace2,
				] as TsContainerOrDecl[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([topLevelModule] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(2);

			// First member should be the global namespace
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);

			// Should contain multiple global declarations
			expect(globalNamespace.members.length).toBe(2); // One for each export-as-namespace
		});

		test("handles mixed module and file export-as-namespace", () => {
			const libName = createLibraryIdent("test-lib");
			const interface1 = createMockInterface("TestInterface");
			const moduleExport = createExportAsNamespace("ModuleGlobal");
			const fileExport = createExportAsNamespace("FileGlobal");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([interface1, moduleExport] as TsContainerOrDecl[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([topLevelModule, fileExport] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(3); // global namespace + original module + file export

			// First member should be the global namespace
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);

			// Should contain multiple global declarations
			expect(globalNamespace.members.length).toBe(2); // One for module export, one for file export
		});

		test("preserves original file structure when no transformations needed", () => {
			const libName = createLibraryIdent("test-lib");
			const interface1 = createMockInterface("TestInterface");
			const function1 = createMockFunction("testFunction");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([interface1, function1] as TsContainerOrDecl[]),
			);
			const otherInterface = createMockInterface("OtherInterface");
			const file = createMockParsedFile(
				IArray.fromArray([
					topLevelModule,
					otherInterface,
				] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			// Should return the original file unchanged
			expect(result).toBe(file);
			expect(result.members.length).toBe(2);
			expect((result.members.get(0) as TsDeclModule).name.value).toBe(
				"test-lib",
			);
			expect((result.members.get(1) as TsDeclInterface).name.value).toBe(
				"OtherInterface",
			);
		});
	});

	describe("ModuleAsGlobalNamespace - Edge Cases", () => {
		test("handles empty module with export-as-namespace", () => {
			const libName = createLibraryIdent("test-lib");
			const exportAsNamespace = createExportAsNamespace("EmptyGlobal");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([exportAsNamespace] as TsContainerOrDecl[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([topLevelModule] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(2);

			// First member should be the global namespace
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);

			// Should contain one global declaration for the empty namespace
			expect(globalNamespace.members.length).toBe(1);
		});

		test("handles module with only default export and export-as-namespace", () => {
			const libName = createLibraryIdent("test-lib");
			const defaultClass = createMockClass("default");
			const exportAsNamespace = createExportAsNamespace("DefaultGlobal");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([
					defaultClass,
					exportAsNamespace,
				] as TsContainerOrDecl[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([topLevelModule] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(2);

			// First member should be the global namespace
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);

			// Should contain the renamed default export
			expect(globalNamespace.members.length).toBe(1);
		});

		test("handles nested modules correctly", () => {
			const libName = createLibraryIdent("test-lib");
			const innerInterface = createMockInterface("InnerInterface");
			const innerModule = createMockModule(
				"inner",
				IArray.fromArray([innerInterface] as TsContainerOrDecl[]),
			);
			const exportAsNamespace = createExportAsNamespace("NestedGlobal");
			const topLevelModule = createMockModule(
				"test-lib",
				IArray.fromArray([
					innerModule,
					exportAsNamespace,
				] as TsContainerOrDecl[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([topLevelModule] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(2);

			// First member should be the global namespace
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);

			// Should contain the nested structure
			expect(globalNamespace.members.length).toBe(1);
		});

		test("handles file with no modules but with export-as-namespace", () => {
			const libName = createLibraryIdent("nonexistent-lib");
			const interface1 = createMockInterface("TestInterface");
			const exportAsNamespace = createExportAsNamespace("OrphanGlobal");
			const file = createMockParsedFile(
				IArray.fromArray([
					interface1,
					exportAsNamespace,
				] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			// Should return original file since no top-level module exists
			expect(result).toBe(file);
			expect(result.members.length).toBe(2);
		});
	});

	describe("ModuleAsGlobalNamespace - Comprehensive Integration", () => {
		test("handles complex file with multiple modules and exports", () => {
			const libName = createLibraryIdent("complex-lib");

			// Create main module with various content
			const mainInterface = createMockInterface("MainInterface");
			const mainClass = createMockClass("MainClass");
			const mainFunction = createMockFunction("mainFunction");
			const mainExport = createExportAsNamespace("ComplexGlobal");
			const mainModule = createMockModule(
				"complex-lib",
				IArray.fromArray([
					mainInterface,
					mainClass,
					mainFunction,
					mainExport,
				] as TsContainerOrDecl[]),
			);

			// Create other content
			const otherInterface = createMockInterface("OtherInterface");
			const otherNamespace = createMockNamespace("OtherNamespace");
			const fileExport = createExportAsNamespace("FileGlobal");

			const file = createMockParsedFile(
				IArray.fromArray([
					mainModule,
					otherInterface,
					otherNamespace,
					fileExport,
				] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(5); // global + main module + other interface + other namespace + file export

			// First member should be the global namespace
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);

			// Should contain multiple global declarations
			expect(globalNamespace.members.length).toBe(2); // One for main module export, one for file export
		});

		test("maintains code path consistency", () => {
			const libName = createLibraryIdent("path-test-lib");
			const interface1 = createMockInterface("TestInterface");
			const exportAsNamespace = createExportAsNamespace("PathGlobal");
			const topLevelModule = createMockModule(
				"path-test-lib",
				IArray.fromArray([
					interface1,
					exportAsNamespace,
				] as TsContainerOrDecl[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([topLevelModule] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(2);

			// Check that the global namespace has the correct code path
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);

			// The global namespace should have a proper code path
			expect(globalNamespace.codePath._tag).toBe("HasPath");
		});

		test("preserves comments and metadata", () => {
			const libName = createLibraryIdent("comment-test-lib");
			const interface1 = createMockInterface("TestInterface");
			const exportAsNamespace = createExportAsNamespace("CommentGlobal");

			// Create module with comments
			const moduleWithComments = createMockModule(
				"comment-test-lib",
				IArray.fromArray([
					interface1,
					exportAsNamespace,
				] as TsContainerOrDecl[]),
			);

			const file = createMockParsedFile(
				IArray.fromArray([moduleWithComments] as TsContainerOrDecl[]),
			);

			const result = ModuleAsGlobalNamespace.apply(libName, file);

			expect(result.members.length).toBe(2);

			// Check that the transformation preserves the structure
			const globalNamespace = result.members.get(0) as TsDeclNamespace;
			expect(globalNamespace._tag).toBe("TsDeclNamespace");
			expect(globalNamespace.name).toBe(TsIdent.Global);

			// Should contain the transformed content
			expect(globalNamespace.members.length).toBe(1);
		});
	});
});
