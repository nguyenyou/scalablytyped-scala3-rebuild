package org.scalablytyped.converter.internal

import org.scalablytyped.converter.internal.logging.Logger
import org.scalablytyped.converter.internal.ts.*

object TestUtils {

  // Helper methods for creating test data

  def createTypeParam(name: String, default: Option[TsType] = None, upperBound: Option[TsType] = None): TsTypeParam =
    TsTypeParam(NoComments, createSimpleIdent(name), upperBound, default)

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

  def createMockTypeAlias(name: String, tparams: IArray[TsTypeParam] = Empty, alias: TsType = TsTypeRef.any): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      alias = alias,
      codePath = CodePath.NoPath
    )

  def createMockScope(declarations: TsDecl*): TsTreeScope = {
    val parsedFile = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = IArray.fromTraversable(declarations),
      codePath = CodePath.NoPath
    )

    val root = TsTreeScope(
      libName = TsIdentLibrarySimple("test-lib"),
      pedantic = false,
      deps = Map.empty,
      logger = Logger.DevNull
    )

    root / parsedFile
  }
  
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

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

  def createMockCtor(): TsMemberCtor =
    TsMemberCtor(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = None
      )
    )

  def createMockIndex(): TsMemberIndex =
    TsMemberIndex(
      comments = NoComments,
      isReadOnly = false,
      level = TsProtectionLevel.Default,
      indexing = Indexing.Dict(createSimpleIdent("key"), TsTypeRef.string),
      valueType = Some(TsTypeRef.string)
    )

  def createMockTypeMapped(): TsMemberTypeMapped =
    TsMemberTypeMapped(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      readonly = ReadonlyModifier.Noop,
      key = createSimpleIdent("K"),
      from = TsTypeRef.string,
      as = None,
      optionalize = OptionalModifier.Noop,
      to = TsTypeRef.string
    )
}