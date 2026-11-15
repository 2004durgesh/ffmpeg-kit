package com.margelo.nitro.ffmpegkit

import android.content.Intent

/** What an Activity started for a result returned. */
internal data class ActivityResult(val resultCode: Int, val data: Intent?)
