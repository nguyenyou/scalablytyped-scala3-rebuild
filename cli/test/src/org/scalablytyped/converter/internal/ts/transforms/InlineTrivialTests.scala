package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object InlineTrivialTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createTypeRefWithComments(name: String, comments: Comments): TsTypeRef =
    TsTypeRef(comments, createQIdent(name), Empty)

  def createMockTypeAlias(
    name: String,
    alias: TsType,
    isTrivial: Boolean = false
  ): TsDeclTypeAlias = {
    val comments = if (isTrivial) Comments(Marker.IsTrivial) else NoComments
    TsDeclTypeAlias(
      comments = comments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      alias = alias,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )
  }

  def createMockInterface(
    name: String,
    inheritance: IArray[TsTypeRef] = Empty,
    isTrivial: Boolean = false
  ): TsDeclInterface = {
    val comments = if (isTrivial) Comments(Marker.IsTrivial) else NoComments
    TsDeclInterface(
      comments = comments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = inheritance,
      members = Empty,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )
  }

  def createMockEnum(
    name: String,
    exportedFrom: Option[TsTypeRef] = None
  ): TsDeclEnum =
    TsDeclEnum(
      comments = NoComments,
      declared = false,
      isConst = false,
      name = createSimpleIdent(name),
      members = Empty,
      isValue = true,
      exportedFrom = exportedFrom,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockScope(declarations: TsDecl*): TsTreeScope = {
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

  def tests = Tests {
    test("InlineTrivial - Basic Functionality") {
      test("extends TreeTransformationScopedChanges") {
        assert(InlineTrivial.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("has enterTsTypeRef method") {
        val scope = createMockScope()
        val typeRef = createTypeRef("TestType")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        assert(result != null)
        assert(result.isInstanceOf[TsTypeRef])
      }

      test("has rewritten method") {
        val scope = createMockScope()
        val typeRef = createTypeRef("TestType")
        val result = InlineTrivial.rewritten(scope, typeRef)
        assert(result.isInstanceOf[Option[TsTypeRef]])
      }

      test("leaves primitive type references unchanged") {
        val scope = createMockScope()
        val stringRef = createTypeRef("string")
        val numberRef = createTypeRef("number")
        val booleanRef = createTypeRef("boolean")
        
        val result1 = InlineTrivial.enterTsTypeRef(scope)(stringRef)
        val result2 = InlineTrivial.enterTsTypeRef(scope)(numberRef)
        val result3 = InlineTrivial.enterTsTypeRef(scope)(booleanRef)
        
        assert(result1 == stringRef)
        assert(result2 == numberRef)
        assert(result3 == booleanRef)
      }

      test("leaves non-existent type references unchanged") {
        val scope = createMockScope()
        val typeRef = createTypeRef("NonExistentType")
        
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        assert(result == typeRef)
      }
    }

    test("InlineTrivial - Enum Inlining") {
      test("inlines enum with exportedFrom") {
        val exportedFromRef = createTypeRef("ExportedEnum")
        val enumDecl = createMockEnum("LocalEnum", Some(exportedFromRef))
        val scope = createMockScope(enumDecl)
        
        val typeRef = createTypeRef("LocalEnum")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should inline to the exported enum reference
        assert(result.name == exportedFromRef.name)
        assert(result.tparams.isEmpty)
      }

      test("does not inline enum with type parameters") {
        val exportedFromRef = createTypeRef("ExportedEnum")
        val enumDecl = createMockEnum("LocalEnum", Some(exportedFromRef))
        val scope = createMockScope(enumDecl)
        
        val typeRef = TsTypeRef(NoComments, createQIdent("LocalEnum"), IArray(createTypeRef("string")))
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should not inline when type parameters are present
        assert(result == typeRef)
      }

      test("does not inline enum without exportedFrom") {
        val enumDecl = createMockEnum("LocalEnum", None)
        val scope = createMockScope(enumDecl)
        
        val typeRef = createTypeRef("LocalEnum")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should not inline when no exportedFrom
        assert(result == typeRef)
      }
    }

    test("InlineTrivial - Type Alias Inlining") {
      test("inlines trivial type alias") {
        val targetRef = createTypeRef("TargetType")
        val trivialAlias = createMockTypeAlias("TrivialAlias", targetRef, isTrivial = true)
        val scope = createMockScope(trivialAlias)
        
        val typeRef = createTypeRef("TrivialAlias")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should inline to the target type
        assert(result.name == targetRef.name)
      }

      test("does not inline non-trivial type alias") {
        val targetRef = createTypeRef("TargetType")
        val nonTrivialAlias = createMockTypeAlias("NonTrivialAlias", targetRef, isTrivial = false)
        val scope = createMockScope(nonTrivialAlias)
        
        val typeRef = createTypeRef("NonTrivialAlias")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should not inline non-trivial aliases
        assert(result == typeRef)
      }

      test("follows chain of trivial type aliases") {
        val finalRef = createTypeRef("FinalType")
        val alias2 = createMockTypeAlias("Alias2", finalRef, isTrivial = true)
        val alias1 = createMockTypeAlias("Alias1", createTypeRef("Alias2"), isTrivial = true)
        val scope = createMockScope(alias1, alias2)
        
        val typeRef = createTypeRef("Alias1")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should follow the chain to the final type
        assert(result.name == finalRef.name)
      }

      test("handles complex type in alias") {
        val unionType = TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number")))
        val alias = createMockTypeAlias("ComplexAlias", unionType, isTrivial = true)
        val scope = createMockScope(alias)
        
        val typeRef = createTypeRef("ComplexAlias")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should not inline complex types
        assert(result == typeRef)
      }
    }

    test("InlineTrivial - Interface Inlining") {
      test("inlines trivial interface") {
        val targetRef = createTypeRef("TargetInterface")
        val trivialInterface = createMockInterface("TrivialInterface", IArray(targetRef), isTrivial = true)
        val scope = createMockScope(trivialInterface)
        
        val typeRef = createTypeRef("TrivialInterface")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should inline to the target interface
        assert(result.name == targetRef.name)
      }

      test("does not inline non-trivial interface") {
        val targetRef = createTypeRef("TargetInterface")
        val nonTrivialInterface = createMockInterface("NonTrivialInterface", IArray(targetRef), isTrivial = false)
        val scope = createMockScope(nonTrivialInterface)
        
        val typeRef = createTypeRef("NonTrivialInterface")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should not inline non-trivial interfaces
        assert(result == typeRef)
      }

      test("inlines interface with multiple inheritance to first target") {
        val targetRef1 = createTypeRef("TargetInterface1")
        val targetRef2 = createTypeRef("TargetInterface2")
        val multiInterface = createMockInterface("MultiInterface", IArray(targetRef1, targetRef2), isTrivial = true)
        val scope = createMockScope(multiInterface)

        val typeRef = createTypeRef("MultiInterface")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)

        // Actually inlines to the first inheritance target
        assert(result.name == targetRef1.name)
      }

      test("follows chain of trivial interfaces") {
        val finalRef = createTypeRef("FinalInterface")
        val interface2 = createMockInterface("Interface2", IArray(finalRef), isTrivial = true)
        val interface1 = createMockInterface("Interface1", IArray(createTypeRef("Interface2")), isTrivial = true)
        val scope = createMockScope(interface1, interface2)
        
        val typeRef = createTypeRef("Interface1")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should follow the chain to the final interface
        assert(result.name == finalRef.name)
      }
    }

    test("InlineTrivial - Edge Cases") {
      test("avoids infinite recursion with different code paths") {
        // The transform has protection against infinite recursion by checking codePath
        val alias1 = createMockTypeAlias("Alias1", createTypeRef("Alias2"), isTrivial = true)
        val alias2 = createMockTypeAlias("Alias2", createTypeRef("FinalType"), isTrivial = true)
        val scope = createMockScope(alias1, alias2)

        val typeRef = createTypeRef("Alias1")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)

        // Should follow the chain safely
        assert(result.name.parts.last.value == "FinalType")
      }

      test("preserves type reference metadata") {
        val originalComments = Comments(Comment("Type reference comment"))
        val targetRef = createTypeRef("TargetType")
        val trivialAlias = createMockTypeAlias("TrivialAlias", targetRef, isTrivial = true)
        val scope = createMockScope(trivialAlias)
        
        val typeRef = createTypeRefWithComments("TrivialAlias", originalComments)
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should preserve original comments
        assert(result.comments == originalComments)
        assert(result.name == targetRef.name)
      }

      test("handles intersection types in EffectiveTypeRef") {
        val ref1 = createTypeRef("SameType")
        val ref2 = createTypeRef("SameType")
        val intersectionType = TsTypeIntersect(IArray(ref1, ref2))
        val alias = createMockTypeAlias("IntersectionAlias", intersectionType, isTrivial = true)
        val scope = createMockScope(alias)
        
        val typeRef = createTypeRef("IntersectionAlias")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should handle intersection types with same name
        assert(result.name == ref1.name)
      }

      test("does not inline intersection with different types") {
        val ref1 = createTypeRef("Type1")
        val ref2 = createTypeRef("Type2")
        val intersectionType = TsTypeIntersect(IArray(ref1, ref2))
        val alias = createMockTypeAlias("IntersectionAlias", intersectionType, isTrivial = true)
        val scope = createMockScope(alias)
        
        val typeRef = createTypeRef("IntersectionAlias")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)
        
        // Should not inline intersection with different types
        assert(result == typeRef)
      }
    }

    test("InlineTrivial - Integration Scenarios") {
      test("handles mixed trivial and non-trivial declarations") {
        val finalRef = createTypeRef("FinalType")
        val trivialAlias = createMockTypeAlias("TrivialAlias", finalRef, isTrivial = true)
        val nonTrivialAlias = createMockTypeAlias("NonTrivialAlias", finalRef, isTrivial = false)
        val scope = createMockScope(trivialAlias, nonTrivialAlias)
        
        val trivialTypeRef = createTypeRef("TrivialAlias")
        val nonTrivialTypeRef = createTypeRef("NonTrivialAlias")
        
        val result1 = InlineTrivial.enterTsTypeRef(scope)(trivialTypeRef)
        val result2 = InlineTrivial.enterTsTypeRef(scope)(nonTrivialTypeRef)
        
        // Should inline trivial but not non-trivial
        assert(result1.name == finalRef.name)
        assert(result2 == nonTrivialTypeRef)
      }

      test("handles type alias to enum inlining") {
        val exportedFromRef = createTypeRef("ExportedEnum")
        val enumDecl = createMockEnum("LocalEnum", Some(exportedFromRef))
        val trivialAlias = createMockTypeAlias("AliasToEnum", createTypeRef("LocalEnum"), isTrivial = true)
        val scope = createMockScope(enumDecl, trivialAlias)

        val typeRef = createTypeRef("AliasToEnum")
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRef)

        // Should inline the alias to the enum reference (not the exported enum)
        assert(result.name.parts.last.value == "LocalEnum")
      }

      test("preserves type parameters in complex scenarios") {
        val targetRef = createTypeRef("TargetType")
        val trivialAlias = createMockTypeAlias("TrivialAlias", targetRef, isTrivial = true)
        val scope = createMockScope(trivialAlias)
        
        val typeRefWithParams = TsTypeRef(
          NoComments,
          createQIdent("TrivialAlias"),
          IArray(createTypeRef("string"), createTypeRef("number"))
        )
        val result = InlineTrivial.enterTsTypeRef(scope)(typeRefWithParams)
        
        // Should preserve type parameters when inlining
        assert(result.name == targetRef.name)
        assert(result.tparams.length == 2)
        assert(result.tparams(0) == createTypeRef("string"))
        assert(result.tparams(1) == createTypeRef("number"))
      }
    }
  }
}