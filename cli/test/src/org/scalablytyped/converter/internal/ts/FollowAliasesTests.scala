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
    }
  }
}