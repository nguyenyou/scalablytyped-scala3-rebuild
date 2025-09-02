/**
 * TypeScript port of org.scalablytyped.converter.internal.scalajs.Annotation
 *
 * Complete port of Scala.js annotations with functional programming patterns using fp-ts
 */

import { IArray } from '../IArray.js';
import { Name } from './Name.js';
import { QualifiedName } from './QualifiedName.js';
import { Option } from 'fp-ts/Option';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

// ============================================================================
// Base Annotation Types
// ============================================================================

/**
 * Base interface for all annotations
 * Equivalent to Scala's sealed trait Annotation extends Product with Serializable
 */
export interface Annotation {
  readonly _tag: string;
}

/**
 * Base interface for location annotations
 * Equivalent to Scala's sealed trait LocationAnnotation extends Annotation
 */
export interface LocationAnnotation extends Annotation {}

// ============================================================================
// Imported Types
// ============================================================================

/**
 * Represents different import types in Scala.js
 * Equivalent to Scala's sealed trait Imported
 */
export type Imported =
  | { readonly _tag: 'Namespace' }
  | { readonly _tag: 'Default' }
  | { readonly _tag: 'Named'; readonly name: IArray<Name> };

/**
 * Imported constructors and utilities
 */
export const Imported = {
  /**
   * Namespace import
   * Equivalent to Scala's case object Namespace extends Imported
   */
  Namespace: { _tag: 'Namespace' as const },

  /**
   * Default import
   * Equivalent to Scala's case object Default extends Imported
   */
  Default: { _tag: 'Default' as const },

  /**
   * Named import with specific names
   * Equivalent to Scala's case class Named(name: IArray[Name]) extends Imported
   */
  Named: (name: IArray<Name>): Imported => ({
    _tag: 'Named',
    name
  }),

  /**
   * Type guard for Namespace
   */
  isNamespace: (imported: Imported): imported is { readonly _tag: 'Namespace' } =>
    imported._tag === 'Namespace',

  /**
   * Type guard for Default
   */
  isDefault: (imported: Imported): imported is { readonly _tag: 'Default' } =>
    imported._tag === 'Default',

  /**
   * Type guard for Named
   */
  isNamed: (imported: Imported): imported is { readonly _tag: 'Named'; readonly name: IArray<Name> } =>
    imported._tag === 'Named'
};

// ============================================================================
// Specific Annotation Types
// ============================================================================

/**
 * @JSBracketAccess annotation
 * Equivalent to Scala's case object JsBracketAccess extends Annotation
 */
export interface JsBracketAccessAnnotation extends Annotation {
  readonly _tag: 'JsBracketAccess';
}

/**
 * @JSBracketCall annotation
 * Equivalent to Scala's case object JsBracketCall extends Annotation
 */
export interface JsBracketCallAnnotation extends Annotation {
  readonly _tag: 'JsBracketCall';
}

/**
 * @js.native annotation
 * Equivalent to Scala's case object JsNative extends Annotation
 */
export interface JsNativeAnnotation extends Annotation {
  readonly _tag: 'JsNative';
}

/**
 * @ScalaJSDefined annotation
 * Equivalent to Scala's case object ScalaJSDefined extends Annotation
 */
export interface ScalaJSDefinedAnnotation extends Annotation {
  readonly _tag: 'ScalaJSDefined';
}

/**
 * @JSGlobalScope annotation
 * Equivalent to Scala's case object JsGlobalScope extends LocationAnnotation
 */
export interface JsGlobalScopeAnnotation extends LocationAnnotation {
  readonly _tag: 'JsGlobalScope';
}

/**
 * @inline annotation
 * Equivalent to Scala's case object Inline extends Annotation
 */
export interface InlineAnnotation extends Annotation {
  readonly _tag: 'Inline';
}

/**
 * @JSName annotation with a name
 * Equivalent to Scala's case class JsName(name: Name) extends Annotation
 */
export interface JsNameAnnotation extends Annotation {
  readonly _tag: 'JsName';
  readonly name: Name;
}

/**
 * @JSNameSymbol annotation with a qualified name
 * Equivalent to Scala's case class JsNameSymbol(name: QualifiedName) extends Annotation
 */
export interface JsNameSymbolAnnotation extends Annotation {
  readonly _tag: 'JsNameSymbol';
  readonly name: QualifiedName;
}

/**
 * @JSImport annotation
 * Equivalent to Scala's case class JsImport(module: String, imported: Imported, global: Option[JsGlobal]) extends LocationAnnotation
 */
export interface JsImportAnnotation extends LocationAnnotation {
  readonly _tag: 'JsImport';
  readonly module: string;
  readonly imported: Imported;
  readonly global: Option<JsGlobalAnnotation>;
}

/**
 * @JSGlobal annotation
 * Equivalent to Scala's case class JsGlobal(name: QualifiedName) extends LocationAnnotation
 */
export interface JsGlobalAnnotation extends LocationAnnotation {
  readonly _tag: 'JsGlobal';
  readonly name: QualifiedName;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Union type for all possible annotations
 * This provides exhaustive pattern matching capabilities
 */
export type AnnotationUnion =
  | JsBracketAccessAnnotation
  | JsBracketCallAnnotation
  | JsNativeAnnotation
  | ScalaJSDefinedAnnotation
  | JsGlobalScopeAnnotation
  | InlineAnnotation
  | JsNameAnnotation
  | JsNameSymbolAnnotation
  | JsImportAnnotation
  | JsGlobalAnnotation;

/**
 * Union type for all location annotations
 */
export type LocationAnnotationUnion =
  | JsGlobalScopeAnnotation
  | JsImportAnnotation
  | JsGlobalAnnotation;

// ============================================================================
// Constructors and Utilities
// ============================================================================

/**
 * JsGlobal utilities
 * Equivalent to Scala's object JsGlobal
 */
export const JsGlobal = {
  /**
   * Create a JsGlobal annotation
   */
  create: (name: QualifiedName): JsGlobalAnnotation => ({
    _tag: 'JsGlobal',
    name
  }),

  /**
   * Type guard for JsGlobal
   */
  isJsGlobal: (annotation: AnnotationUnion): annotation is JsGlobalAnnotation =>
    annotation._tag === 'JsGlobal'
};

/**
 * Main Annotation object with constructors and utilities
 * Equivalent to Scala's object Annotation
 */
export const Annotation = {
  // ============================================================================
  // Simple annotation constructors (case objects)
  // ============================================================================

  /**
   * @JSBracketAccess annotation
   * Equivalent to Scala's case object JsBracketAccess extends Annotation
   */
  JsBracketAccess: { _tag: 'JsBracketAccess' as const },

  /**
   * @JSBracketCall annotation
   * Equivalent to Scala's case object JsBracketCall extends Annotation
   */
  JsBracketCall: { _tag: 'JsBracketCall' as const },

  /**
   * @js.native annotation
   * Equivalent to Scala's case object JsNative extends Annotation
   */
  JsNative: { _tag: 'JsNative' as const },

  /**
   * @ScalaJSDefined annotation
   * Equivalent to Scala's case object ScalaJSDefined extends Annotation
   */
  ScalaJSDefined: { _tag: 'ScalaJSDefined' as const },

  /**
   * @JSGlobalScope annotation
   * Equivalent to Scala's case object JsGlobalScope extends LocationAnnotation
   */
  JsGlobalScope: { _tag: 'JsGlobalScope' as const },

  /**
   * @inline annotation
   * Equivalent to Scala's case object Inline extends Annotation
   */
  Inline: { _tag: 'Inline' as const },

  // ============================================================================
  // Complex annotation constructors (case classes)
  // ============================================================================

  /**
   * Create a @JSName annotation
   * Equivalent to Scala's case class JsName(name: Name) extends Annotation
   */
  JsName: (name: Name): JsNameAnnotation => ({
    _tag: 'JsName',
    name
  }),

  /**
   * Create a @JSNameSymbol annotation
   * Equivalent to Scala's case class JsNameSymbol(name: QualifiedName) extends Annotation
   */
  JsNameSymbol: (name: QualifiedName): JsNameSymbolAnnotation => ({
    _tag: 'JsNameSymbol',
    name
  }),

  /**
   * Create a @JSImport annotation
   * Equivalent to Scala's case class JsImport(module: String, imported: Imported, global: Option[JsGlobal]) extends LocationAnnotation
   */
  JsImport: (module: string, imported: Imported, global: Option<JsGlobalAnnotation> = O.none): JsImportAnnotation => ({
    _tag: 'JsImport',
    module,
    imported,
    global
  }),

  /**
   * Create a @JSGlobal annotation
   * Equivalent to Scala's case class JsGlobal(name: QualifiedName) extends LocationAnnotation
   */
  JsGlobal: (name: QualifiedName): JsGlobalAnnotation => ({
    _tag: 'JsGlobal',
    name
  }),

  // ============================================================================
  // Type Guards
  // ============================================================================

  /**
   * Type guard for JsBracketAccess
   */
  isJsBracketAccess: (annotation: AnnotationUnion): annotation is JsBracketAccessAnnotation =>
    annotation._tag === 'JsBracketAccess',

  /**
   * Type guard for JsBracketCall
   */
  isJsBracketCall: (annotation: AnnotationUnion): annotation is JsBracketCallAnnotation =>
    annotation._tag === 'JsBracketCall',

  /**
   * Type guard for JsNative
   */
  isJsNative: (annotation: AnnotationUnion): annotation is JsNativeAnnotation =>
    annotation._tag === 'JsNative',

  /**
   * Type guard for ScalaJSDefined
   */
  isScalaJSDefined: (annotation: AnnotationUnion): annotation is ScalaJSDefinedAnnotation =>
    annotation._tag === 'ScalaJSDefined',

  /**
   * Type guard for JsGlobalScope
   */
  isJsGlobalScope: (annotation: AnnotationUnion): annotation is JsGlobalScopeAnnotation =>
    annotation._tag === 'JsGlobalScope',

  /**
   * Type guard for Inline
   */
  isInline: (annotation: AnnotationUnion): annotation is InlineAnnotation =>
    annotation._tag === 'Inline',

  /**
   * Type guard for JsName
   */
  isJsName: (annotation: AnnotationUnion): annotation is JsNameAnnotation =>
    annotation._tag === 'JsName',

  /**
   * Type guard for JsNameSymbol
   */
  isJsNameSymbol: (annotation: AnnotationUnion): annotation is JsNameSymbolAnnotation =>
    annotation._tag === 'JsNameSymbol',

  /**
   * Type guard for JsImport
   */
  isJsImport: (annotation: AnnotationUnion): annotation is JsImportAnnotation =>
    annotation._tag === 'JsImport',

  /**
   * Type guard for JsGlobal
   */
  isJsGlobal: (annotation: AnnotationUnion): annotation is JsGlobalAnnotation =>
    annotation._tag === 'JsGlobal',

  /**
   * Type guard for LocationAnnotation
   */
  isLocationAnnotation: (annotation: AnnotationUnion): annotation is LocationAnnotationUnion =>
    annotation._tag === 'JsGlobalScope' ||
    annotation._tag === 'JsImport' ||
    annotation._tag === 'JsGlobal',

  // ============================================================================
  // Core Functions
  // ============================================================================

  /**
   * Rename annotations based on a new name
   * Equivalent to Scala's def renamedFrom(newName: Name)(oldAnnotations: IArray[Annotation]): IArray[Annotation]
   *
   * This function partitions annotations into names and others, then updates the names
   * based on the new name provided, following the same logic as the Scala implementation.
   */
  renamedFrom: (newName: Name) => (oldAnnotations: IArray<AnnotationUnion>): IArray<AnnotationUnion> => {
    // Partition annotations into names and others
    // Equivalent to Scala's partition logic
    const { names, others } = pipe(
      oldAnnotations,
      (annotations) => {
        const names: AnnotationUnion[] = [];
        const others: AnnotationUnion[] = [];

        for (let i = 0; i < annotations.length; i++) {
          const annotation = annotations.apply(i);

          // Check if annotation should be in names group
          // Equivalent to Scala's case _: JsName | _: JsNameSymbol | JsBracketCall | (_: LocationAnnotation) => true
          if (Annotation.isJsName(annotation) ||
              Annotation.isJsNameSymbol(annotation) ||
              Annotation.isJsBracketCall(annotation) ||
              Annotation.isLocationAnnotation(annotation)) {
            names.push(annotation);
          } else {
            others.push(annotation);
          }
        }

        return {
          names: IArray.fromArray(names),
          others: IArray.fromArray(others)
        };
      }
    );

    // Update names based on the new name
    // Equivalent to Scala's pattern matching on (names, newName)
    const updatedNames: IArray<AnnotationUnion> = (() => {
      // Check if names is empty and newName is APPLY or namespaced
      // In Scala: case (Empty, n @ (Name.APPLY | Name.namespaced)) => sys.error(s"Cannot rename `$n`")
      if (names.isEmpty && (newName.equals(Name.APPLY) || newName.equals(Name.namespaced))) {
        // Equivalent to Scala's sys.error(s"Cannot rename `$n`")
        throw new Error(`Cannot rename \`${newName.unescaped}\``);
      }

      // If names is empty, create JsName with old name
      // Equivalent to Scala's case (Empty, old) => IArray(JsName(old))
      if (names.isEmpty) {
        return IArray.fromArray([Annotation.JsName(newName)]) as IArray<AnnotationUnion>;
      }

      // If names exist, keep existing
      // Equivalent to Scala's case (existing, _) => existing
      return names;
    })();

    // Combine others and updated names
    // Equivalent to Scala's others ++ updatedNames
    return others.concat(updatedNames);
  },

  // ============================================================================
  // Additional Utility Functions
  // ============================================================================

  /**
   * Check if an annotation array contains any location annotations
   */
  hasLocationAnnotation: (annotations: IArray<AnnotationUnion>): boolean => {
    for (let i = 0; i < annotations.length; i++) {
      if (Annotation.isLocationAnnotation(annotations.apply(i))) {
        return true;
      }
    }
    return false;
  },

  /**
   * Extract all location annotations from an annotation array
   */
  getLocationAnnotations: (annotations: IArray<AnnotationUnion>): IArray<LocationAnnotationUnion> => {
    const locationAnnotations: LocationAnnotationUnion[] = [];
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations.apply(i);
      if (Annotation.isLocationAnnotation(annotation)) {
        locationAnnotations.push(annotation);
      }
    }
    return IArray.fromArray(locationAnnotations);
  },

  /**
   * Extract the first JsName annotation if present
   */
  getJsName: (annotations: IArray<AnnotationUnion>): Option<JsNameAnnotation> => {
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations.apply(i);
      if (Annotation.isJsName(annotation)) {
        return O.some(annotation);
      }
    }
    return O.none;
  },

  /**
   * Extract the first JsGlobal annotation if present
   */
  getJsGlobal: (annotations: IArray<AnnotationUnion>): Option<JsGlobalAnnotation> => {
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations.apply(i);
      if (Annotation.isJsGlobal(annotation)) {
        return O.some(annotation);
      }
    }
    return O.none;
  },

  /**
   * Extract the first JsImport annotation if present
   */
  getJsImport: (annotations: IArray<AnnotationUnion>): Option<JsImportAnnotation> => {
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations.apply(i);
      if (Annotation.isJsImport(annotation)) {
        return O.some(annotation);
      }
    }
    return O.none;
  }
};