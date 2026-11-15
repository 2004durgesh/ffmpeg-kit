package com.margelo.nitro.ffmpegkit

import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules

/** The current React context, or a clear error when the app hasn't created one yet. */
internal fun NitroModules.Companion.requireApplicationContext(): ReactApplicationContext =
  applicationContext ?: throw IllegalStateException("react-native-ffmpeg-kit: no Android context yet.")
