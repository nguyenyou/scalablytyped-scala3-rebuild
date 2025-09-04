package org.scalablytyped.converter.internal
package ts

import org.scalablytyped.converter.internal.ts.TsTreeScope.LoopDetector
import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object LoopDetectorTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createQIdentFromParts(parts: String*): TsQIdent =
    TsQIdent(IArray.fromTraversable(parts.map(TsIdentSimple.apply)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMockScope(): TsTreeScope = {
    val libName = TsIdentLibrarySimple("test-lib")
    val logger = Logger.DevNull
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger)
  }

  def createMockScope2(): TsTreeScope = {
    val libName = TsIdentLibrarySimple("test-lib-2")
    val logger = Logger.DevNull
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger)
  }

  def tests = Tests {
    test("LoopDetector - Construction and Basic Properties") {
      test("initial loop detector has empty stack") {
        val detector = LoopDetector.initial

        assert(detector.stack.isEmpty)
      }

      test("private constructor creates detector with given stack") {
        val scope = createMockScope()
        val idents = IArray(createSimpleIdent("test"))
        val entry = TsTreeScope.Entry.Idents(idents, scope)

        // We can't directly test the private constructor, but we can test the result
        // of including which creates a new detector with the entry in the stack
        val result = LoopDetector.initial.including(idents, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
        assert(newDetector.stack.head == entry)
      }
    }

    test("LoopDetector - including(IArray[TsIdent], TsTreeScope)") {
      test("returns Right with new detector when no loop detected") {
        val detector = LoopDetector.initial
        val scope = createMockScope()
        val idents = IArray(createSimpleIdent("TestType"))

        val result = detector.including(idents, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
        assert(newDetector.stack.head == TsTreeScope.Entry.Idents(idents, scope))
      }

      test("returns Left when loop detected with same idents and scope") {
        val scope = createMockScope()
        val idents = IArray(createSimpleIdent("TestType"))

        val detector1 = LoopDetector.initial.including(idents, scope).right.get
        val result = detector1.including(idents, scope)

        assert(result.isLeft)
      }

      test("allows same idents with different scope") {
        val scope1 = createMockScope()
        val scope2 = createMockScope2()
        val idents = IArray(createSimpleIdent("TestType"))

        val detector1 = LoopDetector.initial.including(idents, scope1).right.get
        val result = detector1.including(idents, scope2)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 2)
      }

      test("allows different idents with same scope") {
        val scope = createMockScope()
        val idents1 = IArray(createSimpleIdent("TestType1"))
        val idents2 = IArray(createSimpleIdent("TestType2"))

        val detector1 = LoopDetector.initial.including(idents1, scope).right.get
        val result = detector1.including(idents2, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 2)
      }

      test("handles empty idents array") {
        val detector = LoopDetector.initial
        val scope = createMockScope()
        val emptyIdents = Empty

        val result = detector.including(emptyIdents, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
        assert(newDetector.stack.head == TsTreeScope.Entry.Idents(emptyIdents, scope))
      }

      test("handles multiple idents in array") {
        val detector = LoopDetector.initial
        val scope = createMockScope()
        val idents = IArray(
          createSimpleIdent("Module"),
          createSimpleIdent("SubModule"),
          createSimpleIdent("Type")
        )

        val result = detector.including(idents, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
        assert(newDetector.stack.head == TsTreeScope.Entry.Idents(idents, scope))
      }
    }

    test("LoopDetector - including(TsTypeRef, TsTreeScope)") {
      test("returns Right with new detector when no loop detected") {
        val detector = LoopDetector.initial
        val scope = createMockScope()
        val typeRef = createTypeRef("TestType")

        val result = detector.including(typeRef, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
        assert(newDetector.stack.head == TsTreeScope.Entry.Ref(typeRef, scope))
      }

      test("returns Left when loop detected with same typeRef and scope") {
        val scope = createMockScope()
        val typeRef = createTypeRef("TestType")

        val detector1 = LoopDetector.initial.including(typeRef, scope).right.get
        val result = detector1.including(typeRef, scope)

        assert(result.isLeft)
      }

      test("allows same typeRef with different scope") {
        val scope1 = createMockScope()
        val scope2 = createMockScope2()
        val typeRef = createTypeRef("TestType")

        val detector1 = LoopDetector.initial.including(typeRef, scope1).right.get
        val result = detector1.including(typeRef, scope2)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 2)
      }

      test("allows different typeRef with same scope") {
        val scope = createMockScope()
        val typeRef1 = createTypeRef("TestType1")
        val typeRef2 = createTypeRef("TestType2")

        val detector1 = LoopDetector.initial.including(typeRef1, scope).right.get
        val result = detector1.including(typeRef2, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 2)
      }

      test("handles typeRef with type parameters") {
        val detector = LoopDetector.initial
        val scope = createMockScope()
        val stringType = createTypeRef("string")
        val typeRef = createTypeRef("Array", IArray(stringType))

        val result = detector.including(typeRef, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
        assert(newDetector.stack.head == TsTreeScope.Entry.Ref(typeRef, scope))
      }

      test("detects loop with complex typeRef") {
        val scope = createMockScope()
        val numberType = createTypeRef("number")
        val typeRef = createTypeRef("Promise", IArray(numberType))

        val detector1 = LoopDetector.initial.including(typeRef, scope).right.get
        val result = detector1.including(typeRef, scope)

        assert(result.isLeft)
      }
    }

    test("LoopDetector - Mixed Entry Types") {
      test("allows mixing idents and typeRef entries") {
        val scope = createMockScope()
        val idents = IArray(createSimpleIdent("Module"))
        val typeRef = createTypeRef("TestType")

        val detector1 = LoopDetector.initial.including(idents, scope).right.get
        val result = detector1.including(typeRef, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 2)
        assert(newDetector.stack.head == TsTreeScope.Entry.Ref(typeRef, scope))
        assert(newDetector.stack.tail.head == TsTreeScope.Entry.Idents(idents, scope))
      }

      test("detects loop between different entry types with same content") {
        val scope = createMockScope()
        val idents = IArray(createSimpleIdent("TestType"))
        val typeRef = createTypeRef("TestType")

        // These should be considered different entries even though they reference the same name
        val detector1 = LoopDetector.initial.including(idents, scope).right.get
        val result = detector1.including(typeRef, scope)

        assert(result.isRight) // Different entry types, so no loop
        val newDetector = result.right.get
        assert(newDetector.stack.length == 2)
      }

      test("maintains proper stack order with mixed entries") {
        val scope = createMockScope()
        val idents1 = IArray(createSimpleIdent("Module1"))
        val typeRef1 = createTypeRef("Type1")
        val idents2 = IArray(createSimpleIdent("Module2"))
        val typeRef2 = createTypeRef("Type2")

        val detector1 = LoopDetector.initial.including(idents1, scope).right.get
        val detector2 = detector1.including(typeRef1, scope).right.get
        val detector3 = detector2.including(idents2, scope).right.get
        val result = detector3.including(typeRef2, scope)

        assert(result.isRight)
        val finalDetector = result.right.get
        assert(finalDetector.stack.length == 4)

        // Stack should be in reverse order (most recent first)
        assert(finalDetector.stack(0) == TsTreeScope.Entry.Ref(typeRef2, scope))
        assert(finalDetector.stack(1) == TsTreeScope.Entry.Idents(idents2, scope))
        assert(finalDetector.stack(2) == TsTreeScope.Entry.Ref(typeRef1, scope))
        assert(finalDetector.stack(3) == TsTreeScope.Entry.Idents(idents1, scope))
      }
    }

    test("LoopDetector - Stack Management") {
      test("stack grows with each inclusion") {
        val scope = createMockScope()
        val idents1 = IArray(createSimpleIdent("Type1"))
        val idents2 = IArray(createSimpleIdent("Type2"))
        val idents3 = IArray(createSimpleIdent("Type3"))

        val detector1 = LoopDetector.initial.including(idents1, scope).right.get
        val detector2 = detector1.including(idents2, scope).right.get
        val detector3 = detector2.including(idents3, scope).right.get

        assert(LoopDetector.initial.stack.length == 0)
        assert(detector1.stack.length == 1)
        assert(detector2.stack.length == 2)
        assert(detector3.stack.length == 3)
      }

      test("stack maintains immutability") {
        val scope = createMockScope()
        val idents = IArray(createSimpleIdent("TestType"))

        val originalDetector = LoopDetector.initial
        val newDetector = originalDetector.including(idents, scope).right.get

        assert(originalDetector.stack.length == 0)
        assert(newDetector.stack.length == 1)
        // Original detector should be unchanged
        assert(originalDetector.stack.isEmpty)
      }

      test("stack contains entries in reverse chronological order") {
        val scope = createMockScope()
        val idents1 = IArray(createSimpleIdent("First"))
        val idents2 = IArray(createSimpleIdent("Second"))
        val idents3 = IArray(createSimpleIdent("Third"))

        val detector = LoopDetector.initial
          .including(idents1, scope).right.get
          .including(idents2, scope).right.get
          .including(idents3, scope).right.get

        // Most recent should be first
        assert(detector.stack(0) == TsTreeScope.Entry.Idents(idents3, scope))
        assert(detector.stack(1) == TsTreeScope.Entry.Idents(idents2, scope))
        assert(detector.stack(2) == TsTreeScope.Entry.Idents(idents1, scope))
      }
    }

    test("LoopDetector - Entry Equality and Comparison") {
      test("Entry.Idents equality") {
        val scope1 = createMockScope()
        val scope2 = createMockScope2()
        val idents1 = IArray(createSimpleIdent("TestType"))
        val idents2 = IArray(createSimpleIdent("TestType"))
        val idents3 = IArray(createSimpleIdent("DifferentType"))

        val entry1 = TsTreeScope.Entry.Idents(idents1, scope1)
        val entry2 = TsTreeScope.Entry.Idents(idents2, scope1) // Same idents, same scope
        val entry3 = TsTreeScope.Entry.Idents(idents1, scope2) // Same idents, different scope
        val entry4 = TsTreeScope.Entry.Idents(idents3, scope1) // Different idents, same scope

        assert(entry1 == entry2) // Same idents and scope
        assert(entry1 != entry3) // Different scope
        assert(entry1 != entry4) // Different idents
      }

      test("Entry.Ref equality") {
        val scope1 = createMockScope()
        val scope2 = createMockScope2()
        val typeRef1 = createTypeRef("TestType")
        val typeRef2 = createTypeRef("TestType")
        val typeRef3 = createTypeRef("DifferentType")

        val entry1 = TsTreeScope.Entry.Ref(typeRef1, scope1)
        val entry2 = TsTreeScope.Entry.Ref(typeRef2, scope1) // Same typeRef, same scope
        val entry3 = TsTreeScope.Entry.Ref(typeRef1, scope2) // Same typeRef, different scope
        val entry4 = TsTreeScope.Entry.Ref(typeRef3, scope1) // Different typeRef, same scope

        assert(entry1 == entry2) // Same typeRef and scope
        assert(entry1 != entry3) // Different scope
        assert(entry1 != entry4) // Different typeRef
      }

      test("Entry.Idents vs Entry.Ref are never equal") {
        val scope = createMockScope()
        val idents = IArray(createSimpleIdent("TestType"))
        val typeRef = createTypeRef("TestType")

        val identsEntry = TsTreeScope.Entry.Idents(idents, scope)
        val refEntry = TsTreeScope.Entry.Ref(typeRef, scope)

        assert(identsEntry != refEntry)
      }
    }

    test("LoopDetector - Complex Loop Detection Scenarios") {
      test("detects deep circular reference") {
        val scope = createMockScope()
        val typeA = createTypeRef("TypeA")
        val typeB = createTypeRef("TypeB")
        val typeC = createTypeRef("TypeC")

        // Create a chain: A -> B -> C -> A (circular)
        val detector1 = LoopDetector.initial.including(typeA, scope).right.get
        val detector2 = detector1.including(typeB, scope).right.get
        val detector3 = detector2.including(typeC, scope).right.get
        val result = detector3.including(typeA, scope) // This should detect the loop

        assert(result.isLeft) // Loop detected
      }

      test("allows complex non-circular chains") {
        val scope = createMockScope()
        val types = (1 to 10).map(i => createTypeRef(s"Type$i"))

        var detector = LoopDetector.initial
        for (tpe <- types) {
          val result = detector.including(tpe, scope)
          assert(result.isRight)
          detector = result.right.get
        }

        assert(detector.stack.length == 10)
      }

      test("detects loop with mixed entry types") {
        val scope = createMockScope()
        val idents = IArray(createSimpleIdent("TestType"))
        val typeRef = createTypeRef("TestType")

        // Even though they reference the same name, they are different entry types
        // so no loop should be detected
        val detector1 = LoopDetector.initial.including(idents, scope).right.get
        val result = detector1.including(typeRef, scope)

        assert(result.isRight) // No loop because different entry types
      }
    }

    test("LoopDetector - Edge Cases and Boundary Conditions") {
      test("handles empty qualified identifiers") {
        val detector = LoopDetector.initial
        val scope = createMockScope()
        val emptyQIdent = TsQIdent(Empty)
        val typeRef = TsTypeRef(NoComments, emptyQIdent, Empty)

        val result = detector.including(typeRef, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
      }

      test("handles very long identifier chains") {
        val detector = LoopDetector.initial
        val scope = createMockScope()
        val longIdents = IArray.fromTraversable((1 to 100).map(i => createSimpleIdent(s"Part$i")))

        val result = detector.including(longIdents, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
        assert(newDetector.stack.head == TsTreeScope.Entry.Idents(longIdents, scope))
      }

      test("handles special characters in identifiers") {
        val detector = LoopDetector.initial
        val scope = createMockScope()
        val specialIdents = IArray(
          createSimpleIdent("$special"),
          createSimpleIdent("_underscore"),
          createSimpleIdent("123numeric"),
          createSimpleIdent("with-dash"),
          createSimpleIdent("with.dot")
        )

        val result = detector.including(specialIdents, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
      }

      test("handles unicode characters in identifiers") {
        val detector = LoopDetector.initial
        val scope = createMockScope()
        val unicodeIdents = IArray(
          createSimpleIdent("测试"),
          createSimpleIdent("тест"),
          createSimpleIdent("🚀"),
          createSimpleIdent("café")
        )

        val result = detector.including(unicodeIdents, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
      }

      test("handles complex type parameters") {
        val detector = LoopDetector.initial
        val scope = createMockScope()

        // Create nested type parameters: Map<string, Array<number>>
        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")
        val arrayType = createTypeRef("Array", IArray(numberType))
        val mapType = createTypeRef("Map", IArray(stringType, arrayType))

        val result = detector.including(mapType, scope)

        assert(result.isRight)
        val newDetector = result.right.get
        assert(newDetector.stack.length == 1)
        assert(newDetector.stack.head == TsTreeScope.Entry.Ref(mapType, scope))
      }

      test("handles same content with different scopes in sequence") {
        val scope1 = createMockScope()
        val scope2 = createMockScope2()
        val idents = IArray(createSimpleIdent("SharedType"))

        val detector1 = LoopDetector.initial.including(idents, scope1).right.get
        val detector2 = detector1.including(idents, scope2).right.get
        val result = detector2.including(idents, scope1) // Back to first scope - should detect loop

        assert(result.isLeft) // Loop detected
      }
    }

    test("LoopDetector - Performance and Stress Tests") {
      test("handles large stack without performance degradation") {
        val scope = createMockScope()
        var detector = LoopDetector.initial

        // Build a large stack
        for (i <- 1 to 1000) {
          val idents = IArray(createSimpleIdent(s"Type$i"))
          val result = detector.including(idents, scope)
          assert(result.isRight)
          detector = result.right.get
        }

        assert(detector.stack.length == 1000)

        // Test loop detection still works efficiently
        val duplicateIdents = IArray(createSimpleIdent("Type500"))
        val loopResult = detector.including(duplicateIdents, scope)
        assert(loopResult.isLeft) // Should detect loop
      }

      test("memory efficiency with repeated operations") {
        val scope = createMockScope()
        val idents = IArray(createSimpleIdent("TestType"))

        // Perform many operations to test memory usage
        for (_ <- 1 to 100) {
          val detector = LoopDetector.initial.including(idents, scope).right.get
          assert(detector.stack.length == 1)

          // Test loop detection
          val loopResult = detector.including(idents, scope)
          assert(loopResult.isLeft)
        }
      }
    }

    test("LoopDetector - Integration with Real TypeScript Patterns") {
      test("handles common TypeScript recursive patterns") {
        val scope = createMockScope()

        // Simulate: interface Node { children: Node[] }
        val nodeType = createTypeRef("Node")
        val arrayNodeType = createTypeRef("Array", IArray(nodeType))

        val detector1 = LoopDetector.initial.including(nodeType, scope).right.get
        val result = detector1.including(arrayNodeType, scope)

        assert(result.isRight) // Different types, no direct loop

        // But if we try to include Node again, it should detect the loop
        val loopResult = result.right.get.including(nodeType, scope)
        assert(loopResult.isLeft) // Loop detected
      }

      test("handles generic type constraints") {
        val scope = createMockScope()

        // Simulate: interface Container<T extends Container<T>>
        val tParam = createTypeRef("T")
        val containerT = createTypeRef("Container", IArray(tParam))

        val detector1 = LoopDetector.initial.including(containerT, scope).right.get
        val result = detector1.including(containerT, scope) // Same type again

        assert(result.isLeft) // Loop detected
      }

      test("handles module and namespace patterns") {
        val scope = createMockScope()

        // Simulate nested module access: A.B.C.Type
        val moduleIdents = IArray(
          createSimpleIdent("A"),
          createSimpleIdent("B"),
          createSimpleIdent("C"),
          createSimpleIdent("Type")
        )

        val detector1 = LoopDetector.initial.including(moduleIdents, scope).right.get

        // Different module path should be allowed
        val differentModuleIdents = IArray(
          createSimpleIdent("A"),
          createSimpleIdent("B"),
          createSimpleIdent("D"),
          createSimpleIdent("Type")
        )

        val result = detector1.including(differentModuleIdents, scope)
        assert(result.isRight)

        // But same path should detect loop
        val loopResult = result.right.get.including(moduleIdents, scope)
        assert(loopResult.isLeft)
      }
    }
  }
}