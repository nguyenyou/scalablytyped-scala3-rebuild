package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object SplitMethodsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createUnionType(types: TsType*): TsTypeUnion =
    TsTypeUnion(IArray.fromTraversable(types))

  def createLiteralType(value: String): TsTypeLiteral =
    TsTypeLiteral(TsLiteral.Str(value))

  def createFunParam(
    name: String,
    tpe: Option[TsType] = None,
    isOptional: Boolean = false
  ): TsFunParam =
    TsFunParam(
      comments = NoComments,
      name = createSimpleIdent(name),
      tpe = tpe
    )

  def createFunSig(
    params: IArray[TsFunParam] = Empty,
    ret: Option[TsType] = None
  ): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = Empty,
      params = params,
      resultType = ret
    )

  def createMockClass(
    name: String,
    members: IArray[TsMember] = Empty
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      parent = None,
      implements = Empty,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    )

  def createMockInterface(
    name: String,
    members: IArray[TsMember] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = Empty,
      members = members,
      codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    )

  def createMockNamespace(
    name: String,
    members: IArray[TsContainerOrDecl] = Empty
  ): TsDeclNamespace =
    TsDeclNamespace(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    )

  def createMockScope(
    members: IArray[TsContainerOrDecl] = Empty,
    logger: Logger[Unit] = Logger.DevNull
  ): TsTreeScope = {
    val libName = TsIdentLibrary("test-lib")
    val parsedFile = TsParsedFile(NoComments, Empty, members, CodePath.NoPath)
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger) / parsedFile
  }

  def tests = Tests {
    test("SplitMethods - Basic Functionality") {
      test("extends TransformMembers and TransformClassMembers") {
        assert(SplitMethods.isInstanceOf[TransformMembers])
        assert(SplitMethods.isInstanceOf[TransformClassMembers])
      }

      test("has newClassMembers method") {
        val scope = createMockScope()
        val clazz = createMockClass("TestClass")
        val result = SplitMethods.newClassMembers(scope, clazz)
        assert(result != null)
        assert(result.isInstanceOf[IArray[TsMember]])
      }

      test("has newMembers method") {
        val scope = createMockScope()
        val namespace = createMockNamespace("TestNamespace")
        val result = SplitMethods.newMembers(scope, namespace)
        assert(result != null)
        assert(result.isInstanceOf[IArray[TsContainerOrDecl]])
      }
    }

    test("SplitMethods - Constructor Splitting") {
      test("preserves constructor with no union types") {
        val scope = createMockScope()
        val param1 = createFunParam("x", Some(createTypeRef("string")))
        val param2 = createFunParam("y", Some(createTypeRef("number")))
        val sig = createFunSig(IArray(param1, param2))
        val ctor = TsMemberCtor(NoComments, TsProtectionLevel.Default, sig)
        val clazz = createMockClass("TestClass", IArray(ctor))
        
        val result = SplitMethods.newClassMembers(scope, clazz)
        
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberCtor])
      }

      test("splits constructor with union type parameters") {
        val scope = createMockScope()
        val unionType = createUnionType(createTypeRef("string"), createTypeRef("number"))
        val param1 = createFunParam("x", Some(unionType))
        val param2 = createFunParam("y", Some(createTypeRef("boolean")))
        val sig = createFunSig(IArray(param1, param2))
        val ctor = TsMemberCtor(NoComments, TsProtectionLevel.Default, sig)
        val clazz = createMockClass("TestClass", IArray(ctor))
        
        val result = SplitMethods.newClassMembers(scope, clazz)
        
        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsMemberCtor]))
      }

      test("handles constructor with literal union types") {
        val scope = createMockScope()
        val literalUnion = createUnionType(
          createLiteralType("option1"),
          createLiteralType("option2"),
          createTypeRef("string")
        )
        val param = createFunParam("mode", Some(literalUnion))
        val sig = createFunSig(IArray(param))
        val ctor = TsMemberCtor(NoComments, TsProtectionLevel.Default, sig)
        val clazz = createMockClass("TestClass", IArray(ctor))
        
        val result = SplitMethods.newClassMembers(scope, clazz)
        
        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsMemberCtor]))
      }

      test("preserves constructor with too many parameters") {
        val scope = createMockScope()
        val unionType = createUnionType(createTypeRef("string"), createTypeRef("number"))
        val params = (1 to 25).map(i => createFunParam(s"param$i", Some(unionType))).toArray
        val sig = createFunSig(IArray.fromTraversable(params))
        val ctor = TsMemberCtor(NoComments, TsProtectionLevel.Default, sig)
        val clazz = createMockClass("TestClass", IArray(ctor))
        
        val result = SplitMethods.newClassMembers(scope, clazz)
        
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberCtor])
      }
    }

    test("SplitMethods - Method Splitting") {
      test("preserves method with no union types") {
        val scope = createMockScope()
        val param1 = createFunParam("x", Some(createTypeRef("string")))
        val param2 = createFunParam("y", Some(createTypeRef("number")))
        val sig = createFunSig(IArray(param1, param2))
        val method = TsMemberFunction(
          NoComments,
          TsProtectionLevel.Default,
          createSimpleIdent("testMethod"),
          MethodType.Normal,
          sig,
          isStatic = false,
          isReadOnly = false
        )
        val clazz = createMockClass("TestClass", IArray(method))
        
        val result = SplitMethods.newClassMembers(scope, clazz)
        
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberFunction])
      }

      test("splits method with union type parameters") {
        val scope = createMockScope()
        val unionType = createUnionType(createTypeRef("string"), createTypeRef("number"))
        val param1 = createFunParam("x", Some(unionType))
        val param2 = createFunParam("y", Some(createTypeRef("boolean")))
        val sig = createFunSig(IArray(param1, param2))
        val method = TsMemberFunction(
          NoComments,
          TsProtectionLevel.Default,
          createSimpleIdent("testMethod"),
          MethodType.Normal,
          sig,
          isStatic = false,
          isReadOnly = false
        )
        val clazz = createMockClass("TestClass", IArray(method))
        
        val result = SplitMethods.newClassMembers(scope, clazz)
        
        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
      }

      test("preserves getter and setter methods") {
        val scope = createMockScope()
        val unionType = createUnionType(createTypeRef("string"), createTypeRef("number"))
        val param = createFunParam("value", Some(unionType))
        val sig = createFunSig(IArray(param))
        val getter = TsMemberFunction(
          NoComments,
          TsProtectionLevel.Default,
          createSimpleIdent("prop"),
          MethodType.Getter,
          sig,
          isStatic = false,
          isReadOnly = false
        )
        val setter = TsMemberFunction(
          NoComments,
          TsProtectionLevel.Default,
          createSimpleIdent("prop"),
          MethodType.Setter,
          sig,
          isStatic = false,
          isReadOnly = false
        )
        val clazz = createMockClass("TestClass", IArray(getter, setter))
        
        val result = SplitMethods.newClassMembers(scope, clazz)
        
        assert(result.length == 2)
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
      }
    }

    test("SplitMethods - Call Signature Splitting") {
      test("preserves call signature with no union types") {
        val scope = createMockScope()
        val param1 = createFunParam("x", Some(createTypeRef("string")))
        val param2 = createFunParam("y", Some(createTypeRef("number")))
        val sig = createFunSig(IArray(param1, param2))
        val call = TsMemberCall(NoComments, TsProtectionLevel.Default, sig)
        val interface = createMockInterface("TestInterface", IArray(call))
        
        val result = SplitMethods.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberCall])
      }

      test("splits call signature with union type parameters") {
        val scope = createMockScope()
        val unionType = createUnionType(createTypeRef("string"), createTypeRef("number"))
        val param1 = createFunParam("x", Some(unionType))
        val param2 = createFunParam("y", Some(createTypeRef("boolean")))
        val sig = createFunSig(IArray(param1, param2))
        val call = TsMemberCall(NoComments, TsProtectionLevel.Default, sig)
        val interface = createMockInterface("TestInterface", IArray(call))
        
        val result = SplitMethods.newClassMembers(scope, interface)
        
        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsMemberCall]))
      }
    }

    test("SplitMethods - Function Declaration Splitting") {
      test("preserves function with no union types") {
        val scope = createMockScope()
        val param1 = createFunParam("x", Some(createTypeRef("string")))
        val param2 = createFunParam("y", Some(createTypeRef("number")))
        val sig = createFunSig(IArray(param1, param2))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))
        
        val result = SplitMethods.newMembers(scope, namespace)
        
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclFunction])
      }

      test("splits function with union type parameters") {
        val scope = createMockScope()
        val unionType = createUnionType(createTypeRef("string"), createTypeRef("number"))
        val param1 = createFunParam("x", Some(unionType))
        val param2 = createFunParam("y", Some(createTypeRef("boolean")))
        val sig = createFunSig(IArray(param1, param2))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))
        
        val result = SplitMethods.newMembers(scope, namespace)
        
        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsDeclFunction]))
      }
    }

    test("SplitMethods - Repeated Parameters") {
      test("handles repeated parameters correctly") {
        val scope = createMockScope()
        val unionType = createUnionType(createTypeRef("string"), createTypeRef("number"))
        val normalParam = createFunParam("x", Some(unionType))
        val repeatedParam = createFunParam("args", Some(TsTypeRepeated(createTypeRef("any"))))
        val sig = createFunSig(IArray(normalParam, repeatedParam))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsDeclFunction]))
        // All generated functions should preserve the repeated parameter
        assert(result.forall { case func: TsDeclFunction =>
          func.signature.params.lastOption.exists(_.tpe.exists(_.isInstanceOf[TsTypeRepeated]))
        })
      }

      test("preserves repeated parameter without union types") {
        val scope = createMockScope()
        val normalParam = createFunParam("x", Some(createTypeRef("string")))
        val repeatedParam = createFunParam("args", Some(TsTypeRepeated(createTypeRef("any"))))
        val sig = createFunSig(IArray(normalParam, repeatedParam))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclFunction])
      }
    }

    test("SplitMethods - Complex Union Types") {
      test("handles large union types within limit") {
        val scope = createMockScope()
        val types = (1 to 10).map(i => createTypeRef(s"Type$i"))
        val unionType = createUnionType(types*)
        val param = createFunParam("x", Some(unionType))
        val sig = createFunSig(IArray(param))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length > 1)
        assert(result.length <= 10) // Should split into individual types
        assert(result.forall(_.isInstanceOf[TsDeclFunction]))
      }

      test("preserves union types that exceed MaxNum limit") {
        val scope = createMockScope()
        val types = (1 to 60).map(i => createTypeRef(s"Type$i"))
        val unionType = createUnionType(types*)
        val param = createFunParam("x", Some(unionType))
        val sig = createFunSig(IArray(param))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length == 1) // Should not split due to MaxNum limit
        assert(result.head.isInstanceOf[TsDeclFunction])
      }

      test("separates literal types from other types") {
        val scope = createMockScope()
        val unionType = createUnionType(
          createLiteralType("literal1"),
          createLiteralType("literal2"),
          createTypeRef("string"),
          createTypeRef("number")
        )
        val param = createFunParam("x", Some(unionType))
        val sig = createFunSig(IArray(param))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsDeclFunction]))
        // Should have separate overloads for string, number, and combined literals
      }
    }

    test("SplitMethods - Multiple Union Parameters") {
      test("handles multiple union parameters") {
        val scope = createMockScope()
        val unionType1 = createUnionType(createTypeRef("string"), createTypeRef("number"))
        val unionType2 = createUnionType(createTypeRef("boolean"), createTypeRef("object"))
        val param1 = createFunParam("x", Some(unionType1))
        val param2 = createFunParam("y", Some(unionType2))
        val sig = createFunSig(IArray(param1, param2))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length == 4) // 2 * 2 = 4 combinations
        assert(result.forall(_.isInstanceOf[TsDeclFunction]))
      }

      test("preserves when combination count exceeds MaxNum") {
        val scope = createMockScope()
        val types1 = (1 to 8).map(i => createTypeRef(s"Type1_$i"))
        val types2 = (1 to 8).map(i => createTypeRef(s"Type2_$i"))
        val unionType1 = createUnionType(types1*)
        val unionType2 = createUnionType(types2*)
        val param1 = createFunParam("x", Some(unionType1))
        val param2 = createFunParam("y", Some(unionType2))
        val sig = createFunSig(IArray(param1, param2))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length == 1) // Should not split due to 8*8=64 > MaxNum(50)
        assert(result.head.isInstanceOf[TsDeclFunction])
      }
    }

    test("SplitMethods - Optional Parameters") {
      test("drops trailing undefined parameters") {
        val scope = createMockScope()
        val unionType = createUnionType(createTypeRef("string"), TsTypeRef.undefined)
        val param1 = createFunParam("x", Some(createTypeRef("number")))
        val param2 = createFunParam("y", Some(unionType))
        val sig = createFunSig(IArray(param1, param2))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsDeclFunction]))
        // Some overloads should have fewer parameters due to trailing undefined removal
        val hasVariousParamCounts = result.exists(_.asInstanceOf[TsDeclFunction].signature.params.length == 1) &&
                                   result.exists(_.asInstanceOf[TsDeclFunction].signature.params.length == 2)
        assert(hasVariousParamCounts)
      }

      test("sorts overloads by parameter count") {
        val scope = createMockScope()
        val unionType = createUnionType(createTypeRef("string"), createTypeRef("number"))
        val param1 = createFunParam("x", Some(unionType))
        val param2 = createFunParam("y", Some(createTypeRef("boolean")))
        val sig = createFunSig(IArray(param1, param2))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsDeclFunction]))
        // Should be sorted by parameter count (check first few are in order)
        val firstParamCount = result.head.asInstanceOf[TsDeclFunction].signature.params.length
        val secondParamCount = result(1).asInstanceOf[TsDeclFunction].signature.params.length
        assert(firstParamCount <= secondParamCount)
      }
    }

    test("SplitMethods - Edge Cases") {
      test("handles empty parameter list") {
        val scope = createMockScope()
        val sig = createFunSig(Empty)
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclFunction])
      }

      test("handles parameters without types") {
        val scope = createMockScope()
        val param1 = createFunParam("x", None)
        val param2 = createFunParam("y", Some(createTypeRef("string")))
        val sig = createFunSig(IArray(param1, param2))
        val func = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          sig,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(func))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclFunction])
      }

      test("preserves non-function members") {
        val scope = createMockScope()
        val variable = TsDeclVar(
          NoComments,
          false,
          false,
          createSimpleIdent("testVar"),
          Some(createTypeRef("string")),
          None,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testVar"))
        )
        val namespace = createMockNamespace("TestNamespace", IArray(variable))

        val result = SplitMethods.newMembers(scope, namespace)

        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclVar])
      }

      test("preserves non-function class members") {
        val scope = createMockScope()
        val property = TsMemberProperty(
          NoComments,
          TsProtectionLevel.Default,
          createSimpleIdent("testProp"),
          Some(createTypeRef("string")),
          None,
          isStatic = false,
          isReadOnly = false
        )
        val clazz = createMockClass("TestClass", IArray(property))

        val result = SplitMethods.newClassMembers(scope, clazz)

        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberProperty])
      }
    }

    test("SplitMethods - Utility Methods") {
      test("isRepeated identifies repeated types") {
        val repeatedType = TsTypeRepeated(createTypeRef("string"))
        val normalType = createTypeRef("string")

        assert(SplitMethods.isRepeated(repeatedType))
        assert(!SplitMethods.isRepeated(normalType))
      }

      test("collectRightWhile works correctly") {
        val array = IArray("a", "b", "c", "d")
        val (left, right) = SplitMethods.collectRightWhile(array) {
          case s if s == "c" || s == "d" => s.toUpperCase
        }

        assert(left == IArray("a", "b"))
        assert(right == IArray("C", "D"))
      }

      test("collectRightWhile handles empty array") {
        val array = Empty: IArray[String]
        val (left, right) = SplitMethods.collectRightWhile(array) {
          case s: String => s.toUpperCase
        }

        assert(left.isEmpty)
        assert(right.isEmpty)
      }

      test("collectRightWhile handles no matches") {
        val array = IArray("a", "b", "c")
        val (left, right) = SplitMethods.collectRightWhile(array) {
          case s if s == "x" => s.toUpperCase
        }

        assert(left == array)
        assert(right.isEmpty)
      }
    }
  }
}