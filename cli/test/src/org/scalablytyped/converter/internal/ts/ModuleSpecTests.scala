package org.scalablytyped.converter.internal
package ts

import utest.*

object ModuleSpecTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createModuleIdent(name: String): TsIdentModule = TsIdentModule.simple(name)

  def tests = Tests {
    test("ModuleSpec Factory Methods") {
      test("apply with default identifier") {
        val spec = ModuleSpec(TsIdent.default)
        
        assert(spec == ModuleSpec.Defaulted)
        assert(spec.isInstanceOf[ModuleSpec.Defaulted.type])
      }

      test("apply with namespaced identifier") {
        val spec = ModuleSpec(TsIdent.namespaced)
        
        assert(spec == ModuleSpec.Namespaced)
        assert(spec.isInstanceOf[ModuleSpec.Namespaced.type])
      }

      test("apply with regular simple identifier") {
        val ident = createSimpleIdent("test")
        val spec = ModuleSpec(ident)
        
        assert(spec.isInstanceOf[ModuleSpec.Specified])
        val specified = spec.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head == ident)
      }

      test("apply with module identifier") {
        val ident = createModuleIdent("lodash")
        val spec = ModuleSpec(ident)
        
        assert(spec.isInstanceOf[ModuleSpec.Specified])
        val specified = spec.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head == ident)
      }

      test("apply with import identifier") {
        val moduleIdent = createModuleIdent("react")
        val importIdent = TsIdentImport(moduleIdent)
        val spec = ModuleSpec(importIdent)
        
        assert(spec.isInstanceOf[ModuleSpec.Specified])
        val specified = spec.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head == importIdent)
      }
    }

    test("Addition Operator (+) - Defaulted") {
      test("Defaulted + regular identifier") {
        val ident = createSimpleIdent("test")
        val result = ModuleSpec.Defaulted + ident
        
        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 2)
        assert(specified.tsIdents(0) == TsIdent.default)
        assert(specified.tsIdents(1) == ident)
      }

      test("Defaulted + namespaced identifier") {
        val result = ModuleSpec.Defaulted + TsIdent.namespaced
        
        assert(result == ModuleSpec.Defaulted)
        assert(result.isInstanceOf[ModuleSpec.Defaulted.type])
      }

      test("Defaulted + default identifier") {
        val result = ModuleSpec.Defaulted + TsIdent.default
        
        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 2)
        assert(specified.tsIdents(0) == TsIdent.default)
        assert(specified.tsIdents(1) == TsIdent.default)
      }

      test("Defaulted + module identifier") {
        val moduleIdent = createModuleIdent("express")
        val result = ModuleSpec.Defaulted + moduleIdent
        
        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 2)
        assert(specified.tsIdents(0) == TsIdent.default)
        assert(specified.tsIdents(1) == moduleIdent)
      }
    }

    test("Addition Operator (+) - Namespaced") {
      test("Namespaced + regular identifier") {
        val ident = createSimpleIdent("Component")
        val result = ModuleSpec.Namespaced + ident
        
        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head == ident)
      }

      test("Namespaced + namespaced identifier") {
        val result = ModuleSpec.Namespaced + TsIdent.namespaced
        
        assert(result == ModuleSpec.Namespaced)
        assert(result.isInstanceOf[ModuleSpec.Namespaced.type])
      }

      test("Namespaced + default identifier") {
        val result = ModuleSpec.Namespaced + TsIdent.default
        
        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head == TsIdent.default)
      }

      test("Namespaced + multiple identifiers in sequence") {
        val ident1 = createSimpleIdent("React")
        val ident2 = createSimpleIdent("Component")
        val result = ModuleSpec.Namespaced + ident1 + ident2
        
        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 2)
        assert(specified.tsIdents(0) == ident1)
        assert(specified.tsIdents(1) == ident2)
      }
    }

    test("Addition Operator (+) - Specified") {
      test("Specified + regular identifier") {
        val ident1 = createSimpleIdent("first")
        val ident2 = createSimpleIdent("second")
        val initial = ModuleSpec.Specified(IArray(ident1))
        val result = initial + ident2
        
        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 2)
        assert(specified.tsIdents(0) == ident1)
        assert(specified.tsIdents(1) == ident2)
      }

      test("Specified + namespaced identifier") {
        val ident = createSimpleIdent("existing")
        val initial = ModuleSpec.Specified(IArray(ident))
        val result = initial + TsIdent.namespaced
        
        assert(result == initial)
        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head == ident)
      }

      test("Specified + multiple identifiers") {
        val ident1 = createSimpleIdent("first")
        val ident2 = createSimpleIdent("second")
        val ident3 = createSimpleIdent("third")
        val initial = ModuleSpec.Specified(IArray(ident1))
        val result = initial + ident2 + ident3
        
        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 3)
        assert(specified.tsIdents(0) == ident1)
        assert(specified.tsIdents(1) == ident2)
        assert(specified.tsIdents(2) == ident3)
      }

      test("Specified with empty IArray + identifier") {
        val ident = createSimpleIdent("test")
        val initial = ModuleSpec.Specified(IArray.Empty)
        val result = initial + ident
        
        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head == ident)
      }
    }

    test("Special Identifier Handling") {
      test("namespaced identifier preserves original spec") {
        val specs = List(
          ModuleSpec.Defaulted,
          ModuleSpec.Namespaced,
          ModuleSpec.Specified(IArray(createSimpleIdent("test")))
        )
        
        specs.foreach { spec =>
          val result = spec + TsIdent.namespaced
          assert(result == spec)
        }
      }

      test("default identifier behavior") {
        // Test that default identifier is treated as regular identifier in + operations
        val defaultResult = ModuleSpec.Namespaced + TsIdent.default
        assert(defaultResult.isInstanceOf[ModuleSpec.Specified])
        
        val specified = defaultResult.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head == TsIdent.default)
      }

      test("special identifiers in factory method") {
        // Test various special identifiers from TsIdent object
        val globalIdent = TsIdent.Global
        val applyIdent = TsIdent.Apply
        val prototypeIdent = TsIdent.prototype
        
        List(globalIdent, applyIdent, prototypeIdent).foreach { ident =>
          val spec = ModuleSpec(ident)
          assert(spec.isInstanceOf[ModuleSpec.Specified])
          val specified = spec.asInstanceOf[ModuleSpec.Specified]
          assert(specified.tsIdents.length == 1)
          assert(specified.tsIdents.head == ident)
        }
      }
    }

    test("Equality and Identity") {
      test("case objects are singletons") {
        val defaulted1 = ModuleSpec.Defaulted
        val defaulted2 = ModuleSpec.Defaulted
        val namespaced1 = ModuleSpec.Namespaced
        val namespaced2 = ModuleSpec.Namespaced
        
        assert(defaulted1 eq defaulted2)
        assert(namespaced1 eq namespaced2)
        assert(defaulted1 == defaulted2)
        assert(namespaced1 == namespaced2)
      }

      test("Specified equality with same contents") {
        val ident1 = createSimpleIdent("test")
        val ident2 = createSimpleIdent("other")
        
        val spec1 = ModuleSpec.Specified(IArray(ident1, ident2))
        val spec2 = ModuleSpec.Specified(IArray(ident1, ident2))
        
        assert(spec1 == spec2)
        assert(spec1.hashCode == spec2.hashCode)
      }

      test("Specified inequality with different contents") {
        val ident1 = createSimpleIdent("test")
        val ident2 = createSimpleIdent("other")
        val ident3 = createSimpleIdent("different")
        
        val spec1 = ModuleSpec.Specified(IArray(ident1, ident2))
        val spec2 = ModuleSpec.Specified(IArray(ident1, ident3))
        val spec3 = ModuleSpec.Specified(IArray(ident1))
        
        assert(spec1 != spec2)
        assert(spec1 != spec3)
        assert(spec2 != spec3)
      }

      test("different spec types are not equal") {
        val ident = createSimpleIdent("test")
        val specified = ModuleSpec.Specified(IArray(ident))

        assert(ModuleSpec.Defaulted != ModuleSpec.Namespaced)
        assert(ModuleSpec.Defaulted != specified)
        assert(ModuleSpec.Namespaced != specified)
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("adding same identifier multiple times") {
        val ident = createSimpleIdent("duplicate")
        val result = ModuleSpec.Namespaced + ident + ident + ident

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 3)
        assert(specified.tsIdents(0) == ident)
        assert(specified.tsIdents(1) == ident)
        assert(specified.tsIdents(2) == ident)
      }

      test("long chain of additions") {
        val identifiers = (1 to 10).map(i => createSimpleIdent(s"ident$i")).toList
        var result: ModuleSpec = ModuleSpec.Namespaced

        identifiers.foreach { ident =>
          result = result + ident
        }

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 10)

        identifiers.zipWithIndex.foreach { case (ident, index) =>
          assert(specified.tsIdents(index) == ident)
        }
      }

      test("mixed identifier types in sequence") {
        val simpleIdent = createSimpleIdent("simple")
        val moduleIdent = createModuleIdent("module")
        val importIdent = TsIdentImport(createModuleIdent("import-source"))

        val result = ModuleSpec.Namespaced + simpleIdent + moduleIdent + importIdent

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 3)
        assert(specified.tsIdents(0) == simpleIdent)
        assert(specified.tsIdents(1) == moduleIdent)
        assert(specified.tsIdents(2) == importIdent)
      }

      test("namespaced identifier in middle of chain") {
        val ident1 = createSimpleIdent("before")
        val ident2 = createSimpleIdent("after")

        val result = ModuleSpec.Namespaced + ident1 + TsIdent.namespaced + ident2

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 2)
        assert(specified.tsIdents(0) == ident1)
        assert(specified.tsIdents(1) == ident2)
      }

      test("empty identifier values") {
        val emptyIdent = createSimpleIdent("")
        val result = ModuleSpec(emptyIdent)

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head.value == "")
      }

      test("very long identifier names") {
        val longName = "a" * 1000
        val longIdent = createSimpleIdent(longName)
        val result = ModuleSpec(longIdent)

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head.value == longName)
      }
    }

    test("Real-World Scenarios") {
      test("typical ES6 import pattern") {
        // Simulates: import { Component, useState } from 'react'
        val componentIdent = createSimpleIdent("Component")
        val useStateIdent = createSimpleIdent("useState")

        val result = ModuleSpec.Namespaced + componentIdent + useStateIdent

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 2)
        assert(specified.tsIdents(0) == componentIdent)
        assert(specified.tsIdents(1) == useStateIdent)
      }

      test("default import pattern") {
        // Simulates: import React from 'react'
        val reactIdent = createSimpleIdent("React")
        val result = ModuleSpec.Defaulted + reactIdent

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 2)
        assert(specified.tsIdents(0) == TsIdent.default)
        assert(specified.tsIdents(1) == reactIdent)
      }

      test("namespace import pattern") {
        // Simulates: import * as lodash from 'lodash'
        val lodashIdent = createSimpleIdent("lodash")
        val result = ModuleSpec.Namespaced + lodashIdent

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head == lodashIdent)
      }

      test("mixed import pattern") {
        // Simulates: import React, { Component, useState } from 'react'
        val reactIdent = createSimpleIdent("React")
        val componentIdent = createSimpleIdent("Component")
        val useStateIdent = createSimpleIdent("useState")

        val result = ModuleSpec.Defaulted + reactIdent + componentIdent + useStateIdent

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 4)
        assert(specified.tsIdents(0) == TsIdent.default)
        assert(specified.tsIdents(1) == reactIdent)
        assert(specified.tsIdents(2) == componentIdent)
        assert(specified.tsIdents(3) == useStateIdent)
      }

      test("scoped package identifiers") {
        val scopedModule = TsIdentModule(Some("types"), List("node"))
        val result = ModuleSpec(scopedModule)

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1)
        assert(specified.tsIdents.head == scopedModule)
        assert(specified.tsIdents.head.value == "@types/node")
      }

      test("complex module path") {
        val complexModule = TsIdentModule(Some("babel"), List("core", "lib", "transform"))
        val helperIdent = createSimpleIdent("helper")

        val result = ModuleSpec(complexModule) + helperIdent

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 2)
        assert(specified.tsIdents(0) == complexModule)
        assert(specified.tsIdents(1) == helperIdent)
      }
    }

    test("Performance and Memory") {
      test("large number of identifiers") {
        val identifiers = (1 to 1000).map(i => createSimpleIdent(s"ident$i"))
        var result: ModuleSpec = ModuleSpec.Namespaced

        identifiers.foreach { ident =>
          result = result + ident
        }

        assert(result.isInstanceOf[ModuleSpec.Specified])
        val specified = result.asInstanceOf[ModuleSpec.Specified]
        assert(specified.tsIdents.length == 1000)

        // Verify first and last elements
        assert(specified.tsIdents(0).value == "ident1")
        assert(specified.tsIdents(999).value == "ident1000")
      }

      test("repeated operations maintain consistency") {
        val ident = createSimpleIdent("test")
        val spec1 = ModuleSpec(ident)
        val spec2 = ModuleSpec(ident)
        val spec3 = ModuleSpec(ident)

        assert(spec1 == spec2)
        assert(spec2 == spec3)
        assert(spec1 == spec3)

        // Test addition consistency
        val result1 = spec1 + ident
        val result2 = spec2 + ident
        val result3 = spec3 + ident

        assert(result1 == result2)
        assert(result2 == result3)
        assert(result1 == result3)
      }
    }
  }
}