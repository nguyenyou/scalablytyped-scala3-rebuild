/**
 * TypeScript port of org.scalablytyped.converter.internal.scalajs.Comments
 * 
 * Represents comments and documentation in Scala.js code
 */

/**
 * Individual comment
 */
export interface Comment {
  readonly text: string;
  readonly type: 'line' | 'block' | 'doc';
}

/**
 * Collection of comments
 */
export class Comments {
  constructor(public readonly comments: Comment[] = []) {}

  /**
   * Check if comments are empty
   */
  get isEmpty(): boolean {
    return this.comments.length === 0;
  }

  /**
   * Add a comment
   */
  add(comment: Comment): Comments {
    return new Comments([...this.comments, comment]);
  }

  /**
   * Add a text comment
   */
  addText(text: string, type: 'line' | 'block' | 'doc' = 'line'): Comments {
    return this.add({ text, type });
  }

  /**
   * Check if comments contain a specific marker
   */
  has<T>(marker: T): boolean {
    // DUMMY IMPLEMENTATION: Always return false for now
    return false;
  }

  /**
   * Create empty comments
   */
  static empty(): Comments {
    return new Comments([]);
  }

  /**
   * Create comments from text array
   */
  static fromTexts(texts: string[]): Comments {
    const comments = texts.map(text => ({ text, type: 'line' as const }));
    return new Comments(comments);
  }
}
