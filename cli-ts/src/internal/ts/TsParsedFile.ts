/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TsParsedFile
 * 
 * Represents a complete TypeScript source file after parsing
 */

import { IArray } from '../IArray';
import { Comments } from '../Comments';
import { CodePath } from './CodePath';
import { TsIdent, TsQIdent } from './trees';

/**
 * Compiler directive like /// <reference types="node" />
 */
export interface Directive {
  readonly type: 'PathRef' | 'LibRef';
  readonly value: string;
}

/**
 * TypeScript container or declaration
 */
export interface TsContainerOrDecl {
  readonly type: string;
  readonly name?: string;
}

/**
 * Represents a complete TypeScript source file after parsing
 * This is the root node of the AST for a single .ts or .d.ts file
 */
export class TsParsedFile {
  constructor(
    /** JSDoc comments at the file level */
    public readonly comments: Comments,
    /** Compiler directives like /// <reference types="node" /> */
    public readonly directives: IArray<Directive>,
    /** All top-level declarations in this file (classes, interfaces, functions, etc.) */
    public readonly members: IArray<TsContainerOrDecl>,
    /** Path information for this file within the project structure */
    public readonly codePath: CodePath
  ) {}

  /**
   * Whether this is a standard library file
   */
  get isStdLib(): boolean {
    if (CodePath.isHasPath(this.codePath)) {
      const pathStr = this.codePath.codePath.asString;
      return pathStr.includes('lib.') || pathStr.includes('typescript/lib');
    }
    return false;
  }

  /**
   * Create a mock TsParsedFile for testing/dummy implementations
   */
  static createMock(codePath?: CodePath): TsParsedFile {
    const mockComments = Comments.empty();
    const mockDirectives = IArray.Empty as IArray<Directive>;
    const mockMembers = IArray.Empty as IArray<TsContainerOrDecl>;
    const mockCodePath = codePath || CodePath.hasPath(TsIdent.simple("mock"), TsQIdent.ofStrings("mock-file.d.ts"));

    return new TsParsedFile(
      mockComments,
      mockDirectives,
      mockMembers,
      mockCodePath
    );
  }
}