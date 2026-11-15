import { parseArguments } from './arguments';
import { run, runInBackground } from './execution';
import { native } from './internal/native';
import type { LogCallback, StatisticsCallback } from './sessions';
import {
  FFmpegSession,
  type FFmpegSessionCompleteCallback,
  listFFmpegSessions,
} from './sessions';

export class FFmpegKit {
  static async execute(command: string): Promise<FFmpegSession> {
    return FFmpegKit.executeWithArguments(
      parseArguments(command)
    );
  }

  static async executeWithArguments(
    commandArguments: string[]
  ): Promise<FFmpegSession> {
    const session = await FFmpegSession.create(commandArguments);
    await run(session, false);
    return session;
  }

  static async executeAsync(
    command: string,
    completeCallback?: FFmpegSessionCompleteCallback,
    logCallback?: LogCallback,
    statisticsCallback?: StatisticsCallback
  ): Promise<FFmpegSession> {
    return FFmpegKit.executeWithArgumentsAsync(
      parseArguments(command),
      completeCallback,
      logCallback,
      statisticsCallback
    );
  }

  static async executeWithArgumentsAsync(
    commandArguments: string[],
    completeCallback?: FFmpegSessionCompleteCallback,
    logCallback?: LogCallback,
    statisticsCallback?: StatisticsCallback
  ): Promise<FFmpegSession> {
    const session = await FFmpegSession.create(
      commandArguments,
      completeCallback,
      logCallback,
      statisticsCallback
    );
    runInBackground(session);
    return session;
  }

  /** Cancels one session, or every running session when sessionId is omitted. */
  static async cancel(sessionId?: number): Promise<void> {
    native().cancel(sessionId);
  }

  static async listSessions(): Promise<FFmpegSession[]> {
    return listFFmpegSessions();
  }
}
