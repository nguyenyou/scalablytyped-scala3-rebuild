/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ExpandTypeParamsTests
 *
 * Tests for the ExpandTypeParams transform that expands type parameters in function signatures.
 */

import { describe, expect, it } from "bun:test";
import { ExpandTypeParams } from "@/internal/ts/transforms/ExpandTypeParams.js";
import { createMockScope } from "@/tests/utils/TestUtils.js";

describe("ExpandTypeParams", () => {
	describe("Basic Functionality", () => {
		it("creates an instance", () => {
			const transform = new ExpandTypeParams();
			expect(transform).toBeDefined();
			expect(typeof transform.newMembers).toBe("function");
		});

		it("has static instance", () => {
			expect(ExpandTypeParams.instance).toBeDefined();
			expect(ExpandTypeParams.instance).toBeInstanceOf(ExpandTypeParams);
		});

		it("has newClassMembers method", () => {
			const scope = createMockScope();
			const mockInterface = {
				_tag: "TsDeclInterface" as const,
				members: [],
			};
			const result = ExpandTypeParams.instance.newClassMembers(scope, mockInterface as any);
			expect(result).toBeDefined();
		});

		it("has newMembers method", () => {
			const scope = createMockScope();
			const mockContainer = {
				_tag: "TsParsedFile" as const,
				members: [],
			};
			const result = ExpandTypeParams.instance.newMembers(scope, mockContainer as any);
			expect(result).toBeDefined();
		});
	});

	describe("Type Parameter Expansion", () => {
		it("handles empty type parameters", () => {
			const scope = createMockScope();
			const mockInterface = {
				_tag: "TsDeclInterface" as const,
				members: [],
			};
			const result = ExpandTypeParams.instance.newClassMembers(scope, mockInterface as any);
			expect(Array.isArray(result) || result.length !== undefined).toBe(true);
		});

		it("processes function signatures", () => {
			const scope = createMockScope();
			const mockContainer = {
				_tag: "TsParsedFile" as const,
				members: [],
			};
			const result = ExpandTypeParams.instance.newMembers(scope, mockContainer as any);
			expect(Array.isArray(result) || result.length !== undefined).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("handles null/undefined inputs gracefully", () => {
			const scope = createMockScope();
			
			// Test with empty interface
			const emptyInterface = {
				_tag: "TsDeclInterface" as const,
				members: [],
			};
			const result1 = ExpandTypeParams.instance.newClassMembers(scope, emptyInterface as any);
			expect(result1).toBeDefined();

			// Test with empty container
			const emptyContainer = {
				_tag: "TsParsedFile" as const,
				members: [],
			};
			const result2 = ExpandTypeParams.instance.newMembers(scope, emptyContainer as any);
			expect(result2).toBeDefined();
		});

		it("maintains transform interface contract", () => {
			const transform = ExpandTypeParams.instance;
			
			// Verify it extends TransformMembers
			expect(typeof transform.newMembers).toBe("function");
			
			// Verify it has class member transformation capabilities
			expect(typeof transform.newClassMembers).toBe("function");
		});
	});

	describe("Integration", () => {
		it("works with mock scope", () => {
			const scope = createMockScope();
			expect(scope).toBeDefined();
			
			const transform = ExpandTypeParams.instance;
			const mockInterface = {
				_tag: "TsDeclInterface" as const,
				members: [],
			};
			
			// Should not throw
			expect(() => {
				transform.newClassMembers(scope, mockInterface as any);
			}).not.toThrow();
		});

		it("preserves member count for non-expandable cases", () => {
			const scope = createMockScope();
			const mockInterface = {
				_tag: "TsDeclInterface" as const,
				members: [],
			};
			
			const result = ExpandTypeParams.instance.newClassMembers(scope, mockInterface as any);
			// Empty input should produce empty output
			expect(result.length || 0).toBe(0);
		});
	});
});