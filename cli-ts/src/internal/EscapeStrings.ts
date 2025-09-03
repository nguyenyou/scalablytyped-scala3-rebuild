/**
 * TypeScript port of org.scalablytyped.converter.internal.EscapeStrings
 * 
 * Borrowed from org/apache/commons/lang/StringEscapeUtils.java
 * Provides string escaping functionality for Java and JavaScript contexts.
 */

/**
 * Escapes a string for Java string literals
 * Does not escape single quotes or forward slashes
 */
export function java(str: string): string {
  return go(str, false, false);
}

/**
 * Escapes a string for JavaScript string literals
 * Escapes single quotes and forward slashes
 */
export function javaScript(str: string): string {
  return go(str, true, true);
}

/**
 * Core escaping logic
 * @param str String to escape
 * @param escapeSingleQuote Whether to escape single quotes
 * @param escapeForwardSlash Whether to escape forward slashes
 */
function go(str: string, escapeSingleQuote: boolean, escapeForwardSlash: boolean): string {
  const result: string[] = [];
  
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    
    // Handle Unicode characters
    if (ch > 0xfff) {
      result.push("\\u" + hex(ch));
    } else if (ch > 0xff) {
      result.push("\\u0" + hex(ch));
    } else if (ch > 0x7f) {
      result.push("\\u00" + hex(ch));
    } else if (ch < 32) {
      // Handle control characters
      switch (ch) {
        case 0x08: // \b
          result.push("\\b");
          break;
        case 0x0a: // \n
          result.push("\\n");
          break;
        case 0x09: // \t
          result.push("\\t");
          break;
        case 0x0c: // \f
          result.push("\\f");
          break;
        case 0x0d: // \r
          result.push("\\r");
          break;
        default:
          if (ch > 0xf) {
            result.push("\\u00" + hex(ch));
          } else {
            result.push("\\u000" + hex(ch));
          }
          break;
      }
    } else {
      // Handle printable characters
      const char = String.fromCharCode(ch);
      switch (char) {
        case "'":
          if (escapeSingleQuote) {
            result.push("\\'");
          } else {
            result.push("'");
          }
          break;
        case '"':
          result.push('\\"');
          break;
        case '\\':
          result.push("\\\\");
          break;
        case '/':
          if (escapeForwardSlash) {
            result.push("\\/");
          } else {
            result.push("/");
          }
          break;
        default:
          result.push(char);
          break;
      }
    }
  }
  
  return result.join('');
}

/**
 * Returns an upper case hexadecimal string for the given character code
 * @param ch The character code to convert
 * @returns An upper case hexadecimal string
 */
function hex(ch: number): string {
  return ch.toString(16).toUpperCase();
}
