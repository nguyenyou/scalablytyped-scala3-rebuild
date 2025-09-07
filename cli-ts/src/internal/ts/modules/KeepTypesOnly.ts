/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.KeepTypesOnly
 *
 * This module provides functionality to filter TypeScript declarations to keep only
 * type-related declarations, removing value declarations like functions and variables.
 * Classes are transformed to interfaces to preserve only their type information.
 */

import { isNone, isSome, none, type Option, some } from "fp-ts/Option";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import {
	type TsAugmentedModule,
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclEnum,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclNamespace,
	TsDeclVar,
	type TsExport,
	type TsExportee,
	TsExporteeTree,
	type TsIdent,
	TsIdentConstructor,
	type TsMember,
	type TsMemberCtor,
	type TsMemberFunction,
	type TsMemberProperty,
	type TsNamedDecl,
	TsTypeRef,
} from "../trees.js";

/**
 * KeepTypesOnly utility object providing filtering functionality.
 * Equivalent to the Scala object KeepTypesOnly.
 */
export const KeepTypesOnly = {
	/**
	 * Filters a TypeScript container or declaration to keep only type-related elements.
	 * 
	 * @param x The container or declaration to filter
	 * @returns The filtered element, or none if it should be removed
	 */
	apply: (x: TsContainerOrDecl): Option<TsContainerOrDecl> => {
		// Handle exports with Tree exportee
		if (x._tag === "TsExport") {
			const exportDecl = x as TsExport;
			if (exportDecl.exported._tag === "TsExporteeTree") {
				const treeExportee = exportDecl.exported as TsExporteeTree;
				const filteredDecl = KeepTypesOnly.apply(treeExportee.decl);
				
				if (isSome(filteredDecl)) {
					const filtered = filteredDecl.value;
					if (isNamedDecl(filtered)) {
						return some({
							...exportDecl,
							exported: TsExporteeTree.create(filtered),
						} as TsExport);
					} else {
						return some(exportDecl);
					}
				} else {
					return none;
				}
			} else {
				return some(exportDecl);
			}
		}

		// Handle named declarations
		if (isNamedDecl(x)) {
			return KeepTypesOnly.named(x);
		}

		// Handle other cases (non-named declarations)
		return some(x);
	},

	/**
	 * Filters a named TypeScript declaration to keep only type-related elements.
	 * 
	 * @param x The named declaration to filter
	 * @returns The filtered declaration, or none if it should be removed
	 */
	named: (x: TsNamedDecl): Option<TsNamedDecl> => {
		switch (x._tag) {
			// Remove value declarations
			case "TsDeclVar":
			case "TsDeclFunction":
				return none;

			// Transform classes to interfaces
			case "TsDeclClass": {
				const clazz = x as TsDeclClass;
				
				// Filter members to keep only non-static, non-constructor members
				const nonStatics = clazz.members.filter((member): member is TsMember => {
					switch (member._tag) {
						case "TsMemberCtor":
							return false;
						case "TsMemberProperty": {
							const prop = member as TsMemberProperty;
							return !prop.isStatic;
						}
						case "TsMemberFunction": {
							const func = member as TsMemberFunction;
							return !func.isStatic && func.name.value !== "constructor";
						}
						default:
							return true;
					}
				});

				// Create inheritance array from parent and implements
				const parentArray = isSome(clazz.parent) ? IArray.fromArray([clazz.parent.value]) : IArray.Empty;
				const inheritance = parentArray.concat(clazz.implementsInterfaces);

				// Transform class to interface
				const interface_ = TsDeclInterface.create(
					clazz.comments,
					clazz.declared,
					clazz.name,
					clazz.tparams,
					inheritance,
					nonStatics,
					clazz.codePath,
				);

				return some(interface_ as TsNamedDecl);
			}

			// Handle namespace - recursively filter members
			case "TsDeclNamespace": {
				const namespace = x as TsDeclNamespace;
				const filteredMembers = namespace.members.mapNotNoneOption(KeepTypesOnly.apply);

				return some(TsDeclNamespace.create(
					namespace.comments,
					namespace.declared,
					namespace.name,
					filteredMembers,
					namespace.codePath,
					namespace.jsLocation,
				) as TsNamedDecl);
			}

			// Handle augmented module - recursively filter members
			case "TsAugmentedModule": {
				const augModule = x as TsAugmentedModule;
				const filteredMembers = augModule.members.mapNotNoneOption(KeepTypesOnly.apply);

				return some(augModule.withMembers(filteredMembers) as TsNamedDecl);
			}

			// Handle enum - set isValue to false
			case "TsDeclEnum": {
				const enumDecl = x as TsDeclEnum;
				
				return some({
					...enumDecl,
					isValue: false,
				} as TsNamedDecl);
			}

			// Keep other declarations unchanged (interfaces, type aliases, etc.)
			default:
				return some(x);
		}
	},
};

/**
 * Type guard to check if a container or declaration is a named declaration
 */
function isNamedDecl(x: TsContainerOrDecl): x is TsNamedDecl {
	return (
		x._tag === "TsDeclClass" ||
		x._tag === "TsDeclInterface" ||
		x._tag === "TsDeclFunction" ||
		x._tag === "TsDeclVar" ||
		x._tag === "TsDeclTypeAlias" ||
		x._tag === "TsDeclEnum" ||
		x._tag === "TsDeclNamespace" ||
		x._tag === "TsDeclModule" ||
		x._tag === "TsAugmentedModule"
	);
}
