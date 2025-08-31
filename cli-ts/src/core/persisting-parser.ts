import { TsParser, DEFAULT_PARSER_CONFIG, TsParserConfig } from './ts-parser.js';
import { TsParsedFile } from '../types/index.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Parser with caching capabilities
 * Equivalent to Scala PersistingParser
 */
export class PersistingParser {
  private readonly parser: TsParser;
  private readonly cache = new Map<string, TsParsedFile>();

  constructor(
    private readonly cacheDir?: string,
    private readonly inputFolders: string[] = [],
    private readonly config: TsParserConfig = DEFAULT_PARSER_CONFIG
  ) {
    // Initialize parser with all TypeScript files from input folders
    const allFiles = this.discoverTypeScriptFiles();
    this.parser = new TsParser(allFiles, config);
  }

  /**
   * Parse a TypeScript file with caching
   */
  async parse(filePath: string): Promise<TsParsedFile> {
    const normalizedPath = path.resolve(filePath);

    // Check memory cache first
    if (this.cache.has(normalizedPath)) {
      return this.cache.get(normalizedPath)!;
    }

    // Check disk cache if enabled
    if (this.cacheDir) {
      const cached = await this.loadFromDiskCache(normalizedPath);
      if (cached) {
        this.cache.set(normalizedPath, cached);
        return cached;
      }
    }

    // Parse the file
    const parsed = await this.parser.parseFile(normalizedPath);

    // Store in memory cache
    this.cache.set(normalizedPath, parsed);

    // Store in disk cache if enabled
    if (this.cacheDir) {
      await this.saveToDiskCache(normalizedPath, parsed);
    }

    return parsed;
  }

  /**
   * Parse multiple files
   */
  async parseFiles(filePaths: string[]): Promise<TsParsedFile[]> {
    const results: TsParsedFile[] = [];

    for (const filePath of filePaths) {
      try {
        const parsed = await this.parse(filePath);
        results.push(parsed);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return results;
  }

  /**
   * Discover all TypeScript files in input folders
   */
  private discoverTypeScriptFiles(): string[] {
    const files: string[] = [];

    for (const folder of this.inputFolders) {
      if (fs.existsSync(folder)) {
        const discovered = this.findTypeScriptFiles(folder);
        files.push(...discovered);
      }
    }

    return files;
  }

  /**
   * Recursively find TypeScript files in a directory
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...this.findTypeScriptFiles(fullPath));
      } else if (entry.isFile() && this.isTypeScriptFile(entry.name)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Check if a file is a TypeScript file
   */
  private isTypeScriptFile(fileName: string): boolean {
    return fileName.endsWith('.ts') || fileName.endsWith('.d.ts') || fileName.endsWith('.tsx');
  }

  /**
   * Generate cache key for a file
   */
  private getCacheKey(filePath: string): string {
    const stats = fs.statSync(filePath);
    const content = `${filePath}:${stats.mtime.getTime()}:${stats.size}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Load parsed file from disk cache
   */
  private async loadFromDiskCache(filePath: string): Promise<TsParsedFile | undefined> {
    if (!this.cacheDir) return undefined;

    try {
      const cacheKey = this.getCacheKey(filePath);
      const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);

      if (await fs.pathExists(cachePath)) {
        const cached = await fs.readJson(cachePath);
        // TODO: Deserialize TsParsedFile from JSON
        // For now, return undefined to force re-parsing
        return undefined;
      }
    } catch (error) {
      // Cache miss or error, continue with parsing
    }

    return undefined;
  }

  /**
   * Save parsed file to disk cache
   */
  private async saveToDiskCache(filePath: string, parsed: TsParsedFile): Promise<void> {
    if (!this.cacheDir) return;

    try {
      await fs.ensureDir(this.cacheDir);
      const cacheKey = this.getCacheKey(filePath);
      const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);

      // TODO: Serialize TsParsedFile to JSON
      // For now, skip caching to avoid serialization issues
      // await fs.writeJson(cachePath, parsed);
    } catch (error) {
      console.warn(`Failed to cache ${filePath}:`, error);
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.cache.clear();

    if (this.cacheDir && await fs.pathExists(this.cacheDir)) {
      await fs.remove(this.cacheDir);
    }
  }
}