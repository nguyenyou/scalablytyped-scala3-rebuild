package org.scalablytyped.converter.internal
package ts
package modules

import utest.*
import org.scalablytyped.converter.internal.logging.Logger

object InferredDefaultModuleTests extends TestSuite {

  // Helper methods for creating test data specific to InferredDefaultModule tests

  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent =
    TsQIdent(IArray.fromTraversable(parts.map(TsIdentSimple.apply)))

  def createModuleIdent(name: String): TsIdentModule =
    TsIdentModule(None, List(name))

  def createMockInterface(
      name: String,
      members: IArray[TsMember] = Empty,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = Empty,
      members = members,
      codePath = codePath
    )

  def createMockClass(
      name: String,
      members: IArray[TsMember] = Empty,
      codePath: CodePath = CodePath.NoPath
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
      codePath = codePath
    )

  def createMockFunction(
      name: String,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(TsTypeRef.string)
      ),
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockVar(
      name: String,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = Some(TsTypeRef.string),
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockTypeAlias(
      name: String,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      alias = TsTypeRef.string,
      codePath = codePath
    )

  def createMockModule(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclModule =
    TsDeclModule(
      comments = NoComments,
      declared = false,
      name = createModuleIdent(name),
      members = members,
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createMockAugmentedModule(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      codePath: CodePath = CodePath.NoPath
  ): TsAugmentedModule =
    TsAugmentedModule(
      comments = NoComments,
      name = createModuleIdent(name),
      members = members,
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createMockImport(
      imported: IArray[TsImported] = IArray(TsImported.Ident(createSimpleIdent("React"))),
      from: TsImportee = TsImportee.From(createModuleIdent("react"))
  ): TsImport =
    TsImport(
      typeOnly = false,
      imported = imported,
      from = from
    )

  def createMockParsedFile(
      members: IArray[TsContainerOrDecl],
      isModule: Boolean = true,
      codePath: CodePath = CodePath.NoPath
  ): TsParsedFile = {
    TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = members,
      codePath = codePath
    )
  }

  // Helper to create a file that will be treated as a module
  def createModuleFile(members: IArray[TsContainerOrDecl]): TsParsedFile = {
    // Add an import to make it a module
    val import1 = createMockImport()
    createMockParsedFile(import1 +: members, isModule = false)
  }

  // Helper to create a file that will NOT be treated as a module
  def createNonModuleFile(members: IArray[TsContainerOrDecl]): TsParsedFile = {
    createMockParsedFile(members, isModule = false)
  }

  def createMockLogger(): Logger[Unit] = Logger.DevNull

  def tests = Tests {
    test("InferredDefaultModule - Basic Functionality") {
      test("creates module for regular module file with content") {
        val interface1 = createMockInterface("Interface1")
        val function1  = createMockFunction("function1")
        val members    = IArray(interface1, function1)
        val file       = createModuleFile(members)
        val moduleName = createModuleIdent("test-module")
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result.members.length == 1)
        val module = result.members.head.asInstanceOf[TsDeclModule]
        assert(module.name === moduleName)
        assert(module.declared)
        assert(module.members.length == 3) // import + interface1 + function1
        assert(module.jsLocation.isInstanceOf[JsLocation.Module])
        val jsLocation = module.jsLocation.asInstanceOf[JsLocation.Module]
        assert(jsLocation.module === moduleName)
        assert(jsLocation.spec === ModuleSpec.Defaulted)
      }

      test("returns original file when not a module") {
        val interface1 = createMockInterface("Interface1")
        val members    = IArray(interface1)
        val file       = createNonModuleFile(members)
        val moduleName = createModuleIdent("test-module")
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result === file)
        assert(result.members.length == 1)
        assert(result.members.head === interface1)
      }
    }

    test("InferredDefaultModule - onlyAugments Detection") {
      test("returns original file when only contains augments") {
        val import1         = createMockImport()
        val augmentedModule = createMockAugmentedModule("existing-module")
        val module          = createMockModule("some-module")
        val typeAlias       = createMockTypeAlias("TypeAlias")
        val interface1      = createMockInterface("Interface1")
        val members         = IArray(import1, augmentedModule, module, typeAlias, interface1)
        val file            = createNonModuleFile(members) // Already has import1
        val moduleName      = createModuleIdent("test-module")
        val logger          = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result === file)
        assert(result.members.length == 5)
      }

      test("creates module when contains non-augment content") {
        val import1         = createMockImport()
        val augmentedModule = createMockAugmentedModule("existing-module")
        val function1       = createMockFunction("function1") // This makes it non-augment-only
        val members         = IArray(import1, augmentedModule, function1)
        val file            = createNonModuleFile(members)    // Already has import1
        val moduleName      = createModuleIdent("test-module")
        val logger          = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result.members.length == 1)
        val module = result.members.head.asInstanceOf[TsDeclModule]
        assert(module.name === moduleName)
        assert(module.members.length == 3)
      }
    }

    test("InferredDefaultModule - alreadyExists Detection") {
      test("returns original file when module already exists") {
        val moduleName     = createModuleIdent("test-module")
        val existingModule = createMockModule("test-module")
        val interface1     = createMockInterface("Interface1")
        val import1        = createMockImport()
        val members        = IArray(import1, existingModule, interface1)
        val file           = createNonModuleFile(members) // Don't add extra import
        val logger         = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result === file)
        assert(result.members.length == 3)           // import1 + existingModule + interface1
        assert(result.members(1) === existingModule) // existingModule should be at index 1
      }

      test("returns original file when contains only augments (even with different module name)") {
        val moduleName     = createModuleIdent("test-module")
        val existingModule = createMockModule("different-module")
        val interface1     = createMockInterface("Interface1")
        val members        = IArray(existingModule, interface1)
        val file           = createModuleFile(members)
        val logger         = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        // Should return original file because it only contains "augments" (modules, interfaces, etc.)
        assert(result === file)
        assert(result.members.length == 3) // import + existingModule + interface1
      }
    }

    test("InferredDefaultModule - Edge Cases") {
      test("returns original file when only contains imports") {
        val members    = Empty
        val file       = createModuleFile(members) // This creates a file with just an import
        val moduleName = createModuleIdent("test-module")
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        // Should return original file because imports are considered "augments"
        assert(result === file)
        assert(result.members.length == 1) // contains just the import
        assert(result.members.head.isInstanceOf[TsImport])
      }

      test("handles file with only imports") {
        val import1 = createMockImport()
        val import2 = createMockImport(
          imported = IArray(TsImported.Ident(createSimpleIdent("Vue"))),
          from = TsImportee.From(createModuleIdent("vue"))
        )
        val members    = IArray(import1, import2)
        val file       = createNonModuleFile(members) // Already has imports
        val moduleName = createModuleIdent("test-module")
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result === file) // Should return original since only augments
        assert(result.members.length == 2)
      }

      test("returns original file when only contains interfaces") {
        val interface1 = createMockInterface("Interface1")
        val members    = IArray(interface1)
        val file       = createModuleFile(members)
        val moduleName = TsIdentModule(Some("@scope"), List("package", "submodule"))
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        // Should return original file because interfaces are considered "augments"
        assert(result === file)
        assert(result.members.length == 2) // import + interface1
      }
    }

    test("InferredDefaultModule - Comprehensive onlyAugments Testing") {
      test("correctly identifies augment-only content with all allowed types") {
        val import1 = createMockImport()
        val import2 = createMockImport(
          imported = IArray(TsImported.Star(Some(createSimpleIdent("All")))),
          from = TsImportee.From(createModuleIdent("everything"))
        )
        val augmentedModule1 = createMockAugmentedModule("module1")
        val augmentedModule2 = createMockAugmentedModule("module2")
        val module1          = createMockModule("internal-module")
        val typeAlias1       = createMockTypeAlias("TypeAlias1")
        val typeAlias2       = createMockTypeAlias("TypeAlias2")
        val interface1       = createMockInterface("Interface1")
        val interface2       = createMockInterface("Interface2")

        val members = IArray(
          import1,
          import2,
          augmentedModule1,
          augmentedModule2,
          module1,
          typeAlias1,
          typeAlias2,
          interface1,
          interface2
        )
        val file       = createNonModuleFile(members) // Already has import1
        val moduleName = createModuleIdent("test-module")
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result === file) // Should return original since only augments
        assert(result.members.length == 9)
      }

      test("detects non-augment content with functions") {
        val import1    = createMockImport()
        val typeAlias  = createMockTypeAlias("TypeAlias")
        val function1  = createMockFunction("myFunction")
        val members    = IArray(import1, typeAlias, function1)
        val file       = createNonModuleFile(members) // Already has import1
        val moduleName = createModuleIdent("test-module")
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result.members.length == 1)
        val module = result.members.head.asInstanceOf[TsDeclModule]
        assert(module.members.length == 3)
      }

      test("detects non-augment content with variables") {
        val import1    = createMockImport()
        val interface1 = createMockInterface("Interface1")
        val variable1  = createMockVar("myVariable")
        val members    = IArray(import1, interface1, variable1)
        val file       = createNonModuleFile(members) // Already has import1
        val moduleName = createModuleIdent("test-module")
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result.members.length == 1)
        val module = result.members.head.asInstanceOf[TsDeclModule]
        assert(module.members.length == 3)
      }

      test("detects non-augment content with classes") {
        val augmentedModule = createMockAugmentedModule("existing-module")
        val typeAlias       = createMockTypeAlias("TypeAlias")
        val class1          = createMockClass("MyClass")
        val members         = IArray(augmentedModule, typeAlias, class1)
        val file            = createModuleFile(members)
        val moduleName      = createModuleIdent("test-module")
        val logger          = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result.members.length == 1)
        val module = result.members.head.asInstanceOf[TsDeclModule]
        assert(module.members.length == 4) // includes the added import + augmentedModule + typeAlias + class1
      }
    }

    test("InferredDefaultModule - Module Existence Checking") {
      test("correctly identifies existing module with exact name match") {
        val moduleName     = createModuleIdent("exact-match")
        val existingModule = createMockModule("exact-match")
        val interface1     = createMockInterface("Interface1")
        val function1      = createMockFunction("function1")
        val members        = IArray(existingModule, interface1, function1)
        val file           = createModuleFile(members)
        val logger         = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result === file)
        assert(result.members.length == 4) // includes the added import + existingModule + interface1 + function1
      }

      test("returns original file when contains multiple modules") {
        val moduleName      = createModuleIdent("target-module")
        val existingModule1 = createMockModule("other-module-1")
        val existingModule2 = createMockModule("other-module-2")
        val interface1      = createMockInterface("Interface1")
        val members         = IArray(existingModule1, existingModule2, interface1)
        val file            = createModuleFile(members)
        val logger          = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        // Should return original file because modules are considered "augments"
        assert(result === file)
        assert(result.members.length == 4) // import + existingModule1 + existingModule2 + interface1
      }

      test("handles scoped module names correctly") {
        val moduleName = TsIdentModule(Some("@scope"), List("package"))
        val existingModule = TsDeclModule(
          comments = NoComments,
          declared = false,
          name = TsIdentModule(Some("@scope"), List("package")),
          members = Empty,
          codePath = CodePath.NoPath,
          jsLocation = JsLocation.Zero
        )
        val interface1 = createMockInterface("Interface1")
        val members    = IArray(existingModule, interface1)
        val file       = createModuleFile(members)
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result === file)            // Should return original since module exists
        assert(result.members.length == 3) // import + existingModule + interface1
      }
    }

    test("InferredDefaultModule - Module Creation Details") {
      test("created module has correct properties") {
        val interface1 = createMockInterface("Interface1")
        val function1  = createMockFunction("function1")
        val members    = IArray(interface1, function1)
        val file       = createModuleFile(members)
        val moduleName = createModuleIdent("test-module")
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result.members.length == 1)
        val module = result.members.head.asInstanceOf[TsDeclModule]

        // Check all module properties
        assert(module.comments === NoComments)
        assert(module.declared === true)
        assert(module.name === moduleName)
        assert(module.members.length == 3) // includes the added import + interface1 + function1
        assert(module.codePath === CodePath.NoPath)
        assert(module.jsLocation.isInstanceOf[JsLocation.Module])

        val jsLocation = module.jsLocation.asInstanceOf[JsLocation.Module]
        assert(jsLocation.module === moduleName)
        assert(jsLocation.spec === ModuleSpec.Defaulted)
      }

      test("preserves original member order in created module") {
        val interface1 = createMockInterface("Interface1")
        val function1  = createMockFunction("function1")
        val class1     = createMockClass("Class1")
        val variable1  = createMockVar("variable1")
        val members    = IArray(interface1, function1, class1, variable1)
        val file       = createModuleFile(members)
        val moduleName = createModuleIdent("test-module")
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        val module = result.members.head.asInstanceOf[TsDeclModule]
        assert(module.members.length == 5) // includes the added import + interface1 + function1 + class1 + variable1
        // The added import is at index 0, so original members are shifted
        assert(module.members(1) === interface1)
        assert(module.members(2) === function1)
        assert(module.members(3) === class1)
        assert(module.members(4) === variable1)
      }

      test("handles file with mixed content types") {
        val import1         = createMockImport()
        val augmentedModule = createMockAugmentedModule("existing")
        val interface1      = createMockInterface("Interface1")
        val function1       = createMockFunction("function1")
        val class1          = createMockClass("Class1")
        val typeAlias       = createMockTypeAlias("TypeAlias")
        val variable1       = createMockVar("variable1")

        val members    = IArray(import1, augmentedModule, interface1, function1, class1, typeAlias, variable1)
        val file       = createNonModuleFile(members) // Already has import1
        val moduleName = createModuleIdent("mixed-content-module")
        val logger     = createMockLogger()

        val result = InferredDefaultModule(file, moduleName, logger)

        assert(result.members.length == 1)
        val module = result.members.head.asInstanceOf[TsDeclModule]
        assert(module.name === moduleName)
        assert(module.members.length == 7) // All original members preserved
      }
    }
  }
}
