package tr.com.yallapp.business

import android.app.Activity
import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.RemoteViews
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 214 The home-screen widget: the shop's sales today, its orders today and
 * the new orders waiting; tapped, the app opens on the orders.
 *
 * It reads `GET /widget` of the Owner API itself, with the widget's own
 * token (read-only, for that endpoint only; the app hands it over through
 * the `tr.com.yallapp.business/widget` channel each time it opens, kept in
 * the app's private storage), about every 15 minutes while a widget is on
 * the home screen, and at once when a new order's push arrives. The last
 * figures stay on the widget meanwhile. With several shops, the widget's
 * configuration asks which one (and again when reconfigured).
 */
object WidgetData {
    private const val PREFS = "yb_widget"
    const val ACTION_REFRESH = "tr.com.yallapp.business.WIDGET_REFRESH"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** From the app: where the API is, the token, and the app's language. Null token: signed out. */
    fun configure(context: Context, apiBase: String?, token: String?, lang: String?) {
        val edit = prefs(context).edit()
        if (apiBase != null) edit.putString("api", apiBase)
        if (token == null) {
            // Signed out: nothing of the shop stays on the home screen.
            edit.remove("token")
            for (key in prefs(context).all.keys) if (key.startsWith("cache_")) edit.remove(key)
        } else {
            edit.putString("token", token)
        }
        if (lang != null) edit.putString("lang", lang)
        edit.apply()
        refreshAll(context)
    }

    fun appFor(context: Context, widgetId: Int): String? = prefs(context).getString("app_$widgetId", null)

    fun setAppFor(context: Context, widgetId: Int, appId: String?) {
        val edit = prefs(context).edit()
        if (appId == null) edit.remove("app_$widgetId") else edit.putString("app_$widgetId", appId)
        edit.apply()
    }

    fun cached(context: Context, key: String): JSONObject? =
        prefs(context).getString("cache_$key", null)?.let { runCatching { JSONObject(it) }.getOrNull() }

    /** Reads `GET /widget` (off the main thread); null when signed out or offline. */
    fun fetch(context: Context, appId: String?): JSONObject? {
        val p = prefs(context)
        val token = p.getString("token", null) ?: return null
        val api = p.getString("api", null) ?: return null
        val query = if (appId != null) "?app_id=" + java.net.URLEncoder.encode(appId, "UTF-8") else ""
        return runCatching {
            val connection = URL("$api/widget$query").openConnection() as HttpURLConnection
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.setRequestProperty("Accept", "application/json")
            p.getString("lang", null)?.let { connection.setRequestProperty("Accept-Language", it) }
            try {
                if (connection.responseCode == 401) {
                    // Signed out on the server: the widget says so until the app signs in again.
                    p.edit().remove("token").apply()
                    return null
                }
                if (connection.responseCode != 200) return null
                val body = connection.inputStream.bufferedReader().use { it.readText() }
                JSONObject(body).also { p.edit().putString("cache_${appId ?: "default"}", body).apply() }
            } finally {
                connection.disconnect()
            }
        }.getOrNull()
    }

    fun signedIn(context: Context) = prefs(context).getString("token", null) != null

    fun widgetIds(context: Context): IntArray =
        AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, ShopWidget::class.java))

    /** Every widget again, from the network (a new order, the app opened, the alarm). */
    fun refreshAll(context: Context) {
        val ids = widgetIds(context)
        if (ids.isEmpty()) return
        val intent = Intent(context, ShopWidget::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
        context.sendBroadcast(intent)
    }

    /** About every 15 minutes while a widget is on the home screen (inexact: the phone batches it). */
    fun schedule(context: Context, on: Boolean) {
        val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, ShopWidget::class.java).apply { action = ACTION_REFRESH }
        val pending = PendingIntent.getBroadcast(context, 214, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        if (on) {
            alarms.setInexactRepeating(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + AlarmManager.INTERVAL_FIFTEEN_MINUTES, AlarmManager.INTERVAL_FIFTEEN_MINUTES, pending)
        } else {
            alarms.cancel(pending)
        }
    }

    /** The app opened on the orders of [appId] (the push's data the app reads). */
    fun openIntent(context: Context, widgetId: Int, appId: String?): PendingIntent {
        val data = JSONObject().apply {
            put("widget", "orders")
            if (appId != null) put("app_id", appId)
        }
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(Ringing.EXTRA_PUSH, data.toString())
        }
        return PendingIntent.getActivity(context, 2140000 + widgetId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun render(context: Context, widgetId: Int, json: JSONObject?, failed: Boolean): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.shop_widget)
        val app = json?.optJSONObject("app")
        views.setOnClickPendingIntent(R.id.widget_root, openIntent(context, widgetId, app?.optString("id") ?: appFor(context, widgetId)))
        if (app == null) {
            views.setTextViewText(R.id.widget_shop, "Yallapp Business")
            views.setTextViewText(R.id.widget_sales, "—")
            views.setTextViewText(R.id.widget_orders, "—")
            views.setTextViewText(R.id.widget_waiting, "—")
            views.setViewVisibility(R.id.widget_message, View.VISIBLE)
            views.setTextViewText(R.id.widget_message, context.getString(if (signedIn(context)) R.string.widget_offline else R.string.widget_sign_in))
            return views
        }
        views.setTextViewText(R.id.widget_shop, app.optString("name"))
        val sales = app.optJSONObject("sales")
        views.setTextViewText(R.id.widget_sales, sales?.optString("formatted") ?: "0")
        // Latin digits in every language, as the app writes them.
        views.setTextViewText(R.id.widget_orders, String.format(Locale.ROOT, "%d", app.optInt("orders")))
        views.setTextViewText(R.id.widget_waiting, String.format(Locale.ROOT, "%d", app.optInt("waiting")))
        if (failed) {
            views.setViewVisibility(R.id.widget_message, View.VISIBLE)
            views.setTextViewText(R.id.widget_message, context.getString(R.string.widget_offline))
        } else {
            views.setViewVisibility(R.id.widget_message, View.VISIBLE)
            val time = SimpleDateFormat("HH:mm", Locale.ROOT).format(Date())
            views.setTextViewText(R.id.widget_message, context.getString(R.string.widget_updated, time))
        }
        return views
    }
}

class ShopWidget : AppWidgetProvider() {
    override fun onEnabled(context: Context) = WidgetData.schedule(context, true)

    override fun onDisabled(context: Context) = WidgetData.schedule(context, false)

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        for (id in appWidgetIds) WidgetData.setAppFor(context, id, null)
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == WidgetData.ACTION_REFRESH) {
            WidgetData.refreshAll(context)
            return
        }
        super.onReceive(context, intent)
    }

    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        WidgetData.schedule(context, true)
        // The last figures at once, then the network's on a thread of its own.
        for (id in appWidgetIds) {
            val key = WidgetData.appFor(context, id) ?: "default"
            manager.updateAppWidget(id, WidgetData.render(context, id, WidgetData.cached(context, key), false))
        }
        val pending = goAsync()
        Thread {
            try {
                for (id in appWidgetIds) {
                    val appId = WidgetData.appFor(context, id)
                    val fresh = WidgetData.fetch(context, appId)
                    val shown = fresh ?: WidgetData.cached(context, appId ?: "default")
                    manager.updateAppWidget(id, WidgetData.render(context, id, shown, fresh == null && shown != null))
                }
            } finally {
                pending.finish()
            }
        }.start()
    }
}

/** 214 Which shop a widget shows, when the account has several (asked when it's added, and when reconfigured). */
class ShopWidgetConfigure : Activity() {
    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        widgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }
        title = getString(R.string.widget_choose)
        Thread {
            val json = WidgetData.fetch(this, null) ?: WidgetData.cached(this, "default")
            val apps = json?.optJSONArray("apps")
            val ids = ArrayList<String>()
            val names = ArrayList<String>()
            if (apps != null) for (i in 0 until apps.length()) {
                val a = apps.optJSONObject(i) ?: continue
                ids.add(a.optString("id"))
                names.add(a.optString("name"))
            }
            runOnUiThread {
                // One shop (or none yet): nothing to ask.
                if (ids.size <= 1) {
                    done(ids.firstOrNull())
                    return@runOnUiThread
                }
                val list = ListView(this)
                list.adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, names)
                list.setOnItemClickListener { _, _, position, _ -> done(ids[position]) }
                setContentView(list)
            }
        }.start()
    }

    private fun done(appId: String?) {
        WidgetData.setAppFor(this, widgetId, appId)
        WidgetData.refreshAll(this)
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
        finish()
    }
}
