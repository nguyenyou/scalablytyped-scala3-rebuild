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
}

/**
 * Initial phase that just passes through the input
 */
class InitialPhase<Id> extends RecPhase<Id, Id> {}

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
  constructor(public readonly value: T) {
    super();
  }
  
  isSuccess(): boolean { return true; }
  isFailure(): boolean { return false; }
  isIgnored(): boolean { return false; }
}

class FailureResult<T> extends PhaseResult<T> {
  constructor(public readonly error: Error) {
    super();
  }
  
  isSuccess(): boolean { return false; }
  isFailure(): boolean { return true; }
  isIgnored(): boolean { return false; }
}

class IgnoredResult<T> extends PhaseResult<T> {
  isSuccess(): boolean { return false; }
  isFailure(): boolean { return false; }
  isIgnored(): boolean { return true; }
}
