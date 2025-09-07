/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.AugmentModulesTests
 * Tests for AugmentModules.ts - comprehensive test coverage matching the original Scala implementation
 */

import { none } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { AugmentModules } from "@/internal/ts/modules/AugmentModules.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import {
	type TsAugmentedModule,
	TsAugmentedModule as TsAugmentedModuleConstructor,
	type TsContainerOrDecl,
	TsDeclInterface,
	type TsDeclModule,
	TsDeclModule as TsDeclModuleConstructor,
	TsIdent,
	type TsIdentModule,
	type TsIdentSimple,
	type TsMember,
	type TsParsedFile,
	TsParsedFile as TsParsedFileConstructor,
	TsQIdent,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data specific to AugmentModules tests

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]): TsQIdent {
	return TsQIdent.ofStrings(...parts);
}

function createMockModule(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
): TsDeclModule {
	return TsDeclModuleConstructor.create(
		Comments.empty(),
		false, // declared
		TsIdent.module(none, [name]),
		members,
		CodePath.hasPath(createSimpleIdent(name), createQIdent(name)),
		JsLocation.zero(),
	);
}

function createMockAugmentedModule(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
): TsAugmentedModule {
	return TsAugmentedModuleConstructor.create(
		Comments.empty(),
		TsIdent.module(none, [name]),
		members,
		CodePath.hasPath(
			createSimpleIdent(`${name}_augmented`),
			createQIdent(`${name}_augmented`),
		),
		JsLocation.zero(),
	);
}

function createMockParsedFile(
	members: IArray<TsContainerOrDecl> = IArray.Empty,
): TsParsedFile {
	return TsParsedFileConstructor.create(
		Comments.empty(),
		IArray.Empty, // directives
		members,
		CodePath.noPath(),
	);
}

function createMockScope(): TsTreeScope.Root {
	const libName = TsIdent.librarySimple("test-lib");
	const logger = Logger.DevNull();
	const deps = new Map();
	return TsTreeScope.create(libName, false, deps, logger);
}

function createMockInterface(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
): TsDeclInterface {
	return TsDeclInterface.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		IArray.Empty, // inheritance
		members,
		CodePath.hasPath(createSimpleIdent(name), createQIdent(name)),
	);
}

describe("AugmentModules", () => {
	describe("AugmentModules - Basic Functionality", () => {
		test("target method exists", () => {
			// Test that the target method exists and can be called
			const module = createMockModule("TestModule");
			const scope = createMockScope();
			const result = AugmentModules.target(module, scope);
			expect(result._tag).toBe("HasPath");
		});

		test("apply method exists", () => {
			// Test that the apply method exists and can be called
			const parsedFile = createMockParsedFile();
			const scope = createMockScope();
			const result = AugmentModules.apply(scope)(parsedFile);
			expect(result._tag).toBe("TsParsedFile");
		});
	});

	describe("AugmentModules - Target Determination", () => {
		test("returns module codePath when no exported namespace", () => {
			const module = createMockModule("TestModule");
			const scope = createMockScope();
			const result = AugmentModules.target(module, scope);

			expect(result.codePath.parts.get(result.codePath.parts.length - 1).value).toBe("TestModule");
		});

		test("handles module with empty exports", () => {
			const module = createMockModule("TestModule");
			const scope = createMockScope();
			const result = AugmentModules.target(module, scope);

			expect(result.codePath.parts.get(result.codePath.parts.length - 1).value).toBe("TestModule");
		});
	});

	describe("AugmentModules - File Processing", () => {
		test("processes file with no augmented modules", () => {
			const module = createMockModule("TestModule");
			const parsedFile = createMockParsedFile(IArray.fromArray([module] as TsContainerOrDecl[]));
			const scope = createMockScope();

			const result = AugmentModules.apply(scope)(parsedFile);

			expect(result.members.length).toBe(1);
			expect(result.members.get(0)).toBe(module);
		});

		test("processes file with augmented modules but no matching targets", () => {
			const module = createMockModule("TestModule");
			const augmentedModule = createMockAugmentedModule("OtherModule");
			const parsedFile = createMockParsedFile(
				IArray.fromArray([module, augmentedModule] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const result = AugmentModules.apply(scope)(parsedFile);

			// Should keep both since no matching target
			expect(result.members.length).toBe(2);
		});
	});

	describe("AugmentModules - Edge Cases", () => {
		test("handles empty parsed file", () => {
			const parsedFile = createMockParsedFile(IArray.Empty);
			const scope = createMockScope();

			const result = AugmentModules.apply(scope)(parsedFile);

			expect(result.members.isEmpty).toBe(true);
		});

		test("handles file with only augmented modules", () => {
			const augmentedModule = createMockAugmentedModule("TestModule");
			const parsedFile = createMockParsedFile(
				IArray.fromArray([augmentedModule] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const result = AugmentModules.apply(scope)(parsedFile);

			// Should keep the augmented module since no target to merge with
			expect(result.members.length).toBe(1);
		});

		test("preserves non-module members", () => {
			const interface_ = createMockInterface("TestInterface");
			const parsedFile = createMockParsedFile(
				IArray.fromArray([interface_] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const result = AugmentModules.apply(scope)(parsedFile);

			expect(result.members.length).toBe(1);
			expect(result.members.get(0)).toBe(interface_);
		});
	});

	describe("AugmentModules - Complex Scenarios", () => {
		test("handles mixed content with modules and other declarations", () => {
			const module = createMockModule("TestModule");
			const interface_ = createMockInterface("TestInterface");
			const augmentedModule = createMockAugmentedModule("OtherModule");

			const parsedFile = createMockParsedFile(
				IArray.fromArray([module, interface_, augmentedModule] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const result = AugmentModules.apply(scope)(parsedFile);

			// Should preserve all members since no matching targets
			expect(result.members.length).toBe(3);
		});

		test("handles multiple augmented modules", () => {
			const augmentedModule1 = createMockAugmentedModule("Module1");
			const augmentedModule2 = createMockAugmentedModule("Module2");

			const parsedFile = createMockParsedFile(
				IArray.fromArray([augmentedModule1, augmentedModule2] as TsContainerOrDecl[]),
			);
			const scope = createMockScope();

			const result = AugmentModules.apply(scope)(parsedFile);

			// Should keep both augmented modules
			expect(result.members.length).toBe(2);
		});
	});
});
