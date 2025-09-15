/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.RewriteNamespaceMembers
 *
 * Account for an... interesting case of piece of modelling. We'll fix it some day, but for now I doubled down on it.
 * There are reasons for this, most notably in the implementation of the module system.
 *
 * On the typescript side we merge different syntactical entities by using the `namespaced` name. `{function a(): void;
 * namespace a {const b: number}` => `{namespace a {function ^(): void, const b: number}`.
 *
 * This undoes the damage.
 */

import { Comments } from "../Comments.js";
import { IArray, partialFunction } from "../IArray.js";
import { Name } from "../scalajs/Name.js";
import {
	type ContainerTree,
	type FieldTree,
	type MemberTree,
	type MethodTree,
	type Tree,
	TypeRef,
	isContainerTree,
	isFieldTree,
	isMemberTree,
	isMethodTree,
	isModuleTree,
	isPackageTree,
} from "../scalajs/Tree.js";

/**
 * Result type for RewriteNamespaceMembers transformation
 * Returns: [inheritance, newMemberTrees, remaining, comments]
 */
export type RewriteNamespaceMembersResult = [
	IArray<TypeRef>, // inheritance
	IArray<MemberTree>, // newMemberTrees
	IArray<Tree>, // remaining
	Comments, // comments
];

/**
 * RewriteNamespaceMembers transformation
 * Equivalent to Scala's object RewriteNamespaceMembers
 */
export const RewriteNamespaceMembers = {
	/**
	 * Apply the transformation to an array of trees
	 * Equivalent to Scala's def apply(original: IArray[Tree])
	 */
	apply: (original: IArray<Tree>): RewriteNamespaceMembersResult => {
		// Use partitionCollect4 to separate different types of namespaced elements
		const [namespacedFields, namespacedMethods, namespacedContainers, memberTrees, remaining] =
			original.partitionCollect4(
				// Namespaced fields: FieldTree with name === Name.namespaced
				partialFunction(
					(x: Tree): x is FieldTree =>
						isFieldTree(x) && x.name === Name.namespaced,
					(x: Tree) => x as FieldTree,
				),
				// Namespaced methods: MethodTree with name === Name.namespaced
				partialFunction(
					(x: Tree): x is MethodTree =>
						isMethodTree(x) && x.name === Name.namespaced,
					(x: Tree) => x as MethodTree,
				),
				// Namespaced containers: ContainerTree with name === Name.namespaced
				partialFunction(
					(x: Tree): x is ContainerTree =>
						isContainerTree(x) && x.name === Name.namespaced,
					(x: Tree) => x as ContainerTree,
				),
				// Regular member trees: any MemberTree
				partialFunction(
					(x: Tree): x is MemberTree => isMemberTree(x),
					(x: Tree) => x as MemberTree,
				),
			);

		// Calculate inheritance from fields and containers
		const inheritance: IArray<TypeRef> = (() => {
			// Get types from namespaced fields
			const fromFields = namespacedFields.map((x) => x.tpe);

			// Get parents from namespaced containers (only ModuleTree has parents)
			const fromContainers = namespacedContainers.flatMap((container) => {
				if (isPackageTree(container)) {
					// PackageTree doesn't contribute to inheritance
					return IArray.Empty;
				} else if (isModuleTree(container)) {
					// ModuleTree contributes its parents
					return container.parents;
				}
				return IArray.Empty;
			});

			// Combine and create intersection if needed
			const allTypes = fromFields.concat(fromContainers).distinct();
			if (allTypes.isEmpty) {
				return IArray.Empty;
			} else {
				// Create intersection type as shortcut
				return IArray.apply(TypeRef.Intersection(allTypes, Comments.empty()));
			}
		})();

		// Extract members from namespaced containers and separate member trees from others
		const containerMembers = namespacedContainers.flatMap((container) => container.members);
		const [membersFromContainers, restFromContainers] = containerMembers.partitionCollect(
			partialFunction(
				(x: Tree): x is MemberTree => isMemberTree(x),
				(x: Tree) => x as MemberTree,
			),
		);

		// Create new member trees
		const newMemberTrees = (() => {
			// Rewrite namespaced methods to use Name.APPLY
			const rewrittenMethods = namespacedMethods.map((method): MethodTree => ({
				...method,
				name: Name.APPLY,
			}));

			// Combine all member trees
			return memberTrees.concat(rewrittenMethods).concat(membersFromContainers);
		})();

		// Flatten comments from namespaced containers
		const comments = Comments.flatten(
			namespacedContainers,
			(container) => container.comments,
		);

		// Combine remaining trees
		const allRemaining = remaining.concat(restFromContainers);

		return [inheritance, newMemberTrees, allRemaining, comments];
	},
};