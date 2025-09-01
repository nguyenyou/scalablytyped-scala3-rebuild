import {InFile, InFolder} from "@/internal/files.ts";
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
    return 1
  }
}