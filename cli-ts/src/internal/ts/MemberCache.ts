/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.MemberCache
 *
 * Provides caching functionality for TypeScript AST members, including
 * partitioning members by type, grouping by name, and module detection.
 */

import { Option, some, none, isSome } from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { IArray, PartialFunction, partialFunction } from '../IArray.js';

// Import actual types from trees.ts to avoid conflicts
import type {
  TsContainerOrDecl,
  TsNamedDecl,
  TsExport,
  TsImport,
  TsImportee,
  TsImporteeLocal,
  TsIdent,
  TsIdentSimple,
  TsIdentModule,
  TsDeclModule,
  TsAugmentedModule,
  TsMember,
  TsMemberCall,
  TsMemberFunction,
  TsMemberProperty,
  TsMemberCtor
} from './trees.js';

// Import special identifier constants
import {
  TsIdentApply,
  TsIdentConstructor
} from './trees.js';

/**
 * Main interface for member caching functionality.
 * Provides lazy computed properties for partitioning and organizing TypeScript AST members.
 */
export interface MemberCache {
  /**
   * All members contained in this cache
   */
  readonly members: IArray<TsContainerOrDecl>;

  /**
   * Named declarations (classes, interfaces, functions, etc.)
   */
  readonly nameds: IArray<TsNamedDecl>;

  /**
   * Export declarations
   */
  readonly exports: IArray<TsExport>;

  /**
   * Import declarations
   */
  readonly imports: IArray<TsImport>;

  /**
   * Unnamed/unclassified members
   */
  readonly unnamed: IArray<TsContainerOrDecl>;

  /**
   * Whether this represents a module (has exports or non-local imports)
   */
  readonly isModule: boolean;

  /**
   * Named declarations grouped by their identifier
   */
  readonly membersByName: Map<TsIdent, IArray<TsNamedDecl>>;

  /**
   * Module declarations mapped by their module identifier
   */
  readonly modules: Map<TsIdentModule, TsDeclModule>;

  /**
   * All augmented modules (including nested ones from regular modules)
   */
  readonly augmentedModules: IArray<TsAugmentedModule>;

  /**
   * Augmented modules grouped by their module identifier
   */
  readonly augmentedModulesMap: Map<TsIdentModule, IArray<TsAugmentedModule>>;
}

/**
 * Interface for caching class/interface members.
 * Provides functionality for organizing members within classes and interfaces.
 */
export interface HasClassMembers {
  /**
   * All members of this class/interface
   */
  readonly members: IArray<TsMember>;

  /**
   * Named members grouped by their identifier
   */
  readonly membersByName: Map<TsIdentSimple, IArray<TsMember>>;

  /**
   * Unnamed members (those without explicit names)
   */
  readonly unnamed: IArray<TsMember>;
}

/**
 * Implementation functions for MemberCache
 */
export const MemberCache = {
  /**
   * Creates a MemberCache from an array of members
   */
  create: (members: IArray<TsContainerOrDecl>): MemberCache => {
    // Partition members into named declarations, exports, imports, and unnamed
    const [nameds, exports, imports, unnamed] = members.partitionCollect3(
      partialFunction(
        (m: TsContainerOrDecl): m is TsNamedDecl =>
          m._tag === 'TsDeclClass' ||
          m._tag === 'TsDeclInterface' ||
          m._tag === 'TsDeclEnum' ||
          m._tag === 'TsDeclFunction' ||
          m._tag === 'TsDeclVar' ||
          m._tag === 'TsDeclTypeAlias' ||
          m._tag === 'TsDeclNamespace' ||
          m._tag === 'TsDeclModule' ||
          m._tag === 'TsAugmentedModule',
        (m: TsContainerOrDecl) => m as TsNamedDecl
      ),
      partialFunction(
        (m: TsContainerOrDecl): m is TsExport => m._tag === 'TsExport',
        (m: TsContainerOrDecl) => m as TsExport
      ),
      partialFunction(
        (m: TsContainerOrDecl): m is TsImport => m._tag === 'TsImport',
        (m: TsContainerOrDecl) => m as TsImport
      )
    );

    // Determine if this is a module
    const isModule = exports.nonEmpty || imports.exists(imp =>
      imp.from._tag !== 'TsImporteeLocal'
    );

    // Group named declarations by name (using string keys for proper grouping)
    const membersByNameMap = new Map<string, IArray<TsNamedDecl>>();
    for (const named of nameds.array) {
      // Check if the named declaration has a name property
      if (!named || !('name' in named) || !named.name) {
        continue;
      }
      const key = named.name.value;
      const existing = membersByNameMap.get(key);
      if (existing) {
        membersByNameMap.set(key, existing.append(named));
      } else {
        membersByNameMap.set(key, IArray.fromArray([named]));
      }
    }

    // Convert back to Map<TsIdent, IArray<TsNamedDecl>>
    const membersByName = new Map<TsIdent, IArray<TsNamedDecl>>();
    for (const [key, members] of membersByNameMap) {
      // Use the first member's name as the key to preserve the original TsIdent object
      membersByName.set(members.head.name, members);
    }

    // Extract modules from named declarations
    const modulesBase = nameds.collect(partialFunction(
      (m: TsNamedDecl): m is TsDeclModule => m._tag === 'TsDeclModule',
      (m: TsNamedDecl) => [m.name, m as TsDeclModule] as [TsIdentModule, TsDeclModule]
    ));
    const modules = modulesBase.toMap();

    // Extract augmented modules
    const directAugmented = nameds.collect(partialFunction(
      (m: TsNamedDecl): m is TsAugmentedModule => m._tag === 'TsAugmentedModule',
      (m: TsNamedDecl) => m as TsAugmentedModule
    ));

    // For now, we'll just use direct augmented modules
    // In the full implementation, we'd also extract from module.augmentedModules
    const augmentedModules = directAugmented;

    // Group augmented modules by name (using string keys for proper grouping)
    const augmentedModulesStringMap = new Map<string, IArray<TsAugmentedModule>>();
    for (const aug of augmentedModules.array) {
      // Check if the augmented module has a name property
      if (!aug || !('name' in aug) || !aug.name) {
        continue;
      }
      const key = aug.name.value;
      const existing = augmentedModulesStringMap.get(key);
      if (existing) {
        augmentedModulesStringMap.set(key, existing.append(aug));
      } else {
        augmentedModulesStringMap.set(key, IArray.fromArray([aug]));
      }
    }

    // Convert back to Map<TsIdentModule, IArray<TsAugmentedModule>>
    const augmentedModulesMap = new Map<TsIdentModule, IArray<TsAugmentedModule>>();
    for (const [key, modules] of augmentedModulesStringMap) {
      // Use the first module's name as the key to preserve the original TsIdentModule object
      augmentedModulesMap.set(modules.head.name, modules);
    }

    return {
      members,
      nameds,
      exports,
      imports,
      unnamed,
      isModule,
      membersByName,
      modules,
      augmentedModules,
      augmentedModulesMap
    };
  }
};

/**
 * Implementation functions for HasClassMembers
 */
export const HasClassMembers = {
  /**
   * Creates a HasClassMembers from an array of members
   */
  create: (members: IArray<TsMember>): HasClassMembers => {
    // Partition members into named and unnamed
    const [named, unnamed] = members.partitionCollect(
      partialFunction(
        (m: TsMember): boolean =>
          m._tag === 'TsMemberCall' ||
          m._tag === 'TsMemberFunction' ||
          m._tag === 'TsMemberProperty' ||
          m._tag === 'TsMemberCtor',
        (m: TsMember) => m
      )
    );

    // Group named members by their identifier (using string keys for proper grouping)
    const membersByNameStringMap = new Map<string, IArray<TsMember>>();
    const keyToIdent = new Map<string, TsIdentSimple>();

    for (const member of named.array) {
      let keyString: string;
      let ident: TsIdentSimple;

      switch (member._tag) {
        case 'TsMemberFunction':
          ident = (member as TsMemberFunction).name;
          keyString = ident.value;
          break;
        case 'TsMemberProperty':
          ident = (member as TsMemberProperty).name;
          keyString = ident.value;
          break;
        case 'TsMemberCall':
          // Use special Apply identifier for call signatures
          keyString = TsIdentApply.value;
          ident = TsIdentApply;
          break;
        case 'TsMemberCtor':
          // Use special constructor identifier
          keyString = TsIdentConstructor.value;
          ident = TsIdentConstructor;
          break;
        default:
          throw new Error(`Unexpected member type: ${member._tag}`);
      }

      // Store the first ident for this key
      if (!keyToIdent.has(keyString)) {
        keyToIdent.set(keyString, ident);
      }

      const existing = membersByNameStringMap.get(keyString);
      if (existing) {
        membersByNameStringMap.set(keyString, existing.append(member));
      } else {
        membersByNameStringMap.set(keyString, IArray.fromArray([member]));
      }
    }

    // Convert back to Map<TsIdentSimple, IArray<TsMember>>
    const membersByName = new Map<TsIdentSimple, IArray<TsMember>>();
    for (const [keyString, members] of membersByNameStringMap) {
      const ident = keyToIdent.get(keyString)!;
      membersByName.set(ident, members);
    }

    return {
      members,
      membersByName,
      unnamed
    };
  }
};