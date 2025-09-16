package org.scalablytyped.converter.internal
package importer

import org.scalablytyped.converter.Selection
import org.scalablytyped.converter.internal.logging.Formatter
import org.scalablytyped.converter.internal.logging.Logger
import org.scalablytyped.converter.internal.maps.*
import org.scalablytyped.converter.internal.phases.GetDeps
import org.scalablytyped.converter.internal.phases.IsCircular
import org.scalablytyped.converter.internal.phases.Phase
import org.scalablytyped.converter.internal.phases.PhaseRes
import org.scalablytyped.converter.internal.ts.TsTreeScope.LoopDetector
import org.scalablytyped.converter.internal.ts.modules.ModuleAsGlobalNamespace
import org.scalablytyped.converter.internal.ts.{transforms as T, *}

import scala.collection.immutable.SortedMap
import scala.collection.immutable.SortedSet
import scala.collection.mutable

/** This phase parses files, implements the module system, and "implements" a bunch of typescript features by rewriting
  * the tree. For instance defaulted parameters are filled in. The point is to go from a complex tree to a simpler tree
  */
class Phase1ReadTypescript(
    resolve: LibraryResolver,
    calculateLibraryVersion: CalculateLibraryVersion,
    ignored: Set[TsIdentLibrary],
    ignoredModulePrefixes: Set[List[String]],
    pedantic: Boolean,
    parser: InFile => Either[String, TsParsedFile],
    expandTypeMappings: Selection[TsIdentLibrary]
) extends Phase[LibTsSource, LibTsSource, LibTs] {

  implicit val InFileFormatter: Formatter[InFile] =
    inFile =>
      if (inFile.path.segments.length > 3)
        inFile.path.segments.toList.takeRight(3).mkString("../", "/", "")
      else inFile.path.segments.mkString("/")

  implicit val InFolderFormatter: Formatter[InFolder] =
    _.path.toString

  override def apply(
      source: LibTsSource,
      _1: LibTsSource,
      getDeps: GetDeps[LibTsSource, LibTs],
      isCircular: IsCircular,
      logger: Logger[Unit]
  ): PhaseRes[LibTsSource, LibTs] = {
    source match {
      case source if ignored(source.libName) || isCircular => PhaseRes.Ignore()
      case source =>
        val includedFiles: IArray[InFile] = Phase1ReadTypescript.determineIncludedFiles(source)

        val (preparingFiles, includedViaDirective) = Phase1ReadTypescript.createFileParsingPipeline(
          source,
          includedFiles,
          resolve,
          parser,
          logger
        )

        Phase1ReadTypescript.executePipeline(
          source,
          preparingFiles,
          includedViaDirective,
          ignoredModulePrefixes,
          resolve,
          calculateLibraryVersion,
          pedantic,
          expandTypeMappings,
          getDeps,
          logger
        )
    }
  }
}

object Phase1ReadTypescript {

  /** Determines if a module should be ignored based on configured module prefixes.
    *
    * @param modName
    *   The module identifier to check
    * @param ignoredModulePrefixes
    *   Set of module prefix patterns to ignore
    * @return
    *   true if the module should be ignored, false otherwise
    */
  def shouldIgnoreModule(modName: TsIdentModule, ignoredModulePrefixes: Set[List[String]]): Boolean =
    (1 to modName.fragments.length).exists(n => ignoredModulePrefixes(modName.fragments.take(n)))

  /** Determines which files should be included for processing based on the library source type.
    *
    * @param source
    *   The library source to determine files for
    * @return
    *   Array of files to include in processing
    */
  def determineIncludedFiles(source: LibTsSource): IArray[InFile] =
    source match {
      case LibTsSource.StdLibSource(_, files, _) =>
        PathsFromTsLibSource.filesFrom(files.head.folder)
      case f @ LibTsSource.FromFolder(
            _,
            TsIdentLibrarySimple("typescript")
          ) =>
        /* don't include std */
        f.shortenedFiles
      case f: LibTsSource.FromFolder =>
        /* There are often whole trees parallel to what is specified in `typings` (or similar). This ignores them */
        val bound =
          f.shortenedFiles.headOption.map(_.folder).getOrElse(f.folder)
        PathsFromTsLibSource.filesFrom(bound)
    }

  /** Resolves declared dependencies from package.json and determines stdlib inclusion.
    *
    * @param source
    *   The library source to resolve dependencies for
    * @param includedFiles
    *   Files that are included in processing
    * @param resolve
    *   The library resolver to use for dependency resolution
    * @param logger
    *   Logger for warnings and errors
    * @return
    *   Tuple of (optional stdlib source, set of declared dependencies)
    */
  def resolveDeclaredDependencies(
      source: LibTsSource,
      includedFiles: IArray[InFile],
      resolve: LibraryResolver,
      logger: Logger[Unit]
  ): (Option[LibTsSource], SortedSet[LibTsSource]) = {
    val stdlibSourceOpt: Option[LibTsSource] =
      if (includedFiles.exists(_.path === resolve.stdLib.path)) None
      else Option(resolve.stdLib)

    val depsDeclared: SortedSet[LibTsSource] =
      if (stdlibSourceOpt.isEmpty) SortedSet.empty
      else
        source.packageJsonOpt
          .getOrElse(PackageJson.Empty)
          .allLibs(dev = false, peer = true)
          .keySet
          .flatMap { depName =>
            resolve.library(depName) match {
              case LibraryResolver.Found(source) =>
                Some(source)
              case LibraryResolver.Ignored(_) =>
                None
              case LibraryResolver.NotAvailable(name) =>
                logger.warn(
                  s"Could not find typescript definitions for dependency ${name.value}"
                )
                None
            }
          }

    (stdlibSourceOpt, depsDeclared)
  }

  /** Creates a lazy file parsing and preprocessing pipeline for TypeScript files.
    *
    * This function sets up the complex lazy evaluation pipeline that processes TypeScript files, handling parsing,
    * directive resolution, module inference, external reference resolution, and file inlining. The lazy evaluation
    * ensures that files are only processed when needed and allows for circular reference handling.
    *
    * @param source
    *   The TypeScript library source being processed
    * @param includedFiles
    *   Array of files to be processed
    * @param resolve
    *   The library resolver for dependency and module resolution
    * @param parser
    *   Function to parse individual TypeScript files
    * @param logger
    *   Logger for recording processing information and errors
    * @return
    *   A tuple containing:
    *   - SortedMap[InFile, Lazy[(TsParsedFile, Set[LibTsSource])]]: Lazy parsers for each file
    *   - mutable.Set[InFile]: Set to track files included via directives
    */
  def createFileParsingPipeline(
      source: LibTsSource,
      includedFiles: IArray[InFile],
      resolve: LibraryResolver,
      parser: InFile => Either[String, TsParsedFile],
      logger: Logger[Unit]
  )(implicit
      inFileFormatter: Formatter[InFile]
  ): (SortedMap[InFile, Lazy[(TsParsedFile, Set[LibTsSource])]], mutable.Set[InFile]) = {
    val includedViaDirective = mutable.Set.empty[InFile]

    lazy val preparingFiles: SortedMap[InFile, Lazy[(TsParsedFile, Set[LibTsSource])]] =
      includedFiles.sorted
        .map { file =>
          file -> Lazy {
            parser(file) match {
              case Left(msg) =>
                logger.withContext(file).fatal(s"Couldn't parse: $msg")
              case Right(parsed) =>
                val deps = Set.newBuilder[LibTsSource]

                val fileLogger = logger.withContext(file)
                fileLogger.info("Preprocessing")

                val toInline: IArray[Either[Directive.Ref, InFile]] =
                  parsed.directives.collect {
                    case dir @ Directive.PathRef(stringPath) =>
                      LibraryResolver
                        .file(file.folder, stringPath)
                        .toRight(dir)
                    case dir @ Directive.LibRef(value) if source.libName === TsIdent.std =>
                      LibraryResolver
                        .file(resolve.stdLib.folder, s"lib.$value.d.ts")
                        .toRight(dir)
                  }

                val moduleNames =
                  LibraryResolver.moduleNameFor(source, file)

                val withInferredModule = modules.InferredDefaultModule(
                  parsed,
                  moduleNames.head,
                  logger
                )

                withInferredModule.directives.foreach {
                  case dir @ Directive.TypesRef(value) =>
                    resolve.module(source, file.folder, value) match {
                      case Some(ResolvedModule.NotLocal(depSource, _)) =>
                        deps += depSource
                      case Some(ResolvedModule.Local(depSource, _)) =>
                        logger.warn(
                          s"unexpected typeref from local file $depSource"
                        )
                      case _ =>
                        logger.warn(s"directives: couldn't resolve $dir")
                    }
                  case _ => ()
                }

                /* Resolve all references to other modules in `from` clauses, rename modules */
                val ResolveExternalReferences.Result(
                  withExternals,
                  resolvedModules,
                  unresolvedModules
                ) =
                  ResolveExternalReferences(
                    resolve,
                    source,
                    file.folder,
                    withInferredModule,
                    logger
                  )

                resolvedModules.foreach {
                  case ResolvedModule.NotLocal(source, _) => deps += source
                  case _                                  => ()
                }

                val withOrigin = {
                  source match {
                    case LibTsSource.StdLibSource(_, _, _) =>
                      val shortName = file.path.last
                        .split("\\.")
                        .drop(1)
                        .dropRight(2)
                        .mkString(".")
                      if (shortName.nonEmpty) {
                        val stdComment = Comments(
                          List(Comment(s"/* standard $shortName */\n"))
                        )
                        T.AddComments(stdComment)
                          .visitTsParsedFile(())(withExternals)
                      } else withExternals

                    case _ =>
                      withExternals
                  }
                }

                val inferredDepNames: Set[TsIdentLibrary] =
                  modules.InferredDependency(
                    source.libName,
                    withOrigin,
                    unresolvedModules,
                    logger
                  )

                inferredDepNames.foreach { libraryName =>
                  resolve.module(
                    source,
                    file.folder,
                    libraryName.value
                  ) match {
                    case Some(ResolvedModule.NotLocal(dep, _)) =>
                      deps += dep
                    case _ =>
                      logger.warn(
                        s"Couldn't resolve inferred dependency ${libraryName.value}"
                      )
                  }
                }

                val withInlined: TsParsedFile =
                  toInline.distinct.foldLeft(withOrigin) {
                    case (parsed, Right(referencedFile)) =>
                      val referencedFileLogger =
                        fileLogger.withContext(referencedFile)

                      preparingFiles
                        .get(referencedFile)
                        .flatMap(_.get) match {
                        case Some((toInline, depsForInline)) if !toInline.isModule =>
                          includedViaDirective += referencedFile
                          deps ++= depsForInline
                          FlattenTrees.mergeFile(parsed, toInline)
                        case Some((modFile, _)) if modFile.isModule =>
                          referencedFileLogger.warn(
                            "directives: referenced file was a module"
                          )
                          parsed
                        case _ =>
                          referencedFileLogger.warn(
                            "directives: reference caused circular graph"
                          )
                          parsed
                      }
                    case (parsed, Left(dir)) =>
                      fileLogger.warn(s"directives: couldn't resolve $dir")
                      parsed
                  }

                val _3 = moduleNames match {
                  case IArray.exactlyOne(_) => withInlined
                  case more =>
                    withInlined.copy(members = withInlined.members.map {
                      case m: TsDeclModule if more.contains(m.name) =>
                        m.copy(comments =
                          m.comments + Marker.ModuleAliases(
                            more.filterNot(_ === m.name)
                          )
                        )
                      case other => other
                    })
                }
                val _4 = T.SetCodePath.visitTsParsedFile(
                  CodePath.HasPath(source.libName, TsQIdent.empty)
                )(_3)

                (_4, deps.result())
            }
          }
        }
        .toMap
        .toSorted

    (preparingFiles, includedViaDirective)
  }

  /** Executes the complete transformation pipeline on parsed TypeScript files.
    *
    * This function orchestrates the final phase of TypeScript processing, including:
    *   - File preparation and evaluation from lazy parsers
    *   - Empty file validation and early termination
    *   - Tree flattening to combine multiple files
    *   - Dependency collection from parsed files
    *   - Export module processing from package.json exports
    *   - Module filtering based on ignored prefixes
    *   - Dependency resolution and transitive dependency calculation
    *   - Tree scope creation for type resolution
    *   - Transformation pipeline execution
    *   - Library version calculation
    *   - Final LibTs object creation
    *
    * @param source
    *   The TypeScript library source being processed
    * @param preparingFiles
    *   Lazy parsers for each file mapped by InFile
    * @param includedViaDirective
    *   Set of files included via directives (to be excluded from final output)
    * @param ignoredModulePrefixes
    *   Set of module prefix patterns to filter out
    * @param resolve
    *   Library resolver for dependency resolution
    * @param calculateLibraryVersion
    *   Function to calculate library version
    * @param pedantic
    *   Whether to use pedantic mode for type checking
    * @param expandTypeMappings
    *   Configuration for type mapping expansion
    * @param getDeps
    *   Function to resolve dependencies
    * @param logger
    *   Logger for tracking processing progress
    * @return
    *   Either a PhaseRes.Ignore if no files found, or PhaseRes containing the processed LibTs
    */
  def executePipeline(
      source: LibTsSource,
      preparingFiles: SortedMap[InFile, Lazy[(TsParsedFile, Set[LibTsSource])]],
      includedViaDirective: mutable.Set[InFile],
      ignoredModulePrefixes: Set[List[String]],
      resolve: LibraryResolver,
      calculateLibraryVersion: CalculateLibraryVersion,
      pedantic: Boolean,
      expandTypeMappings: Selection[TsIdentLibrary],
      getDeps: GetDeps[LibTsSource, LibTs],
      logger: Logger[Unit]
  ): PhaseRes[LibTsSource, LibTs] = {
    // Prepare and evaluate files from lazy parsers
    val preparedFilesOpt = prepareAndEvaluateFiles(source, preparingFiles, includedViaDirective, logger)

    val preparedFiles = preparedFilesOpt match {
      case Some(files) => files
      case None        => return PhaseRes.Ignore()
    }

    // Flatten trees and collect dependencies
    val (flattened, depsFromFiles) = flattenAndCollectDependencies(preparedFiles)

    // Process exported modules from package.json
    val withExportedModules = processExportModules(source, flattened, resolve, logger)

    // Filter modules based on ignored prefixes
    val withFilteredModules: TsParsedFile =
      if (ignoredModulePrefixes.nonEmpty) {
        val ignoreModule = (modName: TsIdentModule) => shouldIgnoreModule(modName, ignoredModulePrefixes)
        withExportedModules.copy(members = withExportedModules.members.filterNot {
          case x: TsDeclModule      => ignoreModule(x.name)
          case x: TsAugmentedModule => ignoreModule(x.name)
          case _                    => false
        })
      } else withExportedModules

    // Resolve declared dependencies
    val (stdlibSourceOpt, depsDeclared) = resolveDeclaredDependencies(
      source,
      IArray.Empty, // includedFiles not needed for this step
      resolve,
      logger
    )

    // Get dependencies and execute transformation pipeline
    getDeps(depsDeclared ++ stdlibSourceOpt ++ depsFromFiles).map { deps =>
      val transitiveDeps = deps.foldLeft(deps) { case (acc, (_, lib)) =>
        acc ++ lib.transitiveDependencies
      }
      val scope: TsTreeScope.Root =
        TsTreeScope(
          source.libName,
          pedantic,
          transitiveDeps.map { case (source, lib) => source -> lib.parsed },
          logger
        )

      val involvesReact = {
        val react = TsIdentLibrarySimple("react")
        source.libName === react || deps.exists { case (s, _) =>
          s.libName === react
        }
      }
      val finished = Pipeline(scope, source.libName, expandTypeMappings, involvesReact)
        .foldLeft(withFilteredModules) { case (acc, f) => f(acc) }

      val version = calculateLibraryVersion(
        source.folder,
        source.isInstanceOf[LibTsSource.StdLibSource],
        source.packageJsonOpt,
        finished.comments
      )

      LibTs(source)(version, finished, deps)
    }
  }

  /** Prepares and evaluates files from lazy parsers, handling different source types.
    *
    * This function processes the lazy evaluation map to produce actual parsed files, handling the differences between
    * StdLibSource (which only processes specific files) and FromFolder sources (which process all available files). It
    * also excludes files that were included via directive.
    *
    * @param source
    *   The TypeScript library source being processed
    * @param preparingFiles
    *   Map of files to their lazy parsers
    * @param includedViaDirective
    *   Set of files included via directive (to be excluded)
    * @param logger
    *   Logger for recording processing events
    * @return
    *   Array of prepared files with their dependencies, or None if no files found
    */
  def prepareAndEvaluateFiles(
      source: LibTsSource,
      preparingFiles: SortedMap[InFile, Lazy[(TsParsedFile, Set[LibTsSource])]],
      includedViaDirective: mutable.Set[InFile],
      logger: Logger[Unit]
  ): Option[IArray[(TsParsedFile, Set[LibTsSource])]] = {
    // Prepare files by evaluating lazy parsers
    val preparedFiles: IArray[(TsParsedFile, Set[LibTsSource])] = {
      // evaluate all, don't refactor and combine this with other steps
      val base: SortedMap[InFile, (TsParsedFile, Set[LibTsSource])] =
        source match {
          case LibTsSource.StdLibSource(_, files, _) =>
            val b =
              SortedMap.newBuilder[InFile, (TsParsedFile, Set[LibTsSource])]
            files.foreach { file =>
              for {
                found     <- preparingFiles.get(file)
                evaluated <- found.get
              } b += ((file, evaluated))
            }
            b.result()
          case LibTsSource.FromFolder(_, _) =>
            preparingFiles.mapNotNone { case (_, v) => v.get }
        }

      base.flatMapToIArray {
        case (file, _) if includedViaDirective(file) => Empty
        case (_, fileResult)                         => IArray(fileResult)
      }
    }

    // Check if any files were found
    if (preparedFiles.isEmpty) {
      logger.warn(
        s"No typescript definitions files found for library ${source.libName.value}"
      )
      None
    } else {
      Some(preparedFiles)
    }
  }

  /** Flattens parsed files and collects dependencies from file results.
    *
    * This function takes the prepared files and performs tree flattening to create a single unified parsed file, while
    * also collecting all dependencies that were discovered during file parsing.
    *
    * @param preparedFiles
    *   Array of prepared files with their dependencies
    * @return
    *   Tuple containing the flattened parsed file and collected dependencies
    */
  def flattenAndCollectDependencies(
      preparedFiles: IArray[(TsParsedFile, Set[LibTsSource])]
  ): (TsParsedFile, Set[LibTsSource]) = {
    // Flatten trees and collect dependencies
    val flattened = FlattenTrees(preparedFiles.map(_._1))
    val depsFromFiles = preparedFiles.foldLeft(Set.empty[LibTsSource]) { case (acc, (_, deps)) =>
      acc ++ deps
    }

    (flattened, depsFromFiles)
  }

  /** Processes package.json exports and creates proxy modules.
    *
    * This function handles the processing of package.json exports field to create proxy modules that re-export content
    * from other modules. It integrates these proxy modules into the existing flattened file structure.
    *
    * @param source
    *   The library source containing package.json information
    * @param flattened
    *   The flattened parsed file to add proxy modules to
    * @param resolve
    *   Library resolver for module resolution
    * @param logger
    *   Logger for reporting
    * @return
    *   The parsed file with proxy modules added from exports
    */
  def processExportModules(
      source: LibTsSource,
      flattened: TsParsedFile,
      resolve: LibraryResolver,
      logger: Logger[Unit]
  ): TsParsedFile = {
    source.packageJsonOpt.flatMap(_.parsedExported).foldLeft(flattened) { case (file, exports) =>
      val proxyModules = ProxyModule.fromExports(
        source,
        logger,
        resolve,
        existing = file.membersByName.contains,
        exports
      )
      file.copy(members =
        IArray
          .fromTraversable(proxyModules)
          .map(_.asModule) ++ file.members
      )
    }
  }

  def Pipeline(
      scope: TsTreeScope.Root,
      libName: TsIdentLibrary,
      expandTypeMappings: Selection[TsIdentLibrary],
      involvesReact: Boolean
  ): List[TsParsedFile => TsParsedFile] =
    List(
      T.LibrarySpecific(libName)
        .fold[TsParsedFile => TsParsedFile](identity)(
          _.visitTsParsedFile(scope)
        ),
      T.SetJsLocation.visitTsParsedFile(JsLocation.Global(TsQIdent.empty)),
      (T.SimplifyParents >>
        T.RemoveStubs >> // before HandleCommonJsModules and QualifyReferences
        T.InferTypeFromExpr >>
        T.InferEnumTypes /* before InlineConstEnum */ >>
        T.NormalizeFunctions /* before FlattenTrees */ >>
        T.MoveStatics).visitTsParsedFile(scope.enableUnqualifiedLookup.caching),
      (modules.HandleCommonJsModules >> modules.RewriteExportStarAs)
        .visitTsParsedFile(scope), // before QualifyReferences
      new T.QualifyReferences(skipValidation = false)
        .visitTsParsedFile(scope.enableUnqualifiedLookup.caching),
      modules.AugmentModules(scope.caching),
      T.ResolveTypeQueries.visitTsParsedFile(
        scope.enableUnqualifiedLookup.caching
      ), // before ReplaceExports
      new modules.ReplaceExports(LoopDetector.initial)
        .visitTsParsedFile(scope.enableUnqualifiedLookup.caching),
      file => ModuleAsGlobalNamespace(scope.root.libName, file),
      modules.MoveGlobals.apply,
      FlattenTrees.apply,
      (
        T.DefaultedTypeArguments >>  // after FlattenTrees
          T.TypeAliasIntersection >> // before ExpandTypeMappings
          T.RejiggerIntersections
      ).visitTsParsedFile(scope.caching),
      if (expandTypeMappings(libName))
        T.ExpandTypeMappings.visitTsParsedFile(scope.caching)
      else identity, // before ExtractInterfaces
      if (expandTypeMappings(libName))
        T.ExpandTypeMappings.After.visitTsParsedFile(scope.caching)
      else identity, // before ExtractInterfaces
      (
        T.TypeAliasToConstEnum >>
          T.ForwardCtors >>
          T.ExpandTypeParams >>
          T.UnionTypesFromKeyOf >>
          T.DropProperties >>
          T.InferReturnTypes >>
          T.RewriteTypeThis >>
          T.InlineConstEnum >>
          T.InlineTrivial
      ).visitTsParsedFile(scope.caching),
      T.ResolveTypeLookups
        .visitTsParsedFile(
          scope.caching
        ), // before ExpandCallables and ExtractInterfaces, after InlineTrivialTypeAlias and ExpandKeyOfTypeParams
      x => T.PreferTypeAlias(x, scope), // before extract interfaces
      T.ExtractInterfaces(
        libName,
        TsIdent("anon"),
        scope.caching
      ), // before things which break initial ordering of members, like `ExtractClasses`
      (
        if (involvesReact) T.ExtractClasses
        else T.ExtractClasses >> T.ExpandCallables
      ).visitTsParsedFile(scope.caching),
      (T.SplitMethods /* after ExpandCallables */ >>
        T.RemoveDifficultInheritance >>
        T.VarToNamespace // after ExtractClasses
      ).visitTsParsedFile(scope.caching)
    )
}
