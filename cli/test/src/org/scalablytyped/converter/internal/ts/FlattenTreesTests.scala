package org.scalablytyped.converter.internal
package ts

import utest.*

object FlattenTreesTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)
  def createModuleIdent(name: String): TsIdentModule = TsIdentModule.simple(name)

  def createMockComments(text: String): Comments =
    Comments(Comment.Raw(text))

  def createMockDirective(): Directive = Directive.NoStdLib

  def createMockCodePath(path: String): CodePath =
    CodePath.HasPath(createSimpleIdent(path), TsQIdent.of(createSimpleIdent(path)))

  def createMockJsLocation(): JsLocation = JsLocation.Zero

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

  def createMockParsedFile(
      name: String = "test",
      members: IArray[TsContainerOrDecl] = Empty,
      directives: IArray[Directive] = Empty,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath
  ): TsParsedFile =
    TsParsedFile(
      comments = comments,
      directives = directives,
      members = members,
      codePath = codePath
    )

  def createMockNamespace(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      declared: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath,
      jsLocation: JsLocation = JsLocation.Zero
  ): TsDeclNamespace =
    TsDeclNamespace(
      comments = comments,
      declared = declared,
      name = createSimpleIdent(name),
      members = members,
      codePath = codePath,
      jsLocation = jsLocation
    )

  def createMockModule(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      declared: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath,
      jsLocation: JsLocation = JsLocation.Zero
  ): TsDeclModule =
    TsDeclModule(
      comments = comments,
      declared = declared,
      name = createModuleIdent(name),
      members = members,
      codePath = codePath,
      jsLocation = jsLocation
    )

  def createMockClass(
      name: String,
      members: IArray[TsMember] = Empty,
      tparams: IArray[TsTypeParam] = Empty,
      parent: Option[TsTypeRef] = None,
      implements: IArray[TsTypeRef] = Empty,
      declared: Boolean = false,
      isAbstract: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath,
      jsLocation: JsLocation = JsLocation.Zero
  ): TsDeclClass =
    TsDeclClass(
      comments = comments,
      declared = declared,
      isAbstract = isAbstract,
      name = createSimpleIdent(name),
      tparams = tparams,
      parent = parent,
      implements = implements,
      members = members,
      jsLocation = jsLocation,
      codePath = codePath
    )

  def createMockInterface(
      name: String,
      members: IArray[TsMember] = Empty,
      tparams: IArray[TsTypeParam] = Empty,
      inheritance: IArray[TsTypeRef] = Empty,
      declared: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclInterface =
    TsDeclInterface(
      comments = comments,
      declared = declared,
      name = createSimpleIdent(name),
      tparams = tparams,
      inheritance = inheritance,
      members = members,
      codePath = codePath
    )

  def createMockEnum(
      name: String,
      members: IArray[TsEnumMember] = Empty,
      declared: Boolean = false,
      isConst: Boolean = false,
      isValue: Boolean = true,
      exportedFrom: Option[TsTypeRef] = None,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath,
      jsLocation: JsLocation = JsLocation.Zero
  ): TsDeclEnum =
    TsDeclEnum(
      comments = comments,
      declared = declared,
      isConst = isConst,
      name = createSimpleIdent(name),
      members = members,
      isValue = isValue,
      exportedFrom = exportedFrom,
      jsLocation = jsLocation,
      codePath = codePath
    )

  def createMockVar(
      name: String,
      tpe: Option[TsType] = None,
      declared: Boolean = false,
      readOnly: Boolean = false,
      expr: Option[TsExpr] = None,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath,
      jsLocation: JsLocation = JsLocation.Zero
  ): TsDeclVar =
    TsDeclVar(
      comments = comments,
      declared = declared,
      readOnly = readOnly,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = expr,
      jsLocation = jsLocation,
      codePath = codePath
    )

  def createMockTypeAlias(
      name: String,
      alias: TsType = TsTypeRef.any,
      tparams: IArray[TsTypeParam] = Empty,
      declared: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = comments,
      declared = declared,
      name = createSimpleIdent(name),
      tparams = tparams,
      alias = alias,
      codePath = codePath
    )

  def createMockFunction(
      name: String,
      signature: TsFunSig = createMockFunSig(),
      declared: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath,
      jsLocation: JsLocation = JsLocation.Zero
  ): TsDeclFunction =
    TsDeclFunction(
      comments = comments,
      declared = declared,
      name = createSimpleIdent(name),
      signature = signature,
      jsLocation = jsLocation,
      codePath = codePath
    )

  def createMockFunSig(
      tparams: IArray[TsTypeParam] = Empty,
      params: IArray[TsFunParam] = Empty,
      resultType: Option[TsType] = Some(TsTypeRef.any),
      comments: Comments = NoComments
  ): TsFunSig =
    TsFunSig(
      comments = comments,
      tparams = tparams,
      params = params,
      resultType = resultType
    )

  def createMockAugmentedModule(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath,
      jsLocation: JsLocation = JsLocation.Zero
  ): TsAugmentedModule =
    TsAugmentedModule(
      comments = comments,
      name = createModuleIdent(name),
      members = members,
      codePath = codePath,
      jsLocation = jsLocation
    )

  def createMockGlobal(
      members: IArray[TsContainerOrDecl] = Empty,
      declared: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath
  ): TsGlobal =
    TsGlobal(
      comments = comments,
      declared = declared,
      members = members,
      codePath = codePath
    )

  def createMockProperty(
      name: String,
      tpe: Option[TsType] = Some(TsTypeRef.string),
      isStatic: Boolean = false,
      isReadOnly: Boolean = false,
      expr: Option[TsExpr] = None,
      level: TsProtectionLevel = TsProtectionLevel.Default,
      comments: Comments = NoComments
  ): TsMemberProperty =
    TsMemberProperty(
      comments = comments,
      level = level,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = expr,
      isStatic = isStatic,
      isReadOnly = isReadOnly
    )

  def createMockIndex(
      indexing: Indexing = Indexing.Dict(createSimpleIdent("key"), TsTypeRef.string),
      valueType: Option[TsType] = Some(TsTypeRef.any),
      isReadOnly: Boolean = false,
      level: TsProtectionLevel = TsProtectionLevel.Default,
      comments: Comments = NoComments
  ): TsMemberIndex =
    TsMemberIndex(
      comments = comments,
      isReadOnly = isReadOnly,
      level = level,
      indexing = indexing,
      valueType = valueType
    )

  def tests = Tests {
    test("FlattenTrees - apply methods") {
      test("single file processing") {
        val file = createMockParsedFile("test", 
          members = IArray(createMockClass("TestClass")))
        val result = FlattenTrees.apply(file)
        
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclClass].name.value == "TestClass")
      }

      test("multiple file merging") {
        val file1 = createMockParsedFile("file1", 
          members = IArray(createMockClass("Class1")))
        val file2 = createMockParsedFile("file2", 
          members = IArray(createMockClass("Class2")))
        val files = IArray(file1, file2)
        val result = FlattenTrees.apply(files)
        
        assert(result.members.length == 2)
        val classNames = result.members.map(_.asInstanceOf[TsDeclClass].name.value).toSet
        assert(classNames == Set("Class1", "Class2"))
      }

      test("empty file handling") {
        val emptyFile = createMockParsedFile("empty")
        val result = FlattenTrees.apply(emptyFile)
        
        assert(result.members.isEmpty)
        assert(result.directives.isEmpty)
        assert(result.comments == NoComments)
      }

      test("empty file array") {
        val result = FlattenTrees.apply(Empty)

        assert(result.members.isEmpty)
        assert(result.directives.isEmpty)
        assert(result.comments == NoComments)
        assert(result.codePath == CodePath.NoPath)
      }
    }

    test("FlattenTrees - file merging") {
      test("merge files with different comments") {
        val comments1 = createMockComments("File 1 comment")
        val comments2 = createMockComments("File 2 comment")
        val file1 = createMockParsedFile("file1", comments = comments1)
        val file2 = createMockParsedFile("file2", comments = comments2)

        val result = FlattenTrees.mergeFile(file1, file2)

        assert(result.comments.cs.length == 2)
      }

      test("merge files with different directives") {
        val directive1 = Directive.NoStdLib
        val directive2 = Directive.NoStdLib // Same directive to test distinct
        val file1 = createMockParsedFile("file1", directives = IArray(directive1))
        val file2 = createMockParsedFile("file2", directives = IArray(directive2))

        val result = FlattenTrees.mergeFile(file1, file2)

        assert(result.directives.length == 1) // Should be distinct
      }

      test("merge files with different code paths") {
        val path1 = createMockCodePath("path1")
        val path2 = createMockCodePath("path2")
        val file1 = createMockParsedFile("file1", codePath = path1)
        val file2 = createMockParsedFile("file2", codePath = path2)

        val result = FlattenTrees.mergeFile(file1, file2)

        assert(result.codePath == path1) // First path should be preserved
      }

      test("merge files with overlapping members") {
        val class1 = createMockClass("TestClass", members = IArray(createMockProperty("prop1")))
        val class2 = createMockClass("TestClass", members = IArray(createMockProperty("prop2")))
        val file1 = createMockParsedFile("file1", members = IArray(class1))
        val file2 = createMockParsedFile("file2", members = IArray(class2))

        val result = FlattenTrees.mergeFile(file1, file2)

        assert(result.members.length == 1)
        val mergedClass = result.members.head.asInstanceOf[TsDeclClass]
        assert(mergedClass.name.value == "TestClass")
        assert(mergedClass.members.length == 2)
      }
    }

    test("FlattenTrees - member merging") {
      test("merge named and unnamed members") {
        val namedMember = createMockClass("NamedClass")
        val unnamedMember = createMockGlobal()
        val these = IArray[TsContainerOrDecl](namedMember)
        val thats = IArray[TsContainerOrDecl](unnamedMember)

        val result = FlattenTrees.newMembers(these, thats)

        assert(result.length == 2)
        assert(result.contains(namedMember))
        assert(result.contains(unnamedMember))
      }

      test("merge TsGlobal members") {
        val global1 = createMockGlobal(members = IArray(createMockClass("Class1")))
        val global2 = createMockGlobal(members = IArray(createMockClass("Class2")))
        val these = IArray[TsContainerOrDecl](global1)
        val thats = IArray[TsContainerOrDecl](global2)

        val result = FlattenTrees.newMembers(these, thats)

        assert(result.length == 1)
        val mergedGlobal = result.head.asInstanceOf[TsGlobal]
        assert(mergedGlobal.members.length == 2)
      }

      test("distinct filtering") {
        val class1 = createMockClass("TestClass")
        val class2 = createMockClass("TestClass") // Duplicate
        val these = IArray[TsContainerOrDecl](class1)
        val thats = IArray[TsContainerOrDecl](class2)

        val result = FlattenTrees.newMembers(these, thats)

        assert(result.length == 1) // Should be deduplicated
      }
    }

    test("FlattenTrees - named member merging") {
      test("merge namespaces with same name") {
        val ns1 = createMockNamespace("TestNS", members = IArray(createMockClass("Class1")))
        val ns2 = createMockNamespace("TestNS", members = IArray(createMockClass("Class2")))
        val these = IArray[TsNamedDecl](ns1)
        val thats = IArray[TsNamedDecl](ns2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedNS = result.head.asInstanceOf[TsDeclNamespace]
        assert(mergedNS.name.value == "TestNS")
        assert(mergedNS.members.length == 2)
      }

      test("merge modules with same name") {
        val mod1 = createMockModule("TestMod", members = IArray(createMockClass("Class1")))
        val mod2 = createMockModule("TestMod", members = IArray(createMockClass("Class2")))
        val these = IArray[TsNamedDecl](mod1)
        val thats = IArray[TsNamedDecl](mod2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedMod = result.head.asInstanceOf[TsDeclModule]
        assert(mergedMod.name.value == "TestMod")
        assert(mergedMod.members.length == 2)
      }

      test("merge classes with same name") {
        val class1 = createMockClass("TestClass", members = IArray(createMockProperty("prop1")))
        val class2 = createMockClass("TestClass", members = IArray(createMockProperty("prop2")))
        val these = IArray[TsNamedDecl](class1)
        val thats = IArray[TsNamedDecl](class2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedClass = result.head.asInstanceOf[TsDeclClass]
        assert(mergedClass.name.value == "TestClass")
        assert(mergedClass.members.length == 2)
      }

      test("merge interfaces with same name") {
        val interface1 = createMockInterface("TestInterface", members = IArray(createMockProperty("prop1")))
        val interface2 = createMockInterface("TestInterface", members = IArray(createMockProperty("prop2")))
        val these = IArray[TsNamedDecl](interface1)
        val thats = IArray[TsNamedDecl](interface2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedInterface = result.head.asInstanceOf[TsDeclInterface]
        assert(mergedInterface.name.value == "TestInterface")
        assert(mergedInterface.members.length == 2)
      }

      test("merge enums with same name") {
        val codePath = createMockCodePath("TestEnum")
        val enum1 = createMockEnum("TestEnum", declared = true, codePath = codePath)
        val enum2 = createMockEnum("TestEnum", declared = false, codePath = codePath)
        val these = IArray[TsNamedDecl](enum1)
        val thats = IArray[TsNamedDecl](enum2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedEnum = result.head.asInstanceOf[TsDeclEnum]
        assert(mergedEnum.name.value == "TestEnum")
        assert(mergedEnum.declared == true) // Should be OR of both
      }

      test("merge variables with same name") {
        val var1 = createMockVar("testVar", tpe = Some(TsTypeRef.string))
        val var2 = createMockVar("testVar", tpe = Some(TsTypeRef.number))
        val these = IArray[TsNamedDecl](var1)
        val thats = IArray[TsNamedDecl](var2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedVar = result.head.asInstanceOf[TsDeclVar]
        assert(mergedVar.name.value == "testVar")
        assert(mergedVar.tpe.isDefined) // Should have merged type
      }

      test("merge type aliases with same name") {
        val alias1 = createMockTypeAlias("TestType", alias = TsTypeRef.string)
        val alias2 = createMockTypeAlias("TestType", alias = TsTypeRef.number)
        val these = IArray[TsNamedDecl](alias1)
        val thats = IArray[TsNamedDecl](alias2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedAlias = result.head.asInstanceOf[TsDeclTypeAlias]
        assert(mergedAlias.name.value == "TestType")
      }

      test("merge augmented modules with same name") {
        val augMod1 = createMockAugmentedModule("TestMod", members = IArray(createMockClass("Class1")))
        val augMod2 = createMockAugmentedModule("TestMod", members = IArray(createMockClass("Class2")))
        val these = IArray[TsNamedDecl](augMod1)
        val thats = IArray[TsNamedDecl](augMod2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedAugMod = result.head.asInstanceOf[TsAugmentedModule]
        assert(mergedAugMod.name.value == "TestMod")
        assert(mergedAugMod.members.length == 2)
      }
    }

    test("FlattenTrees - cross-type merging") {
      test("merge namespace and function with same name") {
        val ns = createMockNamespace("TestName", members = IArray(createMockClass("Class1")))
        val func = createMockFunction("TestName")
        val these = IArray[TsNamedDecl](ns)
        val thats = IArray[TsNamedDecl](func)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedNS = result.head.asInstanceOf[TsDeclNamespace]
        assert(mergedNS.name.value == "TestName")
        assert(mergedNS.members.length == 2) // Original class + function
      }

      test("merge namespace and variable with same name") {
        val ns = createMockNamespace("TestName", members = IArray(createMockClass("Class1")))
        val variable = createMockVar("TestName")
        val these = IArray[TsNamedDecl](ns)
        val thats = IArray[TsNamedDecl](variable)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedNS = result.head.asInstanceOf[TsDeclNamespace]
        assert(mergedNS.name.value == "TestName")
        assert(mergedNS.members.length == 2) // Original class + variable
      }

      test("merge class and interface with same name") {
        val clazz = createMockClass("TestName", members = IArray(createMockProperty("classProp")))
        val interface = createMockInterface("TestName", members = IArray(createMockProperty("interfaceProp")))
        val these = IArray[TsNamedDecl](clazz)
        val thats = IArray[TsNamedDecl](interface)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedClass = result.head.asInstanceOf[TsDeclClass]
        assert(mergedClass.name.value == "TestName")
        assert(mergedClass.members.length == 2) // Both properties
      }

      test("different named declarations don't merge") {
        val class1 = createMockClass("Class1")
        val class2 = createMockClass("Class2")
        val these = IArray[TsNamedDecl](class1)
        val thats = IArray[TsNamedDecl](class2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 2)
        assert(result.contains(class1))
        assert(result.contains(class2))
      }
    }

    test("FlattenTrees - class member merging") {
      test("merge properties with same name and static flag") {
        val prop1 = createMockProperty("testProp", tpe = Some(TsTypeRef.string), isStatic = false)
        val prop2 = createMockProperty("testProp", tpe = Some(TsTypeRef.number), isStatic = false)
        val these = IArray[TsMember](prop1)
        val thats = IArray[TsMember](prop2)

        val result = FlattenTrees.newClassMembers(these, thats)

        assert(result.length == 1)
        val mergedProp = result.head.asInstanceOf[TsMemberProperty]
        assert(mergedProp.name.value == "testProp")
        assert(mergedProp.tpe.isDefined) // Should have merged type
      }

      test("don't merge properties with different static flags") {
        val prop1 = createMockProperty("testProp", isStatic = true)
        val prop2 = createMockProperty("testProp", isStatic = false)
        val these = IArray[TsMember](prop1)
        val thats = IArray[TsMember](prop2)

        val result = FlattenTrees.newClassMembers(these, thats)

        assert(result.length == 2) // Should not merge
      }

      test("merge index signatures with same indexing") {
        val indexing = Indexing.Dict(createSimpleIdent("key"), TsTypeRef.string)
        val index1 = createMockIndex(indexing = indexing, valueType = Some(TsTypeRef.string))
        val index2 = createMockIndex(indexing = indexing, valueType = Some(TsTypeRef.number))
        val these = IArray[TsMember](index1)
        val thats = IArray[TsMember](index2)

        val result = FlattenTrees.newClassMembers(these, thats)

        assert(result.length == 1)
        val mergedIndex = result.head.asInstanceOf[TsMemberIndex]
        assert(mergedIndex.valueType.isDefined) // Should have merged value type
      }

      test("don't merge index signatures with different indexing") {
        val indexing1 = Indexing.Dict(createSimpleIdent("key"), TsTypeRef.string)
        val indexing2 = Indexing.Dict(createSimpleIdent("index"), TsTypeRef.number)
        val index1 = createMockIndex(indexing = indexing1)
        val index2 = createMockIndex(indexing = indexing2)
        val these = IArray[TsMember](index1)
        val thats = IArray[TsMember](index2)

        val result = FlattenTrees.newClassMembers(these, thats)

        assert(result.length == 2) // Should not merge
      }

      test("preserve other member types") {
        val method = createMockMethod("testMethod")
        val ctor = createMockCtor()
        val these = IArray[TsMember](method)
        val thats = IArray[TsMember](ctor)

        val result = FlattenTrees.newClassMembers(these, thats)

        assert(result.length == 2)
        assert(result.contains(method))
        assert(result.contains(ctor))
      }

      test("distinct filtering for class members") {
        val prop1 = createMockProperty("testProp")
        val prop2 = createMockProperty("testProp") // Duplicate
        val these = IArray[TsMember](prop1)
        val thats = IArray[TsMember](prop2)

        val result = FlattenTrees.newClassMembers(these, thats)

        assert(result.length == 1) // Should be deduplicated
      }
    }

    test("FlattenTrees - utility functions") {
      test("mergeCodePath - NoPath handling") {
        val path1 = CodePath.NoPath
        val path2 = createMockCodePath("test")

        val result1 = FlattenTrees.mergeCodePath(path1, path2)
        val result2 = FlattenTrees.mergeCodePath(path2, path1)

        assert(result1 == path2)
        assert(result2 == path2)
      }

      test("mergeCodePath - first path priority") {
        val path1 = createMockCodePath("first")
        val path2 = createMockCodePath("second")

        val result = FlattenTrees.mergeCodePath(path1, path2)

        assert(result == path1)
      }

      test("mergeJsLocation - Global and Module") {
        val global = JsLocation.Global(TsQIdent.of(createSimpleIdent("global")))
        val module = JsLocation.Module(createModuleIdent("module"), ModuleSpec.Namespaced)

        val result1 = FlattenTrees.mergeJsLocation(global, module)
        val result2 = FlattenTrees.mergeJsLocation(module, global)

        assert(result1.isInstanceOf[JsLocation.Both])
        assert(result2.isInstanceOf[JsLocation.Both])
      }

      test("mergeJsLocation - Zero handling") {
        val location = JsLocation.Global(TsQIdent.of(createSimpleIdent("test")))

        val result1 = FlattenTrees.mergeJsLocation(JsLocation.Zero, location)
        val result2 = FlattenTrees.mergeJsLocation(location, JsLocation.Zero)

        assert(result1 == location)
        assert(result2 == location)
      }

      test("mergeComments - same comments") {
        val comments = createMockComments("test")

        val result = FlattenTrees.mergeComments(comments, comments)

        assert(result == comments)
      }

      test("mergeComments - different comments") {
        val comments1 = createMockComments("comment1")
        val comments2 = createMockComments("comment2")

        val result = FlattenTrees.mergeComments(comments1, comments2)

        assert(result.cs.length == 2)
      }

      test("mergeTypeParams - longer array wins") {
        val tparams1 = IArray(createMockTypeParam("T"))
        val tparams2 = IArray(createMockTypeParam("T"), createMockTypeParam("U"))

        val result1 = FlattenTrees.mergeTypeParams(tparams1, tparams2)
        val result2 = FlattenTrees.mergeTypeParams(tparams2, tparams1)

        assert(result1 == tparams2)
        assert(result2 == tparams2)
      }

      test("bothTypes - None handling") {
        val result = FlattenTrees.bothTypes(None, None)
        assert(result.isEmpty)
      }

      test("bothTypes - single type") {
        val tpe = TsTypeRef.string

        val result1 = FlattenTrees.bothTypes(Some(tpe), None)
        val result2 = FlattenTrees.bothTypes(None, Some(tpe))

        assert(result1.contains(tpe))
        assert(result2.contains(tpe))
      }

      test("bothTypes - multiple types with preference") {
        val typeQuery = TsTypeQuery(TsQIdent.of(createSimpleIdent("test")))
        val normalType = TsTypeRef.string

        val result = FlattenTrees.bothTypes(Some(typeQuery), Some(normalType))

        assert(result.contains(normalType)) // Should prefer normal type over type query
      }
    }

    // Helper methods for additional member types
    def createMockMethod(
        name: String,
        signature: TsFunSig = createMockFunSig(),
        level: TsProtectionLevel = TsProtectionLevel.Default,
        methodType: MethodType = MethodType.Normal,
        isStatic: Boolean = false,
        isReadOnly: Boolean = false,
        comments: Comments = NoComments
    ): TsMemberFunction =
      TsMemberFunction(
        comments = comments,
        level = level,
        name = createSimpleIdent(name),
        methodType = methodType,
        signature = signature,
        isStatic = isStatic,
        isReadOnly = isReadOnly
      )

    def createMockCtor(
        signature: TsFunSig = createMockFunSig(),
        level: TsProtectionLevel = TsProtectionLevel.Default,
        comments: Comments = NoComments
    ): TsMemberCtor =
      TsMemberCtor(
        comments = comments,
        level = level,
        signature = signature
      )

    test("FlattenTrees - edge cases") {
      test("empty inputs") {
        val emptyMembers = FlattenTrees.newMembers(Empty, Empty)
        val emptyNamedMembers = FlattenTrees.newNamedMembers(Empty, Empty)
        val emptyClassMembers = FlattenTrees.newClassMembers(Empty, Empty)

        assert(emptyMembers.isEmpty)
        assert(emptyNamedMembers.isEmpty)
        assert(emptyClassMembers.isEmpty)
      }

      test("single element arrays") {
        val singleClass = createMockClass("SingleClass")
        val singleMember = IArray[TsContainerOrDecl](singleClass)

        val result = FlattenTrees.newMembers(Empty, singleMember)

        assert(result.length == 1)
        assert(result.head == singleClass)
      }

      test("None code paths") {
        val file1 = createMockParsedFile("file1", codePath = CodePath.NoPath)
        val file2 = createMockParsedFile("file2", codePath = CodePath.NoPath)

        val result = FlattenTrees.mergeFile(file1, file2)

        assert(result.codePath == CodePath.NoPath)
      }

      test("None types in bothTypes") {
        val result = FlattenTrees.bothTypes(None, None)
        assert(result.isEmpty)
      }

      test("empty type parameter arrays") {
        val result = FlattenTrees.mergeTypeParams(Empty, Empty)
        assert(result.isEmpty)
      }

      test("empty comments") {
        val result = FlattenTrees.mergeComments(NoComments, NoComments)
        assert(result == NoComments)
      }
    }

    test("FlattenTrees - error handling and robustness") {
      test("handles malformed inheritance") {
        val class1 = createMockClass("TestClass", parent = Some(TsTypeRef.any))
        val class2 = createMockClass("TestClass", implements = IArray(TsTypeRef.string))
        val these = IArray[TsNamedDecl](class1)
        val thats = IArray[TsNamedDecl](class2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedClass = result.head.asInstanceOf[TsDeclClass]
        assert(mergedClass.parent.isDefined)
        assert(mergedClass.implements.nonEmpty)
      }

      test("handles conflicting declared flags") {
        val ns1 = createMockNamespace("TestNS", declared = true)
        val ns2 = createMockNamespace("TestNS", declared = false)
        val these = IArray[TsNamedDecl](ns1)
        val thats = IArray[TsNamedDecl](ns2)

        val result = FlattenTrees.newNamedMembers(these, thats)

        assert(result.length == 1)
        val mergedNS = result.head.asInstanceOf[TsDeclNamespace]
        assert(mergedNS.declared == true) // Should be OR of both
      }

      test("handles type query filtering") {
        val typeQuery = TsTypeQuery(TsQIdent.of(createSimpleIdent("test")))
        val normalType = TsTypeRef.string

        val result = FlattenTrees.bothTypes(Some(typeQuery), Some(normalType))

        assert(result.contains(normalType)) // Should filter out type query
      }

      test("handles never type filtering") {
        val neverType = TsTypeRef.never
        val normalType = TsTypeRef.string

        val result = FlattenTrees.bothTypes(Some(neverType), Some(normalType))

        assert(result.contains(normalType)) // Should filter out never type
      }

      test("maintains structural integrity") {
        val originalClass = createMockClass("TestClass")
        val file = createMockParsedFile("test", members = IArray(originalClass))

        val result = FlattenTrees.apply(file)

        assert(result.members.length == 1)
        val resultClass = result.members.head.asInstanceOf[TsDeclClass]
        assert(resultClass.name.value == "TestClass") // Should maintain structure
      }
    }

    test("FlattenTrees - performance tests") {
      test("large number of files") {
        val files = (1 to 100).map(i =>
          createMockParsedFile(s"file$i", members = IArray(createMockClass(s"Class$i")))
        ).toArray

        val result = FlattenTrees.apply(IArray.fromArray(files))

        assert(result.members.length == 100)
      }

      test("large number of members") {
        val members = (1 to 1000).map(i => createMockClass(s"Class$i")).toArray
        val file = createMockParsedFile("test", members = IArray.fromArray(members))

        val result = FlattenTrees.apply(file)

        assert(result.members.length == 1000)
      }

      test("deeply nested namespaces") {
        def createNestedNamespace(depth: Int, name: String): TsDeclNamespace = {
          if (depth <= 0) {
            createMockNamespace(name, members = IArray(createMockClass("DeepClass")))
          } else {
            createMockNamespace(name, members = IArray(createNestedNamespace(depth - 1, s"${name}_$depth")))
          }
        }

        val deepNS = createNestedNamespace(10, "Root")
        val file = createMockParsedFile("test", members = IArray(deepNS))

        val result = FlattenTrees.apply(file)

        assert(result.members.length == 1)
        assert(result.members.head.isInstanceOf[TsDeclNamespace])
      }

      test("complex inheritance hierarchies") {
        val baseInterface = createMockInterface("Base")
        val interface1 = createMockInterface("Interface1", inheritance = IArray(TsTypeRef.any))
        val interface2 = createMockInterface("Interface2", inheritance = IArray(TsTypeRef.any))
        val complexClass = createMockClass("ComplexClass",
          parent = Some(TsTypeRef.any),
          implements = IArray(TsTypeRef.string, TsTypeRef.number))

        val members = IArray[TsContainerOrDecl](baseInterface, interface1, interface2, complexClass)
        val file = createMockParsedFile("test", members = members)

        val result = FlattenTrees.apply(file)

        assert(result.members.length == 4)
      }
    }

    test("FlattenTrees - complex scenarios") {
      test("multiple file merging with conflicts") {
        val class1 = createMockClass("ConflictClass", members = IArray(createMockProperty("prop1")))
        val class2 = createMockClass("ConflictClass", members = IArray(createMockProperty("prop2")))
        val class3 = createMockClass("ConflictClass", members = IArray(createMockProperty("prop3")))

        val file1 = createMockParsedFile("file1", members = IArray(class1))
        val file2 = createMockParsedFile("file2", members = IArray(class2))
        val file3 = createMockParsedFile("file3", members = IArray(class3))

        val result = FlattenTrees.apply(IArray(file1, file2, file3))

        assert(result.members.length == 1)
        val mergedClass = result.members.head.asInstanceOf[TsDeclClass]
        assert(mergedClass.name.value == "ConflictClass")
        assert(mergedClass.members.length == 3) // All properties merged
      }

      test("mixed declaration types with same name") {
        val namespace = createMockNamespace("Mixed", members = IArray(createMockClass("InnerClass")))
        val function = createMockFunction("Mixed")
        val variable = createMockVar("Mixed")

        val file = createMockParsedFile("test", members = IArray(namespace, function, variable))

        val result = FlattenTrees.apply(file)

        assert(result.members.length == 1) // Should merge into namespace
        val mergedNS = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(mergedNS.name.value == "Mixed")
        assert(mergedNS.members.length == 3) // Original class + function + variable
      }

      test("class and interface merging preserves all features") {
        val tparam = createMockTypeParam("T")
        val clazz = createMockClass("TestEntity",
          tparams = IArray(tparam),
          members = IArray(createMockProperty("classProp")),
          parent = Some(TsTypeRef.any))
        val interface = createMockInterface("TestEntity",
          tparams = IArray(tparam),
          members = IArray(createMockProperty("interfaceProp")),
          inheritance = IArray(TsTypeRef.string))

        val file = createMockParsedFile("test", members = IArray(clazz, interface))

        val result = FlattenTrees.apply(file)

        assert(result.members.length == 1)
        val merged = result.members.head.asInstanceOf[TsDeclClass]
        assert(merged.name.value == "TestEntity")
        assert(merged.tparams.length == 1)
        assert(merged.members.length == 2)
        assert(merged.parent.isDefined)
        assert(merged.implements.length == 1) // Interface inheritance becomes implements
      }

      test("global scope merging across files") {
        val global1 = createMockGlobal(members = IArray(createMockClass("GlobalClass1")))
        val global2 = createMockGlobal(members = IArray(createMockClass("GlobalClass2")))

        val file1 = createMockParsedFile("file1", members = IArray(global1))
        val file2 = createMockParsedFile("file2", members = IArray(global2))

        val result = FlattenTrees.apply(IArray(file1, file2))

        assert(result.members.length == 1)
        val mergedGlobal = result.members.head.asInstanceOf[TsGlobal]
        assert(mergedGlobal.members.length == 2)
      }

      test("preserves metadata during complex merging") {
        val comments1 = createMockComments("First comment")
        val comments2 = createMockComments("Second comment")
        val path1 = createMockCodePath("first")
        val path2 = createMockCodePath("second")

        val class1 = createMockClass("TestClass", comments = comments1, codePath = path1)
        val class2 = createMockClass("TestClass", comments = comments2, codePath = path2)

        val file1 = createMockParsedFile("file1", members = IArray(class1))
        val file2 = createMockParsedFile("file2", members = IArray(class2))

        val result = FlattenTrees.apply(IArray(file1, file2))

        assert(result.members.length == 1)
        val merged = result.members.head.asInstanceOf[TsDeclClass]
        assert(merged.comments.cs.length == 2) // Both comments preserved
        assert(merged.codePath == path1) // First path preserved
      }
    }
  }
}