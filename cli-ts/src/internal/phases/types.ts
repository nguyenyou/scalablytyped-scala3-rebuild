/**
 * Core type definitions for the phases framework
 * Port of org.scalablytyped.converter.internal.phases.package object
 */

import { SortedMap, SortedSet } from '../collections';
import { Logger } from '../logging';
import { PhaseRes } from './PhaseRes';

/**
 * Boolean flag indicating whether a computation is part of a circular dependency
 */
export type IsCircular = boolean;

/**
 * Function type for retrieving dependencies
 * Given a set of dependency IDs, returns a PhaseRes containing a map of ID to computed values
 */
export type GetDeps<Id, T> = (deps: SortedSet<Id>) => PhaseRes<Id, SortedMap<Id, T>>;

/**
 * Core phase function type
 * Takes an ID, current value, dependency getter, circular flag, and logger
 * Returns a PhaseRes with the computed result
 */
export type Phase<Id, T, TT> = (
  id: Id,
  value: T,
  getDeps: GetDeps<Id, TT>,
  isCircular: IsCircular,
  logger: Logger<void>
) => PhaseRes<Id, TT>;
