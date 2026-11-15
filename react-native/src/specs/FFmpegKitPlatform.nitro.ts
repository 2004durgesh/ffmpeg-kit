import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Internal: ffmpeg-kit's Java / Objective-C API for the cold paths (build
 * info, pipes, fonts, signals). Created and called only by the C++ core,
 * through this generated interface; JS never uses it. Hot paths (running
 * FFmpeg, logs, statistics, cancel) stay in C++.
 */
export interface FFmpegKitPlatform
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** Loads ffmpeg-kit's native libraries and runs its own initialization. Idempotent. */
  initialize(): void;

  readonly ffmpegVersion: string;
  readonly ffmpegKitVersion: string;
  readonly buildDate: string;
  readonly isLTSBuild: boolean;
  readonly packageName: string;
  readonly externalLibraries: string[];
  readonly arch: string;

  registerNewFFmpegPipe(): string;
  closeFFmpegPipe(path: string): void;
  setFontconfigConfigurationPath(path: string): void;
  setFontDirectoryList(
    fontDirectoryList: string[],
    fontNameMapping: Record<string, string>
  ): void;
  /** One of the public `Signal` values; anything else throws. */
  ignoreSignal(signal: number): void;
}
