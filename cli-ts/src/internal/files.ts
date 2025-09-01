import * as path from 'path';
import * as fsSync from 'fs';
import fs from 'node:fs/promises';

/**
 * TypeScript port of org.scalablytyped.converter.internal.files
 * Maintains exact same functionality and API surface as the Scala implementation
 */

// Constants equivalent to Scala constants.Utf8
export const UTF8_ENCODING = 'utf8' as const;

/**
 * Synchronization status enum
 * Equivalent to Scala sealed trait Synced
 */
export enum Synced {
  New = 'New',
  Changed = 'Changed',
  Unchanged = 'Unchanged',
  Deleted = 'Deleted'
}

/**
 * Represents an input file with path operations
 * Equivalent to Scala final case class InFile(path: os.Path)
 */
export class InFile {
  constructor(public readonly path: string) {}

  /**
   * Get the parent folder of this file
   * Equivalent to Scala def folder: InFolder
   */
  get folder(): InFolder {
    return new InFolder(path.dirname(this.path));
  }

  /**
   * String representation of the file path
   * Equivalent to Scala override val toString: String
   */
  toString(): string {
    return this.path;
  }

  /**
   * Static ordering function for InFile instances
   * Equivalent to Scala implicit val ordering: Ordering[InFile]
   */
  static compare(a: InFile, b: InFile): number {
    return a.toString().localeCompare(b.toString());
  }
}

/**
 * Represents an input folder with path operations
 * Equivalent to Scala final case class InFolder(path: os.Path)
 */
export class InFolder {
  constructor(public readonly path: string) {}

  /**
   * Get the name of this folder (last path segment)
   * Equivalent to Scala def name: String
   */
  get name(): string {
    return path.basename(this.path);
  }

  /**
   * JSON encoder for InFolder
   * Equivalent to Scala implicit val encodes: Encoder[InFolder]
   */
  toJSON(): string {
    return this.path;
  }

  /**
   * JSON decoder for InFolder
   * Equivalent to Scala implicit val decodes: Decoder[InFolder]
   */
  static fromJSON(pathStr: string): InFolder {
    return new InFolder(pathStr);
  }
}

/**
 * Layout trait for organizing files and values
 * Equivalent to Scala trait Layout[F, V]
 */
export interface Layout<F, V> {
  readonly all: Map<F, V>;
}

/**
 * File operations utilities
 * Equivalent to Scala object files
 */
export namespace files {

  /**
   * Check if a path exists (optimized version)
   * Equivalent to Scala def exists(path: os.Path): Boolean
   * Note: os.exists is too slow because it throws exceptions behind the scenes
   */
  export async function exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file content as string with UTF-8 encoding
   * Equivalent to Scala def content(file: InFile): String
   */
  export async function content(file: InFile): Promise<string> {
    return await fs.readFile(file.path, UTF8_ENCODING);
  }

  /**
   * Predicate function to ignore common project files
   * Equivalent to Scala val IgnoreProjectFiles: os.Path => Boolean
   */
  export const IgnoreProjectFiles = (filePath: string): boolean => {
    const name = path.basename(filePath);
    return name === '.idea' || name === 'target' || name === '.git';
  };

  /**
   * Write content to file using a writer function, only if content changed
   * Equivalent to Scala def softWrite[T](path: os.Path)(f: PrintWriter => T): Synced
   */
  export async function softWrite<T>(
    filePath: string,
    writerFn: (write: (content: string) => void) => T | Promise<T>
  ): Promise<Synced> {
    let content = '';
    const writer = (text: string) => {
      content += text;
    };

    try {
      await writerFn(writer);
      return await softWriteBytes(filePath, Buffer.from(content, UTF8_ENCODING));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Write bytes to file, only if content changed
   * Equivalent to Scala def softWriteBytes(path: os.Path, newContent: Array[Byte]): Synced
   */
  export async function softWriteBytes(filePath: string, newContent: Buffer): Promise<Synced> {
    if (await exists(filePath)) {
      const existingContent = await fs.readFile(filePath);
      if (!existingContent.equals(newContent)) {
        await fs.writeFile(filePath, newContent);
        return Synced.Changed;
      } else {
        return Synced.Unchanged;
      }
    } else {
      return await writeBytes(filePath, newContent);
    }
  }

  /**
   * Write bytes to file, creating directories as needed
   * Equivalent to Scala def writeBytes[T](path: Path, newContent: Array[Byte]): Synced
   */
  export async function writeBytes(filePath: string, newContent: Buffer): Promise<Synced> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, newContent);
    return Synced.New;
  }

  /**
   * Ensure directory exists, creating it if necessary
   * Equivalent to Scala def existing(p: os.Path): os.Path
   */
  export async function existing(dirPath: string): Promise<string> {
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
  }
}

/**
 * Synchronous file operations for backward compatibility
 * Note: These use synchronous fs methods and should be avoided in favor of the async versions above
 */
export namespace filesSync {
  /**
   * Check if a path exists (synchronous version)
   */
  export function exists(filePath: string): boolean {
    try {
      fsSync.accessSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file content as string with UTF-8 encoding (synchronous version)
   */
  export function content(file: InFile): string {
    return fsSync.readFileSync(file.path, UTF8_ENCODING);
  }

  /**
   * Write content to file using a writer function, only if content changed (synchronous version)
   */
  export function softWrite<T>(filePath: string, writerFn: (write: (content: string) => void) => T): Synced {
    let content = '';
    const writer = (text: string) => {
      content += text;
    };

    try {
      writerFn(writer);
      return softWriteBytes(filePath, Buffer.from(content, UTF8_ENCODING));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Write bytes to file, only if content changed (synchronous version)
   */
  export function softWriteBytes(filePath: string, newContent: Buffer): Synced {
    if (exists(filePath)) {
      const existingContent = fsSync.readFileSync(filePath);
      if (!existingContent.equals(newContent)) {
        fsSync.writeFileSync(filePath, newContent);
        return Synced.Changed;
      } else {
        return Synced.Unchanged;
      }
    } else {
      return writeBytes(filePath, newContent);
    }
  }

  /**
   * Write bytes to file, creating directories as needed (synchronous version)
   */
  export function writeBytes(filePath: string, newContent: Buffer): Synced {
    const dir = path.dirname(filePath);
    fsSync.mkdirSync(dir, { recursive: true });
    fsSync.writeFileSync(filePath, newContent);
    return Synced.New;
  }

  /**
   * Ensure directory exists, creating it if necessary (synchronous version)
   */
  export function existing(dirPath: string): string {
    fsSync.mkdirSync(dirPath, { recursive: true });
    return dirPath;
  }
}