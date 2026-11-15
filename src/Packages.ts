import { native } from './internal/native';

export class Packages {
  static async getPackageName(): Promise<string> {
    return native().packageName;
  }

  static async getExternalLibraries(): Promise<string[]> {
    return native().externalLibraries;
  }
}
