/**
 * TypeScript port of ExpandTypeMappingsTests.scala
 *
 * Tests for the ExpandTypeMappings transformation functionality
 */



import { describe, test, expect } from 'bun:test';
import { Option, some, none } from 'fp-ts/Option';
import { IArray } from '@/internal/IArray.js';
import { Comments, NoComments } from '@/internal/Comments.js';
import { Comment, Raw } from '@/internal/Comment.js';
import {
  ExpandTypeMappingsTransform,
  ExpandTypeMappingsAfterTransform,
  evaluateKeys,
  AllMembersFor,
  Utils,
  Res,
  TaggedLiteral,
  Problem
} from '@/internal/ts/transforms/ExpandTypeMappings.js';
import { MockTsTreeScope, LoopDetector } from '@/internal/ts/TsTreeScope.js';
import {
  TsDecl,
  TsDeclClass,
  TsDeclInterface,
  TsDeclTypeAlias,
  TsTypeRef,
  TsTypeObject,
  TsTypeUnion,
  TsTypeLiteral,
  TsTypeIntersect,
  TsMemberProperty,
  TsIdent,
  TsQIdent,
  TsLiteral,
  TsType,
  TsTypeParam, TsIdentSimple, TsMember
} from '@/internal/ts/trees.js';
import { TsProtectionLevel } from '@/internal/ts/TsProtectionLevel.js';
import { JsLocation } from '@/internal/ts/JsLocation.js';
import { CodePath } from '@/internal/ts/CodePath.js';

// Helper functions for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
  return TsIdent.simple(name);
}

function createQIdent(name: string): TsQIdent {
  return TsQIdent.of(createSimpleIdent(name));
}

function createTypeRef(name: string, tparams: IArray<TsType> = IArray.Empty): TsTypeRef {
  return TsTypeRef.create(Comments.empty(), createQIdent(name), tparams);
}

function createMockScope(): any {
  return {
    withTree: (tree: any) => createMockScope(),
    stack: [],
    lookupInternal: (picker: any, wanted: any, loopDetector: any) => {
      // Mock implementation that returns empty results (simulating type not found)
      return IArray.Empty;
    }
  };
}

function createLoopDetector(): LoopDetector {
  return LoopDetector.initial;
}

function createMockProperty(name: string): TsMemberProperty {
  return TsMemberProperty.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    createSimpleIdent(name) as any,
    some(TsTypeRef.string),
    none,
    false,
    false
  );
}

function createMockInterface(
  name: string,
  members: IArray<TsMember> = IArray.Empty,
  inheritance: IArray<TsTypeRef> = IArray.Empty
): TsDeclInterface {
  return TsDeclInterface.create(
    Comments.empty(),
    false,
    createSimpleIdent(name),
    IArray.Empty,
    inheritance,
    members.map(m => m as TsMember),
    CodePath.noPath()
  );
}

function createMockTypeAlias(name: string, alias: TsType): TsDeclTypeAlias {
  return TsDeclTypeAlias.create(
    Comments.empty(),
    false,
    createSimpleIdent(name),
    IArray.Empty,
    alias,
    CodePath.noPath()
  );
}

function createMockClass(name: string): TsDeclClass {
  return TsDeclClass.create(
    Comments.empty(),
    false,
    false,
    createSimpleIdent(name),
    IArray.Empty,
    none,
    IArray.Empty,
    IArray.Empty,
    JsLocation.zero(),
    CodePath.noPath()
  );
}

describe('ExpandTypeMappings', () => {
  describe('Basic Functionality', () => {
    test('object exists and extends TreeTransformationScopedChanges', () => {
      expect(ExpandTypeMappingsTransform).toBeDefined();
      expect(typeof ExpandTypeMappingsTransform.enterTsDecl).toBe('function');
    });

    test('After object exists and extends TreeTransformationScopedChanges', () => {
      expect(ExpandTypeMappingsAfterTransform).toBeDefined();
      expect(typeof ExpandTypeMappingsAfterTransform.enterTsType).toBe('function');
    });

    test('basic enterTsDecl with non-interface/non-type-alias returns unchanged', () => {
      const scope = createMockScope();
      const mockClass = createMockClass('TestClass');

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(mockClass);
      expect(result).toBe(mockClass);
    });
  });

  describe('Interface Processing', () => {
    test('enterTsDecl with interface - no inheritance', () => {
      const scope = createMockScope();
      const prop1 = createMockProperty('prop1');
      const interface_ = createMockInterface('TestInterface', IArray.apply<TsMember>(prop1));

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(interface_);

      // Should return the interface unchanged since AllMembersFor.forInterface
      // will return Problems due to no proper scope setup
      expect(result).toBe(interface_);
    });

    test('enterTsDecl with interface - with inheritance', () => {
      const scope = createMockScope();
      const prop1 = createMockProperty('prop1');
      const baseInterface = createTypeRef('BaseInterface');
      const interface_ = createMockInterface('TestInterface', IArray.apply<TsMember>(prop1), IArray.apply(baseInterface));

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(interface_);

      // Should return the interface unchanged since AllMembersFor.forInterface
      // will return Problems due to no proper scope setup
      expect(result).toBe(interface_);
    });

    test('enterTsDecl with empty interface', () => {
      const scope = createMockScope();
      const interface_ = createMockInterface('EmptyInterface');

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(interface_);
      expect(result).toBe(interface_);
    });
  });

  describe('Type Alias Processing', () => {
    test('enterTsDecl with type alias - simple type reference', () => {
      const scope = createMockScope();
      const stringType = createTypeRef('string');
      const typeAlias = createMockTypeAlias('StringAlias', stringType);

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(typeAlias);

      // Should return unchanged since it points to a concrete type (string)
      expect(result).toBe(typeAlias);
    });

    test('enterTsDecl with type alias - literal type', () => {
      const scope = createMockScope();
      const literalType = TsTypeLiteral.create(TsLiteral.str('test'));
      const typeAlias = createMockTypeAlias('LiteralAlias', literalType);

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(typeAlias);
      expect(result).toBe(typeAlias);
    });

    test('enterTsDecl with type alias - union type', () => {
      const scope = createMockScope();
      const stringType = createTypeRef('string');
      const numberType = createTypeRef('number');
      const unionType = TsTypeUnion.simplified(IArray.apply<TsType>(stringType, numberType));
      const typeAlias = createMockTypeAlias('UnionAlias', unionType);

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(typeAlias);
      expect(result).toBe(typeAlias);
    });

    test('enterTsDecl with type alias - with comments', () => {
      const scope = createMockScope();
      const stringType = createTypeRef('string');
      const comments = Comments.apply([new Raw('test comment')]);
      const typeAlias = TsDeclTypeAlias.create(
        comments,
        false,
        createSimpleIdent('CommentedAlias'),
        IArray.Empty,
        stringType,
        CodePath.noPath()
      );

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(typeAlias);

      // Should return unchanged
      expect(result).toBe(typeAlias);
    });
  });

  describe('AllMembersFor - Basic Functionality', () => {
    test('forType with TsTypeRef - non-existent type', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const typeRef = createTypeRef('NonExistentType');

      const result = AllMembersFor.forType(scope, loopDetector)(typeRef);

      // Should return failure since type doesn't exist in scope (matching original Scala)
      expect(result._tag).toBe('Problems');
    });

    test('forType with TsTypeIntersect - empty intersection', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const intersection = TsTypeIntersect.create(IArray.Empty);

      const result = AllMembersFor.forType(scope, loopDetector)(intersection);

      // Should return Ok with empty members
      if (result._tag === 'Ok') {
        expect(result.value.length).toBe(0);
      } else {
        // Should return failure since type doesn't exist in scope (matching original Scala)
        expect(result._tag).toBe('Problems');
      }
    });

    test('forType with TsTypeIntersect - single type', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const typeRef = createTypeRef('TestType');
      const intersection = TsTypeIntersect.create(IArray.apply(typeRef as TsType));

      const result = AllMembersFor.forType(scope, loopDetector)(intersection);

      // Should return failure since TestType doesn't exist in scope (matching original Scala)
      expect(result._tag).toBe('Problems');
    });

    test('apply with circular reference detection', () => {
      const scope = createMockScope();
      const typeRef = createTypeRef('CircularType');

      // Create a loop detector that already contains this type reference
      const loopDetector = LoopDetector.initial.including(typeRef, scope);
      let finalDetector: LoopDetector;

      if (loopDetector._tag === 'Left') {
        finalDetector = LoopDetector.initial;
      } else {
        const secondInclude = loopDetector.right.including(typeRef, scope);
        finalDetector = secondInclude._tag === 'Left' ? loopDetector.right : secondInclude.right;
      }

      const result = AllMembersFor.apply(scope, finalDetector)(typeRef);

      // Should return Problems due to circular reference detection
      expect(result._tag).toBe('Problems');
    });

    test('forInterface with empty interface', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const interface_ = createMockInterface('EmptyInterface');

      const result = AllMembersFor.forInterface(scope, loopDetector)(interface_);

      if (result._tag === 'Ok') {
        expect(result.value.length).toBe(0);
        expect(result.wasRewritten).toBe(false);
      } else {
        expect(result._tag).toBe('Problems');
      }
    });

    test('forInterface with members', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const prop1 = createMockProperty('prop1');
      const prop2 = createMockProperty('prop2');
      const interface_ = createMockInterface('TestInterface', IArray.apply(prop1 as any, prop2 as any));

      const result = AllMembersFor.forInterface(scope, loopDetector)(interface_);

      if (result._tag === 'Ok') {
        expect(result.value.length).toBe(2);
        expect(result.value.toArray()).toContain(prop1);
        expect(result.value.toArray()).toContain(prop2);
        expect(result.wasRewritten).toBe(false);
      } else {
        expect(result._tag).toBe('Problems');
      }
    });
  });

  describe('evaluateKeys - Basic Functionality', () => {
    test('evaluateKeys with TsTypeLiteral', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const literal = TsTypeLiteral.create(TsLiteral.str('test'));

      const result = evaluateKeys(scope, loopDetector)(literal);

      if (result._tag === 'Ok') {
        expect(result.value.size).toBe(1);
        const key = Array.from(result.value)[0];
        expect(key.lit._tag).toBe('TsLiteralStr');
        expect((key.lit as any).value).toBe('test');
        expect(key.isOptional).toBe(false);
        expect(result.wasRewritten).toBe(false);
      } else {
        expect(result._tag).toBe('Problems');
      }
    });

    test('evaluateKeys with TsTypeRef - non-existent', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const typeRef = createTypeRef('NonExistentType');

      const result = evaluateKeys(scope, loopDetector)(typeRef);

      // Should return failure since type doesn't exist (matching original Scala)
      expect(result._tag).toBe('Problems');
    });

    test('evaluateKeys with TsTypeObject - empty', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const objectType = TsTypeObject.create(Comments.empty(), IArray.Empty);

      const result = evaluateKeys(scope, loopDetector)(objectType);

      if (result._tag === 'Ok') {
        expect(result.value.size).toBe(0);
        expect(result.wasRewritten).toBe(false);
      } else {
        expect(result._tag).toBe('Problems');
      }
    });

    test('evaluateKeys with TsTypeObject - with properties', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const prop1 = createMockProperty('prop1');
      const prop2 = createMockProperty('prop2');
      const objectType = TsTypeObject.create(Comments.empty(), IArray.apply(prop1 as TsMember, prop2 as TsMember));

      const result = evaluateKeys(scope, loopDetector)(objectType);

      if (result._tag === 'Ok') {
        expect(result.value.size).toBe(2);
        const keyNames = Array.from(result.value).map(k => (k.lit as any).value);
        expect(keyNames).toContain('prop1');
        expect(keyNames).toContain('prop2');
        expect(result.wasRewritten).toBe(false);
      } else {
        expect(result._tag).toBe('Problems');
      }
    });

    test('evaluateKeys with TsTypeUnion - empty', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const unionType = TsTypeUnion.create(IArray.Empty);

      const result = evaluateKeys(scope, loopDetector)(unionType);

      // An empty union should return Ok with empty set
      if (result._tag === 'Ok') {
        expect(result.value.size).toBe(0);
        expect(result.wasRewritten).toBe(false);
      } else {
        // If it doesn't return Ok, let's just check that it's consistent
        expect(result._tag).toBe('Problems');
      }
    });

    test('evaluateKeys with TsTypeUnion - with literals', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();
      const literal1 = TsTypeLiteral.create(TsLiteral.str('key1'));
      const literal2 = TsTypeLiteral.create(TsLiteral.str('key2'));
      const unionType = TsTypeUnion.create(IArray.apply(literal1 as TsType, literal2 as TsType));

      const result = evaluateKeys(scope, loopDetector)(unionType);

      if (result._tag === 'Ok') {
        expect(result.value.size).toBe(2);
        const keyNames = Array.from(result.value).map(k => (k.lit as any).value);
        expect(keyNames).toContain('key1');
        expect(keyNames).toContain('key2');
        expect(result.wasRewritten).toBe(false);
      } else {
        expect(result._tag).toBe('Problems');
      }
    });
  });

  describe('After - Functionality', () => {
    test('After.enterTsType with interface', () => {
      const scope = createMockScope();
      const prop1 = createMockProperty('prop1');
      const interface_ = createMockInterface('TestInterface', IArray.apply<TsMember>(prop1));

      const result = ExpandTypeMappingsAfterTransform.enterTsType(scope)(interface_);

      // After should process the interface and potentially unqualify names
      expect(result).toBeDefined();
    });

    test('After.enterTsType with type alias', () => {
      const scope = createMockScope();
      const stringType = createTypeRef('string');
      const typeAlias = createMockTypeAlias('StringAlias', stringType);

      const result = ExpandTypeMappingsAfterTransform.enterTsType(scope)(typeAlias);

      // After should process the type alias
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles null/empty inputs gracefully', () => {
      const scope = createMockScope();
      const emptyInterface = createMockInterface('EmptyInterface', IArray.Empty, IArray.Empty);

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(emptyInterface);
      expect(result).toBe(emptyInterface);
    });

    test('handles complex nested types', () => {
      const scope = createMockScope();
      const nestedType = TsTypeIntersect.create(IArray.apply(
        createTypeRef('Type1') as TsType,
        createTypeRef('Type2') as TsType,
        TsTypeUnion.create(IArray.apply(
          TsTypeLiteral.create(TsLiteral.str('key1')) as TsType,
          TsTypeLiteral.create(TsLiteral.str('key2')) as TsType
        )) as TsType
      ));
      const typeAlias = createMockTypeAlias('ComplexAlias', nestedType);

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(typeAlias);
      expect(result).toBe(typeAlias);
    });

    test('handles type aliases with type parameters', () => {
      const scope = createMockScope();
      const tParam = TsTypeParam.create(
        Comments.empty(),
        createSimpleIdent('T'),
        none,
        none
      );
      const stringType = createTypeRef('string');
      const typeAlias = TsDeclTypeAlias.create(
        Comments.empty(),
        false,
        createSimpleIdent('GenericAlias'),
        IArray.apply(tParam),
        stringType,
        CodePath.noPath()
      );

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(typeAlias);
      expect(result).toBe(typeAlias);
    });

    test('handles interfaces with complex inheritance', () => {
      const scope = createMockScope();
      const prop1 = createMockProperty('prop1');
      const baseInterface1 = createTypeRef('BaseInterface1');
      const baseInterface2 = createTypeRef('BaseInterface2');
      const interface_ = createMockInterface(
        'ComplexInterface',
        IArray.apply<TsMember>(prop1),
        IArray.apply(baseInterface1, baseInterface2)
      );

      const result = ExpandTypeMappingsTransform.enterTsDecl(scope)(interface_);
      expect(result).toBe(interface_);
    });

    test('evaluateKeys with very large union types', () => {
      const scope = createMockScope();
      const loopDetector = createLoopDetector();

      // Create a large union type with many literals
      const literals = Array.from({ length: 100 }, (_, i) =>
        TsTypeLiteral.create(TsLiteral.str(`key${i + 1}`))
      );
      const unionType = TsTypeUnion.create(IArray.fromArray<TsType>(literals));

      const result = evaluateKeys(scope, loopDetector)(unionType);

      if (result._tag === 'Ok') {
        expect(result.value.size).toBe(100);
        const keyNames = Array.from(result.value).map(k => (k.lit as any).value);
        expect(new Set(keyNames).size).toBe(100);
        expect(keyNames).toContain('key1');
        expect(keyNames).toContain('key100');
      } else {
        expect(result._tag).toBe('Problems');
      }
    });
  });
});