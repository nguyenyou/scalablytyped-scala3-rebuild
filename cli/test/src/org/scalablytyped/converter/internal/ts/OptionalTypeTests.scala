package org.scalablytyped.converter.internal
package ts

import utest.*

object OptionalTypeTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)
  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createMockTypeRef(name: String): TsTypeRef = 
    TsTypeRef(NoComments, createQIdent(name), Empty)

  def tests = Tests {
    test("OptionalType - basic functionality") {
      test("makes a type optional by adding undefined") {
        val stringType = TsTypeRef.string

        val result = OptionalType(stringType)

        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 2)
        assert(union.types.contains(stringType))
        assert(union.types.contains(TsTypeRef.undefined))
      }

      test("makes custom type optional") {
        val customType = createMockTypeRef("MyType")

        val result = OptionalType(customType)

        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 2)
        assert(union.types.contains(customType))
        assert(union.types.contains(TsTypeRef.undefined))
      }

      test("makes already optional type more optional") {
        val stringType = TsTypeRef.string
        val optionalString = OptionalType(stringType)

        val result = OptionalType(optionalString)

        // Should create a union with the original optional type and undefined
        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        // The simplified union should still contain string and undefined
        assert(union.types.contains(stringType))
        assert(union.types.contains(TsTypeRef.undefined))
      }

      test("handles primitive types") {
        val primitiveTypes = IArray(
          TsTypeRef.string,
          TsTypeRef.number,
          TsTypeRef.boolean,
          TsTypeRef.any,
          TsTypeRef.never
        )

        primitiveTypes.foreach { primitiveType =>
          val result = OptionalType(primitiveType)

          assert(result.isInstanceOf[TsTypeUnion])
          val union = result.asInstanceOf[TsTypeUnion]
          assert(union.types.contains(primitiveType))
          assert(union.types.contains(TsTypeRef.undefined))
        }
      }
    }

    test("OptionalType - unapply method (pattern matching)") {
      test("extracts type from simple optional type") {
        val stringType = TsTypeRef.string
        val optionalString = TsTypeUnion(IArray(stringType, TsTypeRef.undefined))

        val result = OptionalType.unapply(optionalString)

        assert(result.isDefined)
        assert(result.get == stringType)
      }

      test("extracts type from optional type with null") {
        val numberType = TsTypeRef.number
        val optionalNumber = TsTypeUnion(IArray(numberType, TsTypeRef.`null`))

        val result = OptionalType.unapply(optionalNumber)

        assert(result.isDefined)
        assert(result.get == numberType)
      }

      test("extracts type from optional type with both null and undefined") {
        val booleanType = TsTypeRef.boolean
        val optionalBoolean = TsTypeUnion(IArray(booleanType, TsTypeRef.undefined, TsTypeRef.`null`))

        val result = OptionalType.unapply(optionalBoolean)

        assert(result.isDefined)
        assert(result.get == booleanType)
      }

      test("returns None for non-optional types") {
        val nonOptionalTypes = IArray(
          TsTypeRef.string,
          TsTypeRef.number,
          createMockTypeRef("MyType")
        )

        nonOptionalTypes.foreach { nonOptionalType =>
          val result = OptionalType.unapply(nonOptionalType)
          assert(result.isEmpty)
        }
      }

      test("returns None for union without undefined or null") {
        val unionWithoutOptional = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))

        val result = OptionalType.unapply(unionWithoutOptional)

        assert(result.isEmpty)
      }

      test("handles complex union types") {
        val complexUnion = TsTypeUnion(IArray(
          TsTypeRef.string,
          TsTypeRef.number,
          TsTypeRef.undefined
        ))

        val result = OptionalType.unapply(complexUnion)

        assert(result.isDefined)
        // Should extract the union of string and number
        assert(result.get.isInstanceOf[TsTypeUnion])
        val extractedUnion = result.get.asInstanceOf[TsTypeUnion]
        assert(extractedUnion.types.contains(TsTypeRef.string))
        assert(extractedUnion.types.contains(TsTypeRef.number))
        assert(!extractedUnion.types.contains(TsTypeRef.undefined))
      }
    }

    test("OptionalType - maybe method") {
      test("makes type optional when isOptional is true") {
        val stringType = TsTypeRef.string

        val result = OptionalType.maybe(stringType, isOptional = true)

        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.contains(stringType))
        assert(union.types.contains(TsTypeRef.undefined))
      }

      test("returns original type when isOptional is false") {
        val numberType = TsTypeRef.number

        val result = OptionalType.maybe(numberType, isOptional = false)

        assert(result == numberType)
      }

      test("handles custom types with maybe") {
        val customType = createMockTypeRef("CustomType")

        val optionalResult = OptionalType.maybe(customType, isOptional = true)
        val nonOptionalResult = OptionalType.maybe(customType, isOptional = false)

        assert(optionalResult.isInstanceOf[TsTypeUnion])
        assert(nonOptionalResult == customType)
      }
    }

    test("OptionalType - nested optional types") {
      test("handles nested unapply on complex optional types") {
        val baseType = TsTypeRef.string
        val optionalType = TsTypeUnion(IArray(baseType, TsTypeRef.undefined))
        val nestedOptionalType = TsTypeUnion(IArray(optionalType, TsTypeRef.`null`))

        val result = OptionalType.unapply(nestedOptionalType)

        assert(result.isDefined)
        // Should recursively extract the base type
        assert(result.get == baseType)
      }

      test("handles deeply nested optional types") {
        val baseType = createMockTypeRef("BaseType")
        val level1 = TsTypeUnion(IArray(baseType, TsTypeRef.undefined))
        val level2 = TsTypeUnion(IArray(level1, TsTypeRef.`null`))
        val level3 = TsTypeUnion(IArray(level2, TsTypeRef.undefined))

        val result = OptionalType.unapply(level3)

        assert(result.isDefined)
        assert(result.get == baseType)
      }

      test("handles mixed optional types with multiple non-optional types") {
        val type1 = TsTypeRef.string
        val type2 = TsTypeRef.number
        val type3 = createMockTypeRef("CustomType")
        val mixedOptional = TsTypeUnion(IArray(type1, type2, type3, TsTypeRef.undefined, TsTypeRef.`null`))

        val result = OptionalType.unapply(mixedOptional)

        assert(result.isDefined)
        assert(result.get.isInstanceOf[TsTypeUnion])
        val extractedUnion = result.get.asInstanceOf[TsTypeUnion]
        assert(extractedUnion.types.contains(type1))
        assert(extractedUnion.types.contains(type2))
        assert(extractedUnion.types.contains(type3))
        assert(!extractedUnion.types.contains(TsTypeRef.undefined))
        assert(!extractedUnion.types.contains(TsTypeRef.`null`))
      }
    }

    test("OptionalType - edge cases") {
      test("handles union with only undefined") {
        val onlyUndefined = TsTypeUnion(IArray(TsTypeRef.undefined))

        val result = OptionalType.unapply(onlyUndefined)

        // Should return Some(never) since simplified empty union becomes never
        assert(result.isDefined)
        assert(result.get == TsTypeRef.never)
      }

      test("handles union with only null") {
        val onlyNull = TsTypeUnion(IArray(TsTypeRef.`null`))

        val result = OptionalType.unapply(onlyNull)

        // Should return Some(never) since simplified empty union becomes never
        assert(result.isDefined)
        assert(result.get == TsTypeRef.never)
      }

      test("handles union with only null and undefined") {
        val onlyOptionals = TsTypeUnion(IArray(TsTypeRef.undefined, TsTypeRef.`null`))

        val result = OptionalType.unapply(onlyOptionals)

        // Should return Some(never) since simplified empty union becomes never
        assert(result.isDefined)
        assert(result.get == TsTypeRef.never)
      }

      test("handles empty union") {
        val emptyUnion = TsTypeUnion(Empty)

        val result = OptionalType.unapply(emptyUnion)

        assert(result.isEmpty)
      }

      test("handles single type union") {
        val singleTypeUnion = TsTypeUnion(IArray(TsTypeRef.string))

        val result = OptionalType.unapply(singleTypeUnion)

        assert(result.isEmpty) // No undefined or null, so not optional
      }

      test("handles undefined type directly") {
        val result = OptionalType.unapply(TsTypeRef.undefined)

        assert(result.isEmpty) // undefined alone is not considered optional
      }

      test("handles null type directly") {
        val result = OptionalType.unapply(TsTypeRef.`null`)

        assert(result.isEmpty) // null alone is not considered optional
      }
    }

    test("OptionalType - complex type structures") {
      test("handles object types") {
        val objectType = TsTypeObject(NoComments, Empty)

        val optionalObject = OptionalType(objectType)
        val extractedObject = OptionalType.unapply(optionalObject)

        assert(optionalObject.isInstanceOf[TsTypeUnion])
        assert(extractedObject.isDefined)
        assert(extractedObject.get == objectType)
      }

      test("handles intersection types") {
        val intersectionType = TsTypeIntersect(IArray(TsTypeRef.string, TsTypeRef.number))

        val optionalIntersection = OptionalType(intersectionType)
        val extractedIntersection = OptionalType.unapply(optionalIntersection)

        assert(optionalIntersection.isInstanceOf[TsTypeUnion])
        assert(extractedIntersection.isDefined)
        assert(extractedIntersection.get == intersectionType)
      }

      test("handles literal types") {
        val literalType = TsTypeLiteral(TsLiteral.Str("hello"))

        val optionalLiteral = OptionalType(literalType)
        val extractedLiteral = OptionalType.unapply(optionalLiteral)

        assert(optionalLiteral.isInstanceOf[TsTypeUnion])
        assert(extractedLiteral.isDefined)
        assert(extractedLiteral.get == literalType)
      }

      test("handles generic types") {
        val genericType = TsTypeRef(NoComments, createQIdent("Array"), IArray(TsTypeRef.string))

        val optionalGeneric = OptionalType(genericType)
        val extractedGeneric = OptionalType.unapply(optionalGeneric)

        assert(optionalGeneric.isInstanceOf[TsTypeUnion])
        assert(extractedGeneric.isDefined)
        assert(extractedGeneric.get == genericType)
      }
    }

    test("OptionalType - undefineds set") {
      test("undefineds set contains correct types") {
        assert(OptionalType.undefineds.contains(TsTypeRef.undefined))
        assert(OptionalType.undefineds.contains(TsTypeRef.`null`))
        assert(OptionalType.undefineds.size == 2)
      }

      test("undefineds set does not contain other types") {
        assert(!OptionalType.undefineds.contains(TsTypeRef.string))
        assert(!OptionalType.undefineds.contains(TsTypeRef.number))
        assert(!OptionalType.undefineds.contains(TsTypeRef.boolean))
        assert(!OptionalType.undefineds.contains(TsTypeRef.any))
        assert(!OptionalType.undefineds.contains(TsTypeRef.never))
      }
    }

    test("OptionalType - integration with TsTypeUnion.simplified") {
      test("apply method uses TsTypeUnion.simplified") {
        val stringType = TsTypeRef.string

        val result = OptionalType(stringType)

        // The result should be simplified - if string and undefined are duplicated, they should be deduplicated
        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 2)
        assert(union.types.toSet == Set(stringType, TsTypeRef.undefined))
      }

      test("apply method handles already undefined type") {
        val result = OptionalType(TsTypeRef.undefined)

        // Should create union with undefined twice, but simplified should deduplicate to just undefined
        assert(result == TsTypeRef.undefined)
      }

      test("apply method handles already null type") {
        val result = OptionalType(TsTypeRef.`null`)

        // Should create union with null and undefined
        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 2)
        assert(union.types.contains(TsTypeRef.`null`))
        assert(union.types.contains(TsTypeRef.undefined))
      }
    }

    test("OptionalType - pattern matching scenarios") {
      test("can be used in pattern matching") {
        val optionalString = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.undefined))
        val nonOptionalNumber = TsTypeRef.number

        val result1 = optionalString match {
          case OptionalType(innerType) => s"Optional: $innerType"
          case other => s"Not optional: $other"
        }

        val result2 = nonOptionalNumber match {
          case OptionalType(innerType) => s"Optional: $innerType"
          case other => s"Not optional: $other"
        }

        assert(result1.startsWith("Optional:"))
        assert(result2.startsWith("Not optional:"))
      }

      test("pattern matching with nested optional types") {
        val baseType = createMockTypeRef("BaseType")
        val level1Optional = TsTypeUnion(IArray(baseType, TsTypeRef.undefined))
        val level2Optional = TsTypeUnion(IArray(level1Optional, TsTypeRef.`null`))

        val result = level2Optional match {
          case OptionalType(innerType) => innerType
          case other => other
        }

        // Should extract down to the base type
        assert(result == baseType)
      }
    }

    test("OptionalType - performance and edge cases") {
      test("handles large union types efficiently") {
        val manyTypes = (1 to 50).map(i => createMockTypeRef(s"Type$i"))
        val largeUnion = TsTypeUnion(IArray.fromArray(manyTypes.toArray) ++ IArray(TsTypeRef.undefined))

        val result = OptionalType.unapply(largeUnion)

        assert(result.isDefined)
        assert(result.get.isInstanceOf[TsTypeUnion])
        val extractedUnion = result.get.asInstanceOf[TsTypeUnion]
        assert(extractedUnion.types.length == 50) // All types except undefined
        assert(!extractedUnion.types.contains(TsTypeRef.undefined))
      }

      test("handles union with duplicated optional types") {
        val stringType = TsTypeRef.string
        val unionWithDuplicates = TsTypeUnion(IArray(
          stringType,
          TsTypeRef.undefined,
          TsTypeRef.`null`,
          TsTypeRef.undefined, // Duplicate
          TsTypeRef.`null`     // Duplicate
        ))

        val result = OptionalType.unapply(unionWithDuplicates)

        assert(result.isDefined)
        assert(result.get == stringType)
      }

      test("handles complex nested union structures") {
        val innerUnion = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))
        val outerUnion = TsTypeUnion(IArray(innerUnion, TsTypeRef.undefined))

        val result = OptionalType.unapply(outerUnion)

        assert(result.isDefined)
        assert(result.get == innerUnion)
      }
    }

    test("OptionalType - function composition") {
      test("apply and unapply are inverse operations") {
        val originalTypes = IArray(
          TsTypeRef.string,
          TsTypeRef.number,
          createMockTypeRef("CustomType")
        )

        originalTypes.foreach { originalType =>
          val optional = OptionalType(originalType)
          val extracted = OptionalType.unapply(optional)

          assert(extracted.isDefined)
          assert(extracted.get == originalType)
        }
      }

      test("maybe with true is equivalent to apply") {
        val testTypes = IArray(
          TsTypeRef.string,
          TsTypeRef.boolean,
          createMockTypeRef("TestType")
        )

        testTypes.foreach { testType =>
          val viaApply = OptionalType(testType)
          val viaMaybe = OptionalType.maybe(testType, isOptional = true)

          assert(viaApply == viaMaybe)
        }
      }

      test("maybe with false is identity") {
        val testTypes = IArray(
          TsTypeRef.number,
          TsTypeRef.any,
          createMockTypeRef("IdentityType")
        )

        testTypes.foreach { testType =>
          val result = OptionalType.maybe(testType, isOptional = false)
          assert(result == testType)
        }
      }
    }
  }
}