/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.DeriveCopy
 *
 * This module provides functionality to derive copies of TypeScript declarations
 * with updated code paths and optional renaming. It handles various declaration types
 * including classes, interfaces, modules, and augmented modules.
 */

import { isNone, isSome, none, type Option, some } from "fp-ts/Option";
import { ExpandedClass } from "@/internal/Comment.js";
import { Comments, NoComments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { type CodePath, type CodePathHasPath, CodePath as CodePathUtils } from "../CodePath.js";
import { JsLocation } from "../JsLocation.js";
import { SetCodePathTransformFunction } from "../transforms/SetCodePath.js";
import {
	type TsAugmentedModule,
	type TsContainer,
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclModule,
	TsDeclTypeAlias,
	TsDeclVar,
	TsGlobal,
	type TsIdent,
	TsIdentConstructor,
	type TsIdentSimple,
	type TsMember,
	type TsMemberCtor,
	type TsMemberFunction,
	type TsMemberProperty,
	type TsNamedDecl,
	TsQIdent,
	type TsType,
	TsTypeParam,
	TsTypeRef,
} from "../trees.js";

/**
 * DeriveCopy utility object providing the main apply function.
 * Equivalent to the Scala object DeriveCopy.
 */
export const DeriveCopy = {
	/**
	 * Derives a copy of a TypeScript declaration with updated code path and optional renaming.
	 *
	 * @param x The declaration to copy
	 * @param ownerCp The owner's code path
	 * @param _rename Optional new name for the declaration
	 * @returns Array of derived declarations
	 */
	apply: (
		x: TsNamedDecl,
		ownerCp: CodePath,
		_rename: Option<TsIdentSimple>,
	): IArray<TsNamedDecl> => {
		// Filter out rename if it's the same as the original name
		const rename = isSome(_rename) && x.name.value !== _rename.value.value
			? _rename
			: none;

		// Helper function to get the origin code path
		const getOrigin = (): TsQIdent => {
			const hasPath = x.codePath.forceHasPath();
			return hasPath.codePath;
		};

		// Helper function to determine code path for a given name
		const codePathFor = (name: TsIdent): CodePath => {
			if (CodePathUtils.isNoPath(ownerCp)) {
				return x.codePath;
			} else {
				const hasPath = ownerCp as CodePathHasPath;
				return hasPath.add(name);
			}
		};

		// Pattern matching equivalent for the main logic
		return matchDeclaration(x, rename, ownerCp, getOrigin, codePathFor);
	},
};

/**
 * Pattern matching function that handles different declaration types.
 * This replaces the complex pattern matching in the Scala version.
 */
function matchDeclaration(
	x: TsNamedDecl,
	rename: Option<TsIdentSimple>,
	ownerCp: CodePath,
	getOrigin: () => TsQIdent,
	codePathFor: (name: TsIdent) => CodePath,
): IArray<TsNamedDecl> {
	// First check: path matching optimization
	if (
		CodePathUtils.isHasPath(x.codePath) &&
		CodePathUtils.isHasPath(ownerCp) &&
		isNone(rename)
	) {
		const xCp = x.codePath;
		const ownerCpHasPath = ownerCp;

		if (
			xCp.codePath.parts.length === ownerCpHasPath.codePath.parts.length + 1 &&
			xCp.codePath.parts.toArray().slice(0, ownerCpHasPath.codePath.parts.length)
				.every((part, i) => part.value === ownerCpHasPath.codePath.parts.get(i).value)
		) {
			return IArray.fromArray([x]);
		}
	}

	// Handle TsDeclModule
	if (x._tag === "TsDeclModule") {
		const module = x as TsDeclModule;
		if (isSome(rename)) {
			return IArray.fromArray([
				updatedContainer(ownerCp, module.withName(rename.value))
			]);
		} else {
			return IArray.fromArray([updatedContainer(ownerCp, module)]);
		}
	}

	// Handle TsAugmentedModule
	if (x._tag === "TsAugmentedModule") {
		const augModule = x as TsAugmentedModule;
		if (isNone(rename)) {
			return IArray.fromArray([updatedContainer(ownerCp, augModule)]);
		} else {
			return IArray.Empty;
		}
	}

	// Handle other named declarations with TsIdentSimple names
	if (x.name._tag === "TsIdentSimple") {
		const origName = x.name as TsIdentSimple;
		const name = isSome(rename) ? rename.value : origName;

		return handleNamedDeclaration(x, name, getOrigin, codePathFor);
	}

	// Default case - return empty
	return IArray.Empty;
}

/**
 * Handles named declarations (classes, interfaces, functions, etc.)
 * This corresponds to the pattern matching for TsIdentSimple in the Scala version.
 */
function handleNamedDeclaration(
	x: TsNamedDecl,
	name: TsIdentSimple,
	getOrigin: () => TsQIdent,
	codePathFor: (name: TsIdent) => CodePath,
): IArray<TsNamedDecl> {
	switch (x._tag) {
		case "TsDeclClass": {
			const clazz = x as TsDeclClass;

			// Check if this is a synthetic expanded class
			if (clazz.comments.cs.some(c => c instanceof ExpandedClass)) {
				return IArray.Empty;
			}

			// Filter members to keep only constructors and static members
			const filteredMembers = clazz.members.filter((member): member is TsMember => {
				switch (member._tag) {
					case "TsMemberCtor":
						return true;
					case "TsMemberFunction": {
						const func = member as TsMemberFunction;
						// Keep constructor functions or static functions
						return func.name.value === "constructor" || func.isStatic;
					}
					case "TsMemberProperty": {
						const prop = member as TsMemberProperty;
						return prop.isStatic;
					}
					default:
						return false;
				}
			});

			const origin = getOrigin();
			const typeArgs = TsTypeParam.asTypeArgs(clazz.tparams);
			const typeArgsAsTypes = typeArgs.map(ref => ref as TsType);
			const newClass = TsDeclClass.create(
				clazz.comments,
				true, // declared = true
				clazz.isAbstract,
				name,
				clazz.tparams,
				some(TsTypeRef.create(Comments.empty(), origin, typeArgsAsTypes)),
				IArray.Empty, // implements = Empty
				filteredMembers,
				clazz.jsLocation,
				codePathFor(name),
			);

			return IArray.fromArray([newClass as TsNamedDecl]);
		}

		case "TsDeclInterface": {
			const interface_ = x as TsDeclInterface;
			const origin = getOrigin();
			const typeArgs = TsTypeParam.asTypeArgs(interface_.tparams);
			const typeArgsAsTypes = typeArgs.map(ref => ref as TsType);

			const typeAlias = TsDeclTypeAlias.create(
				interface_.comments,
				interface_.declared,
				name,
				interface_.tparams,
				TsTypeRef.create(Comments.empty(), origin, typeArgsAsTypes),
				codePathFor(name),
			);

			return IArray.fromArray([typeAlias as TsNamedDecl]);
		}

		case "TsDeclFunction": {
			const func = x as TsDeclFunction;
			const newFunc = TsDeclFunction.create(
				func.comments,
				func.declared,
				name,
				func.signature,
				func.jsLocation,
				codePathFor(name),
			);

			return IArray.fromArray([newFunc as TsNamedDecl]);
		}

		case "TsDeclVar": {
			const variable = x as TsDeclVar;
			const newVar = TsDeclVar.create(
				variable.comments,
				variable.declared,
				variable.readOnly,
				name,
				variable.tpe,
				variable.expr,
				variable.jsLocation,
				codePathFor(name),
			);

			return IArray.fromArray([newVar as TsNamedDecl]);
		}

		case "TsDeclTypeAlias": {
			const alias = x as TsDeclTypeAlias;
			const newAlias = TsDeclTypeAlias.create(
				alias.comments,
				alias.declared,
				name,
				alias.tparams,
				alias.alias,
				codePathFor(name),
			);

			return IArray.fromArray([newAlias as TsNamedDecl]);
		}

		default:
			return IArray.Empty;
	}
}

/**
 * Updates a container with new members and code path.
 * This corresponds to the updatedContainer function in the Scala version.
 */
function updatedContainer(
	ownerCp: CodePath,
	x: TsContainer & TsNamedDecl,
): TsNamedDecl {
	// Helper function to recursively process container members
	function go(tree: TsContainerOrDecl): IArray<TsContainerOrDecl> {
		if (isNamedDecl(tree)) {
			// Apply DeriveCopy recursively to named declarations
			const derivedDecls = DeriveCopy.apply(tree, x.codePath, none);
			return derivedDecls.map(decl => decl as TsContainerOrDecl);
		} else if (tree._tag === "TsGlobal") {
			const global = tree as TsGlobal;
			const newMembers = global.members.flatMap(go);
			return IArray.fromArray([
				TsGlobal.create(
					global.comments,
					global.declared,
					newMembers,
					global.codePath,
				) as TsContainerOrDecl,
			]);
		} else {
			return IArray.fromArray([tree]);
		}
	}

	// Convert nested members with old codePath, then recursively update it afterwards
	const newMembers: IArray<TsContainerOrDecl> = x.members.flatMap(go);

	// Update the container with new members
	const updatedContainer = x.withMembers(newMembers);

	// Apply SetCodePath if we have a HasPath
	if (CodePathUtils.isHasPath(ownerCp)) {
		const hasPath = ownerCp as CodePathHasPath;
		return SetCodePathTransformFunction.enterTsDecl(hasPath)(updatedContainer as any) as TsNamedDecl;
	} else {
		return updatedContainer as unknown as TsNamedDecl;
	}
}

/**
 * Type guard to check if a tree is a named declaration
 */
function isNamedDecl(tree: TsContainerOrDecl): tree is TsNamedDecl {
	return (
		tree._tag === "TsDeclClass" ||
		tree._tag === "TsDeclInterface" ||
		tree._tag === "TsDeclFunction" ||
		tree._tag === "TsDeclVar" ||
		tree._tag === "TsDeclTypeAlias" ||
		tree._tag === "TsDeclEnum" ||
		tree._tag === "TsDeclModule" ||
		tree._tag === "TsDeclNamespace"
	);
}