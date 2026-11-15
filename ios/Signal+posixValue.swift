import NitroModules
import ffmpegkit

extension Signal {
  /// The ffmpeg-kit signal with the given POSIX number (one of the public `Signal` values).
  init(posixValue: Double) throws {
    guard let raw = UInt(exactly: posixValue), let signal = Signal(rawValue: raw) else {
      throw RuntimeError.error(withMessage: "Unsupported signal: \(posixValue)")
    }
    self = signal
  }
}
