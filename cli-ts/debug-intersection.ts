import { TsTypeRef, TsTypeIntersect, TsDeclTypeAlias, TsDeclNamespace, TsDeclFunction, TsDeclVar, TsDeclEnum, TsNamedDecl } from './src/internal/ts/trees.js';
import { IArray } from './src/internal/IArray.js';
import { Comments } from './src/internal/Comments.js';
import { TsIdent } from './src/internal/ts/trees.js';
import { FlattenTrees } from './src/internal/ts/FlattenTrees.js';
import { IsTrivial } from './src/internal/Comment.js';
import { CodePath } from './src/internal/ts/CodePath.js';
import { JsLocation } from './src/internal/ts/JsLocation.js';
import { none } from 'fp-ts/Option';

console.log('Testing TsTypeRef equality:');
console.log('TsTypeRef.string === TsTypeRef.string:', TsTypeRef.string === TsTypeRef.string);
console.log('TsTypeRef.string === TsTypeRef.number:', TsTypeRef.string === TsTypeRef.number);

console.log('\nTesting TsTypeIntersect.simplified:');
const types = IArray.fromArray([TsTypeRef.string, TsTypeRef.number]);
console.log('Input types:', types.toArray().map(t => t.asString));

const result = TsTypeIntersect.simplified(types);
console.log('Result type:', result._tag);
console.log('Result asString:', result.asString);

if (result._tag === 'TsTypeIntersect') {
  console.log('Intersection types count:', result.types.length);
  console.log('Intersection types:', result.types.toArray().map(t => t.asString));
}

console.log('\nTesting type alias merging:');
const alias1 = TsDeclTypeAlias.create(
  Comments.empty(),
  false,
  TsIdent.simple('TestType'),
  IArray.Empty,
  TsTypeRef.string,
  none
);
const alias2 = TsDeclTypeAlias.create(
  Comments.empty(),
  false,
  TsIdent.simple('TestType'),
  IArray.Empty,
  TsTypeRef.number,
  none
);

console.log('alias1.alias._tag:', alias1.alias._tag);
console.log('alias2.alias._tag:', alias2.alias._tag);

console.log('\nTesting FlattenTrees.newNamedMembers with namespace+function+variable+enum:');

// Create mock declarations (simplified versions)
const mockCodePath = CodePath.noPath();
const mockJsLocation = JsLocation.zero();

const ns = TsDeclNamespace.create(
  Comments.empty(),
  false,
  TsIdent.simple('TestName'),
  IArray.Empty,
  mockCodePath
);

const func = TsDeclFunction.create(
  Comments.empty(),
  false,
  TsIdent.simple('TestName'),
  TsTypeRef.any, // simplified signature
  mockJsLocation,
  mockCodePath
);

const variable = TsDeclVar.create(
  Comments.empty(),
  false,
  false,
  TsIdent.simple('TestName'),
  none, // tpe
  none, // expr
  mockJsLocation,
  mockCodePath
);

const enumDecl = TsDeclEnum.create(
  Comments.empty(),
  false,
  false,
  TsIdent.simple('TestName'),
  IArray.Empty,
  true,
  none, // exportedFrom
  mockJsLocation,
  mockCodePath
);

const these = IArray.fromArray<TsNamedDecl>([ns, func]);
const thats = IArray.fromArray<TsNamedDecl>([variable, enumDecl]);

console.log('Input these:', these.toArray().map(d => d._tag));
console.log('Input thats:', thats.toArray().map(d => d._tag));

const mergeResult = FlattenTrees.newNamedMembers(these, thats);

console.log('Result count:', mergeResult.length);
console.log('Result types:', mergeResult.toArray().map(d => d._tag));
console.log('Has namespace:', mergeResult.exists(m => TsDeclNamespace.isNamespace(m)));
console.log('Has variable:', mergeResult.exists(m => TsDeclVar.isVar(m)));
console.log('Has enum:', mergeResult.exists(m => TsDeclEnum.isEnum(m)));