/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.SetCodePath
 *
 * This transform sets code path information on tree nodes that implement HasCodePath.
 * It traverses the tree and updates the codePath property on nodes that support it.
 */

import type { CodePathHasPath } from "../CodePath.js";
import { AbstractTreeTransformation } from "../TreeTransformation.js";
import type { TsContainer, TsDecl, TsParsedFile, TsTree } from "../trees.js";

/**
 * Transform that sets code path information on tree nodes.
 *
 * This transform extends TreeTransformation with CodePathHasPath as the context type.
 * It updates the codePath property on nodes that implement HasCodePath interface.
 *
 * The transform works by:
 * 1. Checking if a node implements HasCodePath (has withCodePath method)
 * 2. If yes, calling withCodePath to update the node with the current path
 * 3. If no, leaving the node unchanged
 * 4. Using the withTree method to navigate into child nodes
 */
export class SetCodePath extends AbstractTreeTransformation<CodePathHasPath> {
	/**
	 * Updates the context when entering a tree node.
	 * This navigates into the tree using the CodePath's navigate method.
	 */
	withTree(codePath: CodePathHasPath, tree: TsTree): CodePathHasPath {
		return codePath.navigate(tree);
	}

	/**
	 * Processes TsDecl nodes, setting code path if they implement HasCodePath.
	 */
	override enterTsDecl(codePath: CodePathHasPath): (x: TsDecl) => TsDecl {
		return (x: TsDecl) => {
			// Check if this declaration implements HasCodePath
			if (this.hasCodePath(x)) {
				return x.withCodePath(codePath) as TsDecl;
			}
			return x;
		};
	}

	/**
	 * Processes TsContainer nodes, setting code path if they implement HasCodePath.
	 */
	override enterTsContainer(
		codePath: CodePathHasPath,
	): (x: TsContainer) => TsContainer {
		return (x: TsContainer) => {
			// Check if this container implements HasCodePath
			if (this.hasCodePath(x)) {
				return x.withCodePath(codePath) as TsContainer;
			}
			return x;
		};
	}

	/**
	 * Processes TsParsedFile nodes, always setting code path since they implement HasCodePath.
	 */
	override enterTsParsedFile(
		codePath: CodePathHasPath,
	): (x: TsParsedFile) => TsParsedFile {
		return (x: TsParsedFile) => {
			// TsParsedFile always implements HasCodePath
			return x.withCodePath(codePath) as TsParsedFile;
		};
	}

	/**
	 * Type guard to check if an object implements HasCodePath.
	 * An object implements HasCodePath if it has both codePath property and withCodePath method.
	 */
	private hasCodePath(
		obj: any,
	): obj is { withCodePath(newCodePath: CodePathHasPath): any } {
		return (
			obj != null &&
			typeof obj === "object" &&
			"codePath" in obj &&
			"withCodePath" in obj &&
			typeof obj.withCodePath === "function"
		);
	}
}

/**
 * Singleton instance of SetCodePath for convenient usage.
 * Equivalent to the Scala object SetCodePath.
 */
export const SetCodePathTransform = new SetCodePath();

/**
 * Static transform function for functional usage.
 */
export const SetCodePathTransformFunction = {
	/**
	 * Transform function that can be used directly.
	 */
	enterTsDecl:
		(codePath: CodePathHasPath) =>
		(x: TsDecl): TsDecl => {
			return SetCodePathTransform.enterTsDecl(codePath)(x);
		},

	enterTsContainer:
		(codePath: CodePathHasPath) =>
		(x: TsContainer): TsContainer => {
			return SetCodePathTransform.enterTsContainer(codePath)(x);
		},

	enterTsParsedFile:
		(codePath: CodePathHasPath) =>
		(x: TsParsedFile): TsParsedFile => {
			return SetCodePathTransform.enterTsParsedFile(codePath)(x);
		},

	withTree: (codePath: CodePathHasPath, tree: TsTree): CodePathHasPath => {
		return SetCodePathTransform.withTree(codePath, tree);
	},
};
