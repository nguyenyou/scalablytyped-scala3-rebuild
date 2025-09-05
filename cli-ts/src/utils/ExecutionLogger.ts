/**
 * TypeScript port of org.scalablytyped.converter.cli.ExecutionLogger
 * Dedicated execution logging module for CLI applications. Provides comprehensive logging with sequential step
 * numbering, timestamps, and human-readable output to both console and file.
 */

import chalk from "chalk";
import * as fs from "fs-extra";
import * as path from "path";

export class ExecutionLogger {
	private stepCounter = 0;
	private logFilePath: string;
	private workingDirectory: string;
	private outputDirectory: string;
	private logWriter?: fs.WriteStream;

	constructor(
		logFilePath: string,
		workingDirectory: string,
		outputDirectory: string,
	) {
		this.logFilePath = logFilePath;
		this.workingDirectory = workingDirectory;
		this.outputDirectory = outputDirectory;
	}

	/**
	 * Factory method to create an ExecutionLogger with default log file name in the working directory.
	 */
	static create(
		workingDirectory: string,
		outputDirectory: string,
	): ExecutionLogger {
		const logFilePath = path.join(workingDirectory, "ts-execution-logs.txt");
		return new ExecutionLogger(logFilePath, workingDirectory, outputDirectory);
	}

	/**
	 * Factory method to create an ExecutionLogger with a custom log file path.
	 */
	static withCustomPath(
		logFilePath: string,
		workingDirectory: string,
		outputDirectory: string,
	): ExecutionLogger {
		return new ExecutionLogger(logFilePath, workingDirectory, outputDirectory);
	}

	/**
	 * Initialize the execution log with header information. Should be called at the start of execution.
	 */
	async initializeExecutionLog(): Promise<void> {
		this.stepCounter = 0;
		const startTime = new Date()
			.toISOString()
			.replace("T", " ")
			.substring(0, 19);

		// Ensure log directory exists
		await fs.ensureDir(path.dirname(this.logFilePath));

		// Create write stream (overwrite existing file)
		this.logWriter = fs.createWriteStream(this.logFilePath, { flags: "w" });

		this.logWriter.write("=== ScalablyTyped Converter Execution Log ===\n");
		this.logWriter.write(`Started at: ${startTime}\n`);
		this.logWriter.write(`Working directory: ${this.workingDirectory}\n`);
		this.logWriter.write(`Output directory: ${this.outputDirectory}\n`);
		this.logWriter.write("=".repeat(50) + "\n");
		this.logWriter.write("\n");
	}

	/**
	 * Log a major execution step with automatic sequential numbering.
	 */
	logStep(message: string): void {
		this.stepCounter += 1;
		const stepMessage = `Step ${this.stepCounter}: ${message}`;

		// Log to console with color
		console.log(chalk.blue(stepMessage));

		// Log to file
		if (this.logWriter) {
			this.logWriter.write(stepMessage + "\n");
		}
	}

	/**
	 * Log progress within a step with indentation.
	 */
	logProgress(message: string): void {
		const progressMessage = `  → ${message}`;

		// Log to console with color
		console.log(chalk.gray(progressMessage));

		// Log to file
		if (this.logWriter) {
			this.logWriter.write(progressMessage + "\n");
		}
	}

	/**
	 * Log an error message with optional exception details.
	 */
	logError(message: string, error?: Error): void {
		const errorMessage = error
			? `${message}\nERROR: ${error.message}`
			: message;

		// Log to console with color
		console.error(chalk.red(errorMessage));

		// Log to file
		if (this.logWriter) {
			this.logWriter.write(errorMessage + "\n");
		}
	}

	/**
	 * Log a warning message.
	 */
	logWarning(message: string): void {
		// Log to console with color
		console.warn(chalk.yellow(message));

		// Log to file
		if (this.logWriter) {
			this.logWriter.write(message + "\n");
		}
	}

	/**
	 * Finalize the execution log with footer information and close resources. Should be called at the end of execution.
	 */
	async finalizeExecutionLog(success: boolean): Promise<void> {
		if (this.logWriter) {
			const endTime = new Date()
				.toISOString()
				.replace("T", " ")
				.substring(0, 19);

			this.logWriter.write("\n");
			this.logWriter.write("=".repeat(50) + "\n");
			this.logWriter.write(
				`Execution ${success ? "completed successfully" : "failed"} at: ${endTime}\n`,
			);
			this.logWriter.write(`Total steps executed: ${this.stepCounter}\n`);

			// Close the write stream
			this.logWriter.end();
			this.logWriter = undefined;
		}
	}

	/**
	 * Get the current step count.
	 */
	getCurrentStepCount(): number {
		return this.stepCounter;
	}
}
