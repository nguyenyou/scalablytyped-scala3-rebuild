/**
 * Tests for Comment.ts - TypeScript port of org.scalablytyped.converter.internal.Comment
 */

import * as O from "fp-ts/Option";
import { describe, expect, it } from "bun:test";
import {
	BooleanLit,
	Comment,
	CommentDecoder,
	CommentEncoder,
	CouldBeScalaJsDefined,
	DoubleLit,
	EnumObject,
	ExpandedCallables,
	ExpandedClass,
	ExprTreeLit,
	HasClassParent,
	IntLit,
	IsTrivial,
	ManglerLeaveAlone,
	ManglerWasJsNative,
	Marker,
	ModuleAliases,
	NameHint,
	NullLit,
	Raw,
	StringLit,
	UndefinedLit,
	WasDefaulted,
	WasLiteral,
} from "../internal/Comment.js";
import { IArray } from "../internal/IArray.js";
import { QualifiedName } from "../internal/scalajs/QualifiedName.js";
import { TsIdent } from "../internal/ts/trees.js";

describe("Comment", () => {
	describe("Raw comments", () => {
		it("should create raw comments", () => {
			const comment = Comment.create("test comment");
			expect(comment).toBeInstanceOf(Raw);
			expect((comment as Raw).raw).toBe("test comment");
		});

		it("should create warning comments", () => {
			const warning = Comment.warning("test warning", "com.example.Test");
			expect(warning).toBeInstanceOf(Raw);
			expect((warning as Raw).raw).toBe(
				"/* import warning: example.Test test warning */",
			);
		});

		it("should handle warning comments without enclosing", () => {
			const warning = Comment.warning("test warning");
			expect(warning).toBeInstanceOf(Raw);
			expect((warning as Raw).raw).toBe(
				"/* import warning: unknown.context test warning */",
			);
		});
	});

	describe("Marker singletons", () => {
		it("should return the same instance for singletons", () => {
			const instance1 = CouldBeScalaJsDefined.instance;
			const instance2 = CouldBeScalaJsDefined.instance;
			expect(instance1).toBe(instance2);
		});

		it("should have correct marker tags", () => {
			expect(IsTrivial.instance._markerTag).toBe("IsTrivial");
			expect(ExpandedCallables.instance._markerTag).toBe("ExpandedCallables");
			expect(ExpandedClass.instance._markerTag).toBe("ExpandedClass");
			expect(EnumObject.instance._markerTag).toBe("EnumObject");
			expect(HasClassParent.instance._markerTag).toBe("HasClassParent");
			expect(ManglerLeaveAlone.instance._markerTag).toBe("ManglerLeaveAlone");
			expect(ManglerWasJsNative.instance._markerTag).toBe("ManglerWasJsNative");
		});
	});

	describe("Marker case classes", () => {
		it("should create NameHint markers", () => {
			const hint = new NameHint("testName");
			expect(hint.value).toBe("testName");
			expect(hint._markerTag).toBe("NameHint");
		});

		it("should create ModuleAliases markers", () => {
			const module1 = TsIdent.module(O.none, ["lodash"]);
			const module2 = TsIdent.module(O.some("types"), ["node"]);
			const aliases = IArray.fromArray([module1, module2]);
			const marker = new ModuleAliases(aliases);

			expect(marker.aliases.length).toBe(2);
			expect(marker._markerTag).toBe("ModuleAliases");
		});

		it("should create WasDefaulted markers", () => {
			const name1 = QualifiedName.fromString("com.example.Test1");
			const name2 = QualifiedName.fromString("com.example.Test2");
			const names = new Set([name1, name2]);
			const marker = new WasDefaulted(names);

			expect(marker.among.size).toBe(2);
			expect(marker._markerTag).toBe("WasDefaulted");
		});
	});

	describe("ExprTree.Lit", () => {
		it("should create boolean literals", () => {
			const trueLit = new BooleanLit(true);
			const falseLit = new BooleanLit(false);

			expect(trueLit.value).toBe(true);
			expect(falseLit.value).toBe(false);
			expect(trueLit._litTag).toBe("BooleanLit");
		});

		it("should create string literals", () => {
			const lit = new StringLit("hello world");
			expect(lit.value).toBe("hello world");
			expect(lit._litTag).toBe("StringLit");
		});

		it("should create numeric literals", () => {
			const intLit = new IntLit("42");
			const doubleLit = new DoubleLit("3.14");

			expect(intLit.value).toBe("42");
			expect(doubleLit.value).toBe("3.14");
			expect(intLit._litTag).toBe("IntLit");
			expect(doubleLit._litTag).toBe("DoubleLit");
		});

		it("should have singleton undefined and null literals", () => {
			const undef1 = UndefinedLit.instance;
			const undef2 = UndefinedLit.instance;
			const null1 = NullLit.instance;
			const null2 = NullLit.instance;

			expect(undef1).toBe(undef2);
			expect(null1).toBe(null2);
			expect(undef1._litTag).toBe("UndefinedLit");
			expect(null1._litTag).toBe("NullLit");
		});
	});

	describe("WasLiteral marker", () => {
		it("should create WasLiteral markers with literals", () => {
			const lit = new StringLit("test");
			const marker = new WasLiteral(lit);

			expect(marker.lit).toBe(lit);
			expect(marker._markerTag).toBe("WasLiteral");
		});

		it("should compare WasLiteral markers correctly", () => {
			const lit1 = new StringLit("test");
			const lit2 = new StringLit("test");
			const lit3 = new StringLit("different");

			const marker1 = new WasLiteral(lit1);
			const marker2 = new WasLiteral(lit2);
			const marker3 = new WasLiteral(lit3);

			expect(marker1.equals(marker2)).toBe(true);
			expect(marker1.equals(marker3)).toBe(false);
		});
	});

	describe("Type guards", () => {
		it("should identify markers correctly", () => {
			const raw = new Raw("test");
			const marker = new NameHint("test");

			expect(Comment.isMarker(raw)).toBe(false);
			expect(Comment.isMarker(marker)).toBe(true);
			expect(Comment.isRaw(raw)).toBe(true);
			expect(Comment.isRaw(marker)).toBe(false);
		});

		it("should extract specific marker types", () => {
			const hint = new NameHint("test");
			const raw = new Raw("test");

			expect(Comment.extractMarker(hint, NameHint)).toBe(hint);
			expect(Comment.extractMarker(raw, NameHint)).toBeUndefined();
		});
	});

	describe("Namespace utilities", () => {
		it("should provide marker factory functions", () => {
			const hint = Marker.nameHint("test");
			expect(hint).toBeInstanceOf(NameHint);
			expect(hint.value).toBe("test");
		});

		it("should provide literal factory functions", () => {
			const boolLit = ExprTreeLit.boolean(true);
			const stringLit = ExprTreeLit.string("test");
			const intLit = ExprTreeLit.int("42");
			const doubleLit = ExprTreeLit.double("3.14");

			expect(boolLit).toBeInstanceOf(BooleanLit);
			expect(stringLit).toBeInstanceOf(StringLit);
			expect(intLit).toBeInstanceOf(IntLit);
			expect(doubleLit).toBeInstanceOf(DoubleLit);

			expect(ExprTreeLit.undefined).toBe(UndefinedLit.instance);
			expect(ExprTreeLit.nullLit).toBe(NullLit.instance);
		});
	});

	describe("JSON serialization", () => {
		it("should encode and decode raw comments", () => {
			const original = new Raw("test comment");
			const encoded = CommentEncoder.encode(original);
			const decoded = CommentDecoder.decode(encoded);

			expect(decoded).toBeInstanceOf(Raw);
			expect((decoded as Raw).raw).toBe("test comment");
		});

		it("should encode and decode singleton markers", () => {
			const original = IsTrivial.instance;
			const encoded = CommentEncoder.encode(original);
			const decoded = CommentDecoder.decode(encoded);

			expect(decoded).toBe(IsTrivial.instance);
		});

		it("should encode and decode NameHint markers", () => {
			const original = new NameHint("testName");
			const encoded = CommentEncoder.encode(original);
			const decoded = CommentDecoder.decode(encoded);

			expect(decoded).toBeInstanceOf(NameHint);
			expect((decoded as NameHint).value).toBe("testName");
		});
	});
});
