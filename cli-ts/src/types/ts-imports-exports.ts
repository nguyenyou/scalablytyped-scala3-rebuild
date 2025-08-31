/**
 * TypeScript import/export AST nodes
 * Equivalent to Scala import/export definitions in trees.scala
 */

import {
  TsDecl,
  Comments,
  CodePath,
  TsIdentSimple,
  TsIdentModule,
  IArray
} from './ts-ast.js';

/**
 * TypeScript import declaration
 * Equivalent to Scala TsImport
 */
export class TsImport extends TsDecl {
  readonly nodeType = 'TsImport';

  constructor(
    comments: Comments,
    public readonly typeOnly: boolean,
    public readonly imported: TsImported,
    codePath: CodePath
  ) {
    super(comments, codePath);
  }
}

/**
 * TypeScript imported items
 * Equivalent to Scala TsImported
 */
export abstract class TsImported {
  abstract readonly nodeType: string;
}

/**
 * Star import: import * as name from "module"
 */
export class TsImportedStar extends TsImported {
  readonly nodeType = 'TsImportedStar';

  constructor(
    public readonly as: TsIdentSimple,
    public readonly from: TsIdentModule
  ) {
    super();
  }
}

/**
 * Destructuring import: import { a, b } from "module"
 */
export class TsImportedDestructuring extends TsImported {
  readonly nodeType = 'TsImportedDestructuring';

  constructor(
    public readonly elements: IArray<TsImportedElement>,
    public readonly from: TsIdentModule
  ) {
    super();
  }
}

/**
 * Simple import: import "module"
 */
export class TsImportedSimple extends TsImported {
  readonly nodeType = 'TsImportedSimple';

  constructor(public readonly from: TsIdentModule) {
    super();
  }
}

/**
 * Individual imported element
 */
export class TsImportedElement {
  constructor(
    public readonly name: TsIdentSimple,
    public readonly as: TsIdentSimple | undefined
  ) {}
}

/**
 * TypeScript export declaration
 * Equivalent to Scala TsExport
 */
export class TsExport extends TsDecl {
  readonly nodeType = 'TsExport';

  constructor(
    comments: Comments,
    public readonly typeOnly: boolean,
    public readonly tpe: ExportType,
    public readonly exported: TsExportee,
    codePath: CodePath
  ) {
    super(comments, codePath);
  }
}

/**
 * Export types
 * Equivalent to Scala ExportType
 */
export enum ExportType {
  Named = 'Named',
  Default = 'Default'
}

/**
 * TypeScript exported items
 * Equivalent to Scala TsExportee
 */
export abstract class TsExportee {
  abstract readonly nodeType: string;
}

/**
 * Tree export: export { declaration }
 */
export class TsExporteeTree extends TsExportee {
  readonly nodeType = 'TsExporteeTree';

  constructor(public readonly tree: any) { // TsTree - will be properly typed later
    super();
  }
}

/**
 * Names export: export { a, b }
 */
export class TsExporteeNames extends TsExportee {
  readonly nodeType = 'TsExporteeNames';

  constructor(
    public readonly idents: IArray<TsExportedName>,
    public readonly from: TsIdentModule | undefined
  ) {
    super();
  }
}

/**
 * Star export: export * from "module"
 */
export class TsExporteeStar extends TsExportee {
  readonly nodeType = 'TsExporteeStar';

  constructor(
    public readonly as: TsIdentSimple | undefined,
    public readonly from: TsIdentModule
  ) {
    super();
  }
}

/**
 * Individual exported name
 */
export class TsExportedName {
  constructor(
    public readonly name: TsIdentSimple,
    public readonly as: TsIdentSimple | undefined
  ) {}
}

/**
 * Export as namespace declaration
 * Equivalent to Scala ExportAsNamespace
 */
export class ExportAsNamespace extends TsDecl {
  readonly nodeType = 'ExportAsNamespace';

  constructor(
    comments: Comments,
    public readonly ident: TsIdentSimple,
    codePath: CodePath
  ) {
    super(comments, codePath);
  }
}

/**
 * TypeScript global declaration
 * Equivalent to Scala TsGlobal
 */
export class TsGlobal extends TsDecl {
  readonly nodeType = 'TsGlobal';

  constructor(
    comments: Comments,
    public readonly declared: boolean,
    public readonly members: IArray<any>, // TsContainerOrDecl - will be properly typed later
    codePath: CodePath
  ) {
    super(comments, codePath);
  }
}

/**
 * Helper functions for creating import/export nodes
 */
export namespace ImportExportHelpers {
  export function starImport(
    as: string,
    from: string,
    options: {
      comments?: Comments;
      typeOnly?: boolean;
    } = {}
  ): TsImport {
    return new TsImport(
      options.comments ?? Comments.NoComments,
      options.typeOnly ?? false,
      new TsImportedStar(
        new TsIdentSimple(as),
        TsIdentModule.simple(from)
      ),
      CodePath.NoPath
    );
  }

  export function destructuringImport(
    elements: Array<{ name: string; as?: string }>,
    from: string,
    options: {
      comments?: Comments;
      typeOnly?: boolean;
    } = {}
  ): TsImport {
    const importedElements = elements.map(
      el => new TsImportedElement(
        new TsIdentSimple(el.name),
        el.as ? new TsIdentSimple(el.as) : undefined
      )
    );

    return new TsImport(
      options.comments ?? Comments.NoComments,
      options.typeOnly ?? false,
      new TsImportedDestructuring(
        IArray.from(importedElements),
        TsIdentModule.simple(from)
      ),
      CodePath.NoPath
    );
  }

  export function simpleImport(
    from: string,
    options: {
      comments?: Comments;
      typeOnly?: boolean;
    } = {}
  ): TsImport {
    return new TsImport(
      options.comments ?? Comments.NoComments,
      options.typeOnly ?? false,
      new TsImportedSimple(TsIdentModule.simple(from)),
      CodePath.NoPath
    );
  }

  export function namedExport(
    names: Array<{ name: string; as?: string }>,
    from?: string,
    options: {
      comments?: Comments;
      typeOnly?: boolean;
    } = {}
  ): TsExport {
    const exportedNames = names.map(
      n => new TsExportedName(
        new TsIdentSimple(n.name),
        n.as ? new TsIdentSimple(n.as) : undefined
      )
    );

    return new TsExport(
      options.comments ?? Comments.NoComments,
      options.typeOnly ?? false,
      ExportType.Named,
      new TsExporteeNames(
        IArray.from(exportedNames),
        from ? TsIdentModule.simple(from) : undefined
      ),
      CodePath.NoPath
    );
  }

  export function starExport(
    from: string,
    as?: string,
    options: {
      comments?: Comments;
      typeOnly?: boolean;
    } = {}
  ): TsExport {
    return new TsExport(
      options.comments ?? Comments.NoComments,
      options.typeOnly ?? false,
      ExportType.Named,
      new TsExporteeStar(
        as ? new TsIdentSimple(as) : undefined,
        TsIdentModule.simple(from)
      ),
      CodePath.NoPath
    );
  }
}
