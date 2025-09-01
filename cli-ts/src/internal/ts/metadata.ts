import { TsIdentLibrary, IArray } from '../../types/ts-ast.js';

/**
 * TypeScript compiler options configuration
 * Equivalent to Scala case class CompilerOptions
 */
export interface CompilerOptions {
  module?: string;
  lib?: IArray<string>;
  noImplicitAny?: boolean;
  noImplicitThis?: boolean;
  strictNullChecks?: boolean;
  baseUrl?: string; // Using string instead of os.RelPath for TypeScript
  typeRoots?: IArray<string>; // Using string instead of os.RelPath for TypeScript
  types?: IArray<string>;
  noEmit?: boolean;
  forceConsistentCasingInFileNames?: boolean;
}

/**
 * TypeScript configuration file structure
 * Equivalent to Scala case class TsConfig
 */
export interface TsConfig {
  compilerOptions?: CompilerOptions;
  files?: IArray<string>;
}

/**
 * Package.json distribution information
 * Equivalent to Scala case class PackageJson.Dist
 */
export interface PackageJsonDist {
  tarball: string;
}

/**
 * Package.json file structure
 * Equivalent to Scala case class PackageJson
 */
export interface PackageJson {
  version?: string;
  dependencies?: Map<TsIdentLibrary, string>;
  devDependencies?: Map<TsIdentLibrary, string>;
  peerDependencies?: Map<TsIdentLibrary, string>;
  typings?: any; // JSON type
  module?: any; // JSON type
  types?: any; // JSON type
  files?: IArray<string>;
  dist?: PackageJsonDist;
  exports?: any; // JSON type
}

/**
 * PackageJson utility functions and constants
 * Equivalent to Scala object PackageJson
 */
export namespace PackageJson {
  /**
   * Empty PackageJson instance
   * Equivalent to Scala val Empty: PackageJson
   */
  export const Empty: PackageJson = {};

  /**
   * Get all libraries from dependencies based on flags
   * Equivalent to Scala def allLibs(dev: Boolean, peer: Boolean): SortedMap[TsIdentLibrary, String]
   */
  export function allLibs(
    packageJson: PackageJson,
    dev: boolean,
    peer: boolean
  ): Map<TsIdentLibrary, string> {
    const maps: Map<TsIdentLibrary, string>[] = [];

    if (packageJson.dependencies) {
      maps.push(packageJson.dependencies);
    }

    if (dev && packageJson.devDependencies) {
      maps.push(packageJson.devDependencies);
    }

    if (peer && packageJson.peerDependencies) {
      maps.push(packageJson.peerDependencies);
    }

    // Merge all maps and sort by key
    const result = new Map<TsIdentLibrary, string>();
    for (const map of maps) {
      for (const [key, value] of map) {
        result.set(key, value);
      }
    }

    return new Map([...result.entries()].sort((a, b) => a[0].value.localeCompare(b[0].value)));
  }

  /**
   * Parse types field from JSON
   * Equivalent to Scala def parsedTypes: Option[IArray[String]]
   */
  export function parsedTypes(packageJson: PackageJson): IArray<string> | undefined {
    if (!packageJson.types) {
      return undefined;
    }

    const types = packageJson.types;

    if (types === null) {
      return IArray.Empty;
    } else if (typeof types === 'boolean') {
      throw new Error(`unexpected boolean in types structure: ${types}`);
    } else if (typeof types === 'number') {
      throw new Error(`unexpected number in types structure: ${types}`);
    } else if (typeof types === 'string') {
      return IArray.of(types);
    } else if (Array.isArray(types)) {
      const result = types
        .filter((item): item is string => typeof item === 'string');
      return result.length > 0 ? IArray.from(result) : undefined;
    } else {
      throw new Error(`unexpected object in types structure: ${types}`);
    }
  }

  /**
   * Parse typings field from JSON
   * Equivalent to Scala def parsedTypings: Option[IArray[String]]
   */
  export function parsedTypings(packageJson: PackageJson): IArray<string> | undefined {
    if (!packageJson.typings) {
      return undefined;
    }

    const typings = packageJson.typings;

    if (typings === null) {
      return IArray.Empty;
    } else if (typeof typings === 'boolean') {
      throw new Error(`unexpected boolean in typings structure: ${typings}`);
    } else if (typeof typings === 'number') {
      throw new Error(`unexpected number in typings structure: ${typings}`);
    } else if (typeof typings === 'string') {
      return IArray.of(typings);
    } else if (Array.isArray(typings)) {
      const result = typings
        .filter((item): item is string => typeof item === 'string');
      return result.length > 0 ? IArray.from(result) : undefined;
    } else {
      throw new Error(`unexpected object in typings structure: ${typings}`);
    }
  }

  /**
   * Parse module field from JSON
   * Equivalent to Scala def parsedModules: Option[Map[String, String]]
   */
  export function parsedModules(packageJson: PackageJson): Map<string, string> | undefined {
    if (!packageJson.module) {
      return undefined;
    }

    function look(json: any): Map<string, string> {
      if (json === null || json === undefined) {
        return new Map();
      } else if (typeof json === 'boolean' || typeof json === 'number') {
        return new Map();
      } else if (typeof json === 'string') {
        return new Map([['', json]]);
      } else if (Array.isArray(json)) {
        return new Map();
      } else if (typeof json === 'object') {
        const result = new Map<string, string>();
        for (const [name, value] of Object.entries(json)) {
          if (typeof value === 'string') {
            result.set(name, value);
          }
        }
        return result;
      }
      return new Map();
    }

    const result = look(packageJson.module);
    return result.size > 0 ? result : undefined;
  }

  /**
   * Parse exports field from JSON
   * Equivalent to Scala def parsedExported: Option[Map[String, String]]
   */
  export function parsedExported(packageJson: PackageJson): Map<string, string> | undefined {
    if (!packageJson.exports) {
      return undefined;
    }

    function look(json: any): Map<string, string> {
      if (json === null || json === undefined) {
        return new Map();
      } else if (typeof json === 'boolean' || typeof json === 'number' || typeof json === 'string') {
        return new Map();
      } else if (Array.isArray(json)) {
        // Merge results from all array elements
        const allMaps = json.map(look);
        const result = new Map<string, string>();
        for (const map of allMaps) {
          for (const [key, value] of map) {
            result.set(key, value);
          }
        }
        return result;
      } else if (typeof json === 'object') {
        const result = new Map<string, string>();
        for (const [name, value] of Object.entries(json)) {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const obj = value as Record<string, any>;
            if (obj.types && typeof obj.types === 'string') {
              result.set(name, obj.types);
            }
          }
        }
        return result;
      }
      return new Map();
    }

    const result = look(packageJson.exports);
    return result.size > 0 ? result : undefined;
  }
}

/**
 * Not needed package information
 * Equivalent to Scala case class NotNeededPackage
 */
export interface NotNeededPackage {
  libraryName: TsIdentLibrary;
  asOfVersion: string;
}

/**
 * Typings.json file structure
 * Equivalent to Scala case class TypingsJson
 */
export interface TypingsJson {
  name: string;
  main: string;
  files: IArray<string>;
  global: boolean;
}

/**
 * Collection of not needed packages
 * Equivalent to Scala case class NotNeededPackages
 */
export interface NotNeededPackages {
  packages: Map<string, NotNeededPackage>;
}

/**
 * NotNeededPackages utility functions
 * Equivalent to Scala object NotNeededPackages
 */
export namespace NotNeededPackages {
  /**
   * Parse NotNeededPackages from JSON with support for both old and new formats
   * Equivalent to Scala implicit val decodes: Decoder[NotNeededPackages]
   */
  export function fromJSON(json: any): NotNeededPackages {
    // Try old format first (direct object with packages field)
    if (json && typeof json === 'object' && json.packages && typeof json.packages === 'object') {
      return { packages: new Map(Object.entries(json.packages)) };
    }

    // Try new format (array of packages under packages field)
    if (json && typeof json === 'object' && json.packages && Array.isArray(json.packages)) {
      const packagesMap = new Map<string, NotNeededPackage>();
      for (const pkg of json.packages) {
        if (pkg && pkg.libraryName && pkg.libraryName.value) {
          packagesMap.set(pkg.libraryName.value, pkg);
        }
      }
      return { packages: packagesMap };
    }

    throw new Error(`Unable to parse NotNeededPackages from JSON: ${JSON.stringify(json)}`);
  }
}

/**
 * Utility functions for working with maps
 * Equivalent to Scala maps.smash function
 */
export function smash<K, V>(maps: IArray<Map<K, V>>): Map<K, V> {
  const result = new Map<K, V>();
  for (const map of maps) {
    for (const [key, value] of map) {
      result.set(key, value);
    }
  }
  return result;
}