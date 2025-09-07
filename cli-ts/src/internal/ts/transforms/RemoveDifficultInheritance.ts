/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.RemoveDifficultInheritance
 * 
 * In typescript we can inherit from type references pointing to a pretty much arbitrary shape.
 * 
 * Scala naturally is much more constrained here, so we... drop all the difficult things. Some information (like from
 * intersections of type objects, for instance) is retrieved ("lifted", in this code)
 * 
 * We also inline all type aliases in parents.
 * 
 * We'll do better eventually, this is the fallback to make things compile
 */

import { none, some } from "fp-ts/Option";
import { Comment } from "../../Comment.js";
import { IArray, IArrayPatterns } from "../../IArray.js";
import { FillInTParams } from "../FillInTParams.js";
import { FlattenTrees } from "../FlattenTrees.js";
import { TsTreeScope } from "../TsTreeScope.js";
import { createTsTypeFormatter } from "../TsTypeFormatter.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import { isDictionary } from "./ExtractInterfaces.js";

import {
	TsDeclClass,
	TsDeclInterface,
	TsDeclTypeAlias,
	TsType,
	TsTypeIntersect,
	TsTypeObject,
	TsTypeRef,
	type TsMember,
} from "../trees.js";

/**
 * Result type for combining inheritance processing results
 */
interface Res {
	readonly keep: IArray<TsTypeRef>;
	readonly drop: IArray<TsType>;
	readonly lift: Map<TsTypeRef, IArray<TsMember>>;
}

/**
 * Res namespace with utility functions
 */
const Res = {
	/**
	 * Empty result
	 */
	empty: (): Res => ({
		keep: IArray.Empty,
		drop: IArray.Empty,
		lift: new Map(),
	}),

	/**
	 * Create a result with kept type references
	 */
	keep: (typeRefs: IArray<TsTypeRef>): Res => ({
		keep: typeRefs,
		drop: IArray.Empty,
		lift: new Map(),
	}),

	/**
	 * Create a result with dropped types
	 */
	drop: (types: IArray<TsType>): Res => ({
		keep: IArray.Empty,
		drop: types,
		lift: new Map(),
	}),

	/**
	 * Create a result with lifted members
	 */
	lift: (typeRef: TsTypeRef, members: IArray<TsMember>): Res => ({
		keep: IArray.Empty,
		drop: IArray.Empty,
		lift: new Map([[typeRef, members]]),
	}),

	/**
	 * Combine multiple results
	 */
	combine: (results: IArray<Res>): Res => {
		return results.foldLeft(Res.empty(), (acc, res) => ({
			keep: acc.keep.appendedAll(res.keep),
			drop: acc.drop.appendedAll(res.drop),
			lift: new Map([...acc.lift.entries(), ...res.lift.entries()]),
		}));
	},
};

/**
 * Main RemoveDifficultInheritance transformation object
 */
export const RemoveDifficultInheritance = {
	/**
	 * Apply the RemoveDifficultInheritance transformation
	 */
	apply: () => {
		return new RemoveDifficultInheritanceVisitor();
	},
};

/**
 * Visitor that removes difficult inheritance patterns and lifts members from intersections
 */
class RemoveDifficultInheritanceVisitor extends TreeTransformationScopedChanges {
	/**
	 * Transform class declarations by cleaning parent and implements references
	 */
	override enterTsDeclClass(scope: TsTreeScope): (x: TsDeclClass) => TsDeclClass {
		return (s: TsDeclClass) => {
			// Combine parent and implements into a single array for processing
			const allParents = s.parent._tag === "Some" 
				? s.implementsInterfaces.prepend(s.parent.value)
				: s.implementsInterfaces;

			const cleaned = allParents.map(typeRef => this.cleanParentRef(scope, typeRef));
			const combined = Res.combine(cleaned);

			// Extract results
			const newParent = combined.keep.length > 0 ? some(combined.keep.apply(0)) : none;
			const newImplements = combined.keep.length > 1 ? combined.keep.drop(1) : IArray.Empty;
			const summaryComment = this.summarizeChanges(combined.drop, combined.lift);
			const newComments = summaryComment ? s.comments.add(summaryComment) : s.comments;
			const liftedMembers = this.flatMapLiftedMembers(combined.lift);
			const newMembers = FlattenTrees.newClassMembers(s.members, liftedMembers);

			return TsDeclClass.create(
				newComments,
				s.declared,
				s.isAbstract,
				s.name,
				s.tparams,
				newParent,
				newImplements,
				newMembers,
				s.jsLocation,
				s.codePath
			);
		};
	}

	/**
	 * Transform interface declarations by cleaning inheritance references
	 */
	override enterTsDeclInterface(scope: TsTreeScope): (x: TsDeclInterface) => TsDeclInterface {
		return (s: TsDeclInterface) => {
			const cleaned = s.inheritance.map(typeRef => this.cleanParentRef(scope, typeRef));
			const combined = Res.combine(cleaned);

			const summaryComment = this.summarizeChanges(combined.drop, combined.lift);
			const newComments = summaryComment ? s.comments.add(summaryComment) : s.comments;
			const liftedMembers = this.flatMapLiftedMembers(combined.lift);
			const newMembers = FlattenTrees.newClassMembers(s.members, liftedMembers);

			return TsDeclInterface.create(
				newComments,
				s.declared,
				s.name,
				s.tparams,
				combined.keep,
				newMembers,
				s.codePath
			);
		};
	}

	/**
	 * Clean a parent type reference, handling type aliases and difficult inheritance patterns
	 */
	private cleanParentRef(scope: TsTreeScope, tpe: TsTypeRef): Res {
		// Drop problematic built-in types
		if (this.isProblematicBuiltIn(tpe)) {
			return Res.drop(IArray.apply(tpe as TsType));
		}

		// Look up the type reference in scope
		const lookupResults = scope.lookupTypeIncludeScope(tpe.name);
		
		for (let i = 0; i < lookupResults.length; i++) {
			const [decl, newScope] = lookupResults.apply(i);

			// Handle thin interfaces (interfaces with exactly one parent)
			if (decl._tag === "TsDeclInterface") {
				const iface = decl as TsDeclInterface;
				const exactlyOneParent = IArrayPatterns.exactlyOne(iface.inheritance);
				if (exactlyOneParent !== undefined && iface.members.isEmpty) {
					const rewritten = FillInTParams.apply(iface, tpe.tparams);
					return this.cleanParentRef(newScope, rewritten.inheritance.apply(0));
				}
			}

			// Handle type aliases
			if (decl._tag === "TsDeclTypeAlias") {
				const alias = decl as TsDeclTypeAlias;
				const rewritten = FillInTParams.apply(alias, tpe.tparams);

				return this.processTypeAliasTarget(newScope, tpe, rewritten.alias);
			}
		}

		// If not found or no special handling needed, keep the type reference
		return Res.keep(IArray.apply(tpe));
	}

	/**
	 * Process the target type of a type alias
	 */
	private processTypeAliasTarget(scope: TsTreeScope, originalRef: TsTypeRef, aliasTarget: TsType): Res {
		switch (aliasTarget._tag) {
			case "TsTypeRef":
				// Recursively clean the aliased type reference
				return this.cleanParentRef(scope, aliasTarget as TsTypeRef);

			case "TsTypeIntersect":
				// Flatten intersection types by processing each member
				const intersect = aliasTarget as TsTypeIntersect;
				const results = intersect.types.map(type => {
					if (type._tag === "TsTypeRef") {
						return this.cleanParentRef(scope, type as TsTypeRef);
					} else if (type._tag === "TsTypeObject") {
						const obj = type as TsTypeObject;
						if (!TsType.isTypeMapping(obj.members)) {
							return Res.lift(originalRef, obj.members);
						}
					}
					return Res.drop(IArray.apply(type));
				});
				return Res.combine(results);

			case "TsTypeUnion":
				// Drop union types as they can't be extended in Scala
				return Res.drop(IArray.apply(aliasTarget));

			case "TsTypeFunction":
				// Keep function types as they can be extended
				return Res.keep(IArray.apply(originalRef));

			case "TsTypeObject":
				const obj = aliasTarget as TsTypeObject;
				if (isDictionary(obj.members)) {
					// Keep dictionary types
					return Res.keep(IArray.apply(originalRef));
				} else if (!TsType.isTypeMapping(obj.members)) {
					// Lift object type members
					return Res.lift(originalRef, obj.members);
				}
				// Fall through to drop

			default:
				// Drop unknown or unsupported types
				return Res.drop(IArray.apply(aliasTarget));
		}
	}

	/**
	 * Check if a type reference is a problematic built-in type
	 */
	private isProblematicBuiltIn(tpe: TsTypeRef): boolean {
		if (tpe.name.parts.length !== 1) return false;
		const name = tpe.name.parts.apply(0).value;
		return name === "object" || name === "Object" || name === "any";
	}

	/**
	 * Flatten lifted members from the lift map
	 */
	private flatMapLiftedMembers(lift: Map<TsTypeRef, IArray<TsMember>>): IArray<TsMember> {
		const allMembers: TsMember[] = [];
		for (const [_, members] of lift.entries()) {
			allMembers.push(...members.toArray());
		}
		return IArray.fromArray(allMembers);
	}

	/**
	 * Create a summary comment for dropped and lifted types
	 */
	private summarizeChanges(drop: IArray<TsType>, lift: Map<TsTypeRef, IArray<TsMember>>): Comment | undefined {
		const formatter = createTsTypeFormatter(false);
		const droppedMessages = drop.map(d => `- Dropped ${formatter.apply(d)}`);

		const liftedMessage = lift.size > 0
			? [`- Lifted ${Array.from(lift.values()).reduce((sum, members) => sum + members.length, 0)} members from ${Array.from(lift.keys()).map(k => formatter.apply(k)).join(", ")}`]
			: [];

		const allMessages = droppedMessages.appendedAll(IArray.fromArray(liftedMessage));

		if (allMessages.isEmpty) {
			return undefined;
		}

		return Comment.warning(allMessages.toArray().join("\n"));
	}
}
