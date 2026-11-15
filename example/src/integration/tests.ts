/*
 * On-device integration tests: real FFmpeg through the public API and the
 * C++ core. Inputs come from FFmpeg's lavfi test source and output goes to
 * the null muxer, so no media files or writable paths are needed.
 */
import {
  FFmpegKit,
  FFmpegKitConfig,
  FFprobeKit,
  Level,
  ReturnCode,
  SessionState,
  type Log,
  type Statistics,
} from 'react-native-ffmpeg-kit';

export interface TestCase {
  name: string;
  run: () => Promise<void>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function equal<T>(actual: T, expected: T, what: string) {
  assert(actual === expected, `${what}: expected ${String(expected)}, got ${String(actual)}`);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits for the JS callbacks Nitro scheduled before the session finished. */
const settle = () => delay(50);

/** Encodes `seconds` of a synthetic 320x240 video and discards the result. */
function encode(seconds: number, realtime = false): string {
  return [
    '-hide_banner',
    realtime ? '-re' : '',
    `-f lavfi -i testsrc=duration=${seconds}:size=320x240:rate=25`,
    '-c:v mpeg4 -f null -',
  ]
    .filter(Boolean)
    .join(' ');
}

export const tests: TestCase[] = [
  {
    name: 'build info is available synchronously from native',
    run: async () => {
      const version = await FFmpegKitConfig.getFFmpegVersion();
      assert(version.length > 0, 'empty FFmpeg version');
      assert(/\d/.test(await FFmpegKitConfig.getVersion()), 'binary version has no digits');
      assert((await FFmpegKitConfig.getBuildDate()).length > 0, 'empty build date');
    },
  },
  {
    name: 'execute -version succeeds and captures output',
    run: async () => {
      const session = await FFmpegKit.execute('-version');
      equal(ReturnCode.isSuccess(await session.getReturnCode()), true, 'success');
      equal(await session.getState(), SessionState.COMPLETED, 'state');
      assert((await session.getOutput()).includes('ffmpeg version'), 'output lacks "ffmpeg version"');
    },
  },
  {
    name: 'encode delivers logs, statistics and completion',
    run: async () => {
      const logs: Log[] = [];
      const stats: Statistics[] = [];
      const done = new Promise<void>((resolve) => {
        FFmpegKit.executeAsync(
          encode(2),
          () => resolve(),
          (log) => logs.push(log),
          (s) => stats.push(s)
        );
      });
      await done;
      await settle();
      assert(logs.length > 0, 'no log callbacks');
      assert(stats.length > 0, 'no statistics callbacks');
      const last = stats[stats.length - 1]!;
      assert(last.getVideoFrameNumber() > 0, 'no frames reported');
      const session = await FFmpegKitConfig.getLastSession();
      equal(ReturnCode.isSuccess(await session!.getReturnCode()), true, 'success');
      assert(logs.every((l) => l.getSessionId() === session!.getSessionId()), 'logs tagged with wrong session');
    },
  },
  {
    name: 'concurrent sessions keep their logs apart',
    run: async () => {
      const a: Log[] = [];
      const b: Log[] = [];
      const run = (sink: Log[]) =>
        new Promise<number>((resolve) => {
          FFmpegKit.executeAsync(
            encode(2),
            (session) => resolve(session.getSessionId()),
            (log) => sink.push(log)
          );
        });
      const [idA, idB] = await Promise.all([run(a), run(b)]);
      await settle();
      assert(idA !== idB, 'same session id');
      assert(a.length > 0 && b.length > 0, 'a session received no logs');
      assert(a.every((l) => l.getSessionId() === idA), 'session A got foreign logs');
      assert(b.every((l) => l.getSessionId() === idB), 'session B got foreign logs');
    },
  },
  {
    name: 'cancel stops a running session with return code 255',
    run: async () => {
      const finished = new Promise<number>((resolve) => {
        FFmpegKit.executeAsync(encode(30, true), async (session) => {
          resolve((await session.getReturnCode())!.getValue());
        });
      });
      await delay(1000);
      const running = await FFmpegKitConfig.getLastSession();
      equal(await running!.getState(), SessionState.RUNNING, 'state before cancel');
      await running!.cancel();
      equal(await finished, ReturnCode.CANCEL, 'return code');
    },
  },
  {
    name: 'FFmpegKit.cancel() cancels every running session',
    run: async () => {
      const start = () =>
        new Promise<number>((resolve) => {
          FFmpegKit.executeAsync(encode(30, true), async (session) => {
            resolve((await session.getReturnCode())!.getValue());
          });
        });
      const both = Promise.all([start(), start()]);
      await delay(1000);
      await FFmpegKit.cancel();
      const codes = await both;
      equal(codes[0], ReturnCode.CANCEL, 'first return code');
      equal(codes[1], ReturnCode.CANCEL, 'second return code');
    },
  },
  {
    name: 'log level filters natively before JS',
    run: async () => {
      const previous = FFmpegKitConfig.getLogLevel();
      try {
        await FFmpegKitConfig.setLogLevel(Level.AV_LOG_ERROR);
        const logs: Log[] = [];
        await new Promise<void>((resolve) => {
          FFmpegKit.executeAsync('-version', () => resolve(), (log) => logs.push(log));
        });
        await settle();
        assert(
          logs.every((l) => l.getLevel() <= Level.AV_LOG_ERROR),
          `got ${logs.filter((l) => l.getLevel() > Level.AV_LOG_ERROR).length} lines above ERROR`
        );
      } finally {
        await FFmpegKitConfig.setLogLevel(previous);
      }
    },
  },
  {
    name: 'media information is parsed from ffprobe JSON',
    run: async () => {
      const session = await FFprobeKit.getMediaInformationFromCommandArguments([
        '-v',
        'error',
        '-hide_banner',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        '-show_chapters',
        '-f',
        'lavfi',
        '-i',
        'testsrc=duration=1:size=320x240:rate=25',
      ]);
      const info = session.getMediaInformation();
      assert(info !== undefined, `no media information; output: ${(await session.getOutput()).slice(0, 200)}`);
      equal(info.getFormat(), 'lavfi', 'format');
      const video = info.getStreams()[0];
      equal(video?.getWidth(), 320, 'width');
      equal(video?.getHeight(), 240, 'height');
    },
  },
  {
    name: 'an invalid command fails with a non-zero return code',
    run: async () => {
      const session = await FFmpegKit.execute('-no-such-option');
      const rc = await session.getReturnCode();
      equal(rc?.isValueError(), true, 'error return code');
      equal(await session.getState(), SessionState.COMPLETED, 'state');
    },
  },
  {
    name: 'getSession returns the same session object',
    run: async () => {
      const session = await FFmpegKit.execute('-version');
      const found = await FFmpegKitConfig.getSession(session.getSessionId());
      assert(found === session, 'different object');
    },
  },
  {
    name: 'pipes can be registered and closed',
    run: async () => {
      const pipe = await FFmpegKitConfig.registerNewFFmpegPipe();
      assert(pipe.length > 0, 'empty pipe path');
      await FFmpegKitConfig.closeFFmpegPipe(pipe);
    },
  },
];

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  ms: number;
}

export async function runTests(onResult: (result: TestResult) => void): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const test of tests) {
    const start = Date.now();
    let result: TestResult;
    try {
      await test.run();
      result = { name: test.name, passed: true, ms: Date.now() - start };
    } catch (e) {
      result = { name: test.name, passed: false, error: String((e as Error)?.message ?? e), ms: Date.now() - start };
    }
    results.push(result);
    onResult(result);
  }
  return results;
}
