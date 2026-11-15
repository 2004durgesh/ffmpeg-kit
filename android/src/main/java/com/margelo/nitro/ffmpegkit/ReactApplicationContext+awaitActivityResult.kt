package com.margelo.nitro.ffmpegkit

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.ReactApplicationContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Starts [intent] from [activity] and suspends until React Native reports the
 * result for [requestCode]. The listener is removed on result, failure and
 * cancellation.
 */
internal suspend fun ReactApplicationContext.awaitActivityResult(
  activity: Activity,
  intent: Intent,
  requestCode: Int,
): ActivityResult = suspendCancellableCoroutine { continuation ->
  val context = this
  val awaitedRequestCode = requestCode
  val listener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode != awaitedRequestCode) return
      context.removeActivityEventListener(this)
      continuation.resume(ActivityResult(resultCode, data))
    }
  }
  addActivityEventListener(listener)
  continuation.invokeOnCancellation { removeActivityEventListener(listener) }
  try {
    activity.startActivityForResult(intent, requestCode)
  } catch (e: Exception) {
    removeActivityEventListener(listener)
    continuation.resumeWithException(e)
  }
}
