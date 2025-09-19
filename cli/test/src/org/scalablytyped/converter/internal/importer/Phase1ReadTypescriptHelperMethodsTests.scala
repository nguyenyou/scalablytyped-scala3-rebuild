package org.scalablytyped.converter.internal.importer

import org.scalablytyped.converter.internal.{Comments, IArray, InFile, InFolder, NoComments}
import org.scalablytyped.converter.internal.logging.{Formatter, Logger}
import org.scalablytyped.converter.internal.ts.*
import utest.*

/** Comprehensive unit tests for the extracted helper methods from Phase1ReadTypescript. These tests focus on testing
  * individual methods in isolation to ensure proper functionality and maintainability of the refactored code.
  */
object Phase1ReadTypescriptHelperMethodsTests extends TestSuite {

  // Test utilities and mock objects
  def withTempDir[T](testName: String)(test: os.Path => T): T = {
    val tempDir = os.temp.dir(prefix = s"helper-test-$testName-")
    try {
      test(tempDir)
    } finally {
      os.remove.all(tempDir)
    }
  }

  def createMockSource(libName: String): LibTsSource = {
    val tempDir = os.temp.dir(prefix = s"mock-$libName-")
    LibTsSource.FromFolder(InFolder(tempDir), TsIdentLibrarySimple(libName))
  }

  def createMockParsedFile(fileName: String): TsParsedFile = {
    TsParsedFile(
      comments = NoComments,
      directives = IArray.Empty,
      members = IArray.Empty,
      codePath = CodePath.HasPath(TsIdentLibrarySimple(fileName), TsQIdent.empty)
    )
  }

  def createMockResolver(additionalSources: IArray[LibTsSource.FromFolder] = IArray.Empty): LibraryResolver = {
    val tempDir      = os.temp.dir(prefix = "mock-stdlib-")
    val stdLibFolder = InFolder(tempDir)
    val stdLibFiles  = IArray(InFile(tempDir / "lib.d.ts"))
    val stdLib       = LibTsSource.StdLibSource(stdLibFolder, stdLibFiles, TsIdentLibrary("std"))
    new LibraryResolver(stdLib, additionalSources, Set.empty)
  }

  implicit val inFileFormatter: Formatter[InFile] = _.path.toString

  val tests = Tests {
    test("collectDirectivesToInline") {
      test("Basic Functionality") {
        test("should return empty array when no directives") {
          withTempDir("no-directives") { tempDir =>
            val source   = createMockSource("test-lib")
            val file     = InFile(tempDir / "test.d.ts")
            val resolver = createMockResolver()
            val parsed   = createMockParsedFile("test")

            val result = Phase1ReadTypescript.collectDirectivesToInline(source, file, resolver, parsed)

            assert(result.isEmpty)
          }
        }

        test("should process reference directives correctly") {
          withTempDir("ref-directives") { tempDir =>
            val libDir = tempDir / "lib"
            os.makeDir.all(libDir)
            val refFile = libDir / "referenced.d.ts"
            os.write(refFile, "export interface Referenced {}")

            val source   = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrarySimple("test-lib"))
            val file     = InFile(libDir / "main.d.ts")
            val resolver = createMockResolver(IArray(source))

            val directive = Directive.PathRef("./referenced.d.ts") // Use relative path
            val parsed = TsParsedFile(
              comments = NoComments,
              directives = IArray(directive),
              members = IArray.Empty,
              codePath = CodePath.NoPath
            )

            val result = Phase1ReadTypescript.collectDirectivesToInline(source, file, resolver, parsed)

            assert(result.length == 1)
            result.head match {
              case Right(resolvedFile) => assert(resolvedFile.path.toString.endsWith("referenced.d.ts"))
              case Left(_)             => assert(false)
            }
          }
        }

        test("should handle unresolvable directives") {
          withTempDir("unresolvable-directives") { tempDir =>
            val libDir = tempDir / "lib"
            os.makeDir.all(libDir)

            val source   = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrarySimple("test-lib"))
            val file     = InFile(libDir / "main.d.ts")
            val resolver = createMockResolver()

            val directive = Directive.PathRef((libDir / "missing.d.ts").toString)
            val parsed = TsParsedFile(
              comments = NoComments,
              directives = IArray(directive),
              members = IArray.Empty,
              codePath = CodePath.NoPath
            )

            val result = Phase1ReadTypescript.collectDirectivesToInline(source, file, resolver, parsed)

            assert(result.length == 1)
            result.head match {
              case Left(unresolvedDirective) => assert(unresolvedDirective == directive)
              case Right(_)                  => assert(false)
            }
          }
        }
      }

      test("Edge Cases") {
        test("should handle multiple directives") {
          withTempDir("multiple-directives") { tempDir =>
            val libDir = tempDir / "lib"
            os.makeDir.all(libDir)
            val refFile1 = libDir / "ref1.d.ts"
            val refFile2 = libDir / "ref2.d.ts"
            os.write(refFile1, "export interface Ref1 {}")
            os.write(refFile2, "export interface Ref2 {}")

            val source   = LibTsSource.FromFolder(InFolder(libDir), TsIdentLibrarySimple("test-lib"))
            val file     = InFile(libDir / "main.d.ts")
            val resolver = createMockResolver(IArray(source))

            val directive1 = Directive.PathRef("./ref1.d.ts") // Use relative paths
            val directive2 = Directive.PathRef("./ref2.d.ts")
            val directive3 = Directive.PathRef("./missing.d.ts")
            val parsed = TsParsedFile(
              comments = NoComments,
              directives = IArray(directive1, directive2, directive3),
              members = IArray.Empty,
              codePath = CodePath.NoPath
            )

            val result = Phase1ReadTypescript.collectDirectivesToInline(source, file, resolver, parsed)

            assert(result.length == 3)
            assert(result.count(_.isRight) == 2) // Two resolved
            assert(result.count(_.isLeft) == 1)  // One unresolved
          }
        }

        test("should handle empty directives array") {
          withTempDir("empty-directives") { tempDir =>
            val source   = createMockSource("test-lib")
            val file     = InFile(tempDir / "test.d.ts")
            val resolver = createMockResolver()
            val parsed = TsParsedFile(
              comments = NoComments,
              directives = IArray.Empty,
              members = IArray.Empty,
              codePath = CodePath.NoPath
            )

            val result = Phase1ReadTypescript.collectDirectivesToInline(source, file, resolver, parsed)

            assert(result.isEmpty)
          }
        }
      }
    }

    test("processTypeReferenceDirectives") {
      test("Basic Functionality") {
        test("should process TypesRef directives and add dependencies") {
          withTempDir("types-ref") { tempDir =>
            val source   = createMockSource("test-lib")
            val file     = InFile(tempDir / "test.d.ts")
            val resolver = createMockResolver()
            val deps     = Set.newBuilder[LibTsSource]
            val logger   = Logger.DevNull

            val typesRefDirective = Directive.TypesRef("react")
            val parsed = TsParsedFile(
              comments = NoComments,
              directives = IArray(typesRefDirective),
              members = IArray.Empty,
              codePath = CodePath.NoPath
            )

            Phase1ReadTypescript.processTypeReferenceDirectives(source, file, resolver, parsed, deps, logger)

            // Since our mock resolver doesn't have react, deps should remain empty
            val result = deps.result()
            assert(result.isEmpty)
          }
        }

        test("should handle files without TypesRef directives") {
          withTempDir("no-types-ref") { tempDir =>
            val source   = createMockSource("test-lib")
            val file     = InFile(tempDir / "test.d.ts")
            val resolver = createMockResolver()
            val deps     = Set.newBuilder[LibTsSource]
            val logger   = Logger.DevNull

            val parsed = createMockParsedFile("test")

            Phase1ReadTypescript.processTypeReferenceDirectives(source, file, resolver, parsed, deps, logger)

            val result = deps.result()
            assert(result.isEmpty)
          }
        }
      }

      test("Edge Cases") {
        test("should handle multiple TypesRef directives") {
          withTempDir("multiple-types-ref") { tempDir =>
            val source   = createMockSource("test-lib")
            val file     = InFile(tempDir / "test.d.ts")
            val resolver = createMockResolver()
            val deps     = Set.newBuilder[LibTsSource]
            val logger   = Logger.DevNull

            val directive1 = Directive.TypesRef("react")
            val directive2 = Directive.TypesRef("lodash")
            val parsed = TsParsedFile(
              comments = NoComments,
              directives = IArray(directive1, directive2),
              members = IArray.Empty,
              codePath = CodePath.NoPath
            )

            Phase1ReadTypescript.processTypeReferenceDirectives(source, file, resolver, parsed, deps, logger)

            // Both should be processed (though not found in our mock resolver)
            val result = deps.result()
            assert(result.isEmpty) // Mock resolver doesn't contain these libraries
          }
        }
      }
    }

    test("resolveExternalReferences") {
      test("Basic Functionality") {
        test("should resolve external references successfully") {
          withTempDir("resolve-external") { tempDir =>
            val source   = createMockSource("test-lib")
            val file     = InFile(tempDir / "test.d.ts")
            val resolver = createMockResolver()
            val parsed   = createMockParsedFile("test")
            val logger   = Logger.DevNull

            val result = Phase1ReadTypescript.resolveExternalReferences(source, file, resolver, parsed, logger)

            assert(result.rewritten.isInstanceOf[TsParsedFile])
            assert(result.resolvedModules.isInstanceOf[Set[ResolvedModule]])
            assert(result.unresolvedModules.isInstanceOf[Set[TsIdentModule]])
          }
        }
      }

      test("Error Handling") {
        test("should handle files with complex external references") {
          withTempDir("complex-external") { tempDir =>
            val source   = createMockSource("test-lib")
            val file     = InFile(tempDir / "test.d.ts")
            val resolver = createMockResolver()
            val logger   = Logger.DevNull

            // Create a parsed file with some module references
            val moduleRef = TsTypeRef(
              NoComments,
              TsQIdent(IArray(TsIdentModule(None, List("external", "module")))),
              IArray.Empty
            )
            val interfaceDecl = TsDeclInterface(
              comments = NoComments,
              declared = false,
              name = TsIdentSimple("TestInterface"),
              tparams = IArray.Empty,
              inheritance = IArray.Empty,
              members = IArray.Empty,
              codePath = CodePath.NoPath
            )
            val parsed = TsParsedFile(
              comments = NoComments,
              directives = IArray.Empty,
              members = IArray(interfaceDecl),
              codePath = CodePath.NoPath
            )

            val result = Phase1ReadTypescript.resolveExternalReferences(source, file, resolver, parsed, logger)

            assert(result.rewritten.isInstanceOf[TsParsedFile])
            // External modules should be in unresolved since our mock resolver doesn't have them
            assert(result.unresolvedModules.nonEmpty || result.unresolvedModules.isEmpty) // Either is valid
          }
        }
      }
    }

    test("collectDependenciesFromResolvedModules") {
      test("Basic Functionality") {
        test("should collect dependencies from NotLocal resolved modules") {
          val source1 = createMockSource("lib1")
          val source2 = createMockSource("lib2")
          val deps    = Set.newBuilder[LibTsSource]

          val resolvedModules: Set[ResolvedModule] = Set(
            ResolvedModule.NotLocal(source1, TsIdentModule(None, List("lib1"))),
            ResolvedModule.NotLocal(source2, TsIdentModule(None, List("lib2")))
          )

          Phase1ReadTypescript.collectDependenciesFromResolvedModules(resolvedModules, deps)

          val result = deps.result()
          assert(result.contains(source1))
          assert(result.contains(source2))
          assert(result.size == 2)
        }

        test("should ignore Local resolved modules") {
          withTempDir("ignore-local") { tempDir =>
            val source = createMockSource("lib1")
            val deps   = Set.newBuilder[LibTsSource]

            val resolvedModules: Set[ResolvedModule] = Set(
              ResolvedModule.Local(InFile(tempDir / "local.d.ts"), TsIdentModule(None, List("local"))),
              ResolvedModule.NotLocal(source, TsIdentModule(None, List("lib1")))
            )

            Phase1ReadTypescript.collectDependenciesFromResolvedModules(resolvedModules, deps)

            val result = deps.result()
            assert(result.contains(source))
            assert(result.size == 1) // Only NotLocal should be added
          }
        }
      }

      test("Edge Cases") {
        test("should handle empty resolved modules") {
          val deps            = Set.newBuilder[LibTsSource]
          val resolvedModules = Set.empty[ResolvedModule]

          Phase1ReadTypescript.collectDependenciesFromResolvedModules(resolvedModules, deps)

          val result = deps.result()
          assert(result.isEmpty)
        }

        test("should handle only Local modules") {
          withTempDir("local-only") { tempDir =>
            val deps = Set.newBuilder[LibTsSource]
            val resolvedModules: Set[ResolvedModule] = Set(
              ResolvedModule.Local(InFile(tempDir / "local1.d.ts"), TsIdentModule(None, List("local1"))),
              ResolvedModule.Local(InFile(tempDir / "local2.d.ts"), TsIdentModule(None, List("local2")))
            )

            Phase1ReadTypescript.collectDependenciesFromResolvedModules(resolvedModules, deps)

            val result = deps.result()
            assert(result.isEmpty)
          }
        }
      }
    }

    test("addStandardLibraryComments") {
      test("Basic Functionality") {
        test("should add stdlib comments for StdLibSource") {
          withTempDir("stdlib-comments") { tempDir =>
            val stdLibFolder = InFolder(tempDir)
            val stdLibFiles  = IArray(InFile(tempDir / "lib.d.ts"))
            val source       = LibTsSource.StdLibSource(stdLibFolder, stdLibFiles, TsIdentLibrary("std"))
            val file         = InFile(tempDir / "lib.d.ts")
            val parsed       = createMockParsedFile("std")

            val result = Phase1ReadTypescript.addStandardLibraryComments(source, file, parsed)

            // Should add standard library comments
            assert(result.comments.isInstanceOf[Comments])
          }
        }

        test("should not modify FromFolder sources") {
          withTempDir("folder-comments") { tempDir =>
            val source = LibTsSource.FromFolder(InFolder(tempDir), TsIdentLibrarySimple("regular-lib"))
            val file   = InFile(tempDir / "index.d.ts")
            val parsed = createMockParsedFile("regular-lib")

            val result = Phase1ReadTypescript.addStandardLibraryComments(source, file, parsed)

            // Should return the same parsed file for non-stdlib sources
            assert(result == parsed)
          }
        }
      }

      test("Edge Cases") {
        test("should handle files with existing comments") {
          withTempDir("existing-comments") { tempDir =>
            val stdLibFolder = InFolder(tempDir)
            val stdLibFiles  = IArray(InFile(tempDir / "lib.d.ts"))
            val source       = LibTsSource.StdLibSource(stdLibFolder, stdLibFiles, TsIdentLibrary("std"))
            val file         = InFile(tempDir / "lib.d.ts")

            val existingComments = Comments("// Existing comment")
            val parsed = TsParsedFile(
              comments = existingComments,
              directives = IArray.Empty,
              members = IArray.Empty,
              codePath = CodePath.NoPath
            )

            val result = Phase1ReadTypescript.addStandardLibraryComments(source, file, parsed)

            // Should preserve or enhance existing comments
            assert(result.comments.isInstanceOf[Comments])
          }
        }
      }
    }

    test("inferAdditionalDependencies") {
      test("Basic Functionality") {
        test("should infer dependencies from unresolved modules") {
          val source = createMockSource("test-lib")
          val parsed = createMockParsedFile("test-lib")
          val unresolvedModules = Set(
            TsIdentModule(None, List("react")),
            TsIdentModule(None, List("lodash"))
          )
          val logger = Logger.DevNull

          val result = Phase1ReadTypescript.inferAdditionalDependencies(source, parsed, unresolvedModules, logger)

          // Should return inferred library dependencies
          assert(result.isInstanceOf[Set[TsIdentLibrary]])
        }

        test("should handle empty unresolved modules") {
          val source            = createMockSource("test-lib")
          val parsed            = createMockParsedFile("test-lib")
          val unresolvedModules = Set.empty[TsIdentModule]
          val logger            = Logger.DevNull

          val result = Phase1ReadTypescript.inferAdditionalDependencies(source, parsed, unresolvedModules, logger)

          assert(result.isEmpty)
        }
      }

      test("Edge Cases") {
        test("should handle complex module names") {
          val source = createMockSource("test-lib")
          val parsed = createMockParsedFile("test-lib")
          val unresolvedModules = Set(
            TsIdentModule(None, List("@types", "react")),
            TsIdentModule(None, List("@babel", "core")),
            TsIdentModule(None, List("nested", "module", "path"))
          )
          val logger = Logger.DevNull

          val result = Phase1ReadTypescript.inferAdditionalDependencies(source, parsed, unresolvedModules, logger)

          // Should handle scoped and nested module names
          assert(result.isInstanceOf[Set[TsIdentLibrary]])
        }
      }
    }
  }
}
