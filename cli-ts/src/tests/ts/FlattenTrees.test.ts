/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.FlattenTreesTests
 *
 * Comprehensive test suite for FlattenTrees functionality
 */

import { expect, test, describe } from "bun:test";
import { some, none } from 'fp-ts/Option';
import { FlattenTrees } from "@/internal/ts/FlattenTrees";
import { IArray } from "@/internal/IArray";
import { Comments } from "@/internal/Comments";
import { Comment } from "@/internal/Comment";
import { CodePath } from "@/internal/ts/CodePath";
import { JsLocation } from "@/internal/ts/JsLocation";
import { TsProtectionLevel } from "@/internal/ts/TsProtectionLevel";
import { MethodType } from "@/internal/ts/MethodType";
import { Directive } from "@/internal/ts/Directive";

import {
  TsTree,
  TsContainerOrDecl,
  TsNamedDecl,
  TsMember,
  TsIdent,
  TsIdentSimple,
  TsIdentModule,
  TsQIdent,
  TsTypeRef,
  TsType,
  TsTypeParam,
  TsEnumMember,
  TsParsedFile,
  TsDeclClass,
  TsDeclInterface,
  TsDeclNamespace,
  TsDeclModule,
  TsDeclFunction,
  TsDeclVar,
  TsDeclEnum,
  TsDeclTypeAlias,
  TsAugmentedModule,
  TsGlobal,
  TsMemberProperty,
  TsMemberIndex,
  TsMemberFunction,
  TsMemberCtor,
  TsFunSig,
  TsFunParam,
  Indexing,
  IndexingDict
} from "@/internal/ts/trees";

/**
 * Comprehensive test suite for FlattenTrees
 * This is a direct port of the Scala FlattenTreesTests
 */
describe("FlattenTrees Tests", () => {

  // ============================================================================
  // Helper methods for creating test data (ported from Scala)
  // ============================================================================

  function createSimpleIdent(name: string): TsIdentSimple {
    return TsIdent.simple(name);
  }

  function createModuleIdent(name: string): TsIdentModule {
    return TsIdentModule.simple(name);
  }

  function createMockComments(text: string): Comments {
    return Comments.create(text);
  }

  function createMockDirective(): Directive {
    return Directive.noStdLib();
  }

  function createMockCodePath(path: string): CodePath {
    return CodePath.hasPath(createSimpleIdent(path), TsQIdent.of(createSimpleIdent(path)));
  }

  function createMockParsedFile(
    name: string,
    comments: Comments = Comments.empty(),
    directives: IArray<Directive> = IArray.Empty,
    members: IArray<TsContainerOrDecl> = IArray.Empty,
    codePath: CodePath = CodePath.noPath()
  ): TsParsedFile {
    return TsParsedFile.create(comments, directives, members, codePath);
  }

  function createMockClass(
    name: string,
    comments: Comments = Comments.empty(),
    declared: boolean = false,
    isAbstract: boolean = false,
    tparams: IArray<TsTypeParam> = IArray.Empty,
    parent: TsTypeRef | undefined = undefined,
    implementsInterfaces: IArray<TsTypeRef> = IArray.Empty,
    members: IArray<TsMember> = IArray.Empty,
    jsLocation: JsLocation = JsLocation.zero(),
    codePath: CodePath = CodePath.noPath()
  ): TsDeclClass {
    return TsDeclClass.create(
      comments,
      declared,
      isAbstract,
      createSimpleIdent(name),
      tparams,
      parent ? some(parent) : none,
      implementsInterfaces,
      members,
      jsLocation,
      codePath
    );
  }

  function createMockInterface(
    name: string,
    comments: Comments = Comments.empty(),
    declared: boolean = false,
    tparams: IArray<TsTypeParam> = IArray.Empty,
    inheritance: IArray<TsTypeRef> = IArray.Empty,
    members: IArray<TsMember> = IArray.Empty,
    codePath: CodePath = CodePath.noPath()
  ): TsDeclInterface {
    return TsDeclInterface.create(
      comments,
      declared,
      createSimpleIdent(name),
      tparams,
      inheritance,
      members,
      codePath
    );
  }

  function createMockNamespace(
    name: string,
    comments: Comments = Comments.empty(),
    declared: boolean = false,
    members: IArray<TsContainerOrDecl> = IArray.Empty,
    codePath: CodePath = CodePath.noPath(),
    jsLocation: JsLocation = JsLocation.zero()
  ): TsDeclNamespace {
    return TsDeclNamespace.create(
      comments,
      declared,
      createSimpleIdent(name),
      members,
      codePath,
      jsLocation
    );
  }

  function createMockModule(
    name: string,
    comments: Comments = Comments.empty(),
    declared: boolean = false,
    members: IArray<TsContainerOrDecl> = IArray.Empty,
    codePath: CodePath = CodePath.noPath(),
    jsLocation: JsLocation = JsLocation.zero()
  ): TsDeclModule {
    return TsDeclModule.create(
      comments,
      declared,
      createModuleIdent(name),
      members,
      codePath,
      jsLocation
    );
  }

  function createMockFunction(
    name: string,
    comments: Comments = Comments.empty(),
    declared: boolean = false,
    signature: TsFunSig = TsFunSig.simple(IArray.Empty, none),
    jsLocation: JsLocation = JsLocation.zero(),
    codePath: CodePath = CodePath.noPath()
  ): TsDeclFunction {
    return TsDeclFunction.create(
      comments,
      declared,
      createSimpleIdent(name),
      signature,
      jsLocation,
      codePath
    );
  }

  function createMockVar(
    name: string,
    comments: Comments = Comments.empty(),
    declared: boolean = false,
    readOnly: boolean = false,
    tpe: TsType | undefined = undefined,
    jsLocation: JsLocation = JsLocation.zero(),
    codePath: CodePath = CodePath.noPath()
  ): TsDeclVar {
    return TsDeclVar.create(
      comments,
      declared,
      readOnly,
      createSimpleIdent(name),
      tpe ? some(tpe) : none,
      none, // expr
      jsLocation,
      codePath
    );
  }

  function createMockEnum(
    name: string,
    comments: Comments = Comments.empty(),
    declared: boolean = false,
    isConst: boolean = false,
    members: IArray<TsEnumMember> = IArray.Empty,
    isValue: boolean = true,
    jsLocation: JsLocation = JsLocation.zero(),
    codePath: CodePath = CodePath.noPath()
  ): TsDeclEnum {
    return TsDeclEnum.create(
      comments,
      declared,
      isConst,
      createSimpleIdent(name),
      members,
      isValue,
      none, // exportedFrom
      jsLocation,
      codePath
    );
  }

  function createMockTypeAlias(
    name: string,
    alias: TsType,
    comments: Comments = Comments.empty(),
    declared: boolean = false,
    tparams: IArray<TsTypeParam> = IArray.Empty,
    codePath: CodePath = CodePath.noPath()
  ): TsDeclTypeAlias {
    return TsDeclTypeAlias.create(
      comments,
      declared,
      createSimpleIdent(name),
      tparams,
      alias,
      codePath
    );
  }

  function createMockAugmentedModule(
    name: string,
    comments: Comments = Comments.empty(),
    members: IArray<TsContainerOrDecl> = IArray.Empty,
    codePath: CodePath = CodePath.noPath(),
    jsLocation: JsLocation = JsLocation.zero()
  ): TsAugmentedModule {
    return TsAugmentedModule.create(
      comments,
      createModuleIdent(name),
      members,
      codePath,
      jsLocation
    );
  }

  function createMockGlobal(
    comments: Comments = Comments.empty(),
    declared: boolean = false,
    members: IArray<TsContainerOrDecl> = IArray.Empty,
    codePath: CodePath = CodePath.noPath()
  ): TsGlobal {
    return TsGlobal.create(
      comments,
      declared,
      members,
      codePath
    );
  }

  function createMockProperty(
    name: string,
    comments: Comments = Comments.empty(),
    level: TsProtectionLevel = TsProtectionLevel.default(),
    tpe: TsType | undefined = undefined,
    isStatic: boolean = false,
    isReadOnly: boolean = false
  ): TsMemberProperty {
    return TsMemberProperty.create(
      comments,
      level,
      createSimpleIdent(name),
      tpe ? some(tpe) : none,
      none, // expr
      isStatic,
      isReadOnly
    );
  }

  function createMockMethod(
    name: string,
    comments: Comments = Comments.empty(),
    level: TsProtectionLevel = TsProtectionLevel.default(),
    methodType: MethodType = MethodType.normal(),
    signature: TsFunSig = TsFunSig.simple(IArray.Empty, none),
    isStatic: boolean = false,
    isReadOnly: boolean = false
  ): TsMemberFunction {
    return TsMemberFunction.create(
      comments,
      level,
      createSimpleIdent(name),
      methodType,
      signature,
      isStatic,
      isReadOnly
    );
  }

  function createMockCtor(
    comments: Comments = Comments.empty(),
    level: TsProtectionLevel = TsProtectionLevel.default(),
    signature: TsFunSig = TsFunSig.simple(IArray.Empty, none)
  ): TsMemberCtor {
    return TsMemberCtor.create(
      comments,
      level,
      signature
    );
  }

  function createMockTypeParam(name: string): TsTypeParam {
    return TsTypeParam.create(
      Comments.empty(),
      createSimpleIdent(name),
      none, // upperBound
      none  // defaultType
    );
  }

  function createMockIndex(
    indexing: Indexing = IndexingDict.create(createSimpleIdent("key"), TsTypeRef.string),
    valueType: TsType | undefined = TsTypeRef.any,
    isReadOnly: boolean = false,
    level: TsProtectionLevel = TsProtectionLevel.default(),
    comments: Comments = Comments.empty()
  ): TsMemberIndex {
    return TsMemberIndex.create(
      comments,
      isReadOnly,
      level,
      indexing,
      valueType ? some(valueType) : none
    );
  }

  // ============================================================================
  // Test Cases (ported from Scala)
  // ============================================================================

  describe("FlattenTrees - apply methods", () => {
    test("single file processing", () => {
      const file = createMockParsedFile("test",
        Comments.empty(),
        IArray.Empty,
        IArray.fromArray<TsContainerOrDecl>([createMockClass("TestClass")]));
      const result = FlattenTrees.applySingle(file);

      expect(result.members.length).toBe(1);
      expect((result.members.apply(0) as TsDeclClass).name.value).toBe("TestClass");
    });

    test("multiple file merging", () => {
      const file1 = createMockParsedFile("file1",
        Comments.empty(),
        IArray.Empty,
        IArray.fromArray<TsContainerOrDecl>([createMockClass("Class1")]));
      const file2 = createMockParsedFile("file2",
        Comments.empty(),
        IArray.Empty,
        IArray.fromArray<TsContainerOrDecl>([createMockClass("Class2")]));
      const files = IArray.fromArray([file1, file2]);
      const result = FlattenTrees.apply(files);

      expect(result.members.length).toBe(2);
      const classNames = result.members.map(m => (m as TsDeclClass).name.value).toSet();
      expect(classNames.has("Class1")).toBe(true);
      expect(classNames.has("Class2")).toBe(true);
    });

    test("empty file handling", () => {
      const emptyFile = createMockParsedFile("empty");
      const result = FlattenTrees.applySingle(emptyFile);

      expect(result.members.isEmpty).toBe(true);
      expect(result.directives.isEmpty).toBe(true);
      expect(result.comments).toEqual(Comments.empty());
    });

    test("empty file array", () => {
      const result = FlattenTrees.apply(IArray.Empty);

      expect(result.members.isEmpty).toBe(true);
      expect(result.directives.isEmpty).toBe(true);
      expect(result.comments).toEqual(Comments.empty());
      expect(result.codePath._tag).toBe('NoPath');
    });
  });

  describe("FlattenTrees - file merging", () => {
    test("merge files with different comments", () => {
      const comments1 = createMockComments("File 1 comment");
      const comments2 = createMockComments("File 2 comment");
      const file1 = createMockParsedFile("file1", comments1);
      const file2 = createMockParsedFile("file2", comments2);

      const result = FlattenTrees.mergeFile(file1, file2);

      expect(result.comments.cs.length).toBe(2);
    });

    test("merge files with different directives", () => {
      const directive1 = createMockDirective();
      const file1 = createMockParsedFile("file1", Comments.empty(), IArray.fromArray([directive1]));
      const file2 = createMockParsedFile("file2", Comments.empty(), IArray.fromArray([directive1]));

      const result = FlattenTrees.mergeFile(file1, file2);

      expect(result.directives.length).toBe(1); // Should be distinct
    });

    test("merge files with different code paths", () => {
      const path1 = createMockCodePath("path1");
      const path2 = createMockCodePath("path2");
      const file1 = createMockParsedFile("file1", Comments.empty(), IArray.Empty, IArray.Empty, path1);
      const file2 = createMockParsedFile("file2", Comments.empty(), IArray.Empty, IArray.Empty, path2);

      const result = FlattenTrees.mergeFile(file1, file2);

      expect(result.codePath).toBe(path1); // First path should win
    });

    test("merge files with overlapping members", () => {
      const class1 = createMockClass("TestClass", Comments.empty(), false, false, IArray.Empty, undefined, IArray.Empty, IArray.fromArray<TsMember>([createMockProperty("prop1")]));
      const class2 = createMockClass("TestClass", Comments.empty(), false, false, IArray.Empty, undefined, IArray.Empty, IArray.fromArray<TsMember>([createMockProperty("prop2")]));
      const file1 = createMockParsedFile("file1", Comments.empty(), IArray.Empty, IArray.fromArray<TsContainerOrDecl>([class1]));
      const file2 = createMockParsedFile("file2", Comments.empty(), IArray.Empty, IArray.fromArray<TsContainerOrDecl>([class2]));

      const result = FlattenTrees.mergeFile(file1, file2);

      expect(result.members.length).toBe(1);
      const mergedClass = result.members.apply(0) as TsDeclClass;
      expect(mergedClass.name.value).toBe("TestClass");
      expect(mergedClass.members.length).toBe(2);
    });
  });

  describe("FlattenTrees - member merging", () => {
    test("merge named and unnamed members", () => {
      const namedMember = createMockClass("NamedClass");
      const unnamedMember = createMockGlobal();
      const these = IArray.fromArray<TsContainerOrDecl>([namedMember]);
      const thats = IArray.fromArray<TsContainerOrDecl>([unnamedMember]);

      const result = FlattenTrees.newMembers(these, thats);

      expect(result.length).toBe(2);
      // Check that we have a class with the expected name
      const hasNamedClass = result.exists(m => TsDeclClass.isClass(m) && (m as TsDeclClass).name.value === "NamedClass");
      expect(hasNamedClass).toBe(true);
      // Check that we have a global member
      const hasGlobal = result.exists(m => TsGlobal.isGlobal(m));
      expect(hasGlobal).toBe(true);
    });

    test("merge TsGlobal members", () => {
      const global1 = createMockGlobal(Comments.empty(), false, IArray.fromArray<TsContainerOrDecl>([createMockClass("Class1")]));
      const global2 = createMockGlobal(Comments.empty(), false, IArray.fromArray<TsContainerOrDecl>([createMockClass("Class2")]));
      const these = IArray.fromArray<TsContainerOrDecl>([global1]);
      const thats = IArray.fromArray<TsContainerOrDecl>([global2]);

      const result = FlattenTrees.newMembers(these, thats);

      expect(result.length).toBe(1);
      const mergedGlobal = result.apply(0) as TsGlobal;
      expect(mergedGlobal.members.length).toBe(2);
    });

    test("preserve non-global unnamed members", () => {
      const class1 = createMockClass("Class1");
      const class2 = createMockClass("Class2");
      const these = IArray.fromArray<TsContainerOrDecl>([class1]);
      const thats = IArray.fromArray<TsContainerOrDecl>([class2]);

      const result = FlattenTrees.newMembers(these, thats);

      expect(result.length).toBe(2);
      // Check that we have both classes by name
      const hasClass1 = result.exists(m => TsDeclClass.isClass(m) && (m as TsDeclClass).name.value === "Class1");
      const hasClass2 = result.exists(m => TsDeclClass.isClass(m) && (m as TsDeclClass).name.value === "Class2");
      expect(hasClass1).toBe(true);
      expect(hasClass2).toBe(true);
    });
  });

  describe("FlattenTrees - named member merging", () => {
    test("merge namespaces with same name", () => {
      const ns1 = createMockNamespace("TestNS", Comments.empty(), false, IArray.fromArray<TsContainerOrDecl>([createMockClass("Class1")]));
      const ns2 = createMockNamespace("TestNS", Comments.empty(), false, IArray.fromArray<TsContainerOrDecl>([createMockClass("Class2")]));
      const these = IArray.fromArray<TsNamedDecl>([ns1]);
      const thats = IArray.fromArray<TsNamedDecl>([ns2]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(1);
      const mergedNS = result.apply(0) as TsDeclNamespace;
      expect(mergedNS.name.value).toBe("TestNS");
      expect(mergedNS.members.length).toBe(2);
    });

    test("merge modules with same name", () => {
      const mod1 = createMockModule("TestMod", Comments.empty(), false, IArray.fromArray<TsContainerOrDecl>([createMockClass("Class1")]));
      const mod2 = createMockModule("TestMod", Comments.empty(), false, IArray.fromArray<TsContainerOrDecl>([createMockClass("Class2")]));
      const these = IArray.fromArray<TsNamedDecl>([mod1]);
      const thats = IArray.fromArray<TsNamedDecl>([mod2]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(1);
      const mergedMod = result.apply(0) as TsDeclModule;
      expect(mergedMod.name.value).toBe("TestMod");
      expect(mergedMod.members.length).toBe(2);
    });

    test("merge classes with same name", () => {
      const class1 = createMockClass("TestClass", Comments.empty(), false, false, IArray.Empty, undefined, IArray.Empty, IArray.fromArray<TsMember>([createMockProperty("prop1")]));
      const class2 = createMockClass("TestClass", Comments.empty(), false, false, IArray.Empty, undefined, IArray.Empty, IArray.fromArray<TsMember>([createMockProperty("prop2")]));
      const these = IArray.fromArray<TsNamedDecl>([class1]);
      const thats = IArray.fromArray<TsNamedDecl>([class2]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(1);
      const mergedClass = result.apply(0) as TsDeclClass;
      expect(mergedClass.name.value).toBe("TestClass");
      expect(mergedClass.members.length).toBe(2);
    });

    test("merge interfaces with same name", () => {
      const iface1 = createMockInterface("TestInterface", Comments.empty(), false, IArray.Empty, IArray.Empty, IArray.fromArray<TsMember>([createMockProperty("prop1")]));
      const iface2 = createMockInterface("TestInterface", Comments.empty(), false, IArray.Empty, IArray.Empty, IArray.fromArray<TsMember>([createMockProperty("prop2")]));
      const these = IArray.fromArray<TsNamedDecl>([iface1]);
      const thats = IArray.fromArray<TsNamedDecl>([iface2]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(1);
      const mergedInterface = result.apply(0) as TsDeclInterface;
      expect(mergedInterface.name.value).toBe("TestInterface");
      expect(mergedInterface.members.length).toBe(2);
    });
  });

  describe("FlattenTrees - cross-type merging", () => {
    test("merge namespace and function with same name", () => {
      const ns = createMockNamespace("TestName", Comments.empty(), false, IArray.fromArray<TsContainerOrDecl>([createMockClass("InnerClass")]));
      const func = createMockFunction("TestName", Comments.empty(), false, TsFunSig.simple(IArray.Empty, none));
      const these = IArray.fromArray<TsNamedDecl>([ns]);
      const thats = IArray.fromArray<TsNamedDecl>([func]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      // According to Scala implementation: namespace + function → merged namespace with function as namespaced member
      expect(result.length).toBe(1);
      const mergedNS = result.apply(0) as TsDeclNamespace;
      expect(TsDeclNamespace.isNamespace(mergedNS)).toBe(true);
      expect(mergedNS.name.value).toBe("TestName");
      expect(mergedNS.members.length).toBe(2); // Original InnerClass + namespaced function
    });

    test("merge enum and class with same name", () => {
      const enumDecl = createMockEnum("TestName", Comments.empty(), false, false, IArray.Empty, true);
      const classDecl = createMockClass("TestName", Comments.empty(), false, false, IArray.Empty, undefined, IArray.Empty, IArray.fromArray<TsMember>([createMockProperty("prop")]));
      const these = IArray.fromArray<TsNamedDecl>([enumDecl]);
      const thats = IArray.fromArray<TsNamedDecl>([classDecl]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(2); // Both should be preserved as they're different types
      const hasEnum = result.exists(m => TsDeclEnum.isEnum(m) && (m as TsDeclEnum).name.value === "TestName");
      const hasClass = result.exists(m => TsDeclClass.isClass(m) && (m as TsDeclClass).name.value === "TestName");
      expect(hasEnum).toBe(true);
      expect(hasClass).toBe(true);
    });

    test("merge type alias and interface with same name", () => {
      const typeAlias = createMockTypeAlias("TestName", TsTypeRef.string, Comments.empty(), false, IArray.Empty);
      const iface = createMockInterface("TestName", Comments.empty(), false, IArray.Empty, IArray.Empty, IArray.fromArray<TsMember>([createMockProperty("prop")]));
      const these = IArray.fromArray<TsNamedDecl>([typeAlias]);
      const thats = IArray.fromArray<TsNamedDecl>([iface]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(2); // Both should be preserved as they're different types
      const hasTypeAlias = result.exists(m => TsDeclTypeAlias.isTypeAlias(m) && (m as TsDeclTypeAlias).name.value === "TestName");
      const hasInterface = result.exists(m => TsDeclInterface.isInterface(m) && (m as TsDeclInterface).name.value === "TestName");
      expect(hasTypeAlias).toBe(true);
      expect(hasInterface).toBe(true);
    });

    test("merge variable and class with same name", () => {
      const variable = createMockVar("TestName", Comments.empty(), false, false, TsTypeRef.string);
      const classDecl = createMockClass("TestName", Comments.empty(), false, false, IArray.Empty, undefined, IArray.Empty, IArray.fromArray<TsMember>([createMockProperty("prop")]));
      const these = IArray.fromArray<TsNamedDecl>([variable]);
      const thats = IArray.fromArray<TsNamedDecl>([classDecl]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(2); // Both should be preserved as they're different types
      const hasVariable = result.exists(m => TsDeclVar.isVar(m) && (m as TsDeclVar).name.value === "TestName");
      const hasClass = result.exists(m => TsDeclClass.isClass(m) && (m as TsDeclClass).name.value === "TestName");
      expect(hasVariable).toBe(true);
      expect(hasClass).toBe(true);
    });

    test("merge augmented module and namespace", () => {
      const augModule = createMockAugmentedModule("TestName", Comments.empty(), IArray.fromArray<TsContainerOrDecl>([createMockClass("ModuleClass")]));
      const ns = createMockNamespace("TestName", Comments.empty(), false, IArray.fromArray<TsContainerOrDecl>([createMockClass("NamespaceClass")]));
      const these = IArray.fromArray<TsNamedDecl>([augModule]);
      const thats = IArray.fromArray<TsNamedDecl>([ns]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(2); // Both should be preserved as they're different types
      const hasAugModule = result.exists(m => TsAugmentedModule.isAugmentedModule(m) && (m as TsAugmentedModule).name.value === "TestName");
      const hasNamespace = result.exists(m => TsDeclNamespace.isNamespace(m) && (m as TsDeclNamespace).name.value === "TestName");
      expect(hasAugModule).toBe(true);
      expect(hasNamespace).toBe(true);
    });

    test("merge different types with same name - priority order", () => {
      // Based on Scala implementation: namespace + function + variable → merged namespace, enum → separate
      const ns = createMockNamespace("TestName");
      const func = createMockFunction("TestName");
      const variable = createMockVar("TestName");
      const enumDecl = createMockEnum("TestName");
      const these = IArray.fromArray<TsNamedDecl>([ns, func]);
      const thats = IArray.fromArray<TsNamedDecl>([variable, enumDecl]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(2); // namespace+function+variable merge, enum separate
      const hasNamespace = result.exists(m => TsDeclNamespace.isNamespace(m));
      const hasEnum = result.exists(m => TsDeclEnum.isEnum(m));
      expect(hasNamespace).toBe(true);
      expect(hasEnum).toBe(true);

      // Check that the namespace contains the merged function and variable as members
      const mergedNamespace = result.find(m => TsDeclNamespace.isNamespace(m)) as TsDeclNamespace;
      expect(mergedNamespace.members.length).toBeGreaterThan(0); // Should have namespaced members
    });

    test("merge function overloads", () => {
      const func1 = createMockFunction("testFunc", Comments.empty(), false,
        TsFunSig.simple(IArray.fromArray([TsFunParam.typed(createSimpleIdent("x"), TsTypeRef.number)]), some(TsTypeRef.string)));
      const func2 = createMockFunction("testFunc", Comments.empty(), false,
        TsFunSig.simple(IArray.fromArray([TsFunParam.typed(createSimpleIdent("x"), TsTypeRef.string)]), some(TsTypeRef.number)));
      const these = IArray.fromArray<TsNamedDecl>([func1]);
      const thats = IArray.fromArray<TsNamedDecl>([func2]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      // According to Scala: functions with same name are preserved separately (no automatic merging)
      expect(result.length).toBe(2); // Functions with same name should be preserved separately
      const functions = result.filter(m => TsDeclFunction.isFunction(m));
      expect(functions.length).toBe(2);
    });

    test("merge enum members", () => {
      // Create enums with proper CodePath to avoid forceHasPath error
      const enum1 = createMockEnum("TestEnum", Comments.empty(), false, false,
        IArray.fromArray([TsEnumMember.create(Comments.empty(), createSimpleIdent("A"), none)]), true,
        JsLocation.zero(), createMockCodePath("test1"));
      const enum2 = createMockEnum("TestEnum", Comments.empty(), false, false,
        IArray.fromArray([TsEnumMember.create(Comments.empty(), createSimpleIdent("B"), none)]), true,
        JsLocation.zero(), createMockCodePath("test2"));
      const these = IArray.fromArray<TsNamedDecl>([enum1]);
      const thats = IArray.fromArray<TsNamedDecl>([enum2]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(1); // Enums with same name should merge
      const mergedEnum = result.apply(0) as TsDeclEnum;
      expect(TsDeclEnum.isEnum(mergedEnum)).toBe(true);
      expect(mergedEnum.name.value).toBe("TestEnum");
      // Note: Based on Scala implementation, enum merging preserves first enum's members only
      expect(mergedEnum.members.length).toBe(1); // Should have first enum's members only
    });

    test("merge type alias with different definitions", () => {
      const alias1 = createMockTypeAlias("TestType", TsTypeRef.string);
      const alias2 = createMockTypeAlias("TestType", TsTypeRef.number);
      const these = IArray.fromArray<TsNamedDecl>([alias1]);
      const thats = IArray.fromArray<TsNamedDecl>([alias2]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(1); // Type aliases with same name should merge
      const mergedAlias = result.apply(0) as TsDeclTypeAlias;
      expect(TsDeclTypeAlias.isTypeAlias(mergedAlias)).toBe(true);
      expect(mergedAlias.name.value).toBe("TestType");
      // Should create intersection type when neither has IsTrivial marker
      expect(mergedAlias.alias._tag).toBe("TsTypeIntersect");
      const intersectionType = mergedAlias.alias as any; // TsTypeIntersect
      expect(intersectionType.types.length).toBe(2);
    });

    test("merge variable declarations", () => {
      const var1 = createMockVar("testVar", Comments.empty(), false, false, TsTypeRef.string);
      const var2 = createMockVar("testVar", Comments.empty(), false, true, TsTypeRef.string); // readonly
      const these = IArray.fromArray<TsNamedDecl>([var1]);
      const thats = IArray.fromArray<TsNamedDecl>([var2]);

      const result = FlattenTrees.newNamedMembers(these, thats);

      expect(result.length).toBe(1); // Variables with same name should merge
      const mergedVar = result.apply(0) as TsDeclVar;
      expect(TsDeclVar.isVar(mergedVar)).toBe(true);
      expect(mergedVar.name.value).toBe("testVar");
    });
  });
});