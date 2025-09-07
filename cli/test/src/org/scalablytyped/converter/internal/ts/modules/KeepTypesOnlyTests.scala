package org.scalablytyped.converter.internal
package ts
package modules

import utest.*
import TestUtils.*

object KeepTypesOnlyTests extends TestSuite {

  // Helper methods for creating test data specific to KeepTypesOnly tests

  def createMockFunction(name: String): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(TsTypeRef.string)
      ),
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockVar(name: String): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = Some(TsTypeRef.string),
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockClass(name: String, members: IArray[TsMember] = Empty): TsDeclClass =
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
      codePath = CodePath.NoPath
    )

  def createMockEnum(name: String, isValue: Boolean = true): TsDeclEnum =
    TsDeclEnum(
      comments = NoComments,
      declared = false,
      isConst = false,
      name = createSimpleIdent(name),
      members = Empty,
      isValue = isValue,
      exportedFrom = None,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockNamespace(name: String, members: IArray[TsContainerOrDecl] = Empty): TsDeclNamespace =
    TsDeclNamespace(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      members = members,
      codePath = CodePath.NoPath,
      jsLocation = JsLocation.Zero
    )

  def createMockAugmentedModule(name: String, members: IArray[TsContainerOrDecl] = Empty): TsAugmentedModule =
    TsAugmentedModule(
      comments = NoComments,
      name = TsIdentModule(None, List(name)),
      members = members,
      codePath = CodePath.NoPath,
      jsLocation = JsLocation.Zero
    )

  def createMockExport(decl: TsDecl): TsExport =
    TsExport(
      comments = NoComments,
      typeOnly = false,
      tpe = ExportType.Named,
      exported = TsExportee.Tree(decl)
    )

  def tests = Tests {
    test("KeepTypesOnly - Basic Functionality") {
      test("apply method exists") {
        // Test that the apply method exists and can be called
        val interface = createMockInterface("TestInterface")
        val result    = KeepTypesOnly.apply(interface)
        assert(result.isDefined)
      }

      test("named method exists") {
        // Test that the named method exists and can be called
        val interface = createMockInterface("TestInterface")
        val result    = KeepTypesOnly.named(interface)
        assert(result.isDefined)
      }
    }

    test("KeepTypesOnly - Type Declarations (Should Keep)") {
      test("keeps interfaces unchanged") {
        val interface = createMockInterface("TestInterface")
        val result    = KeepTypesOnly.apply(interface)

        assert(result.isDefined)
        assert(result.get == interface)
      }

      test("keeps type aliases unchanged") {
        val typeAlias = createMockTypeAlias("TestType")
        val result    = KeepTypesOnly.apply(typeAlias)

        assert(result.isDefined)
        assert(result.get == typeAlias)
      }

      test("keeps enums but sets isValue to false") {
        val enumDecl = createMockEnum("TestEnum", isValue = true)
        val result   = KeepTypesOnly.apply(enumDecl)

        assert(result.isDefined)
        result.get match {
          case e: TsDeclEnum =>
            assert(e.name == enumDecl.name)
            assert(e.isValue == false) // Should be set to false
          case _ => assert(false)
        }
      }

      test("transforms classes to interfaces") {
        val staticProperty   = createMockProperty("staticProp").copy(isStatic = true)
        val instanceProperty = createMockProperty("instanceProp").copy(isStatic = false)
        val constructor = TsMemberCtor(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          signature = TsFunSig(NoComments, Empty, Empty, None)
        )
        val staticMethod      = createMockMethod("staticMethod").copy(isStatic = true)
        val instanceMethod    = createMockMethod("instanceMethod").copy(isStatic = false)
        val constructorMethod = createMockMethod("constructor").copy(name = TsIdent.constructor)

        val members =
          IArray(staticProperty, instanceProperty, constructor, staticMethod, instanceMethod, constructorMethod)
        val clazz  = createMockClass("TestClass", members)
        val result = KeepTypesOnly.apply(clazz)

        assert(result.isDefined)
        result.get match {
          case interface: TsDeclInterface =>
            assert(interface.name == clazz.name)
            // Should only keep non-static members, excluding constructors
            assert(interface.members.length == 2) // instanceProperty and instanceMethod
            assert(interface.members.exists {
              case prop: TsMemberProperty => prop.name.value == "instanceProp"
              case _                      => false
            })
            assert(interface.members.exists {
              case func: TsMemberFunction => func.name.value == "instanceMethod"
              case _                      => false
            })
          case _ => assert(false)
        }
      }
    }

    test("KeepTypesOnly - Value Declarations (Should Remove)") {
      test("removes function declarations") {
        val function = createMockFunction("testFunction")
        val result   = KeepTypesOnly.apply(function)

        assert(result.isEmpty)
      }

      test("removes variable declarations") {
        val variable = createMockVar("testVar")
        val result   = KeepTypesOnly.apply(variable)

        assert(result.isEmpty)
      }
    }

    test("KeepTypesOnly - Container Declarations") {
      test("filters namespace members recursively") {
        val interface = createMockInterface("KeepMe")
        val function  = createMockFunction("RemoveMe")
        val variable  = createMockVar("AlsoRemoveMe")
        val typeAlias = createMockTypeAlias("AlsoKeepMe")

        val members   = IArray[TsContainerOrDecl](interface, function, variable, typeAlias)
        val namespace = createMockNamespace("TestNamespace", members)
        val result    = KeepTypesOnly.apply(namespace)

        assert(result.isDefined)
        result.get match {
          case ns: TsDeclNamespace =>
            assert(ns.name == namespace.name)
            assert(ns.members.length == 2) // Only interface and typeAlias should remain
            assert(ns.members.exists {
              case interface: TsDeclInterface => interface.name.value == "KeepMe"
              case _                          => false
            })
            assert(ns.members.exists {
              case typeAlias: TsDeclTypeAlias => typeAlias.name.value == "AlsoKeepMe"
              case _                          => false
            })
          case _ => assert(false)
        }
      }

      test("keeps empty namespace after filtering") {
        val function = createMockFunction("RemoveMe")
        val variable = createMockVar("AlsoRemoveMe")

        val members   = IArray[TsContainerOrDecl](function, variable)
        val namespace = createMockNamespace("EmptyNamespace", members)
        val result    = KeepTypesOnly.apply(namespace)

        assert(result.isDefined) // Namespace is kept even when empty
        result.get match {
          case ns: TsDeclNamespace =>
            assert(ns.name == namespace.name)
            assert(ns.members.isEmpty) // All members should be removed
          case _ => assert(false)
        }
      }

      test("filters augmented module members recursively") {
        val interface = createMockInterface("KeepMe")
        val function  = createMockFunction("RemoveMe")

        val members         = IArray[TsContainerOrDecl](interface, function)
        val augmentedModule = createMockAugmentedModule("TestModule", members)
        val result          = KeepTypesOnly.apply(augmentedModule)

        assert(result.isDefined)
        result.get match {
          case am: TsAugmentedModule =>
            assert(am.name == augmentedModule.name)
            assert(am.members.length == 1) // Only interface should remain
            assert(am.members.exists(_.asInstanceOf[TsDeclInterface].name.value == "KeepMe"))
          case _ => assert(false)
        }
      }

      test("keeps empty augmented module after filtering") {
        val function = createMockFunction("RemoveMe")
        val variable = createMockVar("AlsoRemoveMe")

        val members         = IArray[TsContainerOrDecl](function, variable)
        val augmentedModule = createMockAugmentedModule("EmptyModule", members)
        val result          = KeepTypesOnly.apply(augmentedModule)

        assert(result.isDefined) // Module is kept even when empty
        result.get match {
          case am: TsAugmentedModule =>
            assert(am.name == augmentedModule.name)
            assert(am.members.isEmpty) // All members should be removed
          case _ => assert(false)
        }
      }
    }

    test("KeepTypesOnly - Export Handling") {
      test("processes exports with Tree exportee") {
        val interface  = createMockInterface("ExportedInterface")
        val exportDecl = createMockExport(interface)
        val result     = KeepTypesOnly.apply(exportDecl)

        assert(result.isDefined)
        result.get match {
          case e: TsExport =>
            assert(e.exported.isInstanceOf[TsExportee.Tree])
            val tree = e.exported.asInstanceOf[TsExportee.Tree]
            assert(tree.decl.asInstanceOf[TsDeclInterface].name.value == "ExportedInterface")
          case _ => assert(false)
        }
      }

      test("transforms exported class to interface") {
        val clazz      = createMockClass("ExportedClass")
        val exportDecl = createMockExport(clazz)
        val result     = KeepTypesOnly.apply(exportDecl)

        assert(result.isDefined)
        result.get match {
          case e: TsExport =>
            assert(e.exported.isInstanceOf[TsExportee.Tree])
            val tree = e.exported.asInstanceOf[TsExportee.Tree]
            assert(tree.decl.isInstanceOf[TsDeclInterface])
            assert(tree.decl.asInstanceOf[TsDeclInterface].name.value == "ExportedClass")
          case _ => assert(false)
        }
      }

      test("removes exports of value declarations") {
        val function   = createMockFunction("ExportedFunction")
        val exportDecl = createMockExport(function)
        val result     = KeepTypesOnly.apply(exportDecl)

        // The export should be removed because the inner function is removed
        assert(result.isEmpty)
      }
    }

    test("KeepTypesOnly - Edge Cases and Complex Scenarios") {
      test("handles nested namespaces") {
        val innerInterface = createMockInterface("InnerInterface")
        val innerFunction  = createMockFunction("InnerFunction")
        val innerNamespace = createMockNamespace("InnerNamespace", IArray(innerInterface, innerFunction))

        val outerInterface = createMockInterface("OuterInterface")
        val outerNamespace = createMockNamespace("OuterNamespace", IArray(outerInterface, innerNamespace))

        val result = KeepTypesOnly.apply(outerNamespace)

        assert(result.isDefined)
        result.get match {
          case ns: TsDeclNamespace =>
            assert(ns.members.length == 2) // outerInterface and filtered innerNamespace
            val filteredInner = ns.members.find {
              case innerNs: TsDeclNamespace => innerNs.name.value == "InnerNamespace"
              case _                        => false
            }
            assert(filteredInner.isDefined)
            val innerNs = filteredInner.get.asInstanceOf[TsDeclNamespace]
            assert(innerNs.members.length == 1) // Only innerInterface should remain
          case _ => assert(false)
        }
      }

      test("handles mixed container types") {
        val interface = createMockInterface("TestInterface")
        val clazz     = createMockClass("TestClass")
        val function  = createMockFunction("TestFunction")
        val typeAlias = createMockTypeAlias("TestType")

        val declarations = IArray[TsContainerOrDecl](interface, clazz, function, typeAlias)

        val results = declarations.map(KeepTypesOnly.apply)

        // Interface and type alias should be kept unchanged
        assert(results(0).isDefined && results(0).get.isInstanceOf[TsDeclInterface])
        assert(results(3).isDefined && results(3).get.isInstanceOf[TsDeclTypeAlias])

        // Class should be transformed to interface
        assert(results(1).isDefined && results(1).get.isInstanceOf[TsDeclInterface])

        // Function should be removed
        assert(results(2).isEmpty)
      }

      test("handles empty containers") {
        val emptyNamespace = createMockNamespace("EmptyNamespace", Empty)
        val result         = KeepTypesOnly.apply(emptyNamespace)

        // Empty namespace should be kept (it's already empty)
        assert(result.isDefined)
        result.get match {
          case ns: TsDeclNamespace =>
            assert(ns.members.isEmpty)
          case _ => assert(false)
        }
      }

      test("preserves non-named declarations") {
        // Test with a non-TsNamedDecl (this tests the "other" case in apply)
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = Empty,
          codePath = CodePath.NoPath
        )

        val result = KeepTypesOnly.apply(parsedFile)
        assert(result.isDefined)
        assert(result.get == parsedFile) // Should be returned unchanged
      }

      test("handles class with complex member types") {
        val staticProperty   = createMockProperty("staticProp").copy(isStatic = true)
        val instanceProperty = createMockProperty("instanceProp").copy(isStatic = false)
        val readOnlyProperty = createMockProperty("readOnlyProp").copy(isStatic = false, isReadOnly = true)
        val constructor = TsMemberCtor(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          signature = TsFunSig(NoComments, Empty, Empty, None)
        )
        val staticMethod      = createMockMethod("staticMethod").copy(isStatic = true)
        val instanceMethod    = createMockMethod("instanceMethod").copy(isStatic = false)
        val constructorMethod = createMockMethod("constructor").copy(name = TsIdent.constructor)

        val members = IArray(
          staticProperty,
          instanceProperty,
          readOnlyProperty,
          constructor,
          staticMethod,
          instanceMethod,
          constructorMethod
        )
        val clazz  = createMockClass("ComplexClass", members)
        val result = KeepTypesOnly.apply(clazz)

        assert(result.isDefined)
        result.get match {
          case interface: TsDeclInterface =>
            assert(interface.name == clazz.name)
            // Should only keep non-static members, excluding constructors
            assert(interface.members.length == 3) // instanceProperty, readOnlyProperty, instanceMethod
            assert(interface.members.exists {
              case prop: TsMemberProperty => prop.name.value == "instanceProp"
              case _                      => false
            })
            assert(interface.members.exists {
              case prop: TsMemberProperty => prop.name.value == "readOnlyProp"
              case _                      => false
            })
            assert(interface.members.exists {
              case func: TsMemberFunction => func.name.value == "instanceMethod"
              case _                      => false
            })
          case _ => assert(false)
        }
      }
    }
  }
}
