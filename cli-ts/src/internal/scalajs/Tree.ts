/**
 * TypeScript port of org.scalablytyped.converter.internal.scalajs.tree
 *
 * Represents the ScalaJS tree structure for the converter
 */

import { Comments } from "../Comments.js";
import { IArray } from "../IArray.js";
import type { Annotation } from "./Annotation.js";
import type { Name } from "./Name.js";
import { QualifiedName } from "./QualifiedName.js";

// ============================================================================
// Base Tree Types
// ============================================================================

/**
 * Base interface for all tree nodes
 * Equivalent to Scala's sealed trait Tree
 */
export interface Tree {
	readonly _tag: string;
	readonly name: Name;
	readonly comments: Comments;
}

/**
 * Interface for trees that have a code path
 * Equivalent to Scala's trait HasCodePath
 */
export interface HasCodePath {
	readonly codePath: QualifiedName;
}

/**
 * Interface for trees that have annotations
 * Equivalent to Scala's trait HasAnnotations
 */
export interface HasAnnotations {
	readonly annotations: IArray<Annotation>;
}

/**
 * Interface for trees that have members
 * Equivalent to Scala's trait HasMembers
 */
export interface HasMembers {
	readonly members: IArray<Tree>;
}

// ============================================================================
// Container Trees
// ============================================================================

/**
 * Base interface for container trees
 * Equivalent to Scala's sealed trait ContainerTree
 */
export interface ContainerTree extends Tree, HasCodePath, HasAnnotations, HasMembers {
	withMembers(members: IArray<Tree>): ContainerTree;
}

/**
 * Base interface for inheritance trees
 * Equivalent to Scala's sealed trait InheritanceTree
 */
export interface InheritanceTree extends Tree, HasCodePath, HasAnnotations, HasMembers {
	readonly parents: IArray<TypeRef>;
	readonly isOverride: boolean;
}

// ============================================================================
// Specific Tree Types
// ============================================================================

/**
 * Package tree implementation
 * Equivalent to Scala's case class PackageTree
 */
export interface PackageTree extends ContainerTree {
	readonly _tag: "PackageTree";
	readonly annotations: IArray<Annotation>;
	readonly name: Name;
	readonly members: IArray<Tree>;
	readonly comments: Comments;
	readonly codePath: QualifiedName;
}

/**
 * Module tree implementation
 * Equivalent to Scala's case class ModuleTree
 */
export interface ModuleTree extends ContainerTree, InheritanceTree {
	readonly _tag: "ModuleTree";
	readonly annotations: IArray<Annotation>;
	readonly level: ProtectionLevel;
	readonly name: Name;
	readonly parents: IArray<TypeRef>;
	readonly members: IArray<Tree>;
	readonly comments: Comments;
	readonly codePath: QualifiedName;
	readonly isOverride: boolean;
}

/**
 * Member tree base interface
 * Equivalent to Scala's sealed trait MemberTree
 */
export interface MemberTree extends Tree, HasCodePath, HasAnnotations {
	readonly isOverride: boolean;
	readonly impl: ImplTree;
	withCodePath(newCodePath: QualifiedName): MemberTree;
	renamed(newName: Name): MemberTree;
}

/**
 * Field tree implementation
 * Equivalent to Scala's case class FieldTree
 */
export interface FieldTree extends MemberTree {
	readonly _tag: "FieldTree";
	readonly annotations: IArray<Annotation>;
	readonly level: ProtectionLevel;
	readonly name: Name;
	readonly tpe: TypeRef;
	readonly impl: ImplTree;
	readonly isReadOnly: boolean;
	readonly isOverride: boolean;
	readonly comments: Comments;
	readonly codePath: QualifiedName;
}

/**
 * Method tree implementation
 * Equivalent to Scala's case class MethodTree
 */
export interface MethodTree extends MemberTree {
	readonly _tag: "MethodTree";
	readonly annotations: IArray<Annotation>;
	readonly level: ProtectionLevel;
	readonly name: Name;
	readonly tparams: IArray<TypeParamTree>;
	readonly params: IArray<IArray<ParamTree>>;
	readonly impl: ImplTree;
	readonly resultType: TypeRef;
	readonly isOverride: boolean;
	readonly comments: Comments;
	readonly codePath: QualifiedName;
	readonly isImplicit: boolean;
}

/**
 * Type alias tree implementation
 * Equivalent to Scala's case class TypeAliasTree
 */
export interface TypeAliasTree extends Tree, HasCodePath {
	readonly _tag: "TypeAliasTree";
	readonly name: Name;
	readonly level: ProtectionLevel;
	readonly tparams: IArray<TypeParamTree>;
	readonly alias: TypeRef;
	readonly comments: Comments;
	readonly codePath: QualifiedName;
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Protection level enumeration
 * Equivalent to Scala's ProtectionLevel
 */
export enum ProtectionLevel {
	Public = "Public",
	Protected = "Protected",
	Private = "Private"
}

/**
 * Implementation tree type
 * Equivalent to Scala's ImplTree
 */
export type ImplTree = 
	| { readonly _tag: "NotImplemented" }
	| { readonly _tag: "ExprTree"; readonly value: any };

/**
 * NotImplemented singleton
 */
export const NotImplemented: ImplTree = { _tag: "NotImplemented" };

/**
 * Type reference interface
 * Equivalent to Scala's TypeRef
 */
export interface TypeRef {
	readonly typeName: QualifiedName;
	readonly targs: IArray<TypeRef>;
	readonly comments: Comments;
}

/**
 * Type parameter tree interface
 * Equivalent to Scala's TypeParamTree
 */
export interface TypeParamTree extends Tree {
	readonly _tag: "TypeParamTree";
	readonly name: Name;
	readonly params: IArray<TypeParamTree>;
	readonly upperBound: TypeRef | undefined;
	readonly comments: Comments;
	readonly ignoreBound: boolean;
}

/**
 * Parameter tree interface
 * Equivalent to Scala's ParamTree
 */
export interface ParamTree extends Tree {
	readonly _tag: "ParamTree";
	readonly name: Name;
	readonly tpe: TypeRef;
	readonly comments: Comments;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isFieldTree(tree: Tree): tree is FieldTree {
	return tree._tag === "FieldTree";
}

export function isMethodTree(tree: Tree): tree is MethodTree {
	return tree._tag === "MethodTree";
}

export function isContainerTree(tree: Tree): tree is ContainerTree {
	return tree._tag === "PackageTree" || tree._tag === "ModuleTree";
}

export function isPackageTree(tree: Tree): tree is PackageTree {
	return tree._tag === "PackageTree";
}

export function isModuleTree(tree: Tree): tree is ModuleTree {
	return tree._tag === "ModuleTree";
}

export function isMemberTree(tree: Tree): tree is MemberTree {
	return tree._tag === "FieldTree" || tree._tag === "MethodTree";
}

export function isTypeAliasTree(tree: Tree): tree is TypeAliasTree {
	return tree._tag === "TypeAliasTree";
}

// ============================================================================
// TypeRef Utilities
// ============================================================================

/**
 * TypeRef factory and utilities
 * Equivalent to Scala's object TypeRef
 */
export const TypeRef = {
	/**
	 * Create a TypeRef
	 */
	create: (typeName: QualifiedName, targs: IArray<TypeRef> = IArray.Empty, comments: Comments = Comments.empty()): TypeRef => ({
		typeName,
		targs,
		comments
	}),

	/**
	 * Create an intersection type
	 * Equivalent to Scala's TypeRef.Intersection
	 */
	Intersection: (types: IArray<TypeRef>, comments: Comments = Comments.empty()): TypeRef => ({
		typeName: QualifiedName.INTERSECTION,
		targs: types,
		comments
	}),

	// Common type references - defined as getters to avoid circular reference
	get String(): TypeRef {
		return TypeRef.create(QualifiedName.String);
	},

	get Unit(): TypeRef {
		return TypeRef.create(QualifiedName.Unit);
	},

	get Boolean(): TypeRef {
		return TypeRef.create(QualifiedName.Boolean);
	},
};
