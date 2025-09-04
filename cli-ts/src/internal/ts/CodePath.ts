/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.CodePath
 *
 * Represents path information for TypeScript files
 */

import { TsIdent, TsQIdent, TsTree, TsNamedDecl, TsGlobal, TsIdentGlobal } from './trees.js';
import { Option, some, none } from 'fp-ts/Option';

/**
 * Base interface for code paths
 */
export interface CodePath {
  readonly _tag: 'NoPath' | 'HasPath';
  readonly asString: string;

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
  readonly asString: string;
}

/**
 * Has path - represents a concrete code path
 */
export interface CodePathHasPath extends CodePath {
  readonly _tag: 'HasPath';
  readonly inLibrary: TsIdent;
  readonly codePathPart: TsQIdent;
  readonly codePath: TsQIdent;
  readonly asString: string;

  /**
   * Navigates into a tree node (equivalent to Scala's / operator)
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
    replaceLast: () => CodePath.noPath(),
    asString: 'CodePath.NoPath'
  }),

  /**
   * Creates a has-path instance
   */
  hasPath: (inLibrary: TsIdent, codePathPart: TsQIdent): CodePathHasPath => {
    // Lazy computation of codePath - prepend inLibrary to codePathPart
    const codePath = TsQIdent.of(inLibrary, ...codePathPart.parts.toArray());

    return {
      _tag: 'HasPath',
      inLibrary,
      codePathPart,
      codePath,
      add: (ident: TsIdent) => CodePath.hasPath(inLibrary, TsQIdent.append(codePathPart, ident)),
      get: () => some(CodePath.hasPath(inLibrary, codePathPart)),
      forceHasPath: () => CodePath.hasPath(inLibrary, codePathPart),
      replaceLast: (newLast: TsIdent) => {
        const parts = codePathPart.parts.toArray();
        if (parts.length === 0) {
          return CodePath.hasPath(inLibrary, TsQIdent.of(newLast));
        }
        const newParts = parts.slice(0, -1).concat([newLast]);
        return CodePath.hasPath(inLibrary, TsQIdent.of(...newParts));
      },
      navigate: (tree: TsTree) => {
        // Pattern matching equivalent for TypeScript
        if (isNamedDecl(tree)) {
          // For TsNamedDecl, add the name to the path
          return CodePath.hasPath(inLibrary, TsQIdent.append(codePathPart, tree.name));
        } else if (isGlobal(tree)) {
          // For TsGlobal, add the Global identifier
          return CodePath.hasPath(inLibrary, TsQIdent.append(codePathPart, TsIdentGlobal));
        } else {
          // For other tree types, return unchanged
          return CodePath.hasPath(inLibrary, codePathPart);
        }
      },
      asString: `CodePath.HasPath(${inLibrary.value}, ${codePathPart.asString})`
    };
  },

  /**
   * Type guards
   */
  isNoPath: (path: CodePath): path is CodePathNoPath => path._tag === 'NoPath',
  isHasPath: (path: CodePath): path is CodePathHasPath => path._tag === 'HasPath'
};

// Type guards for tree navigation
function isNamedDecl(tree: TsTree): tree is TsNamedDecl {
  return 'name' in tree && typeof (tree as any).name === 'object';
}

function isGlobal(tree: TsTree): tree is TsGlobal {
  return tree._tag === 'TsGlobal';
}

/**
 * Trait for objects that have a code path (equivalent to Scala's CodePath.Has)
 */
export interface HasCodePath {
  readonly codePath: CodePath;
  withCodePath(newCodePath: CodePath): HasCodePath;
}

/**
 * Singleton instances
 */
export const CodePathNoPath: CodePathNoPath = CodePath.noPath();