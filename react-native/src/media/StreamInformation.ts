import { PropertyBag, type Properties } from './PropertyBag';

export class StreamInformation extends PropertyBag {
  static readonly KEY_INDEX = 'index';
  static readonly KEY_TYPE = 'codec_type';
  static readonly KEY_CODEC = 'codec_name';
  static readonly KEY_CODEC_LONG = 'codec_long_name';
  static readonly KEY_FORMAT = 'pix_fmt';
  static readonly KEY_WIDTH = 'width';
  static readonly KEY_HEIGHT = 'height';
  static readonly KEY_BIT_RATE = 'bit_rate';
  static readonly KEY_SAMPLE_RATE = 'sample_rate';
  static readonly KEY_SAMPLE_FORMAT = 'sample_fmt';
  static readonly KEY_CHANNEL_LAYOUT = 'channel_layout';
  static readonly KEY_SAMPLE_ASPECT_RATIO = 'sample_aspect_ratio';
  static readonly KEY_DISPLAY_ASPECT_RATIO = 'display_aspect_ratio';
  static readonly KEY_AVERAGE_FRAME_RATE = 'avg_frame_rate';
  static readonly KEY_REAL_FRAME_RATE = 'r_frame_rate';
  static readonly KEY_TIME_BASE = 'time_base';
  static readonly KEY_CODEC_TIME_BASE = 'codec_time_base';
  static readonly KEY_TAGS = 'tags';

  getIndex(): number {
    return this.getNumberProperty(StreamInformation.KEY_INDEX);
  }
  getType(): string {
    return this.getStringProperty(StreamInformation.KEY_TYPE);
  }
  getCodec(): string {
    return this.getStringProperty(StreamInformation.KEY_CODEC);
  }
  getCodecLong(): string {
    return this.getStringProperty(StreamInformation.KEY_CODEC_LONG);
  }
  getFormat(): string {
    return this.getStringProperty(StreamInformation.KEY_FORMAT);
  }
  getWidth(): number {
    return this.getNumberProperty(StreamInformation.KEY_WIDTH);
  }
  getHeight(): number {
    return this.getNumberProperty(StreamInformation.KEY_HEIGHT);
  }
  getBitrate(): string {
    return this.getStringProperty(StreamInformation.KEY_BIT_RATE);
  }
  getSampleRate(): string {
    return this.getStringProperty(StreamInformation.KEY_SAMPLE_RATE);
  }
  getSampleFormat(): string {
    return this.getStringProperty(StreamInformation.KEY_SAMPLE_FORMAT);
  }
  getChannelLayout(): string {
    return this.getStringProperty(StreamInformation.KEY_CHANNEL_LAYOUT);
  }
  getSampleAspectRatio(): string {
    return this.getStringProperty(StreamInformation.KEY_SAMPLE_ASPECT_RATIO);
  }
  getDisplayAspectRatio(): string {
    return this.getStringProperty(StreamInformation.KEY_DISPLAY_ASPECT_RATIO);
  }
  getAverageFrameRate(): string {
    return this.getStringProperty(StreamInformation.KEY_AVERAGE_FRAME_RATE);
  }
  getRealFrameRate(): string {
    return this.getStringProperty(StreamInformation.KEY_REAL_FRAME_RATE);
  }
  getTimeBase(): string {
    return this.getStringProperty(StreamInformation.KEY_TIME_BASE);
  }
  getCodecTimeBase(): string {
    return this.getStringProperty(StreamInformation.KEY_CODEC_TIME_BASE);
  }
  getTags(): Properties {
    return this.getProperty(StreamInformation.KEY_TAGS);
  }
}
