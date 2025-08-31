/**
 * TypeScript declaration AST nodes
 * Equivalent to Scala declaration types in trees.scala
 */

import {
  TsTree,
  TsContainer,
  TsNamedDecl,
  TsDecl,
  TsContainerOrDecl,
  Comments,
  CodePath,
  JsLocation,
  TsIdentSimple,
  TsIdentModule,
  IArray
} from './ts-ast.js';
// Forward declarations to avoid circular imports
export interface TsType {
  readonly nodeType: string;
}

export interface TsTypeRef extends TsType {
  readonly comments: Comments;
  readonly name: TsQIdent;
  readonly targs: IArray<TsType>;
}

export interface TsMember {
  readonly nodeType: string;
  readonly comments: Comments;
}

/**
 * Complete TypeScript source file after parsing
 * Equivalent to Scala TsParsedFile
 */
export class TsParsedFile extends TsContainer {
  readonly nodeType = 'TsParsedFile';

  constructor(
    comments: Comments,
    public readonly directives: IArray<Directive>,
    members: TsContainerOrDecl[],
    codePath: CodePath
  ) {
    super(comments, codePath, members);
  }

  withMembers(newMembers: TsContainerOrDecl[]): TsParsedFile {
    return new TsParsedFile(this.comments, this.directives, newMembers, this.codePath);
  }

  get isStdLib(): boolean {
    // Check if this is a standard library file
    return this.codePath.segments.includes('lib') || this.codePath.segments.includes('std');
  }
}

/**
 * Compiler directive (e.g., /// <reference types="node" />)
 * Equivalent to Scala Directive
 */
export class Directive {
  constructor(
    public readonly name: string,
    public readonly key: string,
    public readonly value: string
  ) {}
}

/**
 * TypeScript module declaration
 * Equivalent to Scala TsDeclModule
 */
export class TsDeclModule extends TsContainer {
  readonly nodeType = 'TsDeclModule';

  constructor(
    comments: Comments,
    public readonly declared: boolean,
    public readonly name: TsIdentModule,
    members: TsContainerOrDecl[],
    codePath: CodePath,
    public readonly jsLocation: JsLocation
  ) {
    super(comments, codePath, members);
  }

  withMembers(newMembers: TsContainerOrDecl[]): TsDeclModule {
    return new TsDeclModule(
      this.comments,
      this.declared,
      this.name,
      newMembers,
      this.codePath,
      this.jsLocation
    );
  }
}

/**
 * TypeScript namespace declaration
 * Equivalent to Scala TsDeclNamespace
 */
export class TsDeclNamespace extends TsContainer {
  readonly nodeType = 'TsDeclNamespace';

  constructor(
    comments: Comments,
    public readonly declared: boolean,
    public readonly name: TsIdentSimple,
    members: TsContainerOrDecl[],
    codePath: CodePath,
    public readonly jsLocation: JsLocation
  ) {
    super(comments, codePath, members);
  }

  withMembers(newMembers: TsContainerOrDecl[]): TsDeclNamespace {
    return new TsDeclNamespace(
      this.comments,
      this.declared,
      this.name,
      newMembers,
      this.codePath,
      this.jsLocation
    );
  }
}

/**
 * TypeScript class declaration
 * Equivalent to Scala TsDeclClass
 */
export class TsDeclClass extends TsNamedDecl {
  readonly nodeType = 'TsDeclClass';

  constructor(
    comments: Comments,
    public readonly declared: boolean,
    public readonly isAbstract: boolean,
    name: TsIdentSimple,
    public readonly tparams: IArray<TsTypeParam>,
    public readonly parent: TsTypeRef | undefined,
    public readonly implementsClause: IArray<TsTypeRef>,
    public readonly members: IArray<TsMember>,
    public readonly jsLocation: JsLocation,
    codePath: CodePath
  ) {
    super(comments, codePath, name);
  }
}

/**
 * TypeScript interface declaration
 * Equivalent to Scala TsDeclInterface
 */
export class TsDeclInterface extends TsNamedDecl {
  readonly nodeType = 'TsDeclInterface';

  constructor(
    comments: Comments,
    public readonly declared: boolean,
    name: TsIdentSimple,
    public readonly tparams: IArray<TsTypeParam>,
    public readonly inheritance: IArray<TsTypeRef>,
    public readonly members: IArray<TsMember>,
    codePath: CodePath
  ) {
    super(comments, codePath, name);
  }
}

/**
 * TypeScript type alias declaration
 * Equivalent to Scala TsDeclTypeAlias
 */
export class TsDeclTypeAlias extends TsNamedDecl {
  readonly nodeType = 'TsDeclTypeAlias';

  constructor(
    comments: Comments,
    public readonly declared: boolean,
    name: TsIdentSimple,
    public readonly tparams: IArray<TsTypeParam>,
    public readonly alias: TsType,
    codePath: CodePath
  ) {
    super(comments, codePath, name);
  }
}

/**
 * TypeScript variable declaration
 * Equivalent to Scala TsDeclVar
 */
export class TsDeclVar extends TsNamedDecl {
  readonly nodeType = 'TsDeclVar';

  constructor(
    comments: Comments,
    public readonly declared: boolean,
    public readonly readOnly: boolean,
    name: TsIdentSimple,
    public readonly tpe: TsType | undefined,
    public readonly expr: any | undefined, // TsExpr - will be defined later
    public readonly jsLocation: JsLocation,
    codePath: CodePath
  ) {
    super(comments, codePath, name);
  }
}

/**
 * TypeScript function declaration
 * Equivalent to Scala TsDeclFunction
 */
export class TsDeclFunction extends TsNamedDecl {
  readonly nodeType = 'TsDeclFunction';

  constructor(
    comments: Comments,
    public readonly declared: boolean,
    name: TsIdentSimple,
    public readonly signature: TsFunSig,
    public readonly jsLocation: JsLocation,
    codePath: CodePath
  ) {
    super(comments, codePath, name);
  }
}

/**
 * TypeScript enum declaration
 * Equivalent to Scala TsDeclEnum
 */
export class TsDeclEnum extends TsNamedDecl {
  readonly nodeType = 'TsDeclEnum';

  constructor(
    comments: Comments,
    public readonly declared: boolean,
    public readonly isConst: boolean,
    name: TsIdentSimple,
    public readonly members: IArray<TsEnumMember>,
    public readonly jsLocation: JsLocation,
    codePath: CodePath
  ) {
    super(comments, codePath, name);
  }
}

/**
 * TypeScript enum member
 * Equivalent to Scala TsEnumMember
 */
export class TsEnumMember {
  constructor(
    public readonly comments: Comments,
    public readonly name: TsIdentSimple,
    public readonly value: any | undefined // TsExpr - will be defined later
  ) {}
}

/**
 * TypeScript type parameter
 * Equivalent to Scala TsTypeParam
 */
export class TsTypeParam {
  constructor(
    public readonly comments: Comments,
    public readonly name: TsIdentSimple,
    public readonly upperBound: TsType | undefined,
    public readonly defaultType: TsType | undefined
  ) {}
}

/**
 * TypeScript function signature
 * Equivalent to Scala TsFunSig
 */
export class TsFunSig {
  constructor(
    public readonly comments: Comments,
    public readonly tparams: IArray<TsTypeParam>,
    public readonly params: IArray<TsParam>,
    public readonly resultType: TsType | undefined
  ) {}
}

/**
 * TypeScript function parameter
 * Equivalent to Scala TsParam
 */
export class TsParam {
  constructor(
    public readonly comments: Comments,
    public readonly name: TsIdentSimple,
    public readonly tpe: TsType,
    public readonly isOptional: boolean = false,
    public readonly isRest: boolean = false
  ) {}
}

/**
 * TypeScript augmented module
 * Equivalent to Scala TsAugmentedModule
 */
export class TsAugmentedModule extends TsContainer {
  readonly nodeType = 'TsAugmentedModule';

  constructor(
    comments: Comments,
    public readonly name: TsIdentModule,
    members: TsContainerOrDecl[],
    codePath: CodePath,
    public readonly jsLocation: JsLocation
  ) {
    super(comments, codePath, members);
  }

  withMembers(newMembers: TsContainerOrDecl[]): TsAugmentedModule {
    return new TsAugmentedModule(
      this.comments,
      this.name,
      newMembers,
      this.codePath,
      this.jsLocation
    );
  }
}