/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.UnionTypesFromKeyOf
 *
 * Converts keyof types to union types by extracting property names from interfaces.
 * This transformation looks for patterns like `keyof MyInterface` and converts them
 * to union types like `"prop1" | "prop2" | "prop3"` based on the interface's properties.
 */

import { IArray } from "../../IArray.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import type {
	TsDeclInterface,
	TsIdent,
	TsLiteral,
	TsMemberProperty,
	TsType,
	TsTypeKeyOf,
	TsTypeLiteral,
	TsTypeRef,
	TsTypeUnion,
} from "../trees.js";
import { TsLiteral as TsLiteralConstructor, TsTypeLiteral as TsTypeLiteralConstructor, TsTypeUnion as TsTypeUnionConstructor } from "../trees.js";

/**
 * UnionTypesFromKeyOf transformation that converts keyof types to union types.
 *
 * This transformation handles the following pattern:
 * - Input: `keyof MyInterface` where MyInterface has properties `name`, `age`, `email`
 * - Output: `"name" | "age" | "email"`
 *
 * The transformation only applies to:
 * 1. keyof expressions with simple type references (no type parameters)
 * 2. Type references that resolve to interfaces (not classes or type aliases)
 * 3. Interfaces that are not abstract in the current scope
 *
 * If the interface has no properties, the original keyof expression is preserved.
 * If the lookup fails or the target is not an interface, the original expression is preserved.
 */
export class UnionTypesFromKeyOf extends TreeTransformationScopedChanges {
	/**
	 * Transforms keyof types to union types when possible.
	 * This is the main entry point for the transformation.
	 */
	override enterTsType(scope: TsTreeScope): (x: TsType) => TsType {
		return (x: TsType) => {
			// Check if this is a keyof type
			if (x._tag !== "TsTypeKeyOf") {
				return x;
			}

			const keyOfType = x as TsTypeKeyOf;
			
			// Check if the key is a simple type reference (no type parameters)
			if (keyOfType.key._tag !== "TsTypeRef") {
				return x;
			}

			const typeRef = keyOfType.key as TsTypeRef;
			
			// Only handle simple type references without type parameters
			if (typeRef.tparams.length > 0) {
				return x;
			}

			// Check if the type is abstract in the current scope
			if (scope.isAbstract(typeRef.name)) {
				return x;
			}

			// Look up the type in the scope
			const lookupResults = scope.lookup(typeRef.name);
			
			if (lookupResults.length === 0) {
				// Log that we couldn't expand the keyof
				scope.logger.info(`Could not expand keyof ${typeRef.name.asString}: not found`);
				return x;
			}

			const firstResult = lookupResults.apply(0);

			// Check if the result is an interface
			if (firstResult._tag !== "TsDeclInterface") {
				// Log that we couldn't expand the keyof
				scope.logger.info(`Could not expand keyof ${typeRef.name.asString}: ${firstResult._tag}`);
				return x;
			}

			const interfaceDecl = firstResult as TsDeclInterface;

			// Extract property names from the interface
			const literals = this.extractPropertyNames(interfaceDecl);

			// If no properties found, preserve the original keyof
			if (literals.length === 0) {
				return x;
			}

			// Create a union type from the property name literals
			return TsTypeUnionConstructor.simplified(literals);
		};
	}

	/**
	 * Extracts property names from an interface and converts them to string literal types.
	 * Only considers TsMemberProperty members with TsIdent names.
	 */
	private extractPropertyNames(interfaceDecl: TsDeclInterface): IArray<TsType> {
		const propertyNames: TsType[] = [];

		for (const member of interfaceDecl.members.toArray()) {
			// Only consider property members
			if (member._tag === "TsMemberProperty") {
				const property = member as TsMemberProperty;

				// Only consider properties with simple identifiers
				if (property.name._tag === "TsIdentSimple") {
					const ident = property.name as TsIdent;
					const stringLiteral = TsLiteralConstructor.str(ident.value);
					const typeLiteral = TsTypeLiteralConstructor.create(stringLiteral);
					propertyNames.push(typeLiteral as TsType);
				}
			}
		}

		return IArray.fromArray(propertyNames);
	}
}

/**
 * Export the transform instance for use in transformation pipelines.
 */
export const UnionTypesFromKeyOfTransform = new UnionTypesFromKeyOf();