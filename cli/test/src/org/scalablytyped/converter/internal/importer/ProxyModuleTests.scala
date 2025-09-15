package org.scalablytyped.converter.internal.importer

import org.scalablytyped.converter.internal.{Comment, Comments, IArray, InFolder, NoComments}
import org.scalablytyped.converter.internal.logging.Logger
import org.scalablytyped.converter.internal.ts.*
import utest.*

object ProxyModuleTests extends TestSuite {

  // Helper methods for creating test data
  def createMockLibrarySimple(name: String): TsIdentLibrarySimple = TsIdentLibrarySimple(name)

  def createMockLibraryScoped(scope: String, name: String): TsIdentLibraryScoped =
    TsIdentLibraryScoped(scope, name)

  def createMockModuleIdent(name: String): TsIdentModule = TsIdentModule(None, List(name))

  def createMockScopedModuleIdent(scope: String, name: String): TsIdentModule =
    TsIdentModule(Some(scope), List(name))

  def createMockLibTsSource(libName: TsIdentLibrary): LibTsSource = {
    val tempDir = os.temp.dir(prefix = "proxy-module-test-")
    val folder  = InFolder(tempDir)
    LibTsSource.FromFolder(folder, libName)
  }

  def createMockLogger(): Logger[Unit] = Logger.DevNull

  def createMockLibraryResolver(): LibraryResolver = {
    // Create a minimal mock resolver that returns None for all lookups
    new LibraryResolver(
      stdLib = createMockStdLib(),
      allSources = IArray.Empty,
      ignored = Set.empty
    )
  }

  def createMockStdLib(): LibTsSource.StdLibSource = {
    val tempDir      = os.temp.dir(prefix = "proxy-module-test-")
    val stdLibFolder = InFolder(tempDir)
    val stdLibFiles  = IArray.Empty
    LibTsSource.StdLibSource(stdLibFolder, stdLibFiles, TsIdentLibrarySimple("std"))
  }

  def createMockResolvedModule(moduleName: TsIdentModule): ResolvedModule.NotLocal = {
    val source = createMockLibTsSource(TsIdentLibrarySimple("test-lib"))
    ResolvedModule.NotLocal(source, moduleName)
  }

  def tests = Tests {
    test("ProxyModule - Basic Functionality") {
      test("should create ProxyModule with correct properties") {
        val comments   = Comments(Comment("/* test comment */"))
        val libName    = createMockLibrarySimple("test-lib")
        val fromModule = createMockModuleIdent("source-module")
        val toModule   = createMockModuleIdent("target-module")

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)

        // Verify basic properties
        assert(proxyModule.comments == comments)
        assert(proxyModule.libName == libName)
        assert(proxyModule.fromModule == fromModule)
        assert(proxyModule.toModule == toModule)
      }

      test("should generate correct asModule TsDeclModule") {
        val comments   = Comments(Comment("/* proxy module */"))
        val libName    = createMockLibrarySimple("my-lib")
        val fromModule = createMockModuleIdent("from")
        val toModule   = createMockModuleIdent("to")

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)
        val asModule    = proxyModule.asModule

        // Verify TsDeclModule properties
        assert(asModule.comments == comments)
        assert(asModule.declared == false)
        assert(asModule.name == toModule)
        assert(asModule.members.length == 1)
        assert(asModule.jsLocation == JsLocation.Zero)

        // Verify the export member
        val exportMember = asModule.members.head.asInstanceOf[TsExport]
        assert(exportMember.comments == NoComments)
        assert(exportMember.typeOnly == false)
        assert(exportMember.tpe == ExportType.Named)

        val exportee = exportMember.exported.asInstanceOf[TsExportee.Star]
        assert(exportee.as.isEmpty)
        assert(exportee.from == fromModule)
      }

      test("should handle scoped library names") {
        val comments   = NoComments
        val libName    = createMockLibraryScoped("types", "node")
        val fromModule = createMockScopedModuleIdent("types", "node")
        val toModule   = createMockModuleIdent("index")

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)

        // Verify scoped library handling
        assert(proxyModule.libName.isInstanceOf[TsIdentLibraryScoped])
        assert(proxyModule.fromModule.scopeOpt.isDefined)
        assert(proxyModule.toModule.scopeOpt.isEmpty)
      }
    }

    test("ProxyModule - Edge Cases") {
      test("should handle empty comments") {
        val comments   = NoComments
        val libName    = createMockLibrarySimple("empty-lib")
        val fromModule = createMockModuleIdent("src")
        val toModule   = createMockModuleIdent("dist")

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)
        val asModule    = proxyModule.asModule

        // Verify empty comments are preserved
        assert(asModule.comments == NoComments)
        assert(asModule.members.length == 1)
      }

      test("should handle complex module paths") {
        val comments   = Comments(Comment("/* complex module */"))
        val libName    = createMockLibrarySimple("complex-lib")
        val fromModule = TsIdentModule(Some("scope"), List("nested", "deep", "module"))
        val toModule   = TsIdentModule(None, List("public", "api"))

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)
        val asModule    = proxyModule.asModule

        // Verify complex paths are handled correctly
        assert(asModule.name == toModule)
        val exportMember = asModule.members.head.asInstanceOf[TsExport]
        val exportee     = exportMember.exported.asInstanceOf[TsExportee.Star]
        assert(exportee.from == fromModule)
      }
    }

    test("ProxyModule - Negative Cases") {
      test("should handle identical from and to modules") {
        val comments    = NoComments
        val libName     = createMockLibrarySimple("same-lib")
        val moduleIdent = createMockModuleIdent("same-module")

        val proxyModule = ProxyModule(comments, libName, moduleIdent, moduleIdent)

        // Verify it still creates valid proxy even with same modules
        assert(proxyModule.fromModule == proxyModule.toModule)
        val asModule = proxyModule.asModule
        assert(asModule.name == moduleIdent)
      }

      test("should handle very long module names") {
        val comments = NoComments
        val libName  = createMockLibrarySimple("very-long-library-name-with-many-segments")
        val fromModule =
          TsIdentModule(None, List("very", "long", "nested", "module", "path", "with", "many", "segments"))
        val toModule = TsIdentModule(None, List("another", "very", "long", "module", "path"))

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)
        val asModule    = proxyModule.asModule

        // Verify long names are handled correctly
        assert(asModule.name == toModule)
        assert(asModule.members.length == 1)
      }

      test("should handle special characters in module names") {
        val comments   = NoComments
        val libName    = createMockLibrarySimple("special-chars")
        val fromModule = TsIdentModule(None, List("module-with-dashes"))
        val toModule   = TsIdentModule(None, List("module_with_underscores"))

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)

        // Verify special characters are preserved
        assert(proxyModule.fromModule.fragments.head == "module-with-dashes")
        assert(proxyModule.toModule.fragments.head == "module_with_underscores")
      }
    }

    test("ProxyModule - Container Handling") {
      test("should handle CodePath generation correctly") {
        val comments   = NoComments
        val libName    = createMockLibrarySimple("path-lib")
        val fromModule = createMockModuleIdent("source")
        val toModule   = createMockModuleIdent("target")

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)
        val asModule    = proxyModule.asModule

        // Verify CodePath is generated correctly
        assert(asModule.codePath.isInstanceOf[CodePath.HasPath])
        val hasPath = asModule.codePath.asInstanceOf[CodePath.HasPath]
        assert(hasPath.inLibrary == libName)
      }

      test("should handle JsLocation correctly") {
        val comments   = NoComments
        val libName    = createMockLibrarySimple("location-lib")
        val fromModule = createMockModuleIdent("from")
        val toModule   = createMockModuleIdent("to")

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)
        val asModule    = proxyModule.asModule

        // Verify JsLocation is set to Zero
        assert(asModule.jsLocation == JsLocation.Zero)
      }
    }

    test("ProxyModule - Advanced Scenarios") {
      test("should handle multiple scoped modules") {
        val comments   = Comments(Comment("/* multi-scope test */"))
        val libName    = createMockLibraryScoped("babel", "core")
        val fromModule = TsIdentModule(Some("babel"), List("parser", "types"))
        val toModule   = TsIdentModule(Some("babel"), List("core", "api"))

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)
        val asModule    = proxyModule.asModule

        // Verify both modules have scopes
        assert(proxyModule.fromModule.scopeOpt.contains("babel"))
        assert(proxyModule.toModule.scopeOpt.contains("babel"))
        assert(asModule.name == toModule)
      }

      test("should handle mixed scope scenarios") {
        val comments   = NoComments
        val libName    = createMockLibrarySimple("mixed-lib")
        val fromModule = TsIdentModule(Some("scoped"), List("module"))
        val toModule   = TsIdentModule(None, List("unscoped", "module"))

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)

        // Verify mixed scoping
        assert(proxyModule.fromModule.scopeOpt.isDefined)
        assert(proxyModule.toModule.scopeOpt.isEmpty)
      }

      test("should handle deeply nested module paths") {
        val comments   = NoComments
        val libName    = createMockLibrarySimple("deep-lib")
        val fromModule = TsIdentModule(None, List("level1", "level2", "level3", "level4", "level5"))
        val toModule   = TsIdentModule(None, List("api", "v1", "public"))

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)
        val asModule    = proxyModule.asModule

        // Verify deep nesting is preserved
        assert(proxyModule.fromModule.fragments.length == 5)
        assert(proxyModule.toModule.fragments.length == 3)
        assert(asModule.name == toModule)
      }

      test("should handle empty module fragments") {
        val comments   = NoComments
        val libName    = createMockLibrarySimple("empty-fragments")
        val fromModule = TsIdentModule(None, List())
        val toModule   = TsIdentModule(None, List())

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)

        // Verify empty fragments are handled
        assert(proxyModule.fromModule.fragments.isEmpty)
        assert(proxyModule.toModule.fragments.isEmpty)
      }

      test("should handle complex comments") {
        val complexComment = Comment("/* Multi-line\n * comment with\n * special chars: @#$%^&*() */")
        val comments       = Comments(complexComment)
        val libName        = createMockLibrarySimple("comment-lib")
        val fromModule     = createMockModuleIdent("source")
        val toModule       = createMockModuleIdent("target")

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)
        val asModule    = proxyModule.asModule

        // Verify complex comments are preserved
        assert(asModule.comments == comments)
        assert(asModule.comments.asInstanceOf[Comments].cs.head == complexComment)
      }
    }

    test("ProxyModule - Comprehensive Integration") {
      test("should create valid TsDeclModule with all properties") {
        val comments   = Comments(Comment("/* integration test */"))
        val libName    = createMockLibraryScoped("integration", "test")
        val fromModule = TsIdentModule(Some("integration"), List("internal", "module"))
        val toModule   = TsIdentModule(Some("integration"), List("public", "api"))

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)
        val asModule    = proxyModule.asModule

        // Comprehensive verification of TsDeclModule properties
        assert(asModule.comments == comments)
        assert(asModule.declared == false)
        assert(asModule.name == toModule)
        assert(asModule.members.length == 1)
        assert(asModule.codePath.isInstanceOf[CodePath.HasPath])
        assert(asModule.jsLocation == JsLocation.Zero)

        // Verify the export member
        val exportMember = asModule.members.head.asInstanceOf[TsExport]
        assert(exportMember.comments == NoComments)
        assert(exportMember.typeOnly == false)
        assert(exportMember.tpe == ExportType.Named)

        // Verify the exportee
        val exportee = exportMember.exported.asInstanceOf[TsExportee.Star]
        assert(exportee.as.isEmpty)
        assert(exportee.from == fromModule)
      }

      test("should maintain referential integrity") {
        val comments   = NoComments
        val libName    = createMockLibrarySimple("integrity-lib")
        val fromModule = createMockModuleIdent("from")
        val toModule   = createMockModuleIdent("to")

        val proxyModule1 = ProxyModule(comments, libName, fromModule, toModule)
        val proxyModule2 = ProxyModule(comments, libName, fromModule, toModule)

        // Verify different instances with same parameters are equal in behavior
        assert(proxyModule1.comments == proxyModule2.comments)
        assert(proxyModule1.libName == proxyModule2.libName)
        assert(proxyModule1.fromModule == proxyModule2.fromModule)
        assert(proxyModule1.toModule == proxyModule2.toModule)
      }

      test("should handle edge case with single character names") {
        val comments   = NoComments
        val libName    = createMockLibrarySimple("x")
        val fromModule = TsIdentModule(None, List("a"))
        val toModule   = TsIdentModule(None, List("b"))

        val proxyModule = ProxyModule(comments, libName, fromModule, toModule)

        // Verify single character names work
        assert(proxyModule.fromModule.fragments.head == "a")
        assert(proxyModule.toModule.fragments.head == "b")
      }
    }
  }
}
