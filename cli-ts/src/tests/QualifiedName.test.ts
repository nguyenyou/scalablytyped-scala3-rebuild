/**
 * Tests for QualifiedName TypeScript port
 */

import { describe, expect, test } from "bun:test";
import * as O from "fp-ts/Option";
import { Name } from "../internal/scalajs/Name.js";
import { QualifiedName, StdNames } from "../internal/scalajs/QualifiedName.js";

describe("QualifiedName", () => {
	test("should create from string", () => {
		const qn = QualifiedName.fromString("com.example.MyClass");
		expect(qn.toStringArray()).toEqual(["com", "example", "MyClass"]);
		expect(qn.value).toBe("com.example.MyClass");
	});

	test("should support add operation", () => {
		const base = QualifiedName.fromString("com.example");
		const extended = base.add(new Name("MyClass"));
		expect(extended.value).toBe("com.example.MyClass");
	});

	test("should support concat operation", () => {
		const base = QualifiedName.fromString("com.example");
		const suffix = QualifiedName.fromString("util.Helper");
		const combined = base.concat(suffix);
		expect(combined.value).toBe("com.example.util.Helper");
	});

	test("should support startsWith", () => {
		const full = QualifiedName.fromString("com.example.util.Helper");
		const prefix = QualifiedName.fromString("com.example");
		expect(full.startsWith(prefix)).toBe(true);

		const nonPrefix = QualifiedName.fromString("org.other");
		expect(full.startsWith(nonPrefix)).toBe(false);
	});

	test("should handle equality correctly", () => {
		const qn1 = QualifiedName.fromString("com.example.MyClass");
		const qn2 = QualifiedName.fromString("com.example.MyClass");
		const qn3 = QualifiedName.fromString("com.example.Other");

		expect(qn1.equals(qn2)).toBe(true);
		expect(qn1.equals(qn3)).toBe(false);
	});

	test("should provide head, tail, init, last operations", () => {
		const qn = QualifiedName.fromString("com.example.util.Helper");

		expect(qn.head?.unescaped).toBe("com");
		expect(qn.last?.unescaped).toBe("Helper");
		expect(qn.init.value).toBe("com.example.util");
		expect(qn.tail.value).toBe("example.util.Helper");
	});

	test("should support fp-ts Option operations", () => {
		const qn = QualifiedName.fromString("com.example.MyClass");
		const empty = QualifiedName.empty();

		expect(O.isSome(qn.lastOption)).toBe(true);
		expect(O.isNone(empty.lastOption)).toBe(true);

		expect(O.isSome(qn.headOption)).toBe(true);
		expect(O.isNone(empty.headOption)).toBe(true);
	});

	test("should support functional operations", () => {
		const qn = QualifiedName.fromString("com.example.util.Helper");

		// Test map
		const mapped = qn.map((name) => new Name(name.unescaped.toUpperCase()));
		expect(mapped.value).toBe("COM.EXAMPLE.UTIL.HELPER");

		// Test filter
		const filtered = qn.filter((name) => name.unescaped.length > 3);
		expect(filtered.toStringArray()).toEqual(["example", "util", "Helper"]);

		// Test take/drop
		expect(qn.take(2).value).toBe("com.example");
		expect(qn.drop(2).value).toBe("util.Helper");

		// Test exists/forall
		expect(qn.exists((name) => name.unescaped === "example")).toBe(true);
		expect(qn.exists((name) => name.unescaped === "missing")).toBe(false);
		expect(qn.forall((name) => name.unescaped.length > 0)).toBe(true);
	});

	test("should provide predefined qualified names", () => {
		expect(QualifiedName.scala.value).toBe("scala");
		expect(QualifiedName.java_lang.value).toBe("java.lang");
		expect(QualifiedName.String.value).toBe("java.lang.String");
		expect(QualifiedName.JsAny.value).toBe("scala.scalajs.js.Any");
		expect(QualifiedName.Runtime.value).toBe("org.scalablytyped.runtime");
	});

	test("should support utility functions", () => {
		expect(QualifiedName.AnyFromFunction(2).value).toBe(
			"scala.scalajs.js.Any.fromFunction2",
		);
		expect(QualifiedName.Instantiable(3).value).toBe(
			"org.scalablytyped.runtime.Instantiable3",
		);
		expect(QualifiedName.Tuple(0).value).toBe("scala.scalajs.js.Array");
		expect(QualifiedName.Tuple(3).value).toBe("scala.scalajs.js.Tuple3");
	});

	test("should support StdNames class", () => {
		const stdNames = new StdNames(new Name("typings"));
		expect(stdNames.lib.value).toBe("typings.std");
		expect(stdNames.Array.value).toBe("typings.std.Array");
		expect(stdNames.Promise.value).toBe("typings.std.Promise");
	});

	test("should support suffix and prefix operations", () => {
		const qn = QualifiedName.fromString("com.example.MyClass");

		const withSuffix = qn.withSuffix("Impl");
		expect(withSuffix.value).toBe("com.example.MyClassImpl");

		const withPrefix = qn.withPrefix("Test");
		expect(withPrefix.value).toBe("Testcom.example.MyClass");
	});

	test("should support JSON serialization", () => {
		const qn = QualifiedName.fromString("com.example.MyClass");

		// Test encoding
		const encoded = qn.toStringArray();
		expect(encoded).toEqual(["com", "example", "MyClass"]);

		// Test that we can recreate from the encoded data
		const recreated = QualifiedName.fromStrings(encoded);
		expect(recreated.equals(qn)).toBe(true);
	});
});
