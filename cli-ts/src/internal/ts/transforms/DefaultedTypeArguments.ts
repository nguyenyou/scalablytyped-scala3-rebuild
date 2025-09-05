/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.DefaultedTypeArguments
 * 
 * TypeScript supports defaulted type arguments. This adds them back.
 *
 * ```typescript
 * interface Component<P = {}, S = {}> extends ComponentLifecycle<P, S> { }
 * type ReactInstance = Component<any> | Element;
 * ```
 *
 * Rewritten into
 * ```typescript
 * type ReactInstance = Component<any, {}> | Element;
 * ```
 */

import { TreeTransformationScopedChanges } from '../TreeTransformations.js';
import { TsTreeScope } from '../TsTreeScope.js';
import { TsTypeRef, TsType, TsTypeParam } from '../trees.js';
import { HasTParams } from '../HasTParams.js';
import { TypeRewriter } from './TypeRewriter.js';
import { TsTypeFormatter } from '../TsTypeFormatter.js';
import { Comments } from '../../Comments.js';
import { Comment } from '../../Comment.js';
import { IArray } from '../../IArray.js';
import { pipe } from 'fp-ts/function';
import { Option, some, none, fold, getOrElse } from 'fp-ts/Option';

/**
 * A transformation that adds default type arguments to type references when they are missing.
 * 
 * This transformation extends TreeTransformationScopedChanges to have access to the type scope
 * for looking up type declarations and their type parameters.
 * 
 * @example
 * ```typescript
 * // Given: interface Component<P = {}, S = {}>
 * // Input: Component<any>
 * // Output: Component<any, {}>
 * ```
 */
export class DefaultedTypeArguments extends TreeTransformationScopedChanges {
  /**
   * Transforms a TypeScript type reference by adding default type arguments when missing.
   * 
   * The transformation:
   * 1. Looks up the type declaration in the scope
   * 2. Compares provided type arguments with expected type parameters
   * 3. Adds default values for missing type arguments
   * 4. Handles self-referencing defaults to avoid infinite recursion
   * 5. Instantiates type parameters that reference earlier parameters
   * 
   * @param scope The current tree scope for type lookups
   * @returns A function that transforms a TsTypeRef
   */
  enterTsTypeRef(scope: TsTreeScope): (typeRef: TsTypeRef) => TsTypeRef {
    return (typeRef: TsTypeRef) => {
      const providedTypeArgs = typeRef.tparams;

      // Look up the type declaration to get its type parameters
      const typeDeclarations = scope.lookupType(typeRef.name);

      for (const decl of typeDeclarations) {
        const expectedTparams = HasTParams.unapply(decl);

        if (expectedTparams._tag === 'Some' && expectedTparams.value.length !== providedTypeArgs.length) {
          const expectedTparamsArray = expectedTparams.value;
          const instantiated = new Map<TsType, TsType>();

          const newTParams = IArray.fromArray(
            expectedTparamsArray.toArray().map((current: TsTypeParam, idx: number) => {
              if (idx < providedTypeArgs.length) {
                // Use provided type argument
                const provided = providedTypeArgs.get(idx);
                const currentTypeRef = TsTypeRef.fromIdent(current.name);
                instantiated.set(currentTypeRef, provided);
                return provided;
              } else {
                // Use default or fallback
                const next = pipe(
                  current.default,
                  getOrElse((): TsType => {
                    const msg = `no default parameter for ${TsTypeFormatter.tparam(current)}`;
                    scope.logger.warn(msg);
                    
                    return pipe(
                      current.upperBound,
                      getOrElse((): TsType =>
                        TsTypeRef.any.withComments(Comments.apply([Comment.warning(msg)]))
                      )
                    );
                  })
                );

                // Handle self-referencing defaults to prevent infinite recursion
                const next2 = this.handleSelfReference(next, typeRef);

                // Handle type parameters that reference earlier parameters
                const next3 = this.instantiateTypeReferences(next2, instantiated);
                
                const currentTypeRef = TsTypeRef.fromIdent(current.name);
                instantiated.set(currentTypeRef, next3);
                return next3;
              }
            })
          );

          return TsTypeRef.create(
            typeRef.comments,
            typeRef.name,
            newTParams
          );
        }
      }

      // Return unchanged if no matching declaration found or no changes needed
      return typeRef;
    };
  }

  /**
   * Handles self-referencing default types to prevent infinite recursion.
   * 
   * If a default type references the same type being processed, replace it with `any`
   * to avoid stack overflow errors.
   * 
   * @param next The default type to check
   * @param originalTypeRef The original type reference being processed
   * @returns The type with self-references replaced by `any`
   */
  private handleSelfReference(next: TsType, originalTypeRef: TsTypeRef): TsType {
    if (next._tag === 'TsTypeRef') {
      const nextTr = next as TsTypeRef;
      if (this.typeRefsEqual(nextTr.name, originalTypeRef.name)) {
        const formattedType = TsTypeFormatter.apply(nextTr);
        return TsTypeRef.any.withComments(
          Comments.apply([Comment.create(`/* ${formattedType} */`)])
        );
      }
    }
    return next;
  }

  /**
   * Instantiates type references in a type using the provided instantiation map.
   * 
   * This handles cases where a defaulted type parameter refers to earlier type parameters
   * by name, replacing those references with their instantiated values.
   * 
   * @param type The type to process
   * @param instantiated Map of type references to their instantiated values
   * @returns The type with references instantiated
   */
  private instantiateTypeReferences(type: TsType, instantiated: Map<TsType, TsType>): TsType {
    // Create a dummy tree for the TypeRewriter
    const dummyTree = TsTypeRef.any;

    const typeRewriter = new TypeRewriter(dummyTree);
    return typeRewriter.visitTsType(instantiated)(type);
  }

  /**
   * Checks if two qualified identifiers are equal.
   * 
   * @param name1 First qualified identifier
   * @param name2 Second qualified identifier
   * @returns True if the identifiers are equal
   */
  private typeRefsEqual(name1: any, name2: any): boolean {
    // Simple equality check - in a full implementation this would be more sophisticated
    return name1.asString === name2.asString;
  }
}

/**
 * Singleton instance of the DefaultedTypeArguments transformation.
 * This follows the Scala pattern of having an object instance.
 */
export const DefaultedTypeArgumentsTransform = new DefaultedTypeArguments();