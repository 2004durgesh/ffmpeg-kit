package com.margelo.nitro.ffmpegkit

import com.arthenica.ffmpegkit.Signal

/** The ffmpeg-kit [Signal] with the given POSIX number (one of the public `Signal` values). */
internal fun signalFromValue(value: Int): Signal =
  Signal.values().firstOrNull { it.value == value }
    ?: throw IllegalArgumentException("Unsupported signal: $value")
