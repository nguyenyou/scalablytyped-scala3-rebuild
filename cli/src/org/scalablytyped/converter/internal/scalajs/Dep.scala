package org.scalablytyped.converter.internal
package scalajs

import io.circe.Decoder
import io.circe.Encoder
import org.scalablytyped.converter.internal.stringUtils.quote

sealed trait Dep {
  def org: String
  def version: String

}

object Dep {
  sealed trait Concrete extends Dep {
    def mangledArtifact: String

    def asMangledSbt: String =
      s"${quote(org)} % ${quote(mangledArtifact)} % ${quote(version)}"

    // format: on
  }
  object Concrete {
    implicit val encodes: Encoder[Concrete] = io.circe.generic.semiauto.deriveEncoder
    implicit val decodes: Decoder[Concrete] = io.circe.generic.semiauto.deriveDecoder
  }

  case class Java(org: String, name: String, version: String) extends Concrete {
    override def mangledArtifact: String = name
  }
  case class For3Use2_13(dep: Dep) extends Dep {
    override def org: String     = dep.org
    override def version: String = dep.version
  }
  case class Scala(org: String, name: String, version: String)            extends Dep
  case class ScalaFullVersion(org: String, name: String, version: String) extends Dep
  case class ScalaJs(org: String, name: String, version: String)          extends Dep

  case class Mangled(mangledArtifact: String, dep: Dep) extends Concrete {
    override def org: String     = dep.org
    override def version: String = dep.version
  }

  implicit val decodes: Decoder[Dep] = io.circe.generic.semiauto.deriveDecoder
  implicit val encodes: Encoder[Dep] = io.circe.generic.semiauto.deriveEncoder
}
