package org.scalablytyped.converter.internal.importer

import org.scalablytyped.converter.internal.{IArray, InFolder, NoComments}
import org.scalablytyped.converter.internal.logging.Logger
import org.scalablytyped.converter.internal.ts.*
import utest.*

object ResolveExternalReferencesTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createMockLibraryResolver(): LibraryResolver = {
    // Create a minimal mock resolver that returns None for all lookups
    new LibraryResolver(
      stdLib = createMockStdLib(),
      allSources = IArray.Empty,
      ignored = Set.empty
    )
  }

  def createMockStdLib(): LibTsSource.StdLibSource = {
    val tempDir      = os.temp.dir(prefix = "resolve-external-test-")
    val stdLibFolder = InFolder(tempDir)
    val stdLibFiles  = IArray.Empty
    LibTsSource.StdLibSource(stdLibFolder, stdLibFiles, TsIdentLibrary("std"))
  }

  def createMockLibTsSource(): LibTsSource = {
    val tempDir = os.temp.dir(prefix = "resolve-external-test-")
    val folder  = InFolder(tempDir)
    LibTsSource.FromFolder(folder, TsIdentLibrary("test-lib"))
  }

  def createMockFolder(): InFolder = {
    val tempDir = os.temp.dir(prefix = "resolve-external-test-")
    InFolder(tempDir)
  }

  def createMockParsedFile(
      imports: IArray[TsImport] = IArray.Empty,
      exports: IArray[TsExport] = IArray.Empty,
      members: IArray[TsContainerOrDecl] = IArray.Empty
  ): TsParsedFile = {
    TsParsedFile(
      comments = NoComments,
      directives = IArray.Empty,
      members = imports ++ exports ++ members,
      codePath = CodePath.NoPath
    )
  }

  def createMockImport(from: String): TsImport = {
    TsImport(
      typeOnly = false,
      imported = IArray(TsImported.Star(Some(createSimpleIdent("imported")))),
      from = TsImportee.From(TsIdentModule(None, from :: Nil))
    )
  }

  def createMockExport(from: String): TsExport = {
    TsExport(
      comments = NoComments,
      typeOnly = false,
      tpe = ExportType.Named,
      exported = TsExportee.Star(None, TsIdentModule(None, from :: Nil))
    )
  }

  def tests = Tests {
    test("ResolveExternalReferences - Basic Functionality") {
      test("should handle empty parsed file") {
        val resolver   = createMockLibraryResolver()
        val source     = createMockLibTsSource()
        val folder     = createMockFolder()
        val parsedFile = createMockParsedFile()
        val logger     = Logger.DevNull

        val result = ResolveExternalReferences(resolver, source, folder, parsedFile, logger)

        assert(result.rewritten != null)
        assert(result.resolvedModules.isEmpty)
        assert(result.unresolvedModules.isEmpty)
      }

      test("should handle parsed file with simple import") {
        val resolver   = createMockLibraryResolver()
        val source     = createMockLibTsSource()
        val folder     = createMockFolder()
        val importStmt = createMockImport("react")
        val parsedFile = createMockParsedFile(imports = IArray(importStmt))
        val logger     = Logger.DevNull

        val result = ResolveExternalReferences(resolver, source, folder, parsedFile, logger)

        assert(result.rewritten != null)
        // Should have attempted to resolve the "react" module
        assert(result.unresolvedModules.nonEmpty || result.resolvedModules.nonEmpty)
      }

      test("should handle parsed file with export statement") {
        val resolver   = createMockLibraryResolver()
        val source     = createMockLibTsSource()
        val folder     = createMockFolder()
        val exportStmt = createMockExport("./utils")
        val parsedFile = createMockParsedFile(exports = IArray(exportStmt))
        val logger     = Logger.DevNull

        val result = ResolveExternalReferences(resolver, source, folder, parsedFile, logger)

        assert(result.rewritten != null)
        // Should have attempted to resolve the "./utils" module
        assert(result.unresolvedModules.nonEmpty || result.resolvedModules.nonEmpty)
      }
    }

    test("ResolveExternalReferences - Edge Cases") {
      test("should handle multiple imports and exports") {
        val resolver = createMockLibraryResolver()
        val source   = createMockLibTsSource()
        val folder   = createMockFolder()
        val import1  = createMockImport("react")
        val import2  = createMockImport("lodash")
        val export1  = createMockExport("./utils")
        val export2  = createMockExport("./types")
        val parsedFile = createMockParsedFile(
          imports = IArray(import1, import2),
          exports = IArray(export1, export2)
        )
        val logger = Logger.DevNull

        val result = ResolveExternalReferences(resolver, source, folder, parsedFile, logger)

        assert(result.rewritten != null)
        // Should have attempted to resolve multiple modules
        assert(result.unresolvedModules.nonEmpty || result.resolvedModules.nonEmpty)
      }

      test("should handle relative path imports") {
        val resolver   = createMockLibraryResolver()
        val source     = createMockLibTsSource()
        val folder     = createMockFolder()
        val importStmt = createMockImport("../parent/module")
        val parsedFile = createMockParsedFile(imports = IArray(importStmt))
        val logger     = Logger.DevNull

        val result = ResolveExternalReferences(resolver, source, folder, parsedFile, logger)

        assert(result.rewritten != null)
        // Should handle relative paths
        assert(result.unresolvedModules.nonEmpty || result.resolvedModules.nonEmpty)
      }

      test("should handle scoped package imports") {
        val resolver   = createMockLibraryResolver()
        val source     = createMockLibTsSource()
        val folder     = createMockFolder()
        val importStmt = createMockImport("@types/node")
        val parsedFile = createMockParsedFile(imports = IArray(importStmt))
        val logger     = Logger.DevNull

        val result = ResolveExternalReferences(resolver, source, folder, parsedFile, logger)

        assert(result.rewritten != null)
        // Should handle scoped packages
        assert(result.unresolvedModules.nonEmpty || result.resolvedModules.nonEmpty)
      }
    }

    test("ResolveExternalReferences - Negative Cases") {
      test("should handle parsed file with no imports or exports") {
        val resolver   = createMockLibraryResolver()
        val source     = createMockLibTsSource()
        val folder     = createMockFolder()
        val parsedFile = createMockParsedFile()
        val logger     = Logger.DevNull

        val result = ResolveExternalReferences(resolver, source, folder, parsedFile, logger)

        assert(result.rewritten != null)
        // Should have no resolved or unresolved modules for empty file
        assert(result.resolvedModules.isEmpty)
        assert(result.unresolvedModules.isEmpty)
      }

      test("should handle invalid module paths gracefully") {
        val resolver   = createMockLibraryResolver()
        val source     = createMockLibTsSource()
        val folder     = createMockFolder()
        val importStmt = createMockImport("") // Empty module path
        val parsedFile = createMockParsedFile(imports = IArray(importStmt))
        val logger     = Logger.DevNull

        val result = ResolveExternalReferences(resolver, source, folder, parsedFile, logger)

        assert(result.rewritten != null)
        // Should handle invalid paths without crashing
        assert(result.unresolvedModules.nonEmpty || result.resolvedModules.nonEmpty)
      }

      test("should handle complex nested module structures") {
        val resolver   = createMockLibraryResolver()
        val source     = createMockLibTsSource()
        val folder     = createMockFolder()
        val importStmt = createMockImport("@scope/package/sub/module")
        val parsedFile = createMockParsedFile(imports = IArray(importStmt))
        val logger     = Logger.DevNull

        val result = ResolveExternalReferences(resolver, source, folder, parsedFile, logger)

        assert(result.rewritten != null)
        // Should handle complex nested paths
        assert(result.unresolvedModules.nonEmpty || result.resolvedModules.nonEmpty)
      }
    }
  }
}
