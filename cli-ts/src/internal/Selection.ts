/**
 * TypeScript port of org.scalablytyped.converter.Selection
 *
 * A generic selection type that represents filtering criteria for collections.
 * Supports logical operations (AND, OR) and type transformations.
 */

/**
 * Abstract base class for all Selection types
 */
export abstract class Selection<T> {
	/**
	 * Apply the selection criteria to a value
	 * @param value The value to test
	 * @returns true if the value matches the selection criteria
	 */
	abstract apply(value: T): boolean;

	/**
	 * Logical AND operation - creates a selection that requires both selections to match
	 * @param other The other selection to combine with
	 * @returns A new And selection
	 */
	and(other: Selection<T>): Selection<T> {
		return new And(this, other);
	}

	/**
	 * Logical OR operation - creates a selection that requires either selection to match
	 * @param other The other selection to combine with
	 * @returns A new Or selection
	 */
	or(other: Selection<T>): Selection<T> {
		return new Or(this, other);
	}

	/**
	 * Transform the selection to work with a different type
	 * @param f The transformation function
	 * @returns A new selection that works with the transformed type
	 */
	map<U>(f: (value: T) => U): Selection<U> {
		if (this instanceof AllExcept) {
			return new AllExcept(new Set(Array.from(this.values).map(f)));
		} else if (this instanceof NoneExcept) {
			return new NoneExcept(new Set(Array.from(this.values).map(f)));
		} else if (this instanceof And) {
			return new And(this._1.map(f), this._2.map(f));
		} else if (this instanceof Or) {
			return new Or(this._1.map(f), this._2.map(f));
		}
		throw new Error("Unknown Selection type");
	}

	/**
	 * Convert selection to JSON-serializable object
	 */
	toJSON(): any {
		if (this instanceof AllExcept) {
			return { AllExcept: Array.from(this.values) };
		} else if (this instanceof NoneExcept) {
			return { NoneExcept: Array.from(this.values) };
		} else if (this instanceof And) {
			return { And: { _1: this._1.toJSON(), _2: this._2.toJSON() } };
		} else if (this instanceof Or) {
			return { Or: { _1: this._1.toJSON(), _2: this._2.toJSON() } };
		}
		throw new Error("Unknown Selection type");
	}

	/**
	 * Create selection from JSON object
	 */
	static fromJSON<T>(obj: any): Selection<T> {
		if (obj.AllExcept) {
			return new AllExcept(new Set(obj.AllExcept));
		} else if (obj.NoneExcept) {
			return new NoneExcept(new Set(obj.NoneExcept));
		} else if (obj.And) {
			return new And(
				Selection.fromJSON(obj.And._1),
				Selection.fromJSON(obj.And._2),
			);
		} else if (obj.Or) {
			return new Or(
				Selection.fromJSON(obj.Or._1),
				Selection.fromJSON(obj.Or._2),
			);
		}
		throw new Error("Invalid Selection format");
	}
}

/**
 * Selection that includes all values except those in the specified set
 */
export class AllExcept<T> extends Selection<T> {
	constructor(public readonly values: Set<T>) {
		super();
	}

	apply(value: T): boolean {
		return !this.values.has(value);
	}

	/**
	 * Create AllExcept selection from individual values
	 */
	static create<T>(...values: T[]): AllExcept<T> {
		return new AllExcept(new Set(values));
	}
}

/**
 * Selection that includes only the values in the specified set
 */
export class NoneExcept<T> extends Selection<T> {
	constructor(public readonly values: Set<T>) {
		super();
	}

	apply(value: T): boolean {
		return this.values.has(value);
	}

	/**
	 * Create NoneExcept selection from individual values
	 */
	static create<T>(...values: T[]): NoneExcept<T> {
		return new NoneExcept(new Set(values));
	}
}

/**
 * Selection that requires both sub-selections to match (logical AND)
 */
export class And<T> extends Selection<T> {
	constructor(
		public readonly _1: Selection<T>,
		public readonly _2: Selection<T>,
	) {
		super();
	}

	apply(value: T): boolean {
		return this._1.apply(value) && this._2.apply(value);
	}
}

/**
 * Selection that requires either sub-selection to match (logical OR)
 */
export class Or<T> extends Selection<T> {
	constructor(
		public readonly _1: Selection<T>,
		public readonly _2: Selection<T>,
	) {
		super();
	}

	apply(value: T): boolean {
		return this._1.apply(value) || this._2.apply(value);
	}
}

/**
 * Factory functions for creating Selection instances
 */

/**
 * Create a selection that includes all values
 */
export function createAll<T>(): Selection<T> {
	return AllExcept.create<T>();
}

/**
 * Create a selection that includes no values
 */
export function createNone<T>(): Selection<T> {
	return NoneExcept.create<T>();
}

/**
 * Create AllExcept selection from values
 */
export function createAllExcept<T>(...values: T[]): AllExcept<T> {
	return AllExcept.create(...values);
}

/**
 * Create NoneExcept selection from values
 */
export function createNoneExcept<T>(...values: T[]): NoneExcept<T> {
	return NoneExcept.create(...values);
}

/**
 * Create And selection
 */
export function createAnd<T>(sel1: Selection<T>, sel2: Selection<T>): And<T> {
	return new And(sel1, sel2);
}

/**
 * Create Or selection
 */
export function createOr<T>(sel1: Selection<T>, sel2: Selection<T>): Or<T> {
	return new Or(sel1, sel2);
}

/**
 * Selection factory functions and utilities - for compatibility with Scala API
 */
export namespace Selection {
	export const All = createAll;
	export const None = createNone;
	export const AllExcept = createAllExcept;
	export const NoneExcept = createNoneExcept;
	export const And = createAnd;
	export const Or = createOr;
}

// Export all classes for external use
export { Selection as default };
