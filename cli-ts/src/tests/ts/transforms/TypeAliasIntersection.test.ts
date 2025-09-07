/**
 * Tests for TypeAliasIntersection.ts - TypeScript port of org.scalablytyped.converter.internal.ts.transforms.TypeAliasIntersection
 */

import { describe, expect, it } from "vitest";
import { TypeAliasIntersection } from "../../../internal/ts/transforms/TypeAliasIntersection.js";
import { TsTreeScope } from "../../../internal/ts/TsTreeScope.js";
import {
	TsDeclInterface,
	TsDeclTypeAlias,
	TsIdentSimple,
	TsQIdent,
	TsTypeRef,
	TsTypeIntersect,
	TsTypeObject,
	TsTypeFunction,
	TsTypeUnion,
	TsTypeLiteral,
	TsFunSig,
	TsTypeParam,
	TsMemberProperty,
	TsProtectionLevel,
	type TsDecl,
	type TsType,
	type TsMember,
} from "../../../internal/ts/trees.js";
import { IArray } from "../../../internal/IArray.js";
import { Raw } from "../../../internal/Comment.js";
import { Comments, NoComments } from "../../../internal/Comments.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { TsParsedFile } from "../../../internal/ts/trees.js";
import { TsIdentLibrary } from "../../../internal/ts/trees.js";
import { Logger } from "../../../internal/logging/index.js";
import { Option } from "fp-ts/Option";
import { none, some } from "fp-ts/Option";

describe("TypeAliasIntersection", () => {
	// Helper functions for creating test data
	function createSimpleIdent(name: string): TsIdentSimple {
		return {
			_tag: "TsIdentSimple",
			value: name,
			asString: `TsIdentSimple(${name})`,
		};
	}

	function createQIdent(...parts: string[]): TsQIdent {
		return TsQIdent.ofStrings(...parts);
	}

	function createTypeRef(name: string, tparams: IArray<TsType> = IArray.Empty): TsTypeRef {
		return TsTypeRef.create(
			NoComments.instance,
			createQIdent(name),
			tparams
		);
	}

	function createIntersectionType(...types: TsType[]): TsTypeIntersect {
		return TsTypeIntersect.create(IArray.fromArray(types));
	}

	function createObjectType(members: IArray<TsMember> = IArray.Empty): TsTypeObject {
		return TsTypeObject.create(NoComments.instance, members);
	}

	function createFunctionType(sig: TsFunSig): TsTypeFunction {
		return TsTypeFunction.create(sig);
	}

	function createFunSig(
		params: IArray<any> = IArray.Empty,
		resultType: Option<TsType> = none
	): TsFunSig {
		return TsFunSig.create(
			NoComments.instance,
			IArray.Empty, // tparams
			params,
			resultType
		);
	}

	function createMockTypeAlias(
		name: string,
		alias: TsType,
		tparams: IArray<TsTypeParam> = IArray.Empty
	): TsDeclTypeAlias {
		return TsDeclTypeAlias.create(
			NoComments.instance,
			false, // declared
			createSimpleIdent(name),
			tparams,
			alias,
			CodePath.hasPath(
				createSimpleIdent("test-lib"),
				createQIdent(name)
			)
		);
	}

	function createMockInterface(
		name: string,
		inheritance: IArray<TsTypeRef> = IArray.Empty,
		members: IArray<TsMember> = IArray.Empty
	): TsDeclInterface {
		return TsDeclInterface.create(
			NoComments.instance,
			false, // declared
			createSimpleIdent(name),
			IArray.Empty, // tparams
			inheritance,
			members,
			CodePath.hasPath(
				createSimpleIdent("test-lib"),
				createQIdent(name)
			)
		);
	}

	function createMockScope(
		members: IArray<any> = IArray.Empty,
		logger: Logger<void> = Logger.DevNull()
	): TsTreeScope {
		const libName = TsIdentLibrary.construct("test-lib");
		const parsedFile = TsParsedFile.create(
			NoComments.instance,
			IArray.Empty, // directives
			members,
			CodePath.noPath()
		);
		const deps = new Map();
		return TsTreeScope.create(libName, false, deps, logger)["/"](parsedFile);
	}

	function createProperty(name: string, tpe: TsType): TsMemberProperty {
		return TsMemberProperty.create(
			NoComments.instance,
			TsProtectionLevel.default(),
			createSimpleIdent(name),
			some(tpe),
			none, // expr
			false, // isStatic
			false  // isReadOnly
		);
	}

	describe("Basic Functionality", () => {
		it("should create TypeAliasIntersection transformation", () => {
			const transform = new TypeAliasIntersection();
			expect(transform).toBeInstanceOf(TypeAliasIntersection);
		});

		it("should have singleton instance", () => {
			const instance1 = TypeAliasIntersection.instance;
			const instance2 = TypeAliasIntersection.instance;
			expect(instance1).toBe(instance2);
		});

		it("should have enterTsDecl method", () => {
			const scope = createMockScope();
			const typeAlias = createMockTypeAlias("TestAlias", createTypeRef("string"));
			const transform = new TypeAliasIntersection();
			const result = transform.enterTsDecl(scope)(typeAlias);
			expect(result).toBeDefined();
		});
	});

	describe("Type Alias Processing", () => {
		it("should preserve non-intersection type aliases", () => {
			const scope = createMockScope();
			const typeAlias = createMockTypeAlias("SimpleAlias", createTypeRef("string"));
			const transform = new TypeAliasIntersection();
			
			const result = transform.enterTsDecl(scope)(typeAlias);
			
			expect(result._tag).toBe("TsDeclTypeAlias");
			const resultAlias = result as TsDeclTypeAlias;
			expect(resultAlias.name.value).toBe("SimpleAlias");
			expect(resultAlias.alias._tag).toBe("TsTypeRef");
		});

		it("should preserve non-type-alias declarations", () => {
			const scope = createMockScope();
			const interface_ = createMockInterface("TestInterface");
			const transform = new TypeAliasIntersection();
			
			const result = transform.enterTsDecl(scope)(interface_);
			
			expect(result._tag).toBe("TsDeclInterface");
			expect((result as TsDeclInterface).name.value).toBe("TestInterface");
		});

		it("should convert intersection with type references to interface", () => {
			const scope = createMockScope();
			const intersectionType = createIntersectionType(
				createTypeRef("BaseInterface"),
				createTypeRef("MixinInterface")
			);
			const typeAlias = createMockTypeAlias("CombinedAlias", intersectionType);
			const transform = new TypeAliasIntersection();
			
			const result = transform.enterTsDecl(scope)(typeAlias);
			
			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("CombinedAlias");
			expect(resultInterface.inheritance.length).toBe(2);
			expect(resultInterface.inheritance.apply(0).name.parts.apply(0).value).toBe("BaseInterface");
			expect(resultInterface.inheritance.apply(1).name.parts.apply(0).value).toBe("MixinInterface");
		});

		it("should convert intersection with object types to interface", () => {
			const scope = createMockScope();
			const objectType1 = createObjectType();
			const objectType2 = createObjectType();
			const intersectionType = createIntersectionType(objectType1, objectType2);
			const typeAlias = createMockTypeAlias("ObjectAlias", intersectionType);
			const transform = new TypeAliasIntersection();
			
			const result = transform.enterTsDecl(scope)(typeAlias);
			
			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("ObjectAlias");
			expect(resultInterface.inheritance.length).toBe(0);
			expect(resultInterface.members.length).toBe(0); // Empty object types
		});

		it("should convert mixed intersection to interface", () => {
			const scope = createMockScope();
			const typeRef = createTypeRef("BaseInterface");
			const objectType = createObjectType();
			const intersectionType = createIntersectionType(typeRef, objectType);
			const typeAlias = createMockTypeAlias("MixedAlias", intersectionType);
			const transform = new TypeAliasIntersection();
			
			const result = transform.enterTsDecl(scope)(typeAlias);
			
			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("MixedAlias");
			expect(resultInterface.inheritance.length).toBe(1);
			expect(resultInterface.inheritance.apply(0).name.parts.apply(0).value).toBe("BaseInterface");
		});
	});

	describe("Legal Inheritance Filtering", () => {
		it("should preserve intersection with legal type references", () => {
			const scope = createMockScope();
			const intersectionType = createIntersectionType(
				createTypeRef("Interface1"),
				createTypeRef("Interface2"),
				createTypeRef("Interface3")
			);
			const typeAlias = createMockTypeAlias("LegalAlias", intersectionType);
			const transform = new TypeAliasIntersection();
			
			const result = transform.enterTsDecl(scope)(typeAlias);
			
			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.inheritance.length).toBe(3);
		});

		it("should preserve intersection with legal object types", () => {
			const scope = createMockScope();
			const objectType1 = createObjectType();
			const objectType2 = createObjectType();
			const intersectionType = createIntersectionType(objectType1, objectType2);
			const typeAlias = createMockTypeAlias("ObjectAlias", intersectionType);
			const transform = new TypeAliasIntersection();
			
			const result = transform.enterTsDecl(scope)(typeAlias);
			
			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("ObjectAlias");
		});

		it("should preserve type alias with illegal inheritance types", () => {
			const scope = createMockScope();
			const unionType = TsTypeUnion.create(IArray.fromArray([
				createTypeRef("Type1") as TsType,
				createTypeRef("Type2") as TsType
			]));
			const intersectionType = createIntersectionType(unionType, createTypeRef("Interface"));
			const typeAlias = createMockTypeAlias("IllegalAlias", intersectionType);
			const transform = new TypeAliasIntersection();
			
			const result = transform.enterTsDecl(scope)(typeAlias);
			
			// Should preserve as type alias since union type is not legal inheritance
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("IllegalAlias");
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty intersection", () => {
			const scope = createMockScope();
			const emptyIntersection = createIntersectionType();
			const typeAlias = createMockTypeAlias("EmptyAlias", emptyIntersection);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Empty intersection gets converted to interface with no inheritance
			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("EmptyAlias");
			expect(resultInterface.inheritance.length).toBe(0);
		});

		it("should handle single type intersection", () => {
			const scope = createMockScope();
			const singleIntersection = createIntersectionType(createTypeRef("SingleInterface"));
			const typeAlias = createMockTypeAlias("SingleAlias", singleIntersection);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("SingleAlias");
			expect(resultInterface.inheritance.length).toBe(1);
			expect(resultInterface.inheritance.apply(0).name.parts.apply(0).value).toBe("SingleInterface");
		});

		it("should preserve type parameters", () => {
			const scope = createMockScope();
			const tparam = TsTypeParam.create(
				NoComments.instance,
				createSimpleIdent("T"),
				none, // upperBound
				none  // default
			);
			const intersectionType = createIntersectionType(
				createTypeRef("Interface1"),
				createTypeRef("Interface2")
			);
			const typeAlias = createMockTypeAlias("GenericAlias", intersectionType, IArray.apply(tparam));
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("GenericAlias");
			expect(resultInterface.tparams.length).toBe(1);
			expect(resultInterface.tparams.apply(0).name.value).toBe("T");
		});

		it("should preserve comments and metadata", () => {
			const scope = createMockScope();
			const comment = new Raw("Test comment");
			const comments = new Comments([comment]);
			const intersectionType = createIntersectionType(createTypeRef("Interface1"));
			const transform = new TypeAliasIntersection();

			const typeAlias = TsDeclTypeAlias.create(
				comments,
				true, // declared
				createSimpleIdent("CommentedAlias"),
				IArray.Empty,
				intersectionType,
				CodePath.hasPath(createSimpleIdent("test-lib"), createQIdent("CommentedAlias"))
			);

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.comments).toBe(comments);
			expect(resultInterface.declared).toBe(true);
			expect(resultInterface.name.value).toBe("CommentedAlias");
		});
	});

	describe("Complex Scenarios", () => {
		it("should handle large intersection types", () => {
			const scope = createMockScope();
			const types = Array.from({ length: 10 }, (_, i) => createTypeRef(`Interface${i + 1}`));
			const largeIntersection = createIntersectionType(...types);
			const typeAlias = createMockTypeAlias("LargeAlias", largeIntersection);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("LargeAlias");
			expect(resultInterface.inheritance.length).toBe(10);
		});

		it("should handle intersection with generic type references", () => {
			const scope = createMockScope();
			const genericType = createTypeRef("Generic", IArray.apply(createTypeRef("string") as TsType));
			const intersectionType = createIntersectionType(genericType, createTypeRef("Interface"));
			const typeAlias = createMockTypeAlias("GenericAlias", intersectionType);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.inheritance.length).toBe(2);
		});

		it("should handle intersection with object type containing members", () => {
			const scope = createMockScope();
			const property = createProperty("prop", createTypeRef("string"));
			const objectType = createObjectType(IArray.apply(property as TsMember));
			const intersectionType = createIntersectionType(createTypeRef("Interface"), objectType);
			const typeAlias = createMockTypeAlias("ObjectWithMembersAlias", intersectionType);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.inheritance.length).toBe(1);
			expect(resultInterface.members.length).toBe(1);
			expect((resultInterface.members.apply(0) as TsMemberProperty).name.value).toBe("prop");
		});
	});

	describe("Integration Scenarios", () => {
		it("should handle mixin pattern", () => {
			const scope = createMockScope();
			// Simulate: type Mixin = BaseClass & MixinA & MixinB
			const mixinIntersection = createIntersectionType(
				createTypeRef("BaseClass"),
				createTypeRef("MixinA"),
				createTypeRef("MixinB")
			);
			const typeAlias = createMockTypeAlias("Mixin", mixinIntersection);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("Mixin");
			expect(resultInterface.inheritance.length).toBe(3);
		});

		it("should handle utility type pattern", () => {
			const scope = createMockScope();
			// Simulate: type Extended = BaseInterface & { additionalProp: string }
			const additionalProp = createProperty("additionalProp", createTypeRef("string"));
			const extensionObject = createObjectType(IArray.apply(additionalProp as TsMember));
			const utilityIntersection = createIntersectionType(createTypeRef("BaseInterface"), extensionObject);
			const typeAlias = createMockTypeAlias("Extended", utilityIntersection);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("Extended");
			expect(resultInterface.inheritance.length).toBe(1);
			expect(resultInterface.members.length).toBe(1);
			expect((resultInterface.members.apply(0) as TsMemberProperty).name.value).toBe("additionalProp");
		});

		it("should handle library augmentation pattern", () => {
			const scope = createMockScope();
			// Simulate: type AugmentedLib = OriginalLib & Extensions
			const augmentationIntersection = createIntersectionType(
				createTypeRef("OriginalLib"),
				createTypeRef("Extensions")
			);
			const typeAlias = createMockTypeAlias("AugmentedLib", augmentationIntersection);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("AugmentedLib");
			expect(resultInterface.inheritance.length).toBe(2);
		});
	});

	describe("Error Handling", () => {
		it("should handle malformed intersection types gracefully", () => {
			const scope = createMockScope();
			const malformedIntersection = TsTypeIntersect.create(IArray.Empty); // Empty intersection
			const typeAlias = createMockTypeAlias("MalformedAlias", malformedIntersection);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Empty intersection gets converted to interface with no inheritance
			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("MalformedAlias");
			expect(resultInterface.inheritance.length).toBe(0);
		});

		it("should handle unknown type references", () => {
			const scope = createMockScope();
			const unknownRef = createTypeRef("UnknownInterface");
			const intersectionType = createIntersectionType(unknownRef, createTypeRef("KnownInterface"));
			const typeAlias = createMockTypeAlias("UnknownAlias", intersectionType);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.inheritance.length).toBe(2);
		});

		it("should handle mixed legal and illegal types", () => {
			const scope = createMockScope();
			const literalType = TsTypeLiteral.string("literal");
			const intersectionType = createIntersectionType(
				createTypeRef("LegalInterface"),
				literalType // Illegal inheritance type
			);
			const typeAlias = createMockTypeAlias("MixedAlias", intersectionType);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Should preserve as type alias since literal type is not legal inheritance
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("MixedAlias");
		});
	});

	describe("Performance", () => {
		it("should handle very large intersection types efficiently", () => {
			const scope = createMockScope();
			const types = Array.from({ length: 100 }, (_, i) => createTypeRef(`Interface${i + 1}`));
			const massiveIntersection = createIntersectionType(...types);
			const typeAlias = createMockTypeAlias("MassiveAlias", massiveIntersection);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.name.value).toBe("MassiveAlias");
			expect(resultInterface.inheritance.length).toBe(100);
		});

		it("should handle deeply nested object types", () => {
			const scope = createMockScope();
			const deepProperty = createProperty("deepProp", createObjectType());
			const deepObjectType = createObjectType(IArray.apply(deepProperty as TsMember));
			const intersectionType = createIntersectionType(createTypeRef("Interface"), deepObjectType);
			const typeAlias = createMockTypeAlias("DeepAlias", intersectionType);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.members.length).toBe(1);
		});
	});

	describe("Legal Inheritance Detection", () => {
		it("should detect function types as preventing conversion", () => {
			const scope = createMockScope();
			const functionType = createFunctionType(createFunSig());
			const intersectionType = createIntersectionType(createTypeRef("Interface"), functionType);
			const typeAlias = createMockTypeAlias("FunctionAlias", intersectionType);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Function types are not handled by partitionCollect2, so they prevent conversion
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("FunctionAlias");
		});

		it("should detect union types as illegal inheritance", () => {
			const scope = createMockScope();
			const unionType = TsTypeUnion.create(IArray.fromArray([
				createTypeRef("Type1") as TsType,
				createTypeRef("Type2") as TsType
			]));
			const intersectionType = createIntersectionType(unionType, createTypeRef("Interface"));
			const typeAlias = createMockTypeAlias("UnionAlias", intersectionType);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Should preserve as type alias since union type is not legal inheritance
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("UnionAlias");
		});

		it("should detect literal types as illegal inheritance", () => {
			const scope = createMockScope();
			const literalType = TsTypeLiteral.string("literal");
			const intersectionType = createIntersectionType(literalType, createTypeRef("Interface"));
			const typeAlias = createMockTypeAlias("LiteralAlias", intersectionType);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			// Should preserve as type alias since literal type is not legal inheritance
			expect(result._tag).toBe("TsDeclTypeAlias");
			expect((result as TsDeclTypeAlias).name.value).toBe("LiteralAlias");
		});
	});

	describe("Member Flattening", () => {
		it("should flatten members from multiple object types", () => {
			const scope = createMockScope();
			const prop1 = createProperty("prop1", createTypeRef("string"));
			const prop2 = createProperty("prop2", createTypeRef("number"));
			const objectType1 = createObjectType(IArray.apply(prop1 as TsMember));
			const objectType2 = createObjectType(IArray.apply(prop2 as TsMember));
			const intersectionType = createIntersectionType(objectType1, objectType2);
			const typeAlias = createMockTypeAlias("FlattenedAlias", intersectionType);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.members.length).toBe(2);
			expect((resultInterface.members.apply(0) as TsMemberProperty).name.value).toBe("prop1");
			expect((resultInterface.members.apply(1) as TsMemberProperty).name.value).toBe("prop2");
		});

		it("should combine inheritance and object members", () => {
			const scope = createMockScope();
			const prop = createProperty("additionalProp", createTypeRef("boolean"));
			const objectType = createObjectType(IArray.apply(prop as TsMember));
			const intersectionType = createIntersectionType(
				createTypeRef("BaseInterface"),
				objectType,
				createTypeRef("MixinInterface")
			);
			const typeAlias = createMockTypeAlias("CombinedAlias", intersectionType);
			const transform = new TypeAliasIntersection();

			const result = transform.enterTsDecl(scope)(typeAlias);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.inheritance.length).toBe(2);
			expect(resultInterface.members.length).toBe(1);
			expect((resultInterface.members.apply(0) as TsMemberProperty).name.value).toBe("additionalProp");
		});
	});
});
