package org.scalablytyped.converter
package internal
package importer

import io.circe.Decoder
import io.circe.Encoder
import org.scalablytyped.converter.internal.scalajs.Name
import org.scalablytyped.converter.internal.scalajs.Versions
import org.scalablytyped.converter.internal.scalajs.flavours.FlavourImpl
import org.scalablytyped.converter.internal.scalajs.flavours.NormalFlavour
import org.scalablytyped.converter.internal.ts.TsIdentLibrary

import scala.collection.immutable.SortedSet

// Implicit ordering for List[String] to enable SortedSet usage
implicit val listStringOrdering: Ordering[List[String]] = Ordering.by(_.mkString("/"))

case class ConversionOptions(
    useScalaJsDomTypes: Boolean,
    flavour: Flavour,
    outputPackage: Name,
    stdLibs: SortedSet[String],
    enableScalaJsDefined: Selection[TsIdentLibrary],
    expandTypeMappings: Selection[TsIdentLibrary],
    ignored: SortedSet[String],
    versions: Versions,
    enableLongApplyMethod: Boolean,
    privateWithin: Option[Name],
    useDeprecatedModuleNames: Boolean
) {
  val ignoredLibs: Set[TsIdentLibrary] =
    ignored.map(TsIdentLibrary.apply)

  val ignoredModulePrefixes: Set[List[String]] =
    ignored.map(_.split("/").toList).toSet

  val flavourImpl: FlavourImpl =
    NormalFlavour(useScalaJsDomTypes, enableLongApplyMethod, outputPackage, versions)
}

object ConversionOptions {
  implicit val encodes: Encoder[ConversionOptions] = io.circe.generic.semiauto.deriveEncoder
  implicit val decodes: Decoder[ConversionOptions] = io.circe.generic.semiauto.deriveDecoder
}
