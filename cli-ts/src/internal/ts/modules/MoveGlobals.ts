/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.MoveGlobals
 *
 * Move globals into their own namespace:
 *
 * given a file like this:
 * ```typescript
 * declare class Foo(){};
 * declare const foo: Foo;
 * declare module "bar" {
 *   class Bar extends Foo {}
 * }
 * ```
 *
 * We keep types at the top-level, but move all the values inside a faux `global`.
 *
 * ```typescript
 * declare interface Foo {};
 * declare namespace <global> {
 *   class Foo implements <outer>.Foo()
 *   const foo: <outer>.Foo
 * }
 * declare module "bar" {
 *   class Bar implements <outer>.Foo {}
 * }
 * ```
 */

import { none } from "fp-ts/Option";
import { Comments } from "../../Comments.js";
import { type IArray, partialFunction } from "../../IArray.js";
import { FlattenTrees } from "../FlattenTrees.js";
import { JsLocation } from "../JsLocation.js";
import {
	type TsContainerOrDecl,
	type TsDeclModuleLike,
	TsDeclNamespace,
	TsIdentGlobal,
	type TsNamedValueDecl,
	type TsParsedFile,
} from "../trees.js";
import { DeriveCopy } from "./DeriveCopy.js";
import { KeepTypesOnly } from "./KeepTypesOnly.js";

/**
 * MoveGlobals utility object providing the main apply function.
 * Equivalent to the Scala object MoveGlobals.
 */
export const MoveGlobals = {
	/**
	 * Moves global declarations into their own namespace.
	 *
	 * @param file The parsed TypeScript file to transform
	 * @returns The transformed file with globals moved to a namespace
	 */
	apply: (file: TsParsedFile): TsParsedFile => {
		// Partition members into globals, modules, named value declarations, and rest
		const [globals, modules, named, rest] = file.members.partitionCollect3(
			// Collect existing global namespaces
			partialFunction(
				(x: TsContainerOrDecl): x is TsDeclNamespace =>
					x._tag === "TsDeclNamespace" &&
					(x as TsDeclNamespace).name.value === TsIdentGlobal.value,
				(x: TsContainerOrDecl) => x as TsDeclNamespace,
			),
			// Collect module-like declarations
			partialFunction(
				(x: TsContainerOrDecl): x is TsDeclModuleLike =>
					x._tag === "TsDeclModule" || x._tag === "TsAugmentedModule",
				(x: TsContainerOrDecl) => x as TsDeclModuleLike,
			),
			// Collect named value declarations
			partialFunction(
				(x: TsContainerOrDecl): x is TsNamedValueDecl =>
					x._tag === "TsDeclClass" ||
					x._tag === "TsDeclEnum" ||
					x._tag === "TsDeclFunction" ||
					x._tag === "TsDeclVar",
				(x: TsContainerOrDecl) => x as TsNamedValueDecl,
			),
		);

		// Create global code path
		const globalCp = file.codePath.forceHasPath().add(TsIdentGlobal);

		// Keep type-only versions at top level
		const keepToplevel = named.mapNotNoneOption((m) => KeepTypesOnly.apply(m));

		// Create copies for global namespace
		const globalMembers = named.flatMap((x) =>
			DeriveCopy.apply(x, globalCp, none),
		);

		// If no global members, return original file
		if (globalMembers.isEmpty) {
			return file;
		}

		// Create or merge global namespace
		const global = globals.foldLeft(
			TsDeclNamespace.create(
				Comments.empty(),
				false, // declared = false
				TsIdentGlobal,
				globalMembers.map((m) => m as TsContainerOrDecl),
				globalCp,
				JsLocation.zero(),
			),
			(one: TsDeclNamespace, two: TsDeclNamespace) => {
				return FlattenTrees.mergeNamespaces(one, two);
			},
		);

		// Return file with new members: modules + rest + keepToplevel + global
		return file.withMembers(
			modules
				.concat(rest as IArray<TsContainerOrDecl>)
				.concat(keepToplevel)
				.append(global as TsContainerOrDecl),
		) as TsParsedFile;
	},
};
