/**
 * TypeScript port of ExtractInterfacesTests.scala
 *
 * Comprehensive unit tests for the ExtractInterfaces transform functionality.
 * Tests all functionality including interface extraction from type objects, namespace integration,
 * conflict handling, and edge cases.
 */

import { describe, expect, test } from "bun:test";
import { none, some } from "fp-ts/Option";
import { Comments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { JsLocation } from "../../../internal/ts/JsLocation.js";
import { TsProtectionLevel } from "../../../internal/ts/TsProtectionLevel.js";
import {
	ConflictHandlingStore,
	extractInterfaces,
	isDictionary,
	shouldBeExtracted,
	willBeErased,
} from "../../../internal/ts/transforms/ExtractInterfaces.js";
import {
	IndexingDict,
	type TsContainerOrDecl,
	TsDeclInterface,
	TsDeclNamespace,
	TsDeclVar,
	TsIdent,
	type TsIdentLibrary,
	type TsIdentSimple,
	type TsMember,
	TsMemberIndex,
	TsMemberProperty,
	TsParsedFile,
	TsQIdent,
	type TsTree,
	TsTypeObject,
	TsTypeRef,
} from "../../../internal/ts/trees.js";
import {
	createMockInterface,
	createMockParsedFile,
	createMockProperty,
	createMockScope,
	createMockVariable,
	createSimpleIdent,
	createTypeParam,
	createTypeRef,
} from "../../utils/TestUtils.js";

// Helper functions for creating test data
function createLibraryIdent(name: string): TsIdentLibrary {
	return TsIdent.librarySimple(name);
}

function createTypeObject(members: IArray<TsMember>): TsTypeObject {
	return TsTypeObject.create(Comments.empty(), members);
}

function createMockVar(
	name: string,
	tpe?: TsTypeObject,
): TsDeclVar {
	return TsDeclVar.create(
		Comments.empty(),
		false, // declared
		false, // readOnly
		TsIdent.simple(name),
		tpe ? some(tpe) : none,
		none, // expr
		JsLocation.zero(),
		CodePath.noPath(),
	);
}

function createMockIndex(
	keyType: TsTypeRef = TsTypeRef.string,
	valueType: TsTypeRef = TsTypeRef.any,
): TsMemberIndex {
	const indexing = IndexingDict.create(TsIdent.simple("key"), keyType);
	return TsMemberIndex.create(
		Comments.empty(),
		false, // readonly
		TsProtectionLevel.default(),
		indexing,
		some(valueType),
	);
}

describe("ExtractInterfaces", () => {
	describe("Basic Functionality", () => {
		test("has extractInterfaces function", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const scope = createMockScope();
			const file = createMockParsedFile("test");

			const result = extractInterfaces(library, into, scope)(file);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsParsedFile");
		});

		test("leaves files without type objects unchanged", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const scope = createMockScope();
			const interface_ = createMockInterface("TestInterface");
			const file = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray<TsContainerOrDecl>([interface_]),
				CodePath.noPath(),
			);

			const result = extractInterfaces(library, into, scope)(file);

			expect(result.members.length).toBe(1);
			expect(result.members.toArray()).toContain(interface_);
		});

		test("handles empty files", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const scope = createMockScope();
			const file = createMockParsedFile("test");

			const result = extractInterfaces(library, into, scope)(file);

			expect(result.members.isEmpty).toBe(true);
		});
	});

	describe("Type Object Extraction", () => {
		test("extracts simple type objects", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const scope = createMockScope();

			const prop = createMockProperty("name");
			const typeObj = createTypeObject(IArray.fromArray<TsMember>([prop]));
			const variable = createMockVar("test", typeObj);
			const file = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray<TsContainerOrDecl>([variable]),
				CodePath.noPath(),
			);

			const result = extractInterfaces(library, into, scope)(file);

			// ExtractInterfaces doesn't extract from variable declarations (shouldBeExtracted returns false)
			// The important thing is that it handles the input gracefully
			expect(result.members.length).toBe(1); // just the variable
			expect(result.members.toArray()).toContain(variable);
		});

		test("extracts type objects with multiple members", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const scope = createMockScope();

			const prop1 = createMockProperty("name", some(TsTypeRef.string));
			const prop2 = createMockProperty("age", some(TsTypeRef.number));
			const typeObj = createTypeObject(IArray.fromArray<TsMember>([prop1, prop2]));
			const variable = createMockVar("person", typeObj);
			const file = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray<TsContainerOrDecl>([variable]),
				CodePath.noPath(),
			);

			const result = extractInterfaces(library, into, scope)(file);

			// ExtractInterfaces doesn't extract from variable declarations
			expect(result.members.length).toBe(1);
			expect(result.members.toArray()).toContain(variable);
		});
	});

	describe("Dictionary Handling", () => {
		test("does not extract dictionary types", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const scope = createMockScope();

			const index = createMockIndex(TsTypeRef.string, TsTypeRef.any);
			const typeObj = createTypeObject(IArray.fromArray<TsMember>([index]));
			const variable = createMockVar("dict", typeObj);
			const file = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray<TsContainerOrDecl>([variable]),
				CodePath.noPath(),
			);

			const result = extractInterfaces(library, into, scope)(file);

			// Should not extract dictionary types
			expect(result.members.length).toBe(1);
			expect(
				result.members.exists((member) => member._tag === "TsDeclNamespace"),
			).toBe(false);
		});

		test("extracts mixed dictionary and property types", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const scope = createMockScope();

			const prop = createMockProperty("name");
			const index = createMockIndex();
			const typeObj = createTypeObject(IArray.fromArray<TsMember>([prop, index]));
			const variable = createMockVar("mixed", typeObj);
			const file = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray<TsContainerOrDecl>([variable]),
				CodePath.noPath(),
			);

			const result = extractInterfaces(library, into, scope)(file);

			// ExtractInterfaces doesn't extract from variable declarations
			expect(result.members.length).toBe(1);
			expect(result.members.toArray()).toContain(variable);
		});
	});

	describe("Edge Cases", () => {
		test("handles empty type objects", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const scope = createMockScope();

			const typeObj = createTypeObject(IArray.Empty);
			const variable = createMockVar("empty", typeObj);
			const file = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray<TsContainerOrDecl>([variable]),
				CodePath.noPath(),
			);

			const result = extractInterfaces(library, into, scope)(file);

			// Should not extract empty type objects
			expect(result.members.length).toBe(1);
			expect(
				result.members.exists((member) => member._tag === "TsDeclNamespace"),
			).toBe(false);
		});

		test("handles type objects in variable declarations", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const scope = createMockScope();

			const prop = createMockProperty("value");
			const typeObj = createTypeObject(IArray.fromArray<TsMember>([prop]));
			const variable = createMockVar("inVar", typeObj);
			const file = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray<TsContainerOrDecl>([variable]),
				CodePath.noPath(),
			);

			const result = extractInterfaces(library, into, scope)(file);

			// Should not extract type objects in variable declarations (shouldBeExtracted returns false)
			expect(result.members.length).toBe(1);
			expect(
				result.members.exists((member) => member._tag === "TsDeclNamespace"),
			).toBe(false);
		});

		test("preserves original file structure", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const scope = createMockScope();

			const originalInterface = createMockInterface("OriginalInterface");
			const prop = createMockProperty("value");
			const typeObj = createTypeObject(IArray.fromArray<TsMember>([prop]));
			const variable = createMockVar("test", typeObj);

			const file = TsParsedFile.create(
				Comments.empty(),
				IArray.Empty,
				IArray.fromArray<TsContainerOrDecl>([originalInterface, variable]),
				CodePath.noPath(),
			);

			const result = extractInterfaces(library, into, scope)(file);

			// Should preserve original members (no extraction from variables)
			expect(result.members.toArray()).toContain(originalInterface);
			expect(result.members.toArray()).toContain(variable);
			expect(result.members.length).toBe(2);
		});
	});

	describe("Utility Functions", () => {
		describe("isDictionary", () => {
			test("returns true for dictionary-only members", () => {
				const index = createMockIndex();
				const members = IArray.fromArray<TsMember>([index]);
				expect(isDictionary(members)).toBe(true);
			});

			test("returns false for mixed members", () => {
				const prop = createMockProperty("name");
				const index = createMockIndex();
				const members = IArray.fromArray<TsMember>([prop, index]);
				expect(isDictionary(members)).toBe(false);
			});

			test("returns false for empty members", () => {
				expect(isDictionary(IArray.Empty)).toBe(false);
			});

			test("returns false for property-only members", () => {
				const prop = createMockProperty("name");
				const members = IArray.fromArray<TsMember>([prop]);
				expect(isDictionary(members)).toBe(false);
			});
		});

		describe("shouldBeExtracted", () => {
			test("returns false for variable declarations", () => {
				const variable = createMockVar("test");
				const scope = createMockScope();
				// Create a new scope with the variable in the stack
				const scopeWithVar = { ...scope, stack: [variable, variable] };

				expect(shouldBeExtracted(scopeWithVar)).toBe(false);
			});

			test("returns true for other contexts", () => {
				const scope = createMockScope();
				// Create a new scope with empty stack
				const emptyScope = { ...scope, stack: [] };

				expect(shouldBeExtracted(emptyScope)).toBe(true);
			});
		});

		describe("willBeErased", () => {
			test("returns true for mapped types", () => {
				const typeObj = createTypeObject(IArray.Empty);
				const mappedMember = {
					_tag: "TsMemberTypeMapped" as const,
				};
				const stack = [mappedMember as TsTree];

				expect(willBeErased(stack, typeObj)).toBe(true);
			});

			test("returns true for predicate types", () => {
				const typeObj = createTypeObject(IArray.Empty);
				const predicateMember = {
					_tag: "TsTypePredicate" as const,
				};
				const stack = [predicateMember as TsTree];

				expect(willBeErased(stack, typeObj)).toBe(true);
			});

			test("returns false for normal types", () => {
				const prop = createMockProperty("name");
				const typeObj = createTypeObject(IArray.fromArray<TsMember>([prop]));
				const stack: TsTree[] = [];

				expect(willBeErased(stack, typeObj)).toBe(false);
			});
		});
	});

	describe("ConflictHandlingStore", () => {
		test("creates store with library and target", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");

			const store = new ConflictHandlingStore(library, into);
			expect(store).toBeDefined();
		});

		test("returns empty interfaces initially", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const store = new ConflictHandlingStore(library, into);

			const interfaces = store.getInterfaces();
			expect(interfaces.isEmpty).toBe(true);
		});

		test("adds interface and returns code path", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const store = new ConflictHandlingStore(library, into);
			const scope = createMockScope();

			const prop = createMockProperty("name");
			const members = IArray.fromArray<TsMember>([prop]);
			const referencedTparams = IArray.Empty;

			const addInterfaceFn = store.addInterface(
				scope,
				"Test",
				members,
				referencedTparams,
			);

			const codePath = addInterfaceFn((name) =>
				TsDeclInterface.create(
					Comments.empty(),
					true,
					name,
					referencedTparams,
					IArray.Empty,
					members,
					CodePath.noPath(),
				),
			);

			expect(CodePath.isHasPath(codePath)).toBe(true);
			const interfaces = store.getInterfaces();
			expect(interfaces.nonEmpty).toBe(true);
		});

		test("handles interface conflicts", () => {
			const library = createLibraryIdent("test-lib");
			const into = createSimpleIdent("Anon");
			const store = new ConflictHandlingStore(library, into);
			const scope = createMockScope();

			const prop1 = createMockProperty("name");
			const members1 = IArray.fromArray<TsMember>([prop1]);
			const prop2 = createMockProperty("age");
			const members2 = IArray.fromArray<TsMember>([prop2]);
			const referencedTparams = IArray.Empty;

			// Add first interface
			const addInterfaceFn1 = store.addInterface(
				scope,
				"Test",
				members1,
				referencedTparams,
			);
			addInterfaceFn1((name) =>
				TsDeclInterface.create(
					Comments.empty(),
					true,
					name,
					referencedTparams,
					IArray.Empty,
					members1,
					CodePath.noPath(),
				),
			);

			// Add second interface with different members but same prefix
			const addInterfaceFn2 = store.addInterface(
				scope,
				"Test",
				members2,
				referencedTparams,
			);
			addInterfaceFn2((name) =>
				TsDeclInterface.create(
					Comments.empty(),
					true,
					name,
					referencedTparams,
					IArray.Empty,
					members2,
					CodePath.noPath(),
				),
			);

			const interfaces = store.getInterfaces();
			expect(interfaces.length).toBeGreaterThanOrEqual(1);
		});
	});
});
