/**
 * File generation and output management system
 * Handles writing Scala source files to the filesystem
 */

import { ScalaPrinter, PrinterConfig, DEFAULT_PRINTER_CONFIG } from './scala-printer.js';
import { PhaseFlavourResult } from '../phases/phase-flavour.js';
import {
  ScalaTree,
  ScalaPackageTree,
  ScalaClassTree,
  ScalaModuleTree,
  ScalaQualifiedName
} from '../types/scala-ast.js';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * File generation configuration
 */
export interface FileGeneratorConfig {
  /** Output directory for generated files */
  outputDir: string;
  
  /** Printer configuration */
  printerConfig: PrinterConfig;
  
  /** Whether to organize files by package structure */
  usePackageStructure: boolean;
  
  /** File extension for generated files */
  fileExtension: string;
  
  /** Whether to overwrite existing files */
  overwriteExisting: boolean;
  
  /** Whether to create backup files */
  createBackups: boolean;
}

/**
 * Default file generator configuration
 */
export const DEFAULT_FILE_GENERATOR_CONFIG: FileGeneratorConfig = {
  outputDir: './generated-sources',
  printerConfig: DEFAULT_PRINTER_CONFIG,
  usePackageStructure: true,
  fileExtension: '.scala',
  overwriteExisting: true,
  createBackups: false
};

/**
 * Generated file information
 */
export interface GeneratedFile {
  /** Relative path from output directory */
  relativePath: string;
  
  /** Full absolute path */
  absolutePath: string;
  
  /** Generated source code content */
  content: string;
  
  /** Source trees that generated this file */
  sourceTrees: ScalaTree[];
  
  /** Package name */
  packageName: string;
  
  /** File size in bytes */
  size: number;
}

/**
 * File generation result
 */
export interface FileGenerationResult {
  /** All generated files */
  files: GeneratedFile[];
  
  /** Total number of files generated */
  fileCount: number;
  
  /** Total size of generated code in bytes */
  totalSize: number;
  
  /** Generation statistics */
  stats: {
    classCount: number;
    objectCount: number;
    traitCount: number;
    methodCount: number;
    fieldCount: number;
  };
}

/**
 * Scala file generator
 */
export class FileGenerator {
  private readonly printer: ScalaPrinter;

  constructor(private readonly config: FileGeneratorConfig = DEFAULT_FILE_GENERATOR_CONFIG) {
    this.printer = new ScalaPrinter(config.printerConfig);
  }

  /**
   * Generate files from phase result
   */
  async generateFiles(result: PhaseFlavourResult): Promise<FileGenerationResult> {
    console.log(`Generating files for ${result.libScalaJs.libName}...`);

    // Ensure output directory exists
    await fs.ensureDir(this.config.outputDir);

    // Organize trees by package/file
    const fileGroups = this.organizeTreesByFile(result);

    // Generate files
    const generatedFiles: GeneratedFile[] = [];
    for (const [fileName, trees] of fileGroups) {
      const file = await this.generateFile(fileName, trees, result.packageTree);
      generatedFiles.push(file);
    }

    // Calculate statistics
    const stats = this.calculateStats(generatedFiles);

    const generationResult: FileGenerationResult = {
      files: generatedFiles,
      fileCount: generatedFiles.length,
      totalSize: generatedFiles.reduce((sum, file) => sum + file.size, 0),
      stats
    };

    console.log(`Generated ${generationResult.fileCount} files (${generationResult.totalSize} bytes)`);
    return generationResult;
  }

  /**
   * Organize trees into logical file groups
   */
  private organizeTreesByFile(result: PhaseFlavourResult): Map<string, ScalaTree[]> {
    const fileGroups = new Map<string, ScalaTree[]>();

    // Group package trees
    if (result.packageTree) {
      this.addTreeToFileGroup(fileGroups, result.packageTree);
    }

    // Group optimized trees
    for (const tree of result.optimizedTrees) {
      this.addTreeToFileGroup(fileGroups, tree);
    }

    // Group companion objects
    for (const companion of result.companionObjects) {
      this.addTreeToFileGroup(fileGroups, companion);
    }

    return fileGroups;
  }

  /**
   * Add a tree to the appropriate file group
   */
  private addTreeToFileGroup(fileGroups: Map<string, ScalaTree[]>, tree: ScalaTree): void {
    const fileName = this.getFileNameForTree(tree);
    
    if (!fileGroups.has(fileName)) {
      fileGroups.set(fileName, []);
    }
    
    fileGroups.get(fileName)!.push(tree);
  }

  /**
   * Determine the appropriate file name for a tree
   */
  private getFileNameForTree(tree: ScalaTree): string {
    if (tree instanceof ScalaPackageTree) {
      return `package${this.config.fileExtension}`;
    } else if (tree instanceof ScalaClassTree) {
      return `${tree.name.value}${this.config.fileExtension}`;
    } else if (tree instanceof ScalaModuleTree) {
      return `${tree.name.value}${this.config.fileExtension}`;
    }
    
    return `generated${this.config.fileExtension}`;
  }

  /**
   * Generate a single file
   */
  private async generateFile(
    fileName: string,
    trees: ScalaTree[],
    packageTree: ScalaPackageTree
  ): Promise<GeneratedFile> {
    // Generate source code
    const packageName = packageTree.name.value;
    const content = this.printer.printFile(trees, packageName);

    // Determine file path
    const relativePath = this.config.usePackageStructure
      ? this.getPackageStructurePath(packageName, fileName)
      : fileName;
    
    const absolutePath = path.resolve(this.config.outputDir, relativePath);

    // Create backup if needed
    if (this.config.createBackups && await fs.pathExists(absolutePath)) {
      await this.createBackup(absolutePath);
    }

    // Ensure directory exists
    await fs.ensureDir(path.dirname(absolutePath));

    // Write file
    if (this.config.overwriteExisting || !await fs.pathExists(absolutePath)) {
      await fs.writeFile(absolutePath, content, 'utf8');
    }

    const generatedFile: GeneratedFile = {
      relativePath,
      absolutePath,
      content,
      sourceTrees: trees,
      packageName,
      size: Buffer.byteLength(content, 'utf8')
    };

    console.log(`Generated ${relativePath} (${generatedFile.size} bytes)`);
    return generatedFile;
  }

  /**
   * Get file path based on package structure
   */
  private getPackageStructurePath(packageName: string, fileName: string): string {
    const packageParts = packageName.split('.');
    return path.join(...packageParts, fileName);
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(filePath: string): Promise<void> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.copy(filePath, backupPath);
    console.log(`Created backup: ${backupPath}`);
  }

  /**
   * Calculate generation statistics
   */
  private calculateStats(files: GeneratedFile[]): FileGenerationResult['stats'] {
    let classCount = 0;
    let objectCount = 0;
    let traitCount = 0;
    let methodCount = 0;
    let fieldCount = 0;

    for (const file of files) {
      for (const tree of file.sourceTrees) {
        if (tree instanceof ScalaClassTree) {
          if (tree.classType === 'trait') {
            traitCount++;
          } else {
            classCount++;
          }
          
          // Count members
          for (const member of tree.members) {
            if (member.nodeType === 'ScalaMethodTree') {
              methodCount++;
            } else if (member.nodeType === 'ScalaFieldTree') {
              fieldCount++;
            }
          }
        } else if (tree instanceof ScalaModuleTree) {
          objectCount++;
          
          // Count members
          for (const member of tree.members) {
            if (member.nodeType === 'ScalaMethodTree') {
              methodCount++;
            } else if (member.nodeType === 'ScalaFieldTree') {
              fieldCount++;
            }
          }
        }
      }
    }

    return {
      classCount,
      objectCount,
      traitCount,
      methodCount,
      fieldCount
    };
  }

  /**
   * Clean output directory
   */
  async cleanOutputDirectory(): Promise<void> {
    if (await fs.pathExists(this.config.outputDir)) {
      await fs.remove(this.config.outputDir);
    }
    await fs.ensureDir(this.config.outputDir);
    console.log(`Cleaned output directory: ${this.config.outputDir}`);
  }

  /**
   * List generated files
   */
  async listGeneratedFiles(): Promise<string[]> {
    if (!await fs.pathExists(this.config.outputDir)) {
      return [];
    }

    const files: string[] = [];
    
    async function walkDir(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.name.endsWith('.scala')) {
          files.push(path.relative(this.config.outputDir, fullPath));
        }
      }
    }

    await walkDir(this.config.outputDir);
    return files;
  }

  /**
   * Get file generation summary
   */
  getGenerationSummary(result: FileGenerationResult): string {
    const lines = [
      `File Generation Summary:`,
      `  Files generated: ${result.fileCount}`,
      `  Total size: ${result.totalSize} bytes`,
      `  Classes: ${result.stats.classCount}`,
      `  Objects: ${result.stats.objectCount}`,
      `  Traits: ${result.stats.traitCount}`,
      `  Methods: ${result.stats.methodCount}`,
      `  Fields: ${result.stats.fieldCount}`,
      ``,
      `Generated files:`
    ];

    for (const file of result.files) {
      lines.push(`  ${file.relativePath} (${file.size} bytes)`);
    }

    return lines.join('\n');
  }
}
