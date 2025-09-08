/**
 * Test utilities for TsParser testing and validation
 * 
 * Provides comprehensive testing infrastructure for comparing Scala and TypeScript
 * parser outputs, including AST comparison functions and test data generators.
 */

import { describe, expect, test } from "vitest";
import { parseString, type Either } from "./TsParser.js";
import type { 
    TsParsedFile, 
    TsContainerOrDecl, 
    TsDeclInterface, 
    TsDeclTypeAlias, 
    TsDeclVar,
    TsDeclFunction,
    TsDeclNamespace,
    TsDeclModule,
    TsGlobal,
    TsImport,
    TsExport,
    TsDeclEnum,
    TsDeclClass,
    TsType,
    TsMember
} from "../trees.js";

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
    EDGE_CASES = "Edge Cases"
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
                category: TestCategory.DECLARATIONS
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
                category: TestCategory.DECLARATIONS
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
                category: TestCategory.DECLARATIONS
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
                category: TestCategory.DECLARATIONS
            }
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
                category: TestCategory.DECLARATIONS
            },
            {
                name: "union type alias",
                description: "Type alias with union types",
                input: "type Status = 'pending' | 'approved' | 'rejected';",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclTypeAlias"],
                category: TestCategory.TYPES
            },
            {
                name: "object type alias",
                description: "Type alias with object type",
                input: "type Point = { x: number; y: number; };",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclTypeAlias"],
                category: TestCategory.TYPES
            },
            {
                name: "function type alias",
                description: "Type alias with function type",
                input: "type Handler = (event: Event) => void;",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclTypeAlias"],
                category: TestCategory.TYPES
            }
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
                category: TestCategory.DECLARATIONS
            },
            {
                name: "const variable",
                description: "Immutable variable declaration",
                input: "const PI: number = 3.14159;",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclVar"],
                category: TestCategory.DECLARATIONS
            },
            {
                name: "var variable",
                description: "Legacy variable declaration",
                input: "var global: any;",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclVar"],
                category: TestCategory.DECLARATIONS
            }
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
                category: TestCategory.ERROR_HANDLING
            },
            {
                name: "malformed type alias",
                description: "Type alias with incomplete union",
                input: "type Status = 'pending' |",
                expectedSuccess: false,
                expectedErrors: ["Parse error"],
                category: TestCategory.ERROR_HANDLING
            },
            {
                name: "invalid syntax",
                description: "Completely invalid TypeScript syntax",
                input: "interface { invalid syntax",
                expectedSuccess: false,
                expectedErrors: ["Parse error"],
                category: TestCategory.ERROR_HANDLING
            }
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
                category: TestCategory.DIRECTIVES
            },
            {
                name: "types reference directive",
                description: "Triple-slash types reference directive",
                input: `/// <reference types="node" />\ninterface Test { }`,
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclInterface"],
                category: TestCategory.DIRECTIVES
            },
            {
                name: "path reference directive",
                description: "Triple-slash path reference directive",
                input: `/// <reference path="./types.d.ts" />\ninterface Test { }`,
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclInterface"],
                category: TestCategory.DIRECTIVES
            },
            {
                name: "no-default-lib directive",
                description: "Triple-slash no-default-lib directive",
                input: `/// <reference no-default-lib="true" />\ninterface Test { }`,
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclInterface"],
                category: TestCategory.DIRECTIVES
            },
            {
                name: "amd-module directive",
                description: "Triple-slash amd-module directive",
                input: `/// <amd-module name="myModule" />\ninterface Test { }`,
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclInterface"],
                category: TestCategory.DIRECTIVES
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
                category: TestCategory.DIRECTIVES
            }
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
                category: TestCategory.EDGE_CASES
            },
            {
                name: "typescript shebang",
                description: "TypeScript shebang line",
                input: `#!/usr/bin/env ts-node\ninterface Test { }`,
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclInterface"],
                category: TestCategory.EDGE_CASES
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
                category: TestCategory.EDGE_CASES
            }
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
                category: TestCategory.TYPES
            },
            {
                name: "generic interface with constraint",
                description: "Interface with constrained type parameter",
                input: "interface Comparable<T extends string> { compare(other: T): number; }",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclInterface"],
                category: TestCategory.TYPES
            },
            {
                name: "generic interface with default",
                description: "Interface with default type parameter",
                input: "interface Optional<T = string> { value?: T; }",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclInterface"],
                category: TestCategory.TYPES
            },
            {
                name: "multiple type parameters",
                description: "Interface with multiple type parameters",
                input: "interface Map<K, V> { get(key: K): V; set(key: K, value: V): void; }",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclInterface"],
                category: TestCategory.TYPES
            },
            {
                name: "generic type alias",
                description: "Type alias with type parameter",
                input: "type Result<T> = T | Error;",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclTypeAlias"],
                category: TestCategory.TYPES
            },
            {
                name: "complex generic type alias",
                description: "Type alias with multiple constrained type parameters",
                input: "type Mapper<T extends object, U = string> = (input: T) => U;",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclTypeAlias"],
                category: TestCategory.TYPES
            }
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
                category: TestCategory.DECLARATIONS
            },
            {
                name: "declared namespace",
                description: "Ambient namespace declaration",
                input: "declare namespace MyNamespace { interface Test { } }",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclNamespace"],
                category: TestCategory.DECLARATIONS
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
                category: TestCategory.DECLARATIONS
            },
            {
                name: "empty namespace",
                description: "Namespace with no members",
                input: "namespace Empty { }",
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclNamespace"],
                category: TestCategory.DECLARATIONS
            }
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
                category: TestCategory.DECLARATIONS
            },
            {
                name: "declared module",
                description: "Ambient module declaration",
                input: 'declare module "my-module" { interface Test { } }',
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclModule"],
                category: TestCategory.DECLARATIONS
            },
            {
                name: "scoped module",
                description: "Scoped module declaration",
                input: 'declare module "@types/node" { interface Test { } }',
                expectedSuccess: true,
                expectedDeclarationCount: 1,
                expectedDeclarationTypes: ["TsDeclModule"],
                category: TestCategory.DECLARATIONS
            }
        ];
    }

    /**
     * Generate all test cases
     */
    static generateAllTests(): TestCase[] {
        return [
            ...this.generateInterfaceTests(),
            ...this.generateTypeAliasTests(),
            ...this.generateVariableTests(),
            ...this.generateErrorTests(),
            ...this.generateDirectiveTests(),
            ...this.generateShebangTests(),
            ...this.generateGenericTests(),
            ...this.generateNamespaceTests(),
            ...this.generateModuleTests()
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
    static compareParsedFiles(ts: TsParsedFile, expected: Partial<TsParsedFile>): ComparisonResult {
        const differences: string[] = [];

        // Compare member count
        if (expected.members && ts.members.length !== expected.members.length) {
            differences.push(`Member count mismatch: expected ${expected.members.length}, got ${ts.members.length}`);
        }

        // Compare directives count
        if (expected.directives && ts.directives.length !== expected.directives.length) {
            differences.push(`Directive count mismatch: expected ${expected.directives.length}, got ${ts.directives.length}`);
        }

        // Compare comments
        if (expected.comments && ts.comments.cs.length !== expected.comments.cs.length) {
            differences.push(`Comment count mismatch: expected ${expected.comments.cs.length}, got ${ts.comments.cs.length}`);
        }

        return {
            matches: differences.length === 0,
            differences,
            typescriptOutput: ts
        };
    }

    /**
     * Compare declaration types
     */
    static compareDeclarationTypes(declarations: readonly TsContainerOrDecl[], expectedTypes: string[]): ComparisonResult {
        const differences: string[] = [];
        const actualTypes = declarations.map(decl => decl._tag);

        if (actualTypes.length !== expectedTypes.length) {
            differences.push(`Declaration count mismatch: expected ${expectedTypes.length}, got ${actualTypes.length}`);
        }

        for (let i = 0; i < Math.min(actualTypes.length, expectedTypes.length); i++) {
            if (actualTypes[i] !== expectedTypes[i]) {
                differences.push(`Declaration type mismatch at index ${i}: expected ${expectedTypes[i]}, got ${actualTypes[i]}`);
            }
        }

        return {
            matches: differences.length === 0,
            differences,
            typescriptOutput: actualTypes
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
                        expect(parsed.members.length).toBe(testCase.expectedDeclarationCount);
                    }

                    // Check declaration types
                    if (testCase.expectedDeclarationTypes) {
                        const comparison = ASTComparator.compareDeclarationTypes(
                            parsed.members.toArray(), 
                            testCase.expectedDeclarationTypes
                        );
                        expect(comparison.matches).toBe(true);
                        if (!comparison.matches) {
                            console.error("Declaration type comparison failed:", comparison.differences);
                        }
                    }
                }
            } else {
                expect(result._tag).toBe("Left");
                
                if (result._tag === "Left" && testCase.expectedErrors) {
                    const errorMessage = result.value;
                    const hasExpectedError = testCase.expectedErrors.some(expectedError => 
                        errorMessage.includes(expectedError)
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
            testCases.forEach(testCase => {
                this.runTestCase(testCase);
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
        allTests.forEach(test => {
            if (!testsByCategory.has(test.category)) {
                testsByCategory.set(test.category, []);
            }
            testsByCategory.get(test.category)!.push(test);
        });

        // Run tests by category
        testsByCategory.forEach((tests, category) => {
            this.runTestSuite(category, tests);
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
        
        testCases.forEach(testCase => {
            if (testCase.expectedSuccess) {
                const avgTime = this.measureParsingTime(testCase.input);
                results.set(testCase.name, avgTime);
            }
        });
        
        return results;
    }
}
