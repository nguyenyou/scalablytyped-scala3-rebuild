/**
 * Tests for trees.ts - TypeScript port of org.scalablytyped.converter.internal.ts.trees
 * Phase 1: Base Types and Identifiers
 * Phase 2: Core Declaration Traits
 */

import { describe, it, expect } from 'bun:test';
import { some, none } from 'fp-ts/Option';
import { IArray } from '../internal/IArray.js';
import { Comments } from '../internal/scalajs/Comments.js';
import { CodePath } from '../internal/ts/CodePath.js';
import { Directive } from '../internal/ts/Directive.js';
import {
  TsIdent,
  TsIdentLibrary,
  TsIdentModule,
  TsQIdent,
  TsLiteral,
  TsIdentThis,
  TsIdentApply,
  TsIdentGlobal,
  TsIdentStd,
  TsQIdentAny,
  TsQIdentString,
  TsQIdentArray,
  TsParsedFile,
  TsDeclNamespace,
  TsDeclModule,
  TsAugmentedModule,
  TsGlobal,
  TsDeclClass,
  TsDeclInterface,
  TsDeclEnum,
  TsDeclVar,
  TsDeclFunction,
  TsDeclTypeAlias
} from '../internal/ts/trees.js';
import { JsLocation } from '../internal/ts/JsLocation.js';

describe('trees - Phase 1: Base Types and Identifiers', () => {
  describe('TsIdent', () => {
    describe('simple identifiers', () => {
      it('should create simple identifiers', () => {
        const ident = TsIdent.simple('myVariable');
        expect(ident._tag).toBe('TsIdentSimple');
        expect(ident.value).toBe('myVariable');
        expect(ident.asString).toBe('TsIdentSimple(myVariable)');
      });

      it('should provide type guards', () => {
        const simple = TsIdent.simple('test');
        expect(TsIdent.isSimple(simple)).toBe(true);
        expect(TsIdent.isImport(simple)).toBe(false);
        expect(TsIdent.isModule(simple)).toBe(false);
        expect(TsIdent.isLibrary(simple)).toBe(false);
      });

      it('should check equality correctly', () => {
        const ident1 = TsIdent.simple('test');
        const ident2 = TsIdent.simple('test');
        const ident3 = TsIdent.simple('other');
        
        expect(TsIdent.equals(ident1, ident2)).toBe(true);
        expect(TsIdent.equals(ident1, ident3)).toBe(false);
      });
    });

    describe('module identifiers', () => {
      it('should create simple module identifiers', () => {
        const module = TsIdent.module(none, ['lodash']);
        expect(module._tag).toBe('TsIdentModule');
        expect(module.value).toBe('lodash');
        expect(module.fragments).toEqual(['lodash']);
        expect(module.scopeOpt._tag).toBe('None');
      });

      it('should create scoped module identifiers', () => {
        const module = TsIdent.module(some('types'), ['node']);
        expect(module._tag).toBe('TsIdentModule');
        expect(module.value).toBe('@types/node');
        expect(module.fragments).toEqual(['node']);
        expect(module.scopeOpt._tag).toBe('Some');
        if (module.scopeOpt._tag === 'Some') {
          expect(module.scopeOpt.value).toBe('types');
        }
      });

      it('should have correct inLibrary property', () => {
        const simpleModule = TsIdent.module(none, ['lodash']);
        expect(simpleModule.inLibrary._tag).toBe('TsIdentLibrarySimple');
        expect(simpleModule.inLibrary.value).toBe('lodash');

        const scopedModule = TsIdent.module(some('types'), ['node']);
        expect(scopedModule.inLibrary._tag).toBe('TsIdentLibraryScoped');
        expect(scopedModule.inLibrary.value).toBe('@types/node');
      });
    });

    describe('import identifiers', () => {
      it('should create import identifiers', () => {
        const module = TsIdent.module(none, ['lodash']);
        const importIdent = TsIdent.import(module);
        
        expect(importIdent._tag).toBe('TsIdentImport');
        expect(importIdent.value).toBe('lodash');
        expect(importIdent.from).toBe(module);
      });
    });

    describe('library identifiers', () => {
      it('should create simple library identifiers', () => {
        const lib = TsIdent.librarySimple('react');
        expect(lib._tag).toBe('TsIdentLibrarySimple');
        expect(lib.value).toBe('react');
        expect(lib.__value).toBe('react');
      });

      it('should create scoped library identifiers', () => {
        const lib = TsIdent.libraryScoped('types', 'node');
        expect(lib._tag).toBe('TsIdentLibraryScoped');
        expect(lib.value).toBe('@types/node');
        expect(lib.__value).toBe('types__node');
        expect(lib.scope).toBe('types');
        expect(lib.name).toBe('node');
      });
    });

    describe('special identifiers', () => {
      it('should provide special identifier constants', () => {
        expect(TsIdentThis.value).toBe('this');
        expect(TsIdentApply.value).toBe('<apply>');
        expect(TsIdentGlobal.value).toBe('<global>');
        expect(TsIdentStd.value).toBe('std');
      });
    });
  });

  describe('TsIdentLibrary', () => {
    describe('construct method', () => {
      it('should construct simple library identifiers', () => {
        const lib = TsIdentLibrary.construct('react');
        expect(lib._tag).toBe('TsIdentLibrarySimple');
        expect(lib.value).toBe('react');
      });

      it('should construct scoped library identifiers', () => {
        const lib = TsIdentLibrary.construct('@angular/core');
        expect(lib._tag).toBe('TsIdentLibraryScoped');
        expect(lib.value).toBe('@angular/core');
        if (lib._tag === 'TsIdentLibraryScoped') {
          expect(lib.scope).toBe('angular');
          expect(lib.name).toBe('core');
        }
      });

      it('should handle @types special case', () => {
        const lib = TsIdentLibrary.construct('@types/node');
        expect(lib._tag).toBe('TsIdentLibrarySimple');
        expect(lib.value).toBe('node');
      });

      it('should handle underscore scoped format', () => {
        const lib = TsIdentLibrary.construct('angular__core');
        expect(lib._tag).toBe('TsIdentLibraryScoped');
        expect(lib.value).toBe('@angular/core');
      });

      it('should handle types underscore format', () => {
        const lib = TsIdentLibrary.construct('types__node');
        expect(lib._tag).toBe('TsIdentLibrarySimple');
        expect(lib.value).toBe('node');
      });
    });

    describe('type guards', () => {
      it('should identify simple libraries', () => {
        const simple = TsIdent.librarySimple('react');
        const scoped = TsIdent.libraryScoped('angular', 'core');
        
        expect(TsIdentLibrary.isSimple(simple)).toBe(true);
        expect(TsIdentLibrary.isSimple(scoped)).toBe(false);
        expect(TsIdentLibrary.isScoped(simple)).toBe(false);
        expect(TsIdentLibrary.isScoped(scoped)).toBe(true);
      });
    });
  });

  describe('TsIdentModule', () => {
    describe('fromLibrary method', () => {
      it('should create module from simple library', () => {
        const lib = TsIdent.librarySimple('lodash');
        const module = TsIdentModule.fromLibrary(lib);
        
        expect(module._tag).toBe('TsIdentModule');
        expect(module.value).toBe('lodash');
        expect(module.scopeOpt._tag).toBe('None');
      });

      it('should create module from scoped library', () => {
        const lib = TsIdent.libraryScoped('types', 'node');
        const module = TsIdentModule.fromLibrary(lib);
        
        expect(module._tag).toBe('TsIdentModule');
        expect(module.value).toBe('@types/node');
        expect(module.scopeOpt._tag).toBe('Some');
      });
    });

    describe('simple method', () => {
      it('should create simple module', () => {
        const module = TsIdentModule.simple('test');
        expect(module.value).toBe('test');
        expect(module.fragments).toEqual(['test']);
      });
    });
  });

  describe('TsQIdent', () => {
    describe('construction', () => {
      it('should create qualified identifiers from parts', () => {
        const part1 = TsIdent.simple('React');
        const part2 = TsIdent.simple('Component');
        const qident = TsQIdent.of(part1, part2);
        
        expect(qident._tag).toBe('TsQIdent');
        expect(qident.parts.length).toBe(2);
        expect(qident.parts.apply(0)).toBe(part1);
        expect(qident.parts.apply(1)).toBe(part2);
      });

      it('should create qualified identifiers from strings', () => {
        const qident = TsQIdent.ofStrings('React', 'Component');
        expect(qident.parts.length).toBe(2);
        expect(qident.parts.apply(0)?.value).toBe('React');
        expect(qident.parts.apply(1)?.value).toBe('Component');
      });

      it('should create single qualified identifiers', () => {
        const ident = TsIdent.simple('Test');
        const qident = TsQIdent.single(ident);
        expect(qident.parts.length).toBe(1);
        expect(qident.parts.apply(0)).toBe(ident);
      });

      it('should create empty qualified identifiers', () => {
        const qident = TsQIdent.empty();
        expect(qident.parts.length).toBe(0);
      });
    });

    describe('manipulation', () => {
      it('should append single identifiers', () => {
        const qident = TsQIdent.ofStrings('React');
        const newIdent = TsIdent.simple('Component');
        const result = TsQIdent.append(qident, newIdent);
        
        expect(result.parts.length).toBe(2);
        expect(result.parts.apply(1)).toBe(newIdent);
      });
    });

    describe('predefined constants', () => {
      it('should provide primitive type constants', () => {
        expect(TsQIdentAny.parts.apply(0)?.value).toBe('any');
        expect(TsQIdentString.parts.apply(0)?.value).toBe('string');
        expect(TsQIdentArray.parts.apply(0)?.value).toBe('Array');
      });
    });
  });

  describe('TsLiteral', () => {
    describe('string literals', () => {
      it('should create string literals', () => {
        const literal = TsLiteral.str('hello');
        expect(literal._tag).toBe('TsLiteralStr');
        expect(literal.value).toBe('hello');
      });
    });

    describe('numeric literals', () => {
      it('should create numeric literals', () => {
        const literal = TsLiteral.num('42');
        expect(literal._tag).toBe('TsLiteralNum');
        expect(literal.value).toBe('42');
      });
    });

    describe('boolean literals', () => {
      it('should create boolean literals', () => {
        const trueLiteral = TsLiteral.bool(true);
        const falseLiteral = TsLiteral.bool(false);
        
        expect(trueLiteral._tag).toBe('TsLiteralBool');
        expect(trueLiteral.value).toBe('true');
        expect(falseLiteral._tag).toBe('TsLiteralBool');
        expect(falseLiteral.value).toBe('false');
      });
    });

    describe('type guards', () => {
      it('should identify literal types', () => {
        const str = TsLiteral.str('test');
        const num = TsLiteral.num('42');
        const bool = TsLiteral.bool(true);
        
        expect(TsLiteral.isStr(str)).toBe(true);
        expect(TsLiteral.isStr(num)).toBe(false);
        expect(TsLiteral.isNum(num)).toBe(true);
        expect(TsLiteral.isNum(bool)).toBe(false);
        expect(TsLiteral.isBool(bool)).toBe(true);
        expect(TsLiteral.isBool(str)).toBe(false);
      });
    });
  });
});

describe('trees - Phase 2: Core Declaration Traits', () => {
  describe('TsParsedFile', () => {
    describe('construction', () => {
      it('should create a parsed file', () => {
        const comments = Comments.empty();
        const directives = IArray.fromArray([Directive.noStdLib()]);
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const parsedFile = TsParsedFile.create(comments, directives, members, codePath);

        expect(parsedFile._tag).toBe('TsParsedFile');
        expect(parsedFile.comments).toBe(comments);
        expect(parsedFile.directives).toBe(directives);
        expect(parsedFile.members).toBe(members);
        expect(parsedFile.codePath).toBe(codePath);
        expect(parsedFile.isStdLib).toBe(true); // because of NoStdLib directive
      });

      it('should detect standard library files', () => {
        const comments = Comments.empty();
        const directives = IArray.fromArray([Directive.noStdLib()]);
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const parsedFile = TsParsedFile.create(comments, directives, members, codePath);
        expect(parsedFile.isStdLib).toBe(true);
      });

      it('should detect non-standard library files', () => {
        const comments = Comments.empty();
        const directives = IArray.fromArray([Directive.typesRef('react')]);
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const parsedFile = TsParsedFile.create(comments, directives, members, codePath);
        expect(parsedFile.isStdLib).toBe(false);
      });

      it('should have member cache functionality', () => {
        const comments = Comments.empty();
        const directives = IArray.Empty;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const parsedFile = TsParsedFile.create(comments, directives, members, codePath);

        // Check that member cache properties exist
        expect(parsedFile.nameds).toBeDefined();
        expect(parsedFile.exports).toBeDefined();
        expect(parsedFile.imports).toBeDefined();
        expect(parsedFile.unnamed).toBeDefined();
        expect(parsedFile.isModule).toBeDefined();
        expect(parsedFile.membersByName).toBeDefined();
        expect(parsedFile.modules).toBeDefined();
        expect(parsedFile.augmentedModules).toBeDefined();
        expect(parsedFile.augmentedModulesMap).toBeDefined();
      });
    });

    describe('manipulation', () => {
      it('should support withMembers', () => {
        const comments = Comments.empty();
        const directives = IArray.Empty;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const parsedFile = TsParsedFile.create(comments, directives, members, codePath);
        const newMembers = IArray.fromArray([]);
        const newParsedFile = parsedFile.withMembers(newMembers);

        expect(newParsedFile._tag).toBe('TsParsedFile');
        expect(newParsedFile.members).toBe(newMembers);
        expect(newParsedFile.comments).toBe(comments);
        expect(newParsedFile.directives).toBe(directives);
        expect(newParsedFile.codePath).toBe(codePath);
      });

      it('should support withCodePath', () => {
        const comments = Comments.empty();
        const directives = IArray.Empty;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const parsedFile = TsParsedFile.create(comments, directives, members, codePath);
        const newCodePath = CodePath.hasPath(TsIdent.simple('test'), TsQIdent.empty());
        const newParsedFile = parsedFile.withCodePath(newCodePath);

        expect(newParsedFile._tag).toBe('TsParsedFile');
        expect(newParsedFile.codePath).toBe(newCodePath);
        expect(newParsedFile.comments).toBe(comments);
        expect(newParsedFile.directives).toBe(directives);
        expect(newParsedFile.members).toBe(members);
      });
    });

    describe('type guards', () => {
      it('should identify parsed files', () => {
        const comments = Comments.empty();
        const directives = IArray.Empty;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const parsedFile = TsParsedFile.create(comments, directives, members, codePath);
        expect(TsParsedFile.isParsedFile(parsedFile)).toBe(true);

        const notParsedFile = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsParsedFile.isParsedFile(notParsedFile)).toBe(false);
      });
    });

    describe('string representation', () => {
      it('should have meaningful asString', () => {
        const comments = Comments.empty();
        const directives = IArray.Empty;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const parsedFile = TsParsedFile.create(comments, directives, members, codePath);
        expect(parsedFile.asString).toContain('TsParsedFile');
        expect(parsedFile.asString).toContain('NoPath');
      });
    });
  });
});

describe('trees - Phase 3: Container Types', () => {
  describe('TsDeclNamespace', () => {
    describe('construction', () => {
      it('should create a namespace declaration', () => {
        const comments = Comments.empty();
        const declared = false;
        const name = TsIdent.simple('MyNamespace');
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const namespace = TsDeclNamespace.create(comments, declared, name, members, codePath, jsLocation);

        expect(namespace._tag).toBe('TsDeclNamespace');
        expect(namespace.comments).toBe(comments);
        expect(namespace.declared).toBe(declared);
        expect(namespace.name).toBe(name);
        expect(namespace.members).toBe(members);
        expect(namespace.codePath).toBe(codePath);
        expect(namespace.jsLocation).toBe(jsLocation);
      });

      it('should have member cache functionality', () => {
        const comments = Comments.empty();
        const declared = true;
        const name = TsIdent.simple('DeclaredNamespace');
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const namespace = TsDeclNamespace.create(comments, declared, name, members, codePath, jsLocation);

        // Check that member cache properties exist
        expect(namespace.nameds).toBeDefined();
        expect(namespace.exports).toBeDefined();
        expect(namespace.imports).toBeDefined();
        expect(namespace.unnamed).toBeDefined();
        expect(namespace.isModule).toBeDefined();
        expect(namespace.membersByName).toBeDefined();
        expect(namespace.modules).toBeDefined();
        expect(namespace.augmentedModules).toBeDefined();
        expect(namespace.augmentedModulesMap).toBeDefined();
      });
    });

    describe('manipulation', () => {
      it('should support withMembers', () => {
        const comments = Comments.empty();
        const declared = false;
        const name = TsIdent.simple('TestNamespace');
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const namespace = TsDeclNamespace.create(comments, declared, name, members, codePath, jsLocation);
        const newMembers = IArray.fromArray([]);
        const newNamespace = namespace.withMembers(newMembers);

        expect(newNamespace._tag).toBe('TsDeclNamespace');
        expect(newNamespace.members).toBe(newMembers);
        expect(newNamespace.name).toBe(name);
        expect(newNamespace.declared).toBe(declared);
      });

      it('should support withName', () => {
        const comments = Comments.empty();
        const declared = false;
        const name = TsIdent.simple('OldName');
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const namespace = TsDeclNamespace.create(comments, declared, name, members, codePath, jsLocation);
        const newName = TsIdent.simple('NewName');
        const newNamespace = namespace.withName(newName);

        expect(newNamespace._tag).toBe('TsDeclNamespace');
        expect(newNamespace.name).toBe(newName);
        expect(newNamespace.declared).toBe(declared);
        expect(newNamespace.members).toBe(members);
      });

      it('should support withComments', () => {
        const comments = Comments.empty();
        const declared = false;
        const name = TsIdent.simple('TestNamespace');
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const namespace = TsDeclNamespace.create(comments, declared, name, members, codePath, jsLocation);
        const newComments = Comments.empty();
        const newNamespace = namespace.withComments(newComments);

        expect(newNamespace._tag).toBe('TsDeclNamespace');
        expect(newNamespace.comments).toBe(newComments);
        expect(newNamespace.name).toBe(name);
      });
    });

    describe('type guards', () => {
      it('should identify namespaces', () => {
        const comments = Comments.empty();
        const declared = false;
        const name = TsIdent.simple('TestNamespace');
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const namespace = TsDeclNamespace.create(comments, declared, name, members, codePath, jsLocation);
        expect(TsDeclNamespace.isNamespace(namespace)).toBe(true);

        const notNamespace = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsDeclNamespace.isNamespace(notNamespace)).toBe(false);
      });
    });
  });

  describe('TsDeclModule', () => {
    describe('construction', () => {
      it('should create a module declaration', () => {
        const comments = Comments.empty();
        const declared = true;
        const name = TsIdent.module(none, ['my-module']);
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();
        const augmentedModules = IArray.Empty;

        const module = TsDeclModule.create(comments, declared, name, members, codePath, jsLocation, augmentedModules);

        expect(module._tag).toBe('TsDeclModule');
        expect(module.comments).toBe(comments);
        expect(module.declared).toBe(declared);
        expect(module.name).toBe(name);
        expect(module.members).toBe(members);
        expect(module.codePath).toBe(codePath);
        expect(module.jsLocation).toBe(jsLocation);
        expect(module.augmentedModules).toBe(augmentedModules);
      });

      it('should default augmentedModules to empty', () => {
        const comments = Comments.empty();
        const declared = false;
        const name = TsIdent.module(some('types'), ['node']);
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const module = TsDeclModule.create(comments, declared, name, members, codePath, jsLocation);

        expect(module._tag).toBe('TsDeclModule');
        expect(module.augmentedModules).toBeDefined();
        expect(module.augmentedModules.length).toBe(0);
      });
    });

    describe('manipulation', () => {
      it('should support withName (converts to namespace)', () => {
        const comments = Comments.empty();
        const declared = true;
        const name = TsIdent.module(none, ['my-module']);
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const module = TsDeclModule.create(comments, declared, name, members, codePath, jsLocation);
        const newName = TsIdent.simple('MyNamespace');
        const result = module.withName(newName);

        expect(result._tag).toBe('TsDeclNamespace');
        expect(result.name).toBe(newName);
        expect(result.members).toBe(members);
      });
    });

    describe('type guards', () => {
      it('should identify modules', () => {
        const comments = Comments.empty();
        const declared = true;
        const name = TsIdent.module(none, ['test-module']);
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const module = TsDeclModule.create(comments, declared, name, members, codePath, jsLocation);
        expect(TsDeclModule.isModule(module)).toBe(true);

        const notModule = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsDeclModule.isModule(notModule)).toBe(false);
      });
    });
  });

  describe('TsAugmentedModule', () => {
    describe('construction', () => {
      it('should create an augmented module declaration', () => {
        const comments = Comments.empty();
        const name = TsIdent.module(none, ['existing-module']);
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const augModule = TsAugmentedModule.create(comments, name, members, codePath, jsLocation);

        expect(augModule._tag).toBe('TsAugmentedModule');
        expect(augModule.comments).toBe(comments);
        expect(augModule.name).toBe(name);
        expect(augModule.members).toBe(members);
        expect(augModule.codePath).toBe(codePath);
        expect(augModule.jsLocation).toBe(jsLocation);
      });
    });

    describe('manipulation', () => {
      it('should support withName (converts to namespace)', () => {
        const comments = Comments.empty();
        const name = TsIdent.module(none, ['existing-module']);
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const augModule = TsAugmentedModule.create(comments, name, members, codePath, jsLocation);
        const newName = TsIdent.simple('MyNamespace');
        const result = augModule.withName(newName);

        expect(result._tag).toBe('TsDeclNamespace');
        expect(result.name).toBe(newName);
        expect(result.members).toBe(members);
      });
    });

    describe('type guards', () => {
      it('should identify augmented modules', () => {
        const comments = Comments.empty();
        const name = TsIdent.module(none, ['test-module']);
        const members = IArray.Empty;
        const codePath = CodePath.noPath();
        const jsLocation = JsLocation.zero();

        const augModule = TsAugmentedModule.create(comments, name, members, codePath, jsLocation);
        expect(TsAugmentedModule.isAugmentedModule(augModule)).toBe(true);

        const notAugModule = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsAugmentedModule.isAugmentedModule(notAugModule)).toBe(false);
      });
    });
  });

  describe('TsGlobal', () => {
    describe('construction', () => {
      it('should create a global declaration', () => {
        const comments = Comments.empty();
        const declared = true;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const global = TsGlobal.create(comments, declared, members, codePath);

        expect(global._tag).toBe('TsGlobal');
        expect(global.comments).toBe(comments);
        expect(global.declared).toBe(declared);
        expect(global.members).toBe(members);
        expect(global.codePath).toBe(codePath);
      });

      it('should have member cache functionality', () => {
        const comments = Comments.empty();
        const declared = false;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const global = TsGlobal.create(comments, declared, members, codePath);

        // Check that member cache properties exist
        expect(global.nameds).toBeDefined();
        expect(global.exports).toBeDefined();
        expect(global.imports).toBeDefined();
        expect(global.unnamed).toBeDefined();
        expect(global.isModule).toBeDefined();
        expect(global.membersByName).toBeDefined();
        expect(global.modules).toBeDefined();
        expect(global.augmentedModules).toBeDefined();
        expect(global.augmentedModulesMap).toBeDefined();
      });
    });

    describe('manipulation', () => {
      it('should support withMembers', () => {
        const comments = Comments.empty();
        const declared = true;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const global = TsGlobal.create(comments, declared, members, codePath);
        const newMembers = IArray.fromArray([]);
        const newGlobal = global.withMembers(newMembers);

        expect(newGlobal._tag).toBe('TsGlobal');
        expect(newGlobal.members).toBe(newMembers);
        expect(newGlobal.declared).toBe(declared);
        expect(newGlobal.comments).toBe(comments);
      });

      it('should support withCodePath', () => {
        const comments = Comments.empty();
        const declared = false;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const global = TsGlobal.create(comments, declared, members, codePath);
        const newCodePath = CodePath.hasPath(TsIdent.simple('test'), TsQIdent.empty());
        const newGlobal = global.withCodePath(newCodePath);

        expect(newGlobal._tag).toBe('TsGlobal');
        expect(newGlobal.codePath).toBe(newCodePath);
        expect(newGlobal.declared).toBe(declared);
        expect(newGlobal.members).toBe(members);
      });
    });

    describe('type guards', () => {
      it('should identify global declarations', () => {
        const comments = Comments.empty();
        const declared = true;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const global = TsGlobal.create(comments, declared, members, codePath);
        expect(TsGlobal.isGlobal(global)).toBe(true);

        const notGlobal = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsGlobal.isGlobal(notGlobal)).toBe(false);
      });
    });

    describe('string representation', () => {
      it('should have meaningful asString for declared global', () => {
        const comments = Comments.empty();
        const declared = true;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const global = TsGlobal.create(comments, declared, members, codePath);
        expect(global.asString).toBe('TsGlobal(declared)');
      });

      it('should have meaningful asString for undeclared global', () => {
        const comments = Comments.empty();
        const declared = false;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const global = TsGlobal.create(comments, declared, members, codePath);
        expect(global.asString).toBe('TsGlobal(undeclared)');
      });
    });
  });
});

describe('trees - Phase 4: Declaration Types', () => {
  describe('TsDeclClass', () => {
    describe('construction', () => {
      it('should create a class declaration', () => {
        const comments = Comments.empty();
        const declared = false;
        const isAbstract = false;
        const name = TsIdent.simple('MyClass');
        const tparams = IArray.Empty;
        const parent = none;
        const implementsInterfaces = IArray.Empty;
        const members = IArray.Empty;
        const jsLocation = JsLocation.zero();
        const codePath = CodePath.noPath();

        const classDecl = TsDeclClass.create(
          comments, declared, isAbstract, name, tparams, parent,
          implementsInterfaces, members, jsLocation, codePath
        );

        expect(classDecl._tag).toBe('TsDeclClass');
        expect(classDecl.comments).toBe(comments);
        expect(classDecl.declared).toBe(declared);
        expect(classDecl.isAbstract).toBe(isAbstract);
        expect(classDecl.name).toBe(name);
        expect(classDecl.tparams).toBe(tparams);
        expect(classDecl.parent).toBe(parent);
        expect(classDecl.implementsInterfaces).toBe(implementsInterfaces);
        expect(classDecl.members).toBe(members);
        expect(classDecl.jsLocation).toBe(jsLocation);
        expect(classDecl.codePath).toBe(codePath);
      });

      it('should create an abstract class', () => {
        const comments = Comments.empty();
        const declared = true;
        const isAbstract = true;
        const name = TsIdent.simple('AbstractClass');
        const tparams = IArray.Empty;
        const parent = none;
        const implementsInterfaces = IArray.Empty;
        const members = IArray.Empty;
        const jsLocation = JsLocation.zero();
        const codePath = CodePath.noPath();

        const classDecl = TsDeclClass.create(
          comments, declared, isAbstract, name, tparams, parent,
          implementsInterfaces, members, jsLocation, codePath
        );

        expect(classDecl._tag).toBe('TsDeclClass');
        expect(classDecl.declared).toBe(true);
        expect(classDecl.isAbstract).toBe(true);
      });

      it('should have class member cache functionality', () => {
        const comments = Comments.empty();
        const declared = false;
        const isAbstract = false;
        const name = TsIdent.simple('TestClass');
        const tparams = IArray.Empty;
        const parent = none;
        const implementsInterfaces = IArray.Empty;
        const members = IArray.Empty;
        const jsLocation = JsLocation.zero();
        const codePath = CodePath.noPath();

        const classDecl = TsDeclClass.create(
          comments, declared, isAbstract, name, tparams, parent,
          implementsInterfaces, members, jsLocation, codePath
        );

        // Check that class member cache properties exist
        expect(classDecl.members).toBeDefined();
        expect(classDecl.membersByName).toBeDefined();
        expect(classDecl.unnamed).toBeDefined();
      });
    });

    describe('manipulation', () => {
      it('should support withName', () => {
        const comments = Comments.empty();
        const declared = false;
        const isAbstract = false;
        const name = TsIdent.simple('OldName');
        const tparams = IArray.Empty;
        const parent = none;
        const implementsInterfaces = IArray.Empty;
        const members = IArray.Empty;
        const jsLocation = JsLocation.zero();
        const codePath = CodePath.noPath();

        const classDecl = TsDeclClass.create(
          comments, declared, isAbstract, name, tparams, parent,
          implementsInterfaces, members, jsLocation, codePath
        );
        const newName = TsIdent.simple('NewName');
        const newClassDecl = classDecl.withName(newName);

        expect(newClassDecl._tag).toBe('TsDeclClass');
        expect(newClassDecl.name).toBe(newName);
        expect(newClassDecl.declared).toBe(declared);
        expect(newClassDecl.isAbstract).toBe(isAbstract);
      });

      it('should support withComments', () => {
        const comments = Comments.empty();
        const declared = false;
        const isAbstract = false;
        const name = TsIdent.simple('TestClass');
        const tparams = IArray.Empty;
        const parent = none;
        const implementsInterfaces = IArray.Empty;
        const members = IArray.Empty;
        const jsLocation = JsLocation.zero();
        const codePath = CodePath.noPath();

        const classDecl = TsDeclClass.create(
          comments, declared, isAbstract, name, tparams, parent,
          implementsInterfaces, members, jsLocation, codePath
        );
        const newComments = Comments.empty();
        const newClassDecl = classDecl.withComments(newComments);

        expect(newClassDecl._tag).toBe('TsDeclClass');
        expect(newClassDecl.comments).toBe(newComments);
        expect(newClassDecl.name).toBe(name);
      });
    });

    describe('type guards', () => {
      it('should identify classes', () => {
        const comments = Comments.empty();
        const declared = false;
        const isAbstract = false;
        const name = TsIdent.simple('TestClass');
        const tparams = IArray.Empty;
        const parent = none;
        const implementsInterfaces = IArray.Empty;
        const members = IArray.Empty;
        const jsLocation = JsLocation.zero();
        const codePath = CodePath.noPath();

        const classDecl = TsDeclClass.create(
          comments, declared, isAbstract, name, tparams, parent,
          implementsInterfaces, members, jsLocation, codePath
        );
        expect(TsDeclClass.isClass(classDecl)).toBe(true);

        const notClass = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsDeclClass.isClass(notClass)).toBe(false);
      });
    });
  });

  describe('TsDeclInterface', () => {
    describe('construction', () => {
      it('should create an interface declaration', () => {
        const comments = Comments.empty();
        const declared = false;
        const name = TsIdent.simple('MyInterface');
        const tparams = IArray.Empty;
        const inheritance = IArray.Empty;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const interfaceDecl = TsDeclInterface.create(
          comments, declared, name, tparams, inheritance, members, codePath
        );

        expect(interfaceDecl._tag).toBe('TsDeclInterface');
        expect(interfaceDecl.comments).toBe(comments);
        expect(interfaceDecl.declared).toBe(declared);
        expect(interfaceDecl.name).toBe(name);
        expect(interfaceDecl.tparams).toBe(tparams);
        expect(interfaceDecl.inheritance).toBe(inheritance);
        expect(interfaceDecl.members).toBe(members);
        expect(interfaceDecl.codePath).toBe(codePath);
      });

      it('should create a declared interface', () => {
        const comments = Comments.empty();
        const declared = true;
        const name = TsIdent.simple('DeclaredInterface');
        const tparams = IArray.Empty;
        const inheritance = IArray.Empty;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const interfaceDecl = TsDeclInterface.create(
          comments, declared, name, tparams, inheritance, members, codePath
        );

        expect(interfaceDecl._tag).toBe('TsDeclInterface');
        expect(interfaceDecl.declared).toBe(true);
      });
    });

    describe('type guards', () => {
      it('should identify interfaces', () => {
        const comments = Comments.empty();
        const declared = false;
        const name = TsIdent.simple('TestInterface');
        const tparams = IArray.Empty;
        const inheritance = IArray.Empty;
        const members = IArray.Empty;
        const codePath = CodePath.noPath();

        const interfaceDecl = TsDeclInterface.create(
          comments, declared, name, tparams, inheritance, members, codePath
        );
        expect(TsDeclInterface.isInterface(interfaceDecl)).toBe(true);

        const notInterface = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsDeclInterface.isInterface(notInterface)).toBe(false);
      });
    });
  });
});