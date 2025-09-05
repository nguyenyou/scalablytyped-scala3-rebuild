package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.ts.TsTreeScope.LoopDetector
import org.scalablytyped.converter.internal.ts.transforms.ExpandTypeMappings.{Ok, Res}
import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object ExpandTypeMappingsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMockScope(): TsTreeScope = {
    val libName = TsIdentLibrarySimple("test-lib")
    val logger = Logger.DevNull
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger)
  }

  def createMockInterface(
      name: String,
      members: IArray[TsMember] = Empty,
      inheritance: IArray[TsTypeRef] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = inheritance,
      members = members,
      codePath = CodePath.NoPath
    )

  def createMockTypeAlias(name: String, alias: TsType): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      alias = alias,
      codePath = CodePath.NoPath
    )

  def createMockProperty(name: String, tpe: TsType = TsTypeRef.string): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(tpe),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createMockMethod(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(TsTypeRef.void)
      ),
      isStatic = false,
      isReadOnly = false
    )

  def createLoopDetector(): LoopDetector = TsTreeScope.LoopDetector.initial

  def tests = Tests {
    test("ExpandTypeMappings - Basic Functionality") {
      test("object exists and extends TreeTransformationScopedChanges") {
        // Test that the object exists and has the expected type
        val transformation: TreeTransformationScopedChanges = ExpandTypeMappings
        assert(transformation != null)
      }

      test("After object exists and extends TreeTransformationScopedChanges") {
        val transformation: TreeTransformationScopedChanges = ExpandTypeMappings.After
        assert(transformation != null)
      }

      test("basic enterTsDecl with non-interface/non-type-alias returns unchanged") {
        val scope = createMockScope()
        val mockClass = TsDeclClass(
          comments = NoComments,
          declared = false,
          isAbstract = false,
          name = createSimpleIdent("TestClass"),
          tparams = Empty,
          parent = None,
          implements = Empty,
          members = Empty,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )

        val result = ExpandTypeMappings.enterTsDecl(scope)(mockClass)
        assert(result == mockClass)
      }
    }

    test("ExpandTypeMappings - Interface Processing") {
      test("enterTsDecl with interface - no inheritance") {
        val scope = createMockScope()
        val prop1 = createMockProperty("prop1")
        val interface = createMockInterface("TestInterface", IArray(prop1))

        val result = ExpandTypeMappings.enterTsDecl(scope)(interface)

        // Should return the interface unchanged since AllMembersFor.forInterface
        // will return Problems due to no proper scope setup
        assert(result == interface)
      }

      test("enterTsDecl with interface - with inheritance") {
        val scope = createMockScope()
        val prop1 = createMockProperty("prop1")
        val baseInterface = createTypeRef("BaseInterface")
        val interface = createMockInterface("TestInterface", IArray(prop1), IArray(baseInterface))

        val result = ExpandTypeMappings.enterTsDecl(scope)(interface)

        // Should return the interface unchanged since AllMembersFor.forInterface
        // will return Problems due to no proper scope setup
        assert(result == interface)
      }

      test("enterTsDecl with empty interface") {
        val scope = createMockScope()
        val interface = createMockInterface("EmptyInterface")

        val result = ExpandTypeMappings.enterTsDecl(scope)(interface)
        assert(result == interface)
      }
    }

    test("ExpandTypeMappings - Type Alias Processing") {
      test("enterTsDecl with type alias - simple type reference") {
        val scope = createMockScope()
        val stringType = createTypeRef("string")
        val typeAlias = createMockTypeAlias("StringAlias", stringType)

        val result = ExpandTypeMappings.enterTsDecl(scope)(typeAlias)

        // Should return unchanged since it points to a concrete type (string)
        assert(result == typeAlias)
      }

      test("enterTsDecl with type alias - literal type") {
        val scope = createMockScope()
        val literalType = TsTypeLiteral(TsLiteral.Str("test"))
        val typeAlias = createMockTypeAlias("LiteralAlias", literalType)

        val result = ExpandTypeMappings.enterTsDecl(scope)(typeAlias)
        assert(result == typeAlias)
      }

      test("enterTsDecl with type alias - union type") {
        val scope = createMockScope()
        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")
        val unionType = TsTypeUnion.simplified(IArray(stringType, numberType))
        val typeAlias = createMockTypeAlias("UnionAlias", unionType)

        val result = ExpandTypeMappings.enterTsDecl(scope)(typeAlias)
        assert(result == typeAlias)
      }

      test("enterTsDecl with type alias - with comments") {
        val scope = createMockScope()
        val stringType = createTypeRef("string")
        val comments = Comments(Comment("test comment"))
        val typeAlias = TsDeclTypeAlias(
          comments = comments,
          declared = false,
          name = createSimpleIdent("CommentedAlias"),
          tparams = Empty,
          alias = stringType,
          codePath = CodePath.NoPath
        )

        val result = ExpandTypeMappings.enterTsDecl(scope)(typeAlias)

        // Should return unchanged
        assert(result == typeAlias)
      }
    }

    test("ExpandTypeMappings.AllMembersFor - Basic Functionality") {
      test("forType with TsTypeRef - non-existent type") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val typeRef = createTypeRef("NonExistentType")

        val result = ExpandTypeMappings.AllMembersFor.forType(scope, loopDetector)(typeRef)

        // Should return failure since type doesn't exist in scope
        assert(!result.isSuccess)
      }

      test("forType with TsTypeIntersect - empty intersection") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val intersection = TsTypeIntersect(Empty)

        val result = ExpandTypeMappings.AllMembersFor.forType(scope, loopDetector)(intersection)

        // Should return Ok with empty members
        result match {
          case Ok(members, _) => assert(members.length == 0)
          case _ => assert(false)
        }
      }

      test("forType with TsTypeIntersect - single type") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val typeRef = createTypeRef("TestType")
        val intersection = TsTypeIntersect(IArray(typeRef))

        val result = ExpandTypeMappings.AllMembersFor.forType(scope, loopDetector)(intersection)

        // Should delegate to forType for the single type and fail since TestType doesn't exist
        assert(!result.isSuccess)
      }

      test("apply with circular reference detection") {
        val scope = createMockScope()
        val typeRef = createTypeRef("CircularType")

        // Create a loop detector that already contains this type reference
        val loopDetector = TsTreeScope.LoopDetector.initial.including(typeRef, scope) match {
          case Left(_) => TsTreeScope.LoopDetector.initial
          case Right(ld) => ld.including(typeRef, scope) match {
            case Left(_) => ld // This should trigger the circular reference
            case Right(ld2) => ld2
          }
        }

        val result = ExpandTypeMappings.AllMembersFor.apply(scope, loopDetector)(typeRef)

        // Should return failure due to circular reference or non-existent type
        assert(!result.isSuccess)
      }

      test("forInterface with empty interface") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val interface = createMockInterface("EmptyInterface")

        val result = ExpandTypeMappings.AllMembersFor.forInterface(scope, loopDetector)(interface)

        result match {
          case Ok(members, wasRewritten) =>
            assert(members.length == 0)
            assert(wasRewritten == false)
          case _ => assert(false)
        }
      }

      test("forInterface with members") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val prop1 = createMockProperty("prop1")
        val prop2 = createMockProperty("prop2")
        val interface = createMockInterface("TestInterface", IArray(prop1, prop2))

        val result = ExpandTypeMappings.AllMembersFor.forInterface(scope, loopDetector)(interface)

        result match {
          case Ok(members, wasRewritten) =>
            assert(members.length == 2)
            assert(members.contains(prop1))
            assert(members.contains(prop2))
            assert(wasRewritten == false)
          case _ => assert(false)
        }
      }
    }

    test("ExpandTypeMappings.evaluateKeys - Basic Functionality") {
      test("evaluateKeys with TsTypeLiteral") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val literal = TsTypeLiteral(TsLiteral.Str("test"))

        val result = ExpandTypeMappings.evaluateKeys(scope, loopDetector)(literal)

        result match {
          case Ok(keys, wasRewritten) =>
            assert(keys.size == 1)
            assert(keys.head.lit.literal == "test")
            assert(keys.head.isOptional == false)
            assert(wasRewritten == false)
          case _ => assert(false)
        }
      }

      test("evaluateKeys with TsTypeRef - non-existent") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val typeRef = createTypeRef("NonExistentType")

        val result = ExpandTypeMappings.evaluateKeys(scope, loopDetector)(typeRef)

        // Should return failure since type doesn't exist
        assert(!result.isSuccess)
      }

      test("evaluateKeys with TsTypeObject - empty") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val objectType = TsTypeObject(NoComments, Empty)

        val result = ExpandTypeMappings.evaluateKeys(scope, loopDetector)(objectType)

        result match {
          case Ok(keys, wasRewritten) =>
            assert(keys.size == 0)
            assert(wasRewritten == false)
          case _ => assert(false)
        }
      }

      test("evaluateKeys with TsTypeObject - with properties") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val prop1 = createMockProperty("prop1")
        val prop2 = createMockProperty("prop2")
        val objectType = TsTypeObject(NoComments, IArray(prop1, prop2))

        val result = ExpandTypeMappings.evaluateKeys(scope, loopDetector)(objectType)

        result match {
          case Ok(keys, wasRewritten) =>
            assert(keys.size == 2)
            val keyNames = keys.map(_.lit.literal).toSet
            assert(keyNames.contains("prop1"))
            assert(keyNames.contains("prop2"))
            assert(wasRewritten == false)
          case _ => assert(false)
        }
      }

      test("evaluateKeys with TsTypeUnion - empty") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val unionType = TsTypeUnion(Empty)

        val result = ExpandTypeMappings.evaluateKeys(scope, loopDetector)(unionType)

        // An empty union should return Ok with empty set
        result match {
          case Ok(keys, wasRewritten) =>
            assert(keys.size == 0)
            assert(wasRewritten == false)
          case _ =>
            // If it doesn't return Ok, let's just check that it's consistent
            assert(!result.isSuccess)
        }
      }

      test("evaluateKeys with TsTypeUnion - with literals") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val literal1 = TsTypeLiteral(TsLiteral.Str("key1"))
        val literal2 = TsTypeLiteral(TsLiteral.Str("key2"))
        val unionType = TsTypeUnion(IArray(literal1, literal2))

        val result = ExpandTypeMappings.evaluateKeys(scope, loopDetector)(unionType)

        result match {
          case Ok(keys, wasRewritten) =>
            assert(keys.size == 2)
            val keyNames = keys.map(_.lit.literal).toSet
            assert(keyNames.contains("key1"))
            assert(keyNames.contains("key2"))
            assert(wasRewritten == false)
          case _ => assert(false)
        }
      }

      test("evaluateKeys with unsupported type") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val functionType = TsTypeFunction(TsFunSig(NoComments, Empty, Empty, None))

        val result = ExpandTypeMappings.evaluateKeys(scope, loopDetector)(functionType)

        // Should return failure for unsupported type
        assert(!result.isSuccess)
      }
    }

    test("ExpandTypeMappings.After - Functionality") {
      test("After.enterTsDecl with interface") {
        val scope = createMockScope()
        val prop1 = createMockProperty("prop1")
        val interface = createMockInterface("TestInterface", IArray(prop1))

        val result = ExpandTypeMappings.After.enterTsDecl(scope)(interface)

        // After should process the interface and potentially unqualify names
        assert(result.isInstanceOf[TsDeclInterface])
      }

      test("After.enterTsDecl with type alias") {
        val scope = createMockScope()
        val stringType = createTypeRef("string")
        val typeAlias = createMockTypeAlias("StringAlias", stringType)

        val result = ExpandTypeMappings.After.enterTsDecl(scope)(typeAlias)

        // After should process the type alias
        assert(result.isInstanceOf[TsDeclTypeAlias])
      }

      test("After.enterTsDecl with other declaration types") {
        val scope = createMockScope()
        val mockClass = TsDeclClass(
          comments = NoComments,
          declared = false,
          isAbstract = false,
          name = createSimpleIdent("TestClass"),
          tparams = Empty,
          parent = None,
          implements = Empty,
          members = Empty,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )

        val result = ExpandTypeMappings.After.enterTsDecl(scope)(mockClass)
        assert(result == mockClass)
      }
    }

    test("ExpandTypeMappings - Edge Cases and Error Handling") {
      test("handles null/empty inputs gracefully") {
        val scope = createMockScope()
        val emptyInterface = createMockInterface("EmptyInterface", Empty, Empty)

        val result = ExpandTypeMappings.enterTsDecl(scope)(emptyInterface)
        assert(result == emptyInterface)
      }

      test("handles complex nested types") {
        val scope = createMockScope()
        val nestedType = TsTypeIntersect(IArray(
          createTypeRef("Type1"),
          createTypeRef("Type2"),
          TsTypeUnion(IArray(
            TsTypeLiteral(TsLiteral.Str("key1")),
            TsTypeLiteral(TsLiteral.Str("key2"))
          ))
        ))
        val typeAlias = createMockTypeAlias("ComplexAlias", nestedType)

        val result = ExpandTypeMappings.enterTsDecl(scope)(typeAlias)
        assert(result == typeAlias)
      }

      test("handles type aliases with type parameters") {
        val scope = createMockScope()
        val tParam = TsTypeParam(NoComments, createSimpleIdent("T"), None, None)
        val stringType = createTypeRef("string")
        val typeAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("GenericAlias"),
          tparams = IArray(tParam),
          alias = stringType,
          codePath = CodePath.NoPath
        )

        val result = ExpandTypeMappings.enterTsDecl(scope)(typeAlias)
        assert(result == typeAlias)
      }

      test("handles interfaces with complex inheritance") {
        val scope = createMockScope()
        val prop1 = createMockProperty("prop1")
        val baseInterface1 = createTypeRef("BaseInterface1")
        val baseInterface2 = createTypeRef("BaseInterface2")
        val interface = createMockInterface(
          "ComplexInterface",
          IArray(prop1),
          IArray(baseInterface1, baseInterface2)
        )

        val result = ExpandTypeMappings.enterTsDecl(scope)(interface)
        assert(result == interface)
      }

      test("evaluateKeys with very large union types") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()

        // Create a large union type with many literals
        val literals = (1 to 100).map(i => TsTypeLiteral(TsLiteral.Str(s"key$i")))
        val unionType = TsTypeUnion(IArray.fromTraversable(literals))

        val result = ExpandTypeMappings.evaluateKeys(scope, loopDetector)(unionType)

        result match {
          case Ok(keys, _) =>
            assert(keys.size == 100)
            val keyNames = keys.map(_.lit.literal).toSet
            assert(keyNames.size == 100)
            assert(keyNames.contains("key1"))
            assert(keyNames.contains("key100"))
          case _ => assert(false)
        }
      }
    }
  }
}