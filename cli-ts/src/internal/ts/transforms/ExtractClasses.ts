/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ExtractClasses
 *
 * This transform extracts classes from variable declarations with constructor types.
 * When a variable is declared with a type that has constructors, this transform converts
 * the variable into a class declaration and optionally creates namespaces for organizing
 * extracted classes from object type members.
 *
 * Example transformation:
 * ```typescript
 * // Before:
 * declare var MyClass: new(value: string) => MyClass;
 *
 * // After:
 * declare class MyClass {
 *   constructor(value: string);
 * }
 * ```
 */

import {
	chain,
	getOrElse,
	isSome,
	none,
	type Option,
	some,
} from "fp-ts/Option";
import { Comment, Marker } from "../../Comment.js";
import { Comments } from "../../Comments.js";
import { IArray, partialFunction } from "../../IArray.js";
import { AllMembersFor } from "../AllMembersFor.js";
import type { CodePath } from "../CodePath.js";
import { FillInTParams } from "../FillInTParams.js";
import { FollowAliases } from "../FollowAliases.js";
import { JsLocation } from "../JsLocation.js";
import type { HasClassMembers } from "../MemberCache.js";
import { MethodType } from "../MethodType.js";
import { TransformLeaveMembers } from "../TreeTransformations.js";
import { TsProtectionLevel } from "../TsProtectionLevel.js";
import { LoopDetector, type TsTreeScope } from "../TsTreeScope.js";
import {
	type TsContainer,
	type TsContainerOrDecl,
	TsDeclClass,
	type TsDeclInterface,
	TsDeclNamespace,
	type TsDeclVar,
	type TsFunSig,
	TsIdent,
	TsIdentConstructor,
	type TsIdentSimple,
	type TsMember,
	type TsMemberCtor,
	TsMemberFunction,
	type TsMemberProperty,
	type TsNamedDecl,
	type TsType,
	type TsTypeConstructor,
	type TsTypeFunction,
	type TsTypeIntersect,
	type TsTypeObject,
	type TsTypeParam,
	type TsTypeRef,
} from "../trees.js";

/**
 * Transform that extracts classes from variable declarations with constructor types.
 *
 * This transform extends TransformLeaveMembers and processes container members.
 * It specifically looks for TsDeclVar nodes that have constructor types and converts
 * them into proper class declarations.
 */
export class ExtractClasses extends TransformLeaveMembers {
	/**
	 * Singleton instance for the transform
	 */
	static readonly instance = new ExtractClasses();

	/**
	 * Process container members, extracting classes from variables with constructor types.
	 */
	newMembers(scope: TsTreeScope, x: TsContainer): IArray<TsContainerOrDecl> {
		const findName = FindAvailableName.apply(x, scope);

		const rewrittenNameds: IArray<TsNamedDecl> = IArray.fromArray(
			Array.from(x.membersByName.entries()).flatMap(([_, sameName]) => {
				const extracted = this.extractClasses(scope, sameName, findName);
				return getOrElse(() => sameName)(extracted).toArray();
			}),
		);

		return x.unnamed.concat(rewrittenNameds);
	}

	/**
	 * Extract classes from a group of declarations with the same name.
	 */
	private extractClasses(
		scope: TsTreeScope,
		sameName: IArray<TsNamedDecl>,
		findName: FindAvailableName,
	): Option<IArray<TsNamedDecl>> {
		// Partition declarations into vars, namespaces, classes, and rest
		const [vars, namespaces, classes, rest] = sameName.partitionCollect3(
			partialFunction(
				(x: TsNamedDecl): x is TsDeclVar => x._tag === "TsDeclVar",
				(x: TsNamedDecl) => x as TsDeclVar,
			),
			partialFunction(
				(x: TsNamedDecl): x is TsDeclNamespace => x._tag === "TsDeclNamespace",
				(x: TsNamedDecl) => x as TsDeclNamespace,
			),
			partialFunction(
				(x: TsNamedDecl): x is TsDeclClass => x._tag === "TsDeclClass",
				(x: TsNamedDecl) => x as TsDeclClass,
			),
		);

		// Check if we have a variable with type but no expression, and no existing classes
		if (vars.length > 0 && classes.isEmpty) {
			const firstVar = vars.get(0);
			const restVars = vars.drop(1);

			// Check if this is a variable with a type but no expression
			if (
				isSome(firstVar.tpe) &&
				firstVar.expr._tag === "None" &&
				!firstVar.readOnly
			) {
				const tpe = firstVar.tpe.value;
				const allMembers = AllMembersFor.forType(
					scope,
					LoopDetector.initial,
				)(tpe);

				// Try to extract a class from the constructor type
				const clsOpt = chain((analyzedCtors: AnalyzedCtors) => {
					const nameResult = findName.apply(firstVar.name);
					if (nameResult._tag === "None") {
						return none;
					}

					const [clsName, wasBackup] = nameResult.value;
					const realCtors: IArray<TsMemberFunction> = analyzedCtors.ctors.map(
						(ctor: TsFunSig) =>
							TsMemberFunction.create(
								ctor.comments,
								TsProtectionLevel.default(),
								TsIdentConstructor,
								MethodType.normal(),
								{
									...ctor,
									comments: Comments.empty(),
									tparams: IArray.Empty,
									resultType: none,
								},
								false, // isStatic
								false, // isReadOnly
							),
					);

					const clsCodePath =
						clsName.value === TsIdent.namespaced().value
							? firstVar.codePath
							: firstVar.codePath.replaceLast(clsName);

					return some(
						TsDeclClass.create(
							firstVar.comments.concat(ExtractClasses.commentFor(wasBackup)),
							firstVar.declared,
							false, // isAbstract
							clsName,
							analyzedCtors.longestTParams,
							some(FollowAliases.typeRef(scope)(analyzedCtors.resultType)),
							IArray.Empty, // implements
							realCtors.map((m) => m as TsMember),
							firstVar.jsLocation,
							clsCodePath,
						),
					);
				})(AnalyzedCtors.from(scope, tpe));

				if (clsOpt._tag === "Some") {
					const cls = clsOpt.value;

					// Check if we need to create a namespace for extracted classes from members
					const extractedFromMembers = allMembers
						.map(
							ExtractClasses.extractClassFromMember(
								scope,
								findName,
								firstVar.jsLocation,
								firstVar.codePath,
							),
						)
						.collect(
							partialFunction(
								(opt: Option<TsDeclClass>): opt is Option<TsDeclClass> =>
									opt._tag === "Some",
								(opt: Option<TsDeclClass>) => (opt as any).value as TsDeclClass,
							),
						);

					if (extractedFromMembers.nonEmpty) {
						// Create a namespace to contain the extracted classes
						const namespace = TsDeclNamespace.create(
							Comments.empty(),
							false, // declared
							TsIdent.namespaced(),
							extractedFromMembers.map((cls) => cls as TsContainerOrDecl),
							firstVar.codePath,
							firstVar.jsLocation,
						);

						return some(
							IArray.fromArray([cls, namespace])
								.concat(restVars)
								.concat(namespaces)
								.concat(rest),
						);
					} else {
						return some(
							IArray.fromArray([cls])
								.concat(restVars)
								.concat(namespaces)
								.concat(rest),
						);
					}
				}
			}
		}

		// No extraction possible, return None to keep original declarations
		return none;
	}

	/**
	 * Create a comment for extracted classes indicating they were inferred from a constructor.
	 */
	static commentFor(wasBackup: boolean): Comments {
		const base = "This class was inferred from a value with a constructor";
		const msg = wasBackup
			? `/* ${base}, it was renamed because a distinct type already exists with the same name. */\n`
			: `/* ${base}. In rare cases (like HTMLElement in the DOM) it might not work as you expect. */\n`;

		return new Comments([Marker.ExpandedClassInstance, Comment.create(msg)]);
	}

	/**
	 * Extract a class from a member property with constructor type.
	 */
	static extractClassFromMember(
		scope: TsTreeScope,
		findName: FindAvailableName,
		ownerLoc: JsLocation,
		ownerCp: CodePath,
	): (member: TsMember) => Option<TsDeclClass> {
		return (member: TsMember): Option<TsDeclClass> => {
			if (member._tag === "TsMemberProperty") {
				const prop = member as TsMemberProperty;
				if (isSome(prop.tpe) && prop.expr._tag === "None") {
					const analyzedCtorsOpt = AnalyzedCtors.from(scope, prop.tpe.value);
					if (analyzedCtorsOpt._tag === "Some") {
						const analyzedCtors = analyzedCtorsOpt.value;
						const nameResult = findName.apply(prop.name);
						if (nameResult._tag === "Some") {
							const [name, wasBackup] = nameResult.value;
							const realCtors: IArray<TsMemberFunction> =
								analyzedCtors.ctors.map((ctor: TsFunSig) =>
									TsMemberFunction.create(
										ctor.comments,
										prop.level,
										TsIdentConstructor,
										MethodType.normal(),
										{
											...ctor,
											comments: Comments.empty(),
											tparams: IArray.Empty,
											resultType: none,
										},
										prop.isStatic,
										prop.isReadOnly,
									),
								);

							return some(
								TsDeclClass.create(
									prop.comments.concat(ExtractClasses.commentFor(wasBackup)),
									false, // declared
									false, // isAbstract
									name,
									analyzedCtors.longestTParams,
									some(FollowAliases.typeRef(scope)(analyzedCtors.resultType)),
									IArray.Empty, // implements
									realCtors.map((m) => m as TsMember),
									JsLocation.add(ownerLoc, prop.name),
									ownerCp.add(name),
								),
							);
						}
					}
				}
			}
			return none;
		};
	}
}

/**
 * Analyzed constructor information for a type.
 */
export class AnalyzedCtors {
	constructor(
		public readonly longestTParams: IArray<TsTypeParam>,
		public readonly resultType: TsTypeRef,
		public readonly ctors: IArray<TsFunSig>,
	) {}

	/**
	 * Analyze a type to extract constructor information.
	 *
	 * This method finds constructors in a type and analyzes them to determine
	 * the longest type parameter list and compatible constructors.
	 */
	static from(scope: TsTreeScope, tpe: TsType): Option<AnalyzedCtors> {
		const ctors = AnalyzedCtors.findCtors(scope, LoopDetector.initial)(tpe);

		// Filter constructors that have simple return types
		const withSimpleType: Array<[TsFunSig, TsTypeRef]> = [];
		for (const sig of ctors) {
			if (isSome(sig.resultType)) {
				const resultType = sig.resultType.value;
				if (resultType._tag === "TsTypeRef") {
					const rt = resultType as TsTypeRef;
					// Use scope / sig to enter the signature scope
					const sigScope = scope["/"](sig);
					if (AnalyzedCtors.isSimpleType(rt, sigScope)) {
						withSimpleType.push([sig, rt]);
					}
				}
			}
		}

		if (withSimpleType.length === 0) {
			return none;
		}

		// Find the constructor with the most type parameters
		const maxEntry = withSimpleType.reduce((max, current) =>
			current[0].tparams.length > max[0].tparams.length ? current : max,
		);
		const longestTParams = maxEntry[0].tparams;
		const resultType = maxEntry[1]; // Use the TsTypeRef from the tuple

		// Keep only constructors with compatible type parameters and return type
		const conforming: TsFunSig[] = [];
		for (const [ctor, _] of withSimpleType) {
			// Check if this constructor's type parameters are compatible
			let isCompatible = ctor.tparams.length <= longestTParams.length;

			// Check type parameter compatibility
			if (isCompatible) {
				for (let i = 0; i < ctor.tparams.length; i++) {
					if (
						i >= longestTParams.length ||
						ctor.tparams.get(i).name.value !== longestTParams.get(i).name.value
					) {
						isCompatible = false;
						break;
					}
				}
			}

			// Check return type compatibility
			if (isCompatible && isSome(ctor.resultType)) {
				const ctorResultType = ctor.resultType.value;
				if (ctorResultType._tag === "TsTypeRef") {
					isCompatible = AnalyzedCtors.typeRefsEqual(
						ctorResultType as TsTypeRef,
						resultType,
					);
				} else {
					isCompatible = false;
				}
			} else if (isCompatible) {
				isCompatible = false; // No result type
			}

			if (isCompatible) {
				conforming.push(ctor);
			}
		}

		if (conforming.length === 0) {
			return none;
		}

		return some(
			new AnalyzedCtors(
				longestTParams,
				resultType,
				IArray.fromArray(conforming),
			),
		);
	}

	/**
	 * Helper method to compare two TsTypeRef instances for equality
	 */
	private static typeRefsEqual(a: TsTypeRef, b: TsTypeRef): boolean {
		// Compare the string representation of qualified names
		return (
			a.name.asString === b.name.asString &&
			a.tparams.length === b.tparams.length
		);
	}

	/**
	 * Find constructors in a type.
	 *
	 * This method recursively searches through types to find constructor signatures.
	 */
	static findCtors(
		scope: TsTreeScope,
		loopDetector: LoopDetector,
	): (tpe: TsType) => IArray<TsFunSig> {
		return (tpe: TsType): IArray<TsFunSig> => {
			// Helper function to extract constructors from HasClassMembers
			const fromHasClassMembers = (x: HasClassMembers): IArray<TsFunSig> => {
				const ctors = x.membersByName.get(TsIdentConstructor);
				if (!ctors) {
					return IArray.Empty;
				}

				const constructorSigs: TsFunSig[] = [];
				for (const member of ctors) {
					if (member._tag === "TsMemberCtor") {
						const ctor = member as TsMemberCtor;
						// Copy signature with combined comments
						constructorSigs.push({
							...ctor.signature,
							comments: ctor.signature.comments.concat(ctor.comments),
						});
					}
				}
				return IArray.fromArray(constructorSigs);
			};

			// Follow aliases to resolve the actual type
			const resolvedType = FollowAliases.apply(scope)(tpe);

			switch (resolvedType._tag) {
				case "TsTypeIntersect": {
					const intersectType = resolvedType as TsTypeIntersect;
					const allCtors: TsFunSig[] = [];
					for (const subType of intersectType.types) {
						const subCtors = AnalyzedCtors.findCtors(
							scope,
							loopDetector,
						)(subType);
						allCtors.push(...subCtors.toArray());
					}
					return IArray.fromArray(allCtors);
				}

				case "TsTypeConstructor": {
					const constructorType = resolvedType as TsTypeConstructor;
					if (constructorType.signature._tag === "TsTypeFunction") {
						const functionType = constructorType.signature as TsTypeFunction;
						return IArray.fromArray([functionType.signature]);
					}
					return IArray.Empty;
				}

				case "TsTypeRef": {
					const typeRef = resolvedType as TsTypeRef;
					const loopResult = loopDetector.including(typeRef, scope);
					if (loopResult._tag === "Left") {
						return IArray.Empty;
					}

					const newLoopDetector = loopResult.right;
					const lookupResult = scope.lookupType(typeRef.name);

					if (lookupResult.length > 0) {
						const decl = lookupResult.get(0);
						if (decl._tag === "TsDeclInterface") {
							const iface = decl as TsDeclInterface;
							// Apply type parameters using FillInTParams
							const filledInterface = FillInTParams.apply(
								iface,
								typeRef.tparams,
							);
							const directCtors = fromHasClassMembers(filledInterface);

							// Also check inheritance
							const inheritanceCtors: TsFunSig[] = [];
							for (const inheritedType of filledInterface.inheritance) {
								const inheritedCtors = AnalyzedCtors.findCtors(
									scope,
									newLoopDetector,
								)(inheritedType);
								inheritanceCtors.push(...inheritedCtors.toArray());
							}

							return directCtors.concat(IArray.fromArray(inheritanceCtors));
						}
					}
					return IArray.Empty;
				}

				case "TsTypeObject": {
					const objectType = resolvedType as TsTypeObject;
					return fromHasClassMembers(objectType);
				}

				default:
					return IArray.Empty;
			}
		};
	}

	/**
	 * Check if a type reference is a simple type (class or interface).
	 *
	 * This method avoids generating a class extending from a type parameter.
	 */
	static isSimpleType(ref: TsTypeRef, scope: TsTreeScope): boolean {
		// Check if this is an abstract type (type parameter)
		if (scope.isAbstract(ref.name)) {
			return false;
		}

		// Look up the type in scope
		const lookupResult = scope.lookupTypeIncludeScope(ref.name);
		if (lookupResult.length === 0) {
			return false;
		}

		const [decl, newScope] = lookupResult.get(0);

		switch (decl._tag) {
			case "TsDeclClass":
			case "TsDeclInterface":
				return true;

			case "TsDeclTypeAlias": {
				const alias = decl as any; // TsDeclTypeAlias
				if (alias.alias._tag === "TsTypeRef") {
					// Recursively follow the alias
					return AnalyzedCtors.isSimpleType(alias.alias as TsTypeRef, newScope);
				}
				return false;
			}

			default:
				return false;
		}
	}
}

/**
 * Helper for finding available names that don't conflict with existing declarations.
 */
export class FindAvailableName {
	private constructor(
		private readonly index: Map<TsIdent, IArray<TsNamedDecl>>,
	) {}

	/**
	 * Create a FindAvailableName instance for the given container and scope.
	 */
	static apply(x: TsContainer, scope: TsTreeScope): FindAvailableName {
		// Check if we're in a namespaced context and need to combine indices
		const idx =
			scope.stack.length >= 2 &&
			scope.stack[0]?._tag === "TsDeclNamespace" &&
			(scope.stack[0] as any).name.equals(TsIdent.namespaced()) &&
			scope.stack[1]?._tag === "TsContainer"
				? FindAvailableName.combineIndices([
						(scope.stack[0] as any).membersByName,
						(scope.stack[1] as any).membersByName,
					])
				: x.membersByName;

		return new FindAvailableName(idx);
	}

	/**
	 * Combine multiple member indices into one.
	 */
	private static combineIndices(
		indices: Map<TsIdent, IArray<TsNamedDecl>>[],
	): Map<TsIdent, IArray<TsNamedDecl>> {
		const combined = new Map<TsIdent, IArray<TsNamedDecl>>();

		for (const index of indices) {
			for (const [key, value] of index.entries()) {
				const existing = combined.get(key);
				if (existing) {
					combined.set(key, existing.concat(value));
				} else {
					combined.set(key, value);
				}
			}
		}

		return combined;
	}

	/**
	 * Find an available name for the given potential name.
	 * Returns the name and whether a backup name was used.
	 */
	apply(potentialName: TsIdentSimple): Option<[TsIdentSimple, boolean]> {
		const backupName =
			potentialName.value === TsIdent.namespaced().value
				? TsIdent.simple("namespacedCls") // Create backup name for namespaced
				: TsIdent.simple(`${potentialName.value}Cls`);

		const primaryResult = this.availableTypeName(potentialName, false);
		if (primaryResult._tag === "Some") {
			return primaryResult;
		}
		return this.availableTypeName(backupName, true);
	}

	/**
	 * Check if a potential name is available for use as a type name.
	 */
	private availableTypeName(
		potentialName: TsIdentSimple,
		wasBackup: boolean,
	): Option<[TsIdentSimple, boolean]> {
		const existings = this.index.get(potentialName);

		if (!existings) {
			return some([potentialName, wasBackup]);
		}

		// Check for collision with type declarations
		const isCollision = existings.toArray().some((existing) => {
			switch (existing._tag) {
				case "TsDeclInterface":
				case "TsDeclClass":
				case "TsDeclTypeAlias":
					return true;
				default:
					return false;
			}
		});

		return isCollision ? none : some([potentialName, wasBackup]);
	}
}
