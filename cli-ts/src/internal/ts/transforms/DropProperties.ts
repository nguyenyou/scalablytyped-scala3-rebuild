/**
 * TypeScript port of org.scalablytyped.converter.internal.ts.transforms.DropProperties
 *
 * Filters out unwanted properties and members from TypeScript declarations.
 * This transformation removes:
 * - __promisify__ named value declarations from containers
 * - prototype properties from class members
 * - properties with names starting with unicode escapes (\u)
 * - properties with 'never' type
 */

import { TransformMembers, TransformClassMembers } from '../TreeTransformations.js';
import { TsTreeScope } from '../TsTreeScope.js';
import {
  TsContainer,
  TsContainerOrDecl,
  HasClassMembers,
  TsMember,
  TsNamedValueDecl,
  TsMemberProperty,
  TsIdent,
  TsDeclClass,
  TsDeclInterface,
  TsTypeObject
} from '../trees.js';
import { IArray } from '../../IArray.js';
import { TsTypeRef } from '../trees.js';

/**
 * DropProperties transformation that filters out unwanted properties and members.
 *
 * This transformation implements both TransformMembers and TransformClassMembers
 * functionality to filter members at both the container level and class member level.
 *
 * Container-level filtering:
 * - Removes __promisify__ named value declarations
 *
 * Class member-level filtering:
 * - Removes prototype properties
 * - Removes properties with unicode escape names (starting with \u)
 * - Removes properties with 'never' type
 */
export class DropProperties extends TransformMembers {
  /**
   * Filter container members to remove unwanted declarations.
   */
  newMembers(scope: TsTreeScope, x: TsContainer): IArray<TsContainerOrDecl> {
    return x.members.filter((member: TsContainerOrDecl) => {
      // Filter out __promisify__ named value declarations
      if (this.isNamedValueDecl(member)) {
        const namedDecl = member as TsNamedValueDecl;
        return namedDecl.name.value !== "__promisify__";
      }
      return true;
    });
  }

  /**
   * Filter class members to remove unwanted properties.
   */
  newClassMembers(scope: TsTreeScope, x: HasClassMembers): IArray<TsMember> {
    return x.members.filter((member: TsMember) => {
      // Only filter TsMemberProperty, let other member types pass through
      if (member._tag !== 'TsMemberProperty') {
        return true;
      }

      const property = member as TsMemberProperty;

      // Filter out prototype properties
      if (property.name.value === 'prototype') {
        return false;
      }

      // Filter out properties with names starting with unicode escapes
      if (property.name.value.startsWith('\\u')) {
        return false;
      }

      // Filter out properties with 'never' type
      // property.tpe is an Option<TsType>, so we need to check if it's Some and extract the value
      if (property.tpe && property.tpe._tag === 'Some' && this.isNeverType(property.tpe.value)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Override class-related enter methods to apply class member filtering.
   */
  override enterTsDeclClass(scope: TsTreeScope): (x: TsDeclClass) => TsDeclClass {
    return (x: TsDeclClass) => ({
      ...x,
      members: this.newClassMembers(scope, x)
    });
  }

  override enterTsDeclInterface(scope: TsTreeScope): (x: TsDeclInterface) => TsDeclInterface {
    return (x: TsDeclInterface) => ({
      ...x,
      members: this.newClassMembers(scope, x)
    });
  }

  override enterTsTypeObject(scope: TsTreeScope): (x: TsTypeObject) => TsTypeObject {
    return (x: TsTypeObject) => ({
      ...x,
      members: this.newClassMembers(scope, x)
    });
  }

  private isNamedValueDecl(member: TsContainerOrDecl): member is TsNamedValueDecl {
    // Check if the member is a named value declaration (TsDeclVar, TsDeclFunction, etc.)
    return member._tag === 'TsDeclVar' ||
           member._tag === 'TsDeclFunction' ||
           member._tag === 'TsDeclTypeAlias';
  }

  private isNeverType(tpe: any): boolean {
    // Check if the type is TsTypeRef.never
    if (tpe._tag !== 'TsTypeRef') {
      return false;
    }

    // Check if the name contains 'never' - this handles different string representations
    const nameStr = tpe.name?.asString || '';
    return nameStr.includes('never');
  }
}

/**
 * Singleton instance of DropProperties for convenient usage.
 * Equivalent to the Scala object DropProperties.
 */
export const DropPropertiesTransform = new DropProperties();