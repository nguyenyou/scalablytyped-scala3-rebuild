/**
 * TypeScript port of SelectionTests.scala
 *
 * Comprehensive unit tests for the Selection class and its implementations.
 * Tests all functionality including construction, logical operations, type transformations,
 * edge cases, and JSON serialization.
 */

import { describe, expect, test } from "vitest";
import {
	AllExcept,
	And,
	NoneExcept,
	Or,
	Selection,
} from "../internal/Selection.js";

describe("Selection", () => {
	describe("Basic Construction and Factory Methods", () => {
		test("All factory method creates AllExcept with empty set", () => {
			const all = Selection.All<string>();
			expect(all).toBeInstanceOf(AllExcept);
			const allExcept = all as AllExcept<string>;
			expect(allExcept.values.size).toBe(0);
		});

		test("None factory method creates NoneExcept with empty set", () => {
			const none = Selection.None<string>();
			expect(none).toBeInstanceOf(NoneExcept);
			const noneExcept = none as NoneExcept<string>;
			expect(noneExcept.values.size).toBe(0);
		});

		test("AllExcept varargs constructor", () => {
			const allExcept = Selection.AllExcept("a", "b", "c");
			expect(allExcept.values.size).toBe(3);
			expect(allExcept.values.has("a")).toBe(true);
			expect(allExcept.values.has("b")).toBe(true);
			expect(allExcept.values.has("c")).toBe(true);
		});

		test("NoneExcept varargs constructor", () => {
			const noneExcept = Selection.NoneExcept("x", "y", "z");
			expect(noneExcept.values.size).toBe(3);
			expect(noneExcept.values.has("x")).toBe(true);
			expect(noneExcept.values.has("y")).toBe(true);
			expect(noneExcept.values.has("z")).toBe(true);
		});

		test("AllExcept with Set constructor", () => {
			const set = new Set(["b", "a", "c"]);
			const allExcept = new AllExcept(set);
			expect(allExcept.values).toBe(set);
			expect(Array.from(allExcept.values).sort()).toEqual(["a", "b", "c"]);
		});

		test("NoneExcept with Set constructor", () => {
			const set = new Set(["z", "x", "y"]);
			const noneExcept = new NoneExcept(set);
			expect(noneExcept.values).toBe(set);
			expect(Array.from(noneExcept.values).sort()).toEqual(["x", "y", "z"]);
		});
	});

	describe("Apply Method - Core Selection Logic", () => {
		test("AllExcept apply method", () => {
			const allExcept = Selection.AllExcept("excluded1", "excluded2");

			// Should return false for excluded values
			expect(allExcept.apply("excluded1")).toBe(false);
			expect(allExcept.apply("excluded2")).toBe(false);

			// Should return true for non-excluded values
			expect(allExcept.apply("included1")).toBe(true);
			expect(allExcept.apply("included2")).toBe(true);
			expect(allExcept.apply("")).toBe(true);
		});

		test("NoneExcept apply method", () => {
			const noneExcept = Selection.NoneExcept("included1", "included2");

			// Should return true for included values
			expect(noneExcept.apply("included1")).toBe(true);
			expect(noneExcept.apply("included2")).toBe(true);

			// Should return false for non-included values
			expect(noneExcept.apply("excluded1")).toBe(false);
			expect(noneExcept.apply("excluded2")).toBe(false);
			expect(noneExcept.apply("")).toBe(false);
		});

		test("And apply method", () => {
			const selection1 = Selection.AllExcept("a");
			const selection2 = Selection.NoneExcept("b", "c");
			const andSelection = Selection.And(selection1, selection2);

			// Should return true only when both selections return true
			expect(andSelection.apply("b")).toBe(true); // Not in first exclusion AND in second inclusion
			expect(andSelection.apply("c")).toBe(true); // Not in first exclusion AND in second inclusion
			expect(andSelection.apply("a")).toBe(false); // In first exclusion
			expect(andSelection.apply("d")).toBe(false); // Not in second inclusion
		});

		test("Or apply method", () => {
			const selection1 = Selection.AllExcept("a");
			const selection2 = Selection.NoneExcept("a", "b");
			const orSelection = Selection.Or(selection1, selection2);

			// Should return true when either selection returns true
			expect(orSelection.apply("a")).toBe(true); // Excluded from first BUT included in second
			expect(orSelection.apply("b")).toBe(true); // Not excluded from first AND included in second
			expect(orSelection.apply("c")).toBe(true); // Not excluded from first (even though not in second)
			expect(orSelection.apply("d")).toBe(true); // Not excluded from first (selection1 returns true)
		});
	});

	describe("Logical Operators - and and or", () => {
		test("and operator creates And selection", () => {
			const sel1 = Selection.AllExcept("a");
			const sel2 = Selection.NoneExcept("b");
			const result = sel1.and(sel2);

			expect(result).toBeInstanceOf(And);
			const andSel = result as And<string>;
			expect(andSel._1).toBe(sel1);
			expect(andSel._2).toBe(sel2);
		});

		test("or operator creates Or selection", () => {
			const sel1 = Selection.AllExcept("a");
			const sel2 = Selection.NoneExcept("b");
			const result = sel1.or(sel2);

			expect(result).toBeInstanceOf(Or);
			const orSel = result as Or<string>;
			expect(orSel._1).toBe(sel1);
			expect(orSel._2).toBe(sel2);
		});

		test("chained logical operations", () => {
			const sel1 = Selection.AllExcept("a");
			const sel2 = Selection.NoneExcept("b");
			const sel3 = Selection.AllExcept("c");

			const complex = sel1.and(sel2).or(sel3);

			// Test some values
			expect(complex.apply("b")).toBe(true); // Should pass sel1 && sel2
			expect(complex.apply("d")).toBe(true); // Should pass sel3 (AllExcept "c")
			expect(complex.apply("c")).toBe(false); // Should fail sel3 and not pass sel1 && sel2
		});
	});

	describe("Map Method - Type Transformation", () => {
		test("map on AllExcept", () => {
			const allExcept = Selection.AllExcept(1, 2, 3);
			const mapped = allExcept.map((x) => x.toString());

			expect(mapped).toBeInstanceOf(AllExcept);
			const mappedAllExcept = mapped as AllExcept<string>;
			expect(mappedAllExcept.values.has("1")).toBe(true);
			expect(mappedAllExcept.values.has("2")).toBe(true);
			expect(mappedAllExcept.values.has("3")).toBe(true);
			expect(mappedAllExcept.values.size).toBe(3);
		});

		test("map on NoneExcept", () => {
			const noneExcept = Selection.NoneExcept(1, 2, 3);
			const mapped = noneExcept.map((x) => x.toString());

			expect(mapped).toBeInstanceOf(NoneExcept);
			const mappedNoneExcept = mapped as NoneExcept<string>;
			expect(mappedNoneExcept.values.has("1")).toBe(true);
			expect(mappedNoneExcept.values.has("2")).toBe(true);
			expect(mappedNoneExcept.values.has("3")).toBe(true);
			expect(mappedNoneExcept.values.size).toBe(3);
		});

		test("map on And", () => {
			const sel1 = Selection.AllExcept(1, 2);
			const sel2 = Selection.NoneExcept(3, 4);
			const andSel = Selection.And(sel1, sel2);
			const mapped = andSel.map((x) => x.toString());

			expect(mapped).toBeInstanceOf(And);

			// Verify the mapped selections work correctly
			expect(mapped.apply("1")).toBe(false); // Should be excluded by first selection
			expect(mapped.apply("2")).toBe(false); // Should be excluded by first selection
			expect(mapped.apply("3")).toBe(true); // Should pass both selections
			expect(mapped.apply("4")).toBe(true); // Should pass both selections
			expect(mapped.apply("5")).toBe(false); // Should fail second selection
		});

		test("map on Or", () => {
			const sel1 = Selection.AllExcept(1);
			const sel2 = Selection.NoneExcept(1, 2);
			const orSel = Selection.Or(sel1, sel2);
			const mapped = orSel.map((x) => x.toString());

			expect(mapped).toBeInstanceOf(Or);

			// Test the behavior
			expect(mapped.apply("1")).toBe(true); // Should pass second selection
			expect(mapped.apply("2")).toBe(true); // Should pass both selections
			expect(mapped.apply("3")).toBe(true); // Should pass first selection
		});

		test("map with complex transformation", () => {
			const selection = Selection.NoneExcept("apple", "banana");
			const mapped = selection.map((s) => s.length);

			expect(mapped.apply(5)).toBe(true); // "apple".length
			expect(mapped.apply(6)).toBe(true); // "banana".length
			expect(mapped.apply(4)).toBe(false); // Not a length of included strings
			expect(mapped.apply(7)).toBe(false); // Not a length of included strings
		});
	});

	describe("Edge Cases and Boundary Conditions", () => {
		test("empty selections", () => {
			const emptyAllExcept = new AllExcept<string>(new Set());
			const emptyNoneExcept = new NoneExcept<string>(new Set());

			// AllExcept with empty set should include everything
			expect(emptyAllExcept.apply("anything")).toBe(true);
			expect(emptyAllExcept.apply("")).toBe(true);

			// NoneExcept with empty set should exclude everything
			expect(emptyNoneExcept.apply("anything")).toBe(false);
			expect(emptyNoneExcept.apply("")).toBe(false);
		});

		test("single element selections", () => {
			const singleAllExcept = Selection.AllExcept("only");
			const singleNoneExcept = Selection.NoneExcept("only");

			expect(singleAllExcept.apply("only")).toBe(false);
			expect(singleAllExcept.apply("other")).toBe(true);

			expect(singleNoneExcept.apply("only")).toBe(true);
			expect(singleNoneExcept.apply("other")).toBe(false);
		});

		test("duplicate values in constructor", () => {
			const allExceptDupes = Selection.AllExcept("a", "b", "a", "c", "b");
			const noneExceptDupes = Selection.NoneExcept("x", "y", "x", "z", "y");

			// Set should eliminate duplicates
			expect(allExceptDupes.values.size).toBe(3);
			expect(noneExceptDupes.values.size).toBe(3);

			expect(allExceptDupes.values.has("a")).toBe(true);
			expect(allExceptDupes.values.has("b")).toBe(true);
			expect(allExceptDupes.values.has("c")).toBe(true);
		});

		test("complex nested logical operations", () => {
			const sel1 = Selection.AllExcept("a");
			const sel2 = Selection.NoneExcept("b");
			const sel3 = Selection.AllExcept("c");
			const sel4 = Selection.NoneExcept("d");

			const complex = sel1.and(sel2).or(sel3.and(sel4));

			// Test various combinations
			expect(complex.apply("b")).toBe(true); // Passes sel1 && sel2
			expect(complex.apply("d")).toBe(true); // Passes sel3 && sel4
			expect(complex.apply("a")).toBe(false); // Fails sel1, and "a" is not "d" so fails sel4
			expect(complex.apply("c")).toBe(false); // Fails sel3, and "c" is not "b" so fails sel2
		});

		test("self-referential logical operations", () => {
			const sel = Selection.AllExcept("a");
			const selfAnd = sel.and(sel);
			const selfOr = sel.or(sel);

			// Should behave the same as the original selection
			expect(selfAnd.apply("b")).toBe(sel.apply("b"));
			expect(selfAnd.apply("a")).toBe(sel.apply("a"));
			expect(selfOr.apply("b")).toBe(sel.apply("b"));
			expect(selfOr.apply("a")).toBe(sel.apply("a"));
		});
	});

	describe("Different Types Support", () => {
		test("Integer selections", () => {
			const intSelection = Selection.AllExcept(1, 2, 3);
			expect(intSelection.apply(1)).toBe(false);
			expect(intSelection.apply(2)).toBe(false);
			expect(intSelection.apply(3)).toBe(false);
			expect(intSelection.apply(4)).toBe(true);
			expect(intSelection.apply(0)).toBe(true);
		});

		test("Custom object with comparison", () => {
			interface Person {
				name: string;
				age: number;
			}

			const person1: Person = { name: "Alice", age: 30 };
			const person2: Person = { name: "Bob", age: 25 };
			const person3: Person = { name: "Charlie", age: 35 };

			const personSelection = Selection.NoneExcept(person1, person2);
			expect(personSelection.apply(person1)).toBe(true);
			expect(personSelection.apply(person2)).toBe(true);
			expect(personSelection.apply(person3)).toBe(false);
		});
	});

	describe("JSON Serialization and Deserialization", () => {
		test("AllExcept JSON round-trip", () => {
			const allExcept: Selection<string> = Selection.AllExcept("a", "b", "c");
			const json = allExcept.toJSON();
			const decoded = Selection.fromJSON<string>(json);

			expect(decoded).toBeInstanceOf(AllExcept);
			const decodedAllExcept = decoded as AllExcept<string>;
			expect(decodedAllExcept.values.size).toBe(3);
			expect(decodedAllExcept.values.has("a")).toBe(true);
			expect(decodedAllExcept.values.has("b")).toBe(true);
			expect(decodedAllExcept.values.has("c")).toBe(true);

			// Test behavior is preserved
			expect(decoded.apply("a")).toBe(allExcept.apply("a"));
			expect(decoded.apply("d")).toBe(allExcept.apply("d"));
		});

		test("NoneExcept JSON round-trip", () => {
			const noneExcept: Selection<string> = Selection.NoneExcept("x", "y", "z");
			const json = noneExcept.toJSON();
			const decoded = Selection.fromJSON<string>(json);

			expect(decoded).toBeInstanceOf(NoneExcept);
			const decodedNoneExcept = decoded as NoneExcept<string>;
			expect(decodedNoneExcept.values.size).toBe(3);
			expect(decodedNoneExcept.values.has("x")).toBe(true);
			expect(decodedNoneExcept.values.has("y")).toBe(true);
			expect(decodedNoneExcept.values.has("z")).toBe(true);

			// Test behavior is preserved
			expect(decoded.apply("x")).toBe(noneExcept.apply("x"));
			expect(decoded.apply("w")).toBe(noneExcept.apply("w"));
		});

		test("And JSON round-trip", () => {
			const sel1 = Selection.AllExcept("a");
			const sel2 = Selection.NoneExcept("b", "c");
			const andSelection: Selection<string> = Selection.And(sel1, sel2);

			const json = andSelection.toJSON();
			const decoded = Selection.fromJSON<string>(json);

			expect(decoded).toBeInstanceOf(And);

			// Test behavior is preserved
			expect(decoded.apply("a")).toBe(andSelection.apply("a"));
			expect(decoded.apply("b")).toBe(andSelection.apply("b"));
			expect(decoded.apply("c")).toBe(andSelection.apply("c"));
			expect(decoded.apply("d")).toBe(andSelection.apply("d"));
		});

		test("Or JSON round-trip", () => {
			const sel1 = Selection.AllExcept("a");
			const sel2 = Selection.NoneExcept("a", "b");
			const orSelection: Selection<string> = Selection.Or(sel1, sel2);

			const json = orSelection.toJSON();
			const decoded = Selection.fromJSON<string>(json);

			expect(decoded).toBeInstanceOf(Or);

			// Test behavior is preserved
			expect(decoded.apply("a")).toBe(orSelection.apply("a"));
			expect(decoded.apply("b")).toBe(orSelection.apply("b"));
			expect(decoded.apply("c")).toBe(orSelection.apply("c"));
		});

		test("Complex nested selection JSON round-trip", () => {
			const sel1 = Selection.AllExcept("a", "b");
			const sel2 = Selection.NoneExcept("c", "d");
			const sel3 = Selection.AllExcept("e");
			const complex: Selection<string> = sel1.and(sel2).or(sel3);

			const json = complex.toJSON();
			const decoded = Selection.fromJSON<string>(json);

			// Test behavior is preserved for various inputs
			const testValues = ["a", "b", "c", "d", "e", "f", "g"];
			testValues.forEach((value) => {
				expect(decoded.apply(value)).toBe(complex.apply(value));
			});
		});

		test("Invalid JSON format", () => {
			const invalidJson = { InvalidKey: ["a", "b"] };

			expect(() => Selection.fromJSON<string>(invalidJson)).toThrow(
				"Invalid Selection format",
			);
		});

		test("Empty selections JSON round-trip", () => {
			const emptyAll: Selection<string> = Selection.All<string>();
			const emptyNone: Selection<string> = Selection.None<string>();

			// Test All (which is AllExcept with empty set)
			const allJson = emptyAll.toJSON();
			const allDecoded = Selection.fromJSON<string>(allJson);
			expect(allDecoded.apply("anything")).toBe(emptyAll.apply("anything"));

			// Test None (which is NoneExcept with empty set)
			const noneJson = emptyNone.toJSON();
			const noneDecoded = Selection.fromJSON<string>(noneJson);
			expect(noneDecoded.apply("anything")).toBe(emptyNone.apply("anything"));
		});
	});

	describe("Error Handling and Robustness", () => {
		test("selections with empty string values", () => {
			// Test with empty string
			const selectionWithEmpty = Selection.NoneExcept("", "valid");
			expect(selectionWithEmpty.apply("")).toBe(true);
			expect(selectionWithEmpty.apply("valid")).toBe(true);
			expect(selectionWithEmpty.apply("invalid")).toBe(false);
		});

		test("very large selections", () => {
			const largeArray = Array.from({ length: 1000 }, (_, i) =>
				(i + 1).toString(),
			);
			const largeSelection = Selection.AllExcept(...largeArray);

			expect(largeSelection.values.size).toBe(1000);
			expect(largeSelection.apply("500")).toBe(false);
			expect(largeSelection.apply("1001")).toBe(true);
		});

		test("deeply nested logical operations", () => {
			let selection: Selection<string> = Selection.All<string>();

			// Create a deeply nested structure
			for (let i = 1; i <= 10; i++) {
				const newSel = Selection.NoneExcept(`item${i}`);
				selection = selection.and(newSel);
			}

			// Should only return true for values that are in all NoneExcept selections
			expect(selection.apply("item1")).toBe(false); // Not in any NoneExcept
			expect(selection.apply("item5")).toBe(false); // Not in any NoneExcept
			expect(selection.apply("other")).toBe(false); // Not in any NoneExcept
		});

		test("map function error handling", () => {
			const selection = Selection.NoneExcept("test");

			// Test mapping with a function that could throw
			const mapped = selection.map((s) => {
				if (s === "test") return s.toUpperCase();
				throw new Error("Unexpected value");
			});

			expect(mapped.apply("TEST")).toBe(true);
			expect(mapped.apply("other")).toBe(false);
		});

		test("JSON serialization with complex types", () => {
			interface ComplexType {
				id: number;
				name: string;
				nested: { value: string };
			}

			const obj1: ComplexType = {
				id: 1,
				name: "test1",
				nested: { value: "nested1" },
			};
			const obj2: ComplexType = {
				id: 2,
				name: "test2",
				nested: { value: "nested2" },
			};

			const selection = Selection.NoneExcept(obj1, obj2);
			const json = selection.toJSON();
			const decoded = Selection.fromJSON<ComplexType>(json);

			// Test that the structure is preserved
			expect(decoded).toBeInstanceOf(NoneExcept);
			expect(decoded.apply(obj1)).toBe(true);
			expect(decoded.apply(obj2)).toBe(true);
		});
	});
});
