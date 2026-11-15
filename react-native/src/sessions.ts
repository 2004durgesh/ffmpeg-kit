/*
 * The session class family and the registry that maps native sessions to the
 * wrapper objects users hold.
 */
import type { FFmpegKitSession } from './specs/FFmpegKitSession.nitro';
import type { NativeLog } from './specs/NativeLog';
import { NativeSessionType } from './specs/NativeSessionType';
import type { NativeStatistics } from './specs/NativeStatistics';
import { ensureInitialized, native } from './internal/native';
import { safely } from './internal/safely';
import { toLog, toStatistics, validDate } from './internal/fromNative';
import type { Log } from './Log';
import type { LogRedirectionStrategy } from './LogRedirectionStrategy';
import { ReturnCode } from './ReturnCode';
import type { SessionState } from './SessionState';
import type { Statistics } from './Statistics';
import type { MediaInformation } from './media/MediaInformation';

export type LogCallback = (log: Log) => void;
export type StatisticsCallback = (statistics: Statistics) => void;
export type FFmpegSessionCompleteCallback = (session: FFmpegSession) => void;
export type FFprobeSessionCompleteCallback = (session: FFprobeSession) => void;
export type MediaInformationSessionCompleteCallback = (
  session: MediaInformationSession
) => void;

export interface Session {
  getLogCallback(): LogCallback | undefined;
  getSessionId(): number;
  getCreateTime(): Date | undefined;
  getStartTime(): Date | undefined;
  getEndTime(): Promise<Date | undefined>;
  getDuration(): Promise<number>;
  getArguments(): string[];
  getCommand(): string;
  getAllLogs(waitTimeout?: number): Promise<Log[]>;
  getLogs(): Promise<Log[]>;
  getAllLogsAsString(waitTimeout?: number): Promise<string>;
  getLogsAsString(): Promise<string>;
  getOutput(): Promise<string>;
  getState(): Promise<SessionState>;
  getReturnCode(): Promise<ReturnCode | undefined>;
  getFailStackTrace(): Promise<string | undefined>;
  getLogRedirectionStrategy(): LogRedirectionStrategy;
  thereAreAsynchronousMessagesInTransmit(): Promise<boolean>;
  isFFmpeg(): boolean;
  isFFprobe(): boolean;
  isMediaInformation(): boolean;
  cancel(): Promise<void>;
}

/** Native session behind each wrapper. Module-private. */
const nativeOf = new WeakMap<AbstractSession, FFmpegKitSession>();

/** sessionId -> wrapper, so lookups return the object (and callbacks) the user holds. */
const wrappers = new Map<number, AbstractSession>();

export function nativeSession(session: AbstractSession): FFmpegKitSession {
  return nativeOf.get(session)!;
}

function remember<T extends AbstractSession>(session: T): T {
  wrappers.set(session.getSessionId(), session);
  // Drop wrappers for sessions native has already evicted from its history.
  const limit = Math.max(native().sessionHistorySize, 1) + 16;
  if (wrappers.size > limit) {
    const alive = new Set(native().getSessions().map((s) => s.sessionId));
    for (const id of wrappers.keys()) {
      if (!alive.has(id)) {
        wrappers.delete(id);
      }
    }
  }
  return session;
}

export function wrap(n: FFmpegKitSession | undefined): AbstractSession | undefined {
  if (n === undefined) {
    return undefined;
  }
  const cached = wrappers.get(n.sessionId);
  if (cached !== undefined) {
    return cached;
  }
  switch (n.type) {
    case NativeSessionType.FFPROBE:
      return remember(new FFprobeSession(n));
    case NativeSessionType.MEDIA_INFORMATION:
      return remember(new MediaInformationSession(n));
    default:
      return remember(new FFmpegSession(n));
  }
}

export function wrapAll(list: FFmpegKitSession[]): AbstractSession[] {
  return list.map((n) => wrap(n)!);
}

export function nativeLogCallback(cb: LogCallback | undefined) {
  return cb === undefined
    ? undefined
    : (log: NativeLog) => safely('log callback', () => cb(toLog(log)));
}

export function nativeStatisticsCallback(cb: StatisticsCallback | undefined) {
  return cb === undefined
    ? undefined
    : (s: NativeStatistics) =>
        safely('statistics callback', () => cb(toStatistics(s)));
}

function createNative(
  type: NativeSessionType,
  args: string[],
  logRedirectionStrategy: LogRedirectionStrategy | undefined,
  logCallback: LogCallback | undefined,
  statisticsCallback?: StatisticsCallback
): FFmpegKitSession {
  return native().createSession(
    type,
    args,
    logRedirectionStrategy ?? native().logRedirectionStrategy,
    nativeLogCallback(logCallback),
    nativeStatisticsCallback(statisticsCallback)
  );
}

export abstract class AbstractSession implements Session {
  #logCallback: LogCallback | undefined;

  /** @internal Wraps a native session; use the static factories instead. */
  constructor(n: FFmpegKitSession, logCallback?: LogCallback) {
    nativeOf.set(this, n);
    this.#logCallback = logCallback;
  }

  static async createFFmpegSession(
    argumentsArray: string[],
    logRedirectionStrategy?: LogRedirectionStrategy
  ): Promise<FFmpegSession> {
    return FFmpegSession.create(
      argumentsArray,
      undefined,
      undefined,
      undefined,
      logRedirectionStrategy
    );
  }

  static createFFmpegSessionFromMap(sessionMap: {
    sessionId: number;
  }): FFmpegSession {
    return wrap(native().getSession(sessionMap.sessionId)) as FFmpegSession;
  }

  static async createFFprobeSession(
    argumentsArray: string[],
    logRedirectionStrategy?: LogRedirectionStrategy
  ): Promise<FFprobeSession> {
    return FFprobeSession.create(
      argumentsArray,
      undefined,
      undefined,
      logRedirectionStrategy
    );
  }

  static createFFprobeSessionFromMap(sessionMap: {
    sessionId: number;
  }): FFprobeSession {
    return wrap(native().getSession(sessionMap.sessionId)) as FFprobeSession;
  }

  static async createMediaInformationSession(
    argumentsArray: string[]
  ): Promise<MediaInformationSession> {
    return MediaInformationSession.create(argumentsArray);
  }

  static createMediaInformationSessionFromMap(sessionMap: {
    sessionId: number;
  }): MediaInformationSession {
    return wrap(
      native().getSession(sessionMap.sessionId)
    ) as MediaInformationSession;
  }

  getLogCallback(): LogCallback | undefined {
    return this.#logCallback;
  }
  getSessionId(): number {
    return nativeSession(this).sessionId;
  }
  getCreateTime(): Date | undefined {
    return validDate(nativeSession(this).createTime);
  }
  getStartTime(): Date | undefined {
    return validDate(nativeSession(this).startTime);
  }
  async getEndTime(): Promise<Date | undefined> {
    return validDate(nativeSession(this).endTime);
  }
  async getDuration(): Promise<number> {
    return nativeSession(this).duration;
  }
  getArguments(): string[] {
    return nativeSession(this).arguments;
  }
  getCommand(): string {
    return nativeSession(this).command;
  }
  /** Logs are stored natively before they are dispatched, so nothing is ever in transit. */
  async getAllLogs(_waitTimeout?: number): Promise<Log[]> {
    return nativeSession(this).getLogs().map(toLog);
  }
  async getLogs(): Promise<Log[]> {
    return nativeSession(this).getLogs().map(toLog);
  }
  async getAllLogsAsString(_waitTimeout?: number): Promise<string> {
    return nativeSession(this).getOutput();
  }
  async getLogsAsString(): Promise<string> {
    return nativeSession(this).getOutput();
  }
  async getOutput(): Promise<string> {
    return nativeSession(this).getOutput();
  }
  async getState(): Promise<SessionState> {
    return nativeSession(this).state as number as SessionState;
  }
  async getReturnCode(): Promise<ReturnCode | undefined> {
    const rc = nativeSession(this).returnCode;
    return rc === undefined ? undefined : new ReturnCode(rc);
  }
  async getFailStackTrace(): Promise<string | undefined> {
    return nativeSession(this).failStackTrace;
  }
  getLogRedirectionStrategy(): LogRedirectionStrategy {
    return nativeSession(this).logRedirectionStrategy as LogRedirectionStrategy;
  }
  async thereAreAsynchronousMessagesInTransmit(): Promise<boolean> {
    return false;
  }
  abstract isFFmpeg(): boolean;
  abstract isFFprobe(): boolean;
  abstract isMediaInformation(): boolean;
  async cancel(): Promise<void> {
    nativeSession(this).cancel();
  }
}

export class FFmpegSession extends AbstractSession {
  #completeCallback: FFmpegSessionCompleteCallback | undefined;
  #statisticsCallback: StatisticsCallback | undefined;

  /** @internal */
  constructor(
    n: FFmpegKitSession,
    completeCallback?: FFmpegSessionCompleteCallback,
    logCallback?: LogCallback,
    statisticsCallback?: StatisticsCallback
  ) {
    super(n, logCallback);
    this.#completeCallback = completeCallback;
    this.#statisticsCallback = statisticsCallback;
  }

  static async create(
    argumentsArray: string[],
    completeCallback?: FFmpegSessionCompleteCallback,
    logCallback?: LogCallback,
    statisticsCallback?: StatisticsCallback,
    logRedirectionStrategy?: LogRedirectionStrategy
  ): Promise<FFmpegSession> {
    ensureInitialized();
    const n = createNative(
      NativeSessionType.FFMPEG,
      argumentsArray,
      logRedirectionStrategy,
      logCallback,
      statisticsCallback
    );
    return remember(
      new FFmpegSession(n, completeCallback, logCallback, statisticsCallback)
    );
  }

  getStatisticsCallback(): StatisticsCallback | undefined {
    return this.#statisticsCallback;
  }
  getCompleteCallback(): FFmpegSessionCompleteCallback | undefined {
    return this.#completeCallback;
  }
  async getAllStatistics(_waitTimeout?: number): Promise<Statistics[]> {
    return nativeSession(this).getStatistics().map(toStatistics);
  }
  async getStatistics(): Promise<Statistics[]> {
    return nativeSession(this).getStatistics().map(toStatistics);
  }
  async getLastReceivedStatistics(): Promise<Statistics | undefined> {
    const last = nativeSession(this).getLastStatistics();
    return last === undefined ? undefined : toStatistics(last);
  }
  isFFmpeg(): boolean {
    return true;
  }
  isFFprobe(): boolean {
    return false;
  }
  isMediaInformation(): boolean {
    return false;
  }
}

export class FFprobeSession extends AbstractSession {
  #completeCallback: FFprobeSessionCompleteCallback | undefined;

  /** @internal */
  constructor(
    n: FFmpegKitSession,
    completeCallback?: FFprobeSessionCompleteCallback,
    logCallback?: LogCallback
  ) {
    super(n, logCallback);
    this.#completeCallback = completeCallback;
  }

  static async create(
    argumentsArray: string[],
    completeCallback?: FFprobeSessionCompleteCallback,
    logCallback?: LogCallback,
    logRedirectionStrategy?: LogRedirectionStrategy
  ): Promise<FFprobeSession> {
    ensureInitialized();
    const n = createNative(
      NativeSessionType.FFPROBE,
      argumentsArray,
      logRedirectionStrategy,
      logCallback
    );
    return remember(new FFprobeSession(n, completeCallback, logCallback));
  }

  getCompleteCallback(): FFprobeSessionCompleteCallback | undefined {
    return this.#completeCallback;
  }
  isFFmpeg(): boolean {
    return false;
  }
  isFFprobe(): boolean {
    return true;
  }
  isMediaInformation(): boolean {
    return false;
  }
}

export class MediaInformationSession extends AbstractSession {
  #completeCallback: MediaInformationSessionCompleteCallback | undefined;
  #mediaInformation: MediaInformation | undefined;

  /** @internal */
  constructor(
    n: FFmpegKitSession,
    completeCallback?: MediaInformationSessionCompleteCallback,
    logCallback?: LogCallback
  ) {
    super(n, logCallback);
    this.#completeCallback = completeCallback;
  }

  static async create(
    argumentsArray: string[],
    completeCallback?: MediaInformationSessionCompleteCallback,
    logCallback?: LogCallback
  ): Promise<MediaInformationSession> {
    ensureInitialized();
    const n = createNative(
      NativeSessionType.MEDIA_INFORMATION,
      argumentsArray,
      undefined,
      logCallback
    );
    return remember(
      new MediaInformationSession(n, completeCallback, logCallback)
    );
  }

  getMediaInformation(): MediaInformation | undefined {
    return this.#mediaInformation;
  }
  setMediaInformation(mediaInformation: MediaInformation | undefined): void {
    this.#mediaInformation = mediaInformation;
  }
  getCompleteCallback(): MediaInformationSessionCompleteCallback | undefined {
    return this.#completeCallback;
  }
  isFFmpeg(): boolean {
    return false;
  }
  isFFprobe(): boolean {
    return false;
  }
  isMediaInformation(): boolean {
    return true;
  }
}

/** Forgets every wrapper; called when native history is cleared. */
export function clearWrappers(): void {
  wrappers.clear();
}

function sessionsOfType(type: NativeSessionType): AbstractSession[] {
  return wrapAll(
    native()
      .getSessions()
      .filter((s) => s.type === type)
  );
}

export function listFFmpegSessions(): FFmpegSession[] {
  return sessionsOfType(NativeSessionType.FFMPEG) as FFmpegSession[];
}

export function listFFprobeSessions(): FFprobeSession[] {
  return sessionsOfType(NativeSessionType.FFPROBE) as FFprobeSession[];
}

export function listMediaInformationSessions(): MediaInformationSession[] {
  return sessionsOfType(
    NativeSessionType.MEDIA_INFORMATION
  ) as MediaInformationSession[];
}
