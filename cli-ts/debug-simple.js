/**
 * Simple debug script to test individual components
 */

import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

async function testComponents() {
  console.log('Testing individual components...\n');
  
  const libPath = './node_modules/@types/node';
  const libName = '@types/node';
  
  console.log(`1. Testing path existence: ${libPath}`);
  const pathExists = await fs.pathExists(libPath);
  console.log(`   Path exists: ${pathExists}`);
  
  if (!pathExists) {
    console.log('❌ Path does not exist, stopping test');
    return;
  }
  
  console.log('\n2. Testing package.json reading:');
  const packageJsonPath = path.join(libPath, 'package.json');
  const packageJsonExists = await fs.pathExists(packageJsonPath);
  console.log(`   package.json exists: ${packageJsonExists}`);
  
  if (packageJsonExists) {
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      console.log(`   package.json name: ${packageJson.name}`);
      console.log(`   package.json version: ${packageJson.version}`);
      console.log(`   package.json types: ${packageJson.types}`);
    } catch (error) {
      console.log(`   Error reading package.json: ${error.message}`);
    }
  }
  
  console.log('\n3. Testing TypeScript file discovery:');
  try {
    const absolutePath = path.resolve(libPath);
    const pattern = path.join(absolutePath, '**/*.{d.ts,ts}');
    console.log(`   Using pattern: ${pattern}`);
    
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/test/**', '**/tests/**', '**/*.test.*']
    });
    
    console.log(`   Found ${files.length} TypeScript files`);
    if (files.length > 0) {
      console.log('   First 5 files:');
      files.slice(0, 5).forEach(file => {
        console.log(`     ${file}`);
      });
    }
    
    const resolvedFiles = files.map(file => path.resolve(file));
    console.log(`   Resolved ${resolvedFiles.length} files`);
    
    if (resolvedFiles.length === 0) {
      console.log('❌ No TypeScript files found - this is the issue!');
      return;
    }
    
    console.log('\n4. Testing library creation logic:');
    
    // Simulate the createLibraryFromPath logic
    let packageJson = {};
    if (packageJsonExists) {
      packageJson = await fs.readJson(packageJsonPath);
    }
    
    console.log(`   Package JSON loaded: ${Object.keys(packageJson).length} keys`);
    console.log(`   TypeScript files: ${resolvedFiles.length}`);
    
    if (resolvedFiles.length === 0) {
      console.log('❌ No TypeScript files found, would return undefined');
      return;
    }
    
    console.log('✅ All components working, library should be created successfully');
    
    // Test the actual library creation
    console.log('\n5. Testing actual library creation:');
    const mockLibrary = {
      libName,
      libPath,
      sourceFiles: resolvedFiles,
      packageJson,
      version: packageJson.version || '0.0.0',
      hasTypes: resolvedFiles.some(file => file.endsWith('.d.ts')),
      mainTypesFile: packageJson.types ? path.resolve(libPath, packageJson.types) : resolvedFiles.find(file => file.endsWith('.d.ts'))
    };
    
    console.log(`   Mock library created:`);
    console.log(`     Name: ${mockLibrary.libName}`);
    console.log(`     Version: ${mockLibrary.version}`);
    console.log(`     Has types: ${mockLibrary.hasTypes}`);
    console.log(`     Source files: ${mockLibrary.sourceFiles.length}`);
    console.log(`     Main types file: ${mockLibrary.mainTypesFile}`);
    
  } catch (error) {
    console.log(`   Error in file discovery: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

testComponents().catch(console.error);