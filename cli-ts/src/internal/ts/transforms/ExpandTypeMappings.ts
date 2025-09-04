/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ExpandTypeMappings
 *
 * Provides type mapping expansion functionality for transforming TypeScript AST trees
 * by expanding interfaces and type aliases to inline their members and resolve type mappings.
 */

import { TreeTransformationScopedChanges, TreeTransformationUnit } from '../TreeTransformations.js';
import { TsTreeScope as SimpleTsTreeScope } from '../TreeTransformations.js';
import { TsTreeScope, LoopDetector, Picker } from '../TsTreeScope.js';
import { TsTreeTraverse } from '../TsTreeTraverse.js';
import {
  TsDecl,
  TsType,
  TsTypeRef,
  TsDeclInterface,
  TsDeclTypeAlias,
  TsDeclClass,
  TsDeclEnum,
  TsEnumMember,
  TsTypeObject,
  TsTypeIntersect,
  TsTypeUnion,
  TsTypeLiteral,
  TsTypeKeyOf,
  TsTypeConditional,
  TsTypeExtends,
  TsTypeLookup,
  TsMember,
  TsMemberProperty,
  TsMemberFunction,
  TsMemberTypeMapped,
  TsQIdent,
  TsIdent,
  TsLiteral,
  TsExpr,
  TsFunSig,
  TsTypeFunction,
  TsTypeParam
} from '../trees.js';
import { IArray } from '../../IArray.js';
import { Comments, NoComments } from '../../Comments.js';
import { Comment, Raw } from '../../Comment.js';
import { TsProtectionLevel } from '../TsProtectionLevel.js';
import { CodePath } from '../CodePath.js';
import { pipe } from 'fp-ts/function';
import { Option, some, none, fold } from 'fp-ts/Option';
import { Either, left, right } from 'fp-ts/Either';

/**
 * Result type for operations that can succeed with a value or fail with problems.
 * Equivalent to the Scala Res[T] type.
 */
export type Res<T> =
  | { readonly _tag: 'Ok'; readonly value: T; readonly wasRewritten: boolean }
  | { readonly _tag: 'Problems'; readonly problems: IArray<Problem> };

/**
 * Constructor functions for Res variants
 */
export const Res = {
  /**
   * Creates a successful result
   */
  Ok: <T>(value: T, wasRewritten: boolean = false): Res<T> => ({
    _tag: 'Ok',
    value,
    wasRewritten
  }),

  /**
   * Creates a failure result with problems
   */
  Problems: <T>(problems: IArray<Problem>): Res<T> => ({
    _tag: 'Problems',
    problems
  }),

  /**
   * Combines multiple Res values using a mapping function
   */
  sequence: <T, U>(results: IArray<Res<T>>): Res<IArray<T>> => {
    const values: T[] = [];
    let wasRewritten = false;

    for (let i = 0; i < results.length; i++) {
      const result = results.get(i);
      if (result._tag === 'Problems') {
        return result;
      }
      values.push(result.value);
      if (result.wasRewritten) {
        wasRewritten = true;
      }
    }

    return Res.Ok(IArray.fromArray(values), wasRewritten);
  },

  /**
   * Maps over a successful result
   */
  map: <T, U>(res: Res<T>, f: (value: T) => U): Res<U> => {
    if (res._tag === 'Problems') {
      return res;
    }
    return Res.Ok(f(res.value), res.wasRewritten);
  },

  /**
   * Flat maps over a successful result
   */
  flatMap: <T, U>(res: Res<T>, f: (value: T) => Res<U>): Res<U> => {
    if (res._tag === 'Problems') {
      return res;
    }
    const result = f(res.value);
    if (result._tag === 'Ok') {
      return Res.Ok(result.value, res.wasRewritten || result.wasRewritten);
    }
    return result;
  },

  /**
   * Marks a result as rewritten
   */
  withIsRewritten: <T>(res: Res<T>): Res<T> => {
    if (res._tag === 'Problems') {
      return res;
    }
    return Res.Ok(res.value, true);
  }
};

/**
 * Type guard for checking if a Res is successful
 */
export const isOk = <T>(res: Res<T>): res is { readonly _tag: 'Ok'; readonly value: T; readonly wasRewritten: boolean } => {
  return res._tag === 'Ok';
};

/**
 * Type guard for checking if a Res has problems
 */
export const isProblems = <T>(res: Res<T>): res is { readonly _tag: 'Problems'; readonly problems: IArray<Problem> } => {
  return res._tag === 'Problems';
};

/**
 * Problem types that can occur during type mapping expansion.
 * These are equivalent to the Scala Problem sealed trait and its case classes.
 */
export type Problem =
  | NotStatic
  | InvalidType
  | Loop
  | TypeNotFound
  | NotKeysFromTarget
  | NoMembers
  | UnsupportedTM
  | CouldNotPickKeys
  | UnsupportedPredicate;

export interface NotStatic {
  readonly _tag: 'NotStatic';
  readonly scope: TsTreeScope;
  readonly ref: TsTypeRef;
}

export interface InvalidType {
  readonly _tag: 'InvalidType';
  readonly scope: TsTreeScope;
  readonly tpe: TsType;
}

export interface Loop {
  readonly _tag: 'Loop';
  readonly scope: TsTreeScope;
}

export interface TypeNotFound {
  readonly _tag: 'TypeNotFound';
  readonly scope: TsTreeScope;
  readonly ref: TsTypeRef;
}

export interface NotKeysFromTarget {
  readonly _tag: 'NotKeysFromTarget';
  readonly scope: TsTreeScope;
  readonly ref: TsType;
}

export interface NoMembers {
  readonly _tag: 'NoMembers';
  readonly scope: TsTreeScope;
  readonly tm: TsMemberTypeMapped;
}

export interface UnsupportedTM {
  readonly _tag: 'UnsupportedTM';
  readonly scope: TsTreeScope;
  readonly tm: TsMemberTypeMapped;
}

export interface CouldNotPickKeys {
  readonly _tag: 'CouldNotPickKeys';
  readonly scope: TsTreeScope;
  readonly keys: Set<string>;
}

export interface UnsupportedPredicate {
  readonly _tag: 'UnsupportedPredicate';
  readonly e: TsType;
}

/**
 * Constructor functions for Problem types
 */
export const Problem = {
  NotStatic: (scope: TsTreeScope, ref: TsTypeRef): NotStatic => ({
    _tag: 'NotStatic',
    scope,
    ref
  }),

  InvalidType: (scope: TsTreeScope, tpe: TsType): InvalidType => ({
    _tag: 'InvalidType',
    scope,
    tpe
  }),

  Loop: (scope: TsTreeScope): Loop => ({
    _tag: 'Loop',
    scope
  }),

  TypeNotFound: (scope: TsTreeScope, ref: TsTypeRef): TypeNotFound => ({
    _tag: 'TypeNotFound',
    scope,
    ref
  }),

  NotKeysFromTarget: (scope: TsTreeScope, ref: TsType): NotKeysFromTarget => ({
    _tag: 'NotKeysFromTarget',
    scope,
    ref
  }),

  NoMembers: (scope: TsTreeScope, tm: TsMemberTypeMapped): NoMembers => ({
    _tag: 'NoMembers',
    scope,
    tm
  }),

  UnsupportedTM: (scope: TsTreeScope, tm: TsMemberTypeMapped): UnsupportedTM => ({
    _tag: 'UnsupportedTM',
    scope,
    tm
  }),

  CouldNotPickKeys: (scope: TsTreeScope, keys: Set<string>): CouldNotPickKeys => ({
    _tag: 'CouldNotPickKeys',
    scope,
    keys
  }),

  UnsupportedPredicate: (e: TsType): UnsupportedPredicate => ({
    _tag: 'UnsupportedPredicate',
    e
  })
};

/**
 * Tagged literal type for representing keys with optional flag.
 * Equivalent to the Scala TaggedLiteral case class.
 */
export interface TaggedLiteral {
  readonly lit: TsLiteral;
  readonly isOptional: boolean;
}

export const TaggedLiteral = {
  create: (lit: TsLiteral, isOptional: boolean = false): TaggedLiteral => ({
    lit,
    isOptional
  })
};

/**
 * Replace transformation class for substituting type keys.
 * Equivalent to the Scala Replace case class that extends TreeTransformationScopedChanges.
 */
export class Replace extends TreeTransformationScopedChanges {
  constructor(
    private readonly key: TsType,
    private readonly name: TsLiteral,
    private readonly ld: LoopDetector
  ) {
    super();
  }

  override enterTsType(scope: SimpleTsTreeScope): (x: TsType) => TsType {
    return (x: TsType) => {
      // Direct key replacement
      if (this.isEqual(x, this.key)) {
        return TsTypeLiteral.create(this.name);
      }

      // Type lookup replacement
      if (x._tag === 'TsTypeLookup') {
        const lookup = x as TsTypeLookup;
        if (this.isEqual(lookup.key, this.key)) {
          const foundType = this.findTypeInMembers(scope, lookup.from);
          return foundType || TsTypeRef.any;
        }
      }

      return x;
    };
  }

  private isEqual(a: TsType, b: TsType): boolean {
    // Simple equality check - in a full implementation this would be more sophisticated
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private findTypeInMembers(scope: SimpleTsTreeScope, from: TsType): TsType | undefined {
    // This would implement the member lookup logic from the Scala version
    // For now, return undefined to indicate not found
    return undefined;
  }
}

/**
 * Utility functions for working with members and keys
 */
export const Utils = {
  /**
   * Extract keys from members (equivalent to Scala's keysFor function)
   */
  keysFor: (members: IArray<TsMember>): IArray<TaggedLiteral> => {
    const keys: TaggedLiteral[] = [];

    for (let i = 0; i < members.length; i++) {
      const member = members.get(i);
      if (member._tag === 'TsMemberProperty') {
        const prop = member as TsMemberProperty;
        if (prop.name._tag === 'TsIdentSimple') {
          const ident = prop.name as TsIdent;
          keys.push(TaggedLiteral.create(
            TsLiteral.str(ident.value),
            false // TODO: determine if optional based on member properties
          ));
        }
      }
    }

    return IArray.fromArray(keys);
  },

  /**
   * Handle overriding fields when combining members from multiple sources
   */
  handleOverridingFields: (
    ownMembers: IArray<TsMember>,
    fromParents: IArray<IArray<TsMember>>
  ): IArray<TsMember> => {
    // Flatten parent members
    const allParentMembers = fromParents.flatMap(members => members);

    // For now, just combine all members (in a full implementation, this would handle overrides)
    return ownMembers.concat(allParentMembers);
  },

  /**
   * Check if a type points to a concrete type (class or interface)
   */
  pointsToConcreteType: (scope: SimpleTsTreeScope, alias: TsType): boolean => {
    if (alias._tag !== 'TsTypeRef') {
      return false;
    }

    const typeRef = alias as TsTypeRef;
    // This would use scope.lookupType to check if it points to a class or interface
    // For now, return false as a conservative default
    return false;
  },

  /**
   * Pattern matcher for type mappings (equivalent to Scala's IsTypeMapping)
   */
  isTypeMapping: (tpe: TsType): TsMemberTypeMapped | undefined => {
    if (tpe._tag === 'TsTypeObject') {
      const obj = tpe as TsTypeObject;
      if (obj.members.length === 1 && obj.members.get(0)?._tag === 'TsMemberTypeMapped') {
        return obj.members.get(0) as TsMemberTypeMapped;
      }
    }
    return undefined;
  },

  /**
   * Empty set constant
   */
  EmptySet: new Set<string>()
};

/**
 * Evaluates keys from a type expression.
 * Equivalent to the Scala evaluateKeys function.
 */
export function evaluateKeys(
  scope: TsTreeScope,
  ld: LoopDetector
): (keys: TsType) => Res<Set<TaggedLiteral>> {
  return (keys: TsType) => {
    // Follow aliases first (equivalent to FollowAliases(scope)(keys))
    const resolvedKeys = followAliases(scope, keys);

    switch (resolvedKeys._tag) {
      case 'TsTypeRef': {
        const typeRef = resolvedKeys as TsTypeRef;

        // Check if it's an abstract type
        if (isAbstract(scope, typeRef.name)) {
          return Res.Problems(IArray.apply(Problem.NotStatic(scope, typeRef) as Problem));
        }

        // Look up the type in scope using lookupInternal
        // This matches the original Scala: scope.lookupInternal(Picker.Types, typeRef.name.parts, ld)
        const lookupResults = scope.lookupInternal(
          Picker.Types,
          typeRef.name.parts,
          ld
        );

        if (lookupResults.length === 0) {
          return Res.Problems(IArray.apply(Problem.TypeNotFound(scope, typeRef) as Problem));
        }

        // For now, return empty set for found types
        return Res.Ok(new Set<TaggedLiteral>(), false);
      }

      case 'TsTypeLiteral': {
        const literal = resolvedKeys as TsTypeLiteral;
        const taggedLit = TaggedLiteral.create(literal.literal, false);
        return Res.Ok(new Set([taggedLit]), false);
      }

      case 'TsTypeKeyOf': {
        const keyOf = resolvedKeys as TsTypeKeyOf;
        // For now, return empty set - will implement AllMembersFor later
        return Res.Ok(new Set<TaggedLiteral>(), false);
      }

      case 'TsTypeObject': {
        const obj = resolvedKeys as TsTypeObject;
        const keys = Utils.keysFor(obj.members);
        return Res.Ok(new Set(keys), false);
      }

      case 'TsTypeUnion': {
        const union = resolvedKeys as TsTypeUnion;
        const filteredTypes = union.types.filter(t => !isNeverType(t));

        const results = filteredTypes.map(t => evaluateKeys(scope, ld)(t));
        return Res.flatMap(
          Res.sequence(results),
          (keySets) => {
            const combined = new Set<TaggedLiteral>();
            keySets.forEach(keySet => {
              keySet.forEach(key => combined.add(key));
            });
            return Res.Ok(combined, false);
          }
        );
      }

      case 'TsTypeConditional': {
        const conditional = resolvedKeys as TsTypeConditional;
        return handleConditionalType(scope, ld, conditional);
      }

      case 'TsTypeLookup': {
        const lookup = resolvedKeys as TsTypeLookup;
        return handleTypeLookup(scope, ld, lookup);
      }

      default:
        return Res.Problems(IArray.apply(Problem.NotKeysFromTarget(scope, resolvedKeys) as Problem));
    }
  };
}

/**
 * Helper function to follow type aliases (simplified version)
 */
function followAliases(scope: TsTreeScope, tpe: TsType): TsType {
  // This would implement the full FollowAliases logic
  // For now, return the type unchanged
  return tpe;
}

/**
 * Helper function to check if a qualified identifier is abstract
 */
function isAbstract(scope: TsTreeScope, name: TsQIdent): boolean {
  // This would check if the type is abstract in the scope
  // For now, return false as a conservative default
  return false;
}

/**
 * Helper function to check if a type is the 'never' type
 */
function isNeverType(tpe: TsType): boolean {
  return tpe._tag === 'TsTypeRef' &&
         (tpe as TsTypeRef).name.parts.length === 1 &&
         (tpe as TsTypeRef).name.parts.get(0)?.value === 'never';
}

/**
 * Helper function to look up a type reference
 */
function lookupType(
  scope: TsTreeScope,
  typeRef: TsTypeRef,
  ld: LoopDetector
): Option<Res<Set<TaggedLiteral>>> {
  // This would implement the full type lookup logic
  // For now, return none to indicate not found
  return none;
}

/**
 * Handle conditional type evaluation (Exclude/Extract patterns)
 */
function handleConditionalType(
  scope: TsTreeScope,
  ld: LoopDetector,
  conditional: TsTypeConditional
): Res<Set<TaggedLiteral>> {
  // Check for Exclude pattern: T extends U ? never : T
  if (conditional.ifTrue._tag === 'TsTypeRef' &&
      isNeverType(conditional.ifTrue) &&
      conditional.pred._tag === 'TsTypeExtends') {

    const extends_ = conditional.pred as TsTypeExtends;
    if (isEqual(extends_.tpe, conditional.ifFalse)) {
      // This is an Exclude<T, U> pattern
      return Res.flatMap(
        evaluateKeys(scope, ld)(extends_.tpe),
        (leftKeys) => Res.flatMap(
          evaluateKeys(scope, ld)(extends_.extends),
          (rightKeys) => {
            const result = new Set<TaggedLiteral>();
            const leftKeyArray = Array.from(leftKeys);
            for (let i = 0; i < leftKeyArray.length; i++) {
              const key = leftKeyArray[i];
              if (!rightKeys.has(key)) {
                result.add(key);
              }
            }
            return Res.withIsRewritten(Res.Ok(result, false));
          }
        )
      );
    }
  }

  // Check for Extract pattern: T extends U ? T : never
  if (conditional.ifFalse._tag === 'TsTypeRef' &&
      isNeverType(conditional.ifFalse) &&
      conditional.pred._tag === 'TsTypeExtends') {

    const extends_ = conditional.pred as TsTypeExtends;
    if (isEqual(extends_.tpe, conditional.ifTrue)) {
      // This is an Extract<T, U> pattern
      return Res.flatMap(
        evaluateKeys(scope, ld)(extends_.tpe),
        (leftKeys) => Res.flatMap(
          evaluateKeys(scope, ld)(extends_.extends),
          (rightKeys) => {
            const result = new Set<TaggedLiteral>();
            const leftKeyArray = Array.from(leftKeys);
            for (let i = 0; i < leftKeyArray.length; i++) {
              const key = leftKeyArray[i];
              if (rightKeys.has(key)) {
                result.add(key);
              }
            }
            return Res.withIsRewritten(Res.Ok(result, false));
          }
        )
      );
    }
  }

  return Res.Problems(IArray.apply(Problem.NotKeysFromTarget(scope, conditional) as Problem));
}

/**
 * Handle type lookup evaluation
 */
function handleTypeLookup(
  scope: TsTreeScope,
  ld: LoopDetector,
  lookup: TsTypeLookup
): Res<Set<TaggedLiteral>> {
  // This would implement ResolveTypeLookups.expandLookupType logic
  // For now, return a problem
  return Res.Problems(IArray.apply(Problem.NotKeysFromTarget(scope, lookup) as Problem));
}

/**
 * Simple equality check for types
 */
function isEqual(a: TsType, b: TsType): boolean {
  // Simple equality check - in a full implementation this would be more sophisticated
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Evaluate predicate for conditional types (simplified implementation)
 */
function evaluatePredicate(x: TsType): Res<boolean> {
  if (x._tag === 'TsTypeExtends') {
    const extends_ = x as TsTypeExtends;
    if (extends_.extends._tag === 'TsTypeRef' &&
        (extends_.extends as TsTypeRef).name.parts.get(0)?.value === 'any') {
      return Res.Ok(true, false);
    }
  }
  return Res.Problems(IArray.apply(Problem.UnsupportedPredicate(x) as Problem));
}

/**
 * AllMembersFor object - handles member resolution for types and interfaces.
 * Equivalent to the Scala AllMembersFor object.
 */
export const AllMembersFor = {
  /**
   * Resolve members for a type
   */
  forType: (scope: TsTreeScope, ld: LoopDetector) => (tpe: TsType): Res<IArray<TsMember>> => {
    switch (tpe._tag) {
      case 'TsTypeRef':
        return AllMembersFor.apply(scope, ld)(tpe as TsTypeRef);

      case 'TsTypeIntersect': {
        const intersect = tpe as TsTypeIntersect;
        const results = intersect.types.map(t => AllMembersFor.forType(scope, ld)(t));
        return Res.flatMap(
          Res.sequence(results),
          (memberArrays) => {
            const flattened = memberArrays.flatMap(arr => arr);
            const hasTypeObject = intersect.types.exists((t: TsType) => t._tag === 'TsTypeObject');
            return Res.Ok(flattened, hasTypeObject);
          }
        );
      }

      default: {
        const typeMapping = Utils.isTypeMapping(tpe);
        if (typeMapping) {
          return handleTypeMapping(scope, ld, typeMapping);
        }
        return Res.Problems(IArray.apply(Problem.InvalidType(scope, tpe) as Problem));
      }
    }
  },

  /**
   * Resolve members for an interface
   */
  forInterface: (scope: TsTreeScope, ld: LoopDetector) => (i: TsDeclInterface): Res<IArray<TsMember>> => {
    const parentResults = i.inheritance.map(parent =>
      limitInlining(scope, parent, AllMembersFor.apply(scope, ld)(parent))
    );

    return Res.flatMap(
      Res.sequence(parentResults),
      (fromParents) => {
        const combinedMembers = Utils.handleOverridingFields(i.members, fromParents);
        return Res.Ok(combinedMembers, false);
      }
    );
  },

  /**
   * Main apply method for type references
   */
  apply: (scope: TsTreeScope, _ld: LoopDetector) => (typeRef: TsTypeRef): Res<IArray<TsMember>> => {
    // Check for circular references
    const ldResult = _ld.including(typeRef, scope);
    if (ldResult._tag === 'Left') {
      return Res.Problems(IArray.apply(Problem.Loop(scope) as Problem));
    }

    const ld = ldResult.right;

    // Try to lookup the type in scope using lookupInternal
    // This matches the original Scala: scope.lookupInternal(Picker.Types, typeRef.name.parts, ld)
    const lookupResults = scope.lookupInternal(
      Picker.Types,
      typeRef.name.parts,
      ld
    );

    if (lookupResults.length === 0) {
      // Return TypeNotFound error, matching the original Scala behavior
      return Res.Problems(IArray.apply(Problem.TypeNotFound(scope, typeRef) as Problem));
    }

    // If type is found, we would process it here (interface, class, type alias)
    // For now, return empty members for found types
    return Res.Ok(IArray.Empty, false);
  }
};

/**
 * Handle type mapping member resolution
 */
function handleTypeMapping(
  scope: TsTreeScope,
  ld: LoopDetector,
  tm: TsMemberTypeMapped
): Res<IArray<TsMember>> {
  // Check if the 'from' type is abstract
  if (tm.from._tag === 'TsTypeRef') {
    const fromRef = tm.from as TsTypeRef;
    if (isAbstract(scope, fromRef.name)) {
      return Res.Problems(IArray.apply(Problem.NotStatic(scope, fromRef) as Problem));
    }
  }

  // Evaluate keys from the 'from' type
  return Res.flatMap(
    evaluateKeys(scope, ld)(tm.from),
    (keys) => {
      const members: TsMember[] = [];

      const keyArray = Array.from(keys);
      for (let i = 0; i < keyArray.length; i++) {
        const key = keyArray[i];
        // Create a property member for each key
        const memberType = tm.to; // Would apply key substitution here
        const property = TsMemberProperty.create(
          Comments.empty(),
          tm.level,
          TsIdent.simple(getLiteralValue(key.lit)),
          some(memberType),
          none,
          false,
          false // Would apply readonly modifier here
        );
        members.push(property);
      }

      return Res.Ok(IArray.fromArray(members), true);
    }
  );
}

/**
 * Limit inlining for performance and correctness
 */
function limitInlining<T>(
  scope: TsTreeScope,
  parent: TsTypeRef,
  res: Res<IArray<T>>
): Res<IArray<T>> {
  if (res._tag === 'Ok' && res.wasRewritten) {
    // Check if all type parameters are abstract
    const allAbstract = parent.tparams.forall((tparam: TsType) => {
      if (tparam._tag === 'TsTypeRef') {
        const ref = tparam as TsTypeRef;
        return ref.tparams.length === 0 && isAbstract(scope, ref.name);
      }
      return false;
    });

    if (allAbstract) {
      return Res.Ok(res.value, false);
    }
  }

  return res;
}

/**
 * Helper function to get the string value from a literal
 */
function getLiteralValue(literal: TsLiteral): string {
  if (literal._tag === 'TsLiteralStr') {
    return (literal as any).value;
  } else if (literal._tag === 'TsLiteralNum') {
    return (literal as any).value.toString();
  } else if (literal._tag === 'TsLiteralBool') {
    return (literal as any).value.toString();
  }
  return 'unknown';
}

/**
 * Main ExpandTypeMappings object - the primary transformation.
 * Equivalent to the Scala ExpandTypeMappings object.
 */
export class ExpandTypeMappings extends TreeTransformationScopedChanges {

  override enterTsDecl(scope: SimpleTsTreeScope): (x: TsDecl) => TsDecl {
    return (x: TsDecl) => {
      try {
        switch (x._tag) {
          case 'TsDeclInterface': {
            const i = x as TsDeclInterface;
            const result = AllMembersFor.forInterface(scope as any, LoopDetector.initial)(i);

            if (result._tag === 'Problems') {
              return i;
            }

            if (result.wasRewritten) {
              const notices = Comments.apply(
                i.inheritance.map(parent =>
                  new Raw(`/* Inlined parent ${formatType(parent)} */\n`)
                ).toArray()
              );

              return {
                ...i,
                comments: i.comments.concat(notices),
                members: result.value,
                inheritance: IArray.Empty
              };
            }

            return x;
          }

          case 'TsDeclTypeAlias': {
            const ta = x as TsDeclTypeAlias;

            // Skip if marked as trivial or points to concrete type
            // Note: IsTrivial check would need proper marker implementation
            if (Utils.pointsToConcreteType(scope as any, ta.alias)) {
              return ta;
            }

            const result = AllMembersFor.forType(scope as any, LoopDetector.initial)(ta.alias);

            if (result._tag === 'Problems') {
              // Try evaluating keys as fallback
              const keyResult = evaluateKeys(scope as any, LoopDetector.initial)(ta.alias);

              if (keyResult._tag === 'Ok' && keyResult.wasRewritten) {
                const notice = new Raw(`/* Inlined ${formatType(ta.alias)} */\n`);
                const unionTypes = Array.from(keyResult.value).map(key =>
                  TsTypeLiteral.create(key.lit) as TsType
                );

                return {
                  ...ta,
                  comments: ta.comments.add(notice),
                  alias: TsTypeUnion.simplified(IArray.fromArray(unionTypes))
                };
              }

              return ta;
            }

            if (result.wasRewritten) {
              const notice = new Raw(`/* Inlined ${formatType(ta.alias)} */\n`);

              return TsDeclInterface.create(
                ta.comments.add(notice),
                ta.declared,
                ta.name,
                ta.tparams,
                IArray.Empty,
                result.value,
                ta.codePath
              );
            }

            return x;
          }

          default:
            return x;
        }
      } catch (error) {
        // Handle stack overflow and other errors
        console.warn(`Error while expanding ${x.asString}:`, error);
        return x;
      }
    };
  }
}

/**
 * Helper function to format types for comments
 */
function formatType(tpe: TsType): string {
  // This would use TsTypeFormatter in a full implementation
  return tpe.asString;
}

/**
 * After transformation - post-processing step.
 * Equivalent to the Scala ExpandTypeMappings.After object.
 */
export class ExpandTypeMappingsAfter extends TreeTransformationScopedChanges {

  override enterTsType(scope: SimpleTsTreeScope): (x: TsType) => TsType {
    return (x: TsType) => {
      try {
        const nameHint = this.getNameHint(x);

        // Check for repeated patterns
        if (this.isRepeated(scope, nameHint)) {
          return x;
        }

        // Check if refers to abstract types
        if (this.refersAbstract(scope as any, x)) {
          return x;
        }

        // Check if too deep
        if (this.isTooDeep(scope)) {
          return x;
        }

        const result = AllMembersFor.forType(scope as any, LoopDetector.initial)(x);

        if (result._tag === 'Problems') {
          return x;
        }

        if (result.wasRewritten) {
          const notices = Comments.apply([
            new Raw(`/* Inlined ${formatType(x)} */\n`),
            // Would add NameHint marker here
          ]);

          return TsTypeObject.create(notices, result.value);
        }

        return x;
      } catch (error) {
        console.warn(`SOE while expanding ${x.asString}`);
        return x;
      }
    };
  }

  private getNameHint(x: TsType): string {
    // This would implement the Unqualify transformation and TsTypeFormatter.dropComments
    return x.asString.replace(/[^a-zA-Z0-9]/g, '');
  }

  private isRepeated(scope: SimpleTsTreeScope, nameHint: string): boolean {
    // Check if this name hint appears in the scope stack
    return scope.stack.some(tree => {
      if (tree._tag === 'TsTypeObject') {
        const obj = tree as TsTypeObject;
        return obj.comments.cs.some(comment => {
          // Would check for NameHint marker
          return comment instanceof Raw && comment.raw.includes(nameHint);
        });
      }
      return false;
    });
  }

  private refersAbstract(scope: TsTreeScope, x: TsType): boolean {
    // This would implement TsTreeTraverse.collect to find abstract references
    return false; // Simplified for now
  }

  private isTooDeep(scope: SimpleTsTreeScope): boolean {
    const numTypeObjects = scope.stack.filter(tree => tree._tag === 'TsTypeObject').length;
    return numTypeObjects > 2;
  }
}

/**
 * Unqualify transformation for simplifying qualified names.
 * Equivalent to the Scala Unqualify object.
 */
export class Unqualify extends TreeTransformationUnit {

  enterTsQIdent(context: void): (x: TsQIdent) => TsQIdent {
    return (x: TsQIdent) => {
      // Keep only the last part of the qualified identifier
      const lastPart = x.parts.get(x.parts.length - 1);
      return lastPart ? TsQIdent.of(lastPart) : x;
    };
  }
}

/**
 * Export the main transformation instances
 */
export const ExpandTypeMappingsTransform = new ExpandTypeMappings();
export const ExpandTypeMappingsAfterTransform = new ExpandTypeMappingsAfter();
export const UnqualifyTransform = new Unqualify();