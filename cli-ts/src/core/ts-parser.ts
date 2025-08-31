/**
 * TypeScript parser using the TypeScript compiler API
 * Equivalent to Scala TsParser and TsLexer
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
  TsParsedFile,
  TsContainerOrDecl,
  TsDeclModule,
  TsDeclNamespace,
  TsDeclClass,
  TsDeclInterface,
  TsDeclTypeAlias,
  TsDeclVar,
  TsDeclFunction,
  TsDeclEnum,
  TsImport,
  TsExport,
  TsGlobal,
  Comments,
  Comment,
  CodePath,
  JsLocation,
  TsIdentSimple,
  TsIdentModule,
  TsQIdent,
  IArray,
  Directive
} from '../types/index.js';

/**
 * TypeScript parser configuration
 */
export interface TsParserConfig {
  /** TypeScript compiler options */
  compilerOptions: ts.CompilerOptions;
  
  /** Whether to include type-only imports/exports */
  includeTypeOnly: boolean;
  
  /** Whether to parse JSDoc comments */
  parseJSDoc: boolean;
  
  /** Whether to include ambient declarations */
  includeAmbient: boolean;
}

/**
 * Default parser configuration
 */
export const DEFAULT_PARSER_CONFIG: TsParserConfig = {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    allowJs: true,
    declaration: true,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: true
  },
  includeTypeOnly: true,
  parseJSDoc: true,
  includeAmbient: true
};

/**
 * TypeScript parser using compiler API
 * Replaces Scala parser combinators with TypeScript's native parsing
 */
export class TsParser {
  private readonly config: TsParserConfig;
  private readonly program: ts.Program;

  constructor(
    filePaths: string[],
    config: TsParserConfig = DEFAULT_PARSER_CONFIG
  ) {
    this.config = config;
    
    // Create TypeScript program
    this.program = ts.createProgram(filePaths, config.compilerOptions);
  }

  /**
   * Parse a single TypeScript file
   */
  async parseFile(filePath: string): Promise<TsParsedFile> {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`Could not find source file: ${filePath}`);
    }

    const codePath = CodePath.hasPath(
      path.basename(path.dirname(filePath)),
      TsQIdent.of(path.basename(filePath, path.extname(filePath)))
    );

    // Extract directives (/// <reference> comments, etc.)
    const directives = this.extractDirectives(sourceFile);

    // Extract file-level comments
    const comments = this.extractComments(sourceFile);

    // Parse all top-level declarations
    const members: TsContainerOrDecl[] = [];
    
    for (const statement of sourceFile.statements) {
      const parsed = this.parseStatement(statement, codePath);
      if (parsed) {
        members.push(parsed);
      }
    }

    return new TsParsedFile(
      comments,
      IArray.from(directives),
      members,
      codePath
    );
  }

  /**
   * Parse multiple TypeScript files
   */
  async parseFiles(filePaths: string[]): Promise<TsParsedFile[]> {
    const results: TsParsedFile[] = [];
    
    for (const filePath of filePaths) {
      try {
        const parsed = await this.parseFile(filePath);
        results.push(parsed);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Extract compiler directives from source file
   */
  private extractDirectives(sourceFile: ts.SourceFile): Directive[] {
    const directives: Directive[] = [];
    
    // Extract /// <reference> directives
    if (sourceFile.referencedFiles) {
      for (const ref of sourceFile.referencedFiles) {
        directives.push(new Directive('reference', 'path', ref.fileName));
      }
    }
    
    if (sourceFile.typeReferenceDirectives) {
      for (const ref of sourceFile.typeReferenceDirectives) {
        directives.push(new Directive('reference', 'types', ref.fileName));
      }
    }
    
    return directives;
  }

  /**
   * Extract comments from a node
   */
  private extractComments(node: ts.Node): Comments {
    const comments: Comment[] = [];
    const sourceFile = node.getSourceFile();
    
    // Get leading comments
    const leadingComments = ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart());
    if (leadingComments) {
      for (const comment of leadingComments) {
        const text = sourceFile.text.substring(comment.pos, comment.end);
        comments.push(new Comment(text));
      }
    }
    
    // Get trailing comments
    const trailingComments = ts.getTrailingCommentRanges(sourceFile.text, node.getEnd());
    if (trailingComments) {
      for (const comment of trailingComments) {
        const text = sourceFile.text.substring(comment.pos, comment.end);
        comments.push(new Comment(text));
      }
    }
    
    return new Comments(comments);
  }

  /**
   * Parse a top-level statement
   */
  private parseStatement(statement: ts.Statement, codePath: CodePath): TsContainerOrDecl | undefined {
    const comments = this.extractComments(statement);
    
    switch (statement.kind) {
      case ts.SyntaxKind.ModuleDeclaration:
        return this.parseModuleDeclaration(statement as ts.ModuleDeclaration, comments, codePath);
        
      case ts.SyntaxKind.ClassDeclaration:
        return this.parseClassDeclaration(statement as ts.ClassDeclaration, comments, codePath);
        
      case ts.SyntaxKind.InterfaceDeclaration:
        return this.parseInterfaceDeclaration(statement as ts.InterfaceDeclaration, comments, codePath);
        
      case ts.SyntaxKind.TypeAliasDeclaration:
        return this.parseTypeAliasDeclaration(statement as ts.TypeAliasDeclaration, comments, codePath);
        
      case ts.SyntaxKind.VariableStatement:
        return this.parseVariableStatement(statement as ts.VariableStatement, comments, codePath);
        
      case ts.SyntaxKind.FunctionDeclaration:
        return this.parseFunctionDeclaration(statement as ts.FunctionDeclaration, comments, codePath);
        
      case ts.SyntaxKind.EnumDeclaration:
        return this.parseEnumDeclaration(statement as ts.EnumDeclaration, comments, codePath);
        
      case ts.SyntaxKind.ImportDeclaration:
        return this.parseImportDeclaration(statement as ts.ImportDeclaration, comments, codePath);
        
      case ts.SyntaxKind.ExportDeclaration:
      case ts.SyntaxKind.ExportAssignment:
        return this.parseExportDeclaration(statement as ts.ExportDeclaration | ts.ExportAssignment, comments, codePath);
        
      default:
        // Skip unsupported statement types for now
        return undefined;
    }
  }

  /**
   * Parse module declaration
   */
  private parseModuleDeclaration(
    node: ts.ModuleDeclaration,
    comments: Comments,
    codePath: CodePath
  ): TsDeclModule | TsDeclNamespace | undefined {
    if (!node.name) return undefined;
    
    const name = node.name.text;
    const declared = this.hasAmbientModifier(node);
    const jsLocation = JsLocation.Zero; // TODO: Calculate proper JS location
    
    // Parse nested members
    const members: TsContainerOrDecl[] = [];
    if (node.body && ts.isModuleBlock(node.body)) {
      for (const statement of node.body.statements) {
        const parsed = this.parseStatement(statement, codePath.add(name));
        if (parsed) {
          members.push(parsed);
        }
      }
    }
    
    // Determine if this is a namespace or module
    if (node.flags & ts.NodeFlags.Namespace) {
      return new TsDeclNamespace(
        comments,
        declared,
        new TsIdentSimple(name),
        members,
        codePath,
        jsLocation
      );
    } else {
      return new TsDeclModule(
        comments,
        declared,
        TsIdentModule.simple(name),
        members,
        codePath,
        jsLocation
      );
    }
  }

  /**
   * Parse class declaration
   */
  private parseClassDeclaration(
    node: ts.ClassDeclaration,
    comments: Comments,
    codePath: CodePath
  ): TsDeclClass | undefined {
    if (!node.name) return undefined;

    const name = new TsIdentSimple(node.name.text);
    const declared = this.hasAmbientModifier(node);
    const isAbstract = this.hasAbstractModifier(node);

    // Parse type parameters
    const tparams = node.typeParameters
      ? node.typeParameters.map(tp => this.parseTypeParameter(tp))
      : [];

    // Parse heritage clauses
    let parent: any = undefined;
    const implementsClause: any[] = [];

    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword && clause.types.length > 0) {
          parent = this.parseTypeReference(clause.types[0]);
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          for (const type of clause.types) {
            implementsClause.push(this.parseTypeReference(type));
          }
        }
      }
    }

    // Parse class members
    const members: any[] = [];
    for (const member of node.members) {
      const parsedMember = this.parseClassMember(member);
      if (parsedMember) {
        members.push(parsedMember);
      }
    }

    return new TsDeclClass(
      comments,
      declared,
      isAbstract,
      name,
      IArray.from(tparams),
      parent,
      IArray.from(implementsClause),
      IArray.from(members),
      JsLocation.Zero, // TODO: Calculate JS location
      codePath
    );
  }

  /**
   * Parse interface declaration
   */
  private parseInterfaceDeclaration(
    node: ts.InterfaceDeclaration,
    comments: Comments,
    codePath: CodePath
  ): TsDeclInterface | undefined {
    const name = new TsIdentSimple(node.name.text);
    const declared = this.hasAmbientModifier(node);

    // Parse type parameters
    const tparams = node.typeParameters
      ? node.typeParameters.map(tp => this.parseTypeParameter(tp))
      : [];

    // Parse heritage clauses (extends)
    const inheritance: any[] = [];
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          for (const type of clause.types) {
            inheritance.push(this.parseTypeReference(type));
          }
        }
      }
    }

    // Parse interface members
    const members: any[] = [];
    for (const member of node.members) {
      const parsedMember = this.parseInterfaceMember(member);
      if (parsedMember) {
        members.push(parsedMember);
      }
    }

    return new TsDeclInterface(
      comments,
      declared,
      name,
      IArray.from(tparams),
      IArray.from(inheritance),
      IArray.from(members),
      codePath
    );
  }

  /**
   * Check if node has ambient (declare) modifier
   */
  private hasAmbientModifier(node: ts.Node): boolean {
    return !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DeclareKeyword));
  }

  /**
   * Check if node has abstract modifier
   */
  private hasAbstractModifier(node: ts.Node): boolean {
    return !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AbstractKeyword));
  }

  /**
   * Parse type alias declaration
   */
  private parseTypeAliasDeclaration(
    node: ts.TypeAliasDeclaration,
    comments: Comments,
    codePath: CodePath
  ): TsDeclTypeAlias | undefined {
    const name = new TsIdentSimple(node.name.text);
    const declared = this.hasAmbientModifier(node);

    // Parse type parameters
    const tparams = node.typeParameters
      ? node.typeParameters.map(tp => this.parseTypeParameter(tp))
      : [];

    // Parse alias type
    const aliasType = this.parseType(node.type);

    return new TsDeclTypeAlias(
      comments,
      declared,
      name,
      IArray.from(tparams),
      aliasType,
      codePath
    );
  }

  /**
   * Parse variable statement
   */
  private parseVariableStatement(
    node: ts.VariableStatement,
    comments: Comments,
    codePath: CodePath
  ): TsDeclVar | undefined {
    // Take the first variable declaration
    const decl = node.declarationList.declarations[0];
    if (!decl || !ts.isIdentifier(decl.name)) return undefined;

    const name = new TsIdentSimple(decl.name.text);
    const declared = this.hasAmbientModifier(node);
    const readOnly = node.declarationList.flags & ts.NodeFlags.Const ? true : false;

    // Parse type annotation
    const type = decl.type ? this.parseType(decl.type) : undefined;

    // Parse initializer (for now, just note its presence)
    const hasInitializer = !!decl.initializer;

    return new TsDeclVar(
      comments,
      declared,
      readOnly,
      name,
      type,
      hasInitializer ? {} : undefined, // Placeholder for initializer
      JsLocation.Zero,
      codePath
    );
  }

  /**
   * Parse function declaration
   */
  private parseFunctionDeclaration(
    node: ts.FunctionDeclaration,
    comments: Comments,
    codePath: CodePath
  ): TsDeclFunction | undefined {
    if (!node.name) return undefined;

    const name = new TsIdentSimple(node.name.text);
    const declared = this.hasAmbientModifier(node);

    // Parse function signature
    const tparams = node.typeParameters
      ? node.typeParameters.map(tp => this.parseTypeParameter(tp))
      : [];

    const params = node.parameters.map(param => this.parseParameter(param));
    const returnType = node.type ? this.parseType(node.type) : undefined;

    const signature = {
      comments: Comments.NoComments,
      tparams: IArray.from(tparams),
      params: IArray.from(params),
      resultType: returnType
    };

    return new TsDeclFunction(
      comments,
      declared,
      name,
      signature,
      JsLocation.Zero,
      codePath
    );
  }

  /**
   * Parse enum declaration
   */
  private parseEnumDeclaration(
    node: ts.EnumDeclaration,
    comments: Comments,
    codePath: CodePath
  ): TsDeclEnum | undefined {
    const name = new TsIdentSimple(node.name.text);
    const declared = this.hasAmbientModifier(node);
    const isConst = this.hasConstModifier(node);

    // Parse enum members
    const members = node.members.map(member => this.parseEnumMember(member));

    return new TsDeclEnum(
      comments,
      declared,
      isConst,
      name,
      IArray.from(members),
      JsLocation.Zero,
      codePath
    );
  }

  private parseEnumMember(node: ts.EnumMember): any {
    const name = ts.isIdentifier(node.name)
      ? new TsIdentSimple(node.name.text)
      : new TsIdentSimple(node.name.getText());

    // Parse initializer if present
    const value = node.initializer ? {} : undefined; // Placeholder for initializer

    return {
      comments: this.extractComments(node),
      name,
      value
    };
  }

  /**
   * Parse import declaration
   */
  private parseImportDeclaration(
    node: ts.ImportDeclaration,
    comments: Comments,
    codePath: CodePath
  ): TsImport | undefined {
    const typeOnly = node.importClause?.isTypeOnly ?? false;
    const moduleSpecifier = this.getStringLiteralValue(node.moduleSpecifier);

    if (!moduleSpecifier) return undefined;

    let imported: any;

    if (!node.importClause) {
      // Side-effect import: import "module"
      imported = {
        nodeType: 'TsImportedSimple',
        from: TsIdentModule.simple(moduleSpecifier)
      };
    } else if (node.importClause.namedBindings) {
      if (ts.isNamespaceImport(node.importClause.namedBindings)) {
        // Star import: import * as name from "module"
        imported = {
          nodeType: 'TsImportedStar',
          as: new TsIdentSimple(node.importClause.namedBindings.name.text),
          from: TsIdentModule.simple(moduleSpecifier)
        };
      } else if (ts.isNamedImports(node.importClause.namedBindings)) {
        // Named imports: import { a, b } from "module"
        const elements = node.importClause.namedBindings.elements.map(elem => ({
          name: new TsIdentSimple(elem.name.text),
          as: elem.propertyName ? new TsIdentSimple(elem.propertyName.text) : undefined
        }));

        imported = {
          nodeType: 'TsImportedDestructuring',
          elements: IArray.from(elements),
          from: TsIdentModule.simple(moduleSpecifier)
        };
      }
    } else if (node.importClause.name) {
      // Default import: import name from "module"
      imported = {
        nodeType: 'TsImportedDestructuring',
        elements: IArray.from([{
          name: new TsIdentSimple('default'),
          as: new TsIdentSimple(node.importClause.name.text)
        }]),
        from: TsIdentModule.simple(moduleSpecifier)
      };
    }

    if (!imported) return undefined;

    return new TsImport(
      comments,
      typeOnly,
      imported,
      codePath
    );
  }

  /**
   * Parse export declaration
   */
  private parseExportDeclaration(
    node: ts.ExportDeclaration | ts.ExportAssignment,
    comments: Comments,
    codePath: CodePath
  ): TsExport | undefined {
    const typeOnly = 'isTypeOnly' in node ? node.isTypeOnly ?? false : false;

    if (ts.isExportDeclaration(node)) {
      return this.parseExportDeclarationNode(node, comments, codePath, typeOnly);
    } else if (ts.isExportAssignment(node)) {
      return this.parseExportAssignmentNode(node, comments, codePath);
    }

    return undefined;
  }

  private parseExportDeclarationNode(
    node: ts.ExportDeclaration,
    comments: Comments,
    codePath: CodePath,
    typeOnly: boolean
  ): TsExport | undefined {
    let exported: any;

    if (!node.exportClause) {
      // Star export: export * from "module"
      const moduleSpecifier = node.moduleSpecifier ? this.getStringLiteralValue(node.moduleSpecifier) : undefined;
      if (!moduleSpecifier) return undefined;

      exported = {
        nodeType: 'TsExporteeStar',
        as: undefined,
        from: TsIdentModule.simple(moduleSpecifier)
      };
    } else if (ts.isNamedExports(node.exportClause)) {
      // Named exports: export { a, b } from "module"
      const moduleSpecifier = node.moduleSpecifier ? this.getStringLiteralValue(node.moduleSpecifier) : undefined;
      const elements = node.exportClause.elements.map(elem => ({
        name: new TsIdentSimple(elem.name.text),
        as: elem.propertyName ? new TsIdentSimple(elem.propertyName.text) : undefined
      }));

      exported = {
        nodeType: 'TsExporteeNames',
        idents: IArray.from(elements),
        from: moduleSpecifier ? TsIdentModule.simple(moduleSpecifier) : undefined
      };
    } else if (ts.isNamespaceExport(node.exportClause)) {
      // Namespace export: export * as name from "module"
      const moduleSpecifier = node.moduleSpecifier ? this.getStringLiteralValue(node.moduleSpecifier) : undefined;
      if (!moduleSpecifier) return undefined;

      exported = {
        nodeType: 'TsExporteeStar',
        as: new TsIdentSimple(node.exportClause.name.text),
        from: TsIdentModule.simple(moduleSpecifier)
      };
    }

    if (!exported) return undefined;

    return new TsExport(
      comments,
      typeOnly,
      'Named', // ExportType
      exported,
      codePath
    );
  }

  private parseExportAssignmentNode(
    node: ts.ExportAssignment,
    comments: Comments,
    codePath: CodePath
  ): TsExport | undefined {
    // Export assignment: export = expression
    const exported = {
      nodeType: 'TsExporteeTree',
      tree: node.expression // TODO: Parse expression properly
    };

    return new TsExport(
      comments,
      false, // Not type-only
      node.isExportEquals ? 'Named' : 'Default',
      exported,
      codePath
    );
  }

  private getStringLiteralValue(node: ts.Node): string | undefined {
    if (ts.isStringLiteral(node)) {
      return node.text;
    }
    return undefined;
  }

  /**
   * Check if node has const modifier
   */
  private hasConstModifier(node: ts.Node): boolean {
    return !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ConstKeyword));
  }

  /**
   * Parse type parameter
   */
  private parseTypeParameter(node: ts.TypeParameterDeclaration): any {
    const name = new TsIdentSimple(node.name.text);
    const upperBound = node.constraint ? this.parseType(node.constraint) : undefined;
    const defaultType = node.default ? this.parseType(node.default) : undefined;

    return {
      comments: Comments.NoComments,
      name,
      upperBound,
      defaultType
    };
  }

  /**
   * Parse type reference from heritage clause
   */
  private parseTypeReference(node: ts.ExpressionWithTypeArguments): any {
    // TODO: Implement full type reference parsing
    const typeName = this.getTypeNameFromExpression(node.expression);
    const typeArgs = node.typeArguments
      ? node.typeArguments.map(arg => this.parseType(arg))
      : [];

    return {
      nodeType: 'TsTypeRef',
      comments: Comments.NoComments,
      name: TsQIdent.of(...typeName.split('.')),
      targs: IArray.from(typeArgs)
    };
  }

  /**
   * Parse TypeScript type
   */
  private parseType(node: ts.TypeNode): any {
    switch (node.kind) {
      case ts.SyntaxKind.StringKeyword:
        return { nodeType: 'TsTypeRef', name: TsQIdent.of('string'), targs: IArray.Empty };
      case ts.SyntaxKind.NumberKeyword:
        return { nodeType: 'TsTypeRef', name: TsQIdent.of('number'), targs: IArray.Empty };
      case ts.SyntaxKind.BooleanKeyword:
        return { nodeType: 'TsTypeRef', name: TsQIdent.of('boolean'), targs: IArray.Empty };
      case ts.SyntaxKind.VoidKeyword:
        return { nodeType: 'TsTypeRef', name: TsQIdent.of('void'), targs: IArray.Empty };
      case ts.SyntaxKind.AnyKeyword:
        return { nodeType: 'TsTypeRef', name: TsQIdent.of('any'), targs: IArray.Empty };
      case ts.SyntaxKind.UnknownKeyword:
        return { nodeType: 'TsTypeRef', name: TsQIdent.of('unknown'), targs: IArray.Empty };
      case ts.SyntaxKind.NeverKeyword:
        return { nodeType: 'TsTypeRef', name: TsQIdent.of('never'), targs: IArray.Empty };
      case ts.SyntaxKind.TypeReference:
        return this.parseTypeReferenceNode(node as ts.TypeReferenceNode);
      case ts.SyntaxKind.UnionType:
        return this.parseUnionType(node as ts.UnionTypeNode);
      case ts.SyntaxKind.IntersectionType:
        return this.parseIntersectionType(node as ts.IntersectionTypeNode);
      case ts.SyntaxKind.ArrayType:
        return this.parseArrayType(node as ts.ArrayTypeNode);
      case ts.SyntaxKind.TupleType:
        return this.parseTupleType(node as ts.TupleTypeNode);
      case ts.SyntaxKind.FunctionType:
        return this.parseFunctionType(node as ts.FunctionTypeNode);
      default:
        console.warn(`Unsupported type kind: ${ts.SyntaxKind[node.kind]}`);
        return { nodeType: 'TsTypeRef', name: TsQIdent.of('any'), targs: IArray.Empty };
    }
  }

  /**
   * Parse interface member
   */
  private parseInterfaceMember(node: ts.TypeElement): any {
    const comments = this.extractComments(node);

    switch (node.kind) {
      case ts.SyntaxKind.PropertySignature:
        return this.parsePropertySignature(node as ts.PropertySignature, comments);
      case ts.SyntaxKind.MethodSignature:
        return this.parseMethodSignature(node as ts.MethodSignature, comments);
      case ts.SyntaxKind.CallSignature:
        return this.parseCallSignature(node as ts.CallSignatureDeclaration, comments);
      case ts.SyntaxKind.IndexSignature:
        return this.parseIndexSignature(node as ts.IndexSignatureDeclaration, comments);
      default:
        console.warn(`Unsupported interface member kind: ${ts.SyntaxKind[node.kind]}`);
        return undefined;
    }
  }

  /**
   * Parse class member
   */
  private parseClassMember(node: ts.ClassElement): any {
    const comments = this.extractComments(node);

    switch (node.kind) {
      case ts.SyntaxKind.PropertyDeclaration:
        return this.parsePropertyDeclaration(node as ts.PropertyDeclaration, comments);
      case ts.SyntaxKind.MethodDeclaration:
        return this.parseMethodDeclaration(node as ts.MethodDeclaration, comments);
      case ts.SyntaxKind.Constructor:
        return this.parseConstructorDeclaration(node as ts.ConstructorDeclaration, comments);
      case ts.SyntaxKind.GetAccessor:
        return this.parseGetAccessor(node as ts.GetAccessorDeclaration, comments);
      case ts.SyntaxKind.SetAccessor:
        return this.parseSetAccessor(node as ts.SetAccessorDeclaration, comments);
      default:
        console.warn(`Unsupported class member kind: ${ts.SyntaxKind[node.kind]}`);
        return undefined;
    }
  }

  // Helper methods for getting type names and other utilities
  private getTypeNameFromExpression(expr: ts.Expression): string {
    if (ts.isIdentifier(expr)) {
      return expr.text;
    } else if (ts.isPropertyAccessExpression(expr)) {
      return `${this.getTypeNameFromExpression(expr.expression)}.${expr.name.text}`;
    }
    return 'unknown';
  }

  // Placeholder implementations for specific type parsing methods
  private parseTypeReferenceNode(node: ts.TypeReferenceNode): any {
    const typeName = this.getTypeNameFromExpression(node.typeName);
    const typeArgs = node.typeArguments
      ? node.typeArguments.map(arg => this.parseType(arg))
      : [];

    return {
      nodeType: 'TsTypeRef',
      comments: Comments.NoComments,
      name: TsQIdent.of(...typeName.split('.')),
      targs: IArray.from(typeArgs)
    };
  }

  private parseUnionType(node: ts.UnionTypeNode): any {
    return {
      nodeType: 'TsTypeUnion',
      types: IArray.from(node.types.map(t => this.parseType(t)))
    };
  }

  private parseIntersectionType(node: ts.IntersectionTypeNode): any {
    return {
      nodeType: 'TsTypeIntersect',
      types: IArray.from(node.types.map(t => this.parseType(t)))
    };
  }

  private parseArrayType(node: ts.ArrayTypeNode): any {
    return {
      nodeType: 'TsTypeRef',
      comments: Comments.NoComments,
      name: TsQIdent.of('Array'),
      targs: IArray.from([this.parseType(node.elementType)])
    };
  }

  private parseTupleType(node: ts.TupleTypeNode): any {
    const elements = node.elements.map(elem => ({
      tpe: this.parseType(elem),
      isOptional: false, // TODO: Handle optional tuple elements
      isRest: false // TODO: Handle rest elements
    }));

    return {
      nodeType: 'TsTypeTuple',
      elements: IArray.from(elements)
    };
  }

  private parseFunctionType(node: ts.FunctionTypeNode): any {
    const params = node.parameters.map(param => this.parseParameter(param));
    const returnType = node.type ? this.parseType(node.type) : undefined;

    return {
      nodeType: 'TsTypeFunction',
      signature: {
        comments: Comments.NoComments,
        tparams: IArray.Empty, // TODO: Handle type parameters
        params: IArray.from(params),
        resultType: returnType
      }
    };
  }

  // Placeholder implementations for member parsing methods
  private parsePropertySignature(node: ts.PropertySignature, comments: Comments): any {
    if (!node.name || !ts.isIdentifier(node.name)) return undefined;

    return {
      nodeType: 'TsMemberProperty',
      comments,
      level: 'public',
      name: new TsIdentSimple(node.name.text),
      tpe: node.type ? this.parseType(node.type) : { nodeType: 'TsTypeRef', name: TsQIdent.of('any') },
      isStatic: false,
      isReadOnly: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ReadonlyKeyword)),
      isOptional: !!node.questionToken
    };
  }

  private parseMethodSignature(node: ts.MethodSignature, comments: Comments): any {
    if (!node.name || !ts.isIdentifier(node.name)) return undefined;

    const params = node.parameters.map(param => this.parseParameter(param));
    const returnType = node.type ? this.parseType(node.type) : undefined;

    return {
      nodeType: 'TsMemberFunction',
      comments,
      level: 'public',
      name: new TsIdentSimple(node.name.text),
      methodType: 'normal',
      signature: {
        comments: Comments.NoComments,
        tparams: IArray.Empty, // TODO: Handle type parameters
        params: IArray.from(params),
        resultType: returnType
      },
      isStatic: false,
      isReadOnly: false
    };
  }

  private parseCallSignature(node: ts.CallSignatureDeclaration, comments: Comments): any {
    const params = node.parameters.map(param => this.parseParameter(param));
    const returnType = node.type ? this.parseType(node.type) : undefined;

    return {
      nodeType: 'TsMemberCall',
      comments,
      level: 'public',
      signature: {
        comments: Comments.NoComments,
        tparams: IArray.Empty,
        params: IArray.from(params),
        resultType: returnType
      }
    };
  }

  private parseIndexSignature(node: ts.IndexSignatureDeclaration, comments: Comments): any {
    const keyParam = node.parameters[0];
    const keyType = keyParam.type ? this.parseType(keyParam.type) : { nodeType: 'TsTypeRef', name: TsQIdent.of('string') };
    const valueType = node.type ? this.parseType(node.type) : { nodeType: 'TsTypeRef', name: TsQIdent.of('any') };

    return {
      nodeType: 'TsMemberIndex',
      comments,
      level: 'public',
      indexing: {
        nodeType: 'IndexingDict',
        key: new TsIdentSimple(keyParam.name.getText()),
        keyType
      },
      valueType,
      isReadOnly: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ReadonlyKeyword))
    };
  }

  private parsePropertyDeclaration(node: ts.PropertyDeclaration, comments: Comments): any {
    if (!node.name || !ts.isIdentifier(node.name)) return undefined;

    return {
      nodeType: 'TsMemberProperty',
      comments,
      level: this.getAccessLevel(node.modifiers),
      name: new TsIdentSimple(node.name.text),
      tpe: node.type ? this.parseType(node.type) : { nodeType: 'TsTypeRef', name: TsQIdent.of('any') },
      isStatic: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)),
      isReadOnly: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ReadonlyKeyword)),
      isOptional: !!node.questionToken
    };
  }

  private parseMethodDeclaration(node: ts.MethodDeclaration, comments: Comments): any {
    if (!node.name || !ts.isIdentifier(node.name)) return undefined;

    const params = node.parameters.map(param => this.parseParameter(param));
    const returnType = node.type ? this.parseType(node.type) : undefined;

    return {
      nodeType: 'TsMemberFunction',
      comments,
      level: this.getAccessLevel(node.modifiers),
      name: new TsIdentSimple(node.name.text),
      methodType: 'normal',
      signature: {
        comments: Comments.NoComments,
        tparams: IArray.Empty,
        params: IArray.from(params),
        resultType: returnType
      },
      isStatic: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)),
      isReadOnly: false
    };
  }

  private parseConstructorDeclaration(node: ts.ConstructorDeclaration, comments: Comments): any {
    const params = node.parameters.map(param => this.parseParameter(param));

    return {
      nodeType: 'TsMemberCtor',
      comments,
      level: this.getAccessLevel(node.modifiers),
      signature: {
        comments: Comments.NoComments,
        tparams: IArray.Empty,
        params: IArray.from(params),
        resultType: undefined
      }
    };
  }

  private parseGetAccessor(node: ts.GetAccessorDeclaration, comments: Comments): any {
    if (!node.name || !ts.isIdentifier(node.name)) return undefined;

    return {
      nodeType: 'TsMemberFunction',
      comments,
      level: this.getAccessLevel(node.modifiers),
      name: new TsIdentSimple(node.name.text),
      methodType: 'getter',
      signature: {
        comments: Comments.NoComments,
        tparams: IArray.Empty,
        params: IArray.Empty,
        resultType: node.type ? this.parseType(node.type) : undefined
      },
      isStatic: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)),
      isReadOnly: false
    };
  }

  private parseSetAccessor(node: ts.SetAccessorDeclaration, comments: Comments): any {
    if (!node.name || !ts.isIdentifier(node.name)) return undefined;

    const params = node.parameters.map(param => this.parseParameter(param));

    return {
      nodeType: 'TsMemberFunction',
      comments,
      level: this.getAccessLevel(node.modifiers),
      name: new TsIdentSimple(node.name.text),
      methodType: 'setter',
      signature: {
        comments: Comments.NoComments,
        tparams: IArray.Empty,
        params: IArray.from(params),
        resultType: undefined
      },
      isStatic: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)),
      isReadOnly: false
    };
  }

  private parseParameter(node: ts.ParameterDeclaration): any {
    const name = ts.isIdentifier(node.name) ? node.name.text : 'param';
    const type = node.type ? this.parseType(node.type) : { nodeType: 'TsTypeRef', name: TsQIdent.of('any') };

    return {
      comments: Comments.NoComments,
      name: new TsIdentSimple(name),
      tpe: type,
      isOptional: !!node.questionToken,
      isRest: !!node.dotDotDotToken
    };
  }

  private getAccessLevel(modifiers?: ts.NodeArray<ts.Modifier>): string {
    if (!modifiers) return 'public';

    for (const modifier of modifiers) {
      switch (modifier.kind) {
        case ts.SyntaxKind.PrivateKeyword: return 'private';
        case ts.SyntaxKind.ProtectedKeyword: return 'protected';
        case ts.SyntaxKind.PublicKeyword: return 'public';
      }
    }

    return 'public';
  }
}