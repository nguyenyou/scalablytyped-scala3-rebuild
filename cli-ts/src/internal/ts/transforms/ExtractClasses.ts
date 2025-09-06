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

import { getOrElse, none, type Option, some } from "fp-ts/Option";
import { IArray } from "../../IArray.js";
import { TransformLeaveMembers } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import {
	type TsContainer,
	type TsContainerOrDecl,
	type TsFunSig,
	TsIdent,
	type TsIdentSimple,
	type TsNamedDecl,
	type TsType,
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
		_scope: TsTreeScope,
		_sameName: IArray<TsNamedDecl>,
		_findName: FindAvailableName,
	): Option<IArray<TsNamedDecl>> {
		// TODO: Implement the core extraction logic
		// This will be implemented incrementally in the next steps
		return none;
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
	 * TODO: This is a simplified implementation that returns None for now.
	 * The full implementation requires complex type analysis that will be
	 * implemented incrementally.
	 */
	static from(_scope: TsTreeScope, _tpe: TsType): Option<AnalyzedCtors> {
		// For now, return None to avoid type errors
		// This will be implemented properly in subsequent iterations
		return none;
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
