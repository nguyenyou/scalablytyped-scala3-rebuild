/**
 * Tests for FollowAliases.ts - TypeScript port of org.scalablytyped.converter.internal.ts.FollowAliasesTests
 */

import { describe, it, expect } from 'bun:test';
import { some, none } from 'fp-ts/Option';
import { IArray } from '@/internal/IArray.ts';
import { Comments } from '@/internal/Comments.ts';
import { CodePath } from '@/internal/ts/CodePath.ts';
import {
  TsIdent,
  TsIdentSimple,
  TsQIdent,
  TsTypeRef,
  TsTypeUnion,
  TsTypeIntersect,
  TsDeclTypeAlias,
  TsDeclInterface,
  TsMemberProperty,
  TsParsedFile,
  TsType,
  TsMember
} from '@/internal/ts/trees.ts';
import { TsProtectionLevel } from '@/internal/ts/TsProtectionLevel.ts';
import { TsTreeScope } from '@/internal/ts/TsTreeScope.ts';
import { FollowAliases } from '@/internal/ts/FollowAliases.ts';
import { Logger } from '@/internal/logging/index.ts';

// ============================================================================
// Helper methods for creating test data
// ============================================================================

function createSimpleIdent(name: string): TsIdentSimple {
  return TsIdent.simple(name);
}

function createQIdent(name: string): TsQIdent {
  return TsQIdent.of(createSimpleIdent(name));
}

function createMockTypeAlias(
  name: string,
  alias: TsType,
  tparams: IArray<any> = IArray.Empty,
  declared: boolean = false,
  comments: Comments = Comments.empty(),
  codePath: CodePath = CodePath.noPath()
): TsDeclTypeAlias {
  return {
    _tag: 'TsDeclTypeAlias',
    comments,
    declared,
    name: createSimpleIdent(name),
    tparams,
    alias,
    codePath,
    withCodePath: (newCodePath: CodePath) => createMockTypeAlias(name, alias, tparams, declared, comments, newCodePath),
    withName: (newName: TsIdentSimple) => createMockTypeAlias(newName.value, alias, tparams, declared, comments, codePath),
    withComments: (newComments: Comments) => createMockTypeAlias(name, alias, tparams, declared, newComments, codePath),
    addComment: (comment: any) => createMockTypeAlias(name, alias, tparams, declared, comments.add(comment), codePath),
    asString: `TsDeclTypeAlias(${name})`
  };
}

function createMockInterface(
  name: string,
  inheritance: IArray<TsTypeRef> = IArray.Empty,
  members: IArray<TsMember> = IArray.Empty,
  tparams: IArray<any> = IArray.Empty,
  declared: boolean = false,
  comments: Comments = Comments.empty(),
  codePath: CodePath = CodePath.noPath()
): TsDeclInterface {
  return {
    _tag: 'TsDeclInterface',
    comments,
    declared,
    name: createSimpleIdent(name),
    tparams,
    inheritance,
    members,
    codePath,
    membersByName: new Map(),
    unnamed: IArray.Empty,
    withCodePath: (newCodePath: CodePath) => createMockInterface(name, inheritance, members, tparams, declared, comments, newCodePath),
    withName: (newName: TsIdentSimple) => createMockInterface(newName.value, inheritance, members, tparams, declared, comments, codePath),
    withComments: (newComments: Comments) => createMockInterface(name, inheritance, members, tparams, declared, newComments, codePath),
    addComment: (comment: any) => createMockInterface(name, inheritance, members, tparams, declared, comments.add(comment), codePath),
    asString: `TsDeclInterface(${name})`
  };
}

function createMockScope(...declarations: any[]): TsTreeScope {
  // Create a simplified mock scope for testing
  // This is a minimal implementation that provides the necessary methods for FollowAliases
  const mockScope: any = {
    lookupType: (name: any, skipValidation: boolean = false) => {
      // Check if this is a primitive type - if so, return empty (primitives are not looked up)
      if (name && name.parts && name.parts.length === 1) {
        const nameStr = name.parts.apply(0).value;
        const primitiveTypes = ['any', 'boolean', 'number', 'string', 'symbol', 'object', 'undefined', 'null', 'void', 'never', 'unknown', 'bigint'];
        if (primitiveTypes.includes(nameStr)) {
          return IArray.Empty;
        }

        // Find declaration by name
        const found = declarations.find(decl =>
          decl.name && decl.name.value === nameStr
        );
        return found ? IArray.fromArray([found]) : IArray.Empty;
      }

      return IArray.Empty;
    },

    lookupTypeIncludeScope: (name: any) => {
      // Check if this is a primitive type - if so, return empty (primitives are not looked up)
      if (name && name.parts && name.parts.length === 1) {
        const nameStr = name.parts.apply(0).value;
        const primitiveTypes = ['any', 'boolean', 'number', 'string', 'symbol', 'object', 'undefined', 'null', 'void', 'never', 'unknown', 'bigint'];
        if (primitiveTypes.includes(nameStr)) {
          return IArray.Empty;
        }

        // Find declaration by name and return with scope
        const found = declarations.find(decl =>
          decl.name && decl.name.value === nameStr
        );
        return found ? IArray.fromArray([[found, mockScope]]) : IArray.Empty;
      }

      return IArray.Empty;
    },

    logger: Logger.DevNull()
  };

  return mockScope as TsTreeScope;
}

// ============================================================================
// Test Cases
// ============================================================================

describe('FollowAliases', () => {
  describe('basic functionality', () => {
    it('returns original type when no alias found', () => {
      const scope = createMockScope();
      const typeRef = TsTypeRef.create(Comments.empty(), createQIdent('UnknownType'), IArray.Empty);

      const result = FollowAliases.apply(scope)(typeRef);

      expect(result).toBe(typeRef);
    });

    it('follows simple type alias', () => {
      const alias = createMockTypeAlias('StringAlias', TsTypeRef.string);
      const scope = createMockScope(alias);
      const typeRef = TsTypeRef.create(Comments.empty(), createQIdent('StringAlias'), IArray.Empty);

      const result = FollowAliases.apply(scope)(typeRef);

      expect(result._tag).toBe('TsTypeRef');
      expect((result as TsTypeRef).name.parts.apply(0).value).toBe('string');
    });

    it('follows nested type alias', () => {
      const innerAlias = createMockTypeAlias('InnerAlias', TsTypeRef.number);
      const outerAlias = createMockTypeAlias('OuterAlias', TsTypeRef.create(Comments.empty(), createQIdent('InnerAlias'), IArray.Empty));
      const scope = createMockScope(innerAlias, outerAlias);
      const typeRef = TsTypeRef.create(Comments.empty(), createQIdent('OuterAlias'), IArray.Empty);

      const result = FollowAliases.apply(scope)(typeRef);

      expect(result._tag).toBe('TsTypeRef');
      expect((result as TsTypeRef).name.parts.apply(0).value).toBe('number');
    });

    it('follows thin interface', () => {
      const thinInterface = createMockInterface('ThinInterface', IArray.Empty, IArray.Empty);
      const scope = createMockScope(thinInterface);
      const typeRef = TsTypeRef.create(Comments.empty(), createQIdent('ThinInterface'), IArray.Empty);

      const result = FollowAliases.apply(scope)(typeRef);

      // Should return the interface as a type reference since it's thin
      expect(result._tag).toBe('TsTypeRef');
    });

    it('does not follow thick interface', () => {
      const property: TsMemberProperty = {
        _tag: 'TsMemberProperty',
        comments: Comments.empty(),
        level: TsProtectionLevel.default(),
        name: createSimpleIdent('prop'),
        tpe: some(TsTypeRef.string),
        expr: none,
        isStatic: false,
        isReadOnly: false,
        withComments: (newComments: Comments) => ({ ...property, comments: newComments } as TsMemberProperty),
        addComment: (comment: any) => ({ ...property, comments: property.comments.add(comment) } as TsMemberProperty),
        asString: 'TsMemberProperty(prop)'
      };
      const thickInterface = createMockInterface('ThickInterface', IArray.Empty, IArray.fromArray<TsMember>([property as TsMember]));
      const scope = createMockScope(thickInterface);
      const typeRef = TsTypeRef.create(Comments.empty(), createQIdent('ThickInterface'), IArray.Empty);

      const result = FollowAliases.apply(scope)(typeRef);

      // Should return original type since interface is not thin
      expect(result).toBe(typeRef);
    });
  });

  describe('union and intersection types', () => {
    it('follows aliases in union types', () => {
      const alias1 = createMockTypeAlias('Alias1', TsTypeRef.string);
      const alias2 = createMockTypeAlias('Alias2', TsTypeRef.number);
      const scope = createMockScope(alias1, alias2);

      const unionType = TsTypeUnion.create(IArray.fromArray<TsType>([
        TsTypeRef.create(Comments.empty(), createQIdent('Alias1'), IArray.Empty) as TsType,
        TsTypeRef.create(Comments.empty(), createQIdent('Alias2'), IArray.Empty) as TsType
      ]));

      const result = FollowAliases.apply(scope)(unionType);

      expect(result._tag).toBe('TsTypeUnion');
      const resultUnion = result as any;
      const types = resultUnion.types.toArray();
      expect(types.some((t: TsType) => t._tag === 'TsTypeRef' && (t as TsTypeRef).name.parts.apply(0).value === 'string')).toBe(true);
      expect(types.some((t: TsType) => t._tag === 'TsTypeRef' && (t as TsTypeRef).name.parts.apply(0).value === 'number')).toBe(true);
    });

    it('follows aliases in intersection types', () => {
      const alias1 = createMockTypeAlias('Alias1', TsTypeRef.string);
      const alias2 = createMockTypeAlias('Alias2', TsTypeRef.number);
      const scope = createMockScope(alias1, alias2);

      const intersectionType = TsTypeIntersect.create(IArray.fromArray<TsType>([
        TsTypeRef.create(Comments.empty(), createQIdent('Alias1'), IArray.Empty) as TsType,
        TsTypeRef.create(Comments.empty(), createQIdent('Alias2'), IArray.Empty) as TsType
      ]));

      const result = FollowAliases.apply(scope)(intersectionType);

      expect(result._tag).toBe('TsTypeIntersect');
      const resultIntersection = result as any;
      const types = resultIntersection.types.toArray();
      expect(types.some((t: TsType) => t._tag === 'TsTypeRef' && (t as TsTypeRef).name.parts.apply(0).value === 'string')).toBe(true);
      expect(types.some((t: TsType) => t._tag === 'TsTypeRef' && (t as TsTypeRef).name.parts.apply(0).value === 'number')).toBe(true);
    });
  });

  describe('typeRef method', () => {
    it('typeRef returns TsTypeRef for simple alias', () => {
      const alias = createMockTypeAlias('StringAlias', TsTypeRef.string);
      const scope = createMockScope(alias);
      const typeRef = TsTypeRef.create(Comments.empty(), createQIdent('StringAlias'), IArray.Empty);

      const result = FollowAliases.typeRef(scope)(typeRef);

      expect(result._tag).toBe('TsTypeRef');
      expect((result as TsTypeRef).name.parts.apply(0).value).toBe('string');
    });

    it('typeRef returns original for unknown type', () => {
      const scope = createMockScope();
      const typeRef = TsTypeRef.create(Comments.empty(), createQIdent('UnknownType'), IArray.Empty);

      const result = FollowAliases.typeRef(scope)(typeRef);

      expect(result).toBe(typeRef);
    });
  });
});