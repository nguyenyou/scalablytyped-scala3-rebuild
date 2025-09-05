package org.scalablytyped.converter.internal
package ts

import org.scalablytyped.converter.internal.logging.Logger
import utest.*

object TreeTransformationTests extends TestSuite {
  def tests = Tests {
    test("TreeTransformation Basic Functionality") {
      test("withTree method") {
        test("TreeTransformationScopedChanges withTree adds tree to scope") {
          val transformation = new TreeTransformationScopedChanges {
            override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass = x
          }
          val rootScope = TsTreeScope(
            TsIdentLibrarySimple("test"),
            pedantic = false,
            deps = Map.empty,
            logger = Logger.DevNull
          )
          val tree = TsDeclClass(
            comments = NoComments,
            declared = false,
            isAbstract = false,
            name = TsIdent("TestClass"),
            tparams = IArray.Empty,
            parent = None,
            implements = IArray.Empty,
            members = IArray.Empty,
            jsLocation = JsLocation.Zero,
            codePath = CodePath.NoPath
          )

          val newScope = transformation.withTree(rootScope, tree)
          assert(newScope != rootScope)
          assert(newScope.stack.nonEmpty)
        }

        test("TreeTransformationUnit withTree returns unit") {
          val transformation = new TreeTransformationUnit {
            override def enterTsDeclClass(t: Unit)(x: TsDeclClass): TsDeclClass = x
          }
          val tree = TsDeclClass(
            comments = NoComments,
            declared = false,
            isAbstract = false,
            name = TsIdent("TestClass"),
            tparams = IArray.Empty,
            parent = None,
            implements = IArray.Empty,
            members = IArray.Empty,
            jsLocation = JsLocation.Zero,
            codePath = CodePath.NoPath
          )

          val result = transformation.withTree((), tree)
          assert(result == ())
        }
      }

      test("default enter methods return unchanged objects") {
        val transformation = new TreeTransformationScopedChanges {}
        val scope = TsTreeScope(
          TsIdentLibrarySimple("test"),
          pedantic = false,
          deps = Map.empty,
          logger = Logger.DevNull
        )

        test("enterTsTree returns unchanged") {
          val tree = TsIdent("test")
          val result = transformation.enterTsTree(scope)(tree)
          assert(result == tree)
        }

        test("enterTsDecl returns unchanged") {
          val decl = TsDeclClass(
            comments = NoComments,
            declared = false,
            isAbstract = false,
            name = TsIdent("TestClass"),
            tparams = IArray.Empty,
            parent = None,
            implements = IArray.Empty,
            members = IArray.Empty,
            jsLocation = JsLocation.Zero,
            codePath = CodePath.NoPath
          )
          val result = transformation.enterTsDecl(scope)(decl)
          assert(result == decl)
        }

        test("enterTsType returns unchanged") {
          val typeRef = TsTypeRef.string
          val result = transformation.enterTsType(scope)(typeRef)
          assert(result == typeRef)
        }

        test("enterTsContainer returns unchanged") {
          val global = TsGlobal(
            comments = NoComments,
            declared = false,
            members = IArray.Empty,
            codePath = CodePath.NoPath
          )
          val result = transformation.enterTsContainer(scope)(global)
          assert(result == global)
        }
      }

      test("default leave methods return unchanged objects") {
        val transformation = new TreeTransformationScopedChanges {}
        val scope = TsTreeScope(
          TsIdentLibrarySimple("test"),
          pedantic = false,
          deps = Map.empty,
          logger = Logger.DevNull
        )

        test("leaveTsParsedFile returns unchanged") {
          val parsedFile = TsParsedFile(
            comments = NoComments,
            directives = IArray.Empty,
            members = IArray.Empty,
            codePath = CodePath.NoPath
          )
          val result = transformation.leaveTsParsedFile(scope)(parsedFile)
          assert(result == parsedFile)
        }

        test("leaveTsDeclClass returns unchanged") {
          val declClass = TsDeclClass(
            comments = NoComments,
            declared = false,
            isAbstract = false,
            name = TsIdent("TestClass"),
            tparams = IArray.Empty,
            parent = None,
            implements = IArray.Empty,
            members = IArray.Empty,
            jsLocation = JsLocation.Zero,
            codePath = CodePath.NoPath
          )
          val result = transformation.leaveTsDeclClass(scope)(declClass)
          assert(result == declClass)
        }

        test("leaveTsType returns unchanged") {
          val typeRef = TsTypeRef.number
          val result = transformation.leaveTsType(scope)(typeRef)
          assert(result == typeRef)
        }
      }
    }

    test("TreeTransformation Visit Methods") {
      test("visitTsTree dispatches to correct visit method") {
        val transformation = new TreeTransformationScopedChanges {}
        val scope = TsTreeScope(
          TsIdentLibrarySimple("test"),
          pedantic = false,
          deps = Map.empty,
          logger = Logger.DevNull
        )

        test("dispatches TsDeclClass to visitTsContainerOrDecl") {
          val declClass = TsDeclClass(
            comments = NoComments,
            declared = false,
            isAbstract = false,
            name = TsIdent("TestClass"),
            tparams = IArray.Empty,
            parent = None,
            implements = IArray.Empty,
            members = IArray.Empty,
            jsLocation = JsLocation.Zero,
            codePath = CodePath.NoPath
          )
          val result = transformation.visitTsTree(scope)(declClass)
          assert(result.isInstanceOf[TsDeclClass])
        }

        test("dispatches TsTypeRef to visitTsType") {
          val typeRef = TsTypeRef.string
          val result = transformation.visitTsTree(scope)(typeRef)
          assert(result == typeRef)
        }

        test("dispatches TsTypeRef to visitTsType correctly") {
          val typeRef = TsTypeRef.boolean
          val result = transformation.visitTsTree(scope)(typeRef)
          assert(result == typeRef)
        }
      }

      test("visitTsDeclClass processes class declaration") {
        val transformation = new TreeTransformationScopedChanges {
          override def enterTsDeclClass(t: TsTreeScope)(x: TsDeclClass): TsDeclClass =
            x.copy(name = TsIdent("ModifiedClass"))
        }
        val scope = TsTreeScope(
          TsIdentLibrarySimple("test"),
          pedantic = false,
          deps = Map.empty,
          logger = Logger.DevNull
        )
        val declClass = TsDeclClass(
          comments = NoComments,
          declared = false,
          isAbstract = false,
          name = TsIdent("OriginalClass"),
          tparams = IArray.Empty,
          parent = None,
          implements = IArray.Empty,
          members = IArray.Empty,
          jsLocation = JsLocation.Zero,
          codePath = CodePath.NoPath
        )

        val result = transformation.visitTsDeclClass(scope)(declClass)
        assert(result.name.value == "ModifiedClass")
      }

      test("visitTsDeclInterface processes interface declaration") {
        val transformation = new TreeTransformationScopedChanges {
          override def enterTsDeclInterface(t: TsTreeScope)(x: TsDeclInterface): TsDeclInterface =
            x.copy(name = TsIdent("ModifiedInterface"))
        }
        val scope = TsTreeScope(
          TsIdentLibrarySimple("test"),
          pedantic = false,
          deps = Map.empty,
          logger = Logger.DevNull
        )
        val declInterface = TsDeclInterface(
          comments = NoComments,
          declared = false,
          name = TsIdent("OriginalInterface"),
          tparams = IArray.Empty,
          inheritance = IArray.Empty,
          members = IArray.Empty,
          codePath = CodePath.NoPath
        )

        val result = transformation.visitTsDeclInterface(scope)(declInterface)
        assert(result.name.value == "ModifiedInterface")
      }

      test("visitTsGlobal processes global declaration") {
        val transformation = new TreeTransformationScopedChanges {
          override def enterTsGlobal(t: TsTreeScope)(x: TsGlobal): TsGlobal =
            x.copy(declared = true)
        }
        val scope = TsTreeScope(
          TsIdentLibrarySimple("test"),
          pedantic = false,
          deps = Map.empty,
          logger = Logger.DevNull
        )
        val global = TsGlobal(
          comments = NoComments,
          declared = false,
          members = IArray.Empty,
          codePath = CodePath.NoPath
        )

        val result = transformation.visitTsDeclGlobal(scope)(global)
        assert(result.declared)
      }

      test("visitTsParsedFile processes parsed file") {
        val transformation = new TreeTransformationScopedChanges {}
        val scope = TsTreeScope(
          TsIdentLibrarySimple("test"),
          pedantic = false,
          deps = Map.empty,
          logger = Logger.DevNull
        )
        val parsedFile = TsParsedFile(
          comments = NoComments,
          directives = IArray.Empty,
          members = IArray.Empty,
          codePath = CodePath.NoPath
        )

        val result = transformation.visitTsParsedFile(scope)(parsedFile)
        assert(result == parsedFile)
      }
    }
  }
}