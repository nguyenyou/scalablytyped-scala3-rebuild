/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.SimplifyParents
 *
 * There is this weird pattern:
 *
 * ```typescript
 * type Constructor<T> = new(...args: any[]) => T;
 * declare const TextBase: Constructor<NativeMethodsMixin> & typeof TextComponent;
 * export class Text extends TextBase {}
 * ```
 *
 * We'll deal with it more properly later if we have to, for now simplify and make stuff compile at least
 */

import { none, some } from "fp-ts/Option";
import { Comments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import type {
	TsDeclClass,
	TsDeclInterface,
	TsDeclVar,
	TsQIdent,
	TsType,
	TsTypeIntersect,
	TsTypeQuery,
	TsTypeRef,
} from "../trees.js";

/**
 * Helper function to create a proper TsTypeRef object with all required methods
 */
function createTsTypeRef(
	name: TsQIdent,
	tparams: IArray<TsType> = IArray.Empty,
	comments: Comments = Comments.empty(),
): TsTypeRef {
	return {
		_tag: "TsTypeRef",
		asString: `TsTypeRef(${name.asString})`,
		comments,
		name,
		tparams,
		withComments: (cs: Comments) => createTsTypeRef(name, tparams, cs),
		addComment: (c: any) => createTsTypeRef(name, tparams, comments.add(c)),
	};
}

/**
 * SimplifyParents transformation that simplifies complex inheritance patterns.
 *
 * This transformation handles several problematic TypeScript inheritance patterns:
 *
 * 1. **Variable-based inheritance**: When a class extends a variable that contains a type
 * 2. **Intersection types**: When inheritance involves intersection types (A & B & C)
 * 3. **Type queries**: When inheritance uses typeof expressions
 * 4. **Complex constructor patterns**: Constructor<T> & typeof Component patterns
 *
 * The transformation simplifies these patterns by:
 * - Looking up variable declarations and extracting their types
 * - Flattening intersection types into multiple parent references
 * - Resolving typeof expressions to their underlying classes
 * - Dropping overly complex patterns that can't be simplified
 */
export class SimplifyParents extends TreeTransformationScopedChanges {
	/**
	 * Simplifies inheritance for class declarations.
	 * Combines parent and implements into a single list, then redistributes them.
	 */
	override enterTsDeclClass(
		scope: TsTreeScope,
	): (x: TsDeclClass) => TsDeclClass {
		return (x: TsDeclClass) => {
			// Combine parent and implements into a single array for processing
			const parentArray = x.parent._tag === "Some" ? [x.parent.value] : [];
			const allParents = IArray.fromArray(parentArray).concat(
				x.implementsInterfaces,
			);
			const newParents = this.newParents(allParents, scope);

			// Redistribute: first becomes parent, rest become implements
			return {
				...x,
				parent: newParents.headOption ? some(newParents.headOption) : none,
				implementsInterfaces: newParents.drop(1),
			};
		};
	}

	/**
	 * Simplifies inheritance for interface declarations.
	 */
	override enterTsDeclInterface(
		scope: TsTreeScope,
	): (x: TsDeclInterface) => TsDeclInterface {
		return (x: TsDeclInterface) => ({
			...x,
			inheritance: this.newParents(x.inheritance, scope),
		});
	}

	/**
	 * Processes a list of parent type references and simplifies them.
	 *
	 * For each parent reference:
	 * 1. First tries to look it up as a type (class/interface/type alias)
	 * 2. If not found as a type, looks it up as a variable
	 * 3. If found as a variable with a type, lifts the type
	 * 4. Otherwise keeps the original reference
	 */
	private newParents(
		parents: IArray<TsTypeRef>,
		scope: TsTreeScope,
	): IArray<TsTypeRef> {
		return parents.flatMap((parentRef: TsTypeRef) => {
			// First try to look up as a type (class, interface, type alias)
			const typeDeclarations = scope.lookupType(parentRef.name, true); // skipValidation = true

			if (typeDeclarations.length === 0) {
				// Not found as a type, try looking up as any declaration (including variables)
				const allLookup = scope.lookupIncludeScope(parentRef.name, true);

				if (allLookup.length > 0) {
					const [varDecl, newScope] = allLookup.toArray()[0];

					// Check if it's a TsDeclVar with a type
					if (varDecl._tag === "TsDeclVar") {
						const declVar = varDecl as TsDeclVar;
						if (declVar.tpe && declVar.tpe._tag === "Some") {
							return this.lift(newScope, parentRef, declVar.tpe.value);
						}
					}
				}
			}

			// Keep the original reference if we can't simplify it
			return IArray.fromArray([parentRef]);
		});
	}

	/**
	 * Lifts a type from a variable declaration into parent references.
	 *
	 * This handles several cases:
	 * 1. **TsTypeRef**: Direct type reference - resolve to the actual class/interface
	 * 2. **TsTypeIntersect**: Intersection type - flatten into multiple parents
	 * 3. **TsTypeQuery**: typeof expression - resolve to the underlying class
	 * 4. **Other types**: Drop as too complex
	 */
	private lift(
		scope: TsTreeScope,
		ref: TsTypeRef,
		tpe: TsType,
	): IArray<TsTypeRef> {
		switch (tpe._tag) {
			case "TsTypeRef": {
				const typeRef = tpe as TsTypeRef;
				const lookup = scope.lookup(typeRef.name);

				if (lookup.length > 0) {
					const declaration = lookup.toArray()[0];

					// Get the code path for the type declaration
					const codePath = declaration.codePath;
					if (codePath && codePath._tag === "HasPath") {
						scope.logger.info(
							`Simplified class which extends var ${ref.asString} to typeof var`,
						);

						// Cast to CodePathHasPath to access codePathPart
						const hasPath = codePath as any; // CodePathHasPath

						// Create a new type reference pointing to the actual type
						return IArray.fromArray([
							createTsTypeRef(
								hasPath.codePathPart,
								typeRef.tparams,
								typeRef.comments,
							),
						]);
					}
				}

				// If we can't resolve it, keep the original
				return IArray.fromArray([typeRef]);
			}

			case "TsTypeIntersect": {
				const intersect = tpe as TsTypeIntersect;
				// Recursively lift each type in the intersection
				return intersect.types.flatMap((innerType: TsType) =>
					this.lift(scope, ref, innerType),
				);
			}

			case "TsTypeQuery": {
				const query = tpe as TsTypeQuery;

				// Look for a class with the same name as the query expression
				const classLookup = scope.lookupIncludeScope(query.expr, true);

				for (const [decl, _] of classLookup.toArray()) {
					if (decl._tag === "TsDeclClass") {
						const classDecl = decl as TsDeclClass;
						const codePath = classDecl.codePath;

						if (codePath && codePath._tag === "HasPath") {
							// Cast to CodePathHasPath to access codePath
							const hasPath = codePath as any; // CodePathHasPath

							// Create a type reference to the class
							return IArray.fromArray([createTsTypeRef(hasPath.codePath)]);
						} else {
							// Fallback to using the query expression as the name
							return IArray.fromArray([createTsTypeRef(query.expr)]);
						}
					}
				}

				// If we can't find a matching class, drop this parent
				scope.logger.info(`Dropping complicated parent ${query.expr.asString}`);
				return IArray.Empty;
			}

			default: {
				// For any other type, drop it as too complex
				scope.logger.info(`Dropping complicated parent ${tpe.asString}`);
				return IArray.Empty;
			}
		}
	}
}

/**
 * Singleton instance of SimplifyParents for convenient usage.
 * Equivalent to the Scala object SimplifyParents.
 */
export const SimplifyParentsTransform = new SimplifyParents();
