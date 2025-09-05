package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object ExpandTypeParamsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createTypeParam(
    name: String,
    upperBound: Option[TsType] = None,
    default: Option[TsType] = None
  ): TsTypeParam =
    TsTypeParam(
      comments = NoComments,
      name = createSimpleIdent(name),
      upperBound = upperBound,
      default = default
    )

  def createFunParam(name: String, tpe: Option[TsType] = Some(TsTypeRef.string)): TsFunParam =
    TsFunParam(
      comments = NoComments,
      name = createSimpleIdent(name),
      tpe = tpe
    )

  def createFunSig(
    tparams: IArray[TsTypeParam] = Empty,
    params: IArray[TsFunParam] = Empty,
    resultType: Option[TsType] = Some(TsTypeRef.void)
  ): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = tparams,
      params = params,
      resultType = resultType
    )

  def createMockCall(signature: TsFunSig): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = signature
    )

  def createMockFunction(name: String, signature: TsFunSig): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = signature,
      isStatic = false,
      isReadOnly = false
    )

  def createMockDeclFunction(name: String, signature: TsFunSig): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = signature,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
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
    test("ExpandTypeParams - Basic Functionality") {
      test("extends TransformMembers and TransformClassMembers") {
        assert(ExpandTypeParams.isInstanceOf[TransformMembers])
        assert(ExpandTypeParams.isInstanceOf[TransformClassMembers])
      }

      test("has newClassMembers method") {
        val scope = createMockScope()
        val interface = createMockInterface("test")
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        assert(result != null)
      }

      test("has newMembers method") {
        val scope = createMockScope()
        val parsedFile = TsParsedFile(NoComments, Empty, Empty, CodePath.NoPath)
        val result = ExpandTypeParams.newMembers(scope, parsedFile)
        assert(result != null)
      }

      test("leaves non-expandable members unchanged") {
        val scope = createMockScope()
        val sig = createFunSig()
        val method = createMockFunction("testMethod", sig)
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(method))
      }
    }

    test("ExpandTypeParams - KeyOf Expansion") {
      test("expands keyof type parameters") {
        val propA = createMockProperty("a", Some(TsTypeRef.number))
        val propB = createMockProperty("b", Some(TsTypeRef.string))
        val targetInterface = createMockInterface("Target", IArray(propA, propB))
        val scope = createMockScope(targetInterface)
        
        val keyOfBound = TsTypeKeyOf(createTypeRef("Target"))
        val typeParam = createTypeParam("K", Some(keyOfBound))
        val param1 = createFunParam("key", Some(createTypeRef("K")))
        val param2 = createFunParam("value", Some(TsTypeLookup(createTypeRef("Target"), createTypeRef("K"))))
        val sig = createFunSig(IArray(typeParam), IArray(param1, param2), Some(TsTypeRef.void))
        val method = createMockFunction("testMethod", sig)
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        // Should expand into multiple methods for each property
        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
        
        val methods = result.map(_.asInstanceOf[TsMemberFunction])
        assert(methods.forall(_.name.value == "testMethod"))
        assert(methods.forall(_.signature.tparams.isEmpty)) // Type parameters should be removed
      }

      test("handles keyof with type lookup") {
        val propName = createMockProperty("name", Some(TsTypeRef.string))
        val propAge = createMockProperty("age", Some(TsTypeRef.number))
        val targetInterface = createMockInterface("Person", IArray(propName, propAge))
        val scope = createMockScope(targetInterface)
        
        val keyOfBound = TsTypeKeyOf(createTypeRef("Person"))
        val typeParam = createTypeParam("K", Some(keyOfBound))
        val param1 = createFunParam("key", Some(createTypeRef("K")))
        val param2 = createFunParam("value", Some(TsTypeLookup(createTypeRef("Person"), createTypeRef("K"))))
        val sig = createFunSig(IArray(typeParam), IArray(param1, param2))
        val call = createMockCall(sig)
        val interface = createMockInterface("test", IArray(call))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        assert(result.length == 2) // One for each property
        assert(result.forall(_.isInstanceOf[TsMemberCall]))
      }
    }

    test("ExpandTypeParams - Union Type Expansion") {
      test("expands union type parameters") {
        val interface1 = createMockInterface("TypeA")
        val interface2 = createMockInterface("TypeB")
        val scope = createMockScope(interface1, interface2)
        
        val unionBound = TsTypeUnion(IArray(createTypeRef("TypeA"), createTypeRef("TypeB")))
        val typeParam = createTypeParam("T", Some(unionBound))
        val param = createFunParam("value", Some(createTypeRef("T")))
        val sig = createFunSig(IArray(typeParam), IArray(param))
        val method = createMockFunction("testMethod", sig)
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        // Should expand into multiple methods for each union member
        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
        
        val methods = result.map(_.asInstanceOf[TsMemberFunction])
        assert(methods.forall(_.name.value == "testMethod"))
      }

      test("handles mixed keyof and union bounds") {
        val propA = createMockProperty("a")
        val targetInterface = createMockInterface("Target", IArray(propA))
        val otherInterface = createMockInterface("Other")
        val scope = createMockScope(targetInterface, otherInterface)
        
        val keyOfType = TsTypeKeyOf(createTypeRef("Target"))
        val unionBound = TsTypeUnion(IArray(keyOfType, createTypeRef("Other")))
        val typeParam = createTypeParam("T", Some(unionBound))
        val param = createFunParam("value", Some(createTypeRef("T")))
        val sig = createFunSig(IArray(typeParam), IArray(param))
        val method = createMockFunction("testMethod", sig)
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
      }
    }

    test("ExpandTypeParams - Function Declaration Expansion") {
      test("expands function declarations with type parameters") {
        val interface1 = createMockInterface("TypeA")
        val interface2 = createMockInterface("TypeB")
        val scope = createMockScope(interface1, interface2)
        
        val unionBound = TsTypeUnion(IArray(createTypeRef("TypeA"), createTypeRef("TypeB")))
        val typeParam = createTypeParam("T", Some(unionBound))
        val param = createFunParam("value", Some(createTypeRef("T")))
        val sig = createFunSig(IArray(typeParam), IArray(param))
        val funcDecl = createMockDeclFunction("testFunction", sig)
        
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(funcDecl), CodePath.NoPath)
        val result = ExpandTypeParams.newMembers(scope, parsedFile)
        
        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsDeclFunction]))
        
        val functions = result.map(_.asInstanceOf[TsDeclFunction])
        assert(functions.forall(_.name.value == "testFunction"))
      }

      test("leaves non-expandable function declarations unchanged") {
        val scope = createMockScope()
        val sig = createFunSig()
        val funcDecl = createMockDeclFunction("simpleFunction", sig)
        
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(funcDecl), CodePath.NoPath)
        val result = ExpandTypeParams.newMembers(scope, parsedFile)
        
        assert(result.length == 1)
        assert(result.contains(funcDecl))
      }
    }

    test("ExpandTypeParams - Edge Cases") {
      test("handles empty type parameter bounds") {
        val scope = createMockScope()
        val typeParam = createTypeParam("T") // No upper bound
        val param = createFunParam("value", Some(createTypeRef("T")))
        val sig = createFunSig(IArray(typeParam), IArray(param))
        val method = createMockFunction("testMethod", sig)
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        // Should not expand since no upper bound
        assert(result.length == 1)
        assert(result.contains(method))
      }

      test("handles type parameters not used in parameters") {
        val scope = createMockScope()
        val unionBound = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))
        val typeParam = createTypeParam("T", Some(unionBound))
        val param = createFunParam("value", Some(TsTypeRef.string)) // Not using T
        val sig = createFunSig(IArray(typeParam), IArray(param))
        val method = createMockFunction("testMethod", sig)
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        // Should not expand since T is not used in parameters
        assert(result.length == 1)
        assert(result.contains(method))
      }

      test("handles circular type references") {
        val scope = createMockScope()
        val selfRef = createTypeRef("T")
        val unionBound = TsTypeUnion(IArray(selfRef, TsTypeRef.string))
        val typeParam = createTypeParam("T", Some(unionBound))
        val param = createFunParam("value", Some(createTypeRef("T")))
        val sig = createFunSig(IArray(typeParam), IArray(param))
        val method = createMockFunction("testMethod", sig)
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        // Should handle circular references gracefully
        assert(result.nonEmpty)
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
      }

      test("handles expansion limit") {
        val scope = createMockScope()
        
        // Create a large union type that would exceed the 200 expansion limit
        val manyTypes = (1 to 250).map(i => createTypeRef(s"Type$i")).toArray
        val largeBound = TsTypeUnion(IArray.fromTraversable(manyTypes))
        val typeParam = createTypeParam("T", Some(largeBound))
        val param = createFunParam("value", Some(createTypeRef("T")))
        val sig = createFunSig(IArray(typeParam), IArray(param))
        val method = createMockFunction("testMethod", sig)
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        // Should not expand due to limit
        assert(result.length == 1)
        assert(result.contains(method))
      }

      test("handles non-normal method types") {
        val scope = createMockScope()
        val unionBound = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))
        val typeParam = createTypeParam("T", Some(unionBound))
        val param = createFunParam("value", Some(createTypeRef("T")))
        val sig = createFunSig(IArray(typeParam), IArray(param))
        val getter = TsMemberFunction(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = createSimpleIdent("getter"),
          methodType = MethodType.Getter,
          signature = sig,
          isStatic = false,
          isReadOnly = false
        )
        val interface = createMockInterface("test", IArray(getter))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        // Should not expand non-normal methods
        assert(result.length == 1)
        assert(result.contains(getter))
      }
    }

    test("ExpandTypeParams - Integration Scenarios") {
      test("handles complex keyof scenarios") {
        val propX = createMockProperty("x", Some(TsTypeRef.number))
        val propY = createMockProperty("y", Some(TsTypeRef.string))
        val propZ = createMockProperty("z", Some(TsTypeRef.boolean))
        val targetInterface = createMockInterface("ComplexTarget", IArray(propX, propY, propZ))
        val scope = createMockScope(targetInterface)
        
        val keyOfBound = TsTypeKeyOf(createTypeRef("ComplexTarget"))
        val typeParam = createTypeParam("K", Some(keyOfBound))
        val param1 = createFunParam("key", Some(createTypeRef("K")))
        val param2 = createFunParam("value", Some(TsTypeLookup(createTypeRef("ComplexTarget"), createTypeRef("K"))))
        val sig = createFunSig(IArray(typeParam), IArray(param1, param2))
        val method = createMockFunction("complexMethod", sig)
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        assert(result.length == 3) // One for each property
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
        
        val methods = result.map(_.asInstanceOf[TsMemberFunction])
        assert(methods.forall(_.name.value == "complexMethod"))
        assert(methods.forall(_.signature.tparams.isEmpty))
      }

      test("preserves comments and other properties") {
        val scope = createMockScope()
        val unionBound = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))
        val typeParam = createTypeParam("T", Some(unionBound))
        val param = createFunParam("value", Some(createTypeRef("T")))
        val sig = createFunSig(IArray(typeParam), IArray(param))
        
        val originalComments = Comments(Comment("test comment"))
        val method = TsMemberFunction(
          comments = originalComments,
          level = TsProtectionLevel.Private,
          name = createSimpleIdent("testMethod"),
          methodType = MethodType.Normal,
          signature = sig,
          isStatic = true,
          isReadOnly = true
        )
        val interface = createMockInterface("test", IArray(method))
        
        val result = ExpandTypeParams.newClassMembers(scope, interface)
        
        assert(result.length > 1)
        assert(result.forall(_.isInstanceOf[TsMemberFunction]))
        
        val methods = result.map(_.asInstanceOf[TsMemberFunction])
        // First method should preserve original comments, others should have reduced comments
        assert(methods.head.comments.cs.nonEmpty)
        assert(methods.forall(_.level == TsProtectionLevel.Private))
        assert(methods.forall(_.isStatic == true))
        assert(methods.forall(_.isReadOnly == true))
      }
    }
  }
}
