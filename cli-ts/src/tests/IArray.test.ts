import { describe, expect, test } from "vitest";
import {
	IArray,
	IArrayBuilder,
	partialFunction,
	StringOrdering,
} from "@/internal/IArray";

describe("IArray Tests", () => {
	test("Construction and Factory Methods", () => {
		// Test IArray.apply
		const arr1 = IArray.apply("a", "b", "c");
		expect(arr1.length).toBe(3);
		expect(arr1.apply(0)).toBe("a");
		expect(arr1.apply(1)).toBe("b");
		expect(arr1.apply(2)).toBe("c");

		// Test empty array
		const empty = IArray.apply<string>();
		expect(empty.isEmpty).toBe(true);
		expect(empty.length).toBe(0);

		// Test IArray.Empty
		expect(IArray.Empty.isEmpty).toBe(true);
		expect(IArray.Empty.length).toBe(0);

		// Test fromOption
		const fromSome = IArray.fromOption("test");
		expect(fromSome.length).toBe(1);
		expect(fromSome.apply(0)).toBe("test");

		const fromNone = IArray.fromOption(undefined);
		expect(fromNone.isEmpty).toBe(true);

		// Test fromOptions
		const fromOptions = IArray.fromOptions("a", undefined, "b", undefined, "c");
		expect(fromOptions.length).toBe(3);
		expect(fromOptions.apply(0)).toBe("a");
		expect(fromOptions.apply(1)).toBe("b");
		expect(fromOptions.apply(2)).toBe("c");

		// Test fromArray
		const fromArray = IArray.fromArray(["x", "y", "z"]);
		expect(fromArray.length).toBe(3);
		expect(fromArray.apply(0)).toBe("x");
		expect(fromArray.apply(1)).toBe("y");
		expect(fromArray.apply(2)).toBe("z");

		// Test fromTraversable (using fromIterable as equivalent)
		const fromList = IArray.fromIterable(["1", "2", "3"]);
		expect(fromList.length).toBe(3);
		expect(fromList.apply(0)).toBe("1");
		expect(fromList.apply(1)).toBe("2");
		expect(fromList.apply(2)).toBe("3");
	});

	test("Basic Properties and Access", () => {
		const arr = IArray.apply("a", "b", "c", "d");

		// Test length and size properties
		expect(arr.length).toBe(4);
		expect(arr.isEmpty).toBe(false);
		expect(arr.nonEmpty).toBe(true);

		// Test lengthCompare
		expect(arr.lengthCompare(3)).toBeGreaterThan(0);
		expect(arr.lengthCompare(4)).toBe(0);
		expect(arr.lengthCompare(5)).toBeLessThan(0);

		// Test apply and isDefinedAt
		expect(arr.apply(0)).toBe("a");
		expect(arr.apply(3)).toBe("d");
		expect(arr.isDefinedAt(0)).toBe(true);
		expect(arr.isDefinedAt(3)).toBe(true);
		expect(arr.isDefinedAt(4)).toBe(false);
		expect(arr.isDefinedAt(-1)).toBe(false);

		// Test applyOrElse
		expect(arr.applyOrElse(0, (_) => "default")).toBe("a");
		expect(arr.applyOrElse(10, (_) => "default")).toBe("default");

		// Test empty array properties
		const empty = IArray.Empty;
		expect(empty.isEmpty).toBe(true);
		expect(empty.nonEmpty).toBe(false);
		expect(empty.length).toBe(0);
	});

	test("Head, Tail, Init, Last Operations", () => {
		const arr = IArray.apply("first", "middle", "last");

		// Test head operations
		expect(arr.head).toBe("first");
		expect(arr.headOption).toBe("first");

		// Test tail operations
		const tail = arr.tail;
		expect(tail.length).toBe(2);
		expect(tail.apply(0)).toBe("middle");
		expect(tail.apply(1)).toBe("last");
		expect(arr.tailOpt).toBeDefined();

		// Test init operations
		const init = arr.init;
		expect(init.length).toBe(2);
		expect(init.apply(0)).toBe("first");
		expect(init.apply(1)).toBe("middle");
		expect(arr.initOption).toBeDefined();

		// Test last operations
		expect(arr.last).toBe("last");
		expect(arr.lastOption).toBe("last");

		// Test single element array
		const single = IArray.apply("only");
		expect(single.head).toBe("only");
		expect(single.last).toBe("only");
		expect(single.tail.isEmpty).toBe(true);
		expect(single.init.isEmpty).toBe(true);

		// Test empty array operations should throw
		const empty = IArray.Empty;
		expect(empty.headOption).toBeUndefined();
		expect(empty.lastOption).toBeUndefined();
		expect(empty.tailOpt).toBeUndefined();
		expect(empty.initOption).toBeUndefined();

		expect(() => empty.head).toThrow();
		expect(() => empty.tail).toThrow();
		expect(() => empty.init).toThrow();
		expect(() => empty.last).toThrow();
	});

	test("Functional Operations - Map, FlatMap, Filter", () => {
		const arr = IArray.apply("1", "2", "3", "4");

		// Test map
		const mapped = arr.map((s) => parseInt(s, 10));
		expect(mapped.length).toBe(4);
		expect(mapped.apply(0)).toBe(1);
		expect(mapped.apply(3)).toBe(4);

		// Test map on empty
		const emptyMapped = IArray.Empty.map((x: any) => x);
		expect(emptyMapped.isEmpty).toBe(true);

		// Test flatMap
		const flatMapped = arr.flatMap((s) => IArray.apply(s, `${s}x`));
		expect(flatMapped.length).toBe(8);
		expect(flatMapped.apply(0)).toBe("1");
		expect(flatMapped.apply(1)).toBe("1x");
		expect(flatMapped.apply(2)).toBe("2");
		expect(flatMapped.apply(3)).toBe("2x");

		// Test filter
		const filtered = arr.filter((s) => parseInt(s, 10) % 2 === 0);
		expect(filtered.length).toBe(2);
		expect(filtered.apply(0)).toBe("2");
		expect(filtered.apply(1)).toBe("4");

		// Test filterNot
		const filteredNot = arr.filterNot((s) => parseInt(s, 10) % 2 === 0);
		expect(filteredNot.length).toBe(2);
		expect(filteredNot.apply(0)).toBe("1");
		expect(filteredNot.apply(1)).toBe("3");

		// Test filter on empty
		const emptyFiltered = IArray.Empty.filter(() => true);
		expect(emptyFiltered.isEmpty).toBe(true);
	});

	test("Collect and Partial Functions", () => {
		const arr = IArray.apply("1", "2", "abc", "3", "def", "4");

		// Test collect
		const collected = arr.collect(
			partialFunction(
				(s) => /^\d+$/.test(s),
				(s) => parseInt(s, 10),
			),
		);
		expect(collected.length).toBe(4);
		expect(collected.apply(0)).toBe(1);
		expect(collected.apply(1)).toBe(2);
		expect(collected.apply(2)).toBe(3);
		expect(collected.apply(3)).toBe(4);

		// Test collectFirst
		const firstDigit = arr.collectFirst(
			partialFunction(
				(s) => /^\d+$/.test(s),
				(s) => parseInt(s, 10),
			),
		);
		expect(firstDigit).toBe(1);

		const noMatch = arr.collectFirst(
			partialFunction(
				(s) => s.startsWith("z"),
				(s) => s,
			),
		);
		expect(noMatch).toBeUndefined();

		// Test collect on empty
		const emptyCollected = IArray.Empty.collect(
			partialFunction(
				(_x: any) => true,
				(x: any) => x,
			),
		);
		expect(emptyCollected.isEmpty).toBe(true);
	});

	test("Fold, Reduce, and Aggregation Operations", () => {
		const numbers = IArray.apply("1", "2", "3", "4");

		// Test foldLeft
		const sum = numbers.foldLeft(0, (acc, s) => acc + parseInt(s, 10));
		expect(sum).toBe(10);

		const concat = numbers.foldLeft("", (acc, s) => acc + s);
		expect(concat).toBe("1234");

		// Test reduce
		const reduced = numbers.reduce((acc, s) => acc + s);
		expect(reduced).toBe("1234");

		// Test reduceOption
		const reducedOpt = numbers.reduceOption((acc, s) => acc + s);
		expect(reducedOpt).toBe("1234");

		const emptyReduced = IArray.Empty.reduceOption(
			(acc: string, s: string) => acc + s,
		);
		expect(emptyReduced).toBeUndefined();

		// Test reduce on empty should throw
		expect(() =>
			IArray.Empty.reduce((acc: string, s: string) => acc + s),
		).toThrow();

		// Test count
		const evenCount = numbers.count((s) => parseInt(s, 10) % 2 === 0);
		expect(evenCount).toBe(2);

		// Test sum with numeric
		const intArr = IArray.apply(1, 2, 3, 4);
		const manualSum = intArr.foldLeft(0, (acc, n) => acc + n);
		expect(manualSum).toBe(10);
	});

	test("Search and Find Operations", () => {
		const arr = IArray.apply("apple", "banana", "cherry", "date", "elderberry");

		// Test find
		const found = arr.find((s) => s.startsWith("c"));
		expect(found).toBe("cherry");

		const notFound = arr.find((s) => s.startsWith("z"));
		expect(notFound).toBeUndefined();

		// Test exists
		expect(arr.exists((s) => s.includes("err"))).toBe(true);
		expect(arr.exists((s) => s.startsWith("z"))).toBe(false);

		// Test forall
		expect(arr.forall((s) => s.length > 3)).toBe(true);
		expect(arr.forall((s) => s.startsWith("a"))).toBe(false);

		// Test indexOf
		expect(arr.indexOf("cherry")).toBe(2);
		expect(arr.indexOf("missing")).toBe(-1);
		expect(arr.indexOf("banana", 2)).toBe(-1);
		expect(arr.indexOf("banana", 1)).toBe(1);

		// Test indexWhere
		expect(arr.indexWhere((s) => s.startsWith("d"))).toBe(3);
		expect(arr.indexWhere((s) => s.startsWith("z"))).toBe(-1);
		expect(arr.indexWhere((s) => s.length > 5, 2)).toBe(2);
	});

	test("Sequence Operations - Take, Drop, Slice", () => {
		const arr = IArray.apply("a", "b", "c", "d", "e", "f");

		// Test take
		const taken = arr.take(3);
		expect(taken.length).toBe(3);
		expect(taken.apply(0)).toBe("a");
		expect(taken.apply(2)).toBe("c");

		const takeMore = arr.take(10);
		expect(takeMore.length).toBe(6);
		expect(takeMore).toEqual(arr);

		const takeZero = arr.take(0);
		expect(takeZero.isEmpty).toBe(true);

		// Test takeRight
		const takenRight = arr.takeRight(3);
		expect(takenRight.length).toBe(3);
		expect(takenRight.apply(0)).toBe("d");
		expect(takenRight.apply(2)).toBe("f");

		// Test takeWhile
		const takenWhile = arr.takeWhile((s) => s < "d");
		expect(takenWhile.length).toBe(3);
		expect(takenWhile.apply(0)).toBe("a");
		expect(takenWhile.apply(2)).toBe("c");

		// Test drop
		const dropped = arr.drop(2);
		expect(dropped.length).toBe(4);
		expect(dropped.apply(0)).toBe("c");
		expect(dropped.apply(3)).toBe("f");

		const dropMore = arr.drop(10);
		expect(dropMore.isEmpty).toBe(true);

		// Test dropRight
		const droppedRight = arr.dropRight(2);
		expect(droppedRight.length).toBe(4);
		expect(droppedRight.apply(0)).toBe("a");
		expect(droppedRight.apply(3)).toBe("d");

		// Test dropWhile
		const droppedWhile = arr.dropWhile((s) => s < "d");
		expect(droppedWhile.length).toBe(3);
		expect(droppedWhile.apply(0)).toBe("d");
		expect(droppedWhile.apply(2)).toBe("f");

		// Test negative take/drop requirements
		expect(() => arr.take(-1)).toThrow();
		expect(() => arr.takeRight(-1)).toThrow();
	});

	test("Concatenation and Element Addition", () => {
		const arr1 = IArray.apply("a", "b");
		const arr2 = IArray.apply("c", "d");

		// Test ++
		const concatenated = arr1.concat(arr2);
		expect(concatenated.length).toBe(4);
		expect(concatenated.apply(0)).toBe("a");
		expect(concatenated.apply(3)).toBe("d");

		// Test ++ with empty
		const withEmpty1 = arr1.concat(IArray.Empty);
		expect(withEmpty1).toEqual(arr1);

		const withEmpty2 = IArray.Empty.concat(arr1);
		expect(withEmpty2).toEqual(arr1);

		// Test prepend (+:)
		const prepended = arr1.prepend("x");
		expect(prepended.length).toBe(3);
		expect(prepended.apply(0)).toBe("x");
		expect(prepended.apply(1)).toBe("a");
		expect(prepended.apply(2)).toBe("b");

		// Test append (:+)
		const appended = arr1.append("z");
		expect(appended.length).toBe(3);
		expect(appended.apply(0)).toBe("a");
		expect(appended.apply(1)).toBe("b");
		expect(appended.apply(2)).toBe("z");
	});

	test("Zip and Partition Operations", () => {
		const arr1 = IArray.apply("a", "b", "c", "d");
		const arr2 = IArray.apply(1, 2, 3);

		// Test zip
		const zipped = arr1.zip(arr2);
		expect(zipped.length).toBe(3);
		expect(zipped.apply(0)).toEqual(["a", 1]);
		expect(zipped.apply(1)).toEqual(["b", 2]);
		expect(zipped.apply(2)).toEqual(["c", 3]);

		// Test zipWithIndex
		const withIndex = arr1.zipWithIndex();
		expect(withIndex.length).toBe(4);
		expect(withIndex.apply(0)).toEqual(["a", 0]);
		expect(withIndex.apply(3)).toEqual(["d", 3]);

		// Test partition
		const numbers = IArray.apply("1", "2", "3", "4", "5");
		const [evens, odds] = numbers.partition((s) => parseInt(s, 10) % 2 === 0);
		expect(evens.length).toBe(2);
		expect(evens.apply(0)).toBe("2");
		expect(evens.apply(1)).toBe("4");
		expect(odds.length).toBe(3);
		expect(odds.apply(0)).toBe("1");
		expect(odds.apply(1)).toBe("3");
		expect(odds.apply(2)).toBe("5");

		// Test zip with empty
		const emptyZip = arr1.zip(IArray.Empty);
		expect(emptyZip.isEmpty).toBe(true);
	});

	test("Sorting and Min/Max Operations", () => {
		const unsorted = IArray.apply("zebra", "apple", "banana", "cherry");

		// Test sorted
		const sorted = unsorted.sorted();
		expect(sorted.length).toBe(4);
		expect(sorted.apply(0)).toBe("apple");
		expect(sorted.apply(1)).toBe("banana");
		expect(sorted.apply(2)).toBe("cherry");
		expect(sorted.apply(3)).toBe("zebra");

		// Test sortBy
		const sortedByLength = unsorted.sortBy((s) => s.length);
		expect(sortedByLength.apply(0)).toBe("zebra");
		expect(sortedByLength.apply(1)).toBe("apple");
		expect(sortedByLength.apply(2)).toBe("banana");
		expect(sortedByLength.apply(3)).toBe("cherry");

		// Test min/max
		expect(unsorted.min(StringOrdering)).toBe("apple");
		expect(unsorted.max(StringOrdering)).toBe("zebra");

		// Test maxBy
		const numOrdering = { compare: (x: number, y: number) => x - y };
		const maxByLength = unsorted.maxBy((s) => s.length, numOrdering);
		expect(maxByLength === "banana" || maxByLength === "cherry").toBe(true);

		// Test min/max on empty should throw
		const emptyStrings = IArray.Empty as IArray<string>;
		expect(() => emptyStrings.min(StringOrdering)).toThrow();
		expect(() => emptyStrings.max(StringOrdering)).toThrow();
		expect(() => emptyStrings.maxBy((x) => x, StringOrdering)).toThrow();

		// Test sorted on small arrays
		const single = IArray.apply("only");
		expect(single.sorted()).toEqual(single);

		const emptyForSort = IArray.Empty as IArray<string>;
		expect(emptyForSort.sorted()).toEqual(emptyForSort);
	});

	test("Reverse and Distinct Operations", () => {
		const arr = IArray.apply("a", "b", "c", "d");

		// Test reverse
		const reversed = arr.reverse();
		expect(reversed.length).toBe(4);
		expect(reversed.apply(0)).toBe("d");
		expect(reversed.apply(1)).toBe("c");
		expect(reversed.apply(2)).toBe("b");
		expect(reversed.apply(3)).toBe("a");

		// Test reverse on empty
		const emptyReversed = IArray.Empty.reverse();
		expect(emptyReversed.isEmpty).toBe(true);

		// Test distinct
		const withDuplicates = IArray.apply("a", "b", "a", "c", "b", "d", "a");
		const distinct = withDuplicates.distinct();
		expect(distinct.length).toBe(4);
		expect(distinct.contains("a")).toBe(true);
		expect(distinct.contains("b")).toBe(true);
		expect(distinct.contains("c")).toBe(true);
		expect(distinct.contains("d")).toBe(true);

		// Test distinct on array without duplicates
		const noDuplicates = IArray.apply("a", "b", "c");
		const distinctNoDup = noDuplicates.distinct();
		expect(distinctNoDup).toEqual(noDuplicates);

		// Test distinct on small arrays
		const singleDistinct = IArray.apply("only").distinct();
		expect(singleDistinct.length).toBe(1);
		expect(singleDistinct.apply(0)).toBe("only");

		const emptyDistinct = IArray.Empty.distinct();
		expect(emptyDistinct.isEmpty).toBe(true);
	});

	test("Conversion Operations", () => {
		const arr = IArray.apply("a", "b", "c");

		// Test toList (toArray in TS)
		const list = arr.toArray();
		expect(list).toEqual(["a", "b", "c"]);

		// Test toVector (toArray as closest equivalent)
		const vector = arr.toArray();
		expect(vector).toEqual(["a", "b", "c"]);

		// Test toSet
		const set = arr.toSet();
		expect(set).toEqual(new Set(["a", "b", "c"]));

		// Test toSortedSet (no native equivalent, but test that it's sorted)
		const sortedArray = arr.sorted().toArray();
		expect(sortedArray).toEqual(["a", "b", "c"]);

		// Test toMap with tuples
		const tuples = IArray.apply<[string, string]>(
			["key1", "value1"],
			["key2", "value2"],
		);
		const map = tuples.toMap();
		expect(map.size).toBe(2);
		expect(map.get("key1")).toBe("value1");
		expect(map.get("key2")).toBe("value2");

		// Test groupBy
		const words = IArray.apply(
			"apple",
			"banana",
			"apricot",
			"blueberry",
			"cherry",
		);
		const grouped = words.groupBy((s) => s.charAt(0));
		expect(grouped.get("a")?.length).toBe(2);
		expect(grouped.get("a")?.contains("apple")).toBe(true);
		expect(grouped.get("a")?.contains("apricot")).toBe(true);
		expect(grouped.get("b")?.length).toBe(2);
		expect(grouped.get("c")?.length).toBe(1);
	});

	test("Builder Operations", () => {
		// Test basic builder
		const builder = IArrayBuilder.empty<string>();
		expect(builder.isEmpty).toBe(true);

		builder.addOne("a");
		builder.addOne("b");
		builder.addOne("c");

		const result = builder.result();
		expect(result.length).toBe(3);
		expect(result.apply(0)).toBe("a");
		expect(result.apply(1)).toBe("b");
		expect(result.apply(2)).toBe("c");

		// Test builder with initial capacity
		const builder2 = IArrayBuilder.empty<string>(100);
		builder2.addOne("test");
		const result2 = builder2.result();
		expect(result2.length).toBe(1);
		expect(result2.apply(0)).toBe("test");

		// Test builder from existing IArray
		const existing = IArray.apply("x", "y");
		const builder3 = IArrayBuilder.fromIArray(existing, 50);
		builder3.addOne("z");
		const result3 = builder3.result();
		expect(result3.length).toBe(3);
		expect(result3.apply(0)).toBe("x");
		expect(result3.apply(1)).toBe("y");
		expect(result3.apply(2)).toBe("z");

		// Test ++= operation
		const builder4 = IArrayBuilder.empty<string>();
		const toAdd = IArray.apply("1", "2", "3");
		builder4.appendAll(toAdd);
		const result4 = builder4.result();
		expect(result4.length).toBe(3);
		expect(result4).toEqual(toAdd);

		// Test clear
		builder4.clear();
		expect(builder4.isEmpty).toBe(true);
		const emptyResult = builder4.result();
		expect(emptyResult.isEmpty).toBe(true);

		// Test forall on builder
		const builder5 = IArrayBuilder.empty<string>();
		builder5.addOne("abc");
		builder5.addOne("def");
		expect(builder5.forall((s) => s.length === 3)).toBe(true);
		expect(builder5.forall((s) => s.startsWith("a"))).toBe(false);
	});
});
