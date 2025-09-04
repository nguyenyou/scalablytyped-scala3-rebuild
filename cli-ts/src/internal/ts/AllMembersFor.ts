/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.AllMembersFor
 *
 * Provides functionality for extracting all members from TypeScript types,
 * including handling inheritance, type intersections, and member overriding.
 */

import { Either, isLeft, isRight } from 'fp-ts/Either';
import { Option, isSome } from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { IArray, PartialFunction, partialFunction } from '../IArray.js';
import type {
  TsType,
  TsMember,
  TsTypeRef,
  TsTypeIntersect,
  TsTypeUnion,
  TsTypeObject,
  TsTypeAsserts,
  TsTypeLiteral,
  TsTypeFunction,
  TsTypeConstructor,
  TsTypeIs,
  TsTypeTuple,
  TsTypeQuery,
  TsTypeRepeated,
  TsTypeKeyOf,
  TsTypeLookup,
  TsTypeThis,
  TsTypePredicate,
  TsDeclInterface,
  TsDeclClass,
  TsDeclTypeAlias,
  TsMemberProperty,
  TsIdentSimple
} from './trees.js';
import { TsTreeScope, LoopDetector, Picker, FillInTParams } from './TsTreeScope.js';

/**
 * Main AllMembersFor functionality for extracting members from TypeScript types
 */
export const AllMembersFor = {
  /**
   * Extract all members from a TypeScript type.
   * Handles different type variants with appropriate member extraction logic.
   */
  forType: (scope: TsTreeScope, loopDetector: LoopDetector) => (tpe: TsType): IArray<TsMember> => {
    switch (tpe._tag) {
      case 'TsTypeRef':
        return AllMembersFor.apply(scope, loopDetector)(tpe as TsTypeRef);

      case 'TsTypeIntersect':
        const intersectType = tpe as TsTypeIntersect;
        return intersectType.types.flatMap(AllMembersFor.forType(scope, loopDetector));

      case 'TsTypeUnion':
        // Union types don't have accessible members
        return IArray.Empty;

      case 'TsTypeObject':
        const objectType = tpe as TsTypeObject;
        return objectType.members;

      // All other type variants return empty members
      case 'TsTypeAsserts':
      case 'TsTypeLiteral':
      case 'TsTypeFunction':
      case 'TsTypeConstructor':
      case 'TsTypeIs':
      case 'TsTypeTuple':
      case 'TsTypeQuery':
      case 'TsTypeRepeated':
      case 'TsTypeKeyOf':
      case 'TsTypeLookup':
      case 'TsTypeThis':
      case 'TsTypePredicate':
      default:
        return IArray.Empty;
    }
  },

  /**
   * Handle member overriding between current class/interface members and parent members.
   * Properties in fromThis override properties with the same name in fromParents.
   * Non-property members from parents are preserved.
   */
  handleOverridingFields: (fromThis: IArray<TsMember>, fromParents: IArray<TsMember>): IArray<TsMember> => {
    // Extract property names from current members that will override parent properties
    const thisFieldOverrides = new Set<string>();
    for (let i = 0; i < fromThis.length; i++) {
      const member = fromThis.apply(i);
      if (member._tag === 'TsMemberProperty') {
        const prop = member as TsMemberProperty;
        thisFieldOverrides.add(prop.name.value);
      }
    }

    // Partition parent members into properties and other members
    const [parentProperties, parentRest] = fromParents.partitionCollect(
      partialFunction(
        (m: TsMember): m is TsMemberProperty => m._tag === 'TsMemberProperty',
        (m: TsMember) => m as TsMemberProperty
      )
    );

    // Filter out parent properties that are overridden by this class
    const nonOverriddenParentProperties = parentProperties.filter(prop =>
      !thisFieldOverrides.has(prop.name.value)
    );

    // Combine: this members + non-overridden parent properties + other parent members
    return fromThis
      .concat(nonOverriddenParentProperties)
      .concat(parentRest);
  },

  /**
   * Extract members from a type reference by looking it up in the scope.
   * Handles interfaces, classes, and type aliases with proper loop detection.
   */
  apply: (scope: TsTreeScope, loopDetector: LoopDetector) => (typeRef: TsTypeRef): IArray<TsMember> => {
    const loopResult = loopDetector.including(typeRef, scope);

    if (isLeft(loopResult)) {
      // Circular reference detected, return empty to prevent infinite recursion
      return IArray.Empty;
    }

    const newLoopDetector = loopResult.right;

    // Look up the type reference in the scope
    const lookupResults = scope.lookupInternal(Picker.Types, typeRef.name.parts, newLoopDetector);

    return lookupResults.flatMap(([decl, newScope]) => {
      switch (decl._tag) {
        case 'TsDeclInterface':
          return AllMembersFor.forInterface(newLoopDetector, decl as TsDeclInterface, newScope, typeRef.tparams);

        case 'TsDeclClass':
          const classDecl = decl as TsDeclClass;
          const filledClass = FillInTParams.forClass(classDecl, typeRef.tparams);

          // Get members from parent class and implemented interfaces
          const parentMembers = pipe(
            filledClass.parent,
            (parent) => isSome(parent) ? [parent.value] : [],
            (parents) => parents.concat(filledClass.implementsInterfaces.toArray()),
            (allParents) => IArray.fromArray(allParents),
            (allParents) => allParents.flatMap(AllMembersFor.apply(newScope, newLoopDetector))
          );

          return AllMembersFor.handleOverridingFields(filledClass.members, parentMembers);

        case 'TsDeclTypeAlias':
          const aliasDecl = decl as TsDeclTypeAlias;
          const filledAlias = FillInTParams.forTypeAlias(aliasDecl, typeRef.tparams);
          return AllMembersFor.forType(newScope, newLoopDetector)(filledAlias.alias);

        default:
          return IArray.Empty;
      }
    });
  },

  /**
   * Extract members from an interface declaration.
   * Handles inheritance by combining interface members with inherited members.
   */
  forInterface: (
    loopDetector: LoopDetector,
    interfaceDecl: TsDeclInterface,
    scope: TsTreeScope,
    tparams: IArray<TsType>
  ): IArray<TsMember> => {
    const filledInterface = FillInTParams.forInterface(interfaceDecl, tparams);

    // Get members from inherited interfaces
    const inheritedMembers = filledInterface.inheritance.flatMap(
      AllMembersFor.apply(scope, loopDetector)
    );

    return AllMembersFor.handleOverridingFields(filledInterface.members, inheritedMembers);
  }
};