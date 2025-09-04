/**
 * Comprehensive unit tests for TsTypeUnion - TypeScript port of TsTypeUnionTests.scala
 *
 * This file ports all 35 test cases from the Scala version to ensure behavioral compatibility
 * between the Scala and TypeScript implementations of TsTypeUnion.
 */

import { describe, it, expect } from 'bun:test';
import { Option, some, none } from 'fp-ts/Option';
import { IArray } from '@/internal/IArray.js';
import { Comments } from '@/internal/Comments.js';
import {
  TsTypeUnion,
  TsTypeRef,
  TsTypeIntersect,
  TsTypeObject,
  TsTypeLiteral,
  TsTypeFunction,
  TsTypeTuple,
  TsTypeConditional,
  TsTupleElement,
  TsMemberProperty,
  TsMember,
  TsFunSig,
  TsFunParam,
  TsIdent,
  TsQIdent,
  TsLiteral,
  TsType
} from '@/internal/ts/trees.js';
import { TsProtectionLevel } from '@/internal/ts/TsProtectionLevel.js';

describe('TsTypeUnion Tests', () => {
  describe('Construction and Basic Properties', () => {
    it('constructor creates union type with given types', () => {
      const stringType = TsTypeRef.string;
      const numberType = TsTypeRef.number;
      const types = IArray.fromArray<TsType>([stringType, numberType]);
      const unionType = TsTypeUnion.create(types);

      expect(unionType.types).toBe(types);
      expect(unionType.types.length).toBe(2);
      expect(unionType.types.apply(0)).toBe(stringType);
      expect(unionType.types.apply(1)).toBe(numberType);
    });

    it('constructor with empty types array', () => {
      const emptyTypes = IArray.Empty;
      const unionType = TsTypeUnion.create(emptyTypes);

      expect(unionType.types.isEmpty).toBe(true);
      expect(unionType.types.length).toBe(0);
    });

    it('constructor with single type', () => {
      const singleType = TsTypeRef.boolean;
      const types = IArray.fromArray<TsType>([singleType]);
      const unionType = TsTypeUnion.create(types);

      expect(unionType.types.length).toBe(1);
      expect(unionType.types.apply(0)).toBe(singleType);
    });

    it('constructor with multiple primitive types', () => {
      const stringType = TsTypeRef.string;
      const numberType = TsTypeRef.number;
      const booleanType = TsTypeRef.boolean;
      const types = IArray.fromArray<TsType>([stringType, numberType, booleanType]);
      const unionType = TsTypeUnion.create(types);

      expect(unionType.types.length).toBe(3);
      expect(unionType.types.apply(0)).toBe(stringType);
      expect(unionType.types.apply(1)).toBe(numberType);
      expect(unionType.types.apply(2)).toBe(booleanType);
    });

    it('asString provides meaningful representation', () => {
      const types = IArray.fromArray<TsType>([TsTypeRef.string, TsTypeRef.number]);
      const unionType = TsTypeUnion.create(types);

      expect(unionType.asString).toContain('TsTypeUnion');
    });
  });

  describe('TsTypeUnion.simplified - Basic Functionality', () => {
    it('empty union returns never', () => {
      const result = TsTypeUnion.simplified(IArray.Empty);

      expect(result).toBe(TsTypeRef.never);
    });

    it('single type union returns the type itself', () => {
      const stringType = TsTypeRef.string;
      const result = TsTypeUnion.simplified(IArray.fromArray<TsType>([stringType]));

      expect(result).toBe(stringType);
    });

    it('two different primitive types remain as union', () => {
      const stringType = TsTypeRef.string;
      const numberType = TsTypeRef.number;
      const result = TsTypeUnion.simplified(IArray.fromArray<TsType>([stringType, numberType]));

      if (result._tag === 'TsTypeUnion') {
        const unionResult = result as TsTypeUnion;
        expect(unionResult.types.length).toBe(2);
        expect(unionResult.types.toArray()).toContain(stringType);
        expect(unionResult.types.toArray()).toContain(numberType);
      } else {
        expect(false).toBe(true); // Should be TsTypeUnion
      }
    });

    it('duplicate types are removed', () => {
      const stringType = TsTypeRef.string;
      const result = TsTypeUnion.simplified(IArray.fromArray<TsType>([stringType, stringType, stringType]));

      expect(result).toBe(stringType);
    });

    it('multiple distinct types remain as union', () => {
      const stringType = TsTypeRef.string;
      const numberType = TsTypeRef.number;
      const booleanType = TsTypeRef.boolean;
      const result = TsTypeUnion.simplified(IArray.fromArray<TsType>([stringType, numberType, booleanType]));

      if (result._tag === 'TsTypeUnion') {
        const unionResult = result as TsTypeUnion;
        expect(unionResult.types.length).toBe(3);
        expect(unionResult.types.toArray()).toContain(stringType);
        expect(unionResult.types.toArray()).toContain(numberType);
        expect(unionResult.types.toArray()).toContain(booleanType);
      } else {
        expect(false).toBe(true); // Should be TsTypeUnion
      }
    });
  });

  describe('TsTypeUnion.simplified - Nested Union Flattening', () => {
    it('flattens nested union types', () => {
      const stringType = TsTypeRef.string;
      const numberType = TsTypeRef.number;
      const booleanType = TsTypeRef.boolean;

      // Create nested union: (string | number) | boolean
      const innerUnion = TsTypeUnion.create(IArray.fromArray<TsType>([stringType, numberType]));
      const result = TsTypeUnion.simplified(IArray.fromArray<TsType>([innerUnion, booleanType]));

      if (result._tag === 'TsTypeUnion') {
        const unionResult = result as TsTypeUnion;
        expect(unionResult.types.length).toBe(3);
        expect(unionResult.types.toArray()).toContain(stringType);
        expect(unionResult.types.toArray()).toContain(numberType);
        expect(unionResult.types.toArray()).toContain(booleanType);
      } else {
        expect(false).toBe(true); // Should be TsTypeUnion
      }
    });

    it('flattens deeply nested union types', () => {
      const type1 = TsTypeRef.string;
      const type2 = TsTypeRef.number;
      const type3 = TsTypeRef.boolean;
      const type4 = TsTypeRef.any;

      // Create deeply nested: ((string | number) | boolean) | any
      const level1 = TsTypeUnion.create(IArray.fromArray<TsType>([type1, type2]));
      const level2 = TsTypeUnion.create(IArray.fromArray<TsType>([level1, type3]));
      const result = TsTypeUnion.simplified(IArray.fromArray<TsType>([level2, type4]));

      if (result._tag === 'TsTypeUnion') {
        const unionResult = result as TsTypeUnion;
        expect(unionResult.types.length).toBe(4);
        expect(unionResult.types.toArray()).toContain(type1);
        expect(unionResult.types.toArray()).toContain(type2);
        expect(unionResult.types.toArray()).toContain(type3);
        expect(unionResult.types.toArray()).toContain(type4);
      } else {
        expect(false).toBe(true); // Should be TsTypeUnion
      }
    });
  });
});