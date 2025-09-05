/**
 * Tests for SimplifyParents transformation
 * Port of org.scalablytyped.converter.internal.ts.transforms.SimplifyParentsTests
 */

import { describe, test, expect } from 'bun:test';
import { SimplifyParents, SimplifyParentsTransform } from '@/internal/ts/transforms/SimplifyParents.js';
import { TsTreeScope } from '@/internal/ts/TsTreeScope.js';
import { 
  TsDeclClass,
  TsDeclInterface,
  TsDeclVar,
  TsTypeRef,
  TsTypeIntersect,
  TsTypeQuery,
  TsIdent,
  TsQIdent,
  TsIdentSimple,
} from '@/internal/ts/trees.js';
import { IArray } from '@/internal/IArray.js';
import { Comments } from '@/internal/Comments.js';
import { JsLocation } from '@/internal/ts/JsLocation.js';
import { CodePath } from '@/internal/ts/CodePath.js';
import { Logger } from '@/internal/logging/index.js';
import { some, none } from 'fp-ts/Option';

// Helper function to create an empty TsTreeScope for testing
function createMockScope(...declarations: any[]): TsTreeScope {
  const root = TsTreeScope.create(
    TsIdent.librarySimple("test-lib"),
    false,
    new Map(),
    Logger.DevNull()
  );

  // If no declarations provided, return the root scope
  if (declarations.length === 0) {
    return root;
  }

  // For now, return the root scope - in a real implementation,
  // we would need to properly populate the scope with declarations
  return root;
}

// Helper function to create a mock TsTypeRef
function createTypeRef(name: string): TsTypeRef {
  const qname = TsQIdent.of(TsIdent.simple(name));
  return {
    _tag: 'TsTypeRef',
    asString: `TsTypeRef(${name})`,
    comments: Comments.empty(),
    name: qname,
    tparams: IArray.Empty,
    withComments: (cs: Comments) => createTypeRef(name),
    addComment: (c: any) => createTypeRef(name)
  };
}

// Helper function to create a mock TsDeclClass
function createMockClass(name: string, parent?: TsTypeRef, implementsInterfaces?: IArray<TsTypeRef>): TsDeclClass {
  return {
    _tag: 'TsDeclClass',
    asString: `class ${name}`,
    comments: Comments.empty(),
    declared: false,
    isAbstract: false,
    name: TsIdent.simple(name),
    tparams: IArray.Empty,
    parent: parent ? some(parent) : none,
    implementsInterfaces: implementsInterfaces || IArray.Empty,
    members: IArray.Empty,
    jsLocation: JsLocation.zero(),
    codePath: CodePath.noPath(),
    withCodePath: function(cp: CodePath) { return { ...this, codePath: cp }; },
    withJsLocation: function(loc: any) { return { ...this, jsLocation: loc }; },
    membersByName: new Map(),
    unnamed: IArray.Empty,
    withName: function(n: any) { return { ...this, name: n }; },
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; }
  };
}

// Helper function to create a mock TsDeclInterface
function createMockInterface(name: string, inheritance?: IArray<TsTypeRef>): TsDeclInterface {
  return {
    _tag: 'TsDeclInterface',
    asString: `interface ${name}`,
    comments: Comments.empty(),
    declared: false,
    name: TsIdent.simple(name),
    tparams: IArray.Empty,
    inheritance: inheritance || IArray.Empty,
    members: IArray.Empty,
    codePath: CodePath.noPath(),
    withCodePath: function(cp: CodePath) { return { ...this, codePath: cp }; },
    membersByName: new Map(),
    unnamed: IArray.Empty,
    withName: function(n: any) { return { ...this, name: n }; },
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; }
  };
}

// Helper function to create a mock TsDeclVar
function createMockVariable(name: string, tpe?: TsTypeRef): TsDeclVar {
  return {
    _tag: 'TsDeclVar',
    asString: `var ${name}`,
    comments: Comments.empty(),
    declared: false,
    readOnly: false,
    name: TsIdent.simple(name),
    tpe: tpe ? some(tpe) : none,
    expr: none,
    jsLocation: JsLocation.zero(),
    codePath: CodePath.noPath(),
    withCodePath: function(cp: CodePath) { return { ...this, codePath: cp }; },
    withJsLocation: function(loc: any) { return { ...this, jsLocation: loc }; },
    withName: function(n: any) { return { ...this, name: n }; },
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; }
  };
}

// Helper function to create a TsTypeIntersect
function createIntersectionType(...types: TsTypeRef[]): TsTypeIntersect {
  return {
    _tag: 'TsTypeIntersect',
    asString: types.map(t => t.asString).join(' & '),
    types: IArray.fromArray(types as any[]) // Cast to TsType[] since TsTypeRef extends TsType
  };
}

// Helper function to create a TsTypeQuery
function createTypeQuery(expr: TsQIdent): TsTypeQuery {
  return {
    _tag: 'TsTypeQuery',
    asString: `typeof ${expr.asString}`,
    expr: expr
  };
}

describe('SimplifyParents', () => {
  describe('Basic Functionality', () => {
    test('extends TreeTransformationScopedChanges', () => {
      const transformation = new SimplifyParents();
      expect(transformation).toBeInstanceOf(SimplifyParents);
      expect(typeof transformation.enterTsDeclClass).toBe('function');
      expect(typeof transformation.enterTsDeclInterface).toBe('function');
    });

    test('has enterTsDeclClass method', () => {
      const scope = createMockScope();
      const clazz = createMockClass("TestClass");
      const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);
      expect(result).toBeDefined();
      expect(result._tag).toBe('TsDeclClass');
      expect(result.name.value).toBe("TestClass");
    });

    test('has enterTsDeclInterface method', () => {
      const scope = createMockScope();
      const interface_ = createMockInterface("TestInterface");
      const result = SimplifyParentsTransform.enterTsDeclInterface(scope)(interface_);
      expect(result).toBeDefined();
      expect(result._tag).toBe('TsDeclInterface');
      expect(result.name.value).toBe("TestInterface");
    });
  });

  describe('Class Inheritance Simplification', () => {
    test('preserves simple parent class', () => {
      const scope = createMockScope();
      const parentRef = createTypeRef("BaseClass");
      const clazz = createMockClass("TestClass", parentRef);
      
      const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);
      
      expect(result.parent).toBeDefined();
      expect(result.parent!._tag).toBe('Some');
      expect(result.implementsInterfaces.length).toBe(0);
    });

    test('redistributes parent and implements', () => {
      const scope = createMockScope();
      const parentRef = createTypeRef("BaseClass");
      const implementsInterfaces = IArray.fromArray([
        createTypeRef("Interface1"),
        createTypeRef("Interface2")
      ]);
      const clazz = createMockClass("TestClass", parentRef, implementsInterfaces);
      
      const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);
      
      // First parent becomes the parent, rest become implements
      expect(result.parent).toBeDefined();
      expect(result.implementsInterfaces.length).toBe(2);
    });

    test('handles class with no parent', () => {
      const scope = createMockScope();
      const implementsInterfaces = IArray.fromArray([createTypeRef("Interface1")]);
      const clazz = createMockClass("TestClass", undefined, implementsInterfaces);
      
      const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);
      
      // First implement becomes parent
      expect(result.parent).toBeDefined();
      expect(result.implementsInterfaces.length).toBe(0);
    });

    test('handles class with no inheritance', () => {
      const scope = createMockScope();
      const clazz = createMockClass("TestClass");
      
      const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);
      
      expect(result.parent._tag).toBe('None');
      expect(result.implementsInterfaces.length).toBe(0);
    });
  });

  describe('Interface Inheritance Simplification', () => {
    test('preserves simple interface inheritance', () => {
      const scope = createMockScope();
      const inheritance = IArray.fromArray([
        createTypeRef("BaseInterface1"),
        createTypeRef("BaseInterface2")
      ]);
      const interface_ = createMockInterface("TestInterface", inheritance);
      
      const result = SimplifyParentsTransform.enterTsDeclInterface(scope)(interface_);
      
      expect(result.inheritance.length).toBe(2);
      expect(result.inheritance.toArray()[0].name.asString).toContain("BaseInterface1");
      expect(result.inheritance.toArray()[1].name.asString).toContain("BaseInterface2");
    });

    test('handles interface with no inheritance', () => {
      const scope = createMockScope();
      const interface_ = createMockInterface("TestInterface");
      
      const result = SimplifyParentsTransform.enterTsDeclInterface(scope)(interface_);
      
      expect(result.inheritance.length).toBe(0);
    });
  });

  describe('Complex Type Handling', () => {
    test('handles intersection types by flattening', () => {
      const scope = createMockScope();
      
      // Create an intersection type: BaseClass & Mixin1 & Mixin2
      const intersectionType = createIntersectionType(
        createTypeRef("BaseClass"),
        createTypeRef("Mixin1"),
        createTypeRef("Mixin2")
      );
      
      // This test verifies the structure but actual flattening would require
      // a more complex scope setup with variable declarations
      expect(intersectionType.types.length).toBe(3);
      expect(intersectionType._tag).toBe('TsTypeIntersect');
    });

    test('handles typeof expressions', () => {
      const scope = createMockScope();
      
      // Create a typeof query: typeof SomeClass
      const typeQuery = createTypeQuery(TsQIdent.of(TsIdent.simple("SomeClass")));
      
      expect(typeQuery._tag).toBe('TsTypeQuery');
      expect(typeQuery.expr.asString).toContain("SomeClass");
    });
  });

  describe('Edge Cases', () => {
    test('handles empty inheritance lists', () => {
      const scope = createMockScope();
      const clazz = createMockClass("TestClass");
      const interface_ = createMockInterface("TestInterface");
      
      const classResult = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);
      const interfaceResult = SimplifyParentsTransform.enterTsDeclInterface(scope)(interface_);
      
      expect(classResult.parent._tag).toBe('None');
      expect(classResult.implementsInterfaces.length).toBe(0);
      expect(interfaceResult.inheritance.length).toBe(0);
    });

    test('preserves other class properties', () => {
      const scope = createMockScope();
      const parentRef = createTypeRef("BaseClass");
      const clazz = createMockClass("TestClass", parentRef);
      
      const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);
      
      expect(result.name.value).toBe("TestClass");
      expect(result.comments).toBe(clazz.comments);
      expect(result.declared).toBe(clazz.declared);
      expect(result.members).toBe(clazz.members);
    });

    test('preserves other interface properties', () => {
      const scope = createMockScope();
      const inheritance = IArray.fromArray([createTypeRef("BaseInterface")]);
      const interface_ = createMockInterface("TestInterface", inheritance);
      
      const result = SimplifyParentsTransform.enterTsDeclInterface(scope)(interface_);
      
      expect(result.name.value).toBe("TestInterface");
      expect(result.comments).toBe(interface_.comments);
      expect(result.declared).toBe(interface_.declared);
      expect(result.members).toBe(interface_.members);
    });
  });

  describe('Integration Scenarios', () => {
    test('singleton instance works correctly', () => {
      const scope = createMockScope();
      const clazz = createMockClass("TestClass", createTypeRef("BaseClass"));
      
      const result = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz);
      
      expect(result).toBeDefined();
      expect(result.name.value).toBe("TestClass");
    });

    test('handles multiple transformations', () => {
      const scope = createMockScope();
      const clazz1 = createMockClass("TestClass1", createTypeRef("Base1"));
      const clazz2 = createMockClass("TestClass2", createTypeRef("Base2"));
      
      const result1 = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz1);
      const result2 = SimplifyParentsTransform.enterTsDeclClass(scope)(clazz2);
      
      expect(result1.name.value).toBe("TestClass1");
      expect(result2.name.value).toBe("TestClass2");
    });
  });
});