/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.SplitMethods
 *
 * This transformation splits method signatures that have union type parameters into multiple
 * overloaded signatures. This helps with TypeScript's method resolution and improves type
 * inference by creating distinct method signatures for each overload pattern.
 *
 * The transformation works by:
 * 1. Identifying methods, constructors, and call signatures with union type parameters
 * 2. Generating all possible combinations of parameter types from the union types
 * 3. Creating separate method signatures for each combination
 * 4. Handling special cases like literal types, repeated parameters, and optional parameters
 * 5. Limiting the number of generated overloads to prevent explosion
 *
 * Key features:
 * - Splits constructors, methods, call signatures, and function declarations
 * - Handles union types in parameters by creating separate overloads
 * - Groups literal types together to reduce overload count
 * - Preserves repeated parameters and handles them correctly
 * - Drops trailing undefined parameters to create cleaner signatures
 * - Limits maximum overloads to prevent excessive code generation
 * - Preserves comments only on the first overload to avoid duplication
 */

import { none, type Option, some } from "fp-ts/Option";
import { IArray } from "../../IArray.js";
import { OptionalType } from "../OptionalType.js";
import { RemoveComment } from "../RemoveComment.js";
import { TransformMembers } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import type {
	HasClassMembers,
	TsContainer,
	TsContainerOrDecl,
	TsDeclFunction,
	TsFunParam,
	TsFunSig,
	TsMember,
	TsMemberCall,
	TsMemberCtor,
	TsMemberFunction,
	TsType,
	TsTypeLiteral,
	TsTypeUnion,
} from "../trees.js";

/**
 * Transform that splits methods with union type parameters into multiple overloaded signatures.
 *
 * This transform extends both TransformMembers and TransformClassMembers to handle
 * method splitting in both container members and class members.
 */
export class SplitMethods extends TransformMembers {
	/**
	 * Maximum number of overloads to generate to prevent code explosion
	 */
	private static readonly MAX_NUM = 50;

	/**
	 * Singleton instance for convenient usage
	 */
	static readonly instance = new SplitMethods();

	/**
	 * Process class members, splitting methods with union type parameters.
	 * This implements the TransformClassMembers functionality.
	 */
	newClassMembers(_scope: TsTreeScope, x: HasClassMembers): IArray<TsMember> {
		return x.members.flatMap((member: TsMember): IArray<TsMember> => {
			switch (member._tag) {
				case "TsMemberCtor": {
					const ctor = member as TsMemberCtor;
					if (this.hasUnionType(ctor.signature.params)) {
						const splitSignatures = this.split(ctor.signature);
						const newCtors = splitSignatures.map((sig) => ({
							...ctor,
							signature: sig,
						}));
						return RemoveComment.keepFirstOnly(
							newCtors,
							RemoveComment.r0,
						) as unknown as IArray<TsMember>;
					}
					return IArray.apply(member);
				}

				case "TsMemberFunction": {
					const func = member as TsMemberFunction;
					if (
						func.methodType &&
						func.methodType._tag === "Normal" &&
						this.hasUnionType(func.signature.params)
					) {
						const splitSignatures = this.split(func.signature);
						const newFuncs = splitSignatures.map((sig) => ({
							...func,
							signature: sig,
						}));
						return RemoveComment.keepFirstOnly(
							newFuncs,
							RemoveComment.r1,
						) as unknown as IArray<TsMember>;
					}
					return IArray.apply(member);
				}

				case "TsMemberCall": {
					const call = member as TsMemberCall;
					if (this.hasUnionType(call.signature.params)) {
						const splitSignatures = this.split(call.signature);
						const newCalls = splitSignatures.map((sig) => ({
							...call,
							signature: sig,
						}));
						return RemoveComment.keepFirstOnly(
							newCalls,
							RemoveComment.r2,
						) as unknown as IArray<TsMember>;
					}
					return IArray.apply(member);
				}

				default:
					return IArray.apply(member);
			}
		});
	}

	/**
	 * Process container members, splitting function declarations with union type parameters.
	 */
	newMembers(_scope: TsTreeScope, x: TsContainer): IArray<TsContainerOrDecl> {
		return x.members.flatMap(
			(member: TsContainerOrDecl): IArray<TsContainerOrDecl> => {
				if (member._tag === "TsDeclFunction") {
					const func = member as TsDeclFunction;
					if (this.hasUnionType(func.signature.params)) {
						const splitSignatures = this.split(func.signature);
						const newFuncs = splitSignatures.map((sig) => ({
							...func,
							signature: sig,
						}));
						return RemoveComment.keepFirstOnly(
							newFuncs,
							RemoveComment.r3,
						) as unknown as IArray<TsContainerOrDecl>;
					}
				}
				return IArray.apply(member);
			},
		);
	}

	/**
	 * Split a function signature with union type parameters into multiple signatures.
	 */
	private split(origin: TsFunSig): IArray<TsFunSig> {
		// Don't split if too many parameters to avoid explosion
		if (origin.params.length > 20) {
			return IArray.apply(origin);
		}

		// Separate repeated parameters from regular parameters
		const lastParam = origin.params.lastOption;
		let repParamOpt: Option<TsFunParam> = none;
		let paramsNoRep: IArray<TsFunParam> = origin.params;

		if (lastParam !== undefined) {
			const param = lastParam;
			if (
				param.tpe._tag === "Some" &&
				param.tpe.value._tag === "TsTypeRepeated"
			) {
				repParamOpt = some(param);
				paramsNoRep = origin.params.dropRight(1);
			}
		}

		// Generate parameter possibilities for each position
		const parameterPossibilitiesPerIndex: IArray<IArray<TsFunParam>> =
			paramsNoRep.foldLeft(
				IArray.Empty as IArray<IArray<TsFunParam>>,
				(acc, param) => {
					if (
						param.tpe._tag === "Some" &&
						param.tpe.value._tag === "TsTypeUnion"
					) {
						const unionType = param.tpe.value as TsTypeUnion;
						if (unionType.types.length < SplitMethods.MAX_NUM) {
							// Separate literal types from other types
							const literalTypes: TsTypeLiteral[] = [];
							const restTypes: TsType[] = [];

							for (let i = 0; i < unionType.types.length; i++) {
								const t = unionType.types.apply(i);
								if (t._tag === "TsTypeLiteral") {
									literalTypes.push(t as TsTypeLiteral);
								} else {
									restTypes.push(t);
								}
							}

							// Create parameter for literals if any exist
							const literalsParam =
								literalTypes.length === 0
									? IArray.Empty
									: IArray.apply({
											...param,
											tpe: some({
												_tag: "TsTypeUnion",
												types: IArray.fromArray(
													literalTypes.map((lit) => lit as TsType),
												),
												asString: `TsTypeUnion(${literalTypes.map((lit) => lit.asString).join(" | ")})`,
											} as TsTypeUnion),
										});

							// Create parameters for each non-literal type
							const restParams = IArray.fromArray(
								restTypes.map((tpe) => ({
									...param,
									tpe: some(tpe),
								})),
							);

							return acc.append(restParams.concat(literalsParam));
						}
					}
					// Normal parameter - no union type
					return acc.append(IArray.apply(param));
				},
			);

		// Add repeated parameter if it exists
		const parameterPossibilitiesPerIndexWithRep =
			repParamOpt._tag === "Some"
				? parameterPossibilitiesPerIndex.append(IArray.apply(repParamOpt.value))
				: parameterPossibilitiesPerIndex;

		// Calculate total number of combinations
		const count = parameterPossibilitiesPerIndexWithRep.foldLeft(
			1,
			(acc, possibilities) => acc * possibilities.length,
		);

		// Don't split if too many combinations or overflow
		if (count > SplitMethods.MAX_NUM || count < 0) {
			return IArray.apply(origin);
		}

		// Generate all signature combinations
		const signatures = this.generateNewSignatures(
			origin,
			IArray.apply(IArray.Empty),
			parameterPossibilitiesPerIndexWithRep,
		);

		// Clean up signatures by dropping trailing undefined parameters and sort by parameter count
		return signatures
			.map((sig) => {
				const dropTrailingUndefineds = sig.params
					.reverse()
					.dropWhile((param) => {
						if (param.tpe._tag === "Some") {
							const typeStr = param.tpe.value.asString;
							return OptionalType.undefineds.has(typeStr);
						}
						return false;
					})
					.reverse();

				return {
					...sig,
					params: dropTrailingUndefineds,
				};
			})
			.sortBy((sig) => sig.params.length);
	}

	/**
	 * Recursively generate new signatures from parameter possibilities.
	 */
	private generateNewSignatures(
		origin: TsFunSig,
		newParamss: IArray<IArray<TsFunParam>>,
		remaining: IArray<IArray<TsFunParam>>,
	): IArray<TsFunSig> {
		if (remaining.isEmpty) {
			return newParamss.map((params) => ({
				...origin,
				params,
			}));
		}

		const heads = remaining.head;
		const tail = remaining.tail;
		const expandedParams = heads.flatMap((head) =>
			newParamss.map((existing) => existing.append(head)),
		);

		return this.generateNewSignatures(origin, expandedParams, tail);
	}

	/**
	 * Check if any parameter has a union type.
	 */
	private hasUnionType(params: IArray<TsFunParam>): boolean {
		return params.exists((param) => {
			if (param.tpe._tag === "Some") {
				return param.tpe.value._tag === "TsTypeUnion";
			}
			return false;
		});
	}

	/**
	 * Check if a type is a repeated type.
	 */
	static isRepeated(x: TsType): boolean {
		return x._tag === "TsTypeRepeated";
	}

	/**
	 * Collect elements from the right while they match a condition.
	 * This is a utility method equivalent to the Scala collectRightWhile.
	 */
	static collectRightWhile<T, U>(
		ts: IArray<T>,
		predicate: (t: T) => U | null,
	): [IArray<T>, IArray<U>] {
		let idx = ts.length - 1;
		const collected: U[] = [];

		while (idx >= 0) {
			const t = ts.apply(idx);
			const result = predicate(t);
			if (result !== null) {
				collected.push(result);
				idx -= 1;
			} else {
				break;
			}
		}

		const remaining = ts.dropRight(collected.length);
		const collectedArray = IArray.fromArray(collected.reverse());
		return [remaining, collectedArray];
	}
}

/**
 * Singleton instance of SplitMethods for convenient usage.
 * Equivalent to the Scala object SplitMethods.
 */
export const SplitMethodsTransform = SplitMethods.instance;
