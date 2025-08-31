# ScalablyTyped CLI - TypeScript Implementation

This is a TypeScript port of the ScalablyTyped CLI tool that converts TypeScript definitions to Scala.js sources.

## Overview

The TypeScript CLI implementation provides the same functionality as the original Scala implementation:

- **Convert**: Main conversion command (equivalent to `Tracing`)
- **Generate**: Source-only generation (equivalent to `SourceOnlyMain`)
- **Import-definitions**: Import ScalaJS definitions (equivalent to `ImportScalajsDefinitions`)

## Architecture

The CLI is structured with the following components:

### Commands
- `TracingCommand`: Main conversion pipeline
- `SourceOnlyCommand`: Simplified source generation
- `ImportDefinitionsCommand`: ScalaJS definitions import

### Core Components
- `Bootstrap`: Library discovery and initialization
- `PersistingParser`: TypeScript parsing with caching
- `Paths`: File path utilities

### Transformation Phases
- `Phase1ReadTypescript`: Parse TypeScript files and implement module system
- `Phase2ToScalaJs`: Convert TypeScript AST to Scala AST
- `PhaseFlavour`: Apply flavour-specific transformations

### Types
- `ConversionOptions`: Configuration for the conversion process
- `PackageJson`: TypeScript interface for package.json structure

## Usage

```bash
# Install dependencies
bun install

# Build the CLI
bun run build

# Run conversion
bun run dist/main.js convert --output ./generated-sources

# Or use the development version
bun run dev convert --output ./generated-sources
```

## Commands

### Convert
Main conversion command that processes TypeScript definitions and generates Scala.js sources.

```bash
scalablytyped-ts convert [options]

Options:
  -o, --output <dir>   Output directory for generated sources (default: "./generated-sources")
  --cache <dir>        Cache directory for parsed files (default: "./.scalablytyped-cache")
  --pedantic          Enable pedantic mode for stricter checking
  --debug             Enable debug output
```

### Generate
Source-only generation command for simplified Scala source generation.

```bash
scalablytyped-ts generate [options]

Options:
  -o, --output <dir>   Output directory for generated sources (default: "./my-sources")
  --libs <libs...>     Specific libraries to generate
```

### Import Definitions
Import and process ScalaJS type definitions.

```bash
scalablytyped-ts import-definitions
```

## Development

```bash
# Install dependencies
bun install

# Run in development mode with hot reload
bun run dev

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Lint code
bun run lint

# Format code
bun run format

# Type check
bun run typecheck

# Clean build artifacts
bun run clean
```

## Project Structure

```
cli-ts/
├── src/
│   ├── commands/          # CLI command implementations
│   ├── core/             # Core functionality (Bootstrap, Parser, etc.)
│   ├── phases/           # Transformation phases
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── main.ts           # CLI entry point
├── dist/                 # Built output
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Status

This is currently a work-in-progress port of the Scala implementation. The basic project structure and CLI interface are in place, but the core transformation logic is still being implemented.

### Completed
- ✅ Project structure and build configuration
- ✅ CLI interface and command parsing
- ✅ Basic type definitions
- ✅ Phase pipeline architecture (placeholder)

### In Progress
- 🚧 TypeScript parser implementation using compiler API
- 🚧 Bootstrap and library discovery logic
- 🚧 Phase transformation implementations
- 🚧 AST data structures

### TODO
- ⏳ Complete TypeScript AST parsing
- ⏳ Implement transformation phases
- ⏳ Add comprehensive test suite
- ⏳ Performance optimization
- ⏳ Documentation and examples
