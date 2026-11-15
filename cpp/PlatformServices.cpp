//
// PlatformServices.cpp
//

#include "PlatformServices.hpp"

#include <NitroModules/HybridObjectRegistry.hpp>

#include <stdexcept>

namespace margelo::nitro::ffmpegkit {

std::shared_ptr<HybridFFmpegKitPlatformSpec> platformServices() {
  static const std::shared_ptr<HybridFFmpegKitPlatformSpec> services = [] {
    auto object = HybridObjectRegistry::createHybridObject("FFmpegKitPlatform");
    auto platform = std::dynamic_pointer_cast<HybridFFmpegKitPlatformSpec>(object);
    if (platform == nullptr) {
      throw std::runtime_error("react-native-ffmpeg-kit: FFmpegKitPlatform is not registered. Is autolinking set up?");
    }
    platform->initialize();
    return platform;
  }();
  return services;
}

} // namespace margelo::nitro::ffmpegkit
