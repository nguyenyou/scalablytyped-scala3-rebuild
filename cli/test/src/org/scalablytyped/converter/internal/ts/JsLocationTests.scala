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
  }
}