/**
 * Tests for ModuleSpec.ts - TypeScript port of org.scalablytyped.converter.internal.ts.ModuleSpecTests
 * Comprehensive test suite ported from Scala ModuleSpecTests.scala to ensure behavioral parity
 */

import { describe, expect, test } from "bun:test";
import { none, some } from "fp-ts/Option";
import { IArray } from "@/internal/IArray.js";
import {
	DefaultedModuleSpec,
	ModuleSpec,
	NamespacedModuleSpec,
	type SpecifiedModuleSpec,
} from "@/internal/ts/ModuleSpec.js";
import {
	TsIdent,
	TsIdentApply,
	TsIdentGlobal,
	TsIdentImport,
	type TsIdentModule,
	TsIdentPrototype,
	type TsIdentSimple,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data
const createSimpleIdent = (name: string): TsIdentSimple => TsIdent.simple(name);

const createModuleIdent = (name: string): TsIdentModule =>
	TsIdent.module(none, [name]);

describe("ModuleSpec Tests", () => {
	describe("ModuleSpec Factory Methods", () => {
		test("apply with default identifier", () => {
			const spec = ModuleSpec.apply(TsIdent.default());

			expect(spec._tag).toBe("Defaulted");
			expect(ModuleSpec.isDefaulted(spec)).toBe(true);
		});

		test("apply with namespaced identifier", () => {
			const spec = ModuleSpec.apply(TsIdent.namespaced());

			expect(spec._tag).toBe("Namespaced");
			expect(ModuleSpec.isNamespaced(spec)).toBe(true);
		});

		test("apply with regular simple identifier", () => {
			const ident = createSimpleIdent("test");
			const spec = ModuleSpec.apply(ident);

			expect(ModuleSpec.isSpecified(spec)).toBe(true);
			const specified = spec as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0)).toBe(ident);
		});

		test("apply with module identifier", () => {
			const ident = createModuleIdent("lodash");
			const spec = ModuleSpec.apply(ident);

			expect(ModuleSpec.isSpecified(spec)).toBe(true);
			const specified = spec as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0)).toBe(ident);
		});

		test("apply with import identifier", () => {
			const moduleIdent = createModuleIdent("react");
			const importIdent = TsIdent.import(moduleIdent);
			const spec = ModuleSpec.apply(importIdent);

			expect(ModuleSpec.isSpecified(spec)).toBe(true);
			const specified = spec as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0)).toBe(importIdent);
		});
	});

	describe("Addition Operator (+) - Defaulted", () => {
		test("Defaulted + regular identifier", () => {
			const ident = createSimpleIdent("test");
			const result = ModuleSpec.add(ModuleSpec.defaulted(), ident);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(2);
			expect(specified.tsIdents.apply(0)).toEqual(TsIdent.default());
			expect(specified.tsIdents.apply(1)).toBe(ident);
		});

		test("Defaulted + namespaced identifier", () => {
			const result = ModuleSpec.add(
				ModuleSpec.defaulted(),
				TsIdent.namespaced(),
			);

			expect(result._tag).toBe("Defaulted");
			expect(ModuleSpec.isDefaulted(result)).toBe(true);
		});

		test("Defaulted + default identifier", () => {
			const result = ModuleSpec.add(ModuleSpec.defaulted(), TsIdent.default());

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(2);
			expect(specified.tsIdents.apply(0)).toEqual(TsIdent.default());
			expect(specified.tsIdents.apply(1)).toEqual(TsIdent.default());
		});

		test("Defaulted + module identifier", () => {
			const moduleIdent = createModuleIdent("express");
			const result = ModuleSpec.add(ModuleSpec.defaulted(), moduleIdent);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(2);
			expect(specified.tsIdents.apply(0)).toEqual(TsIdent.default());
			expect(specified.tsIdents.apply(1)).toBe(moduleIdent);
		});
	});

	describe("Addition Operator (+) - Namespaced", () => {
		test("Namespaced + regular identifier", () => {
			const ident = createSimpleIdent("Component");
			const result = ModuleSpec.add(ModuleSpec.namespaced(), ident);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0)).toBe(ident);
		});

		test("Namespaced + namespaced identifier", () => {
			const result = ModuleSpec.add(
				ModuleSpec.namespaced(),
				TsIdent.namespaced(),
			);

			expect(result._tag).toBe("Namespaced");
			expect(ModuleSpec.isNamespaced(result)).toBe(true);
		});

		test("Namespaced + default identifier", () => {
			const result = ModuleSpec.add(ModuleSpec.namespaced(), TsIdent.default());

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0)).toEqual(TsIdent.default());
		});

		test("Namespaced + multiple identifiers in sequence", () => {
			const ident1 = createSimpleIdent("React");
			const ident2 = createSimpleIdent("Component");
			let result = ModuleSpec.add(ModuleSpec.namespaced(), ident1);
			result = ModuleSpec.add(result, ident2);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(2);
			expect(specified.tsIdents.apply(0)).toBe(ident1);
			expect(specified.tsIdents.apply(1)).toBe(ident2);
		});
	});

	describe("Addition Operator (+) - Specified", () => {
		test("Specified + regular identifier", () => {
			const ident1 = createSimpleIdent("existing");
			const ident2 = createSimpleIdent("new");
			const initial = ModuleSpec.specified(IArray.apply<TsIdent>(ident1));
			const result = ModuleSpec.add(initial, ident2);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(2);
			expect(specified.tsIdents.apply(0)).toBe(ident1);
			expect(specified.tsIdents.apply(1)).toBe(ident2);
		});

		test("Specified + namespaced identifier", () => {
			const ident = createSimpleIdent("existing");
			const initial = ModuleSpec.specified(IArray.apply<TsIdent>(ident));
			const result = ModuleSpec.add(initial, TsIdent.namespaced());

			expect(result).toEqual(initial);
			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0)).toBe(ident);
		});

		test("Specified + default identifier", () => {
			const ident = createSimpleIdent("existing");
			const initial = ModuleSpec.specified(IArray.apply<TsIdent>(ident));
			const result = ModuleSpec.add(initial, TsIdent.default());

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(2);
			expect(specified.tsIdents.apply(0)).toBe(ident);
			expect(specified.tsIdents.apply(1)).toEqual(TsIdent.default());
		});

		test("Specified + multiple identifiers in sequence", () => {
			const ident1 = createSimpleIdent("first");
			const ident2 = createSimpleIdent("second");
			const ident3 = createSimpleIdent("third");

			let result: ModuleSpec = ModuleSpec.specified(
				IArray.apply<TsIdent>(ident1),
			);
			result = ModuleSpec.add(result, ident2);
			result = ModuleSpec.add(result, ident3);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(3);
			expect(specified.tsIdents.apply(0)).toBe(ident1);
			expect(specified.tsIdents.apply(1)).toBe(ident2);
			expect(specified.tsIdents.apply(2)).toBe(ident3);
		});
	});

	describe("Special Identifier Handling", () => {
		test("namespaced identifier preserves original spec", () => {
			const specs = [
				ModuleSpec.defaulted(),
				ModuleSpec.namespaced(),
				ModuleSpec.specified(IArray.apply<TsIdent>(createSimpleIdent("test"))),
			];

			specs.forEach((spec) => {
				const result = ModuleSpec.add(spec, TsIdent.namespaced());
				expect(result).toEqual(spec);
			});
		});

		test("default identifier behavior", () => {
			// Test that default identifier is treated as regular identifier in + operations
			const defaultResult = ModuleSpec.add(
				ModuleSpec.namespaced(),
				TsIdent.default(),
			);
			expect(ModuleSpec.isSpecified(defaultResult)).toBe(true);

			const specified = defaultResult as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0)).toEqual(TsIdent.default());
		});

		test("special identifiers in factory method", () => {
			// Test various special identifiers from TsIdent object
			const globalIdent = TsIdentGlobal;
			const applyIdent = TsIdentApply;
			const prototypeIdent = TsIdentPrototype;

			[globalIdent, applyIdent, prototypeIdent].forEach((ident) => {
				const spec = ModuleSpec.apply(ident);
				expect(ModuleSpec.isSpecified(spec)).toBe(true);
				const specified = spec as SpecifiedModuleSpec;
				expect(specified.tsIdents.length).toBe(1);
				expect(specified.tsIdents.apply(0)).toBe(ident);
			});
		});
	});

	describe("Equality and Identity", () => {
		test("case objects are singletons", () => {
			const defaulted1 = ModuleSpec.defaulted();
			const defaulted2 = ModuleSpec.defaulted();
			const namespaced1 = ModuleSpec.namespaced();
			const namespaced2 = ModuleSpec.namespaced();

			// In TypeScript, we check structural equality
			expect(defaulted1).toEqual(defaulted2);
			expect(namespaced1).toEqual(namespaced2);
		});

		test("Specified equality with same contents", () => {
			const ident1 = createSimpleIdent("test");
			const ident2 = createSimpleIdent("other");

			const spec1 = ModuleSpec.specified(IArray.apply<TsIdent>(ident1, ident2));
			const spec2 = ModuleSpec.specified(IArray.apply<TsIdent>(ident1, ident2));

			expect(spec1).toEqual(spec2);
		});

		test("Specified inequality with different contents", () => {
			const ident1 = createSimpleIdent("test");
			const ident2 = createSimpleIdent("other");
			const ident3 = createSimpleIdent("different");

			const spec1 = ModuleSpec.specified(IArray.apply<TsIdent>(ident1, ident2));
			const spec2 = ModuleSpec.specified(IArray.apply<TsIdent>(ident1, ident3));
			const spec3 = ModuleSpec.specified(IArray.apply<TsIdent>(ident1));

			expect(spec1).not.toEqual(spec2);
			expect(spec1).not.toEqual(spec3);
			expect(spec2).not.toEqual(spec3);
		});

		test("different spec types are not equal", () => {
			const ident = createSimpleIdent("test");
			const specified = ModuleSpec.specified(IArray.apply<TsIdent>(ident));

			expect(ModuleSpec.defaulted()).not.toEqual(ModuleSpec.namespaced());
			expect(ModuleSpec.defaulted()).not.toEqual(specified);
			expect(ModuleSpec.namespaced()).not.toEqual(specified);
		});
	});

	describe("Edge Cases and Boundary Conditions", () => {
		test("adding same identifier multiple times", () => {
			const ident = createSimpleIdent("duplicate");
			let result = ModuleSpec.add(ModuleSpec.namespaced(), ident);
			result = ModuleSpec.add(result, ident);
			result = ModuleSpec.add(result, ident);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(3);
			expect(specified.tsIdents.apply(0)).toBe(ident);
			expect(specified.tsIdents.apply(1)).toBe(ident);
			expect(specified.tsIdents.apply(2)).toBe(ident);
		});

		test("empty Specified array handling", () => {
			const emptySpec = ModuleSpec.specified(IArray.Empty);
			const ident = createSimpleIdent("test");
			const result = ModuleSpec.add(emptySpec, ident);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0)).toBe(ident);
		});

		test("mixed identifier types in sequence", () => {
			const simpleIdent = createSimpleIdent("simple");
			const moduleIdent = createModuleIdent("module");
			const importIdent = TsIdent.import(createModuleIdent("import-source"));

			let result = ModuleSpec.add(ModuleSpec.namespaced(), simpleIdent);
			result = ModuleSpec.add(result, moduleIdent);
			result = ModuleSpec.add(result, importIdent);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(3);
			expect(specified.tsIdents.apply(0)).toBe(simpleIdent);
			expect(specified.tsIdents.apply(1)).toBe(moduleIdent);
			expect(specified.tsIdents.apply(2)).toBe(importIdent);
		});

		test("namespaced identifier in middle of chain", () => {
			const ident1 = createSimpleIdent("before");
			const ident2 = createSimpleIdent("after");

			let result = ModuleSpec.add(ModuleSpec.namespaced(), ident1);
			result = ModuleSpec.add(result, TsIdent.namespaced());
			result = ModuleSpec.add(result, ident2);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(2);
			expect(specified.tsIdents.apply(0)).toBe(ident1);
			expect(specified.tsIdents.apply(1)).toBe(ident2);
		});

		test("empty identifier values", () => {
			const emptyIdent = createSimpleIdent("");
			const result = ModuleSpec.apply(emptyIdent);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0).value).toBe("");
		});

		test("very long identifier names", () => {
			const longName = "a".repeat(1000);
			const longIdent = createSimpleIdent(longName);
			const result = ModuleSpec.apply(longIdent);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0).value).toBe(longName);
		});
	});

	describe("Real-World Scenarios", () => {
		test("typical ES6 import pattern", () => {
			// Simulates: import { Component, useState } from 'react'
			const componentIdent = createSimpleIdent("Component");
			const useStateIdent = createSimpleIdent("useState");

			let result = ModuleSpec.add(ModuleSpec.namespaced(), componentIdent);
			result = ModuleSpec.add(result, useStateIdent);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(2);
			expect(specified.tsIdents.apply(0)).toBe(componentIdent);
			expect(specified.tsIdents.apply(1)).toBe(useStateIdent);
		});

		test("default import pattern", () => {
			// Simulates: import React from 'react'
			const reactIdent = createSimpleIdent("React");
			const result = ModuleSpec.add(ModuleSpec.defaulted(), reactIdent);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(2);
			expect(specified.tsIdents.apply(0)).toEqual(TsIdent.default());
			expect(specified.tsIdents.apply(1)).toBe(reactIdent);
		});

		test("mixed import pattern", () => {
			// Simulates: import React, { Component, useState } from 'react'
			const reactIdent = createSimpleIdent("React");
			const componentIdent = createSimpleIdent("Component");
			const useStateIdent = createSimpleIdent("useState");

			let result = ModuleSpec.add(ModuleSpec.defaulted(), reactIdent);
			result = ModuleSpec.add(result, componentIdent);
			result = ModuleSpec.add(result, useStateIdent);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(4);
			expect(specified.tsIdents.apply(0)).toEqual(TsIdent.default());
			expect(specified.tsIdents.apply(1)).toBe(reactIdent);
			expect(specified.tsIdents.apply(2)).toBe(componentIdent);
			expect(specified.tsIdents.apply(3)).toBe(useStateIdent);
		});

		test("scoped package identifiers", () => {
			const scopedModule = TsIdent.module(some("types"), ["node"]);
			const result = ModuleSpec.apply(scopedModule);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1);
			expect(specified.tsIdents.apply(0)).toBe(scopedModule);
			expect(specified.tsIdents.apply(0).value).toBe("@types/node");
		});

		test("complex module path", () => {
			const complexModule = TsIdent.module(some("babel"), [
				"core",
				"lib",
				"transform",
			]);
			const helperIdent = createSimpleIdent("helper");

			const result = ModuleSpec.add(
				ModuleSpec.apply(complexModule),
				helperIdent,
			);

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(2);
			expect(specified.tsIdents.apply(0)).toBe(complexModule);
			expect(specified.tsIdents.apply(1)).toBe(helperIdent);
		});
	});

	describe("Performance and Memory", () => {
		test("large number of identifiers", () => {
			const identifiers = Array.from({ length: 1000 }, (_, i) =>
				createSimpleIdent(`ident${i + 1}`),
			);
			let result: ModuleSpec = ModuleSpec.namespaced();

			identifiers.forEach((ident) => {
				result = ModuleSpec.add(result, ident);
			});

			expect(ModuleSpec.isSpecified(result)).toBe(true);
			const specified = result as SpecifiedModuleSpec;
			expect(specified.tsIdents.length).toBe(1000);

			// Verify first and last elements
			expect(specified.tsIdents.apply(0).value).toBe("ident1");
			expect(specified.tsIdents.apply(999).value).toBe("ident1000");
		});

		test("repeated operations maintain consistency", () => {
			const ident = createSimpleIdent("test");
			const spec1 = ModuleSpec.apply(ident);
			const spec2 = ModuleSpec.apply(ident);
			const spec3 = ModuleSpec.apply(ident);

			expect(spec1).toEqual(spec2);
			expect(spec2).toEqual(spec3);
			expect(spec1).toEqual(spec3);

			// Test addition consistency
			const result1 = ModuleSpec.add(spec1, ident);
			const result2 = ModuleSpec.add(spec2, ident);
			const result3 = ModuleSpec.add(spec3, ident);

			expect(result1).toEqual(result2);
			expect(result2).toEqual(result3);
			expect(result1).toEqual(result3);
		});
	});

	describe("Type Guards", () => {
		test("isDefaulted type guard", () => {
			const defaulted = ModuleSpec.defaulted();
			const namespaced = ModuleSpec.namespaced();
			const specified = ModuleSpec.specified(
				IArray.apply<TsIdent>(createSimpleIdent("test")),
			);

			expect(ModuleSpec.isDefaulted(defaulted)).toBe(true);
			expect(ModuleSpec.isDefaulted(namespaced)).toBe(false);
			expect(ModuleSpec.isDefaulted(specified)).toBe(false);
		});

		test("isNamespaced type guard", () => {
			const defaulted = ModuleSpec.defaulted();
			const namespaced = ModuleSpec.namespaced();
			const specified = ModuleSpec.specified(
				IArray.apply<TsIdent>(createSimpleIdent("test")),
			);

			expect(ModuleSpec.isNamespaced(defaulted)).toBe(false);
			expect(ModuleSpec.isNamespaced(namespaced)).toBe(true);
			expect(ModuleSpec.isNamespaced(specified)).toBe(false);
		});

		test("isSpecified type guard", () => {
			const defaulted = ModuleSpec.defaulted();
			const namespaced = ModuleSpec.namespaced();
			const specified = ModuleSpec.specified(
				IArray.apply<TsIdent>(createSimpleIdent("test")),
			);

			expect(ModuleSpec.isSpecified(defaulted)).toBe(false);
			expect(ModuleSpec.isSpecified(namespaced)).toBe(false);
			expect(ModuleSpec.isSpecified(specified)).toBe(true);
		});
	});
});
