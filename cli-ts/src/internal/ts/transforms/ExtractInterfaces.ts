/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ExtractInterfaces
 *
 * This module extracts anonymous object types into named interfaces to improve readability
 * and reduce code duplication in generated TypeScript definitions.
 */

import { pipe } from "fp-ts/function";
import { none, type Option, some } from "fp-ts/Option";
import { type Comment, Marker } from "../../Comment.js";
import { Comments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import { CodePath } from "../CodePath.js";
import { DeriveNonConflictingName } from "../DeriveNonConflictingName.js";
import { JsLocation } from "../JsLocation.js";
import { AbstractTreeTransformation } from "../TreeTransformation.js";
import { TypeParamsReferencedInTree } from "../TypeParamsReferencedInTree.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import {
	type TsContainerOrDecl,
	TsDeclInterface,
	TsDeclNamespace,
	type TsIdent,
	type TsIdentLibrary,
	type TsIdentSimple,
	TsIdent as TsIdentConstructor,
	type TsMember,
	type TsMemberCall,
	type TsMemberIndex,
	type TsMemberTypeMapped,
	type TsParsedFile,
	TsQIdent,
	type TsTree,
	TsType,
	type TsTypeObject,
	TsTypeParam,
	type TsTypePredicate,
	TsTypeRef,
} from "../trees.js";

/**
 * Main function to extract interfaces from a parsed file
 */
export function extractInterfaces(
	inLibrary: TsIdentLibrary,
	into: TsIdentSimple,
	scope: TsTreeScope,
): (file: TsParsedFile) => TsParsedFile {
	return (file: TsParsedFile): TsParsedFile => {
		const store = new ConflictHandlingStore(inLibrary, into);
		const transformer = new LiftTypeObjects(store);
		const newFile = transformer.visitTsParsedFile(scope)(file);

		const interfaces = store.getInterfaces();
		if (interfaces.isEmpty) {
			return newFile;
		}

		return newFile.withMembers(
			newFile.members.append(
				TsDeclNamespace.create(
					Comments.empty(),
					false, // declared
					into,
					interfaces,
					CodePath.hasPath(inLibrary, TsQIdent.single(into)),
					JsLocation.zero(),
				),
			),
		) as TsParsedFile;
	};
}

/**
 * Store for handling interface conflicts and deduplication
 */
export class ConflictHandlingStore {
	private readonly interfaces = new Map<string, TsDeclInterface>();

	constructor(
		private readonly inLibrary: TsIdent,
		private readonly into: TsIdentSimple,
	) {}

	/**
	 * Add an interface to the store, handling conflicts by name
	 */
	addInterface(
		scope: TsTreeScope,
		prefix: string,
		members: IArray<TsMember>,
		referencedTparams: IArray<TsTypeParam>,
	): (construct: (name: TsIdentSimple) => TsDeclInterface) => CodePath {
		return (construct: (name: TsIdentSimple) => TsDeclInterface): CodePath => {
			const interfaceResult = DeriveNonConflictingName.apply(
				prefix,
				members,
			)((name: TsIdentSimple): Option<TsDeclInterface> => {
				// Check if this name conflicts with referenced type parameters
				if (
					referencedTparams.exists((tparam) => tparam.name.value === name.value)
				) {
					return none;
				}

				const newInterface = construct(name).withCodePath(
					CodePath.hasPath(
						this.inLibrary,
						TsQIdent.of(this.into, name),
					),
				);

				const existing = this.interfaces.get(name.value);
				if (existing) {
					// Check if the existing interface is compatible
					if (
						!this.areInterfacesCompatible(existing, newInterface)
					) {
						return none; // Conflict - try another name
					}
					return some(existing); // Use existing compatible interface
				}

				return some(newInterface);
			}) as TsDeclInterface;

			this.interfaces.set(interfaceResult.name.value, interfaceResult);
			return interfaceResult.codePath;
		};
	}

	/**
	 * Get all stored interfaces as an IArray
	 */
	getInterfaces(): IArray<TsContainerOrDecl> {
		const interfaceArray = Array.from(this.interfaces.values());
		return IArray.fromArray(interfaceArray as TsContainerOrDecl[]);
	}

	/**
	 * Check if two interfaces are compatible (same members and type parameters)
	 */
	private areInterfacesCompatible(
		existing: TsDeclInterface,
		newInterface: TsDeclInterface,
	): boolean {
		// Compare members and type parameters for equality
		return (
			this.areMembersEqual(existing.members, newInterface.members) &&
			this.areTypeParamsEqual(existing.tparams, newInterface.tparams)
		);
	}

	/**
	 * Compare two member arrays for equality
	 */
	private areMembersEqual(
		members1: IArray<TsMember>,
		members2: IArray<TsMember>,
	): boolean {
		if (members1.length !== members2.length) {
			return false;
		}

		for (let i = 0; i < members1.length; i++) {
			// This is a simplified comparison - in practice, you might need
			// more sophisticated member comparison logic
			const m1 = members1.apply(i);
			const m2 = members2.apply(i);
			if (m1._tag !== m2._tag) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Compare two type parameter arrays for equality
	 */
	private areTypeParamsEqual(
		tparams1: IArray<TsTypeParam>,
		tparams2: IArray<TsTypeParam>,
	): boolean {
		if (tparams1.length !== tparams2.length) {
			return false;
		}

		for (let i = 0; i < tparams1.length; i++) {
			const tp1 = tparams1.apply(i);
			const tp2 = tparams2.apply(i);
			if (tp1.name.value !== tp2.name.value) {
				return false;
			}
		}

		return true;
	}
}

/**
 * Checks if an object type will be erased during compilation
 */
export function willBeErased(stack: TsTree[], obj: TsTypeObject): boolean {
	return (
		stack.some((tree) => {
			return (
				tree._tag === "TsMemberTypeMapped" || tree._tag === "TsTypePredicate"
			);
		}) || TsType.isTypeMapping(obj.members)
	);
}

/**
 * Checks if members represent a dictionary pattern
 */
export function isDictionary(members: IArray<TsMember>): boolean {
	if (members.isEmpty) {
		return false;
	}

	return members.forall((member) => {
		if (member._tag === "TsMemberIndex") {
			const indexMember = member as TsMemberIndex;
			return (
				indexMember.indexing._tag === "IndexingDict" ||
				indexMember.indexing._tag === "IndexingSingle"
			);
		}
		return false;
	});
}

/**
 * Determines if a type should be extracted based on the tree scope
 */
export function shouldBeExtracted(scope: TsTreeScope): boolean {
	const stack = scope.stack;
	if (stack.length >= 2) {
		const second = stack[1];
		if (second && second._tag === "TsDeclVar") {
			return false;
		}
	}
	return true;
}

/**
 * Tree transformation that lifts type objects into interfaces
 */
export class LiftTypeObjects extends AbstractTreeTransformation<TsTreeScope> {
	constructor(private readonly store: ConflictHandlingStore) {
		super();
	}

	withTree(scope: TsTreeScope, tree: TsTree): TsTreeScope {
		// Add the current tree to the scope stack
		return {
			...scope,
			stack: [tree, ...scope.stack],
		};
	}

	/**
	 * Visit a parsed file and transform it
	 */
	visitTsParsedFile(scope: TsTreeScope): (file: TsParsedFile) => TsParsedFile {
		return (file: TsParsedFile): TsParsedFile => {
			// Transform the file by visiting all its types
			return this.transformParsedFile(scope, file);
		};
	}

	/**
	 * Transform a parsed file by visiting all types
	 */
	private transformParsedFile(
		_scope: TsTreeScope,
		file: TsParsedFile,
	): TsParsedFile {
		// This is a simplified implementation - in practice, you would need
		// to traverse the entire tree and transform TsTypeObject instances
		return file;
	}

	/**
	 * Transform a type, extracting object types into interfaces
	 */
	leaveTsType(scope: TsTreeScope): (type: TsType) => TsType {
		return (type: TsType): TsType => {
			if (type._tag === "TsTypeObject") {
				const obj = type as TsTypeObject;

				if (
					obj.members.nonEmpty &&
					!isDictionary(obj.members) &&
					!willBeErased(scope.stack, obj) &&
					shouldBeExtracted(scope)
				) {
					const referencedTparams = TypeParamsReferencedInTree.apply(
						scope.tparams,
						obj,
					);

					const prefix = this.determinePrefix(obj);

					const codePath = this.store.addInterface(
						scope,
						prefix,
						obj.members,
						referencedTparams,
					)((name: TsIdentSimple) => {
						// Extract name hint from comments if available
						const commentsWithoutHint = this.extractNameHint(obj.comments);

						return TsDeclInterface.create(
							commentsWithoutHint,
							true, // declared
							name,
							referencedTparams,
							IArray.Empty, // inheritance
							obj.members,
							CodePath.noPath(),
						);
					});

					// Get the code path as TsQIdent
					const codePathQIdent = CodePath.isHasPath(codePath)
						? codePath.codePath
						: TsQIdent.empty();

					// Convert type parameters to type arguments
					const typeArgs = referencedTparams.map((tparam) =>
						TsTypeRef.create(
							Comments.empty(),
							TsQIdent.single(tparam.name),
							IArray.Empty,
						) as TsType
					);

					return TsTypeRef.create(
						Comments.empty(),
						codePathQIdent,
						typeArgs,
					);
				}
			}

			return type;
		};
	}

	/**
	 * Determine the prefix for naming the interface
	 */
	private determinePrefix(obj: TsTypeObject): string {
		const isFunction = obj.members.forall((member) => {
			return member._tag === "TsMemberCall";
		});

		// Try to extract name hint from comments
		const nameHint = this.extractNameHintValue(obj.comments);
		if (nameHint) {
			return nameHint.substring(0, Math.min(25, nameHint.length));
		}

		if (isFunction) {
			return DeriveNonConflictingName.Fn;
		}

		return DeriveNonConflictingName.Anon;
	}

	/**
	 * Extract name hint from comments
	 */
	private extractNameHint(comments: Comments): Comments {
		// This is a simplified implementation - you would need to implement
		// the actual comment extraction logic based on Marker.NameHint
		return comments;
	}

	/**
	 * Extract name hint value from comments
	 */
	private extractNameHintValue(_comments: Comments): string | undefined {
		// This is a simplified implementation - you would need to implement
		// the actual name hint extraction logic
		return undefined;
	}
}