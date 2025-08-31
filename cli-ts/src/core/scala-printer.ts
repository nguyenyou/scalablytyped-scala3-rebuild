/**
 * Scala code printer - converts Scala AST to source code
 * Equivalent to Scala Printer
 */

import {
  ScalaTree,
  ScalaPackageTree,
  ScalaClassTree,
  ScalaModuleTree,
  ScalaMethodTree,
  ScalaFieldTree,
  ScalaTypeRef,
  ScalaAnnotation,
  ScalaQualifiedName,
  ScalaName,
  ScalaProtectionLevel,
  ScalaClassType,
  ScalaTypeParamTree,
  ScalaCtorTree,
  ScalaParamTree
} from '../types/scala-ast.js';
import { Comments, IArray } from '../types/index.js';

/**
 * Printer configuration
 */
export interface PrinterConfig {
  /** Indentation string (default: 2 spaces) */
  indent: string;
  
  /** Maximum line length before wrapping */
  maxLineLength: number;
  
  /** Whether to include comments in output */
  includeComments: boolean;
  
  /** Whether to format output for readability */
  formatOutput: boolean;
}

/**
 * Default printer configuration
 */
export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  indent: '  ',
  maxLineLength: 120,
  includeComments: true,
  formatOutput: true
};

/**
 * Scala source code printer
 */
export class ScalaPrinter {
  private indentLevel = 0;

  constructor(private readonly config: PrinterConfig = DEFAULT_PRINTER_CONFIG) {}

  /**
   * Print a complete Scala tree to source code
   */
  print(tree: ScalaTree): string {
    this.indentLevel = 0;
    return this.printTree(tree);
  }

  /**
   * Print multiple trees as a complete source file
   */
  printFile(trees: ScalaTree[], packageName?: string): string {
    const lines: string[] = [];

    // Add package declaration if provided
    if (packageName) {
      lines.push(`package ${packageName}`);
      lines.push('');
    }

    // Add imports (TODO: collect and deduplicate imports)
    const imports = this.collectImports(trees);
    if (imports.length > 0) {
      lines.push(...imports);
      lines.push('');
    }

    // Print each tree
    for (let i = 0; i < trees.length; i++) {
      if (i > 0) lines.push('');
      lines.push(this.print(trees[i]));
    }

    return lines.join('\n');
  }

  /**
   * Print a tree node
   */
  private printTree(tree: ScalaTree): string {
    if (tree instanceof ScalaPackageTree) {
      return this.printPackage(tree);
    } else if (tree instanceof ScalaClassTree) {
      return this.printClass(tree);
    } else if (tree instanceof ScalaModuleTree) {
      return this.printModule(tree);
    } else if (tree instanceof ScalaMethodTree) {
      return this.printMethod(tree);
    } else if (tree instanceof ScalaFieldTree) {
      return this.printField(tree);
    }

    return `// Unknown tree type: ${tree.nodeType}`;
  }

  /**
   * Print package tree
   */
  private printPackage(pkg: ScalaPackageTree): string {
    const lines: string[] = [];

    // Package declaration
    lines.push(`package ${pkg.name.value}`);
    lines.push('');

    // Package members
    for (const member of pkg.members) {
      lines.push(this.printTree(member));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Print class tree
   */
  private printClass(cls: ScalaClassTree): string {
    const lines: string[] = [];

    // Comments
    if (this.config.includeComments && !cls.comments.isEmpty) {
      lines.push(this.printComments(cls.comments));
    }

    // Annotations
    for (const annotation of cls.annotations) {
      lines.push(this.printAnnotation(annotation));
    }

    // Class declaration line
    const classLine = this.buildClassDeclaration(cls);
    lines.push(classLine);

    // Class body
    if (cls.members.length > 0) {
      lines.push(this.indent('{'));
      this.indentLevel++;

      for (let i = 0; i < cls.members.length; i++) {
        if (i > 0) lines.push('');
        lines.push(this.indent(this.printTree(cls.members[i])));
      }

      this.indentLevel--;
      lines.push(this.indent('}'));
    } else {
      // Empty class body
      lines[lines.length - 1] += ' {}';
    }

    return lines.join('\n');
  }

  /**
   * Print module tree (object)
   */
  private printModule(mod: ScalaModuleTree): string {
    const lines: string[] = [];

    // Comments
    if (this.config.includeComments && !mod.comments.isEmpty) {
      lines.push(this.printComments(mod.comments));
    }

    // Annotations
    for (const annotation of mod.annotations) {
      lines.push(this.printAnnotation(annotation));
    }

    // Object declaration
    const objectLine = this.buildModuleDeclaration(mod);
    lines.push(objectLine);

    // Object body
    if (mod.members.length > 0) {
      lines.push(this.indent('{'));
      this.indentLevel++;

      for (let i = 0; i < mod.members.length; i++) {
        if (i > 0) lines.push('');
        lines.push(this.indent(this.printTree(mod.members[i])));
      }

      this.indentLevel--;
      lines.push(this.indent('}'));
    } else {
      // Empty object body
      lines[lines.length - 1] += ' {}';
    }

    return lines.join('\n');
  }

  /**
   * Print method tree
   */
  private printMethod(method: ScalaMethodTree): string {
    const lines: string[] = [];

    // Comments
    if (this.config.includeComments && !method.comments.isEmpty) {
      lines.push(this.printComments(method.comments));
    }

    // Annotations
    for (const annotation of method.annotations) {
      lines.push(this.printAnnotation(annotation));
    }

    // Method declaration
    const methodLine = this.buildMethodDeclaration(method);
    lines.push(methodLine);

    return lines.join('\n');
  }

  /**
   * Print field tree
   */
  private printField(field: ScalaFieldTree): string {
    const lines: string[] = [];

    // Comments
    if (this.config.includeComments && !field.comments.isEmpty) {
      lines.push(this.printComments(field.comments));
    }

    // Annotations
    for (const annotation of field.annotations) {
      lines.push(this.printAnnotation(annotation));
    }

    // Field declaration
    const fieldLine = this.buildFieldDeclaration(field);
    lines.push(fieldLine);

    return lines.join('\n');
  }

  /**
   * Build class declaration line
   */
  private buildClassDeclaration(cls: ScalaClassTree): string {
    const parts: string[] = [];

    // Protection level
    if (cls.level !== ScalaProtectionLevel.Public) {
      parts.push(cls.level);
    }

    // Class type and modifiers
    if (cls.isSealed) parts.push('sealed');
    if (cls.isImplicit) parts.push('implicit');
    
    parts.push(cls.classType);
    parts.push(cls.name.value);

    // Type parameters
    if (cls.tparams.length > 0) {
      const tparams = cls.tparams.map(tp => this.printTypeParam(tp)).join(', ');
      parts.push(`[${tparams}]`);
    }

    // Constructor parameters
    if (cls.ctors.length > 0) {
      const ctorParams = cls.ctors.map(ctor => this.printConstructor(ctor)).join('');
      parts.push(ctorParams);
    }

    // Parent types
    if (cls.parents.length > 0) {
      const parents = cls.parents.map(p => this.printTypeRef(p)).join(' with ');
      parts.push(`extends ${parents}`);
    }

    return parts.join(' ');
  }

  /**
   * Build module declaration line
   */
  private buildModuleDeclaration(mod: ScalaModuleTree): string {
    const parts: string[] = [];

    // Protection level
    if (mod.level !== ScalaProtectionLevel.Public) {
      parts.push(mod.level);
    }

    parts.push('object');
    parts.push(mod.name.value);

    // Parent types
    if (mod.parents.length > 0) {
      const parents = mod.parents.map(p => this.printTypeRef(p)).join(' with ');
      parts.push(`extends ${parents}`);
    }

    return parts.join(' ');
  }

  /**
   * Build method declaration line
   */
  private buildMethodDeclaration(method: ScalaMethodTree): string {
    const parts: string[] = [];

    // Protection level
    if (method.level !== ScalaProtectionLevel.Public) {
      parts.push(method.level);
    }

    // Modifiers
    if (method.isOverride) parts.push('override');
    if (method.isImplicit) parts.push('implicit');

    parts.push('def');
    parts.push(method.name.value);

    // Type parameters
    if (method.tparams.length > 0) {
      const tparams = method.tparams.map(tp => this.printTypeParam(tp)).join(', ');
      parts.push(`[${tparams}]`);
    }

    // Parameters
    const paramGroups = method.params.map(group => {
      const params = group.map(p => this.printParam(p)).join(', ');
      return `(${params})`;
    }).join('');
    parts.push(paramGroups);

    // Return type
    parts.push(':');
    parts.push(this.printTypeRef(method.resultType));

    return parts.join(' ');
  }

  /**
   * Build field declaration line
   */
  private buildFieldDeclaration(field: ScalaFieldTree): string {
    const parts: string[] = [];

    // Protection level
    if (field.level !== ScalaProtectionLevel.Public) {
      parts.push(field.level);
    }

    // Modifiers
    if (field.isOverride) parts.push('override');
    if (field.isImplicit) parts.push('implicit');

    // Field type (val/var)
    parts.push(field.isReadOnly ? 'val' : 'var');
    parts.push(field.name.value);
    parts.push(':');
    parts.push(this.printTypeRef(field.tpe));

    return parts.join(' ');
  }

  // Helper methods for printing various elements
  private printComments(comments: Comments): string {
    return comments.comments.map(c => c.text).join('\n');
  }

  private printAnnotation(annotation: ScalaAnnotation): string {
    if (annotation.targs.length > 0) {
      const targs = annotation.targs.map(t => this.printTypeRef(t)).join(', ');
      return `@${annotation.name}[${targs}]`;
    }
    return `@${annotation.name}`;
  }

  private printTypeRef(typeRef: ScalaTypeRef): string {
    const name = typeRef.typeName.parts.join('.');
    if (typeRef.targs.length > 0) {
      const targs = typeRef.targs.map(t => this.printTypeRef(t)).join(', ');
      return `${name}[${targs}]`;
    }
    return name;
  }

  private printTypeParam(tparam: ScalaTypeParamTree): string {
    // TODO: Implement type parameter printing with bounds
    return tparam.name.value;
  }

  private printConstructor(ctor: ScalaCtorTree): string {
    const paramGroups = ctor.params.map(group => {
      const params = group.map(p => this.printParam(p)).join(', ');
      return `(${params})`;
    }).join('');
    return paramGroups;
  }

  private printParam(param: ScalaParamTree): string {
    const parts: string[] = [];
    if (param.isImplicit) parts.push('implicit');
    parts.push(param.name.value);
    parts.push(':');
    parts.push(this.printTypeRef(param.tpe));
    return parts.join(' ');
  }

  private collectImports(trees: ScalaTree[]): string[] {
    // TODO: Implement import collection and deduplication
    const commonImports = [
      'import scala.scalajs.js',
      'import scala.scalajs.js.annotation._'
    ];
    return commonImports;
  }

  private indent(text: string): string {
    return this.config.indent.repeat(this.indentLevel) + text;
  }
}
