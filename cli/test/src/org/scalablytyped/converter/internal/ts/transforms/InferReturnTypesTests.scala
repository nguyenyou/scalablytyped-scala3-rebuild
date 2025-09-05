package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object InferReturnTypesTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createFunParam(name: String, tpe: Option[TsType] = Some(TsTypeRef.string)): TsFunParam =
    TsFunParam(
      comments = NoComments,
      name = createSimpleIdent(name),
      tpe = tpe
    )

  def createFunSig(
    params: IArray[TsFunParam] = Empty,
    resultType: Option[TsType] = None,
    tparams: IArray[TsTypeParam] = Empty
  ): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = tparams,
      params = params,
      resultType = resultType
    )

  def createMockFunction(
    name: String,
    params: IArray[TsFunParam] = Empty,
    resultType: Option[TsType] = None,
    methodType: MethodType = MethodType.Normal
  ): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = methodType,
      signature = createFunSig(params, resultType),
      isStatic = false,
      isReadOnly = false
    )

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

  def createMockInterface(name: String, members: IArray[TsMember] = Empty, inheritance: IArray[TsTypeRef] = Empty): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = inheritance,
      members = members,
      codePath = CodePath.NoPath
    )

  def createMockClass(
    name: String,
    members: IArray[TsMember] = Empty,
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
      members = members,
      jsLocation = JsLocation.Zero,
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
    test("InferReturnTypes - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(InferReturnTypes.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsMemberFunction method") {
        val scope = createMockScope()
        val function = createMockFunction("testMethod")
        val result = InferReturnTypes.enterTsMemberFunction(scope)(function)
        assert(result != null)
        assert(result.isInstanceOf[TsMemberFunction])
      }

      test("leaves functions with return types unchanged") {
        val scope = createMockScope()
        val function = createMockFunction("testMethod", Empty, Some(TsTypeRef.string))
        
        val result = InferReturnTypes.enterTsMemberFunction(scope)(function)
        
        assert(result == function) // Should be unchanged
        assert(result.signature.resultType.isDefined)
        assert(result.signature.resultType.get == TsTypeRef.string)
      }

      test("leaves constructor functions unchanged") {
        val scope = createMockScope()
        val constructor = createMockFunction("constructor", Empty, None)
        
        val result = InferReturnTypes.enterTsMemberFunction(scope)(constructor)
        
        assert(result == constructor) // Should be unchanged
        assert(result.signature.resultType.isEmpty)
      }

      test("leaves functions without owner unchanged") {
        val scope = createMockScope()
        val function = createMockFunction("testMethod", Empty, None)
        
        val result = InferReturnTypes.enterTsMemberFunction(scope)(function)
        
        assert(result == function) // Should be unchanged since no owner in scope
        assert(result.signature.resultType.isEmpty)
      }
    }

    test("InferReturnTypes - Return Type Inference") {
      test("infers return type from parent interface") {
        val parentMethod = createMockFunction("testMethod", Empty, Some(TsTypeRef.string))
        val parentInterface = createMockInterface("ParentInterface", IArray(parentMethod))
        
        val childMethod = createMockFunction("testMethod", Empty, None) // No return type
        val childInterface = createMockInterface("ChildInterface", IArray(childMethod), IArray(createTypeRef("ParentInterface")))
        
        val scope = createMockScope(parentInterface, childInterface)
        val childScope = scope / childInterface
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should infer return type from parent
        assert(result.signature.resultType.isDefined)
        assert(result.signature.resultType.get == TsTypeRef.string)
      }

      test("infers return type from parent class") {
        val parentMethod = createMockFunction("testMethod", Empty, Some(TsTypeRef.number))
        val parentClass = createMockClass("ParentClass", IArray(parentMethod))
        
        val childMethod = createMockFunction("testMethod", Empty, None) // No return type
        val childClass = createMockClass("ChildClass", IArray(childMethod), Some(createTypeRef("ParentClass")))
        
        val scope = createMockScope(parentClass, childClass)
        val childScope = scope / childClass
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should infer return type from parent
        assert(result.signature.resultType.isDefined)
        assert(result.signature.resultType.get == TsTypeRef.number)
      }

      test("matches parameter count for inference") {
        val parentMethod1 = createMockFunction("testMethod", IArray(createFunParam("param1")), Some(TsTypeRef.string))
        val parentMethod2 = createMockFunction("testMethod", IArray(createFunParam("param1"), createFunParam("param2")), Some(TsTypeRef.number))
        val parentInterface = createMockInterface("ParentInterface", IArray(parentMethod1, parentMethod2))
        
        val childMethod = createMockFunction("testMethod", IArray(createFunParam("param1"), createFunParam("param2")), None)
        val childInterface = createMockInterface("ChildInterface", IArray(childMethod), IArray(createTypeRef("ParentInterface")))
        
        val scope = createMockScope(parentInterface, childInterface)
        val childScope = scope / childInterface
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should infer return type from method with matching parameter count
        assert(result.signature.resultType.isDefined)
        assert(result.signature.resultType.get == TsTypeRef.number)
      }

      test("does not infer from non-normal methods") {
        val parentGetter = createMockFunction("getValue", Empty, Some(TsTypeRef.string), MethodType.Getter)
        val parentInterface = createMockInterface("ParentInterface", IArray(parentGetter))
        
        val childMethod = createMockFunction("getValue", Empty, None) // Normal method, not getter
        val childInterface = createMockInterface("ChildInterface", IArray(childMethod), IArray(createTypeRef("ParentInterface")))
        
        val scope = createMockScope(parentInterface, childInterface)
        val childScope = scope / childInterface
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should not infer from getter to normal method
        assert(result.signature.resultType.isEmpty)
      }
    }

    test("InferReturnTypes - Multiple Inheritance") {
      test("infers from first matching parent") {
        val parent1Method = createMockFunction("testMethod", Empty, Some(TsTypeRef.string))
        val parent1Interface = createMockInterface("Parent1Interface", IArray(parent1Method))
        
        val parent2Method = createMockFunction("testMethod", Empty, Some(TsTypeRef.number))
        val parent2Interface = createMockInterface("Parent2Interface", IArray(parent2Method))
        
        val childMethod = createMockFunction("testMethod", Empty, None)
        val childInterface = createMockInterface("ChildInterface", IArray(childMethod), 
          IArray(createTypeRef("Parent1Interface"), createTypeRef("Parent2Interface")))
        
        val scope = createMockScope(parent1Interface, parent2Interface, childInterface)
        val childScope = scope / childInterface
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should infer from first matching parent
        assert(result.signature.resultType.isDefined)
        assert(result.signature.resultType.get == TsTypeRef.string)
      }

      test("handles inheritance chain") {
        val grandparentMethod = createMockFunction("testMethod", Empty, Some(TsTypeRef.boolean))
        val grandparentInterface = createMockInterface("GrandparentInterface", IArray(grandparentMethod))
        
        val parentInterface = createMockInterface("ParentInterface", Empty, IArray(createTypeRef("GrandparentInterface")))
        
        val childMethod = createMockFunction("testMethod", Empty, None)
        val childInterface = createMockInterface("ChildInterface", IArray(childMethod), IArray(createTypeRef("ParentInterface")))
        
        val scope = createMockScope(grandparentInterface, parentInterface, childInterface)
        val childScope = scope / childInterface
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should infer from grandparent through parent
        assert(result.signature.resultType.isDefined)
        assert(result.signature.resultType.get == TsTypeRef.boolean)
      }
    }

    test("InferReturnTypes - Edge Cases") {
      test("handles method not found in parents") {
        val parentMethod = createMockFunction("otherMethod", Empty, Some(TsTypeRef.string))
        val parentInterface = createMockInterface("ParentInterface", IArray(parentMethod))
        
        val childMethod = createMockFunction("testMethod", Empty, None) // Different method name
        val childInterface = createMockInterface("ChildInterface", IArray(childMethod), IArray(createTypeRef("ParentInterface")))
        
        val scope = createMockScope(parentInterface, childInterface)
        val childScope = scope / childInterface
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should not infer anything
        assert(result.signature.resultType.isEmpty)
      }

      test("handles parent without matching method signature") {
        val parentMethod = createMockFunction("testMethod", IArray(createFunParam("param1")), Some(TsTypeRef.string))
        val parentInterface = createMockInterface("ParentInterface", IArray(parentMethod))
        
        val childMethod = createMockFunction("testMethod", Empty, None) // Different parameter count
        val childInterface = createMockInterface("ChildInterface", IArray(childMethod), IArray(createTypeRef("ParentInterface")))
        
        val scope = createMockScope(parentInterface, childInterface)
        val childScope = scope / childInterface
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should not infer due to parameter count mismatch
        assert(result.signature.resultType.isEmpty)
      }

      test("handles non-existent parent") {
        val childMethod = createMockFunction("testMethod", Empty, None)
        val childInterface = createMockInterface("ChildInterface", IArray(childMethod), IArray(createTypeRef("NonExistentParent")))
        
        val scope = createMockScope(childInterface)
        val childScope = scope / childInterface
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should not infer anything
        assert(result.signature.resultType.isEmpty)
      }

      test("preserves function metadata") {
        val parentMethod = createMockFunction("testMethod", Empty, Some(TsTypeRef.string))
        val parentInterface = createMockInterface("ParentInterface", IArray(parentMethod))
        
        val originalComments = Comments(Comment("Method comment"))
        val childMethod = TsMemberFunction(
          comments = originalComments,
          level = TsProtectionLevel.Private,
          name = createSimpleIdent("testMethod"),
          methodType = MethodType.Normal,
          signature = createFunSig(Empty, None),
          isStatic = true,
          isReadOnly = true
        )
        val childInterface = createMockInterface("ChildInterface", IArray(childMethod), IArray(createTypeRef("ParentInterface")))
        
        val scope = createMockScope(parentInterface, childInterface)
        val childScope = scope / childInterface
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should preserve all metadata except add return type
        assert(result.comments == originalComments)
        assert(result.level == TsProtectionLevel.Private)
        assert(result.isStatic == true)
        assert(result.isReadOnly == true)
        assert(result.signature.resultType.isDefined)
        assert(result.signature.resultType.get == TsTypeRef.string)
      }
    }

    test("InferReturnTypes - Integration Scenarios") {
      test("complex inheritance with mixed classes and interfaces") {
        val baseMethod = createMockFunction("process", IArray(createFunParam("data")), Some(TsTypeRef.string))
        val baseInterface = createMockInterface("BaseInterface", IArray(baseMethod))
        
        val middleClass = createMockClass("MiddleClass", Empty, None, IArray(createTypeRef("BaseInterface")))
        
        val childMethod = createMockFunction("process", IArray(createFunParam("data")), None)
        val childClass = createMockClass("ChildClass", IArray(childMethod), Some(createTypeRef("MiddleClass")))
        
        val scope = createMockScope(baseInterface, middleClass, childClass)
        val childScope = scope / childClass
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should infer through the inheritance chain
        assert(result.signature.resultType.isDefined)
        assert(result.signature.resultType.get == TsTypeRef.string)
      }

      test("handles overloaded methods") {
        val parentMethod1 = createMockFunction("testMethod", Empty, Some(TsTypeRef.string))
        val parentMethod2 = createMockFunction("testMethod", IArray(createFunParam("param")), Some(TsTypeRef.number))
        val parentInterface = createMockInterface("ParentInterface", IArray(parentMethod1, parentMethod2))
        
        val childMethod = createMockFunction("testMethod", Empty, None) // Matches first overload
        val childInterface = createMockInterface("ChildInterface", IArray(childMethod), IArray(createTypeRef("ParentInterface")))
        
        val scope = createMockScope(parentInterface, childInterface)
        val childScope = scope / childInterface
        
        val result = InferReturnTypes.enterTsMemberFunction(childScope)(childMethod)
        
        // Should infer from matching overload
        assert(result.signature.resultType.isDefined)
        assert(result.signature.resultType.get == TsTypeRef.string)
      }
    }
  }
}
