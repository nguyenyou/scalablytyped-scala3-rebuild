/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.InferredDefaultModuleTests
 * Tests for InferredDefaultModule.ts - comprehensive test coverage matching the original Scala implementation
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, test } from "bun:test";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { InferredDefaultModule } from "@/internal/ts/modules/InferredDefaultModule.js";
import {
	type TsAugmentedModule,
	TsAugmentedModule as TsAugmentedModuleConstructor,
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclFunction,
	TsDeclInterface,
	type TsDeclModule,
	TsDeclModule as TsDeclModuleConstructor,
	TsDeclTypeAlias,
	TsDeclVar,
	TsFunSig,
	TsIdent,
	type TsIdentModule,
	type TsIdentSimple,
	TsImport,
	type TsImported,
	TsImportedIdent,
	type TsImportee,
	TsImporteeFrom,
	type TsMember,
	type TsParsedFile,
	TsParsedFile as TsParsedFileConstructor,
	TsQIdent,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data specific to InferredDefaultModule tests

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function _createQIdent(...parts: string[]): TsQIdent {
	return TsQIdent.ofStrings(...parts);
}

function createModuleIdent(name: string): TsIdentModule {
	return TsIdent.module(none, [name]);
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
		IArray.Empty, // implementsInterfaces
		members,
		JsLocation.zero(),
		codePath,
	);
}

function createMockFunction(
	name: string,
	codePath: CodePath = CodePath.noPath(),
): TsDeclFunction {
	return TsDeclFunction.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		TsFunSig.create(
			Comments.empty(),
			IArray.Empty, // tparams
			IArray.Empty, // params
			some(TsTypeRef.string),
		),
		JsLocation.zero(),
		codePath,
	);
}

function createMockVar(
	name: string,
	codePath: CodePath = CodePath.noPath(),
): TsDeclVar {
	return TsDeclVar.create(
		Comments.empty(),
		false, // declared
		false, // readOnly
		createSimpleIdent(name),
		some(TsTypeRef.string),
		none, // expr
		JsLocation.zero(),
		codePath,
	);
}

function createMockTypeAlias(
	name: string,
	codePath: CodePath = CodePath.noPath(),
): TsDeclTypeAlias {
	return TsDeclTypeAlias.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		TsTypeRef.string,
		codePath,
	);
}

function createMockModule(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclModule {
	return TsDeclModuleConstructor.create(
		Comments.empty(),
		false, // declared
		createModuleIdent(name),
		members,
		codePath,
		JsLocation.zero(),
		IArray.Empty, // augmentedModules
	);
}

function createMockAugmentedModule(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsAugmentedModule {
	return TsAugmentedModuleConstructor.create(
		Comments.empty(),
		createModuleIdent(name),
		members,
		codePath,
		JsLocation.zero(),
	);
}

function createMockImport(
	imported: IArray<TsImported> = IArray.fromArray([
		TsImportedIdent.create(createSimpleIdent("React")),
	] as TsImported[]),
	from: TsImportee = TsImporteeFrom.create(createModuleIdent("react")),
): TsImport {
	return TsImport.create(
		false, // typeOnly
		imported,
		from,
	);
}

function createMockParsedFile(
	members: IArray<TsContainerOrDecl>,
	codePath: CodePath = CodePath.noPath(),
): TsParsedFile {
	return TsParsedFileConstructor.create(
		Comments.empty(),
		IArray.Empty, // directives
		members,
		codePath,
	);
}

// Helper to create a file that will be treated as a module
function createModuleFile(members: IArray<TsContainerOrDecl>): TsParsedFile {
	// Add an import to make it a module
	const import1 = createMockImport();
	return createMockParsedFile(IArray.fromArray([import1]).concat(members));
}

// Helper to create a file that will NOT be treated as a module
function createNonModuleFile(members: IArray<TsContainerOrDecl>): TsParsedFile {
	return createMockParsedFile(members);
}

function createMockLogger(): Logger<void> {
	return Logger.DevNull();
}

describe("InferredDefaultModule", () => {
	describe("InferredDefaultModule - Basic Functionality", () => {
		test("creates module for regular module file with content", () => {
			const interface1 = createMockInterface("Interface1");
			const function1 = createMockFunction("function1");
			const members = IArray.fromArray([
				interface1,
				function1,
			] as TsContainerOrDecl[]);
			const file = createModuleFile(members);
			const moduleName = createModuleIdent("test-module");
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			expect(result.members.length).toBe(1);
			const module = result.members.get(0) as TsDeclModule;
			expect(module._tag).toBe("TsDeclModule");
			expect(module.name.value).toBe(moduleName.value);
			expect(module.declared).toBe(true);
			expect(module.members.length).toBe(3); // import + interface1 + function1
			expect(module.jsLocation._tag).toBe("Module");
		});

		test("returns original file when not a module", () => {
			const interface1 = createMockInterface("Interface1");
			const members = IArray.fromArray([interface1] as TsContainerOrDecl[]);
			const file = createNonModuleFile(members);
			const moduleName = createModuleIdent("test-module");
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			expect(result).toBe(file);
			expect(result.members.length).toBe(1);
			expect(result.members.get(0)).toBe(interface1);
		});
	});

	describe("InferredDefaultModule - onlyAugments Detection", () => {
		test("returns original file when only contains augments", () => {
			const import1 = createMockImport();
			const augmentedModule = createMockAugmentedModule("existing-module");
			const module = createMockModule("some-module");
			const typeAlias = createMockTypeAlias("TypeAlias");
			const interface1 = createMockInterface("Interface1");
			const members = IArray.fromArray([
				import1,
				augmentedModule,
				module,
				typeAlias,
				interface1,
			] as TsContainerOrDecl[]);
			const file = createNonModuleFile(members); // Already has import1
			const moduleName = createModuleIdent("test-module");
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			expect(result).toBe(file);
			expect(result.members.length).toBe(5);
		});

		test("creates module when contains non-augment content", () => {
			const import1 = createMockImport();
			const augmentedModule = createMockAugmentedModule("existing-module");
			const function1 = createMockFunction("function1"); // This makes it non-augment-only
			const members = IArray.fromArray([
				import1,
				augmentedModule,
				function1,
			] as TsContainerOrDecl[]);
			const file = createNonModuleFile(members); // Already has import1
			const moduleName = createModuleIdent("test-module");
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			expect(result.members.length).toBe(1);
			const module = result.members.get(0) as TsDeclModule;
			expect(module._tag).toBe("TsDeclModule");
			expect(module.name.value).toBe(moduleName.value);
			expect(module.members.length).toBe(3);
		});
	});

	describe("InferredDefaultModule - alreadyExists Detection", () => {
		test("returns original file when module already exists", () => {
			const moduleName = createModuleIdent("test-module");
			const existingModule = createMockModule("test-module");
			const interface1 = createMockInterface("Interface1");
			const import1 = createMockImport();
			const members = IArray.fromArray([
				import1,
				existingModule,
				interface1,
			] as TsContainerOrDecl[]);
			const file = createNonModuleFile(members); // Don't add extra import
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			expect(result).toBe(file);
			expect(result.members.length).toBe(3); // import1 + existingModule + interface1
			expect(result.members.get(1)).toBe(existingModule); // existingModule should be at index 1
		});

		test("returns original file when contains only augments (even with different module name)", () => {
			const moduleName = createModuleIdent("test-module");
			const existingModule = createMockModule("different-module");
			const interface1 = createMockInterface("Interface1");
			const members = IArray.fromArray([
				existingModule,
				interface1,
			] as TsContainerOrDecl[]);
			const file = createModuleFile(members);
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			// Should return original file because it only contains "augments" (modules, interfaces, etc.)
			expect(result).toBe(file);
			expect(result.members.length).toBe(3); // import + existingModule + interface1
		});
	});

	describe("InferredDefaultModule - Edge Cases", () => {
		test("returns original file when only contains imports", () => {
			const members = IArray.Empty;
			const file = createModuleFile(members); // This creates a file with just an import
			const moduleName = createModuleIdent("test-module");
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			// Should return original file because imports are considered "augments"
			expect(result).toBe(file);
			expect(result.members.length).toBe(1); // contains just the import
			expect(result.members.get(0)._tag).toBe("TsImport");
		});

		test("handles file with only imports", () => {
			const import1 = createMockImport();
			const import2 = createMockImport(
				IArray.fromArray([
					TsImportedIdent.create(createSimpleIdent("Vue")),
				] as TsImported[]),
				TsImporteeFrom.create(createModuleIdent("vue")),
			);
			const members = IArray.fromArray([
				import1,
				import2,
			] as TsContainerOrDecl[]);
			const file = createNonModuleFile(members); // Already has imports
			const moduleName = createModuleIdent("test-module");
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			expect(result).toBe(file); // Should return original since only augments
			expect(result.members.length).toBe(2);
		});

		test("returns original file when only contains interfaces", () => {
			const interface1 = createMockInterface("Interface1");
			const members = IArray.fromArray([interface1] as TsContainerOrDecl[]);
			const file = createModuleFile(members);
			const moduleName = TsIdent.module(some("@scope"), [
				"package",
				"submodule",
			]);
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			// Should return original file because interfaces are considered "augments"
			expect(result).toBe(file);
			expect(result.members.length).toBe(2); // import + interface1
		});
	});

	describe("InferredDefaultModule - Comprehensive onlyAugments Testing", () => {
		test("correctly identifies augment-only content with all allowed types", () => {
			const import1 = createMockImport();
			const import2 = createMockImport(
				IArray.fromArray([
					TsImportedIdent.create(createSimpleIdent("All")),
				] as TsImported[]),
				TsImporteeFrom.create(createModuleIdent("everything")),
			);
			const augmentedModule1 = createMockAugmentedModule("module1");
			const augmentedModule2 = createMockAugmentedModule("module2");
			const module1 = createMockModule("internal-module");
			const typeAlias1 = createMockTypeAlias("TypeAlias1");
			const typeAlias2 = createMockTypeAlias("TypeAlias2");
			const interface1 = createMockInterface("Interface1");
			const interface2 = createMockInterface("Interface2");

			const members = IArray.fromArray([
				import1,
				import2,
				augmentedModule1,
				augmentedModule2,
				module1,
				typeAlias1,
				typeAlias2,
				interface1,
				interface2,
			] as TsContainerOrDecl[]);
			const file = createNonModuleFile(members); // Already has import1
			const moduleName = createModuleIdent("test-module");
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			expect(result).toBe(file); // Should return original since only augments
			expect(result.members.length).toBe(9);
		});

		test("detects non-augment content with functions", () => {
			const import1 = createMockImport();
			const typeAlias = createMockTypeAlias("TypeAlias");
			const function1 = createMockFunction("myFunction");
			const members = IArray.fromArray([
				import1,
				typeAlias,
				function1,
			] as TsContainerOrDecl[]);
			const file = createNonModuleFile(members); // Already has import1
			const moduleName = createModuleIdent("test-module");
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			expect(result.members.length).toBe(1);
			const module = result.members.get(0) as TsDeclModule;
			expect(module._tag).toBe("TsDeclModule");
			expect(module.members.length).toBe(3);
		});

		test("detects non-augment content with variables", () => {
			const import1 = createMockImport();
			const interface1 = createMockInterface("Interface1");
			const variable1 = createMockVar("myVariable");
			const members = IArray.fromArray([
				import1,
				interface1,
				variable1,
			] as TsContainerOrDecl[]);
			const file = createNonModuleFile(members); // Already has import1
			const moduleName = createModuleIdent("test-module");
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			expect(result.members.length).toBe(1);
			const module = result.members.get(0) as TsDeclModule;
			expect(module._tag).toBe("TsDeclModule");
			expect(module.members.length).toBe(3);
		});

		test("detects non-augment content with classes", () => {
			const augmentedModule = createMockAugmentedModule("existing-module");
			const typeAlias = createMockTypeAlias("TypeAlias");
			const class1 = createMockClass("MyClass");
			const members = IArray.fromArray([
				augmentedModule,
				typeAlias,
				class1,
			] as TsContainerOrDecl[]);
			const file = createModuleFile(members);
			const moduleName = createModuleIdent("test-module");
			const logger = createMockLogger();

			const result = InferredDefaultModule.apply(file, moduleName, logger);

			expect(result.members.length).toBe(1);
			const module = result.members.get(0) as TsDeclModule;
			expect(module._tag).toBe("TsDeclModule");
			expect(module.members.length).toBe(4); // includes the added import + augmentedModule + typeAlias + class1
		});
	});
});
