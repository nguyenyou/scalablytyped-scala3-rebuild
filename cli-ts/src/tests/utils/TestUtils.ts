/**
 * Centralized test utilities for creating mock objects and test data.
 * 
 * This file consolidates all mock creation functions that were previously
 * scattered across individual test files, providing consistent implementations
 * and reducing code duplication.
 */

import {
  TsDeclClass,
  TsDeclInterface,
  TsDeclNamespace,
  TsDeclVar,
  TsTypeRef,
  TsTypeIntersect,
  TsTypeQuery,
  TsMemberProperty,
  TsMemberFunction,
  TsIdent,
  TsQIdent,
  TsIdentSimple,
  TsFunSig,
  MethodType,
  TsProtectionLevel
} from '@/internal/ts/trees.js';
import { TsTreeScope } from '@/internal/ts/TsTreeScope.js';
import { IArray } from '@/internal/IArray.js';
import { Comments } from '@/internal/Comments.js';
import { JsLocation } from '@/internal/ts/JsLocation.js';
import { CodePath } from '@/internal/ts/CodePath.js';
import { Logger } from '@/internal/logging/index.js';
import { some, none } from 'fp-ts/Option';

// ============================================================================
// Scope Creation Utilities
// ============================================================================

/**
 * Creates an empty TsTreeScope for testing purposes.
 * 
 * @param libraryName - Optional library name (defaults to "test-lib")
 * @param declarations - Optional declarations to populate the scope with
 * @returns A mock TsTreeScope instance
 */
export function createMockScope(libraryName: string = "test-lib", ...declarations: any[]): TsTreeScope {
  const root = TsTreeScope.create(
    TsIdent.librarySimple(libraryName),
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

/**
 * Alias for createMockScope for backward compatibility.
 */
export const createEmptyScope = createMockScope;

// ============================================================================
// Type Reference Creation Utilities
// ============================================================================

/**
 * Creates a mock TsTypeRef with all required properties and methods.
 * 
 * @param name - The type name as a string
 * @param tparams - Optional type parameters (defaults to empty)
 * @param comments - Optional comments (defaults to empty)
 * @returns A properly formed TsTypeRef
 */
export function createTypeRef(name: string, tparams: IArray<any> = IArray.Empty, comments: Comments = Comments.empty()): TsTypeRef {
  const qname = TsQIdent.of(TsIdent.simple(name));
  return {
    _tag: 'TsTypeRef',
    asString: `TsTypeRef(${name})`,
    comments,
    name: qname,
    tparams,
    withComments: (cs: Comments) => createTypeRef(name, tparams, cs),
    addComment: (c: any) => createTypeRef(name, tparams, comments.add(c))
  };
}

/**
 * Creates a TsTypeIntersect representing an intersection of multiple types.
 * 
 * @param types - The types to intersect
 * @returns A TsTypeIntersect object
 */
export function createIntersectionType(...types: TsTypeRef[]): TsTypeIntersect {
  return {
    _tag: 'TsTypeIntersect',
    asString: types.map(t => t.asString).join(' & '),
    types: IArray.fromArray(types as any[]) // Cast to TsType[] since TsTypeRef extends TsType
  };
}

/**
 * Creates a TsTypeQuery representing a typeof expression.
 * 
 * @param expr - The expression to query the type of
 * @returns A TsTypeQuery object
 */
export function createTypeQuery(expr: TsQIdent): TsTypeQuery {
  return {
    _tag: 'TsTypeQuery',
    asString: `typeof ${expr.asString}`,
    expr: expr
  };
}

// ============================================================================
// Declaration Creation Utilities
// ============================================================================

/**
 * Creates a mock TsDeclClass with all required properties.
 * 
 * @param name - The class name
 * @param parent - Optional parent class type reference
 * @param implementsInterfaces - Optional interfaces to implement
 * @param members - Optional class members
 * @param isAbstract - Whether the class is abstract (defaults to false)
 * @returns A mock TsDeclClass
 */
export function createMockClass(
  name: string, 
  parent?: TsTypeRef, 
  implementsInterfaces?: IArray<TsTypeRef>,
  members: IArray<any> = IArray.Empty,
  isAbstract: boolean = false
): TsDeclClass {
  return {
    _tag: 'TsDeclClass',
    asString: `class ${name}`,
    comments: Comments.empty(),
    declared: false,
    isAbstract,
    name: TsIdent.simple(name),
    tparams: IArray.Empty,
    parent: parent ? some(parent) : none,
    implementsInterfaces: implementsInterfaces || IArray.Empty,
    members,
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

/**
 * Creates a mock TsDeclInterface with all required properties.
 *
 * @param name - The interface name
 * @param members - Optional interface members (defaults to empty)
 * @param inheritance - Optional parent interfaces (defaults to empty)
 * @returns A mock TsDeclInterface
 */
export function createMockInterface(
  name: string,
  members: IArray<any> = IArray.Empty,
  inheritance?: IArray<TsTypeRef>
): TsDeclInterface {
  return {
    _tag: 'TsDeclInterface',
    asString: `interface ${name}`,
    comments: Comments.empty(),
    declared: false,
    name: TsIdent.simple(name),
    tparams: IArray.Empty,
    inheritance: inheritance || IArray.Empty,
    members,
    codePath: CodePath.noPath(),
    withCodePath: function(cp: CodePath) { return { ...this, codePath: cp }; },
    membersByName: new Map(),
    unnamed: IArray.Empty,
    withName: function(n: any) { return { ...this, name: n }; },
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; }
  };
}

/**
 * Creates a mock TsDeclNamespace with all required properties.
 * 
 * @param name - The namespace name
 * @param members - Optional namespace members
 * @returns A mock TsDeclNamespace
 */
export function createMockNamespace(name: string, members: IArray<any> = IArray.Empty): TsDeclNamespace {
  return {
    _tag: 'TsDeclNamespace',
    asString: `namespace ${name}`,
    comments: Comments.empty(),
    declared: false,
    name: TsIdent.simple(name),
    members,
    jsLocation: JsLocation.zero(),
    codePath: CodePath.noPath(),
    withCodePath: function(cp: CodePath) { return { ...this, codePath: cp }; },
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

/**
 * Creates a mock TsDeclVar (variable declaration) with all required properties.
 * 
 * @param name - The variable name
 * @param tpe - Optional type of the variable
 * @param readOnly - Whether the variable is readonly (defaults to false)
 * @returns A mock TsDeclVar
 */
export function createMockVariable(name: string, tpe?: TsTypeRef, readOnly: boolean = false): TsDeclVar {
  return {
    _tag: 'TsDeclVar',
    asString: `var ${name}`,
    comments: Comments.empty(),
    declared: false,
    readOnly,
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

// ============================================================================
// Member Creation Utilities
// ============================================================================

/**
 * Creates a mock TsMemberProperty with all required properties.
 * 
 * @param name - The property name
 * @param tpe - Optional property type
 * @param isStatic - Whether the property is static (defaults to false)
 * @param isReadOnly - Whether the property is readonly (defaults to false)
 * @returns A mock TsMemberProperty
 */
export function createMockProperty(
  name: string, 
  tpe?: any, 
  isStatic: boolean = false,
  isReadOnly: boolean = false
): TsMemberProperty {
  return {
    _tag: 'TsMemberProperty',
    asString: `${name}: ${tpe?.asString || 'any'}`,
    comments: Comments.empty(),
    level: TsProtectionLevel.default(),
    name: TsIdent.simple(name),
    tpe: tpe ? some(tpe) : none,
    expr: none,
    isStatic,
    isReadOnly,
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; }
  };
}

/**
 * Creates a mock TsMemberFunction with all required properties.
 * 
 * @param name - The method name
 * @param returnType - Optional return type (defaults to void)
 * @param isStatic - Whether the method is static (defaults to false)
 * @returns A mock TsMemberFunction
 */
export function createMockMethod(
  name: string, 
  returnType?: any,
  isStatic: boolean = false
): TsMemberFunction {
  const signature = TsFunSig.create(
    Comments.empty(),
    IArray.Empty, // tparams
    IArray.Empty, // params
    some(returnType || TsTypeRef.void)
  );

  return {
    _tag: 'TsMemberFunction',
    asString: `${name}(): ${returnType?.asString || 'void'}`,
    comments: Comments.empty(),
    level: TsProtectionLevel.default(),
    name: TsIdent.simple(name),
    methodType: MethodType.normal(),
    signature: signature,
    isStatic,
    isReadOnly: false,
    withComments: function(cs: any) { return { ...this, comments: cs }; },
    addComment: function(c: any) { return this; }
  };
}

// ============================================================================
// Convenience Functions and Aliases
// ============================================================================

/**
 * Creates a simple TsQIdent from a string name.
 *
 * @param name - The identifier name
 * @returns A TsQIdent
 */
export function createQIdent(name: string): TsQIdent {
  return TsQIdent.of(TsIdent.simple(name));
}

/**
 * Creates a simple TsIdent from a string name.
 *
 * @param name - The identifier name
 * @returns A TsIdent
 */
export function createIdent(name: string): TsIdent {
  return TsIdent.simple(name);
}

/**
 * Creates an IArray from a regular JavaScript array.
 *
 * @param items - The items to put in the IArray
 * @returns An IArray containing the items
 */
export function createIArray<T>(items: T[]): IArray<T> {
  return IArray.fromArray(items);
}

/**
 * Creates an empty IArray.
 *
 * @returns An empty IArray
 */
export function createEmptyIArray<T>(): IArray<T> {
  return IArray.Empty;
}

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Factory for creating common test scenarios with pre-configured objects.
 */
export const TestScenarios = {
  /**
   * Creates a simple class with a parent and some interfaces.
   */
  classWithInheritance: (
    className: string = "TestClass",
    parentName: string = "BaseClass",
    interfaceNames: string[] = ["Interface1", "Interface2"]
  ) => {
    const parent = createTypeRef(parentName);
    const interfaces = createIArray(interfaceNames.map(name => createTypeRef(name)));
    return createMockClass(className, parent, interfaces);
  },

  /**
   * Creates an interface with inheritance.
   */
  interfaceWithInheritance: (
    interfaceName: string = "TestInterface",
    parentNames: string[] = ["BaseInterface1", "BaseInterface2"]
  ) => {
    const parents = createIArray(parentNames.map(name => createTypeRef(name)));
    return createMockInterface(interfaceName, parents);
  },

  /**
   * Creates a namespace with various member types.
   */
  namespaceWithMembers: (
    namespaceName: string = "TestNamespace",
    memberNames: string[] = ["member1", "member2"]
  ) => {
    const members = createIArray(memberNames.map(name => createMockVariable(name)));
    return createMockNamespace(namespaceName, members);
  },

  /**
   * Creates a class with various member types.
   */
  classWithMembers: (
    className: string = "TestClass",
    propertyNames: string[] = ["prop1", "prop2"],
    methodNames: string[] = ["method1", "method2"]
  ) => {
    const properties = propertyNames.map(name => createMockProperty(name));
    const methods = methodNames.map(name => createMockMethod(name));
    const members = createIArray([...properties, ...methods]);
    return createMockClass(className, undefined, undefined, members);
  }
};

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if an object is a TsDeclClass.
 */
export function isTsDeclClass(obj: any): obj is TsDeclClass {
  return obj && obj._tag === 'TsDeclClass';
}

/**
 * Type guard to check if an object is a TsDeclInterface.
 */
export function isTsDeclInterface(obj: any): obj is TsDeclInterface {
  return obj && obj._tag === 'TsDeclInterface';
}

/**
 * Type guard to check if an object is a TsDeclNamespace.
 */
export function isTsDeclNamespace(obj: any): obj is TsDeclNamespace {
  return obj && obj._tag === 'TsDeclNamespace';
}

/**
 * Type guard to check if an object is a TsDeclVar.
 */
export function isTsDeclVar(obj: any): obj is TsDeclVar {
  return obj && obj._tag === 'TsDeclVar';
}

/**
 * Type guard to check if an object is a TsMemberProperty.
 */
export function isTsMemberProperty(obj: any): obj is TsMemberProperty {
  return obj && obj._tag === 'TsMemberProperty';
}

/**
 * Type guard to check if an object is a TsMemberFunction.
 */
export function isTsMemberFunction(obj: any): obj is TsMemberFunction {
  return obj && obj._tag === 'TsMemberFunction';
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Helper functions for common test assertions.
 */
export const TestAssertions = {
  /**
   * Asserts that an IArray has the expected length.
   */
  hasLength: <T>(array: IArray<T>, expectedLength: number): boolean => {
    return array.length === expectedLength;
  },

  /**
   * Asserts that an IArray contains a specific item.
   */
  contains: <T>(array: IArray<T>, item: T): boolean => {
    return array.toArray().includes(item);
  },

  /**
   * Asserts that an IArray does not contain a specific item.
   */
  doesNotContain: <T>(array: IArray<T>, item: T): boolean => {
    return !array.toArray().includes(item);
  },

  /**
   * Asserts that two IArrays have the same contents (order matters).
   */
  arraysEqual: <T>(array1: IArray<T>, array2: IArray<T>): boolean => {
    if (array1.length !== array2.length) return false;
    const arr1 = array1.toArray();
    const arr2 = array2.toArray();
    return arr1.every((item, index) => item === arr2[index]);
  }
};