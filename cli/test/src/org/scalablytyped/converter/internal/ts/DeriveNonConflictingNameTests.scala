package org.scalablytyped.converter.internal
package ts

import utest.*

object DeriveNonConflictingNameTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createMockProperty(name: String, tpe: Option[TsType] = Some(TsTypeRef.string)): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createMockFunction(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = IArray.Empty,
        resultType = Some(TsTypeRef.void)
      ),
      isStatic = false,
      isReadOnly = false
    )

  def createMockCall(params: IArray[TsFunParam] = IArray.Empty): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = params,
        resultType = Some(TsTypeRef.string)
      )
    )

  def createParam(name: String): TsFunParam =
    TsFunParam(
      comments = NoComments,
      name = createSimpleIdent(name),
      tpe = Some(TsTypeRef.string)
    )

  def createMockCtor(resultType: Option[TsType] = Some(TsTypeRef.string)): TsMemberCtor =
    TsMemberCtor(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = IArray.Empty,
        resultType = resultType
      )
    )

  // Simple tryCreate function that accepts any name
  def simpleTryCreate(name: TsIdentSimple): Option[String] = Some(name.value)

  // tryCreate function that simulates conflicts
  def conflictingTryCreate(conflicts: Set[String])(name: TsIdentSimple): Option[String] =
    if (conflicts.contains(name.value)) None else Some(name.value)

  def tests = Tests {
    test("Basic Functionality") {
      test("empty members with empty prefix") {
        val members = IArray.Empty
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        assert(result == "0")
      }

      test("empty members with meaningful prefix") {
        val members = IArray.Empty
        val result = DeriveNonConflictingName("Test", members)(simpleTryCreate)
        assert(result == "Test0")
      }

      test("empty members with meaningless prefix Fn") {
        val members = IArray.Empty
        val result = DeriveNonConflictingName("Fn", members)(simpleTryCreate)
        assert(result == "Fn0")
      }
    }

    test("Single Member Types") {
      test("single property member") {
        val property = createMockProperty("userName")
        val members = IArray(property)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        assert(result == "UserName")
      }

      test("single function member") {
        val function = createMockFunction("getValue")
        val members = IArray(function)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        assert(result == "GetValue")
      }

      test("single constructor member") {
        val ctor = createMockCtor()
        val members = IArray(ctor)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        assert(result == "Instantiable")
      }

      test("single call member with parameters") {
        val param1 = createParam("firstName")
        val param2 = createParam("lastName")
        val call = createMockCall(IArray(param1, param2))
        val members = IArray(call)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        assert(result == "Call")
      }

      test("single call member with parameters - long version") {
        val param1 = createParam("firstName")
        val param2 = createParam("lastName")
        val call = createMockCall(IArray(param1, param2))
        val members = IArray(call)
        val conflicts = Set("Call")
        val result = DeriveNonConflictingName("", members)(conflictingTryCreate(conflicts))
        assert(result == "CallFirstNameLastName")
      }
    }

    test("Multiple Members") {
      test("multiple properties sorted by name") {
        val prop1 = createMockProperty("zebra")
        val prop2 = createMockProperty("alpha")
        val prop3 = createMockProperty("beta")
        val members = IArray(prop1, prop2, prop3)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        // Should be sorted: Alpha, Beta, Zebra
        assert(result == "Alpha")
      }

      test("mixed member types") {
        val property = createMockProperty("name")
        val function = createMockFunction("getValue")
        val ctor = createMockCtor()
        val members = IArray(property, function, ctor)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        // Should include constructor first, then sorted members
        assert(result == "Instantiable")
      }

      test("prefix with single member") {
        val property = createMockProperty("value")
        val members = IArray(property)
        val result = DeriveNonConflictingName("Test", members)(simpleTryCreate)
        assert(result == "Test")
      }
    }

    test("Conflict Resolution") {
      test("first choice conflicts, second succeeds") {
        val property = createMockProperty("name")
        val members = IArray(property)
        val conflicts = Set("Name")
        val result = DeriveNonConflictingName("", members)(conflictingTryCreate(conflicts))
        // Should try longer version or different combination
        assert(result != "Name")
        assert(result.nonEmpty)
      }

      test("all variants conflict, fallback to numbered") {
        val property = createMockProperty("test")
        val members = IArray(property)
        val conflicts = Set("Test", "TestString", "0", "1", "2")
        val result = DeriveNonConflictingName("", members)(conflictingTryCreate(conflicts))
        assert(result == "3")
      }

      test("prefix conflicts resolved with members") {
        val property = createMockProperty("value")
        val members = IArray(property)
        val conflicts = Set("Test")
        val result = DeriveNonConflictingName("Test", members)(conflictingTryCreate(conflicts))
        assert(result == "TestValue")
      }
    }

    test("Detail Class Functionality") {
      test("Detail.pretty formats names correctly") {
        assert(DeriveNonConflictingName.Detail.pretty("userName") == "UserName")
        assert(DeriveNonConflictingName.Detail.pretty("user_name") == "Username")
        assert(DeriveNonConflictingName.Detail.pretty("user123name") == "User123name")
        assert(DeriveNonConflictingName.Detail.pretty("123invalid") == "123invalid")
        assert(DeriveNonConflictingName.Detail.pretty("") == "")
      }

      test("Detail.prettyType formats types correctly") {
        val stringType = TsTypeRef.string
        val result = DeriveNonConflictingName.Detail.prettyType(stringType)
        assert(result == "String")

        val voidType = TsTypeRef.void
        val voidResult = DeriveNonConflictingName.Detail.prettyType(voidType)
        assert(voidResult == "Void")
      }

      test("Detail.prettyType handles Option types") {
        val someType = Some(TsTypeRef.string)
        val result = DeriveNonConflictingName.Detail.prettyType(someType)
        assert(result.contains("String"))

        val noneType = None
        val noneResult = DeriveNonConflictingName.Detail.prettyType(noneType)
        assert(noneResult.isEmpty)
      }

      test("Detail pick method") {
        val detail = DeriveNonConflictingName.Detail("Short", "LongVersion")
        assert(detail.pick(false) == "Short")
        assert(detail.pick(true) == "LongVersion")
      }

      test("Detail ordering") {
        val detail1 = DeriveNonConflictingName.Detail("Alpha", "AlphaLong")
        val detail2 = DeriveNonConflictingName.Detail("Beta", "BetaLong")
        val detail3 = DeriveNonConflictingName.Detail("Alpha", "DifferentLong")

        val sorted = IArray(detail2, detail1, detail3).sorted
        assert(sorted(0).short == "Alpha")
        assert(sorted(1).short == "Alpha")
        assert(sorted(2).short == "Beta")
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("empty property name") {
        val property = createMockProperty("")
        val members = IArray(property)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        assert(result == "")
      }

      test("property with None type") {
        val property = createMockProperty("test", None)
        val members = IArray(property)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        assert(result == "Test")
      }

      test("special characters in names") {
        val property = createMockProperty("user-name")
        val members = IArray(property)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        assert(result == "Username")
      }

      test("numeric names") {
        val property = createMockProperty("123")
        val members = IArray(property)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        assert(result == "123")
      }

      test("very long member names") {
        val longName = "a" * 100
        val property = createMockProperty(longName)
        val members = IArray(property)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        assert(result.length == 100)
        assert(result.startsWith("A"))
      }

      test("many members with conflicts") {
        val properties = (1 to 10).map(i => createMockProperty(s"prop$i"))
        val members = IArray.fromArray(properties.toArray)
        val conflicts = Set("Prop1", "Prop2", "Prop3")
        val result = DeriveNonConflictingName("", members)(conflictingTryCreate(conflicts))
        assert(result.nonEmpty)
        assert(!conflicts.contains(result))
      }
    }

    test("Fallback Mechanism") {
      test("fallback increments correctly") {
        val members = IArray.Empty
        val conflicts = Set("Test0", "Test1", "Test2")
        val result = DeriveNonConflictingName("Test", members)(conflictingTryCreate(conflicts))
        assert(result == "Test3")
      }

      test("fallback with empty prefix") {
        val members = IArray.Empty
        val conflicts = Set("0", "1", "2", "3", "4")
        val result = DeriveNonConflictingName("", members)(conflictingTryCreate(conflicts))
        assert(result == "5")
      }
    }

    test("Name Generation Algorithm") {
      test("short version preferred over long version") {
        val property = createMockProperty("test", Some(TsTypeRef.string))
        val members = IArray(property)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        // Should prefer "Test" over "TestString"
        assert(result == "Test")
      }

      test("long version used when short conflicts") {
        val property = createMockProperty("test", Some(TsTypeRef.string))
        val members = IArray(property)
        val conflicts = Set("Test")
        val result = DeriveNonConflictingName("", members)(conflictingTryCreate(conflicts))
        assert(result == "TestString")
      }

      test("different amounts of details tried") {
        val prop1 = createMockProperty("alpha")
        val prop2 = createMockProperty("beta")
        val members = IArray(prop1, prop2)
        val conflicts = Set("Alpha", "AlphaBeta", "Beta", "BetaAlpha")
        val result = DeriveNonConflictingName("", members)(conflictingTryCreate(conflicts))
        // Should try different combinations and amounts
        assert(result.nonEmpty)
        assert(!conflicts.contains(result))
      }

      test("prefix combined with member details") {
        val property = createMockProperty("value")
        val members = IArray(property)
        val conflicts = Set("Test", "Value")
        val result = DeriveNonConflictingName("Test", members)(conflictingTryCreate(conflicts))
        assert(result == "TestValue")
      }
    }

    test("Integration and Real-world Scenarios") {
      test("complex object with multiple member types") {
        val property = createMockProperty("name")
        val function = createMockFunction("getValue")
        val ctor = createMockCtor(Some(TsTypeRef.string))
        val call = createMockCall(IArray(createParam("id")))
        val members = IArray(property, function, ctor, call)

        val result = DeriveNonConflictingName("", members)(simpleTryCreate)
        // Should prioritize constructor, then call, then sorted members
        assert(result == "Call")
      }

      test("realistic naming scenario with conflicts") {
        val properties = IArray(
          createMockProperty("id"),
          createMockProperty("name"),
          createMockProperty("value")
        )
        val conflicts = Set("Id", "Name", "Value", "IdName", "IdNameValue")
        val result = DeriveNonConflictingName("", properties)(conflictingTryCreate(conflicts))

        assert(result.nonEmpty)
        assert(!conflicts.contains(result))
        // Should find some combination that works
      }

      test("empty names and edge cases combined") {
        val emptyProp = createMockProperty("")
        val normalProp = createMockProperty("test")
        val members = IArray(emptyProp, normalProp)
        val result = DeriveNonConflictingName("", members)(simpleTryCreate)

        // Should handle empty names gracefully - empty string is a valid result
        assert(result == "")
      }
    }
  }
}