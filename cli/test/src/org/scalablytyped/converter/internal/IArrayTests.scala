package org.scalablytyped.converter.internal

import utest.*
import scala.collection.immutable.SortedSet

object IArrayTests extends TestSuite {
  def tests = Tests {
    test("Construction and Factory Methods") {
      // Test IArray.apply
      val arr1 = IArray("a", "b", "c")
      assert(arr1.length == 3)
      assert(arr1(0) == "a")
      assert(arr1(1) == "b")
      assert(arr1(2) == "c")

      // Test empty array
      val empty = IArray[String]()
      assert(empty.isEmpty)
      assert(empty.length == 0)

      // Test IArray.Empty
      assert(IArray.Empty.isEmpty)
      assert(IArray.Empty.length == 0)

      // Test fromOption
      val fromSome = IArray.fromOption(Some("test"))
      assert(fromSome.length == 1)
      assert(fromSome(0) == "test")

      val fromNone = IArray.fromOption(None)
      assert(fromNone.isEmpty)

      // Test fromOptions
      val fromOptions = IArray.fromOptions(Some("a"), None, Some("b"), None, Some("c"))
      assert(fromOptions.length == 3)
      assert(fromOptions(0) == "a")
      assert(fromOptions(1) == "b")
      assert(fromOptions(2) == "c")

      // Test fromArray
      val fromArray = IArray.fromArray(Array("x", "y", "z"))
      assert(fromArray.length == 3)
      assert(fromArray(0) == "x")
      assert(fromArray(1) == "y")
      assert(fromArray(2) == "z")

      // Test fromTraversable
      val fromList = IArray.fromTraversable(List("1", "2", "3"))
      assert(fromList.length == 3)
      assert(fromList(0) == "1")
      assert(fromList(1) == "2")
      assert(fromList(2) == "3")
    }

    test("Basic Properties and Access") {
      val arr = IArray("a", "b", "c", "d")

      // Test length and size properties
      assert(arr.length == 4)
      assert(!arr.isEmpty)
      assert(arr.nonEmpty)

      // Test lengthCompare
      assert(arr.lengthCompare(3) > 0)
      assert(arr.lengthCompare(4) == 0)
      assert(arr.lengthCompare(5) < 0)

      // Test apply and isDefinedAt
      assert(arr(0) == "a")
      assert(arr(3) == "d")
      assert(arr.isDefinedAt(0))
      assert(arr.isDefinedAt(3))
      assert(!arr.isDefinedAt(4))
      assert(!arr.isDefinedAt(-1))

      // Test applyOrElse
      assert(arr.applyOrElse(0, _ => "default") == "a")
      assert(arr.applyOrElse(10, _ => "default") == "default")

      // Test empty array properties
      val empty = IArray.Empty
      assert(empty.isEmpty)
      assert(!empty.nonEmpty)
      assert(empty.length == 0)
    }

    test("Head, Tail, Init, Last Operations") {
      val arr = IArray("first", "middle", "last")

      // Test head operations
      assert(arr.head == "first")
      assert(arr.headOption.contains("first"))

      // Test tail operations
      val tail = arr.tail
      assert(tail.length == 2)
      assert(tail(0) == "middle")
      assert(tail(1) == "last")
      assert(arr.tailOpt.contains(tail))

      // Test init operations
      val init = arr.init
      assert(init.length == 2)
      assert(init(0) == "first")
      assert(init(1) == "middle")
      assert(arr.initOption.contains(init))

      // Test last operations
      assert(arr.last == "last")
      assert(arr.lastOption.contains("last"))

      // Test single element array
      val single = IArray("only")
      assert(single.head == "only")
      assert(single.last == "only")
      assert(single.tail.isEmpty)
      assert(single.init.isEmpty)

      // Test empty array operations should throw
      val empty = IArray.Empty
      assert(empty.headOption.isEmpty)
      assert(empty.lastOption.isEmpty)
      assert(empty.tailOpt.isEmpty)
      assert(empty.initOption.isEmpty)

      try { empty.head; assert(false) } catch { case _: RuntimeException => }
      try { empty.tail; assert(false) } catch { case _: RuntimeException => }
      try { empty.init; assert(false) } catch { case _: RuntimeException => }
      try { empty.last; assert(false) } catch { case _: RuntimeException => }
    }

    test("Functional Operations - Map, FlatMap, Filter") {
      val arr = IArray("1", "2", "3", "4")

      // Test map
      val mapped = arr.map(s => Integer.valueOf(s.toInt))
      assert(mapped.length == 4)
      assert(mapped(0) == 1)
      assert(mapped(3) == 4)

      // Test map on empty
      val emptyMapped = IArray.Empty.map(identity)
      assert(emptyMapped.isEmpty)

      // Test flatMap
      val flatMapped = arr.flatMap(s => IArray(s, s + "x"))
      assert(flatMapped.length == 8)
      assert(flatMapped(0) == "1")
      assert(flatMapped(1) == "1x")
      assert(flatMapped(2) == "2")
      assert(flatMapped(3) == "2x")

      // Test filter
      val filtered = arr.filter(_.toInt % 2 == 0)
      assert(filtered.length == 2)
      assert(filtered(0) == "2")
      assert(filtered(1) == "4")

      // Test filterNot
      val filterNot = arr.filterNot(_.toInt % 2 == 0)
      assert(filterNot.length == 2)
      assert(filterNot(0) == "1")
      assert(filterNot(1) == "3")

      // Test filter on empty
      val emptyFiltered = IArray.Empty.filter(_ => true)
      assert(emptyFiltered.isEmpty)
    }

    test("Collect and Partial Functions") {
      val arr = IArray("1", "2", "abc", "3", "def", "4")

      // Test collect
      val collected = arr.collect { case s if s.forall(_.isDigit) => Integer.valueOf(s.toInt) }
      assert(collected.length == 4)
      assert(collected(0) == 1)
      assert(collected(1) == 2)
      assert(collected(2) == 3)
      assert(collected(3) == 4)

      // Test collectFirst
      val firstDigit = arr.collectFirst { case s if s.forall(_.isDigit) => Integer.valueOf(s.toInt) }
      assert(firstDigit.contains(1))

      val noMatch = arr.collectFirst { case s if s.startsWith("z") => s }
      assert(noMatch.isEmpty)

      // Test collect on empty
      val emptyCollected = IArray.Empty.collect { case x => x }
      assert(emptyCollected.isEmpty)
    }

    test("Fold, Reduce, and Aggregation Operations") {
      val numbers = IArray("1", "2", "3", "4")

      // Test foldLeft
      val sum = numbers.foldLeft(0)((acc, s) => acc + s.toInt)
      assert(sum == 10)

      val concat = numbers.foldLeft("")(_ + _)
      assert(concat == "1234")

      // Test reduce
      val reduced = numbers.reduce(_ + _)
      assert(reduced == "1234")

      // Test reduceOption
      val reducedOpt = numbers.reduceOption(_ + _)
      assert(reducedOpt.contains("1234"))

      val emptyReduced = IArray.Empty.reduceOption[String](_ + _)
      assert(emptyReduced.isEmpty)

      // Test reduce on empty should throw
      try { IArray.Empty.reduce[String](_ + _); assert(false) } catch { case _: RuntimeException => }

      // Test count
      val evenCount = numbers.count(_.toInt % 2 == 0)
      assert(evenCount == 2)

      // Test sum with numeric
      val intArr = IArray(Integer.valueOf(1), Integer.valueOf(2), Integer.valueOf(3), Integer.valueOf(4))
      // Note: sum requires Numeric evidence, testing with manual fold instead
      val manualSum = intArr.foldLeft(0)((acc, n) => acc + n.intValue())
      assert(manualSum == 10)
    }

    test("Search and Find Operations") {
      val arr = IArray("apple", "banana", "cherry", "date", "elderberry")

      // Test find
      val found = arr.find(_.startsWith("c"))
      assert(found.contains("cherry"))

      val notFound = arr.find(_.startsWith("z"))
      assert(notFound.isEmpty)

      // Test exists
      assert(arr.exists(_.contains("err")))
      assert(!arr.exists(_.startsWith("z")))

      // Test forall
      assert(arr.forall(_.length > 3))
      assert(!arr.forall(_.startsWith("a")))

      // Test indexOf
      assert(arr.indexOf("cherry") == 2)
      assert(arr.indexOf("missing") == -1)
      assert(arr.indexOf("banana", 2) == -1)
      assert(arr.indexOf("banana", 1) == 1)

      // Test indexWhere
      assert(arr.indexWhere(_.startsWith("d")) == 3)
      assert(arr.indexWhere(_.startsWith("z")) == -1)
      assert(arr.indexWhere(_.length > 5, 2) == 2) // "cherry" at index 2 has length 6 > 5
    }

    test("Sequence Operations - Take, Drop, Slice") {
      val arr = IArray("a", "b", "c", "d", "e", "f")

      // Test take
      val taken = arr.take(3)
      assert(taken.length == 3)
      assert(taken(0) == "a")
      assert(taken(2) == "c")

      val takeMore = arr.take(10)
      assert(takeMore.length == 6)
      assert(takeMore == arr)

      val takeZero = arr.take(0)
      assert(takeZero.isEmpty)

      // Test takeRight
      val takenRight = arr.takeRight(3)
      assert(takenRight.length == 3)
      assert(takenRight(0) == "d")
      assert(takenRight(2) == "f")

      // Test takeWhile
      val takenWhile = arr.takeWhile(_ < "d")
      assert(takenWhile.length == 3)
      assert(takenWhile(0) == "a")
      assert(takenWhile(2) == "c")

      // Test drop
      val dropped = arr.drop(2)
      assert(dropped.length == 4)
      assert(dropped(0) == "c")
      assert(dropped(3) == "f")

      val dropMore = arr.drop(10)
      assert(dropMore.isEmpty)

      // Test dropRight
      val droppedRight = arr.dropRight(2)
      assert(droppedRight.length == 4)
      assert(droppedRight(0) == "a")
      assert(droppedRight(3) == "d")

      // Test dropWhile
      val droppedWhile = arr.dropWhile(_ < "d")
      assert(droppedWhile.length == 3)
      assert(droppedWhile(0) == "d")
      assert(droppedWhile(2) == "f")

      // Test negative take/drop requirements
      try { arr.take(-1); assert(false) } catch { case _: IllegalArgumentException => }
      try { arr.takeRight(-1); assert(false) } catch { case _: IllegalArgumentException => }
    }

    test("Concatenation and Element Addition") {
      val arr1 = IArray("a", "b")
      val arr2 = IArray("c", "d")

      // Test ++
      val concatenated = arr1 ++ arr2
      assert(concatenated.length == 4)
      assert(concatenated(0) == "a")
      assert(concatenated(3) == "d")

      // Test ++ with empty
      val withEmpty1 = arr1 ++ IArray.Empty
      assert(withEmpty1 == arr1)

      val withEmpty2 = IArray.Empty ++ arr1
      assert(withEmpty2 == arr1)

      // Test prepend (+:)
      val prepended = "x" +: arr1
      assert(prepended.length == 3)
      assert(prepended(0) == "x")
      assert(prepended(1) == "a")
      assert(prepended(2) == "b")

      // Test append (:+)
      val appended = arr1 :+ "z"
      assert(appended.length == 3)
      assert(appended(0) == "a")
      assert(appended(1) == "b")
      assert(appended(2) == "z")
    }

    test("Zip and Partition Operations") {
      val arr1 = IArray("a", "b", "c", "d")
      val arr2 = IArray(Integer.valueOf(1), Integer.valueOf(2), Integer.valueOf(3))

      // Test zip
      val zipped = arr1.zip(arr2)
      assert(zipped.length == 3) // min of both lengths
      assert(zipped(0) == ("a", 1))
      assert(zipped(1) == ("b", 2))
      assert(zipped(2) == ("c", 3))

      // Test zipWithIndex
      val withIndex = arr1.zipWithIndex
      assert(withIndex.length == 4)
      assert(withIndex(0) == ("a", 0))
      assert(withIndex(3) == ("d", 3))

      // Test partition
      val numbers = IArray("1", "2", "3", "4", "5")
      val (evens, odds) = numbers.partition(_.toInt % 2 == 0)
      assert(evens.length == 2)
      assert(evens(0) == "2")
      assert(evens(1) == "4")
      assert(odds.length == 3)
      assert(odds(0) == "1")
      assert(odds(1) == "3")
      assert(odds(2) == "5")

      // Test zip with empty
      val emptyZip = arr1.zip(IArray.Empty)
      assert(emptyZip.isEmpty)
    }

    test("Sorting and Min/Max Operations") {
      val unsorted = IArray("zebra", "apple", "banana", "cherry")

      // Test sorted
      val sorted = unsorted.sorted
      assert(sorted.length == 4)
      assert(sorted(0) == "apple")
      assert(sorted(1) == "banana")
      assert(sorted(2) == "cherry")
      assert(sorted(3) == "zebra")

      // Test sortBy
      val sortedByLength = unsorted.sortBy(_.length)
      assert(sortedByLength(0) == "zebra") // length 5
      assert(sortedByLength(1) == "apple") // length 5
      assert(sortedByLength(2) == "banana") // length 6
      assert(sortedByLength(3) == "cherry") // length 6

      // Test min/max
      assert(unsorted.min == "apple")
      assert(unsorted.max == "zebra")

      // Test maxBy
      val maxByLength = unsorted.maxBy(_.length)
      assert(maxByLength == "banana" || maxByLength == "cherry") // both have length 6

      // Test min/max on empty should throw
      val emptyStrings = IArray.Empty.asInstanceOf[IArray[String]]
      try { emptyStrings.min; assert(false) } catch { case _: RuntimeException => }
      try { emptyStrings.max; assert(false) } catch { case _: RuntimeException => }
      try { emptyStrings.maxBy(identity); assert(false) } catch { case _: RuntimeException => }

      // Test sorted on small arrays
      val single = IArray("only")
      assert(single.sorted == single)

      val emptyForSort = IArray.Empty.asInstanceOf[IArray[String]]
      assert(emptyForSort.sorted == emptyForSort)
    }

    test("Reverse and Distinct Operations") {
      val arr = IArray("a", "b", "c", "d")

      // Test reverse
      val reversed = arr.reverse
      assert(reversed.length == 4)
      assert(reversed(0) == "d")
      assert(reversed(1) == "c")
      assert(reversed(2) == "b")
      assert(reversed(3) == "a")

      // Test reverse on empty
      val emptyReversed = IArray.Empty.reverse
      assert(emptyReversed.isEmpty)

      // Test distinct
      val withDuplicates = IArray("a", "b", "a", "c", "b", "d", "a")
      val distinct = withDuplicates.distinct
      assert(distinct.length == 4)
      assert(distinct.contains("a"))
      assert(distinct.contains("b"))
      assert(distinct.contains("c"))
      assert(distinct.contains("d"))

      // Test distinct on array without duplicates
      val noDuplicates = IArray("a", "b", "c")
      val distinctNoDup = noDuplicates.distinct
      assert(distinctNoDup == noDuplicates) // should return same instance

      // Test distinct on small arrays
      val singleDistinct = IArray("only").distinct
      assert(singleDistinct.length == 1)
      assert(singleDistinct(0) == "only")

      val emptyDistinct = IArray.Empty.distinct
      assert(emptyDistinct.isEmpty)
    }

    test("Conversion Operations") {
      val arr = IArray("a", "b", "c")

      // Test toList
      val list = arr.toList
      assert(list == List("a", "b", "c"))

      // Test toVector
      val vector = arr.toVector
      assert(vector == Vector("a", "b", "c"))

      // Test toSet
      val set = arr.toSet
      assert(set == Set("a", "b", "c"))

      // Test toSortedSet
      val sortedSet = arr.toSortedSet
      assert(sortedSet == SortedSet("a", "b", "c"))

      // Test toMap with tuples
      val tuples = IArray(("key1", "value1"), ("key2", "value2"))
      val map = tuples.toMap
      assert(map.size == 2)
      assert(map("key1") == "value1")
      assert(map("key2") == "value2")

      // Test groupBy
      val words = IArray("apple", "banana", "apricot", "blueberry", "cherry")
      val grouped = words.groupBy(_.head)
      assert(grouped('a').length == 2)
      assert(grouped('a').contains("apple"))
      assert(grouped('a').contains("apricot"))
      assert(grouped('b').length == 2)
      assert(grouped('c').length == 1)
    }

    test("Builder Operations") {
      // Test basic builder
      val builder = IArray.Builder.empty[String]
      assert(builder.isEmpty)

      builder += "a"
      builder += "b"
      builder += "c"

      val result = builder.result()
      assert(result.length == 3)
      assert(result(0) == "a")
      assert(result(1) == "b")
      assert(result(2) == "c")

      // Test builder with initial capacity
      val builder2 = IArray.Builder.empty[String](100)
      builder2 += "test"
      val result2 = builder2.result()
      assert(result2.length == 1)
      assert(result2(0) == "test")

      // Test builder from existing IArray
      val existing = IArray("x", "y")
      val builder3 = IArray.Builder(existing, 50)
      builder3 += "z"
      val result3 = builder3.result()
      assert(result3.length == 3)
      assert(result3(0) == "x")
      assert(result3(1) == "y")
      assert(result3(2) == "z")

      // Test ++= operation
      val builder4 = IArray.Builder.empty[String]
      val toAdd = IArray("1", "2", "3")
      builder4 ++= toAdd
      val result4 = builder4.result()
      assert(result4.length == 3)
      assert(result4 == toAdd)

      // Test clear
      builder4.clear()
      assert(builder4.isEmpty)
      val emptyResult = builder4.result()
      assert(emptyResult.isEmpty)

      // Test forall on builder
      val builder5 = IArray.Builder.empty[String]
      builder5 += "abc"
      builder5 += "def"
      assert(builder5.forall(_.length == 3))
      assert(!builder5.forall(_.startsWith("a")))
    }
  }
}