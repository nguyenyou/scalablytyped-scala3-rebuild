package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object RejiggerIntersectionsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMockScope(): TsTreeScope = {
    val parsedFile = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = Empty,
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

  def tests = Tests {
    test("RejiggerIntersections - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(RejiggerIntersections.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsType method") {
        val scope = createMockScope()
        val typeRef = createTypeRef("string")
        val result = RejiggerIntersections.enterTsType(scope)(typeRef)
        assert(result != null)
        assert(result.isInstanceOf[TsType])
      }

      test("leaves non-intersection types unchanged") {
        val scope = createMockScope()
        val typeRef = createTypeRef("string")
        val unionType = TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number")))
        
        val result1 = RejiggerIntersections.enterTsType(scope)(typeRef)
        val result2 = RejiggerIntersections.enterTsType(scope)(unionType)
        
        assert(result1 == typeRef)
        assert(result2 == unionType)
      }
    }

    test("RejiggerIntersections - Intersection Type Processing") {
      test("leaves intersection without union types unchanged") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val typeB = createTypeRef("B")
        val typeC = createTypeRef("C")
        val intersection = TsTypeIntersect(IArray(typeA, typeB, typeC))
        
        val result = RejiggerIntersections.enterTsType(scope)(intersection)
        
        assert(result == intersection)
      }

      test("transforms intersection with exactly one union type") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val typeB = createTypeRef("B")
        val typeC = createTypeRef("C")
        val typeD = createTypeRef("D")
        
        // Create union type (B | C)
        val unionType = TsTypeUnion(IArray(typeB, typeC))
        
        // Create intersection A & (B | C) & D
        val intersection = TsTypeIntersect(IArray(typeA, unionType, typeD))
        
        val result = RejiggerIntersections.enterTsType(scope)(intersection)
        
        // Should transform to (A & B & D) | (A & C & D)
        assert(result.isInstanceOf[TsTypeUnion])
        val resultUnion = result.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.length == 2)
        
        // Check that both union branches are intersections
        assert(resultUnion.types.forall(_.isInstanceOf[TsTypeIntersect]))
        
        val branch1 = resultUnion.types(0).asInstanceOf[TsTypeIntersect]
        val branch2 = resultUnion.types(1).asInstanceOf[TsTypeIntersect]
        
        // Each branch should have 3 types (A, one from union, D)
        assert(branch1.types.length == 3)
        assert(branch2.types.length == 3)
        
        // Both branches should contain A and D
        assert(branch1.types.contains(typeA))
        assert(branch1.types.contains(typeD))
        assert(branch2.types.contains(typeA))
        assert(branch2.types.contains(typeD))
        
        // One branch should contain B, the other C
        assert(branch1.types.contains(typeB) || branch1.types.contains(typeC))
        assert(branch2.types.contains(typeB) || branch2.types.contains(typeC))
        assert(branch1.types.contains(typeB) != branch2.types.contains(typeB))
      }

      test("leaves intersection with multiple union types unchanged") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val typeB = createTypeRef("B")
        val typeC = createTypeRef("C")
        val typeD = createTypeRef("D")
        val typeE = createTypeRef("E")
        
        // Create two union types
        val union1 = TsTypeUnion(IArray(typeB, typeC))
        val union2 = TsTypeUnion(IArray(typeD, typeE))
        
        // Create intersection A & (B | C) & (D | E)
        val intersection = TsTypeIntersect(IArray(typeA, union1, union2))
        
        val result = RejiggerIntersections.enterTsType(scope)(intersection)
        
        // Should remain unchanged to avoid code explosion
        assert(result == intersection)
      }

      test("handles intersection with union at different positions") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val typeB = createTypeRef("B")
        val typeC = createTypeRef("C")
        val typeD = createTypeRef("D")
        
        // Create union type (B | C)
        val unionType = TsTypeUnion(IArray(typeB, typeC))
        
        // Test union at the beginning: (B | C) & A & D
        val intersection1 = TsTypeIntersect(IArray(unionType, typeA, typeD))
        val result1 = RejiggerIntersections.enterTsType(scope)(intersection1)
        
        assert(result1.isInstanceOf[TsTypeUnion])
        val resultUnion1 = result1.asInstanceOf[TsTypeUnion]
        assert(resultUnion1.types.length == 2)
        
        // Test union at the end: A & D & (B | C)
        val intersection2 = TsTypeIntersect(IArray(typeA, typeD, unionType))
        val result2 = RejiggerIntersections.enterTsType(scope)(intersection2)
        
        assert(result2.isInstanceOf[TsTypeUnion])
        val resultUnion2 = result2.asInstanceOf[TsTypeUnion]
        assert(resultUnion2.types.length == 2)
      }

      test("handles intersection with only union type") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val typeB = createTypeRef("B")
        
        // Create union type (A | B)
        val unionType = TsTypeUnion(IArray(typeA, typeB))
        
        // Create intersection with only the union: (A | B)
        val intersection = TsTypeIntersect(IArray(unionType))
        
        val result = RejiggerIntersections.enterTsType(scope)(intersection)
        
        // Should transform to A | B (each type intersected with empty rest)
        assert(result.isInstanceOf[TsTypeUnion])
        val resultUnion = result.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.length == 2)
        
        // Each branch should be an intersection with just one type
        assert(resultUnion.types.forall(_.isInstanceOf[TsTypeIntersect]))
        val branch1 = resultUnion.types(0).asInstanceOf[TsTypeIntersect]
        val branch2 = resultUnion.types(1).asInstanceOf[TsTypeIntersect]
        
        assert(branch1.types.length == 1)
        assert(branch2.types.length == 1)
        assert(branch1.types.contains(typeA) || branch1.types.contains(typeB))
        assert(branch2.types.contains(typeA) || branch2.types.contains(typeB))
        assert(branch1.types.head != branch2.types.head)
      }

      test("handles complex union types within intersection") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val typeB = createTypeRef("B")
        val typeC = createTypeRef("C")
        val typeD = createTypeRef("D")
        val typeE = createTypeRef("E")
        
        // Create complex union type (B | C | D)
        val unionType = TsTypeUnion(IArray(typeB, typeC, typeD))
        
        // Create intersection A & (B | C | D) & E
        val intersection = TsTypeIntersect(IArray(typeA, unionType, typeE))
        
        val result = RejiggerIntersections.enterTsType(scope)(intersection)
        
        // Should transform to (A & B & E) | (A & C & E) | (A & D & E)
        assert(result.isInstanceOf[TsTypeUnion])
        val resultUnion = result.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.length == 3)
        
        // All branches should be intersections
        assert(resultUnion.types.forall(_.isInstanceOf[TsTypeIntersect]))
        
        // Each branch should contain A and E
        resultUnion.types.foreach { branch =>
          val intersect = branch.asInstanceOf[TsTypeIntersect]
          assert(intersect.types.contains(typeA))
          assert(intersect.types.contains(typeE))
          assert(intersect.types.length == 3)
        }
        
        // Each branch should contain exactly one of B, C, or D
        val unionMembers = resultUnion.types.map(_.asInstanceOf[TsTypeIntersect].types)
        assert(unionMembers.exists(_.contains(typeB)))
        assert(unionMembers.exists(_.contains(typeC)))
        assert(unionMembers.exists(_.contains(typeD)))
      }
    }

    test("RejiggerIntersections - Edge Cases") {
      test("handles empty intersection") {
        val scope = createMockScope()
        val emptyIntersection = TsTypeIntersect(Empty)
        
        val result = RejiggerIntersections.enterTsType(scope)(emptyIntersection)
        
        // Should remain unchanged
        assert(result == emptyIntersection)
      }

      test("handles intersection with single type") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val singleIntersection = TsTypeIntersect(IArray(typeA))
        
        val result = RejiggerIntersections.enterTsType(scope)(singleIntersection)
        
        // Should remain unchanged (no union to distribute)
        assert(result == singleIntersection)
      }

      test("handles nested union types") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val typeB = createTypeRef("B")
        val typeC = createTypeRef("C")
        val typeD = createTypeRef("D")
        
        // Create nested union: (B | (C | D))
        val innerUnion = TsTypeUnion(IArray(typeC, typeD))
        val outerUnion = TsTypeUnion(IArray(typeB, innerUnion))
        
        // Create intersection A & (B | (C | D))
        val intersection = TsTypeIntersect(IArray(typeA, outerUnion))
        
        val result = RejiggerIntersections.enterTsType(scope)(intersection)
        
        // Should still transform (the union flattening happens elsewhere)
        assert(result.isInstanceOf[TsTypeUnion])
        val resultUnion = result.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.length == 2) // B and (C | D)
      }

      test("preserves type order in transformation") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val typeB = createTypeRef("B")
        val typeC = createTypeRef("C")
        val typeD = createTypeRef("D")
        val typeE = createTypeRef("E")
        
        // Create union type (C | D)
        val unionType = TsTypeUnion(IArray(typeC, typeD))
        
        // Create intersection A & B & (C | D) & E
        val intersection = TsTypeIntersect(IArray(typeA, typeB, unionType, typeE))
        
        val result = RejiggerIntersections.enterTsType(scope)(intersection)
        
        assert(result.isInstanceOf[TsTypeUnion])
        val resultUnion = result.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.length == 2)
        
        // Check that the order is preserved: each branch should have C or D in the middle
        resultUnion.types.foreach { branch =>
          val intersect = branch.asInstanceOf[TsTypeIntersect]
          // Should be [C, A, B, E] or [D, A, B, E] (union member first, then rest)
          assert(intersect.types.head == typeC || intersect.types.head == typeD)
          assert(intersect.types.contains(typeA))
          assert(intersect.types.contains(typeB))
          assert(intersect.types.contains(typeE))
        }
      }
    }

    test("RejiggerIntersections - Integration Scenarios") {
      test("works with complex type hierarchies") {
        val scope = createMockScope()
        
        // Create types representing a complex scenario
        val baseType = createTypeRef("BaseInterface")
        val mixinA = createTypeRef("MixinA")
        val mixinB = createTypeRef("MixinB")
        val utilityType = createTypeRef("UtilityType")
        
        // Create union of mixins
        val mixinUnion = TsTypeUnion(IArray(mixinA, mixinB))
        
        // Create intersection: BaseInterface & (MixinA | MixinB) & UtilityType
        val complexIntersection = TsTypeIntersect(IArray(baseType, mixinUnion, utilityType))
        
        val result = RejiggerIntersections.enterTsType(scope)(complexIntersection)
        
        assert(result.isInstanceOf[TsTypeUnion])
        val resultUnion = result.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.length == 2)
        
        // Should create: (BaseInterface & MixinA & UtilityType) | (BaseInterface & MixinB & UtilityType)
        resultUnion.types.foreach { branch =>
          val intersect = branch.asInstanceOf[TsTypeIntersect]
          assert(intersect.types.contains(baseType))
          assert(intersect.types.contains(utilityType))
          assert(intersect.types.contains(mixinA) || intersect.types.contains(mixinB))
        }
      }

      test("handles transformation with type parameters") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val genericType = TsTypeRef(NoComments, createQIdent("Array"), IArray(createTypeRef("string")))
        val typeB = createTypeRef("B")
        val typeC = createTypeRef("C")
        
        // Create union with generic type
        val unionType = TsTypeUnion(IArray(typeB, typeC))
        
        // Create intersection with generic type
        val intersection = TsTypeIntersect(IArray(typeA, genericType, unionType))
        
        val result = RejiggerIntersections.enterTsType(scope)(intersection)
        
        assert(result.isInstanceOf[TsTypeUnion])
        val resultUnion = result.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.length == 2)
        
        // Both branches should contain the generic type
        resultUnion.types.foreach { branch =>
          val intersect = branch.asInstanceOf[TsTypeIntersect]
          assert(intersect.types.contains(genericType))
        }
      }

      test("demonstrates code explosion prevention") {
        val scope = createMockScope()
        val typeA = createTypeRef("A")
        val typeB = createTypeRef("B")
        val typeC = createTypeRef("C")
        val typeD = createTypeRef("D")
        val typeE = createTypeRef("E")
        
        // Create multiple union types that would cause explosion
        val union1 = TsTypeUnion(IArray(typeB, typeC))
        val union2 = TsTypeUnion(IArray(typeD, typeE))
        
        // Create intersection that would explode: A & (B | C) & (D | E)
        // This would create 4 combinations: A&B&D, A&B&E, A&C&D, A&C&E
        val intersection = TsTypeIntersect(IArray(typeA, union1, union2))
        
        val result = RejiggerIntersections.enterTsType(scope)(intersection)
        
        // Should remain unchanged to prevent code explosion
        assert(result == intersection)
        assert(result.isInstanceOf[TsTypeIntersect])
      }
    }
  }
}
