package org.scalablytyped.converter.internal
package ts
package trees

import utest.*

object TsIdentLibraryTests extends TestSuite {
  def tests = Tests {
    test("Basic Construction") {
      test("simple library identifier") {
        val x = TsIdentLibrary("lodash")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "lodash")
        assert(x.`__value` == "lodash")
      }

      test("scoped library identifier") {
        val x = TsIdentLibrary("@angular/core")
        assert(x.isInstanceOf[TsIdentLibraryScoped])
        assert(x.value == "@angular/core")
        assert(x.`__value` == "angular__core")

        x match {
          case scoped: TsIdentLibraryScoped =>
            assert(scoped.scope == "angular")
            assert(scoped.name == "core")
          case _ => assert(false)
        }
      }

      test("@types packages are unwrapped") {
        val x = TsIdentLibrary("@types/node")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "node")
        assert(x.`__value` == "node")
      }

      test("@types scoped packages are unwrapped") {
        val x = TsIdentLibrary("@types/babel__core")
        // babel__core gets parsed as a scoped package because it contains __
        assert(x.isInstanceOf[TsIdentLibraryScoped])
        assert(x.value == "@babel/core")
        assert(x.`__value` == "babel__core")
      }

      test("internal scoped representation") {
        val x = TsIdentLibrary("angular__core")
        assert(x.isInstanceOf[TsIdentLibraryScoped])
        assert(x.value == "@angular/core")
        assert(x.`__value` == "angular__core")
      }

      test("internal @types scoped representation") {
        val x = TsIdentLibrary("types__node")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "node")
        assert(x.`__value` == "node")
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("empty string") {
        val x = TsIdentLibrary("")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "")
        assert(x.`__value` == "")
      }

      test("single character") {
        val x = TsIdentLibrary("a")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "a")
        assert(x.`__value` == "a")
      }

      test("very long identifier") {
        val longName = "a" * 1000
        val x = TsIdentLibrary(longName)
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == longName)
        assert(x.`__value` == longName)
      }

      test("special characters in simple identifier") {
        val x = TsIdentLibrary("lodash-es")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "lodash-es")
        assert(x.`__value` == "lodash-es")
      }

      test("special characters in scoped identifier") {
        val x = TsIdentLibrary("@babel/plugin-transform-runtime")
        assert(x.isInstanceOf[TsIdentLibraryScoped])
        assert(x.value == "@babel/plugin-transform-runtime")
        assert(x.`__value` == "babel__plugin-transform-runtime")
      }

      test("numeric identifiers") {
        val x = TsIdentLibrary("123")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "123")
        assert(x.`__value` == "123")
      }

      test("mixed alphanumeric") {
        val x = TsIdentLibrary("lib2to3")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "lib2to3")
        assert(x.`__value` == "lib2to3")
      }

      test("unicode characters") {
        val x = TsIdentLibrary("测试库")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "测试库")
        assert(x.`__value` == "测试库")
      }

      test("scoped with unicode") {
        val x = TsIdentLibrary("@测试/库")
        assert(x.isInstanceOf[TsIdentLibraryScoped])
        assert(x.value == "@测试/库")
        assert(x.`__value` == "测试__库")
      }
    }

    test("Malformed Input Handling") {
      test("incomplete scoped package - missing name") {
        val x = TsIdentLibrary("@scope/")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "@scope/")
      }

      test("incomplete scoped package - missing scope") {
        val x = TsIdentLibrary("@/name")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "@/name")
      }

      test("malformed scoped - no slash") {
        val x = TsIdentLibrary("@scope")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "@scope")
      }

      test("multiple slashes in scoped") {
        val x = TsIdentLibrary("@scope/name/extra")
        assert(x.isInstanceOf[TsIdentLibraryScoped])
        assert(x.value == "@scope/name/extra")
        assert(x.`__value` == "scope__name/extra")
      }

      test("malformed internal representation - no underscores") {
        val x = TsIdentLibrary("scope_name")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "scope_name")
      }

      test("malformed internal representation - missing parts") {
        val x = TsIdentLibrary("scope__")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "scope__")
      }

      test("malformed internal representation - empty scope") {
        val x = TsIdentLibrary("__name")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "__name")
      }
    }

    test("TypeScript and JavaScript Reserved Words") {
      test("JavaScript reserved words as library names") {
        val jsKeywords = List(
          "class", "function", "var", "let", "const", "if", "else", "for", "while",
          "do", "switch", "case", "default", "break", "continue", "return", "try",
          "catch", "finally", "throw", "new", "this", "super", "extends", "implements",
          "import", "export", "from", "as", "async", "await", "yield", "static",
          "public", "private", "protected", "readonly", "abstract", "interface",
          "type", "namespace", "module", "declare", "enum"
        )

        jsKeywords.foreach { keyword =>
          val x = TsIdentLibrary(keyword)
          assert(x.isInstanceOf[TsIdentLibrarySimple])
          assert(x.value == keyword)
          assert(x.`__value` == keyword)
        }
      }

      test("Scala reserved words as library names") {
        val scalaKeywords = List(
          "abstract", "case", "catch", "class", "def", "do", "else", "extends",
          "false", "final", "finally", "for", "forSome", "if", "implicit",
          "import", "lazy", "match", "new", "null", "object", "override",
          "package", "private", "protected", "return", "sealed", "super",
          "this", "throw", "trait", "try", "true", "type", "val", "var",
          "while", "with", "yield"
        )

        scalaKeywords.foreach { keyword =>
          val x = TsIdentLibrary(keyword)
          assert(x.isInstanceOf[TsIdentLibrarySimple])
          assert(x.value == keyword)
          assert(x.`__value` == keyword)
        }
      }

      test("scoped packages with reserved words") {
        val x1 = TsIdentLibrary("@class/interface")
        assert(x1.isInstanceOf[TsIdentLibraryScoped])
        assert(x1.value == "@class/interface")
        assert(x1.`__value` == "class__interface")

        val x2 = TsIdentLibrary("@types/function")
        assert(x2.isInstanceOf[TsIdentLibrarySimple])
        assert(x2.value == "function")
        assert(x2.`__value` == "function")
      }
    }

    test("Complex Identifier Patterns") {
      test("nested namespaces simulation") {
        val x = TsIdentLibrary("@microsoft/api-extractor")
        assert(x.isInstanceOf[TsIdentLibraryScoped])
        assert(x.value == "@microsoft/api-extractor")
        assert(x.`__value` == "microsoft__api-extractor")
      }

      test("deep scoped packages") {
        val x = TsIdentLibrary("@babel/plugin-proposal-class-properties")
        assert(x.isInstanceOf[TsIdentLibraryScoped])
        assert(x.value == "@babel/plugin-proposal-class-properties")
        assert(x.`__value` == "babel__plugin-proposal-class-properties")
      }

      test("version-like identifiers") {
        val x = TsIdentLibrary("v8-compile-cache")
        assert(x.isInstanceOf[TsIdentLibrarySimple])
        assert(x.value == "v8-compile-cache")
        assert(x.`__value` == "v8-compile-cache")
      }

      test("framework-specific patterns") {
        val patterns = List(
          "@angular/common",
          "@vue/cli",
          "@react-native/metro-config",
          "@storybook/addon-essentials",
          "@nestjs/common",
          "@nuxt/typescript-build"
        )

        patterns.foreach { pattern =>
          val x = TsIdentLibrary(pattern)
          assert(x.isInstanceOf[TsIdentLibraryScoped])
          assert(x.value == pattern)

          val parts = pattern.substring(1).split('/')
          assert(x.`__value` == s"${parts(0)}__${parts(1)}")
        }
      }

      test("organization-specific patterns") {
        val x1 = TsIdentLibrary("@company/internal-lib")
        assert(x1.isInstanceOf[TsIdentLibraryScoped])
        assert(x1.value == "@company/internal-lib")
        assert(x1.`__value` == "company__internal-lib")

        val x2 = TsIdentLibrary("@my-org/shared-utils")
        assert(x2.isInstanceOf[TsIdentLibraryScoped])
        assert(x2.value == "@my-org/shared-utils")
        assert(x2.`__value` == "my-org__shared-utils")
      }
    }

    test("International and Unicode Support") {
      test("various international characters") {
        val internationalNames = List(
          "café", "naïve", "résumé", "piñata", "jalapeño",
          "москва", "北京", "東京", "서울", "العربية"
        )

        internationalNames.foreach { name =>
          val x = TsIdentLibrary(name)
          assert(x.isInstanceOf[TsIdentLibrarySimple])
          assert(x.value == name)
          assert(x.`__value` == name)
        }
      }

      test("scoped packages with international characters") {
        val x1 = TsIdentLibrary("@café/utils")
        assert(x1.isInstanceOf[TsIdentLibraryScoped])
        assert(x1.value == "@café/utils")
        assert(x1.`__value` == "café__utils")

        val x2 = TsIdentLibrary("@北京/library")
        assert(x2.isInstanceOf[TsIdentLibraryScoped])
        assert(x2.value == "@北京/library")
        assert(x2.`__value` == "北京__library")
      }

      test("emoji in package names") {
        val x1 = TsIdentLibrary("🚀rocket")
        assert(x1.isInstanceOf[TsIdentLibrarySimple])
        assert(x1.value == "🚀rocket")
        assert(x1.`__value` == "🚀rocket")

        val x2 = TsIdentLibrary("@🎨/design-system")
        assert(x2.isInstanceOf[TsIdentLibraryScoped])
        assert(x2.value == "@🎨/design-system")
        assert(x2.`__value` == "🎨__design-system")
      }
    }
  }
}