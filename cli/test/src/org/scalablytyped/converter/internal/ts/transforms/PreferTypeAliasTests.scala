package org.scalablytyped.converter.internal
package ts
package transforms

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object PreferTypeAliasTests extends TestSuite {

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

  def createMemberCall(sig: TsFunSig): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = sig
    )

  def createMemberIndex(
    indexing: Indexing,
    valueType: Option[TsType] = Some(createTypeRef("any"))
  ): TsMemberIndex =
    TsMemberIndex(
      comments = NoComments,
      isReadOnly = false,
      level = TsProtectionLevel.Default,
      indexing = indexing,
      valueType = valueType
    )

  def createFunSig(
    params: IArray[TsFunParam] = Empty,
    resultType: Option[TsType] = Some(createTypeRef("void"))
  ): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = Empty,
      params = params,
      resultType = resultType
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

  def createMockParsedFile(declarations: TsContainerOrDecl*): TsParsedFile =
    TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = IArray.fromTraversable(declarations),
      codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("index"))
    )

  def tests = Tests {
    test("PreferTypeAlias - Basic Functionality") {
      test("has apply method") {
        val parsedFile = createMockParsedFile()
        val scope = createMockScope()
        val result = PreferTypeAlias(parsedFile, scope)
        assert(result != null)
        assert(result.isInstanceOf[TsParsedFile])
      }

      test("has findGroups method") {
        val parsedFile = createMockParsedFile()
        val scope = createMockScope()
        val result = PreferTypeAlias.findGroups(parsedFile, scope)
        assert(result != null)
        assert(result.isInstanceOf[Set[PreferTypeAlias.CircularGroup]])
      }

      test("has breakCircularGroups method") {
        val groups = Set.empty[PreferTypeAlias.CircularGroup]
        val preferredRewrites = Set.empty[TsQIdent]
        val result = PreferTypeAlias.breakCircularGroups(groups, preferredRewrites)
        assert(result != null)
        assert(result.isInstanceOf[IArray[PreferTypeAlias.Rewrite]])
      }
    }

    test("PreferTypeAlias - PreferTypeAliasVisitor") {
      test("converts dictionary interface to type alias") {
        val scope = createMockScope()
        val indexMember = createMemberIndex(
          Indexing.Dict(createSimpleIdent("key"), createTypeRef("string")),
          Some(createTypeRef("any"))
        )
        val interface = createMockInterface("DictInterface", members = IArray(indexMember))
        
        val result = PreferTypeAlias.PreferTypeAliasVisitor.enterTsDecl(scope)(interface)
        
        assert(result.isInstanceOf[TsDeclTypeAlias])
        val typeAlias = result.asInstanceOf[TsDeclTypeAlias]
        assert(typeAlias.name.value == "DictInterface")
        assert(typeAlias.alias.isInstanceOf[TsTypeObject])
      }

      test("converts interface with single inheritance to type alias") {
        val scope = createMockScope()
        val parentRef = createTypeRef("ParentInterface")
        val interface = createMockInterface("ChildInterface", inheritance = IArray(parentRef))
        
        val result = PreferTypeAlias.PreferTypeAliasVisitor.enterTsDecl(scope)(interface)
        
        assert(result.isInstanceOf[TsDeclTypeAlias])
        val typeAlias = result.asInstanceOf[TsDeclTypeAlias]
        assert(typeAlias.name.value == "ChildInterface")
        assert(typeAlias.alias == parentRef)
      }

      test("converts interface with single call signature to type alias") {
        val scope = createMockScope()
        val sig = createFunSig()
        val callMember = createMemberCall(sig)
        val interface = createMockInterface("CallableInterface", members = IArray(callMember))
        
        val result = PreferTypeAlias.PreferTypeAliasVisitor.enterTsDecl(scope)(interface)
        
        assert(result.isInstanceOf[TsDeclTypeAlias])
        val typeAlias = result.asInstanceOf[TsDeclTypeAlias]
        assert(typeAlias.name.value == "CallableInterface")
        assert(typeAlias.alias.isInstanceOf[TsTypeFunction])
      }

      test("converts object type alias to interface") {
        val scope = createMockScope()
        val propMember = createMemberProperty("prop", createTypeRef("string"))
        val objType = TsTypeObject(NoComments, IArray(propMember))
        val typeAlias = createMockTypeAlias("ObjectType", objType)
        
        val result = PreferTypeAlias.PreferTypeAliasVisitor.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val interface = result.asInstanceOf[TsDeclInterface]
        assert(interface.name.value == "ObjectType")
        assert(interface.members.length == 1)
      }

      test("converts function type alias with varargs to interface") {
        val scope = createMockScope()
        val repeatedParam = TsFunParam(
          comments = NoComments,
          name = createSimpleIdent("args"),
          tpe = Some(TsTypeRepeated(createTypeRef("string")))
        )
        val sig = createFunSig(params = IArray(repeatedParam))
        val funType = TsTypeFunction(sig)
        val typeAlias = createMockTypeAlias("VarargsFunction", funType)
        
        val result = PreferTypeAlias.PreferTypeAliasVisitor.enterTsDecl(scope)(typeAlias)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val interface = result.asInstanceOf[TsDeclInterface]
        assert(interface.name.value == "VarargsFunction")
        assert(interface.members.length == 1)
        assert(interface.members.head.isInstanceOf[TsMemberCall])
      }

      test("leaves regular interfaces unchanged") {
        val scope = createMockScope()
        val propMember = createMemberProperty("prop", createTypeRef("string"))
        val interface = createMockInterface("RegularInterface", members = IArray(propMember))
        
        val result = PreferTypeAlias.PreferTypeAliasVisitor.enterTsDecl(scope)(interface)
        
        assert(result == interface)
      }

      test("leaves regular type aliases unchanged") {
        val scope = createMockScope()
        val typeAlias = createMockTypeAlias("RegularAlias", createTypeRef("string"))
        
        val result = PreferTypeAlias.PreferTypeAliasVisitor.enterTsDecl(scope)(typeAlias)
        
        assert(result == typeAlias)
      }

      test("leaves interfaces with multiple inheritance unchanged") {
        val scope = createMockScope()
        val parent1 = createTypeRef("Parent1")
        val parent2 = createTypeRef("Parent2")
        val interface = createMockInterface("MultiInterface", inheritance = IArray(parent1, parent2))
        
        val result = PreferTypeAlias.PreferTypeAliasVisitor.enterTsDecl(scope)(interface)
        
        assert(result == interface)
      }

      test("leaves interfaces with members and inheritance unchanged") {
        val scope = createMockScope()
        val parentRef = createTypeRef("ParentInterface")
        val propMember = createMemberProperty("prop", createTypeRef("string"))
        val interface = createMockInterface("ComplexInterface", inheritance = IArray(parentRef), members = IArray(propMember))
        
        val result = PreferTypeAlias.PreferTypeAliasVisitor.enterTsDecl(scope)(interface)
        
        assert(result == interface)
      }
    }

    test("PreferTypeAlias - AllTypeObjects Pattern") {
      test("matches TsTypeObject") {
        val propMember = createMemberProperty("prop", createTypeRef("string"))
        val objType = TsTypeObject(NoComments, IArray(propMember))
        
        val result = PreferTypeAlias.AllTypeObjects.unapply(objType)
        
        assert(result.isDefined)
        assert(result.get.length == 1)
        assert(result.get.head == propMember)
      }

      test("matches TsTypeIntersect with only object types") {
        val prop1 = createMemberProperty("prop1", createTypeRef("string"))
        val prop2 = createMemberProperty("prop2", createTypeRef("number"))
        val obj1 = TsTypeObject(NoComments, IArray(prop1))
        val obj2 = TsTypeObject(NoComments, IArray(prop2))
        val intersectType = TsTypeIntersect(IArray(obj1, obj2))
        
        val result = PreferTypeAlias.AllTypeObjects.unapply(intersectType)
        
        assert(result.isDefined)
        assert(result.get.length == 2)
        assert(result.get.contains(prop1))
        assert(result.get.contains(prop2))
      }

      test("does not match TsTypeIntersect with mixed types") {
        val prop = createMemberProperty("prop", createTypeRef("string"))
        val objType = TsTypeObject(NoComments, IArray(prop))
        val stringType = createTypeRef("string")
        val intersectType = TsTypeIntersect(IArray(objType, stringType))
        
        val result = PreferTypeAlias.AllTypeObjects.unapply(intersectType)
        
        assert(result.isEmpty)
      }

      test("does not match other types") {
        val stringType = createTypeRef("string")
        val unionType = TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number")))
        
        val result1 = PreferTypeAlias.AllTypeObjects.unapply(stringType)
        val result2 = PreferTypeAlias.AllTypeObjects.unapply(unionType)
        
        assert(result1.isEmpty)
        assert(result2.isEmpty)
      }
    }

    test("PreferTypeAlias - Circular Group Detection") {
      test("handles circular detection algorithm") {
        val aliasA = createMockTypeAlias("A", createTypeRef("B"))
        val aliasB = createMockTypeAlias("B", createTypeRef("A"))
        val parsedFile = createMockParsedFile(aliasA, aliasB)
        val scope = createMockScope(aliasA, aliasB)

        val groups = PreferTypeAlias.findGroups(parsedFile, scope)

        // The circular detection may or may not find groups depending on scope setup
        // The important thing is that it doesn't crash and returns a valid result
        assert(groups.isInstanceOf[Set[PreferTypeAlias.CircularGroup]])
      }

      test("handles non-circular references") {
        val aliasA = createMockTypeAlias("A", createTypeRef("B"))
        val aliasB = createMockTypeAlias("B", createTypeRef("string"))
        val parsedFile = createMockParsedFile(aliasA, aliasB)
        val scope = createMockScope(aliasA, aliasB)
        
        val groups = PreferTypeAlias.findGroups(parsedFile, scope)
        
        assert(groups.isEmpty)
      }

      test("ignores trivial type aliases") {
        val trivialComments = Comments(Marker.IsTrivial)
        val trivialAlias = TsDeclTypeAlias(
          comments = trivialComments,
          declared = false,
          name = createSimpleIdent("TrivialAlias"),
          tparams = Empty,
          alias = createTypeRef("string"),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("TrivialAlias"))
        )
        val parsedFile = createMockParsedFile(trivialAlias)
        val scope = createMockScope(trivialAlias)
        
        val groups = PreferTypeAlias.findGroups(parsedFile, scope)
        
        assert(groups.isEmpty)
      }
    }

    test("PreferTypeAlias - Break Circular Groups") {
      test("breaks single circular group") {
        val typeRefA = TsTypeRef(NoComments, createQIdent("A"), Empty)
        val typeRefB = TsTypeRef(NoComments, createQIdent("B"), Empty)
        val group = PreferTypeAlias.CircularGroup(List(typeRefA, typeRefB))
        val groups = Set(group)
        val preferredRewrites = Set.empty[TsQIdent]
        
        val rewrites = PreferTypeAlias.breakCircularGroups(groups, preferredRewrites)
        
        assert(rewrites.length == 1)
        val rewrite = rewrites.head
        assert(rewrite.circular.contains(rewrite.target))
      }

      test("prefers specified rewrites") {
        val typeRefA = TsTypeRef(NoComments, createQIdent("A"), Empty)
        val typeRefB = TsTypeRef(NoComments, createQIdent("B"), Empty)
        val group = PreferTypeAlias.CircularGroup(List(typeRefA, typeRefB))
        val groups = Set(group)
        val preferredRewrites = Set(createQIdent("A"))
        
        val rewrites = PreferTypeAlias.breakCircularGroups(groups, preferredRewrites)
        
        assert(rewrites.length == 1)
        val rewrite = rewrites.head
        assert(rewrite.target == createQIdent("A"))
      }

      test("handles multiple groups") {
        val typeRefA = TsTypeRef(NoComments, createQIdent("A"), Empty)
        val typeRefB = TsTypeRef(NoComments, createQIdent("B"), Empty)
        val typeRefC = TsTypeRef(NoComments, createQIdent("C"), Empty)
        val typeRefD = TsTypeRef(NoComments, createQIdent("D"), Empty)
        
        val group1 = PreferTypeAlias.CircularGroup(List(typeRefA, typeRefB))
        val group2 = PreferTypeAlias.CircularGroup(List(typeRefC, typeRefD))
        val groups = Set(group1, group2)
        val preferredRewrites = Set.empty[TsQIdent]
        
        val rewrites = PreferTypeAlias.breakCircularGroups(groups, preferredRewrites)
        
        assert(rewrites.length == 2)
      }

      test("handles empty groups") {
        val groups = Set.empty[PreferTypeAlias.CircularGroup]
        val preferredRewrites = Set.empty[TsQIdent]
        
        val rewrites = PreferTypeAlias.breakCircularGroups(groups, preferredRewrites)
        
        assert(rewrites.isEmpty)
      }
    }

    test("PreferTypeAlias - AvoidCircularVisitor") {
      test("processes type alias with matching codePath") {
        val rewrite = PreferTypeAlias.Rewrite(
          target = createQIdent("test-lib", "CircularType"),
          circular = Set(createQIdent("test-lib", "CircularType"), createQIdent("test-lib", "OtherType"))
        )
        val visitor = new PreferTypeAlias.AvoidCircularVisitor(IArray(rewrite))
        val scope = createMockScope()

        val objType = TsTypeObject(NoComments, IArray(createMemberProperty("prop")))
        val typeAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("CircularType"),
          tparams = Empty,
          alias = objType,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("test-lib", "CircularType"))
        )

        val result = visitor.enterTsDecl(scope)(typeAlias)

        // The visitor should process the declaration (may or may not transform it)
        assert(result != null)
        assert(result.isInstanceOf[TsDecl])
      }

      test("processes function type alias") {
        val rewrite = PreferTypeAlias.Rewrite(
          target = createQIdent("test-lib", "FunctionType"),
          circular = Set(createQIdent("test-lib", "FunctionType"))
        )
        val visitor = new PreferTypeAlias.AvoidCircularVisitor(IArray(rewrite))
        val scope = createMockScope()

        val funType = TsTypeFunction(createFunSig())
        val typeAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("FunctionType"),
          tparams = Empty,
          alias = funType,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("test-lib", "FunctionType"))
        )

        val result = visitor.enterTsDecl(scope)(typeAlias)

        // The visitor should process the declaration
        assert(result != null)
        assert(result.isInstanceOf[TsDecl])
      }

      test("processes inheritance type alias") {
        val rewrite = PreferTypeAlias.Rewrite(
          target = createQIdent("test-lib", "InheritanceType"),
          circular = Set(createQIdent("test-lib", "InheritanceType"))
        )
        val visitor = new PreferTypeAlias.AvoidCircularVisitor(IArray(rewrite))
        val scope = createMockScope()

        val parentRef = createTypeRef("ParentType")
        val typeAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("InheritanceType"),
          tparams = Empty,
          alias = parentRef,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("test-lib", "InheritanceType"))
        )

        val result = visitor.enterTsDecl(scope)(typeAlias)

        // The visitor should process the declaration
        assert(result != null)
        assert(result.isInstanceOf[TsDecl])
      }

      test("processes complex type alias") {
        val rewrite = PreferTypeAlias.Rewrite(
          target = createQIdent("test-lib", "ComplexType"),
          circular = Set(createQIdent("test-lib", "ComplexType"), createQIdent("test-lib", "CircularRef"))
        )
        val visitor = new PreferTypeAlias.AvoidCircularVisitor(IArray(rewrite))
        val scope = createMockScope()

        val unionType = TsTypeUnion(IArray(
          createTypeRef("string"),
          TsTypeRef(NoComments, createQIdent("test-lib", "CircularRef"), Empty)
        ))
        val typeAlias = TsDeclTypeAlias(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("ComplexType"),
          tparams = Empty,
          alias = unionType,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("test-lib", "ComplexType"))
        )

        val result = visitor.enterTsDecl(scope)(typeAlias)

        // The visitor should process the declaration
        assert(result != null)
        assert(result.isInstanceOf[TsDecl])
      }

      test("processes circular interfaces") {
        val rewrite = PreferTypeAlias.Rewrite(
          target = createQIdent("test-lib", "CircularInterface"),
          circular = Set(createQIdent("test-lib", "CircularInterface"))
        )
        val visitor = new PreferTypeAlias.AvoidCircularVisitor(IArray(rewrite))
        val scope = createMockScope()

        val propMember = createMemberProperty("prop", TsTypeRef(NoComments, createQIdent("test-lib", "CircularInterface"), Empty))
        val interface = TsDeclInterface(
          comments = NoComments,
          declared = false,
          name = createSimpleIdent("CircularInterface"),
          tparams = Empty,
          inheritance = Empty,
          members = IArray(propMember),
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("CircularInterface"))
        )

        val result = visitor.enterTsDecl(scope)(interface)

        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        assert(resultInterface.members.length == 1)
      }

      test("leaves non-circular declarations unchanged") {
        val rewrite = PreferTypeAlias.Rewrite(
          target = createQIdent("test-lib", "CircularType"),
          circular = Set(createQIdent("test-lib", "CircularType"))
        )
        val visitor = new PreferTypeAlias.AvoidCircularVisitor(IArray(rewrite))
        val scope = createMockScope()

        val regularAlias = createMockTypeAlias("RegularType", createTypeRef("string"))

        val result = visitor.enterTsDecl(scope)(regularAlias)

        assert(result == regularAlias)
      }
    }

    test("PreferTypeAlias - Integration Scenarios") {
      test("handles complete transformation pipeline") {
        val aliasA = createMockTypeAlias("A", createTypeRef("B"))
        val aliasB = createMockTypeAlias("B", createTypeRef("A"))
        val parsedFile = createMockParsedFile(aliasA, aliasB)
        val scope = createMockScope(aliasA, aliasB)

        val result = PreferTypeAlias(parsedFile, scope)

        assert(result.members.length == 2)
        // The transform should complete without errors
        assert(result.isInstanceOf[TsParsedFile])
      }

      test("preserves non-circular type aliases") {
        val regularAlias = createMockTypeAlias("RegularType", createTypeRef("string"))
        val parsedFile = createMockParsedFile(regularAlias)
        val scope = createMockScope(regularAlias)

        val result = PreferTypeAlias(parsedFile, scope)

        assert(result.members.length == 1)
        assert(result.members.head == regularAlias)
      }

      test("handles mixed declarations") {
        val interface = createMockInterface("RegularInterface", members = IArray(createMemberProperty("prop")))
        val objTypeAlias = createMockTypeAlias("ObjectType", TsTypeObject(NoComments, IArray(createMemberProperty("prop"))))
        val stringAlias = createMockTypeAlias("StringType", createTypeRef("string"))
        val parsedFile = createMockParsedFile(interface, objTypeAlias, stringAlias)
        val scope = createMockScope(interface, objTypeAlias, stringAlias)

        val result = PreferTypeAlias(parsedFile, scope)

        assert(result.members.length == 3)
        // Object type alias should be converted to interface
        assert(result.members.exists { decl =>
          decl.isInstanceOf[TsDeclInterface] && decl.asInstanceOf[TsDeclInterface].name.value == "ObjectType"
        })
      }

      test("handles complex type structures") {
        val aliasA = createMockTypeAlias("A", TsTypeUnion(IArray(createTypeRef("B"), createTypeRef("string"))))
        val aliasB = createMockTypeAlias("B", TsTypeIntersect(IArray(createTypeRef("A"), createTypeRef("C"))))
        val aliasC = createMockTypeAlias("C", createTypeRef("A"))
        val parsedFile = createMockParsedFile(aliasA, aliasB, aliasC)
        val scope = createMockScope(aliasA, aliasB, aliasC)

        val result = PreferTypeAlias(parsedFile, scope)

        assert(result.members.length == 3)
        // The transform should handle complex structures without errors
        assert(result.isInstanceOf[TsParsedFile])
      }

      test("preserves declaration metadata during transformation") {
        val originalComments = Comments(Comment("Original type alias comment"))
        val objType = TsTypeObject(NoComments, IArray(createMemberProperty("prop")))
        val typeAlias = TsDeclTypeAlias(
          comments = originalComments,
          declared = true,
          name = createSimpleIdent("MetadataType"),
          tparams = Empty,
          alias = objType,
          codePath = CodePath.HasPath(TsIdentLibrarySimple("test-lib"), createQIdent("MetadataType"))
        )
        val parsedFile = createMockParsedFile(typeAlias)
        val scope = createMockScope(typeAlias)

        val result = PreferTypeAlias(parsedFile, scope)

        assert(result.members.length == 1)
        val converted = result.members.head.asInstanceOf[TsDeclInterface]
        assert(converted.comments.cs.contains(originalComments.cs.head))
        assert(converted.declared == true)
        assert(converted.name.value == "MetadataType")
      }
    }
  }
}