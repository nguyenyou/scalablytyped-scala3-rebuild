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

describe('DeriveNonConflictingName - Multiple Members', () => {
  test('multiple properties sorted by name', () => {
    const prop1 = createMockProperty("zebra");
    const prop2 = createMockProperty("alpha");
    const prop3 = createMockProperty("beta");
    const members = IArray.fromArray<TsMember>([prop1, prop2, prop3]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    // Should be sorted: Alpha, Beta, Zebra
    expect(result).toBe("Alpha");
  });

  test('mixed member types', () => {
    const property = createMockProperty("name");
    const func = createMockFunction("getValue");
    const ctor = createMockCtor();
    const members = IArray.fromArray<TsMember>([property, func, ctor]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    // Should include constructor first, then sorted members
    expect(result).toBe("Instantiable");
  });

  test('prefix with single member', () => {
    const property = createMockProperty("value");
    const members = IArray.fromArray<TsMember>([property]);
    const result = DeriveNonConflictingName.apply("Test", members)(simpleTryCreate);
    expect(result).toBe("Test");
  });
});

describe('DeriveNonConflictingName - Conflict Resolution', () => {
  test('first choice conflicts, second succeeds', () => {
    const property = createMockProperty("name");
    const members = IArray.fromArray<TsMember>([property]);
    const conflicts = new Set(["Name"]);
    const result = DeriveNonConflictingName.apply("", members)(conflictingTryCreate(conflicts));
    // Should try longer version or different combination
    expect(result).not.toBe("Name");
    expect((result as string).length).toBeGreaterThan(0);
  });

  test('all variants conflict, fallback to numbered', () => {
    const property = createMockProperty("test");
    const members = IArray.fromArray<TsMember>([property]);
    const conflicts = new Set(["Test", "TestString", "0", "1", "2"]);
    const result = DeriveNonConflictingName.apply("", members)(conflictingTryCreate(conflicts));
    expect(result).toBe("3");
  });

  test('prefix conflicts resolved with members', () => {
    const property = createMockProperty("value");
    const members = IArray.fromArray<TsMember>([property]);
    const conflicts = new Set(["Test"]);
    const result = DeriveNonConflictingName.apply("Test", members)(conflictingTryCreate(conflicts));
    expect(result).toBe("TestValue");
  });
});

describe('DeriveNonConflictingName - Detail Class Functionality', () => {
  test('Detail.pretty formats names correctly', () => {
    expect(Detail.pretty("userName")).toBe("UserName");
    expect(Detail.pretty("user_name")).toBe("Username");
    expect(Detail.pretty("user123name")).toBe("User123name");
    expect(Detail.pretty("123invalid")).toBe("123invalid");
    expect(Detail.pretty("")).toBe("");
  });

  test('Detail.prettyType formats types correctly', () => {
    const stringType = TsTypeRef.string;
    const result = Detail.prettyType(stringType);
    expect(result).toBe("String");

    const voidType = TsTypeRef.void;
    const voidResult = Detail.prettyType(voidType);
    expect(voidResult).toBe("Void");
  });

  test('Detail.prettyType handles Option types', () => {
    const someType = some(TsTypeRef.string);
    const result = Detail.prettyTypeOpt(someType);
    expect(result._tag).toBe('Some');
    if (result._tag === 'Some') {
      expect(result.value).toContain("String");
    }

    const noneType = none;
    const noneResult = Detail.prettyTypeOpt(noneType);
    expect(noneResult._tag).toBe('None');
  });

  test('Detail pick method', () => {
    const detail = new Detail("Short", "LongVersion");
    expect(detail.pick(false)).toBe("Short");
    expect(detail.pick(true)).toBe("LongVersion");
  });

  test('Detail ordering', () => {
    const detail1 = new Detail("Alpha", "AlphaLong");
    const detail2 = new Detail("Beta", "BetaLong");
    const detail3 = new Detail("Alpha", "DifferentLong");

    const sorted = IArray.fromArray([detail2, detail1, detail3]).sorted(Detail.compare);
    expect(sorted.apply(0).short).toBe("Alpha");
    expect(sorted.apply(1).short).toBe("Alpha");
    expect(sorted.apply(2).short).toBe("Beta");
  });
});

describe('DeriveNonConflictingName - Edge Cases and Boundary Conditions', () => {
  test('empty property name', () => {
    const property = createMockProperty("");
    const members = IArray.fromArray<TsMember>([property]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    expect(result).toBe("");
  });

  test('property with None type', () => {
    const property = createMockProperty("test", none);
    const members = IArray.fromArray<TsMember>([property]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    expect(result).toBe("Test");
  });

  test('special characters in names', () => {
    const property = createMockProperty("user-name");
    const members = IArray.fromArray<TsMember>([property]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    expect(result).toBe("Username");
  });

  test('numeric names', () => {
    const property = createMockProperty("123");
    const members = IArray.fromArray<TsMember>([property]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    expect(result).toBe("123");
  });

  test('very long member names', () => {
    const longName = "a".repeat(100);
    const property = createMockProperty(longName);
    const members = IArray.fromArray<TsMember>([property]);
    const result = DeriveNonConflictingName.apply("", members)(simpleTryCreate);
    expect((result as string).length).toBe(100);
    expect((result as string).startsWith("A")).toBe(true);
  });

  test('many members with conflicts', () => {
    const properties = Array.from({length: 10}, (_, i) => createMockProperty(`prop${i + 1}`));
    const members = IArray.fromArray<TsMember>(properties);
    const conflicts = new Set(["Prop1", "Prop2", "Prop3"]);
    const result = DeriveNonConflictingName.apply("", members)(conflictingTryCreate(conflicts));
    expect((result as string).length).toBeGreaterThan(0);
    expect(conflicts.has(result as string)).toBe(false);
  });
});

describe('DeriveNonConflictingName - Fallback Mechanism', () => {
  test('fallback increments correctly', () => {
    const members = IArray.Empty;
    const conflicts = new Set(["Test0", "Test1", "Test2"]);
    const result = DeriveNonConflictingName.apply("Test", members)(conflictingTryCreate(conflicts));
    expect(result).toBe("Test3");
  });

  test('fallback with empty prefix', () => {
    const members = IArray.Empty;
    const conflicts = new Set(["0", "1", "2", "3", "4"]);
    const result = DeriveNonConflictingName.apply("", members)(conflictingTryCreate(conflicts));
    expect(result).toBe("5");
  });
});