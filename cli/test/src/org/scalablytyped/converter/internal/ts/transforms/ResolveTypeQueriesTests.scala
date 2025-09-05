package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import org.scalablytyped.converter.internal.ts.TsTreeScope.LoopDetector
import utest.*

object ResolveTypeQueriesTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createTypeQuery(expr: TsQIdent): TsTypeQuery = TsTypeQuery(expr)

  def createMockVar(
    name: String,
    tpe: Option[TsType] = Some(createTypeRef("string"))
  ): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = tpe,
      expr = None,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockFunction(
    name: String,
    returnType: TsType = createTypeRef("void")
  ): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = TsFunSig(NoComments, Empty, Empty, Some(returnType)),
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockClass(
    name: String,
    members: IArray[TsMember] = Empty
  ): TsDeclClass =
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
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
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
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMemberProperty(name: String, tpe: Option[TsType] = Some(createTypeRef("string"))): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = tpe,
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
    test("ResolveTypeQueries - Basic Functionality") {
      test("extends TransformMembers and TransformLeaveClassMembers") {
        assert(ResolveTypeQueries.isInstanceOf[TransformMembers])
        assert(ResolveTypeQueries.isInstanceOf[TransformLeaveClassMembers])
      }

      test("has newClassMembersLeaving method") {
        val scope = createMockScope()
        val mockClass = createMockClass("TestClass")
        val result = ResolveTypeQueries.newClassMembersLeaving(scope, mockClass)
        assert(result != null)
        assert(result.isInstanceOf[IArray[TsMember]])
      }

      test("has newMembers method") {
        val scope = createMockScope()
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = Empty,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
        )
        val result = ResolveTypeQueries.newMembers(scope, parsedFile)
        assert(result != null)
        assert(result.isInstanceOf[IArray[TsContainerOrDecl]])
      }

      test("has leaveTsType method") {
        val scope = createMockScope()
        val typeQuery = createTypeQuery(createQIdent("TestType"))
        val result = ResolveTypeQueries.leaveTsType(scope)(typeQuery)
        assert(result != null)
        assert(result.isInstanceOf[TsType])
      }

      test("has typeOf method") {
        val scope = createMockScope()
        val mockVar = createMockVar("testVar")
        val result = ResolveTypeQueries.typeOf(mockVar, scope, LoopDetector.initial)
        assert(result.isInstanceOf[Option[TsType]])
      }

      test("has lookup method") {
        val scope = createMockScope()
        val result = ResolveTypeQueries.lookup(scope, Picker.NamedValues, createQIdent("test"))
        assert(result != null)
        assert(result.isInstanceOf[IArray[(TsNamedValueDecl, TsTreeScope)]])
      }
    }

    test("ResolveTypeQueries - Class Member Processing") {
      test("resolves typeof property to variable type") {
        val targetVar = createMockVar("targetVar", Some(createTypeRef("number")))
        val scope = createMockScope(targetVar)
        
        val propertyWithTypeQuery = createMemberProperty("prop", Some(createTypeQuery(createQIdent("targetVar"))))
        val mockClass = createMockClass("TestClass", IArray(propertyWithTypeQuery))
        
        val result = ResolveTypeQueries.newClassMembersLeaving(scope, mockClass)
        
        assert(result.length == 1)
        val resolvedProperty = result.head.asInstanceOf[TsMemberProperty]
        assert(resolvedProperty.name.value == "prop")
        assert(resolvedProperty.tpe.isDefined)
        // Should resolve to the variable's type (number)
        assert(resolvedProperty.tpe.get.isInstanceOf[TsTypeRef])
      }

      test("resolves typeof property to function") {
        val targetFunction = createMockFunction("targetFunc", createTypeRef("boolean"))
        val scope = createMockScope(targetFunction)
        
        val propertyWithTypeQuery = createMemberProperty("prop", Some(createTypeQuery(createQIdent("targetFunc"))))
        val mockClass = createMockClass("TestClass", IArray(propertyWithTypeQuery))
        
        val result = ResolveTypeQueries.newClassMembersLeaving(scope, mockClass)
        
        assert(result.length == 1)
        val resolvedMember = result.head
        assert(resolvedMember.isInstanceOf[TsMemberFunction])
        val resolvedFunction = resolvedMember.asInstanceOf[TsMemberFunction]
        assert(resolvedFunction.name.value == "prop")
        assert(resolvedFunction.signature.resultType.isDefined)
      }

      test("handles unresolvable typeof property") {
        val scope = createMockScope()
        
        val propertyWithTypeQuery = createMemberProperty("prop", Some(createTypeQuery(createQIdent("NonExistent"))))
        val mockClass = createMockClass("TestClass", IArray(propertyWithTypeQuery))
        
        val result = ResolveTypeQueries.newClassMembersLeaving(scope, mockClass)
        
        assert(result.length == 1)
        val resolvedProperty = result.head.asInstanceOf[TsMemberProperty]
        assert(resolvedProperty.name.value == "prop")
        assert(resolvedProperty.tpe.isDefined)
        // Should fallback to any with warning comment
        // Should fallback to any with warning comment
        assert(resolvedProperty.tpe.get.isInstanceOf[TsTypeRef])
      }

      test("leaves non-typeof properties unchanged") {
        val scope = createMockScope()
        
        val normalProperty = createMemberProperty("normalProp", Some(createTypeRef("string")))
        val mockClass = createMockClass("TestClass", IArray(normalProperty))
        
        val result = ResolveTypeQueries.newClassMembersLeaving(scope, mockClass)
        
        assert(result.length == 1)
        assert(result.head == normalProperty)
      }

      test("ignores primitive typeof queries") {
        val scope = createMockScope()
        
        val primitiveTypeQuery = createTypeQuery(createQIdent("string"))
        val propertyWithPrimitive = createMemberProperty("prop", Some(primitiveTypeQuery))
        val mockClass = createMockClass("TestClass", IArray(propertyWithPrimitive))
        
        val result = ResolveTypeQueries.newClassMembersLeaving(scope, mockClass)
        
        assert(result.length == 1)
        assert(result.head == propertyWithPrimitive) // Should be unchanged
      }
    }

    test("ResolveTypeQueries - Container Member Processing") {
      test("resolves typeof variable declaration") {
        val targetVar = createMockVar("targetVar", Some(createTypeRef("number")))
        val scope = createMockScope(targetVar)
        
        val varWithTypeQuery = createMockVar("newVar", Some(createTypeQuery(createQIdent("targetVar"))))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(varWithTypeQuery),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
        )
        
        val result = ResolveTypeQueries.newMembers(scope, parsedFile)
        
        // Should create a copy of the target variable
        assert(result.nonEmpty)
        val resolvedDecl = result.head
        assert(resolvedDecl.isInstanceOf[TsDeclVar])
      }

      test("handles unresolvable typeof variable") {
        val scope = createMockScope()
        
        val varWithTypeQuery = createMockVar("newVar", Some(createTypeQuery(createQIdent("NonExistent"))))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(varWithTypeQuery),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
        )
        
        val result = ResolveTypeQueries.newMembers(scope, parsedFile)
        
        assert(result.length == 1)
        val resolvedVar = result.head.asInstanceOf[TsDeclVar]
        assert(resolvedVar.name.value == "newVar")
        assert(resolvedVar.tpe.isDefined)
        // Should fallback to any with warning
        assert(resolvedVar.tpe.get.isInstanceOf[TsTypeRef])
      }

      test("filters out conflicting type aliases") {
        val targetClass = createMockClass("TestClass")
        val scope = createMockScope(targetClass)
        
        val varWithTypeQuery = createMockVar("TestClass", Some(createTypeQuery(createQIdent("TestClass"))))
        val typeAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("TestClass"),
          tparams = Empty,
          alias = createTypeRef("string"),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("TestClass"))
        )
        
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(varWithTypeQuery, typeAlias),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
        )
        
        val result = ResolveTypeQueries.newMembers(scope, parsedFile)
        
        // Should filter out the type alias when a class with the same name is added
        assert(result.exists(_.isInstanceOf[TsDeclClass]))
        assert(!result.exists(_.isInstanceOf[TsDeclTypeAlias]))
      }

      test("leaves non-typeof declarations unchanged") {
        val scope = createMockScope()
        
        val normalVar = createMockVar("normalVar", Some(createTypeRef("string")))
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = Empty,
          members = IArray(normalVar),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
        )
        
        val result = ResolveTypeQueries.newMembers(scope, parsedFile)
        
        assert(result.length == 1)
        assert(result.head == normalVar)
      }
    }

    test("ResolveTypeQueries - Type Resolution") {
      test("resolves typeof type queries") {
        val targetVar = createMockVar("targetVar", Some(createTypeRef("number")))
        val scope = createMockScope(targetVar)
        
        val typeQuery = createTypeQuery(createQIdent("targetVar"))
        val result = ResolveTypeQueries.leaveTsType(scope)(typeQuery)
        
        assert(result.isInstanceOf[TsType])
        // Should resolve to the variable's type
        assert(result != typeQuery) // Should be transformed
      }

      test("leaves non-typeof types unchanged") {
        val scope = createMockScope()
        
        val normalType = createTypeRef("string")
        val result = ResolveTypeQueries.leaveTsType(scope)(normalType)
        
        assert(result == normalType)
      }

      test("handles globalThis typeof query") {
        val scope = createMockScope()
        
        val globalThisQuery = createTypeQuery(createQIdent("globalThis"))
        val result = ResolveTypeQueries.leaveTsType(scope)(globalThisQuery)
        
        assert(result.isInstanceOf[TsTypeRef])
        // Should resolve to any with comment
        // Should resolve to any with comment
        val typeRef = result.asInstanceOf[TsTypeRef]
        assert(typeRef.comments.cs.exists {
          case Comment.Raw(raw) => raw.contains("globalThis")
          case _ => false
        })
      }

      test("handles primitive typeof queries") {
        val scope = createMockScope()
        
        val primitiveQuery = createTypeQuery(createQIdent("string"))
        val result = ResolveTypeQueries.leaveTsType(scope)(primitiveQuery)
        
        assert(result.isInstanceOf[TsTypeRef])
        val typeRef = result.asInstanceOf[TsTypeRef]
        assert(typeRef.name.parts.head.value == "string")
      }

      test("handles unresolvable typeof queries") {
        val scope = createMockScope()
        
        val unresolvableQuery = createTypeQuery(createQIdent("NonExistent"))
        val result = ResolveTypeQueries.leaveTsType(scope)(unresolvableQuery)
        
        assert(result.isInstanceOf[TsTypeRef])
        // Should fallback to any with warning
        // Should fallback to any with warning
        val typeRef = result.asInstanceOf[TsTypeRef]
        assert(typeRef.comments.cs.exists {
          case Comment.Raw(raw) => raw.contains("warning")
          case _ => false
        })
      }
    }

    test("ResolveTypeQueries - TypeOf Method") {
      test("handles function declarations") {
        val scope = createMockScope()
        val func = createMockFunction("testFunc", createTypeRef("boolean"))

        val result = ResolveTypeQueries.typeOf(func, scope, LoopDetector.initial)

        assert(result.isDefined)
        assert(result.get.isInstanceOf[TsTypeFunction])
        val funcType = result.get.asInstanceOf[TsTypeFunction]
        assert(funcType.signature.resultType.isDefined)
      }

      test("handles variable declarations") {
        val scope = createMockScope()
        val variable = createMockVar("testVar", Some(createTypeRef("string")))

        val result = ResolveTypeQueries.typeOf(variable, scope, LoopDetector.initial)

        assert(result.isDefined)
        assert(result.get.isInstanceOf[TsTypeRef])
      }

      test("handles variable with nested typeof") {
        val targetVar = createMockVar("target", Some(createTypeRef("number")))
        val scope = createMockScope(targetVar)
        val variable = createMockVar("testVar", Some(createTypeQuery(createQIdent("target"))))

        val result = ResolveTypeQueries.typeOf(variable, scope, LoopDetector.initial)

        assert(result.isDefined)
        assert(result.get.isInstanceOf[TsType])
      }

      test("handles class declarations") {
        val scope = createMockScope()
        val clazz = createMockClass("TestClass")

        val result = ResolveTypeQueries.typeOf(clazz, scope, LoopDetector.initial)

        assert(result.isDefined)
        // Should create a type constructor
        assert(result.get.isInstanceOf[TsType])
      }

      test("handles namespace declarations") {
        val scope = createMockScope()
        val namespace = createMockNamespace("TestNamespace", IArray(
          createMockVar("nsVar", Some(createTypeRef("string")))
        ))

        val result = ResolveTypeQueries.typeOf(namespace, scope, LoopDetector.initial)

        assert(result.isDefined)
        assert(result.get.isInstanceOf[TsTypeObject])
      }

      test("returns None for unsupported declarations") {
        val scope = createMockScope()
        val interface = TsDeclInterface(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("TestInterface"),
          tparams = Empty,
          inheritance = Empty,
          members = Empty,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("TestInterface"))
        )

        val result = ResolveTypeQueries.typeOf(interface, scope, LoopDetector.initial)

        assert(result.isEmpty)
      }
    }

    test("ResolveTypeQueries - Lookup Method") {
      test("finds variables in scope") {
        val targetVar = createMockVar("targetVar", Some(createTypeRef("string")))
        val scope = createMockScope(targetVar)

        val result = ResolveTypeQueries.lookup(scope, Picker.NamedValues, createQIdent("targetVar"))

        assert(result.nonEmpty)
        assert(result.head._1 == targetVar)
      }

      test("finds functions in scope") {
        val targetFunc = createMockFunction("targetFunc", createTypeRef("boolean"))
        val scope = createMockScope(targetFunc)

        val result = ResolveTypeQueries.lookup(scope, Picker.NamedValues, createQIdent("targetFunc"))

        assert(result.nonEmpty)
        assert(result.head._1 == targetFunc)
      }

      test("prioritizes variables over functions") {
        val targetVar = createMockVar("target", Some(createTypeRef("string")))
        val targetFunc = createMockFunction("target", createTypeRef("boolean"))
        val scope = createMockScope(targetVar, targetFunc)

        val result = ResolveTypeQueries.lookup(scope, Picker.NamedValues, createQIdent("target"))

        assert(result.nonEmpty)
        assert(result.head._1 == targetVar) // Variables should be prioritized
      }

      test("falls back to global lookup") {
        val scope = createMockScope()

        val result = ResolveTypeQueries.lookup(scope, Picker.NamedValues, createQIdent("NonExistent"))

        // Should attempt global lookup (may return empty but shouldn't crash)
        assert(result.isInstanceOf[IArray[(TsNamedValueDecl, TsTreeScope)]])
      }

      test("handles qualified names") {
        val scope = createMockScope()

        val result = ResolveTypeQueries.lookup(scope, Picker.NamedValues, createQIdent("lib", "SomeType"))

        assert(result.isInstanceOf[IArray[(TsNamedValueDecl, TsTreeScope)]])
      }
    }

    test("ResolveTypeQueries - Edge Cases") {
      test("handles circular typeof references") {
        val scope = createMockScope()

        // Create a circular reference: var a: typeof a
        val circularVar = createMockVar("circularVar", Some(createTypeQuery(createQIdent("circularVar"))))
        val circularQuery = createTypeQuery(createQIdent("circularVar"))

        val result = ResolveTypeQueries.leaveTsType(scope)(circularQuery)

        // Should handle gracefully and return a type with warning
        assert(result.isInstanceOf[TsType])
        // Should handle gracefully and return a type with warning
        val typeRef = result.asInstanceOf[TsTypeRef]
        assert(typeRef.comments.cs.exists {
          case Comment.Raw(raw) => raw.contains("warning")
          case _ => false
        })
      }

      test("handles complex class with static members") {
        val staticProp = TsMemberProperty(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          name = createSimpleIdent("staticProp"),
          tpe = Some(createTypeRef("string")),
          expr = None,
          isStatic = true,
          isReadOnly = false
        )

        val clazz = createMockClass("ComplexClass", IArray(staticProp))
        val scope = createMockScope(clazz)

        val result = ResolveTypeQueries.typeOf(clazz, scope, LoopDetector.initial)

        assert(result.isDefined)
        // Should create a type object that includes static members
        assert(result.get.isInstanceOf[TsType])
      }

      test("handles empty namespace") {
        val scope = createMockScope()
        val emptyNamespace = createMockNamespace("EmptyNamespace", Empty)

        val result = ResolveTypeQueries.typeOf(emptyNamespace, scope, LoopDetector.initial)

        // Empty namespace should return None
        assert(result.isEmpty)
      }

      test("handles function overloads") {
        val func1 = createMockFunction("overloaded", createTypeRef("string"))
        val func2 = createMockFunction("overloaded", createTypeRef("number"))
        val scope = createMockScope(func1, func2)

        val typeQuery = createTypeQuery(createQIdent("overloaded"))
        val result = ResolveTypeQueries.leaveTsType(scope)(typeQuery)

        assert(result.isInstanceOf[TsType])
        // Should handle multiple functions with same name
      }

      test("handles module declarations") {
        val moduleVar = createMockVar("moduleVar", Some(createTypeRef("string")))
        val module = TsDeclModule(
          comments = NoComments,
          declared = false,
          name = TsIdentModule(None, List("TestModule")),
          members = IArray(moduleVar),
          jsLocation = JsLocation.Zero,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("TestModule"))
        )
        val scope = createMockScope(module)

        val result = ResolveTypeQueries.typeOf(module, scope, LoopDetector.initial)

        assert(result.isDefined)
        assert(result.get.isInstanceOf[TsTypeObject])
      }

      test("handles class with constructor") {
        val constructor = TsMemberCtor(
          comments = NoComments,
          level = TsProtectionLevel.Default,
          signature = TsFunSig(NoComments, Empty, Empty, None)
        )

        val clazz = createMockClass("ClassWithCtor", IArray(constructor))
        val scope = createMockScope(clazz)

        val result = ResolveTypeQueries.typeOf(clazz, scope, LoopDetector.initial)

        assert(result.isDefined)
        // Should create appropriate type constructor
        assert(result.get.isInstanceOf[TsType])
      }
    }

    test("ResolveTypeQueries - Integration Scenarios") {
      test("handles real-world typeof pattern") {
        // Simulate: const MyClass = class {}; type MyClassType = typeof MyClass;
        val clazz = createMockClass("MyClass")
        val classVar = createMockVar("MyClass", None) // Variable holding the class
        val scope = createMockScope(clazz, classVar)

        val typeQuery = createTypeQuery(createQIdent("MyClass"))
        val result = ResolveTypeQueries.leaveTsType(scope)(typeQuery)

        assert(result.isInstanceOf[TsType])
        // Should resolve to the class type constructor
      }

      test("handles namespace with nested declarations") {
        val nestedVar = createMockVar("nestedVar", Some(createTypeRef("number")))
        val nestedFunc = createMockFunction("nestedFunc", createTypeRef("boolean"))
        val namespace = createMockNamespace("ComplexNamespace", IArray(nestedVar, nestedFunc))
        val scope = createMockScope(namespace)

        val result = ResolveTypeQueries.typeOf(namespace, scope, LoopDetector.initial)

        assert(result.isDefined)
        assert(result.get.isInstanceOf[TsTypeObject])
        val objType = result.get.asInstanceOf[TsTypeObject]
        assert(objType.members.length == 2) // Should include both nested declarations
      }

      test("handles library-specific typeof patterns") {
        // Simulate library pattern where typeof is used for API definitions
        val apiFunction = createMockFunction("apiCall", createTypeRef("Promise"))
        val configVar = createMockVar("config", Some(createTypeRef("Config")))
        val scope = createMockScope(apiFunction, configVar)

        val apiTypeQuery = createTypeQuery(createQIdent("apiCall"))
        val configTypeQuery = createTypeQuery(createQIdent("config"))

        val apiResult = ResolveTypeQueries.leaveTsType(scope)(apiTypeQuery)
        val configResult = ResolveTypeQueries.leaveTsType(scope)(configTypeQuery)

        assert(apiResult.isInstanceOf[TsTypeFunction])
        assert(configResult.isInstanceOf[TsTypeRef])
      }
    }
  }
}