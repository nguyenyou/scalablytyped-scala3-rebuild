/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.ConversionOptions
 */

import { Flavour } from '@/Flavour.ts';
import { TsIdentLibrary } from '../ts/trees.js';

// Selection type - represents a selection criteria for filtering
export abstract class Selection<T> {
  abstract apply(value: T): boolean;
  
  and(other: Selection<T>): Selection<T> {
    return new AndSelection(this, other);
  }
  
  or(other: Selection<T>): Selection<T> {
    return new OrSelection(this, other);
  }
  
  map<U>(f: (value: T) => U): Selection<U> {
    if (this instanceof AllExcept) {
      return new AllExcept(new Set(Array.from(this.values).map(f)));
    } else if (this instanceof NoneExcept) {
      return new NoneExcept(new Set(Array.from(this.values).map(f)));
    } else if (this instanceof AndSelection) {
      return new AndSelection(this._1.map(f), this._2.map(f));
    } else if (this instanceof OrSelection) {
      return new OrSelection(this._1.map(f), this._2.map(f));
    }
    throw new Error('Unknown Selection type');
  }
}

// Selection implementations
export class AllExcept<T> extends Selection<T> {
  constructor(public readonly values: Set<T>) {
    super();
  }
  
  apply(value: T): boolean {
    return !this.values.has(value);
  }
  
  static create<T>(...values: T[]): AllExcept<T> {
    return new AllExcept(new Set(values));
  }
}

export class NoneExcept<T> extends Selection<T> {
  constructor(public readonly values: Set<T>) {
    super();
  }
  
  apply(value: T): boolean {
    return this.values.has(value);
  }
  
  static create<T>(...values: T[]): NoneExcept<T> {
    return new NoneExcept(new Set(values));
  }
}

export class AndSelection<T> extends Selection<T> {
  constructor(public readonly _1: Selection<T>, public readonly _2: Selection<T>) {
    super();
  }
  
  apply(value: T): boolean {
    return this._1.apply(value) && this._2.apply(value);
  }
}

export class OrSelection<T> extends Selection<T> {
  constructor(public readonly _1: Selection<T>, public readonly _2: Selection<T>) {
    super();
  }
  
  apply(value: T): boolean {
    return this._1.apply(value) || this._2.apply(value);
  }
}

// Selection factory functions
export namespace Selection {
  export function All<T>(): Selection<T> {
    return new AllExcept<T>(new Set());
  }
  
  export function None<T>(): Selection<T> {
    return new NoneExcept<T>(new Set());
  }
}

// Name type - represents a Scala identifier name
export class Name {
  constructor(public readonly unescaped: string) {}
  
  withSuffix(suffix: string): Name {
    return new Name(this.unescaped + "_" + suffix);
  }
  
  get value(): string {
    return this.escapeScalaName(this.unescaped);
  }
  
  get isEscaped(): boolean {
    return this.value !== this.unescaped;
  }
  
  // Simplified Scala name escaping
  private escapeScalaName(name: string): string {
    // Basic escaping - in a real implementation this would be more comprehensive
    if (SCALA_KEYWORDS.has(name)) {
      return `\`${name}\``;
    }
    return name;
  }
  
  toString(): string {
    return this.value;
  }
}

// Scala keywords that need escaping
const SCALA_KEYWORDS = new Set([
  'abstract', 'case', 'catch', 'class', 'def', 'do', 'else', 'extends', 'false',
  'final', 'finally', 'for', 'forSome', 'if', 'implicit', 'import', 'lazy',
  'match', 'new', 'null', 'object', 'override', 'package', 'private', 'protected',
  'return', 'sealed', 'super', 'this', 'throw', 'trait', 'try', 'true', 'type',
  'val', 'var', 'while', 'with', 'yield'
]);

// Name constants (subset of the Scala implementation)
export namespace Name {
  export const mod = new Name("mod");
  export const std = new Name("std");
  export const typings = new Name("typings");
  export const global = new Name("global");
}

// Dependency type for versions
export interface Dep {
  organization: string;
  name: string;
  version: string;
  type?: 'scala' | 'java' | 'scalajs';
}

// Versions type - represents Scala and ScalaJS version information
export class ScalaVersion {
  public readonly is3: boolean;
  
  constructor(public readonly scalaVersion: string) {
    this.is3 = scalaVersion.startsWith("3.");
  }
  
  get scalaOrganization(): string {
    return "org.scala-lang";
  }
  
  get binVersion(): string {
    const versionMatch = this.scalaVersion.match(/(\d+)\.(\d+)\.(\d+).*/);
    if (versionMatch) {
      const [, major, minor] = versionMatch;
      if (major === "3") return "3";
      if (major === "2") return `2.${minor}`;
    }
    return this.scalaVersion;
  }
}

export class ScalaJsVersion {
  constructor(public readonly scalaJsVersion: string) {}
  
  get scalaJsBinVersion(): string {
    const versionMatch = this.scalaJsVersion.match(/(\d+)\.(\d+)\.(\d+).*/);
    if (versionMatch) {
      const [, major, minor] = versionMatch;
      if (major === "1") return "1";
      if (major === "0" && minor === "6") return "0.6";
    }
    return this.scalaJsVersion;
  }
  
  get scalaJsOrganization(): string {
    return "org.scala-js";
  }
}

export class Versions {
  public readonly runtime: Dep;
  public readonly scalaJsDom: Dep;
  
  constructor(public readonly scala: ScalaVersion, public readonly scalaJs: ScalaJsVersion) {
    this.runtime = {
      organization: "com.olvind",
      name: "scalablytyped-runtime",
      version: "2.4.2",
      type: "scalajs"
    };
    this.scalaJsDom = {
      organization: "org.scala-js",
      name: "scalajs-dom",
      version: "2.8.0",
      type: "scalajs"
    };
  }
}

// Version constants
export namespace Versions {
  export const Scala212 = new ScalaVersion("2.12.18");
  export const Scala213 = new ScalaVersion("2.13.12");
  export const Scala3 = new ScalaVersion("3.7.2");
  export const ScalaJs1 = new ScalaJsVersion("1.19.0");
}

// FlavourImpl interface - simplified for this port
export interface FlavourImpl {
  useScalaJsDomTypes: boolean;
  enableLongApplyMethod: boolean;
  outputPackage: Name;
  versions: Versions;
}

// Simple NormalFlavour implementation
export class NormalFlavour implements FlavourImpl {
  constructor(
    public readonly useScalaJsDomTypes: boolean,
    public readonly enableLongApplyMethod: boolean,
    public readonly outputPackage: Name,
    public readonly versions: Versions
  ) {}
}

// Main ConversionOptions class
export class ConversionOptions {
  public readonly ignoredLibs: Set<TsIdentLibrary>;
  public readonly ignoredModulePrefixes: Set<string[]>;
  public readonly flavourImpl: FlavourImpl;
  
  constructor(
    public readonly useScalaJsDomTypes: boolean,
    public readonly flavour: Flavour,
    public readonly outputPackage: Name,
    public readonly stdLibs: Set<string>,
    public readonly enableScalaJsDefined: Selection<TsIdentLibrary>,
    public readonly expandTypeMappings: Selection<TsIdentLibrary>,
    public readonly ignored: Set<string>,
    public readonly versions: Versions,
    public readonly enableLongApplyMethod: boolean,
    public readonly privateWithin?: Name,
    public readonly useDeprecatedModuleNames: boolean = false
  ) {
    // Compute derived properties
    this.ignoredLibs = new Set(
      Array.from(ignored).map(lib => TsIdentLibrary.construct(lib))
    );
    
    this.ignoredModulePrefixes = new Set(
      Array.from(ignored).map(lib => lib.split("/"))
    );
    
    this.flavourImpl = new NormalFlavour(
      useScalaJsDomTypes,
      enableLongApplyMethod,
      outputPackage,
      versions
    );
  }
  
  // JSON serialization utilities
  toObject(): any {
    const serializeSelection = <T>(selection: Selection<T>, itemSerializer: (item: T) => any): any => {
      if (selection instanceof AllExcept) {
        return { AllExcept: Array.from(selection.values).map(itemSerializer) };
      } else if (selection instanceof NoneExcept) {
        return { NoneExcept: Array.from(selection.values).map(itemSerializer) };
      } else if (selection instanceof AndSelection) {
        return { 
          And: { 
            _1: serializeSelection(selection._1, itemSerializer), 
            _2: serializeSelection(selection._2, itemSerializer) 
          } 
        };
      } else if (selection instanceof OrSelection) {
        return { 
          Or: { 
            _1: serializeSelection(selection._1, itemSerializer), 
            _2: serializeSelection(selection._2, itemSerializer) 
          } 
        };
      }
      throw new Error('Unknown Selection type');
    };
    
    return {
      useScalaJsDomTypes: this.useScalaJsDomTypes,
      flavour: this.flavour.id,
      outputPackage: this.outputPackage.unescaped,
      stdLibs: Array.from(this.stdLibs),
      enableScalaJsDefined: serializeSelection(this.enableScalaJsDefined, (lib: TsIdentLibrary) => lib.value),
      expandTypeMappings: serializeSelection(this.expandTypeMappings, (lib: TsIdentLibrary) => lib.value),
      ignored: Array.from(this.ignored),
      versions: {
        scala: this.versions.scala.scalaVersion,
        scalaJs: this.versions.scalaJs.scalaJsVersion
      },
      enableLongApplyMethod: this.enableLongApplyMethod,
      ...(this.privateWithin && { privateWithin: this.privateWithin.unescaped }),
      useDeprecatedModuleNames: this.useDeprecatedModuleNames
    };
  }
  
  toJson(): string {
    return JSON.stringify(this.toObject());
  }
  
  static fromObject(obj: any): ConversionOptions {
    const deserializeSelection = <T>(selectionObj: any, itemDeserializer: (item: any) => T): Selection<T> => {
      if (selectionObj.AllExcept) {
        return new AllExcept(new Set(selectionObj.AllExcept.map(itemDeserializer)));
      } else if (selectionObj.NoneExcept) {
        return new NoneExcept(new Set(selectionObj.NoneExcept.map(itemDeserializer)));
      } else if (selectionObj.And) {
        return new AndSelection(
          deserializeSelection(selectionObj.And._1, itemDeserializer),
          deserializeSelection(selectionObj.And._2, itemDeserializer)
        );
      } else if (selectionObj.Or) {
        return new OrSelection(
          deserializeSelection(selectionObj.Or._1, itemDeserializer),
          deserializeSelection(selectionObj.Or._2, itemDeserializer)
        );
      }
      throw new Error('Invalid Selection format');
    };
    
    const flavour = Flavour.decode(obj.flavour);
    if (flavour instanceof Error) {
      throw flavour;
    }
    
    return new ConversionOptions(
      obj.useScalaJsDomTypes,
      flavour,
      new Name(obj.outputPackage),
      new Set(obj.stdLibs),
      deserializeSelection(obj.enableScalaJsDefined, (lib: string) => TsIdentLibrary.construct(lib)),
      deserializeSelection(obj.expandTypeMappings, (lib: string) => TsIdentLibrary.construct(lib)),
      new Set(obj.ignored),
      new Versions(
        new ScalaVersion(obj.versions.scala),
        new ScalaJsVersion(obj.versions.scalaJs)
      ),
      obj.enableLongApplyMethod,
      obj.privateWithin ? new Name(obj.privateWithin) : undefined,
      obj.useDeprecatedModuleNames || false
    );
  }
  
  static fromJson(jsonStr: string): ConversionOptions | Error {
    try {
      const parsed = JSON.parse(jsonStr);
      return ConversionOptions.fromObject(parsed);
    } catch (error) {
      return error instanceof Error ? error : new Error('JSON parsing failed');
    }
  }
}

// All exports are already declared above with export keyword