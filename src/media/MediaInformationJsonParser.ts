import { MediaInformation } from './MediaInformation';

export class MediaInformationJsonParser {
  /** Resolves undefined when the output is not valid JSON. */
  static async from(
    ffprobeJsonOutput: string
  ): Promise<MediaInformation | undefined> {
    try {
      return new MediaInformation(JSON.parse(ffprobeJsonOutput));
    } catch {
      return undefined;
    }
  }

  /** Rejects when the output is not valid JSON. */
  static async fromWithError(
    ffprobeJsonOutput: string
  ): Promise<MediaInformation> {
    return new MediaInformation(JSON.parse(ffprobeJsonOutput));
  }
}
