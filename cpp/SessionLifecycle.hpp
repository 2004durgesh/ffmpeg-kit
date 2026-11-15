//
// SessionLifecycle.hpp
//
// The states a session moves through. Each state carries only the values that
// exist in it, so "failed with a return code" or "running without a start
// time" cannot be represented.
//

#pragma once

#include <string>
#include <variant>

namespace margelo::nitro::ffmpegkit::lifecycle {

struct Created {};

struct Running {
  double startTime;
};

struct Completed {
  double startTime;
  double endTime;
  int returnCode;
};

/** The run never produced a return code (e.g. a native exception). */
struct Failed {
  double startTime;
  double endTime;
  std::string reason;
};

using State = std::variant<Created, Running, Completed, Failed>;

} // namespace margelo::nitro::ffmpegkit::lifecycle
