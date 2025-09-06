package org.scalablytyped.converter.internal
package ts

import org.scalablytyped.converter.internal.ts.TsTreeScope.LoopDetector
import org.scalablytyped.converter.internal.ts.transforms.ExtractClasses.AnalyzedCtors
import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object AnalyzedCtorsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createTypeParam(
      name: String,
      upperBound: Option[TsType] = None,
      default: Option[TsType] = None
  ): TsTypeParam =
    TsTypeParam(NoComments, createSimpleIdent(name), upperBound, default)

  def createMockFunSig(
      tparams: IArray[TsTypeParam] = Empty,
      params: IArray[TsFunParam] = Empty,
      resultType: Option[TsType] = Some(TsTypeRef.any)
  ): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = tparams,
      params = params,
      resultType = resultType
    )

  def createMockCtor(
      tparams: IArray[TsTypeParam] = Empty,
      params: IArray[TsFunParam] = Empty,
      resultType: Option[TsType] = None
  ): TsMemberCtor =
    TsMemberCtor(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(NoComments, tparams, params, resultType)
    )

  def createMockInterface(
      name: String,
      tparams: IArray[TsTypeParam] = Empty,
      members: IArray[TsMember] = Empty,
      inheritance: IArray[TsTypeRef] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      inheritance = inheritance,
      members = members,
      codePath = CodePath.NoPath
    )

  def createMockClass(
      name: String,
      tparams: IArray[TsTypeParam] = Empty,
      members: IArray[TsMember] = Empty,
      parent: Option[TsTypeRef] = None,
      implements: IArray[TsTypeRef] = Empty
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      parent = parent,
      implements = implements,
      members = members,
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

  def createMockParam(name: String, tpe: TsType = TsTypeRef.string): TsFunParam =
    TsFunParam(
      comments = NoComments,
      name = createSimpleIdent(name),
      tpe = Some(tpe)
    )

  def tests = Tests {
    test("AnalyzedCtors case class") {
      test("constructor creates instance with correct fields") {
        val tparams    = IArray(createTypeParam("T"), createTypeParam("U"))
        val resultType = createTypeRef("TestClass", IArray(createTypeRef("string")))
        val ctors = IArray(
          createMockFunSig(Empty, IArray(createMockParam("x")), Some(resultType)),
          createMockFunSig(Empty, IArray(createMockParam("y"), createMockParam("z")), Some(resultType))
        )

        val analyzed = AnalyzedCtors(tparams, resultType, ctors)

        assert(analyzed.longestTParams == tparams)
        assert(analyzed.resultType == resultType)
        assert(analyzed.ctors == ctors)
        assert(analyzed.ctors.length == 2)
      }

      test("constructor handles empty type parameters") {
        val resultType = createTypeRef("SimpleClass")
        val ctors      = IArray(createMockFunSig())

        val analyzed = AnalyzedCtors(Empty, resultType, ctors)

        assert(analyzed.longestTParams.isEmpty)
        assert(analyzed.resultType == resultType)
        assert(analyzed.ctors.length == 1)
      }

      test("constructor handles empty constructors") {
        val tparams    = IArray(createTypeParam("T"))
        val resultType = createTypeRef("TestClass")

        val analyzed = AnalyzedCtors(tparams, resultType, Empty)

        assert(analyzed.longestTParams == tparams)
        assert(analyzed.resultType == resultType)
        assert(analyzed.ctors.isEmpty)
      }
    }

    test("AnalyzedCtors.from method") {
      test("returns None for primitive types") {
        val scope = createMockScope()
        val primitiveTypes = List(
          TsTypeRef.string,
          TsTypeRef.number,
          TsTypeRef.boolean,
          TsTypeRef.any,
          TsTypeRef.void,
          TsTypeRef.undefined,
          TsTypeRef.`null`
        )

        primitiveTypes.foreach { tpe =>
          val result = AnalyzedCtors.from(scope, tpe)
          assert(result.isEmpty)
        }
      }

      test("returns None for union types") {
        val scope     = createMockScope()
        val unionType = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))

        val result = AnalyzedCtors.from(scope, unionType)

        assert(result.isEmpty)
      }

      test("returns None for intersection types without constructors") {
        val scope            = createMockScope()
        val intersectionType = TsTypeIntersect(IArray(TsTypeRef.string, TsTypeRef.number))

        val result = AnalyzedCtors.from(scope, intersectionType)

        assert(result.isEmpty)
      }

      test("returns None for type with no constructors") {
        val interface = createMockInterface("TestInterface")
        val scope     = createMockScope(interface)
        val typeRef   = createTypeRef("TestInterface")

        val result = AnalyzedCtors.from(scope, typeRef)

        assert(result.isEmpty)
      }

      test("returns Some for interface with constructors") {
        val ctor1 = createMockCtor(Empty, IArray(createMockParam("x")), Some(createTypeRef("TestInterface")))
        val ctor2 = createMockCtor(
          Empty,
          IArray(createMockParam("y"), createMockParam("z")),
          Some(createTypeRef("TestInterface"))
        )
        val interface = createMockInterface("TestInterface", Empty, IArray(ctor1, ctor2))
        val scope     = createMockScope(interface)
        val typeRef   = createTypeRef("TestInterface")

        val result = AnalyzedCtors.from(scope, typeRef)

        assert(result.isDefined)
        val analyzed = result.get
        assert(analyzed.ctors.length == 2)
        assert(analyzed.resultType == createTypeRef("TestInterface"))
      }

      test("handles constructors with different type parameter counts") {
        val tparam1    = createTypeParam("T")
        val tparam2    = createTypeParam("U")
        val resultType = createTypeRef("TestInterface", IArray(createTypeRef("T"), createTypeRef("U")))

        val ctor1 = createMockCtor(Empty, Empty, Some(createTypeRef("TestInterface")))
        val ctor2 =
          createMockCtor(IArray(tparam1), Empty, Some(createTypeRef("TestInterface", IArray(createTypeRef("T")))))
        val ctor3 = createMockCtor(IArray(tparam1, tparam2), Empty, Some(resultType))

        val interface = createMockInterface("TestInterface", IArray(tparam1, tparam2), IArray(ctor1, ctor2, ctor3))
        val scope     = createMockScope(interface)
        val typeRef   = createTypeRef("TestInterface")

        val result = AnalyzedCtors.from(scope, typeRef)

        assert(result.isDefined)
        val analyzed = result.get
        // Should pick the constructor with the most type parameters
        assert(analyzed.longestTParams.length == 2)
        assert(analyzed.longestTParams.head.name.value == "T")
        assert(analyzed.longestTParams(1).name.value == "U")
      }

      test("filters out constructors with incompatible return types") {
        val ctor1     = createMockCtor(Empty, Empty, Some(createTypeRef("TestInterface")))
        val ctor2     = createMockCtor(Empty, Empty, Some(createTypeRef("OtherInterface"))) // Different return type
        val interface = createMockInterface("TestInterface", Empty, IArray(ctor1, ctor2))
        val scope     = createMockScope(interface)
        val typeRef   = createTypeRef("TestInterface")

        val result = AnalyzedCtors.from(scope, typeRef)

        assert(result.isDefined)
        val analyzed = result.get
        // Should only include the constructor with compatible return type
        assert(analyzed.ctors.length == 1)
        assert(analyzed.ctors.head.resultType.contains(createTypeRef("TestInterface")))
      }
    }

    test("AnalyzedCtors.findCtors method") {
      test("returns empty for primitive types") {
        val scope        = createMockScope()
        val loopDetector = LoopDetector.initial

        val primitiveTypes = List(
          TsTypeRef.string,
          TsTypeRef.number,
          TsTypeRef.boolean,
          TsTypeRef.any
        )

        primitiveTypes.foreach { tpe =>
          val result = AnalyzedCtors.findCtors(scope, loopDetector)(tpe)
          assert(result.isEmpty)
        }
      }

      test("returns constructors from interface") {
        val ctor         = createMockCtor()
        val interface    = createMockInterface("TestInterface", Empty, IArray(ctor))
        val scope        = createMockScope(interface)
        val loopDetector = LoopDetector.initial
        val typeRef      = createTypeRef("TestInterface")

        val result = AnalyzedCtors.findCtors(scope, loopDetector)(typeRef)

        assert(result.length == 1)
        assert(result.head.params == ctor.signature.params)
      }

      test("returns empty for class (classes don't store constructors like interfaces)") {
        val ctor         = createMockCtor()
        val clazz        = createMockClass("TestClass", Empty, IArray(ctor))
        val scope        = createMockScope(clazz)
        val loopDetector = LoopDetector.initial
        val typeRef      = createTypeRef("TestClass")

        val result = AnalyzedCtors.findCtors(scope, loopDetector)(typeRef)

        // Classes are not handled by findCtors - only interfaces are
        assert(result.isEmpty)
      }

      test("returns constructors from object type") {
        val ctor         = createMockCtor()
        val objectType   = TsTypeObject(NoComments, IArray(ctor))
        val scope        = createMockScope()
        val loopDetector = LoopDetector.initial

        val result = AnalyzedCtors.findCtors(scope, loopDetector)(objectType)

        assert(result.length == 1)
        assert(result.head.params == ctor.signature.params)
      }

      test("returns constructors from intersection type") {
        val ctor1            = createMockCtor(Empty, IArray(createMockParam("x")))
        val ctor2            = createMockCtor(Empty, IArray(createMockParam("y")))
        val obj1             = TsTypeObject(NoComments, IArray(ctor1))
        val obj2             = TsTypeObject(NoComments, IArray(ctor2))
        val intersectionType = TsTypeIntersect(IArray(obj1, obj2))
        val scope            = createMockScope()
        val loopDetector     = LoopDetector.initial

        val result = AnalyzedCtors.findCtors(scope, loopDetector)(intersectionType)

        // Intersection types flatten constructors, but since both have the same name ("constructor"),
        // only one is kept in the membersByName map
        assert(result.length == 1)
      }

      test("returns constructor from function type") {
        val sig             = createMockFunSig(Empty, IArray(createMockParam("x")), Some(createTypeRef("Result")))
        val functionType    = TsTypeFunction(sig)
        val constructorType = TsTypeConstructor(false, functionType)
        val scope           = createMockScope()
        val loopDetector    = LoopDetector.initial

        val result = AnalyzedCtors.findCtors(scope, loopDetector)(constructorType)

        assert(result.length == 1)
        assert(result.head == sig)
      }

      test("handles loop detection") {
        // Create a self-referencing type to test loop detection
        val interface    = createMockInterface("SelfRef", Empty, Empty, IArray(createTypeRef("SelfRef")))
        val scope        = createMockScope(interface)
        val loopDetector = LoopDetector.initial
        val typeRef      = createTypeRef("SelfRef")

        val result = AnalyzedCtors.findCtors(scope, loopDetector)(typeRef)

        // Should handle the loop gracefully and return empty
        assert(result.isEmpty)
      }

      test("returns empty for interface not in scope") {
        val scope        = createMockScope()
        val loopDetector = LoopDetector.initial
        val typeRef      = createTypeRef("NonExistentInterface")

        val result = AnalyzedCtors.findCtors(scope, loopDetector)(typeRef)

        // Should return empty when interface is not in scope
        assert(result.isEmpty)
      }
    }

    test("AnalyzedCtors.isSimpleType method") {
      test("returns false for primitive types") {
        val scope = createMockScope()
        val primitiveTypes = List(
          TsTypeRef.string,
          TsTypeRef.number,
          TsTypeRef.boolean,
          TsTypeRef.any
        )

        primitiveTypes.foreach { tpe =>
          val result = AnalyzedCtors.isSimpleType(tpe, scope)
          assert(!result)
        }
      }

      test("returns false for non-existent types") {
        val scope          = createMockScope()
        val unknownTypeRef = createTypeRef("NonExistentType")

        val result = AnalyzedCtors.isSimpleType(unknownTypeRef, scope)

        assert(!result)
      }

      test("returns false for types with type parameters") {
        val scope   = createMockScope()
        val typeRef = createTypeRef("GenericType", IArray(TsTypeRef.string))

        val result = AnalyzedCtors.isSimpleType(typeRef, scope)

        assert(!result)
      }

      test("returns true for class types") {
        val clazz   = createMockClass("TestClass")
        val scope   = createMockScope(clazz)
        val typeRef = createTypeRef("TestClass")

        val result = AnalyzedCtors.isSimpleType(typeRef, scope)

        assert(result)
      }

      test("returns true for interface types") {
        val interface = createMockInterface("TestInterface")
        val scope     = createMockScope(interface)
        val typeRef   = createTypeRef("TestInterface")

        val result = AnalyzedCtors.isSimpleType(typeRef, scope)

        assert(result)
      }

      test("returns false for abstract types") {
        val tparam       = createTypeParam("T")
        val interface    = createMockInterface("TestInterface", IArray(tparam))
        val scope        = createMockScope(interface)
        val typeParamRef = createTypeRef("T")

        val result = AnalyzedCtors.isSimpleType(typeParamRef, scope)

        assert(!result)
      }

      test("returns false for unknown types") {
        val scope          = createMockScope()
        val unknownTypeRef = createTypeRef("UnknownType")

        val result = AnalyzedCtors.isSimpleType(unknownTypeRef, scope)

        assert(!result)
      }

      test("follows type aliases") {
        val targetInterface = createMockInterface("TargetInterface")
        val alias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("AliasType"),
          tparams = Empty,
          alias = createTypeRef("TargetInterface"),
          codePath = CodePath.NoPath
        )
        val scope    = createMockScope(targetInterface, alias)
        val aliasRef = createTypeRef("AliasType")

        val result = AnalyzedCtors.isSimpleType(aliasRef, scope)

        assert(result)
      }

      test("handles nested type aliases") {
        val targetInterface = createMockInterface("TargetInterface")
        val alias1 = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("Alias1"),
          tparams = Empty,
          alias = createTypeRef("TargetInterface"),
          codePath = CodePath.NoPath
        )
        val alias2 = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("Alias2"),
          tparams = Empty,
          alias = createTypeRef("Alias1"),
          codePath = CodePath.NoPath
        )
        val scope     = createMockScope(targetInterface, alias1, alias2)
        val alias2Ref = createTypeRef("Alias2")

        val result = AnalyzedCtors.isSimpleType(alias2Ref, scope)

        assert(result)
      }

    }

    test("AnalyzedCtors edge cases and error handling") {
      test("handles empty constructor list gracefully") {
        val interface = createMockInterface("EmptyInterface")
        val scope     = createMockScope(interface)
        val typeRef   = createTypeRef("EmptyInterface")

        val result = AnalyzedCtors.from(scope, typeRef)

        assert(result.isEmpty)
      }

      test("handles constructors without return types") {
        val ctorWithoutReturn = createMockCtor(Empty, IArray(createMockParam("x")), None)
        val interface         = createMockInterface("TestInterface", Empty, IArray(ctorWithoutReturn))
        val scope             = createMockScope(interface)
        val typeRef           = createTypeRef("TestInterface")

        val result = AnalyzedCtors.from(scope, typeRef)

        assert(result.isEmpty)
      }

      test("handles constructors with non-TypeRef return types") {
        val ctorWithPrimitiveReturn = createMockCtor(Empty, IArray(createMockParam("x")), Some(TsTypeRef.string))
        val interface               = createMockInterface("TestInterface", Empty, IArray(ctorWithPrimitiveReturn))
        val scope                   = createMockScope(interface)
        val typeRef                 = createTypeRef("TestInterface")

        val result = AnalyzedCtors.from(scope, typeRef)

        // Should filter out constructors with non-simple return types
        assert(result.isEmpty)
      }

      test("handles complex type parameter scenarios") {
        val tparam1    = createTypeParam("T", Some(TsTypeRef.string))
        val tparam2    = createTypeParam("U", None, Some(TsTypeRef.number))
        val resultType = createTypeRef("TestInterface", IArray(createTypeRef("T"), createTypeRef("U")))

        val ctor      = createMockCtor(IArray(tparam1, tparam2), IArray(createMockParam("value")), Some(resultType))
        val interface = createMockInterface("TestInterface", IArray(tparam1, tparam2), IArray(ctor))
        val scope     = createMockScope(interface)
        val typeRef   = createTypeRef("TestInterface")

        val result = AnalyzedCtors.from(scope, typeRef)

        assert(result.isDefined)
        val analyzed = result.get
        assert(analyzed.longestTParams.length == 2)
        assert(analyzed.longestTParams.head.upperBound.contains(TsTypeRef.string))
        assert(analyzed.longestTParams(1).default.contains(TsTypeRef.number))
      }
    }
  }
}
