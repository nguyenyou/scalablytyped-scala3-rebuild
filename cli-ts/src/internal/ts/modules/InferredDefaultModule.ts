/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.InferredDefaultModule
 *
 * Infers default module declarations for TypeScript files that should be wrapped in a module.
 * This transformation is used when a file contains declarations that should be grouped under
 * a specific module name.
 */

import { Comments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import type { Logger } from "../../logging/index.js";
import { CodePath } from "../CodePath.js";
import { JsLocation } from "../JsLocation.js";
import { ModuleSpec } from "../ModuleSpec.js";
import {
	type TsContainerOrDecl,
	TsDeclModule,
	type TsIdentModule,
	type TsParsedFile,
} from "../trees.js";

/**
 * Checks if a parsed file contains only "augment" types of declarations.
 * Augment types are: TsImport, TsAugmentedModule, TsDeclModule, TsDeclTypeAlias, TsDeclInterface
 *
 * @param file The parsed file to check
 * @returns True if the file contains only augment declarations
 */
function onlyAugments(file: TsParsedFile): boolean {
	return file.members.toArray().every((member: TsContainerOrDecl) => {
		switch (member._tag) {
			case "TsImport":
			case "TsAugmentedModule":
			case "TsDeclModule":
			case "TsDeclTypeAlias":
			case "TsDeclInterface":
				return true;
			default:
				return false;
		}
	});
}

/**
 * Checks if a module with the given name already exists in the file.
 *
 * @param file The parsed file to check
 * @param moduleName The module name to look for
 * @returns True if a module with the given name already exists
 */
function alreadyExists(file: TsParsedFile, moduleName: TsIdentModule): boolean {
	return file.members.toArray().some((member: TsContainerOrDecl) => {
		if (member._tag === "TsDeclModule") {
			const module = member as TsDeclModule;
			return module.name.value === moduleName.value;
		}
		return false;
	});
}

/**
 * InferredDefaultModule utility object providing the main apply function.
 * Equivalent to the Scala object InferredDefaultModule.
 */
export const InferredDefaultModule = {
	/**
	 * Checks if a parsed file contains only "augment" types of declarations.
	 */
	onlyAugments,

	/**
	 * Checks if a module with the given name already exists in the file.
	 */
	alreadyExists,

	/**
	 * Apply the inferred default module transformation to a parsed file.
	 *
	 * Creates a module wrapper around the file's contents if:
	 * 1. The file is a module (contains imports/exports)
	 * 2. The file doesn't contain only augment declarations
	 * 3. A module with the given name doesn't already exist
	 *
	 * @param file The parsed file to transform
	 * @param moduleName The name for the inferred module
	 * @param logger Logger for reporting the transformation
	 * @returns The transformed parsed file
	 */
	apply: (
		file: TsParsedFile,
		moduleName: TsIdentModule,
		logger: Logger<void>,
	): TsParsedFile => {
		// Check if we should create an inferred module
		const shouldCreateModule =
			file.isModule && !onlyAugments(file) && !alreadyExists(file, moduleName);

		if (shouldCreateModule) {
			// Create the inferred module containing all file members
			const module = TsDeclModule.create(
				Comments.empty(),
				true, // declared
				moduleName,
				file.members,
				CodePath.noPath(),
				JsLocation.module(moduleName, ModuleSpec.defaulted()),
				IArray.Empty, // augmentedModules
			);

			logger.info(`Inferred module ${moduleName.value}`);

			// Return a new file with just the module
			return file.withMembers(
				IArray.fromArray([module] as TsContainerOrDecl[]),
			) as TsParsedFile;
		}

		// Return the original file unchanged
		return file;
	},
};
