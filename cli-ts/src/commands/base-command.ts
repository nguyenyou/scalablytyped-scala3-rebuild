import chalk from 'chalk';
import ora, { type Ora } from 'ora';

/**
 * Base interface for all CLI commands
 */
export interface CommandOptions {
  output?: string;
  cache?: string;
  pedantic?: boolean;
  debug?: boolean;
  libs?: string[];
}

/**
 * Abstract base class for CLI commands
 */
export abstract class BaseCommand {
  protected options: CommandOptions;
  protected spinner: Ora;

  constructor(options: CommandOptions = {}) {
    this.options = options;
    this.spinner = ora();
  }

  /**
   * Execute the command
   */
  abstract execute(): Promise<void>;

  /**
   * Log info message
   */
  protected info(message: string): void {
    if (this.options.debug) {
      console.log(chalk.blue('INFO:'), message);
    }
  }

  /**
   * Log debug message
   */
  protected debug(message: string): void {
    if (this.options.debug) {
      console.log(chalk.gray('DEBUG:'), message);
    }
  }

  /**
   * Log warning message
   */
  protected warn(message: string): void {
    console.log(chalk.yellow('WARN:'), message);
  }

  /**
   * Log error message
   */
  protected error(message: string): void {
    console.error(chalk.red('ERROR:'), message);
  }

  /**
   * Log success message
   */
  protected success(message: string): void {
    console.log(chalk.green('SUCCESS:'), message);
  }

  /**
   * Start spinner with message
   */
  protected startSpinner(message: string): void {
    this.spinner.start(message);
  }

  /**
   * Update spinner message
   */
  protected updateSpinner(message: string): void {
    this.spinner.text = message;
  }

  /**
   * Stop spinner with success
   */
  protected succeedSpinner(message?: string): void {
    this.spinner.succeed(message);
  }

  /**
   * Stop spinner with failure
   */
  protected failSpinner(message?: string): void {
    this.spinner.fail(message);
  }

  /**
   * Stop spinner
   */
  protected stopSpinner(): void {
    this.spinner.stop();
  }
}
