/**
 * TypeScript port of org.scalablytyped.converter.internal.scalajs.QualifiedName
 * 
 * Represents a qualified name in Scala.js code
 */

import { IArray } from '../IArray';
import { Name } from './Name';

/**
 * Represents a qualified name (e.g., com.example.MyClass)
 */
export class QualifiedName {
  constructor(public readonly parts: IArray<Name>) {}

  /**
   * Get the full qualified name as a string
   */
  get value(): string {
    return this.parts.toArray().map(part => part.value).join('.');
  }

  /**
   * Get the last part of the qualified name
   */
  get last(): Name | undefined {
    const array = this.parts.toArray();
    return array.length > 0 ? array[array.length - 1] : undefined;
  }

  /**
   * Create a qualified name from an array of names
   */
  static from(names: Name[]): QualifiedName {
    return new QualifiedName(IArray.fromArray(names));
  }

  /**
   * Create a qualified name from string parts
   */
  static fromStrings(parts: string[]): QualifiedName {
    const names = parts.map(part => new Name(part));
    return new QualifiedName(IArray.fromArray(names));
  }

  /**
   * Create an empty qualified name
   */
  static empty(): QualifiedName {
    return new QualifiedName(IArray.Empty as IArray<Name>);
  }

  toString(): string {
    return this.value;
  }
}