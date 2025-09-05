package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object MoveStaticsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMockInterface(
    name: String,
    members: IArray[TsMember] = Empty,
    declared: Boolean = false
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = declared,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = Empty,
      members = members,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockClass(
    name: String,
    members: IArray[TsMember] = Empty,
    declared: Boolean = false
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = declared,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      parent = None,
      implements = Empty,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockScope(declarations: TsContainerOrDecl*): TsTreeScope = {
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

  def createStaticProperty(name: String): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(createTypeRef("string")),
      expr = None,
      isStatic = true,
      isReadOnly = false
    )

  def createNonStaticProperty(name: String): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(createTypeRef("string")),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createStaticFunction(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(createTypeRef("void"))
      ),
      isStatic = true,
      isReadOnly = false
    )

  def createNonStaticFunction(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(createTypeRef("void"))
      ),
      isStatic = false,
      isReadOnly = false
    )

  def tests = Tests {
    test("MoveStatics - Basic Functionality") {
      test("extends TransformMembers") {
        assert(MoveStatics.isInstanceOf[TransformMembers])
      }

      test("has newMembers method") {
        val scope = createMockScope()
        val parsedFile = TsParsedFile(NoComments, Empty, Empty, CodePath.NoPath)
        val result = MoveStatics.newMembers(scope, parsedFile)
        assert(result != null)
        assert(result.isInstanceOf[IArray[TsContainerOrDecl]])
      }

      test("has extractStatics method") {
        val staticProp = createStaticProperty("staticProp")
        val nonStaticProp = createNonStaticProperty("nonStaticProp")
        val members = IArray[TsMember](staticProp, nonStaticProp)
        val comment = Comment("test comment")
        
        val (statics, nonStatics) = MoveStatics.extractStatics(members, comment)
        
        assert(statics.length == 1)
        assert(nonStatics.length == 1)
        assert(statics.head.asInstanceOf[TsMemberProperty].name.value == "staticProp")
        assert(nonStatics.head.asInstanceOf[TsMemberProperty].name.value == "nonStaticProp")
      }
    }

    test("MoveStatics - Interface Processing") {
      test("leaves interface without static members unchanged") {
        val scope = createMockScope()
        val nonStaticProp = createNonStaticProperty("instanceProp")
        val nonStaticFunc = createNonStaticFunction("instanceMethod")
        val interface = createMockInterface("TestInterface", IArray(nonStaticProp, nonStaticFunc))
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(interface), CodePath.NoPath)
        
        val result = MoveStatics.newMembers(scope, parsedFile)
        
        assert(result.length == 1)
        assert(result.head == interface)
      }

      test("extracts static members from interface into namespace") {
        val scope = createMockScope()
        val staticProp = createStaticProperty("staticProp")
        val staticFunc = createStaticFunction("staticMethod")
        val nonStaticProp = createNonStaticProperty("instanceProp")
        val interface = createMockInterface("TestInterface", IArray(staticProp, staticFunc, nonStaticProp))
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(interface), CodePath.NoPath)
        
        val result = MoveStatics.newMembers(scope, parsedFile)
        
        assert(result.length == 2)
        
        // First should be the modified interface
        val modifiedInterface = result.head.asInstanceOf[TsDeclInterface]
        assert(modifiedInterface.name.value == "TestInterface")
        assert(modifiedInterface.members.length == 1)
        assert(modifiedInterface.members.head.asInstanceOf[TsMemberProperty].name.value == "instanceProp")
        assert(modifiedInterface.comments.cs.exists {
          case Comment.Raw(text) => text.contains("Note: this doesnt actually exist!")
          case _ => false
        })
        
        // Second should be the namespace with static members
        val namespace = result(1).asInstanceOf[TsDeclNamespace]
        assert(namespace.name.value == "TestInterface")
        assert(namespace.members.length == 2)
      }

      test("preserves interface metadata when extracting statics") {
        val scope = createMockScope()
        val originalComments = Comments(Comment("Original interface comment"))
        val staticProp = createStaticProperty("staticProp")
        val interface = TsDeclInterface(
          comments = originalComments,
          declared = true,
          name = createSimpleIdent("TestInterface"),
          tparams = Empty,
          inheritance = Empty,
          members = IArray(staticProp),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("TestInterface"))
        )
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(interface), CodePath.NoPath)
        
        val result = MoveStatics.newMembers(scope, parsedFile)
        
        assert(result.length == 2)
        val modifiedInterface = result.head.asInstanceOf[TsDeclInterface]
        assert(modifiedInterface.declared == true)
        assert(modifiedInterface.comments.cs.length == 2) // Original + added comment
      }
    }

    test("MoveStatics - Class Processing") {
      test("leaves class without static members unchanged") {
        val scope = createMockScope()
        val nonStaticProp = createNonStaticProperty("instanceProp")
        val nonStaticFunc = createNonStaticFunction("instanceMethod")
        val clazz = createMockClass("TestClass", IArray(nonStaticProp, nonStaticFunc))
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(clazz), CodePath.NoPath)
        
        val result = MoveStatics.newMembers(scope, parsedFile)
        
        assert(result.length == 1)
        assert(result.head == clazz)
      }

      test("extracts static members from class into namespace") {
        val scope = createMockScope()
        val staticProp = createStaticProperty("staticProp")
        val staticFunc = createStaticFunction("staticMethod")
        val nonStaticProp = createNonStaticProperty("instanceProp")
        val clazz = createMockClass("TestClass", IArray(staticProp, staticFunc, nonStaticProp))
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(clazz), CodePath.NoPath)
        
        val result = MoveStatics.newMembers(scope, parsedFile)
        
        assert(result.length == 2)
        
        // First should be the modified class
        val modifiedClass = result.head.asInstanceOf[TsDeclClass]
        assert(modifiedClass.name.value == "TestClass")
        assert(modifiedClass.members.length == 1)
        assert(modifiedClass.members.head.asInstanceOf[TsMemberProperty].name.value == "instanceProp")
        
        // Second should be the namespace with static members
        val namespace = result(1).asInstanceOf[TsDeclNamespace]
        assert(namespace.name.value == "TestClass")
        assert(namespace.members.length == 2)
      }

      test("preserves class metadata when extracting statics") {
        val scope = createMockScope()
        val originalComments = Comments(Comment("Original class comment"))
        val staticProp = createStaticProperty("staticProp")
        val clazz = TsDeclClass(
          comments = originalComments,
          declared = true,
          isAbstract = true,
          name = createSimpleIdent("TestClass"),
          tparams = Empty,
          parent = Some(createTypeRef("BaseClass")),
          implements = IArray(createTypeRef("Interface1")),
          members = IArray(staticProp),
          jsLocation = JsLocation.Zero,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("TestClass"))
        )
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(clazz), CodePath.NoPath)
        
        val result = MoveStatics.newMembers(scope, parsedFile)
        
        assert(result.length == 2)
        val modifiedClass = result.head.asInstanceOf[TsDeclClass]
        assert(modifiedClass.declared == true)
        assert(modifiedClass.isAbstract == true)
        assert(modifiedClass.parent.isDefined)
        assert(modifiedClass.implements.nonEmpty)
        assert(modifiedClass.comments == originalComments) // Class comments unchanged
      }
    }

    test("MoveStatics - Static Member Extraction") {
      test("extracts static properties correctly") {
        val staticProp1 = createStaticProperty("prop1")
        val staticProp2 = createStaticProperty("prop2")
        val nonStaticProp = createNonStaticProperty("instanceProp")
        val members = IArray[TsMember](staticProp1, staticProp2, nonStaticProp)
        val comment = Comment("static comment")
        
        val (statics, nonStatics) = MoveStatics.extractStatics(members, comment)
        
        assert(statics.length == 2)
        assert(nonStatics.length == 1)
        
        // Check that static flag is removed and comment is added
        val extractedProp1 = statics.head.asInstanceOf[TsMemberProperty]
        assert(!extractedProp1.isStatic)
        assert(extractedProp1.comments.cs.contains(comment))
        assert(extractedProp1.name.value == "prop1")
      }

      test("extracts static functions correctly") {
        val staticFunc1 = createStaticFunction("method1")
        val staticFunc2 = createStaticFunction("method2")
        val nonStaticFunc = createNonStaticFunction("instanceMethod")
        val members = IArray[TsMember](staticFunc1, staticFunc2, nonStaticFunc)
        val comment = Comment("static comment")
        
        val (statics, nonStatics) = MoveStatics.extractStatics(members, comment)
        
        assert(statics.length == 2)
        assert(nonStatics.length == 1)
        
        // Check that static flag is removed and comment is added
        val extractedFunc1 = statics.head.asInstanceOf[TsMemberFunction]
        assert(!extractedFunc1.isStatic)
        assert(extractedFunc1.comments.cs.contains(comment))
        assert(extractedFunc1.name.value == "method1")
      }

      test("handles mixed static and non-static members") {
        val staticProp = createStaticProperty("staticProp")
        val staticFunc = createStaticFunction("staticMethod")
        val nonStaticProp = createNonStaticProperty("instanceProp")
        val nonStaticFunc = createNonStaticFunction("instanceMethod")
        val members = IArray[TsMember](staticProp, nonStaticProp, staticFunc, nonStaticFunc)
        val comment = Comment("static comment")
        
        val (statics, nonStatics) = MoveStatics.extractStatics(members, comment)
        
        assert(statics.length == 2)
        assert(nonStatics.length == 2)
        
        // Verify static members are correctly processed
        assert(statics.forall {
          case prop: TsMemberProperty => !prop.isStatic && prop.comments.cs.contains(comment)
          case func: TsMemberFunction => !func.isStatic && func.comments.cs.contains(comment)
          case _ => false
        })

        // Verify non-static members are unchanged
        assert(nonStatics.forall {
          case prop: TsMemberProperty => !prop.isStatic && !prop.comments.cs.contains(comment)
          case func: TsMemberFunction => !func.isStatic && !func.comments.cs.contains(comment)
          case _ => false
        })
      }

      test("handles empty member list") {
        val members = Empty
        val comment = Comment("static comment")
        
        val (statics, nonStatics) = MoveStatics.extractStatics(members, comment)
        
        assert(statics.isEmpty)
        assert(nonStatics.isEmpty)
      }

      test("handles all non-static members") {
        val nonStaticProp = createNonStaticProperty("instanceProp")
        val nonStaticFunc = createNonStaticFunction("instanceMethod")
        val members = IArray[TsMember](nonStaticProp, nonStaticFunc)
        val comment = Comment("static comment")
        
        val (statics, nonStatics) = MoveStatics.extractStatics(members, comment)
        
        assert(statics.isEmpty)
        assert(nonStatics.length == 2)
        assert(nonStatics == members)
      }

      test("handles all static members") {
        val staticProp = createStaticProperty("staticProp")
        val staticFunc = createStaticFunction("staticMethod")
        val members = IArray[TsMember](staticProp, staticFunc)
        val comment = Comment("static comment")
        
        val (statics, nonStatics) = MoveStatics.extractStatics(members, comment)
        
        assert(statics.length == 2)
        assert(nonStatics.isEmpty)
        
        // All members should be converted to non-static with comments
        assert(statics.forall {
          case prop: TsMemberProperty => !prop.isStatic && prop.comments.cs.contains(comment)
          case func: TsMemberFunction => !func.isStatic && func.comments.cs.contains(comment)
          case _ => false
        })
      }
    }

    test("MoveStatics - Edge Cases and Integration") {
      test("leaves other declaration types unchanged") {
        val scope = createMockScope()
        val typeAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("TestAlias"),
          tparams = Empty,
          alias = createTypeRef("string"),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("TestAlias"))
        )
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(typeAlias), CodePath.NoPath)
        
        val result = MoveStatics.newMembers(scope, parsedFile)
        
        assert(result.length == 1)
        assert(result.head == typeAlias)
      }

      test("handles multiple classes and interfaces") {
        val scope = createMockScope()
        val staticProp1 = createStaticProperty("staticProp1")
        val staticProp2 = createStaticProperty("staticProp2")
        val interface = createMockInterface("TestInterface", IArray(staticProp1))
        val clazz = createMockClass("TestClass", IArray(staticProp2))
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(interface, clazz), CodePath.NoPath)
        
        val result = MoveStatics.newMembers(scope, parsedFile)
        
        assert(result.length == 4) // 2 modified declarations + 2 namespaces
        
        // Check that we have the right types in the right order
        assert(result(0).isInstanceOf[TsDeclInterface])
        assert(result(1).isInstanceOf[TsDeclNamespace])
        assert(result(2).isInstanceOf[TsDeclClass])
        assert(result(3).isInstanceOf[TsDeclNamespace])
      }

      test("preserves original member order for non-static members") {
        val scope = createMockScope()
        val prop1 = createNonStaticProperty("prop1")
        val func1 = createNonStaticFunction("method1")
        val staticProp = createStaticProperty("staticProp")
        val prop2 = createNonStaticProperty("prop2")
        val func2 = createNonStaticFunction("method2")
        
        val clazz = createMockClass("TestClass", IArray(prop1, func1, staticProp, prop2, func2))
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(clazz), CodePath.NoPath)
        
        val result = MoveStatics.newMembers(scope, parsedFile)
        
        assert(result.length == 2)
        val modifiedClass = result.head.asInstanceOf[TsDeclClass]
        assert(modifiedClass.members.length == 4)
        
        // Check that non-static members maintain their relative order
        val memberNames = modifiedClass.members.map {
          case prop: TsMemberProperty => prop.name.value
          case func: TsMemberFunction => func.name.value
          case other => other.toString
        }
        assert(memberNames == IArray("prop1", "method1", "prop2", "method2"))
      }

      test("handles complex member types correctly") {
        val scope = createMockScope()
        
        // Create a static property with complex type
        val complexStaticProp = TsMemberProperty(
          comments = Comments(Comment("Complex static property")),
          level = TsProtectionLevel.Private,
          name = createSimpleIdent("complexProp"),
          tpe = Some(TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number")))),
          expr = None,
          isStatic = true,
          isReadOnly = true
        )
        
        val clazz = createMockClass("TestClass", IArray(complexStaticProp))
        val parsedFile = TsParsedFile(NoComments, Empty, IArray(clazz), CodePath.NoPath)
        
        val result = MoveStatics.newMembers(scope, parsedFile)
        
        assert(result.length == 2)
        val namespace = result(1).asInstanceOf[TsDeclNamespace]
        assert(namespace.members.length == 1)
        
        // Verify that the complex property is correctly converted
        val convertedProp = namespace.members.head.asInstanceOf[TsDeclVar]
        assert(convertedProp.name.value == "complexProp")
      }
    }
  }
}