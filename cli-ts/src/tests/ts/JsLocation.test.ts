import { 
  JsLocation, 
  JsLocationZero, 
  JsLocationGlobal, 
  JsLocationModule, 
  JsLocationBoth,
  HasJsLocation,
  JsLocationHas
} from '@/internal/ts/JsLocation.js';
import { 
  TsIdent, 
  TsQIdent, 
  TsIdentModule, 
  TsIdentDefault, 
  TsIdentNamespaced,
  TsDeclModule,
  TsAugmentedModule,
  TsDeclClass,
  TsGlobal,
  TsDeclEnum
} from '@/internal/ts/trees.js';
import { IArray } from '@/internal/IArray.js';
import { Comments } from '@/internal/Comments.js';
import { CodePath } from '@/internal/ts/CodePath.js';
import { describe, test, expect } from "bun:test";
import { none, some } from 'fp-ts/Option';
import {ModuleSpec} from "@/internal/ts/ModuleSpec.ts";

describe("JsLocation", () => {
  describe("JsLocation.Zero - Construction and Basic Properties", () => {
    test("Zero is a singleton object", () => {
      const zero1 = JsLocation.zero();
      const zero2 = JsLocation.zero();
      const zero3 = JsLocationZero;

      expect(zero1._tag).toBe('Zero');
      expect(zero2._tag).toBe('Zero');
      expect(zero3._tag).toBe('Zero');
      expect(JsLocation.isZero(zero1)).toBe(true);
      expect(JsLocation.isZero(zero2)).toBe(true);
      expect(JsLocation.isZero(zero3)).toBe(true);
    });
  });

  describe("JsLocation.Global - Construction and Basic Properties", () => {
    test("Global construction with simple path", () => {
      const path = TsQIdent.of(TsIdent.simple("myGlobal"));
      const global = JsLocation.global(path);

      expect(global.jsPath).toBe(path);
      expect(JsLocation.isGlobal(global)).toBe(true);
      expect(global._tag).toBe('Global');
    });

    test("Global construction with qualified path", () => {
      const path = TsQIdent.ofStrings("window", "console");
      const global = JsLocation.global(path);

      expect(global.jsPath).toBe(path);
      expect(global.jsPath.parts.length).toBe(2);
      expect(global.jsPath.parts.apply(0).value).toBe("window");
      expect(global.jsPath.parts.apply(1).value).toBe("console");
    });

    test("Global construction with empty path", () => {
      const path = TsQIdent.empty();
      const global = JsLocation.global(path);

      expect(global.jsPath).toBe(path);
      expect(global.jsPath.parts.isEmpty).toBe(true);
    });
  });

  describe("JsLocation.Module - Construction and Basic Properties", () => {
    test("Module construction with simple module and namespaced spec", () => {
      const module = TsIdentModule.simple("lodash");
      const spec = ModuleSpec.namespaced();
      const jsModule = JsLocation.module(module, spec);

      expect(jsModule.module).toBe(module);
      expect(jsModule.spec).toBe(spec);
      expect(JsLocation.isModule(jsModule)).toBe(true);
      expect(jsModule._tag).toBe('Module');
    });

    test("Module construction with scoped module", () => {
      const module = TsIdent.module(some("types"), ["node"]);
      const spec = ModuleSpec.specified(IArray.fromArray<TsIdent>([TsIdent.simple("fs")]));
      const jsModule = JsLocation.module(module, spec);

      expect(jsModule.module).toBe(module);
      expect(jsModule.spec).toBe(spec);
      expect(jsModule.module.value).toBe("@types/node");
    });

    test("Module construction with defaulted spec", () => {
      const module = TsIdentModule.simple("react");
      const spec = ModuleSpec.defaulted();
      const jsModule = JsLocation.module(module, spec);

      expect(jsModule.module).toBe(module);
      expect(jsModule.spec).toBe(spec);
      expect(ModuleSpec.isDefaulted(spec)).toBe(true);
    });
  });

  describe("JsLocation.Both - Construction and Basic Properties", () => {
    test("Both construction with module and global", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const global = JsLocation.global(TsQIdent.of(TsIdent.simple("_")));
      const both = JsLocation.both(module, global);

      expect(both.module).toBe(module);
      expect(both.global).toBe(global);
      expect(JsLocation.isBoth(both)).toBe(true);
      expect(both._tag).toBe('Both');
    });

    test("Both construction with complex paths", () => {
      const module = JsLocation.module(
        TsIdent.module(some("types"), ["react"]),
        ModuleSpec.specified(IArray.fromArray<TsIdent>([TsIdent.simple("Component")]))
      );
      const global = JsLocation.global(TsQIdent.ofStrings("React", "Component"));
      const both = JsLocation.both(module, global);

      expect(both.module).toBe(module);
      expect(both.global).toBe(global);
      expect(both.module.module.value).toBe("@types/react");
      expect(both.global.jsPath.parts.length).toBe(2);
    });
  });

  describe("ModuleSpec - Construction and Basic Properties", () => {
    test("Defaulted module spec", () => {
      const spec = ModuleSpec.defaulted();
      expect(spec._tag).toBe('Defaulted');
      expect(ModuleSpec.isDefaulted(spec)).toBe(true);
    });

    test("Namespaced module spec", () => {
      const spec = ModuleSpec.namespaced();
      expect(spec._tag).toBe('Namespaced');
      expect(ModuleSpec.isNamespaced(spec)).toBe(true);
    });

    test("Specified module spec", () => {
      const idents = IArray.fromArray<TsIdent>([TsIdent.simple("map"), TsIdent.simple("filter")]);
      const spec = ModuleSpec.specified(idents);
      expect(spec._tag).toBe('Specified');
      expect(ModuleSpec.isSpecified(spec)).toBe(true);
      if (ModuleSpec.isSpecified(spec)) {
        expect(spec.tsIdents).toBe(idents);
        expect(spec.tsIdents.length).toBe(2);
      }
    });

    test("ModuleSpec from TsIdent", () => {
      const defaultSpec = ModuleSpec.apply(TsIdent.default());
      expect(ModuleSpec.isDefaulted(defaultSpec)).toBe(true);

      const namespacedSpec = ModuleSpec.apply(TsIdent.namespaced());
      expect(ModuleSpec.isNamespaced(namespacedSpec)).toBe(true);

      const otherSpec = ModuleSpec.apply(TsIdent.simple("test"));
      expect(ModuleSpec.isSpecified(otherSpec)).toBe(true);
    });
  });

  describe("JsLocation + operator (add identifier)", () => {
    test("Zero + identifier returns Zero", () => {
      const zero = JsLocation.zero();
      const ident = TsIdent.simple("test");
      const result = JsLocation.add(zero, ident);

      expect(JsLocation.isZero(result)).toBe(true);
      expect(result).toEqual(zero);
    });

    test("Zero + namespaced identifier returns same Zero", () => {
      const zero = JsLocation.zero();
      const result = JsLocation.add(zero, TsIdent.namespaced());

      expect(result).toEqual(zero);
    });

    test("Global + identifier extends path", () => {
      const global = JsLocation.global(TsQIdent.of(TsIdent.simple("window")));
      const ident = TsIdent.simple("console");
      const result = JsLocation.add(global, ident);

      expect(JsLocation.isGlobal(result)).toBe(true);
      if (JsLocation.isGlobal(result)) {
        expect(result.jsPath.parts.length).toBe(2);
        expect(result.jsPath.parts.apply(0).value).toBe("window");
        expect(result.jsPath.parts.apply(1).value).toBe("console");
      }
    });

    test("Global + namespaced identifier returns same Global", () => {
      const global = JsLocation.global(TsQIdent.of(TsIdent.simple("window")));
      const result = JsLocation.add(global, TsIdent.namespaced());

      expect(result).toEqual(global);
    });

    test("Module + identifier extends spec", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const ident = TsIdent.simple("map");
      const result = JsLocation.add(module, ident);

      expect(JsLocation.isModule(result)).toBe(true);
      if (JsLocation.isModule(result)) {
        expect(result.module).toBe(module.module);
        expect(ModuleSpec.isSpecified(result.spec)).toBe(true);
        if (ModuleSpec.isSpecified(result.spec)) {
          expect(result.spec.tsIdents.length).toBe(1);
          expect(result.spec.tsIdents.apply(0).value).toBe("map");
        }
      }
    });

    test("Module + namespaced identifier returns same Module", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const result = JsLocation.add(module, TsIdent.namespaced());

      expect(result).toEqual(module);
    });

    test("Both + identifier extends both module and global", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const global = JsLocation.global(TsQIdent.of(TsIdent.simple("_")));
      const both = JsLocation.both(module, global);
      const ident = TsIdent.simple("map");
      const result = JsLocation.add(both, ident);

      expect(JsLocation.isBoth(result)).toBe(true);
      if (JsLocation.isBoth(result)) {
        // Check module was extended
        expect(result.module.module).toBe(module.module);
        expect(ModuleSpec.isSpecified(result.module.spec)).toBe(true);

        // Check global was extended
        expect(result.global.jsPath.parts.length).toBe(2);
        expect(result.global.jsPath.parts.apply(0).value).toBe("_");
        expect(result.global.jsPath.parts.apply(1).value).toBe("map");
      }
    });

    test("Both + namespaced identifier returns same Both", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const global = JsLocation.global(TsQIdent.of(TsIdent.simple("_")));
      const both = JsLocation.both(module, global);
      const result = JsLocation.add(both, TsIdent.namespaced());

      expect(result).toEqual(both);
    });
  });

  describe("ModuleSpec + operator (add identifier)", () => {
    test("Defaulted + identifier creates Specified with default and new ident", () => {
      const spec = ModuleSpec.defaulted();
      const ident = TsIdent.simple("Component");
      const result = ModuleSpec.add(spec, ident);

      expect(ModuleSpec.isSpecified(result)).toBe(true);
      if (ModuleSpec.isSpecified(result)) {
        expect(result.tsIdents.length).toBe(2);
        expect(result.tsIdents.apply(0).value).toBe("default");
        expect(result.tsIdents.apply(1).value).toBe("Component");
      }
    });

    test("Namespaced + identifier creates Specified with new ident", () => {
      const spec = ModuleSpec.namespaced();
      const ident = TsIdent.simple("map");
      const result = ModuleSpec.add(spec, ident);

      expect(ModuleSpec.isSpecified(result)).toBe(true);
      if (ModuleSpec.isSpecified(result)) {
        expect(result.tsIdents.length).toBe(1);
        expect(result.tsIdents.apply(0).value).toBe("map");
      }
    });

    test("Specified + identifier appends to existing idents", () => {
      const existingIdents = IArray.fromArray<TsIdent>([TsIdent.simple("map")]);
      const spec = ModuleSpec.specified(existingIdents);
      const ident = TsIdent.simple("filter");
      const result = ModuleSpec.add(spec, ident);

      expect(ModuleSpec.isSpecified(result)).toBe(true);
      if (ModuleSpec.isSpecified(result)) {
        expect(result.tsIdents.length).toBe(2);
        expect(result.tsIdents.apply(0).value).toBe("map");
        expect(result.tsIdents.apply(1).value).toBe("filter");
      }
    });

    test("Any spec + namespaced identifier returns same spec", () => {
      const defaulted = ModuleSpec.defaulted();
      const namespaced = ModuleSpec.namespaced();
      const specified = ModuleSpec.specified(IArray.fromArray<TsIdent>([TsIdent.simple("test")]));

      expect(ModuleSpec.add(defaulted, TsIdent.namespaced())).toEqual(defaulted);
      expect(ModuleSpec.add(namespaced, TsIdent.namespaced())).toEqual(namespaced);
      expect(ModuleSpec.add(specified, TsIdent.namespaced())).toEqual(specified);
    });
  });

  describe("JsLocation / operator (tree navigation)", () => {
    test("Zero / TsDeclModule creates Module", () => {
      const zero = JsLocation.zero();
      const module = TsDeclModule.create(
        Comments.empty(),
        false,
        TsIdentModule.simple("lodash"),
        IArray.Empty,
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib'))),
        JsLocation.zero()
      );
      const result = JsLocation.navigate(zero, module);

      expect(JsLocation.isModule(result)).toBe(true);
      if (JsLocation.isModule(result)) {
        expect(result.module).toBe(module.name);
        expect(ModuleSpec.isNamespaced(result.spec)).toBe(true);
      }
    });

    test("Zero / TsAugmentedModule creates Module", () => {
      const zero = JsLocation.zero();
      const augModule = TsAugmentedModule.create(
        Comments.empty(),
        TsIdentModule.simple("lodash"),
        IArray.Empty,
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib'))),
        JsLocation.zero()
      );
      const result = JsLocation.navigate(zero, augModule);

      expect(JsLocation.isModule(result)).toBe(true);
      if (JsLocation.isModule(result)) {
        expect(result.module).toBe(augModule.name);
        expect(ModuleSpec.isNamespaced(result.spec)).toBe(true);
      }
    });

    test("Zero / TsNamedDecl creates Global", () => {
      const zero = JsLocation.zero();
      const classDecl = TsDeclClass.create(
        Comments.empty(),
        false,
        false,
        TsIdent.simple("MyClass"),
        IArray.Empty,
        none,
        IArray.Empty,
        IArray.Empty,
        JsLocation.zero(),
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(zero, classDecl);

      expect(JsLocation.isGlobal(result)).toBe(true);
      if (JsLocation.isGlobal(result)) {
        expect(result.jsPath.parts.length).toBe(1);
        expect(result.jsPath.parts.apply(0).value).toBe("MyClass");
      }
    });

    test("Zero / TsNamedDecl with namespaced name returns Zero", () => {
      const zero = JsLocation.zero();
      const classDecl = TsDeclClass.create(
        Comments.empty(),
        false,
        false,
        TsIdent.namespaced(),
        IArray.Empty,
        none,
        IArray.Empty,
        IArray.Empty,
        JsLocation.zero(),
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(zero, classDecl);

      expect(JsLocation.isZero(result)).toBe(true);
    });

    test("Zero / TsGlobal returns Zero", () => {
      const zero = JsLocation.zero();
      const globalDecl = TsGlobal.create(
        Comments.empty(),
        false,
        IArray.Empty,
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(zero, globalDecl);

      expect(result).toEqual(zero);
    });

    test("Zero / TsDeclEnum creates Global", () => {
      const zero = JsLocation.zero();
      const enumDecl = TsDeclEnum.create(
        Comments.empty(),
        false,
        false,
        TsIdent.simple("Color"),
        IArray.Empty,
        true,
        none,
        JsLocation.zero(),
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(zero, enumDecl);

      // TsDeclEnum is a TsNamedDecl, so it should create a Global location
      expect(JsLocation.isGlobal(result)).toBe(true);
      if (JsLocation.isGlobal(result)) {
        expect(result.jsPath.parts.length).toBe(1);
        expect(result.jsPath.parts.apply(0).value).toBe("Color");
      }
    });
  });

  describe("Global / operator (tree navigation)", () => {
    test("Global / TsDeclModule creates Module", () => {
      const global = JsLocation.global(TsQIdent.ofStrings("window"));
      const module = TsDeclModule.create(
        Comments.empty(),
        false,
        TsIdentModule.simple("lodash"),
        IArray.Empty,
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib'))),
        JsLocation.zero()
      );
      const result = JsLocation.navigate(global, module);

      expect(JsLocation.isModule(result)).toBe(true);
      if (JsLocation.isModule(result)) {
        expect(result.module).toBe(module.name);
        expect(ModuleSpec.isNamespaced(result.spec)).toBe(true);
      }
    });

    test("Global / TsNamedDecl extends path", () => {
      const global = JsLocation.global(TsQIdent.ofStrings("window"));
      const classDecl = TsDeclClass.create(
        Comments.empty(),
        false,
        false,
        TsIdent.simple("console"),
        IArray.Empty,
        none,
        IArray.Empty,
        IArray.Empty,
        JsLocation.zero(),
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(global, classDecl);

      expect(JsLocation.isGlobal(result)).toBe(true);
      if (JsLocation.isGlobal(result)) {
        expect(result.jsPath.parts.length).toBe(2);
        expect(result.jsPath.parts.apply(0).value).toBe("window");
        expect(result.jsPath.parts.apply(1).value).toBe("console");
      }
    });

    test("Global / TsGlobal returns Zero", () => {
      const global = JsLocation.global(TsQIdent.ofStrings("window"));
      const globalDecl = TsGlobal.create(
        Comments.empty(),
        false,
        IArray.Empty,
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(global, globalDecl);

      expect(JsLocation.isZero(result)).toBe(true);
    });

    test("Global / TsDeclEnum extends path", () => {
      const global = JsLocation.global(TsQIdent.ofStrings("window"));
      const enumDecl = TsDeclEnum.create(
        Comments.empty(),
        false,
        false,
        TsIdent.simple("Color"),
        IArray.Empty,
        true,
        none,
        JsLocation.zero(),
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(global, enumDecl);

      // TsDeclEnum is a TsNamedDecl, so it should extend the global path
      expect(JsLocation.isGlobal(result)).toBe(true);
      if (JsLocation.isGlobal(result)) {
        expect(result.jsPath.parts.length).toBe(2);
        expect(result.jsPath.parts.apply(0).value).toBe("window");
        expect(result.jsPath.parts.apply(1).value).toBe("Color");
      }
    });
  });

  describe("Module / operator (tree navigation)", () => {
    test("Module / TsDeclModule creates new Module", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const declModule = TsDeclModule.create(
        Comments.empty(),
        false,
        TsIdentModule.simple("react"),
        IArray.Empty,
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib'))),
        JsLocation.zero()
      );
      const result = JsLocation.navigate(module, declModule);

      expect(JsLocation.isModule(result)).toBe(true);
      if (JsLocation.isModule(result)) {
        expect(result.module).toBe(declModule.name);
        expect(ModuleSpec.isNamespaced(result.spec)).toBe(true);
      }
    });

    test("Module / TsNamedDecl extends spec", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const classDecl = TsDeclClass.create(
        Comments.empty(),
        false,
        false,
        TsIdent.simple("map"),
        IArray.Empty,
        none,
        IArray.Empty,
        IArray.Empty,
        JsLocation.zero(),
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(module, classDecl);

      expect(JsLocation.isModule(result)).toBe(true);
      if (JsLocation.isModule(result)) {
        expect(result.module).toBe(module.module);
        expect(ModuleSpec.isSpecified(result.spec)).toBe(true);
        if (ModuleSpec.isSpecified(result.spec)) {
          expect(result.spec.tsIdents.length).toBe(1);
          expect(result.spec.tsIdents.apply(0).value).toBe("map");
        }
      }
    });

    test("Module / TsDeclEnum extends spec", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const enumDecl = TsDeclEnum.create(
        Comments.empty(),
        false,
        false,
        TsIdent.simple("Color"),
        IArray.Empty,
        true,
        none,
        JsLocation.zero(),
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(module, enumDecl);

      // TsDeclEnum is a TsNamedDecl, so it should extend the module spec
      expect(JsLocation.isModule(result)).toBe(true);
      if (JsLocation.isModule(result)) {
        expect(result.module).toBe(module.module);
        expect(ModuleSpec.isSpecified(result.spec)).toBe(true);
        if (ModuleSpec.isSpecified(result.spec)) {
          expect(result.spec.tsIdents.length).toBe(1);
          expect(result.spec.tsIdents.apply(0).value).toBe("Color");
        }
      }
    });
  });

  describe("Both / operator (tree navigation)", () => {
    test("Both / TsTree delegates to global", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const global = JsLocation.global(TsQIdent.of(TsIdent.simple("_")));
      const both = JsLocation.both(module, global);
      const classDecl = TsDeclClass.create(
        Comments.empty(),
        false,
        false,
        TsIdent.simple("map"),
        IArray.Empty,
        none,
        IArray.Empty,
        IArray.Empty,
        JsLocation.zero(),
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(both, classDecl);

      expect(JsLocation.isBoth(result)).toBe(true);
      if (JsLocation.isBoth(result)) {
        // Check that both module and global were updated
        expect(result.module.module).toBe(module.module);
        expect(result.global.jsPath.parts.length).toBe(2);
        expect(result.global.jsPath.parts.apply(0).value).toBe("_");
        expect(result.global.jsPath.parts.apply(1).value).toBe("map");
      }
    });

    test("Both / TsGlobal returns non-Both result", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const global = JsLocation.global(TsQIdent.of(TsIdent.simple("_")));
      const both = JsLocation.both(module, global);
      const globalDecl = TsGlobal.create(
        Comments.empty(),
        false,
        IArray.Empty,
        CodePath.hasPath(TsIdent.simple('lib'), TsQIdent.of(TsIdent.simple('lib')))
      );
      const result = JsLocation.navigate(both, globalDecl);

      // When global / tree returns Zero (not Global), Both returns that result
      expect(JsLocation.isZero(result)).toBe(true);
    });
  });

  describe("JsLocation Equality", () => {
    test("Zero equality", () => {
      const zero1 = JsLocation.zero();
      const zero2 = JsLocation.zero();

      expect(zero1._tag).toBe(zero2._tag);
      expect(zero1).toEqual(zero2);
    });

    test("Global equality with same path", () => {
      const path = TsQIdent.ofStrings("window", "console");
      const global1 = JsLocation.global(path);
      const global2 = JsLocation.global(path);

      expect(global1).toEqual(global2);
      expect(global1.jsPath).toBe(global2.jsPath);
    });

    test("Global inequality with different paths", () => {
      const global1 = JsLocation.global(TsQIdent.ofStrings("window"));
      const global2 = JsLocation.global(TsQIdent.ofStrings("global"));

      expect(global1).not.toEqual(global2);
      expect(global1.jsPath).not.toBe(global2.jsPath);
    });

    test("Module equality with same components", () => {
      const module = TsIdentModule.simple("lodash");
      const spec = ModuleSpec.namespaced();
      const jsModule1 = JsLocation.module(module, spec);
      const jsModule2 = JsLocation.module(module, spec);

      expect(jsModule1).toEqual(jsModule2);
      expect(jsModule1.module).toBe(jsModule2.module);
      expect(jsModule1.spec).toBe(jsModule2.spec);
    });

    test("Module inequality with different modules", () => {
      const spec = ModuleSpec.namespaced();
      const jsModule1 = JsLocation.module(TsIdentModule.simple("lodash"), spec);
      const jsModule2 = JsLocation.module(TsIdentModule.simple("react"), spec);

      expect(jsModule1).not.toEqual(jsModule2);
    });

    test("Module inequality with different specs", () => {
      const module = TsIdentModule.simple("lodash");
      const jsModule1 = JsLocation.module(module, ModuleSpec.namespaced());
      const jsModule2 = JsLocation.module(module, ModuleSpec.defaulted());

      expect(jsModule1).not.toEqual(jsModule2);
    });

    test("Both equality with same components", () => {
      const module = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const global = JsLocation.global(TsQIdent.of(TsIdent.simple("_")));
      const both1 = JsLocation.both(module, global);
      const both2 = JsLocation.both(module, global);

      expect(both1).toEqual(both2);
      expect(both1.module).toBe(both2.module);
      expect(both1.global).toBe(both2.global);
    });

    test("Both inequality with different components", () => {
      const module1 = JsLocation.module(
        TsIdentModule.simple("lodash"),
        ModuleSpec.namespaced()
      );
      const module2 = JsLocation.module(
        TsIdentModule.simple("react"),
        ModuleSpec.namespaced()
      );
      const global = JsLocation.global(TsQIdent.of(TsIdent.simple("_")));
      const both1 = JsLocation.both(module1, global);
      const both2 = JsLocation.both(module2, global);

      expect(both1).not.toEqual(both2);
    });

    test("Different JsLocation types are not equal", () => {
      const zero = JsLocation.zero();
      const global = JsLocation.global(TsQIdent.ofStrings("test"));
      const module = JsLocation.module(
        TsIdentModule.simple("test"),
        ModuleSpec.namespaced()
      );
      const both = JsLocation.both(module, global);

      expect(zero).not.toEqual(global);
      expect(zero).not.toEqual(module);
      expect(zero).not.toEqual(both);
      expect(global).not.toEqual(module);
      expect(global).not.toEqual(both);
      expect(module).not.toEqual(both);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    test("Global with empty path", () => {
      const global = JsLocation.global(TsQIdent.empty());

      expect(global.jsPath.parts.isEmpty).toBe(true);
      expect(JsLocation.isGlobal(global)).toBe(true);
    });

    test("Module with empty module name", () => {
      const module = TsIdent.module(none, [""]);
      const jsModule = JsLocation.module(module, ModuleSpec.namespaced());

      expect(jsModule.module.value).toBe("");
      expect(ModuleSpec.isNamespaced(jsModule.spec)).toBe(true);
    });

    test("Module with complex scoped name", () => {
      const module = TsIdent.module(some("babel"), ["plugin", "transform", "runtime"]);
      const jsModule = JsLocation.module(module, ModuleSpec.defaulted());

      expect(jsModule.module.value).toBe("@babel/plugin/transform/runtime");
      expect(ModuleSpec.isDefaulted(jsModule.spec)).toBe(true);
    });

    test("Adding empty string identifier", () => {
      const global = JsLocation.global(TsQIdent.ofStrings("window"));
      const emptyIdent = TsIdent.simple("");
      const result = JsLocation.add(global, emptyIdent);

      expect(JsLocation.isGlobal(result)).toBe(true);
      if (JsLocation.isGlobal(result)) {
        expect(result.jsPath.parts.length).toBe(2);
        expect(result.jsPath.parts.apply(0).value).toBe("window");
        expect(result.jsPath.parts.apply(1).value).toBe("");
      }
    });

    test("Module with empty fragments", () => {
      const module = TsIdent.module(none, []);
      const jsModule = JsLocation.module(module, ModuleSpec.namespaced());

      expect(jsModule.module.fragments.length).toBe(0);
      expect(jsModule.module.value).toBe("");
    });

    test("Global with very long path", () => {
      const longPath = TsQIdent.ofStrings(...Array.from({length: 100}, (_, i) => (i + 1).toString()));
      const global = JsLocation.global(longPath);

      expect(global.jsPath.parts.length).toBe(100);
      expect(global.jsPath.parts.apply(0).value).toBe("1");
      expect(global.jsPath.parts.apply(99).value).toBe("100");
    });

    test("Module with unicode characters", () => {
      const module = TsIdent.module(some("测试"), ["库"]);
      const jsModule = JsLocation.module(module, ModuleSpec.namespaced());

      expect(jsModule.module.value).toBe("@测试/库");
      expect(ModuleSpec.isNamespaced(jsModule.spec)).toBe(true);
    });
  });

  describe("HasJsLocation and JsLocationHas traits", () => {
    test("HasJsLocation trait defines required methods", () => {
      const testLocation = JsLocation.zero();
      const hasImpl: HasJsLocation = {
        jsLocation: testLocation,
        withJsLocation: (newLocation: JsLocation): HasJsLocation => ({
          jsLocation: newLocation,
          withJsLocation: (newLoc: JsLocation) => hasImpl
        })
      };

      expect(hasImpl.jsLocation).toBe(testLocation);

      const newLocation = JsLocation.global(TsQIdent.ofStrings("test"));
      const updated = hasImpl.withJsLocation(newLocation);
      expect(updated.jsLocation).toBe(newLocation);
    });

    test("JsLocationHas trait defines required methods", () => {
      const testLocation = JsLocation.zero();
      const hasImpl: JsLocationHas = {
        jsLocation: testLocation,
        withJsLocation: (newLocation: JsLocation): JsLocationHas => ({
          jsLocation: newLocation,
          withJsLocation: (newLoc: JsLocation) => hasImpl
        })
      };

      expect(hasImpl.jsLocation).toBe(testLocation);

      const newLocation = JsLocation.global(TsQIdent.ofStrings("test"));
      const updated = hasImpl.withJsLocation(newLocation);
      expect(updated.jsLocation).toBe(newLocation);
    });
  });

  describe("Singleton constants", () => {
    test("JsLocationZero singleton", () => {
      expect(JsLocationZero._tag).toBe('Zero');
      expect(JsLocation.isZero(JsLocationZero)).toBe(true);
    });
  });
});