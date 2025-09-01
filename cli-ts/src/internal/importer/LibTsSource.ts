import {TsLib} from "@/internal/ts/TsTreeScope.ts";
import {TsIdentLibrary} from "@/internal/ts/trees.ts";
import {PackageJson} from "type-fest";
import {InFile} from "@/internal/files.ts";

abstract class LibTsSource implements TsLib {
  abstract libName: TsIdentLibrary;
  abstract packageJsonOpt?: PackageJson;
  abstract shortenedFiles: InFile[];
}