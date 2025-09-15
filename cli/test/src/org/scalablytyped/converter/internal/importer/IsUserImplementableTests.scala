package org.scalablytyped.converter.internal.importer

import org.scalablytyped.converter.internal.*
import org.scalablytyped.converter.internal.ts.*
import org.scalablytyped.converter.internal.ts.ParentsResolver.WithParents
import utest.*

object IsUserImplementableTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createMockInterface(
      name: String,
      members: IArray[TsMember] = IArray.Empty,
      inheritance: IArray[TsTypeRef] = IArray.Empty,
      comments: Comments = NoComments
  ): TsDeclInterface = {
    TsDeclInterface(
      comments = comments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = IArray.Empty,
      inheritance = inheritance,
      members = members,
      codePath = CodePath.NoPath
    )
  }

  def createMockProperty(
      name: String,
      isStatic: Boolean = false,
      tpe: Option[TsType] = Some(TsTypeRef.any),
      comments: Comments = NoComments
  ): TsMemberProperty = {
    TsMemberProperty(
      comments = comments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
      isStatic = isStatic,
      isReadOnly = false
    )
  }

  def createMockFunction(
      name: String,
      isStatic: Boolean = false,
      methodType: MethodType = MethodType.Normal,
      comments: Comments = NoComments
  ): TsMemberFunction = {
    val signature = TsFunSig(
      comments = NoComments,
      tparams = IArray.Empty,
      params = IArray.Empty,
      resultType = Some(TsTypeRef.any)
    )
    TsMemberFunction(
      comments = comments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = methodType,
      signature = signature,
      isStatic = isStatic,
      isReadOnly = false
    )
  }

  def createMockClass(
      name: String,
      members: IArray[TsMember] = IArray.Empty,
      inheritance: IArray[TsTypeRef] = IArray.Empty,
      comments: Comments = NoComments
  ): TsDeclClass = {
    TsDeclClass(
      comments = comments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = IArray.Empty,
      parent = None,
      implements = inheritance,
      members = members,
      codePath = CodePath.NoPath,
      jsLocation = JsLocation.Zero
    )
  }

  def createMockCtor(comments: Comments = NoComments): TsMemberCtor = {
    val signature = TsFunSig(
      comments = NoComments,
      tparams = IArray.Empty,
      params = IArray.Empty,
      resultType = None
    )
    TsMemberCtor(
      comments = comments,
      level = TsProtectionLevel.Default,
      signature = signature
    )
  }

  def createMockCall(comments: Comments = NoComments): TsMemberCall = {
    val signature = TsFunSig(
      comments = NoComments,
      tparams = IArray.Empty,
      params = IArray.Empty,
      resultType = Some(TsTypeRef.any)
    )
    TsMemberCall(
      comments = comments,
      level = TsProtectionLevel.Default,
      signature = signature
    )
  }

  def createMockIndex(
      indexing: Indexing = Indexing.Single(createQIdent("string")),
      comments: Comments = NoComments
  ): TsMemberIndex = {
    TsMemberIndex(
      comments = comments,
      level = TsProtectionLevel.Default,
      isReadOnly = false,
      indexing = indexing,
      valueType = Some(TsTypeRef.any)
    )
  }

  def createMockTypeMapped(
      key: String = "K",
      from: TsType = TsTypeRef.any,
      to: TsType = TsTypeRef.any,
      comments: Comments = NoComments
  ): TsMemberTypeMapped = {
    TsMemberTypeMapped(
      comments = comments,
      level = TsProtectionLevel.Default,
      readonly = ReadonlyModifier.Noop,
      key = createSimpleIdent(key),
      from = from,
      as = None,
      optionalize = OptionalModifier.Noop,
      to = to
    )
  }

  def createFunctionInterface(): TsDeclInterface = {
    createMockInterface(
      TsQIdent.Function.parts.head.value,
      members = IArray(
        createMockCall()
      )
    )
  }

  def createWithParents[X <: ParentsResolver.InterfaceOrClass](
      value: X,
      parents: IArray[ParentsResolver.InterfaceOrClass] = IArray.Empty,
      unresolved: IArray[TsType] = IArray.Empty
  ): WithParents[X] = {
    WithParents(value, parents, unresolved)
  }

  val tests = Tests {
    test("IsUserImplementable - Basic Functionality") {
      test("should return true for simple interface with basic properties") {
        val interface = createMockInterface(
          "SimpleInterface",
          members = IArray(
            createMockProperty("name"),
            createMockProperty("value")
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == true)
      }

      test("should return true for interface with normal methods") {
        val interface = createMockInterface(
          "InterfaceWithMethods",
          members = IArray(
            createMockProperty("data"),
            createMockFunction("process"),
            createMockFunction("validate")
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == true)
      }

      test("should return true for empty interface") {
        val interface   = createMockInterface("EmptyInterface")
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == true)
      }
    }

    test("IsUserImplementable - Negative Cases") {
      test("should return false for classes") {
        val clazz = createMockClass(
          "MyClass",
          members = IArray(
            createMockProperty("data"),
            createMockFunction("method")
          )
        )

        val result = IsUserImplementable.pred(clazz)
        assert(result == false)
      }

      test("should return false for interfaces with constructors") {
        val interface = createMockInterface(
          "InterfaceWithCtor",
          members = IArray(
            createMockProperty("data"),
            createMockCtor()
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }

      test("should return false for interfaces with call signatures") {
        val interface = createMockInterface(
          "InterfaceWithCall",
          members = IArray(
            createMockProperty("data"),
            createMockCall()
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }
    }

    test("IsUserImplementable - Edge Cases") {
      test("should return false for Function interface") {
        val interface   = createFunctionInterface()
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }

      test("should return false for interfaces with mapped types") {
        val interface = createMockInterface(
          "InterfaceWithMapped",
          members = IArray(
            createMockProperty("data"),
            createMockTypeMapped()
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }

      test("should return false for interfaces with single index signatures") {
        val interface = createMockInterface(
          "InterfaceWithIndex",
          members = IArray(
            createMockProperty("data"),
            createMockIndex(Indexing.Single(createQIdent("K")))
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }

      test("should return true for interfaces with dict index signatures") {
        val interface = createMockInterface(
          "InterfaceWithDictIndex",
          members = IArray(
            createMockProperty("data"),
            createMockIndex(Indexing.Dict(createSimpleIdent("key"), TsTypeRef.string))
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == true)
      }
    }

    test("IsUserImplementable - Static Members and Illegal Names") {
      test("should return false for interfaces with static properties") {
        val interface = createMockInterface(
          "InterfaceWithStatic",
          members = IArray(
            createMockProperty("data"),
            createMockProperty("staticProp", isStatic = true)
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }

      test("should return false for interfaces with static methods") {
        val interface = createMockInterface(
          "InterfaceWithStaticMethod",
          members = IArray(
            createMockProperty("data"),
            createMockFunction("staticMethod", isStatic = true)
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }

      test("should return false for interfaces with Apply members") {
        val interface = createMockInterface(
          "InterfaceWithApply",
          members = IArray(
            createMockProperty("data"),
            createMockProperty(TsIdent.Apply.value)
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }

      test("should return false for interfaces with namespaced members") {
        val interface = createMockInterface(
          "InterfaceWithNamespaced",
          members = IArray(
            createMockProperty("data"),
            createMockProperty(TsIdent.namespaced.value)
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }
    }

    test("IsUserImplementable - Inheritance and Unresolved Types") {
      test("should return false when interface has unresolved types") {
        val interface = createMockInterface(
          "InterfaceWithUnresolved",
          members = IArray(
            createMockProperty("data")
          )
        )
        val withParents = createWithParents(
          interface,
          unresolved = IArray(TsTypeRef.any)
        )

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }

      test("should return true when interface and all parents are user implementable") {
        val parentInterface = createMockInterface(
          "ParentInterface",
          members = IArray(
            createMockProperty("parentData")
          )
        )
        val interface = createMockInterface(
          "ChildInterface",
          members = IArray(
            createMockProperty("childData")
          )
        )
        val withParents = createWithParents(
          interface,
          parents = IArray(parentInterface)
        )

        val result = IsUserImplementable(withParents)
        assert(result == true)
      }

      test("should return false when interface is implementable but parent is not") {
        val parentClass = createMockClass(
          "ParentClass",
          members = IArray(
            createMockProperty("parentData")
          )
        )
        val interface = createMockInterface(
          "ChildInterface",
          members = IArray(
            createMockProperty("childData")
          )
        )
        val withParents = createWithParents(
          interface,
          parents = IArray(parentClass)
        )

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }
    }

    test("IsUserImplementable - Method Types and Overloads") {
      test("should return false for interfaces with getter methods") {
        val interface = createMockInterface(
          "InterfaceWithGetter",
          members = IArray(
            createMockProperty("data"),
            createMockFunction("getValue", methodType = MethodType.Getter)
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }

      test("should return false for interfaces with setter methods") {
        val interface = createMockInterface(
          "InterfaceWithSetter",
          members = IArray(
            createMockProperty("data"),
            createMockFunction("setValue", methodType = MethodType.Setter)
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }

      test("should return true for interfaces with multiple non-static properties (will combine later)") {
        // This tests the logic for multiple properties with same name where all are non-static
        val prop1 = createMockProperty("sameName", isStatic = false)
        val prop2 = createMockProperty("sameName", isStatic = false)

        // Create interface manually to have multiple members with same name
        val interface = TsDeclInterface(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("InterfaceWithMultipleNonStatic"),
          tparams = IArray.Empty,
          inheritance = IArray.Empty,
          members = IArray(prop1, prop2),
          codePath = CodePath.NoPath
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == true)
      }

      test("should return false for interfaces with mixed member types (property and non-property)") {
        // This tests the case where multiple members have same name but not all are properties
        val prop = createMockProperty("sameName", isStatic = false)
        val func = createMockFunction("sameName", isStatic = false)

        val interface = TsDeclInterface(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("InterfaceWithMixed"),
          tparams = IArray.Empty,
          inheritance = IArray.Empty,
          members = IArray(prop, func),
          codePath = CodePath.NoPath
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == false)
      }
    }

    test("IsUserImplementable - Container Handling") {
      test("should handle interfaces with complex inheritance correctly") {
        val grandParent = createMockInterface(
          "GrandParent",
          members = IArray(createMockProperty("grandData"))
        )
        val parent = createMockInterface(
          "Parent",
          members = IArray(createMockProperty("parentData"))
        )
        val child = createMockInterface(
          "Child",
          members = IArray(createMockProperty("childData"))
        )
        val withParents = createWithParents(
          child,
          parents = IArray(parent, grandParent)
        )

        val result = IsUserImplementable(withParents)
        assert(result == true)
      }

      test("should handle interfaces with ExpandedCallables marker correctly") {
        val expandedComment = Comments(Comment("test"))
        // TODO: Need to add ExpandedCallables marker - this is a placeholder test
        val interface = createMockInterface(
          "InterfaceWithExpanded",
          members = IArray(
            createMockProperty("data", comments = expandedComment)
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == true)
      }

      test("should return true for interfaces with only valid members") {
        val interface = createMockInterface(
          "ValidInterface",
          members = IArray(
            createMockProperty("prop1"),
            createMockProperty("prop2"),
            createMockFunction("method1"),
            createMockFunction("method2")
          )
        )
        val withParents = createWithParents(interface)

        val result = IsUserImplementable(withParents)
        assert(result == true)
      }
    }
  }
}
