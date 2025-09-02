package org.scalablytyped.converter.internal

import io.circe.{Json => CirceJson}
import org.scalablytyped.converter.internal.ts.{PackageJson, TsIdentLibrary}
import utest.*

object PackageJsonTests extends TestSuite {
  def tests = Tests {
    test("Basic Construction and Empty PackageJson") {
      test("empty PackageJson") {
        val empty = PackageJson.Empty
        assert(empty.version.isEmpty)
        assert(empty.dependencies.isEmpty)
        assert(empty.devDependencies.isEmpty)
        assert(empty.peerDependencies.isEmpty)
        assert(empty.typings.isEmpty)
        assert(empty.module.isEmpty)
        assert(empty.types.isEmpty)
        assert(empty.files.isEmpty)
        assert(empty.dist.isEmpty)
        assert(empty.exports.isEmpty)
      }

      test("manual construction with all fields") {
        val deps = Map(TsIdentLibrary("lodash") -> "^4.17.21")
        val devDeps = Map(TsIdentLibrary("@types/node") -> "^18.0.0")
        val peerDeps = Map(TsIdentLibrary("react") -> ">=16.0.0")
        val files = IArray("index.d.ts", "lib/")
        val dist = PackageJson.Dist("https://registry.npmjs.org/test/-/test-1.0.0.tgz")

        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = Some(deps),
          devDependencies = Some(devDeps),
          peerDependencies = Some(peerDeps),
          typings = Some(CirceJson.fromString("./index.d.ts")),
          module = Some(CirceJson.fromString("./lib/index.js")),
          types = Some(CirceJson.fromString("./index.d.ts")),
          files = Some(files),
          dist = Some(dist),
          exports = Some(CirceJson.obj("." -> CirceJson.fromString("./index.js")))
        )

        assert(packageJson.version.contains("1.0.0"))
        assert(packageJson.dependencies.contains(deps))
        assert(packageJson.devDependencies.contains(devDeps))
        assert(packageJson.peerDependencies.contains(peerDeps))
        assert(packageJson.files.contains(files))
        assert(packageJson.dist.contains(dist))
      }
    }

    test("JSON Parsing and Serialization") {
      test("parse valid minimal package.json") {
        val jsonStr = """{"version": "1.0.0"}"""
        val result = Json.apply[PackageJson](jsonStr)

        result match {
          case Right(packageJson) =>
            assert(packageJson.version.contains("1.0.0"))
            assert(packageJson.dependencies.isEmpty)
            assert(packageJson.devDependencies.isEmpty)
          case Left(_) =>
            assert(false) // Failed to parse: $error
        }
      }

      test("parse package.json with dependencies") {
        val jsonStr = """{
          "version": "2.1.0",
          "dependencies": {
            "lodash": "^4.17.21",
            "@types/node": "^18.0.0",
            "@angular/core": "^15.0.0"
          },
          "devDependencies": {
            "typescript": "^4.9.0"
          },
          "peerDependencies": {
            "react": ">=16.0.0"
          }
        }"""

        val result = Json.apply[PackageJson](jsonStr)

        result match {
          case Right(packageJson) =>
            assert(packageJson.version.contains("2.1.0"))

            val deps = packageJson.dependencies.get
            assert(deps.contains(TsIdentLibrary("lodash")))
            assert(deps.contains(TsIdentLibrary("node"))) // @types/node -> node
            assert(deps.contains(TsIdentLibrary("@angular/core")))
            assert(deps(TsIdentLibrary("lodash")) == "^4.17.21")

            val devDeps = packageJson.devDependencies.get
            assert(devDeps.contains(TsIdentLibrary("typescript")))

            val peerDeps = packageJson.peerDependencies.get
            assert(peerDeps.contains(TsIdentLibrary("react")))

          case Left(_) =>
            assert(false) // Failed to parse: $error
        }
      }

      test("parse package.json with complex types and exports") {
        val jsonStr = """{
          "version": "1.5.0",
          "types": ["./index.d.ts", "./lib/types.d.ts"],
          "typings": "./typings/index.d.ts",
          "module": "./esm/index.js",
          "exports": {
            ".": {
              "types": "./index.d.ts",
              "import": "./esm/index.js",
              "require": "./cjs/index.js"
            },
            "./utils": {
              "types": "./utils/index.d.ts"
            }
          },
          "files": ["dist/", "types/", "README.md"]
        }"""

        val result = Json.apply[PackageJson](jsonStr)

        result match {
          case Right(packageJson) =>
            assert(packageJson.version.contains("1.5.0"))
            assert(packageJson.types.isDefined)
            assert(packageJson.typings.isDefined)
            assert(packageJson.module.isDefined)
            assert(packageJson.exports.isDefined)
            assert(packageJson.files.isDefined)

            val files = packageJson.files.get
            assert(files.length == 3)
            assert(files.contains("dist/"))
            assert(files.contains("types/"))
            assert(files.contains("README.md"))

          case Left(_) =>
            assert(false) // Failed to parse: $error
        }
      }
    }

    test("Error Handling and Invalid JSON") {
      test("malformed JSON") {
        val invalidJson = """{"version": "1.0.0", "dependencies": {"""
        val result = Json.apply[PackageJson](invalidJson)

        result match {
          case Left(_) => // Expected failure
          case Right(_) => assert(false) // Should have failed to parse malformed JSON
        }
      }

      test("invalid dependency format") {
        val jsonStr = """{
          "version": "1.0.0",
          "dependencies": "not-an-object"
        }"""
        val result = Json.apply[PackageJson](jsonStr)

        result match {
          case Left(_) => // Expected failure
          case Right(_) => assert(false) // Should have failed with invalid dependencies format
        }
      }

      test("empty JSON object") {
        val jsonStr = "{}"
        val result = Json.apply[PackageJson](jsonStr)

        result match {
          case Right(packageJson) =>
            assert(packageJson.version.isEmpty)
            assert(packageJson.dependencies.isEmpty)
            assert(packageJson == PackageJson.Empty)
          case Left(_) =>
            assert(false) // Should parse empty object
        }
      }

      test("null values in JSON") {
        val jsonStr = """{
          "version": null,
          "dependencies": null,
          "types": null
        }"""
        val result = Json.apply[PackageJson](jsonStr)

        result match {
          case Right(packageJson) =>
            assert(packageJson.version.isEmpty)
            assert(packageJson.dependencies.isEmpty)
            assert(packageJson.types.isEmpty)
          case Left(_) =>
            assert(false) // Should handle null values
        }
      }
    }

    test("allLibs Method") {
      test("allLibs with no dependencies") {
        val packageJson = PackageJson.Empty
        val libs = packageJson.allLibs(dev = false, peer = false)
        assert(libs.isEmpty)
      }

      test("allLibs with only regular dependencies") {
        val deps = Map(
          TsIdentLibrary("lodash") -> "^4.17.21",
          TsIdentLibrary("react") -> "^18.0.0"
        )
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = Some(deps),
          devDependencies = None,
          peerDependencies = None,
          typings = None,
          module = None,
          types = None,
          files = None,
          dist = None,
          exports = None
        )

        val libs = packageJson.allLibs(dev = false, peer = false)
        assert(libs.size == 2)
        assert(libs.contains(TsIdentLibrary("lodash")))
        assert(libs.contains(TsIdentLibrary("react")))
        assert(libs(TsIdentLibrary("lodash")) == "^4.17.21")
      }

      test("allLibs including dev dependencies") {
        val deps = Map(TsIdentLibrary("lodash") -> "^4.17.21")
        val devDeps = Map(TsIdentLibrary("typescript") -> "^4.9.0")
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = Some(deps),
          devDependencies = Some(devDeps),
          peerDependencies = None,
          typings = None,
          module = None,
          types = None,
          files = None,
          dist = None,
          exports = None
        )

        val libsNoDev = packageJson.allLibs(dev = false, peer = false)
        assert(libsNoDev.size == 1)
        assert(libsNoDev.contains(TsIdentLibrary("lodash")))

        val libsWithDev = packageJson.allLibs(dev = true, peer = false)
        assert(libsWithDev.size == 2)
        assert(libsWithDev.contains(TsIdentLibrary("lodash")))
        assert(libsWithDev.contains(TsIdentLibrary("typescript")))
      }

      test("allLibs including peer dependencies") {
        val deps = Map(TsIdentLibrary("lodash") -> "^4.17.21")
        val peerDeps = Map(TsIdentLibrary("react") -> ">=16.0.0")
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = Some(deps),
          devDependencies = None,
          peerDependencies = Some(peerDeps),
          typings = None,
          module = None,
          types = None,
          files = None,
          dist = None,
          exports = None
        )

        val libsNoPeer = packageJson.allLibs(dev = false, peer = false)
        assert(libsNoPeer.size == 1)
        assert(libsNoPeer.contains(TsIdentLibrary("lodash")))

        val libsWithPeer = packageJson.allLibs(dev = false, peer = true)
        assert(libsWithPeer.size == 2)
        assert(libsWithPeer.contains(TsIdentLibrary("lodash")))
        assert(libsWithPeer.contains(TsIdentLibrary("react")))
      }

      test("allLibs with all dependency types") {
        val deps = Map(TsIdentLibrary("lodash") -> "^4.17.21")
        val devDeps = Map(TsIdentLibrary("typescript") -> "^4.9.0")
        val peerDeps = Map(TsIdentLibrary("react") -> ">=16.0.0")
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = Some(deps),
          devDependencies = Some(devDeps),
          peerDependencies = Some(peerDeps),
          typings = None,
          module = None,
          types = None,
          files = None,
          dist = None,
          exports = None
        )

        val allLibs = packageJson.allLibs(dev = true, peer = true)
        assert(allLibs.size == 3)
        assert(allLibs.contains(TsIdentLibrary("lodash")))
        assert(allLibs.contains(TsIdentLibrary("typescript")))
        assert(allLibs.contains(TsIdentLibrary("react")))

        // Test that result is sorted
        val keys = allLibs.keys.toList
        assert(keys == keys.sorted)
      }
    }

    test("Parsing Methods") {
      test("parsedTypes with string value") {
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = None,
          devDependencies = None,
          peerDependencies = None,
          typings = None,
          module = None,
          types = Some(CirceJson.fromString("./index.d.ts")),
          files = None,
          dist = None,
          exports = None
        )

        val parsed = packageJson.parsedTypes
        assert(parsed.isDefined)
        assert(parsed.get.length == 1)
        assert(parsed.get(0) == "./index.d.ts")
      }

      test("parsedTypes with array value") {
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = None,
          devDependencies = None,
          peerDependencies = None,
          typings = None,
          module = None,
          types = Some(CirceJson.arr(
            CirceJson.fromString("./index.d.ts"),
            CirceJson.fromString("./lib/types.d.ts")
          )),
          files = None,
          dist = None,
          exports = None
        )

        val parsed = packageJson.parsedTypes
        assert(parsed.isDefined)
        assert(parsed.get.length == 2)
        assert(parsed.get.contains("./index.d.ts"))
        assert(parsed.get.contains("./lib/types.d.ts"))
      }

      test("parsedTypes with null value") {
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = None,
          devDependencies = None,
          peerDependencies = None,
          typings = None,
          module = None,
          types = Some(CirceJson.Null),
          files = None,
          dist = None,
          exports = None
        )

        val parsed = packageJson.parsedTypes
        assert(parsed.isEmpty)
      }

      test("parsedTypings with string value") {
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = None,
          devDependencies = None,
          peerDependencies = None,
          typings = Some(CirceJson.fromString("./typings/index.d.ts")),
          module = None,
          types = None,
          files = None,
          dist = None,
          exports = None
        )

        val parsed = packageJson.parsedTypings
        assert(parsed.isDefined)
        assert(parsed.get.length == 1)
        assert(parsed.get(0) == "./typings/index.d.ts")
      }

      test("parsedModules with string value") {
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = None,
          devDependencies = None,
          peerDependencies = None,
          typings = None,
          module = Some(CirceJson.fromString("./lib/index.js")),
          types = None,
          files = None,
          dist = None,
          exports = None
        )

        val parsed = packageJson.parsedModules
        assert(parsed.isDefined)
        assert(parsed.get.size == 1)
        assert(parsed.get("") == "./lib/index.js")
      }

      test("parsedModules with object value") {
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = None,
          devDependencies = None,
          peerDependencies = None,
          typings = None,
          module = Some(CirceJson.obj(
            "main" -> CirceJson.fromString("./lib/index.js"),
            "browser" -> CirceJson.fromString("./lib/browser.js")
          )),
          types = None,
          files = None,
          dist = None,
          exports = None
        )

        val parsed = packageJson.parsedModules
        assert(parsed.isDefined)
        assert(parsed.get.size == 2)
        assert(parsed.get("main") == "./lib/index.js")
        assert(parsed.get("browser") == "./lib/browser.js")
      }

      test("parsedExported with complex exports") {
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = None,
          devDependencies = None,
          peerDependencies = None,
          typings = None,
          module = None,
          types = None,
          files = None,
          dist = None,
          exports = Some(CirceJson.obj(
            "." -> CirceJson.obj(
              "types" -> CirceJson.fromString("./index.d.ts"),
              "import" -> CirceJson.fromString("./esm/index.js")
            ),
            "./utils" -> CirceJson.obj(
              "types" -> CirceJson.fromString("./utils/index.d.ts")
            )
          ))
        )

        val parsed = packageJson.parsedExported
        assert(parsed.isDefined)
        assert(parsed.get.size == 2)
        assert(parsed.get(".") == "./index.d.ts")
        assert(parsed.get("./utils") == "./utils/index.d.ts")
      }
    }

    test("Edge Cases and Boundary Conditions") {
      test("PackageJson with scoped library dependencies") {
        val deps = Map(
          TsIdentLibrary("@angular/core") -> "^15.0.0",
          TsIdentLibrary("@types/node") -> "^18.0.0", // This becomes "node"
          TsIdentLibrary("@babel/core") -> "^7.20.0"
        )
        val packageJson = PackageJson(
          version = Some("1.0.0"),
          dependencies = Some(deps),
          devDependencies = None,
          peerDependencies = None,
          typings = None,
          module = None,
          types = None,
          files = None,
          dist = None,
          exports = None
        )

        val libs = packageJson.allLibs(dev = false, peer = false)
        assert(libs.size == 3)
        assert(libs.contains(TsIdentLibrary("@angular/core")))
        assert(libs.contains(TsIdentLibrary("node"))) // @types/node -> node
        assert(libs.contains(TsIdentLibrary("@babel/core")))
      }

      test("PackageJson with empty arrays and objects") {
        val jsonStr = """{
          "version": "1.0.0",
          "dependencies": {},
          "devDependencies": {},
          "peerDependencies": {},
          "files": [],
          "types": [],
          "exports": {}
        }"""

        val result = Json.apply[PackageJson](jsonStr)

        result match {
          case Right(packageJson) =>
            assert(packageJson.version.contains("1.0.0"))
            assert(packageJson.dependencies.isDefined)
            assert(packageJson.dependencies.get.isEmpty)
            assert(packageJson.devDependencies.isDefined)
            assert(packageJson.devDependencies.get.isEmpty)
            assert(packageJson.peerDependencies.isDefined)
            assert(packageJson.peerDependencies.get.isEmpty)
            assert(packageJson.files.isDefined)
            assert(packageJson.files.get.isEmpty)
            assert(packageJson.parsedTypes.isEmpty) // Empty array filtered out
            assert(packageJson.parsedExported.isEmpty) // Empty object filtered out
          case Left(_) =>
            assert(false) // Should parse successfully
        }
      }

      test("PackageJson.Dist parsing") {
        val jsonStr = """{
          "version": "1.0.0",
          "dist": {
            "tarball": "https://registry.npmjs.org/test/-/test-1.0.0.tgz"
          }
        }"""

        val result = Json.apply[PackageJson](jsonStr)

        result match {
          case Right(packageJson) =>
            assert(packageJson.dist.isDefined)
            assert(packageJson.dist.get.tarball == "https://registry.npmjs.org/test/-/test-1.0.0.tgz")
          case Left(_) =>
            assert(false) // Should parse successfully
        }
      }
    }
  }
}