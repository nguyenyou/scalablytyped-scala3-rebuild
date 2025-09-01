import { BaseCommand, CommandOptions } from './base-command.js';
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
    const wantedLibs = new Set<TsIdentLibrary>();

    this.debug(`Libraries after filtering ignored: ${Array.from(wantedLibs).map(lib => lib.value).join(', ')}`);

    if (wantedLibs.size === 0) {
      throw new Error('All libraries in package.json ignored');
    }

    return { packageJson, wantedLibs };
  }


}