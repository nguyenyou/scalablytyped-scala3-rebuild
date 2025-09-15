/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.HandleCommonJsModules
 *
 * It's really difficult to reconcile two module systems, this is a preparational step which helps us enable the
 * following pattern:
 *
 * ```typescript
 * declare class A {}
 * declare namespace A {
 *   interface B {
 *     nested: A.B // (1)
 *     edgeCase: Types.B // (2)
 *   }
 *   type N = number
 *   export import Types = A;
 * }
 * type N = A.N // (3)
 * export = A;
 * ```
 *
 * The exportees (`class A` here) outside the namespace is handled ok, and end up named `TsIdent.namespaced` after we
 * resolve everything.
 *
 * For the namespace we need to flatten it, and rewrite all references to it.
 *
 * Eventually we'll end up with something like this:
 *
 * ```typescript
 * export interface A {}
 * export declare class namespaced implements A {}
 * export interface B {
 *   nested: B;
 *   edgeCase: B;
 * }
 * export type N = number;
 * ```
 */

import { isNone, none, type Option } from "fp-ts/Option";
import { IsTrivial } from "../../Comment.js";
import { Comments } from "../../Comments.js";
import { IArray, partialFunction } from "../../IArray.js";
import { ExportType } from "../ExportType.js";
import { JsLocation } from "../JsLocation.js";
import {
	TreeTransformationScopedChanges,
	TreeTransformationUnit,
} from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import { QualifyReferences } from "../transforms/QualifyReferences.js";
import { SetCodePathTransformFunction } from "../transforms/SetCodePath.js";
import {
	type TsContainerOrDecl,
	type TsDeclModule,
	type TsDeclNamespace,
	type TsDeclTypeAlias,
	TsDeclVar,
	TsExport,
	type TsExporteeNames,
	TsExporteeTree,
	type TsIdent,
	type TsImport,
	type TsNamedDecl,
	TsQIdent,
	type TsTypeRef,
	TsTypeThis,
} from "../trees.js";

/**
 * Pattern matching helper for CommonJS export detection.
 * Equivalent to the EqualsExport object in Scala.
 */
class EqualsExport {
	/**
	 * Attempts to match a CommonJS export pattern in a module.
	 * Returns the export statement, target identifier, and remaining members if found.
	 */
	static unapply(
		x: TsDeclModule,
	): Option<[[TsExport, IArray<TsIdent>], IArray<TsContainerOrDecl>]> {
		const partitioned = x.members.partitionCollect(
			partialFunction<TsContainerOrDecl, [TsExport, IArray<TsIdent>]>(
				(member: TsContainerOrDecl): boolean => {
					if (member._tag === "TsExport") {
						const exportDecl = member as TsExport;
						if (
							exportDecl.tpe._tag === "Namespaced" &&
							exportDecl.exported._tag === "TsExporteeNames"
						) {
							const exporteeNames = exportDecl.exported as TsExporteeNames;
							if (
								exporteeNames.idents.length === 1 &&
								isNone(exporteeNames.fromOpt)
							) {
								const [_qident, aliasOpt] = exporteeNames.idents.get(0);
								if (isNone(aliasOpt)) {
									return true;
								}
							}
						}
					}
					return false;
				},
				(member: TsContainerOrDecl): [TsExport, IArray<TsIdent>] => {
					const exportDecl = member as TsExport;
					const exporteeNames = exportDecl.exported as TsExporteeNames;
					const [qident, _aliasOpt] = exporteeNames.idents.get(0);
					return [exportDecl, qident.parts];
				},
			),
		);

		const [exports, rest] = partitioned;
		if (exports.length > 0) {
			const firstExport = exports.get(0);
			return { _tag: "Some", value: [firstExport, rest] };
		}

		return none;
	}
}

/**
 * Tree transformation for erasing namespace references.
 * Equivalent to the EraseNamespaceRefs object in Scala.
 */
class EraseNamespaceRefs extends TreeTransformationUnit {
	constructor(private readonly target: TsIdent) {
		super();
	}

	override enterTsTypeRef(_t: undefined): (x: TsTypeRef) => TsTypeRef {
		return (x: TsTypeRef) => {
			if (x.name._tag === "TsQIdent") {
				const qident = x.name as TsQIdent;
				if (
					qident.parts.length > 0 &&
					qident.parts.get(0).value === this.target.value
				) {
					const remaining = qident.parts.drop(1);
					if (remaining.isEmpty) {
						return x;
					} else {
						return {
							...x,
							name: TsQIdent.of(...remaining.toArray()),
						};
					}
				}
			}
			return x;
		};
	}
}

/**
 * HandleCommonJsModules transformation object.
 * Equivalent to the Scala object HandleCommonJsModules.
 */
export class HandleCommonJsModules extends TreeTransformationScopedChanges {
	override enterTsDeclModule(
		scope: TsTreeScope,
	): (mod: TsDeclModule) => TsDeclModule {
		return (mod: TsDeclModule) => {
			const equalsExportResult = EqualsExport.unapply(mod);

			if (isNone(equalsExportResult)) {
				return mod;
			}

			const [[exportStatement, targets], notExports] = equalsExportResult.value;

			if (targets.length !== 1) {
				return mod;
			}

			const target = targets.get(0);

			// Partition members into namespaces, top-level declarations, and rest
			const partitioned = notExports.partitionCollect2(
				partialFunction<TsContainerOrDecl, TsDeclNamespace>(
					(member: TsContainerOrDecl): boolean => {
						return (
							member._tag === "TsDeclNamespace" &&
							(member as TsDeclNamespace).name.value === target.value
						);
					},
					(member: TsContainerOrDecl): TsDeclNamespace =>
						member as TsDeclNamespace,
				),
				partialFunction<TsContainerOrDecl, TsNamedDecl>(
					(member: TsContainerOrDecl): boolean => {
						if (
							member._tag === "TsDeclClass" ||
							member._tag === "TsDeclInterface" ||
							member._tag === "TsDeclFunction" ||
							member._tag === "TsDeclVar" ||
							member._tag === "TsDeclTypeAlias" ||
							member._tag === "TsDeclEnum"
						) {
							const namedDecl = member as TsNamedDecl;
							return namedDecl.name.value === target.value;
						}
						return false;
					},
					(member: TsContainerOrDecl): TsNamedDecl => member as TsNamedDecl,
				),
			);

			const [namespaces, toplevel, _rest] = partitioned;

			/**
			 * Support things like this:
			 *
			 * ```typescript
			 * type Err = Error;
			 *
			 * declare namespace createError {
			 *     interface Error<T extends Err> extends Err {
			 *         new (message?: string, obj?: any): T;
			 *     }
			 * }
			 *
			 * export = createError;
			 * ```
			 * `Err` refers to global error, not the one defined in the namespace. Note that we cannot do this in arbitrary
			 * modules, as we might leave conflicting definitions in the same scope (2x `type Props = ...` for instance)
			 */
			const rest = (() => {
				const qualifyReferences = QualifyReferences.apply(true); // skipValidation = true
				const patchedScope = scope.parent["/"](
					mod.withMembers(_rest.filter((member) => member._tag === "TsImport")),
				);
				// Only create new array if any members are actually changed
				const transformedMembers = _rest.map((member) =>
					qualifyReferences.visitTsContainerOrDecl(patchedScope)(member),
				);
				// Check if any members were actually changed
				let hasChanges = false;
				for (let i = 0; i < transformedMembers.length; i++) {
					if (transformedMembers.apply(i) !== _rest.apply(i)) {
						hasChanges = true;
						break;
					}
				}
				return hasChanges ? transformedMembers : _rest;
			})();

			if (namespaces.isEmpty) {
				return mod;
			}

			// Lift up the namespace members and reset codepath
			const flattened = namespaces
				.flatMap((ns) => ns.members)
				.map((member) => {
					if (
						member._tag === "TsDeclClass" ||
						member._tag === "TsDeclInterface" ||
						member._tag === "TsDeclFunction" ||
						member._tag === "TsDeclVar" ||
						member._tag === "TsDeclTypeAlias" ||
						member._tag === "TsDeclEnum"
					) {
						const namedDecl = member as TsNamedDecl;
						return TsExport.create(
							Comments.empty(),
							false, // typeOnly
							ExportType.named(),
							TsExporteeTree.create(namedDecl),
						);
					} else {
						return member;
					}
				})
				.map((member) => {
					if (member._tag === "TsExport") {
						const exportDecl = member as TsExport;
						if (exportDecl.exported._tag === "TsExporteeTree") {
							const exporteeTree = exportDecl.exported as TsExporteeTree;
							const updatedDecl = SetCodePathTransformFunction.enterTsDecl(
								mod.codePath.forceHasPath(),
							)(exporteeTree.decl);
							// Only create new object if declaration actually changed
							if (updatedDecl === exporteeTree.decl) {
								return exportDecl; // No change, return original
							}
							return {
								...exportDecl,
								exported: TsExporteeTree.create(updatedDecl),
							};
						}
					}
					return member;
				});

			const maybeKeepOriginalExport = toplevel.nonEmpty
				? IArray.fromArray([exportStatement])
				: IArray.Empty;

			// Handle (3) - filter redundant type aliases
			const patchedRest = rest.filter((member) => {
				if (member._tag === "TsDeclTypeAlias") {
					const typeAlias = member as TsDeclTypeAlias;
					if (
						typeAlias.tparams.isEmpty &&
						typeAlias.alias._tag === "TsTypeRef"
					) {
						const typeRef = typeAlias.alias as TsTypeRef;
						if (typeRef.name._tag === "TsQIdent") {
							const qident = typeRef.name as TsQIdent;
							if (
								qident.parts.length === 2 &&
								qident.parts.get(0).value === target.value &&
								typeRef.tparams.isEmpty
							) {
								const referredName = qident.parts.get(1);
								return referredName.value !== typeAlias.name.value;
							}
						}
					}
				}
				return true;
			});

			const newMembers = flattened
				.concat(patchedRest)
				.concat(toplevel)
				.concat(maybeKeepOriginalExport);

			// This is essentially a hack to make aws-sdk work, (2)
			// Only create new array if any members are actually changed
			const transformedNewMembers = newMembers.map((member) => {
				if (member._tag === "TsExport") {
					const exportDecl = member as TsExport;
					if (
						exportDecl.tpe._tag === "Named" &&
						exportDecl.exported._tag === "TsExporteeTree"
					) {
						const exporteeTree = exportDecl.exported as TsExporteeTree;
						if (exporteeTree.decl._tag === "TsImport") {
							const importDecl = exporteeTree.decl as TsImport;
							if (
								importDecl.imported.length === 1 &&
								importDecl.imported.get(0)._tag === "TsImportedIdent"
							) {
								const importedIdent = importDecl.imported.get(0) as any;
								if (
									importDecl.from._tag === "TsImporteeLocal" &&
									(importDecl.from as any).arg._tag === "TsQIdent"
								) {
									const fromQIdent = (importDecl.from as any).arg as TsQIdent;
									if (
										fromQIdent.parts.length === 1 &&
										fromQIdent.parts.get(0).value === target.value
									) {
										const newName = importedIdent.ident;
										return TsExport.create(
											Comments.empty(),
											false, // typeOnly
											ExportType.named(),
											TsExporteeTree.create(
												TsDeclVar.create(
													Comments.apply([IsTrivial.instance]),
													true, // declared
													true, // readOnly
													newName,
													{ _tag: "Some", value: TsTypeThis.create() },
													none, // expr
													JsLocation.add(mod.jsLocation, newName),
													mod.codePath.add(newName),
												),
											),
										);
									}
								}
							}
						}
					}
				}
				return member;
			});

			// Check if any members were actually changed
			let hasChanges = false;
			for (let i = 0; i < transformedNewMembers.length; i++) {
				if (transformedNewMembers.apply(i) !== newMembers.apply(i)) {
					hasChanges = true;
					break;
				}
			}
			const patchedNewMembers = hasChanges ? transformedNewMembers : newMembers;

			// Handle (1) - erase namespace references
			const eraseNamespaceRefs = new EraseNamespaceRefs(target);
			return eraseNamespaceRefs.visitTsDeclModule()(
				mod.withMembers(patchedNewMembers),
			);
		};
	}
}
