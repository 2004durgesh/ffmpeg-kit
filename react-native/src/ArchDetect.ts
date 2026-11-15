import { native } from './internal/native';

export class ArchDetect {
  static async getArch(): Promise<string> {
    return native().arch;
  }
}
