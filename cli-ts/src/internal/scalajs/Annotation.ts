/**
 * TypeScript port of org.scalablytyped.converter.internal.scalajs.Annotation
 * 
 * Represents annotations in Scala.js code
 */

/**
 * Base interface for all annotations
 */
export interface Annotation {
  readonly type: string;
}

/**
 * @js.native annotation
 */
export interface JsNativeAnnotation extends Annotation {
  readonly type: 'JsNative';
}

/**
 * @ScalaJSDefined annotation
 */
export interface ScalaJSDefinedAnnotation extends Annotation {
  readonly type: 'ScalaJSDefined';
}

/**
 * @js.annotation.JSImport annotation
 */
export interface JsImportAnnotation extends Annotation {
  readonly type: 'JsImport';
  readonly module: string;
  readonly name: string;
}

/**
 * Utility object for creating annotations
 */
export const Annotation = {
  /**
   * Create a @js.native annotation
   */
  JsNative: (): JsNativeAnnotation => ({
    type: 'JsNative'
  }),

  /**
   * Create a @ScalaJSDefined annotation
   */
  ScalaJSDefined: (): ScalaJSDefinedAnnotation => ({
    type: 'ScalaJSDefined'
  }),

  /**
   * Create a @js.annotation.JSImport annotation
   */
  JsImport: (module: string, name: string): JsImportAnnotation => ({
    type: 'JsImport',
    module,
    name
  })
};
