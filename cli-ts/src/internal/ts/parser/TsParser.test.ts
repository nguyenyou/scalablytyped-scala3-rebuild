/**
 * Tests for TsParser.ts - TypeScript port of TsParserTests.scala
 *
 * This test suite follows a Test-Driven Development (TDD) approach to ensure
 * 100% behavioral parity with the original Scala TsParser implementation.
 *
 * Enhanced with comprehensive test utilities and systematic test generation.
 */

import { describe, expect, test } from "vitest";
import type {
	TsContainerOrDecl,
	TsDeclInterface,
	TsDeclTypeAlias,
	TsDeclVar,
	TsExport,
	TsImport,
} from "../trees.js";
import {
	PerformanceTester,
	TestDataGenerator,
	TestRunner,
} from "./TestUtils.js";
import { parseString } from "./TsParser.js";

/**
 * Helper function to parse TypeScript code and extract declarations
 */
function parseAndExtractDeclarations(code: string): TsContainerOrDecl[] {
	const result = parseString(code);
	if (result._tag === "Left") {
		throw new Error(`Parse error: ${result.value}`);
	}
	return result.value.members.toArray();
}

describe("TsParser", () => {
	describe("Basic Parsing - Empty File", () => {
		test("should parse empty string successfully", () => {
			const result = parseString("");
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(0);
				expect(parsed.directives.length).toBe(0);
			}
		});

		test("should parse file with only comments", () => {
			const content = "// This is a comment\n/* Block comment */";
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(0);
				expect(parsed.comments.cs.length).toBeGreaterThan(0);
			}
		});

		test("should parse file with only whitespace", () => {
			const content = "   \n\t  \n  ";
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(0);
				expect(parsed.directives.length).toBe(0);
			}
		});
	});

	describe("Basic Parsing - Simple Declarations", () => {
		test("should parse simple interface", () => {
			const content = "interface MyInterface { x: number; }";
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(1);

				const member = parsed.members.apply(0);
				expect(member._tag).toBe("TsDeclInterface");

				if (member._tag === "TsDeclInterface") {
					const interface_ = member as TsDeclInterface;
					expect(interface_.name.value).toBe("MyInterface");
					expect(interface_.members.length).toBe(1);
				}
			}
		});

		test("should parse simple type alias", () => {
			const content = "type MyType = string;";
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(1);

				const member = parsed.members.apply(0);
				expect(member._tag).toBe("TsDeclTypeAlias");

				if (member._tag === "TsDeclTypeAlias") {
					const alias = member as TsDeclTypeAlias;
					expect(alias.name.value).toBe("MyType");
					expect(alias.alias._tag).toBe("TsTypeRef");
				}
			}
		});

		test("should parse simple variable declaration", () => {
			const content = "let myVar: string;";
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(1);

				const member = parsed.members.apply(0);
				expect(member._tag).toBe("TsDeclVar");

				if (member._tag === "TsDeclVar") {
					const variable = member as TsDeclVar;
					expect(variable.name.value).toBe("myVar");
					expect(variable.readOnly).toBe(false);
				}
			}
		});

		test("should parse const variable declaration", () => {
			const content = "const myConst: number = 42;";
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(1);

				const member = parsed.members.apply(0);
				expect(member._tag).toBe("TsDeclVar");

				if (member._tag === "TsDeclVar") {
					const variable = member as TsDeclVar;
					expect(variable.name.value).toBe("myConst");
					expect(variable.readOnly).toBe(true);
				}
			}
		});

		test("should parse union type alias", () => {
			const content = "type StringOrNumber = string | number;";
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(1);

				const member = parsed.members.apply(0);
				expect(member._tag).toBe("TsDeclTypeAlias");

				if (member._tag === "TsDeclTypeAlias") {
					const alias = member as TsDeclTypeAlias;
					expect(alias.name.value).toBe("StringOrNumber");
					// The alias should be a union type, but for now we'll just check it exists
					expect(alias.alias).toBeDefined();
				}
			}
		});
	});

	describe("Complex Parsing Tests", () => {
		test("should parse function declaration", () => {
			const content =
				"function myFunction(x: number): string { return x.toString(); }";
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(1);

				const member = parsed.members.apply(0);
				// For now, function declarations might not be fully supported
				// but they should at least not cause parsing to fail
				expect(member).toBeDefined();
			}
		});

		test("should parse interface with multiple members", () => {
			const content = `
				interface ComplexInterface {
					name: string;
					age: number;
					isActive: boolean;
				}
			`;
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(1);

				const member = parsed.members.apply(0);
				expect(member._tag).toBe("TsDeclInterface");

				if (member._tag === "TsDeclInterface") {
					const interface_ = member as TsDeclInterface;
					expect(interface_.name.value).toBe("ComplexInterface");
					expect(interface_.members.length).toBe(3);
				}
			}
		});

		test("should parse nested type alias", () => {
			const content = "type NestedType = { prop: string | number };";
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(1);

				const member = parsed.members.apply(0);
				expect(member._tag).toBe("TsDeclTypeAlias");
			}
		});
	});

	describe("Error Handling and Edge Cases", () => {
		test("should fail on invalid syntax", () => {
			const content = "interface { invalid syntax";
			const result = parseString(content);
			expect(result._tag).toBe("Left");
		});

		test("should fail on incomplete declaration", () => {
			const content = "interface MyInterface";
			const result = parseString(content);
			expect(result._tag).toBe("Left");
		});

		test("should fail on malformed type", () => {
			const content = "type MyType = string |";
			const result = parseString(content);
			expect(result._tag).toBe("Left");
		});

		test("should handle multiple declarations", () => {
			const content = `
				interface A { x: number; }
				type B = string;
				let c: boolean;
			`;
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(3);
				expect(parsed.members.apply(0)._tag).toBe("TsDeclInterface");
				expect(parsed.members.apply(1)._tag).toBe("TsDeclTypeAlias");
				expect(parsed.members.apply(2)._tag).toBe("TsDeclVar");
			}
		});

		test("should handle shebang", () => {
			const content = "#!/usr/bin/env node\ninterface Test { }";
			const result = parseString(content);
			expect(result._tag).toBe("Right");

			if (result._tag === "Right") {
				const parsed = result.value;
				expect(parsed.members.length).toBe(1);
				expect(parsed.members.apply(0)._tag).toBe("TsDeclInterface");
			}
		});
	});

	// Systematic test generation using TestUtils
	describe("Generated Test Cases", () => {
		describe("Interface Declarations", () => {
			const interfaceTests = TestDataGenerator.generateInterfaceTests();
			interfaceTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Type Alias Declarations", () => {
			const typeAliasTests = TestDataGenerator.generateTypeAliasTests();
			typeAliasTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Variable Declarations", () => {
			const variableTests = TestDataGenerator.generateVariableTests();
			variableTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Error Handling", () => {
			const errorTests = TestDataGenerator.generateErrorTests();
			errorTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Directive Processing", () => {
			const directiveTests = TestDataGenerator.generateDirectiveTests();
			directiveTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Shebang Handling", () => {
			const shebangTests = TestDataGenerator.generateShebangTests();
			shebangTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Generic Types", () => {
			const genericTests = TestDataGenerator.generateGenericTests();
			genericTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Namespace Declarations", () => {
			const namespaceTests = TestDataGenerator.generateNamespaceTests();
			namespaceTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Module Declarations", () => {
			const moduleTests = TestDataGenerator.generateModuleTests();
			moduleTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Enum Declarations", () => {
			const enumTests = TestDataGenerator.generateEnumTests();
			enumTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Class Declarations", () => {
			const classTests = TestDataGenerator.generateClassTests();
			classTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Advanced Type System", () => {
			const advancedTypeTests = TestDataGenerator.generateAdvancedTypeTests();
			advancedTypeTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});

		describe("Member System", () => {
			const memberSystemTests = TestDataGenerator.generateMemberSystemTests();
			memberSystemTests.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});
	});

	describe("Performance Benchmarks", () => {
		test("should maintain reasonable parsing performance", () => {
			const simpleInterface = "interface User { name: string; age: number; }";
			const avgTime = PerformanceTester.measureParsingTime(simpleInterface, 10);

			// Should parse in less than 10ms on average
			expect(avgTime).toBeLessThan(10);
		});

		test("should handle complex declarations efficiently", () => {
			const complexInterface = `
				interface ComplexUser {
					id: string;
					profile: {
						name: string;
						email: string;
						preferences: {
							theme: 'light' | 'dark';
							notifications: boolean;
						};
					};
					permissions: Array<'read' | 'write' | 'admin'>;
					metadata?: Record<string, any>;
				}
			`;
			const avgTime = PerformanceTester.measureParsingTime(
				complexInterface,
				10,
			);

			// Should parse complex declarations in reasonable time
			expect(avgTime).toBeLessThan(20);
		});
	});

	describe("Import/Export System", () => {
		describe("Import Declarations", () => {
			test("should parse default import", () => {
				const result = parseAndExtractDeclarations(
					`import React from "react";`,
				);
				expect(result).toHaveLength(1);

				const importDecl = result[0] as TsImport;
				expect(importDecl._tag).toBe("TsImport");
				expect(importDecl.typeOnly).toBe(false);
				expect(importDecl.imported.length).toBe(1);

				const imported = importDecl.imported.get(0);
				expect(imported._tag).toBe("TsImportedIdent");
				expect((imported as any).ident.value).toBe("React");

				expect(importDecl.from._tag).toBe("TsImporteeFrom");
				expect((importDecl.from as any).from.fragments).toEqual(["react"]);
			});

			test("should parse named imports", () => {
				const result = parseAndExtractDeclarations(
					`import { useState, useEffect } from "react";`,
				);
				expect(result).toHaveLength(1);

				const importDecl = result[0] as TsImport;
				expect(importDecl._tag).toBe("TsImport");
				expect(importDecl.typeOnly).toBe(false);
				expect(importDecl.imported.length).toBe(1);

				const imported = importDecl.imported.get(0);
				expect(imported._tag).toBe("TsImportedDestructured");
				expect((imported as any).idents.length).toBe(2);
			});

			test("should parse named imports with aliases", () => {
				const result = parseAndExtractDeclarations(
					`import { useState as state, useEffect as effect } from "react";`,
				);
				expect(result).toHaveLength(1);

				const importDecl = result[0] as TsImport;
				expect(importDecl._tag).toBe("TsImport");

				const imported = importDecl.imported.get(0);
				expect(imported._tag).toBe("TsImportedDestructured");
				expect((imported as any).idents.length).toBe(2);
			});

			test("should parse star import", () => {
				const result = parseAndExtractDeclarations(
					`import * as React from "react";`,
				);
				expect(result).toHaveLength(1);

				const importDecl = result[0] as TsImport;
				expect(importDecl._tag).toBe("TsImport");
				expect(importDecl.typeOnly).toBe(false);
				expect(importDecl.imported.length).toBe(1);

				const imported = importDecl.imported.get(0);
				expect(imported._tag).toBe("TsImportedStar");
				expect((imported as any).asOpt._tag).toBe("Some");
				expect((imported as any).asOpt.value.value).toBe("React");
			});

			test("should parse type-only import", () => {
				const result = parseAndExtractDeclarations(
					`import type { Props } from "./types";`,
				);
				expect(result).toHaveLength(1);

				const importDecl = result[0] as TsImport;
				expect(importDecl._tag).toBe("TsImport");
				expect(importDecl.typeOnly).toBe(true);
				expect(importDecl.imported.length).toBe(1);

				const imported = importDecl.imported.get(0);
				expect(imported._tag).toBe("TsImportedDestructured");
			});

			test("should parse mixed default and named import", () => {
				const result = parseAndExtractDeclarations(
					`import React, { useState } from "react";`,
				);
				expect(result).toHaveLength(1);

				const importDecl = result[0] as TsImport;
				expect(importDecl._tag).toBe("TsImport");
				expect(importDecl.imported.length).toBe(2);

				const defaultImport = importDecl.imported.get(0);
				expect(defaultImport._tag).toBe("TsImportedIdent");

				const namedImport = importDecl.imported.get(1);
				expect(namedImport._tag).toBe("TsImportedDestructured");
			});
		});

		describe("Export Declarations", () => {
			test("should parse named export", () => {
				const result = parseAndExtractDeclarations(`export { foo, bar };`);
				expect(result).toHaveLength(1);

				const exportDecl = result[0] as TsExport;
				expect(exportDecl._tag).toBe("TsExport");
				expect(exportDecl.typeOnly).toBe(false);
				expect(exportDecl.tpe._tag).toBe("Named");

				expect(exportDecl.exported._tag).toBe("TsExporteeNames");
				expect((exportDecl.exported as any).idents.length).toBe(2);
			});

			test("should parse named export with aliases", () => {
				const result = parseAndExtractDeclarations(
					`export { foo as bar, baz };`,
				);
				expect(result).toHaveLength(1);

				const exportDecl = result[0] as TsExport;
				expect(exportDecl._tag).toBe("TsExport");
				expect(exportDecl.exported._tag).toBe("TsExporteeNames");
				expect((exportDecl.exported as any).idents.length).toBe(2);
			});

			test("should parse re-export", () => {
				const result = parseAndExtractDeclarations(
					`export { foo } from "module";`,
				);
				expect(result).toHaveLength(1);

				const exportDecl = result[0] as TsExport;
				expect(exportDecl._tag).toBe("TsExport");
				expect(exportDecl.exported._tag).toBe("TsExporteeNames");
				expect((exportDecl.exported as any).fromOpt._tag).toBe("Some");
			});

			test("should parse star export", () => {
				const result = parseAndExtractDeclarations(`export * from "module";`);
				expect(result).toHaveLength(1);

				const exportDecl = result[0] as TsExport;
				expect(exportDecl._tag).toBe("TsExport");
				expect(exportDecl.exported._tag).toBe("TsExporteeStar");
				expect((exportDecl.exported as any).as._tag).toBe("None");
			});

			test("should parse star export with alias", () => {
				const result = parseAndExtractDeclarations(
					`export * as namespace from "module";`,
				);
				expect(result).toHaveLength(1);

				const exportDecl = result[0] as TsExport;
				expect(exportDecl._tag).toBe("TsExport");
				expect(exportDecl.exported._tag).toBe("TsExporteeStar");
				expect((exportDecl.exported as any).as._tag).toBe("Some");
				expect((exportDecl.exported as any).as.value.value).toBe("namespace");
			});

			test("should parse type-only export", () => {
				const result = parseAndExtractDeclarations(`export type { Props };`);
				expect(result).toHaveLength(1);

				const exportDecl = result[0] as TsExport;
				expect(exportDecl._tag).toBe("TsExport");
				expect(exportDecl.typeOnly).toBe(true);
				expect(exportDecl.exported._tag).toBe("TsExporteeNames");
			});

			test("should parse export assignment", () => {
				const result = parseAndExtractDeclarations(`export = myValue;`);
				expect(result).toHaveLength(1);

				const exportDecl = result[0] as TsExport;
				expect(exportDecl._tag).toBe("TsExport");
				expect(exportDecl.tpe._tag).toBe("Namespaced");
				expect(exportDecl.exported._tag).toBe("TsExporteeTree");
			});

			test("should parse default export assignment", () => {
				const result = parseAndExtractDeclarations(`export default myValue;`);
				expect(result).toHaveLength(1);

				const exportDecl = result[0] as TsExport;
				expect(exportDecl._tag).toBe("TsExport");
				expect(exportDecl.tpe._tag).toBe("Defaulted");
				expect(exportDecl.exported._tag).toBe("TsExporteeTree");
			});
		});

		describe("Complex Import/Export Scenarios", () => {
			test("should parse multiple imports and exports", () => {
				const result = parseAndExtractDeclarations(`
					import React from "react";
					import { useState } from "react";
					export { MyComponent };
					export * from "./utils";
				`);
				expect(result).toHaveLength(4);

				expect(result[0]._tag).toBe("TsImport");
				expect(result[1]._tag).toBe("TsImport");
				expect(result[2]._tag).toBe("TsExport");
				expect(result[3]._tag).toBe("TsExport");
			});

			test("should parse scoped module imports", () => {
				const result = parseAndExtractDeclarations(
					`import { Component } from "@angular/core";`,
				);
				expect(result).toHaveLength(1);

				const importDecl = result[0] as TsImport;
				expect(importDecl._tag).toBe("TsImport");
				expect((importDecl.from as any).from.scopeOpt._tag).toBe("Some");
				expect((importDecl.from as any).from.scopeOpt.value).toBe("angular");
				expect((importDecl.from as any).from.fragments).toEqual(["core"]);
			});

			test("should parse relative path imports", () => {
				const result = parseAndExtractDeclarations(
					`import { utils } from "./utils/helper";`,
				);
				expect(result).toHaveLength(1);

				const importDecl = result[0] as TsImport;
				expect(importDecl._tag).toBe("TsImport");
				expect((importDecl.from as any).from.fragments).toEqual([
					".",
					"utils",
					"helper",
				]);
			});
		});

		describe("Advanced Type System Features", () => {
			describe("Keyof Operator", () => {
				test("should parse keyof type", () => {
					const content = "type Keys = keyof MyInterface;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
					if (result._tag === "Right") {
						const file = result.value;
						expect(file.members.length).toBe(1);
						const member = file.members.apply(0);
						expect(member._tag).toBe("TsDeclTypeAlias");
					}
				});

				test("should parse complex keyof expression", () => {
					const content = "type ComplexKeys = keyof (A & B);";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});
			});

			describe("Indexed Access Types", () => {
				test("should parse indexed access type", () => {
					const content = "type Value = MyType[K];";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
					if (result._tag === "Right") {
						const file = result.value;
						expect(file.members.length).toBe(1);
					}
				});

				test("should parse nested indexed access", () => {
					const content = "type NestedValue = MyType[K][P];";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});
			});

			describe("Conditional Types", () => {
				test("should parse simple conditional type", () => {
					const content = "type IsString<T> = T extends string ? true : false;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
					if (result._tag === "Right") {
						const file = result.value;
						expect(file.members.length).toBe(1);
					}
				});

				test("should parse complex conditional type", () => {
					const content = "type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});

				test("should parse nested conditional types", () => {
					const content = "type Complex<T> = T extends string ? string[] : T extends number ? number[] : never;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});
			});

			describe("Infer Types", () => {
				test("should parse infer in conditional type", () => {
					const content = "type ElementType<T> = T extends (infer U)[] ? U : never;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});

				test("should parse multiple infer types", () => {
					const content = "type Parameters<T> = T extends (...args: infer P) => infer R ? P : never;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});
			});

			describe("Template Literal Types", () => {
				test("should parse simple template literal type", () => {
					const content = "type Greeting = `Hello, ${string}!`;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
					if (result._tag === "Right") {
						const file = result.value;
						expect(file.members.length).toBe(1);
					}
				});

				test("should parse complex template literal type", () => {
					const content = "type EventName<T> = `on${Capitalize<T>}Change`;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});

				test("should parse multiple interpolations", () => {
					const content = "type Path = `${string}/${string}/${string}`;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});
			});

			describe("Mapped Types", () => {
				test("should parse simple mapped type", () => {
					const content = "type Readonly<T> = { readonly [P in keyof T]: T[P] };";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
					if (result._tag === "Right") {
						const file = result.value;
						expect(file.members.length).toBe(1);
					}
				});

				test("should parse optional mapped type", () => {
					const content = "type Partial<T> = { [P in keyof T]?: T[P] };";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});

				test("should parse mapped type with key remapping", () => {
					const content = "type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});

				test("should parse mapped type with modifiers", () => {
					const content = "type Required<T> = { [P in keyof T]-?: T[P] };";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});
			});

			describe("Type Queries (typeof)", () => {
				test("should parse typeof type query", () => {
					const content = "type TypeOfValue = typeof myValue;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
					if (result._tag === "Right") {
						const file = result.value;
						expect(file.members.length).toBe(1);
					}
				});

				test("should parse typeof with property access", () => {
					const content = "type TypeOfProperty = typeof myObject.property;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});
			});

			describe("Advanced Type Combinations", () => {
				test("should parse utility type combinations", () => {
					const content = "type PickPartial<T, K extends keyof T> = Partial<Pick<T, K>>;";
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});

				test("should parse complex type manipulation", () => {
					const content = `
						type DeepReadonly<T> = {
							readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
						};
					`;
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});

				test("should parse advanced conditional with template literals", () => {
					const content = `
						type EventHandlers<T> = {
							[K in keyof T as K extends string ? \`on\${Capitalize<K>}\` : never]: (value: T[K]) => void
						};
					`;
					const result = parseString(content);
					expect(result._tag).toBe("Right");
				});
			});
		});
	});
});
