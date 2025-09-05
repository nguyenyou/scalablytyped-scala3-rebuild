package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object LibrarySpecificTests extends TestSuite {

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

  def createMockTypeAlias(
    name: String,
    alias: TsType,
    tparams: IArray[TsTypeParam] = Empty
  ): TsDeclTypeAlias =
    TsDeclTypeAlias(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = tparams,
      alias = alias,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name))
    )

  def createMockModule(
    name: TsIdentModule,
    members: IArray[TsContainerOrDecl] = Empty
  ): TsDeclModule =
    TsDeclModule(
      comments = NoComments,
      declared = false,
      name = name,
      members = members,
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent(name.value)),
      jsLocation = JsLocation.Zero
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

  def createMemberProperty(name: String): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(createTypeRef("string")),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createMemberFunction(name: String): TsMemberFunction =
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
    test("LibrarySpecific - Basic Functionality") {
      test("has Named trait") {
        val transform = LibrarySpecific.std
        assert(transform.isInstanceOf[LibrarySpecific.Named])
        assert(transform.isInstanceOf[TreeTransformationScopedChanges])
      }

      test("apply method returns correct transforms") {
        val stdTransform = LibrarySpecific(TsIdentLibrarySimple("std"))
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react"))
        val unknownTransform = LibrarySpecific(TsIdentLibrarySimple("unknown-lib"))
        
        assert(stdTransform.isDefined)
        assert(reactTransform.isDefined)
        assert(unknownTransform.isEmpty)
      }

      test("apply method returns None for unknown libraries") {
        val result = LibrarySpecific(TsIdentLibrarySimple("non-existent-library"))
        assert(result.isEmpty)
      }
    }

    test("LibrarySpecific.std - Standard Library Patches") {
      test("has correct library name") {
        assert(LibrarySpecific.std.libName == TsIdentLibrarySimple("std"))
      }

      test("removes inheritance from HTMLCollectionOf interface") {
        val scope = createMockScope()
        val htmlCollectionInterface = createMockInterface(
          "HTMLCollectionOf",
          inheritance = IArray(createTypeRef("SomeParent"))
        )
        
        val result = LibrarySpecific.std.enterTsDecl(scope)(htmlCollectionInterface)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.inheritance.isEmpty)
      }

      test("leaves other interfaces unchanged") {
        val scope = createMockScope()
        val regularInterface = createMockInterface(
          "RegularInterface",
          inheritance = IArray(createTypeRef("SomeParent"))
        )
        
        val result = LibrarySpecific.std.enterTsDecl(scope)(regularInterface)
        
        assert(result == regularInterface)
      }

      test("leaves non-interface declarations unchanged") {
        val scope = createMockScope()
        val typeAlias = createMockTypeAlias("TestAlias", createTypeRef("string"))
        
        val result = LibrarySpecific.std.enterTsDecl(scope)(typeAlias)
        
        assert(result == typeAlias)
      }
    }

    test("LibrarySpecific.react - React Library Patches") {
      test("has correct library name") {
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        assert(reactTransform.asInstanceOf[LibrarySpecific.Named].libName == TsIdentLibrarySimple("react"))
      }

      test("filters out Capture properties from DOMAttributes") {
        val scope = createMockScope()
        val captureProperty = createMemberProperty("onClickCapture")
        val regularProperty = createMemberProperty("onClick")
        val captureFunction = createMemberFunction("onFocusCapture")
        val regularFunction = createMemberFunction("onFocus")
        
        val domAttributesInterface = createMockInterface(
          "DOMAttributes",
          members = IArray(captureProperty, regularProperty, captureFunction, regularFunction)
        )
        
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val result = reactTransform.enterTsDeclInterface(scope)(domAttributesInterface)
        
        assert(result.members.length == 2)
        assert(result.members.exists {
          case prop: TsMemberProperty => prop.name.value == "onClick"
          case _ => false
        })
        assert(result.members.exists {
          case func: TsMemberFunction => func.name.value == "onFocus"
          case _ => false
        })
        assert(!result.members.exists {
          case prop: TsMemberProperty => prop.name.value.endsWith("Capture")
          case func: TsMemberFunction => func.name.value.endsWith("Capture")
          case _ => false
        })
      }

      test("leaves non-DOMAttributes interfaces unchanged") {
        val scope = createMockScope()
        val captureProperty = createMemberProperty("onClickCapture")
        val regularInterface = createMockInterface("RegularInterface", members = IArray(captureProperty))
        
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val result = reactTransform.enterTsDeclInterface(scope)(regularInterface)
        
        assert(result == regularInterface)
      }

      test("modifies ReactFragment type alias") {
        val scope = createMockScope()
        val unionType = TsTypeUnion(IArray(createTypeRef("string"), TsTypeRef.`object`, createTypeRef("number")))
        val reactFragmentAlias = createMockTypeAlias("ReactFragment", unionType)
        
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val result = reactTransform.enterTsDeclTypeAlias(scope)(reactFragmentAlias)
        
        assert(result.alias.isInstanceOf[TsTypeUnion])
        val resultUnion = result.alias.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.length == 2) // object type should be removed
        assert(!resultUnion.types.contains(TsTypeRef.`object`))
      }

      test("modifies ReactNode type alias") {
        val scope = createMockScope()
        val unionType = TsTypeUnion(IArray(createTypeRef("string"), TsTypeRef.`null`, createTypeRef("number")))
        val reactNodeAlias = createMockTypeAlias("ReactNode", unionType)
        
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val result = reactTransform.enterTsDeclTypeAlias(scope)(reactNodeAlias)
        
        assert(result.alias.isInstanceOf[TsTypeUnion])
        val resultUnion = result.alias.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.length == 2) // null type should be removed
        assert(!resultUnion.types.contains(TsTypeRef.`null`))
      }

      test("leaves other type aliases unchanged") {
        val scope = createMockScope()
        val regularAlias = createMockTypeAlias("RegularAlias", createTypeRef("string"))
        
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val result = reactTransform.enterTsDeclTypeAlias(scope)(regularAlias)
        
        assert(result == regularAlias)
      }
    }

    test("LibrarySpecific - Integration Scenarios") {
      test("handles multiple library transforms") {
        val stdTransform = LibrarySpecific(TsIdentLibrarySimple("std"))
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react"))
        val styledComponentsTransform = LibrarySpecific(TsIdentLibrarySimple("styled-components"))
        val amapTransform = LibrarySpecific(TsIdentLibrarySimple("amap-js-api"))
        val semanticUiTransform = LibrarySpecific(TsIdentLibrarySimple("semantic-ui-react"))
        
        assert(stdTransform.isDefined)
        assert(reactTransform.isDefined)
        assert(styledComponentsTransform.isDefined)
        assert(amapTransform.isDefined)
        assert(semanticUiTransform.isDefined)
      }

      test("transforms are library-specific") {
        val scope = createMockScope()
        val htmlCollectionInterface = createMockInterface(
          "HTMLCollectionOf",
          inheritance = IArray(createTypeRef("SomeParent"))
        )
        
        // std transform should modify HTMLCollectionOf
        val stdResult = LibrarySpecific.std.enterTsDecl(scope)(htmlCollectionInterface)
        assert(stdResult.asInstanceOf[TsDeclInterface].inheritance.isEmpty)
        
        // react transform should not modify HTMLCollectionOf
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val reactResult = reactTransform.enterTsDecl(scope)(htmlCollectionInterface)
        assert(reactResult == htmlCollectionInterface)
      }

      test("handles complex type structures") {
        val scope = createMockScope()
        val complexUnion = TsTypeUnion(IArray(
          createTypeRef("string"),
          TsTypeRef.`null`,
          TsTypeRef.`object`,
          createTypeRef("number"),
          createTypeRef("boolean")
        ))
        val reactNodeAlias = createMockTypeAlias("ReactNode", complexUnion)
        
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val result = reactTransform.enterTsDeclTypeAlias(scope)(reactNodeAlias)
        
        assert(result.alias.isInstanceOf[TsTypeUnion])
        val resultUnion = result.alias.asInstanceOf[TsTypeUnion]
        assert(resultUnion.types.length == 4) // null should be removed
        assert(!resultUnion.types.contains(TsTypeRef.`null`))
        assert(resultUnion.types.contains(TsTypeRef.`object`)) // object should remain for ReactNode
      }

      test("preserves declaration metadata") {
        val scope = createMockScope()
        val originalComments = Comments(Comment("Original interface comment"))
        val htmlCollectionInterface = TsDeclInterface(
          comments = originalComments,
          declared = true,
          name = createSimpleIdent("HTMLCollectionOf"),
          tparams = Empty,
          inheritance = IArray(createTypeRef("SomeParent")),
          members = Empty,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("std"), createQIdent("HTMLCollectionOf"))
        )
        
        val result = LibrarySpecific.std.enterTsDecl(scope)(htmlCollectionInterface)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.comments == originalComments)
        assert(resultInterface.declared == true)
        assert(resultInterface.name == createSimpleIdent("HTMLCollectionOf"))
        assert(resultInterface.inheritance.isEmpty) // Only inheritance should be modified
      }
    }

    test("LibrarySpecific - Edge Cases") {
      test("handles empty union types") {
        val scope = createMockScope()
        val emptyUnion = TsTypeUnion(Empty)
        val reactFragmentAlias = createMockTypeAlias("ReactFragment", emptyUnion)

        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val result = reactTransform.enterTsDeclTypeAlias(scope)(reactFragmentAlias)

        // Empty union becomes TsTypeRef.never when simplified
        assert(result.alias == TsTypeRef.never)
      }

      test("handles single-type unions") {
        val scope = createMockScope()
        val singleTypeUnion = TsTypeUnion(IArray(TsTypeRef.`object`))
        val reactFragmentAlias = createMockTypeAlias("ReactFragment", singleTypeUnion)
        
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val result = reactTransform.enterTsDeclTypeAlias(scope)(reactFragmentAlias)
        
        // Should remove object type, leaving empty or simplified union
        assert(result.alias.isInstanceOf[TsType])
      }

      test("handles non-union types in ReactFragment") {
        val scope = createMockScope()
        val nonUnionType = createTypeRef("string")
        val reactFragmentAlias = createMockTypeAlias("ReactFragment", nonUnionType)
        
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val result = reactTransform.enterTsDeclTypeAlias(scope)(reactFragmentAlias)
        
        // Should leave non-union types unchanged
        assert(result == reactFragmentAlias)
      }

      test("handles interfaces with no members") {
        val scope = createMockScope()
        val emptyInterface = createMockInterface("DOMAttributes", members = Empty)
        
        val reactTransform = LibrarySpecific(TsIdentLibrarySimple("react")).get
        val result = reactTransform.enterTsDeclInterface(scope)(emptyInterface)
        
        // Should handle empty interfaces gracefully
        assert(result.members.isEmpty)
      }
    }
  }
}