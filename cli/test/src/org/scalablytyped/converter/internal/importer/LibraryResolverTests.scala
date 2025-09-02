package org.scalablytyped.converter.internal.importer

import org.scalablytyped.converter.internal.{IArray, InFile, InFolder}
import org.scalablytyped.converter.internal.importer.LibraryResolver.*
import org.scalablytyped.converter.internal.ts.{TsIdentLibrary, TsIdentModule}
import utest.*

object LibraryResolverTests extends TestSuite {
  
  // Helper methods for test setup and cleanup
  def withTempDir[T](testName: String)(test: os.Path => T): T = {
    val tempDir = os.temp.dir(prefix = s"library-resolver-test-$testName-")
    try {
      test(tempDir)
    } finally {
      os.remove.all(tempDir)
    }
  }

  def createTestFile(path: os.Path, content: String): Unit = {
    os.makeDir.all(path / os.up)
    os.write(path, content)
  }

  def createTestDir(path: os.Path): Unit = {
    os.makeDir.all(path)
  }

  // Test fixtures
  def createMockStdLib(tempDir: os.Path): LibTsSource.StdLibSource = {
    val stdLibDir = tempDir / "typescript" / "lib"
    createTestDir(stdLibDir)
    createTestFile(stdLibDir / "lib.d.ts", "declare var console: Console;")
    createTestFile(stdLibDir / "lib.es6.d.ts", "interface Promise<T> {}")
    
    val stdLibFolder = InFolder(stdLibDir)
    val stdLibFiles = IArray(InFile(stdLibDir / "lib.d.ts"), InFile(stdLibDir / "lib.es6.d.ts"))
    LibTsSource.StdLibSource(stdLibFolder, stdLibFiles, TsIdentLibrary("std"))
  }

  def createMockLibrary(tempDir: os.Path, libName: String, hasIndexDts: Boolean = true): LibTsSource.FromFolder = {
    val libDir = tempDir / "node_modules" / libName
    createTestDir(libDir)
    
    if (hasIndexDts) {
      createTestFile(libDir / "index.d.ts", s"export declare const $libName: any;")
    }
    createTestFile(libDir / "package.json", s"""{"name": "$libName", "version": "1.0.0"}""")
    
    LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary(libName))
  }

  def createMockScopedLibrary(tempDir: os.Path, scope: String, name: String): LibTsSource.FromFolder = {
    val libDir = tempDir / "node_modules" / s"@$scope" / name
    createTestDir(libDir)
    createTestFile(libDir / "index.d.ts", s"export declare const $name: any;")
    createTestFile(libDir / "package.json", s"""{"name": "@$scope/$name", "version": "1.0.0"}""")
    
    LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary(s"@$scope/$name"))
  }

  def tests = Tests {
    test("LibraryResolver Construction") {
      test("should initialize with empty sources") {
        withTempDir("empty-init") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val allSources = IArray.Empty
          val ignored = Set.empty[TsIdentLibrary]

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          assert(resolver.stdLib == stdLib)
          // Test that std library is available
          resolver.library(TsIdentLibrary("std")) match {
            case Found(source) => assert(source == stdLib)
            case _ => assert(false)
          }
        }
      }

      test("should initialize with multiple sources") {
        withTempDir("multi-init") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val lodash = createMockLibrary(tempDir, "lodash")
          val react = createMockLibrary(tempDir, "react")
          val allSources = IArray(lodash, react)
          val ignored = Set.empty[TsIdentLibrary]
          
          val resolver = new LibraryResolver(stdLib, allSources, ignored)
          
          // Test that all libraries are available
          resolver.library(TsIdentLibrary("lodash")) match {
            case Found(source) => assert(source == lodash)
            case _ => assert(false)
          }

          resolver.library(TsIdentLibrary("react")) match {
            case Found(source) => assert(source == react)
            case _ => assert(false)
          }
        }
      }

      test("should handle duplicate library names by taking first") {
        withTempDir("duplicate-names") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          
          // Create two libraries with same name in different locations
          val lodash1 = createMockLibrary(tempDir / "location1", "lodash")
          val lodash2 = createMockLibrary(tempDir / "location2", "lodash")
          val allSources = IArray(lodash1, lodash2)
          val ignored = Set.empty[TsIdentLibrary]
          
          val resolver = new LibraryResolver(stdLib, allSources, ignored)
          
          // Should return the first one
          resolver.library(TsIdentLibrary("lodash")) match {
            case Found(source) => assert(source == lodash1)
            case _ => assert(false)
          }
        }
      }
    }

    test("Library Resolution") {
      test("should find existing simple library") {
        withTempDir("find-simple") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val lodash = createMockLibrary(tempDir, "lodash")
          val allSources = IArray(lodash)
          val ignored = Set.empty[TsIdentLibrary]
          
          val resolver = new LibraryResolver(stdLib, allSources, ignored)
          
          resolver.library(TsIdentLibrary("lodash")) match {
            case Found(source) => assert(source == lodash)
            case _ => assert(false)
          }
        }
      }

      test("should find existing scoped library") {
        withTempDir("find-scoped") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val angular = createMockScopedLibrary(tempDir, "angular", "core")
          val allSources = IArray(angular)
          val ignored = Set.empty[TsIdentLibrary]
          
          val resolver = new LibraryResolver(stdLib, allSources, ignored)
          
          resolver.library(TsIdentLibrary("@angular/core")) match {
            case Found(source) => assert(source == angular)
            case _ => assert(false)
          }
        }
      }

      test("should return NotAvailable for non-existent library") {
        withTempDir("not-found") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val allSources = IArray.Empty
          val ignored = Set.empty[TsIdentLibrary]

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          resolver.library(TsIdentLibrary("non-existent")) match {
            case NotAvailable(name) => assert(name.value == "non-existent")
            case _ => assert(false)
          }
        }
      }

      test("should return Ignored for ignored library") {
        withTempDir("ignored") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val lodash = createMockLibrary(tempDir, "lodash")
          val allSources = IArray(lodash)
          val ignored = Set(TsIdentLibrary("lodash"))
          
          val resolver = new LibraryResolver(stdLib, allSources, ignored)
          
          resolver.library(TsIdentLibrary("lodash")) match {
            case Ignored(name) => assert(name.value == "lodash")
            case _ => assert(false)
          }
        }
      }

      test("should prioritize ignored status over availability") {
        withTempDir("ignored-priority") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val lodash = createMockLibrary(tempDir, "lodash")
          val allSources = IArray(lodash)
          val ignored = Set(TsIdentLibrary("lodash"))
          
          val resolver = new LibraryResolver(stdLib, allSources, ignored)
          
          // Even though lodash exists in allSources, it should be ignored
          resolver.library(TsIdentLibrary("lodash")) match {
            case Ignored(name) => assert(name.value == "lodash")
            case _ => assert(false)
          }
        }
      }
    }

    test("Res ADT Behavior") {
      test("Found should convert to Some in toOption") {
        val found = Found("test-source")
        assert(found.toOption.contains("test-source"))
      }

      test("Ignored should convert to None in toOption") {
        val ignored = Ignored(TsIdentLibrary("test"))
        assert(ignored.toOption.isEmpty)
      }

      test("NotAvailable should convert to None in toOption") {
        val notAvailable = NotAvailable(TsIdentLibrary("test"))
        assert(notAvailable.toOption.isEmpty)
      }

      test("Found should map correctly") {
        val found = Found("test")
        val mapped = found.map(_.toUpperCase)
        mapped match {
          case Found(value) => assert(value == "TEST")
          case _ => assert(false)
        }
      }

      test("Ignored should preserve type in map") {
        val ignored = Ignored(TsIdentLibrary("test"))
        val mapped = ignored.map(_.toString)
        mapped match {
          case Ignored(name) => assert(name.value == "test")
          case _ => assert(false)
        }
      }

      test("NotAvailable should preserve type in map") {
        val notAvailable = NotAvailable(TsIdentLibrary("test"))
        val mapped = notAvailable.map(_.toString)
        mapped match {
          case NotAvailable(name) => assert(name.value == "test")
          case _ => assert(false)
        }
      }
    }

    test("Module Resolution") {
      test("should resolve local path modules") {
        withTempDir("local-modules") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val lodash = createMockLibrary(tempDir, "lodash")
          val allSources = IArray(lodash)
          val ignored = Set.empty[TsIdentLibrary]

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          // Create a local file to resolve
          val sourceFolder = InFolder(tempDir / "src")
          createTestDir(sourceFolder.path)
          createTestFile(sourceFolder.path / "utils.ts", "export const util = 'test';")

          val result = resolver.module(lodash, sourceFolder, "./utils")
          result match {
            case Some(ResolvedModule.Local(inFile, moduleName)) =>
              assert(inFile.path.toString.endsWith("utils.ts"))
              assert(moduleName.fragments.nonEmpty)
            case _ => assert(false)
          }
        }
      }

      test("should resolve global reference modules") {
        withTempDir("global-modules") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val lodash = createMockLibrary(tempDir, "lodash")
          val react = createMockLibrary(tempDir, "react")
          val allSources = IArray(lodash, react)
          val ignored = Set.empty[TsIdentLibrary]

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          val sourceFolder = InFolder(tempDir / "src")
          createTestDir(sourceFolder.path)

          val result = resolver.module(lodash, sourceFolder, "react")
          result match {
            case Some(ResolvedModule.NotLocal(source, moduleName)) =>
              assert(source == react)
              assert(moduleName.value == "react")
            case _ => assert(false)
          }
        }
      }

      test("should return None for ignored global modules") {
        withTempDir("ignored-global") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val lodash = createMockLibrary(tempDir, "lodash")
          val react = createMockLibrary(tempDir, "react")
          val allSources = IArray(lodash, react)
          val ignored = Set(TsIdentLibrary("react"))

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          val sourceFolder = InFolder(tempDir / "src")
          createTestDir(sourceFolder.path)

          val result = resolver.module(lodash, sourceFolder, "react")
          assert(result.isEmpty)
        }
      }

      test("should return None for non-available global modules") {
        withTempDir("unavailable-global") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val lodash = createMockLibrary(tempDir, "lodash")
          val allSources = IArray(lodash)
          val ignored = Set.empty[TsIdentLibrary]

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          val sourceFolder = InFolder(tempDir / "src")
          createTestDir(sourceFolder.path)

          val result = resolver.module(lodash, sourceFolder, "non-existent")
          assert(result.isEmpty)
        }
      }

      test("should return None for non-existent local files") {
        withTempDir("missing-local") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val lodash = createMockLibrary(tempDir, "lodash")
          val allSources = IArray(lodash)
          val ignored = Set.empty[TsIdentLibrary]

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          val sourceFolder = InFolder(tempDir / "src")
          createTestDir(sourceFolder.path)

          val result = resolver.module(lodash, sourceFolder, "./non-existent")
          assert(result.isEmpty)
        }
      }
    }

    test("File Resolution") {
      test("should find exact file match") {
        withTempDir("exact-file") { tempDir =>
          val folder = InFolder(tempDir)
          createTestFile(tempDir / "test.ts", "export const test = 'value';")

          val result = LibraryResolver.file(folder, "test.ts")
          result match {
            case Some(inFile) => assert(inFile.path.toString.endsWith("test.ts"))
            case None => assert(false)
          }
        }
      }

      test("should find file with .ts extension added") {
        withTempDir("ts-extension") { tempDir =>
          val folder = InFolder(tempDir)
          createTestFile(tempDir / "test.ts", "export const test = 'value';")

          val result = LibraryResolver.file(folder, "test")
          result match {
            case Some(inFile) => assert(inFile.path.toString.endsWith("test.ts"))
            case None => assert(false)
          }
        }
      }

      test("should find file with .d.ts extension added") {
        withTempDir("dts-extension") { tempDir =>
          val folder = InFolder(tempDir)
          createTestFile(tempDir / "test.d.ts", "declare const test: string;")

          val result = LibraryResolver.file(folder, "test")
          result match {
            case Some(inFile) => assert(inFile.path.toString.endsWith("test.d.ts"))
            case None => assert(false)
          }
        }
      }

      test("should find index.d.ts in subdirectory") {
        withTempDir("index-subdir") { tempDir =>
          val folder = InFolder(tempDir)
          createTestDir(tempDir / "test")
          createTestFile(tempDir / "test" / "index.d.ts", "declare const test: string;")

          val result = LibraryResolver.file(folder, "test")
          result match {
            case Some(inFile) => assert(inFile.path.toString.endsWith("test/index.d.ts"))
            case None => assert(false)
          }
        }
      }

      test("should return None for non-existent file") {
        withTempDir("non-existent") { tempDir =>
          val folder = InFolder(tempDir)

          val result = LibraryResolver.file(folder, "non-existent")
          assert(result.isEmpty)
        }
      }

      test("should prioritize exact match over extensions") {
        withTempDir("priority") { tempDir =>
          val folder = InFolder(tempDir)
          createTestFile(tempDir / "test", "exact match")
          createTestFile(tempDir / "test.ts", "with .ts extension")
          createTestFile(tempDir / "test.d.ts", "with .d.ts extension")

          val result = LibraryResolver.file(folder, "test")
          result match {
            case Some(inFile) =>
              assert(inFile.path.toString.endsWith("/test"))
              assert(!inFile.path.toString.endsWith(".ts"))
            case None => assert(false)
          }
        }
      }

      test("should handle relative paths with leading slash") {
        withTempDir("leading-slash") { tempDir =>
          val folder = InFolder(tempDir)
          createTestFile(tempDir / "test.ts", "export const test = 'value';")

          val result = LibraryResolver.file(folder, "/test")
          result match {
            case Some(inFile) => assert(inFile.path.toString.endsWith("test.ts"))
            case None => assert(false)
          }
        }
      }
    }

    test("Module Name Generation") {
      test("should generate module names for simple library") {
        withTempDir("simple-module-names") { tempDir =>
          val libDir = tempDir / "node_modules" / "lodash"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "export declare const _: any;")
          createTestFile(libDir / "utils.d.ts", "export declare const utils: any;")

          val source = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("lodash"))
          val file = InFile(libDir / "utils.d.ts")

          val moduleNames = LibraryResolver.moduleNameFor(source, file)
          assert(moduleNames.nonEmpty)

          val longName = moduleNames.last
          assert(longName.fragments.contains("lodash"))
          assert(longName.fragments.contains("utils"))
        }
      }

      test("should generate module names for scoped library") {
        withTempDir("scoped-module-names") { tempDir =>
          val libDir = tempDir / "node_modules" / "@angular" / "core"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "export declare const core: any;")
          createTestFile(libDir / "testing.d.ts", "export declare const testing: any;")

          val source = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("@angular/core"))
          val file = InFile(libDir / "testing.d.ts")

          val moduleNames = LibraryResolver.moduleNameFor(source, file)
          assert(moduleNames.nonEmpty)

          val longName = moduleNames.last
          // For scoped libraries, the scope and name are handled separately
          assert(longName.scopeOpt.contains("angular"))
          assert(longName.fragments.contains("core"))
          assert(longName.fragments.contains("testing"))
        }
      }

      test("should handle lib/es parallel directory mapping") {
        withTempDir("parallel-dirs") { tempDir =>
          val libDir = tempDir / "node_modules" / "antd"
          createTestDir(libDir)
          createTestFile(libDir / "lib" / "button.d.ts", "export declare const Button: any;")

          val source = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("antd"))
          val file = InFile(libDir / "lib" / "button.d.ts")

          val moduleNames = LibraryResolver.moduleNameFor(source, file)

          // Should generate both lib and es versions
          val hasLibVersion = moduleNames.exists(_.fragments.contains("lib"))
          val hasEsVersion = moduleNames.exists(_.fragments.contains("es"))

          assert(hasLibVersion)
          assert(hasEsVersion)
        }
      }
    }

    test("Edge Cases and Error Handling") {
      test("should handle empty library name") {
        withTempDir("empty-name") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val allSources = IArray.Empty
          val ignored = Set.empty[TsIdentLibrary]

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          val result = resolver.library(TsIdentLibrary(""))
          result match {
            case NotAvailable(name) => assert(name.value == "")
            case _ => assert(false)
          }
        }
      }

      test("should handle special characters in library names") {
        withTempDir("special-chars") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val specialLib = createMockLibrary(tempDir, "lib-with-dashes_and_underscores")
          val allSources = IArray(specialLib)
          val ignored = Set.empty[TsIdentLibrary]

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          val result = resolver.library(TsIdentLibrary("lib-with-dashes_and_underscores"))
          result match {
            case Found(source) => assert(source == specialLib)
            case _ => assert(false)
          }
        }
      }

      test("should handle case sensitivity") {
        withTempDir("case-sensitivity") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val lodash = createMockLibrary(tempDir, "lodash")
          val allSources = IArray(lodash)
          val ignored = Set.empty[TsIdentLibrary]

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          // Different case should not match
          val result = resolver.library(TsIdentLibrary("LODASH"))
          result match {
            case NotAvailable(name) => assert(name.value == "LODASH")
            case _ => assert(false)
          }
        }
      }

      test("should handle malformed scoped library names") {
        withTempDir("malformed-scoped") { tempDir =>
          val stdLib = createMockStdLib(tempDir)
          val allSources = IArray.Empty
          val ignored = Set.empty[TsIdentLibrary]

          val resolver = new LibraryResolver(stdLib, allSources, ignored)

          // Test various malformed scoped names
          val malformedNames = List("@", "@scope", "@scope/", "@/name", "@@scope/name")

          malformedNames.foreach { name =>
            val result = resolver.library(TsIdentLibrary(name))
            result match {
              case NotAvailable(_) => // Expected
              case _ => assert(false)
            }
          }
        }
      }
    }
  }
}