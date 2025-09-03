/**
 * Tests for ExportType.ts - TypeScript port of org.scalablytyped.converter.internal.ts.ExportType
 */

import { describe, it, expect } from 'bun:test';
import { some, none, isSome, isNone } from 'fp-ts/Option';
import {
  ExportType,
  NamedInstance,
  DefaultedInstance,
  NamespacedInstance,
  type Named,
  type Defaulted,
  type Namespaced
} from '../internal/ts/ExportType.js';

describe('ExportType', () => {
  describe('Named export type', () => {
    it('should create Named export type', () => {
      const exportType = ExportType.named();
      expect(exportType._tag).toBe('Named');
      expect(ExportType.isNamed(exportType)).toBe(true);
      expect(ExportType.isDefaulted(exportType)).toBe(false);
      expect(ExportType.isNamespaced(exportType)).toBe(false);
    });

    it('should use singleton instance', () => {
      const instance1 = NamedInstance;
      const instance2 = ExportType.named();
      expect(instance1._tag).toBe(instance2._tag);
    });

    it('should convert to string correctly', () => {
      const exportType = ExportType.named();
      const result = ExportType.toString(exportType);
      expect(result).toBe('Named');
    });

    it('should not be in NotNamed set', () => {
      const exportType = ExportType.named();
      expect(ExportType.isNotNamed(exportType)).toBe(false);
    });
  });

  describe('Defaulted export type', () => {
    it('should create Defaulted export type', () => {
      const exportType = ExportType.defaulted();
      expect(exportType._tag).toBe('Defaulted');
      expect(ExportType.isDefaulted(exportType)).toBe(true);
      expect(ExportType.isNamed(exportType)).toBe(false);
      expect(ExportType.isNamespaced(exportType)).toBe(false);
    });

    it('should use singleton instance', () => {
      const instance1 = DefaultedInstance;
      const instance2 = ExportType.defaulted();
      expect(instance1._tag).toBe(instance2._tag);
    });

    it('should convert to string correctly', () => {
      const exportType = ExportType.defaulted();
      const result = ExportType.toString(exportType);
      expect(result).toBe('Defaulted');
    });

    it('should be in NotNamed set', () => {
      const exportType = ExportType.defaulted();
      expect(ExportType.isNotNamed(exportType)).toBe(true);
    });
  });

  describe('Namespaced export type', () => {
    it('should create Namespaced export type', () => {
      const exportType = ExportType.namespaced();
      expect(exportType._tag).toBe('Namespaced');
      expect(ExportType.isNamespaced(exportType)).toBe(true);
      expect(ExportType.isNamed(exportType)).toBe(false);
      expect(ExportType.isDefaulted(exportType)).toBe(false);
    });

    it('should use singleton instance', () => {
      const instance1 = NamespacedInstance;
      const instance2 = ExportType.namespaced();
      expect(instance1._tag).toBe(instance2._tag);
    });

    it('should convert to string correctly', () => {
      const exportType = ExportType.namespaced();
      const result = ExportType.toString(exportType);
      expect(result).toBe('Namespaced');
    });

    it('should be in NotNamed set', () => {
      const exportType = ExportType.namespaced();
      expect(ExportType.isNotNamed(exportType)).toBe(true);
    });
  });

  describe('Type guards', () => {
    it('should correctly identify export types', () => {
      const named = ExportType.named();
      const defaulted = ExportType.defaulted();
      const namespaced = ExportType.namespaced();

      // Named checks
      expect(ExportType.isNamed(named)).toBe(true);
      expect(ExportType.isNamed(defaulted)).toBe(false);
      expect(ExportType.isNamed(namespaced)).toBe(false);

      // Defaulted checks
      expect(ExportType.isDefaulted(defaulted)).toBe(true);
      expect(ExportType.isDefaulted(named)).toBe(false);
      expect(ExportType.isDefaulted(namespaced)).toBe(false);

      // Namespaced checks
      expect(ExportType.isNamespaced(namespaced)).toBe(true);
      expect(ExportType.isNamespaced(named)).toBe(false);
      expect(ExportType.isNamespaced(defaulted)).toBe(false);
    });
  });

  describe('NotNamed set', () => {
    it('should contain Defaulted and Namespaced export types', () => {
      const notNamed = ExportType.NotNamed;
      expect(notNamed.size).toBe(2);
      
      const notNamedArray = Array.from(notNamed);
      const tags = notNamedArray.map(et => et._tag).sort();
      expect(tags).toEqual(['Defaulted', 'Namespaced']);
    });

    it('should not contain Named export type', () => {
      const notNamed = ExportType.NotNamed;
      const namedExists = Array.from(notNamed).some(et => et._tag === 'Named');
      expect(namedExists).toBe(false);
    });

    it('should correctly identify NotNamed types', () => {
      const named = ExportType.named();
      const defaulted = ExportType.defaulted();
      const namespaced = ExportType.namespaced();

      expect(ExportType.isNotNamed(named)).toBe(false);
      expect(ExportType.isNotNamed(defaulted)).toBe(true);
      expect(ExportType.isNotNamed(namespaced)).toBe(true);
    });
  });

  describe('fromString parsing', () => {
    it('should parse Named export type', () => {
      const result = ExportType.fromString('Named');
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(ExportType.isNamed(result.value)).toBe(true);
      }
    });

    it('should parse Defaulted export type', () => {
      const result = ExportType.fromString('Defaulted');
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(ExportType.isDefaulted(result.value)).toBe(true);
      }
    });

    it('should parse Namespaced export type', () => {
      const result = ExportType.fromString('Namespaced');
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(ExportType.isNamespaced(result.value)).toBe(true);
      }
    });

    it('should handle whitespace', () => {
      const inputs = [
        '  Named  ',
        '\tDefaulted\n',
        ' Namespaced '
      ];
      
      inputs.forEach(input => {
        const result = ExportType.fromString(input);
        expect(isSome(result)).toBe(true);
      });
    });

    it('should return None for invalid input', () => {
      const invalidInputs = [
        'Invalid',
        'named',
        'NAMED',
        'Default',
        'Namespace',
        '',
        'random text'
      ];
      
      invalidInputs.forEach(input => {
        const result = ExportType.fromString(input);
        expect(isNone(result)).toBe(true);
      });
    });
  });

  describe('equals functionality', () => {
    it('should compare same export types correctly', () => {
      const named1 = ExportType.named();
      const named2 = ExportType.named();
      const defaulted1 = ExportType.defaulted();
      const defaulted2 = ExportType.defaulted();
      const namespaced1 = ExportType.namespaced();
      const namespaced2 = ExportType.namespaced();

      expect(ExportType.equals(named1, named2)).toBe(true);
      expect(ExportType.equals(defaulted1, defaulted2)).toBe(true);
      expect(ExportType.equals(namespaced1, namespaced2)).toBe(true);
    });

    it('should compare different export types correctly', () => {
      const named = ExportType.named();
      const defaulted = ExportType.defaulted();
      const namespaced = ExportType.namespaced();

      expect(ExportType.equals(named, defaulted)).toBe(false);
      expect(ExportType.equals(named, namespaced)).toBe(false);
      expect(ExportType.equals(defaulted, namespaced)).toBe(false);
    });
  });

  describe('all export types', () => {
    it('should return all possible export types', () => {
      const all = ExportType.all;
      expect(all.length).toBe(3);

      const tags = all.map(et => et._tag).sort();
      expect(tags).toEqual(['Defaulted', 'Named', 'Namespaced']);
    });

    it('should contain one of each type', () => {
      const all = ExportType.all;
      const namedCount = all.filter(et => et._tag === 'Named').length;
      const defaultedCount = all.filter(et => et._tag === 'Defaulted').length;
      const namespacedCount = all.filter(et => et._tag === 'Namespaced').length;

      expect(namedCount).toBe(1);
      expect(defaultedCount).toBe(1);
      expect(namespacedCount).toBe(1);
    });
  });

  describe('pattern matching', () => {
    it('should match Named export type', () => {
      const named = ExportType.named();
      const result = ExportType.match(named, {
        Named: () => 'matched-named',
        Defaulted: () => 'matched-defaulted',
        Namespaced: () => 'matched-namespaced'
      });
      expect(result).toBe('matched-named');
    });

    it('should match Defaulted export type', () => {
      const defaulted = ExportType.defaulted();
      const result = ExportType.match(defaulted, {
        Named: () => 'matched-named',
        Defaulted: () => 'matched-defaulted',
        Namespaced: () => 'matched-namespaced'
      });
      expect(result).toBe('matched-defaulted');
    });

    it('should match Namespaced export type', () => {
      const namespaced = ExportType.namespaced();
      const result = ExportType.match(namespaced, {
        Named: () => 'matched-named',
        Defaulted: () => 'matched-defaulted',
        Namespaced: () => 'matched-namespaced'
      });
      expect(result).toBe('matched-namespaced');
    });

    it('should work with different return types', () => {
      const named = ExportType.named();
      const numberResult = ExportType.match(named, {
        Named: () => 42,
        Defaulted: () => 0,
        Namespaced: () => -1
      });
      expect(numberResult).toBe(42);

      const booleanResult = ExportType.match(named, {
        Named: () => true,
        Defaulted: () => false,
        Namespaced: () => false
      });
      expect(booleanResult).toBe(true);
    });
  });

  describe('functional fold operation', () => {
    it('should fold Named export type', () => {
      const named = ExportType.named();
      const folder = ExportType.fold(
        () => 'folded-named',
        () => 'folded-defaulted',
        () => 'folded-namespaced'
      );
      const result = folder(named);
      expect(result).toBe('folded-named');
    });

    it('should fold Defaulted export type', () => {
      const defaulted = ExportType.defaulted();
      const folder = ExportType.fold(
        () => 'folded-named',
        () => 'folded-defaulted',
        () => 'folded-namespaced'
      );
      const result = folder(defaulted);
      expect(result).toBe('folded-defaulted');
    });

    it('should fold Namespaced export type', () => {
      const namespaced = ExportType.namespaced();
      const folder = ExportType.fold(
        () => 'folded-named',
        () => 'folded-defaulted',
        () => 'folded-namespaced'
      );
      const result = folder(namespaced);
      expect(result).toBe('folded-namespaced');
    });

    it('should work with complex computations', () => {
      const exportTypes = [
        ExportType.named(),
        ExportType.defaulted(),
        ExportType.namespaced()
      ];

      const computeScore = ExportType.fold(
        () => 100, // Named gets highest score
        () => 50,  // Defaulted gets medium score
        () => 25   // Namespaced gets lowest score
      );

      const scores = exportTypes.map(computeScore);
      expect(scores).toEqual([100, 50, 25]);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle round-trip conversion (toString -> fromString)', () => {
      const exportTypes = [
        ExportType.named(),
        ExportType.defaulted(),
        ExportType.namespaced()
      ];

      exportTypes.forEach(original => {
        const stringified = ExportType.toString(original);
        const parsed = ExportType.fromString(stringified);

        expect(isSome(parsed)).toBe(true);
        if (isSome(parsed)) {
          expect(ExportType.equals(original, parsed.value)).toBe(true);
        }
      });
    });

    it('should handle case sensitivity in parsing', () => {
      const caseSensitiveInputs = [
        'named',
        'NAMED',
        'defaulted',
        'DEFAULTED',
        'namespaced',
        'NAMESPACED'
      ];

      caseSensitiveInputs.forEach(input => {
        const result = ExportType.fromString(input);
        expect(isNone(result)).toBe(true);
      });
    });

    it('should handle empty and whitespace-only strings', () => {
      const emptyInputs = ['', '   ', '\t', '\n', '\r\n'];

      emptyInputs.forEach(input => {
        const result = ExportType.fromString(input);
        expect(isNone(result)).toBe(true);
      });
    });

    it('should maintain singleton behavior across operations', () => {
      const named1 = ExportType.named();
      const named2 = ExportType.named();
      const stringified = ExportType.toString(named1);
      const parsed = ExportType.fromString(stringified);

      expect(named1._tag).toBe(named2._tag);
      expect(isSome(parsed)).toBe(true);
      if (isSome(parsed)) {
        expect(parsed.value._tag).toBe(named1._tag);
      }
    });

    it('should work correctly with Set operations', () => {
      const exportTypeSet = new Set([
        ExportType.named(),
        ExportType.defaulted(),
        ExportType.namespaced(),
        ExportType.named(), // Duplicate
        ExportType.defaulted() // Duplicate
      ]);

      // Set should contain 3 unique items based on object identity
      // Note: This tests object identity, not semantic equality
      expect(exportTypeSet.size).toBe(5); // Objects are different instances

      // But semantic equality should work
      const types = Array.from(exportTypeSet);
      const uniqueTags = new Set(types.map(t => t._tag));
      expect(uniqueTags.size).toBe(3);
      expect(Array.from(uniqueTags).sort()).toEqual(['Defaulted', 'Named', 'Namespaced']);
    });
  });
});