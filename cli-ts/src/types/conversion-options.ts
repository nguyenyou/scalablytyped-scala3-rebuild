/**
 * Configuration options for the TypeScript to Scala.js conversion process
 * Equivalent to Scala ConversionOptions
 */
export interface ConversionOptions {
  /** Whether to use ScalaJS DOM types */
  useScalaJsDomTypes: boolean;
  
  /** Output package name for generated Scala code */
  outputPackage: string;
  
  /** Conversion flavour to apply */
  flavour: Flavour;
  
  /** Selection of libraries to enable ScalaJS defined types for */
  enableScalaJsDefined: Selection;
  
  /** Libraries to ignore during conversion */
  ignored: Set<string>;
  
  /** Standard libraries to include */
  stdLibs: Set<string>;
  
  /** Version configuration for Scala and ScalaJS */
  versions: Versions;
  
  /** Selection of libraries to expand type mappings for */
  expandTypeMappings: Selection;
  
  /** Whether to enable long apply method generation */
  enableLongApplyMethod: boolean;
  
  /** Private within scope configuration */
  privateWithin?: string;
  
  /** Whether to use deprecated module names */
  useDeprecatedModuleNames: boolean;
}

/**
 * Flavour types for conversion
 */
export type Flavour = 'Normal' | 'Japgolly' | 'SlinkyNative';

/**
 * Selection types for library-specific options
 */
export type Selection = 'All' | 'None' | 'DefaultSelection';

/**
 * Version configuration
 */
export interface Versions {
  /** Scala version to target */
  scala: 'Scala3' | 'Scala2_13' | 'Scala2_12';
  
  /** ScalaJS version to target */
  scalaJs: 'ScalaJs1' | 'ScalaJs0_6';
}

/**
 * Library version calculation strategy
 */
export type CalculateLibraryVersion = 'PackageJsonOnly' | 'GitCommit' | 'Constant';

/**
 * Type mapping expansion configuration
 */
export type EnabledTypeMappingExpansion = 'DefaultSelection' | 'All' | 'None';
