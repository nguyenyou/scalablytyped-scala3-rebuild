/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.DeriveNonConflictingName
 *
 * Sometimes we need to name things in Scala where they were anonymous in Typescript.
 *
 * This tries to look at the contents of the code and name it based on member names first, and then whatever other
 * strings it can find. We try to make the names as short as possible, and only generate longer names on conflict.
 *
 * This means that our naming is order-dependent, which... might not be good at all.
 *
 * If the algorithm is unable to come up with a non-conflicting name, it adds the hashCode() of the members.
 */

import { none, type Option, some } from "fp-ts/Option";
import { IArray, NumberOrdering, partialFunction } from "../IArray.js";
import {
	type IndexingDict,
	type IndexingSingle,
	TsIdent,
	type TsIdentSimple,
	type TsMember,
	type TsMemberCall,
	type TsMemberCtor,
	type TsMemberFunction,
	type TsMemberIndex,
	type TsMemberProperty,
	type TsType,
	type TsTypeRef,
} from "./trees.js";

/**
 * Represents a naming detail extracted from a member
 */
export class Detail {
	constructor(
		public readonly short: string,
		public readonly long: string = short,
	) {}

	/**
	 * Pick the appropriate version based on whether we want the long version
	 */
	pick(wantLong: boolean): string {
		return wantLong ? this.long : this.short;
	}

	/**
	 * Static factory method for creating a Detail with same short and long values
	 */
	static of(s: string): Detail {
		return new Detail(s, s);
	}

	/**
	 * Ordering for Details based on short string
	 */
	static compare(a: Detail, b: Detail): number {
		return a.short.localeCompare(b.short);
	}

	/**
	 * Format a string by filtering to letters/digits and capitalizing
	 */
	static pretty(str: string): string {
		const filtered = str.replace(/[^a-zA-Z0-9]/g, "");
		return filtered.charAt(0).toUpperCase() + filtered.slice(1);
	}

	/**
	 * Format an optional type into a pretty string
	 */
	static prettyTypeOpt(tpeOpt: Option<TsType>): Option<string> {
		if (tpeOpt._tag === "Some") {
			return some(Detail.prettyType(tpeOpt.value));
		}
		return none;
	}

	/**
	 * Format a type into a pretty string
	 */
	static prettyType(tpe: TsType): string {
		if (tpe._tag === "TsTypeRef") {
			const typeRef = tpe as TsTypeRef;
			const lastPart = typeRef.name.parts.apply(typeRef.name.parts.length - 1);
			return Detail.pretty(lastPart.value);
		}
		return "";
	}
}

/**
 * Main namespace for deriving non-conflicting names
 */
export const DeriveNonConflictingName = {
	Anon: "",
	Fn: "Fn",

	get isMeaningless(): Set<string> {
		return new Set([
			DeriveNonConflictingName.Anon,
			DeriveNonConflictingName.Fn,
		]);
	},

	/**
	 * Main function to derive a non-conflicting name
	 */
	apply<T>(
		prefix: string,
		members: IArray<TsMember>,
	): (tryCreate: (name: TsIdentSimple) => Option<T>) => T {
		return (tryCreate: (name: TsIdentSimple) => Option<T>): T => {
			// Extract details from calls
			const fromCalls: Option<Detail> = (() => {
				const calls = members.collect(
					partialFunction<TsMember, TsMemberCall>(
						(member) => member._tag === "TsMemberCall",
						(member) => member as TsMemberCall,
					),
				);

				if (calls.isEmpty) {
					return none;
				}

				const longest = calls.maxBy(
					(call) => call.signature.params.length,
					NumberOrdering,
				);
				const paramNames = longest.signature.params
					.map((param) => Detail.pretty(param.name.value))
					.mkString("", "", "");

				return some(new Detail("Call", `Call${paramNames}`));
			})();

			// Extract details from members (properties, functions, index signatures)
			const fromMembers: IArray<Detail> = members
				.collect(
					partialFunction<TsMember, Detail>(
						(member) =>
							member._tag === "TsMemberProperty" ||
							member._tag === "TsMemberIndex" ||
							member._tag === "TsMemberFunction",
						(member) => {
							switch (member._tag) {
								case "TsMemberProperty": {
									const prop = member as TsMemberProperty;
									const short = Detail.pretty(prop.name.value);
									const typeStr = Detail.prettyTypeOpt(prop.tpe);
									const long =
										typeStr._tag === "Some" ? short + typeStr.value : short;
									return new Detail(short, long);
								}

								case "TsMemberIndex": {
									const index = member as TsMemberIndex;
									if (index.indexing._tag === "IndexingSingle") {
										const single = index.indexing as IndexingSingle;
										const short = Detail.pretty(
											single.name.parts.apply(single.name.parts.length - 1)
												.value,
										);
										const typeStr = Detail.prettyTypeOpt(index.valueType);
										const long =
											typeStr._tag === "Some" ? short + typeStr.value : short;
										return new Detail(short, long);
									}
									throw new Error("Unexpected IndexingDict in fromMembers");
								}

								case "TsMemberFunction": {
									const func = member as TsMemberFunction;
									const short = Detail.pretty(func.name.value);
									return Detail.of(short);
								}

								default:
									throw new Error("Unexpected member type");
							}
						},
					),
				)
				.sorted(Detail.compare)
				.distinct();

			// Extract details from constructors
			const fromInstantiable: Option<Detail> = (() => {
				const result = members.collectFirst(
					partialFunction<TsMember, Detail>(
						(member) => member._tag === "TsMemberCtor",
						(member) => {
							const ctor = member as TsMemberCtor;
							const short = "Instantiable";
							const typeStr = Detail.prettyTypeOpt(ctor.signature.resultType);
							const long =
								typeStr._tag === "Some" ? short + typeStr.value : short;
							return new Detail(short, long);
						},
					),
				);
				return result ? some(result) : none;
			})();

			// Extract details from dictionary-style index signatures
			const fromDict: Option<Detail> = (() => {
				const result = members.collectFirst(
					partialFunction<TsMember, Detail>(
						(member) =>
							member._tag === "TsMemberIndex" &&
							(member as TsMemberIndex).indexing._tag === "IndexingDict",
						(member) => {
							const index = member as TsMemberIndex;
							const dict = index.indexing as IndexingDict;
							const short = Detail.pretty(`Dict${dict.name.value}`);
							const inTypeStr = some(Detail.prettyType(dict.tpe));
							const outTypeStr = Detail.prettyTypeOpt(index.valueType);

							const parts: string[] = [short];
							if (inTypeStr._tag === "Some") parts.push(inTypeStr.value);
							if (outTypeStr._tag === "Some") parts.push(outTypeStr.value);

							const long = parts.join("");
							return new Detail(short, long);
						},
					),
				);
				return result ? some(result) : none;
			})();

			// Combine all details
			const allDetails = IArray.fromOptions(
				fromCalls,
				fromInstantiable,
				fromDict,
			).concat(fromMembers);

			// Generate name variants
			const nameVariants = DeriveNonConflictingName.generateNameVariants(
				prefix,
				allDetails,
			);

			// Try each variant
			for (const name of nameVariants) {
				const result = tryCreate(TsIdent.simple(name));
				if (result._tag === "Some") {
					return result.value;
				}
			}

			// Fallback to numbered names
			return DeriveNonConflictingName.fallback(prefix, tryCreate);
		};
	},

	/**
	 * Generate name variants by combining prefix with member details
	 */
	generateNameVariants(
		prefix: string,
		details: IArray<Detail>,
	): Generator<string> {
		return (function* () {
			const isMeaninglessPrefix =
				DeriveNonConflictingName.isMeaningless.has(prefix);

			// For each version (short first, then long)
			for (const longVersion of [false, true]) {
				// For each amount of details to include
				const startAmount = isMeaninglessPrefix ? 1 : 0;
				for (let amount = startAmount; amount <= details.length; amount++) {
					// For each starting index
					for (let idx = 0; idx < details.length; idx++) {
						const pick = details.drop(idx).take(amount);
						const detailsPart = pick
							.map((detail) => detail.pick(longVersion))
							.mkString("", "", "");
						yield prefix + detailsPart;
					}
				}
			}
		})();
	},

	/**
	 * Fallback mechanism that generates numbered names
	 */
	fallback<T>(
		prefix: string,
		tryCreate: (name: TsIdentSimple) => Option<T>,
	): T {
		let idx = 0;
		while (true) {
			const result = tryCreate(TsIdent.simple(prefix + idx));
			if (result._tag === "Some") {
				return result.value;
			}
			idx++;
		}
	},

	// Export Detail class for testing
	Detail,
};

// Helper function to implement firstDefined functionality
function _firstDefined<T, U>(
	iterable: Iterable<T>,
	f: (item: T) => Option<U>,
): Option<U> {
	for (const item of iterable) {
		const result = f(item);
		if (result._tag === "Some") {
			return result;
		}
	}
	return none;
}
