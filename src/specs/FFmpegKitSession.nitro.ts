import type { HybridObject } from 'react-native-nitro-modules';
import type { NativeLog } from './NativeLog';
import type { NativeSessionState } from './NativeSessionState';
import type { NativeSessionType } from './NativeSessionType';
import type { NativeStatistics } from './NativeStatistics';

/** One FFmpeg / FFprobe run. Created by `FFmpegKitCore.createSession`. */
export interface FFmpegKitSession
  extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  readonly sessionId: number;
  readonly type: NativeSessionType;
  readonly arguments: string[];
  readonly command: string;
  /** Epoch milliseconds. */
  readonly createTime: number;
  /** Epoch milliseconds, 0 until the session starts. */
  readonly startTime: number;
  /** Epoch milliseconds, 0 until the session ends. */
  readonly endTime: number;
  /** Milliseconds, 0 until the session ends. */
  readonly duration: number;
  readonly state: NativeSessionState;
  /** undefined unless the session completed. */
  readonly returnCode?: number;
  /** undefined unless the session failed. */
  readonly failStackTrace?: string;
  readonly logRedirectionStrategy: number;

  /** Every log stored so far. Native stores logs before dispatching them, so this is complete once the session ends. */
  getLogs(): NativeLog[];
  /** All log messages concatenated. */
  getOutput(): string;
  getStatistics(): NativeStatistics[];
  getLastStatistics(): NativeStatistics | undefined;

  /** Runs FFmpeg on the session's own thread. Resolves when the session ends, whatever the return code. */
  execute(): Promise<void>;
  cancel(): void;
}
