/*
 * In-memory stand-in for the Nitro hybrid objects. It implements the spec's
 * TypeScript interfaces, so `yarn typecheck` fails if it drifts from the spec.
 *
 * Tests drive it like the native side would: emitLog / emitStatistics push
 * through the registered callbacks, finish() ends a session and resolves
 * execute().
 */
import type { FFmpegKitCore } from '../../specs/FFmpegKitCore.nitro';
import type { FFmpegKitSession } from '../../specs/FFmpegKitSession.nitro';
import type { FFmpegKitStorage } from '../../specs/FFmpegKitStorage.nitro';
import type { NativeLog } from '../../specs/NativeLog';
import { NativeSessionState } from '../../specs/NativeSessionState';
import { NativeSessionType } from '../../specs/NativeSessionType';
import type { NativeStatistics } from '../../specs/NativeStatistics';

type LogFn = (log: NativeLog) => void;
type StatsFn = (statistics: NativeStatistics) => void;

class FakeHybrid {
  constructor(readonly name: string) {}
  toString(): string {
    return `[HybridObject ${this.name}]`;
  }
  equals(other: unknown): boolean {
    return other === this;
  }
  dispose(): void {}
}

export class FakeSession extends FakeHybrid implements FFmpegKitSession {
  readonly createTime = Date.now();
  startTime = 0;
  endTime = 0;
  state = NativeSessionState.CREATED;
  returnCode?: number;
  failStackTrace?: string;
  readonly logs: NativeLog[] = [];
  readonly statistics: NativeStatistics[] = [];
  executeCalls = 0;
  cancelCalls = 0;
  private resolveExecute?: () => void;
  private rejectExecute?: (e: Error) => void;

  constructor(
    private readonly core: FakeCore,
    readonly sessionId: number,
    readonly type: NativeSessionType,
    readonly args: string[],
    readonly logRedirectionStrategy: number,
    readonly onLog?: LogFn,
    readonly onStatistics?: StatsFn
  ) {
    super('FFmpegKitSession');
  }

  get arguments(): string[] {
    return this.args;
  }
  get command(): string {
    return this.args.join(' ');
  }
  get duration(): number {
    return this.endTime > 0 ? this.endTime - this.startTime : 0;
  }

  getLogs(): NativeLog[] {
    return [...this.logs];
  }
  getOutput(): string {
    return this.logs.map((l) => l.message).join('');
  }
  getStatistics(): NativeStatistics[] {
    return [...this.statistics];
  }
  getLastStatistics(): NativeStatistics | undefined {
    return this.statistics[this.statistics.length - 1];
  }

  execute(): Promise<void> {
    this.executeCalls++;
    this.state = NativeSessionState.RUNNING;
    this.startTime = Date.now();
    return new Promise((resolve, reject) => {
      this.resolveExecute = resolve;
      this.rejectExecute = reject;
    });
  }
  cancel(): void {
    this.cancelCalls++;
  }

  // ---- test controls --------------------------------------------------------
  emitLog(level: number, message: string): void {
    const log = { sessionId: this.sessionId, level, message };
    this.logs.push(log);
    this.onLog?.(log);
    this.core.globalLog?.(log);
  }
  emitStatistics(partial: Partial<NativeStatistics> = {}): void {
    const s: NativeStatistics = {
      sessionId: this.sessionId,
      videoFrameNumber: 1,
      videoFps: 25,
      videoQuality: 28,
      size: 1024,
      time: 40,
      bitrate: 200,
      speed: 1.5,
      ...partial,
    };
    this.statistics.push(s);
    this.onStatistics?.(s);
    this.core.globalStatistics?.(s);
  }
  /** Ends the session like ffmpeg_execute returning, then resolves execute(). */
  async finish(returnCode = 0): Promise<void> {
    this.returnCode = returnCode;
    this.state = NativeSessionState.COMPLETED;
    this.endTime = this.startTime + 1500;
    this.resolveExecute?.();
    await flush();
  }
  /** Ends the session the way an internal native error would. */
  async fail(stackTrace: string): Promise<void> {
    this.failStackTrace = stackTrace;
    this.state = NativeSessionState.FAILED;
    this.endTime = this.startTime + 10;
    this.resolveExecute?.();
    await flush();
  }
  async reject(error: Error): Promise<void> {
    this.rejectExecute?.(error);
    await flush();
  }
}

export class FakeCore extends FakeHybrid implements FFmpegKitCore {
  readonly ffmpegVersion = '6.0';
  readonly ffmpegKitVersion = '6.0';
  readonly buildDate = '20261101';
  readonly isLTSBuild = false;
  readonly packageName = 'https';
  readonly externalLibraries = ['gmp', 'openssl'];
  binaryVersion = 'ffmpeg-android-6.0.3';
  readonly arch = 'arm64-v8a';

  logLevel = 32;
  logRedirectionStrategy = 3;
  sessionHistorySize = 10;
  logsEnabled = true;
  statisticsEnabled = true;
  redirectionEnabled = false;

  globalLog?: LogFn;
  globalStatistics?: StatsFn;
  readonly sessions: FakeSession[] = [];
  readonly calls: Array<[string, ...unknown[]]> = [];
  private nextId = 1;
  private nextPipe = 1;

  constructor() {
    super('FFmpegKitCore');
  }

  enableRedirection(): void {
    this.redirectionEnabled = true;
  }
  disableRedirection(): void {
    this.redirectionEnabled = false;
  }

  createSession(
    type: NativeSessionType,
    args: string[],
    logRedirectionStrategy: number,
    onLog?: LogFn,
    onStatistics?: StatsFn
  ): FakeSession {
    const session = new FakeSession(
      this,
      this.nextId++,
      type,
      args,
      logRedirectionStrategy,
      onLog,
      onStatistics
    );
    this.sessions.push(session);
    return session;
  }
  setLogCallback(onLog?: LogFn): void {
    this.globalLog = onLog;
  }
  setStatisticsCallback(onStatistics?: StatsFn): void {
    this.globalStatistics = onStatistics;
  }

  getSession(sessionId: number): FakeSession | undefined {
    return this.sessions.find((s) => s.sessionId === sessionId);
  }
  getLastSession(): FakeSession | undefined {
    return this.sessions[this.sessions.length - 1];
  }
  getLastCompletedSession(): FakeSession | undefined {
    return [...this.sessions]
      .reverse()
      .find((s) => s.state === NativeSessionState.COMPLETED);
  }
  getSessions(): FakeSession[] {
    return [...this.sessions];
  }
  clearSessions(): void {
    this.sessions.length = 0;
  }
  cancel(sessionId?: number): void {
    this.calls.push(['cancel', sessionId]);
  }

  registerNewFFmpegPipe(): string {
    return `/data/pipes/fk_pipe_${this.nextPipe++}`;
  }
  closeFFmpegPipe(path: string): void {
    this.calls.push(['closeFFmpegPipe', path]);
  }
  writeToPipe(inputPath: string, pipePath: string): Promise<number> {
    this.calls.push(['writeToPipe', inputPath, pipePath]);
    return Promise.resolve(0);
  }
  setFontconfigConfigurationPath(path: string): void {
    this.calls.push(['setFontconfigConfigurationPath', path]);
  }
  setFontDirectoryList(dirs: string[], mapping: Record<string, string>): void {
    this.calls.push(['setFontDirectoryList', dirs, mapping]);
  }
  setEnvironmentVariable(name: string, value: string): void {
    this.calls.push(['setEnvironmentVariable', name, value]);
  }
  ignoreSignal(signal: number): void {
    this.calls.push(['ignoreSignal', signal]);
  }
}

export class FakeStorage extends FakeHybrid implements FFmpegKitStorage {
  readonly calls: Array<[string, ...unknown[]]> = [];
  constructor() {
    super('FFmpegKitStorage');
  }
  getSafParameter(uri: string, openMode: string): string {
    this.calls.push(['getSafParameter', uri, openMode]);
    return `/proc/self/fd/42`;
  }
  selectDocument(
    writable: boolean,
    title: string | undefined,
    type: string | undefined,
    extraTypes: string[]
  ): Promise<string> {
    this.calls.push(['selectDocument', writable, title, type, extraTypes]);
    return Promise.resolve('content://picked/1');
  }
}

/** Lets pending promise callbacks run. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/** One fresh native world per test; installed by the jest mock in setup.ts. */
export const native: { core: FakeCore; storage: FakeStorage } = {
  core: new FakeCore(),
  storage: new FakeStorage(),
};

export function resetNative(): void {
  native.core = new FakeCore();
  native.storage = new FakeStorage();
}
