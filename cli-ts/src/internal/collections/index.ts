/**
 * Collection utilities for maintaining compatibility with Scala collections
 */

/**
 * Sorted set implementation using JavaScript Set with ordering
 */
export class SortedSet<T> {
	private items: Set<T>;
	private compareFn: (a: T, b: T) => number;

	constructor(items: Iterable<T> = [], compareFn?: (a: T, b: T) => number) {
		this.compareFn =
			compareFn ||
			((a, b) => {
				if (a < b) return -1;
				if (a > b) return 1;
				return 0;
			});

		this.items = new Set(Array.from(items).sort(this.compareFn));
	}

	static from<T>(
		items: Iterable<T>,
		compareFn?: (a: T, b: T) => number,
	): SortedSet<T> {
		return new SortedSet(items, compareFn);
	}

	add(item: T): SortedSet<T> {
		const newItems = Array.from(this.items);
		newItems.push(item);
		return new SortedSet(newItems, this.compareFn);
	}

	has(item: T): boolean {
		return this.items.has(item);
	}

	get size(): number {
		return this.items.size;
	}

	isEmpty(): boolean {
		return this.items.size === 0;
	}

	nonEmpty(): boolean {
		return this.items.size > 0;
	}

	toArray(): T[] {
		return Array.from(this.items);
	}

	[Symbol.iterator](): Iterator<T> {
		return this.items[Symbol.iterator]();
	}
}

/**
 * Sorted map implementation using JavaScript Map with key ordering
 */
export class SortedMap<K, V> {
	private items: Map<K, V>;
	private compareFn: (a: K, b: K) => number;

	constructor(
		entries: Iterable<[K, V]> = [],
		compareFn?: (a: K, b: K) => number,
	) {
		this.compareFn =
			compareFn ||
			((a, b) => {
				if (a < b) return -1;
				if (a > b) return 1;
				return 0;
			});

		const sortedEntries = Array.from(entries).sort(([a], [b]) =>
			this.compareFn(a, b),
		);
		this.items = new Map(sortedEntries);
	}

	static from<K, V>(
		entries: Iterable<[K, V]>,
		compareFn?: (a: K, b: K) => number,
	): SortedMap<K, V> {
		return new SortedMap(entries, compareFn);
	}

	set(key: K, value: V): SortedMap<K, V> {
		const newEntries = Array.from(this.items.entries());
		newEntries.push([key, value]);
		return new SortedMap(newEntries, this.compareFn);
	}

	get(key: K): V | undefined {
		return this.items.get(key);
	}

	has(key: K): boolean {
		return this.items.has(key);
	}

	get size(): number {
		return this.items.size;
	}

	isEmpty(): boolean {
		return this.items.size === 0;
	}

	keys(): IterableIterator<K> {
		return this.items.keys();
	}

	values(): IterableIterator<V> {
		return this.items.values();
	}

	entries(): IterableIterator<[K, V]> {
		return this.items.entries();
	}

	forEach(callback: (value: V, key: K) => void): void {
		for (const [key, value] of this.items) {
			callback(value, key);
		}
	}

	[Symbol.iterator](): Iterator<[K, V]> {
		return this.items[Symbol.iterator]();
	}
}
