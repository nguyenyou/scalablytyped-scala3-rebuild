package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object RewriteTypeThisTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createTypeThis(): TsTypeThis = TsTypeThis()

  def createMockClass(
    name: String,
    members: IArray[TsMember] = Empty,
    tparams: IArray[TsTypeParam] = Empty
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      parent = None,
      implements = Empty,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockInterface(
    name: String,
    members: IArray[TsMember] = Empty,
    tparams: IArray[TsTypeParam] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      inheritance = Empty,
      members = members,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createTypeParam(name: String): TsTypeParam =
    TsTypeParam(NoComments, createSimpleIdent(name), None, None)

  def createMemberFunction(
    name: String,
    returnType: TsType = createTypeRef("void"),
    isStatic: Boolean = false
  ): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(NoComments, Empty, Empty, Some(returnType)),
      isStatic = isStatic,
      isReadOnly = false
    )

  def createMemberCtor(): TsMemberCtor =
    TsMemberCtor(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(NoComments, Empty, Empty, None)
    )

  def createMemberIndex(): TsMemberIndex =
    TsMemberIndex(
      comments = NoComments,
      isReadOnly = false,
      level = TsProtectionLevel.Default,
      indexing = Indexing.Dict(createSimpleIdent("key"), createTypeRef("string")),
      valueType = Some(createTypeRef("any"))
    )

  def createTypeFunction(returnType: TsType = createTypeRef("void")): TsTypeFunction =
    TsTypeFunction(TsFunSig(NoComments, Empty, Empty, Some(returnType)))

  def createTypeConstructor(): TsTypeConstructor =
    TsTypeConstructor(
      isAbstract = false,
      TsTypeFunction(TsFunSig(NoComments, Empty, Empty, Some(createTypeRef("void"))))
    )

  def createTypeLookup(from: TsType = createTypeRef("TestType"), key: TsType = createTypeRef("string")): TsTypeLookup =
    TsTypeLookup(from, key)

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
    test("RewriteTypeThis - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(RewriteTypeThis.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsType method") {
        val scope = createMockScope()
        val typeRef = createTypeRef("string")
        val result = RewriteTypeThis.enterTsType(scope)(typeRef)
        assert(result != null)
        assert(result.isInstanceOf[TsType])
      }
    }

    test("RewriteTypeThis - Type Reference to This Conversion") {
      test("converts self-reference in function to TsTypeThis") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)
        
        // Create a function type that references the class
        val functionType = createTypeFunction(createTypeRef("TestClass"))
        val classWithFunction = clazz.copy(members = IArray(
          createMemberFunction("method", functionType)
        ))
        
        // Simulate being inside the function when processing the type reference
        val scopeWithClass = scope / classWithFunction
        val scopeWithFunction = scopeWithClass / functionType
        val selfRef = createTypeRef("TestClass")

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(selfRef)
        
        assert(result.isInstanceOf[TsTypeThis])
      }

      test("converts self-reference in interface function to TsTypeThis") {
        val interface = createMockInterface("TestInterface")
        val scope = createMockScope(interface)
        
        val functionType = createTypeFunction(createTypeRef("TestInterface"))
        val interfaceWithFunction = interface.copy(members = IArray(
          createMemberFunction("method", functionType)
        ))
        
        val scopeWithInterface = scope / interfaceWithFunction
        val scopeWithFunction = scopeWithInterface / functionType
        val selfRef = createTypeRef("TestInterface")

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(selfRef)
        
        assert(result.isInstanceOf[TsTypeThis])
      }

      test("does not convert self-reference with type parameters") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)
        
        val functionType = createTypeFunction()
        val scopeWithClass = scope / clazz
        val scopeWithFunction = scopeWithClass / functionType
        val selfRefWithTParams = createTypeRef("TestClass", IArray(createTypeRef("string")))

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(selfRefWithTParams)
        
        assert(result == selfRefWithTParams) // Should remain unchanged
      }

      test("does not convert non-self-reference") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)
        
        val functionType = createTypeFunction()
        val scopeWithClass = scope / clazz
        val scopeWithFunction = scopeWithClass / functionType
        val otherRef = createTypeRef("OtherClass")

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(otherRef)
        
        assert(result == otherRef) // Should remain unchanged
      }

      test("does not convert when not in function") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)
        
        val scopeWithClass = scope / clazz
        val selfRef = createTypeRef("TestClass")

        val result = RewriteTypeThis.enterTsType(scopeWithClass)(selfRef)
        
        assert(result == selfRef) // Should remain unchanged
      }

      test("does not convert when in constructor") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)
        
        val functionType = createTypeFunction()
        val constructor = createMemberCtor()
        val scopeWithClass = scope / clazz
        val scopeWithConstructor = scopeWithClass / constructor
        val scopeWithFunction = scopeWithConstructor / functionType
        val selfRef = createTypeRef("TestClass")

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(selfRef)
        
        assert(result == selfRef) // Should remain unchanged
      }

      test("does not convert when in index type") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)
        
        val functionType = createTypeFunction()
        val indexMember = createMemberIndex()
        val scopeWithClass = scope / clazz
        val scopeWithIndex = scopeWithClass / indexMember
        val scopeWithFunction = scopeWithIndex / functionType
        val selfRef = createTypeRef("TestClass")

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(selfRef)
        
        assert(result == selfRef) // Should remain unchanged
      }

      test("does not convert when in type lookup") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)
        
        val functionType = createTypeFunction()
        val typeLookup = createTypeLookup()
        val scopeWithClass = scope / clazz
        val scopeWithLookup = scopeWithClass / typeLookup
        val scopeWithFunction = scopeWithLookup / functionType
        val selfRef = createTypeRef("TestClass")

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(selfRef)
        
        assert(result == selfRef) // Should remain unchanged
      }
    }

    test("RewriteTypeThis - TsTypeThis to Type Reference Conversion") {
      test("converts TsTypeThis to class reference in constructor") {
        val tparam = createTypeParam("T")
        val clazz = createMockClass("TestClass", Empty, IArray(tparam))
        val scope = createMockScope(clazz)
        
        val constructor = createMemberCtor()
        val scopeWithClass = scope / clazz
        val scopeWithConstructor = scopeWithClass / constructor
        val thisType = createTypeThis()

        val result = RewriteTypeThis.enterTsType(scopeWithConstructor)(thisType)
        
        assert(result.isInstanceOf[TsTypeRef])
        val typeRef = result.asInstanceOf[TsTypeRef]
        assert(typeRef.name.parts.last.value == "TestClass")
        assert(typeRef.tparams.length == 1) // Should include type parameters
      }

      test("converts TsTypeThis to interface reference in constructor") {
        val tparam = createTypeParam("T")
        val interface = createMockInterface("TestInterface", Empty, IArray(tparam))
        val scope = createMockScope(interface)
        
        val constructor = createMemberCtor()
        val scopeWithInterface = scope / interface
        val scopeWithConstructor = scopeWithInterface / constructor
        val thisType = createTypeThis()

        val result = RewriteTypeThis.enterTsType(scopeWithConstructor)(thisType)
        
        assert(result.isInstanceOf[TsTypeRef])
        val typeRef = result.asInstanceOf[TsTypeRef]
        assert(typeRef.name.parts.last.value == "TestInterface")
        assert(typeRef.tparams.length == 1) // Should include type parameters
      }

      test("converts TsTypeThis to class reference in index type") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)
        
        val indexMember = createMemberIndex()
        val scopeWithClass = scope / clazz
        val scopeWithIndex = scopeWithClass / indexMember
        val thisType = createTypeThis()

        val result = RewriteTypeThis.enterTsType(scopeWithIndex)(thisType)
        
        assert(result.isInstanceOf[TsTypeRef])
        val typeRef = result.asInstanceOf[TsTypeRef]
        assert(typeRef.name.parts.last.value == "TestClass")
      }

      test("leaves TsTypeThis unchanged when not in constructor or index type") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)
        
        val functionType = createTypeFunction()
        val scopeWithClass = scope / clazz
        val scopeWithFunction = scopeWithClass / functionType
        val thisType = createTypeThis()

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(thisType)
        
        assert(result == thisType) // Should remain unchanged
      }

      test("leaves TsTypeThis unchanged when no owner found") {
        val scope = createMockScope()
        
        val constructor = createMemberCtor()
        val scopeWithConstructor = scope / constructor
        val thisType = createTypeThis()

        val result = RewriteTypeThis.enterTsType(scopeWithConstructor)(thisType)
        
        assert(result == thisType) // Should remain unchanged
      }
    }



    test("RewriteTypeThis - Edge Cases") {
      test("handles qualified names correctly") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)

        val functionType = createTypeFunction()
        val scopeWithClass = scope / clazz
        val scopeWithFunction = scopeWithClass / functionType
        val qualifiedRef = TsTypeRef(NoComments, createQIdent("lib", "TestClass"), Empty)

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(qualifiedRef)

        // Should convert to this because the last part matches
        assert(result.isInstanceOf[TsTypeThis])
      }

      test("handles nested class structures") {
        val outerClass = createMockClass("OuterClass")
        val innerClass = createMockClass("InnerClass")
        val scope = createMockScope(outerClass, innerClass)

        val functionType = createTypeFunction()
        val scopeWithOuter = scope / outerClass
        val scopeWithInner = scopeWithOuter / innerClass
        val scopeWithFunction = scopeWithInner / functionType
        val innerRef = createTypeRef("InnerClass")

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(innerRef)

        // Should convert to this because InnerClass is in the stack
        assert(result.isInstanceOf[TsTypeThis])
      }

      test("prioritizes closest owner in stack") {
        val outerClass = createMockClass("TestClass")
        val innerClass = createMockClass("TestClass") // Same name
        val scope = createMockScope(outerClass, innerClass)

        val constructor = createMemberCtor()
        val scopeWithOuter = scope / outerClass
        val scopeWithInner = scopeWithOuter / innerClass
        val scopeWithConstructor = scopeWithInner / constructor
        val thisType = createTypeThis()

        val result = RewriteTypeThis.enterTsType(scopeWithConstructor)(thisType)

        assert(result.isInstanceOf[TsTypeRef])
        // Should reference the inner class (closest in stack)
      }

      test("handles empty stack gracefully") {
        val scope = createMockScope()
        // Empty stack is just the root scope
        val selfRef = createTypeRef("TestClass")

        val result = RewriteTypeThis.enterTsType(scope)(selfRef)

        assert(result == selfRef) // Should remain unchanged
      }

      test("handles complex type parameters") {
        val tparam1 = createTypeParam("T")
        val tparam2 = createTypeParam("U")
        val clazz = createMockClass("TestClass", Empty, IArray(tparam1, tparam2))
        val scope = createMockScope(clazz)

        val constructor = createMemberCtor()
        val scopeWithClass = scope / clazz
        val scopeWithConstructor = scopeWithClass / constructor
        val thisType = createTypeThis()

        val result = RewriteTypeThis.enterTsType(scopeWithConstructor)(thisType)

        assert(result.isInstanceOf[TsTypeRef])
        val typeRef = result.asInstanceOf[TsTypeRef]
        assert(typeRef.tparams.length == 2) // Should include all type parameters
      }

      test("handles multiple context conditions") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)

        // Multiple conditions that should prevent conversion
        val functionType = createTypeFunction()
        val typeLookup = createTypeLookup()
        val indexMember = createMemberIndex()
        val scopeWithClass = scope / clazz
        val scopeWithIndex = scopeWithClass / indexMember
        val scopeWithLookup = scopeWithIndex / typeLookup
        val scopeWithFunction = scopeWithLookup / functionType
        val selfRef = createTypeRef("TestClass")

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(selfRef)

        // Should not convert because of type lookup and index type
        assert(result == selfRef)
      }

      test("handles constructor function vs member constructor") {
        val clazz = createMockClass("TestClass")
        val scope = createMockScope(clazz)

        // Test with constructor function
        val constructorFunc = createMemberFunction("constructor")
        val scopeWithClass1 = scope / clazz
        val scopeWithConstructorFunc = scopeWithClass1 / constructorFunc
        val thisType1 = createTypeThis()

        val result1 = RewriteTypeThis.enterTsType(scopeWithConstructorFunc)(thisType1)
        assert(result1.isInstanceOf[TsTypeRef])

        // Test with member constructor
        val memberCtor = createMemberCtor()
        val scopeWithClass2 = scope / clazz
        val scopeWithMemberCtor = scopeWithClass2 / memberCtor
        val thisType2 = createTypeThis()

        val result2 = RewriteTypeThis.enterTsType(scopeWithMemberCtor)(thisType2)
        assert(result2.isInstanceOf[TsTypeRef])
      }
    }

    test("RewriteTypeThis - Integration Scenarios") {
      test("handles real-world class method scenario") {
        // Simulate: class MyClass { method(): MyClass { return this; } }
        val clazz = createMockClass("MyClass")
        val scope = createMockScope(clazz)

        val methodReturnType = createTypeRef("MyClass")
        val functionType = createTypeFunction(methodReturnType)
        val method = createMemberFunction("method", functionType)
        val classWithMethod = clazz.copy(members = IArray(method))

        val scopeWithClass = scope / classWithMethod
        val scopeWithMethod = scopeWithClass / method
        val scopeWithFunction = scopeWithMethod / functionType

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(methodReturnType)

        // Should convert the return type reference to this
        assert(result.isInstanceOf[TsTypeThis])
      }

      test("handles interface method scenario") {
        // Simulate: interface MyInterface { method(): MyInterface; }
        val interface = createMockInterface("MyInterface")
        val scope = createMockScope(interface)

        val methodReturnType = createTypeRef("MyInterface")
        val functionType = createTypeFunction(methodReturnType)
        val method = createMemberFunction("method", functionType)
        val interfaceWithMethod = interface.copy(members = IArray(method))

        val scopeWithInterface = scope / interfaceWithMethod
        val scopeWithMethod = scopeWithInterface / method
        val scopeWithFunction = scopeWithMethod / functionType

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(methodReturnType)

        // Should convert the return type reference to this
        assert(result.isInstanceOf[TsTypeThis])
      }

      test("handles constructor with this type") {
        // Simulate: class MyClass { constructor(): this { } }
        val clazz = createMockClass("MyClass")
        val scope = createMockScope(clazz)

        val constructor = createMemberCtor()
        val classWithCtor = clazz.copy(members = IArray(constructor))

        val scopeWithClass = scope / classWithCtor
        val scopeWithConstructor = scopeWithClass / constructor
        val thisType = createTypeThis()

        val result = RewriteTypeThis.enterTsType(scopeWithConstructor)(thisType)

        // Should convert this to class reference in constructor
        assert(result.isInstanceOf[TsTypeRef])
        val typeRef = result.asInstanceOf[TsTypeRef]
        assert(typeRef.name.parts.last.value == "MyClass")
      }

      test("handles generic class scenario") {
        // Simulate: class MyClass<T> { method(): MyClass<T> { } }
        val tparam = createTypeParam("T")
        val clazz = createMockClass("MyClass", Empty, IArray(tparam))
        val scope = createMockScope(clazz)

        val methodReturnType = createTypeRef("MyClass", IArray(createTypeRef("T")))
        val functionType = createTypeFunction(methodReturnType)
        val method = createMemberFunction("method", functionType)
        val classWithMethod = clazz.copy(members = IArray(method))

        val scopeWithClass = scope / classWithMethod
        val scopeWithMethod = scopeWithClass / method
        val scopeWithFunction = scopeWithMethod / functionType

        val result = RewriteTypeThis.enterTsType(scopeWithFunction)(methodReturnType)

        // Should NOT convert because it has type parameters
        assert(result == methodReturnType)
      }

      test("handles index signature scenario") {
        // Simulate: class MyClass { [key: string]: MyClass; }
        val clazz = createMockClass("MyClass")
        val scope = createMockScope(clazz)

        val indexValueType = createTypeRef("MyClass")
        val indexMember = TsMemberIndex(
          comments = NoComments,
          isReadOnly = false,
          level = TsProtectionLevel.Default,
          indexing = Indexing.Dict(createSimpleIdent("key"), createTypeRef("string")),
          valueType = Some(indexValueType)
        )
        val classWithIndex = clazz.copy(members = IArray(indexMember))

        val scopeWithClass = scope / classWithIndex
        val scopeWithIndex = scopeWithClass / indexMember

        val result = RewriteTypeThis.enterTsType(scopeWithIndex)(indexValueType)

        // Should NOT convert because it's in index type
        assert(result == indexValueType)
      }

      test("handles type lookup scenario") {
        // Simulate: type Test = MyClass[keyof MyClass]
        val clazz = createMockClass("MyClass")
        val scope = createMockScope(clazz)

        val lookupFrom = createTypeRef("MyClass")
        val typeLookup = createTypeLookup(lookupFrom, createTypeRef("string"))

        val scopeWithClass = scope / clazz
        val scopeWithLookup = scopeWithClass / typeLookup

        val result = RewriteTypeThis.enterTsType(scopeWithLookup)(lookupFrom)

        // Should NOT convert because it's in type lookup
        assert(result == lookupFrom)
      }

      test("handles mixed interface and class hierarchy") {
        val interface = createMockInterface("BaseInterface")
        val clazz = createMockClass("DerivedClass")
        val scope = createMockScope(interface, clazz)

        // Test interface reference in class context
        val functionType = createTypeFunction()
        val scopeWithClass = scope / clazz
        val scopeWithClassFunction = scopeWithClass / functionType
        val interfaceRef = createTypeRef("BaseInterface")

        val result1 = RewriteTypeThis.enterTsType(scopeWithClassFunction)(interfaceRef)
        assert(result1 == interfaceRef) // Should not convert - different type

        // Test class reference in interface context
        val scopeWithInterface = scope / interface
        val scopeWithInterfaceFunction = scopeWithInterface / functionType
        val classRef = createTypeRef("DerivedClass")

        val result2 = RewriteTypeThis.enterTsType(scopeWithInterfaceFunction)(classRef)
        assert(result2 == classRef) // Should not convert - different type
      }
    }
  }
}