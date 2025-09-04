package org.scalablytyped.converter.internal.ts.trees

import org.scalablytyped.converter.internal.*
import org.scalablytyped.converter.internal.ts.*
import utest.*

object TsTypeUnionTests extends TestSuite {
  def tests = Tests {
    test("Construction and Basic Properties") {
      test("constructor creates union type with given types") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val types = IArray(stringType, numberType)
        val unionType = TsTypeUnion(types)

        assert(unionType.types == types)
        assert(unionType.types.length == 2)
        assert(unionType.types(0) == stringType)
        assert(unionType.types(1) == numberType)
      }

      test("constructor with empty types array") {
        val emptyTypes = IArray.Empty
        val unionType = TsTypeUnion(emptyTypes)

        assert(unionType.types.isEmpty)
        assert(unionType.types.length == 0)
      }

      test("constructor with single type") {
        val singleType = TsTypeRef.boolean
        val types = IArray(singleType)
        val unionType = TsTypeUnion(types)

        assert(unionType.types.length == 1)
        assert(unionType.types(0) == singleType)
      }

      test("constructor with multiple primitive types") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val booleanType = TsTypeRef.boolean
        val types = IArray(stringType, numberType, booleanType)
        val unionType = TsTypeUnion(types)

        assert(unionType.types.length == 3)
        assert(unionType.types(0) == stringType)
        assert(unionType.types(1) == numberType)
        assert(unionType.types(2) == booleanType)
      }

      test("asString provides meaningful representation") {
        val types = IArray(TsTypeRef.string, TsTypeRef.number)
        val unionType = TsTypeUnion(types)

        assert(unionType.asString.contains("TsTypeUnion"))
      }
    }

    test("TsTypeUnion.simplified - Basic Functionality") {
      test("empty union returns never") {
        val result = TsTypeUnion.simplified(IArray.Empty)

        assert(result == TsTypeRef.never)
      }

      test("single type union returns the type itself") {
        val stringType = TsTypeRef.string
        val result = TsTypeUnion.simplified(IArray(stringType))

        assert(result == stringType)
      }

      test("two different primitive types remain as union") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val result = TsTypeUnion.simplified(IArray(stringType, numberType))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(stringType))
            assert(types.contains(numberType))
          case _ => assert(false)
        }
      }

      test("duplicate types are removed") {
        val stringType = TsTypeRef.string
        val result = TsTypeUnion.simplified(IArray(stringType, stringType, stringType))

        assert(result == stringType)
      }

      test("multiple distinct types remain as union") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val booleanType = TsTypeRef.boolean
        val result = TsTypeUnion.simplified(IArray(stringType, numberType, booleanType))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 3)
            assert(types.contains(stringType))
            assert(types.contains(numberType))
            assert(types.contains(booleanType))
          case _ => assert(false)
        }
      }
    }

    test("TsTypeUnion.simplified - Nested Union Flattening") {
      test("flattens nested union types") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val booleanType = TsTypeRef.boolean

        // Create nested union: (string | number) | boolean
        val innerUnion = TsTypeUnion(IArray(stringType, numberType))
        val result = TsTypeUnion.simplified(IArray(innerUnion, booleanType))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 3)
            assert(types.contains(stringType))
            assert(types.contains(numberType))
            assert(types.contains(booleanType))
          case _ => assert(false)
        }
      }

      test("flattens deeply nested union types") {
        val type1 = TsTypeRef.string
        val type2 = TsTypeRef.number
        val type3 = TsTypeRef.boolean
        val type4 = TsTypeRef.any

        // Create deeply nested: ((string | number) | boolean) | any
        val level1 = TsTypeUnion(IArray(type1, type2))
        val level2 = TsTypeUnion(IArray(level1, type3))
        val result = TsTypeUnion.simplified(IArray(level2, type4))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 4)
            assert(types.contains(type1))
            assert(types.contains(type2))
            assert(types.contains(type3))
            assert(types.contains(type4))
          case _ => assert(false)
        }
      }

      test("flattens multiple nested unions") {
        val type1 = TsTypeRef.string
        val type2 = TsTypeRef.number
        val type3 = TsTypeRef.boolean
        val type4 = TsTypeRef.any

        // Create: (string | number) | (boolean | any)
        val union1 = TsTypeUnion(IArray(type1, type2))
        val union2 = TsTypeUnion(IArray(type3, type4))
        val result = TsTypeUnion.simplified(IArray(union1, union2))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 4)
            assert(types.contains(type1))
            assert(types.contains(type2))
            assert(types.contains(type3))
            assert(types.contains(type4))
          case _ => assert(false)
        }
      }

      test("flattens nested unions with duplicates") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number

        // Create: (string | number) | (string | number) - should deduplicate
        val union1 = TsTypeUnion(IArray(stringType, numberType))
        val union2 = TsTypeUnion(IArray(stringType, numberType))
        val result = TsTypeUnion.simplified(IArray(union1, union2))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(stringType))
            assert(types.contains(numberType))
          case _ => assert(false)
        }
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("union with intersection types") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val booleanType = TsTypeRef.boolean

        val intersectType = TsTypeIntersect(IArray(stringType, numberType))
        val result = TsTypeUnion.simplified(IArray(intersectType, booleanType))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(intersectType))
            assert(types.contains(booleanType))
          case _ => assert(false)
        }
      }

      test("union with literal types") {
        val stringLiteral = TsTypeLiteral(TsLiteral.Str("hello"))
        val numberLiteral = TsTypeLiteral(TsLiteral.Num("42"))
        val booleanLiteral = TsTypeLiteral(TsLiteral.Bool(true))

        val result = TsTypeUnion.simplified(IArray(stringLiteral, numberLiteral, booleanLiteral))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 3)
            assert(types.contains(stringLiteral))
            assert(types.contains(numberLiteral))
            assert(types.contains(booleanLiteral))
          case _ => assert(false)
        }
      }

      test("union with function types") {
        val param = TsFunParam(NoComments, TsIdent("x"), Some(TsTypeRef.number))
        val signature = TsFunSig(NoComments, IArray.Empty, IArray(param), Some(TsTypeRef.string))
        val functionType = TsTypeFunction(signature)

        val result = TsTypeUnion.simplified(IArray(functionType, TsTypeRef.string))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(functionType))
            assert(types.contains(TsTypeRef.string))
          case _ => assert(false)
        }
      }

      test("union with object types") {
        val prop = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = TsIdent("prop"),
          tpe = Some(TsTypeRef.string),
          expr = None,
          isStatic = false,
          isReadOnly = false
        )
        val objectType = TsTypeObject(NoComments, IArray(prop))

        val result = TsTypeUnion.simplified(IArray(objectType, TsTypeRef.number))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(objectType))
            assert(types.contains(TsTypeRef.number))
          case _ => assert(false)
        }
      }

      test("union with never type") {
        val neverType = TsTypeRef.never
        val stringType = TsTypeRef.string

        val result = TsTypeUnion.simplified(IArray(neverType, stringType))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(neverType))
            assert(types.contains(stringType))
          case _ => assert(false)
        }
      }

      test("union with any type") {
        val anyType = TsTypeRef.any
        val stringType = TsTypeRef.string

        val result = TsTypeUnion.simplified(IArray(anyType, stringType))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(anyType))
            assert(types.contains(stringType))
          case _ => assert(false)
        }
      }

      test("union with undefined and null") {
        val undefinedType = TsTypeRef.undefined
        val nullType = TsTypeRef.`null`
        val stringType = TsTypeRef.string

        val result = TsTypeUnion.simplified(IArray(undefinedType, nullType, stringType))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 3)
            assert(types.contains(undefinedType))
            assert(types.contains(nullType))
            assert(types.contains(stringType))
          case _ => assert(false)
        }
      }
    }

    test("Type System Integration") {
      test("union with type references") {
        val customType1 = TsTypeRef(NoComments, TsQIdent.of(TsIdent("CustomType1")), IArray.Empty)
        val customType2 = TsTypeRef(NoComments, TsQIdent.of(TsIdent("CustomType2")), IArray.Empty)

        val result = TsTypeUnion.simplified(IArray(customType1, customType2))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(customType1))
            assert(types.contains(customType2))
          case _ => assert(false)
        }
      }

      test("union with generic types") {
        val genericType1 = TsTypeRef(NoComments, TsQIdent.of(TsIdent("Array")), IArray(TsTypeRef.string))
        val genericType2 = TsTypeRef(NoComments, TsQIdent.of(TsIdent("Promise")), IArray(TsTypeRef.number))

        val result = TsTypeUnion.simplified(IArray(genericType1, genericType2))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(genericType1))
            assert(types.contains(genericType2))
          case _ => assert(false)
        }
      }

      test("union with tuple types") {
        val tupleElement1 = TsTupleElement(None, TsTypeRef.string)
        val tupleElement2 = TsTupleElement(None, TsTypeRef.number)
        val tupleType = TsTypeTuple(IArray(tupleElement1, tupleElement2))

        val result = TsTypeUnion.simplified(IArray(tupleType, TsTypeRef.boolean))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(tupleType))
            assert(types.contains(TsTypeRef.boolean))
          case _ => assert(false)
        }
      }

      test("union with conditional types") {
        val conditionalType = TsTypeConditional(
          pred = TsTypeRef.string,
          ifTrue = TsTypeRef.number,
          ifFalse = TsTypeRef.boolean
        )

        val result = TsTypeUnion.simplified(IArray(conditionalType, TsTypeRef.any))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 2)
            assert(types.contains(conditionalType))
            assert(types.contains(TsTypeRef.any))
          case _ => assert(false)
        }
      }
    }

    test("Performance and Scalability") {
      test("large union types") {
        val types = IArray.fromTraversable((1 to 100).map(i =>
          TsTypeRef(NoComments, TsQIdent.of(TsIdent(s"Type$i")), IArray.Empty)
        ))

        val result = TsTypeUnion.simplified(types)

        result match {
          case TsTypeUnion(resultTypes) =>
            assert(resultTypes.length == 100)
          case _ => assert(false)
        }
      }

      test("deeply nested union flattening") {
        // Create a deeply nested structure: ((((string | number) | boolean) | any) | void)
        val type1 = TsTypeRef.string
        val type2 = TsTypeRef.number
        val type3 = TsTypeRef.boolean
        val type4 = TsTypeRef.any
        val type5 = TsTypeRef.void

        val level1 = TsTypeUnion(IArray(type1, type2))
        val level2 = TsTypeUnion(IArray(level1, type3))
        val level3 = TsTypeUnion(IArray(level2, type4))
        val result = TsTypeUnion.simplified(IArray(level3, type5))

        result match {
          case TsTypeUnion(types) =>
            assert(types.length == 5)
            assert(types.contains(type1))
            assert(types.contains(type2))
            assert(types.contains(type3))
            assert(types.contains(type4))
            assert(types.contains(type5))
          case _ => assert(false)
        }
      }

      test("union with many duplicate types") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number

        // Create union with many duplicates
        val types = IArray.fromTraversable(
          List.fill(50)(stringType) ++ List.fill(50)(numberType)
        )

        val result = TsTypeUnion.simplified(types)

        result match {
          case TsTypeUnion(resultTypes) =>
            assert(resultTypes.length == 2)
            assert(resultTypes.contains(stringType))
            assert(resultTypes.contains(numberType))
          case _ => assert(false)
        }
      }
    }

    test("Equality and HashCode") {
      test("equal union types have same hash code") {
        val types1 = IArray(TsTypeRef.string, TsTypeRef.number)
        val types2 = IArray(TsTypeRef.string, TsTypeRef.number)
        val union1 = TsTypeUnion(types1)
        val union2 = TsTypeUnion(types2)

        assert(union1 == union2)
        assert(union1.hashCode == union2.hashCode)
      }

      test("different union types are not equal") {
        val union1 = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))
        val union2 = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.boolean))

        assert(union1 != union2)
      }

      test("order matters for equality") {
        val union1 = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))
        val union2 = TsTypeUnion(IArray(TsTypeRef.number, TsTypeRef.string))

        assert(union1 != union2)
      }

      test("empty unions are equal") {
        val union1 = TsTypeUnion(IArray.Empty)
        val union2 = TsTypeUnion(IArray.Empty)

        assert(union1 == union2)
        assert(union1.hashCode == union2.hashCode)
      }
    }

    test("String Representation") {
      test("asString contains type information") {
        val union = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))
        val str = union.asString

        assert(str.contains("TsTypeUnion"))
      }

      test("empty union asString") {
        val union = TsTypeUnion(IArray.Empty)
        val str = union.asString

        assert(str.contains("TsTypeUnion"))
      }

      test("single type union asString") {
        val union = TsTypeUnion(IArray(TsTypeRef.string))
        val str = union.asString

        assert(str.contains("TsTypeUnion"))
      }
    }
  }
}