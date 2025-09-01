package org.scalablytyped.converter.cli

import org.scalablytyped.converter.Flavour
import org.scalablytyped.converter.Selection
import org.scalablytyped.converter.internal.IArray
import org.scalablytyped.converter.internal.InFolder
import org.scalablytyped.converter.internal.Json
import org.scalablytyped.converter.internal.constants
import org.scalablytyped.converter.internal.files
import org.scalablytyped.converter.internal.importer.Bootstrap
import org.scalablytyped.converter.internal.importer.ConversionOptions
import org.scalablytyped.converter.internal.importer.EnabledTypeMappingExpansion
import org.scalablytyped.converter.internal.importer.LibScalaJs
import org.scalablytyped.converter.internal.importer.LibTsSource
import org.scalablytyped.converter.internal.importer.PersistingParser
import org.scalablytyped.converter.internal.importer.Phase1ReadTypescript
import org.scalablytyped.converter.internal.importer.Phase2ToScalaJs
import org.scalablytyped.converter.internal.importer.PhaseFlavour
import org.scalablytyped.converter.internal.logging.*
import org.scalablytyped.converter.internal.maps.*
import org.scalablytyped.converter.internal.phases.PhaseListener
import org.scalablytyped.converter.internal.phases.PhaseRes
import org.scalablytyped.converter.internal.phases.PhaseRunner
import org.scalablytyped.converter.internal.phases.RecPhase
import org.scalablytyped.converter.internal.scalajs.Minimization
import org.scalablytyped.converter.internal.scalajs.Name
import org.scalablytyped.converter.internal.scalajs.PackageTree
import org.scalablytyped.converter.internal.scalajs.ParentsResolver
import org.scalablytyped.converter.internal.scalajs.Printer
import org.scalablytyped.converter.internal.scalajs.QualifiedName
import org.scalablytyped.converter.internal.scalajs.TreeScope
import org.scalablytyped.converter.internal.scalajs.Versions
import org.scalablytyped.converter.internal.ts.CalculateLibraryVersion.PackageJsonOnly
import org.scalablytyped.converter.internal.ts.PackageJson
import org.scalablytyped.converter.internal.ts.TsIdentLibrary

import scala.collection.immutable.SortedSet

object Tracing {
  private val inDirectory = os.pwd
  private val sourceOutputDir     = os.pwd / "generated-sources"
  private val paths          = new Paths(inDirectory)
  private val parseCachePath      = Some(files.existing(constants.defaultCacheFolder / "parse").toNIO)

  val logger: Logger[(Array[Logger.Stored], Unit)] =
    storing().zipWith(stdout.filter(LogLevel.warn))

  // Execution logger for comprehensive logging
  private val executionLogger = ExecutionLogger(inDirectory, sourceOutputDir)

  private val DefaultOptions = ConversionOptions(
    useScalaJsDomTypes = true,
    outputPackage = Name.typings,
    flavour = Flavour.Normal,
    enableScalaJsDefined = Selection.All,
    ignored = SortedSet("typescript"),
    stdLibs = SortedSet("es6"),
    versions = Versions(Versions.Scala3, Versions.ScalaJs1),
    expandTypeMappings = EnabledTypeMappingExpansion.DefaultSelection,
    enableLongApplyMethod = false,
    privateWithin = None,
    useDeprecatedModuleNames = false
  )

  def main(args: Array[String]): Unit = System.exit(mainNoExit())

  private def mainNoExit(): Int = {
    // Note: args parameter is currently unused but kept for future CLI argument parsing
    // Initialize execution logging
    executionLogger.initializeExecutionLog()

    try {
      executionLogger.logStep("Initializing converter and reading configuration")
      val packageJsonPath = paths.packageJson.getOrElse(sys.error(s"${inDirectory} does not contain package.json"))
      val nodeModulesPath = paths.node_modules.getOrElse(sys.error(s"${inDirectory} does not contain node_modules"))
      val packageJson: PackageJson = Json.force[PackageJson](packageJsonPath)
      executionLogger.logProgress(s"Found package.json at: $packageJsonPath")
      executionLogger.logProgress(s"Found node_modules at: $nodeModulesPath")

      val wantedLibs: SortedSet[TsIdentLibrary] = {
        val fromPackageJson = packageJson.allLibs(false, peer = true).keySet
        executionLogger.logProgress(s"Libraries found in package.json: ${fromPackageJson.map(_.value).mkString(", ")}")
        require(fromPackageJson.nonEmpty, "No libraries found in package.json")
        val ret = fromPackageJson -- DefaultOptions.ignoredLibs
        executionLogger.logProgress(s"Libraries after filtering ignored: ${ret.map(_.value).mkString(", ")}")
        require(ret.nonEmpty, "All libraries in package.json ignored")
        ret
      }

      executionLogger.logStep("Bootstrapping TypeScript environment")
      executionLogger.logProgress(s"Standard library configuration: ${DefaultOptions.stdLibs.mkString(", ")}")
      val bootstrapped: Bootstrap.Bootstrapped =
        Bootstrap.fromNodeModules(InFolder(nodeModulesPath), DefaultOptions, wantedLibs)
      executionLogger.logProgress(
        s"Bootstrap completed, found ${bootstrapped.libraryResolver.stdLib.libName.value} as stdlib"
      )

      val sources: Vector[LibTsSource] = {
        bootstrapped.initialLibs match {
          case Left(unresolved) =>
            executionLogger.logError(s"Failed to resolve initial libraries: ${unresolved.msg}")
            sys.error(unresolved.msg)
          case Right(initial) => initial
        }
      }

      executionLogger.logProgress(s"Initial sources from bootstrap: ${sources.map(_.libName.value).mkString(", ")}")
      executionLogger.logProgress(s"Converting ${sources.map(_.libName.value).mkString(", ")} to scalajs...")

      val cachedParser = PersistingParser(parseCachePath, bootstrapped.inputFolders, logger.void)

      executionLogger.logStep("Setting up TypeScript parsing phase")
      val phase1 = new Phase1ReadTypescript(
        resolve = bootstrapped.libraryResolver,
        calculateLibraryVersion = PackageJsonOnly,
        ignored = DefaultOptions.ignoredLibs,
        ignoredModulePrefixes = DefaultOptions.ignoredModulePrefixes,
        pedantic = false,
        parser = cachedParser,
        expandTypeMappings = DefaultOptions.expandTypeMappings
      )
      executionLogger.logProgress("TypeScript parsing phase configured")

      executionLogger.logStep("Setting up Scala.js conversion phase")
      val phase2 = new Phase2ToScalaJs(
        pedantic = false,
        scalaVersion = DefaultOptions.versions.scala,
        enableScalaJsDefined = DefaultOptions.enableScalaJsDefined,
        outputPkg = DefaultOptions.outputPackage,
        flavour = DefaultOptions.flavourImpl,
        useDeprecatedModuleNames = DefaultOptions.useDeprecatedModuleNames
      )
      executionLogger.logProgress("Scala.js conversion phase configured")

      executionLogger.logStep("Setting up flavour transformation phase")
      val phase3 = new PhaseFlavour(DefaultOptions.flavourImpl, maybePrivateWithin = DefaultOptions.privateWithin)
      executionLogger.logProgress(s"Flavour transformation phase configured: ${phase3}")

      executionLogger.logStep("Creating conversion pipeline")
      val pipeline: RecPhase[LibTsSource, LibScalaJs] = RecPhase[LibTsSource]
        .next(phase1, "typescript")
        .next(phase2, "scala.js")
        .next(phase3, DefaultOptions.flavour.toString)
      executionLogger.logProgress("Conversion pipeline created successfully")

      val NoListener: PhaseListener[LibTsSource] = (_, _, _) => ()

      executionLogger.logStep("Processing libraries through pipeline")
      executionLogger.logProgress(
        s"Processing ${sources.size} libraries: ${sources.map(_.libName.value).mkString(", ")}"
      )

      val importedLibs: Map[LibTsSource, PhaseRes[LibTsSource, LibScalaJs]] =
        sources
          .map(s => {
            executionLogger.logProgress(s"Processing library ${s.libName.value}")
            val result = PhaseRunner(pipeline, (_: LibTsSource) => logger.void, NoListener)(s)
            executionLogger.logProgress(s"Result for ${s.libName.value}: ${result.getClass.getSimpleName}")
            (s: LibTsSource) -> result
          })
          .toMap

      executionLogger.logProgress(s"Pipeline processing completed. Processed ${importedLibs.size} libraries")
      importedLibs.foreach { case (source, result) =>
        executionLogger.logProgress(s"  ${source.libName.value} -> ${result.getClass.getSimpleName}")
      }

      executionLogger.logStep("Processing results and generating Scala files")
      PhaseRes.sequenceMap(importedLibs.toSorted) match {
        case PhaseRes.Ok(LibScalaJs.Unpack(libs)) =>
          executionLogger.logProgress(s"Successfully processed ${libs.size} libraries")

          executionLogger.logStep("Creating global scope for all libraries")
          val globalScope = new TreeScope.Root(
            DefaultOptions.outputPackage,
            Name.dummy,
            libs.map { case (_, l) => (l.scalaName, l.packageTree) },
            logger.void,
            false
          )
          executionLogger.logProgress("Global scope created successfully")

          // Static minimization policy applied to every run
          val minimizes =
            List("quill", "clsx", "scroll-into-view-if-needed", "tabulator-tables").map(TsIdentLibrary.apply)
          val staticMinimize: Selection[TsIdentLibrary] = Selection.AllExcept(minimizes*)
          val staticMinimizeKeep: IArray[QualifiedName] = IArray.Empty

          // Compute shared keep index for minimization (only if needed)
          lazy val referencesToKeep: Minimization.KeepIndex = {
            val packagesWithShouldMinimize: IArray[(PackageTree, Boolean)] =
              IArray.fromTraversable(libs).map { case (s, l) => (l.packageTree, staticMinimize(s.libName)) }

            Minimization.findReferences(globalScope, staticMinimizeKeep, packagesWithShouldMinimize)
          }

          executionLogger.logStep("Generating source files")
          val allGeneratedFiles: Iterator[(os.Path, String)] = libs.iterator.flatMap { case (source, lib) =>
            val willMinimize = staticMinimize(source.libName)
            val treeToPrint =
              if (willMinimize) Minimization(globalScope, referencesToKeep, logger.void, lib.packageTree)
              else lib.packageTree

            val scalaFiles = Printer(
              globalScope,
              new ParentsResolver,
              treeToPrint,
              DefaultOptions.outputPackage,
              DefaultOptions.versions.scala
            )

            val targetFolder = sourceOutputDir / source.libName.value
            val minimizedMsg = if (willMinimize) "minimized " else ""
            executionLogger.logProgress(
              s"Writing ${minimizedMsg}${source.libName.value} (${scalaFiles.length} files) to $targetFolder..."
            )
            scalaFiles.map { case (relPath, content) =>
              (targetFolder / relPath, content)
            }.iterator
          }

          executionLogger.logStep("Writing files to disk")
          val writtenFiles = allGeneratedFiles.map { case (path, content) =>
            files.softWrite(path) { writer =>
              writer.write(content)
            }
            path
          }.toSet

          executionLogger.logProgress(
            s"Successfully generated ${writtenFiles.size} Scala source files to $sourceOutputDir"
          )
          executionLogger.finalizeExecutionLog(success = true)
          0

        case PhaseRes.Failure(errors) =>
          executionLogger.logError("Pipeline failed with errors:")
          errors.foreach {
            case (source, Left(throwable)) =>
              executionLogger.logError(s"  ${source.libName.value}: ${throwable.getMessage}", Some(throwable))
            case (source, Right(message)) =>
              executionLogger.logError(s"  ${source.libName.value}: $message")
          }
          executionLogger.finalizeExecutionLog(success = false)
          1

        case PhaseRes.Ignore() =>
          executionLogger.logWarning("Pipeline ignored all sources")
          executionLogger.finalizeExecutionLog(success = true)
          0
      }
    } catch {
      case ex: Exception =>
        executionLogger.logError(s"Execution failed with exception: ${ex.getMessage}", Some(ex))
        executionLogger.finalizeExecutionLog(success = false)
        throw ex
    }
  }
}