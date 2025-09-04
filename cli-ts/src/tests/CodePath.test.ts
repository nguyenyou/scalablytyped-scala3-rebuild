/**
 * TypeScript port of CodePathTests.scala
 * Tests for CodePath.ts - comprehensive test coverage matching the original Scala implementation
 */

import { describe, test, expect } from 'bun:test';
import { some, none, isSome, isNone } from 'fp-ts/Option';
import { CodePath, CodePathNoPath, CodePathHasPath, HasCodePath } from '../internal/ts/CodePath.js';
import { 
  TsIdent, 
  TsQIdent, 
  TsIdentGlobal, 
  TsIdentApply, 
  TsIdentDestructured,
  TsIdentStd,
  TsIdentLibraryScoped,
  TsDeclClass,
  TsDeclInterface,
  TsGlobal,
  TsLiteral
} from '../internal/ts/trees.js';
import { IArray } from '../internal/IArray.js';
import { Comments } from '../internal/Comments.js';
import { JsLocation } from '../internal/ts/JsLocation.js';

describe('CodePath', () => {
  describe('CodePath.NoPath', () => {
    test('get returns None', () => {
      const noPath = CodePath.noPath();
      const result = noPath.get();
      expect(isNone(result)).toBe(true);
    });

    test('forceHasPath throws error', () => {
      const noPath = CodePath.noPath();
      expect(() => noPath.forceHasPath()).toThrow('Expected code path');
    });

    test('add operator returns NoPath', () => {
      const noPath = CodePath.noPath();
      const ident = TsIdent.simple('test');
      const result = noPath.add(ident);
      expect(CodePath.isNoPath(result)).toBe(true);
    });

    test('replaceLast returns NoPath', () => {
      const noPath = CodePath.noPath();
      const ident = TsIdent.simple('newLast');
      const result = noPath.replaceLast(ident);
      expect(CodePath.isNoPath(result)).toBe(true);
    });
  });

  describe('CodePath.HasPath - Basic Functionality', () => {
    test('construction and basic properties', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module', 'submodule');
      const hasPath = CodePath.hasPath(library, pathPart);

      expect(hasPath.inLibrary).toEqual(library);
      expect(hasPath.codePathPart).toEqual(pathPart);
      
      // Test lazy codePath property
      const expectedCodePath = TsQIdent.of(library, ...pathPart.parts.toArray());
      expect(hasPath.codePath.parts.toArray().map(p => p.value))
        .toEqual(expectedCodePath.parts.toArray().map(p => p.value));
    });

    test('get returns Some', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      const result = hasPath.get();
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(result.value.inLibrary.value).toBe(hasPath.inLibrary.value);
        expect(result.value.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(hasPath.codePathPart.parts.toArray().map(p => p.value));
      }
    });

    test('forceHasPath returns self', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      const result = hasPath.forceHasPath();
      expect(result.inLibrary.value).toBe(hasPath.inLibrary.value);
      expect(result.codePathPart.parts.toArray().map(p => p.value))
        .toEqual(hasPath.codePathPart.parts.toArray().map(p => p.value));
    });

    test('add operator extends path', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      const newIdent = TsIdent.simple('newPart');
      const result = hasPath.add(newIdent);
      
      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.inLibrary.value).toBe('myLib');
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['module', 'newPart']);
      }
    });

    test('replaceLast replaces the last identifier', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module', 'submodule');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      const newLast = TsIdent.simple('newLast');
      const result = hasPath.replaceLast(newLast);
      
      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.inLibrary.value).toBe('myLib');
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['module', 'newLast']);
      }
    });

    test('replaceLast with empty path part', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.empty();
      const hasPath = CodePath.hasPath(library, pathPart);
      
      const newLast = TsIdent.simple('newLast');
      const result = hasPath.replaceLast(newLast);
      
      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.inLibrary.value).toBe('myLib');
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['newLast']);
      }
    });
  });

  describe('CodePath.HasPath - navigate method with TsTree', () => {
    test('with TsNamedDecl (TsDeclClass)', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      // Create a mock TsNamedDecl (TsDeclClass)
      const className = TsIdent.simple('MyClass');
      const mockClass = TsDeclClass.create(
        Comments.empty(),
        false, // declared
        false, // isAbstract
        className,
        IArray.Empty, // tparams
        none, // parent
        IArray.Empty, // implementsInterfaces
        IArray.Empty, // members
        JsLocation.zero(),
        CodePath.noPath()
      );
      
      const result = hasPath.navigate(mockClass);
      expect(result.inLibrary.value).toBe('myLib');
      expect(result.codePathPart.parts.toArray().map(p => p.value))
        .toEqual(['module', 'MyClass']);
    });

    test('with TsGlobal', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      const mockGlobal = TsGlobal.create(
        Comments.empty(),
        false, // declared
        IArray.Empty, // members
        CodePath.noPath()
      );
      
      const result = hasPath.navigate(mockGlobal);
      expect(result.inLibrary.value).toBe('myLib');
      expect(result.codePathPart.parts.toArray().map(p => p.value))
        .toEqual(['module', '<global>']);
    });

    test('with other TsTree types (TsLiteral)', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      // Create a mock TsTree that's not TsNamedDecl or TsGlobal
      const mockLiteral = TsLiteral.str('test');
      
      const result = hasPath.navigate(mockLiteral);
      // Should return unchanged
      expect(result.inLibrary.value).toBe('myLib');
      expect(result.codePathPart.parts.toArray().map(p => p.value))
        .toEqual(['module']);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('empty library name', () => {
      const library = TsIdent.simple('');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      expect(hasPath.inLibrary.value).toBe('');
      expect(hasPath.codePath.parts.toArray()[0].value).toBe('');
    });

    test('empty path part', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.empty();
      const hasPath = CodePath.hasPath(library, pathPart);
      
      expect(hasPath.codePathPart.parts.toArray()).toEqual([]);
      expect(hasPath.codePath.parts.toArray().map(p => p.value)).toEqual(['myLib']);
    });

    test('single character identifiers', () => {
      const library = TsIdent.simple('a');
      const pathPart = TsQIdent.ofStrings('b');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      expect(hasPath.inLibrary.value).toBe('a');
      expect(hasPath.codePathPart.parts.toArray().map(p => p.value)).toEqual(['b']);
      expect(hasPath.codePath.parts.toArray().map(p => p.value)).toEqual(['a', 'b']);
    });

    test('very long path', () => {
      const library = TsIdent.simple('lib');
      const pathParts = Array.from({ length: 10 }, (_, i) => `part${i}`);
      const pathPart = TsQIdent.ofStrings(...pathParts);
      const hasPath = CodePath.hasPath(library, pathPart);
      
      expect(hasPath.codePathPart.parts.toArray().map(p => p.value)).toEqual(pathParts);
      expect(hasPath.codePath.parts.toArray().map(p => p.value))
        .toEqual(['lib', ...pathParts]);
    });

    test('special characters in identifiers', () => {
      const library = TsIdent.simple('my-lib');
      const pathPart = TsQIdent.ofStrings('my_module', 'sub.module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      expect(hasPath.inLibrary.value).toBe('my-lib');
      expect(hasPath.codePathPart.parts.toArray().map(p => p.value))
        .toEqual(['my_module', 'sub.module']);
    });
  });

  describe('Integration with TsIdent Special Values', () => {
    test('using TsIdentGlobal', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      const result = hasPath.add(TsIdentGlobal);
      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['module', '<global>']);
      }
    });

    test('using TsIdentApply', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      const result = hasPath.add(TsIdentApply);
      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['module', '<apply>']);
      }
    });

    test('using TsIdentDestructured', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      const result = hasPath.add(TsIdentDestructured);
      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['module', '<destructured>']);
      }
    });

    test('using library identifiers', () => {
      const library = TsIdentStd;
      const pathPart = TsQIdent.ofStrings('Array');
      const hasPath = CodePath.hasPath(library, pathPart);
      
      expect(hasPath.inLibrary.value).toBe('std');
      expect(hasPath.codePath.parts.toArray().map(p => p.value))
        .toEqual(['std', 'Array']);
    });
  });

  describe('Complex Real-World Scenarios', () => {
    test('nested module structure', () => {
      const library = TsIdent.simple('react');
      const pathPart = TsQIdent.ofStrings('components', 'Button');
      const hasPath = CodePath.hasPath(library, pathPart);

      // Add more nesting
      const result = hasPath.add(TsIdent.simple('Props')).add(TsIdent.simple('onClick'));

      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.inLibrary.value).toBe('react');
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['components', 'Button', 'Props', 'onClick']);
        expect(result.codePath.parts.toArray().map(p => p.value))
          .toEqual(['react', 'components', 'Button', 'Props', 'onClick']);
      }
    });

    test('replacing in deeply nested structure', () => {
      const library = TsIdent.simple('lodash');
      const pathPart = TsQIdent.ofStrings('fp', 'curry', 'placeholder');
      const hasPath = CodePath.hasPath(library, pathPart);

      const result = hasPath.replaceLast(TsIdent.simple('__'));
      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.inLibrary.value).toBe('lodash');
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['fp', 'curry', '__']);
      }
    });

    test('working with scoped library names', () => {
      const library = TsIdent.libraryScoped('angular', 'core');
      const pathPart = TsQIdent.ofStrings('Injectable');
      const hasPath = CodePath.hasPath(library, pathPart);

      expect(hasPath.inLibrary.value).toBe('@angular/core');
      expect(hasPath.codePath.parts.toArray()[0].value).toBe('@angular/core');
    });
  });

  describe('Pattern Matching and Tree Navigation', () => {
    test('pattern matching exhaustiveness with TsDeclInterface', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);

      // Test various TsTree types to ensure pattern matching works
      const interface_ = TsDeclInterface.create(
        Comments.empty(),
        false, // declared
        TsIdent.simple('MyInterface'),
        IArray.Empty, // tparams
        IArray.Empty, // inheritance
        IArray.Empty, // members
        CodePath.noPath()
      );

      const result = hasPath.navigate(interface_);
      expect(result.codePathPart.parts.toArray().map(p => p.value))
        .toEqual(['module', 'MyInterface']);
    });

    test('chaining navigation operations', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);

      const class1 = TsDeclClass.create(
        Comments.empty(),
        false,
        false,
        TsIdent.simple('Class1'),
        IArray.Empty,
        none,
        IArray.Empty,
        IArray.Empty,
        JsLocation.zero(),
        CodePath.noPath()
      );

      const class2 = TsDeclClass.create(
        Comments.empty(),
        false,
        false,
        TsIdent.simple('Class2'),
        IArray.Empty,
        none,
        IArray.Empty,
        IArray.Empty,
        JsLocation.zero(),
        CodePath.noPath()
      );

      const result = hasPath.navigate(class1).navigate(class2);
      expect(result.codePathPart.parts.toArray().map(p => p.value))
        .toEqual(['module', 'Class1', 'Class2']);
    });
  });

  describe('Type Safety and Polymorphism', () => {
    test('CodePath trait polymorphism', () => {
      const noPath: CodePath = CodePath.noPath();
      const hasPath: CodePath = CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.ofStrings('module'));

      // Test that both implement the trait correctly
      expect(isNone(noPath.get())).toBe(true);
      expect(isSome(hasPath.get())).toBe(true);

      // Test add operator polymorphism
      const ident = TsIdent.simple('test');
      const result1 = noPath.add(ident);
      const result2 = hasPath.add(ident);

      expect(CodePath.isNoPath(result1)).toBe(true);
      expect(CodePath.isHasPath(result2)).toBe(true);
    });

    test('HasCodePath trait integration', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module');
      const hasPath = CodePath.hasPath(library, pathPart);

      // Test that HasPath implements CodePath methods
      expect(hasPath.codePath.parts.toArray().map(p => p.value))
        .toEqual(['myLib', 'module']);

      // Test withCodePath method through a TsNamedDecl that implements HasCodePath
      const interface_ = TsDeclInterface.create(
        Comments.empty(),
        false,
        TsIdent.simple('MyInterface'),
        IArray.Empty,
        IArray.Empty,
        IArray.Empty,
        hasPath
      );

      const newPath = CodePath.hasPath(TsIdent.simple('newLib'), TsQIdent.ofStrings('newModule'));
      const updated = interface_.withCodePath(newPath);
      expect(CodePath.isHasPath(updated.codePath)).toBe(true);
      if (CodePath.isHasPath(updated.codePath)) {
        expect(updated.codePath.inLibrary.value).toBe('newLib');
        expect(updated.codePath.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['newModule']);
      }
    });
  });

  describe('Interoperability with Other TypeScript Types', () => {
    test('with TsIdentModule', () => {
      const moduleIdent = TsIdent.module(some('scope'), ['module', 'submodule']);
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('path');
      const hasPath = CodePath.hasPath(library, pathPart);

      const result = hasPath.add(moduleIdent);
      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['path', '@scope/module/submodule']);
      }
    });

    test('with TsIdentImport', () => {
      const moduleIdent = TsIdent.module(none, ['imported-module']);
      const importIdent = TsIdent.import(moduleIdent);
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('path');
      const hasPath = CodePath.hasPath(library, pathPart);

      const result = hasPath.add(importIdent);
      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['path', 'imported-module']);
      }
    });
  });

  describe('Error Handling and Robustness', () => {
    test('consistent behavior with multiple operations', () => {
      const library = TsIdent.simple('lib');
      const pathPart = TsQIdent.ofStrings('a', 'b', 'c');
      const hasPath = CodePath.hasPath(library, pathPart);

      // Chain multiple operations
      const result = hasPath
        .add(TsIdent.simple('d'))        // ['a', 'b', 'c', 'd']
        .replaceLast(TsIdent.simple('e')) // ['a', 'b', 'c', 'e'] (replace 'd' with 'e')
        .add(TsIdent.simple('f'));       // ['a', 'b', 'c', 'e', 'f']

      expect(CodePath.isHasPath(result)).toBe(true);
      if (CodePath.isHasPath(result)) {
        expect(result.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['a', 'b', 'c', 'e', 'f']);
      }
    });

    test('immutability of operations', () => {
      const library = TsIdent.simple('lib');
      const pathPart = TsQIdent.ofStrings('original');
      const hasPath = CodePath.hasPath(library, pathPart);

      // Perform operations that should not modify the original
      const added = hasPath.add(TsIdent.simple('added'));
      const replaced = hasPath.replaceLast(TsIdent.simple('replaced'));

      // Original should be unchanged
      expect(hasPath.codePathPart.parts.toArray().map(p => p.value))
        .toEqual(['original']);

      // New instances should have expected values
      expect(CodePath.isHasPath(added)).toBe(true);
      if (CodePath.isHasPath(added)) {
        expect(added.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['original', 'added']);
      }

      expect(CodePath.isHasPath(replaced)).toBe(true);
      if (CodePath.isHasPath(replaced)) {
        expect(replaced.codePathPart.parts.toArray().map(p => p.value))
          .toEqual(['replaced']);
      }
    });
  });

  describe('String Representation and Debugging', () => {
    test('asString property for NoPath', () => {
      const noPath = CodePath.noPath();
      expect(noPath.asString).toBe('CodePath.NoPath');
    });

    test('asString property for HasPath', () => {
      const library = TsIdent.simple('myLib');
      const pathPart = TsQIdent.ofStrings('module', 'submodule');
      const hasPath = CodePath.hasPath(library, pathPart);

      expect(hasPath.asString).toContain('CodePath.HasPath');
      expect(hasPath.asString).toContain('myLib');
      expect(hasPath.asString).toContain('module.submodule');
    });
  });
});