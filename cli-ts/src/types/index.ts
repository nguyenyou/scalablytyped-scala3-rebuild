/**
 * TypeScript AST types index
 * Exports all AST node types and utilities
 */

// Base AST types
export * from './ts-ast.js';

// Type system
export * from './ts-types.js';

// Declarations
export * from './ts-declarations.js';

// Members
export * from './ts-members.js';

// Imports and exports
export * from './ts-imports-exports.js';

// Scala AST types
export * from './scala-ast.js';

// TypeScript scope and symbol resolution
export * from './ts-scope.js';

// Configuration types
export * from './conversion-options.js';

// Re-export commonly used types for convenience
export type {
  TsTree,
  TsContainer,
  TsDecl,
  TsNamedDecl,
  TsContainerOrDecl,
  Comments,
  Comment,
  CodePath,
  JsLocation,
  TsIdent,
  TsIdentSimple,
  TsIdentLibrary,
  TsIdentModule,
  TsQIdent,
  IArray
} from './ts-ast.js';

export type {
  TsType,
  TsTypeRef,
  TsTypeUnion,
  TsTypeIntersect,
  TsTypeObject,
  TsTypeFunction,
  TsTypeConstructor,
  TsTypeTuple,
  TsTypeLiteral,
  TsLiteral,
  TsLiteralString,
  TsLiteralNumber,
  TsLiteralBoolean
} from './ts-types.js';

export type {
  TsParsedFile,
  TsDeclModule,
  TsDeclNamespace,
  TsDeclClass,
  TsDeclInterface,
  TsDeclTypeAlias,
  TsDeclVar,
  TsDeclFunction,
  TsDeclEnum,
  TsTypeParam,
  TsFunSig,
  TsParam
} from './ts-declarations.js';

export type {
  TsMember,
  TsMemberFunction,
  TsMemberProperty,
  TsMemberCtor,
  TsMemberCall,
  TsMemberIndex,
  TsProtectionLevel,
  MethodType
} from './ts-members.js';

export type {
  TsImport,
  TsExport,
  TsImported,
  TsExportee,
  ExportType
} from './ts-imports-exports.js';

export type {
  ConversionOptions,
  Flavour,
  Selection,
  Versions,
  CalculateLibraryVersion
} from './conversion-options.js';

export type {
  PackageJson
} from './package-json.js';

export type {
  ScalaTree,
  ScalaPackageTree,
  ScalaClassTree,
  ScalaModuleTree,
  ScalaMethodTree,
  ScalaFieldTree,
  ScalaTypeRef,
  ScalaAnnotation,
  ScalaQualifiedName,
  ScalaName,
  ScalaProtectionLevel,
  ScalaClassType
} from './scala-ast.js';