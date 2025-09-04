package org.scalablytyped.converter.internal
package ts

import org.scalablytyped.converter.internal.ts.TsTreeScope.LoopDetector
import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object AllMembersForTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMockClass(
      name: String,
      members: IArray[TsMember] = Empty,
      parent: Option[TsTypeRef] = None,
      implements: IArray[TsTypeRef] = Empty
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      parent = parent,
      implements = implements,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

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

  def createMockProperty(name: String): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(TsTypeRef.string),
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

  def createMockScope(): TsTreeScope = {
    val libName = TsIdentLibrarySimple("test-lib")
    val logger = Logger.DevNull
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger)
  }

  def createLoopDetector(): LoopDetector = TsTreeScope.LoopDetector.initial

  def tests = Tests {
    test("AllMembersFor.forType") {
      test("returns empty for TsTypeUnion") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val unionType = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))

        val result = AllMembersFor.forType(scope, loopDetector)(unionType)

        assert(result.isEmpty)
      }

      test("returns members for TsTypeObject") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val property = createMockProperty("testProp")
        val objectType = TsTypeObject(NoComments, IArray(property))

        val result = AllMembersFor.forType(scope, loopDetector)(objectType)

        assert(result.length == 1)
        assert(result.head == property)
      }

      test("returns empty for primitive types") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val primitiveTypes = List(
          TsTypeAsserts(createSimpleIdent("x"), Some(TsTypeRef.string)),
          TsTypeLiteral(TsLiteral.Str("test")),
          TsTypeFunction(TsFunSig(NoComments, Empty, Empty, Some(TsTypeRef.void))),
          TsTypeConstructor(false, TsTypeFunction(TsFunSig(NoComments, Empty, Empty, Some(TsTypeRef.void)))),
          TsTypeIs(createSimpleIdent("x"), TsTypeRef.string),
          TsTypeTuple(Empty),
          TsTypeQuery(createQIdent("test")),
          TsTypeRepeated(TsTypeRef.string),
          TsTypeKeyOf(TsTypeRef.string),
          TsTypeLookup(TsTypeRef.string, TsTypeLiteral(TsLiteral.Str("key"))),
          TsTypeThis()
        )

        primitiveTypes.foreach { tpe =>
          val result = AllMembersFor.forType(scope, loopDetector)(tpe)
          assert(result.isEmpty)
        }
      }

      test("handles TsTypeIntersect by flattening members") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val prop1 = createMockProperty("prop1")
        val prop2 = createMockProperty("prop2")
        val obj1 = TsTypeObject(NoComments, IArray(prop1))
        val obj2 = TsTypeObject(NoComments, IArray(prop2))
        val intersectType = TsTypeIntersect(IArray(obj1, obj2))

        val result = AllMembersFor.forType(scope, loopDetector)(intersectType)

        assert(result.length == 2)
        assert(result.contains(prop1))
        assert(result.contains(prop2))
      }

      test("delegates to apply for TsTypeRef") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val typeRef = createTypeRef("TestType")

        // This will return empty since we don't have a proper scope with lookups
        val result = AllMembersFor.forType(scope, loopDetector)(typeRef)

        assert(result.isEmpty)
      }
    }

    test("AllMembersFor.handleOverridingFields") {
      test("combines members without conflicts") {
        val prop1 = createMockProperty("prop1")
        val prop2 = createMockProperty("prop2")
        val method1 = createMockMethod("method1")
        val fromThis = IArray(prop1, method1)
        val fromParents = IArray(prop2)

        val result = AllMembersFor.handleOverridingFields(fromThis, fromParents)

        assert(result.length == 3)
        assert(result.contains(prop1))
        assert(result.contains(prop2))
        assert(result.contains(method1))
      }

      test("filters out overridden properties from parents") {
        val thisProp = createMockProperty("sameName")
        val parentProp = createMockProperty("sameName")
        val otherProp = createMockProperty("otherName")
        val method = createMockMethod("method")
        val fromThis = IArray(thisProp)
        val fromParents = IArray(parentProp, otherProp, method)

        val result = AllMembersFor.handleOverridingFields(fromThis, fromParents)

        assert(result.length == 3)
        assert(result.contains(thisProp))
        assert(result.contains(otherProp))
        assert(result.contains(method))
        // The parent property with the same name should not be in the result
        val parentPropsInResult = result.collect { case p: TsMemberProperty if p.name.value == "sameName" => p }
        assert(parentPropsInResult.length == 1)
        assert(parentPropsInResult.head == thisProp)
      }

      test("preserves non-property members from parents") {
        val thisProp = createMockProperty("prop")
        val parentMethod = createMockMethod("method")
        val fromThis = IArray(thisProp)
        val fromParents = IArray(parentMethod)

        val result = AllMembersFor.handleOverridingFields(fromThis, fromParents)

        assert(result.length == 2)
        assert(result.contains(thisProp))
        assert(result.contains(parentMethod))
      }

      test("handles empty collections") {
        val result1 = AllMembersFor.handleOverridingFields(Empty, Empty)
        assert(result1.isEmpty)

        val prop = createMockProperty("prop")
        val result2 = AllMembersFor.handleOverridingFields(IArray(prop), Empty)
        assert(result2.length == 1)
        assert(result2.head == prop)

        val result3 = AllMembersFor.handleOverridingFields(Empty, IArray(prop))
        assert(result3.length == 1)
        assert(result3.head == prop)
      }
    }

    test("AllMembersFor.apply") {
      test("returns empty for circular reference") {
        val scope = createMockScope()
        val typeRef = createTypeRef("TestType")
        // Create a loop detector that already contains this type reference
        val loopDetector = TsTreeScope.LoopDetector.initial.including(typeRef, scope) match {
          case Left(_) => TsTreeScope.LoopDetector.initial
          case Right(ld) => ld
        }

        val result = AllMembersFor.apply(scope, loopDetector)(typeRef)

        assert(result.isEmpty)
      }

      test("returns empty when type not found in scope") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val typeRef = createTypeRef("NonExistentType")

        val result = AllMembersFor.apply(scope, loopDetector)(typeRef)

        assert(result.isEmpty)
      }
    }

    test("AllMembersFor.forInterface") {
      test("handles interface without inheritance") {
        val prop = createMockProperty("interfaceProp")
        val interface = createMockInterface("TestInterface", IArray(prop))
        val scope = createMockScope()
        val loopDetector = createLoopDetector()

        val result = AllMembersFor.forInterface(loopDetector, interface, scope, Empty)

        assert(result.length == 1)
        assert(result.head == prop)
      }

      test("handles interface with inheritance") {
        val prop1 = createMockProperty("prop1")
        val interface = createMockInterface("TestInterface", IArray(prop1), IArray(createTypeRef("BaseInterface")))
        val scope = createMockScope()
        val loopDetector = createLoopDetector()

        // Since we don't have a proper scope setup, inheritance will return empty
        val result = AllMembersFor.forInterface(loopDetector, interface, scope, Empty)

        assert(result.length == 1)
        assert(result.head == prop1)
      }

      test("handles empty interface") {
        val interface = createMockInterface("EmptyInterface")
        val scope = createMockScope()
        val loopDetector = createLoopDetector()

        val result = AllMembersFor.forInterface(loopDetector, interface, scope, Empty)

        assert(result.isEmpty)
      }

      test("handles interface with type parameters") {
        val prop = createMockProperty("genericProp")
        val interface = createMockInterface("GenericInterface", IArray(prop))
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val tparams = IArray(TsTypeRef.string)

        val result = AllMembersFor.forInterface(loopDetector, interface, scope, tparams)

        assert(result.length == 1)
        assert(result.head == prop)
      }
    }

    test("AllMembersFor - Complex Scenarios") {
      test("handles multiple property overrides correctly") {
        val thisProp1 = createMockProperty("name")
        val thisProp2 = createMockProperty("value")
        val parentProp1 = createMockProperty("name") // should be overridden
        val parentProp2 = createMockProperty("other")
        val parentMethod = createMockMethod("method")

        val fromThis = IArray(thisProp1, thisProp2)
        val fromParents = IArray(parentProp1, parentProp2, parentMethod)

        val result = AllMembersFor.handleOverridingFields(fromThis, fromParents)

        assert(result.length == 4)
        assert(result.contains(thisProp1))
        assert(result.contains(thisProp2))
        assert(result.contains(parentProp2))
        assert(result.contains(parentMethod))
        // Check that only the "this" property with name "name" is in the result
        val namePropsInResult = result.collect { case p: TsMemberProperty if p.name.value == "name" => p }
        assert(namePropsInResult.length == 1)
        assert(namePropsInResult.head == thisProp1)
      }

      test("preserves order of members") {
        val prop1 = createMockProperty("prop1")
        val prop2 = createMockProperty("prop2")
        val method1 = createMockMethod("method1")
        val method2 = createMockMethod("method2")

        val fromThis = IArray(prop1, method1)
        val fromParents = IArray(prop2, method2)

        val result = AllMembersFor.handleOverridingFields(fromThis, fromParents)

        // Should maintain order: fromThis first, then non-overridden fromParents
        assert(result.length == 4)
        assert(result(0) == prop1)
        assert(result(1) == method1)
        assert(result(2) == prop2)
        assert(result(3) == method2)
      }

      test("handles mixed member types correctly") {
        val property = createMockProperty("prop")
        val method = createMockMethod("method")
        val constructor = TsMemberCtor(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          signature = TsFunSig(NoComments, Empty, Empty, None)
        )
        val callSignature = TsMemberCall(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          signature = TsFunSig(NoComments, Empty, Empty, Some(TsTypeRef.void))
        )

        val fromThis = IArray(property, constructor)
        val fromParents = IArray(method, callSignature)

        val result = AllMembersFor.handleOverridingFields(fromThis, fromParents)

        assert(result.length == 4)
        assert(result.contains(property))
        assert(result.contains(method))
        assert(result.contains(constructor))
        assert(result.contains(callSignature))
      }
    }

    test("AllMembersFor - Error Handling") {
      test("handles null or invalid inputs gracefully") {
        // Test with empty arrays
        val result1 = AllMembersFor.handleOverridingFields(Empty, Empty)
        assert(result1.isEmpty)

        // Test forType with null-like scenarios
        val scope = createMockScope()
        val loopDetector = createLoopDetector()

        // Test with empty TsTypeIntersect
        val emptyIntersect = TsTypeIntersect(Empty)
        val result2 = AllMembersFor.forType(scope, loopDetector)(emptyIntersect)
        assert(result2.isEmpty)

        // Test with TsTypeObject with empty members
        val emptyObject = TsTypeObject(NoComments, Empty)
        val result3 = AllMembersFor.forType(scope, loopDetector)(emptyObject)
        assert(result3.isEmpty)
      }

      test("handles deeply nested type intersections") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()

        val prop1 = createMockProperty("prop1")
        val prop2 = createMockProperty("prop2")
        val prop3 = createMockProperty("prop3")

        val obj1 = TsTypeObject(NoComments, IArray(prop1))
        val obj2 = TsTypeObject(NoComments, IArray(prop2))
        val obj3 = TsTypeObject(NoComments, IArray(prop3))

        val nestedIntersect = TsTypeIntersect(IArray(
          obj1,
          TsTypeIntersect(IArray(obj2, obj3))
        ))

        val result = AllMembersFor.forType(scope, loopDetector)(nestedIntersect)

        assert(result.length == 3)
        assert(result.contains(prop1))
        assert(result.contains(prop2))
        assert(result.contains(prop3))
      }
    }

    test("AllMembersFor - Integration Tests") {
      test("forType correctly delegates to apply for type references") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()
        val typeRef = createTypeRef("TestType")

        // Mock the apply method behavior by testing the delegation
        val result1 = AllMembersFor.forType(scope, loopDetector)(typeRef)
        val result2 = AllMembersFor.apply(scope, loopDetector)(typeRef)

        // Both should return the same result (empty in this case due to no scope setup)
        assert(result1 == result2)
      }

      test("maintains consistency across different input types") {
        val scope = createMockScope()
        val loopDetector = createLoopDetector()

        // All these should return empty
        val types = List(
          TsTypeUnion(IArray(TsTypeRef.string)),
          TsTypeAsserts(createSimpleIdent("x"), Some(TsTypeRef.string)),
          TsTypeLiteral(TsLiteral.Str("test")),
          TsTypeFunction(TsFunSig(NoComments, Empty, Empty, Some(TsTypeRef.void))),
          TsTypeThis()
        )

        types.foreach { tpe =>
          val result = AllMembersFor.forType(scope, loopDetector)(tpe)
          assert(result.isEmpty)
        }
      }
    }
  }
}