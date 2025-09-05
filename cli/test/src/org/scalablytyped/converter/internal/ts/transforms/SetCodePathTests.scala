package org.scalablytyped.converter.internal
package ts
package transforms

import utest.*

object SetCodePathTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createCodePath(libName: String, parts: String*): CodePath.HasPath =
    CodePath.HasPath(createSimpleIdent(libName), createQIdent(parts*))

  def createMockClass(
    name: String,
    codePath: CodePath = CodePath.NoPath,
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
      codePath = codePath
    )

  def createMockInterface(
    name: String,
    codePath: CodePath = CodePath.NoPath,
    members: IArray[TsMember] = Empty
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

  def createMockFunction(
    name: String,
    codePath: CodePath = CodePath.NoPath
  ): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = TsFunSig(NoComments, Empty, Empty, None),
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockVariable(
    name: String,
    codePath: CodePath = CodePath.NoPath
  ): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = None,
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockNamespace(
    name: String,
    codePath: CodePath = CodePath.NoPath,
    members: IArray[TsContainerOrDecl] = Empty
  ): TsDeclNamespace =
    TsDeclNamespace(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockModule(
    name: String,
    codePath: CodePath = CodePath.NoPath,
    members: IArray[TsContainerOrDecl] = Empty
  ): TsDeclModule =
    TsDeclModule(
      comments = NoComments,
      declared = false,
      name = TsIdentModule(None, List(name)),
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockParsedFile(
    codePath: CodePath = CodePath.NoPath,
    members: IArray[TsContainerOrDecl] = Empty
  ): TsParsedFile =
    TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = members,
      codePath = codePath
    )

  def createMockGlobal(
    codePath: CodePath = CodePath.NoPath,
    members: IArray[TsContainerOrDecl] = Empty
  ): TsGlobal =
    TsGlobal(
      comments = NoComments,
      declared = false,
      members = members,
      codePath = codePath
    )

  def tests = Tests {
    test("SetCodePath - Basic Functionality") {
      test("extends TreeTransformation") {
        assert(SetCodePath.isInstanceOf[TreeTransformation[CodePath.HasPath]])
      }

      test("has enterTsDecl method") {
        val codePath = createCodePath("test-lib", "path")
        val clazz = createMockClass("TestClass")
        val result = SetCodePath.enterTsDecl(codePath)(clazz)
        assert(result != null)
        assert(result.isInstanceOf[TsDecl])
      }

      test("has enterTsContainer method") {
        val codePath = createCodePath("test-lib", "path")
        val namespace = createMockNamespace("TestNamespace")
        val result = SetCodePath.enterTsContainer(codePath)(namespace)
        assert(result != null)
        assert(result.isInstanceOf[TsContainer])
      }

      test("has enterTsNamedDecl method") {
        val codePath = createCodePath("test-lib", "path")
        val func = createMockFunction("testFunc")
        val result = SetCodePath.enterTsNamedDecl(codePath)(func)
        assert(result != null)
        assert(result.isInstanceOf[TsNamedDecl])
      }

      test("has enterTsParsedFile method") {
        val codePath = createCodePath("test-lib", "path")
        val parsedFile = createMockParsedFile()
        val result = SetCodePath.enterTsParsedFile(codePath)(parsedFile)
        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
      }

      test("has withTree method") {
        val codePath = createCodePath("test-lib", "path")
        val clazz = createMockClass("TestClass")
        val result = SetCodePath.withTree(codePath, clazz)
        assert(result != null)
        assert(result.isInstanceOf[CodePath.HasPath])
      }
    }

    test("SetCodePath - TsDecl Processing") {
      test("sets code path on class declaration") {
        val codePath = createCodePath("test-lib", "module")
        val clazz = createMockClass("TestClass", CodePath.NoPath)
        
        val result = SetCodePath.enterTsDecl(codePath)(clazz)
        
        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.codePath == codePath)
        assert(resultClass.name.value == "TestClass")
      }

      test("sets code path on interface declaration") {
        val codePath = createCodePath("test-lib", "module")
        val interface = createMockInterface("TestInterface", CodePath.NoPath)
        
        val result = SetCodePath.enterTsDecl(codePath)(interface)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.codePath == codePath)
        assert(resultInterface.name.value == "TestInterface")
      }

      test("sets code path on function declaration") {
        val codePath = createCodePath("test-lib", "module")
        val func = createMockFunction("testFunc", CodePath.NoPath)
        
        val result = SetCodePath.enterTsDecl(codePath)(func)
        
        assert(result.isInstanceOf[TsDeclFunction])
        val resultFunc = result.asInstanceOf[TsDeclFunction]
        assert(resultFunc.codePath == codePath)
        assert(resultFunc.name.value == "testFunc")
      }

      test("sets code path on variable declaration") {
        val codePath = createCodePath("test-lib", "module")
        val variable = createMockVariable("testVar", CodePath.NoPath)
        
        val result = SetCodePath.enterTsDecl(codePath)(variable)
        
        assert(result.isInstanceOf[TsDeclVar])
        val resultVar = result.asInstanceOf[TsDeclVar]
        assert(resultVar.codePath == codePath)
        assert(resultVar.name.value == "testVar")
      }

      test("sets code path on namespace declaration") {
        val codePath = createCodePath("test-lib", "module")
        val namespace = createMockNamespace("TestNamespace", CodePath.NoPath)
        
        val result = SetCodePath.enterTsDecl(codePath)(namespace)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val resultNamespace = result.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.codePath == codePath)
        assert(resultNamespace.name.value == "TestNamespace")
      }

      test("sets code path on module declaration") {
        val codePath = createCodePath("test-lib", "module")
        val module = createMockModule("TestModule", CodePath.NoPath)
        
        val result = SetCodePath.enterTsDecl(codePath)(module)
        
        assert(result.isInstanceOf[TsDeclModule])
        val resultModule = result.asInstanceOf[TsDeclModule]
        assert(resultModule.codePath == codePath)
      }

      test("leaves non-CodePath.Has declarations unchanged") {
        val codePath = createCodePath("test-lib", "module")
        val exportDecl = TsExport(NoComments, false, ExportType.Named, TsExportee.Names(Empty, None))

        val result = SetCodePath.enterTsDecl(codePath)(exportDecl)

        assert(result == exportDecl) // Should remain unchanged
      }

      test("overwrites existing code path") {
        val oldCodePath = createCodePath("old-lib", "old-path")
        val newCodePath = createCodePath("new-lib", "new-path")
        val clazz = createMockClass("TestClass", oldCodePath)
        
        val result = SetCodePath.enterTsDecl(newCodePath)(clazz)
        
        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.codePath == newCodePath)
        assert(resultClass.codePath != oldCodePath)
      }
    }

    test("SetCodePath - TsContainer Processing") {
      test("sets code path on namespace container") {
        val codePath = createCodePath("test-lib", "module")
        val namespace = createMockNamespace("TestNamespace", CodePath.NoPath)
        
        val result = SetCodePath.enterTsContainer(codePath)(namespace)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val resultNamespace = result.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.codePath == codePath)
      }

      test("sets code path on module container") {
        val codePath = createCodePath("test-lib", "module")
        val module = createMockModule("TestModule", CodePath.NoPath)
        
        val result = SetCodePath.enterTsContainer(codePath)(module)
        
        assert(result.isInstanceOf[TsDeclModule])
        val resultModule = result.asInstanceOf[TsDeclModule]
        assert(resultModule.codePath == codePath)
      }

      test("sets code path on global container") {
        val codePath = createCodePath("test-lib", "module")
        val global = createMockGlobal(CodePath.NoPath)
        
        val result = SetCodePath.enterTsContainer(codePath)(global)
        
        assert(result.isInstanceOf[TsGlobal])
        val resultGlobal = result.asInstanceOf[TsGlobal]
        assert(resultGlobal.codePath == codePath)
      }

      test("handles null container") {
        val codePath = createCodePath("test-lib", "module")
        
        val result = SetCodePath.enterTsContainer(codePath)(null)
        
        assert(result == null)
      }

      test("overwrites existing container code path") {
        val oldCodePath = createCodePath("old-lib", "old-path")
        val newCodePath = createCodePath("new-lib", "new-path")
        val namespace = createMockNamespace("TestNamespace", oldCodePath)
        
        val result = SetCodePath.enterTsContainer(newCodePath)(namespace)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val resultNamespace = result.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.codePath == newCodePath)
        assert(resultNamespace.codePath != oldCodePath)
      }
    }

    test("SetCodePath - TsNamedDecl Processing") {
      test("sets code path on named class declaration") {
        val codePath = createCodePath("test-lib", "module")
        val clazz = createMockClass("TestClass", CodePath.NoPath)

        val result = SetCodePath.enterTsNamedDecl(codePath)(clazz)

        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.codePath == codePath)
      }

      test("sets code path on named interface declaration") {
        val codePath = createCodePath("test-lib", "module")
        val interface = createMockInterface("TestInterface", CodePath.NoPath)

        val result = SetCodePath.enterTsNamedDecl(codePath)(interface)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.codePath == codePath)
      }

      test("sets code path on named function declaration") {
        val codePath = createCodePath("test-lib", "module")
        val func = createMockFunction("testFunc", CodePath.NoPath)

        val result = SetCodePath.enterTsNamedDecl(codePath)(func)

        assert(result.isInstanceOf[TsDeclFunction])
        val resultFunc = result.asInstanceOf[TsDeclFunction]
        assert(resultFunc.codePath == codePath)
      }

      test("handles null named declaration") {
        val codePath = createCodePath("test-lib", "module")

        val result = SetCodePath.enterTsNamedDecl(codePath)(null)

        assert(result == null)
      }

      test("overwrites existing named declaration code path") {
        val oldCodePath = createCodePath("old-lib", "old-path")
        val newCodePath = createCodePath("new-lib", "new-path")
        val func = createMockFunction("testFunc", oldCodePath)

        val result = SetCodePath.enterTsNamedDecl(newCodePath)(func)

        assert(result.isInstanceOf[TsDeclFunction])
        val resultFunc = result.asInstanceOf[TsDeclFunction]
        assert(resultFunc.codePath == newCodePath)
        assert(resultFunc.codePath != oldCodePath)
      }
    }

    test("SetCodePath - TsParsedFile Processing") {
      test("sets code path on parsed file") {
        val codePath = createCodePath("test-lib", "index")
        val parsedFile = createMockParsedFile(CodePath.NoPath)

        val result = SetCodePath.enterTsParsedFile(codePath)(parsedFile)

        assert(result.isInstanceOf[TsParsedFile])
        assert(result.codePath == codePath)
      }

      test("overwrites existing parsed file code path") {
        val oldCodePath = createCodePath("old-lib", "old-index")
        val newCodePath = createCodePath("new-lib", "new-index")
        val parsedFile = createMockParsedFile(oldCodePath)

        val result = SetCodePath.enterTsParsedFile(newCodePath)(parsedFile)

        assert(result.isInstanceOf[TsParsedFile])
        assert(result.codePath == newCodePath)
        assert(result.codePath != oldCodePath)
      }

      test("preserves parsed file members") {
        val codePath = createCodePath("test-lib", "index")
        val clazz = createMockClass("TestClass")
        val func = createMockFunction("testFunc")
        val parsedFile = createMockParsedFile(CodePath.NoPath, IArray(clazz, func))

        val result = SetCodePath.enterTsParsedFile(codePath)(parsedFile)

        assert(result.isInstanceOf[TsParsedFile])
        assert(result.codePath == codePath)
        assert(result.members.length == 2)
        assert(result.members.head == clazz)
        assert(result.members(1) == func)
      }

      test("preserves parsed file comments and directives") {
        val codePath = createCodePath("test-lib", "index")
        val comments = Comments(Comment.Raw("/** Test file */"))
        val directives = IArray(Directive.NoStdLib)
        val parsedFile = TsParsedFile(comments, directives, Empty, CodePath.NoPath)

        val result = SetCodePath.enterTsParsedFile(codePath)(parsedFile)

        assert(result.isInstanceOf[TsParsedFile])
        assert(result.codePath == codePath)
        assert(result.comments == comments)
        assert(result.directives == directives)
      }
    }

    test("SetCodePath - WithTree Method") {
      test("navigates into named declaration") {
        val codePath = createCodePath("test-lib", "module")
        val clazz = createMockClass("TestClass")

        val result = SetCodePath.withTree(codePath, clazz)

        assert(result.isInstanceOf[CodePath.HasPath])
        assert(result.inLibrary.value == "test-lib")
        // Should have added TestClass to the path
        assert(result.codePathPart.parts.last.value == "TestClass")
      }

      test("navigates into global declaration") {
        val codePath = createCodePath("test-lib", "module")
        val global = createMockGlobal()

        val result = SetCodePath.withTree(codePath, global)

        assert(result.isInstanceOf[CodePath.HasPath])
        assert(result.inLibrary.value == "test-lib")
        // Should have added Global identifier to the path
        assert(result.codePathPart.parts.last == TsIdent.Global)
      }

      test("preserves path for non-named trees") {
        val codePath = createCodePath("test-lib", "module")
        val typeRef = TsTypeRef(NoComments, createQIdent("string"), Empty)

        val result = SetCodePath.withTree(codePath, typeRef)

        assert(result == codePath) // Should remain unchanged for non-named trees
      }

      test("builds nested path correctly") {
        val initialCodePath = createCodePath("test-lib")
        val namespace = createMockNamespace("MyNamespace")
        val clazz = createMockClass("MyClass")

        val pathAfterNamespace = SetCodePath.withTree(initialCodePath, namespace)
        val pathAfterClass = SetCodePath.withTree(pathAfterNamespace, clazz)

        assert(pathAfterClass.isInstanceOf[CodePath.HasPath])
        assert(pathAfterClass.inLibrary.value == "test-lib")
        assert(pathAfterClass.codePathPart.parts.length == 2)
        assert(pathAfterClass.codePathPart.parts.head.value == "MyNamespace")
        assert(pathAfterClass.codePathPart.parts(1).value == "MyClass")
      }
    }

    test("SetCodePath - Edge Cases") {
      test("handles declarations without CodePath.Has trait") {
        val codePath = createCodePath("test-lib", "module")
        val exportDecl = TsExport(NoComments, false, ExportType.Named, TsExportee.Names(Empty, None))

        val result = SetCodePath.enterTsDecl(codePath)(exportDecl)

        assert(result == exportDecl) // Should remain unchanged
      }

      test("handles containers with CodePath.Has trait") {
        val codePath = createCodePath("test-lib", "module")
        // TsAugmentedModule does implement CodePath.Has
        val augmentedModule = TsAugmentedModule(
          NoComments,
          TsIdentModule(None, List("test")),
          Empty,
          CodePath.NoPath,
          JsLocation.Zero
        )

        val result = SetCodePath.enterTsContainer(codePath)(augmentedModule)

        assert(result.isInstanceOf[TsAugmentedModule])
        val resultAugmented = result.asInstanceOf[TsAugmentedModule]
        assert(resultAugmented.codePath == codePath) // Should be updated
      }

      test("handles complex nested structures") {
        val codePath = createCodePath("test-lib", "root")
        val innerClass = createMockClass("InnerClass", CodePath.NoPath)
        val outerClass = createMockClass("OuterClass", CodePath.NoPath, IArray(
          TsMemberProperty(
            NoComments,
            TsProtectionLevel.Default,
            createSimpleIdent("prop"),
            None,
            None,
            false,
            false
          )
        ))
        val namespace = createMockNamespace("TestNamespace", CodePath.NoPath, IArray(outerClass, innerClass))

        val result = SetCodePath.enterTsContainer(codePath)(namespace)

        assert(result.isInstanceOf[TsDeclNamespace])
        val resultNamespace = result.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.codePath == codePath)
        // Members should remain unchanged (transform doesn't recursively process)
        assert(resultNamespace.members.length == 2)
      }

      test("handles empty code path parts") {
        val codePath = createCodePath("test-lib") // No additional parts
        val clazz = createMockClass("TestClass", CodePath.NoPath)

        val result = SetCodePath.enterTsDecl(codePath)(clazz)

        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.codePath == codePath)
      }

      test("handles very long code paths") {
        val codePath = createCodePath("test-lib", "level1", "level2", "level3", "level4", "level5")
        val func = createMockFunction("deepFunc", CodePath.NoPath)

        val result = SetCodePath.enterTsNamedDecl(codePath)(func)

        assert(result.isInstanceOf[TsDeclFunction])
        val resultFunc = result.asInstanceOf[TsDeclFunction]
        assert(resultFunc.codePath == codePath)
        assert(resultFunc.codePath.asInstanceOf[CodePath.HasPath].codePathPart.parts.length == 5)
      }
    }

    test("SetCodePath - Integration Scenarios") {
      test("handles real-world library structure") {
        // Simulate: @types/node/fs module structure
        val codePath = createCodePath("@types/node", "fs")
        val readFileFunc = createMockFunction("readFile", CodePath.NoPath)
        val writeFileFunc = createMockFunction("writeFile", CodePath.NoPath)
        val statsClass = createMockClass("Stats", CodePath.NoPath)
        val fsNamespace = createMockNamespace("fs", CodePath.NoPath, IArray(readFileFunc, writeFileFunc, statsClass))

        val result = SetCodePath.enterTsContainer(codePath)(fsNamespace)

        assert(result.isInstanceOf[TsDeclNamespace])
        val resultNamespace = result.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.codePath == codePath)
        assert(resultNamespace.name.value == "fs")
        assert(resultNamespace.members.length == 3)
      }

      test("handles module with nested declarations") {
        // Simulate: declare module "my-lib" { export class MyClass {} }
        val codePath = createCodePath("my-lib")
        val exportedClass = createMockClass("MyClass", CodePath.NoPath)
        val module = createMockModule("my-lib", CodePath.NoPath, IArray(exportedClass))

        val result = SetCodePath.enterTsContainer(codePath)(module)

        assert(result.isInstanceOf[TsDeclModule])
        val resultModule = result.asInstanceOf[TsDeclModule]
        assert(resultModule.codePath == codePath)
        assert(resultModule.members.length == 1)
      }

      test("handles global augmentation") {
        // Simulate: declare global { interface Window { myProp: string; } }
        val codePath = createCodePath("my-lib", "global")
        val windowInterface = createMockInterface("Window", CodePath.NoPath)
        val global = createMockGlobal(CodePath.NoPath, IArray(windowInterface))

        val result = SetCodePath.enterTsContainer(codePath)(global)

        assert(result.isInstanceOf[TsGlobal])
        val resultGlobal = result.asInstanceOf[TsGlobal]
        assert(resultGlobal.codePath == codePath)
        assert(resultGlobal.members.length == 1)
      }

      test("handles parsed file with mixed declarations") {
        // Simulate: A typical .d.ts file with various declarations
        val codePath = createCodePath("my-lib", "index")
        val exportedClass = createMockClass("ExportedClass", CodePath.NoPath)
        val exportedInterface = createMockInterface("ExportedInterface", CodePath.NoPath)
        val exportedFunction = createMockFunction("exportedFunction", CodePath.NoPath)
        val exportedNamespace = createMockNamespace("ExportedNamespace", CodePath.NoPath)

        val parsedFile = createMockParsedFile(
          CodePath.NoPath,
          IArray(exportedClass, exportedInterface, exportedFunction, exportedNamespace)
        )

        val result = SetCodePath.enterTsParsedFile(codePath)(parsedFile)

        assert(result.isInstanceOf[TsParsedFile])
        assert(result.codePath == codePath)
        assert(result.members.length == 4)
        // Verify all member types are preserved
        assert(result.members.head.isInstanceOf[TsDeclClass])
        assert(result.members(1).isInstanceOf[TsDeclInterface])
        assert(result.members(2).isInstanceOf[TsDeclFunction])
        assert(result.members(3).isInstanceOf[TsDeclNamespace])
      }
    }
  }
}