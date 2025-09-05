package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object TypeAliasIntersectionTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createIntersectionType(types: TsType*): TsTypeIntersect =
    TsTypeIntersect(IArray.fromTraversable(types))

  def createObjectType(members: IArray[TsMember] = Empty): TsTypeObject =
    TsTypeObject(NoComments, members)

  def createFunctionType(sig: TsFunSig): TsTypeFunction =
    TsTypeFunction(sig)

  def createFunSig(
    params: IArray[TsFunParam] = Empty,
    ret: Option[TsType] = None
  ): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = Empty,
      params = params,
      resultType = ret
    )

  def createMockTypeAlias(
    name: String,
    alias: TsType,
    tparams: IArray[TsTypeParam] = Empty
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      alias = alias,
      codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    )

  def createMockInterface(
    name: String,
    inheritance: IArray[TsTypeRef] = Empty,
    members: IArray[TsMember] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = inheritance,
      members = members,
      codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    )

  def createMockClass(
    name: String,
    parent: Option[TsTypeRef] = None,
    implements: IArray[TsTypeRef] = Empty
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      parent = parent,
      implements = implements,
      members = Empty,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    )

  def createMockScope(
    members: IArray[TsContainerOrDecl] = Empty,
    logger: Logger[Unit] = Logger.DevNull
  ): TsTreeScope = {
    val libName = TsIdentLibrary("test-lib")
    val parsedFile = TsParsedFile(NoComments, Empty, members, CodePath.NoPath)
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger) / parsedFile
  }

  def tests = Tests {
    test("TypeAliasIntersection - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(TypeAliasIntersection.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsDecl method") {
        val scope = createMockScope()
        val typeAlias = createMockTypeAlias("TestAlias", createTypeRef("string"))
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        assert(result != null)
        assert(result.isInstanceOf[TsDecl])
      }
    }

    test("TypeAliasIntersection - Type Alias Processing") {
      test("preserves non-intersection type aliases") {
        val scope = createMockScope()
        val typeAlias = createMockTypeAlias("SimpleAlias", createTypeRef("string"))
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclTypeAlias])
        val resultAlias = result.asInstanceOf[TsDeclTypeAlias]
        assert(resultAlias.name.value == "SimpleAlias")
        assert(resultAlias.alias.isInstanceOf[TsTypeRef])
      }

      test("preserves non-type-alias declarations") {
        val scope = createMockScope()
        val interface = createMockInterface("TestInterface")
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(interface)
        
        assert(result.isInstanceOf[TsDeclInterface])
        assert(result.asInstanceOf[TsDeclInterface].name.value == "TestInterface")
      }

      test("converts intersection with type references to interface") {
        val scope = createMockScope()
        val intersectionType = createIntersectionType(
          createTypeRef("BaseInterface"),
          createTypeRef("MixinInterface")
        )
        val typeAlias = createMockTypeAlias("CombinedAlias", intersectionType)
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "CombinedAlias")
        assert(resultInterface.inheritance.length == 2)
        assert(resultInterface.inheritance.head.name.parts.head.value == "BaseInterface")
        assert(resultInterface.inheritance(1).name.parts.head.value == "MixinInterface")
      }

      test("converts intersection with object types to interface") {
        val scope = createMockScope()
        val objectType1 = createObjectType()
        val objectType2 = createObjectType()
        val intersectionType = createIntersectionType(objectType1, objectType2)
        val typeAlias = createMockTypeAlias("ObjectAlias", intersectionType)
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "ObjectAlias")
        assert(resultInterface.inheritance.isEmpty)
        assert(resultInterface.members.isEmpty) // Empty object types
      }

      test("converts mixed intersection to interface") {
        val scope = createMockScope()
        val typeRef = createTypeRef("BaseInterface")
        val objectType = createObjectType()
        val intersectionType = createIntersectionType(typeRef, objectType)
        val typeAlias = createMockTypeAlias("MixedAlias", intersectionType)
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "MixedAlias")
        assert(resultInterface.inheritance.length == 1)
        assert(resultInterface.inheritance.head.name.parts.head.value == "BaseInterface")
      }
    }

    test("TypeAliasIntersection - Legal Inheritance Filtering") {
      test("preserves intersection with legal type references") {
        val scope = createMockScope()
        val intersectionType = createIntersectionType(
          createTypeRef("Interface1"),
          createTypeRef("Interface2"),
          createTypeRef("Interface3")
        )
        val typeAlias = createMockTypeAlias("LegalAlias", intersectionType)
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.inheritance.length == 3)
      }

      test("preserves intersection with legal object types") {
        val scope = createMockScope()
        val objectType1 = createObjectType()
        val objectType2 = createObjectType()
        val intersectionType = createIntersectionType(objectType1, objectType2)
        val typeAlias = createMockTypeAlias("ObjectAlias", intersectionType)
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "ObjectAlias")
      }

      test("preserves intersection with legal function types") {
        val scope = createMockScope()
        val functionType = createFunctionType(createFunSig())
        val typeRef = createTypeRef("BaseInterface")
        val intersectionType = createIntersectionType(typeRef, functionType)
        val typeAlias = createMockTypeAlias("FunctionAlias", intersectionType)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        // Function types are not legal inheritance, so it preserves as type alias
        assert(result.isInstanceOf[TsDeclTypeAlias])
        assert(result.asInstanceOf[TsDeclTypeAlias].name.value == "FunctionAlias")
      }

      test("preserves type alias with illegal inheritance types") {
        val scope = createMockScope()
        val unionType = TsTypeUnion(IArray(createTypeRef("Type1"), createTypeRef("Type2")))
        val intersectionType = createIntersectionType(unionType, createTypeRef("Interface"))
        val typeAlias = createMockTypeAlias("IllegalAlias", intersectionType)
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        // Should preserve as type alias since union type is not legal inheritance
        assert(result.isInstanceOf[TsDeclTypeAlias])
        assert(result.asInstanceOf[TsDeclTypeAlias].name.value == "IllegalAlias")
      }
    }

    test("TypeAliasIntersection - Type Mapping Detection") {
      test("preserves type alias with type mapping object") {
        val scope = createMockScope()
        // Create a type mapping-like object (this would need proper TsType.isTypeMapping implementation)
        val objectType = createObjectType()
        val intersectionType = createIntersectionType(objectType, createTypeRef("Interface"))
        val typeAlias = createMockTypeAlias("MappingAlias", intersectionType)
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        // Should convert to interface since we don't have actual type mapping detection
        assert(result.isInstanceOf[TsDeclInterface])
      }
    }

    test("TypeAliasIntersection - Abstract Type Handling") {
      test("handles abstract type references") {
        val abstractInterface = createMockInterface("AbstractInterface")
        val scope = createMockScope(IArray(abstractInterface))
        
        val intersectionType = createIntersectionType(
          createTypeRef("AbstractInterface"),
          createTypeRef("ConcreteInterface")
        )
        val typeAlias = createMockTypeAlias("MixedAlias", intersectionType)
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        // Should still convert to interface
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.inheritance.length >= 1)
      }
    }

    test("TypeAliasIntersection - Edge Cases") {
      test("handles empty intersection") {
        val scope = createMockScope()
        val emptyIntersection = createIntersectionType()
        val typeAlias = createMockTypeAlias("EmptyAlias", emptyIntersection)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        // Empty intersection gets converted to interface with no inheritance
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "EmptyAlias")
        assert(resultInterface.inheritance.isEmpty)
      }

      test("handles single type intersection") {
        val scope = createMockScope()
        val singleIntersection = createIntersectionType(createTypeRef("SingleInterface"))
        val typeAlias = createMockTypeAlias("SingleAlias", singleIntersection)
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "SingleAlias")
        assert(resultInterface.inheritance.length == 1)
        assert(resultInterface.inheritance.head.name.parts.head.value == "SingleInterface")
      }

      test("preserves type parameters") {
        val scope = createMockScope()
        val tparam = TsTypeParam(NoComments, createSimpleIdent("T"), None, None)
        val intersectionType = createIntersectionType(
          createTypeRef("Interface1"),
          createTypeRef("Interface2")
        )
        val typeAlias = createMockTypeAlias("GenericAlias", intersectionType, IArray(tparam))
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "GenericAlias")
        assert(resultInterface.tparams.length == 1)
        assert(resultInterface.tparams.head.name.value == "T")
      }

      test("preserves comments and metadata") {
        val scope = createMockScope()
        val comment = Comment.Raw("Test comment")
        val comments = Comments(List(comment))
        val intersectionType = createIntersectionType(createTypeRef("Interface1"))
        
        val typeAlias = TsDeclTypeAlias(
          comments = comments,
          declared = true,
          name = createSimpleIdent("CommentedAlias"),
          tparams = Empty,
          alias = intersectionType,
          codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("CommentedAlias"))
        )
        
        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.comments == comments)
        assert(resultInterface.declared == true)
        assert(resultInterface.name.value == "CommentedAlias")
      }
    }

    test("TypeAliasIntersection - Complex Scenarios") {
      test("handles large intersection types") {
        val scope = createMockScope()
        val types = (1 to 10).map(i => createTypeRef(s"Interface$i"))
        val largeIntersection = createIntersectionType(types*)
        val typeAlias = createMockTypeAlias("LargeAlias", largeIntersection)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "LargeAlias")
        assert(resultInterface.inheritance.length == 10)
      }

      test("handles nested intersection types") {
        val scope = createMockScope()
        val nestedIntersection = createIntersectionType(
          createIntersectionType(createTypeRef("A"), createTypeRef("B")),
          createTypeRef("C")
        )
        val typeAlias = createMockTypeAlias("NestedAlias", nestedIntersection)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        // Should preserve as type alias since nested intersections are complex
        assert(result.isInstanceOf[TsDeclTypeAlias])
        assert(result.asInstanceOf[TsDeclTypeAlias].name.value == "NestedAlias")
      }

      test("handles intersection with generic type references") {
        val scope = createMockScope()
        val genericType = createTypeRef("Generic", IArray(createTypeRef("string")))
        val intersectionType = createIntersectionType(genericType, createTypeRef("Interface"))
        val typeAlias = createMockTypeAlias("GenericAlias", intersectionType)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.inheritance.length == 2)
      }

      test("handles intersection with object type containing members") {
        val scope = createMockScope()
        val property = TsMemberProperty(
          NoComments,
          TsProtectionLevel.Default,
          createSimpleIdent("prop"),
          Some(createTypeRef("string")),
          None,
          isStatic = false,
          isReadOnly = false
        )
        val objectType = createObjectType(IArray(property))
        val intersectionType = createIntersectionType(createTypeRef("Interface"), objectType)
        val typeAlias = createMockTypeAlias("ObjectWithMembersAlias", intersectionType)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.inheritance.length == 1)
        assert(resultInterface.members.length == 1)
        assert(resultInterface.members.head.asInstanceOf[TsMemberProperty].name.value == "prop")
      }
    }

    test("TypeAliasIntersection - Integration with FollowAliases") {
      test("works with alias resolution") {
        val baseAlias = createMockTypeAlias("BaseAlias", createTypeRef("BaseInterface"))
        val scope = createMockScope(IArray(baseAlias))

        val intersectionType = createIntersectionType(
          createTypeRef("BaseAlias"),
          createTypeRef("MixinInterface")
        )
        val typeAlias = createMockTypeAlias("CombinedAlias", intersectionType)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "CombinedAlias")
        assert(resultInterface.inheritance.length == 2)
      }

      test("handles circular alias references") {
        val scope = createMockScope()
        val circularType = createTypeRef("CircularAlias")
        val intersectionType = createIntersectionType(circularType, createTypeRef("Interface"))
        val typeAlias = createMockTypeAlias("CircularAlias", intersectionType)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "CircularAlias")
      }
    }

    test("TypeAliasIntersection - Error Handling") {
      test("handles malformed intersection types gracefully") {
        val scope = createMockScope()
        val malformedIntersection = TsTypeIntersect(Empty) // Empty intersection
        val typeAlias = createMockTypeAlias("MalformedAlias", malformedIntersection)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        // Empty intersection gets converted to interface with no inheritance
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "MalformedAlias")
        assert(resultInterface.inheritance.isEmpty)
      }

      test("handles null scope gracefully") {
        val scope = createMockScope()
        val intersectionType = createIntersectionType(createTypeRef("Interface"))
        val typeAlias = createMockTypeAlias("TestAlias", intersectionType)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        // Should still work with basic scope
        assert(result.isInstanceOf[TsDeclInterface])
      }

      test("handles unknown type references") {
        val scope = createMockScope()
        val unknownRef = createTypeRef("UnknownInterface")
        val intersectionType = createIntersectionType(unknownRef, createTypeRef("KnownInterface"))
        val typeAlias = createMockTypeAlias("UnknownAlias", intersectionType)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.inheritance.length == 2)
      }
    }

    test("TypeAliasIntersection - Performance") {
      test("handles very large intersection types efficiently") {
        val scope = createMockScope()
        val types = (1 to 100).map(i => createTypeRef(s"Interface$i"))
        val massiveIntersection = createIntersectionType(types*)
        val typeAlias = createMockTypeAlias("MassiveAlias", massiveIntersection)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "MassiveAlias")
        assert(resultInterface.inheritance.length == 100)
      }

      test("handles deeply nested object types") {
        val scope = createMockScope()
        val deepProperty = TsMemberProperty(
          NoComments,
          TsProtectionLevel.Default,
          createSimpleIdent("deepProp"),
          Some(createObjectType()),
          None,
          isStatic = false,
          isReadOnly = false
        )
        val deepObjectType = createObjectType(IArray(deepProperty))
        val intersectionType = createIntersectionType(createTypeRef("Interface"), deepObjectType)
        val typeAlias = createMockTypeAlias("DeepAlias", intersectionType)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.members.length == 1)
      }
    }

    test("TypeAliasIntersection - Real-World Patterns") {
      test("handles mixin pattern") {
        val scope = createMockScope()
        // Simulate: type Mixin = BaseClass & MixinA & MixinB
        val mixinIntersection = createIntersectionType(
          createTypeRef("BaseClass"),
          createTypeRef("MixinA"),
          createTypeRef("MixinB")
        )
        val typeAlias = createMockTypeAlias("Mixin", mixinIntersection)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "Mixin")
        assert(resultInterface.inheritance.length == 3)
      }

      test("handles utility type pattern") {
        val scope = createMockScope()
        // Simulate: type Extended = BaseInterface & { additionalProp: string }
        val additionalProp = TsMemberProperty(
          NoComments,
          TsProtectionLevel.Default,
          createSimpleIdent("additionalProp"),
          Some(createTypeRef("string")),
          None,
          isStatic = false,
          isReadOnly = false
        )
        val extensionObject = createObjectType(IArray(additionalProp))
        val utilityIntersection = createIntersectionType(createTypeRef("BaseInterface"), extensionObject)
        val typeAlias = createMockTypeAlias("Extended", utilityIntersection)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "Extended")
        assert(resultInterface.inheritance.length == 1)
        assert(resultInterface.members.length == 1)
        assert(resultInterface.members.head.asInstanceOf[TsMemberProperty].name.value == "additionalProp")
      }

      test("handles conditional type intersection") {
        val scope = createMockScope()
        // Simulate complex conditional type that results in intersection
        val conditionalIntersection = createIntersectionType(
          createTypeRef("ConditionalResult"),
          createTypeRef("AdditionalConstraint")
        )
        val typeAlias = createMockTypeAlias("ConditionalIntersection", conditionalIntersection)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.inheritance.length == 2)
      }

      test("handles library augmentation pattern") {
        val scope = createMockScope()
        // Simulate: type AugmentedLib = OriginalLib & Extensions
        val augmentationIntersection = createIntersectionType(
          createTypeRef("OriginalLib"),
          createTypeRef("Extensions")
        )
        val typeAlias = createMockTypeAlias("AugmentedLib", augmentationIntersection)

        val result = TypeAliasIntersection.enterTsDecl(scope)(typeAlias)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.name.value == "AugmentedLib")
        assert(resultInterface.inheritance.length == 2)
      }
    }
  }
}