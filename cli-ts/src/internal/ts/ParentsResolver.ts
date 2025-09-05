/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.ParentsResolver
 *
 * Resolves parent types for TypeScript classes and interfaces by traversing inheritance hierarchies.
 * This handles type aliases, circular references, and unresolved types.
 *
 * @deprecated This presumes that parents can always be IArray[InterfaceOrClass].
 * Once we factor in type aliases with arbitrary type manipulations that is hardly true,
 * so we'll need a much better approach here.
 */

import { Option, some, none } from 'fp-ts/Option';
import { IArray, IArrayBuilder } from '../IArray.js';
import { Comments } from '../Comments.js';
import {
  TsTree,
  TsDeclClass,
  TsDeclInterface,
  TsDeclTypeAlias,
  TsType,
  TsTypeRef,
  TsTypeObject,
  TsTypeUnion,
  TsTypeIntersect,
  TsNamedDecl,
  TsIdent,
  TsIdentDummy,
  TsQIdent
} from './trees.js';
import { TsTreeScope } from './TsTreeScope.js';
import { HasClassMembers } from './MemberCache.js';
import { FillInTParams } from './FillInTParams.js';
import { CodePath } from './CodePath.js';

/**
 * Type alias for TypeScript declarations that can have class members
 * Represents either a class or interface declaration
 */
export type InterfaceOrClass = TsTree & HasClassMembers;

/**
 * Result type containing a declaration with its resolved parents and unresolved types
 *
 * @template X The type of the original declaration (class or interface)
 */
export interface WithParents<X extends InterfaceOrClass> {
  readonly _tag: 'WithParents';

  /**
   * The original declaration
   */
  readonly value: X;

  /**
   * All resolved parent declarations (classes and interfaces)
   */
  readonly parents: IArray<InterfaceOrClass>;

  /**
   * Types that could not be resolved to declarations
   */
  readonly unresolved: IArray<TsType>;
}

/**
 * Creates a WithParents result
 */
export const WithParents = {
  create: <X extends InterfaceOrClass>(
    value: X,
    parents: IArray<InterfaceOrClass>,
    unresolved: IArray<TsType>
  ): WithParents<X> => ({
    _tag: 'WithParents',
    value,
    parents,
    unresolved
  })
};

/**
 * Type guard for InterfaceOrClass
 */
export function isInterfaceOrClass(tree: TsTree): tree is InterfaceOrClass {
  return (tree._tag === 'TsDeclClass' || tree._tag === 'TsDeclInterface') &&
         'members' in tree;
}

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
 * Type guard for TsTypeRef
 */
export function isTsTypeRef(type: TsType): type is TsTypeRef {
  return type._tag === 'TsTypeRef';
}

/**
 * Type guard for TsTypeObject
 */
export function isTsTypeObject(type: TsType): type is TsTypeObject {
  return type._tag === 'TsTypeObject';
}

/**
 * Type guard for TsTypeUnion
 */
export function isTsTypeUnion(type: TsType): type is TsTypeUnion {
  return type._tag === 'TsTypeUnion';
}

/**
 * Type guard for TsTypeIntersect
 */
export function isTsTypeIntersect(type: TsType): type is TsTypeIntersect {
  return type._tag === 'TsTypeIntersect';
}

/**
 * ParentsResolver object providing utilities for resolving inheritance hierarchies
 *
 * This implementation follows the Scala version but uses TypeScript patterns:
 * - Uses builders for accumulating results
 * - Handles circular references by tracking seen declarations
 * - Resolves type aliases recursively
 * - Creates synthetic interfaces for object types
 */
export const ParentsResolver = {
  /**
   * Resolves the parent hierarchy for a given class or interface declaration
   *
   * @param scope The scope to use for type lookups
   * @param tree The class or interface to resolve parents for
   * @returns WithParents containing the original tree, resolved parents, and unresolved types
   *
   * This function:
   * 1. Extracts parent type references from the declaration
   * 2. Recursively resolves each parent through the type system
   * 3. Handles type aliases by following them to their ultimate types
   * 4. Creates synthetic interfaces for object types
   * 5. Tracks circular references to prevent infinite recursion
   * 6. Accumulates unresolved types that couldn't be found
   */
  apply: <X extends InterfaceOrClass>(scope: TsTreeScope, tree: X): WithParents<X> => {
    // Builders for accumulating results
    const seenBuilder = IArrayBuilder.empty<TsTree>();
    const allParentsBuilder = IArrayBuilder.empty<InterfaceOrClass>();
    const unresolvedBuilder = IArrayBuilder.empty<TsType>();

    // Add the original tree to seen to prevent self-reference
    seenBuilder.addOne(tree);

    /**
     * Inner recursive function to resolve a qualified name to its declaration
     *
     * @param currentScope The current scope for lookups
     * @param qualifiedName The qualified name to resolve
     * @param currentTParams Current type parameters for substitution
     */
    function innerRecurse(
      currentScope: TsTreeScope,
      qualifiedName: TsQIdent,
      currentTParams: IArray<TsType>
    ): void {
      const found = currentScope.lookupTypeIncludeScope(qualifiedName);

      if (found.isEmpty) {
        unresolvedBuilder.addOne(TsTypeRef.create(Comments.empty(), qualifiedName, currentTParams));
        return;
      }

      found.forEach(([decl, foundInScope]: [TsNamedDecl, TsTreeScope]) => {
        if (isTsDeclClass(decl)) {
          const cls = decl as TsDeclClass;
          if (seenBuilder.result().toArray().every((seen: TsTree) => seen !== cls)) {
            seenBuilder.addOne(cls);
            const rewritten = FillInTParams.apply(cls, currentTParams);
            allParentsBuilder.addOne(rewritten);
            outerRecurse(foundInScope, rewritten);
          }
        } else if (isTsDeclInterface(decl)) {
          const int = decl as TsDeclInterface;
          if (seenBuilder.result().toArray().every((seen: TsTree) => seen !== int)) {
            seenBuilder.addOne(int);
            const rewritten = FillInTParams.apply(int, currentTParams);
            allParentsBuilder.addOne(rewritten);
            outerRecurse(foundInScope, rewritten);
          }
        } else if (isTsDeclTypeAlias(decl)) {
          const ta = decl as TsDeclTypeAlias;
          if (seenBuilder.result().toArray().every((seen: TsTree) => seen !== ta)) {
            seenBuilder.addOne(ta);
            const rewritten = FillInTParams.apply(ta, currentTParams);
            handleTypeAliasTarget(foundInScope, rewritten.alias, currentScope);
          }
        } else {
          unresolvedBuilder.addOne(TsTypeRef.create(Comments.empty(), qualifiedName, currentTParams));
        }
      });
    }

    /**
     * Handles the target type of a type alias
     *
     * @param foundInScope The scope where the alias was found
     * @param aliasTarget The target type of the alias
     * @param originalScope The original scope for fallback lookups
     */
    function handleTypeAliasTarget(
      foundInScope: TsTreeScope,
      aliasTarget: TsType,
      originalScope: TsTreeScope
    ): void {
      if (isTsTypeRef(aliasTarget)) {
        const typeRef = aliasTarget as TsTypeRef;
        innerRecurse(foundInScope, typeRef.name, typeRef.tparams);
      } else if (isTsTypeObject(aliasTarget)) {
        const objType = aliasTarget as TsTypeObject;
        // Create synthetic interface for object type
        const syntheticInterface = TsDeclInterface.create(
          Comments.empty(),
          false, // declared
          TsIdentDummy, // name
          IArray.Empty, // tparams
          IArray.Empty, // inheritance
          objType.members,
          CodePath.noPath() // codePath
        );
        allParentsBuilder.addOne(syntheticInterface);
      } else if (isTsTypeUnion(aliasTarget)) {
        const unionType = aliasTarget as TsTypeUnion;
        unionType.types.forEach(unionMember => {
          if (isTsTypeRef(unionMember)) {
            const typeRef = unionMember as TsTypeRef;
            innerRecurse(originalScope, typeRef.name, typeRef.tparams);
          }
        });
      } else if (isTsTypeIntersect(aliasTarget)) {
        const intersectType = aliasTarget as TsTypeIntersect;
        intersectType.types.forEach(intersectMember => {
          if (isTsTypeRef(intersectMember)) {
            const typeRef = intersectMember as TsTypeRef;
            innerRecurse(originalScope, typeRef.name, typeRef.tparams);
          }
        });
      } else {
        unresolvedBuilder.addOne(aliasTarget);
      }
    }

    /**
     * Outer recursive function to process a tree and extract its parent references
     *
     * @param currentScope The current scope for lookups
     * @param currentTree The tree to process for parent references
     */
    function outerRecurse(currentScope: TsTreeScope, currentTree: TsTree): void {
      let parentRefs: IArray<TsTypeRef>;

      if (isTsDeclInterface(currentTree)) {
        const int = currentTree as TsDeclInterface;
        parentRefs = int.inheritance;
      } else if (isTsDeclClass(currentTree)) {
        const cls = currentTree as TsDeclClass;
        // Combine parent class and implemented interfaces
        const parentArray = cls.parent._tag === 'Some' ? IArray.apply(cls.parent.value) : IArray.Empty;
        parentRefs = parentArray.concat(cls.implementsInterfaces);
      } else {
        parentRefs = IArray.Empty;
      }

      parentRefs.forEach(parentRef => {
        if (isTsTypeRef(parentRef)) {
          const typeRef = parentRef as TsTypeRef;
          innerRecurse(currentScope, typeRef.name, typeRef.tparams);
        }
      });
    }

    // Start the resolution process
    outerRecurse(scope, tree);

    // Return the result
    return WithParents.create(
      tree,
      allParentsBuilder.result(),
      unresolvedBuilder.result()
    );
  }
};

/**
 * Convenience function for resolving parents
 * Equivalent to ParentsResolver.apply
 */
export const resolveParents = ParentsResolver.apply;

/**
 * Type alias for the main ParentsResolver function
 */
export type ParentsResolverFunction = typeof ParentsResolver.apply;