/**
 * TypeScript type system AST nodes
 * Equivalent to Scala type definitions in trees.scala
 */

import {
  TsTree,
  Comments,
  TsIdentSimple,
  TsQIdent,
  IArray
} from './ts-ast.js';

/**
 * Base class for all TypeScript types
 * Equivalent to Scala TsType
 */
export abstract class TsType extends TsTree {
  abstract readonly nodeType: string;
}

/**
 * TypeScript type reference
 * Equivalent to Scala TsTypeRef
 */
export class TsTypeRef extends TsType {
  readonly nodeType = 'TsTypeRef';

  constructor(
    public readonly comments: Comments,
    public readonly name: TsQIdent,
    public readonly targs: IArray<TsType>
  ) {
    super();
  }

  // Common type references
  static readonly any = new TsTypeRef(Comments.NoComments, TsQIdent.of('any'), IArray.Empty);
  static readonly unknown = new TsTypeRef(Comments.NoComments, TsQIdent.of('unknown'), IArray.Empty);
  static readonly void = new TsTypeRef(Comments.NoComments, TsQIdent.of('void'), IArray.Empty);
  static readonly never = new TsTypeRef(Comments.NoComments, TsQIdent.of('never'), IArray.Empty);
  static readonly undefined = new TsTypeRef(Comments.NoComments, TsQIdent.of('undefined'), IArray.Empty);
  static readonly null = new TsTypeRef(Comments.NoComments, TsQIdent.of('null'), IArray.Empty);
  static readonly boolean = new TsTypeRef(Comments.NoComments, TsQIdent.of('boolean'), IArray.Empty);
  static readonly number = new TsTypeRef(Comments.NoComments, TsQIdent.of('number'), IArray.Empty);
  static readonly string = new TsTypeRef(Comments.NoComments, TsQIdent.of('string'), IArray.Empty);
  static readonly object = new TsTypeRef(Comments.NoComments, TsQIdent.of('object'), IArray.Empty);

  copy(options: {
    comments?: Comments;
    name?: TsQIdent;
    targs?: IArray<TsType>;
  }): TsTypeRef {
    return new TsTypeRef(
      options.comments ?? this.comments,
      options.name ?? this.name,
      options.targs ?? this.targs
    );
  }
}

/**
 * TypeScript union type
 * Equivalent to Scala TsTypeUnion
 */
export class TsTypeUnion extends TsType {
  readonly nodeType = 'TsTypeUnion';

  constructor(public readonly types: IArray<TsType>) {
    super();
  }

  static simplified(types: IArray<TsType>): TsType {
    if (types.length === 0) return TsTypeRef.never;
    if (types.length === 1) return types[0];
    return new TsTypeUnion(types);
  }
}

/**
 * TypeScript intersection type
 * Equivalent to Scala TsTypeIntersect
 */
export class TsTypeIntersect extends TsType {
  readonly nodeType = 'TsTypeIntersect';

  constructor(public readonly types: IArray<TsType>) {
    super();
  }

  static simplified(types: IArray<TsType>): TsType {
    if (types.length === 0) return TsTypeRef.any;
    if (types.length === 1) return types[0];
    return new TsTypeIntersect(types);
  }
}

/**
 * TypeScript object type
 * Equivalent to Scala TsTypeObject
 */
export class TsTypeObject extends TsType {
  readonly nodeType = 'TsTypeObject';

  constructor(
    public readonly comments: Comments,
    public readonly members: IArray<any> // TsMember - will be imported later
  ) {
    super();
  }
}

/**
 * TypeScript function type
 * Equivalent to Scala TsTypeFunction
 */
export class TsTypeFunction extends TsType {
  readonly nodeType = 'TsTypeFunction';

  constructor(public readonly signature: any) { // TsFunSig - will be imported later
    super();
  }
}

/**
 * TypeScript constructor type
 * Equivalent to Scala TsTypeConstructor
 */
export class TsTypeConstructor extends TsType {
  readonly nodeType = 'TsTypeConstructor';

  constructor(
    public readonly isAbstract: boolean,
    public readonly signature: any // TsFunSig - will be imported later
  ) {
    super();
  }
}

/**
 * TypeScript tuple type
 * Equivalent to Scala TsTypeTuple
 */
export class TsTypeTuple extends TsType {
  readonly nodeType = 'TsTypeTuple';

  constructor(public readonly elements: IArray<TsTupleElement>) {
    super();
  }
}

/**
 * TypeScript tuple element
 * Equivalent to Scala TsTupleElement
 */
export class TsTupleElement {
  constructor(
    public readonly tpe: TsType,
    public readonly isOptional: boolean = false,
    public readonly isRest: boolean = false
  ) {}
}

/**
 * TypeScript literal type
 * Equivalent to Scala TsTypeLiteral
 */
export class TsTypeLiteral extends TsType {
  readonly nodeType = 'TsTypeLiteral';

  constructor(public readonly literal: TsLiteral) {
    super();
  }
}

/**
 * TypeScript literal values
 * Equivalent to Scala TsLiteral
 */
export abstract class TsLiteral {
  abstract readonly value: any;
}

export class TsLiteralString extends TsLiteral {
  constructor(public readonly value: string) {
    super();
  }
}

export class TsLiteralNumber extends TsLiteral {
  constructor(public readonly value: number) {
    super();
  }
}

export class TsLiteralBoolean extends TsLiteral {
  constructor(public readonly value: boolean) {
    super();
  }
}

/**
 * TypeScript keyof type
 * Equivalent to Scala TsTypeKeyOf
 */
export class TsTypeKeyOf extends TsType {
  readonly nodeType = 'TsTypeKeyOf';

  constructor(public readonly tpe: TsType) {
    super();
  }
}

/**
 * TypeScript typeof type query
 * Equivalent to Scala TsTypeQuery
 */
export class TsTypeQuery extends TsType {
  readonly nodeType = 'TsTypeQuery';

  constructor(public readonly expr: TsQIdent) {
    super();
  }
}

/**
 * TypeScript lookup type
 * Equivalent to Scala TsTypeLookup
 */
export class TsTypeLookup extends TsType {
  readonly nodeType = 'TsTypeLookup';

  constructor(
    public readonly from: TsType,
    public readonly key: TsType
  ) {
    super();
  }
}

/**
 * TypeScript conditional type
 * Equivalent to Scala TsTypeExtends
 */
export class TsTypeExtends extends TsType {
  readonly nodeType = 'TsTypeExtends';

  constructor(
    public readonly checkType: TsType,
    public readonly extendsType: TsType
  ) {
    super();
  }
}

/**
 * TypeScript type predicate
 * Equivalent to Scala TsTypeIs
 */
export class TsTypeIs extends TsType {
  readonly nodeType = 'TsTypeIs';

  constructor(
    public readonly param: TsIdentSimple,
    public readonly tpe: TsType
  ) {
    super();
  }
}

/**
 * TypeScript repeated type (for rest parameters)
 * Equivalent to Scala TsTypeRepeated
 */
export class TsTypeRepeated extends TsType {
  readonly nodeType = 'TsTypeRepeated';

  constructor(public readonly underlying: TsType) {
    super();
  }
}

/**
 * Array type helper
 */
export function ArrayType(elementType: TsType): TsTypeRef {
  return new TsTypeRef(
    Comments.NoComments,
    TsQIdent.of('Array'),
    IArray.of(elementType)
  );
}

/**
 * Promise type helper
 */
export function PromiseType(valueType: TsType): TsTypeRef {
  return new TsTypeRef(
    Comments.NoComments,
    TsQIdent.of('Promise'),
    IArray.of(valueType)
  );
}

/**
 * Record type helper
 */
export function RecordType(keyType: TsType, valueType: TsType): TsTypeRef {
  return new TsTypeRef(
    Comments.NoComments,
    TsQIdent.of('Record'),
    IArray.of(keyType, valueType)
  );
}
