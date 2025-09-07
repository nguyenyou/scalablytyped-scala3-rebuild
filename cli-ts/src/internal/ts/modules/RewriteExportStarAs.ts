/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.RewriteExportStarAs
 *
 * Transforms `export * as namespace from "module"` statements into equivalent
 * import/export combinations for better compatibility and processing.
 *
 * This transformation converts:
 * ```typescript
 * export * as Utils from "./utils";
 * ```
 *
 * Into:
 * ```typescript
 * import * as Utils from "./utils";
 * export { Utils };
 * ```
 *
 * This maintains 100% behavioral parity with the Scala implementation.
 */

import type { TsContainer, TsContainerOrDecl, TsIdentSimple, TsImported } from "../trees.js";
import {
	TsExport,
	TsExporteeStar,
	TsExporteeNames,
	TsImport,
	TsImportedStar,
	TsImporteeFrom,
	TsQIdent,
	TsIdent,
} from "../trees.js";
import { TransformMembers } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import { IArray } from "../../IArray.js";
import { none, some, type Option } from "fp-ts/Option";

/**
 * Transform that rewrites `export * as namespace` statements to import/export combinations.
 *
 * This transformation extends TransformMembers to process container members and
 * convert export star statements with namespace aliases into equivalent import
 * and export declarations.
 *
 * Maintains 100% behavioral parity with the Scala RewriteExportStarAs object.
 */
export class RewriteExportStarAs extends TransformMembers {
	/**
	 * Singleton instance for the transformation
	 */
	static readonly instance = new RewriteExportStarAs();

	/**
	 * Transform container members by rewriting export star statements.
	 *
	 * This method processes each member in the container and converts any
	 * `export * as namespace from "module"` statements into equivalent
	 * import/export combinations.
	 *
	 * @param scope The current tree scope
	 * @param x The container whose members should be transformed
	 * @returns Array of transformed container members
	 */
	newMembers(scope: TsTreeScope, x: TsContainer): IArray<TsContainerOrDecl> {
		return x.members.flatMap((member: TsContainerOrDecl): IArray<TsContainerOrDecl> => {
			// Check if this is an export declaration
			if (member._tag === "TsExport") {
				const exportDecl = member as TsExport;
				
				// Check if this is an export star with namespace alias
				if (exportDecl.exported._tag === "TsExporteeStar") {
					const starExport = exportDecl.exported as TsExporteeStar;
					
					// Only transform if there's a namespace alias (as clause)
					if (starExport.as._tag === "Some") {
						const alias = starExport.as.value;
						
						// Create the equivalent import statement
						const newImport = TsImport.create(
							exportDecl.typeOnly,
							IArray.fromArray<TsImported>([TsImportedStar.create(some(alias))]),
							TsImporteeFrom.create(starExport.from)
						);

						// Create the equivalent export statement
						const newExport = TsExport.create(
							exportDecl.comments,
							exportDecl.typeOnly,
							exportDecl.tpe,
							TsExporteeNames.create(
								IArray.fromArray([
									[
										TsQIdent.of(TsIdent.simple(alias.value)),
										none
									] as [TsQIdent, Option<TsIdentSimple>]
								]),
								none
							)
						);

						// Return both the import and export
						return IArray.fromArray([newImport, newExport] as any[]);
					}
				}
			}
			
			// For all other members, return unchanged
			return IArray.fromArray([member]);
		});
	}
}

/**
 * Default export for the RewriteExportStarAs transformation.
 * Provides a convenient way to access the singleton instance.
 */
export default RewriteExportStarAs.instance;
