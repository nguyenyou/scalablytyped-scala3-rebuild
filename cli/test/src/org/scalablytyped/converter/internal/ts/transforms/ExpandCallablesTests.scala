package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object ExpandCallablesTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createFunSig(
    params: IArray[TsFunParam] = Empty,
    resultType: Option[TsType] = Some(TsTypeRef.void)
  ): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = Empty,
      params = params,
      resultType = resultType
    )

  def createMockProperty(
    name: String,
    tpe: Option[TsType] = Some(TsTypeRef.string),
    isStatic: Boolean = false,
    isReadOnly: Boolean = false
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

  def createMockMethod(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = createFunSig(),
      isStatic = false,
      isReadOnly = false
    )

  def createMockCall(signature: TsFunSig = createFunSig()): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = signature
    )

  def createMockInterface(name: String, members: IArray[TsMember] = Empty): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = Empty,
      members = members,
      codePath = CodePath.NoPath
    )

  def createMockTypeAlias(name: String, alias: TsType): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
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

  def tests = Tests {
    test("ExpandCallables - Basic Functionality") {
      test("extends TransformClassMembers") {
        assert(ExpandCallables.isInstanceOf[TransformClassMembers])
      }

      test("has newClassMembers method") {
        val scope = createMockScope()
        val interface = createMockInterface("test")
        val result = ExpandCallables.newClassMembers(scope, interface)
        assert(result != null)
      }

      test("leaves non-property members unchanged") {
        val scope = createMockScope()
        val method = createMockMethod("testMethod")
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(method))
      }

      test("leaves properties without types unchanged") {
        val scope = createMockScope()
        val property = createMockProperty("testProp", None)
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(property))
      }

      test("leaves properties with expressions unchanged") {
        val scope = createMockScope()
        val property = createMockProperty("testProp").copy(expr = Some(TsExpr.Literal(TsLiteral.Str("test"))))
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(property))
      }
    }

    test("ExpandCallables - Function Type Expansion") {
      test("expands property with function type") {
        val scope = createMockScope()
        val funType = TsTypeFunction(createFunSig(resultType = Some(TsTypeRef.string)))
        val property = createMockProperty("callback", Some(funType), isReadOnly = true)
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should create a method instead of keeping the property
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberFunction])
        val method = result.head.asInstanceOf[TsMemberFunction]
        assert(method.name.value == "callback")
        assert(method.signature.resultType.contains(TsTypeRef.string))
        assert(method.isReadOnly)
      }

      test("keeps original property when not readonly") {
        val scope = createMockScope()
        val funType = TsTypeFunction(createFunSig())
        val property = createMockProperty("callback", Some(funType), isReadOnly = false)
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should create both method and keep original property
        assert(result.length == 2)
        assert(result.exists(_.isInstanceOf[TsMemberFunction]))
        assert(result.exists(_.isInstanceOf[TsMemberProperty]))
        
        val keptProperty = result.find(_.isInstanceOf[TsMemberProperty]).get.asInstanceOf[TsMemberProperty]
        assert(keptProperty.comments.cs.exists(_.isInstanceOf[Marker.ExpandedCallables.type]))
      }
    }

    test("ExpandCallables - Object Type Expansion") {
      test("expands property with callable object type") {
        val scope = createMockScope()
        val callMember = createMockCall(createFunSig(resultType = Some(TsTypeRef.number)))
        val objType = TsTypeObject(NoComments, IArray(callMember))
        val property = createMockProperty("callable", Some(objType), isReadOnly = true)
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should create a method
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberFunction])
        val method = result.head.asInstanceOf[TsMemberFunction]
        assert(method.name.value == "callable")
        assert(method.signature.resultType.contains(TsTypeRef.number))
      }

      test("keeps original property when object has non-call members") {
        val scope = createMockScope()
        val callMember = createMockCall()
        val propMember = createMockProperty("prop")
        val objType = TsTypeObject(NoComments, IArray(callMember, propMember))
        val property = createMockProperty("callable", Some(objType), isReadOnly = true)
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should create both method and keep original property
        assert(result.length == 2)
        assert(result.exists(_.isInstanceOf[TsMemberFunction]))
        assert(result.exists(_.isInstanceOf[TsMemberProperty]))
      }

      test("ignores object type without call members") {
        val scope = createMockScope()
        val propMember = createMockProperty("prop")
        val objType = TsTypeObject(NoComments, IArray(propMember))
        val property = createMockProperty("notCallable", Some(objType))
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should keep original property unchanged
        assert(result.length == 1)
        assert(result.contains(property))
      }
    }

    test("ExpandCallables - Intersection Type Expansion") {
      test("expands intersection with function types") {
        val scope = createMockScope()
        val funType1 = TsTypeFunction(createFunSig(resultType = Some(TsTypeRef.string)))
        val funType2 = TsTypeFunction(createFunSig(resultType = Some(TsTypeRef.number)))
        val intersectionType = TsTypeIntersect(IArray(funType1, funType2))
        val property = createMockProperty("multiCallback", Some(intersectionType), isReadOnly = true)
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should create multiple methods
        assert(result.length == 2)
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
        val methods = result.map(_.asInstanceOf[TsMemberFunction])
        assert(methods.forall(_.name.value == "multiCallback"))
        
        val resultTypes = methods.map(_.signature.resultType).toSet
        assert(resultTypes.contains(Some(TsTypeRef.string)))
        assert(resultTypes.contains(Some(TsTypeRef.number)))
      }

      test("handles mixed intersection types") {
        val scope = createMockScope()
        val funType = TsTypeFunction(createFunSig())
        val stringType = TsTypeRef.string
        val intersectionType = TsTypeIntersect(IArray(funType, stringType))
        val property = createMockProperty("mixed", Some(intersectionType), isReadOnly = true)
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should create one method from the function type
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberFunction])
      }
    }

    test("ExpandCallables - Type Reference Expansion") {
      test("expands property with interface type reference") {
        val callMember = createMockCall(createFunSig(resultType = Some(TsTypeRef.boolean)))
        val callableInterface = createMockInterface("CallableInterface", IArray(callMember))
        val scope = createMockScope(callableInterface)
        
        val property = createMockProperty("interfaceCallback", Some(createTypeRef("CallableInterface")), isReadOnly = true)
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should create a method
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberFunction])
        val method = result.head.asInstanceOf[TsMemberFunction]
        assert(method.name.value == "interfaceCallback")
        assert(method.signature.resultType.contains(TsTypeRef.boolean))
      }

      test("expands property with type alias reference") {
        val funType = TsTypeFunction(createFunSig(resultType = Some(TsTypeRef.string)))
        val typeAlias = createMockTypeAlias("CallbackType", funType)
        val scope = createMockScope(typeAlias)
        
        val property = createMockProperty("aliasCallback", Some(createTypeRef("CallbackType")), isReadOnly = true)
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should create a method
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberFunction])
        val method = result.head.asInstanceOf[TsMemberFunction]
        assert(method.name.value == "aliasCallback")
        assert(method.signature.resultType.contains(TsTypeRef.string))
      }

      test("ignores non-callable interface references") {
        val propMember = createMockProperty("prop")
        val nonCallableInterface = createMockInterface("NonCallableInterface", IArray(propMember))
        val scope = createMockScope(nonCallableInterface)
        
        val property = createMockProperty("interfaceProp", Some(createTypeRef("NonCallableInterface")))
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should keep original property unchanged
        assert(result.length == 1)
        assert(result.contains(property))
      }

      test("ignores primitive type references") {
        val scope = createMockScope()
        val property = createMockProperty("stringProp", Some(TsTypeRef.string))
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should keep original property unchanged
        assert(result.length == 1)
        assert(result.contains(property))
      }

      test("ignores unknown type references") {
        val scope = createMockScope()
        val property = createMockProperty("unknownProp", Some(createTypeRef("UnknownType")))
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should keep original property unchanged
        assert(result.length == 1)
        assert(result.contains(property))
      }
    }

    test("ExpandCallables - Edge Cases") {
      test("handles union types") {
        val scope = createMockScope()
        val unionType = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))
        val property = createMockProperty("unionProp", Some(unionType))
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        // Should keep original property unchanged (union types are not expanded)
        assert(result.length == 1)
        assert(result.contains(property))
      }

      test("handles constructor types") {
        val scope = createMockScope()
        val ctorType = TsTypeConstructor(isAbstract = false, TsTypeFunction(createFunSig()))
        val property = createMockProperty("ctorProp", Some(ctorType))
        val interface = createMockInterface("test", IArray(property))

        val result = ExpandCallables.newClassMembers(scope, interface)

        // Should keep original property unchanged (constructor types are not expanded)
        assert(result.length == 1)
        assert(result.contains(property))
      }

      test("preserves static and protection level") {
        val scope = createMockScope()
        val funType = TsTypeFunction(createFunSig())
        val property = createMockProperty("staticCallback", Some(funType), isStatic = true, isReadOnly = true)
          .copy(level = TsProtectionLevel.Private)
        val interface = createMockInterface("test", IArray(property))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsMemberFunction])
        val method = result.head.asInstanceOf[TsMemberFunction]
        assert(method.isStatic == true)
        assert(method.level == TsProtectionLevel.Private)
      }

      test("handles multiple callable properties") {
        val scope = createMockScope()
        val funType1 = TsTypeFunction(createFunSig(resultType = Some(TsTypeRef.string)))
        val funType2 = TsTypeFunction(createFunSig(resultType = Some(TsTypeRef.number)))
        val property1 = createMockProperty("callback1", Some(funType1), isReadOnly = true)
        val property2 = createMockProperty("callback2", Some(funType2), isReadOnly = true)
        val interface = createMockInterface("test", IArray(property1, property2))
        
        val result = ExpandCallables.newClassMembers(scope, interface)
        
        assert(result.length == 2)
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
        val methods = result.map(_.asInstanceOf[TsMemberFunction])
        
        val methodNames = methods.map(_.name.value).toSet
        assert(methodNames.contains("callback1"))
        assert(methodNames.contains("callback2"))
      }
    }

    test("ExpandCallables - Integration Scenarios") {
      test("works with complex nested scenarios") {
        val callMember = createMockCall(createFunSig(resultType = Some(TsTypeRef.void)))
        val propMember = createMockProperty("data")
        val callableInterface = createMockInterface("CallableInterface", IArray(callMember, propMember))
        
        val funType = TsTypeFunction(createFunSig(resultType = Some(TsTypeRef.string)))
        val typeAlias = createMockTypeAlias("FunctionAlias", funType)
        
        val scope = createMockScope(callableInterface, typeAlias)
        
        val property1 = createMockProperty("interfaceCallback", Some(createTypeRef("CallableInterface")), isReadOnly = true)
        val property2 = createMockProperty("aliasCallback", Some(createTypeRef("FunctionAlias")), isReadOnly = true)
        val property3 = createMockProperty("directCallback", Some(funType), isReadOnly = true)
        val normalProperty = createMockProperty("normalProp", Some(TsTypeRef.string))
        
        val interface = createMockInterface("ComplexInterface", IArray(property1, property2, property3, normalProperty))
        
        val result = ExpandCallables.newClassMembers(scope, interface)

        // Should have 3 methods + 1 kept property (interface has non-call members) + 1 normal property
        assert(result.length == 5)

        val methods = result.filter(_.isInstanceOf[TsMemberFunction]).map(_.asInstanceOf[TsMemberFunction])
        val properties = result.filter(_.isInstanceOf[TsMemberProperty])

        assert(methods.length == 3) // 3 expanded methods
        assert(properties.length == 2) // 1 kept from interface expansion + 1 normal
        
        val methodNames = methods.map(_.name.value).toSet
        assert(methodNames.contains("interfaceCallback"))
        assert(methodNames.contains("aliasCallback"))
        assert(methodNames.contains("directCallback"))
      }
    }
  }
}