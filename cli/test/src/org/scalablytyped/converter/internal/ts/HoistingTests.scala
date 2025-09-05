package org.scalablytyped.converter.internal.ts

import org.scalablytyped.converter.internal.*
import org.scalablytyped.converter.internal.ts.TsTreeScope.LoopDetector
import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object HoistingTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = IArray.Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMockScope(): TsTreeScope = {
    val libName = TsIdentLibrarySimple("test-lib")
    val logger = Logger.DevNull
    val deps = Map.empty[TsTreeScope.TsLib, TsParsedFile]
    TsTreeScope(libName, pedantic = false, deps, logger)
  }

  def createLoopDetector(): LoopDetector = TsTreeScope.LoopDetector.initial

  def createCodePath(): CodePath = CodePath.HasPath(
    TsIdentLibrarySimple("test-lib"),
    TsQIdent.of(createSimpleIdent("TestPath"))
  )

  def createJsLocation(): JsLocation = JsLocation.Zero

  def createMockMemberCall(): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = IArray.Empty,
        resultType = Some(TsTypeRef.void)
      )
    )

  def createMockMemberFunction(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = IArray.Empty,
        params = IArray.Empty,
        resultType = Some(TsTypeRef.void)
      ),
      isStatic = false,
      isReadOnly = false
    )

  def createMockMemberProperty(name: String): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(TsTypeRef.string),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def tests = Tests {
    test("Hoisting - Basic Functionality") {
      test("declared constant should be false") {
        assert(!Hoisting.declared)
      }
    }

    test("Hoisting.memberToDecl") {
      test("converts TsMemberCall to TsDeclFunction") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val memberCall = createMockMemberCall()

        val result = Hoisting.memberToDecl(ownerCp, ownerLoc)(memberCall)

        assert(result.isDefined)
        result match {
          case Some(TsDeclFunction(cs, declared, name, sig, jsLocation, codePath)) =>
            assert(cs == memberCall.comments)
            assert(declared == Hoisting.declared)
            assert(name == TsIdent.Apply)
            assert(sig == memberCall.signature)
            assert(jsLocation == ownerLoc)
            assert(codePath == ownerCp + TsIdent.Apply)
          case _ =>
            assert(false) // Expected TsDeclFunction
        }
      }

      test("converts TsMemberFunction with Normal method type to TsDeclFunction") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val memberFunction = createMockMemberFunction("testMethod")

        val result = Hoisting.memberToDecl(ownerCp, ownerLoc)(memberFunction)

        assert(result.isDefined)
        result match {
          case Some(TsDeclFunction(cs, declared, name, sig, jsLocation, codePath)) =>
            assert(cs == memberFunction.comments)
            assert(declared == Hoisting.declared)
            assert(name == memberFunction.name)
            assert(sig == memberFunction.signature)
            assert(jsLocation == ownerLoc + memberFunction.name)
            assert(codePath == ownerCp + memberFunction.name)
          case _ =>
            assert(false) // Expected TsDeclFunction
        }
      }

      test("converts TsMemberProperty to TsDeclVar") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val memberProperty = createMockMemberProperty("testProperty")

        val result = Hoisting.memberToDecl(ownerCp, ownerLoc)(memberProperty)

        assert(result.isDefined)
        result match {
          case Some(TsDeclVar(cs, declared, isReadOnly, name, tpe, lit, jsLocation, codePath)) =>
            assert(cs == memberProperty.comments)
            assert(declared == Hoisting.declared)
            assert(isReadOnly == memberProperty.isReadOnly)
            assert(name == memberProperty.name)
            assert(tpe == memberProperty.tpe)
            assert(lit == memberProperty.expr)
            assert(jsLocation == ownerLoc + memberProperty.name)
            assert(codePath == ownerCp + memberProperty.name)
          case _ => assert(false)
        }
      }

      test("returns None for unsupported member types") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()

        // Create a member that doesn't match any of the supported patterns
        val unsupportedMember = createMockMemberFunction("test")
          .copy(methodType = MethodType.Getter) // Not Normal method type

        val result = Hoisting.memberToDecl(ownerCp, ownerLoc)(unsupportedMember)

        assert(result.isEmpty)
      }

      test("handles member function with different method types") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()

        // Test with Getter method type (should return None)
        val getterMember = createMockMemberFunction("getter")
          .copy(methodType = MethodType.Getter)
        val getterResult = Hoisting.memberToDecl(ownerCp, ownerLoc)(getterMember)
        assert(getterResult.isEmpty)

        // Test with Setter method type (should return None)
        val setterMember = createMockMemberFunction("setter")
          .copy(methodType = MethodType.Setter)
        val setterResult = Hoisting.memberToDecl(ownerCp, ownerLoc)(setterMember)
        assert(setterResult.isEmpty)
      }

      test("handles readonly property correctly") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val readonlyProperty = createMockMemberProperty("readonlyProp")
          .copy(isReadOnly = true)

        val result = Hoisting.memberToDecl(ownerCp, ownerLoc)(readonlyProperty)

        assert(result.isDefined)
        result match {
          case Some(TsDeclVar(_, _, isReadOnly, _, _, _, _, _)) =>
            assert(isReadOnly)
          case _ =>
            assert(false) // Expected TsDeclVar
        }
      }
    }

    test("Hoisting.fromType") {
      test("handles TsTypeRef by delegating to fromRef") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val ld = createLoopDetector()
        val typeRef = createTypeRef("TestType")

        val result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, typeRef)

        // Since we don't have a proper scope setup, this should return empty
        assert(result.isEmpty)
      }

      test("handles TsTypeObject by extracting members") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val ld = createLoopDetector()

        val memberCall = createMockMemberCall()
        val memberFunction = createMockMemberFunction("testMethod")
        val members = IArray(memberCall, memberFunction)
        val typeObject = TsTypeObject(NoComments, members)

        val result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, typeObject)

        // Should convert the members that can be converted
        assert(result.length == 2)
        assert(result.forall(_.isInstanceOf[TsNamedValueDecl]))
      }

      test("returns empty for unsupported types") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val ld = createLoopDetector()

        // Test with various unsupported types
        val unsupportedTypes = IArray(
          TsTypeRef.string,
          TsTypeRef.number,
          TsTypeRef.boolean
        )

        unsupportedTypes.foreach { tpe =>
          val result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, tpe)
          assert(result.isEmpty)
        }
      }
    }

    test("Hoisting.fromRef") {
      test("returns empty for non-existent type reference") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val ld = createLoopDetector()
        val typeRef = createTypeRef("NonExistentType")

        val result = Hoisting.fromRef(scope, ownerCp, ownerLoc, ld, typeRef)

        // Since we don't have a proper scope setup, this should return empty
        assert(result.isEmpty)
      }

      test("handles circular references gracefully") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val typeRef = createTypeRef("CircularType")

        // Create a loop detector that already contains this type reference
        val ld = createLoopDetector()
        val circularLd = ld.including(typeRef, scope) match {
          case Left(_) => ld // Already contains circular reference
          case Right(newLd) =>
            // Add it again to create circular reference
            newLd.including(typeRef, scope) match {
              case Left(_) => newLd
              case Right(anotherLd) => anotherLd
            }
        }

        val result = Hoisting.fromRef(scope, ownerCp, ownerLoc, circularLd, typeRef)

        // Should handle circular reference gracefully and return empty
        assert(result.isEmpty)
      }
    }

    test("Hoisting - Integration Tests") {
      test("fromType with TsTypeObject containing mixed member types") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val ld = createLoopDetector()

        val memberCall = createMockMemberCall()
        val memberFunction = createMockMemberFunction("testMethod")
        val memberProperty = createMockMemberProperty("testProperty")
        val getterFunction = createMockMemberFunction("getter").copy(methodType = MethodType.Getter)

        val members = IArray(memberCall, memberFunction, memberProperty, getterFunction)
        val typeObject = TsTypeObject(NoComments, members)

        val result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, typeObject)

        // Should convert only the supported members (call, function, property)
        // Getter should be filtered out
        assert(result.length == 3)
        assert(result.count(_.isInstanceOf[TsDeclFunction]) == 2) // call + function
        assert(result.count(_.isInstanceOf[TsDeclVar]) == 1) // property
      }

      test("memberToDecl preserves comments and metadata") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val comments = Comments(Comment.Raw("Test comment"))

        val memberFunction = createMockMemberFunction("testMethod")
          .copy(comments = comments)

        val result = Hoisting.memberToDecl(ownerCp, ownerLoc)(memberFunction)

        assert(result.isDefined)
        result match {
          case Some(decl) =>
            assert(decl.comments == comments)
          case _ =>
            assert(false) // Expected Some
        }
      }

      test("handles empty TsTypeObject") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val ld = createLoopDetector()

        val emptyTypeObject = TsTypeObject(NoComments, IArray.Empty)

        val result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, emptyTypeObject)

        assert(result.isEmpty)
      }
    }

    test("Hoisting - Error Handling and Edge Cases") {
      test("memberToDecl with null-like values") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()

        // Test with property that has no type
        val propertyWithoutType = createMockMemberProperty("noType")
          .copy(tpe = None)

        val result = Hoisting.memberToDecl(ownerCp, ownerLoc)(propertyWithoutType)

        assert(result.isDefined)
        result match {
          case Some(TsDeclVar(_, _, _, _, tpe, _, _, _)) =>
            assert(tpe.isEmpty)
          case _ =>
            assert(false) // Expected TsDeclVar
        }
      }

      test("fromType with various primitive types") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val ld = createLoopDetector()

        val primitiveTypes = IArray(
          TsTypeRef.any,
          TsTypeRef.void,
          TsTypeRef.never
        )

        primitiveTypes.foreach { tpe =>
          val result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, tpe)
          assert(result.isEmpty)
        }
      }

      test("memberToDecl with complex signatures") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()

        // Create a function with parameters and return type
        val complexSignature = TsFunSig(
          comments = NoComments,
          tparams = IArray(TsTypeParam(NoComments, createSimpleIdent("T"), None, None)),
          params = IArray(
            TsFunParam(NoComments, createSimpleIdent("param1"), Some(TsTypeRef.string))
          ),
          resultType = Some(TsTypeRef.boolean)
        )

        val complexFunction = createMockMemberFunction("complexMethod")
          .copy(signature = complexSignature)

        val result = Hoisting.memberToDecl(ownerCp, ownerLoc)(complexFunction)

        assert(result.isDefined)
        result match {
          case Some(TsDeclFunction(_, _, _, sig, _, _)) =>
            assert(sig.tparams.length == 1)
            assert(sig.params.length == 1)
            assert(sig.resultType.isDefined)
          case _ =>
            assert(false) // Expected TsDeclFunction
        }
      }
    }

    test("Hoisting - Performance and Boundary Conditions") {
      test("handles large TsTypeObject with many members") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val ld = createLoopDetector()

        // Create a large number of members
        val members = (1 to 50).map { i =>
          if (i % 3 == 0) createMockMemberCall()
          else if (i % 3 == 1) createMockMemberFunction(s"method$i")
          else createMockMemberProperty(s"prop$i")
        }.toArray

        val largeTypeObject = TsTypeObject(NoComments, IArray.fromArray(members))

        val result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, largeTypeObject)

        // Should convert all supported members
        assert(result.length == 50)
        assert(result.forall(_.isInstanceOf[TsNamedValueDecl]))
      }

      test("memberToDecl with static members") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()

        val staticFunction = createMockMemberFunction("staticMethod")
          .copy(isStatic = true)
        val staticProperty = createMockMemberProperty("staticProp")
          .copy(isStatic = true)

        val functionResult = Hoisting.memberToDecl(ownerCp, ownerLoc)(staticFunction)
        val propertyResult = Hoisting.memberToDecl(ownerCp, ownerLoc)(staticProperty)

        // Static members should still be converted
        assert(functionResult.isDefined)
        assert(propertyResult.isDefined)
      }

      test("fromType with nested TsTypeObject") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val ld = createLoopDetector()

        // Create nested type objects
        val innerMembers = IArray(createMockMemberProperty("innerProp"))
        val innerTypeObject = TsTypeObject(NoComments, innerMembers)

        val outerMembers = IArray(
          createMockMemberFunction("outerMethod"),
          // Note: We can't directly nest TsTypeObject as a member,
          // but we can test with the outer object
        )
        val outerTypeObject = TsTypeObject(NoComments, outerMembers)

        val result = Hoisting.fromType(scope, ownerCp, ownerLoc, ld, outerTypeObject)

        assert(result.length == 1)
        assert(result.head.isInstanceOf[TsDeclFunction])
      }

      test("memberToDecl with complex member names") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()

        // Test with special characters in names
        val specialNames = Array("$special", "_underscore", "123numeric", "kebab-case")

        specialNames.foreach { name =>
          val member = createMockMemberFunction(name)
          val result = Hoisting.memberToDecl(ownerCp, ownerLoc)(member)

          assert(result.isDefined)
          result match {
            case Some(decl) =>
              assert(decl.name.value == name)
            case _ =>
              assert(false) // Expected Some
          }
        }
      }

      test("fromRef with empty loop detector") {
        val scope = createMockScope()
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()
        val emptyLd = TsTreeScope.LoopDetector.initial
        val typeRef = createTypeRef("TestType")

        val result = Hoisting.fromRef(scope, ownerCp, ownerLoc, emptyLd, typeRef)

        // Should return empty since we don't have proper scope setup
        assert(result.isEmpty)
      }

      test("memberToDecl with various protection levels") {
        val ownerCp = createCodePath()
        val ownerLoc = createJsLocation()

        val protectionLevels = Array(
          TsProtectionLevel.Default,
          TsProtectionLevel.Private,
          TsProtectionLevel.Protected
        )

        protectionLevels.foreach { level =>
          val member = createMockMemberFunction("testMethod")
            .copy(level = level)
          val result = Hoisting.memberToDecl(ownerCp, ownerLoc)(member)

          assert(result.isDefined)
          result match {
            case Some(TsDeclFunction(_, _, _, _, _, _)) =>
              // Function should be created regardless of protection level
              assert(true)
            case _ =>
              assert(false) // Expected TsDeclFunction
          }
        }
      }
    }
  }
}