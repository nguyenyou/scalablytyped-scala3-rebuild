/**
 * TypeScript port of org.scalablytyped.converter.internal.scalajs.QualifiedName
 *
 * Represents a qualified name in Scala.js code with complete functionality
 * matching the original Scala implementation.
 */

import { pipe } from "fp-ts/function";
import type { Option } from "fp-ts/Option";
import * as O from "fp-ts/Option";
import { IArray } from "../IArray.js";
import { Name, NameToSuffix } from "./Name.js";

/**
 * Represents a qualified name (e.g., com.example.MyClass)
 * This is a complete port of the Scala QualifiedName case class
 */
export class QualifiedName {
	private _hashCode: number | undefined;

	constructor(public readonly parts: IArray<Name>) {}

	/**
	 * Append a single name to this qualified name
	 * Equivalent to Scala's `def +(name: Name)`
	 */
	add(name: Name): QualifiedName {
		return new QualifiedName(this.parts.append(name));
	}

	/**
	 * Operator-style alias for add method
	 * Provides more natural syntax: qualifiedName.plus(name)
	 */
	plus(name: Name): QualifiedName {
		return this.add(name);
	}

	/**
	 * Concatenate with another qualified name
	 * Equivalent to Scala's `def ++(other: QualifiedName)`
	 */
	concat(other: QualifiedName): QualifiedName {
		return new QualifiedName(this.parts.concat(other.parts));
	}

	/**
	 * Operator-style alias for concat method
	 * Provides more natural syntax: qualifiedName.plusPlus(other)
	 */
	plusPlus(other: QualifiedName): QualifiedName {
		return this.concat(other);
	}

	/**
	 * Check if this qualified name starts with another qualified name
	 * Equivalent to Scala's `def startsWith(other: QualifiedName)`
	 */
	startsWith(other: QualifiedName): boolean {
		if (other.parts.length > this.parts.length) {
			return false;
		}

		for (let i = 0; i < other.parts.length; i++) {
			if (!this.parts.apply(i).equals(other.parts.apply(i))) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Get cached hash code (lazy evaluation like Scala)
	 * Equivalent to Scala's `override lazy val hashCode`
	 */
	get hashCode(): number {
		if (this._hashCode === undefined) {
			// Calculate hash code based on Name objects' hash codes
			const prime = 31;
			let result = 1;
			for (let i = 0; i < this.parts.length; i++) {
				const nameHash = this.parts.apply(i).unescaped.length; // Simple hash for Name
				result = prime * result + nameHash;
			}
			this._hashCode = result;
		}
		return this._hashCode;
	}

	/**
	 * Equality check with hash code optimization
	 * Equivalent to Scala's `override def equals(obj: Any)`
	 */
	equals(obj: any): boolean {
		if (!(obj instanceof QualifiedName)) {
			return false;
		}

		const other = obj as QualifiedName;
		if (other.hashCode !== this.hashCode) {
			return false;
		}

		// Compare parts using Name.equals method
		if (this.parts.length !== other.parts.length) {
			return false;
		}

		for (let i = 0; i < this.parts.length; i++) {
			if (!this.parts.apply(i).equals(other.parts.apply(i))) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Get the full qualified name as a string
	 */
	get value(): string {
		return this.parts
			.toArray()
			.map((part) => part.value)
			.join(".");
	}

	/**
	 * Get the last part of the qualified name
	 */
	get last(): Name | undefined {
		const array = this.parts.toArray();
		return array.length > 0 ? array[array.length - 1] : undefined;
	}

	/**
	 * Get the first part of the qualified name
	 */
	get head(): Name | undefined {
		const array = this.parts.toArray();
		return array.length > 0 ? array[0] : undefined;
	}

	/**
	 * Get all parts except the last one
	 */
	get init(): QualifiedName {
		const array = this.parts.toArray();
		if (array.length <= 1) {
			return QualifiedName.empty();
		}
		return new QualifiedName(IArray.fromArray(array.slice(0, -1)));
	}

	/**
	 * Get all parts except the first one
	 */
	get tail(): QualifiedName {
		const array = this.parts.toArray();
		if (array.length <= 1) {
			return QualifiedName.empty();
		}
		return new QualifiedName(IArray.fromArray(array.slice(1)));
	}

	/**
	 * Check if this qualified name is empty
	 */
	get isEmpty(): boolean {
		return this.parts.isEmpty;
	}

	/**
	 * Check if this qualified name is non-empty
	 */
	get nonEmpty(): boolean {
		return this.parts.nonEmpty;
	}

	/**
	 * Get the length (number of parts) of this qualified name
	 */
	get length(): number {
		return this.parts.length;
	}

	/**
	 * Create a qualified name from an array of names
	 */
	static from(names: Name[]): QualifiedName {
		return new QualifiedName(IArray.fromArray(names));
	}

	/**
	 * Create a qualified name from string parts
	 */
	static fromStrings(parts: string[]): QualifiedName {
		const names = parts.map((part) => new Name(part));
		return new QualifiedName(IArray.fromArray(names));
	}

	/**
	 * Create an empty qualified name
	 */
	static empty(): QualifiedName {
		return new QualifiedName(IArray.Empty as IArray<Name>);
	}

	toString(): string {
		return this.value;
	}

	// ============================================================================
	// Functional programming methods using fp-ts
	// ============================================================================

	/**
	 * Get the last part as an Option (fp-ts style)
	 */
	get lastOption(): Option<Name> {
		return pipe(this.last, O.fromNullable);
	}

	/**
	 * Get the head part as an Option (fp-ts style)
	 */
	get headOption(): Option<Name> {
		return pipe(this.head, O.fromNullable);
	}

	/**
	 * Map over the parts of the qualified name
	 */
	map(f: (name: Name) => Name): QualifiedName {
		return new QualifiedName(this.parts.map(f));
	}

	/**
	 * Filter parts of the qualified name
	 */
	filter(predicate: (name: Name) => boolean): QualifiedName {
		return new QualifiedName(this.parts.filter(predicate));
	}

	/**
	 * Take the first n parts
	 */
	take(n: number): QualifiedName {
		return new QualifiedName(this.parts.take(n));
	}

	/**
	 * Drop the first n parts
	 */
	drop(n: number): QualifiedName {
		return new QualifiedName(this.parts.drop(n));
	}

	/**
	 * Check if any part satisfies the predicate
	 */
	exists(predicate: (name: Name) => boolean): boolean {
		return this.parts.exists(predicate);
	}

	/**
	 * Check if all parts satisfy the predicate
	 */
	forall(predicate: (name: Name) => boolean): boolean {
		return this.parts.forall(predicate);
	}

	/**
	 * Find the first part that satisfies the predicate
	 */
	find(predicate: (name: Name) => boolean): Option<Name> {
		return pipe(this.parts.find(predicate), O.fromNullable);
	}

	/**
	 * Convert to array of strings (unescaped names)
	 */
	toStringArray(): string[] {
		return this.parts.toArray().map((name) => name.unescaped);
	}

	/**
	 * Convert to array of escaped strings
	 */
	toEscapedStringArray(): string[] {
		return this.parts.toArray().map((name) => name.value);
	}

	/**
	 * Create a new qualified name with a suffix added to the last part
	 */
	withSuffix(suffix: string): QualifiedName {
		if (this.isEmpty) {
			throw new Error("Cannot add suffix to empty qualified name");
		}

		const lastPart = this.last!;
		const newLastPart = new Name(lastPart.unescaped + suffix);
		const initParts = this.init;

		return initParts.add(newLastPart);
	}

	/**
	 * Create a new qualified name with a prefix added to the first part
	 */
	withPrefix(prefix: string): QualifiedName {
		if (this.isEmpty) {
			throw new Error("Cannot add prefix to empty qualified name");
		}

		const firstPart = this.head!;
		const newFirstPart = new Name(prefix + firstPart.unescaped);
		const tailParts = this.tail;

		return QualifiedName.from([newFirstPart]).concat(tailParts);
	}

	// ============================================================================
	// Companion object functionality (static methods and constants)
	// ============================================================================

	/**
	 * Create a qualified name from a dot-separated string
	 * Equivalent to Scala's `def apply(str: String)`
	 */
	static fromString(str: string): QualifiedName {
		const parts = str.split(".").map((part) => new Name(part));
		return new QualifiedName(IArray.fromArray(parts));
	}

	// ============================================================================
	// Predefined qualified names - Java
	// ============================================================================

	static readonly java_lang = new QualifiedName(
		IArray.fromArray([Name.java, Name.lang]),
	);
	static readonly String = QualifiedName.java_lang.add(Name.String);
	static readonly Array = QualifiedName.java_lang.add(Name.Array);

	// ============================================================================
	// Predefined qualified names - Scala
	// ============================================================================

	static readonly scala = new QualifiedName(IArray.fromArray([Name.scala]));
	static readonly Any = QualifiedName.scala.add(Name.Any);
	static readonly AnyRef = QualifiedName.scala.add(Name.AnyRef);
	static readonly AnyVal = QualifiedName.scala.add(Name.AnyVal);
	static readonly Byte = QualifiedName.scala.add(Name.Byte);
	static readonly Short = QualifiedName.scala.add(Name.Short);
	static readonly Float = QualifiedName.scala.add(Name.Float);
	static readonly Double = QualifiedName.scala.add(Name.Double);
	static readonly Int = QualifiedName.scala.add(Name.Int);
	static readonly Long = QualifiedName.scala.add(Name.Long);
	static readonly Boolean = QualifiedName.scala.add(Name.Boolean);
	static readonly Unit = QualifiedName.scala.add(Name.Unit);
	static readonly Null = QualifiedName.scala.add(Name.Null);
	static readonly Nothing = QualifiedName.scala.add(Name.Nothing);

	// ============================================================================
	// Predefined qualified names - Scala.js
	// ============================================================================

	static readonly scala_scalajs = QualifiedName.scala.add(Name.scalajs);
	static readonly scala_js = QualifiedName.scala_scalajs.add(Name.js);
	static readonly JsAny = QualifiedName.scala_js.add(Name.Any);
	static readonly JsObject = QualifiedName.scala_js.add(Name.Object);
	static readonly JsArray = QualifiedName.scala_js.add(Name.Array);
	static readonly JsBigInt = QualifiedName.scala_js.add(new Name("BigInt"));
	static readonly JsThenable = QualifiedName.scala_js.add(new Name("Thenable"));
	static readonly JsPromise = QualifiedName.scala_js.add(new Name("Promise"));
	static readonly JsFunction = QualifiedName.scala_js.add(Name.Function);
	static readonly JsSymbol = QualifiedName.scala_js.add(Name.Symbol);
	static readonly JsUndefOr = QualifiedName.scala_js.add(Name.UndefOr);
	static readonly Union = QualifiedName.scala_js.add(new Name("|"));
	static readonly isUndefined = QualifiedName.scala_js.add(
		new Name("isUndefined"),
	);
	static readonly JsDictionary = QualifiedName.scala_js.add(
		new Name("Dictionary"),
	);
	static readonly JsDynamic = QualifiedName.scala_js.add(Name.Dynamic);

	// ============================================================================
	// Predefined qualified names - Runtime
	// ============================================================================

	static readonly Runtime = new QualifiedName(
		IArray.fromArray([
			new Name("org"),
			new Name("scalablytyped"),
			new Name("runtime"),
		]),
	);
	static readonly NumberDictionary = QualifiedName.Runtime.add(
		new Name("NumberDictionary"),
	);
	static readonly StringDictionary = QualifiedName.Runtime.add(
		new Name("StringDictionary"),
	);
	static readonly TopLevel = QualifiedName.Runtime.add(new Name("TopLevel"));
	static readonly Shortcut = QualifiedName.Runtime.add(new Name("Shortcut"));
	// Note: this is special. we use `jsObject` throughout, and only talk about this very late, in the `Printer`.
	static readonly StObject = QualifiedName.Runtime.add(new Name("StObject"));

	// ============================================================================
	// Predefined qualified names - Special types
	// ============================================================================

	static readonly UNION = new QualifiedName(IArray.fromArray([Name.UNION]));
	static readonly INTERSECTION = new QualifiedName(
		IArray.fromArray([Name.INTERSECTION]),
	);
	static readonly STRING_LITERAL = new QualifiedName(
		IArray.fromArray([Name.STRING_LITERAL]),
	);
	static readonly DOUBLE_LITERAL = new QualifiedName(
		IArray.fromArray([Name.DOUBLE_LITERAL]),
	);
	static readonly INT_LITERAL = new QualifiedName(
		IArray.fromArray([Name.INT_LITERAL]),
	);
	static readonly BOOLEAN_LITERAL = new QualifiedName(
		IArray.fromArray([Name.BOOLEAN_LITERAL]),
	);
	static readonly THIS = new QualifiedName(IArray.fromArray([Name.THIS]));
	static readonly WILDCARD = new QualifiedName(
		IArray.fromArray([Name.WILDCARD]),
	);
	static readonly REPEATED = new QualifiedName(
		IArray.fromArray([Name.REPEATED]),
	);
	static readonly SINGLETON = new QualifiedName(
		IArray.fromArray([Name.SINGLETON]),
	);
	static readonly UNDEFINED = new QualifiedName(
		IArray.fromArray([Name.UNDEFINED]),
	);

	// ============================================================================
	// Utility functions
	// ============================================================================

	/**
	 * Generate AnyFromFunction qualified name
	 * Equivalent to Scala's `def AnyFromFunction(n: Int)`
	 */
	static AnyFromFunction(n: number): QualifiedName {
		return QualifiedName.JsAny.add(new Name(`fromFunction${n}`));
	}

	/**
	 * Generate Instantiable qualified name
	 * Equivalent to Scala's `def Instantiable(arity: Int)`
	 */
	static Instantiable(arity: number): QualifiedName {
		return QualifiedName.Runtime.add(new Name(`Instantiable${arity}`));
	}

	/**
	 * Generate FunctionArity qualified name
	 * Equivalent to Scala's `def FunctionArity(isThis: Boolean, arity: Int)`
	 */
	static FunctionArity(isThis: boolean, arity: number): QualifiedName {
		return QualifiedName.scala_js.add(Name.FunctionArity(isThis, arity));
	}

	/**
	 * Generate ScalaFunctionArity qualified name
	 * Equivalent to Scala's `def ScalaFunctionArity(arity: Int)`
	 */
	static ScalaFunctionArity(arity: number): QualifiedName {
		return QualifiedName.scala.add(Name.FunctionArity(false, arity));
	}

	/**
	 * Generate Tuple qualified name
	 * Equivalent to Scala's `def Tuple(arity: Int)`
	 */
	static Tuple(arity: number): QualifiedName {
		if (arity === 0 || arity === 1) {
			return QualifiedName.JsArray;
		} else {
			return QualifiedName.scala_js.add(new Name(`Tuple${arity}`));
		}
	}
}

// ============================================================================
// StdNames class - equivalent to Scala's StdNames class
// ============================================================================

/**
 * Standard names for a given output package
 * Equivalent to Scala's `class StdNames(outputPkg: Name)`
 */
export class StdNames {
	public readonly lib: QualifiedName;
	public readonly Array: QualifiedName;
	public readonly Boolean: QualifiedName;
	public readonly BigInt: QualifiedName;
	public readonly ConcatArray: QualifiedName;
	public readonly Element: QualifiedName;
	public readonly Function: QualifiedName;
	public readonly HTMLElementTagNameMap: QualifiedName;
	public readonly Number: QualifiedName;
	public readonly Object: QualifiedName;
	public readonly Promise: QualifiedName;
	public readonly PromiseLike: QualifiedName;
	public readonly ReadonlyArray: QualifiedName;
	public readonly SVGElementTagNameMap: QualifiedName;
	public readonly String: QualifiedName;
	public readonly Symbol: QualifiedName;

	constructor(outputPkg: Name) {
		this.lib = new QualifiedName(IArray.fromArray([outputPkg, Name.std]));
		this.Array = this.lib.add(Name.Array);
		this.Boolean = this.lib.add(Name.Boolean);
		this.BigInt = this.lib.add(new Name("BigInt"));
		this.ConcatArray = this.lib.add(new Name("ConcatArray"));
		this.Element = this.lib.add(new Name("Element"));
		this.Function = this.lib.add(Name.Function);
		this.HTMLElementTagNameMap = this.lib.add(
			new Name("HTMLElementTagNameMap"),
		);
		this.Number = this.lib.add(new Name("Number"));
		this.Object = this.lib.add(Name.Object);
		this.Promise = this.lib.add(new Name("Promise"));
		this.PromiseLike = this.lib.add(new Name("PromiseLike"));
		this.ReadonlyArray = this.lib.add(new Name("ReadonlyArray"));
		this.SVGElementTagNameMap = this.lib.add(new Name("SVGElementTagNameMap"));
		this.String = this.lib.add(Name.String);
		this.Symbol = this.lib.add(Name.Symbol);
	}
}

// ============================================================================
// ToSuffix implementation for QualifiedName
// ============================================================================

/**
 * ToSuffix implementation for QualifiedName
 * Equivalent to Scala's `implicit val suffix: ToSuffix[QualifiedName]`
 */
export const QualifiedNameToSuffix = {
	to: (qualifiedName: QualifiedName) => {
		const lastPart = qualifiedName.last;
		if (lastPart) {
			return NameToSuffix.to(lastPart);
		}
		throw new Error("Cannot convert empty QualifiedName to suffix");
	},
};

// ============================================================================
// JSON Serialization support (equivalent to Circe encoders/decoders)
// ============================================================================

/**
 * Encoder for QualifiedName (equivalent to Circe's deriveEncoder)
 */
export const QualifiedNameEncoder = {
	encode: (qn: QualifiedName): any => {
		return qn.parts.toArray().map((name) => name.unescaped);
	},
};

/**
 * Decoder for QualifiedName (equivalent to Circe's deriveDecoder)
 */
export const QualifiedNameDecoder = {
	decode: (data: any): QualifiedName => {
		if (!Array.isArray(data)) {
			throw new Error("Expected array for QualifiedName decoding");
		}
		const names = data.map((str) => new Name(str));
		return new QualifiedName(IArray.fromArray(names));
	},
};
