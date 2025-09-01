import { expect, test, describe } from "bun:test";
import { IArray, IArrayBuilder, partialFunction } from "../internal/IArray";

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
    expect(arr.applyOrElse(0, _ => "default")).toBe("a");
    expect(arr.applyOrElse(10, _ => "default")).toBe("default");

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

  test("Indexing and Slicing", () => {
    const arr = IArray.apply("a", "b", "c", "d", "e");

    // Test indices
    expect(arr.indices.length).toBe(5);
    expect(arr.indices.apply(0)).toBe(0);
    expect(arr.indices.apply(4)).toBe(4);

    // Test slice
    const slice = arr.slice(1, 4);
    expect(slice.length).toBe(3);
    expect(slice.apply(0)).toBe("b");
    expect(slice.apply(1)).toBe("c");
    expect(slice.apply(2)).toBe("d");

    // Test take and drop
    const taken = arr.take(3);
    expect(taken.length).toBe(3);
    expect(taken.apply(0)).toBe("a");
    expect(taken.apply(2)).toBe("c");

    const dropped = arr.drop(2);
    expect(dropped.length).toBe(3);
    expect(dropped.apply(0)).toBe("c");
    expect(dropped.apply(2)).toBe("e");

    // Test takeRight and dropRight
    const takenRight = arr.takeRight(2);
    expect(takenRight.length).toBe(2);
    expect(takenRight.apply(0)).toBe("d");
    expect(takenRight.apply(1)).toBe("e");

    const droppedRight = arr.dropRight(2);
    expect(droppedRight.length).toBe(3);
    expect(droppedRight.apply(0)).toBe("a");
    expect(droppedRight.apply(2)).toBe("c");

    // Test splitAt
    const [left, right] = arr.splitAt(2);
    expect(left.length).toBe(2);
    expect(right.length).toBe(3);
    expect(left.apply(0)).toBe("a");
    expect(left.apply(1)).toBe("b");
    expect(right.apply(0)).toBe("c");
    expect(right.apply(2)).toBe("e");
  });

  test("Concatenation and Appending", () => {
    const arr1 = IArray.apply("a", "b");
    const arr2 = IArray.apply("c", "d");

    // Test concat
    const concatenated = arr1.concat(arr2);
    expect(concatenated.length).toBe(4);
    expect(concatenated.apply(0)).toBe("a");
    expect(concatenated.apply(1)).toBe("b");
    expect(concatenated.apply(2)).toBe("c");
    expect(concatenated.apply(3)).toBe("d");

    // Test prepend
    const prepended = arr1.prepend("x");
    expect(prepended.length).toBe(3);
    expect(prepended.apply(0)).toBe("x");
    expect(prepended.apply(1)).toBe("a");
    expect(prepended.apply(2)).toBe("b");

    // Test append
    const appended = arr1.append("z");
    expect(appended.length).toBe(3);
    expect(appended.apply(0)).toBe("a");
    expect(appended.apply(1)).toBe("b");
    expect(appended.apply(2)).toBe("z");

    // Test prependedAll
    const prependedAll = arr1.prependedAll(IArray.apply("x", "y"));
    expect(prependedAll.length).toBe(4);
    expect(prependedAll.apply(0)).toBe("x");
    expect(prependedAll.apply(1)).toBe("y");
    expect(prependedAll.apply(2)).toBe("a");
    expect(prependedAll.apply(3)).toBe("b");

    // Test appendedAll
    const appendedAll = arr1.appendedAll(IArray.apply("y", "z"));
    expect(appendedAll.length).toBe(4);
    expect(appendedAll.apply(0)).toBe("a");
    expect(appendedAll.apply(1)).toBe("b");
    expect(appendedAll.apply(2)).toBe("y");
    expect(appendedAll.apply(3)).toBe("z");
  });

  test("Functional Operations - Map, FlatMap, Filter", () => {
    const arr = IArray.apply("1", "2", "3", "4");

    // Test map
    const mapped = arr.map(s => parseInt(s));
    expect(mapped.length).toBe(4);
    expect(mapped.apply(0)).toBe(1);
    expect(mapped.apply(3)).toBe(4);

    // Test map on empty
    const emptyMapped = IArray.Empty.map((x: any) => x);
    expect(emptyMapped.isEmpty).toBe(true);

    // Test flatMap
    const flatMapped = arr.flatMap(s => IArray.apply(s, s + "x"));
    expect(flatMapped.length).toBe(8);
    expect(flatMapped.apply(0)).toBe("1");
    expect(flatMapped.apply(1)).toBe("1x");
    expect(flatMapped.apply(2)).toBe("2");
    expect(flatMapped.apply(3)).toBe("2x");

    // Test filter
    const filtered = arr.filter(s => parseInt(s) % 2 === 0);
    expect(filtered.length).toBe(2);
    expect(filtered.apply(0)).toBe("2");
    expect(filtered.apply(1)).toBe("4");

    // Test filterNot
    const filteredNot = arr.filterNot(s => parseInt(s) % 2 === 0);
    expect(filteredNot.length).toBe(2);
    expect(filteredNot.apply(0)).toBe("1");
    expect(filteredNot.apply(1)).toBe("3");

    // Test collect
    const collected = arr.collect(partialFunction(
      s => parseInt(s) % 2 === 0,
      s => parseInt(s) * 2
    ));
    expect(collected.length).toBe(2);
    expect(collected.apply(0)).toBe(4);
    expect(collected.apply(1)).toBe(8);
  });

  test("Searching and Finding", () => {
    const arr = IArray.apply("apple", "banana", "cherry", "date");

    // Test find
    const found = arr.find(s => s.startsWith("c"));
    expect(found).toBe("cherry");

    const notFound = arr.find(s => s.startsWith("z"));
    expect(notFound).toBeUndefined();

    // Test exists
    expect(arr.exists(s => s.length > 5)).toBe(true);
    expect(arr.exists(s => s.length > 10)).toBe(false);

    // Test forall
    expect(arr.forall(s => s.length > 0)).toBe(true);
    expect(arr.forall(s => s.length > 5)).toBe(false);

    // Test contains
    expect(arr.contains("banana")).toBe(true);
    expect(arr.contains("grape")).toBe(false);

    // Test indexOf
    expect(arr.indexOf("cherry")).toBe(2);
    expect(arr.indexOf("grape")).toBe(-1);

    // Test lastIndexOf
    const arrWithDuplicates = IArray.apply("a", "b", "a", "c", "a");
    expect(arrWithDuplicates.lastIndexOf("a")).toBe(4);
    expect(arrWithDuplicates.lastIndexOf("z")).toBe(-1);
  });

  test("Folding and Reducing", () => {
    const arr = IArray.apply(1, 2, 3, 4, 5);

    // Test foldLeft
    const sumLeft = arr.foldLeft(0, (acc, x) => acc + x);
    expect(sumLeft).toBe(15);

    const concatLeft = IArray.apply("a", "b", "c").foldLeft("", (acc, x) => acc + x);
    expect(concatLeft).toBe("abc");

    // Test foldRight
    const sumRight = arr.foldRight(0, (x, acc) => x + acc);
    expect(sumRight).toBe(15);

    const concatRight = IArray.apply("a", "b", "c").foldRight("", (x, acc) => x + acc);
    expect(concatRight).toBe("abc");

    // Test reduce
    const reduced = arr.reduce((acc, x) => acc + x);
    expect(reduced).toBe(15);

    // Test reduceLeft
    const reducedLeft = arr.reduceLeft((acc, x) => acc + x);
    expect(reducedLeft).toBe(15);

    // Test reduceRight
    const reducedRight = arr.reduceRight((x, acc) => x + acc);
    expect(reducedRight).toBe(15);

    // Test reduceOption
    const reducedOption = arr.reduceOption((acc, x) => acc + x);
    expect(reducedOption).toBe(15);

    const emptyReduced = IArray.Empty.reduceOption((acc: any, x: any) => acc + x);
    expect(emptyReduced).toBeUndefined();
  });

  test("Sorting and Reversing", () => {
    const arr = IArray.apply("banana", "apple", "cherry", "date");

    // Test sorted
    const sorted = arr.sorted();
    expect(sorted.length).toBe(4);
    expect(sorted.apply(0)).toBe("apple");
    expect(sorted.apply(1)).toBe("banana");
    expect(sorted.apply(2)).toBe("cherry");
    expect(sorted.apply(3)).toBe("date");

    // Test sortBy
    const sortedByLength = arr.sortBy(s => s.length);
    expect(sortedByLength.apply(0)).toBe("date");
    expect(sortedByLength.apply(1)).toBe("apple");
    expect(sortedByLength.apply(2)).toBe("banana");
    expect(sortedByLength.apply(3)).toBe("cherry");

    // Test sortWith
    const sortedWith = arr.sortWith((a, b) => b.localeCompare(a));
    expect(sortedWith.apply(0)).toBe("date");
    expect(sortedWith.apply(1)).toBe("cherry");
    expect(sortedWith.apply(2)).toBe("banana");
    expect(sortedWith.apply(3)).toBe("apple");

    // Test reverse
    const reversed = arr.reverse();
    expect(reversed.apply(0)).toBe("date");
    expect(reversed.apply(1)).toBe("cherry");
    expect(reversed.apply(2)).toBe("apple");
    expect(reversed.apply(3)).toBe("banana");

    // Test empty array sorting
    const emptySorted = IArray.Empty.sorted();
    expect(emptySorted.isEmpty).toBe(true);
  });

  test("Grouping and Partitioning", () => {
    const arr = IArray.apply("apple", "banana", "apricot", "blueberry", "cherry");

    // Test groupBy
    const grouped = arr.groupBy(s => s.charAt(0));
    expect(grouped.get("a")?.length).toBe(2);
    expect(grouped.get("b")?.length).toBe(2);
    expect(grouped.get("c")?.length).toBe(1);

    // Test partition
    const [startsWithA, others] = arr.partition(s => s.startsWith("a"));
    expect(startsWithA.length).toBe(2);
    expect(others.length).toBe(3);
    expect(startsWithA.apply(0)).toBe("apple");
    expect(startsWithA.apply(1)).toBe("apricot");

    // Test span
    const [prefix, suffix] = arr.span(s => s.startsWith("a"));
    expect(prefix.length).toBe(1);
    expect(suffix.length).toBe(4);
    expect(prefix.apply(0)).toBe("apple");
    expect(suffix.apply(0)).toBe("banana");

    // Test splitAt
    const [left, right] = arr.splitAt(2);
    expect(left.length).toBe(2);
    expect(right.length).toBe(3);
    expect(left.apply(0)).toBe("apple");
    expect(left.apply(1)).toBe("banana");
    expect(right.apply(0)).toBe("apricot");
  });

  test("Conversion and Utility Operations", () => {
    const arr = IArray.apply("a", "b", "c", "d");

    // Test toArray
    const array = arr.toArray();
    expect(Array.isArray(array)).toBe(true);
    expect(array.length).toBe(4);
    expect(array[0]).toBe("a");
    expect(array[3]).toBe("d");

    // Test mkString
    const joined = arr.mkString(", ");
    expect(joined).toBe("a, b, c, d");

    const joinedWithBrackets = arr.mkString("[", ", ", "]");
    expect(joinedWithBrackets).toBe("[a, b, c, d]");

    // Test distinct
    const withDuplicates = IArray.apply("a", "b", "a", "c", "b", "d");
    const distinct = withDuplicates.distinct();
    expect(distinct.length).toBe(4);
    expect(distinct.apply(0)).toBe("a");
    expect(distinct.apply(1)).toBe("b");
    expect(distinct.apply(2)).toBe("c");
    expect(distinct.apply(3)).toBe("d");

    // Test zip
    const arr2 = IArray.apply(1, 2, 3, 4);
    const zipped = arr.zip(arr2);
    expect(zipped.length).toBe(4);
    expect(zipped.apply(0)).toEqual(["a", 1]);
    expect(zipped.apply(3)).toEqual(["d", 4]);

    // Test zipWithIndex
    const withIndex = arr.zipWithIndex();
    expect(withIndex.length).toBe(4);
    expect(withIndex.apply(0)).toEqual(["a", 0]);
    expect(withIndex.apply(3)).toEqual(["d", 3]);
  });
});