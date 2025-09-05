/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.HasTParams
 *
 * Utility for extracting type parameters from TypeScript AST trees.
 * This provides a unified interface for accessing type parameters from various
 * tree node types that can have them (classes, interfaces, functions, etc.).
 */

import { Option, some, none } from 'fp-ts/Option';
import { IArray } from '../IArray.js';
import {
  TsTree,
  TsTypeParam,
  TsDeclClass,
  TsDeclInterface,
  TsDeclTypeAlias,
  TsDeclFunction,
  TsMemberFunction,
  TsMemberCall,
  TsMemberCtor,
  TsTypeFunction,
  TsFunSig,
  TsTypeConditional,
  TsTypeInfer
} from './trees.js';
import { TsTreeTraverse } from './TsTreeTraverse.js';

/**
 * Type guard for TsDeclClass
 */
export function isTsDeclClass(tree: TsTree): tree is TsDeclClass {
  return tree._tag === 'TsDeclClass';
}

/**
 * Type guard for TsDeclInterface
 */
export function isTsDeclInterface(tree: TsTree): tree is TsDeclInterface {
  return tree._tag === 'TsDeclInterface';
}

/**
 * Type guard for TsDeclTypeAlias
 */
export function isTsDeclTypeAlias(tree: TsTree): tree is TsDeclTypeAlias {
  return tree._tag === 'TsDeclTypeAlias';
}

/**
 * Type guard for TsDeclFunction
 */
export function isTsDeclFunction(tree: TsTree): tree is TsDeclFunction {
  return tree._tag === 'TsDeclFunction';
}

/**
 * Type guard for TsMemberFunction
 */
export function isTsMemberFunction(tree: TsTree): tree is TsMemberFunction {
  return tree._tag === 'TsMemberFunction';
}

/**
 * Type guard for TsMemberCall
 */
export function isTsMemberCall(tree: TsTree): tree is TsMemberCall {
  return tree._tag === 'TsMemberCall';
}

/**
 * Type guard for TsMemberCtor
 */
export function isTsMemberCtor(tree: TsTree): tree is TsMemberCtor {
  return tree._tag === 'TsMemberCtor';
}

/**
 * Type guard for TsTypeFunction
 */
export function isTsTypeFunction(tree: TsTree): tree is TsTypeFunction {
  return tree._tag === 'TsTypeFunction';
}

/**
 * Type guard for TsFunSig
 */
export function isTsFunSig(tree: TsTree): tree is TsFunSig {
  return tree._tag === 'TsFunSig';
}

/**
 * Type guard for TsTypeConditional
 */
export function isTsTypeConditional(tree: TsTree): tree is TsTypeConditional {
  return tree._tag === 'TsTypeConditional';
}

/**
 * Type guard for TsTypeInfer
 */
export function isTsTypeInfer(tree: TsTree): tree is TsTypeInfer {
  return tree._tag === 'TsTypeInfer';
}

/**
 * HasTParams utility object providing type parameter extraction functionality.
 *
 * This object provides two main methods:
 * - `apply`: Returns type parameters or empty array if none found
 * - `unapply`: Returns Option of type parameters for pattern matching
 *
 * Supports extracting type parameters from:
 * - Class declarations (TsDeclClass)
 * - Interface declarations (TsDeclInterface)
 * - Type alias declarations (TsDeclTypeAlias)
 * - Function declarations (TsDeclFunction)
 * - Member functions (TsMemberFunction)
 * - Member call signatures (TsMemberCall)
 * - Member constructors (TsMemberCtor)
 * - Function types (TsTypeFunction)
 * - Function signatures (TsFunSig)
 * - Conditional types with infer (TsTypeConditional)
 */
export const HasTParams = {
  /**
   * Extracts type parameters from a tree node.
   * Returns an empty array if the tree has no type parameters or is not supported.
   *
   * @param tree The tree node to extract type parameters from
   * @returns Array of type parameters, or empty array if none found
   *
   * @example
   * ```typescript
   * const classDecl = createMockClass("MyClass", [typeParam]);
   * const tparams = HasTParams.apply(classDecl); // Returns [typeParam]
   *
   * const unsupportedTree = TsTypeRef.string;
   * const empty = HasTParams.apply(unsupportedTree); // Returns []
   * ```
   */
  apply: (tree: TsTree): IArray<TsTypeParam> => {
    const result = HasTParams.unapply(tree);
    return result._tag === 'Some' ? result.value : IArray.Empty;
  },

  /**
   * Extracts type parameters from a tree node using Option pattern matching.
   * Returns Some(tparams) if the tree has type parameters, None otherwise.
   *
   * @param tree The tree node to extract type parameters from
   * @returns Option containing type parameters, or None if not supported/found
   *
   * This method handles the following tree types:
   * - TsDeclClass: Returns class type parameters
   * - TsDeclInterface: Returns interface type parameters
   * - TsDeclTypeAlias: Returns type alias type parameters
   * - TsDeclFunction: Returns function signature type parameters
   * - TsMemberFunction: Returns member function signature type parameters
   * - TsMemberCall: Returns call signature type parameters
   * - TsMemberCtor: Returns constructor signature type parameters
   * - TsTypeFunction: Returns function type signature type parameters
   * - TsFunSig: Returns function signature type parameters
   * - TsTypeConditional: Returns inferred type parameters from conditional types
   * - All other types: Returns None
   *
   * @example
   * ```typescript
   * const classDecl = createMockClass("MyClass", [typeParam]);
   * const result = HasTParams.unapply(classDecl);
   * if (result._tag === 'Some') {
   *   console.log(result.value); // [typeParam]
   * }
   *
   * const unsupportedTree = TsTypeRef.string;
   * const empty = HasTParams.unapply(unsupportedTree); // { _tag: 'None' }
   * ```
   */
  unapply: (tree: TsTree): Option<IArray<TsTypeParam>> => {
    if (isTsDeclClass(tree)) {
      return some(tree.tparams);
    }

    if (isTsDeclInterface(tree)) {
      return some(tree.tparams);
    }

    if (isTsDeclTypeAlias(tree)) {
      return some(tree.tparams);
    }

    if (isTsDeclFunction(tree)) {
      return some(tree.signature.tparams);
    }

    if (isTsMemberFunction(tree)) {
      return some(tree.signature.tparams);
    }

    if (isTsMemberCall(tree)) {
      return some(tree.signature.tparams);
    }

    if (isTsMemberCtor(tree)) {
      return some(tree.signature.tparams);
    }

    if (isTsTypeFunction(tree)) {
      return some(tree.signature.tparams);
    }

    if (isTsFunSig(tree)) {
      return some(tree.tparams);
    }

    if (isTsTypeConditional(tree)) {
      // Handle TsTypeInfer case - collect inferred type parameters from the predicate
      const found = TsTreeTraverse.collect(tree.pred, (t: TsTree) => {
        if (isTsTypeInfer(t)) {
          return t.tparam;
        }
        return undefined;
      });

      return found.length > 0 ? some(found) : none;
    }

    // All other tree types don't have type parameters
    return none;
  }
};

/**
 * Convenience function for extracting type parameters.
 * Equivalent to HasTParams.apply.
 *
 * @param tree The tree node to extract type parameters from
 * @returns Array of type parameters, or empty array if none found
 */
export const extractTypeParams = HasTParams.apply;

/**
 * Convenience function for pattern matching on type parameters.
 * Equivalent to HasTParams.unapply.
 *
 * @param tree The tree node to extract type parameters from
 * @returns Option containing type parameters, or None if not supported/found
 */
export const matchTypeParams = HasTParams.unapply;