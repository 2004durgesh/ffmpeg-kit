package com.margelo.nitro.ffmpegkit

import android.content.Intent

/** A system document picker request: open an existing document, or create one when [writable]. */
internal data class DocumentPickerRequest(
  val writable: Boolean,
  val title: String?,
  val type: String?,
  val extraTypes: List<String>,
) {
  val requestCode: Int
    get() = if (writable) WRITABLE_REQUEST_CODE else READABLE_REQUEST_CODE

  fun toIntent(): Intent {
    val intent = if (writable) {
      Intent(Intent.ACTION_CREATE_DOCUMENT)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    } else {
      Intent(Intent.ACTION_GET_CONTENT)
        .addCategory(Intent.CATEGORY_OPENABLE)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    intent.type = type ?: "*/*"
    if (title != null) intent.putExtra(Intent.EXTRA_TITLE, title)
    if (extraTypes.isNotEmpty()) intent.putExtra(Intent.EXTRA_MIME_TYPES, extraTypes.toTypedArray())
    return intent
  }

  private companion object {
    const val READABLE_REQUEST_CODE = 10000
    const val WRITABLE_REQUEST_CODE = 20000
  }
}
