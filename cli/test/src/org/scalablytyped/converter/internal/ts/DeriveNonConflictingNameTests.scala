package org.scalablytyped.converter.internal
package ts

import utest.*

object DeriveNonConflictingNameTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createMockProperty(name: String, tpe: Option[TsType] = Some(TsTypeRef.string)): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createMockFunction(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = IArray.Empty,
        resultType = Some(TsTypeRef.void)
      ),
      isStatic = false,
      isReadOnly = false
    )

  def createMockCall(params: IArray[TsFunParam] = IArray.Empty): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = params,
        resultType = Some(TsTypeRef.string)
      )
    )

  def createParam(name: String): TsFunParam =
    TsFunParam(
      comments = NoComments,
      name = createSimpleIdent(name),
      tpe = Some(TsTypeRef.string)
    )

  def tests = Tests {
    test("Basic Functionality") {
      test("empty members with empty prefix") {
        val members = IArray.Empty
        val usedNames = scala.collection.mutable.Set.empty[String]

        val result = DeriveNonConflictingName("", members) { name =>
          if (usedNames.contains(name.value)) None
          else {
            usedNames.add(name.value)
            Some(name.value)
          }
        }

        assert(result == "0")
      }
    }
  }
}