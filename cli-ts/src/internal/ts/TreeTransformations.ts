/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TreeTransformations
 *
 * Provides concrete implementations of TreeTransformation for common use cases.
 */

import type { IArray } from "../IArray.js";
import { AbstractTreeTransformation } from "./TreeTransformation.js";
import type { TsTreeScope } from "./TsTreeScope.js";
import type {
	HasClassMembers,
	TsAugmentedModule,
	TsContainer,
	TsContainerOrDecl,
	TsDeclClass,
	TsDeclInterface,
	TsDeclModule,
	TsDeclNamespace,
	TsGlobal,
	TsMember,
	TsParsedFile,
	TsTree,
	TsTypeObject,
} from "./trees.js";

/**
 * Tree transformation that maintains scoped changes.
 * This is equivalent to TreeTransformationScopedChanges in Scala.
 *
 * The scope is updated by adding each tree to the scope stack as we traverse.
 */
export abstract class TreeTransformationScopedChanges extends AbstractTreeTransformation<TsTreeScope> {
	/**
	 * Adds the current tree to the scope when entering it.
	 * This creates a new scope with the tree added to the stack.
	 * This is equivalent to the '/' operator in Scala.
	 */
	withTree(scope: TsTreeScope, tree: TsTree): TsTreeScope {
		return scope["/"](tree);
	}
}

/**
 * Tree transformation that doesn't maintain any context.
 * This is equivalent to TreeTransformationUnit in Scala.
 *
 * Useful for transformations that don't need to track scope or context.
 */
export abstract class TreeTransformationUnit extends AbstractTreeTransformation<void> {
	/**
	 * Returns void since no context is maintained.
	 */
	withTree(_context: undefined, _tree: TsTree) {
		return undefined;
	}
}

/**
 * Abstract class for transformations that modify container members.
 * Equivalent to the Scala TransformMembers trait.
 */
export abstract class TransformMembers extends TreeTransformationScopedChanges {
	/**
	 * Override this method to define how members should be transformed.
	 */
	abstract newMembers(
		scope: TsTreeScope,
		x: TsContainer,
	): IArray<TsContainerOrDecl>;

	override enterTsParsedFile(
		scope: TsTreeScope,
	): (x: TsParsedFile) => TsParsedFile {
		return (x: TsParsedFile) => ({
			...x,
			members: this.newMembers(scope, x),
		});
	}

	override enterTsGlobal(scope: TsTreeScope): (x: TsGlobal) => TsGlobal {
		return (x: TsGlobal) => ({
			...x,
			members: this.newMembers(scope, x),
		});
	}

	override enterTsDeclNamespace(
		scope: TsTreeScope,
	): (x: TsDeclNamespace) => TsDeclNamespace {
		return (x: TsDeclNamespace) => ({
			...x,
			members: this.newMembers(scope, x),
		});
	}

	override enterTsDeclModule(
		scope: TsTreeScope,
	): (x: TsDeclModule) => TsDeclModule {
		return (x: TsDeclModule) => ({
			...x,
			members: this.newMembers(scope, x),
		});
	}

	enterTsAugmentedModule(
		scope: TsTreeScope,
	): (x: TsAugmentedModule) => TsAugmentedModule {
		return (x: TsAugmentedModule) => ({
			...x,
			members: this.newMembers(scope, x),
		});
	}
}

/**
 * Abstract class for transformations that modify container members on leave.
 * Equivalent to the Scala TransformLeaveMembers trait.
 */
export abstract class TransformLeaveMembers extends TreeTransformationScopedChanges {
	/**
	 * Override this method to define how members should be transformed when leaving containers.
	 */
	abstract newMembers(
		scope: TsTreeScope,
		x: TsContainer,
	): IArray<TsContainerOrDecl>;

	override leaveTsParsedFile(
		scope: TsTreeScope,
	): (x: TsParsedFile) => TsParsedFile {
		return (x: TsParsedFile) => ({
			...x,
			members: this.newMembers(scope, x),
		});
	}

	override leaveTsGlobal(scope: TsTreeScope): (x: TsGlobal) => TsGlobal {
		return (x: TsGlobal) => ({
			...x,
			members: this.newMembers(scope, x),
		});
	}

	override leaveTsDeclNamespace(
		scope: TsTreeScope,
	): (x: TsDeclNamespace) => TsDeclNamespace {
		return (x: TsDeclNamespace) => ({
			...x,
			members: this.newMembers(scope, x),
		});
	}

	override leaveTsDeclModule(
		scope: TsTreeScope,
	): (x: TsDeclModule) => TsDeclModule {
		return (x: TsDeclModule) => ({
			...x,
			members: this.newMembers(scope, x),
		});
	}

	leaveTsAugmentedModule(
		scope: TsTreeScope,
	): (x: TsAugmentedModule) => TsAugmentedModule {
		return (x: TsAugmentedModule) => ({
			...x,
			members: this.newMembers(scope, x),
		});
	}
}

/**
 * Abstract class for transformations that modify class members.
 * Equivalent to the Scala TransformClassMembers trait.
 */
export abstract class TransformClassMembers extends TreeTransformationScopedChanges {
	/**
	 * Override this method to define how class members should be transformed.
	 */
	abstract newClassMembers(
		scope: TsTreeScope,
		x: HasClassMembers,
	): IArray<TsMember>;

	override enterTsDeclClass(
		scope: TsTreeScope,
	): (x: TsDeclClass) => TsDeclClass {
		return (x: TsDeclClass) => ({
			...x,
			members: this.newClassMembers(scope, x),
		});
	}

	override enterTsDeclInterface(
		scope: TsTreeScope,
	): (x: TsDeclInterface) => TsDeclInterface {
		return (x: TsDeclInterface) => ({
			...x,
			members: this.newClassMembers(scope, x),
		});
	}

	override enterTsTypeObject(
		scope: TsTreeScope,
	): (x: TsTypeObject) => TsTypeObject {
		return (x: TsTypeObject) => ({
			...x,
			members: this.newClassMembers(scope, x),
		});
	}
}

/**
 * Utility functions for working with tree transformations.
 */
export namespace TreeTransformations {
	/**
	 * Creates a no-op transformation that returns everything unchanged.
	 */
	export function identity<T>(): AbstractTreeTransformation<T> {
		return new (class extends AbstractTreeTransformation<T> {
			withTree(t: T, _tree: TsTree): T {
				return t;
			}
		})();
	}

	/**
	 * Creates a scoped transformation that returns everything unchanged.
	 */
	export function identityScoped(): TreeTransformationScopedChanges {
		return new (class extends TreeTransformationScopedChanges {
			// All methods use default implementations
		})();
	}

	/**
	 * Creates a unit transformation that returns everything unchanged.
	 */
	export function identityUnit(): TreeTransformationUnit {
		return new (class extends TreeTransformationUnit {
			// All methods use default implementations
		})();
	}

	/**
	 * Combines multiple transformations into a single transformation.
	 * Applies transformations from left to right.
	 */
	export function compose<T>(
		...transformations: AbstractTreeTransformation<T>[]
	): AbstractTreeTransformation<T> {
		if (transformations.length === 0) {
			return identity<T>();
		}

		return transformations.reduce(
			(acc, curr) => acc.combine(curr) as AbstractTreeTransformation<T>,
		);
	}

	/**
	 * Combines multiple scoped transformations.
	 */
	export function composeScoped(
		...transformations: TreeTransformationScopedChanges[]
	): TreeTransformationScopedChanges {
		if (transformations.length === 0) {
			return identityScoped();
		}

		return transformations.reduce(
			(acc, curr) => acc.combine(curr) as TreeTransformationScopedChanges,
		);
	}

	/**
	 * Combines multiple unit transformations.
	 */
	export function composeUnit(
		...transformations: TreeTransformationUnit[]
	): TreeTransformationUnit {
		if (transformations.length === 0) {
			return identityUnit();
		}

		return transformations.reduce(
			(acc, curr) => acc.combine(curr) as TreeTransformationUnit,
		);
	}
}
