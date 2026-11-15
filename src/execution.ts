/*
 * Running sessions: waits for the native run, parses media information, and
 * notifies complete callbacks (async executions only).
 */
import { safely } from './internal/safely';
import { Level } from './Level';
import { ReturnCode } from './ReturnCode';
import { MediaInformation } from './media/MediaInformation';
import {
  type AbstractSession,
  FFmpegSession,
  type FFmpegSessionCompleteCallback,
  FFprobeSession,
  type FFprobeSessionCompleteCallback,
  MediaInformationSession,
  type MediaInformationSessionCompleteCallback,
  nativeSession,
} from './sessions';

let globalFFmpegComplete: FFmpegSessionCompleteCallback | undefined;
let globalFFprobeComplete: FFprobeSessionCompleteCallback | undefined;
let globalMediaInformationComplete:
  | MediaInformationSessionCompleteCallback
  | undefined;

/** ffprobe's writer prints its JSON at AV_LOG_STDERR; anything else is a diagnostic. */
function parseMediaInformation(session: MediaInformationSession): void {
  const n = nativeSession(session);
  if (n.returnCode !== ReturnCode.SUCCESS) {
    return;
  }
  const json = n
    .getLogs()
    .filter((log) => log.level === Level.AV_LOG_STDERR)
    .map((log) => log.message)
    .join('');
  try {
    session.setMediaInformation(new MediaInformation(JSON.parse(json)));
  } catch {
    session.setMediaInformation(undefined);
  }
}

function notifyComplete(session: AbstractSession): void {
  if (session instanceof FFmpegSession) {
    const own = session.getCompleteCallback();
    if (own) safely('session complete callback', () => own(session));
    const global = globalFFmpegComplete;
    if (global) safely('global complete callback', () => global(session));
  } else if (session instanceof FFprobeSession) {
    const own = session.getCompleteCallback();
    if (own) safely('session complete callback', () => own(session));
    const global = globalFFprobeComplete;
    if (global) safely('global complete callback', () => global(session));
  } else if (session instanceof MediaInformationSession) {
    const own = session.getCompleteCallback();
    if (own) safely('session complete callback', () => own(session));
    const global = globalMediaInformationComplete;
    if (global) safely('global complete callback', () => global(session));
  }
}

/** Runs a session and waits for it. Complete callbacks fire only for async executions. */
export async function run(session: AbstractSession, notify: boolean): Promise<void> {
  await nativeSession(session).execute();
  if (session instanceof MediaInformationSession) {
    parseMediaInformation(session);
  }
  if (notify) {
    notifyComplete(session);
  }
}

export function runInBackground(session: AbstractSession): void {
  run(session, true).catch((err) =>
    console.log(
      `Session ${session.getSessionId()} failed to execute.`,
      (err as Error)?.stack
    )
  );
}

export const completeCallbacks = {
  setFFmpeg(callback: FFmpegSessionCompleteCallback | undefined): void {
    globalFFmpegComplete = callback;
  },
  getFFmpeg(): FFmpegSessionCompleteCallback | undefined {
    return globalFFmpegComplete;
  },
  setFFprobe(callback: FFprobeSessionCompleteCallback | undefined): void {
    globalFFprobeComplete = callback;
  },
  getFFprobe(): FFprobeSessionCompleteCallback | undefined {
    return globalFFprobeComplete;
  },
  setMediaInformation(
    callback: MediaInformationSessionCompleteCallback | undefined
  ): void {
    globalMediaInformationComplete = callback;
  },
  getMediaInformation(): MediaInformationSessionCompleteCallback | undefined {
    return globalMediaInformationComplete;
  },
};
