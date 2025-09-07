/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ResolveTypeLookups
 *
 * Resolves type lookup expressions (indexed access types) by evaluating them against
 * the actual type structure. Converts expressions like `MyType[K]` to their resolved types.
 */

import { isSome } from "fp-ts/Option";
import { Comments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import { AllMembersFor } from "../AllMembersFor.js";
import { FollowAliases } from "../FollowAliases.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import { LoopDetector, type TsTreeScope } from "../TsTreeScope.js";
import {
	MethodType,
	type TsFunSig,
	type TsLiteral,
	type TsMember,
	TsMemberCall,
	type TsMemberFunction,
	type TsMemberIndex,
	type TsMemberProperty,
	TsProtectionLevel,
	type TsType,
	TsTypeFunction,
	TsTypeIntersect,
	type TsTypeLookup,
	TsTypeObject,
	TsTypeRef,
	type TsTypeTuple,
	TsTypeUnion,
} from "../trees.js";
import { evaluateKeys, type TaggedLiteral } from "./ExpandTypeMappings.js";

/**
 * Main ResolveTypeLookups transformation object
 */
export const ResolveTypeLookups = {
	/**
	 * Apply the ResolveTypeLookups transformation
	 */
	apply: () => {
		return new ResolveTypeLookupsVisitor();
	},
};

/**
 * Visitor that resolves type lookup expressions
 */
class ResolveTypeLookupsVisitor extends TreeTransformationScopedChanges {
	/**
	 * Transform types by resolving lookup expressions
	 */
	override leaveTsType(scope: TsTreeScope): (x: TsType) => TsType {
		return (x: TsType) => {
			switch (x._tag) {
				case "TsTypeLookup": {
					const lookup = x as TsTypeLookup;

					// Special case: tuple[number] -> union of tuple element types
					if (
						lookup.from._tag === "TsTypeTuple" &&
						lookup.key._tag === "TsTypeRef" &&
						(lookup.key as TsTypeRef).name.parts.length === 1 &&
						(lookup.key as TsTypeRef).name.parts.apply(0).value === "number"
					) {
						const tuple = lookup.from as TsTypeTuple;
						const elementTypes = tuple.elems.map((elem) => elem.tpe);
						return TsTypeUnion.simplified(elementTypes);
					}

					// General lookup resolution
					const resolved = this.expandLookupType(scope, lookup);
					return resolved !== undefined ? resolved : x;
				}

				default:
					return x;
			}
		};
	}

	/**
	 * Types to ignore during type resolution
	 */
	private readonly toIgnore = new Set<string>(["never", "any", "object"]);

	/**
	 * Check if a type should be ignored
	 */
	private shouldIgnoreType(tpe: TsType): boolean {
		if (tpe._tag === "TsTypeRef") {
			const typeRef = tpe as TsTypeRef;
			if (typeRef.name.parts.length === 1) {
				const name = typeRef.name.parts.apply(0).value;
				return this.toIgnore.has(name);
			}
		}
		return false;
	}

	/**
	 * Expand a type lookup expression to its resolved type
	 */
	private expandLookupType(
		scope: TsTreeScope,
		lookup: TsTypeLookup,
	): TsType | undefined {
		// Evaluate the keys using ExpandTypeMappings
		const keysResult = evaluateKeys(scope, LoopDetector.initial)(lookup.key);

		if (keysResult._tag !== "Ok") {
			return undefined;
		}

		const keys = keysResult.value;

		const go = (tpe: TsType): TsType | undefined => {
			// Follow aliases first
			const resolvedType = FollowAliases.apply(scope)(tpe);

			switch (resolvedType._tag) {
				case "TsTypeRef": {
					const typeRef = resolvedType as TsTypeRef;

					// Check if this is an abstract type
					if (scope.isAbstract(typeRef.name)) {
						return undefined;
					}

					// Get all members for this type reference
					const members = AllMembersFor.apply(
						scope,
						LoopDetector.initial,
					)(typeRef);
					return this.pick(members, keys);
				}

				case "TsTypeObject": {
					const objectType = resolvedType as TsTypeObject;
					return this.pick(objectType.members, keys);
				}

				case "TsTypeUnion": {
					const unionType = resolvedType as TsTypeUnion;
					const results: TsType[] = [];
					let hasUndefined = false;

					for (let i = 0; i < unionType.types.length; i++) {
						const result = go(unionType.types.apply(i));
						if (result === undefined) {
							hasUndefined = true;
						} else {
							results.push(result);
						}
					}

					// Only return a union if all members resolved successfully
					if (!hasUndefined && results.length > 0) {
						return TsTypeUnion.simplified(IArray.fromArray(results));
					}
					return undefined;
				}

				default:
					return undefined;
			}
		};

		return go(lookup.from);
	}

	/**
	 * Pick types from members based on a set of tagged literals
	 */
	private pick(
		members: IArray<TsMember>,
		strings: Set<TaggedLiteral>,
	): TsType | undefined {
		if (strings.size === 0) {
			// Look for index signature
			for (let i = 0; i < members.length; i++) {
				const member = members.apply(i);
				if (member._tag === "TsMemberIndex") {
					const indexMember = member as TsMemberIndex;
					return isSome(indexMember.valueType)
						? indexMember.valueType.value
						: TsTypeRef.any;
				}
			}
			return undefined;
		}

		// Collect types for each literal
		const types: TsType[] = [];
		for (const taggedLit of strings) {
			const pickedType = this.pickSingle(members, taggedLit.lit);
			if (!this.shouldIgnoreType(pickedType)) {
				types.push(pickedType);
			}
		}

		if (types.length === 0) {
			return undefined;
		}

		const result = TsTypeUnion.simplified(IArray.fromArray(types));

		// Don't return 'never' type
		if (
			result._tag === "TsTypeRef" &&
			(result as TsTypeRef).name.parts.length === 1 &&
			(result as TsTypeRef).name.parts.apply(0).value === "never"
		) {
			return undefined;
		}

		return result;
	}

	/**
	 * Pick a type from members based on a single literal
	 */
	private pickSingle(members: IArray<TsMember>, wanted: TsLiteral): TsType {
		const functions: TsFunSig[] = [];
		const fields: TsType[] = [];

		// Collect matching functions and properties
		for (let i = 0; i < members.length; i++) {
			const member = members.apply(i);

			if (member._tag === "TsMemberFunction") {
				const funcMember = member as TsMemberFunction;
				if (
					funcMember.name.value === wanted.value &&
					MethodType.isNormal(funcMember.methodType) &&
					!funcMember.isStatic
				) {
					functions.push(funcMember.signature);
				}
			} else if (member._tag === "TsMemberProperty") {
				const propMember = member as TsMemberProperty;
				if (propMember.name.value === wanted.value && !propMember.isStatic) {
					const propType = isSome(propMember.tpe)
						? propMember.tpe.value
						: TsTypeRef.any;
					fields.push(propType);
				}
			}
		}

		// Combine functions into a type
		let combinedFunctions: TsType | undefined;
		if (functions.length === 1) {
			combinedFunctions = TsTypeFunction.create(functions[0]);
		} else if (functions.length > 1) {
			// Create object type with call signatures
			const callMembers = functions.map((sig) =>
				TsMemberCall.create(Comments.empty(), TsProtectionLevel.default(), sig),
			);
			combinedFunctions = TsTypeObject.create(
				Comments.empty(),
				IArray.fromArray(callMembers as TsMember[]),
			);
		}

		// Combine all types
		const allTypes: TsType[] = [...fields];
		if (combinedFunctions !== undefined) {
			allTypes.push(combinedFunctions);
		}

		if (allTypes.length === 0) {
			return TsTypeRef.any;
		}

		// Filter out ignored types
		const filteredTypes = allTypes.filter((t) => !this.shouldIgnoreType(t));

		if (filteredTypes.length === 0) {
			return TsTypeRef.any;
		}

		return TsTypeIntersect.simplified(IArray.fromArray(filteredTypes));
	}
}
