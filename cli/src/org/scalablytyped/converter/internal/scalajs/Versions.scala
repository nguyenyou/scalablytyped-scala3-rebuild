package org.scalablytyped.converter.internal
package scalajs

import io.circe.Decoder
import io.circe.Encoder

object Versions {
  // this accepts any nightly or milestone with the same binversion as a major release. good enough for now
  private val Version = "(\\d+).(\\d+).(\\d+).*".r

  case class Scala(scalaVersion: String) {
    val is3: Boolean = scalaVersion.startsWith("3.")

    val scalaOrganization: String =
      "org.scala-lang"
  }

  object Scala {
    implicit val encodes: Encoder[Scala] = Encoder[String].contramap(_.scalaVersion)
    implicit val decodes: Decoder[Scala] = Decoder[String].map(Scala.apply)
  }

  val Scala3   = Scala("3.7.2")

  case class ScalaJs(scalaJsVersion: String) {
  }

  object ScalaJs {
    implicit val encodes: Encoder[ScalaJs] = Encoder[String].contramap(_.scalaJsVersion)
    implicit val decodes: Decoder[ScalaJs] = Decoder[String].map(ScalaJs.apply)
  }

  implicit val encodes: Encoder[Versions] = io.circe.generic.semiauto.deriveEncoder
  implicit val decodes: Decoder[Versions] = io.circe.generic.semiauto.deriveDecoder

  val ScalaJs1 = ScalaJs("1.19.0")
}

case class Versions(scala: Versions.Scala, scalaJs: Versions.ScalaJs) {
  val runtime    = Dep.ScalaJs("com.olvind", "scalablytyped-runtime", "2.4.2")
  val scalaJsDom = Dep.ScalaJs("org.scala-js", "scalajs-dom", "2.8.0")
}