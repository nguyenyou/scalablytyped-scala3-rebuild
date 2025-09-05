/**
 * Tests for ParentsResolver.ts - TypeScript port of org.scalablytyped.converter.internal.ts.ParentsResolverTests
 * Comprehensive test suite ported from Scala ParentsResolverTests.scala to ensure behavioral parity
 */

import { describe, expect, test } from "bun:test";
import { none, some } from "fp-ts/Option";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import {
	type InterfaceOrClass,
	isInterfaceOrClass,
	isTsDeclClass,
	isTsDeclInterface,
	isTsDeclTypeAlias,
	ParentsResolver,
	resolveParents,
	WithParents,
} from "@/internal/ts/ParentsResolver.js";
import type { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import {
	TsDeclClass,
	TsDeclInterface,
	TsDeclTypeAlias,
	TsIdent,
	type TsIdentSimple,
	type TsMember,
	type TsNamedDecl,
	TsQIdent,
	type TsType,
	TsTypeIntersect,
	TsTypeObject,
	type TsTypeParam,
	TsTypeRef,
	TsTypeUnion,
} from "@/internal/ts/trees.js";

// ============================================================================
// Helper methods for creating test data
// ============================================================================

const createSimpleIdent = (name: string): TsIdentSimple => TsIdent.simple(name);
const createQIdent = (name: string): TsQIdent =>
	TsQIdent.of(createSimpleIdent(name));

const createTypeRef = (
	name: string,
	tparams: IArray<TsType> = IArray.Empty,
): TsTypeRef => TsTypeRef.create(Comments.empty(), createQIdent(name), tparams);

const createMockInterface = (
	name: string,
	tparams: IArray<TsTypeParam> = IArray.Empty,
	inheritance: IArray<TsTypeRef> = IArray.Empty,
	members: IArray<TsMember> = IArray.Empty,
): TsDeclInterface =>
	TsDeclInterface.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		tparams,
		inheritance,
		members,
		CodePath.noPath(),
	);

const createMockClass = (
	name: string,
	tparams: IArray<TsTypeParam> = IArray.Empty,
	parent: TsTypeRef | undefined = undefined,
	implementsInterfaces: IArray<TsTypeRef> = IArray.Empty,
	members: IArray<TsMember> = IArray.Empty,
): TsDeclClass =>
	TsDeclClass.create(
		Comments.empty(),
		false, // declared
		false, // isAbstract
		createSimpleIdent(name),
		tparams,
		parent ? some(parent) : none,
		implementsInterfaces,
		members,
		JsLocation.zero(),
		CodePath.noPath(),
	);

const createMockTypeAlias = (
	name: string,
	alias: TsType,
	tparams: IArray<TsTypeParam> = IArray.Empty,
): TsDeclTypeAlias =>
	TsDeclTypeAlias.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		tparams,
		alias,
		CodePath.noPath(),
	);

const createMockScope = (
	declarations: Map<string, TsNamedDecl>,
): TsTreeScope => {
	const scope: TsTreeScope = {
		lookup: (qname: TsQIdent, skipValidation = false): IArray<TsNamedDecl> => {
			const name = qname.parts.get(0)?.value;
			const decl = name ? declarations.get(name) : undefined;
			return decl ? IArray.apply(decl) : IArray.Empty;
		},

		lookupIncludeScope: (
			qname: TsQIdent,
			skipValidation = false,
		): IArray<[TsNamedDecl, TsTreeScope]> => {
			const name = qname.parts.get(0)?.value;
			const decl = name ? declarations.get(name) : undefined;
			return decl
				? IArray.apply([decl, scope] as [TsNamedDecl, TsTreeScope])
				: IArray.Empty;
		},

		lookupType: (
			qname: TsQIdent,
			skipValidation = false,
		): IArray<TsNamedDecl> => {
			return scope.lookup(qname, skipValidation);
		},

		lookupTypeIncludeScope: (
			qname: TsQIdent,
			skipValidation = false,
		): IArray<[TsNamedDecl, TsTreeScope]> => {
			return scope.lookupIncludeScope(qname, skipValidation);
		},

		// Mock implementations for other required methods
		"/"(current: any): any {
			return scope;
		},
		get root(): any {
			return scope;
		},
		get lookupUnqualified(): boolean {
			return false;
		},
		get logger(): any {
			return { fatalMaybe: () => {} };
		},
		get stack(): any[] {
			return [];
		},
		get tparams(): Map<any, any> {
			return new Map();
		},
		get tkeys(): Set<any> {
			return new Set();
		},
		get parent(): TsTreeScope {
			return scope;
		},
		get moduleScopes(): Map<any, any> {
			return new Map();
		},
		get moduleAuxScopes(): Map<any, any> {
			return new Map();
		},
		get exports(): IArray<any> {
			return IArray.Empty;
		},
		lookupInternal: () => IArray.Empty,
		isAbstract: () => false,
		surroundingTsContainer: () => none,
		surroundingHasMembers: () => none,
		withinModule: () => false,
		fatalMaybe: () => {},
		toString: () => "MockScope",
		equals: () => false,
		hashCode: () => 0,
	};

	return scope;
};

// Helper function to create a Map from entries
const createDeclarationsMap = (
	...entries: [string, TsNamedDecl][]
): Map<string, TsNamedDecl> => {
	const map = new Map<string, TsNamedDecl>();
	entries.forEach(([key, value]) => map.set(key, value));
	return map;
};

describe("ParentsResolver Tests", () => {
	describe("ParentsResolver - basic functionality", () => {
		test("resolves interface with no parents", () => {
			const interface_ = createMockInterface("TestInterface");
			const scope = createMockScope(new Map());

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents.length).toBe(0);
			expect(result.unresolved.length).toBe(0);
		});

		test("resolves class with no parents", () => {
			const class_ = createMockClass("TestClass");
			const scope = createMockScope(new Map());

			const result = ParentsResolver.apply(scope, class_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(class_);
			expect(result.parents.length).toBe(0);
			expect(result.unresolved.length).toBe(0);
		});

		test("resolves interface with single parent interface", () => {
			const parentInterface = createMockInterface("ParentInterface");
			const childInterface = createMockInterface(
				"ChildInterface",
				IArray.Empty,
				IArray.apply(createTypeRef("ParentInterface")),
			);

			const scope = createMockScope(
				createDeclarationsMap(["ParentInterface", parentInterface]),
			);

			const result = ParentsResolver.apply(scope, childInterface);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(childInterface);
			expect(result.parents.length).toBe(1);
			expect(result.unresolved.length).toBe(0);

			const resolvedParent = result.parents.get(0) as TsDeclInterface;
			expect(resolvedParent.name.value).toBe("ParentInterface");
		});

		test("resolves class with parent class", () => {
			const parentClass = createMockClass("ParentClass");
			const childClass = createMockClass(
				"ChildClass",
				IArray.Empty,
				createTypeRef("ParentClass"),
			);

			const scope = createMockScope(
				createDeclarationsMap(["ParentClass", parentClass]),
			);

			const result = ParentsResolver.apply(scope, childClass);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(childClass);
			expect(result.parents.length).toBe(1);
			expect(result.unresolved.length).toBe(0);

			const resolvedParent = result.parents.get(0) as TsDeclClass;
			expect(resolvedParent.name.value).toBe("ParentClass");
		});

		test("resolves class with implemented interfaces", () => {
			const interface1 = createMockInterface("Interface1");
			const interface2 = createMockInterface("Interface2");
			const class_ = createMockClass(
				"TestClass",
				IArray.Empty,
				undefined,
				IArray.apply(createTypeRef("Interface1"), createTypeRef("Interface2")),
			);

			const declarations = new Map<string, TsNamedDecl>();
			declarations.set("Interface1", interface1);
			declarations.set("Interface2", interface2);
			const scope = createMockScope(declarations);

			const result = ParentsResolver.apply(scope, class_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(class_);
			expect(result.parents.length).toBe(2);
			expect(result.unresolved.length).toBe(0);

			const parentNames = result.parents
				.toArray()
				.map((p) => (p as TsDeclInterface | TsDeclClass).name.value);
			expect(parentNames).toContain("Interface1");
			expect(parentNames).toContain("Interface2");
		});

		test("resolves class with both parent class and implemented interfaces", () => {
			const parentClass = createMockClass("ParentClass");
			const interface1 = createMockInterface("Interface1");
			const childClass = createMockClass(
				"ChildClass",
				IArray.Empty,
				createTypeRef("ParentClass"),
				IArray.apply(createTypeRef("Interface1")),
			);

			const scope = createMockScope(
				createDeclarationsMap(
					["ParentClass", parentClass],
					["Interface1", interface1],
				),
			);

			const result = ParentsResolver.apply(scope, childClass);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(childClass);
			expect(result.parents.length).toBe(2);
			expect(result.unresolved.length).toBe(0);

			const parentNames = result.parents
				.toArray()
				.map((p) => (p as TsDeclInterface | TsDeclClass).name.value);
			expect(parentNames).toContain("ParentClass");
			expect(parentNames).toContain("Interface1");
		});
	});

	describe("ParentsResolver - unresolved types", () => {
		test("handles unresolved parent types", () => {
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				IArray.apply(createTypeRef("UnknownInterface")),
			);

			const scope = createMockScope(new Map()); // Empty scope

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents.length).toBe(0);
			expect(result.unresolved.length).toBe(1);

			const unresolvedType = result.unresolved.get(0);
			expect(unresolvedType._tag).toBe("TsTypeRef");
			if (unresolvedType._tag === "TsTypeRef") {
				const typeRef = unresolvedType as TsTypeRef;
				expect(typeRef.name.parts.get(0)?.value).toBe("UnknownInterface");
			}
		});

		test("handles mix of resolved and unresolved types", () => {
			const knownInterface = createMockInterface("KnownInterface");
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				IArray.apply(
					createTypeRef("KnownInterface"),
					createTypeRef("UnknownInterface"),
				),
			);

			const scope = createMockScope(
				new Map([["KnownInterface", knownInterface]]),
			);

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents.length).toBe(1);
			expect(result.unresolved.length).toBe(1);

			expect((result.parents.get(0) as TsDeclInterface).name.value).toBe(
				"KnownInterface",
			);

			const unresolvedType = result.unresolved.get(0);
			expect(unresolvedType._tag).toBe("TsTypeRef");
			if (unresolvedType._tag === "TsTypeRef") {
				const typeRef = unresolvedType as TsTypeRef;
				expect(typeRef.name.parts.get(0)?.value).toBe("UnknownInterface");
			}
		});
	});

	describe("ParentsResolver - type aliases", () => {
		test("resolves type alias to interface", () => {
			const targetInterface = createMockInterface("TargetInterface");
			const typeAlias = createMockTypeAlias(
				"AliasToInterface",
				createTypeRef("TargetInterface"),
			);
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				IArray.apply(createTypeRef("AliasToInterface")),
			);

			const scope = createMockScope(
				createDeclarationsMap(
					["TargetInterface", targetInterface],
					["AliasToInterface", typeAlias],
				),
			);

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents.length).toBe(1);
			expect(result.unresolved.length).toBe(0);

			expect((result.parents.get(0) as TsDeclInterface).name.value).toBe(
				"TargetInterface",
			);
		});

		test("resolves type alias to object type", () => {
			const objectType = TsTypeObject.create(Comments.empty(), IArray.Empty);
			const typeAlias = createMockTypeAlias("AliasToObject", objectType);
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				IArray.apply(createTypeRef("AliasToObject")),
			);

			const scope = createMockScope(new Map([["AliasToObject", typeAlias]]));

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents.length).toBe(1);
			expect(result.unresolved.length).toBe(0);

			// Should create synthetic interface for object type
			const syntheticInterface = result.parents.get(0);
			expect(syntheticInterface._tag).toBe("TsDeclInterface");
		});

		test("resolves type alias to union type", () => {
			const interface1 = createMockInterface("Interface1");
			const interface2 = createMockInterface("Interface2");
			const unionType = TsTypeUnion.create(
				IArray.apply(
					createTypeRef("Interface1") as TsType,
					createTypeRef("Interface2") as TsType,
				),
			);
			const typeAlias = createMockTypeAlias("AliasToUnion", unionType);
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				IArray.apply(createTypeRef("AliasToUnion")),
			);

			const scope = createMockScope(
				createDeclarationsMap(
					["Interface1", interface1],
					["Interface2", interface2],
					["AliasToUnion", typeAlias],
				),
			);

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents.length).toBe(2);
			expect(result.unresolved.length).toBe(0);

			const parentNames = result.parents
				.toArray()
				.map((p) => (p as TsDeclInterface | TsDeclClass).name.value);
			expect(parentNames).toContain("Interface1");
			expect(parentNames).toContain("Interface2");
		});

		test("resolves type alias to intersection type", () => {
			const interface1 = createMockInterface("Interface1");
			const interface2 = createMockInterface("Interface2");
			const intersectionType = TsTypeIntersect.create(
				IArray.apply<TsType>(
					createTypeRef("Interface1"),
					createTypeRef("Interface2"),
				),
			);
			const typeAlias = createMockTypeAlias(
				"AliasToIntersection",
				intersectionType,
			);
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				IArray.apply(createTypeRef("AliasToIntersection")),
			);

			const scope = createMockScope(
				createDeclarationsMap(
					["Interface1", interface1],
					["Interface2", interface2],
					["AliasToIntersection", typeAlias],
				),
			);

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents.length).toBe(2);
			expect(result.unresolved.length).toBe(0);

			const parentNames = result.parents
				.toArray()
				.map((p) => (p as TsDeclInterface | TsDeclClass).name.value);
			expect(parentNames).toContain("Interface1");
			expect(parentNames).toContain("Interface2");
		});

		test("handles unresolved type alias target", () => {
			const typeAlias = createMockTypeAlias(
				"AliasToUnknown",
				createTypeRef("UnknownType"),
			);
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				IArray.apply(createTypeRef("AliasToUnknown")),
			);

			const scope = createMockScope(new Map([["AliasToUnknown", typeAlias]]));

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents.length).toBe(0);
			expect(result.unresolved.length).toBe(1);

			const unresolvedType = result.unresolved.get(0);
			expect(unresolvedType._tag).toBe("TsTypeRef");
			if (unresolvedType._tag === "TsTypeRef") {
				const typeRef = unresolvedType as TsTypeRef;
				expect(typeRef.name.parts.get(0)?.value).toBe("UnknownType");
			}
		});
	});

	describe("ParentsResolver - circular references", () => {
		test("handles circular inheritance (interface)", () => {
			// Create interfaces that reference each other
			const interface1 = createMockInterface(
				"Interface1",
				IArray.Empty,
				IArray.apply(createTypeRef("Interface2")),
			);
			const interface2 = createMockInterface(
				"Interface2",
				IArray.Empty,
				IArray.apply(createTypeRef("Interface1")),
			);

			const scope = createMockScope(
				new Map([
					["Interface1", interface1],
					["Interface2", interface2],
				]),
			);

			const result = ParentsResolver.apply(scope, interface1);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface1);
			// Should handle circular reference gracefully
			expect(result.parents.length).toBe(1);
			expect((result.parents.get(0) as TsDeclInterface).name.value).toBe(
				"Interface2",
			);
		});

		test("handles self-referencing interface", () => {
			const interface_ = createMockInterface(
				"SelfReferencing",
				IArray.Empty,
				IArray.apply(createTypeRef("SelfReferencing")),
			);

			const scope = createMockScope(new Map([["SelfReferencing", interface_]]));

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			// Should not include itself in parents to avoid infinite recursion
			expect(result.parents.length).toBe(0);
		});
	});

	describe("ParentsResolver - complex hierarchies", () => {
		test("resolves deep inheritance chain", () => {
			const grandParent = createMockInterface("GrandParent");
			const parent = createMockInterface(
				"Parent",
				IArray.Empty,
				IArray.apply(createTypeRef("GrandParent")),
			);
			const child = createMockInterface(
				"Child",
				IArray.Empty,
				IArray.apply(createTypeRef("Parent")),
			);

			const scope = createMockScope(
				new Map([
					["GrandParent", grandParent],
					["Parent", parent],
				]),
			);

			const result = ParentsResolver.apply(scope, child);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(child);
			expect(result.parents.length).toBe(2); // Parent and GrandParent
			expect(result.unresolved.length).toBe(0);

			const parentNames = result.parents
				.toArray()
				.map((p) => (p as TsDeclInterface | TsDeclClass).name.value);
			expect(parentNames).toContain("Parent");
			expect(parentNames).toContain("GrandParent");
		});

		test("resolves multiple inheritance paths", () => {
			const baseInterface = createMockInterface("BaseInterface");
			const mixin1 = createMockInterface(
				"Mixin1",
				IArray.Empty,
				IArray.apply(createTypeRef("BaseInterface")),
			);
			const mixin2 = createMockInterface(
				"Mixin2",
				IArray.Empty,
				IArray.apply(createTypeRef("BaseInterface")),
			);
			const combined = createMockInterface(
				"Combined",
				IArray.Empty,
				IArray.apply(createTypeRef("Mixin1"), createTypeRef("Mixin2")),
			);

			const scope = createMockScope(
				new Map([
					["BaseInterface", baseInterface],
					["Mixin1", mixin1],
					["Mixin2", mixin2],
				]),
			);

			const result = ParentsResolver.apply(scope, combined);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(combined);
			expect(result.parents.length).toBe(3); // Mixin1, Mixin2, and BaseInterface
			expect(result.unresolved.length).toBe(0);

			const parentNames = result.parents
				.toArray()
				.map((p) => (p as TsDeclInterface | TsDeclClass).name.value);
			expect(parentNames).toContain("Mixin1");
			expect(parentNames).toContain("Mixin2");
			expect(parentNames).toContain("BaseInterface");
		});
	});

	describe("ParentsResolver - edge cases", () => {
		test("handles empty inheritance arrays", () => {
			const interface_ = createMockInterface("EmptyInterface");
			const scope = createMockScope(new Map());

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents.length).toBe(0);
			expect(result.unresolved.length).toBe(0);
		});

		test("handles non-interface/class declarations in scope", () => {
			// Create a type alias that doesn't resolve to interface/class
			const primitiveAlias = createMockTypeAlias(
				"StringAlias",
				createTypeRef("string"),
			);
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				IArray.apply(createTypeRef("StringAlias")),
			);

			const scope = createMockScope(new Map([["StringAlias", primitiveAlias]]));

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents.length).toBe(0);
			expect(result.unresolved.length).toBe(1);

			const unresolvedType = result.unresolved.get(0);
			expect(unresolvedType._tag).toBe("TsTypeRef");
		});

		test("handles duplicate parent references", () => {
			const parentInterface = createMockInterface("ParentInterface");
			const interface_ = createMockInterface(
				"TestInterface",
				IArray.Empty,
				IArray.apply(
					createTypeRef("ParentInterface"),
					createTypeRef("ParentInterface"), // Duplicate
				),
			);

			const scope = createMockScope(
				new Map([["ParentInterface", parentInterface]]),
			);

			const result = ParentsResolver.apply(scope, interface_);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			// Should only include the parent once due to seen tracking
			expect(result.parents.length).toBe(1);
			expect(result.unresolved.length).toBe(0);
			expect((result.parents.get(0) as TsDeclInterface).name.value).toBe(
				"ParentInterface",
			);
		});
	});

	describe("ParentsResolver - utility functions", () => {
		test("WithParents.create works correctly", () => {
			const interface_ = createMockInterface("TestInterface");
			const parents = IArray.apply<InterfaceOrClass>(
				createMockInterface("Parent") as InterfaceOrClass,
			);
			const unresolved = IArray.apply<TsType>(
				createTypeRef("Unknown") as TsType,
			);

			const result = WithParents.create(interface_, parents, unresolved);

			expect(result._tag).toBe("WithParents");
			expect(result.value).toBe(interface_);
			expect(result.parents).toBe(parents);
			expect(result.unresolved).toBe(unresolved);
		});

		test("isInterfaceOrClass type guard works", () => {
			const interface_ = createMockInterface("TestInterface");
			const class_ = createMockClass("TestClass");
			const typeAlias = createMockTypeAlias(
				"TestAlias",
				createTypeRef("string"),
			);

			expect(isInterfaceOrClass(interface_)).toBe(true);
			expect(isInterfaceOrClass(class_)).toBe(true);
			expect(isInterfaceOrClass(typeAlias)).toBe(false);
		});

		test("type guard functions work correctly", () => {
			const interface_ = createMockInterface("TestInterface");
			const class_ = createMockClass("TestClass");
			const typeAlias = createMockTypeAlias(
				"TestAlias",
				createTypeRef("string"),
			);

			expect(isTsDeclInterface(interface_)).toBe(true);
			expect(isTsDeclInterface(class_)).toBe(false);
			expect(isTsDeclInterface(typeAlias)).toBe(false);

			expect(isTsDeclClass(class_)).toBe(true);
			expect(isTsDeclClass(interface_)).toBe(false);
			expect(isTsDeclClass(typeAlias)).toBe(false);

			expect(isTsDeclTypeAlias(typeAlias)).toBe(true);
			expect(isTsDeclTypeAlias(interface_)).toBe(false);
			expect(isTsDeclTypeAlias(class_)).toBe(false);
		});
	});

	describe("ParentsResolver - convenience functions", () => {
		test("resolveParents function works", () => {
			const interface_ = createMockInterface("TestInterface");
			const scope = createMockScope(new Map());

			const result1 = ParentsResolver.apply(scope, interface_);
			const result2 = resolveParents(scope, interface_);

			expect(result1._tag).toBe(result2._tag);
			expect(result1.value).toBe(result2.value);
			expect(result1.parents.length).toBe(result2.parents.length);
			expect(result1.unresolved.length).toBe(result2.unresolved.length);
		});
	});
});
