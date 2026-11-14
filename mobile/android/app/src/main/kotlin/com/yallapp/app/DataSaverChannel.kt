package com.yallapp.app

import android.content.Context
import android.net.ConnectivityManager
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel

/**
 * 129.4 Whether the person turned Data Saver on for this app
 * (lib/core/services/data_saver.dart): a Studio video banner doesn't play
 * by itself then.
 */
class DataSaverChannel(private val context: Context, messenger: BinaryMessenger) {
    init {
        MethodChannel(messenger, "yallapp/data_saver").setMethodCallHandler { call, result ->
            when (call.method) {
                "enabled" -> {
                    val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                    result.success(
                        connectivity != null &&
                            connectivity.isActiveNetworkMetered &&
                            connectivity.restrictBackgroundStatus == ConnectivityManager.RESTRICT_BACKGROUND_STATUS_ENABLED,
                    )
                }
                else -> result.notImplemented()
            }
        }
    }
}
