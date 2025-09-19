package org.scalablytyped.converter.internal

import org.scalablytyped.converter.internal.logging.Logger

import scala.collection.immutable.SortedMap
import scala.collection.immutable.SortedSet

package object phases {

  /** Flag indicating that a dependency cycle has been detected for a given id. */
  type IsCircular = Boolean

  /**
    * Function provided to phases so they can request additional dependencies for the current element.
    * The returned [[PhaseRes]] allows the caller to short-circuit when upstream dependencies fail.
    */
  type GetDeps[Id, T] = SortedSet[Id] => PhaseRes[Id, SortedMap[Id, T]]

  /**
    * A phase transform works on one id at a time and can request dependencies by using [[GetDeps]].
    * It returns a [[PhaseRes]] so that successes, ignored work, and failures propagate consistently.
    */
  type Phase[Id, T, TT] = (Id, T, GetDeps[Id, TT], IsCircular, Logger[Unit]) => PhaseRes[Id, TT]
}
