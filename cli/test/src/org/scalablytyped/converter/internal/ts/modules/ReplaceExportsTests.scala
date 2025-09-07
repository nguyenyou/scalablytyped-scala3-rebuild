package org.scalablytyped.converter.internal
package ts
package modules

import utest.*
import org.scalablytyped.converter.internal.logging.Logger

object ReplaceExportsTests extends TestSuite {

  // Helper methods for creating test data specific to ReplaceExports tests

  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent =
    TsQIdent(IArray.fromTraversable(parts.map(TsIdentSimple.apply)))

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

  def createMockExport(
      exportType: ExportType = ExportType.Named,
      exportee: TsExportee = TsExportee.Names(Empty, None)
  ): TsExport =
    TsExport(
      comments = NoComments,
      typeOnly = false,
      tpe = exportType,
      exported = exportee
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
    TsTreeScope(TsIdentLibrary("test"), pedantic = false, deps, Logger.DevNull) / parsedFile
  }

  def createHasPath(parts: String*): CodePath.HasPath =
    CodePath.HasPath(createSimpleIdent(parts.last), createQIdent(parts*))

  def tests = Tests {
    test("ReplaceExports - Basic Functionality") {
      test("CachedReplaceExports handles empty exports") {
        val module       = createMockModule("TestModule")
        val scope        = createMockScope()
        val loopDetector = TsTreeScope.LoopDetector.initial

        val result = CachedReplaceExports.apply(scope, loopDetector, module)

        assert(result.name.value == "TestModule")
        assert(result.exports.isEmpty)
      }

      test("ReplaceExports transformation can be instantiated") {
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        assert(transformation != null)
      }
    }

    test("ReplaceExports - Namespace Processing") {
      test("handles namespace with no exports or imports") {
        val namespace      = createMockNamespace("TestNamespace")
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclNamespace(scope)(namespace)

        assert(result.name.value == "TestNamespace")
        assert(result.exports.isEmpty)
        assert(result.imports.isEmpty)
      }

      test("processes namespace with empty named export") {
        val emptyExport = createMockExport(
          ExportType.Named,
          TsExportee.Names(Empty, None)
        )
        val namespace = createMockNamespace(
          "TestNamespace",
          members = IArray(emptyExport) // exports are part of members
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclNamespace(scope)(namespace)

        assert(result.name.value == "TestNamespace")
        // Empty named exports should be filtered out
        assert(result.members.isEmpty)
      }
    }

    test("ReplaceExports - Module Processing") {
      test("handles module without cache") {
        val module         = createMockModule("TestModule")
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclModule(scope)(module)

        assert(result.name.value == "TestModule")
      }

      test("processes module with members") {
        val interface = createMockInterface("TestInterface")
        val module = createMockModule(
          "TestModule",
          members = IArray(interface)
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclModule(scope)(module)

        assert(result.name.value == "TestModule")
        assert(result.members.nonEmpty)
      }
    }

    test("ReplaceExports - Augmented Module Processing") {
      test("handles augmented module") {
        val interface = createMockInterface("TestInterface")
        val augmentedModule = TsAugmentedModule(
          comments = NoComments,
          name = TsIdentModule(None, List("TestModule")),
          members = IArray(interface),
          codePath = CodePath.NoPath,
          jsLocation = JsLocation.Zero
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsAugmentedModule(scope)(augmentedModule)

        assert(result.name.value == "TestModule")
        assert(result.members.nonEmpty)
      }
    }

    test("ReplaceExports - Parsed File Processing") {
      test("filters imports and unwraps export trees") {
        val interface  = createMockInterface("TestInterface")
        val exportDecl = createMockExport(ExportType.Named, TsExportee.Tree(interface))
        val importDecl = TsImport(
          typeOnly = false,
          imported = IArray(TsImported.Ident(createSimpleIdent("test"))),
          from = TsImportee.Local(createQIdent("local"))
        )
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(exportDecl, importDecl, interface),
          codePath = CodePath.NoPath
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.leaveTsParsedFile(scope)(parsedFile)

        // Should filter out imports and unwrap export trees
        assert(result.members.length == 2) // interface from export tree + direct interface
        assert(result.members.forall(_.isInstanceOf[TsDeclInterface]))
      }
    }

    test("ReplaceExports - Edge Cases") {
      test("handles namespace with mixed content") {
        val interface  = createMockInterface("TestInterface", codePath = createHasPath("test", "TestInterface"))
        val exportDecl = createMockExport(ExportType.Named, TsExportee.Tree(interface))
        val namespace = createMockNamespace(
          "TestNamespace",
          members = IArray(interface, exportDecl),
          codePath = createHasPath("test", "TestNamespace")
        )
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclNamespace(scope)(namespace)

        assert(result.name.value == "TestNamespace")
        assert(result.members.nonEmpty)
      }

      test("handles empty module") {
        val module         = createMockModule("EmptyModule")
        val scope          = createMockScope()
        val loopDetector   = TsTreeScope.LoopDetector.initial
        val transformation = new ReplaceExports(loopDetector)

        val result = transformation.enterTsDeclModule(scope)(module)

        assert(result.name.value == "EmptyModule")
        assert(result.members.isEmpty)
      }
    }
  }
}
