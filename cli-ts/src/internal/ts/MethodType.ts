/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.MethodType
 *
 * Represents the different types of method declarations in TypeScript
 */

import { none, type Option, some } from "fp-ts/Option";

/**
 * Normal method type
 * Represents: method(): ReturnType
 */
export interface Normal {
	readonly _tag: "Normal";
}

/**
 * Getter method type
 * Represents: get property(): ReturnType
 */
export interface Getter {
	readonly _tag: "Getter";
}

/**
 * Setter method type
 * Represents: set property(value: Type): void
 */
export interface Setter {
	readonly _tag: "Setter";
}

/**
 * Base type for all TypeScript method types
 * Corresponds to the sealed trait MethodType in Scala
 */
export type MethodType = Normal | Getter | Setter;

/**
 * Constructor functions and utilities for MethodType
 */
export const MethodType = {
	/**
	 * Creates a Normal method type
	 */
	normal: (): Normal => ({
		_tag: "Normal",
	}),

	/**
	 * Creates a Getter method type
	 */
	getter: (): Getter => ({
		_tag: "Getter",
	}),

	/**
	 * Creates a Setter method type
	 */
	setter: (): Setter => ({
		_tag: "Setter",
	}),

	/**
	 * Type guard to check if a method type is Normal
	 */
	isNormal: (methodType: MethodType): methodType is Normal => {
		return methodType._tag === "Normal";
	},

	/**
	 * Type guard to check if a method type is Getter
	 */
	isGetter: (methodType: MethodType): methodType is Getter => {
		return methodType._tag === "Getter";
	},

	/**
	 * Type guard to check if a method type is Setter
	 */
	isSetter: (methodType: MethodType): methodType is Setter => {
		return methodType._tag === "Setter";
	},

	/**
	 * Checks if a method type is an accessor (getter or setter)
	 */
	isAccessor: (methodType: MethodType): boolean => {
		return MethodType.isGetter(methodType) || MethodType.isSetter(methodType);
	},

	/**
	 * Converts a method type to its string representation
	 */
	toString: (methodType: MethodType): string => {
		switch (methodType._tag) {
			case "Normal":
				return "Normal";
			case "Getter":
				return "Getter";
			case "Setter":
				return "Setter";
		}
	},

	/**
	 * Parses a string into a MethodType
	 * Returns None if the string doesn't match any known method type
	 */
	fromString: (str: string): Option<MethodType> => {
		const trimmed = str.trim();
		switch (trimmed) {
			case "Normal":
				return some(MethodType.normal());
			case "Getter":
				return some(MethodType.getter());
			case "Setter":
				return some(MethodType.setter());
			default:
				return none;
		}
	},

	/**
	 * Checks if two method types are equal
	 */
	equals: (a: MethodType, b: MethodType): boolean => {
		return a._tag === b._tag;
	},

	/**
	 * Gets all possible method types
	 */
	get all(): MethodType[] {
		return [MethodType.normal(), MethodType.getter(), MethodType.setter()];
	},

	/**
	 * Pattern matching utility for MethodType
	 */
	match: <T>(
		methodType: MethodType,
		cases: {
			Normal: () => T;
			Getter: () => T;
			Setter: () => T;
		},
	): T => {
		switch (methodType._tag) {
			case "Normal":
				return cases.Normal();
			case "Getter":
				return cases.Getter();
			case "Setter":
				return cases.Setter();
		}
	},

	/**
	 * Functional fold operation over MethodType
	 */
	fold: <T>(
		onNormal: () => T,
		onGetter: () => T,
		onSetter: () => T,
	): ((methodType: MethodType) => T) => {
		return (methodType: MethodType) => {
			switch (methodType._tag) {
				case "Normal":
					return onNormal();
				case "Getter":
					return onGetter();
				case "Setter":
					return onSetter();
			}
		};
	},
};

/**
 * Singleton instances for each method type
 */
export const NormalInstance: Normal = MethodType.normal();
export const GetterInstance: Getter = MethodType.getter();
export const SetterInstance: Setter = MethodType.setter();
