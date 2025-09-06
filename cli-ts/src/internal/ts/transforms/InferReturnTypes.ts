/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.InferReturnTypes
 *
 * This transform infers return types for functions by looking at parent class/interface 
 * implementations with the same signature.
 *
 * The transform processes TsMemberFunction nodes and:
 * 1. Skips constructors (they don't have return types)
 * 2. Only processes functions with no return type but with parameters
 * 3. Looks for the owner (class/interface) in the scope stack
 * 4. Uses ParentsResolver to find parent implementations
 * 5. Looks for functions with the same name and parameter count that have return types
 * 6. Copies the return type from the parent implementation
 *
 * Example transformation:
 * ```typescript
 * // Before:
 * interface Parent {
 *   method(x: string): number;
 * }
 * 
 * interface Child extends Parent {
 *   method(x: string);  // No return type
 * }
 *
 * // After:
 * interface Child extends Parent {
 *   method(x: string): number;  // Return type inferred from Parent
 * }
 * ```
 */

import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import type {
	TsMemberFunction,
	TsFunSig,
	TsIdent,
	TsType,
	TsTree,
	TsMember,
} from "../trees.js";
import { MethodType } from "../MethodType.js";
import { ParentsResolver, type InterfaceOrClass } from "../ParentsResolver.js";
import { IArray } from "../../IArray.js";
import { some, none, type Option } from "fp-ts/Option";

/**
 * Transform that infers return types for functions by looking at parent implementations.
 * 
 * This transform extends TreeTransformationScopedChanges and processes TsMemberFunction nodes.
 * It looks for parent class/interface implementations with the same signature and copies
 * their return types.
 */
export class InferReturnTypes extends TreeTransformationScopedChanges {
	/**
	 * Processes TsMemberFunction nodes, inferring return types from parent implementations.
	 */
	enterTsMemberFunction(scope: TsTreeScope): (x: TsMemberFunction) => TsMemberFunction {
		return (x: TsMemberFunction) => {
			// Find the owner (class or interface) in the scope stack
			const ownerOpt: Option<InterfaceOrClass> = this.findOwnerInStack(scope.stack);

			// Pattern match on name, signature, and owner
			if (this.isConstructor(x.name)) {
				// Skip constructors
				return x;
			}

			if (this.hasNoReturnType(x.signature) && ownerOpt._tag === "Some") {
				const owner = ownerOpt.value;
				const rewrittenOpt = this.findParentImplementation(scope, owner, x);

				if (rewrittenOpt._tag === "Some") {
					scope.logger.debug("Inferred return type");
					return rewrittenOpt.value;
				} else {
					scope.logger.info("Could not infer return type");
					return x;
				}
			}

			// Default case: return unchanged
			return x;
		};
	}

	/**
	 * Finds the owner (class or interface) in the scope stack.
	 */
	private findOwnerInStack(stack: TsTree[]): Option<InterfaceOrClass> {
		for (const item of stack) {
			if (this.isInterfaceOrClass(item)) {
				return some(item as InterfaceOrClass);
			}
		}
		return none;
	}

	/**
	 * Checks if a name is the constructor identifier.
	 */
	private isConstructor(name: TsIdent): boolean {
		return name._tag === "TsIdentSimple" && name.value === "constructor";
	}

	/**
	 * Checks if a function signature has no return type but has parameters.
	 */
	private hasNoReturnType(signature: TsFunSig): boolean {
		return signature.resultType._tag === "None" && signature.params.length > 0;
	}

	/**
	 * Checks if a tree is an interface or class (InterfaceOrClass).
	 */
	private isInterfaceOrClass(tree: TsTree): boolean {
		return tree._tag === "TsDeclInterface" || tree._tag === "TsDeclClass";
	}

	/**
	 * Finds a parent implementation with the same signature and return type.
	 */
	private findParentImplementation(
		scope: TsTreeScope,
		owner: InterfaceOrClass,
		func: TsMemberFunction,
	): Option<TsMemberFunction> {
		const parentsResult = ParentsResolver.apply(scope, owner);
		
		for (const parent of parentsResult.parents) {
			const membersByName = this.getMembersByName(parent);
			const sameNameMembers = membersByName.get(func.name.value);
			
			if (sameNameMembers) {
				for (const member of sameNameMembers) {
					if (this.isMatchingFunction(member, func)) {
						const matchingFunc = member as TsMemberFunction;
						if (matchingFunc.signature.resultType._tag === "Some") {
							// Found a matching function with a return type
							return some({
								...func,
								signature: {
									...func.signature,
									resultType: matchingFunc.signature.resultType,
								},
							});
						}
					}
				}
			}
		}

		return none;
	}

	/**
	 * Gets a map of members by name from an interface or class.
	 */
	private getMembersByName(parent: InterfaceOrClass): Map<string, TsMember[]> {
		const membersByName = new Map<string, TsMember[]>();
		
		for (const member of parent.members) {
			if (this.hasMemberName(member)) {
				const name = this.getMemberName(member);
				if (name) {
					const existing = membersByName.get(name) || [];
					existing.push(member);
					membersByName.set(name, existing);
				}
			}
		}
		
		return membersByName;
	}

	/**
	 * Checks if a member has a name property.
	 */
	private hasMemberName(member: TsMember): boolean {
		return (
			member._tag === "TsMemberFunction" ||
			member._tag === "TsMemberProperty" ||
			member._tag === "TsMemberCall" ||
			member._tag === "TsMemberCtor"
		);
	}

	/**
	 * Gets the name of a member.
	 */
	private getMemberName(member: TsMember): string | null {
		switch (member._tag) {
			case "TsMemberFunction":
			case "TsMemberProperty":
			case "TsMemberCall":
				return (member as any).name.value;
			case "TsMemberCtor":
				return "constructor";
			default:
				return null;
		}
	}

	/**
	 * Checks if a member is a matching function with the same signature.
	 */
	private isMatchingFunction(member: TsMember, targetFunc: TsMemberFunction): boolean {
		if (member._tag !== "TsMemberFunction") {
			return false;
		}

		const memberFunc = member as TsMemberFunction;
		
		// Check if it's a normal method (not constructor, getter, setter)
		if (!MethodType.isNormal(memberFunc.methodType)) {
			return false;
		}

		// Check if parameter count matches
		if (memberFunc.signature.params.length !== targetFunc.signature.params.length) {
			return false;
		}

		return true;
	}
}

/**
 * Singleton instance of InferReturnTypes for convenient usage.
 * Equivalent to the Scala object InferReturnTypes.
 */
export const InferReturnTypesTransform = new InferReturnTypes();

/**
 * Static transform function for functional usage.
 */
export const InferReturnTypesTransformFunction = {
	/**
	 * Transform function for member functions.
	 */
	enterTsMemberFunction: (scope: TsTreeScope) => (x: TsMemberFunction): TsMemberFunction => {
		return InferReturnTypesTransform.enterTsMemberFunction(scope)(x);
	},

	withTree: (scope: TsTreeScope, tree: any): TsTreeScope => {
		return InferReturnTypesTransform.withTree(scope, tree);
	},
};