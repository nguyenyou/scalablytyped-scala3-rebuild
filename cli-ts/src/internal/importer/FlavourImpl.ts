/**
 * TypeScript port of org.scalablytyped.converter.internal.scalajs.flavours.FlavourImpl
 *
 * Interface for flavour implementations that define how Scala.js code is generated
 */

import { Name } from "../scalajs/Name";
import type { PackageTree } from "../scalajs/PackageTree";
import { Versions } from "./ConversionOptions";

/**
 * Base interface for flavour implementations
 */
export interface FlavourImpl {
	readonly useScalaJsDomTypes: boolean;
	readonly enableLongApplyMethod: boolean;
	readonly outputPackage: Name;
	readonly versions: Versions;

	/**
	 * Apply flavour-specific transformations to a package tree
	 */
	rewrittenTree(scope: any, tree: PackageTree): PackageTree;

	/**
	 * Get dependencies required by this flavour
	 */
	dependencies(): Set<any>;

	/**
	 * Get type rewrites for this flavour
	 */
	rewrites(): any[];

	/**
	 * String representation of this flavour
	 */
	toString(): string;
}

/**
 * Normal flavour implementation
 */
export class NormalFlavourImpl implements FlavourImpl {
	constructor(
		public readonly useScalaJsDomTypes: boolean,
		public readonly enableLongApplyMethod: boolean,
		public readonly outputPackage: Name,
		public readonly versions: Versions,
	) {}

	rewrittenTree(scope: any, tree: PackageTree): PackageTree {
		// DUMMY IMPLEMENTATION: Return unchanged tree
		return tree;
	}

	dependencies(): Set<any> {
		// DUMMY IMPLEMENTATION: Return empty set
		return new Set();
	}

	rewrites(): any[] {
		// DUMMY IMPLEMENTATION: Return empty array
		return [];
	}

	toString(): string {
		return "NormalFlavour";
	}

	/**
	 * Create a mock NormalFlavourImpl for testing
	 */
	static createMock(): NormalFlavourImpl {
		return new NormalFlavourImpl(
			false, // useScalaJsDomTypes
			false, // enableLongApplyMethod
			new Name("typings"), // outputPackage
			new Versions(Versions.Scala3, Versions.ScalaJs1), // versions
		);
	}
}
