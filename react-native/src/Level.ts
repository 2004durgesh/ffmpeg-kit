export class Level {
  static readonly AV_LOG_STDERR = -16;
  static readonly AV_LOG_QUIET = -8;
  static readonly AV_LOG_PANIC = 0;
  static readonly AV_LOG_FATAL = 8;
  static readonly AV_LOG_ERROR = 16;
  static readonly AV_LOG_WARNING = 24;
  static readonly AV_LOG_INFO = 32;
  static readonly AV_LOG_VERBOSE = 40;
  static readonly AV_LOG_DEBUG = 48;
  static readonly AV_LOG_TRACE = 56;

  static levelToString(level: number): string {
    switch (level) {
      case Level.AV_LOG_TRACE:
        return 'TRACE';
      case Level.AV_LOG_DEBUG:
        return 'DEBUG';
      case Level.AV_LOG_VERBOSE:
        return 'VERBOSE';
      case Level.AV_LOG_INFO:
        return 'INFO';
      case Level.AV_LOG_WARNING:
        return 'WARNING';
      case Level.AV_LOG_ERROR:
        return 'ERROR';
      case Level.AV_LOG_FATAL:
        return 'FATAL';
      case Level.AV_LOG_PANIC:
        return 'PANIC';
      case Level.AV_LOG_STDERR:
        return 'STDERR';
      default:
        return '';
    }
  }
}
