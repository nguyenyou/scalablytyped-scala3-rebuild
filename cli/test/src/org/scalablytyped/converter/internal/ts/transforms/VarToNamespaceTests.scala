package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object VarToNamespaceTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMemberProperty(
    name: String,
    tpe: Option[TsType] = None,
    isOptional: Boolean = false,
    isReadOnly: Boolean = false,
    isStatic: Boolean = false
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

  def createMemberFunction(
    name: String,
    signature: TsFunSig,
    isStatic: Boolean = false
  ): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = signature,
      isStatic = isStatic,
      isReadOnly = false
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

  def createObjectType(members: IArray[TsMember] = Empty): TsTypeObject =
    TsTypeObject(NoComments, members)

  def createMockVar(
    name: String,
    tpe: Option[TsType] = None,
    expr: Option[TsExpr] = None,
    declared: Boolean = false,
    readOnly: Boolean = false,
    jsLocation: JsLocation = JsLocation.Zero,
    codePath: CodePath = CodePath.NoPath
  ): TsDeclVar = {
    val actualCodePath = if (codePath == CodePath.NoPath) {
      CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    } else {
      codePath
    }
    TsDeclVar(
      comments = NoComments,
      declared = declared,
      readOnly = readOnly,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = expr,
      jsLocation = jsLocation,
      codePath = actualCodePath
    )
  }

  def createMockScope(
    declarations: Seq[TsDecl] = Seq.empty,
    logger: Logger[Unit] = Logger.DevNull
  ): TsTreeScope = {
    val libName = TsIdentLibrary("test-lib")
    val parsedFile = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = IArray.fromTraversable(declarations),
      codePath = CodePath.NoPath
    )
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger) / parsedFile
  }

  def tests = Tests {
    test("VarToNamespace - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(VarToNamespace.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsDecl method") {
        val scope = createMockScope(Seq.empty)
        val variable = createMockVar("TestVar")
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        assert(result != null)
        assert(result.isInstanceOf[TsDecl])
      }
    }

    test("VarToNamespace - Variable to Namespace Conversion") {
      test("converts variable with object type to namespace") {
        val prop1 = createMemberProperty("prop1", Some(createTypeRef("string")))
        val prop2 = createMemberProperty("prop2", Some(createTypeRef("number")))
        val objectType = createObjectType(IArray(prop1, prop2))
        
        val variable = createMockVar("TestNamespace", Some(objectType))
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.name.value == "TestNamespace")
        assert(namespace.declared == false)
        assert(namespace.members.length == 2)
        
        // Check that members were hoisted correctly
        val hoistedMembers = namespace.members.collect { case decl: TsDecl => decl }
        assert(hoistedMembers.length == 2)
        assert(hoistedMembers.forall(_.isInstanceOf[TsDeclVar]))
      }

      test("converts declared variable with object type to declared namespace") {
        val prop = createMemberProperty("value", Some(createTypeRef("string")))
        val objectType = createObjectType(IArray(prop))
        
        val variable = createMockVar("DeclaredNamespace", Some(objectType), declared = true)
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.name.value == "DeclaredNamespace")
        assert(namespace.declared == true)
        assert(namespace.members.length == 1)
      }

      test("preserves comments from variable and object type") {
        val varComment = Comment.Raw("Variable comment")
        val objComment = Comment.Raw("Object comment")
        val varComments = Comments(List(varComment))
        val objComments = Comments(List(objComment))
        
        val prop = createMemberProperty("prop", Some(createTypeRef("string")))
        val objectType = TsTypeObject(objComments, IArray(prop))
        
        val variable = TsDeclVar(
          comments = varComments,
          declared = false,
          readOnly = false,
          name = createSimpleIdent("CommentedNamespace"),
          tpe = Some(objectType),
          expr = None,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("CommentedNamespace"))
        )
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.comments.cs.length == 2)
        assert(namespace.comments.cs.contains(varComment))
        assert(namespace.comments.cs.contains(objComment))
      }

      test("preserves jsLocation and codePath") {
        val prop = createMemberProperty("prop", Some(createTypeRef("string")))
        val objectType = createObjectType(IArray(prop))
        val jsLocation = JsLocation.Global(createQIdent("custom", "location"))
        val codePath = CodePath.HasPath(createSimpleIdent("custom-lib"), createQIdent("CustomNamespace"))
        
        val variable = createMockVar("CustomNamespace", Some(objectType), jsLocation = jsLocation, codePath = codePath)
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.jsLocation == jsLocation)
        assert(namespace.codePath == codePath)
      }
    }

    test("VarToNamespace - Non-Convertible Variables") {
      test("preserves variable without type") {
        val variable = createMockVar("NoTypeVar", None)
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclVar])
        assert(result == variable)
      }

      test("preserves variable with non-object type") {
        val variable = createMockVar("StringVar", Some(createTypeRef("string")))
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclVar])
        assert(result == variable)
      }

      test("preserves variable with expression") {
        val objectType = createObjectType(IArray(createMemberProperty("prop", Some(createTypeRef("string")))))
        val variable = createMockVar("WithExpr", Some(objectType), Some(TsExpr.Literal(TsLiteral.Str("value"))))
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclVar])
        assert(result == variable)
      }

      test("converts readonly variable with object type") {
        val objectType = createObjectType(IArray(createMemberProperty("prop", Some(createTypeRef("string")))))
        val variable = createMockVar("ReadOnlyVar", Some(objectType), readOnly = true)
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        // The transform ignores the readOnly flag and converts readonly variables too
        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.name.value == "ReadOnlyVar")
        assert(namespace.members.length == 1)
      }
    }

    test("VarToNamespace - Member Hoisting") {
      test("hoists property members to variable declarations") {
        val prop1 = createMemberProperty("stringProp", Some(createTypeRef("string")))
        val prop2 = createMemberProperty("numberProp", Some(createTypeRef("number")))
        val prop3 = createMemberProperty("booleanProp", Some(createTypeRef("boolean")))
        val objectType = createObjectType(IArray(prop1, prop2, prop3))
        
        val variable = createMockVar("PropsNamespace", Some(objectType))
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.members.length == 3)
        
        val hoistedVars = namespace.members.collect { case v: TsDeclVar => v }
        assert(hoistedVars.length == 3)
        
        val varNames = hoistedVars.map(_.name.value).toSet
        assert(varNames == Set("stringProp", "numberProp", "booleanProp"))
      }

      test("hoists function members to function declarations") {
        val func1 = createMemberFunction("func1", createFunSig(ret = Some(createTypeRef("string"))))
        val func2 = createMemberFunction("func2", createFunSig(ret = Some(createTypeRef("number"))))
        val objectType = createObjectType(IArray(func1, func2))
        
        val variable = createMockVar("FuncsNamespace", Some(objectType))
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.members.length == 2)
        
        val hoistedFuncs = namespace.members.collect { case f: TsDeclFunction => f }
        assert(hoistedFuncs.length == 2)
        
        val funcNames = hoistedFuncs.map(_.name.value).toSet
        assert(funcNames == Set("func1", "func2"))
      }

      test("hoists mixed members correctly") {
        val prop = createMemberProperty("prop", Some(createTypeRef("string")))
        val func = createMemberFunction("func", createFunSig(ret = Some(createTypeRef("number"))))
        val objectType = createObjectType(IArray(prop, func))
        
        val variable = createMockVar("MixedNamespace", Some(objectType))
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.members.length == 2)
        
        val hoistedVars = namespace.members.collect { case v: TsDeclVar => v }
        val hoistedFuncs = namespace.members.collect { case f: TsDeclFunction => f }
        assert(hoistedVars.length == 1)
        assert(hoistedFuncs.length == 1)
        assert(hoistedVars.head.name.value == "prop")
        assert(hoistedFuncs.head.name.value == "func")
      }

      test("handles empty object type") {
        val objectType = createObjectType(Empty)
        val variable = createMockVar("EmptyNamespace", Some(objectType))
        val scope = createMockScope(Seq.empty)
        
        val result = VarToNamespace.enterTsDecl(scope)(variable)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.members.isEmpty)
      }
    }

    test("VarToNamespace - Non-Variable Declarations") {
      test("preserves interface declarations unchanged") {
        val interface = TsDeclInterface(
          NoComments,
          false,
          createSimpleIdent("TestInterface"),
          Empty,
          Empty,
          Empty,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("TestInterface"))
        )
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(interface)

        assert(result.isInstanceOf[TsDeclInterface])
        assert(result == interface)
      }

      test("preserves function declarations unchanged") {
        val function = TsDeclFunction(
          NoComments,
          false,
          createSimpleIdent("testFunc"),
          createFunSig(ret = Some(createTypeRef("string"))),
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("testFunc"))
        )
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(function)

        assert(result.isInstanceOf[TsDeclFunction])
        assert(result == function)
      }

      test("preserves class declarations unchanged") {
        val clazz = TsDeclClass(
          NoComments,
          false,
          false,
          createSimpleIdent("TestClass"),
          Empty,
          None,
          Empty,
          Empty,
          JsLocation.Zero,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("TestClass"))
        )
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(clazz)

        assert(result.isInstanceOf[TsDeclClass])
        assert(result == clazz)
      }

      test("preserves namespace declarations unchanged") {
        val namespace = TsDeclNamespace(
          NoComments,
          false,
          createSimpleIdent("ExistingNamespace"),
          Empty,
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("ExistingNamespace")),
          JsLocation.Zero
        )
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(namespace)

        assert(result.isInstanceOf[TsDeclNamespace])
        assert(result == namespace)
      }
    }

    test("VarToNamespace - Edge Cases") {
      test("handles variable with complex object type") {
        val nestedProp = createMemberProperty("nested", Some(createTypeRef("string")))
        val nestedObj = createObjectType(IArray(nestedProp))
        val complexProp = createMemberProperty("complex", Some(nestedObj))
        val objectType = createObjectType(IArray(complexProp))

        val variable = createMockVar("ComplexNamespace", Some(objectType))
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.members.length == 1)

        val hoistedVar = namespace.members.head.asInstanceOf[TsDeclVar]
        assert(hoistedVar.name.value == "complex")
        assert(hoistedVar.tpe.isDefined)
        assert(hoistedVar.tpe.get.isInstanceOf[TsTypeObject])
      }

      test("handles variable with static and instance members") {
        val instanceProp = createMemberProperty("instanceProp", Some(createTypeRef("string")), isStatic = false)
        val staticProp = createMemberProperty("staticProp", Some(createTypeRef("number")), isStatic = true)
        val objectType = createObjectType(IArray(instanceProp, staticProp))

        val variable = createMockVar("StaticNamespace", Some(objectType))
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.members.length == 2)

        val hoistedVars = namespace.members.collect { case v: TsDeclVar => v }
        assert(hoistedVars.length == 2)

        val varNames = hoistedVars.map(_.name.value).toSet
        assert(varNames == Set("instanceProp", "staticProp"))
      }

      test("handles variable with readonly members") {
        val readonlyProp = createMemberProperty("readonlyProp", Some(createTypeRef("string")), isReadOnly = true)
        val normalProp = createMemberProperty("normalProp", Some(createTypeRef("number")), isReadOnly = false)
        val objectType = createObjectType(IArray(readonlyProp, normalProp))

        val variable = createMockVar("ReadonlyNamespace", Some(objectType))
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.members.length == 2)

        val hoistedVars = namespace.members.collect { case v: TsDeclVar => v }
        assert(hoistedVars.length == 2)

        // Check that readonly property is preserved
        val readonlyVar = hoistedVars.find(_.name.value == "readonlyProp").get
        assert(readonlyVar.readOnly == true)

        val normalVar = hoistedVars.find(_.name.value == "normalProp").get
        assert(normalVar.readOnly == false)
      }

      test("handles variable with members that have expressions") {
        val propWithExpr = TsMemberProperty(
          NoComments,
          TsProtectionLevel.Default,
          createSimpleIdent("propWithExpr"),
          Some(createTypeRef("string")),
          Some(TsExpr.Literal(TsLiteral.Str("default"))),
          false,
          false
        )
        val objectType = createObjectType(IArray(propWithExpr))

        val variable = createMockVar("ExprNamespace", Some(objectType))
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.members.length == 1)

        val hoistedVar = namespace.members.head.asInstanceOf[TsDeclVar]
        assert(hoistedVar.name.value == "propWithExpr")
        assert(hoistedVar.expr.isDefined)
        assert(hoistedVar.expr.get.isInstanceOf[TsExpr.Literal])
      }
    }

    test("VarToNamespace - Real-World Patterns") {
      test("handles jQuery-like namespace pattern") {
        val fn = createMemberFunction("fn", createFunSig(ret = Some(createTypeRef("JQuery"))))
        val extend = createMemberFunction("extend", createFunSig(ret = Some(createTypeRef("any"))))
        val version = createMemberProperty("version", Some(createTypeRef("string")))
        val objectType = createObjectType(IArray(fn, extend, version))

        val variable = createMockVar("jQuery", Some(objectType))
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.name.value == "jQuery")
        assert(namespace.members.length == 3)

        val functions = namespace.members.collect { case f: TsDeclFunction => f }
        val variables = namespace.members.collect { case v: TsDeclVar => v }
        assert(functions.length == 2)
        assert(variables.length == 1)
      }

      test("handles Node.js module pattern") {
        val exports = createMemberProperty("exports", Some(createTypeRef("any")))
        val require = createMemberFunction("require", createFunSig(ret = Some(createTypeRef("any"))))
        val filename = createMemberProperty("__filename", Some(createTypeRef("string")))
        val dirname = createMemberProperty("__dirname", Some(createTypeRef("string")))
        val objectType = createObjectType(IArray(exports, require, filename, dirname))

        val variable = createMockVar("NodeJS", Some(objectType))
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.name.value == "NodeJS")
        assert(namespace.members.length == 4)

        val functions = namespace.members.collect { case f: TsDeclFunction => f }
        val variables = namespace.members.collect { case v: TsDeclVar => v }
        assert(functions.length == 1)
        assert(variables.length == 3)
        assert(functions.head.name.value == "require")
      }

      test("handles configuration object pattern") {
        val host = createMemberProperty("host", Some(createTypeRef("string")))
        val port = createMemberProperty("port", Some(createTypeRef("number")))
        val ssl = createMemberProperty("ssl", Some(createTypeRef("boolean")))
        val objectType = createObjectType(IArray(host, port, ssl))

        val variable = createMockVar("Config", Some(objectType))
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.name.value == "Config")
        assert(namespace.members.length == 3)

        val variables = namespace.members.collect { case v: TsDeclVar => v }
        assert(variables.length == 3)

        val varNames = variables.map(_.name.value).toSet
        assert(varNames == Set("host", "port", "ssl"))
      }

      test("handles API client pattern") {
        val get = createMemberFunction("get", createFunSig(ret = Some(createTypeRef("Promise"))))
        val post = createMemberFunction("post", createFunSig(ret = Some(createTypeRef("Promise"))))
        val baseURL = createMemberProperty("baseURL", Some(createTypeRef("string")))
        val timeout = createMemberProperty("timeout", Some(createTypeRef("number")))
        val objectType = createObjectType(IArray(get, post, baseURL, timeout))

        val variable = createMockVar("ApiClient", Some(objectType))
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]
        assert(namespace.name.value == "ApiClient")
        assert(namespace.members.length == 4)

        val functions = namespace.members.collect { case f: TsDeclFunction => f }
        val variables = namespace.members.collect { case v: TsDeclVar => v }
        assert(functions.length == 2)
        assert(variables.length == 2)

        val funcNames = functions.map(_.name.value).toSet
        val varNames = variables.map(_.name.value).toSet
        assert(funcNames == Set("get", "post"))
        assert(varNames == Set("baseURL", "timeout"))
      }
    }

    test("VarToNamespace - Integration") {
      test("works with other transforms") {
        val prop = createMemberProperty("value", Some(createTypeRef("string")))
        val objectType = createObjectType(IArray(prop))
        val variable = createMockVar("IntegrationTest", Some(objectType))
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]

        // Verify namespace properties for integration with other transforms
        assert(namespace.name.value == "IntegrationTest")
        assert(namespace.declared == false)
        assert(namespace.members.length == 1)
        assert(namespace.jsLocation == JsLocation.Zero)
        assert(namespace.codePath.isInstanceOf[CodePath.HasPath])
      }

      test("preserves structure for further processing") {
        val func = createMemberFunction("method", createFunSig(ret = Some(createTypeRef("void"))))
        val objectType = createObjectType(IArray(func))
        val variable = createMockVar("ProcessingTest", Some(objectType))
        val scope = createMockScope(Seq.empty)

        val result = VarToNamespace.enterTsDecl(scope)(variable)

        assert(result.isInstanceOf[TsDeclNamespace])
        val namespace = result.asInstanceOf[TsDeclNamespace]

        // Verify the hoisted function is properly structured
        val hoistedFunc = namespace.members.head.asInstanceOf[TsDeclFunction]
        assert(hoistedFunc.name.value == "method")
        assert(hoistedFunc.signature.resultType.isDefined)
        assert(hoistedFunc.declared == Hoisting.declared)
      }
    }
  }
}