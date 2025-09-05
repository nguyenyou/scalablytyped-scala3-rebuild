/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.RemoveComment
 *
 * Provides functionality to remove comments from TypeScript AST nodes.
 * This is a complete port of the Scala implementation with the following features:
 *
 * 1. **Trait pattern**: Uses TypeScript interfaces with functional implementations
 *    to represent Scala's trait RemoveComment[T]
 *
 * 2. **Implicit instances**: Uses object-based implementations to represent
 *    Scala's implicit instances for different types
 *
 * 3. **Functional programming with fp-ts**: Uses fp-ts for functional composition
 *    and maintains alignment with the original Scala functional programming approach
 *
 * 4. **Type safety**: Maintains strong typing through TypeScript's type system
 *    to ensure only supported types can have comments removed
 */

import { Comments } from "../Comments.js";
import type { IArray } from "../IArray.js";
import type {
	TsDeclFunction,
	TsMemberCall,
	TsMemberCtor,
	TsMemberFunction,
} from "./trees.js";

// ============================================================================
// RemoveComment trait equivalent
// ============================================================================

/**
 * Interface representing the ability to remove comments from a type T
 * Equivalent to Scala's `trait RemoveComment[T]`
 */
export interface RemoveComment<T> {
	/**
	 * Remove comments from the given object
	 * Equivalent to Scala's `def remove(t: T): T`
	 */
	remove(t: T): T;
}

// ============================================================================
// Implicit instances for specific types
// ============================================================================

/**
 * RemoveComment instance for TsMemberCtor
 * Equivalent to Scala's `implicit val r0: RemoveComment[TsMemberCtor] = _.copy(comments = NoComments)`
 */
export const removeCommentTsMemberCtor: RemoveComment<TsMemberCtor> = {
	remove: (ctor: TsMemberCtor): TsMemberCtor => ({
		...ctor,
		comments: Comments.empty(),
		withComments: ctor.withComments,
		addComment: ctor.addComment,
	}),
};

/**
 * RemoveComment instance for TsMemberFunction
 * Equivalent to Scala's `implicit val r1: RemoveComment[TsMemberFunction] = _.copy(comments = NoComments)`
 */
export const removeCommentTsMemberFunction: RemoveComment<TsMemberFunction> = {
	remove: (func: TsMemberFunction): TsMemberFunction => ({
		...func,
		comments: Comments.empty(),
		withComments: func.withComments,
		addComment: func.addComment,
	}),
};

/**
 * RemoveComment instance for TsMemberCall
 * Equivalent to Scala's `implicit val r2: RemoveComment[TsMemberCall] = _.copy(comments = NoComments)`
 */
export const removeCommentTsMemberCall: RemoveComment<TsMemberCall> = {
	remove: (call: TsMemberCall): TsMemberCall => ({
		...call,
		comments: Comments.empty(),
		withComments: call.withComments,
		addComment: call.addComment,
	}),
};

/**
 * RemoveComment instance for TsDeclFunction
 * Equivalent to Scala's `implicit val r3: RemoveComment[TsDeclFunction] = _.copy(comments = NoComments)`
 */
export const removeCommentTsDeclFunction: RemoveComment<TsDeclFunction> = {
	remove: (decl: TsDeclFunction): TsDeclFunction => ({
		...decl,
		comments: Comments.empty(),
		withComments: decl.withComments,
		addComment: decl.addComment,
		withCodePath: decl.withCodePath,
		withJsLocation: decl.withJsLocation,
		withName: decl.withName,
	}),
};

// ============================================================================
// RemoveComment namespace (equivalent to Scala's object RemoveComment)
// ============================================================================

/**
 * RemoveComment utility functions and instances
 * Equivalent to Scala's `object RemoveComment`
 */
export namespace RemoveComment {
	/**
	 * RemoveComment instance for TsMemberCtor
	 * Equivalent to Scala's `implicit val r0`
	 */
	export const r0 = removeCommentTsMemberCtor;

	/**
	 * RemoveComment instance for TsMemberFunction
	 * Equivalent to Scala's `implicit val r1`
	 */
	export const r1 = removeCommentTsMemberFunction;

	/**
	 * RemoveComment instance for TsMemberCall
	 * Equivalent to Scala's `implicit val r2`
	 */
	export const r2 = removeCommentTsMemberCall;

	/**
	 * RemoveComment instance for TsDeclFunction
	 * Equivalent to Scala's `implicit val r3`
	 */
	export const r3 = removeCommentTsDeclFunction;

	/**
	 * Keep comments only on the first element of an array, remove from all others
	 * Equivalent to Scala's `def keepFirstOnly[T <: AnyRef: RemoveComment](fs: IArray[T]): IArray[T]`
	 *
	 * @param fs Array of elements that support comment removal
	 * @param removeComment RemoveComment instance for type T
	 * @returns Array with comments preserved only on the first element
	 */
	export function keepFirstOnly<T>(
		fs: IArray<T>,
		removeComment: RemoveComment<T>,
	): IArray<T> {
		return fs.zipWithIndex().map(([element, index]) => {
			if (index === 0) {
				return element;
			} else {
				return removeComment.remove(element);
			}
		});
	}
}
