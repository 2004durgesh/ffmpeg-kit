package com.margelo.nitro.ffmpegkit

import android.net.Uri
import androidx.annotation.Keep
import com.arthenica.ffmpegkit.FFmpegKitConfig
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

/** Storage Access Framework, Android only. FFmpeg opens the returned saf: urls through ffmpeg-kit's own protocol. */
@DoNotStrip
@Keep
class HybridFFmpegKitStorage : HybridFFmpegKitStorageSpec() {

  override fun getSafParameter(uri: String, openMode: String): String =
    FFmpegKitConfig.getSafParameter(NitroModules.requireApplicationContext(), Uri.parse(uri), openMode)

  override fun selectDocument(
    writable: Boolean,
    title: String?,
    type: String?,
    extraTypes: Array<String>,
  ): Promise<String> {
    val request = DocumentPickerRequest(writable, title, type, extraTypes.toList())
    return Promise.async {
      val context = NitroModules.requireApplicationContext()
      val activity = checkNotNull(context.currentActivity) { "react-native-ffmpeg-kit: no current Activity." }
      val result = context.awaitActivityResult(activity, request.toIntent(), request.requestCode)
      return@async result.requireDocumentUri()
    }
  }
}
