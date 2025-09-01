/**
 * TypeScript port of org.scalablytyped.converter.internal.scalajs.Name
 *
 * Represents a Scala identifier name with escaping and suffix functionality.
 */

// ToSuffix interface - equivalent to Scala's ToSuffix trait
export interface ToSuffix<T> {
  to(t: T): Suffix;
}

// Suffix class - equivalent to Scala's Suffix case class
export class Suffix {
  public static readonly Empty = new Suffix("");

  constructor(public readonly unescaped: string) {}

  add(other: Suffix): Suffix {
    if (this === Suffix.Empty && other === Suffix.Empty) return Suffix.Empty;
    if (this === Suffix.Empty) return other;
    if (other === Suffix.Empty) return this;
    return new Suffix(this.unescaped + "_" + other.unescaped);
  }

  addOptional<T>(other: T | undefined, toSuffix: ToSuffix<T>): Suffix {
    if (other === undefined) return this;
    return this.add(toSuffix.to(other));
  }
}

// ToSuffix implementations
export const StringToSuffix: ToSuffix<string> = {
  to: (t: string) => new Suffix(t)
};

export const SuffixToSuffix: ToSuffix<Suffix> = {
  to: (t: Suffix) => t
};

export const NameToSuffix: ToSuffix<Name> = {
  to: (name: Name) => {
    // Handle special internal names
    if (name === Name.UNION) return new Suffix("Union");
    if (name === Name.INTERSECTION) return new Suffix("Intersection");
    if (name === Name.SINGLETON) return new Suffix("Singleton");
    if (name === Name.BOOLEAN_LITERAL) return new Suffix("Boolean");
    if (name === Name.DOUBLE_LITERAL) return new Suffix("Double");
    if (name === Name.INT_LITERAL) return new Suffix("Int");
    if (name === Name.STRING_LITERAL) return new Suffix("String");
    if (name === Name.THIS) return new Suffix("This");
    if (name === Name.WILDCARD) return new Suffix("Wildcard");
    if (name === Name.REPEATED) return new Suffix("Repeated");
    if (name === Name.APPLY) return new Suffix("Apply");
    return new Suffix(name.unescaped);
  }
};

// Main Name class
export class Name {
  constructor(public readonly unescaped: string) {}

  withSuffix<T>(t: T, toSuffix: ToSuffix<T>): Name {
    return new Name(this.unescaped + "_" + toSuffix.to(t).unescaped);
  }

  get value(): string {
    return ScalaNameEscape.apply(this.unescaped);
  }

  get isEscaped(): boolean {
    return this.value !== this.unescaped;
  }

  toString(): string {
    return this.value;
  }

  equals(other: Name): boolean {
    return this.unescaped === other.unescaped;
  }

  // Static constants - equivalent to Scala object Name constants
  static readonly mod = new Name("mod");
  static readonly std = new Name("std");
  static readonly typings = new Name("typings");
  static readonly global = new Name("global");
  static readonly dummy = new Name("dummy");
  static readonly Any = new Name("Any");
  static readonly AnyRef = new Name("AnyRef");
  static readonly AnyVal = new Name("AnyVal");
  static readonly Double = new Name("Double");
  static readonly Short = new Name("Short");
  static readonly Byte = new Name("Byte");
  static readonly Float = new Name("Float");
  static readonly Int = new Name("Int");
  static readonly Long = new Name("Long");
  static readonly Boolean = new Name("Boolean");
  static readonly Unit = new Name("Unit");
  static readonly Null = new Name("Null");
  static readonly Nothing = new Name("Nothing");
  static readonly String = new Name("String");
  static readonly Array = new Name("Array");
  static readonly update = new Name("update");
  static readonly value = new Name("value");
  static readonly scala = new Name("scala");
  static readonly scalajs = new Name("scalajs");
  static readonly js = new Name("js");
  static readonly java = new Name("java");
  static readonly lang = new Name("lang");
  static readonly Statics = new Name("Statics");
  static readonly package = new Name("package");
  static readonly Object = new Name("Object");
  static readonly Function = new Name("Function");
  static readonly Default = new Name("default");
  static readonly Symbol = new Name("Symbol");
  static readonly This = new Name("This");
  static readonly UndefOr = new Name("UndefOr");
  static readonly Dynamic = new Name("Dynamic");
  static readonly namespaced = new Name("^");
  static readonly underscore = new Name("_");
  static readonly org = new Name("org");
  static readonly com = new Name("com");

  // Internal type names
  static readonly UNION = new Name("Union");
  static readonly INTERSECTION = new Name("Intersection");
  static readonly SINGLETON = new Name("Singleton");
  static readonly STRING_LITERAL = new Name("StringLiteral");
  static readonly DOUBLE_LITERAL = new Name("DoubleLiteral");
  static readonly INT_LITERAL = new Name("IntLiteral");
  static readonly BOOLEAN_LITERAL = new Name("BooleanLiteral");
  static readonly THIS = new Name("This");
  static readonly SUPER = new Name("Super");
  static readonly WILDCARD = new Name("Wildcard");
  static readonly REPEATED = new Name("Repeated");
  static readonly APPLY = new Name("Apply");
  static readonly UNDEFINED = new Name("Undefined");

  // Internal names set
  static readonly Internal = new Set([
    Name.UNION,
    Name.INTERSECTION,
    Name.SINGLETON,
    Name.STRING_LITERAL,
    Name.DOUBLE_LITERAL,
    Name.INT_LITERAL,
    Name.BOOLEAN_LITERAL,
    Name.THIS,
    Name.SUPER,
    Name.WILDCARD,
    Name.REPEATED,
    Name.APPLY,
    Name.UNDEFINED
  ]);

  // Function arity name generator
  static FunctionArity(isThis: boolean, arity: number): Name {
    return new Name((isThis ? Name.This.unescaped : "") + "Function" + arity.toString());
  }

  // Name rewriting functionality
  static necessaryRewrite(name: Name): Name {
    const rewritten = Name.necessaryRewriteString(name.unescaped);
    return rewritten !== undefined ? new Name(rewritten) : name;
  }

  /**
   * All names must pass through here, especially including the ones from arbitrary javascript strings.
   * For performance reasons it's not done in the constructor or anything like that
   */
  static necessaryRewriteString(ident: string): string | undefined {
    // Special cases that don't need rewriting
    if (ident === "<apply>" || ident === "<global>" || ident === "^") {
      return undefined;
    }

    function unicodeName(c: string): string {
      // Simplified unicode name handling - in a real implementation this would use
      // Character.getName equivalent functionality
      const codePoint = c.codePointAt(0);
      if (codePoint === undefined) return "";

      // Basic mapping for common problematic characters
      const unicodeNames: { [key: number]: string } = {
        0x0020: "Space",
        0x0021: "ExclamationMark",
        0x0022: "QuotationMark",
        0x0023: "NumberSign",
        0x0024: "DollarSign",
        0x0025: "PercentSign",
        0x0026: "Ampersand",
        0x0027: "Apostrophe",
        0x0028: "LeftParenthesis",
        0x0029: "RightParenthesis",
        0x002A: "Asterisk",
        0x002B: "PlusSign",
        0x002C: "Comma",
        0x002D: "HyphenMinus",
        0x002E: "FullStop",
        0x002F: "Solidus"
      };

      return unicodeNames[codePoint] || `Unicode${codePoint.toString(16).toUpperCase()}`;
    }

    function isUnicodeIdentifierPart(c: string): boolean {
      if (c.length === 0) return false;
      const code = c.codePointAt(0);
      if (code === undefined) return false;

      // Basic check for identifier characters
      return /[\p{L}\p{Nl}\p{Nd}\p{Mn}\p{Mc}\p{Pc}]/u.test(c);
    }

    function isControl(c: string): boolean {
      if (c.length === 0) return false;
      const code = c.codePointAt(0);
      if (code === undefined) return false;
      return code < 32 || (code >= 127 && code <= 159);
    }

    // Process each character
    const patchedChars = Array.from(ident).flatMap(char => {
      switch (char) {
        // Keep these characters as-is
        case '-': return ['-'];
        case '@': return ['@'];
        case '^': return ['^'];
        case '[': return ['['];
        case ']': return [']'];
        case '$':
          // Zinc fails with two dollar signs in a name, while we want to keep for instance the JQuery `$`
          const dollarCount = (ident.match(/\$/g) || []).length;
          return dollarCount > 1 ? ['D', 'o', 'l', 'l', 'a', 'r'] : ['$'];
        // Override names from unicode
        case '.': return ['D', 'o', 't'];
        case '\\': return ['B', 'a', 'c', 'k', 's', 'l', 'a', 's', 'h'];
        case '/': return ['S', 'l', 'a', 's', 'h'];
        case '\u0000': return ['N', 'u', 'l', 'l'];
        case ' ': return [' '];
        default:
          if (!isUnicodeIdentifierPart(char) || isControl(char)) {
            return Array.from(unicodeName(char));
          }
          return [char];
      }
    }).join('');

    // Can't have leading spaces, but inside the name we can escape them
    const initialSpaces = patchedChars.match(/^(\s*)/)?.[1] || '';
    const fixedSpaces = 'Space'.repeat(initialSpaces.length) + patchedChars.slice(initialSpaces.length);

    // No kidding, instagram-private-api broke scalac with a stack overflow in the parser
    const notTooLong = fixedSpaces.length > 500 ? fixedSpaces.slice(0, 500) : fixedSpaces;

    // Handle special cases
    let legal: string;
    switch (notTooLong) {
      case "": legal = "_empty"; break;      // must have a name
      case "-": legal = "_dash"; break;      // `def `-`(d: Double) = d; `-`(d) doesn't do what you would think
      case "_": legal = "_underscore"; break; // can't import a top level member with this name
      case "package": legal = "_package"; break; // doesn't work
      default: legal = notTooLong;
    }

    return legal === ident ? undefined : legal;
  }
}

// ScalaNameEscape utility - equivalent to Scala's ScalaNameEscape object
export class ScalaNameEscape {
  private static readonly scalaKeywords = new Set([
    "abstract", "case", "class", "catch", "def", "do", "else", "enum", "extends", "export",
    "extension", "false", "final", "finally", "for", "forSome", "given", "if", "implicit",
    "import", "inline", "lazy", "macro", "match", "new", "null", "object", "override",
    "package", "private", "protected", "return", "sealed", "super", "then", "this",
    "throw", "trait", "true", "try", "type", "using", "val", "var", "with", "while",
    "yield", ".", "_", ":", "=", "=>", "<-", "<:", "<%", ">:", "#", "@"
  ]);

  static apply(ident: string): string {
    return ScalaNameEscape.needsEscaping(ident) ? "`" + ident + "`" : ident;
  }

  private static isValidIdentifier(name: string): boolean {
    if (name.length === 0) return false;

    const firstChar = name[0];
    const isValidStart = firstChar === '$' || firstChar === '_' ||
                        /[\p{L}\p{Nl}]/u.test(firstChar);

    if (!isValidStart) return false;

    return Array.from(name.slice(1)).every(c =>
      c === '$' || /[\p{L}\p{Nl}\p{Nd}\p{Mn}\p{Mc}\p{Pc}]/u.test(c)
    );
  }

  private static needsEscaping(ident: string): boolean {
    if (ident === "^") return false;
    if (ident.length === 0) return true;
    if (ident.endsWith("_=") && !ident.includes("-")) return false; // lets say this is good enough
    if (ScalaNameEscape.scalaKeywords.has(ident)) return true;
    return !ScalaNameEscape.isValidIdentifier(ident);
  }
}