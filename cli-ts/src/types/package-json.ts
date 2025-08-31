/**
 * TypeScript interface for package.json structure
 * Equivalent to Scala PackageJson case class
 */
export interface PackageJson {
  /** Package name */
  name?: string;
  
  /** Package version */
  version?: string;
  
  /** Package description */
  description?: string;
  
  /** Main entry point */
  main?: string;
  
  /** TypeScript typings entry point */
  typings?: string;
  
  /** Alternative typings field */
  types?: string;
  
  /** Production dependencies */
  dependencies?: Record<string, string>;
  
  /** Development dependencies */
  devDependencies?: Record<string, string>;
  
  /** Peer dependencies */
  peerDependencies?: Record<string, string>;
  
  /** Optional dependencies */
  optionalDependencies?: Record<string, string>;
  
  /** Package exports configuration */
  exports?: Record<string, any>;
  
  /** Package repository information */
  repository?: {
    type: string;
    url: string;
  };
  
  /** Package keywords */
  keywords?: string[];
  
  /** Package author */
  author?: string | {
    name: string;
    email?: string;
    url?: string;
  };
  
  /** Package license */
  license?: string;
  
  /** Package homepage */
  homepage?: string;
  
  /** Package bugs information */
  bugs?: {
    url?: string;
    email?: string;
  };
  
  /** Package scripts */
  scripts?: Record<string, string>;
  
  /** Package files to include */
  files?: string[];
  
  /** Package bin executables */
  bin?: string | Record<string, string>;
  
  /** Package engines requirements */
  engines?: Record<string, string>;
  
  /** Package OS requirements */
  os?: string[];
  
  /** Package CPU requirements */
  cpu?: string[];
  
  /** Whether package is private */
  private?: boolean;
  
  /** Package distribution information */
  dist?: {
    tarball: string;
    shasum?: string;
    integrity?: string;
  };
}

/**
 * Get all library dependencies from package.json
 */
export function getAllLibs(
  packageJson: PackageJson, 
  options: { dev?: boolean; peer?: boolean } = {}
): Record<string, string> {
  const libs: Record<string, string> = {};
  
  // Always include production dependencies
  if (packageJson.dependencies) {
    Object.assign(libs, packageJson.dependencies);
  }
  
  // Include dev dependencies if requested
  if (options.dev && packageJson.devDependencies) {
    Object.assign(libs, packageJson.devDependencies);
  }
  
  // Include peer dependencies if requested
  if (options.peer && packageJson.peerDependencies) {
    Object.assign(libs, packageJson.peerDependencies);
  }
  
  return libs;
}

/**
 * Empty package.json for defaults
 */
export const EMPTY_PACKAGE_JSON: PackageJson = {};
