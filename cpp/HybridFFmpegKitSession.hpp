//
// HybridFFmpegKitSession.hpp
//
// One FFmpeg / FFprobe run.
//
// Threading: the lifecycle, logs and statistics are written by the session's
// run thread (FFmpeg) and read from JS, so `_mutex` guards them. Everything
// else is immutable after construction. No callback is ever invoked here.
//

#pragma once

#include "HybridFFmpegKitSessionSpec.hpp"
#include "LogRedirection.hpp"
#include "SessionLifecycle.hpp"

#include <functional>
#include <mutex>
#include <optional>
#include <string>
#include <vector>

namespace margelo::nitro::ffmpegkit {

using LogCallback = std::function<void(const NativeLog&)>;
using StatisticsCallback = std::function<void(const NativeStatistics&)>;

class HybridFFmpegKitSession : public HybridFFmpegKitSessionSpec {
public:
  HybridFFmpegKitSession(int64_t sessionId, NativeSessionType type, std::vector<std::string> arguments,
                         LogRedirection logRedirection, std::optional<LogCallback> onLog,
                         std::optional<StatisticsCallback> onStatistics);

  // ---- Spec ----------------------------------------------------------------
  double getSessionId() override;
  NativeSessionType getType() override;
  std::vector<std::string> getArguments() override;
  std::string getCommand() override;
  double getCreateTime() override;
  double getStartTime() override;
  double getEndTime() override;
  double getDuration() override;
  NativeSessionState getState() override;
  std::optional<double> getReturnCode() override;
  std::optional<std::string> getFailStackTrace() override;
  double getLogRedirectionStrategy() override;
  std::vector<NativeLog> getLogs() override;
  std::string getOutput() override;
  std::vector<NativeStatistics> getStatistics() override;
  std::optional<NativeStatistics> getLastStatistics() override;
  std::shared_ptr<Promise<void>> execute() override;
  void cancel() override;

  size_t getExternalMemorySize() noexcept override;

  // ---- Runtime-side --------------------------------------------------------
  /**
   * The session running on the calling thread, or nullptr (e.g. libav worker
   * threads). Non-owning: the run thread holds the session for its lifetime.
   */
  static HybridFFmpegKitSession* current() noexcept;

  int64_t id() const noexcept {
    return _sessionId;
  }
  LogRedirection logRedirection() const noexcept {
    return _logRedirection;
  }
  const std::optional<LogCallback>& logCallback() const noexcept {
    return _onLog;
  }
  const std::optional<StatisticsCallback>& statisticsCallback() const noexcept {
    return _onStatistics;
  }
  bool isRunning();
  void addLog(const NativeLog& log);
  void addStatistics(const NativeStatistics& statistics);

private:
  /** Runs FFmpeg on the calling thread, then moves to Completed or Failed. */
  void run();

  const int64_t _sessionId;
  const NativeSessionType _type;
  const std::vector<std::string> _arguments;
  const LogRedirection _logRedirection;
  const double _createTime;
  const std::optional<LogCallback> _onLog;
  const std::optional<StatisticsCallback> _onStatistics;

  std::mutex _mutex;
  lifecycle::State _lifecycle = lifecycle::Created{};
  std::vector<NativeLog> _logs;
  size_t _logBytes = 0;
  std::vector<NativeStatistics> _statistics;
};

} // namespace margelo::nitro::ffmpegkit
