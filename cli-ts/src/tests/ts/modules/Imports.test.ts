/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.ImportsTests
 * Tests for Imports.ts - starting with basic functionality
 */

import { isNone, isSome, none } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { IArray } from "@/internal/IArray.js";
import { ExpandedMod } from "@/internal/ts/modules/ExpandedMod.js";
import { Imports } from "@/internal/ts/modules/Imports.js";
import { TsIdent, TsImport, TsImportedIdent, TsImporteeFrom } from "@/internal/ts/trees.js";

describe("Imports", () => {
	describe("validImport Function - Basic Tests", () => {
		test("returns None for empty wanted array", () => {
			const wanted = IArray.Empty;
			const importStmt = TsImport.create(
				false,
				IArray.fromArray([TsImportedIdent.create(TsIdent.simple("React")) as any]),
				TsImporteeFrom.create(TsIdent.module(none, ["react"])),
			);

			const result = Imports.validImport(wanted)(importStmt);

			expect(isNone(result)).toBe(true);
		});

		test("handles malformed import gracefully", () => {
			const wanted = IArray.fromArray([TsIdent.simple("SomeType") as any]);
			const emptyImport = TsImport.create(
				false,
				IArray.Empty, // empty imported array
				TsImporteeFrom.create(TsIdent.module(none, ["some-module"])),
			);

			const result = Imports.validImport(wanted)(emptyImport);
			expect(isNone(result)).toBe(true);
		});
	});

	describe("expandImportee Function - Basic Tests", () => {
		test("handles basic importee expansion", () => {
			// Create minimal mock objects
			const mockScope = {
				moduleScopes: new Map(),
				fatalMaybe: () => {},
			} as any;
			const mockLoopDetector = {} as any;
			const importee = TsImporteeFrom.create(TsIdent.module(none, ["test-module"]));

			const result = Imports.expandImportee(importee, mockScope, mockLoopDetector);

			// Should return a valid ExpandedMod (likely empty in mock scenario)
			expect(result).toBeDefined();
			expect(ExpandedMod.isPicked(result) || ExpandedMod.isWhole(result)).toBe(true);
		});
	});

	describe("ExpandedMod Handling - Basic Tests", () => {
		test("ExpandedMod.Picked nonEmpty check", () => {
			const picked = ExpandedMod.Picked(
				IArray.fromArray([
					[{} as any, {} as any],
					[{} as any, {} as any],
				]),
			);
			expect(picked.nonEmpty).toBe(true);
			expect(picked.things.length).toBe(2);

			const emptyPicked = ExpandedMod.Picked(IArray.Empty);
			expect(emptyPicked.nonEmpty).toBe(false);
		});

		test("ExpandedMod.Whole nonEmpty check", () => {
			const whole = ExpandedMod.Whole(
				IArray.fromArray([{} as any]),
				IArray.fromArray([{} as any]),
				IArray.fromArray([{} as any]),
				{} as any,
			);
			expect(whole.nonEmpty).toBe(true);

			const emptyWhole = ExpandedMod.Whole(
				IArray.Empty,
				IArray.Empty,
				IArray.Empty,
				{} as any,
			);
			expect(emptyWhole.nonEmpty).toBe(false);
		});
	});
});
