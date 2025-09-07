package org.scalablytyped.converter.internal
package ts
package modules

import utest.*
import org.scalablytyped.converter.internal.logging.{Logger, Formatter, Metadata}

object InferredDependencyTests extends TestSuite {

  // Helper methods for creating test data specific to InferredDependency tests

  class MockLogger extends Logger[Unit] {
    private var messages = List.empty[String]

    override def underlying: Unit = ()

    override def withContext[T: Formatter](key: String, value: T): Logger[Unit] = this

    override def log[T: Formatter](
        text: => sourcecode.Text[T],
        throwable: Option[Throwable],
        metadata: Metadata
    ): Unit = {
      messages = s"${metadata.logLevel}: ${text.value}" :: messages
    }

    def getMessages: List[String] = messages.reverse
    def clearMessages(): Unit     = messages = List.empty
  }

  def createMockLogger(): MockLogger = new MockLogger()

  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent =
    TsQIdent(IArray.fromTraversable(parts.map(TsIdentSimple.apply)))

  def createMockInterface(
      name: String,
      members: IArray[TsMember] = Empty,
      codePath: CodePath = CodePath.NoPath
  ): TsDeclInterface =
    TsDeclInterface(
      comments = NoComments,
      declared = false,
      name = createSimpleIdent(name),
      tparams = Empty,
      inheritance = Empty,
      members = members,
      codePath = codePath
    )

  def createMockTypeRef(qident: TsQIdent): TsTypeRef =
    TsTypeRef(
      comments = NoComments,
      name = qident,
      tparams = Empty
    )

  def createMockParsedFile(
      members: IArray[TsContainerOrDecl],
      codePath: CodePath = CodePath.NoPath
  ): TsParsedFile =
    TsParsedFile(
      comments = NoComments,
      directives = Empty,
      members = members,
      codePath = codePath
    )

  def createMockProperty(
      name: String,
      tpe: TsType
  ): TsMemberProperty =
    TsMemberProperty(
      comments = NoComments,
      level = TsProtectionLevel.Default,
      name = createSimpleIdent(name),
      tpe = Some(tpe),
      expr = None,
      isStatic = false,
      isReadOnly = false
    )

  def createLibraryIdent(name: String): TsIdentLibrary = TsIdentLibrarySimple(name)

  def createModuleIdent(name: String): TsIdentModule = TsIdentModule.simple(name)

  def tests = Tests {
    test("InferredDependency - Basic Functionality") {
      test("returns empty set when no dependencies are inferred") {
        val libName            = createLibraryIdent("test-lib")
        val file               = createMockParsedFile(Empty)
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.isEmpty)
      }

      test("excludes the library itself from inferred dependencies") {
        val libName        = createLibraryIdent("react")
        val reactInterface = createMockInterface("Component")
        val reactProperty  = createMockProperty("Component", createMockTypeRef(createQIdent("React", "Component")))
        val interfaceWithReactProperty = reactInterface.copy(members = IArray(reactProperty))
        val file                       = createMockParsedFile(IArray(interfaceWithReactProperty))
        val nonResolvedModules         = Set.empty[TsIdentModule]
        val logger                     = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(!result.contains(libName))
      }
    }

    test("InferredDependency - Node Module Inference") {
      test("infers node dependency when non-resolved modules contain node modules") {
        val libName = createLibraryIdent("test-lib")
        val file    = createMockParsedFile(Empty)
        val nonResolvedModules = Set(
          createModuleIdent("fs"),
          createModuleIdent("path"),
          createModuleIdent("http")
        )
        val logger = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("node")))
        assert(result.size == 1)
      }

      test("does not infer node dependency when no node modules are present") {
        val libName = createLibraryIdent("test-lib")
        val file    = createMockParsedFile(Empty)
        val nonResolvedModules = Set(
          createModuleIdent("lodash"),
          createModuleIdent("express"),
          createModuleIdent("custom-module")
        )
        val logger = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(!result.contains(TsIdentLibrarySimple("node")))
      }

      test("infers node dependency with mixed modules") {
        val libName = createLibraryIdent("test-lib")
        val file    = createMockParsedFile(Empty)
        val nonResolvedModules = Set(
          createModuleIdent("fs"),     // node module
          createModuleIdent("lodash"), // non-node module
          createModuleIdent("crypto")  // node module
        )
        val logger = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("node")))
      }
    }

    test("InferredDependency - Prefix-based Inference") {
      test("infers React dependency from React prefix") {
        val libName            = createLibraryIdent("test-lib")
        val reactProperty      = createMockProperty("component", createMockTypeRef(createQIdent("React", "Component")))
        val interface1         = createMockInterface("TestInterface", IArray(reactProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("react")))
      }

      test("infers Angular dependency from ng prefix") {
        val libName            = createLibraryIdent("test-lib")
        val ngProperty         = createMockProperty("service", createMockTypeRef(createQIdent("ng", "IService")))
        val interface1         = createMockInterface("TestInterface", IArray(ngProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("angular")))
      }

      test("infers Angular dependency from angular prefix") {
        val libName            = createLibraryIdent("test-lib")
        val angularProperty    = createMockProperty("module", createMockTypeRef(createQIdent("angular", "IModule")))
        val interface1         = createMockInterface("TestInterface", IArray(angularProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("angular")))
      }

      test("infers Node dependency from NodeJS prefix") {
        val libName            = createLibraryIdent("test-lib")
        val nodeProperty       = createMockProperty("process", createMockTypeRef(createQIdent("NodeJS", "Process")))
        val interface1         = createMockInterface("TestInterface", IArray(nodeProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("node")))
      }

      test("infers Node dependency from Buffer prefix") {
        val libName            = createLibraryIdent("test-lib")
        val bufferProperty     = createMockProperty("buffer", createMockTypeRef(createQIdent("Buffer")))
        val interface1         = createMockInterface("TestInterface", IArray(bufferProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("node")))
      }

      test("infers Node dependency from global prefix") {
        val libName            = createLibraryIdent("test-lib")
        val globalProperty     = createMockProperty("global", createMockTypeRef(createQIdent("global", "NodeJS")))
        val interface1         = createMockInterface("TestInterface", IArray(globalProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("node")))
      }
    }

    test("InferredDependency - Multiple Library Prefixes") {
      test("infers moment dependency from moment prefix") {
        val libName            = createLibraryIdent("test-lib")
        val momentProperty     = createMockProperty("date", createMockTypeRef(createQIdent("moment", "Moment")))
        val interface1         = createMockInterface("TestInterface", IArray(momentProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("moment")))
      }

      test("infers backbone dependency from Backbone prefix") {
        val libName            = createLibraryIdent("test-lib")
        val backboneProperty   = createMockProperty("model", createMockTypeRef(createQIdent("Backbone", "Model")))
        val interface1         = createMockInterface("TestInterface", IArray(backboneProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("backbone")))
      }

      test("infers leaflet dependency from Leaflet prefix") {
        val libName            = createLibraryIdent("test-lib")
        val leafletProperty    = createMockProperty("map", createMockTypeRef(createQIdent("Leaflet", "Map")))
        val interface1         = createMockInterface("TestInterface", IArray(leafletProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("leaflet")))
      }

      test("infers plotly.js dependency from Plotly prefix") {
        val libName            = createLibraryIdent("test-lib")
        val plotlyProperty     = createMockProperty("plot", createMockTypeRef(createQIdent("Plotly", "PlotData")))
        val interface1         = createMockInterface("TestInterface", IArray(plotlyProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("plotly.js")))
      }
    }

    test("InferredDependency - Combined Inference") {
      test("infers both node and prefix-based dependencies") {
        val libName       = createLibraryIdent("test-lib")
        val reactProperty = createMockProperty("component", createMockTypeRef(createQIdent("React", "Component")))
        val interface1    = createMockInterface("TestInterface", IArray(reactProperty))
        val file          = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set(
          createModuleIdent("fs"),
          createModuleIdent("path")
        )
        val logger = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("node")))
        assert(result.contains(TsIdentLibrarySimple("react")))
        assert(result.size == 2)
      }

      test("infers multiple prefix-based dependencies") {
        val libName            = createLibraryIdent("test-lib")
        val reactProperty      = createMockProperty("component", createMockTypeRef(createQIdent("React", "Component")))
        val momentProperty     = createMockProperty("date", createMockTypeRef(createQIdent("moment", "Moment")))
        val interface1         = createMockInterface("TestInterface", IArray(reactProperty, momentProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("react")))
        assert(result.contains(TsIdentLibrarySimple("moment")))
        assert(result.size == 2)
      }

      test("handles duplicate prefix inferences correctly") {
        val libName            = createLibraryIdent("test-lib")
        val reactProperty1     = createMockProperty("component", createMockTypeRef(createQIdent("React", "Component")))
        val reactProperty2     = createMockProperty("element", createMockTypeRef(createQIdent("React", "Element")))
        val interface1         = createMockInterface("TestInterface", IArray(reactProperty1, reactProperty2))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("react")))
        assert(result.size == 1) // Should not duplicate react dependency
      }
    }

    test("InferredDependency - Edge Cases") {
      test("handles empty file correctly") {
        val libName            = createLibraryIdent("test-lib")
        val file               = createMockParsedFile(Empty)
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.isEmpty)
      }

      test("handles file with no qualified identifiers") {
        val libName            = createLibraryIdent("test-lib")
        val simpleProperty     = createMockProperty("name", createMockTypeRef(createQIdent("string")))
        val interface1         = createMockInterface("TestInterface", IArray(simpleProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.isEmpty)
      }

      test("handles unknown prefixes correctly") {
        val libName            = createLibraryIdent("test-lib")
        val unknownProperty    = createMockProperty("unknown", createMockTypeRef(createQIdent("UnknownLib", "Type")))
        val interface1         = createMockInterface("TestInterface", IArray(unknownProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.isEmpty)
      }

      test("handles empty qualified identifiers") {
        val libName             = createLibraryIdent("test-lib")
        val emptyQIdentProperty = createMockProperty("empty", createMockTypeRef(TsQIdent(Empty)))
        val interface1          = createMockInterface("TestInterface", IArray(emptyQIdentProperty))
        val file                = createMockParsedFile(IArray(interface1))
        val nonResolvedModules  = Set.empty[TsIdentModule]
        val logger              = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.isEmpty)
      }
    }

    test("InferredDependency - Node Module Coverage") {
      test("recognizes all core node modules") {
        val libName = createLibraryIdent("test-lib")
        val file    = createMockParsedFile(Empty)
        val coreNodeModules = Set(
          "buffer",
          "querystring",
          "events",
          "http",
          "cluster",
          "zlib",
          "os",
          "https",
          "punycode",
          "repl",
          "readline",
          "vm",
          "child_process",
          "url",
          "dns",
          "net",
          "dgram",
          "fs",
          "path",
          "string_decoder",
          "tls",
          "crypto",
          "stream",
          "util",
          "assert",
          "tty",
          "domain",
          "constants",
          "module",
          "process",
          "v8",
          "timers",
          "console",
          "async_hooks",
          "http2"
        ).map(createModuleIdent)
        val logger = createMockLogger()

        val result = InferredDependency(libName, file, coreNodeModules, logger)

        assert(result.contains(TsIdentLibrarySimple("node")))
        assert(result.size == 1)
      }

      test("handles subset of node modules") {
        val libName = createLibraryIdent("test-lib")
        val file    = createMockParsedFile(Empty)
        val someNodeModules = Set(
          createModuleIdent("fs"),
          createModuleIdent("path"),
          createModuleIdent("crypto")
        )
        val logger = createMockLogger()

        val result = InferredDependency(libName, file, someNodeModules, logger)

        assert(result.contains(TsIdentLibrarySimple("node")))
        assert(result.size == 1)
      }

      test("does not infer node for non-node modules") {
        val libName = createLibraryIdent("test-lib")
        val file    = createMockParsedFile(Empty)
        val nonNodeModules = Set(
          createModuleIdent("lodash"),
          createModuleIdent("express"),
          createModuleIdent("react"),
          createModuleIdent("custom-module")
        )
        val logger = createMockLogger()

        val result = InferredDependency(libName, file, nonNodeModules, logger)

        assert(!result.contains(TsIdentLibrarySimple("node")))
        assert(result.isEmpty)
      }
    }

    test("InferredDependency - Logging Behavior") {
      test("logs inferred dependencies when dependencies are found") {
        val libName            = createLibraryIdent("test-lib")
        val reactProperty      = createMockProperty("component", createMockTypeRef(createQIdent("React", "Component")))
        val interface1         = createMockInterface("TestInterface", IArray(reactProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("react")))
        val messages = logger.getMessages
        assert(messages.exists(_.contains("Inferred dependencies")))
        assert(messages.exists(_.contains("react")))
        assert(messages.exists(_.contains("test-lib")))
      }

      test("does not log when no dependencies are inferred") {
        val libName            = createLibraryIdent("test-lib")
        val file               = createMockParsedFile(Empty)
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.isEmpty)
        val messages = logger.getMessages
        assert(messages.isEmpty)
      }
    }

    test("InferredDependency - Complex Scenarios") {
      test("handles complex nested qualified identifiers") {
        val libName = createLibraryIdent("test-lib")
        val nestedReactProperty =
          createMockProperty("component", createMockTypeRef(createQIdent("React", "Component", "Props")))
        val interface1         = createMockInterface("TestInterface", IArray(nestedReactProperty))
        val file               = createMockParsedFile(IArray(interface1))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("react")))
      }

      test("handles multiple interfaces with different dependencies") {
        val libName          = createLibraryIdent("test-lib")
        val reactProperty    = createMockProperty("component", createMockTypeRef(createQIdent("React", "Component")))
        val momentProperty   = createMockProperty("date", createMockTypeRef(createQIdent("moment", "Moment")))
        val backboneProperty = createMockProperty("model", createMockTypeRef(createQIdent("Backbone", "Model")))

        val interface1 = createMockInterface("ReactInterface", IArray(reactProperty))
        val interface2 = createMockInterface("MomentInterface", IArray(momentProperty))
        val interface3 = createMockInterface("BackboneInterface", IArray(backboneProperty))

        val file               = createMockParsedFile(IArray(interface1, interface2, interface3))
        val nonResolvedModules = Set.empty[TsIdentModule]
        val logger             = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        assert(result.contains(TsIdentLibrarySimple("react")))
        assert(result.contains(TsIdentLibrarySimple("moment")))
        assert(result.contains(TsIdentLibrarySimple("backbone")))
        assert(result.size == 3)
      }

      test("handles maximum complexity scenario") {
        val libName = createLibraryIdent("complex-lib")

        // Create properties with various library prefixes
        val reactProperty  = createMockProperty("component", createMockTypeRef(createQIdent("React", "Component")))
        val nodeProperty   = createMockProperty("process", createMockTypeRef(createQIdent("NodeJS", "Process")))
        val bufferProperty = createMockProperty("buffer", createMockTypeRef(createQIdent("Buffer")))
        val momentProperty = createMockProperty("date", createMockTypeRef(createQIdent("moment", "Moment")))

        val interface1 =
          createMockInterface("ComplexInterface", IArray(reactProperty, nodeProperty, bufferProperty, momentProperty))
        val file = createMockParsedFile(IArray(interface1))

        // Add node modules to non-resolved modules
        val nonResolvedModules = Set(
          createModuleIdent("fs"),
          createModuleIdent("crypto"),
          createModuleIdent("custom-module") // non-node module
        )
        val logger = createMockLogger()

        val result = InferredDependency(libName, file, nonResolvedModules, logger)

        // Should infer: react, node (from both prefix and modules), moment
        // Note: node should only appear once despite being inferred from multiple sources
        assert(result.contains(TsIdentLibrarySimple("react")))
        assert(result.contains(TsIdentLibrarySimple("node")))
        assert(result.contains(TsIdentLibrarySimple("moment")))
        assert(result.size == 3) // Should not duplicate node dependency
      }
    }
  }
}
