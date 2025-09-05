/**
 * Tests for DeriveNonConflictingName - TypeScript port of org.scalablytyped.converter.internal.ts.DeriveNonConflictingName
 * Comprehensive test suite ported from Scala DeriveNonConflictingNameTests.scala to ensure behavioral parity
 */

import { describe, test, expect } from 'bun:test';
import { Option, some, none } from 'fp-ts/Option';
import { IArray } from '@/internal/IArray.ts';
import { Comments } from '@/internal/Comments.ts';
import { TsProtectionLevel } from '@/internal/ts/TsProtectionLevel.ts';
import { MethodType } from '@/internal/ts/MethodType.ts';
import {
  TsMember,
  TsMemberProperty,
  TsMemberFunction,
  TsMemberCall,
  TsMemberCtor,
  TsIdentSimple,
  TsIdent,
  TsType,
  TsTypeRef,
  TsFunSig,
  TsFunParam
} from '@/internal/ts/trees.ts';
import { DeriveNonConflictingName, Detail } from '@/internal/ts/DeriveNonConflictingName.ts';

// ============================================================================
// Helper methods for creating test data
// ============================================================================

function createSimpleIdent(name: string): TsIdentSimple {
  return TsIdent.simple(name);
}

function createMockProperty(name: string, tpe: Option<TsType> = some(TsTypeRef.string)): TsMemberProperty {
  return TsMemberProperty.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    createSimpleIdent(name),
    tpe,
    none, // expr
    false, // isStatic
    false  // isReadOnly
  );
}

function createMockFunction(name: string): TsMemberFunction {
  return TsMemberFunction.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    createSimpleIdent(name),
    MethodType.normal(),
    TsFunSig.create(
      Comments.empty(),
      IArray.Empty, // tparams
      IArray.Empty, // params
      some(TsTypeRef.void)
    ),
    false, // isStatic
    false  // isReadOnly
  );
}

function createMockCall(params: IArray<TsFunParam> = IArray.Empty): TsMemberCall {
  return TsMemberCall.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    TsFunSig.create(
      Comments.empty(),
      IArray.Empty, // tparams
      params,
      some(TsTypeRef.string)
    )
  );
}

function createParam(name: string): TsFunParam {
  return TsFunParam.create(
    Comments.empty(),
    createSimpleIdent(name),
    some(TsTypeRef.string)
  );
}

function createMockCtor(resultType: Option<TsType> = some(TsTypeRef.string)): TsMemberCtor {
  return TsMemberCtor.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    TsFunSig.create(
      Comments.empty(),
      IArray.Empty, // tparams
      IArray.Empty, // params
      resultType
    )
  );
}

// Simple tryCreate function that accepts any name
function simpleTryCreate(name: TsIdentSimple): Option<string> {
  return some(name.value);
}

// tryCreate function that simulates conflicts
function conflictingTryCreate(conflicts: Set<string>) {
  return (name: TsIdentSimple): Option<string> => {
    if (conflicts.has(name.value)) {
      return none;
    }
    return some(name.value);
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('DeriveNonConflictingName - Basic Functionality', () => {
  test('empty members with empty prefix', () => {
    const members = IArray.Empty;
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    expect(result).toBe("0");
  });

  test('empty members with meaningful prefix', () => {
    const members = IArray.Empty;
    const result = DeriveNonConflictingName.apply("Test", members)(simpleTryCreate);
    expect(result).toBe("Test0");
  });

  test('empty members with meaningless prefix Fn', () => {
    const members = IArray.Empty;
    const result = DeriveNonConflictingName.apply("Fn", members)(simpleTryCreate);
    expect(result).toBe("Fn0");
  });
});

describe('DeriveNonConflictingName - Single Member Types', () => {
  test('single property member', () => {
    const property = createMockProperty("userName");
    const members = IArray.fromArray<TsMember>([property]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    expect(result).toBe("UserName");
  });

  test('single function member', () => {
    const func = createMockFunction("getValue");
    const members = IArray.fromArray<TsMember>([func]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    expect(result).toBe("GetValue");
  });

  test('single constructor member', () => {
    const ctor = createMockCtor();
    const members = IArray.fromArray<TsMember>([ctor]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    expect(result).toBe("Instantiable");
  });

  test('single call member with parameters', () => {
    const param1 = createParam("firstName");
    const param2 = createParam("lastName");
    const call = createMockCall(IArray.apply(param1, param2));
    const members = IArray.fromArray<TsMember>([call]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    expect(result).toBe("Call");
  });

  test('single call member with parameters - long version', () => {
    const param1 = createParam("firstName");
    const param2 = createParam("lastName");
    const call = createMockCall(IArray.apply(param1, param2));
    const members = IArray.fromArray<TsMember>([call]);
    const conflicts = new Set(["Call"]);
    const result = DeriveNonConflictingName.apply("", members)(conflictingTryCreate(conflicts));
    expect(result).toBe("CallFirstNameLastName");
  });
});