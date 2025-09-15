/**
 * Tests for the TypeScript port of Annotation.scala
 */

import * as O from "fp-ts/Option";
import { describe, expect, test } from "bun:test";
import { IArray } from "../internal/IArray.js";
import {
	Annotation,
	type AnnotationUnion,
	Imported,
} from "../internal/scalajs/Annotation.js";
import { Name } from "../internal/scalajs/Name.js";
import { QualifiedName } from "../internal/scalajs/QualifiedName.js";

describe("Annotation", () => {
	describe("Simple annotations", () => {
		test("should create JsBracketAccess annotation", () => {
			const annotation = Annotation.JsBracketAccess;
			expect(annotation._tag).toBe("JsBracketAccess");
			expect(Annotation.isJsBracketAccess(annotation)).toBe(true);
		});

		test("should create JsNative annotation", () => {
			const annotation = Annotation.JsNative;
			expect(annotation._tag).toBe("JsNative");
			expect(Annotation.isJsNative(annotation)).toBe(true);
		});

		test("should create ScalaJSDefined annotation", () => {
			const annotation = Annotation.ScalaJSDefined;
			expect(annotation._tag).toBe("ScalaJSDefined");
			expect(Annotation.isScalaJSDefined(annotation)).toBe(true);
		});
	});

	describe("Complex annotations", () => {
		test("should create JsName annotation", () => {
			const name = new Name("testName");
			const annotation = Annotation.JsName(name);
			expect(annotation._tag).toBe("JsName");
			expect(annotation.name).toBe(name);
			expect(Annotation.isJsName(annotation)).toBe(true);
		});

		test("should create JsGlobal annotation", () => {
			const qname = new QualifiedName(
				IArray.fromArray([new Name("global"), new Name("test")]),
			);
			const annotation = Annotation.JsGlobal(qname);
			expect(annotation._tag).toBe("JsGlobal");
			expect(annotation.name).toBe(qname);
			expect(Annotation.isJsGlobal(annotation)).toBe(true);
			expect(Annotation.isLocationAnnotation(annotation)).toBe(true);
		});

		test("should create JsImport annotation", () => {
			const module = "react";
			const imported = Imported.Default;
			const annotation = Annotation.JsImport(module, imported);
			expect(annotation._tag).toBe("JsImport");
			expect(annotation.module).toBe(module);
			expect(annotation.imported).toBe(imported);
			expect(O.isNone(annotation.global)).toBe(true);
			expect(Annotation.isJsImport(annotation)).toBe(true);
			expect(Annotation.isLocationAnnotation(annotation)).toBe(true);
		});
	});

	describe("Imported types", () => {
		test("should create Namespace import", () => {
			const imported = Imported.Namespace;
			expect(imported._tag).toBe("Namespace");
			expect(Imported.isNamespace(imported)).toBe(true);
		});

		test("should create Default import", () => {
			const imported = Imported.Default;
			expect(imported._tag).toBe("Default");
			expect(Imported.isDefault(imported)).toBe(true);
		});

		test("should create Named import", () => {
			const names = IArray.fromArray([
				new Name("Component"),
				new Name("useState"),
			]);
			const imported = Imported.Named(names);
			expect(imported._tag).toBe("Named");
			expect(Imported.isNamed(imported)).toBe(true);
			if (Imported.isNamed(imported)) {
				expect(imported.name).toBe(names);
			}
		});
	});

	describe("renamedFrom function", () => {
		test("should handle empty annotations with regular name", () => {
			const newName = new Name("newName");
			const oldAnnotations = IArray.fromArray<AnnotationUnion>([]);

			const result = Annotation.renamedFrom(newName)(oldAnnotations);

			expect(result.length).toBe(1);
			const annotation = result.apply(0);
			expect(Annotation.isJsName(annotation)).toBe(true);
			if (Annotation.isJsName(annotation)) {
				expect(annotation.name).toBe(newName);
			}
		});

		test("should throw error for APPLY name with empty annotations", () => {
			const oldAnnotations = IArray.fromArray<AnnotationUnion>([]);

			expect(() => {
				Annotation.renamedFrom(Name.APPLY)(oldAnnotations);
			}).toThrow("Cannot rename `<apply>`");
		});

		test("should throw error for namespaced name with empty annotations", () => {
			const oldAnnotations = IArray.fromArray<AnnotationUnion>([]);

			expect(() => {
				Annotation.renamedFrom(Name.namespaced)(oldAnnotations);
			}).toThrow("Cannot rename `^`");
		});

		test("should preserve existing name annotations", () => {
			const existingName = new Name("existing");
			const existingAnnotation = Annotation.JsName(existingName);
			const otherAnnotation = Annotation.JsNative;
			const oldAnnotations = IArray.fromArray<AnnotationUnion>([
				existingAnnotation,
				otherAnnotation,
			]);

			const newName = new Name("newName");
			const result = Annotation.renamedFrom(newName)(oldAnnotations);

			// Should have the other annotation plus the existing name annotation
			expect(result.length).toBe(2);

			// Check that we have both annotations
			const hasJsNative = result.exists((ann) => Annotation.isJsNative(ann));
			const hasJsName = result.exists((ann) => Annotation.isJsName(ann));
			expect(hasJsNative).toBe(true);
			expect(hasJsName).toBe(true);
		});
	});

	describe("Utility functions", () => {
		test("should detect location annotations", () => {
			const annotations = IArray.fromArray<AnnotationUnion>([
				Annotation.JsNative,
				Annotation.JsGlobalScope,
				Annotation.JsGlobal(
					new QualifiedName(IArray.fromArray([new Name("test")])),
				),
			]);

			expect(Annotation.hasLocationAnnotation(annotations)).toBe(true);

			const locationAnnotations =
				Annotation.getLocationAnnotations(annotations);
			expect(locationAnnotations.length).toBe(2);
		});

		test("should extract specific annotation types", () => {
			const jsName = Annotation.JsName(new Name("test"));
			const jsGlobal = Annotation.JsGlobal(
				new QualifiedName(IArray.fromArray([new Name("global")])),
			);
			const jsImport = Annotation.JsImport("module", Imported.Default);

			const annotations = IArray.fromArray<AnnotationUnion>([
				Annotation.JsNative,
				jsName,
				jsGlobal,
				jsImport,
			]);

			const extractedJsName = Annotation.getJsName(annotations);
			const extractedJsGlobal = Annotation.getJsGlobal(annotations);
			const extractedJsImport = Annotation.getJsImport(annotations);

			expect(O.isSome(extractedJsName)).toBe(true);
			expect(O.isSome(extractedJsGlobal)).toBe(true);
			expect(O.isSome(extractedJsImport)).toBe(true);

			if (O.isSome(extractedJsName)) {
				expect(extractedJsName.value).toBe(jsName);
			}
		});
	});
});
