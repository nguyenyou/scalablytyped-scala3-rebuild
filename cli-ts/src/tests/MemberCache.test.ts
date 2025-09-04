/**
 * Tests for MemberCache.ts - TypeScript port of org.scalablytyped.converter.internal.ts.MemberCacheTests
 */

import { describe, it, expect } from 'bun:test';
import { some, none } from 'fp-ts/Option';
import { IArray } from '@/internal/IArray.js';
import { Comments } from '@/internal/Comments.js';
import { CodePath } from '@/internal/ts/CodePath.js';
import { JsLocation } from '@/internal/ts/JsLocation.js';
import { TsProtectionLevel } from '@/internal/ts/TsProtectionLevel.js';
import { MethodType } from '@/internal/ts/MethodType.js';
import { ExportType } from '@/internal/ts/ExportType.js';
import {
  MemberCache,
  HasClassMembers
} from '@/internal/ts/MemberCache.js';

// Import tree types and constructors
import type {
  TsContainerOrDecl,
  TsNamedDecl,
  TsExport,
  TsImport,
  TsImportee,
  TsIdent,
  TsIdentSimple,
  TsIdentModule,
  TsDeclModule,
  TsAugmentedModule,
  TsMember,
  TsMemberCall,
  TsMemberFunction,
  TsMemberProperty,
  TsMemberCtor,
  TsImported
} from '../internal/ts/trees.js';

import {
  TsIdent as TsIdentConstructor,
  TsIdentModule as TsIdentModuleConstructor,
  TsDeclClass,
  TsDeclInterface,
  TsDeclVar,
  TsDeclModule as TsDeclModuleConstructor,
  TsAugmentedModule as TsAugmentedModuleConstructor,
  TsExport as TsExportConstructor,
  TsImport as TsImportConstructor,
  TsImporteeFrom,
  TsImporteeLocal,
  TsImportedIdent,
  TsExporteeTree,
  TsQIdent,
  TsFunSig,
  TsTypeRef,
  TsMemberFunction as TsMemberFunctionConstructor,
  TsMemberProperty as TsMemberPropertyConstructor,
  TsMemberCall as TsMemberCallConstructor,
  TsMemberCtor as TsMemberCtorConstructor,
  TsIdentApply,
  TsIdentConstructor as TsIdentConstructorIdent
} from '../internal/ts/trees.js';

// Test implementations of the interfaces for testing
class TestMemberCache implements MemberCache {
  constructor(public readonly members: IArray<TsContainerOrDecl>) {
    const cache = MemberCache.create(members);
    Object.assign(this, cache);
  }

  readonly nameds!: IArray<TsNamedDecl>;
  readonly exports!: IArray<TsExport>;
  readonly imports!: IArray<TsImport>;
  readonly unnamed!: IArray<TsContainerOrDecl>;
  readonly isModule!: boolean;
  readonly membersByName!: Map<TsIdent, IArray<TsNamedDecl>>;
  readonly modules!: Map<TsIdentModule, TsDeclModule>;
  readonly augmentedModules!: IArray<TsAugmentedModule>;
  readonly augmentedModulesMap!: Map<TsIdentModule, IArray<TsAugmentedModule>>;
}

class TestHasClassMembers implements HasClassMembers {
  constructor(public readonly members: IArray<TsMember>) {
    const cache = HasClassMembers.create(members);
    Object.assign(this, cache);
  }

  readonly membersByName!: Map<TsIdentSimple, IArray<TsMember>>;
  readonly unnamed!: IArray<TsMember>;
}

// Helper methods for creating test data
function createSimpleIdent(name: string): TsIdentSimple {
  return TsIdentConstructor.simple(name);
}

function createModuleIdent(name: string): TsIdentModule {
  return TsIdentModuleConstructor.simple(name);
}

function createMockClass(name: string): TsDeclClass {
  return TsDeclClass.create(
    Comments.empty(),
    false, // declared
    false, // isAbstract
    createSimpleIdent(name),
    IArray.Empty, // tparams
    none, // parent
    IArray.Empty, // implements
    IArray.Empty, // members
    JsLocation.zero(),
    CodePath.noPath()
  );
}

function createMockInterface(name: string): TsDeclInterface {
  return TsDeclInterface.create(
    Comments.empty(),
    false, // declared
    createSimpleIdent(name),
    IArray.Empty, // tparams
    IArray.Empty, // inheritance
    IArray.Empty, // members
    CodePath.noPath()
  );
}

function createMockVar(name: string): TsDeclVar {
  return TsDeclVar.create(
    Comments.empty(),
    false, // declared
    false, // readOnly
    createSimpleIdent(name),
    none, // tpe
    none, // expr
    JsLocation.zero(),
    CodePath.noPath()
  );
}

function createMockModule(name: string): TsDeclModule {
  return TsDeclModuleConstructor.create(
    Comments.empty(),
    false, // declared
    createModuleIdent(name),
    IArray.Empty, // members
    CodePath.noPath(),
    JsLocation.zero()
  );
}

function createMockAugmentedModule(name: string): TsAugmentedModule {
  return TsAugmentedModuleConstructor.create(
    Comments.empty(),
    createModuleIdent(name),
    IArray.Empty, // members
    CodePath.noPath(),
    JsLocation.zero()
  );
}

function createMockExport(name: string): TsExport {
  const exportee = TsExporteeTree.create(createMockVar(name));
  return TsExportConstructor.create(
    Comments.empty(),
    false, // typeOnly
    ExportType.named(),
    exportee
  );
}

function createMockImport(moduleName: string, isLocal: boolean = false): TsImport {
  const importee = isLocal
    ? TsImporteeLocal.create(TsQIdent.ofStrings('localModule'))
    : TsImporteeFrom.create(createModuleIdent(moduleName));

  const imported = IArray.fromArray([
    TsImportedIdent.create(createSimpleIdent('imported'))
  ] as TsImported[]);

  return TsImportConstructor.create(
    false, // typeOnly
    imported,
    importee
  );
}

function createMockMemberFunction(name: string): TsMemberFunction {
  const signature = TsFunSig.create(
    Comments.empty(),
    IArray.Empty, // tparams
    IArray.Empty, // params
    some(TsTypeRef.any)
  );

  return TsMemberFunctionConstructor.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    createSimpleIdent(name),
    MethodType.normal(),
    signature,
    false, // isStatic
    false  // isReadOnly
  );
}

function createMockMemberProperty(name: string): TsMemberProperty {
  return TsMemberPropertyConstructor.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    createSimpleIdent(name),
    some(TsTypeRef.string),
    none, // expr
    false, // isStatic
    false  // isReadOnly
  );
}

function createMockMemberCall(): TsMemberCall {
  const signature = TsFunSig.create(
    Comments.empty(),
    IArray.Empty, // tparams
    IArray.Empty, // params
    some(TsTypeRef.any)
  );

  return TsMemberCallConstructor.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    signature
  );
}

function createMockMemberCtor(): TsMemberCtor {
  const signature = TsFunSig.create(
    Comments.empty(),
    IArray.Empty, // tparams
    IArray.Empty, // params
    some(TsTypeRef.any)
  );

  return TsMemberCtorConstructor.create(
    Comments.empty(),
    TsProtectionLevel.default(),
    signature
  );
}

describe('MemberCache Tests', () => {
  describe('MemberCache - Basic Functionality', () => {
    it('should handle empty members collection', () => {
      const cache = new TestMemberCache(IArray.Empty);

      expect(cache.nameds.isEmpty).toBe(true);
      expect(cache.exports.isEmpty).toBe(true);
      expect(cache.imports.isEmpty).toBe(true);
      expect(cache.unnamed.isEmpty).toBe(true);
      expect(cache.isModule).toBe(false);
      expect(cache.membersByName.size).toBe(0);
      expect(cache.modules.size).toBe(0);
      expect(cache.augmentedModules.isEmpty).toBe(true);
      expect(cache.augmentedModulesMap.size).toBe(0);
    });

    it('should handle single named declaration', () => {
      const mockClass = createMockClass('TestClass');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockClass]));

      expect(cache.nameds.length).toBe(1);
      expect(cache.nameds.head).toBe(mockClass);
      expect(cache.exports.isEmpty).toBe(true);
      expect(cache.imports.isEmpty).toBe(true);
      expect(cache.unnamed.isEmpty).toBe(true);
      expect(cache.isModule).toBe(false);
      expect(cache.membersByName.size).toBe(1);
      expect(cache.membersByName.has(mockClass.name)).toBe(true);
      expect(cache.membersByName.get(mockClass.name)?.head).toBe(mockClass);
    });

    it('should handle single export declaration', () => {
      const mockExport = createMockExport('TestExport');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockExport]));

      expect(cache.nameds.isEmpty).toBe(true);
      expect(cache.exports.length).toBe(1);
      expect(cache.exports.head).toBe(mockExport);
      expect(cache.imports.isEmpty).toBe(true);
      expect(cache.unnamed.isEmpty).toBe(true);
      expect(cache.isModule).toBe(true); // exports make it a module
      expect(cache.membersByName.size).toBe(0);
    });

    it('should handle single import declaration', () => {
      const mockImport = createMockImport('testModule');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockImport]));

      expect(cache.nameds.isEmpty).toBe(true);
      expect(cache.exports.isEmpty).toBe(true);
      expect(cache.imports.length).toBe(1);
      expect(cache.imports.head).toBe(mockImport);
      expect(cache.unnamed.isEmpty).toBe(true);
      expect(cache.isModule).toBe(true); // non-local imports make it a module
      expect(cache.membersByName.size).toBe(0);
    });

    it('should handle local import does not make it a module', () => {
      const localImport = createMockImport('testModule', true);
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([localImport]));

      expect(cache.imports.length).toBe(1);
      expect(cache.isModule).toBe(false); // local imports don't make it a module
    });

    it('should handle mixed member types', () => {
      const mockClass = createMockClass('TestClass');
      const mockInterface = createMockInterface('TestInterface');
      const mockExport = createMockExport('TestExport');
      const mockImport = createMockImport('testModule');

      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockClass, mockInterface, mockExport, mockImport]));

      expect(cache.nameds.length).toBe(2);
      expect(cache.nameds.contains(mockClass)).toBe(true);
      expect(cache.nameds.contains(mockInterface)).toBe(true);
      expect(cache.exports.length).toBe(1);
      expect(cache.exports.head).toBe(mockExport);
      expect(cache.imports.length).toBe(1);
      expect(cache.imports.head).toBe(mockImport);
      expect(cache.unnamed.isEmpty).toBe(true);
      expect(cache.isModule).toBe(true); // has exports and imports
      expect(cache.membersByName.size).toBe(2);
    });
  });

  describe('MemberCache - membersByName Functionality', () => {
    it('should handle single member', () => {
      const mockClass = createMockClass('TestClass');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockClass]));

      expect(cache.membersByName.size).toBe(1);
      expect(cache.membersByName.has(mockClass.name)).toBe(true);
      expect(cache.membersByName.get(mockClass.name)?.length).toBe(1);
      expect(cache.membersByName.get(mockClass.name)?.head).toBe(mockClass);
    });

    it('should handle multiple members with different names', () => {
      const mockClass = createMockClass('TestClass');
      const mockInterface = createMockInterface('TestInterface');
      const mockVar = createMockVar('testVar');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockClass, mockInterface, mockVar]));

      expect(cache.membersByName.size).toBe(3);
      expect(cache.membersByName.has(mockClass.name)).toBe(true);
      expect(cache.membersByName.has(mockInterface.name)).toBe(true);
      expect(cache.membersByName.has(mockVar.name)).toBe(true);
    });

    it('should handle multiple members with same name', () => {
      const mockClass = createMockClass('SameName');
      const mockInterface = createMockInterface('SameName');
      const mockVar = createMockVar('SameName');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockClass, mockInterface, mockVar]));

      expect(cache.membersByName.size).toBe(1);
      expect(cache.membersByName.has(mockClass.name)).toBe(true);
      const sameNameMembers = cache.membersByName.get(mockClass.name);
      expect(sameNameMembers?.length).toBe(3);
      expect(sameNameMembers?.contains(mockClass)).toBe(true);
      expect(sameNameMembers?.contains(mockInterface)).toBe(true);
      expect(sameNameMembers?.contains(mockVar)).toBe(true);
    });
  });

  describe('MemberCache - Modules Functionality', () => {
    it('should handle no modules', () => {
      const mockClass = createMockClass('TestClass');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockClass]));

      expect(cache.modules.size).toBe(0);
    });

    it('should handle single module', () => {
      const mockModule = createMockModule('TestModule');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockModule]));

      expect(cache.modules.size).toBe(1);
      expect(cache.modules.has(mockModule.name)).toBe(true);
      expect(cache.modules.get(mockModule.name)).toBe(mockModule);
    });

    it('should handle multiple modules', () => {
      const mockModule1 = createMockModule('TestModule1');
      const mockModule2 = createMockModule('TestModule2');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockModule1, mockModule2]));

      expect(cache.modules.size).toBe(2);
      expect(cache.modules.has(mockModule1.name)).toBe(true);
      expect(cache.modules.has(mockModule2.name)).toBe(true);
      expect(cache.modules.get(mockModule1.name)).toBe(mockModule1);
      expect(cache.modules.get(mockModule2.name)).toBe(mockModule2);
    });

    it('should handle mixed modules and other members', () => {
      const mockClass = createMockClass('TestClass');
      const mockModule = createMockModule('TestModule');
      const mockExport = createMockExport('TestExport');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockClass, mockModule, mockExport]));

      expect(cache.modules.size).toBe(1);
      expect(cache.modules.has(mockModule.name)).toBe(true);
      expect(cache.nameds.length).toBe(2); // class and module
      expect(cache.exports.length).toBe(1);
    });
  });

  describe('MemberCache - Augmented Modules Functionality', () => {
    it('should handle no augmented modules', () => {
      const mockClass = createMockClass('TestClass');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockClass]));

      expect(cache.augmentedModules.isEmpty).toBe(true);
      expect(cache.augmentedModulesMap.size).toBe(0);
    });

    it('should handle single augmented module', () => {
      const augmentedModule = createMockAugmentedModule('AugmentedModule');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([augmentedModule]));

      expect(cache.augmentedModules.length).toBe(1);
      expect(cache.augmentedModules.head).toBe(augmentedModule);
      expect(cache.augmentedModulesMap.size).toBe(1);
      expect(cache.augmentedModulesMap.has(augmentedModule.name)).toBe(true);
      expect(cache.augmentedModulesMap.get(augmentedModule.name)?.head).toBe(augmentedModule);
    });

    it('should handle multiple augmented modules with same name', () => {
      const augmentedModule1 = createMockAugmentedModule('SameModule');
      const augmentedModule2 = createMockAugmentedModule('SameModule');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([augmentedModule1, augmentedModule2]));

      expect(cache.augmentedModules.length).toBe(2);
      expect(cache.augmentedModulesMap.size).toBe(1);
      const sameNameAugmented = cache.augmentedModulesMap.get(augmentedModule1.name);
      expect(sameNameAugmented?.length).toBe(2);
      expect(sameNameAugmented?.contains(augmentedModule1)).toBe(true);
      expect(sameNameAugmented?.contains(augmentedModule2)).toBe(true);
    });

    it('should handle mixed augmented modules and other members', () => {
      const mockClass = createMockClass('TestClass');
      const augmentedModule = createMockAugmentedModule('AugmentedModule');
      const mockModule = createMockModule('RegularModule');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockClass, augmentedModule, mockModule]));

      expect(cache.augmentedModules.length).toBe(1);
      expect(cache.augmentedModules.head).toBe(augmentedModule);
      expect(cache.modules.size).toBe(1);
      expect(cache.modules.has(mockModule.name)).toBe(true);
      expect(cache.nameds.length).toBe(3); // class, regular module, and augmented module
      expect(cache.unnamed.isEmpty).toBe(true); // all are named declarations
    });
  });

  describe('HasClassMembers - Basic Functionality', () => {
    it('should handle empty members collection', () => {
      const hasClassMembers = new TestHasClassMembers(IArray.Empty);

      expect(hasClassMembers.membersByName.size).toBe(0);
      expect(hasClassMembers.unnamed.isEmpty).toBe(true);
    });

    it('should handle single named member', () => {
      const memberFunction = createMockMemberFunction('testMethod');
      const hasClassMembers = new TestHasClassMembers(IArray.fromArray([memberFunction] as TsMember[]));

      expect(hasClassMembers.membersByName.size).toBe(1);
      expect(hasClassMembers.membersByName.has(memberFunction.name)).toBe(true);
      expect(hasClassMembers.membersByName.get(memberFunction.name)?.head).toBe(memberFunction);
      expect(hasClassMembers.unnamed.isEmpty).toBe(true);
    });

    it('should handle multiple members with same name', () => {
      const memberFunction1 = createMockMemberFunction('sameName');
      const memberFunction2 = createMockMemberFunction('sameName');
      const hasClassMembers = new TestHasClassMembers(IArray.fromArray([memberFunction1, memberFunction2] as TsMember[]));

      expect(hasClassMembers.membersByName.size).toBe(1);
      expect(hasClassMembers.membersByName.has(memberFunction1.name)).toBe(true);
      const sameNameMembers = hasClassMembers.membersByName.get(memberFunction1.name);
      expect(sameNameMembers?.length).toBe(2);
      expect(sameNameMembers?.contains(memberFunction1)).toBe(true);
      expect(sameNameMembers?.contains(memberFunction2)).toBe(true);
      expect(hasClassMembers.unnamed.isEmpty).toBe(true);
    });

    it('should handle mixed member types', () => {
      const memberFunction = createMockMemberFunction('testMethod');
      const memberProperty = createMockMemberProperty('testProp');
      const memberCall = createMockMemberCall();
      const memberCtor = createMockMemberCtor();

      const hasClassMembers = new TestHasClassMembers(IArray.fromArray([memberFunction, memberProperty, memberCall, memberCtor] as TsMember[]));

      expect(hasClassMembers.membersByName.size).toBe(4);
      expect(hasClassMembers.membersByName.has(memberFunction.name)).toBe(true);
      expect(hasClassMembers.membersByName.has(memberProperty.name)).toBe(true);
      expect(hasClassMembers.membersByName.has(TsIdentApply)).toBe(true);
      expect(hasClassMembers.membersByName.has(TsIdentConstructorIdent)).toBe(true);
      expect(hasClassMembers.unnamed.isEmpty).toBe(true);
    });

    it('should handle multiple members with different names', () => {
      const memberFunction = createMockMemberFunction('method1');
      const memberProperty = createMockMemberProperty('prop1');
      const hasClassMembers = new TestHasClassMembers(IArray.fromArray([memberFunction, memberProperty] as TsMember[]));

      expect(hasClassMembers.membersByName.size).toBe(2);
      expect(hasClassMembers.membersByName.has(memberFunction.name)).toBe(true);
      expect(hasClassMembers.membersByName.has(memberProperty.name)).toBe(true);
      expect(hasClassMembers.membersByName.get(memberFunction.name)?.head).toBe(memberFunction);
      expect(hasClassMembers.membersByName.get(memberProperty.name)?.head).toBe(memberProperty);
      expect(hasClassMembers.unnamed.isEmpty).toBe(true);
    });
  });

  describe('MemberCache - Edge Cases and Error Conditions', () => {
    it('should handle large number of members', () => {
      const members = Array.from({ length: 100 }, (_, i) => createMockClass(`Class${i}`));
      const cache = new TestMemberCache(IArray.fromArray(members as TsContainerOrDecl[]));

      expect(cache.nameds.length).toBe(100);
      expect(cache.membersByName.size).toBe(100);
      expect(cache.exports.isEmpty).toBe(true);
      expect(cache.imports.isEmpty).toBe(true);
      expect(cache.unnamed.isEmpty).toBe(true);
      expect(cache.isModule).toBe(false);
    });

    it('should handle mixed large collection', () => {
      const classes = Array.from({ length: 50 }, (_, i) => createMockClass(`Class${i}`));
      const exports = Array.from({ length: 25 }, (_, i) => createMockExport(`Export${i}`));
      const imports = Array.from({ length: 25 }, (_, i) => createMockImport(`module${i}`));
      const allMembers = [...classes, ...exports, ...imports];

      const cache = new TestMemberCache(IArray.fromArray(allMembers as TsContainerOrDecl[]));

      expect(cache.nameds.length).toBe(50);
      expect(cache.exports.length).toBe(25);
      expect(cache.imports.length).toBe(25);
      expect(cache.unnamed.isEmpty).toBe(true);
      expect(cache.isModule).toBe(true); // has exports and imports
      expect(cache.membersByName.size).toBe(50);
    });

    it('should handle duplicate names across different member types', () => {
      const mockClass = createMockClass('DuplicateName');
      const mockInterface = createMockInterface('DuplicateName');
      const mockVar = createMockVar('DuplicateName');
      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([mockClass, mockInterface, mockVar]));

      expect(cache.nameds.length).toBe(3);
      expect(cache.membersByName.size).toBe(1);
      expect(cache.membersByName.has(mockClass.name)).toBe(true);
      const duplicateNameMembers = cache.membersByName.get(mockClass.name);
      expect(duplicateNameMembers?.length).toBe(3);
      expect(duplicateNameMembers?.contains(mockClass)).toBe(true);
      expect(duplicateNameMembers?.contains(mockInterface)).toBe(true);
      expect(duplicateNameMembers?.contains(mockVar)).toBe(true);
    });

    it('should handle complex nested scenarios', () => {
      const mockClass = createMockClass('ComplexClass');
      const mockModule = createMockModule('ComplexModule');
      const augmentedModule1 = createMockAugmentedModule('AugmentedModule');
      const augmentedModule2 = createMockAugmentedModule('AugmentedModule'); // same name
      const mockExport = createMockExport('ComplexExport');
      const mockImport = createMockImport('complexModule');
      const localImport = createMockImport('localModule', true);

      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([
        mockClass, mockModule, augmentedModule1, augmentedModule2,
        mockExport, mockImport, localImport
      ]));

      // Verify all categories are populated correctly
      expect(cache.nameds.length).toBe(4); // class, module, 2 augmented modules
      expect(cache.exports.length).toBe(1);
      expect(cache.imports.length).toBe(2); // one regular, one local
      expect(cache.unnamed.isEmpty).toBe(true);
      expect(cache.isModule).toBe(true); // has exports and non-local imports

      // Verify modules
      expect(cache.modules.size).toBe(1);
      expect(cache.modules.has(mockModule.name)).toBe(true);

      // Verify augmented modules
      expect(cache.augmentedModules.length).toBe(2);
      expect(cache.augmentedModulesMap.size).toBe(1); // same name
      const augmentedGroup = cache.augmentedModulesMap.get(augmentedModule1.name);
      expect(augmentedGroup?.length).toBe(2);

      // Verify membersByName
      expect(cache.membersByName.size).toBe(3); // mockClass, mockModule, augmentedModule (2 with same name grouped)
    });

    it('should handle empty collections gracefully', () => {
      const cache = new TestMemberCache(IArray.Empty);
      const hasClassMembers = new TestHasClassMembers(IArray.Empty);

      // MemberCache should handle empty gracefully
      expect(cache.nameds.isEmpty).toBe(true);
      expect(cache.exports.isEmpty).toBe(true);
      expect(cache.imports.isEmpty).toBe(true);
      expect(cache.unnamed.isEmpty).toBe(true);
      expect(cache.isModule).toBe(false);
      expect(cache.membersByName.size).toBe(0);
      expect(cache.modules.size).toBe(0);
      expect(cache.augmentedModules.isEmpty).toBe(true);
      expect(cache.augmentedModulesMap.size).toBe(0);

      // HasClassMembers should handle empty gracefully
      expect(hasClassMembers.membersByName.size).toBe(0);
      expect(hasClassMembers.unnamed.isEmpty).toBe(true);
    });

    it('should maintain consistency across all computed properties', () => {
      const mockClass = createMockClass('TestClass');
      const mockModule = createMockModule('TestModule');
      const augmentedModule = createMockAugmentedModule('AugmentedModule');
      const mockExport = createMockExport('TestExport');
      const mockImport = createMockImport('testModule');

      const cache = new TestMemberCache(IArray.fromArray<TsContainerOrDecl>([
        mockClass, mockModule, augmentedModule, mockExport, mockImport
      ]));

      // Total members should equal sum of partitioned members
      const totalPartitioned = cache.nameds.length + cache.exports.length +
                              cache.imports.length + cache.unnamed.length;
      expect(totalPartitioned).toBe(cache.members.length);

      // All named declarations should be in membersByName
      let totalInMembersByName = 0;
      for (const [, members] of cache.membersByName) {
        totalInMembersByName += members.length;
      }
      expect(totalInMembersByName).toBe(cache.nameds.length);

      // All modules should be in nameds
      expect(cache.modules.size).toBeLessThanOrEqual(cache.nameds.length);

      // All augmented modules should be in nameds
      expect(cache.augmentedModules.length).toBeLessThanOrEqual(cache.nameds.length);
    });
  });
});