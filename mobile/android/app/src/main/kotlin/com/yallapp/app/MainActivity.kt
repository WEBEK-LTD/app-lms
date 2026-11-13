package com.yallapp.app

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * The class lives in a fixed package so the client's applicationId and
 * namespace (set by tool/apply_config.dart) can change freely; the manifest
 * refers to it by its full name.
 */
class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // 36 Huawei push: only builds with the client's agconnect-services.json have it.
        hmsPush?.getMethod("attach", Activity::class.java, FlutterEngine::class.java)?.invoke(null, this, flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    // Blocks screenshots, screen recording and the preview in
                    // the recent apps list while protected content is shown
                    // (53: course content or the whole app, as the owner
                    // chose). The flag is on the activity's window, where
                    // Flutter draws everything: dialogs, sheets, the video's
                    // full screen and web views (lesson embeds) included.
                    "setSecure" -> {
                        val enabled = call.argument<Boolean>("enabled") ?: false
                        if (enabled) {
                            window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                        } else {
                            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                        }
                        result.success(null)
                    }
                    // FLAG_SECURE already hides the content from captures.
                    "isCaptured" -> result.success(false)
                    else -> result.notImplemented()
                }
            }
        // 53 Course PDFs in the app's own viewer.
        PdfChannel(applicationContext, flutterEngine.dartExecutor.binaryMessenger)
        // 129.4 Data Saver, for Studio's video banners.
        DataSaverChannel(applicationContext, flutterEngine.dartExecutor.binaryMessenger)
        // 124.9 A page in the app (a video call, an identity check) asked
        // for the camera or the microphone: Android asks the person, once
        // the app may use them the page gets them (lib/core/web/media_permission.dart).
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, MEDIA_CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "request" -> requestMedia(
                        camera = call.argument<Boolean>("camera") == true,
                        microphone = call.argument<Boolean>("microphone") == true,
                        result = result,
                    )
                    else -> result.notImplemented()
                }
            }
    }

    private var mediaResult: MethodChannel.Result? = null

    private fun requestMedia(camera: Boolean, microphone: Boolean, result: MethodChannel.Result) {
        val wanted = listOfNotNull(
            if (camera) Manifest.permission.CAMERA else null,
            if (microphone) Manifest.permission.RECORD_AUDIO else null,
        )
        val missing = wanted.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        when {
            wanted.isEmpty() -> result.success(false)
            missing.isEmpty() -> result.success(true)
            // One question at a time: a second one while Android asks is refused.
            mediaResult != null -> result.success(false)
            else -> {
                mediaResult = result
                requestPermissions(missing.toTypedArray(), MEDIA_REQUEST)
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != MEDIA_REQUEST) return
        val result = mediaResult ?: return
        mediaResult = null
        result.success(grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED })
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // 36 A Huawei push notification tapped while the app runs.
        hmsPush?.getMethod("onNewIntent", Intent::class.java)?.invoke(null, intent)
    }

    private companion object {
        const val CHANNEL = "yallapp/screen_security"
        const val MEDIA_CHANNEL = "yallapp/media_permission"
        const val MEDIA_REQUEST = 1249

        /** 36 android/app/src/huawei, compiled in only with Huawei push (app/build.gradle.kts). */
        val hmsPush: Class<*>? =
            try {
                Class.forName("com.yallapp.app.HmsPushChannel")
            } catch (e: ClassNotFoundException) {
                null
            }
    }
}
