/**
 * Tests for HasTParams.ts - TypeScript port of org.scalablytyped.converter.internal.ts.HasTParamsTests
 * Comprehensive test suite ported from Scala HasTParamsTests.scala to ensure behavioral parity
 */

import { describe, test, expect } from 'bun:test';
import { some, none } from 'fp-ts/Option';
import { IArray } from '@/internal/IArray.js';
import { Comments } from '@/internal/Comments.js';
import { CodePath } from '@/internal/ts/CodePath.js';
import { JsLocation } from '@/internal/ts/JsLocation.js';
import { TsProtectionLevel } from '@/internal/ts/TsProtectionLevel.js';
import { MethodType } from '@/internal/ts/MethodType.js';
import {
  HasTParams,
  extractTypeParams,
  matchTypeParams
} from '@/internal/ts/HasTParams.js';
import {
  TsTree,
  TsType,
  TsTypeParam,
  TsDeclClass,
  TsDeclInterface,
  TsDeclTypeAlias,
  TsDeclFunction,
  TsMemberFunction,
  TsMemberCall,
  TsMemberCtor,
  TsTypeFunction,
  TsFunSig,
  TsTypeConditional,
  TsTypeInfer,
  TsTypeExtends,
  TsTypeRef,
  TsTypeLiteral,
  TsIdent,
  TsIdentSimple,
  TsLiteral,
  TsMember,
  TsFunParam
} from '@/internal/ts/trees.js';

// ============================================================================
// Helper methods for creating test data
// ============================================================================

const createSimpleIdent = (name: string): TsIdentSimple => TsIdent.simple(name);

const createMockTypeParam = (
  name: string,
  upperBound?: TsType,
  defaultType?: TsType
): TsTypeParam =>
  TsTypeParam.create(
    Comments.empty(),
    createSimpleIdent(name),
    upperBound ? some(upperBound) : none,
    defaultType ? some(defaultType) : none
  );

const createMockClass = (
  name: string,
  tparams: IArray<TsTypeParam> = IArray.Empty
): TsDeclClass =>
  TsDeclClass.create(
    Comments.empty(),
    false, // declared
    false, // isAbstract
    createSimpleIdent(name),
    tparams,
    none, // parent
    IArray.Empty, // implements
    IArray.Empty, // members
    JsLocation.zero(),
    CodePath.noPath()
  );

const createMockInterface = (
  name: string,
  tparams: IArray<TsTypeParam> = IArray.Empty
): TsDeclInterface =>
  TsDeclInterface.create(
    Comments.empty(),
    false, // declared
    createSimpleIdent(name),
    tparams,
    IArray.Empty, // inheritance
    IArray.Empty, // members
    CodePath.noPath()
  );

const createMockTypeAlias = (
  name: string,
  tparams: IArray<TsTypeParam> = IArray.Empty
): TsDeclTypeAlias =>
  TsDeclTypeAlias.create(
    Comments.empty(),
    false, // declared
    createSimpleIdent(name),
    tparams,
    TsTypeRef.any,
    CodePath.noPath()
  );

const createMockFunSig = (
  tparams: IArray<TsTypeParam> = IArray.Empty
): TsFunSig =>
  TsFunSig.create(
    Comments.empty(),
    tparams,
    IArray.Empty, // params
    some(TsTypeRef.any) // resultType
  );

const createMockFunction = (
  name: string,
  tparams: IArray<TsTypeParam> = IArray.Empty
): TsDeclFunction =>
  TsDeclFunction.create(
    Comments.empty(),
    false, // declared
    createSimpleIdent(name),
    createMockFunSig(tparams),
    JsLocation.zero(),
    CodePath.noPath()
  );

const createMockMemberFunction = (
  name: string,
  tparams: IArray<TsTypeParam> = IArray.Empty
): TsMemberFunction =>
  TsMemberFunction.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    createSimpleIdent(name),
    MethodType.normal(),
    createMockFunSig(tparams),
    false, // isStatic
    false  // isReadOnly
  );

const createMockMemberCall = (
  tparams: IArray<TsTypeParam> = IArray.Empty
): TsMemberCall =>
  TsMemberCall.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    createMockFunSig(tparams)
  );

const createMockMemberCtor = (
  tparams: IArray<TsTypeParam> = IArray.Empty
): TsMemberCtor =>
  TsMemberCtor.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    createMockFunSig(tparams)
  );

const createMockTypeFunction = (
  tparams: IArray<TsTypeParam> = IArray.Empty
): TsTypeFunction =>
  TsTypeFunction.create(createMockFunSig(tparams));

const createMockTypeConditional = (
  withInfer: boolean = false
): TsTypeConditional => {
  const pred = withInfer
    ? TsTypeInfer.create(createMockTypeParam("R"))
    : TsTypeRef.any;

  return TsTypeConditional.create(
    pred,
    TsTypeRef.string,
    TsTypeRef.any
  );
};

// Create an unsupported tree type for testing default case
const createMockUnsupportedTree = (): TsTree => TsTypeRef.any;

describe('HasTParams Tests', () => {
  describe('HasTParams - apply method', () => {
    test('returns Empty when unapply returns None', () => {
      const unsupportedTree = createMockUnsupportedTree();
      const result = HasTParams.apply(unsupportedTree);

      expect(result.length).toBe(0);
      expect(result).toEqual(IArray.Empty);
    });

    test('returns tparams when unapply returns Some', () => {
      const tparam = createMockTypeParam("T");
      const mockClass = createMockClass("TestClass", IArray.apply(tparam));
      const result = HasTParams.apply(mockClass);

      expect(result.length).toBe(1);
      expect(result.get(0)).toBe(tparam);
    });

    test('returns Empty for empty tparams', () => {
      const mockClass = createMockClass("TestClass", IArray.Empty);
      const result = HasTParams.apply(mockClass);

      expect(result.length).toBe(0);
    });
  });

  describe('HasTParams - unapply method - Positive Cases', () => {
    test('TsDeclClass with type parameters', () => {
      const tparam1 = createMockTypeParam("T");
      const tparam2 = createMockTypeParam("U");
      const mockClass = createMockClass("TestClass", IArray.apply(tparam1, tparam2));
      const result = HasTParams.unapply(mockClass);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(2);
        expect(result.value.get(0)).toBe(tparam1);
        expect(result.value.get(1)).toBe(tparam2);
      }
    });

    test('TsDeclInterface with type parameters', () => {
      const tparam = createMockTypeParam("T");
      const mockInterface = createMockInterface("TestInterface", IArray.apply(tparam));
      const result = HasTParams.unapply(mockInterface);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(1);
        expect(result.value.get(0)).toBe(tparam);
      }
    });

    test('TsDeclTypeAlias with type parameters', () => {
      const tparam = createMockTypeParam("T");
      const mockTypeAlias = createMockTypeAlias("TestType", IArray.apply(tparam));
      const result = HasTParams.unapply(mockTypeAlias);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(1);
        expect(result.value.get(0)).toBe(tparam);
      }
    });

    test('TsDeclFunction with signature type parameters', () => {
      const tparam = createMockTypeParam("T");
      const mockFunction = createMockFunction("testFunc", IArray.apply(tparam));
      const result = HasTParams.unapply(mockFunction);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(1);
        expect(result.value.get(0)).toBe(tparam);
      }
    });

    test('TsMemberFunction with signature type parameters', () => {
      const tparam = createMockTypeParam("T");
      const mockMemberFunction = createMockMemberFunction("testMethod", IArray.apply(tparam));
      const result = HasTParams.unapply(mockMemberFunction);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(1);
        expect(result.value.get(0)).toBe(tparam);
      }
    });

    test('TsMemberCall with signature type parameters', () => {
      const tparam = createMockTypeParam("T");
      const mockMemberCall = createMockMemberCall(IArray.apply(tparam));
      const result = HasTParams.unapply(mockMemberCall);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(1);
        expect(result.value.get(0)).toBe(tparam);
      }
    });

    test('TsMemberCtor with signature type parameters', () => {
      const tparam = createMockTypeParam("T");
      const mockMemberCtor = createMockMemberCtor(IArray.apply(tparam));
      const result = HasTParams.unapply(mockMemberCtor);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(1);
        expect(result.value.get(0)).toBe(tparam);
      }
    });

    test('TsTypeFunction with signature type parameters', () => {
      const tparam = createMockTypeParam("T");
      const mockTypeFunction = createMockTypeFunction(IArray.apply(tparam));
      const result = HasTParams.unapply(mockTypeFunction);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(1);
        expect(result.value.get(0)).toBe(tparam);
      }
    });

    test('TsFunSig with type parameters', () => {
      const tparam = createMockTypeParam("T");
      const mockFunSig = createMockFunSig(IArray.apply(tparam));
      const result = HasTParams.unapply(mockFunSig);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(1);
        expect(result.value.get(0)).toBe(tparam);
      }
    });

    test('TsTypeConditional with TsTypeInfer', () => {
      const mockTypeConditional = createMockTypeConditional(true);
      const result = HasTParams.unapply(mockTypeConditional);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(1);
        expect(result.value.get(0).name.value).toBe("R");
      }
    });
  });

  describe('HasTParams - unapply method - Empty Cases', () => {
    test('TsDeclClass with empty type parameters', () => {
      const mockClass = createMockClass("TestClass", IArray.Empty);
      const result = HasTParams.unapply(mockClass);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(0);
      }
    });

    test('TsDeclInterface with empty type parameters', () => {
      const mockInterface = createMockInterface("TestInterface", IArray.Empty);
      const result = HasTParams.unapply(mockInterface);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(0);
      }
    });

    test('TsDeclTypeAlias with empty type parameters', () => {
      const mockTypeAlias = createMockTypeAlias("TestType", IArray.Empty);
      const result = HasTParams.unapply(mockTypeAlias);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(0);
      }
    });

    test('TsFunSig with empty type parameters', () => {
      const mockFunSig = createMockFunSig(IArray.Empty);
      const result = HasTParams.unapply(mockFunSig);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(0);
      }
    });
  });

  describe('HasTParams - unapply method - Negative Cases', () => {
    test('TsTypeConditional without TsTypeInfer', () => {
      const mockTypeConditional = createMockTypeConditional(false);
      const result = HasTParams.unapply(mockTypeConditional);

      expect(result._tag).toBe('None');
    });

    test('unsupported TsTree types return None', () => {
      const unsupportedTree = createMockUnsupportedTree();
      const result = HasTParams.unapply(unsupportedTree);

      expect(result._tag).toBe('None');
    });

    test('TsTypeRef returns None', () => {
      const typeRef = TsTypeRef.string;
      const result = HasTParams.unapply(typeRef);

      expect(result._tag).toBe('None');
    });

    test('TsTypeLiteral returns None', () => {
      const literal = TsTypeLiteral.create(TsLiteral.str("test"));
      const result = HasTParams.unapply(literal);

      expect(result._tag).toBe('None');
    });
  });

  describe('HasTParams - Edge Cases', () => {
    test('multiple type parameters with constraints', () => {
      const tparam1 = createMockTypeParam("T", TsTypeRef.string);
      const tparam2 = createMockTypeParam("U", undefined, TsTypeRef.number);
      const tparam3 = createMockTypeParam("V", TsTypeRef.any, TsTypeRef.boolean);

      const mockClass = createMockClass("TestClass", IArray.apply(tparam1, tparam2, tparam3));
      const result = HasTParams.unapply(mockClass);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(3);
        expect(result.value.get(0).upperBound._tag).toBe('Some');
        expect(result.value.get(1).default._tag).toBe('Some');
        expect(result.value.get(2).upperBound._tag).toBe('Some');
        expect(result.value.get(2).default._tag).toBe('Some');
      }
    });

    test('nested type parameters in complex conditional type', () => {
      // Create a more complex conditional type with nested structure
      const inferParam = createMockTypeParam("R");
      const nestedInfer = TsTypeInfer.create(inferParam);
      const complexPred = TsTypeExtends.create(TsTypeRef.any, nestedInfer);

      const complexConditional = TsTypeConditional.create(
        complexPred,
        TsTypeRef.string,
        TsTypeRef.any
      );

      const result = HasTParams.unapply(complexConditional);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(1);
        expect(result.value.get(0).name.value).toBe("R");
      }
    });

    test('large number of type parameters', () => {
      const tparams = Array.from({ length: 50 }, (_, i) => createMockTypeParam(`T${i + 1}`));
      const mockInterface = createMockInterface("TestInterface", IArray.fromArray(tparams));
      const result = HasTParams.unapply(mockInterface);

      expect(result._tag).toBe('Some');
      if (result._tag === 'Some') {
        expect(result.value.length).toBe(50);
        expect(result.value.get(0).name.value).toBe("T1");
        expect(result.value.get(49).name.value).toBe("T50");
      }
    });
  });

  describe('HasTParams - Complex Scenarios', () => {
    test('consistency between apply and unapply', () => {
      const tparam = createMockTypeParam("T");
      const mockClass = createMockClass("TestClass", IArray.apply(tparam));

      const applyResult = HasTParams.apply(mockClass);
      const unapplyResult = HasTParams.unapply(mockClass);

      expect(unapplyResult._tag).toBe('Some');
      if (unapplyResult._tag === 'Some') {
        expect(applyResult.length).toBe(unapplyResult.value.length);
        expect(applyResult.get(0)).toBe(unapplyResult.value.get(0));
      }
    });

    test('apply returns Empty for None unapply result', () => {
      const unsupportedTree = createMockUnsupportedTree();

      const applyResult = HasTParams.apply(unsupportedTree);
      const unapplyResult = HasTParams.unapply(unsupportedTree);

      expect(unapplyResult._tag).toBe('None');
      expect(applyResult.length).toBe(0);
      expect(applyResult).toEqual(IArray.Empty);
    });

    test('different tree types with same type parameters', () => {
      const tparam = createMockTypeParam("T");
      const tparams = IArray.apply(tparam);

      const mockClass = createMockClass("TestClass", tparams);
      const mockInterface = createMockInterface("TestInterface", tparams);
      const mockTypeAlias = createMockTypeAlias("TestType", tparams);

      const classResult = HasTParams.apply(mockClass);
      const interfaceResult = HasTParams.apply(mockInterface);
      const typeAliasResult = HasTParams.apply(mockTypeAlias);

      expect(classResult.length).toBe(interfaceResult.length);
      expect(interfaceResult.length).toBe(typeAliasResult.length);
      expect(classResult.length).toBe(1);
      expect(classResult.get(0)).toBe(tparam);
    });

    test('function-related trees with same signature', () => {
      const tparam = createMockTypeParam("T");
      const signature = createMockFunSig(IArray.apply(tparam));

      const mockFunction = createMockFunction("testFunc", IArray.apply(tparam));
      const mockMemberFunction = createMockMemberFunction("testMethod", IArray.apply(tparam));
      const mockMemberCall = createMockMemberCall(IArray.apply(tparam));
      const mockMemberCtor = createMockMemberCtor(IArray.apply(tparam));
      const mockTypeFunction = createMockTypeFunction(IArray.apply(tparam));

      const functionResult = HasTParams.apply(mockFunction);
      const memberFunctionResult = HasTParams.apply(mockMemberFunction);
      const memberCallResult = HasTParams.apply(mockMemberCall);
      const memberCtorResult = HasTParams.apply(mockMemberCtor);
      const typeFunctionResult = HasTParams.apply(mockTypeFunction);
      const sigResult = HasTParams.apply(signature);

      expect(functionResult.length).toBe(memberFunctionResult.length);
      expect(memberFunctionResult.length).toBe(memberCallResult.length);
      expect(memberCallResult.length).toBe(memberCtorResult.length);
      expect(memberCtorResult.length).toBe(typeFunctionResult.length);
      expect(typeFunctionResult.length).toBe(sigResult.length);
      expect(functionResult.length).toBe(1);
      expect(functionResult.get(0)).toBe(tparam);
    });

    test('type parameter names and constraints preservation', () => {
      const tparam = createMockTypeParam("CustomName", TsTypeRef.string, TsTypeRef.any);
      const mockClass = createMockClass("TestClass", IArray.apply(tparam));
      const result = HasTParams.apply(mockClass);

      expect(result.length).toBe(1);
      const retrievedParam = result.get(0);
      expect(retrievedParam.name.value).toBe("CustomName");
      expect(retrievedParam.upperBound._tag).toBe('Some');
      expect(retrievedParam.default._tag).toBe('Some');
      if (retrievedParam.upperBound._tag === 'Some') {
        expect(retrievedParam.upperBound.value.asString).toBe(TsTypeRef.string.asString);
      }
      if (retrievedParam.default._tag === 'Some') {
        expect(retrievedParam.default.value.asString).toBe(TsTypeRef.any.asString);
      }
    });
  });

  describe('HasTParams - Error Handling and Robustness', () => {
    test('handles empty conditional type predicate', () => {
      // Test with a conditional type that has an empty predicate structure
      const emptyConditional = TsTypeConditional.create(
        TsTypeRef.any,
        TsTypeRef.string,
        TsTypeRef.any
      );

      const result = HasTParams.unapply(emptyConditional);
      expect(result._tag).toBe('None');
    });

    test('maintains referential equality for same type parameters', () => {
      const tparam = createMockTypeParam("T");
      const mockClass = createMockClass("TestClass", IArray.apply(tparam));

      const result1 = HasTParams.apply(mockClass);
      const result2 = HasTParams.apply(mockClass);

      expect(result1.length).toBe(result2.length);
      expect(result1.get(0)).toBe(result2.get(0)); // Same reference
    });

    test('handles mixed empty and non-empty scenarios', () => {
      const emptyClass = createMockClass("EmptyClass", IArray.Empty);
      const nonEmptyClass = createMockClass("NonEmptyClass", IArray.apply(createMockTypeParam("T")));

      const emptyResult = HasTParams.apply(emptyClass);
      const nonEmptyResult = HasTParams.apply(nonEmptyClass);

      expect(emptyResult.length).toBe(0);
      expect(nonEmptyResult.length).toBe(1);
      expect(emptyResult.length).not.toBe(nonEmptyResult.length);
    });
  });

  describe('HasTParams - Convenience Functions', () => {
    test('extractTypeParams function works', () => {
      const tparam = createMockTypeParam("T");
      const mockClass = createMockClass("TestClass", IArray.apply(tparam));

      const result1 = HasTParams.apply(mockClass);
      const result2 = extractTypeParams(mockClass);

      expect(result1.length).toBe(result2.length);
      expect(result1.get(0)).toBe(result2.get(0));
    });

    test('matchTypeParams function works', () => {
      const tparam = createMockTypeParam("T");
      const mockClass = createMockClass("TestClass", IArray.apply(tparam));

      const result1 = HasTParams.unapply(mockClass);
      const result2 = matchTypeParams(mockClass);

      expect(result1._tag).toBe(result2._tag);
      if (result1._tag === 'Some' && result2._tag === 'Some') {
        expect(result1.value.length).toBe(result2.value.length);
        expect(result1.value.get(0)).toBe(result2.value.get(0));
      }
    });
  });
});