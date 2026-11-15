import { Chapter } from './Chapter';
import { PropertyBag, type Properties } from './PropertyBag';
import { StreamInformation } from './StreamInformation';

export class MediaInformation extends PropertyBag {
  static readonly KEY_FORMAT_PROPERTIES = 'format';
  static readonly KEY_FILENAME = 'filename';
  static readonly KEY_FORMAT = 'format_name';
  static readonly KEY_FORMAT_LONG = 'format_long_name';
  static readonly KEY_START_TIME = 'start_time';
  static readonly KEY_DURATION = 'duration';
  static readonly KEY_SIZE = 'size';
  static readonly KEY_BIT_RATE = 'bit_rate';
  static readonly KEY_TAGS = 'tags';

  getFilename(): string {
    return this.getStringFormatProperty(MediaInformation.KEY_FILENAME);
  }
  getFormat(): string {
    return this.getStringFormatProperty(MediaInformation.KEY_FORMAT);
  }
  getLongFormat(): string {
    return this.getStringFormatProperty(MediaInformation.KEY_FORMAT_LONG);
  }
  /** ffprobe reports this as a string, e.g. "10.000000". */
  getDuration(): string {
    return this.getStringFormatProperty(MediaInformation.KEY_DURATION);
  }
  getStartTime(): string {
    return this.getStringFormatProperty(MediaInformation.KEY_START_TIME);
  }
  getSize(): string {
    return this.getStringFormatProperty(MediaInformation.KEY_SIZE);
  }
  getBitrate(): string {
    return this.getStringFormatProperty(MediaInformation.KEY_BIT_RATE);
  }
  getTags(): Properties {
    return this.getFormatProperty(MediaInformation.KEY_TAGS);
  }
  getStreams(): StreamInformation[] {
    const streams: Properties[] | undefined = this.getProperty('streams');
    return (streams ?? []).map((s) => new StreamInformation(s));
  }
  getChapters(): Chapter[] {
    const chapters: Properties[] | undefined = this.getProperty('chapters');
    return (chapters ?? []).map((c) => new Chapter(c));
  }
  getStringFormatProperty(key: string): any {
    return this.getFormatProperties()?.[key];
  }
  getNumberFormatProperty(key: string): any {
    return this.getFormatProperties()?.[key];
  }
  getFormatProperty(key: string): any {
    return this.getFormatProperties()?.[key];
  }
  getFormatProperties(): Properties | undefined {
    return this.getProperty(MediaInformation.KEY_FORMAT_PROPERTIES);
  }
}
