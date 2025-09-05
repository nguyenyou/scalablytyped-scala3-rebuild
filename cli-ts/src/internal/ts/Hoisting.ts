/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.Hoisting
 *
 * Provides functionality for hoisting TypeScript members from types to declarations.
 * This module extracts callable and property members from TypeScript types and converts
 * them into standalone function and variable declarations.
 */

import { none, type Option, some } from "fp-ts/Option";
import { IArray } from "../IArray.js";
import { AllMembersFor } from "./AllMembersFor.js";
import type { CodePath } from "./CodePath.js";
import { JsLocation } from "./JsLocation.js";
import type { LoopDetector, TsTreeScope } from "./TsTreeScope.js";
import {
	TsDeclFunction,
	TsDeclVar,
	TsIdentApply,
	type TsMember,
	type TsMemberCall,
	type TsMemberFunction,
	type TsMemberProperty,
	type TsNamedValueDecl,
	type TsType,
	type TsTypeObject,
	type TsTypeRef,
} from "./trees.js";

/**
 * Main Hoisting functionality for extracting members from TypeScript types
 */
export const Hoisting = {
	/**
	 * Constant indicating whether declarations are ambient (declared)
	 * Corresponds to Hoisting.declared in the original Scala code
	 */
	declared: false,

	/**
	 * Extracts named value declarations from a TypeScript type.
	 * Handles different type variants with appropriate member extraction logic.
	 *
	 * @param scope - The TypeScript tree scope for type resolution
	 * @param ownerCp - Code path of the owner/container
	 * @param ownerLoc - JavaScript location of the owner
	 * @param ld - Loop detector to prevent infinite recursion
	 * @param tpe - The TypeScript type to extract members from
	 * @returns Array of named value declarations extracted from the type
	 */
	fromType: (
		scope: TsTreeScope,
		ownerCp: CodePath,
		ownerLoc: JsLocation,
		ld: LoopDetector,
		tpe: TsType,
	): IArray<TsNamedValueDecl> => {
		switch (tpe._tag) {
			case "TsTypeRef":
				return Hoisting.fromRef(scope, ownerCp, ownerLoc, ld, tpe as TsTypeRef);

			case "TsTypeObject": {
				const typeObject = tpe as TsTypeObject;
				return typeObject.members.mapNotNoneOption(
					Hoisting.memberToDecl(ownerCp, ownerLoc),
				);
			}

			default:
				return IArray.Empty;
		}
	},

	/**
	 * Extracts named value declarations from a TypeScript type reference.
	 * Uses AllMembersFor to resolve the type reference and extract its members.
	 *
	 * @param scope - The TypeScript tree scope for type resolution
	 * @param ownerCp - Code path of the owner/container
	 * @param ownerLoc - JavaScript location of the owner
	 * @param ld - Loop detector to prevent infinite recursion
	 * @param typeRef - The TypeScript type reference to extract members from
	 * @returns Array of named value declarations extracted from the type reference
	 */
	fromRef: (
		scope: TsTreeScope,
		ownerCp: CodePath,
		ownerLoc: JsLocation,
		ld: LoopDetector,
		typeRef: TsTypeRef,
	): IArray<TsNamedValueDecl> => {
		const members = AllMembersFor.apply(scope, ld)(typeRef);
		return members.mapNotNoneOption(Hoisting.memberToDecl(ownerCp, ownerLoc));
	},

	/**
	 * Converts a TypeScript member to a named value declaration if possible.
	 * Handles call signatures, normal methods, and properties.
	 * Returns None for unsupported member types (getters, setters, etc.).
	 *
	 * @param ownerCp - Code path of the owner/container
	 * @param ownerLoc - JavaScript location of the owner
	 * @returns Function that converts TsMember to Option<TsNamedValueDecl>
	 */
	memberToDecl: (ownerCp: CodePath, ownerLoc: JsLocation) => {
		return (member: TsMember): Option<TsNamedValueDecl> => {
			switch (member._tag) {
				case "TsMemberCall": {
					const memberCall = member as TsMemberCall;
					return some(
						TsDeclFunction.create(
							memberCall.comments,
							Hoisting.declared,
							TsIdentApply, // TsIdent.Apply equivalent
							memberCall.signature,
							JsLocation.add(ownerLoc, TsIdentApply),
							ownerCp.add(TsIdentApply),
						),
					);
				}

				case "TsMemberFunction": {
					const memberFunction = member as TsMemberFunction;
					// Only handle Normal method types, skip getters and setters
					if (memberFunction.methodType._tag === "Normal") {
						return some(
							TsDeclFunction.create(
								memberFunction.comments,
								Hoisting.declared,
								memberFunction.name,
								memberFunction.signature,
								JsLocation.add(ownerLoc, memberFunction.name),
								ownerCp.add(memberFunction.name),
							),
						);
					}
					return none;
				}

				case "TsMemberProperty": {
					const memberProperty = member as TsMemberProperty;
					return some(
						TsDeclVar.create(
							memberProperty.comments,
							Hoisting.declared,
							memberProperty.isReadOnly,
							memberProperty.name,
							memberProperty.tpe,
							memberProperty.expr,
							JsLocation.add(ownerLoc, memberProperty.name),
							ownerCp.add(memberProperty.name),
						),
					);
				}

				default:
					return none;
			}
		};
	},
};
