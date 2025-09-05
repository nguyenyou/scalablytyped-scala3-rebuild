/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.FollowAliases
 *
 * This module provides functionality to follow type aliases and resolve them to their underlying types.
 * It handles recursive alias resolution, thin interface resolution, and union/intersection type processing.
 */

import { Comment } from "../Comment.js";
import { Comments } from "../Comments.js";
import { partialFunction } from "../IArray.js";
import { FillInTParams } from "./FillInTParams.js";
import type { TsTreeScope } from "./TsTreeScope.js";
import { TsTypeFormatter } from "./TsTypeFormatter.js";
import type {
	TsDeclInterface,
	TsDeclTypeAlias,
	TsNamedDecl,
	TsType,
} from "./trees.js";
import { TsTypeIntersect, TsTypeRef, TsTypeUnion } from "./trees.js";

/**
 * FollowAliases utility object for resolving type aliases
 *
 * This is a faithful port of the Scala FollowAliases object, maintaining
 * the exact same behavior and logic patterns.
 */
export const FollowAliases = {
	/**
	 * Main apply method that follows type aliases recursively
	 *
	 * @param scope The TypeScript tree scope for type lookups
	 * @param skipValidation Whether to skip validation during lookup (default: false)
	 * @param tpe The type to resolve
	 * @returns The resolved type after following all aliases
	 */
	apply:
		(scope: TsTreeScope, skipValidation: boolean = false) =>
		(tpe: TsType): TsType => {
			try {
				switch (tpe._tag) {
					case "TsTypeRef": {
						const typeRef = tpe as TsTypeRef;

						// Look up the type in the scope
						const lookupResult = scope.lookupType(typeRef.name, skipValidation);

						// Use collectFirst to handle the lookup result
						const resolvedType = lookupResult.collectFirst(
							partialFunction<TsNamedDecl, TsType>(
								// Predicate: check if this is a type alias or thin interface
								(decl: TsNamedDecl): boolean => {
									if (decl._tag === "TsDeclTypeAlias") {
										return true;
									}
									if (decl._tag === "TsDeclInterface") {
										const iface = decl as TsDeclInterface;
										// Check if it's a thin interface: exactly one inheritance and no members
										return (
											iface.inheritance.length === 1 &&
											iface.members.length === 0
										);
									}
									return false;
								},
								// Transform: apply the appropriate transformation
								(decl: TsNamedDecl): TsType => {
									if (decl._tag === "TsDeclTypeAlias") {
										const ta = decl as TsDeclTypeAlias;
										const next = FillInTParams.apply(ta, typeRef.tparams).alias;
										return FollowAliases.apply(scope, skipValidation)(next);
									} else if (decl._tag === "TsDeclInterface") {
										const i = decl as TsDeclInterface;
										const filledInterface = FillInTParams.apply(
											i,
											typeRef.tparams,
										);
										return FollowAliases.apply(
											scope,
											skipValidation,
										)(filledInterface.inheritance.apply(0));
									}
									// This should never happen due to the predicate, but TypeScript needs it
									return typeRef;
								},
							),
						);

						return resolvedType ?? typeRef;
					}

					case "TsTypeIntersect": {
						const intersectType = tpe as TsTypeIntersect;
						const resolvedTypes = intersectType.types.map((t) =>
							FollowAliases.apply(scope, skipValidation)(t),
						);
						return TsTypeIntersect.simplified(resolvedTypes);
					}

					case "TsTypeUnion": {
						const unionType = tpe as TsTypeUnion;
						const resolvedTypes = unionType.types.map((t) =>
							FollowAliases.apply(scope, skipValidation)(t),
						);
						return TsTypeUnion.simplified(resolvedTypes);
					}

					default:
						return tpe;
				}
			} catch (error) {
				// Handle StackOverflowError equivalent - check if it's a recursion error
				if (
					error instanceof RangeError &&
					error.message.includes("Maximum call stack")
				) {
					const formatted = TsTypeFormatter.apply(tpe);
					scope.logger.error(
						`Recovered from SOE while following type alias ${formatted}`,
					);

					// Return TsTypeRef.any with warning comment about circular reference
					const warningComment = Comment.warning(`circular ${formatted}`);
					return {
						...TsTypeRef.any,
						comments: Comments.apply([warningComment]),
					} as TsType;
				}

				// Re-throw other errors
				throw error;
			}
		},

	/**
	 * TypeRef-specific method that returns only TsTypeRef results
	 *
	 * @param scope The TypeScript tree scope for type lookups
	 * @param tr The type reference to resolve
	 * @returns The resolved type reference
	 */
	typeRef:
		(scope: TsTreeScope) =>
		(tr: TsTypeRef): TsTypeRef => {
			const lookupResult = scope.lookupTypeIncludeScope(tr.name);

			// Use collectFirst to handle the lookup result with scope
			const resolvedTypeRef = lookupResult.collectFirst(
				partialFunction<[TsNamedDecl, TsTreeScope], TsTypeRef>(
					// Predicate: check if this is a type alias or thin interface
					([decl, _]: [TsNamedDecl, TsTreeScope]): boolean => {
						if (decl._tag === "TsDeclTypeAlias") {
							return true;
						}
						if (decl._tag === "TsDeclInterface") {
							const iface = decl as TsDeclInterface;
							// Check if it's a thin interface: exactly one inheritance and no members
							return (
								iface.inheritance.length === 1 && iface.members.length === 0
							);
						}
						return false;
					},
					// Transform: apply the appropriate transformation
					([decl, newScope]: [TsNamedDecl, TsTreeScope]): TsTypeRef => {
						if (decl._tag === "TsDeclTypeAlias") {
							const ta = decl as TsDeclTypeAlias;
							const filledAlias = FillInTParams.apply(ta, tr.tparams).alias;
							if (filledAlias._tag === "TsTypeRef") {
								return FollowAliases.typeRef(newScope)(
									filledAlias as TsTypeRef,
								);
							}
							// If the alias doesn't resolve to a TsTypeRef, return the original
							return tr;
						} else if (decl._tag === "TsDeclInterface") {
							const i = decl as TsDeclInterface;
							const filledInterface = FillInTParams.apply(i, tr.tparams);
							return FollowAliases.typeRef(newScope)(
								filledInterface.inheritance.apply(0),
							);
						}
						// This should never happen due to the predicate, but TypeScript needs it
						return tr;
					},
				),
			);

			return resolvedTypeRef ?? tr;
		},
};
