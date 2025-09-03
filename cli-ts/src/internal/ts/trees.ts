/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.trees
 * 
 * Represents TypeScript AST (Abstract Syntax Tree) nodes
 * This is a comprehensive type system for modeling TypeScript code structures
 * 
 * Phase 1: Base Types and Identifiers
 */

import { IArray } from '../IArray.js';
import { Comments, Comment } from '../scalajs/Comments.js';
import { Option, some, none } from 'fp-ts/Option';
import { CodePath, HasCodePath } from './CodePath.js';
import { JsLocation, HasJsLocation } from './JsLocation.js';
import { MemberCache, HasClassMembers } from './MemberCache.js';
import { Directive } from './Directive.js';
import { TsProtectionLevel } from './TsProtectionLevel.js';

/**
 * Base interface for all TypeScript AST (Abstract Syntax Tree) nodes
 * This represents any element in a TypeScript source file - declarations, types, expressions, etc.
 * Think of this as the foundation for modeling the entire structure of TypeScript code.
 */
export interface TsTree {
  readonly _tag: string;
  
  /**
   * Provides a human-readable string representation of this tree node,
   * useful for debugging and logging. Shows the node type and name if available.
   */
  readonly asString: string;
}

/**
 * Represents TypeScript elements that can either be containers (like namespaces, modules) 
 * or declarations (like classes, interfaces, functions). 
 * This is the union of things that can appear at the top level of a TypeScript file.
 */
export interface TsContainerOrDecl extends TsTree {}

/**
 * Represents TypeScript declarations - things that introduce new names into scope.
 * Examples: class declarations, interface declarations, function declarations, variable declarations.
 * In TypeScript: `class MyClass {}`, `interface MyInterface {}`, `function myFunc() {}`, etc.
 */
export interface TsDecl extends TsContainerOrDecl {}

/**
 * Represents TypeScript containers that can hold other declarations or containers.
 * Examples: namespaces, modules, classes, interfaces.
 * In TypeScript: `namespace MyNamespace { ... }`, `module "my-module" { ... }`
 */
export interface TsContainer extends TsContainerOrDecl, MemberCache, HasCodePath {
  /**
   * The declarations and containers nested within this container
   */
  readonly members: IArray<TsContainerOrDecl>;

  /**
   * Creates a copy of this container with new members
   */
  withMembers(newMembers: IArray<TsContainerOrDecl>): TsContainer;
}

/**
 * Represents TypeScript declarations that have a name.
 * Examples: named classes, interfaces, functions, variables, type aliases.
 * In TypeScript: `class MyClass`, `interface IMyInterface`, `function myFunction`, etc.
 */
export interface TsNamedDecl extends TsDecl, HasCodePath {
  /**
   * JSDoc comments and other documentation associated with this declaration
   */
  readonly comments: Comments;

  /**
   * The identifier/name of this declaration
   */
  readonly name: TsIdent;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsNamedDecl;

  /**
   * Creates a copy with a new name
   */
  withName(name: TsIdentSimple): TsNamedDecl;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsNamedDecl;
}

/**
 * Represents TypeScript declarations that introduce values (not just types) into scope.
 * Examples: classes, enums, functions, variables.
 * In TypeScript: `class MyClass` (creates both type and value), `const myVar = 5`, `function myFunc() {}`
 * Note: interfaces and type aliases are NOT value declarations - they only exist at compile time.
 */
export interface TsNamedValueDecl extends TsNamedDecl {}

/**
 * Represents a complete TypeScript source file after parsing.
 * This is the root node of the AST for a single .ts or .d.ts file.
 * In TypeScript: the entire content of a file like "myFile.ts"
 */
export interface TsParsedFile extends TsContainer {
  readonly _tag: 'TsParsedFile';

  /**
   * JSDoc comments at the file level
   */
  readonly comments: Comments;

  /**
   * Compiler directives like /// <reference types="node" />
   */
  readonly directives: IArray<Directive>;

  /**
   * All top-level declarations in this file (classes, interfaces, functions, etc.)
   */
  readonly members: IArray<TsContainerOrDecl>;

  /**
   * Path information for this file within the project structure
   */
  readonly codePath: CodePath;

  /**
   * Checks if this file represents TypeScript's standard library definitions.
   * Standard library files contain built-in types like Array, Object, etc.
   */
  readonly isStdLib: boolean;
}

/**
 * Base trait for TypeScript namespace and module declarations.
 * Both namespaces and modules create named scopes that can contain other declarations.
 */
export interface TsDeclNamespaceOrModule extends TsContainer, TsNamedValueDecl, HasJsLocation {}

/**
 * Base trait for module-like declarations (modules and augmented modules).
 * These represent different ways of declaring modules in TypeScript.
 */
export interface TsDeclModuleLike extends TsDeclNamespaceOrModule {}

// Forward declarations for types that will be implemented in later phases
export interface TsTypeParam extends TsTree {
  readonly _tag: 'TsTypeParam';
  readonly name: TsIdentSimple;
  readonly upperBound: Option<TsType>;
  readonly default: Option<TsType>;
}

export interface TsTypeRef extends TsType {
  readonly _tag: 'TsTypeRef';
  readonly name: TsQIdent;
  readonly tparams: IArray<TsType>;
}

export interface TsType extends TsTree {
  readonly _tag: string;
}

export interface TsMember extends TsTree {
  readonly _tag: string;
  readonly level: TsProtectionLevel;
}

export interface TsEnumMember extends TsTree {
  readonly _tag: 'TsEnumMember';
  readonly name: TsIdentSimple;
  readonly expr: Option<TsExpr>;
}

export interface TsExpr extends TsTree {
  readonly _tag: string;
}

export interface TsFunSig extends TsTree {
  readonly _tag: 'TsFunSig';
  readonly tparams: IArray<TsTypeParam>;
  readonly params: IArray<TsFunParam>;
  readonly resultType: Option<TsType>;
}

export interface TsFunParam extends TsTree {
  readonly _tag: 'TsFunParam';
  readonly name: TsIdentSimple;
  readonly tpe: Option<TsType>;
}

// Forward declarations for import/export types
export interface TsExport extends TsContainerOrDecl {
  readonly _tag: 'TsExport';
}

export interface TsImport extends TsContainerOrDecl {
  readonly _tag: 'TsImport';
}

// Forward declarations for member types
export interface TsMemberCall extends TsMember {
  readonly _tag: 'TsMemberCall';
}

export interface TsMemberFunction extends TsMember {
  readonly _tag: 'TsMemberFunction';
  readonly name: TsIdentSimple;
}

export interface TsMemberProperty extends TsMember {
  readonly _tag: 'TsMemberProperty';
  readonly name: TsIdentSimple;
}

export interface TsMemberCtor extends TsMember {
  readonly _tag: 'TsMemberCtor';
}

/**
 * Represents a TypeScript namespace declaration.
 * In TypeScript: `namespace MyNamespace { ... }` or `declare namespace MyNamespace { ... }`
 * Namespaces group related functionality and prevent naming conflicts.
 */
export interface TsDeclNamespace extends TsDeclNamespaceOrModule, TsNamedDecl {
  readonly _tag: 'TsDeclNamespace';

  /**
   * JSDoc comments for this namespace
   */
  readonly comments: Comments;

  /**
   * Whether this is a declare namespace (ambient declaration)
   */
  readonly declared: boolean;

  /**
   * The name of the namespace
   */
  readonly name: TsIdentSimple;

  /**
   * All declarations contained within this namespace
   */
  readonly members: IArray<TsContainerOrDecl>;

  /**
   * Path information for this namespace
   */
  readonly codePath: CodePath;

  /**
   * Location in the JavaScript output where this namespace will be placed
   */
  readonly jsLocation: JsLocation;

  /**
   * Creates a copy with new members
   */
  withMembers(newMembers: IArray<TsContainerOrDecl>): TsDeclNamespace;

  /**
   * Creates a copy with new code path
   */
  withCodePath(newCodePath: CodePath): TsDeclNamespace;

  /**
   * Creates a copy with new JavaScript location
   */
  withJsLocation(newLocation: JsLocation): TsDeclNamespace;

  /**
   * Creates a copy with new name
   */
  withName(newName: TsIdentSimple): TsDeclNamespace;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsDeclNamespace;
}

/**
 * Represents a TypeScript module declaration.
 * In TypeScript: `module "my-module" { ... }` or `declare module "my-module" { ... }`
 * Modules are used to declare the shape of external modules or to augment existing ones.
 */
export interface TsDeclModule extends TsDeclModuleLike {
  readonly _tag: 'TsDeclModule';

  /**
   * JSDoc comments for this module
   */
  readonly comments: Comments;

  /**
   * Whether this is a declare module (ambient declaration)
   */
  readonly declared: boolean;

  /**
   * The module name/path (e.g., "lodash", "@types/node")
   */
  readonly name: TsIdentModule;

  /**
   * All declarations contained within this module
   */
  readonly members: IArray<TsContainerOrDecl>;

  /**
   * Path information for this module
   */
  readonly codePath: CodePath;

  /**
   * Location in the JavaScript output where this module will be placed
   */
  readonly jsLocation: JsLocation;

  /**
   * Augmented modules associated with this module
   */
  readonly augmentedModules: IArray<TsAugmentedModule>;

  /**
   * Creates a copy with new members
   */
  withMembers(newMembers: IArray<TsContainerOrDecl>): TsDeclModule;

  /**
   * Creates a copy with new code path
   */
  withCodePath(newCodePath: CodePath): TsDeclModule;

  /**
   * Creates a copy with new JavaScript location
   */
  withJsLocation(newLocation: JsLocation): TsDeclModule;

  /**
   * Creates a copy with new name (converts to namespace)
   */
  withName(name: TsIdentSimple): TsDeclNamespace;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsDeclModule;
}

/**
 * Represents a TypeScript module augmentation.
 * In TypeScript: `declare module "existing-module" { ... }` when adding to an existing module
 * Used to extend or modify the type definitions of existing modules.
 */
export interface TsAugmentedModule extends TsDeclModuleLike {
  readonly _tag: 'TsAugmentedModule';

  /**
   * JSDoc comments for this module augmentation
   */
  readonly comments: Comments;

  /**
   * The name of the module being augmented
   */
  readonly name: TsIdentModule;

  /**
   * Additional declarations being added to the existing module
   */
  readonly members: IArray<TsContainerOrDecl>;

  /**
   * Path information for this augmentation
   */
  readonly codePath: CodePath;

  /**
   * Location in the JavaScript output where this augmentation will be placed
   */
  readonly jsLocation: JsLocation;

  /**
   * Creates a copy with new members
   */
  withMembers(newMembers: IArray<TsContainerOrDecl>): TsAugmentedModule;

  /**
   * Creates a copy with new code path
   */
  withCodePath(newCodePath: CodePath): TsAugmentedModule;

  /**
   * Creates a copy with new JavaScript location
   */
  withJsLocation(newLocation: JsLocation): TsAugmentedModule;

  /**
   * Creates a copy with new name (converts to namespace)
   */
  withName(name: TsIdentSimple): TsDeclNamespace;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsAugmentedModule;
}

/**
 * Represents a TypeScript global scope declaration.
 * In TypeScript: `declare global { ... }`
 * Used to add declarations to the global scope, typically in module files.
 */
export interface TsGlobal extends TsContainer, HasCodePath {
  readonly _tag: 'TsGlobal';

  /**
   * JSDoc comments for this global declaration
   */
  readonly comments: Comments;

  /**
   * Whether this is a declare global (ambient declaration)
   */
  readonly declared: boolean;

  /**
   * All declarations being added to the global scope
   */
  readonly members: IArray<TsContainerOrDecl>;

  /**
   * Path information for this global declaration
   */
  readonly codePath: CodePath;

  /**
   * Creates a copy with new members
   */
  withMembers(newMembers: IArray<TsContainerOrDecl>): TsGlobal;

  /**
   * Creates a copy with new code path
   */
  withCodePath(newCodePath: CodePath): TsGlobal;
}

/**
 * Represents a TypeScript class declaration.
 * In TypeScript: `class MyClass extends BaseClass implements IInterface { ... }`
 * Classes create both a type (for type checking) and a value (the constructor function).
 */
export interface TsDeclClass extends TsNamedValueDecl, HasJsLocation, HasClassMembers, TsNamedDecl {
  readonly _tag: 'TsDeclClass';

  /**
   * JSDoc comments for this class
   */
  readonly comments: Comments;

  /**
   * Whether this is a declare class (ambient declaration)
   */
  readonly declared: boolean;

  /**
   * Whether this class is abstract (cannot be instantiated directly)
   */
  readonly isAbstract: boolean;

  /**
   * The name of the class
   */
  readonly name: TsIdentSimple;

  /**
   * Generic type parameters (e.g., <T, U> in class MyClass<T, U>)
   */
  readonly tparams: IArray<TsTypeParam>;

  /**
   * The parent class this extends (single inheritance)
   */
  readonly parent: Option<TsTypeRef>;

  /**
   * The interfaces this class implements (multiple inheritance of contracts)
   */
  readonly implementsInterfaces: IArray<TsTypeRef>;

  /**
   * All members of this class (properties, methods, constructors)
   */
  readonly members: IArray<TsMember>;

  /**
   * Location in the JavaScript output where this class will be placed
   */
  readonly jsLocation: JsLocation;

  /**
   * Path information for this class
   */
  readonly codePath: CodePath;

  /**
   * Creates a copy with new code path
   */
  withCodePath(newCodePath: CodePath): TsDeclClass;

  /**
   * Creates a copy with new JavaScript location
   */
  withJsLocation(newLocation: JsLocation): TsDeclClass;

  /**
   * Creates a copy with new name
   */
  withName(newName: TsIdentSimple): TsDeclClass;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsDeclClass;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsDeclClass;
}

/**
 * Represents a TypeScript interface declaration.
 * In TypeScript: `interface MyInterface extends BaseInterface { ... }`
 * Interfaces define contracts/shapes for objects and only exist at compile time.
 */
export interface TsDeclInterface extends TsNamedDecl, HasClassMembers {
  readonly _tag: 'TsDeclInterface';

  /**
   * JSDoc comments for this interface
   */
  readonly comments: Comments;

  /**
   * Whether this is a declare interface (ambient declaration)
   */
  readonly declared: boolean;

  /**
   * The name of the interface
   */
  readonly name: TsIdentSimple;

  /**
   * Generic type parameters (e.g., <T, U> in interface MyInterface<T, U>)
   */
  readonly tparams: IArray<TsTypeParam>;

  /**
   * The interfaces this interface extends (multiple inheritance)
   */
  readonly inheritance: IArray<TsTypeRef>;

  /**
   * All members of this interface (properties, methods, call signatures)
   */
  readonly members: IArray<TsMember>;

  /**
   * Path information for this interface
   */
  readonly codePath: CodePath;

  /**
   * Creates a copy with new code path
   */
  withCodePath(newCodePath: CodePath): TsDeclInterface;

  /**
   * Creates a copy with new name
   */
  withName(newName: TsIdentSimple): TsDeclInterface;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsDeclInterface;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsDeclInterface;
}

/**
 * Represents a TypeScript enum declaration.
 * In TypeScript: `enum Color { Red, Green, Blue }` or `const enum Status { Active = 1, Inactive = 0 }`
 * Enums create both a type and a value, allowing reverse lookup by default.
 */
export interface TsDeclEnum extends TsNamedValueDecl, HasJsLocation, TsNamedDecl {
  readonly _tag: 'TsDeclEnum';

  /**
   * JSDoc comments for this enum
   */
  readonly comments: Comments;

  /**
   * Whether this is a declare enum (ambient declaration)
   */
  readonly declared: boolean;

  /**
   * Whether this is a const enum (inlined at compile time)
   */
  readonly isConst: boolean;

  /**
   * The name of the enum
   */
  readonly name: TsIdentSimple;

  /**
   * All members/values in this enum
   */
  readonly members: IArray<TsEnumMember>;

  /**
   * Whether this enum creates a runtime value (not just a type)
   */
  readonly isValue: boolean;

  /**
   * If this enum is re-exported from another module
   */
  readonly exportedFrom: Option<TsTypeRef>;

  /**
   * Location in the JavaScript output where this enum will be placed
   */
  readonly jsLocation: JsLocation;

  /**
   * Path information for this enum
   */
  readonly codePath: CodePath;

  /**
   * Creates a copy with new code path
   */
  withCodePath(newCodePath: CodePath): TsDeclEnum;

  /**
   * Creates a copy with new JavaScript location
   */
  withJsLocation(newLocation: JsLocation): TsDeclEnum;

  /**
   * Creates a copy with new name
   */
  withName(newName: TsIdentSimple): TsDeclEnum;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsDeclEnum;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsDeclEnum;
}

/**
 * Represents a TypeScript variable declaration.
 * In TypeScript: `const myVar: string = "hello"` or `let count: number` or `var flag: boolean`
 * Can be const, let, var, or declare var for ambient declarations.
 */
export interface TsDeclVar extends TsNamedValueDecl, HasJsLocation, TsNamedDecl {
  readonly _tag: 'TsDeclVar';

  /**
   * JSDoc comments for this variable
   */
  readonly comments: Comments;

  /**
   * Whether this is a declare var (ambient declaration)
   */
  readonly declared: boolean;

  /**
   * Whether this variable is readonly (const or readonly modifier)
   */
  readonly readOnly: boolean;

  /**
   * The name of the variable
   */
  readonly name: TsIdentSimple;

  /**
   * Optional type annotation
   */
  readonly tpe: Option<TsType>;

  /**
   * Optional initializer expression
   */
  readonly expr: Option<TsExpr>;

  /**
   * Location in the JavaScript output where this variable will be placed
   */
  readonly jsLocation: JsLocation;

  /**
   * Path information for this variable
   */
  readonly codePath: CodePath;

  /**
   * Creates a copy with new code path
   */
  withCodePath(newCodePath: CodePath): TsDeclVar;

  /**
   * Creates a copy with new JavaScript location
   */
  withJsLocation(newLocation: JsLocation): TsDeclVar;

  /**
   * Creates a copy with new name
   */
  withName(newName: TsIdentSimple): TsDeclVar;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsDeclVar;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsDeclVar;
}

/**
 * Represents a TypeScript function declaration.
 * In TypeScript: `function myFunc(x: number): string { ... }` or `declare function myFunc(x: number): string`
 * Top-level function declarations create both a type and a value.
 */
export interface TsDeclFunction extends TsNamedValueDecl, HasJsLocation, TsNamedDecl {
  readonly _tag: 'TsDeclFunction';

  /**
   * JSDoc comments for this function
   */
  readonly comments: Comments;

  /**
   * Whether this is a declare function (ambient declaration)
   */
  readonly declared: boolean;

  /**
   * The name of the function
   */
  readonly name: TsIdentSimple;

  /**
   * The function signature (parameters, return type, type parameters)
   */
  readonly signature: TsFunSig;

  /**
   * Location in the JavaScript output where this function will be placed
   */
  readonly jsLocation: JsLocation;

  /**
   * Path information for this function
   */
  readonly codePath: CodePath;

  /**
   * Creates a copy with new code path
   */
  withCodePath(newCodePath: CodePath): TsDeclFunction;

  /**
   * Creates a copy with new JavaScript location
   */
  withJsLocation(newLocation: JsLocation): TsDeclFunction;

  /**
   * Creates a copy with new name
   */
  withName(newName: TsIdentSimple): TsDeclFunction;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsDeclFunction;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsDeclFunction;
}

/**
 * Represents a TypeScript type alias declaration.
 * In TypeScript: `type MyType = string | number` or `type GenericType<T> = T[]`
 * Type aliases create new names for existing types and only exist at compile time.
 */
export interface TsDeclTypeAlias extends TsNamedDecl {
  readonly _tag: 'TsDeclTypeAlias';

  /**
   * JSDoc comments for this type alias
   */
  readonly comments: Comments;

  /**
   * Whether this is a declare type (ambient declaration)
   */
  readonly declared: boolean;

  /**
   * The name of the type alias
   */
  readonly name: TsIdentSimple;

  /**
   * Generic type parameters (e.g., <T, U> in type MyType<T, U>)
   */
  readonly tparams: IArray<TsTypeParam>;

  /**
   * The actual type this alias refers to
   */
  readonly alias: TsType;

  /**
   * Path information for this type alias
   */
  readonly codePath: CodePath;

  /**
   * Creates a copy with new code path
   */
  withCodePath(newCodePath: CodePath): TsDeclTypeAlias;

  /**
   * Creates a copy with new name
   */
  withName(newName: TsIdentSimple): TsDeclTypeAlias;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsDeclTypeAlias;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsDeclTypeAlias;
}

/**
 * Base interface for TypeScript identifiers (names).
 * Represents any kind of name used in TypeScript code.
 */
export interface TsIdent extends TsTree {
  readonly _tag: 'TsIdentSimple' | 'TsIdentImport' | 'TsIdentModule' | 'TsIdentLibrarySimple' | 'TsIdentLibraryScoped';
  readonly value: string;
}

/**
 * Represents a simple TypeScript identifier.
 * In TypeScript: `myVariable`, `MyClass`, `functionName`
 * The most common type of identifier for variables, functions, classes, etc.
 */
export interface TsIdentSimple extends TsIdent {
  readonly _tag: 'TsIdentSimple';
  readonly value: string;
}

/**
 * Represents an identifier that comes from an import.
 * In TypeScript: when you `import { something } from "module"`,
 * `something` becomes a TsIdentImport
 * Links the identifier back to its source module.
 */
export interface TsIdentImport extends TsIdent {
  readonly _tag: 'TsIdentImport';
  readonly from: TsIdentModule;
  readonly value: string; // derived from from.value
}

/**
 * Represents a TypeScript module identifier.
 * In TypeScript: `"lodash"`, `"@types/node"`, `"./relative-module"`
 * Used in import/export statements and module declarations.
 */
export interface TsIdentModule extends TsIdent {
  readonly _tag: 'TsIdentModule';
  readonly scopeOpt: Option<string>;
  readonly fragments: string[];
  readonly value: string; // computed from scopeOpt and fragments
  readonly inLibrary: TsIdentLibrary; // computed library identifier
}

/**
 * Base interface for TypeScript library/package identifiers.
 * In TypeScript: `"lodash"`, `"@types/node"`, `"react"`
 * Used to identify npm packages and their type definitions.
 */
export interface TsIdentLibrary extends TsIdent {
  readonly _tag: 'TsIdentLibrarySimple' | 'TsIdentLibraryScoped';
  readonly value: string;
  
  /**
   * Internal representation used for file naming and disambiguation.
   * Converts scoped packages like "@scope/name" to "scope__name"
   */
  readonly __value: string;
}

/**
 * Represents a simple (non-scoped) library identifier.
 * In TypeScript: `"lodash"`, `"react"`, `"express"`
 */
export interface TsIdentLibrarySimple extends TsIdentLibrary {
  readonly _tag: 'TsIdentLibrarySimple';
  readonly value: string;
  readonly __value: string; // same as value for simple libraries
}

/**
 * Represents a scoped library identifier.
 * In TypeScript: `"@types/node"`, `"@angular/core"`, `"@babel/parser"`
 */
export interface TsIdentLibraryScoped extends TsIdentLibrary {
  readonly _tag: 'TsIdentLibraryScoped';
  readonly scope: string;
  readonly name: string;
  readonly value: string; // "@scope/name"
  readonly __value: string; // "scope__name"
}

/**
 * Represents a qualified TypeScript identifier (dotted name).
 * In TypeScript: `MyNamespace.MyClass`, `React.Component`, `std.Array`
 * Used for accessing nested declarations and namespaced types.
 */
export interface TsQIdent extends TsTree {
  readonly _tag: 'TsQIdent';
  readonly parts: IArray<TsIdent>;
}

/**
 * Represents TypeScript literal values.
 * In TypeScript: `"hello"`, `42`, `true`, `null`
 */
export interface TsLiteral extends TsTree {
  readonly _tag: 'TsLiteralStr' | 'TsLiteralNum' | 'TsLiteralBool';
  readonly value: string;
}

/**
 * String literal
 */
export interface TsLiteralStr extends TsLiteral {
  readonly _tag: 'TsLiteralStr';
  readonly value: string;
}

/**
 * Numeric literal
 */
export interface TsLiteralNum extends TsLiteral {
  readonly _tag: 'TsLiteralNum';
  readonly value: string; // stored as string to preserve exact representation
}

/**
 * Boolean literal
 */
export interface TsLiteralBool extends TsLiteral {
  readonly _tag: 'TsLiteralBool';
  readonly value: string; // "true" or "false"
}

/**
 * Constructor functions and utilities for TsIdent
 */
export const TsIdent = {
  /**
   * Creates a simple identifier from a string
   */
  simple: (value: string): TsIdentSimple => ({
    _tag: 'TsIdentSimple',
    value,
    asString: `TsIdentSimple(${value})`
  }),

  /**
   * Creates an import identifier
   */
  import: (from: TsIdentModule): TsIdentImport => ({
    _tag: 'TsIdentImport',
    from,
    value: from.value,
    asString: `TsIdentImport(${from.value})`
  }),

  /**
   * Creates a module identifier
   */
  module: (scopeOpt: Option<string>, fragments: string[]): TsIdentModule => {
    const value = scopeOpt._tag === 'Some'
      ? `@${scopeOpt.value}/${fragments.join('/')}`
      : fragments.join('/');

    const inLibrary = scopeOpt._tag === 'Some'
      ? TsIdent.libraryScoped(scopeOpt.value, fragments[0] || '')
      : TsIdent.librarySimple(fragments[0] || '');

    return {
      _tag: 'TsIdentModule',
      scopeOpt,
      fragments,
      value,
      inLibrary,
      asString: `TsIdentModule(${value})`
    };
  },

  /**
   * Creates a simple library identifier
   */
  librarySimple: (value: string): TsIdentLibrarySimple => ({
    _tag: 'TsIdentLibrarySimple',
    value,
    __value: value,
    asString: `TsIdentLibrarySimple(${value})`
  }),

  /**
   * Creates a scoped library identifier
   */
  libraryScoped: (scope: string, name: string): TsIdentLibraryScoped => ({
    _tag: 'TsIdentLibraryScoped',
    scope,
    name,
    value: `@${scope}/${name}`,
    __value: `${scope}__${name}`,
    asString: `TsIdentLibraryScoped(@${scope}/${name})`
  }),

  /**
   * Type guards
   */
  isSimple: (ident: TsIdent): ident is TsIdentSimple => ident._tag === 'TsIdentSimple',
  isImport: (ident: TsIdent): ident is TsIdentImport => ident._tag === 'TsIdentImport',
  isModule: (ident: TsIdent): ident is TsIdentModule => ident._tag === 'TsIdentModule',
  isLibrarySimple: (ident: TsIdent): ident is TsIdentLibrarySimple => ident._tag === 'TsIdentLibrarySimple',
  isLibraryScoped: (ident: TsIdent): ident is TsIdentLibraryScoped => ident._tag === 'TsIdentLibraryScoped',
  isLibrary: (ident: TsIdent): ident is TsIdentLibrary =>
    ident._tag === 'TsIdentLibrarySimple' || ident._tag === 'TsIdentLibraryScoped',

  /**
   * Checks if two identifiers are equal
   */
  equals: (a: TsIdent, b: TsIdent): boolean => {
    return a._tag === b._tag && a.value === b.value;
  },

  // Special library identifiers for backward compatibility
  get std(): TsIdentLibrary {
    return TsIdentStd;
  }
};

/**
 * Constructor functions and utilities for TsIdentLibrary
 */
export const TsIdentLibrary = {
  /**
   * Creates a library identifier from a string
   * Handles both simple and scoped package names
   */
  construct: (str: string): TsIdentLibrary => {
    // Handle scoped packages like "@types/node" or "@angular/core"
    const scopedMatch = str.match(/^@([^/]+)\/(.+)$/);
    if (scopedMatch) {
      const [, scope, name] = scopedMatch;
      // Special case: @types/name -> just name
      if (scope === 'types') {
        return TsIdent.librarySimple(name);
      }
      return TsIdent.libraryScoped(scope, name);
    }

    // Handle internal scoped representation like "scope__name"
    const scopedUnderscoreMatch = str.match(/^(.+)__(.+)$/);
    if (scopedUnderscoreMatch) {
      const [, scope, name] = scopedUnderscoreMatch;
      // Special case: types__name -> just name
      if (scope === 'types') {
        return TsIdent.librarySimple(name);
      }
      return TsIdent.libraryScoped(scope, name);
    }

    // Simple library name
    return TsIdent.librarySimple(str);
  },

  /**
   * Type guards
   */
  isSimple: (lib: TsIdentLibrary): lib is TsIdentLibrarySimple => lib._tag === 'TsIdentLibrarySimple',
  isScoped: (lib: TsIdentLibrary): lib is TsIdentLibraryScoped => lib._tag === 'TsIdentLibraryScoped'
};

/**
 * Constructor functions and utilities for TsIdentModule
 */
export const TsIdentModule = {
  /**
   * Creates a module identifier from a library identifier
   */
  fromLibrary: (lib: TsIdentLibrary): TsIdentModule => {
    if (TsIdentLibrary.isSimple(lib)) {
      return TsIdent.module(none, lib.value.split('.'));
    } else {
      const scopedLib = lib as TsIdentLibraryScoped;
      return TsIdent.module(some(scopedLib.scope), scopedLib.name.split('.'));
    }
  },

  /**
   * Creates a simple module identifier with a single fragment
   */
  simple: (s: string): TsIdentModule => {
    return TsIdent.module(none, [s]);
  },

  /**
   * Gets the library identifier for this module (deprecated)
   */
  inLibrary: (module: TsIdentModule): TsIdentLibrary => {
    if (module.scopeOpt._tag === 'None') {
      return TsIdent.librarySimple(module.fragments[0] || '');
    } else {
      return TsIdent.libraryScoped(module.scopeOpt.value, module.fragments[0] || '');
    }
  }
};

// Special identifiers used in TypeScript - defined after TsIdent to avoid circular reference
/** The `this` keyword identifier */
export const TsIdentThis: TsIdentSimple = TsIdent.simple('this');

/** Special identifier for function application/call syntax */
export const TsIdentApply: TsIdentSimple = TsIdent.simple('<apply>');

/** Special identifier for global scope declarations */
export const TsIdentGlobal: TsIdentSimple = TsIdent.simple('<global>');

/** Special identifier for destructured parameters without explicit names */
export const TsIdentDestructured: TsIdentSimple = TsIdent.simple('<destructured>');

// Common TypeScript/JavaScript identifiers
/** The `update` method identifier (common in immutable libraries) */
export const TsIdentUpdate: TsIdentSimple = TsIdent.simple('update');

/** The `prototype` property identifier */
export const TsIdentPrototype: TsIdentSimple = TsIdent.simple('prototype');

/** The `constructor` property identifier */
export const TsIdentConstructor: TsIdentSimple = TsIdent.simple('constructor');

/** The `default` export identifier */
export const TsIdentDefault: TsIdentSimple = TsIdent.simple('default');

/** Special identifier for namespaced declarations */
export const TsIdentNamespaced: TsIdentSimple = TsIdent.simple('^');

/** Special identifier for namespaced class declarations */
export const TsIdentNamespacedCls: TsIdentSimple = TsIdent.simple('Class');

/** The `Symbol` global identifier */
export const TsIdentSymbol: TsIdentSimple = TsIdent.simple('Symbol');

/** Dummy identifier for placeholder purposes */
export const TsIdentDummy: TsIdentSimple = TsIdent.simple('dummy');

// Special library identifiers
/** Placeholder library identifier for testing/dummy purposes */
export const TsIdentDummyLibrary: TsIdentLibrary = TsIdent.librarySimple('dummyLibrary');

/** TypeScript standard library identifier */
export const TsIdentStd: TsIdentLibrary = TsIdent.librarySimple('std');

/** Node.js type definitions library identifier */
export const TsIdentNode: TsIdentLibrary = TsIdent.librarySimple('node');



/**
 * Constructor functions and utilities for TsQIdent
 */
export const TsQIdent = {
  /**
   * Creates a qualified identifier from identifier parts
   */
  of: (...parts: TsIdent[]): TsQIdent => ({
    _tag: 'TsQIdent',
    parts: IArray.fromArray(parts),
    asString: `TsQIdent(${parts.map(p => p.value).join('.')})`
  }),

  /**
   * Creates a qualified identifier from string parts
   */
  ofStrings: (...parts: string[]): TsQIdent => {
    const identParts: TsIdent[] = parts.map(TsIdent.simple);
    return {
      _tag: 'TsQIdent',
      parts: IArray.fromArray(identParts),
      asString: `TsQIdent(${parts.join('.')})`
    };
  },

  /**
   * Creates a qualified identifier from a single identifier
   */
  single: (ident: TsIdent): TsQIdent => ({
    _tag: 'TsQIdent',
    parts: IArray.fromArray([ident]),
    asString: `TsQIdent(${ident.value})`
  }),

  /**
   * Empty qualified identifier
   */
  empty: (): TsQIdent => ({
    _tag: 'TsQIdent',
    parts: IArray.Empty,
    asString: 'TsQIdent()'
  }),

  /**
   * Appends a single identifier to create a longer qualified name
   */
  append: (qident: TsQIdent, ident: TsIdent): TsQIdent => ({
    _tag: 'TsQIdent',
    parts: qident.parts.append(ident),
    asString: `TsQIdent(${qident.parts.toArray().concat([ident]).map(p => p.value).join('.')})`
  }),

  /**
   * Appends multiple identifiers to create a longer qualified name
   */
  appendAll: (qident: TsQIdent, idents: IArray<TsIdent>): TsQIdent => ({
    _tag: 'TsQIdent',
    parts: qident.parts.appendedAll(idents),
    asString: `TsQIdent(${qident.parts.toArray().concat(idents.toArray()).map(p => p.value).join('.')})`
  })
};

// TypeScript primitive types (lowercase)
/** The `any` type - accepts any value */
export const TsQIdentAny: TsQIdent = TsQIdent.ofStrings('any');

/** The `bigint` type - for large integers */
export const TsQIdentBigint: TsQIdent = TsQIdent.ofStrings('bigint');

/** The `number` type - for numeric values */
export const TsQIdentNumber: TsQIdent = TsQIdent.ofStrings('number');

/** The `boolean` type - for true/false values */
export const TsQIdentBoolean: TsQIdent = TsQIdent.ofStrings('boolean');

/** The `never` type - represents values that never occur */
export const TsQIdentNever: TsQIdent = TsQIdent.ofStrings('never');

/** The `null` type - represents null values */
export const TsQIdentNull: TsQIdent = TsQIdent.ofStrings('null');

/** The `object` type - for non-primitive values */
export const TsQIdentObject: TsQIdent = TsQIdent.ofStrings('object');

/** The `string` type - for text values */
export const TsQIdentString: TsQIdent = TsQIdent.ofStrings('string');

/** The `symbol` type - for unique identifiers */
export const TsQIdentSymbol: TsQIdent = TsQIdent.ofStrings('symbol');

/** The `undefined` type - represents undefined values */
export const TsQIdentUndefined: TsQIdent = TsQIdent.ofStrings('undefined');

/** The `unknown` type - type-safe alternative to any */
export const TsQIdentUnknown: TsQIdent = TsQIdent.ofStrings('unknown');

/** The `void` type - represents absence of value */
export const TsQIdentVoid: TsQIdent = TsQIdent.ofStrings('void');

// TypeScript built-in object types (capitalized)
/** The `Array` constructor type */
export const TsQIdentArray: TsQIdent = TsQIdent.ofStrings('Array');

/** The `BigInt` constructor type */
export const TsQIdentBigInt: TsQIdent = TsQIdent.ofStrings('BigInt');

/** The `ReadonlyArray` utility type */
export const TsQIdentReadonlyArray: TsQIdent = TsQIdent.ofStrings('ReadonlyArray');

/** The `Boolean` constructor type */
export const TsQIdentBooleanConstructor: TsQIdent = TsQIdent.ofStrings('Boolean');

/** The `Function` constructor type */
export const TsQIdentFunction: TsQIdent = TsQIdent.ofStrings('Function');

/** The `Object` constructor type */
export const TsQIdentObjectConstructor: TsQIdent = TsQIdent.ofStrings('Object');

/** The `String` constructor type */
export const TsQIdentStringConstructor: TsQIdent = TsQIdent.ofStrings('String');

/**
 * Constructor functions and utilities for TsLiteral
 */
export const TsLiteral = {
  /**
   * Creates a string literal
   */
  str: (value: string): TsLiteralStr => ({
    _tag: 'TsLiteralStr',
    value,
    asString: `TsLiteralStr("${value}")`
  }),

  /**
   * Creates a numeric literal
   */
  num: (value: string): TsLiteralNum => ({
    _tag: 'TsLiteralNum',
    value,
    asString: `TsLiteralNum(${value})`
  }),

  /**
   * Creates a boolean literal
   */
  bool: (value: boolean): TsLiteralBool => ({
    _tag: 'TsLiteralBool',
    value: value.toString(),
    asString: `TsLiteralBool(${value})`
  }),

  /**
   * Type guards
   */
  isStr: (literal: TsLiteral): literal is TsLiteralStr => literal._tag === 'TsLiteralStr',
  isNum: (literal: TsLiteral): literal is TsLiteralNum => literal._tag === 'TsLiteralNum',
  isBool: (literal: TsLiteral): literal is TsLiteralBool => literal._tag === 'TsLiteralBool'
};

/**
 * Constructor functions and utilities for TsParsedFile
 */
export const TsParsedFile = {
  /**
   * Creates a parsed file
   */
  create: (
    comments: Comments,
    directives: IArray<Directive>,
    members: IArray<TsContainerOrDecl>,
    codePath: CodePath
  ): TsParsedFile => {
    // Check if this is a standard library file
    const isStdLib = directives.toArray().some(directive =>
      directive._tag === 'NoStdLib'
    );

    // Create member cache
    const memberCache = MemberCache.create(members);

    return {
      _tag: 'TsParsedFile',
      comments,
      directives,
      codePath,
      isStdLib,
      ...memberCache,
      withMembers: (newMembers: IArray<TsContainerOrDecl>) =>
        TsParsedFile.create(comments, directives, newMembers, codePath),
      withCodePath: (newCodePath: CodePath) =>
        TsParsedFile.create(comments, directives, members, newCodePath),
      asString: `TsParsedFile(${codePath._tag})`
    };
  },

  /**
   * Type guard
   */
  isParsedFile: (tree: TsTree): tree is TsParsedFile => tree._tag === 'TsParsedFile'
};

/**
 * Constructor functions and utilities for TsDeclNamespace
 */
export const TsDeclNamespace = {
  /**
   * Creates a namespace declaration
   */
  create: (
    comments: Comments,
    declared: boolean,
    name: TsIdentSimple,
    members: IArray<TsContainerOrDecl>,
    codePath: CodePath,
    jsLocation: JsLocation
  ): TsDeclNamespace => {
    // Create member cache
    const memberCache = MemberCache.create(members);

    return {
      _tag: 'TsDeclNamespace',
      comments,
      declared,
      name,
      codePath,
      jsLocation,
      ...memberCache,
      withMembers: (newMembers: IArray<TsContainerOrDecl>) =>
        TsDeclNamespace.create(comments, declared, name, newMembers, codePath, jsLocation),
      withCodePath: (newCodePath: CodePath) =>
        TsDeclNamespace.create(comments, declared, name, members, newCodePath, jsLocation),
      withJsLocation: (newLocation: JsLocation) =>
        TsDeclNamespace.create(comments, declared, name, members, codePath, newLocation),
      withName: (newName: TsIdentSimple) =>
        TsDeclNamespace.create(comments, declared, newName, members, codePath, jsLocation),
      withComments: (cs: Comments) =>
        TsDeclNamespace.create(cs, declared, name, members, codePath, jsLocation),
      addComment: (c: Comment) =>
        TsDeclNamespace.create(comments.add(c), declared, name, members, codePath, jsLocation),
      asString: `TsDeclNamespace(${name.value})`
    };
  },

  /**
   * Type guard
   */
  isNamespace: (tree: TsTree): tree is TsDeclNamespace => tree._tag === 'TsDeclNamespace'
};

/**
 * Constructor functions and utilities for TsDeclModule
 */
export const TsDeclModule = {
  /**
   * Creates a module declaration
   */
  create: (
    comments: Comments,
    declared: boolean,
    name: TsIdentModule,
    members: IArray<TsContainerOrDecl>,
    codePath: CodePath,
    jsLocation: JsLocation,
    augmentedModules: IArray<TsAugmentedModule> = IArray.Empty
  ): TsDeclModule => {
    // Create member cache
    const memberCache = MemberCache.create(members);

    return {
      _tag: 'TsDeclModule',
      comments,
      declared,
      name,
      codePath,
      jsLocation,
      ...memberCache,
      augmentedModules: augmentedModules as any,
      withMembers: (newMembers: IArray<TsContainerOrDecl>) =>
        TsDeclModule.create(comments, declared, name, newMembers, codePath, jsLocation, augmentedModules),
      withCodePath: (newCodePath: CodePath) =>
        TsDeclModule.create(comments, declared, name, members, newCodePath, jsLocation, augmentedModules),
      withJsLocation: (newLocation: JsLocation) =>
        TsDeclModule.create(comments, declared, name, members, codePath, newLocation, augmentedModules),
      withName: (newName: TsIdentSimple) =>
        TsDeclNamespace.create(comments, false, newName, members, codePath, jsLocation),
      withComments: (cs: Comments) =>
        TsDeclModule.create(cs, declared, name, members, codePath, jsLocation, augmentedModules),
      addComment: (c: Comment) =>
        TsDeclModule.create(comments.add(c), declared, name, members, codePath, jsLocation, augmentedModules),
      asString: `TsDeclModule(${name.value})`
    };
  },

  /**
   * Type guard
   */
  isModule: (tree: TsTree): tree is TsDeclModule => tree._tag === 'TsDeclModule'
};

/**
 * Constructor functions and utilities for TsAugmentedModule
 */
export const TsAugmentedModule = {
  /**
   * Creates an augmented module declaration
   */
  create: (
    comments: Comments,
    name: TsIdentModule,
    members: IArray<TsContainerOrDecl>,
    codePath: CodePath,
    jsLocation: JsLocation
  ): TsAugmentedModule => {
    // Create member cache
    const memberCache = MemberCache.create(members);

    return {
      _tag: 'TsAugmentedModule',
      comments,
      name,
      codePath,
      jsLocation,
      ...memberCache,
      withMembers: (newMembers: IArray<TsContainerOrDecl>) =>
        TsAugmentedModule.create(comments, name, newMembers, codePath, jsLocation),
      withCodePath: (newCodePath: CodePath) =>
        TsAugmentedModule.create(comments, name, members, newCodePath, jsLocation),
      withJsLocation: (newLocation: JsLocation) =>
        TsAugmentedModule.create(comments, name, members, codePath, newLocation),
      withName: (newName: TsIdentSimple) =>
        TsDeclNamespace.create(Comments.empty(), false, newName, members, codePath, jsLocation),
      withComments: (cs: Comments) =>
        TsAugmentedModule.create(cs, name, members, codePath, jsLocation),
      addComment: (c: Comment) =>
        TsAugmentedModule.create(comments.add(c), name, members, codePath, jsLocation),
      asString: `TsAugmentedModule(${name.value})`
    };
  },

  /**
   * Type guard
   */
  isAugmentedModule: (tree: TsTree): tree is TsAugmentedModule => tree._tag === 'TsAugmentedModule'
};

/**
 * Constructor functions and utilities for TsGlobal
 */
export const TsGlobal = {
  /**
   * Creates a global scope declaration
   */
  create: (
    comments: Comments,
    declared: boolean,
    members: IArray<TsContainerOrDecl>,
    codePath: CodePath
  ): TsGlobal => {
    // Create member cache
    const memberCache = MemberCache.create(members);

    return {
      _tag: 'TsGlobal',
      comments,
      declared,
      codePath,
      ...memberCache,
      withMembers: (newMembers: IArray<TsContainerOrDecl>) =>
        TsGlobal.create(comments, declared, newMembers, codePath),
      withCodePath: (newCodePath: CodePath) =>
        TsGlobal.create(comments, declared, members, newCodePath),
      asString: `TsGlobal(${declared ? 'declared' : 'undeclared'})`
    };
  },

  /**
   * Type guard
   */
  isGlobal: (tree: TsTree): tree is TsGlobal => tree._tag === 'TsGlobal'
};

/**
 * Constructor functions and utilities for TsDeclClass
 */
export const TsDeclClass = {
  /**
   * Creates a class declaration
   */
  create: (
    comments: Comments,
    declared: boolean,
    isAbstract: boolean,
    name: TsIdentSimple,
    tparams: IArray<TsTypeParam>,
    parent: Option<TsTypeRef>,
    implementsInterfaces: IArray<TsTypeRef>,
    members: IArray<TsMember>,
    jsLocation: JsLocation,
    codePath: CodePath
  ): TsDeclClass => {
    // Create class member cache
    const classMemberCache = HasClassMembers.create(members);

    return {
      _tag: 'TsDeclClass',
      comments,
      declared,
      isAbstract,
      name,
      tparams,
      parent,
      implementsInterfaces,
      jsLocation,
      codePath,
      ...classMemberCache,
      withCodePath: (newCodePath: CodePath) =>
        TsDeclClass.create(comments, declared, isAbstract, name, tparams, parent, implementsInterfaces, members, jsLocation, newCodePath),
      withJsLocation: (newLocation: JsLocation) =>
        TsDeclClass.create(comments, declared, isAbstract, name, tparams, parent, implementsInterfaces, members, newLocation, codePath),
      withName: (newName: TsIdentSimple) =>
        TsDeclClass.create(comments, declared, isAbstract, newName, tparams, parent, implementsInterfaces, members, jsLocation, codePath),
      withComments: (cs: Comments) =>
        TsDeclClass.create(cs, declared, isAbstract, name, tparams, parent, implementsInterfaces, members, jsLocation, codePath),
      addComment: (c: Comment) =>
        TsDeclClass.create(comments.add(c), declared, isAbstract, name, tparams, parent, implementsInterfaces, members, jsLocation, codePath),
      asString: `TsDeclClass(${name.value})`
    };
  },

  /**
   * Type guard
   */
  isClass: (tree: TsTree): tree is TsDeclClass => tree._tag === 'TsDeclClass'
};

/**
 * Constructor functions and utilities for TsDeclInterface
 */
export const TsDeclInterface = {
  /**
   * Creates an interface declaration
   */
  create: (
    comments: Comments,
    declared: boolean,
    name: TsIdentSimple,
    tparams: IArray<TsTypeParam>,
    inheritance: IArray<TsTypeRef>,
    members: IArray<TsMember>,
    codePath: CodePath
  ): TsDeclInterface => {
    // Create class member cache
    const classMemberCache = HasClassMembers.create(members);

    return {
      _tag: 'TsDeclInterface',
      comments,
      declared,
      name,
      tparams,
      inheritance,
      codePath,
      ...classMemberCache,
      withCodePath: (newCodePath: CodePath) =>
        TsDeclInterface.create(comments, declared, name, tparams, inheritance, members, newCodePath),
      withName: (newName: TsIdentSimple) =>
        TsDeclInterface.create(comments, declared, newName, tparams, inheritance, members, codePath),
      withComments: (cs: Comments) =>
        TsDeclInterface.create(cs, declared, name, tparams, inheritance, members, codePath),
      addComment: (c: Comment) =>
        TsDeclInterface.create(comments.add(c), declared, name, tparams, inheritance, members, codePath),
      asString: `TsDeclInterface(${name.value})`
    };
  },

  /**
   * Type guard
   */
  isInterface: (tree: TsTree): tree is TsDeclInterface => tree._tag === 'TsDeclInterface'
};

/**
 * Constructor functions and utilities for TsDeclEnum
 */
export const TsDeclEnum = {
  /**
   * Creates an enum declaration
   */
  create: (
    comments: Comments,
    declared: boolean,
    isConst: boolean,
    name: TsIdentSimple,
    members: IArray<TsEnumMember>,
    isValue: boolean,
    exportedFrom: Option<TsTypeRef>,
    jsLocation: JsLocation,
    codePath: CodePath
  ): TsDeclEnum => {
    return {
      _tag: 'TsDeclEnum',
      comments,
      declared,
      isConst,
      name,
      members,
      isValue,
      exportedFrom,
      jsLocation,
      codePath,
      withCodePath: (newCodePath: CodePath) =>
        TsDeclEnum.create(comments, declared, isConst, name, members, isValue, exportedFrom, jsLocation, newCodePath),
      withJsLocation: (newLocation: JsLocation) =>
        TsDeclEnum.create(comments, declared, isConst, name, members, isValue, exportedFrom, newLocation, codePath),
      withName: (newName: TsIdentSimple) =>
        TsDeclEnum.create(comments, declared, isConst, newName, members, isValue, exportedFrom, jsLocation, codePath),
      withComments: (cs: Comments) =>
        TsDeclEnum.create(cs, declared, isConst, name, members, isValue, exportedFrom, jsLocation, codePath),
      addComment: (c: Comment) =>
        TsDeclEnum.create(comments.add(c), declared, isConst, name, members, isValue, exportedFrom, jsLocation, codePath),
      asString: `TsDeclEnum(${name.value})`
    };
  },

  /**
   * Type guard
   */
  isEnum: (tree: TsTree): tree is TsDeclEnum => tree._tag === 'TsDeclEnum'
};

/**
 * Constructor functions and utilities for TsDeclVar
 */
export const TsDeclVar = {
  /**
   * Creates a variable declaration
   */
  create: (
    comments: Comments,
    declared: boolean,
    readOnly: boolean,
    name: TsIdentSimple,
    tpe: Option<TsType>,
    expr: Option<TsExpr>,
    jsLocation: JsLocation,
    codePath: CodePath
  ): TsDeclVar => {
    return {
      _tag: 'TsDeclVar',
      comments,
      declared,
      readOnly,
      name,
      tpe,
      expr,
      jsLocation,
      codePath,
      withCodePath: (newCodePath: CodePath) =>
        TsDeclVar.create(comments, declared, readOnly, name, tpe, expr, jsLocation, newCodePath),
      withJsLocation: (newLocation: JsLocation) =>
        TsDeclVar.create(comments, declared, readOnly, name, tpe, expr, newLocation, codePath),
      withName: (newName: TsIdentSimple) =>
        TsDeclVar.create(comments, declared, readOnly, newName, tpe, expr, jsLocation, codePath),
      withComments: (cs: Comments) =>
        TsDeclVar.create(cs, declared, readOnly, name, tpe, expr, jsLocation, codePath),
      addComment: (c: Comment) =>
        TsDeclVar.create(comments.add(c), declared, readOnly, name, tpe, expr, jsLocation, codePath),
      asString: `TsDeclVar(${name.value})`
    };
  },

  /**
   * Type guard
   */
  isVar: (tree: TsTree): tree is TsDeclVar => tree._tag === 'TsDeclVar'
};

/**
 * Constructor functions and utilities for TsDeclFunction
 */
export const TsDeclFunction = {
  /**
   * Creates a function declaration
   */
  create: (
    comments: Comments,
    declared: boolean,
    name: TsIdentSimple,
    signature: TsFunSig,
    jsLocation: JsLocation,
    codePath: CodePath
  ): TsDeclFunction => {
    return {
      _tag: 'TsDeclFunction',
      comments,
      declared,
      name,
      signature,
      jsLocation,
      codePath,
      withCodePath: (newCodePath: CodePath) =>
        TsDeclFunction.create(comments, declared, name, signature, jsLocation, newCodePath),
      withJsLocation: (newLocation: JsLocation) =>
        TsDeclFunction.create(comments, declared, name, signature, newLocation, codePath),
      withName: (newName: TsIdentSimple) =>
        TsDeclFunction.create(comments, declared, newName, signature, jsLocation, codePath),
      withComments: (cs: Comments) =>
        TsDeclFunction.create(cs, declared, name, signature, jsLocation, codePath),
      addComment: (c: Comment) =>
        TsDeclFunction.create(comments.add(c), declared, name, signature, jsLocation, codePath),
      asString: `TsDeclFunction(${name.value})`
    };
  },

  /**
   * Type guard
   */
  isFunction: (tree: TsTree): tree is TsDeclFunction => tree._tag === 'TsDeclFunction'
};

/**
 * Constructor functions and utilities for TsDeclTypeAlias
 */
export const TsDeclTypeAlias = {
  /**
   * Creates a type alias declaration
   */
  create: (
    comments: Comments,
    declared: boolean,
    name: TsIdentSimple,
    tparams: IArray<TsTypeParam>,
    alias: TsType,
    codePath: CodePath
  ): TsDeclTypeAlias => {
    return {
      _tag: 'TsDeclTypeAlias',
      comments,
      declared,
      name,
      tparams,
      alias,
      codePath,
      withCodePath: (newCodePath: CodePath) =>
        TsDeclTypeAlias.create(comments, declared, name, tparams, alias, newCodePath),
      withName: (newName: TsIdentSimple) =>
        TsDeclTypeAlias.create(comments, declared, newName, tparams, alias, codePath),
      withComments: (cs: Comments) =>
        TsDeclTypeAlias.create(cs, declared, name, tparams, alias, codePath),
      addComment: (c: Comment) =>
        TsDeclTypeAlias.create(comments.add(c), declared, name, tparams, alias, codePath),
      asString: `TsDeclTypeAlias(${name.value})`
    };
  },

  /**
   * Type guard
   */
  isTypeAlias: (tree: TsTree): tree is TsDeclTypeAlias => tree._tag === 'TsDeclTypeAlias'
};