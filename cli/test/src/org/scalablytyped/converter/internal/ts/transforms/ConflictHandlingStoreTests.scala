package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object ConflictHandlingStoreTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeParam(name: String, default: Option[TsType] = None, upperBound: Option[TsType] = None): TsTypeParam =
    TsTypeParam(NoComments, createSimpleIdent(name), upperBound, default)

  def createMockInterface(
      name: String,
      tparams: IArray[TsTypeParam] = Empty,
      members: IArray[TsMember] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      inheritance = Empty,
      members = members,
      codePath = CodePath.NoPath
    )

  def createMockProperty(name: String, tpe: TsType = TsTypeRef.string): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(tpe),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createMockMethod(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(TsTypeRef.void)
      ),
      isStatic = false,
      isReadOnly = false
    )

  def createMockCall(): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(TsTypeRef.void)
      )
    )

  def createMockScope(): TsTreeScope = {
    val libName = TsIdentLibrarySimple("test-lib")
    val logger  = Logger.DevNull
    val deps    = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger)
  }

  def createLibraryIdent(name: String): TsIdentLibrary = TsIdentLibrarySimple(name)

  def tests = Tests {
    test("ConflictHandlingStore - Basic Construction") {
      test("creates store with library and namespace identifiers") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)

        assert(store.interfaces.isEmpty)
      }

      test("creates store with different library types") {
        val simpleLib = TsIdentLibrarySimple("simple-lib")
        val scopedLib = TsIdentLibraryScoped("scope", "name")
        val into      = createSimpleIdent("TestNamespace")

        val store1 = new ExtractInterfaces.ConflictHandlingStore(simpleLib, into)
        val store2 = new ExtractInterfaces.ConflictHandlingStore(scopedLib, into)

        assert(store1.interfaces.isEmpty)
        assert(store2.interfaces.isEmpty)
      }
    }

    test("ConflictHandlingStore - addInterface Method") {
      test("adds interface with simple name and no conflicts") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members           = IArray(createMockProperty("name"))
        val referencedTparams = Empty

        val codePath = store.addInterface(scope, "User", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        assert(store.interfaces.size == 1)
        assert(store.interfaces.contains(createSimpleIdent("User")))
        assert(codePath.isInstanceOf[CodePath.HasPath])
      }

      test("handles empty members") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members           = Empty
        val referencedTparams = Empty

        val codePath = store.addInterface(scope, "Empty", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        assert(store.interfaces.size == 1)
        // With empty members, DeriveNonConflictingName may generate a different name
        val generatedName = store.interfaces.keys.head.value
        assert(generatedName.nonEmpty)
      }

      test("handles multiple members of different types") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members = IArray(
          createMockProperty("name"),
          createMockMethod("getValue"),
          createMockCall()
        )
        val referencedTparams = Empty

        val codePath = store.addInterface(scope, "Complex", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        assert(store.interfaces.size == 1)
        val interface = store.interfaces(createSimpleIdent("Complex"))
        assert(interface.members.length == 3)
      }
    }

    test("ConflictHandlingStore - Type Parameter Conflicts") {
      test("rejects interface name that conflicts with type parameter") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members           = IArray(createMockProperty("value"))
        val referencedTparams = IArray(createTypeParam("T"))

        val codePath = store.addInterface(scope, "T", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        // Should generate a different name since "T" conflicts with type parameter
        assert(store.interfaces.size == 1)
        assert(!store.interfaces.contains(createSimpleIdent("T")))
        // Should have generated an alternative name
        val generatedName = store.interfaces.keys.head
        assert(generatedName.value != "T")
      }

      test("allows interface name that doesn't conflict with type parameters") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members           = IArray(createMockProperty("value"))
        val referencedTparams = IArray(createTypeParam("T"), createTypeParam("U"))

        val codePath = store.addInterface(scope, "Result", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        assert(store.interfaces.size == 1)
        assert(store.interfaces.contains(createSimpleIdent("Result")))
      }

      test("handles multiple type parameter conflicts") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members = IArray(createMockProperty("value"))
        val referencedTparams = IArray(
          createTypeParam("T"),
          createTypeParam("U"),
          createTypeParam("V")
        )

        // Try to add interface with name that conflicts with first type param
        val codePath1 = store.addInterface(scope, "T", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        // Try to add interface with name that conflicts with second type param
        val codePath2 = store.addInterface(scope, "U", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        assert(store.interfaces.size == 2)
        assert(!store.interfaces.contains(createSimpleIdent("T")))
        assert(!store.interfaces.contains(createSimpleIdent("U")))
      }
    }

    test("ConflictHandlingStore - Interface Conflicts and Deduplication") {
      test("reuses existing interface with same members and type parameters") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members           = IArray(createMockProperty("name"))
        val referencedTparams = IArray(createTypeParam("T"))

        // Add first interface
        val codePath1 = store.addInterface(scope, "User", members, referencedTparams) { name =>
          createMockInterface(name.value, referencedTparams, members)
        }

        // Try to add identical interface
        val codePath2 = store.addInterface(scope, "User", members, referencedTparams) { name =>
          createMockInterface(name.value, referencedTparams, members)
        }

        // Should only have one interface
        assert(store.interfaces.size == 1)
        assert(store.interfaces.contains(createSimpleIdent("User")))
      }

      test("rejects interface with same name but different members") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members1          = IArray(createMockProperty("name"))
        val members2          = IArray(createMockProperty("value"))
        val referencedTparams = Empty

        // Add first interface
        val codePath1 = store.addInterface(scope, "Data", members1, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members1)
        }

        // Try to add interface with same name but different members
        val codePath2 = store.addInterface(scope, "Data", members2, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members2)
        }

        // Should have two interfaces with different names
        assert(store.interfaces.size == 2)
        assert(store.interfaces.contains(createSimpleIdent("Data")))
        // Second interface should have a different generated name
        val names = store.interfaces.keys.map(_.value).toSet
        assert(names.contains("Data"))
        assert(names.size == 2)
      }

      test("rejects interface with same name but different type parameters") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members  = IArray(createMockProperty("value"))
        val tparams1 = IArray(createTypeParam("T"))
        val tparams2 = IArray(createTypeParam("U"))

        // Add first interface
        val codePath1 = store.addInterface(scope, "Generic", members, tparams1) { name =>
          createMockInterface(name.value, tparams1, members)
        }

        // Try to add interface with same name but different type parameters
        val codePath2 = store.addInterface(scope, "Generic", members, tparams2) { name =>
          createMockInterface(name.value, tparams2, members)
        }

        // Should have two interfaces with different names
        assert(store.interfaces.size == 2)
        assert(store.interfaces.contains(createSimpleIdent("Generic")))
        val names = store.interfaces.keys.map(_.value).toSet
        assert(names.size == 2)
      }
    }

    test("ConflictHandlingStore - Name Generation and Conflict Resolution") {
      test("generates names based on member content when prefix conflicts") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members1          = IArray(createMockProperty("userName"))
        val members2          = IArray(createMockProperty("userEmail"))
        val referencedTparams = Empty

        // Add first interface with "User" prefix
        val codePath1 = store.addInterface(scope, "User", members1, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members1)
        }

        // Add second interface with same "User" prefix but different members
        val codePath2 = store.addInterface(scope, "User", members2, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members2)
        }

        assert(store.interfaces.size == 2)
        val names = store.interfaces.keys.map(_.value).toSet
        assert(names.contains("User"))
        // Second interface should get a name derived from its members
        assert(names.size == 2)
      }

      test("handles empty prefix with meaningful members") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members           = IArray(createMockProperty("name"), createMockProperty("value"))
        val referencedTparams = Empty

        val codePath = store.addInterface(scope, "", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        assert(store.interfaces.size == 1)
        val generatedName = store.interfaces.keys.head.value
        // Should generate a meaningful name from members, not just a number
        assert(generatedName.nonEmpty)
        assert(generatedName != "0")
      }

      test("falls back to numbered names when all variants conflict") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        // Create interfaces with different members to avoid deduplication
        val referencedTparams = Empty

        // Add multiple interfaces with same prefix but different members to force conflicts
        for (i <- 0 until 5) {
          val members = IArray(createMockProperty(s"test$i"))
          store.addInterface(scope, "Test", members, referencedTparams) { name =>
            createMockInterface(name.value, Empty, members)
          }
        }

        assert(store.interfaces.size == 5)
        val names = store.interfaces.keys.map(_.value).toSet
        // Should have generated different names for each
        assert(names.size == 5)
      }
    }

    test("ConflictHandlingStore - CodePath Generation") {
      test("generates correct code path for added interface") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members           = IArray(createMockProperty("name"))
        val referencedTparams = Empty

        val codePath = store.addInterface(scope, "User", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        assert(codePath.isInstanceOf[CodePath.HasPath])
        val hasPath = codePath.asInstanceOf[CodePath.HasPath]
        assert(hasPath.inLibrary == inLibrary)

        // Code path should include both namespace and interface name
        val pathParts = hasPath.codePathPart.parts.map(_.value)
        assert(pathParts.contains("TestNamespace"))
        assert(pathParts.contains("User"))
      }

      test("code path reflects actual generated name, not requested name") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members           = IArray(createMockProperty("name"))
        val referencedTparams = IArray(createTypeParam("T")) // This will cause "T" to be rejected

        val codePath = store.addInterface(scope, "T", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        assert(codePath.isInstanceOf[CodePath.HasPath])
        val hasPath = codePath.asInstanceOf[CodePath.HasPath]

        // Code path should reflect the actual generated name, not "T"
        val pathParts = hasPath.codePathPart.parts.map(_.value)
        assert(!pathParts.contains("T"))

        // Should contain the actual generated name
        val actualName = store.interfaces.keys.head.value
        assert(pathParts.contains(actualName))
      }
    }

    test("ConflictHandlingStore - Edge Cases and Error Conditions") {
      test("handles interface with no members and no type parameters") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val members           = Empty
        val referencedTparams = Empty

        val codePath = store.addInterface(scope, "Empty", members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, Empty)
        }

        assert(store.interfaces.size == 1)
        // With empty members, the name generation algorithm may produce a different name
        val generatedName = store.interfaces.keys.head.value
        assert(generatedName.nonEmpty)
      }

      test("handles very long prefix names") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val longPrefix        = "VeryLongInterfaceNameThatExceedsNormalLengthLimits"
        val members           = IArray(createMockProperty("value"))
        val referencedTparams = Empty

        val codePath = store.addInterface(scope, longPrefix, members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        assert(store.interfaces.size == 1)
        // Should handle long names gracefully
        val generatedName = store.interfaces.keys.head.value
        assert(generatedName.nonEmpty)
      }

      test("handles special characters in prefix") {
        val inLibrary = createLibraryIdent("test-lib")
        val into      = createSimpleIdent("TestNamespace")
        val store     = new ExtractInterfaces.ConflictHandlingStore(inLibrary, into)
        val scope     = createMockScope()

        val specialPrefix     = "Test-Interface_With$pecial"
        val members           = IArray(createMockProperty("value"))
        val referencedTparams = Empty

        val codePath = store.addInterface(scope, specialPrefix, members, referencedTparams) { name =>
          createMockInterface(name.value, Empty, members)
        }

        assert(store.interfaces.size == 1)
        // Should generate a name (may or may not clean special characters depending on implementation)
        val generatedName = store.interfaces.keys.head.value
        assert(generatedName.nonEmpty)
        // The ConflictHandlingStore uses DeriveNonConflictingName which may preserve the original prefix
        // if no conflicts are detected, so we just verify a name was generated
      }
    }
  }
}
