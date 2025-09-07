/**
 * TypeScript port of org.scalablytyped.converter.internal.logging.FormatterTests
 *
 * Comprehensive test suite for the Formatter functionality, ensuring behavioral
 * equivalence with the Scala implementation.
 */

import { describe, expect, test } from "vitest";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import {
	arrayFormatter,
	eitherFormatter,
	errorFormatter,
	fileFormatter,
	iterableFormatter,
	mapFormatter,
	nullFormatter,
	numberFormatter,
	optionFormatter,
	recordFormatter,
	stringFormatter,
	tuple2Formatter,
	tuple3Formatter,
	tuple4Formatter,
	undefinedFormatter,
	unitFormatter,
	uriFormatter,
} from "../internal/logging/Formatter.js";

describe("Formatter Tests", () => {
	describe("Basic Formatters", () => {
		test("String formatter should return input as-is", () => {
			const input = "test string";
			const result = stringFormatter.apply(input);
			expect(result).toBe(input);
		});

		test("Number formatter should convert to string", () => {
			const input = 42;
			const result = numberFormatter.apply(input);
			expect(result).toBe("42");
		});

		test("Number formatter should handle long numbers", () => {
			const input = 123456789;
			const result = numberFormatter.apply(input);
			expect(result).toBe("123456789");
		});

		test("Unit formatter should return empty string", () => {
			const input = undefined as undefined;
			const result = unitFormatter.apply(input);
			expect(result).toBe("");
		});

		test("Undefined formatter should return empty string", () => {
			const input = undefined;
			const result = undefinedFormatter.apply(input);
			expect(result).toBe("");
		});

		test("Null formatter should return empty string", () => {
			const input = null;
			const result = nullFormatter.apply(input);
			expect(result).toBe("");
		});

		test("File formatter should return file name", () => {
			const file = { name: "test.txt" };
			const result = fileFormatter.apply(file);
			expect(result).toBe("test.txt");
		});

		test("URI formatter should return string representation", () => {
			const uri = new URL("https://example.com/path");
			const result = uriFormatter.apply(uri);
			expect(result).toBe("https://example.com/path");
		});
	});

	describe("Tuple Formatters", () => {
		test("Tuple2 formatter should join with comma", () => {
			const formatter = tuple2Formatter(stringFormatter, stringFormatter);
			const input: [string, string] = ["first", "second"];
			const result = formatter.apply(input);
			expect(result).toBe("first, second");
		});

		test("Tuple3 formatter should join with commas", () => {
			const formatter = tuple3Formatter(
				stringFormatter,
				stringFormatter,
				stringFormatter,
			);
			const input: [string, string, string] = ["first", "second", "third"];
			const result = formatter.apply(input);
			expect(result).toBe("first, second, third");
		});

		test("Tuple4 formatter should join with commas", () => {
			const formatter = tuple4Formatter(
				stringFormatter,
				stringFormatter,
				stringFormatter,
				stringFormatter,
			);
			const input: [string, string, string, string] = [
				"first",
				"second",
				"third",
				"fourth",
			];
			const result = formatter.apply(input);
			expect(result).toBe("first, second, third, fourth");
		});

		test("Nested tuples should format correctly", () => {
			const innerFormatter = tuple2Formatter(stringFormatter, stringFormatter);
			const outerFormatter = tuple2Formatter(innerFormatter, innerFormatter);
			const input: [[string, string], [string, string]] = [
				["a", "b"],
				["c", "d"],
			];
			const result = outerFormatter.apply(input);
			expect(result).toBe("a, b, c, d");
		});

		test("Mixed type tuples should format correctly", () => {
			const formatter = tuple3Formatter(
				stringFormatter,
				numberFormatter,
				unitFormatter,
			);
			const input: [string, number, undefined] = [
				"text",
				42,
				undefined as undefined,
			];
			const result = formatter.apply(input);
			expect(result).toBe("text, 42, ");
		});
	});

	describe("Either Formatter", () => {
		test("Left value should be formatted", () => {
			const formatter = eitherFormatter(stringFormatter, numberFormatter);
			const input: E.Either<string, number> = E.left("error message");
			const result = formatter.apply(input);
			expect(result).toBe("error message");
		});

		test("Right value should be formatted", () => {
			const formatter = eitherFormatter(stringFormatter, numberFormatter);
			const input: E.Either<string, number> = E.right(42);
			const result = formatter.apply(input);
			expect(result).toBe("42");
		});

		test("Nested Either should format correctly", () => {
			const innerFormatter = eitherFormatter(stringFormatter, numberFormatter);
			const outerFormatter = eitherFormatter(innerFormatter, stringFormatter);
			const input: E.Either<E.Either<string, number>, string> = E.left(
				E.right(123),
			);
			const result = outerFormatter.apply(input);
			expect(result).toBe("123");
		});
	});

	describe("Option Formatter", () => {
		test("Some value should be formatted", () => {
			const formatter = optionFormatter(stringFormatter);
			const input: O.Option<string> = O.some("test value");
			const result = formatter.apply(input);
			expect(result).toBe("test value");
		});

		test("None value should return empty string", () => {
			const formatter = optionFormatter(stringFormatter);
			const input: O.Option<string> = O.none;
			const result = formatter.apply(input);
			expect(result).toBe("");
		});
	});

	describe("Iterable Formatter", () => {
		test("Empty iterable should return empty string", () => {
			const formatter = iterableFormatter(stringFormatter);
			const input: string[] = [];
			const result = formatter.apply(input);
			expect(result).toBe("");
		});

		test("Single element iterable should format with brackets", () => {
			const formatter = iterableFormatter(stringFormatter);
			const input = ["single"];
			const result = formatter.apply(input);
			expect(result).toBe("[single]");
		});

		test("Multiple element iterable should format with brackets and commas", () => {
			const formatter = iterableFormatter(stringFormatter);
			const input = ["first", "second", "third"];
			const result = formatter.apply(input);
			expect(result).toBe("[first, second, third]");
		});

		test("Set should format correctly", () => {
			const formatter = iterableFormatter(stringFormatter);
			const input = new Set(["a", "b"]);
			const result = formatter.apply(input);
			// Note: Set order is not guaranteed, but we can check structure
			expect(result.startsWith("[")).toBe(true);
			expect(result.endsWith("]")).toBe(true);
			expect(result.includes("a")).toBe(true);
			expect(result.includes("b")).toBe(true);
			expect(result.includes(", ")).toBe(true);
		});

		test("Nested iterables should format correctly", () => {
			const innerFormatter = iterableFormatter(stringFormatter);
			const outerFormatter = iterableFormatter(innerFormatter);
			const input = [
				["a", "b"],
				["c", "d"],
			];
			const result = outerFormatter.apply(input);
			expect(result).toBe("[[a, b], [c, d]]");
		});
	});

	describe("Array Formatter", () => {
		test("Empty array should return empty string", () => {
			const formatter = arrayFormatter(stringFormatter);
			const input: string[] = [];
			const result = formatter.apply(input);
			expect(result).toBe("");
		});

		test("Single element array should format with brackets", () => {
			const formatter = arrayFormatter(stringFormatter);
			const input = ["single"];
			const result = formatter.apply(input);
			expect(result).toBe("[single]");
		});

		test("Multiple element array should format with brackets and commas", () => {
			const formatter = arrayFormatter(stringFormatter);
			const input = ["first", "second", "third"];
			const result = formatter.apply(input);
			expect(result).toBe("[first, second, third]");
		});

		test("Array of numbers should format correctly", () => {
			const formatter = arrayFormatter(numberFormatter);
			const input = [1, 2, 3, 4, 5];
			const result = formatter.apply(input);
			expect(result).toBe("[1, 2, 3, 4, 5]");
		});

		test("Nested arrays should format correctly", () => {
			const innerFormatter = arrayFormatter(stringFormatter);
			const outerFormatter = arrayFormatter(innerFormatter);
			const input = [
				["a", "b"],
				["c", "d"],
			];
			const result = outerFormatter.apply(input);
			expect(result).toBe("[[a, b], [c, d]]");
		});
	});

	describe("Map Formatter", () => {
		test("Empty map should return empty string", () => {
			const formatter = mapFormatter(stringFormatter, stringFormatter);
			const input = new Map<string, string>();
			const result = formatter.apply(input);
			expect(result).toBe("");
		});

		test("Single entry map should format with brackets and arrow", () => {
			const formatter = mapFormatter(stringFormatter, stringFormatter);
			const input = new Map([["key", "value"]]);
			const result = formatter.apply(input);
			expect(result).toBe("[key => value]");
		});

		test("Multiple entry map should format correctly", () => {
			const formatter = mapFormatter(stringFormatter, stringFormatter);
			const input = new Map([
				["key1", "value1"],
				["key2", "value2"],
			]);
			const result = formatter.apply(input);
			expect(result.startsWith("[")).toBe(true);
			expect(result.endsWith("]")).toBe(true);
			expect(result.includes("key1 => value1")).toBe(true);
			expect(result.includes("key2 => value2")).toBe(true);
			expect(result.includes(", ")).toBe(true);
		});

		test("Map with different types should format correctly", () => {
			const formatter = mapFormatter(stringFormatter, numberFormatter);
			const input = new Map([
				["count", 42],
				["index", 0],
			]);
			const result = formatter.apply(input);
			expect(result.includes(" => ")).toBe(true);
			expect(result.includes("42")).toBe(true);
			expect(result.includes("0")).toBe(true);
		});

		test("Nested maps should format correctly", () => {
			const innerFormatter = mapFormatter(stringFormatter, stringFormatter);
			const outerFormatter = mapFormatter(stringFormatter, innerFormatter);
			const innerMap = new Map([["inner", "value"]]);
			const input = new Map([["outer", innerMap]]);
			const result = outerFormatter.apply(input);
			expect(result).toBe("[outer => [inner => value]]");
		});
	});

	describe("Record Formatter", () => {
		test("Empty record should return empty string", () => {
			const formatter = recordFormatter(stringFormatter);
			const input = {};
			const result = formatter.apply(input);
			expect(result).toBe("");
		});

		test("Single entry record should format with brackets and arrow", () => {
			const formatter = recordFormatter(stringFormatter);
			const input = { key: "value" };
			const result = formatter.apply(input);
			expect(result).toBe("[key => value]");
		});

		test("Multiple entry record should format correctly", () => {
			const formatter = recordFormatter(stringFormatter);
			const input = { key1: "value1", key2: "value2" };
			const result = formatter.apply(input);
			expect(result.startsWith("[")).toBe(true);
			expect(result.endsWith("]")).toBe(true);
			expect(result.includes("key1 => value1")).toBe(true);
			expect(result.includes("key2 => value2")).toBe(true);
			expect(result.includes(", ")).toBe(true);
		});
	});

	describe("Error Formatter", () => {
		test("Error with message should format class name and message", () => {
			const error = new Error("Test error message");
			const result = errorFormatter.apply(error);
			expect(result).toBe("Error: Test error message");
		});

		test("Error without message should format only class name", () => {
			const error = new Error("");
			const result = errorFormatter.apply(error);
			expect(result).toBe("Error");
		});

		test("Custom error should format correctly", () => {
			class CustomError extends Error {
				constructor(message: string) {
					super(message);
					this.name = "CustomError";
				}
			}
			const error = new CustomError("Custom error");
			const result = errorFormatter.apply(error);
			expect(result.includes("CustomError")).toBe(true);
			expect(result.includes("Custom error")).toBe(true);
		});

		test("Error with null message should format only class name", () => {
			const error = new Error();
			const result = errorFormatter.apply(error);
			expect(result).toBe("Error");
		});

		test("TypeError should format correctly", () => {
			const error = new TypeError("Type error message");
			const result = errorFormatter.apply(error);
			expect(result).toBe("TypeError: Type error message");
		});
	});

	describe("Edge Cases and Complex Scenarios", () => {
		test("Empty string should format correctly", () => {
			const input = "";
			const result = stringFormatter.apply(input);
			expect(result).toBe("");
		});

		test("String with special characters should format correctly", () => {
			const input = "test\nwith\ttabs and\rcarriage returns";
			const result = stringFormatter.apply(input);
			expect(result).toBe(input);
		});

		test("Very long string should format correctly", () => {
			const input = "a".repeat(1000);
			const result = stringFormatter.apply(input);
			expect(result).toBe(input);
		});

		test("Complex nested structure should format correctly", () => {
			// Test with simpler types that have clear formatters
			const listInput = ["a", "b"];
			const tupleInput: [string, string] = ["x", "y"];
			const eitherInput: E.Either<string, number> = E.right(42);

			const listResult = arrayFormatter(stringFormatter).apply(listInput);
			const tupleResult = tuple2Formatter(
				stringFormatter,
				stringFormatter,
			).apply(tupleInput);
			const eitherResult = eitherFormatter(
				stringFormatter,
				numberFormatter,
			).apply(eitherInput);

			expect(listResult).toBe("[a, b]");
			expect(tupleResult).toBe("x, y");
			expect(eitherResult).toBe("42");
		});

		test("File with complex path should format correctly", () => {
			const file = { name: "file.extension" };
			const result = fileFormatter.apply(file);
			expect(result).toBe("file.extension");
		});

		test("URI with query parameters should format correctly", () => {
			const uri = new URL(
				"https://example.com/path?param1=value1&param2=value2",
			);
			const result = uriFormatter.apply(uri);
			expect(result).toBe(
				"https://example.com/path?param1=value1&param2=value2",
			);
		});

		test("Large array should format correctly", () => {
			const formatter = arrayFormatter(numberFormatter);
			const input = Array.from({ length: 100 }, (_, i) => i);
			const result = formatter.apply(input);
			expect(result.startsWith("[")).toBe(true);
			expect(result.endsWith("]")).toBe(true);
			expect(result.includes("0")).toBe(true);
			expect(result.includes("99")).toBe(true);
		});

		test("Deeply nested structure should format correctly", () => {
			const innerArray = ["deep", "nested"];
			const middleArray = [innerArray, ["more", "nesting"]];
			const outerArray = [middleArray];

			const innerFormatter = arrayFormatter(stringFormatter);
			const middleFormatter = arrayFormatter(innerFormatter);
			const outerFormatter = arrayFormatter(middleFormatter);

			const result = outerFormatter.apply(outerArray);
			expect(result).toBe("[[[deep, nested], [more, nesting]]]");
		});

		test("Mixed collection types should format correctly", () => {
			// Test array containing different formatted elements
			const mixedData = ["string", 42, ["nested", "array"]];

			// Since we can't have mixed types in a single formatter, test separately
			const stringResult = stringFormatter.apply(mixedData[0] as string);
			const numberResult = numberFormatter.apply(mixedData[1] as number);
			const arrayResult = arrayFormatter(stringFormatter).apply(
				mixedData[2] as string[],
			);

			expect(stringResult).toBe("string");
			expect(numberResult).toBe("42");
			expect(arrayResult).toBe("[nested, array]");
		});
	});
});
