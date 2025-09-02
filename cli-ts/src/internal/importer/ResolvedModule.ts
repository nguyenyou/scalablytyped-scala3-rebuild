/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.ResolvedModule
 */

import { TsIdentModule } from '../ts/trees.js';
import { InFile } from '../files.js';
import { LibTsSource } from './LibTsSource.js';

/**
 * Base interface for resolved modules
 */
export interface ResolvedModule {
  readonly moduleName: TsIdentModule;
}

/**
 * Represents a locally resolved module (relative import)
 */
export class ResolvedModuleLocal implements ResolvedModule {
  constructor(
    public readonly inFile: InFile,
    public readonly moduleName: TsIdentModule
  ) {}
}

/**
 * Represents a non-local resolved module (external library)
 */
export class ResolvedModuleNotLocal implements ResolvedModule {
  constructor(
    public readonly source: LibTsSource,
    public readonly moduleName: TsIdentModule
  ) {}
}

/**
 * Utility namespace for creating ResolvedModule instances
 */
export namespace ResolvedModule {
  export function Local(inFile: InFile, moduleName: TsIdentModule): ResolvedModuleLocal {
    return new ResolvedModuleLocal(inFile, moduleName);
  }

  export function NotLocal(source: LibTsSource, moduleName: TsIdentModule): ResolvedModuleNotLocal {
    return new ResolvedModuleNotLocal(source, moduleName);
  }
}
