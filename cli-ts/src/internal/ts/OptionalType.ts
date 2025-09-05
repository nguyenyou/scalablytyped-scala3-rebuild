/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.OptionalType
 *
 * Provides utilities for working with optional types in TypeScript.
 * An optional type is a union type that includes undefined and/or null.
 *
 * This module provides:
 * - Pattern matching to extract the non-optional part of a type
 * - Creation of optional types by adding undefined
 * - Conditional optionalization based on boolean flags
 */

import { Option, some, none } from 'fp-ts/Option';
import { TsType, TsTypeUnion, TsTypeRef } from './trees.js';
import { IArray } from '../IArray.js';

/**
 * Checks if a type is an optional marker (undefined or null)
 * We use string comparison since object equality doesn't work with Set
 */
const isOptionalMarker = (tpe: TsType): boolean => {
  if (tpe._tag !== 'TsTypeRef') return false;
  const typeRef = tpe as TsTypeRef;
  const name = typeRef.name.asString;
  return name === 'TsQIdent(undefined)' || name === 'TsQIdent(null)';
};

/**
 * OptionalType object providing utilities for optional type operations
 * Corresponds to the Scala OptionalType object which extends (TsType => TsType)
 */
export const OptionalType = {
  /**
   * Set of types that make a union type optional (undefined and null)
   * Using a Set with string representations for proper equality checking
   */
  undefineds: new Set(['TsQIdent(undefined)', 'TsQIdent(null)']),

  /**
   * Pattern matching function to extract the non-optional part of a type
   *
   * @param tpe The type to analyze
   * @returns Some(extractedType) if the type is optional, None otherwise
   *
   * This function:
   * 1. Checks if the type is a union type
   * 2. Partitions the union into optional types (undefined/null) and others
   * 3. If no optional types found, returns None
   * 4. If optional types found, simplifies the remaining types and recursively extracts
   * 5. Returns the extracted non-optional type
   */
  unapply: (tpe: TsType): Option<TsType> => {
    if (tpe._tag === 'TsTypeUnion') {
      const unionType = tpe as TsTypeUnion;
      const [optionalTypes, remaining] = unionType.types.partition(isOptionalMarker);

      if (optionalTypes.isEmpty) {
        return none;
      } else {
        const rest = TsTypeUnion.simplified(remaining);
        const recursiveResult = OptionalType.unapply(rest);
        return recursiveResult._tag === 'Some' ? recursiveResult : some(rest);
      }
    } else {
      return none;
    }
  },

  /**
   * Creates an optional type by adding undefined to the given type
   *
   * @param tpe The type to make optional
   * @returns A union type containing the original type and undefined
   *
   * Uses TsTypeUnion.simplified to ensure proper deduplication and flattening
   */
  apply: (tpe: TsType): TsType => {
    return TsTypeUnion.simplified(IArray.apply(tpe, TsTypeRef.undefined));
  },

  /**
   * Conditionally makes a type optional based on a boolean flag
   *
   * @param tpe The type to potentially make optional
   * @param isOptional Whether to make the type optional
   * @returns The original type if isOptional is false, otherwise an optional type
   *
   * This is a convenience method that applies the optional transformation
   * only when the isOptional flag is true.
   */
  maybe: (tpe: TsType, isOptional: boolean): TsType => {
    return isOptional ? OptionalType.apply(tpe) : tpe;
  },

  /**
   * Type guard to check if a type is a union type
   */
  isUnionType: (tpe: TsType): tpe is TsTypeUnion => tpe._tag === 'TsTypeUnion',

  /**
   * Checks if a type is considered an optional type marker (undefined or null)
   */
  isOptionalMarker,

  /**
   * Checks if a type is an optional type (contains undefined or null in a union)
   */
  isOptional: (tpe: TsType): boolean => {
    const result = OptionalType.unapply(tpe);
    return result._tag === 'Some';
  }
};

/**
 * Convenience function for creating optional types
 * Equivalent to OptionalType.apply
 */
export const makeOptional = OptionalType.apply;

/**
 * Convenience function for conditional optionalization
 * Equivalent to OptionalType.maybe
 */
export const maybeOptional = OptionalType.maybe;

/**
 * Convenience function for pattern matching optional types
 * Equivalent to OptionalType.unapply
 */
export const extractOptional = OptionalType.unapply;