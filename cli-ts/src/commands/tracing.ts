import * as path from "node:path";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as fs from "fs-extra";
import { Flavour } from "@/Flavour.ts";
import { InFolder } from "@/internal/files.ts";
import {
	Bootstrap,
	type Bootstrapped,
	type Unresolved,
} from "@/internal/importer/Bootstrap.ts";
import { MockCalculateLibraryVersion } from "@/internal/importer/CalculateLibraryVersion.js";
import {
	ConversionOptions,
	Versions,
} from "@/internal/importer/ConversionOptions.ts";
import { NormalFlavourImpl } from "@/internal/importer/FlavourImpl.js";
import { Json, type LibTsSource } from "@/internal/importer/LibTsSource.js";
import { Phase1ReadTypescript } from "@/internal/importer/Phase1ReadTypescript.js";
import { Phase2ToScalaJs } from "@/internal/importer/Phase2ToScalaJs.js";
import { PhaseFlavour } from "@/internal/importer/PhaseFlavour.js";
import type { Logger } from "@/internal/logging/index.js";
import { CollectingPhaseListener } from "@/internal/phases/PhaseListener.js";
import {
	Formatters,
	Orderings,
	PhaseRunner,
} from "@/internal/phases/PhaseRunner.js";
import { RecPhase } from "@/internal/phases/RecPhase.js";
import { Selection } from "@/internal/Selection.ts";
import { Name } from "@/internal/scalajs/Name.ts";
import { PackageJson } from "@/internal/ts/PackageJson.js";
import { type TsIdentLibrary, TsParsedFile } from "@/internal/ts/trees.js";
import { ExecutionLogger } from "@/utils/ExecutionLogger.js";
import { Paths } from "@/utils/paths.js";
import { BaseCommand, type CommandOptions } from "./base-command.js";

/**
 * Main conversion command - equivalent to Scala Tracing.scala
 * Converts TypeScript definitions to Scala.js sources
 */
export class TracingCommand extends BaseCommand {
	private readonly inDirectory: string;
	private readonly sourceOutputDir: string;
	private readonly paths: Paths;
	private readonly executionLogger: ExecutionLogger;

	private readonly DefaultOptions = new ConversionOptions(
		true,
		Flavour.Normal,
		Name.typings,
		new Set(["es6"]),
		Selection.All(),
		Selection.All(),
		new Set(),
		new Versions(Versions.Scala3, Versions.ScalaJs1),
		false,
		undefined,
		false,
	);

	constructor(options: CommandOptions) {
		super(options);
		this.inDirectory = process.cwd();
		this.sourceOutputDir = path.resolve(
			options.output || "./generated-sources",
		);
		this.paths = new Paths(this.inDirectory);
		this.executionLogger = ExecutionLogger.create(
			this.inDirectory,
			this.sourceOutputDir,
		);
	}

	async execute(): Promise<void> {
		this.info("Starting TypeScript to Scala.js conversion...");

		try {
			// Initialize execution logging
			await this.executionLogger.initializeExecutionLog();

			// Step 0: Validate environment
			await this.validateEnvironment();

			const packageJsonPath = this.paths.packageJson;
			// TypeScript equivalent of: val packageJson: PackageJson = Json.force[PackageJson](packageJsonPath)
			const packageJson: PackageJson = Json.force(packageJsonPath, (obj) =>
				PackageJson.fromObject(obj),
			);

			// TypeScript equivalent of: val wantedLibs: SortedSet[TsIdentLibrary] = packageJson.allLibs(false, peer = true).keySet
			const wantedLibs: Set<TsIdentLibrary> = new Set(
				packageJson.allLibs(false, true).keys(),
			);

			this.executionLogger.logStep("Bootstrapping TypeScript environment");
			this.executionLogger.logProgress(
				`Standard library configuration: ${Array.from(this.DefaultOptions.stdLibs).join(", ")}`,
			);

			const bootstrapped: Bootstrapped = Bootstrap.fromNodeModules(
				new InFolder(this.paths.nodeModules),
				this.DefaultOptions,
				wantedLibs,
			);

			this.executionLogger.logProgress(
				`Bootstrap completed, found ${bootstrapped.libraryResolver.stdLib.libName.value} as stdlib`,
			);

			// Convert the Scala Either pattern matching to fp-ts Either with fold
			const sources: LibTsSource[] = pipe(
				bootstrapped.initialLibs,
				E.fold(
					(unresolved: Unresolved) => {
						this.executionLogger.logError(
							`Failed to resolve initial libraries: ${unresolved.msg}`,
						);
						throw new Error(unresolved.msg);
					},
					(initial: LibTsSource[]) => initial,
				),
			);

			this.executionLogger.logProgress(
				`Initial sources from bootstrap: ${sources.map((s) => s.libName.value).join(", ")}`,
			);
			this.executionLogger.logProgress(
				`Converting ${sources.map((s) => s.libName.value).join(", ")} to scalajs...`,
			);

			// Execute the three-phase pipeline
			await this.executeThreePhasePipeline(sources, bootstrapped);

			// Finalize execution log on success
			await this.executionLogger.finalizeExecutionLog(true);
		} catch (error) {
			this.failSpinner("Conversion failed");
			await this.executionLogger.finalizeExecutionLog(false);
			throw error;
		}
	}

	/**
	 * Execute the three-phase pipeline: Phase1 → Phase2 → PhaseFlavour
	 */
	private async executeThreePhasePipeline(
		sources: LibTsSource[],
		bootstrapped: Bootstrapped,
	): Promise<void> {
		this.executionLogger.logStep("Setting up three-phase pipeline");

		// Create logger function
		const getLogger = (id: LibTsSource): Logger<void> => {
			return {
				info: (msg: string) => this.info(`[${id.libName.value}] ${msg}`),
				warn: (msg: string) => this.warn(`[${id.libName.value}] ${msg}`),
				error: (msg: string) => this.error(`[${id.libName.value}] ${msg}`),
				debug: (msg: string) =>
					this.info(`[${id.libName.value}] DEBUG: ${msg}`),
				withContext: (_key: string, _value: string) => getLogger(id),
			} as Logger<void>;
		};

		// Create phase listener - use logging listener for better visibility
		const listener = new CollectingPhaseListener<LibTsSource>();

		// Add a logging phase listener for real-time feedback
		const loggingListener = {
			on: (phaseName: string, id: LibTsSource, event: any) => {
				switch (event._tag) {
					case "Started":
						console.log(`🚀 [${phaseName}] Started processing: ${id.libName.value}`);
						break;
					case "Success":
						console.log(`✅ [${phaseName}] Successfully processed: ${id.libName.value}`);
						break;
					case "Failure":
						console.error(`❌ [${phaseName}] Failed to process: ${id.libName.value}`);
						break;
					case "Blocked":
						console.log(`⏸️  [${phaseName}] Blocked on dependencies: ${id.libName.value}`);
						break;
					case "Ignored":
						console.log(`⏭️  [${phaseName}] Ignored: ${id.libName.value}`);
						break;
				}
				// Also forward to collecting listener
				listener.on(phaseName, id, event);
			}
		};

		// Create formatters and orderings
		const formatter = Formatters.create<LibTsSource>(
			(source) => source.libName.value,
		);
		const ordering = Orderings.create<LibTsSource>((a, b) =>
			a.libName.value.localeCompare(b.libName.value),
		);

		// Configure Phase1: TypeScript parsing
		this.executionLogger.logStep("Configuring Phase1ReadTypescript");
		const phase1Config = {
			resolve: bootstrapped.libraryResolver,
			calculateLibraryVersion: new MockCalculateLibraryVersion(),
			ignored: this.DefaultOptions.ignoredLibs,
			ignoredModulePrefixes: this.DefaultOptions.ignoredModulePrefixes,
			pedantic: false,
			parser: () => E.right(TsParsedFile.createMock()), // Mock parser
			expandTypeMappings: this.DefaultOptions.expandTypeMappings,
		};
		const phase1 = Phase1ReadTypescript.create(phase1Config);

		// Configure Phase2: TypeScript to Scala.js conversion
		this.executionLogger.logStep("Configuring Phase2ToScalaJs");
		console.log("🔧 [TracingCommand] Setting up Phase2ToScalaJs configuration...");
		const phase2Config = {
			pedantic: false,
			useDeprecatedModuleNames: this.DefaultOptions.useDeprecatedModuleNames,
			scalaVersion: this.DefaultOptions.versions.scala,
			enableScalaJsDefined: this.DefaultOptions.enableScalaJsDefined,
			outputPkg: this.DefaultOptions.outputPackage,
			flavour: NormalFlavourImpl.createMock(),
		};
		console.log("🏗️  [TracingCommand] Creating Phase2ToScalaJs instance...");
		const phase2 = Phase2ToScalaJs.create(phase2Config);
		console.log("✅ [TracingCommand] Phase2ToScalaJs configured successfully");

		// Configure Phase3: Flavour transformations
		this.executionLogger.logStep("Configuring PhaseFlavour");
		const phase3Config = {
			flavour: NormalFlavourImpl.createMock(),
			maybePrivateWithin: this.DefaultOptions.privateWithin
				? { _tag: "Some" as const, value: this.DefaultOptions.privateWithin }
				: { _tag: "None" as const },
		};
		const phase3 = PhaseFlavour.create(phase3Config);

		// Create the three-phase pipeline
		this.executionLogger.logStep("Creating three-phase pipeline");
		const pipeline = RecPhase.apply<LibTsSource>()
			.next(phase1.apply.bind(phase1), "Phase1ReadTypescript")
			.next(phase2.apply.bind(phase2), "Phase2ToScalaJs")
			.next(phase3.apply.bind(phase3), "PhaseFlavour");

		// Create phase runner - use the logging listener for better visibility
		const runner = PhaseRunner.apply(
			pipeline,
			getLogger,
			loggingListener,
			formatter,
			ordering,
		);

		// Execute pipeline for each source
		this.executionLogger.logStep("Executing three-phase pipeline");
		for (const source of sources) {
			this.executionLogger.logProgress(
				`Processing ${source.libName.value} through three-phase pipeline`,
			);

			const result = runner(source);

			if (result._tag === "Ok") {
				this.executionLogger.logProgress(
					`Successfully processed ${source.libName.value}`,
				);
			} else if (result._tag === "Failure") {
				this.executionLogger.logError(
					`Failed to process ${source.libName.value}: ${Array.from(result.errors.values()).join(", ")}`,
				);
			} else {
				this.executionLogger.logProgress(`Ignored ${source.libName.value}`);
			}
		}

		this.executionLogger.logStep("Three-phase pipeline execution completed");
	}

	private async validateEnvironment(): Promise<void> {
		if (!(await fs.pathExists(this.paths.packageJson))) {
			throw new Error(`${this.inDirectory} does not contain package.json`);
		}

		if (!(await fs.pathExists(this.paths.nodeModules))) {
			throw new Error(`${this.inDirectory} does not contain node_modules`);
		}
	}
}
