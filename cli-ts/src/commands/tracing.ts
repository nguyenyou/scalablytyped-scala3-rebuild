import { BaseCommand, CommandOptions } from './base-command.js';
import { Paths } from '@/utils/paths.js';
import { PackageJson } from '@/internal/ts/PackageJson.js';
import { Json } from '@/internal/importer/LibTsSource.js';
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
      
      const packageJsonPath = this.paths.packageJson;
      console.log(packageJsonPath);

      // TypeScript equivalent of: val packageJson: PackageJson = Json.force[PackageJson](packageJsonPath)
      const packageJson: PackageJson = Json.force(packageJsonPath, (obj) => PackageJson.fromObject(obj));
      console.log(packageJson)
      

      // Step 2: Bootstrap from node_modules
      // this.startSpinner('Bootstrapping from node_modules...');

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



}