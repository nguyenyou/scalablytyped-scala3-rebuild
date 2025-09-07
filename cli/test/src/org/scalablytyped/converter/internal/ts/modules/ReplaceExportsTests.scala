package org.scalablytyped.converter.internal
package ts
package modules

import utest.*
import org.scalablytyped.converter.internal.logging.Logger

object ReplaceExportsTests extends TestSuite {

  // Helper methods for creating test data specific to ReplaceExports tests

  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent =
    TsQIdent(IArray.fromTraversable(parts.map(TsIdentSimple.apply)))

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

  def createMockModule(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclModule =
    TsDeclModule(
      comments = NoComments,
      declared = false,
      name = TsIdentModule(None, List(name)),
      members = members,
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createMockNamespace(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclNamespace =
    TsDeclNamespace(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      members = members,
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createMockExport(
      exportType: ExportType = ExportType.Named,
      exportee: TsExportee = TsExportee.Names(Empty, None)
  ): TsExport =
    TsExport(
      comments = NoComments,
      typeOnly = false,
      tpe = exportType,
      exported = exportee
    )

  def createMockScope(
      members: IArray[TsContainerOrDecl] = Empty
  ): TsTreeScope = {
    val parsedFile = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = members,
      codePath = CodePath.NoPath
    )
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(TsIdentLibrarySimple("test"), pedantic = false, deps, Logger.DevNull) / parsedFile
  }

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
        resultType = Some(TsTypeRef(NoComments, TsQIdent.of("void"), Empty))
      ),
      codePath = codePath,
      jsLocation = JsLocation.Zero
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

  def createMockClass(
      name: String,
      members: IArray[TsMember] = Empty,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      parent = None,
      implements = Empty,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = codePath,
      isAbstract = false
    )

  def createMockEnum(
      name: String,
      members: IArray[TsEnumMember] = Empty,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclEnum =
    TsDeclEnum(
      comments = NoComments,
      declared = false,
      isConst = false,
      name = createSimpleIdent(name),
      members = members,
      isValue = true,
      exportedFrom = None,
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockImport(
      imported: IArray[TsImported],
      from: TsImportee,
      typeOnly: Boolean = false
  ): TsImport =
    TsImport(
      typeOnly = typeOnly,
      imported = imported,
      from = from
    )

  def createHasPath(parts: String*): CodePath.HasPath =
    CodePath.HasPath(createSimpleIdent(parts.last), createQIdent(parts*))

  def tests = Tests {
    test("ReplaceExports - Basic Functionality") {
      test("CachedReplaceExports handles empty exports") {
        val module       = createMockModule("TestModule")
        val scope        = createMockScope()
        val loopDetector = TsTreeScope.LoopDetector.initial

        val result = CachedReplaceExports.apply(scope, loopDetector, module)

        assert(result.name.value == "TestModule")
        assert(result.exports.isEmpty)
      }

      test("ReplaceExports transformation can be instantiated") {
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        assert(transformation != null)
      }
    }

    test("ReplaceExports - Namespace Processing") {
      test("handles namespace with no exports or imports") {
        val namespace      = createMockNamespace("TestNamespace")
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclNamespace(scope)(namespace)

        assert(result.name.value == "TestNamespace")
        assert(result.exports.isEmpty)
        assert(result.imports.isEmpty)
      }

      test("processes namespace with empty named export") {
        val emptyExport = createMockExport(
          ExportType.Named,
          TsExportee.Names(Empty, None)
        )
        val namespace = createMockNamespace(
          "TestNamespace",
          members = IArray(emptyExport) // exports are part of members
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclNamespace(scope)(namespace)

        assert(result.name.value == "TestNamespace")
        // Empty named exports should be filtered out
        assert(result.members.isEmpty)
      }
    }

    test("ReplaceExports - Module Processing") {
      test("handles module without cache") {
        val module         = createMockModule("TestModule")
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclModule(scope)(module)

        assert(result.name.value == "TestModule")
      }

      test("processes module with members") {
        val interface = createMockInterface("TestInterface")
        val module = createMockModule(
          "TestModule",
          members = IArray(interface)
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclModule(scope)(module)

        assert(result.name.value == "TestModule")
        assert(result.members.nonEmpty)
      }
    }

    test("ReplaceExports - Augmented Module Processing") {
      test("handles augmented module") {
        val interface = createMockInterface("TestInterface")
        val augmentedModule = TsAugmentedModule(
          comments = NoComments,
          name = TsIdentModule(None, List("TestModule")),
          members = IArray(interface),
          codePath = CodePath.NoPath,
          jsLocation = JsLocation.Zero
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsAugmentedModule(scope)(augmentedModule)

        assert(result.name.value == "TestModule")
        assert(result.members.nonEmpty)
      }
    }

    test("ReplaceExports - Parsed File Processing") {
      test("filters imports and unwraps export trees") {
        val interface  = createMockInterface("TestInterface")
        val exportDecl = createMockExport(ExportType.Named, TsExportee.Tree(interface))
        val importDecl = TsImport(
          typeOnly = false,
          imported = IArray(TsImported.Ident(createSimpleIdent("test"))),
          from = TsImportee.Local(createQIdent("local"))
        )
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(exportDecl, importDecl, interface),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Should filter out imports and unwrap export trees
        assert(result.members.length == 2) // interface from export tree + direct interface
        assert(result.members.forall(_.isInstanceOf[TsDeclInterface]))
      }
    }

    test("ReplaceExports - Export Processing") {
      test("named exports - individual declarations") {
        val function1 = createMockFunction("testFunction", createHasPath("test", "testFunction"))
        val export1   = createMockExport(ExportType.Named, TsExportee.Tree(function1))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Export should be unwrapped to reveal the underlying function
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclFunction].name.value == "testFunction")
      }

      test("default exports") {
        val class1  = createMockClass("TestClass", codePath = createHasPath("test", "TestClass"))
        val export1 = createMockExport(ExportType.Defaulted, TsExportee.Tree(class1))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Export should be unwrapped to reveal the underlying class
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclClass].name.value == "TestClass")
      }

      test("re-exports from other modules") {
        val reExport = createMockExport(
          ExportType.Named,
          TsExportee.Names(
            IArray((createQIdent("someFunction"), None)),
            Some(TsIdentModule(None, List("other-module")))
          )
        )
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(reExport),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Re-exports are preserved as they don't contain local declarations to unwrap
        assert(result.members.length == 1)
        assert(result.members.head.isInstanceOf[TsExport])
      }

      test("export assignments") {
        val variable1 = createMockVar("testVar", createHasPath("test", "testVar"))
        val export1   = createMockExport(ExportType.Named, TsExportee.Tree(variable1))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Export should be unwrapped to reveal the underlying variable
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclVar].name.value == "testVar")
      }

      test("export namespace declarations") {
        val namespace1 = createMockNamespace("TestNamespace", codePath = createHasPath("test", "TestNamespace"))
        val export1    = createMockExport(ExportType.Namespaced, TsExportee.Tree(namespace1))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Export should be unwrapped to reveal the underlying namespace
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclNamespace].name.value == "TestNamespace")
      }
    }

    test("ReplaceExports - Import Filtering") {
      test("removal of import statements") {
        val import1 = createMockImport(
          IArray(TsImported.Ident(createSimpleIdent("React"))),
          TsImportee.From(TsIdentModule(None, List("react")))
        )
        val function1 = createMockFunction("testFunction")
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(import1, function1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Import should be removed, function should remain
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclFunction].name.value == "testFunction")
      }

      test("preservation of type-only imports") {
        val typeImport = createMockImport(
          IArray(TsImported.Ident(createSimpleIdent("Props"))),
          TsImportee.From(TsIdentModule(None, List("./types"))),
          typeOnly = true
        )
        val function1 = createMockFunction("testFunction")
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(typeImport, function1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Type-only imports should also be removed in parsed files
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclFunction].name.value == "testFunction")
      }

      test("handling of import/export combinations") {
        val import1 = createMockImport(
          IArray(TsImported.Ident(createSimpleIdent("utils"))),
          TsImportee.Local(createQIdent("./utils"))
        )
        val export1 = createMockExport(
          ExportType.Named,
          TsExportee.Tree(import1)
        )
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Import wrapped in export should be unwrapped to import, then filtered out
        assert(result.members.length == 1)
        assert(result.members.head.isInstanceOf[TsImport])
      }
    }

    test("ReplaceExports - Edge Cases") {
      test("handles namespace with mixed content") {
        val interface  = createMockInterface("TestInterface", codePath = createHasPath("test", "TestInterface"))
        val exportDecl = createMockExport(ExportType.Named, TsExportee.Tree(interface))
        val namespace = createMockNamespace(
          "TestNamespace",
          members = IArray(interface, exportDecl),
          codePath = createHasPath("test", "TestNamespace")
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclNamespace(scope)(namespace)

        assert(result.name.value == "TestNamespace")
        assert(result.members.nonEmpty)
      }

      test("handles empty module") {
        val module         = createMockModule("EmptyModule")
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclModule(scope)(module)

        assert(result.name.value == "EmptyModule")
        assert(result.members.isEmpty)
      }

      test("handles files with only type declarations") {
        val interface1 = createMockInterface("TestInterface")
        val typeAlias1 = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("TestType"),
          tparams = Empty,
          alias = TsTypeRef.string,
          codePath = CodePath.NoPath
        )
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(interface1, typeAlias1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Type declarations should be preserved
        assert(result.members.length == 2)
        assert(result.members.head.asInstanceOf[TsDeclInterface].name.value == "TestInterface")
        assert(result.members(1).asInstanceOf[TsDeclTypeAlias].name.value == "TestType")
      }
    }

    test("ReplaceExports - Tree Unwrapping") {
      test("unwrapping export trees to extract underlying declarations") {
        val enum1   = createMockEnum("TestEnum", codePath = createHasPath("test", "TestEnum"))
        val export1 = createMockExport(ExportType.Named, TsExportee.Tree(enum1))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Export should be unwrapped to reveal the underlying enum
        assert(result.members.length == 1)
        assert(result.members.head.asInstanceOf[TsDeclEnum].name.value == "TestEnum")
      }

      test("preserving declaration metadata and code paths") {
        val originalCodePath = createHasPath("original", "path", "testFunction")
        val function1        = createMockFunction("testFunction", originalCodePath)
        val export1          = createMockExport(ExportType.Named, TsExportee.Tree(function1))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Code path should be preserved
        assert(result.members.length == 1)
        val resultFunction = result.members.head.asInstanceOf[TsDeclFunction]
        assert(resultFunction.name.value == "testFunction")
        assert(resultFunction.codePath == originalCodePath)
      }

      test("handling nested export structures") {
        val innerInterface = createMockInterface("InnerInterface")
        val innerNamespace = createMockNamespace("InnerNamespace", IArray(innerInterface))
        val export1        = createMockExport(ExportType.Named, TsExportee.Tree(innerNamespace))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Export should be unwrapped to reveal the underlying namespace
        assert(result.members.length == 1)
        val resultNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.name.value == "InnerNamespace")
        assert(resultNamespace.members.length == 1)
        assert(resultNamespace.members.head.asInstanceOf[TsDeclInterface].name.value == "InnerInterface")
      }
    }

    test("ReplaceExports - Module and Namespace Processing") {
      test("processing exports within modules") {
        val function1 = createMockFunction("moduleFunction")
        val export1   = createMockExport(ExportType.Named, TsExportee.Tree(function1))
        val module = createMockModule(
          "TestModule",
          members = IArray(function1, export1),
          codePath = createHasPath("test", "TestModule")
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclModule(scope)(module)

        assert(result.name.value == "TestModule")
        assert(result.members.nonEmpty)
      }

      test("processing exports within namespaces") {
        val interface1 =
          createMockInterface("NamespaceInterface", codePath = createHasPath("test", "NamespaceInterface"))
        val export1 = createMockExport(ExportType.Named, TsExportee.Tree(interface1))
        val namespace = createMockNamespace(
          "TestNamespace",
          members = IArray(interface1, export1),
          codePath = createHasPath("test", "TestNamespace")
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclNamespace(scope)(namespace)

        assert(result.name.value == "TestNamespace")
        assert(result.members.nonEmpty)
      }

      test("handling augmented modules") {
        val function1 = createMockFunction("augmentedFunction")
        val export1   = createMockExport(ExportType.Named, TsExportee.Tree(function1))
        val augmentedModule = TsAugmentedModule(
          comments = NoComments,
          name = TsIdentModule(None, List("TestModule")),
          members = IArray(function1, export1),
          codePath = createHasPath("test", "TestModule"),
          jsLocation = JsLocation.Zero
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsAugmentedModule(scope)(augmentedModule)

        assert(result.name.value == "TestModule")
        assert(result.members.nonEmpty)
      }

      test("preserving non-export content") {
        val interface1 = createMockInterface("RegularInterface")
        val function1  = createMockFunction("regularFunction")
        val export1    = createMockExport(ExportType.Named, TsExportee.Tree(function1))
        val namespace = createMockNamespace(
          "TestNamespace",
          members = IArray(interface1, export1),
          codePath = createHasPath("test", "TestNamespace")
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclNamespace(scope)(namespace)

        assert(result.name.value == "TestNamespace")
        // Should preserve both the regular interface and process the export
        assert(result.members.nonEmpty)
        assert(result.members.exists {
          case interface: TsDeclInterface => interface.name.value == "RegularInterface"
          case _                          => false
        })
      }
    }

    test("ReplaceExports - Integration Scenarios") {
      test("realistic module structure with multiple export types") {
        val interface1 = createMockInterface("ApiInterface")
        val function1  = createMockFunction("utilityFunction")
        val class1     = createMockClass("MainClass")
        val enum1      = createMockEnum("StatusEnum")

        val namedExport   = createMockExport(ExportType.Named, TsExportee.Tree(function1))
        val defaultExport = createMockExport(ExportType.Defaulted, TsExportee.Tree(class1))
        val typeExport    = createMockExport(ExportType.Named, TsExportee.Tree(interface1))

        val import1 = createMockImport(
          IArray(TsImported.Ident(createSimpleIdent("external"))),
          TsImportee.From(TsIdentModule(None, List("external-lib")))
        )

        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(import1, interface1, namedExport, defaultExport, typeExport, enum1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Should filter imports, unwrap exports, and preserve regular declarations
        assert(result.members.length == 5) // interface, function, class, interface (from typeExport), enum
        assert(result.members.exists {
          case interface: TsDeclInterface => interface.name.value == "ApiInterface"
          case _                          => false
        })
        assert(result.members.exists {
          case function: TsDeclFunction => function.name.value == "utilityFunction"
          case _                        => false
        })
        assert(result.members.exists {
          case clazz: TsDeclClass => clazz.name.value == "MainClass"
          case _                  => false
        })
        assert(result.members.exists {
          case enumDecl: TsDeclEnum => enumDecl.name.value == "StatusEnum"
          case _                    => false
        })
      }

      test("interaction with other transformations") {
        val function1 = createMockFunction("transformedFunction", createHasPath("transformed", "path"))
        val export1   = createMockExport(ExportType.Named, TsExportee.Tree(function1))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Should preserve transformations applied to the underlying declarations
        assert(result.members.length == 1)
        val resultFunction = result.members.head.asInstanceOf[TsDeclFunction]
        assert(resultFunction.name.value == "transformedFunction")
        assert(resultFunction.codePath.toString.contains("transformed"))
      }

      test("handling of special characters and edge cases in identifiers") {
        val specialFunction = createMockFunction("$special_function")
        val unicodeFunction = createMockFunction("函数")
        val numberFunction  = createMockFunction("function123")

        val export1 = createMockExport(ExportType.Named, TsExportee.Tree(specialFunction))
        val export2 = createMockExport(ExportType.Named, TsExportee.Tree(unicodeFunction))
        val export3 = createMockExport(ExportType.Named, TsExportee.Tree(numberFunction))

        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1, export2, export3),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Should handle special characters correctly
        assert(result.members.length == 3)
        assert(result.members.exists {
          case function: TsDeclFunction => function.name.value == "$special_function"
          case _                        => false
        })
        assert(result.members.exists {
          case function: TsDeclFunction => function.name.value == "函数"
          case _                        => false
        })
        assert(result.members.exists {
          case function: TsDeclFunction => function.name.value == "function123"
          case _                        => false
        })
      }

      test("complex nested structures") {
        val innerInterface = createMockInterface("InnerInterface")
        val innerFunction  = createMockFunction("innerFunction")
        val innerNamespace = createMockNamespace("InnerNamespace", IArray(innerInterface, innerFunction))

        val outerFunction  = createMockFunction("outerFunction")
        val outerNamespace = createMockNamespace("OuterNamespace", IArray(innerNamespace, outerFunction))

        val export1 = createMockExport(ExportType.Named, TsExportee.Tree(outerNamespace))

        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Should unwrap and preserve nested structure
        assert(result.members.length == 1)
        val resultNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.name.value == "OuterNamespace")
        assert(resultNamespace.members.length == 2)

        val nestedNamespace = resultNamespace.members
          .find {
            case ns: TsDeclNamespace => ns.name.value == "InnerNamespace"
            case _                   => false
          }
          .get
          .asInstanceOf[TsDeclNamespace]
        assert(nestedNamespace.members.length == 2)
        assert(nestedNamespace.members.exists {
          case interface: TsDeclInterface => interface.name.value == "InnerInterface"
          case _                          => false
        })
        assert(nestedNamespace.members.exists {
          case function: TsDeclFunction => function.name.value == "innerFunction"
          case _                        => false
        })
      }

      test("empty modules and namespaces") {
        val emptyNamespace = createMockNamespace("EmptyNamespace")
        val emptyModule    = createMockModule("EmptyModule")

        val export1 = createMockExport(ExportType.Named, TsExportee.Tree(emptyNamespace))
        val export2 = createMockExport(ExportType.Named, TsExportee.Tree(emptyModule))

        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(export1, export2),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Should handle empty containers correctly
        assert(result.members.length == 2)
        assert(result.members.head.asInstanceOf[TsDeclNamespace].name.value == "EmptyNamespace")
        assert(result.members.head.asInstanceOf[TsDeclNamespace].members.isEmpty)
        assert(result.members(1).asInstanceOf[TsDeclModule].name.value == "EmptyModule")
        assert(result.members(1).asInstanceOf[TsDeclModule].members.isEmpty)
      }
    }
  }
}
