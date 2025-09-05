package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object InferEnumTypesTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createEnumMember(name: String, expr: Option[TsExpr] = None): TsEnumMember =
    TsEnumMember(
      comments = NoComments,
      name = createSimpleIdent(name),
      expr = expr
    )

  def createLiteralExpr(value: String): TsExpr = TsExpr.Literal(TsLiteral.Str(value))

  def createNumLiteralExpr(value: String): TsExpr = TsExpr.Literal(TsLiteral.Num(value))

  def createRefExpr(name: String): TsExpr = TsExpr.Ref(TsQIdent.of(createSimpleIdent(name)))

  def createMockEnum(
    name: String,
    members: IArray[TsEnumMember],
    isConst: Boolean = false
  ): TsDeclEnum =
    TsDeclEnum(
      comments = NoComments,
      declared = false,
      isConst = isConst,
      name = createSimpleIdent(name),
      members = members,
      isValue = true,
      exportedFrom = None,
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

  def tests = Tests {
    test("InferEnumTypes - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(InferEnumTypes.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsDeclEnum method") {
        val scope = createMockScope()
        val testEnum = createMockEnum("TestEnum", Empty)
        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)
        assert(result != null)
        assert(result.isInstanceOf[TsDeclEnum])
      }

      test("leaves enums with all explicit values unchanged") {
        val scope = createMockScope()
        val member1 = createEnumMember("A", Some(createLiteralExpr("valueA")))
        val member2 = createEnumMember("B", Some(createLiteralExpr("valueB")))
        val testEnum = createMockEnum("TestEnum", IArray(member1, member2))

        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)

        assert(result.members.length == 2)
        assert(result.members.forall(_.expr.isDefined))
        assert(result.members(0).expr.get == createLiteralExpr("valueA"))
        assert(result.members(1).expr.get == createLiteralExpr("valueB"))
      }
    }

    test("InferEnumTypes - Member Initialization") {
      test("initializes members without expressions") {
        val scope = createMockScope()
        val member1 = createEnumMember("A") // No expression
        val member2 = createEnumMember("B") // No expression
        val testEnum = createMockEnum("TestEnum", IArray(member1, member2))

        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)

        assert(result.members.length == 2)
        assert(result.members.forall(_.expr.isDefined))

        // First member should get 0
        val firstExpr = result.members(0).expr.get
        assert(firstExpr == createNumLiteralExpr("0"))

        // Second member should get 1
        val secondExpr = result.members(1).expr.get
        assert(secondExpr == createNumLiteralExpr("1"))
      }

      test("handles mixed explicit and implicit values") {
        val scope = createMockScope()
        val member1 = createEnumMember("A") // No expression - should get 0
        val member2 = createEnumMember("B", Some(createLiteralExpr("explicit"))) // Explicit value
        val member3 = createEnumMember("C") // No expression - should get 1
        val testEnum = createMockEnum("TestEnum", IArray(member1, member2, member3))

        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)

        assert(result.members.length == 3)
        assert(result.members.forall(_.expr.isDefined))

        // First member should get 0
        assert(result.members(0).expr.get == createNumLiteralExpr("0"))

        // Second member should keep explicit value
        assert(result.members(1).expr.get == createLiteralExpr("explicit"))

        // Third member should get 1 (continues from last unspecified index)
        assert(result.members(2).expr.get == createNumLiteralExpr("1"))
      }

      test("handles sequential initialization") {
        val scope = createMockScope()
        val member1 = createEnumMember("A") // Should get 0
        val member2 = createEnumMember("B") // Should get 1
        val member3 = createEnumMember("C") // Should get 2
        val member4 = createEnumMember("D") // Should get 3
        val testEnum = createMockEnum("TestEnum", IArray(member1, member2, member3, member4))

        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)

        assert(result.members.length == 4)
        assert(result.members(0).expr.get == createNumLiteralExpr("0"))
        assert(result.members(1).expr.get == createNumLiteralExpr("1"))
        assert(result.members(2).expr.get == createNumLiteralExpr("2"))
        assert(result.members(3).expr.get == createNumLiteralExpr("3"))
      }
    }

    test("InferEnumTypes - Reference Replacement") {
      test("replaces references to other enum members") {
        val scope = createMockScope()
        val member1 = createEnumMember("A", Some(createLiteralExpr("valueA")))
        val member2 = createEnumMember("B", Some(createRefExpr("A"))) // References A
        val testEnum = createMockEnum("TestEnum", IArray(member1, member2))

        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)

        assert(result.members.length == 2)

        // First member should keep its value
        assert(result.members(0).expr.get == createLiteralExpr("valueA"))

        // Second member should have reference replaced with A's value
        assert(result.members(1).expr.get == createLiteralExpr("valueA"))
      }

      test("handles multiple references") {
        val scope = createMockScope()
        val member1 = createEnumMember("A", Some(createLiteralExpr("valueA")))
        val member2 = createEnumMember("B", Some(createRefExpr("A"))) // References A
        val member3 = createEnumMember("C", Some(createRefExpr("A"))) // Also references A
        val testEnum = createMockEnum("TestEnum", IArray(member1, member2, member3))

        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)

        assert(result.members.length == 3)

        // All members should have the same resolved value
        assert(result.members(0).expr.get == createLiteralExpr("valueA"))
        assert(result.members(1).expr.get == createLiteralExpr("valueA"))
        assert(result.members(2).expr.get == createLiteralExpr("valueA"))
      }

      test("handles chained references") {
        val scope = createMockScope()
        val member1 = createEnumMember("A", Some(createLiteralExpr("valueA")))
        val member2 = createEnumMember("B", Some(createRefExpr("A"))) // References A
        val member3 = createEnumMember("C", Some(createRefExpr("B"))) // References B
        val testEnum = createMockEnum("TestEnum", IArray(member1, member2, member3))

        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)

        assert(result.members.length == 3)

        // First member keeps its value
        assert(result.members(0).expr.get == createLiteralExpr("valueA"))

        // Second member gets A's value
        assert(result.members(1).expr.get == createLiteralExpr("valueA"))

        // Third member references B, and since B references A, C gets A's reference
        // The implementation replaces B's reference with A's value, so C ends up referencing A
        assert(result.members(2).expr.get == createRefExpr("A"))
      }

      test("handles references to initialized members") {
        val scope = createMockScope()
        val member1 = createEnumMember("A") // Will get 0
        val member2 = createEnumMember("B", Some(createRefExpr("A"))) // References A
        val testEnum = createMockEnum("TestEnum", IArray(member1, member2))

        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)

        assert(result.members.length == 2)

        // First member gets initialized to 0
        assert(result.members(0).expr.get == createNumLiteralExpr("0"))

        // Second member gets A's resolved value (0)
        assert(result.members(1).expr.get == createNumLiteralExpr("0"))
      }
    }

    test("InferEnumTypes - Edge Cases") {
      test("handles empty enum") {
        val scope = createMockScope()
        val testEnum = createMockEnum("EmptyEnum", Empty)
        
        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)
        
        assert(result.members.isEmpty)
        assert(result.name.value == "EmptyEnum")
      }

      test("handles single member enum") {
        val scope = createMockScope()
        val member = createEnumMember("ONLY")
        val testEnum = createMockEnum("SingleEnum", IArray(member))
        
        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)
        
        assert(result.members.length == 1)
        assert(result.members(0).expr.get == createNumLiteralExpr("0"))
      }

      test("handles non-existent references") {
        val scope = createMockScope()
        val member1 = createEnumMember("A", Some(createLiteralExpr("valueA")))
        val member2 = createEnumMember("B", Some(createRefExpr("NonExistent"))) // References non-existent member
        val testEnum = createMockEnum("TestEnum", IArray(member1, member2))
        
        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)
        
        assert(result.members.length == 2)
        
        // First member should keep its value
        assert(result.members(0).expr.get == createLiteralExpr("valueA"))
        
        // Second member should keep the unresolved reference
        assert(result.members(1).expr.get == createRefExpr("NonExistent"))
      }

      test("preserves enum metadata") {
        val scope = createMockScope()
        val originalComments = Comments(Comment("Enum comment"))
        val member = createEnumMember("A")
        val testEnum = TsDeclEnum(
          comments = originalComments,
          declared = true,
          isConst = true,
          name = createSimpleIdent("TestEnum"),
          members = IArray(member),
          isValue = false,
          exportedFrom = Some(TsTypeRef(NoComments, TsQIdent.of(createSimpleIdent("module")), Empty)),
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )
        
        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)
        
        // Should preserve all metadata
        assert(result.comments == originalComments)
        assert(result.declared)
        assert(result.isConst)
        assert(!result.isValue)
        assert(result.exportedFrom.isDefined)
        assert(result.members.length == 1)
        assert(result.members(0).expr.get == createNumLiteralExpr("0"))
      }
    }

    test("InferEnumTypes - Integration Scenarios") {
      test("complex enum with mixed patterns") {
        val scope = createMockScope()
        val member1 = createEnumMember("FIRST") // Should get 0
        val member2 = createEnumMember("SECOND", Some(createLiteralExpr("explicit"))) // Explicit string
        val member3 = createEnumMember("THIRD") // Should get 1
        val member4 = createEnumMember("FOURTH", Some(createRefExpr("FIRST"))) // Reference to FIRST
        val member5 = createEnumMember("FIFTH", Some(createRefExpr("SECOND"))) // Reference to SECOND
        val testEnum = createMockEnum("ComplexEnum", IArray(member1, member2, member3, member4, member5))
        
        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)
        
        assert(result.members.length == 5)
        
        // FIRST gets 0
        assert(result.members(0).expr.get == createNumLiteralExpr("0"))
        
        // SECOND keeps explicit value
        assert(result.members(1).expr.get == createLiteralExpr("explicit"))
        
        // THIRD gets 1
        assert(result.members(2).expr.get == createNumLiteralExpr("1"))
        
        // FOURTH gets FIRST's value (0)
        assert(result.members(3).expr.get == createNumLiteralExpr("0"))
        
        // FIFTH gets SECOND's value (explicit)
        assert(result.members(4).expr.get == createLiteralExpr("explicit"))
      }

      test("handles const enum") {
        val scope = createMockScope()
        val member1 = createEnumMember("A")
        val member2 = createEnumMember("B", Some(createRefExpr("A")))
        val testEnum = createMockEnum("ConstEnum", IArray(member1, member2), isConst = true)
        
        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)
        
        assert(result.isConst)
        assert(result.members.length == 2)
        assert(result.members(0).expr.get == createNumLiteralExpr("0"))
        assert(result.members(1).expr.get == createNumLiteralExpr("0"))
      }

      test("preserves member comments") {
        val scope = createMockScope()
        val memberComments = Comments(Comment("Member comment"))
        val member1 = TsEnumMember(
          comments = memberComments,
          name = createSimpleIdent("A"),
          expr = None
        )
        val member2 = createEnumMember("B", Some(createRefExpr("A")))
        val testEnum = createMockEnum("TestEnum", IArray(member1, member2))
        
        val result = InferEnumTypes.enterTsDeclEnum(scope)(testEnum)
        
        assert(result.members.length == 2)
        
        // Should preserve member comments
        assert(result.members(0).comments == memberComments)
        assert(result.members(0).expr.get == createNumLiteralExpr("0"))
        assert(result.members(1).expr.get == createNumLiteralExpr("0"))
      }
    }
  }
}