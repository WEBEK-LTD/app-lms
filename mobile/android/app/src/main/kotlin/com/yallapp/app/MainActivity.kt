package com.yallapp.app

import android.app.Activity
import android.content.Intent
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
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // 36 A Huawei push notification tapped while the app runs.
        hmsPush?.getMethod("onNewIntent", Intent::class.java)?.invoke(null, intent)
    }

    private companion object {
        const val CHANNEL = "yallapp/screen_security"

        /** 36 android/app/src/huawei, compiled in only with Huawei push (app/build.gradle.kts). */
        val hmsPush: Class<*>? =
            try {
                Class.forName("com.yallapp.app.HmsPushChannel")
            } catch (e: ClassNotFoundException) {
                null
            }
    }
}
