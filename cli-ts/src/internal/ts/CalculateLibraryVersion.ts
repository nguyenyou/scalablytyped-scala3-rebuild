/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.CalculateLibraryVersion
 *
 * Provides functionality to calculate library version information from various sources.
 */

import { flatMap, fromNullable, none, type Option } from "fp-ts/Option";
import type { Comments } from "../Comments.js";
import type { InFolder } from "../files.js";
import { LibraryVersion } from "../LibraryVersion.js";
import type { PackageJson } from "./PackageJson.js";

/**
 * Interface for calculating library version information
 * Equivalent to Scala trait CalculateLibraryVersion
 */
export interface CalculateLibraryVersion {
	/**
	 * Calculate library version from source folder and metadata
	 *
	 * @param sourceFolder - The source folder containing the library
	 * @param isStdLib - Whether this is a standard library
	 * @param packageJsonOpt - Optional package.json metadata
	 * @param comments - Comments associated with the library
	 * @returns LibraryVersion information
	 */
	apply(
		sourceFolder: InFolder,
		isStdLib: boolean,
		packageJsonOpt: Option<PackageJson>,
		comments: Comments,
	): LibraryVersion;
}

/**
 * Implementation that calculates version based only on package.json
 * Equivalent to Scala object CalculateLibraryVersion.PackageJsonOnly
 */
class PackageJsonOnlyImpl implements CalculateLibraryVersion {
	/**
	 * Calculate library version using only package.json version information
	 *
	 * @param sourceFolder - The source folder (unused in this implementation)
	 * @param isStdLib - Whether this is a standard library
	 * @param packageJsonOpt - Optional package.json metadata
	 * @param comments - Comments (unused in this implementation)
	 * @returns LibraryVersion with version from package.json if available
	 */
	apply(
		_sourceFolder: InFolder,
		isStdLib: boolean,
		packageJsonOpt: Option<PackageJson>,
		_comments: Comments,
	): LibraryVersion {
		// Extract version from package.json using fp-ts flatMap
		// Equivalent to Scala: packageJsonOpt.flatMap(_.version)
		const libraryVersion = flatMap((pkg: PackageJson) =>
			fromNullable(pkg.version),
		)(packageJsonOpt);

		// Create LibraryVersion with isStdLib, extracted version, and no git info
		// Equivalent to Scala: LibraryVersion(isStdLib, packageJsonOpt.flatMap(_.version), None)
		return new LibraryVersion(isStdLib, libraryVersion, none);
	}
}

// Export the class for direct instantiation
export const PackageJsonOnly = PackageJsonOnlyImpl;

/**
 * Namespace containing static implementations
 * Equivalent to Scala object CalculateLibraryVersion
 */
export namespace CalculateLibraryVersion {
	/**
	 * Static instance of PackageJsonOnly implementation
	 * Equivalent to Scala object PackageJsonOnly extends CalculateLibraryVersion
	 */
	export const PackageJsonOnly = new PackageJsonOnlyImpl();
}
