/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.Utils
 *
 * Provides utility functions for TypeScript tree processing.
 * This module contains helper functions for JavaScript location management
 * and searching among declarations within scoped contexts.
 */

import { isSome, type Option } from "fp-ts/Option";
import { Comments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import { CodePath } from "../CodePath.js";
import { JsLocation } from "../JsLocation.js";
import { Picker } from "../Picker.js";
import type { LoopDetector, TsTreeScope } from "../TsTreeScope.js";
import { SetJsLocationTransform } from "../transforms/SetJsLocation.js";
import {
	TsDeclNamespace,
	type TsIdent,
	TsIdentDummy,
	type TsNamedDecl,
	type TsTree,
} from "../trees.js";

/**
 * Utils utility object providing utility functions for tree processing.
 * Equivalent to the Scala object Utils.
 */
export const Utils = {
	/**
	 * Sets the JavaScript location on a tree node and propagates it to members if applicable.
	 * This function handles the complex logic of updating JavaScript locations throughout
	 * the tree structure while preserving the original tree type.
	 *
	 * @param tree The tree node to update
	 * @param jsLocation The JavaScript location to set
	 * @returns The tree with updated JavaScript location
	 */
	withJsLocation: <T extends TsTree>(tree: T, jsLocation: JsLocation): T => {
		// Check if the tree has JavaScript location capability
		if (hasJsLocation(tree)) {
			const withLocation = tree.withJsLocation(jsLocation);

			// If it's a container, also update member locations
			if (isContainer(withLocation)) {
				const container = withLocation as any; // TsContainer
				const updatedMembers = container.members.map((member: any) =>
					SetJsLocationTransform.visitTsContainerOrDecl(jsLocation)(member),
				);
				return container.withMembers(updatedMembers) as T;
			} else {
				return withLocation as T;
			}
		}

		// Return unchanged if no JavaScript location capability
		return tree;
	},

	/**
	 * Searches among declarations for matching ones within a scoped context.
	 * This function creates a temporary namespace containing the declarations
	 * and searches within it using the tree scope's lookup mechanism.
	 *
	 * The TreeScope interface for this is somewhat awkward, so we contain it here
	 * as mentioned in the original Scala comment.
	 *
	 * @param scope The scoped tree scope to search in
	 * @param picker The picker to filter declaration types
	 * @param wanted The identifiers to look for
	 * @param expandeds The declarations to search among
	 * @param loopDetector Loop detection for preventing infinite recursion
	 * @returns Array of found declarations with their scopes
	 */
	searchAmong: <T extends TsNamedDecl>(
		scope: TsTreeScope.Scoped,
		picker: { pick: (decl: TsNamedDecl) => Option<T> },
		wanted: IArray<TsIdent>,
		expandeds: IArray<TsNamedDecl>,
		loopDetector: LoopDetector,
	): IArray<[T, TsTreeScope]> => {
		// Optimization: return early if no declarations to search
		if (expandeds.length === 0) {
			return IArray.Empty;
		}

		// Create a temporary namespace containing all the declarations
		const ns = TsDeclNamespace.create(
			Comments.empty(),
			false, // declared
			TsIdentDummy,
			expandeds as any, // TODO: fix type
			CodePath.noPath(),
			JsLocation.zero(),
		);

		// Create a new scope with the temporary namespace
		const newScope = scope["/"](ns);

		// Look up the wanted identifiers in the new scope
		return newScope
			.lookupInternal(Picker.All, wanted, loopDetector)
			.flatMap(([foundDecl, newNewScope]) => {
				// Check if we found our dummy namespace
				if (
					foundDecl._tag === "TsDeclNamespace" &&
					foundDecl.name === TsIdentDummy
				) {
					const namespace = foundDecl as any; // TsDeclNamespace
					// Extract matching declarations from the namespace members
					return namespace.members.flatMap((member: TsNamedDecl) => {
						const picked = picker.pick(member);
						if (isSome(picked)) {
							return IArray.fromArray([[picked.value, newNewScope]] as [
								T,
								TsTreeScope,
							][]);
						}
						return IArray.Empty;
					});
				} else {
					// Direct match - check if it matches our picker
					const picked = picker.pick(foundDecl);
					if (isSome(picked)) {
						return IArray.fromArray([[picked.value, newNewScope]] as [
							T,
							TsTreeScope,
						][]);
					}
					return IArray.Empty;
				}
			});
	},
};

// Helper functions

/**
 * Type guard to check if a tree node has JavaScript location capability
 */
function hasJsLocation(
	tree: TsTree,
): tree is TsTree & { withJsLocation: (loc: JsLocation) => any } {
	return typeof tree === "object" && tree !== null && "withJsLocation" in tree;
}

/**
 * Type guard to check if a tree node is a container with members
 */
function isContainer(tree: any): boolean {
	return (
		tree &&
		typeof tree === "object" &&
		"members" in tree &&
		"withMembers" in tree
	);
}
