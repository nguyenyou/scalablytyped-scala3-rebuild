/**
 * Centralized test utilities for creating mock objects and test data.
 *
 * This file consolidates all mock creation functions that were previously
 * scattered across individual test files, providing consistent implementations
 * and reducing code duplication.
 */

import { none, type Option, some } from "fp-ts/Option";
import { Raw } from "@/internal/Comment.js";
import { Comments, NoComments } from "@/internal/Comments.js";
import { CodePath } from "@/internal/ts/CodePath.js";
import { Directive } from "@/internal/ts/Directive.js";
import { IArray } from "@/internal/IArray.js";
import { Logger } from "@/internal/logging/index.js";
import { ExportType } from "@/internal/ts/ExportType.js";
import { JsLocation } from "@/internal/ts/JsLocation.js";
import { LoopDetector, TsTreeScope } from "@/internal/ts/TsTreeScope.js";
import type { TsLib } from "@/internal/ts/TsTreeScope.js";
import {
	MethodType,
	TsAugmentedModule,
	type TsContainerOrDecl,
	type TsDeclClass,
	type TsDeclFunction,
	type TsDeclInterface,
	type TsDeclModule,
	type TsDeclNamespace,
	type TsDeclTypeAlias,
	type TsDeclVar,
	TsExport,
	type TsExporteeNames,
	TsExporteeTree,
	TsFunParam,
	TsFunSig,
	TsGlobal,
	TsIdent,
	type TsIdentLibraryScoped,
	type TsIdentLibrarySimple,
	type TsIdentModule,
	type TsIdentSimple,
	TsImport,
	TsImportedIdent,
	TsImporteeFrom,
	TsImporteeLocal,
	TsLiteral,
	type TsMemberCall,
	type TsMemberCtor,
	type TsMemberFunction,
	type TsMemberProperty,
	TsParsedFile,
	TsProtectionLevel,
	TsQIdent,
	type TsType,
	type TsTypeIntersect,
	type TsTypeKeyOf,
	TsTypeLiteral,
	type TsTypeParam,
	type TsTypeQuery,
	TsTypeRef,
} from "@/internal/ts/trees.js";

// ============================================================================
// Scope Creation Utilities
// ============================================================================

/**
 * Creates a mock TsTreeScope for testing that can handle lookups.
 * This creates a scope with a mock parsed file containing the provided declarations.
 *
 * @param libraryName - Optional library name (defaults to "test-lib")
 * @param declarations - Optional declarations to populate the scope with
 * @returns A mock TsTreeScope instance
 */
export function createMockScope(
	libraryName: string = "test-lib",
	...declarations: any[]
): TsTreeScope {
	const libIdent = TsIdent.librarySimple(libraryName);

	// Create a mock parsed file with the declarations
	const parsedFile = TsParsedFile.create(
		NoComments.instance,
		IArray.Empty, // directives
		IArray.fromArray(declarations),
		CodePath.noPath(),
	);

	// Create a dependency map with our mock file
	const deps = new Map<TsLib, TsParsedFile>();
	const lib: TsLib = { libName: libIdent };
	deps.set(lib, parsedFile);

	const root = TsTreeScope.create(
		libIdent,
		false, // pedantic
		deps,
		Logger.DevNull(),
	);

	// Return a scoped version that includes our parsed file
	return root["/"](parsedFile);
}

/**
 * Alias for createMockScope for backward compatibility.
 */
export const createEmptyScope = createMockScope;

/**
 * Creates a LoopDetector for testing.
 * This is a simple wrapper around LoopDetector.initial for consistency.
 *
 * @returns A LoopDetector initialized to the initial state
 */
export function createLoopDetector(): LoopDetector {
	return LoopDetector.initial;
}

/**
 * Creates a function parameter for testing.
 *
 * @param name - The parameter name
 * @param tpe - Optional parameter type (defaults to string)
 * @returns A TsFunParam
 */
export function createFunParam(
	name: string,
	tpe: Option<TsType> = some(TsTypeRef.string),
): TsFunParam {
	return TsFunParam.create(Comments.empty(), createSimpleIdent(name), tpe);
}

// ============================================================================
// Type Reference Creation Utilities
// ============================================================================

/**
 * Creates a mock TsTypeRef with all required properties and methods.
 *
 * @param name - The type name as a string
 * @param tparams - Optional type parameters (defaults to empty)
 * @param comments - Optional comments (defaults to empty)
 * @returns A properly formed TsTypeRef
 */
export function createTypeRef(
	name: string,
	tparams: IArray<any> = IArray.Empty,
	comments: Comments = Comments.empty(),
): TsTypeRef {
	const qname = TsQIdent.of(TsIdent.simple(name));
	return {
		_tag: "TsTypeRef",
		asString: `TsTypeRef(${name})`,
		comments,
		name: qname,
		tparams,
		withComments: (cs: Comments) => createTypeRef(name, tparams, cs),
		addComment: (c: any) => createTypeRef(name, tparams, comments.add(c)),
	};
}

/**
 * Creates a TsTypeIntersect representing an intersection of multiple types.
 *
 * @param types - The types to intersect
 * @returns A TsTypeIntersect object
 */
export function createIntersectionType(...types: TsTypeRef[]): TsTypeIntersect {
	return {
		_tag: "TsTypeIntersect",
		asString: types.map((t) => t.asString).join(" & "),
		types: IArray.fromArray(types as any[]), // Cast to TsType[] since TsTypeRef extends TsType
	};
}

/**
 * Creates a TsTypeQuery representing a typeof expression.
 *
 * @param expr - The expression to query the type of
 * @returns A TsTypeQuery object
 */
export function createTypeQuery(expr: TsQIdent): TsTypeQuery {
	return {
		_tag: "TsTypeQuery",
		asString: `typeof ${expr.asString}`,
		expr: expr,
	};
}

/**
 * Creates a TsTypeLiteral representing a literal type.
 *
 * @param value - The literal value
 * @returns A TsTypeLiteral object
 */
export function createTypeLiteral(value: string): TsTypeLiteral {
	return TsTypeLiteral.create(TsLiteral.str(value));
}

/**
 * Creates a TsTypeKeyOf representing a keyof expression.
 *
 * @param key - The type to get the keys of
 * @returns A TsTypeKeyOf object
 */
export function createKeyOfType(key: TsType): TsTypeKeyOf {
	return {
		_tag: "TsTypeKeyOf",
		key,
		asString: `keyof ${key.asString}`,
	};
}

// ============================================================================
// Declaration Creation Utilities
// ============================================================================

/**
 * Creates a mock TsDeclClass with all required properties.
 *
 * @param name - The class name
 * @param membersOrParent - Either members (IArray<any>) or parent class (TsTypeRef)
 * @param implementsInterfaces - Optional interfaces to implement (when parent is provided)
 * @param members - Optional class members (when parent is provided)
 * @param isAbstract - Whether the class is abstract (defaults to false)
 * @returns A mock TsDeclClass
 */
export function createMockClass(
	name: string,
	membersOrParent?: IArray<any> | TsTypeRef,
	implementsInterfaces?: IArray<TsTypeRef>,
	members?: IArray<any>,
	isAbstract: boolean = false,
): TsDeclClass {
	// Determine if the second parameter is members or parent
	let parent: TsTypeRef | undefined;
	let actualMembers: IArray<any>;
	let actualImplementsInterfaces: IArray<TsTypeRef>;

	if (
		membersOrParent &&
		"_tag" in membersOrParent &&
		membersOrParent._tag === "TsTypeRef"
	) {
		// Second parameter is parent
		parent = membersOrParent as TsTypeRef;
		actualMembers = members || IArray.Empty;
		actualImplementsInterfaces = implementsInterfaces || IArray.Empty;
	} else {
		// Second parameter is members (or undefined)
		parent = undefined;
		actualMembers = (membersOrParent as IArray<any>) || IArray.Empty;
		actualImplementsInterfaces = IArray.Empty;
	}

	return {
		_tag: "TsDeclClass",
		asString: `class ${name}`,
		comments: Comments.empty(),
		declared: false,
		isAbstract,
		name: TsIdent.simple(name),
		tparams: IArray.Empty,
		parent: parent ? some(parent) : none,
		implementsInterfaces: actualImplementsInterfaces,
		members: actualMembers,
		jsLocation: JsLocation.zero(),
		codePath: CodePath.noPath(),
		withCodePath: function (cp: CodePath) {
			return { ...this, codePath: cp };
		},
		withJsLocation: function (loc: any) {
			return { ...this, jsLocation: loc };
		},
		membersByName: new Map(),
		unnamed: IArray.Empty,
		withName: function (n: any) {
			return { ...this, name: n };
		},
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
	};
}

/**
 * Creates a mock TsDeclInterface with all required properties.
 *
 * @param name - The interface name
 * @param members - Optional interface members (defaults to empty)
 * @param inheritance - Optional parent interfaces (defaults to empty)
 * @returns A mock TsDeclInterface
 */
export function createMockInterface(
	name: string,
	members: IArray<any> = IArray.Empty,
	inheritance?: IArray<TsTypeRef>,
): TsDeclInterface {
	return {
		_tag: "TsDeclInterface",
		asString: `interface ${name}`,
		comments: Comments.empty(),
		declared: false,
		name: TsIdent.simple(name),
		tparams: IArray.Empty,
		inheritance: inheritance || IArray.Empty,
		members,
		codePath: CodePath.noPath(),
		withCodePath: function (cp: CodePath) {
			return { ...this, codePath: cp };
		},
		membersByName: new Map(),
		unnamed: IArray.Empty,
		withName: function (n: any) {
			return { ...this, name: n };
		},
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
	};
}

/**
 * Creates a mock TsDeclNamespace with all required properties.
 *
 * @param name - The namespace name
 * @param members - Optional namespace members
 * @returns A mock TsDeclNamespace
 */
export function createMockNamespace(
	name: string,
	members: IArray<any> = IArray.Empty,
): TsDeclNamespace {
	return {
		_tag: "TsDeclNamespace",
		asString: `namespace ${name}`,
		comments: Comments.empty(),
		declared: false,
		name: TsIdent.simple(name),
		members,
		jsLocation: JsLocation.zero(),
		codePath: CodePath.noPath(),
		withCodePath: function (cp: CodePath) {
			return { ...this, codePath: cp };
		},
		withJsLocation: function (loc: any) {
			return { ...this, jsLocation: loc };
		},
		membersByName: new Map(),
		unnamed: IArray.Empty,
		nameds: IArray.Empty,
		exports: IArray.Empty,
		imports: IArray.Empty,
		isModule: false,
		withName: function (n: any) {
			return { ...this, name: n };
		},
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
		withMembers: function (ms: any) {
			return { ...this, members: ms };
		},
		modules: new Map(),
		augmentedModules: IArray.Empty,
		augmentedModulesMap: new Map(),
	};
}

/**
 * Creates a mock TsDeclVar (variable declaration) with all required properties.
 *
 * @param name - The variable name
 * @param tpe - Optional type of the variable
 * @param readOnly - Whether the variable is readonly (defaults to false)
 * @returns A mock TsDeclVar
 */
export function createMockVariable(
	name: string,
	tpe?: TsTypeRef,
	readOnly: boolean = false,
): TsDeclVar {
	return {
		_tag: "TsDeclVar",
		asString: `var ${name}`,
		comments: Comments.empty(),
		declared: false,
		readOnly,
		name: TsIdent.simple(name),
		tpe: tpe ? some(tpe) : none,
		expr: none,
		jsLocation: JsLocation.zero(),
		codePath: CodePath.noPath(),
		withCodePath: function (cp: CodePath) {
			return { ...this, codePath: cp };
		},
		withJsLocation: function (loc: any) {
			return { ...this, jsLocation: loc };
		},
		withName: function (n: any) {
			return { ...this, name: n };
		},
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
	};
}

/**
 * Creates a mock TsDeclModule with all required properties.
 *
 * @param name - The module name
 * @param members - Optional module members
 * @returns A mock TsDeclModule
 */
export function createMockModule(
	name: string,
	members: IArray<any> = IArray.Empty,
): TsDeclModule {
	return {
		_tag: "TsDeclModule",
		asString: `module ${name}`,
		comments: Comments.empty(),
		declared: false,
		name: TsIdent.module(none, [name]),
		members,
		codePath: CodePath.noPath(),
		jsLocation: JsLocation.zero(),
		withCodePath: function (cp: CodePath) {
			return { ...this, codePath: cp };
		},
		withJsLocation: function (loc: any) {
			return { ...this, jsLocation: loc };
		},
		membersByName: new Map(),
		unnamed: IArray.Empty,
		nameds: IArray.Empty,
		exports: IArray.Empty,
		imports: IArray.Empty,
		isModule: true,
		withName: function (n: any) {
			// Convert module to namespace when changing name
			return createMockNamespace(n.value || n, this.members);
		},
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
		withMembers: function (ms: any) {
			return { ...this, members: ms };
		},
		modules: new Map(),
		augmentedModules: IArray.Empty,
		augmentedModulesMap: new Map(),
	};
}

/**
 * Creates a mock TsDeclFunction with all required properties.
 *
 * @param name - The function name
 * @param returnType - Optional return type (defaults to any)
 * @param comments - Optional comments
 * @returns A mock TsDeclFunction
 */
export function createMockFunction(
	name: string,
	returnType?: TsType,
	comments: Comments = Comments.empty(),
): TsDeclFunction {
	const signature = TsFunSig.create(
		Comments.empty(),
		IArray.Empty, // tparams
		IArray.Empty, // params
		some(returnType || TsTypeRef.any),
	);

	return {
		_tag: "TsDeclFunction",
		asString: `function ${name}()`,
		comments,
		declared: false,
		name: TsIdent.simple(name),
		signature,
		jsLocation: JsLocation.zero(),
		codePath: CodePath.noPath(),
		withCodePath: function (cp: CodePath) {
			return { ...this, codePath: cp };
		},
		withJsLocation: function (loc: any) {
			return { ...this, jsLocation: loc };
		},
		withName: function (n: any) {
			return { ...this, name: n };
		},
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
	};
}

/**
 * Creates a mock TsDeclTypeAlias with all required properties.
 *
 * @param name - The type alias name
 * @param alias - The aliased type
 * @returns A mock TsDeclTypeAlias
 */
export function createMockTypeAlias(
	name: string,
	alias: TsType,
): TsDeclTypeAlias {
	return {
		_tag: "TsDeclTypeAlias",
		asString: `type ${name} = ${alias.asString}`,
		comments: Comments.empty(),
		declared: false,
		name: TsIdent.simple(name),
		tparams: IArray.Empty,
		alias,
		codePath: CodePath.noPath(),
		withCodePath: function (cp: CodePath) {
			return { ...this, codePath: cp };
		},
		withName: function (n: any) {
			return { ...this, name: n };
		},
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
	};
}

/**
 * Creates a mock TsGlobal with all required properties.
 *
 * @param members - Optional members array (defaults to empty)
 * @param declared - Whether this is a declared global (defaults to false)
 * @param comments - Optional comments (defaults to empty)
 * @returns A mock TsGlobal
 */
export function createMockGlobal(
	members: any[] = [],
	declared: boolean = false,
	comments: Comments = Comments.empty(),
): TsGlobal {
	return TsGlobal.create(
		comments,
		declared,
		createIArray(members),
		CodePath.noPath(),
	);
}

// ============================================================================
// Member Creation Utilities
// ============================================================================

/**
 * Creates a mock TsMemberProperty with all required properties.
 *
 * @param name - The property name
 * @param tpe - Optional property type (defaults to string)
 * @param isStatic - Whether the property is static (defaults to false)
 * @param isReadOnly - Whether the property is readonly (defaults to false)
 * @returns A mock TsMemberProperty
 */
export function createMockProperty(
	name: string,
	tpe?: any,
	isStatic: boolean = false,
	isReadOnly: boolean = false,
): TsMemberProperty {
	return {
		_tag: "TsMemberProperty",
		asString: `${name}: ${tpe?.asString || "string"}`,
		comments: Comments.empty(),
		level: TsProtectionLevel.default(),
		name: TsIdent.simple(name),
		tpe: tpe ? some(tpe) : some(TsTypeRef.string),
		expr: none,
		isStatic,
		isReadOnly,
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
	};
}

/**
 * Creates a mock TsMemberFunction with all required properties.
 *
 * @param name - The method name
 * @param returnType - Optional return type (defaults to any)
 * @param isStatic - Whether the method is static (defaults to false)
 * @param comments - Optional comments
 * @returns A mock TsMemberFunction
 */
export function createMockMethod(
	name: string,
	returnType?: any,
	isStatic: boolean = false,
	comments: Comments = Comments.empty(),
): TsMemberFunction {
	const signature = TsFunSig.create(
		Comments.empty(),
		IArray.Empty, // tparams
		IArray.Empty, // params
		some(returnType || TsTypeRef.any),
	);

	return {
		_tag: "TsMemberFunction",
		asString: `${name}(): ${returnType?.asString || "any"}`,
		comments,
		level: TsProtectionLevel.default(),
		name: TsIdent.simple(name),
		methodType: MethodType.normal(),
		signature: signature,
		isStatic,
		isReadOnly: false,
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
	};
}

/**
 * Creates a mock TsMemberCall with all required properties.
 *
 * @param comments - Optional comments
 * @returns A mock TsMemberCall
 */
export function createMockMemberCall(
	comments: Comments = Comments.empty(),
): TsMemberCall {
	const signature = TsFunSig.create(
		Comments.empty(),
		IArray.Empty, // tparams
		IArray.Empty, // params
		some(TsTypeRef.any),
	);

	return {
		_tag: "TsMemberCall",
		asString: `()`,
		comments,
		level: TsProtectionLevel.default(),
		signature,
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
	};
}

/**
 * Creates a mock TsMemberCtor with all required properties.
 *
 * @param comments - Optional comments
 * @returns A mock TsMemberCtor
 */
export function createMockMemberCtor(
	comments: Comments = Comments.empty(),
): TsMemberCtor {
	const signature = TsFunSig.create(
		Comments.empty(),
		IArray.Empty, // tparams
		IArray.Empty, // params
		some(TsTypeRef.any),
	);

	return {
		_tag: "TsMemberCtor",
		asString: `constructor()`,
		comments,
		level: TsProtectionLevel.default(),
		signature,
		withComments: function (cs: any) {
			return { ...this, comments: cs };
		},
		addComment: function (_c: any) {
			return this;
		},
	};
}

// ============================================================================
// Convenience Functions and Aliases
// ============================================================================

/**
 * Creates a simple TsQIdent from a string name.
 *
 * @param name - The identifier name
 * @returns A TsQIdent
 */
export function createQIdent(name: string): TsQIdent {
	return TsQIdent.of(TsIdent.simple(name));
}

/**
 * Creates a TsQIdent from multiple string parts.
 * Can handle empty parts array for creating empty qualified identifiers.
 *
 * @param parts - The identifier parts (can be empty)
 * @returns A TsQIdent
 */
export function createQIdentFromParts(...parts: string[]): TsQIdent {
	return TsQIdent.ofStrings(...parts);
}

/**
 * Creates a simple TsIdent from a string name.
 *
 * @param name - The identifier name
 * @returns A TsIdent
 */
export function createIdent(name: string): TsIdent {
	return TsIdent.simple(name);
}

/**
 * Creates an IArray from a regular JavaScript array.
 *
 * @param items - The items to put in the IArray
 * @returns An IArray containing the items
 */
export function createIArray<T>(items: T[]): IArray<T> {
	return IArray.fromArray<T>(items);
}

/**
 * Creates an empty IArray.
 *
 * @returns An empty IArray
 */
export function createEmptyIArray<T>(): IArray<T> {
	return IArray.Empty;
}

// ============================================================================
// Library and Identifier Creation Utilities
// ============================================================================

/**
 * Creates a simple library identifier.
 *
 * @param name - The library name
 * @returns A TsIdentLibrarySimple
 */
export function createSimpleLibrary(name: string): TsIdentLibrarySimple {
	return TsIdent.librarySimple(name);
}

/**
 * Creates a scoped library identifier.
 *
 * @param scope - The scope name
 * @param name - The library name
 * @returns A TsIdentLibraryScoped
 */
export function createScopedLibrary(
	scope: string,
	name: string,
): TsIdentLibraryScoped {
	return TsIdent.libraryScoped(scope, name);
}

/**
 * Creates a simple identifier.
 *
 * @param name - The identifier name
 * @returns A TsIdentSimple
 */
export function createSimpleIdent(name: string): TsIdentSimple {
	return TsIdent.simple(name);
}

/**
 * Creates a module identifier.
 *
 * @param name - The module name
 * @returns A TsIdentModule
 */
export function createModuleIdent(name: string): TsIdentModule {
	return TsIdent.module(none, [name]);
}

/**
 * Creates a type parameter.
 *
 * @param name - The type parameter name
 * @returns A TsTypeParam
 */
export function createTypeParam(name: string): TsTypeParam {
	return {
		_tag: "TsTypeParam",
		comments: Comments.empty(),
		name: createSimpleIdent(name),
		upperBound: none,
		default: none,
		withComments: (_cs) => createTypeParam(name),
		addComment: (_c) => createTypeParam(name),
		asString: `TsTypeParam(${name})`,
	};
}

/**
 * Creates a mock parsed file.
 *
 * @param members - The members to include in the parsed file
 * @returns A mock TsParsedFile
 */
export function createParsedFile(
	members: IArray<TsContainerOrDecl>,
): TsParsedFile {
	return TsParsedFile.create(
		Comments.empty(),
		IArray.Empty, // directives
		members,
		CodePath.noPath(),
	);
}

/**
 * Creates a mock parsed file with library name.
 *
 * @param libName - The library name
 * @returns A mock TsParsedFile
 */
export function createMockParsedFile(_libName: string): TsParsedFile {
	return TsParsedFile.createMock();
}

/**
 * Creates a CodePath.
 *
 * @param libName - Optional library name (defaults to 'test-lib')
 * @param pathName - Optional path name (defaults to 'TestPath')
 * @returns A CodePath
 */
export function createCodePath(
	libName: string = "test-lib",
	pathName: string = "TestPath",
): CodePath {
	return CodePath.hasPath(
		TsIdent.librarySimple(libName),
		TsQIdent.of(createSimpleIdent(pathName)),
	);
}

/**
 * Creates a JsLocation.
 *
 * @returns A JsLocation at zero position
 */
export function createJsLocation(): JsLocation {
	return JsLocation.zero();
}

/**
 * Creates comments from raw strings.
 *
 * @param raw - The raw comment string
 * @returns Comments object
 */
export function createCommentsWithRaw(raw: string): Comments {
	return Comments.apply([new Raw(raw)]);
}

/**
 * Creates comments from multiple raw strings.
 *
 * @param raws - The raw comment strings
 * @returns Comments object
 */
export function createCommentsWithMultiple(...raws: string[]): Comments {
	return Comments.apply(raws.map((raw) => new Raw(raw)));
}

// ============================================================================
// Export and Import Creation Utilities
// ============================================================================

/**
 * Creates a mock export declaration.
 *
 * @param name - The export name
 * @returns A mock TsExport
 */
export function createMockExport(name: string): TsExport {
	const exportee = TsExporteeTree.create(createMockVariable(name));
	return TsExport.create(
		Comments.empty(),
		false, // typeOnly
		ExportType.named(),
		exportee,
	);
}

/**
 * Creates a mock export declaration with TsExporteeNames.
 *
 * @param name - The export name
 * @returns A mock TsExport
 */
export function createMockExportDecl(name: string): TsExport {
	const exportee: TsExporteeNames = {
		_tag: "TsExporteeNames",
		idents: createIArray([[createQIdent(name), none as Option<TsIdentSimple>]]),
		fromOpt: none,
		asString: `TsExporteeNames(${name})`,
	};

	return {
		_tag: "TsExport",
		comments: Comments.empty(),
		typeOnly: false,
		tpe: ExportType.named(),
		exported: exportee,
		asString: `TsExport(${name})`,
	};
}

/**
 * Creates a mock import declaration.
 *
 * @param moduleName - The module name to import from
 * @param isLocal - Whether it's a local import (defaults to false)
 * @returns A mock TsImport
 */
export function createMockImport(
	moduleName: string,
	isLocal: boolean = false,
): TsImport {
	const importee = isLocal
		? TsImporteeLocal.create(TsQIdent.ofStrings("localModule"))
		: TsImporteeFrom.create(createModuleIdent(moduleName));

	const imported = IArray.fromArray([
		TsImportedIdent.create(createSimpleIdent(moduleName)),
	] as any[]);

	return TsImport.create(
		false, // typeOnly
		imported,
		importee,
	);
}

/**
 * Creates a mock augmented module.
 *
 * @param name - The module name
 * @returns A mock TsAugmentedModule
 */
export function createMockAugmentedModule(name: string): TsAugmentedModule {
	return TsAugmentedModule.create(
		Comments.empty(),
		createModuleIdent(name),
		IArray.Empty, // members
		CodePath.noPath(),
		JsLocation.zero(),
	);
}

// ============================================================================
// Specialized Mock Functions
// ============================================================================

/**
 * Creates a mock function signature.
 *
 * @param returnType - Optional return type (defaults to any)
 * @returns A mock TsFunSig
 */
export function createMockFunSig(returnType?: TsType): TsFunSig {
	return TsFunSig.create(
		Comments.empty(),
		IArray.Empty, // tparams
		IArray.Empty, // params
		some(returnType || TsTypeRef.any),
	);
}

/**
 * Creates a basic TsLib structure.
 *
 * @param name - The library name
 * @returns A basic library object
 */
export function createBasicTsLib(
	name: TsIdentLibrarySimple | TsIdentLibraryScoped,
) {
	return {
		libName: name,
		packageJsonOpt: undefined,
	};
}

/**
 * Creates a mock logger.
 *
 * @returns A mock Logger
 */
export function createMockLogger(): Logger<void> {
	return Logger.DevNull();
}

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Factory for creating common test scenarios with pre-configured objects.
 */
export const TestScenarios = {
	/**
	 * Creates a simple class with a parent and some interfaces.
	 */
	classWithInheritance: (
		className: string = "TestClass",
		parentName: string = "BaseClass",
		interfaceNames: string[] = ["Interface1", "Interface2"],
	) => {
		const parent = createTypeRef(parentName);
		const interfaces = createIArray(
			interfaceNames.map((name) => createTypeRef(name)),
		);
		return createMockClass(className, parent, interfaces);
	},

	/**
	 * Creates an interface with inheritance.
	 */
	interfaceWithInheritance: (
		interfaceName: string = "TestInterface",
		parentNames: string[] = ["BaseInterface1", "BaseInterface2"],
	) => {
		const parents = createIArray(
			parentNames.map((name) => createTypeRef(name)),
		);
		return createMockInterface(interfaceName, parents);
	},

	/**
	 * Creates a namespace with various member types.
	 */
	namespaceWithMembers: (
		namespaceName: string = "TestNamespace",
		memberNames: string[] = ["member1", "member2"],
	) => {
		const members = createIArray(
			memberNames.map((name) => createMockVariable(name)),
		);
		return createMockNamespace(namespaceName, members);
	},

	/**
	 * Creates a class with various member types.
	 */
	classWithMembers: (
		className: string = "TestClass",
		propertyNames: string[] = ["prop1", "prop2"],
		methodNames: string[] = ["method1", "method2"],
	) => {
		const properties = propertyNames.map((name) => createMockProperty(name));
		const methods = methodNames.map((name) => createMockMethod(name));
		const members = createIArray([...properties, ...methods]);
		return createMockClass(className, undefined, undefined, members);
	},
};

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if an object is a TsDeclClass.
 */
export function isTsDeclClass(obj: any): obj is TsDeclClass {
	return obj && obj._tag === "TsDeclClass";
}

/**
 * Type guard to check if an object is a TsDeclInterface.
 */
export function isTsDeclInterface(obj: any): obj is TsDeclInterface {
	return obj && obj._tag === "TsDeclInterface";
}

/**
 * Type guard to check if an object is a TsDeclNamespace.
 */
export function isTsDeclNamespace(obj: any): obj is TsDeclNamespace {
	return obj && obj._tag === "TsDeclNamespace";
}

/**
 * Type guard to check if an object is a TsDeclVar.
 */
export function isTsDeclVar(obj: any): obj is TsDeclVar {
	return obj && obj._tag === "TsDeclVar";
}

/**
 * Type guard to check if an object is a TsMemberProperty.
 */
export function isTsMemberProperty(obj: any): obj is TsMemberProperty {
	return obj && obj._tag === "TsMemberProperty";
}

/**
 * Type guard to check if an object is a TsMemberFunction.
 */
export function isTsMemberFunction(obj: any): obj is TsMemberFunction {
	return obj && obj._tag === "TsMemberFunction";
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Helper functions for common test assertions.
 */
export const TestAssertions = {
	/**
	 * Asserts that an IArray has the expected length.
	 */
	hasLength: <T>(array: IArray<T>, expectedLength: number): boolean => {
		return array.length === expectedLength;
	},

	/**
	 * Asserts that an IArray contains a specific item.
	 */
	contains: <T>(array: IArray<T>, item: T): boolean => {
		return array.toArray().includes(item);
	},

	/**
	 * Asserts that an IArray does not contain a specific item.
	 */
	doesNotContain: <T>(array: IArray<T>, item: T): boolean => {
		return !array.toArray().includes(item);
	},

	/**
	 * Asserts that two IArrays have the same contents (order matters).
	 */
	arraysEqual: <T>(array1: IArray<T>, array2: IArray<T>): boolean => {
		if (array1.length !== array2.length) return false;
		const arr1 = array1.toArray();
		const arr2 = array2.toArray();
		return arr1.every((item, index) => item === arr2[index]);
	},
};