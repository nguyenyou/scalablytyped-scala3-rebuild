import { describe, test, expect } from "vitest";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import type {
	TsDeclClass,
	TsDeclInterface,
	TsParsedFile,
} from "@/internal/ts/trees.js";
import { TsIdent } from "@/internal/ts/trees.js";
import { Comment } from "@/internal/Comment.js";
import {
	createMockClass,
	createMockInterface,
	createMockParsedFile,
	createMockScope,
} from "./utils/TestUtils.js";

describe("CombinedTransformation", () => {
	describe("Complete Implementation Tests", () => {
		test("combine method applies both transformations in sequence", () => {
			// First transformation: sets declared: true
			const transformation1 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclClass(_t: any) {
					return (x: TsDeclClass) => ({
						...x,
						declared: true,
					});
				}
			})();

			// Second transformation: sets isAbstract: true
			const transformation2 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclClass(_t: any) {
					return (x: TsDeclClass) => ({
						...x,
						isAbstract: true,
					});
				}
			})();

			const combined = transformation1.combine(transformation2);
			const scope = createMockScope();
			const declClass = createMockClass("TestClass");

			const result = combined.visitTsDeclClass(scope)(declClass);

			// Both transformations should be applied
			expect(result.declared).toBe(true); // First transformation
			expect(result.isAbstract).toBe(true); // Second transformation
		});

		test(">> operator works identically to combine", () => {
			const transformation1 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclInterface(_t: any) {
					return (x: TsDeclInterface) => ({
						...x,
						declared: true,
					});
				}
			})();

			const transformation2 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclInterface(_t: any) {
					return (x: TsDeclInterface) => ({
						...x,
						name: TsIdent.simple("ModifiedInterface"),
					});
				}
			})();

			const combinedWithMethod = transformation1.combine(transformation2);
			const combinedWithOperator = transformation1[">>"](transformation2);

			const scope = createMockScope();
			const declInterface = createMockInterface("OriginalInterface");

			const result1 = combinedWithMethod.visitTsDeclInterface(scope)(declInterface);
			const result2 = combinedWithOperator.visitTsDeclInterface(scope)(declInterface);

			// Both should produce identical results
			expect(result1.declared).toBe(true);
			expect(result1.name.value).toBe("ModifiedInterface");
			expect(result2.declared).toBe(true);
			expect(result2.name.value).toBe("ModifiedInterface");
		});

		test("combined transformation preserves object identity when no changes", () => {
			// Both transformations do nothing
			const transformation1 = new (class extends TreeTransformationScopedChanges {})();
			const transformation2 = new (class extends TreeTransformationScopedChanges {})();

			const combined = transformation1.combine(transformation2);
			const scope = createMockScope();
			const declClass = createMockClass("TestClass");

			const result = combined.visitTsDeclClass(scope)(declClass);

			// Should preserve object identity when no changes are made
			expect(result).toBe(declClass);
		});

		test("combined transformation works with different node types", () => {
			// Transformation that modifies class names
			const transformation1 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclClass(_t: any) {
					return (x: TsDeclClass) => ({
						...x,
						name: TsIdent.simple("ModifiedClass"),
					});
				}
			})();

			// Transformation that adds comments
			const transformation2 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclClass(_t: any) {
					return (x: TsDeclClass) => x.addComment(Comment.create("Modified by second transformation"));
				}
			})();

			const combined = transformation1.combine(transformation2);
			const scope = createMockScope();
			const declClass = createMockClass("OriginalClass");

			const result = combined.visitTsDeclClass(scope)(declClass);

			// Both transformations should be applied
			expect(result.name.value).toBe("ModifiedClass");
			expect(result.comments.rawCs).toContain("Modified by second transformation");
		});

		test("combined transformation can be chained multiple times", () => {
			const transformation1 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclClass(_t: any) {
					return (x: TsDeclClass) => ({
						...x,
						declared: true,
					});
				}
			})();

			const transformation2 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclClass(_t: any) {
					return (x: TsDeclClass) => ({
						...x,
						isAbstract: true,
					});
				}
			})();

			const transformation3 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclClass(_t: any) {
					return (x: TsDeclClass) => ({
						...x,
						name: TsIdent.simple("ChainedClass"),
					});
				}
			})();

			// Chain multiple transformations
			const combined = transformation1.combine(transformation2).combine(transformation3);
			const scope = createMockScope();
			const declClass = createMockClass("OriginalClass");

			const result = combined.visitTsDeclClass(scope)(declClass);

			// All three transformations should be applied
			expect(result.declared).toBe(true);
			expect(result.isAbstract).toBe(true);
			expect(result.name.value).toBe("ChainedClass");
		});

		test("combined transformation works with parsed files", () => {
			const transformation1 = new (class extends TreeTransformationScopedChanges {
				enterTsParsedFile(_t: any) {
					return (x: TsParsedFile) => ({
						...x,
						comments: x.comments.add(Comment.create("First transformation applied")),
					});
				}
			})();

			const transformation2 = new (class extends TreeTransformationScopedChanges {
				enterTsParsedFile(_t: any) {
					return (x: TsParsedFile) => ({
						...x,
						comments: x.comments.add(Comment.create("Second transformation applied")),
					});
				}
			})();

			const combined = transformation1.combine(transformation2);
			const scope = createMockScope();
			const parsedFile = createMockParsedFile("test-lib");

			const result = combined.visitTsParsedFile(scope)(parsedFile);

			// Both comments should be added
			const comments = result.comments.rawCs;
			expect(comments).toContain("First transformation applied");
			expect(comments).toContain("Second transformation applied");
		});

		test("combined transformation handles context correctly", () => {
			// This test verifies that the context (scope) is passed correctly to both transformations
			let firstTransformationScope: any = null;
			let secondTransformationScope: any = null;

			const transformation1 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclClass(t: any) {
					firstTransformationScope = t;
					return (x: TsDeclClass) => x;
				}
			})();

			const transformation2 = new (class extends TreeTransformationScopedChanges {
				enterTsDeclClass(t: any) {
					secondTransformationScope = t;
					return (x: TsDeclClass) => x;
				}
			})();

			const combined = transformation1.combine(transformation2);
			const scope = createMockScope();
			const declClass = createMockClass("TestClass");

			combined.visitTsDeclClass(scope)(declClass);

			// Both transformations should receive the same scope
			expect(firstTransformationScope).toBe(scope);
			expect(secondTransformationScope).toBe(scope);
		});
	});
});
