package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object NormalizeFunctionsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createFunSig(
    params: IArray[TsFunParam] = Empty,
    resultType: Option[TsType] = Some(createTypeRef("void"))
  ): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = Empty,
      params = params,
      resultType = resultType
    )

  def createFunParam(name: String, tpe: TsType = createTypeRef("any")): TsFunParam =
    TsFunParam(
      comments = NoComments,
      name = createSimpleIdent(name),
      tpe = Some(tpe)
    )

  def createTypeFunction(sig: TsFunSig): TsTypeFunction =
    TsTypeFunction(sig)

  def createTypeObject(members: IArray[TsMember]): TsTypeObject =
    TsTypeObject(NoComments, members)

  def createMemberCall(sig: TsFunSig): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = sig
    )

  def createMemberProperty(
    name: String,
    tpe: Option[TsType] = None,
    isStatic: Boolean = false,
    isReadOnly: Boolean = false
  ): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
      isStatic = isStatic,
      isReadOnly = isReadOnly
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
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
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
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockVar(
    name: String,
    tpe: Option[TsType] = None,
    isReadOnly: Boolean = true
  ): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = isReadOnly,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockScope(declarations: TsContainerOrDecl*): TsTreeScope = {
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

  def tests = Tests {
    test("NormalizeFunctions - Basic Functionality") {
      test("extends TransformMembers and TransformClassMembers") {
        assert(NormalizeFunctions.isInstanceOf[TransformMembers])
        assert(NormalizeFunctions.isInstanceOf[TransformClassMembers])
      }

      test("has newClassMembers method") {
        val scope = createMockScope()
        val clazz = createMockClass("TestClass")
        val result = NormalizeFunctions.newClassMembers(scope, clazz)
        assert(result != null)
        assert(result.isInstanceOf[IArray[TsMember]])
      }

      test("has newMembers method") {
        val scope = createMockScope()
        val parsedFile = TsParsedFile(NoComments, Empty, Empty, CodePath.NoPath)
        val result = NormalizeFunctions.newMembers(scope, parsedFile)
        assert(result != null)
        assert(result.isInstanceOf[IArray[TsContainerOrDecl]])
      }

      test("has enterTsType method") {
        val scope = createMockScope()
        val typeRef = createTypeRef("string")
        val result = NormalizeFunctions.enterTsType(scope)(typeRef)
        assert(result != null)
        assert(result.isInstanceOf[TsType])
      }
    }

    test("NormalizeFunctions - ToRewrite Pattern Matching") {
      test("matches TsTypeFunction") {
        val sig = createFunSig()
        val funType = createTypeFunction(sig)
        
        // Use reflection to access the private ToRewrite object
        val toRewriteClass = Class.forName("org.scalablytyped.converter.internal.ts.transforms.NormalizeFunctions$ToRewrite$")
        val toRewriteInstance = toRewriteClass.getField("MODULE$").get(null)
        val unapplyMethod = toRewriteClass.getMethod("unapply", classOf[TsType])
        val result = unapplyMethod.invoke(toRewriteInstance, funType).asInstanceOf[Option[IArray[TsFunSig]]]
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == sig)
      }

      test("matches TsTypeObject with only call signatures") {
        val sig = createFunSig()
        val callMember = createMemberCall(sig)
        val objType = createTypeObject(IArray(callMember))
        
        val toRewriteClass = Class.forName("org.scalablytyped.converter.internal.ts.transforms.NormalizeFunctions$ToRewrite$")
        val toRewriteInstance = toRewriteClass.getField("MODULE$").get(null)
        val unapplyMethod = toRewriteClass.getMethod("unapply", classOf[TsType])
        val result = unapplyMethod.invoke(toRewriteInstance, objType).asInstanceOf[Option[IArray[TsFunSig]]]
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == sig)
      }

      test("does not match TsTypeObject with mixed members") {
        val sig = createFunSig()
        val callMember = createMemberCall(sig)
        val propMember = createMemberProperty("prop", Some(createTypeRef("string")))
        val objType = createTypeObject(IArray(callMember, propMember))
        
        val toRewriteClass = Class.forName("org.scalablytyped.converter.internal.ts.transforms.NormalizeFunctions$ToRewrite$")
        val toRewriteInstance = toRewriteClass.getField("MODULE$").get(null)
        val unapplyMethod = toRewriteClass.getMethod("unapply", classOf[TsType])
        val result = unapplyMethod.invoke(toRewriteInstance, objType).asInstanceOf[Option[IArray[TsFunSig]]]
        
        assert(result.isEmpty)
      }

      test("does not match other types") {
        val stringType = createTypeRef("string")
        
        val toRewriteClass = Class.forName("org.scalablytyped.converter.internal.ts.transforms.NormalizeFunctions$ToRewrite$")
        val toRewriteInstance = toRewriteClass.getField("MODULE$").get(null)
        val unapplyMethod = toRewriteClass.getMethod("unapply", classOf[TsType])
        val result = unapplyMethod.invoke(toRewriteInstance, stringType).asInstanceOf[Option[IArray[TsFunSig]]]
        
        assert(result.isEmpty)
      }
    }

    test("NormalizeFunctions - Class Member Transformation") {
      test("converts function property to method") {
        val scope = createMockScope()
        val sig = createFunSig(
          params = IArray(createFunParam("x", createTypeRef("number"))),
          resultType = Some(createTypeRef("string"))
        )
        val funType = createTypeFunction(sig)
        val prop = createMemberProperty("myMethod", Some(funType))
        val clazz = createMockClass("TestClass", IArray(prop))
        
        val result = NormalizeFunctions.newClassMembers(scope, clazz)
        
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberFunction])
        val func = result.head.asInstanceOf[TsMemberFunction]
        assert(func.name.value == "myMethod")
        assert(func.methodType == MethodType.Normal)
        assert(func.signature == sig)
      }

      test("converts object type with call signature to method") {
        val scope = createMockScope()
        val sig = createFunSig(
          params = IArray(createFunParam("x", createTypeRef("number"))),
          resultType = Some(createTypeRef("string"))
        )
        val callMember = createMemberCall(sig)
        val objType = createTypeObject(IArray(callMember))
        val prop = createMemberProperty("myMethod", Some(objType))
        val clazz = createMockClass("TestClass", IArray(prop))
        
        val result = NormalizeFunctions.newClassMembers(scope, clazz)
        
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberFunction])
        val func = result.head.asInstanceOf[TsMemberFunction]
        assert(func.name.value == "myMethod")
        assert(func.signature == sig)
      }

      test("handles multiple call signatures") {
        val scope = createMockScope()
        val sig1 = createFunSig(
          params = IArray(createFunParam("x", createTypeRef("number"))),
          resultType = Some(createTypeRef("string"))
        )
        val sig2 = createFunSig(
          params = IArray(createFunParam("x", createTypeRef("string"))),
          resultType = Some(createTypeRef("number"))
        )
        val callMember1 = createMemberCall(sig1)
        val callMember2 = createMemberCall(sig2)
        val objType = createTypeObject(IArray(callMember1, callMember2))
        val prop = createMemberProperty("overloadedMethod", Some(objType))
        val clazz = createMockClass("TestClass", IArray(prop))
        
        val result = NormalizeFunctions.newClassMembers(scope, clazz)
        
        assert(result.length == 2)
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
        val func1 = result(0).asInstanceOf[TsMemberFunction]
        val func2 = result(1).asInstanceOf[TsMemberFunction]
        assert(func1.name.value == "overloadedMethod")
        assert(func2.name.value == "overloadedMethod")
        assert(func1.signature == sig1)
        assert(func2.signature == sig2)
      }

      test("preserves member metadata when converting") {
        val scope = createMockScope()
        val originalComments = Comments(Comment("Original property comment"))
        val sig = createFunSig()
        val funType = createTypeFunction(sig)
        val prop = TsMemberProperty(
          comments = originalComments,
          level = TsProtectionLevel.Private,
          name = createSimpleIdent("myMethod"),
          tpe = Some(funType),
          expr = None,
          isStatic = true,
          isReadOnly = true
        )
        val clazz = createMockClass("TestClass", IArray(prop))
        
        val result = NormalizeFunctions.newClassMembers(scope, clazz)
        
        assert(result.length == 1)
        val func = result.head.asInstanceOf[TsMemberFunction]
        assert(func.comments == originalComments)
        assert(func.level == TsProtectionLevel.Private)
        assert(func.isStatic == true)
        assert(func.isReadOnly == true)
      }

      test("leaves non-function properties unchanged") {
        val scope = createMockScope()
        val stringProp = createMemberProperty("stringProp", Some(createTypeRef("string")))
        val numberProp = createMemberProperty("numberProp", Some(createTypeRef("number")))
        val clazz = createMockClass("TestClass", IArray(stringProp, numberProp))
        
        val result = NormalizeFunctions.newClassMembers(scope, clazz)
        
        assert(result.length == 2)
        assert(result == IArray(stringProp, numberProp))
      }

      test("leaves properties with expressions unchanged") {
        val scope = createMockScope()
        val sig = createFunSig()
        val funType = createTypeFunction(sig)
        val propWithExpr = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = createSimpleIdent("myMethod"),
          tpe = Some(funType),
          expr = Some(TsExpr.Literal(TsLiteral.Str("value"))),
          isStatic = false,
          isReadOnly = false
        )
        val clazz = createMockClass("TestClass", IArray(propWithExpr))
        
        val result = NormalizeFunctions.newClassMembers(scope, clazz)
        
        assert(result.length == 1)
        assert(result.head == propWithExpr)
      }

      test("leaves properties without types unchanged") {
        val scope = createMockScope()
        val propWithoutType = createMemberProperty("prop", None)
        val clazz = createMockClass("TestClass", IArray(propWithoutType))
        
        val result = NormalizeFunctions.newClassMembers(scope, clazz)
        
        assert(result.length == 1)
        assert(result.head == propWithoutType)
      }
    }

    test("NormalizeFunctions - Type Transformation") {
      test("converts object type with single call signature to function type") {
        val scope = createMockScope()
        val sig = createFunSig()
        val callMember = createMemberCall(sig)
        val objType = createTypeObject(IArray(callMember))
        
        val result = NormalizeFunctions.enterTsType(scope)(objType)
        
        assert(result.isInstanceOf[TsTypeFunction])
        val funType = result.asInstanceOf[TsTypeFunction]
        assert(funType.signature == sig)
      }

      test("leaves object types with multiple members unchanged") {
        val scope = createMockScope()
        val sig = createFunSig()
        val callMember = createMemberCall(sig)
        val propMember = createMemberProperty("prop", Some(createTypeRef("string")))
        val objType = createTypeObject(IArray(callMember, propMember))
        
        val result = NormalizeFunctions.enterTsType(scope)(objType)
        
        assert(result == objType)
      }

      test("leaves other types unchanged") {
        val scope = createMockScope()
        val stringType = createTypeRef("string")
        val unionType = TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number")))
        
        val result1 = NormalizeFunctions.enterTsType(scope)(stringType)
        val result2 = NormalizeFunctions.enterTsType(scope)(unionType)
        
        assert(result1 == stringType)
        assert(result2 == unionType)
      }
    }

    test("NormalizeFunctions - Variable Declaration Transformation") {
      test("converts function variable to function declaration") {
        val scope = createMockScope()
        val sig = createFunSig(
          params = IArray(createFunParam("x", createTypeRef("number"))),
          resultType = Some(createTypeRef("string"))
        )
        val funType = createTypeFunction(sig)
        val varDecl = createMockVar("myFunction", Some(funType), isReadOnly = true)
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(varDecl), CodePath.NoPath)

        val result = NormalizeFunctions.newMembers(scope, parsedFile)

        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclFunction])
        val funcDecl = result.head.asInstanceOf[TsDeclFunction]
        assert(funcDecl.name.value == "myFunction")
        assert(funcDecl.signature == sig)
      }

      test("converts object type variable with call signatures to function declarations") {
        val scope = createMockScope()
        val sig1 = createFunSig(
          params = IArray(createFunParam("x", createTypeRef("number"))),
          resultType = Some(createTypeRef("string"))
        )
        val sig2 = createFunSig(
          params = IArray(createFunParam("x", createTypeRef("string"))),
          resultType = Some(createTypeRef("number"))
        )
        val callMember1 = createMemberCall(sig1)
        val callMember2 = createMemberCall(sig2)
        val objType = createTypeObject(IArray(callMember1, callMember2))
        val varDecl = createMockVar("overloadedFunction", Some(objType), isReadOnly = true)
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(varDecl), CodePath.NoPath)

        val result = NormalizeFunctions.newMembers(scope, parsedFile)

        assert(result.length == 2)
        assert(result.forall(_.isInstanceOf[TsDeclFunction]))
        val func1 = result(0).asInstanceOf[TsDeclFunction]
        val func2 = result(1).asInstanceOf[TsDeclFunction]
        assert(func1.name.value == "overloadedFunction")
        assert(func2.name.value == "overloadedFunction")
        assert(func1.signature == sig1)
        assert(func2.signature == sig2)
      }

      test("preserves variable metadata when converting") {
        val scope = createMockScope()
        val originalComments = Comments(Comment("Original variable comment"))
        val sig = createFunSig()
        val funType = createTypeFunction(sig)
        val varDecl = TsDeclVar(
          comments = originalComments,
          declared = true,
          readOnly = true,
          name = createSimpleIdent("myFunction"),
          tpe = Some(funType),
          expr = None,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("myFunction"))
        )
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(varDecl), CodePath.NoPath)

        val result = NormalizeFunctions.newMembers(scope, parsedFile)

        assert(result.length == 1)
        val funcDecl = result.head.asInstanceOf[TsDeclFunction]
        assert(funcDecl.comments == originalComments)
        assert(funcDecl.declared == true)
        assert(funcDecl.jsLocation == JsLocation.Zero)
        assert(funcDecl.codePath == varDecl.codePath)
      }

      test("leaves non-readonly variables unchanged") {
        val scope = createMockScope()
        val sig = createFunSig()
        val funType = createTypeFunction(sig)
        val varDecl = createMockVar("myFunction", Some(funType), isReadOnly = false)
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(varDecl), CodePath.NoPath)

        val result = NormalizeFunctions.newMembers(scope, parsedFile)

        assert(result.length == 1)
        assert(result.head == varDecl)
      }

      test("leaves variables with expressions unchanged") {
        val scope = createMockScope()
        val sig = createFunSig()
        val funType = createTypeFunction(sig)
        val varWithExpr = TsDeclVar(
          comments = NoComments,
          declared = false,
          readOnly = true,
          name = createSimpleIdent("myFunction"),
          tpe = Some(funType),
          expr = Some(TsExpr.Literal(TsLiteral.Str("value"))),
          jsLocation = JsLocation.Zero,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("myFunction"))
        )
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(varWithExpr), CodePath.NoPath)

        val result = NormalizeFunctions.newMembers(scope, parsedFile)

        assert(result.length == 1)
        assert(result.head == varWithExpr)
      }

      test("leaves variables without types unchanged") {
        val scope = createMockScope()
        val varWithoutType = createMockVar("myVar", None)
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(varWithoutType), CodePath.NoPath)

        val result = NormalizeFunctions.newMembers(scope, parsedFile)

        assert(result.length == 1)
        assert(result.head == varWithoutType)
      }

      test("leaves non-function variables unchanged") {
        val scope = createMockScope()
        val stringVar = createMockVar("stringVar", Some(createTypeRef("string")))
        val numberVar = createMockVar("numberVar", Some(createTypeRef("number")))
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(stringVar, numberVar), CodePath.NoPath)

        val result = NormalizeFunctions.newMembers(scope, parsedFile)

        assert(result.length == 2)
        assert(result == IArray(stringVar, numberVar))
      }

      test("leaves other declaration types unchanged") {
        val scope = createMockScope()
        val typeAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("MyType"),
          tparams = Empty,
          alias = createTypeRef("string"),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("MyType"))
        )
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(typeAlias), CodePath.NoPath)

        val result = NormalizeFunctions.newMembers(scope, parsedFile)

        assert(result.length == 1)
        assert(result.head == typeAlias)
      }
    }

    test("NormalizeFunctions - Export Tree Transformation") {
      test("transforms export tree with single function declaration") {
        val scope = createMockScope()
        val sig = createFunSig()
        val funType = createTypeFunction(sig)
        val varDecl = createMockVar("exportedFunction", Some(funType), isReadOnly = true)
        val exportTree = TsExportee.Tree(varDecl)

        val result = NormalizeFunctions.enterTsExporteeTree(scope)(exportTree)

        assert(result.decl.isInstanceOf[TsDeclFunction])
        val funcDecl = result.decl.asInstanceOf[TsDeclFunction]
        assert(funcDecl.name.value == "exportedFunction")
        assert(funcDecl.signature == sig)
      }

      test("leaves export tree unchanged when multiple declarations result") {
        val scope = createMockScope()
        val sig1 = createFunSig()
        val sig2 = createFunSig()
        val callMember1 = createMemberCall(sig1)
        val callMember2 = createMemberCall(sig2)
        val objType = createTypeObject(IArray(callMember1, callMember2))
        val varDecl = createMockVar("overloadedFunction", Some(objType), isReadOnly = true)
        val exportTree = TsExportee.Tree(varDecl)

        val result = NormalizeFunctions.enterTsExporteeTree(scope)(exportTree)

        // Should be unchanged because rewriteDecl returns multiple declarations
        assert(result == exportTree)
      }

      test("leaves export tree unchanged when no transformation occurs") {
        val scope = createMockScope()
        val stringVar = createMockVar("exportedString", Some(createTypeRef("string")))
        val exportTree = TsExportee.Tree(stringVar)

        val result = NormalizeFunctions.enterTsExporteeTree(scope)(exportTree)

        assert(result == exportTree)
      }
    }

    test("NormalizeFunctions - Integration Scenarios") {
      test("handles mixed class members") {
        val scope = createMockScope()
        val sig = createFunSig()
        val funType = createTypeFunction(sig)
        val functionProp = createMemberProperty("method", Some(funType))
        val stringProp = createMemberProperty("prop", Some(createTypeRef("string")))
        val existingMethod = TsMemberFunction(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = createSimpleIdent("existingMethod"),
          methodType = MethodType.Normal,
          signature = createFunSig(),
          isStatic = false,
          isReadOnly = false
        )
        val clazz = createMockClass("TestClass", IArray(functionProp, stringProp, existingMethod))

        val result = NormalizeFunctions.newClassMembers(scope, clazz)

        assert(result.length == 3)
        assert(result(0).isInstanceOf[TsMemberFunction]) // Converted function property
        assert(result(1) == stringProp) // Unchanged string property
        assert(result(2) == existingMethod) // Unchanged existing method
      }

      test("handles mixed container members") {
        val scope = createMockScope()
        val sig = createFunSig()
        val funType = createTypeFunction(sig)
        val functionVar = createMockVar("func", Some(funType), isReadOnly = true)
        val stringVar = createMockVar("str", Some(createTypeRef("string")))
        val interface = createMockInterface("TestInterface")
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(functionVar, stringVar, interface), CodePath.NoPath)

        val result = NormalizeFunctions.newMembers(scope, parsedFile)

        assert(result.length == 3)
        assert(result(0).isInstanceOf[TsDeclFunction]) // Converted function variable
        assert(result(1) == stringVar) // Unchanged string variable
        assert(result(2) == interface) // Unchanged interface
      }

      test("preserves order and metadata in complex scenarios") {
        val scope = createMockScope()
        val originalComments = Comments(Comment("Function property"))
        val sig = createFunSig(
          params = IArray(createFunParam("x", createTypeRef("number"))),
          resultType = Some(createTypeRef("string"))
        )
        val funType = createTypeFunction(sig)
        val functionProp = TsMemberProperty(
          comments = originalComments,
          level = TsProtectionLevel.Protected,
          name = createSimpleIdent("complexMethod"),
          tpe = Some(funType),
          expr = None,
          isStatic = true,
          isReadOnly = true
        )
        val clazz = createMockClass("ComplexClass", IArray(functionProp))

        val result = NormalizeFunctions.newClassMembers(scope, clazz)

        assert(result.length == 1)
        val convertedMethod = result.head.asInstanceOf[TsMemberFunction]
        assert(convertedMethod.comments == originalComments)
        assert(convertedMethod.level == TsProtectionLevel.Protected)
        assert(convertedMethod.name.value == "complexMethod")
        assert(convertedMethod.isStatic == true)
        assert(convertedMethod.isReadOnly == true)
        assert(convertedMethod.signature == sig)
      }
    }
  }
}