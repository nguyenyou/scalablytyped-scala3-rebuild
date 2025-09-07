# Phases Framework (TypeScript)

## Overview

The Phases Framework is a sophisticated computational pipeline system designed to manage complex, multi-step processing workflows with automatic dependency resolution, caching, and error handling. This TypeScript implementation provides a type-safe, functional approach to orchestrating computations using fp-ts for enhanced type safety and functional programming patterns.

### Key Benefits

- **Automatic Dependency Resolution**: Phases can declare dependencies on other computations, and the framework automatically resolves them in the correct order
- **Intelligent Caching**: Results are cached to avoid recomputation, with support for different cache keys based on circular dependency flags
- **Robust Error Handling**: Comprehensive error propagation using fp-ts Either types instead of exceptions
- **Circular Dependency Detection**: Automatic detection and handling of circular dependencies with appropriate fallback behavior
- **Event System**: Complete observability through a flexible listener system for monitoring phase execution
- **Type Safety**: Leverages TypeScript's advanced type system with discriminated unions and type guards

## Architecture

### Core Components

#### PhaseRes<Id, T>
A discriminated union representing the result of a phase computation:
- `{ _tag: 'Ok', value: T }` - Successful computation
- `{ _tag: 'Failure', errors: Map<Id, Either<Error, string>> }` - Failed computation with detailed error information
- `{ _tag: 'Ignore' }` - Computation was skipped/ignored

#### RecPhase<Id, T>
Abstract base class representing a recursive phase definition:
- `RecPhaseInitial` - The starting phase that passes through input unchanged
- `RecPhaseNext` - A transformation phase that processes the output of the previous phase

#### PhaseRunner
The core execution engine that orchestrates phase execution:
- Manages dependency resolution
- Handles circular dependency detection
- Coordinates caching and listener notifications
- Executes phases in the correct order

#### PhaseCache<Id, U>
Caching system for phase results:
- Key-based caching with `[Id, IsCircular]` tuples
- Automatic cache invalidation
- Memory-efficient storage

#### PhaseListener<Id>
Event system for monitoring phase execution:
- `Started`, `Blocked`, `Success`, `Failure`, `Ignored` events
- Pluggable listener implementations
- Real-time execution monitoring

### Data Flow

```
Input → Initial Phase → Phase 1 → Phase 2 → ... → Final Result
                ↓         ↓         ↓
            Cache     Cache     Cache
                ↓         ↓         ↓
            Listener  Listener  Listener
```

## Usage Examples

### Simple Single-Phase Example

```typescript
import { RecPhase, PhaseRunner, PhaseRes, Formatters, Orderings } from './phases';
import { Logger } from './logging';

// Define a simple transformation phase
const upperCasePhase: Phase<string, string, string> = 
  (id, value, getDeps, isCircular, logger) => {
    return PhaseRes.Ok(value.toUpperCase());
  };

// Create and run the pipeline
const pipeline = RecPhase.apply<string>().next(upperCasePhase, "uppercase");
const runner = PhaseRunner.apply(pipeline, getLogger, listener, Formatters.string(), Orderings.string());
const result = runner("hello"); // PhaseRes.Ok("HELLO")
```

### Multi-Phase Pipeline Example

```typescript
interface ParsedData { content: string; }
interface ValidatedData { content: string; isValid: boolean; }
interface TransformedData { result: string; }

// Define multiple phases
const parsePhase: Phase<string, string, ParsedData> = 
  (id, value, getDeps, isCircular, logger) => {
    return PhaseRes.Ok({ content: value });
  };

const validatePhase: Phase<string, ParsedData, ValidatedData> = 
  (id, value, getDeps, isCircular, logger) => {
    if (value.content.length > 0) {
      return PhaseRes.Ok({ content: value.content, isValid: true });
    } else {
      return PhaseRes.Failure(new Map([[id, right("Validation failed")]]));
    }
  };

const transformPhase: Phase<string, ValidatedData, TransformedData> = 
  (id, value, getDeps, isCircular, logger) => {
    return PhaseRes.Ok({ result: value.content.toUpperCase() });
  };

// Chain phases together
const pipeline = RecPhase.apply<string>()
  .next(parsePhase, "parse")
  .next(validatePhase, "validate")
  .next(transformPhase, "transform");

const runner = PhaseRunner.apply(pipeline, getLogger, listener, Formatters.string(), Orderings.string());
const result = runner("input-data");
```

### Example with Dependencies

```typescript
import { SortedSet } from '../collections';

const dependencyPhase: Phase<string, ParsedData, EnrichedData> = 
  (id, value, getDeps, isCircular, logger) => {
    // Declare dependencies
    const dependencies = SortedSet.from(["dependency1", "dependency2"]);
    
    const depsResult = getDeps(dependencies);
    
    if (depsResult._tag === 'Ok') {
      // Use dependency results to enrich data
      const enriched = enrichDataWith(value, depsResult.value);
      return PhaseRes.Ok(enriched);
    } else if (depsResult._tag === 'Failure') {
      return depsResult;
    } else {
      return PhaseRes.Ignore();
    }
  };

const pipeline = RecPhase.apply<string>()
  .next(parsePhase, "parse")
  .next(dependencyPhase, "enrich");
```

### Error Handling Example

```typescript
const riskyPhase: Phase<string, string, ProcessedData> = 
  (id, value, getDeps, isCircular, logger) => {
    return PhaseRes.attempt(id, logger, () => {
      if (value.includes("error")) {
        throw new Error("Processing failed");
      }
      return PhaseRes.Ok({ processed: value });
    });
  };

// Errors are automatically caught and wrapped in PhaseRes.Failure
const pipeline = RecPhase.apply<string>().next(riskyPhase, "risky");
const result = runner("error-input"); // PhaseRes.Failure with error details
```

### Circular Dependency Detection

```typescript
const circularAwarePhase: Phase<string, string, string> = 
  (id, value, getDeps, isCircular, logger) => {
    if (isCircular) {
      // Handle circular dependency case
      logger.warn(`Circular dependency detected for ${id}`);
      return PhaseRes.Ok(`${value}-circular`);
    } else {
      // Normal processing
      return PhaseRes.Ok(`${value}-normal`);
    }
  };

// The framework automatically detects and flags circular dependencies
const pipeline = RecPhase.apply<string>().next(circularAwarePhase, "circular-aware");
```

### Using Type Guards for Safe Access

```typescript
const result = runner("input");

if (isOk(result)) {
  console.log("Success:", result.value);
} else if (isFailure(result)) {
  console.log("Errors:", result.errors);
} else if (isIgnore(result)) {
  console.log("Computation was ignored");
}
```

## API Reference

### PhaseRes<Id, T>
- `map<U>(f: (value: T) => U): (phaseRes: PhaseRes<Id, T>) => PhaseRes<Id, U>` - Transform successful results
- `flatMap<U>(f: (value: T) => PhaseRes<Id, U>): (phaseRes: PhaseRes<Id, T>) => PhaseRes<Id, U>` - Chain computations
- `forEach<T>(f: (value: T) => void): (phaseRes: PhaseRes<Id, T>) => PhaseRes<Id, void>` - Perform side effects

### RecPhase<Id, T>
- `next<TT>(phase: Phase<Id, T, TT>, name: string): RecPhase<Id, TT>` - Add a new phase
- `nextOpt(phase: Option<Phase<Id, T, T>>, name: string): RecPhase<Id, T>` - Conditionally add a phase

### PhaseRunner
- `apply<Id, T>(phase: RecPhase<Id, T>, ...): (initial: Id) => PhaseRes<Id, T>` - Create a runner function
- `go<Id, TT>(phase: RecPhase<Id, TT>, id: Id, circuitBreaker: Id[], ...): PhaseRes<Id, TT>` - Execute with circuit breaker

### PhaseListener<Id>
- `on(phaseName: string, id: Id, event: PhaseEvent<Id>): void` - Handle phase events

### Type Guards
- `isOk<Id, T>(phaseRes: PhaseRes<Id, T>): boolean` - Check if result is Ok
- `isFailure<Id, T>(phaseRes: PhaseRes<Id, T>): boolean` - Check if result is Failure
- `isIgnore<Id, T>(phaseRes: PhaseRes<Id, T>): boolean` - Check if result is Ignore

## TypeScript-Specific Considerations

### fp-ts Integration
- Uses `Either<Error, string>` for error handling instead of throwing exceptions
- Leverages `Option` types for nullable values
- Functional composition patterns throughout

### Type Safety
- Discriminated unions for type-safe result handling
- Type guards for safe property access
- Generic type parameters for flexible, reusable components
- Compile-time type checking prevents runtime errors

### Performance
- Efficient caching with proper key serialization
- Minimal object allocation in hot paths
- Tree-shakeable imports for optimal bundle size

## Advanced Features

### Custom Listeners

```typescript
class CustomPhaseListener<Id> implements PhaseListener<Id> {
  on(phaseName: string, id: Id, event: PhaseEvent<Id>): void {
    switch (event._tag) {
      case 'Started':
        console.log(`Starting phase ${event.phase} for ${id}`);
        break;
      case 'Success':
        console.log(`Completed phase ${event.phase} for ${id}`);
        break;
      case 'Failure':
        console.log(`Failed phase ${event.phase} for ${id}:`, event.errors);
        break;
      case 'Blocked':
        console.log(`Phase ${event.phase} blocked on:`, Array.from(event.on));
        break;
      case 'Ignored':
        console.log(`Phase ignored for ${id}`);
        break;
    }
  }
}
```

### Conditional Phase Execution

```typescript
import { some, none } from 'fp-ts/Option';

const conditionalPipeline = RecPhase.apply<string>()
  .next(parsePhase, "parse")
  .nextOpt(
    enableValidation ? some(validatePhase) : none,
    "validate"
  )
  .next(transformPhase, "transform");
```

### Performance Monitoring

```typescript
class PerformanceListener<Id> implements PhaseListener<Id> {
  private timings = new Map<string, number>();

  on(phaseName: string, id: Id, event: PhaseEvent<Id>): void {
    const key = `${phaseName}-${id}`;

    switch (event._tag) {
      case 'Started':
        this.timings.set(key, Date.now());
        break;
      case 'Success':
      case 'Failure':
        const startTime = this.timings.get(key) ?? 0;
        const duration = Date.now() - startTime;
        console.log(`Phase ${phaseName} took ${duration}ms for ${id}`);
        this.timings.delete(key);
        break;
    }
  }
}
```

### Functional Composition with fp-ts

```typescript
import { pipe } from 'fp-ts/function';
import { map, chain } from 'fp-ts/Either';

const functionalPhase: Phase<string, string, ProcessedData> =
  (id, value, getDeps, isCircular, logger) => {
    return pipe(
      value,
      validateInput,
      map(processData),
      chain(enrichData),
      Either.fold(
        error => PhaseRes.Failure(new Map([[id, right(error)]])),
        data => PhaseRes.Ok(data)
      )
    );
  };
```

## Best Practices

1. **Keep phases pure** - Avoid side effects in phase functions when possible
2. **Use descriptive phase names** - They appear in logs and error messages
3. **Handle circular dependencies** - Always check the `isCircular` flag
4. **Leverage type guards** - Use `isOk`, `isFailure`, `isIgnore` for safe access
5. **Use fp-ts patterns** - Prefer `Either` and `Option` over null/undefined
6. **Monitor execution** - Use listeners to track phase performance and errors
7. **Leverage TypeScript's type system** - Use generic constraints and mapped types for better APIs
8. **Compose phases incrementally** - Build complex pipelines from simple, testable phases
9. **Handle errors functionally** - Use `PhaseRes.attempt` for exception-prone operations

## Testing

### Unit Testing Phases

```typescript
import { describe, test, expect } from 'vitest';

describe('upperCasePhase', () => {
  test('should transform input to uppercase', () => {
    const mockGetDeps = () => PhaseRes.Ok(new SortedMap());
    const result = upperCasePhase("test", "hello", mockGetDeps, false, mockLogger);

    expect(result._tag).toBe('Ok');
    if (result._tag === 'Ok') {
      expect(result.value).toBe('HELLO');
    }
  });

  test('should handle dependencies correctly', () => {
    const mockGetDeps = () => PhaseRes.Failure(new Map([["dep1", right("Not found")]]));
    const result = dependencyPhase("test", "input", mockGetDeps, false, mockLogger);

    expect(result._tag).toBe('Failure');
  });
});
```

### Integration Testing

```typescript
describe('Pipeline Integration', () => {
  test('should execute complete pipeline', () => {
    const pipeline = RecPhase.apply<string>()
      .next(parsePhase, "parse")
      .next(validatePhase, "validate")
      .next(transformPhase, "transform");

    const listener = new CollectingPhaseListener<string>();
    const runner = PhaseRunner.apply(pipeline, getLogger, listener, Formatters.string(), Orderings.string());

    const result = runner("test-input");

    expect(result._tag).toBe('Ok');
    expect(listener.size).toBeGreaterThan(0);
  });
});
```

## Migration Guide

When migrating from other pipeline systems:

1. **Identify your computation steps** - Each step becomes a phase
2. **Map dependencies** - Explicit dependency declarations replace implicit ordering
3. **Convert error handling** - Replace try/catch with `PhaseRes.Failure` and fp-ts `Either`
4. **Add type safety** - Use TypeScript's type system for compile-time guarantees
5. **Implement monitoring** - Add listeners for observability
6. **Leverage fp-ts** - Use functional programming patterns for robust error handling