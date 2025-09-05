/**
 * Tests for Directive.ts - TypeScript port of org.scalablytyped.converter.internal.ts.Directive
 */

import { describe, expect, it } from "bun:test";
import { isNone, isSome } from "fp-ts/Option";
import {
	type AmdModule,
	Directive,
	type LibRef,
	NoStdLibInstance,
	type PathRef,
	type TypesRef,
} from "../internal/ts/Directive.js";

describe("Directive", () => {
	describe("NoStdLib directive", () => {
		it("should create NoStdLib directive", () => {
			const directive = Directive.noStdLib();
			expect(directive._tag).toBe("NoStdLib");
			expect(Directive.isNoStdLib(directive)).toBe(true);
			expect(Directive.isRef(directive)).toBe(false);
		});

		it("should use singleton instance", () => {
			const directive1 = NoStdLibInstance;
			const directive2 = Directive.noStdLib();
			expect(directive1._tag).toBe(directive2._tag);
		});

		it("should convert to string correctly", () => {
			const directive = Directive.noStdLib();
			const result = Directive.toString(directive);
			expect(result).toBe('/// <reference no-default-lib="true" />');
		});
	});

	describe("PathRef directive", () => {
		it("should create PathRef directive", () => {
			const path = "../bluebird/bluebird-2.0.d.ts";
			const directive = Directive.pathRef(path);

			expect(directive._tag).toBe("PathRef");
			expect(directive.stringPath).toBe(path);
			expect(Directive.isPathRef(directive)).toBe(true);
			expect(Directive.isRef(directive)).toBe(true);
			expect(Directive.isNoStdLib(directive)).toBe(false);
		});

		it("should convert to string correctly", () => {
			const path = "../types/node.d.ts";
			const directive = Directive.pathRef(path);
			const result = Directive.toString(directive);
			expect(result).toBe(`/// <reference path="${path}" />`);
		});

		it("should extract stringPath", () => {
			const path = "./local/types.d.ts";
			const directive = Directive.pathRef(path);
			const extractedPath = Directive.getStringPath(directive);

			expect(isSome(extractedPath)).toBe(true);
			if (isSome(extractedPath)) {
				expect(extractedPath.value).toBe(path);
			}
		});
	});

	describe("TypesRef directive", () => {
		it("should create TypesRef directive", () => {
			const types = "react";
			const directive = Directive.typesRef(types);

			expect(directive._tag).toBe("TypesRef");
			expect(directive.stringPath).toBe(types);
			expect(Directive.isTypesRef(directive)).toBe(true);
			expect(Directive.isRef(directive)).toBe(true);
		});

		it("should convert to string correctly", () => {
			const types = "node";
			const directive = Directive.typesRef(types);
			const result = Directive.toString(directive);
			expect(result).toBe(`/// <reference types="${types}" />`);
		});

		it("should handle complex type names", () => {
			const types = "@types/lodash";
			const directive = Directive.typesRef(types);
			expect(directive.stringPath).toBe(types);
			expect(Directive.toString(directive)).toBe(
				`/// <reference types="${types}" />`,
			);
		});
	});

	describe("LibRef directive", () => {
		it("should create LibRef directive", () => {
			const lib = "esnext";
			const directive = Directive.libRef(lib);

			expect(directive._tag).toBe("LibRef");
			expect(directive.stringPath).toBe(lib);
			expect(Directive.isLibRef(directive)).toBe(true);
			expect(Directive.isRef(directive)).toBe(true);
		});

		it("should convert to string correctly", () => {
			const lib = "es2020";
			const directive = Directive.libRef(lib);
			const result = Directive.toString(directive);
			expect(result).toBe(`/// <reference lib="${lib}" />`);
		});

		it("should handle various lib values", () => {
			const libs = ["dom", "es6", "es2015", "esnext.array"];

			libs.forEach((lib) => {
				const directive = Directive.libRef(lib);
				expect(directive.stringPath).toBe(lib);
				expect(Directive.isLibRef(directive)).toBe(true);
			});
		});
	});

	describe("AmdModule directive", () => {
		it("should create AmdModule directive", () => {
			const moduleName = "myModule";
			const directive = Directive.amdModule(moduleName);

			expect(directive._tag).toBe("AmdModule");
			expect(directive.stringPath).toBe(moduleName);
			expect(Directive.isAmdModule(directive)).toBe(true);
			expect(Directive.isRef(directive)).toBe(true);
		});

		it("should convert to string correctly", () => {
			const moduleName = "customModule";
			const directive = Directive.amdModule(moduleName);
			const result = Directive.toString(directive);
			expect(result).toBe(`/// <amd-module name="${moduleName}" />`);
		});
	});

	describe("Type guards", () => {
		it("should correctly identify directive types", () => {
			const noStdLib = Directive.noStdLib();
			const pathRef = Directive.pathRef("test.d.ts");
			const typesRef = Directive.typesRef("react");
			const libRef = Directive.libRef("dom");
			const amdModule = Directive.amdModule("test");

			// NoStdLib checks
			expect(Directive.isNoStdLib(noStdLib)).toBe(true);
			expect(Directive.isNoStdLib(pathRef)).toBe(false);

			// Ref checks
			expect(Directive.isRef(noStdLib)).toBe(false);
			expect(Directive.isRef(pathRef)).toBe(true);
			expect(Directive.isRef(typesRef)).toBe(true);
			expect(Directive.isRef(libRef)).toBe(true);
			expect(Directive.isRef(amdModule)).toBe(true);

			// Specific type checks
			expect(Directive.isPathRef(pathRef)).toBe(true);
			expect(Directive.isPathRef(typesRef)).toBe(false);

			expect(Directive.isTypesRef(typesRef)).toBe(true);
			expect(Directive.isTypesRef(libRef)).toBe(false);

			expect(Directive.isLibRef(libRef)).toBe(true);
			expect(Directive.isLibRef(amdModule)).toBe(false);

			expect(Directive.isAmdModule(amdModule)).toBe(true);
			expect(Directive.isAmdModule(pathRef)).toBe(false);
		});
	});

	describe("getStringPath utility", () => {
		it("should return Some for Ref directives", () => {
			const pathRef = Directive.pathRef("test.d.ts");
			const typesRef = Directive.typesRef("react");
			const libRef = Directive.libRef("dom");
			const amdModule = Directive.amdModule("test");

			const pathResult = Directive.getStringPath(pathRef);
			const typesResult = Directive.getStringPath(typesRef);
			const libResult = Directive.getStringPath(libRef);
			const amdResult = Directive.getStringPath(amdModule);

			expect(isSome(pathResult)).toBe(true);
			expect(isSome(typesResult)).toBe(true);
			expect(isSome(libResult)).toBe(true);
			expect(isSome(amdResult)).toBe(true);

			if (isSome(pathResult)) expect(pathResult.value).toBe("test.d.ts");
			if (isSome(typesResult)) expect(typesResult.value).toBe("react");
			if (isSome(libResult)) expect(libResult.value).toBe("dom");
			if (isSome(amdResult)) expect(amdResult.value).toBe("test");
		});

		it("should return None for NoStdLib directive", () => {
			const noStdLib = Directive.noStdLib();
			const result = Directive.getStringPath(noStdLib);
			expect(isNone(result)).toBe(true);
		});
	});

	describe("fromString parsing", () => {
		it("should parse NoStdLib directive", () => {
			const input = '/// <reference no-default-lib="true" />';
			const result = Directive.fromString(input);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(Directive.isNoStdLib(result.value)).toBe(true);
			}
		});

		it("should parse PathRef directive", () => {
			const input = '/// <reference path="../types/node.d.ts" />';
			const result = Directive.fromString(input);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(Directive.isPathRef(result.value)).toBe(true);
				expect((result.value as PathRef).stringPath).toBe("../types/node.d.ts");
			}
		});

		it("should parse TypesRef directive", () => {
			const input = '/// <reference types="react" />';
			const result = Directive.fromString(input);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(Directive.isTypesRef(result.value)).toBe(true);
				expect((result.value as TypesRef).stringPath).toBe("react");
			}
		});

		it("should parse LibRef directive", () => {
			const input = '/// <reference lib="esnext" />';
			const result = Directive.fromString(input);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(Directive.isLibRef(result.value)).toBe(true);
				expect((result.value as LibRef).stringPath).toBe("esnext");
			}
		});

		it("should parse AmdModule directive", () => {
			const input = '/// <amd-module name="myModule" />';
			const result = Directive.fromString(input);

			expect(isSome(result)).toBe(true);
			if (isSome(result)) {
				expect(Directive.isAmdModule(result.value)).toBe(true);
				expect((result.value as AmdModule).stringPath).toBe("myModule");
			}
		});

		it("should handle whitespace variations", () => {
			const inputs = [
				'  /// <reference path="test.d.ts" />  ',
				'///   <reference   path="test.d.ts"   />',
				'\t/// <reference path="test.d.ts" />\n',
			];

			inputs.forEach((input) => {
				const result = Directive.fromString(input);
				expect(isSome(result)).toBe(true);
				if (isSome(result)) {
					expect(Directive.isPathRef(result.value)).toBe(true);
					expect((result.value as PathRef).stringPath).toBe("test.d.ts");
				}
			});
		});

		it("should return None for invalid input", () => {
			const invalidInputs = [
				"not a directive",
				'/// <reference invalid="true" />',
				"/// <reference />",
				"/// <reference path= />",
				"random text",
				"",
			];

			invalidInputs.forEach((input) => {
				const result = Directive.fromString(input);
				expect(isNone(result)).toBe(true);
			});
		});
	});

	describe("equals functionality", () => {
		it("should compare NoStdLib directives correctly", () => {
			const directive1 = Directive.noStdLib();
			const directive2 = Directive.noStdLib();

			expect(Directive.equals(directive1, directive2)).toBe(true);
		});

		it("should compare PathRef directives correctly", () => {
			const directive1 = Directive.pathRef("test.d.ts");
			const directive2 = Directive.pathRef("test.d.ts");
			const directive3 = Directive.pathRef("other.d.ts");

			expect(Directive.equals(directive1, directive2)).toBe(true);
			expect(Directive.equals(directive1, directive3)).toBe(false);
		});

		it("should compare different directive types correctly", () => {
			const noStdLib = Directive.noStdLib();
			const pathRef = Directive.pathRef("test.d.ts");
			const typesRef = Directive.typesRef("test");

			expect(Directive.equals(noStdLib, pathRef)).toBe(false);
			expect(Directive.equals(pathRef, typesRef)).toBe(false);
		});

		it("should compare all Ref types correctly", () => {
			const pathRef1 = Directive.pathRef("same.d.ts");
			const pathRef2 = Directive.pathRef("same.d.ts");
			const typesRef1 = Directive.typesRef("react");
			const typesRef2 = Directive.typesRef("react");
			const libRef1 = Directive.libRef("dom");
			const libRef2 = Directive.libRef("dom");
			const amdModule1 = Directive.amdModule("test");
			const amdModule2 = Directive.amdModule("test");

			expect(Directive.equals(pathRef1, pathRef2)).toBe(true);
			expect(Directive.equals(typesRef1, typesRef2)).toBe(true);
			expect(Directive.equals(libRef1, libRef2)).toBe(true);
			expect(Directive.equals(amdModule1, amdModule2)).toBe(true);
		});
	});

	describe("Edge cases and boundary conditions", () => {
		it("should handle empty string paths", () => {
			const directive = Directive.pathRef("");
			expect(directive.stringPath).toBe("");
			expect(Directive.toString(directive)).toBe('/// <reference path="" />');
		});

		it("should handle paths with special characters", () => {
			const specialPaths = [
				"../@types/node/index.d.ts",
				"./types/my-module.d.ts",
				"types/module-with-dashes.d.ts",
				"@scoped/package",
			];

			specialPaths.forEach((path) => {
				const directive = Directive.pathRef(path);
				expect(directive.stringPath).toBe(path);

				const stringified = Directive.toString(directive);
				const parsed = Directive.fromString(stringified);

				expect(isSome(parsed)).toBe(true);
				if (isSome(parsed)) {
					expect(Directive.equals(directive, parsed.value)).toBe(true);
				}
			});
		});

		it("should handle round-trip conversion (toString -> fromString)", () => {
			const directives = [
				Directive.noStdLib(),
				Directive.pathRef("../types/test.d.ts"),
				Directive.typesRef("react"),
				Directive.libRef("esnext"),
				Directive.amdModule("myModule"),
			];

			directives.forEach((original) => {
				const stringified = Directive.toString(original);
				const parsed = Directive.fromString(stringified);

				expect(isSome(parsed)).toBe(true);
				if (isSome(parsed)) {
					expect(Directive.equals(original, parsed.value)).toBe(true);
				}
			});
		});
	});
});
