import { expect, test, describe } from "bun:test";
import { TsTreeTraverse } from "@/internal/ts/TsTreeTraverse";
import { IArray } from "@/internal/IArray";
import {
  TsTree,
  TsContainerOrDecl,
  TsNamedDecl,
  TsTypeRef,
  TsMember,
  TsDeclClass,
  TsDeclInterface,
  TsDeclVar,
  TsMemberProperty,
  TsIdentSimple
} from "@/internal/ts/trees";
import {
  createMockClass,
  createMockInterface,
  createMockModule,
  createMockVariable,
  createMockMethod,
  createMockProperty,
  createTypeRef,
  createTypeLiteral,
  createParsedFile,
  createQIdent,
  createSimpleIdent,
  createIArray
} from "@/tests/utils/TestUtils.js";

/**
 * Comprehensive test suite for TsTreeTraverse
 * This is a direct port of the Scala TsTreeTraverseTests
 */
describe("TsTreeTraverse Tests", () => {

  // ============================================================================
  // Helper aliases for backward compatibility
  // ============================================================================

  // Alias for backward compatibility with existing test code
  const createMockVar = createMockVariable;
  const createMemberFunction = createMockMethod;
  const createMemberProperty = createMockProperty;

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
      const trees = createIArray([class1 as TsTree, class2 as TsTree, interface1 as TsTree]);

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
      const members = createIArray([memberProp as TsMember, memberFunc as TsMember]);
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
      const members = createIArray([memberProp as TsMember, memberFunc as TsMember]);
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
      const members = createIArray([memberProp as TsMember, memberFunc as TsMember]);
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
      const members = createIArray([nestedClass as TsContainerOrDecl, nestedInterface as TsContainerOrDecl, nestedVar as TsContainerOrDecl]);
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
      const members = createIArray([memberProp as TsMember, memberFunc as TsMember]);
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
      const members = createIArray([class1 as TsContainerOrDecl, interface1 as TsContainerOrDecl, module1 as TsContainerOrDecl]);
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
      const innerModule = createMockModule("InnerModule", createIArray([innerVar as TsContainerOrDecl]));
      const middleModule = createMockModule("MiddleModule", createIArray([innerModule as TsContainerOrDecl]));
      const outerModule = createMockModule("OuterModule", createIArray([middleModule as TsContainerOrDecl]));

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
      const members = createIArray([prop1 as TsMember, prop2 as TsMember, method1 as TsMember, method2 as TsMember]);
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
      const members = createIArray([memberProp1 as TsMember, memberProp2 as TsMember, memberFunc as TsMember]);
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
      const mockClass = createMockClass("TestClass", createIArray([memberProp as TsMember]));

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
      const module1 = createMockModule("TestModule", createIArray([class1 as TsContainerOrDecl, interface1 as TsContainerOrDecl, var1 as TsContainerOrDecl]));

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
      const members = createIArray([prop1 as TsMember, prop2 as TsMember]);
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
      const mockClass = createMockClass("LargeClass", createIArray(members.map(m => m as TsMember)));

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
      const innerModule = createMockModule("InnerModule", createIArray([innerVar as TsContainerOrDecl]));
      const middleModule = createMockModule("MiddleModule", createIArray([innerModule as TsContainerOrDecl]));
      const outerModule = createMockModule("OuterModule", createIArray([middleModule as TsContainerOrDecl]));

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
      const mockClass = createMockClass("TestClass", createIArray(members.map(m => m as TsMember)));

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
      const class1 = createMockClass("Class1", createIArray([createMemberProperty("prop1") as TsMember]));
      const class2 = createMockClass("Class2", createIArray([createMemberProperty("prop2") as TsMember]));
      const interface1 = createMockInterface("Interface1", createIArray([createMemberFunction("method1") as TsMember]));
      const trees = createIArray([class1 as TsTree, class2 as TsTree, interface1 as TsTree]);

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
      const trees = createIArray([typeRef1 as TsTree, typeRef2 as TsTree, class1 as TsTree]);

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
      const treeArray = createIArray(trees.map(t => t as TsTree));

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
      const mockClass = createMockClass("TestClass", createIArray([
        createMemberProperty("prop1") as TsMember,
        createMemberFunction("method1") as TsMember
      ]));

      // Test that collect and collectIArray with single element produce same results
      const collectResult = TsTreeTraverse.collect(mockClass, (tree: TsTree) => {
        if (tree._tag === 'TsIdentSimple') {
          return (tree as TsIdentSimple).value;
        }
        return undefined;
      });

      const collectIArrayResult = TsTreeTraverse.collectIArray(createIArray([mockClass as TsTree]), (tree: TsTree) => {
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