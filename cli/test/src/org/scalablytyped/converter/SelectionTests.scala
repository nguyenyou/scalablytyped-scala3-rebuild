package org.scalablytyped.converter

import utest.*
import scala.collection.immutable.TreeSet
import io.circe.syntax.*
import io.circe.parser.*

object SelectionTests extends TestSuite {
  def tests = Tests {
    test("Basic Construction and Factory Methods") {
      test("All factory method creates AllExcept with empty set") {
        val all = Selection.All[String]
        assert(all.isInstanceOf[Selection.AllExcept[String]])
        val allExcept = all.asInstanceOf[Selection.AllExcept[String]]
        assert(allExcept.values.isEmpty)
      }

      test("None factory method creates NoneExcept with empty set") {
        val none = Selection.None[String]
        assert(none.isInstanceOf[Selection.NoneExcept[String]])
        val noneExcept = none.asInstanceOf[Selection.NoneExcept[String]]
        assert(noneExcept.values.isEmpty)
      }

      test("AllExcept varargs constructor") {
        val allExcept = Selection.AllExcept("a", "b", "c")
        assert(allExcept.values.size == 3)
        assert(allExcept.values.contains("a"))
        assert(allExcept.values.contains("b"))
        assert(allExcept.values.contains("c"))
      }

      test("NoneExcept varargs constructor") {
        val noneExcept = Selection.NoneExcept("x", "y", "z")
        assert(noneExcept.values.size == 3)
        assert(noneExcept.values.contains("x"))
        assert(noneExcept.values.contains("y"))
        assert(noneExcept.values.contains("z"))
      }

      test("AllExcept with SortedSet constructor") {
        val sortedSet = TreeSet("b", "a", "c")
        val allExcept = Selection.AllExcept(sortedSet)
        assert(allExcept.values == sortedSet)
        assert(allExcept.values.toList == List("a", "b", "c")) // Should be sorted
      }

      test("NoneExcept with SortedSet constructor") {
        val sortedSet = TreeSet("z", "x", "y")
        val noneExcept = Selection.NoneExcept(sortedSet)
        assert(noneExcept.values == sortedSet)
        assert(noneExcept.values.toList == List("x", "y", "z")) // Should be sorted
      }
    }

    test("Apply Method - Core Selection Logic") {
      test("AllExcept apply method") {
        val allExcept = Selection.AllExcept("excluded1", "excluded2")
        
        // Should return false for excluded values
        assert(!allExcept("excluded1"))
        assert(!allExcept("excluded2"))
        
        // Should return true for non-excluded values
        assert(allExcept("included1"))
        assert(allExcept("included2"))
        assert(allExcept(""))
      }

      test("NoneExcept apply method") {
        val noneExcept = Selection.NoneExcept("included1", "included2")
        
        // Should return true for included values
        assert(noneExcept("included1"))
        assert(noneExcept("included2"))
        
        // Should return false for non-included values
        assert(!noneExcept("excluded1"))
        assert(!noneExcept("excluded2"))
        assert(!noneExcept(""))
      }

      test("And apply method") {
        val selection1 = Selection.AllExcept("a")
        val selection2 = Selection.NoneExcept("b", "c")
        val andSelection = Selection.And(selection1, selection2)
        
        // Should return true only when both selections return true
        assert(andSelection("b")) // Not in first exclusion AND in second inclusion
        assert(andSelection("c")) // Not in first exclusion AND in second inclusion
        assert(!andSelection("a")) // In first exclusion
        assert(!andSelection("d")) // Not in second inclusion
      }

      test("Or apply method") {
        val selection1 = Selection.AllExcept("a")
        val selection2 = Selection.NoneExcept("a", "b")
        val orSelection = Selection.Or(selection1, selection2)

        // Should return true when either selection returns true
        assert(orSelection("a")) // Excluded from first BUT included in second
        assert(orSelection("b")) // Not excluded from first AND included in second
        assert(orSelection("c")) // Not excluded from first (even though not in second)
        assert(orSelection("d")) // Not excluded from first (selection1 returns true)
      }
    }

    test("Logical Operators - && and ||") {
      test("&& operator creates And selection") {
        val sel1 = Selection.AllExcept("a")
        val sel2 = Selection.NoneExcept("b")
        val result = sel1 && sel2
        
        assert(result.isInstanceOf[Selection.And[String]])
        val andSel = result.asInstanceOf[Selection.And[String]]
        assert(andSel._1 == sel1)
        assert(andSel._2 == sel2)
      }

      test("|| operator creates Or selection") {
        val sel1 = Selection.AllExcept("a")
        val sel2 = Selection.NoneExcept("b")
        val result = sel1 || sel2
        
        assert(result.isInstanceOf[Selection.Or[String]])
        val orSel = result.asInstanceOf[Selection.Or[String]]
        assert(orSel._1 == sel1)
        assert(orSel._2 == sel2)
      }

      test("chained logical operations") {
        val sel1 = Selection.AllExcept("a")
        val sel2 = Selection.NoneExcept("b")
        val sel3 = Selection.AllExcept("c")
        
        val complex = (sel1 && sel2) || sel3
        
        // Test some values
        assert(complex("b")) // Should pass sel1 && sel2
        assert(complex("d")) // Should pass sel3 (AllExcept "c")
        assert(!complex("c")) // Should fail sel3 and not pass sel1 && sel2
      }
    }

    test("Map Method - Type Transformation") {
      test("map on AllExcept") {
        val allExcept = Selection.AllExcept(1, 2, 3)
        val mapped = allExcept.map(_.toString)
        
        assert(mapped.isInstanceOf[Selection.AllExcept[String]])
        val mappedAllExcept = mapped.asInstanceOf[Selection.AllExcept[String]]
        assert(mappedAllExcept.values.contains("1"))
        assert(mappedAllExcept.values.contains("2"))
        assert(mappedAllExcept.values.contains("3"))
        assert(mappedAllExcept.values.size == 3)
      }

      test("map on NoneExcept") {
        val noneExcept = Selection.NoneExcept(1, 2, 3)
        val mapped = noneExcept.map(_.toString)
        
        assert(mapped.isInstanceOf[Selection.NoneExcept[String]])
        val mappedNoneExcept = mapped.asInstanceOf[Selection.NoneExcept[String]]
        assert(mappedNoneExcept.values.contains("1"))
        assert(mappedNoneExcept.values.contains("2"))
        assert(mappedNoneExcept.values.contains("3"))
        assert(mappedNoneExcept.values.size == 3)
      }

      test("map on And") {
        val sel1 = Selection.AllExcept(1, 2)
        val sel2 = Selection.NoneExcept(3, 4)
        val andSel = Selection.And(sel1, sel2)
        val mapped = andSel.map(_.toString)
        
        assert(mapped.isInstanceOf[Selection.And[String]])

        // Verify the mapped selections work correctly
        assert(!mapped("1")) // Should be excluded by first selection
        assert(!mapped("2")) // Should be excluded by first selection
        assert(mapped("3")) // Should pass both selections
        assert(mapped("4")) // Should pass both selections
        assert(!mapped("5")) // Should fail second selection
      }

      test("map on Or") {
        val sel1 = Selection.AllExcept(1)
        val sel2 = Selection.NoneExcept(1, 2)
        val orSel = Selection.Or(sel1, sel2)
        val mapped = orSel.map(_.toString)
        
        assert(mapped.isInstanceOf[Selection.Or[String]])
        
        // Test the behavior
        assert(mapped("1")) // Should pass second selection
        assert(mapped("2")) // Should pass both selections
        assert(mapped("3")) // Should pass first selection
      }

      test("map with complex transformation") {
        val selection = Selection.NoneExcept("apple", "banana")
        val mapped = selection.map(_.length)
        
        assert(mapped(5)) // "apple".length
        assert(mapped(6)) // "banana".length
        assert(!mapped(4)) // Not a length of included strings
        assert(!mapped(7)) // Not a length of included strings
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("empty selections") {
        val emptyAllExcept = Selection.AllExcept[String]()
        val emptyNoneExcept = Selection.NoneExcept[String]()
        
        // AllExcept with empty set should include everything
        assert(emptyAllExcept("anything"))
        assert(emptyAllExcept(""))
        
        // NoneExcept with empty set should exclude everything
        assert(!emptyNoneExcept("anything"))
        assert(!emptyNoneExcept(""))
      }

      test("single element selections") {
        val singleAllExcept = Selection.AllExcept("only")
        val singleNoneExcept = Selection.NoneExcept("only")
        
        assert(!singleAllExcept("only"))
        assert(singleAllExcept("other"))
        
        assert(singleNoneExcept("only"))
        assert(!singleNoneExcept("other"))
      }

      test("duplicate values in constructor") {
        val allExceptDupes = Selection.AllExcept("a", "b", "a", "c", "b")
        val noneExceptDupes = Selection.NoneExcept("x", "y", "x", "z", "y")
        
        // TreeSet should eliminate duplicates
        assert(allExceptDupes.values.size == 3)
        assert(noneExceptDupes.values.size == 3)
        
        assert(allExceptDupes.values.contains("a"))
        assert(allExceptDupes.values.contains("b"))
        assert(allExceptDupes.values.contains("c"))
      }

      test("complex nested logical operations") {
        val sel1 = Selection.AllExcept("a")
        val sel2 = Selection.NoneExcept("b")
        val sel3 = Selection.AllExcept("c")
        val sel4 = Selection.NoneExcept("d")
        
        val complex = (sel1 && sel2) || (sel3 && sel4)
        
        // Test various combinations
        assert(complex("b")) // Passes sel1 && sel2
        assert(complex("d")) // Passes sel3 && sel4
        assert(!complex("a")) // Fails sel1, and "a" is not "d" so fails sel4
        assert(!complex("c")) // Fails sel3, and "c" is not "b" so fails sel2
      }

      test("self-referential logical operations") {
        val sel = Selection.AllExcept("a")
        val selfAnd = sel && sel
        val selfOr = sel || sel
        
        // Should behave the same as the original selection
        assert(selfAnd("b") == sel("b"))
        assert(selfAnd("a") == sel("a"))
        assert(selfOr("b") == sel("b"))
        assert(selfOr("a") == sel("a"))
      }
    }

    test("Different Types Support") {
      test("Integer selections") {
        val intSelection = Selection.AllExcept(1, 2, 3)
        assert(!intSelection(1))
        assert(!intSelection(2))
        assert(!intSelection(3))
        assert(intSelection(4))
        assert(intSelection(0))
      }

      test("Custom case class with Ordering") {
        case class Person(name: String, age: Int)
        implicit val personOrdering: Ordering[Person] = Ordering.by(p => (p.name, p.age))

        val person1 = Person("Alice", 30)
        val person2 = Person("Bob", 25)
        val person3 = Person("Charlie", 35)

        val personSelection = Selection.NoneExcept(person1, person2)
        assert(personSelection(person1))
        assert(personSelection(person2))
        assert(!personSelection(person3))
      }
    }

    test("JSON Serialization and Deserialization") {
      test("AllExcept JSON round-trip") {
        val allExcept: Selection[String] = Selection.AllExcept("a", "b", "c")
        val json = allExcept.asJson
        val decoded = json.as[Selection[String]]

        decoded match {
          case Right(decodedSelection) =>
            assert(decodedSelection.isInstanceOf[Selection.AllExcept[String]])
            val decodedAllExcept = decodedSelection.asInstanceOf[Selection.AllExcept[String]]
            assert(decodedAllExcept.values == allExcept.asInstanceOf[Selection.AllExcept[String]].values)

            // Test behavior is preserved
            assert(decodedSelection("a") == allExcept("a"))
            assert(decodedSelection("d") == allExcept("d"))
          case Left(_) =>
            assert(false)
        }
      }

      test("NoneExcept JSON round-trip") {
        val noneExcept: Selection[String] = Selection.NoneExcept("x", "y", "z")
        val json = noneExcept.asJson
        val decoded = json.as[Selection[String]]

        decoded match {
          case Right(decodedSelection) =>
            assert(decodedSelection.isInstanceOf[Selection.NoneExcept[String]])
            val decodedNoneExcept = decodedSelection.asInstanceOf[Selection.NoneExcept[String]]
            assert(decodedNoneExcept.values == noneExcept.asInstanceOf[Selection.NoneExcept[String]].values)

            // Test behavior is preserved
            assert(decodedSelection("x") == noneExcept("x"))
            assert(decodedSelection("w") == noneExcept("w"))
          case Left(_) =>
            assert(false)
        }
      }

      test("And JSON round-trip") {
        val sel1 = Selection.AllExcept("a")
        val sel2 = Selection.NoneExcept("b", "c")
        val andSelection: Selection[String] = Selection.And(sel1, sel2)

        val json = andSelection.asJson
        val decoded = json.as[Selection[String]]

        decoded match {
          case Right(decodedSelection) =>
            assert(decodedSelection.isInstanceOf[Selection.And[String]])

            // Test behavior is preserved
            assert(decodedSelection("a") == andSelection("a"))
            assert(decodedSelection("b") == andSelection("b"))
            assert(decodedSelection("c") == andSelection("c"))
            assert(decodedSelection("d") == andSelection("d"))
          case Left(_) =>
            assert(false)
        }
      }

      test("Or JSON round-trip") {
        val sel1 = Selection.AllExcept("a")
        val sel2 = Selection.NoneExcept("a", "b")
        val orSelection: Selection[String] = Selection.Or(sel1, sel2)

        val json = orSelection.asJson
        val decoded = json.as[Selection[String]]

        decoded match {
          case Right(decodedSelection) =>
            assert(decodedSelection.isInstanceOf[Selection.Or[String]])

            // Test behavior is preserved
            assert(decodedSelection("a") == orSelection("a"))
            assert(decodedSelection("b") == orSelection("b"))
            assert(decodedSelection("c") == orSelection("c"))
          case Left(_) =>
            assert(false)
        }
      }

      test("Complex nested selection JSON round-trip") {
        val sel1 = Selection.AllExcept("a", "b")
        val sel2 = Selection.NoneExcept("c", "d")
        val sel3 = Selection.AllExcept("e")
        val complex: Selection[String] = (sel1 && sel2) || sel3

        val json = complex.asJson
        val decoded = json.as[Selection[String]]

        decoded match {
          case Right(decodedSelection) =>
            // Test behavior is preserved for various inputs
            val testValues = List("a", "b", "c", "d", "e", "f", "g")
            testValues.foreach { value =>
              assert(decodedSelection(value) == complex(value))
            }
          case Left(_) =>
            assert(false)
        }
      }

      test("Invalid JSON format") {
        val invalidJson = parse("""{"InvalidKey": ["a", "b"]}""")

        invalidJson match {
          case Right(json) =>
            val decoded = json.as[Selection[String]]
            decoded match {
              case Left(_) => assert(true) // Expected failure
              case Right(_) => assert(false)
            }
          case Left(_) => assert(false)
        }
      }

      test("Empty selections JSON round-trip") {
        val emptyAll: Selection[String] = Selection.All[String]
        val emptyNone: Selection[String] = Selection.None[String]

        // Test All (which is AllExcept with empty set)
        val allJson = emptyAll.asJson
        val allDecoded = allJson.as[Selection[String]]
        allDecoded match {
          case Right(decodedSelection) =>
            assert(decodedSelection("anything") == emptyAll("anything"))
          case Left(_) =>
            assert(false)
        }

        // Test None (which is NoneExcept with empty set)
        val noneJson = emptyNone.asJson
        val noneDecoded = noneJson.as[Selection[String]]
        noneDecoded match {
          case Right(decodedSelection) =>
            assert(decodedSelection("anything") == emptyNone("anything"))
          case Left(_) =>
            assert(false)
        }
      }
    }

    test("Error Handling and Robustness") {
      test("selections with null-like values") {
        // Test with empty string
        val selectionWithEmpty = Selection.NoneExcept("", "valid")
        assert(selectionWithEmpty(""))
        assert(selectionWithEmpty("valid"))
        assert(!selectionWithEmpty("invalid"))
      }

      test("very large selections") {
        val largeSet = (1 to 1000).map(_.toString).toSeq
        val largeSelection = Selection.AllExcept(largeSet*)

        assert(largeSelection.values.size == 1000)
        assert(!largeSelection("500"))
        assert(largeSelection("1001"))
      }

      test("deeply nested logical operations") {
        var selection: Selection[String] = Selection.All[String]

        // Create a deeply nested structure
        for (i <- 1 to 10) {
          val newSel = Selection.NoneExcept(s"item$i")
          selection = selection && newSel
        }

        // Should only return true for values that are in all NoneExcept selections
        assert(!selection("item1")) // Not in any NoneExcept
        assert(!selection("item5")) // Not in any NoneExcept
        assert(!selection("other")) // Not in any NoneExcept
      }
    }
  }
}