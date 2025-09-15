/**
 * TypeScript port of PhaseCache tests
 * Ensures identical behavior to the Scala implementation
 */

import { describe, expect, test } from "bun:test";
import { PhaseCache, PhaseRes } from "@/internal/phases";

// Test helper types
type TestId = string;
interface TestValue {
	data: string;
	computeCount: number;
}

describe("PhaseCache", () => {
	describe("PhaseCache basic functionality", () => {
		test("should cache computed values", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			let computeCount = 0;

			const compute = (): PhaseRes<TestId, TestValue> => {
				computeCount += 1;
				return PhaseRes.Ok({ data: `computed-${computeCount}`, computeCount });
			};

			const key: [TestId, boolean] = ["testId", false];

			// First call should compute
			const result1 = cache.getOrElse(key, compute);
			expect(result1._tag).toBe("Ok");
			if (result1._tag === "Ok") {
				expect(result1.value.data).toBe("computed-1");
				expect(result1.value.computeCount).toBe(1);
			}
			expect(computeCount).toBe(1);

			// Second call should return cached value
			const result2 = cache.getOrElse(key, compute);
			expect(result2._tag).toBe("Ok");
			if (result2._tag === "Ok") {
				expect(result2.value.data).toBe("computed-1");
				expect(result2.value.computeCount).toBe(1);
			}
			expect(computeCount).toBe(1); // Should not have computed again
		});

		test("should handle different keys separately", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			let computeCount = 0;

			const compute = (): PhaseRes<TestId, TestValue> => {
				computeCount += 1;
				return PhaseRes.Ok({ data: `computed-${computeCount}`, computeCount });
			};

			const key1: [TestId, boolean] = ["testId1", false];
			const key2: [TestId, boolean] = ["testId2", false];

			// First key
			const result1 = cache.getOrElse(key1, compute);
			expect(result1._tag).toBe("Ok");
			if (result1._tag === "Ok") {
				expect(result1.value.data).toBe("computed-1");
			}
			expect(computeCount).toBe(1);

			// Second key should compute separately
			const result2 = cache.getOrElse(key2, compute);
			expect(result2._tag).toBe("Ok");
			if (result2._tag === "Ok") {
				expect(result2.value.data).toBe("computed-2");
			}
			expect(computeCount).toBe(2);

			// First key should still be cached
			const result3 = cache.getOrElse(key1, compute);
			expect(result3._tag).toBe("Ok");
			if (result3._tag === "Ok") {
				expect(result3.value.data).toBe("computed-1");
			}
			expect(computeCount).toBe(2); // Should not compute again
		});

		test("should handle circular dependency flag", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			let computeCount = 0;

			const compute = (): PhaseRes<TestId, TestValue> => {
				computeCount += 1;
				return PhaseRes.Ok({ data: `computed-${computeCount}`, computeCount });
			};

			const keyNonCircular: [TestId, boolean] = ["testId", false];
			const keyCircular: [TestId, boolean] = ["testId", true];

			const _result1 = cache.getOrElse(keyNonCircular, compute);
			const _result2 = cache.getOrElse(keyCircular, compute);

			expect(computeCount).toBe(2); // Should compute twice for different circular flags

			// Verify caching works for both
			cache.getOrElse(keyNonCircular, compute);
			cache.getOrElse(keyCircular, compute);

			expect(computeCount).toBe(2); // Should not compute again
		});

		test("should cache failure results", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			let computeCount = 0;

			const compute = (): PhaseRes<TestId, TestValue> => {
				computeCount += 1;
				const errors = new Map<TestId, any>([
					["error-id", { _tag: "Right" as const, right: "test error" }],
				]);
				return PhaseRes.Failure(errors);
			};

			const key: [TestId, boolean] = ["testId", false];

			// First call should compute
			const result1 = cache.getOrElse(key, compute);
			expect(result1._tag).toBe("Failure");
			expect(computeCount).toBe(1);

			// Second call should return cached failure
			const result2 = cache.getOrElse(key, compute);
			expect(result2._tag).toBe("Failure");
			expect(computeCount).toBe(1); // Should not have computed again
		});

		test("should cache ignore results", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			let computeCount = 0;

			const compute = (): PhaseRes<TestId, TestValue> => {
				computeCount += 1;
				return PhaseRes.Ignore();
			};

			const key: [TestId, boolean] = ["testId", false];

			// First call should compute
			const result1 = cache.getOrElse(key, compute);
			expect(result1._tag).toBe("Ignore");
			expect(computeCount).toBe(1);

			// Second call should return cached ignore
			const result2 = cache.getOrElse(key, compute);
			expect(result2._tag).toBe("Ignore");
			expect(computeCount).toBe(1); // Should not have computed again
		});
	});

	describe("PhaseCache with custom initial capacity", () => {
		test("should accept custom initial capacity", () => {
			const cache = new PhaseCache<TestId, TestValue>(500);
			let computeCount = 0;

			const compute = (): PhaseRes<TestId, TestValue> => {
				computeCount += 1;
				return PhaseRes.Ok({ data: `computed-${computeCount}`, computeCount });
			};

			const key: [TestId, boolean] = ["testId", false];
			const result = cache.getOrElse(key, compute);

			expect(result._tag).toBe("Ok");
			if (result._tag === "Ok") {
				expect(result.value.data).toBe("computed-1");
			}
			expect(computeCount).toBe(1);
		});
	});

	describe("PhaseCache utility methods", () => {
		test("should provide cache size", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			expect(cache.size).toBe(0);

			const compute = (): PhaseRes<TestId, TestValue> =>
				PhaseRes.Ok({ data: "test", computeCount: 1 });

			cache.getOrElse(["key1", false], compute);
			expect(cache.size).toBe(1);

			cache.getOrElse(["key2", false], compute);
			expect(cache.size).toBe(2);

			cache.getOrElse(["key1", true], compute); // Different circular flag
			expect(cache.size).toBe(3);
		});

		test("should check if key exists", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			const key: [TestId, boolean] = ["testId", false];

			expect(cache.has(key)).toBe(false);

			const compute = (): PhaseRes<TestId, TestValue> =>
				PhaseRes.Ok({ data: "test", computeCount: 1 });

			cache.getOrElse(key, compute);
			expect(cache.has(key)).toBe(true);
		});

		test("should delete cache entries", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			const key: [TestId, boolean] = ["testId", false];

			const compute = (): PhaseRes<TestId, TestValue> =>
				PhaseRes.Ok({ data: "test", computeCount: 1 });

			cache.getOrElse(key, compute);
			expect(cache.has(key)).toBe(true);
			expect(cache.size).toBe(1);

			const deleted = cache.delete(key);
			expect(deleted).toBe(true);
			expect(cache.has(key)).toBe(false);
			expect(cache.size).toBe(0);

			// Deleting non-existent key should return false
			const deletedAgain = cache.delete(key);
			expect(deletedAgain).toBe(false);
		});

		test("should clear all cache entries", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			const compute = (): PhaseRes<TestId, TestValue> =>
				PhaseRes.Ok({ data: "test", computeCount: 1 });

			cache.getOrElse(["key1", false], compute);
			cache.getOrElse(["key2", false], compute);
			cache.getOrElse(["key3", true], compute);

			expect(cache.size).toBe(3);

			cache.clear();
			expect(cache.size).toBe(0);
			expect(cache.has(["key1", false])).toBe(false);
			expect(cache.has(["key2", false])).toBe(false);
			expect(cache.has(["key3", true])).toBe(false);
		});

		test("should get cache keys", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			const compute = (): PhaseRes<TestId, TestValue> =>
				PhaseRes.Ok({ data: "test", computeCount: 1 });

			const key1: [TestId, boolean] = ["key1", false];
			const key2: [TestId, boolean] = ["key2", true];

			cache.getOrElse(key1, compute);
			cache.getOrElse(key2, compute);

			const keys = cache.keys();
			expect(keys).toHaveLength(2);

			// Check that both keys are present (order may vary)
			const keyStrings = keys.map(([id, circular]) => `${id}:${circular}`);
			expect(keyStrings).toContain("key1:false");
			expect(keyStrings).toContain("key2:true");
		});

		test("should provide cache statistics", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			const stats = cache.getStats();

			expect(stats.size).toBe(0);
			expect(typeof stats.size).toBe("number");
		});
	});

	describe("PhaseCache edge cases", () => {
		test("should handle complex key types", () => {
			const cache = new PhaseCache<string, TestValue>();
			let computeCount = 0;

			const compute = (): PhaseRes<string, TestValue> => {
				computeCount += 1;
				return PhaseRes.Ok({ data: `computed-${computeCount}`, computeCount });
			};

			// Test with special characters in keys
			const specialKeys: Array<[string, boolean]> = [
				["key with spaces", false],
				["key-with-dashes", false],
				["key_with_underscores", false],
				["key.with.dots", false],
				["key/with/slashes", false],
				["key:with:colons", true],
			];

			specialKeys.forEach((key) => {
				const result = cache.getOrElse(key, compute);
				expect(result._tag).toBe("Ok");
			});

			expect(computeCount).toBe(specialKeys.length);
			expect(cache.size).toBe(specialKeys.length);

			// Verify caching works for special keys
			const originalComputeCount = computeCount;
			specialKeys.forEach((key) => {
				cache.getOrElse(key, compute);
			});
			expect(computeCount).toBe(originalComputeCount); // Should not compute again
		});

		test("should handle concurrent access patterns", () => {
			const cache = new PhaseCache<TestId, TestValue>();
			let computeCount = 0;

			const compute = (): PhaseRes<TestId, TestValue> => {
				computeCount += 1;
				return PhaseRes.Ok({ data: `computed-${computeCount}`, computeCount });
			};

			const key: [TestId, boolean] = ["testId", false];

			// Simulate multiple "concurrent" accesses to the same key
			const results = [];
			for (let i = 0; i < 5; i++) {
				results.push(cache.getOrElse(key, compute));
			}

			// Should only compute once
			expect(computeCount).toBe(1);

			// All results should be identical
			results.forEach((result) => {
				expect(result._tag).toBe("Ok");
				if (result._tag === "Ok") {
					expect(result.value.data).toBe("computed-1");
					expect(result.value.computeCount).toBe(1);
				}
			});
		});
	});
});
