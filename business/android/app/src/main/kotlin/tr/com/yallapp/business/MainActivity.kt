package tr.com.yallapp.business

import android.os.Build
import android.view.WindowManager
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

// 59 A FragmentActivity: local_auth shows the system's fingerprint or face
// prompt as a fragment.
class MainActivity : FlutterFragmentActivity() {
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
    }
}
