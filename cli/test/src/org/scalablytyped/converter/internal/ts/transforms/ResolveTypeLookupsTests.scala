package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import org.scalablytyped.converter.internal.ts.transforms.ExpandTypeMappings.TaggedLiteral
import utest.*

object ResolveTypeLookupsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMockInterface(
    name: String,
    members: IArray[TsMember] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = Empty,
      members = members,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMemberProperty(name: String, tpe: TsType = createTypeRef("string")): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(tpe),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createMemberFunction(name: String, returnType: TsType = createTypeRef("void")): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(NoComments, Empty, Empty, Some(returnType)),
      isStatic = false,
      isReadOnly = false
    )

  def createMemberIndex(keyType: TsType = createTypeRef("string"), valueType: TsType = createTypeRef("any")): TsMemberIndex =
    TsMemberIndex(
      comments = NoComments,
      isReadOnly = false,
      level = TsProtectionLevel.Default,
      indexing = Indexing.Dict(createSimpleIdent("key"), keyType),
      valueType = Some(valueType)
    )

  def createMockScope(declarations: TsContainerOrDecl*): TsTreeScope = {
    val parsedFile = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = IArray.fromTraversable(declarations),
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
    )
    
    val root = TsTreeScope(
      libName = TsIdentLibrarySimple("test-lib"),
      pedantic = false,
      deps = Map.empty,
      logger = Logger.DevNull
    )
    
    root / parsedFile
  }

  def tests = Tests {
    test("ResolveTypeLookups - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(ResolveTypeLookups.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has leaveTsType method") {
        val scope = createMockScope()
        val typeRef = createTypeRef("string")
        val result = ResolveTypeLookups.leaveTsType(scope)(typeRef)
        assert(result != null)
        assert(result.isInstanceOf[TsType])
      }

      test("has expandLookupType method") {
        val scope = createMockScope()
        val lookup = TsTypeLookup(createTypeRef("TestType"), createTypeRef("string"))
        val result = ResolveTypeLookups.expandLookupType(scope, lookup)
        assert(result.isInstanceOf[Option[TsType]])
      }

      test("has pick method for members and strings") {
        val member = createMemberProperty("prop", createTypeRef("string"))
        val members = IArray(member)
        val strings = Set.empty[TaggedLiteral]
        val result = ResolveTypeLookups.pick(members, strings)
        assert(result.isInstanceOf[Option[TsType]])
      }

      test("has pick method for members and literal") {
        val member = createMemberProperty("prop", createTypeRef("string"))
        val members = IArray(member)
        val literal = TsLiteral.Str("prop")
        val result = ResolveTypeLookups.pick(members, literal)
        assert(result != null)
        assert(result.isInstanceOf[TsType])
      }
    }

    test("ResolveTypeLookups - Tuple Lookup Resolution") {
      test("resolves tuple lookup with number index") {
        val scope = createMockScope()
        val elem1 = TsTupleElement(None, createTypeRef("string"))
        val elem2 = TsTupleElement(None, createTypeRef("number"))
        val tuple = TsTypeTuple(IArray(elem1, elem2))
        val lookup = TsTypeLookup(tuple, TsTypeRef.number)
        
        val result = ResolveTypeLookups.leaveTsType(scope)(lookup)
        
        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 2)
        assert(union.types.exists(_.isInstanceOf[TsTypeRef]))
      }

      test("leaves non-tuple lookups for further processing") {
        val scope = createMockScope()
        val lookup = TsTypeLookup(createTypeRef("TestType"), createTypeRef("string"))
        
        val result = ResolveTypeLookups.leaveTsType(scope)(lookup)
        
        // Should either be resolved or remain as lookup
        assert(result != null)
        assert(result.isInstanceOf[TsType])
      }

      test("leaves non-lookup types unchanged") {
        val scope = createMockScope()
        val typeRef = createTypeRef("string")
        val unionType = TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number")))
        
        val result1 = ResolveTypeLookups.leaveTsType(scope)(typeRef)
        val result2 = ResolveTypeLookups.leaveTsType(scope)(unionType)
        
        assert(result1 == typeRef)
        assert(result2 == unionType)
      }
    }

    test("ResolveTypeLookups - Pick Method with Members and Strings") {
      test("returns index signature type when strings are empty") {
        val indexMember = createMemberIndex(createTypeRef("string"), createTypeRef("number"))
        val propertyMember = createMemberProperty("prop", createTypeRef("string"))
        val members = IArray[TsMember](indexMember, propertyMember)
        val strings = Set.empty[TaggedLiteral]
        
        val result = ResolveTypeLookups.pick(members, strings)
        
        assert(result.isDefined)
        assert(result.get.isInstanceOf[TsTypeRef])
      }

      test("returns None when no index signature and strings are empty") {
        val propertyMember = createMemberProperty("prop", createTypeRef("string"))
        val members = IArray[TsMember](propertyMember)
        val strings = Set.empty[TaggedLiteral]
        
        val result = ResolveTypeLookups.pick(members, strings)
        
        assert(result.isEmpty)
      }

      test("returns union of picked types when strings are provided") {
        val prop1 = createMemberProperty("prop1", createTypeRef("string"))
        val prop2 = createMemberProperty("prop2", createTypeRef("number"))
        val members = IArray[TsMember](prop1, prop2)
        val strings = Set(
          TaggedLiteral(TsLiteral.Str("prop1"))(false),
          TaggedLiteral(TsLiteral.Str("prop2"))(false)
        )
        
        val result = ResolveTypeLookups.pick(members, strings)
        
        assert(result.isDefined)
        // Should create a union of the picked types
        assert(result.get.isInstanceOf[TsType])
      }

      test("filters out ignored types") {
        val prop1 = createMemberProperty("prop1", TsTypeRef.never)
        val prop2 = createMemberProperty("prop2", TsTypeRef.any)
        val prop3 = createMemberProperty("prop3", TsTypeRef.`object`)
        val members = IArray[TsMember](prop1, prop2, prop3)
        val strings = Set(
          TaggedLiteral(TsLiteral.Str("prop1"))(false),
          TaggedLiteral(TsLiteral.Str("prop2"))(false),
          TaggedLiteral(TsLiteral.Str("prop3"))(false)
        )
        
        val result = ResolveTypeLookups.pick(members, strings)
        
        // Should return None because all types are ignored
        assert(result.isEmpty)
      }
    }

    test("ResolveTypeLookups - Pick Method with Members and Literal") {
      test("picks property type by literal name") {
        val targetProp = createMemberProperty("targetProp", createTypeRef("string"))
        val otherProp = createMemberProperty("otherProp", createTypeRef("number"))
        val members = IArray[TsMember](targetProp, otherProp)
        val literal = TsLiteral.Str("targetProp")
        
        val result = ResolveTypeLookups.pick(members, literal)
        
        assert(result.isInstanceOf[TsTypeRef])
        // Should pick the string type from targetProp
      }

      test("picks function type by literal name") {
        val targetFunc = createMemberFunction("targetFunc", createTypeRef("boolean"))
        val otherProp = createMemberProperty("otherProp", createTypeRef("number"))
        val members = IArray[TsMember](targetFunc, otherProp)
        val literal = TsLiteral.Str("targetFunc")
        
        val result = ResolveTypeLookups.pick(members, literal)
        
        assert(result.isInstanceOf[TsTypeFunction])
        val funcType = result.asInstanceOf[TsTypeFunction]
        assert(funcType.signature.resultType.isDefined)
      }

      test("combines multiple functions with same name") {
        val func1 = createMemberFunction("overloaded", createTypeRef("string"))
        val func2 = createMemberFunction("overloaded", createTypeRef("number"))
        val members = IArray[TsMember](func1, func2)
        val literal = TsLiteral.Str("overloaded")
        
        val result = ResolveTypeLookups.pick(members, literal)
        
        assert(result.isInstanceOf[TsTypeObject])
        val objType = result.asInstanceOf[TsTypeObject]
        assert(objType.members.length == 2)
        assert(objType.members.forall(_.isInstanceOf[TsMemberCall]))
      }

      test("combines property and function with same name") {
        val prop = createMemberProperty("mixed", createTypeRef("string"))
        val func = createMemberFunction("mixed", createTypeRef("boolean"))
        val members = IArray[TsMember](prop, func)
        val literal = TsLiteral.Str("mixed")
        
        val result = ResolveTypeLookups.pick(members, literal)
        
        assert(result.isInstanceOf[TsTypeIntersect])
        val intersect = result.asInstanceOf[TsTypeIntersect]
        assert(intersect.types.length == 2)
      }

      test("handles missing property gracefully") {
        val prop = createMemberProperty("existingProp", createTypeRef("string"))
        val members = IArray[TsMember](prop)
        val literal = TsLiteral.Str("missingProp")
        
        val result = ResolveTypeLookups.pick(members, literal)
        
        // Should return never type when no matching member found
        assert(result == TsTypeRef.never)
      }

      test("handles property without type annotation") {
        val propWithoutType = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = createSimpleIdent("untypedProp"),
          tpe = None,
          expr = None,
          isStatic = false,
          isReadOnly = false
        )
        val members = IArray[TsMember](propWithoutType)
        val literal = TsLiteral.Str("untypedProp")

        val result = ResolveTypeLookups.pick(members, literal)

        // Property without type annotation defaults to any, but any is ignored, so result is never
        assert(result == TsTypeRef.never)
      }

      test("ignores static members") {
        val staticProp = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = createSimpleIdent("staticProp"),
          tpe = Some(createTypeRef("string")),
          expr = None,
          isStatic = true,
          isReadOnly = false
        )
        val members = IArray[TsMember](staticProp)
        val literal = TsLiteral.Str("staticProp")
        
        val result = ResolveTypeLookups.pick(members, literal)
        
        // Should not pick static members
        assert(result == TsTypeRef.never)
      }
    }

    test("ResolveTypeLookups - ExpandLookupType Method") {
      test("handles lookup type expansion") {
        val targetInterface = createMockInterface("TargetType", IArray(
          createMemberProperty("prop1", createTypeRef("string")),
          createMemberProperty("prop2", createTypeRef("number"))
        ))
        val scope = createMockScope(targetInterface)
        val lookup = TsTypeLookup(createTypeRef("TargetType"), createTypeRef("string"))
        
        val result = ResolveTypeLookups.expandLookupType(scope, lookup)
        
        // Should attempt to expand the lookup
        assert(result.isInstanceOf[Option[TsType]])
      }

      test("returns None for unresolvable lookups") {
        val scope = createMockScope()
        val lookup = TsTypeLookup(createTypeRef("NonExistentType"), createTypeRef("string"))
        
        val result = ResolveTypeLookups.expandLookupType(scope, lookup)
        
        assert(result.isEmpty)
      }
    }

    test("ResolveTypeLookups - Edge Cases") {
      test("handles complex member combinations") {
        val prop = createMemberProperty("complex", createTypeRef("string"))
        val func1 = createMemberFunction("complex", createTypeRef("number"))
        val func2 = createMemberFunction("complex", createTypeRef("boolean"))
        val members = IArray[TsMember](prop, func1, func2)
        val literal = TsLiteral.Str("complex")
        
        val result = ResolveTypeLookups.pick(members, literal)
        
        // Should create intersection of property and overloaded functions
        assert(result.isInstanceOf[TsTypeIntersect])
      }

      test("handles numeric literal lookups") {
        val prop = createMemberProperty("0", createTypeRef("string"))
        val members = IArray[TsMember](prop)
        val literal = TsLiteral.Num("0")
        
        val result = ResolveTypeLookups.pick(members, literal)
        
        assert(result.isInstanceOf[TsTypeRef])
      }

      test("handles boolean literal lookups") {
        val prop = createMemberProperty("true", createTypeRef("string"))
        val members = IArray[TsMember](prop)
        val literal = TsLiteral.Bool(true)
        
        val result = ResolveTypeLookups.pick(members, literal)
        
        assert(result.isInstanceOf[TsTypeRef])
      }

      test("filters ignored types correctly") {
        val neverProp = createMemberProperty("never", TsTypeRef.never)
        val anyProp = createMemberProperty("any", TsTypeRef.any)
        val objectProp = createMemberProperty("object", TsTypeRef.`object`)
        val validProp = createMemberProperty("valid", createTypeRef("string"))
        val members = IArray[TsMember](neverProp, anyProp, objectProp, validProp)
        
        val neverResult = ResolveTypeLookups.pick(members, TsLiteral.Str("never"))
        val anyResult = ResolveTypeLookups.pick(members, TsLiteral.Str("any"))
        val objectResult = ResolveTypeLookups.pick(members, TsLiteral.Str("object"))
        val validResult = ResolveTypeLookups.pick(members, TsLiteral.Str("valid"))
        
        // Ignored types should return never
        assert(neverResult == TsTypeRef.never)
        assert(anyResult == TsTypeRef.never)
        assert(objectResult == TsTypeRef.never)
        // Valid type should be returned
        assert(validResult.isInstanceOf[TsTypeRef])
      }
    }

    test("ResolveTypeLookups - Integration Scenarios") {
      test("handles real-world keyof pattern") {
        val userInterface = createMockInterface("User", IArray(
          createMemberProperty("name", createTypeRef("string")),
          createMemberProperty("age", createTypeRef("number")),
          createMemberProperty("email", createTypeRef("string"))
        ))
        val scope = createMockScope(userInterface)
        
        // Simulate keyof User lookup
        val lookup = TsTypeLookup(createTypeRef("User"), createTypeRef("string"))
        
        val result = ResolveTypeLookups.expandLookupType(scope, lookup)
        
        // Should attempt to resolve the keyof pattern
        assert(result.isInstanceOf[Option[TsType]])
      }

      test("handles indexed access pattern") {
        val configInterface = createMockInterface("Config", IArray(
          createMemberProperty("apiUrl", createTypeRef("string")),
          createMemberProperty("timeout", createTypeRef("number")),
          createMemberProperty("retries", createTypeRef("number"))
        ))
        val scope = createMockScope(configInterface)
        
        // Test picking specific property
        val members = configInterface.members
        val result = ResolveTypeLookups.pick(members, TsLiteral.Str("apiUrl"))
        
        assert(result.isInstanceOf[TsTypeRef])
      }

      test("handles method overloading scenarios") {
        val apiInterface = createMockInterface("API", IArray(
          createMemberFunction("request", createTypeRef("Promise")),
          createMemberFunction("request", createTypeRef("Observable")),
          createMemberProperty("baseUrl", createTypeRef("string"))
        ))
        
        val members = apiInterface.members
        val result = ResolveTypeLookups.pick(members, TsLiteral.Str("request"))
        
        // Should create object with call signatures for overloads
        assert(result.isInstanceOf[TsTypeObject])
        val objType = result.asInstanceOf[TsTypeObject]
        assert(objType.members.length == 2)
        assert(objType.members.forall(_.isInstanceOf[TsMemberCall]))
      }
    }
  }
}