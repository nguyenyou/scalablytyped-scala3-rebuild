/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.modules.InferredDependency
 *
 * There is a tendency to use node things (at least, so far) without declaring it. This infers such use.
 * Analyzes TypeScript files to infer dependencies based on:
 * 1. Non-resolved modules that match known Node.js core modules
 * 2. Qualified identifiers that match known library prefixes
 */

import type { Logger } from "../../logging/index.js";
import { TsTreeTraverse } from "../TsTreeTraverse.js";
import {
	TsIdent,
	type TsIdentLibrary,
	type TsIdentModule,
	type TsParsedFile,
	type TsQIdent,
} from "../trees.js";

/**
 * Mapping of known library prefixes to their corresponding library identifiers.
 * When these prefixes are found in qualified identifiers, we infer a dependency.
 */
const libraryPrefix = new Map<string, TsIdentLibrary>([
	["React", TsIdent.librarySimple("react")],
	["ng", TsIdent.librarySimple("angular")],
	["angular", TsIdent.librarySimple("angular")],
	["NodeJS", TsIdent.librarySimple("node")],
	["Buffer", TsIdent.librarySimple("node")],
	["global", TsIdent.librarySimple("node")],
	["moment", TsIdent.librarySimple("moment")],
	["Backbone", TsIdent.librarySimple("backbone")],
	["Leaflet", TsIdent.librarySimple("leaflet")],
	["Plotly", TsIdent.librarySimple("plotly.js")],
]);

/**
 * Set of Node.js core module names.
 * When these modules are found in non-resolved modules, we infer a node dependency.
 */
const NodeModules = new Set<string>([
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
	"http2",
]);

/**
 * Infers dependencies from qualified identifiers found in the file.
 * Traverses the AST to find TsQIdent nodes and checks if their first part
 * matches any known library prefix.
 *
 * @param file The parsed file to analyze
 * @returns Set of inferred library dependencies
 */
function inferFromPrefixes(file: TsParsedFile): Set<TsIdentLibrary> {
	// Collect all qualified identifiers and extract their first part (prefix)
	const prefixes = new Set<string>();
	
	const qidents = TsTreeTraverse.collect(file, (tree) => {
		if (tree._tag === "TsQIdent") {
			const qident = tree as TsQIdent;
			if (qident.parts.nonEmpty) {
				return qident.parts.get(0).value;
			}
		}
		return undefined;
	});

	qidents.forEach((prefix) => {
		if (prefix) {
			prefixes.add(prefix);
		}
	});

	// Find matching library dependencies and deduplicate by value
	const inferredLibraryValues = new Set<string>();
	const inferredLibraries = new Set<TsIdentLibrary>();

	for (const prefix of prefixes) {
		const library = libraryPrefix.get(prefix);
		if (library && !inferredLibraryValues.has(library.value)) {
			inferredLibraryValues.add(library.value);
			inferredLibraries.add(library);
		}
	}

	return inferredLibraries;
}

/**
 * Infers node dependency from non-resolved modules.
 * If any of the non-resolved modules match Node.js core modules,
 * we infer a dependency on the "node" library.
 *
 * @param nonResolvedModules Set of module identifiers that couldn't be resolved
 * @returns Node library dependency if any node modules are found, empty set otherwise
 */
function inferNode(nonResolvedModules: Set<TsIdentModule>): Set<TsIdentLibrary> {
	const hasNodeModules = Array.from(nonResolvedModules).some((module) =>
		NodeModules.has(module.value),
	);

	if (hasNodeModules) {
		return new Set([TsIdent.librarySimple("node")]);
	}

	return new Set();
}

/**
 * InferredDependency utility object providing the main apply function.
 * Equivalent to the Scala object InferredDependency.
 */
export const InferredDependency = {
	/**
	 * Infers dependencies from qualified identifiers found in the file.
	 */
	inferFromPrefixes,

	/**
	 * Infers node dependency from non-resolved modules.
	 */
	inferNode,

	/**
	 * Apply dependency inference to a parsed file.
	 *
	 * Combines inference from both non-resolved modules and qualified identifier prefixes.
	 * Excludes the library itself from the inferred dependencies.
	 * Logs the result if any dependencies are inferred.
	 *
	 * @param libName The name of the current library (excluded from results)
	 * @param file The parsed file to analyze
	 * @param nonResolvedModules Set of module identifiers that couldn't be resolved
	 * @param logger Logger for reporting inferred dependencies
	 * @returns Set of inferred library dependencies
	 */
	apply: (
		libName: TsIdentLibrary,
		file: TsParsedFile,
		nonResolvedModules: Set<TsIdentModule>,
		logger: Logger<void>,
	): Set<TsIdentLibrary> => {
		// Combine inferences from both sources
		const nodeInferred = inferNode(nonResolvedModules);
		const prefixInferred = inferFromPrefixes(file);

		// Merge all inferred dependencies and deduplicate by value
		const allInferredValues = new Set<string>();
		const allInferred = new Set<TsIdentLibrary>();

		// Add node inferred libraries
		for (const lib of nodeInferred) {
			if (!allInferredValues.has(lib.value)) {
				allInferredValues.add(lib.value);
				allInferred.add(lib);
			}
		}

		// Add prefix inferred libraries
		for (const lib of prefixInferred) {
			if (!allInferredValues.has(lib.value)) {
				allInferredValues.add(lib.value);
				allInferred.add(lib);
			}
		}

		// Remove the library itself from inferred dependencies (filter by value)
		const filteredInferred = new Set<TsIdentLibrary>();
		for (const lib of allInferred) {
			if (lib.value !== libName.value) {
				filteredInferred.add(lib);
			}
		}

		// Log if any dependencies were inferred
		if (filteredInferred.size > 0) {
			const inferredNames = Array.from(filteredInferred)
				.map((lib) => lib.value)
				.sort()
				.join(", ");
			logger.info(`Inferred dependencies [${inferredNames}] for ${libName.value}`);
		}

		return filteredInferred;
	},
};
