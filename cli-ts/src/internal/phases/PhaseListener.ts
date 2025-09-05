/**
 * TypeScript port of PhaseListener trait and events
 * Provides event system for monitoring phase execution
 */

import type { Either } from "fp-ts/Either";

/**
 * Event types for phase execution monitoring
 */
export type PhaseEvent<Id> =
	| { readonly _tag: "Started"; readonly phase: string }
	| { readonly _tag: "Blocked"; readonly phase: string; readonly on: Set<Id> }
	| { readonly _tag: "Success"; readonly phase: string }
	| {
			readonly _tag: "Failure";
			readonly phase: string;
			readonly errors: Map<Id, Either<Error, string>>;
	  }
	| { readonly _tag: "Ignored" };

/**
 * Factory functions for creating phase events
 */
export const PhaseEvent = {
	/**
	 * Creates a Started event
	 */
	Started: <Id>(phase: string): PhaseEvent<Id> => ({
		_tag: "Started",
		phase,
	}),

	/**
	 * Creates a Blocked event
	 */
	Blocked: <Id>(phase: string, on: Set<Id>): PhaseEvent<Id> => ({
		_tag: "Blocked",
		phase,
		on,
	}),

	/**
	 * Creates a Success event
	 */
	Success: <Id>(phase: string): PhaseEvent<Id> => ({
		_tag: "Success",
		phase,
	}),

	/**
	 * Creates a Failure event
	 */
	Failure: <Id>(
		phase: string,
		errors: Map<Id, Either<Error, string>>,
	): PhaseEvent<Id> => ({
		_tag: "Failure",
		phase,
		errors,
	}),

	/**
	 * Creates an Ignored event
	 */
	Ignored: <Id>(): PhaseEvent<Id> => ({
		_tag: "Ignored",
	}),
};

/**
 * Interface for listening to phase execution events
 */
export interface PhaseListener<Id> {
	/**
	 * Called when a phase event occurs
	 * @param phaseName Name of the phase
	 * @param id ID of the item being processed
	 * @param event The event that occurred
	 */
	on(phaseName: string, id: Id, event: PhaseEvent<Id>): void;
}

/**
 * No-op phase listener that ignores all events
 */
export class NoOpPhaseListener<Id> implements PhaseListener<Id> {
	on(_phaseName: string, _id: Id, _event: PhaseEvent<Id>): void {
		// Do nothing
	}
}

/**
 * Phase listener that collects all events for testing/debugging
 */
export class CollectingPhaseListener<Id> implements PhaseListener<Id> {
	private events: Array<{ phaseName: string; id: Id; event: PhaseEvent<Id> }> =
		[];

	on(phaseName: string, id: Id, event: PhaseEvent<Id>): void {
		this.events.push({ phaseName, id, event });
	}

	/**
	 * Gets all collected events
	 */
	getEvents(): Array<{ phaseName: string; id: Id; event: PhaseEvent<Id> }> {
		return [...this.events];
	}

	/**
	 * Gets events for a specific phase
	 */
	getEventsForPhase(
		phaseName: string,
	): Array<{ phaseName: string; id: Id; event: PhaseEvent<Id> }> {
		return this.events.filter((e) => e.phaseName === phaseName);
	}

	/**
	 * Gets events for a specific ID
	 */
	getEventsForId(
		id: Id,
	): Array<{ phaseName: string; id: Id; event: PhaseEvent<Id> }> {
		return this.events.filter((e) => e.id === id);
	}

	/**
	 * Clears all collected events
	 */
	clear(): void {
		this.events = [];
	}

	/**
	 * Gets the number of collected events
	 */
	get size(): number {
		return this.events.length;
	}
}

/**
 * Phase listener that logs events to console
 */
export class LoggingPhaseListener<Id> implements PhaseListener<Id> {
	constructor(private logLevel: "debug" | "info" | "warn" | "error" = "info") {}

	on(phaseName: string, id: Id, event: PhaseEvent<Id>): void {
		const message = this.formatEvent(phaseName, id, event);

		switch (event._tag) {
			case "Started":
			case "Success":
				if (this.logLevel === "debug" || this.logLevel === "info") {
					console.log(message);
				}
				break;
			case "Blocked":
				if (
					this.logLevel === "debug" ||
					this.logLevel === "info" ||
					this.logLevel === "warn"
				) {
					console.warn(message);
				}
				break;
			case "Failure":
				console.error(message);
				break;
			case "Ignored":
				if (this.logLevel === "debug") {
					console.log(message);
				}
				break;
		}
	}

	private formatEvent(
		phaseName: string,
		id: Id,
		event: PhaseEvent<Id>,
	): string {
		const idStr = String(id);

		switch (event._tag) {
			case "Started":
				return `[${phaseName}] Started processing ${idStr}`;
			case "Blocked": {
				const deps = Array.from(event.on).map(String).join(", ");
				return `[${phaseName}] Blocked ${idStr} on dependencies: ${deps}`;
			}
			case "Success":
				return `[${phaseName}] Successfully processed ${idStr}`;
			case "Failure": {
				const errorCount = event.errors.size;
				return `[${phaseName}] Failed to process ${idStr} (${errorCount} errors)`;
			}
			case "Ignored":
				return `[${phaseName}] Ignored ${idStr}`;
		}
	}
}

/**
 * Factory functions for common phase listeners
 */
export const PhaseListener = {
	/**
	 * Creates a no-op listener
	 */
	NoListener: <Id>(): PhaseListener<Id> => new NoOpPhaseListener<Id>(),

	/**
	 * Creates a collecting listener for testing
	 */
	Collecting: <Id>(): CollectingPhaseListener<Id> =>
		new CollectingPhaseListener<Id>(),

	/**
	 * Creates a logging listener
	 */
	Logging: <Id>(
		logLevel: "debug" | "info" | "warn" | "error" = "info",
	): PhaseListener<Id> => new LoggingPhaseListener<Id>(logLevel),
};

/**
 * Type guards for phase events
 */
export const isEventStarted = <Id>(
	event: PhaseEvent<Id>,
): event is { readonly _tag: "Started"; readonly phase: string } => {
	return event._tag === "Started";
};

export const isEventBlocked = <Id>(
	event: PhaseEvent<Id>,
): event is {
	readonly _tag: "Blocked";
	readonly phase: string;
	readonly on: Set<Id>;
} => {
	return event._tag === "Blocked";
};

export const isEventSuccess = <Id>(
	event: PhaseEvent<Id>,
): event is { readonly _tag: "Success"; readonly phase: string } => {
	return event._tag === "Success";
};

export const isEventFailure = <Id>(
	event: PhaseEvent<Id>,
): event is {
	readonly _tag: "Failure";
	readonly phase: string;
	readonly errors: Map<Id, Either<Error, string>>;
} => {
	return event._tag === "Failure";
};

export const isEventIgnored = <Id>(
	event: PhaseEvent<Id>,
): event is { readonly _tag: "Ignored" } => {
	return event._tag === "Ignored";
};
