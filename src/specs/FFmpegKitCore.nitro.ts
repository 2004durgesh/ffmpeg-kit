/*
 * Native side of react-native-ffmpeg-kit. Run `yarn nitrogen` after changing
 * any spec in this folder.
 *
 * Implemented in C++ on both platforms, calling libffmpegkit's C entry points
 * directly. Cheap reads are synchronous; only work that runs FFmpeg returns a
 * Promise. Log/statistics callbacks are only passed when JS actually listens,
 * and native filters logs by `logLevel` before anything reaches JS.
 */
import type { HybridObject } from 'react-native-nitro-modules';
import type { FFmpegKitSession } from './FFmpegKitSession.nitro';
import type { NativeLog } from './NativeLog';
import type { NativeSessionType } from './NativeSessionType';
import type { NativeStatistics } from './NativeStatistics';

export interface FFmpegKitCore
  extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  // ---- Build info: read once, synchronous ----------------------------------
  readonly ffmpegVersion: string;
  readonly ffmpegKitVersion: string;
  readonly buildDate: string;
  readonly isLTSBuild: boolean;
  readonly packageName: string;
  readonly externalLibraries: string[];
  /** Release tag the binaries came from, e.g. "ffmpeg-android-6.0.3". */
  readonly binaryVersion: string;
  readonly arch: string;

  // ---- Config ---------------------------------------------------------------
  logLevel: number;
  logRedirectionStrategy: number;
  sessionHistorySize: number;
  logsEnabled: boolean;
  statisticsEnabled: boolean;
  readonly redirectionEnabled: boolean;
  enableRedirection(): void;
  disableRedirection(): void;

  // ---- Sessions -------------------------------------------------------------
  createSession(
    type: NativeSessionType,
    args: string[],
    logRedirectionStrategy: number,
    onLog?: (log: NativeLog) => void,
    onStatistics?: (statistics: NativeStatistics) => void
  ): FFmpegKitSession;
  /** Replaces the global log listener; pass undefined to remove it. */
  setLogCallback(onLog?: (log: NativeLog) => void): void;
  /** Replaces the global statistics listener; pass undefined to remove it. */
  setStatisticsCallback(
    onStatistics?: (statistics: NativeStatistics) => void
  ): void;

  getSession(sessionId: number): FFmpegKitSession | undefined;
  getLastSession(): FFmpegKitSession | undefined;
  getLastCompletedSession(): FFmpegKitSession | undefined;
  getSessions(): FFmpegKitSession[];
  clearSessions(): void;
  /** Cancels one session, or every running session when sessionId is undefined. */
  cancel(sessionId?: number): void;

  // ---- Pipes, fonts, environment -------------------------------------------
  registerNewFFmpegPipe(): string;
  closeFFmpegPipe(path: string): void;
  writeToPipe(inputPath: string, pipePath: string): Promise<number>;
  setFontconfigConfigurationPath(path: string): void;
  setFontDirectoryList(
    fontDirectoryList: string[],
    fontNameMapping: Record<string, string>
  ): void;
  setEnvironmentVariable(name: string, value: string): void;
  ignoreSignal(signal: number): void;
}
