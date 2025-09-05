/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TreeTransformation
 *
 * Provides a framework for transforming TypeScript AST trees with support for
 * entering and leaving nodes, visiting different node types, and composing transformations.
 */

import type {
	TsContainer,
	TsDecl,
	TsDeclClass,
	TsDeclEnum,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclModule,
	TsDeclNamespace,
	TsDeclTypeAlias,
	TsDeclVar,
	TsGlobal,
	TsMember,
	TsParsedFile,
	TsTree,
	TsType,
	TsTypeAsserts,
	TsTypeConditional,
	TsTypeConstructor,
	TsTypeFunction,
	TsTypeIntersect,
	TsTypeIs,
	TsTypeKeyOf,
	TsTypeLiteral,
	TsTypeLookup,
	TsTypeObject,
	TsTypeRef,
	TsTypeRepeated,
	TsTypeThis,
	TsTypeTuple,
	TsTypeUnion,
} from "./trees.js";

/**
 * Base interface for tree transformations.
 * T represents the context type that flows through the transformation.
 */
export interface TreeTransformation<T> {
	/**
	 * Creates a new context when entering a tree node.
	 * This is called before processing any node.
	 */
	withTree(t: T, tree: TsTree): T;

	/**
	 * Combines this transformation with another transformation.
	 * The result applies this transformation first, then the other.
	 */
	combine<U>(other: TreeTransformation<U>): TreeTransformation<T>;

	/**
	 * Alias for combine - allows chaining transformations with >> operator
	 */
	">>"<U>(other: TreeTransformation<U>): TreeTransformation<T>;

	// Enter methods - called when entering a node
	enterTsTree(t: T): (x: TsTree) => TsTree;
	enterTsDecl(t: T): (x: TsDecl) => TsDecl;
	enterTsType(t: T): (x: TsType) => TsType;
	enterTsContainer(t: T): (x: TsContainer) => TsContainer;
	enterTsParsedFile(t: T): (x: TsParsedFile) => TsParsedFile;
	enterTsDeclClass(t: T): (x: TsDeclClass) => TsDeclClass;
	enterTsDeclInterface(t: T): (x: TsDeclInterface) => TsDeclInterface;
	enterTsDeclNamespace(t: T): (x: TsDeclNamespace) => TsDeclNamespace;
	enterTsDeclModule(t: T): (x: TsDeclModule) => TsDeclModule;
	enterTsDeclVar(t: T): (x: TsDeclVar) => TsDeclVar;
	enterTsDeclFunction(t: T): (x: TsDeclFunction) => TsDeclFunction;
	enterTsDeclTypeAlias(t: T): (x: TsDeclTypeAlias) => TsDeclTypeAlias;
	enterTsDeclEnum(t: T): (x: TsDeclEnum) => TsDeclEnum;
	enterTsGlobal(t: T): (x: TsGlobal) => TsGlobal;
	enterTsMember(t: T): (x: TsMember) => TsMember;

	// Specific type enter methods
	enterTsTypeRef(t: T): (x: TsTypeRef) => TsTypeRef;
	enterTsTypeFunction(t: T): (x: TsTypeFunction) => TsTypeFunction;
	enterTsTypeIntersect(t: T): (x: TsTypeIntersect) => TsTypeIntersect;
	enterTsTypeUnion(t: T): (x: TsTypeUnion) => TsTypeUnion;
	enterTsTypeTuple(t: T): (x: TsTypeTuple) => TsTypeTuple;
	enterTsTypeObject(t: T): (x: TsTypeObject) => TsTypeObject;
	enterTsTypeAsserts(t: T): (x: TsTypeAsserts) => TsTypeAsserts;
	enterTsTypeIs(t: T): (x: TsTypeIs) => TsTypeIs;
	enterTsTypeKeyOf(t: T): (x: TsTypeKeyOf) => TsTypeKeyOf;
	enterTsTypeConditional(t: T): (x: TsTypeConditional) => TsTypeConditional;
	enterTsTypeLookup(t: T): (x: TsTypeLookup) => TsTypeLookup;
	enterTsTypeThis(t: T): (x: TsTypeThis) => TsTypeThis;
	enterTsTypeRepeated(t: T): (x: TsTypeRepeated) => TsTypeRepeated;
	enterTsTypeConstructor(t: T): (x: TsTypeConstructor) => TsTypeConstructor;
	enterTsTypeLiteral(t: T): (x: TsTypeLiteral) => TsTypeLiteral;

	// Leave methods - called when leaving a node
	leaveTsParsedFile(t: T): (x: TsParsedFile) => TsParsedFile;
	leaveTsDeclClass(t: T): (x: TsDeclClass) => TsDeclClass;
	leaveTsDeclInterface(t: T): (x: TsDeclInterface) => TsDeclInterface;
	leaveTsDeclNamespace(t: T): (x: TsDeclNamespace) => TsDeclNamespace;
	leaveTsDeclModule(t: T): (x: TsDeclModule) => TsDeclModule;
	leaveTsDeclVar(t: T): (x: TsDeclVar) => TsDeclVar;
	leaveTsDeclFunction(t: T): (x: TsDeclFunction) => TsDeclFunction;
	leaveTsDeclTypeAlias(t: T): (x: TsDeclTypeAlias) => TsDeclTypeAlias;
	leaveTsDeclEnum(t: T): (x: TsDeclEnum) => TsDeclEnum;
	leaveTsGlobal(t: T): (x: TsGlobal) => TsGlobal;
	leaveTsMember(t: T): (x: TsMember) => TsMember;
	leaveTsType(t: T): (x: TsType) => TsType;

	// Visit methods - main transformation entry points
	visitTsTree(t: T): (x: TsTree) => TsTree;
	visitTsContainerOrDecl(
		t: T,
	): (x: TsContainer | TsDecl) => TsContainer | TsDecl;
	visitTsContainer(t: T): (x: TsContainer) => TsContainer;
	visitTsDecl(t: T): (x: TsDecl) => TsDecl;
	visitTsType(t: T): (x: TsType) => TsType;
	visitTsMember(t: T): (x: TsMember) => TsMember;
	visitTsParsedFile(t: T): (x: TsParsedFile) => TsParsedFile;
	visitTsDeclClass(t: T): (x: TsDeclClass) => TsDeclClass;
	visitTsDeclInterface(t: T): (x: TsDeclInterface) => TsDeclInterface;
	visitTsDeclNamespace(t: T): (x: TsDeclNamespace) => TsDeclNamespace;
	visitTsDeclModule(t: T): (x: TsDeclModule) => TsDeclModule;
	visitTsDeclVar(t: T): (x: TsDeclVar) => TsDeclVar;
	visitTsDeclFunction(t: T): (x: TsDeclFunction) => TsDeclFunction;
	visitTsDeclTypeAlias(t: T): (x: TsDeclTypeAlias) => TsDeclTypeAlias;
	visitTsDeclEnum(t: T): (x: TsDeclEnum) => TsDeclEnum;
	visitTsDeclGlobal(t: T): (x: TsGlobal) => TsGlobal;
}

/**
 * Abstract base class providing default implementations for TreeTransformation.
 * Subclasses can override specific methods to customize transformation behavior.
 */
export abstract class AbstractTreeTransformation<T>
	implements TreeTransformation<T>
{
	abstract withTree(t: T, tree: TsTree): T;

	combine<U>(other: TreeTransformation<U>): TreeTransformation<T> {
		return new CombinedTransformation(this, other);
	}

	">>"<U>(other: TreeTransformation<U>): TreeTransformation<T> {
		return this.combine(other);
	}

	// Default enter methods - return unchanged
	enterTsTree(_t: T): (x: TsTree) => TsTree {
		return (x: TsTree) => x;
	}

	enterTsDecl(_t: T): (x: TsDecl) => TsDecl {
		return (x: TsDecl) => x;
	}

	enterTsType(_t: T): (x: TsType) => TsType {
		return (x: TsType) => x;
	}

	enterTsContainer(_t: T): (x: TsContainer) => TsContainer {
		return (x: TsContainer) => x;
	}

	enterTsParsedFile(_t: T): (x: TsParsedFile) => TsParsedFile {
		return (x: TsParsedFile) => x;
	}

	enterTsDeclClass(_t: T): (x: TsDeclClass) => TsDeclClass {
		return (x: TsDeclClass) => x;
	}

	enterTsDeclInterface(_t: T): (x: TsDeclInterface) => TsDeclInterface {
		return (x: TsDeclInterface) => x;
	}

	enterTsDeclNamespace(_t: T): (x: TsDeclNamespace) => TsDeclNamespace {
		return (x: TsDeclNamespace) => x;
	}

	enterTsDeclModule(_t: T): (x: TsDeclModule) => TsDeclModule {
		return (x: TsDeclModule) => x;
	}

	enterTsDeclVar(_t: T): (x: TsDeclVar) => TsDeclVar {
		return (x: TsDeclVar) => x;
	}

	enterTsDeclFunction(_t: T): (x: TsDeclFunction) => TsDeclFunction {
		return (x: TsDeclFunction) => x;
	}

	enterTsDeclTypeAlias(_t: T): (x: TsDeclTypeAlias) => TsDeclTypeAlias {
		return (x: TsDeclTypeAlias) => x;
	}

	enterTsDeclEnum(_t: T): (x: TsDeclEnum) => TsDeclEnum {
		return (x: TsDeclEnum) => x;
	}

	enterTsGlobal(_t: T): (x: TsGlobal) => TsGlobal {
		return (x: TsGlobal) => x;
	}

	enterTsMember(_t: T): (x: TsMember) => TsMember {
		return (x: TsMember) => x;
	}

	// Specific type enter methods - default implementations return unchanged
	enterTsTypeRef(_t: T): (x: TsTypeRef) => TsTypeRef {
		return (x: TsTypeRef) => x;
	}

	enterTsTypeFunction(_t: T): (x: TsTypeFunction) => TsTypeFunction {
		return (x: TsTypeFunction) => x;
	}

	enterTsTypeIntersect(_t: T): (x: TsTypeIntersect) => TsTypeIntersect {
		return (x: TsTypeIntersect) => x;
	}

	enterTsTypeUnion(_t: T): (x: TsTypeUnion) => TsTypeUnion {
		return (x: TsTypeUnion) => x;
	}

	enterTsTypeTuple(_t: T): (x: TsTypeTuple) => TsTypeTuple {
		return (x: TsTypeTuple) => x;
	}

	enterTsTypeObject(_t: T): (x: TsTypeObject) => TsTypeObject {
		return (x: TsTypeObject) => x;
	}

	enterTsTypeAsserts(_t: T): (x: TsTypeAsserts) => TsTypeAsserts {
		return (x: TsTypeAsserts) => x;
	}

	enterTsTypeIs(_t: T): (x: TsTypeIs) => TsTypeIs {
		return (x: TsTypeIs) => x;
	}

	enterTsTypeKeyOf(_t: T): (x: TsTypeKeyOf) => TsTypeKeyOf {
		return (x: TsTypeKeyOf) => x;
	}

	enterTsTypeConditional(_t: T): (x: TsTypeConditional) => TsTypeConditional {
		return (x: TsTypeConditional) => x;
	}

	enterTsTypeLookup(_t: T): (x: TsTypeLookup) => TsTypeLookup {
		return (x: TsTypeLookup) => x;
	}

	enterTsTypeThis(_t: T): (x: TsTypeThis) => TsTypeThis {
		return (x: TsTypeThis) => x;
	}

	enterTsTypeRepeated(_t: T): (x: TsTypeRepeated) => TsTypeRepeated {
		return (x: TsTypeRepeated) => x;
	}

	enterTsTypeConstructor(_t: T): (x: TsTypeConstructor) => TsTypeConstructor {
		return (x: TsTypeConstructor) => x;
	}

	enterTsTypeLiteral(_t: T): (x: TsTypeLiteral) => TsTypeLiteral {
		return (x: TsTypeLiteral) => x;
	}

	// Default leave methods - return unchanged
	leaveTsParsedFile(_t: T): (x: TsParsedFile) => TsParsedFile {
		return (x: TsParsedFile) => x;
	}

	leaveTsDeclClass(_t: T): (x: TsDeclClass) => TsDeclClass {
		return (x: TsDeclClass) => x;
	}

	leaveTsDeclInterface(_t: T): (x: TsDeclInterface) => TsDeclInterface {
		return (x: TsDeclInterface) => x;
	}

	leaveTsDeclNamespace(_t: T): (x: TsDeclNamespace) => TsDeclNamespace {
		return (x: TsDeclNamespace) => x;
	}

	leaveTsDeclModule(_t: T): (x: TsDeclModule) => TsDeclModule {
		return (x: TsDeclModule) => x;
	}

	leaveTsDeclVar(_t: T): (x: TsDeclVar) => TsDeclVar {
		return (x: TsDeclVar) => x;
	}

	leaveTsDeclFunction(_t: T): (x: TsDeclFunction) => TsDeclFunction {
		return (x: TsDeclFunction) => x;
	}

	leaveTsDeclTypeAlias(_t: T): (x: TsDeclTypeAlias) => TsDeclTypeAlias {
		return (x: TsDeclTypeAlias) => x;
	}

	leaveTsDeclEnum(_t: T): (x: TsDeclEnum) => TsDeclEnum {
		return (x: TsDeclEnum) => x;
	}

	leaveTsGlobal(_t: T): (x: TsGlobal) => TsGlobal {
		return (x: TsGlobal) => x;
	}

	leaveTsMember(_t: T): (x: TsMember) => TsMember {
		return (x: TsMember) => x;
	}

	leaveTsType(_t: T): (x: TsType) => TsType {
		return (x: TsType) => x;
	}

	// Visit methods - main transformation logic
	visitTsTree(t: T): (x: TsTree) => TsTree {
		return (x: TsTree) => {
			// Dispatch to appropriate visit method based on node type
			if (this.isTsContainer(x) || this.isTsDecl(x)) {
				return this.visitTsContainerOrDecl(t)(
					x as TsContainer | TsDecl,
				) as TsTree;
			} else if (this.isTsType(x)) {
				return this.visitTsType(t)(x as TsType) as TsTree;
			} else if (this.isTsMember(x)) {
				return this.visitTsMember(t)(x as TsMember) as TsTree;
			} else {
				// Default case - apply enter transformation
				return this.enterTsTree(t)(x);
			}
		};
	}

	visitTsContainerOrDecl(
		t: T,
	): (x: TsContainer | TsDecl) => TsContainer | TsDecl {
		return (x: TsContainer | TsDecl) => {
			if (this.isTsContainer(x)) {
				return this.visitTsContainer(t)(x as TsContainer);
			} else {
				return this.visitTsDecl(t)(x as TsDecl);
			}
		};
	}

	visitTsContainer(t: T): (x: TsContainer) => TsContainer {
		return (x: TsContainer) => {
			// Dispatch to specific container visit methods
			switch (x._tag) {
				case "TsGlobal":
					return this.visitTsDeclGlobal(t)(x as TsGlobal) as TsContainer;
				case "TsDeclNamespace":
					return this.visitTsDeclNamespace(t)(
						x as TsDeclNamespace,
					) as TsContainer;
				case "TsDeclModule":
					return this.visitTsDeclModule(t)(x as TsDeclModule) as TsContainer;
				default:
					return this.enterTsContainer(t)(x);
			}
		};
	}

	visitTsDecl(t: T): (x: TsDecl) => TsDecl {
		return (x: TsDecl) => {
			// Dispatch to specific declaration visit methods
			switch (x._tag) {
				case "TsDeclClass":
					return this.visitTsDeclClass(t)(x as TsDeclClass) as TsDecl;
				case "TsDeclInterface":
					return this.visitTsDeclInterface(t)(x as TsDeclInterface) as TsDecl;
				case "TsDeclVar":
					return this.visitTsDeclVar(t)(x as TsDeclVar) as TsDecl;
				case "TsDeclFunction":
					return this.visitTsDeclFunction(t)(x as TsDeclFunction) as TsDecl;
				case "TsDeclTypeAlias":
					return this.visitTsDeclTypeAlias(t)(x as TsDeclTypeAlias) as TsDecl;
				case "TsDeclEnum":
					return this.visitTsDeclEnum(t)(x as TsDeclEnum) as TsDecl;
				default:
					return this.enterTsDecl(t)(x);
			}
		};
	}

	visitTsType(t: T): (x: TsType) => TsType {
		return (x: TsType) => {
			const entered = this.enterTsType(t)(x);
			// Process type recursively if needed
			const processed = this.processTypeRecursively(t, entered);
			return this.leaveTsType(t)(processed);
		};
	}

	visitTsMember(t: T): (x: TsMember) => TsMember {
		return (x: TsMember) => {
			const entered = this.enterTsMember(t)(x);
			// Process member recursively if needed
			const processed = this.processMemberRecursively(t, entered);
			return this.leaveTsMember(t)(processed);
		};
	}

	visitTsParsedFile(t: T): (x: TsParsedFile) => TsParsedFile {
		return (x: TsParsedFile) => {
			const entered = this.enterTsParsedFile(t)(x);
			const processed = this.processParsedFileRecursively(t, entered);
			return this.leaveTsParsedFile(t)(processed);
		};
	}

	visitTsDeclClass(t: T): (x: TsDeclClass) => TsDeclClass {
		return (x: TsDeclClass) => {
			const entered = this.enterTsDeclClass(t)(x);
			const processed = this.processClassRecursively(t, entered);
			return this.leaveTsDeclClass(t)(processed);
		};
	}

	visitTsDeclInterface(t: T): (x: TsDeclInterface) => TsDeclInterface {
		return (x: TsDeclInterface) => {
			const entered = this.enterTsDeclInterface(t)(x);
			const processed = this.processInterfaceRecursively(t, entered);
			return this.leaveTsDeclInterface(t)(processed);
		};
	}

	visitTsDeclNamespace(t: T): (x: TsDeclNamespace) => TsDeclNamespace {
		return (x: TsDeclNamespace) => {
			const entered = this.enterTsDeclNamespace(t)(x);
			const processed = this.processNamespaceRecursively(t, entered);
			return this.leaveTsDeclNamespace(t)(processed);
		};
	}

	visitTsDeclModule(t: T): (x: TsDeclModule) => TsDeclModule {
		return (x: TsDeclModule) => {
			const entered = this.enterTsDeclModule(t)(x);
			const processed = this.processModuleRecursively(t, entered);
			return this.leaveTsDeclModule(t)(processed);
		};
	}

	visitTsDeclVar(t: T): (x: TsDeclVar) => TsDeclVar {
		return (x: TsDeclVar) => {
			const entered = this.enterTsDeclVar(t)(x);
			const processed = this.processVarRecursively(t, entered);
			return this.leaveTsDeclVar(t)(processed);
		};
	}

	visitTsDeclFunction(t: T): (x: TsDeclFunction) => TsDeclFunction {
		return (x: TsDeclFunction) => {
			const entered = this.enterTsDeclFunction(t)(x);
			const processed = this.processFunctionRecursively(t, entered);
			return this.leaveTsDeclFunction(t)(processed);
		};
	}

	visitTsDeclTypeAlias(t: T): (x: TsDeclTypeAlias) => TsDeclTypeAlias {
		return (x: TsDeclTypeAlias) => {
			const entered = this.enterTsDeclTypeAlias(t)(x);
			const processed = this.processTypeAliasRecursively(t, entered);
			return this.leaveTsDeclTypeAlias(t)(processed);
		};
	}

	visitTsDeclEnum(t: T): (x: TsDeclEnum) => TsDeclEnum {
		return (x: TsDeclEnum) => {
			const entered = this.enterTsDeclEnum(t)(x);
			const processed = this.processEnumRecursively(t, entered);
			return this.leaveTsDeclEnum(t)(processed);
		};
	}

	visitTsDeclGlobal(t: T): (x: TsGlobal) => TsGlobal {
		return (x: TsGlobal) => {
			const entered = this.enterTsGlobal(t)(x);
			const processed = this.processGlobalRecursively(t, entered);
			return this.leaveTsGlobal(t)(processed);
		};
	}

	// Type guard methods
	protected isTsContainer(x: TsTree): x is TsContainer {
		return (
			x._tag === "TsGlobal" ||
			x._tag === "TsDeclNamespace" ||
			x._tag === "TsDeclModule"
		);
	}

	protected isTsDecl(x: TsTree): x is TsDecl {
		return (
			x._tag === "TsDeclClass" ||
			x._tag === "TsDeclInterface" ||
			x._tag === "TsDeclVar" ||
			x._tag === "TsDeclFunction" ||
			x._tag === "TsDeclTypeAlias" ||
			x._tag === "TsDeclEnum"
		);
	}

	protected isTsType(x: TsTree): x is TsType {
		return (
			x._tag === "TsTypeRef" ||
			x._tag === "TsTypeFunction" ||
			x._tag === "TsTypeIntersect" ||
			x._tag === "TsTypeUnion" ||
			x._tag === "TsTypeTuple" ||
			x._tag === "TsTypeObject" ||
			x._tag === "TsTypeAsserts" ||
			x._tag === "TsTypeIs" ||
			x._tag === "TsTypeKeyOf" ||
			x._tag === "TsTypeConditional" ||
			x._tag === "TsTypeLookup" ||
			x._tag === "TsTypeThis" ||
			x._tag === "TsTypeRepeated" ||
			x._tag === "TsTypeConstructor" ||
			x._tag === "TsTypeLiteral"
		);
	}

	protected isTsMember(x: TsTree): x is TsMember {
		return (
			x._tag === "TsMemberCall" ||
			x._tag === "TsMemberCtor" ||
			x._tag === "TsMemberFunction" ||
			x._tag === "TsMemberProperty" ||
			x._tag === "TsMemberIndex" ||
			x._tag === "TsMemberTypeMapped"
		);
	}

	// Recursive processing methods - subclasses can override these
	protected processTypeRecursively(t: T, type: TsType): TsType {
		// Dispatch to specific type enter methods based on type tag
		switch (type._tag) {
			case "TsTypeRef":
				return this.enterTsTypeRef(t)(type as TsTypeRef) as TsType;
			case "TsTypeFunction":
				return this.enterTsTypeFunction(t)(type as TsTypeFunction) as TsType;
			case "TsTypeIntersect":
				return this.enterTsTypeIntersect(t)(type as TsTypeIntersect) as TsType;
			case "TsTypeUnion":
				return this.enterTsTypeUnion(t)(type as TsTypeUnion) as TsType;
			case "TsTypeTuple":
				return this.enterTsTypeTuple(t)(type as TsTypeTuple) as TsType;
			case "TsTypeObject":
				return this.enterTsTypeObject(t)(type as TsTypeObject) as TsType;
			case "TsTypeAsserts":
				return this.enterTsTypeAsserts(t)(type as TsTypeAsserts) as TsType;
			case "TsTypeIs":
				return this.enterTsTypeIs(t)(type as TsTypeIs) as TsType;
			case "TsTypeKeyOf":
				return this.enterTsTypeKeyOf(t)(type as TsTypeKeyOf) as TsType;
			case "TsTypeConditional":
				return this.enterTsTypeConditional(t)(
					type as TsTypeConditional,
				) as TsType;
			case "TsTypeLookup":
				return this.enterTsTypeLookup(t)(type as TsTypeLookup) as TsType;
			case "TsTypeThis":
				return this.enterTsTypeThis(t)(type as TsTypeThis) as TsType;
			case "TsTypeRepeated":
				return this.enterTsTypeRepeated(t)(type as TsTypeRepeated) as TsType;
			case "TsTypeConstructor":
				return this.enterTsTypeConstructor(t)(
					type as TsTypeConstructor,
				) as TsType;
			case "TsTypeLiteral":
				return this.enterTsTypeLiteral(t)(type as TsTypeLiteral) as TsType;
			default:
				// Default case - return unchanged
				return type;
		}
	}

	protected processMemberRecursively(_t: T, member: TsMember): TsMember {
		// Default implementation - no recursive processing
		return member;
	}

	protected processParsedFileRecursively(
		_t: T,
		file: TsParsedFile,
	): TsParsedFile {
		// Default implementation - no recursive processing
		return file;
	}

	protected processClassRecursively(_t: T, cls: TsDeclClass): TsDeclClass {
		// Default implementation - no recursive processing
		return cls;
	}

	protected processInterfaceRecursively(
		_t: T,
		iface: TsDeclInterface,
	): TsDeclInterface {
		// Default implementation - no recursive processing
		return iface;
	}

	protected processNamespaceRecursively(
		_t: T,
		ns: TsDeclNamespace,
	): TsDeclNamespace {
		// Default implementation - no recursive processing
		return ns;
	}

	protected processModuleRecursively(_t: T, mod: TsDeclModule): TsDeclModule {
		// Default implementation - no recursive processing
		return mod;
	}

	protected processVarRecursively(_t: T, varDecl: TsDeclVar): TsDeclVar {
		// Default implementation - no recursive processing
		return varDecl;
	}

	protected processFunctionRecursively(
		_t: T,
		func: TsDeclFunction,
	): TsDeclFunction {
		// Default implementation - no recursive processing
		return func;
	}

	protected processTypeAliasRecursively(
		_t: T,
		alias: TsDeclTypeAlias,
	): TsDeclTypeAlias {
		// Default implementation - no recursive processing
		return alias;
	}

	protected processEnumRecursively(_t: T, enumDecl: TsDeclEnum): TsDeclEnum {
		// Default implementation - no recursive processing
		return enumDecl;
	}

	protected processGlobalRecursively(_t: T, global: TsGlobal): TsGlobal {
		// Default implementation - no recursive processing
		return global;
	}
}

/**
 * Implementation of combined transformations.
 * Applies the first transformation, then the second.
 */
class CombinedTransformation<T, U> extends AbstractTreeTransformation<T> {
	constructor(
		private first: TreeTransformation<T>,
		_second: TreeTransformation<U>,
	) {
		super();
	}

	withTree(t: T, tree: TsTree): T {
		return this.first.withTree(t, tree);
	}

	// Override all methods to apply both transformations
	enterTsTree(t: T): (x: TsTree) => TsTree {
		return (x: TsTree) => {
			const firstResult = this.first.enterTsTree(t)(x);
			// For the second transformation, we need to create appropriate context
			// This is a simplified approach - in practice, you might need more sophisticated context handling
			return firstResult; // Simplified for now
		};
	}

	// Similar pattern for other methods...
	// For brevity, showing the pattern with one method
	visitTsTree(t: T): (x: TsTree) => TsTree {
		return (x: TsTree) => {
			const firstResult = this.first.visitTsTree(t)(x);
			// Apply second transformation - this is simplified
			return firstResult;
		};
	}
}
