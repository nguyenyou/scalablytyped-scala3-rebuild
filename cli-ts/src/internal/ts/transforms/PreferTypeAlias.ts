/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.PreferTypeAlias
 *
 * This transform optimizes type declarations by:
 * 1. Converting interfaces to type aliases when beneficial for Scala compilation
 * 2. Converting type aliases to interfaces when they represent object types
 * 3. Detecting and breaking circular type dependencies
 * 4. Handling dictionary patterns and single inheritance cases
 */

import { none, type Option, some } from "fp-ts/Option";
import { Comment, Raw } from "../../Comment.js";
import { Comments, NoComments } from "../../Comments.js";
import { IArray, IArrayPatterns, partialFunction } from "../../IArray.js";
import { FollowAliases } from "../FollowAliases.js";
import { FillInTParams } from "../FillInTParams.js";
import { HasTParams } from "../HasTParams.js";
import { TsProtectionLevel } from "../TsProtectionLevel.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import { TsTypeFormatter } from "../TsTypeFormatter.js";
import { isDictionary } from "./ExtractInterfaces.js";
import {
	TsDeclInterface,
	TsDeclTypeAlias,
	TsMemberCall,
	TsTypeFunction,
	TsTypeObject,
	TsTypeRef,
	type TsContainer,
	type TsContainerOrDecl,
	type TsDecl,
	type TsFunSig,
	type TsMember,
	type TsParsedFile,
	type TsQIdent,
	type TsTree,
	type TsType,
	type TsTypeIntersect,
} from "../trees.js";

/**
 * Represents a rewrite operation to break circular dependencies
 */
export interface Rewrite {
	readonly target: TsQIdent;
	readonly circular: Set<TsQIdent>;
}

/**
 * Represents a group of circular type references
 */
export interface CircularGroup {
	readonly typeRefs: TsTypeRef[];
}

/**
 * Main PreferTypeAlias transformation object
 */
export const PreferTypeAlias = {
	/**
	 * Main entry point for the transformation
	 */
	apply: (lib: TsParsedFile, rootScope: TsTreeScope): TsParsedFile => {
		const visitor = new PreferTypeAliasVisitor();
		const withTypeAliasPreferred = visitor.visitTsParsedFile(rootScope)(lib);

		const scope = rootScope["/"](withTypeAliasPreferred);
		const groups = PreferTypeAlias.findGroups(withTypeAliasPreferred, scope);

		const allNamesInGroup = new Set<TsQIdent>();
		groups.forEach(group => {
			group.typeRefs.forEach(typeRef => {
				allNamesInGroup.add(typeRef.name);
			});
		});

		// prefer these since they give good results when translating to a circular-safe interface
		const preferredRewrites = new Set<TsQIdent>();
		allNamesInGroup.forEach(name => {
			const followed = FollowAliases.apply(scope)(TsTypeRef.create(NoComments.instance, name, IArray.Empty));
			
			if (followed._tag === "TsTypeRef") {
				const typeRef = followed as TsTypeRef;
				if (typeRef.name.parts.last.value !== "Array") {
					preferredRewrites.add(typeRef.name);
				}
			} else if (followed._tag === "TsTypeFunction") {
				preferredRewrites.add(name);
			} else if (followed._tag === "TsTypeObject") {
				const objType = followed as TsTypeObject;
				if (!PreferTypeAlias.isTypeMapping(objType.members)) {
					preferredRewrites.add(name);
				}
			}
		});

		const rewrites = PreferTypeAlias.breakCircularGroups(groups, preferredRewrites);

		rewrites.forEach(r => {
			const circularNames = Array.from(r.circular).map(qident => TsTypeFormatter.qident(qident));
			scope.logger
				.withContext("circular", circularNames)
				.info(`Rewriting: ${TsTypeFormatter.qident(r.target)} to break circular graph`);
		});

		return new AvoidCircularVisitor(rewrites).visitTsParsedFile(rootScope)(withTypeAliasPreferred);
	},

	/**
	 * Find circular groups in the parsed file
	 */
	findGroups: (lib: TsParsedFile, scope: TsTreeScope): Set<CircularGroup> => {
		const found = new Set<CircularGroup>();
		const libPrefix = lib.codePath.forceHasPath().codePath;

		const look = (container: TsContainer): void => {
			container.members.forEach(member => {
				if (member._tag === "TsDeclTypeAlias") {
					const ta = member as TsDeclTypeAlias;
					// Skip trivial type aliases (equivalent to !ta.comments.has[Marker.IsTrivial.type])
					if (!ta.comments.has(PreferTypeAlias.IsTrivial)) {
						const ref = TsTypeRef.create(
							NoComments.instance,
							ta.codePath.forceHasPath().codePath,
							PreferTypeAlias.asTypeArgs(ta.tparams)
						);

						const groups = PreferTypeAlias.isInRecursiveGroup(
							scope["/"](ta),
							[ref],
							ta.alias,
							IArray.Empty
						);

						groups.forEach(rawGroup => {
							const filteredRefs = rawGroup.typeRefs.filter(typeRef =>
								typeRef.name.parts.startsWith(libPrefix.parts)
							);
							if (filteredRefs.length > 0) {
								found.add({ typeRefs: filteredRefs });
							}
						});
					}
				} else if (PreferTypeAlias.isContainer(member)) {
					look(member as TsContainer);
				}
			});
		};

		look(lib);
		return found;
	},

	/**
	 * Check if a declaration is a container
	 */
	isContainer: (decl: TsContainerOrDecl): boolean => {
		return decl._tag === "TsDeclNamespace" || 
			   decl._tag === "TsDeclModule" || 
			   decl._tag === "TsGlobal" ||
			   decl._tag === "TsParsedFile";
	},

	/**
	 * Check if members represent a type mapping
	 */
	isTypeMapping: (members: IArray<TsMember>): boolean => {
		return members.length === 1 && members.get(0)?._tag === "TsMemberTypeMapped";
	},

	/**
	 * Convert type parameters to type arguments
	 */
	asTypeArgs: (tparams: IArray<any>): IArray<TsType> => {
		return tparams.map(tp => TsTypeRef.fromIdent(tp.name) as TsType);
	},

	/**
	 * Marker for trivial type aliases (simplified version)
	 */
	IsTrivial: { _tag: "IsTrivial" as const },

	/**
	 * Check if a type is in a recursive group
	 */
	isInRecursiveGroup: (
		scope: TsTreeScope,
		acc: TsTypeRef[],
		current: TsType,
		lastTypeArgs: IArray<TsType>
	): CircularGroup[] => {
		// Implementation will be added in the next part due to complexity
		return [];
	},

	/**
	 * Break circular groups by selecting types to rewrite
	 */
	breakCircularGroups: (groups: Set<CircularGroup>, preferredRewrites: Set<TsQIdent>): Rewrite[] => {
		const result: Rewrite[] = [];
		let currentGroups = new Set(groups);

		while (currentGroups.size > 0) {
			// Try to find a preferred rewrite first
			let chosen: TsQIdent | undefined;
			
			for (const group of currentGroups) {
				for (const typeRef of group.typeRefs) {
					if (preferredRewrites.has(typeRef.name)) {
						chosen = typeRef.name;
						break;
					}
				}
				if (chosen) break;
			}

			// If no preferred rewrite found, pick the most frequent one
			if (!chosen) {
				const occurrences = new Map<TsQIdent, number>();
				currentGroups.forEach(group => {
					group.typeRefs.forEach(typeRef => {
						const current = occurrences.get(typeRef.name) || 0;
						occurrences.set(typeRef.name, current + 1);
					});
				});

				let maxCount = 0;
				for (const [name, count] of occurrences) {
					if (count > maxCount) {
						maxCount = count;
						chosen = name;
					}
				}
			}

			if (chosen) {
				const intersectsChosen = new Set<CircularGroup>();
				const notIntersects = new Set<CircularGroup>();

				currentGroups.forEach(group => {
					if (group.typeRefs.some(tr => tr.name === chosen)) {
						intersectsChosen.add(group);
					} else {
						notIntersects.add(group);
					}
				});

				const circular = new Set<TsQIdent>();
				intersectsChosen.forEach(group => {
					group.typeRefs.forEach(tr => circular.add(tr.name));
				});

				result.push({ target: chosen, circular });
				currentGroups = notIntersects;
			} else {
				break; // Safety break
			}
		}

		return result;
	}
};

/**
 * Visitor that prefers type aliases over interfaces when beneficial
 */
class PreferTypeAliasVisitor extends TreeTransformationScopedChanges {
	override enterTsDecl(scope: TsTreeScope): (x: TsDecl) => TsDecl {
		return (x: TsDecl) => {
			if (x._tag === "TsDeclInterface") {
				const iface = x as TsDeclInterface;

				// Convert interface to type alias if it meets certain criteria
				if (this.shouldConvertToTypeAlias(scope, iface)) {
					return this.convertInterfaceToTypeAlias(iface);
				}
			} else if (x._tag === "TsDeclTypeAlias") {
				const alias = x as TsDeclTypeAlias;

				// Convert type alias to interface if it represents an object type
				if (this.shouldConvertToInterface(scope, alias)) {
					return this.convertTypeAliasToInterface(alias);
				}
			}

			return x;
		};
	}

	/**
	 * Check if an interface should be converted to a type alias
	 */
	private shouldConvertToTypeAlias(scope: TsTreeScope, iface: TsDeclInterface): boolean {
		// Don't convert if it has inheritance
		if (iface.inheritance.nonEmpty) {
			return false;
		}

		// Don't convert if it's a dictionary
		if (isDictionary(iface.members)) {
			return false;
		}

		// Convert if it has only call signatures (function-like)
		if (this.isCallSignatureOnly(iface.members)) {
			return true;
		}

		// Convert if it's a simple object type without complex inheritance
		return iface.members.nonEmpty && this.isSimpleObjectType(iface.members);
	}

	/**
	 * Check if an interface has only call signatures
	 */
	private isCallSignatureOnly(members: IArray<TsMember>): boolean {
		return members.nonEmpty && members.forall(member => member._tag === "TsMemberCall");
	}

	/**
	 * Check if members represent a simple object type
	 */
	private isSimpleObjectType(members: IArray<TsMember>): boolean {
		return members.forall(member =>
			member._tag === "TsMemberProperty" ||
			member._tag === "TsMemberFunction" ||
			member._tag === "TsMemberCall"
		);
	}

	/**
	 * Convert interface to type alias
	 */
	private convertInterfaceToTypeAlias(iface: TsDeclInterface): TsDeclTypeAlias {
		const objectType = TsTypeObject.create(iface.comments, iface.members);

		return TsDeclTypeAlias.create(
			iface.comments,
			iface.declared,
			iface.name,
			iface.tparams,
			objectType,
			iface.codePath
		);
	}

	/**
	 * Check if a type alias should be converted to an interface
	 */
	private shouldConvertToInterface(scope: TsTreeScope, alias: TsDeclTypeAlias): boolean {
		// Only convert if the alias points to an object type
		if (alias.alias._tag !== "TsTypeObject") {
			return false;
		}

		const objType = alias.alias as TsTypeObject;

		// Don't convert if it's a type mapping
		if (PreferTypeAlias.isTypeMapping(objType.members)) {
			return false;
		}

		// Don't convert if it's a dictionary
		if (isDictionary(objType.members)) {
			return false;
		}

		// Convert if it has members that would benefit from interface representation
		return objType.members.nonEmpty;
	}

	/**
	 * Convert type alias to interface
	 */
	private convertTypeAliasToInterface(alias: TsDeclTypeAlias): TsDeclInterface {
		const objType = alias.alias as TsTypeObject;

		return TsDeclInterface.create(
			alias.comments,
			alias.declared,
			alias.name,
			alias.tparams,
			IArray.Empty, // inheritance
			objType.members,
			alias.codePath
		);
	}
}

/**
 * Visitor that avoids circular dependencies by rewriting specific types
 */
class AvoidCircularVisitor extends TreeTransformationScopedChanges {
	constructor(private readonly rewrites: Rewrite[]) {
		super();
	}

	override enterTsType(scope: TsTreeScope): (x: TsType) => TsType {
		return (x: TsType) => {
			if (x._tag === "TsTypeRef") {
				const typeRef = x as TsTypeRef;

				// Check if this type reference should be rewritten
				const rewrite = this.rewrites.find(r => r.target === typeRef.name);
				if (rewrite) {
					// Create a new interface to break the circular dependency
					return this.createCircularBreakingInterface(scope, typeRef, rewrite);
				}
			}

			return x;
		};
	}

	/**
	 * Create an interface that breaks circular dependencies
	 */
	private createCircularBreakingInterface(
		scope: TsTreeScope,
		typeRef: TsTypeRef,
		rewrite: Rewrite
	): TsType {
		// For now, return the original type ref
		// In a full implementation, this would create a new interface
		// that breaks the circular dependency
		return typeRef;
	}
}
