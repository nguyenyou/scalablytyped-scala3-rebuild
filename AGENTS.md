# AGENTS.md - Codebase Guide for Agentic Tools

## Build Commands
- Build: `bun build` (TypeScript) or `./mill cli.compile` (Scala)
- Test: `bun test` (TypeScript), `./mill cli.test` (Scala), or `bun test:all` (both)
- Run single test: `bun test <testfile>.test.ts` or `./mill cli.test <className>`
- Coverage: `bun coverage` (TypeScript) or `./mill cli.scoverage.htmlReport` (Scala)
- Lint: `bun lint` and use `bun lint:fix` for auto-fixes
- Typecheck: `bun tc` or `bun typecheck`
- Generate: `bun generate` (runs Scala CLI to generate TypeScript definitions)

## Architecture
- **Hybrid Scala/TypeScript project** - Main logic in `cli/` (Scala 3.7.2), port in `cli-ts/` (TypeScript)
- **Mill build system** for Scala, **Bun** for TypeScript (preferred over npm/node per CLAUDE.md)
- **Key directories**: `cli/` (Scala source), `cli-ts/` (TypeScript port), `generated-sources/` (output)
- **Phase-based architecture**: Phase1ReadTypescript parses files, implements module system
- **Libraries**: fp-ts (functional programming), vitest (testing), @biomejs/biome (linting)

## Code Style
- **Scala**: ScalaFmt with 120 char max, Scala 3 syntax, strict compiler flags
- **TypeScript**: Biome formatter, functional style with fp-ts, `@/` alias for src imports
- **Naming**: PascalCase for types/classes, camelCase for functions/variables
- **Imports**: Use `@/` alias, organize by external then internal
- **Error handling**: fp-ts Either/Option patterns, no throwing exceptions
- **Tests**: Use vitest, mirror original Scala test structure, comprehensive coverage
