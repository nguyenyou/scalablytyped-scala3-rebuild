import {InFile, InFolder, filesSync} from "@/internal/files.ts";
import {ConversionOptions} from "@/internal/importer/ConversionOptions.ts";
import {TsIdent, TsIdentLibrary} from "@/internal/ts/trees.ts";
import {StdLibSource} from "@/internal/importer/LibTsSource.ts";
import * as path from "node:path";
import IArray from "@/internal/IArray.ts";

export namespace Bootstrap {
  export function fromNodeModules(
    fromFolder: InFolder,
    conversion: ConversionOptions,
    wantedLibs: Set<TsIdentLibrary>
  ) {
    console.log("fromFolder.path", fromFolder.path)
    const folder = path.join(fromFolder.path, "typescript", "lib")
    const files = Array(conversion.stdLibs).map(s => new InFile(path.join(folder, `lib.${s}.d.ts`)))
    const f = IArray.fromIterable(files)
    const ln = TsIdent.std
    const stdLibSource = new StdLibSource(new InFolder(folder), f, ln)

    // Converted from Scala:
    // val `@types`: Option[InFolder] =
    //   fromFolder.path / "@types" match {
    //     case dir if os.isDir(dir) => Some(InFolder(dir))
    //     case _                    => None
    //   }
    const typesPath = path.join(fromFolder.path, "@types");
    const atTypes: InFolder | null = filesSync.isDir(typesPath)
      ? new InFolder(typesPath)
      : null;

    return 1
  }
}