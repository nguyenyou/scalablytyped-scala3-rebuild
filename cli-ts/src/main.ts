#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { TracingCommand } from './commands/tracing.js';
import { SourceOnlyCommand } from './commands/source-only.js';
import { ImportDefinitionsCommand } from './commands/import-definitions.js';

const program = new Command();

program
  .name('scalablytyped-ts')
  .description('TypeScript implementation of ScalablyTyped converter')
  .version('0.1.0');

// Main conversion command (equivalent to Tracing)
program
  .command('convert')
  .description('Convert TypeScript definitions to Scala.js (equivalent to Tracing)')
  .option('-o, --output <dir>', 'Output directory for generated sources', './generated-sources')
  .option('--cache <dir>', 'Cache directory for parsed files', './.scalablytyped-cache')
  .option('--pedantic', 'Enable pedantic mode for stricter checking', false)
  .option('--debug', 'Enable debug output', false)
  .action(async (options) => {
    try {
      const command = new TracingCommand(options);
      await command.execute();
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Source-only generation command
program
  .command('generate')
  .description('Generate Scala sources only (equivalent to SourceOnlyMain)')
  .option('-o, --output <dir>', 'Output directory for generated sources', './my-sources')
  .option('--libs <libs...>', 'Specific libraries to generate')
  .action(async (options) => {
    try {
      const command = new SourceOnlyCommand(options);
      await command.execute();
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Import ScalaJS definitions command
program
  .command('import-definitions')
  .description('Import ScalaJS definitions (equivalent to ImportScalajsDefinitions)')
  .action(async () => {
    try {
      const command = new ImportDefinitionsCommand();
      await command.execute();
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Parse command line arguments
program.parse();
