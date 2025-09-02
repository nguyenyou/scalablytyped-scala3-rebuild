/**
 * TypeScript port of PhaseRunner tests
 * Ensures identical behavior to the Scala implementation
 */

import { describe, test, expect } from 'bun:test';
import { Either, left, right } from 'fp-ts/Either';
import { PhaseRunner, Formatters, Orderings } from '@/internal/phases';
import { RecPhase } from '@/internal/phases';
import { PhaseRes } from '@/internal/phases';
import { PhaseListener, PhaseEvent, CollectingPhaseListener } from '@/internal/phases';
import { Phase, GetDeps, IsCircular } from '@/internal/phases';
import { Logger } from '@/internal/logging';
import { SortedSet, SortedMap } from '@/internal/collections';

// Test helper types
type TestId = string;
interface TestValue {
  data: string;
  step: number;
}

// Mock logger for testing
const mockLogger = Logger.DevNull();
const getLogger = (_id: TestId) => mockLogger;

// Test listener implementation
class TestListener implements PhaseListener<TestId> {
  private events: Array<{ phaseName: string; id: TestId; event: PhaseEvent<TestId> }> = [];

  on(phaseName: string, id: TestId, event: PhaseEvent<TestId>): void {
    this.events.push({ phaseName, id, event });
  }

  getEvents(): Array<{ phaseName: string; id: TestId; event: PhaseEvent<TestId> }> {
    return [...this.events];
  }

  getEventsForPhase(phaseName: string): Array<{ phaseName: string; id: TestId; event: PhaseEvent<TestId> }> {
    return this.events.filter(e => e.phaseName === phaseName);
  }

  clear(): void {
    this.events = [];
  }

  get size(): number {
    return this.events.length;
  }
}

// Helper phase functions
const identityPhase: Phase<TestId, TestId, TestId> = 
  (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestId>, isCircular: IsCircular, logger: Logger<void>) =>
    PhaseRes.Ok(value);

const transformPhase = (transform: (s: string) => string): Phase<TestId, TestValue, TestValue> =>
  (id: TestId, value: TestValue, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
    PhaseRes.Ok({ data: transform(value.data), step: value.step + 1 });

const failingPhase = (errorMsg: string): Phase<TestId, TestValue, TestValue> =>
  (id: TestId, value: TestValue, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
    PhaseRes.Failure(new Map([[id, right(errorMsg)]]));

const ignoringPhase: Phase<TestId, TestValue, TestValue> =
  (id: TestId, value: TestValue, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
    PhaseRes.Ignore();

const dependencyPhase = (deps: Set<TestId>): Phase<TestId, TestValue, TestValue> =>
  (id: TestId, value: TestValue, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) => {
    // Only request dependencies for the main ID, not for dependency IDs themselves
    if (deps.size > 0 && !deps.has(id)) {
      const depsResult = getDeps(SortedSet.from(deps));
      if (depsResult._tag === 'Ok') {
        const depCount = depsResult.value.size;
        return PhaseRes.Ok({ data: `${value.data}-with-${depCount}-deps`, step: value.step + 1 });
      } else {
        return depsResult as PhaseRes<TestId, TestValue>;
      }
    } else {
      return PhaseRes.Ok({ data: value.data, step: value.step + 1 });
    }
  };

describe('PhaseRunner', () => {
  describe('Basic execution', () => {
    test('should execute simple identity phase', () => {
      const phase = RecPhase.apply<TestId>();
      const listener = new TestListener();
      
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result = runner('test-input');
      
      expect(result._tag).toBe('Ok');
      if (result._tag === 'Ok') {
        expect(result.value).toBe('test-input');
      }
    });

    test('should execute chained phases', () => {
      const phase = RecPhase.apply<TestId>()
        .next(
          (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
            PhaseRes.Ok({ data: value, step: 0 }),
          'to-testvalue'
        )
        .next(transformPhase(s => s.toUpperCase()), 'uppercase')
        .next(transformPhase(s => s + '!'), 'exclamation');
      
      const listener = new TestListener();
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result = runner('hello');
      
      expect(result._tag).toBe('Ok');
      if (result._tag === 'Ok') {
        expect(result.value.data).toBe('HELLO!');
        expect(result.value.step).toBe(2);
      }
      
      // Should have events for all 3 phases
      const events = listener.getEvents();
      expect(events.length).toBe(6); // 3 phases × 2 events each (Started + Success)
    });
  });

  describe('Error handling', () => {
    test('should handle phase failures', () => {
      const phase = RecPhase.apply<TestId>()
        .next(
          (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
            PhaseRes.Ok({ data: value, step: 0 }),
          'to-testvalue'
        )
        .next(failingPhase('test error'), 'failing-phase');
      
      const listener = new TestListener();
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result = runner('test-input');
      
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        expect(result.errors.size).toBeGreaterThan(0);
      }
      
      // Should have failure event
      const events = listener.getEvents();
      const failureEvents = events.filter(e => e.event._tag === 'Failure');
      expect(failureEvents.length).toBeGreaterThan(0);
    });

    test('should handle phase ignores', () => {
      const phase = RecPhase.apply<TestId>()
        .next(
          (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
            PhaseRes.Ok({ data: value, step: 0 }),
          'to-testvalue'
        )
        .next(ignoringPhase, 'ignoring-phase');
      
      const listener = new TestListener();
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result = runner('test-input');
      
      expect(result._tag).toBe('Ignore');
      
      // Should have ignore event
      const events = listener.getEvents();
      const ignoreEvents = events.filter(e => e.event._tag === 'Ignored');
      expect(ignoreEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Dependency resolution', () => {
    test('should handle phases with dependencies', () => {
      const phase = RecPhase.apply<TestId>()
        .next(
          (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
            PhaseRes.Ok({ data: value, step: 0 }),
          'to-testvalue'
        )
        .next(dependencyPhase(new Set(['dep1'])), 'dependency-phase');
      
      const listener = new TestListener();
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result = runner('main');
      
      expect(result._tag).toBe('Ok');
      if (result._tag === 'Ok') {
        expect(result.value.data).toContain('main');
        expect(result.value.step).toBeGreaterThan(0);
      }
    });

    test('should handle empty dependencies', () => {
      const phase = RecPhase.apply<TestId>()
        .next(
          (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
            PhaseRes.Ok({ data: value, step: 0 }),
          'to-testvalue'
        )
        .next(dependencyPhase(new Set()), 'no-dependencies');
      
      const listener = new TestListener();
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result = runner('main');
      
      expect(result._tag).toBe('Ok');
      if (result._tag === 'Ok') {
        expect(result.value.data).toBe('main');
        expect(result.value.step).toBe(1);
      }
      
      // Should not have blocked events for empty dependencies
      const events = listener.getEvents();
      const blockedEvents = events.filter(e => e.event._tag === 'Blocked');
      expect(blockedEvents.length).toBe(0);
    });
  });

  describe('Circular dependency detection', () => {
    test('should detect circular dependencies', () => {
      const phase = RecPhase.apply<TestId>()
        .next(
          (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
            PhaseRes.Ok({ data: value, step: 0 }),
          'to-testvalue'
        )
        .next(
          (id: TestId, value: TestValue, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) => {
            if (isCircular) {
              return PhaseRes.Ok({ data: `${value.data}-circular`, step: value.step + 1 });
            } else {
              return PhaseRes.Ok({ data: `${value.data}-normal`, step: value.step + 1 });
            }
          },
          'circular-aware'
        );
      
      const listener = new TestListener();
      
      // Normal execution
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result1 = runner('test-item');
      
      expect(result1._tag).toBe('Ok');
      if (result1._tag === 'Ok') {
        expect(result1.value.data).toBe('test-item-normal');
      }
      
      // Circular execution should be detected
      const result2 = PhaseRunner.go(phase, 'test-item', ['test-item'], getLogger, listener, Formatters.string(), Orderings.string());
      
      expect(result2._tag).toBe('Ok');
      if (result2._tag === 'Ok') {
        expect(result2.value.data).toBe('test-item-circular');
      }
    });
  });

  describe('PhaseRunner caching behavior', () => {
    test('should cache phase results across executions', () => {
      let computeCount = 0;

      const countingPhase: Phase<TestId, TestId, TestValue> =
        (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) => {
          computeCount += 1;
          return PhaseRes.Ok({ data: `computed-${value}-${computeCount}`, step: computeCount });
        };

      const phase = RecPhase.apply<TestId>()
        .next(countingPhase, 'counting-phase');

      const listener = new TestListener();

      // First execution
      const runner1 = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result1 = runner1('test-id');
      expect(computeCount).toBe(1);

      // Second execution with same phase should use cache
      const runner2 = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result2 = runner2('test-id');
      expect(computeCount).toBe(1); // Should use cache, not compute again

      // Results should be identical due to caching
      expect(result1._tag).toBe('Ok');
      expect(result2._tag).toBe('Ok');
      if (result1._tag === 'Ok' && result2._tag === 'Ok') {
        expect(result1.value.data).toBe('computed-test-id-1');
        expect(result2.value.data).toBe('computed-test-id-1');
      }
    });

    test('should handle circular vs non-circular caching separately', () => {
      let computeCount = 0;

      const countingPhase: Phase<TestId, TestId, TestValue> =
        (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) => {
          computeCount += 1;
          return PhaseRes.Ok({ data: `computed-${value}-${computeCount}`, step: computeCount });
        };

      const phase = RecPhase.apply<TestId>()
        .next(countingPhase, 'counting-phase');

      const listener = new TestListener();

      // Normal execution
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result1 = runner('test-id');
      expect(computeCount).toBe(1);

      // Circular execution should compute separately
      const result2 = PhaseRunner.go(phase, 'test-id', ['test-id'], getLogger, listener, Formatters.string(), Orderings.string());
      expect(computeCount).toBe(2);

      // Results should be different
      expect(result1).not.toEqual(result2);
    });
  });

  describe('PhaseRunner listener integration', () => {
    test('should call listener for all phase events', () => {
      const phase = RecPhase.apply<TestId>()
        .next(
          (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
            PhaseRes.Ok({ data: value, step: 0 }),
          'phase1'
        )
        .next(transformPhase(s => s.toUpperCase()), 'phase2')
        .next(dependencyPhase(new Set(['dep1'])), 'phase3');

      const listener = new TestListener();
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result = runner('test-input');

      expect(result._tag).toBe('Ok');

      const events = listener.getEvents();

      // Should have Started and Success events for each phase
      const startedEvents = events.filter(e => e.event._tag === 'Started');
      const successEvents = events.filter(e => e.event._tag === 'Success');

      expect(startedEvents.length).toBeGreaterThan(0);
      expect(successEvents.length).toBeGreaterThan(0);

      // Check that we have events for all phases
      const phaseNames = new Set(events.map(e => e.phaseName));
      expect(phaseNames.has('phase1')).toBe(true);
      expect(phaseNames.has('phase2')).toBe(true);
      expect(phaseNames.has('phase3')).toBe(true);
    });

    test('should call listener for failure events', () => {
      const phase = RecPhase.apply<TestId>()
        .next(
          (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
            PhaseRes.Ok({ data: value, step: 0 }),
          'phase1'
        )
        .next(failingPhase('test failure'), 'failing-phase');

      const listener = new TestListener();
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result = runner('test-input');

      expect(result._tag).toBe('Failure');

      const events = listener.getEvents();
      const failureEvents = events.filter(e => e.event._tag === 'Failure');

      expect(failureEvents.length).toBeGreaterThan(0);
      expect(failureEvents[0].phaseName).toBe('failing-phase');
    });
  });

  describe('Complex phase pipelines', () => {
    test('should handle mixed success/failure scenarios', () => {
      const conditionalPhase = (shouldSucceed: (id: TestId) => boolean): Phase<TestId, TestValue, TestValue> =>
        (id: TestId, value: TestValue, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) => {
          if (shouldSucceed(id)) {
            return PhaseRes.Ok({ data: `${value.data}-conditional`, step: value.step + 1 });
          } else {
            return PhaseRes.Failure(new Map([[id, right('conditional failure')]]));
          }
        };

      const phase = RecPhase.apply<TestId>()
        .next(
          (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
            PhaseRes.Ok({ data: value, step: 0 }),
          'initialization'
        )
        .next(conditionalPhase(id => id.includes('success')), 'conditional');

      const listener = new TestListener();
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());

      // Test successful path
      const successResult = runner('success-case');
      expect(successResult._tag).toBe('Ok');
      if (successResult._tag === 'Ok') {
        expect(successResult.value.data).toBe('success-case-conditional');
      }

      // Test failure path
      const failureResult = runner('failure-case');
      expect(failureResult._tag).toBe('Failure');
    });

    test('should handle complex dependency chains', () => {
      const multiDependencyPhase = (deps: Set<TestId>): Phase<TestId, TestValue, TestValue> =>
        (id: TestId, value: TestValue, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) => {
          if (deps.size > 0 && !deps.has(id)) {
            const depsResult = getDeps(SortedSet.from(deps));
            if (depsResult._tag === 'Ok') {
              const depData = Array.from(depsResult.value.values()).map(v => v.data).join(',');
              return PhaseRes.Ok({
                data: `${value.data}-deps[${depData}]`,
                step: value.step + 1
              });
            } else {
              return depsResult as PhaseRes<TestId, TestValue>;
            }
          } else {
            return PhaseRes.Ok({ data: value.data, step: value.step + 1 });
          }
        };

      const phase = RecPhase.apply<TestId>()
        .next(
          (id: TestId, value: TestId, getDeps: GetDeps<TestId, TestValue>, isCircular: IsCircular, logger: Logger<void>) =>
            PhaseRes.Ok({ data: value, step: 0 }),
          'initialization'
        )
        .next(multiDependencyPhase(new Set(['dep1', 'dep2', 'dep3'])), 'multi-deps');

      const listener = new TestListener();
      const runner = PhaseRunner.apply(phase, getLogger, listener, Formatters.string(), Orderings.string());
      const result = runner('main');

      expect(result._tag).toBe('Ok');
      if (result._tag === 'Ok') {
        expect(result.value.data).toContain('main');
        expect(result.value.step).toBeGreaterThan(0);
      }
    });
  });
});