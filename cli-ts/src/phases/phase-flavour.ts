import { Phase, PhaseResult } from './rec-phase.js';
import { Phase2Result, LibScalaJs } from './phase2-to-scalajs.js';
import {
  ScalaTree,
  ScalaPackageTree,
  ScalaClassTree,
  ScalaModuleTree,
  ScalaMethodTree,
  ScalaFieldTree,
  ScalaTypeRef,
  ScalaAnnotation,
  ScalaQualifiedName,
  ScalaName,
  ScalaProtectionLevel,
  ScalaClassType
} from '../types/scala-ast.js';
import { Flavour } from '../types/conversion-options.js';
import { IArray, Comments } from '../types/index.js';

/**
 * Configuration for PhaseFlavour
 */
export interface PhaseFlavourConfig {
  flavour: Flavour;
  privateWithin?: string;
}

/**
 * Result of PhaseFlavour
 */
export interface PhaseFlavourResult {
  libScalaJs: LibScalaJs;
  packageTree: ScalaPackageTree;
  companionObjects: ScalaModuleTree[];
  optimizedTrees: ScalaTree[];
}

/**
 * Phase 3: Apply flavour-specific transformations
 * Equivalent to Scala PhaseFlavour
 */
export class PhaseFlavour implements Phase<Phase2Result, Phase2Result, PhaseFlavourResult> {
  constructor(private readonly config: PhaseFlavourConfig) {}

  async execute(id: Phase2Result, input: Phase2Result): Promise<PhaseResult<PhaseFlavourResult>> {
    try {
      console.log(`PhaseFlavour: Applying ${this.config.flavour} flavour to ${input.libScalaJs.libName}`);

      // Apply flavour-specific transformations
      const transformedPackageTree = await this.applyFlavourTransformations(input.packageTree);

      // Generate companion objects for ScalaJS defined traits
      const companionObjects = await this.generateCompanionObjects(transformedPackageTree);

      // Apply final optimizations
      const optimizedTrees = await this.applyOptimizations(transformedPackageTree, companionObjects);

      // Create updated library with transformations
      const updatedLibScalaJs = new LibScalaJs(
        input.libScalaJs.libName,
        input.libScalaJs.version,
        transformedPackageTree,
        input.libScalaJs.dependencies
      );

      console.log(`PhaseFlavour: Successfully applied ${this.config.flavour} flavour to ${input.libScalaJs.libName}`);

      return PhaseResult.success({
        libScalaJs: updatedLibScalaJs,
        packageTree: transformedPackageTree,
        companionObjects,
        optimizedTrees
      });
    } catch (error) {
      console.error(`PhaseFlavour: Failed to apply flavour to ${input.libScalaJs.libName}:`, error);
      return PhaseResult.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Apply flavour-specific transformations
   */
  private async applyFlavourTransformations(packageTree: ScalaPackageTree): Promise<ScalaPackageTree> {
    switch (this.config.flavour) {
      case 'Normal':
        return this.applyNormalFlavour(packageTree);
      case 'Japgolly':
        return this.applyJapgollyFlavour(packageTree);
      case 'SlinkyNative':
        return this.applySlinkyNativeFlavour(packageTree);
      default:
        return packageTree;
    }
  }

  /**
   * Apply Normal flavour transformations
   */
  private applyNormalFlavour(packageTree: ScalaPackageTree): ScalaPackageTree {
    // Normal flavour: minimal transformations, standard Scala.js patterns
    const transformedMembers = packageTree.members.map(member => {
      if (member instanceof ScalaClassTree) {
        return this.applyNormalClassTransformations(member);
      } else if (member instanceof ScalaModuleTree) {
        return this.applyNormalModuleTransformations(member);
      }
      return member;
    });

    return packageTree.withMembers(IArray.from(transformedMembers));
  }

  /**
   * Apply Japgolly flavour transformations
   */
  private applyJapgollyFlavour(packageTree: ScalaPackageTree): ScalaPackageTree {
    // Japgolly flavour: transformations for japgolly/scalajs-react compatibility
    const transformedMembers = packageTree.members.map(member => {
      if (member instanceof ScalaClassTree) {
        return this.applyJapgollyClassTransformations(member);
      } else if (member instanceof ScalaModuleTree) {
        return this.applyJapgollyModuleTransformations(member);
      }
      return member;
    });

    return packageTree.withMembers(IArray.from(transformedMembers));
  }

  /**
   * Apply SlinkyNative flavour transformations
   */
  private applySlinkyNativeFlavour(packageTree: ScalaPackageTree): ScalaPackageTree {
    // SlinkyNative flavour: transformations for Slinky React framework
    const transformedMembers = packageTree.members.map(member => {
      if (member instanceof ScalaClassTree) {
        return this.applySlinkyClassTransformations(member);
      } else if (member instanceof ScalaModuleTree) {
        return this.applySlinkyModuleTransformations(member);
      }
      return member;
    });

    return packageTree.withMembers(IArray.from(transformedMembers));
  }

  /**
   * Generate companion objects for ScalaJS defined traits
   */
  private async generateCompanionObjects(packageTree: ScalaPackageTree): Promise<ScalaModuleTree[]> {
    const companionObjects: ScalaModuleTree[] = [];

    for (const member of packageTree.members) {
      if (member instanceof ScalaClassTree && this.needsCompanionObject(member)) {
        const companion = this.createCompanionObject(member);
        companionObjects.push(companion);
      }
    }

    return companionObjects;
  }

  /**
   * Check if a class needs a companion object
   */
  private needsCompanionObject(classTree: ScalaClassTree): boolean {
    // Generate companion objects for ScalaJS defined traits
    return classTree.classType === ScalaClassType.Trait &&
           classTree.isScalaJsDefined;
  }

  /**
   * Create a companion object for a class
   */
  private createCompanionObject(classTree: ScalaClassTree): ScalaModuleTree {
    const companionName = classTree.name;
    const annotations = [ScalaAnnotation.JSImport];

    // Add factory methods and implicit conversions
    const members: ScalaTree[] = [];

    // TODO: Add specific companion object members based on the class

    return new ScalaModuleTree(
      IArray.from(annotations),
      ScalaProtectionLevel.Public,
      companionName,
      IArray.Empty, // No parent objects
      IArray.from(members),
      Comments.NoComments,
      classTree.codePath,
      false // isOverride
    );
  }

  /**
   * Apply final optimizations
   */
  private async applyOptimizations(
    packageTree: ScalaPackageTree,
    companionObjects: ScalaModuleTree[]
  ): Promise<ScalaTree[]> {
    const allTrees: ScalaTree[] = [...packageTree.members, ...companionObjects];

    // Apply various optimizations
    const optimized = allTrees.map(tree => {
      return this.optimizeTree(tree);
    });

    return optimized;
  }

  /**
   * Optimize a single tree
   */
  private optimizeTree(tree: ScalaTree): ScalaTree {
    // Apply various optimizations:
    // 1. Remove duplicate members
    // 2. Optimize method signatures
    // 3. Apply private within scoping
    // 4. Clean up unused imports

    if (tree instanceof ScalaClassTree) {
      return this.optimizeClass(tree);
    } else if (tree instanceof ScalaModuleTree) {
      return this.optimizeModule(tree);
    }

    return tree;
  }

  /**
   * Optimize a class tree
   */
  private optimizeClass(classTree: ScalaClassTree): ScalaClassTree {
    // Apply private within scoping if configured
    let level = classTree.level;
    if (this.config.privateWithin) {
      // TODO: Apply private within scoping
    }

    // Remove duplicate methods
    const optimizedMembers = this.removeDuplicateMembers(classTree.members);

    return new ScalaClassTree(
      classTree.isImplicit,
      classTree.annotations,
      level,
      classTree.name,
      classTree.tparams,
      classTree.parents,
      classTree.ctors,
      IArray.from(optimizedMembers),
      classTree.classType,
      classTree.isSealed,
      classTree.comments,
      classTree.codePath
    );
  }

  /**
   * Optimize a module tree
   */
  private optimizeModule(moduleTree: ScalaModuleTree): ScalaModuleTree {
    // Apply private within scoping if configured
    let level = moduleTree.level;
    if (this.config.privateWithin) {
      // TODO: Apply private within scoping
    }

    // Remove duplicate members
    const optimizedMembers = this.removeDuplicateMembers(moduleTree.members);

    return new ScalaModuleTree(
      moduleTree.annotations,
      level,
      moduleTree.name,
      moduleTree.parents,
      IArray.from(optimizedMembers),
      moduleTree.comments,
      moduleTree.codePath,
      moduleTree.isOverride
    );
  }

  /**
   * Remove duplicate members from a list
   */
  private removeDuplicateMembers(members: IArray<ScalaTree>): ScalaTree[] {
    const seen = new Set<string>();
    const unique: ScalaTree[] = [];

    for (const member of members) {
      const key = this.getMemberKey(member);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(member);
      }
    }

    return unique;
  }

  /**
   * Get a unique key for a member
   */
  private getMemberKey(member: ScalaTree): string {
    if (member instanceof ScalaMethodTree) {
      return `method:${member.name.value}:${member.params.length}`;
    } else if (member instanceof ScalaFieldTree) {
      return `field:${member.name.value}`;
    } else if (member instanceof ScalaClassTree) {
      return `class:${member.name.value}`;
    } else if (member instanceof ScalaModuleTree) {
      return `module:${member.name.value}`;
    }
    return member.nodeType;
  }

  // Flavour-specific transformation methods (placeholders)
  private applyNormalClassTransformations(classTree: ScalaClassTree): ScalaClassTree {
    // TODO: Implement Normal flavour class transformations
    return classTree;
  }

  private applyNormalModuleTransformations(moduleTree: ScalaModuleTree): ScalaModuleTree {
    // TODO: Implement Normal flavour module transformations
    return moduleTree;
  }

  private applyJapgollyClassTransformations(classTree: ScalaClassTree): ScalaClassTree {
    // TODO: Implement Japgolly flavour class transformations
    // This might include adding React component mixins, etc.
    return classTree;
  }

  private applyJapgollyModuleTransformations(moduleTree: ScalaModuleTree): ScalaModuleTree {
    // TODO: Implement Japgolly flavour module transformations
    return moduleTree;
  }

  private applySlinkyClassTransformations(classTree: ScalaClassTree): ScalaClassTree {
    // TODO: Implement Slinky flavour class transformations
    // This might include Slinky-specific React component patterns
    return classTree;
  }

  private applySlinkyModuleTransformations(moduleTree: ScalaModuleTree): ScalaModuleTree {
    // TODO: Implement Slinky flavour module transformations
    return moduleTree;
  }
}