/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.ModuleNameParser
 */

import { TsIdentModule } from './trees.js';

/**
 * Parser for TypeScript module names with various transformations
 */
export namespace ModuleNameParser {
  /**
   * Parse a module name from a string literal
   */
  export function fromString(value: string): TsIdentModule {
    return apply(value.split('/'), true);
  }

  /**
   * Parse a module name from fragments with optional index fragment handling
   */
  export function apply(fragments: string[], keepIndexFragment: boolean): TsIdentModule {
    const rewritten: string[] = [];

    for (const f of fragments) {
      if (f.startsWith('~')) {
        rewritten.push(f.slice(1));
      } else if (f === '@types') {
        // Skip @types fragments
        continue;
      } else if (f.includes('__')) {
        const parts = f.split('__');
        if (parts.length === 2) {
          rewritten.push(`@${parts[0]}`, parts[1]);
        } else {
          rewritten.push(f);
        }
      } else if ((f === 'index' || f === 'index.d.ts') && !keepIndexFragment) {
        // Skip index fragments when not keeping them
        continue;
      } else if (f.endsWith('.d.ts')) {
        rewritten.push(f.replace(/\.d\.ts$/, ''));
      } else if (f.endsWith('.ts')) {
        rewritten.push(f.replace(/\.ts$/, ''));
      } else {
        rewritten.push(f);
      }
    }

    if (rewritten.length === 0) {
      throw new Error('Unexpected empty module name');
    }

    const head = rewritten[0];
    
    // Handle relative module names (handled in ResolveExternalReferences)
    if (head.startsWith('.')) {
      return new TsIdentModule(undefined, fragments);
    }
    
    // Handle scoped packages
    if (head.startsWith('@') && rewritten.length > 1) {
      const scope = head.slice(1); // Remove @ prefix
      const rest = rewritten.slice(1);
      return new TsIdentModule(scope, rest);
    }
    
    // Handle regular packages
    return new TsIdentModule(undefined, rewritten);
  }
}
