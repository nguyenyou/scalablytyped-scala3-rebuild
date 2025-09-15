/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.InferredDependencyTests
 * Tests for InferredDependency.ts - comprehensive test coverage matching the original Scala implementation
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, test } from "bun:test";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { InferredDependency } from "@/internal/ts/modules/InferredDependency.js";
import { TsProtectionLevel } from "@/internal/ts/TsProtectionLevel.js";
import {
	type TsContainerOrDecl,
	TsDeclInterface,
	TsIdent,
	type TsIdentLibrary,
	type TsIdentModule,
	type TsIdentSimple,
	type TsMember,
	TsMemberProperty,
	type TsParsedFile,
	TsParsedFile as TsParsedFileConstructor,
	TsQIdent,
	type TsType,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data specific to InferredDependency tests

function createMockLogger(): Logger<void> {
	return Logger.DevNull();
}

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
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		IArray.Empty, // inheritance
		members,
		codePath,
	);
}

function createMockTypeRef(qident: TsQIdent): TsTypeRef {
	return TsTypeRef.create(
		Comments.empty(),
		qident,
		IArray.Empty, // tparams
	);
}

function createMockParsedFile(
	members: IArray<TsContainerOrDecl>,
	codePath: CodePath = CodePath.noPath(),
): TsParsedFile {
	return TsParsedFileConstructor.create(
		Comments.empty(),
		IArray.Empty, // directives
		members,
		codePath,
	);
}

function createMockProperty(name: string, tpe: TsType): TsMemberProperty {
	return TsMemberProperty.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		some(tpe),
		none, // expr
		false, // isStatic
		false, // isReadOnly
	);
}

function createLibraryIdent(name: string): TsIdentLibrary {
	return TsIdent.librarySimple(name);
}

function createModuleIdent(name: string): TsIdentModule {
	return TsIdent.module(none, [name]);
}

describe("InferredDependency", () => {
	describe("InferredDependency - Basic Functionality", () => {
		test("returns empty set when no dependencies are inferred", () => {
			const libName = createLibraryIdent("test-lib");
			const file = createMockParsedFile(IArray.Empty);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(result.size).toBe(0);
		});

		test("excludes the library itself from inferred dependencies", () => {
			const libName = createLibraryIdent("react");
			const _reactInterface = createMockInterface("Component");
			const reactProperty = createMockProperty(
				"Component",
				createMockTypeRef(createQIdent("React", "Component")),
			);
			const interfaceWithReactProperty = createMockInterface(
				"Component",
				IArray.fromArray([reactProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interfaceWithReactProperty] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(
				Array.from(result).some((lib) => lib.value === libName.value),
			).toBe(false);
		});
	});

	describe("InferredDependency - Node Module Inference", () => {
		test("infers node dependency when non-resolved modules contain node modules", () => {
			const libName = createLibraryIdent("test-lib");
			const file = createMockParsedFile(IArray.Empty);
			const nonResolvedModules = new Set([
				createModuleIdent("fs"),
				createModuleIdent("path"),
				createModuleIdent("http"),
			]);
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(true);
			expect(result.size).toBe(1);
		});

		test("does not infer node dependency when no node modules are present", () => {
			const libName = createLibraryIdent("test-lib");
			const file = createMockParsedFile(IArray.Empty);
			const nonResolvedModules = new Set([
				createModuleIdent("lodash"),
				createModuleIdent("express"),
				createModuleIdent("custom-module"),
			]);
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(
				false,
			);
		});

		test("infers node dependency with mixed modules", () => {
			const libName = createLibraryIdent("test-lib");
			const file = createMockParsedFile(IArray.Empty);
			const nonResolvedModules = new Set([
				createModuleIdent("fs"), // node module
				createModuleIdent("lodash"), // non-node module
				createModuleIdent("crypto"), // node module
			]);
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(true);
		});
	});

	describe("InferredDependency - Prefix-based Inference", () => {
		test("infers React dependency from React prefix", () => {
			const libName = createLibraryIdent("test-lib");
			const reactProperty = createMockProperty(
				"component",
				createMockTypeRef(createQIdent("React", "Component")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([reactProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "react")).toBe(
				true,
			);
		});

		test("infers Angular dependency from ng prefix", () => {
			const libName = createLibraryIdent("test-lib");
			const ngProperty = createMockProperty(
				"service",
				createMockTypeRef(createQIdent("ng", "IService")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([ngProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "angular")).toBe(
				true,
			);
		});

		test("infers Angular dependency from angular prefix", () => {
			const libName = createLibraryIdent("test-lib");
			const angularProperty = createMockProperty(
				"module",
				createMockTypeRef(createQIdent("angular", "IModule")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([angularProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "angular")).toBe(
				true,
			);
		});

		test("infers Node dependency from NodeJS prefix", () => {
			const libName = createLibraryIdent("test-lib");
			const nodeProperty = createMockProperty(
				"process",
				createMockTypeRef(createQIdent("NodeJS", "Process")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([nodeProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(true);
		});

		test("infers Node dependency from Buffer prefix", () => {
			const libName = createLibraryIdent("test-lib");
			const bufferProperty = createMockProperty(
				"buffer",
				createMockTypeRef(createQIdent("Buffer")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([bufferProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(true);
		});

		test("infers Node dependency from global prefix", () => {
			const libName = createLibraryIdent("test-lib");
			const globalProperty = createMockProperty(
				"global",
				createMockTypeRef(createQIdent("global", "NodeJS")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([globalProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(true);
		});
	});

	describe("InferredDependency - Multiple Library Prefixes", () => {
		test("infers moment dependency from moment prefix", () => {
			const libName = createLibraryIdent("test-lib");
			const momentProperty = createMockProperty(
				"date",
				createMockTypeRef(createQIdent("moment", "Moment")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([momentProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "moment")).toBe(
				true,
			);
		});

		test("infers backbone dependency from Backbone prefix", () => {
			const libName = createLibraryIdent("test-lib");
			const backboneProperty = createMockProperty(
				"model",
				createMockTypeRef(createQIdent("Backbone", "Model")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([backboneProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "backbone")).toBe(
				true,
			);
		});

		test("infers leaflet dependency from Leaflet prefix", () => {
			const libName = createLibraryIdent("test-lib");
			const leafletProperty = createMockProperty(
				"map",
				createMockTypeRef(createQIdent("Leaflet", "Map")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([leafletProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "leaflet")).toBe(
				true,
			);
		});

		test("infers plotly.js dependency from Plotly prefix", () => {
			const libName = createLibraryIdent("test-lib");
			const plotlyProperty = createMockProperty(
				"plot",
				createMockTypeRef(createQIdent("Plotly", "PlotData")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([plotlyProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "plotly.js")).toBe(
				true,
			);
		});
	});

	describe("InferredDependency - Combined Inference", () => {
		test("infers both node and prefix-based dependencies", () => {
			const libName = createLibraryIdent("test-lib");
			const reactProperty = createMockProperty(
				"component",
				createMockTypeRef(createQIdent("React", "Component")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([reactProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set([
				createModuleIdent("fs"),
				createModuleIdent("path"),
			]);
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(true);
			expect(Array.from(result).some((lib) => lib.value === "react")).toBe(
				true,
			);
			expect(result.size).toBe(2);
		});

		test("infers multiple prefix-based dependencies", () => {
			const libName = createLibraryIdent("test-lib");
			const reactProperty = createMockProperty(
				"component",
				createMockTypeRef(createQIdent("React", "Component")),
			);
			const momentProperty = createMockProperty(
				"date",
				createMockTypeRef(createQIdent("moment", "Moment")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([reactProperty, momentProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "react")).toBe(
				true,
			);
			expect(Array.from(result).some((lib) => lib.value === "moment")).toBe(
				true,
			);
			expect(result.size).toBe(2);
		});

		test("handles duplicate prefix inferences correctly", () => {
			const libName = createLibraryIdent("test-lib");
			const reactProperty1 = createMockProperty(
				"component",
				createMockTypeRef(createQIdent("React", "Component")),
			);
			const reactProperty2 = createMockProperty(
				"element",
				createMockTypeRef(createQIdent("React", "Element")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([reactProperty1, reactProperty2] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "react")).toBe(
				true,
			);
			expect(result.size).toBe(1); // Should not duplicate react dependency
		});
	});

	describe("InferredDependency - Edge Cases", () => {
		test("handles empty file correctly", () => {
			const libName = createLibraryIdent("test-lib");
			const file = createMockParsedFile(IArray.Empty);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(result.size).toBe(0);
		});

		test("handles file with no qualified identifiers", () => {
			const libName = createLibraryIdent("test-lib");
			const simpleProperty = createMockProperty(
				"name",
				createMockTypeRef(createQIdent("string")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([simpleProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(result.size).toBe(0);
		});

		test("handles unknown prefixes correctly", () => {
			const libName = createLibraryIdent("test-lib");
			const unknownProperty = createMockProperty(
				"unknown",
				createMockTypeRef(createQIdent("UnknownLib", "Type")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([unknownProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(result.size).toBe(0);
		});

		test("handles empty qualified identifiers", () => {
			const libName = createLibraryIdent("test-lib");
			const emptyQIdentProperty = createMockProperty(
				"empty",
				createMockTypeRef(TsQIdent.empty()),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([emptyQIdentProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(result.size).toBe(0);
		});
	});

	describe("InferredDependency - Node Module Coverage", () => {
		test("recognizes all core node modules", () => {
			const libName = createLibraryIdent("test-lib");
			const file = createMockParsedFile(IArray.Empty);
			const coreNodeModules = new Set(
				[
					"buffer",
					"querystring",
					"events",
					"http",
					"cluster",
					"zlib",
					"os",
					"https",
					"punycode",
					"repl",
					"readline",
					"vm",
					"child_process",
					"url",
					"dns",
					"net",
					"dgram",
					"fs",
					"path",
					"string_decoder",
					"tls",
					"crypto",
					"stream",
					"util",
					"assert",
					"tty",
					"domain",
					"constants",
					"module",
					"process",
					"v8",
					"timers",
					"console",
					"async_hooks",
					"http2",
				].map(createModuleIdent),
			);
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				coreNodeModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(true);
			expect(result.size).toBe(1);
		});

		test("handles subset of node modules", () => {
			const libName = createLibraryIdent("test-lib");
			const file = createMockParsedFile(IArray.Empty);
			const someNodeModules = new Set([
				createModuleIdent("fs"),
				createModuleIdent("path"),
				createModuleIdent("crypto"),
			]);
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				someNodeModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(true);
			expect(result.size).toBe(1);
		});

		test("does not infer node for non-node modules", () => {
			const libName = createLibraryIdent("test-lib");
			const file = createMockParsedFile(IArray.Empty);
			const nonNodeModules = new Set([
				createModuleIdent("lodash"),
				createModuleIdent("express"),
				createModuleIdent("react"),
				createModuleIdent("custom-module"),
			]);
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonNodeModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(
				false,
			);
			expect(result.size).toBe(0);
		});
	});

	describe("InferredDependency - Complex Scenarios", () => {
		test("handles complex nested qualified identifiers", () => {
			const libName = createLibraryIdent("test-lib");
			const nestedReactProperty = createMockProperty(
				"component",
				createMockTypeRef(createQIdent("React", "Component", "Props")),
			);
			const interface1 = createMockInterface(
				"TestInterface",
				IArray.fromArray([nestedReactProperty] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "react")).toBe(
				true,
			);
		});

		test("handles multiple interfaces with different dependencies", () => {
			const libName = createLibraryIdent("test-lib");
			const reactProperty = createMockProperty(
				"component",
				createMockTypeRef(createQIdent("React", "Component")),
			);
			const momentProperty = createMockProperty(
				"date",
				createMockTypeRef(createQIdent("moment", "Moment")),
			);
			const backboneProperty = createMockProperty(
				"model",
				createMockTypeRef(createQIdent("Backbone", "Model")),
			);

			const interface1 = createMockInterface(
				"ReactInterface",
				IArray.fromArray([reactProperty] as TsMember[]),
			);
			const interface2 = createMockInterface(
				"MomentInterface",
				IArray.fromArray([momentProperty] as TsMember[]),
			);
			const interface3 = createMockInterface(
				"BackboneInterface",
				IArray.fromArray([backboneProperty] as TsMember[]),
			);

			const file = createMockParsedFile(
				IArray.fromArray([
					interface1,
					interface2,
					interface3,
				] as TsContainerOrDecl[]),
			);
			const nonResolvedModules = new Set<TsIdentModule>();
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			expect(Array.from(result).some((lib) => lib.value === "react")).toBe(
				true,
			);
			expect(Array.from(result).some((lib) => lib.value === "moment")).toBe(
				true,
			);
			expect(Array.from(result).some((lib) => lib.value === "backbone")).toBe(
				true,
			);
			expect(result.size).toBe(3);
		});

		test("handles maximum complexity scenario", () => {
			const libName = createLibraryIdent("complex-lib");

			// Create properties with various library prefixes
			const reactProperty = createMockProperty(
				"component",
				createMockTypeRef(createQIdent("React", "Component")),
			);
			const nodeProperty = createMockProperty(
				"process",
				createMockTypeRef(createQIdent("NodeJS", "Process")),
			);
			const bufferProperty = createMockProperty(
				"buffer",
				createMockTypeRef(createQIdent("Buffer")),
			);
			const momentProperty = createMockProperty(
				"date",
				createMockTypeRef(createQIdent("moment", "Moment")),
			);

			const interface1 = createMockInterface(
				"ComplexInterface",
				IArray.fromArray([
					reactProperty,
					nodeProperty,
					bufferProperty,
					momentProperty,
				] as TsMember[]),
			);
			const file = createMockParsedFile(
				IArray.fromArray([interface1] as TsContainerOrDecl[]),
			);

			// Add node modules to non-resolved modules
			const nonResolvedModules = new Set([
				createModuleIdent("fs"),
				createModuleIdent("crypto"),
				createModuleIdent("custom-module"), // non-node module
			]);
			const logger = createMockLogger();

			const result = InferredDependency.apply(
				libName,
				file,
				nonResolvedModules,
				logger,
			);

			// Should infer: react, node (from both prefix and modules), moment
			// Note: node should only appear once despite being inferred from multiple sources
			expect(Array.from(result).some((lib) => lib.value === "react")).toBe(
				true,
			);
			expect(Array.from(result).some((lib) => lib.value === "node")).toBe(true);
			expect(Array.from(result).some((lib) => lib.value === "moment")).toBe(
				true,
			);
			expect(result.size).toBe(3); // Should not duplicate node dependency
		});
	});
});
