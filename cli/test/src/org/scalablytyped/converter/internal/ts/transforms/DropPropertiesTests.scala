package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object DropPropertiesTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

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

  def createMockMethod(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(TsTypeRef.void)
      ),
      isStatic = false,
      isReadOnly = false
    )

  def createMockNamedValueDecl(name: String): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = Some(TsTypeRef.string),
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
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

  def createMockClass(name: String, members: IArray[TsMember] = Empty): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      parent = None,
      implements = Empty,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockNamespace(name: String, members: IArray[TsContainerOrDecl] = Empty): TsDeclNamespace =
    TsDeclNamespace(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      members = members,
      codePath = CodePath.NoPath,
      jsLocation = JsLocation.Zero
    )

  def createMockScope(): TsTreeScope = {
    val root = TsTreeScope(
      libName = TsIdentLibrarySimple("test-lib"),
      pedantic = false,
      deps = Map.empty,
      logger = Logger.DevNull
    )
    root
  }

  def tests = Tests {
    test("DropProperties - Basic Functionality") {
      test("extends TransformClassMembers and TransformMembers") {
        assert(DropProperties.isInstanceOf[TransformClassMembers])
        assert(DropProperties.isInstanceOf[TransformMembers])
      }

      test("has newMembers method") {
        val scope = createMockScope()
        val namespace = createMockNamespace("test")
        val result = DropProperties.newMembers(scope, namespace)
        assert(result != null)
      }

      test("has newClassMembers method") {
        val scope = createMockScope()
        val interface = createMockInterface("test")
        val result = DropProperties.newClassMembers(scope, interface)
        assert(result != null)
      }
    }

    test("DropProperties - Container Member Filtering") {
      test("filters out __promisify__ named value declarations") {
        val scope = createMockScope()
        val promisifyDecl = createMockNamedValueDecl("__promisify__")
        val normalDecl = createMockNamedValueDecl("normalVar")
        val namespace = createMockNamespace("test", IArray(promisifyDecl, normalDecl))
        
        val result = DropProperties.newMembers(scope, namespace)
        
        assert(result.length == 1)
        assert(result.exists {
          case decl: TsDeclVar => decl.name.value == "normalVar"
          case _ => false
        })
        assert(!result.exists {
          case decl: TsDeclVar => decl.name.value == "__promisify__"
          case _ => false
        })
      }

      test("keeps non-named value declarations unchanged") {
        val scope = createMockScope()
        val interface = createMockInterface("TestInterface")
        val class_ = createMockClass("TestClass")
        val namespace = createMockNamespace("test", IArray(interface, class_))
        
        val result = DropProperties.newMembers(scope, namespace)
        
        assert(result.length == 2)
        assert(result.contains(interface))
        assert(result.contains(class_))
      }

      test("keeps named value declarations with different names") {
        val scope = createMockScope()
        val normalDecl1 = createMockNamedValueDecl("normalVar1")
        val normalDecl2 = createMockNamedValueDecl("normalVar2")
        val namespace = createMockNamespace("test", IArray(normalDecl1, normalDecl2))
        
        val result = DropProperties.newMembers(scope, namespace)
        
        assert(result.length == 2)
        assert(result.contains(normalDecl1))
        assert(result.contains(normalDecl2))
      }

      test("handles empty container") {
        val scope = createMockScope()
        val namespace = createMockNamespace("test")
        
        val result = DropProperties.newMembers(scope, namespace)
        
        assert(result.isEmpty)
      }

      test("handles mixed member types") {
        val scope = createMockScope()
        val promisifyDecl = createMockNamedValueDecl("__promisify__")
        val normalDecl = createMockNamedValueDecl("normalVar")
        val interface = createMockInterface("TestInterface")
        val namespace = createMockNamespace("test", IArray(promisifyDecl, normalDecl, interface))
        
        val result = DropProperties.newMembers(scope, namespace)
        
        assert(result.length == 2)
        assert(result.contains(normalDecl))
        assert(result.contains(interface))
        assert(!result.contains(promisifyDecl))
      }
    }

    test("DropProperties - Class Member Filtering") {
      test("filters out prototype properties") {
        val scope = createMockScope()
        val prototypeProperty = createMockProperty("prototype")
        val normalProperty = createMockProperty("normalProp")
        val interface = createMockInterface("test", IArray(prototypeProperty, normalProperty))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(normalProperty))
        assert(!result.contains(prototypeProperty))
      }

      test("filters out unicode escape properties") {
        val scope = createMockScope()
        val unicodeProperty = createMockProperty("\\u0041") // \u0041 is 'A'
        val normalProperty = createMockProperty("normalProp")
        val interface = createMockInterface("test", IArray(unicodeProperty, normalProperty))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(normalProperty))
        assert(!result.contains(unicodeProperty))
      }

      test("filters out properties with never type") {
        val scope = createMockScope()
        val neverProperty = createMockProperty("neverProp", Some(TsTypeRef.never))
        val normalProperty = createMockProperty("normalProp")
        val interface = createMockInterface("test", IArray(neverProperty, normalProperty))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(normalProperty))
        assert(!result.contains(neverProperty))
      }

      test("keeps non-property members unchanged") {
        val scope = createMockScope()
        val method = createMockMethod("testMethod")
        val property = createMockProperty("normalProp")
        val interface = createMockInterface("test", IArray(method, property))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 2)
        assert(result.contains(method))
        assert(result.contains(property))
      }

      test("handles multiple filter conditions") {
        val scope = createMockScope()
        val prototypeProperty = createMockProperty("prototype")
        val unicodeProperty = createMockProperty("\\u1234")
        val neverProperty = createMockProperty("neverProp", Some(TsTypeRef.never))
        val normalProperty1 = createMockProperty("normalProp1")
        val normalProperty2 = createMockProperty("normalProp2")
        val method = createMockMethod("testMethod")
        
        val interface = createMockInterface("test", IArray(
          prototypeProperty, unicodeProperty, neverProperty, 
          normalProperty1, normalProperty2, method
        ))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 3)
        assert(result.contains(normalProperty1))
        assert(result.contains(normalProperty2))
        assert(result.contains(method))
        assert(!result.contains(prototypeProperty))
        assert(!result.contains(unicodeProperty))
        assert(!result.contains(neverProperty))
      }

      test("handles empty class members") {
        val scope = createMockScope()
        val interface = createMockInterface("test")
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.isEmpty)
      }
    }

    test("DropProperties - Edge Cases") {
      test("handles properties with no type") {
        val scope = createMockScope()
        val noTypeProperty = createMockProperty("noTypeProp", None)
        val interface = createMockInterface("test", IArray(noTypeProperty))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(noTypeProperty))
      }

      test("handles unicode properties that don't start with \\u") {
        val scope = createMockScope()
        val unicodeInMiddle = createMockProperty("prop\\u1234")
        val interface = createMockInterface("test", IArray(unicodeInMiddle))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(unicodeInMiddle))
      }

      test("handles properties with complex types") {
        val scope = createMockScope()
        val unionType = TsTypeUnion(IArray(TsTypeRef.string, TsTypeRef.number))
        val complexProperty = createMockProperty("complexProp", Some(unionType))
        val interface = createMockInterface("test", IArray(complexProperty))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(complexProperty))
      }

      test("preserves member order for remaining members") {
        val scope = createMockScope()
        val prop1 = createMockProperty("prop1")
        val prototypeProperty = createMockProperty("prototype")
        val prop2 = createMockProperty("prop2")
        val method = createMockMethod("method")
        val prop3 = createMockProperty("prop3")
        
        val interface = createMockInterface("test", IArray(prop1, prototypeProperty, prop2, method, prop3))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 4)
        assert(result(0) == prop1)
        assert(result(1) == prop2)
        assert(result(2) == method)
        assert(result(3) == prop3)
      }
    }

    test("DropProperties - Integration Scenarios") {
      test("works with classes") {
        val scope = createMockScope()
        val prototypeProperty = createMockProperty("prototype")
        val normalProperty = createMockProperty("normalProp")
        val class_ = createMockClass("TestClass", IArray(prototypeProperty, normalProperty))
        
        val result = DropProperties.newClassMembers(scope, class_)
        
        assert(result.length == 1)
        assert(result.contains(normalProperty))
      }

      test("works with interfaces") {
        val scope = createMockScope()
        val unicodeProperty = createMockProperty("\\u0041")
        val normalProperty = createMockProperty("normalProp")
        val interface = createMockInterface("TestInterface", IArray(unicodeProperty, normalProperty))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 1)
        assert(result.contains(normalProperty))
      }

      test("handles real-world scenario with multiple filters") {
        val scope = createMockScope()
        
        // Create a realistic interface with various problematic properties
        val prototypeProperty = createMockProperty("prototype")
        val unicodeProperty1 = createMockProperty("\\u0041")
        val unicodeProperty2 = createMockProperty("\\uFFFF")
        val neverProperty = createMockProperty("impossibleProp", Some(TsTypeRef.never))
        val normalProperty1 = createMockProperty("name", Some(TsTypeRef.string))
        val normalProperty2 = createMockProperty("value", Some(TsTypeRef.number))
        val method = createMockMethod("getValue")
        
        val interface = createMockInterface("RealWorldInterface", IArray(
          prototypeProperty, unicodeProperty1, normalProperty1, 
          unicodeProperty2, neverProperty, normalProperty2, method
        ))
        
        val result = DropProperties.newClassMembers(scope, interface)
        
        assert(result.length == 3)
        assert(result.contains(normalProperty1))
        assert(result.contains(normalProperty2))
        assert(result.contains(method))
        assert(!result.contains(prototypeProperty))
        assert(!result.contains(unicodeProperty1))
        assert(!result.contains(unicodeProperty2))
        assert(!result.contains(neverProperty))
      }
    }
  }
}
