import { Phase, PhaseResult } from './rec-phase.js';
import { LibraryResolver, LibTsSource } from '../core/bootstrap.js';
import { PersistingParser } from '../core/persisting-parser.js';
import { TsParsedFile, TsTreeScope, LibTs } from '../types/index.js';
import { CalculateLibraryVersion, EnabledTypeMappingExpansion } from '../types/conversion-options.js';

/**
 * Configuration for Phase1ReadTypescript
 */
export interface Phase1Config {
  resolve: LibraryResolver;
  calculateLibraryVersion: CalculateLibraryVersion;
  ignored: Set<string>;
  ignoredModulePrefixes: Set<string>;
  pedantic: boolean;
  parser: PersistingParser;
  expandTypeMappings: EnabledTypeMappingExpansion;
}

/**
 * Result of Phase1ReadTypescript
 */
export interface Phase1Result {
  libTs: LibTs;
  dependencies: Set<string>;
  version: string;
  scope: TsTreeScope;
}

/**
 * Phase 1: Read and parse TypeScript files
 * Equivalent to Scala Phase1ReadTypescript
 */
export class Phase1ReadTypescript implements Phase<LibTsSource, LibTsSource, Phase1Result> {
  constructor(private readonly config: Phase1Config) {}

  async execute(id: LibTsSource, input: LibTsSource): Promise<PhaseResult<Phase1Result>> {
    try {
      console.log(`Phase1ReadTypescript: Processing library ${input.libName}`);

      // Check if library should be ignored
      if (this.shouldIgnoreLibrary(input.libName)) {
        console.log(`Ignoring library ${input.libName}`);
        return PhaseResult.ignored();
      }

      // Parse all TypeScript files in the library
      const parsedFiles = await this.parseLibraryFiles(input);

      // Calculate library version
      const version = this.calculateVersion(input);

      // Create module scope and resolve dependencies
      const scope = await this.createModuleScope(parsedFiles, input);
      const dependencies = await this.resolveDependencies(input, scope);

      // Create LibTs result
      const libTs = new LibTs(
        input.libName,
        version,
        parsedFiles,
        scope,
        input.packageJson
      );

      console.log(`Phase1ReadTypescript: Successfully processed ${input.libName} with ${parsedFiles.length} files`);

      return PhaseResult.success({
        libTs,
        dependencies,
        version,
        scope
      });
    } catch (error) {
      console.error(`Phase1ReadTypescript: Failed to process ${input.libName}:`, error);
      return PhaseResult.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if a library should be ignored
   */
  private shouldIgnoreLibrary(libName: string): boolean {
    if (this.config.ignored.has(libName)) {
      return true;
    }

    for (const prefix of this.config.ignoredModulePrefixes) {
      if (libName.startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse all TypeScript files in a library
   */
  private async parseLibraryFiles(library: LibTsSource): Promise<TsParsedFile[]> {
    const parsedFiles: TsParsedFile[] = [];

    for (const filePath of library.sourceFiles) {
      try {
        const parsed = await this.config.parser.parse(filePath);
        parsedFiles.push(parsed);
      } catch (error) {
        if (this.config.pedantic) {
          throw new Error(`Failed to parse ${filePath}: ${error}`);
        } else {
          console.warn(`Warning: Failed to parse ${filePath}:`, error);
        }
      }
    }

    return parsedFiles;
  }

  /**
   * Calculate library version
   */
  private calculateVersion(library: LibTsSource): string {
    switch (this.config.calculateLibraryVersion) {
      case 'PackageJsonOnly':
        return library.version;
      case 'GitCommit':
        // TODO: Implement git commit hash calculation
        return library.version + '-git';
      case 'Constant':
        return '1.0.0';
      default:
        return library.version;
    }
  }

  /**
   * Create module scope for the library
   */
  private async createModuleScope(
    parsedFiles: TsParsedFile[],
    library: LibTsSource
  ): Promise<TsTreeScope> {
    // TODO: Implement full scope creation with symbol resolution
    // This is a placeholder implementation
    return new TsTreeScope(library.libName, parsedFiles);
  }

  /**
   * Resolve library dependencies
   */
  private async resolveDependencies(
    library: LibTsSource,
    scope: TsTreeScope
  ): Promise<Set<string>> {
    const dependencies = new Set<string>();

    // Add dependencies from package.json
    if (library.packageJson.dependencies) {
      Object.keys(library.packageJson.dependencies).forEach(dep => {
        if (!this.shouldIgnoreLibrary(dep)) {
          dependencies.add(dep);
        }
      });
    }

    // Add peer dependencies
    if (library.packageJson.peerDependencies) {
      Object.keys(library.packageJson.peerDependencies).forEach(dep => {
        if (!this.shouldIgnoreLibrary(dep)) {
          dependencies.add(dep);
        }
      });
    }

    // TODO: Add dependencies discovered from import statements in parsed files
    // This would require analyzing the AST for import/export declarations

    return dependencies;
  }
}