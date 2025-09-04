package org.scalablytyped.converter.internal.ts

import org.scalablytyped.converter.internal.*
import utest.*

object TsExprTests extends TestSuite {
  def tests = Tests {
    test("TsExpr Case Classes - Construction and Basic Properties") {
      test("Ref construction") {
        val qident = TsQIdent.of(TsIdent("myVariable"))
        val ref = TsExpr.Ref(qident)

        assert(ref.value == qident)
        assert(ref.isInstanceOf[TsExpr])
      }

      test("Literal construction with string") {
        val stringLit = TsLiteral.Str("hello")
        val literal = TsExpr.Literal(stringLit)

        assert(literal.value == stringLit)
        assert(literal.isInstanceOf[TsExpr])
      }

      test("Literal construction with number") {
        val numLit = TsLiteral.Num("42")
        val literal = TsExpr.Literal(numLit)

        assert(literal.value == numLit)
        assert(literal.isInstanceOf[TsExpr])
      }

      test("Literal construction with boolean") {
        val boolLit = TsLiteral.Bool(true)
        val literal = TsExpr.Literal(boolLit)

        assert(literal.value == boolLit)
        assert(literal.isInstanceOf[TsExpr])
      }

      test("Call construction with no parameters") {
        val function = TsExpr.Ref(TsQIdent.of(TsIdent("myFunction")))
        val call = TsExpr.Call(function, IArray.Empty)

        assert(call.function == function)
        assert(call.params.isEmpty)
        assert(call.isInstanceOf[TsExpr])
      }

      test("Call construction with parameters") {
        val function = TsExpr.Ref(TsQIdent.of(TsIdent("myFunction")))
        val param1 = TsExpr.Literal(TsLiteral.Str("arg1"))
        val param2 = TsExpr.Literal(TsLiteral.Num("42"))
        val params = IArray(param1, param2)
        val call = TsExpr.Call(function, params)

        assert(call.function == function)
        assert(call.params.length == 2)
        assert(call.params(0) == param1)
        assert(call.params(1) == param2)
      }

      test("Unary construction") {
        val expr = TsExpr.Literal(TsLiteral.Bool(true))
        val unary = TsExpr.Unary("!", expr)

        assert(unary.op == "!")
        assert(unary.expr == expr)
        assert(unary.isInstanceOf[TsExpr])
      }

      test("BinaryOp construction") {
        val left = TsExpr.Literal(TsLiteral.Num("1"))
        val right = TsExpr.Literal(TsLiteral.Num("2"))
        val binaryOp = TsExpr.BinaryOp(left, "+", right)

        assert(binaryOp.one == left)
        assert(binaryOp.op == "+")
        assert(binaryOp.two == right)
        assert(binaryOp.isInstanceOf[TsExpr])
      }

      test("Cast construction") {
        val expr = TsExpr.Literal(TsLiteral.Num("42"))
        val targetType = TsTypeRef.string
        val cast = TsExpr.Cast(expr, targetType)

        assert(cast.expr == expr)
        assert(cast.tpe == targetType)
        assert(cast.isInstanceOf[TsExpr])
      }

      test("ArrayOf construction") {
        val element = TsExpr.Literal(TsLiteral.Str("item"))
        val arrayOf = TsExpr.ArrayOf(element)

        assert(arrayOf.expr == element)
        assert(arrayOf.isInstanceOf[TsExpr])
      }
    }

    test("TsExpr.format - String Formatting") {
      test("format Ref expression") {
        val ref = TsExpr.Ref(TsQIdent.of(TsIdent("myVariable")))
        val formatted = TsExpr.format(ref)

        assert(formatted.contains("myVariable"))
      }

      test("format string literal") {
        val literal = TsExpr.Literal(TsLiteral.Str("hello"))
        val formatted = TsExpr.format(literal)

        assert(formatted == "\"hello\"")
      }

      test("format number literal") {
        val literal = TsExpr.Literal(TsLiteral.Num("42"))
        val formatted = TsExpr.format(literal)

        assert(formatted == "42")
      }

      test("format boolean literal true") {
        val literal = TsExpr.Literal(TsLiteral.Bool(true))
        val formatted = TsExpr.format(literal)

        assert(formatted == "true")
      }

      test("format boolean literal false") {
        val literal = TsExpr.Literal(TsLiteral.Bool(false))
        val formatted = TsExpr.format(literal)

        assert(formatted == "false")
      }

      test("format long number literal") {
        val longValue = (Int.MaxValue.toLong + 1).toString
        val literal = TsExpr.Literal(TsLiteral.Num(longValue))
        val formatted = TsExpr.format(literal)

        // Should append .0 for long values > Int.MaxValue
        assert(formatted == s"$longValue.0")
      }

      test("format Call expression with no parameters") {
        val function = TsExpr.Ref(TsQIdent.of(TsIdent("func")))
        val call = TsExpr.Call(function, IArray.Empty)
        val formatted = TsExpr.format(call)

        assert(formatted.contains("func"))
        assert(formatted.contains("()"))
      }

      test("format Call expression with parameters") {
        val function = TsExpr.Ref(TsQIdent.of(TsIdent("func")))
        val param1 = TsExpr.Literal(TsLiteral.Str("arg1"))
        val param2 = TsExpr.Literal(TsLiteral.Num("42"))
        val call = TsExpr.Call(function, IArray(param1, param2))
        val formatted = TsExpr.format(call)

        assert(formatted.contains("func"))
        assert(formatted.contains("\"arg1\""))
        assert(formatted.contains("42"))
        assert(formatted.contains(","))
      }

      test("format Unary expression") {
        val expr = TsExpr.Literal(TsLiteral.Bool(true))
        val unary = TsExpr.Unary("!", expr)
        val formatted = TsExpr.format(unary)

        assert(formatted == "!true")
      }

      test("format BinaryOp expression") {
        val left = TsExpr.Literal(TsLiteral.Num("1"))
        val right = TsExpr.Literal(TsLiteral.Num("2"))
        val binaryOp = TsExpr.BinaryOp(left, "+", right)
        val formatted = TsExpr.format(binaryOp)

        assert(formatted == "1 + 2")
      }

      test("format Cast expression") {
        val expr = TsExpr.Literal(TsLiteral.Num("42"))
        val cast = TsExpr.Cast(expr, TsTypeRef.string)
        val formatted = TsExpr.format(cast)

        assert(formatted.contains("42"))
        assert(formatted.contains("as"))
        assert(formatted.contains("string"))
      }

      test("format ArrayOf expression") {
        val element = TsExpr.Literal(TsLiteral.Str("item"))
        val arrayOf = TsExpr.ArrayOf(element)
        val formatted = TsExpr.format(arrayOf)

        assert(formatted == "[\"item\"]")
      }
    }

    test("TsExpr.Num Extractor") {
      test("extract BigDecimal from TsType") {
        val numLiteral = TsTypeLiteral(TsLiteral.Num("42.5"))
        val extracted = TsExpr.Num.unapply(numLiteral)

        assert(extracted.isDefined)
        assert(extracted.get == BigDecimal("42.5"))
      }

      test("extract BigDecimal from TsLiteral") {
        val numLiteral = TsLiteral.Num("123.456")
        val extracted = TsExpr.Num.unapply(numLiteral)

        assert(extracted.isDefined)
        assert(extracted.get == BigDecimal("123.456"))
      }

      test("extract integer from TsLiteral") {
        val numLiteral = TsLiteral.Num("42")
        val extracted = TsExpr.Num.unapply(numLiteral)

        assert(extracted.isDefined)
        assert(extracted.get == BigDecimal("42"))
      }

      test("fail to extract from non-numeric TsLiteral") {
        val stringLiteral = TsLiteral.Str("not a number")
        val extracted = TsExpr.Num.unapply(stringLiteral)

        assert(extracted.isEmpty)
      }

      test("fail to extract from invalid numeric string") {
        val invalidNum = TsLiteral.Num("42abc")
        val extracted = TsExpr.Num.unapply(invalidNum)

        assert(extracted.isEmpty)
      }

      test("fail to extract from non-TsTypeLiteral TsType") {
        val typeRef = TsTypeRef.string
        val extracted = TsExpr.Num.unapply(typeRef)

        assert(extracted.isEmpty)
      }
    }

    test("TsExpr.Num.Long Extractor") {
      test("extract Long from TsType") {
        val longLiteral = TsTypeLiteral(TsLiteral.Num("123456789"))
        val extracted = TsExpr.Num.Long.unapply(longLiteral)

        assert(extracted.isDefined)
        assert(extracted.get == 123456789L)
      }

      test("extract Long from TsLiteral") {
        val longLiteral = TsLiteral.Num("987654321")
        val extracted = TsExpr.Num.Long.unapply(longLiteral)

        assert(extracted.isDefined)
        assert(extracted.get == 987654321L)
      }

      test("fail to extract from decimal TsLiteral") {
        val decimalLiteral = TsLiteral.Num("42.5")
        val extracted = TsExpr.Num.Long.unapply(decimalLiteral)

        assert(extracted.isEmpty)
      }

      test("fail to extract from non-numeric TsLiteral") {
        val stringLiteral = TsLiteral.Str("not a number")
        val extracted = TsExpr.Num.Long.unapply(stringLiteral)

        assert(extracted.isEmpty)
      }

      test("fail to extract from non-TsTypeLiteral TsType") {
        val typeRef = TsTypeRef.number
        val extracted = TsExpr.Num.Long.unapply(typeRef)

        assert(extracted.isEmpty)
      }
    }

    test("TsExpr.typeOf - Type Inference") {
      test("typeOf Ref returns Default") {
        val ref = TsExpr.Ref(TsQIdent.of(TsIdent("myVar")))
        val inferredType = TsExpr.typeOf(ref)

        assert(inferredType == TsExpr.Default)
      }

      test("typeOf Literal returns TsTypeLiteral") {
        val stringLit = TsExpr.Literal(TsLiteral.Str("hello"))
        val inferredType = TsExpr.typeOf(stringLit)

        inferredType match {
          case TsTypeLiteral(lit) => assert(lit == TsLiteral.Str("hello"))
          case _ => assert(false)
        }
      }

      test("typeOf Call returns any") {
        val function = TsExpr.Ref(TsQIdent.of(TsIdent("func")))
        val call = TsExpr.Call(function, IArray.Empty)
        val inferredType = TsExpr.typeOf(call)

        assert(inferredType == TsTypeRef.any)
      }

      test("typeOf Unary returns widened type") {
        val expr = TsExpr.Literal(TsLiteral.Str("hello"))
        val unary = TsExpr.Unary("!", expr)
        val inferredType = TsExpr.typeOf(unary)

        assert(inferredType == TsTypeRef.string)
      }

      test("typeOf Cast returns target type") {
        val expr = TsExpr.Literal(TsLiteral.Num("42"))
        val cast = TsExpr.Cast(expr, TsTypeRef.string)
        val inferredType = TsExpr.typeOf(cast)

        assert(inferredType == TsTypeRef.string)
      }

      test("typeOf ArrayOf returns Array type") {
        val element = TsExpr.Literal(TsLiteral.Str("item"))
        val arrayOf = TsExpr.ArrayOf(element)
        val inferredType = TsExpr.typeOf(arrayOf)

        inferredType match {
          case TsTypeRef(_, name, tparams) =>
            assert(name == TsQIdent.Array)
            assert(tparams.length == 1)
            tparams(0) match {
              case TsTypeLiteral(lit) => assert(lit == TsLiteral.Str("item"))
              case _ => assert(false)
            }
          case _ => assert(false)
        }
      }
    }

    test("TsExpr.typeOf - BinaryOp Type Inference") {
      test("numeric addition") {
        val left = TsExpr.Literal(TsLiteral.Num("1"))
        val right = TsExpr.Literal(TsLiteral.Num("2"))
        val binaryOp = TsExpr.BinaryOp(left, "+", right)
        val inferredType = TsExpr.typeOf(binaryOp)

        inferredType match {
          case TsTypeLiteral(TsLiteral.Num(value)) => assert(value == "3")
          case _ => assert(false)
        }
      }

      test("numeric multiplication") {
        val left = TsExpr.Literal(TsLiteral.Num("3"))
        val right = TsExpr.Literal(TsLiteral.Num("4"))
        val binaryOp = TsExpr.BinaryOp(left, "*", right)
        val inferredType = TsExpr.typeOf(binaryOp)

        inferredType match {
          case TsTypeLiteral(TsLiteral.Num(value)) => assert(value == "12")
          case _ => assert(false)
        }
      }

      test("long left shift") {
        val left = TsExpr.Literal(TsLiteral.Num("8"))
        val right = TsExpr.Literal(TsLiteral.Num("2"))
        val binaryOp = TsExpr.BinaryOp(left, "<<", right)
        val inferredType = TsExpr.typeOf(binaryOp)

        inferredType match {
          case TsTypeLiteral(TsLiteral.Num(value)) => assert(value == "32")
          case _ => assert(false)
        }
      }

      test("long right shift") {
        val left = TsExpr.Literal(TsLiteral.Num("32"))
        val right = TsExpr.Literal(TsLiteral.Num("2"))
        val binaryOp = TsExpr.BinaryOp(left, ">>", right)
        val inferredType = TsExpr.typeOf(binaryOp)

        inferredType match {
          case TsTypeLiteral(TsLiteral.Num(value)) => assert(value == "8")
          case _ => assert(false)
        }
      }

      test("non-numeric operation returns widened type") {
        val left = TsExpr.Literal(TsLiteral.Str("hello"))
        val right = TsExpr.Literal(TsLiteral.Str("world"))
        val binaryOp = TsExpr.BinaryOp(left, "+", right)
        val inferredType = TsExpr.typeOf(binaryOp)

        assert(inferredType == TsTypeRef.string)
      }

      test("unsupported operation returns widened type") {
        val left = TsExpr.Literal(TsLiteral.Num("1"))
        val right = TsExpr.Literal(TsLiteral.Num("2"))
        val binaryOp = TsExpr.BinaryOp(left, "-", right)
        val inferredType = TsExpr.typeOf(binaryOp)

        assert(inferredType == TsTypeRef.number)
      }
    }

    test("TsExpr.typeOfOpt") {
      test("Some expression returns type") {
        val expr = TsExpr.Literal(TsLiteral.Str("hello"))
        val inferredType = TsExpr.typeOfOpt(Some(expr))

        inferredType match {
          case TsTypeLiteral(lit) => assert(lit == TsLiteral.Str("hello"))
          case _ => assert(false)
        }
      }

      test("None returns Default") {
        val inferredType = TsExpr.typeOfOpt(None)

        assert(inferredType == TsExpr.Default)
      }
    }

    test("TsExpr.widen") {
      test("widen string literal") {
        val stringLitType = TsTypeLiteral(TsLiteral.Str("hello"))
        val widened = TsExpr.widen(stringLitType)

        assert(widened == TsTypeRef.string)
      }

      test("widen number literal") {
        val numLitType = TsTypeLiteral(TsLiteral.Num("42"))
        val widened = TsExpr.widen(numLitType)

        assert(widened == TsTypeRef.number)
      }

      test("widen boolean literal") {
        val boolLitType = TsTypeLiteral(TsLiteral.Bool(true))
        val widened = TsExpr.widen(boolLitType)

        assert(widened == TsTypeRef.boolean)
      }

      test("string type ref remains string") {
        val widened = TsExpr.widen(TsTypeRef.string)

        assert(widened == TsTypeRef.string)
      }

      test("number type ref remains number") {
        val widened = TsExpr.widen(TsTypeRef.number)

        assert(widened == TsTypeRef.number)
      }

      test("other types return Default") {
        val customType = TsTypeRef(NoComments, TsQIdent.of(TsIdent("CustomType")), IArray.Empty)
        val widened = TsExpr.widen(customType)

        assert(widened == TsExpr.Default)
      }
    }

    test("TsExpr.visit - Expression Transformation") {
      test("visit Ref expression") {
        val ref = TsExpr.Ref(TsQIdent.of(TsIdent("oldName")))
        val transformed = TsExpr.visit(ref) {
          case TsExpr.Ref(qident) if qident.parts.head.value == "oldName" =>
            TsExpr.Ref(TsQIdent.of(TsIdent("newName")))
          case other => other
        }

        transformed match {
          case TsExpr.Ref(qident) => assert(qident.parts.head.value == "newName")
          case _ => assert(false)
        }
      }

      test("visit Literal expression") {
        val literal = TsExpr.Literal(TsLiteral.Str("old"))
        val transformed = TsExpr.visit(literal) {
          case TsExpr.Literal(TsLiteral.Str("old")) =>
            TsExpr.Literal(TsLiteral.Str("new"))
          case other => other
        }

        transformed match {
          case TsExpr.Literal(TsLiteral.Str(value)) => assert(value == "new")
          case _ => assert(false)
        }
      }

      test("visit Cast expression recursively") {
        val innerExpr = TsExpr.Ref(TsQIdent.of(TsIdent("oldName")))
        val cast = TsExpr.Cast(innerExpr, TsTypeRef.string)
        val transformed = TsExpr.visit(cast) {
          case TsExpr.Ref(qident) if qident.parts.head.value == "oldName" =>
            TsExpr.Ref(TsQIdent.of(TsIdent("newName")))
          case other => other
        }

        transformed match {
          case TsExpr.Cast(TsExpr.Ref(qident), _) => assert(qident.parts.head.value == "newName")
          case _ => assert(false)
        }
      }

      test("visit ArrayOf expression recursively") {
        val innerExpr = TsExpr.Ref(TsQIdent.of(TsIdent("oldName")))
        val arrayOf = TsExpr.ArrayOf(innerExpr)
        val transformed = TsExpr.visit(arrayOf) {
          case TsExpr.Ref(qident) if qident.parts.head.value == "oldName" =>
            TsExpr.Ref(TsQIdent.of(TsIdent("newName")))
          case other => other
        }

        transformed match {
          case TsExpr.ArrayOf(TsExpr.Ref(qident)) => assert(qident.parts.head.value == "newName")
          case _ => assert(false)
        }
      }

      test("visit Call expression recursively") {
        val function = TsExpr.Ref(TsQIdent.of(TsIdent("oldFunc")))
        val param = TsExpr.Ref(TsQIdent.of(TsIdent("oldParam")))
        val call = TsExpr.Call(function, IArray(param))
        val transformed = TsExpr.visit(call) { expr =>
          expr match {
            case TsExpr.Ref(qident) if qident.parts.head.value.startsWith("old") =>
              TsExpr.Ref(TsQIdent.of(TsIdent(qident.parts.head.value.replace("old", "new"))))
            case other => other
          }
        }

        transformed match {
          case TsExpr.Call(TsExpr.Ref(funcQident), params) =>
            assert(funcQident.parts.head.value == "newFunc")
            params(0) match {
              case TsExpr.Ref(paramQident) => assert(paramQident.parts.head.value == "newParam")
              case _ => assert(false)
            }
          case _ => assert(false)
        }
      }

      test("visit Unary expression recursively") {
        val innerExpr = TsExpr.Ref(TsQIdent.of(TsIdent("oldName")))
        val unary = TsExpr.Unary("!", innerExpr)
        val transformed = TsExpr.visit(unary) { expr =>
          expr match {
            case TsExpr.Ref(qident) if qident.parts.head.value == "oldName" =>
              TsExpr.Ref(TsQIdent.of(TsIdent("newName")))
            case other => other
          }
        }

        transformed match {
          case TsExpr.Unary("!", TsExpr.Ref(qident)) => assert(qident.parts.head.value == "newName")
          case _ => assert(false)
        }
      }

      test("visit BinaryOp expression recursively") {
        val left = TsExpr.Ref(TsQIdent.of(TsIdent("oldLeft")))
        val right = TsExpr.Ref(TsQIdent.of(TsIdent("oldRight")))
        val binaryOp = TsExpr.BinaryOp(left, "+", right)
        val transformed = TsExpr.visit(binaryOp) { expr =>
          expr match {
            case TsExpr.Ref(qident) if qident.parts.head.value.startsWith("old") =>
              TsExpr.Ref(TsQIdent.of(TsIdent(qident.parts.head.value.replace("old", "new"))))
            case other => other
          }
        }

        transformed match {
          case TsExpr.BinaryOp(TsExpr.Ref(leftQident), "+", TsExpr.Ref(rightQident)) =>
            assert(leftQident.parts.head.value == "newLeft")
            assert(rightQident.parts.head.value == "newRight")
          case _ => assert(false)
        }
      }
    }

    test("Edge Cases and Error Conditions") {
      test("format with complex nested expressions") {
        val innerCall = TsExpr.Call(
          TsExpr.Ref(TsQIdent.of(TsIdent("innerFunc"))),
          IArray(TsExpr.Literal(TsLiteral.Str("arg")))
        )
        val outerCall = TsExpr.Call(
          TsExpr.Ref(TsQIdent.of(TsIdent("outerFunc"))),
          IArray(innerCall)
        )
        val formatted = TsExpr.format(outerCall)

        assert(formatted.contains("outerFunc"))
        assert(formatted.contains("innerFunc"))
        assert(formatted.contains("\"arg\""))
      }

      test("typeOf with deeply nested expressions") {
        val deeplyNested = TsExpr.ArrayOf(
          TsExpr.Cast(
            TsExpr.Unary("!", TsExpr.Literal(TsLiteral.Bool(true))),
            TsTypeRef.boolean
          )
        )
        val inferredType = TsExpr.typeOf(deeplyNested)

        inferredType match {
          case TsTypeRef(_, name, tparams) =>
            assert(name == TsQIdent.Array)
            assert(tparams.length == 1)
            assert(tparams(0) == TsTypeRef.boolean)
          case _ => assert(false)
        }
      }

      test("visit with identity transformation") {
        val expr = TsExpr.BinaryOp(
          TsExpr.Literal(TsLiteral.Num("1")),
          "+",
          TsExpr.Literal(TsLiteral.Num("2"))
        )
        val transformed = TsExpr.visit(expr)(identity)

        assert(transformed == expr)
      }

      test("Num extractor with edge cases") {
        // Test with zero
        val zeroLit = TsLiteral.Num("0")
        val zeroExtracted = TsExpr.Num.unapply(zeroLit)
        assert(zeroExtracted.isDefined)
        assert(zeroExtracted.get == BigDecimal("0"))

        // Test with negative number (should fail since it contains non-digit/dot chars)
        val negativeLit = TsLiteral.Num("-42")
        val negativeExtracted = TsExpr.Num.unapply(negativeLit)
        assert(negativeExtracted.isEmpty)

        // Test with decimal
        val decimalLit = TsLiteral.Num("3.14159")
        val decimalExtracted = TsExpr.Num.unapply(decimalLit)
        assert(decimalExtracted.isDefined)
        assert(decimalExtracted.get == BigDecimal("3.14159"))
      }

      test("Num.Long extractor with edge cases") {
        // Test with zero
        val zeroLit = TsLiteral.Num("0")
        val zeroExtracted = TsExpr.Num.Long.unapply(zeroLit)
        assert(zeroExtracted.isDefined)
        assert(zeroExtracted.get == 0L)

        // Test with max long value
        val maxLongLit = TsLiteral.Num(Long.MaxValue.toString)
        val maxLongExtracted = TsExpr.Num.Long.unapply(maxLongLit)
        assert(maxLongExtracted.isDefined)
        assert(maxLongExtracted.get == Long.MaxValue)
      }
    }
  }
}