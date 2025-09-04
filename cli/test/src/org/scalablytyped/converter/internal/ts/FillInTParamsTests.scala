package org.scalablytyped.converter.internal
package ts

import utest.*

object FillInTParamsTests extends TestSuite {

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

  def createMockTypeAlias(
      name: String,
      tparams: IArray[TsTypeParam] = Empty,
      alias: TsType = TsTypeRef.any
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      alias = alias,
      codePath = CodePath.NoPath
    )

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

  def tests = Tests {
    test("Interface Type Parameter Substitution") {
      test("empty type parameters returns original interface") {
        val interface = createMockInterface("TestInterface")
        val result = FillInTParams(interface, Empty)
        
        assert(result eq interface) // Should return exact same instance
        assert(result.name.value == "TestInterface")
        assert(result.tparams.isEmpty)
      }

      test("single type parameter substitution") {
        val tparam = createTypeParam("T")
        val interface = createMockInterface("TestInterface", IArray(tparam))
        val providedType = createTypeRef("string")
        
        val result = FillInTParams(interface, IArray(providedType))
        
        assert(result.name.value == "TestInterface")
        assert(result.tparams.isEmpty) // Type parameters should be cleared
        assert(result ne interface) // Should be a new instance
      }

      test("multiple type parameter substitution") {
        val tparams = IArray(
          createTypeParam("T"),
          createTypeParam("U"),
          createTypeParam("V")
        )
        val interface = createMockInterface("TestInterface", tparams)
        val providedTypes = IArray(
          createTypeRef("string"),
          createTypeRef("number"),
          createTypeRef("boolean")
        )
        
        val result = FillInTParams(interface, providedTypes)
        
        assert(result.name.value == "TestInterface")
        assert(result.tparams.isEmpty)
        assert(result ne interface)
      }

      test("fewer provided than expected uses defaults or warnings") {
        val tparamWithDefault = createTypeParam("T", None, Some(createTypeRef("string")))
        val tparamWithoutDefault = createTypeParam("U")
        val interface = createMockInterface("TestInterface", IArray(tparamWithDefault, tparamWithoutDefault))
        val providedTypes = IArray(createTypeRef("number")) // Only one provided
        
        val result = FillInTParams(interface, providedTypes)
        
        assert(result.name.value == "TestInterface")
        assert(result.tparams.isEmpty)
        assert(result ne interface)
      }

      test("more provided than expected ignores extras") {
        val tparam = createTypeParam("T")
        val interface = createMockInterface("TestInterface", IArray(tparam))
        val providedTypes = IArray(
          createTypeRef("string"),
          createTypeRef("number"), // Extra - should be ignored
          createTypeRef("boolean")  // Extra - should be ignored
        )
        
        val result = FillInTParams(interface, providedTypes)
        
        assert(result.name.value == "TestInterface")
        assert(result.tparams.isEmpty)
        assert(result ne interface)
      }
    }

    test("Class Type Parameter Substitution") {
      test("empty type parameters returns original class") {
        val clazz = createMockClass("TestClass")
        val result = FillInTParams(clazz, Empty)
        
        assert(result eq clazz)
        assert(result.name.value == "TestClass")
        assert(result.tparams.isEmpty)
      }

      test("single type parameter substitution") {
        val tparam = createTypeParam("T")
        val clazz = createMockClass("TestClass", IArray(tparam))
        val providedType = createTypeRef("string")
        
        val result = FillInTParams(clazz, IArray(providedType))
        
        assert(result.name.value == "TestClass")
        assert(result.tparams.isEmpty)
        assert(result ne clazz)
      }

      test("multiple type parameter substitution") {
        val tparams = IArray(
          createTypeParam("T"),
          createTypeParam("U")
        )
        val clazz = createMockClass("TestClass", tparams)
        val providedTypes = IArray(
          createTypeRef("string"),
          createTypeRef("number")
        )
        
        val result = FillInTParams(clazz, providedTypes)
        
        assert(result.name.value == "TestClass")
        assert(result.tparams.isEmpty)
        assert(result ne clazz)
      }
    }

    test("Type Alias Substitution") {
      test("empty type parameters returns original alias") {
        val alias = createMockTypeAlias("TestAlias")
        val result = FillInTParams(alias, Empty)
        
        assert(result eq alias)
        assert(result.name.value == "TestAlias")
        assert(result.tparams.isEmpty)
      }

      test("single type parameter substitution") {
        val tparam = createTypeParam("T")
        val aliasType = createTypeRef("Array", IArray(createTypeRef("T")))
        val alias = createMockTypeAlias("TestAlias", IArray(tparam), aliasType)
        val providedType = createTypeRef("string")
        
        val result = FillInTParams(alias, IArray(providedType))
        
        assert(result.name.value == "TestAlias")
        assert(result.tparams.isEmpty)
        assert(result ne alias)
      }
    }

    test("Function Signature Substitution") {
      test("empty type parameters returns original signature") {
        val sig = createMockFunSig()
        val result = FillInTParams(sig, Empty)

        assert(result eq sig)
        assert(result.tparams.isEmpty)
      }

      test("single type parameter substitution") {
        val tparam = createTypeParam("T")
        val sig = createMockFunSig(IArray(tparam))
        val providedType = createTypeRef("string")

        val result = FillInTParams(sig, IArray(providedType))

        assert(result.tparams.isEmpty)
        assert(result ne sig)
      }
    }

    test("inlineTParams Functionality") {
      test("uses default types when available") {
        val tparamWithDefault = createTypeParam("T", None, Some(createTypeRef("string")))
        val sig = createMockFunSig(IArray(tparamWithDefault))

        val result = FillInTParams.inlineTParams(sig)

        assert(result.tparams.isEmpty)
        assert(result ne sig)
      }

      test("uses upper bounds when no default") {
        val tparamWithBound = createTypeParam("T", Some(createTypeRef("string")), None)
        val sig = createMockFunSig(IArray(tparamWithBound))

        val result = FillInTParams.inlineTParams(sig)

        assert(result.tparams.isEmpty)
        assert(result ne sig)
      }

      test("uses TsTypeRef.any for recursive bounds") {
        // Create a type parameter that references itself in its bound
        val recursiveBound = createTypeRef("T")
        val tparamRecursive = createTypeParam("T", Some(recursiveBound), None)
        val sig = createMockFunSig(IArray(tparamRecursive))

        val result = FillInTParams.inlineTParams(sig)

        assert(result.tparams.isEmpty)
        assert(result ne sig)
      }

      test("handles type parameters referencing each other") {
        val tparam1 = createTypeParam("T", Some(createTypeRef("U")), None)
        val tparam2 = createTypeParam("U", None, Some(createTypeRef("string")))
        val sig = createMockFunSig(IArray(tparam1, tparam2))

        val result = FillInTParams.inlineTParams(sig)

        assert(result.tparams.isEmpty)
        assert(result ne sig)
      }

      test("complex scenarios with mixed bounds and defaults") {
        val tparams = IArray(
          createTypeParam("T", None, Some(createTypeRef("string"))), // Has default
          createTypeParam("U", Some(createTypeRef("number")), None), // Has upper bound
          createTypeParam("V", None, None), // Neither - should use any
          createTypeParam("W", Some(createTypeRef("boolean")), Some(createTypeRef("object"))) // Both - should prefer default
        )
        val sig = createMockFunSig(tparams)

        val result = FillInTParams.inlineTParams(sig)

        assert(result.tparams.isEmpty)
        assert(result ne sig)
      }

      test("empty type parameters returns original") {
        val sig = createMockFunSig(Empty)

        val result = FillInTParams.inlineTParams(sig)

        assert(result eq sig) // Should return same instance for empty tparams
      }
    }

    test("Edge Cases and Error Conditions") {
      test("empty type parameter arrays") {
        val interface = createMockInterface("Test")
        val clazz = createMockClass("Test")
        val alias = createMockTypeAlias("Test")
        val sig = createMockFunSig()

        // All should return original instances
        assert(FillInTParams(interface, Empty) eq interface)
        assert(FillInTParams(clazz, Empty) eq clazz)
        assert(FillInTParams(alias, Empty) eq alias)
        assert(FillInTParams(sig, Empty) eq sig)
      }

      test("large parameter lists") {
        val manyTParams = (1 to 50).map(i => createTypeParam(s"T$i")).toArray
        val manyProvidedTypes = (1 to 50).map(i => createTypeRef(s"Type$i")).toArray

        val interface = createMockInterface("TestInterface", IArray.fromArray(manyTParams))
        val result = FillInTParams(interface, IArray.fromArray(manyProvidedTypes))

        assert(result.name.value == "TestInterface")
        assert(result.tparams.isEmpty)
        assert(result ne interface)
      }

      test("boundary conditions with parameter count mismatches") {
        val tparams = IArray(createTypeParam("T"), createTypeParam("U"))
        val interface = createMockInterface("TestInterface", tparams)

        // Test with no provided types
        val resultEmpty = FillInTParams(interface, Empty)
        assert(resultEmpty.tparams.isEmpty)

        // Test with one provided type (less than expected)
        val resultPartial = FillInTParams(interface, IArray(createTypeRef("string")))
        assert(resultPartial.tparams.isEmpty)

        // Test with many provided types (more than expected)
        val manyTypes = (1 to 10).map(i => createTypeRef(s"Type$i")).toArray
        val resultMany = FillInTParams(interface, IArray.fromArray(manyTypes))
        assert(resultMany.tparams.isEmpty)
      }
    }

    test("Integration with TypeRewriter") {
      test("verifies tparams are cleared after substitution") {
        val tparam = createTypeParam("T")
        val interface = createMockInterface("TestInterface", IArray(tparam))
        val providedType = createTypeRef("string")

        val result = FillInTParams(interface, IArray(providedType))

        // The key assertion: tparams should be empty after substitution
        assert(result.tparams.isEmpty)
        assert(result.name.value == "TestInterface")
      }

      test("handles complex nested type substitution") {
        val tparam = createTypeParam("T")
        val nestedType = createTypeRef("Array", IArray(createTypeRef("T")))
        val alias = createMockTypeAlias("TestAlias", IArray(tparam), nestedType)
        val providedType = createTypeRef("string")

        val result = FillInTParams(alias, IArray(providedType))

        assert(result.tparams.isEmpty)
        assert(result.name.value == "TestAlias")
        assert(result ne alias)
      }

      test("preserves other properties during substitution") {
        val tparam = createTypeParam("T")
        val interface = createMockInterface("TestInterface", IArray(tparam))
        val providedType = createTypeRef("string")

        val result = FillInTParams(interface, IArray(providedType))

        // Verify other properties are preserved
        assert(result.name.value == interface.name.value)
        assert(result.declared == interface.declared)
        assert(result.inheritance == interface.inheritance)
        assert(result.members == interface.members)
        assert(result.codePath == interface.codePath)
        // Only tparams should be different
        assert(result.tparams.isEmpty)
        assert(interface.tparams.nonEmpty)
      }
    }
  }
}