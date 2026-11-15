//
// FFmpegKitRuntime.hpp
//
// Process-wide state shared by every FFmpegKitCore instance (one per JS
// runtime): config, session history, global callbacks, and delivery of the
// log lines and statistics FFmpegCallbacks receives from FFmpeg threads.
//
// Threading: config and history are changed from JS threads; delivery runs on
// FFmpeg threads. `_mutex` guards history and the global-callback snapshots
// only; it is never held while calling out (callbacks, platform, sessions'
// user code).
//

#pragma once

#include "HybridFFmpegKitSession.hpp"
#include "LogRedirection.hpp"

#include <atomic>
#include <memory>
#include <mutex>
#include <optional>
#include <vector>

namespace margelo::nitro::ffmpegkit {

class FFmpegKitRuntime {
public:
  static FFmpegKitRuntime& shared();

  FFmpegKitRuntime(const FFmpegKitRuntime&) = delete;
  FFmpegKitRuntime& operator=(const FFmpegKitRuntime&) = delete;

  // ---- Config -----------------------------------------------------------------
  int logLevel() const noexcept {
    return _logLevel.load(std::memory_order_relaxed);
  }
  void setLogLevel(int level);

  std::atomic<LogRedirection> logRedirection{LogRedirection::WhenNoSessionCallback};
  std::atomic<bool> logsEnabled{true};
  std::atomic<bool> statisticsEnabled{true};

  bool redirectionEnabled() const noexcept {
    return _redirectionEnabled.load();
  }
  void enableRedirection();
  void disableRedirection();

  void setLogCallback(std::optional<LogCallback> callback);
  void setStatisticsCallback(std::optional<StatisticsCallback> callback);

  // ---- Sessions ---------------------------------------------------------------
  std::shared_ptr<HybridFFmpegKitSession> createSession(NativeSessionType type, std::vector<std::string> args,
                                                        LogRedirection logRedirection,
                                                        std::optional<LogCallback> onLog,
                                                        std::optional<StatisticsCallback> onStatistics);
  std::shared_ptr<HybridFFmpegKitSession> findSession(int64_t sessionId);
  /** Snapshot of the history, oldest first. */
  std::vector<std::shared_ptr<HybridFFmpegKitSession>> sessions();
  void clearSessions();
  int sessionHistorySize();
  void setSessionHistorySize(int size);

  // ---- Delivery (FFmpeg threads) ----------------------------------------------
  /** `session` is null for lines from threads that don't run a session (e.g. libav workers). */
  void deliverLog(HybridFFmpegKitSession* session, int level, std::string message);
  void deliverStatistics(HybridFFmpegKitSession* session, const NativeStatistics& statistics);

private:
  FFmpegKitRuntime();
  void trimHistoryLocked();

  std::atomic<int> _logLevel;
  std::atomic<bool> _redirectionEnabled{false};

  std::mutex _mutex;
  int64_t _nextSessionId = 1;
  int _sessionHistorySize = 10;
  std::vector<std::shared_ptr<HybridFFmpegKitSession>> _history;
  // Replaced, never mutated: readers copy the pointer and call outside the lock.
  std::shared_ptr<const LogCallback> _globalLog;
  std::shared_ptr<const StatisticsCallback> _globalStatistics;
};

} // namespace margelo::nitro::ffmpegkit
