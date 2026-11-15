package com.margelo.nitro.ffmpegkit

import android.app.Activity

/** The picked document's content:// uri; throws when the picker was cancelled or returned nothing. */
internal fun ActivityResult.requireDocumentUri(): String {
  check(resultCode == Activity.RESULT_OK) { "Document selection cancelled (result code $resultCode)." }
  val uri = checkNotNull(data?.data) { "No document was selected." }
  return uri.toString()
}
