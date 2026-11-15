//
// HybridFFmpegKitCore.cpp
//

#include "HybridFFmpegKitCore.hpp"
#include "FFmpegKitPlatform.hpp"
#include "FFmpegKitRuntime.hpp"
#include "PipeWriter.hpp"
#include "PlatformServices.hpp"

#include <cstdlib>
#include <thread>

// Release tag the binaries were downloaded from; set by build.gradle / the podspec.
#ifndef FFMPEG_KIT_RELEASE_TAG
#define FFMPEG_KIT_RELEASE_TAG unknown
#endif
#define FFMPEG_KIT_STRINGIFY_(x) #x
#define FFMPEG_KIT_STRINGIFY(x) FFMPEG_KIT_STRINGIFY_(x)

namespace margelo::nitro::ffmpegkit {

namespace {
  FFmpegKitRuntime& runtime() {
    return FFmpegKitRuntime::shared();
  }

  std::optional<std::shared_ptr<HybridFFmpegKitSessionSpec>>
  toOptional(std::shared_ptr<HybridFFmpegKitSession> session) {
    if (session == nullptr) {
      return std::nullopt;
    }
    return session;
  }
} // namespace

HybridFFmpegKitCore::HybridFFmpegKitCore() : HybridObject(TAG) {
  // Must run before the runtime is first used: it loads ffmpeg-kit's libraries.
  platformServices();
}

// ---- Build info: read once, it never changes -----------------------------------

std::string HybridFFmpegKitCore::getFfmpegVersion() {
  static const std::string value = platformServices()->getFfmpegVersion();
  return value;
}

std::string HybridFFmpegKitCore::getFfmpegKitVersion() {
  static const std::string value = platformServices()->getFfmpegKitVersion();
  return value;
}

std::string HybridFFmpegKitCore::getBuildDate() {
  static const std::string value = platformServices()->getBuildDate();
  return value;
}

bool HybridFFmpegKitCore::getIsLTSBuild() {
  static const bool value = platformServices()->getIsLTSBuild();
  return value;
}

std::string HybridFFmpegKitCore::getPackageName() {
  static const std::string value = platformServices()->getPackageName();
  return value;
}

std::vector<std::string> HybridFFmpegKitCore::getExternalLibraries() {
  static const std::vector<std::string> value = platformServices()->getExternalLibraries();
  return value;
}

std::string HybridFFmpegKitCore::getBinaryVersion() {
  return FFMPEG_KIT_STRINGIFY(FFMPEG_KIT_RELEASE_TAG);
}

std::string HybridFFmpegKitCore::getArch() {
  static const std::string value = platformServices()->getArch();
  return value;
}

// ---- Config ----------------------------------------------------------------------

double HybridFFmpegKitCore::getLogLevel() {
  return runtime().logLevel();
}

void HybridFFmpegKitCore::setLogLevel(double logLevel) {
  runtime().setLogLevel(static_cast<int>(logLevel));
}

double HybridFFmpegKitCore::getLogRedirectionStrategy() {
  return static_cast<double>(runtime().logRedirection.load());
}

void HybridFFmpegKitCore::setLogRedirectionStrategy(double logRedirectionStrategy) {
  runtime().logRedirection = toLogRedirection(logRedirectionStrategy);
}

double HybridFFmpegKitCore::getSessionHistorySize() {
  return runtime().sessionHistorySize();
}

void HybridFFmpegKitCore::setSessionHistorySize(double sessionHistorySize) {
  runtime().setSessionHistorySize(static_cast<int>(sessionHistorySize));
}

bool HybridFFmpegKitCore::getLogsEnabled() {
  return runtime().logsEnabled.load();
}

void HybridFFmpegKitCore::setLogsEnabled(bool logsEnabled) {
  runtime().logsEnabled = logsEnabled;
}

bool HybridFFmpegKitCore::getStatisticsEnabled() {
  return runtime().statisticsEnabled.load();
}

void HybridFFmpegKitCore::setStatisticsEnabled(bool statisticsEnabled) {
  runtime().statisticsEnabled = statisticsEnabled;
}

bool HybridFFmpegKitCore::getRedirectionEnabled() {
  return runtime().redirectionEnabled();
}

void HybridFFmpegKitCore::enableRedirection() {
  runtime().enableRedirection();
}

void HybridFFmpegKitCore::disableRedirection() {
  runtime().disableRedirection();
}

// ---- Sessions --------------------------------------------------------------------

std::shared_ptr<HybridFFmpegKitSessionSpec>
HybridFFmpegKitCore::createSession(NativeSessionType type, const std::vector<std::string>& args,
                                   double logRedirectionStrategy,
                                   const std::optional<std::function<void(const NativeLog&)>>& onLog,
                                   const std::optional<std::function<void(const NativeStatistics&)>>& onStatistics) {
  return runtime().createSession(type, args, toLogRedirection(logRedirectionStrategy), onLog, onStatistics);
}

void HybridFFmpegKitCore::setLogCallback(const std::optional<std::function<void(const NativeLog&)>>& onLog) {
  runtime().setLogCallback(onLog);
}

void HybridFFmpegKitCore::setStatisticsCallback(
    const std::optional<std::function<void(const NativeStatistics&)>>& onStatistics) {
  runtime().setStatisticsCallback(onStatistics);
}

std::optional<std::shared_ptr<HybridFFmpegKitSessionSpec>> HybridFFmpegKitCore::getSession(double sessionId) {
  return toOptional(runtime().findSession(static_cast<int64_t>(sessionId)));
}

std::optional<std::shared_ptr<HybridFFmpegKitSessionSpec>> HybridFFmpegKitCore::getLastSession() {
  const auto all = runtime().sessions();
  return all.empty() ? std::nullopt : toOptional(all.back());
}

std::optional<std::shared_ptr<HybridFFmpegKitSessionSpec>> HybridFFmpegKitCore::getLastCompletedSession() {
  const auto all = runtime().sessions();
  for (auto it = all.rbegin(); it != all.rend(); ++it) {
    if ((*it)->getState() == NativeSessionState::COMPLETED) {
      return *it;
    }
  }
  return std::nullopt;
}

std::vector<std::shared_ptr<HybridFFmpegKitSessionSpec>> HybridFFmpegKitCore::getSessions() {
  const auto all = runtime().sessions();
  return {all.begin(), all.end()};
}

void HybridFFmpegKitCore::clearSessions() {
  runtime().clearSessions();
}

void HybridFFmpegKitCore::cancel(std::optional<double> sessionId) {
  if (sessionId.has_value()) {
    // Not limited to the history: a running session may have been evicted from it.
    platform::api().cancel_operation(static_cast<long>(*sessionId));
    return;
  }
  for (const auto& session : runtime().sessions()) {
    session->cancel();
  }
}

// ---- Pipes, fonts, environment ---------------------------------------------------

std::string HybridFFmpegKitCore::registerNewFFmpegPipe() {
  return platformServices()->registerNewFFmpegPipe();
}

void HybridFFmpegKitCore::closeFFmpegPipe(const std::string& path) {
  platformServices()->closeFFmpegPipe(path);
}

std::shared_ptr<Promise<double>> HybridFFmpegKitCore::writeToPipe(const std::string& inputPath,
                                                                  const std::string& pipePath) {
  auto promise = Promise<double>::create();
  // Its own thread, not Nitro's pool: opening the pipe blocks until FFmpeg reads it.
  std::thread([inputPath, pipePath, promise] {
    promise->resolve(static_cast<double>(copyFileToPipe(inputPath, pipePath)));
  }).detach();
  return promise;
}

void HybridFFmpegKitCore::setFontconfigConfigurationPath(const std::string& path) {
  platformServices()->setFontconfigConfigurationPath(path);
}

void HybridFFmpegKitCore::setFontDirectoryList(const std::vector<std::string>& fontDirectoryList,
                                               const std::unordered_map<std::string, std::string>& fontNameMapping) {
  platformServices()->setFontDirectoryList(fontDirectoryList, fontNameMapping);
}

void HybridFFmpegKitCore::setEnvironmentVariable(const std::string& name, const std::string& value) {
  ::setenv(name.c_str(), value.c_str(), 1);
}

void HybridFFmpegKitCore::ignoreSignal(double signal) {
  platformServices()->ignoreSignal(signal);
}

} // namespace margelo::nitro::ffmpegkit
