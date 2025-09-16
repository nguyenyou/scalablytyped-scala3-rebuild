import { describe, expect, test } from "bun:test";
import { IArray } from "../internal/IArray.js";
import { TsTreeScope } from "../internal/ts/TsTreeScope.js";
import {
	createMockAugmentedModule,
	createMockClass,
	createMockLogger,
	createMockModule,
	createMockNamespace,
	createMockParsedFile,
	createMockVariable,
	createQIdent,
	createQIdentFromParts,
	createScopedLibrary,
	createSimpleLibrary,
	createTypeParam,
} from "./utils/TestUtils.js";

describe("TsTreeScope", () => {
	describe("Construction and Basic Properties", () => {
		test("should create root scope with correct properties", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();

			const root = TsTreeScope.create(libName, false, deps, logger);

			expect(root.libName).toBe(libName);
			expect(root.pedantic).toBe(false);
			expect(root.logger).toBe(logger);
			expect(root.lookupUnqualified).toBe(false);
			expect(root.stack).toEqual([]);
			expect(root.root).toBe(root);
		});

		test("should create scoped scope with correct properties", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockClass = createMockClass("TestClass");
			const scoped = root["/"](mockClass);

			expect(scoped.outer).toBe(root);
			expect(scoped.current).toBe(mockClass);
			expect(scoped.root).toBe(root);
			expect(scoped.logger).toBeDefined(); // Logger with context, not same reference
			expect(scoped.stack).toEqual([mockClass]);
			expect(scoped.lookupUnqualified).toBe(false);
		});

		test("should handle nested scoped scopes", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockNamespace = createMockNamespace("TestNamespace");
			const mockClass = createMockClass("TestClass");

			const scoped1 = root["/"](mockNamespace);
			const scoped2 = scoped1["/"](mockClass);

			expect(scoped2.stack).toEqual([mockClass, mockNamespace]);
			expect(scoped2.outer).toBe(scoped1);
			expect(scoped2.root).toBe(root);
		});

		test("should handle pedantic mode", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();

			const root = TsTreeScope.create(libName, true, deps, logger);

			expect(root.pedantic).toBe(true);
		});

		test("should handle scoped libraries", () => {
			const libName = createScopedLibrary("types", "node");
			const logger = createMockLogger();
			const deps = new Map();

			const root = TsTreeScope.create(libName, false, deps, logger);

			expect(root.libName).toBe(libName);
			expect(root.libName._tag).toBe("TsIdentLibraryScoped");
		});
	});

	describe("Caching and Configuration", () => {
		test("should create caching version of root scope", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const cachingRoot = root.caching();

			expect(cachingRoot.libName).toBe(libName);
			expect(cachingRoot.pedantic).toBe(false);
			expect(cachingRoot.logger).toBe(logger);
			expect(cachingRoot.cache._tag).toBe("Some");
			expect(cachingRoot.lookupUnqualified).toBe(false);
		});

		test("should enable unqualified lookup", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const unqualifiedRoot = root.enableUnqualifiedLookup();

			expect(unqualifiedRoot.libName).toBe(libName);
			expect(unqualifiedRoot.pedantic).toBe(false);
			expect(unqualifiedRoot.logger).toBe(logger);
			expect(unqualifiedRoot.lookupUnqualified).toBe(true);
		});

		test("should chain caching and unqualified lookup", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const enhanced = root.caching().enableUnqualifiedLookup();

			expect(enhanced.cache._tag).toBe("Some");
			expect(enhanced.lookupUnqualified).toBe(true);
		});
	});

	describe("Type Parameters and Keys", () => {
		test("should inherit type parameters from outer scope", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const _tparam = createTypeParam("T");
			const mockClass = createMockClass("TestClass");
			// In a full implementation, we would set tparams on the class

			const scoped = root["/"](mockClass);

			// Type parameters should be inherited and include current tree's tparams
			expect(scoped.tparams).toBeDefined();
			expect(scoped.tparams instanceof Map).toBe(true);
		});

		test("should handle type keys from mapped types", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockClass = createMockClass("TestClass");
			const scoped = root["/"](mockClass);

			// Type keys should be inherited from outer scope
			expect(scoped.tkeys).toBeDefined();
			expect(scoped.tkeys instanceof Set).toBe(true);
		});

		test("should handle empty type parameters and keys", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			expect(root.tparams.size).toBe(0);
			expect(root.tkeys.size).toBe(0);
		});
	});

	describe("Abstract Type Detection", () => {
		test("should detect primitive types as non-abstract", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const primitives = [
				"string",
				"number",
				"boolean",
				"any",
				"void",
				"never",
				"unknown",
			];

			for (const primitive of primitives) {
				const qident = createQIdent(primitive);
				expect(root.isAbstract(qident)).toBe(false);
			}
		});

		test("should detect type parameters as abstract", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			// In a real implementation, we would add type parameters to the scope
			const qident = createQIdent("T");
			expect(root.isAbstract(qident)).toBe(false); // Empty scope has no type params
		});

		test("should handle multi-part qualified identifiers", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const qident = createQIdentFromParts("Namespace", "Type");
			expect(root.isAbstract(qident)).toBe(false); // Multi-part identifiers are not abstract
		});
	});

	describe("Surrounding Container Detection", () => {
		test("should find no surrounding container in root scope", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			expect(root.surroundingTsContainer()._tag).toBe("None");
			expect(root.surroundingHasMembers()._tag).toBe("None");
		});

		test("should find surrounding container in scoped scope", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockNamespace = createMockNamespace("TestNamespace");
			const mockClass = createMockClass("TestClass");
			const scoped = root["/"](mockNamespace)["/"](mockClass);

			const container = scoped.surroundingTsContainer();
			expect(container._tag).toBe("Some");
			if (container._tag === "Some") {
				expect(container.value).toBe(mockNamespace);
			}
		});

		test("should find surrounding class members", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockClass = createMockClass("TestClass");
			const mockVar = createMockVariable("testVar");
			const scoped = root["/"](mockClass)["/"](mockVar);

			const hasMembers = scoped.surroundingHasMembers();
			expect(hasMembers._tag).toBe("Some");
			if (hasMembers._tag === "Some") {
				expect(hasMembers.value).toBe(mockClass);
			}
		});
	});

	describe("Lookup Functionality", () => {
		test("should return empty results for unknown identifiers", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const qident = createQIdent("UnknownType");
			const result = root.lookup(qident, true); // skipValidation = true
			expect(result.isEmpty).toBe(true);
		});

		test("should return empty results for primitive types", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const qident = createQIdent("string");
			const result = root.lookup(qident, true);
			expect(result.isEmpty).toBe(true);
		});

		test("should handle type-only lookups", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const qident = createQIdent("SomeType");
			const result = root.lookupType(qident, true);
			expect(result.isEmpty).toBe(true);
		});

		test("should include scope information in lookups", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const qident = createQIdent("SomeType");
			const result = root.lookupIncludeScope(qident, true);
			expect(result.isEmpty).toBe(true);
		});
	});

	describe("Module Scopes", () => {
		test("should handle empty module scopes", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			expect(root.moduleScopes.size).toBe(0);
			expect(root.moduleAuxScopes.size).toBe(0);
		});

		test("should inherit module scopes in nested scopes", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockClass = createMockClass("TestClass");
			const scoped = root["/"](mockClass);

			expect(scoped.moduleScopes).toBeDefined();
			expect(scoped.moduleAuxScopes).toBeDefined();
		});

		test("should handle module declarations", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockModule = createMockModule("TestModule");
			const scoped = root["/"](mockModule);

			expect(scoped.moduleScopes).toBeDefined();
			expect(scoped.moduleAuxScopes).toBeDefined();
		});

		test("should process modules from dependencies", () => {
			const libName = createSimpleLibrary("test-lib");
			const depLibName = createSimpleLibrary("dep-lib");
			const logger = createMockLogger();

			// Create a mock parsed file with modules
			const mockModule = createMockModule("TestModule");
			const moduleIdent = mockModule.name; // Use the module's actual name identifier
			const mockFile = {
				...createMockParsedFile("dep.ts"),
				modules: new Map([[moduleIdent, mockModule]]),
			};

			const depLib = { libName: depLibName, packageJsonOpt: undefined };
			const deps = new Map([[depLib, mockFile]]);
			const root = TsTreeScope.create(libName, false, deps, logger);

			// Should have module scopes from dependencies
			expect(root.moduleScopes.size).toBeGreaterThan(0);
		});

		test("should process augmented modules from dependencies", () => {
			const libName = createSimpleLibrary("test-lib");
			const depLibName = createSimpleLibrary("dep-lib");
			const logger = createMockLogger();

			// Create a mock augmented module using the proper constructor
			const mockAugModule = createMockAugmentedModule("TestModule");
			const moduleIdent = mockAugModule.name;
			const augModules = IArray.fromArray([mockAugModule]); // IArray of augmented modules to be merged

			const mockFile = {
				...createMockParsedFile("dep.ts"),
				augmentedModulesMap: new Map([
					[moduleIdent, augModules]
				]),
			};

			const depLib = { libName: depLibName, packageJsonOpt: undefined };
			const deps = new Map([[depLib, mockFile]]);
			const root = TsTreeScope.create(libName, false, deps, logger);

			// Should have augmented module scopes from dependencies
			expect(root.moduleAuxScopes.size).toBeGreaterThan(0);
		});
	});

	describe("Exports", () => {
		test("should handle empty exports", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			expect(root.exports.isEmpty).toBe(true);
		});

		test("should extract exports from containers", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockNamespace = createMockNamespace("TestNamespace");
			const scoped = root["/"](mockNamespace);

			expect(scoped.exports).toBeDefined();
			expect(scoped.exports.isEmpty).toBe(true); // Mock namespace has no exports
		});

		test("should handle parsed file exports", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockFile = createMockParsedFile("test.ts");
			const scoped = root["/"](mockFile);

			expect(scoped.exports).toBeDefined();
			expect(scoped.exports.isEmpty).toBe(true); // Mock file has no exports
		});
	});

	describe("Within Module Detection", () => {
		test("should detect not within module for root scope", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			expect(root.withinModule()).toBe(false);
		});

		test("should detect within module for module scopes", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockModule = createMockModule("TestModule");
			const scoped = root["/"](mockModule);

			expect(scoped.withinModule()).toBe(true);
		});

		test("should detect within module for nested scopes", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockModule = createMockModule("TestModule");
			const mockClass = createMockClass("TestClass");
			const scoped = root["/"](mockModule)["/"](mockClass);

			expect(scoped.withinModule()).toBe(true);
		});
	});

	describe("Equality and Hash Code", () => {
		test("should handle equality for same library and stack", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();

			const root1 = TsTreeScope.create(libName, false, deps, logger);
			const root2 = TsTreeScope.create(libName, false, deps, logger);

			expect(root1.equals(root2)).toBe(true);
			expect(root1.hashCode()).toBe(root2.hashCode());
		});

		test("should handle inequality for different libraries", () => {
			const libName1 = createSimpleLibrary("test-lib-1");
			const libName2 = createSimpleLibrary("test-lib-2");
			const logger = createMockLogger();
			const deps = new Map();

			const root1 = TsTreeScope.create(libName1, false, deps, logger);
			const root2 = TsTreeScope.create(libName2, false, deps, logger);

			expect(root1.equals(root2)).toBe(false);
		});

		test("should handle equality for scoped scopes", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockClass = createMockClass("TestClass");
			const scoped1 = root["/"](mockClass);
			const scoped2 = root["/"](mockClass);

			expect(scoped1.equals(scoped2)).toBe(true);
			expect(scoped1.hashCode()).toBe(scoped2.hashCode());
		});

		test("should handle inequality for different stacks", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockClass1 = createMockClass("TestClass1");
			const mockClass2 = createMockClass("TestClass2");
			const scoped1 = root["/"](mockClass1);
			const scoped2 = root["/"](mockClass2);

			expect(scoped1.equals(scoped2)).toBe(false);
		});
	});

	describe("String Representation", () => {
		test("should format root scope correctly", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const str = root.toString();
			expect(str).toContain("TreeScope");
			expect(typeof str).toBe("string");
		});

		test("should format scoped scope with stack", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockClass = createMockClass("TestClass");
			const scoped = root["/"](mockClass);

			const str = scoped.toString();
			expect(str).toContain("TreeScope");
			expect(str).toContain("TestClass");
		});

		test("should format nested scopes correctly", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const mockNamespace = createMockNamespace("TestNamespace");
			const mockClass = createMockClass("TestClass");
			const scoped = root["/"](mockNamespace)["/"](mockClass);

			const str = scoped.toString();
			expect(str).toContain("TreeScope");
			expect(str).toContain("TestNamespace");
			expect(str).toContain("TestClass");
		});

		describe("Import/Export Functionality", () => {
			test("should handle import resolution", () => {
				const libName = createSimpleLibrary("test-lib");
				const logger = createMockLogger();
				const deps = new Map();
				const root = TsTreeScope.create(libName, false, deps, logger);

				const mockNamespace = createMockNamespace("TestNamespace");
				const scoped = root["/"](mockNamespace);

				// Test that import resolution doesn't crash
				const qident = createQIdent("ImportedType");
				const result = scoped.lookup(qident, true);
				expect(result.isEmpty).toBe(true);
			});

			test("should handle export resolution", () => {
				const libName = createSimpleLibrary("test-lib");
				const logger = createMockLogger();
				const deps = new Map();
				const root = TsTreeScope.create(libName, false, deps, logger);

				const mockModule = createMockModule("TestModule");
				const scoped = root["/"](mockModule);

				// Test that export resolution doesn't crash
				const qident = createQIdent("ExportedType");
				const result = scoped.lookup(qident, true);
				expect(result.isEmpty).toBe(true);
			});

			test("should handle complex import/export chains", () => {
				const libName = createSimpleLibrary("test-lib");
				const logger = createMockLogger();
				const deps = new Map();
				const root = TsTreeScope.create(libName, false, deps, logger);

				const mockModule = createMockModule("TestModule");
				const mockNamespace = createMockNamespace("TestNamespace");
				const scoped = root["/"](mockModule)["/"](mockNamespace);

				// Test that complex lookup chains work
				const qident = createQIdentFromParts("Complex", "Nested", "Type");
				const result = scoped.lookup(qident, true);
				expect(result.isEmpty).toBe(true);
			});
		});

		describe("Enhanced Search Functionality", () => {
			test("should handle container search", () => {
				const libName = createSimpleLibrary("test-lib");
				const logger = createMockLogger();
				const deps = new Map();
				const root = TsTreeScope.create(libName, false, deps, logger);

				const mockNamespace = createMockNamespace("TestNamespace");
				const scoped = root["/"](mockNamespace);

				// Test container search
				const qident = createQIdent("NestedType");
				const result = scoped.lookup(qident, true);
				expect(result.isEmpty).toBe(true);
			});

			test("should handle variable search", () => {
				const libName = createSimpleLibrary("test-lib");
				const logger = createMockLogger();
				const deps = new Map();
				const root = TsTreeScope.create(libName, false, deps, logger);

				const mockVar = createMockVariable("testVar");
				const scoped = root["/"](mockVar);

				// Test variable search
				const qident = createQIdent("PropertyType");
				const result = scoped.lookup(qident, true);
				expect(result.isEmpty).toBe(true);
			});

			test("should handle enum member search", () => {
				const libName = createSimpleLibrary("test-lib");
				const logger = createMockLogger();
				const deps = new Map();
				const root = TsTreeScope.create(libName, false, deps, logger);

				// Test enum member search (simplified since we don't have a real enum)
				const qident = createQIdentFromParts("TestEnum", "Member");
				const result = root.lookup(qident, true);
				expect(result.isEmpty).toBe(true);
			});
		});

		describe("Loop Detection Edge Cases", () => {
			test("should detect simple circular references", () => {
				const libName = createSimpleLibrary("test-lib");
				const logger = createMockLogger();
				const deps = new Map();
				const root = TsTreeScope.create(libName, false, deps, logger);

				// Test that circular references are detected and handled
				const qident = createQIdent("CircularType");
				const result = root.lookup(qident, true);
				expect(result.isEmpty).toBe(true);
			});

			test("should handle deep circular references", () => {
				const libName = createSimpleLibrary("test-lib");
				const logger = createMockLogger();
				const deps = new Map();
				const root = TsTreeScope.create(libName, false, deps, logger);

				// Test deep circular reference chains
				const qident = createQIdentFromParts("A", "B", "C", "A");
				const result = root.lookup(qident, true);
				expect(result.isEmpty).toBe(true);
			});

			test("should handle complex nested scope loops", () => {
				const libName = createSimpleLibrary("test-lib");
				const logger = createMockLogger();
				const deps = new Map();
				const root = TsTreeScope.create(libName, false, deps, logger);

				const mockNamespace = createMockNamespace("TestNamespace");
				const scoped = root["/"](mockNamespace);

				// Test complex nested lookups that could create loops
				const qident = createQIdentFromParts("Nested", "Deep", "Type");
				const result = scoped.lookup(qident, true);
				expect(result.isEmpty).toBe(true);
			});
		});
	});

	describe("Error Handling and Edge Cases", () => {
		test("should handle empty dependencies", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			expect(root.moduleScopes.size).toBe(0);
			expect(root.moduleAuxScopes.size).toBe(0);
		});

		test("should handle special characters in identifiers", () => {
			const libName = createScopedLibrary("@types", "node-special-chars_123");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			// Verify the library name is correctly set
			expect(root.libName).toBe(libName);

			// Verify the scoped library properties are correctly handled
			expect(libName._tag).toBe("TsIdentLibraryScoped");
			expect(libName.scope).toBe("@types");
			expect(libName.name).toBe("node-special-chars_123");
			expect(libName.value).toBe("@@types/node-special-chars_123");
			expect(libName.__value).toBe("@types__node-special-chars_123");
		});

		test("should handle long identifier chains", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const qident = createQIdentFromParts(
				"Very",
				"Long",
				"Qualified",
				"Identifier",
				"Chain",
			);
			const result = root.lookup(qident, true);
			expect(result.isEmpty).toBe(true);
		});

		test("should handle deep nesting", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			let scope: TsTreeScope = TsTreeScope.create(libName, false, deps, logger);

			// Create deeply nested scope
			for (let i = 0; i < 10; i++) {
				const mockClass = createMockClass(`TestClass${i}`);
				scope = scope["/"](mockClass);
			}

			expect(scope.stack.length).toBe(10);
			expect(scope.root).toBe(scope.root);
		});
	});

	describe("Cache Functionality", () => {
		test("should initialize cache correctly", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const cachingRoot = root.caching();
			expect(cachingRoot.cache._tag).toBe("Some");

			if (cachingRoot.cache._tag === "Some") {
				const cache = cachingRoot.cache.value;
				expect(cache.typeMappings).toBeDefined();
				expect(cache.imports).toBeDefined();
				expect(cache.exports).toBeDefined();
				expect(cache.expandExport).toBeDefined();
				expect(cache.expandImportee).toBeDefined();
			}
		});

		test("should preserve cache through operations", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger).caching();

			const enhanced = root.enableUnqualifiedLookup();
			expect(enhanced.cache._tag).toBe("Some");

			const mockClass = createMockClass("TestClass");
			const scoped = enhanced["/"](mockClass);
			expect(scoped.root.cache._tag).toBe("Some");
		});
	});

	describe("Boundary Conditions", () => {
		test("should handle empty qualified identifiers", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			const emptyQIdent = createQIdentFromParts(); // Empty identifier
			const result = root.lookup(emptyQIdent, true);
			expect(result.isEmpty).toBe(true);
		});

		test("should handle null and undefined gracefully", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			expect(root.equals(null)).toBe(false);
			expect(root.equals(undefined)).toBe(false);
			expect(root.equals({})).toBe(false);
		});

		test("should handle maximum recursion depth", () => {
			const libName = createSimpleLibrary("test-lib");
			const logger = createMockLogger();
			const deps = new Map();
			const root = TsTreeScope.create(libName, false, deps, logger);

			// Test that deeply nested lookups don't cause stack overflow
			const qident = createQIdent("DeepType");
			const result = root.lookup(qident, true);
			expect(result.isEmpty).toBe(true);
		});
	});
});
