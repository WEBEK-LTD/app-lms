package tr.com.yallapp.business

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.provider.Settings
import org.json.JSONObject
import java.util.Calendar

/**
 * 207 Yallapp Business's ringing pushes on Android.
 *
 * A phone that saved its ringtones (lib/core/services/ringtones.dart) gets
 * its pushes as data only; [RingReceiver] hands each one here and this shows
 * it: on the chosen sound's own channel (a channel's sound can't change once
 * made, so each sound, volume and vibration has its own, with a version in
 * its id), heads-up, and for a new order or booking that rings until opened
 * with the sound again and again (FLAG_INSISTENT) for at most the minutes
 * chosen, then shown again without a sound. Opening it, Silence, swiping it
 * away or opening the app stops it. While the app is in front the app rings
 * itself and nothing is shown here.
 */
object Ringing {
    private const val PREFS = "yb_ring"
    private const val KEY_SETTINGS = "settings"
    private const val KEY_WORDS = "words"
    private const val KEY_RINGING = "ringing"
    private const val CHANNEL_VERSION = 1
    const val ACTION_QUIET = "tr.com.yallapp.business.RING_QUIET"
    const val ACTION_DISMISSED = "tr.com.yallapp.business.RING_DISMISSED"
    const val EXTRA_ID = "yb_notification_id"
    const val EXTRA_PUSH = "yb_push"

    /** True while MainActivity is in front (the app rings itself then). */
    @Volatile
    var inFront = false

    private val groups = listOf("orders", "bookings", "cancelled", "messages", "other")
    private val ringtones = setOf(
        "chime", "counter_bell", "kitchen_ticket", "marimba", "harp", "digital", "rush_hour",
        "cash_drawer", "doorbell", "xylophone", "soft_pulse", "chirp", "sunrise", "arcade",
        "soft_drop", "pop", "knock",
        // 213 The money sounds.
        "cha_ching", "coin_drop", "till_bell", "coin_chime", "sale_jingle", "piggy_bank", "receipt_printer",
    )
    private val defaults = mapOf(
        "orders" to "counter_bell",
        "bookings" to "doorbell",
        "cancelled" to "knock",
        "messages" to "pop",
        "other" to "default",
    )

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun configure(context: Context, settings: String?, words: Map<String, String>?) {
        val edit = prefs(context).edit()
        if (settings != null) edit.putString(KEY_SETTINGS, settings)
        if (words != null) edit.putString(KEY_WORDS, JSONObject(words as Map<*, *>).toString())
        edit.apply()
    }

    private fun settings(context: Context): JSONObject? =
        prefs(context).getString(KEY_SETTINGS, null)?.let { runCatching { JSONObject(it) }.getOrNull() }

    private fun word(context: Context, key: String, fallback: String): String {
        val raw = prefs(context).getString(KEY_WORDS, null) ?: return fallback
        return runCatching { JSONObject(raw).optString(key, fallback) }.getOrDefault(fallback).ifEmpty { fallback }
    }

    /** What one push of [group] does on this phone now. */
    private data class Sound(val sound: String, val ring: Boolean, val minutes: Int, val vibrate: Boolean, val alarm: Boolean)

    private fun soundFor(context: Context, group: String, data: Map<String, String>): Sound {
        val s = settings(context)
        if (s == null) {
            // Only the server's words for it (the app never configured this side).
            val sound = data["yb_sound"]?.takeIf { it == "default" || it == "silent" || it in ringtones } ?: defaults[group] ?: "default"
            return Sound(sound, data["yb_ring"] == "1" && sound != "silent", data["yb_ring_minutes"]?.toIntOrNull() ?: 3, true, false)
        }
        var sound = s.optJSONObject("sounds")?.optString(group, "")?.takeIf { it == "default" || it == "silent" || it in ringtones }
            ?: defaults[group] ?: "default"
        if (group != "orders" && inQuietHours(s.optJSONObject("quiet"))) sound = "silent"
        // 214 Ring by order value: the band of the order's total.
        if (group == "orders") soundByValue(s.optJSONArray("by_value"), data["order_value"]?.toDoubleOrNull())?.let { sound = it }
        val ringGroups = s.optJSONArray("ring")
        var ring = false
        if (ringGroups != null) for (i in 0 until ringGroups.length()) if (ringGroups.optString(i) == group) ring = true
        return Sound(
            sound = sound,
            ring = ring && sound != "silent" && (group == "orders" || group == "bookings"),
            minutes = s.optInt("ring_minutes", 3).coerceIn(1, 10),
            vibrate = s.optBoolean("vibrate", true),
            alarm = s.optBoolean("alarm_volume", false),
        )
    }

    /** 214 The sound of the band the value falls in (bands from 0, each above the one before), or null. */
    private fun soundByValue(bands: org.json.JSONArray?, value: Double?): String? {
        if (bands == null || value == null) return null
        var chosen: String? = null
        for (i in 0 until bands.length()) {
            val band = bands.optJSONObject(i) ?: continue
            if (value >= band.optDouble("from", Double.MAX_VALUE)) chosen = band.optString("sound")
        }
        return chosen?.takeIf { it == "default" || it == "silent" || it in ringtones }
    }

    private fun minutesOf(hhmm: String): Int? {
        val parts = hhmm.split(":")
        if (parts.size != 2) return null
        val h = parts[0].toIntOrNull() ?: return null
        val m = parts[1].toIntOrNull() ?: return null
        return h * 60 + m
    }

    private fun inQuietHours(quiet: JSONObject?): Boolean {
        if (quiet == null) return false
        val from = minutesOf(quiet.optString("from")) ?: return false
        val to = minutesOf(quiet.optString("to")) ?: return false
        val now = Calendar.getInstance()
        val at = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
        return if (from < to) at in from until to else at >= from || at < to
    }

    private fun channelId(group: String, sound: Sound): String =
        "yb_${group}_${sound.sound}_${if (sound.alarm) "a" else "n"}${if (sound.vibrate) "v" else "s"}_$CHANNEL_VERSION"

    private const val QUIET_CHANNEL = "yb_quiet_$CHANNEL_VERSION"

    private fun soundUri(context: Context, sound: String): Uri? = when (sound) {
        "silent" -> null
        "default" -> Settings.System.DEFAULT_NOTIFICATION_URI
        else -> Uri.parse("android.resource://${context.packageName}/raw/yb_ring_$sound")
    }

    private fun ensureChannel(context: Context, manager: NotificationManager, group: String, sound: Sound): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return ""
        val id = channelId(group, sound)
        if (manager.getNotificationChannel(id) != null) return id
        val name = word(context, "group_$group", group) + " · " + word(context, "sound_${sound.sound}", sound.sound)
        val channel = NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH)
        val usage = when {
            sound.alarm -> AudioAttributes.USAGE_ALARM
            group == "orders" || group == "bookings" -> AudioAttributes.USAGE_NOTIFICATION_RINGTONE
            else -> AudioAttributes.USAGE_NOTIFICATION
        }
        val uri = soundUri(context, sound.sound)
        if (uri == null) {
            channel.setSound(null, null)
        } else {
            channel.setSound(uri, AudioAttributes.Builder().setUsage(usage).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
        }
        channel.enableVibration(sound.vibrate)
        if (sound.vibrate) channel.vibrationPattern = longArrayOf(0, 400, 200, 400)
        channel.lockscreenVisibility = Notification.VISIBILITY_PRIVATE
        manager.createNotificationChannel(channel)
        return id
    }

    private fun ensureQuietChannel(context: Context, manager: NotificationManager): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return ""
        if (manager.getNotificationChannel(QUIET_CHANNEL) == null) {
            val channel = NotificationChannel(QUIET_CHANNEL, word(context, "quiet_channel", "Rang"), NotificationManager.IMPORTANCE_DEFAULT)
            channel.setSound(null, null)
            channel.enableVibration(false)
            manager.createNotificationChannel(channel)
        }
        return QUIET_CHANNEL
    }

    /** One notification per item: a second push about the same order takes its place. */
    private fun notificationId(data: Map<String, String>): Int {
        val keys = listOf(
            "order_id", "food_order_id", "market_order_id", "shipment_id", "ride_id", "appointment_id",
            "conversation_id", "inquiry_id", "question_id", "review_id", "complaint_id", "update_key",
        )
        val item = keys.firstOrNull { !data[it].isNullOrEmpty() }?.let { "$it:${data[it]}:${data["kind"]}" }
            ?: data["google.message_id"] ?: System.currentTimeMillis().toString()
        return item.hashCode() and 0x7fffffff
    }

    private fun openIntent(context: Context, id: Int, data: Map<String, String>, accept: Boolean = false): PendingIntent {
        val push = if (accept) data + ("yb_action" to "accept") else data
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_ID, id)
            putExtra(EXTRA_PUSH, JSONObject(push as Map<*, *>).toString())
        }
        return PendingIntent.getActivity(context, if (accept) id xor 0x5A5A else id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    /** 214 The kinds a notification can accept from: a shop's order and a food order (the app opens and accepts it). */
    private val acceptable = setOf("new_order", "new_food_order")

    /**
     * 214 A new order stays (ongoing) until it's opened or accepted, with
     * Accept (when the order can be) and Open; the app ends it when the
     * order is accepted there.
     */
    private fun orderActions(context: Context, b: Notification.Builder, id: Int, data: Map<String, String>) {
        if (data["yb_group"] != "orders") return
        b.setOngoing(true)
        if (data["kind"] in acceptable) {
            b.addAction(Notification.Action.Builder(null, word(context, "accept", "Accept"), openIntent(context, id, data, accept = true)).build())
        }
        b.addAction(Notification.Action.Builder(null, word(context, "open", "Open"), openIntent(context, id, data)).build())
    }

    /** 214 The order's notification goes (accepted or opened in the app). */
    fun cancelFor(context: Context, data: Map<String, String>) {
        val id = notificationId(data)
        forget(context, id)
        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(id)
    }

    private fun receiverIntent(context: Context, action: String, id: Int): PendingIntent {
        val intent = Intent(context, RingActionReceiver::class.java).apply {
            this.action = action
            putExtra(EXTRA_ID, id)
        }
        return PendingIntent.getBroadcast(context, id xor action.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    @Suppress("DEPRECATION")
    private fun builder(context: Context, channel: String): Notification.Builder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, channel) else Notification.Builder(context)

    private fun ringingIds(context: Context): MutableSet<String> =
        HashSet(prefs(context).getStringSet(KEY_RINGING, emptySet()) ?: emptySet())

    private fun saveRinging(context: Context, ids: Set<String>) {
        prefs(context).edit().putStringSet(KEY_RINGING, ids).apply()
    }

    /** Shows one push that came as data only; false when it isn't one of ours. */
    fun show(context: Context, data: Map<String, String>): Boolean {
        val title = data["yb_title"] ?: return false
        if (inFront) return true
        val body = data["yb_body"] ?: ""
        val group = data["yb_group"]?.takeIf { it in groups } ?: "other"
        val sound = soundFor(context, group, data)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = ensureChannel(context, manager, group, sound)
        val id = notificationId(data)
        @Suppress("DEPRECATION")
        val b = builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_yallapp)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setShowWhen(true)
            .setContentIntent(openIntent(context, id, data))
            .setDeleteIntent(receiverIntent(context, ACTION_DISMISSED, id))
            .setCategory(if (sound.ring) Notification.CATEGORY_ALARM else Notification.CATEGORY_MESSAGE)
            .setPriority(Notification.PRIORITY_HIGH)
            .setColor(0xFFE8572A.toInt())
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            @Suppress("DEPRECATION")
            b.setSound(soundUri(context, sound.sound))
            if (sound.vibrate) b.setVibrate(longArrayOf(0, 400, 200, 400))
        }
        if (sound.ring && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Never rings past the minutes chosen, even if the alarm below is late.
            b.setTimeoutAfter(sound.minutes * 60_000L + 5_000L)
        }
        orderActions(context, b, id, data)
        if (sound.ring) {
            b.addAction(Notification.Action.Builder(null, word(context, "silence", "Silence"), receiverIntent(context, ACTION_QUIET, id)).build())
        }
        val notification = b.build()
        if (sound.ring) {
            notification.flags = notification.flags or Notification.FLAG_INSISTENT
            val ids = ringingIds(context)
            ids.add(id.toString())
            saveRinging(context, ids)
            prefs(context).edit().putString("push_$id", JSONObject(data as Map<*, *>).toString()).apply()
            // At most the minutes chosen; then shown again without a sound.
            val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val at = System.currentTimeMillis() + sound.minutes * 60_000L
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, receiverIntent(context, ACTION_QUIET, id))
        }
        runCatching { manager.notify(id, notification) }
        return true
    }

    /** Stops one ringing notification and shows it again without a sound (it stays until opened). */
    fun quiet(context: Context, id: Int) {
        val ids = ringingIds(context)
        if (!ids.remove(id.toString())) return
        saveRinging(context, ids)
        val raw = prefs(context).getString("push_$id", null)
        prefs(context).edit().remove("push_$id").apply()
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val data = raw?.let { runCatching { toMap(JSONObject(it)) }.getOrNull() } ?: run {
            manager.cancel(id)
            return
        }
        val channel = ensureQuietChannel(context, manager)
        @Suppress("DEPRECATION")
        val quietBuilder = builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_yallapp)
            .setContentTitle(data["yb_title"] ?: "")
            .setContentText(data["yb_body"] ?: "")
            .setStyle(Notification.BigTextStyle().bigText(data["yb_body"] ?: ""))
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openIntent(context, id, data))
            .setColor(0xFFE8572A.toInt())
        orderActions(context, quietBuilder, id, data)
        val notification = quietBuilder.build()
        runCatching { manager.notify(id, notification) }
    }

    /** The notification was opened or swiped away: nothing to stop later. */
    fun forget(context: Context, id: Int) {
        val ids = ringingIds(context)
        if (ids.remove(id.toString())) saveRinging(context, ids)
        prefs(context).edit().remove("push_$id").apply()
    }

    /** The app came to the front: every ringing one goes quiet. */
    fun stopAll(context: Context) {
        for (id in ringingIds(context)) id.toIntOrNull()?.let { quiet(context, it) }
    }

    /** Settings › Ringtones › Test: a real notification of [group] now (shown even with the app in front). */
    fun test(context: Context, group: String, title: String, body: String): Boolean {
        val wasInFront = inFront
        inFront = false
        try {
            return show(context, mapOf("yb_title" to title, "yb_body" to body, "yb_group" to group, "kind" to "test", "google.message_id" to "test-$group"))
        } finally {
            inFront = wasInFront
        }
    }

    fun toMap(json: JSONObject): Map<String, String> {
        val out = HashMap<String, String>()
        val keys = json.keys()
        while (keys.hasNext()) {
            val k = keys.next()
            out[k] = json.optString(k)
        }
        return out
    }
}
