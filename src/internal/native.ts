import { Platform } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type { FFmpegKitCore } from '../specs/FFmpegKitCore.nitro';
import type { FFmpegKitStorage } from '../specs/FFmpegKitStorage.nitro';

let core: FFmpegKitCore | undefined;
let storage: FFmpegKitStorage | undefined;
let initialized = false;

/** The C++ core, created on first use. */
export function native(): FFmpegKitCore {
  if (core === undefined) {
    core = NitroModules.createHybridObject<FFmpegKitCore>('FFmpegKitCore');
  }
  return core;
}

/** The Android-only storage object; throws on other platforms without creating anything. */
export function androidStorage(): FFmpegKitStorage {
  if (Platform.OS !== 'android') {
    throw new Error(
      'The Storage Access Framework is only available on Android.'
    );
  }
  if (storage === undefined) {
    storage =
      NitroModules.createHybridObject<FFmpegKitStorage>('FFmpegKitStorage');
  }
  return storage;
}

/** Turns on native log/statistics redirection once. */
export function ensureInitialized(): void {
  if (!initialized) {
    initialized = true;
    native().enableRedirection();
  }
}

export function uninitialize(): void {
  initialized = false;
  native().disableRedirection();
}
