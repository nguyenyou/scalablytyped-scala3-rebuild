package org.scalablytyped.converter.internal.importer

import org.scalablytyped.converter.internal.{IArray, InFile, InFolder}
import org.scalablytyped.converter.internal.ts.{TsIdentLibrary, TsIdentLibrarySimple, TsIdentModule}
import utest.*

object Phase1ReadTypescriptExtractedFunctionsTest extends TestSuite {

  def tests = Tests {
    test("shouldIgnoreModule") {
      test("should return false when ignoredModulePrefixes is empty") {
        val modName         = TsIdentModule(None, List("some", "module", "path"))
        val ignoredPrefixes = Set.empty[List[String]]

        val result = Phase1ReadTypescript.shouldIgnoreModule(modName, ignoredPrefixes)

        assert(!result)
      }

      test("should return true when module matches exact prefix") {
        val modName         = TsIdentModule(None, List("@types", "node"))
        val ignoredPrefixes = Set(List("@types"))

        val result = Phase1ReadTypescript.shouldIgnoreModule(modName, ignoredPrefixes)

        assert(result)
      }

      test("should return true when module matches partial prefix") {
        val modName         = TsIdentModule(None, List("@types", "node", "fs"))
        val ignoredPrefixes = Set(List("@types", "node"))

        val result = Phase1ReadTypescript.shouldIgnoreModule(modName, ignoredPrefixes)

        assert(result)
      }

      test("should return false when module does not match any prefix") {
        val modName         = TsIdentModule(None, List("react", "dom"))
        val ignoredPrefixes = Set(List("@types"), List("internal"))

        val result = Phase1ReadTypescript.shouldIgnoreModule(modName, ignoredPrefixes)

        assert(!result)
      }

      test("should handle multiple ignored prefixes") {
        val modName1        = TsIdentModule(None, List("@types", "react"))
        val modName2        = TsIdentModule(None, List("internal", "utils"))
        val modName3        = TsIdentModule(None, List("public", "api"))
        val ignoredPrefixes = Set(List("@types"), List("internal"))

        assert(Phase1ReadTypescript.shouldIgnoreModule(modName1, ignoredPrefixes))
        assert(Phase1ReadTypescript.shouldIgnoreModule(modName2, ignoredPrefixes))
        assert(!Phase1ReadTypescript.shouldIgnoreModule(modName3, ignoredPrefixes))
      }

      test("should handle single fragment modules") {
        val modName         = TsIdentModule(None, List("react"))
        val ignoredPrefixes = Set(List("react"))

        val result = Phase1ReadTypescript.shouldIgnoreModule(modName, ignoredPrefixes)

        assert(result)
      }

      test("should handle nested prefix matching") {
        val modName         = TsIdentModule(None, List("node_modules", "@types", "react"))
        val ignoredPrefixes = Set(List("node_modules", "@types"))

        val result = Phase1ReadTypescript.shouldIgnoreModule(modName, ignoredPrefixes)

        assert(result)
      }

      test("should not match when prefix is longer than module path") {
        val modName         = TsIdentModule(None, List("short"))
        val ignoredPrefixes = Set(List("short", "but", "longer"))

        val result = Phase1ReadTypescript.shouldIgnoreModule(modName, ignoredPrefixes)

        assert(!result)
      }

      test("should handle empty module fragments") {
        val modName         = TsIdentModule(None, List.empty)
        val ignoredPrefixes = Set(List("@types"))

        val result = Phase1ReadTypescript.shouldIgnoreModule(modName, ignoredPrefixes)

        assert(!result)
      }
    }

    test("determineIncludedFiles") {
      test("should handle StdLibSource") {
        // Create a temporary directory structure for testing
        val tempDir = os.temp.dir(prefix = "test-stdlib-")
        try {
          val libDir = tempDir / "lib"
          os.makeDir.all(libDir)
          os.write(libDir / "lib.d.ts", "declare var console: Console;")
          os.write(libDir / "lib.es6.d.ts", "declare var Symbol: SymbolConstructor;")

          val folder = InFolder(libDir)
          val files  = IArray(InFile(libDir / "lib.d.ts"))
          val source = LibTsSource.StdLibSource(folder, files, TsIdentLibrary("std"))

          val result = Phase1ReadTypescript.determineIncludedFiles(source)

          assert(result.nonEmpty)
          // Should include files from the folder, not just the specified files
        } finally {
          os.remove.all(tempDir)
        }
      }

      test("should handle TypeScript library FromFolder") {
        val tempDir = os.temp.dir(prefix = "test-typescript-")
        try {
          val libDir = tempDir / "typescript"
          os.makeDir.all(libDir)
          os.write(libDir / "index.d.ts", "export const version: string;")

          val folder = InFolder(libDir)
          val source = LibTsSource.FromFolder(folder, TsIdentLibrarySimple("typescript"))

          val result = Phase1ReadTypescript.determineIncludedFiles(source)

          // For typescript library, should return shortenedFiles (which would be empty in this mock)
          assert(result.isEmpty) // shortenedFiles is empty for our test case
        } finally {
          os.remove.all(tempDir)
        }
      }

      test("should handle regular FromFolder library") {
        val tempDir = os.temp.dir(prefix = "test-regular-")
        try {
          val libDir = tempDir / "regular-lib"
          os.makeDir.all(libDir)
          os.write(libDir / "index.d.ts", "export const test: string;")
          os.write(libDir / "types.d.ts", "export interface Test {}")

          val folder = InFolder(libDir)
          val source = LibTsSource.FromFolder(folder, TsIdentLibrarySimple("regular-lib"))

          val result = Phase1ReadTypescript.determineIncludedFiles(source)

          // Should include files from the determined bound folder
          assert(result.nonEmpty)
        } finally {
          os.remove.all(tempDir)
        }
      }

      test("should handle FromFolder with no shortened files") {
        val tempDir = os.temp.dir(prefix = "test-no-files-")
        try {
          val libDir = tempDir / "empty-lib"
          os.makeDir.all(libDir)

          val folder = InFolder(libDir)
          val source = LibTsSource.FromFolder(folder, TsIdentLibrarySimple("empty-lib"))

          val result = Phase1ReadTypescript.determineIncludedFiles(source)

          // Should handle empty case gracefully
          assert(result.isEmpty)
        } finally {
          os.remove.all(tempDir)
        }
      }
    }
  }
}
