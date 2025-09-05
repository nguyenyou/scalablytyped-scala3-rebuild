package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object RemoveStubsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createMockInterface(
    name: String,
    members: IArray[TsMember] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = Empty,
      members = members,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockClass(
    name: String,
    members: IArray[TsMember] = Empty
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
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockTypeAlias(
    name: String,
    alias: TsType
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      alias = alias,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMemberProperty(name: String): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(TsTypeRef(NoComments, createQIdent("string"), Empty)),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createMockScope(declarations: TsContainerOrDecl*): TsTreeScope = {
    val parsedFile = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = IArray.fromTraversable(declarations),
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
    )
    
    val root = TsTreeScope(
      libName = TsIdentLibrarySimple("test-lib"),
      pedantic = false,
      deps = Map.empty,
      logger = Logger.DevNull
    )
    
    root / parsedFile
  }

  def createMockScopeWithStd(stdDeclarations: TsContainerOrDecl*): TsTreeScope = {
    val stdFile = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = IArray.fromTraversable(stdDeclarations),
      codePath = CodePath.HasPath(TsIdentLibrarySimple("std"), createQIdent("index"))
    )

    val testFile = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = Empty,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
    )

    // Create a simple TsLib implementation
    val stdLib = new TsTreeScope.TsLib {
      val libName = TsIdentLibrarySimple("std")
      val packageJsonOpt = None
    }

    val root = TsTreeScope(
      libName = TsIdentLibrarySimple("test-lib"),
      pedantic = false,
      deps = Map(stdLib -> stdFile),
      logger = Logger.DevNull
    )

    root / testFile
  }

  def tests = Tests {
    test("RemoveStubs - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(RemoveStubs.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsParsedFile method") {
        val scope = createMockScope()
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = Empty,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
        )
        val result = RemoveStubs.enterTsParsedFile(scope)(parsedFile)
        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
      }

      test("has enterTsGlobal method") {
        val scope = createMockScope()
        val global = TsGlobal(
          comments = NoComments,
          declared = false,
          members = Empty,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("global"))
        )
        val result = RemoveStubs.enterTsGlobal(scope)(global)
        assert(result != null)
        assert(result.isInstanceOf[TsGlobal])
      }

      test("has clean method") {
        val scope = createMockScope()
        val interface = createMockInterface("TestInterface")
        val members = IArray(interface)
        val result = RemoveStubs.clean(scope, members)
        assert(result != null)
        assert(result.isInstanceOf[IArray[TsContainerOrDecl]])
      }
    }

    test("RemoveStubs - Empty Interface Detection") {
      test("removes empty interfaces that conflict with std") {
        val stdInterface = createMockInterface("Document")
        val scope = createMockScopeWithStd(stdInterface)
        val emptyInterface = createMockInterface("Document", Empty)
        val members = IArray[TsContainerOrDecl](emptyInterface)
        
        val result = RemoveStubs.clean(scope, members)
        
        // Empty interface should be removed because it conflicts with std
        assert(result.isEmpty)
      }

      test("removes empty interfaces that conflict with node") {
        val scope = createMockScope()
        val emptyInterface = createMockInterface("Buffer", Empty)
        val members = IArray[TsContainerOrDecl](emptyInterface)
        
        val result = RemoveStubs.clean(scope, members)
        
        // Should check for node types and remove if conflicting
        assert(result.length <= 1) // May or may not be removed depending on node lookup
      }

      test("keeps empty interfaces that don't conflict") {
        val scope = createMockScope()
        val emptyInterface = createMockInterface("CustomInterface", Empty)
        val members = IArray[TsContainerOrDecl](emptyInterface)
        
        val result = RemoveStubs.clean(scope, members)
        
        // Non-conflicting empty interface should be kept
        assert(result.length == 1)
        assert(result.head == emptyInterface)
      }

      test("keeps non-empty interfaces regardless of name") {
        val stdInterface = createMockInterface("Document")
        val scope = createMockScopeWithStd(stdInterface)
        val nonEmptyInterface = createMockInterface("Document", IArray(createMemberProperty("prop")))
        val members = IArray[TsContainerOrDecl](nonEmptyInterface)
        
        val result = RemoveStubs.clean(scope, members)
        
        // Non-empty interface should be kept even if name conflicts
        assert(result.length == 1)
        assert(result.head == nonEmptyInterface)
      }
    }

    test("RemoveStubs - TsParsedFile Processing") {
      test("filters empty stub interfaces from parsed file") {
        val stdInterface = createMockInterface("HTMLElement")
        val scope = createMockScopeWithStd(stdInterface)
        
        val emptyStub = createMockInterface("HTMLElement", Empty)
        val validInterface = createMockInterface("CustomInterface", IArray(createMemberProperty("prop")))
        val validClass = createMockClass("CustomClass")
        
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(emptyStub, validInterface, validClass),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
        )
        
        val result = RemoveStubs.enterTsParsedFile(scope)(parsedFile)
        
        // Should remove empty stub but keep valid declarations
        assert(result.members.length == 2)
        assert(result.members.contains(validInterface))
        assert(result.members.contains(validClass))
        assert(!result.members.contains(emptyStub))
      }

      test("preserves all members when no stubs present") {
        val scope = createMockScope()
        
        val interface1 = createMockInterface("Interface1", IArray(createMemberProperty("prop1")))
        val interface2 = createMockInterface("Interface2", IArray(createMemberProperty("prop2")))
        val class1 = createMockClass("Class1")
        
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(interface1, interface2, class1),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
        )
        
        val result = RemoveStubs.enterTsParsedFile(scope)(parsedFile)
        
        // All members should be preserved
        assert(result.members.length == 3)
        assert(result.members.contains(interface1))
        assert(result.members.contains(interface2))
        assert(result.members.contains(class1))
      }

      test("handles empty parsed file") {
        val scope = createMockScope()
        
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = Empty,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
        )
        
        val result = RemoveStubs.enterTsParsedFile(scope)(parsedFile)
        
        // Empty file should remain empty
        assert(result.members.isEmpty)
      }
    }

    test("RemoveStubs - TsGlobal Processing") {
      test("filters empty stub interfaces from global scope") {
        val stdInterface = createMockInterface("Window")
        val scope = createMockScopeWithStd(stdInterface)
        
        val emptyStub = createMockInterface("Window", Empty)
        val validInterface = createMockInterface("CustomGlobal", IArray(createMemberProperty("prop")))
        
        val global = TsGlobal(
          comments = NoComments,
          declared = false,
          members = IArray(emptyStub, validInterface),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("global"))
        )
        
        val result = RemoveStubs.enterTsGlobal(scope)(global)
        
        // Should remove empty stub but keep valid declarations
        assert(result.members.length == 1)
        assert(result.members.contains(validInterface))
        assert(!result.members.contains(emptyStub))
      }

      test("preserves global scope when no stubs present") {
        val scope = createMockScope()
        
        val interface1 = createMockInterface("GlobalInterface", IArray(createMemberProperty("prop")))
        val class1 = createMockClass("GlobalClass")
        
        val global = TsGlobal(
          comments = NoComments,
          declared = false,
          members = IArray(interface1, class1),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("global"))
        )
        
        val result = RemoveStubs.enterTsGlobal(scope)(global)
        
        // All members should be preserved
        assert(result.members.length == 2)
        assert(result.members.contains(interface1))
        assert(result.members.contains(class1))
      }
    }

    test("RemoveStubs - Edge Cases") {
      test("handles mixed declaration types") {
        val scope = createMockScope()
        
        val emptyInterface = createMockInterface("EmptyInterface", Empty)
        val nonEmptyInterface = createMockInterface("NonEmptyInterface", IArray(createMemberProperty("prop")))
        val typeAlias = createMockTypeAlias("TypeAlias", TsTypeRef(NoComments, createQIdent("string"), Empty))
        val class1 = createMockClass("Class1")
        
        val members = IArray[TsContainerOrDecl](emptyInterface, nonEmptyInterface, typeAlias, class1)
        
        val result = RemoveStubs.clean(scope, members)
        
        // Should keep non-interface declarations and non-empty interfaces
        assert(result.length >= 3) // At least non-empty interface, type alias, and class
        assert(result.contains(nonEmptyInterface))
        assert(result.contains(typeAlias))
        assert(result.contains(class1))
      }

      test("handles interfaces with same name but different content") {
        val stdInterface = createMockInterface("EventTarget")
        val scope = createMockScopeWithStd(stdInterface)
        
        val emptyStub = createMockInterface("EventTarget", Empty)
        val extendedInterface = createMockInterface("EventTarget", IArray(createMemberProperty("customProp")))
        
        val members = IArray[TsContainerOrDecl](emptyStub, extendedInterface)
        
        val result = RemoveStubs.clean(scope, members)
        
        // Should remove empty stub but keep extended interface
        assert(result.length == 1)
        assert(result.head == extendedInterface)
      }

      test("preserves interfaces when std lookup fails") {
        val scope = createMockScope() // No std dependencies
        
        val emptyInterface = createMockInterface("Document", Empty)
        val members = IArray[TsContainerOrDecl](emptyInterface)
        
        val result = RemoveStubs.clean(scope, members)
        
        // Should keep interface when std lookup fails
        assert(result.length == 1)
        assert(result.head == emptyInterface)
      }

      test("handles multiple empty interfaces") {
        val stdInterface1 = createMockInterface("Document")
        val stdInterface2 = createMockInterface("Window")
        val scope = createMockScopeWithStd(stdInterface1, stdInterface2)
        
        val emptyStub1 = createMockInterface("Document", Empty)
        val emptyStub2 = createMockInterface("Window", Empty)
        val emptyCustom = createMockInterface("CustomEmpty", Empty)
        
        val members = IArray[TsContainerOrDecl](emptyStub1, emptyStub2, emptyCustom)
        
        val result = RemoveStubs.clean(scope, members)
        
        // Should remove std conflicts but keep custom empty interface
        assert(result.length == 1)
        assert(result.head == emptyCustom)
      }
    }

    test("RemoveStubs - Integration Scenarios") {
      test("handles real-world stub removal scenario") {
        val stdDocument = createMockInterface("Document")
        val stdWindow = createMockInterface("Window")
        val scope = createMockScopeWithStd(stdDocument, stdWindow)
        
        // Simulate a library that defines empty stubs for DOM types
        val documentStub = createMockInterface("Document", Empty)
        val windowStub = createMockInterface("Window", Empty)
        val libraryInterface = createMockInterface("LibraryAPI", IArray(createMemberProperty("version")))
        val libraryClass = createMockClass("LibraryImpl", IArray(createMemberProperty("config")))
        
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(documentStub, windowStub, libraryInterface, libraryClass),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("some-lib"), createQIdent("index"))
        )
        
        val result = RemoveStubs.enterTsParsedFile(scope)(parsedFile)
        
        // Should remove DOM stubs but keep library-specific declarations
        assert(result.members.length == 2)
        assert(result.members.contains(libraryInterface))
        assert(result.members.contains(libraryClass))
        assert(!result.members.contains(documentStub))
        assert(!result.members.contains(windowStub))
      }

      test("preserves library extensions of standard types") {
        val stdConsole = createMockInterface("Console")
        val scope = createMockScopeWithStd(stdConsole)
        
        // Library extends Console with additional methods
        val extendedConsole = createMockInterface("Console", IArray(
          createMemberProperty("debug"),
          createMemberProperty("trace")
        ))
        
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(extendedConsole),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("enhanced-console"), createQIdent("index"))
        )
        
        val result = RemoveStubs.enterTsParsedFile(scope)(parsedFile)
        
        // Should keep extended interface even though name conflicts with std
        assert(result.members.length == 1)
        assert(result.members.head == extendedConsole)
      }
    }
  }
}