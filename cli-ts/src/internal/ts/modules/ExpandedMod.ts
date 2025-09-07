/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.ExpandedMod
 *
 * Represents expanded module information used during TypeScript module processing.
 * This is a sealed trait equivalent with two case classes: Whole and Picked.
 */

import type { IArray } from "../../IArray.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import type { TsNamedDecl } from "../trees.js";

/**
 * Base interface for expanded module information.
 * Equivalent to the Scala sealed trait ExpandedMod.
 */
export interface ExpandedMod {
	/**
	 * Tag to distinguish between different ExpandedMod types
	 */
	readonly _tag: "Whole" | "Picked";

	/**
	 * Whether this expanded module contains any declarations
	 */
	readonly nonEmpty: boolean;
}

/**
 * Represents a complete module expansion with categorized declarations.
 * Equivalent to the Scala case class ExpandedMod.Whole.
 */
export interface ExpandedModWhole extends ExpandedMod {
	readonly _tag: "Whole";

	/**
	 * Default export declarations
	 */
	readonly defaults: IArray<TsNamedDecl>;

	/**
	 * Namespaced declarations
	 */
	readonly namespaced: IArray<TsNamedDecl>;

	/**
	 * Other declarations (rest)
	 */
	readonly rest: IArray<TsNamedDecl>;

	/**
	 * The scope associated with this module
	 */
	readonly scope: TsTreeScope;
}

/**
 * Represents a selective module expansion with specific picked declarations.
 * Equivalent to the Scala case class ExpandedMod.Picked.
 */
export interface ExpandedModPicked extends ExpandedMod {
	readonly _tag: "Picked";

	/**
	 * Array of tuples containing declarations and their associated scopes
	 */
	readonly things: IArray<[TsNamedDecl, TsTreeScope]>;
}

/**
 * ExpandedMod utility object providing constructor functions.
 * Equivalent to the Scala object ExpandedMod.
 */
export const ExpandedMod = {
	/**
	 * Creates a Whole expanded module.
	 *
	 * @param defaults Default export declarations
	 * @param namespaced Namespaced declarations
	 * @param rest Other declarations
	 * @param scope The scope associated with this module
	 * @returns A new ExpandedModWhole instance
	 */
	Whole: (
		defaults: IArray<TsNamedDecl>,
		namespaced: IArray<TsNamedDecl>,
		rest: IArray<TsNamedDecl>,
		scope: TsTreeScope,
	): ExpandedModWhole => ({
		_tag: "Whole",
		defaults,
		namespaced,
		rest,
		scope,
		nonEmpty: defaults.nonEmpty || namespaced.nonEmpty || rest.nonEmpty,
	}),

	/**
	 * Creates a Picked expanded module.
	 *
	 * @param things Array of tuples containing declarations and their associated scopes
	 * @returns A new ExpandedModPicked instance
	 */
	Picked: (things: IArray<[TsNamedDecl, TsTreeScope]>): ExpandedModPicked => ({
		_tag: "Picked",
		things,
		nonEmpty: things.nonEmpty,
	}),

	/**
	 * Type guard to check if an ExpandedMod is a Whole.
	 *
	 * @param mod The ExpandedMod to check
	 * @returns True if the mod is a Whole
	 */
	isWhole: (mod: ExpandedMod): mod is ExpandedModWhole => mod._tag === "Whole",

	/**
	 * Type guard to check if an ExpandedMod is a Picked.
	 *
	 * @param mod The ExpandedMod to check
	 * @returns True if the mod is a Picked
	 */
	isPicked: (mod: ExpandedMod): mod is ExpandedModPicked =>
		mod._tag === "Picked",
};
