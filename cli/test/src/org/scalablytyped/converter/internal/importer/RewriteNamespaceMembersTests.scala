package org.scalablytyped.converter.internal.importer

import org.scalablytyped.converter.internal.{IArray, NoComments}
import org.scalablytyped.converter.internal.scalajs.*
import utest.*

object RewriteNamespaceMembersTests extends TestSuite {

  // Helper methods for creating test data
  def createMockQualifiedName(name: String): QualifiedName = QualifiedName(IArray(Name(name)))

  def createMockFieldTree(
      name: Name = Name("testField"),
      tpe: TypeRef = TypeRef.String,
      isOverride: Boolean = false
  ): FieldTree = {
    FieldTree(
      annotations = IArray.Empty,
      level = ProtectionLevel.Public,
      name = name,
      tpe = tpe,
      impl = NotImplemented,
      isReadOnly = false,
      isOverride = isOverride,
      comments = NoComments,
      codePath = createMockQualifiedName(name.unescaped)
    )
  }

  def createMockMethodTree(
      name: Name = Name("testMethod"),
      resultType: TypeRef = TypeRef.Unit,
      isOverride: Boolean = false
  ): MethodTree = {
    MethodTree(
      annotations = IArray.Empty,
      level = ProtectionLevel.Public,
      name = name,
      tparams = IArray.Empty,
      params = IArray.Empty,
      impl = NotImplemented,
      resultType = resultType,
      isOverride = isOverride,
      comments = NoComments,
      codePath = createMockQualifiedName(name.unescaped),
      isImplicit = false
    )
  }

  def createMockModuleTree(
      name: Name = Name("testModule"),
      members: IArray[Tree] = IArray.Empty,
      parents: IArray[TypeRef] = IArray.Empty
  ): ModuleTree = {
    ModuleTree(
      annotations = IArray.Empty,
      level = ProtectionLevel.Public,
      name = name,
      parents = parents,
      members = members,
      comments = NoComments,
      codePath = createMockQualifiedName(name.unescaped),
      isOverride = false
    )
  }

  def createMockPackageTree(
      name: Name = Name("testPackage"),
      members: IArray[Tree] = IArray.Empty
  ): PackageTree = {
    PackageTree(
      annotations = IArray.Empty,
      name = name,
      members = members,
      comments = NoComments,
      codePath = createMockQualifiedName(name.unescaped)
    )
  }

  def tests = Tests {
    test("RewriteNamespaceMembers - Basic Functionality") {
      test("should handle empty tree array") {
        val original = IArray.Empty
        val result   = RewriteNamespaceMembers(original)

        // Should return empty arrays and no comments
        assert(result._1.isEmpty)       // inheritance
        assert(result._2.isEmpty)       // newMemberTrees
        assert(result._3.isEmpty)       // remaining
        assert(result._4 == NoComments) // comments
      }

      test("should handle trees with no namespaced members") {
        val regularField  = createMockFieldTree(Name("regularField"))
        val regularMethod = createMockMethodTree(Name("regularMethod"))
        val original      = IArray(regularField, regularMethod)
        val result        = RewriteNamespaceMembers(original)

        // Should have no inheritance, regular members should be preserved
        assert(result._1.isEmpty)       // inheritance
        assert(result._2.length == 2)   // newMemberTrees should contain both regular members
        assert(result._3.isEmpty)       // remaining should be empty
        assert(result._4 == NoComments) // comments
      }

      test("should handle namespaced field") {
        val namespacedField = createMockFieldTree(Name.namespaced, TypeRef.String)
        val original        = IArray(namespacedField)
        val result          = RewriteNamespaceMembers(original)

        // Should create inheritance from field type
        assert(result._1.length == 1)   // inheritance should contain TypeRef.Intersection
        assert(result._2.isEmpty)       // newMemberTrees should be empty (no regular members)
        assert(result._3.isEmpty)       // remaining should be empty
        assert(result._4 == NoComments) // comments
      }

      test("should handle namespaced method") {
        val namespacedMethod = createMockMethodTree(Name.namespaced, TypeRef.Unit)
        val original         = IArray(namespacedMethod)
        val result           = RewriteNamespaceMembers(original)

        // Should rewrite namespaced method to Name.APPLY
        assert(result._1.isEmpty)       // inheritance should be empty (no fields or containers)
        assert(result._2.length == 1)   // newMemberTrees should contain rewritten method
        assert(result._3.isEmpty)       // remaining should be empty
        assert(result._4 == NoComments) // comments

        // Verify the method was renamed to APPLY
        val rewrittenMethod = result._2.head.asInstanceOf[MethodTree]
        assert(rewrittenMethod.name == Name.APPLY)
      }
    }

    test("RewriteNamespaceMembers - Edge Cases") {
      test("should handle mixed namespaced and regular members") {
        val namespacedField  = createMockFieldTree(Name.namespaced, TypeRef.String)
        val namespacedMethod = createMockMethodTree(Name.namespaced, TypeRef.Unit)
        val regularField     = createMockFieldTree(Name("regularField"))
        val original         = IArray(namespacedField, namespacedMethod, regularField)
        val result           = RewriteNamespaceMembers(original)

        // Should have inheritance from field, rewritten method, and regular field
        assert(result._1.length == 1)   // inheritance from namespaced field
        assert(result._2.length == 2)   // rewritten method + regular field
        assert(result._3.isEmpty)       // remaining should be empty
        assert(result._4 == NoComments) // comments
      }

      test("should handle namespaced module container") {
        val innerMember      = createMockFieldTree(Name("innerField"))
        val namespacedModule = createMockModuleTree(Name.namespaced, IArray(innerMember))
        val original         = IArray(namespacedModule)
        val result           = RewriteNamespaceMembers(original)

        // Should extract members from namespaced container
        assert(result._1.isEmpty)       // no inheritance from ModuleTree (empty parents)
        assert(result._2.length == 1)   // should contain inner member
        assert(result._3.isEmpty)       // remaining should be empty
        assert(result._4 == NoComments) // comments
      }

      test("should handle namespaced package container") {
        val innerMember       = createMockFieldTree(Name("innerField"))
        val namespacedPackage = createMockPackageTree(Name.namespaced, IArray(innerMember))
        val original          = IArray(namespacedPackage)
        val result            = RewriteNamespaceMembers(original)

        // PackageTree should not contribute to inheritance (returns Empty in pattern match)
        assert(result._1.isEmpty)       // no inheritance from PackageTree
        assert(result._2.length == 1)   // should contain inner member
        assert(result._3.isEmpty)       // remaining should be empty
        assert(result._4 == NoComments) // comments
      }

      test("should handle module with inheritance") {
        val parentType       = TypeRef.String
        val innerMember      = createMockFieldTree(Name("innerField"))
        val namespacedModule = createMockModuleTree(Name.namespaced, IArray(innerMember), IArray(parentType))
        val original         = IArray(namespacedModule)
        val result           = RewriteNamespaceMembers(original)

        // Should have inheritance from module parents
        assert(result._1.length == 1)   // inheritance from module parents
        assert(result._2.length == 1)   // should contain inner member
        assert(result._3.isEmpty)       // remaining should be empty
        assert(result._4 == NoComments) // comments
      }
    }

    test("RewriteNamespaceMembers - Negative Cases") {
      test("should handle non-member trees") {
        val typeAlias = TypeAliasTree(
          name = Name("TestAlias"),
          level = ProtectionLevel.Public,
          tparams = IArray.Empty,
          alias = TypeRef.String,
          comments = NoComments,
          codePath = createMockQualifiedName("TestAlias")
        )
        val original = IArray(typeAlias)
        val result   = RewriteNamespaceMembers(original)

        // Non-member trees should go to remaining
        assert(result._1.isEmpty)       // no inheritance
        assert(result._2.isEmpty)       // no member trees
        assert(result._3.length == 1)   // remaining should contain the type alias
        assert(result._4 == NoComments) // comments
      }

      test("should handle empty namespaced field type") {
        val namespacedField = createMockFieldTree(Name.namespaced, TypeRef.Unit)
        val original        = IArray(namespacedField)
        val result          = RewriteNamespaceMembers(original)

        // Should still create inheritance even with Unit type
        assert(result._1.length == 1)   // inheritance from field type
        assert(result._2.isEmpty)       // no member trees
        assert(result._3.isEmpty)       // remaining should be empty
        assert(result._4 == NoComments) // comments
      }

      test("should handle multiple namespaced fields") {
        val field1   = createMockFieldTree(Name.namespaced, TypeRef.String)
        val field2   = createMockFieldTree(Name.namespaced, TypeRef.Unit)
        val original = IArray(field1, field2)
        val result   = RewriteNamespaceMembers(original)

        // Should create single intersection type from both field types
        assert(result._1.length == 1)   // single intersection type containing both field types
        assert(result._2.isEmpty)       // no member trees
        assert(result._3.isEmpty)       // remaining should be empty
        assert(result._4 == NoComments) // comments

        // Verify it's an intersection type
        val inheritanceType = result._1.head
        assert(inheritanceType.typeName.parts.last == Name("<intersection>"))
      }
    }

    test("RewriteNamespaceMembers - Container Handling") {
      test("should handle complex nested containers") {
        val innerField       = createMockFieldTree(Name("innerField"))
        val innerMethod      = createMockMethodTree(Name("innerMethod"), TypeRef.Unit)
        val nestedModule     = createMockModuleTree(Name("nestedModule"), IArray(innerField, innerMethod))
        val namespacedModule = createMockModuleTree(Name.namespaced, IArray(nestedModule))
        val original         = IArray(namespacedModule)
        val result           = RewriteNamespaceMembers(original)

        // Should extract members from namespaced container, non-member trees go to remaining
        assert(result._1.isEmpty)       // no inheritance from ModuleTree (empty parents)
        assert(result._2.isEmpty)       // no member trees extracted (nestedModule is not a MemberTree)
        assert(result._3.length == 1)   // remaining should contain the nested module
        assert(result._4 == NoComments) // comments
      }

      test("should handle array of mixed containers") {
        val field             = createMockFieldTree(Name("regularField"))
        val namespacedModule  = createMockModuleTree(Name.namespaced, IArray(field))
        val namespacedPackage = createMockPackageTree(Name.namespaced, IArray(field))
        val original          = IArray(namespacedModule, namespacedPackage)
        val result            = RewriteNamespaceMembers(original)

        // Should extract members from both containers
        assert(result._1.isEmpty)       // no inheritance from containers
        assert(result._2.length == 2)   // should contain both extracted fields
        assert(result._3.isEmpty)       // remaining should be empty
        assert(result._4 == NoComments) // comments
      }
    }
  }
}
