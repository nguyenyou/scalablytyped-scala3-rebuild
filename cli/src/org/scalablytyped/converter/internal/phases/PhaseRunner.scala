package org.scalablytyped.converter.internal
package phases

import org.scalablytyped.converter.internal.logging.Formatter
import org.scalablytyped.converter.internal.logging.Logger

import scala.collection.immutable.SortedMap
import scala.collection.immutable.SortedSet
import scala.util.control.NonFatal

/** Runs a computation given a sequence of input ids.
  */
object PhaseRunner {

  /**
    * Build a runner that starts at the provided root id and executes the linked [[RecPhase]] chain.
    * A fresh logger is requested per id so downstream work inherits contextual metadata.
    */
  def apply[Id: Formatter: Ordering, T](
      phase: RecPhase[Id, T],
      getLogger: Id => Logger[Unit],
      listener: PhaseListener[Id]
  )(initial: phase._Id): PhaseRes[phase._Id, phase._T] =
    go(phase, initial, Nil, getLogger, listener)

  /** Recursively execute `phase` for the supplied id, tracking the current dependency chain. */
  def go[Id: Formatter: Ordering, TT](
      phase: RecPhase[Id, TT],
      id: Id,
      circuitBreaker: List[Id],
      getLogger: Id => Logger[Unit],
      listener: PhaseListener[Id]
  ): PhaseRes[Id, TT] =
    phase match {
      case _: RecPhase.Initial[Id] @unchecked => PhaseRes.Ok[Id, TT](id)
      case next: RecPhase.Next[Id, t, TT]     => doNext[Id, t, TT](next, id, circuitBreaker, getLogger, listener)
    }

  /**
    * Execute a [[RecPhase.Next]] node: resolve prerequisites, call the phase transform, and record lifecycle events.
    */
  def doNext[Id: Formatter: Ordering, T, TT](
      next: RecPhase.Next[Id, T, TT],
      id: Id,
      circuitBreaker: List[Id],
      getLogger: Id => Logger[Unit],
      listener: PhaseListener[Id]
  ): PhaseRes[Id, TT] = {

    // Detect whether we are re-visiting the same id in the active dependency path.
    val isCircular = circuitBreaker contains id

    val logger = getLogger(id)
      .withContext(id)
      .withContext("thread", Thread.currentThread().threadId())
      .withContext("phase", next.name)

    next.cache.getOrElse((id, isCircular)) { () =>
      try {
        listener.on(next.name, id, PhaseListener.Started(next.name))

        val resLastPhase: PhaseRes[Id, T] =
          go(next.prev, id, Nil, getLogger, listener)

        /**
          * Callback passed to the phase so it can request additional dependencies.
          * The listener receives progress updates while we resolve those ids.
          */
        def calculateDeps(newRequestedIds: SortedSet[Id]): PhaseRes[Id, SortedMap[Id, TT]] = {
          listener.on(next.name, id, PhaseListener.Blocked(next.name, newRequestedIds))

          val ret: PhaseRes[Id, SortedMap[Id, TT]] =
            PhaseRes.sequenceMap(
              SortedMap.from(
                newRequestedIds.toSeq
                  .map(thisId => thisId -> go(next, thisId, id :: circuitBreaker, getLogger, listener))
              )
            )

          listener.on(next.name, id, PhaseListener.Started(next.name))
          ret
        }

        val result: PhaseRes[Id, TT] =
          resLastPhase.flatMap(lastValue =>
            PhaseRes.attempt(id, logger, next.trans(id, lastValue, calculateDeps, isCircular, logger)),
          )

        result match {
          case PhaseRes.Ok(_) =>
            listener.on(next.name, id, PhaseListener.Success(next.name))
          case PhaseRes.Failure(errors) =>
            listener.on(next.name, id, PhaseListener.Failure(next.name, errors))
          case PhaseRes.Ignore() =>
            listener.on(next.name, id, PhaseListener.Ignored())
        }
        result

      } catch {
        case NonFatal(e) =>
          val errors = Map[Id, Either[Throwable, String]](id -> Left(e))
          listener.on(next.name, id, PhaseListener.Failure(next.name, errors))
          logger.error(("Failure", e))
          PhaseRes.Failure(errors)
      }
    }
  }
}
