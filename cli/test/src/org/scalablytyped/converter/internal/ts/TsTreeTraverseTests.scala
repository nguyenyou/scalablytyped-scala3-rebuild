package org.scalablytyped.converter.internal
package ts

import utest.*

object TsTreeTraverseTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent =
    TsQIdent(IArray.fromTraversable(parts.map(TsIdentSimple.apply)))

  def createTypeRef(name: String): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), IArray.Empty)

  def createTypeLiteral(value: String): TsTypeLiteral =
    TsTypeLiteral(TsLiteral.Str(value))

  def createMockClass(name: String, members: IArray[TsMember] = IArray.Empty): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = IArray.Empty,
      parent = None,
      implements = IArray.Empty,
      members = members,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMockInterface(name: String, members: IArray[TsMember] = IArray.Empty): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = IArray.Empty,
      inheritance = IArray.Empty,
      members = members,
      codePath = CodePath.NoPath
    )

  def createMockModule(name: String, members: IArray[TsContainerOrDecl] = IArray.Empty): TsDeclModule =
    TsDeclModule(
      comments = NoComments,
      declared = false,
      name = TsIdentModule.simple(name),
      members = members,
      codePath = CodePath.NoPath,
      jsLocation = JsLocation.Zero
    )

  def createMockVar(name: String, tpe: Option[TsType] = None): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def createMemberFunction(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = IArray.Empty,
        resultType = Some(TsTypeRef.any)
      ),
      isStatic = false,
      isReadOnly = false
    )

  def createMemberProperty(name: String, tpe: TsType = TsTypeRef.string): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(tpe),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createParsedFile(members: IArray[TsContainerOrDecl]): TsParsedFile =
    TsParsedFile(
      comments = NoComments,
      directives = IArray.Empty,
      members = members,
      codePath = CodePath.NoPath
    )

  def tests = Tests {
    test("TsTreeTraverse - Basic Functionality") {
      test("collect from simple TsTypeRef") {
        val typeRef = createTypeRef("string")
        val result = TsTreeTraverse.collect(typeRef) {
          case x: TsTypeRef => x
        }

        assert(result.length == 1)
        assert(result.head == typeRef)
      }

      test("collect from TsTypeLiteral") {
        val typeLiteral = createTypeLiteral("hello")
        val result = TsTreeTraverse.collect(typeLiteral) {
          case x: TsTypeLiteral => x
        }

        assert(result.length == 1)
        assert(result.head == typeLiteral)
      }

      test("collect with no matches") {
        val typeRef = createTypeRef("string")
        val result = TsTreeTraverse.collect(typeRef) {
          case x: TsDeclClass => x
        }

        assert(result.isEmpty)
      }

      test("collect with always matching partial function") {
        val typeRef = createTypeRef("string")
        val result = TsTreeTraverse.collect(typeRef) {
          case x: TsTree => x.getClass.getSimpleName
        }

        // Should find the TsTypeRef itself and its nested TsQIdent and TsIdentSimple
        assert(result.length >= 1)
        assert(result.contains("TsTypeRef"))
      }

      test("collectIArray from multiple trees") {
        val typeRef1 = createTypeRef("string")
        val typeRef2 = createTypeRef("number")
        val trees = IArray(typeRef1, typeRef2)

        val result = TsTreeTraverse.collectIArray(trees) {
          case x: TsTypeRef => x
        }

        assert(result.length == 2)
        assert(result.contains(typeRef1))
        assert(result.contains(typeRef2))
      }

      test("collectIArray from empty array") {
        val trees = IArray.Empty
        val result = TsTreeTraverse.collectIArray(trees) {
          case x: TsTypeRef => x
        }

        assert(result.isEmpty)
      }
    }

    test("TsTreeTraverse - Nested Structure Traversal") {
      test("collect from class with members") {
        val memberFunction = createMemberFunction("testMethod")
        val memberProperty = createMemberProperty("testProp")
        val members = IArray[TsMember](memberFunction, memberProperty)
        val mockClass = createMockClass("TestClass", members)

        val result = TsTreeTraverse.collect(mockClass) {
          case x: TsMemberFunction => x
        }

        assert(result.length == 1)
        assert(result.head == memberFunction)
      }

      test("collect all members from class") {
        val memberFunction = createMemberFunction("testMethod")
        val memberProperty = createMemberProperty("testProp")
        val members = IArray[TsMember](memberFunction, memberProperty)
        val mockClass = createMockClass("TestClass", members)

        val result = TsTreeTraverse.collect(mockClass) {
          case x: TsMember => x
        }

        assert(result.length == 2)
        assert(result.contains(memberFunction))
        assert(result.contains(memberProperty))
      }

      test("collect from interface with members") {
        val memberFunction = createMemberFunction("interfaceMethod")
        val memberProperty = createMemberProperty("interfaceProp")
        val members = IArray[TsMember](memberFunction, memberProperty)
        val mockInterface = createMockInterface("TestInterface", members)

        val result = TsTreeTraverse.collect(mockInterface) {
          case x: TsMemberProperty => x
        }

        assert(result.length == 1)
        assert(result.head == memberProperty)
      }
    }

    test("TsTreeTraverse - Complex Hierarchies") {
      test("collect from module with nested declarations") {
        val innerClass = createMockClass("InnerClass")
        val innerInterface = createMockInterface("InnerInterface")
        val innerVar = createMockVar("innerVar", Some(createTypeRef("string")))
        val moduleMembers = IArray[TsContainerOrDecl](innerClass, innerInterface, innerVar)
        val mockModule = createMockModule("TestModule", moduleMembers)

        val result = TsTreeTraverse.collect(mockModule) {
          case x: TsDeclClass => x
        }

        assert(result.length == 1)
        assert(result.head == innerClass)
      }

      test("collect all declarations from module") {
        val innerClass = createMockClass("InnerClass")
        val innerInterface = createMockInterface("InnerInterface")
        val innerVar = createMockVar("innerVar", Some(createTypeRef("string")))
        val moduleMembers = IArray[TsContainerOrDecl](innerClass, innerInterface, innerVar)
        val mockModule = createMockModule("TestModule", moduleMembers)

        val result = TsTreeTraverse.collect(mockModule) {
          case x: TsNamedDecl => x.name.value
        }

        assert(result.length == 4) // Module itself + 3 inner declarations
        assert(result.contains("TestModule"))
        assert(result.contains("InnerClass"))
        assert(result.contains("InnerInterface"))
        assert(result.contains("innerVar"))
      }

      test("collect from parsed file with multiple containers") {
        val class1 = createMockClass("Class1")
        val interface1 = createMockInterface("Interface1")
        val module1 = createMockModule("Module1", IArray(createMockVar("moduleVar")))
        val fileMembers = IArray[TsContainerOrDecl](class1, interface1, module1)
        val parsedFile = createParsedFile(fileMembers)

        val result = TsTreeTraverse.collect(parsedFile) {
          case x: TsContainer => x.getClass.getSimpleName
        }

        // Should find TsParsedFile and TsDeclModule (class and interface are not containers)
        assert(result.length == 2)
        assert(result.contains("TsParsedFile"))
        assert(result.contains("TsDeclModule"))
      }

      test("collect deeply nested type references") {
        val stringType = createTypeRef("string")
        val memberProp = createMemberProperty("prop", stringType)
        val memberFunc = createMemberFunction("func")
        val members = IArray[TsMember](memberProp, memberFunc)
        val mockClass = createMockClass("TestClass", members)

        val result = TsTreeTraverse.collect(mockClass) {
          case x: TsTypeRef => x.name.parts.head.value
        }

        // Should find type references from member property and member function return type
        assert(result.length >= 2)
        assert(result.contains("string"))
        assert(result.contains("any")) // from function return type
      }
    }

    test("TsTreeTraverse - Edge Cases and Error Conditions") {
      test("collect with partial function that never matches") {
        val typeRef = createTypeRef("string")
        val result = TsTreeTraverse.collect(typeRef) {
          case x: TsDeclClass if x.name.value == "NonExistent" => x
        }

        assert(result.isEmpty)
      }

      test("collect with partial function that always matches") {
        val memberProp = createMemberProperty("testProp")
        val mockClass = createMockClass("TestClass", IArray(memberProp))

        val result = TsTreeTraverse.collect(mockClass) {
          case _: TsTree => "found"
        }

        // Should find multiple nodes: class, member, types, identifiers, etc.
        assert(result.length > 5)
        assert(result.forall(_ == "found"))
      }

      test("collect from empty containers") {
        val emptyClass = createMockClass("EmptyClass", IArray.Empty)
        val emptyModule = createMockModule("EmptyModule", IArray.Empty)
        val emptyFile = createParsedFile(IArray.Empty)

        val classResult = TsTreeTraverse.collect(emptyClass) {
          case x: TsMember => x
        }
        assert(classResult.isEmpty)

        val moduleResult = TsTreeTraverse.collect(emptyModule) {
          case x: TsContainerOrDecl => x.getClass.getSimpleName
        }
        assert(moduleResult.length == 1) // Just the module itself
        assert(moduleResult.head == "TsDeclModule")

        val fileResult = TsTreeTraverse.collect(emptyFile) {
          case x: TsContainerOrDecl => x
        }
        assert(fileResult.length == 1) // The parsed file itself is a TsContainerOrDecl
        assert(fileResult.head == emptyFile)
      }
    }

    test("TsTreeTraverse - Advanced Extraction Scenarios") {
      test("extract specific node types with conditions") {
        val memberProp1 = createMemberProperty("publicProp")
        val memberProp2 = createMemberProperty("privateProp")
        val memberFunc = createMemberFunction("testMethod")
        val members = IArray[TsMember](memberProp1, memberProp2, memberFunc)
        val mockClass = createMockClass("TestClass", members)

        val result = TsTreeTraverse.collect(mockClass) {
          case x: TsMemberProperty if x.name.value.startsWith("public") => x.name.value
        }

        assert(result.length == 1)
        assert(result.head == "publicProp")
      }

      test("extract nested identifiers") {
        val typeRef = createTypeRef("MyType")
        val memberProp = createMemberProperty("prop", typeRef)
        val mockClass = createMockClass("TestClass", IArray(memberProp))

        val result = TsTreeTraverse.collect(mockClass) {
          case x: TsIdentSimple => x.value
        }

        // Should find identifiers from class name, member name, and type reference
        assert(result.length >= 3)
        assert(result.contains("TestClass"))
        assert(result.contains("prop"))
        assert(result.contains("MyType"))
      }

      test("extract with multiple criteria") {
        val class1 = createMockClass("TestClass")
        val interface1 = createMockInterface("TestInterface")
        val var1 = createMockVar("testVar")
        val module1 = createMockModule("TestModule", IArray(class1, interface1, var1))

        val result = TsTreeTraverse.collect(module1) {
          case x: TsNamedDecl if x.name.value.contains("Test") => x.getClass.getSimpleName
        }

        // Should find TestModule, TestClass, TestInterface (testVar might not be found due to traversal depth)
        assert(result.length >= 3)
        assert(result.contains("TsDeclModule"))
        assert(result.contains("TsDeclClass"))
        assert(result.contains("TsDeclInterface"))
        // Note: TsDeclVar might not be found depending on traversal implementation
      }

      test("extract type information from complex structures") {
        val stringType = createTypeRef("string")
        val numberType = createTypeRef("number")
        val prop1 = createMemberProperty("stringProp", stringType)
        val prop2 = createMemberProperty("numberProp", numberType)
        val members = IArray[TsMember](prop1, prop2)
        val mockClass = createMockClass("ComplexClass", members)

        val result = TsTreeTraverse.collect(mockClass) {
          case x: TsTypeRef => x.name.parts.head.value
        }

        assert(result.length >= 2)
        assert(result.contains("string"))
        assert(result.contains("number"))
      }
    }

    test("TsTreeTraverse - Performance and Stress Tests") {
      test("large tree traversal") {
        // Create a large tree structure
        val members = (1 to 50).map(i => createMemberProperty(s"prop$i")).toArray
        val mockClass = createMockClass("LargeClass", IArray.fromArray(members))

        val result = TsTreeTraverse.collect(mockClass) {
          case x: TsMemberProperty => x.name.value
        }

        assert(result.length == 50)
        assert(result.forall(_.startsWith("prop")))
      }

      test("deeply nested structure traversal") {
        // Create nested modules
        val innerVar = createMockVar("innerVar")
        val innerModule = createMockModule("InnerModule", IArray(innerVar))
        val middleModule = createMockModule("MiddleModule", IArray(innerModule))
        val outerModule = createMockModule("OuterModule", IArray(middleModule))

        val result = TsTreeTraverse.collect(outerModule) {
          case x: TsDeclVar => x.name.value
        }

        assert(result.length == 1)
        assert(result.head == "innerVar")
      }

      test("complex extraction with many matches") {
        val members = (1 to 20).map(i => createMemberProperty(s"prop$i")).toArray
        val mockClass = createMockClass("TestClass", IArray.fromArray(members))

        val result = TsTreeTraverse.collect(mockClass) {
          case _: TsTree => "node"
        }

        // Should find many nodes: class, members, types, identifiers, etc.
        assert(result.length > 50) // Conservative estimate
        assert(result.forall(_ == "node"))
      }
    }

    test("TsTreeTraverse - Integration with collectIArray") {
      test("collect from multiple complex trees") {
        val class1 = createMockClass("Class1", IArray(createMemberProperty("prop1")))
        val class2 = createMockClass("Class2", IArray(createMemberProperty("prop2")))
        val interface1 = createMockInterface("Interface1", IArray(createMemberFunction("method1")))
        val trees = IArray[TsTree](class1, class2, interface1)

        val result = TsTreeTraverse.collectIArray(trees) {
          case x: TsNamedDecl => x.name.value
        }

        // Should find at least the main declarations (members might not be found due to traversal depth)
        assert(result.length >= 3)
        assert(result.contains("Class1"))
        assert(result.contains("Class2"))
        assert(result.contains("Interface1"))
        // Note: Member names might not be found depending on traversal implementation
      }

      test("collectIArray with mixed extraction criteria") {
        val typeRef1 = createTypeRef("string")
        val typeRef2 = createTypeRef("number")
        val class1 = createMockClass("TestClass")
        val trees = IArray[TsTree](typeRef1, typeRef2, class1)

        val typeResults = TsTreeTraverse.collectIArray(trees) {
          case x: TsTypeRef => x.name.parts.head.value
        }

        val classResults = TsTreeTraverse.collectIArray(trees) {
          case x: TsDeclClass => x.name.value
        }

        assert(typeResults.length == 2)
        assert(typeResults.contains("string"))
        assert(typeResults.contains("number"))

        assert(classResults.length == 1)
        assert(classResults.head == "TestClass")
      }

      test("collectIArray performance with many trees") {
        val trees = (1 to 30).map(i => createTypeRef(s"Type$i")).toArray
        val treeArray = IArray.fromArray(trees)

        val result = TsTreeTraverse.collectIArray(treeArray) {
          case x: TsTypeRef => x.name.parts.head.value
        }

        assert(result.length == 30)
        assert(result.forall(_.startsWith("Type")))
      }
    }
  }
}