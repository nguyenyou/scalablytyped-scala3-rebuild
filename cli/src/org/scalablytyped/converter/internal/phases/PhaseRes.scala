package org.scalablytyped.converter.internal
package phases

import org.scalablytyped.converter.internal.logging.Logger
import org.scalablytyped.converter.internal.logging.Logger.LoggedException

import java.nio.channels.ClosedByInterruptException
import java.nio.channels.FileLockInterruptionException
import scala.collection.immutable.SortedMap
import scala.collection.immutable.TreeMap
import scala.concurrent.ExecutionException
import scala.util.control.NonFatal

/**
  * Adapts the result of running a phase so we can propagate successes, ignored work, or detailed failures.
  * The type parameter `Id` keeps track of which element produced the outcome.
  */
sealed trait PhaseRes[Id, T] extends Product with Serializable {
  import PhaseRes._

  /** Execute `f` for its side effects when the phase finished successfully. */
  def foreach(f: T => Unit): PhaseRes[Id, Unit] = map(f)

  /** Map the value inside an [[Ok]] while leaving [[Ignore]] and [[Failure]] untouched. */
  def map[U](f: T => U): PhaseRes[Id, U] =
    this match {
      case Ok(value)       => Ok(f(value))
      case Ignore()        => Ignore()
      case Failure(errors) => Failure(errors)
    }

  /** Chain another phase result-producing function while preserving Ignore or Failure outcomes. */
  def flatMap[U](f: T => PhaseRes[Id, U]): PhaseRes[Id, U] =
    this match {
      case Ok(value)       => f(value)
      case Ignore()        => Ignore()
      case Failure(errors) => Failure(errors)
    }
}

/** Companion helpers for constructing and combining [[PhaseRes]] instances. */
object PhaseRes {
  /** Successful result carrying the transformed value. */
  final case class Ok[Id, T](value: T) extends PhaseRes[Id, T]

  /** Signals that a phase elected not to run for the supplied id. */
  final case class Ignore[Id, T]() extends PhaseRes[Id, T]

  /** Aggregated error information keyed by ids that failed. */
  final case class Failure[Id, T](errors: Map[Id, Either[Throwable, String]]) extends PhaseRes[Id, T]

  /** Lift an `Either` into the phase result family, recording the source id on failure. */
  def fromEither[Id, L, R](id: Id, e: Either[String, R]): PhaseRes[Id, R] =
    e match {
      case Right(value) => Ok(value)
      case Left(error)  => Failure(Map(id -> Right(error)))
    }

  /** Collapse a set of phase results into a single result, accumulating successes or the first failures. */
  def sequenceSet[Id, T](rs: Set[PhaseRes[Id, T]]): PhaseRes[Id, Set[T]] =
    rs.foldLeft[PhaseRes[Id, Set[T]]](Ok(Set.empty)) {
      case (other, Ignore())                 => other
      case (Ok(ts), Ok(t))                   => Ok(ts + t)
      case (Ok(_), Failure(errors))          => Failure(errors)
      case (Failure(errors), Failure(error)) => Failure(errors ++ error)
      case (error @ Failure(_), Ok(_))       => error
      case (Ignore(), Ok(t))                 => Ok(Set(t))
      case (Ignore(), Failure(error))        => Failure(error)
    }

  /**
    * Collapse a map of phase results into one result, keyed by the same ids and preserving sorted iteration order.
    * Intermediate ignore results disappear unless they are the only observed outcome.
    */
  def sequenceMap[Id: Ordering, T](rs: SortedMap[Id, PhaseRes[Id, T]]): PhaseRes[Id, SortedMap[Id, T]] =
    rs.foldLeft[PhaseRes[Id, SortedMap[Id, T]]](Ok(TreeMap.empty[Id, T])) {
      case (other, (_, Ignore()))                    => other
      case (Ok(map), (id, Ok(value)))                => Ok(map + ((id, value)))
      case (Ok(_), (_, Failure(errors)))             => Failure(errors)
      case (Failure(errors1), (_, Failure(errors2))) => Failure(errors1 ++ errors2)
      case (error @ Failure(_), _)                   => error
      case (Ignore(), (id, Ok(value)))               => Ok(TreeMap((id, value)))
      case (Ignore(), (_, Failure(errors)))          => Failure(errors)
    }

  /**
    * Run a phase body while capturing non-fatal exceptions and logging them before turning them into a failure.
    * Certain interruption-related exceptions are rethrown so that cancellation semantics are preserved.
    */
  def attempt[Id, T](id: Id, logger: Logger[Unit], t: => PhaseRes[Id, T]): PhaseRes[Id, T] =
    try t
    catch {
      case x: InterruptedException          => throw x
      case x: ClosedByInterruptException    => throw x
      case x: FileLockInterruptionException => throw x
      case x: ExecutionException if x.getCause != null =>
        val th = x.getCause
        logger.error(s"Caught exception: ${th.getMessage}", th)
        Failure[Id, T](Map(id -> Left(th)))
      case th: LoggedException =>
        Failure[Id, T](Map(id -> Left(th)))
      case NonFatal(th) =>
        logger.error(s"Caught exception: ${th.getMessage}", th)
        Failure[Id, T](Map(id -> Left(th)))
      case th: StackOverflowError =>
        logger.error("StackOverflowError", th)
        Failure[Id, T](Map(id -> Left(th)))
    }
}
