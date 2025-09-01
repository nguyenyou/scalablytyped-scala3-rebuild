import {TsIdentLibrary} from "@/internal/ts/trees.ts";
import {PackageJson} from "type-fest";

export interface TsLib {
  libName: TsIdentLibrary;
  packageJsonOpt?: PackageJson;
}