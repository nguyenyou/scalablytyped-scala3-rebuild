/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ResolveTypeQueries
 *
 * Resolves `typeof` expressions and type queries by evaluating them against
 * the actual type structure. Converts expressions like `typeof MyClass` to their resolved types.
 */

import { none, some, isSome, type Option } from "fp-ts/Option";
import { Comment, Marker } from "../../Comment.js";
import { Comments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import type { CodePath } from "../CodePath.js";
import { JsLocation } from "../JsLocation.js";
import { MethodType } from "../MethodType.js";
import { Picker } from "../Picker.js";
import { TransformMembers, TransformLeaveClassMembers } from "../TreeTransformations.js";
import { TsProtectionLevel } from "../TsProtectionLevel.js";
import { LoopDetector, type TsTreeScope, TsQIdentUtils } from "../TsTreeScope.js";
import { TsTypeFormatter } from "../TsTypeFormatter.js";
import { SetJsLocation } from "./SetJsLocation.js";
import {
	TsDeclClass,
	TsDeclFunction,
	TsDeclNamespace,
	TsDeclModule,
	TsDeclVar,
	TsDeclTypeAlias,
	TsDeclInterface,
	TsAugmentedModule,
	TsIdent,
	TsIdentSimple,
	TsIdentGlobal,
	TsQIdent,
	TsTypeRef,
	TsTypeQuery,
	TsTypeFunction,
	TsTypeConstructor,
	TsTypeObject,
	TsTypeIntersect,
	TsMemberProperty,
	TsMemberFunction,
	TsMemberCtor,
	TsMemberCall,
	TsFunSig,
	TsFunParam,
	TsTypeParam,
	type TsType,
	type TsContainer,
	type TsContainerOrDecl,
	type TsMember,
	type HasClassMembers,
	type TsNamedDecl,
	type TsNamedValueDecl,
	type TsDeclNamespaceOrModule,
} from "../trees.js";

/**
 * Global this identifier
 */
const GlobalThis = TsQIdent.ofStrings("globalThis");

/**
 * Main ResolveTypeQueries transformation object
 */
export const ResolveTypeQueries = {
	/**
	 * Apply the ResolveTypeQueries transformation
	 */
	apply: () => {
		return new ResolveTypeQueriesVisitor();
	},
};

/**
 * Visitor that resolves type query expressions
 */
class ResolveTypeQueriesVisitor extends TransformMembers {
	/**
	 * Transform class members by resolving type queries in properties
	 * This implements the TransformLeaveClassMembers functionality
	 */
	newClassMembersLeaving(scope: TsTreeScope, tree: HasClassMembers): IArray<TsMember> {
		return tree.members.flatMap((member: TsMember): IArray<TsMember> => {
			if (member._tag === "TsMemberProperty") {
				const target = member as TsMemberProperty;
				
				// Check if this is a property with a type query and no expression
				if (isSome(target.tpe) && 
					target.tpe.value._tag === "TsTypeQuery" && 
					target.expr._tag === "None") {
					
					const tpe = target.tpe.value as TsTypeQuery;
					
					// Skip primitive types
					if (TsQIdentUtils.Primitive(tpe.expr)) {
						return IArray.apply(member);
					}
					
					const note = Comment.create(`/* was \`${TsTypeFormatter.apply(tpe)}\` */\n`);
					
					const founds = this.lookup(scope, Picker.NamedValues, tpe.expr).map(([found, newScope]) => {
						if (found._tag === "TsDeclVar") {
							const foundVar = found as TsDeclVar;
							return TsMemberProperty.create(
								target.comments.concat(foundVar.comments).add(note),
								target.level,
								target.name,
								foundVar.tpe,
								target.expr,
								target.isStatic,
								target.isReadOnly
							);
						} else if (found._tag === "TsDeclFunction") {
							const foundFunc = found as TsDeclFunction;
							return TsMemberFunction.create(
								target.comments.concat(foundFunc.comments).add(note),
								target.level,
								target.name,
								MethodType.normal(),
								foundFunc.signature,
								target.isStatic,
								target.isReadOnly
							);
						} else {
							const resolvedType = this.typeOf(found, newScope, LoopDetector.initial);
							return TsMemberProperty.create(
								target.comments.add(note),
								target.level,
								target.name,
								resolvedType,
								target.expr,
								target.isStatic,
								target.isReadOnly
							);
						}
					});
					
					if (founds.isEmpty) {
						const msg = `Couldn't resolve ${TsTypeFormatter.apply(tpe)}`;
						scope.logger.warn(msg);
						const warningType = TsTypeRef.any.withComments(Comments.fromComment(Comment.warning(msg)));
						return IArray.apply(TsMemberProperty.create(
							target.comments,
							target.level,
							target.name,
							some(warningType),
							target.expr,
							target.isStatic,
							target.isReadOnly
						) as TsMember);
					}
					
					return founds as unknown as IArray<TsMember>;
				}
			}
			
			return IArray.apply(member);
		});
	}

	/**
	 * Transform container members by resolving type queries in variable declarations
	 */
	newMembers(scope: TsTreeScope, tree: TsContainer): IArray<TsContainerOrDecl> {
		// Collect code paths to avoid circular references
		const avoidCircular = new Set<CodePath>();
		for (const stackItem of scope.stack) {
			if (stackItem && typeof stackItem === 'object' && 'codePath' in stackItem) {
				avoidCircular.add((stackItem as any).codePath);
			}
		}

		const addedClasses = new Set<TsIdentSimple>();

		const rewritten = tree.members.flatMap((member: TsContainerOrDecl): IArray<TsContainerOrDecl> => {
			if (member._tag === "TsDeclVar") {
				const target = member as TsDeclVar;
				
				// Check if this is a variable with a type query and no expression
				if (isSome(target.tpe) && 
					target.tpe.value._tag === "TsTypeQuery" && 
					target.expr._tag === "None") {
					
					const tpe = target.tpe.value as TsTypeQuery;
					
					// Skip primitive types
					if (TsQIdentUtils.Primitive(tpe.expr)) {
						return IArray.apply(member);
					}
					
					const note = Comment.create(`/* was \`${TsTypeFormatter.apply(tpe)}\` */\n`);
					
					// Get owner location for setting JS location
					const ownerLoc = 'jsLocation' in tree ? (tree as any).jsLocation : JsLocation.zero();
					
					const founds = this.lookup(scope, Picker.NamedValues, tpe.expr).flatMap(([found, _newScope]) => {
						// Avoid circular references
						if (avoidCircular.has(found.codePath)) {
							return IArray.Empty;
						}
						
						// Use DeriveCopy to create derived declarations
						const derivedDecls = this.deriveCopy(found.addComment(note), tree.codePath, some(target.name));
						
						// Apply JS location to derived declarations
						const setJsLocation = new SetJsLocation();
						return derivedDecls.map(decl => {
							if ('withJsLocation' in decl && typeof decl.withJsLocation === 'function') {
								return (decl as any).withJsLocation(ownerLoc);
							}
							return decl;
						});
					});
					
					// Track added classes for type alias filtering
					founds.forEach(found => {
						if (found._tag === "TsDeclClass") {
							addedClasses.add((found as TsDeclClass).name);
						}
					});
					
					if (founds.isEmpty) {
						const msg = `Couldn't resolve ${TsTypeFormatter.apply(tpe)}`;
						scope.logger.warn(msg);
						const warningType = TsTypeRef.any.withComments(Comments.fromComment(Comment.warning(msg)));
						return IArray.apply(TsDeclVar.create(
							target.comments,
							target.declared,
							target.readOnly,
							target.name,
							some(warningType),
							target.expr,
							target.jsLocation,
							target.codePath
						) as TsContainerOrDecl);
					}
					
					return founds;
				}
			}
			
			return IArray.apply(member);
		});

		// Filter out type aliases that conflict with added classes
		if (addedClasses.size === 0) {
			return rewritten;
		} else {
			return rewritten.filter(member => {
				if (member._tag === "TsDeclTypeAlias") {
					const alias = member as TsDeclTypeAlias;
					return !addedClasses.has(alias.name);
				}
				return true;
			});
		}
	}

	/**
	 * Transform types by resolving type queries
	 */
	override leaveTsType(scope: TsTreeScope): (x: TsType) => TsType {
		return (x: TsType) => {
			if (x._tag === "TsTypeQuery") {
				return this.resolve(scope, x as TsTypeQuery, LoopDetector.initial);
			}
			return x;
		};
	}

	/**
	 * Override leave methods to implement TransformLeaveClassMembers functionality
	 */
	override leaveTsDeclClass(scope: TsTreeScope): (x: TsDeclClass) => TsDeclClass {
		return (x: TsDeclClass) => ({
			...x,
			members: this.newClassMembersLeaving(scope, x),
		});
	}

	override leaveTsDeclInterface(scope: TsTreeScope): (x: TsDeclInterface) => TsDeclInterface {
		return (x: TsDeclInterface) => ({
			...x,
			members: this.newClassMembersLeaving(scope, x),
		});
	}

	leaveTsTypeObject(scope: TsTreeScope): (x: TsTypeObject) => TsTypeObject {
		return (x: TsTypeObject) => ({
			...x,
			members: this.newClassMembersLeaving(scope, x),
		});
	}

	/**
	 * Picker for type queries that excludes circular references
	 */
	private createPicker(target: TsTypeQuery): Picker<TsNamedValueDecl> {
		return {
			pick: (decl: TsNamedDecl) => {
				if (decl._tag === "TsDeclVar") {
					const varDecl = decl as TsDeclVar;
					// Exclude if this variable has the same type query (circular reference)
					if (isSome(varDecl.tpe) && varDecl.tpe.value === target) {
						return none;
					}
					return some(varDecl as TsNamedValueDecl);
				} else if (this.isNamedValueDecl(decl)) {
					return some(decl as TsNamedValueDecl);
				}
				return none;
			}
		};
	}

	/**
	 * Type guard for TsNamedValueDecl
	 */
	private isNamedValueDecl(decl: TsNamedDecl): boolean {
		return decl._tag === "TsDeclVar" || 
			   decl._tag === "TsDeclFunction" || 
			   decl._tag === "TsDeclClass" || 
			   decl._tag === "TsDeclEnum";
	}

	/**
	 * Simplified DeriveCopy implementation
	 */
	private deriveCopy(decl: TsNamedDecl, ownerCp: CodePath, rename: Option<TsIdentSimple>): IArray<TsNamedDecl> {
		// This is a simplified implementation - in a full port, you'd implement the complete DeriveCopy logic
		const newName: TsIdentSimple = isSome(rename) ? rename.value : (decl.name._tag === "TsIdentSimple" ? decl.name as TsIdentSimple : TsIdent.simple(decl.name.value));
		
		// For now, just return a copy with the new name and code path
		const newCodePath = ownerCp._tag === "HasPath" ? 
			(ownerCp as any).add(newName) : 
			decl.codePath;
		
		switch (decl._tag) {
			case "TsDeclVar":
				return IArray.apply((decl as TsDeclVar).withName(newName).withCodePath(newCodePath) as TsNamedDecl);
			case "TsDeclFunction":
				return IArray.apply((decl as TsDeclFunction).withName(newName).withCodePath(newCodePath) as TsNamedDecl);
			case "TsDeclClass":
				return IArray.apply((decl as TsDeclClass).withName(newName).withCodePath(newCodePath) as TsNamedDecl);
			default:
				return IArray.apply(decl);
		}
	}

	/**
	 * Lookup helper that handles global fallback
	 */
	private lookup<T extends TsNamedDecl>(
		scope: TsTreeScope, 
		picker: Picker<T>, 
		wanted: TsQIdent
	): IArray<[T, TsTreeScope]> {
		let results = scope.lookupInternal(picker, wanted.parts, LoopDetector.initial);
		
		if (results.isEmpty) {
			// Try looking in global scope
			const patchedWanted = wanted.parts.length > 0 && wanted.parts.apply(0)._tag === "TsIdentLibrarySimple" ?
				IArray.fromArray([wanted.parts.apply(0), TsIdentGlobal, ...wanted.parts.drop(1).toArray()]) :
				IArray.fromArray([TsIdentGlobal, ...wanted.parts.toArray()]);
			
			results = scope.lookupInternal(picker, patchedWanted, LoopDetector.initial);
		}
		
		// Prioritize variables, then functions, then others
		const [vars, functions, others] = results.partitionCollect2(
			this.createPartialFunction<[T, TsTreeScope], [T, TsTreeScope]>(
				([decl, _scope]) => decl._tag === "TsDeclVar",
				([decl, _scope]) => [decl, _scope]
			),
			this.createPartialFunction<[T, TsTreeScope], [T, TsTreeScope]>(
				([decl, _scope]) => decl._tag === "TsDeclFunction",
				([decl, _scope]) => [decl, _scope]
			)
		);
		
		if (vars.length > 0) return vars;
		if (functions.length > 0) return functions;
		return others;
	}

	/**
	 * Get the type of a named declaration
	 */
	private typeOf(decl: TsNamedDecl, scope: TsTreeScope, loopDetector: LoopDetector): Option<TsType> {
		switch (decl._tag) {
			case "TsDeclFunction": {
				const func = decl as TsDeclFunction;
				return some(TsTypeFunction.create(func.signature));
			}
			
			case "TsDeclClass": {
				const cls = decl as TsDeclClass;
				// This would need the full RewrittenClass logic from the original
				// For now, return a simple type constructor
				const ctor = TsTypeConstructor.create(
					false,
					TsTypeFunction.create(
						TsFunSig.create(
							Comments.empty(),
							IArray.Empty,
							IArray.Empty, // Use empty params instead of cls.tparams
							some(TsTypeRef.create(
								Comments.empty(),
								cls.codePath.forceHasPath().codePath,
								TsTypeParam.asTypeArgs(cls.tparams) as unknown as IArray<TsType>
							))
						)
					)
				);
				return some(ctor);
			}
			
			case "TsDeclNamespace": {
				const ns = decl as TsDeclNamespace;
				return this.nonEmptyTypeObject(ns);
			}
			
			case "TsDeclModule": {
				const mod = decl as TsDeclModule;
				return this.nonEmptyTypeObject(mod);
			}
			
			case "TsDeclVar": {
				const varDecl = decl as TsDeclVar;
				if (isSome(varDecl.tpe)) {
					if (varDecl.tpe.value._tag === "TsTypeQuery") {
						const nested = varDecl.tpe.value as TsTypeQuery;
						return some(this.resolve(scope, nested, loopDetector));
					} else {
						return varDecl.tpe;
					}
				}
				return none;
			}
			
			default:
				return none;
		}
	}

	/**
	 * Resolve a type query to its actual type
	 */
	private resolve(scope: TsTreeScope, target: TsTypeQuery, _loopDetector: LoopDetector): TsType {
		const loopResult = _loopDetector.including(target.expr.parts, scope);
		
		if (loopResult._tag === "Left") {
			const msg = `Loop while resolving ${TsTypeFormatter.apply(target)}`;
			scope.logger.warn(msg);
			return TsTypeRef.any.withComments(Comments.fromComment(Comment.warning(msg)));
		}
		
		const loopDetector = loopResult.right;
		
		// Handle special cases
		if (this.qidentEquals(target.expr, GlobalThis)) {
			return TsTypeRef.any.withComments(Comments.fromComment(Comment.create("/* globalThis */ ")));
		}
		
		if (TsQIdentUtils.Primitive(target.expr)) {
			return TsTypeRef.create(Comments.empty(), target.expr, IArray.Empty);
		}
		
		// Look up the target
		const found = this.lookup(scope, this.createPicker(target), target.expr)
			.mapNotNone(([decl, newScope]) => {
				const typeResult = this.typeOf(decl, newScope, loopDetector);
				return isSome(typeResult) ? typeResult.value : undefined;
			});
		
		if (found.isEmpty) {
			const msg = `Couldn't resolve ${TsTypeFormatter.apply(target)}`;
			scope.logger.warn(msg);
			return TsTypeRef.any.withComments(Comments.fromComment(Comment.warning(msg)));
		}
		
		// Handle function overloads
		const [functions, rest] = found.partitionCollect(
			this.createPartialFunction<TsType, TsTypeFunction>(
				(tpe: TsType) => tpe._tag === "TsTypeFunction",
				(tpe: TsType) => tpe as TsTypeFunction
			)
		);
		
		let rewritten: IArray<TsType>;
		if (functions.isEmpty) {
			rewritten = rest;
		} else if (functions.length === 1 && functions.apply(0).signature.tparams.isEmpty && rest.length <= 1) {
			rewritten = IArray.fromArray([functions.apply(0), ...rest.toArray()]);
		} else {
			// Create object type with call signatures for function overloads
			const overloads = TsTypeObject.create(
				Comments.empty(),
				functions.map(fn => TsMemberCall.create(
					Comments.empty(),
					TsProtectionLevel.default(),
					fn.signature
				) as TsMember)
			);
			rewritten = IArray.fromArray([overloads, ...rest.toArray()]);
		}
		
		return TsTypeIntersect.simplified(rewritten);
	}

	/**
	 * Helper method to compare two qualified identifiers
	 */
	private qidentEquals(a: TsQIdent, b: TsQIdent): boolean {
		if (a.parts.length !== b.parts.length) return false;
		for (let i = 0; i < a.parts.length; i++) {
			if (a.parts.apply(i).value !== b.parts.apply(i).value) return false;
		}
		return true;
	}

	/**
	 * Helper method to create partial functions for partitionCollect2
	 */
	private createPartialFunction<T, U>(
		isDefinedAt: (value: T) => boolean,
		apply: (value: T) => U
	): { isDefinedAt: (value: T) => boolean; apply: (value: T) => U } {
		return { isDefinedAt, apply };
	}

	/**
	 * Create a type object from a namespace or module
	 */
	private nonEmptyTypeObject(from: TsDeclNamespaceOrModule): Option<TsTypeObject> {
		const rewritten = from.members.mapNotNone((member: TsContainerOrDecl): TsMember | undefined => {
			switch (member._tag) {
				case "TsDeclNamespace": {
					const ns = member as TsDeclNamespace;
					const nestedType = this.nonEmptyTypeObject(ns);
					return isSome(nestedType) ? TsMemberProperty.create(
						ns.comments,
						TsProtectionLevel.default(),
						ns.name,
						nestedType,
						none,
						false,
						true
					) as TsMember : undefined;
				}

				case "TsDeclFunction": {
					const func = member as TsDeclFunction;
					return TsMemberFunction.create(
						func.comments,
						TsProtectionLevel.default(),
						func.name,
						MethodType.normal(),
						func.signature,
						false,
						true
					) as TsMember;
				}

				case "TsDeclVar": {
					const varDecl = member as TsDeclVar;
					return TsMemberProperty.create(
						varDecl.comments,
						TsProtectionLevel.default(),
						varDecl.name,
						varDecl.tpe,
						varDecl.expr,
						false,
						varDecl.readOnly
					) as TsMember;
				}

				case "TsDeclClass": {
					const cls = member as TsDeclClass;
					const classType = this.typeOf(cls, from as any, LoopDetector.initial);
					return TsMemberProperty.create(
						cls.comments,
						TsProtectionLevel.default(),
						cls.name,
						classType,
						none,
						false,
						false
					) as TsMember;
				}

				default:
					return undefined;
			}
		});
		
		if (rewritten.isEmpty) {
			return none;
		}
		
		const nameHint = from._tag === "TsDeclNamespace" ? 
			`Typeof${(from as TsDeclNamespace).name.value}` :
			`Typeof${(from as TsDeclModule).name.value}`;
		
		return some(TsTypeObject.create(
			Comments.fromComment(Marker.nameHint(nameHint)),
			rewritten
		));
	}
}
