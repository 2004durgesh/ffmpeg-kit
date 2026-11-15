#include <fbjni/fbjni.h>
#include <jni.h>

#include "NitroFFmpegKitOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() { margelo::nitro::ffmpegkit::registerAllNatives(); });
}
