import { loadApi } from './helpers';
import { FFPROBE_JSON } from './fixtures';


describe('MediaInformation (characterization)', () => {
  const { api } = loadApi();
  const info = new api.MediaInformation(JSON.parse(FFPROBE_JSON));

  it('reads format fields as ffprobe reports them', () => {
    expect(info.getFilename()).toBe('/data/in.mp4');
    expect(info.getFormat()).toBe('mov,mp4,m4a,3gp,3g2,mj2');
    expect(info.getLongFormat()).toBe('QuickTime / MOV');
    // ffprobe reports these as strings and they are returned unchanged
    expect(info.getDuration()).toBe('10.000000');
    expect(info.getStartTime()).toBe('0.000000');
    expect(info.getSize()).toBe('1953125');
    expect(info.getBitrate()).toBe('1562500');
    expect(info.getTags()).toEqual({ major_brand: 'isom', encoder: 'Lavf60.3.100' });
  });

  it('exposes raw and format properties', () => {
    expect(info.getFormatProperty('nb_streams')).toBe(2);
    expect(info.getNumberFormatProperty('nb_streams')).toBe(2);
    expect(info.getStringFormatProperty('format_name')).toBe(
      'mov,mp4,m4a,3gp,3g2,mj2'
    );
    expect(info.getProperty('format')).toBe(info.getFormatProperties());
    expect(info.getAllProperties()).toEqual(JSON.parse(FFPROBE_JSON));
  });

  it('wraps streams', () => {
    const [video, audio] = info.getStreams();
    expect(info.getStreams()).toHaveLength(2);
    expect(video).toBeInstanceOf(api.StreamInformation);
    expect([
      video!.getIndex(),
      video!.getType(),
      video!.getCodec(),
      video!.getCodecLong(),
      video!.getFormat(),
      video!.getWidth(),
      video!.getHeight(),
      video!.getBitrate(),
      video!.getSampleAspectRatio(),
      video!.getDisplayAspectRatio(),
      video!.getAverageFrameRate(),
      video!.getRealFrameRate(),
      video!.getTimeBase(),
      video!.getCodecTimeBase(),
    ]).toEqual([
      0,
      'video',
      'h264',
      'H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10',
      'yuv420p',
      1280,
      720,
      '1500000',
      '1:1',
      '16:9',
      '30/1',
      '30/1',
      '1/15360',
      '1/60',
    ]);
    expect(video!.getTags()).toEqual({ language: 'und', handler_name: 'VideoHandler' });
    expect([
      audio!.getType(),
      audio!.getSampleFormat(),
      audio!.getSampleRate(),
      audio!.getChannelLayout(),
    ]).toEqual(['audio', 'fltp', '48000', 'stereo']);
    expect(audio!.getWidth()).toBeUndefined();
  });

  it('wraps chapters', () => {
    const [chapter] = info.getChapters();
    expect(chapter).toBeInstanceOf(api.Chapter);
    expect([
      chapter!.getId(),
      chapter!.getTimeBase(),
      chapter!.getStart(),
      chapter!.getStartTime(),
      chapter!.getEnd(),
      chapter!.getEndTime(),
    ]).toEqual([0, '1/1000', 0, '0.000000', 5000, '5.000000']);
    expect(chapter!.getTags()).toEqual({ title: 'Intro' });
  });

  it('returns empty lists and undefined fields when properties are missing', () => {
    const empty = new api.MediaInformation(undefined as any);
    expect(empty.getStreams()).toEqual([]);
    expect(empty.getChapters()).toEqual([]);
    expect(empty.getFormat()).toBeUndefined();
    expect(empty.getFormatProperties()).toBeUndefined();
  });
});

/*
 * Intended behaviour. The pre-Nitro implementation was broken here: from()
 * called .map() on a Promise, and fromWithError() called the non-error parser.
 * Parsing is now plain JSON.parse in JS, with no native round trip.
 */
describe('MediaInformationJsonParser', () => {
  it('from() parses ffprobe JSON into MediaInformation', async () => {
    const { api } = loadApi();
    const info = await api.MediaInformationJsonParser.from(FFPROBE_JSON);
    expect(info).toBeInstanceOf(api.MediaInformation);
    expect(info!.getFormat()).toBe('mov,mp4,m4a,3gp,3g2,mj2');
    expect(info!.getStreams()).toHaveLength(2);
  });

  it('from() resolves undefined for invalid JSON', async () => {
    const { api } = loadApi();
    await expect(
      api.MediaInformationJsonParser.from('not json')
    ).resolves.toBeUndefined();
  });

  it('fromWithError() rejects for invalid JSON', async () => {
    const { api } = loadApi();
    await expect(
      api.MediaInformationJsonParser.fromWithError('{"format": ')
    ).rejects.toThrow();
  });

  it('fromWithError() parses valid JSON', async () => {
    const { api } = loadApi();
    const info = await api.MediaInformationJsonParser.fromWithError(FFPROBE_JSON);
    expect(info.getStreams()[1]!.getCodec()).toBe('aac');
  });
});
