/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.NormalizeFunctions
 *
 * To give the scala compiler a fighting chance, we will have to rewrite things like this:
 * ```typescript
 * class Foo {
 *   bar: () => string
 * }
 * ```
 * into things like
 * ```typescript
 * class Foo {
 *   bar(): string
 * }
 * ```
 *
 * The reason is that Typescript allows overriding things in this manner, while the scala compiler obviously doesnt.
 *
 * Also rewrite optional methods to properties, since scala has no such concept
 */

import { none, type Option, some } from "fp-ts/Option";
import { IArray, IArrayPatterns, partialFunction } from "../../IArray.js";
import { MethodType } from "../MethodType.js";
import { TransformMembers } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import {
	type HasClassMembers,
	type TsContainer,
	type TsContainerOrDecl,
	type TsDecl,
	TsDeclFunction,
	type TsDeclVar,
	TsExporteeTree,
	type TsExporteeTree as TsExporteeTreeType,
	type TsFunSig,
	type TsMember,
	type TsMemberCall,
	TsMemberFunction,
	type TsMemberProperty,
	type TsType,
	type TsTypeFunction,
	type TsTypeObject,
} from "../trees.js";

/**
 * Transform that normalizes function properties to methods and function variables to function declarations.
 *
 * This transform extends TransformMembers and manually implements TransformClassMembers functionality
 * to handle both container members and class members.
 */
export class NormalizeFunctions extends TransformMembers {
	static readonly instance = new NormalizeFunctions();

	/**
	 * Pattern matching helper for identifying types that should be rewritten to function signatures.
	 * Matches TsTypeFunction and TsTypeObject with only call signatures.
	 */
	private static toRewrite(tpe: TsType): Option<IArray<TsFunSig>> {
		switch (tpe._tag) {
			case "TsTypeObject": {
				const objType = tpe as TsTypeObject;
				if (objType.members.isEmpty) {
					return none;
				}

				// Check if all members are call signatures
				const [calls, rest] = objType.members.partitionCollect(
					partialFunction(
						(member: TsMember): boolean => member._tag === "TsMemberCall",
						(member: TsMember): TsFunSig => (member as TsMemberCall).signature,
					),
				);

				// Only rewrite if all members are call signatures (rest is empty)
				if (rest.isEmpty) {
					return some(calls);
				} else {
					return none;
				}
			}
			case "TsTypeFunction": {
				const funType = tpe as TsTypeFunction;
				return some(IArray.apply(funType.signature));
			}
			default:
				return none;
		}
	}

	/**
	 * Process class members, converting function properties to methods.
	 * This manually implements the TransformClassMembers functionality.
	 */
	newClassMembers(_scope: TsTreeScope, x: HasClassMembers): IArray<TsMember> {
		return x.members.flatMap((member: TsMember): IArray<TsMember> => {
			if (member._tag === "TsMemberProperty") {
				const prop = member as TsMemberProperty;

				// Only process properties with types but no expressions
				if (
					prop.tpe &&
					prop.tpe._tag === "Some" &&
					(!prop.expr || prop.expr._tag === "None")
				) {
					const typeOpt = NormalizeFunctions.toRewrite(prop.tpe.value);
					if (typeOpt._tag === "Some") {
						const signatures = typeOpt.value;
						return signatures.map(
							(sig: TsFunSig) =>
								TsMemberFunction.create(
									prop.comments,
									prop.level,
									prop.name,
									MethodType.normal(),
									sig,
									prop.isStatic,
									prop.isReadOnly,
								) as TsMember,
						);
					}
				}
			}
			return IArray.apply(member);
		});
	}

	/**
	 * Override class-related enter methods to apply class member transformation.
	 */
	override enterTsDeclClass(scope: TsTreeScope) {
		return (x: any) => ({
			...x,
			members: this.newClassMembers(scope, x),
		});
	}

	override enterTsDeclInterface(scope: TsTreeScope) {
		return (x: any) => ({
			...x,
			members: this.newClassMembers(scope, x),
		});
	}

	override enterTsTypeObject(scope: TsTreeScope) {
		return (x: any) => ({
			...x,
			members: this.newClassMembers(scope, x),
		});
	}

	/**
	 * Process export trees, converting function variable exports to function declaration exports.
	 */
	enterTsExporteeTree(_scope: TsTreeScope) {
		return (x: TsExporteeTreeType): TsExporteeTreeType => {
			const rewritten = this.rewriteDecl(x.decl);
			const exactlyOne = IArrayPatterns.exactlyOne(rewritten);
			if (exactlyOne) {
				return TsExporteeTree.create(exactlyOne);
			} else {
				return x;
			}
		};
	}

	/**
	 * Process container members, converting function variable declarations to function declarations.
	 */
	newMembers(_scope: TsTreeScope, x: TsContainer): IArray<TsContainerOrDecl> {
		return x.members.flatMap(
			(member: TsContainerOrDecl): IArray<TsContainerOrDecl> => {
				if (
					member._tag === "TsDeclVar" ||
					member._tag === "TsDeclFunction" ||
					member._tag === "TsDeclClass" ||
					member._tag === "TsDeclInterface" ||
					member._tag === "TsDeclTypeAlias" ||
					member._tag === "TsDeclEnum" ||
					member._tag === "TsDeclNamespace" ||
					member._tag === "TsDeclModule" ||
					member._tag === "TsAugmentedModule"
				) {
					return this.rewriteDecl(member as TsDecl);
				} else {
					return IArray.apply(member);
				}
			},
		);
	}

	/**
	 * Process types, converting object types with single call signatures to function types.
	 */
	override enterTsType(_scope: TsTreeScope) {
		return (x: TsType): TsType => {
			if (x._tag === "TsTypeObject") {
				const objType = x as TsTypeObject;
				const exactlyOne = IArrayPatterns.exactlyOne(objType.members);
				if (exactlyOne && exactlyOne._tag === "TsMemberCall") {
					const callMember = exactlyOne as TsMemberCall;
					return {
						_tag: "TsTypeFunction",
						signature: callMember.signature,
						asString: `TsTypeFunction(${callMember.signature.asString})`,
					} as TsTypeFunction;
				}
			}
			return x;
		};
	}

	/**
	 * Rewrite a declaration, converting function variables to function declarations.
	 */
	private rewriteDecl(d: TsDecl): IArray<TsDecl> {
		if (d._tag === "TsDeclVar") {
			const varDecl = d as TsDeclVar;

			// Only process readonly variables with types but no expressions
			if (
				varDecl.readOnly &&
				varDecl.tpe &&
				varDecl.tpe._tag === "Some" &&
				(!varDecl.expr || varDecl.expr._tag === "None")
			) {
				const typeOpt = NormalizeFunctions.toRewrite(varDecl.tpe.value);
				if (typeOpt._tag === "Some") {
					const signatures = typeOpt.value;
					return signatures.map(
						(sig: TsFunSig) =>
							TsDeclFunction.create(
								varDecl.comments,
								varDecl.declared,
								varDecl.name,
								sig,
								varDecl.jsLocation,
								varDecl.codePath,
							) as TsDecl,
					);
				}
			}
		}
		return IArray.apply(d);
	}
}
