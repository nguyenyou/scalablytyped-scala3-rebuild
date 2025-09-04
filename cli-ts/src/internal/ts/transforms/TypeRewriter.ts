/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.TypeRewriter
 *
 * Provides type rewriting functionality for transforming TypeScript AST trees
 * by replacing types according to a replacement map.
 */

import { AbstractTreeTransformation } from '../TreeTransformation.js';
import {
  TsTree,
  TsType,
  TsTypeRef,
  TsTypeParam,
  TsQIdent,
  TsIdentSimple,
  TsDeclInterface,
  TsDeclClass,
  TsDeclTypeAlias,
  TsFunSig,
  TsFunParam
} from '../trees.js';
import { IArray } from '../../IArray.js';
import { pipe } from 'fp-ts/function';
import { Option, some, none, fold } from 'fp-ts/Option';

/**
 * Interface for objects that have type parameters
 */
interface HasTParams {
  readonly tparams: IArray<TsTypeParam>;
}

/**
 * Type guard to check if a tree has type parameters
 */
function hasTParams(tree: TsTree): tree is TsTree & HasTParams {
  return 'tparams' in tree && Array.isArray((tree as any).tparams);
}

/**
 * TypeRewriter class that transforms TypeScript AST trees by replacing types
 * according to a provided replacement map.
 */
export class TypeRewriter extends AbstractTreeTransformation<Map<TsType, TsType>> {
  constructor(private readonly base: TsTree) {
    super();
  }

  withTree(t: Map<TsType, TsType>, tree: TsTree): Map<TsType, TsType> {
    if (tree === this.base) {
      return t;
    }

    // Handle if the current tree introduces a new type parameter which shadows what we are trying to inline
    if (hasTParams(tree)) {
      const filteredMap = new Map<TsType, TsType>();
      
      for (const [key, value] of t.entries()) {
        // Check if this key should be filtered out due to shadowing
        if (this.shouldFilterKey(key, tree.tparams)) {
          continue;
        }
        filteredMap.set(key, value);
      }
      
      return filteredMap;
    }

    return t;
  }

  /**
   * Checks if a type key should be filtered out due to type parameter shadowing
   */
  private shouldFilterKey(key: TsType, tparams: IArray<TsTypeParam>): boolean {
    if (key._tag === 'TsTypeRef') {
      const typeRef = key as TsTypeRef;
      
      // Check if this is a simple type reference that matches a type parameter name
      if (typeRef.tparams.length === 0 && typeRef.name.parts.length === 1) {
        const namePart = typeRef.name.parts.get(0);
        if (namePart._tag === 'TsIdentSimple') {
          const simpleName = namePart as TsIdentSimple;
          // Use find instead of some since IArray doesn't have some method
          const found = tparams.find((tp: TsTypeParam) => tp.name.value === simpleName.value);
          return found !== undefined;
        }
      }
    }
    
    return false;
  }

  /**
   * Override leaveTsType to perform type replacement
   */
  leaveTsType(replacements: Map<TsType, TsType>): (x: TsType) => TsType {
    return (x: TsType) => {
      return replacements.get(x) || x;
    };
  }

  /**
   * Visit TsDeclInterface with type replacements
   */
  visitTsDeclInterface(replacements: Map<TsType, TsType>): (x: TsDeclInterface) => TsDeclInterface {
    return (x: TsDeclInterface) => {
      const newScope = this.withTree(replacements, x);
      
      // Transform the interface recursively
      const transformed = this.transformInterface(newScope, x);
      
      return transformed;
    };
  }

  /**
   * Visit TsDeclClass with type replacements
   */
  visitTsDeclClass(replacements: Map<TsType, TsType>): (x: TsDeclClass) => TsDeclClass {
    return (x: TsDeclClass) => {
      const newScope = this.withTree(replacements, x);
      
      // Transform the class recursively
      const transformed = this.transformClass(newScope, x);
      
      return transformed;
    };
  }

  /**
   * Visit TsDeclTypeAlias with type replacements
   */
  visitTsDeclTypeAlias(replacements: Map<TsType, TsType>): (x: TsDeclTypeAlias) => TsDeclTypeAlias {
    return (x: TsDeclTypeAlias) => {
      const newScope = this.withTree(replacements, x);
      
      // Transform the type alias recursively
      const transformed = this.transformTypeAlias(newScope, x);
      
      return transformed;
    };
  }

  /**
   * Visit TsFunSig with type replacements
   */
  visitTsFunSig(replacements: Map<TsType, TsType>): (x: TsFunSig) => TsFunSig {
    return (x: TsFunSig) => {
      const newScope = this.withTree(replacements, x);
      
      // Transform the function signature recursively
      const transformed = this.transformFunSig(newScope, x);
      
      return transformed;
    };
  }

  /**
   * Visit TsType with type replacements
   */
  visitTsType(replacements: Map<TsType, TsType>): (x: TsType) => TsType {
    return (x: TsType) => {
      const newScope = this.withTree(replacements, x);
      
      // Apply type transformation
      const transformed = this.leaveTsType(newScope)(x);
      
      return transformed;
    };
  }

  /**
   * Transform an interface declaration
   */
  private transformInterface(replacements: Map<TsType, TsType>, x: TsDeclInterface): TsDeclInterface {
    // For now, return the interface unchanged - full implementation would recursively transform all types
    // This is a simplified implementation focusing on the core type replacement logic
    return x;
  }

  /**
   * Transform a class declaration
   */
  private transformClass(replacements: Map<TsType, TsType>, x: TsDeclClass): TsDeclClass {
    // For now, return the class unchanged - full implementation would recursively transform all types
    // This is a simplified implementation focusing on the core type replacement logic
    return x;
  }

  /**
   * Transform a type alias declaration
   */
  private transformTypeAlias(replacements: Map<TsType, TsType>, x: TsDeclTypeAlias): TsDeclTypeAlias {
    // Transform the alias type
    const newAlias = this.visitTsType(replacements)(x.alias);
    
    return {
      ...x,
      alias: newAlias
    };
  }

  /**
   * Transform a function signature
   */
  private transformFunSig(replacements: Map<TsType, TsType>, x: TsFunSig): TsFunSig {
    // Transform result type if present
    const newResultType = x.resultType ? pipe(
      x.resultType,
      fold(
        () => none,
        (resultType) => some(this.visitTsType(replacements)(resultType))
      )
    ) : none;

    // Transform parameter types
    const newParams = x.params ? x.params.map(param => {
      if (param.tpe) {
        return pipe(
          param.tpe,
          fold(
            () => param,
            (tpe) => ({
              ...param,
              tpe: some(this.visitTsType(replacements)(tpe))
            })
          )
        );
      }
      return param;
    }) : IArray.Empty;

    return {
      ...x,
      params: newParams,
      resultType: newResultType
    };
  }
}