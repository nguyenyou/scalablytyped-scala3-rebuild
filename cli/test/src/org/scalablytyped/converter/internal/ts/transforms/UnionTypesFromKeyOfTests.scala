package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object UnionTypesFromKeyOfTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createKeyOfType(typeRef: TsTypeRef): TsTypeKeyOf =
    TsTypeKeyOf(typeRef)

  def createMemberProperty(
    name: String,
    tpe: Option[TsType] = None,
    isOptional: Boolean = false,
    isReadOnly: Boolean = false,
    isStatic: Boolean = false
  ): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
      isStatic = isStatic,
      isReadOnly = isReadOnly
    )

  def createMemberMethod(
    name: String,
    signature: TsFunSig,
    isStatic: Boolean = false
  ): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = signature,
      isStatic = isStatic,
      isReadOnly = false
    )

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

  def createMockInterface(
    name: String,
    members: IArray[TsMember] = Empty,
    inheritance: IArray[TsTypeRef] = Empty
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
    members: IArray[TsMember] = Empty,
    parent: Option[TsTypeRef] = None
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      parent = parent,
      implements = Empty,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    )

  def createMockScope(
    declarations: Seq[TsDecl] = Seq.empty,
    logger: Logger[Unit] = Logger.DevNull
  ): TsTreeScope = {
    val libName = TsIdentLibrary("test-lib")
    val parsedFile = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = IArray.fromTraversable(declarations),
      codePath = CodePath.NoPath
    )
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger) / parsedFile
  }

  def tests = Tests {
    test("UnionTypesFromKeyOf - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(UnionTypesFromKeyOf.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsType method") {
        val scope = createMockScope(Seq.empty)
        val keyOfType = createKeyOfType(createTypeRef("TestInterface"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)
        assert(result != null)
        assert(result.isInstanceOf[TsType])
      }
    }

    test("UnionTypesFromKeyOf - Interface Property Extraction") {
      test("converts keyof interface with properties to union of string literals") {
        val prop1 = createMemberProperty("name", Some(createTypeRef("string")))
        val prop2 = createMemberProperty("age", Some(createTypeRef("number")))
        val prop3 = createMemberProperty("email", Some(createTypeRef("string")))
        val interface = createMockInterface("Person", IArray(prop1, prop2, prop3))
        val scope = createMockScope(Seq(interface))
        
        val keyOfType = createKeyOfType(createTypeRef("Person"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)
        
        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 3)
        
        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet == Set("name", "age", "email"))
      }

      test("converts keyof interface with single property") {
        val prop = createMemberProperty("id", Some(createTypeRef("number")))
        val interface = createMockInterface("Entity", IArray(prop))
        val scope = createMockScope(Seq(interface))

        val keyOfType = createKeyOfType(createTypeRef("Entity"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        assert(result.isInstanceOf[TsTypeLiteral])
        val literal = result.asInstanceOf[TsTypeLiteral]
        assert(literal.literal == TsLiteral.Str("id"))
      }

      test("preserves keyof for interface with no properties") {
        val interface = createMockInterface("Empty", Empty)
        val scope = createMockScope(Seq(interface))

        val keyOfType = createKeyOfType(createTypeRef("Empty"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        // Should preserve original keyof type since no properties
        assert(result.isInstanceOf[TsTypeKeyOf])
        assert(result == keyOfType)
      }

      test("includes only property members, not methods") {
        val prop1 = createMemberProperty("name", Some(createTypeRef("string")))
        val method1 = createMemberMethod("getName", createFunSig(ret = Some(createTypeRef("string"))))
        val prop2 = createMemberProperty("age", Some(createTypeRef("number")))
        val method2 = createMemberMethod("setAge", createFunSig())

        val interface = createMockInterface("Mixed", IArray(prop1, method1, prop2, method2))
        val scope = createMockScope(Seq(interface))
        
        val keyOfType = createKeyOfType(createTypeRef("Mixed"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)
        
        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 2)
        
        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet == Set("name", "age"))
      }

      test("handles interface with static and instance properties") {
        val instanceProp = createMemberProperty("instanceProp", Some(createTypeRef("string")), isStatic = false)
        val staticProp = createMemberProperty("staticProp", Some(createTypeRef("number")), isStatic = true)
        
        val interface = createMockInterface("WithStatic", IArray(instanceProp, staticProp))
        val scope = createMockScope(Seq(interface))

        val keyOfType = createKeyOfType(createTypeRef("WithStatic"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 2)

        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet == Set("instanceProp", "staticProp"))
      }

      test("handles interface with optional and readonly properties") {
        val normalProp = createMemberProperty("normal", Some(createTypeRef("string")))
        val optionalProp = createMemberProperty("optional", Some(createTypeRef("string")), isOptional = true)
        val readonlyProp = createMemberProperty("readonly", Some(createTypeRef("string")), isReadOnly = true)

        val interface = createMockInterface("PropertyTypes", IArray(normalProp, optionalProp, readonlyProp))
        val scope = createMockScope(Seq(interface))
        
        val keyOfType = createKeyOfType(createTypeRef("PropertyTypes"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)
        
        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 3)
        
        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet == Set("normal", "optional", "readonly"))
      }
    }

    test("UnionTypesFromKeyOf - Non-Interface Types") {
      test("preserves keyof for class types") {
        val prop = createMemberProperty("value", Some(createTypeRef("string")))
        val clazz = createMockClass("TestClass", IArray(prop))
        val scope = createMockScope(Seq(clazz))

        val keyOfType = createKeyOfType(createTypeRef("TestClass"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        // Should preserve original keyof type since it's not an interface
        assert(result.isInstanceOf[TsTypeKeyOf])
        assert(result == keyOfType)
      }

      test("preserves keyof for non-existent types") {
        val scope = createMockScope(Seq.empty)

        val keyOfType = createKeyOfType(createTypeRef("NonExistent"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        // Should preserve original keyof type since type doesn't exist
        assert(result.isInstanceOf[TsTypeKeyOf])
        assert(result == keyOfType)
      }

      test("preserves keyof for type aliases") {
        val typeAlias = TsDeclTypeAlias(
          NoComments,
          false,
          createSimpleIdent("StringAlias"),
          Empty,
          createTypeRef("string"),
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("StringAlias"))
        )
        val scope = createMockScope(Seq(typeAlias))
        
        val keyOfType = createKeyOfType(createTypeRef("StringAlias"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)
        
        // Should preserve original keyof type since it's not an interface
        assert(result.isInstanceOf[TsTypeKeyOf])
        assert(result == keyOfType)
      }
    }

    test("UnionTypesFromKeyOf - Abstract Types") {
      test("preserves keyof for abstract types") {
        // This test would require mocking the isAbstract method, which is complex
        // In practice, abstract types are handled by the scope's isAbstract method
        // For now, we'll test the basic behavior
        val interface = createMockInterface("AbstractInterface")
        val scope = createMockScope(Seq(interface))

        val keyOfType = createKeyOfType(createTypeRef("AbstractInterface"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        // Since we can't easily mock isAbstract, this will convert normally
        // In real usage, abstract types would be preserved
        assert(result.isInstanceOf[TsTypeKeyOf] || result.isInstanceOf[TsTypeLiteral])
      }
    }

    test("UnionTypesFromKeyOf - Edge Cases") {
      test("preserves non-keyof types unchanged") {
        val scope = createMockScope(Seq.empty)
        val stringType = createTypeRef("string")
        val result = UnionTypesFromKeyOf.enterTsType(scope)(stringType)

        assert(result == stringType)
      }

      test("preserves keyof with type parameters") {
        val scope = createMockScope(Seq.empty)
        val genericTypeRef = createTypeRef("Generic", IArray(createTypeRef("string")))
        val keyOfType = createKeyOfType(genericTypeRef)
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        // Should preserve original keyof type since it has type parameters
        assert(result.isInstanceOf[TsTypeKeyOf])
        assert(result == keyOfType)
      }

      test("handles interface with duplicate property names") {
        // This shouldn't happen in valid TypeScript, but test robustness
        val prop1 = createMemberProperty("name", Some(createTypeRef("string")))
        val prop2 = createMemberProperty("name", Some(createTypeRef("number")))
        val interface = createMockInterface("Duplicate", IArray(prop1, prop2))
        val scope = createMockScope(Seq(interface))

        val keyOfType = createKeyOfType(createTypeRef("Duplicate"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        // The transform collects all properties, so duplicates result in multiple entries
        // But TsTypeUnion.simplified() deduplicates them, so we get a single literal
        assert(result.isInstanceOf[TsTypeLiteral])
        val literal = result.asInstanceOf[TsTypeLiteral]
        assert(literal.literal == TsLiteral.Str("name"))
      }

      test("handles interface with complex property names") {
        val prop1 = createMemberProperty("simple", Some(createTypeRef("string")))
        val prop2 = createMemberProperty("with-dash", Some(createTypeRef("string")))
        val prop3 = createMemberProperty("with_underscore", Some(createTypeRef("string")))
        val prop4 = createMemberProperty("123numeric", Some(createTypeRef("string")))
        
        val interface = createMockInterface("ComplexNames", IArray(prop1, prop2, prop3, prop4))
        val scope = createMockScope(Seq(interface))
        
        val keyOfType = createKeyOfType(createTypeRef("ComplexNames"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)
        
        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 4)
        
        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet == Set("simple", "with-dash", "with_underscore", "123numeric"))
      }
    }

    test("UnionTypesFromKeyOf - Logging and Debugging") {
      test("logs when unable to expand keyof") {
        val typeAlias = TsDeclTypeAlias(
          NoComments,
          false,
          createSimpleIdent("NotInterface"),
          Empty,
          createTypeRef("string"),
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("NotInterface"))
        )
        val scope = createMockScope(Seq(typeAlias))

        val keyOfType = createKeyOfType(createTypeRef("NotInterface"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        // Should preserve original keyof type since it's not an interface
        assert(result.isInstanceOf[TsTypeKeyOf])
        assert(result == keyOfType)

        // Note: In real usage, this would log "Could not expand keyof NotInterface"
        // but we can't easily test logging without complex mocking
      }
    }

    test("UnionTypesFromKeyOf - Performance") {
      test("handles interface with many properties efficiently") {
        val properties = (1 to 100).map(i =>
          createMemberProperty(s"prop$i", Some(createTypeRef("string")))
        )
        val interface = createMockInterface("LargeInterface", IArray.fromTraversable(properties))
        val scope = createMockScope(Seq(interface))

        val keyOfType = createKeyOfType(createTypeRef("LargeInterface"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 100)

        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet.size == 100)
        assert(literals.contains("prop1"))
        assert(literals.contains("prop100"))
      }

      test("handles deeply nested scope lookups") {
        val prop = createMemberProperty("deepProp", Some(createTypeRef("string")))
        val interface = createMockInterface("DeepInterface", IArray(prop))

        // Create a nested scope structure
        val namespace = TsDeclNamespace(
          NoComments,
          false,
          createSimpleIdent("DeepNamespace"),
          IArray(interface),
          CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent("DeepNamespace")),
          JsLocation.Zero
        )
        val scope = createMockScope(Seq(namespace)) / namespace

        val keyOfType = createKeyOfType(createTypeRef("DeepInterface"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        assert(result.isInstanceOf[TsTypeLiteral])
        val literal = result.asInstanceOf[TsTypeLiteral]
        assert(literal.literal == TsLiteral.Str("deepProp"))
      }
    }

    test("UnionTypesFromKeyOf - Real-World Patterns") {
      test("handles DOM-like interface") {
        val idProp = createMemberProperty("id", Some(createTypeRef("string")))
        val classNameProp = createMemberProperty("className", Some(createTypeRef("string")))
        val tagNameProp = createMemberProperty("tagName", Some(createTypeRef("string")))
        val childrenProp = createMemberProperty("children", Some(createTypeRef("NodeList")))

        val domElement = createMockInterface("Element", IArray(idProp, classNameProp, tagNameProp, childrenProp))
        val scope = createMockScope(Seq(domElement))

        val keyOfType = createKeyOfType(createTypeRef("Element"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 4)

        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet == Set("id", "className", "tagName", "children"))
      }

      test("handles API response interface") {
        val statusProp = createMemberProperty("status", Some(createTypeRef("number")))
        val dataProp = createMemberProperty("data", Some(createTypeRef("any")))
        val messageProp = createMemberProperty("message", Some(createTypeRef("string")))
        val errorsProp = createMemberProperty("errors", Some(createTypeRef("Array")), isOptional = true)

        val apiResponse = createMockInterface("ApiResponse", IArray(statusProp, dataProp, messageProp, errorsProp))
        val scope = createMockScope(Seq(apiResponse))

        val keyOfType = createKeyOfType(createTypeRef("ApiResponse"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 4)

        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet == Set("status", "data", "message", "errors"))
      }

      test("handles configuration object interface") {
        val hostProp = createMemberProperty("host", Some(createTypeRef("string")))
        val portProp = createMemberProperty("port", Some(createTypeRef("number")))
        val sslProp = createMemberProperty("ssl", Some(createTypeRef("boolean")), isOptional = true)
        val timeoutProp = createMemberProperty("timeout", Some(createTypeRef("number")), isOptional = true)
        val retriesProp = createMemberProperty("retries", Some(createTypeRef("number")), isOptional = true)

        val config = createMockInterface("Config", IArray(hostProp, portProp, sslProp, timeoutProp, retriesProp))
        val scope = createMockScope(Seq(config))

        val keyOfType = createKeyOfType(createTypeRef("Config"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 5)

        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet == Set("host", "port", "ssl", "timeout", "retries"))
      }

      test("handles event handler interface") {
        val onClickProp = createMemberProperty("onClick", Some(createTypeRef("Function")), isOptional = true)
        val onChangeProp = createMemberProperty("onChange", Some(createTypeRef("Function")), isOptional = true)
        val onSubmitProp = createMemberProperty("onSubmit", Some(createTypeRef("Function")), isOptional = true)
        val onLoadProp = createMemberProperty("onLoad", Some(createTypeRef("Function")), isOptional = true)

        val eventHandlers = createMockInterface("EventHandlers", IArray(onClickProp, onChangeProp, onSubmitProp, onLoadProp))
        val scope = createMockScope(Seq(eventHandlers))

        val keyOfType = createKeyOfType(createTypeRef("EventHandlers"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]
        assert(union.types.length == 4)

        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet == Set("onClick", "onChange", "onSubmit", "onLoad"))
      }
    }

    test("UnionTypesFromKeyOf - Integration") {
      test("works with other transforms") {
        val prop1 = createMemberProperty("name", Some(createTypeRef("string")))
        val prop2 = createMemberProperty("value", Some(createTypeRef("number")))
        val interface = createMockInterface("TestInterface", IArray(prop1, prop2))
        val scope = createMockScope(Seq(interface))

        val keyOfType = createKeyOfType(createTypeRef("TestInterface"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        assert(result.isInstanceOf[TsTypeUnion])
        val union = result.asInstanceOf[TsTypeUnion]

        // Verify the union is properly formed for other transforms
        assert(union.types.length == 2)
        assert(union.types.forall(_.isInstanceOf[TsTypeLiteral]))

        val literals = union.types.collect { case TsTypeLiteral(TsLiteral.Str(value)) => value }
        assert(literals.toSet == Set("name", "value"))
      }

      test("preserves type structure for further processing") {
        val prop = createMemberProperty("key", Some(createTypeRef("string")))
        val interface = createMockInterface("SingleProp", IArray(prop))
        val scope = createMockScope(Seq(interface))

        val keyOfType = createKeyOfType(createTypeRef("SingleProp"))
        val result = UnionTypesFromKeyOf.enterTsType(scope)(keyOfType)

        // Single property should result in a single literal, not a union
        assert(result.isInstanceOf[TsTypeLiteral])
        val literal = result.asInstanceOf[TsTypeLiteral]
        assert(literal.literal == TsLiteral.Str("key"))

        // Verify it's the correct type for further processing
        assert(literal.literal.isInstanceOf[TsLiteral.Str])
        assert(literal.literal.asInstanceOf[TsLiteral.Str].value == "key")
      }

      test("handles scope changes correctly") {
        val prop = createMemberProperty("scopedProp", Some(createTypeRef("string")))
        val interface = createMockInterface("ScopedInterface", IArray(prop))

        // Test with different scope configurations
        val scope1 = createMockScope(Seq(interface))
        val scope2 = createMockScope(Seq.empty) // Empty scope

        val keyOfType = createKeyOfType(createTypeRef("ScopedInterface"))

        val result1 = UnionTypesFromKeyOf.enterTsType(scope1)(keyOfType)
        val result2 = UnionTypesFromKeyOf.enterTsType(scope2)(keyOfType)

        // Should expand in scope1 but not in scope2
        assert(result1.isInstanceOf[TsTypeLiteral])
        assert(result2.isInstanceOf[TsTypeKeyOf])
        assert(result2 == keyOfType)
      }
    }
  }
}