import { Platform } from 'react-native';
import { argumentsToString, parseArguments } from './arguments';
import { completeCallbacks, run, runInBackground } from './execution';
import {
  androidStorage,
  ensureInitialized,
  native,
  uninitialize,
} from './internal/native';
import type { LogRedirectionStrategy } from './LogRedirectionStrategy';
import { type SessionState, sessionStateToString } from './SessionState';
import type { Signal } from './Signal';
import {
  type AbstractSession,
  clearWrappers,
  type FFmpegSession,
  type FFmpegSessionCompleteCallback,
  type FFprobeSession,
  type FFprobeSessionCompleteCallback,
  listFFmpegSessions,
  listFFprobeSessions,
  listMediaInformationSessions,
  type LogCallback,
  type MediaInformationSession,
  type MediaInformationSessionCompleteCallback,
  nativeLogCallback,
  nativeStatisticsCallback,
  type StatisticsCallback,
  wrap,
  wrapAll,
} from './sessions';

let globalLogCallback: LogCallback | undefined;
let globalStatisticsCallback: StatisticsCallback | undefined;

export class FFmpegKitConfig {
  /** Turns on native log/statistics redirection once. No native awaits. */
  static async init(): Promise<void> {
    ensureInitialized();
  }

  static async uninit(): Promise<void> {
    uninitialize();
  }

  static async enableRedirection(): Promise<void> {
    native().enableRedirection();
  }

  static async disableRedirection(): Promise<void> {
    native().disableRedirection();
  }

  static async setFontconfigConfigurationPath(path: string): Promise<void> {
    native().setFontconfigConfigurationPath(path);
  }

  static async setFontDirectory(
    path: string,
    mapping?: Record<string, string>
  ): Promise<void> {
    native().setFontDirectoryList([path], mapping ?? {});
  }

  static async setFontDirectoryList(
    fontDirectoryList: string[],
    mapping?: Record<string, string>
  ): Promise<void> {
    native().setFontDirectoryList(fontDirectoryList, mapping ?? {});
  }

  static async registerNewFFmpegPipe(): Promise<string> {
    return native().registerNewFFmpegPipe();
  }

  static async closeFFmpegPipe(ffmpegPipePath: string): Promise<void> {
    native().closeFFmpegPipe(ffmpegPipePath);
  }

  static async getFFmpegVersion(): Promise<string> {
    return native().ffmpegVersion;
  }

  /** The binaries' release tag as a version ("ffmpeg-android-6.0.3" -> "6.0.3"); a custom tag comes back as is. */
  static async getVersion(): Promise<string> {
    return native().binaryVersion.replace(/^ffmpeg-(android|ios)-/, '');
  }

  static async isLTSBuild(): Promise<boolean> {
    return native().isLTSBuild;
  }

  static async getBuildDate(): Promise<string> {
    return native().buildDate;
  }

  static async setEnvironmentVariable(
    name: string,
    value: string
  ): Promise<void> {
    native().setEnvironmentVariable(name, value);
  }

  static async ignoreSignal(signal: Signal): Promise<void> {
    native().ignoreSignal(signal);
  }

  static async ffmpegExecute(session: FFmpegSession): Promise<void> {
    await run(session, false);
  }

  static async ffprobeExecute(session: FFprobeSession): Promise<void> {
    await run(session, false);
  }

  static async getMediaInformationExecute(
    session: MediaInformationSession,
    _waitTimeout?: number
  ): Promise<void> {
    await run(session, false);
  }

  static async asyncFFmpegExecute(session: FFmpegSession): Promise<void> {
    runInBackground(session);
  }

  static async asyncFFprobeExecute(session: FFprobeSession): Promise<void> {
    runInBackground(session);
  }

  static async asyncGetMediaInformationExecute(
    session: MediaInformationSession,
    _waitTimeout?: number
  ): Promise<void> {
    runInBackground(session);
  }

  /** One native listener for all sessions; pass undefined to remove it. */
  static enableLogCallback(logCallback: LogCallback | undefined): void {
    globalLogCallback = logCallback;
    native().setLogCallback(nativeLogCallback(logCallback));
  }

  static enableStatisticsCallback(
    statisticsCallback: StatisticsCallback | undefined
  ): void {
    globalStatisticsCallback = statisticsCallback;
    native().setStatisticsCallback(
      nativeStatisticsCallback(statisticsCallback)
    );
  }

  static enableFFmpegSessionCompleteCallback(
    completeCallback: FFmpegSessionCompleteCallback | undefined
  ): void {
    completeCallbacks.setFFmpeg(completeCallback);
  }

  static getFFmpegSessionCompleteCallback():
    | FFmpegSessionCompleteCallback
    | undefined {
    return completeCallbacks.getFFmpeg();
  }

  static enableFFprobeSessionCompleteCallback(
    completeCallback: FFprobeSessionCompleteCallback | undefined
  ): void {
    completeCallbacks.setFFprobe(completeCallback);
  }

  static getFFprobeSessionCompleteCallback():
    | FFprobeSessionCompleteCallback
    | undefined {
    return completeCallbacks.getFFprobe();
  }

  static enableMediaInformationSessionCompleteCallback(
    completeCallback: MediaInformationSessionCompleteCallback | undefined
  ): void {
    completeCallbacks.setMediaInformation(completeCallback);
  }

  static getMediaInformationSessionCompleteCallback():
    | MediaInformationSessionCompleteCallback
    | undefined {
    return completeCallbacks.getMediaInformation();
  }

  /** @internal Exposed for symmetry with the global setters. */
  static getLogCallback(): LogCallback | undefined {
    return globalLogCallback;
  }

  /** @internal Exposed for symmetry with the global setters. */
  static getStatisticsCallback(): StatisticsCallback | undefined {
    return globalStatisticsCallback;
  }

  static getLogLevel(): number {
    return native().logLevel;
  }

  static async setLogLevel(level: number): Promise<void> {
    native().logLevel = level;
  }

  static async getSafParameterForRead(uriString: string): Promise<string> {
    return FFmpegKitConfig.getSafParameter(uriString, 'r');
  }

  static async getSafParameterForWrite(uriString: string): Promise<string> {
    return FFmpegKitConfig.getSafParameter(uriString, 'w');
  }

  static async getSafParameter(
    uriString: string,
    openMode: string
  ): Promise<string> {
    return androidStorage().getSafParameter(uriString, openMode);
  }

  static async getSessionHistorySize(): Promise<number> {
    return native().sessionHistorySize;
  }

  static async setSessionHistorySize(sessionHistorySize: number): Promise<void> {
    native().sessionHistorySize = sessionHistorySize;
  }

  static async getSession(sessionId: number): Promise<AbstractSession | undefined> {
    return wrap(native().getSession(sessionId));
  }

  static async getLastSession(): Promise<AbstractSession | undefined> {
    return wrap(native().getLastSession());
  }

  static async getLastCompletedSession(): Promise<AbstractSession | undefined> {
    return wrap(native().getLastCompletedSession());
  }

  static async getSessions(): Promise<AbstractSession[]> {
    return wrapAll(native().getSessions());
  }

  static async clearSessions(): Promise<void> {
    native().clearSessions();
    clearWrappers();
  }

  static async getFFmpegSessions(): Promise<FFmpegSession[]> {
    return listFFmpegSessions();
  }

  static async getFFprobeSessions(): Promise<FFprobeSession[]> {
    return listFFprobeSessions();
  }

  static async getMediaInformationSessions(): Promise<
    MediaInformationSession[]
  > {
    return listMediaInformationSessions();
  }

  static async getSessionsByState(
    state: SessionState
  ): Promise<AbstractSession[]> {
    return wrapAll(
      native()
        .getSessions()
        .filter((s) => (s.state as number) === state)
    );
  }

  static getLogRedirectionStrategy(): LogRedirectionStrategy {
    return native().logRedirectionStrategy as LogRedirectionStrategy;
  }

  static setLogRedirectionStrategy(
    logRedirectionStrategy: LogRedirectionStrategy
  ): void {
    native().logRedirectionStrategy = logRedirectionStrategy;
  }

  /** Logs are stored natively before dispatch, so nothing is ever in transit. */
  static async messagesInTransmit(_sessionId: number): Promise<number> {
    return 0;
  }

  static sessionStateToString(state: number): string {
    return sessionStateToString(state);
  }

  /**
   * Splits a command into arguments. Single or double quotes group words and
   * are stripped; a quote preceded by a backslash is kept as a literal.
   */
  static parseArguments(command: string): string[] {
    return parseArguments(command);
  }

  static argumentsToString(commandArguments: string[] | undefined): string {
    return argumentsToString(commandArguments);
  }

  static async enableLogs(): Promise<void> {
    native().logsEnabled = true;
  }

  static async disableLogs(): Promise<void> {
    native().logsEnabled = false;
  }

  static async enableStatistics(): Promise<void> {
    native().statisticsEnabled = true;
  }

  static async disableStatistics(): Promise<void> {
    native().statisticsEnabled = false;
  }

  static async getPlatform(): Promise<string> {
    return Platform.OS;
  }

  static async writeToPipe(inputPath: string, pipePath: string): Promise<number> {
    return native().writeToPipe(inputPath, pipePath);
  }

  static async selectDocumentForRead(
    type?: string,
    extraTypes?: string[]
  ): Promise<string> {
    return androidStorage().selectDocument(
      false,
      undefined,
      type,
      extraTypes ?? []
    );
  }

  static async selectDocumentForWrite(
    title?: string,
    type?: string,
    extraTypes?: string[]
  ): Promise<string> {
    return androidStorage().selectDocument(true, title, type, extraTypes ?? []);
  }
}
