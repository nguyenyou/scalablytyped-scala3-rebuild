/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ExtractInterfaces
 *
 * This module extracts anonymous object types into named interfaces to improve readability
 * and reduce code duplication in generated TypeScript definitions.
 */

import { pipe } from "fp-ts/function";
import { none, type Option, some } from "fp-ts/Option";
import { NameHint } from "../../Comment.js";
import { Comments } from "../../Comments.js";
import { IArray } from "../../IArray.js";
import { CodePath, type CodePathHasPath } from "../CodePath.js";
import { DeriveNonConflictingName } from "../DeriveNonConflictingName.js";
import { JsLocation } from "../JsLocation.js";
import { TreeTransformationScopedChanges } from "../TreeTransformations.js";
import { TypeParamsReferencedInTree } from "../TypeParamsReferencedInTree.js";
import type { TsTreeScope } from "../TsTreeScope.js";
import {
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclModule,
	TsDeclNamespace,
	TsDeclTypeAlias,
	TsDeclVar,
	type TsIdent,
	type TsIdentLibrary,
	type TsIdentSimple,
	TsIdent as TsIdentConstructor,
	type TsMember,
	type TsMemberCall,
	type TsMemberIndex,
	TsMemberProperty,
	type TsMemberTypeMapped,
	type TsParsedFile,
	TsQIdent,
	type TsTree,
	TsType,
	type TsTypeObject,
	TsTypeParam,
	type TsTypePredicate,
	TsTypeRef,
} from "../trees.js";

/**
 * Main function to extract interfaces from a parsed file
 */
export function extractInterfaces(
	inLibrary: TsIdentLibrary,
	into: TsIdentSimple,
	scope: TsTreeScope,
): (file: TsParsedFile) => TsParsedFile {
	return (file: TsParsedFile): TsParsedFile => {
		const store = new ConflictHandlingStore(inLibrary, into);
		const transformer = new LiftTypeObjects(store);
		const newFile = transformer.visitTsParsedFile(scope)(file);

		const interfaces = store.getInterfaces();

		if (interfaces.isEmpty) {
			return newFile;
		}

		return newFile.withMembers(
			newFile.members.append(
				TsDeclNamespace.create(
					Comments.empty(),
					false, // declared
					into,
					interfaces,
					CodePath.hasPath(inLibrary, TsQIdent.of(into)),
					JsLocation.zero(),
				),
			),
		) as TsParsedFile;
	};
}

/**
 * Store for handling interface conflicts and deduplication
 */
export class ConflictHandlingStore {
	private readonly interfaces = new Map<string, TsDeclInterface>();

	constructor(
		private readonly inLibrary: TsIdent,
		private readonly into: TsIdentSimple,
	) {}

	/**
	 * Add an interface to the store, handling conflicts by name
	 */
	addInterface(
		scope: TsTreeScope,
		prefix: string,
		members: IArray<TsMember>,
		referencedTparams: IArray<TsTypeParam>,
	): (construct: (name: TsIdentSimple) => TsDeclInterface) => CodePathHasPath {
		return (construct: (name: TsIdentSimple) => TsDeclInterface): CodePathHasPath => {
			const interfaceResult = DeriveNonConflictingName.apply(
				prefix,
				members,
			)((name: TsIdentSimple): Option<TsDeclInterface> => {
				// Check if this name conflicts with referenced type parameters
				if (
					referencedTparams.exists((tparam) => tparam.name.value === name.value)
				) {
					return none;
				}

				const newInterface = construct(name).withCodePath(
					CodePath.hasPath(
						this.inLibrary,
						TsQIdent.of(this.into, name),
					),
				);

				const existing = this.interfaces.get(name.value);
				if (existing) {
					// Check if the existing interface is compatible
					if (
						!this.areInterfacesCompatible(existing, newInterface)
					) {
						return none; // Conflict - try another name
					}
					return some(existing); // Use existing compatible interface
				}

				return some(newInterface);
			}) as TsDeclInterface;

			this.interfaces.set(interfaceResult.name.value, interfaceResult);
			return interfaceResult.codePath.forceHasPath();
		};
	}

	/**
	 * Get all stored interfaces as an IArray
	 */
	getInterfaces(): IArray<TsContainerOrDecl> {
		const interfaceArray = Array.from(this.interfaces.values());
		return IArray.fromArray(interfaceArray as TsContainerOrDecl[]);
	}

	/**
	 * Check if two interfaces are compatible (same members and type parameters)
	 */
	private areInterfacesCompatible(
		existing: TsDeclInterface,
		newInterface: TsDeclInterface,
	): boolean {
		// Compare members and type parameters for equality
		return (
			this.areMembersEqual(existing.members, newInterface.members) &&
			this.areTypeParamsEqual(existing.tparams, newInterface.tparams)
		);
	}

	/**
	 * Compare two member arrays for equality
	 */
	private areMembersEqual(
		members1: IArray<TsMember>,
		members2: IArray<TsMember>,
	): boolean {
		if (members1.length !== members2.length) {
			return false;
		}

		for (let i = 0; i < members1.length; i++) {
			// This is a simplified comparison - in practice, you might need
			// more sophisticated member comparison logic
			const m1 = members1.apply(i);
			const m2 = members2.apply(i);
			if (m1._tag !== m2._tag) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Compare two type parameter arrays for equality
	 */
	private areTypeParamsEqual(
		tparams1: IArray<TsTypeParam>,
		tparams2: IArray<TsTypeParam>,
	): boolean {
		if (tparams1.length !== tparams2.length) {
			return false;
		}

		for (let i = 0; i < tparams1.length; i++) {
			const tp1 = tparams1.apply(i);
			const tp2 = tparams2.apply(i);
			if (tp1.name.value !== tp2.name.value) {
				return false;
			}
		}

		return true;
	}
}

/**
 * Checks if an object type will be erased during compilation
 */
export function willBeErased(stack: TsTree[], obj: TsTypeObject): boolean {
	return (
		stack.some((tree) => {
			return (
				tree._tag === "TsMemberTypeMapped" || tree._tag === "TsTypePredicate"
			);
		}) || TsType.isTypeMapping(obj.members)
	);
}

/**
 * Checks if members represent a dictionary pattern
 */
export function isDictionary(members: IArray<TsMember>): boolean {
	if (members.isEmpty) {
		return false;
	}

	return members.forall((member) => {
		if (member._tag === "TsMemberIndex") {
			const indexMember = member as TsMemberIndex;
			return indexMember.indexing._tag === "IndexingDict";
		}
		return false;
	});
}

/**
 * Determines if a type should be extracted based on the tree scope
 * Returns false if there's a TsDeclVar anywhere in the stack
 */
export function shouldBeExtracted(scope: TsTreeScope): boolean {
	const stack = scope.stack;
	// Check if there's a TsDeclVar anywhere in the stack
	for (let i = 0; i < stack.length; i++) {
		if (stack[i] && stack[i]._tag === "TsDeclVar") {
			return false;
		}
	}
	return true;
}

/**
 * Tree transformation that lifts type objects into interfaces
 */
export class LiftTypeObjects extends TreeTransformationScopedChanges {
	constructor(private readonly store: ConflictHandlingStore) {
		super();
	}

	/**
	 * Override visitTsParsedFile to manually traverse the tree and find type objects
	 */
	override visitTsParsedFile(scope: TsTreeScope): (file: TsParsedFile) => TsParsedFile {
		return (file: TsParsedFile): TsParsedFile => {
			// Create a scope for the file first
			const fileScope = scope["/"](file);

			// Transform all members recursively
			const transformedMembers = file.members.map((member) => {
				return this.transformContainerOrDecl(fileScope, member);
			});

			// Only create a new file if members actually changed
			if (transformedMembers.equals(file.members)) {
				return file;
			}

			return file.withMembers(transformedMembers) as TsParsedFile;
		};
	}

	/**
	 * Transform a container or declaration, recursively traversing its structure
	 */
	private transformContainerOrDecl(scope: TsTreeScope, member: TsContainerOrDecl): TsContainerOrDecl {
		const newScope = scope["/"](member);

		switch (member._tag) {
			case "TsDeclInterface":
				return this.transformInterface(newScope, member as TsDeclInterface);
			case "TsDeclClass":
				return this.transformClass(newScope, member as TsDeclClass);
			case "TsDeclVar":
				return this.transformVar(newScope, member as TsDeclVar);
			case "TsDeclFunction":
				return this.transformFunction(newScope, member as TsDeclFunction);
			case "TsDeclTypeAlias":
				return this.transformTypeAlias(newScope, member as TsDeclTypeAlias);
			case "TsDeclNamespace":
				return this.transformNamespace(newScope, member as TsDeclNamespace);
			case "TsDeclModule":
				return this.transformModule(newScope, member as TsDeclModule);
			default:
				return member;
		}
	}

	/**
	 * Transform an interface, processing its members
	 */
	private transformInterface(scope: TsTreeScope, iface: TsDeclInterface): TsDeclInterface {
		const transformedMembers = iface.members.map((member) => {
			return this.transformMember(scope, member);
		});

		// Only create a new interface if members actually changed
		if (transformedMembers.equals(iface.members)) {
			return iface;
		}

		return TsDeclInterface.create(
			iface.comments,
			iface.declared,
			iface.name,
			iface.tparams,
			iface.inheritance,
			transformedMembers,
			iface.codePath,
		);
	}

	/**
	 * Transform a class, processing its members
	 */
	private transformClass(scope: TsTreeScope, cls: TsDeclClass): TsDeclClass {
		const transformedMembers = cls.members.map((member) => {
			return this.transformMember(scope, member);
		});

		// Only create a new class if members actually changed
		if (transformedMembers.equals(cls.members)) {
			return cls;
		}

		return TsDeclClass.create(
			cls.comments,
			cls.declared,
			cls.isAbstract,
			cls.name,
			cls.tparams,
			cls.parent,
			cls.implementsInterfaces,
			transformedMembers,
			cls.jsLocation,
			cls.codePath,
		);
	}

	/**
	 * Transform a variable declaration, processing its type
	 */
	private transformVar(scope: TsTreeScope, varDecl: TsDeclVar): TsDeclVar {
		if (varDecl.tpe._tag === "Some") {
			const transformedType = this.transformType(scope, varDecl.tpe.value);
			// Only create a new variable if the type actually changed
			if (transformedType === varDecl.tpe.value) {
				return varDecl;
			}
			return TsDeclVar.create(
				varDecl.comments,
				varDecl.declared,
				varDecl.readOnly,
				varDecl.name,
				some(transformedType),
				varDecl.expr,
				varDecl.jsLocation,
				varDecl.codePath,
			);
		}
		return varDecl;
	}

	/**
	 * Transform a function declaration, processing its signature
	 */
	private transformFunction(_scope: TsTreeScope, func: TsDeclFunction): TsDeclFunction {
		// For now, just return the function unchanged
		// TODO: Transform function signature types if needed
		return func;
	}

	/**
	 * Transform a type alias, processing its type
	 */
	private transformTypeAlias(scope: TsTreeScope, alias: TsDeclTypeAlias): TsDeclTypeAlias {
		const transformedType = this.transformType(scope, alias.alias);
		// Only create a new type alias if the type actually changed
		if (transformedType === alias.alias) {
			return alias;
		}
		return TsDeclTypeAlias.create(
			alias.comments,
			alias.declared,
			alias.name,
			alias.tparams,
			transformedType,
			alias.codePath,
		);
	}

	/**
	 * Transform a namespace, processing its members
	 */
	private transformNamespace(scope: TsTreeScope, ns: TsDeclNamespace): TsDeclNamespace {
		const transformedMembers = ns.members.map((member) => {
			return this.transformContainerOrDecl(scope, member);
		});

		return TsDeclNamespace.create(
			ns.comments,
			ns.declared,
			ns.name,
			transformedMembers,
			ns.codePath,
			ns.jsLocation,
		);
	}

	/**
	 * Transform a module, processing its members
	 */
	private transformModule(scope: TsTreeScope, mod: TsDeclModule): TsDeclModule {
		const transformedMembers = mod.members.map((member) => {
			return this.transformContainerOrDecl(scope, member);
		});

		return TsDeclModule.create(
			mod.comments,
			mod.declared,
			mod.name,
			transformedMembers,
			mod.codePath,
			mod.jsLocation,
			mod.augmentedModules,
		);
	}

	/**
	 * Transform a member, processing its type if it has one
	 */
	private transformMember(scope: TsTreeScope, member: TsMember): TsMember {
		switch (member._tag) {
			case "TsMemberProperty":
				return this.transformProperty(scope, member as TsMemberProperty);
			case "TsMemberCall":
			case "TsMemberCtor":
			case "TsMemberFunction":
			case "TsMemberIndex":
				// For now, just return these unchanged
				// TODO: Transform their types if needed
				return member;
			default:
				return member;
		}
	}

	/**
	 * Transform a property member, processing its type
	 */
	private transformProperty(scope: TsTreeScope, prop: TsMemberProperty): TsMemberProperty {
		if (prop.tpe._tag === "Some") {
			const transformedType = this.transformType(scope, prop.tpe.value);
			// Only create a new property if the type actually changed
			if (transformedType === prop.tpe.value) {
				return prop;
			}
			return TsMemberProperty.create(
				prop.comments,
				prop.level,
				prop.name,
				some(transformedType),
				prop.expr,
				prop.isStatic,
				prop.isReadOnly,
			);
		}
		return prop;
	}

	/**
	 * Transform a type, extracting object types into interfaces
	 */
	private transformType(scope: TsTreeScope, type: TsType): TsType {
		if (type._tag === "TsTypeObject") {
			const obj = type as TsTypeObject;

			if (
				obj.members.nonEmpty &&
				!isDictionary(obj.members) &&
				!willBeErased(scope.stack, obj) &&
				shouldBeExtracted(scope)
			) {
				const referencedTparams = TypeParamsReferencedInTree.apply(
					scope.tparams,
					obj,
				);

				const prefix = this.determinePrefix(obj);

				const codePath = this.store.addInterface(
					scope,
					prefix,
					obj.members,
					referencedTparams,
				)((name: TsIdentSimple) => {
					// Extract name hint from comments if available
					const commentsWithoutHint = this.extractNameHint(obj.comments);

					return TsDeclInterface.create(
						commentsWithoutHint,
						true, // declared
						name,
						referencedTparams,
						IArray.Empty, // inheritance
						obj.members,
						CodePath.noPath(),
					);
				});

				// Convert type parameters to type arguments using the helper function
				const typeArgs = TsTypeParam.asTypeArgs(referencedTparams).map(
					(ref) => ref as TsType
				);

				return TsTypeRef.create(
					Comments.empty(),
					codePath.codePath,
					typeArgs,
				);
			}
		}

		// TODO: Recursively transform other composite types like unions, intersections, etc.
		return type;
	}

	/**
	 * Determine the prefix for naming the interface
	 */
	private determinePrefix(obj: TsTypeObject): string {
		const isFunction = obj.members.forall((member) => {
			return member._tag === "TsMemberCall";
		});

		// Try to extract name hint from comments
		const nameHintResult = obj.comments.extract((marker) => {
			if (marker instanceof NameHint) {
				return marker.value;
			}
			throw new Error("Not a NameHint marker");
		});

		if (nameHintResult._tag === "Some") {
			const [nameHint, _] = nameHintResult.value;
			return nameHint.substring(0, Math.min(25, nameHint.length));
		}

		if (isFunction) {
			return DeriveNonConflictingName.Fn;
		}

		return DeriveNonConflictingName.Anon;
	}

	/**
	 * Extract name hint from comments, returning comments without the hint
	 */
	private extractNameHint(comments: Comments): Comments {
		const nameHintResult = comments.extract((marker) => {
			if (marker instanceof NameHint) {
				return marker.value;
			}
			throw new Error("Not a NameHint marker");
		});

		if (nameHintResult._tag === "Some") {
			const [_, remainingComments] = nameHintResult.value;
			return remainingComments;
		}

		return comments;
	}
}