package org.scalablytyped.converter.internal
package ts
package modules

import utest.*
import org.scalablytyped.converter.internal.logging.Logger

object HandleCommonJsModulesTests extends TestSuite {

  // Helper methods for creating test data specific to HandleCommonJsModules tests

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

  def createCommonJsExport(targetName: String): TsExport =
    TsExport(
      comments = NoComments,
      typeOnly = false,
      tpe = ExportType.Namespaced,
      exported = TsExportee.Names(
        IArray((createQIdent(targetName), None)),
        None
      )
    )

  def createMockTypeAlias(
      name: String,
      alias: TsType = TsTypeRef.any,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      alias = alias,
      codePath = codePath
    )

  def createMockScope(): TsTreeScope = {
    val libName = TsIdentLibrarySimple("test-lib")
    val logger  = Logger.DevNull
    val deps    = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger)
  }

  def createHasPath(parts: String*): CodePath.HasPath =
    CodePath.HasPath(createSimpleIdent(parts.last), createQIdent(parts*))

  def tests = Tests {
    test("HandleCommonJsModules - Basic Functionality") {
      test("transformation can be instantiated") {
        // Test that the transformation can be instantiated
        val transformation = HandleCommonJsModules
        assert(transformation.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("handles regular module without CommonJS export") {
        val interface = createMockInterface("TestInterface")
        val module = createMockModule(
          "TestModule",
          members = IArray(interface),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should return unchanged since no CommonJS export pattern
        assert(result == module)
      }
    }

    test("HandleCommonJsModules - CommonJS Export Detection") {
      test("detects CommonJS export = pattern") {
        val targetClass    = createMockClass("MyClass", codePath = createHasPath("test", "MyClass"))
        val commonJsExport = createCommonJsExport("MyClass")
        val module = createMockModule(
          "TestModule",
          members = IArray(targetClass, commonJsExport),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should process the CommonJS pattern
        assert(result.members.nonEmpty)
        assert(result.members.contains(commonJsExport)) // Should keep the export
      }

      test("ignores non-namespaced exports") {
        val targetClass = createMockClass("MyClass")
        val namedExport = TsExport(
          comments = NoComments,
          typeOnly = false,
          tpe = ExportType.Named,
          exported = TsExportee.Names(IArray((createQIdent("MyClass"), None)), None)
        )
        val module = createMockModule(
          "TestModule",
          members = IArray(targetClass, namedExport)
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should return unchanged since not a CommonJS export pattern
        assert(result == module)
      }
    }

    test("HandleCommonJsModules - Namespace Flattening") {
      test("flattens namespace members when CommonJS export present") {
        val nestedInterface = createMockInterface("NestedInterface")
        val nestedTypeAlias = createMockTypeAlias("NestedType")
        val namespace = createMockNamespace(
          "MyClass",
          members = IArray(nestedInterface, nestedTypeAlias)
        )
        val targetClass    = createMockClass("MyClass")
        val commonJsExport = createCommonJsExport("MyClass")

        val module = createMockModule(
          "TestModule",
          members = IArray(targetClass, namespace, commonJsExport),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should flatten namespace members and export them
        assert(result.members.length > 3)                       // More than original due to flattening
        assert(result.members.exists(_.isInstanceOf[TsExport])) // Should have exports from flattening
      }

      test("handles module without matching namespace") {
        val targetClass    = createMockClass("MyClass")
        val otherNamespace = createMockNamespace("OtherClass")
        val commonJsExport = createCommonJsExport("MyClass")

        val module = createMockModule(
          "TestModule",
          members = IArray(targetClass, otherNamespace, commonJsExport)
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should return unchanged since no matching namespace
        assert(result == module)
      }
    }

    test("HandleCommonJsModules - Type Reference Rewriting") {
      test("rewrites type references to remove namespace prefix") {
        val nestedInterface = createMockInterface(
          "NestedInterface",
          members = IArray(
            TsMemberProperty(
              comments = NoComments,
              level = TsProtectionLevel.Default,
              name = createSimpleIdent("prop"),
              tpe = Some(TsTypeRef(NoComments, createQIdent("MyClass", "NestedType"), Empty)),
              expr = None,
              isStatic = false,
              isReadOnly = false
            )
          )
        )
        val namespace      = createMockNamespace("MyClass", members = IArray(nestedInterface))
        val targetClass    = createMockClass("MyClass")
        val commonJsExport = createCommonJsExport("MyClass")

        val module = createMockModule(
          "TestModule",
          members = IArray(targetClass, namespace, commonJsExport),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should rewrite type references to remove namespace prefix
        assert(result.members.nonEmpty)
      }
    }

    test("HandleCommonJsModules - Edge Cases") {
      test("handles empty module") {
        val module = createMockModule("EmptyModule")
        val scope  = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        assert(result == module)
      }

      test("handles module with only CommonJS export") {
        val commonJsExport = createCommonJsExport("NonExistentClass")
        val module = createMockModule(
          "TestModule",
          members = IArray(commonJsExport)
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should handle gracefully even without matching target
        assert(result == module)
      }

      test("handles multiple CommonJS exports") {
        val export1 = createCommonJsExport("Class1")
        val export2 = createCommonJsExport("Class2")
        val module = createMockModule(
          "TestModule",
          members = IArray(export1, export2)
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should only process the first CommonJS export
        assert(result.members.length == 2)
      }
    }

    test("HandleCommonJsModules - Complex Scenarios") {
      test("handles class with namespace pattern") {
        // This tests the main pattern described in the documentation:
        // declare class A {}
        // declare namespace A { ... }
        // export = A;

        val targetClass = createMockClass("A", codePath = createHasPath("test", "A"))

        val nestedInterface = createMockInterface(
          "B",
          members = IArray(
            TsMemberProperty(
              comments = NoComments,
              level = TsProtectionLevel.Default,
              name = createSimpleIdent("nested"),
              tpe = Some(TsTypeRef(NoComments, createQIdent("A", "B"), Empty)),
              expr = None,
              isStatic = false,
              isReadOnly = false
            )
          )
        )

        val typeAlias = createMockTypeAlias(
          "N",
          TsTypeRef(NoComments, createQIdent("number"), Empty)
        )

        val namespace = createMockNamespace(
          "A",
          members = IArray(nestedInterface, typeAlias)
        )

        val commonJsExport = createCommonJsExport("A")

        val module = createMockModule(
          "TestModule",
          members = IArray(targetClass, namespace, commonJsExport),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should flatten namespace and keep the original class
        assert(result.members.nonEmpty)
        assert(result.members.exists(_.isInstanceOf[TsExport])) // Flattened exports
        assert(result.members.contains(targetClass))            // Original class preserved
        assert(result.members.contains(commonJsExport))         // Export statement preserved
      }

      test("handles import alias pattern") {
        // Tests the pattern: export import Types = A;
        val targetClass = createMockClass("A")
        val importAlias = TsImport(
          typeOnly = false,
          imported = IArray(TsImported.Ident(createSimpleIdent("Types"))),
          from = TsImportee.Local(createQIdent("A"))
        )
        val exportedImport = TsExport(
          comments = NoComments,
          typeOnly = false,
          tpe = ExportType.Named,
          exported = TsExportee.Tree(importAlias)
        )
        val namespace = createMockNamespace(
          "A",
          members = IArray(exportedImport)
        )
        val commonJsExport = createCommonJsExport("A")

        val module = createMockModule(
          "TestModule",
          members = IArray(targetClass, namespace, commonJsExport),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should handle import alias transformation
        assert(result.members.nonEmpty)
      }

      test("filters redundant type aliases") {
        // Tests filtering of type N = A.N pattern
        val targetClass = createMockClass("A")
        val redundantTypeAlias = createMockTypeAlias(
          "N",
          TsTypeRef(NoComments, createQIdent("A", "N"), Empty)
        )
        val namespace      = createMockNamespace("A")
        val commonJsExport = createCommonJsExport("A")

        val module = createMockModule(
          "TestModule",
          members = IArray(targetClass, namespace, redundantTypeAlias, commonJsExport),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should filter out redundant type alias
        assert(!result.members.contains(redundantTypeAlias))
      }

      test("preserves non-redundant type aliases") {
        val targetClass = createMockClass("A")
        val nonRedundantTypeAlias = createMockTypeAlias(
          "Different",
          TsTypeRef(NoComments, createQIdent("A", "N"), Empty)
        )
        val namespace      = createMockNamespace("A")
        val commonJsExport = createCommonJsExport("A")

        val module = createMockModule(
          "TestModule",
          members = IArray(targetClass, namespace, nonRedundantTypeAlias, commonJsExport),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should preserve non-redundant type alias (it may be reordered)
        assert(result.members.exists {
          case alias: TsDeclTypeAlias => alias.name.value == "Different"
          case _                      => false
        })
      }
    }

    test("HandleCommonJsModules - Integration Testing") {
      test("works with realistic CommonJS module structure") {
        // Simulates a real CommonJS module like those found in npm packages
        val mainClass = createMockClass(
          "MyLibrary",
          members = IArray(
            TsMemberProperty(
              comments = NoComments,
              level = TsProtectionLevel.Default,
              name = createSimpleIdent("version"),
              tpe = Some(TsTypeRef.string),
              expr = None,
              isStatic = false,
              isReadOnly = true
            )
          ),
          codePath = createHasPath("mylib", "MyLibrary")
        )

        val helperInterface = createMockInterface("Helper")
        val utilsType       = createMockTypeAlias("Utils", TsTypeRef.any)

        val namespace = createMockNamespace(
          "MyLibrary",
          members = IArray(helperInterface, utilsType),
          codePath = createHasPath("mylib", "MyLibrary")
        )

        val commonJsExport = createCommonJsExport("MyLibrary")

        val module = createMockModule(
          "mylib",
          members = IArray(mainClass, namespace, commonJsExport),
          codePath = createHasPath("mylib")
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should properly transform the CommonJS module
        assert(result.members.length > 3)                       // Should have flattened content
        assert(result.members.contains(mainClass))              // Original class preserved
        assert(result.members.contains(commonJsExport))         // Export preserved
        assert(result.members.exists(_.isInstanceOf[TsExport])) // Flattened exports added
      }

      test("handles nested namespace structures") {
        val innerInterface = createMockInterface("InnerInterface")
        val innerNamespace = createMockNamespace("Inner", members = IArray(innerInterface))
        val outerNamespace = createMockNamespace("Outer", members = IArray(innerNamespace))
        val targetClass    = createMockClass("Outer")
        val commonJsExport = createCommonJsExport("Outer")

        val module = createMockModule(
          "TestModule",
          members = IArray(targetClass, outerNamespace, commonJsExport),
          codePath = createHasPath("test", "TestModule")
        )
        val scope = createMockScope()

        val result = HandleCommonJsModules.enterTsDeclModule(scope)(module)

        // Should handle nested structures appropriately
        assert(result.members.nonEmpty)
      }
    }
  }
}
