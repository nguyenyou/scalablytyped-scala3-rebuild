/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.TypeParamsReferencedInTreeTests
 *
 * Comprehensive test suite for TypeParamsReferencedInTree functionality
 */

import { describe, test, expect } from 'bun:test';
import { TypeParamsReferencedInTree } from '@/internal/ts/TypeParamsReferencedInTree';
import {
  TsTree,
  TsIdent,
  TsIdentSimple,
  TsQIdent,
  TsTypeRef,
  TsTypeParam,
  TsDeclClass,
  TsDeclInterface,
  TsDeclModule,
  TsMember,
  TsMemberProperty,
  TsIdentModule,
  TsType
} from '@/internal/ts/trees';
import { IArray } from '@/internal/IArray';
import { Comments } from '@/internal/Comments';
import { CodePath } from '@/internal/ts/CodePath';
import { JsLocation } from '@/internal/ts/JsLocation';
import { Option, some, none } from 'fp-ts/Option';

describe("TypeParamsReferencedInTree Tests", () => {
  // Helper methods for creating test data
  function createSimpleIdent(name: string): TsIdentSimple {
    return TsIdent.simple(name);
  }

  function createQIdent(name: string): TsQIdent {
    return TsQIdent.of(createSimpleIdent(name));
  }

  function createTypeRef(name: string, tparams: IArray<TsType> = IArray.Empty): TsTypeRef {
    return TsTypeRef.create(Comments.empty(), createQIdent(name), tparams);
  }

  function createTypeParam(
    name: string,
    upperBound: Option<TsType> = none,
    defaultType: Option<TsType> = none
  ): TsTypeParam {
    return TsTypeParam.create(Comments.empty(), createSimpleIdent(name), upperBound, defaultType);
  }

  function createMemberProperty(name: string, tpe: TsType): TsMemberProperty {
    return {
      _tag: 'TsMemberProperty',
      comments: Comments.empty(),
      level: { _tag: 'TsProtectionLevelPublic' } as any,
      name: createSimpleIdent(name),
      tpe: some(tpe),
      expr: none,
      isStatic: false,
      isReadOnly: false,
      withComments: (cs: Comments) => createMemberProperty(name, tpe),
      addComment: (c: any) => createMemberProperty(name, tpe),
      asString: `TsMemberProperty(${name})`
    };
  }

  function createMockClass(
    name: string,
    tparams: IArray<TsTypeParam> = IArray.Empty,
    members: IArray<TsMember> = IArray.Empty
  ): TsDeclClass {
    return TsDeclClass.create(
      Comments.empty(),
      false, // declared
      false, // isAbstract
      createSimpleIdent(name),
      tparams,
      none, // parent
      IArray.Empty, // implementsInterfaces
      members,
      JsLocation.zero(),
      CodePath.noPath()
    );
  }

  function createMockInterface(
    name: string,
    tparams: IArray<TsTypeParam> = IArray.Empty,
    members: IArray<TsMember> = IArray.Empty
  ): TsDeclInterface {
    return TsDeclInterface.create(
      Comments.empty(),
      false, // declared
      createSimpleIdent(name),
      tparams,
      IArray.Empty, // inheritance
      members,
      CodePath.noPath()
    );
  }

  describe("Basic Functionality", () => {
    test("empty scope returns empty result", () => {
      const emptyScope = new Map<TsIdent, TsTypeParam>();
      const simpleClass = createMockClass("TestClass");

      const result = TypeParamsReferencedInTree.apply(emptyScope, simpleClass);

      expect(result.isEmpty).toBe(true);
    });

    test("no type parameter references returns empty result", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);
      const simpleClass = createMockClass("TestClass");

      const result = TypeParamsReferencedInTree.apply(scope, simpleClass);

      expect(result.isEmpty).toBe(true);
    });

    test("single type parameter reference", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      const typeRef = createTypeRef("T");
      const member = createMemberProperty("prop", typeRef);
      const classWithMember = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMember);

      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparam);
    });

    test("multiple type parameter references", () => {
      const tparamT = createTypeParam("T");
      const tparamU = createTypeParam("U");
      const scope = new Map<TsIdent, TsTypeParam>([
        [tparamT.name, tparamT],
        [tparamU.name, tparamU]
      ]);

      const typeRefT = createTypeRef("T");
      const typeRefU = createTypeRef("U");
      const memberT = createMemberProperty("propT", typeRefT);
      const memberU = createMemberProperty("propU", typeRefU);
      const classWithMembers = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(memberT, memberU));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMembers);

      expect(result.length).toBe(2);
      expect(result.contains(tparamT)).toBe(true);
      expect(result.contains(tparamU)).toBe(true);
    });

    test("type parameter not in scope is ignored", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      const typeRefU = createTypeRef("U"); // U is not in scope
      const member = createMemberProperty("prop", typeRefU);
      const classWithMember = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMember);

      expect(result.isEmpty).toBe(true);
    });
  });
});