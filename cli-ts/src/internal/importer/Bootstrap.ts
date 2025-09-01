import {InFolder} from "@/internal/files.ts";
import {ConversionOptions} from "@/internal/importer/ConversionOptions.ts";
import {TsIdentLibrary} from "@/internal/ts/trees.ts";

export namespace Bootstrap {
  export function fromNodeModules(
    fromFolder: InFolder,
    conversion: ConversionOptions,
    wantedLibs: Set<TsIdentLibrary>
  ) {
    console.log("fromFolder.path", fromFolder.path)
    return 1
  }
}