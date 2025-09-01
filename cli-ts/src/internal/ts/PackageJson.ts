import { IArray } from '../IArray.js';
import { TsIdentLibrary } from './trees.js';

// JSON utility type for flexible JSON values
type Json = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject { [key: string]: Json; }
interface JsonArray extends Array<Json> {}

// Utility function to create JSON values
export const Json = {
  fromString: (value: string): Json => value,
  fromNumber: (value: number): Json => value,
  fromBoolean: (value: boolean): Json => value,
  fromNull: (): Json => null,
  obj: (obj: { [key: string]: Json }): Json => obj,
  arr: (...values: Json[]): Json => values,
  
  // JSON parsing utilities
  apply: <T>(jsonStr: string): { success: true; value: T } | { success: false; error: string } => {
    try {
      const parsed = JSON.parse(jsonStr);
      return { success: true, value: parsed };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown parsing error' };
    }
  },
  
  // JSON folding utility (similar to Scala's Json.fold)
  fold: <T>(
    json: Json,
    onNull: () => T,
    onBoolean: (b: boolean) => T,
    onNumber: (n: number) => T,
    onString: (s: string) => T,
    onArray: (arr: JsonArray) => T,
    onObject: (obj: JsonObject) => T
  ): T => {
    if (json === null) return onNull();
    if (typeof json === 'boolean') return onBoolean(json);
    if (typeof json === 'number') return onNumber(json);
    if (typeof json === 'string') return onString(json);
    if (Array.isArray(json)) return onArray(json);
    if (typeof json === 'object') return onObject(json as JsonObject);
    throw new Error(`Unexpected JSON type: ${typeof json}`);
  }
};

// Maps utility functions
const maps = {
  smash: <K, V>(ms: IArray<Map<K, V>>): Map<K, V> => {
    return ms.foldLeft(new Map<K, V>(), (acc, current) => {
      for (const [k, v] of current) {
        acc.set(k, v);
      }
      return acc;
    });
  }
};

// Convert Map to SortedMap equivalent using entries sorted by key
function toSorted<K, V>(map: Map<K, V>): Map<K, V> {
  const sortedEntries = Array.from(map.entries()).sort(([a], [b]) => {
    const aStr = (a as any).value || String(a);
    const bStr = (b as any).value || String(b);
    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
  });
  return new Map(sortedEntries);
}

// Helper function to find TsIdentLibrary in Map by value comparison
function findLibraryInMap<V>(map: Map<TsIdentLibrary, V>, targetLib: TsIdentLibrary): [TsIdentLibrary, V] | undefined {
  for (const [lib, value] of map) {
    if (lib.value === targetLib.value) {
      return [lib, value];
    }
  }
  return undefined;
}

// Helper function to check if Map contains TsIdentLibrary by value comparison
function mapHasLibrary(map: Map<TsIdentLibrary, any>, targetLib: TsIdentLibrary): boolean {
  for (const lib of map.keys()) {
    if (lib.value === targetLib.value) {
      return true;
    }
  }
  return false;
}

// Helper function to get value from Map using TsIdentLibrary value comparison
function mapGetLibrary<V>(map: Map<TsIdentLibrary, V>, targetLib: TsIdentLibrary): V | undefined {
  const entry = findLibraryInMap(map, targetLib);
  return entry ? entry[1] : undefined;
}

export interface CompilerOptions {
  module?: string;
  lib?: IArray<string>;
  noImplicitAny?: boolean;
  noImplicitThis?: boolean;
  strictNullChecks?: boolean;
  baseUrl?: string; // Note: RelPath equivalent would need more complex implementation
  typeRoots?: IArray<string>; // Note: RelPath equivalent would need more complex implementation
  types?: IArray<string>;
  noEmit?: boolean;
  forceConsistentCasingInFileNames?: boolean;
}

export interface TsConfig {
  compilerOptions?: CompilerOptions;
  files?: IArray<string>;
}

export interface PackageJsonDist {
  tarball: string;
}

class PackageJson {
  constructor(
    public readonly version?: string,
    public readonly dependencies?: Map<TsIdentLibrary, string>,
    public readonly devDependencies?: Map<TsIdentLibrary, string>,
    public readonly peerDependencies?: Map<TsIdentLibrary, string>,
    public readonly typings?: Json,
    public readonly module?: Json,
    public readonly types?: Json,
    public readonly files?: IArray<string>,
    public readonly dist?: PackageJsonDist,
    public readonly exports?: Json
  ) {}

  allLibs(dev: boolean, peer: boolean): Map<TsIdentLibrary, string> {
    const deps: IArray<Map<TsIdentLibrary, string>> = IArray.fromOptions(
      this.dependencies,
      dev ? this.devDependencies : undefined,
      peer ? this.peerDependencies : undefined
    );
    return toSorted(maps.smash(deps));
  }

  get parsedTypes(): IArray<string> | undefined {
    if (!this.types) return undefined;
    
    const result = Json.fold(
      this.types,
      () => IArray.Empty as IArray<string>,
      (_) => { throw new Error(`unexpected boolean in types structure: ${JSON.stringify(this.types)}`); },
      (_) => { throw new Error(`unexpected number in types structure: ${JSON.stringify(this.types)}`); },
      (str) => IArray.apply(str),
      (arr) => IArray.fromTraversable(arr).mapNotNone(item => 
        typeof item === 'string' ? item : undefined
      ),
      (_) => { throw new Error(`unexpected object in types structure: ${JSON.stringify(this.types)}`); }
    );
    
    return result.nonEmpty ? result : undefined;
  }

  get parsedTypings(): IArray<string> | undefined {
    if (!this.typings) return undefined;
    
    const result = Json.fold(
      this.typings,
      () => IArray.Empty as IArray<string>,
      (_) => { throw new Error(`unexpected boolean in typings structure: ${JSON.stringify(this.typings)}`); },
      (_) => { throw new Error(`unexpected number in typings structure: ${JSON.stringify(this.typings)}`); },
      (str) => IArray.apply(str),
      (arr) => IArray.fromTraversable(arr).mapNotNone(item => 
        typeof item === 'string' ? item : undefined
      ),
      (_) => { throw new Error(`unexpected object in typings structure: ${JSON.stringify(this.typings)}`); }
    );
    
    return result.nonEmpty ? result : undefined;
  }

  get parsedModules(): Map<string, string> | undefined {
    if (!this.module) return undefined;
    
    const look = (json: Json): Map<string, string> => {
      return Json.fold(
        json,
        () => new Map(),
        (_) => new Map(),
        (_) => new Map(),
        (str) => new Map([['', str]]),
        (_) => new Map(),
        (obj) => {
          const result = new Map<string, string>();
          for (const [name, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
              result.set(name, value);
            }
          }
          return result;
        }
      );
    };
    
    const result = look(this.module);
    return result.size > 0 ? result : undefined;
  }

  // this is an impossibly flexibly defined structure, so we're maximally flexible in this parse step
  // we only extract the `types` information for now
  get parsedExported(): Map<string, string> | undefined {
    if (!this.exports) return undefined;
    
    const look = (json: Json): Map<string, string> => {
      return Json.fold(
        json,
        () => new Map(),
        (_) => new Map(),
        (_) => new Map(),
        (_) => new Map(),
        (values) => {
          const maps = values.map(look);
          return maps.reduce((acc, current) => {
            for (const [k, v] of current) {
              acc.set(k, v);
            }
            return acc;
          }, new Map<string, string>());
        },
        (obj) => {
          const result = new Map<string, string>();
          for (const [name, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              const types = (value as JsonObject).types;
              if (typeof types === 'string') {
                result.set(name, types);
              }
            }
          }
          return result;
        }
      );
    };
    
    const result = look(this.exports);
    return result.size > 0 ? result : undefined;
  }

  static readonly Empty = new PackageJson();

  // JSON serialization/deserialization methods
  static fromJson(jsonStr: string): PackageJson | Error {
    const parseResult = Json.apply<any>(jsonStr);
    if (!parseResult.success) {
      return new Error(parseResult.error);
    }
    
    try {
      return PackageJson.fromObject(parseResult.value);
    } catch (error) {
      return error instanceof Error ? error : new Error('Unknown deserialization error');
    }
  }
  
  static fromObject(obj: any): PackageJson {
    const parseDependencies = (deps: any): Map<TsIdentLibrary, string> | undefined => {
      if (!deps || typeof deps !== 'object') return undefined;
      const result = new Map<TsIdentLibrary, string>();
      for (const [key, value] of Object.entries(deps)) {
        if (typeof value === 'string') {
          result.set(TsIdentLibrary.construct(key), value);
        }
      }
      return result.size > 0 ? result : undefined;
    };
    
    const parseFiles = (files: any): IArray<string> | undefined => {
      if (!files) return undefined;
      if (Array.isArray(files)) {
        const stringFiles = files.filter((f): f is string => typeof f === 'string');
        return IArray.fromArray(stringFiles);
      }
      return undefined;
    };
    
    const parseDist = (dist: any): PackageJsonDist | undefined => {
      if (!dist || typeof dist !== 'object') return undefined;
      if (typeof dist.tarball === 'string') {
        return { tarball: dist.tarball };
      }
      return undefined;
    };
    
    return new PackageJson(
      typeof obj.version === 'string' ? obj.version : undefined,
      parseDependencies(obj.dependencies),
      parseDependencies(obj.devDependencies),
      parseDependencies(obj.peerDependencies),
      obj.typings !== undefined ? obj.typings : undefined,
      obj.module !== undefined ? obj.module : undefined,
      obj.types !== undefined ? obj.types : undefined,
      parseFiles(obj.files),
      parseDist(obj.dist),
      obj.exports !== undefined ? obj.exports : undefined
    );
  }
  
  toObject(): any {
    const serializeDependencies = (deps?: Map<TsIdentLibrary, string>): any => {
      if (!deps) return undefined;
      const result: any = {};
      for (const [lib, version] of deps) {
        result[lib.value] = version;
      }
      return Object.keys(result).length > 0 ? result : undefined;
    };
    
    const serializeFiles = (files?: IArray<string>): any => {
      if (!files) return undefined;
      return files.toArray();
    };
    
    return {
      ...(this.version !== undefined && { version: this.version }),
      ...(this.dependencies && { dependencies: serializeDependencies(this.dependencies) }),
      ...(this.devDependencies && { devDependencies: serializeDependencies(this.devDependencies) }),
      ...(this.peerDependencies && { peerDependencies: serializeDependencies(this.peerDependencies) }),
      ...(this.typings !== undefined && { typings: this.typings }),
      ...(this.module !== undefined && { module: this.module }),
      ...(this.types !== undefined && { types: this.types }),
      ...(this.files && { files: serializeFiles(this.files) }),
      ...(this.dist && { dist: this.dist }),
      ...(this.exports !== undefined && { exports: this.exports })
    };
  }
  
  toJson(): string {
    return JSON.stringify(this.toObject());
  }
}

export { PackageJson };