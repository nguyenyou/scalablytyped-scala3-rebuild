/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.ExportType
 *
 * Represents the different types of TypeScript export declarations
 */

import { none, type Option, some } from "fp-ts/Option";

/**
 * Named export type
 * Represents: export { foo, bar }
 */
export interface Named {
	readonly _tag: "Named";
}

/**
 * Default export type
 * Represents: export default MyClass
 */
export interface Defaulted {
	readonly _tag: "Defaulted";
}

/**
 * Namespace export type
 * Represents: export * from "module"
 */
export interface Namespaced {
	readonly _tag: "Namespaced";
}

/**
 * Base type for all TypeScript export types
 * Corresponds to the sealed trait ExportType in Scala
 */
export type ExportType = Named | Defaulted | Namespaced;

/**
 * Constructor functions and utilities for ExportType
 */
export const ExportType = {
	/**
	 * Creates a Named export type
	 */
	named: (): Named => ({
		_tag: "Named",
	}),

	/**
	 * Creates a Defaulted export type
	 */
	defaulted: (): Defaulted => ({
		_tag: "Defaulted",
	}),

	/**
	 * Creates a Namespaced export type
	 */
	namespaced: (): Namespaced => ({
		_tag: "Namespaced",
	}),

	/**
	 * Set of export types that are not named exports
	 * Corresponds to: val NotNamed: Set[ExportType] = Set(ExportType.Namespaced, ExportType.Defaulted)
	 */
	get NotNamed(): Set<ExportType> {
		return new Set([ExportType.namespaced(), ExportType.defaulted()]);
	},

	/**
	 * Type guard to check if an export type is Named
	 */
	isNamed: (exportType: ExportType): exportType is Named => {
		return exportType._tag === "Named";
	},

	/**
	 * Type guard to check if an export type is Defaulted
	 */
	isDefaulted: (exportType: ExportType): exportType is Defaulted => {
		return exportType._tag === "Defaulted";
	},

	/**
	 * Type guard to check if an export type is Namespaced
	 */
	isNamespaced: (exportType: ExportType): exportType is Namespaced => {
		return exportType._tag === "Namespaced";
	},

	/**
	 * Checks if an export type is in the NotNamed set
	 */
	isNotNamed: (exportType: ExportType): boolean => {
		return (
			ExportType.isDefaulted(exportType) || ExportType.isNamespaced(exportType)
		);
	},

	/**
	 * Converts an export type to its string representation
	 */
	toString: (exportType: ExportType): string => {
		switch (exportType._tag) {
			case "Named":
				return "Named";
			case "Defaulted":
				return "Defaulted";
			case "Namespaced":
				return "Namespaced";
		}
	},

	/**
	 * Parses a string into an ExportType
	 * Returns None if the string doesn't match any known export type
	 */
	fromString: (str: string): Option<ExportType> => {
		const trimmed = str.trim();
		switch (trimmed) {
			case "Named":
				return some(ExportType.named());
			case "Defaulted":
				return some(ExportType.defaulted());
			case "Namespaced":
				return some(ExportType.namespaced());
			default:
				return none;
		}
	},

	/**
	 * Checks if two export types are equal
	 */
	equals: (a: ExportType, b: ExportType): boolean => {
		return a._tag === b._tag;
	},

	/**
	 * Gets all possible export types
	 */
	get all(): ExportType[] {
		return [
			ExportType.named(),
			ExportType.defaulted(),
			ExportType.namespaced(),
		];
	},

	/**
	 * Pattern matching utility for ExportType
	 */
	match: <T>(
		exportType: ExportType,
		cases: {
			Named: () => T;
			Defaulted: () => T;
			Namespaced: () => T;
		},
	): T => {
		switch (exportType._tag) {
			case "Named":
				return cases.Named();
			case "Defaulted":
				return cases.Defaulted();
			case "Namespaced":
				return cases.Namespaced();
		}
	},

	/**
	 * Functional fold operation over ExportType
	 */
	fold: <T>(
		onNamed: () => T,
		onDefaulted: () => T,
		onNamespaced: () => T,
	): ((exportType: ExportType) => T) => {
		return (exportType: ExportType) => {
			switch (exportType._tag) {
				case "Named":
					return onNamed();
				case "Defaulted":
					return onDefaulted();
				case "Namespaced":
					return onNamespaced();
			}
		};
	},
};

/**
 * Singleton instances for each export type
 */
export const NamedInstance: Named = ExportType.named();
export const DefaultedInstance: Defaulted = ExportType.defaulted();
export const NamespacedInstance: Namespaced = ExportType.namespaced();
