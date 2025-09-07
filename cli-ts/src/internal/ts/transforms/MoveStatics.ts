/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.MoveStatics
 *
 * Extract statics into a namespace.
 *
 * Freely create duplicate namespaces, since they will be combined right after
 */

import { none, type Option } from "fp-ts/Option";
import { Comment, Raw } from "../../Comment.js";
import { IArray, type PartialFunction, partialFunction } from "../../IArray.js";
import { Hoisting } from "../Hoisting.js";
import { JsLocation } from "../JsLocation.js";
import { TransformMembers } from "../TreeTransformations.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import {
	TsDeclClass,
	TsDeclInterface,
	TsDeclNamespace,
	TsMemberFunction,
	TsMemberProperty,
	type TsContainer,
	type TsContainerOrDecl,
	type TsMember,
} from "../trees.js";

/**
 * Transform that extracts static members from classes and interfaces into namespaces.
 * 
 * This transform extends TransformMembers to process container members and extract
 * static properties and methods into separate namespace declarations.
 */
export class MoveStatics extends TransformMembers {
	static readonly instance = new MoveStatics();

	/**
	 * Process container members, extracting static members from classes and interfaces.
	 */
	newMembers(scope: TsTreeScope, x: TsContainer): IArray<TsContainerOrDecl> {
		return x.members.flatMap((member): IArray<TsContainerOrDecl> => {
			if (TsDeclInterface.isInterface(member)) {
				const int = member as TsDeclInterface;
				const comment = new Raw(
					`/* Note: this doesnt actually exist! a class implementing ${int.name.value} should have this defined on it's companion object */\n`
				);

				const [statics, nonStatics] = MoveStatics.extractStatics(int.members, comment);

				const staticDecls = statics.mapNotNoneOption(
					Hoisting.memberToDecl(int.codePath, JsLocation.zero())
				);

				if (staticDecls.isEmpty) {
					return IArray.apply(int as TsContainerOrDecl);
				} else {
					const ns = TsDeclNamespace.create(
						int.comments,
						int.declared,
						int.name,
						staticDecls as unknown as IArray<TsContainerOrDecl>,
						int.codePath,
						JsLocation.zero()
					);
					const modifiedInterface = TsDeclInterface.create(
						int.comments.add(comment),
						int.declared,
						int.name,
						int.tparams,
						int.inheritance,
						nonStatics,
						int.codePath
					);
					return IArray.apply(modifiedInterface as TsContainerOrDecl, ns as TsContainerOrDecl);
				}
			} else if (TsDeclClass.isClass(member)) {
				const cls = member as TsDeclClass;
				const comment = new Raw("/* static member */\n");

				const [statics, nonStatics] = MoveStatics.extractStatics(cls.members, comment);

				const staticDecls = statics.mapNotNoneOption(
					Hoisting.memberToDecl(cls.codePath, cls.jsLocation)
				);

				if (staticDecls.isEmpty) {
					return IArray.apply(cls as TsContainerOrDecl);
				} else {
					const ns = TsDeclNamespace.create(
						cls.comments,
						cls.declared,
						cls.name,
						staticDecls as unknown as IArray<TsContainerOrDecl>,
						cls.codePath,
						cls.jsLocation
					);
					const modifiedClass = TsDeclClass.create(
						cls.comments,
						cls.declared,
						cls.isAbstract,
						cls.name,
						cls.tparams,
						cls.parent,
						cls.implementsInterfaces,
						nonStatics,
						cls.jsLocation,
						cls.codePath
					);
					return IArray.apply(modifiedClass as TsContainerOrDecl, ns as TsContainerOrDecl);
				}
			} else {
				return IArray.apply(member);
			}
		});
	}

	/**
	 * Extract static members from a list of members, returning both static and non-static members.
	 * Static members have their isStatic flag removed and the provided comment added.
	 * 
	 * @param members - The array of members to process
	 * @param comment - The comment to add to extracted static members
	 * @returns A tuple of [static members, non-static members]
	 */
	static extractStatics(
		members: IArray<TsMember>,
		comment: Comment
	): [IArray<TsMember>, IArray<TsMember>] {
		return members.partitionCollect(
			partialFunction(
				(member: TsMember): boolean => {
					switch (member._tag) {
						case "TsMemberProperty": {
							const prop = member as TsMemberProperty;
							return prop.isStatic;
						}
						case "TsMemberFunction": {
							const func = member as TsMemberFunction;
							return func.isStatic;
						}
						default:
							return false;
					}
				},
				(member: TsMember): TsMember => {
					switch (member._tag) {
						case "TsMemberProperty": {
							const prop = member as TsMemberProperty;
							return TsMemberProperty.create(
								prop.comments.add(comment),
								prop.level,
								prop.name,
								prop.tpe,
								prop.expr,
								false, // isStatic = false
								prop.isReadOnly
							);
						}
						case "TsMemberFunction": {
							const func = member as TsMemberFunction;
							return TsMemberFunction.create(
								func.comments.add(comment),
								func.level,
								func.name,
								func.methodType,
								func.signature,
								false, // isStatic = false
								func.isReadOnly
							);
						}
						default:
							// This should never happen due to the guard above
							return member;
					}
				}
			)
		);
	}
}
