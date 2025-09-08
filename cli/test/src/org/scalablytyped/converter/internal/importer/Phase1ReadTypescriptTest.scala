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

  def createMockScope(declarations: TsContainerOrDecl*): TsTreeScope.Root = {
    TsTreeScope(
      libName = TsIdentLibrary("test-lib"),
      pedantic = false,
      deps = Map.empty,
      logger = Logger.DevNull
    )
  }

  def tests = Tests {
    test("Pipeline Object Tests") {
      test("should return non-empty list of transformations") {
        val scope              = createMockScope()
        val libName            = TsIdentLibrary("test-lib")
        val expandTypeMappings = Selection.All[TsIdentLibrary]
        val involvesReact      = false

        val pipeline = Phase1ReadTypescript.Pipeline(scope, libName, expandTypeMappings, involvesReact)

        assert(pipeline.nonEmpty)
        assert(pipeline.length > 10) // Should have many transformation steps
      }

      test("should handle React libraries differently") {
        val scope              = createMockScope()
        val libName            = TsIdentLibrary("test-lib")
        val expandTypeMappings = Selection.All[TsIdentLibrary]

        val nonReactPipeline = Phase1ReadTypescript.Pipeline(scope, libName, expandTypeMappings, involvesReact = false)
        val reactPipeline    = Phase1ReadTypescript.Pipeline(scope, libName, expandTypeMappings, involvesReact = true)

        assert(nonReactPipeline.length == reactPipeline.length)
        // Both should have same number of steps but different behavior in ExtractClasses step
      }

      test("should handle expandTypeMappings selection") {
        val scope         = createMockScope()
        val libName       = TsIdentLibrary("test-lib")
        val involvesReact = false

        val expandAllPipeline =
          Phase1ReadTypescript.Pipeline(scope, libName, Selection.All[TsIdentLibrary], involvesReact)
        val expandNonePipeline =
          Phase1ReadTypescript.Pipeline(scope, libName, Selection.None[TsIdentLibrary], involvesReact)

        assert(expandAllPipeline.length == expandNonePipeline.length)
        // Should have same number of steps but different behavior in ExpandTypeMappings steps
      }

      test("should handle different library names") {
        val scope              = createMockScope()
        val expandTypeMappings = Selection.All[TsIdentLibrary]
        val involvesReact      = false

        val stdPipeline = Phase1ReadTypescript.Pipeline(scope, TsIdentLibrary("std"), expandTypeMappings, involvesReact)
        val reactPipeline =
          Phase1ReadTypescript.Pipeline(scope, TsIdentLibrary("react"), expandTypeMappings, involvesReact)
        val customPipeline =
          Phase1ReadTypescript.Pipeline(scope, TsIdentLibrary("custom-lib"), expandTypeMappings, involvesReact)

        assert(stdPipeline.length == reactPipeline.length)
        assert(reactPipeline.length == customPipeline.length)
        // All should have same number of steps
      }
    }

    test("Pipeline Execution Tests") {
      test("should execute pipeline on simple parsed file") {
        val scope              = createMockScope()
        val libName            = TsIdentLibrary("test-lib")
        val expandTypeMappings = Selection.All[TsIdentLibrary]
        val involvesReact      = false

        val inputFile = TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray(
            TsDeclVar(
              comments = NoComments,
              declared = false,
              readOnly = false,
              name = TsIdentSimple("testVar"),
              tpe = Some(TsTypeRef.string),
              expr = Some(TsExpr.Literal(TsLiteral.Str("test"))),
              jsLocation = JsLocation.Global(TsQIdent.empty),
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            )
          ),
          codePath = CodePath.HasPath(libName, TsQIdent.empty)
        )

        val pipeline = Phase1ReadTypescript.Pipeline(scope, libName, expandTypeMappings, involvesReact)
        val result   = pipeline.foldLeft(inputFile) { case (acc, f) => f(acc) }

        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
        assert(result.members.nonEmpty)
      }

      test("should execute pipeline on complex parsed file with interfaces") {
        val scope              = createMockScope()
        val libName            = TsIdentLibrary("test-lib")
        val expandTypeMappings = Selection.All[TsIdentLibrary]
        val involvesReact      = false

        val inputFile = TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray(
            TsDeclInterface(
              comments = NoComments,
              declared = false,
              name = TsIdentSimple("TestInterface"),
              tparams = IArray.Empty,
              inheritance = IArray.Empty,
              members = IArray(
                TsMemberProperty(
                  comments = NoComments,
                  level = TsProtectionLevel.Default,
                  name = TsIdentSimple("prop"),
                  tpe = Some(TsTypeRef.string),
                  expr = None,
                  isStatic = false,
                  isReadOnly = false
                )
              ),
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            )
          ),
          codePath = CodePath.HasPath(libName, TsQIdent.empty)
        )

        val pipeline = Phase1ReadTypescript.Pipeline(scope, libName, expandTypeMappings, involvesReact)
        val result   = pipeline.foldLeft(inputFile) { case (acc, f) => f(acc) }

        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
        assert(result.members.nonEmpty)
      }

      test("should execute pipeline on file with classes") {
        val scope              = createMockScope()
        val libName            = TsIdentLibrary("test-lib")
        val expandTypeMappings = Selection.All[TsIdentLibrary]
        val involvesReact      = false

        val inputFile = TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray(
            TsDeclClass(
              comments = NoComments,
              declared = false,
              isAbstract = false,
              name = TsIdentSimple("TestClass"),
              tparams = IArray.Empty,
              parent = None,
              implements = IArray.Empty,
              members = IArray(
                TsMemberFunction(
                  comments = NoComments,
                  level = TsProtectionLevel.Default,
                  name = TsIdentSimple("method"),
                  methodType = MethodType.Normal,
                  signature = TsFunSig(
                    comments = NoComments,
                    tparams = IArray.Empty,
                    params = IArray.Empty,
                    resultType = Some(TsTypeRef.void)
                  ),
                  isStatic = false,
                  isReadOnly = false
                )
              ),
              jsLocation = JsLocation.Global(TsQIdent.empty),
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            )
          ),
          codePath = CodePath.HasPath(libName, TsQIdent.empty)
        )

        val pipeline = Phase1ReadTypescript.Pipeline(scope, libName, expandTypeMappings, involvesReact)
        val result   = pipeline.foldLeft(inputFile) { case (acc, f) => f(acc) }

        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
        assert(result.members.nonEmpty)
      }
    }

    test("Pipeline Edge Cases and Error Handling") {
      test("should handle empty parsed file") {
        val scope              = createMockScope()
        val libName            = TsIdentLibrary("test-lib")
        val expandTypeMappings = Selection.All[TsIdentLibrary]
        val involvesReact      = false

        val emptyFile = TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray.Empty,
          codePath = CodePath.HasPath(libName, TsQIdent.empty)
        )

        val pipeline = Phase1ReadTypescript.Pipeline(scope, libName, expandTypeMappings, involvesReact)
        val result   = pipeline.foldLeft(emptyFile) { case (acc, f) => f(acc) }

        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
        assert(result.members.isEmpty)
      }

      test("should handle file with complex type hierarchies") {
        val scope              = createMockScope()
        val libName            = TsIdentLibrary("test-lib")
        val expandTypeMappings = Selection.All[TsIdentLibrary]
        val involvesReact      = false

        val complexFile = TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray(
            TsDeclInterface(
              comments = NoComments,
              declared = false,
              name = TsIdentSimple("BaseInterface"),
              tparams = IArray.Empty,
              inheritance = IArray.Empty,
              members = IArray.Empty,
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            ),
            TsDeclInterface(
              comments = NoComments,
              declared = false,
              name = TsIdentSimple("DerivedInterface"),
              tparams = IArray.Empty,
              inheritance =
                IArray(TsTypeRef(NoComments, TsQIdent(IArray(TsIdentSimple("BaseInterface"))), IArray.Empty)),
              members = IArray.Empty,
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            ),
            TsDeclClass(
              comments = NoComments,
              declared = false,
              isAbstract = false,
              name = TsIdentSimple("ConcreteClass"),
              tparams = IArray.Empty,
              parent = None,
              implements =
                IArray(TsTypeRef(NoComments, TsQIdent(IArray(TsIdentSimple("DerivedInterface"))), IArray.Empty)),
              members = IArray.Empty,
              jsLocation = JsLocation.Global(TsQIdent.empty),
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            )
          ),
          codePath = CodePath.HasPath(libName, TsQIdent.empty)
        )

        val pipeline             = Phase1ReadTypescript.Pipeline(scope, libName, expandTypeMappings, involvesReact)
        val result: TsParsedFile = pipeline.foldLeft(complexFile) { case (acc, f) => f(acc) }

        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
        assert(result.members.nonEmpty)
      }

      test("should handle file with type aliases and enums") {
        val scope              = createMockScope()
        val libName            = TsIdentLibrary("test-lib")
        val expandTypeMappings = Selection.All[TsIdentLibrary]
        val involvesReact      = false

        val typeFile = TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray(
            TsDeclTypeAlias(
              comments = NoComments,
              declared = false,
              name = TsIdentSimple("StringAlias"),
              tparams = IArray.Empty,
              alias = TsTypeRef.string,
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            ),
            TsDeclEnum(
              comments = NoComments,
              declared = false,
              isConst = false,
              name = TsIdentSimple("TestEnum"),
              members = IArray(
                TsEnumMember(
                  comments = NoComments,
                  name = TsIdentSimple("VALUE1"),
                  expr = Some(TsExpr.Literal(TsLiteral.Str("value1")))
                )
              ),
              isValue = true,
              exportedFrom = None,
              jsLocation = JsLocation.Global(TsQIdent.empty),
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            )
          ),
          codePath = CodePath.HasPath(libName, TsQIdent.empty)
        )

        val pipeline = Phase1ReadTypescript.Pipeline(scope, libName, expandTypeMappings, involvesReact)
        val result   = pipeline.foldLeft(typeFile) { case (acc, f) => f(acc) }

        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
        assert(result.members.nonEmpty)
      }

      test("should handle file with modules and namespaces") {
        val scope              = createMockScope()
        val libName            = TsIdentLibrary("test-lib")
        val expandTypeMappings = Selection.All[TsIdentLibrary]
        val involvesReact      = false

        val moduleFile = TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray(
            TsDeclNamespace(
              comments = NoComments,
              declared = false,
              name = TsIdentSimple("TestNamespace"),
              members = IArray(
                TsDeclVar(
                  comments = NoComments,
                  declared = false,
                  readOnly = false,
                  name = TsIdentSimple("namespaceVar"),
                  tpe = Some(TsTypeRef.string),
                  expr = Some(TsExpr.Literal(TsLiteral.Str("test"))),
                  jsLocation = JsLocation.Global(TsQIdent.empty),
                  codePath = CodePath.HasPath(libName, TsQIdent.empty)
                )
              ),
              jsLocation = JsLocation.Global(TsQIdent.empty),
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            ),
            TsDeclModule(
              comments = NoComments,
              declared = false,
              name = TsIdentModule(None, List("test-module")),
              members = IArray.Empty,
              jsLocation = JsLocation.Global(TsQIdent.empty),
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            )
          ),
          codePath = CodePath.HasPath(libName, TsQIdent.empty)
        )

        val pipeline             = Phase1ReadTypescript.Pipeline(scope, libName, expandTypeMappings, involvesReact)
        val result: TsParsedFile = pipeline.foldLeft(moduleFile) { case (acc, f) => f(acc) }

        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
        assert(result.members.nonEmpty)
      }
    }

    test("Pipeline Configuration Variations") {
      test("should handle different scope configurations") {
        val libName            = TsIdentLibrary("test-lib")
        val expandTypeMappings = Selection.All[TsIdentLibrary]
        val involvesReact      = false

        val inputFile = TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray(
            TsDeclVar(
              comments = NoComments,
              declared = false,
              readOnly = false,
              name = TsIdentSimple("testVar"),
              tpe = Some(TsTypeRef.string),
              expr = Some(TsExpr.Literal(TsLiteral.Str("test"))),
              jsLocation = JsLocation.Global(TsQIdent.empty),
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            )
          ),
          codePath = CodePath.HasPath(libName, TsQIdent.empty)
        )

        // Test with pedantic scope
        val pedanticScope = TsTreeScope(
          libName = libName,
          pedantic = true,
          deps = Map.empty,
          logger = Logger.DevNull
        )
        val pedanticPipeline = Phase1ReadTypescript.Pipeline(pedanticScope, libName, expandTypeMappings, involvesReact)
        val pedanticResult   = pedanticPipeline.foldLeft(inputFile) { case (acc, f) => f(acc) }

        // Test with non-pedantic scope
        val nonPedanticScope = TsTreeScope(
          libName = libName,
          pedantic = false,
          deps = Map.empty,
          logger = Logger.DevNull
        )
        val nonPedanticPipeline =
          Phase1ReadTypescript.Pipeline(nonPedanticScope, libName, expandTypeMappings, involvesReact)
        val nonPedanticResult = nonPedanticPipeline.foldLeft(inputFile) { case (acc, f) => f(acc) }

        assert(pedanticResult != null)
        assert(nonPedanticResult != null)
        assert(pedanticResult.isInstanceOf[TsParsedFile])
        assert(nonPedanticResult.isInstanceOf[TsParsedFile])
      }

      test("should handle Selection.Only for expandTypeMappings") {
        val scope         = createMockScope()
        val libName       = TsIdentLibrary("test-lib")
        val involvesReact = false

        val inputFile = TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray(
            TsDeclTypeAlias(
              comments = NoComments,
              declared = false,
              name = TsIdentSimple("TestAlias"),
              tparams = IArray.Empty,
              alias = TsTypeRef.string,
              codePath = CodePath.HasPath(libName, TsQIdent.empty)
            )
          ),
          codePath = CodePath.HasPath(libName, TsQIdent.empty)
        )

        val onlySelection = Selection.NoneExcept(libName)
        val pipeline      = Phase1ReadTypescript.Pipeline(scope, libName, onlySelection, involvesReact)
        val result        = pipeline.foldLeft(inputFile) { case (acc, f) => f(acc) }

        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
        assert(result.members.nonEmpty)
      }
    }

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

    test("Module Filtering Scenarios") {
      test("should filter modules with ignored prefixes") {
        withTempDir("module-filter-test") { tempDir =>
          val resolver              = createMockLibraryResolver(tempDir)
          val calculateVersion      = new MockCalculateLibraryVersion()
          val ignored               = Set.empty[TsIdentLibrary]
          val ignoredModulePrefixes = Set(List("@types", "ignored"), List("internal"))
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
            case PhaseRes.Ok(_) => // Expected - library itself not ignored, only modules within
            case _              => assert(false)
          }
        }
      }

      test("should handle complex module path patterns") {
        withTempDir("complex-module-test") { tempDir =>
          val resolver              = createMockLibraryResolver(tempDir)
          val calculateVersion      = new MockCalculateLibraryVersion()
          val ignored               = Set.empty[TsIdentLibrary]
          val ignoredModulePrefixes = Set(List("node_modules", "@types"), List("src", "internal"))
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

          val libDir = tempDir / "node_modules" / "complex-lib"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "export const complex = 'test';")

          val source     = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("complex-lib"))
          val getDeps    = createMockGetDeps
          val isCircular = false
          val logger     = Logger.DevNull

          val result = phase.apply(source, source, getDeps, isCircular, logger)

          result match {
            case PhaseRes.Ok(_) => // Expected
            case _              => assert(false)
          }
        }
      }
    }

    test("File Resolution Edge Cases") {
      test("should handle missing files gracefully") {
        withTempDir("missing-files-test") { tempDir =>
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

          val libDir = tempDir / "node_modules" / "missing-files-lib"
          createTestDir(libDir)
          // Intentionally not creating any files

          val source     = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("missing-files-lib"))
          val getDeps    = createMockGetDeps
          val isCircular = false
          val logger     = Logger.DevNull

          val result = phase.apply(source, source, getDeps, isCircular, logger)

          result match {
            case PhaseRes.Ignore() => // Expected when no files found
            case _                 => assert(false)
          }
        }
      }

      test("should handle invalid paths") {
        withTempDir("invalid-paths-test") { tempDir =>
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

          val invalidDir = tempDir / "nonexistent" / "invalid-lib"
          // Not creating the directory

          val source     = LibTsSource.FromFolder(InFolder(invalidDir), TsIdentLibrary("invalid-lib"))
          val getDeps    = createMockGetDeps
          val isCircular = false
          val logger     = Logger.DevNull

          // The actual implementation throws an exception for invalid paths
          try {
            val result = phase.apply(source, source, getDeps, isCircular, logger)
            assert(false) // Should not reach here
          } catch {
            case _: java.nio.file.NoSuchFileException => // Expected for invalid paths
            case _: Exception                         => // Other exceptions are also acceptable for invalid paths
          }
        }
      }
    }

    test("Parser Integration") {
      test("should handle malformed TypeScript input") {
        withTempDir("malformed-input-test") { tempDir =>
          val resolver              = createMockLibraryResolver(tempDir)
          val calculateVersion      = new MockCalculateLibraryVersion()
          val ignored               = Set.empty[TsIdentLibrary]
          val ignoredModulePrefixes = Set.empty[List[String]]
          val pedantic              = false

          // Create a parser that fails on malformed input
          val failingParser: InFile => Either[String, TsParsedFile] = { _ =>
            Left("Parse error: Unexpected token")
          }

          val expandTypeMappings = Selection.All[TsIdentLibrary]

          val phase = new Phase1ReadTypescript(
            resolver,
            calculateVersion,
            ignored,
            ignoredModulePrefixes,
            pedantic,
            failingParser,
            expandTypeMappings
          )

          val libDir = tempDir / "node_modules" / "malformed-lib"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "invalid typescript syntax !!!")

          val source     = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("malformed-lib"))
          val getDeps    = createMockGetDeps
          val isCircular = false
          val logger     = Logger.DevNull

          // The actual implementation throws a fatal error for parsing failures
          try {
            phase.apply(source, source, getDeps, isCircular, logger)
            assert(false) // Should not reach here
          } catch {
            case _: org.scalablytyped.converter.internal.logging.Logger.LoggedException => // Expected for parse failures
            case _: Exception => // Other exceptions are also acceptable for parse failures
          }
        }
      }

      test("should handle complex TypeScript syntax") {
        withTempDir("complex-syntax-test") { tempDir =>
          val resolver              = createMockLibraryResolver(tempDir)
          val calculateVersion      = new MockCalculateLibraryVersion()
          val ignored               = Set.empty[TsIdentLibrary]
          val ignoredModulePrefixes = Set.empty[List[String]]
          val pedantic              = false

          // Create a parser that handles complex syntax
          val complexParser: InFile => Either[String, TsParsedFile] = { _ =>
            Right(
              TsParsedFile(
                comments = NoComments,
                directives = IArray.Empty,
                members = IArray(
                  TsDeclInterface(
                    comments = NoComments,
                    declared = false,
                    name = TsIdentSimple("ComplexInterface"),
                    tparams = IArray.Empty,
                    inheritance = IArray.Empty,
                    members = IArray(
                      TsMemberProperty(
                        comments = NoComments,
                        level = TsProtectionLevel.Default,
                        name = TsIdentSimple("prop"),
                        tpe = Some(TsTypeRef.string),
                        expr = None,
                        isStatic = false,
                        isReadOnly = false
                      )
                    ),
                    codePath = CodePath.NoPath
                  )
                ),
                codePath = CodePath.NoPath
              )
            )
          }

          val expandTypeMappings = Selection.All[TsIdentLibrary]

          val phase = new Phase1ReadTypescript(
            resolver,
            calculateVersion,
            ignored,
            ignoredModulePrefixes,
            pedantic,
            complexParser,
            expandTypeMappings
          )

          val libDir = tempDir / "node_modules" / "complex-lib"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "interface ComplexInterface { prop: string; }")

          val source     = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("complex-lib"))
          val getDeps    = createMockGetDeps
          val isCircular = false
          val logger     = Logger.DevNull

          val result = phase.apply(source, source, getDeps, isCircular, logger)

          result match {
            case PhaseRes.Ok(_) => // Expected for successful complex parsing
            case _              => assert(false)
          }
        }
      }
    }

    test("Dependency Resolution") {
      test("should handle dependency resolution failures") {
        withTempDir("deps-failure-test") { tempDir =>
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

          val libDir = tempDir / "node_modules" / "deps-fail-lib"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "export const test = 'value';")

          val source = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("deps-fail-lib"))

          // Create a getDeps that fails
          val failingGetDeps: GetDeps[LibTsSource, LibTs] = { _ =>
            PhaseRes.Failure(SortedMap(source -> Right("Dependency resolution failed")))
          }

          val isCircular = false
          val logger     = Logger.DevNull

          val result = phase.apply(source, source, failingGetDeps, isCircular, logger)

          result match {
            case PhaseRes.Failure(_) => // Expected for dependency failures
            case _                   => assert(false)
          }
        }
      }

      test("should handle complex dependency scenarios") {
        withTempDir("complex-deps-test") { tempDir =>
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

          val libDir = tempDir / "node_modules" / "complex-deps-lib"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "export const test = 'value';")

          val source = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("complex-deps-lib"))

          // Create a getDeps that returns complex dependencies
          val complexGetDeps: GetDeps[LibTsSource, LibTs] = { _ =>
            val mockLibTs = LibTs(source)(
              LibraryVersion(isStdLib = false, libraryVersion = Some("1.0.0"), inGit = None),
              TsParsedFile(
                comments = NoComments,
                directives = IArray.Empty,
                members = IArray.Empty,
                codePath = CodePath.NoPath
              ),
              SortedMap.empty
            )
            PhaseRes.Ok(SortedMap(source -> mockLibTs))
          }

          val isCircular = false
          val logger     = Logger.DevNull

          val result = phase.apply(source, source, complexGetDeps, isCircular, logger)

          result match {
            case PhaseRes.Ok(_) => // Expected for successful complex dependencies
            case _              => assert(false)
          }
        }
      }
    }

    test("Configuration Variations") {
      test("should handle pedantic mode") {
        withTempDir("pedantic-test") { tempDir =>
          val resolver              = createMockLibraryResolver(tempDir)
          val calculateVersion      = new MockCalculateLibraryVersion()
          val ignored               = Set.empty[TsIdentLibrary]
          val ignoredModulePrefixes = Set.empty[List[String]]
          val pedantic              = true // Enable pedantic mode
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

          val libDir = tempDir / "node_modules" / "pedantic-lib"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "export const pedantic = 'test';")

          val source     = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("pedantic-lib"))
          val getDeps    = createMockGetDeps
          val isCircular = false
          val logger     = Logger.DevNull

          val result = phase.apply(source, source, getDeps, isCircular, logger)

          result match {
            case PhaseRes.Ok(_) => // Expected - pedantic mode should still process valid libraries
            case _              => assert(false)
          }
        }
      }

      test("should handle different expandTypeMappings configurations") {
        withTempDir("expand-mappings-test") { tempDir =>
          val resolver              = createMockLibraryResolver(tempDir)
          val calculateVersion      = new MockCalculateLibraryVersion()
          val ignored               = Set.empty[TsIdentLibrary]
          val ignoredModulePrefixes = Set.empty[List[String]]
          val pedantic              = false
          val parser                = createMockParser()
          val expandTypeMappings    = Selection.None[TsIdentLibrary] // Different configuration

          val phase = new Phase1ReadTypescript(
            resolver,
            calculateVersion,
            ignored,
            ignoredModulePrefixes,
            pedantic,
            parser,
            expandTypeMappings
          )

          val libDir = tempDir / "node_modules" / "no-expand-lib"
          createTestDir(libDir)
          createTestFile(libDir / "index.d.ts", "export const noExpand = 'test';")

          val source     = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrary("no-expand-lib"))
          val getDeps    = createMockGetDeps
          val isCircular = false
          val logger     = Logger.DevNull

          val result = phase.apply(source, source, getDeps, isCircular, logger)

          result match {
            case PhaseRes.Ok(_) => // Expected - should work with different expand mappings
            case _              => assert(false)
          }
        }
      }
    }
  }
}
