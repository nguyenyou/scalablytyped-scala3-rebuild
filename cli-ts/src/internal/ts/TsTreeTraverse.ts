/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TsTreeTraverse
 * 
 * Provides utilities for traversing TypeScript AST trees and collecting nodes
 * that match specific criteria.
 */

import { TsTree } from './trees.js';
import { IArray } from '../IArray.js';

/**
 * Type for a partial function that extracts values from tree nodes
 */
export type ExtractFunction<T> = (tree: TsTree) => T | undefined;

/**
 * TsTreeTraverse utility object providing tree traversal functionality
 */
export const TsTreeTraverse = {
  /**
   * Collect nodes from a single tree that match the extract function
   */
  collect<T>(tree: TsTree, extract: ExtractFunction<T>): IArray<T> {
    return TsTreeTraverse.collectIArray(IArray.apply(tree), extract);
  },

  /**
   * Collect nodes from an array of trees that match the extract function
   */
  collectIArray<T>(trees: IArray<TsTree>, extract: ExtractFunction<T>): IArray<T> {
    const results: T[] = [];
    
    trees.forEach(tree => {
      TsTreeTraverse.go(extract, results, tree);
    });
    
    return IArray.fromArray(results);
  },

  /**
   * Internal recursive traversal function
   */
  go<T>(extract: ExtractFunction<T>, results: T[], tree: TsTree): void {
    // Try to extract from current tree
    const extracted = extract(tree);
    if (extracted !== undefined) {
      results.push(extracted);
    }

    // Recursively traverse all properties of the tree
    TsTreeTraverse.rec(extract, results, tree, tree);
  },

  /**
   * Recursive helper that traverses object properties
   */
  rec<T>(extract: ExtractFunction<T>, results: T[], originalTree: TsTree, current: any): void {
    if (current === null || current === undefined) {
      return;
    }

    // Handle TsTree nodes (but avoid infinite recursion on the original tree)
    if (current !== originalTree && TsTreeTraverse.isTsTree(current)) {
      TsTreeTraverse.go(extract, results, current);
      return;
    }

    // Handle arrays
    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        TsTreeTraverse.rec(extract, results, originalTree, current[i]);
      }
      return;
    }

    // Handle IArray
    if (current && typeof current === 'object' && 'length' in current && 'forEach' in current) {
      current.forEach((item: any) => {
        TsTreeTraverse.rec(extract, results, originalTree, item);
      });
      return;
    }

    // Handle objects (traverse all enumerable properties)
    if (typeof current === 'object' && current !== null) {
      for (const key in current) {
        if (current.hasOwnProperty(key)) {
          TsTreeTraverse.rec(extract, results, originalTree, current[key]);
        }
      }
    }
  },

  /**
   * Type guard to check if an object is a TsTree
   */
  isTsTree(obj: any): obj is TsTree {
    return obj && typeof obj === 'object' && typeof obj._tag === 'string' && typeof obj.asString === 'string';
  }
};