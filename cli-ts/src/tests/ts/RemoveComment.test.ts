/**
 * Tests for RemoveComment.ts - TypeScript port of org.scalablytyped.converter.internal.ts.RemoveCommentTests
 */

import { describe, expect, it } from "vitest";
import { some } from "fp-ts/Option";
import { Raw } from "../../internal/Comment.js";
import { Comments } from "../../internal/Comments.js";
import { IArray } from "../../internal/IArray.js";
import { CodePath } from "../../internal/ts/CodePath.js";
import { JsLocation } from "../../internal/ts/JsLocation.js";
import { MethodType } from "../../internal/ts/MethodType.js";
import { RemoveComment } from "../../internal/ts/RemoveComment.js";
import { TsProtectionLevel } from "../../internal/ts/TsProtectionLevel.js";
import {
	TsDeclFunction,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	TsMemberCall,
	TsMemberCtor,
	TsMemberFunction,
	TsTypeRef,
} from "../../internal/ts/trees.js";

// ============================================================================
// Helper methods for creating test data with comments
// ============================================================================

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createCommentsWithRaw(raw: string): Comments {
	return Comments.apply([new Raw(raw)]);
}

function createCommentsWithMultiple(...raws: string[]): Comments {
	return Comments.apply(raws.map((raw) => new Raw(raw)));
}

function createMockFunSig(): TsFunSig {
	return TsFunSig.create(
		Comments.empty(),
		IArray.Empty, // tparams
		IArray.Empty, // params
		some(TsTypeRef.any),
	);
}

function createMockMemberFunction(
	name: string,
	comments: Comments = Comments.empty(),
): TsMemberFunction {
	return TsMemberFunction.create(
		comments,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		MethodType.normal(),
		createMockFunSig(),
		false, // isStatic
		false, // isReadOnly
	);
}

function createMockMemberCall(
	comments: Comments = Comments.empty(),
): TsMemberCall {
	return TsMemberCall.create(
		comments,
		TsProtectionLevel.default(),
		createMockFunSig(),
	);
}

function createMockMemberCtor(
	comments: Comments = Comments.empty(),
): TsMemberCtor {
	return TsMemberCtor.create(
		comments,
		TsProtectionLevel.default(),
		createMockFunSig(),
	);
}

function createMockDeclFunction(
	name: string,
	comments: Comments = Comments.empty(),
): TsDeclFunction {
	return TsDeclFunction.create(
		comments,
		false, // declared
		createSimpleIdent(name),
		createMockFunSig(),
		JsLocation.zero(),
		CodePath.noPath(),
	);
}

// ============================================================================
// Tests
// ============================================================================

describe("RemoveComment", () => {
	describe("RemoveComment trait - Basic Functionality", () => {
		it("remove method exists for all supported types", () => {
			// Test that instances exist for all supported types
			const memberFunction = createMockMemberFunction(
				"test",
				createCommentsWithRaw("test comment"),
			);
			const memberCall = createMockMemberCall(
				createCommentsWithRaw("call comment"),
			);
			const memberCtor = createMockMemberCtor(
				createCommentsWithRaw("ctor comment"),
			);
			const declFunction = createMockDeclFunction(
				"testFunc",
				createCommentsWithRaw("func comment"),
			);

			// These should work without errors, proving the instances exist
			const removedFunction = RemoveComment.r1.remove(memberFunction);
			const removedCall = RemoveComment.r2.remove(memberCall);
			const removedCtor = RemoveComment.r0.remove(memberCtor);
			const removedDecl = RemoveComment.r3.remove(declFunction);

			// Verify comments are removed
			expect(removedFunction.comments).toEqual(Comments.empty());
			expect(removedCall.comments).toEqual(Comments.empty());
			expect(removedCtor.comments).toEqual(Comments.empty());
			expect(removedDecl.comments).toEqual(Comments.empty());
		});
	});

	describe("TsMemberFunction - Comment Removal", () => {
		it("removes single comment", () => {
			const originalComments = createCommentsWithRaw("This is a test comment");
			const memberFunction = createMockMemberFunction(
				"testMethod",
				originalComments,
			);

			expect(memberFunction.comments).toEqual(originalComments);
			expect(memberFunction.comments.nonEmpty).toBe(true);

			const removed = RemoveComment.r1.remove(memberFunction);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.comments.isEmpty).toBe(true);
			// Verify other properties are preserved
			expect(removed.name).toEqual(memberFunction.name);
			expect(removed.level).toEqual(memberFunction.level);
			expect(removed.methodType).toEqual(memberFunction.methodType);
			expect(removed.signature).toEqual(memberFunction.signature);
			expect(removed.isStatic).toBe(memberFunction.isStatic);
			expect(removed.isReadOnly).toBe(memberFunction.isReadOnly);
		});

		it("removes multiple comments", () => {
			const originalComments = createCommentsWithMultiple(
				"Comment 1",
				"Comment 2",
				"Comment 3",
			);
			const memberFunction = createMockMemberFunction(
				"testMethod",
				originalComments,
			);

			expect(memberFunction.comments.nonEmpty).toBe(true);
			expect(memberFunction.comments.cs.length).toBe(3);

			const removed = RemoveComment.r1.remove(memberFunction);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.comments.isEmpty).toBe(true);
		});

		it("handles already empty comments", () => {
			const memberFunction = createMockMemberFunction(
				"testMethod",
				Comments.empty(),
			);

			expect(memberFunction.comments).toEqual(Comments.empty());

			const removed = RemoveComment.r1.remove(memberFunction);

			expect(removed.comments).toEqual(Comments.empty());
			// Should be the same object or equivalent
			expect(removed.name).toEqual(memberFunction.name);
		});
	});

	describe("TsMemberCall - Comment Removal", () => {
		it("removes single comment", () => {
			const originalComments = createCommentsWithRaw("Call signature comment");
			const memberCall = createMockMemberCall(originalComments);

			expect(memberCall.comments).toEqual(originalComments);
			expect(memberCall.comments.nonEmpty).toBe(true);

			const removed = RemoveComment.r2.remove(memberCall);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.comments.isEmpty).toBe(true);
			// Verify other properties are preserved
			expect(removed.level).toEqual(memberCall.level);
			expect(removed.signature).toEqual(memberCall.signature);
		});

		it("removes multiple comments", () => {
			const originalComments = createCommentsWithMultiple(
				"Call comment 1",
				"Call comment 2",
			);
			const memberCall = createMockMemberCall(originalComments);

			expect(memberCall.comments.nonEmpty).toBe(true);
			expect(memberCall.comments.cs.length).toBe(2);

			const removed = RemoveComment.r2.remove(memberCall);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.comments.isEmpty).toBe(true);
		});

		it("handles already empty comments", () => {
			const memberCall = createMockMemberCall(Comments.empty());

			expect(memberCall.comments).toEqual(Comments.empty());

			const removed = RemoveComment.r2.remove(memberCall);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.level).toEqual(memberCall.level);
		});
	});

	describe("TsMemberCtor - Comment Removal", () => {
		it("removes single comment", () => {
			const originalComments = createCommentsWithRaw(
				"Constructor signature comment",
			);
			const memberCtor = createMockMemberCtor(originalComments);

			expect(memberCtor.comments).toEqual(originalComments);
			expect(memberCtor.comments.nonEmpty).toBe(true);

			const removed = RemoveComment.r0.remove(memberCtor);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.comments.isEmpty).toBe(true);
			// Verify other properties are preserved
			expect(removed.level).toEqual(memberCtor.level);
			expect(removed.signature).toEqual(memberCtor.signature);
		});

		it("removes multiple comments", () => {
			const originalComments = createCommentsWithMultiple(
				"Ctor comment 1",
				"Ctor comment 2",
				"Ctor comment 3",
			);
			const memberCtor = createMockMemberCtor(originalComments);

			expect(memberCtor.comments.nonEmpty).toBe(true);
			expect(memberCtor.comments.cs.length).toBe(3);

			const removed = RemoveComment.r0.remove(memberCtor);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.comments.isEmpty).toBe(true);
		});

		it("handles already empty comments", () => {
			const memberCtor = createMockMemberCtor(Comments.empty());

			expect(memberCtor.comments).toEqual(Comments.empty());

			const removed = RemoveComment.r0.remove(memberCtor);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.level).toEqual(memberCtor.level);
		});
	});

	describe("TsDeclFunction - Comment Removal", () => {
		it("removes single comment", () => {
			const originalComments = createCommentsWithRaw(
				"Function declaration comment",
			);
			const declFunction = createMockDeclFunction("testFunc", originalComments);

			expect(declFunction.comments).toEqual(originalComments);
			expect(declFunction.comments.nonEmpty).toBe(true);

			const removed = RemoveComment.r3.remove(declFunction);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.comments.isEmpty).toBe(true);
			// Verify other properties are preserved
			expect(removed.name).toEqual(declFunction.name);
			expect(removed.declared).toBe(declFunction.declared);
			expect(removed.signature).toEqual(declFunction.signature);
			expect(removed.jsLocation).toEqual(declFunction.jsLocation);
			expect(removed.codePath).toEqual(declFunction.codePath);
		});

		it("removes multiple comments", () => {
			const originalComments = createCommentsWithMultiple(
				"Func comment 1",
				"Func comment 2",
			);
			const declFunction = createMockDeclFunction("testFunc", originalComments);

			expect(declFunction.comments.nonEmpty).toBe(true);
			expect(declFunction.comments.cs.length).toBe(2);

			const removed = RemoveComment.r3.remove(declFunction);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.comments.isEmpty).toBe(true);
		});

		it("handles already empty comments", () => {
			const declFunction = createMockDeclFunction("testFunc", Comments.empty());

			expect(declFunction.comments).toEqual(Comments.empty());

			const removed = RemoveComment.r3.remove(declFunction);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.name).toEqual(declFunction.name);
		});

		it("preserves declared flag", () => {
			const declaredFunction = TsDeclFunction.create(
				createCommentsWithRaw("Declared function comment"),
				true, // declared
				createSimpleIdent("declaredFunc"),
				createMockFunSig(),
				JsLocation.zero(),
				CodePath.noPath(),
			);

			expect(declaredFunction.declared).toBe(true);

			const removed = RemoveComment.r3.remove(declaredFunction);

			expect(removed.comments).toEqual(Comments.empty());
			expect(removed.declared).toBe(true);
		});
	});

	describe("keepFirstOnly method - Basic Functionality", () => {
		it("empty array returns empty array", () => {
			const emptyArray: IArray<TsMemberFunction> = IArray.Empty;
			const result = RemoveComment.keepFirstOnly(emptyArray, RemoveComment.r1);

			expect(result.isEmpty).toBe(true);
			expect(result.length).toBe(0);
		});

		it("single element array preserves comments", () => {
			const singleFunction = createMockMemberFunction(
				"single",
				createCommentsWithRaw("Keep this comment"),
			);
			const array = IArray.fromArray([singleFunction]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r1);

			expect(result.length).toBe(1);
			expect(result.get(0).comments).toEqual(singleFunction.comments);
			expect(result.get(0).comments.nonEmpty).toBe(true);
			expect(result.get(0).name).toEqual(singleFunction.name);
		});

		it("multiple elements - first keeps comments, rest lose comments", () => {
			const func1 = createMockMemberFunction(
				"first",
				createCommentsWithRaw("Keep this comment"),
			);
			const func2 = createMockMemberFunction(
				"second",
				createCommentsWithRaw("Remove this comment"),
			);
			const func3 = createMockMemberFunction(
				"third",
				createCommentsWithRaw("Remove this too"),
			);
			const array = IArray.fromArray([func1, func2, func3]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r1);

			expect(result.length).toBe(3);

			// First element should keep its comments
			expect(result.get(0).comments).toEqual(func1.comments);
			expect(result.get(0).comments.nonEmpty).toBe(true);
			expect(result.get(0).name).toEqual(func1.name);

			// Second and third elements should have comments removed
			expect(result.get(1).comments).toEqual(Comments.empty());
			expect(result.get(1).comments.isEmpty).toBe(true);
			expect(result.get(1).name).toEqual(func2.name);

			expect(result.get(2).comments).toEqual(Comments.empty());
			expect(result.get(2).comments.isEmpty).toBe(true);
			expect(result.get(2).name).toEqual(func3.name);
		});

		it("works with TsMemberCall", () => {
			const call1 = createMockMemberCall(
				createCommentsWithRaw("Keep this call comment"),
			);
			const call2 = createMockMemberCall(
				createCommentsWithRaw("Remove this call comment"),
			);
			const array = IArray.fromArray([call1, call2]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r2);

			expect(result.length).toBe(2);
			expect(result.get(0).comments).toEqual(call1.comments);
			expect(result.get(0).comments.nonEmpty).toBe(true);
			expect(result.get(1).comments).toEqual(Comments.empty());
			expect(result.get(1).comments.isEmpty).toBe(true);
		});

		it("works with TsMemberCtor", () => {
			const ctor1 = createMockMemberCtor(
				createCommentsWithRaw("Keep this ctor comment"),
			);
			const ctor2 = createMockMemberCtor(
				createCommentsWithRaw("Remove this ctor comment"),
			);
			const ctor3 = createMockMemberCtor(
				createCommentsWithRaw("Remove this ctor comment too"),
			);
			const array = IArray.fromArray([ctor1, ctor2, ctor3]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r0);

			expect(result.length).toBe(3);
			expect(result.get(0).comments).toEqual(ctor1.comments);
			expect(result.get(0).comments.nonEmpty).toBe(true);
			expect(result.get(1).comments).toEqual(Comments.empty());
			expect(result.get(2).comments).toEqual(Comments.empty());
		});

		it("works with TsDeclFunction", () => {
			const decl1 = createMockDeclFunction(
				"first",
				createCommentsWithRaw("Keep this decl comment"),
			);
			const decl2 = createMockDeclFunction(
				"second",
				createCommentsWithRaw("Remove this decl comment"),
			);
			const array = IArray.fromArray([decl1, decl2]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r3);

			expect(result.length).toBe(2);
			expect(result.get(0).comments).toEqual(decl1.comments);
			expect(result.get(0).comments.nonEmpty).toBe(true);
			expect(result.get(0).name).toEqual(decl1.name);
			expect(result.get(1).comments).toEqual(Comments.empty());
			expect(result.get(1).comments.isEmpty).toBe(true);
			expect(result.get(1).name).toEqual(decl2.name);
		});
	});

	describe("keepFirstOnly method - Edge Cases and Boundary Conditions", () => {
		it("first element has no comments, others have comments", () => {
			const func1 = createMockMemberFunction("first", Comments.empty());
			const func2 = createMockMemberFunction(
				"second",
				createCommentsWithRaw("This will be removed"),
			);
			const func3 = createMockMemberFunction(
				"third",
				createCommentsWithRaw("This will also be removed"),
			);
			const array = IArray.fromArray([func1, func2, func3]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r1);

			expect(result.length).toBe(3);
			// First element should keep its (empty) comments
			expect(result.get(0).comments).toEqual(Comments.empty());
			expect(result.get(0).comments.isEmpty).toBe(true);
			// Others should have comments removed
			expect(result.get(1).comments).toEqual(Comments.empty());
			expect(result.get(2).comments).toEqual(Comments.empty());
		});

		it("all elements have no comments", () => {
			const func1 = createMockMemberFunction("first", Comments.empty());
			const func2 = createMockMemberFunction("second", Comments.empty());
			const array = IArray.fromArray([func1, func2]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r1);

			expect(result.length).toBe(2);
			expect(result.get(0).comments).toEqual(Comments.empty());
			expect(result.get(1).comments).toEqual(Comments.empty());
		});

		it("preserves order of elements", () => {
			const func1 = createMockMemberFunction(
				"alpha",
				createCommentsWithRaw("Keep"),
			);
			const func2 = createMockMemberFunction(
				"beta",
				createCommentsWithRaw("Remove"),
			);
			const func3 = createMockMemberFunction(
				"gamma",
				createCommentsWithRaw("Remove"),
			);
			const func4 = createMockMemberFunction(
				"delta",
				createCommentsWithRaw("Remove"),
			);
			const array = IArray.fromArray([func1, func2, func3, func4]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r1);

			expect(result.length).toBe(4);
			expect(result.get(0).name.value).toBe("alpha");
			expect(result.get(1).name.value).toBe("beta");
			expect(result.get(2).name.value).toBe("gamma");
			expect(result.get(3).name.value).toBe("delta");

			// Only first should have comments
			expect(result.get(0).comments.nonEmpty).toBe(true);
			expect(result.get(1).comments.isEmpty).toBe(true);
			expect(result.get(2).comments.isEmpty).toBe(true);
			expect(result.get(3).comments.isEmpty).toBe(true);
		});

		it("handles large arrays efficiently", () => {
			const functions = Array.from({ length: 100 }, (_, i) =>
				createMockMemberFunction(
					`func${i + 1}`,
					createCommentsWithRaw(`Comment ${i + 1}`),
				),
			);
			const array = IArray.fromArray(functions);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r1);

			expect(result.length).toBe(100);
			// First element keeps comments
			expect(result.get(0).comments.nonEmpty).toBe(true);
			expect(result.get(0).name.value).toBe("func1");

			// All others lose comments
			for (let i = 1; i < 100; i++) {
				expect(result.get(i).comments.isEmpty).toBe(true);
				expect(result.get(i).name.value).toBe(`func${i + 1}`);
			}
		});

		it("mixed types with first element having multiple comments", () => {
			const multipleComments = createCommentsWithMultiple(
				"Comment 1",
				"Comment 2",
				"Comment 3",
			);
			const func1 = createMockMemberFunction("first", multipleComments);
			const func2 = createMockMemberFunction(
				"second",
				createCommentsWithRaw("Single comment"),
			);
			const array = IArray.fromArray([func1, func2]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r1);

			expect(result.length).toBe(2);
			expect(result.get(0).comments).toEqual(multipleComments);
			expect(result.get(0).comments.cs.length).toBe(3);
			expect(result.get(1).comments).toEqual(Comments.empty());
			expect(result.get(1).comments.isEmpty).toBe(true);
		});
	});

	describe("Integration Tests - Real-world Scenarios", () => {
		it("processing overloaded functions", () => {
			// Simulate overloaded functions where only the first should keep documentation
			const overload1 = createMockDeclFunction(
				"process",
				createCommentsWithRaw("Main documentation for process function"),
			);
			const overload2 = createMockDeclFunction(
				"process",
				createCommentsWithRaw("Overload 1 documentation"),
			);
			const overload3 = createMockDeclFunction(
				"process",
				createCommentsWithRaw("Overload 2 documentation"),
			);
			const overloads = IArray.fromArray([overload1, overload2, overload3]);

			const result = RemoveComment.keepFirstOnly(overloads, RemoveComment.r3);

			expect(result.length).toBe(3);
			expect(result.get(0).comments.nonEmpty).toBe(true);
			expect(result.get(0).comments.rawCs[0]).toBe(
				"Main documentation for process function",
			);
			expect(result.get(1).comments.isEmpty).toBe(true);
			expect(result.get(2).comments.isEmpty).toBe(true);

			// All should have the same name
			expect(result.toArray().every((f) => f.name.value === "process")).toBe(
				true,
			);
		});

		it("processing constructor overloads", () => {
			const ctor1 = createMockMemberCtor(
				createCommentsWithRaw("Primary constructor documentation"),
			);
			const ctor2 = createMockMemberCtor(
				createCommentsWithRaw("Alternative constructor"),
			);
			const ctors = IArray.fromArray([ctor1, ctor2]);

			const result = RemoveComment.keepFirstOnly(ctors, RemoveComment.r0);

			expect(result.length).toBe(2);
			expect(result.get(0).comments.nonEmpty).toBe(true);
			expect(result.get(0).comments.rawCs[0]).toBe(
				"Primary constructor documentation",
			);
			expect(result.get(1).comments.isEmpty).toBe(true);
		});

		it("processing call signatures", () => {
			const call1 = createMockMemberCall(
				createCommentsWithRaw("Primary call signature"),
			);
			const call2 = createMockMemberCall(
				createCommentsWithRaw("Alternative call signature"),
			);
			const call3 = createMockMemberCall(
				createCommentsWithRaw("Third call signature"),
			);
			const calls = IArray.fromArray([call1, call2, call3]);

			const result = RemoveComment.keepFirstOnly(calls, RemoveComment.r2);

			expect(result.length).toBe(3);
			expect(result.get(0).comments.nonEmpty).toBe(true);
			expect(result.get(1).comments.isEmpty).toBe(true);
			expect(result.get(2).comments.isEmpty).toBe(true);
		});

		it("type consistency - keepFirstOnly works with homogeneous arrays", () => {
			// Test that keepFirstOnly requires all elements to be of the same type
			// This is a design constraint of the method due to the type parameter requirement

			// Test with all TsMemberFunction
			const func1 = createMockMemberFunction(
				"method1",
				createCommentsWithRaw("Method comment 1"),
			);
			const func2 = createMockMemberFunction(
				"method2",
				createCommentsWithRaw("Method comment 2"),
			);
			const func3 = createMockMemberFunction(
				"method3",
				createCommentsWithRaw("Method comment 3"),
			);
			const functions = IArray.fromArray([func1, func2, func3]);
			const resultFunctions = RemoveComment.keepFirstOnly(
				functions,
				RemoveComment.r1,
			);

			expect(resultFunctions.length).toBe(3);
			expect(resultFunctions.get(0).comments.nonEmpty).toBe(true);
			expect(resultFunctions.get(1).comments.isEmpty).toBe(true);
			expect(resultFunctions.get(2).comments.isEmpty).toBe(true);

			// Test with all TsMemberCall
			const call1 = createMockMemberCall(
				createCommentsWithRaw("Call comment 1"),
			);
			const call2 = createMockMemberCall(
				createCommentsWithRaw("Call comment 2"),
			);
			const calls = IArray.fromArray([call1, call2]);
			const resultCalls = RemoveComment.keepFirstOnly(calls, RemoveComment.r2);

			expect(resultCalls.length).toBe(2);
			expect(resultCalls.get(0).comments.nonEmpty).toBe(true);
			expect(resultCalls.get(1).comments.isEmpty).toBe(true);

			// Test with all TsMemberCtor
			const ctor1 = createMockMemberCtor(
				createCommentsWithRaw("Ctor comment 1"),
			);
			const ctor2 = createMockMemberCtor(
				createCommentsWithRaw("Ctor comment 2"),
			);
			const ctors = IArray.fromArray([ctor1, ctor2]);
			const resultCtors = RemoveComment.keepFirstOnly(ctors, RemoveComment.r0);

			expect(resultCtors.length).toBe(2);
			expect(resultCtors.get(0).comments.nonEmpty).toBe(true);
			expect(resultCtors.get(1).comments.isEmpty).toBe(true);
		});
	});

	describe("Comment Content Preservation", () => {
		it("preserves exact comment content in first element", () => {
			const originalComment =
				"This is a very specific comment with special characters: @param {string} name - The name parameter";
			const func1 = createMockMemberFunction(
				"test",
				createCommentsWithRaw(originalComment),
			);
			const func2 = createMockMemberFunction(
				"test2",
				createCommentsWithRaw("This will be removed"),
			);
			const array = IArray.fromArray([func1, func2]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r1);

			expect(result.get(0).comments.rawCs[0]).toBe(originalComment);
			expect(result.get(1).comments.rawCs.length).toBe(0);
		});

		it("preserves multiple comments in first element", () => {
			const comment1 = "First comment";
			const comment2 = "Second comment";
			const comment3 = "Third comment";
			const multiComments = createCommentsWithMultiple(
				comment1,
				comment2,
				comment3,
			);
			const func1 = createMockMemberFunction("test", multiComments);
			const func2 = createMockMemberFunction(
				"test2",
				createCommentsWithRaw("Remove this"),
			);
			const array = IArray.fromArray([func1, func2]);

			const result = RemoveComment.keepFirstOnly(array, RemoveComment.r1);

			expect(result.get(0).comments.rawCs.length).toBe(3);
			expect(result.get(0).comments.rawCs).toContain(comment1);
			expect(result.get(0).comments.rawCs).toContain(comment2);
			expect(result.get(0).comments.rawCs).toContain(comment3);
			expect(result.get(1).comments.rawCs.length).toBe(0);
		});
	});
});
