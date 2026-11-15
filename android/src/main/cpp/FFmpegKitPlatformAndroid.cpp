//
// FFmpegKitPlatformAndroid.cpp
//
// Android side of the hot-path seam (FFmpegKitPlatform.hpp).
//
// This library never links FFmpeg. ffmpeg-kit's Java FFmpegKitConfig (loaded
// by HybridFFmpegKitPlatform.initialize) loads the native libraries, picking
// the NEON build on armv7, and runs libffmpegkit's JNI_OnLoad, which sets up
// the JavaVM for MediaCodec and the saf: protocol. Here we find that loaded
// libffmpegkit with dlopen(RTLD_NOLOAD) and resolve symbols with dlsym, so we
// always bind to the copy Java loaded.
//

#include "FFmpegKitPlatform.hpp"

#include <android/log.h>
#include <dlfcn.h>
#include <fbjni/fbjni.h>
#include <jni.h>

#include <initializer_list>
#include <stdexcept>

namespace margelo::nitro::ffmpegkit::platform {

namespace jni = facebook::jni;

namespace {

  void* ffmpegKitLibrary() {
    // armv7 devices with NEON get the _neon build; everything else gets the plain one.
    for (const char* name : {"libffmpegkit_armv7a_neon.so", "libffmpegkit.so"}) {
      if (void* handle = dlopen(name, RTLD_NOW | RTLD_NOLOAD)) {
        return handle;
      }
    }
    throw std::runtime_error("libffmpegkit is not loaded. Did FFmpegKitConfig fail to initialize?");
  }

  template <typename T> T resolve(void* library, const char* symbol) {
    // dlsym on a handle also searches its dependencies, so libavutil symbols resolve too.
    void* address = dlsym(library, symbol);
    if (address == nullptr) {
      throw std::runtime_error(std::string("ffmpeg-kit symbol not found: ") + symbol);
    }
    return reinterpret_cast<T>(address);
  }

  using JniExecute = jint (*)(JNIEnv*, jclass, jlong, jobjectArray);

  struct Symbols {
    FFmpegApi api;
    JniExecute ffmpegExecute;
    JniExecute ffprobeExecute;
  };

  const Symbols& symbols() {
    static const Symbols symbols = [] {
      void* library = ffmpegKitLibrary();
      Symbols s{};
      s.api.av_log_set_callback = resolve<decltype(s.api.av_log_set_callback)>(library, "av_log_set_callback");
      s.api.av_log_default_callback =
          resolve<decltype(s.api.av_log_default_callback)>(library, "av_log_default_callback");
      s.api.av_log_set_level = resolve<decltype(s.api.av_log_set_level)>(library, "av_log_set_level");
      s.api.av_log_get_level = resolve<decltype(s.api.av_log_get_level)>(library, "av_log_get_level");
      s.api.av_log_format_line2 = resolve<decltype(s.api.av_log_format_line2)>(library, "av_log_format_line2");
      s.api.set_report_callback = resolve<decltype(s.api.set_report_callback)>(library, "set_report_callback");
      s.api.cancel_operation = resolve<decltype(s.api.cancel_operation)>(library, "cancel_operation");
      s.api.configuredLogLevel = resolve<int*>(library, "configuredLogLevel");
      // ffmpeg-kit's own JNI entry points: they set the thread-local session id that fftools
      // reads for cancellation inside libffmpegkit itself, so nothing here touches its TLS.
      s.ffmpegExecute =
          resolve<JniExecute>(library, "Java_com_arthenica_ffmpegkit_FFmpegKitConfig_nativeFFmpegExecute");
      s.ffprobeExecute =
          resolve<JniExecute>(library, "Java_com_arthenica_ffmpegkit_FFmpegKitConfig_nativeFFprobeExecute");
      return s;
    }();
    return symbols;
  }

  jni::local_ref<jni::JArrayClass<jni::JString>> toJavaArray(const std::vector<std::string>& values) {
    auto array = jni::JArrayClass<jni::JString>::newArray(values.size());
    for (size_t i = 0; i < values.size(); i++) {
      array->setElement(i, *jni::make_jstring(values[i]));
    }
    return array;
  }

  int toAndroidPriority(int level) {
    if (level >= 0 && level <= 8) {
      return ANDROID_LOG_FATAL; // AV_LOG_PANIC, AV_LOG_FATAL
    }
    if (level > 8 && level <= 16) {
      return ANDROID_LOG_ERROR;
    }
    if (level > 16 && level <= 24) {
      return ANDROID_LOG_WARN;
    }
    if (level <= 32) {
      return ANDROID_LOG_INFO; // AV_LOG_INFO and AV_LOG_STDERR
    }
    if (level <= 40) {
      return ANDROID_LOG_VERBOSE;
    }
    return ANDROID_LOG_DEBUG;
  }

} // namespace

const FFmpegApi& api() {
  return symbols().api;
}

int execute(bool ffprobe, int64_t sessionId, const std::vector<std::string>& arguments) {
  const auto& s = symbols();
  int returnCode = 0;
  // Attach this FFmpeg thread for the whole run; MediaCodec reuses the attachment.
  jni::ThreadScope::WithClassLoader([&] {
    auto javaArguments = toJavaArray(arguments);
    JNIEnv* env = jni::Environment::current();
    const auto run = ffprobe ? s.ffprobeExecute : s.ffmpegExecute;
    returnCode = run(env, nullptr, static_cast<jlong>(sessionId), javaArguments.get());
  });
  return returnCode;
}

void printLog(int level, const std::string& message) {
  __android_log_write(toAndroidPriority(level), "ffmpeg-kit", message.c_str());
}

} // namespace margelo::nitro::ffmpegkit::platform
