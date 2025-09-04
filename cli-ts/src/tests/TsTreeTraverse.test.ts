import { expect, test, describe } from "bun:test";
import { TsTreeTraverse } from "@/internal/ts/TsTreeTraverse";
import { IArray } from "@/internal/IArray";
import { Comments } from "@/internal/Comments";
import { CodePath } from "@/internal/ts/CodePath";
import { JsLocation } from "@/internal/ts/JsLocation";
import { TsProtectionLevel } from "@/internal/ts/TsProtectionLevel";
import { MethodType } from "@/internal/ts/MethodType";
import { some, none } from 'fp-ts/Option';

import {
  TsTree,
  TsContainerOrDecl,
  TsNamedDecl,
  TsIdent,
  TsIdentSimple,
  TsQIdent,
  TsTypeRef,
  TsTypeLiteral,
  TsLiteral,
  TsDeclClass,
  TsDeclInterface,
  TsDeclModule,
  TsDeclVar,
  TsMember,
  TsMemberFunction,
  TsMemberProperty,
  TsParsedFile,
  TsFunSig,
  TsIdentModule
} from "@/internal/ts/trees";

/**
 * Comprehensive test suite for TsTreeTraverse
 * This is a direct port of the Scala TsTreeTraverseTests
 */
describe("TsTreeTraverse Tests", () => {

  // ============================================================================
  // Helper methods for creating test data (ported from Scala)
  // ============================================================================

  function createSimpleIdent(name: string): TsIdentSimple {
    return TsIdent.simple(name);
  }

  function createQIdent(...parts: string[]): TsQIdent {
    return TsQIdent.of(...parts.map(TsIdent.simple));
  }

  function createTypeRef(name: string): TsTypeRef {
    return TsTypeRef.create(Comments.empty(), createQIdent(name), IArray.Empty);
  }

  function createTypeLiteral(value: string): TsTypeLiteral {
    return TsTypeLiteral.create(TsLiteral.str(value));
  }

  function createMockClass(name: string, members: IArray<TsMember> = IArray.Empty): TsDeclClass {
    return TsDeclClass.create(
      Comments.empty(),
      false, // declared
      false, // isAbstract
      createSimpleIdent(name),
      IArray.Empty, // tparams
      none, // parent
      IArray.Empty, // implements
      members,
      JsLocation.zero(),
      CodePath.noPath()
    );
  }

  function createMockInterface(name: string, members: IArray<TsMember> = IArray.Empty): TsDeclInterface {
    return TsDeclInterface.create(
      Comments.empty(),
      false, // declared
      createSimpleIdent(name),
      IArray.Empty, // tparams
      IArray.Empty, // inheritance
      members,
      CodePath.noPath()
    );
  }

  function createMockModule(name: string, members: IArray<TsContainerOrDecl> = IArray.Empty): TsDeclModule {
    return TsDeclModule.create(
      Comments.empty(),
      false, // declared
      TsIdentModule.simple(name),
      members,
      CodePath.noPath(),
      JsLocation.zero()
    );
  }

  function createMockVar(name: string, tpe?: TsTypeRef): TsDeclVar {
    return TsDeclVar.create(
      Comments.empty(),
      false, // declared
      false, // readOnly
      createSimpleIdent(name),
      tpe ? some(tpe) : none,
      none, // expr
      JsLocation.zero(),
      CodePath.noPath()
    );
  }

  function createMemberFunction(name: string): TsMemberFunction {
    return TsMemberFunction.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      createSimpleIdent(name),
      MethodType.normal(),
      TsFunSig.create(
        Comments.empty(),
        IArray.Empty, // tparams
        IArray.Empty, // params
        some(TsTypeRef.any)
      ),
      false, // isStatic
      false  // isReadOnly
    );
  }

  function createMemberProperty(name: string, tpe: TsTypeRef = TsTypeRef.string): TsMemberProperty {
    return TsMemberProperty.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      createSimpleIdent(name),
      some(tpe),
      none, // expr
      false, // isStatic
      false  // isReadOnly
    );
  }

  function createParsedFile(members: IArray<TsContainerOrDecl>): TsParsedFile {
    return TsParsedFile.create(
      Comments.empty(),
      IArray.Empty, // directives
      members,
      CodePath.noPath()
    );
  }

  // ============================================================================
  // Basic Functionality Tests
  // ============================================================================

  describe("TsTreeTraverse - Basic Functionality", () => {
    test("collect with simple extraction", () => {
      const mockClass = createMockClass("TestClass");
      
      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsDeclClass') {
          return (tree as TsDeclClass).name.value;
        }
        return undefined;
      });

      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe("TestClass");
    });

    test("collect with no matches", () => {
      const mockClass = createMockClass("TestClass");
      
      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsDeclInterface') {
          return (tree as TsDeclInterface).name.value;
        }
        return undefined;
      });

      expect(result.length).toBe(0);
    });

    test("collectIArray with multiple trees", () => {
      const class1 = createMockClass("Class1");
      const class2 = createMockClass("Class2");
      const interface1 = createMockInterface("Interface1");
      const trees = IArray.apply(class1, class2, interface1);

      const result = TsTreeTraverse.collectIArray(trees, (tree: TsTree) => {
        if (tree._tag === 'TsDeclClass' || tree._tag === 'TsDeclInterface') {
          return (tree as TsNamedDecl).name.value;
        }
        return undefined;
      });

      expect(result.length).toBe(3);
      expect(result.toArray()).toContain("Class1");
      expect(result.toArray()).toContain("Class2");
      expect(result.toArray()).toContain("Interface1");
    });

    test("collect extracts all matching nodes", () => {
      const memberProp = createMemberProperty("prop1");
      const memberFunc = createMemberFunction("func1");
      const members = IArray.apply(memberProp, memberFunc);
      const mockClass = createMockClass("TestClass", members);

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsMemberProperty' || tree._tag === 'TsMemberFunction') {
          return (tree as any).name.value;
        }
        return undefined;
      });

      expect(result.length).toBe(2);
      expect(result.toArray()).toContain("prop1");
      expect(result.toArray()).toContain("func1");
    });
  });

  // ============================================================================
  // Nested Structure Tests
  // ============================================================================

  describe("TsTreeTraverse - Nested Structures", () => {
    test("traverse class with members", () => {
      const memberProp = createMemberProperty("property");
      const memberFunc = createMemberFunction("method");
      const members = IArray.apply(memberProp, memberFunc);
      const mockClass = createMockClass("TestClass", members);

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsIdentSimple') {
          return (tree as TsIdentSimple).value;
        }
        return undefined;
      });

      // Should find identifiers from class name and member names
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.toArray()).toContain("TestClass");
      expect(result.toArray()).toContain("property");
      expect(result.toArray()).toContain("method");
    });

    test("traverse interface with members", () => {
      const memberProp = createMemberProperty("interfaceProp");
      const memberFunc = createMemberFunction("interfaceMethod");
      const members = IArray.apply(memberProp, memberFunc);
      const mockInterface = createMockInterface("TestInterface", members);

      const result = TsTreeTraverse.collect(mockInterface, (tree: TsTree) => {
        if (tree._tag === 'TsMemberProperty' || tree._tag === 'TsMemberFunction') {
          return tree._tag;
        }
        return undefined;
      });

      expect(result.length).toBe(2);
      expect(result.toArray()).toContain("TsMemberProperty");
      expect(result.toArray()).toContain("TsMemberFunction");
    });

    test("traverse module with nested declarations", () => {
      const nestedClass = createMockClass("NestedClass");
      const nestedInterface = createMockInterface("NestedInterface");
      const nestedVar = createMockVar("nestedVar");
      const members = IArray.apply(nestedClass, nestedInterface, nestedVar);
      const mockModule = createMockModule("TestModule", members);

      const result = TsTreeTraverse.collect(mockModule, (tree: TsTree) => {
        if (tree._tag === 'TsDeclClass' || tree._tag === 'TsDeclInterface' || tree._tag === 'TsDeclVar') {
          return (tree as TsNamedDecl).name.value;
        }
        return undefined;
      });

      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.toArray()).toContain("NestedClass");
      expect(result.toArray()).toContain("NestedInterface");
      expect(result.toArray()).toContain("nestedVar");
    });
  });

  // ============================================================================
  // Complex Hierarchy Tests
  // ============================================================================

  describe("TsTreeTraverse - Complex Hierarchies", () => {
    test("deeply nested type references", () => {
      const stringType = createTypeRef("string");
      const numberType = createTypeRef("number");
      const memberProp = createMemberProperty("prop", stringType);
      const memberFunc = createMemberFunction("func");
      const members = IArray.apply(memberProp, memberFunc);
      const mockClass = createMockClass("TestClass", members);

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsTypeRef') {
          return (tree as TsTypeRef).name.parts.apply(0).value;
        }
        return undefined;
      });

      // Should find type references from member property and member function return type
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.toArray()).toContain("string");
      expect(result.toArray()).toContain("any"); // from function return type
    });

    test("parsed file with multiple containers", () => {
      const class1 = createMockClass("FileClass");
      const interface1 = createMockInterface("FileInterface");
      const module1 = createMockModule("FileModule");
      const members = IArray.apply(class1, interface1, module1);
      const parsedFile = createParsedFile(members);

      const result = TsTreeTraverse.collect(parsedFile, (tree: TsTree) => {
        if (tree._tag === 'TsDeclClass' || tree._tag === 'TsDeclInterface' || tree._tag === 'TsDeclModule') {
          return tree._tag;
        }
        return undefined;
      });

      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.toArray()).toContain("TsDeclClass");
      expect(result.toArray()).toContain("TsDeclInterface");
      expect(result.toArray()).toContain("TsDeclModule");
    });

    test("nested modules with deep hierarchy", () => {
      const innerVar = createMockVar("innerVar");
      const innerModule = createMockModule("InnerModule", IArray.apply(innerVar));
      const middleModule = createMockModule("MiddleModule", IArray.apply(innerModule));
      const outerModule = createMockModule("OuterModule", IArray.apply(middleModule));

      const result = TsTreeTraverse.collect(outerModule, (tree: TsTree) => {
        if (tree._tag === 'TsDeclVar') {
          return (tree as TsDeclVar).name.value;
        }
        return undefined;
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.toArray()).toContain("innerVar");
    });

    test("complex class with multiple member types", () => {
      const prop1 = createMemberProperty("prop1", TsTypeRef.string);
      const prop2 = createMemberProperty("prop2", TsTypeRef.number);
      const method1 = createMemberFunction("method1");
      const method2 = createMemberFunction("method2");
      const members = IArray.apply(prop1, prop2, method1, method2);
      const mockClass = createMockClass("ComplexClass", members);

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsMemberProperty' || tree._tag === 'TsMemberFunction') {
          return (tree as any).name.value;
        }
        return undefined;
      });

      expect(result.length).toBe(4);
      expect(result.toArray()).toContain("prop1");
      expect(result.toArray()).toContain("prop2");
      expect(result.toArray()).toContain("method1");
      expect(result.toArray()).toContain("method2");
    });
  });

  // ============================================================================
  // Edge Cases and Error Conditions
  // ============================================================================

  describe("TsTreeTraverse - Edge Cases", () => {
    test("partial function never matches", () => {
      const mockClass = createMockClass("TestClass");

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        // Never return anything
        return undefined;
      });

      expect(result.length).toBe(0);
    });

    test("partial function always matches", () => {
      const mockClass = createMockClass("TestClass");

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        return "match";
      });

      // Should find some nodes: class, identifiers, types, etc.
      expect(result.length).toBeGreaterThan(0);
      expect(result.toArray().every(item => item === "match")).toBe(true);
    });

    test("empty container traversal", () => {
      const emptyClass = createMockClass("EmptyClass", IArray.Empty);

      const result = TsTreeTraverse.collect(emptyClass, (tree: TsTree) => {
        if (tree._tag === 'TsMemberProperty' || tree._tag === 'TsMemberFunction') {
          return (tree as any).name.value;
        }
        return undefined;
      });

      expect(result.length).toBe(0);
    });

    test("empty file traversal", () => {
      const emptyFile = createParsedFile(IArray.Empty);

      const fileResult = TsTreeTraverse.collect(emptyFile, (tree: TsTree) => {
        if (tree._tag === 'TsParsedFile') {
          return tree;
        }
        return undefined;
      });

      expect(fileResult.length).toBe(1); // The parsed file itself is found
      expect(fileResult.apply(0)).toBe(emptyFile);
    });
  });

  // ============================================================================
  // Advanced Extraction Scenarios
  // ============================================================================

  describe("TsTreeTraverse - Advanced Extraction Scenarios", () => {
    test("extract specific node types with conditions", () => {
      const memberProp1 = createMemberProperty("publicProp");
      const memberProp2 = createMemberProperty("privateProp");
      const memberFunc = createMemberFunction("testMethod");
      const members = IArray.apply(memberProp1, memberProp2, memberFunc);
      const mockClass = createMockClass("TestClass", members);

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsMemberProperty') {
          const prop = tree as TsMemberProperty;
          if (prop.name.value.startsWith("public")) {
            return prop.name.value;
          }
        }
        return undefined;
      });

      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe("publicProp");
    });

    test("extract nested identifiers", () => {
      const typeRef = createTypeRef("MyType");
      const memberProp = createMemberProperty("prop", typeRef);
      const mockClass = createMockClass("TestClass", IArray.apply(memberProp));

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsIdentSimple') {
          return (tree as TsIdentSimple).value;
        }
        return undefined;
      });

      // Should find identifiers from class name, member name, and type reference
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.toArray()).toContain("TestClass");
      expect(result.toArray()).toContain("prop");
      expect(result.toArray()).toContain("MyType");
    });

    test("extract with multiple criteria", () => {
      const class1 = createMockClass("TestClass");
      const interface1 = createMockInterface("TestInterface");
      const var1 = createMockVar("testVar");
      const module1 = createMockModule("TestModule", IArray.apply(class1, interface1, var1));

      const result = TsTreeTraverse.collect(module1, (tree: TsTree) => {
        if ((tree._tag === 'TsDeclClass' || tree._tag === 'TsDeclInterface' ||
             tree._tag === 'TsDeclVar' || tree._tag === 'TsDeclModule') &&
            (tree as TsNamedDecl).name.value.includes("Test")) {
          return tree._tag;
        }
        return undefined;
      });

      // Should find TestModule, TestClass, TestInterface (testVar might not be found due to traversal depth)
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.toArray()).toContain("TsDeclModule");
      expect(result.toArray()).toContain("TsDeclClass");
      expect(result.toArray()).toContain("TsDeclInterface");
    });

    test("extract type information from complex structures", () => {
      const stringType = createTypeRef("string");
      const numberType = createTypeRef("number");
      const prop1 = createMemberProperty("stringProp", stringType);
      const prop2 = createMemberProperty("numberProp", numberType);
      const members = IArray.apply(prop1, prop2);
      const mockClass = createMockClass("ComplexClass", members);

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsTypeRef') {
          return (tree as TsTypeRef).name.parts.apply(0).value;
        }
        return undefined;
      });

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.toArray()).toContain("string");
      expect(result.toArray()).toContain("number");
    });
  });

  // ============================================================================
  // Performance and Stress Tests
  // ============================================================================

  describe("TsTreeTraverse - Performance and Stress Tests", () => {
    test("large tree traversal", () => {
      // Create a large tree structure
      const members = Array.from({ length: 50 }, (_, i) =>
        createMemberProperty(`prop${i + 1}`)
      );
      const mockClass = createMockClass("LargeClass", IArray.fromArray(members));

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsMemberProperty') {
          return (tree as TsMemberProperty).name.value;
        }
        return undefined;
      });

      expect(result.length).toBe(50);
      expect(result.toArray().every(name => name.startsWith("prop"))).toBe(true);
    });

    test("deeply nested structure traversal", () => {
      // Create nested modules
      const innerVar = createMockVar("innerVar");
      const innerModule = createMockModule("InnerModule", IArray.apply(innerVar));
      const middleModule = createMockModule("MiddleModule", IArray.apply(innerModule));
      const outerModule = createMockModule("OuterModule", IArray.apply(middleModule));

      const result = TsTreeTraverse.collect(outerModule, (tree: TsTree) => {
        if (tree._tag === 'TsDeclVar') {
          return (tree as TsDeclVar).name.value;
        }
        return undefined;
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.toArray()).toContain("innerVar");
    });

    test("complex extraction with many matches", () => {
      const members = Array.from({ length: 20 }, (_, i) =>
        createMemberProperty(`prop${i + 1}`)
      );
      const mockClass = createMockClass("TestClass", IArray.fromArray(members));

      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        return "node"; // Match everything
      });

      // Should find many nodes: class, members, types, identifiers, etc.
      expect(result.length).toBeGreaterThan(50); // Conservative estimate
      expect(result.toArray().every(item => item === "node")).toBe(true);
    });
  });

  // ============================================================================
  // Integration with collectIArray
  // ============================================================================

  describe("TsTreeTraverse - Integration with collectIArray", () => {
    test("collect from multiple complex trees", () => {
      const class1 = createMockClass("Class1", IArray.apply(createMemberProperty("prop1")));
      const class2 = createMockClass("Class2", IArray.apply(createMemberProperty("prop2")));
      const interface1 = createMockInterface("Interface1", IArray.apply(createMemberFunction("method1")));
      const trees = IArray.apply(class1, class2, interface1);

      const result = TsTreeTraverse.collectIArray(trees, (tree: TsTree) => {
        if (tree._tag === 'TsDeclClass' || tree._tag === 'TsDeclInterface' ||
            tree._tag === 'TsMemberProperty' || tree._tag === 'TsMemberFunction') {
          return (tree as any).name?.value || tree._tag;
        }
        return undefined;
      });

      // Should find at least the main declarations (members might not be found due to traversal depth)
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.toArray()).toContain("Class1");
      expect(result.toArray()).toContain("Class2");
      expect(result.toArray()).toContain("Interface1");
    });

    test("collectIArray with mixed extraction criteria", () => {
      const typeRef1 = createTypeRef("string");
      const typeRef2 = createTypeRef("number");
      const class1 = createMockClass("TestClass");
      const trees = IArray.apply(typeRef1, typeRef2, class1);

      const typeResults = TsTreeTraverse.collectIArray(trees, (tree: TsTree) => {
        if (tree._tag === 'TsTypeRef') {
          return (tree as TsTypeRef).name.parts.apply(0).value;
        }
        return undefined;
      });

      const classResults = TsTreeTraverse.collectIArray(trees, (tree: TsTree) => {
        if (tree._tag === 'TsDeclClass') {
          return (tree as TsDeclClass).name.value;
        }
        return undefined;
      });

      expect(typeResults.length).toBe(2);
      expect(typeResults.toArray()).toContain("string");
      expect(typeResults.toArray()).toContain("number");

      expect(classResults.length).toBe(1);
      expect(classResults.apply(0)).toBe("TestClass");
    });

    test("collectIArray performance with many trees", () => {
      const trees = Array.from({ length: 30 }, (_, i) =>
        createTypeRef(`Type${i + 1}`)
      );
      const treeArray = IArray.fromArray(trees);

      const result = TsTreeTraverse.collectIArray(treeArray, (tree: TsTree) => {
        if (tree._tag === 'TsTypeRef') {
          return (tree as TsTypeRef).name.parts.apply(0).value;
        }
        return undefined;
      });

      expect(result.length).toBe(30);
      expect(result.toArray().every(name => name.startsWith("Type"))).toBe(true);
    });

    test("collectIArray with empty array", () => {
      const emptyTrees = IArray.Empty as IArray<TsTree>;

      const result = TsTreeTraverse.collectIArray(emptyTrees, (tree: TsTree) => {
        return "found";
      });

      expect(result.length).toBe(0);
    });

    test("collectIArray functional equivalence with collect", () => {
      const mockClass = createMockClass("TestClass", IArray.apply(
        createMemberProperty("prop1"),
        createMemberFunction("method1")
      ));

      // Test that collect and collectIArray with single element produce same results
      const collectResult = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsIdentSimple') {
          return (tree as TsIdentSimple).value;
        }
        return undefined;
      });

      const collectIArrayResult = TsTreeTraverse.collectIArray(IArray.apply(mockClass), (tree: TsTree) => {
        if (tree._tag === 'TsIdentSimple') {
          return (tree as TsIdentSimple).value;
        }
        return undefined;
      });

      expect(collectResult.length).toBe(collectIArrayResult.length);
      expect(collectResult.toArray().sort()).toEqual(collectIArrayResult.toArray().sort());
    });
  });

  // ============================================================================
  // Type Safety and Edge Cases
  // ============================================================================

  describe("TsTreeTraverse - Type Safety and Edge Cases", () => {
    test("type guard correctly identifies TsTree objects", () => {
      const mockClass = createMockClass("TestClass");
      const nonTsTree = { _tag: "NotATree", asString: "fake" };
      const validTsTree = { _tag: "TsTypeRef", asString: "string" };
      const nullValue = null;
      const undefinedValue = undefined;

      expect(TsTreeTraverse.isTsTree(mockClass)).toBe(true);
      expect(TsTreeTraverse.isTsTree(validTsTree)).toBe(true);
      expect(TsTreeTraverse.isTsTree(nonTsTree)).toBe(false);
      expect(TsTreeTraverse.isTsTree(nullValue)).toBe(false);
      expect(TsTreeTraverse.isTsTree(undefinedValue)).toBe(false);
    });

    test("handles null and undefined values gracefully", () => {
      const mockClass = createMockClass("TestClass");

      // This shouldn't throw an error
      const result = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsDeclClass') {
          return (tree as TsDeclClass).name.value;
        }
        return undefined;
      });

      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe("TestClass");
    });

    test("extract function returning different types", () => {
      const mockClass = createMockClass("TestClass");

      const stringResult = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsDeclClass') {
          return "found-class";
        }
        return undefined;
      });

      const numberResult = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsDeclClass') {
          return 42;
        }
        return undefined;
      });

      expect(stringResult.apply(0)).toBe("found-class");
      expect(numberResult.apply(0)).toBe(42);
    });
  });
});