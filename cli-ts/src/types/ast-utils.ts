/**
 * Utility functions for AST manipulation and traversal
 * Equivalent to various Scala utility functions
 */

import {
  TsTree,
  TsContainer,
  TsContainerOrDecl,
  TsParsedFile,
  TsDeclClass,
  TsDeclInterface,
  TsDeclModule,
  TsDeclNamespace,
  TsNamedDecl,
  Comments,
  Comment,
  IArray
} from './index.js';

/**
 * AST traversal utilities
 */
export namespace AstTraversal {
  /**
   * Find all nodes of a specific type in an AST
   */
  export function findNodesOfType<T extends TsTree>(
    root: TsTree,
    predicate: (node: TsTree) => node is T
  ): T[] {
    const results: T[] = [];
    
    function visit(node: TsTree) {
      if (predicate(node)) {
        results.push(node);
      }
      
      if (node instanceof TsContainer) {
        node.members.forEach(visit);
      }
    }
    
    visit(root);
    return results;
  }

  /**
   * Find all class declarations in a parsed file
   */
  export function findClasses(file: TsParsedFile): TsDeclClass[] {
    return findNodesOfType(file, (node): node is TsDeclClass => 
      node.nodeType === 'TsDeclClass'
    );
  }

  /**
   * Find all interface declarations in a parsed file
   */
  export function findInterfaces(file: TsParsedFile): TsDeclInterface[] {
    return findNodesOfType(file, (node): node is TsDeclInterface => 
      node.nodeType === 'TsDeclInterface'
    );
  }

  /**
   * Find all module declarations in a parsed file
   */
  export function findModules(file: TsParsedFile): TsDeclModule[] {
    return findNodesOfType(file, (node): node is TsDeclModule => 
      node.nodeType === 'TsDeclModule'
    );
  }

  /**
   * Find all namespace declarations in a parsed file
   */
  export function findNamespaces(file: TsParsedFile): TsDeclNamespace[] {
    return findNodesOfType(file, (node): node is TsDeclNamespace => 
      node.nodeType === 'TsDeclNamespace'
    );
  }
}

/**
 * AST transformation utilities
 */
export namespace AstTransform {
  /**
   * Transform all nodes of a specific type
   */
  export function transformNodes<T extends TsTree>(
    root: TsTree,
    predicate: (node: TsTree) => node is T,
    transform: (node: T) => T
  ): TsTree {
    function visit(node: TsTree): TsTree {
      if (predicate(node)) {
        const transformed = transform(node);
        if (transformed instanceof TsContainer) {
          return transformed.withMembers(
            transformed.members.map(visit) as TsContainerOrDecl[]
          );
        }
        return transformed;
      }
      
      if (node instanceof TsContainer) {
        return node.withMembers(
          node.members.map(visit) as TsContainerOrDecl[]
        );
      }
      
      return node;
    }
    
    return visit(root);
  }

  /**
   * Add comments to a node
   */
  export function addComments(node: TsTree, newComments: Comment[]): TsTree {
    const combinedComments = node.comments.concat(new Comments(newComments));
    
    // This would need to be implemented for each specific node type
    // For now, return the node as-is
    return node;
  }

  /**
   * Filter members of a container based on a predicate
   */
  export function filterMembers(
    container: TsContainer,
    predicate: (member: TsContainerOrDecl) => boolean
  ): TsContainer {
    const filteredMembers = container.members.filter(predicate);
    return container.withMembers(filteredMembers);
  }
}

/**
 * AST validation utilities
 */
export namespace AstValidation {
  /**
   * Check if a node has specific comments
   */
  export function hasComment(node: TsTree, commentText: string): boolean {
    return node.comments.comments.some(comment => 
      comment.text.includes(commentText)
    );
  }

  /**
   * Check if a declaration is declared (ambient)
   */
  export function isDeclared(node: TsTree): boolean {
    if ('declared' in node && typeof node.declared === 'boolean') {
      return node.declared;
    }
    return false;
  }

  /**
   * Check if a node is exported
   */
  export function isExported(node: TsTree): boolean {
    return hasComment(node, 'export') || hasComment(node, 'exported');
  }

  /**
   * Check if a class/interface is abstract
   */
  export function isAbstract(node: TsTree): boolean {
    if ('isAbstract' in node && typeof node.isAbstract === 'boolean') {
      return node.isAbstract;
    }
    return false;
  }
}

/**
 * Name resolution utilities
 */
export namespace NameResolution {
  /**
   * Get the fully qualified name of a declaration
   */
  export function getFullyQualifiedName(node: TsNamedDecl): string {
    const pathSegments = node.codePath.segments;
    const name = node.name.value;
    return [...pathSegments, name].join('.');
  }

  /**
   * Check if two names are equal
   */
  export function namesEqual(name1: string, name2: string): boolean {
    return name1 === name2;
  }

  /**
   * Sanitize a name for use in generated code
   */
  export function sanitizeName(name: string): string {
    // Replace invalid characters with underscores
    return name.replace(/[^a-zA-Z0-9_$]/g, '_');
  }

  /**
   * Convert a TypeScript name to a Scala-compatible name
   */
  export function toScalaName(tsName: string): string {
    // Handle reserved Scala keywords
    const scalaKeywords = new Set([
      'abstract', 'case', 'catch', 'class', 'def', 'do', 'else', 'extends',
      'false', 'final', 'finally', 'for', 'forSome', 'if', 'implicit',
      'import', 'lazy', 'match', 'new', 'null', 'object', 'override',
      'package', 'private', 'protected', 'return', 'sealed', 'super',
      'this', 'throw', 'trait', 'try', 'true', 'type', 'val', 'var',
      'while', 'with', 'yield'
    ]);

    let scalaName = sanitizeName(tsName);
    
    if (scalaKeywords.has(scalaName)) {
      scalaName = `\`${scalaName}\``;
    }
    
    return scalaName;
  }
}

/**
 * Type utilities
 */
export namespace TypeUtils {
  /**
   * Check if a type is a primitive type
   */
  export function isPrimitive(typeName: string): boolean {
    const primitives = new Set([
      'boolean', 'number', 'string', 'void', 'undefined', 'null', 'any', 'unknown', 'never'
    ]);
    return primitives.has(typeName);
  }

  /**
   * Check if a type is an array type
   */
  export function isArrayType(typeName: string): boolean {
    return typeName === 'Array' || typeName.endsWith('[]');
  }

  /**
   * Check if a type is a function type
   */
  export function isFunctionType(typeName: string): boolean {
    return typeName === 'Function' || typeName.includes('=>');
  }

  /**
   * Extract the element type from an array type
   */
  export function getArrayElementType(arrayType: string): string {
    if (arrayType.endsWith('[]')) {
      return arrayType.slice(0, -2);
    }
    if (arrayType.startsWith('Array<') && arrayType.endsWith('>')) {
      return arrayType.slice(6, -1);
    }
    return 'any';
  }
}
