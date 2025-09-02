/**
 * TypeScript port of org.scalablytyped.converter.internal.LibraryVersion
 * 
 * Represents library version information including git metadata and digest-based versioning.
 */

import { Option, some, none, map, getOrElse } from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { IArray } from './IArray.js';
import { Digest } from './Digest.js';

/**
 * Git repository information for libraries
 * 
 * @param repo - Repository URL
 * @param isDefinitelyTyped - Whether this is a DefinitelyTyped repository
 * @param lastModified - Last modification timestamp
 */
export class InGit {
  constructor(
    public readonly repo: URL,
    public readonly isDefinitelyTyped: boolean,
    public readonly lastModified: Date
  ) {}

  /**
   * Format git information for version string
   * Returns either "dt-{YYYYMMDDZ}" for DefinitelyTyped repos or "{repo.pathname}-{YYYYMMDDZ}" for others
   */
  format(): string {
    const dateStr = this.formatDate(this.lastModified);
    
    if (this.isDefinitelyTyped) {
      return `dt-${dateStr}`;
    } else {
      return `${this.repo.pathname}-${dateStr}`;
    }
  }

  /**
   * Format date as YYYYMMDDZ (basic ISO date with Z suffix)
   */
  private formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}Z`;
  }
}

/**
 * Library version information
 * 
 * @param isStdLib - Whether this is a standard library
 * @param libraryVersion - Declared library version (from package.json or comments)
 * @param inGit - Git repository information if available
 */
export class LibraryVersion {
  constructor(
    public readonly isStdLib: boolean,
    public readonly libraryVersion: Option<string>,
    public readonly inGit: Option<InGit>
  ) {}

  /**
   * Create LibraryVersion with nullable parameters (convenience constructor)
   */
  static create(
    isStdLib: boolean,
    libraryVersion: string | null,
    inGit: InGit | null
  ): LibraryVersion {
    return new LibraryVersion(
      isStdLib,
      libraryVersion ? some(libraryVersion) : none,
      inGit ? some(inGit) : none
    );
  }

  /**
   * Ignore stdlib minor version by truncating at the last dot
   * For stdlib versions, removes everything after the last dot
   */
  private ignoreStdLibMinorVersion(version: string): string {
    if (!this.isStdLib) {
      return version;
    }
    
    const lastDotIndex = version.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // No dot found - this will cause issues in the original Scala implementation
      // We handle it gracefully here by returning the original version
      return version;
    }
    
    return version.substring(0, lastDotIndex);
  }

  /**
   * Get the library version or default value
   */
  private libraryVersionOrDefault(): string {
    return pipe(
      this.libraryVersion,
      map(v => this.ignoreStdLibMinorVersion(v)),
      getOrElse(() => '0.0-unknown')
    );
  }

  /**
   * Generate version string combining library version, git info, and digest
   */
  version(digest: Digest): string {
    const libVersion = this.libraryVersionOrDefault();
    const gitFormat = pipe(this.inGit, map(git => git.format()));
    const digestPart = digest.hexString.substring(0, 6);

    // Handle empty library version case - if empty, don't include it
    const libVersionOption = libVersion === '' ? none : some(libVersion);

    const parts = IArray.fromOptions(
      libVersionOption,
      gitFormat,
      some(digestPart)
    );

    return parts.toArray().join('-');
  }
}