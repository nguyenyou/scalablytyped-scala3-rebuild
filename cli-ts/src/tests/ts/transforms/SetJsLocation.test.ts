/**
 * Tests for SetJsLocation transform.
 *
 * Port of org.scalablytyped.converter.internal.ts.transforms.SetJsLocationTests
 */

import { describe, expect, it } from "bun:test";
import { IArray } from "@/internal/IArray.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { AbstractTreeTransformation } from "@/internal/ts/TreeTransformation.js";
import { SetJsLocationTransform } from "@/internal/ts/transforms/SetJsLocation.js";
import {
	createJsLocationBoth,
	createJsLocationGlobal,
	createJsLocationModule,
	createMockClass,
	createMockEnum,
	createMockFunction,
	createMockGlobal,
	createMockInterface,
	createMockModule,
	createMockNamespace,
	createMockParsedFile,
	createMockTypeAlias,
	createMockVariable,
} from "@/tests/utils/TestUtils.js";

describe("SetJsLocation", () => {
	describe("Basic Functionality", () => {
		it("extends AbstractTreeTransformation", () => {
			expect(SetJsLocationTransform).toBeInstanceOf(AbstractTreeTransformation);
		});

		it("has enterTsDecl method", () => {
			const jsLocation = JsLocation.zero();
			const clazz = createMockClass("TestClass");
			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(clazz);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsDeclClass");
		});

		it("has enterTsContainer method", () => {
			const jsLocation = JsLocation.zero();
			const namespace = createMockNamespace("TestNamespace");
			const result =
				SetJsLocationTransform.enterTsContainer(jsLocation)(namespace);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsDeclNamespace");
		});

		it("has enterTsParsedFile method", () => {
			const jsLocation = JsLocation.zero();
			const parsedFile = createMockParsedFile("test-lib");
			const result =
				SetJsLocationTransform.enterTsParsedFile(jsLocation)(parsedFile);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsParsedFile");
		});

		it("has withTree method", () => {
			const jsLocation = JsLocation.zero();
			const clazz = createMockClass("TestClass");
			const result = SetJsLocationTransform.withTree(jsLocation, clazz);
			expect(result).toBeDefined();
		});
	});

	describe("JS Location Setting on Declarations", () => {
		it("sets JS location on class declaration", () => {
			const jsLocation = createJsLocationGlobal("MyGlobal");
			const clazz = createMockClass("TestClass");

			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(clazz);

			expect(result._tag).toBe("TsDeclClass");
			const resultClass = result as any;
			expect(resultClass.jsLocation).toBe(jsLocation);
			expect(resultClass.name.value).toBe("TestClass");
		});

		it("sets JS location on function declaration", () => {
			const jsLocation = createJsLocationGlobal("MyGlobal");
			const func = createMockFunction("testFunc");

			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(func);

			expect(result._tag).toBe("TsDeclFunction");
			const resultFunc = result as any;
			expect(resultFunc.jsLocation).toBe(jsLocation);
			expect(resultFunc.name.value).toBe("testFunc");
		});

		it("sets JS location on variable declaration", () => {
			const jsLocation = createJsLocationGlobal("MyGlobal");
			const variable = createMockVariable("testVar");

			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(variable);

			expect(result._tag).toBe("TsDeclVar");
			const resultVar = result as any;
			expect(resultVar.jsLocation).toBe(jsLocation);
			expect(resultVar.name.value).toBe("testVar");
		});

		it("sets JS location on enum declaration", () => {
			const jsLocation = createJsLocationGlobal("MyGlobal");
			const enumDecl = createMockEnum("TestEnum", IArray.Empty);

			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(enumDecl);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as any;
			expect(resultEnum.jsLocation).toBe(jsLocation);
			expect(resultEnum.name.value).toBe("TestEnum");
		});

		it("leaves interface declarations unchanged (no JsLocation.Has)", () => {
			const jsLocation = createJsLocationGlobal("MyGlobal");
			const interface_ = createMockInterface("TestInterface");

			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(interface_);

			expect(result._tag).toBe("TsDeclInterface");
			expect(result).toBe(interface_); // Should remain unchanged
		});

		it("leaves type alias declarations unchanged (no JsLocation.Has)", () => {
			const jsLocation = createJsLocationGlobal("MyGlobal");
			const typeAlias = createMockTypeAlias("TestType", {
				_tag: "TsTypeRef",
				asString: "string",
			} as any);

			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(typeAlias);

			expect(result._tag).toBe("TsDeclTypeAlias");
			expect(result).toBe(typeAlias); // Should remain unchanged
		});
	});

	describe("JS Location Setting on Containers", () => {
		it("sets JS location on namespace container", () => {
			const jsLocation = createJsLocationModule("test-module");
			const namespace = createMockNamespace("TestNamespace");

			const result =
				SetJsLocationTransform.enterTsContainer(jsLocation)(namespace);

			expect(result._tag).toBe("TsDeclNamespace");
			const resultNamespace = result as any;
			expect(resultNamespace.jsLocation).toBe(jsLocation);
		});

		it("sets JS location on module container", () => {
			const jsLocation = createJsLocationModule("test-module");
			const module = createMockModule("TestModule");

			const result =
				SetJsLocationTransform.enterTsContainer(jsLocation)(module);

			expect(result._tag).toBe("TsDeclModule");
			const resultModule = result as any;
			expect(resultModule.jsLocation).toBe(jsLocation);
		});

		it("leaves global container unchanged (no JsLocation.Has)", () => {
			const jsLocation = JsLocation.zero();
			const global = createMockGlobal();

			const result =
				SetJsLocationTransform.enterTsContainer(jsLocation)(global);

			expect(result._tag).toBe("TsGlobal");
			expect(result).toBe(global); // Should remain unchanged since TsGlobal doesn't implement JsLocation.Has
		});
	});

	describe("JS Location Setting on Parsed Files", () => {
		it("leaves parsed file unchanged (no JsLocation.Has in Scala)", () => {
			const jsLocation = createJsLocationGlobal("MyGlobal");
			const parsedFile = createMockParsedFile("test-lib");

			const result =
				SetJsLocationTransform.enterTsParsedFile(jsLocation)(parsedFile);

			expect(result._tag).toBe("TsParsedFile");
			expect(result).toBe(parsedFile); // Should remain unchanged since TsParsedFile doesn't implement JsLocation.Has in Scala
		});
	});

	describe("Tree Navigation", () => {
		it("navigates from Zero to Global for named declaration", () => {
			const jsLocation = JsLocation.zero();
			const clazz = createMockClass("TestClass");

			const result = SetJsLocationTransform.withTree(jsLocation, clazz);

			expect(JsLocation.isGlobal(result)).toBe(true);
			if (JsLocation.isGlobal(result)) {
				expect(result.jsPath.parts.toArray().map((p) => p.value)).toEqual([
					"TestClass",
				]);
			}
		});

		it("navigates from Zero to Module for module declaration", () => {
			const jsLocation = JsLocation.zero();
			const module = createMockModule("TestModule");

			const result = SetJsLocationTransform.withTree(jsLocation, module);

			expect(JsLocation.isModule(result)).toBe(true);
			if (JsLocation.isModule(result)) {
				expect(result.module.value).toBe("TestModule");
				expect(result.spec._tag).toBe("Namespaced");
			}
		});

		it("navigates from Global to extended Global for named declaration", () => {
			const jsLocation = createJsLocationGlobal("MyGlobal");
			const clazz = createMockClass("TestClass");

			const result = SetJsLocationTransform.withTree(jsLocation, clazz);

			expect(JsLocation.isGlobal(result)).toBe(true);
			if (JsLocation.isGlobal(result)) {
				expect(result.jsPath.parts.toArray().map((p) => p.value)).toEqual([
					"MyGlobal",
					"TestClass",
				]);
			}
		});

		it("navigates from Global to Zero for global declaration", () => {
			const jsLocation = createJsLocationGlobal("MyGlobal");
			const global = createMockGlobal();

			const result = SetJsLocationTransform.withTree(jsLocation, global);

			expect(JsLocation.isZero(result)).toBe(true);
		});

		it("preserves location for non-navigable trees", () => {
			const jsLocation = createJsLocationGlobal("test");
			const typeRef = {
				_tag: "TsTypeRef" as const,
				comments: {} as any,
				name: {} as any,
				tparams: IArray.Empty,
				asString: "TsTypeRef(test)",
			};

			const result = SetJsLocationTransform.withTree(
				jsLocation,
				typeRef as any,
			);

			expect(result).toBe(jsLocation); // Should remain unchanged for non-navigable trees
		});

		it("handles namespaced identifiers", () => {
			const jsLocation = JsLocation.zero();
			const namespacedClass = createMockClass("^"); // TsIdent.namespaced

			const result = SetJsLocationTransform.withTree(
				jsLocation,
				namespacedClass,
			);

			expect(JsLocation.isZero(result)).toBe(true); // Should remain Zero for namespaced identifiers
		});
	});

	describe("JsLocation Types", () => {
		it("handles Zero location", () => {
			const jsLocation = JsLocation.zero();
			const clazz = createMockClass("TestClass");

			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(clazz);

			expect(result._tag).toBe("TsDeclClass");
			const resultClass = result as any;
			expect(resultClass.jsLocation).toBe(jsLocation);
		});

		it("handles Global location", () => {
			const jsLocation = createJsLocationGlobal("GlobalName");
			const clazz = createMockClass("TestClass");

			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(clazz);

			expect(result._tag).toBe("TsDeclClass");
			const resultClass = result as any;
			expect(resultClass.jsLocation).toBe(jsLocation);
		});

		it("handles Module location", () => {
			const jsLocation = createJsLocationModule("test-module");
			const clazz = createMockClass("TestClass");

			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(clazz);

			expect(result._tag).toBe("TsDeclClass");
			const resultClass = result as any;
			expect(resultClass.jsLocation).toBe(jsLocation);
		});

		it("handles Both location", () => {
			const jsLocation = createJsLocationBoth("test-module", "GlobalName");
			const clazz = createMockClass("TestClass");

			const result = SetJsLocationTransform.enterTsDecl(jsLocation)(clazz);

			expect(result._tag).toBe("TsDeclClass");
			const resultClass = result as any;
			expect(resultClass.jsLocation).toBe(jsLocation);
		});
	});
});
