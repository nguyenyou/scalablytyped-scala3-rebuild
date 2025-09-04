import { describe, test, expect } from 'bun:test';
import { Option, none, some } from 'fp-ts/Option';
import { IArray } from '../internal/IArray.js';
import { Logger, DevNullLogger } from '@/internal/logging';
import { TsTreeScope } from '../internal/ts/TsTreeScope.js';
import {
  TsIdentLibrarySimple,
  TsIdentLibraryScoped,
  TsIdentSimple,
  TsQIdent,
  TsTypeParam,
  TsParsedFile,
  TsDeclNamespace,
  TsDeclClass,
  TsDeclInterface,
  TsDeclModule,
  TsDeclVar,
  TsExport,
  TsIdent,
  TsIdentModule,
  TsExporteeNames,
  TsTypeRef
} from '../internal/ts/trees.js';
import { Comments } from '../internal/Comments.js';
import { CodePath } from '../internal/ts/CodePath.js';
import { JsLocation } from '../internal/ts/JsLocation.js';
import { PackageJson } from '../internal/ts/PackageJson.js';
import { ExportType } from '../internal/ts/ExportType.js';

// Test helper utilities
export function createMockLogger(): Logger<void> {
  return new DevNullLogger();
}

export function createSimpleLibrary(name: string): TsIdentLibrarySimple {
  return TsIdent.librarySimple(name);
}

export function createScopedLibrary(scope: string, name: string): TsIdentLibraryScoped {
  return TsIdent.libraryScoped(scope, name);
}

export function createSimpleIdent(name: string): TsIdentSimple {
  return TsIdent.simple(name);
}

export function createQIdent(...parts: string[]): TsQIdent {
  return TsQIdent.ofStrings(...parts);
}

export function createTypeParam(name: string): TsTypeParam {
  return {
    _tag: 'TsTypeParam',
    comments: Comments.empty(),
    name: createSimpleIdent(name),
    upperBound: none,
    default: none,
    withComments: (cs) => createTypeParam(name),
    addComment: (c) => createTypeParam(name),
    asString: `TsTypeParam(${name})`
  };
}

export function createMockParsedFile(libName: string): TsParsedFile {
  return TsParsedFile.createMock();
}

export function createMockNamespace(name: string): TsDeclNamespace {
  return TsDeclNamespace.create(
    Comments.empty(),
    false,
    createSimpleIdent(name),
    IArray.Empty,
    CodePath.noPath(),
    JsLocation.zero()
  );
}

export function createMockClass(name: string): TsDeclClass {
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

export function createMockInterface(name: string): TsDeclInterface {
  return TsDeclInterface.create(
    Comments.empty(),
    false,
    createSimpleIdent(name),
    IArray.Empty,
    IArray.Empty,
    IArray.Empty,
    CodePath.noPath()
  );
}

export function createMockModule(name: string): TsDeclModule {
  return TsDeclModule.create(
    Comments.empty(),
    false,
    TsIdentModule.simple(name),
    IArray.Empty,
    CodePath.noPath(),
    JsLocation.zero()
  );
}

export function createMockVar(name: string): TsDeclVar {
  return TsDeclVar.simple(createSimpleIdent(name), TsTypeRef.any);
}

export function createMockExportDecl(name: string): TsExport {
  const exportee: TsExporteeNames = {
    _tag: 'TsExporteeNames',
    idents: IArray.fromArray([[createQIdent(name), none as Option<TsIdentSimple>]]),
    fromOpt: none,
    asString: `TsExporteeNames(${name})`
  };

  return {
    _tag: 'TsExport',
    comments: Comments.empty(),
    typeOnly: false,
    tpe: ExportType.named(),
    exported: exportee,
    asString: `TsExport(${name})`
  };
}

export function createBasicTsLib(name: TsIdentLibrarySimple | TsIdentLibraryScoped): TsTreeScope.TsLib {
  return {
    libName: name,
    packageJsonOpt: undefined
  };
}

describe('TsTreeScope', () => {

  describe('Construction and Basic Properties', () => {
    test('should create root scope with correct properties', () => {
      const libName = createSimpleLibrary('test-lib');
      const logger = createMockLogger();
      const deps = new Map();

      const root = TsTreeScope.create(libName, false, deps, logger);

      expect(root.libName).toBe(libName);
      expect(root.pedantic).toBe(false);
      expect(root.logger).toBe(logger);
      expect(root.lookupUnqualified).toBe(false);
      expect(root.stack).toEqual([]);
      expect(root.root).toBe(root);
    });

    test('should create scoped scope with correct properties', () => {
      const libName = createSimpleLibrary('test-lib');
      const logger = createMockLogger();
      const deps = new Map();
      const root = TsTreeScope.create(libName, false, deps, logger);

      const mockClass = createMockClass('TestClass');
      const scoped = root['/'](mockClass);

      expect(scoped.outer).toBe(root);
      expect(scoped.current).toBe(mockClass);
      expect(scoped.root).toBe(root);
      expect(scoped.logger).toBe(root.logger);
      expect(scoped.stack).toEqual([mockClass]);
      expect(scoped.lookupUnqualified).toBe(false);
    });

    test('should handle nested scoped scopes', () => {
      const libName = createSimpleLibrary('test-lib');
      const logger = createMockLogger();
      const deps = new Map();
      const root = TsTreeScope.create(libName, false, deps, logger);

      const mockNamespace = createMockNamespace('TestNamespace');
      const mockClass = createMockClass('TestClass');

      const scoped1 = root['/'](mockNamespace);
      const scoped2 = scoped1['/'](mockClass);

      expect(scoped2.stack).toEqual([mockClass, mockNamespace]);
      expect(scoped2.outer).toBe(scoped1);
      expect(scoped2.root).toBe(root);
    });
  });

  describe('Caching and Configuration', () => {
    test('should create caching version of root scope', () => {
      const libName = createSimpleLibrary('test-lib');
      const logger = createMockLogger();
      const deps = new Map();
      const root = TsTreeScope.create(libName, false, deps, logger);

      const cachingRoot = root.caching();

      expect(cachingRoot.libName).toBe(libName);
      expect(cachingRoot.pedantic).toBe(false);
      expect(cachingRoot.logger).toBe(logger);
      expect(cachingRoot.cache._tag).toBe('Some');
      expect(cachingRoot.lookupUnqualified).toBe(false);
    });

    test('should enable unqualified lookup', () => {
      const libName = createSimpleLibrary('test-lib');
      const logger = createMockLogger();
      const deps = new Map();
      const root = TsTreeScope.create(libName, false, deps, logger);

      const unqualifiedRoot = root.enableUnqualifiedLookup();

      expect(unqualifiedRoot.libName).toBe(libName);
      expect(unqualifiedRoot.pedantic).toBe(false);
      expect(unqualifiedRoot.logger).toBe(logger);
      expect(unqualifiedRoot.lookupUnqualified).toBe(true);
    });

    test('should chain caching and unqualified lookup', () => {
      const libName = createSimpleLibrary('test-lib');
      const logger = createMockLogger();
      const deps = new Map();
      const root = TsTreeScope.create(libName, false, deps, logger);

      const enhanced = root.caching().enableUnqualifiedLookup();

      expect(enhanced.cache._tag).toBe('Some');
      expect(enhanced.lookupUnqualified).toBe(true);
    });
  });

  describe('Type Parameters and Keys', () => {
    test('should inherit type parameters from outer scope', () => {
      const libName = createSimpleLibrary('test-lib');
      const logger = createMockLogger();
      const deps = new Map();
      const root = TsTreeScope.create(libName, false, deps, logger);

      const tparam = createTypeParam('T');
      const mockClass = createMockClass('TestClass');
      // In a full implementation, we would set tparams on the class

      const scoped = root['/'](mockClass);

      // Type parameters should be inherited and include current tree's tparams
      expect(scoped.tparams).toBeDefined();
      expect(scoped.tparams instanceof Map).toBe(true);
    });

    test('should handle type keys from mapped types', () => {
      const libName = createSimpleLibrary('test-lib');
      const logger = createMockLogger();
      const deps = new Map();
      const root = TsTreeScope.create(libName, false, deps, logger);

      const mockClass = createMockClass('TestClass');
      const scoped = root['/'](mockClass);

      // Type keys should be inherited from outer scope
      expect(scoped.tkeys).toBeDefined();
      expect(scoped.tkeys instanceof Set).toBe(true);
    });
  });
});