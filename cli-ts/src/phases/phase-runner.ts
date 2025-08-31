import { RecPhase, PhaseResult, PhaseContext, GetDepsFunction } from './rec-phase.js';

/**
 * Phase execution cache
 */
export class PhaseCache {
  private readonly cache = new Map<string, any>();

  get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  generateKey(phaseNames: string[], id: any): string {
    const idStr = typeof id === 'string' ? id : JSON.stringify(id);
    return `${phaseNames.join('|')}:${idStr}`;
  }
}

/**
 * Executes phases in a pipeline with dependency resolution
 * Equivalent to Scala PhaseRunner
 */
export class PhaseRunner {
  private static readonly globalCache = new PhaseCache();

  /**
   * Run a phase pipeline on the given input
   */
  static async run<Id, T>(
    phase: RecPhase<Id, T>,
    input: Id,
    options: {
      cache?: PhaseCache;
      getDeps?: GetDepsFunction;
      debug?: boolean;
    } = {}
  ): Promise<PhaseResult<T>> {
    const cache = options.cache || this.globalCache;
    const getDeps = options.getDeps || this.defaultGetDeps;
    const debug = options.debug || false;

    try {
      // Check cache first
      const cacheKey = cache.generateKey(phase.getPhaseNames(), input);
      if (cache.has(cacheKey)) {
        const cached = cache.get<T>(cacheKey);
        if (debug) {
          console.log(`Cache hit for ${cacheKey}`);
        }
        return PhaseResult.success(cached!);
      }

      // Create phase context
      const context: PhaseContext = {
        cache: new Map(),
        getDeps,
        debug,
        depth: 0
      };

      if (debug) {
        console.log(`Executing phase pipeline: ${phase.getPhaseNames().join(' -> ')}`);
      }

      // Execute phase
      const result = await phase.execute(input, input as any, context);

      // Cache successful results
      if (result.isSuccess()) {
        cache.set(cacheKey, result.value);
        if (debug) {
          console.log(`Cached result for ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (options.debug) {
        console.error(`Phase execution failed:`, err);
      }
      return PhaseResult.failure(err);
    }
  }

  /**
   * Run multiple phases in parallel
   */
  static async runParallel<Id, T>(
    phases: Array<{ phase: RecPhase<Id, T>; input: Id }>,
    options: {
      cache?: PhaseCache;
      getDeps?: GetDepsFunction;
      debug?: boolean;
      maxConcurrency?: number;
    } = {}
  ): Promise<PhaseResult<T>[]> {
    const maxConcurrency = options.maxConcurrency || 10;
    const results: PhaseResult<T>[] = [];

    // Process in batches to limit concurrency
    for (let i = 0; i < phases.length; i += maxConcurrency) {
      const batch = phases.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(({ phase, input }) =>
        this.run(phase, input, options)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Run phases with dependency resolution
   */
  static async runWithDependencies<Id, T>(
    phase: RecPhase<Id, T>,
    input: Id,
    getDeps: GetDepsFunction,
    options: {
      cache?: PhaseCache;
      debug?: boolean;
    } = {}
  ): Promise<PhaseResult<T>> {
    const cache = options.cache || this.globalCache;
    const debug = options.debug || false;

    try {
      // Resolve dependencies first
      const deps = await getDeps(input);

      if (debug) {
        console.log(`Resolved ${deps.length} dependencies for ${input}`);
      }

      // Process dependencies first
      const depResults: any[] = [];
      for (const dep of deps) {
        const depResult = await this.run(phase, dep, { cache, getDeps, debug });
        if (depResult.isSuccess()) {
          depResults.push(depResult.value);
        } else if (depResult.isFailure()) {
          // Dependency failed, propagate error
          return PhaseResult.failure(depResult.error!);
        }
        // Ignore ignored dependencies
      }

      // Now process the main input
      return await this.run(phase, input, { cache, getDeps, debug });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (debug) {
        console.error(`Dependency resolution failed:`, err);
      }
      return PhaseResult.failure(err);
    }
  }

  /**
   * Default dependency resolver (no dependencies)
   */
  private static async defaultGetDeps(id: any): Promise<any[]> {
    return [];
  }

  /**
   * Clear all caches
   */
  static clearCache(): void {
    this.globalCache.clear();
  }
}