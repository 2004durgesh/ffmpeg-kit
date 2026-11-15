//
// HybridFFmpegKitSession.cpp
//

#include "HybridFFmpegKitSession.hpp"
#include "FFmpegKitPlatform.hpp"

#include <chrono>
#include <stdexcept>
#include <system_error>
#include <thread>

namespace margelo::nitro::ffmpegkit {

namespace {

  // Set for the duration of a run on its own thread; read by FFmpegCallbacks.
  thread_local HybridFFmpegKitSession* tCurrentSession = nullptr;

  template <class... Ts> struct Overloaded : Ts... {
    using Ts::operator()...;
  };
  template <class... Ts> Overloaded(Ts...) -> Overloaded<Ts...>;

  double nowMillis() {
    using namespace std::chrono;
    return static_cast<double>(duration_cast<milliseconds>(system_clock::now().time_since_epoch()).count());
  }

} // namespace

HybridFFmpegKitSession* HybridFFmpegKitSession::current() noexcept {
  return tCurrentSession;
}

HybridFFmpegKitSession::HybridFFmpegKitSession(int64_t sessionId, NativeSessionType type,
                                               std::vector<std::string> arguments, LogRedirection logRedirection,
                                               std::optional<LogCallback> onLog,
                                               std::optional<StatisticsCallback> onStatistics)
    : HybridObject(TAG), _sessionId(sessionId), _type(type), _arguments(std::move(arguments)),
      _logRedirection(logRedirection), _createTime(nowMillis()), _onLog(std::move(onLog)),
      _onStatistics(std::move(onStatistics)) {}

// ---- Immutable fields ---------------------------------------------------------

double HybridFFmpegKitSession::getSessionId() {
  return static_cast<double>(_sessionId);
}

NativeSessionType HybridFFmpegKitSession::getType() {
  return _type;
}

std::vector<std::string> HybridFFmpegKitSession::getArguments() {
  return _arguments;
}

std::string HybridFFmpegKitSession::getCommand() {
  std::string command;
  for (const auto& argument : _arguments) {
    if (!command.empty()) {
      command += ' ';
    }
    command += argument;
  }
  return command;
}

double HybridFFmpegKitSession::getCreateTime() {
  return _createTime;
}

double HybridFFmpegKitSession::getLogRedirectionStrategy() {
  return static_cast<double>(_logRedirection);
}

// ---- Lifecycle ----------------------------------------------------------------

double HybridFFmpegKitSession::getStartTime() {
  std::lock_guard lock(_mutex);
  return std::visit(Overloaded{[](const lifecycle::Created&) { return 0.0; },
                               [](const auto& started) { return started.startTime; }},
                    _lifecycle);
}

double HybridFFmpegKitSession::getEndTime() {
  std::lock_guard lock(_mutex);
  return std::visit(Overloaded{[](const lifecycle::Completed& s) { return s.endTime; },
                               [](const lifecycle::Failed& s) { return s.endTime; },
                               [](const auto&) { return 0.0; }},
                    _lifecycle);
}

double HybridFFmpegKitSession::getDuration() {
  std::lock_guard lock(_mutex);
  return std::visit(Overloaded{[](const lifecycle::Completed& s) { return s.endTime - s.startTime; },
                               [](const lifecycle::Failed& s) { return s.endTime - s.startTime; },
                               [](const auto&) { return 0.0; }},
                    _lifecycle);
}

NativeSessionState HybridFFmpegKitSession::getState() {
  std::lock_guard lock(_mutex);
  return std::visit(Overloaded{[](const lifecycle::Created&) { return NativeSessionState::CREATED; },
                               [](const lifecycle::Running&) { return NativeSessionState::RUNNING; },
                               [](const lifecycle::Completed&) { return NativeSessionState::COMPLETED; },
                               [](const lifecycle::Failed&) { return NativeSessionState::FAILED; }},
                    _lifecycle);
}

std::optional<double> HybridFFmpegKitSession::getReturnCode() {
  std::lock_guard lock(_mutex);
  if (const auto* completed = std::get_if<lifecycle::Completed>(&_lifecycle)) {
    return completed->returnCode;
  }
  return std::nullopt;
}

std::optional<std::string> HybridFFmpegKitSession::getFailStackTrace() {
  std::lock_guard lock(_mutex);
  if (const auto* failed = std::get_if<lifecycle::Failed>(&_lifecycle)) {
    return failed->reason;
  }
  return std::nullopt;
}

bool HybridFFmpegKitSession::isRunning() {
  std::lock_guard lock(_mutex);
  return std::holds_alternative<lifecycle::Running>(_lifecycle);
}

std::shared_ptr<Promise<void>> HybridFFmpegKitSession::execute() {
  auto promise = Promise<void>::create();
  {
    std::lock_guard lock(_mutex);
    if (!std::holds_alternative<lifecycle::Created>(_lifecycle)) {
      promise->reject(std::make_exception_ptr(
          std::runtime_error("Session " + std::to_string(_sessionId) + " has already been executed.")));
      return promise;
    }
    _lifecycle = lifecycle::Running{nowMillis()};
  }

  // One hop: the session owns its run thread, which holds the session alive
  // through history eviction and JS garbage collection.
  auto self = shared_cast<HybridFFmpegKitSession>();
  try {
    std::thread([self, promise] {
      self->run();
      promise->resolve();
    }).detach();
  } catch (const std::system_error& e) {
    std::lock_guard lock(_mutex);
    const double now = nowMillis();
    _lifecycle = lifecycle::Failed{now, now, std::string("Could not start a thread for the session: ") + e.what()};
    promise->resolve();
  }
  return promise;
}

void HybridFFmpegKitSession::run() {
  tCurrentSession = this;
  int returnCode = 0;
  std::optional<std::string> failure;
  try {
    returnCode = platform::execute(_type != NativeSessionType::FFMPEG, _sessionId, _arguments);
  } catch (const std::exception& e) {
    failure = e.what();
  } catch (...) {
    failure = "Unknown native error while running FFmpeg.";
  }
  tCurrentSession = nullptr;

  std::lock_guard lock(_mutex);
  const double startTime = std::get<lifecycle::Running>(_lifecycle).startTime;
  const double endTime = nowMillis();
  if (failure.has_value()) {
    _lifecycle = lifecycle::Failed{startTime, endTime, std::move(*failure)};
  } else {
    _lifecycle = lifecycle::Completed{startTime, endTime, returnCode};
  }
}

void HybridFFmpegKitSession::cancel() {
  if (isRunning()) {
    platform::api().cancel_operation(static_cast<long>(_sessionId));
  }
}

// ---- Logs and statistics ------------------------------------------------------

void HybridFFmpegKitSession::addLog(const NativeLog& log) {
  std::lock_guard lock(_mutex);
  _logBytes += log.message.size();
  _logs.push_back(log);
}

void HybridFFmpegKitSession::addStatistics(const NativeStatistics& statistics) {
  std::lock_guard lock(_mutex);
  _statistics.push_back(statistics);
}

std::vector<NativeLog> HybridFFmpegKitSession::getLogs() {
  std::lock_guard lock(_mutex);
  return _logs;
}

std::string HybridFFmpegKitSession::getOutput() {
  std::lock_guard lock(_mutex);
  std::string output;
  output.reserve(_logBytes);
  for (const auto& log : _logs) {
    output += log.message;
  }
  return output;
}

std::vector<NativeStatistics> HybridFFmpegKitSession::getStatistics() {
  std::lock_guard lock(_mutex);
  return _statistics;
}

std::optional<NativeStatistics> HybridFFmpegKitSession::getLastStatistics() {
  std::lock_guard lock(_mutex);
  if (_statistics.empty()) {
    return std::nullopt;
  }
  return _statistics.back();
}

size_t HybridFFmpegKitSession::getExternalMemorySize() noexcept {
  std::lock_guard lock(_mutex);
  return _logBytes + _logs.size() * sizeof(NativeLog) + _statistics.size() * sizeof(NativeStatistics);
}

} // namespace margelo::nitro::ffmpegkit
