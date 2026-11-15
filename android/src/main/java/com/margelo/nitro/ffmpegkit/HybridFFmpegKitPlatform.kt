package com.margelo.nitro.ffmpegkit

import androidx.annotation.Keep
import com.arthenica.ffmpegkit.AbiDetect
import com.arthenica.ffmpegkit.FFmpegKitConfig
import com.arthenica.ffmpegkit.Packages
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules

/**
 * ffmpeg-kit's Java API for the C++ core's cold paths (build info, pipes,
 * fonts, signals). Called only from C++ through the generated spec; logs,
 * statistics and execution never pass through Kotlin.
 */
@DoNotStrip
@Keep
class HybridFFmpegKitPlatform : HybridFFmpegKitPlatformSpec() {

  /** FFmpegKitConfig's static initializer loads the native libraries (NEON build on armv7) and runs libffmpegkit's JNI_OnLoad. */
  override fun initialize() {
    FFmpegKitConfig.getVersion()
  }

  override val ffmpegVersion: String
    get() = FFmpegKitConfig.getFFmpegVersion()

  override val ffmpegKitVersion: String
    get() = FFmpegKitConfig.getVersion()

  override val buildDate: String
    get() = FFmpegKitConfig.getBuildDate()

  override val isLTSBuild: Boolean
    get() = FFmpegKitConfig.isLTSBuild()

  override val packageName: String
    get() = Packages.getPackageName()

  override val externalLibraries: Array<String>
    get() = Packages.getExternalLibraries().toTypedArray()

  override val arch: String
    get() = AbiDetect.getAbi()

  override fun registerNewFFmpegPipe(): String =
    FFmpegKitConfig.registerNewFFmpegPipe(NitroModules.requireApplicationContext())

  override fun closeFFmpegPipe(path: String) {
    FFmpegKitConfig.closeFFmpegPipe(path)
  }

  override fun setFontconfigConfigurationPath(path: String) {
    FFmpegKitConfig.setFontconfigConfigurationPath(path)
  }

  override fun setFontDirectoryList(fontDirectoryList: Array<String>, fontNameMapping: Map<String, String>) {
    FFmpegKitConfig.setFontDirectoryList(
      NitroModules.requireApplicationContext(),
      fontDirectoryList.toList(),
      fontNameMapping,
    )
  }

  override fun ignoreSignal(signal: Double) {
    FFmpegKitConfig.ignoreSignal(signalFromValue(signal.toInt()))
  }
}
