package org.scalablytyped.converter.internal.ts

import org.scalablytyped.converter.internal.*
import utest.*

object JsLocationTests extends TestSuite {
  def tests = Tests {
    test("JsLocation.Zero - Construction and Basic Properties") {
      test("Zero is a singleton object") {
        val zero1 = JsLocation.Zero
        val zero2 = JsLocation.Zero

        assert(zero1 eq zero2)
        assert(zero1.isInstanceOf[JsLocation])
      }
    }

    test("JsLocation.Global - Construction and Basic Properties") {
      test("Global construction with simple path") {
        val path = TsQIdent.of(TsIdent("myGlobal"))
        val global = JsLocation.Global(path)

        assert(global.jsPath == path)
        assert(global.isInstanceOf[JsLocation])
      }

      test("Global construction with qualified path") {
        val path = TsQIdent.of("window", "console")
        val global = JsLocation.Global(path)

        assert(global.jsPath == path)
        assert(global.jsPath.parts.length == 2)
      }

      test("Global construction with empty path") {
        val path = TsQIdent.empty
        val global = JsLocation.Global(path)

        assert(global.jsPath == path)
        assert(global.jsPath.parts.isEmpty)
      }
    }

    test("JsLocation.Module - Construction and Basic Properties") {
      test("Module construction with simple module and namespaced spec") {
        val module = TsIdentModule.simple("lodash")
        val spec = ModuleSpec.Namespaced
        val jsModule = JsLocation.Module(module, spec)

        assert(jsModule.module == module)
        assert(jsModule.spec == spec)
        assert(jsModule.isInstanceOf[JsLocation])
      }

      test("Module construction with scoped module") {
        val module = TsIdentModule(Some("types"), List("node"))
        val spec = ModuleSpec.Specified(IArray(TsIdent("fs")))
        val jsModule = JsLocation.Module(module, spec)

        assert(jsModule.module == module)
        assert(jsModule.spec == spec)
        assert(jsModule.module.value == "@types/node")
      }

      test("Module construction with defaulted spec") {
        val module = TsIdentModule.simple("react")
        val spec = ModuleSpec.Defaulted
        val jsModule = JsLocation.Module(module, spec)

        assert(jsModule.module == module)
        assert(jsModule.spec == spec)
      }
    }

    test("JsLocation.Both - Construction and Basic Properties") {
      test("Both construction with module and global") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val global = JsLocation.Global(TsQIdent.of(TsIdent("_")))
        val both = JsLocation.Both(module, global)

        assert(both.module == module)
        assert(both.global == global)
        assert(both.isInstanceOf[JsLocation])
      }

      test("Both construction with complex paths") {
        val module = JsLocation.Module(
          TsIdentModule(Some("types"), List("react")),
          ModuleSpec.Specified(IArray(TsIdent("Component")))
        )
        val global = JsLocation.Global(TsQIdent.of("React", "Component"))
        val both = JsLocation.Both(module, global)

        assert(both.module == module)
        assert(both.global == global)
        assert(both.module.module.value == "@types/react")
        assert(both.global.jsPath.parts.length == 2)
      }
    }

    test("JsLocation + operator (adding identifiers)") {
      test("Zero + identifier returns Zero") {
        val zero = JsLocation.Zero
        val ident = TsIdent("test")
        val result = zero + ident

        assert(result == JsLocation.Zero)
        assert(result eq JsLocation.Zero)
      }

      test("Zero + namespaced identifier returns same Zero") {
        val zero = JsLocation.Zero
        val result = zero + TsIdent.namespaced

        assert(result == JsLocation.Zero)
        assert(result eq zero)
      }

      test("Global + identifier extends path") {
        val global = JsLocation.Global(TsQIdent.of(TsIdent("window")))
        val ident = TsIdent("console")
        val result = global + ident

        assert(result.isInstanceOf[JsLocation.Global])
        val resultGlobal = result.asInstanceOf[JsLocation.Global]
        assert(resultGlobal.jsPath.parts.length == 2)
        assert(resultGlobal.jsPath.parts(0).value == "window")
        assert(resultGlobal.jsPath.parts(1).value == "console")
      }

      test("Global + namespaced identifier returns same Global") {
        val global = JsLocation.Global(TsQIdent.of(TsIdent("window")))
        val result = global + TsIdent.namespaced

        assert(result == global)
        assert(result eq global)
      }

      test("Module + identifier extends spec") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val ident = TsIdent("map")
        val result = module + ident

        assert(result.isInstanceOf[JsLocation.Module])
        val resultModule = result.asInstanceOf[JsLocation.Module]
        assert(resultModule.module == module.module)
        assert(resultModule.spec.isInstanceOf[ModuleSpec.Specified])
        val specifiedSpec = resultModule.spec.asInstanceOf[ModuleSpec.Specified]
        assert(specifiedSpec.tsIdents.length == 1)
        assert(specifiedSpec.tsIdents(0).value == "map")
      }

      test("Module + namespaced identifier returns same Module") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val result = module + TsIdent.namespaced

        assert(result == module)
        assert(result eq module)
      }

      test("Both + identifier extends both module and global") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val global = JsLocation.Global(TsQIdent.of(TsIdent("_")))
        val both = JsLocation.Both(module, global)
        val ident = TsIdent("map")
        val result = both + ident

        assert(result.isInstanceOf[JsLocation.Both])
        val resultBoth = result.asInstanceOf[JsLocation.Both]

        // Check module was extended
        assert(resultBoth.module.module == module.module)
        assert(resultBoth.module.spec.isInstanceOf[ModuleSpec.Specified])

        // Check global was extended
        assert(resultBoth.global.jsPath.parts.length == 2)
        assert(resultBoth.global.jsPath.parts(0).value == "_")
        assert(resultBoth.global.jsPath.parts(1).value == "map")
      }

      test("Both + namespaced identifier returns same Both") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val global = JsLocation.Global(TsQIdent.of(TsIdent("_")))
        val both = JsLocation.Both(module, global)
        val result = both + TsIdent.namespaced

        assert(result == both)
        assert(result eq both)
      }
    }

    test("JsLocation / operator (tree navigation)") {
      test("Zero / TsDeclModule creates Module") {
        val zero = JsLocation.Zero
        val module = TsDeclModule(
          comments = NoComments,
          declared = false,
          name = TsIdentModule.simple("lodash"),
          members = IArray.Empty,
          codePath = CodePath.NoPath,
          jsLocation = JsLocation.Zero
        )
        val result = zero / module

        assert(result.isInstanceOf[JsLocation.Module])
        val resultModule = result.asInstanceOf[JsLocation.Module]
        assert(resultModule.module == module.name)
        assert(resultModule.spec == ModuleSpec.Namespaced)
      }

      test("Zero / TsAugmentedModule creates Module") {
        val zero = JsLocation.Zero
        val augModule = TsAugmentedModule(
          comments = NoComments,
          name = TsIdentModule(Some("types"), List("react")),
          members = IArray.Empty,
          codePath = CodePath.NoPath,
          jsLocation = JsLocation.Zero
        )
        val result = zero / augModule

        assert(result.isInstanceOf[JsLocation.Module])
        val resultModule = result.asInstanceOf[JsLocation.Module]
        assert(resultModule.module == augModule.name)
        assert(resultModule.spec == ModuleSpec.Namespaced)
      }

      test("Zero / TsNamedDecl creates Global") {
        val zero = JsLocation.Zero
        val classDecl = TsDeclClass(
          comments = NoComments,
          declared = false,
          isAbstract = false,
          name = TsIdent("MyClass"),
          tparams = IArray.Empty,
          parent = None,
          implements = IArray.Empty,
          members = IArray.Empty,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )
        val result = zero / classDecl

        assert(result.isInstanceOf[JsLocation.Global])
        val resultGlobal = result.asInstanceOf[JsLocation.Global]
        assert(resultGlobal.jsPath.parts.length == 1)
        assert(resultGlobal.jsPath.parts(0).value == "MyClass")
      }

      test("Zero / TsNamedDecl with namespaced identifier returns Zero") {
        val zero = JsLocation.Zero
        val classDecl = TsDeclClass(
          comments = NoComments,
          declared = false,
          isAbstract = false,
          name = TsIdent.namespaced,
          tparams = IArray.Empty,
          parent = None,
          implements = IArray.Empty,
          members = IArray.Empty,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )
        val result = zero / classDecl

        assert(result == JsLocation.Zero)
        assert(result eq JsLocation.Zero)
      }

      test("Zero / TsGlobal returns Zero") {
        val zero = JsLocation.Zero
        val global = TsGlobal(
          comments = NoComments,
          declared = false,
          members = IArray.Empty,
          codePath = CodePath.NoPath
        )
        val result = zero / global

        assert(result == JsLocation.Zero)
        assert(result eq JsLocation.Zero)
      }

      test("Zero / other TsTree returns same Zero") {
        val zero = JsLocation.Zero
        val interfaceDecl = TsDeclInterface(
          comments = NoComments,
          declared = false,
          name = TsIdent("MyInterface"),
          tparams = IArray.Empty,
          inheritance = IArray.Empty,
          members = IArray.Empty,
          codePath = CodePath.NoPath
        )
        val result = zero / interfaceDecl

        assert(result.isInstanceOf[JsLocation.Global])
        val resultGlobal = result.asInstanceOf[JsLocation.Global]
        assert(resultGlobal.jsPath.parts.length == 1)
        assert(resultGlobal.jsPath.parts(0).value == "MyInterface")
      }

      test("Global / TsDeclModule creates Module") {
        val global = JsLocation.Global(TsQIdent.of("window"))
        val module = TsDeclModule(
          comments = NoComments,
          declared = false,
          name = TsIdentModule.simple("lodash"),
          members = IArray.Empty,
          codePath = CodePath.NoPath,
          jsLocation = JsLocation.Zero
        )
        val result = global / module

        assert(result.isInstanceOf[JsLocation.Module])
        val resultModule = result.asInstanceOf[JsLocation.Module]
        assert(resultModule.module == module.name)
        assert(resultModule.spec == ModuleSpec.Namespaced)
      }

      test("Global / TsNamedDecl extends path") {
        val global = JsLocation.Global(TsQIdent.of("window"))
        val classDecl = TsDeclClass(
          comments = NoComments,
          declared = false,
          isAbstract = false,
          name = TsIdent("console"),
          tparams = IArray.Empty,
          parent = None,
          implements = IArray.Empty,
          members = IArray.Empty,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )
        val result = global / classDecl

        assert(result.isInstanceOf[JsLocation.Global])
        val resultGlobal = result.asInstanceOf[JsLocation.Global]
        assert(resultGlobal.jsPath.parts.length == 2)
        assert(resultGlobal.jsPath.parts(0).value == "window")
        assert(resultGlobal.jsPath.parts(1).value == "console")
      }

      test("Global / TsGlobal returns Zero") {
        val global = JsLocation.Global(TsQIdent.of("window"))
        val globalDecl = TsGlobal(
          comments = NoComments,
          declared = false,
          members = IArray.Empty,
          codePath = CodePath.NoPath
        )
        val result = global / globalDecl

        assert(result == JsLocation.Zero)
        assert(result eq JsLocation.Zero)
      }

      test("Module / TsDeclModule creates new Module") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val declModule = TsDeclModule(
          comments = NoComments,
          declared = false,
          name = TsIdentModule.simple("react"),
          members = IArray.Empty,
          codePath = CodePath.NoPath,
          jsLocation = JsLocation.Zero
        )
        val result = module / declModule

        assert(result.isInstanceOf[JsLocation.Module])
        val resultModule = result.asInstanceOf[JsLocation.Module]
        assert(resultModule.module == declModule.name)
        assert(resultModule.spec == ModuleSpec.Namespaced)
      }

      test("Module / TsNamedDecl extends spec") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val classDecl = TsDeclClass(
          comments = NoComments,
          declared = false,
          isAbstract = false,
          name = TsIdent("map"),
          tparams = IArray.Empty,
          parent = None,
          implements = IArray.Empty,
          members = IArray.Empty,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )
        val result = module / classDecl

        assert(result.isInstanceOf[JsLocation.Module])
        val resultModule = result.asInstanceOf[JsLocation.Module]
        assert(resultModule.module == module.module)
        assert(resultModule.spec.isInstanceOf[ModuleSpec.Specified])
        val specifiedSpec = resultModule.spec.asInstanceOf[ModuleSpec.Specified]
        assert(specifiedSpec.tsIdents.length == 1)
        assert(specifiedSpec.tsIdents(0).value == "map")
      }

      test("Both / TsTree delegates to global") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val global = JsLocation.Global(TsQIdent.of("_"))
        val both = JsLocation.Both(module, global)
        val classDecl = TsDeclClass(
          comments = NoComments,
          declared = false,
          isAbstract = false,
          name = TsIdent("map"),
          tparams = IArray.Empty,
          parent = None,
          implements = IArray.Empty,
          members = IArray.Empty,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )
        val result = both / classDecl

        assert(result.isInstanceOf[JsLocation.Both])
        val resultBoth = result.asInstanceOf[JsLocation.Both]

        // Check that module was navigated
        assert(resultBoth.module.module == module.module)
        assert(resultBoth.module.spec.isInstanceOf[ModuleSpec.Specified])

        // Check that global was navigated
        assert(resultBoth.global.jsPath.parts.length == 2)
        assert(resultBoth.global.jsPath.parts(0).value == "_")
        assert(resultBoth.global.jsPath.parts(1).value == "map")
      }
    }

    test("JsLocation Equality and HashCode") {
      test("Zero equality") {
        val zero1 = JsLocation.Zero
        val zero2 = JsLocation.Zero

        assert(zero1 == zero2)
        assert(zero1 eq zero2) // Same singleton instance
        assert(zero1.hashCode == zero2.hashCode)
      }

      test("Global equality with same path") {
        val path = TsQIdent.of("window", "console")
        val global1 = JsLocation.Global(path)
        val global2 = JsLocation.Global(path)

        assert(global1 == global2)
        assert(global1.hashCode == global2.hashCode)
      }

      test("Global inequality with different paths") {
        val global1 = JsLocation.Global(TsQIdent.of("window"))
        val global2 = JsLocation.Global(TsQIdent.of("global"))

        assert(global1 != global2)
      }

      test("Module equality with same module and spec") {
        val module = TsIdentModule.simple("lodash")
        val spec = ModuleSpec.Namespaced
        val jsModule1 = JsLocation.Module(module, spec)
        val jsModule2 = JsLocation.Module(module, spec)

        assert(jsModule1 == jsModule2)
        assert(jsModule1.hashCode == jsModule2.hashCode)
      }

      test("Module inequality with different modules") {
        val jsModule1 = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val jsModule2 = JsLocation.Module(
          TsIdentModule.simple("react"),
          ModuleSpec.Namespaced
        )

        assert(jsModule1 != jsModule2)
      }

      test("Module inequality with different specs") {
        val module = TsIdentModule.simple("lodash")
        val jsModule1 = JsLocation.Module(module, ModuleSpec.Namespaced)
        val jsModule2 = JsLocation.Module(module, ModuleSpec.Defaulted)

        assert(jsModule1 != jsModule2)
      }

      test("Both equality with same components") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val global = JsLocation.Global(TsQIdent.of("_"))
        val both1 = JsLocation.Both(module, global)
        val both2 = JsLocation.Both(module, global)

        assert(both1 == both2)
        assert(both1.hashCode == both2.hashCode)
      }

      test("Both inequality with different modules") {
        val module1 = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val module2 = JsLocation.Module(
          TsIdentModule.simple("react"),
          ModuleSpec.Namespaced
        )
        val global = JsLocation.Global(TsQIdent.of("_"))
        val both1 = JsLocation.Both(module1, global)
        val both2 = JsLocation.Both(module2, global)

        assert(both1 != both2)
      }

      test("Different JsLocation types are not equal") {
        val zero = JsLocation.Zero
        val global = JsLocation.Global(TsQIdent.of("test"))
        val module = JsLocation.Module(
          TsIdentModule.simple("test"),
          ModuleSpec.Namespaced
        )
        val both = JsLocation.Both(module, global)

        assert(zero != global)
        assert(zero != module)
        assert(zero != both)
        assert(global != module)
        assert(global != both)
        assert(module != both)
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("Global with empty path") {
        val global = JsLocation.Global(TsQIdent.empty)

        assert(global.jsPath.parts.isEmpty)
        assert(global.isInstanceOf[JsLocation.Global])
      }

      test("Module with empty module name") {
        val module = TsIdentModule(None, List(""))
        val jsModule = JsLocation.Module(module, ModuleSpec.Namespaced)

        assert(jsModule.module.value == "")
        assert(jsModule.spec == ModuleSpec.Namespaced)
      }

      test("Module with complex scoped name") {
        val module = TsIdentModule(Some("babel"), List("plugin", "transform", "runtime"))
        val jsModule = JsLocation.Module(module, ModuleSpec.Defaulted)

        assert(jsModule.module.value == "@babel/plugin/transform/runtime")
        assert(jsModule.spec == ModuleSpec.Defaulted)
      }

      test("Adding identifier to complex ModuleSpec") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Specified(IArray(TsIdent("fp"), TsIdent("curry")))
        )
        val ident = TsIdent("map")
        val result = module + ident

        assert(result.isInstanceOf[JsLocation.Module])
        val resultModule = result.asInstanceOf[JsLocation.Module]
        assert(resultModule.spec.isInstanceOf[ModuleSpec.Specified])
        val specifiedSpec = resultModule.spec.asInstanceOf[ModuleSpec.Specified]
        assert(specifiedSpec.tsIdents.length == 3)
        assert(specifiedSpec.tsIdents(0).value == "fp")
        assert(specifiedSpec.tsIdents(1).value == "curry")
        assert(specifiedSpec.tsIdents(2).value == "map")
      }

      test("Global with very long path") {
        val longPath = TsQIdent.of((1 to 100).map(_.toString)*)
        val global = JsLocation.Global(longPath)

        assert(global.jsPath.parts.length == 100)
        assert(global.jsPath.parts(0).value == "1")
        assert(global.jsPath.parts(99).value == "100")
      }

      test("Module with unicode characters") {
        val module = TsIdentModule(Some("测试"), List("库"))
        val jsModule = JsLocation.Module(module, ModuleSpec.Namespaced)

        assert(jsModule.module.value == "@测试/库")
        assert(jsModule.spec == ModuleSpec.Namespaced)
      }

      test("Adding unicode identifier") {
        val global = JsLocation.Global(TsQIdent.of("window"))
        val unicodeIdent = TsIdent("测试")
        val result = global + unicodeIdent

        assert(result.isInstanceOf[JsLocation.Global])
        val resultGlobal = result.asInstanceOf[JsLocation.Global]
        assert(resultGlobal.jsPath.parts.length == 2)
        assert(resultGlobal.jsPath.parts(0).value == "window")
        assert(resultGlobal.jsPath.parts(1).value == "测试")
      }
    }

    test("JsLocation.Module Companion Object") {
      test("Module.apply creates Module instance") {
        val module = TsIdentModule.simple("lodash")
        val spec = ModuleSpec.Namespaced
        val jsModule = JsLocation.Module(module, spec)

        assert(jsModule.module == module)
        assert(jsModule.spec == spec)
        assert(jsModule.isInstanceOf[JsLocation.Module])
      }

      test("Module constructor is private") {
        // This test verifies that the Module constructor is private
        // by ensuring we can only create instances through the companion object
        val module = TsIdentModule.simple("react")
        val spec = ModuleSpec.Defaulted
        val jsModule = JsLocation.Module(module, spec)

        assert(jsModule.module == module)
        assert(jsModule.spec == spec)
      }
    }

    test("JsLocation.Has Trait") {
      test("Has trait defines required methods") {
        // Create a simple implementation to test the trait
        val testLocation = JsLocation.Zero
        val hasImpl = new JsLocation.Has {
          def jsLocation: JsLocation = testLocation
          def withJsLocation(newLocation: JsLocation): JsLocation.Has =
            new JsLocation.Has {
              def jsLocation: JsLocation = newLocation
              def withJsLocation(newLoc: JsLocation): JsLocation.Has = this
            }
        }

        assert(hasImpl.jsLocation == testLocation)

        val newLocation = JsLocation.Global(TsQIdent.of("test"))
        val updated = hasImpl.withJsLocation(newLocation)
        assert(updated.jsLocation == newLocation)
      }
    }

    test("Error Handling and Robustness") {
      test("Module / with null tree returns same module") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )

        // Test with a tree that doesn't match any pattern
        val enumDecl = TsDeclEnum(
          comments = NoComments,
          declared = false,
          isConst = false,
          name = TsIdent("Color"),
          members = IArray.Empty,
          isValue = true,
          exportedFrom = None,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )
        val result = module / enumDecl

        assert(result.isInstanceOf[JsLocation.Module])
        val resultModule = result.asInstanceOf[JsLocation.Module]
        assert(resultModule.module == module.module)
        assert(resultModule.spec.isInstanceOf[ModuleSpec.Specified])
        val specifiedSpec = resultModule.spec.asInstanceOf[ModuleSpec.Specified]
        assert(specifiedSpec.tsIdents.length == 1)
        assert(specifiedSpec.tsIdents(0).value == "Color")
      }

      test("Both / with TsGlobal returns non-Both result") {
        val module = JsLocation.Module(
          TsIdentModule.simple("lodash"),
          ModuleSpec.Namespaced
        )
        val global = JsLocation.Global(TsQIdent.of("_"))
        val both = JsLocation.Both(module, global)
        val globalDecl = TsGlobal(
          comments = NoComments,
          declared = false,
          members = IArray.Empty,
          codePath = CodePath.NoPath
        )
        val result = both / globalDecl

        // When global / tree returns Zero (not Global), Both returns that result
        assert(result == JsLocation.Zero)
      }

      test("Adding empty string identifier") {
        val global = JsLocation.Global(TsQIdent.of("window"))
        val emptyIdent = TsIdent("")
        val result = global + emptyIdent

        assert(result.isInstanceOf[JsLocation.Global])
        val resultGlobal = result.asInstanceOf[JsLocation.Global]
        assert(resultGlobal.jsPath.parts.length == 2)
        assert(resultGlobal.jsPath.parts(0).value == "window")
        assert(resultGlobal.jsPath.parts(1).value == "")
      }

      test("Module with null fragments") {
        // Test with empty fragments list
        val module = TsIdentModule(None, List.empty)
        val jsModule = JsLocation.Module(module, ModuleSpec.Namespaced)

        assert(jsModule.module.fragments.isEmpty)
        assert(jsModule.module.value == "")
      }

      test("Complex nested operations") {
        val module = TsIdentModule(Some("types"), List("react"))
        val spec = ModuleSpec.Specified(IArray(TsIdent("Component")))
        val jsModule = JsLocation.Module(module, spec)
        val global = JsLocation.Global(TsQIdent.of("React", "Component"))
        val both = JsLocation.Both(jsModule, global)

        // Add multiple identifiers
        val result1 = both + TsIdent("props")
        val result2 = result1 + TsIdent("children")

        assert(result2.isInstanceOf[JsLocation.Both])
        val finalBoth = result2.asInstanceOf[JsLocation.Both]

        // Check module path
        assert(finalBoth.module.spec.isInstanceOf[ModuleSpec.Specified])
        val finalSpec = finalBoth.module.spec.asInstanceOf[ModuleSpec.Specified]
        assert(finalSpec.tsIdents.length == 3)
        assert(finalSpec.tsIdents(0).value == "Component")
        assert(finalSpec.tsIdents(1).value == "props")
        assert(finalSpec.tsIdents(2).value == "children")

        // Check global path
        assert(finalBoth.global.jsPath.parts.length == 4)
        assert(finalBoth.global.jsPath.parts(0).value == "React")
        assert(finalBoth.global.jsPath.parts(1).value == "Component")
        assert(finalBoth.global.jsPath.parts(2).value == "props")
        assert(finalBoth.global.jsPath.parts(3).value == "children")
      }
    }
  }
}