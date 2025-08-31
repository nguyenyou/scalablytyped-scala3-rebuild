import { BaseCommand, CommandOptions } from './base-command.js';
import { Bootstrap } from '../core/bootstrap.js';
import { ConversionOptions } from '../types/conversion-options.js';
import { PhaseRunner } from '../phases/phase-runner.js';
import { Phase1ReadTypescript } from '../phases/phase1-read-typescript.js';
import { Phase2ToScalaJs } from '../phases/phase2-to-scalajs.js';
import { PhaseFlavour } from '../phases/phase-flavour.js';
import { RecPhase } from '../phases/rec-phase.js';
import { PersistingParser } from '../core/persisting-parser.js';
import { Paths } from '../utils/paths.js';
import { PackageJson } from '../types/package-json.js';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Main conversion command - equivalent to Scala Tracing.scala
 * Converts TypeScript definitions to Scala.js sources
 */
export class TracingCommand extends BaseCommand {
  private readonly inDirectory: string;
  private readonly sourceOutputDir: string;
  private readonly paths: Paths;

  constructor(options: CommandOptions) {
    super(options);
    this.inDirectory = process.cwd();
    this.sourceOutputDir = path.resolve(options.output || './generated-sources');
    this.paths = new Paths(this.inDirectory);
  }

  async execute(): Promise<void> {
    this.info('Starting TypeScript to Scala.js conversion...');
    
    try {
      // Step 0: Validate environment
      await this.validateEnvironment();

      // Step 1: Load configuration
      const { packageJson, wantedLibs } = await this.loadConfiguration();

      // Step 2: Bootstrap from node_modules
      this.startSpinner('Bootstrapping from node_modules...');
      const bootstrapped = await Bootstrap.fromNodeModules(
        this.paths.nodeModules,
        this.getDefaultOptions(),
        wantedLibs
      );
      this.succeedSpinner(`Bootstrap completed, found ${bootstrapped.libraryResolver.stdLib.libName} as stdlib`);

      // Step 3: Get initial sources
      const sources = bootstrapped.getInitialLibs();
      this.info(`Initial sources from bootstrap: ${sources.map(s => s.libName).join(', ')}`);
      this.info(`Converting ${sources.map(s => s.libName).join(', ')} to scalajs...`);

      // Step 4: Set up parser with caching
      const cachedParser = new PersistingParser(
        this.options.cache ? path.resolve(this.options.cache) : undefined,
        bootstrapped.inputFolders
      );

      // Step 5: Create transformation pipeline
      this.startSpinner('Creating conversion pipeline...');
      const pipeline = this.createPipeline(bootstrapped, cachedParser);
      this.succeedSpinner('Pipeline created');

      // Step 6: Process libraries through pipeline
      this.startSpinner('Processing libraries through pipeline...');
      const importedLibs = await this.processLibraries(sources, pipeline);
      this.succeedSpinner(`Successfully processed ${importedLibs.size} libraries`);

      // Step 7: Generate and write files
      await this.generateFiles(importedLibs);

      this.success(`✓ Successfully generated Scala source files to ${this.sourceOutputDir}`);

    } catch (error) {
      this.failSpinner('Conversion failed');
      throw error;
    }
  }

  private async validateEnvironment(): Promise<void> {
    if (!await fs.pathExists(this.paths.packageJson)) {
      throw new Error(`${this.inDirectory} does not contain package.json`);
    }

    if (!await fs.pathExists(this.paths.nodeModules)) {
      throw new Error(`${this.inDirectory} does not contain node_modules`);
    }
  }

  private async loadConfiguration(): Promise<{ packageJson: PackageJson; wantedLibs: Set<string> }> {
    const packageJson = await fs.readJson(this.paths.packageJson) as PackageJson;
    
    // Extract wanted libraries from dependencies
    const wantedLibs = new Set<string>();
    
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(dep => wantedLibs.add(dep));
    }
    
    if (packageJson.devDependencies) {
      Object.keys(packageJson.devDependencies).forEach(dep => wantedLibs.add(dep));
    }

    this.debug(`Wanted libraries: ${Array.from(wantedLibs).join(', ')}`);
    
    return { packageJson, wantedLibs };
  }

  private getDefaultOptions(): ConversionOptions {
    return {
      useScalaJsDomTypes: true,
      outputPackage: 'typings',
      flavour: 'Normal',
      enableScalaJsDefined: 'All',
      ignored: new Set(['typescript']),
      stdLibs: new Set(['es6']),
      versions: {
        scala: 'Scala3',
        scalaJs: 'ScalaJs1'
      },
      expandTypeMappings: 'DefaultSelection',
      enableLongApplyMethod: false,
      privateWithin: undefined,
      useDeprecatedModuleNames: false
    };
  }

  private createPipeline(bootstrapped: any, cachedParser: PersistingParser): RecPhase<any, any> {
    const defaultOptions = this.getDefaultOptions();

    // Phase 1: Parse TypeScript files
    const phase1 = new Phase1ReadTypescript({
      resolve: bootstrapped.libraryResolver,
      calculateLibraryVersion: 'PackageJsonOnly',
      ignored: defaultOptions.ignored,
      ignoredModulePrefixes: new Set(),
      pedantic: this.options.pedantic || false,
      parser: cachedParser,
      expandTypeMappings: defaultOptions.expandTypeMappings
    });

    // Phase 2: Convert to Scala.js
    const phase2 = new Phase2ToScalaJs({
      pedantic: this.options.pedantic || false,
      scalaVersion: defaultOptions.versions.scala,
      enableScalaJsDefined: defaultOptions.enableScalaJsDefined,
      outputPkg: defaultOptions.outputPackage,
      flavour: defaultOptions.flavour,
      useDeprecatedModuleNames: defaultOptions.useDeprecatedModuleNames
    });

    // Phase 3: Apply flavour transformations
    const phase3 = new PhaseFlavour({
      flavour: defaultOptions.flavour,
      privateWithin: defaultOptions.privateWithin
    });

    // Create pipeline
    return RecPhase.initial()
      .next(phase1, 'typescript')
      .next(phase2, 'scala.js')
      .next(phase3, defaultOptions.flavour);
  }

  private async processLibraries(sources: any[], pipeline: RecPhase<any, any>): Promise<Map<any, any>> {
    const importedLibs = new Map();

    for (const source of sources) {
      this.updateSpinner(`Processing library ${source.libName}...`);
      this.debug(`Processing library ${source.libName}`);
      
      const result = await PhaseRunner.run(pipeline, source);
      importedLibs.set(source, result);
      
      this.debug(`Result for ${source.libName}: ${result.constructor.name}`);
    }

    return importedLibs;
  }

  private async generateFiles(importedLibs: Map<any, any>): Promise<void> {
    this.startSpinner('Generating source files...');

    const { FileGenerator, DEFAULT_FILE_GENERATOR_CONFIG } = await import('../core/file-generator.js');

    // Configure file generator
    const fileGenerator = new FileGenerator({
      ...DEFAULT_FILE_GENERATOR_CONFIG,
      outputDir: this.sourceOutputDir,
      overwriteExisting: true,
      usePackageStructure: true
    });

    let totalFiles = 0;
    let totalSize = 0;

    for (const [source, result] of importedLibs) {
      if (result.isSuccess()) {
        this.updateSpinner(`Generating files for ${source.libName}...`);

        try {
          // Generate files from the phase result
          const generationResult = await fileGenerator.generateFiles(result.value);

          totalFiles += generationResult.fileCount;
          totalSize += generationResult.totalSize;

          this.info(`Generated ${generationResult.fileCount} files for ${source.libName}`);

          if (this.options.debug) {
            console.log(fileGenerator.getGenerationSummary(generationResult));
          }
        } catch (error) {
          this.warn(`Failed to generate files for ${source.libName}: ${error}`);
        }
      } else if (result.isFailure()) {
        this.warn(`Skipping ${source.libName} due to processing failure: ${result.error?.message}`);
      }
    }

    this.succeedSpinner(`Generated ${totalFiles} Scala source files (${totalSize} bytes)`);
  }
}