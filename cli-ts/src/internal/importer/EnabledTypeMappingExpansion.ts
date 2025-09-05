/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.EnabledTypeMappingExpansion
 *
 * Provides default selection criteria for type mapping expansion during TypeScript to Scala.js conversion.
 * This module defines which libraries should be included or excluded from type mapping expansion.
 */

import { Selection } from "@/internal/Selection.js";
import { TsIdentLibrary } from "@/internal/ts/trees.js";

/**
 * EnabledTypeMappingExpansion object - equivalent to Scala object
 *
 * Contains configuration for which TypeScript libraries should have their type mappings expanded
 * during the conversion process from TypeScript to Scala.js.
 */
export namespace EnabledTypeMappingExpansion {
	/**
	 * Default selection for type mapping expansion.
	 *
	 * Includes all libraries except for:
	 * - "std" - TypeScript standard library
	 * - "prop-types" - React prop-types library
	 * - "react" - React library
	 *
	 * These libraries are excluded because they either:
	 * 1. Have special handling elsewhere in the conversion pipeline
	 * 2. Are too fundamental and would create circular dependencies
	 * 3. Have custom type mappings that don't need expansion
	 *
	 * The selection is mapped to TsIdentLibrary instances for type safety.
	 */
	export const DefaultSelection: Selection<TsIdentLibrary> =
		Selection.AllExcept("std", "prop-types", "react").map(
			TsIdentLibrary.construct,
		);
}

// Export the namespace as default for compatibility
export default EnabledTypeMappingExpansion;
