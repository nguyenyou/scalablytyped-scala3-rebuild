package org.scalablytyped.converter.internal
package phases

/** A representation of a computation of a set of elements which is done in phases. Each phase can both compute and
  * express a new set of dependencies needed for the next phase.
  *
  * Each element passing through a phase is guaranteed to be passed its dependencies after having passed through that
  * given phase.
  *
  * @tparam Id
  *   Every element and dependency must have an id
  * @tparam T
  *   The type of the element at the current stage of the computation
  */
sealed abstract class RecPhase[Id, T] {
  final type _Id = Id
  final type _T  = T

  /** Append another phase to the pipeline with the supplied display `name`. */
  final def next[TT](f: Phase[Id, T, TT], name: String): RecPhase[Id, TT] =
    RecPhase.Next(this, f, new PhaseCache, name)

  /** Optionally append a phase when the `Option` is defined; otherwise return the current pipeline unchanged. */
  final def nextOpt(op: Option[Phase[Id, T, T]], name: String): RecPhase[Id, T] =
    op match {
      case None    => this
      case Some(p) => RecPhase.Next(this, p, new PhaseCache, name)
    }
}

object RecPhase {
  /** Create a phase chain whose first stage simply echoes the supplied ids. */
  def apply[Id]: RecPhase[Id, Id] = Initial()

  /** Marker phase that represents the starting point of the pipeline. */
  final case class Initial[Id]() extends RecPhase[Id, Id]

  /**
    * A concrete transformation node that depends on `prev`, runs `trans`, and caches results under `name`.
    */
  final case class Next[Id, T, TT](
      prev: RecPhase[Id, T],
      trans: Phase[Id, T, TT],
      cache: PhaseCache[Id, TT],
      name: String
  ) extends RecPhase[Id, TT] {
    type _TT = TT
  }
}
