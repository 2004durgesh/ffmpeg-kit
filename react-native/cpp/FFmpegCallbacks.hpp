//
// FFmpegCallbacks.hpp
//
// The C callbacks libav (av_log) and fftools (report callback) call on FFmpeg
// threads. They tag each line with the session running on that thread and
// hand it to FFmpegKitRuntime.
//

#pragma once

namespace margelo::nitro::ffmpegkit::callbacks {

/** Replaces ffmpeg-kit's default log and statistics callbacks with ours. */
void install();

/** Restores libav's default log callback and removes the statistics callback. */
void uninstall();

} // namespace margelo::nitro::ffmpegkit::callbacks
