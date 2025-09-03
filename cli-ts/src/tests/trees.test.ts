/**
 * Tests for trees.ts - TypeScript port of org.scalablytyped.converter.internal.ts.trees
 * Phase 1: Base Types and Identifiers
 * Phase 2: Core Declaration Traits
 */

import { describe, it, expect } from 'bun:test';
import { some, none } from 'fp-ts/Option';
import { IArray } from '../internal/IArray.js';
import { Comments } from '../internal/Comments.js';
import { Comment } from '../internal/Comment.js';
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
  TsDeclTypeAlias,
  TsTypeParam,
  TsFunSig,
  TsFunParam,
  TsTypeRef,
  TsTypeLiteral,
  TsTypeObject,
  TsTypeFunction,
  TsTypeUnion,
  TsTypeIntersect,
  TsMemberCall,
  TsMemberCtor,
  TsMemberFunction,
  TsMemberIndex,
  TsMemberProperty,
  IndexingDict,
  IndexingSingle
} from '../internal/ts/trees.js';
import { JsLocation } from '../internal/ts/JsLocation.js';
import { TsProtectionLevel } from '../internal/ts/TsProtectionLevel.js';
import { MethodType } from '../internal/ts/MethodType.js';

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

describe('trees - Phase 5: Function Signatures and Parameters', () => {
  describe('TsTypeParam', () => {
    describe('construction', () => {
      it('should create a simple type parameter', () => {
        const name = TsIdent.simple('T');
        const typeParam = TsTypeParam.simple(name);

        expect(typeParam._tag).toBe('TsTypeParam');
        expect(typeParam.name).toBe(name);
        expect(typeParam.upperBound._tag).toBe('None');
        expect(typeParam.default._tag).toBe('None');
        expect(typeParam.comments).toBeDefined();
      });

      it('should create a type parameter with upper bound', () => {
        const name = TsIdent.simple('T');
        const upperBound = { _tag: 'TsTypeRef', name: TsQIdent.of(TsIdent.simple('string')), tparams: IArray.Empty, asString: 'string' } as any;
        const typeParam = TsTypeParam.withUpperBound(name, upperBound);

        expect(typeParam._tag).toBe('TsTypeParam');
        expect(typeParam.name).toBe(name);
        expect(typeParam.upperBound._tag).toBe('Some');
        expect(typeParam.default._tag).toBe('None');
      });

      it('should create a type parameter with default type', () => {
        const name = TsIdent.simple('T');
        const defaultType = { _tag: 'TsTypeRef', name: TsQIdent.of(TsIdent.simple('string')), tparams: IArray.Empty, asString: 'string' } as any;
        const typeParam = TsTypeParam.withDefault(name, defaultType);

        expect(typeParam._tag).toBe('TsTypeParam');
        expect(typeParam.name).toBe(name);
        expect(typeParam.upperBound._tag).toBe('None');
        expect(typeParam.default._tag).toBe('Some');
      });

      it('should create a type parameter with comments', () => {
        const comments = Comments.empty();
        const name = TsIdent.simple('T');
        const typeParam = TsTypeParam.create(comments, name, none, none);

        expect(typeParam._tag).toBe('TsTypeParam');
        expect(typeParam.comments).toBe(comments);
      });
    });

    describe('manipulation', () => {
      it('should support withComments', () => {
        const name = TsIdent.simple('T');
        const typeParam = TsTypeParam.simple(name);
        const newComments = Comments.empty();
        const newTypeParam = typeParam.withComments(newComments);

        expect(newTypeParam._tag).toBe('TsTypeParam');
        expect(newTypeParam.comments).toBe(newComments);
        expect(newTypeParam.name).toBe(name);
      });

      it('should support addComment', () => {
        const name = TsIdent.simple('T');
        const typeParam = TsTypeParam.simple(name);
        const comment: Comment = { text: 'Type parameter T', type: 'line' };
        const newTypeParam = typeParam.addComment(comment);

        expect(newTypeParam._tag).toBe('TsTypeParam');
        expect(newTypeParam.name).toBe(name);
        expect(newTypeParam.comments.cs.length).toBe(1);
      });
    });

    describe('utility functions', () => {
      it('should convert type parameters to type arguments', () => {
        const typeParam1 = TsTypeParam.simple(TsIdent.simple('T'));
        const typeParam2 = TsTypeParam.simple(TsIdent.simple('U'));
        const typeParams = IArray.fromArray([typeParam1, typeParam2]);

        const typeArgs = TsTypeParam.asTypeArgs(typeParams);

        expect(typeArgs.length).toBe(2);
        expect(typeArgs.apply(0)._tag).toBe('TsTypeRef');
        expect(typeArgs.apply(1)._tag).toBe('TsTypeRef');
      });
    });

    describe('type guards', () => {
      it('should identify type parameters', () => {
        const name = TsIdent.simple('T');
        const typeParam = TsTypeParam.simple(name);
        expect(TsTypeParam.isTypeParam(typeParam)).toBe(true);

        const notTypeParam = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsTypeParam.isTypeParam(notTypeParam)).toBe(false);
      });
    });
  });

  describe('TsFunParam', () => {
    describe('construction', () => {
      it('should create a simple parameter without type', () => {
        const name = TsIdent.simple('param');
        const param = TsFunParam.simple(name);

        expect(param._tag).toBe('TsFunParam');
        expect(param.name).toBe(name);
        expect(param.tpe._tag).toBe('None');
        expect(param.comments).toBeDefined();
      });

      it('should create a typed parameter', () => {
        const name = TsIdent.simple('param');
        const type = { _tag: 'TsTypeRef', name: TsQIdent.of(TsIdent.simple('string')), tparams: IArray.Empty, asString: 'string' } as any;
        const param = TsFunParam.typed(name, type);

        expect(param._tag).toBe('TsFunParam');
        expect(param.name).toBe(name);
        expect(param.tpe._tag).toBe('Some');
      });

      it('should create a parameter with comments', () => {
        const comments = Comments.empty();
        const name = TsIdent.simple('param');
        const param = TsFunParam.withComments(comments, name, none);

        expect(param._tag).toBe('TsFunParam');
        expect(param.comments).toBe(comments);
        expect(param.name).toBe(name);
      });
    });

    describe('manipulation', () => {
      it('should support withComments', () => {
        const name = TsIdent.simple('param');
        const param = TsFunParam.simple(name);
        const newComments = Comments.empty();
        const newParam = param.withComments(newComments);

        expect(newParam._tag).toBe('TsFunParam');
        expect(newParam.comments).toBe(newComments);
        expect(newParam.name).toBe(name);
      });

      it('should support addComment', () => {
        const name = TsIdent.simple('param');
        const param = TsFunParam.simple(name);
        const comment: Comment = { text: 'Parameter description', type: 'line' };
        const newParam = param.addComment(comment);

        expect(newParam._tag).toBe('TsFunParam');
        expect(newParam.name).toBe(name);
        expect(newParam.comments.cs.length).toBe(1);
      });
    });

    describe('equality', () => {
      it('should consider parameters equal if they have the same type', () => {
        const type = { _tag: 'TsTypeRef', name: TsQIdent.of(TsIdent.simple('string')), tparams: IArray.Empty, asString: 'string' } as any;
        const param1 = TsFunParam.typed(TsIdent.simple('param1'), type);
        const param2 = TsFunParam.typed(TsIdent.simple('param2'), type);

        expect(param1.equals(param2)).toBe(true);
      });

      it('should consider untyped parameters equal', () => {
        const param1 = TsFunParam.simple(TsIdent.simple('param1'));
        const param2 = TsFunParam.simple(TsIdent.simple('param2'));

        expect(param1.equals(param2)).toBe(true);
      });

      it('should consider parameters with different types unequal', () => {
        const type1 = { _tag: 'TsTypeRef', name: TsQIdent.of(TsIdent.simple('string')), tparams: IArray.Empty, asString: 'string' } as any;
        const type2 = { _tag: 'TsTypeRef', name: TsQIdent.of(TsIdent.simple('number')), tparams: IArray.Empty, asString: 'number' } as any;
        const param1 = TsFunParam.typed(TsIdent.simple('param1'), type1);
        const param2 = TsFunParam.typed(TsIdent.simple('param2'), type2);

        expect(param1.equals(param2)).toBe(false);
      });
    });

    describe('type guards', () => {
      it('should identify function parameters', () => {
        const name = TsIdent.simple('param');
        const param = TsFunParam.simple(name);
        expect(TsFunParam.isFunParam(param)).toBe(true);

        const notParam = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsFunParam.isFunParam(notParam)).toBe(false);
      });
    });
  });

  describe('TsFunSig', () => {
    describe('construction', () => {
      it('should create a simple function signature', () => {
        const param1 = TsFunParam.typed(TsIdent.simple('x'), { _tag: 'TsTypeRef', asString: 'number' } as any);
        const param2 = TsFunParam.typed(TsIdent.simple('y'), { _tag: 'TsTypeRef', asString: 'string' } as any);
        const params = IArray.fromArray([param1, param2]);
        const returnType = { _tag: 'TsTypeRef', asString: 'boolean' } as any;

        const signature = TsFunSig.simple(params, some(returnType));

        expect(signature._tag).toBe('TsFunSig');
        expect(signature.params).toBe(params);
        expect(signature.resultType._tag).toBe('Some');
        expect(signature.tparams.length).toBe(0);
      });

      it('should create a function signature with no parameters', () => {
        const returnType = { _tag: 'TsTypeRef', asString: 'void' } as any;
        const signature = TsFunSig.noParams(some(returnType));

        expect(signature._tag).toBe('TsFunSig');
        expect(signature.params.length).toBe(0);
        expect(signature.resultType._tag).toBe('Some');
        expect(signature.tparams.length).toBe(0);
      });

      it('should create a function signature with type parameters', () => {
        const typeParam = TsTypeParam.simple(TsIdent.simple('T'));
        const tparams = IArray.fromArray([typeParam]);
        const param = TsFunParam.typed(TsIdent.simple('value'), { _tag: 'TsTypeRef', asString: 'T' } as any);
        const params = IArray.fromArray([param]);
        const returnType = { _tag: 'TsTypeRef', asString: 'T' } as any;

        const signature = TsFunSig.withTypeParams(tparams, params, some(returnType));

        expect(signature._tag).toBe('TsFunSig');
        expect(signature.tparams).toBe(tparams);
        expect(signature.params).toBe(params);
        expect(signature.resultType._tag).toBe('Some');
      });

      it('should create a function signature with comments', () => {
        const comments = Comments.empty();
        const signature = TsFunSig.create(comments, IArray.Empty, IArray.Empty, none);

        expect(signature._tag).toBe('TsFunSig');
        expect(signature.comments).toBe(comments);
      });
    });

    describe('manipulation', () => {
      it('should support withComments', () => {
        const signature = TsFunSig.noParams(none);
        const newComments = Comments.empty();
        const newSignature = signature.withComments(newComments);

        expect(newSignature._tag).toBe('TsFunSig');
        expect(newSignature.comments).toBe(newComments);
        expect(newSignature.params.length).toBe(0);
      });

      it('should support addComment', () => {
        const signature = TsFunSig.noParams(none);
        const comment: Comment = { text: 'Function signature description', type: 'line' };
        const newSignature = signature.addComment(comment);

        expect(newSignature._tag).toBe('TsFunSig');
        expect(newSignature.comments.cs.length).toBe(1);
      });
    });

    describe('type guards', () => {
      it('should identify function signatures', () => {
        const signature = TsFunSig.noParams(none);
        expect(TsFunSig.isFunSig(signature)).toBe(true);

        const notSignature = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsFunSig.isFunSig(notSignature)).toBe(false);
      });
    });

    describe('string representation', () => {
      it('should have meaningful asString', () => {
        const param1 = TsFunParam.simple(TsIdent.simple('x'));
        const param2 = TsFunParam.simple(TsIdent.simple('y'));
        const params = IArray.fromArray([param1, param2]);
        const signature = TsFunSig.simple(params, none);

        expect(signature.asString).toBe('TsFunSig(2 params)');
      });
    });
  });
});

describe('trees - Phase 6: Type System', () => {
  describe('TsTypeRef', () => {
    describe('construction', () => {
      it('should create a simple type reference', () => {
        const name = TsQIdent.ofStrings('string');
        const typeRef = TsTypeRef.simple(name);

        expect(typeRef._tag).toBe('TsTypeRef');
        expect(typeRef.name).toBe(name);
        expect(typeRef.tparams.length).toBe(0);
        expect(typeRef.comments).toBeDefined();
      });

      it('should create a generic type reference', () => {
        const name = TsQIdent.ofStrings('Array');
        const stringType = TsTypeRef.string;
        const tparams = IArray.fromArray([stringType]);
        const typeRef = TsTypeRef.generic(name, tparams);

        expect(typeRef._tag).toBe('TsTypeRef');
        expect(typeRef.name).toBe(name);
        expect(typeRef.tparams).toBe(tparams);
      });

      it('should create type references from identifiers', () => {
        const ident = TsIdent.simple('MyType');
        const typeRef = TsTypeRef.fromIdent(ident);

        expect(typeRef._tag).toBe('TsTypeRef');
        expect(typeRef.name.parts.apply(0)).toBe(ident);
        expect(typeRef.tparams.length).toBe(0);
      });
    });

    describe('built-in types', () => {
      it('should provide common TypeScript types', () => {
        expect(TsTypeRef.any._tag).toBe('TsTypeRef');
        expect(TsTypeRef.string._tag).toBe('TsTypeRef');
        expect(TsTypeRef.number._tag).toBe('TsTypeRef');
        expect(TsTypeRef.boolean._tag).toBe('TsTypeRef');
        expect(TsTypeRef.void._tag).toBe('TsTypeRef');
        expect(TsTypeRef.never._tag).toBe('TsTypeRef');
        expect(TsTypeRef.null._tag).toBe('TsTypeRef');
        expect(TsTypeRef.undefined._tag).toBe('TsTypeRef');
      });

      it('should provide constructor types', () => {
        expect(TsTypeRef.String._tag).toBe('TsTypeRef');
        expect(TsTypeRef.Boolean._tag).toBe('TsTypeRef');
        expect(TsTypeRef.Object._tag).toBe('TsTypeRef');
      });
    });

    describe('manipulation', () => {
      it('should support withComments', () => {
        const typeRef = TsTypeRef.string;
        const newComments = Comments.empty();
        const newTypeRef = typeRef.withComments(newComments);

        expect(newTypeRef._tag).toBe('TsTypeRef');
        expect(newTypeRef.comments).toBe(newComments);
        expect(newTypeRef.name).toBe(typeRef.name);
      });

      it('should support addComment', () => {
        const typeRef = TsTypeRef.string;
        const comment: Comment = { text: 'String type', type: 'line' };
        const newTypeRef = typeRef.addComment(comment);

        expect(newTypeRef._tag).toBe('TsTypeRef');
        expect(newTypeRef.comments.cs.length).toBe(1);
        expect(newTypeRef.name).toBe(typeRef.name);
      });
    });

    describe('type guards', () => {
      it('should identify type references', () => {
        const typeRef = TsTypeRef.string;
        expect(TsTypeRef.isTypeRef(typeRef)).toBe(true);

        const notTypeRef = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsTypeRef.isTypeRef(notTypeRef)).toBe(false);
      });
    });
  });

  describe('TsTypeLiteral', () => {
    describe('construction', () => {
      it('should create string literal types', () => {
        const literal = TsTypeLiteral.string('hello');

        expect(literal._tag).toBe('TsTypeLiteral');
        expect(literal.literal._tag).toBe('TsLiteralStr');
        expect(literal.literal.value).toBe('hello');
      });

      it('should create number literal types', () => {
        const literal = TsTypeLiteral.number(42);

        expect(literal._tag).toBe('TsTypeLiteral');
        expect(literal.literal._tag).toBe('TsLiteralNum');
        expect(literal.literal.value).toBe('42');
      });

      it('should create boolean literal types', () => {
        const literal = TsTypeLiteral.boolean(true);

        expect(literal._tag).toBe('TsTypeLiteral');
        expect(literal.literal._tag).toBe('TsLiteralBool');
        expect(literal.literal.value).toBe('true');
      });
    });

    describe('type guards', () => {
      it('should identify literal types', () => {
        const literal = TsTypeLiteral.string('test');
        expect(TsTypeLiteral.isTypeLiteral(literal)).toBe(true);

        const notLiteral = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsTypeLiteral.isTypeLiteral(notLiteral)).toBe(false);
      });
    });
  });

  describe('TsTypeObject', () => {
    describe('construction', () => {
      it('should create empty object types', () => {
        const objectType = TsTypeObject.empty();

        expect(objectType._tag).toBe('TsTypeObject');
        expect(objectType.members.length).toBe(0);
        expect(objectType.comments).toBeDefined();
      });

      it('should create object types with members', () => {
        const members = IArray.Empty; // Would normally contain TsMember instances
        const objectType = TsTypeObject.withMembers(members);

        expect(objectType._tag).toBe('TsTypeObject');
        expect(objectType.members).toBe(members);
      });

      it('should have class member cache functionality', () => {
        const objectType = TsTypeObject.empty();

        // Check that class member cache properties exist
        expect(objectType.members).toBeDefined();
        expect(objectType.membersByName).toBeDefined();
        expect(objectType.unnamed).toBeDefined();
      });
    });

    describe('manipulation', () => {
      it('should support withComments', () => {
        const objectType = TsTypeObject.empty();
        const newComments = Comments.empty();
        const newObjectType = objectType.withComments(newComments);

        expect(newObjectType._tag).toBe('TsTypeObject');
        expect(newObjectType.comments).toBe(newComments);
        expect(newObjectType.members.length).toBe(0);
      });

      it('should support addComment', () => {
        const objectType = TsTypeObject.empty();
        const comment: Comment = { text: 'Object type', type: 'line' };
        const newObjectType = objectType.addComment(comment);

        expect(newObjectType._tag).toBe('TsTypeObject');
        expect(newObjectType.comments.cs.length).toBe(1);
      });
    });

    describe('type guards', () => {
      it('should identify object types', () => {
        const objectType = TsTypeObject.empty();
        expect(TsTypeObject.isTypeObject(objectType)).toBe(true);

        const notObjectType = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsTypeObject.isTypeObject(notObjectType)).toBe(false);
      });
    });
  });

  describe('TsTypeFunction', () => {
    describe('construction', () => {
      it('should create function types', () => {
        const signature = TsFunSig.noParams(some(TsTypeRef.string));
        const functionType = TsTypeFunction.create(signature);

        expect(functionType._tag).toBe('TsTypeFunction');
        expect(functionType.signature).toBe(signature);
      });
    });

    describe('type guards', () => {
      it('should identify function types', () => {
        const signature = TsFunSig.noParams(none);
        const functionType = TsTypeFunction.create(signature);
        expect(TsTypeFunction.isTypeFunction(functionType)).toBe(true);

        const notFunctionType = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsTypeFunction.isTypeFunction(notFunctionType)).toBe(false);
      });
    });
  });

  describe('TsTypeUnion', () => {
    describe('construction', () => {
      it('should create union types', () => {
        const stringType = TsTypeRef.string;
        const numberType = TsTypeRef.number;
        const types = IArray.fromArray([stringType, numberType]);
        const unionType = TsTypeUnion.create(types);

        expect(unionType._tag).toBe('TsTypeUnion');
        expect(unionType.types).toBe(types);
        expect(unionType.types.length).toBe(2);
      });

      it('should flatten nested union types', () => {
        const stringType = TsTypeRef.string;
        const numberType = TsTypeRef.number;
        const booleanType = TsTypeRef.boolean;

        const innerUnion = TsTypeUnion.create(IArray.fromArray([stringType, numberType]));
        const outerTypes = IArray.fromArray([innerUnion, booleanType]);

        const flattened = TsTypeUnion.flatten(outerTypes);

        expect(flattened.length).toBe(3);
        expect(flattened.apply(0)).toBe(stringType);
        expect(flattened.apply(1)).toBe(numberType);
        expect(flattened.apply(2)).toBe(booleanType);
      });

      it('should create simplified union types', () => {
        const stringType = TsTypeRef.string;
        const numberType = TsTypeRef.number;
        const types = IArray.fromArray([stringType, numberType]);

        const simplified = TsTypeUnion.simplified(types);

        expect(simplified._tag).toBe('TsTypeUnion');
        expect((simplified as any).types.length).toBe(2);
      });

      it('should simplify single-type unions to the type itself', () => {
        const stringType = TsTypeRef.string;
        const types = IArray.fromArray([stringType]);

        const simplified = TsTypeUnion.simplified(types);

        expect(simplified).toBe(stringType);
      });

      it('should simplify empty unions to never', () => {
        const types = IArray.Empty;

        const simplified = TsTypeUnion.simplified(types);

        expect(simplified._tag).toBe('TsTypeRef');
        expect((simplified as any).name.parts.apply(0).value).toBe('never');
      });
    });

    describe('type guards', () => {
      it('should identify union types', () => {
        const types = IArray.fromArray([TsTypeRef.string, TsTypeRef.number]);
        const unionType = TsTypeUnion.create(types);
        expect(TsTypeUnion.isTypeUnion(unionType)).toBe(true);

        const notUnionType = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsTypeUnion.isTypeUnion(notUnionType)).toBe(false);
      });
    });
  });

  describe('TsTypeIntersect', () => {
    describe('construction', () => {
      it('should create intersection types', () => {
        const type1 = TsTypeRef.string;
        const type2 = TsTypeRef.number;
        const types = IArray.fromArray([type1, type2]);
        const intersectType = TsTypeIntersect.create(types);

        expect(intersectType._tag).toBe('TsTypeIntersect');
        expect(intersectType.types).toBe(types);
        expect(intersectType.types.length).toBe(2);
      });

      it('should flatten nested intersection types', () => {
        const stringType = TsTypeRef.string;
        const numberType = TsTypeRef.number;
        const booleanType = TsTypeRef.boolean;

        const innerIntersect = TsTypeIntersect.create(IArray.fromArray([stringType, numberType]));
        const outerTypes = IArray.fromArray([innerIntersect, booleanType]);

        const flattened = TsTypeIntersect.flatten(outerTypes);

        expect(flattened.length).toBe(3);
        expect(flattened.apply(0)).toBe(stringType);
        expect(flattened.apply(1)).toBe(numberType);
        expect(flattened.apply(2)).toBe(booleanType);
      });

      it('should create simplified intersection types', () => {
        const stringType = TsTypeRef.string;
        const numberType = TsTypeRef.number;
        const types = IArray.fromArray([stringType, numberType]);

        const simplified = TsTypeIntersect.simplified(types);

        expect(simplified._tag).toBe('TsTypeIntersect');
        expect((simplified as any).types.length).toBe(2);
      });

      it('should simplify single-type intersections to the type itself', () => {
        const stringType = TsTypeRef.string;
        const types = IArray.fromArray([stringType]);

        const simplified = TsTypeIntersect.simplified(types);

        expect(simplified).toBe(stringType);
      });

      it('should simplify empty intersections to never', () => {
        const types = IArray.Empty;

        const simplified = TsTypeIntersect.simplified(types);

        expect(simplified._tag).toBe('TsTypeRef');
        expect((simplified as any).name.parts.apply(0).value).toBe('never');
      });
    });

    describe('type guards', () => {
      it('should identify intersection types', () => {
        const types = IArray.fromArray([TsTypeRef.string, TsTypeRef.number]);
        const intersectType = TsTypeIntersect.create(types);
        expect(TsTypeIntersect.isTypeIntersect(intersectType)).toBe(true);

        const notIntersectType = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsTypeIntersect.isTypeIntersect(notIntersectType)).toBe(false);
      });
    });
  });
});

describe('trees - Phase 7: Members', () => {
  describe('TsMemberCall', () => {
    describe('construction', () => {
      it('should create a call signature member', () => {
        const signature = TsFunSig.noParams(some(TsTypeRef.string));
        const level = TsProtectionLevel.default();
        const callMember = TsMemberCall.create(Comments.empty(), level, signature);

        expect(callMember._tag).toBe('TsMemberCall');
        expect(callMember.level).toBe(level);
        expect(callMember.signature).toBe(signature);
        expect(callMember.comments).toBeDefined();
      });

      it('should create a public call signature', () => {
        const signature = TsFunSig.noParams(some(TsTypeRef.boolean));
        const callMember = TsMemberCall.public(signature);

        expect(callMember._tag).toBe('TsMemberCall');
        expect(callMember.signature).toBe(signature);
        expect(TsProtectionLevel.isDefault(callMember.level)).toBe(true);
      });
    });

    describe('manipulation', () => {
      it('should support withComments', () => {
        const signature = TsFunSig.noParams(none);
        const callMember = TsMemberCall.public(signature);
        const newComments = Comments.empty();
        const newCallMember = callMember.withComments(newComments);

        expect(newCallMember._tag).toBe('TsMemberCall');
        expect(newCallMember.comments).toBe(newComments);
        expect(newCallMember.signature).toBe(signature);
      });

      it('should support addComment', () => {
        const signature = TsFunSig.noParams(none);
        const callMember = TsMemberCall.public(signature);
        const comment: Comment = { text: 'Call signature', type: 'line' };
        const newCallMember = callMember.addComment(comment);

        expect(newCallMember._tag).toBe('TsMemberCall');
        expect(newCallMember.comments.cs.length).toBe(1);
        expect(newCallMember.signature).toBe(signature);
      });
    });

    describe('type guards', () => {
      it('should identify call members', () => {
        const signature = TsFunSig.noParams(none);
        const callMember = TsMemberCall.public(signature);
        expect(TsMemberCall.isMemberCall(callMember)).toBe(true);

        const notCallMember = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsMemberCall.isMemberCall(notCallMember)).toBe(false);
      });
    });
  });

  describe('TsMemberCtor', () => {
    describe('construction', () => {
      it('should create a constructor signature member', () => {
        const signature = TsFunSig.noParams(some(TsTypeRef.string));
        const level = TsProtectionLevel.default();
        const ctorMember = TsMemberCtor.create(Comments.empty(), level, signature);

        expect(ctorMember._tag).toBe('TsMemberCtor');
        expect(ctorMember.level).toBe(level);
        expect(ctorMember.signature).toBe(signature);
        expect(ctorMember.comments).toBeDefined();
      });

      it('should create a public constructor signature', () => {
        const signature = TsFunSig.noParams(some(TsTypeRef.object));
        const ctorMember = TsMemberCtor.public(signature);

        expect(ctorMember._tag).toBe('TsMemberCtor');
        expect(ctorMember.signature).toBe(signature);
        expect(TsProtectionLevel.isDefault(ctorMember.level)).toBe(true);
      });
    });

    describe('manipulation', () => {
      it('should support withComments', () => {
        const signature = TsFunSig.noParams(some(TsTypeRef.any));
        const ctorMember = TsMemberCtor.public(signature);
        const newComments = Comments.empty();
        const newCtorMember = ctorMember.withComments(newComments);

        expect(newCtorMember._tag).toBe('TsMemberCtor');
        expect(newCtorMember.comments).toBe(newComments);
        expect(newCtorMember.signature).toBe(signature);
      });

      it('should support addComment', () => {
        const signature = TsFunSig.noParams(some(TsTypeRef.any));
        const ctorMember = TsMemberCtor.public(signature);
        const comment: Comment = { text: 'Constructor signature', type: 'line' };
        const newCtorMember = ctorMember.addComment(comment);

        expect(newCtorMember._tag).toBe('TsMemberCtor');
        expect(newCtorMember.comments.cs.length).toBe(1);
        expect(newCtorMember.signature).toBe(signature);
      });
    });

    describe('type guards', () => {
      it('should identify constructor members', () => {
        const signature = TsFunSig.noParams(some(TsTypeRef.any));
        const ctorMember = TsMemberCtor.public(signature);
        expect(TsMemberCtor.isMemberCtor(ctorMember)).toBe(true);

        const notCtorMember = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsMemberCtor.isMemberCtor(notCtorMember)).toBe(false);
      });
    });
  });

  describe('TsMemberFunction', () => {
    describe('construction', () => {
      it('should create a method member', () => {
        const name = TsIdent.simple('myMethod');
        const signature = TsFunSig.noParams(some(TsTypeRef.string));
        const methodMember = TsMemberFunction.method(name, signature);

        expect(methodMember._tag).toBe('TsMemberFunction');
        expect(methodMember.name).toBe(name);
        expect(methodMember.signature).toBe(signature);
        expect(MethodType.isNormal(methodMember.methodType)).toBe(true);
        expect(methodMember.isStatic).toBe(false);
        expect(methodMember.isReadOnly).toBe(false);
      });

      it('should create a getter method', () => {
        const name = TsIdent.simple('getValue');
        const returnType = TsTypeRef.number;
        const getter = TsMemberFunction.getter(name, returnType);

        expect(getter._tag).toBe('TsMemberFunction');
        expect(getter.name).toBe(name);
        expect(MethodType.isGetter(getter.methodType)).toBe(true);
        expect(getter.isStatic).toBe(false);
        expect(getter.isReadOnly).toBe(false);
      });

      it('should create a setter method', () => {
        const name = TsIdent.simple('setValue');
        const paramType = TsTypeRef.number;
        const setter = TsMemberFunction.setter(name, paramType);

        expect(setter._tag).toBe('TsMemberFunction');
        expect(setter.name).toBe(name);
        expect(MethodType.isSetter(setter.methodType)).toBe(true);
        expect(setter.signature.params.length).toBe(1);
        expect(setter.isStatic).toBe(false);
        expect(setter.isReadOnly).toBe(false);
      });

      it('should create a static method', () => {
        const name = TsIdent.simple('staticMethod');
        const signature = TsFunSig.noParams(some(TsTypeRef.void));
        const staticMethod = TsMemberFunction.static(name, signature);

        expect(staticMethod._tag).toBe('TsMemberFunction');
        expect(staticMethod.name).toBe(name);
        expect(staticMethod.signature).toBe(signature);
        expect(staticMethod.isStatic).toBe(true);
        expect(staticMethod.isReadOnly).toBe(false);
      });
    });

    describe('manipulation', () => {
      it('should support withComments', () => {
        const name = TsIdent.simple('test');
        const signature = TsFunSig.noParams(none);
        const methodMember = TsMemberFunction.method(name, signature);
        const newComments = Comments.empty();
        const newMethodMember = methodMember.withComments(newComments);

        expect(newMethodMember._tag).toBe('TsMemberFunction');
        expect(newMethodMember.comments).toBe(newComments);
        expect(newMethodMember.name).toBe(name);
      });

      it('should support addComment', () => {
        const name = TsIdent.simple('test');
        const signature = TsFunSig.noParams(none);
        const methodMember = TsMemberFunction.method(name, signature);
        const comment: Comment = { text: 'Method description', type: 'line' };
        const newMethodMember = methodMember.addComment(comment);

        expect(newMethodMember._tag).toBe('TsMemberFunction');
        expect(newMethodMember.comments.cs.length).toBe(1);
        expect(newMethodMember.name).toBe(name);
      });
    });

    describe('type guards', () => {
      it('should identify function members', () => {
        const name = TsIdent.simple('test');
        const signature = TsFunSig.noParams(none);
        const methodMember = TsMemberFunction.method(name, signature);
        expect(TsMemberFunction.isMemberFunction(methodMember)).toBe(true);

        const notMethodMember = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsMemberFunction.isMemberFunction(notMethodMember)).toBe(false);
      });
    });
  });

  describe('Indexing', () => {
    describe('IndexingDict', () => {
      it('should create dictionary-style indexing', () => {
        const name = TsIdent.simple('key');
        const tpe = TsTypeRef.string;
        const indexing = IndexingDict.create(name, tpe);

        expect(indexing._tag).toBe('IndexingDict');
        expect(indexing.name).toBe(name);
        expect(indexing.tpe).toBe(tpe);
      });

      it('should create string indexing', () => {
        const name = TsIdent.simple('key');
        const indexing = IndexingDict.string(name);

        expect(indexing._tag).toBe('IndexingDict');
        expect(indexing.name).toBe(name);
        expect(indexing.tpe._tag).toBe('TsTypeRef');
      });

      it('should create number indexing', () => {
        const name = TsIdent.simple('index');
        const indexing = IndexingDict.number(name);

        expect(indexing._tag).toBe('IndexingDict');
        expect(indexing.name).toBe(name);
        expect(indexing.tpe._tag).toBe('TsTypeRef');
      });
    });

    describe('IndexingSingle', () => {
      it('should create single property indexing', () => {
        const name = TsQIdent.ofStrings('keyof', 'T');
        const indexing = IndexingSingle.create(name);

        expect(indexing._tag).toBe('IndexingSingle');
        expect(indexing.name).toBe(name);
      });
    });
  });

  describe('TsMemberIndex', () => {
    describe('construction', () => {
      it('should create an index signature member', () => {
        const indexing = IndexingDict.string(TsIdent.simple('key'));
        const valueType = some(TsTypeRef.any);
        const indexMember = TsMemberIndex.create(
          Comments.empty(),
          false,
          TsProtectionLevel.default(),
          indexing,
          valueType
        );

        expect(indexMember._tag).toBe('TsMemberIndex');
        expect(indexMember.indexing).toBe(indexing);
        expect(indexMember.valueType).toBe(valueType);
        expect(indexMember.isReadOnly).toBe(false);
      });

      it('should create a string index signature', () => {
        const valueType = TsTypeRef.any;
        const indexMember = TsMemberIndex.stringIndex(valueType);

        expect(indexMember._tag).toBe('TsMemberIndex');
        expect(indexMember.indexing._tag).toBe('IndexingDict');
        expect(indexMember.valueType._tag).toBe('Some');
        expect(indexMember.isReadOnly).toBe(false);
      });

      it('should create a number index signature', () => {
        const valueType = TsTypeRef.string;
        const indexMember = TsMemberIndex.numberIndex(valueType);

        expect(indexMember._tag).toBe('TsMemberIndex');
        expect(indexMember.indexing._tag).toBe('IndexingDict');
        expect(indexMember.valueType._tag).toBe('Some');
        expect(indexMember.isReadOnly).toBe(false);
      });
    });

    describe('manipulation', () => {
      it('should support withComments', () => {
        const indexMember = TsMemberIndex.stringIndex(TsTypeRef.any);
        const newComments = Comments.empty();
        const newIndexMember = indexMember.withComments(newComments);

        expect(newIndexMember._tag).toBe('TsMemberIndex');
        expect(newIndexMember.comments).toBe(newComments);
        expect(newIndexMember.indexing).toBe(indexMember.indexing);
      });

      it('should support addComment', () => {
        const indexMember = TsMemberIndex.stringIndex(TsTypeRef.any);
        const comment: Comment = { text: 'Index signature', type: 'line' };
        const newIndexMember = indexMember.addComment(comment);

        expect(newIndexMember._tag).toBe('TsMemberIndex');
        expect(newIndexMember.comments.cs.length).toBe(1);
        expect(newIndexMember.indexing).toBe(indexMember.indexing);
      });
    });

    describe('type guards', () => {
      it('should identify index members', () => {
        const indexMember = TsMemberIndex.stringIndex(TsTypeRef.any);
        expect(TsMemberIndex.isMemberIndex(indexMember)).toBe(true);

        const notIndexMember = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsMemberIndex.isMemberIndex(notIndexMember)).toBe(false);
      });
    });
  });

  describe('TsMemberProperty', () => {
    describe('construction', () => {
      it('should create a typed property', () => {
        const name = TsIdent.simple('myProp');
        const tpe = TsTypeRef.string;
        const property = TsMemberProperty.typed(name, tpe);

        expect(property._tag).toBe('TsMemberProperty');
        expect(property.name).toBe(name);
        expect(property.tpe._tag).toBe('Some');
        expect(property.expr._tag).toBe('None');
        expect(property.isStatic).toBe(false);
        expect(property.isReadOnly).toBe(false);
      });

      it('should create a readonly property', () => {
        const name = TsIdent.simple('readonlyProp');
        const tpe = TsTypeRef.number;
        const property = TsMemberProperty.readonly(name, tpe);

        expect(property._tag).toBe('TsMemberProperty');
        expect(property.name).toBe(name);
        expect(property.isReadOnly).toBe(true);
        expect(property.isStatic).toBe(false);
      });

      it('should create a static property', () => {
        const name = TsIdent.simple('staticProp');
        const tpe = TsTypeRef.boolean;
        const property = TsMemberProperty.static(name, tpe);

        expect(property._tag).toBe('TsMemberProperty');
        expect(property.name).toBe(name);
        expect(property.isStatic).toBe(true);
        expect(property.isReadOnly).toBe(false);
      });

      it('should create a simple untyped property', () => {
        const name = TsIdent.simple('simpleProp');
        const property = TsMemberProperty.simple(name);

        expect(property._tag).toBe('TsMemberProperty');
        expect(property.name).toBe(name);
        expect(property.tpe._tag).toBe('None');
        expect(property.expr._tag).toBe('None');
        expect(property.isStatic).toBe(false);
        expect(property.isReadOnly).toBe(false);
      });
    });

    describe('manipulation', () => {
      it('should support withComments', () => {
        const name = TsIdent.simple('test');
        const property = TsMemberProperty.simple(name);
        const newComments = Comments.empty();
        const newProperty = property.withComments(newComments);

        expect(newProperty._tag).toBe('TsMemberProperty');
        expect(newProperty.comments).toBe(newComments);
        expect(newProperty.name).toBe(name);
      });

      it('should support addComment', () => {
        const name = TsIdent.simple('test');
        const property = TsMemberProperty.simple(name);
        const comment: Comment = { text: 'Property description', type: 'line' };
        const newProperty = property.addComment(comment);

        expect(newProperty._tag).toBe('TsMemberProperty');
        expect(newProperty.comments.cs.length).toBe(1);
        expect(newProperty.name).toBe(name);
      });
    });

    describe('type guards', () => {
      it('should identify property members', () => {
        const name = TsIdent.simple('test');
        const property = TsMemberProperty.simple(name);
        expect(TsMemberProperty.isMemberProperty(property)).toBe(true);

        const notProperty = { _tag: 'SomethingElse', asString: 'test' };
        expect(TsMemberProperty.isMemberProperty(notProperty)).toBe(false);
      });
    });
  });
});