import { expect, test, describe } from "bun:test";
import { IArray, IArrayBuilder, partialFunction } from "../src/internal/IArray";

describe("IArray Tests", () => {
  describe("Construction and Factory Methods", () => {
    test("IArray.apply", () => {
      const arr1 = IArray.apply("a", "b", "c");
      expect(arr1.length).toBe(3);
      expect(arr1.apply(0)).toBe("a");
      expect(arr1.apply(1)).toBe("b");
      expect(arr1.apply(2)).toBe("c");
    });

    test("empty array", () => {
      const empty = IArray.apply<string>();
      expect(empty.isEmpty).toBe(true);
      expect(empty.length).toBe(0);
    });

    test("IArray.Empty", () => {
      expect(IArray.Empty.isEmpty).toBe(true);
      expect(IArray.Empty.length).toBe(0);
    });

    test("fromOption", () => {
      const fromSome = IArray.fromOption("test");
      expect(fromSome.length).toBe(1);
      expect(fromSome.apply(0)).toBe("test");

      const fromNone = IArray.fromOption(undefined);
      expect(fromNone.isEmpty).toBe(true);
    });

    test("fromOptions", () => {
      const fromOptions = IArray.fromOptions("a", undefined, "b", undefined, "c");
      expect(fromOptions.length).toBe(3);
      expect(fromOptions.apply(0)).toBe("a");
      expect(fromOptions.apply(1)).toBe("b");
      expect(fromOptions.apply(2)).toBe("c");
    });

    test("fromArray", () => {
      const fromArray = IArray.fromArray(["x", "y", "z"]);
      expect(fromArray.length).toBe(3);
      expect(fromArray.apply(0)).toBe("x");
      expect(fromArray.apply(1)).toBe("y");
      expect(fromArray.apply(2)).toBe("z");
    });

    test("fromIterable", () => {
      const fromList = IArray.fromIterable(["1", "2", "3"]);
      expect(fromList.length).toBe(3);
      expect(fromList.apply(0)).toBe("1");
      expect(fromList.apply(1)).toBe("2");
      expect(fromList.apply(2)).toBe("3");
    });
  });

  describe("Basic Properties and Access", () => {
    test("length and size properties", () => {
      const arr = IArray.apply("a", "b", "c", "d");

      expect(arr.length).toBe(4);
      expect(arr.isEmpty).toBe(false);
      expect(arr.nonEmpty).toBe(true);
    });

    test("lengthCompare", () => {
      const arr = IArray.apply("a", "b", "c", "d");

      expect(arr.lengthCompare(3)).toBeGreaterThan(0);
      expect(arr.lengthCompare(4)).toBe(0);
      expect(arr.lengthCompare(5)).toBeLessThan(0);
    });

    test("apply and isDefinedAt", () => {
      const arr = IArray.apply("a", "b", "c", "d");

      expect(arr.apply(0)).toBe("a");
      expect(arr.apply(3)).toBe("d");
      expect(arr.isDefinedAt(0)).toBe(true);
      expect(arr.isDefinedAt(3)).toBe(true);
      expect(arr.isDefinedAt(4)).toBe(false);
      expect(arr.isDefinedAt(-1)).toBe(false);
    });

    test("applyOrElse", () => {
      const arr = IArray.apply("a", "b", "c", "d");

      expect(arr.applyOrElse(0, _ => "default")).toBe("a");
      expect(arr.applyOrElse(10, _ => "default")).toBe("default");
    });

    test("empty array properties", () => {
      const empty = IArray.Empty;
      expect(empty.isEmpty).toBe(true);
      expect(empty.nonEmpty).toBe(false);
      expect(empty.length).toBe(0);
    });
  });

  describe("Head, Tail, Init, Last Operations", () => {
    test("head operations", () => {
      const arr = IArray.apply("first", "middle", "last");

      expect(arr.head).toBe("first");
      expect(arr.headOption).toBe("first");
    });

    test("tail operations", () => {
      const arr = IArray.apply("first", "middle", "last");

      const tail = arr.tail;
      expect(tail.length).toBe(2);
      expect(tail.apply(0)).toBe("middle");
      expect(tail.apply(1)).toBe("last");
      expect(arr.tailOption).toBeDefined();
    });

    test("init operations", () => {
      const arr = IArray.apply("first", "middle", "last");

      const init = arr.init;
      expect(init.length).toBe(2);
      expect(init.apply(0)).toBe("first");
      expect(init.apply(1)).toBe("middle");
      expect(arr.initOption).toEqual(init);
    });

    test("last operations", () => {
      const arr = IArray.apply("first", "middle", "last");

      expect(arr.last).toBe("last");
      expect(arr.lastOption).toBe("last");
    });

    test("single element array", () => {
      const single = IArray.apply("only");
      expect(single.head).toBe("only");
      expect(single.last).toBe("only");
      expect(single.tail.isEmpty).toBe(true);
      expect(single.init.isEmpty).toBe(true);
    });

    test("empty array operations should throw or return undefined", () => {
      const empty = IArray.Empty;
      expect(empty.headOption).toBeUndefined();
      expect(empty.lastOption).toBeUndefined();
      expect(empty.tailOption).toBeUndefined();
      expect(empty.initOption).toBeUndefined();

      expect(() => empty.head).toThrow();
      expect(() => empty.tail).toThrow();
      expect(() => empty.init).toThrow();
      expect(() => empty.last).toThrow();
    });
  });

  describe("Functional Operations - Map, FlatMap, Filter", () => {
    test("map", () => {
      const arr = IArray.apply("1", "2", "3", "4");

      const mapped = arr.map(s => parseInt(s));
      expect(mapped.length).toBe(4);
      expect(mapped.apply(0)).toBe(1);
      expect(mapped.apply(3)).toBe(4);
    });

    test("map on empty", () => {
      const emptyMapped = IArray.Empty.map((x: any) => x);
      expect(emptyMapped.isEmpty).toBe(true);
    });

    test("flatMap", () => {
      const arr = IArray.apply("1", "2", "3", "4");

      const flatMapped = arr.flatMap(s => IArray.apply(s, s + "x"));
      expect(flatMapped.length).toBe(8);
      expect(flatMapped.apply(0)).toBe("1");
      expect(flatMapped.apply(1)).toBe("1x");
      expect(flatMapped.apply(2)).toBe("2");
      expect(flatMapped.apply(3)).toBe("2x");
    });

    test("filter", () => {
      const arr = IArray.apply("1", "2", "3", "4");

      const filtered = arr.filter(s => parseInt(s) % 2 === 0);
      expect(filtered.length).toBe(2);
      expect(filtered.apply(0)).toBe("2");
      expect(filtered.apply(1)).toBe("4");
    });

    test("filterNot", () => {
      const arr = IArray.apply("1", "2", "3", "4");

      const filterNot = arr.filterNot(s => parseInt(s) % 2 === 0);
      expect(filterNot.length).toBe(2);
      expect(filterNot.apply(0)).toBe("1");
      expect(filterNot.apply(1)).toBe("3");
    });

    test("filter on empty", () => {
      const emptyFiltered = IArray.Empty.filter(() => true);
      expect(emptyFiltered.isEmpty).toBe(true);
    });
  });

  describe("Collect and Partial Functions", () => {
    test("collect", () => {
      const arr = IArray.apply("1", "2", "abc", "3", "def", "4");

      const isDigitString = (s: string) => /^\d+$/.test(s);
      const pf = partialFunction(isDigitString, (s: string) => parseInt(s));
      const collected = arr.collect(pf);

      expect(collected.length).toBe(4);
      expect(collected.apply(0)).toBe(1);
      expect(collected.apply(1)).toBe(2);
      expect(collected.apply(2)).toBe(3);
      expect(collected.apply(3)).toBe(4);
    });

    test("collectFirst", () => {
      const arr = IArray.apply("1", "2", "abc", "3", "def", "4");

      const isDigitString = (s: string) => /^\d+$/.test(s);
      const pf = partialFunction(isDigitString, (s: string) => parseInt(s));
      const firstDigit = arr.collectFirst(pf);
      expect(firstDigit).toBe(1);

      const startsWithZ = (s: string) => s.startsWith("z");
      const pfZ = partialFunction(startsWithZ, (s: string) => s);
      const noMatch = arr.collectFirst(pfZ);
      expect(noMatch).toBeUndefined();
    });

    test("collect on empty", () => {
      const pf = partialFunction(() => true, (x: any) => x);
      const emptyCollected = IArray.Empty.collect(pf);
      expect(emptyCollected.isEmpty).toBe(true);
    });
  });

  describe("Fold, Reduce, and Aggregation Operations", () => {
    test("foldLeft", () => {
      const numbers = IArray.apply("1", "2", "3", "4");

      const sum = numbers.foldLeft(0, (acc, s) => acc + parseInt(s));
      expect(sum).toBe(10);

      const concat = numbers.foldLeft("", (acc, s) => acc + s);
      expect(concat).toBe("1234");
    });

    test("reduce", () => {
      const numbers = IArray.apply("1", "2", "3", "4");

      const reduced = numbers.reduce((a, b) => a + b);
      expect(reduced).toBe("1234");
    });

    test("reduceOption", () => {
      const numbers = IArray.apply("1", "2", "3", "4");

      const reducedOpt = numbers.reduceOption((a, b) => a + b);
      expect(reducedOpt).toBe("1234");

      const emptyReduced = IArray.Empty.reduceOption((a: string, b: string) => a + b);
      expect(emptyReduced).toBeUndefined();
    });

    test("reduce on empty should throw", () => {
      expect(() => IArray.Empty.reduce((a: string, b: string) => a + b)).toThrow();
    });

    test("count", () => {
      const numbers = IArray.apply("1", "2", "3", "4");

      const evenCount = numbers.count(s => parseInt(s) % 2 === 0);
      expect(evenCount).toBe(2);
    });

    test("sum with numeric", () => {
      const intArr = IArray.apply(1, 2, 3, 4);
      const manualSum = intArr.foldLeft(0, (acc, n) => acc + n);
      expect(manualSum).toBe(10);
    });
  });

  describe("Search and Find Operations", () => {
    test("find", () => {
      const arr = IArray.apply("apple", "banana", "cherry", "date", "elderberry");

      const found = arr.find(s => s.startsWith("c"));
      expect(found).toBe("cherry");

      const notFound = arr.find(s => s.startsWith("z"));
      expect(notFound).toBeUndefined();
    });

    test("exists", () => {
      const arr = IArray.apply("apple", "banana", "cherry", "date", "elderberry");

      expect(arr.exists(s => s.includes("err"))).toBe(true);
      expect(arr.exists(s => s.startsWith("z"))).toBe(false);
    });

    test("forall", () => {
      const arr = IArray.apply("apple", "banana", "cherry", "date", "elderberry");

      expect(arr.forall(s => s.length > 3)).toBe(true);
      expect(arr.forall(s => s.startsWith("a"))).toBe(false);
    });

    test("indexOf", () => {
      const arr = IArray.apply("apple", "banana", "cherry", "date", "elderberry");

      expect(arr.indexOf("cherry")).toBe(2);
      expect(arr.indexOf("missing")).toBe(-1);
      expect(arr.indexOf("banana", 2)).toBe(-1);
      expect(arr.indexOf("banana", 1)).toBe(1);
    });
  });

  describe("Sequence Operations - Take, Drop, Slice", () => {
    test("take", () => {
      const arr = IArray.apply("a", "b", "c", "d", "e", "f");

      const taken = arr.take(3);
      expect(taken.length).toBe(3);
      expect(taken.apply(0)).toBe("a");
      expect(taken.apply(2)).toBe("c");

      const takeMore = arr.take(10);
      expect(takeMore.length).toBe(6);
      expect(takeMore).toEqual(arr);

      const takeZero = arr.take(0);
      expect(takeZero.isEmpty).toBe(true);
    });

    test("takeRight", () => {
      const arr = IArray.apply("a", "b", "c", "d", "e", "f");

      const takenRight = arr.takeRight(3);
      expect(takenRight.length).toBe(3);
      expect(takenRight.apply(0)).toBe("d");
      expect(takenRight.apply(2)).toBe("f");
    });

    test("takeWhile", () => {
      const arr = IArray.apply("a", "b", "c", "d", "e", "f");

      const takenWhile = arr.takeWhile(s => s < "d");
      expect(takenWhile.length).toBe(3);
      expect(takenWhile.apply(0)).toBe("a");
      expect(takenWhile.apply(2)).toBe("c");
    });

    test("drop", () => {
      const arr = IArray.apply("a", "b", "c", "d", "e", "f");

      const dropped = arr.drop(2);
      expect(dropped.length).toBe(4);
      expect(dropped.apply(0)).toBe("c");
      expect(dropped.apply(3)).toBe("f");

      const dropMore = arr.drop(10);
      expect(dropMore.isEmpty).toBe(true);

      const dropZero = arr.drop(0);
      expect(dropZero).toEqual(arr);
    });

    test("dropRight", () => {
      const arr = IArray.apply("a", "b", "c", "d", "e", "f");

      const droppedRight = arr.dropRight(2);
      expect(droppedRight.length).toBe(4);
      expect(droppedRight.apply(0)).toBe("a");
      expect(droppedRight.apply(3)).toBe("d");
    });

    test("dropWhile", () => {
      const arr = IArray.apply("a", "b", "c", "d", "e", "f");

      const droppedWhile = arr.dropWhile(s => s < "d");
      expect(droppedWhile.length).toBe(3);
      expect(droppedWhile.apply(0)).toBe("d");
      expect(droppedWhile.apply(2)).toBe("f");
    });

    test("slice (using drop and take)", () => {
      const arr = IArray.apply("a", "b", "c", "d", "e", "f");

      // Simulate slice(1, 4) using drop(1).take(3)
      const sliced = arr.drop(1).take(3);
      expect(sliced.length).toBe(3);
      expect(sliced.apply(0)).toBe("b");
      expect(sliced.apply(2)).toBe("d");

      // Simulate slice(3) using drop(3)
      const sliceToEnd = arr.drop(3);
      expect(sliceToEnd.length).toBe(3);
      expect(sliceToEnd.apply(0)).toBe("d");
    });
  });

  describe("Concatenation and Element Addition", () => {
    test("++", () => {
      const arr1 = IArray.apply("a", "b");
      const arr2 = IArray.apply("c", "d");

      const concatenated = arr1.concat(arr2);
      expect(concatenated.length).toBe(4);
      expect(concatenated.apply(0)).toBe("a");
      expect(concatenated.apply(3)).toBe("d");
    });

    test("++ with empty", () => {
      const arr1 = IArray.apply("a", "b");

      const withEmpty1 = arr1.concat(IArray.Empty);
      expect(withEmpty1).toEqual(arr1);

      const withEmpty2 = IArray.Empty.concat(arr1);
      expect(withEmpty2).toEqual(arr1);
    });

    test("prepend", () => {
      const arr1 = IArray.apply("a", "b");

      const prepended = arr1.prepend("x");
      expect(prepended.length).toBe(3);
      expect(prepended.apply(0)).toBe("x");
      expect(prepended.apply(1)).toBe("a");
      expect(prepended.apply(2)).toBe("b");
    });

    test("append", () => {
      const arr1 = IArray.apply("a", "b");

      const appended = arr1.append("z");
      expect(appended.length).toBe(3);
      expect(appended.apply(0)).toBe("a");
      expect(appended.apply(1)).toBe("b");
      expect(appended.apply(2)).toBe("z");
    });
  });

  describe("Zip and Partition Operations", () => {
    test("zip", () => {
      const arr1 = IArray.apply("a", "b", "c", "d");
      const arr2 = IArray.apply(1, 2, 3);

      const zipped = arr1.zip(arr2);
      expect(zipped.length).toBe(3); // min of both lengths
      expect(zipped.apply(0)).toEqual(["a", 1]);
      expect(zipped.apply(1)).toEqual(["b", 2]);
      expect(zipped.apply(2)).toEqual(["c", 3]);
    });

    test("zipWithIndex", () => {
      const arr1 = IArray.apply("a", "b", "c", "d");

      const withIndex = arr1.zipWithIndex();
      expect(withIndex.length).toBe(4);
      expect(withIndex.apply(0)).toEqual(["a", 0]);
      expect(withIndex.apply(3)).toEqual(["d", 3]);
    });

    test("partition", () => {
      const numbers = IArray.apply("1", "2", "3", "4", "5");

      const [evens, odds] = numbers.partition(s => parseInt(s) % 2 === 0);
      expect(evens.length).toBe(2);
      expect(evens.apply(0)).toBe("2");
      expect(evens.apply(1)).toBe("4");
      expect(odds.length).toBe(3);
      expect(odds.apply(0)).toBe("1");
      expect(odds.apply(1)).toBe("3");
      expect(odds.apply(2)).toBe("5");
    });

    test("zip with empty", () => {
      const arr1 = IArray.apply("a", "b", "c", "d");

      const emptyZip = arr1.zip(IArray.Empty);
      expect(emptyZip.isEmpty).toBe(true);
    });
  });

  describe("Sorting and Min/Max Operations", () => {
    test("sorted", () => {
      const unsorted = IArray.apply("zebra", "apple", "banana", "cherry");

      const sorted = unsorted.sorted();
      expect(sorted.length).toBe(4);
      expect(sorted.apply(0)).toBe("apple");
      expect(sorted.apply(1)).toBe("banana");
      expect(sorted.apply(2)).toBe("cherry");
      expect(sorted.apply(3)).toBe("zebra");
    });

    test("sortBy", () => {
      const unsorted = IArray.apply("zebra", "apple", "banana", "cherry");

      const sortedByLength = unsorted.sortBy(s => s.length, { compare: (a, b) => a - b });
      expect(sortedByLength.apply(0)).toBe("zebra"); // length 5
      expect(sortedByLength.apply(1)).toBe("apple"); // length 5
      expect(sortedByLength.apply(2)).toBe("banana"); // length 6
      expect(sortedByLength.apply(3)).toBe("cherry"); // length 6
    });

    test("min/max", () => {
      const unsorted = IArray.apply("zebra", "apple", "banana", "cherry");

      expect(unsorted.min({ compare: (a, b) => a.localeCompare(b) })).toBe("apple");
      expect(unsorted.max({ compare: (a, b) => a.localeCompare(b) })).toBe("zebra");
    });

    test("maxBy", () => {
      const unsorted = IArray.apply("zebra", "apple", "banana", "cherry");

      const maxByLength = unsorted.maxBy(s => s.length, { compare: (a, b) => a - b });
      // Both banana and cherry have length 6, so either is valid
      expect(maxByLength === "banana" || maxByLength === "cherry").toBe(true);
    });

    test("min/max on empty should throw", () => {
      const emptyStrings = IArray.Empty as IArray<string>;
      const stringOrdering = { compare: (a: string, b: string) => a.localeCompare(b) };
      expect(() => emptyStrings.min(stringOrdering)).toThrow();
      expect(() => emptyStrings.max(stringOrdering)).toThrow();
      expect(() => emptyStrings.maxBy(x => x, stringOrdering)).toThrow();
    });

    test("sorted on small arrays", () => {
      const single = IArray.apply("only");
      expect(single.sorted()).toEqual(single);

      const emptyForSort = IArray.Empty as IArray<string>;
      expect(emptyForSort.sorted()).toEqual(emptyForSort);
    });
  });

  describe("Reverse and Distinct Operations", () => {
    test("reverse", () => {
      const arr = IArray.apply("a", "b", "c", "d");

      const reversed = arr.reverse();
      expect(reversed.length).toBe(4);
      expect(reversed.apply(0)).toBe("d");
      expect(reversed.apply(1)).toBe("c");
      expect(reversed.apply(2)).toBe("b");
      expect(reversed.apply(3)).toBe("a");
    });

    test("reverse on empty", () => {
      const emptyReversed = IArray.Empty.reverse();
      expect(emptyReversed.isEmpty).toBe(true);
    });

    test("distinct", () => {
      const withDuplicates = IArray.apply("a", "b", "a", "c", "b", "d", "a");

      const distinct = withDuplicates.distinct();
      expect(distinct.length).toBe(4);
      expect(distinct.contains("a")).toBe(true);
      expect(distinct.contains("b")).toBe(true);
      expect(distinct.contains("c")).toBe(true);
      expect(distinct.contains("d")).toBe(true);
    });

    test("distinct on array without duplicates", () => {
      const noDuplicates = IArray.apply("a", "b", "c");

      const distinctNoDup = noDuplicates.distinct();
      expect(distinctNoDup).toEqual(noDuplicates);
    });

    test("distinct on small arrays", () => {
      const singleDistinct = IArray.apply("only").distinct();
      expect(singleDistinct.length).toBe(1);
      expect(singleDistinct.apply(0)).toBe("only");

      const emptyDistinct = IArray.Empty.distinct();
      expect(emptyDistinct.isEmpty).toBe(true);
    });
  });

  describe("Conversion Operations", () => {
    test("toArray", () => {
      const arr = IArray.apply("a", "b", "c");

      const array = arr.toArray();
      expect(array).toEqual(["a", "b", "c"]);
    });

    test("toSet", () => {
      const arr = IArray.apply("a", "b", "c");

      const set = arr.toSet();
      expect(set).toEqual(new Set(["a", "b", "c"]));
    });

    test("toMap with tuples", () => {
      const tuples = IArray.apply<[string, string]>(["key1", "value1"], ["key2", "value2"]);

      const map = tuples.toMap();
      expect(map.size).toBe(2);
      expect(map.get("key1")).toBe("value1");
      expect(map.get("key2")).toBe("value2");
    });

    test("groupBy", () => {
      const words = IArray.apply("apple", "banana", "apricot", "blueberry", "cherry");

      const grouped = words.groupBy(w => w.charAt(0));
      expect(grouped.get('a')?.length).toBe(2);
      expect(grouped.get('a')?.contains("apple")).toBe(true);
      expect(grouped.get('a')?.contains("apricot")).toBe(true);
      expect(grouped.get('b')?.length).toBe(2);
      expect(grouped.get('c')?.length).toBe(1);
    });
  });

  describe("Builder Operations", () => {
    test("basic builder", () => {
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
    });

    test("builder with initial capacity", () => {
      const builder2 = IArrayBuilder.empty<string>(100);
      builder2.addOne("test");
      const result2 = builder2.result();
      expect(result2.length).toBe(1);
      expect(result2.apply(0)).toBe("test");
    });

    test("builder from existing IArray", () => {
      const existing = IArray.apply("x", "y");
      const builder3 = IArrayBuilder.fromIArray(existing, 50);
      builder3.addOne("z");
      const result3 = builder3.result();
      expect(result3.length).toBe(3);
      expect(result3.apply(0)).toBe("x");
      expect(result3.apply(1)).toBe("y");
      expect(result3.apply(2)).toBe("z");
    });

    test("appendAll operation", () => {
      const builder4 = IArrayBuilder.empty<string>();
      const toAdd = IArray.apply("1", "2", "3");
      builder4.appendAll(toAdd);
      const result4 = builder4.result();
      expect(result4.length).toBe(3);
      expect(result4).toEqual(toAdd);
    });

    test("clear", () => {
      const builder = IArrayBuilder.empty<string>();
      builder.addOne("test");
      builder.clear();
      expect(builder.isEmpty).toBe(true);
      const emptyResult = builder.result();
      expect(emptyResult.isEmpty).toBe(true);
    });

    test("forall on builder", () => {
      const builder5 = IArrayBuilder.empty<string>();
      builder5.addOne("abc");
      builder5.addOne("def");
      expect(builder5.forall(s => s.length === 3)).toBe(true);
      expect(builder5.forall(s => s.startsWith("a"))).toBe(false);
    });
  });
});