/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.TypeAliasIntersection
 *
 * This transformation converts type aliases with intersection types into interfaces
 * when the intersection contains only legal inheritance types (type references and object types).
 * This helps simplify complex type relationships and improves TypeScript's type resolution.
 */

import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import type {
	TsDecl,
	TsDeclInterface,
	TsDeclTypeAlias,
	TsType,
	TsTypeFunction,
	TsTypeIntersect,
	TsTypeObject,
	TsTypeRef,
} from "../trees.js";
import { TsDeclInterface as TsDeclInterfaceConstructor, TsType as TsTypeUtils } from "../trees.js";
import { FollowAliases } from "../FollowAliases.js";
import type { IArray } from "../../IArray.js";
import { IArray as IArrayConstructor, partialFunction, type PartialFunction } from "../../IArray.js";

/**
 * TypeAliasIntersection transformation.
 * 
 * Converts type aliases with intersection types into interfaces when possible.
 * This transformation looks for type aliases of the form:
 * 
 * ```typescript
 * type MyAlias = TypeA & TypeB & { prop: string }
 * ```
 * 
 * And converts them to:
 * 
 * ```typescript
 * interface MyAlias extends TypeA, TypeB {
 *   prop: string;
 * }
 * ```
 * 
 * This only happens when all types in the intersection are "legal inheritance" types:
 * - Type references (to interfaces, classes, etc.)
 * - Object types (that are not type mappings)
 * - Function types
 * 
 * The transformation helps simplify complex type relationships and makes them
 * more compatible with Scala's inheritance model.
 */
export class TypeAliasIntersection extends TreeTransformationScopedChanges {
	/**
	 * Singleton instance for convenient usage
	 */
	static readonly instance = new TypeAliasIntersection();

	/**
	 * Process type declarations, converting intersection type aliases to interfaces
	 */
	override enterTsDecl(scope: TsTreeScope): (x: TsDecl) => TsDecl {
		return (x: TsDecl) => {
			if (x._tag === "TsDeclTypeAlias") {
				const typeAlias = x as TsDeclTypeAlias;
				
				// Only process type aliases with intersection types
				if (typeAlias.alias._tag === "TsTypeIntersect") {
					const intersectionType = typeAlias.alias as TsTypeIntersect;
					
					// Use partitionCollect2 to separate the intersection types
					const typeRefPF = this.createTypeRefPartialFunction(scope);
					const objectTypePF = this.createObjectTypePartialFunction();
					
					const [inheritance, objects, rest] = intersectionType.types.partitionCollect2(
						typeRefPF,
						objectTypePF
					);

					// Only convert to interface if there are no remaining types (all types were legal)
					if (rest.length === 0) {
						// Flatten all members from object types
						const allMembers = objects.flatMap((obj) => (obj as TsTypeObject).members);

						// Create interface with inheritance and flattened members
						return TsDeclInterfaceConstructor.create(
							typeAlias.comments,
							typeAlias.declared,
							typeAlias.name,
							typeAlias.tparams,
							inheritance as IArray<TsTypeRef>,
							allMembers,
							typeAlias.codePath
						);
					}
				}
			}
			
			return x;
		};
	}

	/**
	 * Creates a partial function for extracting legal type references from intersection types.
	 * A type reference is legal if:
	 * - It's not abstract in the current scope
	 * - Following aliases leads to a legal inheritance type
	 */
	private createTypeRefPartialFunction(scope: TsTreeScope): PartialFunction<TsType, TsTypeRef> {
		return partialFunction<TsType, TsTypeRef>(
			// Predicate: check if this is a legal type reference
			(tpe: TsType): boolean => {
				if (tpe._tag === "TsTypeRef") {
					const typeRef = tpe as TsTypeRef;
					// Check if not abstract and legal inheritance after following aliases
					return !scope.isAbstract(typeRef.name) && 
						   this.legalInheritance(FollowAliases.apply(scope)(typeRef));
				}
				return false;
			},
			// Transformer: extract the type reference
			(tpe: TsType): TsTypeRef => tpe as TsTypeRef
		);
	}

	/**
	 * Creates a partial function for extracting legal object types from intersection types.
	 * An object type is legal if it's not a type mapping.
	 */
	private createObjectTypePartialFunction(): PartialFunction<TsType, TsTypeObject> {
		return partialFunction<TsType, TsTypeObject>(
			// Predicate: check if this is a legal object type
			(tpe: TsType): boolean => {
				if (tpe._tag === "TsTypeObject") {
					const objectType = tpe as TsTypeObject;
					return this.legalInheritance(objectType);
				}
				return false;
			},
			// Transformer: extract the object type
			(tpe: TsType): TsTypeObject => tpe as TsTypeObject
		);
	}

	/**
	 * Determines if a type represents legal inheritance.
	 * Legal inheritance types are:
	 * - Type references (to interfaces, classes, etc.)
	 * - Object types that are not type mappings
	 * - Function types (but these are not handled in partitionCollect2)
	 *
	 * Note: This method is used for checking if types can be inherited from,
	 * but the actual transformation only handles TsTypeRef and TsTypeObject
	 * in the partitionCollect2 call. Function types, while legal inheritance,
	 * are not captured by either partial function and thus prevent conversion.
	 *
	 * @param tpe The type to check
	 * @returns true if the type can be legally inherited from
	 */
	private legalInheritance(tpe: TsType): boolean {
		switch (tpe._tag) {
			case "TsTypeRef":
				// Type references are always legal inheritance
				return true;

			case "TsTypeObject": {
				const objectType = tpe as TsTypeObject;
				// Object types are legal unless they are type mappings
				return !TsTypeUtils.isTypeMapping(objectType.members);
			}

			case "TsTypeFunction":
				// Function types are legal inheritance but not handled in transformation
				return true;

			default:
				// All other types (unions, intersections, literals, etc.) are not legal inheritance
				return false;
		}
	}
}

/**
 * Singleton instance for convenient usage
 */
export const TypeAliasIntersectionInstance = TypeAliasIntersection.instance;
