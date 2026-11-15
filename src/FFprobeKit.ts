import { parseArguments } from './arguments';
import { run, runInBackground } from './execution';
import type { LogCallback } from './sessions';
import {
  FFprobeSession,
  type FFprobeSessionCompleteCallback,
  listFFprobeSessions,
  listMediaInformationSessions,
  MediaInformationSession,
  type MediaInformationSessionCompleteCallback,
} from './sessions';

const MEDIA_INFORMATION_ARGUMENTS = [
  '-v',
  'error',
  '-hide_banner',
  '-print_format',
  'json',
  '-show_format',
  '-show_streams',
  '-show_chapters',
  '-i',
];

export class FFprobeKit {
  static async execute(command: string): Promise<FFprobeSession> {
    return FFprobeKit.executeWithArguments(
      parseArguments(command)
    );
  }

  static async executeWithArguments(
    commandArguments: string[]
  ): Promise<FFprobeSession> {
    const session = await FFprobeSession.create(commandArguments);
    await run(session, false);
    return session;
  }

  static async executeAsync(
    command: string,
    completeCallback?: FFprobeSessionCompleteCallback,
    logCallback?: LogCallback
  ): Promise<FFprobeSession> {
    return FFprobeKit.executeWithArgumentsAsync(
      parseArguments(command),
      completeCallback,
      logCallback
    );
  }

  static async executeWithArgumentsAsync(
    commandArguments: string[],
    completeCallback?: FFprobeSessionCompleteCallback,
    logCallback?: LogCallback
  ): Promise<FFprobeSession> {
    const session = await FFprobeSession.create(
      commandArguments,
      completeCallback,
      logCallback
    );
    runInBackground(session);
    return session;
  }

  static async getMediaInformation(
    path: string,
    waitTimeout?: number
  ): Promise<MediaInformationSession> {
    return FFprobeKit.getMediaInformationFromCommandArguments(
      [...MEDIA_INFORMATION_ARGUMENTS, path],
      waitTimeout
    );
  }

  static async getMediaInformationFromCommand(
    command: string,
    waitTimeout?: number
  ): Promise<MediaInformationSession> {
    return FFprobeKit.getMediaInformationFromCommandArguments(
      parseArguments(command),
      waitTimeout
    );
  }

  static async getMediaInformationFromCommandArguments(
    commandArguments: string[],
    _waitTimeout?: number
  ): Promise<MediaInformationSession> {
    const session = await MediaInformationSession.create(commandArguments);
    await run(session, false);
    return session;
  }

  static async getMediaInformationAsync(
    path: string,
    completeCallback?: MediaInformationSessionCompleteCallback,
    logCallback?: LogCallback,
    waitTimeout?: number
  ): Promise<MediaInformationSession> {
    return FFprobeKit.getMediaInformationFromCommandArgumentsAsync(
      [...MEDIA_INFORMATION_ARGUMENTS, path],
      completeCallback,
      logCallback,
      waitTimeout
    );
  }

  static async getMediaInformationFromCommandAsync(
    command: string,
    completeCallback?: MediaInformationSessionCompleteCallback,
    logCallback?: LogCallback,
    waitTimeout?: number
  ): Promise<MediaInformationSession> {
    return FFprobeKit.getMediaInformationFromCommandArgumentsAsync(
      parseArguments(command),
      completeCallback,
      logCallback,
      waitTimeout
    );
  }

  static async getMediaInformationFromCommandArgumentsAsync(
    commandArguments: string[],
    completeCallback?: MediaInformationSessionCompleteCallback,
    logCallback?: LogCallback,
    _waitTimeout?: number
  ): Promise<MediaInformationSession> {
    const session = await MediaInformationSession.create(
      commandArguments,
      completeCallback,
      logCallback
    );
    runInBackground(session);
    return session;
  }

  static async listFFprobeSessions(): Promise<FFprobeSession[]> {
    return listFFprobeSessions();
  }

  static async listMediaInformationSessions(): Promise<
    MediaInformationSession[]
  > {
    return listMediaInformationSessions();
  }
}
