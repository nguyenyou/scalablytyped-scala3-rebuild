/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TsTreeTraverse
 *
 * Provides utilities for traversing TypeScript AST trees and collecting nodes
 * that match specific criteria. This implementation closely mirrors the Scala version
 * to ensure functional equivalence.
 */

import { IArray } from "../IArray.js";
import type { TsTree } from "./trees.js";

/**
 * Type for a partial function that extracts values from tree nodes.
 * Returns undefined when the function is not applicable to the given tree.
 */
export type ExtractFunction<T> = (tree: TsTree) => T | undefined;

/**
 * TsTreeTraverse utility object providing tree traversal functionality.
 * This is a direct port of the Scala TsTreeTraverse object.
 */
export const TsTreeTraverse = {
	/**
	 * Collect nodes from a single tree that match the extract function.
	 * This is equivalent to the Scala collect method.
	 */
	collect<T>(tree: TsTree, extract: ExtractFunction<T>): IArray<T> {
		return TsTreeTraverse.collectIArray(IArray.apply(tree), extract);
	},

	/**
	 * Collect nodes from an array of trees that match the extract function.
	 * This is equivalent to the Scala collectIArray method.
	 */
	collectIArray<T>(
		trees: IArray<TsTree>,
		extract: ExtractFunction<T>,
	): IArray<T> {
		const results: T[] = [];

		trees.forEach((tree) => {
			TsTreeTraverse.go(extract, results, tree);
		});

		return IArray.fromArray(results);
	},

	/**
	 * Internal recursive traversal function.
	 * Equivalent to the Scala 'go' function.
	 */
	go<T>(extract: ExtractFunction<T>, results: T[], tree: TsTree): void {
		// First, try to extract from the current tree (equivalent to extract.isDefinedAt and extract.apply)
		const extracted = extract(tree);
		if (extracted !== undefined) {
			results.push(extracted);
		}

		// Then recursively traverse the tree structure
		TsTreeTraverse.rec(extract, results, tree, tree);
	},

	/**
	 * Recursive helper that traverses object properties.
	 * This mirrors the Scala 'rec' function's pattern matching behavior.
	 */
	rec<T>(
		extract: ExtractFunction<T>,
		results: T[],
		originalTree: TsTree,
		current: any,
	): void {
		if (current === null || current === undefined) {
			return;
		}

		// Handle TsTree nodes (but avoid infinite recursion on the original tree)
		// Equivalent to: case x: TsTree if x ne tree =>
		if (current !== originalTree && TsTreeTraverse.isTsTree(current)) {
			TsTreeTraverse.go(extract, results, current);
			return;
		}

		// Handle regular arrays (equivalent to IterableOnce in Scala)
		if (Array.isArray(current)) {
			for (let i = 0; i < current.length; i++) {
				TsTreeTraverse.rec(extract, results, originalTree, current[i]);
			}
			return;
		}

		// Handle IArray objects (equivalent to IArray case in Scala)
		if (TsTreeTraverse.isIArray(current)) {
			for (let i = 0; i < current.length; i++) {
				TsTreeTraverse.rec(extract, results, originalTree, current.apply(i));
			}
			return;
		}

		// Handle objects (equivalent to Product case in Scala)
		// In Scala, Product.productElement gives access to all case class fields
		// In TypeScript, we traverse all own enumerable properties
		if (
			typeof current === "object" &&
			current !== null &&
			!TsTreeTraverse.isPrimitive(current)
		) {
			// Get all own property names (including non-enumerable ones for completeness)
			const propertyNames = Object.getOwnPropertyNames(current);
			for (const key of propertyNames) {
				// Skip functions, symbols, and other non-data properties
				if (TsTreeTraverse.shouldTraverseProperty(current, key)) {
					try {
						const value = current[key];
						TsTreeTraverse.rec(extract, results, originalTree, value);
					} catch (_e) {}
				}
			}
		}
	},

	/**
	 * Enhanced type guard to check if an object is a TsTree.
	 * Checks for the _tag property which all TsTree objects have.
	 */
	isTsTree(obj: any): obj is TsTree {
		return !!(
			obj &&
			typeof obj === "object" &&
			typeof obj._tag === "string" &&
			obj._tag.length > 0 &&
			typeof obj.asString === "string" &&
			// Ensure it's actually a TsTree by checking for common TsTree _tag patterns
			(obj._tag.startsWith("Ts") || obj._tag.startsWith("ts"))
		);
	},

	/**
	 * Type guard to check if an object is an IArray.
	 */
	isIArray(obj: any): obj is IArray<any> {
		return (
			obj &&
			typeof obj === "object" &&
			typeof obj.length === "number" &&
			typeof obj.apply === "function" &&
			typeof obj.forEach === "function"
		);
	},

	/**
	 * Check if an object is a primitive type that shouldn't be traversed.
	 */
	isPrimitive(obj: any): boolean {
		return (
			obj instanceof Date ||
			obj instanceof RegExp ||
			obj instanceof Error ||
			typeof obj === "function"
		);
	},

	/**
	 * Determine if a property should be traversed.
	 * Skips functions, symbols, and other non-data properties.
	 */
	shouldTraverseProperty(obj: any, key: string): boolean {
		// Skip private properties (starting with _) except _tag
		if (key.startsWith("_") && key !== "_tag") {
			return false;
		}

		// Skip known function properties
		if (key === "constructor" || key === "toString" || key === "valueOf") {
			return false;
		}

		try {
			const descriptor = Object.getOwnPropertyDescriptor(obj, key);
			if (!descriptor) {
				return false;
			}

			// Skip getters/setters and functions
			if (
				descriptor.get ||
				descriptor.set ||
				typeof descriptor.value === "function"
			) {
				return false;
			}

			return true;
		} catch (_e) {
			return false;
		}
	},
};
