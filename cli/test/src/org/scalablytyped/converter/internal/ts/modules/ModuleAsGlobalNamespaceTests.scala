package org.scalablytyped.converter.internal
package ts
package modules

import utest.*

object ModuleAsGlobalNamespaceTests extends TestSuite {

  // Helper methods for creating test data specific to ModuleAsGlobalNamespace tests

  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createLibraryIdent(name: String): TsIdentLibrary = TsIdentLibrarySimple(name)

  def createModuleIdent(name: String): TsIdentModule = TsIdentModule.simple(name)

  def createMockInterface(
      name: String,
      members: IArray[TsMember] = Empty,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("interface"))
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
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("class"))
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

  def createMockModule(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("module"))
  ): TsDeclModule =
    TsDeclModule(
      comments = NoComments,
      declared = false,
      name = TsIdentModule.simple(name),
      members = members,
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createMockNamespace(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("namespace"))
  ): TsDeclNamespace =
    TsDeclNamespace(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      members = members,
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createMockParsedFile(
      members: IArray[TsContainerOrDecl],
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("file"))
  ): TsParsedFile =
    TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = members,
      codePath = codePath
    )

  def createExportAsNamespace(name: String): TsExportAsNamespace =
    TsExportAsNamespace(createSimpleIdent(name))

  def createMockFunction(
      name: String,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("function"))
  ): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(TsTypeRef(NoComments, TsQIdent.of("void"), Empty))
      ),
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def tests = Tests {
    test("ModuleAsGlobalNamespace - Basic Functionality") {
      test("returns original file when no top-level module exists") {
        val libName    = createLibraryIdent("test-lib")
        val interface1 = createMockInterface("TestInterface")
        val file       = createMockParsedFile(IArray(interface1))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result == file)
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclInterface].name.value == "TestInterface")
      }

      test("returns original file when top-level module has no export-as-namespace") {
        val libName        = createLibraryIdent("test-lib")
        val interface1     = createMockInterface("TestInterface")
        val topLevelModule = createMockModule("test-lib", IArray(interface1))
        val file           = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result == file)
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclModule].name.value == "test-lib")
      }
    }

    test("ModuleAsGlobalNamespace - Export As Namespace Detection") {
      test("creates global namespace when export-as-namespace is present in module") {
        val libName           = createLibraryIdent("test-lib")
        val interface1        = createMockInterface("TestInterface")
        val exportAsNamespace = createExportAsNamespace("MyGlobal")
        val topLevelModule    = createMockModule("test-lib", IArray(interface1, exportAsNamespace))
        val file              = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // First member should be the global namespace
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.nonEmpty)

        // Second member should be the original module
        val originalModule = result.members(1).asInstanceOf[TsDeclModule]
        assert(originalModule.name.value == "test-lib")
      }

      test("creates global namespace when export-as-namespace is present in file") {
        val libName           = createLibraryIdent("test-lib")
        val interface1        = createMockInterface("TestInterface")
        val topLevelModule    = createMockModule("test-lib", IArray(interface1))
        val exportAsNamespace = createExportAsNamespace("MyGlobal")
        val file              = createMockParsedFile(IArray(topLevelModule, exportAsNamespace))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 3) // global namespace + original module + file export

        // First member should be the global namespace
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.nonEmpty)
      }
    }

    test("ModuleAsGlobalNamespace - Default Export Handling") {
      test("handles module with default export when export-as-namespace present") {
        val libName           = createLibraryIdent("test-lib")
        val defaultInterface  = createMockInterface("default")
        val exportAsNamespace = createExportAsNamespace("MyGlobal")
        val topLevelModule    = createMockModule("test-lib", IArray(defaultInterface, exportAsNamespace))
        val file              = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // First member should be the global namespace
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.nonEmpty)

        // The global namespace should contain the renamed default export as a type alias
        val globalMember = globalNamespace.members.head.asInstanceOf[TsDeclTypeAlias]
        assert(globalMember.name.value == "MyGlobal")
      }

      test("creates namespace when no default export exists") {
        val libName           = createLibraryIdent("test-lib")
        val interface1        = createMockInterface("TestInterface")
        val function1         = createMockFunction("testFunction")
        val exportAsNamespace = createExportAsNamespace("MyGlobal")
        val topLevelModule    = createMockModule("test-lib", IArray(interface1, function1, exportAsNamespace))
        val file              = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // First member should be the global namespace
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.nonEmpty)

        // The global namespace should contain a namespace with the export name
        val innerNamespace = globalNamespace.members.head.asInstanceOf[TsDeclNamespace]
        assert(innerNamespace.name.value == "MyGlobal")
        assert(innerNamespace.members.length == 3) // interface1, function1, exportAsNamespace
      }
    }

    test("ModuleAsGlobalNamespace - Multiple Export As Namespace") {
      test("handles multiple export-as-namespace declarations") {
        val libName            = createLibraryIdent("test-lib")
        val interface1         = createMockInterface("TestInterface")
        val exportAsNamespace1 = createExportAsNamespace("Global1")
        val exportAsNamespace2 = createExportAsNamespace("Global2")
        val topLevelModule = createMockModule("test-lib", IArray(interface1, exportAsNamespace1, exportAsNamespace2))
        val file           = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // First member should be the global namespace
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.length == 2) // Two global namespaces created
      }
    }

    test("ModuleAsGlobalNamespace - Code Path Handling") {
      test("sets correct code paths for global namespace") {
        val libName           = createLibraryIdent("test-lib")
        val interface1        = createMockInterface("TestInterface")
        val exportAsNamespace = createExportAsNamespace("MyGlobal")
        val topLevelModule    = createMockModule("test-lib", IArray(interface1, exportAsNamespace))
        val originalCodePath  = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("path"))
        val file              = createMockParsedFile(IArray(topLevelModule), originalCodePath)

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // Check that the global namespace has the correct code path
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.codePath.isInstanceOf[CodePath.HasPath])
        val globalCodePath = globalNamespace.codePath.asInstanceOf[CodePath.HasPath]
        assert(globalCodePath.codePath.parts.last == TsIdent.Global)
      }
    }

    test("ModuleAsGlobalNamespace - Edge Cases") {
      test("handles empty module") {
        val libName           = createLibraryIdent("test-lib")
        val exportAsNamespace = createExportAsNamespace("MyGlobal")
        val topLevelModule    = createMockModule("test-lib", IArray(exportAsNamespace))
        val file              = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // First member should be the global namespace
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.nonEmpty)
      }

      test("handles module with only export-as-namespace") {
        val libName           = createLibraryIdent("test-lib")
        val exportAsNamespace = createExportAsNamespace("MyGlobal")
        val topLevelModule    = createMockModule("test-lib", IArray(exportAsNamespace))
        val file              = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // The global namespace should contain a namespace with the export name
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        val innerNamespace  = globalNamespace.members.head.asInstanceOf[TsDeclNamespace]
        assert(innerNamespace.name.value == "MyGlobal")
        assert(innerNamespace.members.length == 1) // Only the exportAsNamespace
      }

      test("handles file with no members") {
        val libName = createLibraryIdent("test-lib")
        val file    = createMockParsedFile(Empty)

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result == file)
        assert(result.members.isEmpty)
      }

      test("handles module with wrong name") {
        val libName           = createLibraryIdent("test-lib")
        val interface1        = createMockInterface("TestInterface")
        val exportAsNamespace = createExportAsNamespace("MyGlobal")
        val wrongModule       = createMockModule("wrong-lib", IArray(interface1, exportAsNamespace))
        val file              = createMockParsedFile(IArray(wrongModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result == file)
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclModule].name.value == "wrong-lib")
      }
    }

    test("ModuleAsGlobalNamespace - Complex Scenarios") {
      test("handles module with mixed content types") {
        val libName           = createLibraryIdent("test-lib")
        val interface1        = createMockInterface("TestInterface")
        val class1            = createMockClass("TestClass")
        val function1         = createMockFunction("testFunction")
        val namespace1        = createMockNamespace("TestNamespace")
        val exportAsNamespace = createExportAsNamespace("MyGlobal")

        val topLevelModule =
          createMockModule("test-lib", IArray(interface1, class1, function1, namespace1, exportAsNamespace))
        val file = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // First member should be the global namespace
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.nonEmpty)

        // The global namespace should contain a namespace with all the content
        val innerNamespace = globalNamespace.members.head.asInstanceOf[TsDeclNamespace]
        assert(innerNamespace.name.value == "MyGlobal")
        assert(innerNamespace.members.length == 5) // All original members
      }

      test("handles nested module structures") {
        val libName           = createLibraryIdent("test-lib")
        val innerInterface    = createMockInterface("InnerInterface")
        val innerNamespace    = createMockNamespace("InnerNamespace", IArray(innerInterface))
        val exportAsNamespace = createExportAsNamespace("MyGlobal")

        val topLevelModule = createMockModule("test-lib", IArray(innerNamespace, exportAsNamespace))
        val file           = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // First member should be the global namespace
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)

        // The global namespace should contain a namespace with nested content
        val outerNamespace = globalNamespace.members.head.asInstanceOf[TsDeclNamespace]
        assert(outerNamespace.name.value == "MyGlobal")
        assert(outerNamespace.members.length == 2) // innerNamespace + exportAsNamespace
      }

      test("handles module with both file-level and module-level export-as-namespace") {
        val libName                 = createLibraryIdent("test-lib")
        val interface1              = createMockInterface("TestInterface")
        val moduleExportAsNamespace = createExportAsNamespace("ModuleGlobal")
        val topLevelModule          = createMockModule("test-lib", IArray(interface1, moduleExportAsNamespace))
        val fileExportAsNamespace   = createExportAsNamespace("FileGlobal")
        val file                    = createMockParsedFile(IArray(topLevelModule, fileExportAsNamespace))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 3) // global namespace + original module + file export

        // First member should be the global namespace
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.length == 2) // Two global namespaces created
      }

      test("preserves original module structure") {
        val libName           = createLibraryIdent("test-lib")
        val interface1        = createMockInterface("TestInterface")
        val exportAsNamespace = createExportAsNamespace("MyGlobal")
        val topLevelModule    = createMockModule("test-lib", IArray(interface1, exportAsNamespace))
        val otherModule       = createMockModule("other-module", IArray(interface1))
        val file              = createMockParsedFile(IArray(topLevelModule, otherModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 3) // global namespace + original modules

        // Check that the original modules are preserved
        val originalTopLevel = result.members(1).asInstanceOf[TsDeclModule]
        assert(originalTopLevel.name.value == "test-lib")

        val originalOther = result.members(2).asInstanceOf[TsDeclModule]
        assert(originalOther.name.value == "other-module")
      }
    }

    test("ModuleAsGlobalNamespace - Integration Testing") {
      test("works with realistic module structure") {
        val libName = createLibraryIdent("my-library")

        // Create a realistic module structure
        val publicInterface = createMockInterface("PublicAPI")
        val utilityClass    = createMockClass("Utils")
        val helperFunction  = createMockFunction("helper")
        val configNamespace = createMockNamespace(
          "Config",
          IArray(
            createMockInterface("Options")
          )
        )
        val exportAsNamespace = createExportAsNamespace("MyLib")

        val topLevelModule = createMockModule(
          "my-library",
          IArray(publicInterface, utilityClass, helperFunction, configNamespace, exportAsNamespace)
        )

        val file = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // Verify the global namespace structure
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.declared == false)
        assert(globalNamespace.jsLocation == JsLocation.Zero)

        // Verify the inner namespace contains all the original content
        val innerNamespace = globalNamespace.members.head.asInstanceOf[TsDeclNamespace]
        assert(innerNamespace.name.value == "MyLib")
        assert(innerNamespace.members.length == 5) // All original members

        // Verify the original module is preserved
        val originalModule = result.members(1).asInstanceOf[TsDeclModule]
        assert(originalModule.name.value == "my-library")
      }

      test("handles library name with special characters") {
        val libName           = createLibraryIdent("@scope/my-lib")
        val interface1        = createMockInterface("TestInterface")
        val exportAsNamespace = createExportAsNamespace("ScopedLib")
        val topLevelModule    = createMockModule("@scope/my-lib", IArray(interface1, exportAsNamespace))
        val file              = createMockParsedFile(IArray(topLevelModule))

        val result = ModuleAsGlobalNamespace(libName, file)

        assert(result.members.length == 2)

        // First member should be the global namespace
        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)

        // The global namespace should contain the scoped library namespace
        val innerNamespace = globalNamespace.members.head.asInstanceOf[TsDeclNamespace]
        assert(innerNamespace.name.value == "ScopedLib")
      }
    }
  }
}
