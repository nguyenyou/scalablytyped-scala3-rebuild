/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.MemberCache
 *
 * Provides caching and organization of TypeScript container members
 */

import { IArray } from '../IArray.js';

// Use type imports to avoid circular dependencies
export type TsIdent = import('./trees.js').TsIdent;
export type TsIdentSimple = import('./trees.js').TsIdentSimple;
export type TsIdentModule = import('./trees.js').TsIdentModule;
export type TsContainerOrDecl = import('./trees.js').TsContainerOrDecl;
export type TsNamedDecl = import('./trees.js').TsNamedDecl;
export type TsExport = import('./trees.js').TsExport;
export type TsImport = import('./trees.js').TsImport;
export type TsDeclModule = import('./trees.js').TsDeclModule;
export type TsAugmentedModule = import('./trees.js').TsAugmentedModule;

export interface TsImportee {
  readonly _tag: string;
}

export interface TsImporteeLocal extends TsImportee {
  readonly _tag: 'Local';
}

/**
 * Trait for containers that cache member information for efficient access
 */
export interface MemberCache {
  readonly members: IArray<TsContainerOrDecl>;
  
  /**
   * Cached partitioned members
   */
  readonly nameds: IArray<TsNamedDecl>;
  readonly exports: IArray<TsExport>;
  readonly imports: IArray<TsImport>;
  readonly unnamed: IArray<TsContainerOrDecl>;
  
  /**
   * Whether this container represents a module (has exports or non-local imports)
   */
  readonly isModule: boolean;
  
  /**
   * Members grouped by name
   */
  readonly membersByName: Map<TsIdent, IArray<TsNamedDecl>>;
  
  /**
   * Module declarations by name
   */
  readonly modules: Map<TsIdentModule, TsDeclModule>;
  
  /**
   * Augmented modules
   */
  readonly augmentedModules: IArray<TsAugmentedModule>;
  
  /**
   * Augmented modules grouped by name
   */
  readonly augmentedModulesMap: Map<TsIdentModule, IArray<TsAugmentedModule>>;
}

/**
 * Implementation of MemberCache functionality
 */
export const MemberCache = {
  /**
   * Creates a MemberCache implementation for a container
   */
  create: (members: IArray<TsContainerOrDecl>): MemberCache => {
    // Partition members into different categories
    const nameds: TsNamedDecl[] = [];
    const exports: TsExport[] = [];
    const imports: TsImport[] = [];
    const unnamed: TsContainerOrDecl[] = [];
    
    members.forEach(member => {
      switch (member._tag) {
        case 'TsExport':
          exports.push(member as TsExport);
          break;
        case 'TsImport':
          imports.push(member as TsImport);
          break;
        default:
          if ('name' in member) {
            nameds.push(member as TsNamedDecl);
          } else {
            unnamed.push(member);
          }
      }
    });
    
    const namedsArray = IArray.fromArray(nameds);
    const exportsArray = IArray.fromArray(exports);
    const importsArray = IArray.fromArray(imports);
    const unnamedArray = IArray.fromArray(unnamed);
    
    // Check if this is a module
    const isModule = exportsArray.length > 0 || importsArray.toArray().some(imp => {
      // This is a simplified check - full implementation would check TsImportee.Local
      return true; // For now, assume all imports make it a module
    });
    
    // Group members by name
    const membersByName = new Map<TsIdent, IArray<TsNamedDecl>>();
    nameds.forEach(named => {
      const existing = membersByName.get(named.name) || IArray.Empty;
      membersByName.set(named.name, (existing as IArray<any>).append(named));
    });
    
    // Extract modules
    const modules = new Map<TsIdentModule, TsDeclModule>();
    const augmentedModules: TsAugmentedModule[] = [];
    const augmentedModulesMap = new Map<TsIdentModule, IArray<TsAugmentedModule>>();
    
    nameds.forEach(named => {
      if (named._tag === 'TsDeclModule') {
        const module = named as TsDeclModule;
        modules.set(module.name, module);
        // Add augmented modules from this module
        module.augmentedModules.forEach(aug => {
          augmentedModules.push(aug);
        });
      } else if (named._tag === 'TsAugmentedModule') {
        const augModule = named as TsAugmentedModule;
        augmentedModules.push(augModule);
        const existing = augmentedModulesMap.get(augModule.name) || IArray.Empty;
        augmentedModulesMap.set(augModule.name, (existing as IArray<any>).append(augModule));
      }
    });
    
    return {
      members,
      nameds: namedsArray,
      exports: exportsArray,
      imports: importsArray,
      unnamed: unnamedArray,
      isModule,
      membersByName,
      modules,
      augmentedModules: IArray.fromArray(augmentedModules),
      augmentedModulesMap
    };
  }
};

// Use type imports for member types to avoid circular dependencies
export type TsMember = import('./trees.js').TsMember;
export type TsMemberCall = import('./trees.js').TsMemberCall;
export type TsMemberFunction = import('./trees.js').TsMemberFunction;
export type TsMemberProperty = import('./trees.js').TsMemberProperty;
export type TsMemberCtor = import('./trees.js').TsMemberCtor;

/**
 * Trait for classes that have members with caching
 */
export interface HasClassMembers {
  readonly members: IArray<TsMember>;
  readonly membersByName: Map<TsIdentSimple, IArray<TsMember>>;
  readonly unnamed: IArray<TsMember>;
}

/**
 * Implementation of HasClassMembers functionality
 */
export const HasClassMembers = {
  /**
   * Creates a HasClassMembers implementation
   */
  create: (members: IArray<TsMember>): HasClassMembers => {
    const named: TsMember[] = [];
    const unnamed: TsMember[] = [];
    
    members.forEach(member => {
      switch (member._tag) {
        case 'TsMemberCall':
        case 'TsMemberFunction':
        case 'TsMemberProperty':
        case 'TsMemberCtor':
          named.push(member);
          break;
        default:
          unnamed.push(member);
      }
    });
    
    // Group by name
    const membersByName = new Map<TsIdentSimple, IArray<TsMember>>();
    named.forEach(member => {
      let name: TsIdentSimple;
      switch (member._tag) {
        case 'TsMemberFunction':
          name = (member as TsMemberFunction).name;
          break;
        case 'TsMemberProperty':
          name = (member as TsMemberProperty).name;
          break;
        case 'TsMemberCall':
          name = { _tag: 'TsIdentSimple', value: '<apply>', asString: 'TsIdentSimple(<apply>)' } as TsIdentSimple;
          break;
        case 'TsMemberCtor':
          name = { _tag: 'TsIdentSimple', value: 'constructor', asString: 'TsIdentSimple(constructor)' } as TsIdentSimple;
          break;
        default:
          return; // Skip unknown types
      }
      
      const existing = membersByName.get(name) || IArray.Empty;
      membersByName.set(name, (existing as IArray<any>).append(member));
    });
    
    return {
      members,
      membersByName,
      unnamed: IArray.fromArray(unnamed)
    };
  }
};