//
// LogRedirection.hpp
//
// When a log line is also printed to the platform log. Values match the
// public LogRedirectionStrategy constants.
//

#pragma once

namespace margelo::nitro::ffmpegkit {

enum class LogRedirection : int {
  Always = 0,
  WhenNoCallbacks = 1,
  WhenNoGlobalCallback = 2,
  WhenNoSessionCallback = 3,
  Never = 4,
};

/** Converts the number JS passes; anything outside the enum means Never. */
inline LogRedirection toLogRedirection(double value) {
  const int raw = static_cast<int>(value);
  if (raw < static_cast<int>(LogRedirection::Always) || raw > static_cast<int>(LogRedirection::Never)) {
    return LogRedirection::Never;
  }
  return static_cast<LogRedirection>(raw);
}

inline bool shouldPrint(LogRedirection redirection, bool sessionCallbackDefined, bool globalCallbackDefined) {
  switch (redirection) {
    case LogRedirection::Always:
      return true;
    case LogRedirection::WhenNoCallbacks:
      return !sessionCallbackDefined && !globalCallbackDefined;
    case LogRedirection::WhenNoGlobalCallback:
      return !globalCallbackDefined;
    case LogRedirection::WhenNoSessionCallback:
      return !sessionCallbackDefined;
    case LogRedirection::Never:
      return false;
  }
  return false;
}

} // namespace margelo::nitro::ffmpegkit
