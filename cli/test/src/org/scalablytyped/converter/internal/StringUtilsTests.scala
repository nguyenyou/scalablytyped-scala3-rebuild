package org.scalablytyped.converter.internal

import utest.*

object StringUtilsTests extends TestSuite {
  def tests = Tests {
    test("Quote and QuoteStr Constants") {
      test("Quote constant should be double quote character") {
        assert(stringUtils.Quote == '"')
      }

      test("QuoteStr should be string representation of Quote") {
        assert(stringUtils.QuoteStr == "\"")
        assert(stringUtils.QuoteStr == stringUtils.Quote.toString)
      }
    }

    test("quote method") {
      test("quote empty string") {
        val result = stringUtils.quote("")
        assert(result == "\"\"")
      }

      test("quote simple string") {
        val result = stringUtils.quote("hello")
        assert(result == "\"hello\"")
      }

      test("quote string with special characters") {
        val result = stringUtils.quote("hello\nworld")
        assert(result == "\"hello\\nworld\"")
      }

      test("quote string with quotes") {
        val result = stringUtils.quote("say \"hello\"")
        assert(result == "\"say \\\"hello\\\"\"")
      }

      test("quote string with backslashes") {
        val result = stringUtils.quote("path\\to\\file")
        assert(result == "\"path\\\\to\\\\file\"")
      }

      test("quote string with unicode characters") {
        val result = stringUtils.quote("café")
        assert(result.startsWith("\""))
        assert(result.endsWith("\""))
      }
    }

    test("escapeNestedComments method") {
      test("string without comments should remain unchanged") {
        val input = "regular string without comments"
        val result = stringUtils.escapeNestedComments(input)
        assert(result == input)
      }

      test("string with only start comment should remain unchanged") {
        val input = "/* start comment only"
        val result = stringUtils.escapeNestedComments(input)
        assert(result == input)
      }

      test("string with only end comment should remain unchanged") {
        val input = "end comment only */"
        val result = stringUtils.escapeNestedComments(input)
        assert(result == input)
      }

      test("string with balanced comments should escape nested ones") {
        val input = "/* outer /* inner */ comment */"
        val result = stringUtils.escapeNestedComments(input)
        assert(result == "/* outer / * inner * / comment */")
      }

      test("string with multiple nested comments") {
        val input = "/* start /* nested1 */ /* nested2 */ end */"
        val result = stringUtils.escapeNestedComments(input)
        assert(result.contains("/ *"))
        assert(result.contains("* /"))
        assert(result.startsWith("/*"))
        assert(result.endsWith("*/"))
      }

      test("empty string should remain unchanged") {
        val result = stringUtils.escapeNestedComments("")
        assert(result == "")
      }

      test("string with comment markers in wrong order") {
        val input = "*/ some text /*"
        val result = stringUtils.escapeNestedComments(input)
        // The method finds first /* and last */, so it processes the content between them
        assert(result == "*/ some text /**/ some text /*")
      }
    }

    test("formatComment method") {
      test("empty string should remain empty") {
        val result = stringUtils.formatComment("")
        assert(result == "")
      }

      test("string without newlines should remain unchanged") {
        val input = "simple comment text"
        val result = stringUtils.formatComment(input)
        assert(result == input)
      }

      test("single newline should be preserved") {
        val input = "line1\nline2"
        val result = stringUtils.formatComment(input)
        assert(result == "line1\nline2")
      }

      test("consecutive newlines should be collapsed to single newline") {
        val input = "line1\n\n\nline2"
        val result = stringUtils.formatComment(input)
        assert(result == "line1\nline2")
      }

      test("spaces after newline should be replaced with exactly two spaces") {
        val input = "line1\n    line2"
        val result = stringUtils.formatComment(input)
        assert(result == "line1\n  line2")
      }

      test("multiple spaces after newline should be normalized") {
        val input = "line1\n        line2"
        val result = stringUtils.formatComment(input)
        assert(result == "line1\n  line2")
      }

      test("comment ending with */ should get space appended") {
        val input = "comment text*/"
        val result = stringUtils.formatComment(input)
        assert(result == "comment text*/ ")
      }

      test("comment not ending with */ should remain unchanged") {
        val input = "comment text"
        val result = stringUtils.formatComment(input)
        assert(result == "comment text")
      }

      test("complex comment formatting") {
        val input = "line1\n\n  line2\n    line3*/"
        val result = stringUtils.formatComment(input)
        assert(result == "line1\n  line2\n  line3*/ ")
      }
    }

    test("escapeUnicodeEscapes method") {
      test("string without unicode escapes should remain unchanged") {
        val input = "regular string"
        val result = stringUtils.escapeUnicodeEscapes(input)
        assert(result == input)
      }

      test("string with unicode escape should be double-escaped") {
        val input = "text with \\u1234 unicode"
        val result = stringUtils.escapeUnicodeEscapes(input)
        assert(result == "text with \\\\u1234 unicode")
      }

      test("multiple unicode escapes should all be escaped") {
        val input = "\\u0041\\u0042\\u0043"
        val result = stringUtils.escapeUnicodeEscapes(input)
        assert(result == "\\\\u0041\\\\u0042\\\\u0043")
      }

      test("empty string should remain empty") {
        val result = stringUtils.escapeUnicodeEscapes("")
        assert(result == "")
      }

      test("string with only \\u should be escaped") {
        val input = "\\u"
        val result = stringUtils.escapeUnicodeEscapes(input)
        assert(result == "\\\\u")
      }
    }

    test("joinCamelCase method") {
      test("empty list should return empty string") {
        val result = stringUtils.joinCamelCase(List.empty)
        assert(result == "")
      }

      test("single string should be uncapitalized") {
        val result = stringUtils.joinCamelCase(List("Hello"))
        assert(result == "hello")
      }

      test("multiple strings should be joined in camelCase") {
        val result = stringUtils.joinCamelCase(List("hello", "world", "test"))
        assert(result == "helloWorldTest")
      }

      test("first string with all caps should be lowercased") {
        val result = stringUtils.joinCamelCase(List("DOM", "element"))
        assert(result == "domElement")
      }

      test("first string already lowercase should remain unchanged") {
        val result = stringUtils.joinCamelCase(List("hello", "World"))
        assert(result == "helloWorld")
      }

      test("empty strings should be filtered out") {
        val result = stringUtils.joinCamelCase(List("hello", "", "world"))
        assert(result == "helloWorld")
      }

      test("single character strings") {
        val result = stringUtils.joinCamelCase(List("a", "b", "c"))
        assert(result == "aBC")
      }

      test("mixed case handling") {
        val result = stringUtils.joinCamelCase(List("XMLHttpRequest", "handler"))
        assert(result == "xmlhttprequestHandler")
      }
    }

    test("toCamelCase method") {
      test("string without separators should remain unchanged") {
        val result = stringUtils.toCamelCase("hello")
        assert(result == "hello")
      }

      test("underscore separated string should become camelCase") {
        val result = stringUtils.toCamelCase("hello_world_test")
        assert(result == "helloWorldTest")
      }

      test("dash separated string should become camelCase") {
        val result = stringUtils.toCamelCase("hello-world-test")
        assert(result == "helloWorldTest")
      }

      test("mixed separators should be handled") {
        val result = stringUtils.toCamelCase("hello_world-test")
        assert(result == "helloWorldTest")
      }

      test("empty string should return empty string") {
        val result = stringUtils.toCamelCase("")
        assert(result == "")
      }

      test("string with only separators") {
        val result = stringUtils.toCamelCase("_-_-")
        assert(result == "")
      }

      test("leading and trailing separators") {
        val result = stringUtils.toCamelCase("_hello_world_")
        assert(result == "helloWorld")
      }
    }

    test("encodeURIComponent method") {
      test("empty string should return empty string") {
        val result = stringUtils.encodeURIComponent("")
        assert(result == "")
      }

      test("simple alphanumeric string should remain unchanged") {
        val result = stringUtils.encodeURIComponent("hello123")
        assert(result == "hello123")
      }

      test("spaces should be encoded as %20") {
        val result = stringUtils.encodeURIComponent("hello world")
        assert(result == "hello%20world")
      }

      test("special characters should be properly encoded") {
        val result = stringUtils.encodeURIComponent("hello!world")
        assert(result == "hello!world") // ! should not be encoded
      }

      test("parentheses should not be encoded") {
        val result = stringUtils.encodeURIComponent("func(param)")
        assert(result == "func(param)")
      }

      test("single quote should not be encoded") {
        val result = stringUtils.encodeURIComponent("don't")
        assert(result == "don't")
      }

      test("tilde should not be encoded") {
        val result = stringUtils.encodeURIComponent("~user")
        assert(result == "~user")
      }

      test("complex string with multiple special characters") {
        val result = stringUtils.encodeURIComponent("hello world!()'~")
        assert(result == "hello%20world!()'~")
      }

      test("unicode characters should be properly encoded") {
        val result = stringUtils.encodeURIComponent("café")
        assert(result.contains("%"))
        assert(!result.contains("café"))
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("quote method with null-like characters") {
        val result = stringUtils.quote("\u0000\u0001")
        assert(result.startsWith("\""))
        assert(result.endsWith("\""))
      }

      test("formatComment with only newlines") {
        val result = stringUtils.formatComment("\n\n\n")
        assert(result == "\n")
      }

      test("formatComment with tabs after newline") {
        val result = stringUtils.formatComment("text\n\tmore")
        // The method preserves tabs as-is, only normalizes spaces
        assert(result == "text\n\tmore")
      }

      test("escapeNestedComments with overlapping patterns") {
        val input = "/* comment /* nested */ more */"
        val result = stringUtils.escapeNestedComments(input)
        assert(result.contains("/ *"))
        assert(result.contains("* /"))
      }

      test("joinCamelCase with special edge cases") {
        // Test with strings that have mixed patterns
        val result1 = stringUtils.joinCamelCase(List("HTML", "element", "API"))
        // The method capitalizes subsequent strings as-is, so "API" becomes "API"
        assert(result1 == "htmlElementAPI")

        val result2 = stringUtils.joinCamelCase(List("a", "B", "c"))
        assert(result2 == "aBC")
      }

      test("toCamelCase with consecutive separators") {
        val result = stringUtils.toCamelCase("hello__world--test")
        assert(result == "helloWorldTest")
      }

      test("encodeURIComponent with edge characters") {
        val result1 = stringUtils.encodeURIComponent("@#$%^&*")
        assert(result1.contains("%"))

        val result2 = stringUtils.encodeURIComponent("hello@world.com")
        assert(result2.contains("%"))
      }

      test("private unCapitalize method behavior through joinCamelCase") {
        // Test the private unCapitalize method indirectly
        val result1 = stringUtils.joinCamelCase(List("A"))
        assert(result1 == "a")

        val result2 = stringUtils.joinCamelCase(List(""))
        assert(result2 == "")

        val result3 = stringUtils.joinCamelCase(List("already"))
        assert(result3 == "already")
      }
    }
  }
}