/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.LibScalaJs
 *
 * Represents a Scala.js library after Phase2 processing
 */

import { SortedMap } from "../collections";
import { LibraryVersion } from "../LibraryVersion";
import { Name } from "../scalajs/Name";
import { PackageTree } from "../scalajs/PackageTree";
import { AdaptiveNamingImport } from "./AdaptiveNamingImport";
import type { LibTsSource } from "./LibTsSource";

/**
 * Represents a processed Scala.js library with package tree and metadata
 */
export class LibScalaJs {
	constructor(
		public readonly source: LibTsSource,
		public readonly libName: string,
		public readonly scalaName: Name,
		public readonly libVersion: LibraryVersion,
		public readonly packageTree: PackageTree,
		public readonly dependencies: Map<LibTsSource, LibScalaJs>,
		public readonly isStdLib: boolean,
		public readonly names: AdaptiveNamingImport,
	) {}

	/**
	 * Create a mock LibScalaJs for testing/dummy implementations
	 */
	static createMock(source: LibTsSource, libName?: string): LibScalaJs {
		const mockLibName = libName || source.libName.value.replace(/\./g, "_dot_");
		const mockScalaName = new Name(mockLibName);

		const mockVersion = LibraryVersion.create(
			false, // isStdLib
			"1.0.0-mock", // libraryVersion
			null, // inGit
		);

		const mockPackageTree = PackageTree.createMock(mockScalaName);
		const emptyDependencies = new Map<LibTsSource, LibScalaJs>();
		const mockNames = AdaptiveNamingImport.createMock();

		return new LibScalaJs(
			source,
			mockLibName,
			mockScalaName,
			mockVersion,
			mockPackageTree,
			emptyDependencies,
			false, // isStdLib
			mockNames,
		);
	}
}

/**
 * Utility namespace for LibScalaJs operations
 */
export namespace LibScalaJs {
	/**
	 * Unpacks a SortedMap of LibScalaJs including transitive dependencies
	 */
	export class Unpack {
		static unapply(
			m: SortedMap<LibTsSource, LibScalaJs>,
		): SortedMap<LibTsSource, LibScalaJs> {
			return Unpack.apply(m);
		}

		static apply(
			m: SortedMap<LibTsSource, LibScalaJs>,
		): SortedMap<LibTsSource, LibScalaJs> {
			const result = new Map<LibTsSource, LibScalaJs>();

			const addDependencies = (lib: LibScalaJs, source: LibTsSource): void => {
				result.set(source, lib);
				lib.dependencies.forEach(addDependencies);
			};

			m.forEach(addDependencies);
			return new SortedMap(result);
		}
	}
}
