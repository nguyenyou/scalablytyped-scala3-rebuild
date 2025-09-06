package org.scalablytyped.converter.internal
package ts

import utest.*

object HasClassMembersTests extends TestSuite {

  // Test implementation of HasClassMembers trait for testing
  case class TestHasClassMembers(members: IArray[TsMember]) extends HasClassMembers

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createFunSig(
      params: IArray[TsFunParam] = Empty,
      resultType: Option[TsType] = Some(TsTypeRef.any)
  ): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = Empty,
      params = params,
      resultType = resultType
    )

  def createMockMemberFunction(
      name: String,
      methodType: MethodType = MethodType.Normal,
      isStatic: Boolean = false,
      isReadOnly: Boolean = false,
      level: TsProtectionLevel = TsProtectionLevel.Default
  ): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = level,
      name = createSimpleIdent(name),
      methodType = methodType,
      signature = createFunSig(),
      isStatic = isStatic,
      isReadOnly = isReadOnly
    )

  def createMockMemberProperty(
      name: String,
      tpe: Option[TsType] = Some(TsTypeRef.string),
      expr: Option[TsExpr] = None,
      isStatic: Boolean = false,
      isReadOnly: Boolean = false,
      level: TsProtectionLevel = TsProtectionLevel.Default
  ): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = level,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = expr,
      isStatic = isStatic,
      isReadOnly = isReadOnly
    )

  def createMockMemberCall(
      level: TsProtectionLevel = TsProtectionLevel.Default,
      signature: TsFunSig = createFunSig()
  ): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = level,
      signature = signature
    )

  def createMockMemberCtor(
      level: TsProtectionLevel = TsProtectionLevel.Default,
      signature: TsFunSig = createFunSig()
  ): TsMemberCtor =
    TsMemberCtor(
      comments = NoComments,
      level = level,
      signature = signature
    )

  def createMockMemberTypeMapped(
      key: String = "K",
      from: TsType = TsTypeRef.string,
      to: TsType = TsTypeRef.any,
      level: TsProtectionLevel = TsProtectionLevel.Default
  ): TsMemberTypeMapped =
    TsMemberTypeMapped(
      comments = NoComments,
      level = level,
      readonly = ReadonlyModifier.Noop,
      key = TsIdent(key),
      from = from,
      as = None,
      optionalize = OptionalModifier.Noop,
      to = to
    )

  def tests = Tests {
    test("HasClassMembers - Basic Functionality") {
      test("empty members collection") {
        val hasClassMembers = TestHasClassMembers(IArray.Empty)

        assert(hasClassMembers.membersByName.isEmpty)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("single named member - function") {
        val memberFunction  = createMockMemberFunction("testMethod")
        val hasClassMembers = TestHasClassMembers(IArray(memberFunction))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(memberFunction.name))
        assert(hasClassMembers.membersByName(memberFunction.name).head == memberFunction)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("single named member - property") {
        val memberProperty  = createMockMemberProperty("testProp")
        val hasClassMembers = TestHasClassMembers(IArray(memberProperty))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(memberProperty.name))
        assert(hasClassMembers.membersByName(memberProperty.name).head == memberProperty)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("call signature mapped to TsIdent.Apply") {
        val memberCall      = createMockMemberCall()
        val hasClassMembers = TestHasClassMembers(IArray(memberCall))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(TsIdent.Apply))
        assert(hasClassMembers.membersByName(TsIdent.Apply).head == memberCall)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("constructor signature mapped to TsIdent.constructor") {
        val memberCtor      = createMockMemberCtor()
        val hasClassMembers = TestHasClassMembers(IArray(memberCtor))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(TsIdent.constructor))
        assert(hasClassMembers.membersByName(TsIdent.constructor).head == memberCtor)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("unnamed member - type mapped") {
        val memberTypeMapped = createMockMemberTypeMapped()
        val hasClassMembers  = TestHasClassMembers(IArray(memberTypeMapped))

        assert(hasClassMembers.membersByName.isEmpty)
        assert(hasClassMembers.unnamed.length == 1)
        assert(hasClassMembers.unnamed.head == memberTypeMapped)
      }
    }

    test("HasClassMembers - Mixed Member Types") {
      test("all four named member types") {
        val memberFunction = createMockMemberFunction("testMethod")
        val memberProperty = createMockMemberProperty("testProp")
        val memberCall     = createMockMemberCall()
        val memberCtor     = createMockMemberCtor()

        val hasClassMembers = TestHasClassMembers(IArray(memberFunction, memberProperty, memberCall, memberCtor))

        assert(hasClassMembers.membersByName.size == 4)
        assert(hasClassMembers.membersByName.contains(memberFunction.name))
        assert(hasClassMembers.membersByName.contains(memberProperty.name))
        assert(hasClassMembers.membersByName.contains(TsIdent.Apply))
        assert(hasClassMembers.membersByName.contains(TsIdent.constructor))
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("named and unnamed members mixed") {
        val memberFunction   = createMockMemberFunction("testMethod")
        val memberProperty   = createMockMemberProperty("testProp")
        val memberTypeMapped = createMockMemberTypeMapped()

        val hasClassMembers = TestHasClassMembers(IArray(memberFunction, memberProperty, memberTypeMapped))

        assert(hasClassMembers.membersByName.size == 2)
        assert(hasClassMembers.membersByName.contains(memberFunction.name))
        assert(hasClassMembers.membersByName.contains(memberProperty.name))
        assert(hasClassMembers.unnamed.length == 1)
        assert(hasClassMembers.unnamed.head == memberTypeMapped)
      }

      test("multiple unnamed members") {
        val memberTypeMapped1 = createMockMemberTypeMapped("K1")
        val memberTypeMapped2 = createMockMemberTypeMapped("K2")

        val hasClassMembers = TestHasClassMembers(IArray(memberTypeMapped1, memberTypeMapped2))

        assert(hasClassMembers.membersByName.isEmpty)
        assert(hasClassMembers.unnamed.length == 2)
        assert(hasClassMembers.unnamed.contains(memberTypeMapped1))
        assert(hasClassMembers.unnamed.contains(memberTypeMapped2))
      }
    }

    test("HasClassMembers - Same Name Grouping") {
      test("multiple functions with same name") {
        val memberFunction1 = createMockMemberFunction("sameName")
        val memberFunction2 = createMockMemberFunction("sameName")
        val hasClassMembers = TestHasClassMembers(IArray(memberFunction1, memberFunction2))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(memberFunction1.name))
        assert(hasClassMembers.membersByName(memberFunction1.name).length == 2)
        assert(hasClassMembers.membersByName(memberFunction1.name).contains(memberFunction1))
        assert(hasClassMembers.membersByName(memberFunction1.name).contains(memberFunction2))
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("multiple properties with same name") {
        val memberProperty1 = createMockMemberProperty("sameName")
        val memberProperty2 = createMockMemberProperty("sameName")
        val hasClassMembers = TestHasClassMembers(IArray(memberProperty1, memberProperty2))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(memberProperty1.name))
        assert(hasClassMembers.membersByName(memberProperty1.name).length == 2)
        assert(hasClassMembers.membersByName(memberProperty1.name).contains(memberProperty1))
        assert(hasClassMembers.membersByName(memberProperty1.name).contains(memberProperty2))
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("function and property with same name") {
        val memberFunction  = createMockMemberFunction("sameName")
        val memberProperty  = createMockMemberProperty("sameName")
        val hasClassMembers = TestHasClassMembers(IArray(memberFunction, memberProperty))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(memberFunction.name))
        assert(hasClassMembers.membersByName(memberFunction.name).length == 2)
        assert(hasClassMembers.membersByName(memberFunction.name).contains(memberFunction))
        assert(hasClassMembers.membersByName(memberFunction.name).contains(memberProperty))
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("multiple call signatures") {
        val memberCall1     = createMockMemberCall()
        val memberCall2     = createMockMemberCall()
        val hasClassMembers = TestHasClassMembers(IArray(memberCall1, memberCall2))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(TsIdent.Apply))
        assert(hasClassMembers.membersByName(TsIdent.Apply).length == 2)
        assert(hasClassMembers.membersByName(TsIdent.Apply).contains(memberCall1))
        assert(hasClassMembers.membersByName(TsIdent.Apply).contains(memberCall2))
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("multiple constructors") {
        val memberCtor1     = createMockMemberCtor()
        val memberCtor2     = createMockMemberCtor()
        val hasClassMembers = TestHasClassMembers(IArray(memberCtor1, memberCtor2))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(TsIdent.constructor))
        assert(hasClassMembers.membersByName(TsIdent.constructor).length == 2)
        assert(hasClassMembers.membersByName(TsIdent.constructor).contains(memberCtor1))
        assert(hasClassMembers.membersByName(TsIdent.constructor).contains(memberCtor2))
        assert(hasClassMembers.unnamed.isEmpty)
      }
    }

    test("HasClassMembers - Member Properties and Variations") {
      test("function with different method types") {
        val normalMethod    = createMockMemberFunction("method", MethodType.Normal)
        val getter          = createMockMemberFunction("prop", MethodType.Getter)
        val setter          = createMockMemberFunction("prop", MethodType.Setter)
        val hasClassMembers = TestHasClassMembers(IArray(normalMethod, getter, setter))

        assert(hasClassMembers.membersByName.size == 2)
        assert(hasClassMembers.membersByName.contains(normalMethod.name))
        assert(hasClassMembers.membersByName.contains(getter.name))
        assert(hasClassMembers.membersByName(getter.name).length == 2) // getter and setter
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("static and instance members") {
        val staticMethod     = createMockMemberFunction("method", isStatic = true)
        val instanceMethod   = createMockMemberFunction("method", isStatic = false)
        val staticProperty   = createMockMemberProperty("prop", isStatic = true)
        val instanceProperty = createMockMemberProperty("prop", isStatic = false)

        val hasClassMembers =
          TestHasClassMembers(IArray(staticMethod, instanceMethod, staticProperty, instanceProperty))

        assert(hasClassMembers.membersByName.size == 2)
        assert(hasClassMembers.membersByName.contains(staticMethod.name))
        assert(hasClassMembers.membersByName.contains(staticProperty.name))
        assert(hasClassMembers.membersByName(staticMethod.name).length == 2)   // static and instance methods
        assert(hasClassMembers.membersByName(staticProperty.name).length == 2) // static and instance properties
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("readonly and mutable members") {
        val readonlyMethod   = createMockMemberFunction("method", isReadOnly = true)
        val mutableMethod    = createMockMemberFunction("method", isReadOnly = false)
        val readonlyProperty = createMockMemberProperty("prop", isReadOnly = true)
        val mutableProperty  = createMockMemberProperty("prop", isReadOnly = false)

        val hasClassMembers =
          TestHasClassMembers(IArray(readonlyMethod, mutableMethod, readonlyProperty, mutableProperty))

        assert(hasClassMembers.membersByName.size == 2)
        assert(hasClassMembers.membersByName(readonlyMethod.name).length == 2)
        assert(hasClassMembers.membersByName(readonlyProperty.name).length == 2)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("different protection levels") {
        val publicMethod    = createMockMemberFunction("method", level = TsProtectionLevel.Default)
        val privateMethod   = createMockMemberFunction("method", level = TsProtectionLevel.Private)
        val protectedMethod = createMockMemberFunction("method", level = TsProtectionLevel.Protected)

        val hasClassMembers = TestHasClassMembers(IArray(publicMethod, privateMethod, protectedMethod))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName(publicMethod.name).length == 3)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("properties with different types and expressions") {
        val stringProp  = createMockMemberProperty("stringProp", Some(TsTypeRef.string))
        val numberProp  = createMockMemberProperty("numberProp", Some(TsTypeRef.number))
        val untypedProp = createMockMemberProperty("untypedProp", None)
        val propWithExpr = createMockMemberProperty(
          "propWithExpr",
          Some(TsTypeRef.string),
          Some(TsExpr.Literal(TsLiteral.Str("default")))
        )

        val hasClassMembers = TestHasClassMembers(IArray(stringProp, numberProp, untypedProp, propWithExpr))

        assert(hasClassMembers.membersByName.size == 4)
        assert(hasClassMembers.membersByName.contains(stringProp.name))
        assert(hasClassMembers.membersByName.contains(numberProp.name))
        assert(hasClassMembers.membersByName.contains(untypedProp.name))
        assert(hasClassMembers.membersByName.contains(propWithExpr.name))
        assert(hasClassMembers.unnamed.isEmpty)
      }
    }

    test("HasClassMembers - Edge Cases and Complex Scenarios") {
      test("large number of members") {
        val functions  = (1 to 50).map(i => createMockMemberFunction(s"method$i")).toArray
        val properties = (1 to 50).map(i => createMockMemberProperty(s"prop$i")).toArray
        val calls      = (1 to 10).map(_ => createMockMemberCall()).toArray
        val ctors      = (1 to 5).map(_ => createMockMemberCtor()).toArray
        val typeMapped = (1 to 10).map(i => createMockMemberTypeMapped(s"K$i")).toArray

        val allMembers      = functions ++ properties ++ calls ++ ctors ++ typeMapped
        val hasClassMembers = TestHasClassMembers(IArray.fromArray(allMembers))

        assert(hasClassMembers.membersByName.size == 102) // 50 functions + 50 properties + Apply + constructor
        assert(hasClassMembers.membersByName(TsIdent.Apply).length == 10)
        assert(hasClassMembers.membersByName(TsIdent.constructor).length == 5)
        assert(hasClassMembers.unnamed.length == 10) // type mapped members
      }

      test("complex name collision scenario") {
        val method1   = createMockMemberFunction("collision")
        val method2   = createMockMemberFunction("collision")
        val property1 = createMockMemberProperty("collision")
        val property2 = createMockMemberProperty("collision")
        val call1     = createMockMemberCall()
        val call2     = createMockMemberCall()
        val ctor1     = createMockMemberCtor()
        val ctor2     = createMockMemberCtor()

        val hasClassMembers =
          TestHasClassMembers(IArray(method1, method2, property1, property2, call1, call2, ctor1, ctor2))

        assert(hasClassMembers.membersByName.size == 3)                 // collision, Apply, constructor
        assert(hasClassMembers.membersByName(method1.name).length == 4) // 2 methods + 2 properties
        assert(hasClassMembers.membersByName(TsIdent.Apply).length == 2)
        assert(hasClassMembers.membersByName(TsIdent.constructor).length == 2)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("mixed named and unnamed with collisions") {
        val method      = createMockMemberFunction("test")
        val property    = createMockMemberProperty("test")
        val call        = createMockMemberCall()
        val ctor        = createMockMemberCtor()
        val typeMapped1 = createMockMemberTypeMapped("K1")
        val typeMapped2 = createMockMemberTypeMapped("K2")

        val hasClassMembers = TestHasClassMembers(IArray(method, property, call, ctor, typeMapped1, typeMapped2))

        assert(hasClassMembers.membersByName.size == 3)                // test, Apply, constructor
        assert(hasClassMembers.membersByName(method.name).length == 2) // method + property
        assert(hasClassMembers.membersByName(TsIdent.Apply).length == 1)
        assert(hasClassMembers.membersByName(TsIdent.constructor).length == 1)
        assert(hasClassMembers.unnamed.length == 2) // type mapped members
      }
    }

    test("HasClassMembers - Lazy Evaluation") {
      test("membersByName is computed lazily") {
        val memberFunction  = createMockMemberFunction("testMethod")
        val hasClassMembers = TestHasClassMembers(IArray(memberFunction))

        // Access membersByName multiple times to ensure it's computed once
        val result1 = hasClassMembers.membersByName
        val result2 = hasClassMembers.membersByName

        assert(result1 eq result2) // Should be the same object reference (lazy val)
        assert(result1.size == 1)
        assert(result1.contains(memberFunction.name))
      }

      test("unnamed is computed lazily") {
        val memberTypeMapped = createMockMemberTypeMapped()
        val hasClassMembers  = TestHasClassMembers(IArray(memberTypeMapped))

        // Access unnamed multiple times to ensure it's computed once
        val result1 = hasClassMembers.unnamed
        val result2 = hasClassMembers.unnamed

        assert(result1 eq result2) // Should be the same object reference (lazy val)
        assert(result1.length == 1)
        assert(result1.head == memberTypeMapped)
      }
    }
  }
}
