//
// FFmpegKitPlatform.hpp
//
// The hot-path seam between the shared C++ core and each platform. Implemented
// in android/src/main/cpp/FFmpegKitPlatformAndroid.cpp and
// ios/FFmpegKitPlatformIOS.mm. Cold paths (build info, pipes, fonts, signals)
// go through the Swift/Kotlin FFmpegKitPlatform object instead (see
// PlatformServices.hpp).
//
// Everything here needs ffmpeg-kit initialized: call platformServices() first.
//

#pragma once

#include <cstdarg>
#include <cstdint>
#include <string>
#include <vector>

namespace margelo::nitro::ffmpegkit {

// AV_LOG_* values used by the core.
constexpr int kLogStderr = -16;
constexpr int kLogQuiet = -8;

using AvLogCallback = void (*)(void* avcl, int level, const char* fmt, va_list vl);
using ReportCallback = void (*)(int frameNumber, float fps, float quality, int64_t size, double time,
                                double bitrate, double speed);

/** C entry points of libavutil and ffmpeg-kit's fftools. */
struct FFmpegApi {
  void (*av_log_set_callback)(AvLogCallback callback);
  void (*av_log_default_callback)(void* avcl, int level, const char* fmt, va_list vl);
  void (*av_log_set_level)(int level);
  int (*av_log_get_level)();
  int (*av_log_format_line2)(void* avcl, int level, const char* fmt, va_list vl, char* line, int lineSize,
                             int* printPrefix);
  void (*set_report_callback)(ReportCallback callback);
  void (*cancel_operation)(long sessionId);
  /** ffmpeg-kit's own level; its execute functions reset libav's level to this before every run. */
  int* configuredLogLevel;
};

namespace platform {

  /** Resolved on first use. Throws if a symbol is missing. */
  const FFmpegApi& api();

  /**
   * Runs ffmpeg (or ffprobe) on the calling thread through ffmpeg-kit's own
   * execute function, which registers the session id that fftools reads for
   * cancellation. Blocks until FFmpeg returns; returns its exit code.
   */
  int execute(bool ffprobe, int64_t sessionId, const std::vector<std::string>& arguments);

  /** Writes one log line to the platform log (logcat / os_log). */
  void printLog(int level, const std::string& message);

} // namespace platform

} // namespace margelo::nitro::ffmpegkit
