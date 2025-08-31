package org.scalablytyped.converter.internal
package importer
import org.scalablytyped.converter.internal.logging.Logger
import org.scalablytyped.converter.internal.ts.TsParsedFile
import org.scalablytyped.converter.internal.ts.parser

import java.nio.file.Path

object PersistingParser {
  def apply(
      cacheDirOpt: Option[Path],
      inputFolders: IArray[InFolder],
      logger: Logger[Unit]
  ): InFile => Either[String, TsParsedFile] =
    cacheDirOpt match {
      case Some(cacheDir) =>
        val pf = FileLocking.persistingFunction[(InFile, Array[Byte]), Either[String, TsParsedFile]](
          { case (file, bs) =>
            val shortestRelative =
              inputFolders.map(f => file.path.relativeTo(f.path)).sortBy(_.toString.length).head.toString
            val base = cacheDir.resolve(s"${BuildInfo.version}").resolve(shortestRelative)
            base.resolve(Digest.of(IArray(bs)).hexString)
          },
          logger
        ) { case (inFile: InFile, bytes: Array[Byte]) =>
          parser.parseFileContent(inFile, bytes)
        }
        inFile => pf((inFile, os.read.bytes(inFile.path)))
      case None =>
        inFile => parser.parseFileContent(inFile, os.read.bytes(inFile.path))
    }
}
