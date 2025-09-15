import { describe, expect, test } from "bun:test";
import { java, javaScript } from "@/internal/EscapeStrings";

describe("EscapeStrings Tests", () => {
	describe("java() method", () => {
		test("empty string should remain empty", () => {
			const result = java("");
			expect(result).toBe("");
		});

		test("simple string should remain unchanged", () => {
			const result = java("hello world");
			expect(result).toBe("hello world");
		});

		test("double quotes should be escaped", () => {
			const result = java('say "hello"');
			expect(result).toBe('say \\"hello\\"');
		});

		test("backslashes should be escaped", () => {
			const result = java("path\\to\\file");
			expect(result).toBe("path\\\\to\\\\file");
		});

		test("newlines should be escaped", () => {
			const result = java("line1\nline2");
			expect(result).toBe("line1\\nline2");
		});

		test("tabs should be escaped", () => {
			const result = java("text\tmore");
			expect(result).toBe("text\\tmore");
		});

		test("carriage returns should be escaped", () => {
			const result = java("text\rmore");
			expect(result).toBe("text\\rmore");
		});

		test("form feeds should be escaped", () => {
			const result = java("text\fmore");
			expect(result).toBe("text\\fmore");
		});

		test("backspace should be escaped", () => {
			const result = java("text\bmore");
			expect(result).toBe("text\\bmore");
		});

		test("single quotes should NOT be escaped in java mode", () => {
			const result = java("don't");
			expect(result).toBe("don't");
		});

		test("forward slashes should NOT be escaped in java mode", () => {
			const result = java("path/to/file");
			expect(result).toBe("path/to/file");
		});

		test("unicode characters should be escaped", () => {
			const result = java("café");
			expect(result).toContain("\\u");
		});

		test("control characters should be escaped", () => {
			const result = java("\u0001\u0002");
			expect(result).toBe("\\u0001\\u0002");
		});
	});

	describe("javaScript() method", () => {
		test("empty string should remain empty", () => {
			const result = javaScript("");
			expect(result).toBe("");
		});

		test("simple string should remain unchanged", () => {
			const result = javaScript("hello world");
			expect(result).toBe("hello world");
		});

		test("double quotes should be escaped", () => {
			const result = javaScript('say "hello"');
			expect(result).toBe('say \\"hello\\"');
		});

		test("single quotes should be escaped in javascript mode", () => {
			const result = javaScript("don't");
			expect(result).toBe("don\\'t");
		});

		test("forward slashes should be escaped in javascript mode", () => {
			const result = javaScript("path/to/file");
			expect(result).toBe("path\\/to\\/file");
		});

		test("backslashes should be escaped", () => {
			const result = javaScript("path\\to\\file");
			expect(result).toBe("path\\\\to\\\\file");
		});

		test("newlines should be escaped", () => {
			const result = javaScript("line1\nline2");
			expect(result).toBe("line1\\nline2");
		});

		test("mixed quotes and slashes", () => {
			const result = javaScript(`say "don't" in path/to/file`);
			expect(result).toBe(`say \\"don\\'t\\" in path\\/to\\/file`);
		});
	});

	describe("Edge cases", () => {
		test("null character should be escaped", () => {
			const result = java("\u0000");
			expect(result).toBe("\\u0000");
		});

		test("high unicode characters should be escaped", () => {
			const result = java("🚀");
			expect(result).toContain("\\u");
		});

		test("mixed control and printable characters", () => {
			const result = java("hello\nworld\ttab");
			expect(result).toBe("hello\\nworld\\ttab");
		});
	});
});
