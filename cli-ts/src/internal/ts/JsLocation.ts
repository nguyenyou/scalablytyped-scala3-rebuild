/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.JsLocation
 * 
 * Represents JavaScript location information for TypeScript declarations
 */

import { TsTree, TsIdent, TsQIdent, TsIdentModule } from './trees.js';
import { Option, some, none } from 'fp-ts/Option';

/**
 * Represents a module specification for JavaScript locations
 */
export interface ModuleSpec {
  readonly _tag: 'Namespaced' | 'Named';
  readonly path?: TsQIdent;
}

/**
 * Namespaced module specification
 */
export interface NamespacedModuleSpec extends ModuleSpec {
  readonly _tag: 'Namespaced';
}

/**
 * Named module specification
 */
export interface NamedModuleSpec extends ModuleSpec {
  readonly _tag: 'Named';
  readonly path: TsQIdent;
}

/**
 * Constructor functions for ModuleSpec
 */
export const ModuleSpec = {
  /**
   * Creates a namespaced module specification
   */
  namespaced: (): NamespacedModuleSpec => ({
    _tag: 'Namespaced'
  }),

  /**
   * Creates a named module specification
   */
  named: (path: TsQIdent): NamedModuleSpec => ({
    _tag: 'Named',
    path
  }),

  /**
   * Adds an identifier to a module specification
   */
  add: (spec: ModuleSpec, ident: TsIdent): ModuleSpec => {
    switch (spec._tag) {
      case 'Namespaced':
        return ModuleSpec.named(TsQIdent.single(ident));
      case 'Named':
        return ModuleSpec.named(TsQIdent.append(spec.path!, ident));
    }
  }
};

/**
 * Base interface for JavaScript locations
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
   * Adds an identifier to a location
   */
  add: (location: JsLocation, ident: TsIdent): JsLocation => {
    // Skip namespaced identifiers
    if (ident.value === '^') {
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
   * Navigates into a tree node
   */
  navigate: (location: JsLocation, tree: TsTree): JsLocation => {
    // This is a simplified version - the full implementation would need
    // access to all tree types which we'll implement in later phases
    return location;
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
 * Singleton instances
 */
export const JsLocationZero: JsLocationZero = JsLocation.zero();