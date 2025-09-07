import { describe, expect, test } from "vitest";
import { TsIdentLibrary } from "@/internal/ts/trees.ts";

describe("TsIdentLibrary", () => {
	describe("Basic Construction", () => {
		test("simple library identifier", () => {
			const x = TsIdentLibrary.construct("lodash");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("lodash");
			expect(x.__value).toBe("lodash");
		});

		test("scoped library identifier", () => {
			const x = TsIdentLibrary.construct("@angular/core");
			expect(TsIdentLibrary.isScoped(x)).toBe(true);
			expect(x.value).toBe("@angular/core");
			expect(x.__value).toBe("angular__core");

			if (TsIdentLibrary.isScoped(x)) {
				expect(x.scope).toBe("angular");
				expect(x.name).toBe("core");
			}
		});

		test("@types packages are unwrapped", () => {
			const x = TsIdentLibrary.construct("@types/node");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("node");
			expect(x.__value).toBe("node");
		});

		test("@types scoped packages are unwrapped", () => {
			const x = TsIdentLibrary.construct("@types/babel__core");
			// babel__core gets parsed as a scoped package because it contains __
			expect(TsIdentLibrary.isScoped(x)).toBe(true);
			expect(x.value).toBe("@babel/core");
			expect(x.__value).toBe("babel__core");
		});

		test("internal scoped representation", () => {
			const x = TsIdentLibrary.construct("angular__core");
			expect(TsIdentLibrary.isScoped(x)).toBe(true);
			expect(x.value).toBe("@angular/core");
			expect(x.__value).toBe("angular__core");
		});

		test("internal @types scoped representation", () => {
			const x = TsIdentLibrary.construct("types__node");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("node");
			expect(x.__value).toBe("node");
		});
	});

	describe("Edge Cases and Boundary Conditions", () => {
		test("empty string", () => {
			const x = TsIdentLibrary.construct("");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("");
			expect(x.__value).toBe("");
		});

		test("single character", () => {
			const x = TsIdentLibrary.construct("a");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("a");
			expect(x.__value).toBe("a");
		});

		test("very long identifier", () => {
			const longName = "a".repeat(1000);
			const x = TsIdentLibrary.construct(longName);
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe(longName);
			expect(x.__value).toBe(longName);
		});

		test("special characters in simple identifier", () => {
			const x = TsIdentLibrary.construct("lodash-es");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("lodash-es");
			expect(x.__value).toBe("lodash-es");
		});

		test("special characters in scoped identifier", () => {
			const x = TsIdentLibrary.construct("@babel/plugin-transform-runtime");
			expect(TsIdentLibrary.isScoped(x)).toBe(true);
			expect(x.value).toBe("@babel/plugin-transform-runtime");
			expect(x.__value).toBe("babel__plugin-transform-runtime");
		});

		test("numeric identifiers", () => {
			const x = TsIdentLibrary.construct("123");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("123");
			expect(x.__value).toBe("123");
		});

		test("mixed alphanumeric", () => {
			const x = TsIdentLibrary.construct("lib2to3");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("lib2to3");
			expect(x.__value).toBe("lib2to3");
		});

		test("unicode characters", () => {
			const x = TsIdentLibrary.construct("测试库");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("测试库");
			expect(x.__value).toBe("测试库");
		});

		test("scoped with unicode", () => {
			const x = TsIdentLibrary.construct("@测试/库");
			expect(TsIdentLibrary.isScoped(x)).toBe(true);
			expect(x.value).toBe("@测试/库");
			expect(x.__value).toBe("测试__库");
		});
	});

	describe("Malformed Input Handling", () => {
		test("incomplete scoped package - missing name", () => {
			const x = TsIdentLibrary.construct("@scope/");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("@scope/");
		});

		test("incomplete scoped package - missing scope", () => {
			const x = TsIdentLibrary.construct("@/name");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("@/name");
		});

		test("malformed scoped - no slash", () => {
			const x = TsIdentLibrary.construct("@scope");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("@scope");
		});

		test("multiple slashes in scoped", () => {
			const x = TsIdentLibrary.construct("@scope/name/extra");
			expect(TsIdentLibrary.isScoped(x)).toBe(true);
			expect(x.value).toBe("@scope/name/extra");
			expect(x.__value).toBe("scope__name/extra");
		});

		test("malformed internal representation - no underscores", () => {
			const x = TsIdentLibrary.construct("scope_name");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("scope_name");
		});

		test("malformed internal representation - missing parts", () => {
			const x = TsIdentLibrary.construct("scope__");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("scope__");
		});

		test("malformed internal representation - empty scope", () => {
			const x = TsIdentLibrary.construct("__name");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("__name");
		});
	});

	describe("TypeScript and JavaScript Reserved Words", () => {
		test("JavaScript reserved words as library names", () => {
			const jsKeywords = [
				"class",
				"function",
				"var",
				"let",
				"const",
				"if",
				"else",
				"for",
				"while",
				"do",
				"switch",
				"case",
				"default",
				"break",
				"continue",
				"return",
				"try",
				"catch",
				"finally",
				"throw",
				"new",
				"this",
				"super",
				"extends",
				"implements",
				"import",
				"export",
				"from",
				"as",
				"async",
				"await",
				"yield",
				"static",
				"public",
				"private",
				"protected",
				"readonly",
				"abstract",
				"interface",
				"type",
				"namespace",
				"module",
				"declare",
				"enum",
			];

			jsKeywords.forEach((keyword) => {
				const x = TsIdentLibrary.construct(keyword);
				expect(TsIdentLibrary.isSimple(x)).toBe(true);
				expect(x.value).toBe(keyword);
				expect(x.__value).toBe(keyword);
			});
		});

		test("Scala reserved words as library names", () => {
			const scalaKeywords = [
				"abstract",
				"case",
				"catch",
				"class",
				"def",
				"do",
				"else",
				"extends",
				"false",
				"final",
				"finally",
				"for",
				"forSome",
				"if",
				"implicit",
				"import",
				"lazy",
				"match",
				"new",
				"null",
				"object",
				"override",
				"package",
				"private",
				"protected",
				"return",
				"sealed",
				"super",
				"this",
				"throw",
				"trait",
				"try",
				"true",
				"type",
				"val",
				"var",
				"while",
				"with",
				"yield",
			];

			scalaKeywords.forEach((keyword) => {
				const x = TsIdentLibrary.construct(keyword);
				expect(TsIdentLibrary.isSimple(x)).toBe(true);
				expect(x.value).toBe(keyword);
				expect(x.__value).toBe(keyword);
			});
		});

		test("scoped packages with reserved words", () => {
			const x1 = TsIdentLibrary.construct("@class/interface");
			expect(TsIdentLibrary.isScoped(x1)).toBe(true);
			expect(x1.value).toBe("@class/interface");
			expect(x1.__value).toBe("class__interface");

			const x2 = TsIdentLibrary.construct("@types/function");
			expect(TsIdentLibrary.isSimple(x2)).toBe(true);
			expect(x2.value).toBe("function");
			expect(x2.__value).toBe("function");
		});
	});

	describe("Complex Identifier Patterns", () => {
		test("nested namespaces simulation", () => {
			const x = TsIdentLibrary.construct("@microsoft/api-extractor");
			expect(TsIdentLibrary.isScoped(x)).toBe(true);
			expect(x.value).toBe("@microsoft/api-extractor");
			expect(x.__value).toBe("microsoft__api-extractor");
		});

		test("deep scoped packages", () => {
			const x = TsIdentLibrary.construct(
				"@babel/plugin-proposal-class-properties",
			);
			expect(TsIdentLibrary.isScoped(x)).toBe(true);
			expect(x.value).toBe("@babel/plugin-proposal-class-properties");
			expect(x.__value).toBe("babel__plugin-proposal-class-properties");
		});

		test("version-like identifiers", () => {
			const x = TsIdentLibrary.construct("v8-compile-cache");
			expect(TsIdentLibrary.isSimple(x)).toBe(true);
			expect(x.value).toBe("v8-compile-cache");
			expect(x.__value).toBe("v8-compile-cache");
		});

		test("framework-specific patterns", () => {
			const patterns = [
				"@angular/common",
				"@vue/cli",
				"@react-native/metro-config",
				"@storybook/addon-essentials",
				"@nestjs/common",
				"@nuxt/typescript-build",
			];

			patterns.forEach((pattern) => {
				const x = TsIdentLibrary.construct(pattern);
				expect(TsIdentLibrary.isScoped(x)).toBe(true);
				expect(x.value).toBe(pattern);

				const parts = pattern.substring(1).split("/");
				expect(x.__value).toBe(`${parts[0]}__${parts[1]}`);
			});
		});

		test("organization-specific patterns", () => {
			const x1 = TsIdentLibrary.construct("@company/internal-lib");
			expect(TsIdentLibrary.isScoped(x1)).toBe(true);
			expect(x1.value).toBe("@company/internal-lib");
			expect(x1.__value).toBe("company__internal-lib");

			const x2 = TsIdentLibrary.construct("@my-org/shared-utils");
			expect(TsIdentLibrary.isScoped(x2)).toBe(true);
			expect(x2.value).toBe("@my-org/shared-utils");
			expect(x2.__value).toBe("my-org__shared-utils");
		});
	});

	describe("International and Unicode Support", () => {
		test("various international characters", () => {
			const internationalNames = [
				"café",
				"naïve",
				"résumé",
				"piñata",
				"jalapeño",
				"москва",
				"北京",
				"東京",
				"서울",
				"العربية",
			];

			internationalNames.forEach((name) => {
				const x = TsIdentLibrary.construct(name);
				expect(TsIdentLibrary.isSimple(x)).toBe(true);
				expect(x.value).toBe(name);
				expect(x.__value).toBe(name);
			});
		});

		test("scoped packages with international characters", () => {
			const x1 = TsIdentLibrary.construct("@café/utils");
			expect(TsIdentLibrary.isScoped(x1)).toBe(true);
			expect(x1.value).toBe("@café/utils");
			expect(x1.__value).toBe("café__utils");

			const x2 = TsIdentLibrary.construct("@北京/library");
			expect(TsIdentLibrary.isScoped(x2)).toBe(true);
			expect(x2.value).toBe("@北京/library");
			expect(x2.__value).toBe("北京__library");
		});

		test("emoji in package names", () => {
			const x1 = TsIdentLibrary.construct("🚀rocket");
			expect(TsIdentLibrary.isSimple(x1)).toBe(true);
			expect(x1.value).toBe("🚀rocket");
			expect(x1.__value).toBe("🚀rocket");

			const x2 = TsIdentLibrary.construct("@🎨/design-system");
			expect(TsIdentLibrary.isScoped(x2)).toBe(true);
			expect(x2.value).toBe("@🎨/design-system");
			expect(x2.__value).toBe("🎨__design-system");
		});
	});
});
