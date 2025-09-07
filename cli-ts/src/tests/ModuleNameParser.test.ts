import * as O from "fp-ts/Option";
import { describe, expect, test } from "vitest";
import { ModuleNameParser } from "@/internal/ts/ModuleNameParser";

describe("ModuleNameParser", () => {
	describe("Happy Path - Basic Functionality", () => {
		test("simple module name from string literal", () => {
			const result = ModuleNameParser.fromString("lodash");
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["lodash"]);
			expect(result.value).toBe("lodash");
		});

		test("simple module name from fragments", () => {
			const result = ModuleNameParser.apply(["lodash"], true);
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["lodash"]);
			expect(result.value).toBe("lodash");
		});

		test("scoped module name", () => {
			const result = ModuleNameParser.fromString("@angular/core");
			expect(O.isSome(result.scopeOpt) && result.scopeOpt.value).toBe(
				"angular",
			);
			expect(result.fragments).toEqual(["core"]);
			expect(result.value).toBe("@angular/core");
		});

		test("multi-fragment module path", () => {
			const result = ModuleNameParser.fromString("lodash/fp/curry");
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["lodash", "fp", "curry"]);
			expect(result.value).toBe("lodash/fp/curry");
		});

		test("scoped module with multiple fragments", () => {
			const result = ModuleNameParser.fromString(
				"@babel/plugin-transform-runtime",
			);
			expect(O.isSome(result.scopeOpt) && result.scopeOpt.value).toBe("babel");
			expect(result.fragments).toEqual(["plugin-transform-runtime"]);
			expect(result.value).toBe("@babel/plugin-transform-runtime");
		});
	});

	describe("Core Functionality - Fragment Processing", () => {
		test("removes @types prefix", () => {
			const result = ModuleNameParser.apply(["@types", "node"], true);
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["node"]);
			expect(result.value).toBe("node");
		});

		test("handles tilde prefix", () => {
			const result = ModuleNameParser.apply(["~lodash"], true);
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["lodash"]);
			expect(result.value).toBe("lodash");
		});

		test("converts double underscore to scoped package", () => {
			const result = ModuleNameParser.apply(["angular__core"], true);
			expect(O.isSome(result.scopeOpt) && result.scopeOpt.value).toBe(
				"angular",
			);
			expect(result.fragments).toEqual(["core"]);
			expect(result.value).toBe("@angular/core");
		});

		test("removes .d.ts extension", () => {
			const result = ModuleNameParser.apply(["lodash.d.ts"], true);
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["lodash"]);
			expect(result.value).toBe("lodash");
		});

		test("removes .ts extension", () => {
			const result = ModuleNameParser.apply(["utils.ts"], true);
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["utils"]);
			expect(result.value).toBe("utils");
		});

		test("removes index fragment when keepIndexFragment is false", () => {
			const result1 = ModuleNameParser.apply(["lodash", "index"], false);
			expect(O.isNone(result1.scopeOpt)).toBe(true);
			expect(result1.fragments).toEqual(["lodash"]);
			expect(result1.value).toBe("lodash");

			const result2 = ModuleNameParser.apply(["lodash", "index.d.ts"], false);
			expect(O.isNone(result2.scopeOpt)).toBe(true);
			expect(result2.fragments).toEqual(["lodash"]);
			expect(result2.value).toBe("lodash");
		});

		test("keeps index fragment when keepIndexFragment is true", () => {
			const result1 = ModuleNameParser.apply(["lodash", "index"], true);
			expect(O.isNone(result1.scopeOpt)).toBe(true);
			expect(result1.fragments).toEqual(["lodash", "index"]);
			expect(result1.value).toBe("lodash/index");

			const result2 = ModuleNameParser.apply(["lodash", "index.d.ts"], true);
			expect(O.isNone(result2.scopeOpt)).toBe(true);
			expect(result2.fragments).toEqual(["lodash", "index"]);
			expect(result2.value).toBe("lodash/index");
		});
	});

	describe("Edge Cases", () => {
		test("single character module name", () => {
			const result = ModuleNameParser.fromString("a");
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["a"]);
			expect(result.value).toBe("a");
		});

		test("relative module paths are preserved", () => {
			const result = ModuleNameParser.fromString("./relative/path");
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual([".", "relative", "path"]);
			expect(result.value).toBe("./relative/path");
		});

		test("parent relative module paths", () => {
			const result = ModuleNameParser.fromString("../parent/module");
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["..", "parent", "module"]);
			expect(result.value).toBe("../parent/module");
		});

		test("complex scoped package with multiple transformations", () => {
			const result = ModuleNameParser.apply(
				["@types", "babel__core", "index.d.ts"],
				false,
			);
			expect(O.isSome(result.scopeOpt) && result.scopeOpt.value).toBe("babel");
			expect(result.fragments).toEqual(["core"]);
			expect(result.value).toBe("@babel/core");
		});

		test("tilde with scoped package conversion", () => {
			const result = ModuleNameParser.apply(["~angular__core"], true);
			// In TypeScript implementation, tilde is processed but then the fragment
			// doesn't get re-processed for double underscore in the same pass
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["angular__core"]);
			expect(result.value).toBe("angular__core");
		});

		test("multiple file extensions", () => {
			const result = ModuleNameParser.apply(["module.spec.ts"], true);
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["module.spec"]);
			expect(result.value).toBe("module.spec");
		});

		test("special characters in module names", () => {
			const result = ModuleNameParser.fromString("lodash-es");
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["lodash-es"]);
			expect(result.value).toBe("lodash-es");
		});

		test("numeric module names", () => {
			const result = ModuleNameParser.fromString("v8-compile-cache");
			expect(O.isNone(result.scopeOpt)).toBe(true);
			expect(result.fragments).toEqual(["v8-compile-cache"]);
			expect(result.value).toBe("v8-compile-cache");
		});
	});

	describe("Error Handling", () => {
		test("empty module name throws error", () => {
			expect(() => {
				ModuleNameParser.apply([], true);
			}).toThrow("Unexpected empty module name");
		});

		test("module name that becomes empty after processing throws error", () => {
			expect(() => {
				ModuleNameParser.apply(["@types"], true);
			}).toThrow("Unexpected empty module name");
		});

		test("index-only module with keepIndexFragment false throws error", () => {
			expect(() => {
				ModuleNameParser.apply(["index"], false);
			}).toThrow("Unexpected empty module name");
		});

		test("malformed double underscore pattern", () => {
			// TypeScript version handles this by creating a scoped package with empty name
			const result = ModuleNameParser.apply(["malformed__"], true);
			expect(O.isSome(result.scopeOpt) && result.scopeOpt.value).toBe(
				"malformed",
			);
			expect(result.fragments).toEqual([""]);
			expect(result.value).toBe("@malformed/");
		});
	});

	describe("Complex Real-World Scenarios", () => {
		test("popular npm packages", () => {
			const packages: Array<[string, string | undefined, string[]]> = [
				["react", undefined, ["react"]],
				["@types/react", undefined, ["react"]],
				["@angular/core", "angular", ["core"]],
				["@babel/preset-env", "babel", ["preset-env"]],
				["lodash/fp", undefined, ["lodash", "fp"]],
				["rxjs/operators", undefined, ["rxjs", "operators"]],
			];

			packages.forEach(([input, expectedScope, expectedFragments]) => {
				const result = ModuleNameParser.fromString(input);
				if (expectedScope === undefined) {
					expect(O.isNone(result.scopeOpt)).toBe(true);
				} else {
					expect(O.isSome(result.scopeOpt) && result.scopeOpt.value).toBe(
						expectedScope,
					);
				}
				expect(result.fragments).toEqual(expectedFragments);
			});
		});

		test("TypeScript definition files", () => {
			const files: Array<[string, string | undefined, string[]]> = [
				// @types is removed, .d.ts extension is removed, but all path fragments are kept
				[
					"node_modules/@types/node/index.d.ts",
					undefined,
					["node_modules", "node", "index"],
				],
				["src/utils.ts", undefined, ["src", "utils"]],
				[
					"lib/components/Button.d.ts",
					undefined,
					["lib", "components", "Button"],
				],
			];

			files.forEach(([input, expectedScope, expectedFragments]) => {
				const result = ModuleNameParser.fromString(input);
				if (expectedScope === undefined) {
					expect(O.isNone(result.scopeOpt)).toBe(true);
				} else {
					expect(O.isSome(result.scopeOpt) && result.scopeOpt.value).toBe(
						expectedScope,
					);
				}
				expect(result.fragments).toEqual(expectedFragments);
			});
		});

		test("internal package representations", () => {
			const packages: Array<[string, string | undefined, string[]]> = [
				["angular__core", "angular", ["core"]],
				["babel__preset-env", "babel", ["preset-env"]],
				["microsoft__typescript", "microsoft", ["typescript"]],
			];

			packages.forEach(([input, expectedScope, expectedFragments]) => {
				const result = ModuleNameParser.apply([input], true);
				if (expectedScope === undefined) {
					expect(O.isNone(result.scopeOpt)).toBe(true);
				} else {
					expect(O.isSome(result.scopeOpt) && result.scopeOpt.value).toBe(
						expectedScope,
					);
				}
				expect(result.fragments).toEqual(expectedFragments);
			});
		});
	});
});
