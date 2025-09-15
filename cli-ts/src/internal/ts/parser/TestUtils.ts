/**
 * Test utilities for TsParser testing and validation
 *
 * Provides comprehensive testing infrastructure for comparing Scala and TypeScript
 * parser outputs, including AST comparison functions and test data generators.
 */

import { describe, expect, test } from "bun:test";
import type { TsContainerOrDecl, TsParsedFile } from "../trees.js";
import { parseString } from "./TsParser.js";

/**
 * Test case definition for systematic testing
 */
export interface TestCase {
	name: string;
	description: string;
	input: string;
	expectedSuccess: boolean;
	expectedDeclarationCount?: number;
	expectedDeclarationTypes?: string[];
	expectedErrors?: string[];
	category: TestCategory;
}

/**
 * Test categories for organizing test cases
 */
export enum TestCategory {
	BASIC_PARSING = "Basic Parsing",
	DECLARATIONS = "Declarations",
	TYPES = "Types",
	MEMBERS = "Members",
	IMPORTS_EXPORTS = "Imports/Exports",
	DIRECTIVES = "Directives",
	ERROR_HANDLING = "Error Handling",
	EDGE_CASES = "Edge Cases",
}

/**
 * AST comparison result
 */
export interface ComparisonResult {
	matches: boolean;
	differences: string[];
	scalaOutput?: any;
	typescriptOutput?: any;
}

/**
 * Test data generator for creating complex TypeScript constructs
 */
export class TestDataGenerator {
	/**
	 * Generate interface declaration test cases
	 */
	static generateInterfaceTests(): TestCase[] {
		return [
			{
				name: "simple interface",
				description: "Basic interface with single property",
				input: "interface User { name: string; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "interface with multiple properties",
				description: "Interface with multiple typed properties",
				input: `interface User {
                    name: string;
                    age: number;
                    isActive: boolean;
                }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "interface with optional properties",
				description: "Interface with optional and required properties",
				input: `interface User {
                    name: string;
                    age?: number;
                    email?: string;
                }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "interface with method signatures",
				description: "Interface with function properties",
				input: `interface Calculator {
                    add(a: number, b: number): number;
                    subtract(a: number, b: number): number;
                }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.DECLARATIONS,
			},
		];
	}

	/**
	 * Generate type alias test cases
	 */
	static generateTypeAliasTests(): TestCase[] {
		return [
			{
				name: "simple type alias",
				description: "Basic type alias to primitive type",
				input: "type UserId = string;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "union type alias",
				description: "Type alias with union types",
				input: "type Status = 'pending' | 'approved' | 'rejected';",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "object type alias",
				description: "Type alias with object type",
				input: "type Point = { x: number; y: number; };",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "function type alias",
				description: "Type alias with function type",
				input: "type Handler = (event: Event) => void;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
		];
	}

	/**
	 * Generate variable declaration test cases
	 */
	static generateVariableTests(): TestCase[] {
		return [
			{
				name: "let variable",
				description: "Mutable variable declaration",
				input: "let count: number = 0;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclVar"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "const variable",
				description: "Immutable variable declaration",
				input: "const PI: number = 3.14159;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclVar"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "var variable",
				description: "Legacy variable declaration",
				input: "var global: any;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclVar"],
				category: TestCategory.DECLARATIONS,
			},
		];
	}

	/**
	 * Generate error handling test cases
	 */
	static generateErrorTests(): TestCase[] {
		return [
			{
				name: "incomplete interface",
				description: "Interface declaration without body",
				input: "interface User",
				expectedSuccess: false,
				expectedErrors: ["Parse error"],
				category: TestCategory.ERROR_HANDLING,
			},
			{
				name: "malformed type alias",
				description: "Type alias with incomplete union",
				input: "type Status = 'pending' |",
				expectedSuccess: false,
				expectedErrors: ["Parse error"],
				category: TestCategory.ERROR_HANDLING,
			},
			{
				name: "invalid syntax",
				description: "Completely invalid TypeScript syntax",
				input: "interface { invalid syntax",
				expectedSuccess: false,
				expectedErrors: ["Parse error"],
				category: TestCategory.ERROR_HANDLING,
			},
		];
	}

	/**
	 * Generate directive test cases
	 */
	static generateDirectiveTests(): TestCase[] {
		return [
			{
				name: "lib reference directive",
				description: "Triple-slash lib reference directive",
				input: `/// <reference lib="es2015" />\ninterface Test { }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.DIRECTIVES,
			},
			{
				name: "types reference directive",
				description: "Triple-slash types reference directive",
				input: `/// <reference types="node" />\ninterface Test { }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.DIRECTIVES,
			},
			{
				name: "path reference directive",
				description: "Triple-slash path reference directive",
				input: `/// <reference path="./types.d.ts" />\ninterface Test { }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.DIRECTIVES,
			},
			{
				name: "no-default-lib directive",
				description: "Triple-slash no-default-lib directive",
				input: `/// <reference no-default-lib="true" />\ninterface Test { }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.DIRECTIVES,
			},
			{
				name: "amd-module directive",
				description: "Triple-slash amd-module directive",
				input: `/// <amd-module name="myModule" />\ninterface Test { }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.DIRECTIVES,
			},
			{
				name: "multiple directives",
				description: "Multiple triple-slash directives",
				input: `/// <reference lib="es2015" />
/// <reference types="node" />
interface Test { }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.DIRECTIVES,
			},
		];
	}

	/**
	 * Generate shebang test cases
	 */
	static generateShebangTests(): TestCase[] {
		return [
			{
				name: "node shebang",
				description: "Node.js shebang line",
				input: `#!/usr/bin/env node\ninterface Test { }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.EDGE_CASES,
			},
			{
				name: "typescript shebang",
				description: "TypeScript shebang line",
				input: `#!/usr/bin/env ts-node\ninterface Test { }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.EDGE_CASES,
			},
			{
				name: "multiple shebang lines",
				description: "Multiple shebang lines",
				input: `#!/usr/bin/env node
#!/usr/bin/env ts-node
interface Test { }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.EDGE_CASES,
			},
		];
	}

	/**
	 * Generate generic type test cases
	 */
	static generateGenericTests(): TestCase[] {
		return [
			{
				name: "generic interface",
				description: "Interface with single type parameter",
				input: "interface Container<T> { value: T; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.TYPES,
			},
			{
				name: "generic interface with constraint",
				description: "Interface with constrained type parameter",
				input:
					"interface Comparable<T extends string> { compare(other: T): number; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.TYPES,
			},
			{
				name: "generic interface with default",
				description: "Interface with default type parameter",
				input: "interface Optional<T = string> { value?: T; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.TYPES,
			},
			{
				name: "multiple type parameters",
				description: "Interface with multiple type parameters",
				input:
					"interface Map<K, V> { get(key: K): V; set(key: K, value: V): void; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.TYPES,
			},
			{
				name: "generic type alias",
				description: "Type alias with type parameter",
				input: "type Result<T> = T | Error;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "complex generic type alias",
				description: "Type alias with multiple constrained type parameters",
				input: "type Mapper<T extends object, U = string> = (input: T) => U;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
		];
	}

	/**
	 * Generate namespace declaration test cases
	 */
	static generateNamespaceTests(): TestCase[] {
		return [
			{
				name: "simple namespace",
				description: "Basic namespace declaration",
				input: "namespace MyNamespace { interface Test { } }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclNamespace"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "declared namespace",
				description: "Ambient namespace declaration",
				input: "declare namespace MyNamespace { interface Test { } }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclNamespace"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "nested namespace",
				description: "Namespace with nested namespace",
				input: `namespace Outer {
                    namespace Inner {
                        interface Test { }
                    }
                }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclNamespace"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "empty namespace",
				description: "Namespace with no members",
				input: "namespace Empty { }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclNamespace"],
				category: TestCategory.DECLARATIONS,
			},
		];
	}

	/**
	 * Generate module declaration test cases
	 */
	static generateModuleTests(): TestCase[] {
		return [
			{
				name: "simple module",
				description: "Basic module declaration",
				input: 'module "my-module" { interface Test { } }',
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclModule"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "declared module",
				description: "Ambient module declaration",
				input: 'declare module "my-module" { interface Test { } }',
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclModule"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "scoped module",
				description: "Scoped module declaration",
				input: 'declare module "@types/node" { interface Test { } }',
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclModule"],
				category: TestCategory.DECLARATIONS,
			},
		];
	}

	/**
	 * Generate enum declaration test cases
	 */
	static generateEnumTests(): TestCase[] {
		return [
			{
				name: "simple enum",
				description: "Basic enum declaration",
				input: "enum Color { Red, Green, Blue }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclEnum"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "enum with values",
				description: "Enum with explicit values",
				input: "enum Status { Active = 1, Inactive = 0 }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclEnum"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "const enum",
				description: "Const enum declaration",
				input: "const enum Direction { Up, Down, Left, Right }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclEnum"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "declared enum",
				description: "Ambient enum declaration",
				input: "declare enum GlobalEnum { Value1, Value2 }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclEnum"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "string enum",
				description: "Enum with string values",
				input: 'enum Theme { Light = "light", Dark = "dark" }',
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclEnum"],
				category: TestCategory.DECLARATIONS,
			},
		];
	}

	/**
	 * Generate class declaration test cases
	 */
	static generateClassTests(): TestCase[] {
		return [
			{
				name: "simple class",
				description: "Basic class declaration",
				input: "class MyClass { }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclClass"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "class with inheritance",
				description: "Class extending another class",
				input: "class Child extends Parent { }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclClass"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "class with interface implementation",
				description: "Class implementing interfaces",
				input: "class MyClass implements IInterface1, IInterface2 { }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclClass"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "abstract class",
				description: "Abstract class declaration",
				input: "abstract class AbstractClass { }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclClass"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "declared class",
				description: "Ambient class declaration",
				input: "declare class ExternalClass { }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclClass"],
				category: TestCategory.DECLARATIONS,
			},
			{
				name: "generic class",
				description: "Class with type parameters",
				input: "class Container<T> { }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclClass"],
				category: TestCategory.DECLARATIONS,
			},
		];
	}

	/**
	 * Generate advanced type system test cases
	 */
	static generateAdvancedTypeTests(): TestCase[] {
		return [
			{
				name: "intersection type",
				description: "Type alias with intersection type",
				input: "type Combined = TypeA & TypeB;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "tuple type",
				description: "Type alias with tuple type",
				input: "type Coordinates = [number, number];",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "complex tuple type",
				description: "Type alias with complex tuple type",
				input: "type ComplexTuple = [string, number, boolean];",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "typeof type query",
				description: "Type alias with typeof query",
				input: "type TypeOfValue = typeof someValue;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "object type literal",
				description: "Type alias with object type literal",
				input: "type ObjectType = { name: string; age: number; };",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "string literal type",
				description: "Type alias with string literal type",
				input: 'type Status = "active";',
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "number literal type",
				description: "Type alias with number literal type",
				input: "type Version = 1;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "boolean literal type",
				description: "Type alias with boolean literal type",
				input: "type IsEnabled = true;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "array type",
				description: "Type alias with array type",
				input: "type StringArray = string[];",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "function type",
				description: "Type alias with function type",
				input: "type Handler = (event: Event) => void;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "complex intersection",
				description: "Complex intersection with multiple types",
				input: "type ComplexIntersection = TypeA & TypeB & TypeC;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
			{
				name: "union and intersection combined",
				description: "Type with both union and intersection",
				input: "type Complex = (TypeA | TypeB) & TypeC;",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclTypeAlias"],
				category: TestCategory.TYPES,
			},
		];
	}

	/**
	 * Generate member system test cases
	 */
	static generateMemberSystemTests(): TestCase[] {
		return [
			{
				name: "interface with method signature",
				description: "Interface with method signature",
				input: "interface Service { process(data: string): Promise<void>; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with call signature",
				description: "Interface with call signature",
				input: "interface Callable { (input: string): number; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with construct signature",
				description: "Interface with construct signature",
				input: "interface Constructable { new (name: string): Object; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with index signature",
				description: "Interface with index signature",
				input: "interface Dictionary { [key: string]: any; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with readonly index signature",
				description: "Interface with readonly index signature",
				input: "interface ReadonlyDict { readonly [key: string]: string; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with optional method",
				description: "Interface with optional method signature",
				input: "interface OptionalMethods { process?(data: string): void; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with readonly property",
				description: "Interface with readonly property",
				input: "interface Config { readonly version: string; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with mixed members",
				description: "Interface with property, method, and index signature",
				input: `interface Complex {
                    name: string;
                    process(data: any): void;
                    [key: string]: any;
                }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with generic method",
				description: "Interface with generic method signature",
				input: "interface Generic { transform<T>(input: T): T; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with overloaded methods",
				description: "Interface with method overloads",
				input: `interface Overloaded {
                    process(data: string): string;
                    process(data: number): number;
                }`,
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with function type property",
				description: "Interface with function type property",
				input: "interface WithFunction { handler: (event: Event) => void; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
			{
				name: "interface with numeric index signature",
				description: "Interface with numeric index signature",
				input: "interface ArrayLike { [index: number]: string; }",
				expectedSuccess: true,
				expectedDeclarationCount: 1,
				expectedDeclarationTypes: ["TsDeclInterface"],
				category: TestCategory.MEMBERS,
			},
		];
	}

	/**
	 * Generate all test cases
	 */
	static generateAllTests(): TestCase[] {
		return [
			...TestDataGenerator.generateInterfaceTests(),
			...TestDataGenerator.generateTypeAliasTests(),
			...TestDataGenerator.generateVariableTests(),
			...TestDataGenerator.generateErrorTests(),
			...TestDataGenerator.generateDirectiveTests(),
			...TestDataGenerator.generateShebangTests(),
			...TestDataGenerator.generateGenericTests(),
			...TestDataGenerator.generateNamespaceTests(),
			...TestDataGenerator.generateModuleTests(),
			...TestDataGenerator.generateEnumTests(),
			...TestDataGenerator.generateClassTests(),
			...TestDataGenerator.generateAdvancedTypeTests(),
			...TestDataGenerator.generateMemberSystemTests(),
		];
	}
}

/**
 * AST comparison utilities
 */
export class ASTComparator {
	/**
	 * Compare two parsed files for structural equivalence
	 */
	static compareParsedFiles(
		ts: TsParsedFile,
		expected: Partial<TsParsedFile>,
	): ComparisonResult {
		const differences: string[] = [];

		// Compare member count
		if (expected.members && ts.members.length !== expected.members.length) {
			differences.push(
				`Member count mismatch: expected ${expected.members.length}, got ${ts.members.length}`,
			);
		}

		// Compare directives count
		if (
			expected.directives &&
			ts.directives.length !== expected.directives.length
		) {
			differences.push(
				`Directive count mismatch: expected ${expected.directives.length}, got ${ts.directives.length}`,
			);
		}

		// Compare comments
		if (
			expected.comments &&
			ts.comments.cs.length !== expected.comments.cs.length
		) {
			differences.push(
				`Comment count mismatch: expected ${expected.comments.cs.length}, got ${ts.comments.cs.length}`,
			);
		}

		return {
			matches: differences.length === 0,
			differences,
			typescriptOutput: ts,
		};
	}

	/**
	 * Compare declaration types
	 */
	static compareDeclarationTypes(
		declarations: readonly TsContainerOrDecl[],
		expectedTypes: string[],
	): ComparisonResult {
		const differences: string[] = [];
		const actualTypes = declarations.map((decl) => decl._tag);

		if (actualTypes.length !== expectedTypes.length) {
			differences.push(
				`Declaration count mismatch: expected ${expectedTypes.length}, got ${actualTypes.length}`,
			);
		}

		for (
			let i = 0;
			i < Math.min(actualTypes.length, expectedTypes.length);
			i++
		) {
			if (actualTypes[i] !== expectedTypes[i]) {
				differences.push(
					`Declaration type mismatch at index ${i}: expected ${expectedTypes[i]}, got ${actualTypes[i]}`,
				);
			}
		}

		return {
			matches: differences.length === 0,
			differences,
			typescriptOutput: actualTypes,
		};
	}
}

/**
 * Test runner for systematic testing
 */
export class TestRunner {
	/**
	 * Run a single test case
	 */
	static runTestCase(testCase: TestCase): void {
		test(testCase.name, () => {
			const result = parseString(testCase.input);

			if (testCase.expectedSuccess) {
				expect(result._tag).toBe("Right");

				if (result._tag === "Right") {
					const parsed = result.value;

					// Check declaration count
					if (testCase.expectedDeclarationCount !== undefined) {
						expect(parsed.members.length).toBe(
							testCase.expectedDeclarationCount,
						);
					}

					// Check declaration types
					if (testCase.expectedDeclarationTypes) {
						const comparison = ASTComparator.compareDeclarationTypes(
							parsed.members.toArray(),
							testCase.expectedDeclarationTypes,
						);
						expect(comparison.matches).toBe(true);
						if (!comparison.matches) {
							console.error(
								"Declaration type comparison failed:",
								comparison.differences,
							);
						}
					}
				}
			} else {
				expect(result._tag).toBe("Left");

				if (result._tag === "Left" && testCase.expectedErrors) {
					const errorMessage = result.value;
					const hasExpectedError = testCase.expectedErrors.some(
						(expectedError) => errorMessage.includes(expectedError),
					);
					expect(hasExpectedError).toBe(true);
				}
			}
		});
	}

	/**
	 * Run multiple test cases in a describe block
	 */
	static runTestSuite(suiteName: string, testCases: TestCase[]): void {
		describe(suiteName, () => {
			testCases.forEach((testCase) => {
				TestRunner.runTestCase(testCase);
			});
		});
	}

	/**
	 * Run all generated test cases
	 */
	static runAllTests(): void {
		const allTests = TestDataGenerator.generateAllTests();
		const testsByCategory = new Map<TestCategory, TestCase[]>();

		// Group tests by category
		allTests.forEach((test) => {
			if (!testsByCategory.has(test.category)) {
				testsByCategory.set(test.category, []);
			}
			testsByCategory.get(test.category)!.push(test);
		});

		// Run tests by category
		testsByCategory.forEach((tests, category) => {
			TestRunner.runTestSuite(category, tests);
		});
	}
}

/**
 * Performance testing utilities
 */
export class PerformanceTester {
	/**
	 * Measure parsing performance
	 */
	static measureParsingTime(input: string, iterations: number = 100): number {
		const start = performance.now();

		for (let i = 0; i < iterations; i++) {
			parseString(input);
		}

		const end = performance.now();
		return (end - start) / iterations; // Average time per parse
	}

	/**
	 * Create performance benchmark
	 */
	static createBenchmark(testCases: TestCase[]): Map<string, number> {
		const results = new Map<string, number>();

		testCases.forEach((testCase) => {
			if (testCase.expectedSuccess) {
				const avgTime = PerformanceTester.measureParsingTime(testCase.input);
				results.set(testCase.name, avgTime);
			}
		});

		return results;
	}
}
