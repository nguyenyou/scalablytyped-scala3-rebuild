/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ForwardCtors
 *
 * Forwards constructors from parent classes to child classes that don't have their own constructors.
 * This transformation ensures that classes inherit constructors from their parent classes when they
 * don't define their own constructors.
 */

import { left, right, type Either } from "fp-ts/Either";
import { none, some, type Option } from "fp-ts/Option";
import { pipe } from "fp-ts/function";
import { fold } from "fp-ts/Option";
import type { IArray } from "../../IArray.js";
import { FillInTParams } from "../FillInTParams.js";
import type { HasClassMembers } from "../MemberCache.js";
import { Picker } from "../Picker.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsDeclClass, TsDeclInterface, TsMember, TsNamedDecl, TsTypeRef } from "../trees.js";
import { TsIdentConstructor } from "../trees.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import { LoopDetector } from "../TsTreeScope.js";

/**
 * ForwardCtors transformation that extends TreeTransformationScopedChanges.
 * This transformation forwards constructors from parent classes to child classes
 * that don't have their own constructors.
 */
export class ForwardCtors extends TreeTransformationScopedChanges {
	/**
	 * Private helper method to find constructors in a parent class.
	 * This method recursively searches up the inheritance chain to find constructors.
	 *
	 * @param scope The current tree scope for lookups
	 * @param loopDetector Loop detector to prevent infinite recursion
	 * @param visited Set of visited class names to prevent circular inheritance
	 * @param parentRef The type reference to the parent class
	 * @returns Option containing the array of constructor members, or None if not found
	 */
	private parentWithCtor(
		scope: TsTreeScope,
		loopDetector: LoopDetector,
		visited: Set<string> = new Set(),
	): (parentRef: TsTypeRef) => Option<IArray<TsMember>> {
		return (parentRef: TsTypeRef): Option<IArray<TsMember>> => {
			// Check for circular inheritance using simple string-based detection
			const parentName = parentRef.name.parts.toArray().map(p => p.value).join(".");
			if (visited.has(parentName)) {
				return none;
			}

			const newVisited = new Set(visited);
			newVisited.add(parentName);

			const loopResult = loopDetector.including(parentRef, scope);

			if (loopResult._tag === "Left") {
				return none;
			}

			const newLd = loopResult.right;

			// Look up the parent class using the HasClassMemberss picker
			const lookupResults = scope.lookupInternal(Picker.HasClassMemberss, parentRef.name.parts, newLd);

			// Use firstDefined to find the first valid result
			const result = lookupResults.firstDefined(([parent, newScope]: [TsNamedDecl & HasClassMembers, TsTreeScope]) => {
				if (parent._tag === "TsDeclClass") {
					const parentClass = parent as TsDeclClass;

					// Fill in type parameters from the parent reference
					const parentRewritten = FillInTParams.apply(parentClass, parentRef.tparams);

					// Check if the parent has constructors
					const ctors = parentRewritten.membersByName.get(TsIdentConstructor);

					if (ctors && !ctors.isEmpty) {
						return ctors;
					}

					// If no constructors found, recursively check the parent's parent
					const grandParentResult = pipe(
						parentRewritten.parent,
						fold(
							() => none,
							(grandParentRef) => this.parentWithCtor(newScope, newLd, newVisited)(grandParentRef)
						)
					);

					if (grandParentResult._tag === "Some") {
						return grandParentResult.value;
					}
				} else if (parent._tag === "TsDeclInterface") {
					const parentInterface = parent as TsDeclInterface;

					// Fill in type parameters from the parent reference
					const parentRewritten = FillInTParams.apply(parentInterface, parentRef.tparams);

					// Check if the parent has constructors
					const ctors = parentRewritten.membersByName.get(TsIdentConstructor);

					if (ctors && !ctors.isEmpty) {
						return ctors;
					}
				}

				return undefined;
			});

			return result ? some(result) : none;
		};
	}

	/**
	 * Override the enterTsDeclClass method to forward constructors from parent classes.
	 * This is called when entering a class declaration during tree traversal.
	 *
	 * @param scope The current tree scope
	 * @returns A function that transforms the class declaration
	 */
	override enterTsDeclClass(scope: TsTreeScope): (x: TsDeclClass) => TsDeclClass {
		return (x: TsDeclClass): TsDeclClass => {
			// If the class already has constructors, leave it unchanged
			if (x.membersByName.has(TsIdentConstructor)) {
				return x;
			}
			
			// If the class has no parent, leave it unchanged
			if (x.parent._tag === "None") {
				return x;
			}
			
			// Try to find constructors in the parent class
			const parentRef = x.parent.value;
			const ctors = this.parentWithCtor(scope, LoopDetector.initial, new Set())(parentRef);
			
			return pipe(
				ctors,
				fold(
					() => x, // No constructors found, return unchanged
					(constructors) => ({
						...x,
						members: x.members.concat(constructors),
					})
				)
			);
		};
	}
}

/**
 * Singleton instance of ForwardCtors transformation
 */
export const forwardCtors = new ForwardCtors();
