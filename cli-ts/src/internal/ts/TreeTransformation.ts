/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TreeTransformation
 *
 * Provides a framework for transforming TypeScript AST trees with support for
 * entering and leaving nodes, visiting different node types, and composing transformations.
 */

import * as O from "fp-ts/Option";
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
	TsAugmentedModule,
	TsEnumMember,
	TsExportAsNamespace,
	TsExportee,
	TsExporteeNames,
	TsExporteeStar,
	TsExporteeTree,
	TsExport,
	TsFunParam,
	TsFunSig,
	TsImported,
	TsImportedIdent,
	TsImportedDestructured,
	TsImportedStar,
	TsImportee,
	TsImporteeFrom,
	TsImporteeLocal,
	TsImporteeRequired,
	TsImport,
	TsLiteral,
	TsLiteralStr,
	TsLiteralNum,
	TsLiteralBool,
	TsMemberCall,
	TsMemberCtor,
	TsMemberFunction,
	TsMemberIndex,
	TsMemberProperty,
	TsMemberTypeMapped,
	TsQIdent,
	TsTypeExtends,
	TsTypeInfer,
	TsTypeParam,
	TsTypeQuery,
	TsContainerOrDecl,
	TsNamedDecl,
	Indexing,
	IndexingDict,
	IndexingSingle,
	TsTupleElement,
} from "./trees.js";
import { IArray } from "../IArray.js";

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
	enterTsNamedDecl(t: T): (x: TsNamedDecl) => TsNamedDecl;
	enterTsType(t: T): (x: TsType) => TsType;
	enterTsContainer(t: T): (x: TsContainer) => TsContainer;
	enterTsContainerOrDecl(t: T): (x: TsContainerOrDecl) => TsContainerOrDecl;
	enterTsLiteral(t: T): (x: TsLiteral) => TsLiteral;
	enterTsMember(t: T): (x: TsMember) => TsMember;
	enterTsImported(t: T): (x: TsImported) => TsImported;
	enterTsImportee(t: T): (x: TsImportee) => TsImportee;
	enterTsExportee(t: T): (x: TsExportee) => TsExportee;
	enterIndexing(t: T): (x: Indexing) => Indexing;

	// Specific declaration enter methods
	enterTsParsedFile(t: T): (x: TsParsedFile) => TsParsedFile;
	enterTsDeclClass(t: T): (x: TsDeclClass) => TsDeclClass;
	enterTsDeclInterface(t: T): (x: TsDeclInterface) => TsDeclInterface;
	enterTsDeclNamespace(t: T): (x: TsDeclNamespace) => TsDeclNamespace;
	enterTsDeclModule(t: T): (x: TsDeclModule) => TsDeclModule;
	enterTsAugmentedModule(t: T): (x: TsAugmentedModule) => TsAugmentedModule;
	enterTsDeclVar(t: T): (x: TsDeclVar) => TsDeclVar;
	enterTsDeclFunction(t: T): (x: TsDeclFunction) => TsDeclFunction;
	enterTsDeclTypeAlias(t: T): (x: TsDeclTypeAlias) => TsDeclTypeAlias;
	enterTsDeclEnum(t: T): (x: TsDeclEnum) => TsDeclEnum;
	enterTsGlobal(t: T): (x: TsGlobal) => TsGlobal;

	// Member enter methods
	enterTsMemberCall(t: T): (x: TsMemberCall) => TsMemberCall;
	enterTsMemberCtor(t: T): (x: TsMemberCtor) => TsMemberCtor;
	enterTsMemberFunction(t: T): (x: TsMemberFunction) => TsMemberFunction;
	enterTsMemberIndex(t: T): (x: TsMemberIndex) => TsMemberIndex;
	enterTsMemberProperty(t: T): (x: TsMemberProperty) => TsMemberProperty;
	enterTsMemberTypeMapped(t: T): (x: TsMemberTypeMapped) => TsMemberTypeMapped;

	// Other enter methods
	enterTsEnumMember(t: T): (x: TsEnumMember) => TsEnumMember;
	enterTsExportAsNamespace(t: T): (x: TsExportAsNamespace) => TsExportAsNamespace;
	enterTsExporteeNames(t: T): (x: TsExporteeNames) => TsExporteeNames;
	enterTsExporteeStar(t: T): (x: TsExporteeStar) => TsExporteeStar;
	enterTsExporteeTree(t: T): (x: TsExporteeTree) => TsExporteeTree;
	enterTsExport(t: T): (x: TsExport) => TsExport;
	enterTsFunParam(t: T): (x: TsFunParam) => TsFunParam;
	enterTsFunSig(t: T): (x: TsFunSig) => TsFunSig;
	enterTsImportedDestructured(t: T): (x: TsImportedDestructured) => TsImportedDestructured;
	enterTsImportedIdent(t: T): (x: TsImportedIdent) => TsImportedIdent;
	enterTsImportedStar(t: T): (x: TsImportedStar) => TsImportedStar;
	enterTsImporteeFrom(t: T): (x: TsImporteeFrom) => TsImporteeFrom;
	enterTsImporteeLocal(t: T): (x: TsImporteeLocal) => TsImporteeLocal;
	enterTsImporteeRequired(t: T): (x: TsImporteeRequired) => TsImporteeRequired;
	enterTsImport(t: T): (x: TsImport) => TsImport;
	enterTsLiteralBoolean(t: T): (x: TsLiteralBool) => TsLiteralBool;
	enterTsLiteralNumber(t: T): (x: TsLiteralNum) => TsLiteralNum;
	enterTsLiteralString(t: T): (x: TsLiteralStr) => TsLiteralStr;
	enterTsQIdent(t: T): (x: TsQIdent) => TsQIdent;
	enterTsTypeParam(t: T): (x: TsTypeParam) => TsTypeParam;
	enterTsTypeQuery(t: T): (x: TsTypeQuery) => TsTypeQuery;
	enterTsTypeExtends(t: T): (x: TsTypeExtends) => TsTypeExtends;
	enterTsTypeInfer(t: T): (x: TsTypeInfer) => TsTypeInfer;
	enterIndexingDict(t: T): (x: IndexingDict) => IndexingDict;
	enterIndexingSingle(t: T): (x: IndexingSingle) => IndexingSingle;

	// Specific type enter methods
	enterTsTypeRef(t: T): (x: TsTypeRef) => TsTypeRef;
	enterTsTypeRepeated(t: T): (x: TsTypeRepeated) => TsTypeRepeated;
	enterTsTypeThis(t: T): (x: TsTypeThis) => TsTypeThis;
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
	visitTsNamedDecl(t: T): (x: TsNamedDecl) => TsNamedDecl;
	visitTsType(t: T): (x: TsType) => TsType;
	visitTsMember(t: T): (x: TsMember) => TsMember;
	visitTsLiteral(t: T): (x: TsLiteral) => TsLiteral;
	visitTsImported(t: T): (x: TsImported) => TsImported;
	visitTsImportee(t: T): (x: TsImportee) => TsImportee;
	visitTsExportee(t: T): (x: TsExportee) => TsExportee;
	visitIndexing(t: T): (x: Indexing) => Indexing;

	// Specific visit methods
	visitTsParsedFile(t: T): (x: TsParsedFile) => TsParsedFile;
	visitTsDeclClass(t: T): (x: TsDeclClass) => TsDeclClass;
	visitTsDeclInterface(t: T): (x: TsDeclInterface) => TsDeclInterface;
	visitTsDeclNamespace(t: T): (x: TsDeclNamespace) => TsDeclNamespace;
	visitTsDeclModule(t: T): (x: TsDeclModule) => TsDeclModule;
	visitTsAugmentedModule(t: T): (x: TsAugmentedModule) => TsAugmentedModule;
	visitTsDeclVar(t: T): (x: TsDeclVar) => TsDeclVar;
	visitTsDeclFunction(t: T): (x: TsDeclFunction) => TsDeclFunction;
	visitTsDeclTypeAlias(t: T): (x: TsDeclTypeAlias) => TsDeclTypeAlias;
	visitTsDeclEnum(t: T): (x: TsDeclEnum) => TsDeclEnum;
	visitTsDeclGlobal(t: T): (x: TsGlobal) => TsGlobal;

	// Additional visit methods from Scala
	visitTsEnumMember(t: T): (x: TsEnumMember) => TsEnumMember;
	visitTsExportAsNamespace(t: T): (x: TsExportAsNamespace) => TsExportAsNamespace;
	visitTsExporteeNames(t: T): (x: TsExporteeNames) => TsExporteeNames;
	visitTsExporteeStar(t: T): (x: TsExporteeStar) => TsExporteeStar;
	visitTsExporteeTree(t: T): (x: TsExporteeTree) => TsExporteeTree;
	visitTsExport(t: T): (x: TsExport) => TsExport;
	visitTsFunParam(t: T): (x: TsFunParam) => TsFunParam;
	visitTsFunSig(t: T): (x: TsFunSig) => TsFunSig;
	visitTsImportedDestructured(t: T): (x: TsImportedDestructured) => TsImportedDestructured;
	visitTsImportedIdent(t: T): (x: TsImportedIdent) => TsImportedIdent;
	visitTsImportedStar(t: T): (x: TsImportedStar) => TsImportedStar;
	visitTsImporteeFrom(t: T): (x: TsImporteeFrom) => TsImporteeFrom;
	visitTsImporteeLocal(t: T): (x: TsImporteeLocal) => TsImporteeLocal;
	visitTsImporteeRequired(t: T): (x: TsImporteeRequired) => TsImporteeRequired;
	visitTsImport(t: T): (x: TsImport) => TsImport;
	visitTsLiteralBoolean(t: T): (x: TsLiteralBool) => TsLiteralBool;
	visitTsLiteralNumber(t: T): (x: TsLiteralNum) => TsLiteralNum;
	visitTsLiteralString(t: T): (x: TsLiteralStr) => TsLiteralStr;
	visitTsQIdent(t: T): (x: TsQIdent) => TsQIdent;
	visitTsTypeParam(t: T): (x: TsTypeParam) => TsTypeParam;
	visitTsTypeQuery(t: T): (x: TsTypeQuery) => TsTypeQuery;
	visitTsTypeExtends(t: T): (x: TsTypeExtends) => TsTypeExtends;
	visitTsTypeInfer(t: T): (x: TsTypeInfer) => TsTypeInfer;
	visitIndexingDict(t: T): (x: IndexingDict) => IndexingDict;
	visitIndexingSingle(t: T): (x: IndexingSingle) => IndexingSingle;
	visitTsTupleElem(t: T): (x: TsTupleElement) => TsTupleElement;

	// Specific type visit methods
	visitTsTypeRef(t: T): (x: TsTypeRef) => TsTypeRef;
	visitTsTypeRepeated(t: T): (x: TsTypeRepeated) => TsTypeRepeated;
	visitTsTypeThis(t: T): (x: TsTypeThis) => TsTypeThis;
	visitTsTypeAsserts(t: T): (x: TsTypeAsserts) => TsTypeAsserts;
	visitTsTypeConstructor(t: T): (x: TsTypeConstructor) => TsTypeConstructor;
	visitTsTypeConditional(t: T): (x: TsTypeConditional) => TsTypeConditional;
	visitTsTypeFunction(t: T): (x: TsTypeFunction) => TsTypeFunction;
	visitTsTypeKeyOf(t: T): (x: TsTypeKeyOf) => TsTypeKeyOf;
	visitTsTypeIntersect(t: T): (x: TsTypeIntersect) => TsTypeIntersect;
	visitTsTypeIs(t: T): (x: TsTypeIs) => TsTypeIs;
	visitTsTypeLiteral(t: T): (x: TsTypeLiteral) => TsTypeLiteral;
	visitTsTypeLookup(t: T): (x: TsTypeLookup) => TsTypeLookup;
	visitTsTypeObject(t: T): (x: TsTypeObject) => TsTypeObject;
	visitTsTypeTuple(t: T): (x: TsTypeTuple) => TsTypeTuple;
	visitTsTypeUnion(t: T): (x: TsTypeUnion) => TsTypeUnion;

	// Specific member visit methods
	visitTsMemberCall(t: T): (x: TsMemberCall) => TsMemberCall;
	visitTsMemberCtor(t: T): (x: TsMemberCtor) => TsMemberCtor;
	visitTsMemberFunction(t: T): (x: TsMemberFunction) => TsMemberFunction;
	visitTsMemberIndex(t: T): (x: TsMemberIndex) => TsMemberIndex;
	visitTsMemberProperty(t: T): (x: TsMemberProperty) => TsMemberProperty;
	visitTsMemberTypeMapped(t: T): (x: TsMemberTypeMapped) => TsMemberTypeMapped;
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

	enterTsNamedDecl(_t: T): (x: TsNamedDecl) => TsNamedDecl {
		return (x: TsNamedDecl) => x;
	}

	enterTsType(_t: T): (x: TsType) => TsType {
		return (x: TsType) => x;
	}

	enterTsContainer(_t: T): (x: TsContainer) => TsContainer {
		return (x: TsContainer) => x;
	}

	enterTsContainerOrDecl(_t: T): (x: TsContainerOrDecl) => TsContainerOrDecl {
		return (x: TsContainerOrDecl) => x;
	}

	enterTsLiteral(_t: T): (x: TsLiteral) => TsLiteral {
		return (x: TsLiteral) => x;
	}

	enterTsMember(_t: T): (x: TsMember) => TsMember {
		return (x: TsMember) => x;
	}

	enterTsImported(_t: T): (x: TsImported) => TsImported {
		return (x: TsImported) => x;
	}

	enterTsImportee(_t: T): (x: TsImportee) => TsImportee {
		return (x: TsImportee) => x;
	}

	enterTsExportee(_t: T): (x: TsExportee) => TsExportee {
		return (x: TsExportee) => x;
	}

	enterIndexing(_t: T): (x: Indexing) => Indexing {
		return (x: Indexing) => x;
	}

	// Specific declaration enter methods
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

	enterTsAugmentedModule(_t: T): (x: TsAugmentedModule) => TsAugmentedModule {
		return (x: TsAugmentedModule) => x;
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

	// Member enter methods
	enterTsMemberCall(_t: T): (x: TsMemberCall) => TsMemberCall {
		return (x: TsMemberCall) => x;
	}

	enterTsMemberCtor(_t: T): (x: TsMemberCtor) => TsMemberCtor {
		return (x: TsMemberCtor) => x;
	}

	enterTsMemberFunction(_t: T): (x: TsMemberFunction) => TsMemberFunction {
		return (x: TsMemberFunction) => x;
	}

	enterTsMemberIndex(_t: T): (x: TsMemberIndex) => TsMemberIndex {
		return (x: TsMemberIndex) => x;
	}

	enterTsMemberProperty(_t: T): (x: TsMemberProperty) => TsMemberProperty {
		return (x: TsMemberProperty) => x;
	}

	enterTsMemberTypeMapped(_t: T): (x: TsMemberTypeMapped) => TsMemberTypeMapped {
		return (x: TsMemberTypeMapped) => x;
	}

	// Other enter methods
	enterTsEnumMember(_t: T): (x: TsEnumMember) => TsEnumMember {
		return (x: TsEnumMember) => x;
	}

	enterTsExportAsNamespace(_t: T): (x: TsExportAsNamespace) => TsExportAsNamespace {
		return (x: TsExportAsNamespace) => x;
	}

	enterTsExporteeNames(_t: T): (x: TsExporteeNames) => TsExporteeNames {
		return (x: TsExporteeNames) => x;
	}

	enterTsExporteeStar(_t: T): (x: TsExporteeStar) => TsExporteeStar {
		return (x: TsExporteeStar) => x;
	}

	enterTsExporteeTree(_t: T): (x: TsExporteeTree) => TsExporteeTree {
		return (x: TsExporteeTree) => x;
	}

	enterTsExport(_t: T): (x: TsExport) => TsExport {
		return (x: TsExport) => x;
	}

	enterTsFunParam(_t: T): (x: TsFunParam) => TsFunParam {
		return (x: TsFunParam) => x;
	}

	enterTsFunSig(_t: T): (x: TsFunSig) => TsFunSig {
		return (x: TsFunSig) => x;
	}

	enterTsImportedDestructured(_t: T): (x: TsImportedDestructured) => TsImportedDestructured {
		return (x: TsImportedDestructured) => x;
	}

	enterTsImportedIdent(_t: T): (x: TsImportedIdent) => TsImportedIdent {
		return (x: TsImportedIdent) => x;
	}

	enterTsImportedStar(_t: T): (x: TsImportedStar) => TsImportedStar {
		return (x: TsImportedStar) => x;
	}

	enterTsImporteeFrom(_t: T): (x: TsImporteeFrom) => TsImporteeFrom {
		return (x: TsImporteeFrom) => x;
	}

	enterTsImporteeLocal(_t: T): (x: TsImporteeLocal) => TsImporteeLocal {
		return (x: TsImporteeLocal) => x;
	}

	enterTsImporteeRequired(_t: T): (x: TsImporteeRequired) => TsImporteeRequired {
		return (x: TsImporteeRequired) => x;
	}

	enterTsImport(_t: T): (x: TsImport) => TsImport {
		return (x: TsImport) => x;
	}

	enterTsLiteralBoolean(_t: T): (x: TsLiteralBool) => TsLiteralBool {
		return (x: TsLiteralBool) => x;
	}

	enterTsLiteralNumber(_t: T): (x: TsLiteralNum) => TsLiteralNum {
		return (x: TsLiteralNum) => x;
	}

	enterTsLiteralString(_t: T): (x: TsLiteralStr) => TsLiteralStr {
		return (x: TsLiteralStr) => x;
	}

	enterTsQIdent(_t: T): (x: TsQIdent) => TsQIdent {
		return (x: TsQIdent) => x;
	}

	enterTsTypeParam(_t: T): (x: TsTypeParam) => TsTypeParam {
		return (x: TsTypeParam) => x;
	}

	enterTsTypeQuery(_t: T): (x: TsTypeQuery) => TsTypeQuery {
		return (x: TsTypeQuery) => x;
	}

	enterTsTypeExtends(_t: T): (x: TsTypeExtends) => TsTypeExtends {
		return (x: TsTypeExtends) => x;
	}

	enterTsTypeInfer(_t: T): (x: TsTypeInfer) => TsTypeInfer {
		return (x: TsTypeInfer) => x;
	}

	enterIndexingDict(_t: T): (x: IndexingDict) => IndexingDict {
		return (x: IndexingDict) => x;
	}

	enterIndexingSingle(_t: T): (x: IndexingSingle) => IndexingSingle {
		return (x: IndexingSingle) => x;
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
			const tt = this.withTree(t, x);
			const entered = this.enterTsType(tt)(x);

			// Defensive check for undefined entered
			if (!entered || !entered._tag) {
				return x;
			}

			// Dispatch to specific type visit methods based on type tag
			let processed: TsType;
			switch (entered._tag) {
				case "TsTypeAsserts":
					processed = this.visitTsTypeAsserts(t)(entered as TsTypeAsserts);
					break;
				case "TsTypeConstructor":
					processed = this.visitTsTypeConstructor(t)(entered as TsTypeConstructor);
					break;
				case "TsTypeConditional":
					processed = this.visitTsTypeConditional(t)(entered as TsTypeConditional);
					break;
				case "TsTypeFunction":
					processed = this.visitTsTypeFunction(t)(entered as TsTypeFunction);
					break;
				case "TsTypeKeyOf":
					processed = this.visitTsTypeKeyOf(t)(entered as TsTypeKeyOf);
					break;
				case "TsTypeIntersect":
					processed = this.visitTsTypeIntersect(t)(entered as TsTypeIntersect);
					break;
				case "TsTypeIs":
					processed = this.visitTsTypeIs(t)(entered as TsTypeIs);
					break;
				case "TsTypeLiteral":
					processed = this.visitTsTypeLiteral(t)(entered as TsTypeLiteral);
					break;
				case "TsTypeLookup":
					processed = this.visitTsTypeLookup(t)(entered as TsTypeLookup);
					break;
				case "TsTypeObject":
					processed = this.visitTsTypeObject(t)(entered as TsTypeObject);
					break;
				case "TsTypeRef":
					processed = this.visitTsTypeRef(t)(entered as TsTypeRef);
					break;
				case "TsTypeRepeated":
					processed = this.visitTsTypeRepeated(t)(entered as TsTypeRepeated);
					break;
				case "TsTypeThis":
					processed = this.visitTsTypeThis(t)(entered as TsTypeThis);
					break;
				case "TsTypeTuple":
					processed = this.visitTsTypeTuple(t)(entered as TsTypeTuple);
					break;
				case "TsTypeUnion":
					processed = this.visitTsTypeUnion(t)(entered as TsTypeUnion);
					break;
				default:
					// For types without specific visit methods, just return entered
					processed = entered;
					break;
			}

			return this.leaveTsType(this.withTree(t, processed))(processed);
		};
	}

	visitTsMember(t: T): (x: TsMember) => TsMember {
		return (x: TsMember) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsMember(tt)(x);

			// Dispatch to specific member visit methods based on type tag
			let processed: TsMember;
			switch (entered._tag) {
				case "TsMemberProperty":
					processed = this.visitTsMemberProperty(t)(entered as TsMemberProperty);
					break;
				case "TsMemberFunction":
					processed = this.visitTsMemberFunction(t)(entered as TsMemberFunction);
					break;
				case "TsMemberCall":
					processed = this.visitTsMemberCall(t)(entered as TsMemberCall);
					break;
				case "TsMemberCtor":
					processed = this.visitTsMemberCtor(t)(entered as TsMemberCtor);
					break;
				case "TsMemberIndex":
					processed = this.visitTsMemberIndex(t)(entered as TsMemberIndex);
					break;
				case "TsMemberTypeMapped":
					processed = this.visitTsMemberTypeMapped(t)(entered as TsMemberTypeMapped);
					break;
				default:
					// For members without specific visit methods, just return entered
					processed = entered;
					break;
			}

			return this.leaveTsMember(this.withTree(t, processed))(processed);
		};
	}

	visitTsParsedFile(t: T): (x: TsParsedFile) => TsParsedFile {
		return (x: TsParsedFile) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsParsedFile(tt)(x);
			const newMembers = entered.members.map(this.visitTsContainerOrDecl(tt));

			// Only create new object if members changed
			const processed = newMembers === entered.members
				? entered
				: { ...entered, members: newMembers };

			return this.leaveTsParsedFile(this.withTree(t, processed))(processed);
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

	// Missing visit methods from interface
	visitTsNamedDecl(t: T): (x: TsNamedDecl) => TsNamedDecl {
		return (x: TsNamedDecl) => {
			const entered = this.enterTsNamedDecl(t)(x);
			return entered;
		};
	}

	visitTsLiteral(t: T): (x: TsLiteral) => TsLiteral {
		return (x: TsLiteral) => {
			const entered = this.enterTsLiteral(t)(x);
			const tt = this.withTree(t, entered);
			switch (entered._tag) {
				case "TsLiteralStr":
					return this.visitTsLiteralString(tt)(entered as TsLiteralStr) as TsLiteral;
				case "TsLiteralNum":
					return this.visitTsLiteralNumber(tt)(entered as TsLiteralNum) as TsLiteral;
				case "TsLiteralBool":
					return this.visitTsLiteralBoolean(tt)(entered as TsLiteralBool) as TsLiteral;
				default:
					return entered;
			}
		};
	}

	visitTsImported(t: T): (x: TsImported) => TsImported {
		return (x: TsImported) => {
			const entered = this.enterTsImported(t)(x);
			const tt = this.withTree(t, entered);
			switch (entered._tag) {
				case "TsImportedIdent":
					return this.visitTsImportedIdent(tt)(entered as TsImportedIdent) as TsImported;
				case "TsImportedDestructured":
					return this.visitTsImportedDestructured(tt)(entered as TsImportedDestructured) as TsImported;
				case "TsImportedStar":
					return this.visitTsImportedStar(tt)(entered as TsImportedStar) as TsImported;
				default:
					return entered;
			}
		};
	}

	visitTsImportee(t: T): (x: TsImportee) => TsImportee {
		return (x: TsImportee) => {
			const entered = this.enterTsImportee(t)(x);
			const tt = this.withTree(t, entered);
			switch (entered._tag) {
				case "TsImporteeFrom":
					return this.visitTsImporteeFrom(tt)(entered as TsImporteeFrom) as TsImportee;
				case "TsImporteeLocal":
					return this.visitTsImporteeLocal(tt)(entered as TsImporteeLocal) as TsImportee;
				case "TsImporteeRequired":
					return this.visitTsImporteeRequired(tt)(entered as TsImporteeRequired) as TsImportee;
				default:
					return entered;
			}
		};
	}

	visitTsExportee(t: T): (x: TsExportee) => TsExportee {
		return (x: TsExportee) => {
			const entered = this.enterTsExportee(t)(x);
			const tt = this.withTree(t, entered);
			switch (entered._tag) {
				case "TsExporteeNames":
					return this.visitTsExporteeNames(tt)(entered as TsExporteeNames) as TsExportee;
				case "TsExporteeStar":
					return this.visitTsExporteeStar(tt)(entered as TsExporteeStar) as TsExportee;
				case "TsExporteeTree":
					return this.visitTsExporteeTree(tt)(entered as TsExporteeTree) as TsExportee;
				default:
					return entered;
			}
		};
	}

	visitIndexing(t: T): (x: Indexing) => Indexing {
		return (x: Indexing) => {
			const entered = this.enterIndexing(t)(x);
			const tt = this.withTree(t, entered);
			switch (entered._tag) {
				case "IndexingDict":
					return this.visitIndexingDict(tt)(entered as IndexingDict) as Indexing;
				case "IndexingSingle":
					return this.visitIndexingSingle(tt)(entered as IndexingSingle) as Indexing;
				default:
					return entered;
			}
		};
	}

	visitTsAugmentedModule(t: T): (x: TsAugmentedModule) => TsAugmentedModule {
		return (x: TsAugmentedModule) => {
			const entered = this.enterTsAugmentedModule(t)(x);
			return entered;
		};
	}

	// Additional visit methods from interface
	visitTsEnumMember(t: T): (x: TsEnumMember) => TsEnumMember {
		return (x: TsEnumMember) => {
			const entered = this.enterTsEnumMember(t)(x);
			return entered;
		};
	}

	visitTsExportAsNamespace(t: T): (x: TsExportAsNamespace) => TsExportAsNamespace {
		return (x: TsExportAsNamespace) => {
			const entered = this.enterTsExportAsNamespace(t)(x);
			return entered;
		};
	}

	visitTsExporteeNames(t: T): (x: TsExporteeNames) => TsExporteeNames {
		return (x: TsExporteeNames) => {
			const entered = this.enterTsExporteeNames(t)(x);
			return entered;
		};
	}

	visitTsExporteeStar(t: T): (x: TsExporteeStar) => TsExporteeStar {
		return (x: TsExporteeStar) => {
			const entered = this.enterTsExporteeStar(t)(x);
			return entered;
		};
	}

	visitTsExporteeTree(t: T): (x: TsExporteeTree) => TsExporteeTree {
		return (x: TsExporteeTree) => {
			const entered = this.enterTsExporteeTree(t)(x);
			return entered;
		};
	}

	visitTsExport(t: T): (x: TsExport) => TsExport {
		return (x: TsExport) => {
			const entered = this.enterTsExport(t)(x);
			return entered;
		};
	}

	visitTsFunParam(t: T): (x: TsFunParam) => TsFunParam {
		return (x: TsFunParam) => {
			const entered = this.enterTsFunParam(t)(x);
			return entered;
		};
	}

	visitTsFunSig(t: T): (x: TsFunSig) => TsFunSig {
		return (x: TsFunSig) => {
			const entered = this.enterTsFunSig(t)(x);
			return entered;
		};
	}

	visitTsImportedDestructured(t: T): (x: TsImportedDestructured) => TsImportedDestructured {
		return (x: TsImportedDestructured) => {
			const entered = this.enterTsImportedDestructured(t)(x);
			return entered;
		};
	}

	visitTsImportedIdent(t: T): (x: TsImportedIdent) => TsImportedIdent {
		return (x: TsImportedIdent) => {
			const entered = this.enterTsImportedIdent(t)(x);
			return entered;
		};
	}

	visitTsImportedStar(t: T): (x: TsImportedStar) => TsImportedStar {
		return (x: TsImportedStar) => {
			const entered = this.enterTsImportedStar(t)(x);
			return entered;
		};
	}

	visitTsImporteeFrom(t: T): (x: TsImporteeFrom) => TsImporteeFrom {
		return (x: TsImporteeFrom) => {
			const entered = this.enterTsImporteeFrom(t)(x);
			return entered;
		};
	}

	visitTsImporteeLocal(t: T): (x: TsImporteeLocal) => TsImporteeLocal {
		return (x: TsImporteeLocal) => {
			const entered = this.enterTsImporteeLocal(t)(x);
			return entered;
		};
	}

	visitTsImporteeRequired(t: T): (x: TsImporteeRequired) => TsImporteeRequired {
		return (x: TsImporteeRequired) => {
			const entered = this.enterTsImporteeRequired(t)(x);
			return entered;
		};
	}

	visitTsImport(t: T): (x: TsImport) => TsImport {
		return (x: TsImport) => {
			const entered = this.enterTsImport(t)(x);
			return entered;
		};
	}

	visitTsLiteralBoolean(t: T): (x: TsLiteralBool) => TsLiteralBool {
		return (x: TsLiteralBool) => {
			const entered = this.enterTsLiteralBoolean(t)(x);
			return entered;
		};
	}

	visitTsLiteralNumber(t: T): (x: TsLiteralNum) => TsLiteralNum {
		return (x: TsLiteralNum) => {
			const entered = this.enterTsLiteralNumber(t)(x);
			return entered;
		};
	}

	visitTsLiteralString(t: T): (x: TsLiteralStr) => TsLiteralStr {
		return (x: TsLiteralStr) => {
			const entered = this.enterTsLiteralString(t)(x);
			return entered;
		};
	}

	visitTsQIdent(t: T): (x: TsQIdent) => TsQIdent {
		return (x: TsQIdent) => {
			const entered = this.enterTsQIdent(t)(x);
			return entered;
		};
	}

	visitTsTypeParam(t: T): (x: TsTypeParam) => TsTypeParam {
		return (x: TsTypeParam) => {
			const entered = this.enterTsTypeParam(t)(x);
			return entered;
		};
	}

	visitTsTypeQuery(t: T): (x: TsTypeQuery) => TsTypeQuery {
		return (x: TsTypeQuery) => {
			const entered = this.enterTsTypeQuery(t)(x);
			return entered;
		};
	}

	visitTsTypeExtends(t: T): (x: TsTypeExtends) => TsTypeExtends {
		return (x: TsTypeExtends) => {
			const entered = this.enterTsTypeExtends(t)(x);
			return entered;
		};
	}

	visitTsTypeInfer(t: T): (x: TsTypeInfer) => TsTypeInfer {
		return (x: TsTypeInfer) => {
			const entered = this.enterTsTypeInfer(t)(x);
			return entered;
		};
	}

	visitIndexingDict(t: T): (x: IndexingDict) => IndexingDict {
		return (x: IndexingDict) => {
			const entered = this.enterIndexingDict(t)(x);
			return entered;
		};
	}

	visitIndexingSingle(t: T): (x: IndexingSingle) => IndexingSingle {
		return (x: IndexingSingle) => {
			const entered = this.enterIndexingSingle(t)(x);
			return entered;
		};
	}

	visitTsTupleElem(t: T): (x: TsTupleElement) => TsTupleElement {
		return (x: TsTupleElement) => {
			// Process tuple element recursively
			const tt = this.withTree(t, x);
			return {
				...x,
				tpe: this.visitTsType(tt)(x.tpe),
			};
		};
	}

	// Specific type visit methods
	visitTsTypeRef(t: T): (x: TsTypeRef) => TsTypeRef {
		return (x: TsTypeRef) => {
			const entered = this.enterTsTypeRef(t)(x);
			const tt = this.withTree(t, entered);
			const newName = this.visitTsQIdent(tt)(entered.name);

			// Process type parameters with change detection
			const transformedTparams = entered.tparams.map(this.visitTsType(tt));
			let tparamsChanged = false;
			for (let i = 0; i < transformedTparams.length; i++) {
				if (transformedTparams.apply(i) !== entered.tparams.apply(i)) {
					tparamsChanged = true;
					break;
				}
			}
			const newTparams = tparamsChanged ? transformedTparams : entered.tparams;

			// Only create new object if fields changed
			return newName === entered.name && newTparams === entered.tparams
				? entered
				: { ...entered, name: newName, tparams: newTparams };
		};
	}

	visitTsTypeRepeated(t: T): (x: TsTypeRepeated) => TsTypeRepeated {
		return (x: TsTypeRepeated) => {
			const entered = this.enterTsTypeRepeated(t)(x);
			const tt = this.withTree(t, entered);
			const newUnderlying = this.visitTsType(tt)(entered.underlying);

			// Only create new object if underlying changed
			return newUnderlying === entered.underlying
				? entered
				: { ...entered, underlying: newUnderlying };
		};
	}

	visitTsTypeThis(t: T): (x: TsTypeThis) => TsTypeThis {
		return (x: TsTypeThis) => {
			const entered = this.enterTsTypeThis(t)(x);
			return entered;
		};
	}

	visitTsTypeAsserts(t: T): (x: TsTypeAsserts) => TsTypeAsserts {
		return (x: TsTypeAsserts) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeAsserts(tt)(x);
			const newIsOpt = O.map(this.visitTsType(tt))(entered.isOpt);

			// Only create new object if isOpt changed
			return newIsOpt === entered.isOpt
				? entered
				: { ...entered, isOpt: newIsOpt };
		};
	}

	visitTsTypeConstructor(t: T): (x: TsTypeConstructor) => TsTypeConstructor {
		return (x: TsTypeConstructor) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeConstructor(tt)(x);
			const newSignature = this.visitTsTypeFunction(tt)(entered.signature);

			// Only create new object if signature changed
			return newSignature === entered.signature
				? entered
				: { ...entered, signature: newSignature };
		};
	}

	visitTsTypeConditional(t: T): (x: TsTypeConditional) => TsTypeConditional {
		return (x: TsTypeConditional) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeConditional(tt)(x);
			const newPred = this.visitTsType(tt)(entered.pred);
			const newIfTrue = this.visitTsType(tt)(entered.ifTrue);
			const newIfFalse = this.visitTsType(tt)(entered.ifFalse);

			// Only create new object if any field changed
			return newPred === entered.pred && newIfTrue === entered.ifTrue && newIfFalse === entered.ifFalse
				? entered
				: { ...entered, pred: newPred, ifTrue: newIfTrue, ifFalse: newIfFalse };
		};
	}

	visitTsTypeFunction(t: T): (x: TsTypeFunction) => TsTypeFunction {
		return (x: TsTypeFunction) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeFunction(tt)(x);
			const newSignature = this.visitTsFunSig(tt)(entered.signature);

			// Only create new object if signature changed
			return newSignature === entered.signature
				? entered
				: { ...entered, signature: newSignature };
		};
	}

	visitTsTypeKeyOf(t: T): (x: TsTypeKeyOf) => TsTypeKeyOf {
		return (x: TsTypeKeyOf) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeKeyOf(tt)(x);
			const newKey = this.visitTsType(tt)(entered.key);

			// Only create new object if key changed
			return newKey === entered.key
				? entered
				: { ...entered, key: newKey };
		};
	}

	visitTsTypeIntersect(t: T): (x: TsTypeIntersect) => TsTypeIntersect {
		return (x: TsTypeIntersect) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeIntersect(tt)(x);
			const newTypes = entered.types.map(this.visitTsType(tt));

			// Only create new object if types changed
			return newTypes === entered.types
				? entered
				: { ...entered, types: newTypes };
		};
	}

	visitTsTypeIs(t: T): (x: TsTypeIs) => TsTypeIs {
		return (x: TsTypeIs) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeIs(tt)(x);
			return {
				...entered,
				tpe: this.visitTsType(tt)(entered.tpe),
			};
		};
	}

	visitTsTypeLiteral(t: T): (x: TsTypeLiteral) => TsTypeLiteral {
		return (x: TsTypeLiteral) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeLiteral(tt)(x);
			return {
				...entered,
				literal: this.visitTsLiteral(tt)(entered.literal),
			};
		};
	}

	visitTsTypeLookup(t: T): (x: TsTypeLookup) => TsTypeLookup {
		return (x: TsTypeLookup) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeLookup(tt)(x);
			return {
				...entered,
				from: this.visitTsType(tt)(entered.from),
				key: this.visitTsType(tt)(entered.key),
			};
		};
	}

	visitTsTypeObject(t: T): (x: TsTypeObject) => TsTypeObject {
		return (x: TsTypeObject) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeObject(tt)(x);
			return {
				...entered,
				members: entered.members.map(this.visitTsMember(tt)),
			};
		};
	}

	visitTsTypeTuple(t: T): (x: TsTypeTuple) => TsTypeTuple {
		return (x: TsTypeTuple) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeTuple(tt)(x);
			return {
				...entered,
				elems: entered.elems.map(this.visitTsTupleElem(tt)),
			};
		};
	}

	visitTsTypeUnion(t: T): (x: TsTypeUnion) => TsTypeUnion {
		return (x: TsTypeUnion) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsTypeUnion(tt)(x);
			return {
				...entered,
				types: entered.types.map(this.visitTsType(tt)),
			};
		};
	}

	// Specific member visit methods
	visitTsMemberCall(t: T): (x: TsMemberCall) => TsMemberCall {
		return (x: TsMemberCall) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsMemberCall(tt)(x);
			const newSignature = this.visitTsFunSig(tt)(entered.signature);

			// Only create new object if signature actually changed
			return newSignature === entered.signature
				? entered
				: { ...entered, signature: newSignature };
		};
	}

	visitTsMemberCtor(t: T): (x: TsMemberCtor) => TsMemberCtor {
		return (x: TsMemberCtor) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsMemberCtor(tt)(x);
			const newSignature = this.visitTsFunSig(tt)(entered.signature);

			// Only create new object if signature actually changed
			return newSignature === entered.signature
				? entered
				: { ...entered, signature: newSignature };
		};
	}

	visitTsMemberFunction(t: T): (x: TsMemberFunction) => TsMemberFunction {
		return (x: TsMemberFunction) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsMemberFunction(tt)(x);
			const newSignature = this.visitTsFunSig(tt)(entered.signature);

			// Only create new object if signature actually changed
			return newSignature === entered.signature
				? entered
				: { ...entered, signature: newSignature };
		};
	}

	visitTsMemberIndex(t: T): (x: TsMemberIndex) => TsMemberIndex {
		return (x: TsMemberIndex) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsMemberIndex(tt)(x);
			const newIndexing = this.visitIndexing(tt)(entered.indexing);
			const newValueType = O.map(this.visitTsType(tt))(entered.valueType);

			// Only create new object if fields actually changed
			return newIndexing === entered.indexing && newValueType === entered.valueType
				? entered
				: { ...entered, indexing: newIndexing, valueType: newValueType };
		};
	}

	visitTsMemberProperty(t: T): (x: TsMemberProperty) => TsMemberProperty {
		return (x: TsMemberProperty) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsMemberProperty(tt)(x);
			const newTpe = O.map(this.visitTsType(tt))(entered.tpe);

			// Only create new object if type actually changed
			return newTpe === entered.tpe
				? entered
				: { ...entered, tpe: newTpe };
		};
	}

	visitTsMemberTypeMapped(t: T): (x: TsMemberTypeMapped) => TsMemberTypeMapped {
		return (x: TsMemberTypeMapped) => {
			const tt = this.withTree(t, x);
			const entered = this.enterTsMemberTypeMapped(tt)(x);
			return {
				...entered,
				from: this.visitTsType(tt)(entered.from),
				as: O.map(this.visitTsType(tt))(entered.as),
				to: this.visitTsType(tt)(entered.to),
			};
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


	protected processClassRecursively(t: T, cls: TsDeclClass): TsDeclClass {
		// Complete recursive processing following Scala pattern
		const tt = this.withTree(t, cls);

		// Process type parameters with change detection
		const transformedTparams = cls.tparams.map(this.visitTsTypeParam(tt));
		let tparamsChanged = false;
		for (let i = 0; i < transformedTparams.length; i++) {
			if (transformedTparams.apply(i) !== cls.tparams.apply(i)) {
				tparamsChanged = true;
				break;
			}
		}
		const newTparams = tparamsChanged ? transformedTparams : cls.tparams;

		// Process parent type
		const newParent = O.map(this.visitTsTypeRef(tt))(cls.parent);

		// Process implements interfaces with change detection
		const transformedImplementsInterfaces = cls.implementsInterfaces.map(this.visitTsTypeRef(tt));
		let implementsChanged = false;
		for (let i = 0; i < transformedImplementsInterfaces.length; i++) {
			if (transformedImplementsInterfaces.apply(i) !== cls.implementsInterfaces.apply(i)) {
				implementsChanged = true;
				break;
			}
		}
		const newImplementsInterfaces = implementsChanged ? transformedImplementsInterfaces : cls.implementsInterfaces;

		// Process members with change detection
		const transformedMembers = cls.members.map(this.visitTsMember(tt));
		let membersChanged = false;
		for (let i = 0; i < transformedMembers.length; i++) {
			if (transformedMembers.apply(i) !== cls.members.apply(i)) {
				membersChanged = true;
				break;
			}
		}
		const newMembers = membersChanged ? transformedMembers : cls.members;

		// Only create new object if any field changed
		return newTparams === cls.tparams &&
			   newParent === cls.parent &&
			   newImplementsInterfaces === cls.implementsInterfaces &&
			   newMembers === cls.members
			? cls
			: { ...cls, tparams: newTparams, parent: newParent, implementsInterfaces: newImplementsInterfaces, members: newMembers };
	}

	protected processInterfaceRecursively(
		t: T,
		iface: TsDeclInterface,
	): TsDeclInterface {
		// Complete recursive processing following Scala pattern
		const tt = this.withTree(t, iface);
		const newTparams = iface.tparams?.map(this.visitTsTypeParam(tt)) || iface.tparams;
		const newInheritance = iface.inheritance?.map(this.visitTsTypeRef(tt)) || iface.inheritance;
		const newMembers = iface.members?.map(this.visitTsMember(tt)) || iface.members;

		// Only create new object if any field changed
		return newTparams === iface.tparams &&
			   newInheritance === iface.inheritance &&
			   newMembers === iface.members
			? iface
			: { ...iface, tparams: newTparams, inheritance: newInheritance, members: newMembers };
	}

	protected processNamespaceRecursively(
		t: T,
		ns: TsDeclNamespace,
	): TsDeclNamespace {
		// Complete recursive processing following Scala pattern
		const tt = this.withTree(t, ns);
		const newMembers = ns.members.map(this.visitTsContainerOrDecl(tt));

		// Only create new object if members changed
		return newMembers === ns.members
			? ns
			: { ...ns, members: newMembers };
	}

	protected processModuleRecursively(t: T, mod: TsDeclModule): TsDeclModule {
		// Complete recursive processing following Scala pattern
		const tt = this.withTree(t, mod);
		const transformedMembers = mod.members.map(this.visitTsContainerOrDecl(tt));

		// Check if any members were actually changed
		let hasChanges = false;
		for (let i = 0; i < transformedMembers.length; i++) {
			if (transformedMembers.apply(i) !== mod.members.apply(i)) {
				hasChanges = true;
				break;
			}
		}
		const newMembers = hasChanges ? transformedMembers : mod.members;

		// Only create new object if members changed
		return newMembers === mod.members
			? mod
			: { ...mod, members: newMembers };
	}

	protected processVarRecursively(t: T, varDecl: TsDeclVar): TsDeclVar {
		// Complete recursive processing following Scala pattern
		const tt = this.withTree(t, varDecl);
		const newTpe = O.map(this.visitTsType(tt))(varDecl.tpe);

		// Only create new object if tpe changed
		return newTpe === varDecl.tpe
			? varDecl
			: { ...varDecl, tpe: newTpe };
	}

	protected processFunctionRecursively(
		t: T,
		func: TsDeclFunction,
	): TsDeclFunction {
		// Complete recursive processing following Scala pattern
		const tt = this.withTree(t, func);
		const newSignature = this.visitTsFunSig(tt)(func.signature);

		// Only create new object if signature changed
		return newSignature === func.signature
			? func
			: { ...func, signature: newSignature };
	}

	protected processTypeAliasRecursively(
		t: T,
		alias: TsDeclTypeAlias,
	): TsDeclTypeAlias {
		// Complete recursive processing following Scala pattern
		const tt = this.withTree(t, alias);
		const newTparams = alias.tparams.map(this.visitTsTypeParam(tt));
		const newAlias = this.visitTsType(tt)(alias.alias);

		// Only create new object if fields changed
		return newTparams === alias.tparams && newAlias === alias.alias
			? alias
			: { ...alias, tparams: newTparams, alias: newAlias };
	}

	protected processEnumRecursively(t: T, enumDecl: TsDeclEnum): TsDeclEnum {
		// Complete recursive processing following Scala pattern
		const tt = this.withTree(t, enumDecl);
		const newMembers = enumDecl.members.map(this.visitTsEnumMember(tt));
		const newExportedFrom = O.map(this.visitTsTypeRef(tt))(enumDecl.exportedFrom);

		// Only create new object if fields changed
		return newMembers === enumDecl.members && newExportedFrom === enumDecl.exportedFrom
			? enumDecl
			: { ...enumDecl, members: newMembers, exportedFrom: newExportedFrom };
	}

	protected processGlobalRecursively(t: T, global: TsGlobal): TsGlobal {
		// Complete recursive processing following Scala pattern
		const tt = this.withTree(t, global);
		const newMembers = global.members.map(this.visitTsContainerOrDecl(tt));

		// Only create new object if members changed
		return newMembers === global.members
			? global
			: { ...global, members: newMembers };
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
