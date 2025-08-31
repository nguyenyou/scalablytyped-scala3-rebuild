/**
 * TypeScript member AST nodes (class/interface members)
 * Equivalent to Scala member definitions in trees.scala
 */

import {
  TsTree,
  Comments,
  TsIdentSimple,
  IArray
} from './ts-ast.js';
// Forward declarations to avoid circular imports
export interface TsType {
  readonly nodeType: string;
}

export interface TsFunSig {
  readonly comments: Comments;
  readonly tparams: IArray<any>;
  readonly params: IArray<any>;
  readonly resultType: TsType | undefined;
}

/**
 * Base class for TypeScript members
 * Equivalent to Scala TsMember
 */
export abstract class TsMember extends TsTree {
  constructor(
    public readonly comments: Comments,
    public readonly level: TsProtectionLevel
  ) {
    super();
  }
}

/**
 * TypeScript protection levels
 * Equivalent to Scala TsProtectionLevel
 */
export enum TsProtectionLevel {
  Default = 'default',
  Private = 'private',
  Protected = 'protected',
  Public = 'public'
}

/**
 * TypeScript method types
 * Equivalent to Scala MethodType
 */
export enum MethodType {
  Normal = 'normal',
  Getter = 'getter',
  Setter = 'setter'
}

/**
 * TypeScript member function
 * Equivalent to Scala TsMemberFunction
 */
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

/**
 * TypeScript member property
 * Equivalent to Scala TsMemberProperty
 */
export class TsMemberProperty extends TsMember {
  readonly nodeType = 'TsMemberProperty';

  constructor(
    comments: Comments,
    level: TsProtectionLevel,
    public readonly name: TsIdentSimple,
    public readonly tpe: TsType,
    public readonly isStatic: boolean,
    public readonly isReadOnly: boolean,
    public readonly isOptional: boolean
  ) {
    super(comments, level);
  }
}

/**
 * TypeScript constructor member
 * Equivalent to Scala TsMemberCtor
 */
export class TsMemberCtor extends TsMember {
  readonly nodeType = 'TsMemberCtor';

  constructor(
    comments: Comments,
    level: TsProtectionLevel,
    public readonly signature: TsFunSig
  ) {
    super(comments, level);
  }
}

/**
 * TypeScript call signature member
 * Equivalent to Scala TsMemberCall
 */
export class TsMemberCall extends TsMember {
  readonly nodeType = 'TsMemberCall';

  constructor(
    comments: Comments,
    level: TsProtectionLevel,
    public readonly signature: TsFunSig
  ) {
    super(comments, level);
  }
}

/**
 * TypeScript index signature member
 * Equivalent to Scala TsMemberIndex
 */
export class TsMemberIndex extends TsMember {
  readonly nodeType = 'TsMemberIndex';

  constructor(
    comments: Comments,
    level: TsProtectionLevel,
    public readonly indexing: Indexing,
    public readonly valueType: TsType,
    public readonly isReadOnly: boolean
  ) {
    super(comments, level);
  }
}

/**
 * TypeScript indexing types
 * Equivalent to Scala Indexing
 */
export abstract class Indexing {
  abstract readonly nodeType: string;
}

/**
 * Single key indexing [key: string]
 */
export class IndexingSingle extends Indexing {
  readonly nodeType = 'IndexingSingle';

  constructor(public readonly key: string) {
    super();
  }
}

/**
 * Dictionary indexing [key: KeyType]
 */
export class IndexingDict extends Indexing {
  readonly nodeType = 'IndexingDict';

  constructor(
    public readonly key: TsIdentSimple,
    public readonly keyType: TsType
  ) {
    super();
  }
}

/**
 * TypeScript member type alias
 * Equivalent to Scala TsMemberTypeMapped
 */
export class TsMemberTypeMapped extends TsMember {
  readonly nodeType = 'TsMemberTypeMapped';

  constructor(
    comments: Comments,
    level: TsProtectionLevel,
    public readonly key: TsIdentSimple,
    public readonly from: TsType,
    public readonly to: TsType,
    public readonly isOptional: boolean,
    public readonly isReadOnly: boolean
  ) {
    super(comments, level);
  }
}

/**
 * Helper functions for creating members
 */
export namespace TsMemberHelpers {
  export function property(
    name: string,
    type: TsType,
    options: {
      comments?: Comments;
      level?: TsProtectionLevel;
      isStatic?: boolean;
      isReadOnly?: boolean;
      isOptional?: boolean;
    } = {}
  ): TsMemberProperty {
    return new TsMemberProperty(
      options.comments ?? Comments.NoComments,
      options.level ?? TsProtectionLevel.Default,
      new TsIdentSimple(name),
      type,
      options.isStatic ?? false,
      options.isReadOnly ?? false,
      options.isOptional ?? false
    );
  }

  export function method(
    name: string,
    signature: TsFunSig,
    options: {
      comments?: Comments;
      level?: TsProtectionLevel;
      methodType?: MethodType;
      isStatic?: boolean;
      isReadOnly?: boolean;
    } = {}
  ): TsMemberFunction {
    return new TsMemberFunction(
      options.comments ?? Comments.NoComments,
      options.level ?? TsProtectionLevel.Default,
      new TsIdentSimple(name),
      options.methodType ?? MethodType.Normal,
      signature,
      options.isStatic ?? false,
      options.isReadOnly ?? false
    );
  }

  export function constructor(
    signature: TsFunSig,
    options: {
      comments?: Comments;
      level?: TsProtectionLevel;
    } = {}
  ): TsMemberCtor {
    return new TsMemberCtor(
      options.comments ?? Comments.NoComments,
      options.level ?? TsProtectionLevel.Default,
      signature
    );
  }

  export function callSignature(
    signature: TsFunSig,
    options: {
      comments?: Comments;
      level?: TsProtectionLevel;
    } = {}
  ): TsMemberCall {
    return new TsMemberCall(
      options.comments ?? Comments.NoComments,
      options.level ?? TsProtectionLevel.Default,
      signature
    );
  }

  export function indexSignature(
    indexing: Indexing,
    valueType: TsType,
    options: {
      comments?: Comments;
      level?: TsProtectionLevel;
      isReadOnly?: boolean;
    } = {}
  ): TsMemberIndex {
    return new TsMemberIndex(
      options.comments ?? Comments.NoComments,
      options.level ?? TsProtectionLevel.Default,
      indexing,
      valueType,
      options.isReadOnly ?? false
    );
  }
}