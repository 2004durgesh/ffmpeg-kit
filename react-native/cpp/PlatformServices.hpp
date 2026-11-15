//
// PlatformServices.hpp
//

#pragma once

#include "HybridFFmpegKitPlatformSpec.hpp"

#include <memory>

namespace margelo::nitro::ffmpegkit {

/**
 * The Swift (iOS) / Kotlin (Android) FFmpegKitPlatform object, created once
 * through Nitro's registry and initialized (ffmpeg-kit's libraries loaded)
 * before it is returned. Cold paths only; call from a JS thread.
 */
std::shared_ptr<HybridFFmpegKitPlatformSpec> platformServices();

} // namespace margelo::nitro::ffmpegkit
