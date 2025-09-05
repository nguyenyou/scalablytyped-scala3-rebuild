package org.scalablytyped.converter.internal
package ts
package transforms

import utest.*

object AddCommentsTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(name: String): TsQIdent = TsQIdent.of(createSimpleIdent(name))

  def createTypeRef(name: String, tparams: IArray[TsType] = Empty): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), tparams)

  def createMockProperty(name: String, tpe: TsType = TsTypeRef.string): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(tpe),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createMockMethod(name: String): TsMemberFunction =
    TsMemberFunction(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      methodType = MethodType.Normal,
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(TsTypeRef.void)
      ),
      isStatic = false,
      isReadOnly = false
    )

  def createMockCall(): TsMemberCall =
    TsMemberCall(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = Some(TsTypeRef.void)
      )
    )

  def createMockCtor(): TsMemberCtor =
    TsMemberCtor(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      signature = TsFunSig(
        comments = NoComments,
        tparams = Empty,
        params = Empty,
        resultType = None
      )
    )

  def createMockIndex(): TsMemberIndex =
    TsMemberIndex(
      comments = NoComments,
      isReadOnly = false,
      level = TsProtectionLevel.Default,
      indexing = Indexing.Dict(createSimpleIdent("key"), TsTypeRef.string),
      valueType = Some(TsTypeRef.string)
    )

  def createMockTypeMapped(): TsMemberTypeMapped =
    TsMemberTypeMapped(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      readonly = ReadonlyModifier.Noop,
      key = createSimpleIdent("K"),
      from = TsTypeRef.string,
      as = None,
      optionalize = OptionalModifier.Noop,
      to = TsTypeRef.string
    )

  def tests = Tests {
    test("AddComments - Basic Functionality") {
      test("case class creation") {
        val newComments = Comments(Comment("test comment"))
        val addComments = AddComments(newComments)
        
        assert(addComments.newComments == newComments)
      }

      test("extends TreeTransformationUnit") {
        val newComments = Comments(Comment("test comment"))
        val addComments = AddComments(newComments)
        
        // Should be an instance of TreeTransformationUnit
        assert(addComments.isInstanceOf[TreeTransformationUnit])
      }
    }

    test("AddComments - TsMemberCall Processing") {
      test("adds comments to TsMemberCall with no existing comments") {
        val newComments = Comments(Comment("new comment"))
        val addComments = AddComments(newComments)
        val call = createMockCall()
        
        val result = addComments.enterTsMember(())(call)
        
        result match {
          case resultCall: TsMemberCall =>
            assert(resultCall.comments == newComments)
          case _ => assert(false)
        }
      }

      test("concatenates comments to TsMemberCall with existing comments") {
        val existingComments = Comments(Comment("existing"))
        val newComments = Comments(Comment("new"))
        val addComments = AddComments(newComments)
        val call = createMockCall().copy(comments = existingComments)
        
        val result = addComments.enterTsMember(())(call)
        
        result match {
          case resultCall: TsMemberCall =>
            assert(resultCall.comments.cs.size == 2)
            assert(resultCall.comments.cs.contains(Comment("existing")))
            assert(resultCall.comments.cs.contains(Comment("new")))
          case _ => assert(false)
        }
      }

      test("handles empty new comments for TsMemberCall") {
        val newComments = NoComments
        val addComments = AddComments(newComments)
        val call = createMockCall()
        
        val result = addComments.enterTsMember(())(call)
        
        result match {
          case resultCall: TsMemberCall =>
            assert(resultCall.comments == NoComments)
          case _ => assert(false)
        }
      }
    }

    test("AddComments - TsMemberCtor Processing") {
      test("adds comments to TsMemberCtor") {
        val newComments = Comments(Comment("ctor comment"))
        val addComments = AddComments(newComments)
        val ctor = createMockCtor()
        
        val result = addComments.enterTsMember(())(ctor)
        
        result match {
          case resultCtor: TsMemberCtor =>
            assert(resultCtor.comments == newComments)
          case _ => assert(false)
        }
      }

      test("concatenates comments to TsMemberCtor with existing comments") {
        val existingComments = Comments(Comment("existing ctor"))
        val newComments = Comments(Comment("new ctor"))
        val addComments = AddComments(newComments)
        val ctor = createMockCtor().copy(comments = existingComments)
        
        val result = addComments.enterTsMember(())(ctor)
        
        result match {
          case resultCtor: TsMemberCtor =>
            assert(resultCtor.comments.cs.size == 2)
            assert(resultCtor.comments.cs.contains(Comment("existing ctor")))
            assert(resultCtor.comments.cs.contains(Comment("new ctor")))
          case _ => assert(false)
        }
      }
    }

    test("AddComments - TsMemberFunction Processing") {
      test("adds comments to TsMemberFunction") {
        val newComments = Comments(Comment("function comment"))
        val addComments = AddComments(newComments)
        val function = createMockMethod("testMethod")
        
        val result = addComments.enterTsMember(())(function)
        
        result match {
          case resultFunction: TsMemberFunction =>
            assert(resultFunction.comments == newComments)
          case _ => assert(false)
        }
      }

      test("concatenates comments to TsMemberFunction with existing comments") {
        val existingComments = Comments(Comment("existing function"))
        val newComments = Comments(Comment("new function"))
        val addComments = AddComments(newComments)
        val function = createMockMethod("testMethod").copy(comments = existingComments)
        
        val result = addComments.enterTsMember(())(function)
        
        result match {
          case resultFunction: TsMemberFunction =>
            assert(resultFunction.comments.cs.size == 2)
            assert(resultFunction.comments.cs.contains(Comment("existing function")))
            assert(resultFunction.comments.cs.contains(Comment("new function")))
          case _ => assert(false)
        }
      }
    }

    test("AddComments - TsMemberIndex Processing") {
      test("adds comments to TsMemberIndex") {
        val newComments = Comments(Comment("index comment"))
        val addComments = AddComments(newComments)
        val index = createMockIndex()
        
        val result = addComments.enterTsMember(())(index)
        
        result match {
          case resultIndex: TsMemberIndex =>
            assert(resultIndex.comments == newComments)
          case _ => assert(false)
        }
      }

      test("concatenates comments to TsMemberIndex with existing comments") {
        val existingComments = Comments(Comment("existing index"))
        val newComments = Comments(Comment("new index"))
        val addComments = AddComments(newComments)
        val index = createMockIndex().copy(comments = existingComments)
        
        val result = addComments.enterTsMember(())(index)
        
        result match {
          case resultIndex: TsMemberIndex =>
            assert(resultIndex.comments.cs.size == 2)
            assert(resultIndex.comments.cs.contains(Comment("existing index")))
            assert(resultIndex.comments.cs.contains(Comment("new index")))
          case _ => assert(false)
        }
      }
    }

    test("AddComments - TsMemberTypeMapped Processing") {
      test("adds comments to TsMemberTypeMapped") {
        val newComments = Comments(Comment("mapped comment"))
        val addComments = AddComments(newComments)
        val mapped = createMockTypeMapped()
        
        val result = addComments.enterTsMember(())(mapped)
        
        result match {
          case resultMapped: TsMemberTypeMapped =>
            assert(resultMapped.comments == newComments)
          case _ => assert(false)
        }
      }

      test("concatenates comments to TsMemberTypeMapped with existing comments") {
        val existingComments = Comments(Comment("existing mapped"))
        val newComments = Comments(Comment("new mapped"))
        val addComments = AddComments(newComments)
        val mapped = createMockTypeMapped().copy(comments = existingComments)
        
        val result = addComments.enterTsMember(())(mapped)
        
        result match {
          case resultMapped: TsMemberTypeMapped =>
            assert(resultMapped.comments.cs.size == 2)
            assert(resultMapped.comments.cs.contains(Comment("existing mapped")))
            assert(resultMapped.comments.cs.contains(Comment("new mapped")))
          case _ => assert(false)
        }
      }
    }

    test("AddComments - TsMemberProperty Processing") {
      test("adds comments to TsMemberProperty") {
        val newComments = Comments(Comment("property comment"))
        val addComments = AddComments(newComments)
        val property = createMockProperty("testProp")
        
        val result = addComments.enterTsMember(())(property)
        
        result match {
          case resultProperty: TsMemberProperty =>
            assert(resultProperty.comments == newComments)
          case _ => assert(false)
        }
      }

      test("concatenates comments to TsMemberProperty with existing comments") {
        val existingComments = Comments(Comment("existing property"))
        val newComments = Comments(Comment("new property"))
        val addComments = AddComments(newComments)
        val property = createMockProperty("testProp").copy(comments = existingComments)
        
        val result = addComments.enterTsMember(())(property)
        
        result match {
          case resultProperty: TsMemberProperty =>
            assert(resultProperty.comments.cs.size == 2)
            assert(resultProperty.comments.cs.contains(Comment("existing property")))
            assert(resultProperty.comments.cs.contains(Comment("new property")))
          case _ => assert(false)
        }
      }
    }

    test("AddComments - Edge Cases and Error Handling") {
      test("handles multiple comments in newComments") {
        val comment1 = Comment("comment 1")
        val comment2 = Comment("comment 2")
        val comment3 = Comment("comment 3")
        val newComments = Comments(List(comment1, comment2, comment3))
        val addComments = AddComments(newComments)
        val property = createMockProperty("testProp")

        val result = addComments.enterTsMember(())(property)

        result match {
          case resultProperty: TsMemberProperty =>
            assert(resultProperty.comments.cs.size == 3)
            assert(resultProperty.comments.cs.contains(comment1))
            assert(resultProperty.comments.cs.contains(comment2))
            assert(resultProperty.comments.cs.contains(comment3))
          case _ => assert(false)
        }
      }

      test("preserves order when concatenating comments") {
        val existingComment = Comment("existing")
        val newComment1 = Comment("new1")
        val newComment2 = Comment("new2")
        val existingComments = Comments(existingComment)
        val newComments = Comments(List(newComment1, newComment2))
        val addComments = AddComments(newComments)
        val function = createMockMethod("testMethod").copy(comments = existingComments)

        val result = addComments.enterTsMember(())(function)

        result match {
          case resultFunction: TsMemberFunction =>
            assert(resultFunction.comments.cs.size == 3)
            assert(resultFunction.comments.cs(0) == existingComment)
            assert(resultFunction.comments.cs(1) == newComment1)
            assert(resultFunction.comments.cs(2) == newComment2)
          case _ => assert(false)
        }
      }

      test("handles complex comment types") {
        val rawComment = Comment.Raw("raw comment")
        val markerComment = Marker.NameHint("hint")
        val newComments = Comments(List(rawComment, markerComment))
        val addComments = AddComments(newComments)
        val call = createMockCall()

        val result = addComments.enterTsMember(())(call)

        result match {
          case resultCall: TsMemberCall =>
            assert(resultCall.comments.cs.size == 2)
            assert(resultCall.comments.cs.contains(rawComment))
            assert(resultCall.comments.cs.contains(markerComment))
          case _ => assert(false)
        }
      }

      test("works with all member types in sequence") {
        val newComments = Comments(Comment("universal comment"))
        val addComments = AddComments(newComments)

        val call = createMockCall()
        val ctor = createMockCtor()
        val function = createMockMethod("test")
        val index = createMockIndex()
        val mapped = createMockTypeMapped()
        val property = createMockProperty("test")

        val members = List(call, ctor, function, index, mapped, property)
        val results = members.map(addComments.enterTsMember(()))

        results.foreach {
          case member: TsMemberCall => assert(member.comments == newComments)
          case member: TsMemberCtor => assert(member.comments == newComments)
          case member: TsMemberFunction => assert(member.comments == newComments)
          case member: TsMemberIndex => assert(member.comments == newComments)
          case member: TsMemberTypeMapped => assert(member.comments == newComments)
          case member: TsMemberProperty => assert(member.comments == newComments)
          case _ => assert(false)
        }
      }

      test("maintains other properties unchanged") {
        val newComments = Comments(Comment("test"))
        val addComments = AddComments(newComments)
        val originalProperty = createMockProperty("testProp", TsTypeRef.number)
          .copy(
            level = TsProtectionLevel.Private,
            isStatic = true,
            isReadOnly = true
          )

        val result = addComments.enterTsMember(())(originalProperty)

        result match {
          case resultProperty: TsMemberProperty =>
            assert(resultProperty.comments == newComments)
            assert(resultProperty.name == originalProperty.name)
            assert(resultProperty.tpe == originalProperty.tpe)
            assert(resultProperty.level == TsProtectionLevel.Private)
            assert(resultProperty.isStatic)
            assert(resultProperty.isReadOnly)
          case _ => assert(false)
        }
      }

      test("handles very large comment collections") {
        val largeCommentList = (1 to 100).map(i => Comment(s"comment $i")).toList
        val newComments = Comments(largeCommentList)
        val addComments = AddComments(newComments)
        val property = createMockProperty("testProp")

        val result = addComments.enterTsMember(())(property)

        result match {
          case resultProperty: TsMemberProperty =>
            assert(resultProperty.comments.cs.size == 100)
            assert(resultProperty.comments.cs.forall(c => largeCommentList.contains(c)))
          case _ => assert(false)
        }
      }
    }

    test("AddComments - Integration and Real-World Scenarios") {
      test("integration with TreeTransformation workflow") {
        val newComments = Comments(Comment("integration test"))
        val addComments = AddComments(newComments)

        // Test that it can be used as a TreeTransformationUnit
        val transformation: TreeTransformationUnit = addComments
        assert(transformation != null)
      }

      test("realistic comment addition scenario") {
        val docComment = Comment.Raw("/** This is a documented property */")
        val deprecationComment = Marker.NameHint("deprecated")
        val newComments = Comments(List(docComment, deprecationComment))
        val addComments = AddComments(newComments)

        val property = createMockProperty("legacyProperty", TsTypeRef.string)
          .copy(comments = Comments(Comment("existing comment")))

        val result = addComments.enterTsMember(())(property)

        result match {
          case resultProperty: TsMemberProperty =>
            assert(resultProperty.comments.cs.size == 3)
            assert(resultProperty.comments.cs.contains(Comment("existing comment")))
            assert(resultProperty.comments.cs.contains(docComment))
            assert(resultProperty.comments.cs.contains(deprecationComment))
          case _ => assert(false)
        }
      }

      test("performance with many member transformations") {
        val newComments = Comments(Comment("performance test"))
        val addComments = AddComments(newComments)

        // Create many members
        val properties = (1 to 1000).map(i => createMockProperty(s"prop$i"))

        // Transform all of them
        val results = properties.map(addComments.enterTsMember(()))

        // Verify all were transformed correctly
        assert(results.size == 1000)
        results.foreach {
          case property: TsMemberProperty =>
            assert(property.comments == newComments)
          case _ => assert(false)
        }
      }
    }
  }
}