package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object ForwardCtorsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createTypeParam(name: String): TsTypeParam =
    TsTypeParam(
      comments = NoComments,
      name = createSimpleIdent(name),
      upperBound = None,
      default = None
    )

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

  def createMockCtor(params: IArray[TsFunParam] = Empty): TsMemberCtor =
    TsMemberCtor(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = createFunSig(params)
    )

  def createMockFunction(name: String, params: IArray[TsFunParam] = Empty): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = createFunSig(params),
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

  def createMockClass(
    name: String,
    members: IArray[TsMember] = Empty,
    parent: Option[TsTypeRef] = None,
    tparams: IArray[TsTypeParam] = Empty
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      parent = parent,
      implements = Empty,
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
    test("ForwardCtors - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(ForwardCtors.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsDeclClass method") {
        val scope = createMockScope()
        val clazz = createMockClass("TestClass")
        val result = ForwardCtors.enterTsDeclClass(scope)(clazz)
        assert(result != null)
        assert(result.isInstanceOf[TsDeclClass])
      }

      test("leaves classes with constructors unchanged") {
        val scope = createMockScope()
        val ctor = createMockCtor(IArray(createFunParam("value")))
        val clazz = createMockClass("TestClass", IArray(ctor))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(clazz)
        
        assert(result == clazz) // Should be unchanged
        assert(result.members.length == 1)
        assert(result.members.head.isInstanceOf[TsMemberCtor])
      }

      test("leaves classes without parent unchanged") {
        val scope = createMockScope()
        val prop = createMockProperty("value")
        val clazz = createMockClass("TestClass", IArray(prop))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(clazz)
        
        assert(result == clazz) // Should be unchanged
        assert(result.members.length == 1)
        assert(result.members.head.isInstanceOf[TsMemberProperty])
      }
    }

    test("ForwardCtors - Constructor Forwarding") {
      test("forwards constructors from parent class") {
        val parentCtor = createMockCtor(IArray(createFunParam("value", Some(TsTypeRef.string))))
        val parentClass = createMockClass("ParentClass", IArray(parentCtor))
        val scope = createMockScope(parentClass)
        
        val childClass = createMockClass("ChildClass", Empty, Some(createTypeRef("ParentClass")))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(childClass)
        
        // Should forward the constructor from parent
        assert(result.members.length == 1)
        assert(result.members.head.isInstanceOf[TsMemberCtor])
        val forwardedCtor = result.members.head.asInstanceOf[TsMemberCtor]
        assert(forwardedCtor.signature.params.length == 1)
        assert(forwardedCtor.signature.params.head.name.value == "value")
      }

      test("forwards multiple constructors from parent") {
        val ctor1 = createMockCtor(IArray(createFunParam("value", Some(TsTypeRef.string))))
        val ctor2 = createMockCtor(IArray(createFunParam("num", Some(TsTypeRef.number))))
        val parentClass = createMockClass("ParentClass", IArray(ctor1, ctor2))
        val scope = createMockScope(parentClass)
        
        val childClass = createMockClass("ChildClass", Empty, Some(createTypeRef("ParentClass")))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(childClass)
        
        // Should forward both constructors from parent
        assert(result.members.length == 2)
        assert(result.members.forall(_.isInstanceOf[TsMemberCtor]))
        val ctors = result.members.map(_.asInstanceOf[TsMemberCtor])
        assert(ctors.exists(_.signature.params.head.name.value == "value"))
        assert(ctors.exists(_.signature.params.head.name.value == "num"))
      }

      test("preserves existing members when forwarding constructors") {
        val parentCtor = createMockCtor(IArray(createFunParam("value")))
        val parentClass = createMockClass("ParentClass", IArray(parentCtor))
        val scope = createMockScope(parentClass)
        
        val existingMethod = createMockFunction("method")
        val childClass = createMockClass("ChildClass", IArray(existingMethod), Some(createTypeRef("ParentClass")))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(childClass)
        
        // Should have both existing method and forwarded constructor
        assert(result.members.length == 2)
        assert(result.members.exists(_.isInstanceOf[TsMemberFunction]))
        assert(result.members.exists(_.isInstanceOf[TsMemberCtor]))
      }

      test("handles inheritance chain") {
        val grandparentCtor = createMockCtor(IArray(createFunParam("value")))
        val grandparentClass = createMockClass("GrandparentClass", IArray(grandparentCtor))
        
        val parentClass = createMockClass("ParentClass", Empty, Some(createTypeRef("GrandparentClass")))
        val scope = createMockScope(grandparentClass, parentClass)
        
        val childClass = createMockClass("ChildClass", Empty, Some(createTypeRef("ParentClass")))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(childClass)
        
        // Should forward constructor from grandparent through parent
        assert(result.members.length == 1)
        assert(result.members.head.isInstanceOf[TsMemberCtor])
      }
    }

    test("ForwardCtors - Type Parameters") {
      test("handles parent with type parameters") {
        val typeParam = createTypeParam("T")
        val parentCtor = createMockCtor(IArray(createFunParam("value", Some(createTypeRef("T")))))
        val parentClass = createMockClass("ParentClass", IArray(parentCtor), None, IArray(typeParam))
        val scope = createMockScope(parentClass)
        
        val childClass = createMockClass("ChildClass", Empty, Some(createTypeRef("ParentClass", IArray(TsTypeRef.string))))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(childClass)
        
        // Should forward constructor with type parameters filled in
        assert(result.members.length == 1)
        assert(result.members.head.isInstanceOf[TsMemberCtor])
      }

      test("handles child with type parameters") {
        val parentCtor = createMockCtor(IArray(createFunParam("value")))
        val parentClass = createMockClass("ParentClass", IArray(parentCtor))
        val scope = createMockScope(parentClass)
        
        val childTypeParam = createTypeParam("U")
        val childClass = createMockClass("ChildClass", Empty, Some(createTypeRef("ParentClass")), IArray(childTypeParam))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(childClass)
        
        // Should forward constructor while preserving child's type parameters
        assert(result.members.length == 1)
        assert(result.members.head.isInstanceOf[TsMemberCtor])
        assert(result.tparams.length == 1)
        assert(result.tparams.head.name.value == "U")
      }
    }

    test("ForwardCtors - Edge Cases") {
      test("handles non-existent parent class") {
        val scope = createMockScope()
        val childClass = createMockClass("ChildClass", Empty, Some(createTypeRef("NonExistentParent")))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(childClass)
        
        // Should leave class unchanged when parent doesn't exist
        assert(result == childClass)
        assert(result.members.isEmpty)
      }

      test("handles parent without constructors") {
        val parentMethod = createMockFunction("method")
        val parentClass = createMockClass("ParentClass", IArray(parentMethod))
        val scope = createMockScope(parentClass)
        
        val childClass = createMockClass("ChildClass", Empty, Some(createTypeRef("ParentClass")))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(childClass)
        
        // Should leave class unchanged when parent has no constructors
        assert(result == childClass)
        assert(result.members.isEmpty)
      }

      test("handles circular inheritance") {
        val classA = createMockClass("ClassA", Empty, Some(createTypeRef("ClassB")))
        val classB = createMockClass("ClassB", Empty, Some(createTypeRef("ClassA")))
        val scope = createMockScope(classA, classB)
        
        val result = ForwardCtors.enterTsDeclClass(scope)(classA)
        
        // Should handle circular inheritance gracefully
        assert(result.members.isEmpty)
      }

      test("handles self-referencing inheritance") {
        val selfRefClass = createMockClass("SelfRef", Empty, Some(createTypeRef("SelfRef")))
        val scope = createMockScope(selfRefClass)
        
        val result = ForwardCtors.enterTsDeclClass(scope)(selfRefClass)
        
        // Should handle self-reference gracefully
        assert(result.members.isEmpty)
      }

      test("preserves constructor comments and metadata") {
        val originalComments = Comments(Comment("Constructor comment"))
        val parentCtor = TsMemberCtor(
          comments = originalComments,
          level = TsProtectionLevel.Private,
          signature = createFunSig(IArray(createFunParam("value")))
        )
        val parentClass = createMockClass("ParentClass", IArray(parentCtor))
        val scope = createMockScope(parentClass)
        
        val childClass = createMockClass("ChildClass", Empty, Some(createTypeRef("ParentClass")))
        
        val result = ForwardCtors.enterTsDeclClass(scope)(childClass)
        
        // Should preserve constructor metadata
        assert(result.members.length == 1)
        val forwardedCtor = result.members.head.asInstanceOf[TsMemberCtor]
        assert(forwardedCtor.comments.cs.nonEmpty)
        assert(forwardedCtor.level == TsProtectionLevel.Private)
      }
    }

    test("ForwardCtors - Integration Scenarios") {
      test("complex inheritance hierarchy") {
        val baseCtor = createMockCtor(IArray(createFunParam("base")))
        val baseClass = createMockClass("BaseClass", IArray(baseCtor))
        
        val middleCtor = createMockCtor(IArray(createFunParam("middle")))
        val middleClass = createMockClass("MiddleClass", IArray(middleCtor), Some(createTypeRef("BaseClass")))
        
        val topClass = createMockClass("TopClass", Empty, Some(createTypeRef("MiddleClass")))
        val scope = createMockScope(baseClass, middleClass)
        
        val result = ForwardCtors.enterTsDeclClass(scope)(topClass)
        
        // Should forward constructor from immediate parent (MiddleClass)
        assert(result.members.length == 1)
        val forwardedCtor = result.members.head.asInstanceOf[TsMemberCtor]
        assert(forwardedCtor.signature.params.head.name.value == "middle")
      }

      test("multiple inheritance levels with mixed constructors") {
        val level1Ctor = createMockCtor(IArray(createFunParam("level1")))
        val level1Class = createMockClass("Level1", IArray(level1Ctor))
        
        val level2Method = createMockFunction("method")
        val level2Class = createMockClass("Level2", IArray(level2Method), Some(createTypeRef("Level1")))
        
        val level3Class = createMockClass("Level3", Empty, Some(createTypeRef("Level2")))
        val scope = createMockScope(level1Class, level2Class)
        
        val result = ForwardCtors.enterTsDeclClass(scope)(level3Class)
        
        // Should find constructor from Level1 through Level2
        assert(result.members.length == 1)
        val forwardedCtor = result.members.head.asInstanceOf[TsMemberCtor]
        assert(forwardedCtor.signature.params.head.name.value == "level1")
      }
    }
  }
}
