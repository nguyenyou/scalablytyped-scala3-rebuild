/**
 * Transform that infers enum types by initializing unspecified members and replacing references.
 *
 * This transform performs two main operations:
 * 1. Initializes enum members without explicit values with auto-incremented numeric values
 * 2. Replaces references to other enum members with their resolved values
 *
 * Port of org.scalablytyped.converter.internal.ts.transforms.InferEnumTypes
 */

import type { IArray } from "@/internal/IArray.js";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import type { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import type {
	TsDeclEnum,
	TsEnumMember,
	TsExpr,
	TsExprRef,
	TsIdentSimple,
} from "@/internal/ts/trees.js";
import { TsExprLiteral, TsLiteral } from "@/internal/ts/trees.js";

/**
 * Transform that infers enum types by initializing members and replacing references.
 * Extends TreeTransformationScopedChanges to maintain scope context during transformation.
 */
export class InferEnumTypes extends TreeTransformationScopedChanges {
	/**
	 * Processes enum declarations by initializing members and replacing references.
	 * This is the main entry point for the transformation.
	 */
	enterTsDeclEnum(_scope: TsTreeScope): (e: TsDeclEnum) => TsDeclEnum {
		return (e: TsDeclEnum) => {
			const initializedMembers = this.initializeMembers(e.members);
			const finalMembers = this.replaceReferences(initializedMembers);

			return {
				...e,
				members: finalMembers,
			};
		};
	}

	/**
	 * Initializes enum members that don't have explicit values.
	 * Members without expressions get auto-incremented numeric values starting from 0.
	 *
	 * @param members The original enum members
	 * @returns Members with unspecified values initialized
	 */
	private initializeMembers(
		members: IArray<TsEnumMember>,
	): IArray<TsEnumMember> {
		let lastUnspecifiedIndex = 0;

		return members.map((member) => {
			// Check if member has no expression (None in Scala, undefined in TypeScript)
			if (member.expr._tag === "None") {
				// Create a numeric literal expression with the current index
				const numLiteral = TsLiteral.num(lastUnspecifiedIndex.toString());
				const literalExpr = TsExprLiteral.create(numLiteral);

				// Increment for next unspecified member
				lastUnspecifiedIndex += 1;

				// Return member with the new expression
				return {
					...member,
					expr: { _tag: "Some", value: literalExpr },
				};
			} else {
				// Member already has an expression, return as-is
				return member;
			}
		});
	}

	/**
	 * Replaces references to other enum members with their resolved values.
	 * This handles cases where enum members reference other members in the same enum.
	 *
	 * @param members The enum members (should already be initialized)
	 * @returns Members with references replaced by actual values
	 */
	private replaceReferences(
		members: IArray<TsEnumMember>,
	): IArray<TsEnumMember> {
		// Create a lookup map by member name (lazy evaluation in Scala)
		const byName = this.createMemberLookup(members);

		return members.map((member) => {
			// Only process members that have expressions
			if (member.expr._tag === "Some") {
				const expr = member.expr.value;

				// Visit the expression tree and replace references
				const newExpr = this.visitExpr(expr, byName);

				return {
					...member,
					expr: { _tag: "Some", value: newExpr },
				};
			} else {
				// Member has no expression, return as-is
				return member;
			}
		});
	}

	/**
	 * Creates a lookup map from member names to members.
	 * This is equivalent to the lazy val byName in the Scala implementation.
	 *
	 * @param members The enum members
	 * @returns Map from member name to member
	 */
	private createMemberLookup(
		members: IArray<TsEnumMember>,
	): Map<string, TsEnumMember> {
		const lookup = new Map<string, TsEnumMember>();

		for (let i = 0; i < members.length; i++) {
			const member = members.apply(i);
			lookup.set(member.name.value, member);
		}

		return lookup;
	}

	/**
	 * Visits an expression and replaces references to enum members.
	 * This is equivalent to TsExpr.visit in the Scala implementation.
	 *
	 * @param expr The expression to visit
	 * @param byName Lookup map for enum members
	 * @returns The transformed expression
	 */
	private visitExpr(expr: TsExpr, byName: Map<string, TsEnumMember>): TsExpr {
		// Check if this is a reference expression
		if (expr._tag === "TsExprRef") {
			const refExpr = expr as TsExprRef;
			const qident = refExpr.value;

			// Check if this is a simple reference (exactly one part) to an enum member
			if (qident.parts.length === 1) {
				const identPart = qident.parts.apply(0);

				// Check if it's a simple identifier and if we have a member with this name
				if (identPart._tag === "TsIdentSimple") {
					const simpleIdent = identPart as TsIdentSimple;
					const memberName = simpleIdent.value;

					if (byName.has(memberName)) {
						const referencedMember = byName.get(memberName)!;

						// Return the referenced member's expression
						if (referencedMember.expr._tag === "Some") {
							return referencedMember.expr.value;
						}
					}
				}
			}
		}

		// For other expression types, recursively visit their sub-expressions
		// This handles complex expressions that might contain references
		return this.visitExprRecursive(expr, byName);
	}

	/**
	 * Recursively visits sub-expressions for complex expression types.
	 * This implements the recursive visiting logic from TsExpr.visit.
	 *
	 * @param expr The expression to visit recursively
	 * @param byName Lookup map for enum members
	 * @returns The transformed expression
	 */
	private visitExprRecursive(
		expr: TsExpr,
		byName: Map<string, TsEnumMember>,
	): TsExpr {
		switch (expr._tag) {
			case "TsExprRef":
			case "TsExprLiteral":
				// Base cases - already handled in visitExpr
				return expr;

			case "TsExprCast": {
				const castExpr = expr as any; // TsExprCast
				return {
					...castExpr,
					expr: this.visitExpr(castExpr.expr, byName),
				};
			}

			case "TsExprArrayOf": {
				const arrayExpr = expr as any; // TsExprArrayOf
				return {
					...arrayExpr,
					expr: this.visitExpr(arrayExpr.expr, byName),
				};
			}

			case "TsExprCall": {
				const callExpr = expr as any; // TsExprCall
				const newFunction = this.visitExpr(callExpr.function, byName);
				const newParams = callExpr.params.map((p: TsExpr) =>
					this.visitExpr(p, byName),
				);

				return {
					...callExpr,
					function: newFunction,
					params: newParams,
				};
			}

			case "TsExprUnary": {
				const unaryExpr = expr as any; // TsExprUnary
				return {
					...unaryExpr,
					expr: this.visitExpr(unaryExpr.expr, byName),
				};
			}

			case "TsExprBinaryOp": {
				const binaryExpr = expr as any; // TsExprBinaryOp
				const newOne = this.visitExpr(binaryExpr.one, byName);
				const newTwo = this.visitExpr(binaryExpr.two, byName);

				return {
					...binaryExpr,
					one: newOne,
					two: newTwo,
				};
			}

			default:
				// Unknown expression type, return as-is
				return expr;
		}
	}
}

/**
 * Singleton instance of the InferEnumTypes transform.
 * This matches the object pattern used in the Scala implementation.
 */
export const inferEnumTypes = new InferEnumTypes();
