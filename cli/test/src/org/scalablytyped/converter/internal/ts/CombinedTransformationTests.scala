package org.scalablytyped.converter.internal
package ts

import utest.*

object CombinedTransformationTests extends TestSuite {
  def tests = Tests {
    test("CombinedTransformation Complete Implementation Tests") {
      test("combine method applies both transformations in sequence") {
        // First transformation: sets declared: true
        val transformation1 = new TreeTransformationScopedChanges {
          override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass =
            x.copy(declared = true)
        }

        // Second transformation: sets isAbstract: true
        val transformation2 = new TreeTransformationScopedChanges {
          override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass =
            x.copy(isAbstract = true)
        }

        val combined  = transformation1.combine(transformation2)
        val scope     = TestUtils.createMockScope()
        val declClass = createMockClass("TestClass")

        val result = combined.visitTsDeclClass(scope)(declClass)

        // Both transformations should be applied
        assert(result.declared)   // First transformation
        assert(result.isAbstract) // Second transformation
      }

      test(">> operator works identically to combine") {
        val transformation1 = new TreeTransformationScopedChanges {
          override def enterTsDeclInterface(t: TsTreeScope)(x: TsDeclInterface): TsDeclInterface =
            x.copy(declared = true)
        }

        val transformation2 = new TreeTransformationScopedChanges {
          override def enterTsDeclInterface(t: TsTreeScope)(x: TsDeclInterface): TsDeclInterface =
            x.copy(name = TsIdent("ModifiedInterface"))
        }

        val combinedWithMethod   = transformation1.combine(transformation2)
        val combinedWithOperator = transformation1 >> transformation2

        val scope         = TestUtils.createMockScope()
        val declInterface = TestUtils.createMockInterface("OriginalInterface")

        val result1 = combinedWithMethod.visitTsDeclInterface(scope)(declInterface)
        val result2 = combinedWithOperator.visitTsDeclInterface(scope)(declInterface)

        // Both should produce identical results
        assert(result1.declared)
        assert(result1.name.value == "ModifiedInterface")
        assert(result2.declared)
        assert(result2.name.value == "ModifiedInterface")
      }

      test("combined transformation preserves content when no changes") {
        // Both transformations do nothing
        val transformation1 = new TreeTransformationScopedChanges {}
        val transformation2 = new TreeTransformationScopedChanges {}

        val combined  = transformation1.combine(transformation2)
        val scope     = TestUtils.createMockScope()
        val declClass = createMockClass("TestClass")

        val result = combined.visitTsDeclClass(scope)(declClass)

        // Should preserve content when no changes are made (Scala doesn't preserve object identity)
        assert(result == declClass)
      }

      test("combined transformation works with different node types") {
        // Transformation that modifies class names
        val transformation1 = new TreeTransformationScopedChanges {
          override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass =
            x.copy(name = TsIdent("ModifiedClass"))
        }

        // Transformation that adds comments
        val transformation2 = new TreeTransformationScopedChanges {
          override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass =
            x.copy(
              comments = x.comments + Comment("Modified by second transformation"),
              declared = x.declared,
              isAbstract = x.isAbstract,
              name = x.name,
              tparams = x.tparams,
              parent = x.parent,
              implements = x.implements,
              members = x.members,
              jsLocation = x.jsLocation,
              codePath = x.codePath
            )
        }

        val combined  = transformation1.combine(transformation2)
        val scope     = TestUtils.createMockScope()
        val declClass = createMockClass("OriginalClass")

        val result = combined.visitTsDeclClass(scope)(declClass)

        // Both transformations should be applied
        assert(result.name.value == "ModifiedClass")
        assert(result.comments.rawCs.contains("Modified by second transformation"))
      }

      test("combined transformation can be chained multiple times") {
        val transformation1 = new TreeTransformationScopedChanges {
          override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass =
            x.copy(declared = true)
        }

        val transformation2 = new TreeTransformationScopedChanges {
          override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass =
            x.copy(isAbstract = true)
        }

        val transformation3 = new TreeTransformationScopedChanges {
          override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass =
            x.copy(name = TsIdent("ChainedClass"))
        }

        // Chain multiple transformations
        val combined  = transformation1.combine(transformation2).combine(transformation3)
        val scope     = TestUtils.createMockScope()
        val declClass = createMockClass("OriginalClass")

        val result = combined.visitTsDeclClass(scope)(declClass)

        // All three transformations should be applied
        assert(result.declared)
        assert(result.isAbstract)
        assert(result.name.value == "ChainedClass")
      }

      test("combined transformation works with parsed files") {
        val transformation1 = new TreeTransformationScopedChanges {
          override def enterTsParsedFile(t: TsTreeScope)(x: TsParsedFile): TsParsedFile =
            x.copy(
              comments = x.comments + Comment("First transformation applied"),
              directives = x.directives,
              members = x.members,
              codePath = x.codePath
            )
        }

        val transformation2 = new TreeTransformationScopedChanges {
          override def enterTsParsedFile(t: TsTreeScope)(x: TsParsedFile): TsParsedFile =
            x.copy(
              comments = x.comments + Comment("Second transformation applied"),
              directives = x.directives,
              members = x.members,
              codePath = x.codePath
            )
        }

        val combined   = transformation1.combine(transformation2)
        val scope      = TestUtils.createMockScope()
        val parsedFile = createMockParsedFile("test-lib")

        val result = combined.visitTsParsedFile(scope)(parsedFile)

        // Both comments should be added
        val comments = result.comments.rawCs
        assert(comments.contains("First transformation applied"))
        assert(comments.contains("Second transformation applied"))
      }

      test("combined transformation handles context correctly") {
        // This test verifies that the context (scope) is passed correctly to both transformations
        var firstTransformationScope: Option[TsTreeScope]  = None
        var secondTransformationScope: Option[TsTreeScope] = None

        val transformation1 = new TreeTransformationScopedChanges {
          override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass = {
            firstTransformationScope = Some(t)
            x
          }
        }

        val transformation2 = new TreeTransformationScopedChanges {
          override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass = {
            secondTransformationScope = Some(t)
            x
          }
        }

        val combined  = transformation1.combine(transformation2)
        val scope     = TestUtils.createMockScope()
        val declClass = createMockClass("TestClass")

        combined.visitTsDeclClass(scope)(declClass)

        // Both transformations should receive the same scope
        assert(firstTransformationScope.isDefined)
        assert(secondTransformationScope.isDefined)
        assert(firstTransformationScope.get eq secondTransformationScope.get)
      }
    }
  }

  // Helper methods for creating test data
  private def createMockClass(name: String): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = TsIdent(name),
      tparams = IArray.Empty,
      parent = None,
      implements = IArray.Empty,
      members = IArray.Empty,
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  private def createMockParsedFile(libName: String): TsParsedFile =
    TsParsedFile(
      comments = NoComments,
      directives = IArray.Empty,
      members = IArray.Empty,
      codePath = CodePath.NoPath
    )
}
