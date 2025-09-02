/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.CalculateLibraryVersion
 * 
 * Calculates library versions based on various sources
 */

import { Option } from 'fp-ts/Option';
import { LibraryVersion } from '../LibraryVersion';
import { PackageJson } from '../ts/PackageJson';
import { InFolder } from '../files';
import { Comments } from '../scalajs/Comments';

/**
 * Interface for calculating library versions
 */
export interface CalculateLibraryVersion {
  calculate(
    folder: InFolder,
    isStdLib: boolean,
    packageJsonOpt: Option<PackageJson>,
    comments: Comments
  ): LibraryVersion;
}

/**
 * Simple implementation that only uses package.json
 */
export class PackageJsonOnly implements CalculateLibraryVersion {
  calculate(
    folder: InFolder,
    isStdLib: boolean,
    packageJsonOpt: Option<PackageJson>,
    comments: Comments
  ): LibraryVersion {
    const version = packageJsonOpt._tag === 'Some' 
      ? packageJsonOpt.value.version || "1.0.0-unknown"
      : "1.0.0-unknown";

    return LibraryVersion.create(
      isStdLib,
      version,
      null // No git information for this simple implementation
    );
  }
}

/**
 * Mock implementation for testing
 */
export class MockCalculateLibraryVersion implements CalculateLibraryVersion {
  calculate(
    folder: InFolder,
    isStdLib: boolean,
    packageJsonOpt: Option<PackageJson>,
    comments: Comments
  ): LibraryVersion {
    return LibraryVersion.create(
      isStdLib,
      "1.0.0-mock",
      null
    );
  }
}
