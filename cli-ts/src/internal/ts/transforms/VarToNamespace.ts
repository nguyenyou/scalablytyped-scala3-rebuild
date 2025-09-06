/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.VarToNamespace
 *
 * This transform converts variable declarations with object types into namespace declarations.
 * When a variable is declared with a type that is an object literal, this transform converts
 * the variable into a namespace and hoists the object's members as declarations within that namespace.
 *
 * Example transformation:
 * ```typescript
 * // Before:
 * declare var MyLib: {
 *   prop: string;
 *   method(): void;
 * };
 *
 * // After:
 * declare namespace MyLib {
 *   declare var prop: string;
 *   declare function method(): void;
 * }
 * ```
 */

import { IArray } from "../../IArray.js";
import { Hoisting } from "../Hoisting.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import {
	TsContainerOrDecl,
	TsDecl,
	TsDeclNamespace,
	TsDeclVar,
	TsTypeObject,
} from "../trees.js";

/**
 * Transform that converts variable declarations with object types to namespace declarations.
 *
 * This transform extends TreeTransformationScopedChanges and processes TsDecl nodes.
 * It specifically looks for TsDeclVar nodes that have:
 * - A TsTypeObject as their type
 * - No initializer expression (expr is None)
 *
 * When these conditions are met, it converts the variable declaration into a namespace
 * declaration and hoists the object type's members as declarations within the namespace.
 */
export class VarToNamespace extends TreeTransformationScopedChanges {
	/**
	 * Processes TsDecl nodes, converting variable declarations with object types to namespaces.
	 */
	override enterTsDecl(_scope: TsTreeScope): (decl: TsDecl) => TsDecl {
		return (decl: TsDecl) => {
			// Check if this is a variable declaration with an object type and no initializer
			if (decl._tag === "TsDeclVar") {
				const varDecl = decl as TsDeclVar;

				// Must have a type, and that type must be a TsTypeObject, and no initializer
				if (
					varDecl.tpe._tag === "Some" &&
					varDecl.tpe.value._tag === "TsTypeObject" &&
					varDecl.expr._tag === "None"
				) {
					const objectType = varDecl.tpe.value as TsTypeObject;

					// Hoist the object's members to declarations
					const hoistedMembers = objectType.members.mapNotNoneOption(
						Hoisting.memberToDecl(varDecl.codePath, varDecl.jsLocation),
					);

					// Create a namespace declaration with the hoisted members
					// Combine comments from the variable and the object type
					const combinedComments = varDecl.comments.concat(objectType.comments);

					// Cast to TsContainerOrDecl since TsNamedValueDecl extends TsContainerOrDecl
					const namespace = TsDeclNamespace.create(
						combinedComments,
						varDecl.declared,
						varDecl.name,
						hoistedMembers as unknown as IArray<TsContainerOrDecl>,
						varDecl.codePath,
						varDecl.jsLocation,
					);

					return namespace;
				}
			}

			// For all other cases, return the declaration unchanged
			return decl;
		};
	}
}

/**
 * Singleton instance of VarToNamespace for convenient usage.
 * Equivalent to the Scala object VarToNamespace.
 */
export const VarToNamespaceTransform = new VarToNamespace();

/**
 * Static transform function for functional usage.
 */
export const VarToNamespaceTransformFunction = {
	/**
	 * Transform function that can be used directly.
	 */
	enterTsDecl:
		(scope: TsTreeScope) =>
		(x: TsDecl): TsDecl => {
			return VarToNamespaceTransform.enterTsDecl(scope)(x);
		},

	withTree: (scope: TsTreeScope, tree: any): TsTreeScope => {
		return VarToNamespaceTransform.withTree(scope, tree);
	},
};