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

    const referenced = IArrayBuilder.empty<TsIdent>();

    // Recursive function to traverse the tree with proper scope handling
    const traverseWithScope = (node: TsTree, currentScope: Map<TsIdent, TsTypeParam>) => {
      // Check if this node introduces new type parameters that shadow the current scope
      const nodeTParams = HasTParams.apply(node);
      const effectiveScope = new Map(currentScope);
      nodeTParams.forEach(tp => {
        // Remove any type parameters from scope that have the same name (by value)
        for (const [scopeIdent, scopeTParam] of currentScope.entries()) {
          if (scopeIdent.value === tp.name.value) {
            effectiveScope.delete(scopeIdent);
          }
        }
      });

      // If this is a type reference, check if it references a type parameter in scope
      if (node._tag === 'TsTypeRef') {
        const typeRef = node as TsTypeRef;
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
      }

      // Recursively traverse all children with the effective scope
      // Use TsTreeTraverse.go to traverse all child nodes
      TsTreeTraverse.go((childNode: TsTree) => {
        if (childNode !== node) { // Avoid infinite recursion
          traverseWithScope(childNode, effectiveScope);
        }
        return undefined; // We don't collect anything, just traverse
      }, [], node);
    };

    traverseWithScope(tree, inScope);
    const referencedInTree: IArray<TsIdent> = referenced.result().distinct();

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