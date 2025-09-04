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

describe('TsExpr - Type Inference', () => {
  describe('TsExpr.typeOf basic cases', () => {
    it('should return Default for Ref', () => {
      const ref = TsExprRef.create(TsQIdent.of(TsIdent.simple('myVar')));
      const inferredType = TsExpr.typeOf(ref);

      expect(inferredType._tag).toBe('TsTypeUnion');
      const unionType = inferredType as TsTypeUnion;
      expect(unionType.types.length).toBe(2);
    });

    it('should return TsTypeLiteral for Literal', () => {
      const stringLit = TsExprLiteral.create(TsLiteral.str('hello'));
      const inferredType = TsExpr.typeOf(stringLit);

      expect(inferredType._tag).toBe('TsTypeLiteral');
      const typeLit = inferredType as TsTypeLiteral;
      expect(typeLit.literal._tag).toBe('TsLiteralStr');
      expect((typeLit.literal as any).value).toBe('hello');
    });

    it('should return any for Call', () => {
      const function_ = TsExprRef.create(TsQIdent.of(TsIdent.simple('func')));
      const call = TsExprCall.create(function_, IArray.Empty);
      const inferredType = TsExpr.typeOf(call);

      expect(inferredType._tag).toBe('TsTypeRef');
      const typeRef = inferredType as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('any');
    });

    it('should return widened type for Unary', () => {
      const expr = TsExprLiteral.create(TsLiteral.str('hello'));
      const unary = TsExprUnary.create('!', expr);
      const inferredType = TsExpr.typeOf(unary);

      expect(inferredType._tag).toBe('TsTypeRef');
      const typeRef = inferredType as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('string');
    });

    it('should return target type for Cast', () => {
      const expr = TsExprLiteral.create(TsLiteral.num('42'));
      const cast = TsExprCast.create(expr, TsTypeRef.string);
      const inferredType = TsExpr.typeOf(cast);

      expect(inferredType._tag).toBe('TsTypeRef');
      const typeRef = inferredType as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('string');
    });

    it('should return Array type for ArrayOf', () => {
      const element = TsExprLiteral.create(TsLiteral.str('item'));
      const arrayOf = TsExprArrayOf.create(element);
      const inferredType = TsExpr.typeOf(arrayOf);

      expect(inferredType._tag).toBe('TsTypeRef');
      const typeRef = inferredType as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('Array');
      expect(typeRef.tparams.length).toBe(1);

      const elementType = typeRef.tparams.apply(0);
      expect(elementType._tag).toBe('TsTypeLiteral');
      const elementTypeLit = elementType as TsTypeLiteral;
      expect(elementTypeLit.literal._tag).toBe('TsLiteralStr');
      expect((elementTypeLit.literal as any).value).toBe('item');
    });
  });

  describe('TsExpr.typeOf binary operations', () => {
    it('should compute numeric addition', () => {
      const left = TsExprLiteral.create(TsLiteral.num('1'));
      const right = TsExprLiteral.create(TsLiteral.num('2'));
      const binaryOp = TsExprBinaryOp.create(left, '+', right);
      const inferredType = TsExpr.typeOf(binaryOp);

      expect(inferredType._tag).toBe('TsTypeLiteral');
      const typeLit = inferredType as TsTypeLiteral;
      expect(typeLit.literal._tag).toBe('TsLiteralNum');
      expect((typeLit.literal as any).value).toBe('3');
    });

    it('should compute numeric multiplication', () => {
      const left = TsExprLiteral.create(TsLiteral.num('3'));
      const right = TsExprLiteral.create(TsLiteral.num('4'));
      const binaryOp = TsExprBinaryOp.create(left, '*', right);
      const inferredType = TsExpr.typeOf(binaryOp);

      expect(inferredType._tag).toBe('TsTypeLiteral');
      const typeLit = inferredType as TsTypeLiteral;
      expect(typeLit.literal._tag).toBe('TsLiteralNum');
      expect((typeLit.literal as any).value).toBe('12');
    });

    it('should compute long left shift', () => {
      const left = TsExprLiteral.create(TsLiteral.num('8'));
      const right = TsExprLiteral.create(TsLiteral.num('2'));
      const binaryOp = TsExprBinaryOp.create(left, '<<', right);
      const inferredType = TsExpr.typeOf(binaryOp);

      expect(inferredType._tag).toBe('TsTypeLiteral');
      const typeLit = inferredType as TsTypeLiteral;
      expect(typeLit.literal._tag).toBe('TsLiteralNum');
      expect((typeLit.literal as any).value).toBe('32');
    });

    it('should compute long right shift', () => {
      const left = TsExprLiteral.create(TsLiteral.num('32'));
      const right = TsExprLiteral.create(TsLiteral.num('2'));
      const binaryOp = TsExprBinaryOp.create(left, '>>', right);
      const inferredType = TsExpr.typeOf(binaryOp);

      expect(inferredType._tag).toBe('TsTypeLiteral');
      const typeLit = inferredType as TsTypeLiteral;
      expect(typeLit.literal._tag).toBe('TsLiteralNum');
      expect((typeLit.literal as any).value).toBe('8');
    });

    it('should return widened type for non-numeric operation', () => {
      const left = TsExprLiteral.create(TsLiteral.str('hello'));
      const right = TsExprLiteral.create(TsLiteral.str('world'));
      const binaryOp = TsExprBinaryOp.create(left, '+', right);
      const inferredType = TsExpr.typeOf(binaryOp);

      expect(inferredType._tag).toBe('TsTypeRef');
      const typeRef = inferredType as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('string');
    });

    it('should return widened type for unsupported operation', () => {
      const left = TsExprLiteral.create(TsLiteral.num('1'));
      const right = TsExprLiteral.create(TsLiteral.num('2'));
      const binaryOp = TsExprBinaryOp.create(left, '-', right);
      const inferredType = TsExpr.typeOf(binaryOp);

      expect(inferredType._tag).toBe('TsTypeRef');
      const typeRef = inferredType as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('number');
    });
  });

  describe('TsExpr.typeOfOpt', () => {
    it('should return type for Some expression', () => {
      const expr = TsExprLiteral.create(TsLiteral.str('hello'));
      const inferredType = TsExpr.typeOfOpt({ _tag: 'Some', value: expr });

      expect(inferredType._tag).toBe('TsTypeLiteral');
      const typeLit = inferredType as TsTypeLiteral;
      expect(typeLit.literal._tag).toBe('TsLiteralStr');
      expect((typeLit.literal as any).value).toBe('hello');
    });

    it('should return Default for None', () => {
      const inferredType = TsExpr.typeOfOpt({ _tag: 'None' });

      expect(inferredType).toEqual(TsExpr.Default);
    });
  });

  describe('TsExpr.widen', () => {
    it('should widen string literal', () => {
      const stringLitType = TsTypeLiteral.create(TsLiteral.str('hello'));
      const widened = TsExpr.widen(stringLitType);

      expect(widened._tag).toBe('TsTypeRef');
      const typeRef = widened as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('string');
    });

    it('should widen number literal', () => {
      const numLitType = TsTypeLiteral.create(TsLiteral.num('42'));
      const widened = TsExpr.widen(numLitType);

      expect(widened._tag).toBe('TsTypeRef');
      const typeRef = widened as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('number');
    });

    it('should widen boolean literal', () => {
      const boolLitType = TsTypeLiteral.create(TsLiteral.bool(true));
      const widened = TsExpr.widen(boolLitType);

      expect(widened._tag).toBe('TsTypeRef');
      const typeRef = widened as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('boolean');
    });

    it('should keep string type ref as string', () => {
      const widened = TsExpr.widen(TsTypeRef.string);

      expect(widened._tag).toBe('TsTypeRef');
      const typeRef = widened as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('string');
    });

    it('should keep number type ref as number', () => {
      const widened = TsExpr.widen(TsTypeRef.number);

      expect(widened._tag).toBe('TsTypeRef');
      const typeRef = widened as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('number');
    });

    it('should return Default for other types', () => {
      const customType = TsTypeRef.create(Comments.empty(), TsQIdent.of(TsIdent.simple('CustomType')), IArray.Empty);
      const widened = TsExpr.widen(customType);

      expect(widened._tag).toBe('TsTypeUnion');
      const unionType = widened as TsTypeUnion;
      expect(unionType.types.length).toBe(2);
    });
  });

  describe('TsExpr.Default constant', () => {
    it('should be union of string and number', () => {
      expect(TsExpr.Default._tag).toBe('TsTypeUnion');
      const unionType = TsExpr.Default as TsTypeUnion;
      expect(unionType.types.length).toBe(2);

      const typeArray = unionType.types.toArray();
      const hasString = typeArray.some(t =>
        t._tag === 'TsTypeRef' &&
        (t as TsTypeRef).name.parts.apply(0).value === 'string'
      );
      const hasNumber = typeArray.some(t =>
        t._tag === 'TsTypeRef' &&
        (t as TsTypeRef).name.parts.apply(0).value === 'number'
      );

      expect(hasString).toBe(true);
      expect(hasNumber).toBe(true);
    });
  });
});

describe('TsExpr - Expression Transformation', () => {
  describe('TsExpr.visit', () => {
    it('should visit Ref expression', () => {
      const ref = TsExprRef.create(TsQIdent.of(TsIdent.simple('oldName')));
      const transformed = TsExpr.visit(ref, (expr) => {
        if (TsExpr.isRef(expr) && expr.value.parts.apply(0).value === 'oldName') {
          return TsExprRef.create(TsQIdent.of(TsIdent.simple('newName')));
        }
        return expr;
      });

      expect(TsExpr.isRef(transformed)).toBe(true);
      const refResult = transformed as TsExprRef;
      expect(refResult.value.parts.apply(0).value).toBe('newName');
    });

    it('should visit Literal expression', () => {
      const literal = TsExprLiteral.create(TsLiteral.str('old'));
      const transformed = TsExpr.visit(literal, (expr) => {
        if (TsExpr.isLiteral(expr)) {
          const litExpr = expr as TsExprLiteral;
          if (TsLiteral.isStr(litExpr.value) && (litExpr.value as any).value === 'old') {
            return TsExprLiteral.create(TsLiteral.str('new'));
          }
        }
        return expr;
      });

      expect(TsExpr.isLiteral(transformed)).toBe(true);
      const litResult = transformed as TsExprLiteral;
      expect(TsLiteral.isStr(litResult.value)).toBe(true);
      expect((litResult.value as any).value).toBe('new');
    });

    it('should visit Cast expression recursively', () => {
      const innerExpr = TsExprRef.create(TsQIdent.of(TsIdent.simple('oldName')));
      const cast = TsExprCast.create(innerExpr, TsTypeRef.string);
      const transformed = TsExpr.visit(cast, (expr) => {
        if (TsExpr.isRef(expr) && expr.value.parts.apply(0).value === 'oldName') {
          return TsExprRef.create(TsQIdent.of(TsIdent.simple('newName')));
        }
        return expr;
      });

      expect(TsExpr.isCast(transformed)).toBe(true);
      const castResult = transformed as TsExprCast;
      expect(TsExpr.isRef(castResult.expr)).toBe(true);
      const innerRef = castResult.expr as TsExprRef;
      expect(innerRef.value.parts.apply(0).value).toBe('newName');
    });

    it('should visit ArrayOf expression recursively', () => {
      const innerExpr = TsExprRef.create(TsQIdent.of(TsIdent.simple('oldName')));
      const arrayOf = TsExprArrayOf.create(innerExpr);
      const transformed = TsExpr.visit(arrayOf, (expr) => {
        if (TsExpr.isRef(expr) && expr.value.parts.apply(0).value === 'oldName') {
          return TsExprRef.create(TsQIdent.of(TsIdent.simple('newName')));
        }
        return expr;
      });

      expect(TsExpr.isArrayOf(transformed)).toBe(true);
      const arrayResult = transformed as TsExprArrayOf;
      expect(TsExpr.isRef(arrayResult.expr)).toBe(true);
      const innerRef = arrayResult.expr as TsExprRef;
      expect(innerRef.value.parts.apply(0).value).toBe('newName');
    });

    it('should visit Call expression recursively', () => {
      const function_ = TsExprRef.create(TsQIdent.of(TsIdent.simple('oldFunc')));
      const param = TsExprRef.create(TsQIdent.of(TsIdent.simple('oldParam')));
      const call = TsExprCall.create(function_, IArray.fromArray<TsExpr>([param]));
      const transformed = TsExpr.visit(call, (expr) => {
        if (TsExpr.isRef(expr)) {
          const refExpr = expr as TsExprRef;
          const oldValue = refExpr.value.parts.apply(0).value;
          if (oldValue.startsWith('old')) {
            const newValue = oldValue.replace('old', 'new');
            return TsExprRef.create(TsQIdent.of(TsIdent.simple(newValue)));
          }
        }
        return expr;
      });

      expect(TsExpr.isCall(transformed)).toBe(true);
      const callResult = transformed as TsExprCall;
      expect(TsExpr.isRef(callResult.function)).toBe(true);
      const funcRef = callResult.function as TsExprRef;
      expect(funcRef.value.parts.apply(0).value).toBe('newFunc');

      expect(callResult.params.length).toBe(1);
      expect(TsExpr.isRef(callResult.params.apply(0))).toBe(true);
      const paramRef = callResult.params.apply(0) as TsExprRef;
      expect(paramRef.value.parts.apply(0).value).toBe('newParam');
    });

    it('should visit Unary expression recursively', () => {
      const innerExpr = TsExprRef.create(TsQIdent.of(TsIdent.simple('oldName')));
      const unary = TsExprUnary.create('!', innerExpr);
      const transformed = TsExpr.visit(unary, (expr) => {
        if (TsExpr.isRef(expr) && expr.value.parts.apply(0).value === 'oldName') {
          return TsExprRef.create(TsQIdent.of(TsIdent.simple('newName')));
        }
        return expr;
      });

      expect(TsExpr.isUnary(transformed)).toBe(true);
      const unaryResult = transformed as TsExprUnary;
      expect(unaryResult.op).toBe('!');
      expect(TsExpr.isRef(unaryResult.expr)).toBe(true);
      const innerRef = unaryResult.expr as TsExprRef;
      expect(innerRef.value.parts.apply(0).value).toBe('newName');
    });

    it('should visit BinaryOp expression recursively', () => {
      const left = TsExprRef.create(TsQIdent.of(TsIdent.simple('oldLeft')));
      const right = TsExprRef.create(TsQIdent.of(TsIdent.simple('oldRight')));
      const binaryOp = TsExprBinaryOp.create(left, '+', right);
      const transformed = TsExpr.visit(binaryOp, (expr) => {
        if (TsExpr.isRef(expr)) {
          const refExpr = expr as TsExprRef;
          const oldValue = refExpr.value.parts.apply(0).value;
          if (oldValue.startsWith('old')) {
            const newValue = oldValue.replace('old', 'new');
            return TsExprRef.create(TsQIdent.of(TsIdent.simple(newValue)));
          }
        }
        return expr;
      });

      expect(TsExpr.isBinaryOp(transformed)).toBe(true);
      const binaryResult = transformed as TsExprBinaryOp;
      expect(binaryResult.op).toBe('+');

      expect(TsExpr.isRef(binaryResult.one)).toBe(true);
      const leftRef = binaryResult.one as TsExprRef;
      expect(leftRef.value.parts.apply(0).value).toBe('newLeft');

      expect(TsExpr.isRef(binaryResult.two)).toBe(true);
      const rightRef = binaryResult.two as TsExprRef;
      expect(rightRef.value.parts.apply(0).value).toBe('newRight');
    });
  });
});

describe('TsExpr - Edge Cases and Error Conditions', () => {
  describe('Complex nested expressions', () => {
    it('should format complex nested expressions', () => {
      const innerCall = TsExprCall.create(
        TsExprRef.create(TsQIdent.of(TsIdent.simple('innerFunc'))),
        IArray.fromArray<TsExpr>([TsExprLiteral.create(TsLiteral.str('arg'))])
      );
      const outerCall = TsExprCall.create(
        TsExprRef.create(TsQIdent.of(TsIdent.simple('outerFunc'))),
        IArray.fromArray<TsExpr>([innerCall])
      );
      const formatted = TsExpr.format(outerCall);

      expect(formatted).toContain('outerFunc');
      expect(formatted).toContain('innerFunc');
      expect(formatted).toContain('"arg"');
    });

    it('should infer types for deeply nested expressions', () => {
      const deeplyNested = TsExprArrayOf.create(
        TsExprCast.create(
          TsExprUnary.create('!', TsExprLiteral.create(TsLiteral.bool(true))),
          TsTypeRef.boolean
        )
      );
      const inferredType = TsExpr.typeOf(deeplyNested);

      expect(inferredType._tag).toBe('TsTypeRef');
      const typeRef = inferredType as TsTypeRef;
      expect(typeRef.name.parts.apply(0).value).toBe('Array');
      expect(typeRef.tparams.length).toBe(1);

      const elementType = typeRef.tparams.apply(0);
      expect(elementType._tag).toBe('TsTypeRef');
      const elementTypeRef = elementType as TsTypeRef;
      expect(elementTypeRef.name.parts.apply(0).value).toBe('boolean');
    });

    it('should handle identity transformation', () => {
      const expr = TsExprBinaryOp.create(
        TsExprLiteral.create(TsLiteral.num('1')),
        '+',
        TsExprLiteral.create(TsLiteral.num('2'))
      );
      const transformed = TsExpr.visit(expr, (e) => e);

      // Should be structurally equivalent
      expect(TsExpr.format(transformed)).toBe(TsExpr.format(expr));
      expect(transformed._tag).toBe(expr._tag);
    });
  });

  describe('Extractor edge cases', () => {
    it('should handle zero in Num extractor', () => {
      const zeroLit = TsLiteral.num('0');
      const extracted = TsExpr.Num.unapply(zeroLit);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(0);
    });

    it('should reject negative numbers in Num extractor', () => {
      const negativeLit = TsLiteral.num('-42');
      const extracted = TsExpr.Num.unapply(negativeLit);

      expect(extracted).toBeUndefined();
    });

    it('should handle decimal numbers in Num extractor', () => {
      const decimalLit = TsLiteral.num('3.14159');
      const extracted = TsExpr.Num.unapply(decimalLit);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(3.14159);
    });

    it('should handle zero in Num.Long extractor', () => {
      const zeroLit = TsLiteral.num('0');
      const extracted = TsExpr.Num.Long.unapply(zeroLit);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(0);
    });

    it('should handle max safe integer in Num.Long extractor', () => {
      const maxSafeLit = TsLiteral.num(Number.MAX_SAFE_INTEGER.toString());
      const extracted = TsExpr.Num.Long.unapply(maxSafeLit);

      expect(extracted).toBeDefined();
      expect(extracted).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
});

describe('TsExpr - Integration Tests', () => {
  describe('Complex expression scenarios', () => {
    it('should handle complex expression formatting and type inference', () => {
      const complexExpr = TsExprBinaryOp.create(
        TsExprCall.create(
          TsExprRef.create(TsQIdent.of(TsIdent.simple('Math'), TsIdent.simple('max'))),
          IArray.fromArray<TsExpr>([
            TsExprLiteral.create(TsLiteral.num('10')),
            TsExprLiteral.create(TsLiteral.num('20'))
          ])
        ),
        '+',
        TsExprCast.create(
          TsExprLiteral.create(TsLiteral.str('5')),
          TsTypeRef.number
        )
      );

      const formatted = TsExpr.format(complexExpr);
      expect(formatted).toContain('Math');
      expect(formatted).toContain('max');
      expect(formatted).toContain('10');
      expect(formatted).toContain('20');
      expect(formatted).toContain('"5"');
      expect(formatted).toContain('as');
      expect(formatted).toContain('+');

      const inferredType = TsExpr.typeOf(complexExpr);
      // Call returns any, so BinaryOp widens to any -> Default
      expect(inferredType._tag).toBe('TsTypeUnion');
    });

    it('should preserve structure in visit transformation', () => {
      const originalExpr = TsExprArrayOf.create(
        TsExprBinaryOp.create(
          TsExprRef.create(TsQIdent.of(TsIdent.simple('x'))),
          '*',
          TsExprLiteral.create(TsLiteral.num('2'))
        )
      );

      const transformed = TsExpr.visit(originalExpr, (expr) => {
        if (TsExpr.isLiteral(expr)) {
          const litExpr = expr as TsExprLiteral;
          if (TsLiteral.isNum(litExpr.value) && (litExpr.value as any).value === '2') {
            return TsExprLiteral.create(TsLiteral.num('3'));
          }
        }
        return expr;
      });

      expect(TsExpr.isArrayOf(transformed)).toBe(true);
      const arrayResult = transformed as TsExprArrayOf;
      expect(TsExpr.isBinaryOp(arrayResult.expr)).toBe(true);
      const binaryResult = arrayResult.expr as TsExprBinaryOp;
      expect(binaryResult.op).toBe('*');
      expect(TsExpr.isLiteral(binaryResult.two)).toBe(true);
      const litResult = binaryResult.two as TsExprLiteral;
      expect(TsLiteral.isNum(litResult.value)).toBe(true);
      expect((litResult.value as any).value).toBe('3');
    });

    it('should handle all expression types in a single complex transformation', () => {
      // Create a complex expression that uses all expression types
      const complexExpr = TsExprArrayOf.create(
        TsExprCast.create(
          TsExprBinaryOp.create(
            TsExprUnary.create('!', TsExprLiteral.create(TsLiteral.bool(false))),
            '&&',
            TsExprCall.create(
              TsExprRef.create(TsQIdent.of(TsIdent.simple('test'))),
              IArray.fromArray<TsExpr>([TsExprLiteral.create(TsLiteral.str('param'))])
            )
          ),
          TsTypeRef.boolean
        )
      );

      // Transform all string literals
      const transformed = TsExpr.visit(complexExpr, (expr) => {
        if (TsExpr.isLiteral(expr)) {
          const litExpr = expr as TsExprLiteral;
          if (TsLiteral.isStr(litExpr.value)) {
            const strValue = (litExpr.value as any).value;
            return TsExprLiteral.create(TsLiteral.str(`transformed_${strValue}`));
          }
        }
        return expr;
      });

      const formatted = TsExpr.format(transformed);
      expect(formatted).toContain('transformed_param');
      expect(formatted).not.toContain('"param"');

      // Verify structure is preserved
      expect(TsExpr.isArrayOf(transformed)).toBe(true);
      const arrayResult = transformed as TsExprArrayOf;
      expect(TsExpr.isCast(arrayResult.expr)).toBe(true);
    });
  });
});