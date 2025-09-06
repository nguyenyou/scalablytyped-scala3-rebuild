/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.InferTypeFromExpr
 *
 * This transform infers types from expressions for properties and variables that have
 * expressions but no explicit type annotations.
 *
 * The transform processes:
 * - TsMemberProperty: Properties with expressions but no type annotations
 * - TsDeclVar: Variable declarations with expressions but no type annotations
 *
 * For each case, it:
 * 1. Infers the type from the expression using TsExpr.typeOf()
 * 2. Widens literal types to their base types using TsExpr.widen()
 * 3. Adds a comment with the original expression (for TsTypeRef results)
 * 4. Removes the expression from the declaration
 *
 * Example transformation:
 * ```typescript
 * // Before:
 * let x = "hello";           // TsDeclVar with expr but no type
 * prop = 42;                 // TsMemberProperty with expr but no type
 *
 * // After:
 * let x: string;             // TsDeclVar with inferred type, no expr
 * prop: number;              // TsMemberProperty with inferred type, no expr
 * ```
 */

import { none, some } from "fp-ts/Option";
import { Comment } from "../../Comment.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import type { TsDeclVar, TsMemberProperty, TsType } from "../trees.js";
import { TsExpr, TsTypeRef } from "../trees.js";

/**
 * Transform that infers types from expressions for properties and variables.
 *
 * This transform extends TreeTransformationScopedChanges and processes TsMemberProperty
 * and TsDeclVar nodes that have expressions but no explicit type annotations.
 */
export class InferTypeFromExpr extends TreeTransformationScopedChanges {
	/**
	 * Processes TsMemberProperty nodes, inferring types from expressions.
	 */
	enterTsMemberProperty(
		_scope: TsTreeScope,
	): (x: TsMemberProperty) => TsMemberProperty {
		return (x: TsMemberProperty) => {
			// Only process properties with no type but with an expression
			if (x.tpe._tag === "None" && x.expr._tag === "Some") {
				const inferredType = this.toType(x.expr.value);
				return {
					...x,
					tpe: some(inferredType),
					expr: none,
				};
			}
			return x;
		};
	}

	/**
	 * Processes TsDeclVar nodes, inferring types from expressions.
	 */
	enterTsDeclVar(_scope: TsTreeScope): (x: TsDeclVar) => TsDeclVar {
		return (x: TsDeclVar) => {
			// Only process variables with no type but with an expression
			if (x.tpe._tag === "None" && x.expr._tag === "Some") {
				const inferredType = this.toType(x.expr.value);
				return {
					...x,
					tpe: some(inferredType),
					expr: none,
				};
			}
			return x;
		};
	}

	/**
	 * Converts an expression to a type by inferring the type and widening it.
	 * Adds a comment with the original expression if the result is a TsTypeRef.
	 *
	 * @param expr The expression to convert to a type
	 * @returns The inferred and widened type
	 */
	private toType(expr: TsExpr): TsType {
		const inferredType = TsExpr.typeOf(expr);
		const widenedType = TsExpr.widen(inferredType);

		// Add comment with original expression if the result is a TsTypeRef
		if (widenedType._tag === "TsTypeRef") {
			const typeRef = widenedType as TsTypeRef;
			const expressionComment = Comment.create(`/* ${TsExpr.format(expr)} */ `);
			return TsTypeRef.create(
				typeRef.comments.add(expressionComment),
				typeRef.name,
				typeRef.tparams,
			);
		}

		return widenedType;
	}
}

/**
 * Singleton instance of InferTypeFromExpr for convenient usage.
 * Equivalent to the Scala object InferTypeFromExpr.
 */
export const InferTypeFromExprTransform = new InferTypeFromExpr();

/**
 * Static transform function for functional usage.
 */
export const InferTypeFromExprTransformFunction = {
	/**
	 * Transform function for member properties.
	 */
	enterTsMemberProperty:
		(scope: TsTreeScope) =>
		(x: TsMemberProperty): TsMemberProperty => {
			return InferTypeFromExprTransform.enterTsMemberProperty(scope)(x);
		},

	/**
	 * Transform function for variable declarations.
	 */
	enterTsDeclVar:
		(scope: TsTreeScope) =>
		(x: TsDeclVar): TsDeclVar => {
			return InferTypeFromExprTransform.enterTsDeclVar(scope)(x);
		},

	withTree: (scope: TsTreeScope, tree: any): TsTreeScope => {
		return InferTypeFromExprTransform.withTree(scope, tree);
	},
};
