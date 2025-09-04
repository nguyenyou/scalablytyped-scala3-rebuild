/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.Picker
 *
 * Provides type-safe picker interfaces for selecting specific types of TypeScript declarations.
 * This is used throughout the codebase to filter and process different kinds of AST nodes.
 */

import { Option, some, none } from 'fp-ts/Option';
import type {
  TsNamedDecl,
  TsNamedValueDecl,
  TsDeclVar,
  TsDeclClass,
  TsDeclInterface,
  TsDeclModule,
  TsDeclNamespace,
  TsDeclTypeAlias,
  TsDeclEnum
} from './trees.js';
import type { HasClassMembers } from './MemberCache.js';

/**
 * Generic picker interface for selecting specific types of declarations
 * @template T The type of declaration this picker can select
 */
export interface Picker<T extends TsNamedDecl> {
  /**
   * Attempts to pick/select a declaration if it matches this picker's criteria
   * @param decl The declaration to test
   * @returns Some(declaration) if it matches, None otherwise
   */
  pick(decl: TsNamedDecl): Option<T>;
}

/**
 * Collection of standard pickers for different declaration types
 */
export const Picker = {
  /**
   * Picker that matches any TsNamedDecl
   */
  All: {
    pick: (decl: TsNamedDecl): Option<TsNamedDecl> => {
      return some(decl);
    }
  } as Picker<TsNamedDecl>,

  /**
   * Picker that matches only TsDeclVar (variable declarations)
   */
  Vars: {
    pick: (decl: TsNamedDecl): Option<TsDeclVar> => {
      if (decl._tag === 'TsDeclVar') {
        return some(decl as TsDeclVar);
      }
      return none;
    }
  } as Picker<TsDeclVar>,

  /**
   * Picker that matches TsNamedValueDecl (declarations that introduce values, not just types)
   * Includes: classes, variables, enums, functions
   * Excludes: interfaces, type aliases (type-only declarations)
   */
  NamedValues: {
    pick: (decl: TsNamedDecl): Option<TsNamedValueDecl> => {
      // Check if the declaration is a value declaration
      if (decl._tag === 'TsDeclClass' ||
          decl._tag === 'TsDeclVar' ||
          decl._tag === 'TsDeclEnum' ||
          decl._tag === 'TsDeclFunction' ||
          decl._tag === 'TsDeclNamespace') {
        return some(decl as TsNamedValueDecl);
      }
      return none;
    }
  } as Picker<TsNamedValueDecl>,

  /**
   * Picker that matches all declarations except TsDeclModule
   */
  NotModules: {
    pick: (decl: TsNamedDecl | null): Option<TsNamedDecl> => {
      if (decl === null) {
        return none;
      }
      if (decl._tag === 'TsDeclModule') {
        return none;
      }
      return some(decl);
    }
  } as { pick: (decl: TsNamedDecl | null) => Option<TsNamedDecl> },

  /**
   * Picker that matches all declarations except TsDeclClass
   */
  NotClasses: {
    pick: (decl: TsNamedDecl | null): Option<TsNamedDecl> => {
      if (decl === null) {
        return none;
      }
      if (decl._tag === 'TsDeclClass') {
        return none;
      }
      return some(decl);
    }
  } as { pick: (decl: TsNamedDecl | null) => Option<TsNamedDecl> },

  /**
   * Picker that matches declarations with class members (classes and interfaces)
   */
  HasClassMemberss: {
    pick: (decl: TsNamedDecl): Option<TsNamedDecl & HasClassMembers> => {
      if (decl._tag === 'TsDeclClass' || decl._tag === 'TsDeclInterface') {
        return some(decl as TsNamedDecl & HasClassMembers);
      }
      return none;
    }
  } as Picker<TsNamedDecl & HasClassMembers>,

  /**
   * Picker that matches only TsDeclNamespace (namespace declarations)
   */
  Namespaces: {
    pick: (decl: TsNamedDecl): Option<TsDeclNamespace> => {
      if (decl._tag === 'TsDeclNamespace') {
        return some(decl as TsDeclNamespace);
      }
      return none;
    }
  } as Picker<TsDeclNamespace>,

  /**
   * Picker that matches type declarations (classes, interfaces, type aliases, enums)
   */
  Types: {
    pick: (decl: TsNamedDecl): Option<TsNamedDecl> => {
      if (decl._tag === 'TsDeclClass' ||
          decl._tag === 'TsDeclInterface' ||
          decl._tag === 'TsDeclTypeAlias' ||
          decl._tag === 'TsDeclEnum') {
        return some(decl);
      }
      return none;
    }
  } as Picker<TsNamedDecl>,

  /**
   * Creates a picker that excludes specific items from another picker's results
   * @param picker The base picker to filter
   * @param excludes The items to exclude
   * @returns A new picker that applies the base picker but excludes the specified items
   *
   * Note: This implementation has the same bug as the Scala version for consistency.
   * The logic `excludes.some(exclude => exclude !== decl)` should be
   * `!excludes.some(exclude => exclude === decl)` or `excludes.every(exclude => exclude !== decl)`
   */
  ButNot: <T extends TsNamedDecl>(picker: Picker<T>, ...excludes: T[]): Picker<T> => ({
    pick: (decl: TsNamedDecl): Option<T> => {
      const result = picker.pick(decl);
      if (result._tag === 'None') {
        return result;
      }

      // Bug: This logic is incorrect but matches the Scala implementation
      // It keeps items if ANY exclude is different from the item
      // Should be: !excludes.some(exclude => exclude === result.value)
      if (excludes.some(exclude => exclude !== result.value)) {
        return result;
      }

      return none;
    }
  })
};