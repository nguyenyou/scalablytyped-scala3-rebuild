package org.scalablytyped.converter.internal
package ts

import utest.*

object TypeParamsReferencedInTreeTests extends TestSuite {

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

  def createMockClass(
      name: String,
      tparams: IArray[TsTypeParam] = Empty,
      members: IArray[TsMember] = Empty
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      parent = None,
      implements = Empty,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockInterface(
      name: String,
      tparams: IArray[TsTypeParam] = Empty,
      members: IArray[TsMember] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      inheritance = Empty,
      members = members,
      codePath = CodePath.NoPath
    )

  def createMemberProperty(name: String, tpe: TsType): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(tpe),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def tests = Tests {
    test("TypeParamsReferencedInTree - Basic Functionality") {
      test("empty scope returns empty result") {
        val emptyScope = Map.empty[TsIdent, TsTypeParam]
        val simpleClass = createMockClass("TestClass")

        val result = TypeParamsReferencedInTree(emptyScope, simpleClass)

        assert(result.isEmpty)
      }

      test("no type parameter references returns empty result") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)
        val simpleClass = createMockClass("TestClass")

        val result = TypeParamsReferencedInTree(scope, simpleClass)

        assert(result.isEmpty)
      }

      test("single type parameter reference") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)
        val typeRef = createTypeRef("T")
        val member = createMemberProperty("prop", typeRef)
        val classWithMember = createMockClass("TestClass", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, classWithMember)

        assert(result.length == 1)
        assert(result.head == tparam)
      }

      test("multiple type parameter references") {
        val tparamT = createTypeParam("T")
        val tparamU = createTypeParam("U")
        val scope = Map[TsIdent, TsTypeParam](tparamT.name -> tparamT, tparamU.name -> tparamU)

        val typeRefT = createTypeRef("T")
        val typeRefU = createTypeRef("U")
        val memberT = createMemberProperty("propT", typeRefT)
        val memberU = createMemberProperty("propU", typeRefU)
        val classWithMembers = createMockClass("TestClass", members = IArray(memberT, memberU))

        val result = TypeParamsReferencedInTree(scope, classWithMembers)

        assert(result.length == 2)
        assert(result.contains(tparamT))
        assert(result.contains(tparamU))
      }

      test("type parameter not in scope is ignored") {
        val tparamT = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparamT.name -> tparamT)

        val typeRefU = createTypeRef("U") // U is not in scope
        val member = createMemberProperty("prop", typeRefU)
        val classWithMember = createMockClass("TestClass", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, classWithMember)

        assert(result.isEmpty)
      }
    }

    test("TypeParamsReferencedInTree - Upper Bounds Handling") {
      test("type parameter with upper bound referencing another type parameter") {
        val tparamT = createTypeParam("T")
        val tparamU = createTypeParam("U", upperBound = Some(createTypeRef("T")))
        val scope = Map[TsIdent, TsTypeParam](tparamT.name -> tparamT, tparamU.name -> tparamU)

        val typeRefU = createTypeRef("U")
        val member = createMemberProperty("prop", typeRefU)
        val classWithMember = createMockClass("TestClass", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, classWithMember)

        // Should include both U (directly referenced) and T (referenced in U's bound)
        assert(result.length == 2)
        assert(result.contains(tparamT))
        assert(result.contains(tparamU))
      }

      test("type parameter with upper bound not referencing type parameters") {
        val tparamT = createTypeParam("T", upperBound = Some(createTypeRef("string")))
        val scope = Map[TsIdent, TsTypeParam](tparamT.name -> tparamT)

        val typeRefT = createTypeRef("T")
        val member = createMemberProperty("prop", typeRefT)
        val classWithMember = createMockClass("TestClass", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, classWithMember)

        // Should only include T, not string (which is not a type parameter)
        assert(result.length == 1)
        assert(result.head == tparamT)
      }

      test("chained type parameter bounds") {
        val tparamT = createTypeParam("T")
        val tparamU = createTypeParam("U", upperBound = Some(createTypeRef("T")))
        val tparamV = createTypeParam("V", upperBound = Some(createTypeRef("U")))
        val scope = Map[TsIdent, TsTypeParam](
          tparamT.name -> tparamT,
          tparamU.name -> tparamU,
          tparamV.name -> tparamV
        )

        val typeRefV = createTypeRef("V")
        val member = createMemberProperty("prop", typeRefV)
        val classWithMember = createMockClass("TestClass", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, classWithMember)

        // Based on the actual implementation, it only looks at direct bounds, not recursive bounds
        // Should include V (directly referenced) and U (in V's bound), but not T (in U's bound)
        assert(result.length == 2)
        assert(result.contains(tparamU))
        assert(result.contains(tparamV))
        // T is not included because the algorithm doesn't recursively traverse bounds
        assert(!result.contains(tparamT))
      }

      test("type parameter with bound referencing non-existent type parameter") {
        val tparamT = createTypeParam("T", upperBound = Some(createTypeRef("NonExistent")))
        val scope = Map[TsIdent, TsTypeParam](tparamT.name -> tparamT)

        val typeRefT = createTypeRef("T")
        val member = createMemberProperty("prop", typeRefT)
        val classWithMember = createMockClass("TestClass", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, classWithMember)

        // Should only include T, not NonExistent (which is not in scope)
        assert(result.length == 1)
        assert(result.head == tparamT)
      }
    }

    test("TypeParamsReferencedInTree - Scope Shadowing") {
      test("inner scope shadows outer type parameter") {
        val outerTparam = createTypeParam("T")
        val innerTparam = createTypeParam("T") // Same name, different instance
        val scope = Map[TsIdent, TsTypeParam](outerTparam.name -> outerTparam)

        val typeRef = createTypeRef("T")
        val member = createMemberProperty("prop", typeRef)
        val innerClass = createMockClass("InnerClass", tparams = IArray(innerTparam), members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, innerClass)

        // The inner T should shadow the outer T, so no type parameters from scope should be referenced
        assert(result.isEmpty)
      }

      test("type parameter reference in nested structure") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)

        val typeRef = createTypeRef("T")
        val member = createMemberProperty("prop", typeRef)
        val innerClass = createMockClass("InnerClass", members = IArray(member))

        // Create a module that contains the inner class
        val module = TsDeclModule(
          comments = NoComments,
          declared = false,
          name = TsIdentModule.simple("TestModule"),
          members = IArray(innerClass),
          codePath = CodePath.NoPath,
          jsLocation = JsLocation.Zero
        )

        val result = TypeParamsReferencedInTree(scope, module)

        // Should find T referenced in the nested structure
        assert(result.length == 1)
        assert(result.head == tparam)
      }

      test("multiple scopes with different type parameters") {
        val tparamT = createTypeParam("T")
        val tparamU = createTypeParam("U")
        val scope = Map[TsIdent, TsTypeParam](tparamT.name -> tparamT, tparamU.name -> tparamU)

        val typeRefT = createTypeRef("T")
        val typeRefU = createTypeRef("U")
        val memberT = createMemberProperty("propT", typeRefT)
        val memberU = createMemberProperty("propU", typeRefU)

        // Inner class has its own T parameter, which should shadow the outer T
        val innerTparam = createTypeParam("T")
        val innerClass = createMockClass("InnerClass", tparams = IArray(innerTparam), members = IArray(memberT, memberU))

        val result = TypeParamsReferencedInTree(scope, innerClass)

        // Should only find U (T is shadowed by inner class's T parameter)
        assert(result.length == 1)
        assert(result.head == tparamU)
      }
    }

    test("TypeParamsReferencedInTree - Different Tree Types") {
      test("type parameter reference in interface") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)

        val typeRef = createTypeRef("T")
        val member = createMemberProperty("prop", typeRef)
        val interface = createMockInterface("TestInterface", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, interface)

        assert(result.length == 1)
        assert(result.head == tparam)
      }

      test("type parameter reference in function signature") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)

        val typeRef = createTypeRef("T")
        val funSig = TsFunSig(
          comments = NoComments,
          tparams = Empty,
          params = Empty,
          resultType = Some(typeRef)
        )

        val result = TypeParamsReferencedInTree(scope, funSig)

        assert(result.length == 1)
        assert(result.head == tparam)
      }

      test("type parameter reference in type alias") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)

        val typeRef = createTypeRef("T")
        val typeAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("MyAlias"),
          tparams = Empty,
          alias = typeRef,
          codePath = CodePath.NoPath
        )

        val result = TypeParamsReferencedInTree(scope, typeAlias)

        assert(result.length == 1)
        assert(result.head == tparam)
      }
    }

    test("TypeParamsReferencedInTree - Edge Cases and Error Conditions") {
      test("qualified type reference with multiple parts") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)

        // Create a qualified type reference like "SomeNamespace.T"
        val qualifiedTypeRef = TsTypeRef(
          NoComments,
          TsQIdent(IArray(createSimpleIdent("SomeNamespace"), createSimpleIdent("T"))),
          Empty
        )
        val member = createMemberProperty("prop", qualifiedTypeRef)
        val classWithMember = createMockClass("TestClass", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, classWithMember)

        // Should not find T because it's qualified (not a simple reference)
        assert(result.isEmpty)
      }

      test("type parameter with generic type arguments") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)

        // Create a type reference like "Array<T>"
        val arrayTypeRef = createTypeRef("Array", IArray(createTypeRef("T")))
        val member = createMemberProperty("prop", arrayTypeRef)
        val classWithMember = createMockClass("TestClass", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, classWithMember)

        // Should find T in the type arguments
        assert(result.length == 1)
        assert(result.head == tparam)
      }

      test("duplicate type parameter references") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)

        val typeRef1 = createTypeRef("T")
        val typeRef2 = createTypeRef("T")
        val member1 = createMemberProperty("prop1", typeRef1)
        val member2 = createMemberProperty("prop2", typeRef2)
        val classWithMembers = createMockClass("TestClass", members = IArray(member1, member2))

        val result = TypeParamsReferencedInTree(scope, classWithMembers)

        // Should only return T once (distinct)
        assert(result.length == 1)
        assert(result.head == tparam)
      }

      test("empty tree") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)

        val emptyClass = createMockClass("EmptyClass")

        val result = TypeParamsReferencedInTree(scope, emptyClass)

        assert(result.isEmpty)
      }

      test("type parameter with complex bound structure") {
        val tparamT = createTypeParam("T")
        val tparamU = createTypeParam("U")

        // Create a complex bound: U extends Array<T>
        val complexBound = createTypeRef("Array", IArray(createTypeRef("T")))
        val tparamV = createTypeParam("V", upperBound = Some(complexBound))

        val scope = Map[TsIdent, TsTypeParam](
          tparamT.name -> tparamT,
          tparamU.name -> tparamU,
          tparamV.name -> tparamV
        )

        val typeRefV = createTypeRef("V")
        val member = createMemberProperty("prop", typeRefV)
        val classWithMember = createMockClass("TestClass", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, classWithMember)

        // Should include V (directly referenced) and T (in V's bound)
        assert(result.length == 2)
        assert(result.contains(tparamT))
        assert(result.contains(tparamV))
        // U is not referenced
        assert(!result.contains(tparamU))
      }
    }

    test("TypeParamsReferencedInTree - Performance and Stress Tests") {
      test("large number of type parameters") {
        val tparams = (1 to 50).map(i => createTypeParam(s"T$i")).toArray
        val scope = Map[TsIdent, TsTypeParam](tparams.map(tp => tp.name -> tp)*)

        // Reference every other type parameter
        val members = tparams.zipWithIndex.collect {
          case (tp, i) if i % 2 == 0 => createMemberProperty(s"prop$i", createTypeRef(tp.name.value))
        }
        val classWithMembers = createMockClass("LargeClass", members = IArray.fromArray(members))

        val result = TypeParamsReferencedInTree(scope, classWithMembers)

        // Should find 25 type parameters (every other one)
        assert(result.length == 25)
        assert(result.forall(tp => tp.name.value.startsWith("T")))
      }

      test("deeply nested type references") {
        val tparam = createTypeParam("T")
        val scope = Map[TsIdent, TsTypeParam](tparam.name -> tparam)

        // Create nested generic types: Promise<Array<Map<string, T>>>
        val deepTypeRef = createTypeRef("Promise", IArray(
          createTypeRef("Array", IArray(
            createTypeRef("Map", IArray(
              createTypeRef("string"),
              createTypeRef("T")
            ))
          ))
        ))

        val member = createMemberProperty("prop", deepTypeRef)
        val classWithMember = createMockClass("TestClass", members = IArray(member))

        val result = TypeParamsReferencedInTree(scope, classWithMember)

        // Should find T even in deeply nested structure
        assert(result.length == 1)
        assert(result.head == tparam)
      }

      test("complex tree with many different constructs") {
        val tparamT = createTypeParam("T")
        val tparamU = createTypeParam("U", upperBound = Some(createTypeRef("T")))
        val scope = Map[TsIdent, TsTypeParam](tparamT.name -> tparamT, tparamU.name -> tparamU)

        // Create various members using the type parameters
        val prop1 = createMemberProperty("prop1", createTypeRef("T"))
        val prop2 = createMemberProperty("prop2", createTypeRef("U"))
        val prop3 = createMemberProperty("prop3", createTypeRef("Array", IArray(createTypeRef("T"))))

        val funSig = TsFunSig(
          comments = NoComments,
          tparams = Empty,
          params = IArray(TsFunParam(NoComments, createSimpleIdent("param"), Some(createTypeRef("U")))),
          resultType = Some(createTypeRef("T"))
        )

        val method = TsMemberFunction(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = createSimpleIdent("method"),
          methodType = MethodType.Normal,
          signature = funSig,
          isStatic = false,
          isReadOnly = false
        )

        val classWithMembers = createMockClass("ComplexClass", members = IArray(prop1, prop2, prop3, method))

        val result = TypeParamsReferencedInTree(scope, classWithMembers)

        // Should find both T and U
        assert(result.length == 2)
        assert(result.contains(tparamT))
        assert(result.contains(tparamU))
      }
    }
  }
}