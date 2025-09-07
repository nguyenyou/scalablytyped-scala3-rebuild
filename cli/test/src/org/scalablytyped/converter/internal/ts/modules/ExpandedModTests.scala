package org.scalablytyped.converter.internal
package ts
package modules

import utest.*
import org.scalablytyped.converter.internal.logging.Logger

object ExpandedModTests extends TestSuite {

  // Helper methods for creating test data specific to ExpandedMod tests

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

  def createMockFunction(
      name: String,
      signature: TsFunSig = TsFunSig(NoComments, Empty, Empty, Some(TsTypeRef.any)),
      codePath: CodePath = CodePath.NoPath
  ): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = signature,
      jsLocation = JsLocation.Zero,
      codePath = codePath
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

  def createScopedScope(container: TsContainer): TsTreeScope.Scoped = {
    val root = createMockScope()
    root / container
  }

  def createHasPath(parts: String*): CodePath.HasPath =
    CodePath.HasPath(createSimpleIdent(parts.last), createQIdent(parts*))

  def tests = Tests {
    test("ExpandedMod.Whole - Basic Functionality") {
      test("creates Whole with all empty arrays") {
        val scope = createScopedScope(createMockNamespace("TestScope"))
        val whole = ExpandedMod.Whole(Empty, Empty, Empty, scope)

        assert(whole.defaults.isEmpty)
        assert(whole.namespaced.isEmpty)
        assert(whole.rest.isEmpty)
        assert(whole.scope == scope)
        assert(!whole.nonEmpty)
      }

      test("creates Whole with non-empty defaults") {
        val interface1 = createMockInterface("Interface1")
        val interface2 = createMockInterface("Interface2")
        val scope      = createScopedScope(createMockNamespace("TestScope"))
        val whole = ExpandedMod.Whole(
          defaults = IArray(interface1, interface2),
          namespaced = Empty,
          rest = Empty,
          scope = scope
        )

        assert(whole.defaults.length == 2)
        assert(whole.namespaced.isEmpty)
        assert(whole.rest.isEmpty)
        assert(whole.nonEmpty)
      }

      test("creates Whole with non-empty namespaced") {
        val namespace1 = createMockNamespace("Namespace1")
        val namespace2 = createMockNamespace("Namespace2")
        val scope      = createScopedScope(createMockNamespace("TestScope"))
        val whole = ExpandedMod.Whole(
          defaults = Empty,
          namespaced = IArray(namespace1, namespace2),
          rest = Empty,
          scope = scope
        )

        assert(whole.defaults.isEmpty)
        assert(whole.namespaced.length == 2)
        assert(whole.rest.isEmpty)
        assert(whole.nonEmpty)
      }

      test("creates Whole with non-empty rest") {
        val var1  = createMockVar("var1")
        val func1 = createMockFunction("func1")
        val scope = createScopedScope(createMockNamespace("TestScope"))
        val whole = ExpandedMod.Whole(
          defaults = Empty,
          namespaced = Empty,
          rest = IArray(var1, func1),
          scope = scope
        )

        assert(whole.defaults.isEmpty)
        assert(whole.namespaced.isEmpty)
        assert(whole.rest.length == 2)
        assert(whole.nonEmpty)
      }
    }

    test("ExpandedMod.Whole - Positive Cases") {
      test("creates Whole with all arrays populated") {
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

        assert(whole.defaults.length == 1)
        assert(whole.namespaced.length == 1)
        assert(whole.rest.length == 1)
        assert(whole.nonEmpty)
      }

      test("creates Whole with mixed declaration types") {
        val interface1 = createMockInterface("Interface1")
        val class1     = createMockClass("Class1")
        val func1      = createMockFunction("func1")
        val typeAlias1 = createMockTypeAlias("TypeAlias1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))
        val whole = ExpandedMod.Whole(
          defaults = IArray(interface1, class1),
          namespaced = Empty,
          rest = IArray(func1, typeAlias1),
          scope = scope
        )

        assert(whole.defaults.length == 2)
        assert(whole.rest.length == 2)
        assert(whole.nonEmpty)
      }

      test("creates Whole with large arrays") {
        val interfaces = (1 to 10).map(i => createMockInterface(s"Interface$i"))
        val namespaces = (1 to 5).map(i => createMockNamespace(s"Namespace$i"))
        val vars       = (1 to 15).map(i => createMockVar(s"var$i"))
        val scope      = createScopedScope(createMockNamespace("TestScope"))
        val whole = ExpandedMod.Whole(
          defaults = IArray.fromTraversable(interfaces),
          namespaced = IArray.fromTraversable(namespaces),
          rest = IArray.fromTraversable(vars),
          scope = scope
        )

        assert(whole.defaults.length == 10)
        assert(whole.namespaced.length == 5)
        assert(whole.rest.length == 15)
        assert(whole.nonEmpty)
      }
    }

    test("ExpandedMod.Whole - Edge Cases") {
      test("nonEmpty returns true when only defaults is non-empty") {
        val interface1 = createMockInterface("Interface1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))
        val whole = ExpandedMod.Whole(
          defaults = IArray(interface1),
          namespaced = Empty,
          rest = Empty,
          scope = scope
        )

        assert(whole.nonEmpty)
      }

      test("nonEmpty returns true when only namespaced is non-empty") {
        val namespace1 = createMockNamespace("Namespace1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))
        val whole = ExpandedMod.Whole(
          defaults = Empty,
          namespaced = IArray(namespace1),
          rest = Empty,
          scope = scope
        )

        assert(whole.nonEmpty)
      }

      test("nonEmpty returns true when only rest is non-empty") {
        val var1  = createMockVar("var1")
        val scope = createScopedScope(createMockNamespace("TestScope"))
        val whole = ExpandedMod.Whole(
          defaults = Empty,
          namespaced = Empty,
          rest = IArray(var1),
          scope = scope
        )

        assert(whole.nonEmpty)
      }
    }

    test("ExpandedMod.Picked - Basic Functionality") {
      test("creates Picked with empty things array") {
        val picked = ExpandedMod.Picked(Empty)

        assert(picked.things.isEmpty)
        assert(!picked.nonEmpty)
      }

      test("creates Picked with single thing") {
        val interface1 = createMockInterface("Interface1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))
        val picked     = ExpandedMod.Picked(IArray((interface1, scope)))

        assert(picked.things.length == 1)
        assert(picked.things(0)._1 == interface1)
        assert(picked.things(0)._2 == scope)
        assert(picked.nonEmpty)
      }

      test("creates Picked with multiple things") {
        val interface1 = createMockInterface("Interface1")
        val class1     = createMockClass("Class1")
        val scope1     = createScopedScope(createMockNamespace("TestScope1"))
        val scope2     = createScopedScope(createMockNamespace("TestScope2"))
        val picked     = ExpandedMod.Picked(IArray((interface1, scope1), (class1, scope2)))

        assert(picked.things.length == 2)
        assert(picked.things(0)._1 == interface1)
        assert(picked.things(0)._2 == scope1)
        assert(picked.things(1)._1 == class1)
        assert(picked.things(1)._2 == scope2)
        assert(picked.nonEmpty)
      }
    }

    test("ExpandedMod.Picked - Positive Cases") {
      test("creates Picked with different declaration types") {
        val interface1 = createMockInterface("Interface1")
        val class1     = createMockClass("Class1")
        val func1      = createMockFunction("func1")
        val var1       = createMockVar("var1")
        val typeAlias1 = createMockTypeAlias("TypeAlias1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))

        val picked = ExpandedMod.Picked(
          IArray(
            (interface1, scope),
            (class1, scope),
            (func1, scope),
            (var1, scope),
            (typeAlias1, scope)
          )
        )

        assert(picked.things.length == 5)
        assert(picked.nonEmpty)

        // Verify each declaration type is preserved
        assert(picked.things(0)._1.isInstanceOf[TsDeclInterface])
        assert(picked.things(1)._1.isInstanceOf[TsDeclClass])
        assert(picked.things(2)._1.isInstanceOf[TsDeclFunction])
        assert(picked.things(3)._1.isInstanceOf[TsDeclVar])
        assert(picked.things(4)._1.isInstanceOf[TsDeclTypeAlias])
      }

      test("creates Picked with different scopes") {
        val interface1 = createMockInterface("Interface1")
        val interface2 = createMockInterface("Interface2")
        val scope1     = createScopedScope(createMockNamespace("TestScope1"))
        val scope2     = createScopedScope(createMockNamespace("TestScope2"))
        val picked     = ExpandedMod.Picked(IArray((interface1, scope1), (interface2, scope2)))

        assert(picked.things.length == 2)
        assert(picked.things(0)._2 == scope1)
        assert(picked.things(1)._2 == scope2)
        assert(picked.nonEmpty)
      }

      test("creates Picked with large number of things") {
        val declarations = (1 to 20).map(i => createMockInterface(s"Interface$i"))
        val scope        = createScopedScope(createMockNamespace("TestScope"))
        val things       = declarations.map(decl => (decl, scope))
        val picked       = ExpandedMod.Picked(IArray.fromTraversable(things))

        assert(picked.things.length == 20)
        assert(picked.nonEmpty)

        // Verify all declarations are preserved
        declarations.zipWithIndex.foreach { case (decl, index) =>
          assert(picked.things(index)._1 == decl)
          assert(picked.things(index)._2 == scope)
        }
      }
    }

    test("ExpandedMod.Picked - Edge Cases") {
      test("handles same declaration with different scopes") {
        val interface1 = createMockInterface("Interface1")
        val scope1     = createScopedScope(createMockNamespace("TestScope1"))
        val scope2     = createScopedScope(createMockNamespace("TestScope2"))
        val picked     = ExpandedMod.Picked(IArray((interface1, scope1), (interface1, scope2)))

        assert(picked.things.length == 2)
        assert(picked.things(0)._1 == interface1)
        assert(picked.things(1)._1 == interface1)
        assert(picked.things(0)._2 == scope1)
        assert(picked.things(1)._2 == scope2)
        assert(picked.nonEmpty)
      }

      test("handles different declarations with same scope") {
        val interface1 = createMockInterface("Interface1")
        val interface2 = createMockInterface("Interface2")
        val scope      = createScopedScope(createMockNamespace("TestScope"))
        val picked     = ExpandedMod.Picked(IArray((interface1, scope), (interface2, scope)))

        assert(picked.things.length == 2)
        assert(picked.things(0)._1 == interface1)
        assert(picked.things(1)._1 == interface2)
        assert(picked.things(0)._2 == scope)
        assert(picked.things(1)._2 == scope)
        assert(picked.nonEmpty)
      }
    }

    test("ExpandedMod - Polymorphic Behavior") {
      test("Whole and Picked both extend ExpandedMod") {
        val scope               = createScopedScope(createMockNamespace("TestScope"))
        val whole: ExpandedMod  = ExpandedMod.Whole(Empty, Empty, Empty, scope)
        val picked: ExpandedMod = ExpandedMod.Picked(Empty)

        assert(whole.isInstanceOf[ExpandedMod])
        assert(picked.isInstanceOf[ExpandedMod])
        assert(!whole.nonEmpty)
        assert(!picked.nonEmpty)
      }

      test("nonEmpty method works polymorphically") {
        val interface1 = createMockInterface("Interface1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))

        val wholeEmpty: ExpandedMod     = ExpandedMod.Whole(Empty, Empty, Empty, scope)
        val wholeNonEmpty: ExpandedMod  = ExpandedMod.Whole(IArray(interface1), Empty, Empty, scope)
        val pickedEmpty: ExpandedMod    = ExpandedMod.Picked(Empty)
        val pickedNonEmpty: ExpandedMod = ExpandedMod.Picked(IArray((interface1, scope)))

        assert(!wholeEmpty.nonEmpty)
        assert(wholeNonEmpty.nonEmpty)
        assert(!pickedEmpty.nonEmpty)
        assert(pickedNonEmpty.nonEmpty)
      }
    }

    test("ExpandedMod - Boundary Conditions") {
      test("handles declarations with complex CodePaths") {
        val complexPath = createHasPath("deeply", "nested", "module", "Interface1")
        val interface1  = createMockInterface("Interface1", codePath = complexPath)
        val scope       = createScopedScope(createMockNamespace("TestScope"))

        val whole  = ExpandedMod.Whole(IArray(interface1), Empty, Empty, scope)
        val picked = ExpandedMod.Picked(IArray((interface1, scope)))

        assert(whole.nonEmpty)
        assert(picked.nonEmpty)
        assert(whole.defaults(0).codePath == complexPath)
        assert(picked.things(0)._1.codePath == complexPath)
      }

      test("handles declarations with no CodePath") {
        val interface1 = createMockInterface("Interface1", codePath = CodePath.NoPath)
        val scope      = createScopedScope(createMockNamespace("TestScope"))

        val whole  = ExpandedMod.Whole(IArray(interface1), Empty, Empty, scope)
        val picked = ExpandedMod.Picked(IArray((interface1, scope)))

        assert(whole.nonEmpty)
        assert(picked.nonEmpty)
        assert(whole.defaults(0).codePath == CodePath.NoPath)
        assert(picked.things(0)._1.codePath == CodePath.NoPath)
      }
    }

    test("ExpandedMod - Complex Scenarios") {
      test("handles nested namespaces in scopes") {
        val outerNamespace = createMockNamespace("OuterNamespace")
        val innerNamespace = createMockNamespace("InnerNamespace")
        val interface1     = createMockInterface("Interface1")

        val rootScope  = createMockScope()
        val outerScope = rootScope / outerNamespace
        val innerScope = outerScope / innerNamespace

        val whole  = ExpandedMod.Whole(IArray(interface1), Empty, Empty, innerScope)
        val picked = ExpandedMod.Picked(IArray((interface1, innerScope)))

        assert(whole.nonEmpty)
        assert(picked.nonEmpty)
        assert(whole.scope == innerScope)
        assert(picked.things(0)._2 == innerScope)
      }

      test("handles declarations with complex type parameters") {
        val interface1 = createMockInterface("GenericInterface")
        val scope      = createScopedScope(createMockNamespace("TestScope"))

        val whole  = ExpandedMod.Whole(IArray(interface1), Empty, Empty, scope)
        val picked = ExpandedMod.Picked(IArray((interface1, scope)))

        assert(whole.nonEmpty)
        assert(picked.nonEmpty)
        assert(whole.defaults(0).name.value == "GenericInterface")
        assert(picked.things(0)._1.name.value == "GenericInterface")
      }

      test("handles mixed declared and non-declared declarations") {
        val declaredInterface = TsDeclInterface(
          comments = NoComments,
          declared = true,
          name = createSimpleIdent("DeclaredInterface"),
          tparams = Empty,
          inheritance = Empty,
          members = Empty,
          codePath = CodePath.NoPath
        )
        val regularInterface = createMockInterface("RegularInterface")
        val scope            = createScopedScope(createMockNamespace("TestScope"))

        val whole  = ExpandedMod.Whole(IArray(declaredInterface, regularInterface), Empty, Empty, scope)
        val picked = ExpandedMod.Picked(IArray((declaredInterface, scope), (regularInterface, scope)))

        assert(whole.nonEmpty)
        assert(picked.nonEmpty)
        assert(whole.defaults.length == 2)
        assert(picked.things.length == 2)
      }
    }

    test("ExpandedMod - Stress Tests") {
      test("handles very large Whole with all arrays populated") {
        val defaults   = (1 to 100).map(i => createMockInterface(s"DefaultInterface$i"))
        val namespaced = (1 to 50).map(i => createMockNamespace(s"Namespace$i"))
        val rest       = (1 to 200).map(i => createMockVar(s"var$i"))
        val scope      = createScopedScope(createMockNamespace("TestScope"))

        val whole = ExpandedMod.Whole(
          defaults = IArray.fromTraversable(defaults),
          namespaced = IArray.fromTraversable(namespaced),
          rest = IArray.fromTraversable(rest),
          scope = scope
        )

        assert(whole.defaults.length == 100)
        assert(whole.namespaced.length == 50)
        assert(whole.rest.length == 200)
        assert(whole.nonEmpty)
      }

      test("handles very large Picked with many things") {
        val declarations = (1 to 500).map(i => createMockInterface(s"Interface$i"))
        val scope        = createScopedScope(createMockNamespace("TestScope"))
        val things       = declarations.map(decl => (decl, scope))
        val picked       = ExpandedMod.Picked(IArray.fromTraversable(things))

        assert(picked.things.length == 500)
        assert(picked.nonEmpty)

        // Spot check a few elements
        assert(picked.things(0)._1.name.value == "Interface1")
        assert(picked.things(249)._1.name.value == "Interface250")
        assert(picked.things(499)._1.name.value == "Interface500")
      }
    }

    test("ExpandedMod - Equality and Identity") {
      test("Whole instances with same content are equal") {
        val interface1 = createMockInterface("Interface1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))

        val whole1 = ExpandedMod.Whole(IArray(interface1), Empty, Empty, scope)
        val whole2 = ExpandedMod.Whole(IArray(interface1), Empty, Empty, scope)

        // Note: Case classes provide structural equality
        assert(whole1 == whole2)
        assert(whole1.hashCode == whole2.hashCode)
      }

      test("Picked instances with same content are equal") {
        val interface1 = createMockInterface("Interface1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))

        val picked1 = ExpandedMod.Picked(IArray((interface1, scope)))
        val picked2 = ExpandedMod.Picked(IArray((interface1, scope)))

        // Note: Case classes provide structural equality
        assert(picked1 == picked2)
        assert(picked1.hashCode == picked2.hashCode)
      }

      test("different ExpandedMod types are not equal") {
        val interface1 = createMockInterface("Interface1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))

        val whole  = ExpandedMod.Whole(IArray(interface1), Empty, Empty, scope)
        val picked = ExpandedMod.Picked(IArray((interface1, scope)))

        assert(whole != picked)
        assert(whole.hashCode != picked.hashCode)
      }
    }

    test("ExpandedMod - Pattern Matching") {
      test("can pattern match on Whole") {
        val interface1 = createMockInterface("Interface1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))
        val whole      = ExpandedMod.Whole(IArray(interface1), Empty, Empty, scope)

        val result = whole match {
          case ExpandedMod.Whole(defaults, namespaced, rest, scope) =>
            s"Whole with ${defaults.length} defaults, ${namespaced.length} namespaced, ${rest.length} rest"
          case ExpandedMod.Picked(things) =>
            s"Picked with ${things.length} things"
        }

        assert(result == "Whole with 1 defaults, 0 namespaced, 0 rest")
      }

      test("can pattern match on Picked") {
        val interface1 = createMockInterface("Interface1")
        val scope      = createScopedScope(createMockNamespace("TestScope"))
        val picked     = ExpandedMod.Picked(IArray((interface1, scope)))

        val result = picked match {
          case ExpandedMod.Whole(defaults, namespaced, rest, scope) =>
            s"Whole with ${defaults.length} defaults, ${namespaced.length} namespaced, ${rest.length} rest"
          case ExpandedMod.Picked(things) =>
            s"Picked with ${things.length} things"
        }

        assert(result == "Picked with 1 things")
      }
    }

    test("ExpandedMod - Integration with Real-World Scenarios") {
      test("simulates module expansion scenario") {
        // Simulate a typical module with default exports, namespaced exports, and regular exports
        val defaultClass   = createMockClass("DefaultExport")
        val utilNamespace  = createMockNamespace("Utils")
        val helperFunction = createMockFunction("helperFunction")
        val constantVar    = createMockVar("CONSTANT")
        val typeAlias      = createMockTypeAlias("MyType")

        val moduleScope = createScopedScope(createMockNamespace("MyModule"))

        val expandedMod = ExpandedMod.Whole(
          defaults = IArray(defaultClass),
          namespaced = IArray(utilNamespace),
          rest = IArray(helperFunction, constantVar, typeAlias),
          scope = moduleScope
        )

        assert(expandedMod.nonEmpty)
        assert(expandedMod.defaults.length == 1)
        assert(expandedMod.namespaced.length == 1)
        assert(expandedMod.rest.length == 3)

        // Verify types
        assert(expandedMod.defaults(0).isInstanceOf[TsDeclClass])
        assert(expandedMod.namespaced(0).isInstanceOf[TsDeclNamespace])
        assert(expandedMod.rest(0).isInstanceOf[TsDeclFunction])
        assert(expandedMod.rest(1).isInstanceOf[TsDeclVar])
        assert(expandedMod.rest(2).isInstanceOf[TsDeclTypeAlias])
      }

      test("simulates selective import scenario") {
        // Simulate importing specific items from different modules
        val reactComponent = createMockInterface("Component")
        val reactScope     = createScopedScope(createMockNamespace("React"))

        val lodashFunction = createMockFunction("map")
        val lodashScope    = createScopedScope(createMockNamespace("Lodash"))

        val expandedMod = ExpandedMod.Picked(
          IArray(
            (reactComponent, reactScope),
            (lodashFunction, lodashScope)
          )
        )

        assert(expandedMod.nonEmpty)
        assert(expandedMod.things.length == 2)
        assert(expandedMod.things(0)._1.name.value == "Component")
        assert(expandedMod.things(1)._1.name.value == "map")
      }
    }
  }
}
