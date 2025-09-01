/**
 * TypeScript AST (Abstract Syntax Tree) definitions
 * Port of Scala trees.scala to TypeScript
 *
 * This file contains the complete TypeScript AST node definitions for representing
 * TypeScript code structure, including declarations, types, expressions, and more.
 */

// Type definitions that may need to be imported or defined
export type IArray<T> = T[]; // Simplified for now, could use actual IArray implementation

// Forward declarations to avoid circular dependencies
export interface TsExpr {
  readonly nodeType: string;
}

export interface Directive {
  readonly nodeType: string;
}

export interface Comment {
  readonly text: string;
}

export class Comments {
  constructor(public readonly comments: Comment[] = []) {}

  static readonly NoComments = new Comments([]);

  get isEmpty(): boolean {
    return this.comments.length === 0;
  }

  concat(other: Comments): Comments {
    return new Comments([...this.comments, ...other.comments]);
  }

  add(comment: Comment): Comments {
    return new Comments([...this.comments, comment]);
  }
}

export const NoComments = Comments.NoComments;

export interface CodePath {
  readonly segments: string[];
}

export interface JsLocation {
  readonly path: string;
}

export interface MemberCache {
  readonly members: IArray<TsContainerOrDecl>;
}

export interface HasClassMembers {
  readonly members: IArray<TsMember>;
}

/**
 * Base trait for all TypeScript AST (Abstract Syntax Tree) nodes. This represents any element in a TypeScript source
 * file - declarations, types, expressions, etc. Think of this as the foundation for modeling the entire structure of
 * TypeScript code.
 */
export abstract class TsTree {
  abstract readonly nodeType: string;

  private _hashCode?: number;

  canEqual(that: any): boolean {
    return that != null && typeof that === 'object' && 'nodeType' in that;
  }

  get hashCode(): number {
    if (this._hashCode === undefined) {
      // Simple hash based on nodeType and key properties
      this._hashCode = this.nodeType.split('').reduce((acc, char) =>
        ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
    }
    return this._hashCode;
  }

  /**
   * Provides a human-readable string representation of this tree node, useful for debugging and logging. Shows the
   * node type and name if available.
   */
  get asString(): string {
    let name = '';

    if (this instanceof TsNamedDecl) {
      name = this.name.value;
    } else if (this instanceof TsMemberProperty) {
      name = this.name.value;
    } else if (this instanceof TsMemberFunction) {
      name = this.name.value;
    }

    return `${this.constructor.name}(${name})`;
  }
}

/**
 * Represents TypeScript elements that can either be containers (like namespaces, modules) or declarations (like
 * classes, interfaces, functions). This is the union of things that can appear at the top level of a TypeScript file.
 */
export abstract class TsContainerOrDecl extends TsTree {}

/**
 * Represents TypeScript declarations - things that introduce new names into scope. Examples: class declarations,
 * interface declarations, function declarations, variable declarations. In TypeScript: `class MyClass {}`, `interface
 * MyInterface {}`, `function myFunc() {}`, etc.
 */
export abstract class TsDecl extends TsContainerOrDecl {}

/**
 * Represents TypeScript containers that can hold other declarations or containers. Examples: namespaces, modules,
 * classes, interfaces. In TypeScript: `namespace MyNamespace { ... }`, `module "my-module" { ... }`
 */
export abstract class TsContainer extends TsContainerOrDecl implements MemberCache {
  constructor(
    public readonly members: IArray<TsContainerOrDecl>,
    public readonly codePath: CodePath
  ) {
    super();
  }

  /**
   * Creates a copy of this container with new members
   */
  abstract withMembers(newMembers: IArray<TsContainerOrDecl>): TsContainer;

  abstract withCodePath(newCodePath: CodePath): TsContainer;
}

/**
 * Represents TypeScript declarations that have a name. Examples: named classes, interfaces, functions, variables, type
 * aliases. In TypeScript: `class MyClass`, `interface IMyInterface`, `function myFunction`, etc.
 */
export abstract class TsNamedDecl extends TsDecl {
  constructor(
    /** JSDoc comments and other documentation associated with this declaration */
    public readonly comments: Comments,
    /** The identifier/name of this declaration */
    public readonly name: TsIdent,
    public readonly codePath: CodePath
  ) {
    super();
  }

  abstract withComments(cs: Comments): TsNamedDecl;

  addComment(c: Comment): TsNamedDecl {
    return this.withComments(this.comments.add(c));
  }

  abstract withName(name: TsIdentSimple): TsNamedDecl;

  abstract withCodePath(newCodePath: CodePath): TsNamedDecl;
}

/**
 * Represents TypeScript declarations that introduce values (not just types) into scope. Examples: classes, enums,
 * functions, variables. In TypeScript: `class MyClass` (creates both type and value), `const myVar = 5`, `function
 * myFunc() {}` Note: interfaces and type aliases are NOT value declarations - they only exist at compile time.
 */
export abstract class TsNamedValueDecl extends TsNamedDecl {}

// Forward declarations for identifier types
export abstract class TsIdent {
  abstract readonly value: string;
}

export class TsIdentSimple extends TsIdent {
  constructor(public readonly value: string) {
    super();
  }
}

export class TsIdentModule extends TsIdent {
  constructor(
    public readonly scopeOpt: string | undefined,
    public readonly fragments: string[]
  ) {
    super();
  }

  get value(): string {
    return this.scopeOpt
      ? `@${this.scopeOpt}/${this.fragments.join('/')}`
      : this.fragments.join('/');
  }
}

// Forward declarations for member types
export abstract class TsMember extends TsTree {
  constructor(
    public readonly comments: Comments,
    public readonly level: TsProtectionLevel
  ) {
    super();
  }
}

export enum TsProtectionLevel {
  Default = 'default',
  Private = 'private',
  Protected = 'protected',
  Public = 'public'
}

export enum MethodType {
  Normal = 'normal',
  Getter = 'getter',
  Setter = 'setter'
}

export class TsMemberProperty extends TsMember {
  readonly nodeType = 'TsMemberProperty';

  constructor(
    comments: Comments,
    level: TsProtectionLevel,
    public readonly name: TsIdentSimple,
    public readonly tpe: TsType | undefined,
    public readonly expr: TsExpr | undefined,
    public readonly isStatic: boolean,
    public readonly isReadOnly: boolean
  ) {
    super(comments, level);
  }
}

export class TsMemberFunction extends TsMember {
  readonly nodeType = 'TsMemberFunction';

  constructor(
    comments: Comments,
    level: TsProtectionLevel,
    public readonly name: TsIdentSimple,
    public readonly methodType: MethodType,
    public readonly signature: TsFunSig,
    public readonly isStatic: boolean,
    public readonly isReadOnly: boolean
  ) {
    super(comments, level);
  }
}

// Forward declarations for type system
export abstract class TsType extends TsTree {}

export interface TsFunSig {
  readonly comments: Comments;
  readonly tparams: IArray<TsTypeParam>;
  readonly params: IArray<TsFunParam>;
  readonly resultType: TsType | undefined;
}

export interface TsTypeParam {
  readonly comments: Comments;
  readonly name: TsIdentSimple;
  readonly upperBound: TsType | undefined;
  readonly defaultType: TsType | undefined;
}

export interface TsFunParam {
  readonly comments: Comments;
  readonly name: TsIdentSimple;
  readonly tpe: TsType | undefined;
}

/**
 * Represents a complete TypeScript source file after parsing. This is the root node of the AST for a single .ts or
 * .d.ts file. In TypeScript: the entire content of a file like "myFile.ts"
 */
export class TsParsedFile extends TsContainer {
  readonly nodeType = 'TsParsedFile';

  constructor(
    /** JSDoc comments at the file level */
    public readonly comments: Comments,
    /** Compiler directives like /// <reference types="node" /> */
    public readonly directives: IArray<Directive>,
    /** All top-level declarations in this file (classes, interfaces, functions, etc.) */
    members: IArray<TsContainerOrDecl>,
    /** Path information for this file within the project structure */
    codePath: CodePath
  ) {
    super(members, codePath);
  }

  /**
   * Checks if this file represents TypeScript's standard library definitions. Standard library files contain built-in
   * types like Array, Object, etc.
   */
  get isStdLib(): boolean {
    return this.directives.some(directive =>
      directive.nodeType === 'NoStdLib'
    );
  }

  withMembers(newMembers: IArray<TsContainerOrDecl>): TsParsedFile {
    return new TsParsedFile(this.comments, this.directives, newMembers, this.codePath);
  }

  withCodePath(newCodePath: CodePath): TsParsedFile {
    return new TsParsedFile(this.comments, this.directives, this.members, newCodePath);
  }
}

/**
 * Base trait for TypeScript namespace and module declarations. Both namespaces and modules create named scopes that
 * can contain other declarations.
 */
export abstract class TsDeclNamespaceOrModule extends TsContainer {
  constructor(
    public readonly comments: Comments,
    public readonly name: TsIdent,
    members: IArray<TsContainerOrDecl>,
    codePath: CodePath,
    public readonly jsLocation: JsLocation
  ) {
    super(members, codePath);
  }

  abstract withComments(cs: Comments): TsDeclNamespaceOrModule;
  abstract withName(name: TsIdentSimple): TsDeclNamespaceOrModule;
  abstract withJsLocation(newLocation: JsLocation): TsDeclNamespaceOrModule;

  // Implement TsNamedDecl interface methods
  addComment(c: Comment): TsDeclNamespaceOrModule {
    return this.withComments(this.comments.add(c));
  }
}

/**
 * Base trait for module-like declarations (modules and augmented modules). These represent different ways of declaring
 * modules in TypeScript.
 */
export abstract class TsDeclModuleLike extends TsDeclNamespaceOrModule {}

/**
 * Represents a TypeScript namespace declaration. In TypeScript: `namespace MyNamespace { ... }` or `declare namespace
 * MyNamespace { ... }` Namespaces group related functionality and prevent naming conflicts.
 */
export class TsDeclNamespace extends TsDeclNamespaceOrModule {
  readonly nodeType = 'TsDeclNamespace';

  constructor(
    /** JSDoc comments for this namespace */
    comments: Comments,
    /** Whether this is a declare namespace (ambient declaration) */
    public readonly declared: boolean,
    /** The name of the namespace */
    name: TsIdentSimple,
    /** All declarations contained within this namespace */
    members: IArray<TsContainerOrDecl>,
    /** Path information for this namespace */
    codePath: CodePath,
    /** Location in the JavaScript output where this namespace will be placed */
    jsLocation: JsLocation
  ) {
    super(comments, name, members, codePath, jsLocation);
  }

  withCodePath(newCodePath: CodePath): TsDeclNamespace {
    return new TsDeclNamespace(
      this.comments, this.declared, this.name as TsIdentSimple,
      this.members, newCodePath, this.jsLocation
    );
  }

  withMembers(newMembers: IArray<TsContainerOrDecl>): TsDeclNamespace {
    return new TsDeclNamespace(
      this.comments, this.declared, this.name as TsIdentSimple,
      newMembers, this.codePath, this.jsLocation
    );
  }

  withJsLocation(newLocation: JsLocation): TsDeclNamespace {
    return new TsDeclNamespace(
      this.comments, this.declared, this.name as TsIdentSimple,
      this.members, this.codePath, newLocation
    );
  }

  withName(newName: TsIdentSimple): TsDeclNamespace {
    return new TsDeclNamespace(
      this.comments, this.declared, newName,
      this.members, this.codePath, this.jsLocation
    );
  }

  withComments(cs: Comments): TsDeclNamespace {
    return new TsDeclNamespace(
      cs, this.declared, this.name as TsIdentSimple,
      this.members, this.codePath, this.jsLocation
    );
  }
}

/**
 * Represents a TypeScript module declaration. In TypeScript: `module "my-module" { ... }` or `declare module
 * "my-module" { ... }` Modules are used to declare the shape of external modules or to augment existing ones.
 */
export class TsDeclModule extends TsDeclModuleLike {
  readonly nodeType = 'TsDeclModule';

  constructor(
    /** JSDoc comments for this module */
    comments: Comments,
    /** Whether this is a declare module (ambient declaration) */
    public readonly declared: boolean,
    /** The module name/path (e.g., "lodash", "@types/node") */
    name: TsIdentModule,
    /** All declarations contained within this module */
    members: IArray<TsContainerOrDecl>,
    /** Path information for this module */
    codePath: CodePath,
    /** Location in the JavaScript output where this module will be placed */
    jsLocation: JsLocation
  ) {
    super(comments, name, members, codePath, jsLocation);
  }

  withMembers(newMembers: IArray<TsContainerOrDecl>): TsDeclModule {
    return new TsDeclModule(
      this.comments, this.declared, this.name as TsIdentModule,
      newMembers, this.codePath, this.jsLocation
    );
  }

  withCodePath(newCodePath: CodePath): TsDeclModule {
    return new TsDeclModule(
      this.comments, this.declared, this.name as TsIdentModule,
      this.members, newCodePath, this.jsLocation
    );
  }

  withJsLocation(newLocation: JsLocation): TsDeclModule {
    return new TsDeclModule(
      this.comments, this.declared, this.name as TsIdentModule,
      this.members, this.codePath, newLocation
    );
  }

  withName(name: TsIdentSimple): TsDeclNamespace {
    return new TsDeclNamespace(
      this.comments, false, name, this.members, this.codePath, this.jsLocation
    );
  }

  withComments(cs: Comments): TsDeclModule {
    return new TsDeclModule(
      cs, this.declared, this.name as TsIdentModule,
      this.members, this.codePath, this.jsLocation
    );
  }
}

/**
 * Represents a TypeScript module augmentation. In TypeScript: `declare module "existing-module" { ... }` when adding
 * to an existing module Used to extend or modify the type definitions of existing modules.
 */
export class TsAugmentedModule extends TsDeclModuleLike {
  readonly nodeType = 'TsAugmentedModule';

  constructor(
    /** JSDoc comments for this module augmentation */
    comments: Comments,
    /** The name of the module being augmented */
    name: TsIdentModule,
    /** Additional declarations being added to the existing module */
    members: IArray<TsContainerOrDecl>,
    /** Path information for this augmentation */
    codePath: CodePath,
    /** Location in the JavaScript output where this augmentation will be placed */
    jsLocation: JsLocation
  ) {
    super(comments, name, members, codePath, jsLocation);
  }

  withMembers(newMembers: IArray<TsContainerOrDecl>): TsAugmentedModule {
    return new TsAugmentedModule(
      this.comments, this.name as TsIdentModule, newMembers, this.codePath, this.jsLocation
    );
  }

  withCodePath(newCodePath: CodePath): TsAugmentedModule {
    return new TsAugmentedModule(
      this.comments, this.name as TsIdentModule, this.members, newCodePath, this.jsLocation
    );
  }

  withJsLocation(newLocation: JsLocation): TsAugmentedModule {
    return new TsAugmentedModule(
      this.comments, this.name as TsIdentModule, this.members, this.codePath, newLocation
    );
  }

  withName(name: TsIdentSimple): TsDeclNamespace {
    return new TsDeclNamespace(
      NoComments, false, name, this.members, this.codePath, this.jsLocation
    );
  }

  withComments(cs: Comments): TsAugmentedModule {
    return new TsAugmentedModule(
      cs, this.name as TsIdentModule, this.members, this.codePath, this.jsLocation
    );
  }
}

/**
 * Represents a TypeScript global scope declaration. In TypeScript: `declare global { ... }` Used to add declarations
 * to the global scope, typically in module files.
 */
export class TsGlobal extends TsContainer {
  readonly nodeType = 'TsGlobal';

  constructor(
    /** JSDoc comments for this global declaration */
    public readonly comments: Comments,
    /** Whether this is a declare global (ambient declaration) */
    public readonly declared: boolean,
    /** All declarations being added to the global scope */
    members: IArray<TsContainerOrDecl>,
    /** Path information for this global declaration */
    codePath: CodePath
  ) {
    super(members, codePath);
  }

  withMembers(newMembers: IArray<TsContainerOrDecl>): TsGlobal {
    return new TsGlobal(this.comments, this.declared, newMembers, this.codePath);
  }

  withCodePath(newCodePath: CodePath): TsGlobal {
    return new TsGlobal(this.comments, this.declared, this.members, newCodePath);
  }
}

// Forward declaration for TsTypeRef
export interface TsTypeRef extends TsType {
  readonly comments: Comments;
  readonly name: TsQIdent;
  readonly tparams: IArray<TsType>;
}

export interface TsQIdent {
  readonly parts: IArray<TsIdent>;
}

/**
 * Represents a TypeScript class declaration. In TypeScript: `class MyClass extends BaseClass implements IInterface {
 * ... }` Classes create both a type (for type checking) and a value (the constructor function).
 */
export class TsDeclClass extends TsNamedValueDecl implements HasClassMembers {
  readonly nodeType = 'TsDeclClass';

  constructor(
    /** JSDoc comments for this class */
    comments: Comments,
    /** Whether this is a declare class (ambient declaration) */
    public readonly declared: boolean,
    /** Whether this class is abstract (cannot be instantiated directly) */
    public readonly isAbstract: boolean,
    /** The name of the class */
    name: TsIdentSimple,
    /** Generic type parameters (e.g., <T, U> in class MyClass<T, U>) */
    public readonly tparams: IArray<TsTypeParam>,
    /** The parent class this extends (single inheritance) */
    public readonly parent: TsTypeRef | undefined,
    /** The interfaces this class implements (multiple inheritance of contracts) */
    public readonly implementsInterfaces: IArray<TsTypeRef>,
    /** All members of this class (properties, methods, constructors) */
    public readonly members: IArray<TsMember>,
    /** Location in the JavaScript output where this class will be placed */
    public readonly jsLocation: JsLocation,
    /** Path information for this class */
    codePath: CodePath
  ) {
    super(comments, name, codePath);
  }

  withCodePath(newCodePath: CodePath): TsDeclClass {
    return new TsDeclClass(
      this.comments, this.declared, this.isAbstract, this.name as TsIdentSimple,
      this.tparams, this.parent, this.implementsInterfaces, this.members, this.jsLocation, newCodePath
    );
  }

  withJsLocation(newLocation: JsLocation): TsDeclClass {
    return new TsDeclClass(
      this.comments, this.declared, this.isAbstract, this.name as TsIdentSimple,
      this.tparams, this.parent, this.implementsInterfaces, this.members, newLocation, this.codePath
    );
  }

  withName(newName: TsIdentSimple): TsDeclClass {
    return new TsDeclClass(
      this.comments, this.declared, this.isAbstract, newName,
      this.tparams, this.parent, this.implementsInterfaces, this.members, this.jsLocation, this.codePath
    );
  }

  withComments(cs: Comments): TsDeclClass {
    return new TsDeclClass(
      cs, this.declared, this.isAbstract, this.name as TsIdentSimple,
      this.tparams, this.parent, this.implementsInterfaces, this.members, this.jsLocation, this.codePath
    );
  }
}

/**
 * Represents a TypeScript interface declaration. In TypeScript: `interface MyInterface extends BaseInterface { ... }`
 * Interfaces define contracts/shapes for objects and only exist at compile time.
 */
export class TsDeclInterface extends TsNamedDecl implements HasClassMembers {
  readonly nodeType = 'TsDeclInterface';

  constructor(
    /** JSDoc comments for this interface */
    comments: Comments,
    /** Whether this is a declare interface (ambient declaration) */
    public readonly declared: boolean,
    /** The name of the interface */
    name: TsIdentSimple,
    /** Generic type parameters (e.g., <T, U> in interface MyInterface<T, U>) */
    public readonly tparams: IArray<TsTypeParam>,
    /** The interfaces this interface extends (multiple inheritance) */
    public readonly inheritance: IArray<TsTypeRef>,
    /** All members of this interface (properties, methods, call signatures) */
    public readonly members: IArray<TsMember>,
    /** Path information for this interface */
    codePath: CodePath
  ) {
    super(comments, name, codePath);
  }

  withCodePath(newCodePath: CodePath): TsDeclInterface {
    return new TsDeclInterface(
      this.comments, this.declared, this.name as TsIdentSimple,
      this.tparams, this.inheritance, this.members, newCodePath
    );
  }

  withName(newName: TsIdentSimple): TsDeclInterface {
    return new TsDeclInterface(
      this.comments, this.declared, newName,
      this.tparams, this.inheritance, this.members, this.codePath
    );
  }

  withComments(cs: Comments): TsDeclInterface {
    return new TsDeclInterface(
      cs, this.declared, this.name as TsIdentSimple,
      this.tparams, this.inheritance, this.members, this.codePath
    );
  }
}

/**
 * Represents a TypeScript enum declaration. In TypeScript: `enum Color { Red, Green, Blue }` or `const enum Status {
 * Active = 1, Inactive = 0 }` Enums create both a type and a value, allowing reverse lookup by default.
 */
export class TsDeclEnum extends TsNamedValueDecl {
  readonly nodeType = 'TsDeclEnum';

  constructor(
    /** JSDoc comments for this enum */
    comments: Comments,
    /** Whether this is a declare enum (ambient declaration) */
    public readonly declared: boolean,
    /** Whether this is a const enum (inlined at compile time) */
    public readonly isConst: boolean,
    /** The name of the enum */
    name: TsIdentSimple,
    /** All members/values in this enum */
    public readonly members: IArray<TsEnumMember>,
    /** Whether this enum creates a runtime value (not just a type) */
    public readonly isValue: boolean,
    /** If this enum is re-exported from another module */
    public readonly exportedFrom: TsTypeRef | undefined,
    /** Location in the JavaScript output where this enum will be placed */
    public readonly jsLocation: JsLocation,
    /** Path information for this enum */
    codePath: CodePath
  ) {
    super(comments, name, codePath);
  }

  withCodePath(newCodePath: CodePath): TsDeclEnum {
    return new TsDeclEnum(
      this.comments, this.declared, this.isConst, this.name as TsIdentSimple,
      this.members, this.isValue, this.exportedFrom, this.jsLocation, newCodePath
    );
  }

  withJsLocation(newLocation: JsLocation): TsDeclEnum {
    return new TsDeclEnum(
      this.comments, this.declared, this.isConst, this.name as TsIdentSimple,
      this.members, this.isValue, this.exportedFrom, newLocation, this.codePath
    );
  }

  withName(newName: TsIdentSimple): TsDeclEnum {
    return new TsDeclEnum(
      this.comments, this.declared, this.isConst, newName,
      this.members, this.isValue, this.exportedFrom, this.jsLocation, this.codePath
    );
  }

  withComments(cs: Comments): TsDeclEnum {
    return new TsDeclEnum(
      cs, this.declared, this.isConst, this.name as TsIdentSimple,
      this.members, this.isValue, this.exportedFrom, this.jsLocation, this.codePath
    );
  }
}

/**
 * Represents a single member/value within a TypeScript enum. In TypeScript: `Red = 1` or `Green` (auto-assigned value)
 * within an enum declaration.
 */
export class TsEnumMember extends TsTree {
  readonly nodeType = 'TsEnumMember';

  constructor(
    /** JSDoc comments for this enum member */
    public readonly comments: Comments,
    /** The name of this enum member */
    public readonly name: TsIdentSimple,
    /** Optional explicit value assignment (e.g., = 1, = "red") */
    public readonly expr: TsExpr | undefined
  ) {
    super();
  }
}

/**
 * Represents a TypeScript variable declaration. In TypeScript: `const myVar: string = "hello"` or `let count: number`
 * or `var flag: boolean` Can be const, let, var, or declare var for ambient declarations.
 */
export class TsDeclVar extends TsNamedValueDecl {
  readonly nodeType = 'TsDeclVar';

  constructor(
    /** JSDoc comments for this variable */
    comments: Comments,
    /** Whether this is a declare var (ambient declaration) */
    public readonly declared: boolean,
    /** Whether this variable is readonly (const or readonly modifier) */
    public readonly readOnly: boolean,
    /** The name of the variable */
    name: TsIdentSimple,
    /** Optional type annotation */
    public readonly tpe: TsType | undefined,
    /** Optional initializer expression */
    public readonly expr: TsExpr | undefined,
    /** Location in the JavaScript output where this variable will be placed */
    public readonly jsLocation: JsLocation,
    /** Path information for this variable */
    codePath: CodePath
  ) {
    super(comments, name, codePath);
  }

  withCodePath(newCodePath: CodePath): TsDeclVar {
    return new TsDeclVar(
      this.comments, this.declared, this.readOnly, this.name as TsIdentSimple,
      this.tpe, this.expr, this.jsLocation, newCodePath
    );
  }

  withJsLocation(newLocation: JsLocation): TsDeclVar {
    return new TsDeclVar(
      this.comments, this.declared, this.readOnly, this.name as TsIdentSimple,
      this.tpe, this.expr, newLocation, this.codePath
    );
  }

  withName(newName: TsIdentSimple): TsDeclVar {
    return new TsDeclVar(
      this.comments, this.declared, this.readOnly, newName,
      this.tpe, this.expr, this.jsLocation, this.codePath
    );
  }

  withComments(cs: Comments): TsDeclVar {
    return new TsDeclVar(
      cs, this.declared, this.readOnly, this.name as TsIdentSimple,
      this.tpe, this.expr, this.jsLocation, this.codePath
    );
  }
}

/**
 * Represents a TypeScript function declaration. In TypeScript: `function myFunc(x: number): string { ... }` or
 * `declare function myFunc(x: number): string` Top-level function declarations create both a type and a value.
 */
export class TsDeclFunction extends TsNamedValueDecl {
  readonly nodeType = 'TsDeclFunction';

  constructor(
    /** JSDoc comments for this function */
    comments: Comments,
    /** Whether this is a declare function (ambient declaration) */
    public readonly declared: boolean,
    /** The name of the function */
    name: TsIdentSimple,
    /** The function signature (parameters, return type, type parameters) */
    public readonly signature: TsFunSig,
    /** Location in the JavaScript output where this function will be placed */
    public readonly jsLocation: JsLocation,
    /** Path information for this function */
    codePath: CodePath
  ) {
    super(comments, name, codePath);
  }

  withCodePath(newCodePath: CodePath): TsDeclFunction {
    return new TsDeclFunction(
      this.comments, this.declared, this.name as TsIdentSimple,
      this.signature, this.jsLocation, newCodePath
    );
  }

  withJsLocation(newLocation: JsLocation): TsDeclFunction {
    return new TsDeclFunction(
      this.comments, this.declared, this.name as TsIdentSimple,
      this.signature, newLocation, this.codePath
    );
  }

  withName(newName: TsIdentSimple): TsDeclFunction {
    return new TsDeclFunction(
      this.comments, this.declared, newName,
      this.signature, this.jsLocation, this.codePath
    );
  }

  withComments(cs: Comments): TsDeclFunction {
    return new TsDeclFunction(
      cs, this.declared, this.name as TsIdentSimple,
      this.signature, this.jsLocation, this.codePath
    );
  }
}

/**
 * Represents a TypeScript type alias declaration. In TypeScript: `type MyType = string | number` or `type
 * GenericType<T> = T[]` Type aliases create new names for existing types and only exist at compile time.
 */
export class TsDeclTypeAlias extends TsNamedDecl {
  readonly nodeType = 'TsDeclTypeAlias';

  constructor(
    /** JSDoc comments for this type alias */
    comments: Comments,
    /** Whether this is a declare type (ambient declaration) */
    public readonly declared: boolean,
    /** The name of the type alias */
    name: TsIdentSimple,
    /** Generic type parameters (e.g., <T, U> in type MyType<T, U>) */
    public readonly tparams: IArray<TsTypeParam>,
    /** The actual type this alias refers to */
    public readonly alias: TsType,
    /** Path information for this type alias */
    codePath: CodePath
  ) {
    super(comments, name, codePath);
  }

  withCodePath(newCodePath: CodePath): TsDeclTypeAlias {
    return new TsDeclTypeAlias(
      this.comments, this.declared, this.name as TsIdentSimple,
      this.tparams, this.alias, newCodePath
    );
  }

  withName(newName: TsIdentSimple): TsDeclTypeAlias {
    return new TsDeclTypeAlias(
      this.comments, this.declared, newName,
      this.tparams, this.alias, this.codePath
    );
  }

  withComments(cs: Comments): TsDeclTypeAlias {
    return new TsDeclTypeAlias(
      cs, this.declared, this.name as TsIdentSimple,
      this.tparams, this.alias, this.codePath
    );
  }
}

/* Function signatures and parameters */

/**
 * Represents a TypeScript function signature. In TypeScript: `<T>(param1: string, param2: number): boolean` (the
 * signature part of a function) Used in function declarations, method declarations, and function types.
 */
export class TsFunSigImpl implements TsFunSig {
  constructor(
    /** JSDoc comments for this function signature */
    public readonly comments: Comments,
    /** Generic type parameters (e.g., <T, U>) */
    public readonly tparams: IArray<TsTypeParam>,
    /** Function parameters with their types */
    public readonly params: IArray<TsFunParam>,
    /** Return type of the function (undefined means void or inferred) */
    public readonly resultType: TsType | undefined
  ) {}
}

/**
 * Represents a single parameter in a TypeScript function. In TypeScript: `param: string` or `optionalParam?: number`
 * or `...rest: string[]`
 */
export class TsFunParamImpl implements TsFunParam {
  private _hashCode?: number;

  constructor(
    /** JSDoc comments for this parameter */
    public readonly comments: Comments,
    /** The name of the parameter */
    public readonly name: TsIdentSimple,
    /** The type of the parameter (undefined means inferred or any) */
    public readonly tpe: TsType | undefined
  ) {}

  // Parameters are considered equal if they have the same type (name doesn't matter for type checking)
  equals(obj: any): boolean {
    if (obj instanceof TsFunParamImpl) {
      return this.tpe === obj.tpe;
    }
    return false;
  }

  get hashCode(): number {
    if (this._hashCode === undefined) {
      this._hashCode = this.tpe ? this.tpe.hashCode : 0;
    }
    return this._hashCode;
  }
}

/**
 * Represents a TypeScript generic type parameter. In TypeScript: `T`, `T extends string`, `T = string`, or `T extends
 * keyof U = never` Used in generic classes, interfaces, functions, and type aliases.
 */
export class TsTypeParamImpl implements TsTypeParam {
  constructor(
    /** JSDoc comments for this type parameter */
    public readonly comments: Comments,
    /** The name of the type parameter (e.g., T, U, K) */
    public readonly name: TsIdentSimple,
    /** Optional constraint (e.g., T extends string) */
    public readonly upperBound: TsType | undefined,
    /** Optional default type (e.g., T = string) */
    public readonly defaultType: TsType | undefined
  ) {}
}

export namespace TsTypeParam {
  /**
   * Converts type parameters to type arguments for instantiation. Transforms `<T, U>` into `T, U` for use in type
   * references.
   */
  export function asTypeArgs(tps: IArray<TsTypeParam>): IArray<TsTypeRef> {
    return tps.map(tp => new TsTypeRefImpl(
      NoComments,
      new TsQIdentImpl([tp.name]),
      []
    ));
  }
}

/**
 * Base class for TypeScript literal values. In TypeScript: `42`, `"hello"`, `true`, `false` Represents compile-time
 * constant values.
 */
export abstract class TsLiteral extends TsTree {
  constructor(public readonly literal: string) {
    super();
  }
}

export namespace TsLiteral {
  /** Numeric literal: `42`, `3.14`, `0xFF` */
  export class Num extends TsLiteral {
    readonly nodeType = 'TsLiteralNum';

    constructor(public readonly value: string) {
      super(value);
    }
  }

  /** String literal: `"hello"`, `'world'`, `` `template` `` */
  export class Str extends TsLiteral {
    readonly nodeType = 'TsLiteralStr';

    constructor(public readonly value: string) {
      super(value);
    }
  }

  /** Boolean literal: `true`, `false` */
  export class Bool extends TsLiteral {
    readonly nodeType = 'TsLiteralBool';

    constructor(public readonly value: boolean) {
      super(value.toString());
    }
  }
}

/**
 * Represents an identifier that comes from an import. In TypeScript: when you `import { something } from "module"`,
 * `something` becomes a TsIdentImport Links the identifier back to its source module.
 */
export class TsIdentImport extends TsIdent {
  constructor(public readonly from: TsIdentModule) {
    super();
  }

  get value(): string {
    return this.from.value;
  }
}

/**
 * Represents a TypeScript library/package identifier. In TypeScript: `"lodash"`, `"@types/node"`, `"react"` Used to
 * identify npm packages and their type definitions.
 */
export abstract class TsIdentLibrary extends TsIdent {
  /**
   * Internal representation used for file naming and disambiguation. Converts scoped packages like "@scope/name" to
   * "scope__name"
   */
  get __value(): string {
    if (this instanceof TsIdentLibraryScoped) {
      return `${this.scope}__${this.name}`;
    } else if (this instanceof TsIdentLibrarySimple) {
      return this.value;
    }
    return this.value;
  }
}

export namespace TsIdentLibrary {
  /** Regex for scoped packages: @scope/name */
  const Scoped = /@([^/]+)\/(.+)/;

  /** Regex for internal scoped representation: scope__name */
  const Scoped__ = /(.+)__(.+)/;

  /**
   * Parses a string into a library identifier. Handles both simple names and scoped packages.
   */
  export function apply(str: string): TsIdentLibrary {
    const scopedMatch = str.match(Scoped);
    if (scopedMatch && scopedMatch[1] && scopedMatch[2]) {
      const [, scope, name] = scopedMatch;
      if (scope === 'types') {
        return apply(name); // @types/babel__core exists
      }
      return new TsIdentLibraryScoped(scope, name);
    }

    const scopedInternalMatch = str.match(Scoped__);
    if (scopedInternalMatch && scopedInternalMatch[1] && scopedInternalMatch[2]) {
      const [, scope, name] = scopedInternalMatch;
      if (scope === 'types') {
        return apply(name);
      }
      return new TsIdentLibraryScoped(scope, name);
    }

    return new TsIdentLibrarySimple(str);
  }
}

/**
 * Represents a simple (non-scoped) library identifier. In TypeScript: `"lodash"`, `"react"`, `"express"`
 */
export class TsIdentLibrarySimple extends TsIdentLibrary {
  constructor(public readonly value: string) {
    super();
  }
}

/**
 * Represents a scoped library identifier. In TypeScript: `"@types/node"`, `"@angular/core"`, `"@babel/parser"`
 */
export class TsIdentLibraryScoped extends TsIdentLibrary {
  constructor(
    public readonly scope: string,
    public readonly name: string
  ) {
    super();
  }

  get value(): string {
    return `@${this.scope}/${this.name}`;
  }
}

export namespace TsIdent {
  /**
   * Creates a simple identifier from a string
   */
  export function apply(str: string): TsIdentSimple {
    return new TsIdentSimple(str);
  }

  /**
   * Extracts the string value from any identifier
   */
  export function unapply(ident: TsIdent): string {
    return ident.value;
  }

  // Special identifiers used in TypeScript
  /** The `this` keyword identifier */
  export const this_: TsIdentSimple = new TsIdentSimple('this');

  /** Special identifier for function application/call syntax */
  export const Apply: TsIdentSimple = new TsIdentSimple('<apply>');

  /** Special identifier for global scope declarations */
  export const Global: TsIdentSimple = new TsIdentSimple('<global>');

  /** Special identifier for destructured parameters without explicit names */
  export const Destructured: TsIdentSimple = new TsIdentSimple('<destructured>');

  // Common TypeScript/JavaScript identifiers
  /** The `update` method identifier (common in immutable libraries) */
  export const update: TsIdentSimple = new TsIdentSimple('update');

  /** The `prototype` property identifier */
  export const prototype_: TsIdentSimple = new TsIdentSimple('prototype');

  /** The `constructor` property identifier */
  export const constructor_: TsIdentSimple = new TsIdentSimple('constructor');

  /** The `default` export identifier */
  export const default_: TsIdentSimple = new TsIdentSimple('default');

  /** Special identifier for namespaced declarations */
  export const namespaced: TsIdentSimple = new TsIdentSimple('^');

  /** Special identifier for namespaced class declarations */
  export const namespacedCls: TsIdentSimple = new TsIdentSimple('Class');

  /** The `Symbol` global identifier */
  export const Symbol: TsIdentSimple = new TsIdentSimple('Symbol');

  /** Dummy identifier for placeholder purposes */
  export const dummy: TsIdentSimple = new TsIdentSimple('dummy');

  // Special library identifiers
  /** Placeholder library identifier for testing/dummy purposes */
  export const dummyLibrary: TsIdentLibrary = new TsIdentLibrarySimple('dummyLibrary');

  /** TypeScript standard library identifier */
  export const std: TsIdentLibrary = new TsIdentLibrarySimple('std');

  /** Node.js type definitions library identifier */
  export const node: TsIdentLibrary = new TsIdentLibrarySimple('node');
}

/**
 * Represents a qualified TypeScript identifier (dotted name). In TypeScript: `MyNamespace.MyClass`, `React.Component`,
 * `std.Array` Used for accessing nested declarations and namespaced types.
 */
export class TsQIdentImpl implements TsQIdent {
  constructor(public readonly parts: IArray<TsIdent>) {}

  /**
   * Appends a single identifier to create a longer qualified name
   */
  add(tsIdent: TsIdent): TsQIdentImpl {
    return new TsQIdentImpl([...this.parts, tsIdent]);
  }

  /**
   * Appends multiple identifiers to create a longer qualified name
   */
  addAll(tsIdents: IArray<TsIdent>): TsQIdentImpl {
    return new TsQIdentImpl([...this.parts, ...tsIdents]);
  }
}

export namespace TsQIdent {
  /**
   * Creates a qualified identifier from string parts
   */
  export function of(...ss: string[]): TsQIdentImpl {
    return new TsQIdentImpl(ss.map(s => new TsIdentSimple(s)));
  }

  /**
   * Creates a qualified identifier from a single identifier
   */
  export function ofIdent(tsIdent: TsIdent): TsQIdentImpl {
    return new TsQIdentImpl([tsIdent]);
  }

  /**
   * Empty qualified identifier
   */
  export const empty: TsQIdentImpl = new TsQIdentImpl([]);

  // TypeScript primitive types (lowercase)
  /** The `any` type - accepts any value */
  export const any: TsQIdentImpl = TsQIdent.of('any');

  /** The `bigint` type - for large integers */
  export const bigint: TsQIdentImpl = TsQIdent.of('bigint');

  /** The `number` type - for numeric values */
  export const number: TsQIdentImpl = TsQIdent.of('number');

  /** The `boolean` type - for true/false values */
  export const boolean: TsQIdentImpl = TsQIdent.of('boolean');

  /** The `never` type - represents values that never occur */
  export const never: TsQIdentImpl = TsQIdent.of('never');

  /** The `null` type - represents null values */
  export const null_: TsQIdentImpl = TsQIdent.of('null');

  /** The `object` type - for non-primitive values */
  export const object: TsQIdentImpl = TsQIdent.of('object');

  /** The `string` type - for text values */
  export const string: TsQIdentImpl = TsQIdent.of('string');

  /** The `symbol` type - for unique identifiers */
  export const symbol: TsQIdentImpl = TsQIdent.of('symbol');

  /** The `undefined` type - represents undefined values */
  export const undefined_: TsQIdentImpl = TsQIdent.of('undefined');

  /** The `unknown` type - type-safe alternative to any */
  export const unknown: TsQIdentImpl = TsQIdent.of('unknown');

  /** The `void` type - represents absence of value */
  export const void_: TsQIdentImpl = TsQIdent.of('void');

  /** Set of all primitive type identifiers */
  export const Primitive = new Set([
    any, bigint, number, boolean, never, null_, object, string, symbol, undefined_, unknown, void_
  ]);

  // TypeScript built-in object types (capitalized)
  /** The `Array` constructor type */
  export const Array: TsQIdentImpl = TsQIdent.of('Array');

  /** The `BigInt` constructor type */
  export const BigInt: TsQIdentImpl = TsQIdent.of('BigInt');

  /** The `ReadonlyArray` utility type */
  export const ReadonlyArray: TsQIdentImpl = TsQIdent.of('ReadonlyArray');

  /** The `Boolean` constructor type */
  export const Boolean: TsQIdentImpl = TsQIdent.of('Boolean');

  /** The `Function` constructor type */
  export const Function: TsQIdentImpl = TsQIdent.of('Function');

  /** The `Object` constructor type */
  export const Object: TsQIdentImpl = TsQIdent.of('Object');

  /** The `String` constructor type */
  export const String: TsQIdentImpl = TsQIdent.of('String');

  /** Standard library types (prefixed with std namespace) */
  export namespace Std {
    export const Array = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('Array')]);
    export const BigInt = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('BigInt')]);
    export const Boolean = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('Boolean')]);
    export const ConcatArray = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('ConcatArray')]);
    export const Function = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('Function')]);
    export const Object = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('Object')]);
    export const Promise = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('Promise')]);
    export const PromiseLike = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('PromiseLike')]);
    export const Readonly = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('Readonly')]);
    export const ReadonlyArray = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('ReadonlyArray')]);
    export const Record = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('Record')]);
    export const String = new TsQIdentImpl([TsIdent.std, new TsIdentSimple('String')]);
  }
}

/* TypeScript type system representations */

export namespace TsType {
  /**
   * Checks if the given members represent a mapped type. Mapped types have exactly one TsMemberTypeMapped member.
   */
  export function isTypeMapping(members: IArray<TsMember>): boolean {
    return members.length === 1 && members[0] instanceof TsMemberTypeMapped;
  }
}

/**
 * Represents a TypeScript type reference. In TypeScript: `MyClass`, `Array<string>`, `Promise<number>`,
 * `React.Component<Props>` References to named types, possibly with generic type arguments.
 */
export class TsTypeRefImpl extends TsType implements TsTypeRef {
  readonly nodeType = 'TsTypeRef';

  constructor(
    /** JSDoc comments for this type reference */
    public readonly comments: Comments,
    /** The qualified name being referenced */
    public readonly name: TsQIdent,
    /** Generic type arguments (e.g., <string, number>) */
    public readonly tparams: IArray<TsType>
  ) {
    super();
  }
}

export namespace TsTypeRef {
  /**
   * Creates a type reference from a simple identifier
   */
  export function apply(tsIdent: TsIdent): TsTypeRefImpl {
    return applyQIdent(TsQIdent.ofIdent(tsIdent));
  }

  /**
   * Creates a type reference from a qualified identifier
   */
  export function applyQIdent(tsQIdent: TsQIdent): TsTypeRefImpl {
    return new TsTypeRefImpl(NoComments, tsQIdent, []);
  }

  // Common TypeScript type references
  export const any = new TsTypeRefImpl(NoComments, TsQIdent.any, []);
  export const boolean = new TsTypeRefImpl(NoComments, TsQIdent.boolean, []);
  export const Boolean = new TsTypeRefImpl(NoComments, TsQIdent.Boolean, []);
  export const Symbol = new TsTypeRefImpl(NoComments, TsQIdent.symbol, []);
  export const object = new TsTypeRefImpl(NoComments, TsQIdent.object, []);
  export const Object = new TsTypeRefImpl(NoComments, TsQIdent.Object, []);
  export const string = new TsTypeRefImpl(NoComments, TsQIdent.string, []);
  export const String = new TsTypeRefImpl(NoComments, TsQIdent.String, []);
  export const never = new TsTypeRefImpl(NoComments, TsQIdent.never, []);
  export const number = new TsTypeRefImpl(NoComments, TsQIdent.number, []);
  export const null_ = new TsTypeRefImpl(NoComments, TsQIdent.null_, []);
  export const void_ = new TsTypeRefImpl(NoComments, TsQIdent.void_, []);
  export const undefined_ = new TsTypeRefImpl(NoComments, TsQIdent.undefined_, []);
}

/**
 * Represents a TypeScript literal type. In TypeScript: `42`, `"hello"`, `true`, `false` Types that represent specific
 * literal values.
 */
export class TsTypeLiteral extends TsType {
  readonly nodeType = 'TsTypeLiteral';

  constructor(public readonly literal: TsLiteral) {
    super();
  }
}

/**
 * Represents a TypeScript object type. In TypeScript: `{ prop: string; method(): void }`, `{ [key: string]: any }`
 * Anonymous object types with properties, methods, and index signatures.
 */
export class TsTypeObject extends TsType implements HasClassMembers {
  readonly nodeType = 'TsTypeObject';

  constructor(
    /** JSDoc comments for this object type */
    public readonly comments: Comments,
    /** Properties, methods, and signatures of this object type */
    public readonly members: IArray<TsMember>
  ) {
    super();
  }
}

/**
 * Represents a TypeScript function type. In TypeScript: `(x: number, y: string) => boolean`, `<T>(arg: T) => T`
 * Function types with parameters and return types.
 */
export class TsTypeFunction extends TsType {
  readonly nodeType = 'TsTypeFunction';

  constructor(public readonly signature: TsFunSig) {
    super();
  }
}

/**
 * Represents a TypeScript constructor type. In TypeScript: `new (x: number) => MyClass`, `abstract new () =>
 * AbstractClass` Types for constructor functions.
 */
export class TsTypeConstructor extends TsType {
  readonly nodeType = 'TsTypeConstructor';

  constructor(
    /** Whether this is an abstract constructor */
    public readonly isAbstract: boolean,
    /** The constructor function signature */
    public readonly signature: TsTypeFunction
  ) {
    super();
  }
}

/**
 * Represents a TypeScript type predicate with 'is'. In TypeScript: `x is string`, `value is MyType` Used in type guard
 * functions to narrow types.
 */
export class TsTypeIs extends TsType {
  readonly nodeType = 'TsTypeIs';

  constructor(
    /** The parameter being checked */
    public readonly ident: TsIdent,
    /** The type being asserted */
    public readonly tpe: TsType
  ) {
    super();
  }
}

/**
 * Represents a TypeScript assertion signature. In TypeScript: `asserts x`, `asserts x is string` Used in assertion
 * functions that throw if condition is false.
 */
export class TsTypeAsserts extends TsType {
  readonly nodeType = 'TsTypeAsserts';

  constructor(
    /** The parameter being asserted */
    public readonly ident: TsIdentSimple,
    /** Optional type being asserted */
    public readonly isOpt: TsType | undefined
  ) {
    super();
  }
}

/**
 * Represents a single element in a TypeScript tuple type. In TypeScript: `string` in `[string, number]` or `name:
 * string` in `[name: string, age: number]` Tuple elements can optionally have labels for better documentation.
 */
export class TsTupleElement {
  constructor(
    /** Optional label for this tuple element */
    public readonly label: TsIdent | undefined,
    /** The type of this tuple element */
    public readonly tpe: TsType
  ) {}

  static unlabeled(tpe: TsType): TsTupleElement {
    return new TsTupleElement(undefined, tpe);
  }
}

/**
 * Represents a TypeScript tuple type. In TypeScript: `[string, number]`, `[name: string, age: number]`, `[string,
 * ...number[]]` Fixed-length arrays with specific types for each position.
 */
export class TsTypeTuple extends TsType {
  readonly nodeType = 'TsTypeTuple';

  constructor(public readonly elems: IArray<TsTupleElement>) {
    super();
  }
}

/**
 * Represents a TypeScript typeof query. In TypeScript: `typeof myVariable`, `typeof MyClass.prototype` Gets the type
 * of a value expression.
 */
export class TsTypeQuery extends TsType {
  readonly nodeType = 'TsTypeQuery';

  constructor(public readonly expr: TsQIdent) {
    super();
  }
}

/**
 * Represents a TypeScript rest/spread type. In TypeScript: `...string[]` in tuple types or function parameters
 * Represents variable-length sequences of a type.
 */
export class TsTypeRepeated extends TsType {
  readonly nodeType = 'TsTypeRepeated';

  constructor(public readonly underlying: TsType) {
    super();
  }
}

/**
 * Represents a TypeScript keyof operator. In TypeScript: `keyof MyInterface`, `keyof typeof myObject` Gets the union
 * of all property names of a type.
 */
export class TsTypeKeyOf extends TsType {
  readonly nodeType = 'TsTypeKeyOf';

  constructor(public readonly key: TsType) {
    super();
  }
}

/**
 * Represents a TypeScript indexed access type. In TypeScript: `MyType[K]`, `MyArray[number]`, `MyObject["property"]`
 * Accesses the type of a property by key.
 */
export class TsTypeLookup extends TsType {
  readonly nodeType = 'TsTypeLookup';

  constructor(
    /** The type being indexed */
    public readonly from: TsType,
    /** The key/index type */
    public readonly key: TsType
  ) {
    super();
  }
}

/**
 * Represents the TypeScript 'this' type. In TypeScript: `this` in method return types or parameter types Refers to the
 * type of the current instance.
 */
export class TsTypeThis extends TsType {
  readonly nodeType = 'TsTypeThis';
}

/**
 * Represents a TypeScript intersection type. In TypeScript: `A & B & C` Creates a type that has all properties of all
 * intersected types.
 */
export class TsTypeIntersect extends TsType {
  readonly nodeType = 'TsTypeIntersect';

  constructor(public readonly types: IArray<TsType>) {
    super();
  }
}

export namespace TsTypeIntersect {
  /**
   * Flattens nested intersection types into a single level
   */
  function flatten(types: IArray<TsType>): IArray<TsType> {
    const result: TsType[] = [];
    for (const type of types) {
      if (type instanceof TsTypeIntersect) {
        result.push(...flatten(type.types));
      } else {
        result.push(type);
      }
    }
    return result;
  }

  /**
   * Creates a simplified intersection type, combining object types where possible. Merges multiple object types into a
   * single object type for better readability.
   */
  export function simplified(types: IArray<TsType>): TsType {
    const objectTypes: TsTypeObject[] = [];
    const otherTypes: TsType[] = [];

    for (const type of types) {
      if (type instanceof TsTypeObject && !TsType.isTypeMapping(type.members)) {
        objectTypes.push(type);
      } else {
        otherTypes.push(type);
      }
    }

    let withCombinedObjects: TsType[];
    if (objectTypes.length === 0) {
      withCombinedObjects = otherTypes;
    } else if (objectTypes.length === 1) {
      withCombinedObjects = [...types]; // keep order
    } else {
      const combinedMembers = objectTypes.flatMap(obj => obj.members);
      const uniqueMembers = combinedMembers.filter((member, index, arr) =>
        arr.findIndex(m => m === member) === index
      );
      const combinedObject = new TsTypeObject(NoComments, uniqueMembers);
      withCombinedObjects = [combinedObject, ...otherTypes];
    }

    const flattened = flatten(withCombinedObjects);
    const unique = flattened.filter((type, index, arr) =>
      arr.findIndex(t => t === type) === index
    );

    if (unique.length === 0) {
      return TsTypeRef.never;
    } else if (unique.length === 1) {
      return unique[0]!; // Safe because we checked length === 1
    } else {
      return new TsTypeIntersect(unique);
    }
  }
}

/**
 * Represents a TypeScript union type. In TypeScript: `string | number | boolean` Creates a type that can be any one of
 * the specified types.
 */
export class TsTypeUnion extends TsType {
  readonly nodeType = 'TsTypeUnion';

  constructor(public readonly types: IArray<TsType>) {
    super();
  }
}

export namespace TsTypeUnion {
  /**
   * Flattens nested union types into a single level
   */
  function flatten(types: IArray<TsType>): IArray<TsType> {
    const result: TsType[] = [];
    for (const type of types) {
      if (type instanceof TsTypeUnion) {
        result.push(...flatten(type.types));
      } else {
        result.push(type);
      }
    }
    return result;
  }

  /**
   * Creates a simplified union type, removing duplicates and flattening nested unions. Returns never for empty unions,
   * single type for one-element unions.
   */
  export function simplified(types: IArray<TsType>): TsType {
    const flattened = flatten(types);
    const unique = flattened.filter((type, index, arr) =>
      arr.findIndex(t => t === type) === index
    );

    if (unique.length === 0) {
      return TsTypeRef.never;
    } else if (unique.length === 1) {
      return unique[0]!; // Safe because we checked length === 1
    } else {
      return new TsTypeUnion(unique);
    }
  }
}

/**
 * Base trait for TypeScript type predicates and conditional logic. Used in advanced type-level programming with
 * conditional types.
 */
export abstract class TsTypePredicate extends TsType {}

/**
 * Represents a TypeScript conditional type. In TypeScript: `T extends string ? string[] : never` Type-level
 * if-then-else logic based on type relationships.
 */
export class TsTypeConditional extends TsTypePredicate {
  readonly nodeType = 'TsTypeConditional';

  constructor(
    /** The condition to test */
    public readonly pred: TsType,
    /** Type to use if condition is true */
    public readonly ifTrue: TsType,
    /** Type to use if condition is false */
    public readonly ifFalse: TsType
  ) {
    super();
  }
}

/**
 * Represents a TypeScript extends clause in conditional types. In TypeScript: `T extends (...args: any[]) => infer R ?
 * R : any` Tests if one type extends/is assignable to another.
 */
export class TsTypeExtends extends TsTypePredicate {
  readonly nodeType = 'TsTypeExtends';

  constructor(
    /** The type being tested */
    public readonly tpe: TsType,
    /** The type it should extend */
    public readonly extends_: TsType
  ) {
    super();
  }
}

/**
 * Represents a TypeScript infer keyword in conditional types. In TypeScript: `infer R` in `T extends (...args: any[])
 * => infer R ? R : any` Captures and names a type for use in the conditional type's branches.
 */
export class TsTypeInfer extends TsTypePredicate {
  readonly nodeType = 'TsTypeInfer';

  constructor(public readonly tparam: TsTypeParam) {
    super();
  }
}

/* TypeScript class and interface members */

/**
 * Represents a TypeScript call signature. In TypeScript: `(x: number): string` inside an interface or object type
 * Allows objects to be called like functions.
 */
export class TsMemberCall extends TsMember {
  readonly nodeType = 'TsMemberCall';

  constructor(
    /** JSDoc comments for this call signature */
    comments: Comments,
    /** Visibility level of this call signature */
    level: TsProtectionLevel,
    /** The function signature for the call */
    public readonly signature: TsFunSig
  ) {
    super(comments, level);
  }
}

/**
 * Represents a TypeScript constructor signature. In TypeScript: `new (x: number): MyClass` inside an interface Allows
 * objects to be used as constructors.
 */
export class TsMemberCtor extends TsMember {
  readonly nodeType = 'TsMemberCtor';

  constructor(
    /** JSDoc comments for this constructor signature */
    comments: Comments,
    /** Visibility level of this constructor signature */
    level: TsProtectionLevel,
    /** The function signature for the constructor */
    public readonly signature: TsFunSig
  ) {
    super(comments, level);
  }
}

/**
 * Represents different types of indexing in TypeScript. Used for index signatures and computed property access.
 */
export abstract class Indexing extends TsTree {}

export namespace Indexing {
  /** Dictionary-style indexing: `[key: string]: ValueType` */
  export class Dict extends Indexing {
    readonly nodeType = 'IndexingDict';

    constructor(
      public readonly name: TsIdent,
      public readonly tpe: TsType
    ) {
      super();
    }
  }

  /** Single property indexing: `[K in keyof T]` */
  export class Single extends Indexing {
    readonly nodeType = 'IndexingSingle';

    constructor(public readonly name: TsQIdent) {
      super();
    }
  }
}

/**
 * Represents a TypeScript index signature. In TypeScript: `[key: string]: any` or `[index: number]: string` Allows
 * objects to have properties with computed names.
 */
export class TsMemberIndex extends TsMember {
  readonly nodeType = 'TsMemberIndex';

  constructor(
    /** JSDoc comments for this index signature */
    comments: Comments,
    /** Whether the indexed values are readonly */
    public readonly isReadOnly: boolean,
    /** Visibility level of this index signature */
    level: TsProtectionLevel,
    /** The indexing pattern (key type and name) */
    public readonly indexing: Indexing,
    /** The type of values stored at indexed locations */
    public readonly valueType: TsType | undefined
  ) {
    super(comments, level);
  }
}

// Modifier enums for mapped types
export enum ReadonlyModifier {
  None = 'none',
  Readonly = 'readonly',
  Plus = '+readonly',
  Minus = '-readonly'
}

export enum OptionalModifier {
  None = 'none',
  Optional = '?',
  Plus = '+?',
  Minus = '-?'
}

/**
 * Represents a TypeScript mapped type member. In TypeScript: `{ [K in keyof T]: T[K] }` or `{ readonly [K in keyof
 * T]?: T[K] }` Used for transforming types by mapping over their properties.
 */
export class TsMemberTypeMapped extends TsMember {
  readonly nodeType = 'TsMemberTypeMapped';

  constructor(
    /** JSDoc comments for this mapped type */
    comments: Comments,
    /** Visibility level of this mapped type */
    level: TsProtectionLevel,
    /** Readonly modifier (readonly, +readonly, -readonly, or none) */
    public readonly readonly: ReadonlyModifier,
    /** The key variable name (e.g., K in `[K in keyof T]`) */
    public readonly key: TsIdent,
    /** The type being mapped over (e.g., `keyof T`) */
    public readonly from: TsType,
    /** Optional key remapping (e.g., `as \`prefix_\${K}\``) */
    public readonly as: TsType | undefined,
    /** Optional modifier (+?, -?, ?, or none) */
    public readonly optionalize: OptionalModifier,
    /** The resulting type for each mapped property */
    public readonly to: TsType
  ) {
    super(comments, level);
  }
}

/* TypeScript import and export declarations */

/**
 * Represents what is being imported in a TypeScript import statement. Covers the different syntaxes for importing from
 * modules.
 */
export abstract class TsImported extends TsTree {}

export namespace TsImported {
  /**
   * Default import or single named import. In TypeScript: `import React from "react"` or `import { useState } from
   * "react"`
   */
  export class Ident extends TsImported {
    readonly nodeType = 'TsImportedIdent';

    constructor(public readonly ident: TsIdentSimple) {
      super();
    }
  }

  /**
   * Destructured/named imports with optional aliasing. In TypeScript: `import { useState as state, useEffect } from
   * "react"` The tuple represents (originalName, optionalAlias)
   */
  export class Destructured extends TsImported {
    readonly nodeType = 'TsImportedDestructured';

    constructor(
      public readonly idents: IArray<[TsIdent, TsIdentSimple | undefined]>
    ) {
      super();
    }
  }

  /**
   * Star/namespace import. In TypeScript: `import * as React from "react"` or `import * from "module"`
   */
  export class Star extends TsImported {
    readonly nodeType = 'TsImportedStar';

    constructor(public readonly asOpt: TsIdentSimple | undefined) {
      super();
    }
  }
}

/**
 * Represents the source of a TypeScript import. Specifies where the import is coming from.
 */
export abstract class TsImportee extends TsTree {}

export namespace TsImportee {
  /**
   * CommonJS-style require import. In TypeScript: `import foo = require("module")`
   */
  export class Required extends TsImportee {
    readonly nodeType = 'TsImporteeRequired';

    constructor(public readonly from: TsIdentModule) {
      super();
    }
  }

  /**
   * ES6-style module import. In TypeScript: `import { foo } from "module"`
   */
  export class From extends TsImportee {
    readonly nodeType = 'TsImporteeFrom';

    constructor(public readonly from: TsIdentModule) {
      super();
    }
  }

  /**
   * Local/relative import. In TypeScript: `import { foo } from "./local-module"`
   */
  export class Local extends TsImportee {
    readonly nodeType = 'TsImporteeLocal';

    constructor(public readonly qident: TsQIdent) {
      super();
    }
  }
}

/**
 * Represents a complete TypeScript import declaration. In TypeScript: `import { useState } from "react"` or `import
 * type { Props } from "./types"`
 */
export class TsImport extends TsDecl {
  readonly nodeType = 'TsImport';

  constructor(
    /** Whether this is a type-only import */
    public readonly typeOnly: boolean,
    /** What is being imported */
    public readonly imported: IArray<TsImported>,
    /** Where it's being imported from */
    public readonly from: TsImportee
  ) {
    super();
  }
}

/* TypeScript export declarations */

/**
 * Represents what is being exported in a TypeScript export statement. Covers the different syntaxes for exporting from
 * modules.
 */
export abstract class TsExportee extends TsTree {}

export namespace TsExportee {
  /**
   * Named exports with optional aliasing. In TypeScript: `export { foo, bar as baz }` or `export { foo } from
   * "module"` The tuple represents (originalName, optionalAlias)
   */
  export class Names extends TsExportee {
    readonly nodeType = 'TsExporteeNames';

    constructor(
      public readonly idents: IArray<[TsQIdent, TsIdentSimple | undefined]>,
      public readonly fromOpt: TsIdentModule | undefined
    ) {
      super();
    }
  }

  /**
   * Direct export of a declaration. In TypeScript: `export class MyClass {}` or `export function myFunc() {}`
   */
  export class Tree extends TsExportee {
    readonly nodeType = 'TsExporteeTree';

    constructor(public readonly decl: TsDecl) {
      super();
    }
  }

  /**
   * Star/namespace export. In TypeScript: `export * from "module"` or `export * as name from "module"`
   */
  export class Star extends TsExportee {
    readonly nodeType = 'TsExporteeStar';

    constructor(
      public readonly asOpt: TsIdentSimple | undefined,
      public readonly fromOpt: TsIdentModule | undefined
    ) {
      super();
    }
  }
}

/**
 * Represents a complete TypeScript export declaration. In TypeScript: `export { foo }` or `export default MyClass`
 */
export class TsExport extends TsDecl {
  readonly nodeType = 'TsExport';

  constructor(
    /** JSDoc comments for this export */
    public readonly comments: Comments,
    /** Whether this is a declare export (ambient declaration) */
    public readonly declared: boolean,
    /** Whether this is a type-only export */
    public readonly typeOnly: boolean,
    /** What is being exported */
    public readonly exportee: TsExportee
  ) {
    super();
  }
}

/**
 * Represents an export assignment. In TypeScript: `export = value` (CommonJS-style export)
 */
export class TsExportAsNamespace extends TsDecl {
  readonly nodeType = 'TsExportAsNamespace';

  constructor(public readonly ident: TsIdent) {
    super();
  }
}

// Utility functions and constants

/**
 * Creates a module identifier from a library identifier
 */
export namespace TsIdentModule {
  export function fromLibrary(lib: TsIdentLibrary): TsIdentModule {
    if (lib instanceof TsIdentLibrarySimple) {
      return new TsIdentModule(undefined, lib.value.split('.'));
    } else if (lib instanceof TsIdentLibraryScoped) {
      return new TsIdentModule(lib.scope, lib.name.split('.'));
    }
    throw new Error('Unknown library type');
  }

  /**
   * Creates a simple module identifier with a single fragment
   */
  export function simple(s: string): TsIdentModule {
    return new TsIdentModule(undefined, [s]);
  }
}

// Empty array constant
export const Empty: IArray<any> = [];

// Re-export key types for convenience
export type {
  TsTree as TsTreeType,
  TsContainer as TsContainerType,
  TsDecl as TsDeclType,
  TsNamedDecl as TsNamedDeclType,
  TsContainerOrDecl as TsContainerOrDeclType
};