import { describe, expect, test } from "vitest";
import { IArray } from "@/internal/IArray.js";
import { Json, PackageJson } from "@/internal/ts/PackageJson.js";
import { TsIdentLibrary } from "@/internal/ts/trees.js";

// Helper function to check if a Map contains a library by value comparison
function mapHasLibrary(
	map: Map<TsIdentLibrary, any>,
	targetValue: string,
): boolean {
	for (const lib of map.keys()) {
		if (lib.value === targetValue) {
			return true;
		}
	}
	return false;
}

// Helper function to get value from Map using library value comparison
function mapGetLibrary<V>(
	map: Map<TsIdentLibrary, V>,
	targetValue: string,
): V | undefined {
	for (const [lib, value] of map) {
		if (lib.value === targetValue) {
			return value;
		}
	}
	return undefined;
}

describe("PackageJson", () => {
	describe("Basic Construction and Empty PackageJson", () => {
		test("empty PackageJson", () => {
			const empty = PackageJson.Empty;
			expect(empty.version).toBeUndefined();
			expect(empty.dependencies).toBeUndefined();
			expect(empty.devDependencies).toBeUndefined();
			expect(empty.peerDependencies).toBeUndefined();
			expect(empty.typings).toBeUndefined();
			expect(empty.module).toBeUndefined();
			expect(empty.types).toBeUndefined();
			expect(empty.files).toBeUndefined();
			expect(empty.dist).toBeUndefined();
			expect(empty.exports).toBeUndefined();
		});

		test("manual construction with all fields", () => {
			const deps = new Map([[TsIdentLibrary.construct("lodash"), "^4.17.21"]]);
			const devDeps = new Map([
				[TsIdentLibrary.construct("@types/node"), "^18.0.0"],
			]);
			const peerDeps = new Map([
				[TsIdentLibrary.construct("react"), ">=16.0.0"],
			]);
			const files = IArray.apply("index.d.ts", "lib/");
			const dist = {
				tarball: "https://registry.npmjs.org/test/-/test-1.0.0.tgz",
			};

			const packageJson = new PackageJson(
				"1.0.0",
				deps,
				devDeps,
				peerDeps,
				Json.fromString("./index.d.ts"),
				Json.fromString("./lib/index.js"),
				Json.fromString("./index.d.ts"),
				files,
				dist,
				Json.obj({ ".": Json.fromString("./index.js") }),
			);

			expect(packageJson.version).toBe("1.0.0");
			expect(packageJson.dependencies).toBe(deps);
			expect(packageJson.devDependencies).toBe(devDeps);
			expect(packageJson.peerDependencies).toBe(peerDeps);
			expect(packageJson.files).toBe(files);
			expect(packageJson.dist).toBe(dist);
		});
	});

	describe("JSON Parsing and Serialization", () => {
		test("parse valid minimal package.json", () => {
			const jsonStr = '{"version": "1.0.0"}';
			const result = PackageJson.fromJson(jsonStr);

			expect(result).not.toBeInstanceOf(Error);
			if (!(result instanceof Error)) {
				expect(result.version).toBe("1.0.0");
				expect(result.dependencies).toBeUndefined();
				expect(result.devDependencies).toBeUndefined();
			}
		});

		test("parse package.json with dependencies", () => {
			const jsonStr = `{
        "version": "2.1.0",
        "dependencies": {
          "lodash": "^4.17.21",
          "@types/node": "^18.0.0",
          "@angular/core": "^15.0.0"
        },
        "devDependencies": {
          "typescript": "^4.9.0"
        },
        "peerDependencies": {
          "react": ">=16.0.0"
        }
      }`;

			const result = PackageJson.fromJson(jsonStr);

			expect(result).not.toBeInstanceOf(Error);
			if (!(result instanceof Error)) {
				expect(result.version).toBe("2.1.0");

				const deps = result.dependencies!;
				expect(mapHasLibrary(deps, "lodash")).toBe(true);
				expect(mapHasLibrary(deps, "node")).toBe(true); // @types/node -> node
				expect(mapHasLibrary(deps, "@angular/core")).toBe(true);
				expect(mapGetLibrary(deps, "lodash")).toBe("^4.17.21");

				const devDeps = result.devDependencies!;
				expect(mapHasLibrary(devDeps, "typescript")).toBe(true);

				const peerDeps = result.peerDependencies!;
				expect(mapHasLibrary(peerDeps, "react")).toBe(true);
			}
		});

		test("parse package.json with complex types and exports", () => {
			const jsonStr = `{
        "version": "1.5.0",
        "types": ["./index.d.ts", "./lib/types.d.ts"],
        "typings": "./typings/index.d.ts",
        "module": "./esm/index.js",
        "exports": {
          ".": {
            "types": "./index.d.ts",
            "import": "./esm/index.js",
            "require": "./cjs/index.js"
          },
          "./utils": {
            "types": "./utils/index.d.ts"
          }
        },
        "files": ["dist/", "types/", "README.md"]
      }`;

			const result = PackageJson.fromJson(jsonStr);

			expect(result).not.toBeInstanceOf(Error);
			if (!(result instanceof Error)) {
				expect(result.version).toBe("1.5.0");
				expect(result.types).toBeDefined();
				expect(result.typings).toBeDefined();
				expect(result.module).toBeDefined();
				expect(result.exports).toBeDefined();
				expect(result.files).toBeDefined();

				const files = result.files!;
				expect(files.length).toBe(3);
				expect(files.contains("dist/")).toBe(true);
				expect(files.contains("types/")).toBe(true);
				expect(files.contains("README.md")).toBe(true);
			}
		});
	});

	describe("Error Handling and Invalid JSON", () => {
		test("malformed JSON", () => {
			const invalidJson = '{"version": "1.0.0", "dependencies": {';
			const result = PackageJson.fromJson(invalidJson);

			expect(result).toBeInstanceOf(Error);
		});

		test("invalid dependency format", () => {
			const jsonStr = `{
        "version": "1.0.0",
        "dependencies": "not-an-object"
      }`;
			const result = PackageJson.fromJson(jsonStr);

			// This should still parse successfully, but dependencies will be undefined
			expect(result).not.toBeInstanceOf(Error);
			if (!(result instanceof Error)) {
				expect(result.dependencies).toBeUndefined();
			}
		});

		test("empty JSON object", () => {
			const jsonStr = "{}";
			const result = PackageJson.fromJson(jsonStr);

			expect(result).not.toBeInstanceOf(Error);
			if (!(result instanceof Error)) {
				expect(result.version).toBeUndefined();
				expect(result.dependencies).toBeUndefined();
				// Note: We can't use direct equality comparison like in Scala due to object construction
				expect(result.toJson()).toBe(PackageJson.Empty.toJson());
			}
		});

		test("null values in JSON", () => {
			const jsonStr = `{
        "version": null,
        "dependencies": null,
        "types": null
      }`;
			const result = PackageJson.fromJson(jsonStr);

			expect(result).not.toBeInstanceOf(Error);
			if (!(result instanceof Error)) {
				expect(result.version).toBeUndefined();
				expect(result.dependencies).toBeUndefined();
				expect(result.types).toBe(null); // null is preserved as Json
			}
		});
	});

	describe("allLibs Method", () => {
		test("allLibs with no dependencies", () => {
			const packageJson = PackageJson.Empty;
			const libs = packageJson.allLibs(false, false);
			expect(libs.size).toBe(0);
		});

		test("allLibs with only regular dependencies", () => {
			const deps = new Map([
				[TsIdentLibrary.construct("lodash"), "^4.17.21"],
				[TsIdentLibrary.construct("react"), "^18.0.0"],
			]);
			const packageJson = new PackageJson("1.0.0", deps);

			const libs = packageJson.allLibs(false, false);
			expect(libs.size).toBe(2);
			expect(mapHasLibrary(libs, "lodash")).toBe(true);
			expect(mapHasLibrary(libs, "react")).toBe(true);
			expect(mapGetLibrary(libs, "lodash")).toBe("^4.17.21");
		});

		test("allLibs including dev dependencies", () => {
			const deps = new Map([[TsIdentLibrary.construct("lodash"), "^4.17.21"]]);
			const devDeps = new Map([
				[TsIdentLibrary.construct("typescript"), "^4.9.0"],
			]);
			const packageJson = new PackageJson("1.0.0", deps, devDeps);

			const libsNoDev = packageJson.allLibs(false, false);
			expect(libsNoDev.size).toBe(1);
			expect(mapHasLibrary(libsNoDev, "lodash")).toBe(true);

			const libsWithDev = packageJson.allLibs(true, false);
			expect(libsWithDev.size).toBe(2);
			expect(mapHasLibrary(libsWithDev, "lodash")).toBe(true);
			expect(mapHasLibrary(libsWithDev, "typescript")).toBe(true);
		});

		test("allLibs including peer dependencies", () => {
			const deps = new Map([[TsIdentLibrary.construct("lodash"), "^4.17.21"]]);
			const peerDeps = new Map([
				[TsIdentLibrary.construct("react"), ">=16.0.0"],
			]);
			const packageJson = new PackageJson("1.0.0", deps, undefined, peerDeps);

			const libsNoPeer = packageJson.allLibs(false, false);
			expect(libsNoPeer.size).toBe(1);
			expect(mapHasLibrary(libsNoPeer, "lodash")).toBe(true);

			const libsWithPeer = packageJson.allLibs(false, true);
			expect(libsWithPeer.size).toBe(2);
			expect(mapHasLibrary(libsWithPeer, "lodash")).toBe(true);
			expect(mapHasLibrary(libsWithPeer, "react")).toBe(true);
		});

		test("allLibs with all dependency types", () => {
			const deps = new Map([[TsIdentLibrary.construct("lodash"), "^4.17.21"]]);
			const devDeps = new Map([
				[TsIdentLibrary.construct("typescript"), "^4.9.0"],
			]);
			const peerDeps = new Map([
				[TsIdentLibrary.construct("react"), ">=16.0.0"],
			]);
			const packageJson = new PackageJson("1.0.0", deps, devDeps, peerDeps);

			const allLibs = packageJson.allLibs(true, true);
			expect(allLibs.size).toBe(3);
			expect(mapHasLibrary(allLibs, "lodash")).toBe(true);
			expect(mapHasLibrary(allLibs, "typescript")).toBe(true);
			expect(mapHasLibrary(allLibs, "react")).toBe(true);

			// Test that result is sorted
			const keys = Array.from(allLibs.keys());
			const sortedKeys = [...keys].sort((a, b) =>
				a.value.localeCompare(b.value),
			);
			expect(keys.map((k) => k.value)).toEqual(sortedKeys.map((k) => k.value));
		});
	});

	describe("Parsing Methods", () => {
		test("parsedTypes with string value", () => {
			const packageJson = new PackageJson(
				"1.0.0",
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				Json.fromString("./index.d.ts"),
			);

			const parsed = packageJson.parsedTypes;
			expect(parsed).toBeDefined();
			expect(parsed?.length).toBe(1);
			expect(parsed?.apply(0)).toBe("./index.d.ts");
		});

		test("parsedTypes with array value", () => {
			const packageJson = new PackageJson(
				"1.0.0",
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				Json.arr(
					Json.fromString("./index.d.ts"),
					Json.fromString("./lib/types.d.ts"),
				),
			);

			const parsed = packageJson.parsedTypes;
			expect(parsed).toBeDefined();
			expect(parsed?.length).toBe(2);
			expect(parsed?.contains("./index.d.ts")).toBe(true);
			expect(parsed?.contains("./lib/types.d.ts")).toBe(true);
		});

		test("parsedTypes with null value", () => {
			const packageJson = new PackageJson(
				"1.0.0",
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				Json.fromNull(),
			);

			const parsed = packageJson.parsedTypes;
			expect(parsed).toBeUndefined();
		});

		test("parsedTypings with string value", () => {
			const packageJson = new PackageJson(
				"1.0.0",
				undefined,
				undefined,
				undefined,
				Json.fromString("./typings/index.d.ts"),
			);

			const parsed = packageJson.parsedTypings;
			expect(parsed).toBeDefined();
			expect(parsed?.length).toBe(1);
			expect(parsed?.apply(0)).toBe("./typings/index.d.ts");
		});

		test("parsedModules with string value", () => {
			const packageJson = new PackageJson(
				"1.0.0",
				undefined,
				undefined,
				undefined,
				undefined,
				Json.fromString("./lib/index.js"),
			);

			const parsed = packageJson.parsedModules;
			expect(parsed).toBeDefined();
			expect(parsed?.size).toBe(1);
			expect(parsed?.get("")).toBe("./lib/index.js");
		});

		test("parsedModules with object value", () => {
			const packageJson = new PackageJson(
				"1.0.0",
				undefined,
				undefined,
				undefined,
				undefined,
				Json.obj({
					main: Json.fromString("./lib/index.js"),
					browser: Json.fromString("./lib/browser.js"),
				}),
			);

			const parsed = packageJson.parsedModules;
			expect(parsed).toBeDefined();
			expect(parsed?.size).toBe(2);
			expect(parsed?.get("main")).toBe("./lib/index.js");
			expect(parsed?.get("browser")).toBe("./lib/browser.js");
		});

		test("parsedExported with complex exports", () => {
			const packageJson = new PackageJson(
				"1.0.0",
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				Json.obj({
					".": Json.obj({
						types: Json.fromString("./index.d.ts"),
						import: Json.fromString("./esm/index.js"),
					}),
					"./utils": Json.obj({
						types: Json.fromString("./utils/index.d.ts"),
					}),
				}),
			);

			const parsed = packageJson.parsedExported;
			expect(parsed).toBeDefined();
			expect(parsed?.size).toBe(2);
			expect(parsed?.get(".")).toBe("./index.d.ts");
			expect(parsed?.get("./utils")).toBe("./utils/index.d.ts");
		});
	});

	describe("Edge Cases and Boundary Conditions", () => {
		test("PackageJson with scoped library dependencies", () => {
			const deps = new Map([
				[TsIdentLibrary.construct("@angular/core"), "^15.0.0"],
				[TsIdentLibrary.construct("@types/node"), "^18.0.0"], // This becomes "node"
				[TsIdentLibrary.construct("@babel/core"), "^7.20.0"],
			]);
			const packageJson = new PackageJson("1.0.0", deps);

			const libs = packageJson.allLibs(false, false);
			expect(libs.size).toBe(3);
			expect(mapHasLibrary(libs, "@angular/core")).toBe(true);
			expect(mapHasLibrary(libs, "node")).toBe(true); // @types/node -> node
			expect(mapHasLibrary(libs, "@babel/core")).toBe(true);
		});

		test("PackageJson with empty arrays and objects", () => {
			const jsonStr = `{
        "version": "1.0.0",
        "dependencies": {},
        "devDependencies": {},
        "peerDependencies": {},
        "files": [],
        "types": [],
        "exports": {}
      }`;

			const result = PackageJson.fromJson(jsonStr);

			expect(result).not.toBeInstanceOf(Error);
			if (!(result instanceof Error)) {
				expect(result.version).toBe("1.0.0");
				expect(result.dependencies).toBeUndefined(); // Empty objects become undefined
				expect(result.devDependencies).toBeUndefined();
				expect(result.peerDependencies).toBeUndefined();
				expect(result.files).toBeDefined(); // Empty array is preserved
				expect(result.files?.isEmpty).toBe(true);
				expect(result.parsedTypes).toBeUndefined(); // Empty array filtered out
				expect(result.parsedExported).toBeUndefined(); // Empty object filtered out
			}
		});

		test("PackageJson.Dist parsing", () => {
			const jsonStr = `{
        "version": "1.0.0",
        "dist": {
          "tarball": "https://registry.npmjs.org/test/-/test-1.0.0.tgz"
        }
      }`;

			const result = PackageJson.fromJson(jsonStr);

			expect(result).not.toBeInstanceOf(Error);
			if (!(result instanceof Error)) {
				expect(result.dist).toBeDefined();
				expect(result.dist?.tarball).toBe(
					"https://registry.npmjs.org/test/-/test-1.0.0.tgz",
				);
			}
		});
	});
});
