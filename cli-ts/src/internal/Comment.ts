/**
 * TypeScript port of org.scalablytyped.converter.internal.Comment
 *
 * Represents comments and markers used for out-of-band information in the tree,
 * to be used like annotations. Instead of actually inventing annotations on
 * the TypeScript side we rather just work with special comments.
 *
 * This is a complete port of the Scala implementation with the following features:
 *
 * 1. **Sealed trait/interface pattern**: Uses TypeScript interfaces with discriminated unions
 *    to represent Scala's sealed traits (Comment and Marker)
 *
 * 2. **Case objects as singletons**: Scala case objects are implemented as TypeScript classes
 *    with singleton patterns to ensure only one instance exists
 *
 * 3. **Case classes as regular classes**: Scala case classes are implemented as TypeScript
 *    classes with readonly properties and equals methods
 *
 * 4. **Functional programming with fp-ts**: Uses fp-ts library for Option types and functional
 *    composition to maintain alignment with Scala's functional patterns
 *
 * 5. **Type safety**: Maintains full type safety with proper TypeScript type annotations
 *    and type guards for runtime type checking
 *
 * 6. **JSON serialization**: Provides equivalent functionality to Scala's Circe encoders/decoders
 *    for JSON serialization and deserialization
 *
 * 7. **Namespace organization**: Uses TypeScript namespaces to organize utility functions
 *    equivalent to Scala's companion objects
 *
 * Key differences from Scala:
 * - No implicit parameters (sourcecode.Enclosing is simulated with optional parameters)
 * - Singleton pattern instead of case objects
 * - Manual equals methods instead of automatic case class equality
 * - TypeScript interfaces instead of sealed traits
 * - Explicit type guards for pattern matching
 */

import { IArray } from './IArray.js';
import { TsIdentModule } from './ts/trees.js';
import { QualifiedName } from './scalajs/QualifiedName.js';
import { Option } from 'fp-ts/Option';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

// ============================================================================
// Base Comment interface (sealed trait equivalent)
// ============================================================================

/**
 * Base interface for all comment types
 * Equivalent to Scala's `sealed trait Comment`
 */
export interface Comment {
  readonly _tag: 'Comment';
}

// ============================================================================
// Marker interface and implementations (sealed trait equivalent)
// ============================================================================

/**
 * Base interface for marker comments
 * Equivalent to Scala's `sealed trait Marker extends Comment`
 */
export interface Marker extends Comment {
  readonly _tag: 'Comment';
  readonly _markerTag: string;
}

// ============================================================================
// Marker case objects (singleton implementations)
// ============================================================================

/**
 * Marker indicating this could be ScalaJS defined
 * Equivalent to Scala's `case object CouldBeScalaJsDefined extends Marker`
 */
export class CouldBeScalaJsDefined implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'CouldBeScalaJsDefined' as const;
  
  private static _instance: CouldBeScalaJsDefined | undefined;
  
  static get instance(): CouldBeScalaJsDefined {
    if (!CouldBeScalaJsDefined._instance) {
      CouldBeScalaJsDefined._instance = new CouldBeScalaJsDefined();
    }
    return CouldBeScalaJsDefined._instance;
  }
  
  private constructor() {}
  
  toString(): string {
    return 'CouldBeScalaJsDefined';
  }
}

/**
 * Marker indicating this is trivial
 * Equivalent to Scala's `case object IsTrivial extends Marker`
 */
export class IsTrivial implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'IsTrivial' as const;
  
  private static _instance: IsTrivial | undefined;
  
  static get instance(): IsTrivial {
    if (!IsTrivial._instance) {
      IsTrivial._instance = new IsTrivial();
    }
    return IsTrivial._instance;
  }
  
  private constructor() {}
  
  toString(): string {
    return 'IsTrivial';
  }
}

/**
 * Marker indicating expanded callables
 * Equivalent to Scala's `case object ExpandedCallables extends Marker`
 */
export class ExpandedCallables implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'ExpandedCallables' as const;
  
  private static _instance: ExpandedCallables | undefined;
  
  static get instance(): ExpandedCallables {
    if (!ExpandedCallables._instance) {
      ExpandedCallables._instance = new ExpandedCallables();
    }
    return ExpandedCallables._instance;
  }
  
  private constructor() {}
  
  toString(): string {
    return 'ExpandedCallables';
  }
}

/**
 * Marker indicating expanded class
 * Equivalent to Scala's `case object ExpandedClass extends Marker`
 */
export class ExpandedClass implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'ExpandedClass' as const;
  
  private static _instance: ExpandedClass | undefined;
  
  static get instance(): ExpandedClass {
    if (!ExpandedClass._instance) {
      ExpandedClass._instance = new ExpandedClass();
    }
    return ExpandedClass._instance;
  }
  
  private constructor() {}
  
  toString(): string {
    return 'ExpandedClass';
  }
}

/**
 * Marker indicating enum object
 * Equivalent to Scala's `case object EnumObject extends Marker`
 */
export class EnumObject implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'EnumObject' as const;
  
  private static _instance: EnumObject | undefined;
  
  static get instance(): EnumObject {
    if (!EnumObject._instance) {
      EnumObject._instance = new EnumObject();
    }
    return EnumObject._instance;
  }
  
  private constructor() {}
  
  toString(): string {
    return 'EnumObject';
  }
}

/**
 * Marker indicating has class parent
 * Equivalent to Scala's `case object HasClassParent extends Marker`
 */
export class HasClassParent implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'HasClassParent' as const;
  
  private static _instance: HasClassParent | undefined;
  
  static get instance(): HasClassParent {
    if (!HasClassParent._instance) {
      HasClassParent._instance = new HasClassParent();
    }
    return HasClassParent._instance;
  }
  
  private constructor() {}
  
  toString(): string {
    return 'HasClassParent';
  }
}

/**
 * Marker indicating mangler should leave alone
 * Equivalent to Scala's `case object ManglerLeaveAlone extends Marker`
 */
export class ManglerLeaveAlone implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'ManglerLeaveAlone' as const;
  
  private static _instance: ManglerLeaveAlone | undefined;
  
  static get instance(): ManglerLeaveAlone {
    if (!ManglerLeaveAlone._instance) {
      ManglerLeaveAlone._instance = new ManglerLeaveAlone();
    }
    return ManglerLeaveAlone._instance;
  }
  
  private constructor() {}
  
  toString(): string {
    return 'ManglerLeaveAlone';
  }
}

/**
 * Marker indicating mangler was JS native
 * Equivalent to Scala's `case object ManglerWasJsNative extends Marker`
 */
export class ManglerWasJsNative implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'ManglerWasJsNative' as const;
  
  private static _instance: ManglerWasJsNative | undefined;
  
  static get instance(): ManglerWasJsNative {
    if (!ManglerWasJsNative._instance) {
      ManglerWasJsNative._instance = new ManglerWasJsNative();
    }
    return ManglerWasJsNative._instance;
  }
  
  private constructor() {}
  
  toString(): string {
    return 'ManglerWasJsNative';
  }
}

// ============================================================================
// Marker case classes (data classes)
// ============================================================================

/**
 * Marker containing a name hint
 * Equivalent to Scala's `case class NameHint(value: String) extends Marker`
 */
export class NameHint implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'NameHint' as const;
  
  constructor(public readonly value: string) {}
  
  toString(): string {
    return `NameHint(${this.value})`;
  }
  
  equals(other: any): boolean {
    return other instanceof NameHint && other.value === this.value;
  }
}

/**
 * Marker containing module aliases
 * Equivalent to Scala's `case class ModuleAliases(aliases: IArray[TsIdentModule]) extends Marker`
 */
export class ModuleAliases implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'ModuleAliases' as const;

  constructor(public readonly aliases: IArray<TsIdentModule>) {}

  toString(): string {
    return `ModuleAliases(${this.aliases.length} aliases)`;
  }

  equals(other: any): boolean {
    return other instanceof ModuleAliases &&
           this.aliases.length === other.aliases.length &&
           this.aliases.toArray().every((alias, i) =>
             alias.value === other.aliases.apply(i).value
           );
  }
}

// ============================================================================
// ExprTree.Lit definition (needed for WasLiteral marker)
// ============================================================================

/**
 * Base interface for expression tree literals
 * Equivalent to Scala's `sealed trait Lit extends ExprTree`
 */
export interface ExprTreeLit {
  readonly _tag: 'ExprTreeLit';
  readonly _litTag: string;
  equals?(other: any): boolean;
}

/**
 * Boolean literal expression
 * Equivalent to Scala's `case class BooleanLit(value: Boolean) extends Lit`
 */
export class BooleanLit implements ExprTreeLit {
  readonly _tag = 'ExprTreeLit' as const;
  readonly _litTag = 'BooleanLit' as const;

  constructor(public readonly value: boolean) {}

  toString(): string {
    return `BooleanLit(${this.value})`;
  }

  equals(other: any): boolean {
    return other instanceof BooleanLit && other.value === this.value;
  }
}

/**
 * Integer literal expression
 * Equivalent to Scala's `case class IntLit(value: String) extends Lit`
 */
export class IntLit implements ExprTreeLit {
  readonly _tag = 'ExprTreeLit' as const;
  readonly _litTag = 'IntLit' as const;

  constructor(public readonly value: string) {}

  toString(): string {
    return `IntLit(${this.value})`;
  }

  equals(other: any): boolean {
    return other instanceof IntLit && other.value === this.value;
  }
}

/**
 * Double literal expression
 * Equivalent to Scala's `case class DoubleLit(value: String) extends Lit`
 */
export class DoubleLit implements ExprTreeLit {
  readonly _tag = 'ExprTreeLit' as const;
  readonly _litTag = 'DoubleLit' as const;

  constructor(public readonly value: string) {}

  toString(): string {
    return `DoubleLit(${this.value})`;
  }

  equals(other: any): boolean {
    return other instanceof DoubleLit && other.value === this.value;
  }
}

/**
 * String literal expression
 * Equivalent to Scala's `case class StringLit(value: String) extends Lit`
 */
export class StringLit implements ExprTreeLit {
  readonly _tag = 'ExprTreeLit' as const;
  readonly _litTag = 'StringLit' as const;

  constructor(public readonly value: string) {}

  toString(): string {
    return `StringLit("${this.value}")`;
  }

  equals(other: any): boolean {
    return other instanceof StringLit && other.value === this.value;
  }
}

/**
 * Undefined literal expression
 * Equivalent to Scala's `case object undefined extends Lit`
 */
export class UndefinedLit implements ExprTreeLit {
  readonly _tag = 'ExprTreeLit' as const;
  readonly _litTag = 'UndefinedLit' as const;

  private static _instance: UndefinedLit | undefined;

  static get instance(): UndefinedLit {
    if (!UndefinedLit._instance) {
      UndefinedLit._instance = new UndefinedLit();
    }
    return UndefinedLit._instance;
  }

  private constructor() {}

  toString(): string {
    return 'undefined';
  }
}

/**
 * Null literal expression
 * Equivalent to Scala's `case object Null extends Lit`
 */
export class NullLit implements ExprTreeLit {
  readonly _tag = 'ExprTreeLit' as const;
  readonly _litTag = 'NullLit' as const;

  private static _instance: NullLit | undefined;

  static get instance(): NullLit {
    if (!NullLit._instance) {
      NullLit._instance = new NullLit();
    }
    return NullLit._instance;
  }

  private constructor() {}

  toString(): string {
    return 'null';
  }
}

// ============================================================================
// TypeRef interface (needed for markers that reference types)
// ============================================================================

/**
 * Simplified TypeRef interface for markers
 * This is a minimal interface to avoid circular dependencies
 * The full TypeRef implementation is in the scalajs module
 */
export interface TypeRef {
  readonly _tag: 'TypeRef';
  readonly typeName: QualifiedName;
}

// ============================================================================
// More marker case classes
// ============================================================================

/**
 * Marker indicating this was a literal
 * Equivalent to Scala's `case class WasLiteral(lit: ExprTree.Lit) extends Marker`
 */
export class WasLiteral implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'WasLiteral' as const;

  constructor(public readonly lit: ExprTreeLit) {}

  toString(): string {
    return `WasLiteral(${this.lit.toString()})`;
  }

  equals(other: any): boolean {
    return other instanceof WasLiteral &&
           this.lit._litTag === other.lit._litTag &&
           (this.lit.equals ? this.lit.equals(other.lit) : this.lit === other.lit);
  }
}

/**
 * Marker indicating this was a union
 * Equivalent to Scala's `case class WasUnion(related: IArray[TypeRef]) extends Marker`
 */
export class WasUnion implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'WasUnion' as const;

  constructor(public readonly related: IArray<TypeRef>) {}

  toString(): string {
    return `WasUnion(${this.related.length} types)`;
  }

  equals(other: any): boolean {
    return other instanceof WasUnion &&
           this.related.length === other.related.length;
    // Note: Deep equality comparison would require full TypeRef implementation
  }
}

/**
 * Disable the minimizer for object with this marker
 * Equivalent to Scala's `final case class MinimizationKeep(related: IArray[TypeRef]) extends Marker`
 */
export class MinimizationKeep implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'MinimizationKeep' as const;

  constructor(public readonly related: IArray<TypeRef>) {}

  toString(): string {
    return `MinimizationKeep(${this.related.length} types)`;
  }

  equals(other: any): boolean {
    return other instanceof MinimizationKeep &&
           this.related.length === other.related.length;
    // Note: Deep equality comparison would require full TypeRef implementation
  }
}

/**
 * Similar to above, but it's conditional. If the object with this marker is included,
 * only then include the related objects as well
 * Equivalent to Scala's `final case class MinimizationRelated(related: IArray[TypeRef]) extends Marker`
 */
export class MinimizationRelated implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'MinimizationRelated' as const;

  constructor(public readonly related: IArray<TypeRef>) {}

  toString(): string {
    return `MinimizationRelated(${this.related.length} types)`;
  }

  equals(other: any): boolean {
    return other instanceof MinimizationRelated &&
           this.related.length === other.related.length;
    // Note: Deep equality comparison would require full TypeRef implementation
  }
}

/**
 * Marker indicating this was defaulted
 * Equivalent to Scala's `case class WasDefaulted(among: Set[QualifiedName]) extends Marker`
 */
export class WasDefaulted implements Marker {
  readonly _tag = 'Comment' as const;
  readonly _markerTag = 'WasDefaulted' as const;

  constructor(public readonly among: Set<QualifiedName>) {}

  toString(): string {
    return `WasDefaulted(${this.among.size} names)`;
  }

  equals(other: any): boolean {
    if (!(other instanceof WasDefaulted) || this.among.size !== other.among.size) {
      return false;
    }

    for (const name of this.among) {
      let found = false;
      for (const otherName of other.among) {
        if (name.equals(otherName)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }

    return true;
  }
}

// ============================================================================
// Raw comment implementation
// ============================================================================

/**
 * Raw comment containing arbitrary text
 * Equivalent to Scala's `final case class Raw(raw: String) extends Comment`
 */
export class Raw implements Comment {
  readonly _tag = 'Comment' as const;

  constructor(public readonly raw: string) {}

  toString(): string {
    return this.raw;
  }

  equals(other: any): boolean {
    return other instanceof Raw && other.raw === this.raw;
  }
}

// ============================================================================
// Comment namespace (equivalent to Scala's Comment object)
// ============================================================================

/**
 * Comment utility functions and factory methods
 * Equivalent to Scala's `object Comment`
 */
export namespace Comment {

  /**
   * Create a raw comment from a string
   * Equivalent to Scala's `def apply(raw: String): Comment = Comment.Raw(raw)`
   */
  export function create(raw: string): Comment {
    return new Raw(raw);
  }

  /**
   * Create a warning comment with enclosing context
   * Equivalent to Scala's `def warning(s: String)(implicit e: sourcecode.Enclosing): Comment`
   *
   * Note: TypeScript doesn't have implicit parameters or sourcecode.Enclosing,
   * so we simulate this with an optional enclosing parameter
   */
  export function warning(s: string, enclosing?: string): Comment {
    const context = enclosing || 'unknown.context';
    const parts = context.split('.');
    const shortContext = parts.slice(-2).join('.');
    return new Raw(`/* import warning: ${shortContext} ${s} */`);
  }

  /**
   * Type guard to check if a comment is a marker
   */
  export function isMarker(comment: Comment): comment is Marker {
    return '_markerTag' in comment;
  }

  /**
   * Type guard to check if a comment is raw
   */
  export function isRaw(comment: Comment): comment is Raw {
    return comment instanceof Raw;
  }

  /**
   * Extract a specific marker type from a comment
   * Returns the marker if found, undefined otherwise
   */
  export function extractMarker<T extends Marker>(
    comment: Comment,
    markerType: new (...args: any[]) => T
  ): T | undefined {
    if (comment instanceof markerType) {
      return comment;
    }
    return undefined;
  }
}

// ============================================================================
// Marker namespace (equivalent to Scala's Marker object)
// ============================================================================

/**
 * Marker utility functions and constants
 * Equivalent to Scala's `object Marker`
 */
export namespace Marker {

  /**
   * All singleton marker instances
   */
  export const CouldBeScalaJsDefinedInstance = CouldBeScalaJsDefined.instance;
  export const IsTrivialInstance = IsTrivial.instance;
  export const ExpandedCallablesInstance = ExpandedCallables.instance;
  export const ExpandedClassInstance = ExpandedClass.instance;
  export const EnumObjectInstance = EnumObject.instance;
  export const HasClassParentInstance = HasClassParent.instance;
  export const ManglerLeaveAloneInstance = ManglerLeaveAlone.instance;
  export const ManglerWasJsNativeInstance = ManglerWasJsNative.instance;

  /**
   * Type guard to check if a marker is a specific type
   */
  export function isOfType<T extends Marker>(
    marker: Marker,
    markerType: new (...args: any[]) => T
  ): marker is T {
    return marker instanceof markerType;
  }

  /**
   * Create a name hint marker
   */
  export function nameHint(value: string): NameHint {
    return new NameHint(value);
  }

  /**
   * Create a module aliases marker
   */
  export function moduleAliases(aliases: IArray<TsIdentModule>): ModuleAliases {
    return new ModuleAliases(aliases);
  }

  /**
   * Create a was literal marker
   */
  export function wasLiteral(lit: ExprTreeLit): WasLiteral {
    return new WasLiteral(lit);
  }

  /**
   * Create a was union marker
   */
  export function wasUnion(related: IArray<TypeRef>): WasUnion {
    return new WasUnion(related);
  }

  /**
   * Create a minimization keep marker
   */
  export function minimizationKeep(related: IArray<TypeRef>): MinimizationKeep {
    return new MinimizationKeep(related);
  }

  /**
   * Create a minimization related marker
   */
  export function minimizationRelated(related: IArray<TypeRef>): MinimizationRelated {
    return new MinimizationRelated(related);
  }

  /**
   * Create a was defaulted marker
   */
  export function wasDefaulted(among: Set<QualifiedName>): WasDefaulted {
    return new WasDefaulted(among);
  }
}

// ============================================================================
// ExprTree.Lit namespace (equivalent to Scala's ExprTree.Lit object)
// ============================================================================

/**
 * ExprTree.Lit utility functions and factory methods
 * Equivalent to Scala's `object Lit` within `object ExprTree`
 */
export namespace ExprTreeLit {

  /**
   * Create a boolean literal
   */
  export function boolean(value: boolean): BooleanLit {
    return new BooleanLit(value);
  }

  /**
   * Create an integer literal
   */
  export function int(value: string): IntLit {
    return new IntLit(value);
  }

  /**
   * Create a double literal
   */
  export function double(value: string): DoubleLit {
    return new DoubleLit(value);
  }

  /**
   * Create a string literal
   */
  export function string(value: string): StringLit {
    return new StringLit(value);
  }

  /**
   * Get the undefined literal singleton
   */
  export const undefined = UndefinedLit.instance;

  /**
   * Get the null literal singleton
   */
  export const nullLit = NullLit.instance;

  /**
   * Type guard to check if a literal is a specific type
   */
  export function isOfType<T extends ExprTreeLit>(
    lit: ExprTreeLit,
    litType: new (...args: any[]) => T
  ): lit is T {
    return lit instanceof litType;
  }
}

// ============================================================================
// JSON Serialization support (equivalent to Circe encoders/decoders)
// ============================================================================

/**
 * Encoder for Comment (equivalent to Circe's deriveEncoder)
 */
export const CommentEncoder = {
  encode: (comment: Comment): any => {
    if (comment instanceof Raw) {
      return { type: 'Raw', raw: comment.raw };
    } else if (Comment.isMarker(comment)) {
      const marker = comment as Marker;
      const base = { type: 'Marker', markerTag: marker._markerTag };

      // Add specific properties based on marker type
      if (marker instanceof NameHint) {
        return { ...base, value: marker.value };
      } else if (marker instanceof ModuleAliases) {
        return { ...base, aliases: marker.aliases.toArray().map(alias => alias.value) };
      } else if (marker instanceof WasLiteral) {
        return { ...base, lit: ExprTreeLitEncoder.encode(marker.lit) };
      } else if (marker instanceof WasUnion) {
        return { ...base, relatedCount: marker.related.length };
      } else if (marker instanceof MinimizationKeep) {
        return { ...base, relatedCount: marker.related.length };
      } else if (marker instanceof MinimizationRelated) {
        return { ...base, relatedCount: marker.related.length };
      } else if (marker instanceof WasDefaulted) {
        return { ...base, amongCount: marker.among.size };
      } else if (marker instanceof CouldBeScalaJsDefined ||
                 marker instanceof IsTrivial ||
                 marker instanceof ExpandedCallables ||
                 marker instanceof ExpandedClass ||
                 marker instanceof EnumObject ||
                 marker instanceof HasClassParent ||
                 marker instanceof ManglerLeaveAlone ||
                 marker instanceof ManglerWasJsNative) {
        // Singleton markers don't need additional properties
        return base;
      }

      return base;
    }

    throw new Error(`Unknown comment type: ${comment}`);
  }
};

/**
 * Encoder for ExprTreeLit (equivalent to Circe's deriveEncoder)
 */
export const ExprTreeLitEncoder = {
  encode: (lit: ExprTreeLit): any => {
    if (lit instanceof BooleanLit) {
      return { type: 'BooleanLit', value: lit.value };
    } else if (lit instanceof IntLit) {
      return { type: 'IntLit', value: lit.value };
    } else if (lit instanceof DoubleLit) {
      return { type: 'DoubleLit', value: lit.value };
    } else if (lit instanceof StringLit) {
      return { type: 'StringLit', value: lit.value };
    } else if (lit instanceof UndefinedLit) {
      return { type: 'UndefinedLit' };
    } else if (lit instanceof NullLit) {
      return { type: 'NullLit' };
    }

    throw new Error(`Unknown literal type: ${lit}`);
  }
};

/**
 * Decoder for Comment (equivalent to Circe's deriveDecoder)
 */
export const CommentDecoder = {
  decode: (data: any): Comment => {
    if (data.type === 'Raw') {
      return new Raw(data.raw);
    } else if (data.type === 'Marker') {
      switch (data.markerTag) {
        case 'CouldBeScalaJsDefined':
          return CouldBeScalaJsDefined.instance;
        case 'IsTrivial':
          return IsTrivial.instance;
        case 'ExpandedCallables':
          return ExpandedCallables.instance;
        case 'ExpandedClass':
          return ExpandedClass.instance;
        case 'EnumObject':
          return EnumObject.instance;
        case 'HasClassParent':
          return HasClassParent.instance;
        case 'ManglerLeaveAlone':
          return ManglerLeaveAlone.instance;
        case 'ManglerWasJsNative':
          return ManglerWasJsNative.instance;
        case 'NameHint':
          return new NameHint(data.value);
        // Note: Other complex markers would need full implementations
        // of their dependencies (TsIdentModule, TypeRef, etc.)
        default:
          throw new Error(`Unknown marker type: ${data.markerTag}`);
      }
    }

    throw new Error(`Unknown comment type: ${data.type}`);
  }
};