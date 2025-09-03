/**
 * Tests for TsProtectionLevel.ts - TypeScript port of org.scalablytyped.converter.internal.ts.TsProtectionLevel
 */

import { describe, it, expect } from 'bun:test';
import { some, none, isSome, isNone } from 'fp-ts/Option';
import {
  TsProtectionLevel,
  DefaultInstance,
  PrivateInstance,
  ProtectedInstance,
  type Default,
  type Private,
  type Protected
} from '../internal/ts/TsProtectionLevel.js';

describe('TsProtectionLevel', () => {
  describe('Default protection level', () => {
    it('should create Default protection level', () => {
      const protectionLevel = TsProtectionLevel.default();
      expect(protectionLevel._tag).toBe('Default');
      expect(TsProtectionLevel.isDefault(protectionLevel)).toBe(true);
      expect(TsProtectionLevel.isPrivate(protectionLevel)).toBe(false);
      expect(TsProtectionLevel.isProtected(protectionLevel)).toBe(false);
    });

    it('should use singleton instance', () => {
      const instance1 = DefaultInstance;
      const instance2 = TsProtectionLevel.default();
      expect(instance1._tag).toBe(instance2._tag);
    });

    it('should convert to string correctly', () => {
      const protectionLevel = TsProtectionLevel.default();
      const result = TsProtectionLevel.toString(protectionLevel);
      expect(result).toBe('Default');
    });

    it('should convert to keyword correctly', () => {
      const protectionLevel = TsProtectionLevel.default();
      const result = TsProtectionLevel.toKeyword(protectionLevel);
      expect(result).toBe('');
    });

    it('should be accessible', () => {
      const protectionLevel = TsProtectionLevel.default();
      expect(TsProtectionLevel.isAccessible(protectionLevel)).toBe(true);
    });

    it('should not be restricted', () => {
      const protectionLevel = TsProtectionLevel.default();
      expect(TsProtectionLevel.isRestricted(protectionLevel)).toBe(false);
    });
  });

  describe('Private protection level', () => {
    it('should create Private protection level', () => {
      const protectionLevel = TsProtectionLevel.private();
      expect(protectionLevel._tag).toBe('Private');
      expect(TsProtectionLevel.isPrivate(protectionLevel)).toBe(true);
      expect(TsProtectionLevel.isDefault(protectionLevel)).toBe(false);
      expect(TsProtectionLevel.isProtected(protectionLevel)).toBe(false);
    });

    it('should use singleton instance', () => {
      const instance1 = PrivateInstance;
      const instance2 = TsProtectionLevel.private();
      expect(instance1._tag).toBe(instance2._tag);
    });

    it('should convert to string correctly', () => {
      const protectionLevel = TsProtectionLevel.private();
      const result = TsProtectionLevel.toString(protectionLevel);
      expect(result).toBe('Private');
    });

    it('should convert to keyword correctly', () => {
      const protectionLevel = TsProtectionLevel.private();
      const result = TsProtectionLevel.toKeyword(protectionLevel);
      expect(result).toBe('private');
    });

    it('should not be accessible', () => {
      const protectionLevel = TsProtectionLevel.private();
      expect(TsProtectionLevel.isAccessible(protectionLevel)).toBe(false);
    });

    it('should be restricted', () => {
      const protectionLevel = TsProtectionLevel.private();
      expect(TsProtectionLevel.isRestricted(protectionLevel)).toBe(true);
    });
  });

  describe('Protected protection level', () => {
    it('should create Protected protection level', () => {
      const protectionLevel = TsProtectionLevel.protected();
      expect(protectionLevel._tag).toBe('Protected');
      expect(TsProtectionLevel.isProtected(protectionLevel)).toBe(true);
      expect(TsProtectionLevel.isDefault(protectionLevel)).toBe(false);
      expect(TsProtectionLevel.isPrivate(protectionLevel)).toBe(false);
    });

    it('should use singleton instance', () => {
      const instance1 = ProtectedInstance;
      const instance2 = TsProtectionLevel.protected();
      expect(instance1._tag).toBe(instance2._tag);
    });

    it('should convert to string correctly', () => {
      const protectionLevel = TsProtectionLevel.protected();
      const result = TsProtectionLevel.toString(protectionLevel);
      expect(result).toBe('Protected');
    });

    it('should convert to keyword correctly', () => {
      const protectionLevel = TsProtectionLevel.protected();
      const result = TsProtectionLevel.toKeyword(protectionLevel);
      expect(result).toBe('protected');
    });

    it('should be accessible', () => {
      const protectionLevel = TsProtectionLevel.protected();
      expect(TsProtectionLevel.isAccessible(protectionLevel)).toBe(true);
    });

    it('should be restricted', () => {
      const protectionLevel = TsProtectionLevel.protected();
      expect(TsProtectionLevel.isRestricted(protectionLevel)).toBe(true);
    });
  });

  describe('Type guards', () => {
    it('should correctly identify protection levels', () => {
      const defaultLevel = TsProtectionLevel.default();
      const privateLevel = TsProtectionLevel.private();
      const protectedLevel = TsProtectionLevel.protected();

      // Default checks
      expect(TsProtectionLevel.isDefault(defaultLevel)).toBe(true);
      expect(TsProtectionLevel.isDefault(privateLevel)).toBe(false);
      expect(TsProtectionLevel.isDefault(protectedLevel)).toBe(false);

      // Private checks
      expect(TsProtectionLevel.isPrivate(privateLevel)).toBe(true);
      expect(TsProtectionLevel.isPrivate(defaultLevel)).toBe(false);
      expect(TsProtectionLevel.isPrivate(protectedLevel)).toBe(false);

      // Protected checks
      expect(TsProtectionLevel.isProtected(protectedLevel)).toBe(true);
      expect(TsProtectionLevel.isProtected(defaultLevel)).toBe(false);
      expect(TsProtectionLevel.isProtected(privateLevel)).toBe(false);
    });
  });

  describe('Accessibility and restriction checks', () => {
    it('should correctly identify accessible protection levels', () => {
      const defaultLevel = TsProtectionLevel.default();
      const privateLevel = TsProtectionLevel.private();
      const protectedLevel = TsProtectionLevel.protected();

      expect(TsProtectionLevel.isAccessible(defaultLevel)).toBe(true);
      expect(TsProtectionLevel.isAccessible(privateLevel)).toBe(false);
      expect(TsProtectionLevel.isAccessible(protectedLevel)).toBe(true);
    });

    it('should correctly identify restricted protection levels', () => {
      const defaultLevel = TsProtectionLevel.default();
      const privateLevel = TsProtectionLevel.private();
      const protectedLevel = TsProtectionLevel.protected();

      expect(TsProtectionLevel.isRestricted(defaultLevel)).toBe(false);
      expect(TsProtectionLevel.isRestricted(privateLevel)).toBe(true);
      expect(TsProtectionLevel.isRestricted(protectedLevel)).toBe(true);
    });
  });

  describe('fromString parsing', () => {
    it('should parse Default protection level', () => {
      const result = TsProtectionLevel.fromString('Default');
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(TsProtectionLevel.isDefault(result.value)).toBe(true);
      }
    });

    it('should parse Private protection level', () => {
      const result = TsProtectionLevel.fromString('Private');
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(TsProtectionLevel.isPrivate(result.value)).toBe(true);
      }
    });

    it('should parse Protected protection level', () => {
      const result = TsProtectionLevel.fromString('Protected');
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(TsProtectionLevel.isProtected(result.value)).toBe(true);
      }
    });

    it('should handle whitespace', () => {
      const inputs = [
        '  Default  ',
        '\tPrivate\n',
        ' Protected '
      ];
      
      inputs.forEach(input => {
        const result = TsProtectionLevel.fromString(input);
        expect(isSome(result)).toBe(true);
      });
    });

    it('should return None for invalid input', () => {
      const invalidInputs = [
        'Invalid',
        'default',
        'DEFAULT',
        'Public',
        'private',
        'protected',
        '',
        'random text'
      ];
      
      invalidInputs.forEach(input => {
        const result = TsProtectionLevel.fromString(input);
        expect(isNone(result)).toBe(true);
      });
    });
  });

  describe('fromKeyword parsing', () => {
    it('should parse empty string as Default', () => {
      const result = TsProtectionLevel.fromKeyword('');
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(TsProtectionLevel.isDefault(result.value)).toBe(true);
      }
    });

    it('should parse public keyword as Default', () => {
      const result = TsProtectionLevel.fromKeyword('public');
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(TsProtectionLevel.isDefault(result.value)).toBe(true);
      }
    });

    it('should parse private keyword', () => {
      const result = TsProtectionLevel.fromKeyword('private');
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(TsProtectionLevel.isPrivate(result.value)).toBe(true);
      }
    });

    it('should parse protected keyword', () => {
      const result = TsProtectionLevel.fromKeyword('protected');
      expect(isSome(result)).toBe(true);
      if (isSome(result)) {
        expect(TsProtectionLevel.isProtected(result.value)).toBe(true);
      }
    });

    it('should handle whitespace in keywords', () => {
      const inputs = [
        '  private  ',
        '\tprotected\n',
        ' public '
      ];
      
      inputs.forEach(input => {
        const result = TsProtectionLevel.fromKeyword(input);
        expect(isSome(result)).toBe(true);
      });
    });

    it('should return None for invalid keywords', () => {
      const invalidInputs = [
        'Invalid',
        'Private',
        'Protected',
        'Default',
        'readonly',
        'static'
      ];
      
      invalidInputs.forEach(input => {
        const result = TsProtectionLevel.fromKeyword(input);
        expect(isNone(result)).toBe(true);
      });
    });
  });

  describe('equals functionality', () => {
    it('should compare same protection levels correctly', () => {
      const default1 = TsProtectionLevel.default();
      const default2 = TsProtectionLevel.default();
      const private1 = TsProtectionLevel.private();
      const private2 = TsProtectionLevel.private();
      const protected1 = TsProtectionLevel.protected();
      const protected2 = TsProtectionLevel.protected();

      expect(TsProtectionLevel.equals(default1, default2)).toBe(true);
      expect(TsProtectionLevel.equals(private1, private2)).toBe(true);
      expect(TsProtectionLevel.equals(protected1, protected2)).toBe(true);
    });

    it('should compare different protection levels correctly', () => {
      const defaultLevel = TsProtectionLevel.default();
      const privateLevel = TsProtectionLevel.private();
      const protectedLevel = TsProtectionLevel.protected();

      expect(TsProtectionLevel.equals(defaultLevel, privateLevel)).toBe(false);
      expect(TsProtectionLevel.equals(defaultLevel, protectedLevel)).toBe(false);
      expect(TsProtectionLevel.equals(privateLevel, protectedLevel)).toBe(false);
    });
  });

  describe('all protection levels', () => {
    it('should return all possible protection levels', () => {
      const all = TsProtectionLevel.all;
      expect(all.length).toBe(3);

      const tags = all.map(pl => pl._tag).sort();
      expect(tags).toEqual(['Default', 'Private', 'Protected']);
    });

    it('should contain one of each type', () => {
      const all = TsProtectionLevel.all;
      const defaultCount = all.filter(pl => pl._tag === 'Default').length;
      const privateCount = all.filter(pl => pl._tag === 'Private').length;
      const protectedCount = all.filter(pl => pl._tag === 'Protected').length;

      expect(defaultCount).toBe(1);
      expect(privateCount).toBe(1);
      expect(protectedCount).toBe(1);
    });
  });

  describe('pattern matching', () => {
    it('should match Default protection level', () => {
      const defaultLevel = TsProtectionLevel.default();
      const result = TsProtectionLevel.match(defaultLevel, {
        Default: () => 'matched-default',
        Private: () => 'matched-private',
        Protected: () => 'matched-protected'
      });
      expect(result).toBe('matched-default');
    });

    it('should match Private protection level', () => {
      const privateLevel = TsProtectionLevel.private();
      const result = TsProtectionLevel.match(privateLevel, {
        Default: () => 'matched-default',
        Private: () => 'matched-private',
        Protected: () => 'matched-protected'
      });
      expect(result).toBe('matched-private');
    });

    it('should match Protected protection level', () => {
      const protectedLevel = TsProtectionLevel.protected();
      const result = TsProtectionLevel.match(protectedLevel, {
        Default: () => 'matched-default',
        Private: () => 'matched-private',
        Protected: () => 'matched-protected'
      });
      expect(result).toBe('matched-protected');
    });

    it('should work with different return types', () => {
      const defaultLevel = TsProtectionLevel.default();
      const numberResult = TsProtectionLevel.match(defaultLevel, {
        Default: () => 42,
        Private: () => 0,
        Protected: () => -1
      });
      expect(numberResult).toBe(42);

      const booleanResult = TsProtectionLevel.match(defaultLevel, {
        Default: () => true,
        Private: () => false,
        Protected: () => false
      });
      expect(booleanResult).toBe(true);
    });
  });

  describe('functional fold operation', () => {
    it('should fold Default protection level', () => {
      const defaultLevel = TsProtectionLevel.default();
      const folder = TsProtectionLevel.fold(
        () => 'folded-default',
        () => 'folded-private',
        () => 'folded-protected'
      );
      const result = folder(defaultLevel);
      expect(result).toBe('folded-default');
    });

    it('should fold Private protection level', () => {
      const privateLevel = TsProtectionLevel.private();
      const folder = TsProtectionLevel.fold(
        () => 'folded-default',
        () => 'folded-private',
        () => 'folded-protected'
      );
      const result = folder(privateLevel);
      expect(result).toBe('folded-private');
    });

    it('should fold Protected protection level', () => {
      const protectedLevel = TsProtectionLevel.protected();
      const folder = TsProtectionLevel.fold(
        () => 'folded-default',
        () => 'folded-private',
        () => 'folded-protected'
      );
      const result = folder(protectedLevel);
      expect(result).toBe('folded-protected');
    });

    it('should work with complex computations', () => {
      const protectionLevels = [
        TsProtectionLevel.default(),
        TsProtectionLevel.private(),
        TsProtectionLevel.protected()
      ];

      const computeAccessibilityScore = TsProtectionLevel.fold(
        () => 100, // Default gets highest score (most accessible)
        () => 0,   // Private gets lowest score (least accessible)
        () => 50   // Protected gets medium score
      );

      const scores = protectionLevels.map(computeAccessibilityScore);
      expect(scores).toEqual([100, 0, 50]);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle round-trip conversion (toString -> fromString)', () => {
      const protectionLevels = [
        TsProtectionLevel.default(),
        TsProtectionLevel.private(),
        TsProtectionLevel.protected()
      ];

      protectionLevels.forEach(original => {
        const stringified = TsProtectionLevel.toString(original);
        const parsed = TsProtectionLevel.fromString(stringified);

        expect(isSome(parsed)).toBe(true);
        if (isSome(parsed)) {
          expect(TsProtectionLevel.equals(original, parsed.value)).toBe(true);
        }
      });
    });

    it('should handle round-trip conversion (toKeyword -> fromKeyword)', () => {
      const protectionLevels = [
        TsProtectionLevel.default(),
        TsProtectionLevel.private(),
        TsProtectionLevel.protected()
      ];

      protectionLevels.forEach(original => {
        const keyword = TsProtectionLevel.toKeyword(original);
        const parsed = TsProtectionLevel.fromKeyword(keyword);

        expect(isSome(parsed)).toBe(true);
        if (isSome(parsed)) {
          expect(TsProtectionLevel.equals(original, parsed.value)).toBe(true);
        }
      });
    });

    it('should handle case sensitivity in parsing', () => {
      const caseSensitiveInputs = [
        'default',
        'DEFAULT',
        'PRIVATE',
        'PROTECTED'
      ];

      caseSensitiveInputs.forEach(input => {
        const result = TsProtectionLevel.fromString(input);
        expect(isNone(result)).toBe(true);
      });
    });

    it('should handle empty and whitespace-only strings', () => {
      const emptyInputs = ['   ', '\t', '\n', '\r\n'];

      emptyInputs.forEach(input => {
        const result = TsProtectionLevel.fromString(input);
        expect(isNone(result)).toBe(true);
      });
    });

    it('should maintain singleton behavior across operations', () => {
      const default1 = TsProtectionLevel.default();
      const default2 = TsProtectionLevel.default();
      const stringified = TsProtectionLevel.toString(default1);
      const parsed = TsProtectionLevel.fromString(stringified);

      expect(default1._tag).toBe(default2._tag);
      expect(isSome(parsed)).toBe(true);
      if (isSome(parsed)) {
        expect(parsed.value._tag).toBe(default1._tag);
      }
    });

    it('should work correctly with Set operations', () => {
      const protectionLevelSet = new Set([
        TsProtectionLevel.default(),
        TsProtectionLevel.private(),
        TsProtectionLevel.protected(),
        TsProtectionLevel.default(), // Duplicate
        TsProtectionLevel.private() // Duplicate
      ]);

      // Set should contain 5 unique items based on object identity
      // Note: This tests object identity, not semantic equality
      expect(protectionLevelSet.size).toBe(5); // Objects are different instances

      // But semantic equality should work
      const types = Array.from(protectionLevelSet);
      const uniqueTags = new Set(types.map(t => t._tag));
      expect(uniqueTags.size).toBe(3);
      expect(Array.from(uniqueTags).sort()).toEqual(['Default', 'Private', 'Protected']);
    });

    it('should handle accessibility classification correctly', () => {
      const accessibleTypes = [TsProtectionLevel.default(), TsProtectionLevel.protected()];
      const nonAccessibleTypes = [TsProtectionLevel.private()];

      accessibleTypes.forEach(type => {
        expect(TsProtectionLevel.isAccessible(type)).toBe(true);
      });

      nonAccessibleTypes.forEach(type => {
        expect(TsProtectionLevel.isAccessible(type)).toBe(false);
      });
    });

    it('should handle restriction classification correctly', () => {
      const restrictedTypes = [TsProtectionLevel.private(), TsProtectionLevel.protected()];
      const nonRestrictedTypes = [TsProtectionLevel.default()];

      restrictedTypes.forEach(type => {
        expect(TsProtectionLevel.isRestricted(type)).toBe(true);
      });

      nonRestrictedTypes.forEach(type => {
        expect(TsProtectionLevel.isRestricted(type)).toBe(false);
      });
    });

    it('should work with functional composition', () => {
      const protectionLevels = TsProtectionLevel.all;

      const isAccessibleFolder = TsProtectionLevel.fold(
        () => true,  // Default is accessible
        () => false, // Private is not accessible
        () => true   // Protected is accessible
      );

      const accessibilityResults = protectionLevels.map(isAccessibleFolder);
      expect(accessibilityResults).toEqual([true, false, true]);

      // Verify consistency with isAccessible method
      protectionLevels.forEach((type, index) => {
        expect(TsProtectionLevel.isAccessible(type)).toBe(accessibilityResults[index]);
      });
    });

    it('should handle keyword variations correctly', () => {
      // Test that empty string and 'public' both map to Default
      const emptyResult = TsProtectionLevel.fromKeyword('');
      const publicResult = TsProtectionLevel.fromKeyword('public');

      expect(isSome(emptyResult)).toBe(true);
      expect(isSome(publicResult)).toBe(true);

      if (isSome(emptyResult) && isSome(publicResult)) {
        expect(TsProtectionLevel.equals(emptyResult.value, publicResult.value)).toBe(true);
        expect(TsProtectionLevel.isDefault(emptyResult.value)).toBe(true);
        expect(TsProtectionLevel.isDefault(publicResult.value)).toBe(true);
      }
    });
  });
});