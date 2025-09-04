package org.scalablytyped.converter.internal
package ts
package trees

import utest.*

object TsIdentModuleTests extends TestSuite {
  def tests = Tests {
    test("Construction and Basic Properties") {
      test("constructor creates module with given scope and fragments") {
        val module = TsIdentModule(Some("types"), List("node"))

        assert(module.scopeOpt.contains("types"))
        assert(module.fragments == List("node"))
        assert(module.value == "@types/node")
      }

      test("constructor creates module without scope") {
        val module = TsIdentModule(None, List("lodash"))

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("lodash"))
        assert(module.value == "lodash")
      }

      test("constructor with empty fragments") {
        val module = TsIdentModule(None, List.empty)

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments.isEmpty)
        assert(module.value == "")
      }

      test("constructor with multiple fragments") {
        val module = TsIdentModule(None, List("react", "dom", "server"))

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("react", "dom", "server"))
        assert(module.value == "react/dom/server")
      }

      test("constructor with scoped multiple fragments") {
        val module = TsIdentModule(Some("babel"), List("plugin", "transform", "runtime"))

        assert(module.scopeOpt.contains("babel"))
        assert(module.fragments == List("plugin", "transform", "runtime"))
        assert(module.value == "@babel/plugin/transform/runtime")
      }
    }

    test("Value Property Computation") {
      test("simple module value") {
        val module = TsIdentModule(None, List("express"))
        assert(module.value == "express")
      }

      test("scoped module value") {
        val module = TsIdentModule(Some("angular"), List("core"))
        assert(module.value == "@angular/core")
      }

      test("multi-fragment simple module value") {
        val module = TsIdentModule(None, List("path", "to", "module"))
        assert(module.value == "path/to/module")
      }

      test("multi-fragment scoped module value") {
        val module = TsIdentModule(Some("company"), List("internal", "utils"))
        assert(module.value == "@company/internal/utils")
      }

      test("empty fragments with scope") {
        val module = TsIdentModule(Some("scope"), List.empty)
        assert(module.value == "@scope/")
      }

      test("single empty fragment") {
        val module = TsIdentModule(None, List(""))
        assert(module.value == "")
      }

      test("multiple empty fragments") {
        val module = TsIdentModule(None, List("", "", ""))
        assert(module.value == "//")
      }
    }

    test("inLibrary Property") {
      test("simple module to simple library") {
        val module = TsIdentModule(None, List("lodash"))
        val library = module.inLibrary

        assert(library.isInstanceOf[TsIdentLibrarySimple])
        assert(library.value == "lodash")
      }

      test("scoped module to scoped library") {
        val module = TsIdentModule(Some("types"), List("node"))
        val library = module.inLibrary

        assert(library.isInstanceOf[TsIdentLibraryScoped])
        assert(library.value == "@types/node")

        library match {
          case scoped: TsIdentLibraryScoped =>
            assert(scoped.scope == "types")
            assert(scoped.name == "node")
          case _ => assert(false)
        }
      }

      test("multi-fragment module uses first fragment") {
        val module = TsIdentModule(None, List("react", "dom", "server"))
        val library = module.inLibrary

        assert(library.isInstanceOf[TsIdentLibrarySimple])
        assert(library.value == "react")
      }

      test("scoped multi-fragment module uses first fragment") {
        val module = TsIdentModule(Some("babel"), List("plugin", "transform"))
        val library = module.inLibrary

        assert(library.isInstanceOf[TsIdentLibraryScoped])
        assert(library.value == "@babel/plugin")

        library match {
          case scoped: TsIdentLibraryScoped =>
            assert(scoped.scope == "babel")
            assert(scoped.name == "plugin")
          case _ => assert(false)
        }
      }

      test("empty fragments with scope") {
        val module = TsIdentModule(Some("scope"), List.empty)

        // This will throw an exception due to fragments.head on empty list
        // but we test the behavior as it exists
        try {
          val _ = module.inLibrary
          assert(false) // Should have thrown exception
        } catch {
          case _: NoSuchElementException => assert(true)
        }
      }

      test("empty fragments without scope") {
        val module = TsIdentModule(None, List.empty)

        // This will throw an exception due to fragments.head on empty list
        try {
          val _ = module.inLibrary
          assert(false) // Should have thrown exception
        } catch {
          case _: NoSuchElementException => assert(true)
        }
      }
    }

    test("Equality and HashCode") {
      test("equal modules have same hash code") {
        val module1 = TsIdentModule(Some("types"), List("node"))
        val module2 = TsIdentModule(Some("types"), List("node"))

        assert(module1 == module2)
        assert(module1.hashCode == module2.hashCode)
      }

      test("different scope modules are not equal") {
        val module1 = TsIdentModule(Some("types"), List("node"))
        val module2 = TsIdentModule(Some("babel"), List("node"))

        assert(module1 != module2)
      }

      test("different fragments modules are not equal") {
        val module1 = TsIdentModule(Some("types"), List("node"))
        val module2 = TsIdentModule(Some("types"), List("react"))

        assert(module1 != module2)
      }

      test("scoped vs unscoped modules are not equal") {
        val module1 = TsIdentModule(Some("types"), List("node"))
        val module2 = TsIdentModule(None, List("node"))

        assert(module1 != module2)
      }

      test("same value but different structure are equal") {
        val module1 = TsIdentModule(None, List("@types/node"))
        val module2 = TsIdentModule(Some("types"), List("node"))

        // Both modules have the same value "@types/node", so they are considered equal
        assert(module1.value == module2.value) // Both are "@types/node"
        assert(module1 == module2) // Equality is based on value, not structure
        assert(module1.hashCode == module2.hashCode)
      }

      test("empty modules are equal") {
        val module1 = TsIdentModule(None, List.empty)
        val module2 = TsIdentModule(None, List.empty)

        assert(module1 == module2)
        assert(module1.hashCode == module2.hashCode)
      }

      test("hash code is based on value") {
        val module1 = TsIdentModule(Some("types"), List("node"))
        val module2 = TsIdentModule(Some("types"), List("node"))

        assert(module1.hashCode == module1.value.hashCode)
        assert(module2.hashCode == module2.value.hashCode)
        assert(module1.hashCode == module2.hashCode)
      }

      test("equals method checks hash code first") {
        val module1 = TsIdentModule(Some("types"), List("node"))
        val module2 = TsIdentModule(Some("types"), List("node"))

        // Both should have same hash code and be equal
        assert(module1.hashCode == module2.hashCode)
        assert(module1.equals(module2))
      }

      test("equals with non-TsIdentModule returns false") {
        val module = TsIdentModule(Some("types"), List("node"))
        val other = "not a module"

        assert(!module.equals(other))
      }

      test("equals with different hash code returns false") {
        val module1 = TsIdentModule(Some("types"), List("node"))
        val module2 = TsIdentModule(Some("babel"), List("core"))

        // Should have different hash codes
        assert(module1.hashCode != module2.hashCode)
        assert(!module1.equals(module2))
      }
    }

    test("TsIdentModule.fromLibrary") {
      test("creates module from simple library") {
        val library = TsIdentLibrarySimple("lodash")
        val module = TsIdentModule.fromLibrary(library)

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("lodash"))
        assert(module.value == "lodash")
      }

      test("creates module from scoped library") {
        val library = TsIdentLibraryScoped("types", "node")
        val module = TsIdentModule.fromLibrary(library)

        assert(module.scopeOpt.contains("types"))
        assert(module.fragments == List("node"))
        assert(module.value == "@types/node")
      }

      test("handles library with dots in name") {
        val library = TsIdentLibrarySimple("lodash.es")
        val module = TsIdentModule.fromLibrary(library)

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("lodash", "es"))
        assert(module.value == "lodash/es")
      }

      test("handles scoped library with dots in name") {
        val library = TsIdentLibraryScoped("babel", "plugin.transform.runtime")
        val module = TsIdentModule.fromLibrary(library)

        assert(module.scopeOpt.contains("babel"))
        assert(module.fragments == List("plugin", "transform", "runtime"))
        assert(module.value == "@babel/plugin/transform/runtime")
      }

      test("handles empty library name") {
        val library = TsIdentLibrarySimple("")
        val module = TsIdentModule.fromLibrary(library)

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List(""))
        assert(module.value == "")
      }

      test("handles library name with only dots") {
        val library = TsIdentLibrarySimple("...")
        val module = TsIdentModule.fromLibrary(library)

        // "...".split("\\.") gives List() (empty list)
        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List())
        assert(module.value == "")
      }
    }

    test("TsIdentModule.simple") {
      test("creates simple module with single fragment") {
        val module = TsIdentModule.simple("lodash")

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("lodash"))
        assert(module.value == "lodash")
      }

      test("creates simple module with empty string") {
        val module = TsIdentModule.simple("")

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List(""))
        assert(module.value == "")
      }

      test("creates simple module with special characters") {
        val module = TsIdentModule.simple("lodash-es")

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("lodash-es"))
        assert(module.value == "lodash-es")
      }

      test("creates simple module with numeric string") {
        val module = TsIdentModule.simple("123")

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("123"))
        assert(module.value == "123")
      }

      test("creates simple module with unicode characters") {
        val module = TsIdentModule.simple("测试")

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("测试"))
        assert(module.value == "测试")
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("module with very long scope name") {
        val longScope = "a" * 1000
        val module = TsIdentModule(Some(longScope), List("name"))

        assert(module.scopeOpt.contains(longScope))
        assert(module.fragments == List("name"))
        assert(module.value == s"@$longScope/name")
      }

      test("module with very long fragment") {
        val longFragment = "b" * 1000
        val module = TsIdentModule(None, List(longFragment))

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List(longFragment))
        assert(module.value == longFragment)
      }

      test("module with many fragments") {
        val manyFragments = (1 to 100).map(_.toString).toList
        val module = TsIdentModule(None, manyFragments)

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == manyFragments)
        assert(module.value == manyFragments.mkString("/"))
      }

      test("module with special characters in scope") {
        val module = TsIdentModule(Some("my-org"), List("utils"))

        assert(module.scopeOpt.contains("my-org"))
        assert(module.fragments == List("utils"))
        assert(module.value == "@my-org/utils")
      }

      test("module with special characters in fragments") {
        val module = TsIdentModule(None, List("plugin-transform-runtime"))

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("plugin-transform-runtime"))
        assert(module.value == "plugin-transform-runtime")
      }

      test("module with unicode in scope") {
        val module = TsIdentModule(Some("测试"), List("库"))

        assert(module.scopeOpt.contains("测试"))
        assert(module.fragments == List("库"))
        assert(module.value == "@测试/库")
      }

      test("module with mixed unicode and ascii") {
        val module = TsIdentModule(Some("company"), List("测试", "utils"))

        assert(module.scopeOpt.contains("company"))
        assert(module.fragments == List("测试", "utils"))
        assert(module.value == "@company/测试/utils")
      }

      test("module with whitespace in fragments") {
        val module = TsIdentModule(None, List("my module", "with spaces"))

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("my module", "with spaces"))
        assert(module.value == "my module/with spaces")
      }

      test("module with slashes in fragments") {
        val module = TsIdentModule(None, List("path/to", "module"))

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("path/to", "module"))
        assert(module.value == "path/to/module")
      }

      test("module with at symbol in fragments") {
        val module = TsIdentModule(None, List("@not-a-scope", "module"))

        assert(module.scopeOpt.isEmpty)
        assert(module.fragments == List("@not-a-scope", "module"))
        assert(module.value == "@not-a-scope/module")
      }
    }

    test("Real-World Module Patterns") {
      test("common npm packages") {
        val packages = List(
          ("lodash", None, List("lodash")),
          ("react", None, List("react")),
          ("express", None, List("express")),
          ("moment", None, List("moment")),
          ("axios", None, List("axios"))
        )

        packages.foreach { case (expected, scope, fragments) =>
          val module = TsIdentModule(scope, fragments)
          assert(module.value == expected)
          assert(module.scopeOpt == scope)
          assert(module.fragments == fragments)
        }
      }

      test("scoped npm packages") {
        val packages = List(
          ("@types/node", Some("types"), List("node")),
          ("@types/react", Some("types"), List("react")),
          ("@angular/core", Some("angular"), List("core")),
          ("@babel/core", Some("babel"), List("core")),
          ("@vue/cli", Some("vue"), List("cli")),
          ("@nestjs/common", Some("nestjs"), List("common"))
        )

        packages.foreach { case (expected, scope, fragments) =>
          val module = TsIdentModule(scope, fragments)
          assert(module.value == expected)
          assert(module.scopeOpt == scope)
          assert(module.fragments == fragments)
        }
      }

      test("complex scoped packages") {
        val packages = List(
          ("@babel/plugin-transform-runtime", Some("babel"), List("plugin-transform-runtime")),
          ("@storybook/addon-essentials", Some("storybook"), List("addon-essentials")),
          ("@react-native/metro-config", Some("react-native"), List("metro-config")),
          ("@microsoft/api-extractor", Some("microsoft"), List("api-extractor"))
        )

        packages.foreach { case (expected, scope, fragments) =>
          val module = TsIdentModule(scope, fragments)
          assert(module.value == expected)
          assert(module.scopeOpt == scope)
          assert(module.fragments == fragments)
        }
      }

      test("relative module paths") {
        val relativePaths = List(
          ("./utils", None, List(".", "utils")),
          ("../shared/types", None, List("..", "shared", "types")),
          ("./components/Button", None, List(".", "components", "Button")),
          ("../../lib/helpers", None, List("..", "..", "lib", "helpers"))
        )

        relativePaths.foreach { case (expected, scope, fragments) =>
          val module = TsIdentModule(scope, fragments)
          assert(module.value == expected)
          assert(module.scopeOpt == scope)
          assert(module.fragments == fragments)
        }
      }

      test("absolute module paths") {
        val absolutePaths = List(
          ("src/utils", None, List("src", "utils")),
          ("lib/components/Button", None, List("lib", "components", "Button")),
          ("app/services/api", None, List("app", "services", "api"))
        )

        absolutePaths.foreach { case (expected, scope, fragments) =>
          val module = TsIdentModule(scope, fragments)
          assert(module.value == expected)
          assert(module.scopeOpt == scope)
          assert(module.fragments == fragments)
        }
      }

      test("node.js built-in modules") {
        val builtins = List(
          ("fs", None, List("fs")),
          ("path", None, List("path")),
          ("http", None, List("http")),
          ("crypto", None, List("crypto")),
          ("util", None, List("util"))
        )

        builtins.foreach { case (expected, scope, fragments) =>
          val module = TsIdentModule(scope, fragments)
          assert(module.value == expected)
          assert(module.scopeOpt == scope)
          assert(module.fragments == fragments)
        }
      }
    }

    test("Integration with Library System") {
      test("roundtrip: module -> library -> module") {
        val originalModule = TsIdentModule(Some("types"), List("node"))
        val library = originalModule.inLibrary
        val newModule = TsIdentModule.fromLibrary(library)

        assert(newModule.scopeOpt == originalModule.scopeOpt)
        assert(newModule.fragments == originalModule.fragments)
        assert(newModule.value == originalModule.value)
      }

      test("roundtrip with simple module") {
        val originalModule = TsIdentModule(None, List("lodash"))
        val library = originalModule.inLibrary
        val newModule = TsIdentModule.fromLibrary(library)

        assert(newModule.scopeOpt == originalModule.scopeOpt)
        assert(newModule.fragments == originalModule.fragments)
        assert(newModule.value == originalModule.value)
      }

      test("roundtrip with multi-fragment loses extra fragments") {
        val originalModule = TsIdentModule(None, List("react", "dom", "server"))
        val library = originalModule.inLibrary // Only uses first fragment
        val newModule = TsIdentModule.fromLibrary(library)

        // Should only have the first fragment
        assert(newModule.scopeOpt.isEmpty)
        assert(newModule.fragments == List("react"))
        assert(newModule.value == "react")
        assert(newModule.value != originalModule.value)
      }

      test("library creation from various module types") {
        val modules = List(
          TsIdentModule(None, List("express")),
          TsIdentModule(Some("types"), List("node")),
          TsIdentModule(Some("babel"), List("core")),
          TsIdentModule(None, List("lodash", "fp"))
        )

        modules.foreach { module =>
          val library = module.inLibrary
          assert(library.value.nonEmpty)

          // Verify library type matches module structure
          module.scopeOpt match {
            case None => assert(library.isInstanceOf[TsIdentLibrarySimple])
            case Some(_) => assert(library.isInstanceOf[TsIdentLibraryScoped])
          }
        }
      }
    }

    test("Error Handling and Robustness") {
      test("handles null scope gracefully") {
        // Scala Option[String] cannot be null, but we test None
        val module = TsIdentModule(None, List("test"))
        assert(module.scopeOpt.isEmpty)
        assert(module.value == "test")
      }

      test("handles null fragments list") {
        // In Scala, we can't pass null for List, but we test empty list
        val module = TsIdentModule(None, List.empty)
        assert(module.fragments.isEmpty)
        assert(module.value == "")
      }

      test("handles fragments with null elements") {
        // Scala List[String] cannot contain null, but we test empty strings
        val module = TsIdentModule(None, List("", "test", ""))
        assert(module.fragments == List("", "test", ""))
        assert(module.value == "/test/")
      }

      test("inLibrary with empty fragments throws exception") {
        val module = TsIdentModule(None, List.empty)

        try {
          val _ = module.inLibrary
          assert(false) // Should have thrown NoSuchElementException
        } catch {
          case _: NoSuchElementException => assert(true)
          case _ => assert(false) // Unexpected exception
        }
      }

      test("inLibrary with scoped empty fragments throws exception") {
        val module = TsIdentModule(Some("scope"), List.empty)

        try {
          val _ = module.inLibrary
          assert(false) // Should have thrown NoSuchElementException
        } catch {
          case _: NoSuchElementException => assert(true)
          case _ => assert(false) // Unexpected exception
        }
      }
    }

    test("Performance and Memory") {
      test("large number of fragments") {
        val fragments = (1 to 1000).map(_.toString).toList
        val module = TsIdentModule(None, fragments)

        assert(module.fragments.length == 1000)
        assert(module.value == fragments.mkString("/"))
      }

      test("very long fragment names") {
        val longFragment = "a" * 10000
        val module = TsIdentModule(None, List(longFragment))

        assert(module.fragments.head == longFragment)
        assert(module.value == longFragment)
      }

      test("repeated value computation is consistent") {
        val module = TsIdentModule(Some("types"), List("node"))
        val value1 = module.value
        val value2 = module.value
        val value3 = module.value

        assert(value1 == value2)
        assert(value2 == value3)
        assert(value1 == "@types/node")
      }

      test("hash code is cached") {
        val module = TsIdentModule(Some("types"), List("node"))
        val hash1 = module.hashCode
        val hash2 = module.hashCode

        assert(hash1 == hash2)
        assert(hash1 == module.value.hashCode)
      }
    }

    test("String Representation and Debugging") {
      test("toString provides meaningful representation") {
        val module = TsIdentModule(Some("types"), List("node"))
        val str = module.toString

        // Should contain class name and key information
        assert(str.contains("TsIdentModule"))
      }

      test("asString for debugging") {
        val module = TsIdentModule(Some("babel"), List("core"))
        // TsIdentModule extends TsTree which should have asString
        // The exact format may vary, but it should be meaningful
        assert(module.toString.nonEmpty)
      }
    }

    test("Serialization Support") {
      test("has implicit encoders and decoders") {
        // Test that the implicit encoders/decoders are available
        import io.circe.syntax._
        import io.circe.parser._

        val module = TsIdentModule(Some("types"), List("node"))

        // Should be able to encode to JSON
        val json = module.asJson
        assert(json.noSpaces.nonEmpty)

        // Should be able to decode from JSON
        val decoded = decode[TsIdentModule](json.noSpaces)
        assert(decoded.isRight)
        assert(decoded.right.get == module)
      }

      test("roundtrip serialization preserves equality") {
        import io.circe.syntax._
        import io.circe.parser._

        val modules = List(
          TsIdentModule(None, List("lodash")),
          TsIdentModule(Some("types"), List("node")),
          TsIdentModule(Some("babel"), List("core", "lib")),
          TsIdentModule(None, List.empty)
        )

        modules.foreach { original =>
          val json = original.asJson
          val decoded = decode[TsIdentModule](json.noSpaces)

          assert(decoded.isRight)
          assert(decoded.right.get == original)
          assert(decoded.right.get.hashCode == original.hashCode)
        }
      }
    }
  }
}