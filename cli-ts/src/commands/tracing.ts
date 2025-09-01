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
import type { PackageJson } from 'type-fest'
import * as fs from 'fs-extra';
import * as path from 'path';
import {InFolder} from "@/internal/files.ts";
import {TsIdentLibrary} from "@/internal/ts/trees.ts";

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
      console.log(wantedLibs)

      // Step 2: Bootstrap from node_modules
      this.startSpinner('Bootstrapping from node_modules...');
      const bootstrapped = await Bootstrap.fromNodeModules(
        new InFolder(this.paths.nodeModules),
        this.getDefaultOptions(),
        wantedLibs
      );
      this.succeedSpinner(`Bootstrap completed, found ${bootstrapped.libraryResolver.stdLib.libName} as stdlib`);

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

  private async loadConfiguration(): Promise<{ packageJson: PackageJson; wantedLibs: Set<TsIdentLibrary> }> {
    const packageJson = await fs.readJson(this.paths.packageJson) as PackageJson;

    // Extract wanted libraries from dependencies (equivalent to Scala packageJson.allLibs(false, peer = true).keySet)
    const fromPackageJson = new Set<TsIdentLibrary>();

    // Add regular dependencies
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(dep => {
        fromPackageJson.add(TsIdentLibrary.construct(dep));
      });
    }

    // Add peer dependencies (matching Scala implementation with peer = true)
    if (packageJson.peerDependencies) {
      Object.keys(packageJson.peerDependencies).forEach(dep => {
        fromPackageJson.add(TsIdentLibrary.construct(dep));
      });
    }

    this.debug(`Libraries found in package.json: ${Array.from(fromPackageJson).map(lib => lib.value).join(', ')}`);

    if (fromPackageJson.size === 0) {
      throw new Error('No libraries found in package.json');
    }

    // Filter out ignored libraries (equivalent to Scala: fromPackageJson -- DefaultOptions.ignoredLibs)
    const defaultOptions = this.getDefaultOptions();
    const wantedLibs = new Set<TsIdentLibrary>();

    for (const lib of fromPackageJson) {
      if (!defaultOptions.ignored.has(lib.value)) {
        wantedLibs.add(lib);
      }
    }

    this.debug(`Libraries after filtering ignored: ${Array.from(wantedLibs).map(lib => lib.value).join(', ')}`);

    if (wantedLibs.size === 0) {
      throw new Error('All libraries in package.json ignored');
    }

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