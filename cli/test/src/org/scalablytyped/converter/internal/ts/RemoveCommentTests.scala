package org.scalablytyped.converter.internal
package ts

import utest.*

object RemoveCommentTests extends TestSuite {

  // Helper methods for creating test data with comments
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createCommentsWithRaw(raw: String): Comments = Comments(Comment.Raw(raw))

  def createCommentsWithMultiple(raws: String*): Comments =
    Comments(raws.map(Comment.Raw.apply).toList)

  def createMockFunSig(): TsFunSig =
    TsFunSig(
      comments = NoComments,
      tparams = IArray.Empty,
      params = IArray.Empty,
      resultType = Some(TsTypeRef.any)
    )

  def createMockMemberFunction(name: String, comments: Comments = NoComments): TsMemberFunction =
    TsMemberFunction(
      comments = comments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = createMockFunSig(),
      isStatic = false,
      isReadOnly = false
    )

  def createMockMemberCall(comments: Comments = NoComments): TsMemberCall =
    TsMemberCall(
      comments = comments,
      level = TsProtectionLevel.Default,
      signature = createMockFunSig()
    )

  def createMockMemberCtor(comments: Comments = NoComments): TsMemberCtor =
    TsMemberCtor(
      comments = comments,
      level = TsProtectionLevel.Default,
      signature = createMockFunSig()
    )

  def createMockDeclFunction(name: String, comments: Comments = NoComments): TsDeclFunction =
    TsDeclFunction(
      comments = comments,
      declared = false,
      name = createSimpleIdent(name),
      signature = createMockFunSig(),
      jsLocation = JsLocation.Zero,
      codePath = CodePath.NoPath
    )

  def tests = Tests {
    test("RemoveComment trait - Basic Functionality") {
      test("remove method exists for all supported types") {
        // Test that implicit instances exist for all supported types
        val memberFunction = createMockMemberFunction("test", createCommentsWithRaw("test comment"))
        val memberCall = createMockMemberCall(createCommentsWithRaw("call comment"))
        val memberCtor = createMockMemberCtor(createCommentsWithRaw("ctor comment"))
        val declFunction = createMockDeclFunction("testFunc", createCommentsWithRaw("func comment"))

        // These should compile without errors, proving the implicit instances exist
        val removedFunction = implicitly[RemoveComment[TsMemberFunction]].remove(memberFunction)
        val removedCall = implicitly[RemoveComment[TsMemberCall]].remove(memberCall)
        val removedCtor = implicitly[RemoveComment[TsMemberCtor]].remove(memberCtor)
        val removedDecl = implicitly[RemoveComment[TsDeclFunction]].remove(declFunction)

        // Verify comments are removed
        assert(removedFunction.comments == NoComments)
        assert(removedCall.comments == NoComments)
        assert(removedCtor.comments == NoComments)
        assert(removedDecl.comments == NoComments)
      }
    }

    test("TsMemberFunction - Comment Removal") {
      test("removes single comment") {
        val originalComments = createCommentsWithRaw("This is a test comment")
        val memberFunction = createMockMemberFunction("testMethod", originalComments)

        assert(memberFunction.comments == originalComments)
        assert(memberFunction.comments.nonEmpty)

        val removed = RemoveComment.r1.remove(memberFunction)

        assert(removed.comments == NoComments)
        assert(removed.comments.isEmpty)
        // Verify other properties are preserved
        assert(removed.name == memberFunction.name)
        assert(removed.level == memberFunction.level)
        assert(removed.methodType == memberFunction.methodType)
        assert(removed.signature == memberFunction.signature)
        assert(removed.isStatic == memberFunction.isStatic)
        assert(removed.isReadOnly == memberFunction.isReadOnly)
      }

      test("removes multiple comments") {
        val originalComments = createCommentsWithMultiple("Comment 1", "Comment 2", "Comment 3")
        val memberFunction = createMockMemberFunction("testMethod", originalComments)

        assert(memberFunction.comments.nonEmpty)
        assert(memberFunction.comments.cs.length == 3)

        val removed = RemoveComment.r1.remove(memberFunction)

        assert(removed.comments == NoComments)
        assert(removed.comments.isEmpty)
      }

      test("handles already empty comments") {
        val memberFunction = createMockMemberFunction("testMethod", NoComments)

        assert(memberFunction.comments == NoComments)

        val removed = RemoveComment.r1.remove(memberFunction)

        assert(removed.comments == NoComments)
        // Should be the same object or equivalent
        assert(removed.name == memberFunction.name)
      }
    }

    test("TsMemberCall - Comment Removal") {
      test("removes single comment") {
        val originalComments = createCommentsWithRaw("Call signature comment")
        val memberCall = createMockMemberCall(originalComments)

        assert(memberCall.comments == originalComments)
        assert(memberCall.comments.nonEmpty)

        val removed = RemoveComment.r2.remove(memberCall)

        assert(removed.comments == NoComments)
        assert(removed.comments.isEmpty)
        // Verify other properties are preserved
        assert(removed.level == memberCall.level)
        assert(removed.signature == memberCall.signature)
      }

      test("removes multiple comments") {
        val originalComments = createCommentsWithMultiple("Call comment 1", "Call comment 2")
        val memberCall = createMockMemberCall(originalComments)

        assert(memberCall.comments.nonEmpty)
        assert(memberCall.comments.cs.length == 2)

        val removed = RemoveComment.r2.remove(memberCall)

        assert(removed.comments == NoComments)
        assert(removed.comments.isEmpty)
      }

      test("handles already empty comments") {
        val memberCall = createMockMemberCall(NoComments)

        assert(memberCall.comments == NoComments)

        val removed = RemoveComment.r2.remove(memberCall)

        assert(removed.comments == NoComments)
        assert(removed.level == memberCall.level)
      }
    }

    test("TsMemberCtor - Comment Removal") {
      test("removes single comment") {
        val originalComments = createCommentsWithRaw("Constructor signature comment")
        val memberCtor = createMockMemberCtor(originalComments)

        assert(memberCtor.comments == originalComments)
        assert(memberCtor.comments.nonEmpty)

        val removed = RemoveComment.r0.remove(memberCtor)

        assert(removed.comments == NoComments)
        assert(removed.comments.isEmpty)
        // Verify other properties are preserved
        assert(removed.level == memberCtor.level)
        assert(removed.signature == memberCtor.signature)
      }

      test("removes multiple comments") {
        val originalComments = createCommentsWithMultiple("Ctor comment 1", "Ctor comment 2", "Ctor comment 3")
        val memberCtor = createMockMemberCtor(originalComments)

        assert(memberCtor.comments.nonEmpty)
        assert(memberCtor.comments.cs.length == 3)

        val removed = RemoveComment.r0.remove(memberCtor)

        assert(removed.comments == NoComments)
        assert(removed.comments.isEmpty)
      }

      test("handles already empty comments") {
        val memberCtor = createMockMemberCtor(NoComments)

        assert(memberCtor.comments == NoComments)

        val removed = RemoveComment.r0.remove(memberCtor)

        assert(removed.comments == NoComments)
        assert(removed.level == memberCtor.level)
      }
    }

    test("TsDeclFunction - Comment Removal") {
      test("removes single comment") {
        val originalComments = createCommentsWithRaw("Function declaration comment")
        val declFunction = createMockDeclFunction("testFunc", originalComments)

        assert(declFunction.comments == originalComments)
        assert(declFunction.comments.nonEmpty)

        val removed = RemoveComment.r3.remove(declFunction)

        assert(removed.comments == NoComments)
        assert(removed.comments.isEmpty)
        // Verify other properties are preserved
        assert(removed.name == declFunction.name)
        assert(removed.declared == declFunction.declared)
        assert(removed.signature == declFunction.signature)
        assert(removed.jsLocation == declFunction.jsLocation)
        assert(removed.codePath == declFunction.codePath)
      }

      test("removes multiple comments") {
        val originalComments = createCommentsWithMultiple("Func comment 1", "Func comment 2")
        val declFunction = createMockDeclFunction("testFunc", originalComments)

        assert(declFunction.comments.nonEmpty)
        assert(declFunction.comments.cs.length == 2)

        val removed = RemoveComment.r3.remove(declFunction)

        assert(removed.comments == NoComments)
        assert(removed.comments.isEmpty)
      }

      test("handles already empty comments") {
        val declFunction = createMockDeclFunction("testFunc", NoComments)

        assert(declFunction.comments == NoComments)

        val removed = RemoveComment.r3.remove(declFunction)

        assert(removed.comments == NoComments)
        assert(removed.name == declFunction.name)
      }

      test("preserves declared flag") {
        val declaredFunction = TsDeclFunction(
          comments = createCommentsWithRaw("Declared function comment"),
          declared = true,
          name = createSimpleIdent("declaredFunc"),
          signature = createMockFunSig(),
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )

        assert(declaredFunction.declared == true)

        val removed = RemoveComment.r3.remove(declaredFunction)

        assert(removed.comments == NoComments)
        assert(removed.declared == true)
      }
    }

    test("keepFirstOnly method - Basic Functionality") {
      test("empty array returns empty array") {
        val emptyArray: IArray[TsMemberFunction] = IArray.Empty
        val result = RemoveComment.keepFirstOnly(emptyArray)

        assert(result.isEmpty)
        assert(result.length == 0)
      }

      test("single element array preserves comments") {
        val singleFunction = createMockMemberFunction("single", createCommentsWithRaw("Keep this comment"))
        val array = IArray(singleFunction)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result.length == 1)
        assert(result(0).comments == singleFunction.comments)
        assert(result(0).comments.nonEmpty)
        assert(result(0).name == singleFunction.name)
      }

      test("multiple elements - first keeps comments, rest lose comments") {
        val func1 = createMockMemberFunction("first", createCommentsWithRaw("Keep this comment"))
        val func2 = createMockMemberFunction("second", createCommentsWithRaw("Remove this comment"))
        val func3 = createMockMemberFunction("third", createCommentsWithRaw("Remove this too"))
        val array = IArray(func1, func2, func3)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result.length == 3)

        // First element should keep its comments
        assert(result(0).comments == func1.comments)
        assert(result(0).comments.nonEmpty)
        assert(result(0).name == func1.name)

        // Second and third elements should have comments removed
        assert(result(1).comments == NoComments)
        assert(result(1).comments.isEmpty)
        assert(result(1).name == func2.name)

        assert(result(2).comments == NoComments)
        assert(result(2).comments.isEmpty)
        assert(result(2).name == func3.name)
      }

      test("works with TsMemberCall") {
        val call1 = createMockMemberCall(createCommentsWithRaw("Keep this call comment"))
        val call2 = createMockMemberCall(createCommentsWithRaw("Remove this call comment"))
        val array = IArray(call1, call2)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result.length == 2)
        assert(result(0).comments == call1.comments)
        assert(result(0).comments.nonEmpty)
        assert(result(1).comments == NoComments)
        assert(result(1).comments.isEmpty)
      }

      test("works with TsMemberCtor") {
        val ctor1 = createMockMemberCtor(createCommentsWithRaw("Keep this ctor comment"))
        val ctor2 = createMockMemberCtor(createCommentsWithRaw("Remove this ctor comment"))
        val ctor3 = createMockMemberCtor(createCommentsWithRaw("Remove this ctor comment too"))
        val array = IArray(ctor1, ctor2, ctor3)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result.length == 3)
        assert(result(0).comments == ctor1.comments)
        assert(result(0).comments.nonEmpty)
        assert(result(1).comments == NoComments)
        assert(result(2).comments == NoComments)
      }

      test("works with TsDeclFunction") {
        val decl1 = createMockDeclFunction("first", createCommentsWithRaw("Keep this decl comment"))
        val decl2 = createMockDeclFunction("second", createCommentsWithRaw("Remove this decl comment"))
        val array = IArray(decl1, decl2)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result.length == 2)
        assert(result(0).comments == decl1.comments)
        assert(result(0).comments.nonEmpty)
        assert(result(0).name == decl1.name)
        assert(result(1).comments == NoComments)
        assert(result(1).comments.isEmpty)
        assert(result(1).name == decl2.name)
      }
    }

    test("keepFirstOnly method - Edge Cases and Boundary Conditions") {
      test("first element has no comments, others have comments") {
        val func1 = createMockMemberFunction("first", NoComments)
        val func2 = createMockMemberFunction("second", createCommentsWithRaw("This will be removed"))
        val func3 = createMockMemberFunction("third", createCommentsWithRaw("This will also be removed"))
        val array = IArray(func1, func2, func3)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result.length == 3)
        // First element should keep its (empty) comments
        assert(result(0).comments == NoComments)
        assert(result(0).comments.isEmpty)
        // Others should have comments removed
        assert(result(1).comments == NoComments)
        assert(result(2).comments == NoComments)
      }

      test("all elements have no comments") {
        val func1 = createMockMemberFunction("first", NoComments)
        val func2 = createMockMemberFunction("second", NoComments)
        val array = IArray(func1, func2)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result.length == 2)
        assert(result(0).comments == NoComments)
        assert(result(1).comments == NoComments)
      }

      test("preserves order of elements") {
        val func1 = createMockMemberFunction("alpha", createCommentsWithRaw("Keep"))
        val func2 = createMockMemberFunction("beta", createCommentsWithRaw("Remove"))
        val func3 = createMockMemberFunction("gamma", createCommentsWithRaw("Remove"))
        val func4 = createMockMemberFunction("delta", createCommentsWithRaw("Remove"))
        val array = IArray(func1, func2, func3, func4)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result.length == 4)
        assert(result(0).name.value == "alpha")
        assert(result(1).name.value == "beta")
        assert(result(2).name.value == "gamma")
        assert(result(3).name.value == "delta")

        // Only first should have comments
        assert(result(0).comments.nonEmpty)
        assert(result(1).comments.isEmpty)
        assert(result(2).comments.isEmpty)
        assert(result(3).comments.isEmpty)
      }

      test("handles large arrays efficiently") {
        val functions = (1 to 100).map { i =>
          createMockMemberFunction(s"func$i", createCommentsWithRaw(s"Comment $i"))
        }.toArray
        val array = IArray.fromArray(functions)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result.length == 100)
        // First element keeps comments
        assert(result(0).comments.nonEmpty)
        assert(result(0).name.value == "func1")

        // All others lose comments
        for (i <- 1 until 100) {
          assert(result(i).comments.isEmpty)
          assert(result(i).name.value == s"func${i + 1}")
        }
      }

      test("mixed types with first element having multiple comments") {
        val multipleComments = createCommentsWithMultiple("Comment 1", "Comment 2", "Comment 3")
        val func1 = createMockMemberFunction("first", multipleComments)
        val func2 = createMockMemberFunction("second", createCommentsWithRaw("Single comment"))
        val array = IArray(func1, func2)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result.length == 2)
        assert(result(0).comments == multipleComments)
        assert(result(0).comments.cs.length == 3)
        assert(result(1).comments == NoComments)
        assert(result(1).comments.isEmpty)
      }
    }

    test("Integration Tests - Real-world Scenarios") {
      test("processing overloaded functions") {
        // Simulate overloaded functions where only the first should keep documentation
        val overload1 = createMockDeclFunction("process", createCommentsWithRaw("Main documentation for process function"))
        val overload2 = createMockDeclFunction("process", createCommentsWithRaw("Overload 1 documentation"))
        val overload3 = createMockDeclFunction("process", createCommentsWithRaw("Overload 2 documentation"))
        val overloads = IArray(overload1, overload2, overload3)

        val result = RemoveComment.keepFirstOnly(overloads)

        assert(result.length == 3)
        assert(result(0).comments.nonEmpty)
        assert(result(0).comments.rawCs.head == "Main documentation for process function")
        assert(result(1).comments.isEmpty)
        assert(result(2).comments.isEmpty)

        // All should have the same name
        assert(result.forall(_.name.value == "process"))
      }

      test("processing constructor overloads") {
        val ctor1 = createMockMemberCtor(createCommentsWithRaw("Primary constructor documentation"))
        val ctor2 = createMockMemberCtor(createCommentsWithRaw("Alternative constructor"))
        val ctors = IArray(ctor1, ctor2)

        val result = RemoveComment.keepFirstOnly(ctors)

        assert(result.length == 2)
        assert(result(0).comments.nonEmpty)
        assert(result(0).comments.rawCs.head == "Primary constructor documentation")
        assert(result(1).comments.isEmpty)
      }

      test("processing call signatures") {
        val call1 = createMockMemberCall(createCommentsWithRaw("Primary call signature"))
        val call2 = createMockMemberCall(createCommentsWithRaw("Alternative call signature"))
        val call3 = createMockMemberCall(createCommentsWithRaw("Third call signature"))
        val calls = IArray(call1, call2, call3)

        val result = RemoveComment.keepFirstOnly(calls)

        assert(result.length == 3)
        assert(result(0).comments.nonEmpty)
        assert(result(1).comments.isEmpty)
        assert(result(2).comments.isEmpty)
      }

      test("type consistency - keepFirstOnly works with homogeneous arrays") {
        // Test that keepFirstOnly requires all elements to be of the same type
        // This is a design constraint of the method due to the type parameter requirement

        // Test with all TsMemberFunction
        val func1 = createMockMemberFunction("method1", createCommentsWithRaw("Method comment 1"))
        val func2 = createMockMemberFunction("method2", createCommentsWithRaw("Method comment 2"))
        val func3 = createMockMemberFunction("method3", createCommentsWithRaw("Method comment 3"))
        val functions = IArray(func1, func2, func3)
        val resultFunctions = RemoveComment.keepFirstOnly(functions)

        assert(resultFunctions.length == 3)
        assert(resultFunctions(0).comments.nonEmpty)
        assert(resultFunctions(1).comments.isEmpty)
        assert(resultFunctions(2).comments.isEmpty)

        // Test with all TsMemberCall
        val call1 = createMockMemberCall(createCommentsWithRaw("Call comment 1"))
        val call2 = createMockMemberCall(createCommentsWithRaw("Call comment 2"))
        val calls = IArray(call1, call2)
        val resultCalls = RemoveComment.keepFirstOnly(calls)

        assert(resultCalls.length == 2)
        assert(resultCalls(0).comments.nonEmpty)
        assert(resultCalls(1).comments.isEmpty)

        // Test with all TsMemberCtor
        val ctor1 = createMockMemberCtor(createCommentsWithRaw("Ctor comment 1"))
        val ctor2 = createMockMemberCtor(createCommentsWithRaw("Ctor comment 2"))
        val ctors = IArray(ctor1, ctor2)
        val resultCtors = RemoveComment.keepFirstOnly(ctors)

        assert(resultCtors.length == 2)
        assert(resultCtors(0).comments.nonEmpty)
        assert(resultCtors(1).comments.isEmpty)
      }
    }

    test("Comment Content Preservation") {
      test("preserves exact comment content in first element") {
        val originalComment = "This is a very specific comment with special characters: @param {string} name - The name parameter"
        val func1 = createMockMemberFunction("test", createCommentsWithRaw(originalComment))
        val func2 = createMockMemberFunction("test2", createCommentsWithRaw("This will be removed"))
        val array = IArray(func1, func2)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result(0).comments.rawCs.head == originalComment)
        assert(result(1).comments.rawCs.isEmpty)
      }

      test("preserves multiple comments in first element") {
        val comment1 = "First comment"
        val comment2 = "Second comment"
        val comment3 = "Third comment"
        val multiComments = createCommentsWithMultiple(comment1, comment2, comment3)
        val func1 = createMockMemberFunction("test", multiComments)
        val func2 = createMockMemberFunction("test2", createCommentsWithRaw("Remove this"))
        val array = IArray(func1, func2)

        val result = RemoveComment.keepFirstOnly(array)

        assert(result(0).comments.rawCs.length == 3)
        assert(result(0).comments.rawCs.contains(comment1))
        assert(result(0).comments.rawCs.contains(comment2))
        assert(result(0).comments.rawCs.contains(comment3))
        assert(result(1).comments.rawCs.isEmpty)
      }
    }
  }
}