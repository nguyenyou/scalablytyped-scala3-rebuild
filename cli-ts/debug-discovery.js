/**
 * Debug script to test library discovery
 */

import { Bootstrap } from './dist/main.js';
import * as path from 'path';

async function testDiscovery() {
  console.log('Testing library discovery...');
  
  const nodeModulesPath = './node_modules';
  const typesPath = path.join(nodeModulesPath, '@types', 'node');
  
  console.log(`Testing with path: ${typesPath}`);
  
  try {
    // Test createLibraryFromPath directly
    const library = await Bootstrap.createLibraryFromPath(typesPath, '@types/node');
    
    if (library) {
      console.log('✅ Successfully created library:');
      console.log(`  Name: ${library.libName}`);
      console.log(`  Path: ${library.libPath}`);
      console.log(`  Version: ${library.version}`);
      console.log(`  Source files: ${library.sourceFiles.length}`);
      console.log(`  Has types: ${library.hasTypes}`);
      console.log(`  Main types file: ${library.mainTypesFile}`);
      
      if (library.sourceFiles.length > 0) {
        console.log('  First few source files:');
        library.sourceFiles.slice(0, 5).forEach(file => {
          console.log(`    ${file}`);
        });
      }
    } else {
      console.log('❌ Failed to create library');
    }
  } catch (error) {
    console.error('❌ Error during library creation:', error);
  }
}

testDiscovery().catch(console.error);
