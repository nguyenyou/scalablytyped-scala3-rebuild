package org.scalablytyped.converter.internal
package ts

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object FollowAliasesTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)
  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createMockTypeAlias(
      name: String,
      alias: TsType,
      tparams: IArray[TsTypeParam] = Empty,
      declared: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = comments,
      declared = declared,
      name = createSimpleIdent(name),
      tparams = tparams,
      alias = alias,
      codePath = codePath
    )

  def createMockInterface(
      name: String,
      inheritance: IArray[TsTypeRef] = Empty,
      members: IArray[TsMember] = Empty,
      tparams: IArray[TsTypeParam] = Empty,
      declared: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclInterface =
    TsDeclInterface(
      comments = comments,
      declared = declared,
      name = createSimpleIdent(name),
      tparams = tparams,
      inheritance = inheritance,
      members = members,
      codePath = codePath
    )

  def createMockScope(declarations: TsNamedDecl*): TsTreeScope = {
    val file = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = IArray.fromArray(declarations.toArray),
      codePath = CodePath.NoPath
    )

    val root = TsTreeScope(
      libName = TsIdentLibrarySimple("test-lib"),
      pedantic = false,
      deps = Map.empty,
      logger = Logger.DevNull
    )

    root / file
  }

  def tests = Tests {
    test("FollowAliases - basic functionality") {
      test("returns original type when no alias found") {
        val scope = createMockScope()
        val typeRef = TsTypeRef(createQIdent("UnknownType"))

        val result = FollowAliases(scope)(typeRef)

        assert(result == typeRef)
      }

      test("follows simple type alias") {
        val alias = createMockTypeAlias("StringAlias", TsTypeRef.string)
        val scope = createMockScope(alias)
        val typeRef = TsTypeRef(createQIdent("StringAlias"))

        val result = FollowAliases(scope)(typeRef)

        assert(result == TsTypeRef.string)
      }

      test("follows nested type alias") {
        val innerAlias = createMockTypeAlias("InnerAlias", TsTypeRef.number)
        val outerAlias = createMockTypeAlias("OuterAlias", TsTypeRef(createQIdent("InnerAlias")))
        val scope = createMockScope(innerAlias, outerAlias)
        val typeRef = TsTypeRef(createQIdent("OuterAlias"))

        val result = FollowAliases(scope)(typeRef)

        assert(result == TsTypeRef.number)
      }

      test("follows thin interface") {
        val thinInterface = createMockInterface("ThinInterface", members = Empty)
        val scope = createMockScope(thinInterface)
        val typeRef = TsTypeRef(createQIdent("ThinInterface"))

        val result = FollowAliases(scope)(typeRef)

        // Should return the interface as a type reference since it's thin
        assert(result.isInstanceOf[TsTypeRef])
      }

      test("does not follow thick interface") {
        val property = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = createSimpleIdent("prop"),
          tpe = Some(TsTypeRef.string),
          expr = None,
          isStatic = false,
          isReadOnly = false
        )
        val thickInterface = createMockInterface("ThickInterface", members = IArray(property))
        val scope = createMockScope(thickInterface)
        val typeRef = TsTypeRef(createQIdent("ThickInterface"))

        val result = FollowAliases(scope)(typeRef)

        // Should return original type since interface is not thin
        assert(result == typeRef)
      }
    }

    test("FollowAliases - union and intersection types") {
      test("follows aliases in union types") {
        val alias1 = createMockTypeAlias("Alias1", TsTypeRef.string)
        val alias2 = createMockTypeAlias("Alias2", TsTypeRef.number)
        val scope = createMockScope(alias1, alias2)

        val unionType = TsTypeUnion(IArray(
          TsTypeRef(createQIdent("Alias1")),
          TsTypeRef(createQIdent("Alias2"))
        ))

        val result = FollowAliases(scope)(unionType)

        assert(result.isInstanceOf[TsTypeUnion])
        val resultUnion = result.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.contains(TsTypeRef.string))
        assert(resultUnion.types.contains(TsTypeRef.number))
      }

      test("follows aliases in intersection types") {
        val alias1 = createMockTypeAlias("Alias1", TsTypeRef.string)
        val alias2 = createMockTypeAlias("Alias2", TsTypeRef.number)
        val scope = createMockScope(alias1, alias2)

        val intersectionType = TsTypeIntersect(IArray(
          TsTypeRef(createQIdent("Alias1")),
          TsTypeRef(createQIdent("Alias2"))
        ))

        val result = FollowAliases(scope)(intersectionType)

        assert(result.isInstanceOf[TsTypeIntersect])
        val resultIntersection = result.asInstanceOf[TsTypeIntersect]
        assert(resultIntersection.types.contains(TsTypeRef.string))
        assert(resultIntersection.types.contains(TsTypeRef.number))
      }
    }

    test("FollowAliases - typeRef method") {
      test("typeRef returns TsTypeRef for simple alias") {
        val alias = createMockTypeAlias("StringAlias", TsTypeRef.string)
        val scope = createMockScope(alias)
        val typeRef = TsTypeRef(createQIdent("StringAlias"))

        val result = FollowAliases.typeRef(scope)(typeRef)

        assert(result.isInstanceOf[TsTypeRef])
        assert(result == TsTypeRef.string)
      }

      test("typeRef returns original for unknown type") {
        val scope = createMockScope()
        val typeRef = TsTypeRef(createQIdent("UnknownType"))

        val result = FollowAliases.typeRef(scope)(typeRef)

        assert(result == typeRef)
      }
    }
  }
}