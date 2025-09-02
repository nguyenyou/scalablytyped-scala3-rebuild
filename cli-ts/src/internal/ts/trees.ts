import { match, P } from 'ts-pattern';

interface TsTree {}

interface TsIdent extends TsTree {
  readonly value: string;
}


type TsIdentLibraryType = TsIdentLibrarySimple | TsIdentLibraryScoped;

export abstract class TsIdentLibrary implements TsIdent {
  /** Regex for scoped packages: @scope/name */
  static readonly Scoped = /@([^/]+)\/(.+)/;

  /** Regex for internal scoped representation: scope__name */
  static readonly Scoped__ = /(.+)__(.+)/;
  
  abstract readonly type: 'simple' | 'scoped';
  abstract readonly value: string;
  
  static construct(str: string): TsIdentLibrary {
    const scopedMatch = str.match(this.Scoped);
    const scopedUnderscoreMatch = str.match(this.Scoped__);

    return match({ str, scopedMatch, scopedUnderscoreMatch })
      // case Scoped("types", name) => apply(name)
      .with({ scopedMatch: P.not(P.nullish) }, ({ scopedMatch }) =>
        match([scopedMatch[1], scopedMatch[2]])
          .with(['types', P.select()], (name) => this.construct(name))
          .otherwise(([scope, name]) => new TsIdentLibraryScoped(scope, name))
      )
      // case Scoped__(scope, name) => TsIdentLibraryScoped(scope, name)  
      .with({ scopedUnderscoreMatch: P.not(P.nullish) }, ({ scopedUnderscoreMatch }) =>
        match([scopedUnderscoreMatch[1], scopedUnderscoreMatch[2]])
          .with(['types', P.select()], (name) => this.construct(name))
          .otherwise(([scope, name]) => new TsIdentLibraryScoped(scope, name))
      )
      // case other => TsIdentLibrarySimple(other)
      .otherwise(({ str }) => new TsIdentLibrarySimple(str));
  }

  /** Internal representation used for file naming and disambiguation.
   * Converts scoped packages like "@scope/name" to "scope__name"
   */
  get __value(): string {
    return match(this as unknown as TsIdentLibraryType)
      .with({ type: 'scoped' }, (scoped) => `${scoped.scope}__${scoped.name}`)
      .with({ type: 'simple' }, (simple) => simple.value)
      .exhaustive();
  }

  // Additional utility methods that all libraries share
  toString(): string {
    return this.value;
  }
}

export class TsIdentLibrarySimple extends TsIdentLibrary {
  readonly type = 'simple' as const;
  readonly value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }

  // Additional methods specific to simple libraries
  getPackageName(): string {
    return this.value;
  }
}

export class TsIdentLibraryScoped extends TsIdentLibrary {
  readonly type = 'scoped' as const;
  readonly scope: string;
  readonly name: string;

  constructor(scope: string, name: string) {
    super();
    this.scope = scope;
    this.name = name;
  }

  // Computed property (equivalent to Scala's val value)
  get value(): string {
    return `@${this.scope}/${this.name}`;
  }

  // Additional methods specific to scoped libraries
  getScope(): string {
    return this.scope;
  }

  getName(): string {
    return this.name;
  }

  getPackageName(): string {
    return this.name;
  }
}

/**
 * Represents a TypeScript module identifier. In TypeScript: "lodash", "@types/node", "./relative-module"
 * Used in import/export statements and module declarations.
 */
export class TsIdentModule implements TsIdent {
  constructor(
    public readonly scopeOpt: string | undefined,
    public readonly fragments: string[]
  ) {}

  /**
   * @deprecated "this doesnt really work for node"
   * Converts module identifier to library identifier
   */
  get inLibrary(): TsIdentLibrary {
    if (this.scopeOpt === undefined) {
      return new TsIdentLibrarySimple(this.fragments[0]);
    } else {
      return new TsIdentLibraryScoped(this.scopeOpt, this.fragments[0]);
    }
  }

  /**
   * Constructs the full module name. Examples: "lodash", "@types/node", "@scope/package/submodule"
   */
  get value(): string {
    if (this.scopeOpt === undefined) {
      return this.fragments.join('/');
    } else {
      return `@${this.scopeOpt}/${this.fragments.join('/')}`;
    }
  }

  toString(): string {
    return this.value;
  }
}

export namespace TsIdentModule {
  /**
   * Creates a module identifier from a library identifier
   */
  export function fromLibrary(lib: TsIdentLibrary): TsIdentModule {
    if (lib instanceof TsIdentLibrarySimple) {
      return new TsIdentModule(undefined, lib.value.split('.'));
    } else if (lib instanceof TsIdentLibraryScoped) {
      return new TsIdentModule(lib.scope, lib.name.split('.'));
    } else {
      throw new Error(`Unknown library type: ${lib}`);
    }
  }

  /**
   * Creates a simple module identifier with a single fragment
   */
  export function simple(s: string): TsIdentModule {
    return new TsIdentModule(undefined, [s]);
  }
}

export namespace TsIdent {
  export const std = new TsIdentLibrarySimple('std');
}