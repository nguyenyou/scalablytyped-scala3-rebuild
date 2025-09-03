package org.scalablytyped.converter.internal
package ts

import utest.*

object CodePathTests extends TestSuite {
  def tests = Tests {
    test("CodePath.NoPath") {
      test("get returns None") {
        val noPath = CodePath.NoPath
        assert(noPath.get.isEmpty)
      }

      test("forceHasPath throws error") {
        val noPath = CodePath.NoPath
        try {
          noPath.forceHasPath
          assert(false) // Should have thrown an exception
        } catch {
          case ex: RuntimeException => assert(ex.getMessage == "Expected code path")
          case _ => assert(false) // Wrong exception type
        }
      }

      test("+ operator returns NoPath") {
        val noPath = CodePath.NoPath
        val ident = TsIdent("test")
        val result = noPath + ident
        assert(result == CodePath.NoPath)
      }

      test("replaceLast returns NoPath") {
        val noPath = CodePath.NoPath
        val newIdent = TsIdent("newName")
        val result = noPath.replaceLast(newIdent)
        assert(result == CodePath.NoPath)
      }
    }

    test("CodePath.HasPath - Basic Functionality") {
      test("construction and basic properties") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module", "submodule")
        val hasPath = CodePath.HasPath(library, pathPart)

        assert(hasPath.inLibrary == library)
        assert(hasPath.codePathPart == pathPart)
        
        // Test lazy codePath property
        val expectedCodePath = TsQIdent(IArray(library) ++ pathPart.parts)
        assert(hasPath.codePath == expectedCodePath)
      }

      test("get returns Some") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        val result = hasPath.get
        assert(result.isDefined)
        assert(result.get == hasPath)
      }

      test("forceHasPath returns self") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        val result = hasPath.forceHasPath
        assert(result == hasPath)
      }

      test("+ operator appends identifier") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        val newIdent = TsIdent("newModule")
        
        val result = hasPath + newIdent
        assert(result.inLibrary == library)
        assert(result.codePathPart == TsQIdent.of("module", "newModule"))
      }

      test("replaceLast replaces last identifier") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module", "submodule")
        val hasPath = CodePath.HasPath(library, pathPart)
        val newLast = TsIdent("newSubmodule")
        
        val result = hasPath.replaceLast(newLast)
        result match {
          case CodePath.HasPath(resultLib, resultPath) =>
            assert(resultLib == library)
            assert(resultPath == TsQIdent.of("module", "newSubmodule"))
          case _ => assert(false)
        }
      }

      test("replaceLast with single part") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        val newLast = TsIdent("newModule")
        
        val result = hasPath.replaceLast(newLast)
        result match {
          case CodePath.HasPath(resultLib, resultPath) =>
            assert(resultLib == library)
            assert(resultPath == TsQIdent.of("newModule"))
          case _ => assert(false)
        }
      }
    }

    test("CodePath.HasPath - / operator with TsTree") {
      test("with TsNamedDecl") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        // Create a mock TsNamedDecl
        val className = TsIdent("MyClass")
        val mockClass = TsDeclClass(
          comments = NoComments,
          declared = false,
          isAbstract = false,
          name = className,
          tparams = IArray.Empty,
          parent = None,
          implements = IArray.Empty,
          members = IArray.Empty,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )
        
        val result = hasPath / mockClass
        assert(result.inLibrary == library)
        assert(result.codePathPart == TsQIdent.of("module", "MyClass"))
      }

      test("with TsGlobal") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        val mockGlobal = TsGlobal(
          comments = NoComments,
          declared = false,
          members = IArray.Empty,
          codePath = CodePath.NoPath
        )
        
        val result = hasPath / mockGlobal
        assert(result.inLibrary == library)
        assert(result.codePathPart == TsQIdent.of("module", "<global>"))
      }

      test("with other TsTree types") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        // Create a mock TsTree that's not TsNamedDecl or TsGlobal
        val mockLiteral = TsLiteral.Str("test")
        
        val result = hasPath / mockLiteral
        assert(result == hasPath) // Should return unchanged
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("empty library name") {
        val library = TsIdent("")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        assert(hasPath.inLibrary.value == "")
        assert(hasPath.codePath.parts.head.value == "")
      }

      test("empty path part") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.empty
        val hasPath = CodePath.HasPath(library, pathPart)
        
        assert(hasPath.codePathPart == TsQIdent.empty)
        assert(hasPath.codePath == TsQIdent.of("myLib"))
      }

      test("special characters in identifiers") {
        val library = TsIdent("my-lib")
        val pathPart = TsQIdent.of("my_module", "sub-module")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        val result = hasPath + TsIdent("new-ident")
        assert(result.codePathPart.parts.last.value == "new-ident")
      }

      test("unicode characters in identifiers") {
        val library = TsIdent("测试库")
        val pathPart = TsQIdent.of("模块")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        assert(hasPath.inLibrary.value == "测试库")
        assert(hasPath.codePathPart.parts.head.value == "模块")
      }

      test("very long identifier chains") {
        val library = TsIdent("lib")
        val longChain = (1 to 100).map(i => s"module$i").toList
        val pathPart = TsQIdent(IArray.fromTraversable(longChain.map(TsIdent.apply)))
        val hasPath = CodePath.HasPath(library, pathPart)
        
        assert(hasPath.codePathPart.parts.length == 100)
        assert(hasPath.codePath.parts.length == 101) // +1 for library
      }
    }

    test("Integration with TsIdent Special Values") {
      test("using TsIdent.Global") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        val result = hasPath + TsIdent.Global
        assert(result.codePathPart.parts.last == TsIdent.Global)
        assert(result.codePathPart.parts.last.value == "<global>")
      }

      test("using TsIdent.Apply") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        val result = hasPath + TsIdent.Apply
        assert(result.codePathPart.parts.last == TsIdent.Apply)
        assert(result.codePathPart.parts.last.value == "<apply>")
      }

      test("using TsIdent.Destructured") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        val result = hasPath + TsIdent.Destructured
        assert(result.codePathPart.parts.last == TsIdent.Destructured)
        assert(result.codePathPart.parts.last.value == "<destructured>")
      }

      test("using library identifiers") {
        val library = TsIdent.std
        val pathPart = TsQIdent.of("Array")
        val hasPath = CodePath.HasPath(library, pathPart)
        
        assert(hasPath.inLibrary == TsIdent.std)
        assert(hasPath.inLibrary.value == "std")
      }
    }

    test("Complex Real-World Scenarios") {
      test("nested module structure") {
        val library = TsIdent("react")
        val pathPart = TsQIdent.of("components", "Button")
        val hasPath = CodePath.HasPath(library, pathPart)

        // Add more nesting
        val result = hasPath + TsIdent("Props") + TsIdent("onClick")

        assert(result.inLibrary.value == "react")
        assert(result.codePathPart == TsQIdent.of("components", "Button", "Props", "onClick"))
        assert(result.codePath == TsQIdent.of("react", "components", "Button", "Props", "onClick"))
      }

      test("replacing in deeply nested structure") {
        val library = TsIdent("lodash")
        val pathPart = TsQIdent.of("fp", "curry", "placeholder")
        val hasPath = CodePath.HasPath(library, pathPart)

        val result = hasPath.replaceLast(TsIdent("__"))
        result match {
          case CodePath.HasPath(resultLib, resultPath) =>
            assert(resultLib.value == "lodash")
            assert(resultPath == TsQIdent.of("fp", "curry", "__"))
          case _ => assert(false)
        }
      }

      test("working with scoped library names") {
        val library = TsIdentLibraryScoped("angular", "core")
        val pathPart = TsQIdent.of("Injectable")
        val hasPath = CodePath.HasPath(library, pathPart)

        assert(hasPath.inLibrary.value == "@angular/core")
        assert(hasPath.codePath.parts.head.value == "@angular/core")
      }
    }

    test("Error Handling and Robustness") {
      test("null handling in / operator") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)

        // Test with null tree - should return unchanged
        val result = hasPath / null.asInstanceOf[TsTree]
        assert(result == hasPath)
      }

      test("pattern matching exhaustiveness") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)

        // Test various TsTree types to ensure pattern matching works
        val interface = TsDeclInterface(
          comments = NoComments,
          declared = false,
          name = TsIdent("MyInterface"),
          tparams = IArray.Empty,
          inheritance = IArray.Empty,
          members = IArray.Empty,
          codePath = CodePath.NoPath
        )

        val result = hasPath / interface
        assert(result.codePathPart.parts.last.value == "MyInterface")
      }

      test("memory efficiency with lazy codePath") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)

        // Access codePath multiple times to ensure it's computed only once
        val path1 = hasPath.codePath
        val path2 = hasPath.codePath
        assert(path1 eq path2) // Should be the same object reference due to lazy val
      }
    }

    test("Type Safety and Polymorphism") {
      test("CodePath trait polymorphism") {
        val noPath: CodePath = CodePath.NoPath
        val hasPath: CodePath = CodePath.HasPath(TsIdent("lib"), TsQIdent.of("module"))

        // Test that both implement the trait correctly
        assert(noPath.get.isEmpty)
        assert(hasPath.get.isDefined)

        // Test + operator polymorphism
        val ident = TsIdent("test")
        val result1 = noPath + ident
        val result2 = hasPath + ident

        assert(result1 == CodePath.NoPath)
        assert(result2.isInstanceOf[CodePath.HasPath])
      }

      test("CodePath.Has trait integration") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)

        // Test that HasPath implements CodePath.Has methods
        assert(hasPath.codePath == TsQIdent(IArray(library) ++ pathPart.parts))

        // Test withCodePath method through a TsNamedDecl that implements CodePath.Has
        val interface = TsDeclInterface(
          comments = NoComments,
          declared = false,
          name = TsIdent("MyInterface"),
          tparams = IArray.Empty,
          inheritance = IArray.Empty,
          members = IArray.Empty,
          codePath = hasPath
        )

        val newPath = CodePath.HasPath(TsIdent("newLib"), TsQIdent.of("newModule"))
        val updated = interface.withCodePath(newPath)
        assert(updated.codePath == newPath)
      }
    }

    test("Performance and Scalability") {
      test("large identifier chains performance") {
        val library = TsIdent("lib")
        val initialPath = TsQIdent.of("start")
        var hasPath = CodePath.HasPath(library, initialPath)

        // Build a large chain
        for (i <- 1 to 1000) {
          hasPath = hasPath + TsIdent(s"module$i")
        }

        assert(hasPath.codePathPart.parts.length == 1001) // start + 1000 modules
        assert(hasPath.codePath.parts.length == 1002) // + library
      }

      test("repeated operations consistency") {
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("module")
        val hasPath = CodePath.HasPath(library, pathPart)

        // Perform multiple operations and verify consistency
        val ident = TsIdent("test")
        val result1 = hasPath + ident
        val result2 = hasPath + ident

        assert(result1 == result2)
        assert(result1.codePath == result2.codePath)
      }
    }

    test("Interoperability with Other TypeScript Types") {
      test("with TsIdentModule") {
        val moduleIdent = TsIdentModule(Some("scope"), List("module", "submodule"))
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("path")
        val hasPath = CodePath.HasPath(library, pathPart)

        val result = hasPath + moduleIdent
        assert(result.codePathPart.parts.last.value == "@scope/module/submodule")
      }

      test("with TsIdentImport") {
        val moduleIdent = TsIdentModule(None, List("imported-module"))
        val importIdent = TsIdentImport(moduleIdent)
        val library = TsIdent("myLib")
        val pathPart = TsQIdent.of("path")
        val hasPath = CodePath.HasPath(library, pathPart)

        val result = hasPath + importIdent
        assert(result.codePathPart.parts.last.value == "imported-module")
      }

      test("with different TsIdentLibrary types") {
        val simpleLib = TsIdentLibrarySimple("simple-lib")
        val scopedLib = TsIdentLibraryScoped("scope", "scoped-lib")

        val hasPath1 = CodePath.HasPath(simpleLib, TsQIdent.of("module"))
        val hasPath2 = CodePath.HasPath(scopedLib, TsQIdent.of("module"))

        assert(hasPath1.codePath.parts.head.value == "simple-lib")
        assert(hasPath2.codePath.parts.head.value == "@scope/scoped-lib")
      }
    }
  }
}