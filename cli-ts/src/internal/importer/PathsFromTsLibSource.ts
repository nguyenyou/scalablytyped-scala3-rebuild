/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.PathsFromTsLibSource
 * 
 * This module provides functionality to find TypeScript declaration files (.d.ts) 
 * from a given directory, filtering out unwanted directories and files according 
 * to specific patterns used by DefinitelyTyped and other TypeScript libraries.
 */

import * as path from 'path';
import * as fs from 'fs';
import { IArray } from '../IArray.js';
import { InFile, InFolder } from '../files.js';

/**
 * PathsFromTsLibSource object containing utilities for finding TypeScript declaration files
 * Equivalent to Scala object PathsFromTsLibSource
 */
export namespace PathsFromTsLibSource {
  
  /**
   * Regular expression to match version directories (e.g., v1.0, v2.5.1)
   * Equivalent to Scala val V: Regex = "v[\\d.]+".r
   */
  export const V: RegExp = /^v[\d.]+$/;
  
  /**
   * Regular expression to match TypeScript version directories (e.g., ts3.8, ts4.0)
   * Equivalent to Scala val TS: Regex = "ts[\\d.]+".r
   */
  export const TS: RegExp = /^ts[\d.]+$/;

  /**
   * Find all .d.ts files in the given folder, applying filtering rules
   * to skip unwanted directories and files.
   * 
   * Equivalent to Scala def filesFrom(bound: InFolder): IArray[InFile]
   * 
   * @param bound The root folder to search in
   * @returns An IArray of InFile instances representing found .d.ts files
   */
  export function filesFrom(bound: InFolder): IArray<InFile> {
    /**
     * Determines whether a directory should be skipped during traversal
     * Equivalent to Scala def skip(dir: os.Path)
     * 
     * @param dirPath The directory path to check
     * @returns true if the directory should be skipped, false otherwise
     */
    function skip(dirPath: string): boolean {
      const dirName = path.basename(dirPath);
      
      switch (dirName) {
        case "node_modules":
          return true;
        /* The presence of these folders mostly means unnecessary duplication.
           If we desperately want these perhaps the user can configure that,
           though it won't be as easy as just discarding them
         */
        case "amd":
        case "umd":
        case "es":
        case "es6":
          return true;
        /* DefinitelyTyped uses this pattern for newer versions of typescript. We just use the default */
        default:
          if (TS.test(dirName)) {
            return true;
          }
          /* DefinitelyTyped uses this pattern for old versions of the library */
          if (V.test(dirName)) {
            return true;
          }
          return false;
      }
    }

    /**
     * Recursively walk through directories to find .d.ts files
     * Equivalent to Scala os.walk(bound.path, skip)
     * 
     * @param dirPath The directory to walk
     * @param foundFiles Array to collect found files
     */
    function walkDirectory(dirPath: string, foundFiles: string[]): void {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            // Skip directories that match our skip patterns
            if (!skip(fullPath)) {
              walkDirectory(fullPath, foundFiles);
            }
          } else if (entry.isFile()) {
            // Check if it's a .d.ts file and doesn't contain .src.
            if (entry.name.endsWith('.d.ts') && !entry.name.includes('.src.')) {
              foundFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Silently ignore directories we can't read (permissions, etc.)
        // This matches the behavior of os.walk which would skip inaccessible directories
      }
    }

    // Collect all matching files
    const foundFiles: string[] = [];
    walkDirectory(bound.path, foundFiles);
    
    // Convert to IArray of InFile instances
    // Equivalent to Scala .map(InFile.apply)
    return IArray.fromArray(foundFiles.map(filePath => new InFile(filePath)));
  }
}

/**
 * Default export for convenience
 */
export default PathsFromTsLibSource;
