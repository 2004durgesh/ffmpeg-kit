//
// FFmpegKitPlatformIOS.mm
//
// iOS side of the hot-path seam (FFmpegKitPlatform.hpp). Objective-C++ only
// because ffmpeg-kit's execute functions take an NSArray; everything else
// platform-specific lives in HybridFFmpegKitPlatform.swift.
//

#include "FFmpegKitPlatform.hpp"

#import <Foundation/Foundation.h>
#import <os/log.h>

extern "C" {
// ffmpeg-kit (FFmpegKitConfig.m): register the session id that fftools reads for
// cancellation, run ffmpeg/ffprobe, then unregister it.
int executeFFmpeg(long sessionId, NSArray* arguments);
int executeFFprobe(long sessionId, NSArray* arguments);
extern int configuredLogLevel;

// fftools
void cancel_operation(long sessionId);
void set_report_callback(void (*callback)(int, float, float, int64_t, double, double, double));

// libavutil
void av_log_set_callback(void (*callback)(void*, int, const char*, va_list));
void av_log_default_callback(void* avcl, int level, const char* fmt, va_list vl);
void av_log_set_level(int level);
int av_log_get_level(void);
int av_log_format_line2(void* avcl, int level, const char* fmt, va_list vl, char* line, int lineSize,
                        int* printPrefix);
}

namespace margelo::nitro::ffmpegkit::platform {

namespace {
  NSString* toNSString(const std::string& value) {
    return [[NSString alloc] initWithBytes:value.data() length:value.size() encoding:NSUTF8StringEncoding] ?: @"";
  }

  os_log_type_t toLogType(int level) {
    if (level >= 0 && level <= 16) {
      return OS_LOG_TYPE_ERROR; // AV_LOG_PANIC, AV_LOG_FATAL, AV_LOG_ERROR
    }
    if (level >= 40) {
      return OS_LOG_TYPE_DEBUG; // AV_LOG_VERBOSE, AV_LOG_DEBUG, AV_LOG_TRACE
    }
    return OS_LOG_TYPE_DEFAULT; // AV_LOG_STDERR, AV_LOG_WARNING, AV_LOG_INFO
  }
} // namespace

const FFmpegApi& api() {
  static const FFmpegApi api = {
      .av_log_set_callback = av_log_set_callback,
      .av_log_default_callback = av_log_default_callback,
      .av_log_set_level = av_log_set_level,
      .av_log_get_level = av_log_get_level,
      .av_log_format_line2 = av_log_format_line2,
      .set_report_callback = set_report_callback,
      .cancel_operation = cancel_operation,
      .configuredLogLevel = &configuredLogLevel,
  };
  return api;
}

int execute(bool ffprobe, int64_t sessionId, const std::vector<std::string>& arguments) {
  @autoreleasepool {
    NSMutableArray<NSString*>* array = [NSMutableArray arrayWithCapacity:arguments.size()];
    for (const auto& argument : arguments) {
      [array addObject:toNSString(argument)];
    }
    return ffprobe ? executeFFprobe(static_cast<long>(sessionId), array)
                   : executeFFmpeg(static_cast<long>(sessionId), array);
  }
}

void printLog(int level, const std::string& message) {
  static os_log_t log = os_log_create("com.arthenica.ffmpegkit", "ffmpeg");
  os_log_with_type(log, toLogType(level), "%{public}s", message.c_str());
}

} // namespace margelo::nitro::ffmpegkit::platform
