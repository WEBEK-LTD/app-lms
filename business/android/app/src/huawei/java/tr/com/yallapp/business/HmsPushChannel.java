package tr.com.yallapp.business;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import tr.com.yallapp.business.hms.HmsPush;

import java.util.HashMap;
import java.util.Map;

import io.flutter.embedding.engine.FlutterEngine;
import io.flutter.plugin.common.EventChannel;
import io.flutter.plugin.common.MethodChannel;

/**
 * 65 The Dart side's channel to Huawei Push Kit (lib/core/services/hms_push.dart,
 * HmsPushBridge), as the customers' app's (36). Compiled only into builds with
 * agconnect-services.json (app/build.gradle.kts); MainActivity finds it by name.
 *
 * Methods on "yallapp_business/hms_push": availability, token {appId}, initialMessage.
 * Events on "yallapp_business/hms_push/events": {type: token, token} and {type: opened, data}.
 */
public final class HmsPushChannel {
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final String NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";
    private static EventChannel.EventSink sink;
    private static Map<String, Object> initial;

    private HmsPushChannel() {}

    public static void attach(Activity activity, FlutterEngine engine) {
        initial = extras(activity.getIntent());
        MethodChannel methods = new MethodChannel(engine.getDartExecutor().getBinaryMessenger(), "yallapp_business/hms_push");
        methods.setMethodCallHandler((call, result) -> {
            switch (call.method) {
                case "availability":
                    result.success(HmsPush.availability(activity.getApplicationContext()));
                    break;
                case "token": {
                    String appId = call.argument("appId");
                    askForNotifications(activity);
                    // getToken blocks: off the main thread, answered on it.
                    new Thread(() -> {
                        String token;
                        try {
                            token = HmsPush.token(activity.getApplicationContext(), appId);
                        } catch (Exception e) {
                            token = null;
                        }
                        String answer = token;
                        MAIN.post(() -> result.success(answer));
                    }).start();
                    break;
                }
                case "initialMessage": {
                    // Once: the push that launched the app.
                    Map<String, Object> data = initial;
                    initial = null;
                    result.success(data);
                    break;
                }
                default:
                    result.notImplemented();
            }
        });
        new EventChannel(engine.getDartExecutor().getBinaryMessenger(), "yallapp_business/hms_push/events").setStreamHandler(new EventChannel.StreamHandler() {
            @Override
            public void onListen(Object arguments, EventChannel.EventSink events) {
                sink = events;
            }

            @Override
            public void onCancel(Object arguments) {
                sink = null;
            }
        });
        HmsPush.setListener(token -> MAIN.post(() -> {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "token");
            event.put("token", token);
            send(event);
        }));
    }

    /**
     * Android 13 and later show notifications only with this permission
     * (Firebase's plugin asks for it on Google phones; here nothing else
     * would). The token doesn't wait for the answer.
     */
    private static void askForNotifications(Activity activity) {
        if (Build.VERSION.SDK_INT < 33) return;
        if (activity.checkSelfPermission(NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        activity.requestPermissions(new String[] {NOTIFICATIONS}, 6501);
    }

    /** A push tapped while the app was running. */
    public static void onNewIntent(Intent intent) {
        Map<String, Object> data = extras(intent);
        if (data == null) return;
        Map<String, Object> event = new HashMap<>();
        event.put("type", "opened");
        event.put("data", data);
        send(event);
    }

    private static void send(Map<String, Object> event) {
        if (sink != null) sink.success(event);
    }

    /** The intent's string extras: a Push Kit notification's data. Null without any. */
    private static Map<String, Object> extras(Intent intent) {
        Bundle bundle = intent == null ? null : intent.getExtras();
        if (bundle == null) return null;
        Map<String, Object> data = new HashMap<>();
        for (String key : bundle.keySet()) {
            Object value = bundle.get(key);
            if (value instanceof String) data.put(key, value);
        }
        return data.isEmpty() ? null : data;
    }
}
