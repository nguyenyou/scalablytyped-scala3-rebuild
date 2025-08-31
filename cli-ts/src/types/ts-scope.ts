/**
 * TypeScript tree scope and symbol resolution
 * Equivalent to Scala TsTreeScope
 */

import {
  TsParsedFile,
  TsContainerOrDecl,
  TsNamedDecl,
  TsIdentSimple,
  TsQIdent,
  TsDeclModule,
  TsDeclNamespace,
  TsDeclClass,
  TsDeclInterface,
  TsDeclTypeAlias,
  TsDeclVar,
  TsDeclFunction,
  TsDeclEnum,
  PackageJson
} from './index.js';

/**
 * Symbol information in the scope
 */
export interface SymbolInfo {
  name: string;
  declaration: TsNamedDecl;
  fullyQualifiedName: string;
  isExported: boolean;
  sourceFile: string;
}

/**
 * Module information
 */
export interface ModuleInfo {
  name: string;
  exports: Map<string, SymbolInfo>;
  imports: Map<string, string>; // local name -> external module
  sourceFile: string;
}

/**
 * TypeScript tree scope for symbol resolution
 * Manages symbols, modules, and type resolution within a library
 */
export class TsTreeScope {
  private readonly symbols = new Map<string, SymbolInfo>();
  private readonly modules = new Map<string, ModuleInfo>();
  private readonly typeAliases = new Map<string, TsDeclTypeAlias>();
  private readonly globalScope = new Map<string, SymbolInfo>();

  constructor(
    public readonly libraryName: string,
    public readonly parsedFiles: TsParsedFile[]
  ) {
    this.buildScope();
  }

  /**
   * Build the complete scope from parsed files
   */
  private buildScope(): void {
    for (const file of this.parsedFiles) {
      this.processFile(file);
    }
  }

  /**
   * Process a single parsed file
   */
  private processFile(file: TsParsedFile): void {
    const fileName = this.getFileName(file);
    
    // Process top-level declarations
    for (const member of file.members) {
      this.processMember(member, fileName, []);
    }
  }

  /**
   * Process a member declaration
   */
  private processMember(
    member: TsContainerOrDecl,
    sourceFile: string,
    namespace: string[]
  ): void {
    if (member instanceof TsNamedDecl) {
      const symbolInfo: SymbolInfo = {
        name: member.name.value,
        declaration: member,
        fullyQualifiedName: [...namespace, member.name.value].join('.'),
        isExported: this.isExported(member),
        sourceFile
      };

      // Add to appropriate scope
      const fullName = symbolInfo.fullyQualifiedName;
      this.symbols.set(fullName, symbolInfo);

      if (namespace.length === 0) {
        // Global scope
        this.globalScope.set(symbolInfo.name, symbolInfo);
      }

      // Handle type aliases specially
      if (member instanceof TsDeclTypeAlias) {
        this.typeAliases.set(fullName, member);
      }
    }

    // Process nested members for containers
    if (member instanceof TsDeclModule || member instanceof TsDeclNamespace) {
      const containerName = member instanceof TsDeclModule 
        ? member.name.value 
        : member.name.value;
      
      const nestedNamespace = [...namespace, containerName];
      
      for (const nestedMember of member.members) {
        this.processMember(nestedMember, sourceFile, nestedNamespace);
      }
    }
  }

  /**
   * Resolve a symbol by name
   */
  resolveSymbol(name: string, context?: string[]): SymbolInfo | undefined {
    // Try fully qualified name first
    if (context && context.length > 0) {
      const qualifiedName = [...context, name].join('.');
      const symbol = this.symbols.get(qualifiedName);
      if (symbol) return symbol;
    }

    // Try global scope
    return this.globalScope.get(name);
  }

  /**
   * Resolve a qualified identifier
   */
  resolveQualifiedName(qident: TsQIdent): SymbolInfo | undefined {
    const fullName = qident.parts.join('.');
    return this.symbols.get(fullName);
  }

  /**
   * Get all symbols in a namespace
   */
  getNamespaceSymbols(namespace: string[]): SymbolInfo[] {
    const prefix = namespace.join('.') + '.';
    const results: SymbolInfo[] = [];

    for (const [name, symbol] of this.symbols) {
      if (name.startsWith(prefix)) {
        const remaining = name.substring(prefix.length);
        // Only direct children (no nested dots)
        if (!remaining.includes('.')) {
          results.push(symbol);
        }
      }
    }

    return results;
  }

  /**
   * Get all exported symbols
   */
  getExportedSymbols(): SymbolInfo[] {
    return Array.from(this.symbols.values()).filter(symbol => symbol.isExported);
  }

  /**
   * Check if a symbol exists
   */
  hasSymbol(name: string): boolean {
    return this.symbols.has(name) || this.globalScope.has(name);
  }

  /**
   * Get all symbol names
   */
  getAllSymbolNames(): string[] {
    return Array.from(this.symbols.keys());
  }

  /**
   * Get type alias by name
   */
  getTypeAlias(name: string): TsDeclTypeAlias | undefined {
    return this.typeAliases.get(name);
  }

  /**
   * Check if a declaration is exported
   */
  private isExported(decl: TsContainerOrDecl): boolean {
    // TODO: Implement proper export detection
    // This would check for export keywords, export statements, etc.
    return true; // Placeholder: assume all declarations are exported
  }

  /**
   * Get file name from parsed file
   */
  private getFileName(file: TsParsedFile): string {
    // Extract filename from code path
    const segments = file.codePath.segments;
    return segments.length > 0 ? segments[segments.length - 1] : 'unknown';
  }

  /**
   * Debug: Print scope information
   */
  debugPrint(): void {
    console.log(`=== Scope for ${this.libraryName} ===`);
    console.log(`Total symbols: ${this.symbols.size}`);
    console.log(`Global symbols: ${this.globalScope.size}`);
    console.log(`Type aliases: ${this.typeAliases.size}`);
    
    console.log('\nGlobal symbols:');
    for (const [name, symbol] of this.globalScope) {
      console.log(`  ${name} -> ${symbol.fullyQualifiedName} (${symbol.declaration.nodeType})`);
    }
  }
}

/**
 * Parsed TypeScript library
 * Equivalent to Scala LibTs
 */
export class LibTs {
  constructor(
    public readonly libName: string,
    public readonly version: string,
    public readonly parsedFiles: TsParsedFile[],
    public readonly scope: TsTreeScope,
    public readonly packageJson: PackageJson
  ) {}

  /**
   * Get the main entry file
   */
  get mainFile(): TsParsedFile | undefined {
    // Look for index file or main file specified in package.json
    const mainFileName = this.packageJson.main || 'index';
    
    return this.parsedFiles.find(file => {
      const fileName = this.getFileName(file);
      return fileName === mainFileName || 
             fileName === `${mainFileName}.d.ts` ||
             fileName === 'index.d.ts';
    });
  }

  /**
   * Get all exported symbols from this library
   */
  getExports(): SymbolInfo[] {
    return this.scope.getExportedSymbols();
  }

  /**
   * Find a symbol by name
   */
  findSymbol(name: string): SymbolInfo | undefined {
    return this.scope.resolveSymbol(name);
  }

  /**
   * Get statistics about this library
   */
  getStats(): {
    fileCount: number;
    symbolCount: number;
    exportCount: number;
    classCount: number;
    interfaceCount: number;
    functionCount: number;
  } {
    const symbols = this.scope.getExportedSymbols();
    
    return {
      fileCount: this.parsedFiles.length,
      symbolCount: this.scope.getAllSymbolNames().length,
      exportCount: symbols.length,
      classCount: symbols.filter(s => s.declaration instanceof TsDeclClass).length,
      interfaceCount: symbols.filter(s => s.declaration instanceof TsDeclInterface).length,
      functionCount: symbols.filter(s => s.declaration instanceof TsDeclFunction).length
    };
  }

  /**
   * Get file name from parsed file
   */
  private getFileName(file: TsParsedFile): string {
    const segments = file.codePath.segments;
    return segments.length > 0 ? segments[segments.length - 1] : 'unknown';
  }
}
