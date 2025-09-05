/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TsProtectionLevel
 *
 * Represents the different protection levels for TypeScript class members
 */

import { none, type Option, some } from "fp-ts/Option";

/**
 * Default protection level (public)
 * Represents: property: Type or method(): ReturnType
 */
export interface Default {
	readonly _tag: "Default";
}

/**
 * Private protection level
 * Represents: private property: Type or private method(): ReturnType
 */
export interface Private {
	readonly _tag: "Private";
}

/**
 * Protected protection level
 * Represents: protected property: Type or protected method(): ReturnType
 */
export interface Protected {
	readonly _tag: "Protected";
}

/**
 * Base type for all TypeScript protection levels
 * Corresponds to the sealed trait TsProtectionLevel in Scala
 */
export type TsProtectionLevel = Default | Private | Protected;

/**
 * Constructor functions and utilities for TsProtectionLevel
 */
export const TsProtectionLevel = {
	/**
	 * Creates a Default protection level (public)
	 */
	default: (): Default => ({
		_tag: "Default",
	}),

	/**
	 * Creates a Private protection level
	 */
	private: (): Private => ({
		_tag: "Private",
	}),

	/**
	 * Creates a Protected protection level
	 */
	protected: (): Protected => ({
		_tag: "Protected",
	}),

	/**
	 * Type guard to check if a protection level is Default (public)
	 */
	isDefault: (
		protectionLevel: TsProtectionLevel,
	): protectionLevel is Default => {
		return protectionLevel._tag === "Default";
	},

	/**
	 * Type guard to check if a protection level is Private
	 */
	isPrivate: (
		protectionLevel: TsProtectionLevel,
	): protectionLevel is Private => {
		return protectionLevel._tag === "Private";
	},

	/**
	 * Type guard to check if a protection level is Protected
	 */
	isProtected: (
		protectionLevel: TsProtectionLevel,
	): protectionLevel is Protected => {
		return protectionLevel._tag === "Protected";
	},

	/**
	 * Checks if a protection level is accessible (not private)
	 */
	isAccessible: (protectionLevel: TsProtectionLevel): boolean => {
		return (
			TsProtectionLevel.isDefault(protectionLevel) ||
			TsProtectionLevel.isProtected(protectionLevel)
		);
	},

	/**
	 * Checks if a protection level is restricted (private or protected)
	 */
	isRestricted: (protectionLevel: TsProtectionLevel): boolean => {
		return (
			TsProtectionLevel.isPrivate(protectionLevel) ||
			TsProtectionLevel.isProtected(protectionLevel)
		);
	},

	/**
	 * Converts a protection level to its string representation
	 */
	toString: (protectionLevel: TsProtectionLevel): string => {
		switch (protectionLevel._tag) {
			case "Default":
				return "Default";
			case "Private":
				return "Private";
			case "Protected":
				return "Protected";
		}
	},

	/**
	 * Converts a protection level to its TypeScript keyword representation
	 */
	toKeyword: (protectionLevel: TsProtectionLevel): string => {
		switch (protectionLevel._tag) {
			case "Default":
				return "";
			case "Private":
				return "private";
			case "Protected":
				return "protected";
		}
	},

	/**
	 * Parses a string into a TsProtectionLevel
	 * Returns None if the string doesn't match any known protection level
	 */
	fromString: (str: string): Option<TsProtectionLevel> => {
		const trimmed = str.trim();
		switch (trimmed) {
			case "Default":
				return some(TsProtectionLevel.default());
			case "Private":
				return some(TsProtectionLevel.private());
			case "Protected":
				return some(TsProtectionLevel.protected());
			default:
				return none;
		}
	},

	/**
	 * Parses a TypeScript keyword into a TsProtectionLevel
	 * Returns None if the keyword doesn't match any known protection level
	 */
	fromKeyword: (keyword: string): Option<TsProtectionLevel> => {
		const trimmed = keyword.trim();
		switch (trimmed) {
			case "":
			case "public":
				return some(TsProtectionLevel.default());
			case "private":
				return some(TsProtectionLevel.private());
			case "protected":
				return some(TsProtectionLevel.protected());
			default:
				return none;
		}
	},

	/**
	 * Checks if two protection levels are equal
	 */
	equals: (a: TsProtectionLevel, b: TsProtectionLevel): boolean => {
		return a._tag === b._tag;
	},

	/**
	 * Gets all possible protection levels
	 */
	get all(): TsProtectionLevel[] {
		return [
			TsProtectionLevel.default(),
			TsProtectionLevel.private(),
			TsProtectionLevel.protected(),
		];
	},

	/**
	 * Pattern matching utility for TsProtectionLevel
	 */
	match: <T>(
		protectionLevel: TsProtectionLevel,
		cases: {
			Default: () => T;
			Private: () => T;
			Protected: () => T;
		},
	): T => {
		switch (protectionLevel._tag) {
			case "Default":
				return cases.Default();
			case "Private":
				return cases.Private();
			case "Protected":
				return cases.Protected();
		}
	},

	/**
	 * Functional fold operation over TsProtectionLevel
	 */
	fold: <T>(
		onDefault: () => T,
		onPrivate: () => T,
		onProtected: () => T,
	): ((protectionLevel: TsProtectionLevel) => T) => {
		return (protectionLevel: TsProtectionLevel) => {
			switch (protectionLevel._tag) {
				case "Default":
					return onDefault();
				case "Private":
					return onPrivate();
				case "Protected":
					return onProtected();
			}
		};
	},
};

/**
 * Singleton instances for each protection level
 */
export const DefaultInstance: Default = TsProtectionLevel.default();
export const PrivateInstance: Private = TsProtectionLevel.private();
export const ProtectedInstance: Protected = TsProtectionLevel.protected();
