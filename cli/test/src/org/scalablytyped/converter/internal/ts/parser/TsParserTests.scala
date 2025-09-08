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

    test("Advanced Type System Features - Batch 1") {
      test("Keyof Operator - should parse keyof type") {
        val content = "type Keys = keyof MyInterface;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "Keys")
          assert(alias.alias.isInstanceOf[TsTypeKeyOf])
        }
      }

      test("Keyof Operator - should parse complex keyof expression") {
        val content = "type ComplexKeys = keyof (A & B);"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "ComplexKeys")
          assert(alias.alias.isInstanceOf[TsTypeKeyOf])
        }
      }

      test("Indexed Access Types - should parse indexed access type") {
        val content = "type Value = MyType[K];"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "Value")
          assert(alias.alias.isInstanceOf[TsTypeLookup])
        }
      }

      test("Indexed Access Types - should parse nested indexed access") {
        val content = "type NestedValue = MyType[K][P];"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "NestedValue")
          // This should be a nested TsTypeLookup
          assert(alias.alias.isInstanceOf[TsTypeLookup])
        }
      }
    }

    test("Advanced Type System Features - Batch 2") {
      test("Conditional Types - should parse simple conditional type") {
        val content = "type IsString<T> = T extends string ? true : false;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "IsString")
          assert(alias.alias.isInstanceOf[TsTypeConditional])
        }
      }

      test("Conditional Types - should parse complex conditional type") {
        val content = "type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "ReturnType")
          assert(alias.alias.isInstanceOf[TsTypeConditional])
        }
      }

      test("Conditional Types - should parse nested conditional types") {
        val content = "type Complex<T> = T extends string ? string[] : T extends number ? number[] : never;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "Complex")
          assert(alias.alias.isInstanceOf[TsTypeConditional])
        }
      }

      test("Infer Types - should parse infer in conditional type") {
        val content = "type ElementType<T> = T extends (infer U)[] ? U : never;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "ElementType")
          assert(alias.alias.isInstanceOf[TsTypeConditional])
        }
      }

      test("Infer Types - should parse multiple infer types") {
        val content = "type Parameters<T> = T extends (...args: infer P) => infer R ? P : never;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "Parameters")
          assert(alias.alias.isInstanceOf[TsTypeConditional])
        }
      }
    }

    test("Advanced Type System Features - Batch 3") {
      test("Template Literal Types - should parse simple template literal type") {
        val content = "type Greeting = `Hello, ${string}!`;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "Greeting")
          // In Scala implementation, template literals are converted to string types with comments
          assert(alias.alias.isInstanceOf[TsTypeRef])
          val typeRef = alias.alias.asInstanceOf[TsTypeRef]
          assert(typeRef.name.parts.head.value == "string")
        }
      }

      test("Template Literal Types - should parse complex template literal type") {
        val content = "type EventName<T> = `on${Capitalize<T>}Change`;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "EventName")
          // In Scala implementation, template literals are converted to string types with comments
          assert(alias.alias.isInstanceOf[TsTypeRef])
          val typeRef = alias.alias.asInstanceOf[TsTypeRef]
          assert(typeRef.name.parts.head.value == "string")
        }
      }

      test("Template Literal Types - should parse multiple interpolations") {
        val content = "type Path = `${string}/${string}/${string}`;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "Path")
          // In Scala implementation, template literals are converted to string types with comments
          assert(alias.alias.isInstanceOf[TsTypeRef])
          val typeRef = alias.alias.asInstanceOf[TsTypeRef]
          assert(typeRef.name.parts.head.value == "string")
        }
      }

      test("Mapped Types - should parse simple mapped type") {
        val content = "type Readonly<T> = { readonly [P in keyof T]: T[P] };"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "Readonly")
          assert(alias.alias.isInstanceOf[TsTypeObject])
        }
      }

      test("Mapped Types - should parse optional mapped type") {
        val content = "type Partial<T> = { [P in keyof T]?: T[P] };"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "Partial")
          assert(alias.alias.isInstanceOf[TsTypeObject])
        }
      }
    }

    test("Advanced Type System Features - Batch 4") {
      test("Type Queries - should parse simple typeof query") {
        val content = "type TypeOfValue = typeof myValue;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "TypeOfValue")
          assert(alias.alias.isInstanceOf[TsTypeQuery])
        }
      }

      test("Type Queries - should parse typeof with property access") {
        val content = "type TypeOfProperty = typeof obj.prop;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "TypeOfProperty")
          assert(alias.alias.isInstanceOf[TsTypeQuery])
        }
      }

      test("Advanced Combinations - should parse keyof typeof combination") {
        val content = "type Keys = keyof typeof myObject;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "Keys")
          assert(alias.alias.isInstanceOf[TsTypeKeyOf])
        }
      }

      test("Advanced Combinations - should parse conditional with keyof") {
        val content = "type IsKeyOf<T, K> = K extends keyof T ? true : false;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "IsKeyOf")
          assert(alias.alias.isInstanceOf[TsTypeConditional])
        }
      }

      test("Advanced Combinations - should parse indexed access with conditional") {
        val content = "type Get<T, K> = K extends keyof T ? T[K] : never;"
        val result  = parseString(content)
        assert(result.isRight)
        result.foreach { parsed =>
          assert(parsed.members.length == 1)
          val member = parsed.members.head
          assert(member.isInstanceOf[TsDeclTypeAlias])
          val alias = member.asInstanceOf[TsDeclTypeAlias]
          assert(alias.name.value == "Get")
          assert(alias.alias.isInstanceOf[TsTypeConditional])
        }
      }
    }
  }
}
