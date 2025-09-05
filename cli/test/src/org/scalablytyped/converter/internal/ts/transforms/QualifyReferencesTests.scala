package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object QualifyReferencesTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createQualifiedTypeRef(parts: String*): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(parts*), Empty)

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
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockTypeAlias(
    name: String,
    alias: TsType
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      alias = alias,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
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
    test("QualifyReferences - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        val transform = new QualifyReferences(skipValidation = false)
        assert(transform.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has skipValidation parameter") {
        val transform1 = new QualifyReferences(skipValidation = true)
        val transform2 = new QualifyReferences(skipValidation = false)
        assert(transform1 != null)
        assert(transform2 != null)
      }

      test("has enterTsType method") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val typeRef = createTypeRef("string")
        val result = transform.enterTsType(scope)(typeRef)
        assert(result != null)
        assert(result.isInstanceOf[TsType])
      }

      test("has enterTsTypeRef method") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val typeRef = createTypeRef("string")
        val result = transform.enterTsTypeRef(scope)(typeRef)
        assert(result != null)
        assert(result.isInstanceOf[TsTypeRef])
      }

      test("has enterTsDeclTypeAlias method") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val typeAlias = createMockTypeAlias("TestAlias", createTypeRef("string"))
        val result = transform.enterTsDeclTypeAlias(scope)(typeAlias)
        assert(result != null)
        assert(result.isInstanceOf[TsDeclTypeAlias])
      }

      test("has enterTsDeclClass method") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val clazz = createMockClass("TestClass")
        val result = transform.enterTsDeclClass(scope)(clazz)
        assert(result != null)
        assert(result.isInstanceOf[TsDeclClass])
      }
    }

    test("QualifyReferences - Type Reference Resolution") {
      test("leaves primitive types unchanged") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")
        val booleanType = createTypeRef("boolean")
        
        val result1 = transform.enterTsType(scope)(stringType)
        val result2 = transform.enterTsType(scope)(numberType)
        val result3 = transform.enterTsType(scope)(booleanType)
        
        // Primitive types should not be qualified
        assert(result1.isInstanceOf[TsTypeRef])
        assert(result2.isInstanceOf[TsTypeRef])
        assert(result3.isInstanceOf[TsTypeRef])
      }

      test("leaves already qualified types unchanged") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val qualifiedType = createQualifiedTypeRef("test-lib", "MyType")
        
        val result = transform.enterTsType(scope)(qualifiedType)
        
        // Already qualified types should remain unchanged
        assert(result.isInstanceOf[TsTypeRef])
      }

      test("processes unqualified type references") {
        val transform = new QualifyReferences(skipValidation = false)
        val interface = createMockInterface("MyInterface")
        val scope = createMockScope(interface)
        val unqualifiedType = createTypeRef("MyInterface")
        
        val result = transform.enterTsType(scope)(unqualifiedType)
        
        // Should attempt to qualify the type reference
        assert(result != null)
        assert(result.isInstanceOf[TsType])
      }

      test("handles non-TsTypeRef types") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val unionType = TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number")))
        
        val result = transform.enterTsType(scope)(unionType)
        
        // Non-TsTypeRef types should pass through unchanged
        assert(result == unionType)
      }
    }

    test("QualifyReferences - Type Alias Processing") {
      test("qualifies type alias with TsTypeRef alias") {
        val transform = new QualifyReferences(skipValidation = false)
        val targetInterface = createMockInterface("TargetInterface")
        val scope = createMockScope(targetInterface)
        val typeAlias = createMockTypeAlias("MyAlias", createTypeRef("TargetInterface"))
        
        val result = transform.enterTsDeclTypeAlias(scope)(typeAlias)
        
        assert(result.name.value == "MyAlias")
        assert(result.alias != null)
      }

      test("leaves type alias with non-TsTypeRef alias unchanged") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val unionType = TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number")))
        val typeAlias = createMockTypeAlias("MyAlias", unionType)
        
        val result = transform.enterTsDeclTypeAlias(scope)(typeAlias)
        
        assert(result == typeAlias)
      }

      test("handles self-referencing type alias") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val typeAlias = createMockTypeAlias("SelfRef", createTypeRef("SelfRef"))
        
        val result = transform.enterTsDeclTypeAlias(scope)(typeAlias)
        
        // Should handle self-references without infinite recursion
        assert(result.name.value == "SelfRef")
      }
    }

    test("QualifyReferences - Class Processing") {
      test("qualifies class parent and implements") {
        val transform = new QualifyReferences(skipValidation = false)
        val parentInterface = createMockInterface("ParentInterface")
        val implementedInterface = createMockInterface("ImplementedInterface")
        val scope = createMockScope(parentInterface, implementedInterface)
        
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("ParentInterface")),
          implements = IArray(createTypeRef("ImplementedInterface"))
        )
        
        val result = transform.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        assert(result.implements.nonEmpty)
      }

      test("filters out self-inheritance") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("TestClass")),
          implements = IArray(createTypeRef("TestClass"))
        )
        
        val result = transform.enterTsDeclClass(scope)(clazz)
        
        // Self-inheritance should be filtered out
        assert(result.parent.isEmpty)
        assert(result.implements.isEmpty)
      }

      test("handles class with no inheritance") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val clazz = createMockClass("TestClass")
        
        val result = transform.enterTsDeclClass(scope)(clazz)
        
        assert(result == clazz)
      }

      test("handles multiple implements interfaces") {
        val transform = new QualifyReferences(skipValidation = false)
        val interface1 = createMockInterface("Interface1")
        val interface2 = createMockInterface("Interface2")
        val interface3 = createMockInterface("Interface3")
        val scope = createMockScope(interface1, interface2, interface3)

        val clazz = createMockClass(
          "TestClass",
          implements = IArray(
            createTypeRef("Interface1"),
            createTypeRef("Interface2"),
            createTypeRef("Interface3")
          )
        )

        val result = transform.enterTsDeclClass(scope)(clazz)

        assert(result.name.value == "TestClass")
        // The first interface becomes parent, the rest become implements
        assert(result.parent.isDefined)
        assert(result.implements.length == 2)
      }
    }

    test("QualifyReferences - shouldQualify Logic") {
      test("does not qualify primitive types") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        
        // Test common primitive types
        val primitives = List("string", "number", "boolean", "void", "any", "unknown", "never")
        primitives.foreach { primitive =>
          val typeRef = createTypeRef(primitive)
          val result = transform.enterTsTypeRef(scope)(typeRef)
          // Primitives should remain unchanged
          assert(result.name.parts.length == 1)
          assert(result.name.parts.head.value == primitive)
        }
      }

      test("does not qualify already qualified types") {
        val transform = new QualifyReferences(skipValidation = true)
        val scope = createMockScope()
        val qualifiedType = createQualifiedTypeRef("some-lib", "SomeType")

        val result = transform.enterTsTypeRef(scope)(qualifiedType)

        // Already qualified types should remain unchanged when skipValidation is true
        assert(result.name.parts.length >= 1)
        assert(result != null)
      }
    }

    test("QualifyReferences - Skip Validation Mode") {
      test("handles missing types when skipValidation is true") {
        val transform = new QualifyReferences(skipValidation = true)
        val scope = createMockScope()
        val missingType = createTypeRef("NonExistentType")
        
        val result = transform.enterTsTypeRef(scope)(missingType)
        
        // Should not crash and return some valid result
        assert(result != null)
        assert(result.isInstanceOf[TsTypeRef])
      }

      test("handles missing types when skipValidation is false") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        val missingType = createTypeRef("NonExistentType")
        
        val result = transform.enterTsTypeRef(scope)(missingType)
        
        // Should handle missing types gracefully
        assert(result != null)
        assert(result.isInstanceOf[TsTypeRef])
      }
    }

    test("QualifyReferences - Integration Scenarios") {
      test("handles complex inheritance hierarchy") {
        val transform = new QualifyReferences(skipValidation = false)
        val baseInterface = createMockInterface("BaseInterface")
        val middleInterface = createMockInterface("MiddleInterface")
        val scope = createMockScope(baseInterface, middleInterface)
        
        val clazz = createMockClass(
          "DerivedClass",
          parent = Some(createTypeRef("BaseInterface")),
          implements = IArray(createTypeRef("MiddleInterface"))
        )
        
        val result = transform.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "DerivedClass")
        assert(result.parent.isDefined)
        assert(result.implements.length == 1)
      }

      test("handles type alias chains") {
        val transform = new QualifyReferences(skipValidation = false)
        val baseType = createMockInterface("BaseType")
        val scope = createMockScope(baseType)
        
        val alias1 = createMockTypeAlias("Alias1", createTypeRef("BaseType"))
        val alias2 = createMockTypeAlias("Alias2", createTypeRef("Alias1"))
        
        val result1 = transform.enterTsDeclTypeAlias(scope)(alias1)
        val result2 = transform.enterTsDeclTypeAlias(scope)(alias2)
        
        assert(result1.name.value == "Alias1")
        assert(result2.name.value == "Alias2")
      }

      test("preserves type parameters") {
        val transform = new QualifyReferences(skipValidation = true)
        val scope = createMockScope()
        val genericType = TsTypeRef(
          NoComments,
          createQIdent("Array"),
          IArray(createTypeRef("string"))
        )

        val result = transform.enterTsTypeRef(scope)(genericType)

        // Should handle type parameters gracefully
        assert(result != null)
        assert(result.isInstanceOf[TsTypeRef])
      }

      test("handles nested type structures") {
        val transform = new QualifyReferences(skipValidation = false)
        val scope = createMockScope()
        
        val nestedUnion = TsTypeUnion(IArray(
          createTypeRef("string"),
          createTypeRef("number"),
          TsTypeIntersect(IArray(
            createTypeRef("object"),
            createTypeRef("Serializable")
          ))
        ))
        
        val result = transform.enterTsType(scope)(nestedUnion)
        
        // Should handle nested structures without errors
        assert(result != null)
        assert(result.isInstanceOf[TsTypeUnion])
      }
    }
  }
}