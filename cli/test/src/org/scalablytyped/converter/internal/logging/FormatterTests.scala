package org.scalablytyped.converter.internal.logging

import fansi.Str
import utest.*
import java.io.File
import java.net.URI

object FormatterTests extends TestSuite {
  def tests = Tests {
    test("Basic Formatters") {
      test("String formatter should return input as-is") {
        val input = "test string"
        val result = Formatter(input)
        assert(result == Str(input))
      }

      test("Str formatter should return input as-is") {
        val input = Str("test fansi string")
        val result = Formatter(input)
        assert(result == input)
      }

      test("Int formatter should convert to string") {
        val input = 42
        val result = Formatter(input)
        assert(result == Str("42"))
      }

      test("Long formatter should convert to string") {
        val input = 123456789L
        val result = Formatter(input)
        assert(result == Str("123456789"))
      }

      test("Unit formatter should return empty string") {
        val input = ()
        val result = Formatter(input)
        assert(result == Str(""))
      }

      test("File formatter should return file name") {
        val file = new File("/path/to/test.txt")
        val result = Formatter(file)
        assert(result == Str("test.txt"))
      }

      test("URI formatter should return string representation") {
        val uri = new URI("https://example.com/path")
        val result = Formatter(uri)
        assert(result == Str("https://example.com/path"))
      }
    }

    test("Tuple Formatters") {
      test("Tuple2 formatter should join with comma") {
        val input = ("first", "second")
        val result = Formatter(input)
        assert(result == Str("first, second"))
      }

      test("Tuple3 formatter should join with commas") {
        val input = ("first", "second", "third")
        val result = Formatter(input)
        assert(result == Str("first, second, third"))
      }

      test("Tuple4 formatter should join with commas") {
        val input = ("first", "second", "third", "fourth")
        val result = Formatter(input)
        assert(result == Str("first, second, third, fourth"))
      }

      test("Nested tuples should format correctly") {
        val input = (("a", "b"), ("c", "d"))
        val result = Formatter(input)
        assert(result == Str("a, b, c, d"))
      }

      test("Mixed type tuples should format correctly") {
        // Test with types that have formatters
        val mixedInput = ("text", 42, ())
        val result = Formatter(mixedInput)
        assert(result == Str("text, 42, "))
      }
    }

    test("Either Formatter") {
      test("Left value should be formatted") {
        val input: Either[String, Int] = Left("error message")
        val result = Formatter(input)
        assert(result == Str("error message"))
      }

      test("Right value should be formatted") {
        val input: Either[String, Int] = Right(42)
        val result = Formatter(input)
        assert(result == Str("42"))
      }

      test("Nested Either should format correctly") {
        val input: Either[Either[String, Int], String] = Left(Right(123))
        val result = Formatter(input)
        assert(result == Str("123"))
      }
    }

    test("Iterable Formatter") {
      test("Empty list should return empty string") {
        val input = List.empty[String]
        val result = Formatter(input)
        assert(result == Str(""))
      }

      test("Single element list should format with brackets") {
        val input = List("single")
        val result = Formatter(input)
        assert(result == Str("[single]"))
      }

      test("Multiple element list should format with brackets and commas") {
        val input = List("first", "second", "third")
        val result = Formatter(input)
        assert(result == Str("[first, second, third]"))
      }

      test("Set should format correctly") {
        val input = Set("a", "b")
        val result = Formatter(input)
        // Note: Set order is not guaranteed, but we can check structure
        val resultStr = result.plainText
        assert(resultStr.startsWith("["))
        assert(resultStr.endsWith("]"))
        assert(resultStr.contains("a"))
        assert(resultStr.contains("b"))
        assert(resultStr.contains(", "))
      }

      test("Vector should format correctly") {
        val input = Vector(1, 2, 3)
        val result = Formatter(input)
        assert(result == Str("[1, 2, 3]"))
      }

      test("Nested iterables should format correctly") {
        val input = List(List("a", "b"), List("c", "d"))
        val result = Formatter(input)
        assert(result == Str("[[a, b], [c, d]]"))
      }
    }

    test("Array Formatter") {
      test("Empty array should return empty string") {
        val input = Array.empty[String]
        val result = Formatter(input)
        assert(result == Str(""))
      }

      test("Single element array should format with brackets") {
        val input = Array("single")
        val result = Formatter(input)
        assert(result == Str("[single]"))
      }

      test("Multiple element array should format with brackets and commas") {
        val input = Array("first", "second", "third")
        val result = Formatter(input)
        assert(result == Str("[first, second, third]"))
      }

      test("Array of integers should format correctly") {
        val input = Array(1, 2, 3, 4, 5)
        val result = Formatter(input)
        assert(result == Str("[1, 2, 3, 4, 5]"))
      }

      test("Nested arrays should format correctly") {
        val input = Array(Array("a", "b"), Array("c", "d"))
        val result = Formatter(input)
        assert(result == Str("[[a, b], [c, d]]"))
      }
    }

    test("Map Formatter") {
      test("Empty map should return empty string") {
        val input = Map.empty[String, String]
        val result = Formatter(input)
        assert(result == Str(""))
      }

      test("Single entry map should format with brackets and arrow") {
        val input = Map("key" -> "value")
        val result = Formatter(input)
        assert(result == Str("[key => value]"))
      }

      test("Multiple entry map should format correctly") {
        val input = Map("key1" -> "value1", "key2" -> "value2")
        val result = Formatter(input)
        val resultStr = result.plainText
        assert(resultStr.startsWith("["))
        assert(resultStr.endsWith("]"))
        assert(resultStr.contains("key1 => value1"))
        assert(resultStr.contains("key2 => value2"))
        assert(resultStr.contains(", "))
      }

      test("Map with different types should format correctly") {
        val input = Map("count" -> 42, "name" -> 0)
        val result = Formatter(input)
        val resultStr = result.plainText
        assert(resultStr.contains(" => "))
        assert(resultStr.contains("42"))
        assert(resultStr.contains("0"))
      }

      test("Nested maps should format correctly") {
        val input = Map("outer" -> Map("inner" -> "value"))
        val result = Formatter(input)
        assert(result == Str("[outer => [inner => value]]"))
      }
    }

    test("Throwable Formatter") {
      test("Exception with message should format class name and message") {
        val exception = new RuntimeException("Test error message")
        val result = Formatter(exception)
        assert(result == Str("java.lang.RuntimeException: Test error message"))
      }

      test("Exception without message should format only class name") {
        val exception = new RuntimeException(null.asInstanceOf[String])
        val result = Formatter(exception)
        assert(result == Str("java.lang.RuntimeException"))
      }

      test("Custom exception should format correctly") {
        val exception = new IllegalStateException("Custom error")
        val result = Formatter(exception)
        val resultStr = result.plainText
        assert(resultStr.contains("IllegalStateException"))
        assert(resultStr.contains("Custom error"))
      }

      test("Exception with null message should format only class name") {
        val exception = new IllegalArgumentException()
        val result = Formatter(exception)
        assert(result == Str("java.lang.IllegalArgumentException"))
      }
    }

    test("Edge Cases and Complex Scenarios") {
      test("Empty string should format correctly") {
        val input = ""
        val result = Formatter(input)
        assert(result == Str(""))
      }

      test("String with special characters should format correctly") {
        val input = "test\nwith\ttabs and\rcarriage returns"
        val result = Formatter(input)
        assert(result == Str(input))
      }

      test("Very long string should format correctly") {
        val input = "a" * 1000
        val result = Formatter(input)
        assert(result == Str(input))
      }

      test("Complex nested structure should format correctly") {
        // Test with simpler types that have clear formatters
        val listInput = List("a", "b")
        val tupleInput = ("x", "y")
        val eitherInput: Either[String, Int] = Right(42)

        val listResult = Formatter(listInput)
        val tupleResult = Formatter(tupleInput)
        val eitherResult = Formatter(eitherInput)

        assert(listResult == Str("[a, b]"))
        assert(tupleResult == Str("x, y"))
        assert(eitherResult == Str("42"))
      }

      test("File with complex path should format correctly") {
        val file = new File("/very/long/path/with/many/directories/file.extension")
        val result = Formatter(file)
        assert(result == Str("file.extension"))
      }

      test("URI with query parameters should format correctly") {
        val uri = new URI("https://example.com/path?param1=value1&param2=value2")
        val result = Formatter(uri)
        assert(result == Str("https://example.com/path?param1=value1&param2=value2"))
      }
    }
  }
}