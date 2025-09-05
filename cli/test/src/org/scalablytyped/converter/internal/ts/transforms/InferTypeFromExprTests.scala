package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object InferTypeFromExprTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createLiteralExpr(value: String): TsExpr = TsExpr.Literal(TsLiteral.Str(value))

  def createNumLiteralExpr(value: String): TsExpr = TsExpr.Literal(TsLiteral.Num(value))

  def createBoolLiteralExpr(value: Boolean): TsExpr = TsExpr.Literal(TsLiteral.Bool(value))

  def createRefExpr(name: String): TsExpr = TsExpr.Ref(createQIdent(name))

  def createCallExpr(function: TsExpr, params: IArray[TsExpr] = Empty): TsExpr = 
    TsExpr.Call(function, params)

  def createUnaryExpr(op: String, expr: TsExpr): TsExpr = TsExpr.Unary(op, expr)

  def createBinaryOpExpr(left: TsExpr, op: String, right: TsExpr): TsExpr = 
    TsExpr.BinaryOp(left, op, right)

  def createCastExpr(expr: TsExpr, tpe: TsType): TsExpr = TsExpr.Cast(expr, tpe)

  def createArrayOfExpr(expr: TsExpr): TsExpr = TsExpr.ArrayOf(expr)

  def createMockProperty(
    name: String,
    tpe: Option[TsType] = None,
    expr: Option[TsExpr] = None
  ): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = expr,
      isStatic = false,
      isReadOnly = false
    )

  def createMockVar(
    name: String,
    tpe: Option[TsType] = None,
    expr: Option[TsExpr] = None
  ): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = expr,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockScope(declarations: TsDecl*): TsTreeScope = {
    val parsedFile = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = IArray.fromTraversable(declarations),
      codePath = CodePath.NoPath
    )

    val root = TsTreeScope(
      libName = TsIdentLibrarySimple("test-lib"),
      pedantic = false,
      deps = Map.empty,
      logger = Logger.DevNull
    )

    root / parsedFile
  }

  def assertHasComments(tpe: TsType): Unit = {
    tpe match {
      case tr: TsTypeRef => assert(tr.comments.cs.nonEmpty)
      case _ => // Other types don't have comments added by InferTypeFromExpr
    }
  }

  def tests = Tests {
    test("InferTypeFromExpr - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(InferTypeFromExpr.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsMemberProperty method") {
        val scope = createMockScope()
        val property = createMockProperty("testProp")
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        assert(result != null)
        assert(result.isInstanceOf[TsMemberProperty])
      }

      test("has enterTsDeclVar method") {
        val scope = createMockScope()
        val variable = createMockVar("testVar")
        val result = InferTypeFromExpr.enterTsDeclVar(scope)(variable)
        assert(result != null)
        assert(result.isInstanceOf[TsDeclVar])
      }

      test("leaves properties with types unchanged") {
        val scope = createMockScope()
        val property = createMockProperty("testProp", Some(TsTypeRef.string), Some(createLiteralExpr("value")))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result == property) // Should be unchanged
        assert(result.tpe.isDefined)
        assert(result.expr.isDefined)
      }

      test("leaves variables with types unchanged") {
        val scope = createMockScope()
        val variable = createMockVar("testVar", Some(TsTypeRef.string), Some(createLiteralExpr("value")))
        
        val result = InferTypeFromExpr.enterTsDeclVar(scope)(variable)
        
        assert(result == variable) // Should be unchanged
        assert(result.tpe.isDefined)
        assert(result.expr.isDefined)
      }
    }

    test("InferTypeFromExpr - Property Type Inference") {
      test("infers type from string literal") {
        val scope = createMockScope()
        val property = createMockProperty("testProp", None, Some(createLiteralExpr("hello")))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty) // Expression should be removed
        assert(result.tpe.get == TsTypeRef.string)
        // Should have comment with original expression (only for TsTypeRef)
        assertHasComments(result.tpe.get)
      }

      test("infers type from number literal") {
        val scope = createMockScope()
        val property = createMockProperty("testProp", None, Some(createNumLiteralExpr("42")))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        assert(result.tpe.get == TsTypeRef.number)
        assertHasComments(result.tpe.get)
      }

      test("infers type from boolean literal") {
        val scope = createMockScope()
        val property = createMockProperty("testProp", None, Some(createBoolLiteralExpr(true)))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        assert(result.tpe.get == TsTypeRef.boolean)
        assertHasComments(result.tpe.get)
      }

      test("infers type from reference expression") {
        val scope = createMockScope()
        val property = createMockProperty("testProp", None, Some(createRefExpr("someRef")))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        // Reference expressions get the default type (string | number)
        assert(result.tpe.get.isInstanceOf[TsTypeUnion])
        assertHasComments(result.tpe.get)
      }

      test("infers type from call expression") {
        val scope = createMockScope()
        val callExpr = createCallExpr(createRefExpr("someFunction"))
        val property = createMockProperty("testProp", None, Some(callExpr))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        // Call expressions get the default type (string | number)
        assert(result.tpe.get.isInstanceOf[TsTypeUnion])
        assertHasComments(result.tpe.get)
      }

      test("infers type from cast expression") {
        val scope = createMockScope()
        val castExpr = createCastExpr(createLiteralExpr("value"), TsTypeRef.number)
        val property = createMockProperty("testProp", None, Some(castExpr))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        assert(result.tpe.get == TsTypeRef.number)
        assertHasComments(result.tpe.get)
      }

      test("infers type from array expression") {
        val scope = createMockScope()
        val arrayExpr = createArrayOfExpr(createLiteralExpr("item"))
        val property = createMockProperty("testProp", None, Some(arrayExpr))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        // Array expressions get the default type (string | number)
        assert(result.tpe.get.isInstanceOf[TsTypeUnion])
        assertHasComments(result.tpe.get)
      }
    }

    test("InferTypeFromExpr - Variable Type Inference") {
      test("infers type from string literal in variable") {
        val scope = createMockScope()
        val variable = createMockVar("testVar", None, Some(createLiteralExpr("hello")))
        
        val result = InferTypeFromExpr.enterTsDeclVar(scope)(variable)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        assert(result.tpe.get == TsTypeRef.string)
        assertHasComments(result.tpe.get)
      }

      test("infers type from number literal in variable") {
        val scope = createMockScope()
        val variable = createMockVar("testVar", None, Some(createNumLiteralExpr("3.14")))
        
        val result = InferTypeFromExpr.enterTsDeclVar(scope)(variable)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        assert(result.tpe.get == TsTypeRef.number)
        assertHasComments(result.tpe.get)
      }

      test("infers type from boolean literal in variable") {
        val scope = createMockScope()
        val variable = createMockVar("testVar", None, Some(createBoolLiteralExpr(false)))
        
        val result = InferTypeFromExpr.enterTsDeclVar(scope)(variable)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        assert(result.tpe.get == TsTypeRef.boolean)
        assertHasComments(result.tpe.get)
      }

      test("preserves variable metadata") {
        val scope = createMockScope()
        val originalComments = Comments(Comment("Variable comment"))
        val variable = TsDeclVar(
          comments = originalComments,
          declared = true,
          readOnly = true,
          name = createSimpleIdent("testVar"),
          tpe = None,
          expr = Some(createLiteralExpr("value")),
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )
        
        val result = InferTypeFromExpr.enterTsDeclVar(scope)(variable)
        
        // Should preserve all metadata except add type and remove expression
        assert(result.comments == originalComments)
        assert(result.declared == true)
        assert(result.readOnly == true)
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        assert(result.tpe.get == TsTypeRef.string)
      }
    }

    test("InferTypeFromExpr - Complex Expressions") {
      test("infers type from unary expression") {
        val scope = createMockScope()
        val unaryExpr = createUnaryExpr("!", createBoolLiteralExpr(true))
        val property = createMockProperty("testProp", None, Some(unaryExpr))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        // Unary expressions get the default type (string | number)
        assert(result.tpe.get.isInstanceOf[TsTypeUnion])
        assertHasComments(result.tpe.get)
      }

      test("infers type from binary operation - addition") {
        val scope = createMockScope()
        val binaryExpr = createBinaryOpExpr(createNumLiteralExpr("5"), "+", createNumLiteralExpr("3"))
        val property = createMockProperty("testProp", None, Some(binaryExpr))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        // Should compute 5 + 3 = 8 as literal type, then widen to number
        assert(result.tpe.get == TsTypeRef.number)
        assertHasComments(result.tpe.get)
      }

      test("infers type from binary operation - multiplication") {
        val scope = createMockScope()
        val binaryExpr = createBinaryOpExpr(createNumLiteralExpr("4"), "*", createNumLiteralExpr("2"))
        val property = createMockProperty("testProp", None, Some(binaryExpr))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        // Should compute 4 * 2 = 8 as literal type, then widen to number
        assert(result.tpe.get == TsTypeRef.number)
        assertHasComments(result.tpe.get)
      }

      test("infers type from binary operation - bit shift") {
        val scope = createMockScope()
        val binaryExpr = createBinaryOpExpr(createNumLiteralExpr("8"), "<<", createNumLiteralExpr("2"))
        val property = createMockProperty("testProp", None, Some(binaryExpr))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        // Should compute 8 << 2 = 32 as literal type, then widen to number
        assert(result.tpe.get == TsTypeRef.number)
        assertHasComments(result.tpe.get)
      }

      test("infers type from nested expressions") {
        val scope = createMockScope()
        val innerExpr = createBinaryOpExpr(createNumLiteralExpr("2"), "+", createNumLiteralExpr("3"))
        val outerExpr = createUnaryExpr("-", innerExpr)
        val property = createMockProperty("testProp", None, Some(outerExpr))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        assert(result.tpe.get == TsTypeRef.number)
        assertHasComments(result.tpe.get)
      }
    }

    test("InferTypeFromExpr - Edge Cases") {
      test("leaves properties without expressions unchanged") {
        val scope = createMockScope()
        val property = createMockProperty("testProp", None, None)
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result == property) // Should be unchanged
        assert(result.tpe.isEmpty)
        assert(result.expr.isEmpty)
      }

      test("leaves variables without expressions unchanged") {
        val scope = createMockScope()
        val variable = createMockVar("testVar", None, None)
        
        val result = InferTypeFromExpr.enterTsDeclVar(scope)(variable)
        
        assert(result == variable) // Should be unchanged
        assert(result.tpe.isEmpty)
        assert(result.expr.isEmpty)
      }

      test("handles complex type inference") {
        val scope = createMockScope()
        val complexExpr = createCallExpr(
          createRefExpr("complexFunction"),
          IArray(createLiteralExpr("arg1"), createNumLiteralExpr("42"))
        )
        val property = createMockProperty("testProp", None, Some(complexExpr))
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        // Complex call expressions get the default type (string | number)
        assert(result.tpe.get.isInstanceOf[TsTypeUnion])
        assertHasComments(result.tpe.get)
      }

      test("preserves property metadata") {
        val scope = createMockScope()
        val originalComments = Comments(Comment("Property comment"))
        val property = TsMemberProperty(
          comments = originalComments,
          level = TsProtectionLevel.Private,
          name = createSimpleIdent("testProp"),
          tpe = None,
          expr = Some(createLiteralExpr("value")),
          isStatic = true,
          isReadOnly = true
        )
        
        val result = InferTypeFromExpr.enterTsMemberProperty(scope)(property)
        
        // Should preserve all metadata except add type and remove expression
        assert(result.comments == originalComments)
        assert(result.level == TsProtectionLevel.Private)
        assert(result.isStatic)
        assert(result.isReadOnly)
        assert(result.tpe.isDefined)
        assert(result.expr.isEmpty)
        assert(result.tpe.get == TsTypeRef.string)
      }
    }

    test("InferTypeFromExpr - Integration Scenarios") {
      test("handles mixed property and variable inference") {
        val scope = createMockScope()
        
        val property1 = createMockProperty("prop1", None, Some(createLiteralExpr("string")))
        val property2 = createMockProperty("prop2", None, Some(createNumLiteralExpr("123")))
        val variable1 = createMockVar("var1", None, Some(createBoolLiteralExpr(true)))
        val variable2 = createMockVar("var2", None, Some(createRefExpr("reference")))
        
        val resultProp1 = InferTypeFromExpr.enterTsMemberProperty(scope)(property1)
        val resultProp2 = InferTypeFromExpr.enterTsMemberProperty(scope)(property2)
        val resultVar1 = InferTypeFromExpr.enterTsDeclVar(scope)(variable1)
        val resultVar2 = InferTypeFromExpr.enterTsDeclVar(scope)(variable2)
        
        // All should have inferred types and no expressions
        assert(resultProp1.tpe.isDefined && resultProp1.expr.isEmpty)
        assert(resultProp2.tpe.isDefined && resultProp2.expr.isEmpty)
        assert(resultVar1.tpe.isDefined && resultVar1.expr.isEmpty)
        assert(resultVar2.tpe.isDefined && resultVar2.expr.isEmpty)
        
        // Check specific types
        assert(resultProp1.tpe.get == TsTypeRef.string)
        assert(resultProp2.tpe.get == TsTypeRef.number)
        assert(resultVar1.tpe.get == TsTypeRef.boolean)
        assert(resultVar2.tpe.get.isInstanceOf[TsTypeUnion]) // Default type for references
      }
    }
  }
}