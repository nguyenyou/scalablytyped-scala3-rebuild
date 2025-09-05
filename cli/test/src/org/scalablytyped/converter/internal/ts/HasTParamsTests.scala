package org.scalablytyped.converter.internal
package ts

import utest.*

object HasTParamsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createMockTypeParam(
      name: String,
      upperBound: Option[TsType] = None,
      default: Option[TsType] = None
  ): TsTypeParam =
    TsTypeParam(
      comments = NoComments,
      name = createSimpleIdent(name),
      upperBound = upperBound,
      default = default
    )

  def createMockClass(
      name: String,
      tparams: IArray[TsTypeParam] = Empty
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      parent = None,
      implements = Empty,
      members = Empty,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockInterface(
      name: String,
      tparams: IArray[TsTypeParam] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      inheritance = Empty,
      members = Empty,
      codePath = CodePath.NoPath
    )

  def createMockTypeAlias(
      name: String,
      tparams: IArray[TsTypeParam] = Empty
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      alias = TsTypeRef.any,
      codePath = CodePath.NoPath
    )

  def createMockFunSig(
      tparams: IArray[TsTypeParam] = Empty
  ): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = tparams,
      params = Empty,
      resultType = Some(TsTypeRef.any)
    )

  def createMockFunction(
      name: String,
      tparams: IArray[TsTypeParam] = Empty
  ): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = createMockFunSig(tparams),
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockMemberFunction(
      name: String,
      tparams: IArray[TsTypeParam] = Empty
  ): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = createMockFunSig(tparams),
      isStatic = false,
      isReadOnly = false
    )

  def createMockMemberCall(
      tparams: IArray[TsTypeParam] = Empty
  ): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = createMockFunSig(tparams)
    )

  def createMockMemberCtor(
      tparams: IArray[TsTypeParam] = Empty
  ): TsMemberCtor =
    TsMemberCtor(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = createMockFunSig(tparams)
    )

  def createMockTypeFunction(
      tparams: IArray[TsTypeParam] = Empty
  ): TsTypeFunction =
    TsTypeFunction(createMockFunSig(tparams))

  def createMockTypeConditional(
      withInfer: Boolean = false
  ): TsTypeConditional = {
    val pred = if (withInfer) {
      val inferParam = createMockTypeParam("R")
      TsTypeInfer(inferParam)
    } else {
      TsTypeRef.any
    }
    
    TsTypeConditional(
      pred = pred,
      ifTrue = TsTypeRef.string,
      ifFalse = TsTypeRef.any
    )
  }

  // Create an unsupported tree type for testing default case
  def createMockUnsupportedTree(): TsTree = TsTypeRef.any

  def tests = Tests {
    test("HasTParams - apply method") {
      test("returns Empty when unapply returns None") {
        val unsupportedTree = createMockUnsupportedTree()
        val result = HasTParams.apply(unsupportedTree)
        
        assert(result.isEmpty)
        assert(result == Empty)
      }

      test("returns tparams when unapply returns Some") {
        val tparam = createMockTypeParam("T")
        val mockClass = createMockClass("TestClass", IArray(tparam))
        val result = HasTParams.apply(mockClass)
        
        assert(result.length == 1)
        assert(result.head == tparam)
      }

      test("returns Empty for empty tparams") {
        val mockClass = createMockClass("TestClass", Empty)
        val result = HasTParams.apply(mockClass)
        
        assert(result.isEmpty)
      }
    }

    test("HasTParams - unapply method - Positive Cases") {
      test("TsDeclClass with type parameters") {
        val tparam1 = createMockTypeParam("T")
        val tparam2 = createMockTypeParam("U")
        val mockClass = createMockClass("TestClass", IArray(tparam1, tparam2))
        val result = HasTParams.unapply(mockClass)
        
        assert(result.isDefined)
        assert(result.get.length == 2)
        assert(result.get.head == tparam1)
        assert(result.get(1) == tparam2)
      }

      test("TsDeclInterface with type parameters") {
        val tparam = createMockTypeParam("T")
        val mockInterface = createMockInterface("TestInterface", IArray(tparam))
        val result = HasTParams.unapply(mockInterface)
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == tparam)
      }

      test("TsDeclTypeAlias with type parameters") {
        val tparam = createMockTypeParam("T")
        val mockTypeAlias = createMockTypeAlias("TestType", IArray(tparam))
        val result = HasTParams.unapply(mockTypeAlias)
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == tparam)
      }

      test("TsDeclFunction with signature type parameters") {
        val tparam = createMockTypeParam("T")
        val mockFunction = createMockFunction("testFunc", IArray(tparam))
        val result = HasTParams.unapply(mockFunction)
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == tparam)
      }

      test("TsMemberFunction with signature type parameters") {
        val tparam = createMockTypeParam("T")
        val mockMemberFunction = createMockMemberFunction("testMethod", IArray(tparam))
        val result = HasTParams.unapply(mockMemberFunction)
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == tparam)
      }

      test("TsMemberCall with signature type parameters") {
        val tparam = createMockTypeParam("T")
        val mockMemberCall = createMockMemberCall(IArray(tparam))
        val result = HasTParams.unapply(mockMemberCall)
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == tparam)
      }

      test("TsMemberCtor with signature type parameters") {
        val tparam = createMockTypeParam("T")
        val mockMemberCtor = createMockMemberCtor(IArray(tparam))
        val result = HasTParams.unapply(mockMemberCtor)
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == tparam)
      }

      test("TsTypeFunction with signature type parameters") {
        val tparam = createMockTypeParam("T")
        val mockTypeFunction = createMockTypeFunction(IArray(tparam))
        val result = HasTParams.unapply(mockTypeFunction)
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == tparam)
      }

      test("TsFunSig with type parameters") {
        val tparam = createMockTypeParam("T")
        val mockFunSig = createMockFunSig(IArray(tparam))
        val result = HasTParams.unapply(mockFunSig)
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == tparam)
      }

      test("TsTypeConditional with TsTypeInfer") {
        val mockTypeConditional = createMockTypeConditional(withInfer = true)
        val result = HasTParams.unapply(mockTypeConditional)

        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head.name.value == "R")
      }
    }

    test("HasTParams - unapply method - Empty Cases") {
      test("TsDeclClass with empty type parameters") {
        val mockClass = createMockClass("TestClass", Empty)
        val result = HasTParams.unapply(mockClass)

        assert(result.isDefined)
        assert(result.get.isEmpty)
      }

      test("TsDeclInterface with empty type parameters") {
        val mockInterface = createMockInterface("TestInterface", Empty)
        val result = HasTParams.unapply(mockInterface)

        assert(result.isDefined)
        assert(result.get.isEmpty)
      }

      test("TsDeclTypeAlias with empty type parameters") {
        val mockTypeAlias = createMockTypeAlias("TestType", Empty)
        val result = HasTParams.unapply(mockTypeAlias)

        assert(result.isDefined)
        assert(result.get.isEmpty)
      }

      test("TsFunSig with empty type parameters") {
        val mockFunSig = createMockFunSig(Empty)
        val result = HasTParams.unapply(mockFunSig)

        assert(result.isDefined)
        assert(result.get.isEmpty)
      }
    }

    test("HasTParams - unapply method - Negative Cases") {
      test("TsTypeConditional without TsTypeInfer") {
        val mockTypeConditional = createMockTypeConditional(withInfer = false)
        val result = HasTParams.unapply(mockTypeConditional)

        assert(result.isEmpty)
      }

      test("unsupported TsTree types return None") {
        val unsupportedTree = createMockUnsupportedTree()
        val result = HasTParams.unapply(unsupportedTree)

        assert(result.isEmpty)
      }

      test("TsTypeRef returns None") {
        val typeRef = TsTypeRef.string
        val result = HasTParams.unapply(typeRef)

        assert(result.isEmpty)
      }

      test("TsTypeLiteral returns None") {
        val literal = TsTypeLiteral(TsLiteral.Str("test"))
        val result = HasTParams.unapply(literal)

        assert(result.isEmpty)
      }
    }

    test("HasTParams - Edge Cases") {
      test("multiple type parameters with constraints") {
        val tparam1 = createMockTypeParam("T", upperBound = Some(TsTypeRef.string))
        val tparam2 = createMockTypeParam("U", default = Some(TsTypeRef.number))
        val tparam3 = createMockTypeParam("V",
          upperBound = Some(TsTypeRef.any),
          default = Some(TsTypeRef.boolean))

        val mockClass = createMockClass("TestClass", IArray(tparam1, tparam2, tparam3))
        val result = HasTParams.unapply(mockClass)

        assert(result.isDefined)
        assert(result.get.length == 3)
        assert(result.get(0).upperBound.isDefined)
        assert(result.get(1).default.isDefined)
        assert(result.get(2).upperBound.isDefined && result.get(2).default.isDefined)
      }

      test("nested type parameters in complex conditional type") {
        // Create a more complex conditional type with nested structure
        val inferParam = createMockTypeParam("R")
        val nestedInfer = TsTypeInfer(inferParam)
        val complexPred = TsTypeExtends(TsTypeRef.any, nestedInfer)

        val complexConditional = TsTypeConditional(
          pred = complexPred,
          ifTrue = TsTypeRef.string,
          ifFalse = TsTypeRef.any
        )

        val result = HasTParams.unapply(complexConditional)

        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head.name.value == "R")
      }

      test("large number of type parameters") {
        val tparams = (1 to 50).map(i => createMockTypeParam(s"T$i")).toArray
        val mockInterface = createMockInterface("TestInterface", IArray.fromArray(tparams))
        val result = HasTParams.unapply(mockInterface)

        assert(result.isDefined)
        assert(result.get.length == 50)
        assert(result.get.head.name.value == "T1")
        assert(result.get.last.name.value == "T50")
      }
    }

    test("HasTParams - Complex Scenarios") {
      test("consistency between apply and unapply") {
        val tparam = createMockTypeParam("T")
        val mockClass = createMockClass("TestClass", IArray(tparam))

        val applyResult = HasTParams.apply(mockClass)
        val unapplyResult = HasTParams.unapply(mockClass)

        assert(unapplyResult.isDefined)
        assert(applyResult == unapplyResult.get)
      }

      test("apply returns Empty for None unapply result") {
        val unsupportedTree = createMockUnsupportedTree()

        val applyResult = HasTParams.apply(unsupportedTree)
        val unapplyResult = HasTParams.unapply(unsupportedTree)

        assert(unapplyResult.isEmpty)
        assert(applyResult.isEmpty)
        assert(applyResult == Empty)
      }

      test("different tree types with same type parameters") {
        val tparam = createMockTypeParam("T")
        val tparams = IArray(tparam)

        val mockClass = createMockClass("TestClass", tparams)
        val mockInterface = createMockInterface("TestInterface", tparams)
        val mockTypeAlias = createMockTypeAlias("TestType", tparams)

        val classResult = HasTParams.apply(mockClass)
        val interfaceResult = HasTParams.apply(mockInterface)
        val typeAliasResult = HasTParams.apply(mockTypeAlias)

        assert(classResult == interfaceResult)
        assert(interfaceResult == typeAliasResult)
        assert(classResult.length == 1)
        assert(classResult.head == tparam)
      }

      test("function-related trees with same signature") {
        val tparam = createMockTypeParam("T")
        val signature = createMockFunSig(IArray(tparam))

        val mockFunction = createMockFunction("testFunc", IArray(tparam))
        val mockMemberFunction = createMockMemberFunction("testMethod", IArray(tparam))
        val mockMemberCall = createMockMemberCall(IArray(tparam))
        val mockMemberCtor = createMockMemberCtor(IArray(tparam))
        val mockTypeFunction = createMockTypeFunction(IArray(tparam))

        val functionResult = HasTParams.apply(mockFunction)
        val memberFunctionResult = HasTParams.apply(mockMemberFunction)
        val memberCallResult = HasTParams.apply(mockMemberCall)
        val memberCtorResult = HasTParams.apply(mockMemberCtor)
        val typeFunctionResult = HasTParams.apply(mockTypeFunction)
        val sigResult = HasTParams.apply(signature)

        assert(functionResult == memberFunctionResult)
        assert(memberFunctionResult == memberCallResult)
        assert(memberCallResult == memberCtorResult)
        assert(memberCtorResult == typeFunctionResult)
        assert(typeFunctionResult == sigResult)
        assert(functionResult.length == 1)
        assert(functionResult.head == tparam)
      }

      test("type parameter names and constraints preservation") {
        val tparam = createMockTypeParam("CustomName",
          upperBound = Some(TsTypeRef.string),
          default = Some(TsTypeRef.any))
        val mockClass = createMockClass("TestClass", IArray(tparam))
        val result = HasTParams.apply(mockClass)

        assert(result.length == 1)
        val retrievedParam = result.head
        assert(retrievedParam.name.value == "CustomName")
        assert(retrievedParam.upperBound.isDefined)
        assert(retrievedParam.default.isDefined)
        assert(retrievedParam.upperBound.get == TsTypeRef.string)
        assert(retrievedParam.default.get == TsTypeRef.any)
      }
    }

    test("HasTParams - Error Handling and Robustness") {
      test("handles empty conditional type predicate") {
        // Test with a conditional type that has an empty predicate structure
        val emptyConditional = TsTypeConditional(
          pred = TsTypeRef.any,
          ifTrue = TsTypeRef.string,
          ifFalse = TsTypeRef.any
        )

        val result = HasTParams.unapply(emptyConditional)
        assert(result.isEmpty)
      }

      test("maintains referential equality for same type parameters") {
        val tparam = createMockTypeParam("T")
        val mockClass = createMockClass("TestClass", IArray(tparam))

        val result1 = HasTParams.apply(mockClass)
        val result2 = HasTParams.apply(mockClass)

        assert(result1 == result2)
        assert(result1.head eq result2.head) // Same reference
      }

      test("handles mixed empty and non-empty scenarios") {
        val emptyClass = createMockClass("EmptyClass", Empty)
        val nonEmptyClass = createMockClass("NonEmptyClass",
          IArray(createMockTypeParam("T")))

        val emptyResult = HasTParams.apply(emptyClass)
        val nonEmptyResult = HasTParams.apply(nonEmptyClass)

        assert(emptyResult.isEmpty)
        assert(nonEmptyResult.nonEmpty)
        assert(emptyResult != nonEmptyResult)
      }
    }
  }
}