/**
 * TypeScript port of RecPhase abstract class
 * Represents a computation of a set of elements done in phases with dependency resolution
 */

import { none, type Option, some } from "fp-ts/Option";
import { PhaseCache } from "./PhaseCache";
import type { Phase } from "./types";

/**
 * Abstract base class for recursive phase definitions
 * Each phase can compute and express dependencies for the next phase
 */
export abstract class RecPhaseBase<Id, T> {
	/**
	 * Type aliases for easier access to generic types
	 */
	readonly _Id!: Id;
	readonly _T!: T;

	/**
	 * Creates a new phase that follows this one
	 */
	next<TT>(f: Phase<Id, T, TT>, name: string): RecPhaseBase<Id, TT> {
		return new RecPhaseNext(this, f, new PhaseCache<Id, TT>(), name);
	}

	/**
	 * Conditionally creates a new phase that follows this one
	 * If the phase is None, returns the current phase unchanged
	 */
	nextOpt(op: Option<Phase<Id, T, T>>, name: string): RecPhaseBase<Id, T> {
		return op._tag === "Some"
			? new RecPhaseNext(this, op.value, new PhaseCache<Id, T>(), name)
			: this;
	}
}

/**
 * Initial phase that simply passes through the input
 */
export class RecPhaseInitial<Id> extends RecPhaseBase<Id, Id> {
	readonly _tag = "Initial" as const;
}

/**
 * A phase that transforms the output of a previous phase
 */
export class RecPhaseNext<Id, T, TT> extends RecPhaseBase<Id, TT> {
	readonly _tag = "Next" as const;
	readonly _TT!: TT;

	constructor(
		readonly prev: RecPhaseBase<Id, T>,
		readonly trans: Phase<Id, T, TT>,
		readonly cache: PhaseCache<Id, TT>,
		readonly name: string,
	) {
		super();
	}
}

// Type alias for compatibility
export type RecPhase<Id, T> = RecPhaseBase<Id, T>;

/**
 * Factory functions for creating RecPhase instances
 */
export const RecPhase = {
	/**
	 * Creates an initial phase for the given Id type
	 */
	apply: <Id>(): RecPhase<Id, Id> => new RecPhaseInitial<Id>(),

	/**
	 * Type guard for Initial phase
	 */
	isInitial: <Id>(phase: RecPhase<Id, any>): phase is RecPhaseInitial<Id> => {
		return (phase as any)._tag === "Initial";
	},

	/**
	 * Type guard for Next phase
	 */
	isNext: <Id, T>(
		phase: RecPhase<Id, T>,
	): phase is RecPhaseNext<Id, any, T> => {
		return (phase as any)._tag === "Next";
	},
};

/**
 * Utility functions for working with RecPhase
 */

/**
 * Creates an optional phase transformation
 */
export const optionalPhase = <Id, T>(
	phase: Option<Phase<Id, T, T>>,
): Option<Phase<Id, T, T>> => phase;

/**
 * Helper to create Some phase
 */
export const somePhase = <Id, T>(
	phase: Phase<Id, T, T>,
): Option<Phase<Id, T, T>> => some(phase);

/**
 * Helper to create None phase
 */
export const nonePhase = <Id, T>(): Option<Phase<Id, T, T>> => none;
