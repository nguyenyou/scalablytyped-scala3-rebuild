/**
 * Tests for MoveStatics.ts - TypeScript port of MoveStaticsTests.scala
 */

import { describe, expect, it } from "vitest";
import { none, some } from "fp-ts/Option";
import { Comment, Raw } from "../../../internal/Comment.js";
import { Comments, NoComments } from "../../../internal/Comments.js";
import { IArray } from "../../../internal/IArray.js";
import { Logger } from "../../../internal/logging/index.js";
import { CodePath } from "../../../internal/ts/CodePath.js";
import { JsLocation } from "../../../internal/ts/JsLocation.js";
import { MethodType } from "../../../internal/ts/MethodType.js";
import { MoveStatics } from "../../../internal/ts/transforms/MoveStatics.js";
import { TsProtectionLevel } from "../../../internal/ts/TsProtectionLevel.js";
import { TsTreeScope } from "../../../internal/ts/TsTreeScope.js";
import {
	TsDeclClass,
	TsDeclInterface,
	TsDeclNamespace,
	TsFunSig,
	TsIdent,
	TsMemberFunction,
	TsMemberProperty,
	TsParsedFile,
	TsQIdent,
	TsTypeRef,
	type TsIdentSimple,
	type TsMember,
} from "../../../internal/ts/trees.js";

// Helper methods for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

function createQIdent(...parts: string[]): TsQIdent {
	return TsQIdent.of(...parts.map(createSimpleIdent));
}

function createTypeRef(name: string, tparams: IArray<any> = IArray.Empty): TsTypeRef {
	return TsTypeRef.create(NoComments.instance, createQIdent(name), tparams);
}

function createMockInterface(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	declared: boolean = false
): TsDeclInterface {
	return TsDeclInterface.create(
		NoComments.instance,
		declared,
		createSimpleIdent(name),
		IArray.Empty, // tparams
		IArray.Empty, // inheritance
		members,
		CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent(name))
	);
}

function createMockClass(
	name: string,
	members: IArray<TsMember> = IArray.Empty,
	declared: boolean = false
): TsDeclClass {
	return TsDeclClass.create(
		NoComments.instance,
		declared,
		false, // isAbstract
		createSimpleIdent(name),
		IArray.Empty, // tparams
		none, // parent
		IArray.Empty, // implements
		members,
		JsLocation.zero(),
		CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent(name))
	);
}

function createMockScope(...declarations: any[]): TsTreeScope {
	const libName = TsIdent.librarySimple("test-lib");
	const parsedFile = TsParsedFile.create(
		NoComments.instance,
		IArray.Empty, // directives
		IArray.fromArray(declarations),
		CodePath.noPath()
	);
	const deps = new Map();
	const logger = Logger.DevNull();

	const root = TsTreeScope.create(libName, false, deps, logger);
	return root["/"](parsedFile);
}

function createStaticProperty(name: string): TsMemberProperty {
	return TsMemberProperty.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		some(createTypeRef("string")),
		none, // expr
		true, // isStatic
		false // isReadOnly
	);
}

function createNonStaticProperty(name: string): TsMemberProperty {
	return TsMemberProperty.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		some(createTypeRef("string")),
		none, // expr
		false, // isStatic
		false // isReadOnly
	);
}

function createStaticFunction(name: string): TsMemberFunction {
	return TsMemberFunction.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		MethodType.normal(),
		TsFunSig.create(
			NoComments.instance,
			IArray.Empty, // tparams
			IArray.Empty, // params
			some(createTypeRef("void"))
		),
		true, // isStatic
		false // isReadOnly
	);
}

function createNonStaticFunction(name: string): TsMemberFunction {
	return TsMemberFunction.create(
		NoComments.instance,
		TsProtectionLevel.default(),
		createSimpleIdent(name),
		MethodType.normal(),
		TsFunSig.create(
			NoComments.instance,
			IArray.Empty, // tparams
			IArray.Empty, // params
			some(createTypeRef("void"))
		),
		false, // isStatic
		false // isReadOnly
	);
}

describe("MoveStatics", () => {
	describe("Basic Functionality", () => {
		it("extends TransformMembers", () => {
			expect(MoveStatics.instance).toBeInstanceOf(MoveStatics);
		});

		it("has newMembers method", () => {
			const scope = createMockScope();
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.Empty,
				CodePath.noPath()
			);
			const result = MoveStatics.instance.newMembers(scope, parsedFile);
			expect(result).toBeDefined();
			expect(result).toBeInstanceOf(IArray);
		});

		it("has extractStatics method", () => {
			const staticProp = createStaticProperty("staticProp");
			const nonStaticProp = createNonStaticProperty("nonStaticProp");
			const members = IArray.fromArray<TsMember>([staticProp, nonStaticProp]);
			const comment = new Raw("test comment");

			const [statics, nonStatics] = MoveStatics.extractStatics(members, comment);

			expect(statics.length).toBe(1);
			expect(nonStatics.length).toBe(1);
			expect((statics.apply(0) as TsMemberProperty).name.value).toBe("staticProp");
			expect((nonStatics.apply(0) as TsMemberProperty).name.value).toBe("nonStaticProp");
		});
	});

	describe("Interface Processing", () => {
		it("leaves interface without static members unchanged", () => {
			const scope = createMockScope();
			const nonStaticProp = createNonStaticProperty("instanceProp");
			const nonStaticFunc = createNonStaticFunction("instanceMethod");
			const interface_ = createMockInterface("TestInterface", IArray.fromArray([nonStaticProp as TsMember, nonStaticFunc as TsMember]));
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(interface_ as any),
				CodePath.noPath()
			);

			const result = MoveStatics.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(interface_);
		});

		it("extracts static members from interface into namespace", () => {
			const scope = createMockScope();
			const staticProp = createStaticProperty("staticProp");
			const staticFunc = createStaticFunction("staticMethod");
			const nonStaticProp = createNonStaticProperty("instanceProp");
			const interface_ = createMockInterface("TestInterface", IArray.fromArray([staticProp as TsMember, staticFunc as TsMember, nonStaticProp as TsMember]));
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(interface_ as any),
				CodePath.noPath()
			);

			const result = MoveStatics.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(2);

			// First should be the modified interface
			const modifiedInterface = result.apply(0) as TsDeclInterface;
			expect(modifiedInterface._tag).toBe("TsDeclInterface");
			expect(modifiedInterface.name.value).toBe("TestInterface");
			expect(modifiedInterface.members.length).toBe(1);
			expect((modifiedInterface.members.apply(0) as TsMemberProperty).name.value).toBe("instanceProp");

			// Check that the interface has the warning comment
			const hasWarningComment = modifiedInterface.comments.cs.some(comment => {
				if (comment instanceof Raw) {
					return comment.raw.includes("Note: this doesnt actually exist!");
				}
				return false;
			});
			expect(hasWarningComment).toBe(true);

			// Second should be the namespace with static members
			const namespace = result.apply(1) as TsDeclNamespace;
			expect(namespace._tag).toBe("TsDeclNamespace");
			expect(namespace.name.value).toBe("TestInterface");
			expect(namespace.members.length).toBe(2);
		});

		it("preserves interface metadata when extracting statics", () => {
			const scope = createMockScope();
			const originalComments = Comments.apply([new Raw("Original interface comment")]);
			const staticProp = createStaticProperty("staticProp");
			const interface_ = TsDeclInterface.create(
				originalComments,
				true, // declared
				createSimpleIdent("TestInterface"),
				IArray.Empty, // tparams
				IArray.Empty, // inheritance
				IArray.apply(staticProp as TsMember),
				CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent("TestInterface"))
			);
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(interface_ as any),
				CodePath.noPath()
			);

			const result = MoveStatics.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(2);
			const modifiedInterface = result.apply(0) as TsDeclInterface;
			expect(modifiedInterface.declared).toBe(true);
			expect(modifiedInterface.comments.cs.length).toBe(2); // Original + added comment
		});
	});

	describe("Class Processing", () => {
		it("leaves class without static members unchanged", () => {
			const scope = createMockScope();
			const nonStaticProp = createNonStaticProperty("instanceProp");
			const nonStaticFunc = createNonStaticFunction("instanceMethod");
			const clazz = createMockClass("TestClass", IArray.fromArray([nonStaticProp as TsMember, nonStaticFunc as TsMember]));
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(clazz as any),
				CodePath.noPath()
			);

			const result = MoveStatics.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(1);
			expect(result.apply(0)).toBe(clazz);
		});

		it("extracts static members from class into namespace", () => {
			const scope = createMockScope();
			const staticProp = createStaticProperty("staticProp");
			const staticFunc = createStaticFunction("staticMethod");
			const nonStaticProp = createNonStaticProperty("instanceProp");
			const clazz = createMockClass("TestClass", IArray.fromArray([staticProp as TsMember, staticFunc as TsMember, nonStaticProp as TsMember]));
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(clazz as any),
				CodePath.noPath()
			);

			const result = MoveStatics.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(2);

			// First should be the modified class
			const modifiedClass = result.apply(0) as TsDeclClass;
			expect(modifiedClass._tag).toBe("TsDeclClass");
			expect(modifiedClass.name.value).toBe("TestClass");
			expect(modifiedClass.members.length).toBe(1);
			expect((modifiedClass.members.apply(0) as TsMemberProperty).name.value).toBe("instanceProp");

			// Second should be the namespace with static members
			const namespace = result.apply(1) as TsDeclNamespace;
			expect(namespace._tag).toBe("TsDeclNamespace");
			expect(namespace.name.value).toBe("TestClass");
			expect(namespace.members.length).toBe(2);
		});

		it("preserves class metadata when extracting statics", () => {
			const scope = createMockScope();
			const originalComments = Comments.apply([new Raw("Original class comment")]);
			const staticProp = createStaticProperty("staticProp");
			const clazz = TsDeclClass.create(
				originalComments,
				true, // declared
				true, // isAbstract
				createSimpleIdent("TestClass"),
				IArray.Empty, // tparams
				some(createTypeRef("BaseClass")), // parent
				IArray.apply(createTypeRef("Interface1")), // implements
				IArray.apply(staticProp as TsMember),
				JsLocation.zero(),
				CodePath.hasPath(TsIdent.librarySimple("test-lib"), createQIdent("TestClass"))
			);
			const parsedFile = TsParsedFile.create(
				NoComments.instance,
				IArray.Empty,
				IArray.apply(clazz as any),
				CodePath.noPath()
			);

			const result = MoveStatics.instance.newMembers(scope, parsedFile);

			expect(result.length).toBe(2);
			const modifiedClass = result.apply(0) as TsDeclClass;
			expect(modifiedClass.declared).toBe(true);
			expect(modifiedClass.isAbstract).toBe(true);
			expect(modifiedClass.parent._tag).toBe("Some");
			expect(modifiedClass.implementsInterfaces.length).toBe(1);
			expect(modifiedClass.comments).toBe(originalComments); // Class comments unchanged
		});
	});
});
