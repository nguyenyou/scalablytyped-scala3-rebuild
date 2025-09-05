/**
 * TypeScript port of org.scalablytyped.converter.Flavour
 *
 * Represents different flavours/variants of the converter processing.
 */

// Abstract base class for Flavour
export abstract class Flavour {
	constructor(public readonly id: string) {}
}

// Concrete flavour implementations
export class NormalFlavour extends Flavour {
	constructor() {
		super("normal");
	}
}

// Flavour namespace/companion object equivalent
export namespace Flavour {
	// Singleton instances
	export const Normal = new NormalFlavour();

	// All available flavours
	export const All: Flavour[] = [Normal];

	// Lookup map by name
	export const byName: Map<string, Flavour> = new Map(
		All.map((f) => [f.id, f]),
	);

	// JSON serialization utilities (equivalent to Circe encoders/decoders)
	export const encode = (flavour: Flavour): string => flavour.id;

	export const decode = (str: string): Flavour | Error => {
		const flavour = byName.get(str);
		if (flavour) {
			return flavour;
		}
		const availableKeys = Array.from(byName.keys()).join(", ");
		return new Error(`flavour '${str}' not among ${availableKeys}`);
	};

	// JSON parsing utility
	export const fromJson = (jsonStr: string): Flavour | Error => {
		try {
			const parsed = JSON.parse(jsonStr);
			if (typeof parsed === "string") {
				return decode(parsed);
			}
			return new Error("Expected string for Flavour JSON parsing");
		} catch (error) {
			return error instanceof Error ? error : new Error("JSON parsing failed");
		}
	};

	// JSON stringification utility
	export const toJson = (flavour: Flavour): string => {
		return JSON.stringify(encode(flavour));
	};
}
