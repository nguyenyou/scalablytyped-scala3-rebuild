/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.Phase1ReadTypescript
 *
 * This phase parses files, implements the module system, and "implements" a bunch of typescript features by rewriting
 * the tree. For instance defaulted parameters are filled in. The point is to go from a complex tree to a simpler tree
 */

import { type Either, right, isLeft, isRight } from "fp-ts/Either";
import { none, isSome } from "fp-ts/Option";
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
import { TsIdentLibrarySimple } from "../ts/trees";
import { CodePath } from "../ts/CodePath";
import { Comment } from "../Comment";
import { AddComments } from "../ts/transforms/AddComments";
import { SetCodePath } from "../ts/transforms/SetCodePath";
import { InferredDefaultModule } from "../ts/modules/InferredDefaultModule";
import { InferredDependency } from "../ts/modules/InferredDependency";

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

				// Add origin comments for stdlib (simplified for now)
				const withOrigin = withExternals;

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

				// TODO: Implement file inlining logic
				const withInlined = withOrigin; // Placeholder for now

				// Set code path (simplified for now)
				const withCodePath = withInlined;

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

		// TODO: Create proxy modules from package.json exports
		const withExportedModules = flattened;

		// TODO: Filter out ignored modules
		const withFilteredModules = withExportedModules;

		// TODO: Determine stdlib dependency and declared dependencies
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
		const finished = transformations.reduce((acc: TsParsedFile, f: (file: TsParsedFile) => TsParsedFile) => f(acc), withFilteredModules);

		// Calculate library version - simplified for now
		const version = LibraryVersion.create(false, "1.0.0", null);

		return PhaseRes.Ok<LibTsSource, LibTs>(new LibTs(source, version, finished, deps));
	}

	/**
	 * Check if a library should be ignored
	 */
	private isIgnored(source: LibTsSource): boolean {
		// Check if the library name is in the ignored set
		for (const ignoredLib of this.config.ignored) {
			if (ignoredLib.value === source.libName.value) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Check if a module should be ignored based on module prefixes
	 */
	private ignoreModule(modName: TsIdentModule): boolean {
		const fragments = modName.fragments;
		for (let n = 1; n <= fragments.length; n++) {
			const prefix = fragments.slice(0, n);
			for (const ignoredPrefix of this.config.ignoredModulePrefixes) {
				if (this.arraysEqual(prefix, ignoredPrefix)) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Helper to compare arrays for equality
	 */
	private arraysEqual<T>(a: T[], b: T[]): boolean {
		return a.length === b.length && a.every((val, i) => val === b[i]);
	}

	/**
	 * Determine which files to include for processing
	 */
	private determineFilesToInclude(source: LibTsSource, logger: Logger<void>): InFile[] {
		logger.info(`Determining files to include for ${source.libName.value}`);

		// This would normally use LibraryResolver to find files
		// For testing purposes, create a mock file if the source has a folder
		if (source instanceof LibTsSource.FromFolder) {
			const mockFile = new InFile(source.folder.path + "/index.d.ts");
			return [mockFile];
		}

		return [];
	}

	/**
	 * Parse TypeScript files using the configured parser
	 */
	private parseFiles(files: InFile[], logger: Logger<void>): TsParsedFile[] {
		logger.info(`Parsing ${files.length} files`);

		const parsed: TsParsedFile[] = [];
		for (const file of files) {
			try {
				const result = this.config.parser(file);
				if (result._tag === "Right") {
					parsed.push(result.right);
				} else {
					logger.warn(`Failed to parse ${file.path}: ${result.left}`);
				}
			} catch (error) {
				logger.warn(`Error parsing ${file.path}: ${error}`);
			}
		}

		return parsed;
	}

	/**
	 * Merge multiple parsed files into a single TsParsedFile
	 */
	private mergeFiles(files: TsParsedFile[], source: LibTsSource, logger: Logger<void>): TsParsedFile {
		logger.info(`Merging ${files.length} parsed files for ${source.libName.value}`);

		if (files.length === 0) {
			return TsParsedFile.createMock();
		}

		if (files.length === 1) {
			return files[0];
		}

		// Merge all files into one
		const allMembers: TsContainerOrDecl[] = [];
		const allComments = Comments.empty();

		for (const file of files) {
			allMembers.push(...file.members);
		}

		return TsParsedFile.create(
			allComments,
			IArray.Empty, // directives
			IArray.fromArray(allMembers),
			files[0].codePath // Use first file's code path
		);
	}

	/**
	 * Apply transformation pipeline to the parsed file
	 */
	private applyTransformations(file: TsParsedFile, source: LibTsSource, logger: Logger<void>): TsParsedFile {
		logger.info(`Applying transformations for ${source.libName.value}`);

		let transformedFile = file;

		// Filter out ignored modules if configured
		if (this.config.ignoredModulePrefixes.size > 0) {
			transformedFile = this.filterIgnoredModules(transformedFile);
		}

		// Apply other transformations (placeholder for now)
		// In the real implementation, this would apply a complex pipeline of transformations

		return transformedFile;
	}

	/**
	 * Filter out modules that match ignored prefixes
	 */
	private filterIgnoredModules(file: TsParsedFile): TsParsedFile {
		const filteredMembers = file.members.toArray().filter(member => {
			// Check if member is a module declaration
			if (member._tag === "TsDeclModule") {
				const moduleDecl = member as any; // Type assertion for now
				return !this.ignoreModule(moduleDecl.name);
			}
			if (member._tag === "TsAugmentedModule") {
				const augmentedModule = member as any; // Type assertion for now
				return !this.ignoreModule(augmentedModule.name);
			}
			return true;
		});

		return TsParsedFile.create(
			file.comments,
			file.directives,
			IArray.fromArray(filteredMembers),
			file.codePath
		);
	}

	/**
	 * Calculate library version
	 */
	private calculateVersion(source: LibTsSource, file: TsParsedFile, logger: Logger<void>): LibraryVersion {
		logger.info(`Calculating version for ${source.libName.value}`);

		// Use the configured version calculator
		const sourceFolder = source.folder;
		const isStdLib = source.libName.value === "std";
		const packageJsonOpt = none; // Would be extracted from source
		const comments = file.comments;

		return this.config.calculateLibraryVersion.calculate(sourceFolder, isStdLib, packageJsonOpt, comments);
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
