/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.ExpandedModTests
 * Tests for ExpandedMod.ts - comprehensive test coverage matching the original Scala implementation
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { ExpandedMod } from "@/internal/ts/modules/ExpandedMod.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import {
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclFunction,
	TsDeclInterface,
	TsDeclNamespace,
	TsDeclTypeAlias,
	TsDeclVar,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	type TsMember,
	type TsNamedDecl,
	TsParsedFile,
	TsQIdent,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data specific to ExpandedMod tests

function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]): TsQIdent {
	return TsQIdent.ofStrings(...parts);
}

function createMockInterface(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclInterface {
	return TsDeclInterface.create(
		Comments.empty(),
		false,
		createSimpleIdent(name),
		IArray.Empty, // tparams
		IArray.Empty, // inheritance
		members,
		codePath,
	);
}

function createMockClass(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclClass {
	return TsDeclClass.create(
		Comments.empty(),
		false, // declared
		false, // isAbstract
		createSimpleIdent(name),
		IArray.Empty, // tparams
		none, // parent
		IArray.Empty, // implementsInterfaces
		members,
		JsLocation.zero(),
		codePath,
	);
}

function createMockNamespace(
	name: string,
	members: IArray<TsContainerOrDecl> = IArray.Empty,
	codePath: CodePath = CodePath.noPath(),
): TsDeclNamespace {
	return TsDeclNamespace.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		members,
		codePath,
		JsLocation.zero(),
	);
}

function createMockVar(
	name: string,
	tpe: TsTypeRef = TsTypeRef.any,
	codePath: CodePath = CodePath.noPath(),
): TsDeclVar {
	return TsDeclVar.create(
		Comments.empty(),
		false, // declared
		false, // readOnly
		createSimpleIdent(name),
		some(tpe),
		none, // expr
		JsLocation.zero(),
		codePath,
	);
}

function createMockFunction(
	name: string,
	signature: TsFunSig = TsFunSig.create(
		Comments.empty(),
		IArray.Empty,
		IArray.Empty,
		some(TsTypeRef.any),
	),
	codePath: CodePath = CodePath.noPath(),
): TsDeclFunction {
	return TsDeclFunction.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		signature,
		JsLocation.zero(),
		codePath,
	);
}

function createMockTypeAlias(
	name: string,
	alias: TsTypeRef = TsTypeRef.any,
	codePath: CodePath = CodePath.noPath(),
): TsDeclTypeAlias {
	return TsDeclTypeAlias.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		alias,
		codePath,
	);
}

function createMockScope(): TsTreeScope.Root {
	const libName = TsIdent.librarySimple("test-lib");
	const logger = Logger.DevNull();
	const deps = new Map();
	return TsTreeScope.create(libName, false, deps, logger);
}

function createScopedScope(container: TsContainerOrDecl): TsTreeScope.Scoped {
	const root = createMockScope();
	return root["/"](container);
}

function createHasPath(...parts: string[]): CodePath {
	if (parts.length === 0) {
		return CodePath.noPath();
	}
	const [library, ...pathParts] = parts;
	const libraryIdent = TsIdent.simple(library);
	const qident = pathParts.length > 0
		? TsQIdent.ofStrings(...pathParts)
		: TsQIdent.of(libraryIdent);
	return CodePath.hasPath(libraryIdent, qident);
}

describe("ExpandedMod", () => {
	describe("ExpandedMod.Whole - Basic Functionality", () => {
		test("creates Whole with all empty arrays", () => {
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole = ExpandedMod.Whole(IArray.Empty, IArray.Empty, IArray.Empty, scope);

			expect(whole.defaults.isEmpty).toBe(true);
			expect(whole.namespaced.isEmpty).toBe(true);
			expect(whole.rest.isEmpty).toBe(true);
			expect(whole.scope).toBe(scope);
			expect(whole.nonEmpty).toBe(false);
		});

		test("creates Whole with non-empty defaults", () => {
			const interface1 = createMockInterface("Interface1");
			const interface2 = createMockInterface("Interface2");
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole = ExpandedMod.Whole(
				IArray.fromArray([interface1, interface2] as TsNamedDecl[]),
				IArray.Empty,
				IArray.Empty,
				scope,
			);

			expect(whole.defaults.length).toBe(2);
			expect(whole.namespaced.isEmpty).toBe(true);
			expect(whole.rest.isEmpty).toBe(true);
			expect(whole.nonEmpty).toBe(true);
		});

		test("creates Whole with non-empty namespaced", () => {
			const namespace1 = createMockNamespace("Namespace1");
			const namespace2 = createMockNamespace("Namespace2");
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole = ExpandedMod.Whole(
				IArray.Empty,
				IArray.fromArray([namespace1, namespace2] as TsNamedDecl[]),
				IArray.Empty,
				scope,
			);

			expect(whole.defaults.isEmpty).toBe(true);
			expect(whole.namespaced.length).toBe(2);
			expect(whole.rest.isEmpty).toBe(true);
			expect(whole.nonEmpty).toBe(true);
		});

		test("creates Whole with non-empty rest", () => {
			const var1 = createMockVar("var1");
			const func1 = createMockFunction("func1");
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole = ExpandedMod.Whole(
				IArray.Empty,
				IArray.Empty,
				IArray.fromArray([var1, func1] as TsNamedDecl[]),
				scope,
			);

			expect(whole.defaults.isEmpty).toBe(true);
			expect(whole.namespaced.isEmpty).toBe(true);
			expect(whole.rest.length).toBe(2);
			expect(whole.nonEmpty).toBe(true);
		});
	});

	describe("ExpandedMod.Whole - Positive Cases", () => {
		test("creates Whole with all arrays populated", () => {
			const interface1 = createMockInterface("Interface1");
			const namespace1 = createMockNamespace("Namespace1");
			const var1 = createMockVar("var1");
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole = ExpandedMod.Whole(
				IArray.fromArray([interface1] as TsNamedDecl[]),
				IArray.fromArray([namespace1] as TsNamedDecl[]),
				IArray.fromArray([var1] as TsNamedDecl[]),
				scope,
			);

			expect(whole.defaults.length).toBe(1);
			expect(whole.namespaced.length).toBe(1);
			expect(whole.rest.length).toBe(1);
			expect(whole.nonEmpty).toBe(true);
		});

		test("creates Whole with mixed declaration types", () => {
			const interface1 = createMockInterface("Interface1");
			const class1 = createMockClass("Class1");
			const func1 = createMockFunction("func1");
			const typeAlias1 = createMockTypeAlias("TypeAlias1");
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole = ExpandedMod.Whole(
				IArray.fromArray([interface1, class1] as TsNamedDecl[]),
				IArray.Empty,
				IArray.fromArray([func1, typeAlias1] as TsNamedDecl[]),
				scope,
			);

			expect(whole.defaults.length).toBe(2);
			expect(whole.rest.length).toBe(2);
			expect(whole.nonEmpty).toBe(true);
		});

		test("creates Whole with large arrays", () => {
			const interfaces = Array.from({ length: 10 }, (_, i) => createMockInterface(`Interface${i + 1}`));
			const namespaces = Array.from({ length: 5 }, (_, i) => createMockNamespace(`Namespace${i + 1}`));
			const vars = Array.from({ length: 15 }, (_, i) => createMockVar(`var${i + 1}`));
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole = ExpandedMod.Whole(
				IArray.fromArray(interfaces as TsNamedDecl[]),
				IArray.fromArray(namespaces as TsNamedDecl[]),
				IArray.fromArray(vars as TsNamedDecl[]),
				scope,
			);

			expect(whole.defaults.length).toBe(10);
			expect(whole.namespaced.length).toBe(5);
			expect(whole.rest.length).toBe(15);
			expect(whole.nonEmpty).toBe(true);
		});
	});

	describe("ExpandedMod.Picked - Basic Functionality", () => {
		test("creates Picked with empty things array", () => {
			const picked = ExpandedMod.Picked(IArray.Empty);

			expect(picked.things.isEmpty).toBe(true);
			expect(picked.nonEmpty).toBe(false);
		});

		test("creates Picked with single thing", () => {
			const interface1 = createMockInterface("Interface1");
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const picked = ExpandedMod.Picked(IArray.fromArray([[interface1, scope]] as [TsNamedDecl, TsTreeScope][]));

			expect(picked.things.length).toBe(1);
			expect(picked.things.get(0)[0]).toBe(interface1);
			expect(picked.things.get(0)[1]).toBe(scope);
			expect(picked.nonEmpty).toBe(true);
		});

		test("creates Picked with multiple things", () => {
			const interface1 = createMockInterface("Interface1");
			const class1 = createMockClass("Class1");
			const scope1 = createScopedScope(createMockNamespace("TestScope1"));
			const scope2 = createScopedScope(createMockNamespace("TestScope2"));
			const picked = ExpandedMod.Picked(IArray.fromArray([[interface1, scope1], [class1, scope2]] as [TsNamedDecl, TsTreeScope][]));

			expect(picked.things.length).toBe(2);
			expect(picked.things.get(0)[0]).toBe(interface1);
			expect(picked.things.get(0)[1]).toBe(scope1);
			expect(picked.things.get(1)[0]).toBe(class1);
			expect(picked.things.get(1)[1]).toBe(scope2);
			expect(picked.nonEmpty).toBe(true);
		});
	});

	describe("ExpandedMod.Whole - Edge Cases", () => {
		test("nonEmpty returns true when only defaults is non-empty", () => {
			const interface1 = createMockInterface("Interface1");
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole = ExpandedMod.Whole(
				IArray.fromArray([interface1] as TsNamedDecl[]),
				IArray.Empty,
				IArray.Empty,
				scope,
			);

			expect(whole.nonEmpty).toBe(true);
		});

		test("nonEmpty returns true when only namespaced is non-empty", () => {
			const namespace1 = createMockNamespace("Namespace1");
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole = ExpandedMod.Whole(
				IArray.Empty,
				IArray.fromArray([namespace1] as TsNamedDecl[]),
				IArray.Empty,
				scope,
			);

			expect(whole.nonEmpty).toBe(true);
		});

		test("nonEmpty returns true when only rest is non-empty", () => {
			const var1 = createMockVar("var1");
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole = ExpandedMod.Whole(
				IArray.Empty,
				IArray.Empty,
				IArray.fromArray([var1] as TsNamedDecl[]),
				scope,
			);

			expect(whole.nonEmpty).toBe(true);
		});
	});

	describe("ExpandedMod.Picked - Positive Cases", () => {
		test("creates Picked with different declaration types", () => {
			const interface1 = createMockInterface("Interface1");
			const class1 = createMockClass("Class1");
			const func1 = createMockFunction("func1");
			const var1 = createMockVar("var1");
			const typeAlias1 = createMockTypeAlias("TypeAlias1");
			const scope = createScopedScope(createMockNamespace("TestScope"));

			const picked = ExpandedMod.Picked(
				IArray.fromArray([
					[interface1, scope],
					[class1, scope],
					[func1, scope],
					[var1, scope],
					[typeAlias1, scope],
				] as [TsNamedDecl, TsTreeScope][]),
			);

			expect(picked.things.length).toBe(5);
			expect(picked.nonEmpty).toBe(true);

			// Verify each declaration type is preserved
			expect(picked.things.get(0)[0]._tag).toBe("TsDeclInterface");
			expect(picked.things.get(1)[0]._tag).toBe("TsDeclClass");
			expect(picked.things.get(2)[0]._tag).toBe("TsDeclFunction");
			expect(picked.things.get(3)[0]._tag).toBe("TsDeclVar");
			expect(picked.things.get(4)[0]._tag).toBe("TsDeclTypeAlias");
		});

		test("creates Picked with different scopes", () => {
			const interface1 = createMockInterface("Interface1");
			const interface2 = createMockInterface("Interface2");
			const scope1 = createScopedScope(createMockNamespace("TestScope1"));
			const scope2 = createScopedScope(createMockNamespace("TestScope2"));
			const picked = ExpandedMod.Picked(IArray.fromArray([[interface1, scope1], [interface2, scope2]] as [TsNamedDecl, TsTreeScope][]));

			expect(picked.things.length).toBe(2);
			expect(picked.things.get(0)[1]).toBe(scope1);
			expect(picked.things.get(1)[1]).toBe(scope2);
			expect(picked.nonEmpty).toBe(true);
		});

		test("creates Picked with large number of things", () => {
			const declarations = Array.from({ length: 20 }, (_, i) => createMockInterface(`Interface${i + 1}`));
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const things = declarations.map(decl => [decl, scope] as [TsNamedDecl, TsTreeScope]);
			const picked = ExpandedMod.Picked(IArray.fromArray(things));

			expect(picked.things.length).toBe(20);
			expect(picked.nonEmpty).toBe(true);

			// Verify all declarations are preserved
			declarations.forEach((decl, index) => {
				expect(picked.things.get(index)[0]).toBe(decl);
				expect(picked.things.get(index)[1]).toBe(scope);
			});
		});
	});

	describe("ExpandedMod.Picked - Edge Cases", () => {
		test("handles same declaration with different scopes", () => {
			const interface1 = createMockInterface("Interface1");
			const scope1 = createScopedScope(createMockNamespace("TestScope1"));
			const scope2 = createScopedScope(createMockNamespace("TestScope2"));
			const picked = ExpandedMod.Picked(IArray.fromArray([[interface1, scope1], [interface1, scope2]] as [TsNamedDecl, TsTreeScope][]));

			expect(picked.things.length).toBe(2);
			expect(picked.things.get(0)[0]).toBe(interface1);
			expect(picked.things.get(1)[0]).toBe(interface1);
			expect(picked.things.get(0)[1]).toBe(scope1);
			expect(picked.things.get(1)[1]).toBe(scope2);
			expect(picked.nonEmpty).toBe(true);
		});

		test("handles different declarations with same scope", () => {
			const interface1 = createMockInterface("Interface1");
			const interface2 = createMockInterface("Interface2");
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const picked = ExpandedMod.Picked(IArray.fromArray([[interface1, scope], [interface2, scope]] as [TsNamedDecl, TsTreeScope][]));

			expect(picked.things.length).toBe(2);
			expect(picked.things.get(0)[0]).toBe(interface1);
			expect(picked.things.get(1)[0]).toBe(interface2);
			expect(picked.things.get(0)[1]).toBe(scope);
			expect(picked.things.get(1)[1]).toBe(scope);
			expect(picked.nonEmpty).toBe(true);
		});
	});

	describe("ExpandedMod - Polymorphic Behavior", () => {
		test("Whole and Picked both extend ExpandedMod", () => {
			const scope = createScopedScope(createMockNamespace("TestScope"));
			const whole: ExpandedMod = ExpandedMod.Whole(IArray.Empty, IArray.Empty, IArray.Empty, scope);
			const picked: ExpandedMod = ExpandedMod.Picked(IArray.Empty);

			expect(ExpandedMod.isWhole(whole)).toBe(true);
			expect(ExpandedMod.isPicked(picked)).toBe(true);
			expect(whole.nonEmpty).toBe(false);
			expect(picked.nonEmpty).toBe(false);
		});

		test("nonEmpty method works polymorphically", () => {
			const interface1 = createMockInterface("Interface1");
			const scope = createScopedScope(createMockNamespace("TestScope"));

			const wholeEmpty: ExpandedMod = ExpandedMod.Whole(IArray.Empty, IArray.Empty, IArray.Empty, scope);
			const wholeNonEmpty: ExpandedMod = ExpandedMod.Whole(IArray.fromArray([interface1] as TsNamedDecl[]), IArray.Empty, IArray.Empty, scope);
			const pickedEmpty: ExpandedMod = ExpandedMod.Picked(IArray.Empty);
			const pickedNonEmpty: ExpandedMod = ExpandedMod.Picked(IArray.fromArray([[interface1, scope]] as [TsNamedDecl, TsTreeScope][]));

			expect(wholeEmpty.nonEmpty).toBe(false);
			expect(wholeNonEmpty.nonEmpty).toBe(true);
			expect(pickedEmpty.nonEmpty).toBe(false);
			expect(pickedNonEmpty.nonEmpty).toBe(true);
		});
	});

	describe("ExpandedMod - Boundary Conditions", () => {
		test("handles declarations with complex CodePaths", () => {
			const complexPath = createHasPath("deeply", "nested", "module", "Interface1");
			const interface1 = createMockInterface("Interface1", IArray.Empty, complexPath);
			const scope = createScopedScope(createMockNamespace("TestScope"));

			const whole = ExpandedMod.Whole(IArray.fromArray([interface1] as TsNamedDecl[]), IArray.Empty, IArray.Empty, scope);
			const picked = ExpandedMod.Picked(IArray.fromArray([[interface1, scope]] as [TsNamedDecl, TsTreeScope][]));

			expect(whole.nonEmpty).toBe(true);
			expect(picked.nonEmpty).toBe(true);
			expect(whole.defaults.get(0).codePath).toBe(complexPath);
			expect(picked.things.get(0)[0].codePath).toBe(complexPath);
		});

		test("handles declarations with no CodePath", () => {
			const interface1 = createMockInterface("Interface1", IArray.Empty, CodePath.noPath());
			const scope = createScopedScope(createMockNamespace("TestScope"));

			const whole = ExpandedMod.Whole(IArray.fromArray([interface1] as TsNamedDecl[]), IArray.Empty, IArray.Empty, scope);
			const picked = ExpandedMod.Picked(IArray.fromArray([[interface1, scope]] as [TsNamedDecl, TsTreeScope][]));

			expect(whole.nonEmpty).toBe(true);
			expect(picked.nonEmpty).toBe(true);
			expect(whole.defaults.get(0).codePath._tag).toBe("NoPath");
			expect(picked.things.get(0)[0].codePath._tag).toBe("NoPath");
		});
	});

	describe("ExpandedMod - Complex Scenarios", () => {
		test("handles nested namespaces in scopes", () => {
			const outerNamespace = createMockNamespace("OuterNamespace");
			const innerNamespace = createMockNamespace("InnerNamespace");
			const interface1 = createMockInterface("Interface1");

			const rootScope = createMockScope();
			const outerScope = rootScope["/"](outerNamespace);
			const innerScope = outerScope["/"](innerNamespace);

			const whole = ExpandedMod.Whole(IArray.fromArray([interface1] as TsNamedDecl[]), IArray.Empty, IArray.Empty, innerScope);
			const picked = ExpandedMod.Picked(IArray.fromArray([[interface1, innerScope]] as [TsNamedDecl, TsTreeScope][]));

			expect(whole.nonEmpty).toBe(true);
			expect(picked.nonEmpty).toBe(true);
			expect(whole.scope).toBe(innerScope);
			expect(picked.things.get(0)[1]).toBe(innerScope);
		});

		test("simulates module expansion scenario", () => {
			// Simulate a typical module with default exports, namespaced exports, and regular exports
			const defaultClass = createMockClass("DefaultExport");
			const utilNamespace = createMockNamespace("Utils");
			const helperFunction = createMockFunction("helperFunction");
			const constantVar = createMockVar("CONSTANT");
			const typeAlias = createMockTypeAlias("MyType");

			const moduleScope = createScopedScope(createMockNamespace("MyModule"));

			const expandedMod = ExpandedMod.Whole(
				IArray.fromArray([defaultClass] as TsNamedDecl[]),
				IArray.fromArray([utilNamespace] as TsNamedDecl[]),
				IArray.fromArray([helperFunction, constantVar, typeAlias] as TsNamedDecl[]),
				moduleScope,
			);

			expect(expandedMod.nonEmpty).toBe(true);
			expect(expandedMod.defaults.length).toBe(1);
			expect(expandedMod.namespaced.length).toBe(1);
			expect(expandedMod.rest.length).toBe(3);

			// Verify types
			expect(expandedMod.defaults.get(0)._tag).toBe("TsDeclClass");
			expect(expandedMod.namespaced.get(0)._tag).toBe("TsDeclNamespace");
			expect(expandedMod.rest.get(0)._tag).toBe("TsDeclFunction");
			expect(expandedMod.rest.get(1)._tag).toBe("TsDeclVar");
			expect(expandedMod.rest.get(2)._tag).toBe("TsDeclTypeAlias");
		});

		test("simulates selective import scenario", () => {
			// Simulate importing specific items from different modules
			const reactComponent = createMockInterface("Component");
			const reactScope = createScopedScope(createMockNamespace("React"));

			const lodashFunction = createMockFunction("map");
			const lodashScope = createScopedScope(createMockNamespace("Lodash"));

			const expandedMod = ExpandedMod.Picked(
				IArray.fromArray([
					[reactComponent, reactScope],
					[lodashFunction, lodashScope],
				] as [TsNamedDecl, TsTreeScope][]),
			);

			expect(expandedMod.nonEmpty).toBe(true);
			expect(expandedMod.things.length).toBe(2);
			expect(expandedMod.things.get(0)[0].name.value).toBe("Component");
			expect(expandedMod.things.get(1)[0].name.value).toBe("map");
		});
	});
});
