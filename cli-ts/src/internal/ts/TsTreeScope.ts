import { type Either, left, right } from "fp-ts/Either";
import { isSome, none, type Option, some } from "fp-ts/Option";
import { IArray } from "../IArray.js";
import { Logger } from "../logging/index.js";
import { HasTParams } from "./HasTParams.js";
import type { HasClassMembers } from "./MemberCache.js";
import type { PackageJson } from "./PackageJson.js";
import type {
	TsAugmentedModule,
	TsContainer,
	TsDeclClass,
	TsDeclInterface,
	TsDeclModule,
	TsDeclNamespaceOrModule,
	TsDeclTypeAlias,
	TsDeclVar,
	TsExport,
	TsIdentLibrary,
	TsIdentModule,
	TsImportee,
	TsMember,
	TsMemberTypeMapped,
	TsNamedDecl,
	TsParsedFile,
	TsQIdent,
	TsTree,
	TsType,
	TsTypeParam,
	TsTypeRef,
} from "./trees.js";
import { TsIdent } from "./trees.js";

export interface TsLib {
	libName: TsIdentLibrary;
	packageJsonOpt?: PackageJson;
}

/**
 * Cache key for import lookups
 */
export interface ImportCacheKey {
	scope: TsTreeScope;
	importee: TsImportee;
}

/**
 * Result of expanding type mappings
 */
export interface ExpandTypeMappingsRes<T> {
	result: T;
}

/**
 * Expanded module information
 */
export type ExpandedMod =
	| {
			_tag: "Picked";
			things: IArray<[TsNamedDecl, TsTreeScope]>;
	  }
	| {
			_tag: "Whole";
			defaults: IArray<TsNamedDecl>;
			namespaceds: IArray<TsNamedDecl>;
			rest: IArray<TsNamedDecl>;
			newScope: TsTreeScope;
	  };

/**
 * Utility functions for TsQIdent
 */
export const TsQIdentUtils = {
	/**
	 * Check if a qualified identifier represents a primitive type
	 */
	Primitive: (qident: TsQIdent): boolean => {
		if (qident.parts.length !== 1) return false;
		const name = qident.parts.apply(0).value;
		return [
			"any",
			"boolean",
			"number",
			"string",
			"symbol",
			"object",
			"undefined",
			"null",
			"void",
			"never",
			"unknown",
			"bigint",
		].includes(name);
	},

	/**
	 * Check if a qualified identifier is empty
	 */
	isEmpty: (qident: TsQIdent): boolean => qident.parts.length === 0,
};

/**
 * Utility functions for searching and module handling
 */
export const TsTreeScopeUtils = {
	/**
	 * Search within a container for declarations matching the wanted identifiers
	 */
	search: <T extends TsNamedDecl>(
		scope: TsTreeScope,
		picker: Picker<T>,
		container: TsContainer,
		fragments: IArray<TsIdent>,
		loopDetector: LoopDetector,
	): IArray<[T, TsTreeScope]> => {
		if (fragments.isEmpty) {
			// If no fragments wanted, try to pick from the container itself
			const picked = picker.pick(container as any);
			if (isSome(picked)) {
				return IArray.fromArray([
					[picked.value, scope["/"](picked.value) as TsTreeScope],
				]);
			}
			return IArray.Empty;
		}

		if (fragments.length === 1) {
			// Single fragment - look up by name value
			const wanted = fragments.apply(0);
			const wantedValue = wanted.value;

			// Find declarations by matching name value
			let declarations: IArray<TsNamedDecl> | undefined;
			for (const [key, decls] of container.membersByName.entries()) {
				if (key.value === wantedValue) {
					declarations = decls;
					break;
				}
			}

			if (declarations) {
				const results: [T, TsTreeScope][] = [];
				for (const decl of declarations.toArray()) {
					const picked = picker.pick(decl);
					if (isSome(picked)) {
						results.push([
							picked.value,
							scope["/"](picked.value) as TsTreeScope,
						]);
					}
				}
				return IArray.fromArray(results);
			}
			return IArray.Empty;
		}

		// Multiple fragments - recursive search
		const [head, tail] = [fragments.apply(0), fragments.drop(1)];
		const headValue = head.value;

		// Find declarations by matching name value
		let declarations: IArray<TsNamedDecl> | undefined;
		for (const [key, decls] of container.membersByName.entries()) {
			if (key.value === headValue) {
				declarations = decls;
				break;
			}
		}

		if (declarations) {
			const results: [T, TsTreeScope][] = [];
			for (const decl of declarations.toArray()) {
				const nestedResults = TsTreeScopeUtils.search(
					scope["/"](decl) as TsTreeScope,
					picker,
					decl as any, // Cast to container for recursive search
					tail,
					loopDetector,
				);
				results.push(...nestedResults.toArray());
			}
			return IArray.fromArray(results);
		}

		return IArray.Empty;
	},

	/**
	 * Add module scope with alternatives (including "index" variants)
	 */
	addModuleScope: (
		ret: Map<TsIdentModule, TsTreeScope.Scoped>,
		mod: TsDeclModule,
		outsideModule: TsTreeScope,
	): void => {
		const modScope = outsideModule["/"](mod);

		// Add the main module
		ret.set(mod.name, modScope);

		// Add alternative with/without "index"
		const alternative = TsTreeScopeUtils.createAlternativeModuleName(mod.name);
		if (alternative && !ret.has(alternative)) {
			ret.set(alternative, modScope);
		}

		// Handle module aliases from comments
		// In a full implementation, would parse mod.comments for Marker.ModuleAliases
	},

	/**
	 * Create alternative module name (with/without "index")
	 */
	createAlternativeModuleName: (
		modName: TsIdentModule,
	): TsIdentModule | undefined => {
		const fragments = modName.fragments;
		if (fragments.length === 0) return undefined;

		const lastFragment = fragments[fragments.length - 1];
		if (lastFragment === "index") {
			// Remove "index"
			return {
				...modName,
				fragments: fragments.slice(0, -1),
			};
		} else {
			// Add "index"
			return {
				...modName,
				fragments: [...fragments, "index"],
			};
		}
	},

	/**
	 * Merge augmented modules (simplified implementation)
	 */
	mergeAugmentedModule: (
		that: TsAugmentedModule,
		existing: TsAugmentedModule,
	): TsAugmentedModule => {
		// Simplified merge - in full implementation would use FlattenTrees.mergeAugmentedModule
		return {
			...existing,
			members: existing.members.appendedAll(that.members),
		};
	},

	/**
	 * Check if a tree is a named declaration
	 */
	isNamedDecl: (tree: TsTree): tree is TsNamedDecl => {
		return (
			tree._tag === "TsDeclClass" ||
			tree._tag === "TsDeclInterface" ||
			tree._tag === "TsDeclEnum" ||
			tree._tag === "TsDeclFunction" ||
			tree._tag === "TsDeclVar" ||
			tree._tag === "TsDeclTypeAlias" ||
			tree._tag === "TsDeclNamespace"
		);
	},

	/**
	 * Check if a tree is a container
	 */
	isContainer: (tree: TsTree): tree is TsContainer => {
		return (
			tree._tag === "TsParsedFile" ||
			tree._tag === "TsDeclNamespace" ||
			tree._tag === "TsDeclModule" ||
			tree._tag === "TsGlobal"
		);
	},

	/**
	 * Check if a tree has class members
	 */
	hasClassMembers: (tree: TsTree): tree is TsTree & HasClassMembers => {
		return tree._tag === "TsDeclClass" || tree._tag === "TsDeclInterface";
	},
};

/**
 * Loop detector for preventing infinite recursion during type resolution.
 * Tracks the current resolution stack to detect circular references.
 */
export class LoopDetector {
	private constructor(private readonly stack: readonly LoopDetectorEntry[]) {}

	/**
	 * Creates an initial empty loop detector
	 */
	static readonly initial = new LoopDetector([]);

	/**
	 * Attempts to include a type reference in the resolution stack.
	 * Returns Left(unit) if this would create a loop, Right(newDetector) otherwise.
	 */
	includingTypeRef(
		typeRef: TsTypeRef,
		scope: TsTreeScope,
	): Either<void, LoopDetector> {
		const entry = LoopDetectorEntry.fromTypeRef(typeRef, scope);
		if (this.stack.some((e) => e.equals(entry))) {
			return left(undefined);
		}
		return right(new LoopDetector([entry, ...this.stack]));
	}

	/**
	 * Attempts to include identifiers in the resolution stack.
	 * Returns Left(unit) if this would create a loop, Right(newDetector) otherwise.
	 */
	including(
		idents: IArray<TsIdent>,
		scope: TsTreeScope,
	): Either<void, LoopDetector>;
	including(typeRef: TsTypeRef, scope: TsTreeScope): Either<void, LoopDetector>;
	including(
		identsOrTypeRef: IArray<TsIdent> | TsTypeRef,
		scope: TsTreeScope,
	): Either<void, LoopDetector> {
		let entry: LoopDetectorEntry;

		if ("_tag" in identsOrTypeRef && identsOrTypeRef._tag === "TsTypeRef") {
			// It's a TsTypeRef
			entry = LoopDetectorEntry.fromTypeRef(
				identsOrTypeRef as TsTypeRef,
				scope,
			);
		} else {
			// It's an IArray<TsIdent>
			entry = LoopDetectorEntry.fromIdents(
				identsOrTypeRef as IArray<TsIdent>,
				scope,
			);
		}

		if (this.stack.some((e) => e.equals(entry))) {
			return left(undefined);
		}
		return right(new LoopDetector([entry, ...this.stack]));
	}

	/**
	 * Attempts to include identifiers in the resolution stack.
	 * Returns Left(unit) if this would create a loop, Right(newDetector) otherwise.
	 * @deprecated Use including() instead
	 */
	includingIdents(
		idents: IArray<TsIdent>,
		scope: TsTreeScope,
	): Either<void, LoopDetector> {
		return this.including(idents, scope);
	}
}

/**
 * Entry in the loop detector stack
 */
class LoopDetectorEntry {
	private constructor(
		private readonly type: "TypeRef" | "Idents",
		private readonly typeRef?: TsTypeRef,
		private readonly idents?: IArray<TsIdent>,
		private readonly scope?: TsTreeScope,
	) {}

	static fromTypeRef(
		typeRef: TsTypeRef,
		scope: TsTreeScope,
	): LoopDetectorEntry {
		return new LoopDetectorEntry("TypeRef", typeRef, undefined, scope);
	}

	static fromIdents(
		idents: IArray<TsIdent>,
		scope: TsTreeScope,
	): LoopDetectorEntry {
		return new LoopDetectorEntry("Idents", undefined, idents, scope);
	}

	equals(other: LoopDetectorEntry): boolean {
		if (this.type !== other.type) return false;
		if (this.scope !== other.scope) return false;

		if (this.type === "TypeRef") {
			return this.typeRef === other.typeRef;
		} else {
			return this.idents === other.idents;
		}
	}
}

/**
 * Picker interface for selecting specific types of declarations
 */
export interface Picker<T extends TsNamedDecl> {
	pick(decl: TsNamedDecl): Option<T>;
}

/**
 * Standard pickers for different declaration types
 */
export const Picker = {
	Types: {
		pick: (decl: TsNamedDecl): Option<TsNamedDecl> => {
			if (
				decl._tag === "TsDeclInterface" ||
				decl._tag === "TsDeclClass" ||
				decl._tag === "TsDeclTypeAlias" ||
				decl._tag === "TsDeclEnum"
			) {
				return { _tag: "Some", value: decl };
			}
			return none;
		},
	} as Picker<TsNamedDecl>,

	All: {
		pick: (decl: TsNamedDecl): Option<TsNamedDecl> => {
			return { _tag: "Some", value: decl };
		},
	} as Picker<TsNamedDecl>,
};

/**
 * TypeScript tree scope interface for type and term lookup
 */
export interface TsTreeScope {
	/**
	 * The root scope
	 */
	readonly root: TsTreeScope.Root;

	/**
	 * Whether to enable unqualified lookups
	 */
	readonly lookupUnqualified: boolean;

	/**
	 * Logger for this scope
	 */
	readonly logger: Logger<void>;

	/**
	 * Stack of trees from root to current scope
	 */
	readonly stack: TsTree[];

	/**
	 * Type parameters available in this scope
	 */
	readonly tparams: Map<TsIdent, TsTypeParam>;

	/**
	 * Type keys available in this scope (from mapped types)
	 */
	readonly tkeys: Set<TsIdent>;

	/**
	 * Parent scope (.. operator in Scala)
	 */
	readonly parent: TsTreeScope;

	/**
	 * Module scopes available in this scope
	 */
	readonly moduleScopes: Map<TsIdentModule, TsTreeScope.Scoped>;

	/**
	 * Augmented module scopes available in this scope
	 */
	readonly moduleAuxScopes: Map<TsIdentModule, TsTreeScope.Scoped>;

	/**
	 * Exports available in this scope
	 */
	readonly exports: IArray<TsExport>;

	/**
	 * Create a new scoped scope with the given tree
	 */
	"/"(current: TsTree): TsTreeScope.Scoped;

	/**
	 * Look up declarations by qualified identifier
	 */
	lookup(qname: TsQIdent, skipValidation?: boolean): IArray<TsNamedDecl>;

	/**
	 * Look up declarations by qualified identifier, including scope information
	 */
	lookupIncludeScope(
		qname: TsQIdent,
		skipValidation?: boolean,
	): IArray<[TsNamedDecl, TsTreeScope]>;

	/**
	 * Look up type declarations by qualified identifier
	 */
	lookupType(qname: TsQIdent, skipValidation?: boolean): IArray<TsNamedDecl>;

	/**
	 * Look up type declarations by qualified identifier, including scope information
	 */
	lookupTypeIncludeScope(
		qname: TsQIdent,
		skipValidation?: boolean,
	): IArray<[TsNamedDecl, TsTreeScope]>;

	/**
	 * Look up declarations by qualified identifier with loop detection (internal)
	 */
	lookupInternal<T extends TsNamedDecl>(
		picker: Picker<T>,
		wanted: IArray<TsIdent>,
		loopDetector: LoopDetector,
	): IArray<[T, TsTreeScope]>;

	/**
	 * Check if a qualified identifier represents an abstract type
	 */
	isAbstract(qname: TsQIdent): boolean;

	/**
	 * Find the surrounding TsContainer in the scope stack
	 */
	surroundingTsContainer(): Option<TsContainer>;

	/**
	 * Find the surrounding HasClassMembers in the scope stack
	 */
	surroundingHasMembers(): Option<HasClassMembers>;

	/**
	 * Check if this scope is within a module
	 */
	withinModule(): boolean;

	/**
	 * Conditionally log fatal or warn based on pedantic flag
	 */
	fatalMaybe(message: string): void;

	/**
	 * String representation of this scope
	 */
	toString(): string;

	/**
	 * Equality check
	 */
	equals(other: any): boolean;

	/**
	 * Hash code
	 */
	hashCode(): number;
}

/**
 * TsTreeScope namespace containing related types and implementations
 */
export namespace TsTreeScope {
	/**
	 * Library interface
	 */
	export interface TsLib {
		libName: TsIdentLibrary;
		packageJsonOpt?: PackageJson;
	}

	/**
	 * Cache for performance optimization
	 */
	export interface Cache {
		typeMappings: Map<TsTypeRef, ExpandTypeMappingsRes<IArray<TsMember>>>;
		imports: Map<ImportCacheKey, IArray<[TsNamedDecl, TsTreeScope]>>;
		exports: Map<TsIdentModule, TsDeclModule>;
		expandExport: Map<string, IArray<TsNamedDecl>>; // key is (TsTreeScope, TsExport) serialized
		expandImportee: Map<string, ExpandedMod>; // key is (TsTreeScope, TsImportee) serialized
	}

	/**
	 * Creates a new empty cache
	 */
	export function createCache(): Cache {
		return {
			typeMappings: new Map(),
			imports: new Map(),
			exports: new Map(),
			expandExport: new Map(),
			expandImportee: new Map(),
		};
	}

	/**
	 * Root scope class declaration
	 */
	export class Root implements TsTreeScope {
		private _depScopes:
			| Map<TsIdentLibrary, [TsLib, TsParsedFile, Scoped]>
			| undefined;
		private _moduleScopes: Map<TsIdentModule, Scoped> | undefined;
		private _moduleAuxScopes: Map<TsIdentModule, Scoped> | undefined;
		private _hashCode: number;

		constructor(
			public readonly libName: TsIdentLibrary,
			public readonly pedantic: boolean,
			private readonly _deps: Map<TsLib, TsParsedFile>,
			public readonly logger: Logger<void>,
			public readonly cache: Option<Cache>,
			public readonly lookupUnqualified: boolean,
		) {
			this._hashCode = this.libName.value.length; // Simple hash based on library name
		}

		get root(): Root {
			return this;
		}
		get stack(): TsTree[] {
			return [];
		}
		get tparams(): Map<TsIdent, TsTypeParam> {
			return new Map();
		}
		get tkeys(): Set<TsIdent> {
			return new Set();
		}
		get parent(): TsTreeScope {
			return this;
		}
		get exports(): IArray<TsExport> {
			return IArray.Empty;
		}

		/**
		 * Lazy-computed dependency scopes
		 */
		private get depScopes(): Map<
			TsIdentLibrary,
			[TsLib, TsParsedFile, Scoped]
		> {
			if (!this._depScopes) {
				this._depScopes = new Map();
				for (const [lib, file] of this._deps.entries()) {
					this._depScopes.set(lib.libName, [lib, file, this["/"](file)]);
				}
			}
			return this._depScopes;
		}

		/**
		 * Lazy-computed module scopes
		 */
		get moduleScopes(): Map<TsIdentModule, Scoped> {
			if (!this._moduleScopes) {
				this._moduleScopes = new Map();
				for (const [_, [_lib, dep, _depScope]] of this.depScopes.entries()) {
					if (dep._tag === "TsParsedFile") {
						// Add module scopes from parsed file
						// Note: This is a simplified implementation
						// In the full implementation, we would iterate through dep.modules
					}
				}
			}
			return this._moduleScopes;
		}

		/**
		 * Lazy-computed augmented module scopes
		 */
		get moduleAuxScopes(): Map<TsIdentModule, Scoped> {
			if (!this._moduleAuxScopes) {
				this._moduleAuxScopes = new Map();
				for (const [_, [_lib, dep, _depScope]] of this.depScopes.entries()) {
					if (dep._tag === "TsParsedFile") {
						// Add augmented module scopes from parsed file
						// Note: This is a simplified implementation
						// In the full implementation, we would iterate through dep.augmentedModulesMap
					}
				}
			}
			return this._moduleAuxScopes;
		}

		/**
		 * Create a caching version of this root scope
		 */
		caching(): Root {
			return new Root(
				this.libName,
				this.pedantic,
				this._deps,
				this.logger,
				some(createCache()),
				this.lookupUnqualified,
			);
		}

		/**
		 * Create a version with unqualified lookup enabled
		 */
		enableUnqualifiedLookup(): Root {
			return new Root(
				this.libName,
				this.pedantic,
				this._deps,
				this.logger,
				this.cache,
				true,
			);
		}

		"/"(current: TsTree): Scoped {
			return new Scoped(this, current, this.lookupUnqualified);
		}

		lookup(qname: TsQIdent, skipValidation = false): IArray<TsNamedDecl> {
			return this.lookupIncludeScope(qname, skipValidation).map(
				([decl, _]) => decl,
			);
		}

		lookupIncludeScope(
			qname: TsQIdent,
			skipValidation = false,
		): IArray<[TsNamedDecl, TsTreeScope]> {
			return this.lookupBase(Picker.All, qname, skipValidation);
		}

		lookupType(qname: TsQIdent, skipValidation = false): IArray<TsNamedDecl> {
			return this.lookupBase(Picker.Types, qname, skipValidation).map(
				([decl, _]) => decl,
			);
		}

		lookupTypeIncludeScope(
			qname: TsQIdent,
			skipValidation = false,
		): IArray<[TsNamedDecl, TsTreeScope]> {
			return this.lookupBase(Picker.Types, qname, skipValidation);
		}

		/**
		 * Base lookup method that handles validation and delegates to lookupInternal
		 */
		private lookupBase<T extends TsNamedDecl>(
			picker: Picker<T>,
			qname: TsQIdent,
			skipValidation: boolean,
		): IArray<[T, TsTreeScope]> {
			if (TsQIdentUtils.Primitive(qname) || this.isAbstract(qname)) {
				return IArray.Empty;
			}

			const res = this.lookupInternal(
				picker,
				qname.parts,
				LoopDetector.initial,
			);

			if (res.isEmpty && !skipValidation) {
				// For debugging - run lookup again
				this.lookupInternal(picker, qname.parts, LoopDetector.initial);
				this.logger.fatalMaybe(
					`Cannot resolve ${qname.asString}`,
					this.pedantic,
				);
			}

			return res;
		}

		lookupInternal<T extends TsNamedDecl>(
			picker: Picker<T>,
			wanted: IArray<TsIdent>,
			loopDetector: LoopDetector,
		): IArray<[T, TsTreeScope]> {
			const loopResult = loopDetector.including(wanted, this);
			if (loopResult._tag === "Left") {
				return IArray.Empty;
			}

			const newLoopDetector = loopResult.right;

			// Check if this starts with the library name
			if (wanted.length > 0) {
				const firstIdent = wanted.apply(0);
				if (TsIdent.isLibrary(firstIdent)) {
					const libIdent = firstIdent as TsIdentLibrary;
					const rest = wanted.drop(1);
					const depInfo = this.depScopes.get(libIdent);
					if (depInfo) {
						const [_, dep, libScope] = depInfo;
						return this.search(libScope, picker, dep, rest, newLoopDetector);
					}
					return IArray.Empty;
				}
			}

			// Try standard library first
			const stdIdent = {
				_tag: "TsIdentLibrarySimple",
				value: "std",
			} as TsIdentLibrary;
			const stdInfo = this.depScopes.get(stdIdent);
			if (stdInfo) {
				const [_, lib, libScope] = stdInfo;
				const result = this.search(
					libScope,
					picker,
					lib,
					wanted,
					newLoopDetector,
				);
				if (!result.isEmpty) {
					return result;
				}
			}

			// Search through all dependencies
			const results: [T, TsTreeScope][] = [];
			for (const [_, [_lib, libFile, libScope]] of this.depScopes.entries()) {
				const result = this.search(
					libScope,
					picker,
					libFile,
					wanted,
					newLoopDetector,
				);
				results.push(...result.toArray());
			}

			return IArray.fromArray(results);
		}

		/**
		 * Search within a specific scope/container
		 */
		private search<T extends TsNamedDecl>(
			scope: TsTreeScope,
			picker: Picker<T>,
			container: TsContainer,
			fragments: IArray<TsIdent>,
			loopDetector: LoopDetector,
		): IArray<[T, TsTreeScope]> {
			return TsTreeScopeUtils.search(
				scope,
				picker,
				container,
				fragments,
				loopDetector,
			);
		}

		isAbstract(qname: TsQIdent): boolean {
			if (qname.parts.length !== 1) return false;
			const ident = qname.parts.apply(0);
			return this.tparams.has(ident) || this.tkeys.has(ident);
		}

		surroundingTsContainer(): Option<TsContainer> {
			return none; // Root has no surrounding container
		}

		surroundingHasMembers(): Option<HasClassMembers> {
			return none; // Root has no surrounding class members
		}

		withinModule(): boolean {
			return false; // Root is not within a module
		}

		fatalMaybe(message: string): void {
			this.logger.fatalMaybe(message, this.pedantic);
		}

		toString(): string {
			return `TreeScope(${this.stack
				.reverse()
				.map((t) => t.asString)
				.join(" / ")})`;
		}

		equals(other: any): boolean {
			if (!(other instanceof Root)) return false;
			const that = other as Root;
			return (
				this.libName.value === that.libName.value &&
				this.hashCode() === that.hashCode() &&
				this.stackEquals(that)
			);
		}

		private stackEquals(other: Root): boolean {
			if (this.stack.length !== other.stack.length) return false;
			for (let i = 0; i < this.stack.length; i++) {
				if (this.stack[i] !== other.stack[i]) return false;
			}
			return true;
		}

		hashCode(): number {
			return this._hashCode;
		}
	}

	/**
	 * Scoped scope class declaration
	 */
	export class Scoped implements TsTreeScope {
		private _stack: TsTree[] | undefined;
		private _tparams: Map<TsIdent, TsTypeParam> | undefined;
		private _tkeys: Set<TsIdent> | undefined;
		private _exports: IArray<TsExport> | undefined;
		private _moduleScopes: Map<TsIdentModule, Scoped> | undefined;
		private _moduleAuxScopes: Map<TsIdentModule, Scoped> | undefined;
		private _logger: Logger<void> | undefined;
		private _hashCode: number | undefined;
		private _hasHash = false;

		constructor(
			public readonly outer: TsTreeScope,
			public readonly current: TsTree,
			public readonly lookupUnqualified: boolean,
		) {}

		get root(): Root {
			return this.outer.root;
		}

		get logger(): Logger<void> {
			if (!this._logger) {
				this._logger = this.outer.logger.withContext("scope", this.toString());
			}
			return this._logger;
		}

		/**
		 * Lazy-computed stack with current tree prepended to outer stack
		 */
		get stack(): TsTree[] {
			if (!this._stack) {
				this._stack = [this.current, ...this.outer.stack];
			}
			return this._stack;
		}

		/**
		 * Lazy-computed type parameters including inherited ones
		 */
		get tparams(): Map<TsIdent, TsTypeParam> {
			if (!this._tparams) {
				this._tparams = new Map(this.outer.tparams);
				const currentTParams = HasTParams.apply(this.current);
				for (const tparam of currentTParams.toArray()) {
					this._tparams.set(tparam.name, tparam);
				}
			}
			return this._tparams;
		}

		/**
		 * Lazy-computed type keys including inherited ones
		 */
		get tkeys(): Set<TsIdent> {
			if (!this._tkeys) {
				this._tkeys = new Set(this.outer.tkeys);
				if (this.current._tag === "TsMemberTypeMapped") {
					const mapped = this.current as TsMemberTypeMapped;
					this._tkeys.add(mapped.key);
				}
			}
			return this._tkeys;
		}

		get parent(): TsTreeScope {
			return this.outer;
		}

		/**
		 * Lazy-computed exports from current container
		 */
		get exports(): IArray<TsExport> {
			if (!this._exports) {
				if (
					this.current._tag === "TsParsedFile" ||
					this.current._tag === "TsDeclNamespace" ||
					this.current._tag === "TsDeclModule" ||
					this.current._tag === "TsGlobal"
				) {
					const _container = this.current as TsContainer;
					// In a full implementation, we would extract exports from container
					this._exports = IArray.Empty; // Simplified
				} else {
					this._exports = IArray.Empty;
				}
			}
			return this._exports;
		}

		/**
		 * Lazy-computed module scopes including inherited ones
		 */
		get moduleScopes(): Map<TsIdentModule, Scoped> {
			if (!this._moduleScopes) {
				if (
					this.current._tag === "TsParsedFile" ||
					this.current._tag === "TsDeclNamespace" ||
					this.current._tag === "TsDeclModule" ||
					this.current._tag === "TsGlobal"
				) {
					const _container = this.current as TsContainer;
					this._moduleScopes = new Map(this.outer.moduleScopes);
					// In a full implementation, we would iterate through container.modules
					// and add module scopes using addModuleScope
				} else {
					this._moduleScopes = this.outer.moduleScopes;
				}
			}
			return this._moduleScopes;
		}

		/**
		 * Lazy-computed augmented module scopes including inherited ones
		 */
		get moduleAuxScopes(): Map<TsIdentModule, Scoped> {
			if (!this._moduleAuxScopes) {
				this._moduleAuxScopes = new Map(this.outer.moduleAuxScopes);
				if (
					this.current._tag === "TsParsedFile" ||
					this.current._tag === "TsDeclNamespace" ||
					this.current._tag === "TsDeclModule" ||
					this.current._tag === "TsGlobal"
				) {
					const _container = this.current as TsContainer;
					// In a full implementation, we would iterate through container.augmentedModulesMap
					// and merge augmented modules using FlattenTrees.mergeAugmentedModule
				}
			}
			return this._moduleAuxScopes;
		}

		"/"(current: TsTree): Scoped {
			return new Scoped(this, current, this.lookupUnqualified);
		}

		lookup(qname: TsQIdent, skipValidation = false): IArray<TsNamedDecl> {
			return this.lookupIncludeScope(qname, skipValidation).map(
				([decl, _]) => decl,
			);
		}

		lookupIncludeScope(
			qname: TsQIdent,
			skipValidation = false,
		): IArray<[TsNamedDecl, TsTreeScope]> {
			return this.lookupBase(Picker.All, qname, skipValidation);
		}

		lookupType(qname: TsQIdent, skipValidation = false): IArray<TsNamedDecl> {
			return this.lookupBase(Picker.Types, qname, skipValidation).map(
				([decl, _]) => decl,
			);
		}

		lookupTypeIncludeScope(
			qname: TsQIdent,
			skipValidation = false,
		): IArray<[TsNamedDecl, TsTreeScope]> {
			return this.lookupBase(Picker.Types, qname, skipValidation);
		}

		/**
		 * Base lookup method that handles validation and delegates to lookupInternal
		 */
		private lookupBase<T extends TsNamedDecl>(
			picker: Picker<T>,
			qname: TsQIdent,
			skipValidation: boolean,
		): IArray<[T, TsTreeScope]> {
			if (TsQIdentUtils.Primitive(qname) || this.isAbstract(qname)) {
				return IArray.Empty;
			}

			const res = this.lookupInternal(
				picker,
				qname.parts,
				LoopDetector.initial,
			);

			if (res.isEmpty && !skipValidation) {
				// For debugging - run lookup again
				this.lookupInternal(picker, qname.parts, LoopDetector.initial);
				this.logger.fatalMaybe(
					`Cannot resolve ${qname.asString}`,
					this.root.pedantic,
				);
			}

			return res;
		}

		lookupInternal<T extends TsNamedDecl>(
			picker: Picker<T>,
			wanted: IArray<TsIdent>,
			loopDetector: LoopDetector,
		): IArray<[T, TsTreeScope]> {
			const loopResult = loopDetector.including(wanted, this);
			if (loopResult._tag === "Left") {
				return IArray.Empty;
			}

			const newLoopDetector = loopResult.right;

			// Check if this starts with the library name and skip to appropriate scope
			if (wanted.length > 0) {
				const firstIdent = wanted.apply(0);
				if (firstIdent.value === this.root.libName.value) {
					const rest = wanted.drop(1);
					let skipScopes: TsTreeScope = this;

					// Skip to appropriate scope level
					while (this.shouldSkip(skipScopes)) {
						skipScopes = skipScopes.parent;
					}

					return skipScopes.lookupInternal(picker, rest, newLoopDetector);
				}
			}

			return this.lookupImpl(picker, wanted, newLoopDetector);
		}

		/**
		 * Determine if we should skip this scope when looking for library-qualified names
		 */
		private shouldSkip(scope: TsTreeScope): boolean {
			if (scope instanceof Root) return false;
			if (scope instanceof Scoped && scope.current._tag === "TsParsedFile")
				return false;
			return true;
		}

		/**
		 * Complex lookup implementation with all lookup strategies
		 */
		private lookupImpl<T extends TsNamedDecl>(
			picker: Picker<T>,
			wanted: IArray<TsIdent>,
			loopDetector: LoopDetector,
		): IArray<[T, TsTreeScope]> {
			// Local lookup
			const local = this.localLookup(picker, wanted);

			// Exported from module
			const exportedFromModule = this.exportedFromModule(
				picker,
				wanted,
				loopDetector,
			);

			// Imported from module
			const importedFromModule = this.importedFromModule(
				picker,
				wanted,
				loopDetector,
			);

			// Augmented module
			const augmentedModule = this.augmentedModuleLookup(
				picker,
				wanted,
				loopDetector,
			);

			// From globals (simplified)
			const fromGlobals = IArray.Empty as IArray<[T, TsTreeScope]>;

			// Extending scope (simplified)
			const extendingScope = IArray.Empty as IArray<[T, TsTreeScope]>;

			// Prototype (simplified)
			const prototype = IArray.Empty as IArray<[T, TsTreeScope]>;

			let result: IArray<[T, TsTreeScope]> = IArray.Empty;

			// Apply lookup priority order as in Scala implementation
			if (
				this.current._tag === "TsDeclClass" ||
				this.current._tag === "TsDeclInterface" ||
				this.current._tag === "TsDeclNamespace" ||
				this.current._tag === "TsDeclModule" ||
				this.current._tag === "TsParsedFile" ||
				this.current._tag === "TsGlobal"
			) {
				result = local;

				if (result.isEmpty && this.lookupUnqualified) {
					result = importedFromModule;
				}
				if (result.isEmpty && this.lookupUnqualified) {
					result = augmentedModule;
				}
				if (result.isEmpty && this.lookupUnqualified) {
					result = exportedFromModule;
				}
				if (result.isEmpty) {
					result = fromGlobals;
				}
				if (
					result.isEmpty &&
					this.lookupUnqualified &&
					!this.isDummyLibrary(wanted)
				) {
					result = extendingScope;
				}
				if (result.isEmpty) {
					result = prototype;
				}
			}

			if (result.isEmpty) {
				result = this.outer.lookupInternal(picker, wanted, loopDetector);
			}

			return result;
		}

		/**
		 * Check if the wanted identifier is a dummy library (optimization)
		 */
		private isDummyLibrary(wanted: IArray<TsIdent>): boolean {
			if (wanted.length === 0) return false;
			const first = wanted.apply(0);
			return first.value === "dummyLibrary";
		}

		/**
		 * Local lookup within current scope
		 */
		private localLookup<T extends TsNamedDecl>(
			picker: Picker<T>,
			wanted: IArray<TsIdent>,
		): IArray<[T, TsTreeScope]> {
			if (wanted.isEmpty) {
				// If no fragments wanted, try to pick from current tree
				const picked = picker.pick(this.current as TsNamedDecl);
				if (isSome(picked)) {
					return IArray.fromArray([[picked.value, this as TsTreeScope]]);
				}
				return IArray.Empty;
			}

			// Search within current container or variable
			if (
				this.current._tag === "TsParsedFile" ||
				this.current._tag === "TsDeclNamespace" ||
				this.current._tag === "TsDeclModule" ||
				this.current._tag === "TsGlobal"
			) {
				const container = this.current as TsContainer;
				return this.searchInContainer(picker, container, wanted);
			}

			if (this.current._tag === "TsDeclVar") {
				const variable = this.current as TsDeclVar;
				return this.searchInVariable(picker, variable, wanted);
			}

			return IArray.Empty;
		}

		/**
		 * Search within a container
		 */
		private searchInContainer<T extends TsNamedDecl>(
			picker: Picker<T>,
			container: TsContainer,
			wanted: IArray<TsIdent>,
		): IArray<[T, TsTreeScope]> {
			return TsTreeScopeUtils.search(
				this,
				picker,
				container,
				wanted,
				LoopDetector.initial,
			);
		}

		/**
		 * Search within a variable
		 */
		private searchInVariable<T extends TsNamedDecl>(
			_picker: Picker<T>,
			_variable: TsDeclVar,
			_wanted: IArray<TsIdent>,
		): IArray<[T, TsTreeScope]> {
			// Simplified implementation - in full version would search through variable type
			return IArray.Empty;
		}

		/**
		 * Exported from module lookup
		 */
		private exportedFromModule<T extends TsNamedDecl>(
			_picker: Picker<T>,
			_wanted: IArray<TsIdent>,
			_loopDetector: LoopDetector,
		): IArray<[T, TsTreeScope]> {
			if (
				this.current._tag === "TsDeclNamespace" ||
				this.current._tag === "TsDeclModule"
			) {
				const _module = this.current as TsDeclNamespaceOrModule;
				// In full implementation, would use Exports.lookupExportFrom
				return IArray.Empty;
			}
			return IArray.Empty;
		}

		/**
		 * Imported from module lookup
		 */
		private importedFromModule<T extends TsNamedDecl>(
			_picker: Picker<T>,
			_wanted: IArray<TsIdent>,
			_loopDetector: LoopDetector,
		): IArray<[T, TsTreeScope]> {
			if (
				this.current._tag === "TsParsedFile" ||
				this.current._tag === "TsDeclNamespace" ||
				this.current._tag === "TsDeclModule" ||
				this.current._tag === "TsGlobal"
			) {
				const _container = this.current as TsContainer;
				// In full implementation, would use Imports.lookupFromImports
				return IArray.Empty;
			}
			return IArray.Empty;
		}

		/**
		 * Augmented module lookup
		 */
		private augmentedModuleLookup<T extends TsNamedDecl>(
			picker: Picker<T>,
			wanted: IArray<TsIdent>,
			loopDetector: LoopDetector,
		): IArray<[T, TsTreeScope]> {
			if (this.current._tag === "TsAugmentedModule") {
				const augmented = this.current as TsAugmentedModule;
				const moduleScope = this.moduleScopes.get(augmented.name);
				if (moduleScope) {
					return moduleScope.lookupInternal(picker, wanted, loopDetector);
				}
			}

			if (this.current._tag === "TsDeclModule") {
				const module = this.current as TsDeclModule;
				const auxScope = this.moduleAuxScopes.get(module.name);
				if (auxScope) {
					return auxScope.lookupInternal(picker, wanted, loopDetector);
				}
			}

			return IArray.Empty;
		}

		isAbstract(qname: TsQIdent): boolean {
			if (qname.parts.length !== 1) return false;
			const ident = qname.parts.apply(0);
			return this.tparams.has(ident) || this.tkeys.has(ident);
		}

		surroundingTsContainer(): Option<TsContainer> {
			for (const tree of this.stack) {
				if (
					tree._tag === "TsParsedFile" ||
					tree._tag === "TsDeclNamespace" ||
					tree._tag === "TsDeclModule" ||
					tree._tag === "TsGlobal"
				) {
					return some(tree as TsContainer);
				}
			}
			return none;
		}

		surroundingHasMembers(): Option<HasClassMembers> {
			for (const tree of this.stack) {
				if (TsTreeScopeUtils.hasClassMembers(tree)) {
					return some(tree);
				}
			}
			return none;
		}

		withinModule(): boolean {
			return this.stack.some(
				(tree) =>
					tree._tag === "TsDeclModule" || tree._tag === "TsAugmentedModule",
			);
		}

		fatalMaybe(message: string): void {
			this.logger.fatalMaybe(message, this.root.pedantic);
		}

		toString(): string {
			return `TreeScope(${this.stack
				.reverse()
				.map((t) => t.asString)
				.join(" / ")})`;
		}

		equals(other: any): boolean {
			if (!(other instanceof Scoped)) return false;
			const that = other as Scoped;
			return (
				this.root.libName.value === that.root.libName.value &&
				this.hashCode() === that.hashCode() &&
				this.stackEquals(that)
			);
		}

		private stackEquals(other: Scoped): boolean {
			if (this.stack.length !== other.stack.length) return false;
			for (let i = 0; i < this.stack.length; i++) {
				if (this.stack[i] !== other.stack[i]) return false;
			}
			return true;
		}

		hashCode(): number {
			if (!this._hasHash) {
				this._hasHash = true;
				// Mix hash codes similar to Scala implementation
				const outerHash = this.outer.hashCode();
				const currentHash = this.current.asString.length; // Simple hash
				this._hashCode = this.finalizeHash(
					this.mix(this.mix(2, outerHash), currentHash),
					2,
				);
			}
			return this._hashCode!;
		}

		private mix(a: number, b: number): number {
			return (a * 31 + b) | 0; // Simple mixing function
		}

		private finalizeHash(hash: number, length: number): number {
			return (hash * 31 + length) | 0; // Simple finalization
		}
	}

	/**
	 * Factory function to create a root scope
	 */
	export function create(
		libName: TsIdentLibrary,
		pedantic: boolean,
		deps: Map<TsLib, TsParsedFile>,
		logger: Logger<void>,
	): Root {
		return new Root(libName, pedantic, deps, logger, none, false);
	}
}

/**
 * Mock implementation for testing
 */
export class MockTsTreeScope implements TsTreeScope {
	static create(): MockTsTreeScope {
		return new MockTsTreeScope();
	}

	get root(): TsTreeScope.Root {
		return TsTreeScope.create(
			TsIdent.librarySimple("mock"),
			false,
			new Map(),
			Logger.DevNull(),
		);
	}

	get lookupUnqualified(): boolean {
		return false;
	}
	get logger(): Logger<void> {
		return Logger.DevNull();
	}
	get stack(): TsTree[] {
		return [];
	}
	get tparams(): Map<TsIdent, TsTypeParam> {
		return new Map();
	}
	get tkeys(): Set<TsIdent> {
		return new Set();
	}
	get parent(): TsTreeScope {
		return this;
	}
	get moduleScopes(): Map<TsIdentModule, TsTreeScope.Scoped> {
		return new Map();
	}
	get moduleAuxScopes(): Map<TsIdentModule, TsTreeScope.Scoped> {
		return new Map();
	}
	get exports(): IArray<TsExport> {
		return IArray.Empty;
	}

	"/"(current: TsTree): TsTreeScope.Scoped {
		return new TsTreeScope.Scoped(this, current, false);
	}

	lookup(_qname: TsQIdent, _skipValidation = false): IArray<TsNamedDecl> {
		return IArray.Empty;
	}

	lookupIncludeScope(
		_qname: TsQIdent,
		_skipValidation = false,
	): IArray<[TsNamedDecl, TsTreeScope]> {
		return IArray.Empty;
	}

	lookupType(_qname: TsQIdent, _skipValidation = false): IArray<TsNamedDecl> {
		return IArray.Empty;
	}

	lookupTypeIncludeScope(
		_qname: TsQIdent,
		_skipValidation = false,
	): IArray<[TsNamedDecl, TsTreeScope]> {
		return IArray.Empty;
	}

	lookupInternal<T extends TsNamedDecl>(
		_picker: Picker<T>,
		_wanted: IArray<TsIdent>,
		_loopDetector: LoopDetector,
	): IArray<[T, TsTreeScope]> {
		return IArray.Empty;
	}

	isAbstract(_qname: TsQIdent): boolean {
		return false;
	}

	surroundingTsContainer(): Option<TsContainer> {
		return none;
	}

	surroundingHasMembers(): Option<HasClassMembers> {
		return none;
	}

	withinModule(): boolean {
		return false;
	}

	fatalMaybe(_message: string): void {
		// Do nothing in mock
	}

	toString(): string {
		return "MockTsTreeScope";
	}

	equals(other: any): boolean {
		return this === other;
	}

	hashCode(): number {
		return 0;
	}
}

/**
 * Stub implementation of FillInTParams for type parameter substitution.
 * For now, this just returns the input unchanged.
 * In a full implementation, this would substitute type parameters with provided types.
 */
export const FillInTParams = {
	/**
	 * Fill in type parameters for an interface declaration
	 */
	forInterface: (
		decl: TsDeclInterface,
		_tparams: IArray<TsType>,
	): TsDeclInterface => {
		// Stub implementation - just return the original declaration
		// In a full implementation, this would substitute type parameters
		return decl;
	},

	/**
	 * Fill in type parameters for a class declaration
	 */
	forClass: (decl: TsDeclClass, _tparams: IArray<TsType>): TsDeclClass => {
		// Stub implementation - just return the original declaration
		// In a full implementation, this would substitute type parameters
		return decl;
	},

	/**
	 * Fill in type parameters for a type alias declaration
	 */
	forTypeAlias: (
		decl: TsDeclTypeAlias,
		_tparams: IArray<TsType>,
	): TsDeclTypeAlias => {
		// Stub implementation - just return the original declaration
		// In a full implementation, this would substitute type parameters
		return decl;
	},
};
