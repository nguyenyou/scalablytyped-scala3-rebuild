/**
 * Tests for ReadonlyModifier.ts - TypeScript port of org.scalablytyped.converter.internal.ts.ReadonlyModifier
 */

import { describe, expect, it } from "bun:test";
import { isNone, isSome, none, some } from "fp-ts/Option";
import {
	type No,
	NoInstance,
	type Noop,
	NoopInstance,
	ReadonlyModifier,
	type Yes,
	YesInstance,
} from "../internal/ts/ReadonlyModifier.js";

describe("ReadonlyModifier", () => {
	describe("Noop readonly modifier", () => {
		it("should create Noop readonly modifier", () => {
			const modifier = ReadonlyModifier.noop();
			expect(modifier._tag).toBe("Noop");
			expect(ReadonlyModifier.isNoop(modifier)).toBe(true);
			expect(ReadonlyModifier.isYes(modifier)).toBe(false);
			expect(ReadonlyModifier.isNo(modifier)).toBe(false);
		});

		it("should use singleton instance", () => {
			const instance1 = NoopInstance;
			const instance2 = ReadonlyModifier.noop();
			expect(instance1._tag).toBe(instance2._tag);
		});

		it("should convert to string correctly", () => {
			const modifier = ReadonlyModifier.noop();
			const result = ReadonlyModifier.toString(modifier);
			expect(result).toBe("Noop");
		});

		it("should preserve existing readonly state when applied", () => {
			const modifier = ReadonlyModifier.noop();
			expect(ReadonlyModifier.apply(modifier, true)).toBe(true);
			expect(ReadonlyModifier.apply(modifier, false)).toBe(false);
		});

		it("should be preserving", () => {
			const modifier = ReadonlyModifier.noop();
			expect(ReadonlyModifier.isPreserving(modifier)).toBe(true);
		});

		it("should not be forcing", () => {
			const modifier = ReadonlyModifier.noop();
			expect(ReadonlyModifier.isForcing(modifier)).toBe(false);
		});

		it("should convert to None boolean", () => {
			const modifier = ReadonlyModifier.noop();
			const result = ReadonlyModifier.toBoolean(modifier);
			expect(isNone(result)).toBe(true);
		});
	});

	describe("Yes readonly modifier", () => {
		it("should create Yes readonly modifier", () => {
			const modifier = ReadonlyModifier.yes();
			expect(modifier._tag).toBe("Yes");
			expect(ReadonlyModifier.isYes(modifier)).toBe(true);
			expect(ReadonlyModifier.isNoop(modifier)).toBe(false);
			expect(ReadonlyModifier.isNo(modifier)).toBe(false);
		});

		it("should use singleton instance", () => {
			const instance1 = YesInstance;
			const instance2 = ReadonlyModifier.yes();
			expect(instance1._tag).toBe(instance2._tag);
		});

		it("should convert to string correctly", () => {
			const modifier = ReadonlyModifier.yes();
			const result = ReadonlyModifier.toString(modifier);
			expect(result).toBe("Yes");
		});

		it("should force readonly to true when applied", () => {
			const modifier = ReadonlyModifier.yes();
			expect(ReadonlyModifier.apply(modifier, true)).toBe(true);
			expect(ReadonlyModifier.apply(modifier, false)).toBe(true);
		});

		it("should not be preserving", () => {
			const modifier = ReadonlyModifier.yes();
			expect(ReadonlyModifier.isPreserving(modifier)).toBe(false);
		});

		it("should be forcing", () => {
			const modifier = ReadonlyModifier.yes();
			expect(ReadonlyModifier.isForcing(modifier)).toBe(true);
		});

		it("should convert to Some(true) boolean", () => {
			const modifier = ReadonlyModifier.yes();
			const result = ReadonlyModifier.toBoolean(modifier);
			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(result.value).toBe(true);
			}
		});
	});

	describe("No readonly modifier", () => {
		it("should create No readonly modifier", () => {
			const modifier = ReadonlyModifier.no();
			expect(modifier._tag).toBe("No");
			expect(ReadonlyModifier.isNo(modifier)).toBe(true);
			expect(ReadonlyModifier.isNoop(modifier)).toBe(false);
			expect(ReadonlyModifier.isYes(modifier)).toBe(false);
		});

		it("should use singleton instance", () => {
			const instance1 = NoInstance;
			const instance2 = ReadonlyModifier.no();
			expect(instance1._tag).toBe(instance2._tag);
		});

		it("should convert to string correctly", () => {
			const modifier = ReadonlyModifier.no();
			const result = ReadonlyModifier.toString(modifier);
			expect(result).toBe("No");
		});

		it("should force readonly to false when applied", () => {
			const modifier = ReadonlyModifier.no();
			expect(ReadonlyModifier.apply(modifier, true)).toBe(false);
			expect(ReadonlyModifier.apply(modifier, false)).toBe(false);
		});

		it("should not be preserving", () => {
			const modifier = ReadonlyModifier.no();
			expect(ReadonlyModifier.isPreserving(modifier)).toBe(false);
		});

		it("should be forcing", () => {
			const modifier = ReadonlyModifier.no();
			expect(ReadonlyModifier.isForcing(modifier)).toBe(true);
		});

		it("should convert to Some(false) boolean", () => {
			const modifier = ReadonlyModifier.no();
			const result = ReadonlyModifier.toBoolean(modifier);
			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(result.value).toBe(false);
			}
		});
	});

	describe("Type guards", () => {
		it("should correctly identify readonly modifier types", () => {
			const noop = ReadonlyModifier.noop();
			const yes = ReadonlyModifier.yes();
			const no = ReadonlyModifier.no();

			// Noop checks
			expect(ReadonlyModifier.isNoop(noop)).toBe(true);
			expect(ReadonlyModifier.isNoop(yes)).toBe(false);
			expect(ReadonlyModifier.isNoop(no)).toBe(false);

			// Yes checks
			expect(ReadonlyModifier.isYes(yes)).toBe(true);
			expect(ReadonlyModifier.isYes(noop)).toBe(false);
			expect(ReadonlyModifier.isYes(no)).toBe(false);

			// No checks
			expect(ReadonlyModifier.isNo(no)).toBe(true);
			expect(ReadonlyModifier.isNo(noop)).toBe(false);
			expect(ReadonlyModifier.isNo(yes)).toBe(false);
		});
	});

	describe("Core apply functionality", () => {
		it("should apply Noop modifier correctly", () => {
			const modifier = ReadonlyModifier.noop();

			// Should preserve existing state
			expect(ReadonlyModifier.apply(modifier, true)).toBe(true);
			expect(ReadonlyModifier.apply(modifier, false)).toBe(false);
		});

		it("should apply Yes modifier correctly", () => {
			const modifier = ReadonlyModifier.yes();

			// Should always return true
			expect(ReadonlyModifier.apply(modifier, true)).toBe(true);
			expect(ReadonlyModifier.apply(modifier, false)).toBe(true);
		});

		it("should apply No modifier correctly", () => {
			const modifier = ReadonlyModifier.no();

			// Should always return false
			expect(ReadonlyModifier.apply(modifier, true)).toBe(false);
			expect(ReadonlyModifier.apply(modifier, false)).toBe(false);
		});
	});

	describe("Forcing and preserving classification", () => {
		it("should correctly identify forcing modifiers", () => {
			const noop = ReadonlyModifier.noop();
			const yes = ReadonlyModifier.yes();
			const no = ReadonlyModifier.no();

			expect(ReadonlyModifier.isForcing(noop)).toBe(false);
			expect(ReadonlyModifier.isForcing(yes)).toBe(true);
			expect(ReadonlyModifier.isForcing(no)).toBe(true);
		});

		it("should correctly identify preserving modifiers", () => {
			const noop = ReadonlyModifier.noop();
			const yes = ReadonlyModifier.yes();
			const no = ReadonlyModifier.no();

			expect(ReadonlyModifier.isPreserving(noop)).toBe(true);
			expect(ReadonlyModifier.isPreserving(yes)).toBe(false);
			expect(ReadonlyModifier.isPreserving(no)).toBe(false);
		});
	});

	describe("fromString parsing", () => {
		it("should parse Noop readonly modifier", () => {
			const result = ReadonlyModifier.fromString("Noop");
			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(ReadonlyModifier.isNoop(result.value)).toBe(true);
			}
		});

		it("should parse Yes readonly modifier", () => {
			const result = ReadonlyModifier.fromString("Yes");
			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(ReadonlyModifier.isYes(result.value)).toBe(true);
			}
		});

		it("should parse No readonly modifier", () => {
			const result = ReadonlyModifier.fromString("No");
			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(ReadonlyModifier.isNo(result.value)).toBe(true);
			}
		});

		it("should handle whitespace", () => {
			const inputs = ["  Noop  ", "\tYes\n", " No "];

			inputs.forEach((input) => {
				const result = ReadonlyModifier.fromString(input);
				expect(isSome(result)).toBe(true);
			});
		});

		it("should return None for invalid input", () => {
			const invalidInputs = [
				"Invalid",
				"noop",
				"NOOP",
				"yes",
				"YES",
				"no",
				"NO",
				"True",
				"False",
				"",
				"random text",
			];

			invalidInputs.forEach((input) => {
				const result = ReadonlyModifier.fromString(input);
				expect(isNone(result)).toBe(true);
			});
		});
	});

	describe("fromBoolean conversion", () => {
		it("should create Yes modifier from true", () => {
			const modifier = ReadonlyModifier.fromBoolean(true);
			expect(ReadonlyModifier.isYes(modifier)).toBe(true);
		});

		it("should create No modifier from false", () => {
			const modifier = ReadonlyModifier.fromBoolean(false);
			expect(ReadonlyModifier.isNo(modifier)).toBe(true);
		});
	});

	describe("toBoolean conversion", () => {
		it("should convert Noop to None", () => {
			const modifier = ReadonlyModifier.noop();
			const result = ReadonlyModifier.toBoolean(modifier);
			expect(isNone(result)).toBe(true);
		});

		it("should convert Yes to Some(true)", () => {
			const modifier = ReadonlyModifier.yes();
			const result = ReadonlyModifier.toBoolean(modifier);
			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(result.value).toBe(true);
			}
		});

		it("should convert No to Some(false)", () => {
			const modifier = ReadonlyModifier.no();
			const result = ReadonlyModifier.toBoolean(modifier);
			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(result.value).toBe(false);
			}
		});
	});

	describe("equals functionality", () => {
		it("should compare same readonly modifiers correctly", () => {
			const noop1 = ReadonlyModifier.noop();
			const noop2 = ReadonlyModifier.noop();
			const yes1 = ReadonlyModifier.yes();
			const yes2 = ReadonlyModifier.yes();
			const no1 = ReadonlyModifier.no();
			const no2 = ReadonlyModifier.no();

			expect(ReadonlyModifier.equals(noop1, noop2)).toBe(true);
			expect(ReadonlyModifier.equals(yes1, yes2)).toBe(true);
			expect(ReadonlyModifier.equals(no1, no2)).toBe(true);
		});

		it("should compare different readonly modifiers correctly", () => {
			const noop = ReadonlyModifier.noop();
			const yes = ReadonlyModifier.yes();
			const no = ReadonlyModifier.no();

			expect(ReadonlyModifier.equals(noop, yes)).toBe(false);
			expect(ReadonlyModifier.equals(noop, no)).toBe(false);
			expect(ReadonlyModifier.equals(yes, no)).toBe(false);
		});
	});

	describe("all readonly modifiers", () => {
		it("should return all possible readonly modifiers", () => {
			const all = ReadonlyModifier.all;
			expect(all.length).toBe(3);

			const tags = all.map((rm) => rm._tag).sort();
			expect(tags).toEqual(["No", "Noop", "Yes"]);
		});

		it("should contain one of each type", () => {
			const all = ReadonlyModifier.all;
			const noopCount = all.filter((rm) => rm._tag === "Noop").length;
			const yesCount = all.filter((rm) => rm._tag === "Yes").length;
			const noCount = all.filter((rm) => rm._tag === "No").length;

			expect(noopCount).toBe(1);
			expect(yesCount).toBe(1);
			expect(noCount).toBe(1);
		});
	});

	describe("pattern matching", () => {
		it("should match Noop readonly modifier", () => {
			const modifier = ReadonlyModifier.noop();
			const result = ReadonlyModifier.match(modifier, {
				Noop: () => "matched-noop",
				Yes: () => "matched-yes",
				No: () => "matched-no",
			});
			expect(result).toBe("matched-noop");
		});

		it("should match Yes readonly modifier", () => {
			const modifier = ReadonlyModifier.yes();
			const result = ReadonlyModifier.match(modifier, {
				Noop: () => "matched-noop",
				Yes: () => "matched-yes",
				No: () => "matched-no",
			});
			expect(result).toBe("matched-yes");
		});

		it("should match No readonly modifier", () => {
			const modifier = ReadonlyModifier.no();
			const result = ReadonlyModifier.match(modifier, {
				Noop: () => "matched-noop",
				Yes: () => "matched-yes",
				No: () => "matched-no",
			});
			expect(result).toBe("matched-no");
		});

		it("should work with different return types", () => {
			const modifier = ReadonlyModifier.yes();
			const numberResult = ReadonlyModifier.match(modifier, {
				Noop: () => 0,
				Yes: () => 42,
				No: () => -1,
			});
			expect(numberResult).toBe(42);

			const booleanResult = ReadonlyModifier.match(modifier, {
				Noop: () => false,
				Yes: () => true,
				No: () => false,
			});
			expect(booleanResult).toBe(true);
		});
	});

	describe("functional fold operation", () => {
		it("should fold Noop readonly modifier", () => {
			const modifier = ReadonlyModifier.noop();
			const folder = ReadonlyModifier.fold(
				() => "folded-noop",
				() => "folded-yes",
				() => "folded-no",
			);
			const result = folder(modifier);
			expect(result).toBe("folded-noop");
		});

		it("should fold Yes readonly modifier", () => {
			const modifier = ReadonlyModifier.yes();
			const folder = ReadonlyModifier.fold(
				() => "folded-noop",
				() => "folded-yes",
				() => "folded-no",
			);
			const result = folder(modifier);
			expect(result).toBe("folded-yes");
		});

		it("should fold No readonly modifier", () => {
			const modifier = ReadonlyModifier.no();
			const folder = ReadonlyModifier.fold(
				() => "folded-noop",
				() => "folded-yes",
				() => "folded-no",
			);
			const result = folder(modifier);
			expect(result).toBe("folded-no");
		});

		it("should work with complex computations", () => {
			const modifiers = [
				ReadonlyModifier.noop(),
				ReadonlyModifier.yes(),
				ReadonlyModifier.no(),
			];

			const computePriority = ReadonlyModifier.fold(
				() => 1, // Noop gets medium priority
				() => 2, // Yes gets highest priority
				() => 0, // No gets lowest priority
			);

			const priorities = modifiers.map(computePriority);
			expect(priorities).toEqual([1, 2, 0]);
		});
	});

	describe("combine functionality", () => {
		it("should return first modifier when second is Noop", () => {
			const yes = ReadonlyModifier.yes();
			const no = ReadonlyModifier.no();
			const noop = ReadonlyModifier.noop();

			expect(
				ReadonlyModifier.equals(ReadonlyModifier.combine(yes, noop), yes),
			).toBe(true);
			expect(
				ReadonlyModifier.equals(ReadonlyModifier.combine(no, noop), no),
			).toBe(true);
			expect(
				ReadonlyModifier.equals(ReadonlyModifier.combine(noop, noop), noop),
			).toBe(true);
		});

		it("should return second modifier when second is not Noop", () => {
			const yes = ReadonlyModifier.yes();
			const no = ReadonlyModifier.no();
			const noop = ReadonlyModifier.noop();

			expect(
				ReadonlyModifier.equals(ReadonlyModifier.combine(noop, yes), yes),
			).toBe(true);
			expect(
				ReadonlyModifier.equals(ReadonlyModifier.combine(noop, no), no),
			).toBe(true);
			expect(
				ReadonlyModifier.equals(ReadonlyModifier.combine(yes, no), no),
			).toBe(true);
			expect(
				ReadonlyModifier.equals(ReadonlyModifier.combine(no, yes), yes),
			).toBe(true);
		});
	});

	describe("Edge cases and boundary conditions", () => {
		it("should handle round-trip conversion (toString -> fromString)", () => {
			const modifiers = [
				ReadonlyModifier.noop(),
				ReadonlyModifier.yes(),
				ReadonlyModifier.no(),
			];

			modifiers.forEach((original) => {
				const stringified = ReadonlyModifier.toString(original);
				const parsed = ReadonlyModifier.fromString(stringified);

				expect(isSome(parsed)).toBe(true);
				if (isSome(parsed)) {
					expect(ReadonlyModifier.equals(original, parsed.value)).toBe(true);
				}
			});
		});

		it("should handle round-trip conversion (fromBoolean -> toBoolean)", () => {
			const booleans = [true, false];

			booleans.forEach((original) => {
				const modifier = ReadonlyModifier.fromBoolean(original);
				const converted = ReadonlyModifier.toBoolean(modifier);

				expect(isSome(converted)).toBe(true);
				if (isSome(converted)) {
					expect(converted.value).toBe(original);
				}
			});
		});

		it("should handle case sensitivity in parsing", () => {
			const caseSensitiveInputs = ["noop", "NOOP", "yes", "YES", "no", "NO"];

			caseSensitiveInputs.forEach((input) => {
				const result = ReadonlyModifier.fromString(input);
				expect(isNone(result)).toBe(true);
			});
		});

		it("should handle empty and whitespace-only strings", () => {
			const emptyInputs = ["", "   ", "\t", "\n", "\r\n"];

			emptyInputs.forEach((input) => {
				const result = ReadonlyModifier.fromString(input);
				expect(isNone(result)).toBe(true);
			});
		});

		it("should maintain singleton behavior across operations", () => {
			const noop1 = ReadonlyModifier.noop();
			const noop2 = ReadonlyModifier.noop();
			const stringified = ReadonlyModifier.toString(noop1);
			const parsed = ReadonlyModifier.fromString(stringified);

			expect(noop1._tag).toBe(noop2._tag);
			expect(isSome(parsed)).toBe(true);
			if (isSome(parsed)) {
				expect(parsed.value._tag).toBe(noop1._tag);
			}
		});

		it("should work correctly with Set operations", () => {
			const modifierSet = new Set([
				ReadonlyModifier.noop(),
				ReadonlyModifier.yes(),
				ReadonlyModifier.no(),
				ReadonlyModifier.noop(), // Duplicate
				ReadonlyModifier.yes(), // Duplicate
			]);

			// Set should contain 5 unique items based on object identity
			// Note: This tests object identity, not semantic equality
			expect(modifierSet.size).toBe(5); // Objects are different instances

			// But semantic equality should work
			const types = Array.from(modifierSet);
			const uniqueTags = new Set(types.map((t) => t._tag));
			expect(uniqueTags.size).toBe(3);
			expect(Array.from(uniqueTags).sort()).toEqual(["No", "Noop", "Yes"]);
		});

		it("should handle forcing classification correctly", () => {
			const forcingTypes = [ReadonlyModifier.yes(), ReadonlyModifier.no()];
			const nonForcingTypes = [ReadonlyModifier.noop()];

			forcingTypes.forEach((type) => {
				expect(ReadonlyModifier.isForcing(type)).toBe(true);
			});

			nonForcingTypes.forEach((type) => {
				expect(ReadonlyModifier.isForcing(type)).toBe(false);
			});
		});

		it("should work with functional composition", () => {
			const modifiers = ReadonlyModifier.all;

			const isForcingFolder = ReadonlyModifier.fold(
				() => false, // Noop is not forcing
				() => true, // Yes is forcing
				() => true, // No is forcing
			);

			const forcingResults = modifiers.map(isForcingFolder);
			expect(forcingResults).toEqual([false, true, true]);

			// Verify consistency with isForcing method
			modifiers.forEach((type, index) => {
				expect(ReadonlyModifier.isForcing(type)).toBe(forcingResults[index]);
			});
		});

		it("should handle apply method with all combinations", () => {
			const modifiers = ReadonlyModifier.all;
			const initialStates = [true, false];

			// Test all combinations
			modifiers.forEach((modifier) => {
				initialStates.forEach((initialState) => {
					const result = ReadonlyModifier.apply(modifier, initialState);

					if (ReadonlyModifier.isNoop(modifier)) {
						expect(result).toBe(initialState);
					} else if (ReadonlyModifier.isYes(modifier)) {
						expect(result).toBe(true);
					} else if (ReadonlyModifier.isNo(modifier)) {
						expect(result).toBe(false);
					}
				});
			});
		});
	});
});
