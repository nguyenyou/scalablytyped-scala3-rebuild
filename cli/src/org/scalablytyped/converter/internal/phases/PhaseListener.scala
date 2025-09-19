package org.scalablytyped.converter.internal
package phases

/** Receives execution events for each phase/id pair so callers can monitor progress. */
trait PhaseListener[Id] {
  def on(phaseName: String, id: Id, event: PhaseListener.Event[Id]): Unit
}

object PhaseListener {
  /** Listener that silently drops all events. */
  def NoListener[Id]: PhaseListener[Id] = (_, _, _) => ()

  /** Lifecycle event emitted while running phases. */
  sealed trait Event[Id]
  case class Started[Id](phase: String) extends Event[Id]
  case class Blocked[Id](phase: String, on: Set[Id]) extends Event[Id]
  case class Success[Id](phase: String) extends Event[Id]
  case class Failure[Id](phase: String, errors: Map[Id, Either[Throwable, String]]) extends Event[Id]
  case class Ignored[Id]() extends Event[Id]
}
