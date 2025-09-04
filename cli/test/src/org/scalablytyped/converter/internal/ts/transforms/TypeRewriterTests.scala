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
}