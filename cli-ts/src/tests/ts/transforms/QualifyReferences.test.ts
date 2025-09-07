/**
 * Tests for QualifyReferences transformation
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, it } from "vitest";
import { NoComments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { Logger } from "../../../internal/logging/index.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { JsLocation } from "../../../internal/ts/JsLocation.js";
import { TsTreeScope } from "../../../internal/ts/TsTreeScope.js";
import { QualifyReferences } from "../../../internal/ts/transforms/QualifyReferences.js";
import {
	TsDeclClass,
	TsDeclInterface,
	TsDeclTypeAlias,
	TsIdent,
	TsParsedFile,
	type TsQIdent,
	type TsType,
	TsTypeRef,
} from "../../../internal/ts/trees.js";

describe("QualifyReferences", () => {
	// Helper functions for creating test objects
	function createQIdent(...parts: string[]): TsQIdent {
		return {
			_tag: "TsQIdent",
			parts: IArray.fromArray(parts.map((p) => TsIdent.simple(p) as TsIdent)),
			asString: `TsQIdent(${parts.join(".")})`,
		};
	}

	function createLibraryQIdent(library: string, ...parts: string[]): TsQIdent {
		const libraryIdent = TsIdent.librarySimple(library);
		const otherParts = parts.map((p) => TsIdent.simple(p) as TsIdent);
		return {
			_tag: "TsQIdent",
			parts: IArray.fromArray([libraryIdent, ...otherParts]),
			asString: `TsQIdent(${library}.${parts.join(".")})`,
		};
	}

	function createTypeRef(name: string, ...nameParts: string[]): TsTypeRef {
		const qident =
			nameParts.length > 0
				? createQIdent(name, ...nameParts)
				: createQIdent(name);
		return TsTypeRef.create(NoComments.instance, qident, IArray.Empty);
	}

	function createMockInterface(name: string): TsDeclInterface {
		return TsDeclInterface.create(
			NoComments.instance,
			false,
			TsIdent.simple(name),
			IArray.Empty,
			IArray.Empty,
			IArray.Empty,
			CodePath.hasPath(
				TsIdent.librarySimple("test-lib"),
				createQIdent("test-lib", name),
			),
		);
	}

	function createMockTypeAlias(name: string, alias: TsType): TsDeclTypeAlias {
		return TsDeclTypeAlias.create(
			NoComments.instance,
			false,
			TsIdent.simple(name),
			IArray.Empty,
			alias,
			CodePath.hasPath(
				TsIdent.librarySimple("test-lib"),
				createQIdent("test-lib", name),
			),
		);
	}

	function createMockClass(
		name: string,
		parent?: TsTypeRef,
		implementsInterfaces: IArray<TsTypeRef> = IArray.Empty,
	): TsDeclClass {
		return TsDeclClass.create(
			NoComments.instance,
			false,
			false,
			TsIdent.simple(name),
			IArray.Empty,
			parent ? some(parent) : none,
			implementsInterfaces,
			IArray.Empty,
			JsLocation.zero(),
			CodePath.hasPath(
				TsIdent.librarySimple("test-lib"),
				createQIdent("test-lib", name),
			),
		);
	}

	function createMockScope(...declarations: any[]): TsTreeScope {
		const parsedFile = TsParsedFile.create(
			NoComments.instance,
			IArray.Empty,
			IArray.fromArray(declarations),
			CodePath.hasPath(
				TsIdent.librarySimple("test-lib"),
				createQIdent("test-lib", "index"),
			),
		);

		const root = TsTreeScope.create(
			TsIdent.librarySimple("test-lib"),
			false,
			new Map(),
			Logger.DevNull(),
		);

		return root["/"](parsedFile);
	}

	describe("Basic Functionality", () => {
		it("has apply method that returns visitor", () => {
			const visitor = QualifyReferences.apply(false);
			expect(visitor).toBeDefined();
		});

		it("has skipValidation parameter", () => {
			const visitor1 = QualifyReferences.apply(true);
			const visitor2 = QualifyReferences.apply(false);
			expect(visitor1).toBeDefined();
			expect(visitor2).toBeDefined();
		});

		it("has enterTsType method", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const typeRef = createTypeRef("string");
			const result = visitor.enterTsType(scope)(typeRef);
			expect(result).toBeDefined();
		});

		it("has enterTsTypeRef method", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const typeRef = createTypeRef("string");
			const result = visitor.enterTsTypeRef(scope)(typeRef);
			expect(result).toBeDefined();
		});

		it("has enterTsDeclTypeAlias method", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const alias = createMockTypeAlias("TestAlias", createTypeRef("string"));
			const result = visitor.enterTsDeclTypeAlias(scope)(alias);
			expect(result).toBeDefined();
		});

		it("has enterTsDeclClass method", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const clazz = createMockClass("TestClass");
			const result = visitor.enterTsDeclClass(scope)(clazz);
			expect(result).toBeDefined();
		});
	});

	describe("Type Reference Qualification", () => {
		it("qualifies simple type reference", () => {
			const visitor = QualifyReferences.apply(false);
			const targetInterface = createMockInterface("TargetType");
			const scope = createMockScope(targetInterface);
			const typeRef = createTypeRef("TargetType");

			const result = visitor.enterTsTypeRef(scope)(typeRef);

			expect(result._tag).toBe("TsTypeRef");
			expect(result.name.parts.length).toBeGreaterThan(1);
		});

		it("leaves primitive types unchanged", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const primitiveRef = createTypeRef("string");

			const result = visitor.enterTsTypeRef(scope)(primitiveRef);

			expect(result._tag).toBe("TsTypeRef");
			expect(result.name.parts.length).toBe(1);
			expect(result.name.parts.apply(0).value).toBe("string");
		});

		it("leaves library types unchanged", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const libraryQIdent = createLibraryQIdent("std", "Array");
			const libraryRef = TsTypeRef.create(
				NoComments.instance,
				libraryQIdent,
				IArray.Empty,
			);

			const result = visitor.enterTsTypeRef(scope)(libraryRef);

			expect(result._tag).toBe("TsTypeRef");
			expect(result.name.parts.apply(0)._tag).toBe("TsIdentLibrarySimple");
		});

		it("handles non-existent types with skipValidation=false", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const nonExistentRef = createTypeRef("NonExistentType");

			const result = visitor.enterTsTypeRef(scope)(nonExistentRef);

			expect(result._tag).toBe("TsTypeRef");
			expect(result.name.parts.apply(0).value).toBe("any");
			expect(result.comments.rawCs.length).toBeGreaterThan(0);
		});

		it("handles non-existent types with skipValidation=true", () => {
			const visitor = QualifyReferences.apply(true);
			const scope = createMockScope();
			const nonExistentRef = createTypeRef("NonExistentType");

			const result = visitor.enterTsTypeRef(scope)(nonExistentRef);

			expect(result._tag).toBe("TsTypeRef");
			expect(result.name.parts.apply(0).value).toBe("NonExistentType");
		});
	});

	describe("Type Alias Processing", () => {
		it("qualifies type reference in type alias", () => {
			const visitor = QualifyReferences.apply(false);
			const targetInterface = createMockInterface("TargetType");
			const scope = createMockScope(targetInterface);
			const alias = createMockTypeAlias("MyAlias", createTypeRef("TargetType"));

			const result = visitor.enterTsDeclTypeAlias(scope)(alias);

			expect(result.name.value).toBe("MyAlias");
			expect(result.alias._tag).toBe("TsTypeRef");
			const aliasType = result.alias as TsTypeRef;
			expect(aliasType.name.parts.length).toBeGreaterThan(1);
		});

		it("handles self-referencing type alias", () => {
			const visitor = QualifyReferences.apply(false);
			const alias = createMockTypeAlias("SelfRef", createTypeRef("SelfRef"));
			const scope = createMockScope(alias);

			const result = visitor.enterTsDeclTypeAlias(scope)(alias);

			expect(result.name.value).toBe("SelfRef");
			// Should filter out self-reference
		});

		it("leaves non-type-reference aliases unchanged", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const stringLiteral = {
				_tag: "TsTypeLiteral" as const,
				literal: { _tag: "TsLiteralStr" as const, value: "test" },
				asString: "test",
			};
			const alias = createMockTypeAlias("StringAlias", stringLiteral);

			const result = visitor.enterTsDeclTypeAlias(scope)(alias);

			expect(result.name.value).toBe("StringAlias");
			expect(result.alias._tag).toBe("TsTypeLiteral");
		});
	});

	describe("Class Processing", () => {
		it("qualifies parent class reference", () => {
			const visitor = QualifyReferences.apply(false);
			const baseClass = createMockClass("BaseClass");
			const scope = createMockScope(baseClass);
			const derivedClass = createMockClass(
				"DerivedClass",
				createTypeRef("BaseClass"),
			);

			const result = visitor.enterTsDeclClass(scope)(derivedClass);

			expect(result.name.value).toBe("DerivedClass");
			expect(result.parent._tag).toBe("Some");
			if (result.parent._tag === "Some") {
				expect(result.parent.value.name.parts.length).toBeGreaterThan(1);
			}
		});

		it("qualifies implemented interfaces", () => {
			const visitor = QualifyReferences.apply(false);
			const interface1 = createMockInterface("Interface1");
			const interface2 = createMockInterface("Interface2");
			const scope = createMockScope(interface1, interface2);
			const clazz = createMockClass(
				"TestClass",
				undefined,
				IArray.apply(createTypeRef("Interface1"), createTypeRef("Interface2")),
			);

			const result = visitor.enterTsDeclClass(scope)(clazz);

			expect(result.name.value).toBe("TestClass");
			expect(result.implementsInterfaces.length).toBe(2);
			expect(
				result.implementsInterfaces.apply(0).name.parts.length,
			).toBeGreaterThan(1);
			expect(
				result.implementsInterfaces.apply(1).name.parts.length,
			).toBeGreaterThan(1);
		});

		it("filters out self-referencing inheritance", () => {
			const visitor = QualifyReferences.apply(false);
			const clazz = createMockClass("SelfClass", createTypeRef("SelfClass"));
			const scope = createMockScope(clazz);

			const result = visitor.enterTsDeclClass(scope)(clazz);

			expect(result.name.value).toBe("SelfClass");
			expect(result.parent._tag).toBe("None");
		});

		it("handles class with both parent and interfaces", () => {
			const visitor = QualifyReferences.apply(false);
			const baseClass = createMockClass("BaseClass");
			const interface1 = createMockInterface("Interface1");
			const scope = createMockScope(baseClass, interface1);
			const clazz = createMockClass(
				"TestClass",
				createTypeRef("BaseClass"),
				IArray.apply(createTypeRef("Interface1")),
			);

			const result = visitor.enterTsDeclClass(scope)(clazz);

			expect(result.name.value).toBe("TestClass");
			expect(result.parent._tag).toBe("Some");
			expect(result.implementsInterfaces.length).toBe(1);
		});
	});

	describe("Validation Logic", () => {
		it("handles skipValidation=true for missing types", () => {
			const visitor = QualifyReferences.apply(true);
			const scope = createMockScope();
			const missingRef = createTypeRef("MissingType");

			const result = visitor.enterTsTypeRef(scope)(missingRef);

			expect(result._tag).toBe("TsTypeRef");
			expect(result.name.parts.apply(0).value).toBe("MissingType");
			expect(result.comments.rawCs.length).toBe(0); // No warning comments
		});

		it("handles skipValidation=false for missing types", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const missingRef = createTypeRef("MissingType");

			const result = visitor.enterTsTypeRef(scope)(missingRef);

			expect(result._tag).toBe("TsTypeRef");
			expect(result.name.parts.apply(0).value).toBe("any");
			expect(result.comments.rawCs.length).toBeGreaterThan(0); // Has warning comment
		});
	});

	describe("Primitive Type Detection", () => {
		const primitiveTypes = [
			"any",
			"boolean",
			"number",
			"string",
			"symbol",
			"object",
			"undefined",
			"null",
			"void",
			"never",
			"unknown",
			"bigint",
		];

		primitiveTypes.forEach((primitiveType) => {
			it(`leaves ${primitiveType} primitive type unchanged`, () => {
				const visitor = QualifyReferences.apply(false);
				const scope = createMockScope();
				const primitiveRef = createTypeRef(primitiveType);

				const result = visitor.enterTsTypeRef(scope)(primitiveRef);

				expect(result._tag).toBe("TsTypeRef");
				expect(result.name.parts.length).toBe(1);
				expect(result.name.parts.apply(0).value).toBe(primitiveType);
			});
		});
	});

	describe("Library Identifier Detection", () => {
		it("leaves library scoped identifiers unchanged", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const libraryQIdent = createLibraryQIdent("@types/node", "Buffer");
			const libraryRef = TsTypeRef.create(
				NoComments.instance,
				libraryQIdent,
				IArray.Empty,
			);

			const result = visitor.enterTsTypeRef(scope)(libraryRef);

			expect(result._tag).toBe("TsTypeRef");
			expect(result.name.parts.apply(0)._tag).toBe("TsIdentLibrarySimple");
		});

		it("handles complex library paths", () => {
			const visitor = QualifyReferences.apply(false);
			const scope = createMockScope();
			const libraryQIdent = createLibraryQIdent("react", "Component", "Props");
			const libraryRef = TsTypeRef.create(
				NoComments.instance,
				libraryQIdent,
				IArray.Empty,
			);

			const result = visitor.enterTsTypeRef(scope)(libraryRef);

			expect(result._tag).toBe("TsTypeRef");
			expect(result.name.parts.apply(0)._tag).toBe("TsIdentLibrarySimple");
			expect(result.name.parts.length).toBe(3);
		});
	});

	describe("Integration Tests", () => {
		it("applies full transformation pipeline", () => {
			const visitor = QualifyReferences.apply(false);

			// Create a complex scenario with interfaces, classes, and type aliases
			const baseInterface = createMockInterface("BaseInterface");
			const derivedInterface = createMockInterface("DerivedInterface");
			const baseClass = createMockClass("BaseClass");
			const targetType = createMockTypeAlias(
				"TargetType",
				createTypeRef("string"),
			);

			const scope = createMockScope(
				baseInterface,
				derivedInterface,
				baseClass,
				targetType,
			);

			// Create a class that inherits from BaseClass and implements both interfaces
			const complexClass = createMockClass(
				"ComplexClass",
				createTypeRef("BaseClass"),
				IArray.apply(
					createTypeRef("BaseInterface"),
					createTypeRef("DerivedInterface"),
				),
			);

			const result = visitor.enterTsDeclClass(scope)(complexClass);

			expect(result.name.value).toBe("ComplexClass");
			expect(result.parent._tag).toBe("Some");
			if (result.parent._tag === "Some") {
				expect(result.parent.value.name.parts.length).toBeGreaterThan(1);
			}
			expect(result.implementsInterfaces.length).toBe(2);
			expect(
				result.implementsInterfaces.apply(0).name.parts.length,
			).toBeGreaterThan(1);
			expect(
				result.implementsInterfaces.apply(1).name.parts.length,
			).toBeGreaterThan(1);
		});

		it("handles mixed qualified and unqualified references", () => {
			const visitor = QualifyReferences.apply(false);
			const targetInterface = createMockInterface("TargetInterface");
			const scope = createMockScope(targetInterface);

			// Create a class that implements both a qualified type and a primitive type
			const mixedClass = createMockClass(
				"MixedClass",
				undefined,
				IArray.apply(createTypeRef("TargetInterface"), createTypeRef("object")),
			);

			const result = visitor.enterTsDeclClass(scope)(mixedClass);

			expect(result.name.value).toBe("MixedClass");
			expect(result.implementsInterfaces.length).toBe(2);
			// First should be qualified (TargetInterface)
			expect(
				result.implementsInterfaces.apply(0).name.parts.length,
			).toBeGreaterThan(1);
			// Second should remain primitive (object)
			expect(result.implementsInterfaces.apply(1).name.parts.length).toBe(1);
			expect(
				result.implementsInterfaces.apply(1).name.parts.apply(0).value,
			).toBe("object");
		});

		it("preserves type arguments during qualification", () => {
			const visitor = QualifyReferences.apply(false);
			const genericInterface = createMockInterface("GenericInterface");
			const scope = createMockScope(genericInterface);

			// Create a type reference with type arguments
			const typeArgs = IArray.apply(
				createTypeRef("string") as TsType,
				createTypeRef("number") as TsType,
			);
			const genericRef = TsTypeRef.create(
				NoComments.instance,
				createQIdent("GenericInterface"),
				typeArgs,
			);

			const result = visitor.enterTsTypeRef(scope)(genericRef);

			expect(result._tag).toBe("TsTypeRef");
			expect(result.name.parts.length).toBeGreaterThan(1);
			expect(result.tparams.length).toBe(2); // Type arguments should be preserved
		});
	});
});
