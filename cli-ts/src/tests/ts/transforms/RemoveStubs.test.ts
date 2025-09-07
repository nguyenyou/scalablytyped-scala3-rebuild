/**
 * Tests for RemoveStubs transformation
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import { NoComments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { Logger } from "../../../internal/logging/index.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { JsLocation } from "../../../internal/ts/JsLocation.js";
import { TsTreeScope } from "../../../internal/ts/TsTreeScope.js";
import { RemoveStubs } from "../../../internal/ts/transforms/RemoveStubs.js";
import {
	type TsContainerOrDecl,
	TsDeclClass,
	TsDeclInterface,
	TsDeclNamespace,
	TsGlobal,
	TsIdent,
	TsIdentNode,
	TsIdentStd,
	TsMemberProperty,
	TsParsedFile,
	TsProtectionLevel,
	type TsQIdent,
	TsTypeRef,
} from "../../../internal/ts/trees.js";

describe("RemoveStubs", () => {
	// Helper functions for creating test objects
	function createQIdent(...parts: string[]): TsQIdent {
		return {
			_tag: "TsQIdent",
			parts: IArray.fromArray(parts.map((p) => TsIdent.simple(p) as TsIdent)),
			asString: `TsQIdent(${parts.join(".")})`,
		};
	}

	function createMockInterface(
		name: string,
		members: IArray<any> = IArray.Empty,
	): TsDeclInterface {
		return TsDeclInterface.create(
			NoComments.instance,
			false,
			TsIdent.simple(name),
			IArray.Empty,
			IArray.Empty,
			members,
			CodePath.hasPath(
				TsIdent.librarySimple("test-lib"),
				createQIdent("test-lib", name),
			),
		);
	}

	function createMockClass(name: string): TsDeclClass {
		return TsDeclClass.create(
			NoComments.instance,
			false,
			false,
			TsIdent.simple(name),
			IArray.Empty,
			none,
			IArray.Empty,
			IArray.Empty,
			JsLocation.zero(),
			CodePath.hasPath(
				TsIdent.librarySimple("test-lib"),
				createQIdent("test-lib", name),
			),
		);
	}

	function createMockNamespace(
		name: string,
		members: IArray<TsContainerOrDecl> = IArray.Empty,
	): TsDeclNamespace {
		return TsDeclNamespace.create(
			NoComments.instance,
			false,
			TsIdent.simple(name),
			members,
			CodePath.hasPath(
				TsIdent.librarySimple("test-lib"),
				createQIdent("test-lib", name),
			),
			JsLocation.zero(),
		);
	}

	function createMockProperty(name: string): TsMemberProperty {
		return TsMemberProperty.create(
			NoComments.instance,
			TsProtectionLevel.default(),
			TsIdent.simple(name),
			some(TsTypeRef.string),
			none,
			false,
			false,
		);
	}

	function createMockParsedFile(
		members: IArray<TsContainerOrDecl>,
	): TsParsedFile {
		return TsParsedFile.create(
			NoComments.instance,
			IArray.Empty,
			members,
			CodePath.hasPath(
				TsIdent.librarySimple("test-lib"),
				createQIdent("test-lib", "index"),
			),
		);
	}

	function createMockGlobal(members: IArray<TsContainerOrDecl>): TsGlobal {
		return TsGlobal.create(
			NoComments.instance,
			false,
			members,
			CodePath.hasPath(
				TsIdent.librarySimple("test-lib"),
				createQIdent("test-lib", "global"),
			),
		);
	}

	function createMockScope(): TsTreeScope {
		const root = TsTreeScope.create(
			TsIdent.librarySimple("test-lib"),
			false,
			new Map(),
			Logger.DevNull(),
		);
		return root;
	}

	function createMockScopeWithStdTypes(...typeNames: string[]): TsTreeScope {
		// Create a mock scope that simulates having std types
		const root = TsTreeScope.create(
			TsIdent.librarySimple("test-lib"),
			false,
			new Map(),
			Logger.DevNull(),
		);

		// Mock the lookupType method to return non-empty results for std types
		const originalLookupType = root.lookupType.bind(root);
		root.lookupType = (qname: TsQIdent, skipValidation = false) => {
			// Check if this is a std or node type we want to simulate
			if (qname.parts.length === 2) {
				const [lib, typeName] = qname.parts.toArray();
				if (
					(lib === TsIdentStd || lib === TsIdentNode) &&
					typeNames.includes(typeName.value)
				) {
					// Return a mock interface to simulate the type exists
					return IArray.apply(createMockInterface(typeName.value) as any);
				}
			}
			return originalLookupType(qname, skipValidation);
		};

		return root;
	}

	describe("Basic Functionality", () => {
		it("has apply method that returns visitor", () => {
			const visitor = RemoveStubs.apply();
			expect(visitor).toBeDefined();
		});

		it("has enterTsParsedFile method", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const parsedFile = createMockParsedFile(IArray.Empty);
			const result = visitor.enterTsParsedFile(scope)(parsedFile);
			expect(result).toBeDefined();
		});

		it("has enterTsGlobal method", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const global = createMockGlobal(IArray.Empty);
			const result = visitor.enterTsGlobal(scope)(global);
			expect(result).toBeDefined();
		});

		it("leaves empty parsed files unchanged", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const parsedFile = createMockParsedFile(IArray.Empty);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(0);
		});

		it("leaves empty global declarations unchanged", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const global = createMockGlobal(IArray.Empty);

			const result = visitor.enterTsGlobal(scope)(global);

			expect(result.members.length).toBe(0);
		});
	});

	describe("Non-Interface Declaration Preservation", () => {
		it("preserves class declarations", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const clazz = createMockClass("TestClass");
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(clazz),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclClass");
		});

		it("preserves namespace declarations", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const namespace = createMockNamespace("TestNamespace");
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(namespace),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclNamespace");
		});

		it("preserves mixed declaration types", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const clazz = createMockClass("TestClass");
			const namespace = createMockNamespace("TestNamespace");
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(clazz, namespace),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(2);
		});
	});

	describe("Interface with Members Preservation", () => {
		it("preserves interfaces with members", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const property = createMockProperty("testProp");
			const iface = createMockInterface(
				"TestInterface",
				IArray.apply(property as any),
			);
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(iface),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclInterface");
		});

		it("preserves interfaces with multiple members", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const prop1 = createMockProperty("prop1");
			const prop2 = createMockProperty("prop2");
			const iface = createMockInterface(
				"TestInterface",
				IArray.apply(prop1 as any, prop2 as any),
			);
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(iface),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclInterface");
		});
	});

	describe("Empty Interface Handling", () => {
		it("preserves empty interfaces that don't exist in std", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const iface = createMockInterface("CustomInterface");
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(iface),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclInterface");
		});

		it("removes empty interfaces that exist in std", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes("Array");
			const iface = createMockInterface("Array");
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(iface),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(0);
		});

		it("removes empty interfaces that exist in node", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes("Buffer");
			const iface = createMockInterface("Buffer");
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(iface),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(0);
		});

		it("handles mixed empty and non-empty interfaces", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes("Array");
			const stubInterface = createMockInterface("Array"); // Empty, exists in std
			const property = createMockProperty("testProp");
			const validInterface = createMockInterface(
				"ValidInterface",
				IArray.apply(property as any),
			);
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(stubInterface, validInterface),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclInterface");
			expect((result.members.apply(0) as TsDeclInterface).name.value).toBe(
				"ValidInterface",
			);
		});
	});

	describe("Global Declaration Processing", () => {
		it("processes global declarations same as parsed files", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes("Array");
			const stubInterface = createMockInterface("Array");
			const clazz = createMockClass("TestClass");
			const global = createMockGlobal(
				IArray.apply<TsContainerOrDecl>(stubInterface, clazz),
			);

			const result = visitor.enterTsGlobal(scope)(global);

			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclClass");
		});

		it("preserves global metadata during transformation", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const clazz = createMockClass("TestClass");
			const global = createMockGlobal(IArray.apply<TsContainerOrDecl>(clazz));

			const result = visitor.enterTsGlobal(scope)(global);

			expect(result.declared).toBe(false);
			expect(result.comments).toBe(NoComments.instance);
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("handles empty member arrays gracefully", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const parsedFile = createMockParsedFile(IArray.Empty);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(0);
		});

		it("handles large numbers of declarations", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();

			// Create many declarations
			const declarations = Array.from({ length: 100 }, (_, i) =>
				createMockClass(`TestClass${i}`),
			);
			const parsedFile = createMockParsedFile(
				IArray.fromArray<TsContainerOrDecl>(declarations),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(100);
		});

		it("handles mixed stub and non-stub interfaces", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes("Array", "Object");

			const stubArray = createMockInterface("Array");
			const stubObject = createMockInterface("Object");
			const customInterface = createMockInterface("CustomInterface");
			const property = createMockProperty("prop");
			const interfaceWithMembers = createMockInterface(
				"InterfaceWithMembers",
				IArray.apply(property as any),
			);

			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(
					stubArray,
					customInterface,
					stubObject,
					interfaceWithMembers,
				),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(2);
			expect((result.members.apply(0) as TsDeclInterface).name.value).toBe(
				"CustomInterface",
			);
			expect((result.members.apply(1) as TsDeclInterface).name.value).toBe(
				"InterfaceWithMembers",
			);
		});

		it("preserves file metadata during transformation", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();
			const clazz = createMockClass("TestClass");
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(clazz),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.comments).toBe(NoComments.instance);
			expect(result.directives.length).toBe(0);
		});
	});

	describe("Complex Scenarios", () => {
		it("handles nested namespace with stub interfaces", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes("Array");

			const stubInterface = createMockInterface("Array");
			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.apply<TsContainerOrDecl>(stubInterface),
			);
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(namespace),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			// Namespace should be preserved (RemoveStubs only processes top-level members)
			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsDeclNamespace");
		});

		it("handles multiple std library conflicts", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes(
				"Array",
				"Object",
				"Function",
				"String",
			);

			const stubs = ["Array", "Object", "Function", "String"].map((name) =>
				createMockInterface(name),
			);
			const parsedFile = createMockParsedFile(
				IArray.fromArray<TsContainerOrDecl>(stubs),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(0);
		});

		it("performance test with many stub interfaces", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes("Array");

			const startTime = Date.now();

			// Create many stub interfaces
			const stubs = Array.from({ length: 1000 }, () =>
				createMockInterface("Array"),
			);
			const parsedFile = createMockParsedFile(
				IArray.fromArray<TsContainerOrDecl>(stubs),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			const endTime = Date.now();

			expect(result.members.length).toBe(0);
			expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
		});
	});

	describe("Integration and Visitor Pattern", () => {
		it("works correctly with visitor pattern", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();

			expect(typeof visitor.enterTsParsedFile).toBe("function");
			expect(typeof visitor.enterTsGlobal).toBe("function");

			const parsedFile = createMockParsedFile(IArray.Empty);
			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result).toBeDefined();
			expect(result._tag).toBe("TsParsedFile");
		});

		it("singleton instance works correctly", () => {
			const visitor1 = RemoveStubs.apply();
			const visitor2 = RemoveStubs.apply();

			// Should create separate instances
			expect(visitor1).toBeDefined();
			expect(visitor2).toBeDefined();
		});

		it("handles transformation pipeline integration", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScope();

			// Test that the transformation can be chained
			const clazz = createMockClass("TestClass");
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(clazz),
			);

			const result1 = visitor.enterTsParsedFile(scope)(parsedFile);
			const result2 = visitor.enterTsParsedFile(scope)(result1);

			expect(result1.members.length).toBe(1);
			expect(result2.members.length).toBe(1);
		});

		it("handles both std and node type conflicts", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes("Array", "Buffer");

			const stdStub = createMockInterface("Array");
			const nodeStub = createMockInterface("Buffer");
			const validInterface = createMockInterface("CustomInterface");

			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(stdStub, nodeStub, validInterface),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(1);
			expect((result.members.apply(0) as TsDeclInterface).name.value).toBe(
				"CustomInterface",
			);
		});

		it("preserves interfaces with inheritance", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes("Array");

			// Create interface with inheritance (not empty)
			const inheritanceInterface = TsDeclInterface.create(
				NoComments.instance,
				false,
				TsIdent.simple("Array"),
				IArray.Empty,
				IArray.apply<TsTypeRef>(TsTypeRef.string), // has inheritance
				IArray.Empty,
				CodePath.hasPath(
					TsIdent.librarySimple("test-lib"),
					createQIdent("test-lib", "Array"),
				),
			);

			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(inheritanceInterface),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			// Should be preserved because it has inheritance (not truly empty)
			expect(result.members.length).toBe(1);
		});

		it("handles scope lookup failures gracefully", () => {
			const visitor = RemoveStubs.apply();

			// Create a scope that throws errors on lookup
			const errorScope = createMockScope();
			const _originalLookupType = errorScope.root.lookupType.bind(
				errorScope.root,
			);
			errorScope.root.lookupType = () => {
				throw new Error("Lookup failed");
			};

			const emptyInterface = createMockInterface("TestInterface");
			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(emptyInterface),
			);

			// Should not throw and should preserve the interface
			const result = visitor.enterTsParsedFile(errorScope)(parsedFile);
			expect(result.members.length).toBe(1);
		});

		it("validates stub removal criteria precisely", () => {
			const visitor = RemoveStubs.apply();
			const scope = createMockScopeWithStdTypes("Array");

			// Test exact conditions for stub removal
			const emptyStub = createMockInterface("Array"); // Empty + exists in std = remove
			const property = createMockProperty("prop");
			const nonEmptyStub = createMockInterface(
				"Array",
				IArray.apply<any>(property),
			); // Not empty = keep
			const emptyNonStub = createMockInterface("CustomType"); // Empty but not in std = keep

			const parsedFile = createMockParsedFile(
				IArray.apply<TsContainerOrDecl>(emptyStub, nonEmptyStub, emptyNonStub),
			);

			const result = visitor.enterTsParsedFile(scope)(parsedFile);

			expect(result.members.length).toBe(2);
			expect((result.members.apply(0) as TsDeclInterface).name.value).toBe(
				"Array",
			); // non-empty version
			expect((result.members.apply(1) as TsDeclInterface).name.value).toBe(
				"CustomType",
			);
		});
	});
});
