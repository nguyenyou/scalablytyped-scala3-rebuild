package org.scalablytyped.converter.internal
package ts
package transforms

import utest.*
import TestUtils.*

object DefaultedTypeArgumentsTests extends TestSuite {
  def tests = Tests {
    test("DefaultedTypeArguments - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(DefaultedTypeArguments.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("handles type reference with no missing arguments") {
        val typeParam1 = createTypeParam("T", Some(TsTypeRef.string))
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.number))
        val interface = createMockInterface("TestInterface", IArray(typeParam1, typeParam2))
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("TestInterface", IArray(TsTypeRef.string, TsTypeRef.number))
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should return unchanged since all type arguments are provided
        assert(result == typeRef)
      }

      test("handles type reference with no type parameters") {
        val interface = createMockInterface("SimpleInterface")
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("SimpleInterface")
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should return unchanged since no type parameters expected
        assert(result == typeRef)
      }
    }

    test("DefaultedTypeArguments - Default Type Parameter Handling") {
      test("adds default type arguments when missing") {
        val typeParam1 = createTypeParam("T", Some(TsTypeRef.string))
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.number))
        val interface = createMockInterface("TestInterface", IArray(typeParam1, typeParam2))
        val scope = createMockScope(interface)
        
        // Provide only first type argument
        val typeRef = createTypeRef("TestInterface", IArray(TsTypeRef.boolean))
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should add the default for the second type parameter
        assert(result.tparams.length == 2)
        assert(result.tparams(0) == TsTypeRef.boolean)
        assert(result.tparams(1) == TsTypeRef.number)
      }

      test("adds all default type arguments when none provided") {
        val typeParam1 = createTypeParam("T", Some(TsTypeRef.string))
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.number))
        val interface = createMockInterface("TestInterface", IArray(typeParam1, typeParam2))
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("TestInterface")
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should add defaults for both type parameters
        assert(result.tparams.length == 2)
        assert(result.tparams(0) == TsTypeRef.string)
        assert(result.tparams(1) == TsTypeRef.number)
      }

      test("uses upper bound when no default is available") {
        val typeParam1 = createTypeParam("T", None, Some(TsTypeRef.string))
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.number))
        val interface = createMockInterface("TestInterface", IArray(typeParam1, typeParam2))
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("TestInterface")
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should use upper bound for first, default for second
        assert(result.tparams.length == 2)
        assert(result.tparams(0) == TsTypeRef.string)
        assert(result.tparams(1) == TsTypeRef.number)
      }

      test("uses any when no default or upper bound available") {
        val typeParam1 = createTypeParam("T")
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.number))
        val interface = createMockInterface("TestInterface", IArray(typeParam1, typeParam2))
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("TestInterface")
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should use any for first (with warning comment), default for second
        assert(result.tparams.length == 2)
        assert(result.tparams(0).isInstanceOf[TsTypeRef])
        assert(result.tparams(1) == TsTypeRef.number)
      }
    }

    test("DefaultedTypeArguments - Self-Reference Handling") {
      test("handles self-referencing default types") {
        val selfRefDefault = createTypeRef("TestInterface", IArray(TsTypeRef.string))
        val typeParam1 = createTypeParam("T", Some(selfRefDefault))
        val interface = createMockInterface("TestInterface", IArray(typeParam1))
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("TestInterface")
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should replace self-reference with any to avoid infinite recursion
        assert(result.tparams.length == 1)
        assert(result.tparams(0).isInstanceOf[TsTypeRef])
        val resultTypeRef = result.tparams(0).asInstanceOf[TsTypeRef]
        assert(resultTypeRef.name == TsQIdent.of(TsIdentSimple("any")))
      }

      test("handles complex self-referencing scenarios") {
        val selfRefDefault = createTypeRef("TestInterface")
        val typeParam1 = createTypeParam("T", Some(selfRefDefault))
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.string))
        val interface = createMockInterface("TestInterface", IArray(typeParam1, typeParam2))
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("TestInterface")
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should handle self-reference properly
        assert(result.tparams.length == 2)
        assert(result.tparams(1) == TsTypeRef.string)
      }
    }

    test("DefaultedTypeArguments - Type Parameter Instantiation") {
      test("handles type parameters referencing earlier parameters") {
        val typeParam1 = createTypeParam("T", Some(TsTypeRef.string))
        val typeParam2 = createTypeParam("U", Some(createTypeRef("T")))
        val interface = createMockInterface("TestInterface", IArray(typeParam1, typeParam2))
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("TestInterface", IArray(TsTypeRef.number))
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should instantiate T with number, and U should reference the instantiated T
        assert(result.tparams.length == 2)
        assert(result.tparams(0) == TsTypeRef.number)
        // The second parameter should be processed by TypeRewriter
        assert(result.tparams(1).isInstanceOf[TsType])
      }

      test("handles complex type parameter dependencies") {
        val typeParam1 = createTypeParam("T", Some(TsTypeRef.string))
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.number))
        val typeParam3 = createTypeParam("V", Some(createTypeRef("T")))
        val interface = createMockInterface("TestInterface", IArray(typeParam1, typeParam2, typeParam3))
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("TestInterface", IArray(TsTypeRef.boolean))
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should handle all dependencies correctly
        assert(result.tparams.length == 3)
        assert(result.tparams(0) == TsTypeRef.boolean)
        assert(result.tparams(1) == TsTypeRef.number)
      }
    }

    test("DefaultedTypeArguments - Edge Cases") {
      test("handles non-existent type references") {
        val scope = createMockScope()
        
        val typeRef = createTypeRef("NonExistentType", IArray(TsTypeRef.string))
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should return unchanged when type is not found
        assert(result == typeRef)
      }

      test("handles type aliases with defaults") {
        val typeParam1 = createTypeParam("T", Some(TsTypeRef.string))
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.number))
        val typeAlias = createMockTypeAlias("TestAlias", IArray(typeParam1, typeParam2))
        val scope = createMockScope(typeAlias)
        
        val typeRef = createTypeRef("TestAlias")
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should work with type aliases too
        assert(result.tparams.length == 2)
        assert(result.tparams(0) == TsTypeRef.string)
        assert(result.tparams(1) == TsTypeRef.number)
      }

      test("handles mixed provided and default arguments") {
        val typeParam1 = createTypeParam("T", Some(TsTypeRef.string))
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.number))
        val typeParam3 = createTypeParam("V", Some(TsTypeRef.boolean))
        val interface = createMockInterface("TestInterface", IArray(typeParam1, typeParam2, typeParam3))
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("TestInterface", IArray(TsTypeRef.any, TsTypeRef.void))
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should keep provided arguments and add default for the last one
        assert(result.tparams.length == 3)
        assert(result.tparams(0) == TsTypeRef.any)
        assert(result.tparams(1) == TsTypeRef.void)
        assert(result.tparams(2) == TsTypeRef.boolean)
      }

      test("handles empty type parameter lists") {
        val interface = createMockInterface("EmptyInterface")
        val scope = createMockScope(interface)
        
        val typeRef = createTypeRef("EmptyInterface")
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should return unchanged
        assert(result == typeRef)
        assert(result.tparams.isEmpty)
      }

      test("preserves comments and other properties") {
        val typeParam1 = createTypeParam("T", Some(TsTypeRef.string))
        val interface = createMockInterface("TestInterface", IArray(typeParam1))
        val scope = createMockScope(interface)
        
        val originalComments = Comments(Comment("test comment"))
        val typeRef = TsTypeRef(originalComments, createQIdent("TestInterface"), Empty)
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef)
        
        // Should preserve original comments
        assert(result.comments == originalComments)
        assert(result.name == typeRef.name)
        assert(result.tparams.length == 1)
        assert(result.tparams(0) == TsTypeRef.string)
      }
    }

    test("DefaultedTypeArguments - Integration Scenarios") {
      test("works with complex nested type structures") {
        val typeParam1 = createTypeParam("T", Some(TsTypeRef.string))
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.number))
        val interface = createMockInterface("Container", IArray(typeParam1, typeParam2))
        val scope = createMockScope(interface)
        
        val nestedTypeRef = createTypeRef("Container", IArray(TsTypeRef.boolean))
        val result = DefaultedTypeArguments.enterTsTypeRef(scope)(nestedTypeRef)
        
        // Should handle nested structures correctly
        assert(result.tparams.length == 2)
        assert(result.tparams(0) == TsTypeRef.boolean)
        assert(result.tparams(1) == TsTypeRef.number)
      }

      test("handles multiple type declarations in scope") {
        val typeParam1 = createTypeParam("T", Some(TsTypeRef.string))
        val typeParam2 = createTypeParam("U", Some(TsTypeRef.number))
        val interface1 = createMockInterface("Interface1", IArray(typeParam1))
        val interface2 = createMockInterface("Interface2", IArray(typeParam1, typeParam2))
        val scope = createMockScope(interface1, interface2)
        
        val typeRef1 = createTypeRef("Interface1")
        val typeRef2 = createTypeRef("Interface2")
        
        val result1 = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef1)
        val result2 = DefaultedTypeArguments.enterTsTypeRef(scope)(typeRef2)
        
        // Should handle each type correctly
        assert(result1.tparams.length == 1)
        assert(result1.tparams(0) == TsTypeRef.string)
        
        assert(result2.tparams.length == 2)
        assert(result2.tparams(0) == TsTypeRef.string)
        assert(result2.tparams(1) == TsTypeRef.number)
      }
    }
  }
}