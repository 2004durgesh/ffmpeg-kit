//
// FFmpegCallbacks.cpp
//

#include "FFmpegCallbacks.hpp"
#include "FFmpegKitPlatform.hpp"
#include "FFmpegKitRuntime.hpp"

#include <optional>
#include <string>

namespace margelo::nitro::ffmpegkit::callbacks {

namespace {

  /** Same as ffmpeg-kit's avutil_log_sanitize: replace control characters that garble log viewers. */
  void sanitize(std::string& line) {
    for (char& c : line) {
      const auto u = static_cast<unsigned char>(c);
      if (u < 0x08 || (u > 0x0D && u < 0x20)) {
        c = '?';
      }
    }
  }

  /** Formats one av_log call with its "[codec @ 0x…]" prefix, like ffmpeg-kit does. */
  std::optional<std::string> formatLine(void* avcl, int level, const char* fmt, va_list vl) {
    const auto& api = platform::api();
    char stackLine[1024];
    int printPrefix = 1;
    va_list args;
    va_copy(args, vl);
    const int length = api.av_log_format_line2(avcl, level, fmt, args, stackLine, sizeof(stackLine), &printPrefix);
    va_end(args);
    if (length <= 0) {
      return std::nullopt;
    }
    if (length < static_cast<int>(sizeof(stackLine))) {
      return std::string(stackLine, static_cast<size_t>(length));
    }
    // Longer than the stack buffer: format again into an exact-size string.
    std::string line(static_cast<size_t>(length) + 1, '\0');
    printPrefix = 1;
    va_copy(args, vl);
    api.av_log_format_line2(avcl, level, fmt, args, line.data(), length + 1, &printPrefix);
    va_end(args);
    line.resize(static_cast<size_t>(length));
    return line;
  }

  void onAvLog(void* avcl, int level, const char* fmt, va_list vl) {
    if (level >= 0) {
      level &= 0xff;
    }
    auto& runtime = FFmpegKitRuntime::shared();
    // Dropped before formatting. AV_LOG_STDERR is ffprobe's output and always passes.
    const int active = runtime.logLevel();
    if ((active == kLogQuiet && level != kLogStderr) || level > active) {
      return;
    }
    auto line = formatLine(avcl, level, fmt, vl);
    if (!line.has_value()) {
      return;
    }
    sanitize(*line);
    runtime.deliverLog(HybridFFmpegKitSession::current(), level, std::move(*line));
  }

  void onReport(int frameNumber, float fps, float quality, int64_t size, double time, double bitrate, double speed) {
    auto* session = HybridFFmpegKitSession::current();
    const NativeStatistics statistics(session != nullptr ? static_cast<double>(session->id()) : 0, frameNumber, fps,
                                      quality, static_cast<double>(size), time, bitrate, speed);
    FFmpegKitRuntime::shared().deliverStatistics(session, statistics);
  }

} // namespace

void install() {
  const auto& api = platform::api();
  api.av_log_set_callback(onAvLog);
  api.set_report_callback(onReport);
}

void uninstall() {
  const auto& api = platform::api();
  api.av_log_set_callback(api.av_log_default_callback);
  api.set_report_callback(nullptr);
}

} // namespace margelo::nitro::ffmpegkit::callbacks
