import { ConversionOptions } from '../types/conversion-options.js';
import { PackageJson } from '../types/package-json.js';
import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';

/**
 * Bootstrap class for discovering and initializing TypeScript libraries
 * Equivalent to Scala Bootstrap object
 */
export class Bootstrap {
  /**
   * Bootstrap from node_modules directory
   * Discovers all TypeScript libraries and creates resolvers
   */
  static async fromNodeModules(
    nodeModulesPath: string,
    conversionOptions: ConversionOptions,
    wantedLibs: Set<string>
  ): Promise<BootstrapResult> {
    console.log(`Bootstrapping from ${nodeModulesPath}...`);

    // Discover input folders
    const inputFolders = await this.discoverInputFolders(nodeModulesPath);
    console.log(`Found input folders: ${inputFolders.join(', ')}`);

    // Create library resolver
    const libraryResolver = new LibraryResolver(nodeModulesPath, conversionOptions);
    await libraryResolver.initialize();

    // Discover all available libraries
    const allLibraries = await this.discoverLibraries(nodeModulesPath, inputFolders);
    console.log(`Discovered ${allLibraries.length} libraries`);

    // Filter to wanted libraries
    const wantedLibraries = allLibraries.filter(lib =>
      wantedLibs.has(lib.libName) || this.isStandardLibrary(lib.libName)
    );

    console.log(`Discovered ${allLibraries.length} libraries, selected ${wantedLibraries.length} wanted libraries`);

    return new BootstrapResult(
      inputFolders,
      libraryResolver,
      wantedLibraries
    );
  }

  /**
   * Discover input folders containing TypeScript definitions
   */
  private static async discoverInputFolders(nodeModulesPath: string): Promise<string[]> {
    const folders: string[] = [nodeModulesPath];

    // Add @types directory if it exists
    const typesPath = path.join(nodeModulesPath, '@types');
    if (await fs.pathExists(typesPath)) {
      folders.push(typesPath);
    }

    // Add TypeScript lib directory if available
    const tsLibPath = path.join(nodeModulesPath, 'typescript', 'lib');
    if (await fs.pathExists(tsLibPath)) {
      folders.push(tsLibPath);
    }

    return folders;
  }

  /**
   * Discover all TypeScript libraries in the given folders
   */
  private static async discoverLibraries(
    nodeModulesPath: string,
    inputFolders: string[]
  ): Promise<LibTsSource[]> {
    const libraries: LibTsSource[] = [];

    for (const folder of inputFolders) {
      const discovered = await this.discoverLibrariesInFolder(folder, nodeModulesPath);
      libraries.push(...discovered);
    }

    return libraries;
  }

  /**
   * Discover libraries in a specific folder
   */
  private static async discoverLibrariesInFolder(
    folder: string,
    nodeModulesPath: string
  ): Promise<LibTsSource[]> {
    const libraries: LibTsSource[] = [];

    try {
      console.log(`Scanning folder: ${folder}`);
      const entries = await fs.readdir(folder, { withFileTypes: true });
      console.log(`Found ${entries.length} entries in ${folder}`);

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const libPath = path.join(folder, entry.name);
          console.log(`Checking library path: ${libPath}`);

          // Handle scoped packages (like @types, @eslint, etc.)
          if (entry.name.startsWith('@')) {
            console.log(`Found scoped package directory: ${entry.name}`);
            // Recursively scan inside scoped package directory
            const scopedLibraries = await this.discoverLibrariesInFolder(libPath, nodeModulesPath);
            libraries.push(...scopedLibraries);
          } else {
            // Regular package
            const libName = folder.endsWith('@types') ? `@types/${entry.name}` : entry.name;
            console.log(`Library name: ${libName}`);

            const library = await this.createLibraryFromPath(libPath, libName);

            if (library) {
              console.log(`✅ Created library: ${library.libName} with ${library.sourceFiles.length} files`);
              libraries.push(library);
            } else {
              console.log(`❌ Failed to create library for ${libName}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${folder}:`, error);
    }

    console.log(`Discovered ${libraries.length} libraries in ${folder}`);
    return libraries;
  }

  /**
   * Create a library source from a path
   */
  static async createLibraryFromPath(
    libPath: string,
    libName: string
  ): Promise<LibTsSource | undefined> {
    try {
      console.log(`    Creating library for ${libName} at ${libPath}`);

      // Look for package.json
      const packageJsonPath = path.join(libPath, 'package.json');
      let packageJson: PackageJson = {};

      if (await fs.pathExists(packageJsonPath)) {
        packageJson = await fs.readJson(packageJsonPath);
        console.log(`    ✅ Found package.json for ${libName}`);
      } else {
        console.log(`    ⚠️  No package.json for ${libName}`);
      }

      // Find TypeScript definition files
      console.log(`    Searching for TypeScript files in ${libPath}`);
      const tsFiles = await this.findTypeScriptFiles(libPath);
      console.log(`    Found ${tsFiles.length} TypeScript files for ${libName}`);

      if (tsFiles.length === 0) {
        console.log(`    ❌ No TypeScript files found for ${libName}, skipping`);
        return undefined; // No TypeScript files found
      }

      console.log(`    ✅ Creating LibTsSource for ${libName} with ${tsFiles.length} files`);
      return new LibTsSource(
        libName,
        libPath,
        tsFiles,
        packageJson
      );
    } catch (error) {
      console.warn(`    ❌ Failed to create library from ${libPath}:`, error);
      return undefined;
    }
  }

  /**
   * Find all TypeScript definition files in a directory
   */
  static async findTypeScriptFiles(dir: string): Promise<string[]> {
    try {
      // Use simpler patterns that work better with glob
      const patterns = [
        path.join(dir, '*.d.ts'),
        path.join(dir, '*.ts'),
        path.join(dir, '*/*.d.ts'),
        path.join(dir, '*/*.ts')
      ];

      const allFiles: string[] = [];

      for (const pattern of patterns) {
        const files = await glob(pattern, {
          ignore: ['**/test/**', '**/tests/**', '**/*.test.*', '**/spec/**', '**/*.spec.*']
        });
        allFiles.push(...files);
      }

      // Remove duplicates and resolve paths
      const uniqueFiles = [...new Set(allFiles)];
      return uniqueFiles.map(file => path.resolve(file));
    } catch (error) {
      console.warn(`Failed to find TypeScript files in ${dir}:`, error);
      return [];
    }
  }

  /**
   * Check if a library is a standard library
   */
  private static isStandardLibrary(libName: string): boolean {
    const stdLibs = new Set([
      'typescript',
      'lib.es6',
      'lib.dom',
      'lib.es2015',
      'lib.es2016',
      'lib.es2017',
      'lib.es2018',
      'lib.es2019',
      'lib.es2020',
      'lib.es2021',
      'lib.es2022'
    ]);

    return stdLibs.has(libName) || libName.startsWith('lib.');
  }
}

/**
 * TypeScript library source
 * Equivalent to Scala LibTsSource
 */
export class LibTsSource {
  constructor(
    public readonly libName: string,
    public readonly libPath: string,
    public readonly sourceFiles: string[],
    public readonly packageJson: PackageJson
  ) {}

  get version(): string {
    return this.packageJson.version || '0.0.0';
  }

  get hasTypes(): boolean {
    return this.sourceFiles.some(file => file.endsWith('.d.ts'));
  }

  get mainTypesFile(): string | undefined {
    // Look for main types file
    if (this.packageJson.types) {
      return path.resolve(this.libPath, this.packageJson.types);
    }
    if (this.packageJson.typings) {
      return path.resolve(this.libPath, this.packageJson.typings);
    }

    // Look for index.d.ts
    const indexDts = path.join(this.libPath, 'index.d.ts');
    if (this.sourceFiles.includes(indexDts)) {
      return indexDts;
    }

    // Return first .d.ts file
    return this.sourceFiles.find(file => file.endsWith('.d.ts'));
  }
}

/**
 * Result of the bootstrap process
 */
export class BootstrapResult {
  constructor(
    public readonly inputFolders: string[],
    public readonly libraryResolver: LibraryResolver,
    private readonly initialLibs: LibTsSource[]
  ) {}

  getInitialLibs(): LibTsSource[] {
    return this.initialLibs;
  }

  findLibrary(libName: string): LibTsSource | undefined {
    return this.initialLibs.find(lib => lib.libName === libName);
  }
}

/**
 * Library resolver for TypeScript modules
 * Equivalent to Scala LibraryResolver
 */
export class LibraryResolver {
  private readonly moduleCache = new Map<string, LibTsSource>();
  private stdLibrary?: LibTsSource;

  constructor(
    private readonly nodeModulesPath: string,
    private readonly options: ConversionOptions
  ) {}

  async initialize(): Promise<void> {
    // Initialize standard library
    await this.initializeStdLib();
  }

  get stdLib(): LibTsSource {
    if (!this.stdLibrary) {
      throw new Error('Standard library not initialized');
    }
    return this.stdLibrary;
  }

  /**
   * Resolve a module by name
   */
  async resolveModule(moduleName: string): Promise<LibTsSource | undefined> {
    // Check cache first
    if (this.moduleCache.has(moduleName)) {
      return this.moduleCache.get(moduleName);
    }

    // Try to resolve from node_modules
    const resolved = await this.resolveFromNodeModules(moduleName);
    if (resolved) {
      this.moduleCache.set(moduleName, resolved);
      return resolved;
    }

    // Try to resolve from @types
    const typesResolved = await this.resolveFromTypes(moduleName);
    if (typesResolved) {
      this.moduleCache.set(moduleName, typesResolved);
      return typesResolved;
    }

    return undefined;
  }

  /**
   * Initialize standard library
   */
  private async initializeStdLib(): Promise<void> {
    const tsLibPath = path.join(this.nodeModulesPath, 'typescript', 'lib');

    if (await fs.pathExists(tsLibPath)) {
      const libFiles = await fs.readdir(tsLibPath);
      const stdLibFiles = libFiles
        .filter(file => file.startsWith('lib.') && file.endsWith('.d.ts'))
        .map(file => path.join(tsLibPath, file));

      this.stdLibrary = new LibTsSource(
        'std',
        tsLibPath,
        stdLibFiles,
        { name: 'typescript-std', version: '1.0.0' }
      );
    } else {
      // Fallback: create minimal std lib
      this.stdLibrary = new LibTsSource(
        'std',
        '',
        [],
        { name: 'typescript-std', version: '1.0.0' }
      );
    }
  }

  /**
   * Resolve module from node_modules
   */
  private async resolveFromNodeModules(moduleName: string): Promise<LibTsSource | undefined> {
    const modulePath = path.join(this.nodeModulesPath, moduleName);

    if (await fs.pathExists(modulePath)) {
      return await Bootstrap.createLibraryFromPath(modulePath, moduleName);
    }

    return undefined;
  }

  /**
   * Resolve module from @types
   */
  private async resolveFromTypes(moduleName: string): Promise<LibTsSource | undefined> {
    const typesName = moduleName.startsWith('@')
      ? moduleName.replace('@', '').replace('/', '__')
      : moduleName;

    const typesPath = path.join(this.nodeModulesPath, '@types', typesName);

    if (await fs.pathExists(typesPath)) {
      return await Bootstrap.createLibraryFromPath(typesPath, `@types/${typesName}`);
    }

    return undefined;
  }
}