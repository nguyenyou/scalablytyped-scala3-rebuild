/**
 * Comprehensive test suite for TypeAliasToConstEnum transformation
 */

import { describe, expect, it } from "bun:test";
import { none, some } from "fp-ts/Option";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import { TypeAliasToConstEnum } from "@/internal/ts/transforms/TypeAliasToConstEnum.js";
import type {
	TsDeclEnum,
	TsDeclTypeAlias,
	TsDeclVar,
	TsType,
	TsTypeParam,
} from "@/internal/ts/trees.js";
import {
	TsDeclNamespace,
	TsDeclTypeAlias as TsDeclTypeAliasConstructor,
	TsDeclVar as TsDeclVarConstructor,
	TsIdent,
	TsIdentLibrary,
	TsLiteral,
	TsParsedFile,
	TsQIdent,
	TsTypeLiteral,
	TsTypeParam as TsTypeParamConstructor,
	TsTypeRef,
	TsTypeUnion,
} from "@/internal/ts/trees.js";
import { Raw } from "../../../internal/Comment.js";
import { Comments, NoComments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { Logger } from "../../../internal/logging/index.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { JsLocation } from "../../../internal/ts/JsLocation.js";

// ============================================================================
// Helper Functions for Creating Test Data
// ============================================================================

function createSimpleIdent(name: string) {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]) {
	return TsQIdent.of(...parts.map(createSimpleIdent));
}

function createTypeRef(
	name: string,
	tparams: IArray<TsType> = IArray.Empty,
): TsTypeRef {
	return TsTypeRef.create(NoComments.instance, createQIdent(name), tparams);
}

function createUnionType(...types: TsType[]): TsTypeUnion {
	return TsTypeUnion.create(IArray.fromArray(types));
}

function createLiteralType(value: string): TsTypeLiteral {
	return TsTypeLiteral.create(TsLiteral.str(value));
}

function createNumLiteralType(value: string): TsTypeLiteral {
	return TsTypeLiteral.create(TsLiteral.num(value));
}

function createBoolLiteralType(value: boolean): TsTypeLiteral {
	return TsTypeLiteral.create(TsLiteral.bool(value));
}

function createMockTypeAlias(
	name: string,
	alias: TsType,
	tparams: IArray<TsTypeParam> = IArray.Empty,
): TsDeclTypeAlias {
	return TsDeclTypeAliasConstructor.create(
		NoComments.instance,
		false,
		createSimpleIdent(name),
		tparams,
		alias,
		CodePath.hasPath(createSimpleIdent("test-lib"), createQIdent(name)),
	);
}

function createMockNamespace(
	name: string,
	members: IArray<any> = IArray.Empty,
): TsDeclNamespace {
	return TsDeclNamespace.create(
		NoComments.instance,
		false,
		createSimpleIdent(name),
		members,
		CodePath.hasPath(createSimpleIdent("test-lib"), createQIdent(name)),
		JsLocation.zero(),
	);
}

function createMockScope(
	members: IArray<any> = IArray.Empty,
	logger: Logger<void> = Logger.DevNull(),
): TsTreeScope {
	const libName = TsIdentLibrary.construct("test-lib");
	const parsedFile = TsParsedFile.create(
		NoComments.instance,
		IArray.Empty,
		members,
		CodePath.noPath(),
	);
	const deps = new Map();
	return TsTreeScope.create(libName, false, deps, logger)["/"](parsedFile);
}

function createMockScopeWithContainer(
	container: any,
	logger: Logger<void> = Logger.DevNull(),
): TsTreeScope {
	const libName = TsIdentLibrary.construct("test-lib");
	const parsedFile = TsParsedFile.create(
		NoComments.instance,
		IArray.Empty,
		IArray.fromArray([container]),
		CodePath.noPath(),
	);
	const deps = new Map();
	const rootScope = TsTreeScope.create(libName, false, deps, logger)["/"](
		parsedFile,
	);
	return rootScope["/"](container);
}

// ============================================================================
// Test Suite
// ============================================================================

describe("TypeAliasToConstEnum", () => {
	describe("Basic Functionality", () => {
		it("should create TypeAliasToConstEnum transformation", () => {
			const transform = new TypeAliasToConstEnum();
			expect(transform).toBeDefined();
			expect(transform).toBeInstanceOf(TypeAliasToConstEnum);
		});

		it("should have singleton instance", () => {
			const instance1 = TypeAliasToConstEnum.instance;
			const instance2 = TypeAliasToConstEnum.instance;
			expect(instance1).toBe(instance2);
			expect(instance1).toBeInstanceOf(TypeAliasToConstEnum);
		});

		it("should have enterTsDecl method", () => {
			const typeAlias = createMockTypeAlias(
				"TestAlias",
				createTypeRef("string"),
			);
			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);
			expect(result).toBeDefined();
		});
	});

	describe("Type Alias Processing", () => {
		it("should preserve non-union type aliases", () => {
			const typeAlias = createMockTypeAlias(
				"SimpleAlias",
				createTypeRef("string"),
			);
			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclTypeAlias");
			const resultAlias = result as TsDeclTypeAlias;
			expect(resultAlias.name.value).toBe("SimpleAlias");
			expect(resultAlias.alias._tag).toBe("TsTypeRef");
		});

		it("should preserve non-type-alias declarations", () => {
			const scope = createMockScope();
			const variable = TsDeclVarConstructor.create(
				NoComments.instance,
				false,
				false,
				createSimpleIdent("testVar"),
				some(createTypeRef("string")),
				none,
				JsLocation.zero(),
				CodePath.hasPath(
					createSimpleIdent("test-lib"),
					createQIdent("testVar"),
				),
			);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(variable);

			expect(result._tag).toBe("TsDeclVar");
			expect((result as TsDeclVar).name.value).toBe("testVar");
		});

		it("should preserve type aliases with type parameters", () => {
			const scope = createMockScope();
			const tparam = TsTypeParamConstructor.create(
				NoComments.instance,
				createSimpleIdent("T"),
				none,
				none,
			);
			const unionType = createUnionType(
				createLiteralType("value1"),
				createLiteralType("value2"),
			);
			const typeAlias = createMockTypeAlias(
				"GenericAlias",
				unionType,
				IArray.fromArray([tparam]),
			);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Should preserve as type alias since it has type parameters
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("GenericAlias");
		});

		it("should convert simple literal union to const enum", () => {
			const unionType = createUnionType(
				createLiteralType("value1"),
				createLiteralType("value2"),
				createLiteralType("value3"),
			);
			const typeAlias = createMockTypeAlias("LiteralUnion", unionType);

			// Create a namespace containing the type alias to satisfy the uniqueness check
			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("LiteralUnion");
			expect(resultEnum.isConst).toBe(true);
			expect(resultEnum.members.length).toBe(3);
			expect(
				resultEnum.members
					.map((m) => m.name.value)
					.toArray()
					.sort(),
			).toEqual(["value1", "value2", "value3"]);
		});

		it("should convert mixed literal types to const enum", () => {
			const unionType = createUnionType(
				createLiteralType("stringValue"),
				createNumLiteralType("42"),
				createBoolLiteralType(true),
			);
			const typeAlias = createMockTypeAlias("MixedLiterals", unionType);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("MixedLiterals");
			expect(resultEnum.isConst).toBe(true);
			expect(resultEnum.members.length).toBe(3);

			const memberNames = resultEnum.members
				.map((m) => m.name.value)
				.toArray()
				.sort();
			expect(memberNames).toEqual(["42", "stringValue", "true"]);
		});
	});

	describe("Type Reference Resolution", () => {
		it("should resolve type references in union", () => {
			const literalAlias = createMockTypeAlias(
				"LiteralAlias",
				createUnionType(createLiteralType("ref1"), createLiteralType("ref2")),
			);

			const unionType = createUnionType(
				createLiteralType("direct"),
				createTypeRef("LiteralAlias"),
			);
			const typeAlias = createMockTypeAlias("MixedUnion", unionType);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([literalAlias, typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("MixedUnion");
			expect(resultEnum.isConst).toBe(true);
			expect(resultEnum.members.length).toBe(3);

			const memberNames = resultEnum.members
				.map((m) => m.name.value)
				.toArray()
				.sort();
			expect(memberNames).toEqual(["direct", "ref1", "ref2"]);
		});

		it("should preserve type alias when reference cannot be resolved", () => {
			const unionType = createUnionType(
				createLiteralType("direct"),
				createTypeRef("UnknownAlias"),
			);
			const typeAlias = createMockTypeAlias("UnresolvableUnion", unionType);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Should preserve as type alias since reference cannot be resolved
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("UnresolvableUnion");
		});

		it("should preserve type alias when reference is not literal union", () => {
			const nonLiteralAlias = createMockTypeAlias(
				"NonLiteralAlias",
				createTypeRef("string"),
			);

			const unionType = createUnionType(
				createLiteralType("direct"),
				createTypeRef("NonLiteralAlias"),
			);
			const typeAlias = createMockTypeAlias("MixedUnion", unionType);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([nonLiteralAlias, typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Should preserve as type alias since reference is not a literal union
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("MixedUnion");
		});
	});

	describe("Uniqueness Check", () => {
		it("should preserve type alias when not unique in container", () => {
			const unionType = createUnionType(
				createLiteralType("value1"),
				createLiteralType("value2"),
			);
			const typeAlias1 = createMockTypeAlias("DuplicateName", unionType);
			const typeAlias2 = createMockTypeAlias(
				"DuplicateName",
				createTypeRef("string"),
			);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias1, typeAlias2]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias1);

			// Should preserve as type alias since name is not unique
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("DuplicateName");
		});

		it("should convert type alias when unique in container", () => {
			const unionType = createUnionType(
				createLiteralType("value1"),
				createLiteralType("value2"),
			);
			const typeAlias = createMockTypeAlias("UniqueName", unionType);
			const otherDecl = TsDeclVarConstructor.create(
				NoComments.instance,
				false,
				false,
				createSimpleIdent("otherVar"),
				some(createTypeRef("string")),
				none,
				JsLocation.zero(),
				CodePath.hasPath(
					createSimpleIdent("test-lib"),
					createQIdent("otherVar"),
				),
			);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias, otherDecl]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("UniqueName");
			expect(resultEnum.isConst).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty union", () => {
			const emptyUnion = createUnionType();
			const typeAlias = createMockTypeAlias("EmptyUnion", emptyUnion);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Empty union gets converted to enum with no members
			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("EmptyUnion");
			expect(resultEnum.members.length).toBe(0);
		});

		it("should handle union with non-literal types", () => {
			const unionType = createUnionType(
				createLiteralType("literal"),
				createTypeRef("string"),
				createTypeRef("number"),
			);
			const typeAlias = createMockTypeAlias("MixedUnion", unionType);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Should preserve as type alias since union contains non-literal types
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("MixedUnion");
		});

		it("should sort enum members by string representation", () => {
			const unionType = createUnionType(
				createLiteralType("zebra"),
				createLiteralType("apple"),
				createLiteralType("banana"),
			);
			const typeAlias = createMockTypeAlias("SortedEnum", unionType);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.members.length).toBe(3);

			const memberNames = resultEnum.members.map((m) => m.name.value).toArray();
			// The actual sorting is by the literal's asString method
			expect(memberNames.sort()).toEqual(["apple", "banana", "zebra"]);
		});

		it("should preserve comments and metadata", () => {
			const comment = new Raw("Test comment");
			const comments = new Comments([comment]);
			const unionType = createUnionType(
				createLiteralType("value1"),
				createLiteralType("value2"),
			);

			const typeAlias = TsDeclTypeAliasConstructor.create(
				comments,
				true,
				createSimpleIdent("CommentedAlias"),
				IArray.Empty,
				unionType,
				CodePath.hasPath(
					createSimpleIdent("test-lib"),
					createQIdent("CommentedAlias"),
				),
			);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.comments).toBe(comments);
			expect(resultEnum.declared).toBe(true);
			expect(resultEnum.name.value).toBe("CommentedAlias");
			expect(resultEnum.isConst).toBe(true);
		});
	});

	describe("Complex Scenarios", () => {
		it("should handle deeply nested type references", () => {
			const level3Alias = createMockTypeAlias(
				"Level3",
				createUnionType(createLiteralType("deep1"), createLiteralType("deep2")),
			);

			const level2Alias = createMockTypeAlias(
				"Level2",
				createUnionType(createLiteralType("mid"), createTypeRef("Level3")),
			);

			const level1Alias = createMockTypeAlias(
				"Level1",
				createUnionType(createLiteralType("top"), createTypeRef("Level2")),
			);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([level3Alias, level2Alias, level1Alias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(level1Alias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("Level1");
			expect(resultEnum.isConst).toBe(true);
			expect(resultEnum.members.length).toBe(4);

			const memberNames = resultEnum.members
				.map((m) => m.name.value)
				.toArray()
				.sort();
			expect(memberNames).toEqual(["deep1", "deep2", "mid", "top"]);
		});

		it("should handle large union with many literals", () => {
			const literals = Array.from({ length: 50 }, (_, i) =>
				createLiteralType(`value${i + 1}`),
			);
			const unionType = createUnionType(...literals);
			const typeAlias = createMockTypeAlias("LargeUnion", unionType);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("LargeUnion");
			expect(resultEnum.isConst).toBe(true);
			expect(resultEnum.members.length).toBe(50);
		});

		it("should handle mixed type references and literals", () => {
			const baseAlias = createMockTypeAlias(
				"BaseValues",
				createUnionType(createLiteralType("base1"), createLiteralType("base2")),
			);

			const extendedAlias = createMockTypeAlias(
				"ExtendedValues",
				createUnionType(
					createTypeRef("BaseValues"),
					createLiteralType("extended1"),
					createLiteralType("extended2"),
				),
			);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([baseAlias, extendedAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(extendedAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("ExtendedValues");
			expect(resultEnum.isConst).toBe(true);
			expect(resultEnum.members.length).toBe(4);

			const memberNames = resultEnum.members
				.map((m) => m.name.value)
				.toArray()
				.sort();
			expect(memberNames).toEqual(["base1", "base2", "extended1", "extended2"]);
		});
	});

	describe("Error Handling", () => {
		it("should handle malformed union types gracefully", () => {
			const malformedUnion = TsTypeUnion.create(IArray.Empty); // Empty union
			const typeAlias = createMockTypeAlias("MalformedUnion", malformedUnion);
			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Empty union gets converted to enum with no members
			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("MalformedUnion");
			expect(resultEnum.members.length).toBe(0);
		});

		it("should handle type references with type parameters", () => {
			const stringTypeRef = createTypeRef("string") as TsType;
			const parameterizedRef = createTypeRef(
				"Generic",
				IArray.fromArray([stringTypeRef]),
			);
			const unionType = createUnionType(
				createLiteralType("literal"),
				parameterizedRef,
			);
			const typeAlias = createMockTypeAlias("ParameterizedUnion", unionType);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Should preserve as type alias since parameterized refs are not handled
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("ParameterizedUnion");
		});
	});

	describe("Real-World Patterns", () => {
		it("should handle HTTP status codes pattern", () => {
			const statusCodes = createUnionType(
				createNumLiteralType("200"),
				createNumLiteralType("404"),
				createNumLiteralType("500"),
			);
			const typeAlias = createMockTypeAlias("HttpStatusCode", statusCodes);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("HttpStatusCode");
			expect(resultEnum.isConst).toBe(true);
			expect(resultEnum.members.length).toBe(3);

			const memberNames = resultEnum.members
				.map((m) => m.name.value)
				.toArray()
				.sort();
			expect(memberNames).toEqual(["200", "404", "500"]);
		});

		it("should handle theme colors pattern", () => {
			const colors = createUnionType(
				createLiteralType("primary"),
				createLiteralType("secondary"),
				createLiteralType("success"),
				createLiteralType("warning"),
				createLiteralType("danger"),
			);
			const typeAlias = createMockTypeAlias("ThemeColor", colors);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("ThemeColor");
			expect(resultEnum.isConst).toBe(true);
			expect(resultEnum.members.length).toBe(5);
		});

		it("should handle event types pattern", () => {
			const baseEvents = createMockTypeAlias(
				"BaseEvents",
				createUnionType(createLiteralType("click"), createLiteralType("hover")),
			);

			const allEvents = createMockTypeAlias(
				"AllEvents",
				createUnionType(
					createTypeRef("BaseEvents"),
					createLiteralType("focus"),
					createLiteralType("blur"),
				),
			);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([baseEvents, allEvents]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(allEvents);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("AllEvents");
			expect(resultEnum.isConst).toBe(true);
			expect(resultEnum.members.length).toBe(4);

			const memberNames = resultEnum.members
				.map((m) => m.name.value)
				.toArray()
				.sort();
			expect(memberNames).toEqual(["blur", "click", "focus", "hover"]);
		});

		it("should handle API endpoint pattern", () => {
			const endpoints = createUnionType(
				createLiteralType("/api/users"),
				createLiteralType("/api/posts"),
				createLiteralType("/api/comments"),
			);
			const typeAlias = createMockTypeAlias("ApiEndpoint", endpoints);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.name.value).toBe("ApiEndpoint");
			expect(resultEnum.isConst).toBe(true);
			expect(resultEnum.members.length).toBe(3);

			// Check that enum members have proper expressions
			expect(
				resultEnum.members.toArray().every((m) => m.expr._tag === "Some"),
			).toBe(true);
			expect(
				resultEnum.members
					.toArray()
					.every(
						(m) =>
							m.expr._tag === "Some" &&
							(m.expr.value as any)._tag === "TsExprLiteral",
					),
			).toBe(true);
		});
	});

	describe("Integration", () => {
		it("should work with other transforms", () => {
			const unionType = createUnionType(
				createLiteralType("value1"),
				createLiteralType("value2"),
			);
			const typeAlias = createMockTypeAlias("IntegrationTest", unionType);

			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;

			// Verify enum properties for integration with other transforms
			expect(resultEnum.isConst).toBe(true); // Important for InlineConstEnum
			expect(resultEnum.isValue).toBe(false); // Not a value enum
			expect(resultEnum.exportedFrom._tag).toBe("None"); // Not exported
			expect(resultEnum.jsLocation._tag).toBe("Zero");
			expect(resultEnum.codePath._tag).toBe("HasPath");
		});

		it("should preserve code path correctly", () => {
			const unionType = createUnionType(
				createLiteralType("test1"),
				createLiteralType("test2"),
			);
			const originalCodePath = CodePath.hasPath(
				createSimpleIdent("my-lib"),
				createQIdent("MyModule", "MyEnum"),
			);
			const typeAlias = TsDeclTypeAliasConstructor.create(
				NoComments.instance,
				false,
				createSimpleIdent("MyEnum"),
				IArray.Empty,
				unionType,
				originalCodePath,
			);

			const namespace = createMockNamespace(
				"MyModule",
				IArray.fromArray([typeAlias]),
			);
			const scope = createMockScopeWithContainer(namespace);
			const transform = new TypeAliasToConstEnum();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclEnum");
			const resultEnum = result as TsDeclEnum;
			expect(resultEnum.codePath).toBe(originalCodePath);
		});
	});
});
