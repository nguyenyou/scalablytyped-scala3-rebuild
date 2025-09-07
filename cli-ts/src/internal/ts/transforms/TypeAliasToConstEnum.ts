/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.TypeAliasToConstEnum
 *
 * This transformation converts type aliases with union types of literal values into const enums.
 * This helps optimize TypeScript's type checking and provides better IntelliSense support for literal value sets.
 */

import { none, some } from "fp-ts/Option";
import { NoComments } from "../../Comments.js";
import type { IArray } from "../../IArray.js";
import { type PartialFunction, partialFunction } from "../../IArray.js";
import { JsLocation } from "../JsLocation.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import type {
	TsDecl,
	TsDeclTypeAlias,
	TsExpr,
	TsLiteral,
	TsQIdent,
	TsType,
	TsTypeLiteral,
	TsTypeRef,
	TsTypeUnion,
} from "../trees.js";
import {
	TsDeclEnum as TsDeclEnumConstructor,
	TsEnumMember as TsEnumMemberConstructor,
	TsExprLiteral,
	TsIdent,
} from "../trees.js";

/**
 * TypeAliasToConstEnum transformation.
 *
 * Converts type aliases with union types of literal values into const enums.
 * This transformation looks for type aliases of the form:
 *
 * ```typescript
 * type MyValues = "value1" | "value2" | "value3"
 * ```
 *
 * And converts them to:
 *
 * ```typescript
 * const enum MyValues {
 *   value1 = "value1",
 *   value2 = "value2",
 *   value3 = "value3"
 * }
 * ```
 *
 * This only happens when:
 * - The type alias has no type parameters
 * - The alias is a union type containing only literal types or references to other literal unions
 * - The type alias name is unique within its containing scope
 *
 * The transformation helps optimize TypeScript's type checking and provides better
 * IntelliSense support for literal value sets.
 */
export class TypeAliasToConstEnum extends TreeTransformationScopedChanges {
	/**
	 * Singleton instance for convenient usage
	 */
	static readonly instance = new TypeAliasToConstEnum();

	/**
	 * Process type declarations, converting literal union type aliases to const enums
	 */
	override enterTsDecl(scope: TsTreeScope): (x: TsDecl) => TsDecl {
		return (x: TsDecl) => {
			// Only process type aliases with no type parameters
			if (x._tag === "TsDeclTypeAlias") {
				const typeAlias = x as TsDeclTypeAlias;

				// Check if type alias has no type parameters and is unique in its container
				if (
					typeAlias.tparams.length === 0 &&
					this.isUniqueInContainer(scope, typeAlias)
				) {
					// Try to extract only literals from the type alias
					const allLiterals = this.extractOnlyLiterals(scope, typeAlias);

					if (allLiterals !== undefined) {
						// Create enum members from literals
						const members = allLiterals.map((lit) =>
							TsEnumMemberConstructor.create(
								NoComments.instance,
								TsIdent.simple(lit.value),
								some(TsExprLiteral.create(lit) as TsExpr),
							),
						);

						// Create const enum declaration
						return TsDeclEnumConstructor.create(
							typeAlias.comments,
							typeAlias.declared,
							true, // isConst
							typeAlias.name,
							members,
							false, // isValue
							none, // exportedFrom
							JsLocation.zero(),
							typeAlias.codePath,
						);
					}
				}
			}

			return x;
		};
	}

	/**
	 * Checks if a type alias name is unique within its containing scope.
	 * This ensures we only convert type aliases that won't conflict with other declarations.
	 */
	private isUniqueInContainer(
		scope: TsTreeScope,
		typeAlias: TsDeclTypeAlias,
	): boolean {
		const containerOpt = scope.surroundingTsContainer();
		if (containerOpt._tag === "None") {
			return false;
		}

		const container = containerOpt.value;
		const membersWithSameName = container.membersByName.get(typeAlias.name);
		return (
			membersWithSameName !== undefined && membersWithSameName.length === 1
		);
	}

	/**
	 * Extracts only literal values from a type alias, returning undefined if the type
	 * contains non-literal types or cannot be resolved.
	 *
	 * This method handles:
	 * - Direct literal types in unions
	 * - Type references to other type aliases containing literals
	 * - Nested resolution of type references
	 */
	private extractOnlyLiterals(
		scope: TsTreeScope,
		typeAlias: TsDeclTypeAlias,
	): IArray<TsLiteral> | undefined {
		// Only process union types
		if (typeAlias.alias._tag !== "TsTypeUnion") {
			return undefined;
		}

		const unionType = typeAlias.alias as TsTypeUnion;

		// Use partitionCollect2 to separate literal types from type references
		const literalPF = this.createLiteralPartialFunction();
		const typeRefPF = this.createTypeRefPartialFunction();

		const [literals, typeRefs, rest] = unionType.types.partitionCollect2(
			literalPF,
			typeRefPF,
		);

		// Only proceed if all types were either literals or type references (no other types)
		if (rest.length > 0) {
			return undefined;
		}

		// Resolve all type references to their literal values
		const nestedLiterals = typeRefs.map((ref) =>
			this.resolveTypeRefToLiterals(scope, ref),
		);

		// Check if all type references resolved successfully
		const resolvedPF = this.createResolvedPartialFunction();
		const unresolvedPF = this.createUnresolvedPartialFunction();

		const [resolved, unresolved, _] = nestedLiterals.partitionCollect2(
			resolvedPF,
			unresolvedPF,
		);

		// Only proceed if all references resolved successfully
		if (unresolved.length > 0) {
			return undefined;
		}

		// Combine direct literals with resolved literals and sort by string representation
		const allLiterals = literals.concat(resolved.flatMap((arr) => arr));
		return allLiterals.sortBy((lit) => lit.asString);
	}

	/**
	 * Creates a partial function for extracting literal types from union members
	 */
	private createLiteralPartialFunction(): PartialFunction<TsType, TsLiteral> {
		return partialFunction<TsType, TsLiteral>(
			// Predicate: check if this is a literal type
			(tpe: TsType): boolean => tpe._tag === "TsTypeLiteral",
			// Transformer: extract the literal value
			(tpe: TsType): TsLiteral => (tpe as TsTypeLiteral).literal,
		);
	}

	/**
	 * Creates a partial function for extracting type references from union members
	 */
	private createTypeRefPartialFunction(): PartialFunction<TsType, TsQIdent> {
		return partialFunction<TsType, TsQIdent>(
			// Predicate: check if this is a type reference with no type parameters
			(tpe: TsType): boolean => {
				if (tpe._tag === "TsTypeRef") {
					const typeRef = tpe as TsTypeRef;
					return typeRef.tparams.length === 0;
				}
				return false;
			},
			// Transformer: extract the qualified identifier
			(tpe: TsType): TsQIdent => (tpe as TsTypeRef).name,
		);
	}

	/**
	 * Creates a partial function for extracting successfully resolved literal arrays
	 */
	private createResolvedPartialFunction(): PartialFunction<
		IArray<TsLiteral> | undefined,
		IArray<TsLiteral>
	> {
		return partialFunction<IArray<TsLiteral> | undefined, IArray<TsLiteral>>(
			// Predicate: check if resolution was successful
			(result: IArray<TsLiteral> | undefined): boolean => result !== undefined,
			// Transformer: extract the resolved literals
			(result: IArray<TsLiteral> | undefined): IArray<TsLiteral> => result!,
		);
	}

	/**
	 * Creates a partial function for extracting failed resolutions
	 */
	private createUnresolvedPartialFunction(): PartialFunction<
		IArray<TsLiteral> | undefined,
		null
	> {
		return partialFunction<IArray<TsLiteral> | undefined, null>(
			// Predicate: check if resolution failed
			(result: IArray<TsLiteral> | undefined): boolean => result === undefined,
			// Transformer: return null marker
			(_result: IArray<TsLiteral> | undefined): null => null,
		);
	}

	/**
	 * Resolves a type reference to its literal values by looking up the referenced type
	 * and recursively extracting literals from it.
	 */
	private resolveTypeRefToLiterals(
		scope: TsTreeScope,
		ref: TsQIdent,
	): IArray<TsLiteral> | undefined {
		// Look up the type reference in the scope
		const lookupResults = scope.lookupTypeIncludeScope(ref);

		// Find the first result that can be resolved to literals
		for (let i = 0; i < lookupResults.length; i++) {
			const [decl, declScope] = lookupResults.apply(i);

			// Only process type aliases
			if (decl._tag === "TsDeclTypeAlias") {
				const typeAlias = decl as TsDeclTypeAlias;
				const literals = this.extractOnlyLiterals(declScope, typeAlias);
				if (literals !== undefined) {
					return literals;
				}
			}
		}

		return undefined;
	}
}

/**
 * Singleton instance for convenient usage
 */
export const TypeAliasToConstEnumInstance = TypeAliasToConstEnum.instance;
