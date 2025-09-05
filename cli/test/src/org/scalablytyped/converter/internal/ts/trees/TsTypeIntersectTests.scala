package org.scalablytyped.converter.internal
package ts
package trees

import utest.*

object TsTypeIntersectTests extends TestSuite {
  def tests = Tests {
    test("Construction and Basic Properties") {
      test("constructor creates intersection type with given types") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val types = IArray(stringType, numberType)
        val intersectType = TsTypeIntersect(types)

        assert(intersectType.types == types)
        assert(intersectType.types.length == 2)
        assert(intersectType.types(0) == stringType)
        assert(intersectType.types(1) == numberType)
      }

      test("constructor with empty types array") {
        val emptyTypes = IArray.Empty
        val intersectType = TsTypeIntersect(emptyTypes)

        assert(intersectType.types.isEmpty)
        assert(intersectType.types.length == 0)
      }

      test("constructor with single type") {
        val singleType = TsTypeRef.boolean
        val types = IArray(singleType)
        val intersectType = TsTypeIntersect(types)

        assert(intersectType.types.length == 1)
        assert(intersectType.types(0) == singleType)
      }

      test("constructor with multiple primitive types") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val booleanType = TsTypeRef.boolean
        val types = IArray(stringType, numberType, booleanType)
        val intersectType = TsTypeIntersect(types)

        assert(intersectType.types.length == 3)
        assert(intersectType.types(0) == stringType)
        assert(intersectType.types(1) == numberType)
        assert(intersectType.types(2) == booleanType)
      }

      test("asString provides meaningful representation") {
        val types = IArray(TsTypeRef.string, TsTypeRef.number)
        val intersectType = TsTypeIntersect(types)

        assert(intersectType.asString.contains("TsTypeIntersect"))
      }
    }

    test("TsTypeIntersect.simplified - Basic Functionality") {
      test("empty intersection returns never") {
        val result = TsTypeIntersect.simplified(IArray.Empty)

        assert(result == TsTypeRef.never)
      }

      test("single type intersection returns the type itself") {
        val stringType = TsTypeRef.string
        val result = TsTypeIntersect.simplified(IArray(stringType))

        assert(result == stringType)
      }

      test("two different primitive types remain as intersection") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val result = TsTypeIntersect.simplified(IArray(stringType, numberType))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types.contains(stringType))
            assert(types.contains(numberType))
          case _ => assert(false)
        }
      }

      test("duplicate types are removed") {
        val stringType = TsTypeRef.string
        val result = TsTypeIntersect.simplified(IArray(stringType, stringType, stringType))

        assert(result == stringType)
      }
    }

    test("TsTypeIntersect.simplified - Object Type Combination") {
      test("combines multiple object types into single object") {
        // Create property members for object types
        val prop1 = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = TsIdent("prop1"),
          tpe = Some(TsTypeRef.string),
          expr = None,
          isStatic = false,
          isReadOnly = false
        )
        val prop2 = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = TsIdent("prop2"),
          tpe = Some(TsTypeRef.number),
          expr = None,
          isStatic = false,
          isReadOnly = false
        )

        val obj1 = TsTypeObject(NoComments, IArray(prop1))
        val obj2 = TsTypeObject(NoComments, IArray(prop2))

        val result = TsTypeIntersect.simplified(IArray(obj1, obj2))

        result match {
          case TsTypeObject(_, members) =>
            assert(members.length == 2)
            assert(members.contains(prop1))
            assert(members.contains(prop2))
          case _ => assert(false)
        }
      }

      test("single object type with other types preserves order") {
        val prop = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = TsIdent("prop"),
          tpe = Some(TsTypeRef.string),
          expr = None,
          isStatic = false,
          isReadOnly = false
        )
        val objType = TsTypeObject(NoComments, IArray(prop))
        val stringType = TsTypeRef.string

        val result = TsTypeIntersect.simplified(IArray(objType, stringType))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types(0) == objType)
            assert(types(1) == stringType)
          case _ => assert(false)
        }
      }
    }

    test("TsTypeIntersect.simplified - Nested Intersection Flattening") {
      test("flattens nested intersection types") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val booleanType = TsTypeRef.boolean

        // Create nested intersection: (string & number) & boolean
        val innerIntersect = TsTypeIntersect(IArray(stringType, numberType))
        val result = TsTypeIntersect.simplified(IArray(innerIntersect, booleanType))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 3)
            assert(types.contains(stringType))
            assert(types.contains(numberType))
            assert(types.contains(booleanType))
          case _ => assert(false)
        }
      }

      test("flattens deeply nested intersection types") {
        val type1 = TsTypeRef.string
        val type2 = TsTypeRef.number
        val type3 = TsTypeRef.boolean
        val type4 = TsTypeRef.any

        // Create deeply nested: ((string & number) & boolean) & any
        val level1 = TsTypeIntersect(IArray(type1, type2))
        val level2 = TsTypeIntersect(IArray(level1, type3))
        val result = TsTypeIntersect.simplified(IArray(level2, type4))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 4)
            assert(types.contains(type1))
            assert(types.contains(type2))
            assert(types.contains(type3))
            assert(types.contains(type4))
          case _ => assert(false)
        }
      }

      test("flattens multiple nested intersections") {
        val type1 = TsTypeRef.string
        val type2 = TsTypeRef.number
        val type3 = TsTypeRef.boolean
        val type4 = TsTypeRef.any

        // Create: (string & number) & (boolean & any)
        val intersect1 = TsTypeIntersect(IArray(type1, type2))
        val intersect2 = TsTypeIntersect(IArray(type3, type4))
        val result = TsTypeIntersect.simplified(IArray(intersect1, intersect2))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 4)
            assert(types.contains(type1))
            assert(types.contains(type2))
            assert(types.contains(type3))
            assert(types.contains(type4))
          case _ => assert(false)
        }
      }
    }

    test("TsTypeIntersect.simplified - Complex Object Type Scenarios") {
      test("does not combine object types with mapped types") {
        // Create a mapped type member
        val mappedMember = TsMemberTypeMapped(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          readonly = ReadonlyModifier.Noop,
          key = TsIdent("K"),
          from = TsTypeRef.string,
          as = None,
          optionalize = OptionalModifier.Noop,
          to = TsTypeRef.number
        )
        val mappedObj = TsTypeObject(NoComments, IArray(mappedMember))

        val prop = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = TsIdent("prop"),
          tpe = Some(TsTypeRef.string),
          expr = None,
          isStatic = false,
          isReadOnly = false
        )
        val normalObj = TsTypeObject(NoComments, IArray(prop))

        val result = TsTypeIntersect.simplified(IArray(mappedObj, normalObj))

        // Should remain as intersection since mapped types are not combined
        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types.contains(mappedObj))
            assert(types.contains(normalObj))
          case _ => assert(false)
        }
      }

      test("combines empty object types") {
        val emptyObj1 = TsTypeObject(NoComments, IArray.Empty)
        val emptyObj2 = TsTypeObject(NoComments, IArray.Empty)

        val result = TsTypeIntersect.simplified(IArray(emptyObj1, emptyObj2))

        result match {
          case TsTypeObject(_, members) =>
            assert(members.isEmpty)
          case _ => assert(false)
        }
      }

      test("preserves distinct members when combining objects") {
        val prop1 = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = TsIdent("prop1"),
          tpe = Some(TsTypeRef.string),
          expr = None,
          isStatic = false,
          isReadOnly = false
        )
        val prop2 = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = TsIdent("prop2"),
          tpe = Some(TsTypeRef.number),
          expr = None,
          isStatic = false,
          isReadOnly = false
        )

        // Create objects with overlapping and distinct members
        val obj1 = TsTypeObject(NoComments, IArray(prop1, prop2))
        val obj2 = TsTypeObject(NoComments, IArray(prop1)) // prop1 appears in both

        val result = TsTypeIntersect.simplified(IArray(obj1, obj2))

        result match {
          case TsTypeObject(_, members) =>
            // Should have distinct members only
            assert(members.length == 2)
            assert(members.contains(prop1))
            assert(members.contains(prop2))
          case _ => assert(false)
        }
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("intersection with union types") {
        val stringType = TsTypeRef.string
        val numberType = TsTypeRef.number
        val booleanType = TsTypeRef.boolean

        val unionType = TsTypeUnion(IArray(stringType, numberType))
        val result = TsTypeIntersect.simplified(IArray(unionType, booleanType))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types.contains(unionType))
            assert(types.contains(booleanType))
          case _ => assert(false)
        }
      }

      test("intersection with literal types") {
        val stringLiteral = TsTypeLiteral(TsLiteral.Str("hello"))
        val numberLiteral = TsTypeLiteral(TsLiteral.Num("42"))

        val result = TsTypeIntersect.simplified(IArray(stringLiteral, numberLiteral))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types.contains(stringLiteral))
            assert(types.contains(numberLiteral))
          case _ => assert(false)
        }
      }

      test("intersection with function types") {
        val param = TsFunParam(NoComments, TsIdent("x"), Some(TsTypeRef.number))
        val signature = TsFunSig(NoComments, IArray.Empty, IArray(param), Some(TsTypeRef.string))
        val functionType = TsTypeFunction(signature)

        val result = TsTypeIntersect.simplified(IArray(functionType, TsTypeRef.string))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types.contains(functionType))
            assert(types.contains(TsTypeRef.string))
          case _ => assert(false)
        }
      }

      test("intersection with never type") {
        val neverType = TsTypeRef.never
        val stringType = TsTypeRef.string

        val result = TsTypeIntersect.simplified(IArray(neverType, stringType))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types.contains(neverType))
            assert(types.contains(stringType))
          case _ => assert(false)
        }
      }

      test("intersection with any type") {
        val anyType = TsTypeRef.any
        val stringType = TsTypeRef.string

        val result = TsTypeIntersect.simplified(IArray(anyType, stringType))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types.contains(anyType))
            assert(types.contains(stringType))
          case _ => assert(false)
        }
      }
    }

    test("Type System Integration") {
      test("intersection with type references") {
        val customType1 = TsTypeRef(NoComments, TsQIdent.of(TsIdent("CustomType1")), IArray.Empty)
        val customType2 = TsTypeRef(NoComments, TsQIdent.of(TsIdent("CustomType2")), IArray.Empty)

        val result = TsTypeIntersect.simplified(IArray(customType1, customType2))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types.contains(customType1))
            assert(types.contains(customType2))
          case _ => assert(false)
        }
      }

      test("intersection with generic types") {
        val genericType1 = TsTypeRef(NoComments, TsQIdent.of(TsIdent("Array")), IArray(TsTypeRef.string))
        val genericType2 = TsTypeRef(NoComments, TsQIdent.of(TsIdent("Promise")), IArray(TsTypeRef.number))

        val result = TsTypeIntersect.simplified(IArray(genericType1, genericType2))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types.contains(genericType1))
            assert(types.contains(genericType2))
          case _ => assert(false)
        }
      }

      test("intersection with tuple types") {
        val tupleElement1 = TsTupleElement(None, TsTypeRef.string)
        val tupleElement2 = TsTupleElement(None, TsTypeRef.number)
        val tupleType = TsTypeTuple(IArray(tupleElement1, tupleElement2))

        val result = TsTypeIntersect.simplified(IArray(tupleType, TsTypeRef.boolean))

        result match {
          case TsTypeIntersect(types) =>
            assert(types.length == 2)
            assert(types.contains(tupleType))
            assert(types.contains(TsTypeRef.boolean))
          case _ => assert(false)
        }
      }
    }

    test("Performance and Scalability") {
      test("large intersection types") {
        val types = IArray.fromTraversable((1 to 100).map(i =>
          TsTypeRef(NoComments, TsQIdent.of(TsIdent(s"Type$i")), IArray.Empty)
        ))

        val result = TsTypeIntersect.simplified(types)

        result match {
          case TsTypeIntersect(resultTypes) =>
            assert(resultTypes.length == 100)
          case _ => assert(false)
        }
      }

      test("deeply nested object combinations") {
        // Create multiple object types with different properties
        val obj1Props = IArray(
          TsMemberProperty(
            comments = NoComments,
            level = TsProtectionLevel.Default,
            name = TsIdent("prop1"),
            tpe = Some(TsTypeRef.string),
            expr = None,
            isStatic = false,
            isReadOnly = false
          ),
          TsMemberProperty(
            comments = NoComments,
            level = TsProtectionLevel.Default,
            name = TsIdent("prop2"),
            tpe = Some(TsTypeRef.number),
            expr = None,
            isStatic = false,
            isReadOnly = false
          )
        )

        val obj2Props = IArray(
          TsMemberProperty(
            comments = NoComments,
            level = TsProtectionLevel.Default,
            name = TsIdent("prop3"),
            tpe = Some(TsTypeRef.boolean),
            expr = None,
            isStatic = false,
            isReadOnly = false
          )
        )

        val obj1 = TsTypeObject(NoComments, obj1Props)
        val obj2 = TsTypeObject(NoComments, obj2Props)
        val objects = IArray(obj1, obj2)

        val result = TsTypeIntersect.simplified(objects)

        result match {
          case TsTypeObject(_, members) =>
            assert(members.length == 3)
          case _ => assert(false)
        }
      }
    }
  }
}