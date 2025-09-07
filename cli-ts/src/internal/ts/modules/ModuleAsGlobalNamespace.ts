/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.ModuleAsGlobalNamespace
 *
 * Implement `export namespace as ...`.
 *
 * It's implemented as reexporting the resulting top-level module to avoid split type hierarchies, the other option
 * would be to duplicate all the contents.
 */

import { isNone, none, type Option } from "fp-ts/Option";
import { Comments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import type { CodePath } from "../CodePath.js";
import { JsLocation } from "../JsLocation.js";
import { SetJsLocationTransformFunction } from "../transforms/SetJsLocation.js";
import {
	type TsContainerOrDecl,
	type TsDeclModule,
	TsDeclNamespace,
	type TsExportAsNamespace,
	TsIdent,
	type TsIdentLibrary,
	TsIdentModule,
	type TsNamedDecl,
	type TsParsedFile,
} from "../trees.js";
import { DeriveCopy } from "./DeriveCopy.js";

/**
 * Finds the top-level module that matches the library name.
 *
 * @param libName The library name to search for
 * @param file The parsed file to search in
 * @returns The matching module if found, undefined otherwise
 */
function findTopLevelModule(
	libName: TsIdentLibrary,
	file: TsParsedFile,
): Option<TsDeclModule> {
	const moduleIdent = TsIdentModule.fromLibrary(libName);

	// Try to find the module by iterating through all members
	for (const member of file.members.toArray()) {
		if (member._tag === "TsDeclModule") {
			const module = member as TsDeclModule;
			if (module.name.value === moduleIdent.value) {
				return { _tag: "Some", value: module };
			}
		}
	}

	return none;
}

/**
 * Creates copies of declarations with updated code paths and JavaScript locations.
 *
 * @param codePath The code path for the copies
 * @param decl The declaration to copy
 * @returns Array of copied declarations
 */
function copy(codePath: CodePath, decl: TsNamedDecl): IArray<TsNamedDecl> {
	const derivedCopies = DeriveCopy.apply(decl, codePath, none);
	return derivedCopies.map((copy) => {
		const transformed = SetJsLocationTransformFunction.enterTsDecl(
			JsLocation.zero(),
		)(copy);
		return transformed as TsNamedDecl;
	});
}

/**
 * ModuleAsGlobalNamespace utility object providing the main apply function.
 * Equivalent to the Scala object ModuleAsGlobalNamespace.
 */
export const ModuleAsGlobalNamespace = {
	/**
	 * Apply the module-as-global-namespace transformation to a parsed file.
	 *
	 * Looks for export-as-namespace declarations and creates global namespace wrappers.
	 * If a default export exists, it creates a type alias with the namespace name.
	 * Otherwise, it creates a namespace containing all the module's contents.
	 *
	 * @param libName The name of the current library
	 * @param file The parsed file to transform
	 * @returns The transformed file with global namespace declarations
	 */
	apply: (libName: TsIdentLibrary, file: TsParsedFile): TsParsedFile => {
		const topLevelModuleOpt = findTopLevelModule(libName, file);

		if (isNone(topLevelModuleOpt)) {
			return file;
		}

		const topLevelModule = topLevelModuleOpt.value;
		const globalCp = file.codePath.forceHasPath().add(TsIdent.Global);

		/**
		 * It feels wrong that the `TsExportAsNamespace` may be placed within `topLevelModule`, but it's the result of
		 * [[InferredDefaultModule]].
		 */
		const allMembers = topLevelModule.members.concat(file.members);
		const globals: IArray<TsNamedDecl> = allMembers.flatMap(
			(member: TsContainerOrDecl) => {
				if (member._tag === "TsExportAsNamespace") {
					const exportAsNamespace = member as TsExportAsNamespace;
					const asGlobal = exportAsNamespace.ident;

					// Check if there's a default export in the top-level module
					const defaultMembers = topLevelModule.membersByName.get(
						TsIdent.default(),
					);

					if (defaultMembers && defaultMembers.length > 0) {
						// If default export exists, create type aliases for each default tree
						return defaultMembers.flatMap((tree: TsNamedDecl) => {
							// Create a copy with the new name (asGlobal)
							const renamedTree = tree.withName
								? tree.withName(asGlobal)
								: tree;
							return copy(globalCp, renamedTree);
						});
					} else {
						// No default export, create a namespace containing all module members
						const asNamespace = TsDeclNamespace.create(
							topLevelModule.comments,
							topLevelModule.declared,
							asGlobal,
							topLevelModule.members,
							globalCp,
							JsLocation.zero(),
						);
						return copy(globalCp, asNamespace);
					}
				}

				return IArray.Empty;
			},
		);

		if (globals.isEmpty) {
			return file;
		}

		// Create the global namespace containing all the global declarations
		const globalNamespace = TsDeclNamespace.create(
			Comments.empty(),
			false, // declared = false
			TsIdent.Global,
			globals.map((g) => g as TsContainerOrDecl),
			globalCp,
			JsLocation.zero(),
		);

		// Prepend the global namespace to the file members
		const newMembers = IArray.fromArray([
			globalNamespace as TsContainerOrDecl,
		]).concat(file.members);
		return file.withMembers(newMembers) as TsParsedFile;
	},
};
