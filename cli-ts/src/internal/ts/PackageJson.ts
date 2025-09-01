import { IArray } from '../IArray.js';
import { TsIdentLibrary } from './trees.js';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

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
  
  // JSON parsing utilities with fp-ts Either
  apply: <T>(jsonStr: string): E.Either<string, T> =>
    E.tryCatch(
      () => JSON.parse(jsonStr),
      (error) => error instanceof Error ? error.message : 'Unknown parsing error'
    ),
  
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
    version?: string,
    dependencies?: Map<TsIdentLibrary, string>,
    devDependencies?: Map<TsIdentLibrary, string>,
    peerDependencies?: Map<TsIdentLibrary, string>,
    typings?: Json,
    module?: Json,
    types?: Json,
    files?: IArray<string>,
    dist?: PackageJsonDist,
    exports?: Json
  ) {
    this._version = O.fromNullable(version);
    this._dependencies = O.fromNullable(dependencies);
    this._devDependencies = O.fromNullable(devDependencies);
    this._peerDependencies = O.fromNullable(peerDependencies);
    // For JSON fields, preserve null as a valid value, only convert undefined to None
    this._typings = typings === undefined ? O.none : O.some(typings);
    this._module = module === undefined ? O.none : O.some(module);
    this._types = types === undefined ? O.none : O.some(types);
    this._files = O.fromNullable(files);
    this._dist = O.fromNullable(dist);
    this._exports = exports === undefined ? O.none : O.some(exports);
  }

  private readonly _version: O.Option<string>;
  private readonly _dependencies: O.Option<Map<TsIdentLibrary, string>>;
  private readonly _devDependencies: O.Option<Map<TsIdentLibrary, string>>;
  private readonly _peerDependencies: O.Option<Map<TsIdentLibrary, string>>;
  private readonly _typings: O.Option<Json>;
  private readonly _module: O.Option<Json>;
  private readonly _types: O.Option<Json>;
  private readonly _files: O.Option<IArray<string>>;
  private readonly _dist: O.Option<PackageJsonDist>;
  private readonly _exports: O.Option<Json>;

  // Backward compatibility getters that return undefined for None
  get version(): string | undefined {
    return O.toUndefined(this._version);
  }

  get dependencies(): Map<TsIdentLibrary, string> | undefined {
    return O.toUndefined(this._dependencies);
  }

  get devDependencies(): Map<TsIdentLibrary, string> | undefined {
    return O.toUndefined(this._devDependencies);
  }

  get peerDependencies(): Map<TsIdentLibrary, string> | undefined {
    return O.toUndefined(this._peerDependencies);
  }

  get typings(): Json | undefined {
    return O.toUndefined(this._typings);
  }

  get module(): Json | undefined {
    return O.toUndefined(this._module);
  }

  get types(): Json | undefined {
    return O.toUndefined(this._types);
  }

  get files(): IArray<string> | undefined {
    return O.toUndefined(this._files);
  }

  get dist(): PackageJsonDist | undefined {
    return O.toUndefined(this._dist);
  }

  get exports(): Json | undefined {
    return O.toUndefined(this._exports);
  }

  allLibs(dev: boolean, peer: boolean): Map<TsIdentLibrary, string> {
    const deps: IArray<Map<TsIdentLibrary, string>> = IArray.fromOptions(
      this._dependencies,
      dev ? this._devDependencies : O.none,
      peer ? this._peerDependencies : O.none
    );
    return toSorted(maps.smash(deps));
  }

  get parsedTypes(): IArray<string> | undefined {
    return O.toUndefined(
      pipe(
        this._types,
        O.chain(types => {
          const result = Json.fold(
            types,
            () => IArray.Empty as IArray<string>,
            (_) => { throw new Error(`unexpected boolean in types structure: ${JSON.stringify(types)}`); },
            (_) => { throw new Error(`unexpected number in types structure: ${JSON.stringify(types)}`); },
            (str) => IArray.apply(str),
            (arr) => IArray.fromTraversable(arr).mapNotNone(item =>
              typeof item === 'string' ? item : undefined
            ),
            (_) => { throw new Error(`unexpected object in types structure: ${JSON.stringify(types)}`); }
          );

          return result.nonEmpty ? O.some(result) : O.none;
        })
      )
    );
  }

  get parsedTypings(): IArray<string> | undefined {
    return O.toUndefined(
      pipe(
        this._typings,
        O.chain(typings => {
          const result = Json.fold(
            typings,
            () => IArray.Empty as IArray<string>,
            (_) => { throw new Error(`unexpected boolean in typings structure: ${JSON.stringify(typings)}`); },
            (_) => { throw new Error(`unexpected number in typings structure: ${JSON.stringify(typings)}`); },
            (str) => IArray.apply(str),
            (arr) => IArray.fromTraversable(arr).mapNotNone(item =>
              typeof item === 'string' ? item : undefined
            ),
            (_) => { throw new Error(`unexpected object in typings structure: ${JSON.stringify(typings)}`); }
          );

          return result.nonEmpty ? O.some(result) : O.none;
        })
      )
    );
  }

  get parsedModules(): Map<string, string> | undefined {
    return O.toUndefined(
      pipe(
        this._module,
        O.chain(module => {
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

          const result = look(module);
          return result.size > 0 ? O.some(result) : O.none;
        })
      )
    );
  }

  // this is an impossibly flexibly defined structure, so we're maximally flexible in this parse step
  // we only extract the `types` information for now
  get parsedExported(): Map<string, string> | undefined {
    return O.toUndefined(
      pipe(
        this._exports,
        O.chain(exports => {
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

          const result = look(exports);
          return result.size > 0 ? O.some(result) : O.none;
        })
      )
    );
  }

  static readonly Empty = new PackageJson();

  // JSON serialization/deserialization methods with backward compatibility
  static fromJson(jsonStr: string): PackageJson | Error {
    const result = pipe(
      Json.apply<any>(jsonStr),
      E.chain(parsed =>
        E.tryCatch(
          () => PackageJson.fromObject(parsed),
          (error) => error instanceof Error ? error.message : 'Unknown deserialization error'
        )
      )
    );

    return E.isLeft(result) ? new Error(result.left) : result.right;
  }

  // fp-ts version for internal use
  static fromJsonEither(jsonStr: string): E.Either<string, PackageJson> {
    return pipe(
      Json.apply<any>(jsonStr),
      E.chain(parsed =>
        E.tryCatch(
          () => PackageJson.fromObject(parsed),
          (error) => error instanceof Error ? error.message : 'Unknown deserialization error'
        )
      )
    );
  }
  
  static fromObject(obj: any): PackageJson {
    const parseDependencies = (deps: any): O.Option<Map<TsIdentLibrary, string>> => {
      if (!deps || typeof deps !== 'object') return O.none;
      const result = new Map<TsIdentLibrary, string>();
      for (const [key, value] of Object.entries(deps)) {
        if (typeof value === 'string') {
          result.set(TsIdentLibrary.construct(key), value);
        }
      }
      return result.size > 0 ? O.some(result) : O.none;
    };

    const parseFiles = (files: any): O.Option<IArray<string>> => {
      if (!files) return O.none;
      if (Array.isArray(files)) {
        const stringFiles = files.filter((f): f is string => typeof f === 'string');
        return O.some(IArray.fromArray(stringFiles));
      }
      return O.none;
    };

    const parseDist = (dist: any): O.Option<PackageJsonDist> => {
      if (!dist || typeof dist !== 'object') return O.none;
      if (typeof dist.tarball === 'string') {
        return O.some({ tarball: dist.tarball });
      }
      return O.none;
    };

    return new PackageJson(
      typeof obj.version === 'string' ? obj.version : undefined,
      O.toUndefined(parseDependencies(obj.dependencies)),
      O.toUndefined(parseDependencies(obj.devDependencies)),
      O.toUndefined(parseDependencies(obj.peerDependencies)),
      obj.typings !== undefined ? obj.typings : undefined,
      obj.module !== undefined ? obj.module : undefined,
      obj.types !== undefined ? obj.types : undefined,
      O.toUndefined(parseFiles(obj.files)),
      O.toUndefined(parseDist(obj.dist)),
      obj.exports !== undefined ? obj.exports : undefined
    );
  }
  
  toObject(): any {
    const serializeDependencies = (deps: O.Option<Map<TsIdentLibrary, string>>): any => {
      return pipe(
        deps,
        O.map(depsMap => {
          const result: any = {};
          for (const [lib, version] of depsMap) {
            result[lib.value] = version;
          }
          return Object.keys(result).length > 0 ? result : undefined;
        }),
        O.getOrElse(() => undefined)
      );
    };

    const serializeFiles = (files: O.Option<IArray<string>>): any => {
      return O.toUndefined(O.map((f: IArray<string>) => f.toArray())(files));
    };

    return {
      ...(O.isSome(this._version) && { version: this._version.value }),
      ...(O.isSome(this._dependencies) && { dependencies: serializeDependencies(this._dependencies) }),
      ...(O.isSome(this._devDependencies) && { devDependencies: serializeDependencies(this._devDependencies) }),
      ...(O.isSome(this._peerDependencies) && { peerDependencies: serializeDependencies(this._peerDependencies) }),
      ...(O.isSome(this._typings) && { typings: this._typings.value }),
      ...(O.isSome(this._module) && { module: this._module.value }),
      ...(O.isSome(this._types) && { types: this._types.value }),
      ...(O.isSome(this._files) && { files: serializeFiles(this._files) }),
      ...(O.isSome(this._dist) && { dist: this._dist.value }),
      ...(O.isSome(this._exports) && { exports: this._exports.value })
    };
  }
  
  toJson(): string {
    return JSON.stringify(this.toObject());
  }
}

export { PackageJson };