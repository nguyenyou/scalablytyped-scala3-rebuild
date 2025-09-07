/**
 * TypeScript port of ForwardCtorsTests.scala
 *
 * Tests for the ForwardCtors transformation functionality
 */

import { describe, expect, test } from "vitest";
import { IArray } from "../../../internal/IArray.js";
import { TreeTransformationScopedChanges } from "../../../internal/ts/TreeTransformations.js";
import { ForwardCtors } from "../../../internal/ts/transforms/ForwardCtors.js";

import {
	createMockMemberCtor,
	createMockProperty,
	createMockScope,
	createTypeRef,
	createMockFunSig,
} from "../../utils/TestUtils.js";
import { TsDeclClass, TsFunParam, TsFunSig, TsIdent, TsMemberCtor, TsTypeParam, TsTypeRef } from "../../../internal/ts/trees.js";
import { Comments } from "../../../internal/Comments.js";
import { Comment } from "../../../internal/Comment.js";
import { TsProtectionLevel } from "../../../internal/ts/TsProtectionLevel.js";
import { JsLocation } from "../../../internal/ts/JsLocation.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { some, none, type Option } from "fp-ts/Option";

// Helper function to create a proper mock class with membersByName populated
function createMockClass(
	name: string,
	membersOrParent?: IArray<any> | TsTypeRef,
	implementsInterfaces?: IArray<TsTypeRef>,
	members?: IArray<any>,
): TsDeclClass {
	// Determine if the second parameter is members or parent
	let parent: Option<TsTypeRef>;
	let actualMembers: IArray<any>;
	let actualImplementsInterfaces: IArray<TsTypeRef>;

	if (
		membersOrParent &&
		"_tag" in membersOrParent &&
		membersOrParent._tag === "TsTypeRef"
	) {
		// Second parameter is parent
		parent = some(membersOrParent as TsTypeRef);
		actualMembers = members || IArray.Empty;
		actualImplementsInterfaces = implementsInterfaces || IArray.Empty;
	} else {
		// Second parameter is members (or undefined)
		parent = none;
		actualMembers = (membersOrParent as IArray<any>) || IArray.Empty;
		actualImplementsInterfaces = IArray.Empty;
	}

	return TsDeclClass.create(
		Comments.empty(),
		false, // declared
		false, // isAbstract
		TsIdent.simple(name),
		IArray.Empty, // tparams
		parent,
		actualImplementsInterfaces,
		actualMembers,
		JsLocation.zero(),
		CodePath.noPath(),
	);
}

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

	describe("Constructor Forwarding", () => {
		test("forwards constructors from parent class", () => {
			const parentCtor = createMockMemberCtor();
			const parentClass = createMockClass("ParentClass", IArray.fromArray([parentCtor]));
			const scope = createMockScope("test-lib", parentClass);

			const childClass = createMockClass("ChildClass", createTypeRef("ParentClass"));

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should forward the constructor from parent
			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsMemberCtor");
		});

		test("forwards multiple constructors from parent", () => {
			const ctor1 = createMockMemberCtor();
			const ctor2 = createMockMemberCtor();
			const parentClass = createMockClass("ParentClass", IArray.fromArray([ctor1, ctor2]));
			const scope = createMockScope("test-lib", parentClass);

			const childClass = createMockClass("ChildClass", createTypeRef("ParentClass"));

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should forward both constructors from parent
			expect(result.members.length).toBe(2);
			expect(result.members.apply(0)._tag).toBe("TsMemberCtor");
			expect(result.members.apply(1)._tag).toBe("TsMemberCtor");
		});

		test("preserves existing members when forwarding constructors", () => {
			const parentCtor = createMockMemberCtor();
			const parentClass = createMockClass("ParentClass", IArray.fromArray([parentCtor]));
			const scope = createMockScope("test-lib", parentClass);

			const existingMethod = createMockProperty("method");
			const childClass = createMockClass("ChildClass", createTypeRef("ParentClass"), IArray.Empty, IArray.fromArray([existingMethod]));

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should have both existing method and forwarded constructor
			expect(result.members.length).toBe(2);
			expect(result.members.toArray().some(m => m._tag === "TsMemberProperty")).toBe(true);
			expect(result.members.toArray().some(m => m._tag === "TsMemberCtor")).toBe(true);
		});

		test("handles inheritance chain", () => {
			const grandparentCtor = createMockMemberCtor();
			const grandparentClass = createMockClass("GrandparentClass", IArray.fromArray([grandparentCtor]));

			const parentClass = createMockClass("ParentClass", createTypeRef("GrandparentClass"));
			const scope = createMockScope("test-lib", grandparentClass, parentClass);

			const childClass = createMockClass("ChildClass", createTypeRef("ParentClass"));

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should forward constructor from grandparent through parent
			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsMemberCtor");
		});
	});

	describe("Type Parameter Handling", () => {
		test("handles parent with type parameters", () => {
			const parentCtor = createMockMemberCtor();
			const parentClass = createMockClass("ParentClass", IArray.fromArray([parentCtor]));
			const scope = createMockScope("test-lib", parentClass);

			// Create a child class that extends ParentClass<string>
			const parentTypeRef = createTypeRef("ParentClass", IArray.fromArray([TsTypeRef.string]));
			const childClass = createMockClass("ChildClass", parentTypeRef);

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should forward the constructor from parent with type parameters filled in
			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsMemberCtor");
		});

		test("handles child with type parameters", () => {
			const parentCtor = createMockMemberCtor();
			const parentClass = createMockClass("ParentClass", IArray.fromArray([parentCtor]));
			const scope = createMockScope("test-lib", parentClass);

			// Create a child class with type parameters that extends ParentClass
			const childClass = TsDeclClass.create(
				Comments.empty(),
				false, // declared
				false, // isAbstract
				TsIdent.simple("ChildClass"),
				IArray.fromArray([
					TsTypeParam.create(
						Comments.empty(),
						TsIdent.simple("T"),
						none, // upperBound
						none, // default
					),
				]), // tparams
				some(createTypeRef("ParentClass")),
				IArray.Empty, // implementsInterfaces
				IArray.Empty, // members
				JsLocation.zero(),
				CodePath.noPath(),
			);

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should forward the constructor from parent
			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsMemberCtor");
		});
	});

	describe("Edge Cases", () => {
		test("handles non-existent parent class", () => {
			const scope = createMockScope("test-lib");

			const childClass = createMockClass("ChildClass", createTypeRef("NonExistentParent"));

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should leave class unchanged when parent doesn't exist
			expect(result).toBe(childClass);
			expect(result.members.length).toBe(0);
		});

		test("handles parent without constructors", () => {
			const parentProperty = createMockProperty("value");
			const parentClass = createMockClass("ParentClass", IArray.fromArray([parentProperty]));
			const scope = createMockScope("test-lib", parentClass);

			const childClass = createMockClass("ChildClass", createTypeRef("ParentClass"));

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should leave class unchanged when parent has no constructors
			expect(result).toBe(childClass);
			expect(result.members.length).toBe(0);
		});

		test("handles circular inheritance", () => {
			// Create classes that reference each other
			const classA = createMockClass("ClassA", createTypeRef("ClassB"));
			const classB = createMockClass("ClassB", createTypeRef("ClassA"));
			const scope = createMockScope("test-lib", classA, classB);

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(classA);

			// Should handle circular inheritance gracefully (no infinite loop)
			expect(result).toBe(classA);
			expect(result.members.length).toBe(0);
		});

		test("handles self-referencing inheritance", () => {
			const selfRefClass = createMockClass("SelfRefClass", createTypeRef("SelfRefClass"));
			const scope = createMockScope("test-lib", selfRefClass);

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(selfRefClass);

			// Should handle self-reference gracefully (no infinite loop)
			expect(result).toBe(selfRefClass);
			expect(result.members.length).toBe(0);
		});

		test("preserves constructor comments and metadata", () => {
			const ctorWithComments = TsMemberCtor.create(
				Comments.fromComment(Comment.create("Constructor comment")),
				TsProtectionLevel.default(),
				createMockFunSig(),
			);
			const parentClass = createMockClass("ParentClass", IArray.fromArray([ctorWithComments]));
			const scope = createMockScope("test-lib", parentClass);

			const childClass = createMockClass("ChildClass", createTypeRef("ParentClass"));

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should forward constructor with preserved comments
			expect(result.members.length).toBe(1);
			const forwardedCtor = result.members.apply(0) as TsMemberCtor;
			expect(forwardedCtor._tag).toBe("TsMemberCtor");
			expect(forwardedCtor.comments.cs.length).toBeGreaterThan(0);
		});
	});

	describe("Integration Scenarios", () => {
		test("handles complex inheritance hierarchy", () => {
			// Create a complex inheritance chain: GrandParent -> Parent -> Child
			const grandParentCtor = createMockMemberCtor();
			const grandParentClass = createMockClass("GrandParentClass", IArray.fromArray([grandParentCtor]));

			const parentClass = createMockClass("ParentClass", createTypeRef("GrandParentClass"));
			const childClass = createMockClass("ChildClass", createTypeRef("ParentClass"));

			const scope = createMockScope("test-lib", grandParentClass, parentClass, childClass);

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should forward constructor from grandparent through parent to child
			expect(result.members.length).toBe(1);
			expect(result.members.apply(0)._tag).toBe("TsMemberCtor");
		});

		test("handles multiple inheritance levels with mixed constructors", () => {
			// Create a hierarchy where some classes have constructors and others don't
			const baseCtor1 = createMockMemberCtor();
			const baseCtor2 = createMockMemberCtor();
			const baseClass = createMockClass("BaseClass", IArray.fromArray([baseCtor1, baseCtor2]));

			// Middle class has no constructors
			const middleProperty = createMockProperty("middleProp");
			const middleClass = createMockClass("MiddleClass", createTypeRef("BaseClass"), IArray.Empty, IArray.fromArray([middleProperty]));

			const topClass = createMockClass("TopClass", createTypeRef("MiddleClass"));

			const scope = createMockScope("test-lib", baseClass, middleClass, topClass);

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(topClass);

			// Should forward both constructors from base class through middle to top
			expect(result.members.length).toBe(2);
			expect(result.members.apply(0)._tag).toBe("TsMemberCtor");
			expect(result.members.apply(1)._tag).toBe("TsMemberCtor");
		});

		test("handles inheritance with type parameters and complex signatures", () => {
			// Create a parent with a constructor that has complex type parameters
			const complexCtor = TsMemberCtor.create(
				Comments.empty(),
				TsProtectionLevel.default(),
				TsFunSig.create(
					Comments.empty(),
					IArray.fromArray([
						TsTypeParam.create(
							Comments.empty(),
							TsIdent.simple("T"),
							some(TsTypeRef.string), // upper bound
							none, // default
						),
					]),
					IArray.fromArray([
						TsFunParam.create(
							Comments.empty(),
							TsIdent.simple("value"),
							some(createTypeRef("T")),
						),
					]),
					some(TsTypeRef.void),
				),
			);

			const parentClass = createMockClass("ParentClass", IArray.fromArray([complexCtor]));
			const childClass = createMockClass("ChildClass", createTypeRef("ParentClass"));

			const scope = createMockScope("test-lib", parentClass, childClass);

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Should forward the complex constructor
			expect(result.members.length).toBe(1);
			const forwardedCtor = result.members.apply(0) as TsMemberCtor;
			expect(forwardedCtor._tag).toBe("TsMemberCtor");
			expect(forwardedCtor.signature.tparams.length).toBe(1);
			expect(forwardedCtor.signature.params.length).toBe(1);
		});

		test("integration with other transforms", () => {
			// Test that ForwardCtors works well with other transformations
			const parentCtor = createMockMemberCtor();
			const parentClass = createMockClass("ParentClass", IArray.fromArray([parentCtor]));
			const childClass = createMockClass("ChildClass", createTypeRef("ParentClass"));

			const scope = createMockScope("test-lib", parentClass, childClass);

			const forwardCtors = new ForwardCtors();
			const result = forwardCtors.enterTsDeclClass(scope)(childClass);

			// Verify the result can be processed by other transforms
			expect(result.members.length).toBe(1);
			expect(result._tag).toBe("TsDeclClass");
			expect(result.name.value).toBe("ChildClass");

			// The forwarded constructor should be a proper TsMemberCtor
			const forwardedCtor = result.members.apply(0) as TsMemberCtor;
			expect(forwardedCtor._tag).toBe("TsMemberCtor");
			expect(TsProtectionLevel.equals(forwardedCtor.level, TsProtectionLevel.default())).toBe(true);
		});
	});
});
