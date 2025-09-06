# Scalablytyped with Mill Build Tool

## Generate

```sh
mill cli.runMain org.scalablytyped.converter.cli.Tracing
```

## Unit Tests

All

```sh
./mill cli.test
```

Or specific

```sh
./mill cli.test.testOnly FlattenTreesTests
```

## Unit Test

```sh
npm test -- src/tests/ts/FollowAliases.test.ts
```