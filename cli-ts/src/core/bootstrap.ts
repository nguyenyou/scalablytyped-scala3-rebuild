import * as path from 'path';
import * as fs from 'fs-extra';
import { TsIdent, TsIdentLibrary, IArray } from '../types/ts-ast.js';
import { ConversionOptions } from '../types/conversion-options.js';
import {InFile, InFolder} from "@/internal/files.ts";

/**
 * File system utilities
 * Equivalent to Scala files object
 */
export namespace Files {
  export function exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  export function isDirectory(dirPath: string): boolean {
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  export function listDirectory(dirPath: string): string[] {
    try {
      return fs.readdirSync(dirPath);
    } catch {
      return [];
    }
  }
}

/**
 * TypeScript library source types
 * Equivalent to Scala LibTsSource
 */
export abstract class LibTsSource {
  abstract readonly folder: InFolder;
  abstract readonly libName: TsIdentLibrary;

  get path(): string {
    return this.folder.path;
  }

  static hasTypescriptSources(folder: InFolder): boolean {
    try {
      const files = fs.readdirSync(folder.path, { recursive: true });
      return files.some(file => typeof file === 'string' && file.endsWith('.d.ts'));
    } catch {
      return false;
    }
  }
}

export namespace LibTsSource {
  export class StdLibSource extends LibTsSource {
    constructor(
      public readonly folder: InFolder,
      public readonly files: IArray<InFile>,
      public readonly libName: TsIdentLibrary
    ) {
      super();
    }
  }

  export class FromFolder extends LibTsSource {
    constructor(
      public readonly folder: InFolder,
      public readonly libName: TsIdentLibrary
    ) {
      super();
    }
  }
}

/**
 * Library resolver result types
 * Equivalent to Scala LibraryResolver.Res
 */
export abstract class LibraryResolverResult<T> {
  abstract toOption(): T | undefined;
  abstract map<U>(f: (value: T) => U): LibraryResolverResult<U>;
}

export namespace LibraryResolverResult {
  export class Found<T> extends LibraryResolverResult<T> {
    constructor(public readonly source: T) {
      super();
    }

    toOption(): T {
      return this.source;
    }

    map<U>(f: (value: T) => U): LibraryResolverResult<U> {
      return new Found(f(this.source));
    }
  }

  export class Ignored extends LibraryResolverResult<never> {
    constructor(public readonly name: TsIdentLibrary) {
      super();
    }

    toOption(): undefined {
      return undefined;
    }

    map<U>(_f: (value: never) => U): LibraryResolverResult<U> {
      return this;
    }
  }

  export class NotAvailable extends LibraryResolverResult<never> {
    constructor(public readonly name: TsIdentLibrary) {
      super();
    }

    toOption(): undefined {
      return undefined;
    }

    map<U>(_f: (value: never) => U): LibraryResolverResult<U> {
      return this;
    }
  }
}

/**
 * Library resolver
 * Equivalent to Scala LibraryResolver
 */
export class LibraryResolver {
  private readonly byName: Map<string, LibTsSource>;

  constructor(
    public readonly stdLib: LibTsSource.StdLibSource,
    allSources: IArray<LibTsSource.FromFolder>,
    private readonly ignored: Set<string>
  ) {
    this.byName = new Map();

    // Group sources by library name, taking the first one for each name
    for (const source of allSources) {
      if (!this.byName.has(source.libName.value)) {
        this.byName.set(source.libName.value, source);
      }
    }

    // Add standard library
    this.byName.set(TsIdent.std.value, stdLib);
  }

  library(name: TsIdentLibrary): LibraryResolverResult<LibTsSource> {
    if (this.ignored.has(name.value)) {
      return new LibraryResolverResult.Ignored(name);
    }

    const source = this.byName.get(name.value);
    if (source) {
      return new LibraryResolverResult.Found(source);
    } else {
      return new LibraryResolverResult.NotAvailable(name);
    }
  }
}

/**
 * Utility functions for collections
 * Equivalent to Scala seqs.partitionCollect2
 */
export namespace CollectionUtils {
  export function partitionCollect2<T, T1, T2>(
    items: T[],
    collector1: (item: T) => T1 | undefined,
    collector2: (item: T) => T2 | undefined
  ): [T1[], T2[], T[]] {
    const collected1: T1[] = [];
    const collected2: T2[] = [];
    const remaining: T[] = [];

    for (const item of items) {
      const result1 = collector1(item);
      if (result1 !== undefined) {
        collected1.push(result1);
        continue;
      }

      const result2 = collector2(item);
      if (result2 !== undefined) {
        collected2.push(result2);
        continue;
      }

      remaining.push(item);
    }

    return [collected1, collected2, remaining];
  }
}

/**
 * Either type for error handling
 * Equivalent to Scala Either
 */
export abstract class Either<L, R> {
  abstract isLeft(): this is Left<L, R>;
  abstract isRight(): this is Right<L, R>;
  abstract map<U>(f: (value: R) => U): Either<L, U>;
  abstract flatMap<U>(f: (value: R) => Either<L, U>): Either<L, U>;
}

export class Left<L, R> extends Either<L, R> {
  constructor(public readonly value: L) {
    super();
  }

  isLeft(): this is Left<L, R> {
    return true;
  }

  isRight(): this is Right<L, R> {
    return false;
  }

  map<U>(_f: (value: R) => U): Either<L, U> {
    return new Left<L, U>(this.value);
  }

  flatMap<U>(_f: (value: R) => Either<L, U>): Either<L, U> {
    return new Left<L, U>(this.value);
  }
}

export class Right<L, R> extends Either<L, R> {
  constructor(public readonly value: R) {
    super();
  }

  isLeft(): this is Left<L, R> {
    return false;
  }

  isRight(): this is Right<L, R> {
    return true;
  }

  map<U>(f: (value: R) => U): Either<L, U> {
    return new Right<L, U>(f(this.value));
  }

  flatMap<U>(f: (value: R) => Either<L, U>): Either<L, U> {
    return f(this.value);
  }
}

/**
 * Unresolved libraries error
 * Equivalent to Scala Bootstrap.Unresolved
 */
export class Unresolved {
  constructor(public readonly notAvailable: TsIdentLibrary[]) {}

  get msg(): string {
    const libraryNames = this.notAvailable.map(lib => lib.value).join(', ');
    return `Missing typescript definitions for the following libraries: ${libraryNames}. Try to add a corresponding \`@types\` npm package, or use \`stIgnore\` to ignore`;
  }
}

/**
 * Bootstrap result
 * Equivalent to Scala Bootstrap.Bootstrapped
 */
export class Bootstrapped {
  constructor(
    public readonly inputFolders: IArray<InFolder>,
    public readonly libraryResolver: LibraryResolver,
    public readonly initialLibs: Either<Unresolved, LibTsSource[]>
  ) {}
}

/**
 * Bootstrap functionality
 * Equivalent to Scala Bootstrap object
 */
export namespace Bootstrap {
  /**
   * Bootstrap from node_modules directory
   * Equivalent to Scala Bootstrap.fromNodeModules
   */
  export function fromNodeModules(
    fromFolder: InFolder,
    conversion: ConversionOptions,
    wantedLibs: Set<TsIdentLibrary>
  ): Bootstrapped {
    // Create standard library source
    const stdLibFolder = path.join(fromFolder.path, 'typescript', 'lib');

    if (!Files.exists(stdLibFolder)) {
      throw new Error(`You must add typescript as a dependency. ${stdLibFolder} must exist.`);
    }

    if (conversion.ignored.has(TsIdent.std.value)) {
      throw new Error('You cannot ignore std');
    }

    const stdLibFiles = Array.from(conversion.stdLibs).map(s =>
      new InFile(path.join(stdLibFolder, `lib.${s}.d.ts`))
    );

    const stdLibSource = new LibTsSource.StdLibSource(
      new InFolder(stdLibFolder),
      IArray.from(stdLibFiles),
      TsIdent.std
    );

    // Find @types folder
    const typesPath = path.join(fromFolder.path, '@types');
    const typesFolder = Files.isDirectory(typesPath) ? new InFolder(typesPath) : undefined;

    // Create input folders array
    const inputFolders = IArray.from([typesFolder, fromFolder].filter(Boolean) as InFolder[]);

    // Find all sources
    const allSources = findSources(inputFolders);

    // Create library resolver
    const libraryResolver = new LibraryResolver(stdLibSource, allSources, conversion.ignored);

    // Resolve initial libraries
    const initialLibs = resolveAll(libraryResolver, wantedLibs);

    return new Bootstrapped(inputFolders, libraryResolver, initialLibs);
  }

  /**
   * Find sources in folders
   * Equivalent to Scala Bootstrap.findSources
   */
  function findSources(folders: IArray<InFolder>): IArray<LibTsSource.FromFolder> {
    let foundSources: LibTsSource.FromFolder[] = [];

    for (const folder of folders) {
      const foundNames = new Set(foundSources.map(s => s.libName.value));
      const newSources = forFolder(folder).filter(s => !foundNames.has(s.libName.value));
      foundSources = [...foundSources, ...newSources];
    }

    return IArray.from(foundSources);
  }

  /**
   * Find sources for a single folder
   * Equivalent to Scala Bootstrap.forFolder
   */
  function forFolder(folder: InFolder): LibTsSource.FromFolder[] {
    const sources: LibTsSource.FromFolder[] = [];

    try {
      const entries = Files.listDirectory(folder.path);

      for (const entry of entries) {
        const entryPath = path.join(folder.path, entry);

        if (!Files.isDirectory(entryPath)) {
          continue;
        }

        if (entry.startsWith('@')) {
          if (entry.startsWith('@types')) {
            continue; // Skip @types directories
          }

          // Handle scoped packages
          const nestedEntries = Files.listDirectory(entryPath);
          for (const nestedEntry of nestedEntries) {
            const nestedPath = path.join(entryPath, nestedEntry);
            if (Files.isDirectory(nestedPath)) {
              const libName = new TsIdentLibrary(`${entry}/${nestedEntry}`);
              const source = new LibTsSource.FromFolder(new InFolder(nestedPath), libName);
              if (LibTsSource.hasTypescriptSources(source.folder)) {
                sources.push(source);
              }
            }
          }
        } else {
          // Handle regular packages
          const libName = new TsIdentLibrary(entry);
          const source = new LibTsSource.FromFolder(new InFolder(entryPath), libName);
          if (LibTsSource.hasTypescriptSources(source.folder)) {
            sources.push(source);
          }
        }
      }
    } catch (error) {
      // Ignore errors when reading directories
    }

    return sources;
  }

  /**
   * Resolve all wanted libraries
   * Equivalent to Scala Bootstrap.resolveAll
   */
  function resolveAll(
    libraryResolver: LibraryResolver,
    libs: Set<TsIdentLibrary>
  ): Either<Unresolved, LibTsSource[]> {
    const libsArray = Array.from(libs);
    const results = libsArray.map(lib => libraryResolver.library(lib));

    const [allFound, notAvailable] = CollectionUtils.partitionCollect2(
      results,
      (result) => result instanceof LibraryResolverResult.Found ? result.source : undefined,
      (result) => result instanceof LibraryResolverResult.NotAvailable ? result.name : undefined
    );

    if (notAvailable.length === 0) {
      return new Right(allFound);
    } else {
      return new Left(new Unresolved(notAvailable));
    }
  }
}