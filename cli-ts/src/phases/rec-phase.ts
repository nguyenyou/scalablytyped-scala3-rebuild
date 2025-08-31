/**
 * Recursive phase representation for transformation pipeline
 * Equivalent to Scala RecPhase
 */
export abstract class RecPhase<Id, T> {
  /**
   * Add a new phase to the pipeline
   */
  next<TT>(phase: Phase<Id, T, TT>, name: string): RecPhase<Id, TT> {
    return new NextPhase(this, phase, name);
  }

  /**
   * Create an initial phase
   */
  static initial<Id>(): RecPhase<Id, Id> {
    return new InitialPhase<Id>();
  }

  /**
   * Execute this phase with the given input
   */
  abstract execute(id: Id, input: T, context: PhaseContext): Promise<PhaseResult<T>>;

  /**
   * Get all phase names in this pipeline
   */
  abstract getPhaseNames(): string[];

  /**
   * Get the depth of this phase pipeline
   */
  abstract getDepth(): number;
}

/**
 * Phase execution context
 */
export interface PhaseContext {
  /** Cache for storing intermediate results */
  cache: Map<string, any>;

  /** Dependency resolver function */
  getDeps: GetDepsFunction;

  /** Debug mode flag */
  debug: boolean;

  /** Current phase depth */
  depth: number;
}

/**
 * Dependency resolver function type
 */
export type GetDepsFunction = (id: any) => Promise<any[]>;

/**
 * Initial phase that just passes through the input
 */
class InitialPhase<Id> extends RecPhase<Id, Id> {
  async execute(id: Id, input: Id, context: PhaseContext): Promise<PhaseResult<Id>> {
    return PhaseResult.success(input);
  }

  getPhaseNames(): string[] {
    return ['initial'];
  }

  getDepth(): number {
    return 0;
  }
}

/**
 * A phase that transforms input of type T to output of type TT
 */
class NextPhase<Id, T, TT> extends RecPhase<Id, TT> {
  constructor(
    public readonly prev: RecPhase<Id, T>,
    public readonly phase: Phase<Id, T, TT>,
    public readonly name: string
  ) {
    super();
  }

  async execute(id: Id, input: any, context: PhaseContext): Promise<PhaseResult<TT>> {
    try {
      // Execute previous phase first
      const prevResult = await this.prev.execute(id, input, {
        ...context,
        depth: context.depth + 1
      });

      if (!prevResult.isSuccess()) {
        return prevResult as PhaseResult<TT>;
      }

      // Execute current phase
      const result = await this.phase.execute(id, prevResult.value, context);
      return result;
    } catch (error) {
      return PhaseResult.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  getPhaseNames(): string[] {
    return [...this.prev.getPhaseNames(), this.name];
  }

  getDepth(): number {
    return this.prev.getDepth() + 1;
  }
}

/**
 * Phase function type
 */
export interface Phase<Id, T, TT> {
  execute(id: Id, input: T): Promise<PhaseResult<TT>>;
}

/**
 * Result of a phase execution
 */
export abstract class PhaseResult<T> {
  abstract isSuccess(): boolean;
  abstract isFailure(): boolean;
  abstract isIgnored(): boolean;

  /** Get the value if successful, throw if not */
  abstract get value(): T;

  /** Get the error if failed, undefined otherwise */
  abstract get error(): Error | undefined;

  /** Transform the result if successful */
  map<U>(fn: (value: T) => U): PhaseResult<U> {
    if (this.isSuccess()) {
      try {
        return PhaseResult.success(fn(this.value));
      } catch (error) {
        return PhaseResult.failure(error instanceof Error ? error : new Error(String(error)));
      }
    } else if (this.isFailure()) {
      return PhaseResult.failure(this.error!);
    } else {
      return PhaseResult.ignored<U>();
    }
  }

  /** Chain phase results */
  flatMap<U>(fn: (value: T) => PhaseResult<U>): PhaseResult<U> {
    if (this.isSuccess()) {
      try {
        return fn(this.value);
      } catch (error) {
        return PhaseResult.failure(error instanceof Error ? error : new Error(String(error)));
      }
    } else if (this.isFailure()) {
      return PhaseResult.failure(this.error!);
    } else {
      return PhaseResult.ignored<U>();
    }
  }

  static success<T>(value: T): PhaseResult<T> {
    return new SuccessResult(value);
  }

  static failure<T>(error: Error): PhaseResult<T> {
    return new FailureResult(error);
  }

  static ignored<T>(): PhaseResult<T> {
    return new IgnoredResult<T>();
  }
}

class SuccessResult<T> extends PhaseResult<T> {
  constructor(private readonly _value: T) {
    super();
  }

  get value(): T { return this._value; }
  get error(): Error | undefined { return undefined; }

  isSuccess(): boolean { return true; }
  isFailure(): boolean { return false; }
  isIgnored(): boolean { return false; }
}

class FailureResult<T> extends PhaseResult<T> {
  constructor(private readonly _error: Error) {
    super();
  }

  get value(): T {
    throw new Error(`Cannot get value from failed result: ${this._error.message}`);
  }
  get error(): Error { return this._error; }

  isSuccess(): boolean { return false; }
  isFailure(): boolean { return true; }
  isIgnored(): boolean { return false; }
}

class IgnoredResult<T> extends PhaseResult<T> {
  get value(): T {
    throw new Error('Cannot get value from ignored result');
  }
  get error(): Error | undefined { return undefined; }

  isSuccess(): boolean { return false; }
  isFailure(): boolean { return false; }
  isIgnored(): boolean { return true; }
}