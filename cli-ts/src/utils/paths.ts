import * as fs from "fs-extra";
import * as path from "path";

/**
 * Utility class for managing file paths in the project
 * Equivalent to Scala Paths class
 */
export class Paths {
	private readonly basePath: string;

	constructor(basePath: string) {
		this.basePath = path.resolve(basePath);
	}

	/**
	 * Get the output directory path
	 */
	get out(): string {
		return this.getExistingPath("out");
	}

	/**
	 * Get the node_modules directory path
	 */
	get nodeModules(): string {
		const nodeModulesPath = path.join(this.basePath, "node_modules");
		if (!fs.existsSync(nodeModulesPath)) {
			throw new Error(`node_modules directory not found at ${nodeModulesPath}`);
		}
		return nodeModulesPath;
	}

	/**
	 * Get the package.json file path
	 */
	get packageJson(): string {
		const packageJsonPath = path.join(this.basePath, "package.json");
		if (!fs.existsSync(packageJsonPath)) {
			throw new Error(`package.json not found at ${packageJsonPath}`);
		}
		return packageJsonPath;
	}

	/**
	 * Get the @types directory path if it exists
	 */
	get typesDirectory(): string | undefined {
		const typesPath = path.join(this.nodeModules, "@types");
		return fs.existsSync(typesPath) ? typesPath : undefined;
	}

	/**
	 * Get the TypeScript lib directory path
	 */
	get typescriptLib(): string {
		const tsLibPath = path.join(this.nodeModules, "typescript", "lib");
		if (!fs.existsSync(tsLibPath)) {
			throw new Error(
				`TypeScript lib directory not found at ${tsLibPath}. Make sure typescript is installed as a dependency.`,
			);
		}
		return tsLibPath;
	}

	/**
	 * Get a path relative to the base directory
	 */
	resolve(...pathSegments: string[]): string {
		return path.resolve(this.basePath, ...pathSegments);
	}

	/**
	 * Get a path relative to the base directory, ensuring it exists
	 */
	private getExistingPath(relativePath: string): string {
		const fullPath = path.join(this.basePath, relativePath);
		if (!fs.existsSync(fullPath)) {
			throw new Error(`Path does not exist: ${fullPath}`);
		}
		return fullPath;
	}

	/**
	 * Check if a path exists relative to the base directory
	 */
	exists(relativePath: string): boolean {
		return fs.existsSync(path.join(this.basePath, relativePath));
	}

	/**
	 * Get the base directory path
	 */
	get base(): string {
		return this.basePath;
	}
}
