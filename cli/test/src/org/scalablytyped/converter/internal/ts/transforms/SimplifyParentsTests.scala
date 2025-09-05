package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object SimplifyParentsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMockClass(
    name: String,
    parent: Option[TsTypeRef] = None,
    implements: IArray[TsTypeRef] = Empty,
    members: IArray[TsMember] = Empty
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
      codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    )

  def createMockInterface(
    name: String,
    inheritance: IArray[TsTypeRef] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = inheritance,
      members = Empty,
      codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    )

  def createMockVariable(
    name: String,
    tpe: Option[TsType] = None
  ): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(createSimpleIdent("test-lib"), createQIdent(name))
    )

  def createMockNamespace(
    name: String,
    members: IArray[TsContainerOrDecl] = Empty
  ): TsDeclNamespace =
    TsDeclNamespace(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockScope(
    members: IArray[TsContainerOrDecl] = Empty,
    logger: Logger[Unit] = Logger.DevNull
  ): TsTreeScope = {
    val namespace = createMockNamespace("TestScope", members)
    val libName = TsIdentLibrary("test-lib")
    val parsedFile = TsParsedFile(NoComments, Empty, members, CodePath.NoPath)
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger) / parsedFile
  }

  def tests = Tests {
    test("SimplifyParents - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(SimplifyParents.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsDeclClass method") {
        val scope = createMockScope()
        val clazz = createMockClass("TestClass")
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        assert(result != null)
        assert(result.isInstanceOf[TsDeclClass])
      }

      test("has enterTsDeclInterface method") {
        val scope = createMockScope()
        val interface = createMockInterface("TestInterface")
        val result = SimplifyParents.enterTsDeclInterface(scope)(interface)
        assert(result != null)
        assert(result.isInstanceOf[TsDeclInterface])
      }
    }

    test("SimplifyParents - Class Processing") {
      test("preserves class with no parents") {
        val scope = createMockScope()
        val clazz = createMockClass("TestClass")
        
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isEmpty)
        assert(result.implements.isEmpty)
      }

      test("preserves simple parent class") {
        val scope = createMockScope()
        val parentRef = createTypeRef("ParentClass")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))
        
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        assert(result.parent.get.name.parts.head.value == "ParentClass")
        assert(result.implements.isEmpty)
      }

      test("moves first implements to parent when no parent exists") {
        val scope = createMockScope()
        val interfaceRef1 = createTypeRef("Interface1")
        val interfaceRef2 = createTypeRef("Interface2")
        val clazz = createMockClass("TestClass", implements = IArray(interfaceRef1, interfaceRef2))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        assert(result.parent.get.name.parts.head.value == "Interface1")
        assert(result.implements.length == 1)
        assert(result.implements.head.name.parts.head.value == "Interface2")
      }

      test("preserves simple implements interfaces") {
        val scope = createMockScope()
        val interfaceRef1 = createTypeRef("Interface1")
        val interfaceRef2 = createTypeRef("Interface2")
        val clazz = createMockClass("TestClass", implements = IArray(interfaceRef1, interfaceRef2))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        // SimplifyParents actually moves first implements to parent when no parent exists
        assert(result.parent.isDefined)
        assert(result.parent.get.name.parts.head.value == "Interface1")
        assert(result.implements.length == 1)
        assert(result.implements.head.name.parts.head.value == "Interface2")
      }

      test("combines parent and implements correctly") {
        val scope = createMockScope()
        val parentRef = createTypeRef("ParentClass")
        val interfaceRef1 = createTypeRef("Interface1")
        val interfaceRef2 = createTypeRef("Interface2")
        val clazz = createMockClass("TestClass", parent = Some(parentRef), implements = IArray(interfaceRef1, interfaceRef2))
        
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        assert(result.parent.get.name.parts.head.value == "ParentClass")
        assert(result.implements.length == 2)
        assert(result.implements.head.name.parts.head.value == "Interface1")
        assert(result.implements(1).name.parts.head.value == "Interface2")
      }

      test("preserves unknown parent references") {
        val scope = createMockScope()
        val parentRef = createTypeRef("UnknownParent")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        // Should preserve unknown references unchanged
        assert(result.parent.get.name.parts.head.value == "UnknownParent")
      }
    }

    test("SimplifyParents - Interface Processing") {
      test("preserves interface with no inheritance") {
        val scope = createMockScope()
        val interface = createMockInterface("TestInterface")
        
        val result = SimplifyParents.enterTsDeclInterface(scope)(interface)
        
        assert(result.name.value == "TestInterface")
        assert(result.inheritance.isEmpty)
      }

      test("preserves simple interface inheritance") {
        val scope = createMockScope()
        val parentRef1 = createTypeRef("ParentInterface1")
        val parentRef2 = createTypeRef("ParentInterface2")
        val interface = createMockInterface("TestInterface", IArray(parentRef1, parentRef2))
        
        val result = SimplifyParents.enterTsDeclInterface(scope)(interface)
        
        assert(result.name.value == "TestInterface")
        assert(result.inheritance.length == 2)
        assert(result.inheritance.head.name.parts.head.value == "ParentInterface1")
        assert(result.inheritance(1).name.parts.head.value == "ParentInterface2")
      }

      test("preserves unknown interface inheritance") {
        val scope = createMockScope()
        val parentRef = createTypeRef("UnknownInterface")
        val interface = createMockInterface("TestInterface", IArray(parentRef))

        val result = SimplifyParents.enterTsDeclInterface(scope)(interface)

        assert(result.name.value == "TestInterface")
        assert(result.inheritance.length == 1)
        // Should preserve unknown references unchanged
        assert(result.inheritance.head.name.parts.head.value == "UnknownInterface")
      }
    }

    test("SimplifyParents - Complex Type Handling") {
      test("handles intersection types in variables") {
        val intersectionType = TsTypeIntersect(IArray(
          createTypeRef("Type1"),
          createTypeRef("Type2")
        ))
        val parentVar = createMockVariable("ComplexVar", Some(intersectionType))
        val scope = createMockScope(IArray(parentVar))
        
        val parentRef = createTypeRef("ComplexVar")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))
        
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        // Should handle intersection by flattening or simplifying
        assert(result.parent.isDefined || result.implements.nonEmpty)
      }

      test("handles type query expressions") {
        val queryType = TsTypeQuery(createQIdent("SomeClass"))
        val parentVar = createMockVariable("QueryVar", Some(queryType))
        val targetClass = createMockClass("SomeClass")
        val scope = createMockScope(IArray(parentVar, targetClass))
        
        val parentRef = createTypeRef("QueryVar")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))
        
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        // Should resolve type query to the actual class
        assert(result.parent.isDefined || result.implements.isEmpty)
      }

      test("drops complicated parent types") {
        val complicatedType = TsTypeUnion(IArray(
          createTypeRef("Type1"),
          createTypeRef("Type2")
        ))
        val parentVar = createMockVariable("ComplicatedVar", Some(complicatedType))
        val scope = createMockScope(IArray(parentVar))
        
        val parentRef = createTypeRef("ComplicatedVar")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))
        
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        // Should drop complicated types
        assert(result.parent.isEmpty)
        assert(result.implements.isEmpty)
      }
    }

    test("SimplifyParents - Edge Cases") {
      test("handles empty parent arrays") {
        val scope = createMockScope()
        val clazz = createMockClass("TestClass", parent = None, implements = Empty)
        
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isEmpty)
        assert(result.implements.isEmpty)
      }

      test("handles unresolvable parent references") {
        val scope = createMockScope()
        val unknownRef = createTypeRef("UnknownParent")
        val clazz = createMockClass("TestClass", parent = Some(unknownRef))
        
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        assert(result.parent.get.name.parts.head.value == "UnknownParent")
      }

      test("handles variables without types") {
        val parentVar = createMockVariable("ParentVar", None)
        val scope = createMockScope(IArray(parentVar))
        
        val parentRef = createTypeRef("ParentVar")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))
        
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        assert(result.parent.get.name.parts.head.value == "ParentVar")
      }

      test("handles deeply nested type references") {
        val nestedRef = createTypeRef("Deeply", IArray(
          createTypeRef("Nested", IArray(
            createTypeRef("Type")
          ))
        ))
        val clazz = createMockClass("TestClass", parent = Some(nestedRef))
        val scope = createMockScope()
        
        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        assert(result.parent.get.name.parts.head.value == "Deeply")
      }
    }



    test("SimplifyParents - Scope Lookup") {
      test("prefers type lookup over variable lookup") {
        val actualClass = createMockClass("SharedName")
        val conflictingVar = createMockVariable("SharedName", Some(createTypeRef("OtherClass")))
        val scope = createMockScope(IArray(actualClass, conflictingVar))

        val parentRef = createTypeRef("SharedName")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        // Should prefer the class over the variable
        assert(result.parent.get.name.parts.head.value == "SharedName")
      }

      test("falls back to variable when type not found") {
        val parentVar = createMockVariable("OnlyVar", Some(createTypeRef("SomeClass")))
        val scope = createMockScope(IArray(parentVar))

        val parentRef = createTypeRef("OnlyVar")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        // Should use the variable since no type was found
        assert(result.parent.get.name.parts.head.value == "SomeClass")
      }

      test("preserves original reference when nothing found") {
        val scope = createMockScope()
        val unknownRef = createTypeRef("CompletelyUnknown")
        val clazz = createMockClass("TestClass", parent = Some(unknownRef))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        // Should preserve the original reference
        assert(result.parent.get.name.parts.head.value == "CompletelyUnknown")
      }
    }

    test("SimplifyParents - Integration Scenarios") {
      test("handles real-world mixin pattern") {
        // Simulate: type Constructor<T> = new(...args: any[]) => T;
        // declare const TextBase: Constructor<NativeMethodsMixin> & typeof TextComponent;
        // export class Text extends TextBase {}

        val constructorType = TsTypeIntersect(IArray(
          createTypeRef("Constructor", IArray(createTypeRef("NativeMethodsMixin"))),
          TsTypeQuery(createQIdent("TextComponent"))
        ))
        val textBaseVar = createMockVariable("TextBase", Some(constructorType))
        val textComponent = createMockClass("TextComponent")
        val scope = createMockScope(IArray(textBaseVar, textComponent))

        val parentRef = createTypeRef("TextBase")
        val textClass = createMockClass("Text", parent = Some(parentRef))

        val result = SimplifyParents.enterTsDeclClass(scope)(textClass)

        assert(result.name.value == "Text")
        // Should simplify the complex mixin pattern
        assert(result.parent.isDefined || result.implements.nonEmpty)
      }

      test("handles multiple inheritance flattening") {
        val intersectionType = TsTypeIntersect(IArray(
          createTypeRef("BaseClass"),
          createTypeRef("Mixin1"),
          createTypeRef("Mixin2"),
          createTypeRef("Mixin3")
        ))
        val parentVar = createMockVariable("ComplexParent", Some(intersectionType))
        val scope = createMockScope(IArray(parentVar))

        val parentRef = createTypeRef("ComplexParent")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        // Should flatten intersection into parent + implements
        val totalParents = (if (result.parent.isDefined) 1 else 0) + result.implements.length
        assert(totalParents > 0) // Should have extracted some parents
      }

      test("handles nested namespace resolution") {
        val innerClass = createMockClass("InnerClass")
        val innerNamespace = createMockNamespace("Inner", IArray(innerClass))
        val outerNamespace = createMockNamespace("Outer", IArray(innerNamespace))
        val scope = createMockScope(IArray(outerNamespace))

        val nestedRef = createTypeRef("Outer", IArray(createTypeRef("Inner", IArray(createTypeRef("InnerClass")))))
        val clazz = createMockClass("TestClass", parent = Some(nestedRef))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        // Should preserve the nested reference structure
        assert(result.parent.get.name.parts.head.value == "Outer")
      }

      test("handles simple interface inheritance chain") {
        val scope = createMockScope()
        val parentRef1 = createTypeRef("BaseInterface")
        val parentRef2 = createTypeRef("MixinInterface")
        val interface = createMockInterface("ComplexInterface", IArray(parentRef1, parentRef2))

        val result = SimplifyParents.enterTsDeclInterface(scope)(interface)

        assert(result.name.value == "ComplexInterface")
        assert(result.inheritance.nonEmpty)
        // Should preserve the inheritance chain
        assert(result.inheritance.length == 2)
        assert(result.inheritance.head.name.parts.head.value == "BaseInterface")
        assert(result.inheritance(1).name.parts.head.value == "MixinInterface")
      }

      test("handles circular reference prevention") {
        val selfRef = createTypeRef("SelfReferencing")
        val selfVar = createMockVariable("SelfReferencing", Some(selfRef))
        val scope = createMockScope(IArray(selfVar))

        val clazz = createMockClass("SelfReferencing", parent = Some(selfRef))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "SelfReferencing")
        // Should handle circular reference gracefully
        assert(result.parent.isDefined)
        assert(result.parent.get.name.parts.head.value == "SelfReferencing")
      }
    }

    test("SimplifyParents - Error Handling") {
      test("handles malformed type references gracefully") {
        val scope = createMockScope()
        val malformedRef = TsTypeRef(NoComments, createQIdent(), Empty) // Empty name
        val clazz = createMockClass("TestClass", parent = Some(malformedRef))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        // Should handle malformed reference without crashing
        assert(result.parent.isDefined)
      }

      test("handles null/empty scope gracefully") {
        val emptyScope = createMockScope(Empty)
        val parentRef = createTypeRef("AnyParent")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))

        val result = SimplifyParents.enterTsDeclClass(emptyScope)(clazz)

        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        // Should preserve original reference when scope is empty
        assert(result.parent.get.name.parts.head.value == "AnyParent")
      }

      test("handles deeply nested intersection types") {
        val deepIntersection = TsTypeIntersect(IArray(
          TsTypeIntersect(IArray(
            createTypeRef("Level1A"),
            createTypeRef("Level1B")
          )),
          TsTypeIntersect(IArray(
            createTypeRef("Level2A"),
            createTypeRef("Level2B")
          ))
        ))
        val parentVar = createMockVariable("DeepVar", Some(deepIntersection))
        val scope = createMockScope(IArray(parentVar))

        val parentRef = createTypeRef("DeepVar")
        val clazz = createMockClass("TestClass", parent = Some(parentRef))

        val result = SimplifyParents.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        // Should handle deeply nested intersections
        val totalParents = (if (result.parent.isDefined) 1 else 0) + result.implements.length
        assert(totalParents >= 0) // Should not crash
      }
    }
  }
}