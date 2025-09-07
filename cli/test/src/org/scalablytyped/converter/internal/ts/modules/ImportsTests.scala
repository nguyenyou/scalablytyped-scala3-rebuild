package org.scalablytyped.converter.internal
package ts
package modules

import utest.*
import org.scalablytyped.converter.internal.logging.Logger
import org.scalablytyped.converter.internal.ts.TsTreeScope.LoopDetector

object ImportsTests extends TestSuite {

  // Helper methods for creating test data specific to Imports tests

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

  def createMockClass(
      name: String,
      members: IArray[TsMember] = Empty,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      parent = None,
      implements = Empty,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = codePath
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

  def createMockVar(
      name: String,
      tpe: Option[TsType] = Some(TsTypeRef.any),
      codePath: CodePath = CodePath.NoPath
  ): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockScope(): TsTreeScope = {
    val libName = TsIdentLibrarySimple("test-lib")
    val logger  = Logger.DevNull
    val deps    = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger)
  }

  def createScopedScope(container: TsContainer): TsTreeScope.Scoped = {
    val root = createMockScope()
    root / container
  }

  def createHasPath(parts: String*): CodePath.HasPath =
    CodePath.HasPath(createSimpleIdent(parts.last), createQIdent(parts*))

  def createImport(
      typeOnly: Boolean = false,
      imported: IArray[TsImported],
      from: TsImportee
  ): TsImport =
    TsImport(typeOnly, imported, from)

  def createImportedIdent(name: String): TsImported.Ident =
    TsImported.Ident(createSimpleIdent(name))

  def createImportedStar(asOpt: Option[String] = None): TsImported.Star =
    TsImported.Star(asOpt.map(createSimpleIdent))

  def createImportedDestructured(idents: (String, Option[String])*): TsImported.Destructured =
    TsImported.Destructured(
      IArray.fromTraversable(idents.map { case (orig, alias) =>
        createSimpleIdent(orig) -> alias.map(createSimpleIdent)
      })
    )

  def createImporteeFrom(module: String): TsImportee.From =
    TsImportee.From(TsIdentModule(None, List(module)))

  def createImporteeRequired(module: String): TsImportee.Required =
    TsImportee.Required(TsIdentModule(None, List(module)))

  def createImporteeLocal(parts: String*): TsImportee.Local =
    TsImportee.Local(createQIdent(parts*))

  def tests = Tests {
    test("Imports - validImport Function") {
      test("matches ident import correctly") {
        val wanted = IArray(createSimpleIdent("React"))
        val importStmt = createImport(
          imported = IArray(createImportedIdent("React")),
          from = createImporteeFrom("react")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isDefined)
        assert(result.get.imported.length == 1)
        assert(result.get.imported.head.isInstanceOf[TsImported.Ident])
      }

      test("filters out non-matching ident imports") {
        val wanted = IArray(createSimpleIdent("Vue"))
        val importStmt = createImport(
          imported = IArray(createImportedIdent("React")),
          from = createImporteeFrom("react")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isEmpty)
      }

      test("matches destructured import with original name") {
        val wanted = IArray(createSimpleIdent("useState"))
        val importStmt = createImport(
          imported = IArray(createImportedDestructured(("useState", None), ("useEffect", None))),
          from = createImporteeFrom("react")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isDefined)
        assert(result.get.imported.length == 1)
        val destructured = result.get.imported.head.asInstanceOf[TsImported.Destructured]
        assert(destructured.idents.length == 1)
        assert(destructured.idents.head._1.value == "useState")
      }

      test("matches destructured import with alias") {
        val wanted = IArray(createSimpleIdent("state"))
        val importStmt = createImport(
          imported = IArray(createImportedDestructured(("useState", Some("state")))),
          from = createImporteeFrom("react")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isDefined)
        val destructured = result.get.imported.head.asInstanceOf[TsImported.Destructured]
        assert(destructured.idents.head._2.get.value == "state")
      }

      test("matches star import with alias") {
        val wanted = IArray(createSimpleIdent("React"))
        val importStmt = createImport(
          imported = IArray(createImportedStar(Some("React"))),
          from = createImporteeFrom("react")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isDefined)
        val star = result.get.imported.head.asInstanceOf[TsImported.Star]
        assert(star.asOpt.get.value == "React")
      }

      test("filters out star import without matching alias") {
        val wanted = IArray(createSimpleIdent("Vue"))
        val importStmt = createImport(
          imported = IArray(createImportedStar(Some("React"))),
          from = createImporteeFrom("react")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isEmpty)
      }

      test("returns None for empty wanted array") {
        val wanted = Empty
        val importStmt = createImport(
          imported = IArray(createImportedIdent("React")),
          from = createImporteeFrom("react")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isEmpty)
      }
    }

    test("Imports - expandImportee Function") {
      test("handles TsImportee.Local") {
        val scope        = createScopedScope(createMockNamespace("TestNamespace"))
        val loopDetector = LoopDetector.initial
        val importee     = createImporteeLocal("TestNamespace", "SomeType")

        val result = Imports.expandImportee(importee, scope, loopDetector)

        assert(result.isInstanceOf[ExpandedMod.Picked])
        val picked = result.asInstanceOf[ExpandedMod.Picked]
        // Should return empty since we don't have actual lookupInternal implementation in mock
        assert(picked.things.isEmpty)
      }

      test("handles TsImportee.Required with missing module") {
        val scope        = createScopedScope(createMockNamespace("TestNamespace"))
        val loopDetector = LoopDetector.initial
        val importee     = createImporteeRequired("nonexistent-module")

        val result = Imports.expandImportee(importee, scope, loopDetector)

        assert(result.isInstanceOf[ExpandedMod.Picked])
        val picked = result.asInstanceOf[ExpandedMod.Picked]
        assert(picked.things.isEmpty)
      }

      test("handles TsImportee.From with missing module") {
        val scope        = createScopedScope(createMockNamespace("TestNamespace"))
        val loopDetector = LoopDetector.initial
        val importee     = createImporteeFrom("nonexistent-module")

        val result = Imports.expandImportee(importee, scope, loopDetector)

        assert(result.isInstanceOf[ExpandedMod.Picked])
        val picked = result.asInstanceOf[ExpandedMod.Picked]
        assert(picked.things.isEmpty)
      }
    }

    test("Imports - lookupFromImports Function") {
      test("returns empty for no imports") {
        val scope        = createScopedScope(createMockNamespace("TestNamespace"))
        val wanted       = IArray(createSimpleIdent("SomeType"))
        val loopDetector = LoopDetector.initial
        val imports      = Empty

        val result = Imports.lookupFromImports(scope, Picker.All, wanted, loopDetector, imports)

        assert(result.isEmpty)
      }

      test("returns empty for non-matching imports") {
        val scope        = createScopedScope(createMockNamespace("TestNamespace"))
        val wanted       = IArray(createSimpleIdent("NonExistentType"))
        val loopDetector = LoopDetector.initial
        val imports = IArray(
          createImport(
            imported = IArray(createImportedIdent("SomeOtherType")),
            from = createImporteeFrom("some-module")
          )
        )

        val result = Imports.lookupFromImports(scope, Picker.All, wanted, loopDetector, imports)

        assert(result.isEmpty)
      }

      test("handles import with matching ident") {
        val scope        = createScopedScope(createMockNamespace("TestNamespace"))
        val wanted       = IArray(createSimpleIdent("React"))
        val loopDetector = LoopDetector.initial
        val imports = IArray(
          createImport(
            imported = IArray(createImportedIdent("React")),
            from = createImporteeLocal("React")
          )
        )

        val result = Imports.lookupFromImports(scope, Picker.All, wanted, loopDetector, imports)

        // Should return empty since we don't have actual module resolution in mock
        assert(result.isEmpty)
      }
    }

    test("Imports - Edge Cases") {
      test("handles multiple imports with same name") {
        val wanted = IArray(createSimpleIdent("Component"))
        val imports = IArray(
          createImport(
            imported = IArray(createImportedIdent("Component")),
            from = createImporteeFrom("react")
          ),
          createImport(
            imported = IArray(createImportedIdent("Component")),
            from = createImporteeFrom("vue")
          )
        )

        val validImports = imports.mapNotNone(Imports.validImport(wanted))

        assert(validImports.length == 2)
        assert(validImports.forall(_.imported.head.asInstanceOf[TsImported.Ident].ident.value == "Component"))
      }

      test("handles complex destructured imports") {
        val wanted = IArray(createSimpleIdent("useState"))
        val importStmt = createImport(
          imported = IArray(
            createImportedDestructured(
              ("useState", None),
              ("useEffect", Some("effect")),
              ("useCallback", None)
            )
          ),
          from = createImporteeFrom("react")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isDefined)
        val destructured = result.get.imported.head.asInstanceOf[TsImported.Destructured]
        assert(destructured.idents.length == 1)
        assert(destructured.idents.head._1.value == "useState")
        assert(destructured.idents.head._2.isEmpty)
      }

      test("handles star import without alias") {
        val wanted = IArray(createSimpleIdent("SomeExport"))
        val importStmt = createImport(
          imported = IArray(createImportedStar(None)),
          from = createImporteeFrom("some-module")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isEmpty) // Star import without alias should not match specific wanted name
      }
    }

    test("Imports - ExpandedMod Handling") {
      test("ExpandedMod.Picked nonEmpty check") {
        val interface1 = createMockInterface("Interface1")
        val interface2 = createMockInterface("Interface2")
        val scope      = createScopedScope(createMockNamespace("TestScope"))

        val picked = ExpandedMod.Picked(IArray((interface1, scope), (interface2, scope)))
        assert(picked.nonEmpty)
        assert(picked.things.length == 2)

        val emptyPicked = ExpandedMod.Picked(Empty)
        assert(!emptyPicked.nonEmpty)
      }

      test("ExpandedMod.Whole nonEmpty check") {
        val interface1 = createMockInterface("Interface1")
        val namespace1 = createMockNamespace("Namespace1")
        val var1       = createMockVar("var1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))

        val whole = ExpandedMod.Whole(
          defaults = IArray(interface1),
          namespaced = IArray(namespace1),
          rest = IArray(var1),
          scope = scope
        )
        assert(whole.nonEmpty)

        val emptyWhole = ExpandedMod.Whole(Empty, Empty, Empty, scope)
        assert(!emptyWhole.nonEmpty)
      }
    }

    test("Imports - Import Type Handling") {
      test("handles type-only imports") {
        val wanted = IArray(createSimpleIdent("TypeDef"))
        val importStmt = createImport(
          typeOnly = true,
          imported = IArray(createImportedIdent("TypeDef")),
          from = createImporteeFrom("types-module")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isDefined)
        assert(result.get.typeOnly)
        assert(result.get.imported.head.asInstanceOf[TsImported.Ident].ident.value == "TypeDef")
      }

      test("handles regular value imports") {
        val wanted = IArray(createSimpleIdent("Component"))
        val importStmt = createImport(
          typeOnly = false,
          imported = IArray(createImportedIdent("Component")),
          from = createImporteeFrom("component-module")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isDefined)
        assert(!result.get.typeOnly)
      }
    }

    test("Imports - Complex Import Scenarios") {
      test("handles mixed import types in single statement") {
        val importStmt = createImport(
          imported = IArray(
            createImportedIdent("DefaultExport"),
            createImportedDestructured(("namedExport", None)),
            createImportedStar(Some("AllExports"))
          ),
          from = createImporteeFrom("complex-module")
        )

        // Test matching default export
        val defaultResult = Imports.validImport(IArray(createSimpleIdent("DefaultExport")))(importStmt)
        assert(defaultResult.isDefined)
        assert(defaultResult.get.imported.length == 1)

        // Test matching named export
        val namedResult = Imports.validImport(IArray(createSimpleIdent("namedExport")))(importStmt)
        assert(namedResult.isDefined)
        assert(namedResult.get.imported.length == 1)

        // Test matching star export
        val starResult = Imports.validImport(IArray(createSimpleIdent("AllExports")))(importStmt)
        assert(starResult.isDefined)
        assert(starResult.get.imported.length == 1)
      }

      test("handles nested destructured imports with aliases") {
        val wanted = IArray(createSimpleIdent("myHook"))
        val importStmt = createImport(
          imported = IArray(
            createImportedDestructured(
              ("useState", Some("state")),
              ("useEffect", Some("effect")),
              ("useCustomHook", Some("myHook"))
            )
          ),
          from = createImporteeFrom("hooks-module")
        )

        val result = Imports.validImport(wanted)(importStmt)

        assert(result.isDefined)
        val destructured = result.get.imported.head.asInstanceOf[TsImported.Destructured]
        assert(destructured.idents.length == 1)
        assert(destructured.idents.head._1.value == "useCustomHook")
        assert(destructured.idents.head._2.get.value == "myHook")
      }

      test("handles import from different importee types") {
        val wanted = IArray(createSimpleIdent("SomeType"))

        // Test From importee
        val fromImport = createImport(
          imported = IArray(createImportedIdent("SomeType")),
          from = createImporteeFrom("external-module")
        )
        val fromResult = Imports.validImport(wanted)(fromImport)
        assert(fromResult.isDefined)

        // Test Required importee
        val requiredImport = createImport(
          imported = IArray(createImportedIdent("SomeType")),
          from = createImporteeRequired("commonjs-module")
        )
        val requiredResult = Imports.validImport(wanted)(requiredImport)
        assert(requiredResult.isDefined)

        // Test Local importee
        val localImport = createImport(
          imported = IArray(createImportedIdent("SomeType")),
          from = createImporteeLocal("local", "module")
        )
        val localResult = Imports.validImport(wanted)(localImport)
        assert(localResult.isDefined)
      }
    }

    test("Imports - Caching Behavior") {
      test("expandImportee uses caching when available") {
        val scope        = createScopedScope(createMockNamespace("TestNamespace"))
        val loopDetector = LoopDetector.initial
        val importee     = createImporteeLocal("TestNamespace", "SomeType")

        // First call
        val result1 = Imports.expandImportee(importee, scope, loopDetector)

        // Second call should use cache (though we can't directly test cache hit in this mock setup)
        val result2 = Imports.expandImportee(importee, scope, loopDetector)

        assert(result1.getClass == result2.getClass)
      }
    }

    test("Imports - Error Handling") {
      test("handles malformed import gracefully") {
        val wanted = IArray(createSimpleIdent("SomeType"))

        // Import with empty imported array
        val emptyImport = createImport(
          imported = Empty,
          from = createImporteeFrom("some-module")
        )

        val result = Imports.validImport(wanted)(emptyImport)
        assert(result.isEmpty)
      }

      test("handles invalid destructured import") {
        val wanted = IArray(createSimpleIdent("NonExistent"))
        val importStmt = createImport(
          imported = IArray(
            createImportedDestructured(("existingExport", None))
          ),
          from = createImporteeFrom("some-module")
        )

        val result = Imports.validImport(wanted)(importStmt)
        assert(result.isEmpty)
      }
    }
  }
}
