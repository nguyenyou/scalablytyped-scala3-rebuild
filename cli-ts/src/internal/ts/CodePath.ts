/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.CodePath
 * 
 * Represents path information for TypeScript files
 */

/**
 * Represents a code path within the project structure
 */
export class CodePath {
  constructor(public readonly path: string) {}

  /**
   * Create a CodePath from a string path
   */
  static from(path: string): CodePath {
    return new CodePath(path);
  }

  /**
   * Get the filename from the path
   */
  get filename(): string {
    const parts = this.path.split('/');
    return parts[parts.length - 1] || '';
  }

  /**
   * Get the directory from the path
   */
  get directory(): string {
    const parts = this.path.split('/');
    return parts.slice(0, -1).join('/');
  }

  /**
   * Check if this is a declaration file
   */
  get isDeclarationFile(): boolean {
    return this.path.endsWith('.d.ts');
  }

  toString(): string {
    return this.path;
  }
}
