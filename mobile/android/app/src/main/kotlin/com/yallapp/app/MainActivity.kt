package com.yallapp.app

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
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    // Blocks screenshots, screen recording and the preview in
                    // the recent apps list while protected content is shown.
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
    }

    private companion object {
        const val CHANNEL = "yallapp/screen_security"
    }
}
