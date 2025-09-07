/**
 * Tests for ResolveTypeQueries.ts - TypeScript port of org.scalablytyped.converter.internal.ts.transforms.ResolveTypeQueries
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import type { Comment } from "../../../internal/Comment.js";
import { type Comments, NoComments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { JsLocation } from "../../../internal/ts/JsLocation.js";
import { TsProtectionLevel } from "../../../internal/ts/TsProtectionLevel.js";
import type { TsTreeScope } from "../../../internal/ts/TsTreeScope.js";
import { ResolveTypeQueries } from "../../../internal/ts/transforms/ResolveTypeQueries.js";
import {
	type TsDeclClass,
	TsDeclFunction,
	TsDeclVar,
	TsFunSig,
	TsIdent,
	type TsIdentSimple,
	TsMemberProperty,
	TsQIdent,
	type TsType,
	type TsTypeQuery,
	TsTypeRef,
} from "../../../internal/ts/trees.js";

describe("ResolveTypeQueries", () => {
	// Helper functions for creating test objects
	function createSimpleIdent(value: string): TsIdentSimple {
		return TsIdent.simple(value);
	}

	function createQIdent(name: string): TsQIdent {
		return TsQIdent.of(createSimpleIdent(name));
	}

	function createCodePath(name: string): CodePath {
		return CodePath.hasPath(
			TsIdent.librarySimple("test"),
			TsQIdent.of(createSimpleIdent(name)),
		);
	}

	function createTypeQuery(name: string): TsTypeQuery {
		return {
			_tag: "TsTypeQuery",
			expr: createQIdent(name),
			asString: `typeof ${name}`,
		};
	}

	function createMemberProperty(
		name: string,
		tpe?: TsType,
		hasExpr: boolean = false,
	): TsMemberProperty {
		return TsMemberProperty.create(
			NoComments.instance,
			TsProtectionLevel.default(),
			createSimpleIdent(name),
			tpe ? some(tpe) : none,
			hasExpr ? some({ _tag: "TsExprLiteral" } as any) : none,
			false,
			false,
		);
	}

	function createDeclVar(name: string, tpe?: TsType): TsDeclVar {
		return TsDeclVar.create(
			NoComments.instance,
			false,
			false,
			createSimpleIdent(name),
			tpe ? some(tpe) : none,
			none,
			JsLocation.zero(),
			createCodePath(name),
		);
	}

	function createDeclFunction(name: string): TsDeclFunction {
		const signature = TsFunSig.create(
			NoComments.instance,
			IArray.Empty,
			IArray.Empty,
			some(TsTypeRef.string),
		);
		return TsDeclFunction.create(
			NoComments.instance,
			false,
			createSimpleIdent(name),
			signature,
			JsLocation.zero(),
			createCodePath(name),
		);
	}

	function createDeclClass(name: string): TsDeclClass {
		return {
			_tag: "TsDeclClass",
			comments: NoComments.instance,
			membersByName: new Map(),
			unnamed: IArray.Empty,
			declared: false,
			isAbstract: false,
			name: createSimpleIdent(name),
			tparams: IArray.Empty,
			parent: none,
			members: IArray.Empty,
			jsLocation: JsLocation.zero(),
			codePath: createCodePath(name),
			withCodePath: (_newCodePath: CodePath) => createDeclClass(name),
			withJsLocation: (_newLocation: JsLocation) => createDeclClass(name),
			withComments: (_cs: Comments) => createDeclClass(name),
			addComment: (_c: Comment) => createDeclClass(name),
			asString: `TsDeclClass(${name})`,
		} as TsDeclClass;
	}

	function createMockScope(): TsTreeScope {
		const mockLogger = {
			warn: (msg: string) => console.warn(msg),
			info: (msg: string) => console.info(msg),
			error: (msg: string) => console.error(msg),
		};

		return {
			logger: mockLogger,
			stack: [],
			lookupInternal: () => IArray.Empty,
		} as any;
	}

	describe("Basic Functionality", () => {
		it("should create ResolveTypeQueries transformation", () => {
			const transform = ResolveTypeQueries.apply();
			expect(transform).toBeDefined();
			expect(typeof transform.newClassMembersLeaving).toBe("function");
			expect(typeof transform.newMembers).toBe("function");
		});

		it("should have correct method signatures", () => {
			const transform = ResolveTypeQueries.apply();
			expect(typeof transform.leaveTsType).toBe("function");
			expect(typeof transform.leaveTsDeclClass).toBe("function");
			expect(typeof transform.leaveTsDeclInterface).toBe("function");
		});
	});

	describe("Type Query Resolution in Properties", () => {
		it("should resolve type query in property without expression", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			// Mock lookup to return a variable declaration
			const mockVar = createDeclVar("myVar", TsTypeRef.string);
			scope.lookupInternal = () => IArray.apply([mockVar, scope] as any);

			const typeQuery = createTypeQuery("myVar");
			const property = createMemberProperty("prop", typeQuery, false);
			const mockTree = {
				members: IArray.apply(property),
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(1);
			const resultProp = result.apply(0) as TsMemberProperty;
			expect(resultProp._tag).toBe("TsMemberProperty");
			expect(resultProp.name.value).toBe("prop");
		});

		it("should skip properties with expressions", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			const typeQuery = createTypeQuery("myVar");
			const property = createMemberProperty("prop", typeQuery, true);
			const mockTree = {
				members: IArray.apply(property),
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(property); // Should return original
		});

		it("should skip primitive type queries", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			const primitiveQuery = {
				_tag: "TsTypeQuery",
				expr: TsQIdent.ofStrings("string"),
				asString: "typeof string",
			} as TsTypeQuery;
			const property = createMemberProperty("prop", primitiveQuery, false);
			const mockTree = {
				members: IArray.apply(property),
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(property); // Should return original
		});

		it("should handle unresolved type queries with warning", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			// Mock lookup to return empty (unresolved)
			scope.lookupInternal = () => IArray.Empty;

			const typeQuery = createTypeQuery("unknownVar");
			const property = createMemberProperty("prop", typeQuery, false);
			const mockTree = {
				members: IArray.apply(property),
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(1);
			const resultProp = result.apply(0) as TsMemberProperty;
			expect(resultProp._tag).toBe("TsMemberProperty");
			expect(resultProp.name.value).toBe("prop");
		});
	});

	describe("Type Query Resolution in Variables", () => {
		it("should resolve type query in variable declaration", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			// Mock lookup to return a function declaration
			const mockFunc = createDeclFunction("myFunc");
			scope.lookupInternal = () => IArray.apply([mockFunc, scope] as any);

			const typeQuery = createTypeQuery("myFunc");
			const variable = createDeclVar("myVar", typeQuery);
			const mockTree = {
				members: IArray.apply(variable),
				codePath: createCodePath("container"),
			} as any;

			const result = transform.newMembers(scope, mockTree);

			expect(result.length).toBeGreaterThanOrEqual(1);
		});

		it("should skip variables with expressions", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			const typeQuery = createTypeQuery("myVar");
			const variable = TsDeclVar.create(
				NoComments.instance,
				false,
				false,
				createSimpleIdent("myVar"),
				some(typeQuery),
				some({ _tag: "TsExprLiteral" } as any), // Has expression
				JsLocation.zero(),
				createCodePath("myVar"),
			);
			const mockTree = {
				members: IArray.apply(variable),
				codePath: createCodePath("container"),
			} as any;

			const result = transform.newMembers(scope, mockTree);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(variable); // Should return original
		});

		it("should handle unresolved variable type queries", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			// Mock lookup to return empty (unresolved)
			scope.lookupInternal = () => IArray.Empty;

			const typeQuery = createTypeQuery("unknownVar");
			const variable = createDeclVar("myVar", typeQuery);
			const mockTree = {
				members: IArray.apply(variable),
				codePath: createCodePath("container"),
			} as any;

			const result = transform.newMembers(scope, mockTree);

			expect(result.length).toBe(1);
			const resultVar = result.apply(0) as TsDeclVar;
			expect(resultVar._tag).toBe("TsDeclVar");
			expect(resultVar.name.value).toBe("myVar");
		});
	});

	describe("Type Query Resolution in Types", () => {
		it("should resolve type queries in type positions", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			// Mock lookup to return a class declaration
			const mockClass = createDeclClass("MyClass");
			scope.lookupInternal = () => IArray.apply([mockClass, scope] as any);

			const typeQuery = createTypeQuery("MyClass");
			const typeTransform = transform.leaveTsType(scope);
			const result = typeTransform(typeQuery);

			expect(result).toBeDefined();
			// The result should be a resolved type, not the original query
		});

		it("should handle primitive type queries in type positions", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			const primitiveQuery = {
				_tag: "TsTypeQuery",
				expr: TsQIdent.ofStrings("string"),
				asString: "typeof string",
			} as TsTypeQuery;

			const typeTransform = transform.leaveTsType(scope);
			const result = typeTransform(primitiveQuery);

			expect(result._tag).toBe("TsTypeRef");
		});

		it("should handle unresolved type queries in type positions", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			// Mock lookup to return empty (unresolved)
			scope.lookupInternal = () => IArray.Empty;

			const typeQuery = createTypeQuery("UnknownType");
			const typeTransform = transform.leaveTsType(scope);
			const result = typeTransform(typeQuery);

			expect(result._tag).toBe("TsTypeRef");
			// Should be resolved to 'any' with warning comment
		});
	});

	describe("Function and Property Resolution", () => {
		it("should convert function declarations to member functions", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			// Mock lookup to return a function declaration
			const mockFunc = createDeclFunction("myFunc");
			scope.lookupInternal = () => IArray.apply([mockFunc, scope] as any);

			const typeQuery = createTypeQuery("myFunc");
			const property = createMemberProperty("prop", typeQuery, false);
			const mockTree = {
				members: IArray.apply(property),
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(1);
			const resultMember = result.apply(0);
			expect(resultMember._tag).toBe("TsMemberFunction");
		});

		it("should preserve variable types in properties", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			// Mock lookup to return a variable declaration
			const mockVar = createDeclVar("myVar", TsTypeRef.number);
			scope.lookupInternal = () => IArray.apply([mockVar, scope] as any);

			const typeQuery = createTypeQuery("myVar");
			const property = createMemberProperty("prop", typeQuery, false);
			const mockTree = {
				members: IArray.apply(property),
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(1);
			const resultProp = result.apply(0) as TsMemberProperty;
			expect(resultProp._tag).toBe("TsMemberProperty");
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle empty member lists", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			const mockTree = {
				members: IArray.Empty,
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(0);
		});

		it("should handle members without type queries", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			const property = createMemberProperty("prop", TsTypeRef.string, false);
			const mockTree = {
				members: IArray.apply(property),
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(property); // Should return original
		});

		it("should handle circular type query references", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			const typeQuery = createTypeQuery("myVar");
			// Create a variable that references itself
			const circularVar = createDeclVar("myVar", typeQuery);
			scope.lookupInternal = () => IArray.apply([circularVar, scope] as any);

			const property = createMemberProperty("prop", typeQuery, false);
			const mockTree = {
				members: IArray.apply(property),
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(1);
			// Should handle gracefully without infinite recursion
		});

		it("should handle global scope fallback", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			// Mock lookup to return empty initially, then something on global fallback
			let callCount = 0;
			scope.lookupInternal = () => {
				callCount++;
				if (callCount === 1) {
					return IArray.Empty; // First call fails
				} else {
					// Second call (global fallback) succeeds
					const mockVar = createDeclVar("globalVar", TsTypeRef.boolean);
					return IArray.apply([mockVar, scope] as any);
				}
			};

			const typeQuery = createTypeQuery("globalVar");
			const property = createMemberProperty("prop", typeQuery, false);
			const mockTree = {
				members: IArray.apply(property),
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(1);
			expect(callCount).toBe(2); // Should have tried global fallback
		});
	});

	describe("Integration and Visitor Pattern", () => {
		it("should implement proper visitor pattern for class members", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			const leaveDeclClass = transform.leaveTsDeclClass(scope);
			expect(typeof leaveDeclClass).toBe("function");

			const mockClass = createDeclClass("TestClass");
			const result = leaveDeclClass(mockClass);
			expect(result._tag).toBe("TsDeclClass");
		});

		it("should implement proper visitor pattern for interfaces", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			const leaveDeclInterface = transform.leaveTsDeclInterface(scope);
			expect(typeof leaveDeclInterface).toBe("function");
		});

		it("should implement proper visitor pattern for type objects", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			const leaveTypeObject = transform.leaveTsTypeObject(scope);
			expect(typeof leaveTypeObject).toBe("function");

			const mockTypeObject = {
				_tag: "TsTypeObject",
				comments: NoComments.instance,
				membersByName: new Map(),
				unnamed: IArray.Empty,
				members: IArray.Empty,
				asString: "TsTypeObject()",
			} as any;
			const result = leaveTypeObject(mockTypeObject);
			expect(result._tag).toBe("TsTypeObject");
		});

		it("should handle complex nested scenarios", () => {
			const transform = ResolveTypeQueries.apply();
			const scope = createMockScope();

			// Create a complex scenario with multiple type queries
			const typeQuery1 = createTypeQuery("var1");
			const typeQuery2 = createTypeQuery("var2");
			const prop1 = createMemberProperty("prop1", typeQuery1, false);
			const prop2 = createMemberProperty("prop2", typeQuery2, false);

			const mockVar1 = createDeclVar("var1", TsTypeRef.string);
			const mockVar2 = createDeclVar("var2", TsTypeRef.number);

			scope.lookupInternal = (_picker, parts) => {
				const name = parts.apply(0).value;
				if (name === "var1") {
					return IArray.apply([mockVar1, scope] as any);
				} else if (name === "var2") {
					return IArray.apply([mockVar2, scope] as any);
				}
				return IArray.Empty;
			};

			const mockTree = {
				members: IArray.apply(prop1, prop2),
			} as any;

			const result = transform.newClassMembersLeaving(scope, mockTree);

			expect(result.length).toBe(2);
			expect(result.apply(0)._tag).toBe("TsMemberProperty");
			expect(result.apply(1)._tag).toBe("TsMemberProperty");
		});
	});
});
