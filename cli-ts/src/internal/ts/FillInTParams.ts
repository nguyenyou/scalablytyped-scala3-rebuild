/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.FillInTParams
 *
 * For instance: `x: class Foo<T>` and `providedTParams: T = number` => `Foo<number>` Includes all members
 */

import { pipe } from "fp-ts/function";
import { fold, getOrElse, none, type Option, some } from "fp-ts/Option";
import { Comment } from "../Comment.js";
import { Comments } from "../Comments.js";
import { IArray } from "../IArray.js";
import { TsTreeTraverse } from "./TsTreeTraverse.js";
import { TypeRewriter } from "./transforms/TypeRewriter.js";
import {
	type TsDeclClass,
	type TsDeclInterface,
	type TsDeclTypeAlias,
	type TsFunSig,
	type TsIdent,
	type TsType,
	type TsTypeParam,
	TsTypeRef,
} from "./trees.js";

/**
 * Type for declarations that can have type parameters substituted
 */
type TsTypeParameterizable =
	| TsDeclInterface
	| TsDeclClass
	| TsDeclTypeAlias
	| TsFunSig;

/**
 * FillInTParams utility object for type parameter substitution
 */
export const FillInTParams = {
	/**
	 * Apply type parameter substitution to various declaration types
	 */
	apply<T extends TsTypeParameterizable>(
		x: T,
		providedTParams: IArray<TsType>,
	): T {
		return pipe(
			FillInTParams.rewriter(x.tparams, providedTParams),
			fold(
				() => x, // No substitution needed
				(replacements) => {
					const typeRewriter = new TypeRewriter(x);

					if (x._tag === "TsDeclInterface") {
						const transformed = typeRewriter.visitTsDeclInterface(replacements)(
							x as TsDeclInterface,
						);
						return {
							...transformed,
							tparams: IArray.Empty,
						} as T;
					} else if (x._tag === "TsDeclClass") {
						const transformed = typeRewriter.visitTsDeclClass(replacements)(
							x as TsDeclClass,
						);
						return {
							...transformed,
							tparams: IArray.Empty,
						} as T;
					} else if (x._tag === "TsDeclTypeAlias") {
						const transformed = typeRewriter.visitTsDeclTypeAlias(replacements)(
							x as TsDeclTypeAlias,
						);
						return {
							...transformed,
							tparams: IArray.Empty,
						} as T;
					} else if (x._tag === "TsFunSig") {
						const transformed = typeRewriter.visitTsFunSig(replacements)(
							x as TsFunSig,
						);
						return {
							...transformed,
							tparams: IArray.Empty,
						} as T;
					} else {
						// This should never happen with proper typing, but return original as fallback
						return x;
					}
				},
			),
		);
	},

	/**
	 * A function in scala cannot have type parameters, so we inline them with their defaults or upper bounds
	 */
	inlineTParams(sig: TsFunSig): TsFunSig {
		if (sig.tparams.length === 0) {
			return sig;
		}

		/**
		 * Check if a type parameter name appears recursively in a bound
		 */
		function recursiveBound(name: TsIdent, bound: TsType): boolean {
			const collected = TsTreeTraverse.collect(bound, (tree) => {
				if (tree._tag === "TsTypeRef") {
					const typeRef = tree as TsTypeRef;
					if (
						typeRef.name.parts.length === 1 &&
						typeRef.name.parts.get(0) === name
					) {
						return name;
					}
				}
				return undefined;
			});
			return collected.length > 0;
		}

		// Determine default types for each type parameter
		const defaulted = sig.tparams.map((tp: TsTypeParam) => {
			const defaultOrBound = pipe(
				tp.default,
				fold(
					() => tp.upperBound,
					(def) => some(def),
				),
			);

			return pipe(
				defaultOrBound,
				fold(
					() => TsTypeRef.any,
					(bound) => (recursiveBound(tp.name, bound) ? TsTypeRef.any : bound),
				),
			);
		});

		// Handle when type parameters reference each other
		const replacements = new Map<TsType, TsType>();

		// Use manual iteration to get both value and index
		for (let i = 0; i < sig.tparams.length; i++) {
			const tp = sig.tparams.get(i);
			const typeRef = TsTypeRef.fromIdent(tp.name);
			const defaultType = defaulted.get(i);
			replacements.set(typeRef, defaultType);
		}

		// Rewrite the defaulted types to handle cross-references
		const rewritten = defaulted.map((tpe: TsType) => {
			const typeRewriter = new TypeRewriter(sig);
			return typeRewriter.visitTsType(replacements)(tpe);
		});

		// Apply the final substitution
		return FillInTParams.apply(sig, rewritten);
	},

	/**
	 * Private helper to create type replacement map
	 */
	rewriter(
		expectedTParams: IArray<TsTypeParam>,
		providedTParams: IArray<TsType>,
	): Option<Map<TsType, TsType>> {
		if (expectedTParams.length === 0) {
			return none;
		}

		const replacements = new Map<TsType, TsType>();

		// Use manual iteration to get both value and index
		for (let i = 0; i < expectedTParams.length; i++) {
			const tp = expectedTParams.get(i);
			const provided =
				i < providedTParams.length
					? providedTParams.get(i)
					: pipe(
							tp.default,
							getOrElse((): TsType => {
								const warningComment = Comment.warning(
									`${tp.name.value} not provided`,
								);
								return {
									...TsTypeRef.any,
									comments: Comments.apply([warningComment]),
								} as TsType;
							}),
						);

			const typeRef = TsTypeRef.fromIdent(tp.name);
			replacements.set(typeRef, provided);
		}

		return some(replacements);
	},
};
