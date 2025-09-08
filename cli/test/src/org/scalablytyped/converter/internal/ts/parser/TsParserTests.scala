package org.scalablytyped.converter.internal.ts.parser

import org.scalablytyped.converter.internal.ts.*
import utest.*

object TsParserTests extends TestSuite {

  def tests = Tests {
    test("Basic Parsing - Empty File") {
      test("should parse empty string successfully") {
        val result = parseString("")
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.isEmpty)
          assert(parsed.directives.isEmpty)
        }
      }

      test("should parse file with only comments") {
        val content = "// This is a comment\n/* Block comment */"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.isEmpty)
          assert(parsed.comments.cs.nonEmpty)
        }
      }

      test("should parse file with only whitespace") {
        val content = "   \n\t  \n  "
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.isEmpty)
          assert(parsed.directives.isEmpty)
        }
      }
    }

    test("Basic Parsing - Simple Declarations") {
      test("should parse simple interface") {
        val content = "interface MyInterface { x: number; }"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclInterface])
          val interface = member.asInstanceOf[TsDeclInterface]
          assert(interface.name.value == "MyInterface")
          assert(interface.members.length == 1)
        }
      }

      test("should parse simple type alias") {
        val content = "type MyType = string;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "MyType")
          assert(alias.alias.isInstanceOf[TsTypeRef])
        }
      }

      test("should parse simple variable declaration") {
        val content = "let myVar: string;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclVar])
          val variable = member.asInstanceOf[TsDeclVar]
          assert(variable.name.value == "myVar")
          assert(variable.readOnly == false)
        }
      }
    }

    test("Error Handling and Edge Cases") {
      test("should fail on invalid syntax") {
        val content = "interface { invalid syntax"
        val result  = parseString(content)
        assert(result.isLeft)
      }

      test("should fail on incomplete declaration") {
        val content = "interface MyInterface"
        val result  = parseString(content)
        assert(result.isLeft)
      }

      test("should fail on malformed type") {
        val content = "type MyType = string |"
        val result  = parseString(content)
        assert(result.isLeft)
      }

      test("should handle multiple declarations") {
        val content = """
          interface A { x: number; }
          type B = string;
          let c: boolean;
        """
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 3)
          assert(parsed.members(0).isInstanceOf[TsDeclInterface])
          assert(parsed.members(1).isInstanceOf[TsDeclTypeAlias])
          assert(parsed.members(2).isInstanceOf[TsDeclVar])
        }
      }

      test("should handle shebang") {
        val content = "#!/usr/bin/env node\ninterface Test { }"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          assert(parsed.members.head.isInstanceOf[TsDeclInterface])
        }
      }
    }
  }
}
