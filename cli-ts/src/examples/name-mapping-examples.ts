/**
 * Examples demonstrating the name mapping functionality
 * Shows how TypeScript types are converted to appropriate Scala.js types
 */

import { 
  ScalaJsLibNames, 
  ScalaJsDomNames, 
  AdaptiveNaming, 
  LibrarySpecificNaming 
} from '../core/name-mapping.js';
import { ScalaQualifiedName, ScalaTypeRef } from '../types/scala-ast.js';
import { TsQIdent, Comments, IArray } from '../types/index.js';

/**
 * Demonstrate name mapping functionality
 */
export function demonstrateNameMapping(): void {
  console.log('=== TypeScript to Scala.js Name Mapping Examples ===\n');

  const outputPkg = 'typings';
  const scalaJsLibNames = new ScalaJsLibNames(outputPkg);
  const scalaJsDomNames = new ScalaJsDomNames(outputPkg);
  const adaptiveNaming = new AdaptiveNaming(outputPkg, true);
  const librarySpecificNaming = new LibrarySpecificNaming();

  // Example 1: Core JavaScript types
  console.log('1. Core JavaScript Type Mappings:');
  const jsTypes = [
    'Array', 'Promise', 'Date', 'RegExp', 'Error', 'Map', 'Set', 'WeakMap',
    'Int8Array', 'Float32Array', 'ArrayBuffer', 'DataView'
  ];

  for (const jsType of jsTypes) {
    const tsTypeRef = new ScalaTypeRef(
      ScalaQualifiedName.from([outputPkg, 'std', jsType]),
      IArray.Empty,
      Comments.NoComments
    );
    
    const mapped = scalaJsLibNames.applyMapping(tsTypeRef);
    console.log(`  ${jsType} → ${mapped.typeName.parts.join('.')}`);
  }

  console.log('\n2. DOM Type Mappings:');
  const domTypes = [
    'Element', 'HTMLElement', 'HTMLDivElement', 'HTMLInputElement',
    'Document', 'Window', 'Event', 'MouseEvent', 'XMLHttpRequest'
  ];

  for (const domType of domTypes) {
    const tsTypeRef = new ScalaTypeRef(
      ScalaQualifiedName.from([outputPkg, 'std', domType]),
      IArray.Empty,
      Comments.NoComments
    );
    
    const mapped = scalaJsDomNames.applyMapping(tsTypeRef);
    console.log(`  ${domType} → ${mapped.typeName.parts.join('.')}`);
  }

  console.log('\n3. Adaptive Naming (Conflict Resolution):');
  const conflictingNames = [
    'class', 'object', 'type', 'val', 'var', 'def', 'match', 'case',
    'abstract', 'sealed', 'trait', 'extends', 'with', 'import'
  ];

  for (const name of conflictingNames) {
    const tsQIdent = TsQIdent.of(name);
    const scalaName = adaptiveNaming.getScalaName(tsQIdent);
    console.log(`  ${name} → ${scalaName.parts.join('.')}`);
  }

  console.log('\n4. Library-Specific Naming:');
  const libraryExamples = [
    { library: 'react', names: ['Component', 'Props', 'State', 'HTMLDivElement'] },
    { library: 'node', names: ['global', 'process', 'Buffer'] },
    { library: 'dom', names: ['console', 'window', 'document'] }
  ];

  for (const example of libraryExamples) {
    console.log(`  ${example.library.toUpperCase()} library:`);
    for (const name of example.names) {
      const adjusted = librarySpecificNaming.applyLibraryRules(example.library, name);
      console.log(`    ${name} → ${adjusted}`);
    }
  }

  console.log('\n5. Generic Type Mappings:');
  const genericExamples = [
    { type: 'Array', args: ['string'] },
    { type: 'Promise', args: ['number'] },
    { type: 'Map', args: ['string', 'any'] },
    { type: 'Set', args: ['HTMLElement'] }
  ];

  for (const example of genericExamples) {
    const typeArgs = example.args.map(arg => 
      new ScalaTypeRef(
        ScalaQualifiedName.from([arg]),
        IArray.Empty,
        Comments.NoComments
      )
    );

    const tsTypeRef = new ScalaTypeRef(
      ScalaQualifiedName.from([outputPkg, 'std', example.type]),
      IArray.from(typeArgs),
      Comments.NoComments
    );
    
    const mapped = scalaJsLibNames.applyMapping(tsTypeRef);
    const typeArgStr = mapped.targs.map(arg => arg.typeName.parts.join('.')).join(', ');
    console.log(`  ${example.type}<${example.args.join(', ')}> → ${mapped.typeName.parts.join('.')}[${typeArgStr}]`);
  }

  console.log('\n6. Complex Naming Scenarios:');
  const complexNames = [
    'HTMLElementTagNameMap',
    'EventListenerOrEventListenerObject',
    'CanvasRenderingContext2D',
    'WebGLRenderingContext',
    'IDBObjectStoreParameters'
  ];

  for (const name of complexNames) {
    const tsQIdent = TsQIdent.of(name);
    const scalaName = adaptiveNaming.getScalaName(tsQIdent);
    console.log(`  ${name} → ${scalaName.parts.join('.')}`);
  }
}

/**
 * Example of how name mapping solves real-world conversion issues
 */
export function realWorldExamples(): void {
  console.log('\n=== Real-World Conversion Examples ===\n');

  console.log('Before Name Mapping (problematic):');
  console.log('  TypeScript: Array<string>');
  console.log('  Naive Scala: typings.std.Array[String]  // ❌ Wrong - not ScalaJS compatible');
  console.log('');
  console.log('After Name Mapping (correct):');
  console.log('  TypeScript: Array<string>');
  console.log('  Proper Scala: scala.scalajs.js.Array[String]  // ✅ Correct - ScalaJS compatible');
  console.log('');

  console.log('DOM Type Mapping:');
  console.log('  TypeScript: HTMLDivElement');
  console.log('  Without mapping: typings.std.HTMLDivElement  // ❌ Missing DOM integration');
  console.log('  With mapping: org.scalajs.dom.HTMLDivElement  // ✅ Proper DOM integration');
  console.log('');

  console.log('Reserved Word Handling:');
  console.log('  TypeScript: interface class { type: string; }');
  console.log('  Without mapping: class { type: String }  // ❌ Scala compilation error');
  console.log('  With mapping: `class` { `type`: String }  // ✅ Escaped reserved words');
  console.log('');

  console.log('Library-Specific Naming:');
  console.log('  TypeScript (React): Component<Props, State>');
  console.log('  Generic mapping: typings.react.Component[Props, State]');
  console.log('  Library-aware: typings.react.Component[Props, State]  // ✅ React-specific handling');
}

/**
 * Performance and conflict resolution examples
 */
export function performanceExamples(): void {
  console.log('\n=== Performance and Conflict Resolution ===\n');

  const adaptiveNaming = new AdaptiveNaming('typings', true);

  // Simulate naming conflicts
  const conflictingTypes = [
    'User', 'User', 'User',  // Same name from different modules
    'Component', 'Component',  // React components
    'Event', 'Event'  // DOM events
  ];

  console.log('Conflict Resolution:');
  for (let i = 0; i < conflictingTypes.length; i++) {
    const tsQIdent = TsQIdent.of(conflictingTypes[i]);
    const scalaName = adaptiveNaming.getScalaName(tsQIdent);
    console.log(`  ${conflictingTypes[i]} (${i + 1}) → ${scalaName.parts.join('.')}`);
  }

  console.log('\nCaching Benefits:');
  console.log('  ✅ Name mappings are cached for performance');
  console.log('  ✅ Consistent naming across multiple references');
  console.log('  ✅ Conflict resolution maintains uniqueness');
  console.log('  ✅ Library-specific rules applied consistently');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateNameMapping();
  realWorldExamples();
  performanceExamples();
}
