package org.scalablytyped.converter.internal
package ts
package modules

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object AugmentModulesTests extends TestSuite {

  // Helper methods for creating test data specific to AugmentModules tests

  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent =
    TsQIdent(IArray.fromTraversable(parts.map(TsIdentSimple.apply)))

  def createMockModule(name: String, members: IArray[TsContainerOrDecl] = Empty): TsDeclModule =
    TsDeclModule(
      comments = NoComments,
      declared = false,
      name = TsIdentModule(None, List(name)),
      members = members,
      codePath = CodePath.HasPath(createSimpleIdent(name), createQIdent(name)),
      jsLocation = JsLocation.Zero
    )

  def createMockAugmentedModule(name: String, members: IArray[TsContainerOrDecl] = Empty): TsAugmentedModule =
    TsAugmentedModule(
      comments = NoComments,
      name = TsIdentModule(None, List(name)),
      members = members,
      codePath = CodePath.HasPath(createSimpleIdent(s"${name}_augmented"), createQIdent(s"${name}_augmented")),
      jsLocation = JsLocation.Zero
    )

  def createMockParsedFile(
      members: IArray[TsContainerOrDecl] = Empty
  ): TsParsedFile =
    TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = members,
      codePath = CodePath.NoPath
    )

  def createMockScope(): TsTreeScope = {
    val libName = TsIdentLibrarySimple("test-lib")
    val logger  = Logger.DevNull
    val deps    = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger)
  }

  def tests = Tests {
    test("AugmentModules - Basic Functionality") {
      test("target method exists") {
        // Test that the target method exists and can be called
        val module = createMockModule("TestModule")
        val scope  = createMockScope()
        val result = AugmentModules.target(module, scope)
        assert(result.isInstanceOf[CodePath.HasPath])
      }

      test("apply method exists") {
        // Test that the apply method exists and can be called
        val parsedFile = createMockParsedFile()
        val scope      = createMockScope()
        val result     = AugmentModules.apply(scope)(parsedFile)
        assert(result.isInstanceOf[TsParsedFile])
      }
    }

    test("AugmentModules - Target Determination") {
      test("returns module codePath when no exported namespace") {
        val module = createMockModule("TestModule")
        val scope  = createMockScope()
        val result = AugmentModules.target(module, scope)

        assert(result.codePath.parts.last.value == "TestModule")
      }

      test("handles module with empty exports") {
        val module = createMockModule("TestModule")
        val scope  = createMockScope()
        val result = AugmentModules.target(module, scope)

        assert(result.codePath.parts.last.value == "TestModule")
      }
    }

    test("AugmentModules - File Processing") {
      test("processes file with no augmented modules") {
        val module = createMockModule("TestModule")
        val parsedFile = createMockParsedFile(
          members = IArray(module)
        )
        val scope = createMockScope()

        val result = AugmentModules.apply(scope)(parsedFile)

        assert(result.members.length == 1)
        assert(result.members.head == module)
      }

      test("processes file with augmented modules but no matching targets") {
        val module          = createMockModule("TestModule")
        val augmentedModule = createMockAugmentedModule("OtherModule")
        val parsedFile = createMockParsedFile(
          members = IArray(module, augmentedModule)
        )
        val scope = createMockScope()

        val result = AugmentModules.apply(scope)(parsedFile)

        // Should keep both since no matching target
        assert(result.members.length == 2)
      }
    }

    test("AugmentModules - Edge Cases") {
      test("handles empty parsed file") {
        val parsedFile = createMockParsedFile(members = Empty)
        val scope      = createMockScope()

        val result = AugmentModules.apply(scope)(parsedFile)

        assert(result.members.isEmpty)
      }

      test("handles file with only augmented modules") {
        val augmentedModule = createMockAugmentedModule("TestModule")
        val parsedFile = createMockParsedFile(
          members = IArray(augmentedModule)
        )
        val scope = createMockScope()

        val result = AugmentModules.apply(scope)(parsedFile)

        // Should keep the augmented module since no target to merge with
        assert(result.members.length == 1)
      }

      test("preserves non-module members") {
        val interface = createMockInterface("TestInterface")
        val parsedFile = createMockParsedFile(
          members = IArray(interface)
        )
        val scope = createMockScope()

        val result = AugmentModules.apply(scope)(parsedFile)

        assert(result.members.length == 1)
        assert(result.members.head == interface)
      }
    }

    test("AugmentModules - Complex Scenarios") {
      test("handles mixed content with modules and other declarations") {
        val module          = createMockModule("TestModule")
        val interface       = createMockInterface("TestInterface")
        val augmentedModule = createMockAugmentedModule("OtherModule")

        val parsedFile = createMockParsedFile(
          members = IArray(module, interface, augmentedModule)
        )
        val scope = createMockScope()

        val result = AugmentModules.apply(scope)(parsedFile)

        // Should preserve all members since no matching targets
        assert(result.members.length == 3)
      }

      test("handles multiple augmented modules") {
        val augmentedModule1 = createMockAugmentedModule("Module1")
        val augmentedModule2 = createMockAugmentedModule("Module2")

        val parsedFile = createMockParsedFile(
          members = IArray(augmentedModule1, augmentedModule2)
        )
        val scope = createMockScope()

        val result = AugmentModules.apply(scope)(parsedFile)

        // Should keep both augmented modules
        assert(result.members.length == 2)
      }
    }
  }

  // Additional helper methods for more comprehensive testing
  def createMockInterface(name: String, members: IArray[TsMember] = Empty): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = Empty,
      members = members,
      codePath = CodePath.HasPath(createSimpleIdent(name), createQIdent(name))
    )
}
