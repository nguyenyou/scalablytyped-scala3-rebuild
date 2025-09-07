import { describe, expect, test } from "vitest";
import {
	encodeURIComponent,
	escapeNestedComments,
	escapeUnicodeEscapes,
	formatComment,
	joinCamelCase,
	Quote,
	QuoteStr,
	quote,
	toCamelCase,
} from "@/internal/StringUtils";

describe("StringUtils Tests", () => {
	describe("Quote and QuoteStr Constants", () => {
		test("Quote constant should be double quote character", () => {
			expect(Quote).toBe('"');
		});

		test("QuoteStr should be string representation of Quote", () => {
			expect(QuoteStr).toBe('"');
			expect(QuoteStr).toBe(Quote.toString());
		});
	});

	describe("quote method", () => {
		test("quote empty string", () => {
			const result = quote("");
			expect(result).toBe('""');
		});

		test("quote simple string", () => {
			const result = quote("hello");
			expect(result).toBe('"hello"');
		});

		test("quote string with special characters", () => {
			const result = quote("hello\nworld");
			expect(result).toBe('"hello\\nworld"');
		});

		test("quote string with quotes", () => {
			const result = quote('say "hello"');
			expect(result).toBe('"say \\"hello\\""');
		});

		test("quote string with backslashes", () => {
			const result = quote("path\\to\\file");
			expect(result).toBe('"path\\\\to\\\\file"');
		});

		test("quote string with unicode characters", () => {
			const result = quote("café");
			expect(result.startsWith('"')).toBe(true);
			expect(result.endsWith('"')).toBe(true);
		});
	});

	describe("escapeNestedComments method", () => {
		test("string without comments should remain unchanged", () => {
			const input = "regular string without comments";
			const result = escapeNestedComments(input);
			expect(result).toBe(input);
		});

		test("string with only start comment should remain unchanged", () => {
			const input = "/* start comment only";
			const result = escapeNestedComments(input);
			expect(result).toBe(input);
		});

		test("string with only end comment should remain unchanged", () => {
			const input = "end comment only */";
			const result = escapeNestedComments(input);
			expect(result).toBe(input);
		});

		test("string with balanced comments should escape nested ones", () => {
			const input = "/* outer /* inner */ comment */";
			const result = escapeNestedComments(input);
			expect(result).toBe("/* outer / * inner * / comment */");
		});

		test("string with multiple nested comments", () => {
			const input = "/* start /* nested1 */ /* nested2 */ end */";
			const result = escapeNestedComments(input);
			expect(result).toContain("/ *");
			expect(result).toContain("* /");
			expect(result.startsWith("/*")).toBe(true);
			expect(result.endsWith("*/")).toBe(true);
		});

		test("empty string should remain unchanged", () => {
			const result = escapeNestedComments("");
			expect(result).toBe("");
		});
	});

	describe("formatComment method", () => {
		test("empty string should remain empty", () => {
			const result = formatComment("");
			expect(result).toBe("");
		});

		test("string without newlines should remain unchanged", () => {
			const input = "simple comment text";
			const result = formatComment(input);
			expect(result).toBe(input);
		});

		test("single newline should be preserved", () => {
			const input = "line1\nline2";
			const result = formatComment(input);
			expect(result).toBe("line1\nline2");
		});

		test("consecutive newlines should be collapsed to single newline", () => {
			const input = "line1\n\n\nline2";
			const result = formatComment(input);
			expect(result).toBe("line1\nline2");
		});

		test("spaces after newline should be replaced with exactly two spaces", () => {
			const input = "line1\n    line2";
			const result = formatComment(input);
			expect(result).toBe("line1\n  line2");
		});

		test("multiple spaces after newline should be normalized", () => {
			const input = "line1\n        line2";
			const result = formatComment(input);
			expect(result).toBe("line1\n  line2");
		});

		test("comment ending with */ should get space appended", () => {
			const input = "comment text*/";
			const result = formatComment(input);
			expect(result).toBe("comment text*/ ");
		});

		test("comment not ending with */ should remain unchanged", () => {
			const input = "comment text";
			const result = formatComment(input);
			expect(result).toBe("comment text");
		});
	});

	describe("escapeUnicodeEscapes method", () => {
		test("string without unicode escapes should remain unchanged", () => {
			const input = "regular string";
			const result = escapeUnicodeEscapes(input);
			expect(result).toBe(input);
		});

		test("string with unicode escape should be double-escaped", () => {
			const input = "text with \\u1234 unicode";
			const result = escapeUnicodeEscapes(input);
			expect(result).toBe("text with \\\\u1234 unicode");
		});

		test("multiple unicode escapes should all be escaped", () => {
			const input = "\\u0041\\u0042\\u0043";
			const result = escapeUnicodeEscapes(input);
			expect(result).toBe("\\\\u0041\\\\u0042\\\\u0043");
		});

		test("empty string should remain empty", () => {
			const result = escapeUnicodeEscapes("");
			expect(result).toBe("");
		});
	});

	describe("joinCamelCase method", () => {
		test("empty list should return empty string", () => {
			const result = joinCamelCase([]);
			expect(result).toBe("");
		});

		test("single string should be uncapitalized", () => {
			const result = joinCamelCase(["Hello"]);
			expect(result).toBe("hello");
		});

		test("multiple strings should be joined in camelCase", () => {
			const result = joinCamelCase(["hello", "world", "test"]);
			expect(result).toBe("helloWorldTest");
		});

		test("first string with all caps should be lowercased", () => {
			const result = joinCamelCase(["DOM", "element"]);
			expect(result).toBe("domElement");
		});

		test("first string already lowercase should remain unchanged", () => {
			const result = joinCamelCase(["hello", "World"]);
			expect(result).toBe("helloWorld");
		});
	});

	describe("toCamelCase method", () => {
		test("string without separators should remain unchanged", () => {
			const result = toCamelCase("hello");
			expect(result).toBe("hello");
		});

		test("underscore separated string should become camelCase", () => {
			const result = toCamelCase("hello_world_test");
			expect(result).toBe("helloWorldTest");
		});

		test("dash separated string should become camelCase", () => {
			const result = toCamelCase("hello-world-test");
			expect(result).toBe("helloWorldTest");
		});

		test("mixed separators should be handled", () => {
			const result = toCamelCase("hello_world-test");
			expect(result).toBe("helloWorldTest");
		});

		test("empty string should return empty string", () => {
			const result = toCamelCase("");
			expect(result).toBe("");
		});
	});

	describe("encodeURIComponent method", () => {
		test("empty string should return empty string", () => {
			const result = encodeURIComponent("");
			expect(result).toBe("");
		});

		test("simple alphanumeric string should remain unchanged", () => {
			const result = encodeURIComponent("hello123");
			expect(result).toBe("hello123");
		});

		test("spaces should be encoded as %20", () => {
			const result = encodeURIComponent("hello world");
			expect(result).toBe("hello%20world");
		});

		test("special characters should be properly encoded", () => {
			const result = encodeURIComponent("hello!world");
			expect(result).toBe("hello!world"); // ! should not be encoded
		});

		test("parentheses should not be encoded", () => {
			const result = encodeURIComponent("func(param)");
			expect(result).toBe("func(param)");
		});
	});

	describe("Edge Cases and Boundary Conditions", () => {
		test("quote method with null-like characters", () => {
			const result = quote("\u0000\u0001");
			expect(result.startsWith('"')).toBe(true);
			expect(result.endsWith('"')).toBe(true);
		});

		test("formatComment with only newlines", () => {
			const result = formatComment("\n\n\n");
			expect(result).toBe("\n");
		});

		test("formatComment with tabs after newline", () => {
			const result = formatComment("text\n\tmore");
			// The method preserves tabs as-is, only normalizes spaces
			expect(result).toBe("text\n\tmore");
		});

		test("escapeNestedComments with overlapping patterns", () => {
			const input = "/* comment /* nested */ more */";
			const result = escapeNestedComments(input);
			expect(result).toContain("/ *");
			expect(result).toContain("* /");
		});

		test("joinCamelCase with special edge cases", () => {
			// Test with strings that have mixed patterns
			const result1 = joinCamelCase(["HTML", "element", "API"]);
			// The method capitalizes subsequent strings as-is, so "API" becomes "API"
			expect(result1).toBe("htmlElementAPI");

			const result2 = joinCamelCase(["a", "B", "c"]);
			expect(result2).toBe("aBC");
		});

		test("toCamelCase with consecutive separators", () => {
			const result = toCamelCase("hello__world--test");
			expect(result).toBe("helloWorldTest");
		});

		test("encodeURIComponent with edge characters", () => {
			const result1 = encodeURIComponent("@#$%^&*");
			expect(result1).toContain("%");

			const result2 = encodeURIComponent("hello@world.com");
			expect(result2).toContain("%");
		});

		test("private unCapitalize method behavior through joinCamelCase", () => {
			// Test the private unCapitalize method indirectly
			const result1 = joinCamelCase(["A"]);
			expect(result1).toBe("a");

			const result2 = joinCamelCase([""]);
			expect(result2).toBe("");

			const result3 = joinCamelCase(["already"]);
			expect(result3).toBe("already");
		});
	});
});
