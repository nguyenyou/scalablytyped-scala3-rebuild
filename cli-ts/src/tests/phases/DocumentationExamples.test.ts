/**
 * Test suite validating all code examples from the TypeScript phases framework README
 * Ensures documentation examples are accurate and executable
 */

import { describe, test, expect } from 'bun:test';
import { Either, left, right, map, chain, fold } from 'fp-ts/Either';
import { some, none } from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { 
  RecPhase, 
  PhaseRunner, 
  PhaseRes, 
  PhaseListener,
  PhaseEvent,
  CollectingPhaseListener,
  Formatters, 
  Orderings,
  isOk,
  isFailure,
  isIgnore
} from '@/internal/phases';
import { Phase, GetDeps, IsCircular } from '@/internal/phases';
import { Logger } from '@/internal/logging';
import { SortedSet, SortedMap } from '@/internal/collections';

// Test data types from README examples
interface ParsedData { 
  content: string; 
}

interface ValidatedData { 
  content: string; 
  isValid: boolean; 
}

interface TransformedData { 
  result: string; 
}

interface ProcessedData {
  processed: string;
}

interface EnrichedData {
  content: string;
  enrichments: string[];
}

// Mock logger and utilities
const mockLogger = Logger.DevNull();
const getLogger = (_id: string) => mockLogger;

// Helper functions
const enrichDataWith = (data: ParsedData, deps: SortedMap<string, any>): EnrichedData => ({
  content: data.content,
  enrichments: Array.from(deps.keys())
});

const validateInput = (value: string): Either<string, string> => 
  value.length > 0 ? right(value) : left("Empty input");

const processData = (value: string): string => value.toUpperCase();

const enrichData = (value: string): Either<string, ProcessedData> => 
  right({ processed: value });

describe('Documentation Examples - TypeScript', () => {
  describe('Simple Examples', () => {
    test('Simple single-phase example from README', () => {
      // Example from README: Simple Single-Phase Example
      const upperCasePhase: Phase<string, string, string> = 
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.Ok(value.toUpperCase());
        };

      const pipeline = RecPhase.apply<string>().next(upperCasePhase, "uppercase");
      const runner = PhaseRunner.apply(pipeline, getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());
      const result = runner("hello");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe("HELLO");
      }
    });

    test('Multi-phase pipeline example from README', () => {
      // Example from README: Multi-Phase Pipeline Example
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

      const pipeline = RecPhase.apply<string>()
        .next(parsePhase, "parse")
        .next(validatePhase, "validate")
        .next(transformPhase, "transform");

      const runner = PhaseRunner.apply(pipeline, getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());
      const result = runner("input-data");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.result).toBe("INPUT-DATA");
      }
    });
  });

  describe('Dependency Handling Examples', () => {
    test('Example with dependencies from README', () => {
      // Example from README: Example with Dependencies
      const parsePhase: Phase<string, string, ParsedData> = 
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.Ok({ content: value });
        };

      const dependencyPhase: Phase<string, ParsedData, EnrichedData> =
        (id, value, getDeps, isCircular, logger) => {
          // Only request dependencies if this is not a dependency itself
          if (id === "test-input") {
            const dependencies = SortedSet.from(["dependency1", "dependency2"]);

            const depsResult = getDeps(dependencies);

            if (depsResult._tag === 'Ok') {
              const enriched = enrichDataWith(value, depsResult.value);
              return PhaseRes.Ok(enriched);
            } else if (depsResult._tag === 'Failure') {
              return depsResult;
            } else {
              return PhaseRes.Ignore();
            }
          } else {
            // For dependencies, just return the parsed data as enriched data
            return PhaseRes.Ok({ content: value.content, enrichments: [] });
          }
        };

      const pipeline = RecPhase.apply<string>()
        .next(parsePhase, "parse")
        .next(dependencyPhase, "enrich");

      const runner = PhaseRunner.apply(pipeline, getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());
      const result = runner("test-input");

      // The dependency phase will succeed because dependencies are resolved automatically
      // by the PhaseRunner, even if they don't exist as separate computations
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).toBe("test-input");
        expect(Array.isArray(result.value.enrichments)).toBe(true);
      }
    });
  });

  describe('Error Handling Examples', () => {
    test('Error handling example from README', () => {
      // Example from README: Error Handling Example
      const riskyPhase: Phase<string, string, ProcessedData> = 
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.attempt(id, logger, () => {
            if (value.includes("error")) {
              throw new Error("Processing failed");
            }
            return PhaseRes.Ok({ processed: value });
          });
        };

      const pipeline = RecPhase.apply<string>().next(riskyPhase, "risky");
      const runner = PhaseRunner.apply(pipeline, getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());
      
      // Test successful case
      const successResult = runner("good-input");
      expect(isOk(successResult)).toBe(true);
      if (isOk(successResult)) {
        expect(successResult.value.processed).toBe("good-input");
      }

      // Test error case
      const errorResult = runner("error-input");
      expect(isFailure(errorResult)).toBe(true);
      if (isFailure(errorResult)) {
        expect(errorResult.errors.size).toBeGreaterThan(0);
      }
    });

    test('Validation failure example', () => {
      // Test validation failure from multi-phase example
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

      const pipeline = RecPhase.apply<string>()
        .next(parsePhase, "parse")
        .next(validatePhase, "validate");

      const runner = PhaseRunner.apply(pipeline, getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());
      const result = runner(""); // Empty string should fail validation

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        const error = result.errors.values().next().value;
        expect(error).toBeDefined();
        if (error && error._tag === 'Right') {
          expect(error.right).toBe("Validation failed");
        }
      }
    });
  });

  describe('Circular Dependency Examples', () => {
    test('Circular dependency detection from README', () => {
      // Example from README: Circular Dependency Detection
      const circularAwarePhase: Phase<string, string, string> = 
        (id, value, getDeps, isCircular, logger) => {
          if (isCircular) {
            logger.warn(`Circular dependency detected for ${id}`);
            return PhaseRes.Ok(`${value}-circular`);
          } else {
            return PhaseRes.Ok(`${value}-normal`);
          }
        };

      const pipeline = RecPhase.apply<string>().next(circularAwarePhase, "circular-aware");
      
      // Test normal execution
      const runner = PhaseRunner.apply(pipeline, getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());
      const normalResult = runner("test");
      expect(isOk(normalResult)).toBe(true);
      if (isOk(normalResult)) {
        expect(normalResult.value).toBe("test-normal");
      }

      // Test circular execution
      const circularResult = PhaseRunner.go(pipeline, "test", ["test"], getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());
      expect(isOk(circularResult)).toBe(true);
      if (isOk(circularResult)) {
        expect(circularResult.value).toBe("test-circular");
      }
    });
  });

  describe('Type Guard Examples', () => {
    test('Using type guards for safe access from README', () => {
      // Example from README: Using Type Guards for Safe Access
      const simplePhase: Phase<string, string, string> =
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.Ok(value.toUpperCase());
        };

      const pipeline = RecPhase.apply<string>().next(simplePhase, "simple");
      const runner = PhaseRunner.apply(pipeline, getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());
      const result = runner("input");

      // Test type guards as shown in README
      if (isOk(result)) {
        expect(result.value).toBe("INPUT");
      } else if (isFailure(result)) {
        // This shouldn't happen in this test
        expect(true).toBe(false);
      } else if (isIgnore(result)) {
        // This shouldn't happen in this test
        expect(true).toBe(false);
      }

      expect(isOk(result)).toBe(true);
      expect(isFailure(result)).toBe(false);
      expect(isIgnore(result)).toBe(false);
    });
  });

  describe('Advanced Features Examples', () => {
    test('Custom listener example from README', () => {
      // Example from README: Custom Listeners
      class CustomPhaseListener<Id> implements PhaseListener<Id> {
        public events: Array<{ phaseName: string; id: Id; event: PhaseEvent<Id> }> = [];

        on(phaseName: string, id: Id, event: PhaseEvent<Id>): void {
          this.events.push({ phaseName, id, event });

          switch (event._tag) {
            case 'Started':
              // console.log(`Starting phase ${event.phase} for ${id}`);
              break;
            case 'Success':
              // console.log(`Completed phase ${event.phase} for ${id}`);
              break;
            case 'Failure':
              // console.log(`Failed phase ${event.phase} for ${id}:`, event.errors);
              break;
            case 'Blocked':
              // console.log(`Phase ${event.phase} blocked on:`, Array.from(event.on));
              break;
            case 'Ignored':
              // console.log(`Phase ignored for ${id}`);
              break;
          }
        }
      }

      const simplePhase: Phase<string, string, string> =
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.Ok(value.toUpperCase());
        };

      const pipeline = RecPhase.apply<string>().next(simplePhase, "test-phase");
      const customListener = new CustomPhaseListener<string>();
      const runner = PhaseRunner.apply(pipeline, getLogger, customListener, Formatters.string(), Orderings.string());

      const result = runner("test");

      expect(isOk(result)).toBe(true);
      expect(customListener.events.length).toBeGreaterThan(0);

      // Verify we got Started and Success events
      const startedEvents = customListener.events.filter(e => e.event._tag === 'Started');
      const successEvents = customListener.events.filter(e => e.event._tag === 'Success');
      expect(startedEvents.length).toBeGreaterThan(0);
      expect(successEvents.length).toBeGreaterThan(0);
    });

    test('Conditional phase execution from README', () => {
      // Example from README: Conditional Phase Execution
      const parsePhase: Phase<string, string, ParsedData> =
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.Ok({ content: value });
        };

      const validatePhase: Phase<string, ParsedData, ParsedData> =
        (id, value, getDeps, isCircular, logger) => {
          if (value.content.includes("invalid")) {
            return PhaseRes.Failure(new Map([[id, right("Validation failed")]]));
          }
          return PhaseRes.Ok(value);
        };

      const transformPhase: Phase<string, ParsedData, TransformedData> =
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.Ok({ result: value.content.toUpperCase() });
        };

      // Test with validation enabled
      const enableValidation = true;
      const conditionalPipeline = RecPhase.apply<string>()
        .next(parsePhase, "parse")
        .nextOpt(
          enableValidation ? some(validatePhase) : none,
          "validate"
        )
        .next(transformPhase, "transform");

      const runner = PhaseRunner.apply(conditionalPipeline, getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());

      // Test successful case
      const successResult = runner("valid-input");
      expect(isOk(successResult)).toBe(true);

      // Test validation failure
      const failureResult = runner("invalid-input");
      expect(isFailure(failureResult)).toBe(true);

      // Test with validation disabled
      const disabledValidationPipeline = RecPhase.apply<string>()
        .next(parsePhase, "parse")
        .nextOpt(none, "validate")
        .next(transformPhase, "transform");

      const disabledRunner = PhaseRunner.apply(disabledValidationPipeline, getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());
      const disabledResult = disabledRunner("invalid-input");
      expect(isOk(disabledResult)).toBe(true); // Should succeed since validation is skipped
    });

    test('Performance monitoring example from README', () => {
      // Example from README: Performance Monitoring
      class PerformanceListener<Id> implements PhaseListener<Id> {
        private timings = new Map<string, number>();
        public measurements: Array<{ phase: string; id: Id; duration: number }> = [];

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
              this.measurements.push({ phase: phaseName, id, duration });
              this.timings.delete(key);
              break;
          }
        }
      }

      const slowPhase: Phase<string, string, string> =
        (id, value, getDeps, isCircular, logger) => {
          // Simulate some work
          return PhaseRes.Ok(value.toUpperCase());
        };

      const pipeline = RecPhase.apply<string>().next(slowPhase, "slow-phase");
      const perfListener = new PerformanceListener<string>();
      const runner = PhaseRunner.apply(pipeline, getLogger, perfListener, Formatters.string(), Orderings.string());

      const result = runner("test");

      expect(isOk(result)).toBe(true);
      expect(perfListener.measurements.length).toBe(1);
      expect(perfListener.measurements[0].phase).toBe("slow-phase");
      expect(perfListener.measurements[0].duration).toBeGreaterThanOrEqual(0);
    });

    test('Functional composition with fp-ts from README', () => {
      // Example from README: Functional Composition with fp-ts
      const functionalPhase: Phase<string, string, ProcessedData> =
        (id, value, getDeps, isCircular, logger) => {
          return pipe(
            value,
            validateInput,
            map(processData),
            chain(enrichData),
            fold(
              (error: string) => PhaseRes.Failure(new Map([[id, right(error)]])),
              (data: ProcessedData) => PhaseRes.Ok(data)
            )
          );
        };

      const pipeline = RecPhase.apply<string>().next(functionalPhase, "functional");
      const runner = PhaseRunner.apply(pipeline, getLogger, new CollectingPhaseListener(), Formatters.string(), Orderings.string());

      // Test successful case
      const successResult = runner("valid-input");
      expect(isOk(successResult)).toBe(true);
      if (isOk(successResult)) {
        expect(successResult.value.processed).toBe("VALID-INPUT");
      }

      // Test failure case
      const failureResult = runner("");
      expect(isFailure(failureResult)).toBe(true);
      if (isFailure(failureResult)) {
        const error = failureResult.errors.values().next().value;
        expect(error).toBeDefined();
        if (error && error._tag === 'Right') {
          expect(error.right).toBe("Empty input");
        }
      }
    });
  });

  describe('Testing Examples from README', () => {
    test('Unit testing phases example from README', () => {
      // Example from README: Unit Testing Phases
      const upperCasePhase: Phase<string, string, string> =
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.Ok(value.toUpperCase());
        };

      const mockGetDeps: GetDeps<string, string> = () => PhaseRes.Ok(new SortedMap<string, string>());
      const result = upperCasePhase("test", "hello", mockGetDeps, false, mockLogger);

      expect(result._tag).toBe('Ok');
      if (result._tag === 'Ok') {
        expect(result.value).toBe('HELLO');
      }
    });

    test('Dependency testing example from README', () => {
      // Example from README: Unit Testing Phases - dependency handling
      const dependencyPhase: Phase<string, string, string> =
        (id, value, getDeps, isCircular, logger) => {
          const deps = SortedSet.from(["dep1"]);
          const depsResult = getDeps(deps);

          if (depsResult._tag === 'Failure') {
            return depsResult;
          }
          return PhaseRes.Ok(value);
        };

      const mockGetDeps: GetDeps<string, string> = () => PhaseRes.Failure(new Map<string, Either<Error, string>>([["dep1", right("Not found")]]));
      const result = dependencyPhase("test", "input", mockGetDeps, false, mockLogger);

      expect(result._tag).toBe('Failure');
    });

    test('Integration testing example from README', () => {
      // Example from README: Integration Testing
      const parsePhase: Phase<string, string, ParsedData> =
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.Ok({ content: value });
        };

      const validatePhase: Phase<string, ParsedData, ValidatedData> =
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.Ok({ content: value.content, isValid: true });
        };

      const transformPhase: Phase<string, ValidatedData, TransformedData> =
        (id, value, getDeps, isCircular, logger) => {
          return PhaseRes.Ok({ result: value.content.toUpperCase() });
        };

      const pipeline = RecPhase.apply<string>()
        .next(parsePhase, "parse")
        .next(validatePhase, "validate")
        .next(transformPhase, "transform");

      const listener = new CollectingPhaseListener<string>();
      const runner = PhaseRunner.apply(pipeline, getLogger, listener, Formatters.string(), Orderings.string());

      const result = runner("test-input");

      expect(result._tag).toBe('Ok');
      expect(listener.size).toBeGreaterThan(0);

      if (isOk(result)) {
        expect(result.value.result).toBe("TEST-INPUT");
      }
    });
  });
});