/**
 * TypeScript port of PhaseRes sealed trait
 * Represents the result of a phase computation using functional programming patterns
 */

import { Either, left, right } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { Logger } from '../logging';

/**
 * Sealed union type representing the result of a phase computation
 */
export type PhaseRes<Id, T> = 
  | { readonly _tag: 'Ok'; readonly value: T }
  | { readonly _tag: 'Ignore' }
  | { readonly _tag: 'Failure'; readonly errors: Map<Id, Either<Error, string>> };

/**
 * Constructor functions for PhaseRes variants
 */
export const PhaseRes = {
  /**
   * Creates a successful result
   */
  Ok: <Id, T>(value: T): PhaseRes<Id, T> => ({
    _tag: 'Ok',
    value
  }),

  /**
   * Creates an ignored result
   */
  Ignore: <Id, T>(): PhaseRes<Id, T> => ({
    _tag: 'Ignore'
  }),

  /**
   * Creates a failure result with error map
   */
  Failure: <Id, T>(errors: Map<Id, Either<Error, string>>): PhaseRes<Id, T> => ({
    _tag: 'Failure',
    errors
  }),

  /**
   * Creates a PhaseRes from an Either
   */
  fromEither: <Id, T>(id: Id, either: Either<string, T>): PhaseRes<Id, T> => {
    return either._tag === 'Right'
      ? PhaseRes.Ok<Id, T>(either.right)
      : PhaseRes.Failure<Id, T>(new Map([[id, right(either.left)]]));
  },

  /**
   * Combines multiple PhaseRes results
   */
  sequence: <Id, T>(results: PhaseRes<Id, T>[]): PhaseRes<Id, T[]> => {
    const values: T[] = [];
    const allErrors = new Map<Id, Either<Error, string>>();

    for (const result of results) {
      switch (result._tag) {
        case 'Ok':
          values.push(result.value);
          break;
        case 'Ignore':
          return PhaseRes.Ignore<Id, T[]>();
        case 'Failure':
          result.errors.forEach((error, id) => allErrors.set(id, error));
          break;
      }
    }

    return allErrors.size > 0 
      ? PhaseRes.Failure<Id, T[]>(allErrors)
      : PhaseRes.Ok<Id, T[]>(values);
  },

  /**
   * Safely attempts a computation, catching exceptions
   */
  attempt: <Id, T>(id: Id, logger: Logger<void>, computation: () => PhaseRes<Id, T>): PhaseRes<Id, T> => {
    try {
      return computation();
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific error types that should be re-thrown
        if (error.name === 'InterruptedException' || 
            error.name === 'ClosedByInterruptException' ||
            error.name === 'FileLockInterruptionException') {
          throw error;
        }

        logger.error(`Caught exception: ${error.message}`, error);
        return PhaseRes.Failure<Id, T>(new Map([[id, left(error)]]));
      } else {
        const wrappedError = new Error(String(error));
        logger.error(`Caught non-Error exception: ${String(error)}`, wrappedError);
        return PhaseRes.Failure<Id, T>(new Map([[id, left(wrappedError)]]));
      }
    }
  }
};

/**
 * Utility functions for working with PhaseRes
 */

/**
 * Maps over the value in a PhaseRes
 */
export const map = <Id, T, U>(f: (value: T) => U) => (phaseRes: PhaseRes<Id, T>): PhaseRes<Id, U> => {
  switch (phaseRes._tag) {
    case 'Ok':
      return PhaseRes.Ok<Id, U>(f(phaseRes.value));
    case 'Ignore':
      return PhaseRes.Ignore<Id, U>();
    case 'Failure':
      return PhaseRes.Failure<Id, U>(phaseRes.errors);
  }
};

/**
 * FlatMaps over the value in a PhaseRes
 */
export const flatMap = <Id, T, U>(f: (value: T) => PhaseRes<Id, U>) => (phaseRes: PhaseRes<Id, T>): PhaseRes<Id, U> => {
  switch (phaseRes._tag) {
    case 'Ok':
      return f(phaseRes.value);
    case 'Ignore':
      return PhaseRes.Ignore<Id, U>();
    case 'Failure':
      return PhaseRes.Failure<Id, U>(phaseRes.errors);
  }
};

/**
 * Performs a side effect on the value in a PhaseRes
 */
export const forEach = <Id, T>(f: (value: T) => void) => (phaseRes: PhaseRes<Id, T>): PhaseRes<Id, void> => {
  return map<Id, T, void>(f)(phaseRes);
};

/**
 * Type guards for PhaseRes variants
 */
export const isOk = <Id, T>(phaseRes: PhaseRes<Id, T>): phaseRes is { readonly _tag: 'Ok'; readonly value: T } => {
  return phaseRes._tag === 'Ok';
};

export const isIgnore = <Id, T>(phaseRes: PhaseRes<Id, T>): phaseRes is { readonly _tag: 'Ignore' } => {
  return phaseRes._tag === 'Ignore';
};

export const isFailure = <Id, T>(phaseRes: PhaseRes<Id, T>): phaseRes is { readonly _tag: 'Failure'; readonly errors: Map<Id, Either<Error, string>> } => {
  return phaseRes._tag === 'Failure';
};