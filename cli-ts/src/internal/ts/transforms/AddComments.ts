/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.AddComments
 *
 * A tree transformation that adds comments to all TypeScript members.
 * This is useful for adding documentation, deprecation notices, or other metadata
 * to generated TypeScript code.
 */

import type { Comments } from "../../Comments.js";
import { TreeTransformationUnit } from "../TreeTransformations.js";
import type {
	TsMember,
	TsMemberCall,
	TsMemberCtor,
	TsMemberFunction,
	TsMemberIndex,
	TsMemberProperty,
	TsMemberTypeMapped,
} from "../trees.js";

/**
 * A transformation that adds comments to all TypeScript members.
 *
 * This transformation extends TreeTransformationUnit since it doesn't need
 * to maintain any context during traversal - it simply adds the same comments
 * to every member it encounters.
 *
 * @example
 * ```typescript
 * const deprecationComment = Comments.create("@deprecated Use newMethod instead");
 * const addDeprecation = new AddComments(deprecationComment);
 *
 * // Apply to a member
 * const updatedMember = addDeprecation.enterTsMember(undefined)(originalMember);
 * ```
 */
export class AddComments extends TreeTransformationUnit {
	/**
	 * Creates a new AddComments transformation.
	 *
	 * @param newComments The comments to add to each member
	 */
	constructor(public readonly newComments: Comments) {
		super();
	}

	/**
	 * Transforms a TypeScript member by adding the new comments to its existing comments.
	 *
	 * The new comments are concatenated to the existing comments, preserving the order:
	 * existing comments first, then new comments.
	 *
	 * @param t The transformation context (unused for unit transformations)
	 * @returns A function that transforms a TsMember
	 */
	enterTsMember(_t: undefined): (x: TsMember) => TsMember {
		return (x: TsMember) => {
			switch (x._tag) {
				case "TsMemberCall": {
					const call = x as TsMemberCall;
					return {
						...call,
						comments: call.comments.concat(this.newComments),
					};
				}

				case "TsMemberCtor": {
					const ctor = x as TsMemberCtor;
					return {
						...ctor,
						comments: ctor.comments.concat(this.newComments),
					};
				}

				case "TsMemberFunction": {
					const func = x as TsMemberFunction;
					return {
						...func,
						comments: func.comments.concat(this.newComments),
					};
				}

				case "TsMemberIndex": {
					const index = x as TsMemberIndex;
					return {
						...index,
						comments: index.comments.concat(this.newComments),
					};
				}

				case "TsMemberTypeMapped": {
					const mapped = x as TsMemberTypeMapped;
					return {
						...mapped,
						comments: mapped.comments.concat(this.newComments),
					};
				}

				case "TsMemberProperty": {
					const prop = x as TsMemberProperty;
					return {
						...prop,
						comments: prop.comments.concat(this.newComments),
					};
				}

				default:
					// This should never happen if all TsMember types are handled above
					return x;
			}
		};
	}
}
