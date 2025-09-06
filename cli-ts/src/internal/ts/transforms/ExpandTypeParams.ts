/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ExpandTypeParams
 *
 * This implements the `keyof` and type lookup mechanisms from typescript in a limited context, 
 * and brings us a bit closer to being able to enable type bounds in scala.
 *
 * For instance, every time we have this pattern:
 * ```typescript
 * interface C {
 *   c?: number
 * }
 * 
 * interface B {
 *   b: string;
 * }
 * interface A extends B {
 *   a: number;
 * }
 * interface Example {
 *     expandKeyOf<K extends keyof A>(key: K, foo: A[K]): number
 *     expandUnion<T extends C | B>(bc: T): T
 * }
 * ```
 *
 * After conversion we'll end up with
 * ```scala
 * @js.native
 * trait Example extends js.Object {
 *   @JSName("expandKeyOf")
 *   def expandKeyOf_a(key: expandDashTypeDashParametersLib.expandDashTypeDashParametersLibStrings.a, foo: scala.Double): scala.Double = js.native
 *   @JSName("expandKeyOf")
 *   def expandKeyOf_b(
 *     key: expandDashTypeDashParametersLib.expandDashTypeDashParametersLibStrings.b,
 *     foo: java.lang.String
 *   ): scala.Double = js.native
 *   def expandUnion(bc: B): B = js.native
 *   def expandUnion(bc: C): C = js.native
 * }
 * ```
 */

import { isSome, none, type Option, some } from "fp-ts/Option";
import { left, right, type Either } from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { type Comments, NoComments } from "../../Comments.js";
import { IArray, type PartialFunction } from "../../IArray.js";
import { AllMembersFor } from "../AllMembersFor.js";
import { FollowAliases } from "../FollowAliases.js";
import { MethodType } from "../MethodType.js";
import { OptionalType } from "../OptionalType.js";
import { RemoveComment } from "../RemoveComment.js";
import { TransformClassMembers, TransformMembers } from "../TreeTransformations.js";
import { LoopDetector, type TsTreeScope } from "../TsTreeScope.js";
import {
	type HasClassMembers,
	type TsContainer,
	type TsContainerOrDecl,
	type TsDeclClass,
	type TsDeclFunction,
	type TsDeclInterface,
	TsIdent,
	type TsIdentSimple,
	TsLiteral,
	type TsMember,
	type TsMemberCall,
	type TsMemberFunction,
	type TsMemberProperty,
	TsQIdent,
	type TsType,
	type TsTypeKeyOf,
	TsTypeLiteral,
	type TsTypeLookup,
	type TsTypeObject,
	TsTypeRef,
	type TsTypeUnion,
	type TsFunSig,
	type TsTypeParam,
} from "../trees.js";
import { TypeRewriter } from "./TypeRewriter.js";

/**
 * Represents an expandable type parameter with its expansion information
 */
interface ExpandableTypeParam {
	readonly typeParam: TsIdentSimple;
	readonly toKeepInBounds: Option<IArray<TsType>>;
	readonly toExpand: IArray<Either<TsTypeRef, TsTypeKeyOf>>;
}

/**
 * Utility for extracting distinct values from arrays
 */
const Distinct = {
	/**
	 * Extract distinct values from an array
	 */
	apply: <T>(ts: IArray<T>): IArray<T> => ts.distinct(),
};

/**
 * Partial function for matching TsTypeKeyOf patterns
 */
const KeyOf: PartialFunction<TsType, Either<TsTypeRef, TsTypeKeyOf>> = {
	isDefinedAt: (tpe: TsType) =>
		tpe._tag === "TsTypeKeyOf" && (tpe as TsTypeKeyOf).key._tag === "TsTypeRef",
	apply: (tpe: TsType) => right(tpe as TsTypeKeyOf),
};

/**
 * Set of "any" types that should be filtered out
 */
const isAnySet = new Set<TsType>([TsTypeRef.any, TsTypeRef.object]);

/**
 * Creates a partial function for matching valid TsTypeRef patterns
 */
function createTypeRefPartialFunction(scope: TsTreeScope): PartialFunction<TsType, Either<TsTypeRef, TsTypeKeyOf>> {
	return {
		isDefinedAt: (tpe: TsType) => {
			if (tpe._tag !== "TsTypeRef") return false;
			const tr = tpe as TsTypeRef;
			return (
				tr.tparams.forall(x => !isAnySet.has(x)) &&
				!isAnySet.has(tr) &&
				!scope.isAbstract(tr.name)
			);
		},
		apply: (tpe: TsType) => left(tpe as TsTypeRef),
	};
}

/**
 * Transform that expands type parameters in function signatures.
 *
 * This transform extends TransformMembers and also implements TransformClassMembers
 * to handle type parameter expansion in both container members and class members.
 */
export class ExpandTypeParams extends TransformMembers {
	static readonly instance = new ExpandTypeParams();
	/**
	 * Process class members, expanding type parameters in function signatures.
	 */
	newClassMembers(scope: TsTreeScope, x: HasClassMembers): IArray<TsMember> {
		return x.members.flatMap((member: TsMember): IArray<TsMember> => {
			switch (member._tag) {
				case "TsMemberCall": {
					const m = member as TsMemberCall;
					const expandedSigs = this.expandTParams(scope["/"](m), m.signature);
					if (isSome(expandedSigs)) {
						const newMembers = expandedSigs.value.map(newSig => ({
							...m,
							signature: newSig,
						}));
						return RemoveComment.keepFirstOnly(newMembers, RemoveComment.r2) as unknown as IArray<TsMember>;
					}
					return IArray.fromArray([m as TsMember]);
				}

				case "TsMemberFunction": {
					const m = member as TsMemberFunction;
					if (m.methodType._tag === "Normal") {
						const expandedSigs = this.expandTParams(scope["/"](m), m.signature);
						if (isSome(expandedSigs)) {
							const newMembers = expandedSigs.value.map(newSig => ({
								...m,
								signature: newSig,
							}));
							return RemoveComment.keepFirstOnly(newMembers, RemoveComment.r1) as unknown as IArray<TsMember>;
						}
					}
					return IArray.fromArray([m as TsMember]);
				}

				default:
					return IArray.fromArray([member]);
			}
		});
	}

	/**
	 * Process container members, expanding type parameters in function declarations.
	 */
	newMembers(scope: TsTreeScope, x: TsContainer): IArray<TsContainerOrDecl> {
		return x.members.flatMap((member: TsContainerOrDecl): IArray<TsContainerOrDecl> => {
			if (member._tag === "TsDeclFunction") {
				const m = member as TsDeclFunction;
				const expandedSigs = this.expandTParams(scope["/"](m), m.signature);
				if (isSome(expandedSigs)) {
					const newMembers = expandedSigs.value.map(newSig => ({
						...m,
						signature: newSig,
					}));
					return RemoveComment.keepFirstOnly(newMembers, RemoveComment.r3) as unknown as IArray<TsContainerOrDecl>;
				}
			}
			return IArray.fromArray([member]);
		});
	}

	/**
	 * Override class-related enter methods to apply class member transformation.
	 */
	override enterTsDeclClass(scope: TsTreeScope): (x: TsDeclClass) => TsDeclClass {
		return (x: TsDeclClass) => ({
			...x,
			members: this.newClassMembers(scope, x),
		});
	}

	override enterTsDeclInterface(scope: TsTreeScope): (x: TsDeclInterface) => TsDeclInterface {
		return (x: TsDeclInterface) => ({
			...x,
			members: this.newClassMembers(scope, x),
		});
	}

	override enterTsTypeObject(scope: TsTreeScope): (x: TsTypeObject) => TsTypeObject {
		return (x: TsTypeObject) => ({
			...x,
			members: this.newClassMembers(scope, x),
		});
	}

	/**
	 * Expand type parameters in a function signature.
	 * Returns None if no expansion is needed or if expansion would exceed limits.
	 */
	private expandTParams(scope: TsTreeScope, sig: TsFunSig): Option<IArray<TsFunSig>> {
		const expandables = sig.tparams.mapNotNoneOption(tp => this.expandable(scope, sig)(tp));
		
		const expanded = expandables.foldLeft(
			IArray.fromArray([sig]),
			(currentSigs: IArray<TsFunSig>, exp: ExpandableTypeParam) =>
				currentSigs.flatMap(currentSig => this.expandSignature(scope, exp)(currentSig))
		);

		const length = expanded.length;
		if (length === 0 || length > 200) {
			return none;
		}
		return some(expanded);
	}

	/**
	 * Determine if a type parameter is expandable based on its upper bound.
	 */
	private expandable(scope: TsTreeScope, sig: TsFunSig): (tp: TsTypeParam) => Option<ExpandableTypeParam> {
		return (tp: TsTypeParam): Option<ExpandableTypeParam> => {
			/**
			 * Recursively flatten union types
			 */
			const flatPick = (tpe: TsType): IArray<TsType> => {
				const followed = FollowAliases.apply(scope)(tpe);
				if (followed._tag === "TsTypeUnion") {
					const union = followed as TsTypeUnion;
					return union.types.flatMap(flatPick);
				}
				return IArray.fromArray([followed]);
			};

			/**
			 * Check if the type parameter is used in function parameters
			 */
			const isParam = sig.params.exists(p =>
				pipe(
					p.tpe,
					(tpeOpt) => isSome(tpeOpt) && tpeOpt.value._tag === "TsTypeRef",
					(isTypeRef) => {
						if (!isTypeRef || !isSome(p.tpe)) return false;
						const typeRef = p.tpe.value as TsTypeRef;
						return (
							typeRef.name._tag === "TsQIdent" &&
							typeRef.name.parts.length === 1 &&
							typeRef.name.parts.apply(0).value === tp.name.value
						);
					}
				)
			);

			return pipe(
				tp.upperBound,
				(boundOpt) => {
					if (!isSome(boundOpt)) return none;
					
					const bound = boundOpt.value;
					const flattened = flatPick(bound);
					const typeRefPF = createTypeRefPartialFunction(scope);

					// Use partitionCollect2 since we only have 2 partial functions
					const [keyOfs, typeRefs, keepInBounds] = flattened.partitionCollect2(KeyOf, typeRefPF);

					const distinctKeyOfs = Distinct.apply(keyOfs);
					const distinctTypeRefs = Distinct.apply(typeRefs);
					const distinctKeepInBounds = Distinct.apply(keepInBounds);

					const filteredTypeRefs = distinctTypeRefs.filterNot(either => {
						if (either._tag === "Left") {
							const typeRefStr = either.left.name.asString;
							return OptionalType.undefineds.has(typeRefStr);
						}
						return false;
					});

					if (distinctKeyOfs.length > 0 || (filteredTypeRefs.length > 1 && isParam)) {
						const toKeepInBounds = distinctKeepInBounds.length > 0 ? some(distinctKeepInBounds) : none;
						const toExpand = distinctKeyOfs.concat(distinctTypeRefs);

						return some({
							typeParam: tp.name,
							toKeepInBounds,
							toExpand,
						});
					}
					
					return none;
				}
			);
		};
	}

	/**
	 * Expand a single signature based on an expandable type parameter.
	 */
	private expandSignature(scope: TsTreeScope, exp: ExpandableTypeParam): (sig: TsFunSig) => IArray<TsFunSig> {
		return (sig: TsFunSig): IArray<TsFunSig> => {
			// Create signature with bounds kept if needed
			const keptInBounds: Option<TsFunSig> = pipe(
				exp.toKeepInBounds,
				(boundsOpt) => {
					if (!isSome(boundsOpt)) return none;
					
					const types = boundsOpt.value;
					const rewrittenTparams = sig.tparams.map(tparam => {
						if (tparam.name.value === exp.typeParam.value) {
							return {
								...tparam,
								upperBound: some({
									_tag: "TsTypeUnion" as const,
									types,
									asString: `Union(${types.map(t => t.asString || "unknown").mkString("", ", ", "")})`,
								}),
							};
						}
						return tparam;
					});
					
					return some({
						...sig,
						tparams: rewrittenTparams,
					});
				}
			);

			// Create signature with type parameter removed
			const sigCleaned: TsFunSig = {
				...sig,
				tparams: sig.tparams.filterNot(tp => tp.name.value === exp.typeParam.value),
			};

			// Expand based on each type in toExpand
			const expanded: IArray<TsFunSig> = exp.toExpand.flatMap(either => {
				if (either._tag === "Left") {
					// Handle TsTypeRef expansion
					const tr = either.left;
					const rewrites = new Map<TsType, TsType>([
						[TsTypeRef.fromIdent(exp.typeParam), this.clearCircularRef(exp.typeParam, tr)],
					]);

					const rewriter = new TypeRewriter(sigCleaned);
					return IArray.fromArray([rewriter.visitTsFunSig(rewrites)(sigCleaned)]);
				} else {
					// Handle TsTypeKeyOf expansion
					const keyOfType = either.right;
					if (keyOfType.key._tag === "TsTypeRef") {
						const ref = keyOfType.key as TsTypeRef;
						const members = AllMembersFor.apply(scope, LoopDetector.initial)(ref);
						
						const pf: PartialFunction<TsMember, TsFunSig> = {
							isDefinedAt: (member: TsMember) => {
								if (member._tag === "TsMemberProperty") {
									const prop = member as TsMemberProperty;
									return (
										prop.name._tag === "TsIdentSimple" &&
										isSome(prop.tpe) &&
										!prop.isStatic
									);
								}
								return false;
							},
							apply: (member: TsMember) => {
								const prop = member as TsMemberProperty;
								const n = (prop.name as TsIdentSimple).value;
								const tpe = (prop.tpe as { _tag: "Some"; value: TsType }).value;

								const rewrites = new Map<TsType, TsType>([
									[TsTypeRef.fromIdent(exp.typeParam), TsTypeLiteral.create(TsLiteral.str(n))],
									[
										{
											_tag: "TsTypeLookup" as const,
											from: ref,
											key: TsTypeLiteral.create(TsLiteral.str(n)),
											asString: `${ref.asString}[${n}]`,
										} as TsTypeLookup,
										tpe,
									],
								]);

								const rewriter = new TypeRewriter(sigCleaned);
								return rewriter.visitTsFunSig(rewrites)(sigCleaned);
							}
						};

						return members.collect(pf);
					}
					
					// This should not happen based on the KeyOf partial function
					throw new Error(`Unexpected keyof type: ${keyOfType}`);
				}
			});

			// Combine expanded signatures with kept bounds signature
			return pipe(
				keptInBounds,
				(keptOpt) => isSome(keptOpt) ? expanded.concat(IArray.fromArray([keptOpt.value])) : expanded
			);
		};
	}

	/**
	 * Clear circular references in type parameters.
	 * Since we inline the `T` also erase references to it.
	 * Example: `<T extends (Array<T> | number)>(t: T): T`
	 */
	private clearCircularRef(self: TsIdentSimple, tr: TsTypeRef): TsTypeRef {
		const rewrites = new Map<TsType, TsType>([
			[TsTypeRef.fromIdent(self), TsTypeRef.any],
		]);
		const rewriter = new TypeRewriter(tr);
		return rewriter.visitTsType(rewrites)(tr) as TsTypeRef;
	}
}

/**
 * Singleton instance of the ExpandTypeParams transform
 */
export const expandTypeParams = new ExpandTypeParams();