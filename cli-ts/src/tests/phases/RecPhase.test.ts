/**
 * TypeScript port of RecPhase tests
 * Ensures identical behavior to the Scala implementation
 */

import { none, some } from "fp-ts/Option";
import { describe, expect, test } from "bun:test";
import { Logger } from "../../internal/logging";
import { PhaseRes } from "../../internal/phases/PhaseRes";
import { RecPhase, RecPhaseInitial } from "../../internal/phases/RecPhase";
import type { GetDeps, IsCircular, Phase } from "../../internal/phases/types";

// Test helper types
type TestId = string;
interface TestValue {
	data: string;
	step: number;
}

const _mockLogger = Logger.DevNull();

// Helper phase functions
const identityPhase =
	<Id, T>(): Phase<Id, T, T> =>
	(
		_id: Id,
		value: T,
		_getDeps: GetDeps<Id, T>,
		_isCircular: IsCircular,
		_logger: Logger<void>,
	) =>
		PhaseRes.Ok(value);

const transformPhase =
	(transform: (s: string) => string): Phase<TestId, TestValue, TestValue> =>
	(
		_id: TestId,
		value: TestValue,
		_getDeps: GetDeps<TestId, TestValue>,
		_isCircular: IsCircular,
		_logger: Logger<void>,
	) =>
		PhaseRes.Ok({ data: transform(value.data), step: value.step + 1 });

describe("RecPhase", () => {
	describe("RecPhase factory", () => {
		test("should create Initial phase", () => {
			const phase = RecPhase.apply<TestId>();
			expect(phase).toBeInstanceOf(RecPhaseInitial);
			expect(RecPhase.isInitial(phase)).toBe(true);
			expect(RecPhase.isNext(phase)).toBe(false);
		});
	});

	describe("RecPhase.Initial", () => {
		test("should be identified as Initial", () => {
			const initial = new RecPhaseInitial<TestId>();
			expect(RecPhase.isInitial(initial)).toBe(true);
			expect(RecPhase.isNext(initial)).toBe(false);
		});

		test("should chain with next phase", () => {
			const initial = RecPhase.apply<TestId>();
			const phase1 = initial.next(identityPhase<TestId, TestId>(), "identity");

			expect(RecPhase.isNext(phase1)).toBe(true);
			expect(RecPhase.isInitial(phase1)).toBe(false);

			if (RecPhase.isNext(phase1)) {
				expect(phase1.name).toBe("identity");
				expect(phase1.prev).toBe(initial);
			}
		});
	});

	describe("RecPhase.Next", () => {
		test("should chain multiple phases", () => {
			const initial = RecPhase.apply<TestId>();

			// First convert TestId to TestValue
			const toTestValuePhase: Phase<TestId, TestId, TestValue> = (
				_id: TestId,
				value: TestId,
				_getDeps: GetDeps<TestId, TestValue>,
				_isCircular: IsCircular,
				_logger: Logger<void>,
			) => PhaseRes.Ok({ data: value, step: 0 });

			const phase1 = initial.next(toTestValuePhase, "to-testvalue");
			const phase2 = phase1.next(
				transformPhase((s) => s.toUpperCase()),
				"uppercase",
			);
			const phase3 = phase2.next(
				transformPhase((s) => `${s}!`),
				"exclamation",
			);

			expect(RecPhase.isNext(phase1)).toBe(true);
			expect(RecPhase.isNext(phase2)).toBe(true);
			expect(RecPhase.isNext(phase3)).toBe(true);

			if (RecPhase.isNext(phase1)) {
				expect(phase1.name).toBe("to-testvalue");
			}
			if (RecPhase.isNext(phase2)) {
				expect(phase2.name).toBe("uppercase");
			}
			if (RecPhase.isNext(phase3)) {
				expect(phase3.name).toBe("exclamation");
			}
		});

		test("should support nextOpt with Some", () => {
			const initial = RecPhase.apply<TestId>();

			const toTestValuePhase: Phase<TestId, TestId, TestValue> = (
				_id: TestId,
				value: TestId,
				_getDeps: GetDeps<TestId, TestValue>,
				_isCircular: IsCircular,
				_logger: Logger<void>,
			) => PhaseRes.Ok({ data: value, step: 0 });

			const phase1 = initial.next(toTestValuePhase, "to-testvalue");
			const phase2 = phase1.nextOpt(
				some(transformPhase((s) => s.toUpperCase())),
				"optional-uppercase",
			);

			expect(RecPhase.isNext(phase2)).toBe(true);
			if (RecPhase.isNext(phase2)) {
				expect(phase2.name).toBe("optional-uppercase");
				expect(phase2.prev).toBe(phase1);
			}
		});

		test("should support nextOpt with None", () => {
			const initial = RecPhase.apply<TestId>();

			const toTestValuePhase: Phase<TestId, TestId, TestValue> = (
				_id: TestId,
				value: TestId,
				_getDeps: GetDeps<TestId, TestValue>,
				_isCircular: IsCircular,
				_logger: Logger<void>,
			) => PhaseRes.Ok({ data: value, step: 0 });

			const phase1 = initial.next(toTestValuePhase, "to-testvalue");
			const phase2 = phase1.nextOpt(none, "skipped-phase");

			// Should return the same phase since None was passed
			expect(phase2).toBe(phase1);
		});
	});

	describe("RecPhase composition patterns", () => {
		test("should support complex phase pipelines", () => {
			// First convert to TestValue
			const toTestValuePhase: Phase<TestId, TestId, TestValue> = (
				_id: TestId,
				value: TestId,
				_getDeps: GetDeps<TestId, TestValue>,
				_isCircular: IsCircular,
				_logger: Logger<void>,
			) => PhaseRes.Ok({ data: value, step: 0 });

			const pipeline = RecPhase.apply<TestId>()
				.next(toTestValuePhase, "to-testvalue")
				.next(
					transformPhase((s) => s.toLowerCase()),
					"lowercase",
				)
				.next(
					transformPhase((s) => s.charAt(0).toUpperCase() + s.slice(1)),
					"capitalize",
				)
				.nextOpt(some(transformPhase((s) => `${s} World`)), "greeting")
				.nextOpt(none, "skipped-step")
				.next(
					transformPhase((s) => s.replace(" ", "_")),
					"underscore",
				);

			// Should be a Next phase
			expect(RecPhase.isNext(pipeline)).toBe(true);
		});

		test("should maintain type safety through chaining", () => {
			const initial = RecPhase.apply<TestId>();

			// Type should be RecPhase<TestId, TestId>
			expect(initial).toBeInstanceOf(RecPhaseInitial);

			const toTestValuePhase: Phase<TestId, TestId, TestValue> = (
				_id: TestId,
				value: TestId,
				_getDeps: GetDeps<TestId, TestValue>,
				_isCircular: IsCircular,
				_logger: Logger<void>,
			) => PhaseRes.Ok({ data: value, step: 0 });

			const phase1 = initial.next(toTestValuePhase, "to-testvalue");
			// Type should be RecPhase<TestId, TestValue>
			expect(RecPhase.isNext(phase1)).toBe(true);

			const phase2 = phase1.next(
				transformPhase((s) => s.toUpperCase()),
				"uppercase",
			);
			// Type should still be RecPhase<TestId, TestValue>
			expect(RecPhase.isNext(phase2)).toBe(true);

			if (RecPhase.isNext(phase1) && RecPhase.isNext(phase2)) {
				expect(phase1.name).toBe("to-testvalue");
				expect(phase2.name).toBe("uppercase");
				expect(phase2.prev).toBe(phase1);
			}
		});

		test("should handle phase caching", () => {
			const initial = RecPhase.apply<TestId>();

			const toTestValuePhase: Phase<TestId, TestId, TestValue> = (
				_id: TestId,
				value: TestId,
				_getDeps: GetDeps<TestId, TestValue>,
				_isCircular: IsCircular,
				_logger: Logger<void>,
			) => PhaseRes.Ok({ data: value, step: 0 });

			const phase1 = initial.next(toTestValuePhase, "to-testvalue");

			expect(RecPhase.isNext(phase1)).toBe(true);
			if (RecPhase.isNext(phase1)) {
				expect(phase1.cache).toBeDefined();
				expect(phase1.cache.size).toBe(0); // Should start empty
			}
		});
	});

	describe("RecPhase edge cases", () => {
		test("should handle empty phase names", () => {
			const initial = RecPhase.apply<TestId>();
			const phase = initial.next(identityPhase<TestId, TestId>(), "");

			expect(RecPhase.isNext(phase)).toBe(true);
			if (RecPhase.isNext(phase)) {
				expect(phase.name).toBe("");
			}
		});

		test("should handle phases with special characters in names", () => {
			const initial = RecPhase.apply<TestId>();
			const specialName = "phase-with_special.chars@123!";
			const phase = initial.next(identityPhase<TestId, TestId>(), specialName);

			expect(RecPhase.isNext(phase)).toBe(true);
			if (RecPhase.isNext(phase)) {
				expect(phase.name).toBe(specialName);
			}
		});

		test("should support deeply nested phase chains", () => {
			const initial = RecPhase.apply<TestId>();

			const toTestValuePhase: Phase<TestId, TestId, TestValue> = (
				_id: TestId,
				value: TestId,
				_getDeps: GetDeps<TestId, TestValue>,
				_isCircular: IsCircular,
				_logger: Logger<void>,
			) => PhaseRes.Ok({ data: value, step: 0 });

			let current = initial.next(toTestValuePhase, "initial");

			// Chain many phases
			for (let i = 0; i < 10; i++) {
				current = current.next(
					transformPhase((s) => s + i),
					`phase-${i}`,
				);
			}

			expect(RecPhase.isNext(current)).toBe(true);
			if (RecPhase.isNext(current)) {
				expect(current.name).toBe("phase-9");
			}
		});
	});
});
