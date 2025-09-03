/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.CodePath
 *
 * Represents path information for TypeScript files
 */

import { TsIdent, TsQIdent, TsTree } from './trees.js';
import { Option, some, none } from 'fp-ts/Option';

/**
 * Base interface for code paths
 */
export interface CodePath {
  readonly _tag: 'NoPath' | 'HasPath';

  /**
   * Adds an identifier to the path
   */
  add(ident: TsIdent): CodePath;

  /**
   * Gets the path if it exists
   */
  get(): Option<CodePathHasPath>;

  /**
   * Forces getting the path, throwing if it doesn't exist
   */
  forceHasPath(): CodePathHasPath;

  /**
   * Replaces the last identifier in the path
   */
  replaceLast(newLast: TsIdent): CodePath;
}

/**
 * No path - represents absence of a code path
 */
export interface CodePathNoPath extends CodePath {
  readonly _tag: 'NoPath';
}

/**
 * Has path - represents a concrete code path
 */
export interface CodePathHasPath extends CodePath {
  readonly _tag: 'HasPath';
  readonly inLibrary: TsIdent;
  readonly codePathPart: TsQIdent;
  readonly codePath: TsQIdent;

  /**
   * Navigates into a tree node
   */
  navigate(tree: TsTree): CodePathHasPath;
}

/**
 * Constructor functions and utilities for CodePath
 */
export const CodePath = {
  /**
   * Creates a no-path instance
   */
  noPath: (): CodePathNoPath => ({
    _tag: 'NoPath',
    add: () => CodePath.noPath(),
    get: () => none,
    forceHasPath: () => {
      throw new Error('Expected code path');
    },
    replaceLast: () => CodePath.noPath()
  }),

  /**
   * Creates a has-path instance
   */
  hasPath: (inLibrary: TsIdent, codePathPart: TsQIdent): CodePathHasPath => {
    const codePath = TsQIdent.of(inLibrary, ...codePathPart.parts.toArray());

    return {
      _tag: 'HasPath',
      inLibrary,
      codePathPart,
      codePath,
      add: (ident: TsIdent) => CodePath.hasPath(inLibrary, TsQIdent.append(codePathPart, ident)),
      get: () => some(CodePath.hasPath(inLibrary, codePathPart) as CodePathHasPath),
      forceHasPath: () => CodePath.hasPath(inLibrary, codePathPart) as CodePathHasPath,
      replaceLast: (newLast: TsIdent) => {
        const parts = codePathPart.parts.toArray();
        if (parts.length === 0) {
          return CodePath.noPath();
        }
        const newParts = parts.slice(0, -1).concat([newLast]);
        return CodePath.hasPath(inLibrary, TsQIdent.of(...newParts));
      },
      navigate: (tree: TsTree) => {
        // This is a simplified version - full implementation would need
        // access to all tree types which we'll implement in later phases
        return CodePath.hasPath(inLibrary, codePathPart) as CodePathHasPath;
      }
    };
  },

  /**
   * Type guards
   */
  isNoPath: (path: CodePath): path is CodePathNoPath => path._tag === 'NoPath',
  isHasPath: (path: CodePath): path is CodePathHasPath => path._tag === 'HasPath'
};

/**
 * Trait for objects that have a code path
 */
export interface HasCodePath {
  readonly codePath: CodePath;
  withCodePath(newCodePath: CodePath): HasCodePath;
}

/**
 * Singleton instances
 */
export const CodePathNoPath: CodePathNoPath = CodePath.noPath();