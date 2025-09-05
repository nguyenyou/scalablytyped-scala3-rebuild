/**
 * TypeScript port of PhaseRunner
 * Orchestrates phase execution with dependency resolution and circular dependency detection
 */

import { SortedMap, type SortedSet } from "../collections";
import type { Logger } from "../logging";
import { PhaseEvent, type PhaseListener } from "./PhaseListener";
import { PhaseRes } from "./PhaseRes";
import { type RecPhase, RecPhaseInitial, RecPhaseNext } from "./RecPhase";
import type { GetDeps, IsCircular } from "./types";

/**
 * Interface for objects that can be formatted and ordered
 */
export interface Formatter<T> {
	format(value: T): string;
}

export interface Ordering<T> {
	compare(a: T, b: T): number;
}

/**
 * Core PhaseRunner implementation
 */
export class PhaseRunner {
	/**
	 * Runs a computation given a sequence of input ids
	 */
	static apply<Id, T>(
		phase: RecPhase<Id, T>,
		getLogger: (id: Id) => Logger<void>,
		listener: PhaseListener<Id>,
		formatter: Formatter<Id>,
		ordering: Ordering<Id>,
	): (initial: Id) => PhaseRes<Id, T> {
		return (initial: Id) =>
			PhaseRunner.go(
				phase,
				initial,
				[],
				getLogger,
				listener,
				formatter,
				ordering,
			);
	}

	/**
	 * Core execution method with circuit breaker for circular dependency detection
	 */
	static go<Id, TT>(
		phase: RecPhase<Id, TT>,
		id: Id,
		circuitBreaker: Id[],
		getLogger: (id: Id) => Logger<void>,
		listener: PhaseListener<Id>,
		formatter: Formatter<Id>,
		ordering: Ordering<Id>,
	): PhaseRes<Id, TT> {
		if (phase instanceof RecPhaseInitial) {
			return PhaseRes.Ok<Id, TT>(id as any); // Type assertion needed for Initial case
		} else if (phase instanceof RecPhaseNext) {
			return PhaseRunner.doNext(
				phase as RecPhaseNext<Id, any, TT>,
				id,
				circuitBreaker,
				getLogger,
				listener,
				formatter,
				ordering,
			);
		} else {
			throw new Error("Unknown RecPhase type");
		}
	}

	/**
	 * Handles execution of Next phases
	 */
	private static doNext<Id, T, TT>(
		next: RecPhaseNext<Id, T, TT>,
		id: Id,
		circuitBreaker: Id[],
		getLogger: (id: Id) => Logger<void>,
		listener: PhaseListener<Id>,
		formatter: Formatter<Id>,
		ordering: Ordering<Id>,
	): PhaseRes<Id, TT> {
		const logger = getLogger(id);

		try {
			listener.on(next.name, id, PhaseEvent.Started(next.name));

			const isCircular = circuitBreaker.includes(id);
			const cacheKey: [Id, IsCircular] = [id, isCircular];

			return next.cache.getOrElse(cacheKey, () => {
				// Execute previous phase
				const resLastPhase = PhaseRunner.go(
					next.prev,
					id,
					circuitBreaker,
					getLogger,
					listener,
					formatter,
					ordering,
				);

				// Create dependency resolver
				const calculateDeps: GetDeps<Id, TT> = (deps: SortedSet<Id>) => {
					if (deps.isEmpty()) {
						return PhaseRes.Ok<Id, SortedMap<Id, TT>>(
							new SortedMap([], ordering.compare),
						);
					}

					listener.on(
						next.name,
						id,
						PhaseEvent.Blocked(next.name, new Set(deps.toArray())),
					);

					const depResults: Array<[Id, PhaseRes<Id, TT>]> = [];

					for (const depId of deps) {
						const newCircuitBreaker = [...circuitBreaker, id];
						const depResult = PhaseRunner.go(
							next as RecPhase<Id, TT>,
							depId,
							newCircuitBreaker,
							getLogger,
							listener,
							formatter,
							ordering,
						);
						depResults.push([depId, depResult]);
					}

					// Combine dependency results
					const successfulDeps = new Map<Id, TT>();
					const allErrors = new Map<Id, any>();

					for (const [depId, depResult] of depResults) {
						switch (depResult._tag) {
							case "Ok":
								successfulDeps.set(depId, depResult.value);
								break;
							case "Failure":
								depResult.errors.forEach((error, errorId) =>
									allErrors.set(errorId, error),
								);
								break;
							case "Ignore":
								// Ignore this dependency
								break;
						}
					}

					if (allErrors.size > 0) {
						return PhaseRes.Failure<Id, SortedMap<Id, TT>>(allErrors);
					}

					return PhaseRes.Ok<Id, SortedMap<Id, TT>>(
						new SortedMap(
							Array.from(successfulDeps.entries()),
							ordering.compare,
						),
					);
				};

				// Execute the transformation
				const result: PhaseRes<Id, TT> = (() => {
					switch (resLastPhase._tag) {
						case "Ok":
							return PhaseRes.attempt(id, logger, () =>
								next.trans(
									id,
									resLastPhase.value,
									calculateDeps,
									isCircular,
									logger,
								),
							);
						case "Failure":
							return PhaseRes.Failure<Id, TT>(resLastPhase.errors);
						case "Ignore":
							return PhaseRes.Ignore<Id, TT>();
					}
				})();

				// Notify listener of result
				switch (result._tag) {
					case "Ok":
						listener.on(next.name, id, PhaseEvent.Success(next.name));
						break;
					case "Failure":
						listener.on(
							next.name,
							id,
							PhaseEvent.Failure(next.name, result.errors),
						);
						break;
					case "Ignore":
						listener.on(next.name, id, PhaseEvent.Ignored());
						break;
				}

				return result;
			});
		} catch (error) {
			const wrappedError =
				error instanceof Error ? error : new Error(String(error));
			const errors = new Map<Id, any>([
				[id, { _tag: "Left" as const, left: wrappedError }],
			]);
			listener.on(next.name, id, PhaseEvent.Failure(next.name, errors));
			logger.error(`Failure: ${wrappedError.message}`, wrappedError);
			return PhaseRes.Failure(errors);
		}
	}
}

/**
 * Utility functions for creating common formatters and orderings
 */
export const Formatters = {
	/**
	 * String formatter
	 */
	string: (): Formatter<string> => ({
		format: (value: string) => value,
	}),

	/**
	 * Number formatter
	 */
	number: (): Formatter<number> => ({
		format: (value: number) => value.toString(),
	}),

	/**
	 * Generic toString formatter
	 */
	toString: <T>(): Formatter<T> => ({
		format: (value: T) => String(value),
	}),

	/**
	 * Create a custom formatter
	 */
	create: <T>(formatFn: (value: T) => string): Formatter<T> => ({
		format: formatFn,
	}),
};

export const Orderings = {
	/**
	 * String ordering
	 */
	string: (): Ordering<string> => ({
		compare: (a: string, b: string) => a.localeCompare(b),
	}),

	/**
	 * Number ordering
	 */
	number: (): Ordering<number> => ({
		compare: (a: number, b: number) => a - b,
	}),

	/**
	 * Generic ordering using toString
	 */
	toString: <T>(): Ordering<T> => ({
		compare: (a: T, b: T) => String(a).localeCompare(String(b)),
	}),

	/**
	 * Create a custom ordering
	 */
	create: <T>(compareFn: (a: T, b: T) => number): Ordering<T> => ({
		compare: compareFn,
	}),
};
