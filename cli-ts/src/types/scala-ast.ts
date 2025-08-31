/**
 * Scala AST data structures for code generation
 * Equivalent to Scala scalajs/tree.scala
 */

import { Comments, IArray } from './ts-ast.js';

/**
 * Base trait for all Scala AST nodes
 * Equivalent to Scala Tree
 */
export abstract class ScalaTree {
  abstract readonly nodeType: string;
  
  constructor(
    public readonly comments: Comments,
    public readonly codePath: ScalaQualifiedName
  ) {}
}

/**
 * Scala qualified name
 * Equivalent to Scala QualifiedName
 */
export class ScalaQualifiedName {
  constructor(public readonly parts: string[]) {}

  static from(parts: string[]): ScalaQualifiedName {
    return new ScalaQualifiedName(parts);
  }

  add(part: string): ScalaQualifiedName {
    return new ScalaQualifiedName([...this.parts, part]);
  }

  get value(): string {
    return this.parts.join('.');
  }
}

/**
 * Scala name
 * Equivalent to Scala Name
 */
export class ScalaName {
  constructor(public readonly value: string) {}

  static typings = new ScalaName('typings');
  static dummy = new ScalaName('dummy');
}

/**
 * Scala package tree
 * Equivalent to Scala PackageTree
 */
export class ScalaPackageTree extends ScalaTree {
  readonly nodeType = 'PackageTree';

  constructor(
    public readonly annotations: IArray<ScalaAnnotation>,
    public readonly name: ScalaName,
    public readonly members: IArray<ScalaTree>,
    comments: Comments,
    codePath: ScalaQualifiedName
  ) {
    super(comments, codePath);
  }

  withMembers(newMembers: IArray<ScalaTree>): ScalaPackageTree {
    return new ScalaPackageTree(
      this.annotations,
      this.name,
      newMembers,
      this.comments,
      this.codePath
    );
  }
}

/**
 * Scala class tree
 * Equivalent to Scala ClassTree
 */
export class ScalaClassTree extends ScalaTree {
  readonly nodeType = 'ClassTree';

  constructor(
    public readonly isImplicit: boolean,
    public readonly annotations: IArray<ScalaAnnotation>,
    public readonly level: ScalaProtectionLevel,
    public readonly name: ScalaName,
    public readonly tparams: IArray<ScalaTypeParamTree>,
    public readonly parents: IArray<ScalaTypeRef>,
    public readonly ctors: IArray<ScalaCtorTree>,
    public readonly members: IArray<ScalaTree>,
    public readonly classType: ScalaClassType,
    public readonly isSealed: boolean,
    comments: Comments,
    codePath: ScalaQualifiedName
  ) {
    super(comments, codePath);
  }

  get isScalaJsDefined(): boolean {
    return this.annotations.some(ann => ann.name === 'ScalaJSDefined');
  }

  get isNative(): boolean {
    return this.annotations.some(ann => 
      ann.name === 'JsNative' || ann.name === 'ScalaJSDefined'
    );
  }
}

/**
 * Scala module tree (object)
 * Equivalent to Scala ModuleTree
 */
export class ScalaModuleTree extends ScalaTree {
  readonly nodeType = 'ModuleTree';

  constructor(
    public readonly annotations: IArray<ScalaAnnotation>,
    public readonly level: ScalaProtectionLevel,
    public readonly name: ScalaName,
    public readonly parents: IArray<ScalaTypeRef>,
    public readonly members: IArray<ScalaTree>,
    comments: Comments,
    codePath: ScalaQualifiedName,
    public readonly isOverride: boolean
  ) {
    super(comments, codePath);
  }

  get isScalaJsDefined(): boolean {
    return this.annotations.some(ann => ann.name === 'ScalaJSDefined');
  }

  get isNative(): boolean {
    return this.annotations.some(ann => 
      ann.name === 'JsNative' || ann.name === 'ScalaJSDefined'
    );
  }
}

/**
 * Scala method tree
 * Equivalent to Scala MethodTree
 */
export class ScalaMethodTree extends ScalaTree {
  readonly nodeType = 'MethodTree';

  constructor(
    public readonly annotations: IArray<ScalaAnnotation>,
    public readonly level: ScalaProtectionLevel,
    public readonly name: ScalaName,
    public readonly tparams: IArray<ScalaTypeParamTree>,
    public readonly params: IArray<IArray<ScalaParamTree>>,
    public readonly resultType: ScalaTypeRef,
    comments: Comments,
    codePath: ScalaQualifiedName,
    public readonly isOverride: boolean,
    public readonly isImplicit: boolean
  ) {
    super(comments, codePath);
  }
}

/**
 * Scala field tree
 * Equivalent to Scala FieldTree
 */
export class ScalaFieldTree extends ScalaTree {
  readonly nodeType = 'FieldTree';

  constructor(
    public readonly annotations: IArray<ScalaAnnotation>,
    public readonly level: ScalaProtectionLevel,
    public readonly name: ScalaName,
    public readonly tpe: ScalaTypeRef,
    comments: Comments,
    codePath: ScalaQualifiedName,
    public readonly isReadOnly: boolean,
    public readonly isOverride: boolean,
    public readonly isImplicit: boolean
  ) {
    super(comments, codePath);
  }
}

/**
 * Scala type reference
 * Equivalent to Scala TypeRef
 */
export class ScalaTypeRef {
  constructor(
    public readonly typeName: ScalaQualifiedName,
    public readonly targs: IArray<ScalaTypeRef>,
    public readonly comments: Comments
  ) {}

  // Common Scala types
  static readonly Any = new ScalaTypeRef(
    ScalaQualifiedName.from(['scala', 'Any']),
    IArray.Empty,
    Comments.NoComments
  );

  static readonly Unit = new ScalaTypeRef(
    ScalaQualifiedName.from(['scala', 'Unit']),
    IArray.Empty,
    Comments.NoComments
  );

  static readonly String = new ScalaTypeRef(
    ScalaQualifiedName.from(['java', 'lang', 'String']),
    IArray.Empty,
    Comments.NoComments
  );

  static readonly Boolean = new ScalaTypeRef(
    ScalaQualifiedName.from(['scala', 'Boolean']),
    IArray.Empty,
    Comments.NoComments
  );

  static readonly Double = new ScalaTypeRef(
    ScalaQualifiedName.from(['scala', 'Double']),
    IArray.Empty,
    Comments.NoComments
  );

  static readonly Int = new ScalaTypeRef(
    ScalaQualifiedName.from(['scala', 'Int']),
    IArray.Empty,
    Comments.NoComments
  );
}

/**
 * Scala annotations
 * Equivalent to Scala Annotation
 */
export class ScalaAnnotation {
  constructor(
    public readonly name: string,
    public readonly targs: IArray<ScalaTypeRef> = IArray.Empty,
    public readonly args: IArray<any> = IArray.Empty
  ) {}

  static readonly JsNative = new ScalaAnnotation('JsNative');
  static readonly ScalaJSDefined = new ScalaAnnotation('ScalaJSDefined');
  static readonly JSImport = new ScalaAnnotation('JSImport');
  static readonly JSGlobal = new ScalaAnnotation('JSGlobal');
}

/**
 * Scala protection levels
 * Equivalent to Scala ProtectionLevel
 */
export enum ScalaProtectionLevel {
  Public = 'public',
  Private = 'private',
  Protected = 'protected',
  PrivateThis = 'private[this]',
  ProtectedThis = 'protected[this]'
}

/**
 * Scala class types
 * Equivalent to Scala ClassType
 */
export enum ScalaClassType {
  Class = 'class',
  Trait = 'trait',
  Object = 'object'
}

/**
 * Scala type parameter
 * Equivalent to Scala TypeParamTree
 */
export class ScalaTypeParamTree {
  constructor(
    public readonly name: ScalaName,
    public readonly upperBounds: IArray<ScalaTypeRef>,
    public readonly lowerBounds: IArray<ScalaTypeRef>
  ) {}
}

/**
 * Scala constructor
 * Equivalent to Scala CtorTree
 */
export class ScalaCtorTree {
  constructor(
    public readonly level: ScalaProtectionLevel,
    public readonly params: IArray<IArray<ScalaParamTree>>,
    public readonly isImplicit: boolean
  ) {}
}

/**
 * Scala parameter
 * Equivalent to Scala ParamTree
 */
export class ScalaParamTree {
  constructor(
    public readonly name: ScalaName,
    public readonly tpe: ScalaTypeRef,
    public readonly isImplicit: boolean,
    public readonly isDefault: boolean
  ) {}
}
