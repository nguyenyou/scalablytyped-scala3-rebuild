/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.Directive
 *
 * Represents TypeScript directive types for reference comments and compiler directives
 */

import { pipe } from "fp-ts/function";
import { none, type Option, some } from "fp-ts/Option";

/**
 * NoStdLib directive - corresponds to case object NoStdLib
 * Represents /// <reference no-default-lib="true" />
 */
export interface NoStdLib {
	readonly _tag: "NoStdLib";
}

/**
 * Path reference directive
 * Represents /// <reference path="../bluebird/bluebird-2.0.d.ts" />
 */
export interface PathRef {
	readonly _tag: "PathRef";
	readonly stringPath: string;
}

/**
 * Types reference directive
 * Represents /// <reference types="react" />
 */
export interface TypesRef {
	readonly _tag: "TypesRef";
	readonly stringPath: string;
}

/**
 * Library reference directive
 * Represents /// <reference lib="esnext" />
 */
export interface LibRef {
	readonly _tag: "LibRef";
	readonly stringPath: string;
}

/**
 * AMD module reference directive
 * Represents /// <amd-module name="moduleName" />
 */
export interface AmdModule {
	readonly _tag: "AmdModule";
	readonly stringPath: string;
}

/**
 * Base type for all TypeScript directives
 * Corresponds to the sealed trait Directive in Scala
 */
export type Directive = NoStdLib | PathRef | TypesRef | LibRef | AmdModule;

/**
 * Base type for reference directives
 * Corresponds to sealed trait Ref in Scala
 */
export type Ref = PathRef | TypesRef | LibRef | AmdModule;

/**
 * Constructor functions and utilities for Directive types
 */
export const Directive = {
	/**
	 * Creates a NoStdLib directive
	 */
	noStdLib: (): NoStdLib => ({
		_tag: "NoStdLib",
	}),

	/**
	 * Creates a PathRef directive
	 */
	pathRef: (stringPath: string): PathRef => ({
		_tag: "PathRef",
		stringPath,
	}),

	/**
	 * Creates a TypesRef directive
	 */
	typesRef: (stringPath: string): TypesRef => ({
		_tag: "TypesRef",
		stringPath,
	}),

	/**
	 * Creates a LibRef directive
	 */
	libRef: (stringPath: string): LibRef => ({
		_tag: "LibRef",
		stringPath,
	}),

	/**
	 * Creates an AmdModule directive
	 */
	amdModule: (stringPath: string): AmdModule => ({
		_tag: "AmdModule",
		stringPath,
	}),

	/**
	 * Type guard to check if a directive is NoStdLib
	 */
	isNoStdLib: (directive: Directive): directive is NoStdLib => {
		return directive._tag === "NoStdLib";
	},

	/**
	 * Type guard to check if a directive is a Ref type
	 */
	isRef: (directive: Directive): directive is Ref => {
		return directive._tag !== "NoStdLib";
	},

	/**
	 * Type guard to check if a directive is PathRef
	 */
	isPathRef: (directive: Directive): directive is PathRef => {
		return directive._tag === "PathRef";
	},

	/**
	 * Type guard to check if a directive is TypesRef
	 */
	isTypesRef: (directive: Directive): directive is TypesRef => {
		return directive._tag === "TypesRef";
	},

	/**
	 * Type guard to check if a directive is LibRef
	 */
	isLibRef: (directive: Directive): directive is LibRef => {
		return directive._tag === "LibRef";
	},

	/**
	 * Type guard to check if a directive is AmdModule
	 */
	isAmdModule: (directive: Directive): directive is AmdModule => {
		return directive._tag === "AmdModule";
	},

	/**
	 * Safely extracts the stringPath from a directive if it's a Ref type
	 */
	getStringPath: (directive: Directive): Option<string> => {
		return Directive.isRef(directive) ? some(directive.stringPath) : none;
	},

	/**
	 * Converts a directive to its string representation
	 */
	toString: (directive: Directive): string => {
		switch (directive._tag) {
			case "NoStdLib":
				return '/// <reference no-default-lib="true" />';
			case "PathRef":
				return `/// <reference path="${directive.stringPath}" />`;
			case "TypesRef":
				return `/// <reference types="${directive.stringPath}" />`;
			case "LibRef":
				return `/// <reference lib="${directive.stringPath}" />`;
			case "AmdModule":
				return `/// <amd-module name="${directive.stringPath}" />`;
		}
	},

	/**
	 * Parses a directive string into a Directive object
	 * Returns None if the string doesn't match any known directive pattern
	 */
	fromString: (directiveString: string): Option<Directive> => {
		const trimmed = directiveString.trim();

		// NoStdLib pattern
		if (trimmed.includes('no-default-lib="true"')) {
			return some(Directive.noStdLib());
		}

		// PathRef pattern
		const pathMatch = trimmed.match(
			/\/\/\/\s*<reference\s+path="([^"]+)"\s*\/>/,
		);
		if (pathMatch) {
			return some(Directive.pathRef(pathMatch[1]));
		}

		// TypesRef pattern
		const typesMatch = trimmed.match(
			/\/\/\/\s*<reference\s+types="([^"]+)"\s*\/>/,
		);
		if (typesMatch) {
			return some(Directive.typesRef(typesMatch[1]));
		}

		// LibRef pattern
		const libMatch = trimmed.match(/\/\/\/\s*<reference\s+lib="([^"]+)"\s*\/>/);
		if (libMatch) {
			return some(Directive.libRef(libMatch[1]));
		}

		// AmdModule pattern
		const amdMatch = trimmed.match(
			/\/\/\/\s*<amd-module\s+name="([^"]+)"\s*\/>/,
		);
		if (amdMatch) {
			return some(Directive.amdModule(amdMatch[1]));
		}

		return none;
	},

	/**
	 * Checks if two directives are equal
	 */
	equals: (a: Directive, b: Directive): boolean => {
		if (a._tag !== b._tag) {
			return false;
		}

		switch (a._tag) {
			case "NoStdLib":
				return true;
			case "PathRef":
			case "TypesRef":
			case "LibRef":
			case "AmdModule":
				return a.stringPath === (b as Ref).stringPath;
		}
	},
};

/**
 * Singleton instance for NoStdLib directive
 */
export const NoStdLibInstance: NoStdLib = Directive.noStdLib();
