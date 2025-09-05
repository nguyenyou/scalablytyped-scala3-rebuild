/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.JsLocation
 * 
 * Represents JavaScript location information for TypeScript declarations
 */

import { TsTree, TsIdent, TsQIdent, TsIdentModule, TsNamedDecl, TsDeclModule, TsAugmentedModule, TsGlobal } from './trees.js';
import { IArray } from '../IArray.js';
import { Option, some, none } from 'fp-ts/Option';
import {DefaultedModuleSpec, ModuleSpec} from "@/internal/ts/ModuleSpec.ts";

/**
 * Base interface for JavaScript locations
 * Port of org.scalablytyped.converter.internal.ts.JsLocation
 */
export interface JsLocation {
  readonly _tag: 'Zero' | 'Global' | 'Module' | 'Both';
}

/**
 * Zero location - no specific location
 */
export interface JsLocationZero extends JsLocation {
  readonly _tag: 'Zero';
}

/**
 * Global location - accessible globally
 */
export interface JsLocationGlobal extends JsLocation {
  readonly _tag: 'Global';
  readonly jsPath: TsQIdent;
}

/**
 * Module location - accessible within a module
 */
export interface JsLocationModule extends JsLocation {
  readonly _tag: 'Module';
  readonly module: TsIdentModule;
  readonly spec: ModuleSpec;
}

/**
 * Both location - accessible both globally and within a module
 */
export interface JsLocationBoth extends JsLocation {
  readonly _tag: 'Both';
  readonly module: JsLocationModule;
  readonly global: JsLocationGlobal;
}

/**
 * Constructor functions and utilities for JsLocation
 */
export const JsLocation = {
  /**
   * Creates a zero location
   */
  zero: (): JsLocationZero => ({
    _tag: 'Zero'
  }),

  /**
   * Creates a global location
   */
  global: (jsPath: TsQIdent): JsLocationGlobal => ({
    _tag: 'Global',
    jsPath
  }),

  /**
   * Creates a module location
   */
  module: (module: TsIdentModule, spec: ModuleSpec): JsLocationModule => ({
    _tag: 'Module',
    module,
    spec
  }),

  /**
   * Creates a both location
   */
  both: (module: JsLocationModule, global: JsLocationGlobal): JsLocationBoth => ({
    _tag: 'Both',
    module,
    global
  }),

  /**
   * Adds an identifier to a location (+ operator)
   */
  add: (location: JsLocation, ident: TsIdent): JsLocation => {
    // Skip namespaced identifiers
    if (TsIdent.isNamespaced(ident)) {
      return location;
    }

    switch (location._tag) {
      case 'Zero':
        return JsLocation.zero();
      case 'Global':
        const globalLoc = location as JsLocationGlobal;
        return JsLocation.global(TsQIdent.append(globalLoc.jsPath, ident));
      case 'Module':
        const moduleLoc = location as JsLocationModule;
        return JsLocation.module(moduleLoc.module, ModuleSpec.add(moduleLoc.spec, ident));
      case 'Both':
        const bothLoc = location as JsLocationBoth;
        const newModule = JsLocation.add(bothLoc.module, ident) as JsLocationModule;
        const newGlobal = JsLocation.add(bothLoc.global, ident) as JsLocationGlobal;
        return JsLocation.both(newModule, newGlobal);
    }
  },

  /**
   * Navigates into a tree node (/ operator)
   */
  navigate: (location: JsLocation, tree: TsTree): JsLocation => {
    switch (location._tag) {
      case 'Zero':
        return JsLocation.navigateZero(tree);
      case 'Global':
        return JsLocation.navigateGlobal(location as JsLocationGlobal, tree);
      case 'Module':
        return JsLocation.navigateModule(location as JsLocationModule, tree);
      case 'Both':
        return JsLocation.navigateBoth(location as JsLocationBoth, tree);
    }
  },

  /**
   * Navigation for Zero location
   */
  navigateZero: (tree: TsTree): JsLocation => {
    if (TsDeclModule.isModule(tree)) {
      const module = tree as TsDeclModule;
      return JsLocation.module(module.name, ModuleSpec.namespaced());
    } else if (TsAugmentedModule.isAugmentedModule(tree)) {
      const augModule = tree as TsAugmentedModule;
      return JsLocation.module(augModule.name, ModuleSpec.namespaced());
    } else if (TsTree.isNamedDecl(tree)) {
      const namedDecl = tree as TsNamedDecl;
      if (!TsIdent.isNamespaced(namedDecl.name)) {
        return JsLocation.global(TsQIdent.of(namedDecl.name));
      }
    } else if (TsGlobal.isGlobal(tree)) {
      return JsLocation.zero();
    }
    return JsLocation.zero();
  },

  /**
   * Navigation for Global location
   */
  navigateGlobal: (location: JsLocationGlobal, tree: TsTree): JsLocation => {
    if (TsDeclModule.isModule(tree)) {
      const module = tree as TsDeclModule;
      return JsLocation.module(module.name, ModuleSpec.namespaced());
    } else if (TsAugmentedModule.isAugmentedModule(tree)) {
      const augModule = tree as TsAugmentedModule;
      return JsLocation.module(augModule.name, ModuleSpec.namespaced());
    } else if (TsTree.isNamedDecl(tree)) {
      const namedDecl = tree as TsNamedDecl;
      if (!TsIdent.isNamespaced(namedDecl.name)) {
        return JsLocation.global(TsQIdent.append(location.jsPath, namedDecl.name));
      }
    } else if (TsGlobal.isGlobal(tree)) {
      return JsLocation.zero();
    }
    return location;
  },

  /**
   * Navigation for Module location
   */
  navigateModule: (location: JsLocationModule, tree: TsTree): JsLocationModule => {
    if (TsDeclModule.isModule(tree)) {
      const module = tree as TsDeclModule;
      return JsLocation.module(module.name, ModuleSpec.namespaced()) as JsLocationModule;
    } else if (TsAugmentedModule.isAugmentedModule(tree)) {
      const augModule = tree as TsAugmentedModule;
      return JsLocation.module(augModule.name, ModuleSpec.namespaced()) as JsLocationModule;
    } else if (TsTree.isNamedDecl(tree)) {
      const namedDecl = tree as TsNamedDecl;
      return JsLocation.module(location.module, ModuleSpec.add(location.spec, namedDecl.name)) as JsLocationModule;
    }
    return location;
  },

  /**
   * Navigation for Both location
   */
  navigateBoth: (location: JsLocationBoth, tree: TsTree): JsLocation => {
    const globalResult = JsLocation.navigateGlobal(location.global, tree);
    if (JsLocation.isGlobal(globalResult)) {
      const moduleResult = JsLocation.navigateModule(location.module, tree);
      return JsLocation.both(moduleResult, globalResult);
    } else {
      return globalResult;
    }
  },

  /**
   * Type guards
   */
  isZero: (location: JsLocation): location is JsLocationZero => location._tag === 'Zero',
  isGlobal: (location: JsLocation): location is JsLocationGlobal => location._tag === 'Global',
  isModule: (location: JsLocation): location is JsLocationModule => location._tag === 'Module',
  isBoth: (location: JsLocation): location is JsLocationBoth => location._tag === 'Both'
};

/**
 * Trait for objects that have a JavaScript location
 */
export interface HasJsLocation {
  readonly jsLocation: JsLocation;
  withJsLocation(newLocation: JsLocation): HasJsLocation;
}

/**
 * JsLocation.Has trait - equivalent to Scala's JsLocation.Has
 */
export interface JsLocationHas {
  readonly jsLocation: JsLocation;
  withJsLocation(newLocation: JsLocation): JsLocationHas;
}

/**
 * Singleton instances
 */
export const JsLocationZero: JsLocationZero = JsLocation.zero();