/**
 * TypeScript port of ForwardCtorsTests.scala
 *
 * Tests for the ForwardCtors transformation functionality
 */

import { describe, expect, test } from "bun:test";
import { none, some } from "fp-ts/Option";
import { IArray } from "../../../internal/IArray.js";
import { TreeTransformationScopedChanges } from "../../../internal/ts/TreeTransformations.js";
import { ForwardCtors } from "../../../internal/ts/transforms/ForwardCtors.js";
import {
	TsDeclClass,
	TsIdent,
	TsIdentConstructor,
	type TsIdentSimple,
	type TsMember,
	type TsMemberCtor,
	type TsMemberFunction,
	type TsMemberProperty,
	TsTypeRef,
} from "../../../internal/ts/trees.js";
import {
	createMockClass,
	createMockMemberCtor,
	createMockProperty,
	createMockScope,
} from "../../utils/TestUtils.js";

describe("ForwardCtors", () => {
	describe("Basic Functionality", () => {
		test("extends TreeTransformationScopedChanges", () => {
			const forwardCtors = new ForwardCtors();
			expect(forwardCtors).toBeInstanceOf(TreeTransformationScopedChanges);
		});

		test("has enterTsDeclClass method", () => {
			const scope = createMockScope();
			const clazz = createMockClass("TestClass");
			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(clazz);
			expect(result).not.toBeNull();
			expect(result._tag).toBe("TsDeclClass");
		});

		test("leaves classes with constructors unchanged", () => {
			const scope = createMockScope();
			const ctor = createMockMemberCtor();
			const clazz = createMockClass("TestClass", IArray.fromArray([ctor]));
			
			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(clazz);
			
			expect(result).toBe(clazz); // Should be unchanged
			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsMemberCtor");
		});

		test("leaves classes without parent unchanged", () => {
			const scope = createMockScope();
			const prop = createMockProperty("value");
			const clazz = createMockClass("TestClass", IArray.fromArray([prop]));
			
			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(clazz);
			
			expect(result).toBe(clazz); // Should be unchanged
			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsMemberProperty");
		});
	});
});
