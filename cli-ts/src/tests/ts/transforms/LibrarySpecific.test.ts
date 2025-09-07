/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.LibrarySpecificTests
 *
 * Tests for library-specific transformations to ensure exact behavioral parity
 * with the original Scala implementation.
 */

import { describe, expect, test } from "vitest";
import { none, some } from "fp-ts/Option";
import { Comments } from "@/internal/Comments.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { Directive } from "@/internal/ts/Directive.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { MethodType } from "@/internal/ts/MethodType.js";
import { TsProtectionLevel } from "@/internal/ts/TsProtectionLevel.js";
import { TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import { LibrarySpecific, Named } from "@/internal/ts/transforms/LibrarySpecific.js";
import type {
	TsContainerOrDecl,
	TsDeclInterface,
	TsDeclModule,
	TsDeclTypeAlias,
	TsIdentModule,
	TsIdentSimple,
	TsMember,
	TsMemberFunction,
	TsMemberProperty,
	TsParsedFile,
	TsQIdent,
	TsType,
	TsTypeIntersect,
	TsTypeRef,
	TsTypeUnion,
} from "@/internal/ts/trees.js";
import {
	TsIdent,
	TsIdentLibrary,
	TsQIdent as TsQIdentConstructor,
	TsTypeRef as TsTypeRefConstructor,
	TsTypeUnion as TsTypeUnionConstructor,
	TsDeclInterface as TsDeclInterfaceConstructor,
	TsDeclTypeAlias as TsDeclTypeAliasConstructor,
	TsDeclModule as TsDeclModuleConstructor,
	TsMemberProperty as TsMemberPropertyConstructor,
	TsMemberFunction as TsMemberFunctionConstructor,
	TsParsedFile as TsParsedFileConstructor,
	TsTypeParam as TsTypeParamConstructor,
	TsFunSig,
	TsFunParam,
} from "@/internal/ts/trees.js";

// Helper methods for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]): TsQIdent {
	return TsQIdentConstructor.ofStrings(...parts);
}

function createTypeRef(name: string, tparams: IArray<TsType> = IArray.Empty): TsTypeRef {
	return TsTypeRefConstructor.create(Comments.empty(), createQIdent(name), tparams);
}

function createMockInterface(
	name: string,
	inheritance: IArray<TsTypeRef> = IArray.Empty,
	members: IArray<TsMember> = IArray.Empty
): TsDeclInterface {
	return TsDeclInterfaceConstructor.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		IArray.Empty, // tparams
		inheritance,
		members,
		CodePath.hasPath(TsIdentLibrary.construct("test-lib"), createQIdent(name))
	);
}

function createMockTypeAlias(
	name: string,
	alias: TsType,
	tparams: IArray<any> = IArray.Empty
): TsDeclTypeAlias {
	return TsDeclTypeAliasConstructor.create(
		Comments.empty(),
		false, // declared
		createSimpleIdent(name),
		tparams,
		alias,
		CodePath.hasPath(TsIdentLibrary.construct("test-lib"), createQIdent(name))
	);
}

function createMockModule(
	name: TsIdentModule,
	members: IArray<TsContainerOrDecl> = IArray.Empty
): TsDeclModule {
	return TsDeclModuleConstructor.create(
		Comments.empty(),
		false, // declared
		name,
		members,
		CodePath.hasPath(TsIdentLibrary.construct("test-lib"), createQIdent(name.value)),
		JsLocation.zero()
	);
}

function createMockScope(...declarations: any[]): TsTreeScope {
	const parsedFile = TsParsedFileConstructor.create(
		Comments.empty(),
		IArray.Empty as IArray<Directive>,
		IArray.fromArray(declarations),
		CodePath.noPath()
	);

	const root = TsTreeScope.create(
		TsIdentLibrary.construct("test-lib"),
		false, // pedantic
		new Map(), // deps
		Logger.DevNull()
	);

	return root["/"](parsedFile);
}

function createMemberProperty(name: string): TsMemberProperty {
	return TsMemberPropertyConstructor.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		some(TsTypeRefConstructor.string),
		none,
		false, // isStatic
		false  // isReadOnly
	);
}

function createMemberFunction(name: string): TsMemberFunction {
	const signature = TsFunSig.simple(IArray.Empty, none);
	return TsMemberFunctionConstructor.create(
		Comments.empty(),
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		MethodType.normal(),
		signature,
		false, // isStatic
		false  // isReadOnly
	);
}

describe("LibrarySpecific", () => {
	describe("Basic Functionality", () => {
		test("has Named trait", () => {
			const transform = LibrarySpecific.std;
			expect(transform.libName).toBeDefined();
			expect(transform.libName.value).toBe("std");
		});

		test("apply method returns correct transforms", () => {
			const stdTransform = LibrarySpecific.apply(TsIdentLibrary.construct("std"));
			const reactTransform = LibrarySpecific.apply(TsIdentLibrary.construct("react"));
			const unknownTransform = LibrarySpecific.apply(TsIdentLibrary.construct("unknown-lib"));
			
			expect(stdTransform).toBeDefined();
			expect(reactTransform).toBeDefined();
			expect(unknownTransform).toBeUndefined();
		});

		test("apply method returns undefined for unknown libraries", () => {
			const result = LibrarySpecific.apply(TsIdentLibrary.construct("non-existent-library"));
			expect(result).toBeUndefined();
		});
	});

	describe("LibrarySpecific.std - Standard Library Patches", () => {
		test("has correct library name", () => {
			expect(LibrarySpecific.std.libName.value).toBe("std");
		});

		test("removes inheritance from HTMLCollectionOf interface", () => {
			const scope = createMockScope();
			const htmlCollectionInterface = createMockInterface(
				"HTMLCollectionOf",
				IArray.fromArray([createTypeRef("SomeParent")])
			);
			
			const result = LibrarySpecific.std.enterTsDecl(scope)(htmlCollectionInterface);
			
			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.inheritance.length).toBe(0);
		});

		test("leaves other interfaces unchanged", () => {
			const scope = createMockScope();
			const regularInterface = createMockInterface(
				"RegularInterface",
				IArray.fromArray([createTypeRef("SomeParent")])
			);
			
			const result = LibrarySpecific.std.enterTsDecl(scope)(regularInterface);
			
			expect(result).toBe(regularInterface);
		});

		test("leaves non-interface declarations unchanged", () => {
			const scope = createMockScope();
			const typeAlias = createMockTypeAlias("TestAlias", createTypeRef("string"));
			
			const result = LibrarySpecific.std.enterTsDecl(scope)(typeAlias);
			
			expect(result).toBe(typeAlias);
		});
	});

	describe("LibrarySpecific.react - React Library Patches", () => {
		test("has correct library name", () => {
			expect(LibrarySpecific.react.libName.value).toBe("react");
		});

		test("adds hack property to CSSProperties interface", () => {
			const scope = createMockScope();
			const cssPropsInterface = createMockInterface("CSSProperties");

			const result = LibrarySpecific.react.enterTsDeclInterface(scope)(cssPropsInterface);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.members.length).toBe(1);

			const hackMember = resultInterface.members.head;
			expect(hackMember._tag).toBe("TsMemberProperty");
			const hackProperty = hackMember as TsMemberProperty;
			expect(hackProperty.name.value).toBe("hack");
		});

		test("drops type parameters from ReactElement interface", () => {
			const scope = createMockScope();
			const typeParam = TsTypeParamConstructor.simple(createSimpleIdent("T"));

			const reactElementInterface = createMockInterface(
				"ReactElement",
				IArray.Empty,
				IArray.Empty
			);
			const interfaceWithTypeParams = {
				...reactElementInterface,
				tparams: IArray.fromArray([typeParam])
			} as TsDeclInterface;

			const result = LibrarySpecific.react.enterTsDeclInterface(scope)(interfaceWithTypeParams);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.tparams.length).toBe(0);
		});

		test("filters out *Capture props from DOMAttributes interface", () => {
			const scope = createMockScope();
			const regularProp = createMemberProperty("onClick");
			const captureProp = createMemberProperty("onClickCapture");
			const regularFunc = createMemberFunction("onFocus");
			const captureFunc = createMemberFunction("onFocusCapture");

			const domAttributesInterface = createMockInterface(
				"DOMAttributes",
				IArray.Empty,
				IArray.fromArray([regularProp, captureProp, regularFunc, captureFunc] as TsMember[])
			);

			const result = LibrarySpecific.react.enterTsDeclInterface(scope)(domAttributesInterface);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.members.length).toBe(2);

			const memberNames = resultInterface.members.toArray().map(m => {
				if (m._tag === "TsMemberProperty") return (m as TsMemberProperty).name.value;
				if (m._tag === "TsMemberFunction") return (m as TsMemberFunction).name.value;
				return "";
			});

			expect(memberNames).toContain("onClick");
			expect(memberNames).toContain("onFocus");
			expect(memberNames).not.toContain("onClickCapture");
			expect(memberNames).not.toContain("onFocusCapture");
		});

		test("leaves other interfaces unchanged", () => {
			const scope = createMockScope();
			const regularInterface = createMockInterface("RegularInterface");

			const result = LibrarySpecific.react.enterTsDeclInterface(scope)(regularInterface);

			expect(result).toBe(regularInterface);
		});

		test("filters object type from ReactFragment type alias", () => {
			const scope = createMockScope();
			const objectType = TsTypeRefConstructor.object;
			const stringType = TsTypeRefConstructor.string;
			const unionType = TsTypeUnionConstructor.create(IArray.fromArray([objectType, stringType] as TsType[]));

			const reactFragmentAlias = createMockTypeAlias("ReactFragment", unionType);

			const result = LibrarySpecific.react.enterTsDeclTypeAlias(scope)(reactFragmentAlias);

			expect(result._tag).toBe("TsDeclTypeAlias");
			const resultAlias = result as TsDeclTypeAlias;
			// When simplified to a single type, it becomes just that type, not a union
			expect(resultAlias.alias._tag).toBe("TsTypeRef");
			expect(resultAlias.alias).toBe(stringType);
		});

		test("filters null type from ReactNode type alias", () => {
			const scope = createMockScope();
			const nullType = TsTypeRefConstructor.null;
			const stringType = TsTypeRefConstructor.string;
			const unionType = TsTypeUnionConstructor.create(IArray.fromArray([nullType, stringType] as TsType[]));

			const reactNodeAlias = createMockTypeAlias("ReactNode", unionType);

			const result = LibrarySpecific.react.enterTsDeclTypeAlias(scope)(reactNodeAlias);

			expect(result._tag).toBe("TsDeclTypeAlias");
			const resultAlias = result as TsDeclTypeAlias;
			// When simplified to a single type, it becomes just that type, not a union
			expect(resultAlias.alias._tag).toBe("TsTypeRef");
			expect(resultAlias.alias).toBe(stringType);
		});

		test("leaves other type aliases unchanged", () => {
			const scope = createMockScope();
			const regularAlias = createMockTypeAlias("RegularAlias", TsTypeRefConstructor.string);

			const result = LibrarySpecific.react.enterTsDeclTypeAlias(scope)(regularAlias);

			expect(result).toBe(regularAlias);
		});
	});

	describe("LibrarySpecific.apply - Other Libraries", () => {
		test("styled-components transform is available", () => {
			const transform = LibrarySpecific.apply(TsIdentLibrary.construct("styled-components"));
			expect(transform).toBeDefined();
			expect((transform as Named)?.libName?.value).toBe("styled-components");
		});

		test("amap-js-api transform is available", () => {
			const transform = LibrarySpecific.apply(TsIdentLibrary.construct("amap-js-api"));
			expect(transform).toBeDefined();
			expect((transform as Named)?.libName?.value).toBe("amap-js-api");
		});

		test("semantic-ui-react transform is available", () => {
			const transform = LibrarySpecific.apply(TsIdentLibrary.construct("semantic-ui-react"));
			expect(transform).toBeDefined();
			expect((transform as Named)?.libName?.value).toBe("semantic-ui-react");
		});
	});

	describe("LibrarySpecific.apply - AMap Library Patches", () => {
		test("transforms Merge type alias to intersection", () => {
			const transform = LibrarySpecific.apply(TsIdentLibrary.construct("amap-js-api"));
			expect(transform).toBeDefined();

			const scope = createMockScope();
			const typeParam1 = TsTypeParamConstructor.simple(createSimpleIdent("T"));
			const typeParam2 = TsTypeParamConstructor.simple(createSimpleIdent("U"));

			const mergeAlias = createMockTypeAlias(
				"Merge",
				TsTypeRefConstructor.string, // dummy alias, will be replaced
				IArray.fromArray([typeParam1, typeParam2])
			);

			const result = transform!.enterTsDeclTypeAlias!(scope)(mergeAlias);

			expect(result._tag).toBe("TsDeclTypeAlias");
			const resultAlias = result as TsDeclTypeAlias;
			expect(resultAlias.alias._tag).toBe("TsTypeIntersect");
		});

		test("leaves other type aliases unchanged", () => {
			const transform = LibrarySpecific.apply(TsIdentLibrary.construct("amap-js-api"));
			expect(transform).toBeDefined();

			const scope = createMockScope();
			const regularAlias = createMockTypeAlias("RegularAlias", TsTypeRefConstructor.string);

			const result = transform!.enterTsDeclTypeAlias!(scope)(regularAlias);

			expect(result).toBe(regularAlias);
		});
	});

	describe("LibrarySpecific.apply - Semantic UI React Library Patches", () => {
		test("removes index signatures from specific interfaces", () => {
			const transform = LibrarySpecific.apply(TsIdentLibrary.construct("semantic-ui-react"));
			expect(transform).toBeDefined();

			const scope = createMockScope();
			const indexMember = {
				_tag: "TsMemberIndex" as const,
				comments: Comments.empty(),
				level: TsProtectionLevel.default(),
				indexing: {
					_tag: "IndexingDict" as const,
					name: createSimpleIdent("key"),
					tpe: TsTypeRefConstructor.string,
					asString: "IndexingDict(key: string)"
				},
				valueType: TsTypeRefConstructor.any,
				isReadOnly: false,
				withComments: (cs: Comments) => ({ ...indexMember, comments: cs }),
				addComment: (c: any) => ({ ...indexMember, comments: indexMember.comments.add(c) }),
				asString: "TsMemberIndex([key: string]: any)"
			};

			const regularProp = createMemberProperty("regularProp");

			const inputPropsInterface = createMockInterface(
				"InputProps",
				IArray.Empty,
				IArray.fromArray([indexMember, regularProp] as TsMember[])
			);

			const result = transform!.enterTsDeclInterface!(scope)(inputPropsInterface);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as TsDeclInterface;
			expect(resultInterface.members.length).toBe(1);
			expect(resultInterface.members.head._tag).toBe("TsMemberProperty");
		});

		test("leaves other interfaces unchanged", () => {
			const transform = LibrarySpecific.apply(TsIdentLibrary.construct("semantic-ui-react"));
			expect(transform).toBeDefined();

			const scope = createMockScope();
			const regularInterface = createMockInterface("RegularInterface");

			const result = transform!.enterTsDeclInterface!(scope)(regularInterface);

			expect(result).toBe(regularInterface);
		});
	});
});
