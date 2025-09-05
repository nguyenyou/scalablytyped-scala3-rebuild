/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.LibTs
 *
 * Represents a TypeScript library after Phase1 processing
 */

import { Option } from "fp-ts/Option";
import { SortedMap } from "../collections";
import { Digest } from "../Digest";
import { LibraryVersion } from "../LibraryVersion";
import { type TsIdentLibrary, TsParsedFile } from "../ts/trees";
import type { LibTsSource } from "./LibTsSource";

/**
 * Represents a processed TypeScript library with parsed content and dependencies
 */
export class LibTs {
	constructor(
		public readonly source: LibTsSource,
		public readonly version: LibraryVersion,
		public readonly parsed: TsParsedFile,
		public readonly dependencies: SortedMap<LibTsSource, LibTs>,
	) {}

	/**
	 * Get the library name from the source
	 */
	get name(): TsIdentLibrary {
		return this.source.libName;
	}

	/**
	 * Compute transitive dependencies lazily
	 */
	get transitiveDependencies(): SortedMap<LibTsSource, LibTs> {
		const result = new Map<LibTsSource, LibTs>();

		const addDependencies = (lib: LibTs, source: LibTsSource): void => {
			result.set(source, lib);
			lib.dependencies.forEach(addDependencies);
		};

		this.dependencies.forEach(addDependencies);
		return new SortedMap(result);
	}

	/**
	 * Create a mock LibTs for testing/dummy implementations
	 */
	static createMock(source: LibTsSource, parsed?: TsParsedFile): LibTs {
		const mockVersion = LibraryVersion.create(
			false, // isStdLib
			"1.0.0-mock", // libraryVersion
			null, // inGit
		);

		const mockParsed = parsed || TsParsedFile.createMock();
		const emptyDependencies = new SortedMap<LibTsSource, LibTs>(new Map());

		return new LibTs(source, mockVersion, mockParsed, emptyDependencies);
	}
}
