import { BaseCommand, CommandOptions } from './base-command.js';
import { Paths } from '@/utils/paths.js';
import { PackageJson } from '@/internal/ts/PackageJson.js';
import { TsIdentLibrary } from '@/internal/ts/trees.js';
import { Json } from '@/internal/importer/LibTsSource.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Bootstrap } from '@/internal/importer/Bootstrap.ts'
import {ConversionOptions, Selection, Versions} from "@/internal/importer/ConversionOptions.ts";
import {Flavour} from "@/Flavour.ts";
import { Name } from '@/internal/scalajs/Name.ts'
import {InFolder} from "@/internal/files.ts";

/**
 * Main conversion command - equivalent to Scala Tracing.scala
 * Converts TypeScript definitions to Scala.js sources
 */
export class TracingCommand extends BaseCommand {
  private readonly inDirectory: string;
  private readonly sourceOutputDir: string;
  private readonly paths: Paths;
  
  private readonly DefaultOptions = new ConversionOptions(
    true,
    Flavour.Normal,
    Name.typings,
    new Set(['es6']),
    Selection.All(),
    Selection.All(),
    new Set(),
    new Versions(Versions.Scala3, Versions.ScalaJs1),
    false,
    undefined,
    false
  )

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
      // TypeScript equivalent of: val packageJson: PackageJson = Json.force[PackageJson](packageJsonPath)
      const packageJson: PackageJson = Json.force(packageJsonPath, (obj) => PackageJson.fromObject(obj));
      
      // TypeScript equivalent of: val wantedLibs: SortedSet[TsIdentLibrary] = packageJson.allLibs(false, peer = true).keySet
      const wantedLibs: Set<TsIdentLibrary> = new Set(packageJson.allLibs(false, true).keys());
      // console.log(wantedLibs)
// Bootstrap.fromNodeModules(InFolder(nodeModulesPath), DefaultOptions, wantedLibs)
      const x = Bootstrap.fromNodeModules(new InFolder(this.paths.nodeModules), this.DefaultOptions, wantedLibs);
      // console.log(x)
      

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