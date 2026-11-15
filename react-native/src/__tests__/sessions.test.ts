/*
 * Contract tests: how the public API drives the Nitro hybrid objects for
 * session work. Written before the port; the fake implements the spec.
 */
import { loadApi } from './helpers';
import { FFPROBE_JSON } from './fixtures';
import { NativeSessionState } from '../specs/NativeSessionState';
import { NativeSessionType } from '../specs/NativeSessionType';

describe('FFmpegKit.executeAsync', () => {
  it('creates an ffmpeg session from the parsed command and starts it', async () => {
    const { api, native } = loadApi();
    const session = await api.FFmpegKit.executeAsync('-i "in put.mp4" out.mp4');

    const created = native.core.sessions[0]!;
    expect(created.type).toBe(NativeSessionType.FFMPEG);
    expect(created.args).toEqual(['-i', 'in put.mp4', 'out.mp4']);
    expect(created.executeCalls).toBe(1);

    expect(session).toBeInstanceOf(api.FFmpegSession);
    expect(session.getSessionId()).toBe(created.sessionId);
    expect(session.getArguments()).toEqual(['-i', 'in put.mp4', 'out.mp4']);
    expect(session.getCommand()).toBe('-i in put.mp4 out.mp4');
    expect(session.getCreateTime()).toEqual(new Date(created.createTime));
    expect(session.isFFmpeg()).toBe(true);
    expect(session.isFFprobe()).toBe(false);
    expect(session.isMediaInformation()).toBe(false);
  });

  it('does not wait for the session to finish', async () => {
    const { api, native } = loadApi();
    const session = await api.FFmpegKit.executeAsync('-version');
    expect(native.core.sessions[0]!.state).toBe(NativeSessionState.RUNNING);
    expect(await session.getState()).toBe(api.SessionState.RUNNING);
    expect(await session.getReturnCode()).toBeUndefined();
  });

  it('passes no native callbacks when JS does not listen (no JS thread hop)', async () => {
    const { api, native } = loadApi();
    await api.FFmpegKit.executeAsync('-version');
    expect(native.core.sessions[0]!.onLog).toBeUndefined();
    expect(native.core.sessions[0]!.onStatistics).toBeUndefined();
  });

  it('delivers logs as Log objects to the session log callback', async () => {
    const { api, native } = loadApi();
    const logs: InstanceType<typeof api.Log>[] = [];
    await api.FFmpegKit.executeAsync('-version', undefined, (log) => logs.push(log));

    native.core.sessions[0]!.emitLog(api.Level.AV_LOG_INFO, 'ffmpeg version 6.0\n');
    expect(logs).toHaveLength(1);
    expect(logs[0]).toBeInstanceOf(api.Log);
    expect(logs[0]!.getSessionId()).toBe(native.core.sessions[0]!.sessionId);
    expect(logs[0]!.getLevel()).toBe(32);
    expect(logs[0]!.getMessage()).toBe('ffmpeg version 6.0\n');
  });

  it('delivers statistics as Statistics objects to the session statistics callback', async () => {
    const { api, native } = loadApi();
    const stats: InstanceType<typeof api.Statistics>[] = [];
    await api.FFmpegKit.executeAsync('-i in.mp4 out.mp4', undefined, undefined, (s) =>
      stats.push(s)
    );

    native.core.sessions[0]!.emitStatistics({ videoFrameNumber: 42, speed: 2.5 });
    expect(stats).toHaveLength(1);
    expect(stats[0]).toBeInstanceOf(api.Statistics);
    expect(stats[0]!.getVideoFrameNumber()).toBe(42);
    expect(stats[0]!.getSpeed()).toBe(2.5);
  });

  it('calls the complete callback with the same session object once finished', async () => {
    const { api, native } = loadApi();
    const complete = jest.fn();
    const session = await api.FFmpegKit.executeAsync('-version', complete);
    expect(complete).not.toHaveBeenCalled();

    await native.core.sessions[0]!.finish(0);

    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0]).toBe(session);
    const rc = await session.getReturnCode();
    expect(rc).toBeInstanceOf(api.ReturnCode);
    expect(api.ReturnCode.isSuccess(rc)).toBe(true);
    expect(await session.getState()).toBe(api.SessionState.COMPLETED);
    expect(await session.getDuration()).toBe(1500);
    expect(await session.getEndTime()).toEqual(
      new Date(native.core.sessions[0]!.endTime)
    );
  });

  it('reports cancellation through the return code', async () => {
    const { api, native } = loadApi();
    const complete = jest.fn();
    const session = await api.FFmpegKit.executeAsync('-version', complete);
    await native.core.sessions[0]!.finish(255);
    expect(api.ReturnCode.isCancel(await session.getReturnCode())).toBe(true);
  });

  it('reports native failures through state and fail stack trace', async () => {
    const { api, native } = loadApi();
    const complete = jest.fn();
    const session = await api.FFmpegKit.executeAsync('-version', complete);
    await native.core.sessions[0]!.fail('boom at ffmpeg_execute');
    expect(complete).toHaveBeenCalledWith(session);
    expect(await session.getState()).toBe(api.SessionState.FAILED);
    expect(await session.getFailStackTrace()).toBe('boom at ffmpeg_execute');
  });

  it('a throwing user callback does not break delivery', async () => {
    const { api, native } = loadApi();
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const complete = jest.fn(() => {
      throw new Error('user bug');
    });
    const global = jest.fn();
    api.FFmpegKitConfig.enableFFmpegSessionCompleteCallback(global);
    await api.FFmpegKit.executeAsync('-version', complete);
    await native.core.sessions[0]!.finish(0);
    expect(global).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('accepts pre-split arguments', async () => {
    const { api, native } = loadApi();
    await api.FFmpegKit.executeWithArgumentsAsync(['-i', 'a b.mp4', 'out.mp4']);
    expect(native.core.sessions[0]!.args).toEqual(['-i', 'a b.mp4', 'out.mp4']);
  });
});

describe('FFmpegKit.execute', () => {
  it('resolves only after the session finishes', async () => {
    const { api, native, fakes } = loadApi();
    let resolved = false;
    const pending = api.FFmpegKit.execute('-version').then((s) => {
      resolved = true;
      return s;
    });
    await fakes.flush();
    expect(resolved).toBe(false);

    await native.core.sessions[0]!.finish(0);
    const session = await pending;
    expect(resolved).toBe(true);
    expect(api.ReturnCode.isSuccess(await session.getReturnCode())).toBe(true);
  });

  it('rejects when native execution rejects', async () => {
    const { api, native, fakes } = loadApi();
    const pending = api.FFmpegKit.execute('-version');
    await fakes.flush();
    const assertion = expect(pending).rejects.toThrow('native crash');
    await native.core.sessions[0]!.reject(new Error('native crash'));
    await assertion;
  });
});

describe('global callbacks', () => {
  it('enableLogCallback registers one native listener and wraps logs', async () => {
    const { api, native } = loadApi();
    const logs: string[] = [];
    api.FFmpegKitConfig.enableLogCallback((log) => logs.push(log.getMessage()));
    expect(native.core.globalLog).toBeDefined();

    await api.FFmpegKit.executeAsync('-version');
    native.core.sessions[0]!.emitLog(32, 'line\n');
    expect(logs).toEqual(['line\n']);
  });

  it('enableLogCallback(undefined) removes the native listener', () => {
    const { api, native } = loadApi();
    api.FFmpegKitConfig.enableLogCallback(() => {});
    api.FFmpegKitConfig.enableLogCallback(undefined as any);
    expect(native.core.globalLog).toBeUndefined();
  });

  it('enableStatisticsCallback registers one native listener and wraps statistics', async () => {
    const { api, native } = loadApi();
    const frames: number[] = [];
    api.FFmpegKitConfig.enableStatisticsCallback((s) =>
      frames.push(s.getVideoFrameNumber())
    );
    await api.FFmpegKit.executeAsync('-version');
    native.core.sessions[0]!.emitStatistics({ videoFrameNumber: 3 });
    expect(frames).toEqual([3]);
  });

  it('global complete callbacks fire per session type', async () => {
    const { api, native } = loadApi();
    const ffmpeg = jest.fn();
    const ffprobe = jest.fn();
    const mediaInfo = jest.fn();
    api.FFmpegKitConfig.enableFFmpegSessionCompleteCallback(ffmpeg);
    api.FFmpegKitConfig.enableFFprobeSessionCompleteCallback(ffprobe);
    api.FFmpegKitConfig.enableMediaInformationSessionCompleteCallback(mediaInfo);
    expect(api.FFmpegKitConfig.getFFmpegSessionCompleteCallback()).toBe(ffmpeg);

    await api.FFmpegKit.executeAsync('-version');
    await api.FFprobeKit.executeAsync('-version');
    await native.core.sessions[0]!.finish(0);
    await native.core.sessions[1]!.finish(0);

    expect(ffmpeg).toHaveBeenCalledTimes(1);
    expect(ffprobe).toHaveBeenCalledTimes(1);
    expect(mediaInfo).not.toHaveBeenCalled();
  });
});

describe('FFprobeKit', () => {
  it('executeAsync creates an ffprobe session', async () => {
    const { api, native } = loadApi();
    const session = await api.FFprobeKit.executeAsync('-show_format in.mp4');
    expect(native.core.sessions[0]!.type).toBe(NativeSessionType.FFPROBE);
    expect(session).toBeInstanceOf(api.FFprobeSession);
    expect(session.isFFprobe()).toBe(true);
  });

  it('getMediaInformation runs ffprobe with JSON output and parses it in JS', async () => {
    const { api, native, fakes } = loadApi();
    const pending = api.FFprobeKit.getMediaInformation('/data/in.mp4');
    await fakes.flush();

    const created = native.core.sessions[0]!;
    expect(created.type).toBe(NativeSessionType.MEDIA_INFORMATION);
    expect(created.args).toEqual([
      '-v',
      'error',
      '-hide_banner',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      '-show_chapters',
      '-i',
      '/data/in.mp4',
    ]);
    created.emitLog(api.Level.AV_LOG_STDERR, FFPROBE_JSON);
    await created.finish(0);

    const session = await pending;
    expect(session).toBeInstanceOf(api.MediaInformationSession);
    const info = session.getMediaInformation();
    expect(info).toBeInstanceOf(api.MediaInformation);
    expect(info!.getFormat()).toBe('mov,mp4,m4a,3gp,3g2,mj2');
    expect(info!.getStreams()[0]!.getWidth()).toBe(1280);
  });

  it('getMediaInformation leaves media information undefined when ffprobe fails', async () => {
    const { api, native, fakes } = loadApi();
    const pending = api.FFprobeKit.getMediaInformation('/missing.mp4');
    await fakes.flush();
    native.core.sessions[0]!.emitLog(16, '/missing.mp4: No such file or directory\n');
    await native.core.sessions[0]!.finish(1);
    const session = await pending;
    expect(session.getMediaInformation()).toBeUndefined();
  });

  it('getMediaInformationAsync calls back with parsed media information', async () => {
    const { api, native } = loadApi();
    const complete = jest.fn();
    await api.FFprobeKit.getMediaInformationAsync('/data/in.mp4', complete);
    native.core.sessions[0]!.emitLog(api.Level.AV_LOG_STDERR, FFPROBE_JSON);
    await native.core.sessions[0]!.finish(0);
    const session = complete.mock.calls[0][0];
    expect(session.getMediaInformation().getStreams()).toHaveLength(2);
  });
});

describe('session getters read native state synchronously', () => {
  it('logs, output and statistics come from the native session', async () => {
    const { api, native } = loadApi();
    const session = await api.FFmpegKit.executeAsync('-version');
    const fake = native.core.sessions[0]!;
    fake.emitLog(32, 'a\n');
    fake.emitLog(32, 'b\n');
    fake.emitStatistics({ videoFrameNumber: 1 });
    fake.emitStatistics({ videoFrameNumber: 2 });
    await fake.finish(0);

    const logs = await session.getLogs();
    expect(logs.map((l) => l.getMessage())).toEqual(['a\n', 'b\n']);
    expect((await session.getAllLogs()).map((l) => l.getMessage())).toEqual([
      'a\n',
      'b\n',
    ]);
    expect(await session.getAllLogsAsString()).toBe('a\nb\n');
    expect(await session.getLogsAsString()).toBe('a\nb\n');
    expect(await session.getOutput()).toBe('a\nb\n');
    expect(await session.thereAreAsynchronousMessagesInTransmit()).toBe(false);

    const ffmpegSession = session as InstanceType<typeof api.FFmpegSession>;
    const stats = await ffmpegSession.getAllStatistics();
    expect(stats.map((s) => s.getVideoFrameNumber())).toEqual([1, 2]);
    expect((await ffmpegSession.getStatistics()).length).toBe(2);
    expect((await ffmpegSession.getLastReceivedStatistics())!.getVideoFrameNumber()).toBe(2);
  });

  it('session.cancel cancels that native session', async () => {
    const { api, native } = loadApi();
    const session = await api.FFmpegKit.executeAsync('-version');
    await session.cancel();
    expect(native.core.sessions[0]!.cancelCalls).toBe(1);
  });

  it('keeps the per-session log redirection strategy', async () => {
    const { api, native } = loadApi();
    const session = await api.FFmpegSession.create(
      ['-version'],
      undefined,
      undefined,
      undefined,
      api.LogRedirectionStrategy.NEVER_PRINT_LOGS
    );
    expect(native.core.sessions[0]!.logRedirectionStrategy).toBe(4);
    expect(session.getLogRedirectionStrategy()).toBe(4);
  });

  it('uses the global strategy when the session does not set one', async () => {
    const { api, native } = loadApi();
    api.FFmpegKitConfig.setLogRedirectionStrategy(
      api.LogRedirectionStrategy.ALWAYS_PRINT_LOGS
    );
    await api.FFmpegKit.executeAsync('-version');
    expect(native.core.sessions[0]!.logRedirectionStrategy).toBe(0);
  });

  it('FFmpegKitConfig.ffmpegExecute runs an existing session to completion', async () => {
    const { api, native, fakes } = loadApi();
    const session = await api.FFmpegSession.create(['-version']);
    expect(native.core.sessions[0]!.executeCalls).toBe(0);
    const pending = api.FFmpegKitConfig.ffmpegExecute(session);
    await fakes.flush();
    expect(native.core.sessions[0]!.executeCalls).toBe(1);
    await native.core.sessions[0]!.finish(0);
    await expect(pending).resolves.toBeUndefined();
  });
});

describe('cancellation and session history', () => {
  it('FFmpegKit.cancel(id) cancels one session, cancel() cancels all', async () => {
    const { api, native } = loadApi();
    await api.FFmpegKit.cancel(5);
    await api.FFmpegKit.cancel();
    expect(native.core.calls).toEqual([
      ['cancel', 5],
      ['cancel', undefined],
    ]);
  });

  it('getSession returns the same wrapper, callbacks included', async () => {
    const { api } = loadApi();
    const onLog = jest.fn();
    const session = await api.FFmpegKit.executeAsync('-version', undefined, onLog);
    const found = await api.FFmpegKitConfig.getSession(session.getSessionId());
    expect(found).toBe(session);
    expect(found!.getLogCallback()).toBe(onLog);
  });

  it('getSession resolves undefined for an unknown id', async () => {
    const { api } = loadApi();
    await expect(api.FFmpegKitConfig.getSession(999)).resolves.toBeUndefined();
  });

  it('wraps sessions it did not create with the right class', async () => {
    const { api, native } = loadApi();
    native.core.createSession(NativeSessionType.FFPROBE, ['-version'], 3);
    const found = await api.FFmpegKitConfig.getSession(1);
    expect(found).toBeInstanceOf(api.FFprobeSession);
  });

  it('lists sessions by kind and state', async () => {
    const { api, native } = loadApi();
    await api.FFmpegKit.executeAsync('-version');
    await api.FFprobeKit.executeAsync('-version');
    await native.core.sessions[0]!.finish(0);

    expect(await api.FFmpegKitConfig.getSessions()).toHaveLength(2);
    expect(await api.FFmpegKit.listSessions()).toHaveLength(1);
    expect(await api.FFmpegKitConfig.getFFmpegSessions()).toHaveLength(1);
    expect(await api.FFmpegKitConfig.getFFprobeSessions()).toHaveLength(1);
    expect(await api.FFprobeKit.listFFprobeSessions()).toHaveLength(1);
    expect(await api.FFmpegKitConfig.getMediaInformationSessions()).toHaveLength(0);
    const completed = await api.FFmpegKitConfig.getSessionsByState(
      api.SessionState.COMPLETED
    );
    expect(completed.map((s) => s.getSessionId())).toEqual([1]);
    expect((await api.FFmpegKitConfig.getLastSession())!.getSessionId()).toBe(2);
    expect((await api.FFmpegKitConfig.getLastCompletedSession())!.getSessionId()).toBe(1);
  });

  it('clearSessions clears native history and the wrapper cache', async () => {
    const { api, native } = loadApi();
    const session = await api.FFmpegKit.executeAsync('-version');
    await api.FFmpegKitConfig.clearSessions();
    expect(native.core.sessions).toHaveLength(0);
    await expect(
      api.FFmpegKitConfig.getSession(session.getSessionId())
    ).resolves.toBeUndefined();
  });

  it('session history size is a native property', async () => {
    const { api, native } = loadApi();
    await api.FFmpegKitConfig.setSessionHistorySize(25);
    expect(native.core.sessionHistorySize).toBe(25);
    await expect(api.FFmpegKitConfig.getSessionHistorySize()).resolves.toBe(25);
  });
});
