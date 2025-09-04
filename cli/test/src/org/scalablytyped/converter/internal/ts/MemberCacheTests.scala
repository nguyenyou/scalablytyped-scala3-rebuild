package org.scalablytyped.converter.internal
package ts

import utest.*

object MemberCacheTests extends TestSuite {

  // Test implementations of the traits for testing
  case class TestMemberCache(members: IArray[TsContainerOrDecl]) extends MemberCache

  case class TestHasClassMembers(members: IArray[TsMember]) extends HasClassMembers

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createModuleIdent(name: String): TsIdentModule = TsIdentModule.simple(name)

  def createMockClass(name: String): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = IArray.Empty,
      parent = None,
      implements = IArray.Empty,
      members = IArray.Empty,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockInterface(name: String): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = IArray.Empty,
      inheritance = IArray.Empty,
      members = IArray.Empty,
      codePath = CodePath.NoPath
    )

  def createMockVar(name: String): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = None,
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockModule(name: String): TsDeclModule =
    TsDeclModule(
      comments = NoComments,
      declared = false,
      name = createModuleIdent(name),
      members = IArray.Empty,
      codePath = CodePath.NoPath,
      jsLocation = JsLocation.Zero
    )

  def createMockAugmentedModule(name: String): TsAugmentedModule =
    TsAugmentedModule(
      comments = NoComments,
      name = createModuleIdent(name),
      members = IArray.Empty,
      codePath = CodePath.NoPath,
      jsLocation = JsLocation.Zero
    )

  def createMockExport(name: String): TsExport =
    TsExport(
      comments = NoComments,
      typeOnly = false,
      tpe = ExportType.Named,
      exported = TsExportee.Tree(createMockVar(name))
    )

  def createMockImport(moduleName: String, isLocal: Boolean = false): TsImport = {
    val importee = if (isLocal) {
      TsImportee.Local(TsQIdent.of(createSimpleIdent("localModule")))
    } else {
      TsImportee.From(createModuleIdent(moduleName))
    }
    TsImport(
      typeOnly = false,
      imported = IArray(TsImported.Ident(createSimpleIdent("imported"))),
      from = importee
    )
  }

  def createMockMemberFunction(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = IArray.Empty,
        resultType = Some(TsTypeRef.any)
      ),
      isStatic = false,
      isReadOnly = false
    )

  def createMockMemberProperty(name: String): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(TsTypeRef.string),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createMockMemberCall(): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = IArray.Empty,
        resultType = Some(TsTypeRef.any)
      )
    )

  def createMockMemberCtor(): TsMemberCtor =
    TsMemberCtor(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = IArray.Empty,
        resultType = Some(TsTypeRef.any)
      )
    )

  def tests = Tests {
    test("MemberCache - Basic Functionality") {
      test("empty members collection") {
        val cache = TestMemberCache(IArray.Empty)

        assert(cache.nameds.isEmpty)
        assert(cache.exports.isEmpty)
        assert(cache.imports.isEmpty)
        assert(cache.unnamed.isEmpty)
        assert(!cache.isModule)
        assert(cache.membersByName.isEmpty)
        assert(cache.modules.isEmpty)
        assert(cache.augmentedModules.isEmpty)
        assert(cache.augmentedModulesMap.isEmpty)
      }

      test("single named declaration") {
        val mockClass = createMockClass("TestClass")
        val cache = TestMemberCache(IArray(mockClass))

        assert(cache.nameds.length == 1)
        assert(cache.nameds.head == mockClass)
        assert(cache.exports.isEmpty)
        assert(cache.imports.isEmpty)
        assert(cache.unnamed.isEmpty)
        assert(!cache.isModule)
        assert(cache.membersByName.size == 1)
        assert(cache.membersByName.contains(mockClass.name))
        assert(cache.membersByName(mockClass.name).head == mockClass)
      }

      test("single export declaration") {
        val mockExport = createMockExport("TestExport")
        val cache = TestMemberCache(IArray(mockExport))

        assert(cache.nameds.isEmpty)
        assert(cache.exports.length == 1)
        assert(cache.exports.head == mockExport)
        assert(cache.imports.isEmpty)
        assert(cache.unnamed.isEmpty)
        assert(cache.isModule) // exports make it a module
        assert(cache.membersByName.isEmpty)
      }

      test("single import declaration") {
        val mockImport = createMockImport("testModule")
        val cache = TestMemberCache(IArray(mockImport))

        assert(cache.nameds.isEmpty)
        assert(cache.exports.isEmpty)
        assert(cache.imports.length == 1)
        assert(cache.imports.head == mockImport)
        assert(cache.unnamed.isEmpty)
        assert(cache.isModule) // non-local imports make it a module
        assert(cache.membersByName.isEmpty)
      }

      test("local import does not make it a module") {
        val localImport = createMockImport("testModule", isLocal = true)
        val cache = TestMemberCache(IArray(localImport))

        assert(cache.imports.length == 1)
        assert(!cache.isModule) // local imports don't make it a module
      }

      test("mixed member types") {
        val mockClass = createMockClass("TestClass")
        val mockInterface = createMockInterface("TestInterface")
        val mockExport = createMockExport("TestExport")
        val mockImport = createMockImport("testModule")

        val cache = TestMemberCache(IArray(mockClass, mockInterface, mockExport, mockImport))

        assert(cache.nameds.length == 2)
        assert(cache.nameds.contains(mockClass))
        assert(cache.nameds.contains(mockInterface))
        assert(cache.exports.length == 1)
        assert(cache.exports.head == mockExport)
        assert(cache.imports.length == 1)
        assert(cache.imports.head == mockImport)
        assert(cache.unnamed.isEmpty)
        assert(cache.isModule) // has exports and imports
        assert(cache.membersByName.size == 2)
      }
    }

    test("MemberCache - isModule Logic") {
      test("no exports, no imports") {
        val mockClass = createMockClass("TestClass")
        val cache = TestMemberCache(IArray(mockClass))
        assert(!cache.isModule)
      }

      test("has exports") {
        val mockExport = createMockExport("TestExport")
        val cache = TestMemberCache(IArray(mockExport))
        assert(cache.isModule)
      }

      test("has non-local imports") {
        val nonLocalImport = createMockImport("externalModule", isLocal = false)
        val cache = TestMemberCache(IArray(nonLocalImport))
        assert(cache.isModule)
      }

      test("has only local imports") {
        val localImport = createMockImport("localModule", isLocal = true)
        val cache = TestMemberCache(IArray(localImport))
        assert(!cache.isModule)
      }

      test("mixed local and non-local imports") {
        val localImport = createMockImport("localModule", isLocal = true)
        val nonLocalImport = createMockImport("externalModule", isLocal = false)
        val cache = TestMemberCache(IArray(localImport, nonLocalImport))
        assert(cache.isModule) // any non-local import makes it a module
      }

      test("exports and local imports") {
        val mockExport = createMockExport("TestExport")
        val localImport = createMockImport("localModule", isLocal = true)
        val cache = TestMemberCache(IArray(mockExport, localImport))
        assert(cache.isModule) // exports make it a module regardless of import types
      }
    }

    test("MemberCache - membersByName Functionality") {
      test("single member") {
        val mockClass = createMockClass("TestClass")
        val cache = TestMemberCache(IArray(mockClass))

        assert(cache.membersByName.size == 1)
        assert(cache.membersByName.contains(mockClass.name))
        assert(cache.membersByName(mockClass.name).length == 1)
        assert(cache.membersByName(mockClass.name).head == mockClass)
      }

      test("multiple members with different names") {
        val mockClass = createMockClass("TestClass")
        val mockInterface = createMockInterface("TestInterface")
        val mockVar = createMockVar("testVar")
        val cache = TestMemberCache(IArray(mockClass, mockInterface, mockVar))

        assert(cache.membersByName.size == 3)
        assert(cache.membersByName.contains(mockClass.name))
        assert(cache.membersByName.contains(mockInterface.name))
        assert(cache.membersByName.contains(mockVar.name))
      }

      test("multiple members with same name") {
        val mockClass1 = createMockClass("SameName")
        val mockClass2 = createMockClass("SameName")
        val cache = TestMemberCache(IArray(mockClass1, mockClass2))

        assert(cache.membersByName.size == 1)
        assert(cache.membersByName.contains(mockClass1.name))
        assert(cache.membersByName(mockClass1.name).length == 2)
        assert(cache.membersByName(mockClass1.name).contains(mockClass1))
        assert(cache.membersByName(mockClass1.name).contains(mockClass2))
      }
    }

    test("MemberCache - Modules Functionality") {
      test("no modules") {
        val mockClass = createMockClass("TestClass")
        val cache = TestMemberCache(IArray(mockClass))

        assert(cache.modules.isEmpty)
      }

      test("single module") {
        val mockModule = createMockModule("TestModule")
        val cache = TestMemberCache(IArray(mockModule))

        assert(cache.modules.size == 1)
        assert(cache.modules.contains(mockModule.name))
        assert(cache.modules(mockModule.name) == mockModule)
      }

      test("multiple modules with different names") {
        val module1 = createMockModule("Module1")
        val module2 = createMockModule("Module2")
        val cache = TestMemberCache(IArray(module1, module2))

        assert(cache.modules.size == 2)
        assert(cache.modules.contains(module1.name))
        assert(cache.modules.contains(module2.name))
        assert(cache.modules(module1.name) == module1)
        assert(cache.modules(module2.name) == module2)
      }

      test("mixed modules and other members") {
        val mockClass = createMockClass("TestClass")
        val mockModule = createMockModule("TestModule")
        val mockExport = createMockExport("TestExport")
        val cache = TestMemberCache(IArray(mockClass, mockModule, mockExport))

        assert(cache.modules.size == 1)
        assert(cache.modules.contains(mockModule.name))
        assert(cache.nameds.length == 2) // class and module
        assert(cache.exports.length == 1)
      }
    }

    test("MemberCache - Augmented Modules Functionality") {
      test("no augmented modules") {
        val mockClass = createMockClass("TestClass")
        val cache = TestMemberCache(IArray(mockClass))

        assert(cache.augmentedModules.isEmpty)
        assert(cache.augmentedModulesMap.isEmpty)
      }

      test("single augmented module") {
        val augmentedModule = createMockAugmentedModule("AugmentedModule")
        val cache = TestMemberCache(IArray(augmentedModule))

        assert(cache.augmentedModules.length == 1)
        assert(cache.augmentedModules.head == augmentedModule)
        assert(cache.augmentedModulesMap.size == 1)
        assert(cache.augmentedModulesMap.contains(augmentedModule.name))
        assert(cache.augmentedModulesMap(augmentedModule.name).head == augmentedModule)
      }

      test("multiple augmented modules with different names") {
        val augmented1 = createMockAugmentedModule("Augmented1")
        val augmented2 = createMockAugmentedModule("Augmented2")
        val cache = TestMemberCache(IArray(augmented1, augmented2))

        assert(cache.augmentedModules.length == 2)
        assert(cache.augmentedModules.contains(augmented1))
        assert(cache.augmentedModules.contains(augmented2))
        assert(cache.augmentedModulesMap.size == 2)
        assert(cache.augmentedModulesMap.contains(augmented1.name))
        assert(cache.augmentedModulesMap.contains(augmented2.name))
      }

      test("multiple augmented modules with same name") {
        val augmented1 = createMockAugmentedModule("SameName")
        val augmented2 = createMockAugmentedModule("SameName")
        val cache = TestMemberCache(IArray(augmented1, augmented2))

        assert(cache.augmentedModules.length == 2)
        assert(cache.augmentedModulesMap.size == 1)
        assert(cache.augmentedModulesMap.contains(augmented1.name))
        assert(cache.augmentedModulesMap(augmented1.name).length == 2)
        assert(cache.augmentedModulesMap(augmented1.name).contains(augmented1))
        assert(cache.augmentedModulesMap(augmented1.name).contains(augmented2))
      }

      test("mixed augmented modules and other members") {
        val mockClass = createMockClass("TestClass")
        val augmentedModule = createMockAugmentedModule("AugmentedModule")
        val mockModule = createMockModule("RegularModule")
        val cache = TestMemberCache(IArray(mockClass, augmentedModule, mockModule))

        assert(cache.augmentedModules.length == 1)
        assert(cache.augmentedModules.head == augmentedModule)
        assert(cache.modules.size == 1)
        assert(cache.modules.contains(mockModule.name))
        assert(cache.nameds.length == 3) // class, regular module, and augmented module
        assert(cache.unnamed.isEmpty) // all are named declarations
      }
    }

    test("HasClassMembers - Basic Functionality") {
      test("empty members collection") {
        val hasClassMembers = TestHasClassMembers(IArray.Empty)

        assert(hasClassMembers.membersByName.isEmpty)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("single named member") {
        val memberFunction = createMockMemberFunction("testMethod")
        val hasClassMembers = TestHasClassMembers(IArray(memberFunction))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(memberFunction.name))
        assert(hasClassMembers.membersByName(memberFunction.name).head == memberFunction)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("single unnamed member - call signature") {
        val memberCall = createMockMemberCall()
        val hasClassMembers = TestHasClassMembers(IArray(memberCall))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(TsIdent.Apply))
        assert(hasClassMembers.membersByName(TsIdent.Apply).head == memberCall)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("single unnamed member - constructor") {
        val memberCtor = createMockMemberCtor()
        val hasClassMembers = TestHasClassMembers(IArray(memberCtor))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(TsIdent.constructor))
        assert(hasClassMembers.membersByName(TsIdent.constructor).head == memberCtor)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("mixed member types") {
        val memberFunction = createMockMemberFunction("testMethod")
        val memberProperty = createMockMemberProperty("testProp")
        val memberCall = createMockMemberCall()
        val memberCtor = createMockMemberCtor()

        val hasClassMembers = TestHasClassMembers(IArray(memberFunction, memberProperty, memberCall, memberCtor))

        assert(hasClassMembers.membersByName.size == 4)
        assert(hasClassMembers.membersByName.contains(memberFunction.name))
        assert(hasClassMembers.membersByName.contains(memberProperty.name))
        assert(hasClassMembers.membersByName.contains(TsIdent.Apply))
        assert(hasClassMembers.membersByName.contains(TsIdent.constructor))
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("multiple members with same name") {
        val memberFunction1 = createMockMemberFunction("sameName")
        val memberFunction2 = createMockMemberFunction("sameName")
        val hasClassMembers = TestHasClassMembers(IArray(memberFunction1, memberFunction2))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(memberFunction1.name))
        assert(hasClassMembers.membersByName(memberFunction1.name).length == 2)
        assert(hasClassMembers.membersByName(memberFunction1.name).contains(memberFunction1))
        assert(hasClassMembers.membersByName(memberFunction1.name).contains(memberFunction2))
      }

      test("multiple call signatures") {
        val memberCall1 = createMockMemberCall()
        val memberCall2 = createMockMemberCall()
        val hasClassMembers = TestHasClassMembers(IArray(memberCall1, memberCall2))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(TsIdent.Apply))
        assert(hasClassMembers.membersByName(TsIdent.Apply).length == 2)
        assert(hasClassMembers.membersByName(TsIdent.Apply).contains(memberCall1))
        assert(hasClassMembers.membersByName(TsIdent.Apply).contains(memberCall2))
      }

      test("multiple constructors") {
        val memberCtor1 = createMockMemberCtor()
        val memberCtor2 = createMockMemberCtor()
        val hasClassMembers = TestHasClassMembers(IArray(memberCtor1, memberCtor2))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(TsIdent.constructor))
        assert(hasClassMembers.membersByName(TsIdent.constructor).length == 2)
        assert(hasClassMembers.membersByName(TsIdent.constructor).contains(memberCtor1))
        assert(hasClassMembers.membersByName(TsIdent.constructor).contains(memberCtor2))
      }
    }

    test("MemberCache - Edge Cases and Error Conditions") {
      test("large number of members") {
        val members = (1 to 100).map(i => createMockClass(s"Class$i")).toArray
        val cache = TestMemberCache(IArray.fromArray(members))

        assert(cache.nameds.length == 100)
        assert(cache.membersByName.size == 100)
        assert(cache.exports.isEmpty)
        assert(cache.imports.isEmpty)
        assert(cache.unnamed.isEmpty)
        assert(!cache.isModule)
      }

      test("mixed large collection") {
        val classes = (1 to 50).map(i => createMockClass(s"Class$i"))
        val exports = (1 to 25).map(i => createMockExport(s"Export$i"))
        val imports = (1 to 25).map(i => createMockImport(s"module$i"))
        val allMembers = classes ++ exports ++ imports

        val cache = TestMemberCache(IArray.fromArray(allMembers.toArray))

        assert(cache.nameds.length == 50)
        assert(cache.exports.length == 25)
        assert(cache.imports.length == 25)
        assert(cache.unnamed.isEmpty)
        assert(cache.isModule) // has exports and imports
        assert(cache.membersByName.size == 50)
      }

      test("duplicate names across different member types") {
        val mockClass = createMockClass("DuplicateName")
        val mockInterface = createMockInterface("DuplicateName")
        val mockVar = createMockVar("DuplicateName")
        val cache = TestMemberCache(IArray(mockClass, mockInterface, mockVar))

        assert(cache.nameds.length == 3)
        assert(cache.membersByName.size == 1)
        assert(cache.membersByName.contains(mockClass.name))
        assert(cache.membersByName(mockClass.name).length == 3)
        assert(cache.membersByName(mockClass.name).contains(mockClass))
        assert(cache.membersByName(mockClass.name).contains(mockInterface))
        assert(cache.membersByName(mockClass.name).contains(mockVar))
      }

      test("only local imports - not a module") {
        val localImport1 = createMockImport("local1", isLocal = true)
        val localImport2 = createMockImport("local2", isLocal = true)
        val localImport3 = createMockImport("local3", isLocal = true)
        val cache = TestMemberCache(IArray(localImport1, localImport2, localImport3))

        assert(cache.imports.length == 3)
        assert(!cache.isModule) // only local imports don't make it a module
        assert(cache.nameds.isEmpty)
        assert(cache.exports.isEmpty)
        assert(cache.unnamed.isEmpty)
      }

      test("complex module scenario with augmented modules") {
        val regularModule = createMockModule("RegularModule")
        val augmentedModule1 = createMockAugmentedModule("AugmentedModule1")
        val augmentedModule2 = createMockAugmentedModule("AugmentedModule2")
        val augmentedModule3 = createMockAugmentedModule("AugmentedModule1") // same name as first

        val cache = TestMemberCache(IArray(regularModule, augmentedModule1, augmentedModule2, augmentedModule3))

        assert(cache.modules.size == 1)
        assert(cache.modules.contains(regularModule.name))
        assert(cache.augmentedModules.length == 3)
        assert(cache.augmentedModulesMap.size == 2) // two unique names
        assert(cache.augmentedModulesMap.contains(augmentedModule1.name))
        assert(cache.augmentedModulesMap.contains(augmentedModule2.name))
        assert(cache.augmentedModulesMap(augmentedModule1.name).length == 2) // two with same name
        assert(cache.augmentedModulesMap(augmentedModule2.name).length == 1)
      }
    }

    test("HasClassMembers - Edge Cases and Error Conditions") {
      test("large number of class members") {
        val members = (1 to 100).map(i => createMockMemberFunction(s"method$i")).toArray
        val hasClassMembers = TestHasClassMembers(IArray.fromArray(members))

        assert(hasClassMembers.membersByName.size == 100)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("mixed member types with duplicates") {
        val function1 = createMockMemberFunction("sameName")
        val function2 = createMockMemberFunction("sameName")
        val property1 = createMockMemberProperty("sameName")
        val property2 = createMockMemberProperty("sameName")

        val hasClassMembers = TestHasClassMembers(IArray(function1, function2, property1, property2))

        assert(hasClassMembers.membersByName.size == 1)
        assert(hasClassMembers.membersByName.contains(function1.name))
        assert(hasClassMembers.membersByName(function1.name).length == 4)
        assert(hasClassMembers.unnamed.isEmpty)
      }

      test("many call signatures and constructors") {
        val calls = (1 to 10).map(_ => createMockMemberCall())
        val ctors = (1 to 5).map(_ => createMockMemberCtor())
        val allMembers = calls ++ ctors

        val hasClassMembers = TestHasClassMembers(IArray.fromArray(allMembers.toArray))

        assert(hasClassMembers.membersByName.size == 2)
        assert(hasClassMembers.membersByName.contains(TsIdent.Apply))
        assert(hasClassMembers.membersByName.contains(TsIdent.constructor))
        assert(hasClassMembers.membersByName(TsIdent.Apply).length == 10)
        assert(hasClassMembers.membersByName(TsIdent.constructor).length == 5)
        assert(hasClassMembers.unnamed.isEmpty)
      }
    }
  }
}