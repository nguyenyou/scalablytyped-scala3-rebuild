/**
 * TypeScript port of org.scalablytyped.converter.internal.stringUtils
 *
 * Provides string utility functions for the ScalablyTyped converter.
 */

import { java as escapeJava } from "./EscapeStrings.js";

/**
 * Double quote character constant
 */
export const Quote = '"';

/**
 * String representation of the Quote character
 */
export const QuoteStr = Quote.toString();

/**
 * Wraps a string in double quotes and escapes it for Java string literals
 * @param s The string to quote and escape
 * @returns The quoted and escaped string
 */
export function quote(s: string): string {
	return `${Quote}${escapeJava(s)}${Quote}`;
}

/**
 * Escapes nested comments in a string
 * Scala apparently cares about nested comments, especially when they're not balanced
 * @param s The string to escape nested comments in
 * @returns The string with nested comments escaped
 */
export function escapeNestedComments(s: string): string {
	const startIndex = s.indexOf("/*");
	const endIndex = s.lastIndexOf("*/");

	// If no start comment or no end comment, return as-is
	if (startIndex === -1 || endIndex === -1) {
		return s;
	}

	const startComment = s.substring(0, startIndex + 2);
	const closeComment = s.substring(endIndex);
	const escaped = s
		.substring(Math.min(endIndex, startIndex + 2), endIndex)
		.replace(/\/\*/g, "/ *")
		.replace(/\*\//g, "* /");

	return startComment + escaped + closeComment;
}

/**
 * Formats a comment string by collapsing consecutive newlines and normalizing spaces
 * @param s The comment string to format
 * @returns The formatted comment string
 */
export function formatComment(s: string): string {
	const result: string[] = [];
	let idx = 0;

	while (idx < s.length) {
		const ch = s.charCodeAt(idx);

		if (ch === 0x0a) {
			// '\n'
			// Don't output consecutive newlines
			if (result.length === 0 || result[result.length - 1] !== "\n") {
				result.push("\n");
			}

			// Replace spaces (if any) after newline with exactly two spaces
			let hasStrippedSpace = false;
			idx += 1;
			while (idx < s.length && s.charCodeAt(idx) === 0x20) {
				// ' '
				hasStrippedSpace = true;
				idx += 1;
			}
			if (hasStrippedSpace) {
				result.push("  ");
			}
		} else {
			result.push(String.fromCharCode(ch));
			idx += 1;
		}
	}

	// If the comment doesn't end with a newline, add a singular space
	const resultStr = result.join("");
	if (resultStr.endsWith("*/")) {
		return resultStr + " ";
	}

	return resultStr;
}

/**
 * Escapes unicode escape sequences by double-escaping them
 * Apparently scala cares and typescript doesn't
 * @param s The string to escape unicode escapes in
 * @returns The string with unicode escapes double-escaped
 */
export function escapeUnicodeEscapes(s: string): string {
	return s.replace(/\\u/g, "\\\\u");
}

/**
 * Uncapitalizes the first character of a string
 * @param str The string to uncapitalize
 * @returns The string with the first character lowercased
 */
function unCapitalize(str: string): string {
	if (str.length === 0) {
		return "";
	}
	if (str.charAt(0).toLowerCase() === str.charAt(0)) {
		return str;
	}

	const chars = Array.from(str);
	chars[0] = chars[0].toLowerCase();
	return chars.join("");
}

/**
 * Joins an array of strings in camelCase format
 * @param strings The array of strings to join
 * @returns The camelCase joined string
 */
export function joinCamelCase(strings: string[]): string {
	return strings
		.filter((s) => s.length > 0)
		.map((x, index) => {
			if (
				index === 0 &&
				x.length > 2 &&
				x.charAt(0).toUpperCase() === x.charAt(0) &&
				x.charAt(1).toUpperCase() === x.charAt(1)
			) {
				// avoid things like dOM...
				return x.toLowerCase();
			} else if (index === 0) {
				return unCapitalize(x);
			} else {
				return x.charAt(0).toUpperCase() + x.slice(1);
			}
		})
		.join("");
}

/**
 * Converts a string with underscores or dashes to camelCase
 * @param str The string to convert to camelCase
 * @returns The camelCase string
 */
export function toCamelCase(str: string): string {
	return joinCamelCase(str.split(/[_-]/));
}

/**
 * Encodes a URI component with specific character exceptions
 * Based on https://stackoverflow.com/a/611117
 * @param s The string to encode
 * @returns The encoded string
 */
export function encodeURIComponent(s: string): string {
	return globalThis
		.encodeURIComponent(s)
		.replace(/\+/g, "%20")
		.replace(/%21/g, "!")
		.replace(/%27/g, "'")
		.replace(/%28/g, "(")
		.replace(/%29/g, ")")
		.replace(/%7E/g, "~");
}
