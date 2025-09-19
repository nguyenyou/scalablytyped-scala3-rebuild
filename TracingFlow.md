# Tracing Run Story

## 1. Waking Up In `Tracing.scala`
Our story begins inside `cli/src/org/scalablytyped/converter/cli/Tracing.scala`. The CLI wakes up, opens its
`ExecutionLogger`, and double-checks the workspace: `package.json`, `node_modules`, and the output directory for the
Scala files it will eventually craft. It loads a bundle of _default options_ (preferred Scala version, flavour, ignored
libraries) that guide every decision downstream.

Armed with configuration, the tracer asks `package.json` which libraries need attention, filters out anything explicitly
ignored, and insists that at least one survivor remains. These names become the cast of libraries the pipeline will need
later on.

## 2. Bootstrapping The TypeScript World
Next, `Tracing` calls `Bootstrap.fromNodeModules`. Bootstrap wanders through `node_modules` (and the `@types` alley)
looking for `.d.ts` files. It discovers the TypeScript standard library, builds a `LibraryResolver` that knows how to
map module names to concrete files, and returns the list of requested libraries as `LibTsSource`s. If anything cannot be
found, the show stops early with a clear error message.

The tracer also assembles a `PersistingParser`, pointing it at a cache folder so that parsed TypeScript files can be
reused on future runs. This parser is handed to the first phase so that raw `.d.ts` reads are fast and reproducible.

## 3. Weaving The Pipeline
With sources and tools ready, `Tracing` declares three sequential phases using the `RecPhase` builder:

1. `Phase1ReadTypescript` – parse and normalise the TypeScript universe.
2. `Phase2ToScalaJs` – translate that cleaned AST into Scala.js structures.
3. `PhaseFlavour` – apply flavour-specific polish (naming tweaks, privateWithin, mangling, sorting).

`RecPhase` composes these transforms, and `PhaseRunner` will execute them. `PhaseRunner` is more than a simple loop: it
caches results, notices circular dependencies, and lets each phase request additional libraries via `GetDeps` whenever a
new import is discovered mid-flight.

## 4. Processing Each Library
For every `LibTsSource` returned by bootstrap, `Tracing` instantiates a `PhaseRunner`. The runner starts at phase 1, then
pushes the partially transformed value forward. Outcomes are wrapped in `PhaseRes`: success (`Ok`), ignored, or failure.
Whenever a phase realises it needs another library (for example because of a `/// <reference>` directive), it asks the
runner for help; the runner pauses the current id, resolves the dependency through the same pipeline, then resumes.

Successful runs eventually reach the Scala.js side. After the last phase, `Tracing` unwraps the map of `LibScalaJs`
artifacts, creates a global `TreeScope`, optionally minimises some bundles, prints the Scala sources with `Printer`, and
writes them under `generated-sources/<lib-name>`. Success and failure are both recorded through `ExecutionLogger` so the
run can be replayed by reading `execution-logs.txt`.

## 5. Phase 1 – Learning To Read TypeScript
The heart of the story lies in `cli/src/org/scalablytyped/converter/internal/importer/Phase1ReadTypescript.scala`. Its
job: start from a `LibTsSource` ("here are the folders for this library") and manufacture a `LibTs` object that bundles:

- the cleaned and flattened TypeScript AST (`TsParsedFile`),
- the library version string,
- and a map of dependency libraries that must be processed before Scala translation.

Phase 1 unfolds in several acts:

### 5.1 Choosing Which Files To Read
`determineIncludedFiles` inspects the source. For the stdlib it selects the configured `lib.*.d.ts` files. For third
party packages it respects `package.json` hints such as `types`, `typings`, or `module` entries and avoids wandering into
irrelevant sibling trees.

### 5.2 Building A Lazy Parsing Pipeline
`createFileParsingPipeline` constructs a `SortedMap[InFile, Lazy[(TsParsedFile, Set[LibTsSource])]]`. Each entry defers
parsing until the moment the content is actually needed, which keeps circular references manageable. While preparing a
file it notes any additional `.d.ts` file pulled in via `/// <reference path="…" />`; those paths are revisited later so
we can inline their declarations.

### 5.3 Processing A Single File
`processFileWithDependencies` is the workhorse. For each file it:

- Parses the file and logs progress.
- Infers a default module name (using `LibraryResolver.moduleNameFor`), attaching `Marker.ModuleAliases` when multiple
  names apply.
- Collects `/// <reference types="…" />` directives, resolves them to other libraries via `LibraryResolver.module`, and
  records the resulting dependencies.
- Resolves imports/exports through `ResolveExternalReferences`, turning module specifiers into concrete files or
  non-local libraries. Any unresolved module names feed into `modules.InferredDependency` to guess additional packages.
- Adds friendly comments to standard-library files so the origin is preserved downstream.
- Inlines the content of referenced files (unless doing so would cause an infinite loop) and keeps track of which files
  were brought in this way.
- Marks the code path with `T.SetCodePath`, ensuring later phases know where declarations originated.

The method returns both the transformed file and the set of `LibTsSource` dependencies discovered along the way.

### 5.4 Driving The Whole Library
`executePipeline` pulls the lazy map together:

1. `prepareAndEvaluateFiles` evaluates the lazies, drops anything already inlined, and warns if no definitions were
   found.
2. `flattenAndCollectDependencies` merges the file fragments into a single `TsParsedFile` and accumulates their
   dependency sets.
3. `processExportModules` inspects `package.json` exports and synthesises proxy modules so the Scala side sees them.
4. `filterIgnoredModules` removes modules whose names match configured ignore prefixes.
5. `resolveDeclaredDependencies` reads `package.json` dependencies, possibly adding the standard library.
6. The phase requests those dependencies via `getDeps`, causing `PhaseRunner` to recursively process prerequisite
   libraries before we continue.
7. `executeTransformationPipeline` performs a long sequence of TypeScript tree rewrites: normalising functions, handling
   CommonJS semantics, qualifying references, expanding type mappings when requested, extracting interfaces/classes, and
   generally simplifying the AST into a Scala-friendly shape. A temporary `TsTreeScope` is assembled to aid name and type
   resolution during these passes.
8. Finally, `createLibraryWithVersion` calculates the version (mixing `package.json` and comment hints) and packages
   everything into a `LibTs`.

The resulting `LibTs` is emitted as a `PhaseRes.Ok` value, ready for phase 2.

## 6. Phase 2 – Translating To Scala.js
`Phase2ToScalaJs` consumes the `LibTs` plus its resolved dependencies. It constructs a `TreeScope.Root`, decides on the
Scala package name (`ImportName`), and builds importer helpers (`ImportTree`, `ImportType`, `AdaptiveNamingImport`). The
bulk of the phase is a series of Scala.js transforms: combining modules, deduplicating members, rewriting unions, dealing
with Scala.js erasure edge cases, and generating companion objects where needed. The output is a `LibScalaJs` containing a
`PackageTree` plus transformed dependency map.

## 7. Phase 3 – Applying Flavour
Finally, `PhaseFlavour` gives the library its finishing touches. Depending on the selected flavour it may rewrite pieces
of the tree, mangle names, apply a `privateWithin`, and sort declarations for stable output. This phase also replays the
phase-runner dependency dance so flavour customisations observe the already-converted neighbours.

## 8. The Finale – Printing And Logging
Back in `Tracing.scala`, the completed `LibScalaJs` instances are gathered. A global `TreeScope.Root` is created so
minimisation can analyse cross-library references. Certain libraries are always minimised to trim generated code. `Printer`
then turns package trees into `.scala` source strings, which are written under `generated-sources`. Every step — success or
failure — is recorded in `execution-logs.txt`, so the whole adventure can be replayed later.

Read this file top-to-bottom and you can follow the same path the CLI walks: from waking up, through TypeScript
exploration, into Scala.js land, and finally to tidy generated sources on disk.
