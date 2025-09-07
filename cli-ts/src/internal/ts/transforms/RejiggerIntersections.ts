/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.RejiggerIntersections
 * 
 * Handling diverse constellations of union and intersection types in scala seems impossible.
 * 
 * Apply some duplication so we get larger types, but easier in the sense that they are plain union types
 * 
 * as an example, translate this:
 * ```
 * A & (B | C) & D
 * ```
 * 
 * into this:
 * ```
 * (A & B & D) | (A & C & D)
 * ```
 * 
 * Pass on doing this for multiple union types for now to guard against code explosion.
 */

import { IArray, IArrayPatterns, type PartialFunction, partialFunction } from "../../IArray.js";
import { TsTreeScope } from "../TsTreeScope.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";

import {
	TsTypeIntersect,
	TsTypeUnion,
	type TsType,
} from "../trees.js";

/**
 * Main RejiggerIntersections transformation object
 */
export const RejiggerIntersections = {
	/**
	 * Apply the RejiggerIntersections transformation
	 */
	apply: () => {
		return new RejiggerIntersectionsVisitor();
	},
};

/**
 * Visitor that rejiggers intersection types containing unions
 * 
 * This transformation converts intersection types that contain exactly one union type
 * into union types where each union member is intersected with the remaining types.
 * 
 * For example: `A & (B | C) & D` becomes `(A & B & D) | (A & C & D)`
 */
class RejiggerIntersectionsVisitor extends TreeTransformationScopedChanges {
	/**
	 * Transform intersection types that contain exactly one union type
	 */
	override enterTsType(scope: TsTreeScope): (x: TsType) => TsType {
		return (x: TsType) => {
			// Only process intersection types
			if (x._tag !== "TsTypeIntersect") {
				return x;
			}

			const intersectType = x as TsTypeIntersect;
			
			// Use partitionCollect to separate union types from other types
			const unionPartialFunction = partialFunction<TsType, TsTypeUnion>(
				(type: TsType) => type._tag === "TsTypeUnion",
				(type: TsType) => type as TsTypeUnion
			);

			const [unions, rest] = intersectType.types.partitionCollect(unionPartialFunction);

			// Only transform if there's exactly one union type
			const exactlyOneUnion = IArrayPatterns.exactlyOne(unions);
			if (exactlyOneUnion === undefined) {
				return x;
			}

			// Transform: A & (B | C) & D -> (A & B & D) | (A & C & D)
			// For each type in the union, create an intersection with the rest
			const newUnionTypes = exactlyOneUnion.types.map((unionMemberType: TsType) => {
				// Prepend the union member to the rest of the types
				const newIntersectionTypes = rest.prepend(unionMemberType);
				return TsTypeIntersect.create(newIntersectionTypes) as TsType;
			});

			return TsTypeUnion.create(newUnionTypes);
		};
	}
}
