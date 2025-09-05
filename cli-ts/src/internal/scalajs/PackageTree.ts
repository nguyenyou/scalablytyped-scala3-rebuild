/**
 * TypeScript port of org.scalablytyped.converter.internal.scalajs.PackageTree
 *
 * Represents a Scala.js package tree structure
 */

import { Comments } from "../Comments";
import { IArray } from "../IArray";
import type { Annotation } from "./Annotation";
import type { Name } from "./Name";
import { QualifiedName } from "./QualifiedName";

/**
 * Base interface for all tree nodes
 */
export interface Tree {
	readonly codePath: QualifiedName;
	readonly comments: Comments;
}

/**
 * Interface for trees that have annotations
 */
export interface HasAnnotations {
	readonly annotations: IArray<Annotation>;
}

/**
 * Interface for trees that have members
 */
export interface HasMembers {
	readonly members: IArray<Tree>;
}

/**
 * Container tree that can hold other trees
 */
export interface ContainerTree extends Tree, HasAnnotations, HasMembers {
	withMembers(members: IArray<Tree>): ContainerTree;
}

/**
 * Represents a Scala.js package tree
 */
export class PackageTree implements ContainerTree {
	constructor(
		public readonly annotations: IArray<Annotation>,
		public readonly name: Name,
		public readonly members: IArray<Tree>,
		public readonly comments: Comments,
		public readonly codePath: QualifiedName,
	) {}

	/**
	 * Create a new PackageTree with different members
	 */
	withMembers(members: IArray<Tree>): PackageTree {
		return new PackageTree(
			this.annotations,
			this.name,
			members,
			this.comments,
			this.codePath,
		);
	}

	/**
	 * Create a mock PackageTree for testing/dummy implementations
	 */
	static createMock(name: Name): PackageTree {
		const mockAnnotations = IArray.Empty as IArray<Annotation>;
		const mockMembers = IArray.Empty as IArray<Tree>;
		const mockComments = Comments.empty();
		const mockCodePath = QualifiedName.from([name]);

		return new PackageTree(
			mockAnnotations,
			name,
			mockMembers,
			mockComments,
			mockCodePath,
		);
	}
}
