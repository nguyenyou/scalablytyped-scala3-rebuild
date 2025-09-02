package org.scalablytyped.converter.internal.importer

import org.scalablytyped.converter.internal.{IArray, InFolder}
import org.scalablytyped.converter.internal.importer.LibTsSource.FromFolder
import org.scalablytyped.converter.internal.ts.{TsIdentLibrarySimple, TsIdentLibraryScoped}
import utest.*


object BootstrapTests extends TestSuite {
  // Helper methods for test setup and cleanup
  def withTempDir[T](testName: String)(test: os.Path => T): T = {
    val tempDir = os.temp.dir(prefix = s"bootstrap-test-$testName-")
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

  def tests = Tests {
    test("forFolder function") {
      test("should handle empty directory") {
        withTempDir("empty") { tempDir =>
          val emptyDir = tempDir / "empty"
          createTestDir(emptyDir)
          
          val folder = InFolder(emptyDir)
          val result = Bootstrap.forFolder(folder)

          assert(result.isEmpty)
        }
      }

      test("should find simple packages") {
        withTempDir("simple") { tempDir =>
          val nodeModules = tempDir / "node_modules"

          // Create simple package directories with .d.ts files
          val lodashDir = nodeModules / "lodash"
          val reactDir = nodeModules / "react"

          createTestFile(lodashDir / "index.d.ts", "export declare const _: any;")
          createTestFile(reactDir / "index.d.ts", "export declare const React: any;")

          val folder = InFolder(nodeModules)
          val result = Bootstrap.forFolder(folder)
          
          assert(result.length == 2)
          
          val libNames = result.map(_.libName.value).toList.sorted
          assert(libNames == List("lodash", "react"))
        }
      }

      test("should handle scoped packages") {
        withTempDir("scoped") { tempDir =>
          val nodeModules = tempDir / "node_modules"
          
          // Create scoped package directories
          val angularCoreDir = nodeModules / "@angular" / "core"
          val angularCommonDir = nodeModules / "@angular" / "common"
          
          createTestFile(angularCoreDir / "index.d.ts", "export declare const NgModule: any;")
          createTestFile(angularCommonDir / "index.d.ts", "export declare const CommonModule: any;")
          
          val folder = InFolder(nodeModules)
          val result = Bootstrap.forFolder(folder)

          assert(result.length == 2)

          val libNames = result.map(_.libName.value).toList.sorted
          assert(libNames == List("@angular/common", "@angular/core"))

          // Verify they are scoped libraries
          result.foreach { source =>
            assert(source.libName.isInstanceOf[TsIdentLibraryScoped])
          }
        }
      }

      test("should skip @types directories") {
        withTempDir("skip-types") { tempDir =>
          val nodeModules = tempDir / "node_modules"

          // Create @types directory (should be skipped)
          val typesNodeDir = nodeModules / "@types" / "node"
          createTestFile(typesNodeDir / "index.d.ts", "export declare const process: any;")

          // Create regular package
          val lodashDir = nodeModules / "lodash"
          createTestFile(lodashDir / "index.d.ts", "export declare const _: any;")

          val folder = InFolder(nodeModules)
          val result = Bootstrap.forFolder(folder)
          
          assert(result.length == 1)
          assert(result(0).libName.value == "lodash")
        }
      }

      test("should skip packages without TypeScript sources") {
        withTempDir("no-types") { tempDir =>
          val nodeModules = tempDir / "node_modules"
          
          // Create package without .d.ts files
          val packageWithoutTypes = nodeModules / "no-types"
          createTestFile(packageWithoutTypes / "index.js", "module.exports = {};")
          
          // Create package with .d.ts files
          val packageWithTypes = nodeModules / "with-types"
          createTestFile(packageWithTypes / "index.d.ts", "export declare const test: any;")
          
          val folder = InFolder(nodeModules)
          val result = Bootstrap.forFolder(folder)

          assert(result.length == 1)
          assert(result(0).libName.value == "with-types")
        }
      }

      test("should handle mixed simple and scoped packages") {
        withTempDir("mixed") { tempDir =>
          val nodeModules = tempDir / "node_modules"

          // Create simple package
          val lodashDir = nodeModules / "lodash"
          createTestFile(lodashDir / "index.d.ts", "export declare const _: any;")

          // Create scoped package
          val angularCoreDir = nodeModules / "@angular" / "core"
          createTestFile(angularCoreDir / "index.d.ts", "export declare const NgModule: any;")

          // Create @types (should be skipped)
          val typesNodeDir = nodeModules / "@types" / "node"
          createTestFile(typesNodeDir / "index.d.ts", "export declare const process: any;")

          val folder = InFolder(nodeModules)
          val result = Bootstrap.forFolder(folder)
          
          assert(result.length == 2)
          
          val libNames = result.map(_.libName.value).toList.sorted
          assert(libNames == List("@angular/core", "lodash"))
          
          // Verify library types
          val lodashLib = result.find(_.libName.value == "lodash").get
          val angularLib = result.find(_.libName.value == "@angular/core").get
          
          assert(lodashLib.libName.isInstanceOf[TsIdentLibrarySimple])
          assert(angularLib.libName.isInstanceOf[TsIdentLibraryScoped])
        }
      }

      test("should handle directory read errors gracefully") {
        withTempDir("errors") { tempDir =>
          // Test with non-existent directory
          val nonExistentDir = tempDir / "non-existent"
          val folder = InFolder(nonExistentDir)
          val result = Bootstrap.forFolder(folder)
          
          assert(result.isEmpty)
        }
      }
    }
  }
}