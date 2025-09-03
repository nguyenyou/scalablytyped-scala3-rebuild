/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.trees
 * 
 * Represents TypeScript AST (Abstract Syntax Tree) nodes
 * This is a comprehensive type system for modeling TypeScript code structures
 * 
 * Phase 1: Base Types and Identifiers
 */

import { IArray } from '../IArray.js';
import { Comments } from '../Comments.js';
import {Comment} from '../Comment.js'
import { Option, some, none } from 'fp-ts/Option';
import { CodePath, HasCodePath } from './CodePath.js';
import { JsLocation, HasJsLocation } from './JsLocation.js';
import { MemberCache, HasClassMembers } from './MemberCache.js';
import { Directive } from './Directive.js';
import { TsProtectionLevel } from './TsProtectionLevel.js';
import { MethodType } from './MethodType.js';
import { ReadonlyModifier } from './ReadonlyModifier.js';
import { OptionalModifier } from './OptionalModifier.js';
import { ExportType } from './ExportType.js';

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

/**
 * Represents a TypeScript generic type parameter.
 * In TypeScript: `T`, `T extends string`, `T = string`, or `T extends keyof U = never`
 * Used in generic classes, interfaces, functions, and type aliases.
 */
export interface TsTypeParam extends TsTree {
  readonly _tag: 'TsTypeParam';

  /**
   * JSDoc comments for this type parameter
   */
  readonly comments: Comments;

  /**
   * The name of the type parameter (e.g., T, U, K)
   */
  readonly name: TsIdentSimple;

  /**
   * Optional constraint (e.g., T extends string)
   */
  readonly upperBound: Option<TsType>;

  /**
   * Optional default type (e.g., T = string)
   */
  readonly default: Option<TsType>;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsTypeParam;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsTypeParam;
}

/**
 * Represents a TypeScript function signature.
 * In TypeScript: `<T>(param1: string, param2: number): boolean` (the signature part of a function)
 * Used in function declarations, method declarations, and function types.
 */
export interface TsFunSig extends TsTree {
  readonly _tag: 'TsFunSig';

  /**
   * JSDoc comments for this function signature
   */
  readonly comments: Comments;

  /**
   * Generic type parameters (e.g., <T, U>)
   */
  readonly tparams: IArray<TsTypeParam>;

  /**
   * Function parameters with their types
   */
  readonly params: IArray<TsFunParam>;

  /**
   * Return type of the function (None means void or inferred)
   */
  readonly resultType: Option<TsType>;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsFunSig;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsFunSig;
}

/**
 * Represents a single parameter in a TypeScript function.
 * In TypeScript: `param: string` or `optionalParam?: number` or `...rest: string[]`
 */
export interface TsFunParam extends TsTree {
  readonly _tag: 'TsFunParam';

  /**
   * JSDoc comments for this parameter
   */
  readonly comments: Comments;

  /**
   * The name of the parameter
   */
  readonly name: TsIdentSimple;

  /**
   * The type of the parameter (None means inferred or any)
   */
  readonly tpe: Option<TsType>;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsFunParam;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsFunParam;

  /**
   * Checks equality based on type (name doesn't matter for type checking)
   */
  equals(other: TsFunParam): boolean;
}

/**
 * Base trait for all TypeScript types.
 * In TypeScript: `string`, `number`, `MyInterface`, `string | number`, `{ prop: string }`, etc.
 * Represents any type expression that can appear in type annotations.
 */
export interface TsType extends TsTree {
  readonly _tag: string;
}

/**
 * Represents a TypeScript type reference.
 * In TypeScript: `MyClass`, `Array<string>`, `Promise<number>`, `React.Component<Props>`
 * References to named types, possibly with generic type arguments.
 */
export interface TsTypeRef extends TsType {
  readonly _tag: 'TsTypeRef';

  /**
   * JSDoc comments for this type reference
   */
  readonly comments: Comments;

  /**
   * The qualified name being referenced
   */
  readonly name: TsQIdent;

  /**
   * Generic type arguments (e.g., <string, number>)
   */
  readonly tparams: IArray<TsType>;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsTypeRef;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsTypeRef;
}

/**
 * Represents a TypeScript literal type.
 * In TypeScript: `42`, `"hello"`, `true`, `false`
 * Types that represent specific literal values.
 */
export interface TsTypeLiteral extends TsType {
  readonly _tag: 'TsTypeLiteral';

  /**
   * The literal value this type represents
   */
  readonly literal: TsLiteral;
}

/**
 * Represents a TypeScript object type.
 * In TypeScript: `{ prop: string; method(): void }`, `{ [key: string]: any }`
 * Anonymous object types with properties, methods, and index signatures.
 */
export interface TsTypeObject extends TsType, HasClassMembers {
  readonly _tag: 'TsTypeObject';

  /**
   * JSDoc comments for this object type
   */
  readonly comments: Comments;

  /**
   * Properties, methods, and signatures of this object type
   */
  readonly members: IArray<TsMember>;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsTypeObject;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsTypeObject;
}

/**
 * Represents a TypeScript function type.
 * In TypeScript: `(x: number, y: string) => boolean`, `<T>(arg: T) => T`
 * Function types with parameters and return types.
 */
export interface TsTypeFunction extends TsType {
  readonly _tag: 'TsTypeFunction';

  /**
   * The function signature (parameters, return type, type parameters)
   */
  readonly signature: TsFunSig;
}

/**
 * Represents a TypeScript constructor type.
 * In TypeScript: `new (x: number) => MyClass`, `abstract new () => AbstractClass`
 * Types for constructor functions.
 */
export interface TsTypeConstructor extends TsType {
  readonly _tag: 'TsTypeConstructor';

  /**
   * Whether this is an abstract constructor
   */
  readonly isAbstract: boolean;

  /**
   * The constructor function signature
   */
  readonly signature: TsTypeFunction;
}

/**
 * Represents a TypeScript type predicate with 'is'.
 * In TypeScript: `x is string`, `value is MyType`
 * Used in type guard functions to narrow types.
 */
export interface TsTypeIs extends TsType {
  readonly _tag: 'TsTypeIs';

  /**
   * The parameter being checked
   */
  readonly ident: TsIdent;

  /**
   * The type being asserted
   */
  readonly tpe: TsType;
}

/**
 * Represents a TypeScript assertion signature.
 * In TypeScript: `asserts x`, `asserts x is string`
 * Used in assertion functions that throw if condition is false.
 */
export interface TsTypeAsserts extends TsType {
  readonly _tag: 'TsTypeAsserts';

  /**
   * The parameter being asserted
   */
  readonly ident: TsIdentSimple;

  /**
   * Optional type being asserted
   */
  readonly isOpt: Option<TsType>;
}

/**
 * Represents a single element in a TypeScript tuple type.
 * In TypeScript: `string` in `[string, number]` or `name: string` in `[name: string, age: number]`
 * Tuple elements can optionally have labels for better documentation.
 */
export interface TsTupleElement extends TsTree {
  readonly _tag: 'TsTupleElement';

  /**
   * Optional label for this tuple element
   */
  readonly label: Option<TsIdent>;

  /**
   * The type of this tuple element
   */
  readonly tpe: TsType;
}

/**
 * Represents a TypeScript tuple type.
 * In TypeScript: `[string, number]`, `[name: string, age: number]`, `[string, ...number[]]`
 * Fixed-length arrays with specific types for each position.
 */
export interface TsTypeTuple extends TsType {
  readonly _tag: 'TsTypeTuple';

  /**
   * The elements of this tuple type
   */
  readonly elems: IArray<TsTupleElement>;
}

/**
 * Represents a TypeScript typeof query.
 * In TypeScript: `typeof myVariable`, `typeof MyClass.prototype`
 * Gets the type of a value expression.
 */
export interface TsTypeQuery extends TsType {
  readonly _tag: 'TsTypeQuery';

  /**
   * The expression to get the type of
   */
  readonly expr: TsQIdent;
}

/**
 * Represents a TypeScript rest/spread type.
 * In TypeScript: `...string[]` in tuple types or function parameters
 * Represents variable-length sequences of a type.
 */
export interface TsTypeRepeated extends TsType {
  readonly _tag: 'TsTypeRepeated';

  /**
   * The underlying type being repeated
   */
  readonly underlying: TsType;
}

/**
 * Represents a TypeScript keyof operator.
 * In TypeScript: `keyof MyInterface`, `keyof typeof myObject`
 * Gets the union of all property names of a type.
 */
export interface TsTypeKeyOf extends TsType {
  readonly _tag: 'TsTypeKeyOf';

  /**
   * The type to get the keys of
   */
  readonly key: TsType;
}

/**
 * Represents a TypeScript indexed access type.
 * In TypeScript: `MyType[K]`, `MyArray[number]`, `MyObject["property"]`
 * Accesses the type of a property by key.
 */
export interface TsTypeLookup extends TsType {
  readonly _tag: 'TsTypeLookup';

  /**
   * The type being indexed
   */
  readonly from: TsType;

  /**
   * The key/index type
   */
  readonly key: TsType;
}

/**
 * Represents the TypeScript 'this' type.
 * In TypeScript: `this` in method return types or parameter types
 * Refers to the type of the current instance.
 */
export interface TsTypeThis extends TsType {
  readonly _tag: 'TsTypeThis';
}

/**
 * Represents a TypeScript intersection type.
 * In TypeScript: `A & B & C`
 * Creates a type that has all properties of all intersected types.
 */
export interface TsTypeIntersect extends TsType {
  readonly _tag: 'TsTypeIntersect';

  /**
   * The types being intersected
   */
  readonly types: IArray<TsType>;
}

/**
 * Represents a TypeScript union type.
 * In TypeScript: `string | number | boolean`
 * Creates a type that can be any one of the specified types.
 */
export interface TsTypeUnion extends TsType {
  readonly _tag: 'TsTypeUnion';

  /**
   * The types in the union
   */
  readonly types: IArray<TsType>;
}

/**
 * Base trait for TypeScript type predicates and conditional logic.
 * Used in advanced type-level programming with conditional types.
 */
export interface TsTypePredicate extends TsType {
  readonly _tag: string;
}

/**
 * Represents a TypeScript conditional type.
 * In TypeScript: `T extends string ? string[] : never`
 * Type-level if-then-else logic based on type relationships.
 */
export interface TsTypeConditional extends TsTypePredicate {
  readonly _tag: 'TsTypeConditional';

  /**
   * The condition to test
   */
  readonly pred: TsType;

  /**
   * Type to use if condition is true
   */
  readonly ifTrue: TsType;

  /**
   * Type to use if condition is false
   */
  readonly ifFalse: TsType;
}

/**
 * Represents a TypeScript extends clause in conditional types.
 * In TypeScript: `T extends (...args: any[]) => infer R ? R : any`
 * Tests if one type extends/is assignable to another.
 */
export interface TsTypeExtends extends TsTypePredicate {
  readonly _tag: 'TsTypeExtends';

  /**
   * The type being tested
   */
  readonly tpe: TsType;

  /**
   * The type it should extend
   */
  readonly extends: TsType;
}

/**
 * Represents a TypeScript infer keyword in conditional types.
 * In TypeScript: `infer R` in `T extends (...args: any[]) => infer R ? R : any`
 * Captures and names a type for use in the conditional type's branches.
 */
export interface TsTypeInfer extends TsTypePredicate {
  readonly _tag: 'TsTypeInfer';

  /**
   * The type parameter being inferred
   */
  readonly tparam: TsTypeParam;
}

/**
 * Base interface for all TypeScript class and interface members.
 * In TypeScript: properties, methods, constructors, call signatures, index signatures, etc.
 * Represents anything that can appear inside a class or interface body.
 */
export interface TsMember extends TsTree {
  readonly _tag: string;

  /**
   * The visibility level (public, private, protected) of this member
   */
  readonly level: TsProtectionLevel;
}

/**
 * Represents a TypeScript call signature.
 * In TypeScript: `(x: number): string` inside an interface or object type
 * Allows objects to be called like functions.
 */
export interface TsMemberCall extends TsMember {
  readonly _tag: 'TsMemberCall';

  /**
   * JSDoc comments for this call signature
   */
  readonly comments: Comments;

  /**
   * Visibility level of this call signature
   */
  readonly level: TsProtectionLevel;

  /**
   * The function signature for the call
   */
  readonly signature: TsFunSig;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsMemberCall;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsMemberCall;
}

/**
 * Represents a TypeScript constructor signature.
 * In TypeScript: `new (x: number): MyClass` inside an interface
 * Allows objects to be used as constructors.
 */
export interface TsMemberCtor extends TsMember {
  readonly _tag: 'TsMemberCtor';

  /**
   * JSDoc comments for this constructor signature
   */
  readonly comments: Comments;

  /**
   * Visibility level of this constructor signature
   */
  readonly level: TsProtectionLevel;

  /**
   * The function signature for the constructor
   */
  readonly signature: TsFunSig;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsMemberCtor;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsMemberCtor;
}

/**
 * Represents a TypeScript method declaration.
 * In TypeScript: `myMethod(x: number): string` in a class or interface
 * Methods are functions that belong to classes or interfaces.
 */
export interface TsMemberFunction extends TsMember {
  readonly _tag: 'TsMemberFunction';

  /**
   * JSDoc comments for this method
   */
  readonly comments: Comments;

  /**
   * Visibility level (public, private, protected)
   */
  readonly level: TsProtectionLevel;

  /**
   * The name of the method
   */
  readonly name: TsIdentSimple;

  /**
   * The type of method (normal, getter, setter)
   */
  readonly methodType: MethodType;

  /**
   * The method's signature (parameters, return type, generics)
   */
  readonly signature: TsFunSig;

  /**
   * Whether this is a static method
   */
  readonly isStatic: boolean;

  /**
   * Whether this method is readonly
   */
  readonly isReadOnly: boolean;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsMemberFunction;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsMemberFunction;
}

/**
 * Represents different types of indexing in TypeScript.
 * Used for index signatures and computed property access.
 */
export interface Indexing extends TsTree {
  readonly _tag: string;
}

/**
 * Dictionary-style indexing: `[key: string]: ValueType`
 */
export interface IndexingDict extends Indexing {
  readonly _tag: 'IndexingDict';

  /**
   * The name of the index parameter
   */
  readonly name: TsIdent;

  /**
   * The type of the index parameter
   */
  readonly tpe: TsType;
}

/**
 * Single property indexing: `[K in keyof T]`
 */
export interface IndexingSingle extends Indexing {
  readonly _tag: 'IndexingSingle';

  /**
   * The qualified name being indexed
   */
  readonly name: TsQIdent;
}

/**
 * Represents a TypeScript index signature.
 * In TypeScript: `[key: string]: any` or `[index: number]: string`
 * Allows objects to have properties with computed names.
 */
export interface TsMemberIndex extends TsMember {
  readonly _tag: 'TsMemberIndex';

  /**
   * JSDoc comments for this index signature
   */
  readonly comments: Comments;

  /**
   * Whether the indexed values are readonly
   */
  readonly isReadOnly: boolean;

  /**
   * Visibility level of this index signature
   */
  readonly level: TsProtectionLevel;

  /**
   * The indexing pattern (key type and name)
   */
  readonly indexing: Indexing;

  /**
   * The type of values stored at indexed locations
   */
  readonly valueType: Option<TsType>;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsMemberIndex;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsMemberIndex;
}

/**
 * Represents a TypeScript mapped type member.
 * In TypeScript: `{ [K in keyof T]: T[K] }` or `{ readonly [K in keyof T]?: T[K] }`
 * Used for transforming types by mapping over their properties.
 */
export interface TsMemberTypeMapped extends TsMember {
  readonly _tag: 'TsMemberTypeMapped';

  /**
   * JSDoc comments for this mapped type
   */
  readonly comments: Comments;

  /**
   * Visibility level of this mapped type
   */
  readonly level: TsProtectionLevel;

  /**
   * Readonly modifier (readonly, +readonly, -readonly, or none)
   */
  readonly readonly: ReadonlyModifier;

  /**
   * The key variable name (e.g., K in `[K in keyof T]`)
   */
  readonly key: TsIdent;

  /**
   * The type being mapped over (e.g., `keyof T`)
   */
  readonly from: TsType;

  /**
   * Optional key remapping (e.g., `as \`prefix_\${K}\``)
   */
  readonly as: Option<TsType>;

  /**
   * Optional modifier (+?, -?, ?, or none)
   */
  readonly optionalize: OptionalModifier;

  /**
   * The resulting type for each mapped property
   */
  readonly to: TsType;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsMemberTypeMapped;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsMemberTypeMapped;
}

/**
 * Represents a TypeScript property declaration.
 * In TypeScript: `myProp: string` or `static readonly count: number = 0`
 * Properties store data in classes and interfaces.
 */
export interface TsMemberProperty extends TsMember {
  readonly _tag: 'TsMemberProperty';

  /**
   * JSDoc comments for this property
   */
  readonly comments: Comments;

  /**
   * Visibility level (public, private, protected)
   */
  readonly level: TsProtectionLevel;

  /**
   * The name of the property
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
   * Whether this is a static property
   */
  readonly isStatic: boolean;

  /**
   * Whether this property is readonly
   */
  readonly isReadOnly: boolean;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsMemberProperty;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsMemberProperty;
}

/**
 * Represents a single member/value within a TypeScript enum.
 * In TypeScript: `Red = 1` or `Green` (auto-assigned value) within an enum declaration.
 * Enum members can have explicit values or be auto-assigned based on their position.
 */
export interface TsEnumMember extends TsTree {
  readonly _tag: 'TsEnumMember';

  /**
   * JSDoc comments for this enum member
   */
  readonly comments: Comments;

  /**
   * The name of this enum member
   */
  readonly name: TsIdentSimple;

  /**
   * Optional explicit value assignment (e.g., = 1, = "red")
   * If None, the value will be auto-assigned based on position
   */
  readonly expr: Option<TsExpr>;

  /**
   * Creates a copy with new comments
   */
  withComments(cs: Comments): TsEnumMember;

  /**
   * Adds a comment to the existing comments
   */
  addComment(c: Comment): TsEnumMember;
}

/**
 * Base interface for all TypeScript expressions.
 * In TypeScript: `myVar`, `42`, `"hello"`, `func()`, `a + b`, etc.
 * Represents any expression that can appear in TypeScript code.
 */
export interface TsExpr extends TsTree {
  readonly _tag: string;
}

/**
 * Represents a reference to an identifier or qualified name.
 * In TypeScript: `myVar`, `MyClass.staticProp`, `namespace.function`
 * References to variables, functions, properties, etc.
 */
export interface TsExprRef extends TsExpr {
  readonly _tag: 'TsExprRef';

  /**
   * The qualified identifier being referenced
   */
  readonly value: TsQIdent;
}

/**
 * Represents a literal value expression.
 * In TypeScript: `42`, `"hello"`, `true`, `false`
 * Compile-time constant values.
 */
export interface TsExprLiteral extends TsExpr {
  readonly _tag: 'TsExprLiteral';

  /**
   * The literal value
   */
  readonly value: TsLiteral;
}

/**
 * Represents a function call expression.
 * In TypeScript: `func()`, `obj.method(arg1, arg2)`, `new Constructor(args)`
 * Function invocations with arguments.
 */
export interface TsExprCall extends TsExpr {
  readonly _tag: 'TsExprCall';

  /**
   * The function expression being called
   */
  readonly function: TsExpr;

  /**
   * The arguments passed to the function
   */
  readonly params: IArray<TsExpr>;
}

/**
 * Represents a unary operation expression.
 * In TypeScript: `!flag`, `-number`, `+value`, `typeof obj`, `void expr`
 * Single-operand operations.
 */
export interface TsExprUnary extends TsExpr {
  readonly _tag: 'TsExprUnary';

  /**
   * The unary operator
   */
  readonly op: string;

  /**
   * The expression being operated on
   */
  readonly expr: TsExpr;
}

/**
 * Represents a binary operation expression.
 * In TypeScript: `a + b`, `x === y`, `value && other`, `left | right`
 * Two-operand operations.
 */
export interface TsExprBinaryOp extends TsExpr {
  readonly _tag: 'TsExprBinaryOp';

  /**
   * The left operand
   */
  readonly one: TsExpr;

  /**
   * The binary operator
   */
  readonly op: string;

  /**
   * The right operand
   */
  readonly two: TsExpr;
}

/**
 * Represents a type cast expression.
 * In TypeScript: `value as string`, `<number>value`
 * Type assertions and casts.
 */
export interface TsExprCast extends TsExpr {
  readonly _tag: 'TsExprCast';

  /**
   * The expression being cast
   */
  readonly expr: TsExpr;

  /**
   * The target type
   */
  readonly tpe: TsType;
}

/**
 * Represents an array literal expression.
 * In TypeScript: `[value]`, `[1, 2, 3]`, `[...items]`
 * Array construction with elements.
 */
export interface TsExprArrayOf extends TsExpr {
  readonly _tag: 'TsExprArrayOf';

  /**
   * The expression representing the array element(s)
   */
  readonly expr: TsExpr;
}

/**
 * Represents what is being imported in a TypeScript import statement.
 * Covers the different syntaxes for importing from modules.
 */
export interface TsImported extends TsTree {
  readonly _tag: string;
}

/**
 * Default import or single named import.
 * In TypeScript: `import React from "react"` or `import { useState } from "react"`
 */
export interface TsImportedIdent extends TsImported {
  readonly _tag: 'TsImportedIdent';

  /**
   * The identifier being imported
   */
  readonly ident: TsIdentSimple;
}

/**
 * Destructured/named imports with optional aliasing.
 * In TypeScript: `import { useState as state, useEffect } from "react"`
 * The tuple represents (originalName, optionalAlias)
 */
export interface TsImportedDestructured extends TsImported {
  readonly _tag: 'TsImportedDestructured';

  /**
   * Array of (originalName, optionalAlias) pairs
   */
  readonly idents: IArray<[TsIdent, Option<TsIdentSimple>]>;
}

/**
 * Star/namespace import.
 * In TypeScript: `import * as React from "react"` or `import * from "module"`
 */
export interface TsImportedStar extends TsImported {
  readonly _tag: 'TsImportedStar';

  /**
   * Optional alias for the star import
   */
  readonly asOpt: Option<TsIdentSimple>;
}

/**
 * Represents the source of a TypeScript import.
 * Specifies where the import is coming from.
 */
export interface TsImportee extends TsTree {
  readonly _tag: string;
}

/**
 * CommonJS-style require import.
 * In TypeScript: `import foo = require("module")`
 */
export interface TsImporteeRequired extends TsImportee {
  readonly _tag: 'TsImporteeRequired';

  /**
   * The module being required
   */
  readonly from: TsIdentModule;
}

/**
 * ES6-style module import.
 * In TypeScript: `import { foo } from "module"`
 */
export interface TsImporteeFrom extends TsImportee {
  readonly _tag: 'TsImporteeFrom';

  /**
   * The module being imported from
   */
  readonly from: TsIdentModule;
}

/**
 * Local/relative import.
 * In TypeScript: `import { foo } from "./local-module"`
 */
export interface TsImporteeLocal extends TsImportee {
  readonly _tag: 'TsImporteeLocal';

  /**
   * The qualified identifier for the local import
   */
  readonly qident: TsQIdent;
}

/**
 * Represents a complete TypeScript import declaration.
 * In TypeScript: `import { useState } from "react"` or `import type { Props } from "./types"`
 */
export interface TsImport extends TsContainerOrDecl {
  readonly _tag: 'TsImport';

  /**
   * Whether this is a type-only import
   */
  readonly typeOnly: boolean;

  /**
   * What is being imported
   */
  readonly imported: IArray<TsImported>;

  /**
   * Where it's being imported from
   */
  readonly from: TsImportee;
}

/**
 * Represents what is being exported in a TypeScript export statement.
 * Covers the different syntaxes for exporting from modules.
 */
export interface TsExportee extends TsTree {
  readonly _tag: string;
}

/**
 * Named exports with optional aliasing.
 * In TypeScript: `export { foo, bar as baz }` or `export { foo } from "module"`
 * The tuple represents (originalName, optionalAlias)
 */
export interface TsExporteeNames extends TsExportee {
  readonly _tag: 'TsExporteeNames';

  /**
   * Array of (originalName, optionalAlias) pairs
   */
  readonly idents: IArray<[TsQIdent, Option<TsIdentSimple>]>;

  /**
   * Optional module to re-export from
   */
  readonly fromOpt: Option<TsIdentModule>;
}

/**
 * Direct export of a declaration.
 * In TypeScript: `export class MyClass {}` or `export function myFunc() {}`
 */
export interface TsExporteeTree extends TsExportee {
  readonly _tag: 'TsExporteeTree';

  /**
   * The declaration being exported
   */
  readonly decl: TsDecl;
}

/**
 * Star/namespace export.
 * In TypeScript: `export * from "module"` or `export * as namespace from "module"`
 */
export interface TsExporteeStar extends TsExportee {
  readonly _tag: 'TsExporteeStar';

  /**
   * Optional alias for the star export
   */
  readonly as: Option<TsIdentSimple>;

  /**
   * The module being re-exported from
   */
  readonly from: TsIdentModule;
}

/**
 * Represents a complete TypeScript export declaration.
 * In TypeScript: `export { foo }` or `export type { Props }` or `export default MyClass`
 */
export interface TsExport extends TsContainerOrDecl {
  readonly _tag: 'TsExport';

  /**
   * JSDoc comments for this export
   */
  readonly comments: Comments;

  /**
   * Whether this is a type-only export
   */
  readonly typeOnly: boolean;

  /**
   * The type of export (default, named, etc.)
   */
  readonly tpe: ExportType;

  /**
   * What is being exported
   */
  readonly exported: TsExportee;
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

/**
 * Constructor functions and utilities for TsTypeParam
 */
export const TsTypeParam = {
  /**
   * Creates a type parameter
   */
  create: (
    comments: Comments,
    name: TsIdentSimple,
    upperBound: Option<TsType>,
    defaultType: Option<TsType>
  ): TsTypeParam => {
    return {
      _tag: 'TsTypeParam',
      comments,
      name,
      upperBound,
      default: defaultType,
      withComments: (cs: Comments) =>
        TsTypeParam.create(cs, name, upperBound, defaultType),
      addComment: (c: Comment) =>
        TsTypeParam.create(comments.add(c), name, upperBound, defaultType),
      asString: `TsTypeParam(${name.value})`
    };
  },

  /**
   * Creates a simple type parameter without bounds or defaults
   */
  simple: (name: TsIdentSimple): TsTypeParam =>
    TsTypeParam.create(Comments.empty(), name, none, none),

  /**
   * Creates a type parameter with an upper bound constraint
   */
  withUpperBound: (name: TsIdentSimple, upperBound: TsType): TsTypeParam =>
    TsTypeParam.create(Comments.empty(), name, some(upperBound), none),

  /**
   * Creates a type parameter with a default type
   */
  withDefault: (name: TsIdentSimple, defaultType: TsType): TsTypeParam =>
    TsTypeParam.create(Comments.empty(), name, none, some(defaultType)),

  /**
   * Converts type parameters to type arguments for instantiation.
   * Transforms `<T, U>` into `T, U` for use in type references.
   */
  asTypeArgs: (tps: IArray<TsTypeParam>): IArray<TsTypeRef> =>
    tps.map(tp => ({ _tag: 'TsTypeRef', name: TsQIdent.of(tp.name), tparams: IArray.Empty, asString: `TsTypeRef(${tp.name.value})` } as TsTypeRef)),

  /**
   * Type guard
   */
  isTypeParam: (tree: TsTree): tree is TsTypeParam => tree._tag === 'TsTypeParam'
};

/**
 * Constructor functions and utilities for TsFunSig
 */
export const TsFunSig = {
  /**
   * Creates a function signature
   */
  create: (
    comments: Comments,
    tparams: IArray<TsTypeParam>,
    params: IArray<TsFunParam>,
    resultType: Option<TsType>
  ): TsFunSig => {
    return {
      _tag: 'TsFunSig',
      comments,
      tparams,
      params,
      resultType,
      withComments: (cs: Comments) =>
        TsFunSig.create(cs, tparams, params, resultType),
      addComment: (c: Comment) =>
        TsFunSig.create(comments.add(c), tparams, params, resultType),
      asString: `TsFunSig(${params.length} params)`
    };
  },

  /**
   * Creates a simple function signature without type parameters
   */
  simple: (params: IArray<TsFunParam>, resultType: Option<TsType>): TsFunSig =>
    TsFunSig.create(Comments.empty(), IArray.Empty, params, resultType),

  /**
   * Creates a function signature with no parameters
   */
  noParams: (resultType: Option<TsType>): TsFunSig =>
    TsFunSig.create(Comments.empty(), IArray.Empty, IArray.Empty, resultType),

  /**
   * Creates a function signature with type parameters
   */
  withTypeParams: (
    tparams: IArray<TsTypeParam>,
    params: IArray<TsFunParam>,
    resultType: Option<TsType>
  ): TsFunSig =>
    TsFunSig.create(Comments.empty(), tparams, params, resultType),

  /**
   * Type guard
   */
  isFunSig: (tree: TsTree): tree is TsFunSig => tree._tag === 'TsFunSig'
};

/**
 * Constructor functions and utilities for TsFunParam
 */
export const TsFunParam = {
  /**
   * Creates a function parameter
   */
  create: (
    comments: Comments,
    name: TsIdentSimple,
    tpe: Option<TsType>
  ): TsFunParam => {
    return {
      _tag: 'TsFunParam',
      comments,
      name,
      tpe,
      withComments: (cs: Comments) =>
        TsFunParam.create(cs, name, tpe),
      addComment: (c: Comment) =>
        TsFunParam.create(comments.add(c), name, tpe),
      equals: (other: TsFunParam) => {
        // Parameters are considered equal if they have the same type (name doesn't matter for type checking)
        if (tpe._tag === 'None' && other.tpe._tag === 'None') return true;
        if (tpe._tag === 'Some' && other.tpe._tag === 'Some') {
          // For now, we'll do a simple string comparison of the type's asString
          // In a full implementation, this would be a proper type equality check
          return tpe.value.asString === other.tpe.value.asString;
        }
        return false;
      },
      asString: `TsFunParam(${name.value}${tpe._tag === 'Some' ? ': ' + tpe.value.asString : ''})`
    };
  },

  /**
   * Creates a simple parameter without type annotation
   */
  simple: (name: TsIdentSimple): TsFunParam =>
    TsFunParam.create(Comments.empty(), name, none),

  /**
   * Creates a typed parameter
   */
  typed: (name: TsIdentSimple, tpe: TsType): TsFunParam =>
    TsFunParam.create(Comments.empty(), name, some(tpe)),

  /**
   * Creates a parameter with comments
   */
  withComments: (comments: Comments, name: TsIdentSimple, tpe: Option<TsType>): TsFunParam =>
    TsFunParam.create(comments, name, tpe),

  /**
   * Type guard
   */
  isFunParam: (tree: TsTree): tree is TsFunParam => tree._tag === 'TsFunParam'
};

/**
 * Constructor functions and utilities for TsTypeRef
 */
export const TsTypeRef = {
  /**
   * Creates a type reference
   */
  create: (
    comments: Comments,
    name: TsQIdent,
    tparams: IArray<TsType>
  ): TsTypeRef => {
    return {
      _tag: 'TsTypeRef',
      comments,
      name,
      tparams,
      withComments: (cs: Comments) =>
        TsTypeRef.create(cs, name, tparams),
      addComment: (c: Comment) =>
        TsTypeRef.create(comments.add(c), name, tparams),
      asString: `TsTypeRef(${name.asString}${tparams.length > 0 ? `<${tparams.length} args>` : ''})`
    };
  },

  /**
   * Creates a type reference from a simple identifier
   */
  fromIdent: (tsIdent: TsIdent): TsTypeRef =>
    TsTypeRef.create(Comments.empty(), TsQIdent.of(tsIdent), IArray.Empty),

  /**
   * Creates a type reference from a qualified identifier
   */
  fromQIdent: (tsQIdent: TsQIdent): TsTypeRef =>
    TsTypeRef.create(Comments.empty(), tsQIdent, IArray.Empty),

  /**
   * Creates a simple type reference without type parameters
   */
  simple: (name: TsQIdent): TsTypeRef =>
    TsTypeRef.create(Comments.empty(), name, IArray.Empty),

  /**
   * Creates a generic type reference with type parameters
   */
  generic: (name: TsQIdent, tparams: IArray<TsType>): TsTypeRef =>
    TsTypeRef.create(Comments.empty(), name, tparams),

  // Common TypeScript type references (defined as getters to avoid circular reference)
  get any(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentAny, IArray.Empty); },
  get boolean(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentBoolean, IArray.Empty); },
  get Boolean(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentBooleanConstructor, IArray.Empty); },
  get symbol(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentSymbol, IArray.Empty); },
  get object(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentObject, IArray.Empty); },
  get Object(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentObjectConstructor, IArray.Empty); },
  get string(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentString, IArray.Empty); },
  get String(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentStringConstructor, IArray.Empty); },
  get never(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentNever, IArray.Empty); },
  get number(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentNumber, IArray.Empty); },
  get null(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentNull, IArray.Empty); },
  get void(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentVoid, IArray.Empty); },
  get undefined(): TsTypeRef { return TsTypeRef.create(Comments.empty(), TsQIdentUndefined, IArray.Empty); },

  /**
   * Type guard
   */
  isTypeRef: (tree: TsTree): tree is TsTypeRef => tree._tag === 'TsTypeRef'
};

/**
 * Constructor functions and utilities for TsTypeLiteral
 */
export const TsTypeLiteral = {
  /**
   * Creates a literal type
   */
  create: (literal: TsLiteral): TsTypeLiteral => {
    return {
      _tag: 'TsTypeLiteral',
      literal,
      asString: `TsTypeLiteral(${literal.asString})`
    };
  },

  /**
   * Creates a string literal type
   */
  string: (value: string): TsTypeLiteral =>
    TsTypeLiteral.create(TsLiteral.str(value)),

  /**
   * Creates a number literal type
   */
  number: (value: number): TsTypeLiteral =>
    TsTypeLiteral.create(TsLiteral.num(value.toString())),

  /**
   * Creates a boolean literal type
   */
  boolean: (value: boolean): TsTypeLiteral =>
    TsTypeLiteral.create(TsLiteral.bool(value)),

  /**
   * Type guard
   */
  isTypeLiteral: (tree: TsTree): tree is TsTypeLiteral => tree._tag === 'TsTypeLiteral'
};

/**
 * Constructor functions and utilities for TsTypeObject
 */
export const TsTypeObject = {
  /**
   * Creates an object type
   */
  create: (
    comments: Comments,
    members: IArray<TsMember>
  ): TsTypeObject => {
    // Create class member cache
    const classMemberCache = HasClassMembers.create(members);

    return {
      _tag: 'TsTypeObject',
      comments,
      ...classMemberCache,
      withComments: (cs: Comments) =>
        TsTypeObject.create(cs, members),
      addComment: (c: Comment) =>
        TsTypeObject.create(comments.add(c), members),
      asString: `TsTypeObject(${members.length} members)`
    };
  },

  /**
   * Creates an empty object type
   */
  empty: (): TsTypeObject =>
    TsTypeObject.create(Comments.empty(), IArray.Empty),

  /**
   * Creates an object type with members
   */
  withMembers: (members: IArray<TsMember>): TsTypeObject =>
    TsTypeObject.create(Comments.empty(), members),

  /**
   * Type guard
   */
  isTypeObject: (tree: TsTree): tree is TsTypeObject => tree._tag === 'TsTypeObject'
};

/**
 * Constructor functions and utilities for TsTypeFunction
 */
export const TsTypeFunction = {
  /**
   * Creates a function type
   */
  create: (signature: TsFunSig): TsTypeFunction => {
    return {
      _tag: 'TsTypeFunction',
      signature,
      asString: `TsTypeFunction(${signature.asString})`
    };
  },

  /**
   * Type guard
   */
  isTypeFunction: (tree: TsTree): tree is TsTypeFunction => tree._tag === 'TsTypeFunction'
};

/**
 * Constructor functions and utilities for TsTypeUnion
 */
export const TsTypeUnion = {
  /**
   * Creates a union type
   */
  create: (types: IArray<TsType>): TsTypeUnion => {
    return {
      _tag: 'TsTypeUnion',
      types,
      asString: `TsTypeUnion(${types.length} types)`
    };
  },

  /**
   * Flattens nested union types into a single level
   */
  flatten: (types: IArray<TsType>): IArray<TsType> => {
    const result: TsType[] = [];
    for (let i = 0; i < types.length; i++) {
      const type = types.apply(i);
      if (type._tag === 'TsTypeUnion') {
        const nested = TsTypeUnion.flatten((type as TsTypeUnion).types);
        for (let j = 0; j < nested.length; j++) {
          result.push(nested.apply(j));
        }
      } else {
        result.push(type);
      }
    }
    return IArray.fromArray(result);
  },

  /**
   * Creates a simplified union type, removing duplicates and flattening nested unions
   */
  simplified: (types: IArray<TsType>): TsType => {
    const flattened = TsTypeUnion.flatten(types);
    const distinct = IArray.fromArray([...new Set(flattened.toArray().map(t => t.asString))].map(str =>
      flattened.toArray().find(t => t.asString === str)!
    ));

    if (distinct.length === 0) {
      return TsTypeRef.never;
    } else if (distinct.length === 1) {
      return distinct.apply(0);
    } else {
      return TsTypeUnion.create(distinct);
    }
  },

  /**
   * Type guard
   */
  isTypeUnion: (tree: TsTree): tree is TsTypeUnion => tree._tag === 'TsTypeUnion'
};

/**
 * Constructor functions and utilities for TsTypeIntersect
 */
export const TsTypeIntersect = {
  /**
   * Creates an intersection type
   */
  create: (types: IArray<TsType>): TsTypeIntersect => {
    return {
      _tag: 'TsTypeIntersect',
      types,
      asString: `TsTypeIntersect(${types.length} types)`
    };
  },

  /**
   * Flattens nested intersection types into a single level
   */
  flatten: (types: IArray<TsType>): IArray<TsType> => {
    const result: TsType[] = [];
    for (let i = 0; i < types.length; i++) {
      const type = types.apply(i);
      if (type._tag === 'TsTypeIntersect') {
        const nested = TsTypeIntersect.flatten((type as TsTypeIntersect).types);
        for (let j = 0; j < nested.length; j++) {
          result.push(nested.apply(j));
        }
      } else {
        result.push(type);
      }
    }
    return IArray.fromArray(result);
  },

  /**
   * Creates a simplified intersection type, combining object types where possible
   */
  simplified: (types: IArray<TsType>): TsType => {
    // Separate object types from other types
    const objects: TsTypeObject[] = [];
    const others: TsType[] = [];

    for (let i = 0; i < types.length; i++) {
      const type = types.apply(i);
      if (type._tag === 'TsTypeObject') {
        objects.push(type as TsTypeObject);
      } else {
        others.push(type);
      }
    }

    // Combine object types if we have more than one
    const combinedTypes: TsType[] = [...others];
    if (objects.length > 1) {
      const allMembers = objects.flatMap(obj => obj.members.toArray());
      const combinedObject = TsTypeObject.withMembers(IArray.fromArray(allMembers));
      combinedTypes.unshift(combinedObject);
    } else if (objects.length === 1) {
      combinedTypes.unshift(objects[0]);
    }

    const flattened = TsTypeIntersect.flatten(IArray.fromArray(combinedTypes));
    const distinct = IArray.fromArray([...new Set(flattened.toArray().map(t => t.asString))].map(str =>
      flattened.toArray().find(t => t.asString === str)!
    ));

    if (distinct.length === 0) {
      return TsTypeRef.never;
    } else if (distinct.length === 1) {
      return distinct.apply(0);
    } else {
      return TsTypeIntersect.create(distinct);
    }
  },

  /**
   * Type guard
   */
  isTypeIntersect: (tree: TsTree): tree is TsTypeIntersect => tree._tag === 'TsTypeIntersect'
};

/**
 * Constructor functions and utilities for TsMemberCall
 */
export const TsMemberCall = {
  /**
   * Creates a call signature member
   */
  create: (
    comments: Comments,
    level: TsProtectionLevel,
    signature: TsFunSig
  ): TsMemberCall => {
    return {
      _tag: 'TsMemberCall',
      comments,
      level,
      signature,
      withComments: (cs: Comments) =>
        TsMemberCall.create(cs, level, signature),
      addComment: (c: Comment) =>
        TsMemberCall.create(comments.add(c), level, signature),
      asString: `TsMemberCall(${signature.asString})`
    };
  },

  /**
   * Creates a public call signature
   */
  public: (signature: TsFunSig): TsMemberCall =>
    TsMemberCall.create(Comments.empty(), TsProtectionLevel.default(), signature),

  /**
   * Type guard
   */
  isMemberCall: (tree: TsTree): tree is TsMemberCall => tree._tag === 'TsMemberCall'
};

/**
 * Constructor functions and utilities for TsMemberCtor
 */
export const TsMemberCtor = {
  /**
   * Creates a constructor signature member
   */
  create: (
    comments: Comments,
    level: TsProtectionLevel,
    signature: TsFunSig
  ): TsMemberCtor => {
    return {
      _tag: 'TsMemberCtor',
      comments,
      level,
      signature,
      withComments: (cs: Comments) =>
        TsMemberCtor.create(cs, level, signature),
      addComment: (c: Comment) =>
        TsMemberCtor.create(comments.add(c), level, signature),
      asString: `TsMemberCtor(${signature.asString})`
    };
  },

  /**
   * Creates a public constructor signature
   */
  public: (signature: TsFunSig): TsMemberCtor =>
    TsMemberCtor.create(Comments.empty(), TsProtectionLevel.default(), signature),

  /**
   * Type guard
   */
  isMemberCtor: (tree: TsTree): tree is TsMemberCtor => tree._tag === 'TsMemberCtor'
};

/**
 * Constructor functions and utilities for TsMemberFunction
 */
export const TsMemberFunction = {
  /**
   * Creates a method member
   */
  create: (
    comments: Comments,
    level: TsProtectionLevel,
    name: TsIdentSimple,
    methodType: MethodType,
    signature: TsFunSig,
    isStatic: boolean,
    isReadOnly: boolean
  ): TsMemberFunction => {
    return {
      _tag: 'TsMemberFunction',
      comments,
      level,
      name,
      methodType,
      signature,
      isStatic,
      isReadOnly,
      withComments: (cs: Comments) =>
        TsMemberFunction.create(cs, level, name, methodType, signature, isStatic, isReadOnly),
      addComment: (c: Comment) =>
        TsMemberFunction.create(comments.add(c), level, name, methodType, signature, isStatic, isReadOnly),
      asString: `TsMemberFunction(${name.value})`
    };
  },

  /**
   * Creates a simple public method
   */
  method: (name: TsIdentSimple, signature: TsFunSig): TsMemberFunction =>
    TsMemberFunction.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      name,
      MethodType.normal(),
      signature,
      false,
      false
    ),

  /**
   * Creates a getter method
   */
  getter: (name: TsIdentSimple, returnType: TsType): TsMemberFunction =>
    TsMemberFunction.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      name,
      MethodType.getter(),
      TsFunSig.noParams(some(returnType)),
      false,
      false
    ),

  /**
   * Creates a setter method
   */
  setter: (name: TsIdentSimple, paramType: TsType): TsMemberFunction => {
    const param = TsFunParam.typed(TsIdent.simple('value'), paramType);
    const signature = TsFunSig.simple(IArray.fromArray([param]), none);
    return TsMemberFunction.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      name,
      MethodType.setter(),
      signature,
      false,
      false
    );
  },

  /**
   * Creates a static method
   */
  static: (name: TsIdentSimple, signature: TsFunSig): TsMemberFunction =>
    TsMemberFunction.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      name,
      MethodType.normal(),
      signature,
      true,
      false
    ),

  /**
   * Type guard
   */
  isMemberFunction: (tree: TsTree): tree is TsMemberFunction => tree._tag === 'TsMemberFunction'
};

/**
 * Constructor functions and utilities for Indexing
 */
export const IndexingDict = {
  /**
   * Creates dictionary-style indexing
   */
  create: (name: TsIdent, tpe: TsType): IndexingDict => {
    return {
      _tag: 'IndexingDict',
      name,
      tpe,
      asString: `IndexingDict(${name.value}: ${tpe.asString})`
    };
  },

  /**
   * Creates string indexing: [key: string]
   */
  string: (name: TsIdent): IndexingDict =>
    IndexingDict.create(name, TsTypeRef.string),

  /**
   * Creates number indexing: [index: number]
   */
  number: (name: TsIdent): IndexingDict =>
    IndexingDict.create(name, TsTypeRef.number),

  /**
   * Type guard
   */
  isIndexingDict: (tree: TsTree): tree is IndexingDict => tree._tag === 'IndexingDict'
};

export const IndexingSingle = {
  /**
   * Creates single property indexing
   */
  create: (name: TsQIdent): IndexingSingle => {
    return {
      _tag: 'IndexingSingle',
      name,
      asString: `IndexingSingle(${name.asString})`
    };
  },

  /**
   * Type guard
   */
  isIndexingSingle: (tree: TsTree): tree is IndexingSingle => tree._tag === 'IndexingSingle'
};

/**
 * Constructor functions and utilities for TsMemberIndex
 */
export const TsMemberIndex = {
  /**
   * Creates an index signature member
   */
  create: (
    comments: Comments,
    isReadOnly: boolean,
    level: TsProtectionLevel,
    indexing: Indexing,
    valueType: Option<TsType>
  ): TsMemberIndex => {
    return {
      _tag: 'TsMemberIndex',
      comments,
      isReadOnly,
      level,
      indexing,
      valueType,
      withComments: (cs: Comments) =>
        TsMemberIndex.create(cs, isReadOnly, level, indexing, valueType),
      addComment: (c: Comment) =>
        TsMemberIndex.create(comments.add(c), isReadOnly, level, indexing, valueType),
      asString: `TsMemberIndex(${indexing.asString})`
    };
  },

  /**
   * Creates a simple string index signature
   */
  stringIndex: (valueType: TsType): TsMemberIndex => {
    const indexing = IndexingDict.string(TsIdent.simple('key'));
    return TsMemberIndex.create(
      Comments.empty(),
      false,
      TsProtectionLevel.default(),
      indexing,
      some(valueType)
    );
  },

  /**
   * Creates a simple number index signature
   */
  numberIndex: (valueType: TsType): TsMemberIndex => {
    const indexing = IndexingDict.number(TsIdent.simple('index'));
    return TsMemberIndex.create(
      Comments.empty(),
      false,
      TsProtectionLevel.default(),
      indexing,
      some(valueType)
    );
  },

  /**
   * Type guard
   */
  isMemberIndex: (tree: TsTree): tree is TsMemberIndex => tree._tag === 'TsMemberIndex'
};

/**
 * Constructor functions and utilities for TsMemberProperty
 */
export const TsMemberProperty = {
  /**
   * Creates a property member
   */
  create: (
    comments: Comments,
    level: TsProtectionLevel,
    name: TsIdentSimple,
    tpe: Option<TsType>,
    expr: Option<TsExpr>,
    isStatic: boolean,
    isReadOnly: boolean
  ): TsMemberProperty => {
    return {
      _tag: 'TsMemberProperty',
      comments,
      level,
      name,
      tpe,
      expr,
      isStatic,
      isReadOnly,
      withComments: (cs: Comments) =>
        TsMemberProperty.create(cs, level, name, tpe, expr, isStatic, isReadOnly),
      addComment: (c: Comment) =>
        TsMemberProperty.create(comments.add(c), level, name, tpe, expr, isStatic, isReadOnly),
      asString: `TsMemberProperty(${name.value}${tpe._tag === 'Some' ? ': ' + tpe.value.asString : ''})`
    };
  },

  /**
   * Creates a simple typed property
   */
  typed: (name: TsIdentSimple, tpe: TsType): TsMemberProperty =>
    TsMemberProperty.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      name,
      some(tpe),
      none,
      false,
      false
    ),

  /**
   * Creates a property with an initializer
   */
  withInitializer: (name: TsIdentSimple, tpe: Option<TsType>, expr: TsExpr): TsMemberProperty =>
    TsMemberProperty.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      name,
      tpe,
      some(expr),
      false,
      false
    ),

  /**
   * Creates a readonly property
   */
  readonly: (name: TsIdentSimple, tpe: TsType): TsMemberProperty =>
    TsMemberProperty.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      name,
      some(tpe),
      none,
      false,
      true
    ),

  /**
   * Creates a static property
   */
  static: (name: TsIdentSimple, tpe: TsType): TsMemberProperty =>
    TsMemberProperty.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      name,
      some(tpe),
      none,
      true,
      false
    ),

  /**
   * Creates a simple untyped property
   */
  simple: (name: TsIdentSimple): TsMemberProperty =>
    TsMemberProperty.create(
      Comments.empty(),
      TsProtectionLevel.default(),
      name,
      none,
      none,
      false,
      false
    ),

  /**
   * Type guard
   */
  isMemberProperty: (tree: TsTree): tree is TsMemberProperty => tree._tag === 'TsMemberProperty'
};

/**
 * Constructor functions and utilities for TsImported
 */
export const TsImportedIdent = {
  /**
   * Creates an identifier import
   */
  create: (ident: TsIdentSimple): TsImportedIdent => {
    return {
      _tag: 'TsImportedIdent',
      ident,
      asString: `TsImportedIdent(${ident.value})`
    };
  },

  /**
   * Type guard
   */
  isImportedIdent: (tree: TsTree): tree is TsImportedIdent => tree._tag === 'TsImportedIdent'
};

export const TsImportedDestructured = {
  /**
   * Creates a destructured import
   */
  create: (idents: IArray<[TsIdent, Option<TsIdentSimple>]>): TsImportedDestructured => {
    return {
      _tag: 'TsImportedDestructured',
      idents,
      asString: `TsImportedDestructured(${idents.length} imports)`
    };
  },

  /**
   * Creates a simple destructured import without aliases
   */
  simple: (idents: IArray<TsIdent>): TsImportedDestructured => {
    const pairs = idents.map(ident => [ident, none] as [TsIdent, Option<TsIdentSimple>]);
    return TsImportedDestructured.create(pairs);
  },

  /**
   * Type guard
   */
  isImportedDestructured: (tree: TsTree): tree is TsImportedDestructured => tree._tag === 'TsImportedDestructured'
};

export const TsImportedStar = {
  /**
   * Creates a star import
   */
  create: (asOpt: Option<TsIdentSimple>): TsImportedStar => {
    return {
      _tag: 'TsImportedStar',
      asOpt,
      asString: `TsImportedStar(${asOpt._tag === 'Some' ? 'as ' + asOpt.value.value : 'no alias'})`
    };
  },

  /**
   * Creates a star import with alias
   */
  withAlias: (alias: TsIdentSimple): TsImportedStar =>
    TsImportedStar.create(some(alias)),

  /**
   * Creates a star import without alias
   */
  withoutAlias: (): TsImportedStar =>
    TsImportedStar.create(none),

  /**
   * Type guard
   */
  isImportedStar: (tree: TsTree): tree is TsImportedStar => tree._tag === 'TsImportedStar'
};

/**
 * Constructor functions and utilities for TsImportee
 */
export const TsImporteeRequired = {
  /**
   * Creates a require-style importee
   */
  create: (from: TsIdentModule): TsImporteeRequired => {
    return {
      _tag: 'TsImporteeRequired',
      from,
      asString: `TsImporteeRequired(${from.value})`
    };
  },

  /**
   * Type guard
   */
  isImporteeRequired: (tree: TsTree): tree is TsImporteeRequired => tree._tag === 'TsImporteeRequired'
};

export const TsImporteeFrom = {
  /**
   * Creates an ES6-style importee
   */
  create: (from: TsIdentModule): TsImporteeFrom => {
    return {
      _tag: 'TsImporteeFrom',
      from,
      asString: `TsImporteeFrom(${from.value})`
    };
  },

  /**
   * Type guard
   */
  isImporteeFrom: (tree: TsTree): tree is TsImporteeFrom => tree._tag === 'TsImporteeFrom'
};

export const TsImporteeLocal = {
  /**
   * Creates a local importee
   */
  create: (qident: TsQIdent): TsImporteeLocal => {
    return {
      _tag: 'TsImporteeLocal',
      qident,
      asString: `TsImporteeLocal(${qident.asString})`
    };
  },

  /**
   * Type guard
   */
  isImporteeLocal: (tree: TsTree): tree is TsImporteeLocal => tree._tag === 'TsImporteeLocal'
};

/**
 * Constructor functions and utilities for TsImport
 */
export const TsImport = {
  /**
   * Creates an import declaration
   */
  create: (
    typeOnly: boolean,
    imported: IArray<TsImported>,
    from: TsImportee
  ): TsImport => {
    return {
      _tag: 'TsImport',
      typeOnly,
      imported,
      from,
      asString: `TsImport(${typeOnly ? 'type ' : ''}${imported.length} imports from ${from.asString})`
    };
  },

  /**
   * Creates a simple named import
   */
  named: (names: IArray<TsIdent>, from: TsIdentModule): TsImport => {
    const imported = IArray.fromArray([TsImportedDestructured.simple(names)] as TsImported[]);
    const importee = TsImporteeFrom.create(from);
    return TsImport.create(false, imported, importee);
  },

  /**
   * Creates a default import
   */
  default: (name: TsIdentSimple, from: TsIdentModule): TsImport => {
    const imported = IArray.fromArray([TsImportedIdent.create(name)] as TsImported[]);
    const importee = TsImporteeFrom.create(from);
    return TsImport.create(false, imported, importee);
  },

  /**
   * Creates a star import
   */
  star: (alias: Option<TsIdentSimple>, from: TsIdentModule): TsImport => {
    const imported = IArray.fromArray([TsImportedStar.create(alias)] as TsImported[]);
    const importee = TsImporteeFrom.create(from);
    return TsImport.create(false, imported, importee);
  },

  /**
   * Creates a type-only import
   */
  typeOnly: (names: IArray<TsIdent>, from: TsIdentModule): TsImport => {
    const imported = IArray.fromArray([TsImportedDestructured.simple(names)] as TsImported[]);
    const importee = TsImporteeFrom.create(from);
    return TsImport.create(true, imported, importee);
  },

  /**
   * Type guard
   */
  isImport: (tree: TsTree): tree is TsImport => tree._tag === 'TsImport'
};

/**
 * Constructor functions and utilities for TsExportee
 */
export const TsExporteeNames = {
  /**
   * Creates a named exportee
   */
  create: (
    idents: IArray<[TsQIdent, Option<TsIdentSimple>]>,
    fromOpt: Option<TsIdentModule>
  ): TsExporteeNames => {
    return {
      _tag: 'TsExporteeNames',
      idents,
      fromOpt,
      asString: `TsExporteeNames(${idents.length} exports${fromOpt._tag === 'Some' ? ' from ' + fromOpt.value.value : ''})`
    };
  },

  /**
   * Creates a simple named export without re-export
   */
  simple: (idents: IArray<TsQIdent>): TsExporteeNames => {
    const pairs = idents.map(ident => [ident, none] as [TsQIdent, Option<TsIdentSimple>]);
    return TsExporteeNames.create(pairs, none);
  },

  /**
   * Creates a re-export from another module
   */
  reExport: (idents: IArray<TsQIdent>, from: TsIdentModule): TsExporteeNames => {
    const pairs = idents.map(ident => [ident, none] as [TsQIdent, Option<TsIdentSimple>]);
    return TsExporteeNames.create(pairs, some(from));
  },

  /**
   * Type guard
   */
  isExporteeNames: (tree: TsTree): tree is TsExporteeNames => tree._tag === 'TsExporteeNames'
};

export const TsExporteeTree = {
  /**
   * Creates a tree exportee
   */
  create: (decl: TsDecl): TsExporteeTree => {
    return {
      _tag: 'TsExporteeTree',
      decl,
      asString: `TsExporteeTree(${decl.asString})`
    };
  },

  /**
   * Type guard
   */
  isExporteeTree: (tree: TsTree): tree is TsExporteeTree => tree._tag === 'TsExporteeTree'
};

export const TsExporteeStar = {
  /**
   * Creates a star exportee
   */
  create: (as: Option<TsIdentSimple>, from: TsIdentModule): TsExporteeStar => {
    return {
      _tag: 'TsExporteeStar',
      as,
      from,
      asString: `TsExporteeStar(${as._tag === 'Some' ? 'as ' + as.value.value : 'no alias'} from ${from.value})`
    };
  },

  /**
   * Creates a star export with alias
   */
  withAlias: (alias: TsIdentSimple, from: TsIdentModule): TsExporteeStar =>
    TsExporteeStar.create(some(alias), from),

  /**
   * Creates a star export without alias
   */
  withoutAlias: (from: TsIdentModule): TsExporteeStar =>
    TsExporteeStar.create(none, from),

  /**
   * Type guard
   */
  isExporteeStar: (tree: TsTree): tree is TsExporteeStar => tree._tag === 'TsExporteeStar'
};

/**
 * Constructor functions and utilities for TsExport
 */
export const TsExport = {
  /**
   * Creates an export declaration
   */
  create: (
    comments: Comments,
    typeOnly: boolean,
    tpe: ExportType,
    exported: TsExportee
  ): TsExport => {
    return {
      _tag: 'TsExport',
      comments,
      typeOnly,
      tpe,
      exported,
      asString: `TsExport(${typeOnly ? 'type ' : ''}${ExportType.isDefaulted(tpe) ? 'default ' : ''}${exported.asString})`
    };
  },

  /**
   * Creates a named export
   */
  named: (names: IArray<TsQIdent>): TsExport => {
    const exportee = TsExporteeNames.simple(names);
    return TsExport.create(Comments.empty(), false, ExportType.named(), exportee);
  },

  /**
   * Creates a default export
   */
  default: (decl: TsDecl): TsExport => {
    const exportee = TsExporteeTree.create(decl);
    return TsExport.create(Comments.empty(), false, ExportType.defaulted(), exportee);
  },

  /**
   * Creates a star export
   */
  star: (from: TsIdentModule): TsExport => {
    const exportee = TsExporteeStar.withoutAlias(from);
    return TsExport.create(Comments.empty(), false, ExportType.named(), exportee);
  },

  /**
   * Creates a star export with alias
   */
  starAs: (alias: TsIdentSimple, from: TsIdentModule): TsExport => {
    const exportee = TsExporteeStar.withAlias(alias, from);
    return TsExport.create(Comments.empty(), false, ExportType.named(), exportee);
  },

  /**
   * Creates a type-only export
   */
  typeOnly: (names: IArray<TsQIdent>): TsExport => {
    const exportee = TsExporteeNames.simple(names);
    return TsExport.create(Comments.empty(), true, ExportType.named(), exportee);
  },

  /**
   * Creates a re-export
   */
  reExport: (names: IArray<TsQIdent>, from: TsIdentModule): TsExport => {
    const exportee = TsExporteeNames.reExport(names, from);
    return TsExport.create(Comments.empty(), false, ExportType.named(), exportee);
  },

  /**
   * Creates an export with comments
   */
  withComments: (comments: Comments, typeOnly: boolean, tpe: ExportType, exported: TsExportee): TsExport =>
    TsExport.create(comments, typeOnly, tpe, exported),

  /**
   * Type guard
   */
  isExport: (tree: TsTree): tree is TsExport => tree._tag === 'TsExport'
};

/**
 * Constructor functions and utilities for TsExpr
 */
export const TsExprRef = {
  /**
   * Creates a reference expression
   */
  create: (value: TsQIdent): TsExprRef => {
    return {
      _tag: 'TsExprRef',
      value,
      asString: `TsExprRef(${value.asString})`
    };
  },

  /**
   * Creates a simple identifier reference
   */
  simple: (name: string): TsExprRef =>
    TsExprRef.create(TsQIdent.ofStrings(name)),

  /**
   * Type guard
   */
  isExprRef: (tree: TsTree): tree is TsExprRef => tree._tag === 'TsExprRef'
};

export const TsExprLiteral = {
  /**
   * Creates a literal expression
   */
  create: (value: TsLiteral): TsExprLiteral => {
    return {
      _tag: 'TsExprLiteral',
      value,
      asString: `TsExprLiteral(${value.asString})`
    };
  },

  /**
   * Creates a string literal expression
   */
  string: (value: string): TsExprLiteral =>
    TsExprLiteral.create(TsLiteral.str(value)),

  /**
   * Creates a number literal expression
   */
  number: (value: string): TsExprLiteral =>
    TsExprLiteral.create(TsLiteral.num(value)),

  /**
   * Creates a boolean literal expression
   */
  boolean: (value: boolean): TsExprLiteral =>
    TsExprLiteral.create(TsLiteral.bool(value)),

  /**
   * Type guard
   */
  isExprLiteral: (tree: TsTree): tree is TsExprLiteral => tree._tag === 'TsExprLiteral'
};

export const TsExprCall = {
  /**
   * Creates a function call expression
   */
  create: (func: TsExpr, params: IArray<TsExpr>): TsExprCall => {
    return {
      _tag: 'TsExprCall',
      function: func,
      params,
      asString: `TsExprCall(${func.asString}, ${params.length} params)`
    };
  },

  /**
   * Creates a simple function call with no parameters
   */
  noParams: (func: TsExpr): TsExprCall =>
    TsExprCall.create(func, IArray.Empty),

  /**
   * Creates a method call on an object
   */
  method: (obj: TsExpr, methodName: string, params: IArray<TsExpr>): TsExprCall => {
    const objQIdent = obj._tag === 'TsExprRef' ? (obj as TsExprRef).value : TsQIdent.ofStrings('obj');
    const methodQIdent = TsQIdent.append(objQIdent, TsIdent.simple(methodName));
    const methodRef = TsExprRef.create(methodQIdent);
    return TsExprCall.create(methodRef, params);
  },

  /**
   * Type guard
   */
  isExprCall: (tree: TsTree): tree is TsExprCall => tree._tag === 'TsExprCall'
};

export const TsExprUnary = {
  /**
   * Creates a unary operation expression
   */
  create: (op: string, expr: TsExpr): TsExprUnary => {
    return {
      _tag: 'TsExprUnary',
      op,
      expr,
      asString: `TsExprUnary(${op} ${expr.asString})`
    };
  },

  /**
   * Creates a logical NOT expression
   */
  not: (expr: TsExpr): TsExprUnary =>
    TsExprUnary.create('!', expr),

  /**
   * Creates a numeric negation expression
   */
  negate: (expr: TsExpr): TsExprUnary =>
    TsExprUnary.create('-', expr),

  /**
   * Creates a typeof expression
   */
  typeof: (expr: TsExpr): TsExprUnary =>
    TsExprUnary.create('typeof', expr),

  /**
   * Creates a void expression
   */
  void: (expr: TsExpr): TsExprUnary =>
    TsExprUnary.create('void', expr),

  /**
   * Type guard
   */
  isExprUnary: (tree: TsTree): tree is TsExprUnary => tree._tag === 'TsExprUnary'
};

export const TsExprBinaryOp = {
  /**
   * Creates a binary operation expression
   */
  create: (one: TsExpr, op: string, two: TsExpr): TsExprBinaryOp => {
    return {
      _tag: 'TsExprBinaryOp',
      one,
      op,
      two,
      asString: `TsExprBinaryOp(${one.asString} ${op} ${two.asString})`
    };
  },

  /**
   * Creates an addition expression
   */
  add: (left: TsExpr, right: TsExpr): TsExprBinaryOp =>
    TsExprBinaryOp.create(left, '+', right),

  /**
   * Creates a subtraction expression
   */
  subtract: (left: TsExpr, right: TsExpr): TsExprBinaryOp =>
    TsExprBinaryOp.create(left, '-', right),

  /**
   * Creates a multiplication expression
   */
  multiply: (left: TsExpr, right: TsExpr): TsExprBinaryOp =>
    TsExprBinaryOp.create(left, '*', right),

  /**
   * Creates an equality comparison expression
   */
  equals: (left: TsExpr, right: TsExpr): TsExprBinaryOp =>
    TsExprBinaryOp.create(left, '===', right),

  /**
   * Creates a logical AND expression
   */
  and: (left: TsExpr, right: TsExpr): TsExprBinaryOp =>
    TsExprBinaryOp.create(left, '&&', right),

  /**
   * Creates a logical OR expression
   */
  or: (left: TsExpr, right: TsExpr): TsExprBinaryOp =>
    TsExprBinaryOp.create(left, '||', right),

  /**
   * Type guard
   */
  isExprBinaryOp: (tree: TsTree): tree is TsExprBinaryOp => tree._tag === 'TsExprBinaryOp'
};

export const TsExprCast = {
  /**
   * Creates a type cast expression
   */
  create: (expr: TsExpr, tpe: TsType): TsExprCast => {
    return {
      _tag: 'TsExprCast',
      expr,
      tpe,
      asString: `TsExprCast(${expr.asString} as ${tpe.asString})`
    };
  },

  /**
   * Creates a cast to string type
   */
  toString: (expr: TsExpr): TsExprCast =>
    TsExprCast.create(expr, TsTypeRef.string),

  /**
   * Creates a cast to number type
   */
  toNumber: (expr: TsExpr): TsExprCast =>
    TsExprCast.create(expr, TsTypeRef.number),

  /**
   * Creates a cast to any type
   */
  toAny: (expr: TsExpr): TsExprCast =>
    TsExprCast.create(expr, TsTypeRef.any),

  /**
   * Type guard
   */
  isExprCast: (tree: TsTree): tree is TsExprCast => tree._tag === 'TsExprCast'
};

export const TsExprArrayOf = {
  /**
   * Creates an array literal expression
   */
  create: (expr: TsExpr): TsExprArrayOf => {
    return {
      _tag: 'TsExprArrayOf',
      expr,
      asString: `TsExprArrayOf([${expr.asString}])`
    };
  },

  /**
   * Creates an empty array literal
   */
  empty: (): TsExprArrayOf => {
    const emptyExpr = TsExprRef.simple(''); // Placeholder for empty array
    return TsExprArrayOf.create(emptyExpr);
  },

  /**
   * Creates an array with a single element
   */
  single: (element: TsExpr): TsExprArrayOf =>
    TsExprArrayOf.create(element),

  /**
   * Type guard
   */
  isExprArrayOf: (tree: TsTree): tree is TsExprArrayOf => tree._tag === 'TsExprArrayOf'
};

/**
 * Utility functions for working with TypeScript expressions
 */
export const TsExpr = {
  /**
   * Default type for expressions when type cannot be inferred
   */
  Default: TsTypeUnion.simplified(IArray.fromArray([TsTypeRef.string, TsTypeRef.number] as TsType[])),

  /**
   * Formats an expression as a string representation
   */
  format: (expr: TsExpr): string => {
    switch (expr._tag) {
      case 'TsExprRef':
        return (expr as TsExprRef).value.asString;
      case 'TsExprLiteral':
        const litExpr = expr as TsExprLiteral;
        if (TsLiteral.isStr(litExpr.value)) {
          return `"${(litExpr.value as TsLiteralStr).value}"`;
        } else if (TsLiteral.isNum(litExpr.value)) {
          return (litExpr.value as TsLiteralNum).value;
        } else if (TsLiteral.isBool(litExpr.value)) {
          return (litExpr.value as TsLiteralBool).value.toString();
        }
        return litExpr.value.asString;
      case 'TsExprCall':
        const callExpr = expr as TsExprCall;
        const paramStrs = callExpr.params.map(TsExpr.format).toArray().join(', ');
        return `${TsExpr.format(callExpr.function)}(${paramStrs})`;
      case 'TsExprUnary':
        const unaryExpr = expr as TsExprUnary;
        return `${unaryExpr.op}${TsExpr.format(unaryExpr.expr)}`;
      case 'TsExprBinaryOp':
        const binaryExpr = expr as TsExprBinaryOp;
        return `${TsExpr.format(binaryExpr.one)} ${binaryExpr.op} ${TsExpr.format(binaryExpr.two)}`;
      case 'TsExprCast':
        const castExpr = expr as TsExprCast;
        return `${TsExpr.format(castExpr.expr)} as ${castExpr.tpe.asString}`;
      case 'TsExprArrayOf':
        const arrayExpr = expr as TsExprArrayOf;
        return `[${TsExpr.format(arrayExpr.expr)}]`;
      default:
        return 'unknown';
    }
  },

  /**
   * Infers the type of an expression
   */
  typeOf: (expr: TsExpr): TsType => {
    switch (expr._tag) {
      case 'TsExprRef':
        return TsExpr.Default;
      case 'TsExprLiteral':
        const litExpr = expr as TsExprLiteral;
        return TsTypeLiteral.create(litExpr.value);
      case 'TsExprCall':
        return TsTypeRef.any;
      case 'TsExprUnary':
        const unaryExpr = expr as TsExprUnary;
        return TsExpr.widen(TsExpr.typeOf(unaryExpr.expr));
      case 'TsExprCast':
        const castExpr = expr as TsExprCast;
        return castExpr.tpe;
      case 'TsExprArrayOf':
        const arrayExpr = expr as TsExprArrayOf;
        const elementType = TsExpr.typeOf(arrayExpr.expr);
        return TsTypeRef.create(Comments.empty(), TsQIdent.ofStrings('Array'), IArray.fromArray([elementType]));
      case 'TsExprBinaryOp':
        const binaryExpr = expr as TsExprBinaryOp;
        const leftType = TsExpr.typeOf(binaryExpr.one);
        const rightType = TsExpr.typeOf(binaryExpr.two);

        // Handle numeric operations
        if (binaryExpr.op === '+' || binaryExpr.op === '*') {
          if (TsExpr.isNumericLiteral(leftType) && TsExpr.isNumericLiteral(rightType)) {
            // Could implement actual arithmetic here
            return TsTypeRef.number;
          }
        }

        return TsExpr.widen(leftType);
      default:
        return TsExpr.Default;
    }
  },

  /**
   * Infers the type of an optional expression
   */
  typeOfOpt: (exprOpt: Option<TsExpr>): TsType => {
    return exprOpt._tag === 'Some' ? TsExpr.typeOf(exprOpt.value) : TsExpr.Default;
  },

  /**
   * Widens a literal type to its base type
   */
  widen: (tpe: TsType): TsType => {
    if (tpe._tag === 'TsTypeLiteral') {
      const litType = tpe as TsTypeLiteral;
      if (TsLiteral.isStr(litType.literal)) {
        return TsTypeRef.string;
      } else if (TsLiteral.isNum(litType.literal)) {
        return TsTypeRef.number;
      } else if (TsLiteral.isBool(litType.literal)) {
        return TsTypeRef.boolean;
      }
    }

    if (tpe._tag === 'TsTypeRef') {
      const refType = tpe as TsTypeRef;
      if (refType.name.asString === 'string' || refType.name.asString === 'number') {
        return tpe;
      }
    }

    return TsExpr.Default;
  },

  /**
   * Checks if a type represents a numeric literal
   */
  isNumericLiteral: (tpe: TsType): boolean => {
    return tpe._tag === 'TsTypeLiteral' && TsLiteral.isNum((tpe as TsTypeLiteral).literal);
  },

  /**
   * Visits and transforms expressions recursively
   */
  visit: (expr: TsExpr, f: (e: TsExpr) => TsExpr): TsExpr => {
    const transformed = (() => {
      switch (expr._tag) {
        case 'TsExprRef':
        case 'TsExprLiteral':
          return expr;
        case 'TsExprCast':
          const castExpr = expr as TsExprCast;
          return TsExprCast.create(TsExpr.visit(castExpr.expr, f), castExpr.tpe);
        case 'TsExprArrayOf':
          const arrayExpr = expr as TsExprArrayOf;
          return TsExprArrayOf.create(TsExpr.visit(arrayExpr.expr, f));
        case 'TsExprCall':
          const callExpr = expr as TsExprCall;
          const newFunction = TsExpr.visit(callExpr.function, f);
          const newParams = callExpr.params.map((p: TsExpr) => TsExpr.visit(p, f));
          return TsExprCall.create(newFunction, newParams);
        case 'TsExprUnary':
          const unaryExpr = expr as TsExprUnary;
          return TsExprUnary.create(unaryExpr.op, TsExpr.visit(unaryExpr.expr, f));
        case 'TsExprBinaryOp':
          const binaryExpr = expr as TsExprBinaryOp;
          const newOne = TsExpr.visit(binaryExpr.one, f);
          const newTwo = TsExpr.visit(binaryExpr.two, f);
          return TsExprBinaryOp.create(newOne, binaryExpr.op, newTwo);
        default:
          return expr;
      }
    })();

    return f(transformed);
  },

  /**
   * Type guards for expression types
   */
  isRef: (expr: TsExpr): expr is TsExprRef => expr._tag === 'TsExprRef',
  isLiteral: (expr: TsExpr): expr is TsExprLiteral => expr._tag === 'TsExprLiteral',
  isCall: (expr: TsExpr): expr is TsExprCall => expr._tag === 'TsExprCall',
  isUnary: (expr: TsExpr): expr is TsExprUnary => expr._tag === 'TsExprUnary',
  isBinaryOp: (expr: TsExpr): expr is TsExprBinaryOp => expr._tag === 'TsExprBinaryOp',
  isCast: (expr: TsExpr): expr is TsExprCast => expr._tag === 'TsExprCast',
  isArrayOf: (expr: TsExpr): expr is TsExprArrayOf => expr._tag === 'TsExprArrayOf'
};

/**
 * Constructor functions and utilities for TsEnumMember
 */
export const TsEnumMember = {
  /**
   * Creates an enum member
   */
  create: (
    comments: Comments,
    name: TsIdentSimple,
    expr: Option<TsExpr>
  ): TsEnumMember => {
    return {
      _tag: 'TsEnumMember',
      comments,
      name,
      expr,
      asString: `TsEnumMember(${name.value}${expr._tag === 'Some' ? ' = ' + TsExpr.format(expr.value) : ''})`,
      withComments: (cs: Comments) => TsEnumMember.create(cs, name, expr),
      addComment: (c: Comment) => TsEnumMember.create(comments.add(c), name, expr)
    };
  },

  /**
   * Creates an enum member without explicit value (auto-assigned)
   */
  auto: (name: TsIdentSimple): TsEnumMember =>
    TsEnumMember.create(Comments.empty(), name, none),

  /**
   * Creates an enum member with explicit numeric value
   */
  numeric: (name: TsIdentSimple, value: number): TsEnumMember => {
    const expr = TsExprLiteral.number(value.toString());
    return TsEnumMember.create(Comments.empty(), name, some(expr));
  },

  /**
   * Creates an enum member with explicit string value
   */
  string: (name: TsIdentSimple, value: string): TsEnumMember => {
    const expr = TsExprLiteral.string(value);
    return TsEnumMember.create(Comments.empty(), name, some(expr));
  },

  /**
   * Creates an enum member with explicit expression value
   */
  withExpr: (name: TsIdentSimple, expr: TsExpr): TsEnumMember =>
    TsEnumMember.create(Comments.empty(), name, some(expr)),

  /**
   * Creates an enum member with comments
   */
  withComments: (
    comments: Comments,
    name: TsIdentSimple,
    expr: Option<TsExpr>
  ): TsEnumMember =>
    TsEnumMember.create(comments, name, expr),

  /**
   * Initializes enum members with auto-assigned values
   * Assigns numeric values starting from 0 for members without explicit values
   */
  initializeMembers: (members: IArray<TsEnumMember>): IArray<TsEnumMember> => {
    let lastUnspecifiedIndex = 0;
    return members.map((member: TsEnumMember) => {
      if (member.expr._tag === 'None') {
        const autoValue = TsExprLiteral.number(lastUnspecifiedIndex.toString());
        lastUnspecifiedIndex += 1;
        return TsEnumMember.create(member.comments, member.name, some(autoValue));
      } else {
        // Try to extract numeric value to update counter
        const expr = member.expr.value;
        if (TsExpr.isLiteral(expr) && TsLiteral.isNum(expr.value)) {
          const numValue = parseInt((expr.value as any).value, 10);
          if (!isNaN(numValue)) {
            lastUnspecifiedIndex = numValue + 1;
          }
        }
        return member;
      }
    });
  },

  /**
   * Gets the effective value of an enum member
   * Returns the explicit value or inferred auto-assigned value
   */
  getValue: (member: TsEnumMember, index: number): TsExpr => {
    if (member.expr._tag === 'Some') {
      return member.expr.value;
    } else {
      return TsExprLiteral.number(index.toString());
    }
  },

  /**
   * Checks if an enum member has an explicit value
   */
  hasExplicitValue: (member: TsEnumMember): boolean =>
    member.expr._tag === 'Some',

  /**
   * Checks if an enum member is auto-assigned
   */
  isAutoAssigned: (member: TsEnumMember): boolean =>
    member.expr._tag === 'None',

  /**
   * Type guard
   */
  isEnumMember: (tree: TsTree): tree is TsEnumMember => tree._tag === 'TsEnumMember'
};

/**
 * Constructor functions and utilities for advanced TypeScript types
 */

/**
 * Constructor functions for TsTypeConstructor
 */
export const TsTypeConstructor = {
  /**
   * Creates a constructor type
   */
  create: (isAbstract: boolean, signature: TsTypeFunction): TsTypeConstructor => ({
    _tag: 'TsTypeConstructor',
    isAbstract,
    signature,
    asString: `TsTypeConstructor(${isAbstract ? 'abstract ' : ''}new ${signature.asString})`
  }),

  /**
   * Creates a concrete constructor type
   */
  concrete: (signature: TsTypeFunction): TsTypeConstructor =>
    TsTypeConstructor.create(false, signature),

  /**
   * Creates an abstract constructor type
   */
  abstract: (signature: TsTypeFunction): TsTypeConstructor =>
    TsTypeConstructor.create(true, signature),

  /**
   * Type guard
   */
  isTypeConstructor: (tpe: TsType): tpe is TsTypeConstructor => tpe._tag === 'TsTypeConstructor'
};

/**
 * Constructor functions for TsTypeIs
 */
export const TsTypeIs = {
  /**
   * Creates a type predicate with 'is'
   */
  create: (ident: TsIdent, tpe: TsType): TsTypeIs => ({
    _tag: 'TsTypeIs',
    ident,
    tpe,
    asString: `TsTypeIs(${ident.value} is ${tpe.asString})`
  }),

  /**
   * Type guard
   */
  isTypeIs: (tpe: TsType): tpe is TsTypeIs => tpe._tag === 'TsTypeIs'
};

/**
 * Constructor functions for TsTypeAsserts
 */
export const TsTypeAsserts = {
  /**
   * Creates an assertion signature
   */
  create: (ident: TsIdentSimple, isOpt: Option<TsType>): TsTypeAsserts => ({
    _tag: 'TsTypeAsserts',
    ident,
    isOpt,
    asString: `TsTypeAsserts(asserts ${ident.value}${isOpt._tag === 'Some' ? ' is ' + isOpt.value.asString : ''})`
  }),

  /**
   * Creates a simple assertion (asserts x)
   */
  simple: (ident: TsIdentSimple): TsTypeAsserts =>
    TsTypeAsserts.create(ident, none),

  /**
   * Creates a typed assertion (asserts x is Type)
   */
  typed: (ident: TsIdentSimple, tpe: TsType): TsTypeAsserts =>
    TsTypeAsserts.create(ident, some(tpe)),

  /**
   * Type guard
   */
  isTypeAsserts: (tpe: TsType): tpe is TsTypeAsserts => tpe._tag === 'TsTypeAsserts'
};

/**
 * Constructor functions for TsTupleElement
 */
export const TsTupleElement = {
  /**
   * Creates a tuple element
   */
  create: (label: Option<TsIdent>, tpe: TsType): TsTupleElement => ({
    _tag: 'TsTupleElement',
    label,
    tpe,
    asString: `TsTupleElement(${label._tag === 'Some' ? label.value.value + ': ' : ''}${tpe.asString})`
  }),

  /**
   * Creates an unlabeled tuple element
   */
  unlabeled: (tpe: TsType): TsTupleElement =>
    TsTupleElement.create(none, tpe),

  /**
   * Creates a labeled tuple element
   */
  labeled: (label: TsIdent, tpe: TsType): TsTupleElement =>
    TsTupleElement.create(some(label), tpe),

  /**
   * Type guard
   */
  isTupleElement: (tree: TsTree): tree is TsTupleElement => tree._tag === 'TsTupleElement'
};

/**
 * Constructor functions for TsTypeTuple
 */
export const TsTypeTuple = {
  /**
   * Creates a tuple type
   */
  create: (elems: IArray<TsTupleElement>): TsTypeTuple => ({
    _tag: 'TsTypeTuple',
    elems,
    asString: `TsTypeTuple([${elems.toArray().map(e => e.asString).join(', ')}])`
  }),

  /**
   * Creates a tuple from types (unlabeled)
   */
  fromTypes: (types: IArray<TsType>): TsTypeTuple =>
    TsTypeTuple.create(types.map(TsTupleElement.unlabeled)),

  /**
   * Creates an empty tuple
   */
  empty: (): TsTypeTuple =>
    TsTypeTuple.create(IArray.Empty),

  /**
   * Type guard
   */
  isTypeTuple: (tpe: TsType): tpe is TsTypeTuple => tpe._tag === 'TsTypeTuple'
};

/**
 * Constructor functions for TsTypeQuery
 */
export const TsTypeQuery = {
  /**
   * Creates a typeof query
   */
  create: (expr: TsQIdent): TsTypeQuery => ({
    _tag: 'TsTypeQuery',
    expr,
    asString: `TsTypeQuery(typeof ${expr.asString})`
  }),

  /**
   * Creates a typeof query from a simple identifier
   */
  simple: (name: string): TsTypeQuery =>
    TsTypeQuery.create(TsQIdent.ofStrings(name)),

  /**
   * Type guard
   */
  isTypeQuery: (tpe: TsType): tpe is TsTypeQuery => tpe._tag === 'TsTypeQuery'
};

/**
 * Constructor functions for TsTypeRepeated
 */
export const TsTypeRepeated = {
  /**
   * Creates a repeated/rest type
   */
  create: (underlying: TsType): TsTypeRepeated => ({
    _tag: 'TsTypeRepeated',
    underlying,
    asString: `TsTypeRepeated(...${underlying.asString})`
  }),

  /**
   * Type guard
   */
  isTypeRepeated: (tpe: TsType): tpe is TsTypeRepeated => tpe._tag === 'TsTypeRepeated'
};

/**
 * Constructor functions for TsTypeKeyOf
 */
export const TsTypeKeyOf = {
  /**
   * Creates a keyof type
   */
  create: (key: TsType): TsTypeKeyOf => ({
    _tag: 'TsTypeKeyOf',
    key,
    asString: `TsTypeKeyOf(keyof ${key.asString})`
  }),

  /**
   * Type guard
   */
  isTypeKeyOf: (tpe: TsType): tpe is TsTypeKeyOf => tpe._tag === 'TsTypeKeyOf'
};

/**
 * Constructor functions for TsTypeLookup
 */
export const TsTypeLookup = {
  /**
   * Creates an indexed access type
   */
  create: (from: TsType, key: TsType): TsTypeLookup => ({
    _tag: 'TsTypeLookup',
    from,
    key,
    asString: `TsTypeLookup(${from.asString}[${key.asString}])`
  }),

  /**
   * Type guard
   */
  isTypeLookup: (tpe: TsType): tpe is TsTypeLookup => tpe._tag === 'TsTypeLookup'
};

/**
 * Constructor functions for TsTypeThis
 */
export const TsTypeThis = {
  /**
   * Creates a 'this' type
   */
  create: (): TsTypeThis => ({
    _tag: 'TsTypeThis',
    asString: 'TsTypeThis(this)'
  }),

  /**
   * Singleton instance
   */
  instance: {
    _tag: 'TsTypeThis' as const,
    asString: 'TsTypeThis(this)'
  },

  /**
   * Type guard
   */
  isTypeThis: (tpe: TsType): tpe is TsTypeThis => tpe._tag === 'TsTypeThis'
};

/**
 * Constructor functions for TsTypeConditional
 */
export const TsTypeConditional = {
  /**
   * Creates a conditional type
   */
  create: (pred: TsType, ifTrue: TsType, ifFalse: TsType): TsTypeConditional => ({
    _tag: 'TsTypeConditional',
    pred,
    ifTrue,
    ifFalse,
    asString: `TsTypeConditional(${pred.asString} ? ${ifTrue.asString} : ${ifFalse.asString})`
  }),

  /**
   * Type guard
   */
  isTypeConditional: (tpe: TsType): tpe is TsTypeConditional => tpe._tag === 'TsTypeConditional'
};

/**
 * Constructor functions for TsTypeExtends
 */
export const TsTypeExtends = {
  /**
   * Creates an extends clause
   */
  create: (tpe: TsType, extends_: TsType): TsTypeExtends => ({
    _tag: 'TsTypeExtends',
    tpe,
    extends: extends_,
    asString: `TsTypeExtends(${tpe.asString} extends ${extends_.asString})`
  }),

  /**
   * Type guard
   */
  isTypeExtends: (tpe: TsType): tpe is TsTypeExtends => tpe._tag === 'TsTypeExtends'
};

/**
 * Constructor functions for TsTypeInfer
 */
export const TsTypeInfer = {
  /**
   * Creates an infer type
   */
  create: (tparam: TsTypeParam): TsTypeInfer => ({
    _tag: 'TsTypeInfer',
    tparam,
    asString: `TsTypeInfer(infer ${tparam.name.value})`
  }),

  /**
   * Type guard
   */
  isTypeInfer: (tpe: TsType): tpe is TsTypeInfer => tpe._tag === 'TsTypeInfer'
};