/**
 * Name mapping systems for TypeScript-to-Scala.js conversion
 * Equivalent to ScalaJsDomNames, ScalaJsLibNames, and CastConversion
 */

import { ScalaQualifiedName, ScalaTypeRef } from '../types/scala-ast.js';
import { TsQIdent, Comments, IArray } from '../types/index.js';

/**
 * Type conversion mapping
 * Equivalent to Scala CastConversion
 */
export class TypeConversionMapping {
  constructor(
    public readonly from: ScalaQualifiedName,
    public readonly to: ScalaQualifiedName,
    public readonly typeParamMapping?: TypeParamMapping[]
  ) {}
}

/**
 * Type parameter mapping for generic conversions
 */
export interface TypeParamMapping {
  sourceIndex: number;
  targetIndex: number;
  constraint?: ScalaQualifiedName;
}

/**
 * Scala.js library name mappings
 * Equivalent to ScalaJsLibNames
 */
export class ScalaJsLibNames {
  constructor(private readonly outputPkg: string) {}

  /**
   * Core JavaScript type mappings to scala.scalajs.js.*
   */
  readonly coreTypeMappings: TypeConversionMapping[] = [
    // Typed Arrays
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'ArrayBuffer']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'typedarray', 'ArrayBuffer'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'ArrayBufferView']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'typedarray', 'ArrayBufferView'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'DataView']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'typedarray', 'DataView'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Int8Array']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'typedarray', 'Int8Array'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Uint8Array']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'typedarray', 'Uint8Array'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Float32Array']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'typedarray', 'Float32Array'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Float64Array']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'typedarray', 'Float64Array'])
    ),

    // Core JS Types
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Date']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Date'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Error']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Error'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'EvalError']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'EvalError'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'RangeError']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'RangeError'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'ReferenceError']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'ReferenceError'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'SyntaxError']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'SyntaxError'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'TypeError']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'TypeError'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'URIError']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'URIError'])
    ),

    // Collections
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Array']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Array']),
      [{ sourceIndex: 0, targetIndex: 0 }]
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Map']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Map']),
      [{ sourceIndex: 0, targetIndex: 0 }, { sourceIndex: 1, targetIndex: 1 }]
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Set']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Set']),
      [{ sourceIndex: 0, targetIndex: 0 }]
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'WeakMap']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'WeakMap']),
      [{ sourceIndex: 0, targetIndex: 0 }, { sourceIndex: 1, targetIndex: 1 }]
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'WeakSet']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'WeakSet']),
      [{ sourceIndex: 0, targetIndex: 0 }]
    ),

    // Promises and Async
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Promise']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Promise']),
      [{ sourceIndex: 0, targetIndex: 0 }]
    ),

    // Regular Expressions
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'RegExp']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'RegExp'])
    ),

    // JSON
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'JSON']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'JSON'])
    ),

    // Symbols
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Symbol']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Symbol'])
    ),

    // Iterators
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Iterator']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Iterator']),
      [{ sourceIndex: 0, targetIndex: 0 }]
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Iterable']),
      ScalaQualifiedName.from(['scala', 'scalajs', 'js', 'Iterable']),
      [{ sourceIndex: 0, targetIndex: 0 }]
    )
  ];

  /**
   * Get mapping for a qualified name
   */
  getMappingFor(qualifiedName: ScalaQualifiedName): TypeConversionMapping | undefined {
    return this.coreTypeMappings.find(mapping => 
      this.qualifiedNamesEqual(mapping.from, qualifiedName)
    );
  }

  /**
   * Apply mapping to a type reference
   */
  applyMapping(typeRef: ScalaTypeRef): ScalaTypeRef {
    const mapping = this.getMappingFor(typeRef.typeName);
    if (!mapping) return typeRef;

    // Apply type parameter mappings
    let newTypeArgs = typeRef.targs;
    if (mapping.typeParamMapping && typeRef.targs.length > 0) {
      const mappedArgs: ScalaTypeRef[] = [];
      for (const paramMapping of mapping.typeParamMapping) {
        if (paramMapping.sourceIndex < typeRef.targs.length) {
          mappedArgs[paramMapping.targetIndex] = typeRef.targs[paramMapping.sourceIndex];
        }
      }
      newTypeArgs = IArray.from(mappedArgs);
    }

    return new ScalaTypeRef(
      mapping.to,
      newTypeArgs,
      typeRef.comments
    );
  }

  private qualifiedNamesEqual(a: ScalaQualifiedName, b: ScalaQualifiedName): boolean {
    return a.parts.length === b.parts.length &&
           a.parts.every((part, index) => part === b.parts[index]);
  }
}

/**
 * Scala.js DOM name mappings
 * Equivalent to ScalaJsDomNames
 */
export class ScalaJsDomNames {
  constructor(private readonly outputPkg: string) {}

  /**
   * DOM type mappings to org.scalajs.dom.*
   * This is a subset - the full list would include ~500 mappings
   */
  readonly domTypeMappings: TypeConversionMapping[] = [
    // Core DOM interfaces
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Element']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'Element'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'HTMLElement']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'HTMLElement'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Document']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'Document'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Window']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'Window'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Node']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'Node'])
    ),

    // HTML Elements
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'HTMLDivElement']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'HTMLDivElement'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'HTMLInputElement']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'HTMLInputElement'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'HTMLButtonElement']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'HTMLButtonElement'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'HTMLFormElement']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'HTMLFormElement'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'HTMLImageElement']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'HTMLImageElement'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'HTMLAnchorElement']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'HTMLAnchorElement'])
    ),

    // Events
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Event']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'Event'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'MouseEvent']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'MouseEvent'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'KeyboardEvent']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'KeyboardEvent'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'TouchEvent']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'TouchEvent'])
    ),

    // Web APIs
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'XMLHttpRequest']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'XMLHttpRequest'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'WebSocket']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'WebSocket'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Worker']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'Worker'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'ServiceWorker']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'ServiceWorker'])
    ),

    // Canvas and Graphics
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'HTMLCanvasElement']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'HTMLCanvasElement'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'CanvasRenderingContext2D']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'CanvasRenderingContext2D'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'WebGLRenderingContext']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'WebGLRenderingContext'])
    ),

    // Storage
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'Storage']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'Storage'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'localStorage']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'localStorage'])
    ),
    new TypeConversionMapping(
      ScalaQualifiedName.from([this.outputPkg, 'std', 'sessionStorage']),
      ScalaQualifiedName.from(['org', 'scalajs', 'dom', 'sessionStorage'])
    )
  ];

  /**
   * Get all DOM element types for special handling
   */
  get allElementTypes(): Set<ScalaQualifiedName> {
    return new Set(
      this.domTypeMappings
        .filter(mapping => mapping.to.parts[mapping.to.parts.length - 1].endsWith('Element'))
        .map(mapping => mapping.to)
    );
  }

  /**
   * Get mapping for a qualified name
   */
  getMappingFor(qualifiedName: ScalaQualifiedName): TypeConversionMapping | undefined {
    return this.domTypeMappings.find(mapping => 
      this.qualifiedNamesEqual(mapping.from, qualifiedName)
    );
  }

  /**
   * Apply mapping to a type reference
   */
  applyMapping(typeRef: ScalaTypeRef): ScalaTypeRef {
    const mapping = this.getMappingFor(typeRef.typeName);
    if (!mapping) return typeRef;

    return new ScalaTypeRef(
      mapping.to,
      typeRef.targs,
      typeRef.comments
    );
  }

  private qualifiedNamesEqual(a: ScalaQualifiedName, b: ScalaQualifiedName): boolean {
    return a.parts.length === b.parts.length &&
           a.parts.every((part, index) => part === b.parts[index]);
  }
}

/**
 * Adaptive naming system for handling conflicts and illegal names
 * Equivalent to AdaptiveNamingImport
 */
export class AdaptiveNaming {
  private readonly nameMapping = new Map<string, ScalaQualifiedName>();
  private readonly usedNames = new Set<string>();

  constructor(
    private readonly outputPkg: string,
    private readonly cleanIllegalNames: boolean = true
  ) {}

  /**
   * Get or create a Scala-compatible name for a TypeScript qualified identifier
   */
  getScalaName(tsQIdent: TsQIdent): ScalaQualifiedName {
    const key = tsQIdent.parts.join('.');
    
    if (this.nameMapping.has(key)) {
      return this.nameMapping.get(key)!;
    }

    const scalaName = this.createScalaName(tsQIdent);
    this.nameMapping.set(key, scalaName);
    return scalaName;
  }

  private createScalaName(tsQIdent: TsQIdent): ScalaQualifiedName {
    const parts = tsQIdent.parts.map(part => this.sanitizeScalaName(part));
    const qualifiedName = ScalaQualifiedName.from([this.outputPkg, ...parts]);
    
    // Handle naming conflicts
    const baseName = qualifiedName.parts.join('.');
    let finalName = baseName;
    let counter = 1;
    
    while (this.usedNames.has(finalName.toLowerCase())) {
      finalName = `${baseName}_${counter}`;
      counter++;
    }
    
    this.usedNames.add(finalName.toLowerCase());
    
    if (finalName !== baseName) {
      const newParts = finalName.split('.');
      return ScalaQualifiedName.from(newParts);
    }
    
    return qualifiedName;
  }

  private sanitizeScalaName(name: string): string {
    if (!this.cleanIllegalNames) return name;

    // Handle Scala reserved words
    const scalaKeywords = new Set([
      'abstract', 'case', 'catch', 'class', 'def', 'do', 'else', 'extends',
      'false', 'final', 'finally', 'for', 'forSome', 'if', 'implicit',
      'import', 'lazy', 'match', 'new', 'null', 'object', 'override',
      'package', 'private', 'protected', 'return', 'sealed', 'super',
      'this', 'throw', 'trait', 'try', 'true', 'type', 'val', 'var',
      'while', 'with', 'yield'
    ]);

    // Clean illegal characters
    let cleaned = name.replace(/[^a-zA-Z0-9_$]/g, '_');
    
    // Ensure doesn't start with number
    if (/^[0-9]/.test(cleaned)) {
      cleaned = '_' + cleaned;
    }
    
    // Handle reserved words
    if (scalaKeywords.has(cleaned)) {
      cleaned = `\`${cleaned}\``;
    }
    
    return cleaned;
  }
}

/**
 * Library-specific naming rules
 * Equivalent to LibrarySpecific transformations
 */
export class LibrarySpecificNaming {
  private readonly libraryRules = new Map<string, (name: string) => string>();

  constructor() {
    this.initializeLibraryRules();
  }

  private initializeLibraryRules(): void {
    // React-specific naming rules
    this.libraryRules.set('react', (name: string) => {
      // Convert React component names to PascalCase
      if (name.startsWith('HTML') && name.endsWith('Element')) {
        return name; // Keep HTML element names as-is
      }
      if (name.includes('Props') || name.includes('State')) {
        return name; // Keep Props/State interfaces as-is
      }
      return name;
    });

    // Node.js specific naming rules
    this.libraryRules.set('node', (name: string) => {
      // Handle Node.js module names
      if (name === 'global') return 'NodeGlobal';
      if (name === 'process') return 'NodeProcess';
      return name;
    });

    // DOM-specific naming rules
    this.libraryRules.set('dom', (name: string) => {
      // Handle DOM global names that conflict with Scala
      if (name === 'console') return 'DOMConsole';
      if (name === 'window') return 'DOMWindow';
      return name;
    });
  }

  /**
   * Apply library-specific naming rules
   */
  applyLibraryRules(libraryName: string, name: string): string {
    const rule = this.libraryRules.get(libraryName.toLowerCase());
    return rule ? rule(name) : name;
  }

  /**
   * Register custom naming rule for a library
   */
  registerLibraryRule(libraryName: string, rule: (name: string) => string): void {
    this.libraryRules.set(libraryName.toLowerCase(), rule);
  }
}
