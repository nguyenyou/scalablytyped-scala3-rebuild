/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.OptionalModifier
 *
 * Represents modifiers for optional types
 */

import { none, type Option, some } from "fp-ts/Option";

/**
 * No-operation optional modifier
 * Preserves the existing type without modification
 */
export interface Noop {
	readonly _tag: "Noop";
}

/**
 * Optionalize modifier
 * Wraps the type in an optional type
 */
export interface Optionalize {
	readonly _tag: "Optionalize";
}

/**
 * Deoptionalize modifier
 * Unwraps an optional type
 */
export interface Deoptionalize {
	readonly _tag: "Deoptionalize";
}

/**
 * Base type for all optional modifiers
 * Corresponds to the sealed trait OptionalModifier in Scala
 */
export type OptionalModifier = Noop | Optionalize | Deoptionalize;

/**
 * Constructor functions and utilities for OptionalModifier
 */
export const OptionalModifier = {
	/**
	 * Creates a Noop optional modifier
	 */
	noop: (): Noop => ({
		_tag: "Noop",
	}),

	/**
	 * Creates an Optionalize modifier
	 */
	optionalize: (): Optionalize => ({
		_tag: "Optionalize",
	}),

	/**
	 * Creates a Deoptionalize modifier
	 */
	deoptionalize: (): Deoptionalize => ({
		_tag: "Deoptionalize",
	}),

	/**
	 * Type guard to check if a modifier is Noop
	 */
	isNoop: (modifier: OptionalModifier): modifier is Noop => {
		return modifier._tag === "Noop";
	},

	/**
	 * Type guard to check if a modifier is Optionalize
	 */
	isOptionalize: (modifier: OptionalModifier): modifier is Optionalize => {
		return modifier._tag === "Optionalize";
	},

	/**
	 * Type guard to check if a modifier is Deoptionalize
	 */
	isDeoptionalize: (modifier: OptionalModifier): modifier is Deoptionalize => {
		return modifier._tag === "Deoptionalize";
	},

	/**
	 * Converts a modifier to its string representation
	 */
	toString: (modifier: OptionalModifier): string => {
		switch (modifier._tag) {
			case "Noop":
				return "Noop";
			case "Optionalize":
				return "Optionalize";
			case "Deoptionalize":
				return "Deoptionalize";
		}
	},

	/**
	 * Parses a string into an OptionalModifier
	 */
	fromString: (str: string): Option<OptionalModifier> => {
		const trimmed = str.trim();
		switch (trimmed) {
			case "Noop":
				return some(OptionalModifier.noop());
			case "Optionalize":
				return some(OptionalModifier.optionalize());
			case "Deoptionalize":
				return some(OptionalModifier.deoptionalize());
			default:
				return none;
		}
	},

	/**
	 * Checks if two modifiers are equal
	 */
	equals: (a: OptionalModifier, b: OptionalModifier): boolean => {
		return a._tag === b._tag;
	},

	/**
	 * Gets all possible optional modifiers
	 */
	get all(): OptionalModifier[] {
		return [
			OptionalModifier.noop(),
			OptionalModifier.optionalize(),
			OptionalModifier.deoptionalize(),
		];
	},

	/**
	 * Pattern matching utility for OptionalModifier
	 */
	match: <T>(
		modifier: OptionalModifier,
		cases: {
			Noop: () => T;
			Optionalize: () => T;
			Deoptionalize: () => T;
		},
	): T => {
		switch (modifier._tag) {
			case "Noop":
				return cases.Noop();
			case "Optionalize":
				return cases.Optionalize();
			case "Deoptionalize":
				return cases.Deoptionalize();
		}
	},

	/**
	 * Functional fold operation over OptionalModifier
	 */
	fold: <T>(
		onNoop: () => T,
		onOptionalize: () => T,
		onDeoptionalize: () => T,
	): ((modifier: OptionalModifier) => T) => {
		return (modifier: OptionalModifier) => {
			switch (modifier._tag) {
				case "Noop":
					return onNoop();
				case "Optionalize":
					return onOptionalize();
				case "Deoptionalize":
					return onDeoptionalize();
			}
		};
	},
};

/**
 * Singleton instances for each optional modifier
 */
export const NoopInstance: Noop = OptionalModifier.noop();
export const OptionalizeInstance: Optionalize = OptionalModifier.optionalize();
export const DeoptionalizeInstance: Deoptionalize =
	OptionalModifier.deoptionalize();
