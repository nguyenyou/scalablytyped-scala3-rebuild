/**
 * TypeScript port of org.scalablytyped.converter.internal.logging.Formatter
 *
 * Provides type-safe formatting functionality for various data types,
 * using fp-ts for functional programming patterns to align with the original Scala implementation.
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";

/**
 * Formatter interface - equivalent to Scala's Formatter trait
 */
export interface Formatter<T> {
	apply(t: T): string;
}

/**
 * Main Formatter namespace containing all formatter implementations
 */
export namespace Formatter {
	/**
	 * Apply function - equivalent to Scala's Formatter.apply
	 */
	export function apply<T>(formatter: Formatter<T>): (t: T) => string {
		return (t: T) => formatter.apply(t);
	}

	/**
	 * Helper function to format a value using its formatter
	 */
	export function format<T>(t: T, formatter: Formatter<T>): string {
		return formatter.apply(t);
	}

	// Basic formatters
	export const StringFormatter: Formatter<string> = {
		apply: (x: string) => x,
	};

	export const NumberFormatter: Formatter<number> = {
		apply: (x: number) => x.toString(),
	};

	export const UnitFormatter: Formatter<void> = {
		apply: (_: undefined) => "",
	};

	export const UndefinedFormatter: Formatter<undefined> = {
		apply: (_: undefined) => "",
	};

	export const NullFormatter: Formatter<null> = {
		apply: (_: null) => "",
	};

	// File and URI formatters (using Node.js types)
	export const FileFormatter: Formatter<{ name: string }> = {
		apply: (file: { name: string }) => file.name,
	};

	export const URIFormatter: Formatter<URL> = {
		apply: (uri: URL) => uri.toString(),
	};

	export const URLStringFormatter: Formatter<string> = {
		apply: (uri: string) => uri,
	};

	// Tuple formatters
	export function Tuple2Formatter<T1, T2>(
		formatter1: Formatter<T1>,
		formatter2: Formatter<T2>,
	): Formatter<[T1, T2]> {
		return {
			apply: ([t1, t2]: [T1, T2]) => {
				return [formatter1.apply(t1), ", ", formatter2.apply(t2)].join("");
			},
		};
	}

	export function Tuple3Formatter<T1, T2, T3>(
		formatter1: Formatter<T1>,
		formatter2: Formatter<T2>,
		formatter3: Formatter<T3>,
	): Formatter<[T1, T2, T3]> {
		return {
			apply: ([t1, t2, t3]: [T1, T2, T3]) => {
				return [
					formatter1.apply(t1),
					", ",
					formatter2.apply(t2),
					", ",
					formatter3.apply(t3),
				].join("");
			},
		};
	}

	export function Tuple4Formatter<T1, T2, T3, T4>(
		formatter1: Formatter<T1>,
		formatter2: Formatter<T2>,
		formatter3: Formatter<T3>,
		formatter4: Formatter<T4>,
	): Formatter<[T1, T2, T3, T4]> {
		return {
			apply: ([t1, t2, t3, t4]: [T1, T2, T3, T4]) => {
				return [
					formatter1.apply(t1),
					", ",
					formatter2.apply(t2),
					", ",
					formatter3.apply(t3),
					", ",
					formatter4.apply(t4),
				].join("");
			},
		};
	}

	// Either formatter (using fp-ts Either)
	export function EitherFormatter<L, R>(
		leftFormatter: Formatter<L>,
		rightFormatter: Formatter<R>,
	): Formatter<E.Either<L, R>> {
		return {
			apply: (either: E.Either<L, R>) => {
				return pipe(
					either,
					E.fold(
						(left: L) => leftFormatter.apply(left),
						(right: R) => rightFormatter.apply(right),
					),
				);
			},
		};
	}

	// Option formatter (using fp-ts Option)
	export function OptionFormatter<T>(
		formatter: Formatter<T>,
	): Formatter<O.Option<T>> {
		return {
			apply: (option: O.Option<T>) => {
				return pipe(
					option,
					O.fold(
						() => "",
						(value: T) => formatter.apply(value),
					),
				);
			},
		};
	}

	// Iterable formatter (for arrays, sets, etc.)
	export function IterableFormatter<T>(
		formatter: Formatter<T>,
	): Formatter<Iterable<T>> {
		return {
			apply: (iterable: Iterable<T>) => {
				const items = Array.from(iterable);
				if (items.length === 0) {
					return "";
				}

				const result: string[] = new Array(items.length * 2 - 1 + 2);
				let idx = 0;
				result[idx] = "[";
				idx += 1;

				for (const item of items) {
					result[idx] = formatter.apply(item);
					result[idx + 1] = ", ";
					idx += 2;
				}

				result[idx - 1] = "]";
				return result.join("");
			},
		};
	}

	// Array formatter
	export function ArrayFormatter<T>(formatter: Formatter<T>): Formatter<T[]> {
		return {
			apply: (array: T[]) => {
				if (array.length === 0) {
					return "";
				}

				const result: string[] = new Array(array.length * 2 - 1 + 2);
				let idx = 0;
				result[idx] = "[";
				idx += 1;

				for (const item of array) {
					result[idx] = formatter.apply(item);
					result[idx + 1] = ", ";
					idx += 2;
				}

				result[idx - 1] = "]";
				return result.join("");
			},
		};
	}

	// Map formatter
	export function MapFormatter<K, V>(
		keyFormatter: Formatter<K>,
		valueFormatter: Formatter<V>,
	): Formatter<Map<K, V>> {
		return {
			apply: (map: Map<K, V>) => {
				if (map.size === 0) {
					return "";
				}

				const result: string[] = new Array(map.size * 4 - 1 + 2);
				let idx = 0;
				result[idx] = "[";
				idx += 1;

				for (const [key, value] of map) {
					result[idx + 0] = keyFormatter.apply(key);
					result[idx + 1] = " => ";
					result[idx + 2] = valueFormatter.apply(value);
					result[idx + 3] = ", ";
					idx += 4;
				}

				result[idx - 1] = "]";
				return result.join("");
			},
		};
	}

	// Record formatter (for plain objects)
	export function RecordFormatter<V>(
		valueFormatter: Formatter<V>,
	): Formatter<Record<string, V>> {
		return {
			apply: (record: Record<string, V>) => {
				const entries = Object.entries(record);
				if (entries.length === 0) {
					return "";
				}

				const result: string[] = new Array(entries.length * 4 - 1 + 2);
				let idx = 0;
				result[idx] = "[";
				idx += 1;

				for (const [key, value] of entries) {
					result[idx + 0] = key;
					result[idx + 1] = " => ";
					result[idx + 2] = valueFormatter.apply(value);
					result[idx + 3] = ", ";
					idx += 4;
				}

				result[idx - 1] = "]";
				return result.join("");
			},
		};
	}

	// Error/Exception formatter (equivalent to ThrowableFormatter)
	export function ErrorFormatter<T extends Error>(): Formatter<T> {
		return {
			apply: (error: T) => {
				if (error.message != null && error.message !== "") {
					return `${error.constructor.name}: ${error.message}`;
				} else {
					return error.constructor.name;
				}
			},
		};
	}

	// Default error formatter
	export const DefaultErrorFormatter: Formatter<Error> =
		ErrorFormatter<Error>();
}

// Export commonly used formatters as constants
export const stringFormatter = Formatter.StringFormatter;
export const numberFormatter = Formatter.NumberFormatter;
export const unitFormatter = Formatter.UnitFormatter;
export const undefinedFormatter = Formatter.UndefinedFormatter;
export const nullFormatter = Formatter.NullFormatter;
export const fileFormatter = Formatter.FileFormatter;
export const uriFormatter = Formatter.URIFormatter;
export const errorFormatter = Formatter.DefaultErrorFormatter;

// Export factory functions for complex formatters
export const tuple2Formatter = Formatter.Tuple2Formatter;
export const tuple3Formatter = Formatter.Tuple3Formatter;
export const tuple4Formatter = Formatter.Tuple4Formatter;
export const eitherFormatter = Formatter.EitherFormatter;
export const optionFormatter = Formatter.OptionFormatter;
export const iterableFormatter = Formatter.IterableFormatter;
export const arrayFormatter = Formatter.ArrayFormatter;
export const mapFormatter = Formatter.MapFormatter;
export const recordFormatter = Formatter.RecordFormatter;
