package org.scalablytyped.converter.internal
package phases

import org.scalablytyped.converter.internal.phases.PhaseCache.Ref

import java.util

/**
  * Soft-reference cache keyed by `(id, isCircular)` so phases can memoise expensive computations per element.
  * Soft references allow the JVM to reclaim results when memory pressure is high while keeping hot entries around.
  */
class PhaseCache[Id, U](initialCapacity: Int = 1000) {
  private val m: util.Map[Ref[(Id, IsCircular)], Ref[PhaseRes[Id, U]]] =
    new util.HashMap(initialCapacity)

  /** Return a cached result or compute and remember a new one for the supplied key. */
  def getOrElse(key: (Id, IsCircular))(compute: () => PhaseRes[Id, U]): PhaseRes[Id, U] = {
    val keyRef = new Ref(key)

    val existing: Option[PhaseRes[Id, U]] =
      m.get(keyRef) match {
        case null => None
        case uRef =>
          uRef.get match {
            case null => None
            case u    => Some(u)
          }
      }

    existing match {
      case None =>
        val ret = compute()
        m.put(keyRef, new Ref(ret))
        ret
      case Some(found) =>
        found
    }
  }
}

object PhaseCache {
  /** Wrapper storing values in soft references so identity is based on the referent rather than the wrapper. */
  private final class Ref[T](t: T) extends java.lang.ref.SoftReference[T](t) {
    override def equals(obj: Any): Boolean =
      obj match {
        case that: Ref[_] => that.get == get
        case _            => false
      }

    override lazy val hashCode: Int = get.##
  }
}
