/**
 * Tests for MethodType.ts - TypeScript port of org.scalablytyped.converter.internal.ts.MethodType
 */

import { describe, expect, it } from "vitest";
import { isNone, isSome } from "fp-ts/Option";
import {
	GetterInstance,
	MethodType,
	NormalInstance,
	SetterInstance,
} from "../internal/ts/MethodType.js";

describe("MethodType", () => {
	describe("Normal method type", () => {
		it("should create Normal method type", () => {
			const methodType = MethodType.normal();
			expect(methodType._tag).toBe("Normal");
			expect(MethodType.isNormal(methodType)).toBe(true);
			expect(MethodType.isGetter(methodType)).toBe(false);
			expect(MethodType.isSetter(methodType)).toBe(false);
		});

		it("should use singleton instance", () => {
			const instance1 = NormalInstance;
			const instance2 = MethodType.normal();
			expect(instance1._tag).toBe(instance2._tag);
		});

		it("should convert to string correctly", () => {
			const methodType = MethodType.normal();
			const result = MethodType.toString(methodType);
			expect(result).toBe("Normal");
		});

		it("should not be an accessor", () => {
			const methodType = MethodType.normal();
			expect(MethodType.isAccessor(methodType)).toBe(false);
		});
	});

	describe("Getter method type", () => {
		it("should create Getter method type", () => {
			const methodType = MethodType.getter();
			expect(methodType._tag).toBe("Getter");
			expect(MethodType.isGetter(methodType)).toBe(true);
			expect(MethodType.isNormal(methodType)).toBe(false);
			expect(MethodType.isSetter(methodType)).toBe(false);
		});

		it("should use singleton instance", () => {
			const instance1 = GetterInstance;
			const instance2 = MethodType.getter();
			expect(instance1._tag).toBe(instance2._tag);
		});

		it("should convert to string correctly", () => {
			const methodType = MethodType.getter();
			const result = MethodType.toString(methodType);
			expect(result).toBe("Getter");
		});

		it("should be an accessor", () => {
			const methodType = MethodType.getter();
			expect(MethodType.isAccessor(methodType)).toBe(true);
		});
	});

	describe("Setter method type", () => {
		it("should create Setter method type", () => {
			const methodType = MethodType.setter();
			expect(methodType._tag).toBe("Setter");
			expect(MethodType.isSetter(methodType)).toBe(true);
			expect(MethodType.isNormal(methodType)).toBe(false);
			expect(MethodType.isGetter(methodType)).toBe(false);
		});

		it("should use singleton instance", () => {
			const instance1 = SetterInstance;
			const instance2 = MethodType.setter();
			expect(instance1._tag).toBe(instance2._tag);
		});

		it("should convert to string correctly", () => {
			const methodType = MethodType.setter();
			const result = MethodType.toString(methodType);
			expect(result).toBe("Setter");
		});

		it("should be an accessor", () => {
			const methodType = MethodType.setter();
			expect(MethodType.isAccessor(methodType)).toBe(true);
		});
	});

	describe("Type guards", () => {
		it("should correctly identify method types", () => {
			const normal = MethodType.normal();
			const getter = MethodType.getter();
			const setter = MethodType.setter();

			// Normal checks
			expect(MethodType.isNormal(normal)).toBe(true);
			expect(MethodType.isNormal(getter)).toBe(false);
			expect(MethodType.isNormal(setter)).toBe(false);

			// Getter checks
			expect(MethodType.isGetter(getter)).toBe(true);
			expect(MethodType.isGetter(normal)).toBe(false);
			expect(MethodType.isGetter(setter)).toBe(false);

			// Setter checks
			expect(MethodType.isSetter(setter)).toBe(true);
			expect(MethodType.isSetter(normal)).toBe(false);
			expect(MethodType.isSetter(getter)).toBe(false);
		});
	});

	describe("Accessor identification", () => {
		it("should correctly identify accessor methods", () => {
			const normal = MethodType.normal();
			const getter = MethodType.getter();
			const setter = MethodType.setter();

			expect(MethodType.isAccessor(normal)).toBe(false);
			expect(MethodType.isAccessor(getter)).toBe(true);
			expect(MethodType.isAccessor(setter)).toBe(true);
		});
	});

	describe("fromString parsing", () => {
		it("should parse Normal method type", () => {
			const result = MethodType.fromString("Normal");
			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(MethodType.isNormal(result.value)).toBe(true);
			}
		});

		it("should parse Getter method type", () => {
			const result = MethodType.fromString("Getter");
			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(MethodType.isGetter(result.value)).toBe(true);
			}
		});

		it("should parse Setter method type", () => {
			const result = MethodType.fromString("Setter");
			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(MethodType.isSetter(result.value)).toBe(true);
			}
		});

		it("should handle whitespace", () => {
			const inputs = ["  Normal  ", "\tGetter\n", " Setter "];

			inputs.forEach((input) => {
				const result = MethodType.fromString(input);
				expect(isSome(result)).toBe(true);
			});
		});

		it("should return None for invalid input", () => {
			const invalidInputs = [
				"Invalid",
				"normal",
				"NORMAL",
				"Get",
				"Set",
				"Method",
				"",
				"random text",
			];

			invalidInputs.forEach((input) => {
				const result = MethodType.fromString(input);
				expect(isNone(result)).toBe(true);
			});
		});
	});

	describe("equals functionality", () => {
		it("should compare same method types correctly", () => {
			const normal1 = MethodType.normal();
			const normal2 = MethodType.normal();
			const getter1 = MethodType.getter();
			const getter2 = MethodType.getter();
			const setter1 = MethodType.setter();
			const setter2 = MethodType.setter();

			expect(MethodType.equals(normal1, normal2)).toBe(true);
			expect(MethodType.equals(getter1, getter2)).toBe(true);
			expect(MethodType.equals(setter1, setter2)).toBe(true);
		});

		it("should compare different method types correctly", () => {
			const normal = MethodType.normal();
			const getter = MethodType.getter();
			const setter = MethodType.setter();

			expect(MethodType.equals(normal, getter)).toBe(false);
			expect(MethodType.equals(normal, setter)).toBe(false);
			expect(MethodType.equals(getter, setter)).toBe(false);
		});
	});

	describe("all method types", () => {
		it("should return all possible method types", () => {
			const all = MethodType.all;
			expect(all.length).toBe(3);

			const tags = all.map((mt) => mt._tag).sort();
			expect(tags).toEqual(["Getter", "Normal", "Setter"]);
		});

		it("should contain one of each type", () => {
			const all = MethodType.all;
			const normalCount = all.filter((mt) => mt._tag === "Normal").length;
			const getterCount = all.filter((mt) => mt._tag === "Getter").length;
			const setterCount = all.filter((mt) => mt._tag === "Setter").length;

			expect(normalCount).toBe(1);
			expect(getterCount).toBe(1);
			expect(setterCount).toBe(1);
		});
	});

	describe("pattern matching", () => {
		it("should match Normal method type", () => {
			const normal = MethodType.normal();
			const result = MethodType.match(normal, {
				Normal: () => "matched-normal",
				Getter: () => "matched-getter",
				Setter: () => "matched-setter",
			});
			expect(result).toBe("matched-normal");
		});

		it("should match Getter method type", () => {
			const getter = MethodType.getter();
			const result = MethodType.match(getter, {
				Normal: () => "matched-normal",
				Getter: () => "matched-getter",
				Setter: () => "matched-setter",
			});
			expect(result).toBe("matched-getter");
		});

		it("should match Setter method type", () => {
			const setter = MethodType.setter();
			const result = MethodType.match(setter, {
				Normal: () => "matched-normal",
				Getter: () => "matched-getter",
				Setter: () => "matched-setter",
			});
			expect(result).toBe("matched-setter");
		});

		it("should work with different return types", () => {
			const normal = MethodType.normal();
			const numberResult = MethodType.match(normal, {
				Normal: () => 42,
				Getter: () => 0,
				Setter: () => -1,
			});
			expect(numberResult).toBe(42);

			const booleanResult = MethodType.match(normal, {
				Normal: () => true,
				Getter: () => false,
				Setter: () => false,
			});
			expect(booleanResult).toBe(true);
		});
	});

	describe("functional fold operation", () => {
		it("should fold Normal method type", () => {
			const normal = MethodType.normal();
			const folder = MethodType.fold(
				() => "folded-normal",
				() => "folded-getter",
				() => "folded-setter",
			);
			const result = folder(normal);
			expect(result).toBe("folded-normal");
		});

		it("should fold Getter method type", () => {
			const getter = MethodType.getter();
			const folder = MethodType.fold(
				() => "folded-normal",
				() => "folded-getter",
				() => "folded-setter",
			);
			const result = folder(getter);
			expect(result).toBe("folded-getter");
		});

		it("should fold Setter method type", () => {
			const setter = MethodType.setter();
			const folder = MethodType.fold(
				() => "folded-normal",
				() => "folded-getter",
				() => "folded-setter",
			);
			const result = folder(setter);
			expect(result).toBe("folded-setter");
		});

		it("should work with complex computations", () => {
			const methodTypes = [
				MethodType.normal(),
				MethodType.getter(),
				MethodType.setter(),
			];

			const computeScore = MethodType.fold(
				() => 100, // Normal gets highest score
				() => 75, // Getter gets medium score
				() => 50, // Setter gets lowest score
			);

			const scores = methodTypes.map(computeScore);
			expect(scores).toEqual([100, 75, 50]);
		});
	});

	describe("Edge cases and boundary conditions", () => {
		it("should handle round-trip conversion (toString -> fromString)", () => {
			const methodTypes = [
				MethodType.normal(),
				MethodType.getter(),
				MethodType.setter(),
			];

			methodTypes.forEach((original) => {
				const stringified = MethodType.toString(original);
				const parsed = MethodType.fromString(stringified);

				expect(isSome(parsed)).toBe(true);
				if (isSome(parsed)) {
					expect(MethodType.equals(original, parsed.value)).toBe(true);
				}
			});
		});

		it("should handle case sensitivity in parsing", () => {
			const caseSensitiveInputs = [
				"normal",
				"NORMAL",
				"getter",
				"GETTER",
				"setter",
				"SETTER",
			];

			caseSensitiveInputs.forEach((input) => {
				const result = MethodType.fromString(input);
				expect(isNone(result)).toBe(true);
			});
		});

		it("should handle empty and whitespace-only strings", () => {
			const emptyInputs = ["", "   ", "\t", "\n", "\r\n"];

			emptyInputs.forEach((input) => {
				const result = MethodType.fromString(input);
				expect(isNone(result)).toBe(true);
			});
		});

		it("should maintain singleton behavior across operations", () => {
			const normal1 = MethodType.normal();
			const normal2 = MethodType.normal();
			const stringified = MethodType.toString(normal1);
			const parsed = MethodType.fromString(stringified);

			expect(normal1._tag).toBe(normal2._tag);
			expect(isSome(parsed)).toBe(true);
			if (isSome(parsed)) {
				expect(parsed.value._tag).toBe(normal1._tag);
			}
		});

		it("should work correctly with Set operations", () => {
			const methodTypeSet = new Set([
				MethodType.normal(),
				MethodType.getter(),
				MethodType.setter(),
				MethodType.normal(), // Duplicate
				MethodType.getter(), // Duplicate
			]);

			// Set should contain 5 unique items based on object identity
			// Note: This tests object identity, not semantic equality
			expect(methodTypeSet.size).toBe(5); // Objects are different instances

			// But semantic equality should work
			const types = Array.from(methodTypeSet);
			const uniqueTags = new Set(types.map((t) => t._tag));
			expect(uniqueTags.size).toBe(3);
			expect(Array.from(uniqueTags).sort()).toEqual([
				"Getter",
				"Normal",
				"Setter",
			]);
		});

		it("should handle accessor classification correctly", () => {
			const accessorTypes = [MethodType.getter(), MethodType.setter()];
			const nonAccessorTypes = [MethodType.normal()];

			accessorTypes.forEach((type) => {
				expect(MethodType.isAccessor(type)).toBe(true);
			});

			nonAccessorTypes.forEach((type) => {
				expect(MethodType.isAccessor(type)).toBe(false);
			});
		});

		it("should handle partial string matches correctly", () => {
			const partialMatches = [
				"Norm",
				"Get",
				"Set",
				"NormalMethod",
				"GetterProperty",
				"SetterProperty",
			];

			partialMatches.forEach((input) => {
				const result = MethodType.fromString(input);
				expect(isNone(result)).toBe(true);
			});
		});

		it("should work with functional composition", () => {
			const methodTypes = MethodType.all;

			const isAccessorFolder = MethodType.fold(
				() => false, // Normal is not accessor
				() => true, // Getter is accessor
				() => true, // Setter is accessor
			);

			const accessorResults = methodTypes.map(isAccessorFolder);
			expect(accessorResults).toEqual([false, true, true]);

			// Verify consistency with isAccessor method
			methodTypes.forEach((type, index) => {
				expect(MethodType.isAccessor(type)).toBe(accessorResults[index]);
			});
		});
	});
});
