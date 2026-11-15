import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Storage Access Framework, Android only (it needs a Context and an Activity).
 * JS rejects these calls on iOS without creating the object.
 */
export interface FFmpegKitStorage
  extends HybridObject<{ android: 'kotlin' }> {
  /** Returns a `saf:` url FFmpeg can open for the given content:// uri. */
  getSafParameter(uri: string, openMode: string): string;
  /** Shows the system document picker and resolves with the picked content:// uri. */
  selectDocument(
    writable: boolean,
    title: string | undefined,
    type: string | undefined,
    extraTypes: string[]
  ): Promise<string>;
}
