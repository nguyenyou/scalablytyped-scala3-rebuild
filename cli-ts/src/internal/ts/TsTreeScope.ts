import { Either, left, right } from 'fp-ts/Either';
import { Option, none } from 'fp-ts/Option';
import { IArray } from '../IArray.js';
import type {
  TsIdentLibrary,
  TsTree,
  TsTypeRef,
  TsIdent,
  TsNamedDecl,
  TsDeclInterface,
  TsDeclClass,
  TsDeclTypeAlias,
  TsType,
  TsTypeParam,
  TsMember
} from './trees.js';
import { PackageJson } from './PackageJson.js';

export interface TsLib {
  libName: TsIdentLibrary;
  packageJsonOpt?: PackageJson;
}

/**
 * Loop detector for preventing infinite recursion during type resolution.
 * Tracks the current resolution stack to detect circular references.
 */
export class LoopDetector {
  private constructor(private readonly stack: readonly LoopDetectorEntry[]) {}

  /**
   * Creates an initial empty loop detector
   */
  static readonly initial = new LoopDetector([]);

  /**
   * Attempts to include a type reference in the resolution stack.
   * Returns Left(unit) if this would create a loop, Right(newDetector) otherwise.
   */
  including(typeRef: TsTypeRef, scope: TsTreeScope): Either<void, LoopDetector> {
    const entry = LoopDetectorEntry.fromTypeRef(typeRef, scope);
    if (this.stack.some(e => e.equals(entry))) {
      return left(undefined);
    }
    return right(new LoopDetector([entry, ...this.stack]));
  }

  /**
   * Attempts to include identifiers in the resolution stack.
   * Returns Left(unit) if this would create a loop, Right(newDetector) otherwise.
   */
  includingIdents(idents: IArray<TsIdent>, scope: TsTreeScope): Either<void, LoopDetector> {
    const entry = LoopDetectorEntry.fromIdents(idents, scope);
    if (this.stack.some(e => e.equals(entry))) {
      return left(undefined);
    }
    return right(new LoopDetector([entry, ...this.stack]));
  }
}

/**
 * Entry in the loop detector stack
 */
class LoopDetectorEntry {
  private constructor(
    private readonly type: 'TypeRef' | 'Idents',
    private readonly typeRef?: TsTypeRef,
    private readonly idents?: IArray<TsIdent>,
    private readonly scope?: TsTreeScope
  ) {}

  static fromTypeRef(typeRef: TsTypeRef, scope: TsTreeScope): LoopDetectorEntry {
    return new LoopDetectorEntry('TypeRef', typeRef, undefined, scope);
  }

  static fromIdents(idents: IArray<TsIdent>, scope: TsTreeScope): LoopDetectorEntry {
    return new LoopDetectorEntry('Idents', undefined, idents, scope);
  }

  equals(other: LoopDetectorEntry): boolean {
    if (this.type !== other.type) return false;
    if (this.scope !== other.scope) return false;

    if (this.type === 'TypeRef') {
      return this.typeRef === other.typeRef;
    } else {
      return this.idents === other.idents;
    }
  }
}

/**
 * Picker interface for selecting specific types of declarations
 */
export interface Picker<T extends TsNamedDecl> {
  pick(decl: TsNamedDecl): Option<T>;
}

/**
 * Standard pickers for different declaration types
 */
export const Picker = {
  Types: {
    pick: (decl: TsNamedDecl): Option<TsDeclInterface | TsDeclClass | TsDeclTypeAlias> => {
      if (decl._tag === 'TsDeclInterface' || decl._tag === 'TsDeclClass' || decl._tag === 'TsDeclTypeAlias') {
        return { _tag: 'Some', value: decl as TsDeclInterface | TsDeclClass | TsDeclTypeAlias };
      }
      return none;
    }
  } as Picker<TsDeclInterface | TsDeclClass | TsDeclTypeAlias>,

  All: {
    pick: (decl: TsNamedDecl): Option<TsNamedDecl> => {
      return { _tag: 'Some', value: decl };
    }
  } as Picker<TsNamedDecl>
};

/**
 * TypeScript tree scope interface for type and term lookup
 */
export interface TsTreeScope {
  /**
   * Look up declarations by qualified identifier with loop detection
   */
  lookupInternal<T extends TsNamedDecl>(
    picker: Picker<T>,
    wanted: IArray<TsIdent>,
    loopDetector: LoopDetector
  ): IArray<[T, TsTreeScope]>;
}

/**
 * Simple mock implementation of TsTreeScope for testing
 */
export class MockTsTreeScope implements TsTreeScope {
  constructor() {}

  lookupInternal<T extends TsNamedDecl>(
    picker: Picker<T>,
    wanted: IArray<TsIdent>,
    loopDetector: LoopDetector
  ): IArray<[T, TsTreeScope]> {
    // For testing purposes, always return empty
    // In a full implementation, this would search through the scope hierarchy
    return IArray.Empty;
  }

  /**
   * Creates a mock scope for testing
   */
  static create(): TsTreeScope {
    return new MockTsTreeScope();
  }
}

/**
 * Stub implementation of FillInTParams for type parameter substitution.
 * For now, this just returns the input unchanged.
 * In a full implementation, this would substitute type parameters with provided types.
 */
export const FillInTParams = {
  /**
   * Fill in type parameters for an interface declaration
   */
  forInterface: (decl: TsDeclInterface, tparams: IArray<TsType>): TsDeclInterface => {
    // Stub implementation - just return the original declaration
    // In a full implementation, this would substitute type parameters
    return decl;
  },

  /**
   * Fill in type parameters for a class declaration
   */
  forClass: (decl: TsDeclClass, tparams: IArray<TsType>): TsDeclClass => {
    // Stub implementation - just return the original declaration
    // In a full implementation, this would substitute type parameters
    return decl;
  },

  /**
   * Fill in type parameters for a type alias declaration
   */
  forTypeAlias: (decl: TsDeclTypeAlias, tparams: IArray<TsType>): TsDeclTypeAlias => {
    // Stub implementation - just return the original declaration
    // In a full implementation, this would substitute type parameters
    return decl;
  }
};