/*
 * Contract tests: config, build info, pipes, fonts and Android storage.
 * Build info is read from sync native properties, so none of it needs init().
 */
import { loadApi } from './helpers';

describe('init', () => {
  it('resolves and can be called repeatedly', async () => {
    const { api } = loadApi();
    await expect(api.FFmpegKitConfig.init()).resolves.toBeUndefined();
    await expect(api.FFmpegKitConfig.init()).resolves.toBeUndefined();
  });

  it('enables native redirection once', async () => {
    const { api, native } = loadApi();
    await api.FFmpegKitConfig.init();
    expect(native.core.redirectionEnabled).toBe(true);
  });
});

describe('build info', () => {
  it('reads versions from native properties', async () => {
    const { api } = loadApi();
    await expect(api.FFmpegKitConfig.getFFmpegVersion()).resolves.toBe('6.0');
    await expect(api.FFmpegKitConfig.getBuildDate()).resolves.toBe('20261101');
    await expect(api.FFmpegKitConfig.isLTSBuild()).resolves.toBe(false);
    await expect(api.Packages.getPackageName()).resolves.toBe('https');
    await expect(api.Packages.getExternalLibraries()).resolves.toEqual([
      'gmp',
      'openssl',
    ]);
    await expect(api.ArchDetect.getArch()).resolves.toBe('arm64-v8a');
  });

  it.each([
    ['ffmpeg-android-6.0.3', '6.0.3'],
    ['ffmpeg-ios-6.0.2', '6.0.2'],
    ['my-custom-build', 'my-custom-build'],
  ])('getVersion() turns binary tag %j into %j', async (tag, version) => {
    const { api, native } = loadApi();
    native.core.binaryVersion = tag;
    await expect(api.FFmpegKitConfig.getVersion()).resolves.toBe(version);
  });

  it.each(['ios', 'android'] as const)('getPlatform() is %s', async (os) => {
    const { api } = loadApi(os);
    await expect(api.FFmpegKitConfig.getPlatform()).resolves.toBe(os);
  });
});

describe('logging config', () => {
  it('log level is a sync getter backed by the native property', async () => {
    const { api, native } = loadApi();
    expect(api.FFmpegKitConfig.getLogLevel()).toBe(32);
    await api.FFmpegKitConfig.setLogLevel(api.Level.AV_LOG_ERROR);
    expect(native.core.logLevel).toBe(16);
    expect(api.FFmpegKitConfig.getLogLevel()).toBe(16);
  });

  it('log redirection strategy is backed by the native property', () => {
    const { api, native } = loadApi();
    api.FFmpegKitConfig.setLogRedirectionStrategy(
      api.LogRedirectionStrategy.NEVER_PRINT_LOGS
    );
    expect(native.core.logRedirectionStrategy).toBe(4);
    expect(api.FFmpegKitConfig.getLogRedirectionStrategy()).toBe(4);
  });

  it('enable/disable redirection, logs and statistics flip native flags', async () => {
    const { api, native } = loadApi();
    await api.FFmpegKitConfig.enableRedirection();
    expect(native.core.redirectionEnabled).toBe(true);
    await api.FFmpegKitConfig.disableRedirection();
    expect(native.core.redirectionEnabled).toBe(false);

    await api.FFmpegKitConfig.disableLogs();
    await api.FFmpegKitConfig.disableStatistics();
    expect(native.core.logsEnabled).toBe(false);
    expect(native.core.statisticsEnabled).toBe(false);
    await api.FFmpegKitConfig.enableLogs();
    await api.FFmpegKitConfig.enableStatistics();
    expect(native.core.logsEnabled).toBe(true);
    expect(native.core.statisticsEnabled).toBe(true);
  });
});

describe('pipes, fonts, environment, signals', () => {
  it('registers and closes pipes', async () => {
    const { api, native } = loadApi();
    const pipe = await api.FFmpegKitConfig.registerNewFFmpegPipe();
    expect(pipe).toBe('/data/pipes/fk_pipe_1');
    await api.FFmpegKitConfig.closeFFmpegPipe(pipe);
    expect(native.core.calls).toContainEqual(['closeFFmpegPipe', pipe]);
  });

  it('writeToPipe resolves with the native result', async () => {
    const { api, native } = loadApi();
    await expect(
      api.FFmpegKitConfig.writeToPipe('/data/in.raw', '/data/pipes/fk_pipe_1')
    ).resolves.toBe(0);
    expect(native.core.calls).toContainEqual([
      'writeToPipe',
      '/data/in.raw',
      '/data/pipes/fk_pipe_1',
    ]);
  });

  it('setFontDirectory is a one-element setFontDirectoryList', async () => {
    const { api, native } = loadApi();
    await api.FFmpegKitConfig.setFontDirectory('/fonts', { MyFont: 'Roboto' });
    await api.FFmpegKitConfig.setFontDirectoryList(['/a', '/b']);
    expect(native.core.calls).toEqual([
      ['setFontDirectoryList', ['/fonts'], { MyFont: 'Roboto' }],
      ['setFontDirectoryList', ['/a', '/b'], {}],
    ]);
  });

  it('forwards fontconfig path, environment variables and signals', async () => {
    const { api, native } = loadApi();
    await api.FFmpegKitConfig.setFontconfigConfigurationPath('/etc/fonts');
    await api.FFmpegKitConfig.setEnvironmentVariable('FOO', 'bar');
    await api.FFmpegKitConfig.ignoreSignal(api.Signal.SIGPIPE);
    expect(native.core.calls).toEqual([
      ['setFontconfigConfigurationPath', '/etc/fonts'],
      ['setEnvironmentVariable', 'FOO', 'bar'],
      ['ignoreSignal', 13],
    ]);
  });
});

describe('Storage Access Framework', () => {
  it('on Android, SAF parameters come from the Kotlin storage object', async () => {
    const { api, native } = loadApi('android');
    await expect(
      api.FFmpegKitConfig.getSafParameterForRead('content://a')
    ).resolves.toBe('/proc/self/fd/42');
    await api.FFmpegKitConfig.getSafParameterForWrite('content://b');
    await api.FFmpegKitConfig.getSafParameter('content://c', 'rw');
    expect(native.storage.calls).toEqual([
      ['getSafParameter', 'content://a', 'r'],
      ['getSafParameter', 'content://b', 'w'],
      ['getSafParameter', 'content://c', 'rw'],
    ]);
  });

  it('on Android, selectDocument goes to the Kotlin storage object', async () => {
    const { api, native } = loadApi('android');
    await expect(
      api.FFmpegKitConfig.selectDocumentForRead('video/*')
    ).resolves.toBe('content://picked/1');
    await api.FFmpegKitConfig.selectDocumentForWrite('out.mp4', 'video/mp4');
    expect(native.storage.calls).toEqual([
      ['selectDocument', false, undefined, 'video/*', []],
      ['selectDocument', true, 'out.mp4', 'video/mp4', []],
    ]);
  });

  it('on iOS, SAF calls reject and never touch native storage', async () => {
    const { api } = loadApi('ios');
    await expect(
      api.FFmpegKitConfig.getSafParameterForRead('content://a')
    ).rejects.toThrow(/Android/);
    await expect(api.FFmpegKitConfig.selectDocumentForRead()).rejects.toThrow(
      /Android/
    );
  });
});
