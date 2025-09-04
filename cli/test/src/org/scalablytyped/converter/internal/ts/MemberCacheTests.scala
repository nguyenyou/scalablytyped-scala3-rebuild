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
  }
}