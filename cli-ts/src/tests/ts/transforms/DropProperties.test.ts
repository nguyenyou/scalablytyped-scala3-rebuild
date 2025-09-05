/**
 * Tests for DropProperties transformation
 * Port of org.scalablytyped.converter.internal.ts.transforms.DropPropertiesTests
 */

import { describe, test, expect } from 'bun:test';
import { DropProperties, DropPropertiesTransform } from '@/internal/ts/transforms/DropProperties.js';
import { TsTreeScope } from '@/internal/ts/TsTreeScope.js';
import {
  TsParsedFile,
  TsDeclNamespace,
  TsDeclVar,
  TsDeclInterface,
  TsDeclClass,
  TsMemberProperty,
  TsMemberFunction,
  TsIdent,
  TsTypeRef,
  TsQIdent,
  TsIdentSimple,
  TsTypeFunction,
  TsFunSig,
  TsFunParam,
  MethodType,
  TsProtectionLevel
} from '@/internal/ts/trees.js';
import { IArray } from '@/internal/IArray.js';
import { Comments } from '@/internal/Comments.js';
import { some, none } from 'fp-ts/Option';
import { JsLocation } from '@/internal/ts/JsLocation.js';
import { CodePath } from '@/internal/ts/CodePath.js';
import { Logger } from '@/internal/logging/index.js';

// Helper function to create an empty TsTreeScope for testing
function createMockScope(): TsTreeScope {
  return TsTreeScope.create(
    TsIdent.librarySimple("test-lib"),
    false,
    new Map(),
    Logger.DevNull()
  );
}

// Helper function to create a mock TsDeclVar (named value declaration)
function createMockNamedValueDecl(name: string): TsDeclVar {
  return {
    _tag: 'TsDeclVar',
    asString: `var ${name}`,
    comments: Comments.empty(),
    declared: false,
    readOnly: false,
    name: TsIdent.simple(name),
    tpe: some(TsTypeRef.string),
    expr: none,
    jsLocation: JsLocation.zero(),
    codePath: CodePath.noPath(),
    withCodePath: function(cp: any) { return { ...this, codePath: cp }; },
    withJsLocation: function(loc: any) { return { ...this, jsLocation: loc }; },
    withName: function(n: any) { return { ...this, name: n }; },
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; }
  };
}

// Helper function to create a mock TsDeclNamespace
function createMockNamespace(name: string, members: IArray<any> = IArray.Empty): TsDeclNamespace {
  return {
    _tag: 'TsDeclNamespace',
    asString: `namespace ${name}`,
    comments: Comments.empty(),
    declared: false,
    name: TsIdent.simple(name),
    members: members,
    jsLocation: JsLocation.zero(),
    codePath: CodePath.noPath(),
    withCodePath: function(cp: any) { return { ...this, codePath: cp }; },
    withJsLocation: function(loc: any) { return { ...this, jsLocation: loc }; },
    membersByName: new Map(),
    unnamed: IArray.Empty,
    nameds: IArray.Empty,
    exports: IArray.Empty,
    imports: IArray.Empty,
    isModule: false,
    withName: function(n: any) { return { ...this, name: n }; },
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; },
    withMembers: function(ms: any) { return { ...this, members: ms }; },
    modules: new Map(),
    augmentedModules: IArray.Empty,
    augmentedModulesMap: new Map()
  };
}

// Helper function to create a mock TsDeclInterface
function createMockInterface(name: string, members: IArray<any> = IArray.Empty): TsDeclInterface {
  return {
    _tag: 'TsDeclInterface',
    asString: `interface ${name}`,
    comments: Comments.empty(),
    declared: false,
    name: TsIdent.simple(name),
    tparams: IArray.Empty,
    inheritance: IArray.Empty,
    members: members,
    codePath: CodePath.noPath(),
    withCodePath: function(cp: any) { return { ...this, codePath: cp }; },
    membersByName: new Map(),
    unnamed: IArray.Empty,
    withName: function(n: any) { return { ...this, name: n }; },
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; }
  };
}

// Helper function to create a mock TsMemberProperty
function createMockProperty(name: string, tpe?: any): TsMemberProperty {
  return {
    _tag: 'TsMemberProperty',
    asString: `${name}: ${tpe?.asString || 'any'}`,
    comments: Comments.empty(),
    level: TsProtectionLevel.default(),
    name: TsIdent.simple(name),
    tpe: tpe ? some(tpe) : none,
    expr: none,
    isStatic: false,
    isReadOnly: false,
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; }
  };
}

// Helper function to create a mock TsMemberFunction
function createMockMethod(name: string): TsMemberFunction {
  const signature = TsFunSig.create(
    Comments.empty(),
    IArray.Empty, // tparams
    IArray.Empty, // params
    some(TsTypeRef.void)
  );

  return {
    _tag: 'TsMemberFunction',
    asString: `${name}(): void`,
    comments: Comments.empty(),
    level: TsProtectionLevel.default(),
    name: TsIdent.simple(name),
    methodType: MethodType.normal(),
    signature: signature,
    isStatic: false,
    isReadOnly: false,
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; }
  };
}

describe('DropProperties', () => {
  describe('Basic Functionality', () => {
    test('extends TransformMembers and TransformClassMembers', () => {
      const transformation = new DropProperties();
      expect(transformation).toBeInstanceOf(DropProperties);
      expect(typeof transformation.newMembers).toBe('function');
      expect(typeof transformation.newClassMembers).toBe('function');
    });

    test('has newMembers method', () => {
      const scope = createMockScope();
      const namespace = createMockNamespace("test");
      const result = DropPropertiesTransform.newMembers(scope, namespace);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    test('has newClassMembers method', () => {
      const scope = createMockScope();
      const interface_ = createMockInterface("test");
      const result = DropPropertiesTransform.newClassMembers(scope, interface_);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Container Member Filtering', () => {
    test('filters out __promisify__ named value declarations', () => {
      const scope = createMockScope();
      const promisifyDecl = createMockNamedValueDecl("__promisify__");
      const normalDecl = createMockNamedValueDecl("normalVar");
      const namespace = createMockNamespace("test", IArray.fromArray([promisifyDecl, normalDecl]));
      
      const result = DropPropertiesTransform.newMembers(scope, namespace);
      
      expect(result.length).toBe(1);
      expect(result.toArray().some((decl: any) => 
        decl._tag === 'TsDeclVar' && decl.name.value === "normalVar"
      )).toBe(true);
      expect(result.toArray().some((decl: any) => 
        decl._tag === 'TsDeclVar' && decl.name.value === "__promisify__"
      )).toBe(false);
    });

    test('keeps non-__promisify__ declarations', () => {
      const scope = createMockScope();
      const normalDecl1 = createMockNamedValueDecl("normalVar1");
      const normalDecl2 = createMockNamedValueDecl("normalVar2");
      const namespace = createMockNamespace("test", IArray.fromArray([normalDecl1, normalDecl2]));
      
      const result = DropPropertiesTransform.newMembers(scope, namespace);
      
      expect(result.length).toBe(2);
      expect(result.toArray()).toContain(normalDecl1);
      expect(result.toArray()).toContain(normalDecl2);
    });

    test('handles mixed member types', () => {
      const scope = createMockScope();
      const promisifyDecl = createMockNamedValueDecl("__promisify__");
      const normalDecl = createMockNamedValueDecl("normalVar");
      const interface_ = createMockInterface("TestInterface");
      const namespace = createMockNamespace("test", IArray.fromArray([promisifyDecl, normalDecl, interface_]));
      
      const result = DropPropertiesTransform.newMembers(scope, namespace);
      
      expect(result.length).toBe(2);
      expect(result.toArray()).toContain(normalDecl);
      expect(result.toArray()).toContain(interface_);
      expect(result.toArray()).not.toContain(promisifyDecl);
    });
  });

  describe('Class Member Filtering', () => {
    test('filters out prototype properties', () => {
      const scope = createMockScope();
      const prototypeProperty = createMockProperty("prototype");
      const normalProperty = createMockProperty("normalProp");
      const interface_ = createMockInterface("test", IArray.fromArray([prototypeProperty, normalProperty]));
      
      const result = DropPropertiesTransform.newClassMembers(scope, interface_);
      
      expect(result.length).toBe(1);
      expect(result.toArray()).toContain(normalProperty);
      expect(result.toArray()).not.toContain(prototypeProperty);
    });

    test('filters out unicode escape properties', () => {
      const scope = createMockScope();
      const unicodeProperty = createMockProperty("\\u0041"); // \u0041 is 'A'
      const normalProperty = createMockProperty("normalProp");
      const interface_ = createMockInterface("test", IArray.fromArray([unicodeProperty, normalProperty]));
      
      const result = DropPropertiesTransform.newClassMembers(scope, interface_);
      
      expect(result.length).toBe(1);
      expect(result.toArray()).toContain(normalProperty);
      expect(result.toArray()).not.toContain(unicodeProperty);
    });

    test('filters out properties with never type', () => {
      const scope = createMockScope();
      const neverProperty = createMockProperty("neverProp", TsTypeRef.never);
      const normalProperty = createMockProperty("normalProp");
      const interface_ = createMockInterface("test", IArray.fromArray([neverProperty, normalProperty]));

      const result = DropPropertiesTransform.newClassMembers(scope, interface_);

      expect(result.length).toBe(1);
      expect(result.toArray()).toContain(normalProperty);
      expect(result.toArray()).not.toContain(neverProperty);
    });

    test('keeps non-property members unchanged', () => {
      const scope = createMockScope();
      const method = createMockMethod("testMethod");
      const normalProperty = createMockProperty("normalProp");
      const interface_ = createMockInterface("test", IArray.fromArray([method, normalProperty]));

      const result = DropPropertiesTransform.newClassMembers(scope, interface_);

      expect(result.length).toBe(2);
      expect(result.toArray()).toContain(method);
      expect(result.toArray()).toContain(normalProperty);
    });

    test('handles all filtering rules together', () => {
      const scope = createMockScope();
      const prototypeProperty = createMockProperty("prototype");
      const unicodeProperty1 = createMockProperty("\\u0041");
      const normalProperty1 = createMockProperty("normalProp1");
      const unicodeProperty2 = createMockProperty("\\u1234");
      const neverProperty = createMockProperty("neverProp", TsTypeRef.never);
      const normalProperty2 = createMockProperty("normalProp2");
      const method = createMockMethod("testMethod");

      const interface_ = createMockInterface("RealWorldInterface", IArray.fromArray([
        prototypeProperty, unicodeProperty1, normalProperty1,
        unicodeProperty2, neverProperty, normalProperty2, method
      ]));

      const result = DropPropertiesTransform.newClassMembers(scope, interface_);

      expect(result.length).toBe(3);
      expect(result.toArray()).toContain(normalProperty1);
      expect(result.toArray()).toContain(normalProperty2);
      expect(result.toArray()).toContain(method);
      expect(result.toArray()).not.toContain(prototypeProperty);
      expect(result.toArray()).not.toContain(unicodeProperty1);
      expect(result.toArray()).not.toContain(unicodeProperty2);
      expect(result.toArray()).not.toContain(neverProperty);
    });
  });

  describe('Edge Cases', () => {
    test('handles properties with no type', () => {
      const scope = createMockScope();
      const noTypeProperty = createMockProperty("noTypeProp", undefined);
      const interface_ = createMockInterface("test", IArray.fromArray([noTypeProperty]));

      const result = DropPropertiesTransform.newClassMembers(scope, interface_);

      expect(result.length).toBe(1);
      expect(result.toArray()).toContain(noTypeProperty);
    });

    test('handles unicode properties that don\'t start with \\u', () => {
      const scope = createMockScope();
      const unicodeInMiddle = createMockProperty("prop\\u1234");
      const interface_ = createMockInterface("test", IArray.fromArray([unicodeInMiddle]));

      const result = DropPropertiesTransform.newClassMembers(scope, interface_);

      expect(result.length).toBe(1);
      expect(result.toArray()).toContain(unicodeInMiddle);
    });

    test('handles empty member lists', () => {
      const scope = createMockScope();
      const interface_ = createMockInterface("test", IArray.Empty);

      const result = DropPropertiesTransform.newClassMembers(scope, interface_);

      expect(result.length).toBe(0);
    });

    test('handles empty container member lists', () => {
      const scope = createMockScope();
      const namespace = createMockNamespace("test", IArray.Empty);

      const result = DropPropertiesTransform.newMembers(scope, namespace);

      expect(result.length).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    test('works with classes', () => {
      const scope = createMockScope();
      const prototypeProperty = createMockProperty("prototype");
      const normalProperty = createMockProperty("normalProp");

      // Create a mock class with members - use interface as base since it has the right member type
      const interface_ = createMockInterface("TestClass", IArray.fromArray([prototypeProperty, normalProperty]));

      const result = DropPropertiesTransform.newClassMembers(scope, interface_);

      expect(result.length).toBe(1);
      expect(result.toArray()).toContain(normalProperty);
    });

    test('singleton instance works correctly', () => {
      const scope = createMockScope();
      const promisifyDecl = createMockNamedValueDecl("__promisify__");
      const normalDecl = createMockNamedValueDecl("normalVar");
      const namespace = createMockNamespace("test", IArray.fromArray([promisifyDecl, normalDecl]));

      const result = DropPropertiesTransform.newMembers(scope, namespace);

      expect(result.length).toBe(1);
      expect(result.toArray().some((decl: any) =>
        decl._tag === 'TsDeclVar' && decl.name.value === "normalVar"
      )).toBe(true);
    });
  });
});