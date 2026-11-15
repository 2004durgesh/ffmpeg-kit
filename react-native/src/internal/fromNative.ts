import { Log } from '../Log';
import { Statistics } from '../Statistics';
import type { NativeLog } from '../specs/NativeLog';
import type { NativeStatistics } from '../specs/NativeStatistics';

export function toLog(log: NativeLog): Log {
  return new Log(log.sessionId, log.level, log.message);
}

export function toStatistics(s: NativeStatistics): Statistics {
  return new Statistics(
    s.sessionId,
    s.videoFrameNumber,
    s.videoFps,
    s.videoQuality,
    s.size,
    s.time,
    s.bitrate,
    s.speed
  );
}

/** Native times are epoch milliseconds, 0 when absent. */
export function validDate(time: number): Date | undefined {
  return time > 0 ? new Date(time) : undefined;
}
