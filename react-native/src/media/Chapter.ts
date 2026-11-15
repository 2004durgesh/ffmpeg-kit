import { PropertyBag, type Properties } from './PropertyBag';

export class Chapter extends PropertyBag {
  static readonly KEY_ID = 'id';
  static readonly KEY_TIME_BASE = 'time_base';
  static readonly KEY_START = 'start';
  static readonly KEY_START_TIME = 'start_time';
  static readonly KEY_END = 'end';
  static readonly KEY_END_TIME = 'end_time';
  static readonly KEY_TAGS = 'tags';

  getId(): number {
    return this.getNumberProperty(Chapter.KEY_ID);
  }
  getTimeBase(): string {
    return this.getStringProperty(Chapter.KEY_TIME_BASE);
  }
  getStart(): number {
    return this.getNumberProperty(Chapter.KEY_START);
  }
  getStartTime(): string {
    return this.getStringProperty(Chapter.KEY_START_TIME);
  }
  getEnd(): number {
    return this.getNumberProperty(Chapter.KEY_END);
  }
  getEndTime(): string {
    return this.getStringProperty(Chapter.KEY_END_TIME);
  }
  getTags(): Properties {
    return this.getProperty(Chapter.KEY_TAGS);
  }
}
