package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object RemoveDifficultInheritanceTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMockInterface(
    name: String,
    inheritance: IArray[TsTypeRef] = Empty,
    members: IArray[TsMember] = Empty
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = inheritance,
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

  def createMemberProperty(name: String, tpe: TsType = createTypeRef("string")): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(tpe),
      expr = None,
      isStatic = false,
      isReadOnly = false
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
    test("RemoveDifficultInheritance - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(RemoveDifficultInheritance.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsDeclClass method") {
        val scope = createMockScope()
        val clazz = createMockClass("TestClass")
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        assert(result != null)
        assert(result.isInstanceOf[TsDeclClass])
      }

      test("has enterTsDeclInterface method") {
        val scope = createMockScope()
        val interface = createMockInterface("TestInterface")
        val result = RemoveDifficultInheritance.enterTsDeclInterface(scope)(interface)
        assert(result != null)
        assert(result.isInstanceOf[TsDeclInterface])
      }
    }

    test("RemoveDifficultInheritance - Res Case Class") {
      test("has correct structure") {
        val res = RemoveDifficultInheritance.Res(Empty, Empty, Map.empty)
        assert(res.keep.isEmpty)
        assert(res.drop.isEmpty)
        assert(res.lift.isEmpty)
      }

      test("combines multiple Res instances") {
        val typeRef1 = createTypeRef("Type1")
        val typeRef2 = createTypeRef("Type2")
        val dropType = createTypeRef("DropType")
        val member = createMemberProperty("prop")
        
        val res1 = RemoveDifficultInheritance.Res(IArray(typeRef1), Empty, Map.empty)
        val res2 = RemoveDifficultInheritance.Res(IArray(typeRef2), IArray(dropType), Map(typeRef1 -> IArray(member)))
        
        val combined = RemoveDifficultInheritance.Res.combine(IArray(res1, res2))
        
        assert(combined.keep.length == 2)
        assert(combined.keep.contains(typeRef1))
        assert(combined.keep.contains(typeRef2))
        assert(combined.drop.length == 1)
        assert(combined.drop.contains(dropType))
        assert(combined.lift.contains(typeRef1))
        assert(combined.lift(typeRef1).contains(member))
      }

      test("handles empty array") {
        val combined = RemoveDifficultInheritance.Res.combine(Empty)
        assert(combined.keep.isEmpty)
        assert(combined.drop.isEmpty)
        assert(combined.lift.isEmpty)
      }
    }

    test("RemoveDifficultInheritance - Class Processing") {
      test("leaves class with no inheritance unchanged") {
        val scope = createMockScope()
        val clazz = createMockClass("TestClass")
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isEmpty)
        assert(result.implements.isEmpty)
        assert(result.members == clazz.members)
      }

      test("drops problematic parent types") {
        val scope = createMockScope()
        val clazz = createMockClass(
          "TestClass",
          parent = Some(TsTypeRef.`object`),
          implements = IArray(TsTypeRef.Object, TsTypeRef.any)
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isEmpty)
        assert(result.implements.isEmpty)
        // Should have warning comments about dropped types
        assert(result.comments.cs.exists {
          case Comment.Raw(text) => text.contains("warning")
          case _ => false
        })
      }

      test("keeps valid parent types") {
        val validInterface = createMockInterface("ValidInterface")
        val scope = createMockScope(validInterface)
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("ValidInterface"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined)
        assert(result.parent.get.name.parts.head.value == "ValidInterface")
      }

      test("handles type alias inlining") {
        val targetInterface = createMockInterface("TargetInterface")
        val typeAlias = createMockTypeAlias("AliasType", createTypeRef("TargetInterface"))
        val scope = createMockScope(targetInterface, typeAlias)
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("AliasType"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        // Should inline the type alias and point to the target
        assert(result.parent.isDefined)
      }

      test("lifts members from object types") {
        val objMember = createMemberProperty("liftedProp", createTypeRef("string"))
        val objType = TsTypeObject(NoComments, IArray(objMember))
        val typeAlias = createMockTypeAlias("ObjectAlias", objType)
        val scope = createMockScope(typeAlias)
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("ObjectAlias"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isEmpty) // Object type parent is dropped
        assert(result.members.length == 1) // Member is lifted
        assert(result.members.head.asInstanceOf[TsMemberProperty].name.value == "liftedProp")
      }

      test("handles intersection types") {
        val interface1 = createMockInterface("Interface1")
        val interface2 = createMockInterface("Interface2")
        val objMember = createMemberProperty("objProp")
        val objType = TsTypeObject(NoComments, IArray(objMember))
        val intersectionType = TsTypeIntersect(IArray(
          createTypeRef("Interface1"),
          createTypeRef("Interface2"),
          objType
        ))
        val typeAlias = createMockTypeAlias("IntersectionAlias", intersectionType)
        val scope = createMockScope(interface1, interface2, typeAlias)
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("IntersectionAlias"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        // Should keep valid interface references and lift object members
        assert(result.parent.isDefined || result.implements.nonEmpty)
        assert(result.members.exists(_.asInstanceOf[TsMemberProperty].name.value == "objProp"))
      }
    }

    test("RemoveDifficultInheritance - Interface Processing") {
      test("leaves interface with no inheritance unchanged") {
        val scope = createMockScope()
        val interface = createMockInterface("TestInterface")
        
        val result = RemoveDifficultInheritance.enterTsDeclInterface(scope)(interface)
        
        assert(result.name.value == "TestInterface")
        assert(result.inheritance.isEmpty)
        assert(result.members == interface.members)
      }

      test("drops problematic inheritance types") {
        val scope = createMockScope()
        val interface = createMockInterface(
          "TestInterface",
          inheritance = IArray(TsTypeRef.`object`, TsTypeRef.Object, TsTypeRef.any)
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclInterface(scope)(interface)
        
        assert(result.name.value == "TestInterface")
        assert(result.inheritance.isEmpty)
        // Should have warning comments about dropped types
        assert(result.comments.cs.exists {
          case Comment.Raw(text) => text.contains("warning")
          case _ => false
        })
      }

      test("keeps valid inheritance types") {
        val validInterface = createMockInterface("ValidInterface")
        val scope = createMockScope(validInterface)
        val interface = createMockInterface(
          "TestInterface",
          inheritance = IArray(createTypeRef("ValidInterface"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclInterface(scope)(interface)
        
        assert(result.name.value == "TestInterface")
        assert(result.inheritance.length == 1)
        assert(result.inheritance.head.name.parts.head.value == "ValidInterface")
      }

      test("handles thin interface inlining") {
        val targetInterface = createMockInterface("TargetInterface")
        val thinInterface = createMockInterface(
          "ThinInterface",
          inheritance = IArray(createTypeRef("TargetInterface"))
        )
        val scope = createMockScope(targetInterface, thinInterface)
        val interface = createMockInterface(
          "TestInterface",
          inheritance = IArray(createTypeRef("ThinInterface"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclInterface(scope)(interface)
        
        assert(result.name.value == "TestInterface")
        // Should inline the thin interface
        assert(result.inheritance.nonEmpty)
      }

      test("lifts members from object type inheritance") {
        val objMember = createMemberProperty("inheritedProp")
        val objType = TsTypeObject(NoComments, IArray(objMember))
        val typeAlias = createMockTypeAlias("ObjectAlias", objType)
        val scope = createMockScope(typeAlias)
        val interface = createMockInterface(
          "TestInterface",
          inheritance = IArray(createTypeRef("ObjectAlias"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclInterface(scope)(interface)
        
        assert(result.name.value == "TestInterface")
        assert(result.inheritance.isEmpty) // Object type inheritance is dropped
        assert(result.members.length == 1) // Member is lifted
        assert(result.members.head.asInstanceOf[TsMemberProperty].name.value == "inheritedProp")
      }
    }

    test("RemoveDifficultInheritance - Edge Cases") {
      test("handles union types in type aliases") {
        val unionType = TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number")))
        val typeAlias = createMockTypeAlias("UnionAlias", unionType)
        val scope = createMockScope(typeAlias)
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("UnionAlias"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isEmpty) // Union type parent is dropped
        // Should have warning comment about dropped union type
        assert(result.comments.cs.exists {
          case Comment.Raw(text) => text.contains("warning")
          case _ => false
        })
      }

      test("handles function types in type aliases") {
        val funSig = TsFunSig(NoComments, Empty, Empty, Some(createTypeRef("void")))
        val funType = TsTypeFunction(funSig)
        val typeAlias = createMockTypeAlias("FunctionAlias", funType)
        val scope = createMockScope(typeAlias)
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("FunctionAlias"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined) // Function type parent is kept
        assert(result.parent.get.name.parts.head.value == "FunctionAlias")
      }

      test("handles dictionary object types") {
        val indexMember = TsMemberIndex(
          comments = NoComments,
          isReadOnly = false,
          level = TsProtectionLevel.Default,
          indexing = Indexing.Dict(createSimpleIdent("key"), createTypeRef("string")),
          valueType = Some(createTypeRef("any"))
        )
        val dictType = TsTypeObject(NoComments, IArray(indexMember))
        val typeAlias = createMockTypeAlias("DictAlias", dictType)
        val scope = createMockScope(typeAlias)
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("DictAlias"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined) // Dictionary type parent is kept
      }

      test("handles missing type references") {
        val scope = createMockScope()
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("NonExistentType"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        assert(result.name.value == "TestClass")
        assert(result.parent.isDefined) // Unknown type is kept as-is
        assert(result.parent.get.name.parts.head.value == "NonExistentType")
      }
    }

    test("RemoveDifficultInheritance - Comment Generation") {
      test("generates warning comments for dropped types") {
        val scope = createMockScope()
        val clazz = createMockClass(
          "TestClass",
          parent = Some(TsTypeRef.any),
          implements = IArray(TsTypeRef.`object`)
        )

        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)

        assert(result.comments.cs.exists {
          case Comment.Raw(text) => text.contains("warning") && text.contains("Dropped")
          case _ => false
        })
      }

      test("generates comments for lifted members") {
        val objMember1 = createMemberProperty("prop1")
        val objMember2 = createMemberProperty("prop2")
        val objType = TsTypeObject(NoComments, IArray(objMember1, objMember2))
        val typeAlias = createMockTypeAlias("ObjectAlias", objType)
        val scope = createMockScope(typeAlias)
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("ObjectAlias"))
        )

        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)

        assert(result.comments.cs.exists {
          case Comment.Raw(text) => text.contains("warning") && text.contains("Lifted") && text.contains("2 members")
          case _ => false
        })
      }

      test("does not generate comments when no changes") {
        val validInterface = createMockInterface("ValidInterface")
        val scope = createMockScope(validInterface)
        val clazz = createMockClass(
          "TestClass",
          parent = Some(createTypeRef("ValidInterface"))
        )
        
        val result = RemoveDifficultInheritance.enterTsDeclClass(scope)(clazz)
        
        // Should not add warning comments when no problematic inheritance
        assert(!result.comments.cs.exists {
          case Comment.Raw(text) => text.contains("warning")
          case _ => false
        })
      }
    }
  }
}