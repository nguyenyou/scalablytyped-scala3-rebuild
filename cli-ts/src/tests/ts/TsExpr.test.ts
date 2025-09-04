/**
 * Tests for TsExpr - TypeScript port of org.scalablytyped.converter.internal.ts.TsExpr
 * Comprehensive test suite ported from Scala TsExprTests.scala to ensure behavioral parity
 */

import { describe, it, expect } from 'bun:test';
import { IArray } from '@/internal/IArray.ts';
import { Comments } from '@/internal/Comments.js';
import {
  TsExpr,
  TsExprRef,
  TsExprLiteral,
  TsExprCall,
  TsExprUnary,
  TsExprBinaryOp,
  TsExprCast,
  TsExprArrayOf,
  TsQIdent,
  TsIdent,
  TsLiteral,
  TsTypeRef,
  TsTypeLiteral,
  TsTypeUnion
} from '@/internal/ts/trees.ts';

describe('TsExpr - Construction and Basic Properties', () => {
  describe('TsExprRef construction', () => {
    it('should create a reference expression', () => {
      const qident = TsQIdent.of(TsIdent.simple('myVariable'));
      const ref = TsExprRef.create(qident);

      expect(ref._tag).toBe('TsExprRef');
      expect(ref.value).toBe(qident);
    });
  });

  describe('TsExprLiteral construction', () => {
    it('should create literal with string', () => {
      const stringLit = TsLiteral.str('hello');
      const literal = TsExprLiteral.create(stringLit);

      expect(literal._tag).toBe('TsExprLiteral');
      expect(literal.value).toBe(stringLit);
    });

    it('should create literal with number', () => {
      const numLit = TsLiteral.num('42');
      const literal = TsExprLiteral.create(numLit);

      expect(literal._tag).toBe('TsExprLiteral');
      expect(literal.value).toBe(numLit);
    });

    it('should create literal with boolean', () => {
      const boolLit = TsLiteral.bool(true);
      const literal = TsExprLiteral.create(boolLit);

      expect(literal._tag).toBe('TsExprLiteral');
      expect(literal.value).toBe(boolLit);
    });
  });

  describe('TsExprCall construction', () => {
    it('should create call with no parameters', () => {
      const function_ = TsExprRef.create(TsQIdent.of(TsIdent.simple('myFunction')));
      const call = TsExprCall.create(function_, IArray.Empty);

      expect(call._tag).toBe('TsExprCall');
      expect(call.function).toBe(function_);
      expect(call.params.length).toBe(0);
    });

    it('should create call with parameters', () => {
      const function_ = TsExprRef.create(TsQIdent.of(TsIdent.simple('myFunction')));
      const param1 = TsExprLiteral.create(TsLiteral.str('arg1'));
      const param2 = TsExprLiteral.create(TsLiteral.num('42'));
      const params = IArray.fromArray<TsExpr>([param1, param2]);
      const call = TsExprCall.create(function_, params);

      expect(call._tag).toBe('TsExprCall');
      expect(call.function).toBe(function_);
      expect(call.params.length).toBe(2);
      expect(call.params.apply(0)).toBe(param1);
      expect(call.params.apply(1)).toBe(param2);
    });
  });

  describe('TsExprUnary construction', () => {
    it('should create unary expression', () => {
      const expr = TsExprLiteral.create(TsLiteral.bool(true));
      const unary = TsExprUnary.create('!', expr);

      expect(unary._tag).toBe('TsExprUnary');
      expect(unary.op).toBe('!');
      expect(unary.expr).toBe(expr);
    });
  });

  describe('TsExprBinaryOp construction', () => {
    it('should create binary operation', () => {
      const left = TsExprLiteral.create(TsLiteral.num('1'));
      const right = TsExprLiteral.create(TsLiteral.num('2'));
      const binaryOp = TsExprBinaryOp.create(left, '+', right);

      expect(binaryOp._tag).toBe('TsExprBinaryOp');
      expect(binaryOp.one).toBe(left);
      expect(binaryOp.op).toBe('+');
      expect(binaryOp.two).toBe(right);
    });
  });

  describe('TsExprCast construction', () => {
    it('should create cast expression', () => {
      const expr = TsExprLiteral.create(TsLiteral.num('42'));
      const targetType = TsTypeRef.string;
      const cast = TsExprCast.create(expr, targetType);

      expect(cast._tag).toBe('TsExprCast');
      expect(cast.expr).toBe(expr);
      expect(cast.tpe).toBe(targetType);
    });
  });

  describe('TsExprArrayOf construction', () => {
    it('should create array expression', () => {
      const element = TsExprLiteral.create(TsLiteral.str('item'));
      const arrayOf = TsExprArrayOf.create(element);

      expect(arrayOf._tag).toBe('TsExprArrayOf');
      expect(arrayOf.expr).toBe(element);
    });
  });
});

describe('TsExpr - String Formatting', () => {
  describe('format Ref expression', () => {
    it('should format reference expression', () => {
      const ref = TsExprRef.create(TsQIdent.of(TsIdent.simple('myVariable')));
      const formatted = TsExpr.format(ref);

      expect(formatted).toContain('myVariable');
    });
  });

  describe('format Literal expressions', () => {
    it('should format string literal', () => {
      const literal = TsExprLiteral.create(TsLiteral.str('hello'));
      const formatted = TsExpr.format(literal);

      expect(formatted).toBe('"hello"');
    });

    it('should format number literal', () => {
      const literal = TsExprLiteral.create(TsLiteral.num('42'));
      const formatted = TsExpr.format(literal);

      expect(formatted).toBe('42');
    });

    it('should format boolean literal true', () => {
      const literal = TsExprLiteral.create(TsLiteral.bool(true));
      const formatted = TsExpr.format(literal);

      expect(formatted).toBe('true');
    });

    it('should format boolean literal false', () => {
      const literal = TsExprLiteral.create(TsLiteral.bool(false));
      const formatted = TsExpr.format(literal);

      expect(formatted).toBe('false');
    });

    it('should format long number literal', () => {
      const longValue = (Number.MAX_SAFE_INTEGER + 1).toString();
      const literal = TsExprLiteral.create(TsLiteral.num(longValue));
      const formatted = TsExpr.format(literal);

      // Should append .0 for long values > Int.MaxValue
      expect(formatted).toBe(`${longValue}.0`);
    });
  });

  describe('format Call expressions', () => {
    it('should format call with no parameters', () => {
      const function_ = TsExprRef.create(TsQIdent.of(TsIdent.simple('func')));
      const call = TsExprCall.create(function_, IArray.Empty);
      const formatted = TsExpr.format(call);

      expect(formatted).toContain('func');
      expect(formatted).toContain('()');
    });

    it('should format call with parameters', () => {
      const function_ = TsExprRef.create(TsQIdent.of(TsIdent.simple('func')));
      const param1 = TsExprLiteral.create(TsLiteral.str('arg1'));
      const param2 = TsExprLiteral.create(TsLiteral.num('42'));
      const call = TsExprCall.create(function_, IArray.fromArray<TsExpr>([param1, param2]));
      const formatted = TsExpr.format(call);

      expect(formatted).toContain('func');
      expect(formatted).toContain('"arg1"');
      expect(formatted).toContain('42');
      expect(formatted).toContain(',');
    });
  });

  describe('format other expressions', () => {
    it('should format unary expression', () => {
      const expr = TsExprLiteral.create(TsLiteral.bool(true));
      const unary = TsExprUnary.create('!', expr);
      const formatted = TsExpr.format(unary);

      expect(formatted).toBe('!true');
    });

    it('should format binary operation', () => {
      const left = TsExprLiteral.create(TsLiteral.num('1'));
      const right = TsExprLiteral.create(TsLiteral.num('2'));
      const binaryOp = TsExprBinaryOp.create(left, '+', right);
      const formatted = TsExpr.format(binaryOp);

      expect(formatted).toBe('1 + 2');
    });

    it('should format cast expression', () => {
      const expr = TsExprLiteral.create(TsLiteral.num('42'));
      const cast = TsExprCast.create(expr, TsTypeRef.string);
      const formatted = TsExpr.format(cast);

      expect(formatted).toContain('42');
      expect(formatted).toContain('as');
      expect(formatted).toContain('string');
    });

    it('should format array expression', () => {
      const element = TsExprLiteral.create(TsLiteral.str('item'));
      const arrayOf = TsExprArrayOf.create(element);
      const formatted = TsExpr.format(arrayOf);

      expect(formatted).toBe('["item"]');
    });
  });
});

describe('TsExpr - Extractor Patterns', () => {
  describe('TsExpr.Num extractor', () => {
    it('should extract number from TsType', () => {
      const numLiteral = TsTypeLiteral.create(TsLiteral.num('42.5'));
      const extracted = TsExpr.Num.unapplyType(numLiteral);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(42.5);
    });

    it('should extract number from TsLiteral', () => {
      const numLiteral = TsLiteral.num('123.456');
      const extracted = TsExpr.Num.unapply(numLiteral);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(123.456);
    });

    it('should extract integer from TsLiteral', () => {
      const numLiteral = TsLiteral.num('42');
      const extracted = TsExpr.Num.unapply(numLiteral);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(42);
    });

    it('should fail to extract from non-numeric TsLiteral', () => {
      const stringLiteral = TsLiteral.str('not a number');
      const extracted = TsExpr.Num.unapply(stringLiteral);

      expect(extracted).toBeUndefined();
    });

    it('should fail to extract from invalid numeric string', () => {
      const invalidNum = TsLiteral.num('42abc');
      const extracted = TsExpr.Num.unapply(invalidNum);

      expect(extracted).toBeUndefined();
    });

    it('should fail to extract from non-TsTypeLiteral TsType', () => {
      const typeRef = TsTypeRef.string;
      const extracted = TsExpr.Num.unapplyType(typeRef);

      expect(extracted).toBeUndefined();
    });
  });

  describe('TsExpr.Num.Long extractor', () => {
    it('should extract Long from TsType', () => {
      const longLiteral = TsTypeLiteral.create(TsLiteral.num('123456789'));
      const extracted = TsExpr.Num.Long.unapplyType(longLiteral);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(123456789);
    });

    it('should extract Long from TsLiteral', () => {
      const longLiteral = TsLiteral.num('987654321');
      const extracted = TsExpr.Num.Long.unapply(longLiteral);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(987654321);
    });

    it('should fail to extract from decimal TsLiteral', () => {
      const decimalLiteral = TsLiteral.num('42.5');
      const extracted = TsExpr.Num.Long.unapply(decimalLiteral);

      expect(extracted).toBeUndefined();
    });

    it('should fail to extract from non-numeric TsLiteral', () => {
      const stringLiteral = TsLiteral.str('not a number');
      const extracted = TsExpr.Num.Long.unapply(stringLiteral);

      expect(extracted).toBeUndefined();
    });

    it('should fail to extract from non-TsTypeLiteral TsType', () => {
      const typeRef = TsTypeRef.number;
      const extracted = TsExpr.Num.Long.unapplyType(typeRef);

      expect(extracted).toBeUndefined();
    });

    it('should extract zero', () => {
      const zeroLit = TsLiteral.num('0');
      const extracted = TsExpr.Num.Long.unapply(zeroLit);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(0);
    });

    it('should extract large number', () => {
      const maxSafeLit = TsLiteral.num(Number.MAX_SAFE_INTEGER.toString());
      const extracted = TsExpr.Num.Long.unapply(maxSafeLit);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
});