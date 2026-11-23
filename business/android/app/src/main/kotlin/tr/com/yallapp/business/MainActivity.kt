package tr.com.yallapp.business

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import org.json.JSONObject
import java.util.TimeZone

// 59 A FragmentActivity: local_auth shows the system's fingerprint or face
// prompt as a fragment.
class MainActivity : FlutterFragmentActivity() {
    private var ring: MethodChannel? = null

    /** 207 The push of the notification that opened the app, until the app asks for it. */
    private var launchPush: Map<String, String>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        launchPush = pushOf(intent)
        super.onCreate(savedInstanceState)
    }

    // 132 While the app lock is on, the app switcher shows nothing of the
    // business: Android 13 and later leave the app out of the recents
    // screenshot (screenshots still work); older versions make the window
    // secure. Set from lib/core/services/privacy.dart.
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "tr.com.yallapp.business/privacy")
            .setMethodCallHandler { call, result ->
                if (call.method == "setSecure") {
                    val on = call.argument<Boolean>("on") == true
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        setRecentsScreenshotEnabled(!on)
                    } else if (on) {
                        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    } else {
                        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    }
                    result.success(null)
                } else {
                    result.notImplemented()
                }
            }
        // 207 The ringtones (lib/core/services/ringtones.dart, Ringing.kt).
        val channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "tr.com.yallapp.business/ring")
        ring = channel
        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "configure" -> {
                    Ringing.configure(this, call.argument<String>("settings"), call.argument<Map<String, String>>("words"))
                    result.success(null)
                }
                "stopRinging" -> {
                    Ringing.stopAll(this)
                    result.success(null)
                }
                "test" -> result.success(
                    Ringing.test(this, call.argument<String>("group") ?: "orders", call.argument<String>("title") ?: "", call.argument<String>("body") ?: ""),
                )
                "timeZone" -> result.success(TimeZone.getDefault().id)
                "initial" -> {
                    result.success(launchPush)
                    launchPush = null
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val push = pushOf(intent) ?: return
        ring?.invokeMethod("opened", push)
    }

    override fun onResume() {
        super.onResume()
        Ringing.inFront = true
        // The app is open: nothing rings on in the background.
        Ringing.stopAll(this)
    }

    override fun onPause() {
        Ringing.inFront = false
        super.onPause()
    }

    /** The push a notification of ours carries (and it's no longer ringing). */
    private fun pushOf(intent: Intent?): Map<String, String>? {
        val raw = intent?.getStringExtra(Ringing.EXTRA_PUSH) ?: return null
        val id = intent.getIntExtra(Ringing.EXTRA_ID, 0)
        if (id != 0) Ringing.forget(this, id)
        intent.removeExtra(Ringing.EXTRA_PUSH)
        return runCatching { Ringing.toMap(JSONObject(raw)) }.getOrNull()
    }
}
