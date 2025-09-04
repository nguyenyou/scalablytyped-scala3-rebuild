/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TreeTransformations
 * 
 * Provides concrete implementations of TreeTransformation for common use cases.
 */

import { AbstractTreeTransformation } from './TreeTransformation.js';
import { TsTree } from './trees.js';

/**
 * Interface representing a tree scope that can be extended with new trees.
 * This is analogous to the Scala TsTreeScope.
 */
export interface TsTreeScope {
  /**
   * Creates a new scope by adding a tree to the current scope.
   * This is equivalent to the '/' operator in Scala.
   */
  withTree(tree: TsTree): TsTreeScope;
  
  /**
   * The stack of trees in this scope, from innermost to outermost.
   */
  readonly stack: readonly TsTree[];
}

/**
 * Tree transformation that maintains scoped changes.
 * This is equivalent to TreeTransformationScopedChanges in Scala.
 * 
 * The scope is updated by adding each tree to the scope stack as we traverse.
 */
export abstract class TreeTransformationScopedChanges extends AbstractTreeTransformation<TsTreeScope> {
  /**
   * Adds the current tree to the scope when entering it.
   * This creates a new scope with the tree added to the stack.
   */
  withTree(scope: TsTreeScope, tree: TsTree): TsTreeScope {
    return scope.withTree(tree);
  }
}

/**
 * Tree transformation that doesn't maintain any context.
 * This is equivalent to TreeTransformationUnit in Scala.
 * 
 * Useful for transformations that don't need to track scope or context.
 */
export abstract class TreeTransformationUnit extends AbstractTreeTransformation<void> {
  /**
   * Returns void since no context is maintained.
   */
  withTree(context: void, tree: TsTree): void {
    return undefined;
  }
}

/**
 * A simple implementation of TsTreeScope for testing and basic use cases.
 */
export class SimpleTsTreeScope implements TsTreeScope {
  constructor(
    public readonly stack: readonly TsTree[] = []
  ) {}

  withTree(tree: TsTree): TsTreeScope {
    return new SimpleTsTreeScope([tree, ...this.stack]);
  }

  /**
   * Creates an empty scope.
   */
  static empty(): TsTreeScope {
    return new SimpleTsTreeScope();
  }
}

/**
 * Utility functions for working with tree transformations.
 */
export namespace TreeTransformations {
  /**
   * Creates a no-op transformation that returns everything unchanged.
   */
  export function identity<T>(): AbstractTreeTransformation<T> {
    return new (class extends AbstractTreeTransformation<T> {
      withTree(t: T, tree: TsTree): T {
        return t;
      }
    })();
  }

  /**
   * Creates a scoped transformation that returns everything unchanged.
   */
  export function identityScoped(): TreeTransformationScopedChanges {
    return new (class extends TreeTransformationScopedChanges {
      // All methods use default implementations
    })();
  }

  /**
   * Creates a unit transformation that returns everything unchanged.
   */
  export function identityUnit(): TreeTransformationUnit {
    return new (class extends TreeTransformationUnit {
      // All methods use default implementations
    })();
  }

  /**
   * Combines multiple transformations into a single transformation.
   * Applies transformations from left to right.
   */
  export function compose<T>(
    ...transformations: AbstractTreeTransformation<T>[]
  ): AbstractTreeTransformation<T> {
    if (transformations.length === 0) {
      return identity<T>();
    }

    return transformations.reduce((acc, curr) => acc.combine(curr) as AbstractTreeTransformation<T>);
  }

  /**
   * Combines multiple scoped transformations.
   */
  export function composeScoped(
    ...transformations: TreeTransformationScopedChanges[]
  ): TreeTransformationScopedChanges {
    if (transformations.length === 0) {
      return identityScoped();
    }
    
    return transformations.reduce((acc, curr) => 
      acc.combine(curr) as TreeTransformationScopedChanges
    );
  }

  /**
   * Combines multiple unit transformations.
   */
  export function composeUnit(
    ...transformations: TreeTransformationUnit[]
  ): TreeTransformationUnit {
    if (transformations.length === 0) {
      return identityUnit();
    }
    
    return transformations.reduce((acc, curr) => 
      acc.combine(curr) as TreeTransformationUnit
    );
  }
}