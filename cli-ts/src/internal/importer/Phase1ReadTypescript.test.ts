/**
 * Test suite for Phase1ReadTypescript
 */

import { describe, test, expect } from "bun:test";
import { right } from "fp-ts/Either";
import { Phase1ReadTypescript, type Phase1Config } from "./Phase1ReadTypescript";
import { IArray } from "../IArray";
import { TsIdent, TsParsedFile } from "../ts/trees";
import { Comments } from "../Comments";
import { CodePath } from "../ts/CodePath";
import { createMockLogger } from "../../tests/utils/TestUtils";

const createMockConfig = (): Phase1Config => ({
	parser: () => right(TsParsedFile.create(
		Comments.empty(),
		IArray.Empty,
		IArray.Empty,
		CodePath.noPath()
	)),
	resolve: {} as any,
	calculateLibraryVersion: {} as any,
	expandTypeMappings: {} as any,
	ignoredModulePrefixes: new Set(),
	ignored: new Set() as any,
	pedantic: false,
});

describe("Phase1ReadTypescript", () => {
	test("should create instance with valid config", () => {
		const config = createMockConfig();
		const phase1 = new Phase1ReadTypescript(config);
		expect(phase1).toBeInstanceOf(Phase1ReadTypescript);
	});

	test("should create instance via static create method", () => {
		const config = createMockConfig();
		const phase1 = Phase1ReadTypescript.create(config);
		expect(phase1).toBeInstanceOf(Phase1ReadTypescript);
	});

	test("should create transformation pipeline", () => {
		const mockScope = {
			libName: TsIdent.librarySimple("test"),
			enableUnqualifiedLookup: () => ({ caching: () => mockScope }),
			caching: () => mockScope
		} as any;

		const logger = createMockLogger();
		const transformations = Phase1ReadTypescript.createPipeline(
			mockScope,
			TsIdent.librarySimple("test"),
			{ apply: () => false } as any,
			false,
			logger
		);

		expect(transformations).toBeInstanceOf(Array);
		expect(transformations.length).toBeGreaterThan(0);
	});
});
