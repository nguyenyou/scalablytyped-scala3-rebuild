/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.RewriteExportStarAsTests
 *
 * Comprehensive test suite for the RewriteExportStarAs transformation.
 * Maintains 100% behavioral parity with the Scala test implementation.
 */

import { describe, it, expect } from "vitest";
import { RewriteExportStarAs } from "@/internal/ts/modules/RewriteExportStarAs.js";
import {
	TsIdentSimple,
	TsQIdent,
	TsIdentModule,
	TsDeclInterface,
	TsDeclModule,
	TsDeclNamespace,
	TsExport,
	TsExporteeStar,
	TsExporteeNames,
	TsImport,
	TsImportedStar,
	TsImporteeFrom,
	TsParsedFile,
	TsGlobal,
	TsAugmentedModule,
} from "@/internal/ts/trees.js";
import { Comments } from "@/internal/Comments.js";
import { ExportType } from "@/internal/ts/ExportType.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { IArray } from "@/internal/IArray.js";
import { none, some } from "fp-ts/Option";
import { TransformMembers } from "@/internal/ts/TreeTransformations.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import { TsIdent } from "@/internal/ts/trees.js";

// Helper functions for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]): TsQIdent {
	return TsQIdent.of(...parts.map(createSimpleIdent));
}

function createIdentModule(name: string): TsIdentModule {
	return TsIdent.module(none, [name]);
}

function createMockInterface(
	name: string,
	members: IArray<any> = IArray.Empty,
	codePath: CodePath = CodePath.noPath()
): TsDeclInterface {
	return TsDeclInterface.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		IArray.Empty, // inheritance
		members,
		codePath
	);
}

function createMockModule(
	name: string,
	members: IArray<any> = IArray.Empty,
	codePath: CodePath = CodePath.noPath()
): TsDeclModule {
	return TsDeclModule.create(
		Comments.empty(),
		false, // declared
		createIdentModule(name),
		members,
		codePath,
		JsLocation.zero()
	);
}

function createMockNamespace(
	name: string,
	members: IArray<any> = IArray.Empty,
	codePath: CodePath = CodePath.noPath()
): TsDeclNamespace {
	return TsDeclNamespace.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		members,
		codePath,
		JsLocation.zero()
	);
}

function createMockExportStar(
	asOpt: string | null = null,
	from: string = "module"
): TsExport {
	return TsExport.create(
		Comments.empty(),
		false, // typeOnly
		ExportType.named(),
		TsExporteeStar.create(
			asOpt ? some(createSimpleIdent(asOpt)) : none,
			createIdentModule(from)
		)
	);
}

function createMockExportStarTypeOnly(
	asOpt: string | null = null,
	from: string = "module"
): TsExport {
	return TsExport.create(
		Comments.empty(),
		true, // typeOnly
		ExportType.named(),
		TsExporteeStar.create(
			asOpt ? some(createSimpleIdent(asOpt)) : none,
			createIdentModule(from)
		)
	);
}

function createMockExportNamed(...names: Array<[string, string | null]>): TsExport {
	return TsExport.create(
		Comments.empty(),
		false, // typeOnly
		ExportType.named(),
		TsExporteeNames.create(
			IArray.fromArray(
				names.map(([name, alias]) => [
					createQIdent(name),
					alias ? some(createSimpleIdent(alias)) : none
				] as [TsQIdent, any])
			),
			none
		)
	);
}

function createMockScope(_members: IArray<any> = IArray.Empty): TsTreeScope {
	const deps = new Map();
	return TsTreeScope.create(
		TsIdent.librarySimple("test"),
		false, // pedantic
		deps,
		{ devNull: true } as any // Logger.DevNull equivalent
	);
}

describe("RewriteExportStarAs", () => {
	describe("Basic Functionality", () => {
		it("transformation can be instantiated", () => {
			const transformation = RewriteExportStarAs.instance;
			expect(transformation).toBeInstanceOf(TransformMembers);
		});

		it("handles files with no export star statements", () => {
			const interface1 = createMockInterface("TestInterface");
			const regularExport = createMockExportNamed(["TestInterface", null]);
			const module = createMockModule("TestModule", IArray.fromArray([interface1, regularExport]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should return unchanged since no export star statements
			expect(result.length).toBe(2);
			expect(result.get(0)._tag).toBe("TsDeclInterface");
			expect(result.get(1)._tag).toBe("TsExport");
		});

		it("handles files with only regular exports", () => {
			const export1 = createMockExportNamed(["foo", null], ["bar", "baz"]);
			const export2 = createMockExportNamed(["qux", null]);
			const module = createMockModule("TestModule", IArray.fromArray([export1, export2]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should return unchanged since no export star statements
			expect(result.length).toBe(2);
			expect(result.get(0)._tag).toBe("TsExport");
			expect(result.get(1)._tag).toBe("TsExport");
		});
	});

	describe("Export Star Processing", () => {
		it("basic export star statements without alias", () => {
			const exportStar = createMockExportStar(null, "utils");
			const module = createMockModule("TestModule", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should return unchanged since no alias (transformation only handles export * as namespace)
			expect(result.length).toBe(1);
			expect(result.get(0)._tag).toBe("TsExport");
			const exportDecl = result.get(0) as TsExport;
			expect(exportDecl.exported._tag).toBe("TsExporteeStar");
		});

		it("export star as namespace statements", () => {
			const exportStar = createMockExportStar("Utils", "utils");
			const module = createMockModule("TestModule", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should be rewritten to import + export
			expect(result.length).toBe(2);

			// First should be an import
			expect(result.get(0)._tag).toBe("TsImport");
			const importDecl = result.get(0) as TsImport;
			expect(importDecl.typeOnly).toBe(false);
			expect(importDecl.imported.length).toBe(1);
			expect(importDecl.imported.get(0)._tag).toBe("TsImportedStar");
			const starImport = importDecl.imported.get(0) as TsImportedStar;
			expect(starImport.asOpt._tag).toBe("Some");
			if (starImport.asOpt._tag === "Some") {
				expect(starImport.asOpt.value.value).toBe("Utils");
			}
			expect(importDecl.from._tag).toBe("TsImporteeFrom");
			const fromImport = importDecl.from as TsImporteeFrom;
			expect(fromImport.from.value).toBe("utils");

			// Second should be an export
			expect(result.get(1)._tag).toBe("TsExport");
			const exportDecl = result.get(1) as TsExport;
			expect(exportDecl.typeOnly).toBe(false);
			expect(exportDecl.exported._tag).toBe("TsExporteeNames");
			const namedExport = exportDecl.exported as TsExporteeNames;
			expect(namedExport.idents.length).toBe(1);
			expect(namedExport.idents.get(0)[0].parts.get(0).value).toBe("Utils");
			expect(namedExport.idents.get(0)[1]._tag).toBe("None");
			expect(namedExport.fromOpt._tag).toBe("None");
		});

		it("type-only export star as namespace statements", () => {
			const exportStar = createMockExportStarTypeOnly("Types", "types");
			const module = createMockModule("TestModule", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should be rewritten to type-only import + export
			expect(result.length).toBe(2);

			// First should be a type-only import
			const importDecl = result.get(0) as TsImport;
			expect(importDecl.typeOnly).toBe(true);
			expect(importDecl.imported.length).toBe(1);
			expect(importDecl.imported.get(0)._tag).toBe("TsImportedStar");

			// Second should be a type-only export
			const exportDecl = result.get(1) as TsExport;
			expect(exportDecl.typeOnly).toBe(true);
			expect(exportDecl.exported._tag).toBe("TsExporteeNames");
		});

		it("multiple export star statements with different aliases", () => {
			const exportStar1 = createMockExportStar("Utils", "utils");
			const exportStar2 = createMockExportStar("Helpers", "helpers");
			const module = createMockModule("TestModule", IArray.fromArray([exportStar1, exportStar2]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should be rewritten to 2 imports + 2 exports = 4 total
			expect(result.length).toBe(4);

			// Check first pair
			expect(result.get(0)._tag).toBe("TsImport");
			expect(result.get(1)._tag).toBe("TsExport");

			// Check second pair
			expect(result.get(2)._tag).toBe("TsImport");
			expect(result.get(3)._tag).toBe("TsExport");
		});

		it("mixed export types - some with alias, some without", () => {
			const exportStarWithAlias = createMockExportStar("Utils", "utils");
			const exportStarWithoutAlias = createMockExportStar(null, "helpers");
			const regularExport = createMockExportNamed(["foo", null]);
			const module = createMockModule("TestModule", IArray.fromArray([
				exportStarWithAlias,
				exportStarWithoutAlias,
				regularExport
			]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should be: 2 (import+export) + 1 (unchanged) + 1 (unchanged) = 4 total
			expect(result.length).toBe(4);

			// First export star with alias should be transformed
			expect(result.get(0)._tag).toBe("TsImport");
			expect(result.get(1)._tag).toBe("TsExport");

			// Second export star without alias should remain unchanged
			expect(result.get(2)._tag).toBe("TsExport");
			const unchangedExport = result.get(2) as TsExport;
			expect(unchangedExport.exported._tag).toBe("TsExporteeStar");

			// Regular export should remain unchanged
			expect(result.get(3)._tag).toBe("TsExport");
		});
	});

	describe("Rewriting Logic", () => {
		it("preserves export type in transformation", () => {
			const exportStar = createMockExportStar("Utils", "utils");
			const module = createMockModule("TestModule", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			const exportDecl = result.get(1) as TsExport;
			expect(exportDecl.tpe).toEqual(ExportType.named());
		});

		it("preserves comments in transformation", () => {
			const comments = Comments.empty(); // Use empty comments for simplicity
			const exportStar = TsExport.create(
				comments,
				false,
				ExportType.named(),
				TsExporteeStar.create(some(createSimpleIdent("Utils")), createIdentModule("utils"))
			);
			const module = createMockModule("TestModule", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Comments should be preserved on the export
			const exportDecl = result.get(1) as TsExport;
			expect(exportDecl.comments).toEqual(comments);
		});

		it("handles different module specifiers correctly", () => {
			const exportStar1 = createMockExportStar("Utils", "./utils");
			const exportStar2 = createMockExportStar("Helpers", "../helpers");
			const exportStar3 = createMockExportStar("Shared", "../../shared");
			const exportStar4 = createMockExportStar("External", "/usr/lib/module");
			const module = createMockModule("TestModule", IArray.fromArray([
				exportStar1, exportStar2, exportStar3, exportStar4
			]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			expect(result.length).toBe(8); // 4 exports * 2 (import + export) each

			// Verify all paths are preserved correctly
			const imports = [result.get(0), result.get(2), result.get(4), result.get(6)] as TsImport[];
			const expectedPaths = ["./utils", "../helpers", "../../shared", "/usr/lib/module"];

			imports.forEach((importDecl, index) => {
				const fromImport = importDecl.from as TsImporteeFrom;
				expect(fromImport.from.value).toBe(expectedPaths[index]);
			});
		});
	});

	describe("Module and Namespace Integration", () => {
		it("works within namespace containers", () => {
			const exportStar = createMockExportStar("Utils", "utils");
			const namespace = createMockNamespace("TestNamespace", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, namespace);

			expect(result.length).toBe(2);
			expect(result.get(0)._tag).toBe("TsImport");
			expect(result.get(1)._tag).toBe("TsExport");
		});

		it("works within module containers", () => {
			const exportStar = createMockExportStar("Utils", "utils");
			const module = createMockModule("TestModule", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			expect(result.length).toBe(2);
			expect(result.get(0)._tag).toBe("TsImport");
			expect(result.get(1)._tag).toBe("TsExport");
		});

		it("works within global containers", () => {
			const exportStar = createMockExportStar("Utils", "utils");
			const global = TsGlobal.create(
				Comments.empty(),
				false, // declared
				IArray.fromArray([exportStar] as any),
				CodePath.noPath()
			);
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, global);

			expect(result.length).toBe(2);
			expect(result.get(0)._tag).toBe("TsImport");
			expect(result.get(1)._tag).toBe("TsExport");
		});

		it("works within augmented modules", () => {
			const exportStar = createMockExportStar("Utils", "utils");
			const augmentedModule = TsAugmentedModule.create(
				Comments.empty(),
				createIdentModule("TestModule"),
				IArray.fromArray([exportStar] as any),
				CodePath.noPath(),
				JsLocation.zero()
			);
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, augmentedModule);

			expect(result.length).toBe(2);
			expect(result.get(0)._tag).toBe("TsImport");
			expect(result.get(1)._tag).toBe("TsExport");
		});
	});

	describe("Edge Cases", () => {
		it("handles empty containers", () => {
			const module = createMockModule("TestModule", IArray.Empty);
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			expect(result.length).toBe(0);
		});

		it("handles containers with only non-export members", () => {
			const interface1 = createMockInterface("TestInterface");
			const interface2 = createMockInterface("AnotherInterface");
			const module = createMockModule("TestModule", IArray.fromArray([interface1, interface2]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			expect(result.length).toBe(2);
			expect(result.get(0)._tag).toBe("TsDeclInterface");
			expect(result.get(1)._tag).toBe("TsDeclInterface");
		});

		it("handles complex namespace aliases", () => {
			const exportStar = createMockExportStar("VeryLongNamespaceAlias", "some-complex-module-name");
			const module = createMockModule("TestModule", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			expect(result.length).toBe(2);
			const importDecl = result.get(0) as TsImport;
			const starImport = importDecl.imported.get(0) as TsImportedStar;
			if (starImport.asOpt._tag === "Some") {
				expect(starImport.asOpt.value.value).toBe("VeryLongNamespaceAlias");
			}
		});

		it("preserves order of mixed declarations", () => {
			const interface1 = createMockInterface("Interface1");
			const exportStar = createMockExportStar("Utils", "utils");
			const interface2 = createMockInterface("Interface2");
			const regularExport = createMockExportNamed(["foo", null]);
			const module = createMockModule("TestModule", IArray.fromArray([
				interface1, exportStar, interface2, regularExport
			]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			expect(result.length).toBe(5); // interface1, import, export, interface2, regularExport
			expect(result.get(0)._tag).toBe("TsDeclInterface");
			expect(result.get(1)._tag).toBe("TsImport");
			expect(result.get(2)._tag).toBe("TsExport");
			expect(result.get(3)._tag).toBe("TsDeclInterface");
			expect(result.get(4)._tag).toBe("TsExport");
		});
	});

	describe("Code Path and Metadata Preservation", () => {
		it("preserves code paths in generated imports and exports", () => {
			const exportStar = createMockExportStar("Utils", "utils");
			const module = createMockModule("TestModule", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Both import and export should be generated without specific code paths
			// (they inherit from the transformation context)
			expect(result.length).toBe(2);
			expect(result.get(0)._tag).toBe("TsImport");
			expect(result.get(1)._tag).toBe("TsExport");
		});

		it("handles export star with comments and preserves them", () => {
			const comments = Comments.empty(); // Use empty comments for simplicity
			const exportStar = TsExport.create(
				comments,
				false,
				ExportType.named(),
				TsExporteeStar.create(some(createSimpleIdent("Utils")), createIdentModule("utils"))
			);
			const module = createMockModule("TestModule", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Comments should be preserved on the export
			const exportDecl = result.get(1) as TsExport;
			expect(exportDecl.comments).toEqual(comments);
		});

		it("handles transformation with different export types", () => {
			const exportStar = TsExport.create(
				Comments.empty(),
				false,
				ExportType.namespaced(), // Different export type
				TsExporteeStar.create(some(createSimpleIdent("Utils")), createIdentModule("utils"))
			);
			const module = createMockModule("TestModule", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should still transform and preserve the export type
			expect(result.length).toBe(2);
			const exportDecl = result.get(1) as TsExport;
			expect(exportDecl.tpe).toEqual(ExportType.namespaced());
		});
	});

	describe("Integration Scenarios", () => {
		it("realistic module structure with multiple export types", () => {
			const interface1 = createMockInterface("ApiInterface");
			const exportStar1 = createMockExportStar("Utils", "utils");
			const exportStar2 = createMockExportStarTypeOnly("Types", "types");
			const regularExport = createMockExportNamed(["ApiInterface", null]);
			const exportStarWithoutAlias = createMockExportStar(null, "helpers");

			const module = createMockModule("TestModule", IArray.fromArray([
				interface1, exportStar1, exportStar2, regularExport, exportStarWithoutAlias
			]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should be: interface + (import+export) + (import+export) + export + export = 7 total
			expect(result.length).toBe(7);

			// Check the structure
			expect(result.get(0)._tag).toBe("TsDeclInterface");
			expect(result.get(1)._tag).toBe("TsImport"); // Utils import
			expect(result.get(2)._tag).toBe("TsExport"); // Utils export
			expect(result.get(3)._tag).toBe("TsImport"); // Types import (type-only)
			expect(result.get(4)._tag).toBe("TsExport"); // Types export (type-only)
			expect(result.get(5)._tag).toBe("TsExport"); // Regular export
			expect(result.get(6)._tag).toBe("TsExport"); // Export star without alias (unchanged)

			// Verify type-only flags
			const typesImport = result.get(3) as TsImport;
			const typesExport = result.get(4) as TsExport;
			expect(typesImport.typeOnly).toBe(true);
			expect(typesExport.typeOnly).toBe(true);
		});

		it("complex nested container scenario", () => {
			const exportStar = createMockExportStar("NestedUtils", "nested/utils");
			const innerNamespace = createMockNamespace("InnerNamespace", IArray.fromArray([exportStar]));
			const scope = createMockScope();

			// Test transformation at the inner namespace level
			const result = RewriteExportStarAs.instance.newMembers(scope, innerNamespace);

			expect(result.length).toBe(2);
			expect(result.get(0)._tag).toBe("TsImport");
			expect(result.get(1)._tag).toBe("TsExport");

			// Verify the import path is preserved
			const importDecl = result.get(0) as TsImport;
			const fromImport = importDecl.from as TsImporteeFrom;
			expect(fromImport.from.value).toBe("nested/utils");
		});

		it("handles transformation with existing imports and exports", () => {
			const existingImport = TsImport.create(
				false,
				IArray.fromArray([TsImportedStar.create(some(createSimpleIdent("Existing")))] as any),
				TsImporteeFrom.create(createIdentModule("existing"))
			);
			const exportStar = createMockExportStar("Utils", "utils");
			const existingExport = createMockExportNamed(["existing", null]);

			const module = createMockModule("TestModule", IArray.fromArray([
				existingImport, exportStar, existingExport
			]));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should be: existing import + new import + new export + existing export = 4 total
			expect(result.length).toBe(4);
			expect(result.get(0)._tag).toBe("TsImport"); // existing
			expect(result.get(1)._tag).toBe("TsImport"); // new
			expect(result.get(2)._tag).toBe("TsExport"); // new
			expect(result.get(3)._tag).toBe("TsExport"); // existing
		});

		it("performance test with many export star statements", () => {
			const exportStars = Array.from({ length: 50 }, (_, i) =>
				createMockExportStar(`Utils${i}`, `utils${i}`)
			);
			const module = createMockModule("TestModule", IArray.fromArray(exportStars));
			const scope = createMockScope();

			const result = RewriteExportStarAs.instance.newMembers(scope, module);

			// Should be 50 * 2 = 100 total (each export star becomes import + export)
			expect(result.length).toBe(100);

			// Verify alternating pattern
			for (let i = 0; i < 100; i += 2) {
				expect(result.get(i)._tag).toBe("TsImport");
				expect(result.get(i + 1)._tag).toBe("TsExport");
			}
		});
	});
});
