import Foundation
import NitroModules
import ffmpegkit

/// ffmpeg-kit's Objective-C API for the C++ core's cold paths (build info,
/// pipes, fonts, signals). Called only from C++ through the generated spec;
/// logs, statistics and execution never pass through Swift.
final class HybridFFmpegKitPlatform: HybridFFmpegKitPlatformSpec {

  /// The first message to FFmpegKitConfig runs its +initialize, which sets up
  /// ffmpeg-kit and installs its default callbacks (the core replaces them).
  func initialize() throws {
    _ = FFmpegKitConfig.getVersion()
  }

  var ffmpegVersion: String {
    return FFmpegKitConfig.getFFmpegVersion() ?? ""
  }

  var ffmpegKitVersion: String {
    return FFmpegKitConfig.getVersion() ?? ""
  }

  var buildDate: String {
    return FFmpegKitConfig.getBuildDate() ?? ""
  }

  var isLTSBuild: Bool {
    return FFmpegKitConfig.isLTSBuild() != 0
  }

  var packageName: String {
    return Packages.getPackageName() ?? ""
  }

  var externalLibraries: [String] {
    return (Packages.getExternalLibraries() ?? []).compactMap { $0 as? String }
  }

  var arch: String {
    return ArchDetect.getArch() ?? ""
  }

  func registerNewFFmpegPipe() throws -> String {
    guard let path = FFmpegKitConfig.registerNewFFmpegPipe() else {
      throw RuntimeError.error(withMessage: "ffmpeg-kit could not create a pipe.")
    }
    return path
  }

  func closeFFmpegPipe(path: String) throws {
    FFmpegKitConfig.closeFFmpegPipe(path)
  }

  func setFontconfigConfigurationPath(path: String) throws {
    _ = FFmpegKitConfig.setFontconfigConfigurationPath(path)
  }

  func setFontDirectoryList(fontDirectoryList: [String], fontNameMapping: Dictionary<String, String>) throws {
    FFmpegKitConfig.setFontDirectoryList(fontDirectoryList, with: fontNameMapping)
  }

  func ignoreSignal(signal: Double) throws {
    FFmpegKitConfig.ignore(try Signal(posixValue: signal))
  }
}
