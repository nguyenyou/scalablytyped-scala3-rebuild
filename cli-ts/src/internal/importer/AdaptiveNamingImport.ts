/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.AdaptiveNamingImport
 *
 * Handles adaptive naming for imports during TypeScript to Scala.js conversion
 */

import { Name } from "../scalajs/Name";
import { TsIdentLibrary } from "../ts/trees";

/**
 * Manages naming conventions for imported TypeScript libraries
 */
export class AdaptiveNamingImport {
	constructor(
		public readonly outputPkg: Name,
		public readonly libName: TsIdentLibrary,
		public readonly useDeprecatedModuleNames: boolean = false,
	) {}

	/**
	 * Get the unescaped library name
	 */
	get unescaped(): string {
		return this.libName.value;
	}

	/**
	 * Create a mock AdaptiveNamingImport for testing/dummy implementations
	 */
	static createMock(libName?: TsIdentLibrary): AdaptiveNamingImport {
		const mockLibName = libName || TsIdentLibrary.construct("mock-library");
		const mockOutputPkg = new Name("typings");

		return new AdaptiveNamingImport(mockOutputPkg, mockLibName, false);
	}
}
