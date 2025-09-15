/**
 * TypeScript port of PhaseRes tests
 * Ensures identical behavior to the Scala implementation
 */

import { type Either, left, right } from "fp-ts/Either";
import { describe, expect, test } from "bun:test";
import { Logger } from "@/internal/logging";
import {
	flatMap,
	forEach,
	isFailure,
	isIgnore,
	isOk,
	map,
	PhaseRes,
} from "@/internal/phases";

// Test helper types
type TestId = string;
interface TestValue {
	data: string;
}

const mockLogger = Logger.DevNull();

describe("PhaseRes", () => {
	describe("PhaseRes.Ok", () => {
		test("should create Ok with value", () => {
			const value: TestValue = { data: "test" };
			const result = PhaseRes.Ok<TestId, TestValue>(value);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value).toEqual(value);
			}
		});

		test("map should transform value", () => {
			const original = PhaseRes.Ok<TestId, TestValue>({ data: "test" });
			const mapped = map<TestId, TestValue, string>((v) =>
				v.data.toUpperCase(),
			)(original);

			expect(isOk(mapped)).toBe(true);
			if (isOk(mapped)) {
				expect(mapped.value).toBe("TEST");
			}
		});

		test("flatMap should chain computations", () => {
			const original = PhaseRes.Ok<TestId, TestValue>({ data: "test" });
			const chained = flatMap<TestId, TestValue, string>((v) =>
				PhaseRes.Ok<TestId, string>(v.data.toUpperCase()),
			)(original);

			expect(isOk(chained)).toBe(true);
			if (isOk(chained)) {
				expect(chained.value).toBe("TEST");
			}
		});

		test("flatMap should propagate failures", () => {
			const original = PhaseRes.Ok<TestId, TestValue>({ data: "test" });
			const errors = new Map<TestId, Either<Error, string>>([
				["id1", right("error")],
			]);
			const chained = flatMap<TestId, TestValue, string>((_) =>
				PhaseRes.Failure<TestId, string>(errors),
			)(original);

			expect(isFailure(chained)).toBe(true);
			if (isFailure(chained)) {
				expect(chained.errors).toEqual(errors);
			}
		});

		test("forEach should perform side effect", () => {
			const original = PhaseRes.Ok<TestId, TestValue>({ data: "test" });
			let sideEffect = "";
			const result = forEach<TestId, TestValue>((v) => {
				sideEffect = v.data;
			})(original);

			expect(sideEffect).toBe("test");
			expect(isOk(result)).toBe(true);
		});
	});

	describe("PhaseRes.Ignore", () => {
		test("should create Ignore", () => {
			const result = PhaseRes.Ignore<TestId, TestValue>();
			expect(isIgnore(result)).toBe(true);
		});

		test("map should preserve Ignore", () => {
			const original = PhaseRes.Ignore<TestId, TestValue>();
			const mapped = map<TestId, TestValue, string>((v) =>
				v.data.toUpperCase(),
			)(original);
			expect(isIgnore(mapped)).toBe(true);
		});

		test("flatMap should preserve Ignore", () => {
			const original = PhaseRes.Ignore<TestId, TestValue>();
			const chained = flatMap<TestId, TestValue, string>((v) =>
				PhaseRes.Ok<TestId, string>(v.data),
			)(original);
			expect(isIgnore(chained)).toBe(true);
		});

		test("forEach should preserve Ignore", () => {
			const original = PhaseRes.Ignore<TestId, TestValue>();
			let sideEffect = "";
			const result = forEach<TestId, TestValue>((v) => {
				sideEffect = v.data;
			})(original);

			expect(sideEffect).toBe(""); // Side effect should not execute
			expect(isIgnore(result)).toBe(true);
		});
	});

	describe("PhaseRes.Failure", () => {
		const testErrors = new Map<TestId, Either<Error, string>>([
			["id1", right("error message")],
			["id2", left(new Error("exception"))],
		]);

		test("should create Failure with errors", () => {
			const result = PhaseRes.Failure<TestId, TestValue>(testErrors);
			expect(isFailure(result)).toBe(true);
			if (isFailure(result)) {
				expect(result.errors).toEqual(testErrors);
			}
		});

		test("map should preserve Failure", () => {
			const original = PhaseRes.Failure<TestId, TestValue>(testErrors);
			const mapped = map<TestId, TestValue, string>((v) =>
				v.data.toUpperCase(),
			)(original);

			expect(isFailure(mapped)).toBe(true);
			if (isFailure(mapped)) {
				expect(mapped.errors).toEqual(testErrors);
			}
		});

		test("flatMap should preserve Failure", () => {
			const original = PhaseRes.Failure<TestId, TestValue>(testErrors);
			const chained = flatMap<TestId, TestValue, string>((v) =>
				PhaseRes.Ok<TestId, string>(v.data),
			)(original);

			expect(isFailure(chained)).toBe(true);
			if (isFailure(chained)) {
				expect(chained.errors).toEqual(testErrors);
			}
		});

		test("forEach should preserve Failure", () => {
			const original = PhaseRes.Failure<TestId, TestValue>(testErrors);
			let sideEffect = "";
			const result = forEach<TestId, TestValue>((v) => {
				sideEffect = v.data;
			})(original);

			expect(sideEffect).toBe(""); // Side effect should not execute
			expect(isFailure(result)).toBe(true);
			if (isFailure(result)) {
				expect(result.errors).toEqual(testErrors);
			}
		});
	});

	describe("PhaseRes.fromEither", () => {
		test("should create Ok from Right", () => {
			const either = right("success");
			const result = PhaseRes.fromEither("testId", either);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value).toBe("success");
			}
		});

		test("should create Failure from Left", () => {
			const either = left("error message");
			const result = PhaseRes.fromEither("testId", either);

			expect(isFailure(result)).toBe(true);
			if (isFailure(result)) {
				const error = result.errors.get("testId");
				expect(error).toBeDefined();
				if (error) {
					expect(error._tag).toBe("Right");
					if (error._tag === "Right") {
						expect(error.right).toBe("error message");
					}
				}
			}
		});
	});

	describe("PhaseRes.sequence", () => {
		test("should combine successful results", () => {
			const results = [
				PhaseRes.Ok<TestId, string>("a"),
				PhaseRes.Ok<TestId, string>("b"),
				PhaseRes.Ok<TestId, string>("c"),
			];

			const combined = PhaseRes.sequence(results);
			expect(isOk(combined)).toBe(true);
			if (isOk(combined)) {
				expect(combined.value).toEqual(["a", "b", "c"]);
			}
		});

		test("should return Ignore if any result is Ignore", () => {
			const results = [
				PhaseRes.Ok<TestId, string>("a"),
				PhaseRes.Ignore<TestId, string>(),
				PhaseRes.Ok<TestId, string>("c"),
			];

			const combined = PhaseRes.sequence(results);
			expect(isIgnore(combined)).toBe(true);
		});

		test("should combine failures", () => {
			const error1 = new Map([["id1", right("error1")]]);
			const error2 = new Map([["id2", right("error2")]]);

			const results = [
				PhaseRes.Ok<TestId, string>("a"),
				PhaseRes.Failure<TestId, string>(error1),
				PhaseRes.Failure<TestId, string>(error2),
			];

			const combined = PhaseRes.sequence(results);
			expect(isFailure(combined)).toBe(true);
			if (isFailure(combined)) {
				expect(combined.errors.size).toBe(2);
				expect(combined.errors.get("id1")).toEqual(right("error1"));
				expect(combined.errors.get("id2")).toEqual(right("error2"));
			}
		});
	});

	describe("PhaseRes.attempt", () => {
		test("should return Ok for successful computation", () => {
			const result = PhaseRes.attempt("testId", mockLogger, () =>
				PhaseRes.Ok<TestId, string>("success"),
			);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value).toBe("success");
			}
		});

		test("should return Failure for failed computation", () => {
			const errors = new Map<TestId, Either<Error, string>>([
				["id1", right("error")],
			]);
			const result = PhaseRes.attempt("testId", mockLogger, () =>
				PhaseRes.Failure<TestId, string>(errors),
			);

			expect(isFailure(result)).toBe(true);
			if (isFailure(result)) {
				expect(result.errors).toEqual(errors);
			}
		});

		test("should catch and wrap exceptions", () => {
			const result = PhaseRes.attempt("testId", mockLogger, () => {
				throw new Error("test exception");
			});

			expect(isFailure(result)).toBe(true);
			if (isFailure(result)) {
				const error = result.errors.get("testId");
				expect(error).toBeDefined();
				if (error) {
					expect(error._tag).toBe("Left");
					if (error._tag === "Left") {
						expect(error.left.message).toBe("test exception");
					}
				}
			}
		});

		test("should re-throw interrupt exceptions", () => {
			const interruptError = new Error("Interrupted");
			interruptError.name = "InterruptedException";

			expect(() => {
				PhaseRes.attempt("testId", mockLogger, () => {
					throw interruptError;
				});
			}).toThrow("Interrupted");
		});
	});
});
