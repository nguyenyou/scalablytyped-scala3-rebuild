/**
 * TypeScript port of AddCommentsTests.scala
 *
 * Tests for the AddComments transformation functionality
 */

import { describe, test, expect } from 'bun:test';
import { Option, some, none } from 'fp-ts/Option';
import { IArray } from '@/internal/IArray.js';
import { Comments, NoComments } from '@/internal/Comments.js';
import { Comment, Raw, Marker, NameHint } from '@/internal/Comment.js';
import { AddComments } from '@/internal/ts/transforms/AddComments.js';
import {
  TsMember,
  TsMemberCall,
  TsMemberCtor,
  TsMemberFunction,
  TsMemberIndex,
  TsMemberTypeMapped,
  TsMemberProperty,
  TsIdent,
  TsIdentSimple,
  TsTypeRef,
  TsFunSig,
  IndexingDict
} from '@/internal/ts/trees.js';
import { TsProtectionLevel } from '@/internal/ts/TsProtectionLevel.js';
import { MethodType } from '@/internal/ts/MethodType.js';
import { ReadonlyModifier } from '@/internal/ts/ReadonlyModifier.js';
import { OptionalModifier } from '@/internal/ts/OptionalModifier.js';

// Helper functions for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
  return TsIdent.simple(name);
}

function createMockProperty(name: string, tpe: TsTypeRef = TsTypeRef.string): TsMemberProperty {
  return TsMemberProperty.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    createSimpleIdent(name),
    some(tpe),
    none,
    false,
    false
  );
}

function createMockMethod(name: string): TsMemberFunction {
  return TsMemberFunction.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    createSimpleIdent(name),
    MethodType.normal(),
    TsFunSig.create(
      Comments.empty(),
      IArray.Empty,
      IArray.Empty,
      some(TsTypeRef.void)
    ),
    false,
    false
  );
}

function createMockCall(): TsMemberCall {
  return TsMemberCall.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    TsFunSig.create(
      Comments.empty(),
      IArray.Empty,
      IArray.Empty,
      some(TsTypeRef.void)
    )
  );
}

function createMockCtor(): TsMemberCtor {
  return TsMemberCtor.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    TsFunSig.create(
      Comments.empty(),
      IArray.Empty,
      IArray.Empty,
      none
    )
  );
}

function createMockIndex(): TsMemberIndex {
  return TsMemberIndex.create(
    Comments.empty(),
    false,
    TsProtectionLevel.default(),
    IndexingDict.create(createSimpleIdent('key'), TsTypeRef.string),
    some(TsTypeRef.string)
  );
}

function createMockTypeMapped(): TsMemberTypeMapped {
  return TsMemberTypeMapped.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    ReadonlyModifier.noop(),
    createSimpleIdent('K'),
    TsTypeRef.string,
    none,
    OptionalModifier.noop(),
    TsTypeRef.string
  );
}

describe('AddComments', () => {
  describe('Basic Functionality', () => {
    test('constructor creates instance with newComments', () => {
      const newComments = Comments.create('test comment');
      const addComments = new AddComments(newComments);
      
      expect(addComments.newComments).toBe(newComments);
    });

    test('extends TreeTransformationUnit', () => {
      const newComments = Comments.create('test comment');
      const addComments = new AddComments(newComments);
      
      // Should have the enterTsMember method
      expect(typeof addComments.enterTsMember).toBe('function');
    });
  });

  describe('TsMemberCall Processing', () => {
    test('adds comments to TsMemberCall with no existing comments', () => {
      const newComments = Comments.create('new comment');
      const addComments = new AddComments(newComments);
      const call = createMockCall();
      
      const result = addComments.enterTsMember(undefined)(call);
      
      expect(result._tag).toBe('TsMemberCall');
      const resultCall = result as TsMemberCall;
      expect(resultCall.comments).toEqual(newComments);
    });

    test('concatenates comments to TsMemberCall with existing comments', () => {
      const existingComments = Comments.create('existing');
      const newComments = Comments.create('new');
      const addComments = new AddComments(newComments);
      const call = { ...createMockCall(), comments: existingComments };

      const result = addComments.enterTsMember(undefined)(call);

      expect(result._tag).toBe('TsMemberCall');
      const resultCall = result as TsMemberCall;
      expect(resultCall.comments.cs.length).toBe(2);
      expect(resultCall.comments.cs.some(c => c instanceof Raw && c.raw === 'existing')).toBe(true);
      expect(resultCall.comments.cs.some(c => c instanceof Raw && c.raw === 'new')).toBe(true);
    });

    test('handles empty new comments for TsMemberCall', () => {
      const newComments = Comments.empty();
      const addComments = new AddComments(newComments);
      const call = createMockCall();
      
      const result = addComments.enterTsMember(undefined)(call);
      
      expect(result._tag).toBe('TsMemberCall');
      const resultCall = result as TsMemberCall;
      expect(resultCall.comments).toEqual(Comments.empty());
    });
  });

  describe('TsMemberProperty Processing', () => {
    test('adds comments to TsMemberProperty', () => {
      const newComments = Comments.create('property comment');
      const addComments = new AddComments(newComments);
      const property = createMockProperty('testProp');
      
      const result = addComments.enterTsMember(undefined)(property);
      
      expect(result._tag).toBe('TsMemberProperty');
      const resultProperty = result as TsMemberProperty;
      expect(resultProperty.comments).toEqual(newComments);
    });

    test('concatenates comments to TsMemberProperty with existing comments', () => {
      const existingComments = Comments.create('existing property');
      const newComments = Comments.create('new property');
      const addComments = new AddComments(newComments);
      const property = { ...createMockProperty('testProp'), comments: existingComments };

      const result = addComments.enterTsMember(undefined)(property);

      expect(result._tag).toBe('TsMemberProperty');
      const resultProperty = result as TsMemberProperty;
      expect(resultProperty.comments.cs.length).toBe(2);
      expect(resultProperty.comments.cs.some(c => c instanceof Raw && c.raw === 'existing property')).toBe(true);
      expect(resultProperty.comments.cs.some(c => c instanceof Raw && c.raw === 'new property')).toBe(true);
    });
  });

  describe('All Member Types Processing', () => {
    test('works with all member types in sequence', () => {
      const newComments = Comments.create('universal comment');
      const addComments = new AddComments(newComments);

      const call = createMockCall();
      const ctor = createMockCtor();
      const function_ = createMockMethod('test');
      const index = createMockIndex();
      const mapped = createMockTypeMapped();
      const property = createMockProperty('test');

      const members = [call, ctor, function_, index, mapped, property];
      const results = members.map(addComments.enterTsMember(undefined));

      results.forEach((result) => {
        expect((result as any).comments).toEqual(newComments);
      });
    });

    test('maintains other properties unchanged', () => {
      const newComments = Comments.create('test');
      const addComments = new AddComments(newComments);
      const originalProperty = {
        ...createMockProperty('testProp', TsTypeRef.number),
        level: TsProtectionLevel.private(),
        isStatic: true,
        isReadOnly: true
      };

      const result = addComments.enterTsMember(undefined)(originalProperty);

      expect(result._tag).toBe('TsMemberProperty');
      const resultProperty = result as TsMemberProperty;
      expect(resultProperty.comments).toEqual(newComments);
      expect(resultProperty.name).toEqual(originalProperty.name);
      expect(resultProperty.tpe).toEqual(originalProperty.tpe);
      expect(resultProperty.level).toEqual(TsProtectionLevel.private());
      expect(resultProperty.isStatic).toBe(true);
      expect(resultProperty.isReadOnly).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles multiple comments in newComments', () => {
      const comment1 = new Raw('comment 1');
      const comment2 = new Raw('comment 2');
      const comment3 = new Raw('comment 3');
      const newComments = Comments.apply([comment1, comment2, comment3]);
      const addComments = new AddComments(newComments);
      const property = createMockProperty('testProp');

      const result = addComments.enterTsMember(undefined)(property);

      expect(result._tag).toBe('TsMemberProperty');
      const resultProperty = result as TsMemberProperty;
      expect(resultProperty.comments.cs.length).toBe(3);
      expect(resultProperty.comments.cs.some(c => c instanceof Raw && c.raw === 'comment 1')).toBe(true);
      expect(resultProperty.comments.cs.some(c => c instanceof Raw && c.raw === 'comment 2')).toBe(true);
      expect(resultProperty.comments.cs.some(c => c instanceof Raw && c.raw === 'comment 3')).toBe(true);
    });

    test('preserves order when concatenating comments', () => {
      const existingComment = new Raw('existing');
      const newComment1 = new Raw('new1');
      const newComment2 = new Raw('new2');
      const existingComments = Comments.apply([existingComment]);
      const newComments = Comments.apply([newComment1, newComment2]);
      const addComments = new AddComments(newComments);
      const function_ = { ...createMockMethod('testMethod'), comments: existingComments };

      const result = addComments.enterTsMember(undefined)(function_);

      expect(result._tag).toBe('TsMemberFunction');
      const resultFunction = result as TsMemberFunction;
      expect(resultFunction.comments.cs.length).toBe(3);
      expect(resultFunction.comments.cs[0]).toEqual(existingComment);
      expect(resultFunction.comments.cs[1]).toEqual(newComment1);
      expect(resultFunction.comments.cs[2]).toEqual(newComment2);
    });

    test('handles complex comment types', () => {
      const rawComment = new Raw('raw comment');
      const markerComment = new NameHint('hint');
      const newComments = Comments.apply([rawComment, markerComment]);
      const addComments = new AddComments(newComments);
      const call = createMockCall();

      const result = addComments.enterTsMember(undefined)(call);

      expect(result._tag).toBe('TsMemberCall');
      const resultCall = result as TsMemberCall;
      expect(resultCall.comments.cs.length).toBe(2);
      expect(resultCall.comments.cs.some(c => c instanceof Raw && c.raw === 'raw comment')).toBe(true);
      expect(resultCall.comments.cs.some(c => c instanceof NameHint && c.value === 'hint')).toBe(true);
    });
  });
});