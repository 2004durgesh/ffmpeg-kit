//
// HybridFFmpegKitCore.hpp
//
// JS-facing entry point. A thin facade: state lives in FFmpegKitRuntime,
// platform services in FFmpegKitPlatform.
//

#pragma once

#include "HybridFFmpegKitCoreSpec.hpp"

namespace margelo::nitro::ffmpegkit {

class HybridFFmpegKitCore : public HybridFFmpegKitCoreSpec {
public:
  HybridFFmpegKitCore();

  // ---- Build info ------------------------------------------------------------
  std::string getFfmpegVersion() override;
  std::string getFfmpegKitVersion() override;
  std::string getBuildDate() override;
  bool getIsLTSBuild() override;
  std::string getPackageName() override;
  std::vector<std::string> getExternalLibraries() override;
  std::string getBinaryVersion() override;
  std::string getArch() override;

  // ---- Config ----------------------------------------------------------------
  double getLogLevel() override;
  void setLogLevel(double logLevel) override;
  double getLogRedirectionStrategy() override;
  void setLogRedirectionStrategy(double logRedirectionStrategy) override;
  double getSessionHistorySize() override;
  void setSessionHistorySize(double sessionHistorySize) override;
  bool getLogsEnabled() override;
  void setLogsEnabled(bool logsEnabled) override;
  bool getStatisticsEnabled() override;
  void setStatisticsEnabled(bool statisticsEnabled) override;
  bool getRedirectionEnabled() override;
  void enableRedirection() override;
  void disableRedirection() override;

  // ---- Sessions --------------------------------------------------------------
  std::shared_ptr<HybridFFmpegKitSessionSpec>
  createSession(NativeSessionType type, const std::vector<std::string>& args, double logRedirectionStrategy,
                const std::optional<std::function<void(const NativeLog&)>>& onLog,
                const std::optional<std::function<void(const NativeStatistics&)>>& onStatistics) override;
  void setLogCallback(const std::optional<std::function<void(const NativeLog&)>>& onLog) override;
  void setStatisticsCallback(
      const std::optional<std::function<void(const NativeStatistics&)>>& onStatistics) override;
  std::optional<std::shared_ptr<HybridFFmpegKitSessionSpec>> getSession(double sessionId) override;
  std::optional<std::shared_ptr<HybridFFmpegKitSessionSpec>> getLastSession() override;
  std::optional<std::shared_ptr<HybridFFmpegKitSessionSpec>> getLastCompletedSession() override;
  std::vector<std::shared_ptr<HybridFFmpegKitSessionSpec>> getSessions() override;
  void clearSessions() override;
  void cancel(std::optional<double> sessionId) override;

  // ---- Pipes, fonts, environment ---------------------------------------------
  std::string registerNewFFmpegPipe() override;
  void closeFFmpegPipe(const std::string& path) override;
  std::shared_ptr<Promise<double>> writeToPipe(const std::string& inputPath, const std::string& pipePath) override;
  void setFontconfigConfigurationPath(const std::string& path) override;
  void setFontDirectoryList(const std::vector<std::string>& fontDirectoryList,
                            const std::unordered_map<std::string, std::string>& fontNameMapping) override;
  void setEnvironmentVariable(const std::string& name, const std::string& value) override;
  void ignoreSignal(double signal) override;
};

} // namespace margelo::nitro::ffmpegkit
