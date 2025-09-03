/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.ReadonlyModifier
 * 
 * Represents the different readonly modifiers for TypeScript properties
 */

import { Option, some, none } from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

/**
 * No-operation readonly modifier
 * Preserves the existing readonly state without modification
 */
export interface Noop {
  readonly _tag: 'Noop';
}

/**
 * Yes readonly modifier
 * Forces the property to be readonly
 */
export interface Yes {
  readonly _tag: 'Yes';
}

/**
 * No readonly modifier
 * Forces the property to be mutable (not readonly)
 */
export interface No {
  readonly _tag: 'No';
}

/**
 * Base type for all readonly modifiers
 * Corresponds to the sealed trait ReadonlyModifier in Scala
 */
export type ReadonlyModifier = Noop | Yes | No;

/**
 * Constructor functions and utilities for ReadonlyModifier
 */
export const ReadonlyModifier = {
  /**
   * Creates a Noop readonly modifier
   */
  noop: (): Noop => ({
    _tag: 'Noop'
  }),

  /**
   * Creates a Yes readonly modifier
   */
  yes: (): Yes => ({
    _tag: 'Yes'
  }),

  /**
   * Creates a No readonly modifier
   */
  no: (): No => ({
    _tag: 'No'
  }),

  /**
   * Type guard to check if a readonly modifier is Noop
   */
  isNoop: (modifier: ReadonlyModifier): modifier is Noop => {
    return modifier._tag === 'Noop';
  },

  /**
   * Type guard to check if a readonly modifier is Yes
   */
  isYes: (modifier: ReadonlyModifier): modifier is Yes => {
    return modifier._tag === 'Yes';
  },

  /**
   * Type guard to check if a readonly modifier is No
   */
  isNo: (modifier: ReadonlyModifier): modifier is No => {
    return modifier._tag === 'No';
  },

  /**
   * Applies the readonly modifier to determine the final readonly state
   * This is the core functionality from the original Scala implementation
   * 
   * @param modifier The readonly modifier to apply
   * @param wasReadonly The current readonly state
   * @returns The new readonly state after applying the modifier
   */
  apply: (modifier: ReadonlyModifier, wasReadonly: boolean): boolean => {
    switch (modifier._tag) {
      case 'Noop':
        return wasReadonly;
      case 'Yes':
        return true;
      case 'No':
        return false;
    }
  },

  /**
   * Checks if a modifier forces a specific readonly state (Yes or No)
   */
  isForcing: (modifier: ReadonlyModifier): boolean => {
    return ReadonlyModifier.isYes(modifier) || ReadonlyModifier.isNo(modifier);
  },

  /**
   * Checks if a modifier preserves the existing state (Noop)
   */
  isPreserving: (modifier: ReadonlyModifier): modifier is Noop => {
    return ReadonlyModifier.isNoop(modifier);
  },

  /**
   * Converts a readonly modifier to its string representation
   */
  toString: (modifier: ReadonlyModifier): string => {
    switch (modifier._tag) {
      case 'Noop':
        return 'Noop';
      case 'Yes':
        return 'Yes';
      case 'No':
        return 'No';
    }
  },

  /**
   * Parses a string into a ReadonlyModifier
   * Returns None if the string doesn't match any known readonly modifier
   */
  fromString: (str: string): Option<ReadonlyModifier> => {
    const trimmed = str.trim();
    switch (trimmed) {
      case 'Noop':
        return some(ReadonlyModifier.noop());
      case 'Yes':
        return some(ReadonlyModifier.yes());
      case 'No':
        return some(ReadonlyModifier.no());
      default:
        return none;
    }
  },

  /**
   * Creates a ReadonlyModifier from a boolean value
   * true -> Yes, false -> No
   */
  fromBoolean: (value: boolean): ReadonlyModifier => {
    return value ? ReadonlyModifier.yes() : ReadonlyModifier.no();
  },

  /**
   * Converts a ReadonlyModifier to an optional boolean
   * Noop -> None, Yes -> Some(true), No -> Some(false)
   */
  toBoolean: (modifier: ReadonlyModifier): Option<boolean> => {
    switch (modifier._tag) {
      case 'Noop':
        return none;
      case 'Yes':
        return some(true);
      case 'No':
        return some(false);
    }
  },

  /**
   * Checks if two readonly modifiers are equal
   */
  equals: (a: ReadonlyModifier, b: ReadonlyModifier): boolean => {
    return a._tag === b._tag;
  },

  /**
   * Gets all possible readonly modifiers
   */
  get all(): ReadonlyModifier[] {
    return [ReadonlyModifier.noop(), ReadonlyModifier.yes(), ReadonlyModifier.no()];
  },

  /**
   * Pattern matching utility for ReadonlyModifier
   */
  match: <T>(
    modifier: ReadonlyModifier,
    cases: {
      Noop: () => T;
      Yes: () => T;
      No: () => T;
    }
  ): T => {
    switch (modifier._tag) {
      case 'Noop':
        return cases.Noop();
      case 'Yes':
        return cases.Yes();
      case 'No':
        return cases.No();
    }
  },

  /**
   * Functional fold operation over ReadonlyModifier
   */
  fold: <T>(
    onNoop: () => T,
    onYes: () => T,
    onNo: () => T
  ): ((modifier: ReadonlyModifier) => T) => {
    return (modifier: ReadonlyModifier) => {
      switch (modifier._tag) {
        case 'Noop':
          return onNoop();
        case 'Yes':
          return onYes();
        case 'No':
          return onNo();
      }
    };
  },

  /**
   * Combines two readonly modifiers, with the second taking precedence
   * If the second modifier is Noop, returns the first modifier
   * Otherwise, returns the second modifier
   */
  combine: (first: ReadonlyModifier, second: ReadonlyModifier): ReadonlyModifier => {
    return ReadonlyModifier.isNoop(second) ? first : second;
  }
};

/**
 * Singleton instances for each readonly modifier
 */
export const NoopInstance: Noop = ReadonlyModifier.noop();
export const YesInstance: Yes = ReadonlyModifier.yes();
export const NoInstance: No = ReadonlyModifier.no();
