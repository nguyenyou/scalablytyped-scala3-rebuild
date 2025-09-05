import { TsTypeObject, TsTypeIntersect, TsMemberTypeMapped, TsMemberProperty, TsType, TsIdent, TsTypeRef } from './src/internal/ts/trees.js';
import { IArray } from './src/internal/IArray.js';
import { Comments } from './src/internal/Comments.js';
import { TsProtectionLevel } from './src/internal/ts/TsProtectionLevel.js';
import { ReadonlyModifier } from './src/internal/ts/ReadonlyModifier.js';
import { OptionalModifier } from './src/internal/ts/OptionalModifier.js';
import { none, some } from 'fp-ts/Option';

console.log('=== Debugging Mapped Type Intersection ===');

// Create mapped type member (exactly like Scala test)
const mappedMember = TsMemberTypeMapped.create(
  Comments.empty(),
  TsProtectionLevel.Default,
  ReadonlyModifier.Noop,
  TsIdent.simple('K'),
  TsTypeRef.string,
  none, // as
  OptionalModifier.Noop,
  TsTypeRef.number
);
const mappedObj = TsTypeObject.create(Comments.empty(), IArray.fromArray([mappedMember]));

// Create normal property member (exactly like Scala test)
const prop = TsMemberProperty.typed(TsIdent.simple('prop'), TsTypeRef.string);
const normalObj = TsTypeObject.create(Comments.empty(), IArray.fromArray([prop]));

console.log('Input types:');
console.log('- mappedObj._tag:', mappedObj._tag);
console.log('- mappedObj.members.length:', mappedObj.members.length);
console.log('- TsType.isTypeMapping(mappedObj.members):', TsType.isTypeMapping(mappedObj.members));
console.log('- normalObj._tag:', normalObj._tag);
console.log('- normalObj.members.length:', normalObj.members.length);
console.log('- TsType.isTypeMapping(normalObj.members):', TsType.isTypeMapping(normalObj.members));

const inputTypes = IArray.fromArray([mappedObj, normalObj]);
console.log('\nInput array length:', inputTypes.length);

// Manually trace the simplified method logic
console.log('\n=== Tracing TsTypeIntersect.simplified logic ===');

// Step 1: Separate object types
const objects: any[] = [];
const others: any[] = [];

for (let i = 0; i < inputTypes.length; i++) {
  const type = inputTypes.apply(i);
  console.log(`Type ${i}: ${type._tag}, isTypeMapping: ${type._tag === 'TsTypeObject' ? TsType.isTypeMapping((type as any).members) : 'N/A'}`);

  if (type._tag === 'TsTypeObject' && !TsType.isTypeMapping((type as any).members)) {
    console.log(`  -> Adding to objects array`);
    objects.push(type);
  } else {
    console.log(`  -> Adding to others array`);
    others.push(type);
  }
}

console.log('objects.length:', objects.length);
console.log('others.length:', others.length);

// Test the areLogicallyEqual method
console.log('\n=== Testing areLogicallyEqual ===');
console.log('mappedObj.asString:', mappedObj.asString);
console.log('normalObj.asString:', normalObj.asString);
console.log('areLogicallyEqual(mappedObj, normalObj):', TsTypeIntersect.areLogicallyEqual(mappedObj, normalObj));

// Test distinctTypes method
console.log('\n=== Testing distinctTypes ===');
const testTypes = IArray.fromArray([mappedObj, normalObj]);
const distinctResult = TsTypeIntersect.distinctTypes(testTypes);
console.log('Input length:', testTypes.length);
console.log('Distinct length:', distinctResult.length);
console.log('Distinct types:', distinctResult.toArray().map(t => t._tag));

// Call the simplified method
const result = TsTypeIntersect.simplified(inputTypes);

console.log('\nResult:');
console.log('- result._tag:', result._tag);
console.log('- result.asString:', result.asString);

if (result._tag === 'TsTypeIntersect') {
  const intersectResult = result as any;
  console.log('- intersectResult.types.length:', intersectResult.types.length);
  console.log('- types:', intersectResult.types.toArray().map((t: any) => t._tag));
} else {
  console.log('ERROR: Expected TsTypeIntersect but got:', result._tag);
}