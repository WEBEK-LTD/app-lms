package tr.com.yallapp.business

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 206 Receives Yallapp Business's pushes beside Firebase's own receiver
 * (the same broadcast firebase_messaging listens to, sent only by Google
 * Play services): a data-only push with `yb_title` is shown by [Ringing];
 * any other push is left to Firebase as before.
 */
class RingReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            "com.google.android.c2dm.intent.RECEIVE" -> {
                val extras = intent.extras ?: return
                if (!extras.containsKey("yb_title")) return
                val data = HashMap<String, String>()
                for (key in extras.keySet()) {
                    @Suppress("DEPRECATION")
                    val value = extras.get(key)
                    if (value is String) data[key] = value
                }
                runCatching { Ringing.show(context, data) }
            }
        }
    }
}

/** 206 Silence on a ringing notification, its time running out, and a swipe away (the app's own, not exported). */
class RingActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra(Ringing.EXTRA_ID, 0)
        when (intent.action) {
            Ringing.ACTION_QUIET -> Ringing.quiet(context, id)
            Ringing.ACTION_DISMISSED -> Ringing.forget(context, id)
        }
    }
}
