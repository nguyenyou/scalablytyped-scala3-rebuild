package org.scalablytyped.converter.internal
import org.scalablytyped.converter.internal.environment.OpSystem

import java.nio.charset.Charset
import scala.io.Codec

object constants {
  val defaultCacheFolder: os.Path = environment.OS match {
    case OpSystem.MAC     => os.home / "Library" / "Caches" / "ScalablyTyped"
    case OpSystem.WINDOWS => os.home / "AppData" / "Local" / "ScalablyTyped"
    case OpSystem.LINUX   => os.home / ".cache" / "scalablytyped"
    case OpSystem.UNKNOWN => os.home / ".cache" / "scalablytyped" // By default, Linux cache folder
  }

  val Utf8: Charset = Codec.UTF8.charSet

}