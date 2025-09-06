package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object FindAvailableNameTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createMockInterface(name: String, members: IArray[TsMember] = Empty): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = Empty,
      members = members,
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

  def createMockTypeAlias(name: String, tpe: TsType = TsTypeRef.string): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      alias = tpe,
      codePath = CodePath.NoPath
    )

  def createMockVar(name: String, tpe: Option[TsType] = Some(TsTypeRef.string)): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
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

  def createMockParsedFile(members: IArray[TsContainerOrDecl] = Empty): TsParsedFile =
    TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = members,
      codePath = CodePath.NoPath
    )

  def createMockScope(declarations: TsDecl*): TsTreeScope = {
    val parsedFile = createMockParsedFile(IArray.fromTraversable(declarations))

    val root = TsTreeScope(
      libName = TsIdentLibrarySimple("test-lib"),
      pedantic = false,
      deps = Map.empty,
      logger = Logger.DevNull
    )

    root / parsedFile
  }

  def tests = Tests {
    test("FindAvailableName - Basic Functionality") {
      test("ExtractClasses uses FindAvailableName internally") {
        val scope      = createMockScope()
        val parsedFile = createMockParsedFile()

        // This should work without errors, indicating FindAvailableName is functioning
        val result = ExtractClasses.newMembers(scope, parsedFile)

        assert(result != null)
        assert(result.isEmpty) // Empty input should produce empty output
      }

      test("handles container with no conflicting names") {
        val scope      = createMockScope()
        val variable   = createMockVar("TestVar")
        val parsedFile = createMockParsedFile(IArray(variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should return the variable unchanged since no extraction is needed
        assert(result.length == 1)
        assert(result.contains(variable))
      }
    }

    test("FindAvailableName - Name Conflict Resolution") {
      test("handles name conflicts with existing interface") {
        val scope             = createMockScope()
        val existingInterface = createMockInterface("TestClass")
        val variable          = createMockVar("TestClass", Some(TsTypeRef.string))
        val parsedFile        = createMockParsedFile(IArray(existingInterface, variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle the conflict gracefully - both should be present
        assert(result.length == 2)
        assert(result.exists(_.isInstanceOf[TsDeclInterface]))
        assert(result.exists(_.isInstanceOf[TsDeclVar]))
      }

      test("handles name conflicts with existing class") {
        val scope         = createMockScope()
        val existingClass = createMockClass("TestClass")
        val variable      = createMockVar("TestClass", Some(TsTypeRef.string))
        val parsedFile    = createMockParsedFile(IArray(existingClass, variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle the conflict gracefully - both should be present
        assert(result.length == 2)
        assert(result.exists(_.isInstanceOf[TsDeclClass]))
        assert(result.exists(_.isInstanceOf[TsDeclVar]))
      }

      test("handles name conflicts with existing type alias") {
        val scope             = createMockScope()
        val existingTypeAlias = createMockTypeAlias("TestClass")
        val variable          = createMockVar("TestClass", Some(TsTypeRef.string))
        val parsedFile        = createMockParsedFile(IArray(existingTypeAlias, variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle the conflict gracefully - both should be present
        assert(result.length == 2)
        assert(result.exists(_.isInstanceOf[TsDeclTypeAlias]))
        assert(result.exists(_.isInstanceOf[TsDeclVar]))
      }
    }

    test("FindAvailableName - Special Identifier Handling") {
      test("handles namespaced identifier") {
        val scope         = createMockScope()
        val namespacedVar = createMockVar("^", Some(TsTypeRef.string)) // TsIdent.namespaced
        val parsedFile    = createMockParsedFile(IArray(namespacedVar))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle the special namespaced identifier
        assert(result.length == 1)
        assert(result.contains(namespacedVar))
      }

      test("handles backup name generation") {
        val scope             = createMockScope()
        val existingInterface = createMockInterface("TestName")
        // Create a variable that would conflict and potentially trigger backup name logic
        val variable   = createMockVar("TestName", Some(TsTypeRef.string))
        val parsedFile = createMockParsedFile(IArray(existingInterface, variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle the conflict and both should be present
        assert(result.length == 2)
        assert(result.exists(_.isInstanceOf[TsDeclInterface]))
        assert(result.exists(_.isInstanceOf[TsDeclVar]))
      }
    }

    test("FindAvailableName - Variable Coexistence") {
      test("allows variables to coexist with non-type declarations") {
        val scope      = createMockScope()
        val variable1  = createMockVar("TestVar", Some(TsTypeRef.string))
        val variable2  = createMockVar("TestVar", Some(TsTypeRef.number))
        val parsedFile = createMockParsedFile(IArray(variable1, variable2))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Variables with same name should be allowed (no type collision)
        assert(result.length == 2)
        assert(result.forall(_.isInstanceOf[TsDeclVar]))
      }

      test("handles mixed declaration types") {
        val scope      = createMockScope()
        val variable   = createMockVar("MixedName", Some(TsTypeRef.string))
        val namespace  = createMockNamespace("MixedName")
        val parsedFile = createMockParsedFile(IArray(variable, namespace))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle mixed types appropriately
        assert(result.length == 2)
        assert(result.exists(_.isInstanceOf[TsDeclVar]))
        assert(result.exists(_.isInstanceOf[TsDeclNamespace]))
      }
    }

    test("FindAvailableName - Edge Cases") {
      test("handles empty container") {
        val scope      = createMockScope()
        val parsedFile = createMockParsedFile(Empty)

        val result = ExtractClasses.newMembers(scope, parsedFile)

        assert(result.isEmpty)
      }

      test("handles container with only unnamed members") {
        val scope = createMockScope()
        // Create a parsed file with only unnamed members (directives, etc.)
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = IArray(Directive.NoStdLib),
          members = Empty,
          codePath = CodePath.NoPath
        )

        val result = ExtractClasses.newMembers(scope, parsedFile)

        assert(result.isEmpty)
      }

      test("handles multiple conflicts of same type") {
        val scope      = createMockScope()
        val interface1 = createMockInterface("ConflictName")
        val interface2 = createMockInterface("ConflictName")
        val interface3 = createMockInterface("ConflictName")
        val parsedFile = createMockParsedFile(IArray(interface1, interface2, interface3))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle multiple declarations with same name
        assert(result.length == 3)
        assert(result.forall(_.isInstanceOf[TsDeclInterface]))
      }
    }

    test("FindAvailableName - Namespace Context") {
      test("handles namespaced scope correctly") {
        val scope                 = createMockScope()
        val namespacedDecl        = createMockNamespace("^") // TsIdent.namespaced
        val innerVar              = createMockVar("TestVar", Some(TsTypeRef.string))
        val namespacedWithMembers = namespacedDecl.copy(members = IArray(innerVar))
        val parsedFile            = createMockParsedFile(IArray(namespacedWithMembers))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle namespaced context
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclNamespace])
      }

      test("handles nested namespace conflicts") {
        val scope          = createMockScope()
        val outerInterface = createMockInterface("ConflictName")
        val innerInterface = createMockInterface("ConflictName")
        val namespace      = createMockNamespace("Container", IArray(innerInterface))
        val parsedFile     = createMockParsedFile(IArray(outerInterface, namespace))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle nested conflicts appropriately
        assert(result.length == 2)
        assert(result.exists(_.isInstanceOf[TsDeclInterface]))
        assert(result.exists(_.isInstanceOf[TsDeclNamespace]))
      }
    }

    test("FindAvailableName - Complex Type Scenarios") {
      test("handles constructor type variables") {
        val scope = createMockScope()
        val ctorSig = TsFunSig(
          comments = NoComments,
          tparams = Empty,
          params = Empty,
          resultType = Some(TsTypeRef(NoComments, createQIdent("TestClass"), Empty))
        )
        val ctorType   = TsTypeConstructor(isAbstract = false, TsTypeFunction(ctorSig))
        val variable   = createMockVar("TestClass", Some(ctorType))
        val parsedFile = createMockParsedFile(IArray(variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle constructor types (may extract classes)
        assert(result.nonEmpty)
        assert(result.forall(_.isInstanceOf[TsContainerOrDecl]))
      }

      test("handles function type variables") {
        val scope = createMockScope()
        val funSig = TsFunSig(
          comments = NoComments,
          tparams = Empty,
          params = Empty,
          resultType = Some(TsTypeRef.string)
        )
        val funType    = TsTypeFunction(funSig)
        val variable   = createMockVar("TestFunction", Some(funType))
        val parsedFile = createMockParsedFile(IArray(variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle function types
        assert(result.length == 1)
        assert(result.contains(variable))
      }

      test("handles object type variables") {
        val scope = createMockScope()
        val property = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = createSimpleIdent("prop"),
          tpe = Some(TsTypeRef.string),
          expr = None,
          isStatic = false,
          isReadOnly = false
        )
        val objectType = TsTypeObject(NoComments, IArray(property))
        val variable   = createMockVar("TestObject", Some(objectType))
        val parsedFile = createMockParsedFile(IArray(variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle object types
        assert(result.nonEmpty)
        assert(result.forall(_.isInstanceOf[TsContainerOrDecl]))
      }
    }

    test("FindAvailableName - Boundary Conditions") {
      test("handles null and undefined scenarios gracefully") {
        val scope      = createMockScope()
        val variable   = createMockVar("TestVar", None) // No type
        val parsedFile = createMockParsedFile(IArray(variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle variables without types
        assert(result.length == 1)
        assert(result.contains(variable))
      }

      test("handles very long identifier names") {
        val scope      = createMockScope()
        val longName   = "A" * 100 // Very long identifier
        val variable   = createMockVar(longName, Some(TsTypeRef.string))
        val parsedFile = createMockParsedFile(IArray(variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle long names
        assert(result.length == 1)
        assert(result.contains(variable))
      }

      test("handles special characters in names") {
        val scope       = createMockScope()
        val specialName = "$special_name123"
        val variable    = createMockVar(specialName, Some(TsTypeRef.string))
        val parsedFile  = createMockParsedFile(IArray(variable))

        val result = ExtractClasses.newMembers(scope, parsedFile)

        // Should handle special characters
        assert(result.length == 1)
        assert(result.contains(variable))
      }
    }
  }
}
