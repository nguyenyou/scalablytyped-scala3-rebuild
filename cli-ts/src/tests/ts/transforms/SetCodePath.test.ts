/**
 * Tests for SetCodePath transform.
 *
 * Port of org.scalablytyped.converter.internal.ts.transforms.SetCodePathTests
 */

import { describe, expect, it } from "vitest";
import { IArray } from "@/internal/IArray.js";
import { CodePathNoPath } from "@/internal/ts/CodePath.js";
import { AbstractTreeTransformation } from "@/internal/ts/TreeTransformation.js";
import { SetCodePathTransform } from "@/internal/ts/transforms/SetCodePath.js";
import { TsIdentGlobal } from "@/internal/ts/trees.js";
import {
	createCodePathWithParts,
	createMockClass,
	createMockFunction,
	createMockGlobal,
	createMockInterface,
	createMockModule,
	createMockNamespace,
	createMockParsedFile,
	createMockVariable,
} from "@/tests/utils/TestUtils.js";

describe("SetCodePath", () => {
	describe("Basic Functionality", () => {
		it("extends AbstractTreeTransformation", () => {
			expect(SetCodePathTransform).toBeInstanceOf(AbstractTreeTransformation);
		});

		it("has enterTsDecl method", () => {
			const codePath = createCodePathWithParts("test-lib", "path");
			const clazz = createMockClass("TestClass");
			const result = SetCodePathTransform.enterTsDecl(codePath)(clazz);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsDeclClass");
		});

		it("has enterTsContainer method", () => {
			const codePath = createCodePathWithParts("test-lib", "path");
			const namespace = createMockNamespace("TestNamespace");
			const result = SetCodePathTransform.enterTsContainer(codePath)(namespace);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsDeclNamespace");
		});

		it("has enterTsParsedFile method", () => {
			const codePath = createCodePathWithParts("test-lib", "path");
			const parsedFile = createMockParsedFile("test-lib");
			const result =
				SetCodePathTransform.enterTsParsedFile(codePath)(parsedFile);
			expect(result).toBeDefined();
			expect(result._tag).toBe("TsParsedFile");
		});

		it("has withTree method", () => {
			const codePath = createCodePathWithParts("test-lib", "path");
			const clazz = createMockClass("TestClass");
			const result = SetCodePathTransform.withTree(codePath, clazz);
			expect(result).toBeDefined();
			expect(result._tag).toBe("HasPath");
		});
	});

	describe("Code Path Setting on Declarations", () => {
		it("sets code path on class declaration", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const clazz = createMockClass("TestClass");

			const result = SetCodePathTransform.enterTsDecl(codePath)(clazz);

			expect(result._tag).toBe("TsDeclClass");
			const resultClass = result as any;
			expect(resultClass.codePath).toBe(codePath);
			expect(resultClass.name.value).toBe("TestClass");
		});

		it("sets code path on interface declaration", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const interface_ = createMockInterface("TestInterface");

			const result = SetCodePathTransform.enterTsDecl(codePath)(interface_);

			expect(result._tag).toBe("TsDeclInterface");
			const resultInterface = result as any;
			expect(resultInterface.codePath).toBe(codePath);
			expect(resultInterface.name.value).toBe("TestInterface");
		});

		it("sets code path on function declaration", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const func = createMockFunction("testFunc");

			const result = SetCodePathTransform.enterTsDecl(codePath)(func);

			expect(result._tag).toBe("TsDeclFunction");
			const resultFunc = result as any;
			expect(resultFunc.codePath).toBe(codePath);
			expect(resultFunc.name.value).toBe("testFunc");
		});

		it("sets code path on variable declaration", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const variable = createMockVariable("testVar");

			const result = SetCodePathTransform.enterTsDecl(codePath)(variable);

			expect(result._tag).toBe("TsDeclVar");
			const resultVar = result as any;
			expect(resultVar.codePath).toBe(codePath);
			expect(resultVar.name.value).toBe("testVar");
		});

		it("sets code path on namespace declaration", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const namespace = createMockNamespace("TestNamespace");

			const result = SetCodePathTransform.enterTsDecl(codePath)(namespace);

			expect(result._tag).toBe("TsDeclNamespace");
			const resultNamespace = result as any;
			expect(resultNamespace.codePath).toBe(codePath);
			expect(resultNamespace.name.value).toBe("TestNamespace");
		});

		it("sets code path on module declaration", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const module = createMockModule("TestModule");

			const result = SetCodePathTransform.enterTsDecl(codePath)(module);

			expect(result._tag).toBe("TsDeclModule");
			const resultModule = result as any;
			expect(resultModule.codePath).toBe(codePath);
		});

		it("leaves non-CodePath.Has declarations unchanged", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			// Create a mock declaration that doesn't implement HasCodePath
			const exportDecl = {
				_tag: "TsExport" as const,
				comments: {} as any,
				declared: false,
				exportType: {} as any,
				exportee: {} as any,
				asString: "TsExport(test)",
			};

			const result = SetCodePathTransform.enterTsDecl(codePath)(
				exportDecl as any,
			);

			expect(result).toBe(exportDecl); // Should remain unchanged
		});
	});

	describe("Code Path Setting on Containers", () => {
		it("sets code path on namespace container", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const namespace = createMockNamespace("TestNamespace");

			const result = SetCodePathTransform.enterTsContainer(codePath)(namespace);

			expect(result._tag).toBe("TsDeclNamespace");
			const resultNamespace = result as any;
			expect(resultNamespace.codePath).toBe(codePath);
		});

		it("sets code path on module container", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const module = createMockModule("TestModule");

			const result = SetCodePathTransform.enterTsContainer(codePath)(module);

			expect(result._tag).toBe("TsDeclModule");
			const resultModule = result as any;
			expect(resultModule.codePath).toBe(codePath);
		});

		it("sets code path on global container", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const global = createMockGlobal();

			const result = SetCodePathTransform.enterTsContainer(codePath)(global);

			expect(result._tag).toBe("TsGlobal");
			const resultGlobal = result as any;
			expect(resultGlobal.codePath).toBe(codePath);
		});

		it("handles containers with CodePath.Has trait", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			// TsAugmentedModule implements HasCodePath
			const augmentedModule = {
				_tag: "TsAugmentedModule" as const,
				comments: {} as any,
				name: {} as any,
				members: IArray.Empty,
				codePath: CodePathNoPath,
				jsLocation: {} as any,
				withCodePath: (newCodePath: any) => ({
					...augmentedModule,
					codePath: newCodePath,
				}),
			};

			const result = SetCodePathTransform.enterTsContainer(codePath)(
				augmentedModule as any,
			);

			expect(result._tag).toBe("TsAugmentedModule");
			const resultAugmented = result as any;
			expect(resultAugmented.codePath).toBe(codePath); // Should be updated
		});
	});

	describe("Code Path Setting on Parsed Files", () => {
		it("sets code path on parsed file", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const parsedFile = createMockParsedFile("test-lib");

			const result =
				SetCodePathTransform.enterTsParsedFile(codePath)(parsedFile);

			expect(result._tag).toBe("TsParsedFile");
			const resultFile = result as any;
			expect(resultFile.codePath).toBe(codePath);
		});
	});

	describe("Tree Navigation", () => {
		it("navigates into named declaration", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const clazz = createMockClass("TestClass");

			const result = SetCodePathTransform.withTree(codePath, clazz);

			expect(result._tag).toBe("HasPath");
			expect(result.inLibrary.value).toBe("test-lib");
			// Should have added TestClass identifier to the path
			expect(result.codePathPart.parts.toArray().map((p) => p.value)).toEqual([
				"module",
				"TestClass",
			]);
		});

		it("navigates into global declaration", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const global = createMockGlobal();

			const result = SetCodePathTransform.withTree(codePath, global);

			expect(result._tag).toBe("HasPath");
			expect(result.inLibrary.value).toBe("test-lib");
			// Should have added Global identifier to the path
			const lastPart = result.codePathPart.parts.toArray().slice(-1)[0];
			expect(lastPart).toBe(TsIdentGlobal);
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("handles null containers gracefully", () => {
			const codePath = createCodePathWithParts("test-lib", "module");

			expect(() => {
				SetCodePathTransform.enterTsContainer(codePath)(null as any);
			}).not.toThrow();
		});

		it("handles very long code paths", () => {
			const codePath = createCodePathWithParts(
				"test-lib",
				"level1",
				"level2",
				"level3",
				"level4",
				"level5",
			);
			const func = createMockFunction("deepFunc");

			const result = SetCodePathTransform.enterTsDecl(codePath)(func);

			expect(result._tag).toBe("TsDeclFunction");
			const resultFunc = result as any;
			expect(resultFunc.codePath).toBe(codePath);
			expect(resultFunc.codePath.codePathPart.parts.length).toBe(5);
		});

		it("handles complex nested structures", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const innerClass = createMockClass("InnerClass");
			const outerClass = createMockClass(
				"OuterClass",
				undefined,
				IArray.fromArray([innerClass as any]),
			);
			const namespace = createMockNamespace(
				"TestNamespace",
				IArray.fromArray([outerClass as any]),
			);

			const result = SetCodePathTransform.enterTsContainer(codePath)(namespace);

			expect(result._tag).toBe("TsDeclNamespace");
			const resultNamespace = result as any;
			expect(resultNamespace.codePath).toBe(codePath);
			// Members should remain unchanged (transform doesn't recursively process)
			expect(resultNamespace.members.length).toBe(1);
		});
	});

	describe("Integration Scenarios", () => {
		it("handles real-world library structure", () => {
			// Simulate: @types/node/fs module structure
			const codePath = createCodePathWithParts("@types/node", "fs");
			const readFileFunc = createMockFunction("readFile");
			const writeFileFunc = createMockFunction("writeFile");
			const statsClass = createMockClass("Stats");
			const fsNamespace = createMockNamespace(
				"fs",
				IArray.fromArray([
					readFileFunc as any,
					writeFileFunc as any,
					statsClass as any,
				]),
			);

			const result =
				SetCodePathTransform.enterTsContainer(codePath)(fsNamespace);

			expect(result._tag).toBe("TsDeclNamespace");
			const resultNamespace = result as any;
			expect(resultNamespace.codePath).toBe(codePath);
			expect(resultNamespace.name.value).toBe("fs");
			expect(resultNamespace.members.length).toBe(3);
		});

		it("singleton instance works correctly", () => {
			const codePath = createCodePathWithParts("test-lib", "module");
			const clazz = createMockClass("TestClass");

			const result = SetCodePathTransform.enterTsDecl(codePath)(clazz);

			expect(result._tag).toBe("TsDeclClass");
			const resultClass = result as any;
			expect(resultClass.codePath).toBe(codePath);
		});
	});
});
