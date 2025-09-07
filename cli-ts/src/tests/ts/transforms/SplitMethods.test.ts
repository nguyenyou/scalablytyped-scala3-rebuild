/**
 * Tests for SplitMethods.ts - TypeScript port of org.scalablytyped.converter.internal.ts.transforms.SplitMethods
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import { Comments, NoComments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { JsLocation } from "../../../internal/ts/JsLocation.js";
import { MethodType } from "../../../internal/ts/MethodType.js";
import { SplitMethods } from "../../../internal/ts/transforms/SplitMethods.js";
import { TsProtectionLevel } from "../../../internal/ts/TsProtectionLevel.js";
import { TsTreeScope } from "../../../internal/ts/TsTreeScope.js";
import {
	TsDeclFunction,
	TsFunParam,
	TsFunSig,
	TsIdent,
	TsIdentSimple,
	TsMemberCall,
	TsMemberCtor,
	TsMemberFunction,
	TsQIdent,
	TsTypeRef,
	TsTypeUnion,
	TsTypeLiteral,
	TsTypeRepeated,
	type TsType,
} from "../../../internal/ts/trees.js";

describe("SplitMethods", () => {
	// Helper functions for creating test objects
	function createSimpleIdent(value: string): TsIdentSimple {
		return TsIdent.simple(value);
	}

	function createCodePath(name: string): CodePath {
		return CodePath.hasPath(
			TsIdent.librarySimple("test"),
			TsQIdent.of(createSimpleIdent(name))
		);
	}

	function createFunParam(name: string, tpe?: TsType): TsFunParam {
		return {
			_tag: "TsFunParam",
			comments: NoComments.instance,
			name: createSimpleIdent(name),
			tpe: tpe ? some(tpe) : none,
			withComments: (cs: Comments) => createFunParam(name, tpe),
			addComment: (c) => createFunParam(name, tpe),
			equals: (other) => false,
			asString: `TsFunParam(${name})`,
		};
	}

	function createFunSig(params: TsFunParam[], returnType?: TsType): TsFunSig {
		return TsFunSig.create(
			NoComments.instance,
			IArray.Empty,
			IArray.fromArray(params),
			returnType ? some(returnType) : none
		);
	}

	function createUnionType(types: TsType[]): TsTypeUnion {
		return {
			_tag: "TsTypeUnion",
			types: IArray.fromArray(types),
			asString: `TsTypeUnion(${types.map(t => t.asString).join(" | ")})`,
		};
	}

	function createLiteralType(value: string): TsTypeLiteral {
		return TsTypeLiteral.string(value);
	}

	function createRepeatedType(inner: TsType): TsTypeRepeated {
		return {
			_tag: "TsTypeRepeated",
			underlying: inner,
			asString: `TsTypeRepeated(${inner.asString})`,
		};
	}

	function createMemberFunction(
		name: string,
		signature: TsFunSig,
		methodType: MethodType = MethodType.normal()
	): TsMemberFunction {
		return TsMemberFunction.create(
			NoComments.instance,
			TsProtectionLevel.default(),
			createSimpleIdent(name),
			methodType,
			signature,
			false,
			false
		);
	}

	function createMemberCtor(signature: TsFunSig): TsMemberCtor {
		return {
			_tag: "TsMemberCtor",
			comments: NoComments.instance,
			level: TsProtectionLevel.default(),
			signature,
			withComments: (cs) => createMemberCtor(signature),
			addComment: (c) => createMemberCtor(signature),
			asString: "TsMemberCtor",
		};
	}

	function createMemberCall(signature: TsFunSig): TsMemberCall {
		return {
			_tag: "TsMemberCall",
			comments: NoComments.instance,
			level: TsProtectionLevel.default(),
			signature,
			withComments: (cs) => createMemberCall(signature),
			addComment: (c) => createMemberCall(signature),
			asString: "TsMemberCall",
		};
	}

	function createDeclFunction(name: string, signature: TsFunSig): TsDeclFunction {
		return TsDeclFunction.create(
			NoComments.instance,
			false,
			createSimpleIdent(name),
			signature,
			JsLocation.zero(),
			createCodePath(name)
		);
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
		it("should create SplitMethods transformation", () => {
			const transform = new SplitMethods();
			expect(transform).toBeDefined();
			expect(typeof transform.newClassMembers).toBe("function");
			expect(typeof transform.newMembers).toBe("function");
		});

		it("should have singleton instance", () => {
			expect(SplitMethods.instance).toBeDefined();
			expect(SplitMethods.instance).toBeInstanceOf(SplitMethods);
		});

		it("should have utility methods", () => {
			expect(typeof SplitMethods.isRepeated).toBe("function");
			expect(typeof SplitMethods.collectRightWhile).toBe("function");
		});
	});

	describe("Union Type Detection", () => {
		it("should detect union types in parameters", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const unionParam = createFunParam("param", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const signature = createFunSig([unionParam]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBeGreaterThan(1); // Should split into multiple overloads
		});

		it("should not split methods without union types", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const normalParam = createFunParam("param", TsTypeRef.string);
			const signature = createFunSig([normalParam]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1); // Should not split
			expect(result.apply(0)).toBe(func); // Should return original
		});

		it("should handle empty parameter lists", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const signature = createFunSig([]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(func);
		});
	});

	describe("Method Splitting", () => {
		it("should split constructor with union type parameters", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const unionParam = createFunParam("param", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const signature = createFunSig([unionParam]);
			const ctor = createMemberCtor(signature);

			const mockTree = {
				members: IArray.apply(ctor),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(2); // Should split into string and number overloads
			expect(result.apply(0)._tag).toBe("TsMemberCtor");
			expect(result.apply(1)._tag).toBe("TsMemberCtor");
		});

		it("should split member function with union type parameters", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const unionParam = createFunParam("param", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const signature = createFunSig([unionParam]);
			const func = createMemberFunction("test", signature, MethodType.normal());

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(2);
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
			expect(result.apply(1)._tag).toBe("TsMemberFunction");
		});

		it("should split call signature with union type parameters", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const unionParam = createFunParam("param", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const signature = createFunSig([unionParam]);
			const call = createMemberCall(signature);

			const mockTree = {
				members: IArray.apply(call),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(2);
			expect(result.apply(0)._tag).toBe("TsMemberCall");
			expect(result.apply(1)._tag).toBe("TsMemberCall");
		});

		it("should split function declaration with union type parameters", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const unionParam = createFunParam("param", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const signature = createFunSig([unionParam]);
			const func = createDeclFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
				codePath: createCodePath("container"),
			} as any;

			const result = transform.newMembers(scope, mockTree);

			expect(result.length).toBe(2);
			expect(result.apply(0)._tag).toBe("TsDeclFunction");
			expect(result.apply(1)._tag).toBe("TsDeclFunction");
		});

		it("should not split non-normal method types", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const unionParam = createFunParam("param", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const signature = createFunSig([unionParam]);
			const func = createMemberFunction("test", signature, MethodType.getter());

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1); // Should not split non-normal methods
			expect(result.apply(0)).toBe(func);
		});
	});

	describe("Literal Type Grouping", () => {
		it("should group literal types together", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const literal1 = createLiteralType("'hello'");
			const literal2 = createLiteralType("'world'");
			const unionParam = createFunParam("param", createUnionType([literal1, literal2, TsTypeRef.number]));
			const signature = createFunSig([unionParam]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(2); // Should group literals together + number separately
		});

		it("should handle mixed literal and non-literal types", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const literal = createLiteralType("'test'");
			const unionParam = createFunParam("param", createUnionType([literal, TsTypeRef.string, TsTypeRef.number]));
			const signature = createFunSig([unionParam]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(3); // literal group + string + number
		});

		it("should handle only literal types", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const literal1 = createLiteralType("'a'");
			const literal2 = createLiteralType("'b'");
			const unionParam = createFunParam("param", createUnionType([literal1, literal2]));
			const signature = createFunSig([unionParam]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1); // Should group all literals together
		});
	});

	describe("Repeated Parameters", () => {
		it("should handle repeated parameters correctly", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const normalParam = createFunParam("param1", TsTypeRef.string);
			const repeatedParam = createFunParam("rest", createRepeatedType(TsTypeRef.number));
			const signature = createFunSig([normalParam, repeatedParam]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1); // Should not split - no union types
			expect(result.apply(0)).toBe(func);
		});

		it("should handle union types with repeated parameters", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const unionParam = createFunParam("param", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const repeatedParam = createFunParam("rest", createRepeatedType(TsTypeRef.boolean));
			const signature = createFunSig([unionParam, repeatedParam]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(2); // Should split union param, preserve repeated
		});

		it("should detect repeated types correctly", () => {
			const repeatedType = createRepeatedType(TsTypeRef.string);
			expect(SplitMethods.isRepeated(repeatedType)).toBe(true);
			expect(SplitMethods.isRepeated(TsTypeRef.string)).toBe(false);
		});
	});

	describe("Overload Limits", () => {
		it("should limit number of overloads to prevent explosion", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			// Create a union with many types (more than MAX_NUM)
			const manyTypes: TsType[] = [];
			for (let i = 0; i < 60; i++) {
				manyTypes.push(createLiteralType(`'type${i}'`));
			}

			const unionParam = createFunParam("param", createUnionType(manyTypes));
			const signature = createFunSig([unionParam]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1); // Should not split due to limit
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
			expect((result.apply(0) as TsMemberFunction).name.value).toBe("test");
		});

		it("should limit number of parameters to prevent explosion", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			// Create many parameters (more than 20)
			const manyParams: TsFunParam[] = [];
			for (let i = 0; i < 25; i++) {
				manyParams.push(createFunParam(`param${i}`, TsTypeRef.string));
			}

			const signature = createFunSig(manyParams);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1); // Should not split due to parameter limit
			expect(result.apply(0)).toBe(func);
		});

		it("should handle combinatorial explosion gracefully", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			// Create multiple union parameters that would create too many combinations
			const union1 = createFunParam("param1", createUnionType([TsTypeRef.string, TsTypeRef.number, TsTypeRef.boolean]));
			const union2 = createFunParam("param2", createUnionType([TsTypeRef.string, TsTypeRef.number, TsTypeRef.boolean]));
			const union3 = createFunParam("param3", createUnionType([TsTypeRef.string, TsTypeRef.number, TsTypeRef.boolean]));
			const union4 = createFunParam("param4", createUnionType([TsTypeRef.string, TsTypeRef.number, TsTypeRef.boolean]));

			const signature = createFunSig([union1, union2, union3, union4]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			// 3^4 = 81 combinations, which exceeds MAX_NUM (50)
			expect(result.length).toBe(1); // Should not split due to combination limit
			expect(result.apply(0)._tag).toBe("TsMemberFunction");
			expect((result.apply(0) as TsMemberFunction).name.value).toBe("test");
		});
	});

	describe("Multiple Parameters", () => {
		it("should split multiple union parameters correctly", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const union1 = createFunParam("param1", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const union2 = createFunParam("param2", createUnionType([TsTypeRef.boolean, TsTypeRef.object]));
			const signature = createFunSig([union1, union2]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(4); // 2 * 2 = 4 combinations
		});

		it("should handle mixed union and non-union parameters", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const normalParam = createFunParam("param1", TsTypeRef.string);
			const unionParam = createFunParam("param2", createUnionType([TsTypeRef.number, TsTypeRef.boolean]));
			const signature = createFunSig([normalParam, unionParam]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(2); // Only union param splits
		});

		it("should preserve parameter order in split signatures", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const param1 = createFunParam("first", TsTypeRef.string);
			const unionParam = createFunParam("second", createUnionType([TsTypeRef.number, TsTypeRef.boolean]));
			const param3 = createFunParam("third", TsTypeRef.object);
			const signature = createFunSig([param1, unionParam, param3]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(2);
			
			// Check that parameter order is preserved
			const sig1 = (result.apply(0) as TsMemberFunction).signature;
			const sig2 = (result.apply(1) as TsMemberFunction).signature;
			
			expect(sig1.params.length).toBe(3);
			expect(sig2.params.length).toBe(3);
			expect(sig1.params.apply(0).name.value).toBe("first");
			expect(sig1.params.apply(2).name.value).toBe("third");
			expect(sig2.params.apply(0).name.value).toBe("first");
			expect(sig2.params.apply(2).name.value).toBe("third");
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle empty member lists", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const mockTree = {
				members: IArray.Empty,
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(0);
		});

		it("should handle members without signatures", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			// Create a member that's not a function/constructor/call
			const property = {
				_tag: "TsMemberProperty",
				name: createSimpleIdent("prop"),
			} as any;

			const mockTree = {
				members: IArray.apply(property),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(property); // Should return original
		});

		it("should handle signatures with no parameters", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const signature = createFunSig([]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(func);
		});

		it("should handle parameters without types", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const paramWithoutType = createFunParam("param"); // No type
			const signature = createFunSig([paramWithoutType]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(func);
		});

		it("should handle single-type unions", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const singleUnion = createFunParam("param", createUnionType([TsTypeRef.string]));
			const signature = createFunSig([singleUnion]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(1); // Single type union should create one overload
		});
	});

	describe("Utility Methods", () => {
		it("should implement collectRightWhile correctly", () => {
			const arr = IArray.apply(1, 2, 3, 4, 5);
			const [remaining, collected] = SplitMethods.collectRightWhile(
				arr,
				(x: number) => x > 3 ? x * 2 : null
			);

			expect(remaining.toArray()).toEqual([1, 2, 3]);
			expect(collected.toArray()).toEqual([8, 10]); // 4*2, 5*2
		});

		it("should handle collectRightWhile with no matches", () => {
			const arr = IArray.apply(1, 2, 3);
			const [remaining, collected] = SplitMethods.collectRightWhile(
				arr,
				(x: number) => x > 10 ? x * 2 : null
			);

			expect(remaining.toArray()).toEqual([1, 2, 3]);
			expect(collected.toArray()).toEqual([]);
		});

		it("should handle collectRightWhile with all matches", () => {
			const arr = IArray.apply(1, 2, 3);
			const [remaining, collected] = SplitMethods.collectRightWhile(
				arr,
				(x: number) => x > 0 ? x * 2 : null
			);

			expect(remaining.toArray()).toEqual([]);
			expect(collected.toArray()).toEqual([2, 4, 6]);
		});

		it("should handle empty arrays in collectRightWhile", () => {
			const arr = IArray.Empty;
			const [remaining, collected] = SplitMethods.collectRightWhile(
				arr,
				(x: any) => x
			);

			expect(remaining.toArray()).toEqual([]);
			expect(collected.toArray()).toEqual([]);
		});
	});

	describe("Integration and Complex Scenarios", () => {
		it("should handle complex nested union types", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			// Create complex union with literals and regular types
			const literal1 = createLiteralType("'a'");
			const literal2 = createLiteralType("'b'");
			const complexUnion = createUnionType([literal1, literal2, TsTypeRef.string, TsTypeRef.number]);
			
			const unionParam = createFunParam("param", complexUnion);
			const signature = createFunSig([unionParam]);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(3); // literals grouped + string + number
		});

		it("should handle multiple methods in same container", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const union1 = createFunParam("param", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const union2 = createFunParam("param", createUnionType([TsTypeRef.boolean, TsTypeRef.object]));
			
			const sig1 = createFunSig([union1]);
			const sig2 = createFunSig([union2]);
			
			const func1 = createMemberFunction("test1", sig1);
			const func2 = createMemberFunction("test2", sig2);

			const mockTree = {
				members: IArray.apply(func1, func2),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(4); // 2 + 2 overloads
		});

		it("should preserve method metadata during splitting", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const unionParam = createFunParam("param", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const signature = createFunSig([unionParam], TsTypeRef.boolean);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(2);
			
			const func1 = result.apply(0) as TsMemberFunction;
			const func2 = result.apply(1) as TsMemberFunction;
			
			expect(func1.name.value).toBe("test");
			expect(func2.name.value).toBe("test");
			expect(func1.methodType._tag).toBe("Normal");
			expect(func2.methodType._tag).toBe("Normal");
		});

		it("should handle return type preservation", () => {
			const transform = new SplitMethods();
			const scope = createMockScope();

			const unionParam = createFunParam("param", createUnionType([TsTypeRef.string, TsTypeRef.number]));
			const signature = createFunSig([unionParam], TsTypeRef.boolean);
			const func = createMemberFunction("test", signature);

			const mockTree = {
				members: IArray.apply(func),
			} as any;

			const result = transform.newClassMembers(scope, mockTree);

			expect(result.length).toBe(2);
			
			const sig1 = (result.apply(0) as TsMemberFunction).signature;
			const sig2 = (result.apply(1) as TsMemberFunction).signature;
			
			expect(sig1.resultType._tag).toBe("Some");
			expect(sig2.resultType._tag).toBe("Some");
		});
	});
});
