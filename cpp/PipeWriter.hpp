//
// PipeWriter.hpp
//

#pragma once

#include <string>

namespace margelo::nitro::ffmpegkit {

/**
 * Copies a file into a named pipe. Blocks until FFmpeg opens the pipe for
 * reading and the copy ends, so call it off the JS thread. SIGPIPE is blocked
 * on the calling thread for the copy, so a reader that goes away yields EPIPE
 * instead of killing the app.
 *
 * @return 0 on success, otherwise the errno of the failing call.
 */
int copyFileToPipe(const std::string& inputPath, const std::string& pipePath);

} // namespace margelo::nitro::ffmpegkit
