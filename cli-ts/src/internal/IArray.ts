/**
 * TypeScript port of org.scalablytyped.converter.internal.IArray
 *
 * An immutable array implementation that provides functional programming operations
 * while maintaining performance through efficient array operations.
 */

// Type definitions for partial functions (Scala PartialFunction equivalent)
export type PartialFunction<T, U> = {
  isDefinedAt: (value: T) => boolean;
  apply: (value: T) => U;
};

// Helper function to create partial functions
export function partialFunction<T, U>(
  predicate: (value: T) => boolean,
  transform: (value: T) => U
): PartialFunction<T, U> {
  return {
    isDefinedAt: predicate,
    apply: transform
  };
}

// Ordering interface (Scala Ordering equivalent)
export interface Ordering<T> {
  compare(x: T, y: T): number;
}

// Default ordering for basic types
export const StringOrdering: Ordering<string> = {
  compare: (x, y) => x.localeCompare(y)
};

export const NumberOrdering: Ordering<number> = {
  compare: (x, y) => x - y
};

export const BooleanOrdering: Ordering<boolean> = {
  compare: (x, y) => Number(x) - Number(y)
};

/**
 * Builder class for constructing IArray instances efficiently
 */
export class IArrayBuilder<T> {
  private buffer: T[] = [];

  constructor(initialCapacity: number = 32) {
    // TypeScript arrays grow dynamically, so we just initialize empty
  }

  static empty<T>(initialCapacity: number = 32): IArrayBuilder<T> {
    return new IArrayBuilder<T>(initialCapacity);
  }

  static fromIArray<T>(arr: IArray<T>, initialCapacity: number): IArrayBuilder<T> {
    const builder = new IArrayBuilder<T>(initialCapacity);
    for (let i = 0; i < arr.length; i++) {
      builder.addOne(arr.apply(i));
    }
    return builder;
  }

  addOne(elem: T): this {
    this.buffer.push(elem);
    return this;
  }

  clear(): void {
    this.buffer.length = 0;
  }

  result(): IArray<T> {
    return IArray.fromArray([...this.buffer]);
  }

  appendAll(arr: IArray<T>): this {
    for (let i = 0; i < arr.length; i++) {
      this.addOne(arr.apply(i));
    }
    return this;
  }

  get isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  // Extension methods from Scala implementation
  forall(f: (value: T) => boolean): boolean {
    for (let i = 0; i < this.buffer.length; i++) {
      if (!f(this.buffer[i])) {
        return false;
      }
    }
    return true;
  }

  addOrUpdateMatching<U extends T>(
    orElse: U,
    ifNotMatch: (value: U) => U,
    pf: PartialFunction<T, U>
  ): void {
    let updated = false;
    for (let i = 0; i < this.buffer.length && !updated; i++) {
      const item = this.buffer[i];
      if (pf.isDefinedAt(item)) {
        this.buffer[i] = pf.apply(item);
        updated = true;
      }
    }
    if (!updated) {
      this.buffer.push(ifNotMatch(orElse));
    }
  }
}

/**
 * Pattern matching objects (Scala unapply methods equivalent)
 */
export const IArrayPatterns = {
  first: <T>(arr: IArray<T>): T | undefined => arr.headOption,
  last: <T>(arr: IArray<T>): T | undefined => arr.lastOption,
  exactlyOne: <T>(arr: IArray<T>): T | undefined =>
    arr.length === 1 ? arr.apply(0) : undefined,
  exactlyTwo: <T>(arr: IArray<T>): [T, T] | undefined =>
    arr.length === 2 ? [arr.apply(0), arr.apply(1)] : undefined,
  exactlyThree: <T>(arr: IArray<T>): [T, T, T] | undefined =>
    arr.length === 3 ? [arr.apply(0), arr.apply(1), arr.apply(2)] : undefined,
  exactlyFour: <T>(arr: IArray<T>): [T, T, T, T] | undefined =>
    arr.length === 4 ? [arr.apply(0), arr.apply(1), arr.apply(2), arr.apply(3)] : undefined,
  headTail: <T>(arr: IArray<T>): [T, IArray<T>] | undefined =>
    arr.length === 0 ? undefined : [arr.head, arr.tail],
  headHeadTail: <T>(arr: IArray<T>): [T, T, IArray<T>] | undefined =>
    arr.length < 2 ? undefined : [arr.apply(0), arr.apply(1), arr.drop(2)],
  initLast: <T>(arr: IArray<T>): [IArray<T>, T] | undefined =>
    arr.length === 0 ? undefined : [arr.init, arr.last]
};

/**
 * Main IArray class - immutable array implementation
 */
export class IArray<T> {
  private readonly array: T[];
  public readonly length: number;

  private constructor(array: T[], length: number) {
    this.array = array;
    this.length = length;
  }

  // Static factory methods
  static apply<T>(...elements: T[]): IArray<T> {
    return IArray.fromArray(elements);
  }

  static fromOption<T>(option: T | undefined): IArray<T> {
    return option !== undefined ? IArray.apply<T>(option) : IArray.Empty;
  }

  static fromOptions<T>(...options: (T | undefined)[]): IArray<T> {
    return IArray.apply(...options.filter((x): x is T => x !== undefined));
  }

  static fromArray<T>(array: T[]): IArray<T> {
    return IArray.fromArrayAndSize([...array], array.length);
  }

  static fromIterable<T>(iterable: Iterable<T>): IArray<T> {
    const array = Array.from(iterable);
    return IArray.fromArrayAndSize(array, array.length);
  }

  static fromTraversable<T>(iterable: Iterable<T>): IArray<T> {
    return IArray.fromIterable(iterable);
  }

  private static fromArrayAndSize<T>(array: T[], length: number): IArray<T> {
    return length === 0 ? IArray.Empty : new IArray(array, length);
  }

  static readonly Empty: IArray<any> = new IArray<any>([], 0);

  // Core array operations
  get isEmpty(): boolean {
    return this.length === 0;
  }

  get nonEmpty(): boolean {
    return this.length > 0;
  }

  lengthCompare(len: number): number {
    return this.length - len;
  }

  apply(index: number): T {
    if (index < 0 || index >= this.length) {
      throw new Error(`Index ${index} out of bounds for length ${this.length}`);
    }
    return this.array[index];
  }

  applyOrElse<U>(index: number, defaultFn: (index: number) => U): T | U {
    return this.isDefinedAt(index) ? this.apply(index) : defaultFn(index);
  }

  isDefinedAt(index: number): boolean {
    return index >= 0 && index < this.length;
  }

  // Functional operations
  map<U>(f: (value: T) => U): IArray<U> {
    if (this.isEmpty) {
      return IArray.Empty;
    }

    const newArray: U[] = new Array(this.length);
    for (let i = 0; i < this.length; i++) {
      newArray[i] = f(this.apply(i));
    }

    return IArray.fromArrayAndSize(newArray, this.length);
  }

  forEach(f: (value: T) => void): void {
    for (let i = 0; i < this.length; i++) {
      f(this.apply(i));
    }
  }

  flatMap<U>(f: (value: T) => IArray<U>): IArray<U> {
    if (this.isEmpty) {
      return IArray.Empty;
    }

    const nested = this.map(f);
    let totalLength = 0;
    for (let i = 0; i < nested.length; i++) {
      totalLength += nested.apply(i).length;
    }

    const result: U[] = new Array(totalLength);
    let outputIndex = 0;
    for (let i = 0; i < this.length; i++) {
      const subArray = nested.apply(i);
      for (let j = 0; j < subArray.length; j++) {
        result[outputIndex++] = subArray.apply(j);
      }
    }

    return IArray.fromArrayAndSize(result, outputIndex);
  }

  foldLeft<Z>(initial: Z, f: (acc: Z, value: T) => Z): Z {
    let current = initial;
    for (let i = 0; i < this.length; i++) {
      current = f(current, this.apply(i));
    }
    return current;
  }

  foldRight<Z>(initial: Z, f: (value: T, acc: Z) => Z): Z {
    let current = initial;
    for (let i = this.length - 1; i >= 0; i--) {
      current = f(this.apply(i), current);
    }
    return current;
  }

  reduce<U>(op: (acc: T | U, value: T) => U): U {
    if (this.isEmpty) {
      throw new Error("reduce on empty list");
    }
    let result: T | U = this.apply(0);
    let idx = 1;
    while (idx < this.length) {
      result = op(result, this.apply(idx));
      idx += 1;
    }
    return result as U;
  }

  reduceLeft<U>(op: (acc: T | U, value: T) => U): U {
    return this.reduce(op);
  }

  reduceRight<U>(op: (value: T, acc: T | U) => U): U {
    if (this.isEmpty) {
      throw new Error("reduceRight on empty IArray");
    }
    let result: T | U = this.apply(this.length - 1);
    let idx = this.length - 2;
    while (idx >= 0) {
      result = op(this.apply(idx), result);
      idx -= 1;
    }
    return result as U;
  }

  reduceOption<U>(op: (acc: T | U, value: T) => U): U | undefined {
    return this.isEmpty ? undefined : this.reduce(op);
  }

  sum(numeric: { zero: T; plus: (a: T, b: T) => T }): T {
    return this.foldLeft(numeric.zero, numeric.plus);
  }

  count(predicate: (value: T) => boolean): number {
    let result = 0;
    for (let i = 0; i < this.length; i++) {
      if (predicate(this.apply(i))) {
        result++;
      }
    }
    return result;
  }

  // Head/tail operations
  get headOption(): T | undefined {
    return this.isEmpty ? undefined : this.apply(0);
  }

  get head(): T {
    return this.headOption ?? (() => { throw new Error("head of empty list"); })();
  }

  get tailOpt(): IArray<T> | undefined {
    return this.isEmpty ? undefined : this.drop(1);
  }

  get tailOption(): IArray<T> | undefined {
    return this.tailOpt;
  }

  get tail(): IArray<T> {
    return this.tailOpt ?? (() => { throw new Error("tail of empty list"); })();
  }

  get initOption(): IArray<T> | undefined {
    return this.isEmpty ? undefined : this.dropRight(1);
  }

  get init(): IArray<T> {
    return this.initOption ?? (() => { throw new Error("init of empty list"); })();
  }

  get lastOption(): T | undefined {
    return this.isEmpty ? undefined : this.apply(this.length - 1);
  }

  get last(): T {
    return this.lastOption ?? (() => { throw new Error("last of empty list"); })();
  }

  // Predicate operations
  forall(predicate: (value: T) => boolean): boolean {
    for (let i = 0; i < this.length; i++) {
      if (!predicate(this.apply(i))) {
        return false;
      }
    }
    return true;
  }

  exists(predicate: (value: T) => boolean): boolean {
    for (let i = 0; i < this.length; i++) {
      if (predicate(this.apply(i))) {
        return true;
      }
    }
    return false;
  }

  collectFirst<U>(pf: PartialFunction<T, U>): U | undefined {
    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      if (pf.isDefinedAt(value)) {
        return pf.apply(value);
      }
    }
    return undefined;
  }

  indexOf(elem: T, from: number = 0): number {
    let i = Math.max(from, 0);
    while (i < this.length) {
      if (elem === this.apply(i)) {
        return i;
      }
      i++;
    }
    return -1;
  }

  lastIndexOf(elem: T, end: number = this.length - 1): number {
    let i = Math.min(end, this.length - 1);
    while (i >= 0) {
      if (elem === this.apply(i)) {
        return i;
      }
      i--;
    }
    return -1;
  }

  indexWhere(predicate: (value: T) => boolean, from: number = 0): number {
    let i = Math.max(from, 0);
    while (i < this.length) {
      if (predicate(this.apply(i))) {
        return i;
      }
      i++;
    }
    return -1;
  }

  find(predicate: (value: T) => boolean): T | undefined {
    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      if (predicate(value)) {
        return value;
      }
    }
    return undefined;
  }

  collect<U>(pf: PartialFunction<T, U>): IArray<U> {
    if (this.isEmpty) {
      return IArray.Empty;
    }

    const newArray: U[] = new Array(this.length);
    let outputIndex = 0;
    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      if (pf.isDefinedAt(value)) {
        newArray[outputIndex++] = pf.apply(value);
      }
    }

    return IArray.fromArrayAndSize(newArray, outputIndex);
  }

  filter(predicate: (value: T) => boolean): IArray<T> {
    if (this.isEmpty) {
      return this;
    }

    const result = [...this.array];
    let outputIndex = 0;
    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      if (predicate(value)) {
        result[outputIndex++] = value;
      }
    }

    return IArray.fromArrayAndSize(result, outputIndex);
  }

  filterNot(predicate: (value: T) => boolean): IArray<T> {
    return this.filter(value => !predicate(value));
  }

  flatten<U>(this: IArray<IArray<U>>): IArray<U> {
    return this.flatMap(x => x);
  }

  // Array concatenation and modification (Scala ++ operator)
  concat<U>(that: IArray<U>): IArray<T | U> {
    if (this.isEmpty) return that as IArray<T | U>;
    if (that.isEmpty) return this as IArray<T | U>;

    const newLength = this.length + that.length;
    const result: (T | U)[] = new Array(newLength);

    for (let i = 0; i < this.length; i++) {
      result[i] = this.apply(i);
    }
    for (let i = 0; i < that.length; i++) {
      result[this.length + i] = that.apply(i);
    }

    return IArray.fromArrayAndSize(result, newLength);
  }

  // Prepend element (Scala +: operator)
  prepend<U extends T>(elem: U): IArray<T | U> {
    const newLength = this.length + 1;
    const result: (T | U)[] = new Array(newLength);
    result[0] = elem;
    for (let i = 0; i < this.length; i++) {
      result[i + 1] = this.apply(i);
    }
    return IArray.fromArrayAndSize(result, newLength);
  }

  // Append element (Scala :+ operator)
  append<U extends T>(elem: U): IArray<T | U> {
    const newLength = this.length + 1;
    const result: (T | U)[] = new Array(newLength);
    for (let i = 0; i < this.length; i++) {
      result[i] = this.apply(i);
    }
    result[this.length] = elem;
    return IArray.fromArrayAndSize(result, newLength);
  }

  // Prepend all elements
  prependedAll<U extends T>(prefix: IArray<U>): IArray<T | U> {
    if (prefix.isEmpty) return this as IArray<T | U>;
    if (this.isEmpty) return prefix as IArray<T | U>;
    
    const newLength = prefix.length + this.length;
    const result: (T | U)[] = new Array(newLength);
    
    for (let i = 0; i < prefix.length; i++) {
      result[i] = prefix.apply(i);
    }
    for (let i = 0; i < this.length; i++) {
      result[prefix.length + i] = this.apply(i);
    }
    
    return IArray.fromArrayAndSize(result, newLength);
  }

  // Append all elements
  appendedAll<U extends T>(suffix: IArray<U>): IArray<T | U> {
    return this.concat(suffix);
  }

  // Slice operations
  slice(from: number, until: number): IArray<T> {
    if (from < 0) from = 0;
    if (until < 0) until = 0;
    if (from >= this.length || from >= until) return IArray.Empty;
    
    const actualUntil = Math.min(until, this.length);
    const newLength = actualUntil - from;
    
    if (newLength <= 0) return IArray.Empty;
    
    const result: T[] = new Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = this.apply(from + i);
    }
    return IArray.fromArrayAndSize(result, newLength);
  }

  take(n: number): IArray<T> {
    if (n < 0) throw new Error("take: n must be non-negative");
    const newLength = Math.min(this.length, n);
    if (newLength === 0) return IArray.Empty;

    const result: T[] = new Array(newLength);
    let i = 0;
    while (i < newLength) {
      result[i] = this.apply(i);
      i += 1;
    }
    return IArray.fromArrayAndSize(result, newLength);
  }

  takeRight(n: number): IArray<T> {
    if (n < 0) throw new Error("takeRight: n must be non-negative");
    const newLength = Math.min(this.length, n);
    if (newLength === 0) return IArray.Empty;

    const result: T[] = new Array(newLength);
    const startIndex = this.length - newLength;
    let i = 0;
    while (i < newLength) {
      result[i] = this.apply(startIndex + i);
      i += 1;
    }
    return IArray.fromArrayAndSize(result, newLength);
  }

  takeWhile(predicate: (value: T) => boolean): IArray<T> {
    if (this.isEmpty) return this;

    let i = 0;
    while (i < this.length && predicate(this.apply(i))) {
      i++;
    }

    return IArray.fromArrayAndSize([...this.array], i);
  }

  drop(n: number): IArray<T> {
    const newLength = Math.max(0, this.length - n);
    if (newLength === 0) return IArray.Empty;

    const result: T[] = new Array(newLength);
    let i = 0;
    while (i < newLength) {
      result[i] = this.apply(n + i);
      i += 1;
    }
    return IArray.fromArrayAndSize(result, newLength);
  }

  dropRight(n: number): IArray<T> {
    const newLength = Math.max(0, this.length - n);
    return IArray.fromArrayAndSize([...this.array], newLength);
  }

  dropWhile(predicate: (value: T) => boolean): IArray<T> {
    if (this.isEmpty) return IArray.Empty;

    let index = 0;
    while (index < this.length && predicate(this.apply(index))) {
      index++;
    }

    return this.drop(index);
  }

  reverse(): IArray<T> {
    if (this.isEmpty) return IArray.Empty;
    const result: T[] = new Array(this.length);
    let idx = 0;
    while (idx < this.length) {
      result[idx] = this.apply(this.length - 1 - idx);
      idx += 1;
    }
    return IArray.fromArrayAndSize(result, this.length);
  }

  zip<U>(other: IArray<U>): IArray<[T, U]> {
    const newLength = Math.min(this.length, other.length);
    if (newLength === 0) return IArray.Empty;

    const result: [T, U][] = new Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = [this.apply(i), other.apply(i)];
    }
    return IArray.fromArrayAndSize(result, newLength);
  }

  zipWithIndex(): IArray<[T, number]> {
    if (this.isEmpty) return IArray.Empty;

    const result: [T, number][] = new Array(this.length);
    for (let i = 0; i < this.length; i++) {
      result[i] = [this.apply(i), i];
    }
    return IArray.fromArrayAndSize(result, this.length);
  }

  partition(predicate: (value: T) => boolean): [IArray<T>, IArray<T>] {
    const lefts: T[] = new Array(this.length);
    const rights: T[] = new Array(this.length);
    let leftCount = 0;
    let rightCount = 0;

    for (let i = 0; i < this.length; i++) {
      const current = this.apply(i);
      if (predicate(current)) {
        lefts[leftCount++] = current;
      } else {
        rights[rightCount++] = current;
      }
    }

    return [
      IArray.fromArrayAndSize(lefts, leftCount),
      IArray.fromArrayAndSize(rights, rightCount)
    ];
  }

  span(predicate: (value: T) => boolean): [IArray<T>, IArray<T>] {
    let i = 0;
    while (i < this.length && predicate(this.apply(i))) {
      i++;
    }
    return [this.take(i), this.drop(i)];
  }

  splitAt(index: number): [IArray<T>, IArray<T>] {
    return [this.take(index), this.drop(index)];
  }

  // Iterator support
  [Symbol.iterator](): Iterator<T> {
    let index = 0;
    const length = this.length;
    const array = this.array;

    return {
      next(): IteratorResult<T> {
        if (index < length) {
          return { value: array[index++], done: false };
        } else {
          return { done: true, value: undefined };
        }
      }
    };
  }

  get indices(): IArray<number> {
    const result: number[] = new Array(this.length);
    for (let i = 0; i < this.length; i++) {
      result[i] = i;
    }
    return IArray.fromArrayAndSize(result, this.length);
  }

  // Sorting operations
  sortBy<U>(f: (value: T) => U): IArray<T> {
    return this.sorted((a, b) => {
      const aVal = f(a);
      const bVal = f(b);
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  }

  sortWith(compareFn: (a: T, b: T) => number): IArray<T> {
    return this.sorted(compareFn);
  }

  sorted(compareFn?: (a: T, b: T) => number): IArray<T> {
    if (this.length < 2) return this;

    const result = [...this.array.slice(0, this.length)];
    result.sort(compareFn);
    return IArray.fromArrayAndSize(result, this.length);
  }

  min(ordering: Ordering<T>): T {
    if (this.isEmpty) throw new Error("min on empty IArray");
    return this.reduce((x, y) => ordering.compare(x, y) <= 0 ? x : y);
  }

  max(ordering: Ordering<T>): T {
    if (this.isEmpty) throw new Error("max on empty IArray");
    return this.reduce((x, y) => ordering.compare(x, y) >= 0 ? x : y);
  }

  minBy<U>(f: (value: T) => U, ordering: Ordering<U>): T {
    if (this.isEmpty) throw new Error("minBy on empty IArray");

    let minValue: U | undefined = undefined;
    let minElem: T | undefined = undefined;
    let first = true;

    for (const elem of this) {
      const fx = f(elem);
      if (first || ordering.compare(fx, minValue!) < 0) {
        minElem = elem;
        minValue = fx;
        first = false;
      }
    }
    return minElem!;
  }

  maxBy<U>(f: (value: T) => U, ordering: Ordering<U>): T {
    if (this.isEmpty) throw new Error("maxBy on empty IArray");

    let maxValue: U | undefined = undefined;
    let maxElem: T | undefined = undefined;
    let first = true;

    let idx = 0;
    while (idx < this.length) {
      const elem = this.apply(idx);
      const fx = f(elem);
      if (first || ordering.compare(fx, maxValue!) > 0) {
        maxElem = elem;
        maxValue = fx;
        first = false;
      }
      idx += 1;
    }
    return maxElem!;
  }

  distinct(): IArray<T> {
    if (this.length < 2) return this;

    const result: T[] = new Array(this.length);
    const seen = new Set<T>();
    let outputIndex = 0;
    let different = false;

    for (let i = 0; i < this.length; i++) {
      const next = this.apply(i);
      if (!seen.has(next)) {
        seen.add(next);
        result[outputIndex++] = next;
      } else {
        different = true;
      }
    }

    return different ? IArray.fromArrayAndSize(result, outputIndex) : this;
  }

  // Conversion methods
  toSet(): Set<T> {
    return new Set(this.toArray());
  }

  toList(): T[] {
    return this.toArray();
  }

  toVector(): T[] {
    return this.toArray();
  }

  toArray(): T[] {
    return this.array.length === this.length
      ? [...this.array]
      : this.array.slice(0, this.length);
  }

  toMap<K, V>(this: IArray<[K, V]>): Map<K, V> {
    const result = new Map<K, V>();
    for (let i = 0; i < this.length; i++) {
      const [key, value] = this.apply(i);
      result.set(key, value);
    }
    return result;
  }

  groupBy<K>(f: (value: T) => K): Map<K, IArray<T>> {
    const result = new Map<K, IArray<T>>();
    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      const key = f(value);
      const existing = result.get(key);
      if (existing) {
        result.set(key, existing.append(value));
      } else {
        result.set(key, IArray.apply(value));
      }
    }
    return result;
  }

  transpose<U>(this: IArray<IArray<U>>): IArray<IArray<U>> {
    if (this.isEmpty) return IArray.Empty;

    const headSize = this.head.length;
    const builders: IArrayBuilder<U>[] = new Array(headSize);
    for (let i = 0; i < headSize; i++) {
      builders[i] = IArrayBuilder.empty<U>();
    }

    for (const xs of this) {
      if (xs.length !== headSize) {
        throw new Error("transpose requires all collections have the same size");
      }
      for (let i = 0; i < xs.length; i++) {
        builders[i].addOne(xs.apply(i));
      }
    }

    return IArray.fromArray(builders.map(b => b.result()));
  }

  startsWith(that: IArray<T>, offset: number = 0): boolean {
    let i = offset;
    let j = 0;
    while (i < this.length && j < that.length && this.apply(i) === that.apply(j)) {
      i++;
      j++;
    }
    return j === that.length;
  }

  mkString(init: string, sep: string, post: string): string {
    const result = new Array<string>();
    result.push(init);
    let i = 0;
    while (i < this.length) {
      if (i !== 0) {
        result.push(sep);
      }
      result.push(String(this.apply(i)));
      i += 1;
    }
    result.push(post);
    return result.join("");
  }

  updated(index: number, elem: T): IArray<T> {
    if (index < 0 || index >= this.length) {
      throw new Error(`Index ${index} out of bounds for length ${this.length}`);
    }
    if (this.length === 0) return IArray.Empty;

    const result: T[] = new Array(this.length);
    for (let i = 0; i < this.length; i++) {
      result[i] = this.apply(i);
    }
    result[index] = elem;
    return IArray.fromArrayAndSize(result, this.length);
  }

  intersect(that: IArray<T>): IArray<T> {
    const occCounts = this.occCounts(that);
    const builder = IArrayBuilder.empty<T>();

    for (const x of this) {
      const count = occCounts.get(x) || 0;
      if (count > 0) {
        builder.addOne(x);
        occCounts.set(x, count - 1);
      }
    }
    return builder.result();
  }

  private occCounts(sequence: IArray<T>): Map<T, number> {
    const result = new Map<T, number>();
    for (const item of sequence) {
      result.set(item, (result.get(item) || 0) + 1);
    }
    return result;
  }

  // Object methods
  toString(): string {
    return this.mkString("IArray(", ", ", ")");
  }


  private _hashCode: number | undefined;

  get hashCode(): number {
    if (this._hashCode === undefined) {
      const prime = 31;
      let result = 1;
      for (let i = 0; i < this.length; i++) {
        const item = this.apply(i);
        result = prime * result + (typeof item === 'object' && item !== null ?
          (item as any).hashCode?.() ?? 0 :
          typeof item === 'number' ? item :
          typeof item === 'string' ? item.length : 0);
      }
      this._hashCode = result;
    }
    return this._hashCode;
  }

  equals(other: any): boolean {
    if (!(other instanceof IArray)) return false;
    if (other.length !== this.length) return false;
    if (this.hashCode !== other.hashCode) return false;

    for (let i = 0; i < this.length; i++) {
      if (this.apply(i) !== other.apply(i)) {
        return false;
      }
    }
    return true;
  }

  // Extension methods (equivalent to IArrayOps in Scala)
  contains(value: T): boolean {
    for (let i = 0; i < this.length; i++) {
      if (this.array[i] === value) {
        return true;
      }
    }
    return false;
  }

  mapNotNone<U>(f: (value: T) => U | undefined): IArray<U> {
    if (this.isEmpty) {
      return IArray.Empty;
    }

    const newArray: U[] = new Array(this.length);
    let outputIndex = 0;
    for (let i = 0; i < this.length; i++) {
      const result = f(this.apply(i));
      if (result !== undefined) {
        newArray[outputIndex++] = result;
      }
    }
    return IArray.fromArrayAndSize(newArray, outputIndex);
  }

  partitionCollect<U>(pf: PartialFunction<T, U>): [IArray<U>, IArray<T>] {
    const collected: U[] = new Array(this.length);
    let collectedCount = 0;
    const rest: T[] = new Array(this.length);
    let restCount = 0;

    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      if (pf.isDefinedAt(value)) {
        collected[collectedCount++] = pf.apply(value);
      } else {
        rest[restCount++] = value;
      }
    }

    return [
      IArray.fromArrayAndSize(collected, collectedCount),
      IArray.fromArrayAndSize(rest, restCount)
    ];
  }

  partitionCollect2<U1, U2>(
    pf1: PartialFunction<T, U1>,
    pf2: PartialFunction<T, U2>
  ): [IArray<U1>, IArray<U2>, IArray<T>] {
    const a1s: U1[] = new Array(this.length);
    let a1Count = 0;
    const a2s: U2[] = new Array(this.length);
    let a2Count = 0;
    const rest: T[] = new Array(this.length);
    let restCount = 0;

    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      if (pf1.isDefinedAt(value)) {
        a1s[a1Count++] = pf1.apply(value);
      } else if (pf2.isDefinedAt(value)) {
        a2s[a2Count++] = pf2.apply(value);
      } else {
        rest[restCount++] = value;
      }
    }

    return [
      IArray.fromArrayAndSize(a1s, a1Count),
      IArray.fromArrayAndSize(a2s, a2Count),
      IArray.fromArrayAndSize(rest, restCount)
    ];
  }

  partitionCollect3<U1, U2, U3>(
    pf1: PartialFunction<T, U1>,
    pf2: PartialFunction<T, U2>,
    pf3: PartialFunction<T, U3>
  ): [IArray<U1>, IArray<U2>, IArray<U3>, IArray<T>] {
    const a1s: U1[] = new Array(this.length);
    let a1Count = 0;
    const a2s: U2[] = new Array(this.length);
    let a2Count = 0;
    const a3s: U3[] = new Array(this.length);
    let a3Count = 0;
    const rest: T[] = new Array(this.length);
    let restCount = 0;

    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      if (pf1.isDefinedAt(value)) {
        a1s[a1Count++] = pf1.apply(value);
      } else if (pf2.isDefinedAt(value)) {
        a2s[a2Count++] = pf2.apply(value);
      } else if (pf3.isDefinedAt(value)) {
        a3s[a3Count++] = pf3.apply(value);
      } else {
        rest[restCount++] = value;
      }
    }

    return [
      IArray.fromArrayAndSize(a1s, a1Count),
      IArray.fromArrayAndSize(a2s, a2Count),
      IArray.fromArrayAndSize(a3s, a3Count),
      IArray.fromArrayAndSize(rest, restCount)
    ];
  }

  partitionCollect4<U1, U2, U3, U4>(
    pf1: PartialFunction<T, U1>,
    pf2: PartialFunction<T, U2>,
    pf3: PartialFunction<T, U3>,
    pf4: PartialFunction<T, U4>
  ): [IArray<U1>, IArray<U2>, IArray<U3>, IArray<U4>, IArray<T>] {
    const a1s: U1[] = new Array(this.length);
    let a1Count = 0;
    const a2s: U2[] = new Array(this.length);
    let a2Count = 0;
    const a3s: U3[] = new Array(this.length);
    let a3Count = 0;
    const a4s: U4[] = new Array(this.length);
    let a4Count = 0;
    const rest: T[] = new Array(this.length);
    let restCount = 0;

    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      if (pf1.isDefinedAt(value)) {
        a1s[a1Count++] = pf1.apply(value);
      } else if (pf2.isDefinedAt(value)) {
        a2s[a2Count++] = pf2.apply(value);
      } else if (pf3.isDefinedAt(value)) {
        a3s[a3Count++] = pf3.apply(value);
      } else if (pf4.isDefinedAt(value)) {
        a4s[a4Count++] = pf4.apply(value);
      } else {
        rest[restCount++] = value;
      }
    }

    return [
      IArray.fromArrayAndSize(a1s, a1Count),
      IArray.fromArrayAndSize(a2s, a2Count),
      IArray.fromArrayAndSize(a3s, a3Count),
      IArray.fromArrayAndSize(a4s, a4Count),
      IArray.fromArrayAndSize(rest, restCount)
    ];
  }

  partitionCollect5<U1, U2, U3, U4, U5>(
    pf1: PartialFunction<T, U1>,
    pf2: PartialFunction<T, U2>,
    pf3: PartialFunction<T, U3>,
    pf4: PartialFunction<T, U4>,
    pf5: PartialFunction<T, U5>
  ): [IArray<U1>, IArray<U2>, IArray<U3>, IArray<U4>, IArray<U5>, IArray<T>] {
    const a1s: U1[] = new Array(this.length);
    let a1Count = 0;
    const a2s: U2[] = new Array(this.length);
    let a2Count = 0;
    const a3s: U3[] = new Array(this.length);
    let a3Count = 0;
    const a4s: U4[] = new Array(this.length);
    let a4Count = 0;
    const a5s: U5[] = new Array(this.length);
    let a5Count = 0;
    const rest: T[] = new Array(this.length);
    let restCount = 0;

    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      if (pf1.isDefinedAt(value)) {
        a1s[a1Count++] = pf1.apply(value);
      } else if (pf2.isDefinedAt(value)) {
        a2s[a2Count++] = pf2.apply(value);
      } else if (pf3.isDefinedAt(value)) {
        a3s[a3Count++] = pf3.apply(value);
      } else if (pf4.isDefinedAt(value)) {
        a4s[a4Count++] = pf4.apply(value);
      } else if (pf5.isDefinedAt(value)) {
        a5s[a5Count++] = pf5.apply(value);
      } else {
        rest[restCount++] = value;
      }
    }

    return [
      IArray.fromArrayAndSize(a1s, a1Count),
      IArray.fromArrayAndSize(a2s, a2Count),
      IArray.fromArrayAndSize(a3s, a3Count),
      IArray.fromArrayAndSize(a4s, a4Count),
      IArray.fromArrayAndSize(a5s, a5Count),
      IArray.fromArrayAndSize(rest, restCount)
    ];
  }

  firstDefined<U>(f: (value: T) => U | undefined): U | undefined {
    for (let i = 0; i < this.length; i++) {
      const result = f(this.apply(i));
      if (result !== undefined) {
        return result;
      }
    }
    return undefined;
  }

  get nonEmptyOpt(): IArray<T> | undefined {
    return this.isEmpty ? undefined : this;
  }

  distinctBy<U>(f: (value: T) => U): IArray<T> {
    if (this.isEmpty) {
      return this;
    }

    const seen = new Set<U>();
    const result = [...this.array];
    let outputIndex = 0;

    for (let i = 0; i < this.length; i++) {
      const value = this.apply(i);
      const key = f(value);
      if (!seen.has(key)) {
        seen.add(key);
        result[outputIndex++] = value;
      }
    }

    return IArray.fromArrayAndSize(result, outputIndex);
  }

  // Additional utility methods to match Scala implementation more closely
  iterator(): Iterator<T> {
    return this[Symbol.iterator]();
  }

  // Alias methods to match Scala naming
  size(): number {
    return this.length;
  }

  // Method to check if this array ends with given suffix
  endsWith(suffix: IArray<T>): boolean {
    if (suffix.length > this.length) return false;
    const offset = this.length - suffix.length;
    return this.startsWith(suffix, offset);
  }

}

// Static ordering implementation for IArray (equivalent to Scala's implicit ordering)
export function createIArrayOrdering<T>(elementOrdering: Ordering<T>): Ordering<IArray<T>> {
  return {
    compare(x: IArray<T>, y: IArray<T>): number {
      const xIter = x[Symbol.iterator]();
      const yIter = y[Symbol.iterator]();

      while (true) {
        const xNext = xIter.next();
        const yNext = yIter.next();

        if (xNext.done && yNext.done) {
          return 0; // Both exhausted, equal
        }
        if (xNext.done) {
          return -1; // x is shorter
        }
        if (yNext.done) {
          return 1; // y is shorter
        }

        const comparison = elementOrdering.compare(xNext.value, yNext.value);
        if (comparison !== 0) {
          return comparison;
        }
      }
    }
  };
}

// Encoder/Decoder equivalents for JSON serialization (equivalent to Circe encoders/decoders)
export interface Encoder<T> {
  encode(value: T): any;
}

export interface Decoder<T> {
  decode(value: any): T;
}

export function createIArrayEncoder<T>(elementEncoder: Encoder<T>): Encoder<IArray<T>> {
  return {
    encode(arr: IArray<T>): any[] {
      const result: any[] = new Array(arr.length);
      for (let i = 0; i < arr.length; i++) {
        result[i] = elementEncoder.encode(arr.apply(i));
      }
      return result;
    }
  };
}

export function createIArrayDecoder<T>(elementDecoder: Decoder<T>): Decoder<IArray<T>> {
  return {
    decode(value: any): IArray<T> {
      if (!Array.isArray(value)) {
        throw new Error("Expected array for IArray decoding");
      }
      const decoded: T[] = value.map(item => elementDecoder.decode(item));
      return IArray.fromArray(decoded);
    }
  };
}

// Utility functions for common operations

/**
 * Creates an IArray from a variable number of arguments
 */
export function iArrayOf<T>(...elements: T[]): IArray<T> {
  return IArray.apply(...elements);
}

/**
 * Creates an empty IArray
 */
export function emptyIArray<T>(): IArray<T> {
  return IArray.Empty;
}

/**
 * Creates an IArray with a single element
 */
export function singleIArray<T>(element: T): IArray<T> {
  return IArray.apply(element);
}

/**
 * Creates an IArray by repeating an element n times
 */
export function fillIArray<T>(n: number, element: T): IArray<T> {
  if (n <= 0) return IArray.Empty;
  const array: T[] = new Array(n);
  for (let i = 0; i < n; i++) {
    array[i] = element;
  }
  return IArray.fromArray(array);
}

/**
 * Creates an IArray from a range of numbers
 */
export function rangeIArray(start: number, end: number, step: number = 1): IArray<number> {
  if (step === 0) throw new Error("Step cannot be zero");
  if (step > 0 && start >= end) return IArray.Empty;
  if (step < 0 && start <= end) return IArray.Empty;

  const result: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  return IArray.fromArray(result);
}

/**
 * Concatenates multiple IArrays
 */
export function concatIArrays<T>(...arrays: IArray<T>[]): IArray<T> {
  if (arrays.length === 0) return IArray.Empty;
  if (arrays.length === 1) return arrays[0];

  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }

  const result: T[] = new Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) {
      result[offset + i] = arr.apply(i);
    }
    offset += arr.length;
  }

  return IArray.fromArray(result);
}

// Export everything for easy access
export { IArray as default };