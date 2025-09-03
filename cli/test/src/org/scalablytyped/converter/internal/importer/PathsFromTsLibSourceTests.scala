package org.scalablytyped.converter.internal.importer

import org.scalablytyped.converter.internal.{IArray, InFile, InFolder}
import utest.*

object PathsFromTsLibSourceTests extends TestSuite {
  
  // Helper methods for test setup and cleanup
  def withTempDir[T](testName: String)(test: os.Path => T): T = {
    val tempDir = os.temp.dir(prefix = s"paths-from-ts-lib-source-test-$testName-")
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
    test("filesFrom method") {
      test("should return empty array for empty directory") {
        withTempDir("empty") { tempDir =>
          val emptyDir = tempDir / "empty"
          createTestDir(emptyDir)
          
          val folder = InFolder(emptyDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.isEmpty)
          assert(result.length == 0)
        }
      }

      test("should find .d.ts files in root directory") {
        withTempDir("root-dts") { tempDir =>
          createTestFile(tempDir / "index.d.ts", "export declare const test: string;")
          createTestFile(tempDir / "types.d.ts", "export interface TestInterface {}")
          createTestFile(tempDir / "utils.d.ts", "export declare function util(): void;")
          
          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.length == 3)
          
          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.forall(_.endsWith(".d.ts")))
          assert(filePaths.exists(_.endsWith("index.d.ts")))
          assert(filePaths.exists(_.endsWith("types.d.ts")))
          assert(filePaths.exists(_.endsWith("utils.d.ts")))
        }
      }

      test("should find .d.ts files in subdirectories") {
        withTempDir("subdirs") { tempDir =>
          createTestFile(tempDir / "src" / "index.d.ts", "export declare const main: string;")
          createTestFile(tempDir / "lib" / "utils.d.ts", "export declare function helper(): void;")
          createTestFile(tempDir / "types" / "interfaces.d.ts", "export interface Config {}")
          
          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.length == 3)
          
          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.forall(_.endsWith(".d.ts")))
          assert(filePaths.exists(_.contains("src")))
          assert(filePaths.exists(_.contains("lib")))
          assert(filePaths.exists(_.contains("types")))
        }
      }

      test("should ignore non-.d.ts files") {
        withTempDir("mixed-files") { tempDir =>
          createTestFile(tempDir / "index.d.ts", "export declare const test: string;")
          createTestFile(tempDir / "index.ts", "export const test = 'value';")
          createTestFile(tempDir / "index.js", "export const test = 'value';")
          createTestFile(tempDir / "README.md", "# Test Library")
          createTestFile(tempDir / "package.json", "{\"name\": \"test\"}")
          
          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.length == 1)
          assert(result.head.path.toString.endsWith("index.d.ts"))
        }
      }

      test("should skip node_modules directories") {
        withTempDir("node-modules") { tempDir =>
          createTestFile(tempDir / "index.d.ts", "export declare const main: string;")
          createTestFile(tempDir / "node_modules" / "lodash" / "index.d.ts", "export declare const _: any;")
          createTestFile(tempDir / "node_modules" / "react" / "index.d.ts", "export declare const React: any;")
          
          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.length == 1)
          assert(result.head.path.toString.endsWith("index.d.ts"))
          assert(!result.head.path.toString.contains("node_modules"))
        }
      }

      test("should skip amd directories") {
        withTempDir("amd") { tempDir =>
          createTestFile(tempDir / "index.d.ts", "export declare const main: string;")
          createTestFile(tempDir / "amd" / "module.d.ts", "declare module 'amd-module' {}")
          createTestFile(tempDir / "normal" / "file.d.ts", "export declare const normal: string;")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          // Should find files in root and normal directory, but not in amd directory
          assert(result.length == 2)

          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.exists(_.endsWith("index.d.ts")))
          assert(filePaths.exists(_.endsWith("normal/file.d.ts")))
          assert(!filePaths.exists(_.contains("/amd/")))
        }
      }

      test("should skip umd directories") {
        withTempDir("umd") { tempDir =>
          createTestFile(tempDir / "index.d.ts", "export declare const main: string;")
          createTestFile(tempDir / "umd" / "module.d.ts", "declare module 'umd-module' {}")
          createTestFile(tempDir / "normal" / "file.d.ts", "export declare const normal: string;")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          // Should find files in root and normal directory, but not in umd directory
          assert(result.length == 2)

          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.exists(_.endsWith("index.d.ts")))
          assert(filePaths.exists(_.endsWith("normal/file.d.ts")))
          assert(!filePaths.exists(_.contains("/umd/")))
        }
      }

      test("should skip es directories") {
        withTempDir("es") { tempDir =>
          createTestFile(tempDir / "index.d.ts", "export declare const main: string;")
          createTestFile(tempDir / "es" / "module.d.ts", "declare module 'es-module' {}")
          createTestFile(tempDir / "normal" / "file.d.ts", "export declare const normal: string;")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          // Should find files in root and normal directory, but not in es directory
          assert(result.length == 2)

          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.exists(_.endsWith("index.d.ts")))
          assert(filePaths.exists(_.endsWith("normal/file.d.ts")))
          assert(!filePaths.exists(_.contains("/es/")))
        }
      }

      test("should skip es6 directories") {
        withTempDir("es6") { tempDir =>
          createTestFile(tempDir / "index.d.ts", "export declare const main: string;")
          createTestFile(tempDir / "es6" / "module.d.ts", "declare module 'es6-module' {}")
          createTestFile(tempDir / "normal" / "file.d.ts", "export declare const normal: string;")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          // Should find files in root and normal directory, but not in es6 directory
          assert(result.length == 2)

          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.exists(_.endsWith("index.d.ts")))
          assert(filePaths.exists(_.endsWith("normal/file.d.ts")))
          assert(!filePaths.exists(_.contains("/es6/")))
        }
      }

      test("should skip TypeScript version directories (ts pattern)") {
        withTempDir("ts-version") { tempDir =>
          createTestFile(tempDir / "index.d.ts", "export declare const main: string;")
          createTestFile(tempDir / "ts3.8" / "module.d.ts", "declare module 'ts38-module' {}")
          createTestFile(tempDir / "ts4.0" / "module.d.ts", "declare module 'ts40-module' {}")
          createTestFile(tempDir / "ts4.5.2" / "module.d.ts", "declare module 'ts452-module' {}")
          
          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.length == 1)
          assert(result.head.path.toString.endsWith("index.d.ts"))
          assert(!result.head.path.toString.contains("ts3.8"))
          assert(!result.head.path.toString.contains("ts4.0"))
          assert(!result.head.path.toString.contains("ts4.5.2"))
        }
      }

      test("should skip version directories (v pattern)") {
        withTempDir("version") { tempDir =>
          createTestFile(tempDir / "index.d.ts", "export declare const main: string;")
          createTestFile(tempDir / "v1.0" / "module.d.ts", "declare module 'v1-module' {}")
          createTestFile(tempDir / "v2.5.1" / "module.d.ts", "declare module 'v2-module' {}")
          createTestFile(tempDir / "v10.15.3" / "module.d.ts", "declare module 'v10-module' {}")
          
          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.length == 1)
          assert(result.head.path.toString.endsWith("index.d.ts"))
          assert(!result.head.path.toString.contains("v1.0"))
          assert(!result.head.path.toString.contains("v2.5.1"))
          assert(!result.head.path.toString.contains("v10.15.3"))
        }
      }

      test("should filter out .src. files") {
        withTempDir("src-files") { tempDir =>
          createTestFile(tempDir / "index.d.ts", "export declare const main: string;")
          createTestFile(tempDir / "highlight.src.d.ts", "declare module 'highlight-src' {}")
          createTestFile(tempDir / "utils.src.d.ts", "declare module 'utils-src' {}")
          createTestFile(tempDir / "normal.d.ts", "export declare const normal: string;")
          
          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.length == 2)
          
          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.forall(_.endsWith(".d.ts")))
          assert(filePaths.exists(_.endsWith("index.d.ts")))
          assert(filePaths.exists(_.endsWith("normal.d.ts")))
          assert(!filePaths.exists(_.contains(".src.")))
        }
      }

      test("should handle complex directory structure with multiple skip patterns") {
        withTempDir("complex") { tempDir =>
          // Valid files
          createTestFile(tempDir / "index.d.ts", "export declare const main: string;")
          createTestFile(tempDir / "src" / "types.d.ts", "export interface Config {}")
          createTestFile(tempDir / "lib" / "utils.d.ts", "export declare function helper(): void;")
          
          // Files that should be skipped
          createTestFile(tempDir / "node_modules" / "lodash" / "index.d.ts", "export declare const _: any;")
          createTestFile(tempDir / "amd" / "module.d.ts", "declare module 'amd-module' {}")
          createTestFile(tempDir / "umd" / "module.d.ts", "declare module 'umd-module' {}")
          createTestFile(tempDir / "es" / "module.d.ts", "declare module 'es-module' {}")
          createTestFile(tempDir / "es6" / "module.d.ts", "declare module 'es6-module' {}")
          createTestFile(tempDir / "ts4.0" / "module.d.ts", "declare module 'ts40-module' {}")
          createTestFile(tempDir / "v2.0" / "module.d.ts", "declare module 'v2-module' {}")
          createTestFile(tempDir / "highlight.src.d.ts", "declare module 'highlight-src' {}")
          
          // Non-.d.ts files
          createTestFile(tempDir / "index.ts", "export const test = 'value';")
          createTestFile(tempDir / "package.json", "{\"name\": \"test\"}")
          
          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.length == 3)
          
          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.forall(_.endsWith(".d.ts")))
          assert(filePaths.exists(_.endsWith("index.d.ts")))
          assert(filePaths.exists(path => path.contains("src") && path.endsWith("types.d.ts")))
          assert(filePaths.exists(path => path.contains("lib") && path.endsWith("utils.d.ts")))
          
          // Verify none of the skipped patterns are included
          assert(!filePaths.exists(_.contains("node_modules")))
          assert(!filePaths.exists(_.contains("/amd/")))
          assert(!filePaths.exists(_.contains("/umd/")))
          assert(!filePaths.exists(_.contains("/es/")))
          assert(!filePaths.exists(_.contains("/es6/")))
          assert(!filePaths.exists(_.contains("/ts4.0/")))
          assert(!filePaths.exists(_.contains("/v2.0/")))
          assert(!filePaths.exists(_.contains(".src.")))
        }
      }

      test("should return InFile instances with correct paths") {
        withTempDir("infile-paths") { tempDir =>
          createTestFile(tempDir / "test.d.ts", "export declare const test: string;")
          
          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.length == 1)
          
          val inFile = result.head
          assert(inFile.isInstanceOf[InFile])
          assert(inFile.path.toString.endsWith("test.d.ts"))
          assert(inFile.folder.path.toString == tempDir.toString)
        }
      }

      test("should handle deeply nested directory structures") {
        withTempDir("deep-nested") { tempDir =>
          createTestFile(tempDir / "a" / "b" / "c" / "d" / "e" / "deep.d.ts", "export declare const deep: string;")
          createTestFile(tempDir / "x" / "y" / "z" / "nested.d.ts", "export declare const nested: string;")
          
          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)
          
          assert(result.length == 2)
          
          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.exists(_.endsWith("deep.d.ts")))
          assert(filePaths.exists(_.endsWith("nested.d.ts")))
        }
      }
    }

    test("Regex patterns") {
      test("V regex should match version patterns") {
        val vRegex = PathsFromTsLibSource.V

        assert(vRegex.matches("v1.0"))
        assert(vRegex.matches("v2.5.1"))
        assert(vRegex.matches("v10.15.3"))
        assert(vRegex.matches("v0.1"))

        assert(!vRegex.matches("version"))
        assert(!vRegex.matches("v"))
        assert(!vRegex.matches("1.0"))
        assert(!vRegex.matches("ver1.0"))
      }

      test("TS regex should match TypeScript version patterns") {
        val tsRegex = PathsFromTsLibSource.TS

        assert(tsRegex.matches("ts3.8"))
        assert(tsRegex.matches("ts4.0"))
        assert(tsRegex.matches("ts4.5.2"))
        assert(tsRegex.matches("ts2.1"))

        assert(!tsRegex.matches("typescript"))
        assert(!tsRegex.matches("ts"))
        assert(!tsRegex.matches("3.8"))
        assert(!tsRegex.matches("tsc4.0"))
      }
    }

    test("Edge cases and boundary conditions") {
      test("should handle directory with only non-.d.ts files") {
        withTempDir("no-dts") { tempDir =>
          createTestFile(tempDir / "index.ts", "export const test = 'value';")
          createTestFile(tempDir / "utils.js", "export const util = () => {};")
          createTestFile(tempDir / "README.md", "# Test")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          assert(result.isEmpty)
        }
      }

      test("should handle directory with only skipped subdirectories") {
        withTempDir("only-skipped") { tempDir =>
          createTestFile(tempDir / "node_modules" / "test" / "index.d.ts", "export declare const test: string;")
          createTestFile(tempDir / "amd" / "module.d.ts", "declare module 'amd' {}")
          createTestFile(tempDir / "v1.0" / "old.d.ts", "export declare const old: string;")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          assert(result.isEmpty)
        }
      }

      test("should handle directory with only .src. files") {
        withTempDir("only-src") { tempDir =>
          createTestFile(tempDir / "highlight.src.d.ts", "declare module 'highlight' {}")
          createTestFile(tempDir / "utils.src.d.ts", "declare module 'utils' {}")
          createTestFile(tempDir / "main.src.d.ts", "declare module 'main' {}")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          assert(result.isEmpty)
        }
      }

      test("should handle files with .d.ts in the middle of filename") {
        withTempDir("dts-middle") { tempDir =>
          createTestFile(tempDir / "test.d.ts.backup", "backup file")
          createTestFile(tempDir / "valid.d.ts", "export declare const valid: string;")
          createTestFile(tempDir / "another.d.ts.old", "old file")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          assert(result.length == 1)
          assert(result.head.path.toString.endsWith("valid.d.ts"))
        }
      }

      test("should handle symbolic links and special files") {
        withTempDir("special-files") { tempDir =>
          createTestFile(tempDir / "normal.d.ts", "export declare const normal: string;")

          // Create a directory that looks like a file
          createTestDir(tempDir / "fake-file.d.ts")
          createTestFile(tempDir / "fake-file.d.ts" / "content.txt", "not a .d.ts file")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          assert(result.length == 1)
          assert(result.head.path.toString.endsWith("normal.d.ts"))
        }
      }

      test("should handle very long file paths") {
        withTempDir("long-paths") { tempDir =>
          val longPath = (1 to 10).map(i => s"very-long-directory-name-$i").mkString("/")
          createTestFile(tempDir / os.RelPath(longPath) / "deep.d.ts", "export declare const deep: string;")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          assert(result.length == 1)
          assert(result.head.path.toString.endsWith("deep.d.ts"))
        }
      }

      test("should handle files with special characters in names") {
        withTempDir("special-chars") { tempDir =>
          createTestFile(tempDir / "test-file.d.ts", "export declare const test: string;")
          createTestFile(tempDir / "test_file.d.ts", "export declare const test2: string;")
          createTestFile(tempDir / "test.file.d.ts", "export declare const test3: string;")
          createTestFile(tempDir / "test@file.d.ts", "export declare const test4: string;")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          assert(result.length == 4)

          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.exists(_.endsWith("test-file.d.ts")))
          assert(filePaths.exists(_.endsWith("test_file.d.ts")))
          assert(filePaths.exists(_.endsWith("test.file.d.ts")))
          assert(filePaths.exists(_.endsWith("test@file.d.ts")))
        }
      }

      test("should handle file extension case sensitivity correctly") {
        withTempDir("case-sensitive") { tempDir =>
          createTestFile(tempDir / "Test.d.ts", "export declare const Test: string;")
          createTestFile(tempDir / "another.d.ts", "export declare const another: string;")
          createTestFile(tempDir / "wrongext.D.TS", "not a valid .d.ts file")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          // Only files ending with lowercase ".d.ts" should be included
          assert(result.length == 2)

          val filePaths = result.map(_.path.toString).toList.sorted
          assert(filePaths.exists(_.endsWith("Test.d.ts")))
          assert(filePaths.exists(_.endsWith("another.d.ts")))
          assert(!filePaths.exists(_.endsWith("wrongext.D.TS")))
        }
      }

      test("should handle mixed skip patterns in same directory tree") {
        withTempDir("mixed-skip") { tempDir =>
          createTestFile(tempDir / "valid.d.ts", "export declare const valid: string;")
          createTestFile(tempDir / "node_modules" / "v1.0" / "test.d.ts", "should be skipped")
          createTestFile(tempDir / "amd" / "ts4.0" / "test.d.ts", "should be skipped")
          createTestFile(tempDir / "es" / "umd" / "test.d.ts", "should be skipped")
          createTestFile(tempDir / "normal" / "es6" / "test.d.ts", "should be skipped")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          assert(result.length == 1)
          assert(result.head.path.toString.endsWith("valid.d.ts"))
        }
      }
    }

    test("Performance and stress tests") {
      test("should handle large number of files efficiently") {
        withTempDir("many-files") { tempDir =>
          // Create 100 .d.ts files
          (1 to 100).foreach { i =>
            createTestFile(tempDir / s"file$i.d.ts", s"export declare const file$i: string;")
          }

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          assert(result.length == 100)

          // Verify all files are included
          val fileNumbers = result.toList
            .map(_.path.toString)
            .map(_.split("/").last)
            .map(_.replace("file", "").replace(".d.ts", ""))
            .map(_.toInt)
            .sorted

          assert(fileNumbers == (1 to 100).toList)
        }
      }

      test("should handle deep directory nesting efficiently") {
        withTempDir("deep-nesting") { tempDir =>
          // Create a 20-level deep directory structure
          val deepPath = (1 to 20).map(i => s"level$i").mkString("/")
          createTestFile(tempDir / os.RelPath(deepPath) / "deep.d.ts", "export declare const deep: string;")

          val folder = InFolder(tempDir)
          val result = PathsFromTsLibSource.filesFrom(folder)

          assert(result.length == 1)
          assert(result.head.path.toString.endsWith("deep.d.ts"))
        }
      }
    }
  }
}