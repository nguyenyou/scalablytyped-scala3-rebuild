/**
 * TypeScript port of org.scalablytyped.converter.internal.Digest
 * 
 * Provides MD5 digest functionality for content hashing.
 */

import { createHash } from 'crypto';
import { IArray } from './IArray.js';

/**
 * Interface for types that can be converted to bytes for digesting
 */
export interface Digestable<T> {
  bytesFrom(value: T): Uint8Array;
}

/**
 * String digestable implementation
 * Filters out whitespace and converts to UTF-8 bytes
 */
export const StringDigestable: Digestable<string> = {
  bytesFrom(value: string): Uint8Array {
    const filtered = value.replace(/\s/g, ''); // Remove all whitespace
    return new TextEncoder().encode(filtered);
  }
};

/**
 * Uint8Array digestable implementation
 */
export const ByteArrayDigestable: Digestable<Uint8Array> = {
  bytesFrom(value: Uint8Array): Uint8Array {
    return value;
  }
};

/**
 * Digest class that wraps MD5 hash bytes and provides hex string representation
 */
export class Digest {
  private readonly bytes: Uint8Array;
  private _hexString?: string;

  private constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  /**
   * Get the hex string representation of the digest
   */
  get hexString(): string {
    if (this._hexString === undefined) {
      this._hexString = Digest.asString(this.bytes);
    }
    return this._hexString;
  }

  /**
   * Convert bytes to hex string
   */
  private static asString(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Create a digest from an array of digestable values
   */
  static of<T>(values: IArray<T>, digestable: Digestable<T>): Digest {
    const md5 = createHash('md5');
    
    values.forEach(value => {
      const bytes = digestable.bytesFrom(value);
      md5.update(bytes);
    });
    
    return new Digest(new Uint8Array(md5.digest()));
  }

  /**
   * Create a digest from an array of strings (convenience method)
   */
  static ofStrings(values: IArray<string>): Digest {
    return Digest.of(values, StringDigestable);
  }

  /**
   * Create a digest from an array of byte arrays (convenience method)
   */
  static ofBytes(values: IArray<Uint8Array>): Digest {
    return Digest.of(values, ByteArrayDigestable);
  }
}
