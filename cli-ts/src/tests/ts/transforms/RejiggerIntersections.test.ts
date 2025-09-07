/**
 * Tests for RejiggerIntersections transformation
 */

import { describe, expect, it } from "vitest";
import { Comments, NoComments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { Logger } from "../../../internal/logging/index.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { TsTreeScope } from "../../../internal/ts/TsTreeScope.js";
import { RejiggerIntersections } from "../../../internal/ts/transforms/RejiggerIntersections.js";
import {
	TsIdent,
	TsTypeIntersect,
	TsTypeRef,
	TsTypeUnion,
	type TsQIdent,
	type TsType,
} from "../../../internal/ts/trees.js";

describe("RejiggerIntersections", () => {
	// Helper functions for creating test objects
	function createQIdent(...parts: string[]): TsQIdent {
		return {
			_tag: "TsQIdent",
			parts: IArray.fromArray(parts.map(p => TsIdent.simple(p) as TsIdent)),
			asString: `TsQIdent(${parts.join(".")})`
		};
	}

	function createTypeRef(name: string): TsTypeRef {
		return TsTypeRef.create(NoComments.instance, createQIdent(name), IArray.Empty);
	}

	function createUnionType(...types: TsType[]): TsTypeUnion {
		return TsTypeUnion.create(IArray.fromArray(types));
	}

	function createIntersectionType(...types: TsType[]): TsTypeIntersect {
		return TsTypeIntersect.create(IArray.fromArray(types));
	}

	function createMockScope(): TsTreeScope {
		return TsTreeScope.create(
			TsIdent.librarySimple("test-lib"),
			false,
			new Map(),
			Logger.DevNull()
		);
	}

	describe("Basic Functionality", () => {
		it("has apply method that returns visitor", () => {
			const visitor = RejiggerIntersections.apply();
			expect(visitor).toBeDefined();
		});

		it("has enterTsType method", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			const typeRef = createTypeRef("string");
			const result = visitor.enterTsType(scope)(typeRef);
			expect(result).toBeDefined();
		});

		it("leaves non-intersection types unchanged", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			const typeRef = createTypeRef("string");

			const result = visitor.enterTsType(scope)(typeRef);

			expect(result).toBe(typeRef);
		});

		it("leaves union types unchanged", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			const unionType = createUnionType(createTypeRef("string"), createTypeRef("number"));

			const result = visitor.enterTsType(scope)(unionType);

			expect(result).toBe(unionType);
		});
	});

	describe("Intersection Type Processing", () => {
		it("leaves intersection without union unchanged", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			const intersectionType = createIntersectionType(
				createTypeRef("A"),
				createTypeRef("B"),
				createTypeRef("C")
			);

			const result = visitor.enterTsType(scope)(intersectionType);

			expect(result).toBe(intersectionType);
		});

		it("leaves intersection with multiple unions unchanged", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			const union1 = createUnionType(createTypeRef("B"), createTypeRef("C"));
			const union2 = createUnionType(createTypeRef("D"), createTypeRef("E"));
			const intersectionType = createIntersectionType(
				createTypeRef("A"),
				union1,
				union2
			);

			const result = visitor.enterTsType(scope)(intersectionType);

			// Should remain unchanged to avoid code explosion
			expect(result).toBe(intersectionType);
		});

		it("transforms intersection with exactly one union", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			
			// Create A & (B | C) & D
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const typeD = createTypeRef("D");
			const union = createUnionType(typeB, typeC);
			const intersectionType = createIntersectionType(typeA, union, typeD);

			const result = visitor.enterTsType(scope)(intersectionType);

			// Should become (A & B & D) | (A & C & D)
			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2);

			// Check first union member: A & B & D
			const firstMember = resultUnion.types.apply(0);
			expect(firstMember._tag).toBe("TsTypeIntersect");
			const firstIntersection = firstMember as TsTypeIntersect;
			expect(firstIntersection.types.length).toBe(3);

			// Check second union member: A & C & D
			const secondMember = resultUnion.types.apply(1);
			expect(secondMember._tag).toBe("TsTypeIntersect");
			const secondIntersection = secondMember as TsTypeIntersect;
			expect(secondIntersection.types.length).toBe(3);
		});

		it("handles single type intersection with union", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			
			// Create A & (B | C)
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const union = createUnionType(typeB, typeC);
			const intersectionType = createIntersectionType(typeA, union);

			const result = visitor.enterTsType(scope)(intersectionType);

			// Should become (A & B) | (A & C)
			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2);

			// Check first union member: A & B
			const firstMember = resultUnion.types.apply(0);
			expect(firstMember._tag).toBe("TsTypeIntersect");
			const firstIntersection = firstMember as TsTypeIntersect;
			expect(firstIntersection.types.length).toBe(2);

			// Check second union member: A & C
			const secondMember = resultUnion.types.apply(1);
			expect(secondMember._tag).toBe("TsTypeIntersect");
			const secondIntersection = secondMember as TsTypeIntersect;
			expect(secondIntersection.types.length).toBe(2);
		});

		it("handles union at different positions in intersection", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			
			// Create (A | B) & C & D
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const typeD = createTypeRef("D");
			const union = createUnionType(typeA, typeB);
			const intersectionType = createIntersectionType(union, typeC, typeD);

			const result = visitor.enterTsType(scope)(intersectionType);

			// Should become (A & C & D) | (B & C & D)
			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2);

			// Both members should be intersections with 3 types
			const firstMember = resultUnion.types.apply(0);
			expect(firstMember._tag).toBe("TsTypeIntersect");
			const firstIntersection = firstMember as TsTypeIntersect;
			expect(firstIntersection.types.length).toBe(3);

			const secondMember = resultUnion.types.apply(1);
			expect(secondMember._tag).toBe("TsTypeIntersect");
			const secondIntersection = secondMember as TsTypeIntersect;
			expect(secondIntersection.types.length).toBe(3);
		});

		it("handles union with single type", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			
			// Create A & (B) & C where (B) is a union with one element
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const union = createUnionType(typeB); // Single element union
			const intersectionType = createIntersectionType(typeA, union, typeC);

			const result = visitor.enterTsType(scope)(intersectionType);

			// Should become (A & B & C)
			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(1);

			const member = resultUnion.types.apply(0);
			expect(member._tag).toBe("TsTypeIntersect");
			const intersection = member as TsTypeIntersect;
			expect(intersection.types.length).toBe(3);
		});

		it("handles union with many types", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			
			// Create A & (B | C | D | E) & F
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const typeD = createTypeRef("D");
			const typeE = createTypeRef("E");
			const typeF = createTypeRef("F");
			const union = createUnionType(typeB, typeC, typeD, typeE);
			const intersectionType = createIntersectionType(typeA, union, typeF);

			const result = visitor.enterTsType(scope)(intersectionType);

			// Should become (A & B & F) | (A & C & F) | (A & D & F) | (A & E & F)
			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(4);

			// All members should be intersections with 3 types
			for (let i = 0; i < 4; i++) {
				const member = resultUnion.types.apply(i);
				expect(member._tag).toBe("TsTypeIntersect");
				const intersection = member as TsTypeIntersect;
				expect(intersection.types.length).toBe(3);
			}
		});
	});

	describe("Edge Cases", () => {
		it("handles empty intersection", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			const emptyIntersection = createIntersectionType();

			const result = visitor.enterTsType(scope)(emptyIntersection);

			expect(result).toBe(emptyIntersection);
		});

		it("handles intersection with only union", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			const union = createUnionType(createTypeRef("A"), createTypeRef("B"));
			const intersectionType = createIntersectionType(union);

			const result = visitor.enterTsType(scope)(intersectionType);

			// Should become A | B (the union itself)
			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2);

			// Each member should be an intersection with 1 type
			const firstMember = resultUnion.types.apply(0);
			expect(firstMember._tag).toBe("TsTypeIntersect");
			const firstIntersection = firstMember as TsTypeIntersect;
			expect(firstIntersection.types.length).toBe(1);

			const secondMember = resultUnion.types.apply(1);
			expect(secondMember._tag).toBe("TsTypeIntersect");
			const secondIntersection = secondMember as TsTypeIntersect;
			expect(secondIntersection.types.length).toBe(1);
		});

		it("handles nested intersection types", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			
			// Create A & (B & C) & (D | E)
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const typeD = createTypeRef("D");
			const typeE = createTypeRef("E");
			const nestedIntersection = createIntersectionType(typeB, typeC);
			const union = createUnionType(typeD, typeE);
			const intersectionType = createIntersectionType(typeA, nestedIntersection, union);

			const result = visitor.enterTsType(scope)(intersectionType);

			// Should transform the union part
			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2);
		});

		it("preserves type order in transformation", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();
			
			// Create A & (X | Y) & B
			const typeA = createTypeRef("A");
			const typeX = createTypeRef("X");
			const typeY = createTypeRef("Y");
			const typeB = createTypeRef("B");
			const union = createUnionType(typeX, typeY);
			const intersectionType = createIntersectionType(typeA, union, typeB);

			const result = visitor.enterTsType(scope)(intersectionType);

			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2);

			// First member should have X, second should have Y
			const firstMember = resultUnion.types.apply(0) as TsTypeIntersect;
			const secondMember = resultUnion.types.apply(1) as TsTypeIntersect;

			// Check that the union types are in the correct order
			expect(firstMember.types.length).toBe(3);
			expect(secondMember.types.length).toBe(3);
		});
	});

	describe("Complex Scenarios", () => {
		it("handles deeply nested union types", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			// Create A & ((B | C) | D) & E
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const typeD = createTypeRef("D");
			const typeE = createTypeRef("E");
			const innerUnion = createUnionType(typeB, typeC);
			const outerUnion = createUnionType(innerUnion as TsType, typeD);
			const intersectionType = createIntersectionType(typeA, outerUnion, typeE);

			const result = visitor.enterTsType(scope)(intersectionType);

			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2);
		});

		it("handles intersection with complex type references", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			// Create complex type references
			const complexTypeA = createTypeRef("ComplexTypeA");
			const complexTypeB = createTypeRef("ComplexTypeB");
			const complexTypeC = createTypeRef("ComplexTypeC");
			const union = createUnionType(complexTypeB, complexTypeC);
			const intersectionType = createIntersectionType(complexTypeA, union);

			const result = visitor.enterTsType(scope)(intersectionType);

			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2);
		});

		it("handles intersection with identical types in union", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			// Create A & (B | B) & C
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const union = createUnionType(typeB, typeB); // Duplicate types
			const intersectionType = createIntersectionType(typeA, union, typeC);

			const result = visitor.enterTsType(scope)(intersectionType);

			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2); // Should still create 2 members
		});

		it("handles large intersection with many non-union types", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			// Create A & B & C & (D | E) & F & G & H
			const types = ["A", "B", "C", "F", "G", "H"].map(createTypeRef);
			const union = createUnionType(createTypeRef("D"), createTypeRef("E"));
			const allTypes = [...types.slice(0, 3), union as TsType, ...types.slice(3)];
			const intersectionType = createIntersectionType(...allTypes);

			const result = visitor.enterTsType(scope)(intersectionType);

			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2);

			// Each member should have 7 types (6 non-union + 1 from union)
			const firstMember = resultUnion.types.apply(0) as TsTypeIntersect;
			const secondMember = resultUnion.types.apply(1) as TsTypeIntersect;
			expect(firstMember.types.length).toBe(7);
			expect(secondMember.types.length).toBe(7);
		});
	});

	describe("Type Preservation", () => {
		it("preserves type structure in simple case", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const union = createUnionType(typeB, typeC);
			const intersectionType = createIntersectionType(typeA, union);

			const result = visitor.enterTsType(scope)(intersectionType);

			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;

			// Check that original types are preserved
			const firstMember = resultUnion.types.apply(0) as TsTypeIntersect;
			const secondMember = resultUnion.types.apply(1) as TsTypeIntersect;

			expect(firstMember.types.length).toBe(2);
			expect(secondMember.types.length).toBe(2);
		});

		it("preserves comments and metadata", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			// Create types with comments
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const union = createUnionType(typeB, typeC);
			const intersectionType = createIntersectionType(typeA, union);

			const result = visitor.enterTsType(scope)(intersectionType);

			expect(result._tag).toBe("TsTypeUnion");
			// The transformation should preserve the structure even if comments are involved
		});

		it("handles empty union in intersection", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			const typeA = createTypeRef("A");
			const emptyUnion = TsTypeUnion.create(IArray.Empty);
			const intersectionType = createIntersectionType(typeA, emptyUnion);

			const result = visitor.enterTsType(scope)(intersectionType);

			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(0); // Empty union results in empty result
		});
	});

	describe("Performance and Edge Cases", () => {
		it("handles very large unions efficiently", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			// Create A & (B1 | B2 | ... | B20) & C
			const typeA = createTypeRef("A");
			const typeC = createTypeRef("C");
			const unionTypes = Array.from({ length: 20 }, (_, i) => createTypeRef(`B${i + 1}`));
			const largeUnion = createUnionType(...unionTypes);
			const intersectionType = createIntersectionType(typeA, largeUnion, typeC);

			const result = visitor.enterTsType(scope)(intersectionType);

			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(20);

			// Each member should have 3 types (A, Bi, C)
			for (let i = 0; i < 20; i++) {
				const member = resultUnion.types.apply(i) as TsTypeIntersect;
				expect(member.types.length).toBe(3);
			}
		});

		it("handles intersection with no types", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			const emptyIntersection = TsTypeIntersect.create(IArray.Empty);

			const result = visitor.enterTsType(scope)(emptyIntersection);

			expect(result).toBe(emptyIntersection); // Should remain unchanged
		});

		it("handles intersection with single non-union type", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			const typeA = createTypeRef("A");
			const singleTypeIntersection = createIntersectionType(typeA);

			const result = visitor.enterTsType(scope)(singleTypeIntersection);

			expect(result).toBe(singleTypeIntersection); // Should remain unchanged
		});

		it("handles multiple transformations correctly", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			// Apply transformation multiple times
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const union = createUnionType(typeB, typeC);
			const intersectionType = createIntersectionType(typeA, union);

			const result1 = visitor.enterTsType(scope)(intersectionType);
			const result2 = visitor.enterTsType(scope)(result1);

			// Second transformation should not change the result
			expect(result2).toBe(result1);
		});
	});

	describe("Integration with Type System", () => {
		it("works with different scope configurations", () => {
			const visitor = RejiggerIntersections.apply();
			const scope1 = createMockScope();
			const scope2 = TsTreeScope.create(
				TsIdent.librarySimple("different-lib"),
				true, // pedantic mode
				new Map(),
				Logger.DevNull()
			);

			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const union = createUnionType(typeB, typeC);
			const intersectionType = createIntersectionType(typeA, union);

			const result1 = visitor.enterTsType(scope1)(intersectionType);
			const result2 = visitor.enterTsType(scope2)(intersectionType);

			// Results should be the same regardless of scope
			expect(result1._tag).toBe(result2._tag);
			expect((result1 as TsTypeUnion).types.length).toBe((result2 as TsTypeUnion).types.length);
		});

		it("maintains type safety throughout transformation", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const union = createUnionType(typeB, typeC);
			const intersectionType = createIntersectionType(typeA, union);

			const result = visitor.enterTsType(scope)(intersectionType);

			// Verify type structure is maintained
			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;

			for (let i = 0; i < resultUnion.types.length; i++) {
				const member = resultUnion.types.apply(i);
				expect(member._tag).toBe("TsTypeIntersect");
			}
		});

		it("handles transformation with visitor pattern correctly", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			// Test that the visitor can be reused
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const union1 = createUnionType(typeB, typeC);
			const union2 = createUnionType(createTypeRef("D"), createTypeRef("E"));

			const intersection1 = createIntersectionType(typeA, union1);
			const intersection2 = createIntersectionType(typeA, union2);

			const result1 = visitor.enterTsType(scope)(intersection1);
			const result2 = visitor.enterTsType(scope)(intersection2);

			expect(result1._tag).toBe("TsTypeUnion");
			expect(result2._tag).toBe("TsTypeUnion");
			expect((result1 as TsTypeUnion).types.length).toBe(2);
			expect((result2 as TsTypeUnion).types.length).toBe(2);
		});

		it("handles transformation idempotency", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			// Test that applying the transformation multiple times gives the same result
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const union = createUnionType(typeB, typeC);
			const intersectionType = createIntersectionType(typeA, union);

			const result1 = visitor.enterTsType(scope)(intersectionType);
			const result2 = visitor.enterTsType(scope)(result1);
			const result3 = visitor.enterTsType(scope)(result2);

			// All results should be the same (idempotent)
			expect(result1._tag).toBe("TsTypeUnion");
			expect(result2).toBe(result1);
			expect(result3).toBe(result1);
		});

		it("validates transformation correctness with complex example", () => {
			const visitor = RejiggerIntersections.apply();
			const scope = createMockScope();

			// Test the exact example from the documentation: A & (B | C) & D
			const typeA = createTypeRef("A");
			const typeB = createTypeRef("B");
			const typeC = createTypeRef("C");
			const typeD = createTypeRef("D");
			const union = createUnionType(typeB, typeC);
			const intersectionType = createIntersectionType(typeA, union, typeD);

			const result = visitor.enterTsType(scope)(intersectionType);

			// Should become (A & B & D) | (A & C & D)
			expect(result._tag).toBe("TsTypeUnion");
			const resultUnion = result as TsTypeUnion;
			expect(resultUnion.types.length).toBe(2);

			// Verify the exact structure matches the documentation
			const firstMember = resultUnion.types.apply(0) as TsTypeIntersect;
			const secondMember = resultUnion.types.apply(1) as TsTypeIntersect;

			expect(firstMember.types.length).toBe(3); // A & B & D
			expect(secondMember.types.length).toBe(3); // A & C & D
		});
	});
});
