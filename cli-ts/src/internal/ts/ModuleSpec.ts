/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.ModuleSpec
 *
 * Represents module specifications for TypeScript imports and exports.
 * This is a sealed trait pattern implemented using discriminated unions.
 */

import { TsIdent } from './trees.js';
import { IArray } from '../IArray.js';

/**
 * Base interface for module specifications
 */
export interface ModuleSpec {
  readonly _tag: 'Defaulted' | 'Namespaced' | 'Specified';
}

/**
 * Defaulted module specification - imports the default export
 */
export interface DefaultedModuleSpec extends ModuleSpec {
  readonly _tag: 'Defaulted';
}

/**
 * Namespaced module specification - imports the entire module as a namespace
 */
export interface NamespacedModuleSpec extends ModuleSpec {
  readonly _tag: 'Namespaced';
}

/**
 * Specified module specification - imports specific named exports
 */
export interface SpecifiedModuleSpec extends ModuleSpec {
  readonly _tag: 'Specified';
  readonly tsIdents: IArray<TsIdent>;
}

/**
 * Constructor functions and utilities for ModuleSpec
 */
export const ModuleSpec = {
  /**
   * Creates a defaulted module specification
   */
  defaulted: (): DefaultedModuleSpec => ({
    _tag: 'Defaulted'
  }),

  /**
   * Creates a namespaced module specification
   */
  namespaced: (): NamespacedModuleSpec => ({
    _tag: 'Namespaced'
  }),

  /**
   * Creates a specified module specification
   */
  specified: (tsIdents: IArray<TsIdent>): SpecifiedModuleSpec => ({
    _tag: 'Specified',
    tsIdents
  }),

  /**
   * Creates a ModuleSpec from a single TsIdent
   * Port of the Scala apply method
   */
  apply: (ident: TsIdent): ModuleSpec => {
    if (TsIdent.isDefault(ident)) {
      return ModuleSpec.defaulted();
    } else if (TsIdent.isNamespaced(ident)) {
      return ModuleSpec.namespaced();
    } else {
      return ModuleSpec.specified(IArray.apply(ident));
    }
  },

  /**
   * Adds a TsIdent to a ModuleSpec, returning a new ModuleSpec
   * Port of the Scala + operator
   */
  add: (spec: ModuleSpec, tsIdent: TsIdent): ModuleSpec => {
    // If the identifier is namespaced, return the original spec unchanged
    if (TsIdent.isNamespaced(tsIdent)) {
      return spec;
    }

    switch (spec._tag) {
      case 'Defaulted':
        // Defaulted + ident => Specified([default, ident])
        return ModuleSpec.specified(IArray.apply(TsIdent.default(), tsIdent));

      case 'Namespaced':
        // Namespaced + ident => Specified([ident])
        return ModuleSpec.specified(IArray.apply(tsIdent));

      case 'Specified':
        // Specified + ident => Specified(existing :+ ident)
        const specifiedSpec = spec as SpecifiedModuleSpec;
        return ModuleSpec.specified(specifiedSpec.tsIdents.append(tsIdent));
    }
  },

  /**
   * Type guards
   */
  isDefaulted: (spec: ModuleSpec): spec is DefaultedModuleSpec => spec._tag === 'Defaulted',
  isNamespaced: (spec: ModuleSpec): spec is NamespacedModuleSpec => spec._tag === 'Namespaced',
  isSpecified: (spec: ModuleSpec): spec is SpecifiedModuleSpec => spec._tag === 'Specified'
};

/**
 * Convenience function for the add operation (+ operator equivalent)
 */
export const addToModuleSpec = ModuleSpec.add;