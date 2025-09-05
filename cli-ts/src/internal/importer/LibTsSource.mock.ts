/**
 * Mock utilities for LibTsSource to support testing
 */

import { InFolder } from "../files";
import type { TsIdentLibrary } from "../ts/trees";
import { LibTsSource } from "./LibTsSource";

/**
 * Add createMock method to LibTsSource namespace
 */
declare module "./LibTsSource" {
	namespace LibTsSource {
		function createMock(libName: TsIdentLibrary): LibTsSource;
	}
}

// Extend LibTsSource with createMock method
LibTsSource.createMock = (libName: TsIdentLibrary): LibTsSource => {
	const mockFolder = new InFolder("/mock/path");
	return new LibTsSource.FromFolder(mockFolder, libName);
};
