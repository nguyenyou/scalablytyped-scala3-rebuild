package org.scalablytyped.converter.internal.ts.transforms

import org.scalablytyped.converter.internal.*
import org.scalablytyped.converter.internal.ts.*
import utest.*

object TypeRewriterTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createTypeParam(
      name: String,
      upperBound: Option[TsType] = None,
      default: Option[TsType] = None
  ): TsTypeParam =
    TsTypeParam(NoComments, createSimpleIdent(name), upperBound, default)

  def createMockClass(name: String, tparams: IArray[TsTypeParam] = Empty): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      parent = None,
      implements = Empty,
      members = Empty,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockInterface(name: String, tparams: IArray[TsTypeParam] = Empty): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      inheritance = Empty,
      members = Empty,
      codePath = CodePath.NoPath
    )

  def tests = Tests {
    test("TypeRewriter - Basic Functionality") {
      test("basic type replacement") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create types for replacement
        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")
        val replacements = Map[TsType, TsType](stringType -> numberType)

        // Test leaveTsType method
        val result = rewriter.leaveTsType(replacements)(stringType)

        assert(result == numberType)
      }

      test("type replacement with no match returns original") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")
        val booleanType = createTypeRef("boolean")
        val replacements = Map[TsType, TsType](stringType -> numberType)

        // Test with type not in replacement map
        val result = rewriter.leaveTsType(replacements)(booleanType)

        assert(result == booleanType)
      }

      test("empty replacement map returns original types") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        val stringType = createTypeRef("string")
        val emptyReplacements = Map.empty[TsType, TsType]

        val result = rewriter.leaveTsType(emptyReplacements)(stringType)

        assert(result == stringType)
      }

      test("multiple type replacements") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")
        val booleanType = createTypeRef("boolean")
        val anyType = createTypeRef("any")

        val replacements = Map[TsType, TsType](
          stringType -> numberType,
          booleanType -> anyType
        )

        assert(rewriter.leaveTsType(replacements)(stringType) == numberType)
        assert(rewriter.leaveTsType(replacements)(booleanType) == anyType)
        assert(rewriter.leaveTsType(replacements)(numberType) == numberType) // not replaced
      }
    }

    test("TypeRewriter - Type Parameter Shadowing") {
      test("withTree returns same map when tree is base tree") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")
        val replacements = Map[TsType, TsType](stringType -> numberType)

        val result = rewriter.withTree(replacements, baseTree)

        assert(result == replacements)
      }

      test("withTree filters out shadowed type parameters") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create a type parameter T
        val tParam = createTypeParam("T")
        val classWithTParam = createMockClass("GenericClass", IArray(tParam))

        // Create a type reference to T that should be filtered out
        val tTypeRef = createTypeRef("T")
        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")

        val replacements = Map[TsType, TsType](
          tTypeRef -> stringType,    // This should be filtered out due to shadowing
          stringType -> numberType   // This should remain
        )

        val result = rewriter.withTree(replacements, classWithTParam)

        // The T -> string replacement should be filtered out
        assert(!result.contains(tTypeRef))
        // The string -> number replacement should remain
        assert(result.contains(stringType))
        assert(result(stringType) == numberType)
      }

      test("withTree preserves non-shadowed replacements") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create a type parameter U
        val uParam = createTypeParam("U")
        val classWithUParam = createMockClass("GenericClass", IArray(uParam))

        // Create type references - T is not shadowed, U is shadowed
        val tTypeRef = createTypeRef("T")
        val uTypeRef = createTypeRef("U")
        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")

        val replacements = Map[TsType, TsType](
          tTypeRef -> stringType,    // This should remain (T is not a type param of this class)
          uTypeRef -> numberType,    // This should be filtered out (U is a type param)
          stringType -> numberType   // This should remain
        )

        val result = rewriter.withTree(replacements, classWithUParam)

        // T -> string should remain (T is not shadowed)
        assert(result.contains(tTypeRef))
        assert(result(tTypeRef) == stringType)

        // U -> number should be filtered out (U is shadowed)
        assert(!result.contains(uTypeRef))

        // string -> number should remain
        assert(result.contains(stringType))
        assert(result(stringType) == numberType)
      }

      test("withTree handles multiple type parameters") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create multiple type parameters
        val tParam = createTypeParam("T")
        val uParam = createTypeParam("U")
        val vParam = createTypeParam("V")
        val classWithMultipleParams = createMockClass("GenericClass", IArray(tParam, uParam, vParam))

        val tTypeRef = createTypeRef("T")
        val uTypeRef = createTypeRef("U")
        val vTypeRef = createTypeRef("V")
        val wTypeRef = createTypeRef("W") // Not a type parameter
        val stringType = createTypeRef("string")

        val replacements = Map[TsType, TsType](
          tTypeRef -> stringType,  // Should be filtered out
          uTypeRef -> stringType,  // Should be filtered out
          vTypeRef -> stringType,  // Should be filtered out
          wTypeRef -> stringType   // Should remain
        )

        val result = rewriter.withTree(replacements, classWithMultipleParams)

        // All type parameter references should be filtered out
        assert(!result.contains(tTypeRef))
        assert(!result.contains(uTypeRef))
        assert(!result.contains(vTypeRef))

        // Non-type parameter reference should remain
        assert(result.contains(wTypeRef))
        assert(result(wTypeRef) == stringType)
      }

      test("withTree works with interfaces") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create an interface with type parameter
        val tParam = createTypeParam("T")
        val interfaceWithTParam = createMockInterface("GenericInterface", IArray(tParam))

        val tTypeRef = createTypeRef("T")
        val stringType = createTypeRef("string")
        val replacements = Map[TsType, TsType](tTypeRef -> stringType)

        val result = rewriter.withTree(replacements, interfaceWithTParam)

        // T should be filtered out due to shadowing
        assert(!result.contains(tTypeRef))
      }

      test("withTree works with type aliases") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create a type alias with type parameter
        val tParam = createTypeParam("T")
        val stringType = createTypeRef("string")
        val typeAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("GenericAlias"),
          tparams = IArray(tParam),
          alias = stringType,
          codePath = CodePath.NoPath
        )

        val tTypeRef = createTypeRef("T")
        val numberType = createTypeRef("number")
        val replacements = Map[TsType, TsType](tTypeRef -> numberType)

        val result = rewriter.withTree(replacements, typeAlias)

        // T should be filtered out due to shadowing
        assert(!result.contains(tTypeRef))
      }

      test("withTree handles trees without type parameters") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create a class without type parameters
        val classWithoutParams = createMockClass("SimpleClass", Empty)

        val tTypeRef = createTypeRef("T")
        val stringType = createTypeRef("string")
        val replacements = Map[TsType, TsType](tTypeRef -> stringType)

        val result = rewriter.withTree(replacements, classWithoutParams)

        // All replacements should remain since no shadowing occurs
        assert(result == replacements)
      }
    }

    test("TypeRewriter - Edge Cases and Error Conditions") {
      test("handles complex type references with type parameters") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create a type parameter T
        val tParam = createTypeParam("T")
        val classWithTParam = createMockClass("GenericClass", IArray(tParam))

        // Create a complex type reference T<string> (T with type arguments)
        val stringType = createTypeRef("string")
        val complexTTypeRef = createTypeRef("T", IArray(stringType))
        val numberType = createTypeRef("number")

        val replacements = Map[TsType, TsType](
          complexTTypeRef -> numberType  // This should be filtered out
        )

        val result = rewriter.withTree(replacements, classWithTParam)

        // Complex T reference should be filtered out due to shadowing
        assert(!result.contains(complexTTypeRef))
      }

      test("handles qualified type references") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create a type parameter T
        val tParam = createTypeParam("T")
        val classWithTParam = createMockClass("GenericClass", IArray(tParam))

        // Create a qualified type reference (e.g., Namespace.T)
        val qualifiedTTypeRef = TsTypeRef(
          NoComments,
          TsQIdent(IArray(createSimpleIdent("Namespace"), createSimpleIdent("T"))),
          Empty
        )
        val stringType = createTypeRef("string")

        val replacements = Map[TsType, TsType](qualifiedTTypeRef -> stringType)

        val result = rewriter.withTree(replacements, classWithTParam)

        // Qualified T reference should NOT be filtered out (it's not a simple T reference)
        assert(result.contains(qualifiedTTypeRef))
        assert(result(qualifiedTTypeRef) == stringType)
      }

      test("handles empty replacement map") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        val tParam = createTypeParam("T")
        val classWithTParam = createMockClass("GenericClass", IArray(tParam))

        val emptyReplacements = Map.empty[TsType, TsType]

        val result = rewriter.withTree(emptyReplacements, classWithTParam)

        assert(result.isEmpty)
      }

      test("handles case sensitivity in type parameter names") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create type parameters with different cases
        val tParam = createTypeParam("T")
        val classWithTParam = createMockClass("GenericClass", IArray(tParam))

        val tLowerTypeRef = createTypeRef("t")  // lowercase t
        val TUpperTypeRef = createTypeRef("T")  // uppercase T
        val stringType = createTypeRef("string")

        val replacements = Map[TsType, TsType](
          tLowerTypeRef -> stringType,  // Should remain (different case)
          TUpperTypeRef -> stringType   // Should be filtered out (exact match)
        )

        val result = rewriter.withTree(replacements, classWithTParam)

        // lowercase t should remain (case sensitive)
        assert(result.contains(tLowerTypeRef))
        // uppercase T should be filtered out
        assert(!result.contains(TUpperTypeRef))
      }
    }

    test("TypeRewriter - Integration and Real-World Scenarios") {
      test("integration with TreeTransformation workflow") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Simulate a real transformation workflow
        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")
        val booleanType = createTypeRef("boolean")

        val replacements = Map[TsType, TsType](
          stringType -> numberType,
          booleanType -> stringType
        )

        // Test that the transformation works correctly
        assert(rewriter.leaveTsType(replacements)(stringType) == numberType)
        assert(rewriter.leaveTsType(replacements)(booleanType) == stringType)
        assert(rewriter.leaveTsType(replacements)(numberType) == numberType)
      }

      test("complex nested type parameter scenarios") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create nested generic structures
        val tParam = createTypeParam("T")
        val uParam = createTypeParam("U")

        // Outer class with T
        val outerClass = createMockClass("Outer", IArray(tParam))

        // Inner interface with U (nested inside outer)
        val innerInterface = createMockInterface("Inner", IArray(uParam))

        val tTypeRef = createTypeRef("T")
        val uTypeRef = createTypeRef("U")
        val stringType = createTypeRef("string")

        val replacements = Map[TsType, TsType](
          tTypeRef -> stringType,
          uTypeRef -> stringType
        )

        // Test outer class - T should be filtered
        val outerResult = rewriter.withTree(replacements, outerClass)
        assert(!outerResult.contains(tTypeRef))

        // Test inner interface - U should be filtered
        val innerResult = rewriter.withTree(replacements, innerInterface)
        assert(!innerResult.contains(uTypeRef))
      }

      test("performance with large replacement maps") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Create a large replacement map
        val largeReplacements: Map[TsType, TsType] = (1 to 1000).map { i =>
          createTypeRef(s"Type$i").asInstanceOf[TsType] -> createTypeRef("string").asInstanceOf[TsType]
        }.toMap

        val testType = createTypeRef("Type500")
        val stringType = createTypeRef("string")

        // Test that lookup still works efficiently
        val result = rewriter.leaveTsType(largeReplacements)(testType)
        assert(result == stringType)

        // Test withTree with large map
        val classWithoutParams = createMockClass("SimpleClass", Empty)
        val treeResult = rewriter.withTree(largeReplacements, classWithoutParams)
        assert(treeResult.size == 1000)
      }

      test("real-world type alias scenario") {
        val baseTree = createMockClass("TestClass")
        val rewriter = new TypeRewriter(baseTree)

        // Simulate type alias expansion: type MyString<T> = string
        val tParam = createTypeParam("T")
        val stringType = createTypeRef("string")
        val myStringAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("MyString"),
          tparams = IArray(tParam),
          alias = stringType,
          codePath = CodePath.NoPath
        )

        // Create replacement for the type parameter
        val tTypeRef = createTypeRef("T")
        val numberType = createTypeRef("number")
        val replacements = Map[TsType, TsType](tTypeRef -> numberType)

        // The T parameter should be shadowed in the type alias context
        val result = rewriter.withTree(replacements, myStringAlias)
        assert(!result.contains(tTypeRef))
      }
    }
  }
}