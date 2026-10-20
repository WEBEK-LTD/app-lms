package tr.com.yallapp.business

import android.app.Activity
import android.content.Intent
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine

// 59 A FragmentActivity: local_auth shows the system's fingerprint or face
// prompt as a fragment.
class MainActivity : FlutterFragmentActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // 65 Huawei push: only builds with agconnect-services.json have it.
        hmsPush?.getMethod("attach", Activity::class.java, FlutterEngine::class.java)?.invoke(null, this, flutterEngine)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // 65 A Huawei push tapped while the app runs.
        hmsPush?.getMethod("onNewIntent", Intent::class.java)?.invoke(null, intent)
    }

    private companion object {
        /** 65 android/app/src/huawei, compiled in only with Huawei push (app/build.gradle.kts). */
        val hmsPush: Class<*>? =
            try {
                Class.forName("tr.com.yallapp.business.HmsPushChannel")
            } catch (e: ClassNotFoundException) {
                null
            }
    }
}
