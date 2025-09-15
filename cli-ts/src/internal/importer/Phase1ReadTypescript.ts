/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.Phase1ReadTypescript
 *
 * This phase parses files, implements the module system, and "implements" a bunch of typescript features by rewriting
 * the tree. For instance defaulted parameters are filled in. The point is to go from a complex tree to a simpler tree
 */

import { type Either, isLeft } from "fp-ts/Either";
import { none, isSome, some } from "fp-ts/Option";
import { SortedSet } from "../collections";
import { InFile } from "../files";
import { IArray } from "../IArray";
import { LibraryVersion } from "../LibraryVersion";
import type { Logger } from "../logging";
import { PhaseRes } from "../phases/PhaseRes";
import type { GetDeps, IsCircular } from "../phases/types";
import type { Selection } from "../Selection";
import {
	type TsIdentLibrary,
	type TsIdentModule,
	TsParsedFile,
	type TsContainerOrDecl,
	TsIdent,
	TsQIdent
} from "../ts/trees";
import { Comments } from "../Comments";
import type { CalculateLibraryVersion } from "./CalculateLibraryVersion";
import { LibraryResolver } from "./LibraryResolver";
import { LibTs } from "./LibTs";
import { LibTsSource } from "./LibTsSource";
import { PathsFromTsLibSource } from "./PathsFromTsLibSource";
import { ResolveExternalReferences } from "./ResolveExternalReferences";
import { ProxyModule } from "./ProxyModule";
import type { ResolvedModule } from "./ResolvedModule";
import { ResolvedModuleNotLocal } from "./ResolvedModule";
import { TsIdentStd } from "../ts/trees";
import { CodePath } from "../ts/CodePath";
import { Comment } from "../Comment";
import { AddComments } from "../ts/transforms/AddComments";
import { SetCodePath } from "../ts/transforms/SetCodePath";
import type { Directive } from "../ts/Directive";
import { InferredDefaultModule } from "../ts/modules/InferredDefaultModule";
import { InferredDependency } from "../ts/modules/InferredDependency";
// import { PackageJson } from "../PackageJson";

// Import all transformations
import { LibrarySpecific } from "../ts/transforms/LibrarySpecific";
import { SetJsLocationTransform } from "../ts/transforms/SetJsLocation";
import { SimplifyParentsTransform } from "../ts/transforms/SimplifyParents";
import { RemoveStubs } from "../ts/transforms/RemoveStubs";
import { InferTypeFromExprTransform } from "../ts/transforms/InferTypeFromExpr";
import { inferEnumTypes } from "../ts/transforms/InferEnumTypes";
import { NormalizeFunctions } from "../ts/transforms/NormalizeFunctions";
import { MoveStatics } from "../ts/transforms/MoveStatics";
import { QualifyReferences } from "../ts/transforms/QualifyReferences";
import { ResolveTypeQueries } from "../ts/transforms/ResolveTypeQueries";
// Import additional transformations for the complete pipeline
import { DefaultedTypeArgumentsTransform } from "../ts/transforms/DefaultedTypeArguments";
import { TypeAliasIntersectionInstance } from "../ts/transforms/TypeAliasIntersection";
import { RejiggerIntersections } from "../ts/transforms/RejiggerIntersections";
import { ExpandTypeMappingsTransform, ExpandTypeMappingsAfterTransform } from "../ts/transforms/ExpandTypeMappings";
import { TypeAliasToConstEnumInstance } from "../ts/transforms/TypeAliasToConstEnum";
import { forwardCtors } from "../ts/transforms/ForwardCtors";
import { expandTypeParams } from "../ts/transforms/ExpandTypeParams";
import { UnionTypesFromKeyOfTransform } from "../ts/transforms/UnionTypesFromKeyOf";
import { DropPropertiesTransform } from "../ts/transforms/DropProperties";
import { InferReturnTypesTransform } from "../ts/transforms/InferReturnTypes";
import { RewriteTypeThisTransform } from "../ts/transforms/RewriteTypeThis";
import { InlineConstEnumTransform } from "../ts/transforms/InlineConstEnum";
import { InlineTrivialTransform } from "../ts/transforms/InlineTrivial";
import { ResolveTypeLookups } from "../ts/transforms/ResolveTypeLookups";
import { PreferTypeAlias } from "../ts/transforms/PreferTypeAlias";
import { extractInterfaces } from "../ts/transforms/ExtractInterfaces";
import { ExtractClasses } from "../ts/transforms/ExtractClasses";
import { expandCallables } from "../ts/transforms/ExpandCallables";
import { SplitMethodsTransform } from "../ts/transforms/SplitMethods";
import { RemoveDifficultInheritance } from "../ts/transforms/RemoveDifficultInheritance";
import { VarToNamespaceTransform } from "../ts/transforms/VarToNamespace";

// Import module transformations
import { HandleCommonJsModules } from "../ts/modules/HandleCommonJsModules";
import { RewriteExportStarAs } from "../ts/modules/RewriteExportStarAs";
import { AugmentModules } from "../ts/modules/AugmentModules";
import { ReplaceExports } from "../ts/modules/ReplaceExports";
import { ModuleAsGlobalNamespace } from "../ts/modules/ModuleAsGlobalNamespace";
import { MoveGlobals } from "../ts/modules/MoveGlobals";

// Import utilities
import { FlattenTrees } from "../ts/FlattenTrees";
import { JsLocation } from "../ts/JsLocation";
import { TsTreeScope, LoopDetector } from "../ts/TsTreeScope";

/**
 * Configuration for Phase1ReadTypescript
 */
export interface Phase1Config {
	readonly resolve: LibraryResolver;
	readonly calculateLibraryVersion: CalculateLibraryVersion;
	readonly ignored: Set<TsIdentLibrary>;
	readonly ignoredModulePrefixes: Set<string[]>;
	readonly pedantic: boolean;
	readonly parser: (file: InFile) => Either<string, TsParsedFile>;
	readonly expandTypeMappings: Selection<TsIdentLibrary>;
}

/**
 * This phase parses files, implements the module system, and "implements" a bunch of typescript features by rewriting
 * the tree. For instance defaulted parameters are filled in. The point is to go from a complex tree to a simpler tree
 */
export class Phase1ReadTypescript {
	constructor(private readonly config: Phase1Config) {}

	/**
	 * Apply the phase transformation
	 */
	apply(
		source: LibTsSource,
		_input: LibTsSource,
		getDeps: GetDeps<LibTsSource, LibTs>,
		isCircular: IsCircular,
		logger: Logger<void>,
	): PhaseRes<LibTsSource, LibTs> {
		// Check if library should be ignored or is circular
		if (this.config.ignored.has(source.libName) || isCircular) {
			return PhaseRes.Ignore<LibTsSource, LibTs>();
		}

		// Determine included files based on source type
		const includedFiles: IArray<InFile> = (() => {
			if (source instanceof LibTsSource.StdLibSource) {
				return PathsFromTsLibSource.filesFrom(source.files.get(0)!.folder);
			} else if (source instanceof LibTsSource.FromFolder) {
				if (source.libName.value === "typescript") {
					// Don't include std for typescript library
					return source.shortenedFiles;
				} else {
					// There are often whole trees parallel to what is specified in `typings`
					const bound = source.shortenedFiles.length > 0
						? source.shortenedFiles.get(0)!.folder
						: source.folder;
					return PathsFromTsLibSource.filesFrom(bound);
				}
			} else {
				return IArray.Empty;
			}
		})();

		const includedViaDirective = new Set<InFile>();

		// Lazy file preparation - equivalent to Scala's lazy val preparingFiles
		const preparingFiles = new Map<InFile, () => [TsParsedFile, Set<LibTsSource>]>();

		for (const file of includedFiles.toArray().sort()) {
			preparingFiles.set(file, () => {
				const parseResult = this.config.parser(file);
				if (isLeft(parseResult)) {
					const errorMsg = parseResult.left;
					logger.fatal(`Couldn't parse ${file.path}: ${errorMsg}`);
					throw new Error(`Parse failed: ${errorMsg}`);
				}

				const parsed = parseResult.right;
				const deps = new Set<LibTsSource>();
				logger.info(`Preprocessing ${file.path}`);

				// Process directives to create toInline array - equivalent to Scala's toInline
				const toInline: Array<Either<Directive, InFile>> = [];
				for (const directive of parsed.directives.toArray()) {
					if (directive._tag === "PathRef") {
						const fileOpt = LibraryResolver.file(file.folder, directive.stringPath);
						if (isSome(fileOpt)) {
							toInline.push({ _tag: "Right", right: fileOpt.value });
						} else {
							toInline.push({ _tag: "Left", left: directive });
						}
					} else if (directive._tag === "LibRef" && source.libName.value === TsIdentStd.value) {
						const libFileName = `lib.${directive.stringPath}.d.ts`;
						const fileOpt = LibraryResolver.file(this.config.resolve.stdLib.folder, libFileName);
						if (isSome(fileOpt)) {
							toInline.push({ _tag: "Right", right: fileOpt.value });
						} else {
							toInline.push({ _tag: "Left", left: directive });
						}
					}
				}

				// Get module names for this file
				const moduleNames = LibraryResolver.moduleNameFor(source, file);

				// Infer default module if needed
				const withInferredModule = InferredDefaultModule.apply(
					parsed,
					moduleNames.get(0)!,
					logger
				);

				// Process directives for dependency resolution
				withInferredModule.directives.forEach(directive => {
					if (directive._tag === "TypesRef") {
						const resolvedModuleOpt = this.config.resolve.module(source, file.folder, directive.stringPath);
						if (isSome(resolvedModuleOpt)) {
							const resolvedModule = resolvedModuleOpt.value;
							if (resolvedModule instanceof ResolvedModuleNotLocal) {
								deps.add(resolvedModule.source);
							}
						} else {
							logger.warn(`directives: couldn't resolve ${directive.stringPath}`);
						}
					}
				});

				// Resolve external references
				const resolveResult = ResolveExternalReferences.apply(
					this.config.resolve,
					source,
					file.folder,
					withInferredModule,
					logger
				);

				const withExternals = resolveResult.transformedFile;

				// Add resolved module dependencies
				resolveResult.resolvedModules.forEach(resolvedModule => {
					if (resolvedModule instanceof ResolvedModuleNotLocal) {
						deps.add(resolvedModule.source);
					}
				});

				// Add origin comments for stdlib
				const withOrigin = (() => {
					if (source instanceof LibTsSource.StdLibSource) {
						const shortName = file.path.split('.').slice(1, -2).join('.');
						if (shortName.length > 0) {
							const stdComment = new Comments([
								Comment.create(`/* standard ${shortName} */\n`)
							]);
							return new AddComments(stdComment).visitTsParsedFile()(withExternals);
						}
					}
					return withExternals;
				})();

				// Infer additional dependencies
				const inferredDepNames = InferredDependency.apply(
					source.libName,
					withOrigin,
					resolveResult.unresolvedModules,
					logger
				);

				// Resolve inferred dependencies
				inferredDepNames.forEach(libraryName => {
					const resolvedModuleOpt = this.config.resolve.module(source, file.folder, libraryName.value);
					if (isSome(resolvedModuleOpt)) {
						const resolvedModule = resolvedModuleOpt.value;
						if (resolvedModule instanceof ResolvedModuleNotLocal) {
							deps.add(resolvedModule.source);
						}
					} else {
						logger.warn(`Couldn't resolve inferred dependency ${libraryName.value}`);
					}
				});

				// File inlining logic - equivalent to Scala's withInlined
				const withInlined: TsParsedFile = (() => {
					// Remove duplicates and process each file reference
					const uniqueToInline = Array.from(new Set(toInline.map(item => JSON.stringify(item))))
						.map(item => JSON.parse(item) as Either<Directive, InFile>);

					return uniqueToInline.reduce((parsed: TsParsedFile, item: Either<Directive, InFile>) => {
						if (item._tag === "Right") {
							const referencedFile = item.right;
							const referencedFileLogger = logger; // Simplified context

							// Get the prepared file data
							const preparer = preparingFiles.get(referencedFile);
							if (preparer) {
								try {
									const [toInlineFile, depsForInline] = preparer();

									// Check if it's a module - if so, warn and skip
									if (toInlineFile.isModule) {
										referencedFileLogger.warn("directives: referenced file was a module");
										return parsed;
									}

									// Add to included via directive and merge dependencies
									includedViaDirective.add(referencedFile);
									depsForInline.forEach(dep => deps.add(dep));

									// Merge the files
									return FlattenTrees.mergeFile(parsed, toInlineFile);
								} catch (error) {
									referencedFileLogger.warn("directives: reference caused circular graph");
									return parsed;
								}
							} else {
								referencedFileLogger.warn("directives: reference caused circular graph");
								return parsed;
							}
						} else {
							// Left case - unresolved directive
							const dir = item.left;
							logger.warn(`directives: couldn't resolve ${JSON.stringify(dir)}`);
							return parsed;
						}
					}, withOrigin);
				})();

				// Handle module aliases - equivalent to Scala's _3 variable
				const withModuleAliases: TsParsedFile = (() => {
					if (moduleNames.length === 1) {
						return withInlined;
					} else {
						// Multiple module names - add aliases to module declarations
						const updatedMembers = withInlined.members.map(member => {
							if (member._tag === "TsDeclModule") {
								const moduleDecl = member as any; // Type assertion for module
								if (moduleNames.toArray().some(name => name.value === moduleDecl.name.value)) {
									// Add module aliases as comments
									const otherNames = moduleNames.toArray().filter(name => name.value !== moduleDecl.name.value);
									if (otherNames.length > 0) {
										// This is a simplified version - in full implementation would use Marker.ModuleAliases
										const aliasComment = Comment.create(`/* Module aliases: ${otherNames.map(n => n.value).join(', ')} */`);
										const updatedComments = moduleDecl.comments.add(aliasComment);
										return { ...moduleDecl, comments: updatedComments };
									}
								}
							}
							return member;
						});
						return withInlined.withMembers(updatedMembers) as TsParsedFile;
					}
				})();

				// Set code path
				const codePath = CodePath.hasPath(source.libName, TsQIdent.empty());
				const withCodePath = new SetCodePath().visitTsParsedFile(codePath)(withModuleAliases);

				return [withCodePath, deps];
			});
		}

		// Evaluate all prepared files
		const preparedFiles: Array<[TsParsedFile, Set<LibTsSource>]> = [];
		const evaluatedFiles = new Map<InFile, [TsParsedFile, Set<LibTsSource>]>();

		if (source instanceof LibTsSource.StdLibSource) {
			// For stdlib, only include specified files
			for (const file of source.files.toArray()) {
				const preparer = preparingFiles.get(file);
				if (preparer) {
					const result = preparer();
					evaluatedFiles.set(file, result);
					if (!includedViaDirective.has(file)) {
						preparedFiles.push(result);
					}
				}
			}
		} else {
			// For regular folders, include all prepared files
			for (const [file, preparer] of preparingFiles) {
				const result = preparer();
				evaluatedFiles.set(file, result);
				if (!includedViaDirective.has(file)) {
					preparedFiles.push(result);
				}
			}
		}

		if (preparedFiles.length === 0) {
			logger.warn(`No typescript definitions files found for library ${source.libName.value}`);
			return PhaseRes.Ignore<LibTsSource, LibTs>();
		}

		// Flatten all files into a single parsed file
		const flattened = FlattenTrees.apply(IArray.fromArray(preparedFiles.map(([file]) => file)));

		// Collect all dependencies from files
		const depsFromFiles = new Set<LibTsSource>();
		preparedFiles.forEach(([, deps]) => {
			deps.forEach(dep => depsFromFiles.add(dep));
		});

		// Create proxy modules from package.json exports if available
		const withExportedModules: TsParsedFile = (() => {
			if (source.packageJsonOpt && source.packageJsonOpt.parsedExported) {
				try {
					const proxyModules = ProxyModule.fromExports(
						source,
						logger,
						this.config.resolve,
						(ident: TsIdent) => flattened.membersByName.has(ident),
						source.packageJsonOpt.parsedExported
					);

					// Add proxy modules to the flattened file
					const newMembers = IArray.fromArray(proxyModules.map(pm => pm.asModule)).concat(flattened.members);
					return flattened.withMembers(newMembers) as TsParsedFile;
				} catch (error) {
					logger.warn(`Failed to create proxy modules from exports: ${error}`);
					return flattened;
				}
			}
			return flattened;
		})();

		// Filter out ignored modules based on ignoredModulePrefixes
		const withFilteredModules: TsParsedFile = (() => {
			if (this.config.ignoredModulePrefixes.size > 0) {
				const filteredMembers = withExportedModules.members.filter(member => {
					if (member._tag === "TsDeclModule" || member._tag === "TsAugmentedModule") {
						// Type assertion to access name property
						const namedMember = member as any;
						const moduleName = namedMember.name.value;
						for (const prefix of this.config.ignoredModulePrefixes) {
							if (moduleName.startsWith(prefix)) {
								logger.info(`Filtering out ignored module: ${moduleName}`);
								return false;
							}
						}
					}
					return true;
				});
				return withExportedModules.withMembers(filteredMembers) as TsParsedFile;
			}
			return withExportedModules;
		})();

		// Simplified dependency resolution for now
		// TODO: Implement complete stdlib and package.json dependency resolution
		const allDeps = new SortedSet<LibTsSource>();
		depsFromFiles.forEach(dep => allDeps.add(dep));

		// Get dependencies and apply transformation pipeline
		const depsResult = getDeps(allDeps);
		if (depsResult._tag === "Failure") {
			return PhaseRes.Failure<LibTsSource, LibTs>(depsResult.errors);
		}
		if (depsResult._tag === "Ignore") {
			return PhaseRes.Ignore<LibTsSource, LibTs>();
		}

		const deps = depsResult.value;

		// TODO: Handle transitive dependencies properly
		const transitiveDeps = new Map<LibTsSource, TsParsedFile>();
		for (const [source, lib] of deps) {
			transitiveDeps.set(source, lib.parsed);
		}

		// TODO: Create proper TsTreeScope - simplified for now
		const scope = TsTreeScope.create(
			source.libName,
			this.config.pedantic,
			transitiveDeps,
			logger
		);

		// Determine if React is involved
		const involvesReact = source.libName.value === "react" ||
			Array.from(deps.keys()).some((s: any) => s.libName.value === "react");

		// Apply transformation pipeline
		const transformations = Phase1ReadTypescript.createPipeline(scope, source.libName, this.config.expandTypeMappings, involvesReact, logger);
		let finished = withFilteredModules;
		for (const transformation of transformations) {
			finished = transformation(finished);
		}

		// Calculate library version using the configured calculator
		const packageJsonOpt = source.packageJsonOpt ? some(source.packageJsonOpt) : none;
		const version = this.config.calculateLibraryVersion.calculate(
			source.folder,
			source instanceof LibTsSource.StdLibSource,
			packageJsonOpt,
			finished.comments
		);

		return PhaseRes.Ok<LibTsSource, LibTs>(new LibTs(source, version, finished, deps));
	}

	/**
	 * Static factory method to create Phase1ReadTypescript with configuration
	 */
	static create(config: Phase1Config): Phase1ReadTypescript {
		return new Phase1ReadTypescript(config);
	}






}

/**
 * Companion object with utility methods
 */
export namespace Phase1ReadTypescript {
	/**
	 * Create a transformation pipeline
	 * Port of the Scala Phase1ReadTypescript.Pipeline method
	 */
	export function createPipeline(
		scope: TsTreeScope.Root,
		libName: TsIdentLibrary,
		expandTypeMappings: Selection<TsIdentLibrary>,
		involvesReact: boolean,
		logger: Logger<void>,
	): ((file: TsParsedFile) => TsParsedFile)[] {
		logger.info(
			`Creating transformation pipeline for ${libName.value} (React: ${involvesReact})`,
		);

		// Create the transformation pipeline following the exact Scala sequence
		const transformations: ((file: TsParsedFile) => TsParsedFile)[] = [];

		// 1. LibrarySpecific transformations
		const librarySpecific = LibrarySpecific.apply(libName);
		if (librarySpecific) {
			transformations.push((file: TsParsedFile) => {
				logger.info("Transformation: LibrarySpecific");
				return librarySpecific.visitTsParsedFile(scope)(file);
			});
		} else {
			transformations.push((file: TsParsedFile) => {
				logger.info("Transformation: LibrarySpecific (identity)");
				return file;
			});
		}

		// 2. SetJsLocation
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: SetJsLocation");
			return SetJsLocationTransform.visitTsParsedFile(JsLocation.global(TsQIdent.empty()))(file);
		});

		// 3. Combined transformations: SimplifyParents >> RemoveStubs >> InferTypeFromExpr >> InferEnumTypes >> NormalizeFunctions >> MoveStatics
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: SimplifyParents >> RemoveStubs >> InferTypeFromExpr >> InferEnumTypes >> NormalizeFunctions >> MoveStatics");
			const scopeWithUnqualified = scope.enableUnqualifiedLookup().caching();
			let result = SimplifyParentsTransform.visitTsParsedFile(scopeWithUnqualified)(file);
			result = RemoveStubs.apply().visitTsParsedFile(scopeWithUnqualified)(result);
			result = InferTypeFromExprTransform.visitTsParsedFile(scopeWithUnqualified)(result);
			result = inferEnumTypes.visitTsParsedFile(scopeWithUnqualified)(result);
			result = NormalizeFunctions.instance.visitTsParsedFile(scopeWithUnqualified)(result);
			result = MoveStatics.instance.visitTsParsedFile(scopeWithUnqualified)(result);
			return result;
		});

		// 4. HandleCommonJsModules >> RewriteExportStarAs
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: HandleCommonJsModules >> RewriteExportStarAs");
			let result = new HandleCommonJsModules().visitTsParsedFile(scope)(file);
			result = new RewriteExportStarAs().visitTsParsedFile(scope)(result);
			return result;
		});

		// 5. QualifyReferences
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: QualifyReferences");
			const scopeWithUnqualified = scope.enableUnqualifiedLookup().caching();
			return QualifyReferences.apply(false).visitTsParsedFile(scopeWithUnqualified)(file);
		});

		// 6. AugmentModules
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: AugmentModules");
			return AugmentModules.apply(scope.caching())(file);
		});

		// 7. ResolveTypeQueries
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: ResolveTypeQueries");
			const scopeWithUnqualified = scope.enableUnqualifiedLookup().caching();
			return ResolveTypeQueries.apply().visitTsParsedFile(scopeWithUnqualified)(file);
		});

		// 8. ReplaceExports
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: ReplaceExports");
			const scopeWithUnqualified = scope.enableUnqualifiedLookup().caching();
			return new ReplaceExports(LoopDetector.initial).visitTsParsedFile(scopeWithUnqualified)(file);
		});

		// 9. ModuleAsGlobalNamespace
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: ModuleAsGlobalNamespace");
			return ModuleAsGlobalNamespace.apply(scope.libName, file);
		});

		// 10. MoveGlobals
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: MoveGlobals");
			return MoveGlobals.apply(file);
		});

		// 11. FlattenTrees
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: FlattenTrees");
			return FlattenTrees.applySingle(file);
		});

		// 12. Combined transformations: DefaultedTypeArguments >> TypeAliasIntersection >> RejiggerIntersections
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: DefaultedTypeArguments >> TypeAliasIntersection >> RejiggerIntersections");
			const scopeCaching = scope.caching();
			let result = DefaultedTypeArgumentsTransform.visitTsParsedFile(scopeCaching)(file);
			result = TypeAliasIntersectionInstance.visitTsParsedFile(scopeCaching)(result);
			result = RejiggerIntersections.apply().visitTsParsedFile(scopeCaching)(result);
			return result;
		});

		// 13. ExpandTypeMappings (conditional)
		if (expandTypeMappings.apply(libName)) {
			transformations.push((file: TsParsedFile) => {
				logger.info("Transformation: ExpandTypeMappings");
				const scopeCaching = scope.caching();
				return ExpandTypeMappingsTransform.visitTsParsedFile(scopeCaching)(file);
			});
		} else {
			transformations.push((file: TsParsedFile) => {
				logger.info("Transformation: ExpandTypeMappings (identity)");
				return file;
			});
		}

		// 14. ExpandTypeMappings.After (conditional)
		if (expandTypeMappings.apply(libName)) {
			transformations.push((file: TsParsedFile) => {
				logger.info("Transformation: ExpandTypeMappings.After");
				const scopeCaching = scope.caching();
				return ExpandTypeMappingsAfterTransform.visitTsParsedFile(scopeCaching)(file);
			});
		} else {
			transformations.push((file: TsParsedFile) => {
				logger.info("Transformation: ExpandTypeMappings.After (identity)");
				return file;
			});
		}

		// 15. Combined transformations: TypeAliasToConstEnum >> ForwardCtors >> ExpandTypeParams >> UnionTypesFromKeyOf >> DropProperties >> InferReturnTypes >> RewriteTypeThis >> InlineConstEnum >> InlineTrivial
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: TypeAliasToConstEnum >> ForwardCtors >> ExpandTypeParams >> UnionTypesFromKeyOf >> DropProperties >> InferReturnTypes >> RewriteTypeThis >> InlineConstEnum >> InlineTrivial");
			const scopeCaching = scope.caching();
			let result = TypeAliasToConstEnumInstance.visitTsParsedFile(scopeCaching)(file);
			result = forwardCtors.visitTsParsedFile(scopeCaching)(result);
			result = expandTypeParams.visitTsParsedFile(scopeCaching)(result);
			result = UnionTypesFromKeyOfTransform.visitTsParsedFile(scopeCaching)(result);
			result = DropPropertiesTransform.visitTsParsedFile(scopeCaching)(result);
			result = InferReturnTypesTransform.visitTsParsedFile(scopeCaching)(result);
			result = RewriteTypeThisTransform.visitTsParsedFile(scopeCaching)(result);
			result = InlineConstEnumTransform.visitTsParsedFile(scopeCaching)(result);
			result = InlineTrivialTransform.visitTsParsedFile(scopeCaching)(result);
			return result;
		});

		// 16. ResolveTypeLookups
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: ResolveTypeLookups");
			const scopeCaching = scope.caching();
			return ResolveTypeLookups.apply().visitTsParsedFile(scopeCaching)(file);
		});

		// 17. PreferTypeAlias
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: PreferTypeAlias");
			return PreferTypeAlias.apply(file, scope);
		});

		// 18. ExtractInterfaces
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: ExtractInterfaces");
			const scopeCaching = scope.caching();
			return extractInterfaces(libName, TsIdent.simple("anon"), scopeCaching)(file);
		});

		// 19. ExtractClasses (conditional based on React)
		if (involvesReact) {
			transformations.push((file: TsParsedFile) => {
				logger.info("Transformation: ExtractClasses (React mode)");
				const scopeCaching = scope.caching();
				return ExtractClasses.instance.visitTsParsedFile(scopeCaching)(file);
			});
		} else {
			transformations.push((file: TsParsedFile) => {
				logger.info("Transformation: ExtractClasses >> ExpandCallables");
				const scopeCaching = scope.caching();
				let result = ExtractClasses.instance.visitTsParsedFile(scopeCaching)(file);
				result = expandCallables.visitTsParsedFile(scopeCaching)(result);
				return result;
			});
		}

		// 20. Final transformations: SplitMethods >> RemoveDifficultInheritance >> VarToNamespace
		transformations.push((file: TsParsedFile) => {
			logger.info("Transformation: SplitMethods >> RemoveDifficultInheritance >> VarToNamespace");
			const scopeCaching = scope.caching();
			let result = SplitMethodsTransform.visitTsParsedFile(scopeCaching)(file);
			result = RemoveDifficultInheritance.apply().visitTsParsedFile(scopeCaching)(result);
			result = VarToNamespaceTransform.visitTsParsedFile(scopeCaching)(result);
			return result;
		});

		return transformations;
	}
}
