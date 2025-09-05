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
  TsDeclTypeAlias,
  TsMember,
  TsMemberProperty,
  TsIdentModule,
  TsType,
  TsFunSig,
  TsFunParam,
  TsMemberFunction, TsContainerOrDecl
} from '@/internal/ts/trees';
import { MethodType } from '@/internal/ts/MethodType';
import { TsProtectionLevel } from '@/internal/ts/TsProtectionLevel';
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

  function createTypeRefAsType(name: string, tparams: IArray<TsType> = IArray.Empty): TsType {
    return TsTypeRef.create(Comments.empty(), createQIdent(name), tparams) as TsType;
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

  describe("Upper Bounds Handling", () => {
    test("type parameter with upper bound referencing another type parameter", () => {
      const tparamT = createTypeParam("T");
      const tparamU = createTypeParam("U", some(createTypeRef("T")));
      const scope = new Map<TsIdent, TsTypeParam>([
        [tparamT.name, tparamT],
        [tparamU.name, tparamU]
      ]);

      const typeRefU = createTypeRef("U");
      const member = createMemberProperty("prop", typeRefU);
      const classWithMember = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMember);

      // Should include both U (directly referenced) and T (referenced in U's bound)
      expect(result.length).toBe(2);
      expect(result.contains(tparamT)).toBe(true);
      expect(result.contains(tparamU)).toBe(true);
    });

    test("type parameter with upper bound not referencing type parameters", () => {
      const tparamT = createTypeParam("T", some(createTypeRef("string")));
      const scope = new Map<TsIdent, TsTypeParam>([[tparamT.name, tparamT]]);

      const typeRefT = createTypeRef("T");
      const member = createMemberProperty("prop", typeRefT);
      const classWithMember = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMember);

      // Should only include T, not string (which is not a type parameter)
      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparamT);
    });

    test("chained type parameter bounds", () => {
      const tparamT = createTypeParam("T");
      const tparamU = createTypeParam("U", some(createTypeRef("T")));
      const tparamV = createTypeParam("V", some(createTypeRef("U")));
      const scope = new Map<TsIdent, TsTypeParam>([
        [tparamT.name, tparamT],
        [tparamU.name, tparamU],
        [tparamV.name, tparamV]
      ]);

      const typeRefV = createTypeRef("V");
      const member = createMemberProperty("prop", typeRefV);
      const classWithMember = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMember);

      // Based on the actual implementation, it only looks at direct bounds, not recursive bounds
      // Should include V (directly referenced) and U (in V's bound), but not T (in U's bound)
      expect(result.length).toBe(2);
      expect(result.contains(tparamU)).toBe(true);
      expect(result.contains(tparamV)).toBe(true);
      // T is not included because the algorithm doesn't recursively traverse bounds
      expect(result.contains(tparamT)).toBe(false);
    });

    test("type parameter with bound referencing non-existent type parameter", () => {
      const tparamT = createTypeParam("T", some(createTypeRef("NonExistent")));
      const scope = new Map<TsIdent, TsTypeParam>([[tparamT.name, tparamT]]);

      const typeRefT = createTypeRef("T");
      const member = createMemberProperty("prop", typeRefT);
      const classWithMember = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMember);

      // Should only include T, not NonExistent (which is not in scope)
      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparamT);
    });
  });

  describe("Scope Shadowing", () => {
    test("inner scope shadows outer type parameter", () => {
      const outerTparam = createTypeParam("T");
      const innerTparam = createTypeParam("T"); // Same name, different instance
      const scope = new Map<TsIdent, TsTypeParam>([[outerTparam.name, outerTparam]]);

      const typeRef = createTypeRef("T");
      const member = createMemberProperty("prop", typeRef);
      const innerClass = createMockClass("InnerClass", IArray.apply(innerTparam), IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, innerClass);

      // The inner T should shadow the outer T, so no type parameters from scope should be referenced
      expect(result.isEmpty).toBe(true);
    });

    test("type parameter reference in nested structure", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      const typeRef = createTypeRef("T");
      const member = createMemberProperty("prop", typeRef);
      const innerClass = createMockClass("InnerClass", IArray.Empty, IArray.apply<TsMember>(member));

      // Create a module that contains the inner class
      const module = TsDeclModule.create(
        Comments.empty(),
        false, // declared
        TsIdentModule.simple("TestModule"),
        IArray.apply<TsContainerOrDecl>(innerClass),
        CodePath.noPath(),
        JsLocation.zero()
      );

      const result = TypeParamsReferencedInTree.apply(scope, module);

      // Should find T referenced in the nested structure
      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparam);
    });

    test("multiple scopes with different type parameters", () => {
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

      // Inner class has its own T parameter, which should shadow the outer T
      const innerTparam = createTypeParam("T");
      const innerClass = createMockClass("InnerClass", IArray.apply(innerTparam), IArray.apply<TsMember>(memberT, memberU));

      const result = TypeParamsReferencedInTree.apply(scope, innerClass);

      // Should only find U (T is shadowed by inner class's T parameter)
      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparamU);
    });
  });

  describe("Different Tree Types", () => {
    test("type parameter reference in interface", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      const typeRef = createTypeRef("T");
      const member = createMemberProperty("prop", typeRef);
      const interfaceMock = createMockInterface("TestInterface", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, interfaceMock);

      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparam);
    });

    test("type parameter reference in function signature", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      const typeRef = createTypeRef("T");
      const funSig = TsFunSig.create(
        Comments.empty(),
        IArray.Empty, // tparams
        IArray.Empty, // params
        some(typeRef) // resultType
      );

      const result = TypeParamsReferencedInTree.apply(scope, funSig);

      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparam);
    });

    test("type parameter reference in type alias", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      const typeRef = createTypeRef("T");
      const typeAlias = TsDeclTypeAlias.create(
        Comments.empty(),
        false, // declared
        createSimpleIdent("MyAlias"),
        IArray.Empty, // tparams
        typeRef, // alias
        CodePath.noPath()
      );

      const result = TypeParamsReferencedInTree.apply(scope, typeAlias);

      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparam);
    });
  });

  describe("Edge Cases and Error Conditions", () => {
    test("qualified type reference with multiple parts", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      // Create a qualified type reference like "SomeNamespace.T"
      const qualifiedTypeRef = TsTypeRef.create(
        Comments.empty(),
        TsQIdent.of(createSimpleIdent("SomeNamespace"), createSimpleIdent("T")),
        IArray.Empty
      );
      const member = createMemberProperty("prop", qualifiedTypeRef);
      const classWithMember = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMember);

      // Should not find T because it's qualified (not a simple reference)
      expect(result.isEmpty).toBe(true);
    });

    test("type parameter with generic type arguments", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      // Create a type reference like "Array<T>"
      const arrayTypeRef = createTypeRef("Array", IArray.apply(createTypeRefAsType("T")));
      const member = createMemberProperty("prop", arrayTypeRef);
      const classWithMember = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMember);

      // Should find T in the type arguments
      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparam);
    });

    test("duplicate type parameter references", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      const typeRef1 = createTypeRef("T");
      const typeRef2 = createTypeRef("T");
      const member1 = createMemberProperty("prop1", typeRef1);
      const member2 = createMemberProperty("prop2", typeRef2);
      const classWithMembers = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member1, member2));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMembers);

      // Should only return T once (distinct)
      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparam);
    });

    test("empty tree", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      const emptyClass = createMockClass("EmptyClass");

      const result = TypeParamsReferencedInTree.apply(scope, emptyClass);

      expect(result.isEmpty).toBe(true);
    });

    test("type parameter with complex bound structure", () => {
      const tparamT = createTypeParam("T");
      const tparamU = createTypeParam("U");

      // Create a complex bound: V extends Array<T>
      const complexBound = createTypeRefAsType("Array", IArray.apply(createTypeRefAsType("T")));
      const tparamV = createTypeParam("V", some(complexBound));

      const scope = new Map<TsIdent, TsTypeParam>([
        [tparamT.name, tparamT],
        [tparamU.name, tparamU],
        [tparamV.name, tparamV]
      ]);

      const typeRefV = createTypeRef("V");
      const member = createMemberProperty("prop", typeRefV);
      const classWithMember = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMember);

      // Should include V (directly referenced) and T (in V's bound)
      expect(result.length).toBe(2);
      expect(result.contains(tparamT)).toBe(true);
      expect(result.contains(tparamV)).toBe(true);
      // U is not referenced
      expect(result.contains(tparamU)).toBe(false);
    });
  });

  describe("Performance and Stress Tests", () => {
    test("large number of type parameters", () => {
      const tparams = Array.from({ length: 50 }, (_, i) => createTypeParam(`T${i + 1}`));
      const scope = new Map<TsIdent, TsTypeParam>(tparams.map(tp => [tp.name, tp]));

      // Reference every other type parameter
      const members = tparams
        .map((tp, i) => ({ tp, i }))
        .filter(({ i }) => i % 2 === 0)
        .map(({ tp, i }) => createMemberProperty(`prop${i}`, createTypeRef(tp.name.value)));

      const classWithMembers = createMockClass("LargeClass", IArray.Empty, IArray.fromArray<TsMember>(members));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMembers);

      // Should find 25 type parameters (every other one)
      expect(result.length).toBe(25);
      expect(result.forall((tp: TsTypeParam) => tp.name.value.startsWith("T"))).toBe(true);
    });

    test("deeply nested type references", () => {
      const tparam = createTypeParam("T");
      const scope = new Map<TsIdent, TsTypeParam>([[tparam.name, tparam]]);

      // Create nested generic types: Promise<Array<Map<string, T>>>
      const deepTypeRef = createTypeRef("Promise", IArray.apply(
        createTypeRefAsType("Array", IArray.apply(
          createTypeRefAsType("Map", IArray.apply(
            createTypeRefAsType("string"),
            createTypeRefAsType("T")
          ))
        ))
      ));

      const member = createMemberProperty("prop", deepTypeRef);
      const classWithMember = createMockClass("TestClass", IArray.Empty, IArray.apply<TsMember>(member));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMember);

      // Should find T even in deeply nested structure
      expect(result.length).toBe(1);
      expect(result.apply(0)).toBe(tparam);
    });

    test("complex tree with many different constructs", () => {
      const tparamT = createTypeParam("T");
      const tparamU = createTypeParam("U", some(createTypeRef("T")));
      const scope = new Map<TsIdent, TsTypeParam>([
        [tparamT.name, tparamT],
        [tparamU.name, tparamU]
      ]);

      // Create various members using the type parameters
      const prop1 = createMemberProperty("prop1", createTypeRef("T"));
      const prop2 = createMemberProperty("prop2", createTypeRef("U"));
      const prop3 = createMemberProperty("prop3", createTypeRef("Array", IArray.apply(createTypeRefAsType("T"))));

      const funSig = TsFunSig.create(
        Comments.empty(),
        IArray.Empty, // tparams
        IArray.apply(TsFunParam.create(Comments.empty(), createSimpleIdent("param"), some(createTypeRef("U")))),
        some(createTypeRef("T")) // resultType
      );

      const method = TsMemberFunction.create(
        Comments.empty(),
        TsProtectionLevel.default(),
        createSimpleIdent("method"),
        MethodType.normal(),
        funSig,
        false, // isStatic
        false  // isReadOnly
      );

      const classWithMembers = createMockClass("ComplexClass", IArray.Empty, IArray.apply<TsMember>(prop1, prop2, prop3, method));

      const result = TypeParamsReferencedInTree.apply(scope, classWithMembers);

      // Should find both T and U
      expect(result.length).toBe(2);
      expect(result.contains(tparamT)).toBe(true);
      expect(result.contains(tparamU)).toBe(true);
    });
  });
});