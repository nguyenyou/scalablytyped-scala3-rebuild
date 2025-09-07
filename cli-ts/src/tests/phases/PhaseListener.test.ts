/**
 * TypeScript port of PhaseListener tests
 * Ensures identical behavior to the Scala implementation
 */

import { type Either, left, right } from "fp-ts/Either";
import { describe, expect, test } from "vitest";
import {
	CollectingPhaseListener,
	isEventBlocked,
	isEventFailure,
	isEventIgnored,
	isEventStarted,
	isEventSuccess,
	LoggingPhaseListener,
	NoOpPhaseListener,
	PhaseEvent,
	PhaseListener,
} from "@/internal/phases";

// Test helper types
type TestId = string;

// Test listener implementation for testing
class TestListener implements PhaseListener<TestId> {
	private events: Array<{
		phaseName: string;
		id: TestId;
		event: PhaseEvent<TestId>;
	}> = [];

	on(phaseName: string, id: TestId, event: PhaseEvent<TestId>): void {
		this.events.push({ phaseName, id, event });
	}

	getEvents(): Array<{
		phaseName: string;
		id: TestId;
		event: PhaseEvent<TestId>;
	}> {
		return [...this.events];
	}

	getEventsForPhase(
		phaseName: string,
	): Array<{ phaseName: string; id: TestId; event: PhaseEvent<TestId> }> {
		return this.events.filter((e) => e.phaseName === phaseName);
	}

	getEventsForId(
		id: TestId,
	): Array<{ phaseName: string; id: TestId; event: PhaseEvent<TestId> }> {
		return this.events.filter((e) => e.id === id);
	}

	clear(): void {
		this.events = [];
	}

	get size(): number {
		return this.events.length;
	}
}

describe("PhaseListener", () => {
	describe("PhaseEvent creation", () => {
		test("should create Started event", () => {
			const event = PhaseEvent.Started<TestId>("test-phase");
			expect(event._tag).toBe("Started");
			if (event._tag === "Started") {
				expect(event.phase).toBe("test-phase");
			}
			expect(isEventStarted(event)).toBe(true);
			expect(isEventBlocked(event)).toBe(false);
		});

		test("should create Blocked event", () => {
			const deps = new Set<TestId>(["dep1", "dep2"]);
			const event = PhaseEvent.Blocked<TestId>("test-phase", deps);
			expect(event._tag).toBe("Blocked");
			if (event._tag === "Blocked") {
				expect(event.phase).toBe("test-phase");
				expect(event.on).toEqual(deps);
			}
			expect(isEventBlocked(event)).toBe(true);
			expect(isEventStarted(event)).toBe(false);
		});

		test("should create Success event", () => {
			const event = PhaseEvent.Success<TestId>("test-phase");
			expect(event._tag).toBe("Success");
			if (event._tag === "Success") {
				expect(event.phase).toBe("test-phase");
			}
			expect(isEventSuccess(event)).toBe(true);
			expect(isEventFailure(event)).toBe(false);
		});

		test("should create Failure event", () => {
			const errors = new Map<TestId, Either<Error, string>>([
				["id1", right("error message")],
				["id2", left(new Error("exception"))],
			]);
			const event = PhaseEvent.Failure<TestId>("test-phase", errors);
			expect(event._tag).toBe("Failure");
			if (event._tag === "Failure") {
				expect(event.phase).toBe("test-phase");
				expect(event.errors).toEqual(errors);
			}
			expect(isEventFailure(event)).toBe(true);
			expect(isEventSuccess(event)).toBe(false);
		});

		test("should create Ignored event", () => {
			const event = PhaseEvent.Ignored<TestId>();
			expect(event._tag).toBe("Ignored");
			expect(isEventIgnored(event)).toBe(true);
			expect(isEventStarted(event)).toBe(false);
		});
	});

	describe("NoOpPhaseListener", () => {
		test("should ignore all events", () => {
			const listener = new NoOpPhaseListener<TestId>();

			// Should not throw or cause any side effects
			listener.on("phase1", "id1", PhaseEvent.Started("phase1"));
			listener.on("phase1", "id1", PhaseEvent.Success("phase1"));
			listener.on(
				"phase2",
				"id2",
				PhaseEvent.Blocked("phase2", new Set(["dep1"])),
			);

			// No way to verify since it's a no-op, but it should not crash
			expect(true).toBe(true);
		});
	});

	describe("CollectingPhaseListener", () => {
		test("should capture all events", () => {
			const listener = new CollectingPhaseListener<TestId>();

			listener.on("phase1", "id1", PhaseEvent.Started("phase1"));
			listener.on("phase1", "id1", PhaseEvent.Success("phase1"));
			listener.on(
				"phase2",
				"id2",
				PhaseEvent.Blocked("phase2", new Set(["dep1", "dep2"])),
			);

			const events = listener.getEvents();
			expect(events).toHaveLength(3);

			expect(events[0].phaseName).toBe("phase1");
			expect(events[0].id).toBe("id1");
			expect(events[0].event._tag).toBe("Started");

			expect(events[1].phaseName).toBe("phase1");
			expect(events[1].id).toBe("id1");
			expect(events[1].event._tag).toBe("Success");

			expect(events[2].phaseName).toBe("phase2");
			expect(events[2].id).toBe("id2");
			expect(events[2].event._tag).toBe("Blocked");
			if (events[2].event._tag === "Blocked") {
				expect(events[2].event.on).toEqual(new Set(["dep1", "dep2"]));
			}
		});

		test("should filter events by phase", () => {
			const listener = new CollectingPhaseListener<TestId>();

			listener.on("phase1", "id1", PhaseEvent.Started("phase1"));
			listener.on("phase2", "id2", PhaseEvent.Started("phase2"));
			listener.on("phase1", "id3", PhaseEvent.Success("phase1"));

			const phase1Events = listener.getEventsForPhase("phase1");
			expect(phase1Events).toHaveLength(2);
			expect(phase1Events[0].phaseName).toBe("phase1");
			expect(phase1Events[1].phaseName).toBe("phase1");

			const phase2Events = listener.getEventsForPhase("phase2");
			expect(phase2Events).toHaveLength(1);
			expect(phase2Events[0].phaseName).toBe("phase2");
		});

		test("should filter events by id", () => {
			const listener = new CollectingPhaseListener<TestId>();

			listener.on("phase1", "id1", PhaseEvent.Started("phase1"));
			listener.on("phase2", "id2", PhaseEvent.Started("phase2"));
			listener.on("phase1", "id1", PhaseEvent.Success("phase1"));

			const id1Events = listener.getEventsForId("id1");
			expect(id1Events).toHaveLength(2);
			expect(id1Events[0].id).toBe("id1");
			expect(id1Events[1].id).toBe("id1");

			const id2Events = listener.getEventsForId("id2");
			expect(id2Events).toHaveLength(1);
			expect(id2Events[0].id).toBe("id2");
		});

		test("should clear events", () => {
			const listener = new CollectingPhaseListener<TestId>();

			listener.on("phase1", "id1", PhaseEvent.Started("phase1"));
			listener.on("phase1", "id1", PhaseEvent.Success("phase1"));

			expect(listener.size).toBe(2);

			listener.clear();
			expect(listener.size).toBe(0);
			expect(listener.getEvents()).toHaveLength(0);
		});
	});

	describe("TestListener implementation", () => {
		test("should capture all events", () => {
			const listener = new TestListener();

			listener.on("phase1", "id1", PhaseEvent.Started("phase1"));
			listener.on("phase1", "id1", PhaseEvent.Success("phase1"));
			listener.on(
				"phase2",
				"id2",
				PhaseEvent.Blocked("phase2", new Set(["dep1", "dep2"])),
			);

			const events = listener.getEvents();
			expect(events).toHaveLength(3);

			expect(events[0].phaseName).toBe("phase1");
			expect(events[0].id).toBe("id1");
			expect(events[0].event._tag).toBe("Started");

			expect(events[1].phaseName).toBe("phase1");
			expect(events[1].id).toBe("id1");
			expect(events[1].event._tag).toBe("Success");

			expect(events[2].phaseName).toBe("phase2");
			expect(events[2].id).toBe("id2");
			expect(events[2].event._tag).toBe("Blocked");
			if (events[2].event._tag === "Blocked") {
				expect(events[2].event.on).toEqual(new Set(["dep1", "dep2"]));
			}
		});
	});

	describe("PhaseListener factory methods", () => {
		test("should create NoListener", () => {
			const listener = PhaseListener.NoListener<TestId>();
			expect(listener).toBeInstanceOf(NoOpPhaseListener);
		});

		test("should create Collecting listener", () => {
			const listener = PhaseListener.Collecting<TestId>();
			expect(listener).toBeInstanceOf(CollectingPhaseListener);
		});

		test("should create Logging listener with default level", () => {
			const listener = PhaseListener.Logging<TestId>();
			expect(listener).toBeInstanceOf(LoggingPhaseListener);
		});

		test("should create Logging listener with custom level", () => {
			const listener = PhaseListener.Logging<TestId>("debug");
			expect(listener).toBeInstanceOf(LoggingPhaseListener);
		});
	});

	describe("Event type guards", () => {
		test("should correctly identify Started events", () => {
			const startedEvent = PhaseEvent.Started<TestId>("phase");
			const successEvent = PhaseEvent.Success<TestId>("phase");

			expect(isEventStarted(startedEvent)).toBe(true);
			expect(isEventStarted(successEvent)).toBe(false);
		});

		test("should correctly identify Blocked events", () => {
			const blockedEvent = PhaseEvent.Blocked<TestId>(
				"phase",
				new Set(["dep"]),
			);
			const startedEvent = PhaseEvent.Started<TestId>("phase");

			expect(isEventBlocked(blockedEvent)).toBe(true);
			expect(isEventBlocked(startedEvent)).toBe(false);
		});

		test("should correctly identify Success events", () => {
			const successEvent = PhaseEvent.Success<TestId>("phase");
			const failureEvent = PhaseEvent.Failure<TestId>("phase", new Map());

			expect(isEventSuccess(successEvent)).toBe(true);
			expect(isEventSuccess(failureEvent)).toBe(false);
		});

		test("should correctly identify Failure events", () => {
			const failureEvent = PhaseEvent.Failure<TestId>("phase", new Map());
			const successEvent = PhaseEvent.Success<TestId>("phase");

			expect(isEventFailure(failureEvent)).toBe(true);
			expect(isEventFailure(successEvent)).toBe(false);
		});

		test("should correctly identify Ignored events", () => {
			const ignoredEvent = PhaseEvent.Ignored<TestId>();
			const startedEvent = PhaseEvent.Started<TestId>("phase");

			expect(isEventIgnored(ignoredEvent)).toBe(true);
			expect(isEventIgnored(startedEvent)).toBe(false);
		});
	});

	describe("Complex event scenarios", () => {
		test("should handle events with complex error maps", () => {
			const listener = new CollectingPhaseListener<TestId>();

			const complexErrors = new Map<TestId, Either<Error, string>>([
				["id1", right("Simple error message")],
				["id2", left(new Error("Exception with stack trace"))],
				["id3", right("Another error")],
				["id4", left(new TypeError("Type error"))],
			]);

			const failureEvent = PhaseEvent.Failure("complex-phase", complexErrors);
			listener.on("complex-phase", "main-id", failureEvent);

			const events = listener.getEvents();
			expect(events).toHaveLength(1);

			const event = events[0].event;
			expect(event._tag).toBe("Failure");
			if (event._tag === "Failure") {
				expect(event.errors.size).toBe(4);
				expect(event.errors.get("id1")).toEqual(right("Simple error message"));
				expect(event.errors.get("id2")?._tag).toBe("Left");
				expect(event.errors.get("id3")).toEqual(right("Another error"));
				expect(event.errors.get("id4")?._tag).toBe("Left");
			}
		});

		test("should handle events with large dependency sets", () => {
			const listener = new CollectingPhaseListener<TestId>();

			const largeDependencySet = new Set<TestId>();
			for (let i = 0; i < 100; i++) {
				largeDependencySet.add(`dep-${i}`);
			}

			const blockedEvent = PhaseEvent.Blocked(
				"large-deps-phase",
				largeDependencySet,
			);
			listener.on("large-deps-phase", "blocked-id", blockedEvent);

			const events = listener.getEvents();
			expect(events).toHaveLength(1);

			const event = events[0].event;
			expect(event._tag).toBe("Blocked");
			if (event._tag === "Blocked") {
				expect(event.on.size).toBe(100);
				expect(event.on.has("dep-0")).toBe(true);
				expect(event.on.has("dep-99")).toBe(true);
				expect(event.on.has("dep-100")).toBe(false);
			}
		});

		test("should handle rapid event sequences", () => {
			const listener = new CollectingPhaseListener<TestId>();

			// Simulate rapid phase execution
			const phases = ["parse", "validate", "transform", "emit"];
			const ids = ["file1", "file2", "file3"];

			phases.forEach((phase) => {
				ids.forEach((id) => {
					listener.on(phase, id, PhaseEvent.Started(phase));
					listener.on(phase, id, PhaseEvent.Success(phase));
				});
			});

			const events = listener.getEvents();
			expect(events).toHaveLength(phases.length * ids.length * 2); // 2 events per phase per id

			// Verify event ordering
			let eventIndex = 0;
			phases.forEach((phase) => {
				ids.forEach((id) => {
					expect(events[eventIndex].phaseName).toBe(phase);
					expect(events[eventIndex].id).toBe(id);
					expect(events[eventIndex].event._tag).toBe("Started");
					eventIndex++;

					expect(events[eventIndex].phaseName).toBe(phase);
					expect(events[eventIndex].id).toBe(id);
					expect(events[eventIndex].event._tag).toBe("Success");
					eventIndex++;
				});
			});
		});
	});
});
