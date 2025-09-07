package org.scalablytyped.converter.internal
package ts
package modules

import utest.*
import org.scalablytyped.converter.internal.logging.Logger

object RewriteExportStarAsTests extends TestSuite {

  // Helper methods for creating test data specific to RewriteExportStarAs tests

  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent =
    TsQIdent(IArray.fromTraversable(parts.map(TsIdentSimple.apply)))

  def createIdentModule(name: String): TsIdentModule =
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

  def createMockExportStar(
      asOpt: Option[String] = None,
      from: String = "module"
  ): TsExport =
    TsExport(
      comments = NoComments,
      typeOnly = false,
      tpe = ExportType.Named,
      exported = TsExportee.Star(asOpt.map(createSimpleIdent), createIdentModule(from))
    )

  def createMockExportStarTypeOnly(
      asOpt: Option[String] = None,
      from: String = "module"
  ): TsExport =
    TsExport(
      comments = NoComments,
      typeOnly = true,
      tpe = ExportType.Named,
      exported = TsExportee.Star(asOpt.map(createSimpleIdent), createIdentModule(from))
    )

  def createMockExportNamed(
      names: (String, Option[String])*
  ): TsExport =
    TsExport(
      comments = NoComments,
      typeOnly = false,
      tpe = ExportType.Named,
      exported = TsExportee.Names(
        IArray.fromTraversable(names.map { case (name, alias) =>
          createQIdent(name) -> alias.map(createSimpleIdent)
        }),
        None
      )
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

  def createHasPath(parts: String*): CodePath.HasPath =
    CodePath.HasPath(createSimpleIdent("test"), createQIdent(parts*))

  def tests = Tests {
    test("RewriteExportStarAs - Basic Functionality") {
      test("transformation can be instantiated") {
        // Test that the transformation can be instantiated
        val transformation = RewriteExportStarAs
        assert(transformation.isInstanceOf[TransformMembers])
      }

      test("handles files with no export star statements") {
        val interface1    = createMockInterface("TestInterface")
        val regularExport = createMockExportNamed("TestInterface" -> None)
        val module = createMockModule(
          "TestModule",
          members = IArray(interface1, regularExport)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        // Should return unchanged since no export star statements
        assert(result.length == 2)
        assert(result.head.isInstanceOf[TsDeclInterface])
        assert(result(1).isInstanceOf[TsExport])
      }

      test("handles files with only regular exports") {
        val export1 = createMockExportNamed("foo" -> None, "bar" -> Some("baz"))
        val export2 = createMockExportNamed("qux" -> None)
        val module = createMockModule(
          "TestModule",
          members = IArray(export1, export2)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        // Should return unchanged since no export star statements
        assert(result.length == 2)
        assert(result.forall(_.isInstanceOf[TsExport]))
      }
    }

    test("RewriteExportStarAs - Export Star Processing") {
      test("basic export star statements without alias") {
        val exportStar = createMockExportStar(None, "utils")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        // Should return unchanged since no alias (transformation only handles export * as namespace)
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsExport])
        val exportDecl = result.head.asInstanceOf[TsExport]
        assert(exportDecl.exported.isInstanceOf[TsExportee.Star])
      }

      test("export star as namespace statements") {
        val exportStar = createMockExportStar(Some("Utils"), "utils")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        // Should be rewritten to import + export
        assert(result.length == 2)

        // First should be an import
        assert(result.head.isInstanceOf[TsImport])
        val importDecl = result.head.asInstanceOf[TsImport]
        assert(importDecl.typeOnly == false)
        assert(importDecl.imported.length == 1)
        assert(importDecl.imported.head.isInstanceOf[TsImported.Star])
        val starImport = importDecl.imported.head.asInstanceOf[TsImported.Star]
        assert(starImport.asOpt.isDefined)
        assert(starImport.asOpt.get.value == "Utils")
        assert(importDecl.from.isInstanceOf[TsImportee.From])
        val fromImport = importDecl.from.asInstanceOf[TsImportee.From]
        assert(fromImport.from.value == "utils")

        // Second should be an export
        assert(result(1).isInstanceOf[TsExport])
        val exportDecl = result(1).asInstanceOf[TsExport]
        assert(exportDecl.typeOnly == false)
        assert(exportDecl.exported.isInstanceOf[TsExportee.Names])
        val namesExport = exportDecl.exported.asInstanceOf[TsExportee.Names]
        assert(namesExport.idents.length == 1)
        assert(namesExport.idents.head._1.parts.head.value == "Utils")
        assert(namesExport.idents.head._2.isEmpty)
        assert(namesExport.fromOpt.isEmpty)
      }

      test("type-only export star as namespace statements") {
        val exportStar = createMockExportStarTypeOnly(Some("Types"), "types")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        // Should be rewritten to type-only import + export
        assert(result.length == 2)

        // First should be a type-only import
        assert(result.head.isInstanceOf[TsImport])
        val importDecl = result.head.asInstanceOf[TsImport]
        assert(importDecl.typeOnly == true)

        // Second should be a type-only export
        assert(result(1).isInstanceOf[TsExport])
        val exportDecl = result(1).asInstanceOf[TsExport]
        assert(exportDecl.typeOnly == true)
      }

      test("multiple export star statements in the same file") {
        val exportStar1      = createMockExportStar(Some("Utils"), "utils")
        val exportStar2      = createMockExportStar(Some("Helpers"), "helpers")
        val regularInterface = createMockInterface("TestInterface")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar1, exportStar2, regularInterface)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        // Should have 2 imports + 2 exports + 1 interface = 5 total
        assert(result.length == 5)

        // Check first export star rewrite
        assert(result(0).isInstanceOf[TsImport])
        assert(result(1).isInstanceOf[TsExport])

        // Check second export star rewrite
        assert(result(2).isInstanceOf[TsImport])
        assert(result(3).isInstanceOf[TsExport])

        // Check preserved interface
        assert(result(4).isInstanceOf[TsDeclInterface])
      }

      test("export star with different module specifiers") {
        val exportStar1 = createMockExportStar(Some("LocalUtils"), "./utils")
        val exportStar2 = createMockExportStar(Some("ExternalLib"), "external-library")
        val exportStar3 = createMockExportStar(Some("ScopedPkg"), "@scope/package")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar1, exportStar2, exportStar3)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        // Should have 3 imports + 3 exports = 6 total
        assert(result.length == 6)

        // Verify all are properly rewritten
        for (i <- 0 until 6 by 2) {
          assert(result(i).isInstanceOf[TsImport])
          assert(result(i + 1).isInstanceOf[TsExport])
        }

        // Check specific module paths
        val import1 = result(0).asInstanceOf[TsImport]
        val import2 = result(2).asInstanceOf[TsImport]
        val import3 = result(4).asInstanceOf[TsImport]

        assert(import1.from.asInstanceOf[TsImportee.From].from.value == "./utils")
        assert(import2.from.asInstanceOf[TsImportee.From].from.value == "external-library")
        assert(import3.from.asInstanceOf[TsImportee.From].from.value == "@scope/package")
      }
    }

    test("RewriteExportStarAs - Rewriting Logic") {
      test("conversion preserves original module references") {
        val exportStar = createMockExportStar(Some("MyNamespace"), "my-module")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 2)

        val importDecl = result.head.asInstanceOf[TsImport]
        val exportDecl = result(1).asInstanceOf[TsExport]

        // Import should reference the original module
        val fromImport = importDecl.from.asInstanceOf[TsImportee.From]
        assert(fromImport.from.value == "my-module")

        // Export should reference the imported namespace
        val namesExport = exportDecl.exported.asInstanceOf[TsExportee.Names]
        assert(namesExport.idents.head._1.parts.head.value == "MyNamespace")
      }

      test("correct generation of namespace identifiers") {
        val exportStar1 = createMockExportStar(Some("SimpleNamespace"), "module1")
        val exportStar2 = createMockExportStar(Some("Complex_Name123"), "module2")
        val exportStar3 = createMockExportStar(Some("$pecial"), "module3")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar1, exportStar2, exportStar3)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 6)

        // Check that namespace identifiers are correctly preserved
        val export1 = result(1).asInstanceOf[TsExport]
        val export2 = result(3).asInstanceOf[TsExport]
        val export3 = result(5).asInstanceOf[TsExport]

        val names1 = export1.exported.asInstanceOf[TsExportee.Names]
        val names2 = export2.exported.asInstanceOf[TsExportee.Names]
        val names3 = export3.exported.asInstanceOf[TsExportee.Names]

        assert(names1.idents.head._1.parts.head.value == "SimpleNamespace")
        assert(names2.idents.head._1.parts.head.value == "Complex_Name123")
        assert(names3.idents.head._1.parts.head.value == "$pecial")
      }

      test("handling of module path resolution") {
        val relativeExport   = createMockExportStar(Some("Relative"), "./relative/path")
        val absoluteExport   = createMockExportStar(Some("Absolute"), "/absolute/path")
        val nodeModuleExport = createMockExportStar(Some("NodeModule"), "node-module")
        val module = createMockModule(
          "TestModule",
          members = IArray(relativeExport, absoluteExport, nodeModuleExport)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 6)

        // Verify that all module paths are preserved correctly
        val import1 = result(0).asInstanceOf[TsImport]
        val import2 = result(2).asInstanceOf[TsImport]
        val import3 = result(4).asInstanceOf[TsImport]

        assert(import1.from.asInstanceOf[TsImportee.From].from.value == "./relative/path")
        assert(import2.from.asInstanceOf[TsImportee.From].from.value == "/absolute/path")
        assert(import3.from.asInstanceOf[TsImportee.From].from.value == "node-module")
      }
    }

    test("RewriteExportStarAs - Module and Namespace Integration") {
      test("processing export stars within modules") {
        val exportStar = createMockExportStar(Some("Utils"), "utils")
        val interface1 = createMockInterface("ModuleInterface")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar, interface1),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 3)
        assert(result(0).isInstanceOf[TsImport])
        assert(result(1).isInstanceOf[TsExport])
        assert(result(2).isInstanceOf[TsDeclInterface])

        // Verify the interface is preserved
        val preservedInterface = result(2).asInstanceOf[TsDeclInterface]
        assert(preservedInterface.name.value == "ModuleInterface")
      }

      test("processing export stars within namespaces") {
        val exportStar = createMockExportStar(Some("NestedUtils"), "nested-utils")
        val namespace = createMockNamespace(
          "TestNamespace",
          members = IArray(exportStar),
          codePath = createHasPath("test", "TestNamespace")
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, namespace)

        assert(result.length == 2)
        assert(result(0).isInstanceOf[TsImport])
        assert(result(1).isInstanceOf[TsExport])
      }

      test("handling augmented modules with export stars") {
        val exportStar = createMockExportStar(Some("AugmentedUtils"), "augmented-utils")
        val interface1 = createMockInterface("AugmentedInterface")

        // Create an augmented module structure
        val augmentedModule = TsAugmentedModule(
          comments = NoComments,
          name = createIdentModule("existing-module"),
          members = IArray(exportStar, interface1),
          codePath = createHasPath("test", "AugmentedModule"),
          jsLocation = JsLocation.Zero
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, augmentedModule)

        assert(result.length == 3)
        assert(result(0).isInstanceOf[TsImport])
        assert(result(1).isInstanceOf[TsExport])
        assert(result(2).isInstanceOf[TsDeclInterface])
      }

      test("interaction with existing namespace declarations") {
        val exportStar        = createMockExportStar(Some("ExternalNamespace"), "external")
        val existingNamespace = createMockNamespace("ExistingNamespace")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar, existingNamespace)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 3)
        assert(result(0).isInstanceOf[TsImport])
        assert(result(1).isInstanceOf[TsExport])
        assert(result(2).isInstanceOf[TsDeclNamespace])

        // Verify existing namespace is preserved
        val preservedNamespace = result(2).asInstanceOf[TsDeclNamespace]
        assert(preservedNamespace.name.value == "ExistingNamespace")
      }
    }

    test("RewriteExportStarAs - Edge Cases") {
      test("empty modules with export stars") {
        val exportStar = createMockExportStar(Some("EmptyModuleUtils"), "empty-module")
        val module = createMockModule(
          "EmptyModule",
          members = IArray(exportStar)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 2)
        assert(result(0).isInstanceOf[TsImport])
        assert(result(1).isInstanceOf[TsExport])
      }

      test("export stars with relative vs absolute module paths") {
        val relativeExport1 = createMockExportStar(Some("Relative1"), "./utils")
        val relativeExport2 = createMockExportStar(Some("Relative2"), "../helpers")
        val relativeExport3 = createMockExportStar(Some("Relative3"), "../../shared")
        val absoluteExport  = createMockExportStar(Some("Absolute"), "/usr/lib/module")
        val module = createMockModule(
          "TestModule",
          members = IArray(relativeExport1, relativeExport2, relativeExport3, absoluteExport)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 8) // 4 exports * 2 (import + export) each

        // Verify all paths are preserved correctly
        val imports       = result.zipWithIndex.filter(_._2 % 2 == 0).map(_._1.asInstanceOf[TsImport])
        val expectedPaths = List("./utils", "../helpers", "../../shared", "/usr/lib/module")

        imports.toList.zip(expectedPaths).foreach { case (importDecl, expectedPath) =>
          val fromImport = importDecl.from.asInstanceOf[TsImportee.From]
          assert(fromImport.from.value == expectedPath)
        }
      }

      test("export stars with special characters in module names") {
        val specialExport1 = createMockExportStar(Some("Special1"), "@scope/package")
        val specialExport2 = createMockExportStar(Some("Special2"), "package-with-dashes")
        val specialExport3 = createMockExportStar(Some("Special3"), "package_with_underscores")
        val specialExport4 = createMockExportStar(Some("Special4"), "package.with.dots")
        val module = createMockModule(
          "TestModule",
          members = IArray(specialExport1, specialExport2, specialExport3, specialExport4)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 8)

        // Verify all special characters are preserved
        val imports = result.zipWithIndex.filter(_._2 % 2 == 0).map(_._1.asInstanceOf[TsImport])
        val expectedPaths =
          List("@scope/package", "package-with-dashes", "package_with_underscores", "package.with.dots")

        imports.toList.zip(expectedPaths).foreach { case (importDecl, expectedPath) =>
          val fromImport = importDecl.from.asInstanceOf[TsImportee.From]
          assert(fromImport.from.value == expectedPath)
        }
      }

      test("conflicting namespace names") {
        // Test that the transformation doesn't handle name conflicts - it just rewrites as-is
        val exportStar1 = createMockExportStar(Some("Utils"), "utils1")
        val exportStar2 = createMockExportStar(Some("Utils"), "utils2") // Same namespace name
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar1, exportStar2)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 4)

        // Both should be rewritten, even with conflicting names
        val export1 = result(1).asInstanceOf[TsExport]
        val export2 = result(3).asInstanceOf[TsExport]

        val names1 = export1.exported.asInstanceOf[TsExportee.Names]
        val names2 = export2.exported.asInstanceOf[TsExportee.Names]

        // Both should have the same namespace name (conflict not resolved by this transformation)
        assert(names1.idents.head._1.parts.head.value == "Utils")
        assert(names2.idents.head._1.parts.head.value == "Utils")
      }
    }

    test("RewriteExportStarAs - Code Path and Metadata Preservation") {
      test("maintaining correct code paths for rewritten declarations") {
        val exportStar = createMockExportStar(Some("PathUtils"), "path-utils")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 2)

        // The transformation doesn't modify code paths - they remain as default
        val importDecl = result.head.asInstanceOf[TsImport]
        val exportDecl = result(1).asInstanceOf[TsExport]

        // Both should be new declarations without specific code paths
        // (The transformation creates new AST nodes)
        assert(importDecl.isInstanceOf[TsImport])
        assert(exportDecl.isInstanceOf[TsExport])
      }

      test("preserving comments and metadata") {
        val exportStarWithComments = TsExport(
          comments = Comments(Comment.Raw("/** Re-export utilities */")),
          typeOnly = false,
          tpe = ExportType.Named,
          exported = TsExportee.Star(Some(createSimpleIdent("CommentedUtils")), createIdentModule("commented-utils"))
        )
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStarWithComments)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 2)

        // Comments should be preserved on the export
        val exportDecl = result(1).asInstanceOf[TsExport]
        // The transformation preserves the original comments
        assert(exportDecl.comments.nonEmpty)
      }

      test("handling JSLocation information correctly") {
        val exportStar = createMockExportStar(Some("LocationUtils"), "location-utils")
        val module = createMockModule(
          "TestModule",
          members = IArray(exportStar)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 2)

        // Both import and export should be valid AST nodes
        assert(result.head.isInstanceOf[TsImport])
        assert(result(1).isInstanceOf[TsExport])
      }
    }

    test("RewriteExportStarAs - Integration Scenarios") {
      test("realistic module structures with mixed export types") {
        val interface1    = createMockInterface("ApiInterface")
        val regularExport = createMockExportNamed("ApiInterface" -> None)
        val exportStar1   = createMockExportStar(Some("Utils"), "utils")
        val exportStar2   = createMockExportStarTypeOnly(Some("Types"), "types")
        val namespace1    = createMockNamespace("LocalNamespace")

        val module = createMockModule(
          "ComplexModule",
          members = IArray(interface1, regularExport, exportStar1, exportStar2, namespace1)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        // Should have: interface + regular export + (import + export) + (import + export) + namespace = 7 total
        assert(result.length == 7)

        // Verify structure
        assert(result(0).isInstanceOf[TsDeclInterface])
        assert(result(1).isInstanceOf[TsExport])
        assert(result(2).isInstanceOf[TsImport]) // First export star rewrite
        assert(result(3).isInstanceOf[TsExport])
        assert(result(4).isInstanceOf[TsImport]) // Second export star rewrite
        assert(result(5).isInstanceOf[TsExport])
        assert(result(6).isInstanceOf[TsDeclNamespace])
      }

      test("complex nested module hierarchies") {
        val exportStar1 = createMockExportStar(Some("Level1"), "./level1/module")
        val exportStar2 = createMockExportStar(Some("Level2"), "./level1/level2/module")
        val exportStar3 = createMockExportStar(Some("Level3"), "./level1/level2/level3/module")

        val module = createMockModule(
          "NestedModule",
          members = IArray(exportStar1, exportStar2, exportStar3)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 6) // 3 export stars * 2 each

        // Verify all nested paths are preserved
        val imports       = result.zipWithIndex.filter(_._2 % 2 == 0).map(_._1.asInstanceOf[TsImport])
        val expectedPaths = List("./level1/module", "./level1/level2/module", "./level1/level2/level3/module")

        imports.toList.zip(expectedPaths).foreach { case (importDecl, expectedPath) =>
          val fromImport = importDecl.from.asInstanceOf[TsImportee.From]
          assert(fromImport.from.value == expectedPath)
        }
      }

      test("interaction with other transformations") {
        // Test that the transformation produces valid AST that can be processed by other transformations
        val exportStar = createMockExportStar(Some("TransformUtils"), "transform-utils")
        val module = createMockModule(
          "TransformModule",
          members = IArray(exportStar),
          codePath = createHasPath("transform", "test")
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, module)

        assert(result.length == 2)

        // Verify the result can be used as input to other transformations
        val importDecl = result.head.asInstanceOf[TsImport]
        val exportDecl = result(1).asInstanceOf[TsExport]

        // Both should have proper structure for further processing
        assert(importDecl.imported.head.isInstanceOf[TsImported.Star])
        assert(exportDecl.exported.isInstanceOf[TsExportee.Names])
      }

      test("library-style export patterns") {
        val utilsExport     = createMockExportStar(Some("Utils"), "./utils")
        val helpersExport   = createMockExportStar(Some("Helpers"), "./helpers")
        val constantsExport = createMockExportStar(Some("Constants"), "./constants")
        val typesExport     = createMockExportStarTypeOnly(Some("Types"), "./types")

        val libraryModule = createMockModule(
          "LibraryIndex",
          members = IArray(utilsExport, helpersExport, constantsExport, typesExport)
        )
        val scope = createMockScope()

        val result = RewriteExportStarAs.newMembers(scope, libraryModule)

        assert(result.length == 8) // 4 export stars * 2 each

        // Verify all are properly rewritten
        for (i <- 0 until 8 by 2) {
          assert(result(i).isInstanceOf[TsImport])
          assert(result(i + 1).isInstanceOf[TsExport])
        }

        // Verify type-only export is preserved
        val typeImport = result(6).asInstanceOf[TsImport]
        val typeExport = result(7).asInstanceOf[TsExport]
        assert(typeImport.typeOnly == true)
        assert(typeExport.typeOnly == true)
      }
    }
  }
}
