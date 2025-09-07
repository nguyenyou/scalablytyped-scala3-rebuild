package org.scalablytyped.converter.internal
package ts
package modules

import utest.*

object DeriveCopyTests extends TestSuite {

  // Helper methods for creating test data specific to DeriveCopy tests

  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent =
    TsQIdent(IArray.fromTraversable(parts.map(TsIdentSimple.apply)))

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

  def createMockFunction(
      name: String,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = TsFunSig(NoComments, Empty, Empty, Some(TsTypeRef.any)),
      codePath = codePath,
      jsLocation = JsLocation.Zero
    )

  def createHasPath(parts: String*): CodePath.HasPath =
    CodePath.HasPath(createSimpleIdent(parts.last), createQIdent(parts*))

  def createMockProperty(name: String, tpe: TsType): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(tpe),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def tests = Tests {
    test("DeriveCopy - Basic Functionality") {
      test("apply method exists and can be called") {
        val interface = createMockInterface("TestInterface", codePath = createHasPath("test", "TestInterface"))
        val ownerCp   = createHasPath("owner")
        val result    = DeriveCopy.apply(interface, ownerCp, None)
        assert(result.nonEmpty)
      }

      test("transforms interface to type alias") {
        val interface = createMockInterface("TestInterface", codePath = createHasPath("test", "TestInterface"))
        val ownerCp   = createHasPath("owner")
        val result    = DeriveCopy.apply(interface, ownerCp, None)

        assert(result.length == 1)
        assert(result.head.name.value == "TestInterface")
        // DeriveCopy transforms interfaces to type aliases
        assert(result.head.isInstanceOf[TsDeclTypeAlias])
      }
    }

    test("DeriveCopy - Path Matching") {
      test("creates type alias with updated path") {
        val ownerCp   = createHasPath("owner")
        val childCp   = createHasPath("owner", "TestInterface")
        val interface = createMockInterface("TestInterface", codePath = childCp)

        val result = DeriveCopy.apply(interface, ownerCp, None)

        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclTypeAlias])
        val typeAlias = result.head.asInstanceOf[TsDeclTypeAlias]
        assert(typeAlias.name.value == "TestInterface")
        assert(typeAlias.codePath.asInstanceOf[CodePath.HasPath].inLibrary.value == "owner")
      }

      test("creates type alias when paths don't match") {
        val ownerCp   = createHasPath("different")
        val childCp   = createHasPath("owner", "TestInterface")
        val interface = createMockInterface("TestInterface", codePath = childCp)

        val result = DeriveCopy.apply(interface, ownerCp, None)

        assert(result.length == 1)
        assert(result.head.name.value == "TestInterface")
        assert(result.head.isInstanceOf[TsDeclTypeAlias])
      }
    }

    test("DeriveCopy - Renaming") {
      test("renames interface when rename provided") {
        val interface = createMockInterface("OriginalName", codePath = createHasPath("test", "OriginalName"))
        val ownerCp   = createHasPath("owner")
        val newName   = createSimpleIdent("NewName")

        val result = DeriveCopy.apply(interface, ownerCp, Some(newName))

        assert(result.length == 1)
        assert(result.head.name.value == "NewName")
        assert(result.head.isInstanceOf[TsDeclTypeAlias])
      }

      test("skips rename when new name equals original name") {
        val interface = createMockInterface("SameName", codePath = createHasPath("test", "SameName"))
        val ownerCp   = createHasPath("owner")
        val sameName  = createSimpleIdent("SameName")

        val result = DeriveCopy.apply(interface, ownerCp, Some(sameName))

        assert(result.length == 1)
        assert(result.head.name.value == "SameName")
        assert(result.head.isInstanceOf[TsDeclTypeAlias])
      }
    }

    test("DeriveCopy - Different Declaration Types") {
      test("handles class declarations") {
        val clazz   = createMockClass("TestClass", codePath = createHasPath("test", "TestClass"))
        val ownerCp = createHasPath("owner")

        val result = DeriveCopy.apply(clazz, ownerCp, None)

        assert(result.length == 1)
        assert(result.head.name.value == "TestClass")
        // Classes are copied with updated codePath but remain as classes
        assert(result.head.isInstanceOf[TsDeclClass])
        val resultClass = result.head.asInstanceOf[TsDeclClass]
        assert(resultClass.codePath.asInstanceOf[CodePath.HasPath].inLibrary.value == "owner")
      }

      test("handles function declarations") {
        val function = createMockFunction("testFunc", codePath = createHasPath("test", "testFunc"))
        val ownerCp  = createHasPath("owner")

        val result = DeriveCopy.apply(function, ownerCp, None)

        assert(result.length == 1)
        assert(result.head.name.value == "testFunc")
        // Functions are copied with updated codePath but remain as functions
        assert(result.head.isInstanceOf[TsDeclFunction])
        val resultFunction = result.head.asInstanceOf[TsDeclFunction]
        assert(resultFunction.codePath.asInstanceOf[CodePath.HasPath].inLibrary.value == "owner")
      }

      test("handles module declarations") {
        val module  = createMockModule("TestModule", codePath = createHasPath("test", "TestModule"))
        val ownerCp = createHasPath("owner")

        val result = DeriveCopy.apply(module, ownerCp, None)

        assert(result.length == 1)
        assert(result.head.name.value == "TestModule")
        // Modules are copied with updated codePath but remain as modules
        assert(result.head.isInstanceOf[TsDeclModule])
        val resultModule = result.head.asInstanceOf[TsDeclModule]
        assert(resultModule.codePath.asInstanceOf[CodePath.HasPath].inLibrary.value == "owner")
      }
    }

    test("DeriveCopy - Edge Cases") {
      test("handles interface with members") {
        val member = createMockProperty("prop", TsTypeRef.any)
        val interface = createMockInterface(
          "TestInterface",
          members = IArray(member),
          codePath = createHasPath("test", "TestInterface")
        )
        val ownerCp = createHasPath("owner")

        val result = DeriveCopy.apply(interface, ownerCp, None)

        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclTypeAlias])
        val typeAlias = result.head.asInstanceOf[TsDeclTypeAlias]
        assert(typeAlias.name.value == "TestInterface")
      }

      test("handles complex path structures") {
        val interface =
          createMockInterface("TestInterface", codePath = createHasPath("deep", "nested", "path", "TestInterface"))
        val ownerCp = createHasPath("owner", "sub")

        val result = DeriveCopy.apply(interface, ownerCp, None)

        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclTypeAlias])
        val typeAlias = result.head.asInstanceOf[TsDeclTypeAlias]
        assert(typeAlias.codePath.asInstanceOf[CodePath.HasPath].inLibrary.value == "sub")
      }
    }
  }
}
