/**
 * Transform that inlines constant enum member references.
 *
 * This transform converts type references to const enum members into their literal types.
 * For example, `MyEnum.VALUE` where `MyEnum` is a const enum with `VALUE = "hello"`
 * would be inlined to the string literal type `"hello"`.
 *
 * Port of org.scalablytyped.converter.internal.ts.transforms.InlineConstEnum
 */

import type { IArray } from "@/internal/IArray.js";
import { TreeTransformationScopedChanges } from "@/internal/ts/TreeTransformations.js";
import type { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import type {
	TsDeclEnum,
	TsEnumMember,
	TsQIdent,
	TsType,
	TsTypeRef,
} from "@/internal/ts/trees.js";
import { TsExpr } from "@/internal/ts/trees.js";

/**
 * Transform that inlines constant enum member references to their literal types.
 */
export class InlineConstEnum extends TreeTransformationScopedChanges {
	/**
	 * Singleton instance for reuse.
	 */
	static readonly instance = new InlineConstEnum();

	/**
	 * Process type references and inline const enum members.
	 */
	enterTsType(scope: TsTreeScope): (x: TsType) => TsType {
		return (x: TsType) => {
			if (x._tag === "TsTypeRef") {
				const typeRef = x as TsTypeRef;

				// Check if this is a type reference with no type arguments
				if (typeRef.tparams.length === 0 && typeRef.name._tag === "TsQIdent") {
					const qident = typeRef.name as TsQIdent;
					const parts = qident.parts;

					// Need at least 3 parts: libName + enumName + memberName
					if (parts.length >= 3) {
						const inlinedEnumMember = this.tryInlineEnumMember(scope, parts);
						if (inlinedEnumMember !== undefined) {
							return inlinedEnumMember;
						}
					}
				}
			}

			return x;
		};
	}

	/**
	 * Attempts to inline a const enum member reference.
	 *
	 * @param scope The current tree scope for lookups
	 * @param parts The qualified identifier parts (libName + enumName + memberName)
	 * @returns The inlined type if successful, undefined otherwise
	 */
	private tryInlineEnumMember(
		scope: TsTreeScope,
		parts: IArray<any>,
	): TsType | undefined {
		// Get the enum name (all parts except the last one)
		const enumParts = parts.init;
		const memberName = parts.last;

		if (enumParts.length === 0 || memberName === undefined) {
			return undefined;
		}

		// Create qualified identifier for the enum
		const enumQIdent: TsQIdent = {
			_tag: "TsQIdent",
			parts: enumParts,
			asString: `TsQIdent(${enumParts
				.toArray()
				.map((p) => p.value || String(p))
				.join(".")})`,
		};

		// Look up the enum declaration
		const enumDeclarations = scope.lookupType(enumQIdent, true); // skipValidation = true

		// Find the first const enum that contains the requested member
		for (const enumDecl of enumDeclarations.toArray()) {
			if (enumDecl._tag === "TsDeclEnum") {
				const declEnum = enumDecl as TsDeclEnum;

				// Only process const enums
				if (declEnum.isConst) {
					const member = this.findEnumMember(declEnum, memberName);
					if (member !== undefined) {
						const inlinedType = TsExpr.typeOfOpt(member.expr);

						// Log the inlining operation
						const originalTypeStr = this.formatTypeRef(parts);
						const inlinedTypeStr = this.formatType(inlinedType);
						scope.logger.info(
							`Inlining const enum type ${originalTypeStr} => ${inlinedTypeStr}`,
						);

						return inlinedType;
					}
				}
			}
		}

		return undefined;
	}

	/**
	 * Finds an enum member by name.
	 */
	private findEnumMember(
		enumDecl: TsDeclEnum,
		memberName: any,
	): TsEnumMember | undefined {
		for (const member of enumDecl.members.toArray()) {
			if (member._tag === "TsEnumMember") {
				const enumMember = member as TsEnumMember;
				// Compare the member name
				if (this.identEquals(enumMember.name, memberName)) {
					return enumMember;
				}
			}
		}
		return undefined;
	}

	/**
	 * Checks if two identifiers are equal.
	 */
	private identEquals(ident1: any, ident2: any): boolean {
		// Handle TsIdentSimple case
		if (ident1._tag === "TsIdentSimple" && ident2._tag === "TsIdentSimple") {
			return ident1.value === ident2.value;
		}

		// Handle string comparison (for test cases)
		if (typeof ident1 === "string" && typeof ident2 === "string") {
			return ident1 === ident2;
		}

		// Handle mixed cases
		if (ident1._tag === "TsIdentSimple" && typeof ident2 === "string") {
			return ident1.value === ident2;
		}

		if (typeof ident1 === "string" && ident2._tag === "TsIdentSimple") {
			return ident1 === ident2.value;
		}

		return false;
	}

	/**
	 * Formats a type reference for logging.
	 */
	private formatTypeRef(parts: IArray<any>): string {
		return parts
			.toArray()
			.map((part) => {
				if (typeof part === "string") {
					return part;
				}
				if (part._tag === "TsIdentSimple") {
					return part.value;
				}
				return String(part);
			})
			.join(".");
	}

	/**
	 * Formats a type for logging.
	 */
	private formatType(type: TsType): string {
		// Simple formatting for common types
		switch (type._tag) {
			case "TsTypeLiteral": {
				const literal = (type as any).literal;
				if (literal._tag === "TsLiteralStr") {
					return `"${literal.value}"`;
				}
				if (literal._tag === "TsLiteralNum") {
					return literal.value;
				}
				if (literal._tag === "TsLiteralBool") {
					return String(literal.value);
				}
				return String(literal.value);
			}
			case "TsTypeRef":
				return (type as any).name.parts?.join?.(".") || "unknown";
			default:
				return type._tag || "unknown";
		}
	}
}

/**
 * Static transform function for functional usage.
 */
export const InlineConstEnumTransform = {
	/**
	 * Transform function that can be used directly.
	 */
	enterTsType:
		(scope: TsTreeScope) =>
		(x: TsType): TsType => {
			return InlineConstEnum.instance.enterTsType(scope)(x);
		},
};
