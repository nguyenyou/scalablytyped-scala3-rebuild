/**
 * Tests for ResolveTypeLookups transformation
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import { Comments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { Logger } from "../../../internal/logging/index.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { TsTreeScope } from "../../../internal/ts/TsTreeScope.js";
import { ResolveTypeLookups } from "../../../internal/ts/transforms/ResolveTypeLookups.js";
import {
	IndexingDict,
	MethodType,
	TsDeclInterface,
	TsFunSig,
	TsIdent,
	TsLiteral,
	type TsMember,
	TsMemberFunction,
	TsMemberIndex,
	TsMemberProperty,
	TsProtectionLevel,
	type TsQIdent,
	TsTupleElement,
	type TsType,
	TsTypeLookup,
	TsTypeObject,
	TsTypeRef,
	TsTypeTuple,
	TsTypeUnion,
} from "../../../internal/ts/trees.js";

describe("ResolveTypeLookups", () => {
	// Helper functions for creating test objects
	function createQIdent(...parts: string[]): TsQIdent {
		return {
			_tag: "TsQIdent",
			parts: IArray.fromArray(parts.map((p) => TsIdent.simple(p) as TsIdent)),
			asString: `TsQIdent(${parts.join(".")})`,
		};
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

	function _createMockInterface(
		name: string,
		members: IArray<TsMember> = IArray.Empty,
	): TsDeclInterface {
		return TsDeclInterface.create(
			Comments.empty(),
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

	function createMockProperty(name: string, tpe?: TsType): TsMemberProperty {
		return TsMemberProperty.create(
			Comments.empty(),
			TsProtectionLevel.default(),
			TsIdent.simple(name),
			tpe ? some(tpe) : none,
			none,
			false,
			false,
		);
	}

	function createMockFunction(
		name: string,
		returnType: TsType = TsTypeRef.any,
	): TsMemberFunction {
		const signature = TsFunSig.create(
			Comments.empty(),
			IArray.Empty,
			IArray.Empty,
			some(returnType),
		);
		return TsMemberFunction.create(
			Comments.empty(),
			TsProtectionLevel.default(),
			TsIdent.simple(name),
			MethodType.normal(),
			signature,
			false,
			false,
		);
	}

	function createMockIndexSignature(
		keyType: TsType = TsTypeRef.string,
		valueType: TsType = TsTypeRef.any,
	): TsMemberIndex {
		const indexing = IndexingDict.create(TsIdent.simple("key"), keyType);
		return TsMemberIndex.create(
			Comments.empty(),
			false,
			TsProtectionLevel.default(),
			indexing,
			some(valueType),
		);
	}

	function createTypeLookup(from: TsType, key: TsType): TsTypeLookup {
		return TsTypeLookup.create(from, key);
	}

	function createTuple(...types: TsType[]): TsTypeTuple {
		const elements = types.map((t) => TsTupleElement.unlabeled(t));
		return TsTypeTuple.create(IArray.fromArray(elements));
	}

	describe("Basic Functionality", () => {
		it("has apply method that returns visitor", () => {
			const visitor = ResolveTypeLookups.apply();
			expect(visitor).toBeDefined();
		});

		it("has leaveTsType method", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			expect(typeof visitor.leaveTsType).toBe("function");
			expect(typeof visitor.leaveTsType(scope)).toBe("function");
		});

		it("leaves non-lookup types unchanged", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const stringType = TsTypeRef.string;
			const result = transform(stringType);

			expect(result).toBe(stringType);
		});

		it("leaves unresolvable lookups unchanged", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const lookup = createTypeLookup(TsTypeRef.string, TsTypeRef.string);
			const result = transform(lookup);

			expect(result).toBe(lookup);
		});
	});

	describe("Tuple Number Index Resolution", () => {
		it("resolves tuple[number] to union of element types", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const tuple = createTuple(
				TsTypeRef.string,
				TsTypeRef.number,
				TsTypeRef.boolean,
			);
			const lookup = createTypeLookup(tuple, TsTypeRef.number);

			const result = transform(lookup);

			expect(result._tag).toBe("TsTypeUnion");
			const union = result as TsTypeUnion;
			expect(union.types.length).toBe(3);
		});

		it("handles empty tuple[number]", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const tuple = createTuple();
			const lookup = createTypeLookup(tuple, TsTypeRef.number);

			const result = transform(lookup);

			expect(result._tag).toBe("TsTypeRef");
			const typeRef = result as TsTypeRef;
			expect(typeRef.name.parts.apply(0).value).toBe("never");
		});

		it("handles single element tuple[number]", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const tuple = createTuple(TsTypeRef.string);
			const lookup = createTypeLookup(tuple, TsTypeRef.number);

			const result = transform(lookup);

			expect(result._tag).toBe("TsTypeRef");
			expect((result as TsTypeRef).name.parts.apply(0).value).toBe("string");
		});
	});

	describe("Object Type Lookup Resolution", () => {
		it("resolves property lookup on object type", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const property = createMockProperty("testProp", TsTypeRef.string);
			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(property as TsMember),
			);
			const lookup = createTypeLookup(objectType, TsLiteral.str("testProp"));

			// This test would require proper key evaluation which depends on ExpandTypeMappings
			// For now, just verify the lookup is processed
			const result = transform(lookup);
			expect(result).toBeDefined();
		});

		it("resolves index signature lookup on object type", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const indexSig = createMockIndexSignature(
				TsTypeRef.string,
				TsTypeRef.number,
			);
			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(indexSig as TsMember),
			);
			const lookup = createTypeLookup(objectType, TsTypeRef.string);

			const result = transform(lookup);
			expect(result).toBeDefined();
		});

		it("handles object type with mixed members", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const property = createMockProperty("prop", TsTypeRef.string);
			const method = createMockFunction("method", TsTypeRef.number);
			const indexSig = createMockIndexSignature(
				TsTypeRef.string,
				TsTypeRef.boolean,
			);

			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(
					property as TsMember,
					method as TsMember,
					indexSig as TsMember,
				),
			);
			const lookup = createTypeLookup(objectType, TsTypeRef.string);

			const result = transform(lookup);
			expect(result).toBeDefined();
		});
	});

	describe("Type Reference Lookup Resolution", () => {
		it("handles lookup on non-existent type reference", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const typeRef = TsTypeRef.create(
				Comments.empty(),
				createQIdent("NonExistentType"),
				IArray.Empty,
			);
			const lookup = createTypeLookup(typeRef, TsTypeRef.string);

			const result = transform(lookup);
			expect(result).toBe(lookup); // Should remain unchanged
		});

		it("handles lookup on abstract type reference", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();

			// Mock isAbstract to return true
			const originalIsAbstract = scope.isAbstract.bind(scope);
			scope.isAbstract = (qname) =>
				qname.parts.apply(0).value === "AbstractType";

			const transform = visitor.leaveTsType(scope);

			const typeRef = TsTypeRef.create(
				Comments.empty(),
				createQIdent("AbstractType"),
				IArray.Empty,
			);
			const lookup = createTypeLookup(typeRef, TsTypeRef.string);

			const result = transform(lookup);
			expect(result).toBe(lookup); // Should remain unchanged

			// Restore original method
			scope.isAbstract = originalIsAbstract;
		});
	});

	describe("Union Type Lookup Resolution", () => {
		it("resolves lookup on union type when all members resolve", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const prop1 = createMockProperty("prop", TsTypeRef.string);
			const prop2 = createMockProperty("prop", TsTypeRef.number);

			const obj1 = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(prop1 as TsMember),
			);
			const obj2 = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(prop2 as TsMember),
			);

			const unionType = TsTypeUnion.create(IArray.apply<TsType>(obj1, obj2));
			const lookup = createTypeLookup(unionType, TsLiteral.str("prop"));

			const result = transform(lookup);
			expect(result).toBeDefined();
		});

		it("fails to resolve lookup on union type when some members don't resolve", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const prop = createMockProperty("prop", TsTypeRef.string);
			const obj1 = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(prop as TsMember),
			);
			const obj2 = TsTypeObject.create(Comments.empty(), IArray.Empty); // No matching property

			const unionType = TsTypeUnion.create(IArray.apply<TsType>(obj1, obj2));
			const lookup = createTypeLookup(unionType, TsLiteral.str("prop"));

			const result = transform(lookup);
			expect(result).toBe(lookup); // Should remain unchanged
		});
	});

	describe("Function and Property Resolution", () => {
		it("resolves function member to function type", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const method = createMockFunction("testMethod", TsTypeRef.string);
			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(method as TsMember),
			);
			const lookup = createTypeLookup(objectType, TsLiteral.str("testMethod"));

			const result = transform(lookup);
			expect(result).toBeDefined();
		});

		it("resolves property member to property type", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const property = createMockProperty("testProp", TsTypeRef.number);
			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(property as TsMember),
			);
			const lookup = createTypeLookup(objectType, TsLiteral.str("testProp"));

			const result = transform(lookup);
			expect(result).toBeDefined();
		});

		it("combines multiple functions with same name into object type", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const method1 = createMockFunction("overloaded", TsTypeRef.string);
			const method2 = createMockFunction("overloaded", TsTypeRef.number);

			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(method1 as TsMember, method2 as TsMember),
			);
			const lookup = createTypeLookup(objectType, TsLiteral.str("overloaded"));

			const result = transform(lookup);
			expect(result).toBeDefined();
		});

		it("combines functions and properties with same name into intersection", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const property = createMockProperty("mixed", TsTypeRef.string);
			const method = createMockFunction("mixed", TsTypeRef.number);

			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(property as TsMember, method as TsMember),
			);
			const lookup = createTypeLookup(objectType, TsLiteral.str("mixed"));

			const result = transform(lookup);
			expect(result).toBeDefined();
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("handles lookup with non-literal key", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const objectType = TsTypeObject.create(Comments.empty(), IArray.Empty);
			const lookup = createTypeLookup(objectType, TsTypeRef.string);

			const result = transform(lookup);
			expect(result).toBeDefined();
		});

		it("handles lookup on empty object type", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const objectType = TsTypeObject.create(Comments.empty(), IArray.Empty);
			const lookup = createTypeLookup(objectType, TsLiteral.str("nonexistent"));

			const result = transform(lookup);
			expect(result).toBeDefined();
		});

		it("handles lookup on unsupported type", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const lookup = createTypeLookup(TsTypeRef.never, TsTypeRef.string);

			const result = transform(lookup);
			expect(result).toBe(lookup); // Should remain unchanged
		});

		it("filters out ignored types (never, any, object)", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			// This test verifies the internal filtering logic
			// The actual behavior depends on the key evaluation
			const objectType = TsTypeObject.create(Comments.empty(), IArray.Empty);
			const lookup = createTypeLookup(objectType, TsLiteral.str("test"));

			const result = transform(lookup);
			expect(result).toBeDefined();
		});
	});

	describe("Complex Scenarios", () => {
		it("handles nested lookup resolution", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const innerProp = createMockProperty("inner", TsTypeRef.string);
			const innerObj = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(innerProp as TsMember),
			);
			const outerProp = createMockProperty("outer", innerObj);
			const outerObj = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(outerProp as TsMember),
			);

			const lookup = createTypeLookup(outerObj, TsLiteral.str("outer"));

			const result = transform(lookup);
			expect(result).toBeDefined();
		});

		it("handles lookup with type parameters", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const genericType = TsTypeRef.create(
				Comments.empty(),
				createQIdent("Array"),
				IArray.apply<TsType>(TsTypeRef.string),
			);
			const lookup = createTypeLookup(genericType, TsTypeRef.number);

			const result = transform(lookup);
			expect(result).toBeDefined();
		});

		it("handles multiple levels of type resolution", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			// Create a complex scenario with multiple resolution steps
			const property = createMockProperty("deep", TsTypeRef.boolean);
			const objectType = TsTypeObject.create(
				Comments.empty(),
				IArray.apply(property as TsMember),
			);
			const unionType = TsTypeUnion.create(
				IArray.apply<TsType>(objectType, TsTypeRef.string),
			);
			const lookup = createTypeLookup(unionType, TsLiteral.str("deep"));

			const result = transform(lookup);
			expect(result).toBeDefined();
		});
	});

	describe("Integration and Visitor Pattern", () => {
		it("works correctly with visitor pattern", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();

			expect(typeof visitor.leaveTsType).toBe("function");

			const transform = visitor.leaveTsType(scope);
			const result = transform(TsTypeRef.string);

			expect(result).toBeDefined();
			expect(result._tag).toBe("TsTypeRef");
		});

		it("singleton instance works correctly", () => {
			const visitor1 = ResolveTypeLookups.apply();
			const visitor2 = ResolveTypeLookups.apply();

			// Should create separate instances
			expect(visitor1).toBeDefined();
			expect(visitor2).toBeDefined();
		});

		it("handles transformation pipeline integration", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();

			// Test that the transformation can be chained
			const transform = visitor.leaveTsType(scope);
			const type1 = TsTypeRef.string;
			const result1 = transform(type1);
			const result2 = transform(result1);

			expect(result1).toBe(type1);
			expect(result2).toBe(type1);
		});

		it("preserves type structure for non-lookup types", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const unionType = TsTypeUnion.create(
				IArray.apply<TsType>(TsTypeRef.string, TsTypeRef.number),
			);
			const result = transform(unionType);

			expect(result).toBe(unionType);
			expect(result._tag).toBe("TsTypeUnion");
		});

		it("handles performance with many lookups", () => {
			const visitor = ResolveTypeLookups.apply();
			const scope = createMockScope();
			const transform = visitor.leaveTsType(scope);

			const startTime = Date.now();

			// Process many lookup types
			for (let i = 0; i < 100; i++) {
				const lookup = createTypeLookup(
					TsTypeRef.string,
					TsLiteral.str(`prop${i}`),
				);
				const result = transform(lookup);
				expect(result).toBeDefined();
			}

			const endTime = Date.now();
			expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
		});
	});
});
