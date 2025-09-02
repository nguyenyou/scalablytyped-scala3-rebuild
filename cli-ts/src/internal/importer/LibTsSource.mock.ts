/**
 * Mock utilities for LibTsSource to support testing
 */

import { LibTsSource } from './LibTsSource';
import { TsIdentLibrary } from '../ts/trees';
import { InFolder } from '../files';

/**
 * Add createMock method to LibTsSource namespace
 */
declare module './LibTsSource' {
  namespace LibTsSource {
    function createMock(libName: TsIdentLibrary): LibTsSource;
  }
}

// Extend LibTsSource with createMock method
LibTsSource.createMock = function(libName: TsIdentLibrary): LibTsSource {
  const mockFolder = new InFolder('/mock/path');
  return new LibTsSource.FromFolder(mockFolder, libName);
};
