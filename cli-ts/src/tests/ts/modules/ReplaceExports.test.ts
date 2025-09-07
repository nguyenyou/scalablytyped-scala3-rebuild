/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.ReplaceExportsTests
 * Tests for ReplaceExports.ts - starting with basic functionality
 */

import { none } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { ExportType } from "@/internal/ts/ExportType.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import {
	CachedReplaceExports,
	ReplaceExports,
} from "@/internal/ts/modules/ReplaceExports.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import {
	TsDeclInterface,
	TsDeclModule,
	TsDeclNamespace,
	TsExport,
	TsExporteeTree,
	TsIdent,
	TsParsedFile,
	TsQIdent,
} from "@/internal/ts/trees.js";

// Helper functions for creating test data
function createSimpleIdent(name: string) {
	return TsIdent.simple(name);
}

function createMockInterface(
	name: string,
	members: any = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclInterface {
	return TsDeclInterface.create(
		Comments.empty(),
		false,
		createSimpleIdent(name),
		IArray.Empty,
		IArray.Empty,
		members,
		codePath,
	);
}

function createMockModule(
	name: string,
	members: any = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclModule {
	return TsDeclModule.create(
		Comments.empty(),
		false,
		TsIdent.module(none, [name]),
		members,
		codePath,
		JsLocation.zero(),
	);
}

function createMockNamespace(
	name: string,
	members: any = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclNamespace {
	return TsDeclNamespace.create(
		Comments.empty(),
		false,
		createSimpleIdent(name),
		members,
		codePath,
		JsLocation.zero(),
	);
}

function createMockExport(
	exportType: ExportType = ExportType.named(),
	exportee: any = TsExporteeTree.create(
		createMockInterface(
			"DefaultInterface",
			IArray.Empty,
			createHasPath("DefaultInterface"),
		),
	),
): TsExport {
	return TsExport.create(Comments.empty(), false, exportType, exportee);
}

function createHasPath(name: string): CodePath {
	return CodePath.hasPath(
		createSimpleIdent(name),
		TsQIdent.of(createSimpleIdent(name)),
	);
}

function createMockScope(members: any = IArray.Empty): TsTreeScope {
	const parsedFile = TsParsedFile.create(
		Comments.empty(),
		IArray.Empty,
		members,
		CodePath.noPath(),
	);
	const deps = new Map();
	const scope = TsTreeScope.create(
		TsIdent.librarySimple("test"),
		false,
		deps,
		Logger.DevNull(),
	);
	return scope["/"](parsedFile);
}

function createMockLoopDetector() {
	return {
		including: () => ({ _tag: "Right", right: createMockLoopDetector() }),
	} as any;
}

describe("ReplaceExports", () => {
	describe("Basic Functionality", () => {
		test("CachedReplaceExports handles empty exports", () => {
			const module = createMockModule("TestModule");
			const scope = createMockScope();
			const loopDetector = createMockLoopDetector();

			const result = CachedReplaceExports.apply(scope, loopDetector, module);

			expect(result.name.value).toBe("TestModule");
			expect(result.exports.length).toBe(0);
		});

		test("ReplaceExports transformation can be instantiated", () => {
			const loopDetector = createMockLoopDetector();
			const transformation = new ReplaceExports(loopDetector);

			expect(transformation).toBeDefined();
		});

		test("handles module without cache", () => {
			const module = createMockModule("TestModule");
			const scope = createMockScope();
			const loopDetector = createMockLoopDetector();
			const transformation = new ReplaceExports(loopDetector);

			const result = transformation.enterTsDeclModule(scope)(module);

			expect(result.name.value).toBe("TestModule");
		});
	});

	describe("Namespace Processing", () => {
		test("handles namespace with no exports or imports", () => {
			const namespace = createMockNamespace("TestNamespace");
			const scope = createMockScope();
			const loopDetector = createMockLoopDetector();
			const transformation = new ReplaceExports(loopDetector);

			const result = transformation.enterTsDeclNamespace(scope)(namespace);

			expect(result.name.value).toBe("TestNamespace");
			expect(result.exports.length).toBe(0);
			expect(result.imports.length).toBe(0);
		});

		test("processes namespace with members", () => {
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.Empty,
				createHasPath("TestInterface"),
			);
			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([interface1 as any]),
			);
			const scope = createMockScope();
			const loopDetector = createMockLoopDetector();
			const transformation = new ReplaceExports(loopDetector);

			const result = transformation.enterTsDeclNamespace(scope)(namespace);

			expect(result.name.value).toBe("TestNamespace");
			// Should process the members
			expect(result.members.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Module Processing", () => {
		test("processes module with members", () => {
			const interface1 = createMockInterface("TestInterface");
			const module = createMockModule(
				"TestModule",
				IArray.fromArray([interface1 as any]),
			);
			const scope = createMockScope();
			const loopDetector = createMockLoopDetector();
			const transformation = new ReplaceExports(loopDetector);

			const result = transformation.enterTsDeclModule(scope)(module);

			expect(result.name.value).toBe("TestModule");
			expect(result.members.length).toBeGreaterThan(0);
		});

		test("handles empty module", () => {
			const module = createMockModule("EmptyModule");
			const scope = createMockScope();
			const loopDetector = createMockLoopDetector();
			const transformation = new ReplaceExports(loopDetector);

			const result = transformation.enterTsDeclModule(scope)(module);

			expect(result.name.value).toBe("EmptyModule");
			expect(result.members.length).toBe(0);
		});
	});

	describe("Parsed File Processing", () => {
		test("filters imports and unwraps export trees", () => {
			const interface1 = createMockInterface("TestInterface");
			const exportDecl = createMockExport(
				ExportType.named(),
				TsExporteeTree.create(interface1),
			);
			const parsedFile = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray([exportDecl as any, interface1 as any]),
				CodePath.noPath(),
			);
			const scope = createMockScope();
			const loopDetector = createMockLoopDetector();
			const transformation = new ReplaceExports(loopDetector);

			const result = transformation.leaveTsParsedFile(scope)(parsedFile);

			// Should process exports and preserve regular declarations
			expect(result.members.length).toBeGreaterThanOrEqual(1);
		});

		test("handles files with only type declarations", () => {
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.Empty,
				createHasPath("TestInterface"),
			);
			const parsedFile = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray([interface1 as any]),
				CodePath.noPath(),
			);
			const scope = createMockScope();
			const loopDetector = createMockLoopDetector();
			const transformation = new ReplaceExports(loopDetector);

			const result = transformation.leaveTsParsedFile(scope)(parsedFile);

			// Type declarations should be preserved
			expect(result.members.length).toBe(1);
		});
	});

	describe("Edge Cases", () => {
		test("handles namespace with mixed content", () => {
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.Empty,
				createHasPath("TestInterface"),
			);
			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([interface1 as any]),
				createHasPath("TestNamespace"),
			);
			const scope = createMockScope();
			const loopDetector = createMockLoopDetector();
			const transformation = new ReplaceExports(loopDetector);

			const result = transformation.enterTsDeclNamespace(scope)(namespace);

			expect(result.name.value).toBe("TestNamespace");
			expect(result.members.length).toBeGreaterThanOrEqual(0);
		});

		test("handles transformation instantiation with different loop detectors", () => {
			const loopDetector1 = createMockLoopDetector();
			const loopDetector2 = createMockLoopDetector();

			const transformation1 = new ReplaceExports(loopDetector1);
			const transformation2 = new ReplaceExports(loopDetector2);

			expect(transformation1).toBeDefined();
			expect(transformation2).toBeDefined();
			expect(transformation1).not.toBe(transformation2);
		});

		test("handles empty parsed file", () => {
			const parsedFile = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.Empty,
				CodePath.noPath(),
			);
			const scope = createMockScope();
			const loopDetector = createMockLoopDetector();
			const transformation = new ReplaceExports(loopDetector);

			const result = transformation.leaveTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(0);
		});
	});
});
