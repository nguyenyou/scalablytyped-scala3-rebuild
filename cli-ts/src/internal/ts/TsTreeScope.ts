import {TsIdentLibrary} from "@/internal/ts/trees.ts";
import {PackageJson} from "@/internal/ts/PackageJson.ts";

export interface TsLib {
  libName: TsIdentLibrary;
  packageJsonOpt?: PackageJson;
}