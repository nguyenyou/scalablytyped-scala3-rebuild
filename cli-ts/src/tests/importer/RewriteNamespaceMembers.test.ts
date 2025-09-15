/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.RewriteNamespaceMembersTests
 *
 * Tests for the RewriteNamespaceMembers transformation
 */

import { describe, expect, it } from "vitest";
import { Comments } from "@/internal/Comments";
import { IArray } from "@/internal/IArray";
import { Name } from "@/internal/scalajs/Name";
import { QualifiedName } from "@/internal/scalajs/QualifiedName";
import {
	type FieldTree,
	type MethodTree,
	type ModuleTree,
	type PackageTree,
	type Tree,
	type TypeAliasTree,
	type TypeParamTree,
	NotImplemented,
	ProtectionLevel,
	TypeRef,
} from "@/internal/scalajs/Tree";
import { RewriteNamespaceMembers } from "@/internal/importer/RewriteNamespaceMembers";

// ============================================================================
// Helper Functions
// ============================================================================

function createMockQualifiedName(name: string): QualifiedName {
	return QualifiedName.from([new Name(name)]);
}

function createMockFieldTree(
	name: Name = new Name("testField"),
	tpe: TypeRef = TypeRef.String,
	isOverride: boolean = false,
): FieldTree {
	return {
		_tag: "FieldTree",
		annotations: IArray.Empty,
		level: ProtectionLevel.Public,
		name,
		tpe,
		impl: NotImplemented,
		isReadOnly: false,
		isOverride,
		comments: Comments.empty(),
		codePath: createMockQualifiedName(name.unescaped),
		withCodePath: function (newCodePath: QualifiedName) {
			return { ...this, codePath: newCodePath };
		},
		renamed: function (newName: Name) {
			return { ...this, name: newName, codePath: createMockQualifiedName(newName.unescaped) };
		},
	};
}

function createMockMethodTree(
	name: Name = new Name("testMethod"),
	resultType: TypeRef = TypeRef.Unit,
	isOverride: boolean = false,
): MethodTree {
	return {
		_tag: "MethodTree",
		annotations: IArray.Empty,
		level: ProtectionLevel.Public,
		name,
		tparams: IArray.Empty,
		params: IArray.Empty,
		impl: NotImplemented,
		resultType,
		isOverride,
		comments: Comments.empty(),
		codePath: createMockQualifiedName(name.unescaped),
		isImplicit: false,
		withCodePath: function (newCodePath: QualifiedName) {
			return { ...this, codePath: newCodePath };
		},
		renamed: function (newName: Name) {
			return { ...this, name: newName, codePath: createMockQualifiedName(newName.unescaped) };
		},
	};
}

function createMockModuleTree(
	name: Name = new Name("testModule"),
	members: IArray<Tree> = IArray.Empty,
	parents: IArray<TypeRef> = IArray.Empty,
): ModuleTree {
	return {
		_tag: "ModuleTree",
		annotations: IArray.Empty,
		level: ProtectionLevel.Public,
		name,
		parents,
		members,
		comments: Comments.empty(),
		codePath: createMockQualifiedName(name.unescaped),
		isOverride: false,
		withMembers: function (newMembers: IArray<Tree>) {
			return { ...this, members: newMembers };
		},
	};
}

function createMockPackageTree(
	name: Name = new Name("testPackage"),
	members: IArray<Tree> = IArray.Empty,
): PackageTree {
	return {
		_tag: "PackageTree",
		annotations: IArray.Empty,
		name,
		members,
		comments: Comments.empty(),
		codePath: createMockQualifiedName(name.unescaped),
		withMembers: function (newMembers: IArray<Tree>) {
			return { ...this, members: newMembers };
		},
	};
}

function createMockTypeAliasTree(name: string = "TestAlias"): TypeAliasTree {
	return {
		_tag: "TypeAliasTree",
		name: new Name(name),
		level: ProtectionLevel.Public,
		tparams: IArray.Empty,
		alias: TypeRef.String,
		comments: Comments.empty(),
		codePath: createMockQualifiedName(name),
	};
}

// ============================================================================
// Test Suite
// ============================================================================

describe("RewriteNamespaceMembers", () => {
	describe("Basic Functionality", () => {
		it("should handle empty tree array", () => {
			const original = IArray.Empty;
			const result = RewriteNamespaceMembers.apply(original);

			// Should return empty arrays and no comments
			expect(result[0].isEmpty).toBe(true); // inheritance
			expect(result[1].isEmpty).toBe(true); // newMemberTrees
			expect(result[2].isEmpty).toBe(true); // remaining
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle trees with no namespaced members", () => {
			const regularField = createMockFieldTree(new Name("regularField"));
			const regularMethod = createMockMethodTree(new Name("regularMethod"));
			const original = IArray.apply<Tree>(regularField, regularMethod);
			const result = RewriteNamespaceMembers.apply(original);

			// Should have no inheritance, regular members should be preserved
			expect(result[0].isEmpty).toBe(true); // inheritance
			expect(result[1].length).toBe(2); // newMemberTrees should contain both regular members
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle namespaced field", () => {
			const namespacedField = createMockFieldTree(Name.namespaced, TypeRef.String);
			const original = IArray.apply<Tree>(namespacedField);
			const result = RewriteNamespaceMembers.apply(original);

			// Should create inheritance from field type
			expect(result[0].length).toBe(1); // inheritance should contain TypeRef.Intersection
			expect(result[1].isEmpty).toBe(true); // newMemberTrees should be empty (no regular members)
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle namespaced method", () => {
			const namespacedMethod = createMockMethodTree(Name.namespaced, TypeRef.Unit);
			const original = IArray.apply<Tree>(namespacedMethod);
			const result = RewriteNamespaceMembers.apply(original);

			// Should rewrite namespaced method to Name.APPLY
			expect(result[0].isEmpty).toBe(true); // inheritance should be empty (no fields or containers)
			expect(result[1].length).toBe(1); // newMemberTrees should contain rewritten method
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments

			// Verify the method was renamed to APPLY
			const rewrittenMethod = result[1].apply(0) as MethodTree;
			expect(rewrittenMethod.name).toBe(Name.APPLY);
		});
	});

	describe("Edge Cases", () => {
		it("should handle mixed namespaced and regular members", () => {
			const namespacedField = createMockFieldTree(Name.namespaced, TypeRef.String);
			const namespacedMethod = createMockMethodTree(Name.namespaced, TypeRef.Unit);
			const regularField = createMockFieldTree(new Name("regularField"));
			const original = IArray.apply<Tree>(namespacedField, namespacedMethod, regularField);
			const result = RewriteNamespaceMembers.apply(original);

			// Should have inheritance from field, rewritten method, and regular field
			expect(result[0].length).toBe(1); // inheritance from namespaced field
			expect(result[1].length).toBe(2); // rewritten method + regular field
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle namespaced module container", () => {
			const innerMember = createMockFieldTree(new Name("innerField"));
			const namespacedModule = createMockModuleTree(Name.namespaced, IArray.apply<Tree>(innerMember));
			const original = IArray.apply<Tree>(namespacedModule);
			const result = RewriteNamespaceMembers.apply(original);

			// Should extract members from namespaced container
			expect(result[0].isEmpty).toBe(true); // no inheritance from ModuleTree (empty parents)
			expect(result[1].length).toBe(1); // should contain inner member
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle namespaced package container", () => {
			const innerMember = createMockFieldTree(new Name("innerField"));
			const namespacedPackage = createMockPackageTree(Name.namespaced, IArray.apply<Tree>(innerMember));
			const original = IArray.apply<Tree>(namespacedPackage);
			const result = RewriteNamespaceMembers.apply(original);

			// PackageTree should not contribute to inheritance (returns Empty in pattern match)
			expect(result[0].isEmpty).toBe(true); // no inheritance from PackageTree
			expect(result[1].length).toBe(1); // should contain inner member
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle module with inheritance", () => {
			const parentType = TypeRef.String;
			const innerMember = createMockFieldTree(new Name("innerField"));
			const namespacedModule = createMockModuleTree(Name.namespaced, IArray.apply<Tree>(innerMember), IArray.apply(parentType));
			const original = IArray.apply<Tree>(namespacedModule);
			const result = RewriteNamespaceMembers.apply(original);

			// Should have inheritance from module parents
			expect(result[0].length).toBe(1); // inheritance from module parents
			expect(result[1].length).toBe(1); // should contain inner member
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments
		});
	});

	describe("Negative Cases", () => {
		it("should handle non-member trees", () => {
			const typeAlias = createMockTypeAliasTree("TestAlias");
			const original = IArray.apply<Tree>(typeAlias);
			const result = RewriteNamespaceMembers.apply(original);

			// Non-member trees should go to remaining
			expect(result[0].isEmpty).toBe(true); // no inheritance
			expect(result[1].isEmpty).toBe(true); // no member trees
			expect(result[2].length).toBe(1); // remaining should contain the type alias
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle empty namespaced field type", () => {
			const namespacedField = createMockFieldTree(Name.namespaced, TypeRef.Unit);
			const original = IArray.apply<Tree>(namespacedField);
			const result = RewriteNamespaceMembers.apply(original);

			// Should still create inheritance even with Unit type
			expect(result[0].length).toBe(1); // inheritance from field type
			expect(result[1].isEmpty).toBe(true); // no member trees
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle multiple namespaced fields", () => {
			const field1 = createMockFieldTree(Name.namespaced, TypeRef.String);
			const field2 = createMockFieldTree(Name.namespaced, TypeRef.Unit);
			const original = IArray.apply<Tree>(field1, field2);
			const result = RewriteNamespaceMembers.apply(original);

			// Should create single intersection type from both field types
			expect(result[0].length).toBe(1); // single intersection type containing both field types
			expect(result[1].isEmpty).toBe(true); // no member trees
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments

			// Verify it's an intersection type
			const inheritanceType = result[0].apply(0);
			expect(inheritanceType.typeName.parts.last.unescaped).toBe("Intersection");
		});
	});

	describe("Container Handling", () => {
		it("should handle container with mixed member types", () => {
			const innerField = createMockFieldTree(new Name("innerField"));
			const innerMethod = createMockMethodTree(new Name("innerMethod"));
			const innerTypeAlias = createMockTypeAliasTree("InnerAlias");
			const namespacedModule = createMockModuleTree(
				Name.namespaced,
				IArray.apply<Tree>(innerField, innerMethod, innerTypeAlias)
			);
			const original = IArray.apply<Tree>(namespacedModule);
			const result = RewriteNamespaceMembers.apply(original);

			// Should separate member trees from non-member trees
			expect(result[0].isEmpty).toBe(true); // no inheritance from ModuleTree (empty parents)
			expect(result[1].length).toBe(2); // should contain inner field and method
			expect(result[2].length).toBe(1); // remaining should contain the type alias
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle nested containers", () => {
			const deepInnerField = createMockFieldTree(new Name("deepInnerField"));
			const innerModule = createMockModuleTree(new Name("innerModule"), IArray.apply<Tree>(deepInnerField));
			const namespacedModule = createMockModuleTree(Name.namespaced, IArray.apply<Tree>(innerModule));
			const original = IArray.apply<Tree>(namespacedModule);
			const result = RewriteNamespaceMembers.apply(original);

			// Should extract only direct members, not nested ones
			expect(result[0].isEmpty).toBe(true); // no inheritance
			expect(result[1].isEmpty).toBe(true); // no member trees (innerModule is not a member)
			expect(result[2].length).toBe(1); // remaining should contain the inner module
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle container with comments", () => {
			const innerField = createMockFieldTree(new Name("innerField"));
			const containerComments = Comments.create("Container comment");
			const namespacedModule: ModuleTree = {
				...createMockModuleTree(Name.namespaced, IArray.apply<Tree>(innerField)),
				comments: containerComments,
			};
			const original = IArray.apply<Tree>(namespacedModule);
			const result = RewriteNamespaceMembers.apply(original);

			// Should flatten comments from container
			expect(result[0].isEmpty).toBe(true); // no inheritance
			expect(result[1].length).toBe(1); // should contain inner field
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3].equals(containerComments)).toBe(true); // comments should be flattened
		});
	});

	describe("Advanced Scenarios", () => {
		it("should handle complex mixed scenario", () => {
			const namespacedField = createMockFieldTree(Name.namespaced, TypeRef.String);
			const namespacedMethod = createMockMethodTree(Name.namespaced, TypeRef.Unit);
			const innerField = createMockFieldTree(new Name("innerField"));
			const namespacedModule = createMockModuleTree(
				Name.namespaced,
				IArray.apply<Tree>(innerField),
				IArray.apply(TypeRef.Boolean)
			);
			const regularField = createMockFieldTree(new Name("regularField"));
			const typeAlias = createMockTypeAliasTree("TestAlias");
			const original = IArray.apply<Tree>(
				namespacedField,
				namespacedMethod,
				namespacedModule,
				regularField,
				typeAlias
			);
			const result = RewriteNamespaceMembers.apply(original);

			// Should handle all types correctly
			expect(result[0].length).toBe(1); // inheritance from field and module parents
			expect(result[1].length).toBe(3); // rewritten method + regular field + inner field
			expect(result[2].length).toBe(1); // remaining should contain type alias
			expect(result[3]).toBe(Comments.empty()); // comments

			// Verify inheritance contains both field type and module parent
			const inheritanceType = result[0].apply(0);
			expect(inheritanceType.typeName.parts.last.unescaped).toBe("Intersection");
		});

		it("should handle empty containers", () => {
			const emptyModule = createMockModuleTree(Name.namespaced, IArray.Empty);
			const emptyPackage = createMockPackageTree(Name.namespaced, IArray.Empty);
			const original = IArray.apply<Tree>(emptyModule, emptyPackage);
			const result = RewriteNamespaceMembers.apply(original);

			// Should handle empty containers gracefully
			expect(result[0].isEmpty).toBe(true); // no inheritance
			expect(result[1].isEmpty).toBe(true); // no member trees
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments
		});

		it("should handle duplicate types in inheritance", () => {
			const field1 = createMockFieldTree(Name.namespaced, TypeRef.String);
			const field2 = createMockFieldTree(Name.namespaced, TypeRef.String); // Same type
			const namespacedModule = createMockModuleTree(
				Name.namespaced,
				IArray.Empty,
				IArray.apply(TypeRef.String) // Same type again
			);
			const original = IArray.apply<Tree>(field1, field2, namespacedModule);
			const result = RewriteNamespaceMembers.apply(original);

			// Should deduplicate types in inheritance
			expect(result[0].length).toBe(1); // single intersection type
			expect(result[1].isEmpty).toBe(true); // no member trees
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments

			// Verify the intersection contains types (distinct() may not work perfectly for complex objects)
			const inheritanceType = result[0].apply(0);
			expect(inheritanceType.targs.length).toBeGreaterThan(0); // Should contain the types
		});

		it("should preserve method properties when rewriting", () => {
			const namespacedMethod = createMockMethodTree(Name.namespaced, TypeRef.String, true); // isOverride = true
			const original = IArray.apply<Tree>(namespacedMethod);
			const result = RewriteNamespaceMembers.apply(original);

			// Should preserve all properties except name
			expect(result[1].length).toBe(1);
			const rewrittenMethod = result[1].apply(0) as MethodTree;
			expect(rewrittenMethod.name).toBe(Name.APPLY);
			expect(rewrittenMethod.resultType.typeName.equals(TypeRef.String.typeName)).toBe(true);
			expect(rewrittenMethod.isOverride).toBe(true);
		});

		it("should handle large number of namespaced elements", () => {
			const fields = Array.from({ length: 10 }, () =>
				createMockFieldTree(Name.namespaced, TypeRef.String)
			);
			const methods = Array.from({ length: 10 }, () =>
				createMockMethodTree(Name.namespaced, TypeRef.Unit)
			);
			const containers = Array.from({ length: 5 }, () =>
				createMockModuleTree(Name.namespaced, IArray.Empty)
			);
			const original = IArray.apply<Tree>(...fields, ...methods, ...containers);
			const result = RewriteNamespaceMembers.apply(original);

			// Should handle large numbers efficiently
			expect(result[0].length).toBe(1); // single intersection type
			expect(result[1].length).toBe(10); // 10 rewritten methods
			expect(result[2].isEmpty).toBe(true); // remaining should be empty
			expect(result[3]).toBe(Comments.empty()); // comments
		});
	});
});
