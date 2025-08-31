/**
 * TypeScript AST data structures
 * Equivalent to Scala ts/trees.scala
 */

/**
 * Base trait for all TypeScript AST nodes
 * Equivalent to Scala TsTree
 */
export abstract class TsTree {
  abstract readonly nodeType: string;
}

/**
 * Comments attached to AST nodes
 * Equivalent to Scala Comments
 */
export class Comments {
  constructor(public readonly comments: Comment[] = []) {}

  static readonly NoComments = new Comments([]);

  get isEmpty(): boolean {
    return this.comments.length === 0;
  }

  static from(text: string): Comments {
    return new Comments([new Comment(text)]);
  }

  concat(other: Comments): Comments {
    return new Comments([...this.comments, ...other.comments]);
  }
}

/**
 * Individual comment
 * Equivalent to Scala Comment
 */
export class Comment {
  constructor(public readonly text: string) {}

  static warning(text: string): Comment {
    return new Comment(`/* WARNING: ${text} */`);
  }
}

/**
 * Code path information for AST nodes
 * Equivalent to Scala CodePath
 */
export abstract class CodePath {
  abstract readonly segments: string[];

  static readonly NoPath: CodePath = new (class extends CodePath {
    readonly segments: string[] = [];
  })();

  static hasPath(library: string, qident: TsQIdent): CodePath {
    return new HasCodePath(library, qident);
  }
}

class HasCodePath extends CodePath {
  constructor(
    public readonly library: string,
    public readonly qident: TsQIdent
  ) {
    super();
  }

  get segments(): string[] {
    return [this.library, ...this.qident.parts];
  }
}

/**
 * JavaScript location information
 * Equivalent to Scala JsLocation
 */
export class JsLocation {
  constructor(public readonly path: string = '') {}
  
  static readonly Zero = new JsLocation('');
  
  add(segment: string): JsLocation {
    return new JsLocation(this.path ? `${this.path}.${segment}` : segment);
  }
}

/**
 * TypeScript identifier
 * Equivalent to Scala TsIdent
 */
export abstract class TsIdent {
  abstract readonly value: string;

  static simple(value: string): TsIdentSimple {
    return new TsIdentSimple(value);
  }
}



/**
 * Simple TypeScript identifier
 * Equivalent to Scala TsIdentSimple
 */
export class TsIdentSimple extends TsIdent {
  constructor(public readonly value: string) {
    super();
  }

  equals(other: TsIdent): boolean {
    return other instanceof TsIdentSimple && other.value === this.value;
  }
}

/**
 * TypeScript library identifier
 * Equivalent to Scala TsIdentLibrary
 */
export class TsIdentLibrary extends TsIdent {
  constructor(public readonly value: string) {
    super();
  }

  static readonly std = new TsIdentLibrary('std');
}

/**
 * TypeScript module identifier
 * Equivalent to Scala TsIdentModule
 */
export class TsIdentModule extends TsIdent {
  constructor(
    public readonly scope: string | undefined,
    public readonly fragments: string[]
  ) {
    super();
  }

  get value(): string {
    const base = this.fragments.join('/');
    return this.scope ? `${this.scope}/${base}` : base;
  }

  static simple(name: string): TsIdentModule {
    return new TsIdentModule(undefined, [name]);
  }
}

/**
 * Qualified TypeScript identifier
 * Equivalent to Scala TsQIdent
 */
export class TsQIdent {
  constructor(public readonly parts: string[]) {}

  static readonly symbol = new TsQIdent(['symbol']);
  
  static of(...parts: string[]): TsQIdent {
    return new TsQIdent(parts);
  }

  add(part: string): TsQIdent {
    return new TsQIdent([...this.parts, part]);
  }
}

/**
 * TypeScript container or declaration
 * Equivalent to Scala TsContainerOrDecl
 */
export abstract class TsContainerOrDecl extends TsTree {
  constructor(
    public readonly comments: Comments,
    public readonly codePath: CodePath
  ) {
    super();
  }
}

/**
 * TypeScript container (can contain other declarations)
 * Equivalent to Scala TsContainer
 */
export abstract class TsContainer extends TsContainerOrDecl {
  constructor(
    comments: Comments,
    codePath: CodePath,
    public readonly members: TsContainerOrDecl[]
  ) {
    super(comments, codePath);
  }

  abstract withMembers(newMembers: TsContainerOrDecl[]): TsContainer;
}

/**
 * TypeScript declaration
 * Equivalent to Scala TsDecl
 */
export abstract class TsDecl extends TsContainerOrDecl {
  constructor(
    comments: Comments,
    codePath: CodePath
  ) {
    super(comments, codePath);
  }
}

/**
 * TypeScript named declaration
 * Equivalent to Scala TsNamedDecl
 */
export abstract class TsNamedDecl extends TsDecl {
  constructor(
    comments: Comments,
    codePath: CodePath,
    public readonly name: TsIdentSimple
  ) {
    super(comments, codePath);
  }
}

/**
 * Array utility type for immutable arrays
 */
export type IArray<T> = readonly T[];

export namespace IArray {
  export const Empty: IArray<any> = [];

  export function from<T>(items: T[]): IArray<T> {
    return Object.freeze([...items]);
  }

  export function of<T>(...items: T[]): IArray<T> {
    return Object.freeze(items);
  }
}

// Static instances created after class definitions
export namespace TsIdent {
  export const defaultIdent = new TsIdentSimple('default');
  export const constructorIdent = new TsIdentSimple('constructor');
  export const namespaced = new TsIdentSimple('*');
}