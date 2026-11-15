/*
 * Characterization tests: pin down the pure-JS behaviour of the public API as
 * it was before the Nitro port. They passed against the old src/index.js and
 * must keep passing after it.
 */
import { loadApi } from './helpers';

describe('FFmpegKitConfig.parseArguments', () => {
  const { api } = loadApi();
  const parse = api.FFmpegKitConfig.parseArguments;

  it('splits on spaces and drops repeated spaces', () => {
    expect(parse('-i  in.mp4   -c:v  copy out.mp4')).toEqual([
      '-i',
      'in.mp4',
      '-c:v',
      'copy',
      'out.mp4',
    ]);
  });

  it('keeps spaces inside double quotes and strips the quotes', () => {
    expect(parse('-i "my file.mp4" out.mp4')).toEqual([
      '-i',
      'my file.mp4',
      'out.mp4',
    ]);
  });

  it('keeps spaces inside single quotes and strips the quotes', () => {
    expect(parse("-vf 'scale=320:240, fps=10' out.mp4")).toEqual([
      '-vf',
      'scale=320:240, fps=10',
      'out.mp4',
    ]);
  });

  it('keeps a single quote that appears inside double quotes', () => {
    expect(parse(`-metadata "title=It's here"`)).toEqual([
      '-metadata',
      "title=It's here",
    ]);
  });

  it('keeps a double quote that appears inside single quotes', () => {
    expect(parse(`-metadata 'title=say "hi"'`)).toEqual([
      '-metadata',
      'title=say "hi"',
    ]);
  });

  it('treats a backslash-escaped quote as a literal character', () => {
    expect(parse('-metadata title=a\\"b')).toEqual([
      '-metadata',
      'title=a\\"b',
    ]);
  });

  it('returns an empty list for an empty or blank command', () => {
    expect(parse('')).toEqual([]);
    expect(parse('   ')).toEqual([]);
  });
});

describe('FFmpegKitConfig.argumentsToString', () => {
  const { api } = loadApi();

  it('joins arguments with single spaces', () => {
    expect(
      api.FFmpegKitConfig.argumentsToString(['-i', 'in.mp4', 'out.mp4'])
    ).toBe('-i in.mp4 out.mp4');
  });

  it("returns 'undefined' for undefined input", () => {
    expect(api.FFmpegKitConfig.argumentsToString(undefined as any)).toBe(
      'undefined'
    );
  });
});

describe('enums and constants', () => {
  const { api } = loadApi();

  it('SessionState', () => {
    expect(api.SessionState).toMatchObject({
      CREATED: 0,
      RUNNING: 1,
      FAILED: 2,
      COMPLETED: 3,
    });
  });

  it('LogRedirectionStrategy', () => {
    expect(api.LogRedirectionStrategy).toMatchObject({
      ALWAYS_PRINT_LOGS: 0,
      PRINT_LOGS_WHEN_NO_CALLBACKS_DEFINED: 1,
      PRINT_LOGS_WHEN_GLOBAL_CALLBACK_NOT_DEFINED: 2,
      PRINT_LOGS_WHEN_SESSION_CALLBACK_NOT_DEFINED: 3,
      NEVER_PRINT_LOGS: 4,
    });
  });

  it('Signal', () => {
    expect(api.Signal).toMatchObject({
      SIGINT: 2,
      SIGQUIT: 3,
      SIGPIPE: 13,
      SIGTERM: 15,
      SIGXCPU: 24,
    });
  });

  it('Level values match ffmpeg AV_LOG_*', () => {
    const { Level } = api;
    expect([
      Level.AV_LOG_STDERR,
      Level.AV_LOG_QUIET,
      Level.AV_LOG_PANIC,
      Level.AV_LOG_FATAL,
      Level.AV_LOG_ERROR,
      Level.AV_LOG_WARNING,
      Level.AV_LOG_INFO,
      Level.AV_LOG_VERBOSE,
      Level.AV_LOG_DEBUG,
      Level.AV_LOG_TRACE,
    ]).toEqual([-16, -8, 0, 8, 16, 24, 32, 40, 48, 56]);
  });

  it.each([
    [56, 'TRACE'],
    [48, 'DEBUG'],
    [40, 'VERBOSE'],
    [32, 'INFO'],
    [24, 'WARNING'],
    [16, 'ERROR'],
    [8, 'FATAL'],
    [0, 'PANIC'],
    [-16, 'STDERR'],
    [-8, ''],
    [99, ''],
  ])('Level.levelToString(%i) is %j', (level, name) => {
    expect(api.Level.levelToString(level)).toBe(name);
  });

  it.each([
    [0, 'CREATED'],
    [1, 'RUNNING'],
    [2, 'FAILED'],
    [3, 'COMPLETED'],
    [7, ''],
  ])('FFmpegKitConfig.sessionStateToString(%i) is %j', (state, name) => {
    expect(api.FFmpegKitConfig.sessionStateToString(state)).toBe(name);
  });
});

describe('ReturnCode', () => {
  const { api } = loadApi();
  const { ReturnCode } = api;

  it('has SUCCESS 0 and CANCEL 255', () => {
    expect(ReturnCode.SUCCESS).toBe(0);
    expect(ReturnCode.CANCEL).toBe(255);
  });

  it.each([
    [0, true, false, false],
    [255, false, true, false],
    [1, false, false, true],
  ])('value %i: success=%s cancel=%s error=%s', (v, success, cancel, error) => {
    const rc = new ReturnCode(v);
    expect(rc.getValue()).toBe(v);
    expect(rc.isValueSuccess()).toBe(success);
    expect(rc.isValueCancel()).toBe(cancel);
    expect(rc.isValueError()).toBe(error);
    expect(ReturnCode.isSuccess(rc)).toBe(success);
    expect(ReturnCode.isCancel(rc)).toBe(cancel);
  });

  it('static checks are false for undefined', () => {
    expect(ReturnCode.isSuccess(undefined as any)).toBe(false);
    expect(ReturnCode.isCancel(undefined as any)).toBe(false);
  });
});

describe('Log and Statistics value objects', () => {
  const { api } = loadApi();

  it('Log exposes its fields', () => {
    const log = new api.Log(7, 32, 'hello');
    expect(log.getSessionId()).toBe(7);
    expect(log.getLevel()).toBe(32);
    expect(log.getMessage()).toBe('hello');
  });

  it('Statistics exposes and updates its fields', () => {
    const s = new api.Statistics(7, 10, 25, 28, 2048, 400, 512, 1.25);
    expect([
      s.getSessionId(),
      s.getVideoFrameNumber(),
      s.getVideoFps(),
      s.getVideoQuality(),
      s.getSize(),
      s.getTime(),
      s.getBitrate(),
      s.getSpeed(),
    ]).toEqual([7, 10, 25, 28, 2048, 400, 512, 1.25]);
    s.setSpeed(2);
    s.setVideoFrameNumber(11);
    expect(s.getSpeed()).toBe(2);
    expect(s.getVideoFrameNumber()).toBe(11);
  });
});
