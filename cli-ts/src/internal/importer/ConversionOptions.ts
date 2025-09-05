/**
 * TypeScript port of org.scalablytyped.converter.internal.importer.ConversionOptions
 */

import { Flavour } from "@/Flavour.ts";
import {
	AllExcept,
	And,
	NoneExcept,
	Or,
	type Selection,
} from "@/internal/Selection.ts";
import { Name } from "@/internal/scalajs/Name.ts";
import { TsIdentLibrary } from "../ts/trees.js";

// Dependency type for versions
export interface Dep {
	organization: string;
	name: string;
	version: string;
	type?: "scala" | "java" | "scalajs";
}

// Versions type - represents Scala and ScalaJS version information
export class ScalaVersion {
	public readonly is3: boolean;

	constructor(public readonly scalaVersion: string) {
		this.is3 = scalaVersion.startsWith("3.");
	}

	get scalaOrganization(): string {
		return "org.scala-lang";
	}

	get binVersion(): string {
		const versionMatch = this.scalaVersion.match(/(\d+)\.(\d+)\.(\d+).*/);
		if (versionMatch) {
			const [, major, minor] = versionMatch;
			if (major === "3") return "3";
			if (major === "2") return `2.${minor}`;
		}
		return this.scalaVersion;
	}
}

export class ScalaJsVersion {
	constructor(public readonly scalaJsVersion: string) {}

	get scalaJsBinVersion(): string {
		const versionMatch = this.scalaJsVersion.match(/(\d+)\.(\d+)\.(\d+).*/);
		if (versionMatch) {
			const [, major, minor] = versionMatch;
			if (major === "1") return "1";
			if (major === "0" && minor === "6") return "0.6";
		}
		return this.scalaJsVersion;
	}

	get scalaJsOrganization(): string {
		return "org.scala-js";
	}
}

export class Versions {
	public readonly runtime: Dep;
	public readonly scalaJsDom: Dep;

	public static Scala212 = new ScalaVersion("2.12.18");
	public static Scala213 = new ScalaVersion("2.13.12");
	public static Scala3 = new ScalaVersion("3.7.2");
	public static ScalaJs1 = new ScalaJsVersion("1.19.0");

	constructor(
		public readonly scala: ScalaVersion,
		public readonly scalaJs: ScalaJsVersion,
	) {
		this.runtime = {
			organization: "com.olvind",
			name: "scalablytyped-runtime",
			version: "2.4.2",
			type: "scalajs",
		};
		this.scalaJsDom = {
			organization: "org.scala-js",
			name: "scalajs-dom",
			version: "2.8.0",
			type: "scalajs",
		};
	}
}

// FlavourImpl interface - simplified for this port
export interface FlavourImpl {
	useScalaJsDomTypes: boolean;
	enableLongApplyMethod: boolean;
	outputPackage: Name;
	versions: Versions;
}

// Simple NormalFlavour implementation
export class NormalFlavour implements FlavourImpl {
	constructor(
		public readonly useScalaJsDomTypes: boolean,
		public readonly enableLongApplyMethod: boolean,
		public readonly outputPackage: Name,
		public readonly versions: Versions,
	) {}
}

// Main ConversionOptions class
export class ConversionOptions {
	public readonly ignoredLibs: Set<TsIdentLibrary>;
	public readonly ignoredModulePrefixes: Set<string[]>;
	public readonly flavourImpl: FlavourImpl;

	constructor(
		public readonly useScalaJsDomTypes: boolean,
		public readonly flavour: Flavour,
		public readonly outputPackage: Name,
		public readonly stdLibs: Set<string>,
		public readonly enableScalaJsDefined: Selection<TsIdentLibrary>,
		public readonly expandTypeMappings: Selection<TsIdentLibrary>,
		public readonly ignored: Set<string>,
		public readonly versions: Versions,
		public readonly enableLongApplyMethod: boolean,
		public readonly privateWithin?: Name,
		public readonly useDeprecatedModuleNames: boolean = false,
	) {
		// Compute derived properties
		this.ignoredLibs = new Set(
			Array.from(ignored).map((lib) => TsIdentLibrary.construct(lib)),
		);

		this.ignoredModulePrefixes = new Set(
			Array.from(ignored).map((lib) => lib.split("/")),
		);

		this.flavourImpl = new NormalFlavour(
			useScalaJsDomTypes,
			enableLongApplyMethod,
			outputPackage,
			versions,
		);
	}

	// JSON serialization utilities
	toObject(): any {
		const serializeSelection = <T>(
			selection: Selection<T>,
			itemSerializer: (item: T) => any,
		): any => {
			if (selection instanceof AllExcept) {
				return { AllExcept: Array.from(selection.values).map(itemSerializer) };
			} else if (selection instanceof NoneExcept) {
				return { NoneExcept: Array.from(selection.values).map(itemSerializer) };
			} else if (selection instanceof And) {
				return {
					And: {
						_1: serializeSelection(selection._1, itemSerializer),
						_2: serializeSelection(selection._2, itemSerializer),
					},
				};
			} else if (selection instanceof Or) {
				return {
					Or: {
						_1: serializeSelection(selection._1, itemSerializer),
						_2: serializeSelection(selection._2, itemSerializer),
					},
				};
			}
			throw new Error("Unknown Selection type");
		};

		return {
			useScalaJsDomTypes: this.useScalaJsDomTypes,
			flavour: this.flavour.id,
			outputPackage: this.outputPackage.unescaped,
			stdLibs: Array.from(this.stdLibs),
			enableScalaJsDefined: serializeSelection(
				this.enableScalaJsDefined,
				(lib: TsIdentLibrary) => lib.value,
			),
			expandTypeMappings: serializeSelection(
				this.expandTypeMappings,
				(lib: TsIdentLibrary) => lib.value,
			),
			ignored: Array.from(this.ignored),
			versions: {
				scala: this.versions.scala.scalaVersion,
				scalaJs: this.versions.scalaJs.scalaJsVersion,
			},
			enableLongApplyMethod: this.enableLongApplyMethod,
			...(this.privateWithin && {
				privateWithin: this.privateWithin.unescaped,
			}),
			useDeprecatedModuleNames: this.useDeprecatedModuleNames,
		};
	}

	toJson(): string {
		return JSON.stringify(this.toObject());
	}

	static fromObject(obj: any): ConversionOptions {
		const deserializeSelection = <T>(
			selectionObj: any,
			itemDeserializer: (item: any) => T,
		): Selection<T> => {
			if (selectionObj.AllExcept) {
				return new AllExcept(
					new Set(selectionObj.AllExcept.map(itemDeserializer)),
				);
			} else if (selectionObj.NoneExcept) {
				return new NoneExcept(
					new Set(selectionObj.NoneExcept.map(itemDeserializer)),
				);
			} else if (selectionObj.And) {
				return new And(
					deserializeSelection(selectionObj.And._1, itemDeserializer),
					deserializeSelection(selectionObj.And._2, itemDeserializer),
				);
			} else if (selectionObj.Or) {
				return new Or(
					deserializeSelection(selectionObj.Or._1, itemDeserializer),
					deserializeSelection(selectionObj.Or._2, itemDeserializer),
				);
			}
			throw new Error("Invalid Selection format");
		};

		const flavour = Flavour.decode(obj.flavour);
		if (flavour instanceof Error) {
			throw flavour;
		}

		return new ConversionOptions(
			obj.useScalaJsDomTypes,
			flavour,
			new Name(obj.outputPackage),
			new Set(obj.stdLibs),
			deserializeSelection(obj.enableScalaJsDefined, (lib: string) =>
				TsIdentLibrary.construct(lib),
			),
			deserializeSelection(obj.expandTypeMappings, (lib: string) =>
				TsIdentLibrary.construct(lib),
			),
			new Set(obj.ignored),
			new Versions(
				new ScalaVersion(obj.versions.scala),
				new ScalaJsVersion(obj.versions.scalaJs),
			),
			obj.enableLongApplyMethod,
			obj.privateWithin ? new Name(obj.privateWithin) : undefined,
			obj.useDeprecatedModuleNames || false,
		);
	}

	static fromJson(jsonStr: string): ConversionOptions | Error {
		try {
			const parsed = JSON.parse(jsonStr);
			return ConversionOptions.fromObject(parsed);
		} catch (error) {
			return error instanceof Error ? error : new Error("JSON parsing failed");
		}
	}
}

// All exports are already declared above with export keyword
