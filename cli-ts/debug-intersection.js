import { TsTypeRef, TsTypeIntersect } from './src/internal/ts/trees.js';
import { IArray } from './src/internal/IArray.js';

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