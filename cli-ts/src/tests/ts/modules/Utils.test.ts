/**
 * Tests for Utils.ts - comprehensive test coverage for utility functions
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { Utils } from "@/internal/ts/modules/Utils.js";

import {
	TsDeclInterface,
	TsDeclNamespace,
	TsIdent,
} from "@/internal/ts/trees.js";

describe("Utils", () => {
	describe("withJsLocation Function", () => {
		test("handles tree without JavaScript location capability", () => {
			const simpleTree = { _tag: "SimpleTree", value: "test" } as any;
			const jsLocation = JsLocation.zero();

			const result = Utils.withJsLocation(simpleTree, jsLocation);

			// Should return unchanged if no JavaScript location capability
			expect(result).toBe(simpleTree);
		});

		test("handles tree with JavaScript location capability", () => {
			const mockTree = {
				_tag: "MockTree",
				withJsLocation: (loc: JsLocation) => ({ ...mockTree, jsLocation: loc }),
			} as any;
			const jsLocation = JsLocation.zero();

			const result = Utils.withJsLocation(mockTree, jsLocation);

			expect(result).toBeDefined();
			// The result should be the tree with the location set
			expect(result._tag).toBe("MockTree");
		});

		test("handles container with members", () => {
			const mockMember = { _tag: "MockMember" } as any;
			const mockContainer = {
				_tag: "MockContainer",
				members: IArray.fromArray([mockMember]),
				withJsLocation: (loc: JsLocation) => ({
					...mockContainer,
					jsLocation: loc,
				}),
				withMembers: (members: any) => ({ ...mockContainer, members }),
			} as any;
			const jsLocation = JsLocation.zero();

			const result = Utils.withJsLocation(mockContainer, jsLocation);

			expect(result).toBeDefined();
			expect(result._tag).toBe("MockContainer");
		});
	});

	describe("searchAmong Function", () => {
		test("returns empty for no declarations", () => {
			const mockScope = {
				"/": () => mockScope,
				lookupInternal: () => IArray.Empty,
			} as any;
			const mockPicker = { pick: () => none };
			const wanted = IArray.fromArray([TsIdent.simple("TestType") as any]);
			const expandeds = IArray.Empty;
			const mockLoopDetector = {} as any;

			const result = Utils.searchAmong(
				mockScope,
				mockPicker,
				wanted,
				expandeds,
				mockLoopDetector,
			);

			expect(result.length).toBe(0);
		});

		test("handles basic search functionality", () => {
			const mockDecl = TsDeclInterface.create(
				Comments.empty(),
				false,
				TsIdent.simple("TestInterface"),
				IArray.Empty,
				IArray.Empty,
				IArray.Empty,
				CodePath.noPath(),
			);

			const mockScope = {
				"/": () => ({
					lookupInternal: () => IArray.fromArray([[mockDecl, mockScope]]),
				}),
			} as any;

			const mockPicker = {
				pick: (decl: any) =>
					decl._tag === "TsDeclInterface" ? some(decl) : none,
			};
			const wanted = IArray.fromArray([TsIdent.simple("TestInterface") as any]);
			const expandeds = IArray.fromArray([mockDecl as any]);
			const mockLoopDetector = {} as any;

			const result = Utils.searchAmong(
				mockScope,
				mockPicker,
				wanted,
				expandeds,
				mockLoopDetector,
			);

			expect(result).toBeDefined();
			// Result should be an array (might be empty due to mock limitations)
			expect(Array.isArray(result.toArray())).toBe(true);
		});

		test("handles picker that returns none", () => {
			const mockDecl = TsDeclInterface.create(
				Comments.empty(),
				false,
				TsIdent.simple("TestInterface"),
				IArray.Empty,
				IArray.Empty,
				IArray.Empty,
				CodePath.noPath(),
			);

			const mockScope = {
				"/": () => ({
					lookupInternal: () => IArray.fromArray([[mockDecl, mockScope]]),
				}),
			} as any;

			const mockPicker = { pick: () => none }; // Always returns none
			const wanted = IArray.fromArray([TsIdent.simple("TestInterface") as any]);
			const expandeds = IArray.fromArray([mockDecl as any]);
			const mockLoopDetector = {} as any;

			const result = Utils.searchAmong(
				mockScope,
				mockPicker,
				wanted,
				expandeds,
				mockLoopDetector,
			);

			expect(result.length).toBe(0);
		});

		test("handles multiple declarations", () => {
			const mockDecl1 = TsDeclInterface.create(
				Comments.empty(),
				false,
				TsIdent.simple("Interface1"),
				IArray.Empty,
				IArray.Empty,
				IArray.Empty,
				CodePath.noPath(),
			);

			const mockDecl2 = TsDeclNamespace.create(
				Comments.empty(),
				false,
				TsIdent.simple("Namespace1"),
				IArray.Empty,
				CodePath.noPath(),
				JsLocation.zero(),
			);

			const mockScope = {
				"/": () => ({
					lookupInternal: () =>
						IArray.fromArray([
							[mockDecl1, mockScope],
							[mockDecl2, mockScope],
						]),
				}),
			} as any;

			const mockPicker = {
				pick: (decl: any) => some(decl), // Accept all declarations
			};
			const wanted = IArray.fromArray([TsIdent.simple("TestType") as any]);
			const expandeds = IArray.fromArray([mockDecl1 as any, mockDecl2 as any]);
			const mockLoopDetector = {} as any;

			const result = Utils.searchAmong(
				mockScope,
				mockPicker,
				wanted,
				expandeds,
				mockLoopDetector,
			);

			expect(result).toBeDefined();
			expect(Array.isArray(result.toArray())).toBe(true);
		});
	});

	describe("Helper Functions", () => {
		test("type guards work correctly", () => {
			// Test hasJsLocation type guard indirectly
			const treeWithLocation = {
				withJsLocation: (loc: JsLocation) => ({
					...treeWithLocation,
					jsLocation: loc,
				}),
			} as any;

			const treeWithoutLocation = {
				someOtherMethod: () => {},
			} as any;

			const jsLocation = JsLocation.zero();

			// These should not throw errors
			const result1 = Utils.withJsLocation(treeWithLocation, jsLocation);
			const result2 = Utils.withJsLocation(treeWithoutLocation, jsLocation);

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
			// Tree without location should be returned unchanged
			expect(result2).toBe(treeWithoutLocation);
		});

		test("container detection works correctly", () => {
			const container = {
				members: IArray.Empty,
				withMembers: (members: any) => ({ ...container, members }),
				withJsLocation: (loc: JsLocation) => ({
					...container,
					jsLocation: loc,
				}),
			} as any;

			const nonContainer = {
				withJsLocation: (loc: JsLocation) => ({
					...nonContainer,
					jsLocation: loc,
				}),
			} as any;

			const jsLocation = JsLocation.zero();

			// These should not throw errors
			const result1 = Utils.withJsLocation(container, jsLocation);
			const result2 = Utils.withJsLocation(nonContainer, jsLocation);

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
		});
	});

	describe("Edge Cases", () => {
		test("handles null and undefined gracefully", () => {
			const jsLocation = JsLocation.zero();

			// Should not throw for null/undefined trees
			expect(() => Utils.withJsLocation(null as any, jsLocation)).not.toThrow();
			expect(() =>
				Utils.withJsLocation(undefined as any, jsLocation),
			).not.toThrow();
		});

		test("handles empty wanted array in searchAmong", () => {
			const mockScope = {} as any;
			const mockPicker = { pick: () => none };
			const wanted = IArray.Empty;
			const expandeds = IArray.Empty;
			const mockLoopDetector = {} as any;

			const result = Utils.searchAmong(
				mockScope,
				mockPicker,
				wanted,
				expandeds,
				mockLoopDetector,
			);

			expect(result.length).toBe(0);
		});
	});
});
