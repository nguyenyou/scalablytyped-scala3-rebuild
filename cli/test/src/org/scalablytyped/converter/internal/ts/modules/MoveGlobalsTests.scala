package org.scalablytyped.converter.internal
package ts
package modules

import utest.*
import TestUtils.*

object MoveGlobalsTests extends TestSuite {

  // Helper methods for creating test data specific to MoveGlobals tests

  def createMockFunction(
      name: String,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("function"))
  ): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(TsTypeRef(NoComments, TsQIdent.of("void"), Empty))
      ),
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createMockVar(
      name: String,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("var"))
  ): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = Some(TsTypeRef.string),
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockClass(
      name: String,
      members: IArray[TsMember] = Empty,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("class"))
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

  def createMockEnum(
      name: String,
      isValue: Boolean = true,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("enum"))
  ): TsDeclEnum =
    TsDeclEnum(
      comments = NoComments,
      declared = false,
      isConst = false,
      name = createSimpleIdent(name),
      members = Empty,
      isValue = isValue,
      exportedFrom = None,
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockModule(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("module"))
  ): TsDeclModule =
    TsDeclModule(
      comments = NoComments,
      declared = false,
      name = TsIdentModule(None, List(name)),
      members = members,
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createMockGlobalNamespace(
      members: IArray[TsContainerOrDecl] = Empty,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("global"))
  ): TsDeclNamespace =
    TsDeclNamespace(
      comments = NoComments,
      declared = false,
      name = TsIdent.Global,
      members = members,
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createMockNamespace(
      name: String,
      members: IArray[TsContainerOrDecl] = Empty,
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("namespace"))
  ): TsDeclNamespace =
    TsDeclNamespace(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      members = members,
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createMockParsedFile(
      members: IArray[TsContainerOrDecl],
      codePath: CodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("file"))
  ): TsParsedFile =
    TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = members,
      codePath = codePath
    )

  def tests = Tests {
    test("MoveGlobals - Basic Functionality") {
      test("returns original file when no named value declarations exist") {
        val interface1 = createMockInterface("TestInterface")
        val typeAlias1 = createMockTypeAlias("TestType")
        val file       = createMockParsedFile(IArray(interface1, typeAlias1))

        val result = MoveGlobals(file)

        assert(result == file)
        assert(result.members.length == 2)
        assert(!result.members.exists(_.isInstanceOf[TsDeclNamespace]))
      }

      test("returns original file when only modules exist") {
        val module1 = createMockModule("test-module")
        val module2 = createMockModule("another-module")
        val file    = createMockParsedFile(IArray(module1, module2))

        val result = MoveGlobals(file)

        assert(result == file)
        assert(result.members.length == 2)
        assert(!result.members.exists(_.isInstanceOf[TsDeclNamespace]))
      }
    }

    test("MoveGlobals - Global Detection and Processing") {
      test("creates global namespace when named value declarations exist") {
        val function1 = createMockFunction("testFunction")
        val variable1 = createMockVar("testVar")
        val file      = createMockParsedFile(IArray(function1, variable1))

        val result = MoveGlobals(file)

        assert(result.members.length == 1)

        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.length == 2)
        assert(globalNamespace.members.exists {
          case func: TsDeclFunction => func.name.value == "testFunction"
          case _                    => false
        })
        assert(globalNamespace.members.exists {
          case variable: TsDeclVar => variable.name.value == "testVar"
          case _                   => false
        })
      }

      test("keeps type declarations at top level and moves values to global") {
        val interface1 = createMockInterface("TestInterface")
        val function1  = createMockFunction("testFunction")
        val typeAlias1 = createMockTypeAlias("TestType")
        val variable1  = createMockVar("testVar")
        val file       = createMockParsedFile(IArray(interface1, function1, typeAlias1, variable1))

        val result = MoveGlobals(file)

        assert(result.members.length == 3) // interface, typeAlias, global namespace

        // Check that type declarations are kept at top level
        assert(result.members.exists {
          case interface: TsDeclInterface => interface.name.value == "TestInterface"
          case _                          => false
        })
        assert(result.members.exists {
          case typeAlias: TsDeclTypeAlias => typeAlias.name.value == "TestType"
          case _                          => false
        })

        // Check that global namespace contains value declarations
        val globalNamespace = result.members.find(_.isInstanceOf[TsDeclNamespace]).get.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.length == 2)
        assert(globalNamespace.members.exists {
          case func: TsDeclFunction => func.name.value == "testFunction"
          case _                    => false
        })
        assert(globalNamespace.members.exists {
          case variable: TsDeclVar => variable.name.value == "testVar"
          case _                   => false
        })
      }
    }

    test("MoveGlobals - Class Handling") {
      test("transforms classes correctly") {
        val clazz = createMockClass("TestClass")
        val file  = createMockParsedFile(IArray(clazz))

        val result = MoveGlobals(file)

        assert(result.members.length == 2) // interface + global namespace

        // Check that interface is created at top level
        val interface = result.members.find(_.isInstanceOf[TsDeclInterface]).get.asInstanceOf[TsDeclInterface]
        assert(interface.name.value == "TestClass")

        // Check that class is moved to global namespace
        val globalNamespace = result.members.find(_.isInstanceOf[TsDeclNamespace]).get.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.members.length == 1)
        assert(globalNamespace.members.head.asInstanceOf[TsDeclClass].name.value == "TestClass")
      }
    }

    test("MoveGlobals - Enum Handling") {
      test("transforms enums correctly") {
        val enumDecl = createMockEnum("TestEnum")
        val file     = createMockParsedFile(IArray(enumDecl))

        val result = MoveGlobals(file)

        assert(result.members.length == 2) // type-only enum + global namespace

        // Check that type-only enum is created at top level
        val topLevelEnum = result.members.find(_.isInstanceOf[TsDeclEnum]).get.asInstanceOf[TsDeclEnum]
        assert(topLevelEnum.name.value == "TestEnum")
        assert(topLevelEnum.isValue == false) // Should be type-only

        // Check that value enum is moved to global namespace
        val globalNamespace = result.members.find(_.isInstanceOf[TsDeclNamespace]).get.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.members.length == 1)
        val globalEnum = globalNamespace.members.head.asInstanceOf[TsDeclEnum]
        assert(globalEnum.name.value == "TestEnum")
        assert(globalEnum.isValue == true) // Should be value enum
      }
    }

    test("MoveGlobals - Code Path Handling") {
      test("sets correct code paths for global namespace") {
        val function1        = createMockFunction("testFunction")
        val originalCodePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("path"))
        val file             = createMockParsedFile(IArray(function1), originalCodePath)

        val result = MoveGlobals(file)

        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.codePath.isInstanceOf[CodePath.HasPath])

        val hasPath = globalNamespace.codePath.asInstanceOf[CodePath.HasPath]
        assert(hasPath.codePath.parts.last == TsIdent.Global)
      }

      test("requires proper code path") {
        val function1 = createMockFunction("testFunction", CodePath.NoPath)
        val file      = createMockParsedFile(IArray(function1), CodePath.NoPath)

        // MoveGlobals requires a proper code path and will throw an error with NoPath
        try {
          MoveGlobals(file)
          assert(false) // Should not reach here
        } catch {
          case _: RuntimeException => assert(true) // Expected behavior
        }
      }
    }

    test("MoveGlobals - Module Preservation") {
      test("preserves modules alongside global namespace") {
        val function1 = createMockFunction("testFunction")
        val module1   = createMockModule("test-module")
        val file      = createMockParsedFile(IArray(function1, module1))

        val result = MoveGlobals(file)

        assert(result.members.length == 2) // module + global namespace
        assert(result.members.exists(_.isInstanceOf[TsDeclModule]))
        assert(result.members.exists(_.isInstanceOf[TsDeclNamespace]))

        val module = result.members.find(_.isInstanceOf[TsDeclModule]).get.asInstanceOf[TsDeclModule]
        assert(module.name.fragments.head == "test-module")
      }

      test("preserves other non-named declarations") {
        val function1  = createMockFunction("testFunction")
        val parsedFile = TsParsedFile(NoComments, Empty, Empty, CodePath.NoPath)
        val file       = createMockParsedFile(IArray(function1, parsedFile))

        val result = MoveGlobals(file)

        assert(result.members.length == 2) // parsedFile + global namespace
        assert(result.members.exists(_.isInstanceOf[TsParsedFile]))
        assert(result.members.exists(_.isInstanceOf[TsDeclNamespace]))
      }
    }

    test("MoveGlobals - Existing Global Namespace Handling") {
      test("merges with existing global namespace") {
        val function1      = createMockFunction("testFunction")
        val existingGlobal = createMockGlobalNamespace(IArray(createMockVar("existingVar")))
        val file           = createMockParsedFile(IArray(function1, existingGlobal))

        val result = MoveGlobals(file)

        assert(result.members.length == 1) // merged global namespace

        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.length == 2) // testFunction + existingVar
        assert(globalNamespace.members.exists {
          case func: TsDeclFunction => func.name.value == "testFunction"
          case _                    => false
        })
        assert(globalNamespace.members.exists {
          case variable: TsDeclVar => variable.name.value == "existingVar"
          case _                   => false
        })
      }

      test("merges multiple existing global namespaces") {
        val function1 = createMockFunction("testFunction")
        val global1   = createMockGlobalNamespace(IArray(createMockVar("var1")))
        val global2   = createMockGlobalNamespace(IArray(createMockVar("var2")))
        val file      = createMockParsedFile(IArray(function1, global1, global2))

        val result = MoveGlobals(file)

        assert(result.members.length == 1) // merged global namespace

        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.length == 3) // testFunction + var1 + var2
      }
    }

    test("MoveGlobals - Edge Cases") {
      test("handles empty file") {
        val file = createMockParsedFile(Empty)

        val result = MoveGlobals(file)

        assert(result == file)
        assert(result.members.isEmpty)
      }

      test("handles file with only type declarations") {
        val interface1 = createMockInterface("TestInterface")
        val typeAlias1 = createMockTypeAlias("TestType")
        val file       = createMockParsedFile(IArray(interface1, typeAlias1))

        val result = MoveGlobals(file)

        assert(result == file)
        assert(result.members.length == 2)
        assert(!result.members.exists(_.isInstanceOf[TsDeclNamespace]))
      }

      test("handles file with only existing global namespace") {
        val existingGlobal = createMockGlobalNamespace(IArray(createMockVar("existingVar")))
        val file           = createMockParsedFile(IArray(existingGlobal))

        val result = MoveGlobals(file)

        assert(result == file)
        assert(result.members.length == 1)
        assert(result.members.head.isInstanceOf[TsDeclNamespace])
      }
    }

    test("MoveGlobals - Complex Scenarios") {
      test("handles mixed content types") {
        val interface1 = createMockInterface("TestInterface")
        val clazz1     = createMockClass("TestClass")
        val function1  = createMockFunction("testFunction")
        val variable1  = createMockVar("testVar")
        val enumDecl   = createMockEnum("TestEnum")
        val module1    = createMockModule("test-module")
        val typeAlias1 = createMockTypeAlias("TestType")

        val file = createMockParsedFile(IArray(interface1, clazz1, function1, variable1, enumDecl, module1, typeAlias1))

        val result = MoveGlobals(file)

        // Should have: interface, class interface, enum type, typeAlias, module, global namespace
        assert(result.members.length == 6)

        // Check type declarations at top level
        assert(result.members.count(_.isInstanceOf[TsDeclInterface]) == 2) // original + from class
        assert(result.members.count(_.isInstanceOf[TsDeclEnum]) == 1)      // type-only enum
        assert(result.members.count(_.isInstanceOf[TsDeclTypeAlias]) == 1)
        assert(result.members.count(_.isInstanceOf[TsDeclModule]) == 1)

        // Check global namespace contains value declarations
        val globalNamespace = result.members.find(_.isInstanceOf[TsDeclNamespace]).get.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.length == 4) // class, function, var, enum value
        assert(globalNamespace.members.exists {
          case clazz: TsDeclClass => clazz.name.value == "TestClass"
          case _                  => false
        })
        assert(globalNamespace.members.exists {
          case func: TsDeclFunction => func.name.value == "testFunction"
          case _                    => false
        })
        assert(globalNamespace.members.exists {
          case variable: TsDeclVar => variable.name.value == "testVar"
          case _                   => false
        })
        assert(globalNamespace.members.exists {
          case enumDecl: TsDeclEnum => enumDecl.name.value == "TestEnum"
          case _                    => false
        })
      }

      test("handles nested namespaces") {
        // MoveGlobals processes nested functions too, so the inner namespace will be empty
        val innerInterface = createMockInterface("InnerInterface", Empty).copy(
          codePath = CodePath.HasPath(createSimpleIdent("test"), TsQIdent.of("inner"))
        ) // Use interface instead of function
        val innerNamespace = createMockNamespace("InnerNamespace", IArray(innerInterface))
        val outerFunction  = createMockFunction("outerFunction")
        val file           = createMockParsedFile(IArray(innerNamespace, outerFunction))

        val result = MoveGlobals(file)

        assert(result.members.length == 2) // original namespace + global namespace

        // Check that original namespace is preserved (with interface)
        val originalNamespace = result.members
          .find(_.asInstanceOf[TsDeclNamespace].name.value == "InnerNamespace")
          .get
          .asInstanceOf[TsDeclNamespace]
        assert(originalNamespace.members.length == 1) // interface is preserved
        assert(originalNamespace.members.head.asInstanceOf[TsDeclInterface].name.value == "InnerInterface")

        // Check that global namespace contains the function
        val globalNamespace = result.members
          .find(_.asInstanceOf[TsDeclNamespace].name == TsIdent.Global)
          .get
          .asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.members.length == 2) // namespace + function

        // Check that outer function is in global
        assert(globalNamespace.members.exists {
          case func: TsDeclFunction => func.name.value == "outerFunction"
          case _                    => false
        })
      }

      test("handles complex class with members") {
        val staticProperty   = createMockProperty("staticProp").copy(isStatic = true)
        val instanceProperty = createMockProperty("instanceProp").copy(isStatic = false)
        val constructor = TsMemberCtor(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          signature = TsFunSig(NoComments, Empty, Empty, None)
        )
        val staticMethod   = createMockMethod("staticMethod").copy(isStatic = true)
        val instanceMethod = createMockMethod("instanceMethod").copy(isStatic = false)

        val members = IArray(staticProperty, instanceProperty, constructor, staticMethod, instanceMethod)
        val clazz   = createMockClass("ComplexClass", members)
        val file    = createMockParsedFile(IArray(clazz))

        val result = MoveGlobals(file)

        assert(result.members.length == 2) // interface + global namespace

        // Check interface at top level (should have non-static members)
        val interface = result.members.find(_.isInstanceOf[TsDeclInterface]).get.asInstanceOf[TsDeclInterface]
        assert(interface.name.value == "ComplexClass")
        assert(interface.members.length == 2) // instanceProperty + instanceMethod

        // Check class in global namespace (should have static members + constructor)
        val globalNamespace = result.members.find(_.isInstanceOf[TsDeclNamespace]).get.asInstanceOf[TsDeclNamespace]
        val globalClass     = globalNamespace.members.head.asInstanceOf[TsDeclClass]
        assert(globalClass.name.value == "ComplexClass")
        assert(globalClass.members.length == 3) // staticProperty + staticMethod + constructor
      }
    }

    test("MoveGlobals - Integration Testing") {
      test("works with realistic module structure") {
        // Simulate a realistic TypeScript module
        val apiInterface = createMockInterface("ApiResponse")
        val utilsClass   = createMockClass("Utils")
        val configVar    = createMockVar("config")
        val initFunction = createMockFunction("initialize")
        val statusEnum   = createMockEnum("Status")
        val helperType   = createMockTypeAlias("Helper")
        val nodeModule   = createMockModule("node")

        val file = createMockParsedFile(
          IArray(
            apiInterface,
            utilsClass,
            configVar,
            initFunction,
            statusEnum,
            helperType,
            nodeModule
          )
        )

        val result = MoveGlobals(file)

        // Should have proper separation of types and values
        assert(result.members.length == 6) // 3 types + 1 module + 1 global + 1 interface from class

        // Verify type declarations at top level
        val topLevelTypes = result.members.filterNot(_.isInstanceOf[TsDeclNamespace])
        assert(topLevelTypes.exists {
          case interface: TsDeclInterface => interface.name.value == "ApiResponse"
          case _                          => false
        })
        assert(topLevelTypes.exists {
          case interface: TsDeclInterface => interface.name.value == "Utils" // from class
          case _                          => false
        })
        assert(topLevelTypes.exists {
          case enumDecl: TsDeclEnum => enumDecl.name.value == "Status"
          case _                    => false
        })
        assert(topLevelTypes.exists {
          case typeAlias: TsDeclTypeAlias => typeAlias.name.value == "Helper"
          case _                          => false
        })
        assert(topLevelTypes.exists(_.isInstanceOf[TsDeclModule]))

        // Verify global namespace contains values
        val globalNamespace = result.members.find(_.isInstanceOf[TsDeclNamespace]).get.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.members.length == 4) // class, var, function, enum value
        assert(globalNamespace.members.exists {
          case clazz: TsDeclClass => clazz.name.value == "Utils"
          case _                  => false
        })
        assert(globalNamespace.members.exists {
          case variable: TsDeclVar => variable.name.value == "config"
          case _                   => false
        })
        assert(globalNamespace.members.exists {
          case func: TsDeclFunction => func.name.value == "initialize"
          case _                    => false
        })
        assert(globalNamespace.members.exists {
          case enumDecl: TsDeclEnum => enumDecl.name.value == "Status"
          case _                    => false
        })
      }

      test("handles library with special characters") {
        val function1       = createMockFunction("test-function")
        val variable1       = createMockVar("test_var")
        val specialCodePath = CodePath.HasPath(createSimpleIdent("@types"), TsQIdent.of("special-lib"))
        val file            = createMockParsedFile(IArray(function1, variable1), specialCodePath)

        val result = MoveGlobals(file)

        assert(result.members.length == 1) // global namespace

        val globalNamespace = result.members.head.asInstanceOf[TsDeclNamespace]
        assert(globalNamespace.name == TsIdent.Global)
        assert(globalNamespace.members.length == 2)

        // Verify code path is properly constructed
        assert(globalNamespace.codePath.isInstanceOf[CodePath.HasPath])
        val hasPath = globalNamespace.codePath.asInstanceOf[CodePath.HasPath]
        assert(hasPath.codePath.parts.last == TsIdent.Global)
      }
    }
  }
}
