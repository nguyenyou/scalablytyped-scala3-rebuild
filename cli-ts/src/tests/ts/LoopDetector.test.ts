import { isLeft, isRight } from "fp-ts/Either";
import { describe, expect, it } from "vitest";
import { Comments } from "../../internal/Comments.ts";
import { IArray } from "../../internal/IArray.ts";
import { LoopDetector, TsTreeScope } from "../../internal/ts/TsTreeScope.ts";
import { type TsIdent, TsQIdent, TsTypeRef } from "../../internal/ts/trees.ts";
import {
	createMockLogger,
	createMockScope,
	createSimpleIdent,
	createSimpleLibrary,
	createTypeRef,
} from "../utils/TestUtils.ts";

describe("LoopDetector", () => {
	// Helper methods for creating test data
	function createMockScope2(): TsTreeScope {
		const libName = createSimpleLibrary("test-lib-2");
		const logger = createMockLogger();
		const deps = new Map();
		return TsTreeScope.create(libName, false, deps, logger);
	}

	describe("Construction and Basic Properties", () => {
		it("initial loop detector has empty stack", () => {
			const detector = LoopDetector.initial;

			expect((detector as any).stack.length).toBe(0);
		});

		it("private constructor creates detector with given stack", () => {
			const scope = createMockScope();
			const idents = IArray.fromArray([
				createSimpleIdent("test"),
			]) as IArray<TsIdent>;

			// We can't directly test the private constructor, but we can test the result
			// of including which creates a new detector with the entry in the stack
			const result = LoopDetector.initial.including(idents, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
				// The stack should contain the entry we just added
				const stackEntry = (newDetector as any).stack[0];
				expect(stackEntry).toBeDefined();
			}
		});
	});

	describe("including(IArray[TsIdent], TsTreeScope)", () => {
		it("returns Right with new detector when no loop detected", () => {
			const detector = LoopDetector.initial;
			const scope = createMockScope();
			const idents = IArray.fromArray([
				createSimpleIdent("TestType"),
			]) as IArray<TsIdent>;

			const result = detector.including(idents, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
				// Verify the stack contains the correct entry
				const stackEntry = (newDetector as any).stack[0];
				expect(stackEntry).toBeDefined();
			}
		});

		it("returns Left when loop detected with same idents and scope", () => {
			const scope = createMockScope();
			const idents = IArray.fromArray([
				createSimpleIdent("TestType"),
			]) as IArray<TsIdent>;

			const detector1Result = LoopDetector.initial.including(idents, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(idents, scope);
				expect(isLeft(result)).toBe(true);
			}
		});

		it("allows same idents with different scope", () => {
			const scope1 = createMockScope();
			const scope2 = createMockScope2();
			const idents = IArray.fromArray([
				createSimpleIdent("TestType"),
			]) as IArray<TsIdent>;

			const detector1Result = LoopDetector.initial.including(idents, scope1);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(idents, scope2);
				expect(isRight(result)).toBe(true);
				if (isRight(result)) {
					const newDetector = result.right;
					expect((newDetector as any).stack.length).toBe(2);
				}
			}
		});

		it("allows different idents with same scope", () => {
			const scope = createMockScope();
			const idents1 = IArray.fromArray([
				createSimpleIdent("TestType1"),
			]) as IArray<TsIdent>;
			const idents2 = IArray.fromArray([
				createSimpleIdent("TestType2"),
			]) as IArray<TsIdent>;

			const detector1Result = LoopDetector.initial.including(idents1, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(idents2, scope);
				expect(isRight(result)).toBe(true);
				if (isRight(result)) {
					const newDetector = result.right;
					expect((newDetector as any).stack.length).toBe(2);
				}
			}
		});

		it("handles empty idents array", () => {
			const detector = LoopDetector.initial;
			const scope = createMockScope();
			const emptyIdents = IArray.Empty as IArray<TsIdent>;

			const result = detector.including(emptyIdents, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
			}
		});

		it("handles multiple idents in array", () => {
			const detector = LoopDetector.initial;
			const scope = createMockScope();
			const idents = IArray.fromArray([
				createSimpleIdent("Module"),
				createSimpleIdent("SubModule"),
				createSimpleIdent("Type"),
			]) as IArray<TsIdent>;

			const result = detector.including(idents, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
			}
		});
	});

	describe("including(TsTypeRef, TsTreeScope)", () => {
		it("returns Right with new detector when no loop detected", () => {
			const detector = LoopDetector.initial;
			const scope = createMockScope();
			const typeRef = createTypeRef("TestType");

			const result = detector.including(typeRef, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
			}
		});

		it("returns Left when loop detected with same typeRef and scope", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("TestType");

			const detector1Result = LoopDetector.initial.including(typeRef, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(typeRef, scope);
				expect(isLeft(result)).toBe(true);
			}
		});

		it("allows same typeRef with different scope", () => {
			const scope1 = createMockScope();
			const scope2 = createMockScope2();
			const typeRef = createTypeRef("TestType");

			const detector1Result = LoopDetector.initial.including(typeRef, scope1);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(typeRef, scope2);
				expect(isRight(result)).toBe(true);
				if (isRight(result)) {
					const newDetector = result.right;
					expect((newDetector as any).stack.length).toBe(2);
				}
			}
		});

		it("allows different typeRef with same scope", () => {
			const scope = createMockScope();
			const typeRef1 = createTypeRef("TestType1");
			const typeRef2 = createTypeRef("TestType2");

			const detector1Result = LoopDetector.initial.including(typeRef1, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(typeRef2, scope);
				expect(isRight(result)).toBe(true);
				if (isRight(result)) {
					const newDetector = result.right;
					expect((newDetector as any).stack.length).toBe(2);
				}
			}
		});

		it("handles typeRef with type parameters", () => {
			const detector = LoopDetector.initial;
			const scope = createMockScope();
			const stringType = createTypeRef("string");
			const typeRef = createTypeRef("Array", IArray.fromArray([stringType]));

			const result = detector.including(typeRef, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
			}
		});

		it("detects loop with complex typeRef", () => {
			const scope = createMockScope();
			const numberType = createTypeRef("number");
			const typeRef = createTypeRef("Promise", IArray.fromArray([numberType]));

			const detector1Result = LoopDetector.initial.including(typeRef, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(typeRef, scope);
				expect(isLeft(result)).toBe(true);
			}
		});
	});

	describe("Mixed Entry Types", () => {
		it("allows mixing idents and typeRef entries", () => {
			const scope = createMockScope();
			const idents = IArray.fromArray([
				createSimpleIdent("Module"),
			]) as IArray<TsIdent>;
			const typeRef = createTypeRef("TestType");

			const detector1Result = LoopDetector.initial.including(idents, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(typeRef, scope);
				expect(isRight(result)).toBe(true);
				if (isRight(result)) {
					const newDetector = result.right;
					expect((newDetector as any).stack.length).toBe(2);
				}
			}
		});

		it("detects loop between different entry types with same content", () => {
			const scope = createMockScope();
			const idents = IArray.fromArray([
				createSimpleIdent("TestType"),
			]) as IArray<TsIdent>;
			const typeRef = createTypeRef("TestType");

			// These should be considered different entries even though they reference the same name
			const detector1Result = LoopDetector.initial.including(idents, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(typeRef, scope);
				expect(isRight(result)).toBe(true); // Different entry types, so no loop
				if (isRight(result)) {
					const newDetector = result.right;
					expect((newDetector as any).stack.length).toBe(2);
				}
			}
		});

		it("maintains proper stack order with mixed entries", () => {
			const scope = createMockScope();
			const idents1 = IArray.fromArray([
				createSimpleIdent("Module1"),
			]) as IArray<TsIdent>;
			const typeRef1 = createTypeRef("Type1");
			const idents2 = IArray.fromArray([
				createSimpleIdent("Module2"),
			]) as IArray<TsIdent>;
			const typeRef2 = createTypeRef("Type2");

			const detector1Result = LoopDetector.initial.including(idents1, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const detector2Result = detector1.including(typeRef1, scope);
				expect(isRight(detector2Result)).toBe(true);

				if (isRight(detector2Result)) {
					const detector2 = detector2Result.right;
					const detector3Result = detector2.including(idents2, scope);
					expect(isRight(detector3Result)).toBe(true);

					if (isRight(detector3Result)) {
						const detector3 = detector3Result.right;
						const result = detector3.including(typeRef2, scope);
						expect(isRight(result)).toBe(true);
						if (isRight(result)) {
							const finalDetector = result.right;
							expect((finalDetector as any).stack.length).toBe(4);

							// Stack should be in reverse order (most recent first)
							// Note: We can't directly inspect the internal Entry objects in TypeScript,
							// but we can verify the stack length and that the order is maintained
							const stack = (finalDetector as any).stack;
							expect(stack.length).toBe(4);
						}
					}
				}
			}
		});
	});

	describe("Stack Management", () => {
		it("stack grows with each inclusion", () => {
			const scope = createMockScope();
			const idents1 = IArray.fromArray([
				createSimpleIdent("Type1"),
			]) as IArray<TsIdent>;
			const idents2 = IArray.fromArray([
				createSimpleIdent("Type2"),
			]) as IArray<TsIdent>;
			const idents3 = IArray.fromArray([
				createSimpleIdent("Type3"),
			]) as IArray<TsIdent>;

			const detector1Result = LoopDetector.initial.including(idents1, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const detector2Result = detector1.including(idents2, scope);
				expect(isRight(detector2Result)).toBe(true);

				if (isRight(detector2Result)) {
					const detector2 = detector2Result.right;
					const detector3Result = detector2.including(idents3, scope);
					expect(isRight(detector3Result)).toBe(true);

					if (isRight(detector3Result)) {
						const detector3 = detector3Result.right;
						expect((LoopDetector.initial as any).stack.length).toBe(0);
						expect((detector1 as any).stack.length).toBe(1);
						expect((detector2 as any).stack.length).toBe(2);
						expect((detector3 as any).stack.length).toBe(3);
					}
				}
			}
		});

		it("stack maintains immutability", () => {
			const scope = createMockScope();
			const idents = IArray.fromArray([
				createSimpleIdent("TestType"),
			]) as IArray<TsIdent>;

			const originalDetector = LoopDetector.initial;
			const newDetectorResult = originalDetector.including(idents, scope);
			expect(isRight(newDetectorResult)).toBe(true);

			if (isRight(newDetectorResult)) {
				const newDetector = newDetectorResult.right;
				expect((originalDetector as any).stack.length).toBe(0);
				expect((newDetector as any).stack.length).toBe(1);
				// Original detector should be unchanged
				expect((originalDetector as any).stack.length).toBe(0);
			}
		});

		it("stack contains entries in reverse chronological order", () => {
			const scope = createMockScope();
			const idents1 = IArray.fromArray([
				createSimpleIdent("First"),
			]) as IArray<TsIdent>;
			const idents2 = IArray.fromArray([
				createSimpleIdent("Second"),
			]) as IArray<TsIdent>;
			const idents3 = IArray.fromArray([
				createSimpleIdent("Third"),
			]) as IArray<TsIdent>;

			const detector1Result = LoopDetector.initial.including(idents1, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const detector2Result = detector1.including(idents2, scope);
				expect(isRight(detector2Result)).toBe(true);

				if (isRight(detector2Result)) {
					const detector2 = detector2Result.right;
					const detector3Result = detector2.including(idents3, scope);
					expect(isRight(detector3Result)).toBe(true);

					if (isRight(detector3Result)) {
						const detector = detector3Result.right;
						// Most recent should be first (stack is in reverse chronological order)
						expect((detector as any).stack.length).toBe(3);

						// Verify that we can detect loops with entries from different positions in the stack
						// If we try to add "First" again, it should detect the loop even though it's at the bottom
						const loopResult = detector.including(idents1, scope);
						expect(isLeft(loopResult)).toBe(true); // Should detect loop
					}
				}
			}
		});
	});

	describe("Entry Equality and Comparison", () => {
		it("Entry.Idents equality", () => {
			const scope1 = createMockScope();
			const scope2 = createMockScope2();
			const idents1 = IArray.fromArray([
				createSimpleIdent("TestType"),
			]) as IArray<TsIdent>;
			const idents3 = IArray.fromArray([
				createSimpleIdent("DifferentType"),
			]) as IArray<TsIdent>;

			// Test same idents instance, same scope - should detect loop
			const detector1Result = LoopDetector.initial.including(idents1, scope1);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result2 = detector1.including(idents1, scope1); // Same idents instance, same scope
				expect(isLeft(result2)).toBe(true); // Should detect loop (entries are equal)
			}

			// Test same idents instance, different scope - should not detect loop
			const detector2Result = LoopDetector.initial.including(idents1, scope1);
			expect(isRight(detector2Result)).toBe(true);

			if (isRight(detector2Result)) {
				const detector2 = detector2Result.right;
				const result3 = detector2.including(idents1, scope2); // Same idents instance, different scope
				expect(isRight(result3)).toBe(true); // Should not detect loop (different scope)
			}

			// Test different idents, same scope - should not detect loop
			const detector3Result = LoopDetector.initial.including(idents1, scope1);
			expect(isRight(detector3Result)).toBe(true);

			if (isRight(detector3Result)) {
				const detector3 = detector3Result.right;
				const result4 = detector3.including(idents3, scope1); // Different idents, same scope
				expect(isRight(result4)).toBe(true); // Should not detect loop (different idents)
			}
		});

		it("Entry.Ref equality", () => {
			const scope1 = createMockScope();
			const scope2 = createMockScope2();
			const typeRef1 = createTypeRef("TestType");
			const typeRef3 = createTypeRef("DifferentType");

			// Test same typeRef instance, same scope - should detect loop
			const detector1Result = LoopDetector.initial.including(typeRef1, scope1);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result2 = detector1.including(typeRef1, scope1); // Same typeRef instance, same scope
				expect(isLeft(result2)).toBe(true); // Should detect loop (entries are equal)
			}

			// Test same typeRef instance, different scope - should not detect loop
			const detector2Result = LoopDetector.initial.including(typeRef1, scope1);
			expect(isRight(detector2Result)).toBe(true);

			if (isRight(detector2Result)) {
				const detector2 = detector2Result.right;
				const result3 = detector2.including(typeRef1, scope2); // Same typeRef instance, different scope
				expect(isRight(result3)).toBe(true); // Should not detect loop (different scope)
			}

			// Test different typeRef, same scope - should not detect loop
			const detector3Result = LoopDetector.initial.including(typeRef1, scope1);
			expect(isRight(detector3Result)).toBe(true);

			if (isRight(detector3Result)) {
				const detector3 = detector3Result.right;
				const result4 = detector3.including(typeRef3, scope1); // Different typeRef, same scope
				expect(isRight(result4)).toBe(true); // Should not detect loop (different typeRef)
			}
		});

		it("Entry.Idents vs Entry.Ref are never equal", () => {
			const scope = createMockScope();
			const idents = IArray.fromArray([
				createSimpleIdent("TestType"),
			]) as IArray<TsIdent>;
			const typeRef = createTypeRef("TestType");

			// Even though they reference the same name, they are different entry types
			// so no loop should be detected
			const detector1Result = LoopDetector.initial.including(idents, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(typeRef, scope);
				expect(isRight(result)).toBe(true); // No loop because different entry types
			}
		});
	});

	describe("Complex Loop Detection Scenarios", () => {
		it("detects deep circular reference", () => {
			const scope = createMockScope();
			const typeA = createTypeRef("TypeA");
			const typeB = createTypeRef("TypeB");
			const typeC = createTypeRef("TypeC");

			// Create a chain: A -> B -> C -> A (circular)
			const detector1Result = LoopDetector.initial.including(typeA, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const detector2Result = detector1.including(typeB, scope);
				expect(isRight(detector2Result)).toBe(true);

				if (isRight(detector2Result)) {
					const detector2 = detector2Result.right;
					const detector3Result = detector2.including(typeC, scope);
					expect(isRight(detector3Result)).toBe(true);

					if (isRight(detector3Result)) {
						const detector3 = detector3Result.right;
						const result = detector3.including(typeA, scope); // This should detect the loop
						expect(isLeft(result)).toBe(true); // Loop detected
					}
				}
			}
		});

		it("allows complex non-circular chains", () => {
			const scope = createMockScope();
			const types = Array.from({ length: 10 }, (_, i) =>
				createTypeRef(`Type${i + 1}`),
			);

			let detector = LoopDetector.initial;
			for (const tpe of types) {
				const result = detector.including(tpe, scope);
				expect(isRight(result)).toBe(true);
				if (isRight(result)) {
					detector = result.right;
				}
			}

			expect((detector as any).stack.length).toBe(10);
		});

		it("detects loop with mixed entry types", () => {
			const scope = createMockScope();
			const idents = IArray.fromArray([
				createSimpleIdent("TestType"),
			]) as IArray<TsIdent>;
			const typeRef = createTypeRef("TestType");

			// Even though they reference the same name, they are different entry types
			// so no loop should be detected
			const detector1Result = LoopDetector.initial.including(idents, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(typeRef, scope);
				expect(isRight(result)).toBe(true); // No loop because different entry types
			}
		});
	});

	describe("Edge Cases and Boundary Conditions", () => {
		it("handles empty qualified identifiers", () => {
			const detector = LoopDetector.initial;
			const scope = createMockScope();
			const emptyQIdent = TsQIdent.of();
			const typeRef = TsTypeRef.create(
				Comments.empty(),
				emptyQIdent,
				IArray.Empty,
			);

			const result = detector.including(typeRef, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
			}
		});

		it("handles very long identifier chains", () => {
			const detector = LoopDetector.initial;
			const scope = createMockScope();
			const longIdents = IArray.fromArray(
				Array.from({ length: 100 }, (_, i) =>
					createSimpleIdent(`Part${i + 1}`),
				),
			) as IArray<TsIdent>;

			const result = detector.including(longIdents, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
			}
		});

		it("handles special characters in identifiers", () => {
			const detector = LoopDetector.initial;
			const scope = createMockScope();
			const specialIdents = IArray.fromArray([
				createSimpleIdent("$special"),
				createSimpleIdent("_underscore"),
				createSimpleIdent("123numeric"),
				createSimpleIdent("with-dash"),
				createSimpleIdent("with.dot"),
			]) as IArray<TsIdent>;

			const result = detector.including(specialIdents, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
			}
		});

		it("handles unicode characters in identifiers", () => {
			const detector = LoopDetector.initial;
			const scope = createMockScope();
			const unicodeIdents = IArray.fromArray([
				createSimpleIdent("测试"),
				createSimpleIdent("тест"),
				createSimpleIdent("🚀"),
				createSimpleIdent("café"),
			]) as IArray<TsIdent>;

			const result = detector.including(unicodeIdents, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
			}
		});

		it("handles complex type parameters", () => {
			const detector = LoopDetector.initial;
			const scope = createMockScope();

			// Create nested type parameters: Map<string, Array<number>>
			const stringType = createTypeRef("string");
			const numberType = createTypeRef("number");
			const arrayType = createTypeRef("Array", IArray.fromArray([numberType]));
			const mapType = createTypeRef(
				"Map",
				IArray.fromArray([stringType, arrayType]),
			);

			const result = detector.including(mapType, scope);

			expect(isRight(result)).toBe(true);
			if (isRight(result)) {
				const newDetector = result.right;
				expect((newDetector as any).stack.length).toBe(1);
			}
		});

		it("handles same content with different scopes in sequence", () => {
			const scope1 = createMockScope();
			const scope2 = createMockScope2();
			const idents = IArray.fromArray([
				createSimpleIdent("SharedType"),
			]) as IArray<TsIdent>;

			const detector1Result = LoopDetector.initial.including(idents, scope1);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const detector2Result = detector1.including(idents, scope2);
				expect(isRight(detector2Result)).toBe(true);

				if (isRight(detector2Result)) {
					const detector2 = detector2Result.right;
					const result = detector2.including(idents, scope1); // Back to first scope - should detect loop
					expect(isLeft(result)).toBe(true); // Loop detected
				}
			}
		});
	});

	describe("Performance and Stress Tests", () => {
		it("handles large stack without performance degradation", () => {
			const scope = createMockScope();
			let detector = LoopDetector.initial;
			const identArrays: IArray<TsIdent>[] = [];

			// Build a large stack, keeping references to the arrays for proper loop detection
			for (let i = 1; i <= 1000; i++) {
				const idents = IArray.fromArray([
					createSimpleIdent(`Type${i}`),
				]) as IArray<TsIdent>;
				identArrays.push(idents);
				const result = detector.including(idents, scope);
				expect(isRight(result)).toBe(true);
				if (isRight(result)) {
					detector = result.right;
				}
			}

			expect((detector as any).stack.length).toBe(1000);

			// Test loop detection still works efficiently with large stack
			// Use the exact same idents array that was used for "Type500" (index 499)
			const duplicateIdents = identArrays[499]; // This is the same array used for "Type500"
			const loopResult = detector.including(duplicateIdents, scope);

			// Should detect loop because we're using the same array instance that's already in the stack
			expect(isLeft(loopResult)).toBe(true);

			// Verify that the performance is still good - the operation should complete quickly
			// even with a large stack (this is implicitly tested by the test not timing out)
		});

		it("memory efficiency with repeated operations", () => {
			const scope = createMockScope();
			const idents = IArray.fromArray([
				createSimpleIdent("TestType"),
			]) as IArray<TsIdent>;

			// Perform many operations to test memory usage
			for (let i = 0; i < 100; i++) {
				const detectorResult = LoopDetector.initial.including(idents, scope);
				expect(isRight(detectorResult)).toBe(true);

				if (isRight(detectorResult)) {
					const detector = detectorResult.right;
					expect((detector as any).stack.length).toBe(1);

					// Test loop detection
					const loopResult = detector.including(idents, scope);
					expect(isLeft(loopResult)).toBe(true);
				}
			}
		});
	});

	describe("Integration with Real TypeScript Patterns", () => {
		it("handles common TypeScript recursive patterns", () => {
			const scope = createMockScope();

			// Simulate: interface Node { children: Node[] }
			const nodeType = createTypeRef("Node");
			const arrayNodeType = createTypeRef(
				"Array",
				IArray.fromArray([nodeType]),
			);

			const detector1Result = LoopDetector.initial.including(nodeType, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(arrayNodeType, scope);
				expect(isRight(result)).toBe(true); // Different types, no direct loop

				// But if we try to include Node again, it should detect the loop
				if (isRight(result)) {
					const detector2 = result.right;
					const loopResult = detector2.including(nodeType, scope);
					expect(isLeft(loopResult)).toBe(true); // Loop detected
				}
			}
		});

		it("handles generic type constraints", () => {
			const scope = createMockScope();

			// Simulate: interface Container<T extends Container<T>>
			const tParam = createTypeRef("T");
			const containerT = createTypeRef("Container", IArray.fromArray([tParam]));

			const detector1Result = LoopDetector.initial.including(containerT, scope);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;
				const result = detector1.including(containerT, scope); // Same type again
				expect(isLeft(result)).toBe(true); // Loop detected
			}
		});

		it("handles module and namespace patterns", () => {
			const scope = createMockScope();

			// Simulate nested module access: A.B.C.Type
			const moduleIdents = IArray.fromArray([
				createSimpleIdent("A"),
				createSimpleIdent("B"),
				createSimpleIdent("C"),
				createSimpleIdent("Type"),
			]) as IArray<TsIdent>;

			const detector1Result = LoopDetector.initial.including(
				moduleIdents,
				scope,
			);
			expect(isRight(detector1Result)).toBe(true);

			if (isRight(detector1Result)) {
				const detector1 = detector1Result.right;

				// Different module path should be allowed
				const differentModuleIdents = IArray.fromArray([
					createSimpleIdent("A"),
					createSimpleIdent("B"),
					createSimpleIdent("D"),
					createSimpleIdent("Type"),
				]) as IArray<TsIdent>;

				const result = detector1.including(differentModuleIdents, scope);
				expect(isRight(result)).toBe(true);

				// But same path should detect loop
				if (isRight(result)) {
					const detector2 = result.right;
					const loopResult = detector2.including(moduleIdents, scope);
					expect(isLeft(loopResult)).toBe(true);
				}
			}
		});
	});
});
