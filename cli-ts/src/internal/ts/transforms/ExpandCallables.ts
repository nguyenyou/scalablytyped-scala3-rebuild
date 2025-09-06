/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ExpandCallables
 *
 * Work around https://github.com/scala-js/scala-js/issues/3435
 * 
 * For instance, every time we have this pattern:
 * ```typescript
 * interface I {
 *   foo: I2;
 * }
 * interface I2 {
 *   (): void;
 * }
 * ```
 *
 * We expand the function call so it becomes a method:
 * ```typescript
 * interface I {
 *   foo(): void;
 * }
 * ```
 *
 * If not it wouldn't be safe to call from scala since it discards `this`.
 */

import { isSome, none, type Option, some } from "fp-ts/Option";
import { pipe } from "fp-ts/function";
import { ExpandedCallables } from "../../Comment.js";
import { type Comments, NoComments } from "../../Comments.js";
import { IArray, type PartialFunction } from "../../IArray.js";
import { AllMembersFor } from "../AllMembersFor.js";
import { FillInTParams } from "../FillInTParams.js";
import { MethodType } from "../MethodType.js";
import { TransformClassMembers } from "../TreeTransformations.js";
import { LoopDetector, TsQIdentUtils, type TsTreeScope } from "../TsTreeScope.js";
import {
	type HasClassMembers,
	type TsDeclInterface,
	type TsDeclTypeAlias,
	type TsFunSig,
	type TsMember,
	type TsMemberCall,
	TsMemberFunction,
	type TsMemberProperty,
	type TsType,
	type TsTypeConstructor,
	type TsTypeFunction,
	type TsTypeIntersect,
	type TsTypeObject,
	type TsTypeRef,
	type TsTypeUnion,
} from "../trees.js";

/**
 * Result type for callable type analysis
 */
type Result = 
	| { readonly _tag: "Expand"; readonly callables: IArray<[Comments, TsFunSig]>; readonly keepOriginalMember: boolean }
	| { readonly _tag: "Noop" };

/**
 * Result utility functions
 */
const Result = {
	/**
	 * Create an Expand result
	 */
	expand: (callables: IArray<[Comments, TsFunSig]>, keepOriginalMember: boolean): Result => ({
		_tag: "Expand",
		callables,
		keepOriginalMember,
	}),

	/**
	 * Create a Noop result
	 */
	noop: (): Result => ({ _tag: "Noop" }),

	/**
	 * Combine multiple results into a single result
	 */
	combine: (results: IArray<Result>): Result => {
		const expands = results.toArray().filter((r): r is Extract<Result, { _tag: "Expand" }> => r._tag === "Expand");

		if (expands.length > 0) {
			const allCallables = IArray.fromArray(expands.flatMap(e => e.callables.toArray()));
			const keepOriginal = expands.some(e => e.keepOriginalMember);
			return Result.expand(allCallables, keepOriginal);
		}

		return Result.noop();
	},
};

/**
 * Transform that expands callable properties into methods.
 * 
 * This transform extends TransformClassMembers and processes class/interface members.
 * It looks for properties with callable types and converts them into method declarations.
 */
export class ExpandCallables extends TransformClassMembers {
	/**
	 * Process class members, expanding callable properties into methods.
	 */
	newClassMembers(scope: TsTreeScope, x: HasClassMembers): IArray<TsMember> {
		return x.members.flatMap((member: TsMember): IArray<TsMember> => {
			// Only process properties with types but no expressions
			if (member._tag === "TsMemberProperty") {
				const prop = member as TsMemberProperty;
				
				// Only process properties that have a type but no initializer expression
				if (isSome(prop.tpe) && !isSome(prop.expr)) {
					const actualType = prop.tpe.value;
					const callableResult = this.callableTypes(scope)(actualType);

					if (callableResult._tag === "Expand" && callableResult.callables.length > 0) {
						// Determine if we should keep the original property
						const keptOpt: Option<TsMemberProperty> =
							(callableResult.keepOriginalMember || !prop.isReadOnly)
								? some({
									...prop,
									comments: prop.comments.add(ExpandedCallables.instance),
								})
								: none;

						// Create method functions for each callable signature
						const methods: IArray<TsMemberFunction> = callableResult.callables.map(([comments, sig]) => {
							const newComments = comments.concat(prop.comments);
							return TsMemberFunction.create(
								newComments,
								prop.level,
								prop.name,
								MethodType.normal(),
								sig,
								prop.isStatic,
								true, // isReadOnly = true for expanded methods
							);
						});

						scope.logger.info(`Expanded ${prop.name.value} into ${methods.length} methods`);

						// Return methods plus optionally kept property
						const methodsAsMembers = methods.map(m => m as TsMember);
						const finalResult: IArray<TsMember> = pipe(
							keptOpt,
							(opt) => isSome(opt)
								? methodsAsMembers.concat(IArray.fromArray([opt.value as TsMember]))
								: methodsAsMembers
						);
						return finalResult;
					}
				}
				
				// Return original property unchanged
				return IArray.fromArray([prop as TsMember]);
			}

			// Return other members unchanged
			return IArray.fromArray([member]);
		});
	}

	/**
	 * Analyze a type to determine if it contains callable signatures.
	 */
	private callableTypes(scope: TsTreeScope): (tpe: TsType) => Result {
		return (tpe: TsType): Result => {
			switch (tpe._tag) {
				case "TsTypeFunction": {
					const funcType = tpe as TsTypeFunction;
					return Result.expand(
						IArray.fromArray([[NoComments.instance, funcType.signature]]),
						false // keepOriginalMember = false for direct function types
					);
				}

				case "TsTypeIntersect": {
					const intersectType = tpe as TsTypeIntersect;
					const results = intersectType.types.map(this.callableTypes(scope));
					return Result.combine(results);
				}

				case "TsTypeObject": {
					const objType = tpe as TsTypeObject;
					const pf: PartialFunction<TsMember, [Comments, TsFunSig]> = {
						isDefinedAt: (member: TsMember) => member._tag === "TsMemberCall",
						apply: (member: TsMember) => {
							const callMember = member as TsMemberCall;
							return [callMember.comments, callMember.signature];
						}
					};
					const [callables, rest] = objType.members.partitionCollect(pf);

					if (callables.length > 0) {
						return Result.expand(callables, rest.length > 0);
					}
					return Result.noop();
				}

				case "TsTypeRef": {
					const typeRef = tpe as TsTypeRef;
					
					// Skip primitive types
					if (TsQIdentUtils.Primitive(typeRef.name)) {
						return Result.noop();
					}

					// Look up the type reference in scope
					const lookupResults = scope.lookupTypeIncludeScope(typeRef.name);
					
					for (const [decl, newScope] of lookupResults.toArray()) {
						if (decl._tag === "TsDeclInterface") {
							const interfaceDecl = decl as TsDeclInterface;
							const members = AllMembersFor.forInterface(
								LoopDetector.initial,
								interfaceDecl,
								newScope,
								typeRef.tparams
							);
							
							const pf: PartialFunction<TsMember, [Comments, TsFunSig]> = {
								isDefinedAt: (member: TsMember) => member._tag === "TsMemberCall",
								apply: (member: TsMember) => {
									const callMember = member as TsMemberCall;
									return [callMember.comments, callMember.signature];
								}
							};
							const [callables, rest] = members.partitionCollect(pf);
							
							if (callables.length > 0) {
								return Result.expand(callables, rest.length > 0);
							}
						} else if (decl._tag === "TsDeclTypeAlias") {
							const typeAlias = decl as TsDeclTypeAlias;
							const filledAlias = FillInTParams.apply(typeAlias, typeRef.tparams);
							return this.callableTypes(newScope)(filledAlias.alias);
						}
					}
					
					return Result.noop();
				}

				case "TsTypeUnion":
					// TODO: think about this - union types are not expanded for now
					return Result.noop();

				case "TsTypeConstructor":
					// TODO: may want to do this later - constructor types are not expanded for now
					return Result.noop();

				default:
					return Result.noop();
			}
		};
	}
}

/**
 * Singleton instance of the ExpandCallables transform
 */
export const expandCallables = new ExpandCallables();