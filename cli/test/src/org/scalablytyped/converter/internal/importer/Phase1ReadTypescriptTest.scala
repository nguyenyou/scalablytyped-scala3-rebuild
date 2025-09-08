package org.scalablytyped.converter.internal.importer

import org.scalablytyped.converter.Selection
import org.scalablytyped.converter.internal.{Comments, IArray, InFile, InFolder, LibraryVersion, NoComments}
import org.scalablytyped.converter.internal.logging.Logger
import org.scalablytyped.converter.internal.phases.{GetDeps, PhaseRes}
import org.scalablytyped.converter.internal.ts.*
import utest.*

import scala.collection.immutable.SortedMap

object Phase1ReadTypescriptTest extends TestSuite {

  // Helper methods for test setup
  def withTempDir[T](testName: String)(test: os.Path => T): T = {
    val tempDir = os.temp.dir(prefix = s"phase1-test-$testName-")
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

  // Mock implementations for testing
  class MockCalculateLibraryVersion extends CalculateLibraryVersion {
    override def apply(
        sourceFolder: InFolder,
        isStdLib: Boolean,
        packageJsonOpt: Option[PackageJson],
        comments: Comments
    ): LibraryVersion = {
      LibraryVersion(isStdLib = false, libraryVersion = Some("1.0.0-test"), inGit = None)
    }
  }

  def createMockParser(content: String = "export const test = 'value';"): InFile => Either[String, TsParsedFile] = {
    _ =>
      Right(
        TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray(
            TsDeclVar(
              comments = NoComments,
              declared = false,
              readOnly = false,
              name = TsIdentSimple("test"),
              tpe = Some(TsTypeRef.string),
              expr = Some(TsExpr.Literal(TsLiteral.Str("value"))),
              jsLocation = JsLocation.Global(TsQIdent.empty),
              codePath = CodePath.NoPath
            )
          ),
          codePath = CodePath.NoPath
        )
      )
  }

  def createMockLibraryResolver(tempDir: os.Path): LibraryResolver = {
    val stdLibDir = tempDir / "typescript" / "lib"
    createTestDir(stdLibDir)
    createTestFile(stdLibDir / "lib.d.ts", "declare var console: Console;")

    val stdLibFolder = InFolder(stdLibDir)
    val stdLibFiles  = IArray(InFile(stdLibDir / "lib.d.ts"))
    val stdLib       = LibTsSource.StdLibSource(stdLibFolder, stdLibFiles, TsIdentLibrary("std"))

    new LibraryResolver(stdLib, IArray.Empty, Set.empty)
  }

  def createMockGetDeps: GetDeps[LibTsSource, LibTs] = { _ =>
    PhaseRes.Ok(SortedMap.empty[LibTsSource, LibTs])
  }

  def tests = Tests {
    test("Phase1ReadTypescript Basic Functionality") {
      test("should ignore libraries in ignored set") {
        withTempDir("ignore-test") { tempDir =>
          val resolver              = createMockLibraryResolver(tempDir)
          val calculateVersion      = new MockCalculateLibraryVersion()
          val ignoredLib            = TsIdentLibrary("ignored-lib")
          val ignored               = Set(ignoredLib)
          val ignoredModulePrefixes = Set.empty[List[String]]
          val pedantic              = false
          val parser                = createMockParser()
          val expandTypeMappings    = Selection.All[TsIdentLibrary]

          val phase = new Phase1ReadTypescript(
            resolver,
            calculateVersion,
            ignored,
            ignoredModulePrefixes,
            pedantic,
            parser,
            expandTypeMappings
          )

          val libDir = tempDir / "node_modules" / "ignored-lib"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "export const ignored = 'test';")

          val source     = LibTsSource.FromFolder(InFolder(libDir), ignoredLib)
          val getDeps    = createMockGetDeps
          val isCircular = false
          val logger     = Logger.DevNull

          val result = phase.apply(source, source, getDeps, isCircular, logger)

          result match {
            case PhaseRes.Ignore() => // Expected
            case _                 => assert(false)
          }
        }
      }

      test("should ignore circular dependencies") {
        withTempDir("circular-test") { tempDir =>
          val resolver              = createMockLibraryResolver(tempDir)
          val calculateVersion      = new MockCalculateLibraryVersion()
          val ignored               = Set.empty[TsIdentLibrary]
          val ignoredModulePrefixes = Set.empty[List[String]]
          val pedantic              = false
          val parser                = createMockParser()
          val expandTypeMappings    = Selection.All[TsIdentLibrary]

          val phase = new Phase1ReadTypescript(
            resolver,
            calculateVersion,
            ignored,
            ignoredModulePrefixes,
            pedantic,
            parser,
            expandTypeMappings
          )

          val libDir = tempDir / "node_modules" / "circular-lib"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "export const circular = 'test';")

          val source     = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("circular-lib"))
          val getDeps    = createMockGetDeps
          val isCircular = true // This is the key difference
          val logger     = Logger.DevNull

          val result = phase.apply(source, source, getDeps, isCircular, logger)

          result match {
            case PhaseRes.Ignore() => // Expected for circular dependencies
            case _                 => assert(false)
          }
        }
      }

      test("should process library successfully with valid input") {
        withTempDir("success-test") { tempDir =>
          val resolver              = createMockLibraryResolver(tempDir)
          val calculateVersion      = new MockCalculateLibraryVersion()
          val ignored               = Set.empty[TsIdentLibrary]
          val ignoredModulePrefixes = Set.empty[List[String]]
          val pedantic              = false
          val parser                = createMockParser()
          val expandTypeMappings    = Selection.All[TsIdentLibrary]

          val phase = new Phase1ReadTypescript(
            resolver,
            calculateVersion,
            ignored,
            ignoredModulePrefixes,
            pedantic,
            parser,
            expandTypeMappings
          )

          val libDir = tempDir / "node_modules" / "test-lib"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "export const test = 'value';")

          val source     = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("test-lib"))
          val getDeps    = createMockGetDeps
          val isCircular = false
          val logger     = Logger.DevNull

          val result = phase.apply(source, source, getDeps, isCircular, logger)

          result match {
            case PhaseRes.Ok(_) => // Expected for successful processing
            case _              => assert(false)
          }
        }
      }
    }
  }
}
