/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TsTypeFormatter
 *
 * Provides formatting functionality for TypeScript types and related constructs,
 * using fp-ts for functional programming patterns to align with the original Scala implementation.
 */

import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { IArray } from '../IArray.js';
import { Comments } from '../Comments.js';
import {
  TsType,
  TsTypeRef,
  TsTypeLiteral,
  TsTypeObject,
  TsTypeFunction,
  TsTypeConstructor,
  TsTypeIs,
  TsTypeTuple,
  TsTypeQuery,
  TsTypeRepeated,
  TsTypeKeyOf,
  TsTypeLookup,
  TsTypeThis,
  TsTypeAsserts,
  TsTypeUnion,
  TsTypeIntersect,
  TsTypeConditional,
  TsTypeExtends,
  TsTypeInfer,
  TsQIdent,
  TsLiteral,
  TsMember,
  TsMemberCall,
  TsMemberCtor,
  TsMemberFunction,
  TsMemberProperty,
  TsMemberIndex,
  TsMemberTypeMapped,
  TsFunSig,
  TsTypeParam,
  TsFunParam,
  TsTupleElement,
  TsExpr,
  Indexing,
  IndexingDict,
  IndexingSingle
} from './trees.js';
import { TsProtectionLevel } from './TsProtectionLevel.js';
import { MethodType } from './MethodType.js';
import { ReadonlyModifier } from './ReadonlyModifier.js';
import { OptionalModifier } from './OptionalModifier.js';

/**
 * TypeScript type formatter interface
 * Equivalent to the Scala TsTypeFormatter class
 */
export interface TsTypeFormatter {
  readonly keepComments: boolean;

  /**
   * Creates a new formatter that drops comments
   */
  dropComments(): TsTypeFormatter;

  /**
   * Formats a qualified identifier as a string
   */
  qident(q: TsQIdent): string;

  /**
   * Formats a function signature as a string
   */
  sig(sig: TsFunSig): string;

  /**
   * Formats a type parameter as a string
   */
  tparam(tparam: TsTypeParam): string;

  /**
   * Formats a function parameter as a string
   */
  param(p: TsFunParam): string;

  /**
   * Formats type parameters with a custom formatter function
   */
  tparams<T>(ts: IArray<T>, f: (t: T) => string): O.Option<string>;

  /**
   * Formats a protection level as an optional string
   */
  level(l: TsProtectionLevel): O.Option<string>;

  /**
   * Formats a member as a string
   */
  member(m: TsMember): string;

  /**
   * Formats a literal as a string
   */
  lit(lit: TsLiteral): string;

  /**
   * Formats a tuple element as a string
   */
  tupleElement(elem: TsTupleElement): string;

  /**
   * Formats a type as a string (main formatting method)
   */
  apply(tpe: TsType): string;
}

/**
 * Implementation of TsTypeFormatter
 */
class TsTypeFormatterImpl implements TsTypeFormatter {
  constructor(public readonly keepComments: boolean) {}

  dropComments(): TsTypeFormatter {
    return new TsTypeFormatterImpl(false);
  }

  qident(q: TsQIdent): string {
    return q.parts.map(part => part.value).toArray().join('.');
  }

  sig(sig: TsFunSig): string {
    const tparamsStr = pipe(
      this.tparams(sig.tparams, (tp) => this.tparam(tp)),
      O.getOrElse(() => '')
    );

    const paramsStr = sig.params.map(p => this.param(p)).toArray().join(', ');

    const resultStr = pipe(
      sig.resultType,
      O.map(rt => `: ${this.apply(rt)}`),
      O.getOrElse(() => '')
    );

    return `${tparamsStr}(${paramsStr})${resultStr}`;
  }

  tparam(tparam: TsTypeParam): string {
    const parts: O.Option<string>[] = [
      O.some(tparam.name.value),
      pipe(
        tparam.upperBound,
        O.map(bound => `extends ${this.apply(bound)}`)
      ),
      pipe(
        tparam.default,
        O.map(def => `= ${this.apply(def)}`)
      )
    ];

    return parts.filter(O.isSome).map(opt => opt.value).join(' ');
  }

  param(p: TsFunParam): string {
    const parts: O.Option<string>[] = [
      O.some(p.name.value),
      pipe(
        p.tpe,
        O.map(tpe => `: ${this.apply(tpe)}`)
      )
    ];

    return parts.filter(O.isSome).map(opt => opt.value).join(' ');
  }

  tparams<T>(ts: IArray<T>, f: (t: T) => string): O.Option<string> {
    if (ts.isEmpty) {
      return O.none;
    }
    return O.some(`<${ts.map(f).toArray().join(', ')}>`);
  }

  level(l: TsProtectionLevel): O.Option<string> {
    switch (l._tag) {
      case 'Default':
        return O.none;
      case 'Private':
        return O.some('private');
      case 'Protected':
        return O.some('protected');
    }
  }

  member(m: TsMember): string {
    switch (m._tag) {
      case 'TsMemberCall': {
        const call = m as TsMemberCall;
        const levelStr = pipe(
          this.level(call.level),
          O.getOrElse(() => '')
        );
        const sigStr = this.sig(call.signature);
        return `${levelStr} ${sigStr}`.trim();
      }

      case 'TsMemberCtor': {
        const ctor = m as TsMemberCtor;
        const sigStr = this.sig(ctor.signature);
        return `new ${sigStr}`;
      }

      case 'TsMemberFunction': {
        const func = m as TsMemberFunction;
        const parts: O.Option<string>[] = [
          this.level(func.level),
          func.methodType._tag === 'Normal' ? O.none :
            func.methodType._tag === 'Getter' ? O.some('get') : O.some('set'),
          func.isStatic ? O.some('static') : O.none,
          func.isReadOnly ? O.some('readonly') : O.none,
          O.some(func.name.value),
          O.some(this.sig(func.signature))
        ];

        return parts.filter(O.isSome).map(opt => opt.value).join(' ');
      }

      case 'TsMemberProperty': {
        const prop = m as TsMemberProperty;
        const parts: O.Option<string>[] = [
          this.level(prop.level),
          O.some(prop.isStatic ? 'static' : ''),
          O.some(prop.isReadOnly ? 'readonly' : ''),
          O.some(prop.name.value),
          pipe(
            prop.tpe,
            O.map(tpe => `:${this.apply(tpe)}`)
          ),
          pipe(
            prop.expr,
            O.map(expr => `= ${TsExpr.format(expr)}`)
          )
        ];

        return parts.filter(O.isSome).map(opt => opt.value).join(' ');
      }

      case 'TsMemberIndex': {
        const index = m as TsMemberIndex;
        const parts: O.Option<string>[] = [
          index.isReadOnly ? O.some('readonly') : O.none,
          this.level(index.level),
          O.some(this.formatIndexing(index.indexing)),
          pipe(
            index.valueType,
            O.map(tpe => `: ${this.apply(tpe)}`)
          )
        ];

        return parts.filter(O.isSome).map(opt => opt.value).join(' ').replace(' ?', '?');
      }

      case 'TsMemberTypeMapped': {
        const mapped = m as TsMemberTypeMapped;
        const parts: O.Option<string>[] = [
          this.level(mapped.level),
          this.formatReadonlyModifier(mapped.readonly),
          O.some('['),
          O.some(mapped.key.value),
          O.some('in'),
          O.some(this.apply(mapped.from)),
          pipe(
            mapped.as,
            O.map(as => `as ${this.apply(as)}`)
          ),
          O.some(']:'),
          this.formatOptionalModifier(mapped.optionalize),
          O.some(this.apply(mapped.to))
        ];

        return parts.filter(O.isSome).map(opt => opt.value).join(' ').replace(' ?', '?');
      }

      default:
        return 'unknown member';
    }
  }

  private formatIndexing(indexing: Indexing): string {
    switch (indexing._tag) {
      case 'IndexingDict': {
        const dict = indexing as IndexingDict;
        return `[${dict.name.value}: ${this.apply(dict.tpe)}]`;
      }
      case 'IndexingSingle': {
        const single = indexing as IndexingSingle;
        return `[${this.qident(single.name)}]`;
      }
      default:
        return '[unknown]';
    }
  }

  private formatReadonlyModifier(readonly: ReadonlyModifier): O.Option<string> {
    switch (readonly._tag) {
      case 'Noop':
        return O.none;
      case 'Yes':
        return O.some('readonly');
      case 'No':
        return O.some('-readonly');
    }
  }

  private formatOptionalModifier(optionalize: OptionalModifier): O.Option<string> {
    switch (optionalize._tag) {
      case 'Noop':
        return O.none;
      case 'Optionalize':
        return O.some('?');
      case 'Deoptionalize':
        return O.some('-?');
    }
  }

  lit(lit: TsLiteral): string {
    switch (lit._tag) {
      case 'TsLiteralStr':
        return `'${lit.value}'`;
      case 'TsLiteralBool':
        return lit.value;
      case 'TsLiteralNum':
        return lit.value;
      default:
        return lit.value;
    }
  }

  tupleElement(elem: TsTupleElement): string {
    const label = pipe(
      elem.label,
      O.map(l => `${l.value}: `),
      O.getOrElse(() => '')
    );
    return `${label}${this.apply(elem.tpe)}`;
  }

  apply(tpe: TsType): string {
    switch (tpe._tag) {
      case 'TsTypeRef': {
        const typeRef = tpe as TsTypeRef;
        const commentsStr = this.keepComments ? Comments.format(typeRef.comments) : '';
        const nameStr = this.qident(typeRef.name);
        const tparamsStr = pipe(
          this.tparams(typeRef.tparams, (t) => this.apply(t)),
          O.getOrElse(() => '')
        );
        return `${commentsStr}${nameStr}${tparamsStr}`;
      }

      case 'TsTypeLiteral': {
        const literal = tpe as TsTypeLiteral;
        return this.lit(literal.literal);
      }

      case 'TsTypeObject': {
        const obj = tpe as TsTypeObject;
        const commentsStr = this.keepComments ? Comments.format(obj.comments) : '';
        const membersStr = obj.members.map(m => this.member(m)).toArray().join(', ');
        return `${commentsStr}{${membersStr}}`;
      }

      case 'TsTypeFunction': {
        const func = tpe as TsTypeFunction;
        return this.sig(func.signature);
      }

      case 'TsTypeConstructor': {
        const ctor = tpe as TsTypeConstructor;
        const abstractStr = ctor.isAbstract ? 'abstract ' : '';
        return `${abstractStr}new ${this.apply(ctor.signature)}`;
      }

      case 'TsTypeIs': {
        const is = tpe as TsTypeIs;
        return `${is.ident.value} is ${this.apply(is.tpe)}`;
      }

      case 'TsTypeTuple': {
        const tuple = tpe as TsTypeTuple;
        const elementsStr = tuple.elems.map(e => this.tupleElement(e)).toArray().join(', ');
        return `[${elementsStr}]`;
      }

      case 'TsTypeQuery': {
        const query = tpe as TsTypeQuery;
        return `typeof ${this.qident(query.expr)}`;
      }

      case 'TsTypeRepeated': {
        const repeated = tpe as TsTypeRepeated;
        return `...${this.apply(repeated.underlying)}`;
      }

      case 'TsTypeKeyOf': {
        const keyOf = tpe as TsTypeKeyOf;
        return `keyof ${this.apply(keyOf.key)}`;
      }

      case 'TsTypeLookup': {
        const lookup = tpe as TsTypeLookup;
        return `${this.apply(lookup.from)}[${this.apply(lookup.key)}]`;
      }

      case 'TsTypeThis': {
        return 'this';
      }

      case 'TsTypeAsserts': {
        const asserts = tpe as TsTypeAsserts;
        const isOptStr = pipe(
          asserts.isOpt,
          O.map(opt => `is ${this.apply(opt)}`),
          O.getOrElse(() => '')
        );
        return `asserts ${asserts.ident.value}${isOptStr ? ' ' + isOptStr : ''}`;
      }

      case 'TsTypeUnion': {
        const union = tpe as TsTypeUnion;
        return union.types.map(t => this.apply(t)).toArray().join(' | ');
      }

      case 'TsTypeIntersect': {
        const intersect = tpe as TsTypeIntersect;
        return intersect.types.map(t => this.apply(t)).toArray().join(' & ');
      }

      case 'TsTypeConditional': {
        const conditional = tpe as TsTypeConditional;
        return `${this.apply(conditional.pred)} ? ${this.apply(conditional.ifTrue)} : ${this.apply(conditional.ifFalse)}`;
      }

      case 'TsTypeExtends': {
        const extends_ = tpe as TsTypeExtends;
        return `${this.apply(extends_.tpe)} extends ${this.apply(extends_.extends)}`;
      }

      case 'TsTypeInfer': {
        const infer = tpe as TsTypeInfer;
        return `infer ${infer.tparam.name.value}`;
      }

      default:
        return 'unknown type';
    }
  }
}

/**
 * Default TsTypeFormatter instance that keeps comments
 * Equivalent to the Scala object TsTypeFormatter extends TsTypeFormatter(true)
 */
export const TsTypeFormatter: TsTypeFormatter = new TsTypeFormatterImpl(true);

/**
 * Factory function to create a TsTypeFormatter with specified comment handling
 */
export const createTsTypeFormatter = (keepComments: boolean): TsTypeFormatter =>
  new TsTypeFormatterImpl(keepComments);

/**
 * TsTypeFormatter that drops comments
 * Equivalent to TsTypeFormatter.dropComments in Scala
 */
export const TsTypeFormatterNoComments: TsTypeFormatter = new TsTypeFormatterImpl(false);