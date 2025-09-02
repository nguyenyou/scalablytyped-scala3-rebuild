import { InFile, InFolder, filesSync } from "@/internal/files.ts";
import { ConversionOptions } from "@/internal/importer/ConversionOptions.ts";
import { TsIdent, TsIdentLibrary } from "@/internal/ts/trees.ts";
import { LibTsSource } from "@/internal/importer/LibTsSource.ts";
import * as path from "node:path";
import { IArray } from "@/internal/IArray.ts";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import { pipe } from "fp-ts/function";

// TypeScript equivalent of Scala's LibraryResolver.Res
export type LibraryResolverRes<T> =
  | { type: 'Found'; source: T }
  | { type: 'Ignored'; name: TsIdentLibrary }
  | { type: 'NotAvailable'; name: TsIdentLibrary };

// Helper functions for LibraryResolverRes
export const LibraryResolverRes = {
  Found: <T>(source: T): LibraryResolverRes<T> => ({ type: 'Found', source }),
  Ignored: (name: TsIdentLibrary): LibraryResolverRes<never> => ({ type: 'Ignored', name }),
  NotAvailable: (name: TsIdentLibrary): LibraryResolverRes<never> => ({ type: 'NotAvailable', name }),

  toOption: <T>(res: LibraryResolverRes<T>): O.Option<T> =>
    res.type === 'Found' ? O.some(res.source) : O.none,

  map: <T, U>(f: (value: T) => U) => (res: LibraryResolverRes<T>): LibraryResolverRes<U> =>
    res.type === 'Found' ? LibraryResolverRes.Found(f(res.source)) : res as LibraryResolverRes<U>
};

// TypeScript equivalent of Scala's Bootstrap.Unresolved
export class Unresolved {
  constructor(public readonly notAvailable: TsIdentLibrary[]) {}

  get msg(): string {
    return `Missing typescript definitions for the following libraries: ${this.notAvailable.map(lib => lib.value).join(", ")}. Try to add a corresponding \`@types\` npm package, or use \`stIgnore\` to ignore`;
  }
}

// TypeScript equivalent of Scala's LibraryResolver
export class LibraryResolver {
  private readonly byName: Map<string, LibTsSource>;

  constructor(
    public readonly stdLib: LibTsSource.StdLibSource,
    allSources: IArray<LibTsSource.FromFolder>,
    private readonly ignored: Set<TsIdentLibrary>
  ) {
    // Group by library name and take the first one for each name
    const grouped = new Map<string, LibTsSource>();

    // Add all sources
    for (let i = 0; i < allSources.length; i++) {
      const source = allSources.apply(i);
      if (!grouped.has(source.libName.value)) {
        grouped.set(source.libName.value, source);
      }
    }

    // Add stdlib
    grouped.set(TsIdent.std.value, stdLib);

    this.byName = grouped;
  }

  library(name: TsIdentLibrary): LibraryResolverRes<LibTsSource> {
    // Check if ignored
    for (const ignoredLib of this.ignored) {
      if (ignoredLib.value === name.value) {
        return LibraryResolverRes.Ignored(name);
      }
    }

    // Look up by name
    const source = this.byName.get(name.value);
    return source
      ? LibraryResolverRes.Found(source)
      : LibraryResolverRes.NotAvailable(name);
  }
}

// TypeScript equivalent of Scala's Bootstrap.Bootstrapped
export class Bootstrapped {
  constructor(
    public readonly inputFolders: IArray<InFolder>,
    public readonly libraryResolver: LibraryResolver,
    public readonly initialLibs: E.Either<Unresolved, LibTsSource[]>
  ) {}
}

export namespace Bootstrap {
  export function fromNodeModules(
    fromFolder: InFolder,
    conversion: ConversionOptions,
    wantedLibs: Set<TsIdentLibrary>
  ): Bootstrapped {
    // Create stdlib source with validation
    const stdLibSource = createStdLibSource(fromFolder, conversion);

    // Handle @types directory with Option
    const atTypes: O.Option<InFolder> = pipe(
      path.join(fromFolder.path, "@types"),
      O.fromPredicate(filesSync.isDir),
      O.map(typesPath => new InFolder(typesPath))
    );

    // Create input folders array
    const inputFolders: IArray<InFolder> = IArray.fromOptions(
      atTypes,
      O.some(fromFolder)
    );

    // Find all sources
    const allSources: IArray<LibTsSource.FromFolder> = findSources(inputFolders);

    // Create library resolver
    const libraryResolver = new LibraryResolver(stdLibSource, allSources, conversion.ignoredLibs);

    // Resolve all wanted libraries
    const initialLibs: E.Either<Unresolved, LibTsSource[]> = resolveAll(libraryResolver, wantedLibs);

    return new Bootstrapped(inputFolders, libraryResolver, initialLibs);
  }

  function createStdLibSource(fromFolder: InFolder, conversion: ConversionOptions): LibTsSource.StdLibSource {
    const folder = path.join(fromFolder.path, "typescript", "lib");

    // Validate that typescript lib folder exists
    if (!filesSync.exists(folder)) {
      throw new Error(`You must add typescript as a dependency. ${folder} must exist.`);
    }

    // Validate that std is not ignored
    for (const ignoredLib of conversion.ignoredLibs) {
      if (ignoredLib.value === TsIdent.std.value) {
        throw new Error("You cannot ignore std");
      }
    }

    // Create files array
    const files = Array.from(conversion.stdLibs).map(s =>
      new InFile(path.join(folder, `lib.${s}.d.ts`))
    );

    return new LibTsSource.StdLibSource(
      new InFolder(folder),
      IArray.fromArray(files),
      TsIdent.std
    );
  }

  function findSources(folders: IArray<InFolder>): IArray<LibTsSource.FromFolder> {
    return folders.foldLeft<IArray<LibTsSource.FromFolder>>(IArray.Empty, (foundSources, next) => {
      const foundNames = new Set(foundSources.map(source => source.libName.value).toArray());
      const newSources = forFolder(next).filter(source => !foundNames.has(source.libName.value));

      return foundSources.appendedAll(newSources);
    });
  }

  function forFolder(folder: InFolder): IArray<LibTsSource.FromFolder> {
    // This is a simplified implementation - in a full implementation,
    // we would need to scan the directory structure like the Scala version
    // For now, return empty array as this requires more complex directory scanning
    return IArray.Empty;
  }

  function resolveAll(
    libraryResolver: LibraryResolver,
    libs: Set<TsIdentLibrary>
  ): E.Either<Unresolved, LibTsSource[]> {
    const results = Array.from(libs).map(lib => libraryResolver.library(lib));

    const found: LibTsSource[] = [];
    const notAvailable: TsIdentLibrary[] = [];

    for (const result of results) {
      switch (result.type) {
        case 'Found':
          found.push(result.source);
          break;
        case 'NotAvailable':
          notAvailable.push(result.name);
          break;
        case 'Ignored':
          // Ignored libraries are not included in either list
          break;
      }
    }

    return notAvailable.length === 0
      ? E.right(found)
      : E.left(new Unresolved(notAvailable));
  }
}