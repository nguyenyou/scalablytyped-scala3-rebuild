package org.scalablytyped.converter.internal
package ts

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object ParentsResolverTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)
  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createMockClass(
      name: String,
      parent: Option[TsTypeRef] = None,
      implements: IArray[TsTypeRef] = Empty,
      members: IArray[TsMember] = Empty,
      tparams: IArray[TsTypeParam] = Empty,
      declared: Boolean = false,
      isAbstract: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclClass =
    TsDeclClass(
      comments = comments,
      declared = declared,
      isAbstract = isAbstract,
      name = createSimpleIdent(name),
      tparams = tparams,
      parent = parent,
      implements = implements,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = codePath
    )

  def createMockInterface(
      name: String,
      inheritance: IArray[TsTypeRef] = Empty,
      members: IArray[TsMember] = Empty,
      tparams: IArray[TsTypeParam] = Empty,
      declared: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclInterface =
    TsDeclInterface(
      comments = comments,
      declared = declared,
      name = createSimpleIdent(name),
      tparams = tparams,
      inheritance = inheritance,
      members = members,
      codePath = codePath
    )

  def createMockTypeAlias(
      name: String,
      alias: TsType,
      tparams: IArray[TsTypeParam] = Empty,
      declared: Boolean = false,
      comments: Comments = NoComments,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = comments,
      declared = declared,
      name = createSimpleIdent(name),
      tparams = tparams,
      alias = alias,
      codePath = codePath
    )

  def createMockScope(declarations: TsNamedDecl*): TsTreeScope = {
    val file = TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = IArray.fromArray(declarations.toArray),
      codePath = CodePath.NoPath
    )
    
    val root = TsTreeScope(
      libName = TsIdentLibrarySimple("test-lib"),
      pedantic = false,
      deps = Map.empty,
      logger = Logger.DevNull
    )
    
    root / file
  }

  def tests = Tests {
    test("ParentsResolver - basic functionality") {
      test("returns empty parents for class with no inheritance") {
        val scope = createMockScope()
        val simpleClass = createMockClass("SimpleClass")

        val result = ParentsResolver(scope, simpleClass)

        assert(result.value == simpleClass)
        assert(result.parents.isEmpty)
        assert(result.unresolved.isEmpty)
      }

      test("returns empty parents for interface with no inheritance") {
        val scope = createMockScope()
        val simpleInterface = createMockInterface("SimpleInterface")

        val result = ParentsResolver(scope, simpleInterface)

        assert(result.value == simpleInterface)
        assert(result.parents.isEmpty)
        assert(result.unresolved.isEmpty)
      }

      test("resolves single class parent") {
        val baseClass = createMockClass("BaseClass")
        val scope = createMockScope(baseClass)
        val derivedClass = createMockClass("DerivedClass", parent = Some(TsTypeRef(createQIdent("BaseClass"))))

        val result = ParentsResolver(scope, derivedClass)

        assert(result.value == derivedClass)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "BaseClass")
        assert(result.unresolved.isEmpty)
      }

      test("resolves single interface inheritance") {
        val baseInterface = createMockInterface("BaseInterface")
        val scope = createMockScope(baseInterface)
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("BaseInterface"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "BaseInterface")
        assert(result.unresolved.isEmpty)
      }

      test("resolves class implements interface") {
        val baseInterface = createMockInterface("BaseInterface")
        val scope = createMockScope(baseInterface)
        val implementingClass = createMockClass("ImplementingClass",
          implements = IArray(TsTypeRef(createQIdent("BaseInterface"))))

        val result = ParentsResolver(scope, implementingClass)

        assert(result.value == implementingClass)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "BaseInterface")
        assert(result.unresolved.isEmpty)
      }

      test("resolves multiple interface inheritance") {
        val interface1 = createMockInterface("Interface1")
        val interface2 = createMockInterface("Interface2")
        val scope = createMockScope(interface1, interface2)
        val multiInterface = createMockInterface("MultiInterface",
          inheritance = IArray(
            TsTypeRef(createQIdent("Interface1")),
            TsTypeRef(createQIdent("Interface2"))
          ))

        val result = ParentsResolver(scope, multiInterface)

        assert(result.value == multiInterface)
        assert(result.parents.length == 2)
        val parentNames = result.parents.map(_.asInstanceOf[TsNamedDecl].name.value).toSet
        assert(parentNames.contains("Interface1"))
        assert(parentNames.contains("Interface2"))
        assert(result.unresolved.isEmpty)
      }

      test("resolves class with both parent and implements") {
        val baseClass = createMockClass("BaseClass")
        val baseInterface = createMockInterface("BaseInterface")
        val scope = createMockScope(baseClass, baseInterface)
        val complexClass = createMockClass("ComplexClass",
          parent = Some(TsTypeRef(createQIdent("BaseClass"))),
          implements = IArray(TsTypeRef(createQIdent("BaseInterface"))))

        val result = ParentsResolver(scope, complexClass)

        assert(result.value == complexClass)
        assert(result.parents.length == 2)
        val parentNames = result.parents.map(_.asInstanceOf[TsNamedDecl].name.value).toSet
        assert(parentNames.contains("BaseClass"))
        assert(parentNames.contains("BaseInterface"))
        assert(result.unresolved.isEmpty)
      }
    }

    test("ParentsResolver - unresolved types") {
      test("handles unresolved parent class") {
        val scope = createMockScope()
        val derivedClass = createMockClass("DerivedClass", parent = Some(TsTypeRef(createQIdent("UnknownClass"))))

        val result = ParentsResolver(scope, derivedClass)

        assert(result.value == derivedClass)
        assert(result.parents.isEmpty)
        assert(result.unresolved.length == 1)
        assert(result.unresolved.head.isInstanceOf[TsTypeRef])
        val unresolvedRef = result.unresolved.head.asInstanceOf[TsTypeRef]
        assert(unresolvedRef.name == createQIdent("UnknownClass"))
      }

      test("handles unresolved interface inheritance") {
        val scope = createMockScope()
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("UnknownInterface"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.isEmpty)
        assert(result.unresolved.length == 1)
        assert(result.unresolved.head.isInstanceOf[TsTypeRef])
        val unresolvedRef = result.unresolved.head.asInstanceOf[TsTypeRef]
        assert(unresolvedRef.name == createQIdent("UnknownInterface"))
      }

      test("handles mixed resolved and unresolved parents") {
        val knownInterface = createMockInterface("KnownInterface")
        val scope = createMockScope(knownInterface)
        val mixedInterface = createMockInterface("MixedInterface",
          inheritance = IArray(
            TsTypeRef(createQIdent("KnownInterface")),
            TsTypeRef(createQIdent("UnknownInterface"))
          ))

        val result = ParentsResolver(scope, mixedInterface)

        assert(result.value == mixedInterface)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "KnownInterface")
        assert(result.unresolved.length == 1)
        val unresolvedRef = result.unresolved.head.asInstanceOf[TsTypeRef]
        assert(unresolvedRef.name == createQIdent("UnknownInterface"))
      }
    }

    test("ParentsResolver - type aliases") {
      test("resolves type alias to interface") {
        val baseInterface = createMockInterface("BaseInterface")
        val typeAlias = createMockTypeAlias("InterfaceAlias", TsTypeRef(createQIdent("BaseInterface")))
        val scope = createMockScope(baseInterface, typeAlias)
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("InterfaceAlias"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "BaseInterface")
        assert(result.unresolved.isEmpty)
      }

      test("resolves type alias to class") {
        val baseClass = createMockClass("BaseClass")
        val typeAlias = createMockTypeAlias("ClassAlias", TsTypeRef(createQIdent("BaseClass")))
        val scope = createMockScope(baseClass, typeAlias)
        val derivedClass = createMockClass("DerivedClass", parent = Some(TsTypeRef(createQIdent("ClassAlias"))))

        val result = ParentsResolver(scope, derivedClass)

        assert(result.value == derivedClass)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "BaseClass")
        assert(result.unresolved.isEmpty)
      }

      test("resolves type alias to object type") {
        val objectType = TsTypeObject(NoComments, Empty)
        val typeAlias = createMockTypeAlias("ObjectAlias", objectType)
        val scope = createMockScope(typeAlias)
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("ObjectAlias"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.length == 1)
        // Should create a synthetic interface for the object type
        assert(result.parents.head.isInstanceOf[TsDeclInterface])
        assert(result.unresolved.isEmpty)
      }

      test("handles type alias to union type") {
        val interface1 = createMockInterface("Interface1")
        val interface2 = createMockInterface("Interface2")
        val unionType = TsTypeUnion(IArray(
          TsTypeRef(createQIdent("Interface1")),
          TsTypeRef(createQIdent("Interface2"))
        ))
        val typeAlias = createMockTypeAlias("UnionAlias", unionType)
        val scope = createMockScope(interface1, interface2, typeAlias)
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("UnionAlias"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.length == 2)
        val parentNames = result.parents.map(_.asInstanceOf[TsNamedDecl].name.value).toSet
        assert(parentNames.contains("Interface1"))
        assert(parentNames.contains("Interface2"))
        assert(result.unresolved.isEmpty)
      }

      test("handles type alias to intersection type") {
        val interface1 = createMockInterface("Interface1")
        val interface2 = createMockInterface("Interface2")
        val intersectionType = TsTypeIntersect(IArray(
          TsTypeRef(createQIdent("Interface1")),
          TsTypeRef(createQIdent("Interface2"))
        ))
        val typeAlias = createMockTypeAlias("IntersectionAlias", intersectionType)
        val scope = createMockScope(interface1, interface2, typeAlias)
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("IntersectionAlias"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.length == 2)
        val parentNames = result.parents.map(_.asInstanceOf[TsNamedDecl].name.value).toSet
        assert(parentNames.contains("Interface1"))
        assert(parentNames.contains("Interface2"))
        assert(result.unresolved.isEmpty)
      }

      test("handles type alias to unresolved type") {
        val typeAlias = createMockTypeAlias("UnresolvedAlias", TsTypeRef(createQIdent("UnknownType")))
        val scope = createMockScope(typeAlias)
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("UnresolvedAlias"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.isEmpty)
        assert(result.unresolved.length == 1)
        val unresolvedRef = result.unresolved.head.asInstanceOf[TsTypeRef]
        assert(unresolvedRef.name == createQIdent("UnknownType"))
      }
    }

    test("ParentsResolver - circular inheritance detection") {
      test("handles direct circular inheritance") {
        // Create A -> A circular reference
        val circularInterface = createMockInterface("CircularInterface",
          inheritance = IArray(TsTypeRef(createQIdent("CircularInterface"))))
        val scope = createMockScope(circularInterface)

        val result = ParentsResolver(scope, circularInterface)

        // ParentsResolver includes circular parents but prevents infinite recursion
        assert(result.value == circularInterface)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "CircularInterface")
        assert(result.unresolved.isEmpty)
      }

      test("handles indirect circular inheritance") {
        // Create A -> B -> A circular reference
        val interfaceA = createMockInterface("InterfaceA",
          inheritance = IArray(TsTypeRef(createQIdent("InterfaceB"))))
        val interfaceB = createMockInterface("InterfaceB",
          inheritance = IArray(TsTypeRef(createQIdent("InterfaceA"))))
        val scope = createMockScope(interfaceA, interfaceB)

        val result = ParentsResolver(scope, interfaceA)

        // ParentsResolver includes circular parents but prevents infinite recursion
        assert(result.value == interfaceA)
        assert(result.parents.length == 2)
        val parentNames = result.parents.map(_.asInstanceOf[TsNamedDecl].name.value).toSet
        assert(parentNames.contains("InterfaceA"))
        assert(parentNames.contains("InterfaceB"))
        assert(result.unresolved.isEmpty)
      }

      test("handles complex circular inheritance chain") {
        // Create A -> B -> C -> A circular reference
        val interfaceA = createMockInterface("InterfaceA",
          inheritance = IArray(TsTypeRef(createQIdent("InterfaceB"))))
        val interfaceB = createMockInterface("InterfaceB",
          inheritance = IArray(TsTypeRef(createQIdent("InterfaceC"))))
        val interfaceC = createMockInterface("InterfaceC",
          inheritance = IArray(TsTypeRef(createQIdent("InterfaceA"))))
        val scope = createMockScope(interfaceA, interfaceB, interfaceC)

        val result = ParentsResolver(scope, interfaceA)

        // ParentsResolver includes circular parents but prevents infinite recursion
        assert(result.value == interfaceA)
        assert(result.parents.length == 3)
        val parentNames = result.parents.map(_.asInstanceOf[TsNamedDecl].name.value).toSet
        assert(parentNames.contains("InterfaceA"))
        assert(parentNames.contains("InterfaceB"))
        assert(parentNames.contains("InterfaceC"))
        assert(result.unresolved.isEmpty)
      }

      test("handles circular inheritance through type alias") {
        // Create A -> Alias -> A circular reference
        val interfaceA = createMockInterface("InterfaceA",
          inheritance = IArray(TsTypeRef(createQIdent("AliasToA"))))
        val typeAlias = createMockTypeAlias("AliasToA", TsTypeRef(createQIdent("InterfaceA")))
        val scope = createMockScope(interfaceA, typeAlias)

        val result = ParentsResolver(scope, interfaceA)

        // ParentsResolver includes circular parents through alias
        assert(result.value == interfaceA)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "InterfaceA")
        assert(result.unresolved.isEmpty)
      }
    }

    test("ParentsResolver - nested inheritance") {
      test("resolves deep inheritance chain") {
        val baseInterface = createMockInterface("BaseInterface")
        val level1Interface = createMockInterface("Level1Interface",
          inheritance = IArray(TsTypeRef(createQIdent("BaseInterface"))))
        val level2Interface = createMockInterface("Level2Interface",
          inheritance = IArray(TsTypeRef(createQIdent("Level1Interface"))))
        val level3Interface = createMockInterface("Level3Interface",
          inheritance = IArray(TsTypeRef(createQIdent("Level2Interface"))))
        val scope = createMockScope(baseInterface, level1Interface, level2Interface, level3Interface)

        val result = ParentsResolver(scope, level3Interface)

        assert(result.value == level3Interface)
        assert(result.parents.length == 3) // Should include all ancestors
        val parentNames = result.parents.map(_.asInstanceOf[TsNamedDecl].name.value).toSet
        assert(parentNames.contains("BaseInterface"))
        assert(parentNames.contains("Level1Interface"))
        assert(parentNames.contains("Level2Interface"))
        assert(result.unresolved.isEmpty)
      }

      test("resolves diamond inheritance pattern") {
        val baseInterface = createMockInterface("BaseInterface")
        val leftInterface = createMockInterface("LeftInterface",
          inheritance = IArray(TsTypeRef(createQIdent("BaseInterface"))))
        val rightInterface = createMockInterface("RightInterface",
          inheritance = IArray(TsTypeRef(createQIdent("BaseInterface"))))
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(
            TsTypeRef(createQIdent("LeftInterface")),
            TsTypeRef(createQIdent("RightInterface"))
          ))
        val scope = createMockScope(baseInterface, leftInterface, rightInterface, derivedInterface)

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.length == 3) // Should include all unique ancestors
        val parentNames = result.parents.map(_.asInstanceOf[TsNamedDecl].name.value).toSet
        assert(parentNames.contains("BaseInterface"))
        assert(parentNames.contains("LeftInterface"))
        assert(parentNames.contains("RightInterface"))
        assert(result.unresolved.isEmpty)
      }

      test("resolves mixed class and interface inheritance") {
        val baseClass = createMockClass("BaseClass")
        val baseInterface = createMockInterface("BaseInterface")
        val middleClass = createMockClass("MiddleClass", parent = Some(TsTypeRef(createQIdent("BaseClass"))))
        val derivedClass = createMockClass("DerivedClass",
          parent = Some(TsTypeRef(createQIdent("MiddleClass"))),
          implements = IArray(TsTypeRef(createQIdent("BaseInterface"))))
        val scope = createMockScope(baseClass, baseInterface, middleClass, derivedClass)

        val result = ParentsResolver(scope, derivedClass)

        assert(result.value == derivedClass)
        assert(result.parents.length == 3) // Should include all ancestors
        val parentNames = result.parents.map(_.asInstanceOf[TsNamedDecl].name.value).toSet
        assert(parentNames.contains("BaseClass"))
        assert(parentNames.contains("BaseInterface"))
        assert(parentNames.contains("MiddleClass"))
        assert(result.unresolved.isEmpty)
      }
    }

    test("ParentsResolver - edge cases and error handling") {
      test("handles empty inheritance arrays") {
        val emptyClass = createMockClass("EmptyClass", parent = None, implements = Empty)
        val emptyInterface = createMockInterface("EmptyInterface", inheritance = Empty)
        val scope = createMockScope(emptyClass, emptyInterface)

        val classResult = ParentsResolver(scope, emptyClass)
        val interfaceResult = ParentsResolver(scope, emptyInterface)

        assert(classResult.value == emptyClass)
        assert(classResult.parents.isEmpty)
        assert(classResult.unresolved.isEmpty)

        assert(interfaceResult.value == emptyInterface)
        assert(interfaceResult.parents.isEmpty)
        assert(interfaceResult.unresolved.isEmpty)
      }

      test("handles type parameters in inheritance") {
        val genericInterface = createMockInterface("GenericInterface",
          inheritance = IArray(TsTypeRef(NoComments, createQIdent("BaseInterface"), IArray(TsTypeRef.string))))
        val baseInterface = createMockInterface("BaseInterface")
        val scope = createMockScope(baseInterface, genericInterface)

        val result = ParentsResolver(scope, genericInterface)

        assert(result.value == genericInterface)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "BaseInterface")
        assert(result.unresolved.isEmpty)
      }

      test("handles complex nested type alias chains") {
        val baseInterface = createMockInterface("BaseInterface")
        val alias1 = createMockTypeAlias("Alias1", TsTypeRef(createQIdent("BaseInterface")))
        val alias2 = createMockTypeAlias("Alias2", TsTypeRef(createQIdent("Alias1")))
        val alias3 = createMockTypeAlias("Alias3", TsTypeRef(createQIdent("Alias2")))
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("Alias3"))))
        val scope = createMockScope(baseInterface, alias1, alias2, alias3, derivedInterface)

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "BaseInterface")
        assert(result.unresolved.isEmpty)
      }

      test("handles type alias to primitive types") {
        val primitiveAlias = createMockTypeAlias("StringAlias", TsTypeRef.string)
        val scope = createMockScope(primitiveAlias)
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("StringAlias"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.isEmpty)
        assert(result.unresolved.length == 1)
        assert(result.unresolved.head == TsTypeRef.string)
      }

      test("handles type alias to literal types") {
        val literalAlias = createMockTypeAlias("LiteralAlias", TsTypeLiteral(TsLiteral.Str("hello")))
        val scope = createMockScope(literalAlias)
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("LiteralAlias"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.isEmpty)
        assert(result.unresolved.length == 1)
        assert(result.unresolved.head.isInstanceOf[TsTypeLiteral])
      }

      test("handles mixed union with resolved and unresolved types") {
        val knownInterface = createMockInterface("KnownInterface")
        val mixedUnion = TsTypeUnion(IArray(
          TsTypeRef(createQIdent("KnownInterface")),
          TsTypeRef(createQIdent("UnknownInterface")),
          TsTypeRef.string
        ))
        val unionAlias = createMockTypeAlias("MixedUnionAlias", mixedUnion)
        val scope = createMockScope(knownInterface, unionAlias)
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("MixedUnionAlias"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.length == 1)
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "KnownInterface")
        assert(result.unresolved.length == 2) // UnknownInterface and string
        val unresolvedTypes = result.unresolved.toSet
        assert(unresolvedTypes.contains(TsTypeRef(createQIdent("UnknownInterface"))))
        assert(unresolvedTypes.contains(TsTypeRef.string))
      }

      test("handles empty object type in type alias") {
        val emptyObjectAlias = createMockTypeAlias("EmptyObjectAlias", TsTypeObject(NoComments, Empty))
        val scope = createMockScope(emptyObjectAlias)
        val derivedInterface = createMockInterface("DerivedInterface",
          inheritance = IArray(TsTypeRef(createQIdent("EmptyObjectAlias"))))

        val result = ParentsResolver(scope, derivedInterface)

        assert(result.value == derivedInterface)
        assert(result.parents.length == 1)
        // Should create a synthetic interface for the empty object type
        assert(result.parents.head.isInstanceOf[TsDeclInterface])
        val syntheticInterface = result.parents.head.asInstanceOf[TsDeclInterface]
        assert(syntheticInterface.members.isEmpty)
        assert(result.unresolved.isEmpty)
      }

      test("handles large inheritance hierarchies efficiently") {
        // Create a chain of 20 interfaces
        val interfaces = (0 to 19).map { i =>
          if (i == 0) {
            createMockInterface(s"Interface$i")
          } else {
            createMockInterface(s"Interface$i", inheritance = IArray(TsTypeRef(createQIdent(s"Interface${i-1}"))))
          }
        }
        val scope = createMockScope(interfaces*)

        val result = ParentsResolver(scope, interfaces.last)

        assert(result.value == interfaces.last)
        assert(result.parents.length == 19) // Should include all ancestors except itself
        val parentNames = result.parents.map(_.asInstanceOf[TsNamedDecl].name.value).toSet
        (0 to 18).foreach { i =>
          assert(parentNames.contains(s"Interface$i"))
        }
        assert(result.unresolved.isEmpty)
      }

      test("handles multiple inheritance with duplicates") {
        val baseInterface = createMockInterface("BaseInterface")
        val scope = createMockScope(baseInterface)
        val multiInterface = createMockInterface("MultiInterface",
          inheritance = IArray(
            TsTypeRef(createQIdent("BaseInterface")),
            TsTypeRef(createQIdent("BaseInterface")), // Duplicate
            TsTypeRef(createQIdent("BaseInterface"))  // Another duplicate
          ))

        val result = ParentsResolver(scope, multiInterface)

        assert(result.value == multiInterface)
        assert(result.parents.length == 1) // Should deduplicate
        assert(result.parents.head.asInstanceOf[TsNamedDecl].name.value == "BaseInterface")
        assert(result.unresolved.isEmpty)
      }
    }
  }
}