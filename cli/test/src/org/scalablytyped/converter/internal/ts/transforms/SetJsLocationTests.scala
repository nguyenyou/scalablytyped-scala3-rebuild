package org.scalablytyped.converter.internal
package ts
package transforms

import utest.*

object SetJsLocationTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromTraversable(parts.map(createSimpleIdent)))

  def createModuleIdent(name: String): TsIdentModule = TsIdentModule(None, List(name))

  def createMockClass(
    name: String,
    jsLocation: JsLocation = JsLocation.Zero,
    members: IArray[TsMember] = Empty
  ): TsDeclClass =
    TsDeclClass(
      comments = NoComments,
      declared = false,
      isAbstract = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      parent = None,
      implements = Empty,
      members = members,
      jsLocation = jsLocation,
      codePath = CodePath.NoPath
    )

  def createMockInterface(
    name: String,
    jsLocation: JsLocation = JsLocation.Zero
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = Empty,
      members = Empty,
      codePath = CodePath.NoPath
    )

  def createMockFunction(
    name: String,
    jsLocation: JsLocation = JsLocation.Zero
  ): TsDeclFunction =
    TsDeclFunction(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      signature = TsFunSig(NoComments, Empty, Empty, None),
      jsLocation = jsLocation,
      codePath = CodePath.NoPath
    )

  def createMockVariable(
    name: String,
    jsLocation: JsLocation = JsLocation.Zero
  ): TsDeclVar =
    TsDeclVar(
      comments = NoComments,
      declared = false,
      readOnly = false,
      name = createSimpleIdent(name),
      tpe = None,
      expr = None,
      jsLocation = jsLocation,
      codePath = CodePath.NoPath
    )

  def createMockNamespace(
    name: String,
    jsLocation: JsLocation = JsLocation.Zero,
    members: IArray[TsContainerOrDecl] = Empty
  ): TsDeclNamespace =
    TsDeclNamespace(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      members = members,
      jsLocation = jsLocation,
      codePath = CodePath.NoPath
    )

  def createMockModule(
    name: String,
    jsLocation: JsLocation = JsLocation.Zero,
    members: IArray[TsContainerOrDecl] = Empty
  ): TsDeclModule =
    TsDeclModule(
      comments = NoComments,
      declared = false,
      name = createModuleIdent(name),
      members = members,
      codePath = CodePath.NoPath,
      jsLocation = jsLocation
    )

  def createMockGlobal(
    jsLocation: JsLocation = JsLocation.Zero,
    members: IArray[TsContainerOrDecl] = Empty
  ): TsGlobal =
    TsGlobal(
      comments = NoComments,
      declared = false,
      members = members,
      codePath = CodePath.NoPath
    )

  def tests = Tests {
    test("SetJsLocation - Basic Functionality") {
      test("extends TreeTransformation") {
        assert(SetJsLocation.isInstanceOf[TreeTransformation[JsLocation]])
      }

      test("has enterTsDecl method") {
        val jsLocation = JsLocation.Zero
        val clazz = createMockClass("TestClass")
        val result = SetJsLocation.enterTsDecl(jsLocation)(clazz)
        assert(result != null)
        assert(result.isInstanceOf[TsDecl])
      }

      test("has enterTsContainer method") {
        val jsLocation = JsLocation.Zero
        val namespace = createMockNamespace("TestNamespace")
        val result = SetJsLocation.enterTsContainer(jsLocation)(namespace)
        assert(result != null)
        assert(result.isInstanceOf[TsContainer])
      }

      test("has enterTsNamedDecl method") {
        val jsLocation = JsLocation.Zero
        val func = createMockFunction("testFunc")
        val result = SetJsLocation.enterTsNamedDecl(jsLocation)(func)
        assert(result != null)
        assert(result.isInstanceOf[TsNamedDecl])
      }

      test("has withTree method") {
        val jsLocation = JsLocation.Zero
        val clazz = createMockClass("TestClass")
        val result = SetJsLocation.withTree(jsLocation, clazz)
        assert(result != null)
        assert(result.isInstanceOf[JsLocation])
      }
    }

    test("SetJsLocation - TsDecl Processing") {
      test("sets JS location on class declaration") {
        val jsLocation = JsLocation.Global(createQIdent("MyClass"))
        val clazz = createMockClass("TestClass", JsLocation.Zero)
        
        val result = SetJsLocation.enterTsDecl(jsLocation)(clazz)
        
        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.jsLocation == jsLocation)
        assert(resultClass.name.value == "TestClass")
      }

      test("sets JS location on interface declaration") {
        val jsLocation = JsLocation.Global(createQIdent("MyInterface"))
        val interface = createMockInterface("TestInterface")
        
        val result = SetJsLocation.enterTsDecl(jsLocation)(interface)
        
        assert(result.isInstanceOf[TsDeclInterface])
        val resultInterface = result.asInstanceOf[TsDeclInterface]
        // Interface doesn't implement JsLocation.Has, so should remain unchanged
        assert(result == interface)
      }

      test("sets JS location on function declaration") {
        val jsLocation = JsLocation.Global(createQIdent("myFunc"))
        val func = createMockFunction("testFunc", JsLocation.Zero)
        
        val result = SetJsLocation.enterTsDecl(jsLocation)(func)
        
        assert(result.isInstanceOf[TsDeclFunction])
        val resultFunc = result.asInstanceOf[TsDeclFunction]
        assert(resultFunc.jsLocation == jsLocation)
        assert(resultFunc.name.value == "testFunc")
      }

      test("sets JS location on variable declaration") {
        val jsLocation = JsLocation.Global(createQIdent("myVar"))
        val variable = createMockVariable("testVar", JsLocation.Zero)
        
        val result = SetJsLocation.enterTsDecl(jsLocation)(variable)
        
        assert(result.isInstanceOf[TsDeclVar])
        val resultVar = result.asInstanceOf[TsDeclVar]
        assert(resultVar.jsLocation == jsLocation)
        assert(resultVar.name.value == "testVar")
      }

      test("sets JS location on namespace declaration") {
        val jsLocation = JsLocation.Global(createQIdent("MyNamespace"))
        val namespace = createMockNamespace("TestNamespace", JsLocation.Zero)
        
        val result = SetJsLocation.enterTsDecl(jsLocation)(namespace)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val resultNamespace = result.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.jsLocation == jsLocation)
        assert(resultNamespace.name.value == "TestNamespace")
      }

      test("sets JS location on module declaration") {
        val jsLocation = JsLocation.Module(createModuleIdent("test-module"), ModuleSpec.Namespaced)
        val module = createMockModule("TestModule", JsLocation.Zero)
        
        val result = SetJsLocation.enterTsDecl(jsLocation)(module)
        
        assert(result.isInstanceOf[TsDeclModule])
        val resultModule = result.asInstanceOf[TsDeclModule]
        assert(resultModule.jsLocation == jsLocation)
      }

      test("leaves non-JsLocation.Has declarations unchanged") {
        val jsLocation = JsLocation.Global(createQIdent("test"))
        val exportDecl = TsExport(NoComments, false, ExportType.Named, TsExportee.Names(Empty, None))
        
        val result = SetJsLocation.enterTsDecl(jsLocation)(exportDecl)
        
        assert(result == exportDecl) // Should remain unchanged
      }

      test("overwrites existing JS location") {
        val oldJsLocation = JsLocation.Global(createQIdent("old"))
        val newJsLocation = JsLocation.Global(createQIdent("new"))
        val clazz = createMockClass("TestClass", oldJsLocation)
        
        val result = SetJsLocation.enterTsDecl(newJsLocation)(clazz)
        
        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.jsLocation == newJsLocation)
        assert(resultClass.jsLocation != oldJsLocation)
      }
    }

    test("SetJsLocation - TsContainer Processing") {
      test("sets JS location on namespace container") {
        val jsLocation = JsLocation.Global(createQIdent("MyNamespace"))
        val namespace = createMockNamespace("TestNamespace", JsLocation.Zero)
        
        val result = SetJsLocation.enterTsContainer(jsLocation)(namespace)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val resultNamespace = result.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.jsLocation == jsLocation)
      }

      test("sets JS location on module container") {
        val jsLocation = JsLocation.Module(createModuleIdent("test-module"), ModuleSpec.Namespaced)
        val module = createMockModule("TestModule", JsLocation.Zero)
        
        val result = SetJsLocation.enterTsContainer(jsLocation)(module)
        
        assert(result.isInstanceOf[TsDeclModule])
        val resultModule = result.asInstanceOf[TsDeclModule]
        assert(resultModule.jsLocation == jsLocation)
      }

      test("handles global container") {
        val jsLocation = JsLocation.Zero
        val global = createMockGlobal(JsLocation.Zero)
        
        val result = SetJsLocation.enterTsContainer(jsLocation)(global)
        
        assert(result.isInstanceOf[TsGlobal])
        // TsGlobal doesn't implement JsLocation.Has, so should remain unchanged
        assert(result == global)
      }

      test("overwrites existing container JS location") {
        val oldJsLocation = JsLocation.Global(createQIdent("old"))
        val newJsLocation = JsLocation.Global(createQIdent("new"))
        val namespace = createMockNamespace("TestNamespace", oldJsLocation)
        
        val result = SetJsLocation.enterTsContainer(newJsLocation)(namespace)
        
        assert(result.isInstanceOf[TsDeclNamespace])
        val resultNamespace = result.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.jsLocation == newJsLocation)
        assert(resultNamespace.jsLocation != oldJsLocation)
      }
    }

    test("SetJsLocation - TsNamedDecl Processing") {
      test("sets JS location on named class declaration") {
        val jsLocation = JsLocation.Global(createQIdent("MyClass"))
        val clazz = createMockClass("TestClass", JsLocation.Zero)

        val result = SetJsLocation.enterTsNamedDecl(jsLocation)(clazz)

        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.jsLocation == jsLocation)
      }

      test("sets JS location on named function declaration") {
        val jsLocation = JsLocation.Global(createQIdent("myFunc"))
        val func = createMockFunction("testFunc", JsLocation.Zero)

        val result = SetJsLocation.enterTsNamedDecl(jsLocation)(func)

        assert(result.isInstanceOf[TsDeclFunction])
        val resultFunc = result.asInstanceOf[TsDeclFunction]
        assert(resultFunc.jsLocation == jsLocation)
      }

      test("sets JS location on named variable declaration") {
        val jsLocation = JsLocation.Global(createQIdent("myVar"))
        val variable = createMockVariable("testVar", JsLocation.Zero)

        val result = SetJsLocation.enterTsNamedDecl(jsLocation)(variable)

        assert(result.isInstanceOf[TsDeclVar])
        val resultVar = result.asInstanceOf[TsDeclVar]
        assert(resultVar.jsLocation == jsLocation)
      }

      test("leaves non-JsLocation.Has named declarations unchanged") {
        val jsLocation = JsLocation.Global(createQIdent("test"))
        val interface = createMockInterface("TestInterface")

        val result = SetJsLocation.enterTsNamedDecl(jsLocation)(interface)

        assert(result == interface) // Should remain unchanged
      }

      test("overwrites existing named declaration JS location") {
        val oldJsLocation = JsLocation.Global(createQIdent("old"))
        val newJsLocation = JsLocation.Global(createQIdent("new"))
        val func = createMockFunction("testFunc", oldJsLocation)

        val result = SetJsLocation.enterTsNamedDecl(newJsLocation)(func)

        assert(result.isInstanceOf[TsDeclFunction])
        val resultFunc = result.asInstanceOf[TsDeclFunction]
        assert(resultFunc.jsLocation == newJsLocation)
        assert(resultFunc.jsLocation != oldJsLocation)
      }
    }

    test("SetJsLocation - WithTree Method") {
      test("navigates from Zero to Global for named declaration") {
        val jsLocation = JsLocation.Zero
        val clazz = createMockClass("TestClass")

        val result = SetJsLocation.withTree(jsLocation, clazz)

        assert(result.isInstanceOf[JsLocation.Global])
        val globalResult = result.asInstanceOf[JsLocation.Global]
        assert(globalResult.jsPath.parts.length == 1)
        assert(globalResult.jsPath.parts.head.value == "TestClass")
      }

      test("navigates from Zero to Module for module declaration") {
        val jsLocation = JsLocation.Zero
        val module = createMockModule("test-module")

        val result = SetJsLocation.withTree(jsLocation, module)

        assert(result.isInstanceOf[JsLocation.Module])
        val moduleResult = result.asInstanceOf[JsLocation.Module]
        assert(moduleResult.module.value == "test-module")
        assert(moduleResult.spec == ModuleSpec.Namespaced)
      }

      test("navigates from Global to extended Global for named declaration") {
        val jsLocation = JsLocation.Global(createQIdent("Parent"))
        val clazz = createMockClass("Child")

        val result = SetJsLocation.withTree(jsLocation, clazz)

        assert(result.isInstanceOf[JsLocation.Global])
        val globalResult = result.asInstanceOf[JsLocation.Global]
        assert(globalResult.jsPath.parts.length == 2)
        assert(globalResult.jsPath.parts.head.value == "Parent")
        assert(globalResult.jsPath.parts(1).value == "Child")
      }

      test("navigates from Global to Module for module declaration") {
        val jsLocation = JsLocation.Global(createQIdent("GlobalName"))
        val module = createMockModule("test-module")

        val result = SetJsLocation.withTree(jsLocation, module)

        assert(result.isInstanceOf[JsLocation.Module])
        val moduleResult = result.asInstanceOf[JsLocation.Module]
        assert(moduleResult.module.value == "test-module")
        assert(moduleResult.spec == ModuleSpec.Namespaced)
      }

      test("navigates from Module to extended Module for named declaration") {
        val jsLocation = JsLocation.Module(createModuleIdent("test-module"), ModuleSpec.Namespaced)
        val clazz = createMockClass("TestClass")

        val result = SetJsLocation.withTree(jsLocation, clazz)

        assert(result.isInstanceOf[JsLocation.Module])
        val moduleResult = result.asInstanceOf[JsLocation.Module]
        assert(moduleResult.module.value == "test-module")
        // Spec should be extended with the class name
        assert(moduleResult.spec != ModuleSpec.Namespaced)
      }

      test("navigates from Module to nested Module for module declaration") {
        val jsLocation = JsLocation.Module(createModuleIdent("parent-module"), ModuleSpec.Namespaced)
        val module = createMockModule("child-module")

        val result = SetJsLocation.withTree(jsLocation, module)

        assert(result.isInstanceOf[JsLocation.Module])
        val moduleResult = result.asInstanceOf[JsLocation.Module]
        assert(moduleResult.module.value == "child-module")
        assert(moduleResult.spec == ModuleSpec.Namespaced)
      }

      test("navigates from Zero to Zero for global declaration") {
        val jsLocation = JsLocation.Zero
        val global = createMockGlobal()

        val result = SetJsLocation.withTree(jsLocation, global)

        assert(result == JsLocation.Zero)
      }

      test("preserves location for non-navigable trees") {
        val jsLocation = JsLocation.Global(createQIdent("test"))
        val typeRef = TsTypeRef(NoComments, createQIdent("string"), Empty)

        val result = SetJsLocation.withTree(jsLocation, typeRef)

        assert(result == jsLocation) // Should remain unchanged for non-navigable trees
      }

      test("handles namespaced identifiers") {
        val jsLocation = JsLocation.Zero
        val namespacedClass = createMockClass("^") // TsIdent.namespaced

        val result = SetJsLocation.withTree(jsLocation, namespacedClass)

        assert(result == JsLocation.Zero) // Should remain Zero for namespaced identifiers
      }
    }

    test("SetJsLocation - JsLocation Types") {
      test("handles Zero location") {
        val jsLocation = JsLocation.Zero
        val clazz = createMockClass("TestClass", JsLocation.Global(createQIdent("old")))

        val result = SetJsLocation.enterTsDecl(jsLocation)(clazz)

        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.jsLocation == JsLocation.Zero)
      }

      test("handles Global location") {
        val jsLocation = JsLocation.Global(createQIdent("GlobalName"))
        val clazz = createMockClass("TestClass", JsLocation.Zero)

        val result = SetJsLocation.enterTsDecl(jsLocation)(clazz)

        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.jsLocation == jsLocation)
      }

      test("handles Module location") {
        val jsLocation = JsLocation.Module(createModuleIdent("test-module"), ModuleSpec.Namespaced)
        val clazz = createMockClass("TestClass", JsLocation.Zero)

        val result = SetJsLocation.enterTsDecl(jsLocation)(clazz)

        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.jsLocation == jsLocation)
      }

      test("handles Both location") {
        val moduleLocation = JsLocation.Module(createModuleIdent("test-module"), ModuleSpec.Namespaced)
        val globalLocation = JsLocation.Global(createQIdent("GlobalName"))
        val jsLocation = JsLocation.Both(moduleLocation, globalLocation)
        val clazz = createMockClass("TestClass", JsLocation.Zero)

        val result = SetJsLocation.enterTsDecl(jsLocation)(clazz)

        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.jsLocation == jsLocation)
      }
    }

    test("SetJsLocation - Edge Cases") {
      test("handles complex nested structures") {
        val jsLocation = JsLocation.Global(createQIdent("Parent"))
        val innerClass = createMockClass("InnerClass", JsLocation.Zero)
        val outerClass = createMockClass("OuterClass", JsLocation.Zero, IArray(
          TsMemberProperty(
            NoComments,
            TsProtectionLevel.Default,
            createSimpleIdent("prop"),
            None,
            None,
            false,
            false
          )
        ))
        val namespace = createMockNamespace("TestNamespace", JsLocation.Zero, IArray(outerClass, innerClass))

        val result = SetJsLocation.enterTsContainer(jsLocation)(namespace)

        assert(result.isInstanceOf[TsDeclNamespace])
        val resultNamespace = result.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.jsLocation == jsLocation)
        // Members should remain unchanged (transform doesn't recursively process)
        assert(resultNamespace.members.length == 2)
      }

      test("handles very long JS paths") {
        val jsLocation = JsLocation.Global(createQIdent("level1", "level2", "level3", "level4", "level5"))
        val func = createMockFunction("deepFunc", JsLocation.Zero)

        val result = SetJsLocation.enterTsNamedDecl(jsLocation)(func)

        assert(result.isInstanceOf[TsDeclFunction])
        val resultFunc = result.asInstanceOf[TsDeclFunction]
        assert(resultFunc.jsLocation == jsLocation)
        assert(resultFunc.jsLocation.asInstanceOf[JsLocation.Global].jsPath.parts.length == 5)
      }

      test("handles empty module specs") {
        val jsLocation = JsLocation.Module(createModuleIdent("test"), ModuleSpec.Namespaced)
        val clazz = createMockClass("TestClass", JsLocation.Zero)

        val result = SetJsLocation.enterTsDecl(jsLocation)(clazz)

        assert(result.isInstanceOf[TsDeclClass])
        val resultClass = result.asInstanceOf[TsDeclClass]
        assert(resultClass.jsLocation == jsLocation)
      }
    }

    test("SetJsLocation - Integration Scenarios") {
      test("handles real-world library structure") {
        // Simulate: @types/node/fs module structure
        val jsLocation = JsLocation.Module(createModuleIdent("fs"), ModuleSpec.Namespaced)
        val readFileFunc = createMockFunction("readFile", JsLocation.Zero)
        val writeFileFunc = createMockFunction("writeFile", JsLocation.Zero)
        val statsClass = createMockClass("Stats", JsLocation.Zero)
        val fsNamespace = createMockNamespace("fs", JsLocation.Zero, IArray(readFileFunc, writeFileFunc, statsClass))

        val result = SetJsLocation.enterTsContainer(jsLocation)(fsNamespace)

        assert(result.isInstanceOf[TsDeclNamespace])
        val resultNamespace = result.asInstanceOf[TsDeclNamespace]
        assert(resultNamespace.jsLocation == jsLocation)
        assert(resultNamespace.name.value == "fs")
        assert(resultNamespace.members.length == 3)
      }

      test("handles module with nested declarations") {
        // Simulate: declare module "my-lib" { export class MyClass {} }
        val jsLocation = JsLocation.Module(createModuleIdent("my-lib"), ModuleSpec.Namespaced)
        val exportedClass = createMockClass("MyClass", JsLocation.Zero)
        val module = createMockModule("my-lib", JsLocation.Zero, IArray(exportedClass))

        val result = SetJsLocation.enterTsContainer(jsLocation)(module)

        assert(result.isInstanceOf[TsDeclModule])
        val resultModule = result.asInstanceOf[TsDeclModule]
        assert(resultModule.jsLocation == jsLocation)
        assert(resultModule.members.length == 1)
      }

      test("handles global augmentation") {
        // Simulate: declare global { interface Window { myProp: string; } }
        val jsLocation = JsLocation.Zero
        val windowInterface = createMockInterface("Window")
        val global = createMockGlobal(JsLocation.Zero, IArray(windowInterface))

        val result = SetJsLocation.enterTsContainer(jsLocation)(global)

        assert(result.isInstanceOf[TsGlobal])
        val resultGlobal = result.asInstanceOf[TsGlobal]
        // TsGlobal doesn't implement JsLocation.Has, so should remain unchanged
        assert(resultGlobal == global)
        assert(resultGlobal.members.length == 1)
      }

      test("handles mixed location types in hierarchy") {
        // Test navigation through different location types
        val zeroLocation = JsLocation.Zero
        val globalLocation = JsLocation.Global(createQIdent("MyGlobal"))
        val moduleLocation = JsLocation.Module(createModuleIdent("my-module"), ModuleSpec.Namespaced)

        val clazz1 = createMockClass("Class1")
        val clazz2 = createMockClass("Class2")
        val clazz3 = createMockClass("Class3")

        // Test Zero -> Global navigation
        val result1 = SetJsLocation.withTree(zeroLocation, clazz1)
        assert(result1.isInstanceOf[JsLocation.Global])

        // Test Global -> extended Global navigation
        val result2 = SetJsLocation.withTree(globalLocation, clazz2)
        assert(result2.isInstanceOf[JsLocation.Global])

        // Test Module -> extended Module navigation
        val result3 = SetJsLocation.withTree(moduleLocation, clazz3)
        assert(result3.isInstanceOf[JsLocation.Module])
      }
    }
  }
}