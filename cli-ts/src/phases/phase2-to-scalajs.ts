import { Phase, PhaseResult } from './rec-phase.js';
import { Phase1Result } from './phase1-read-typescript.js';
import { LibTs, TsTreeScope, SymbolInfo } from '../types/ts-scope.js';
import {
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
} from '../types/scala-ast.js';
import {
  TsParsedFile,
  TsDeclClass,
  TsDeclInterface,
  TsDeclModule,
  TsDeclNamespace,
  TsDeclFunction,
  TsDeclVar,
  TsDeclTypeAlias,
  TsType,
  TsTypeRef,
  Comments,
  IArray
} from '../types/index.js';
import { Versions, Selection } from '../types/conversion-options.js';
import {
  ScalaJsLibNames,
  ScalaJsDomNames,
  AdaptiveNaming,
  LibrarySpecificNaming,
  TypeConversionMapping
} from '../core/name-mapping.js';

/**
 * Configuration for Phase2ToScalaJs
 */
export interface Phase2Config {
  pedantic: boolean;
  scalaVersion: Versions['scala'];
  enableScalaJsDefined: Selection;
  outputPkg: string;
  flavour: string;
  useDeprecatedModuleNames: boolean;
}

/**
 * Result of Phase2ToScalaJs
 */
export interface Phase2Result {
  libScalaJs: LibScalaJs;
  packageTree: ScalaPackageTree;
  dependencies: Map<string, LibScalaJs>;
}

/**
 * Scala.js library representation
 */
export class LibScalaJs {
  constructor(
    public readonly libName: string,
    public readonly version: string,
    public readonly packageTree: ScalaPackageTree,
    public readonly dependencies: Set<string>
  ) {}

  get scalaPackageName(): string {
    return this.packageTree.name.value;
  }
}

/**
 * Phase 2: Convert TypeScript AST to Scala.js AST
 * Equivalent to Scala Phase2ToScalaJs
 */
export class Phase2ToScalaJs implements Phase<Phase1Result, Phase1Result, Phase2Result> {
  private readonly typeConverter: TypeScriptToScalaTypeConverter;
  private readonly memberConverter: TypeScriptToScalaMemberConverter;

  constructor(private readonly config: Phase2Config) {
    this.typeConverter = new TypeScriptToScalaTypeConverter(config);
    this.memberConverter = new TypeScriptToScalaMemberConverter(config, this.typeConverter);
  }

  async execute(id: Phase1Result, input: Phase1Result): Promise<PhaseResult<Phase2Result>> {
    try {
      console.log(`Phase2ToScalaJs: Converting ${input.libTs.libName} to Scala.js`);

      // Convert the TypeScript library to Scala.js
      const packageTree = await this.convertLibraryToScala(input.libTs);

      // Create Scala.js library
      const libScalaJs = new LibScalaJs(
        input.libTs.libName,
        input.version,
        packageTree,
        input.dependencies
      );

      // TODO: Resolve and convert dependencies
      const dependencies = new Map<string, LibScalaJs>();

      console.log(`Phase2ToScalaJs: Successfully converted ${input.libTs.libName}`);

      return PhaseResult.success({
        libScalaJs,
        packageTree,
        dependencies
      });
    } catch (error) {
      console.error(`Phase2ToScalaJs: Failed to convert ${input.libTs.libName}:`, error);
      return PhaseResult.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Convert a TypeScript library to Scala package tree
   */
  private async convertLibraryToScala(libTs: LibTs): Promise<ScalaPackageTree> {
    const packageName = this.getScalaPackageName(libTs.libName);
    const members: ScalaTree[] = [];

    // Convert all parsed files
    for (const file of libTs.parsedFiles) {
      const fileMembers = await this.convertFileToScala(file, libTs.scope);
      members.push(...fileMembers);
    }

    // Create package annotations
    const annotations = this.createPackageAnnotations(libTs);

    return new ScalaPackageTree(
      IArray.from(annotations),
      new ScalaName(packageName),
      IArray.from(members),
      Comments.NoComments,
      ScalaQualifiedName.from([this.config.outputPkg, packageName])
    );
  }

  /**
   * Convert a TypeScript file to Scala trees
   */
  private async convertFileToScala(
    file: TsParsedFile,
    scope: TsTreeScope
  ): Promise<ScalaTree[]> {
    const members: ScalaTree[] = [];

    for (const member of file.members) {
      const converted = await this.convertDeclarationToScala(member, scope);
      if (converted) {
        members.push(converted);
      }
    }

    return members;
  }

  /**
   * Convert a TypeScript declaration to Scala tree
   */
  private async convertDeclarationToScala(
    decl: any,
    scope: TsTreeScope
  ): Promise<ScalaTree | undefined> {
    if (decl instanceof TsDeclClass) {
      return this.convertClassToScala(decl, scope);
    } else if (decl instanceof TsDeclInterface) {
      return this.convertInterfaceToScala(decl, scope);
    } else if (decl instanceof TsDeclModule || decl instanceof TsDeclNamespace) {
      return this.convertModuleToScala(decl, scope);
    } else if (decl instanceof TsDeclFunction) {
      return this.convertFunctionToScala(decl, scope);
    } else if (decl instanceof TsDeclVar) {
      return this.convertVariableToScala(decl, scope);
    } else if (decl instanceof TsDeclTypeAlias) {
      // Type aliases are typically converted to type members or ignored
      return undefined;
    }

    // Skip unsupported declarations
    return undefined;
  }

  /**
   * Convert TypeScript class to Scala class
   */
  private convertClassToScala(
    tsClass: TsDeclClass,
    scope: TsTreeScope
  ): ScalaClassTree {
    const scalaName = new ScalaName(this.sanitizeScalaName(tsClass.name.value));
    const annotations = this.createClassAnnotations(tsClass);
    const parents = this.convertParentTypes(tsClass);
    const members = this.memberConverter.convertClassMembers(tsClass.members, scope);

    return new ScalaClassTree(
      false, // isImplicit
      IArray.from(annotations),
      ScalaProtectionLevel.Public,
      scalaName,
      IArray.Empty, // TODO: Convert type parameters
      IArray.from(parents),
      IArray.Empty, // TODO: Convert constructors
      IArray.from(members),
      tsClass.isAbstract ? ScalaClassType.Class : ScalaClassType.Class,
      false, // isSealed
      this.convertComments(tsClass.comments),
      ScalaQualifiedName.from([this.config.outputPkg, scalaName.value])
    );
  }

  /**
   * Convert TypeScript interface to Scala trait
   */
  private convertInterfaceToScala(
    tsInterface: TsDeclInterface,
    scope: TsTreeScope
  ): ScalaClassTree {
    const scalaName = new ScalaName(this.sanitizeScalaName(tsInterface.name.value));
    const annotations = this.createInterfaceAnnotations(tsInterface);
    const parents = this.convertInterfaceParents(tsInterface);
    const members = this.memberConverter.convertInterfaceMembers(tsInterface.members, scope);

    return new ScalaClassTree(
      false, // isImplicit
      IArray.from(annotations),
      ScalaProtectionLevel.Public,
      scalaName,
      IArray.Empty, // TODO: Convert type parameters
      IArray.from(parents),
      IArray.Empty, // No constructors for traits
      IArray.from(members),
      ScalaClassType.Trait,
      false, // isSealed
      this.convertComments(tsInterface.comments),
      ScalaQualifiedName.from([this.config.outputPkg, scalaName.value])
    );
  }

  /**
   * Convert TypeScript module to Scala object
   */
  private convertModuleToScala(
    tsModule: TsDeclModule | TsDeclNamespace,
    scope: TsTreeScope
  ): ScalaModuleTree {
    const scalaName = new ScalaName(this.sanitizeScalaName(
      tsModule instanceof TsDeclModule ? tsModule.name.value : tsModule.name.value
    ));
    const annotations = this.createModuleAnnotations(tsModule);
    const members: ScalaTree[] = [];

    // Convert nested members
    for (const member of tsModule.members) {
      const converted = this.convertDeclarationToScala(member, scope);
      if (converted) {
        members.push(converted);
      }
    }

    return new ScalaModuleTree(
      IArray.from(annotations),
      ScalaProtectionLevel.Public,
      scalaName,
      IArray.Empty, // No parent objects typically
      IArray.from(members),
      this.convertComments(tsModule.comments),
      ScalaQualifiedName.from([this.config.outputPkg, scalaName.value]),
      false // isOverride
    );
  }

  /**
   * Convert TypeScript function to Scala method (placeholder)
   */
  private convertFunctionToScala(
    tsFunction: TsDeclFunction,
    scope: TsTreeScope
  ): ScalaMethodTree {
    // TODO: Implement function conversion
    const scalaName = new ScalaName(this.sanitizeScalaName(tsFunction.name.value));

    return new ScalaMethodTree(
      IArray.Empty, // annotations
      ScalaProtectionLevel.Public,
      scalaName,
      IArray.Empty, // type parameters
      IArray.Empty, // parameters
      ScalaTypeRef.Unit, // result type
      this.convertComments(tsFunction.comments),
      ScalaQualifiedName.from([this.config.outputPkg, scalaName.value]),
      false, // isOverride
      false  // isImplicit
    );
  }

  /**
   * Convert TypeScript variable to Scala field (placeholder)
   */
  private convertVariableToScala(
    tsVar: TsDeclVar,
    scope: TsTreeScope
  ): ScalaFieldTree {
    // TODO: Implement variable conversion
    const scalaName = new ScalaName(this.sanitizeScalaName(tsVar.name.value));

    return new ScalaFieldTree(
      IArray.Empty, // annotations
      ScalaProtectionLevel.Public,
      scalaName,
      ScalaTypeRef.Any, // type
      this.convertComments(tsVar.comments),
      ScalaQualifiedName.from([this.config.outputPkg, scalaName.value]),
      tsVar.readOnly, // isReadOnly
      false, // isOverride
      false  // isImplicit
    );
  }

  // Helper methods (placeholders for now)
  private getScalaPackageName(libName: string): string {
    return libName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  private sanitizeScalaName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_$]/g, '_');
  }

  private createPackageAnnotations(libTs: LibTs): ScalaAnnotation[] {
    return [ScalaAnnotation.JSImport];
  }

  private createClassAnnotations(tsClass: TsDeclClass): ScalaAnnotation[] {
    return this.config.enableScalaJsDefined === 'All'
      ? [ScalaAnnotation.ScalaJSDefined]
      : [ScalaAnnotation.JsNative];
  }

  private createInterfaceAnnotations(tsInterface: TsDeclInterface): ScalaAnnotation[] {
    return [ScalaAnnotation.ScalaJSDefined];
  }

  private createModuleAnnotations(tsModule: TsDeclModule | TsDeclNamespace): ScalaAnnotation[] {
    return [ScalaAnnotation.JSImport];
  }

  private convertParentTypes(tsClass: TsDeclClass): ScalaTypeRef[] {
    const parents: ScalaTypeRef[] = [];

    // Convert parent class
    if (tsClass.parent) {
      const parentType = this.typeConverter.convertType(tsClass.parent);
      parents.push(parentType);
    }

    // Convert implemented interfaces
    for (const implementedInterface of tsClass.implementsClause) {
      const interfaceType = this.typeConverter.convertType(implementedInterface);
      parents.push(interfaceType);
    }

    return parents;
  }

  private convertInterfaceParents(tsInterface: TsDeclInterface): ScalaTypeRef[] {
    const parents: ScalaTypeRef[] = [];

    // Convert extended interfaces
    for (const extendedInterface of tsInterface.inheritance) {
      const interfaceType = this.typeConverter.convertType(extendedInterface);
      parents.push(interfaceType);
    }

    return parents;
  }

  private convertComments(comments: Comments): Comments {
    return comments; // Pass through for now
  }
}

/**
 * TypeScript to Scala type converter
 */
class TypeScriptToScalaTypeConverter {
  private readonly scalaJsLibNames: ScalaJsLibNames;
  private readonly scalaJsDomNames: ScalaJsDomNames;
  private readonly adaptiveNaming: AdaptiveNaming;
  private readonly librarySpecificNaming: LibrarySpecificNaming;

  constructor(private readonly config: Phase2Config) {
    this.scalaJsLibNames = new ScalaJsLibNames(config.outputPkg);
    this.scalaJsDomNames = new ScalaJsDomNames(config.outputPkg);
    this.adaptiveNaming = new AdaptiveNaming(config.outputPkg, true);
    this.librarySpecificNaming = new LibrarySpecificNaming();
  }

  convertType(tsType: TsType): ScalaTypeRef {
    if (tsType instanceof TsTypeRef) {
      return this.convertTypeRef(tsType);
    } else if (tsType.nodeType === 'TsTypeUnion') {
      return this.convertUnionType(tsType as any);
    } else if (tsType.nodeType === 'TsTypeIntersect') {
      return this.convertIntersectionType(tsType as any);
    } else if (tsType.nodeType === 'TsTypeFunction') {
      return this.convertFunctionType(tsType as any);
    } else if (tsType.nodeType === 'TsTypeTuple') {
      return this.convertTupleType(tsType as any);
    } else if (tsType.nodeType === 'TsTypeLiteral') {
      return this.convertLiteralType(tsType as any);
    } else if (tsType.nodeType === 'TsTypeRepeated') {
      return this.convertRepeatedType(tsType as any);
    }

    // Fallback to Any for unknown types
    return ScalaTypeRef.Any;
  }

  private convertTypeRef(tsTypeRef: TsTypeRef): ScalaTypeRef {
    const typeName = tsTypeRef.name.parts.join('.');

    // Handle primitive types first
    const scalaType = this.mapPrimitiveType(typeName);
    if (scalaType) {
      return scalaType;
    }

    // Create initial Scala type reference
    let scalaTypeRef = new ScalaTypeRef(
      this.mapTypeName(typeName),
      tsTypeRef.targs.length > 0
        ? IArray.from(tsTypeRef.targs.map(arg => this.convertType(arg)))
        : IArray.Empty,
      tsTypeRef.comments
    );

    // Apply name mappings in order of priority:
    // 1. ScalaJS library mappings (core JS types)
    scalaTypeRef = this.scalaJsLibNames.applyMapping(scalaTypeRef);

    // 2. ScalaJS DOM mappings (if enabled)
    if (this.shouldUseScalaJsDomTypes()) {
      scalaTypeRef = this.scalaJsDomNames.applyMapping(scalaTypeRef);
    }

    return scalaTypeRef;
  }

  private mapPrimitiveType(typeName: string): ScalaTypeRef | undefined {
    switch (typeName) {
      case 'boolean': return ScalaTypeRef.Boolean;
      case 'number': return ScalaTypeRef.Double;
      case 'string': return ScalaTypeRef.String;
      case 'void': return ScalaTypeRef.Unit;
      case 'undefined': return this.createJsUndefOr(ScalaTypeRef.Unit);
      case 'null': return ScalaTypeRef.Any; // TODO: Better null handling
      case 'any': return ScalaTypeRef.Any;
      case 'unknown': return ScalaTypeRef.Any;
      case 'never': return new ScalaTypeRef(
        ScalaQualifiedName.from(['scala', 'Nothing']),
        IArray.Empty,
        Comments.NoComments
      );
      case 'object': return ScalaTypeRef.Any;
      default: return undefined;
    }
  }

  private mapTypeName(typeName: string): ScalaQualifiedName {
    // Create TypeScript qualified identifier
    const tsQIdent = TsQIdent.of(...typeName.split('.'));

    // Use adaptive naming to get Scala-compatible name
    const scalaName = this.adaptiveNaming.getScalaName(tsQIdent);

    // Apply library-specific naming rules if applicable
    const libraryName = this.detectLibraryName(typeName);
    if (libraryName) {
      const adjustedName = this.librarySpecificNaming.applyLibraryRules(
        libraryName,
        scalaName.parts[scalaName.parts.length - 1]
      );

      if (adjustedName !== scalaName.parts[scalaName.parts.length - 1]) {
        const newParts = [...scalaName.parts.slice(0, -1), adjustedName];
        return ScalaQualifiedName.from(newParts);
      }
    }

    return scalaName;
  }

  private detectLibraryName(typeName: string): string | undefined {
    // Detect library based on type name patterns
    if (typeName.startsWith('HTML') || typeName.includes('Element') || typeName.includes('Event')) {
      return 'dom';
    }
    if (typeName.includes('React') || typeName.includes('Component') || typeName.includes('Props')) {
      return 'react';
    }
    if (typeName.includes('Node') || typeName === 'global' || typeName === 'process') {
      return 'node';
    }
    return undefined;
  }

  private shouldUseScalaJsDomTypes(): boolean {
    // Check if we should use org.scalajs.dom types instead of js types
    // This could be configurable based on dependencies or user preference
    return true; // Default to using ScalaJS DOM types
  }

  private convertUnionType(unionType: any): ScalaTypeRef {
    // TypeScript union types -> Scala union types (Scala 3) or js.| (Scala 2)
    if (this.config.scalaVersion === 'Scala3') {
      // Use Scala 3 union types
      const types = unionType.types.map((t: TsType) => this.convertType(t));
      if (types.length === 2) {
        return new ScalaTypeRef(
          ScalaQualifiedName.from(['scala', 'Union']),
          IArray.from(types),
          Comments.NoComments
        );
      }
    }

    // Fallback: use js.| for Scala 2 or complex unions
    return new ScalaTypeRef(
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', '|']),
      IArray.from(unionType.types.map((t: TsType) => this.convertType(t))),
      Comments.NoComments
    );
  }

  private convertIntersectionType(intersectionType: any): ScalaTypeRef {
    // TypeScript intersection types -> Scala with clauses
    // For now, just take the first type (TODO: better intersection handling)
    if (intersectionType.types.length > 0) {
      return this.convertType(intersectionType.types[0]);
    }
    return ScalaTypeRef.Any;
  }

  private convertFunctionType(functionType: any): ScalaTypeRef {
    // TypeScript function types -> Scala js.Function types
    const signature = functionType.signature;
    const paramCount = signature.params.length;

    // Use appropriate js.FunctionN type
    const functionTypeName = paramCount <= 22
      ? `Function${paramCount}`
      : 'Function'; // Fallback for functions with many parameters

    const paramTypes = signature.params.map((param: any) => this.convertType(param.tpe));
    const returnType = signature.resultType
      ? this.convertType(signature.resultType)
      : ScalaTypeRef.Unit;

    return new ScalaTypeRef(
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', functionTypeName]),
      IArray.from([...paramTypes, returnType]),
      Comments.NoComments
    );
  }

  private convertTupleType(tupleType: any): ScalaTypeRef {
    // TypeScript tuples -> Scala tuples
    const elementTypes = tupleType.elements.map((elem: any) => this.convertType(elem.tpe));

    if (elementTypes.length <= 22) {
      // Use Scala tuple types
      const tupleTypeName = elementTypes.length === 1 ? 'Tuple1' : `Tuple${elementTypes.length}`;
      return new ScalaTypeRef(
        ScalaQualifiedName.from(['scala', tupleTypeName]),
        IArray.from(elementTypes),
        Comments.NoComments
      );
    } else {
      // Fallback to js.Array for large tuples
      return new ScalaTypeRef(
        ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Array']),
        IArray.from([ScalaTypeRef.Any]),
        Comments.NoComments
      );
    }
  }

  private convertLiteralType(literalType: any): ScalaTypeRef {
    // TypeScript literal types -> Scala literal types (Scala 3) or base types
    const literal = literalType.literal;

    if (this.config.scalaVersion === 'Scala3') {
      // Use Scala 3 literal types
      if (literal.value !== undefined) {
        if (typeof literal.value === 'string') {
          return new ScalaTypeRef(
            ScalaQualifiedName.from([`"${literal.value}"`]),
            IArray.Empty,
            Comments.NoComments
          );
        } else if (typeof literal.value === 'number') {
          return new ScalaTypeRef(
            ScalaQualifiedName.from([literal.value.toString()]),
            IArray.Empty,
            Comments.NoComments
          );
        }
      }
    }

    // Fallback to base types
    if (typeof literal.value === 'string') {
      return ScalaTypeRef.String;
    } else if (typeof literal.value === 'number') {
      return ScalaTypeRef.Double;
    } else if (typeof literal.value === 'boolean') {
      return ScalaTypeRef.Boolean;
    }

    return ScalaTypeRef.Any;
  }

  private convertRepeatedType(repeatedType: any): ScalaTypeRef {
    // TypeScript rest parameters -> Scala repeated parameters
    const underlyingType = this.convertType(repeatedType.underlying);
    return new ScalaTypeRef(
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Array']),
      IArray.from([underlyingType]),
      Comments.NoComments
    );
  }

  private createJsUndefOr(innerType: ScalaTypeRef): ScalaTypeRef {
    return new ScalaTypeRef(
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'UndefOr']),
      IArray.from([innerType]),
      Comments.NoComments
    );
  }

  /**
   * Convert TypeScript type parameters to Scala type parameters
   */
  convertTypeParams(tsTypeParams: any[]): ScalaTypeParamTree[] {
    return tsTypeParams.map(tp => {
      const upperBounds = tp.upperBound
        ? [this.convertType(tp.upperBound)]
        : [];

      return new ScalaTypeParamTree(
        new ScalaName(tp.name.value),
        IArray.from(upperBounds),
        IArray.Empty // Lower bounds not common in TypeScript
      );
    });
  }
}

/**
 * TypeScript to Scala member converter
 */
class TypeScriptToScalaMemberConverter {
  private readonly adaptiveNaming: AdaptiveNaming;
  private readonly librarySpecificNaming: LibrarySpecificNaming;

  constructor(
    private readonly config: Phase2Config,
    private readonly typeConverter: TypeScriptToScalaTypeConverter
  ) {
    this.adaptiveNaming = new AdaptiveNaming(config.outputPkg, true);
    this.librarySpecificNaming = new LibrarySpecificNaming();
  }

  convertClassMembers(members: any[], scope: TsTreeScope): ScalaTree[] {
    const scalaMembers: ScalaTree[] = [];

    for (const member of members) {
      const converted = this.convertMember(member, scope, 'class');
      if (converted) {
        scalaMembers.push(converted);
      }
    }

    return scalaMembers;
  }

  convertInterfaceMembers(members: any[], scope: TsTreeScope): ScalaTree[] {
    const scalaMembers: ScalaTree[] = [];

    for (const member of members) {
      const converted = this.convertMember(member, scope, 'trait');
      if (converted) {
        scalaMembers.push(converted);
      }
    }

    return scalaMembers;
  }

  private convertMember(member: any, scope: TsTreeScope, context: 'class' | 'trait'): ScalaTree | undefined {
    switch (member.nodeType) {
      case 'TsMemberFunction':
        return this.convertMemberFunction(member, scope, context);
      case 'TsMemberProperty':
        return this.convertMemberProperty(member, scope, context);
      case 'TsMemberCtor':
        return this.convertConstructor(member, scope);
      case 'TsMemberCall':
        return this.convertCallSignature(member, scope, context);
      case 'TsMemberIndex':
        return this.convertIndexSignature(member, scope, context);
      default:
        console.warn(`Unsupported member type: ${member.nodeType}`);
        return undefined;
    }
  }

  private convertMemberFunction(
    tsMember: any,
    scope: TsTreeScope,
    context: 'class' | 'trait'
  ): ScalaMethodTree {
    const scalaName = new ScalaName(this.sanitizeScalaName(tsMember.name.value));
    const annotations = this.createMethodAnnotations(tsMember, context);
    const protectionLevel = this.convertProtectionLevel(tsMember.level);

    // Convert type parameters
    const tparams = tsMember.signature.tparams
      ? this.typeConverter.convertTypeParams(tsMember.signature.tparams)
      : [];

    // Convert parameters
    const paramGroups = this.convertParameterGroups(tsMember.signature.params);

    // Convert return type
    const returnType = tsMember.signature.resultType
      ? this.typeConverter.convertType(tsMember.signature.resultType)
      : ScalaTypeRef.Unit;

    // Handle method type (getter/setter)
    const finalName = this.adjustMethodName(scalaName, tsMember.methodType);

    return new ScalaMethodTree(
      IArray.from(annotations),
      protectionLevel,
      finalName,
      IArray.from(tparams),
      IArray.from(paramGroups),
      returnType,
      this.convertComments(tsMember.comments),
      ScalaQualifiedName.from([this.config.outputPkg, finalName.value]),
      false, // isOverride - TODO: detect overrides
      false  // isImplicit
    );
  }

  private convertMemberProperty(
    tsMember: any,
    scope: TsTreeScope,
    context: 'class' | 'trait'
  ): ScalaFieldTree {
    const scalaName = new ScalaName(this.sanitizeScalaName(tsMember.name.value));
    const annotations = this.createPropertyAnnotations(tsMember, context);
    const protectionLevel = this.convertProtectionLevel(tsMember.level);

    // Convert property type
    const propertyType = this.typeConverter.convertType(tsMember.tpe);

    // Handle optional properties
    const finalType = tsMember.isOptional
      ? this.createJsUndefOr(propertyType)
      : propertyType;

    return new ScalaFieldTree(
      IArray.from(annotations),
      protectionLevel,
      scalaName,
      finalType,
      this.convertComments(tsMember.comments),
      ScalaQualifiedName.from([this.config.outputPkg, scalaName.value]),
      tsMember.isReadOnly,
      false, // isOverride - TODO: detect overrides
      false  // isImplicit
    );
  }

  private convertConstructor(tsMember: any, scope: TsTreeScope): ScalaMethodTree {
    const annotations = [ScalaAnnotation.JSImport]; // Constructors typically need JSImport
    const protectionLevel = this.convertProtectionLevel(tsMember.level);

    // Convert constructor parameters
    const paramGroups = this.convertParameterGroups(tsMember.signature.params);

    return new ScalaMethodTree(
      IArray.from(annotations),
      protectionLevel,
      new ScalaName('apply'), // Scala constructors become apply methods
      IArray.Empty, // No type parameters for constructors typically
      IArray.from(paramGroups),
      ScalaTypeRef.Any, // Constructor return type
      this.convertComments(tsMember.comments),
      ScalaQualifiedName.from([this.config.outputPkg, 'apply']),
      false, // isOverride
      false  // isImplicit
    );
  }

  private convertCallSignature(
    tsMember: any,
    scope: TsTreeScope,
    context: 'class' | 'trait'
  ): ScalaMethodTree {
    // Call signatures become apply methods
    const annotations = this.createCallSignatureAnnotations(context);

    const paramGroups = this.convertParameterGroups(tsMember.signature.params);
    const returnType = tsMember.signature.resultType
      ? this.typeConverter.convertType(tsMember.signature.resultType)
      : ScalaTypeRef.Any;

    return new ScalaMethodTree(
      IArray.from(annotations),
      ScalaProtectionLevel.Public,
      new ScalaName('apply'),
      IArray.Empty,
      IArray.from(paramGroups),
      returnType,
      this.convertComments(tsMember.comments),
      ScalaQualifiedName.from([this.config.outputPkg, 'apply']),
      false, // isOverride
      false  // isImplicit
    );
  }

  private convertIndexSignature(
    tsMember: any,
    scope: TsTreeScope,
    context: 'class' | 'trait'
  ): ScalaMethodTree {
    // Index signatures become apply/update methods
    const valueType = this.typeConverter.convertType(tsMember.valueType);
    const keyType = this.getIndexKeyType(tsMember.indexing);

    // Create getter method
    const getterParams = [IArray.from([
      new ScalaParamTree(
        new ScalaName('key'),
        keyType,
        false, // isImplicit
        false  // isDefault
      )
    ])];

    return new ScalaMethodTree(
      IArray.from([ScalaAnnotation.JSImport]),
      ScalaProtectionLevel.Public,
      new ScalaName('apply'),
      IArray.Empty,
      IArray.from(getterParams),
      valueType,
      this.convertComments(tsMember.comments),
      ScalaQualifiedName.from([this.config.outputPkg, 'apply']),
      false, // isOverride
      false  // isImplicit
    );
  }

  private convertParameterGroups(tsParams: any[]): ScalaParamTree[][] {
    if (!tsParams || tsParams.length === 0) {
      return [];
    }

    const scalaParams = tsParams.map(param => this.convertParameter(param));
    return [scalaParams]; // Single parameter group
  }

  private convertParameter(tsParam: any): ScalaParamTree {
    const paramName = new ScalaName(this.sanitizeScalaName(tsParam.name.value));
    const paramType = tsParam.isOptional
      ? this.createJsUndefOr(this.typeConverter.convertType(tsParam.tpe))
      : this.typeConverter.convertType(tsParam.tpe);

    return new ScalaParamTree(
      paramName,
      paramType,
      false, // isImplicit
      tsParam.isOptional // isDefault (optional parameters have defaults)
    );
  }

  private convertProtectionLevel(tsLevel: any): ScalaProtectionLevel {
    switch (tsLevel) {
      case 'private': return ScalaProtectionLevel.Private;
      case 'protected': return ScalaProtectionLevel.Protected;
      case 'public':
      default: return ScalaProtectionLevel.Public;
    }
  }

  private createMethodAnnotations(tsMember: any, context: 'class' | 'trait'): ScalaAnnotation[] {
    const annotations: ScalaAnnotation[] = [];

    if (this.config.enableScalaJsDefined === 'All' && context === 'trait') {
      annotations.push(ScalaAnnotation.ScalaJSDefined);
    } else {
      annotations.push(ScalaAnnotation.JsNative);
    }

    // Add JSName annotation if method name needs escaping
    if (this.needsJSNameAnnotation(tsMember.name.value)) {
      annotations.push(new ScalaAnnotation('JSName', IArray.Empty, IArray.from([tsMember.name.value])));
    }

    return annotations;
  }

  private createPropertyAnnotations(tsMember: any, context: 'class' | 'trait'): ScalaAnnotation[] {
    const annotations: ScalaAnnotation[] = [];

    if (this.config.enableScalaJsDefined === 'All' && context === 'trait') {
      annotations.push(ScalaAnnotation.ScalaJSDefined);
    } else {
      annotations.push(ScalaAnnotation.JsNative);
    }

    return annotations;
  }

  private createCallSignatureAnnotations(context: 'class' | 'trait'): ScalaAnnotation[] {
    return [ScalaAnnotation.JsNative];
  }

  private adjustMethodName(name: ScalaName, methodType: string): ScalaName {
    switch (methodType) {
      case 'getter':
        return name; // Keep as-is for getters
      case 'setter':
        return new ScalaName(`${name.value}_=`); // Scala setter syntax
      default:
        return name;
    }
  }

  private getIndexKeyType(indexing: any): ScalaTypeRef {
    if (indexing.nodeType === 'IndexingSingle') {
      return ScalaTypeRef.String; // Default to string keys
    } else if (indexing.nodeType === 'IndexingDict') {
      return this.typeConverter.convertType(indexing.keyType);
    }
    return ScalaTypeRef.String;
  }

  private createJsUndefOr(innerType: ScalaTypeRef): ScalaTypeRef {
    return new ScalaTypeRef(
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'UndefOr']),
      IArray.from([innerType]),
      Comments.NoComments
    );
  }

  private needsJSNameAnnotation(name: string): boolean {
    // Check if name contains characters that need escaping in Scala
    return /[^a-zA-Z0-9_$]/.test(name) || this.isScalaKeyword(name);
  }

  private isScalaKeyword(name: string): boolean {
    const scalaKeywords = new Set([
      'abstract', 'case', 'catch', 'class', 'def', 'do', 'else', 'extends',
      'false', 'final', 'finally', 'for', 'forSome', 'if', 'implicit',
      'import', 'lazy', 'match', 'new', 'null', 'object', 'override',
      'package', 'private', 'protected', 'return', 'sealed', 'super',
      'this', 'throw', 'trait', 'try', 'true', 'type', 'val', 'var',
      'while', 'with', 'yield'
    ]);
    return scalaKeywords.has(name);
  }

  private sanitizeScalaName(name: string): string {
    // Use adaptive naming system for consistent name handling
    const tsQIdent = TsQIdent.of(name);
    const scalaName = this.adaptiveNaming.getScalaName(tsQIdent);

    // Return just the last part (the actual name)
    return scalaName.parts[scalaName.parts.length - 1];
  }

  private convertComments(comments: any): Comments {
    return comments || Comments.NoComments;
  }
}