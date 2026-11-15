//
// FFmpegKitRuntime.cpp
//

#include "FFmpegKitRuntime.hpp"
#include "FFmpegCallbacks.hpp"
#include "FFmpegKitPlatform.hpp"

#include <algorithm>

namespace margelo::nitro::ffmpegkit {

FFmpegKitRuntime& FFmpegKitRuntime::shared() {
  static FFmpegKitRuntime runtime;
  return runtime;
}

FFmpegKitRuntime::FFmpegKitRuntime() : _logLevel(*platform::api().configuredLogLevel) {}

void FFmpegKitRuntime::setLogLevel(int level) {
  _logLevel = level;
  const auto& api = platform::api();
  // ffmpeg-kit re-applies its own level at the start of every run, so set both.
  *api.configuredLogLevel = level;
  // libav checks this before calling the callback, so lines above the level are never formatted.
  api.av_log_set_level(level);
}

void FFmpegKitRuntime::enableRedirection() {
  setLogLevel(logLevel());
  callbacks::install();
  _redirectionEnabled = true;
}

void FFmpegKitRuntime::disableRedirection() {
  callbacks::uninstall();
  _redirectionEnabled = false;
}

void FFmpegKitRuntime::setLogCallback(std::optional<LogCallback> callback) {
  auto snapshot = callback.has_value() ? std::make_shared<const LogCallback>(std::move(*callback)) : nullptr;
  std::lock_guard lock(_mutex);
  _globalLog = std::move(snapshot);
}

void FFmpegKitRuntime::setStatisticsCallback(std::optional<StatisticsCallback> callback) {
  auto snapshot =
      callback.has_value() ? std::make_shared<const StatisticsCallback>(std::move(*callback)) : nullptr;
  std::lock_guard lock(_mutex);
  _globalStatistics = std::move(snapshot);
}

std::shared_ptr<HybridFFmpegKitSession>
FFmpegKitRuntime::createSession(NativeSessionType type, std::vector<std::string> args, LogRedirection logRedirection,
                                std::optional<LogCallback> onLog, std::optional<StatisticsCallback> onStatistics) {
  std::lock_guard lock(_mutex);
  auto session = std::make_shared<HybridFFmpegKitSession>(_nextSessionId++, type, std::move(args), logRedirection,
                                                          std::move(onLog), std::move(onStatistics));
  _history.push_back(session);
  trimHistoryLocked();
  return session;
}

std::shared_ptr<HybridFFmpegKitSession> FFmpegKitRuntime::findSession(int64_t sessionId) {
  std::lock_guard lock(_mutex);
  const auto it = std::find_if(_history.begin(), _history.end(),
                               [sessionId](const auto& session) { return session->id() == sessionId; });
  return it != _history.end() ? *it : nullptr;
}

std::vector<std::shared_ptr<HybridFFmpegKitSession>> FFmpegKitRuntime::sessions() {
  std::lock_guard lock(_mutex);
  return _history;
}

void FFmpegKitRuntime::clearSessions() {
  // Running sessions keep going; their run threads own them.
  std::lock_guard lock(_mutex);
  _history.clear();
}

int FFmpegKitRuntime::sessionHistorySize() {
  std::lock_guard lock(_mutex);
  return _sessionHistorySize;
}

void FFmpegKitRuntime::setSessionHistorySize(int size) {
  std::lock_guard lock(_mutex);
  _sessionHistorySize = std::max(size, 0);
  trimHistoryLocked();
}

void FFmpegKitRuntime::trimHistoryLocked() {
  // Drop the oldest finished sessions first; never evict a running one.
  while (_history.size() > static_cast<size_t>(_sessionHistorySize)) {
    const auto oldestFinished =
        std::find_if(_history.begin(), _history.end(), [](const auto& session) { return !session->isRunning(); });
    if (oldestFinished == _history.end()) {
      return;
    }
    _history.erase(oldestFinished);
  }
}

void FFmpegKitRuntime::deliverLog(HybridFFmpegKitSession* session, int level, std::string message) {
  const NativeLog log(session != nullptr ? static_cast<double>(session->id()) : 0, level, std::move(message));

  std::shared_ptr<const LogCallback> global;
  {
    std::lock_guard lock(_mutex);
    global = _globalLog;
  }

  LogRedirection redirection = logRedirection.load(std::memory_order_relaxed);
  const LogCallback* own = nullptr;
  if (session != nullptr) {
    session->addLog(log);
    redirection = session->logRedirection();
    own = session->logCallback() ? &*session->logCallback() : nullptr;
  }

  // A Nitro JS callback called from this thread is scheduled on the JS thread.
  if (logsEnabled.load(std::memory_order_relaxed)) {
    if (own != nullptr) {
      (*own)(log);
    }
    if (global != nullptr) {
      (*global)(log);
    }
  }

  if (level != kLogQuiet && shouldPrint(redirection, own != nullptr, global != nullptr)) {
    platform::printLog(level, log.message);
  }
}

void FFmpegKitRuntime::deliverStatistics(HybridFFmpegKitSession* session, const NativeStatistics& statistics) {
  if (session != nullptr) {
    session->addStatistics(statistics);
  }
  if (!statisticsEnabled.load(std::memory_order_relaxed)) {
    return;
  }

  std::shared_ptr<const StatisticsCallback> global;
  {
    std::lock_guard lock(_mutex);
    global = _globalStatistics;
  }
  if (session != nullptr && session->statisticsCallback()) {
    (*session->statisticsCallback())(statistics);
  }
  if (global != nullptr) {
    (*global)(statistics);
  }
}

} // namespace margelo::nitro::ffmpegkit
