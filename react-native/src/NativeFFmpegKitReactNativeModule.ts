/*
 * TurboModule codegen spec for ffmpeg-kit-react-native (New Architecture only).
 *
 * This file is the single source of truth consumed by React Native codegen to
 * generate the native TurboModule interfaces (Android JNI/C++, iOS ObjC++).
 *
 * Typing strategy:
 *  - Dynamic map/array payloads are typed as `Object` (codegen `UnsafeObject`).
 *    The public, precisely-typed API lives in `index.d.ts`; this spec only has
 *    to describe the native bridge surface, so loose typing here is intentional
 *    and keeps the 65-method surface codegen-valid.
 *  - The 3 callbacks are exposed as codegen-typed events (EventEmitter<T>),
 *    replacing the legacy NativeEventEmitter + addListener/removeListeners pair.
 */
import type {TurboModule} from 'react-native';
import type {EventEmitter} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

/** Payload for the `FFmpegKitLogCallbackEvent`. */
export interface LogEvent {
  sessionId: number;
  level: number;
  message: string;
}

/** Payload for the `FFmpegKitStatisticsCallbackEvent`. */
export interface StatisticsEvent {
  sessionId: number;
  videoFrameNumber: number;
  videoFps: number;
  videoQuality: number;
  size: number;
  time: number;
  bitrate: number;
  speed: number;
}

/** Payload for the `FFmpegKitCompleteCallbackEvent` (session completion). */
export interface SessionCompleteEvent {
  sessionId: number;
  createTime: number;
  startTime: number;
  command: string;
  type: number;
  mediaInformation?: Object;
}

export interface Spec extends TurboModule {
  // ---- Codegen-typed events (replace the legacy emitter) --------------------
  readonly onFFmpegKitLogCallbackEvent: EventEmitter<LogEvent>;
  readonly onFFmpegKitStatisticsCallbackEvent: EventEmitter<StatisticsEvent>;
  readonly onFFmpegKitCompleteCallbackEvent: EventEmitter<SessionCompleteEvent>;

  // ---- AbstractSession ------------------------------------------------------
  abstractSessionGetEndTime(sessionId: number): Promise<Object>;
  abstractSessionGetDuration(sessionId: number): Promise<Object>;
  abstractSessionGetAllLogs(
    sessionId: number,
    waitTimeout: number,
  ): Promise<Object>;
  abstractSessionGetLogs(sessionId: number): Promise<Object>;
  abstractSessionGetAllLogsAsString(
    sessionId: number,
    waitTimeout: number,
  ): Promise<Object>;
  abstractSessionGetState(sessionId: number): Promise<Object>;
  abstractSessionGetReturnCode(sessionId: number): Promise<Object>;
  abstractSessionGetFailStackTrace(sessionId: number): Promise<Object>;
  thereAreAsynchronousMessagesInTransmit(sessionId: number): Promise<Object>;

  // ---- Arch / platform ------------------------------------------------------
  getArch(): Promise<string>;
  getPlatform(): Promise<string>;

  // ---- Session factories ----------------------------------------------------
  ffmpegSession(commandArguments: Array<string>): Promise<Object>;
  ffmpegSessionGetAllStatistics(
    sessionId: number,
    waitTimeout: number,
  ): Promise<Object>;
  ffmpegSessionGetStatistics(sessionId: number): Promise<Object>;
  ffprobeSession(commandArguments: Array<string>): Promise<Object>;
  mediaInformationSession(commandArguments: Array<string>): Promise<Object>;
  mediaInformationJsonParserFrom(ffprobeJsonOutput: string): Promise<Object>;
  mediaInformationJsonParserFromWithError(
    ffprobeJsonOutput: string,
  ): Promise<Object>;

  // ---- Config: redirection / logs / statistics ------------------------------
  enableRedirection(): Promise<void>;
  disableRedirection(): Promise<void>;
  enableLogs(): Promise<void>;
  disableLogs(): Promise<void>;
  enableStatistics(): Promise<void>;
  disableStatistics(): Promise<void>;

  // ---- Fonts / fontconfig ---------------------------------------------------
  setFontconfigConfigurationPath(path: string): Promise<void>;
  setFontDirectory(
    fontDirectoryPath: string,
    fontNameMap: Object,
  ): Promise<void>;
  setFontDirectoryList(
    fontDirectoryList: Array<string>,
    fontNameMap: Object,
  ): Promise<void>;

  // ---- Pipes ----------------------------------------------------------------
  registerNewFFmpegPipe(): Promise<string>;
  closeFFmpegPipe(ffmpegPipePath: string): Promise<void>;
  writeToPipe(inputPath: string, namedPipePath: string): Promise<Object>;

  // ---- Build info -----------------------------------------------------------
  getFFmpegVersion(): Promise<string>;
  isLTSBuild(): Promise<boolean>;
  getBuildDate(): Promise<string>;
  getPackageName(): Promise<string>;
  getExternalLibraries(): Promise<Object>;

  // ---- Environment / signals ------------------------------------------------
  setEnvironmentVariable(
    variableName: string,
    variableValue: string,
  ): Promise<void>;
  ignoreSignal(signalValue: number): Promise<void>;

  // ---- Execution ------------------------------------------------------------
  ffmpegSessionExecute(sessionId: number): Promise<Object>;
  ffprobeSessionExecute(sessionId: number): Promise<Object>;
  mediaInformationSessionExecute(
    sessionId: number,
    waitTimeout: number,
  ): Promise<Object>;
  asyncFFmpegSessionExecute(sessionId: number): Promise<void>;
  asyncFFprobeSessionExecute(sessionId: number): Promise<void>;
  asyncMediaInformationSessionExecute(
    sessionId: number,
    waitTimeout: number,
  ): Promise<void>;

  // ---- Log level ------------------------------------------------------------
  getLogLevel(): Promise<number>;
  setLogLevel(level: number): Promise<void>;

  // ---- Session history ------------------------------------------------------
  getSessionHistorySize(): Promise<number>;
  setSessionHistorySize(sessionHistorySize: number): Promise<void>;
  getSession(sessionId: number): Promise<Object>;
  getLastSession(): Promise<Object>;
  getLastCompletedSession(): Promise<Object>;
  getSessions(): Promise<Object>;
  clearSessions(): Promise<void>;
  getSessionsByState(sessionState: number): Promise<Object>;

  // ---- Log redirection strategy ---------------------------------------------
  getLogRedirectionStrategy(): Promise<number>;
  setLogRedirectionStrategy(logRedirectionStrategy: number): Promise<void>;
  messagesInTransmit(sessionId: number): Promise<Object>;

  // ---- Storage Access Framework (Android only; iOS rejects) -----------------
  selectDocument(
    writable: boolean,
    title: string,
    type: string,
    extraTypes: Array<string>,
  ): Promise<Object>;
  getSafParameter(uriString: string, openMode: string): Promise<Object>;

  // ---- Cancellation ---------------------------------------------------------
  cancel(): Promise<void>;
  cancelSession(sessionId: number): Promise<void>;

  // ---- Typed session lists --------------------------------------------------
  getFFmpegSessions(): Promise<Object>;
  getFFprobeSessions(): Promise<Object>;
  getMediaInformationSessions(): Promise<Object>;
  getMediaInformation(sessionId: number): Promise<Object>;

  // ---- Lifecycle ------------------------------------------------------------
  uninit(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'FFmpegKitReactNativeModule',
);
