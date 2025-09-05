/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TypeParamsReferencedInTree
 *
 * Analyzes a TypeScript AST tree to find which type parameters from a given scope
 * are actually referenced within the tree. This includes both direct references
 * and indirect references through type parameter bounds.
 */

import { AbstractTreeTransformation } from './TreeTransformation.js';
import { TsTreeTraverse } from './TsTreeTraverse.js';
import {
  TsTree,
  TsTypeRef,
  TsQIdent,
  TsIdent,
  TsTypeParam
} from './trees.js';
import { IArray, IArrayPatterns, IArrayBuilder } from '../IArray.js';
import { pipe } from 'fp-ts/function';
import { Option, some, none, fold, isSome } from 'fp-ts/Option';

/**
 * Utility for extracting type parameters from trees that have them
 */
const HasTParams = {
  apply: (tree: TsTree): IArray<TsTypeParam> => {
    const result = HasTParams.unapply(tree);
    return result !== undefined ? result : IArray.Empty;
  },

  unapply: (tree: TsTree): IArray<TsTypeParam> | undefined => {
    switch (tree._tag) {
      case 'TsDeclClass':
        return (tree as any).tparams;
      case 'TsDeclInterface':
        return (tree as any).tparams;
      case 'TsDeclTypeAlias':
        return (tree as any).tparams;
      case 'TsDeclFunction':
        return (tree as any).signature?.tparams;
      case 'TsMemberFunction':
        return (tree as any).signature?.tparams;
      case 'TsMemberCall':
        return (tree as any).signature?.tparams;
      case 'TsMemberCtor':
        return (tree as any).signature?.tparams;
      case 'TsTypeFunction':
        return (tree as any).signature?.tparams;
      case 'TsFunSig':
        return (tree as any).tparams;
      case 'TsTypeConditional':
        // Handle TsTypeInfer case - collect inferred type parameters
        const found = TsTreeTraverse.collect(tree, (t: TsTree) => {
          if (t._tag === 'TsTypeInfer') {
            return (t as any).tparam;
          }
          return undefined;
        });
        return found.nonEmpty ? found : undefined;
      default:
        return undefined;
    }
  }
};

/**
 * Main TypeParamsReferencedInTree object providing the analysis functionality
 */
export const TypeParamsReferencedInTree = {
  /**
   * Analyzes a tree to find which type parameters from the given scope are referenced.
   *
   * @param inScope Map of type parameter names to their definitions
   * @param tree The tree to analyze
   * @returns Array of type parameters that are referenced in the tree
   */
  apply: (inScope: Map<TsIdent, TsTypeParam>, tree: TsTree): IArray<TsTypeParam> => {
    // First pass: find direct references to type parameters in the tree
    // We need to handle scope shadowing - type parameters defined in inner scopes shadow outer ones

    const findReferencesWithScope = (currentScope: Map<TsIdent, TsTypeParam>, currentTree: TsTree): IArray<TsIdent> => {
      const referenced = IArrayBuilder.empty<TsIdent>();

      // Update scope for this tree - remove any type parameters that are shadowed
      const tparams = HasTParams.apply(currentTree);
      const effectiveScope = new Map(currentScope);
      tparams.forEach(tp => {
        effectiveScope.delete(tp.name);
      });

      // Collect all TsTypeRef nodes in this tree and check if they reference type parameters
      const typeRefs = TsTreeTraverse.collect(currentTree, (node: TsTree) => {
        if (node._tag === 'TsTypeRef') {
          return node as TsTypeRef;
        }
        return undefined;
      });

      // Check each type reference to see if it's a simple reference to a type parameter in scope
      typeRefs.forEach(typeRef => {
        const exactlyOne = IArrayPatterns.exactlyOne(typeRef.name.parts);
        if (exactlyOne !== undefined) {
          // Find the type parameter by comparing the value, not the object reference
          for (const [scopeIdent, scopeTParam] of effectiveScope.entries()) {
            if (scopeIdent.value === exactlyOne.value) {
              referenced.addOne(scopeIdent);
              break;
            }
          }
        }
      });

      return referenced.result();
    };

    const referencedInTree: IArray<TsIdent> = findReferencesWithScope(inScope, tree).distinct();

    // Second pass: find type parameters referenced in the bounds of the directly referenced ones
    // Collect upper bounds from referenced type parameters
    const bounds: TsTree[] = [];
    referencedInTree.forEach((ident: TsIdent) => {
      const tparam = inScope.get(ident);
      if (tparam) {
        pipe(
          tparam.upperBound,
          fold(
            () => {}, // No bound
            (bound) => bounds.push(bound)
          )
        );
      }
    });

    // Traverse the bounds to find additional type parameter references
    const fromBounds = TsTreeTraverse.collectIArray(IArray.fromArray(bounds), (tree: TsTree) => {
      if (tree._tag === 'TsTypeRef') {
        const typeRef = tree as TsTypeRef;
        const exactlyOne = IArrayPatterns.exactlyOne(typeRef.name.parts);
        if (exactlyOne !== undefined) {
          // Find the type parameter by comparing the value, not the object reference
          for (const [scopeIdent, scopeTParam] of inScope.entries()) {
            if (scopeIdent.value === exactlyOne.value) {
              return scopeIdent;
            }
          }
        }
      }
      return undefined;
    });

    // Combine direct references and bound references, remove duplicates, and map to type parameters
    const allReferencedIdents: IArray<TsIdent> = referencedInTree.appendedAll(fromBounds).distinct();
    return allReferencedIdents.mapNotNone((ident: TsIdent) => {
      const tparam = inScope.get(ident);
      return tparam || undefined;
    });
  }
};