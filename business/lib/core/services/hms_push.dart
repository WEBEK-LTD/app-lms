import 'dart:async';
import 'dart:convert';

import 'package:flutter/services.dart';

import '../config.dart';
import 'push.dart';

/// 65 Which push services an Android phone has.
typedef PushAvailability = ({bool googlePlay, bool huawei});

/// 65 Which service a phone's pushes go through, or null for none: Firebase
/// on iPhones and on Android phones with Google Play services, and Huawei
/// Push Kit on Android phones without them that have Huawei Mobile Services,
/// when the build has Huawei push. As the customers' app (36). Pure.
PushProvider? choosePushProvider({
  required bool android,
  required bool hasFirebase,
  required bool hasHuawei,
  required PushAvailability availability,
}) {
  if (android && hasHuawei && !availability.googlePlay && availability.huawei) {
    return PushProvider.hms;
  }
  return hasFirebase ? PushProvider.fcm : null;
}

/// 65 The push service for this phone, picked at start-up: Huawei Push Kit
/// when [choosePushProvider] says so, else Firebase as before (or none).
/// Asks the phone only in Android builds with Huawei push.
Future<PushService> choosePushService(
  AppConfig config, {
  required bool android,
  HmsPushBridge bridge = const HmsPushBridge(),
}) async {
  if (config.demo) return const NoPushService();
  final firebase = config.firebase;
  final appId = config.hmsAppId;
  if (android && appId != null) {
    final provider = choosePushProvider(
      android: android,
      hasFirebase: firebase != null,
      hasHuawei: true,
      availability: await bridge.availability(),
    );
    if (provider == PushProvider.hms) return HmsPushService(bridge, appId);
  }
  return firebase == null
      ? const NoPushService()
      : FirebasePushService(firebase);
}

/// 65 The app's own channel to Huawei's push SDK (`android/hms_push`), which
/// the Android build has only with agconnect-services.json
/// (`tool/hms_config.dart`). Without it every call answers as if the phone
/// had no Huawei services. The same channel as the customers' app (36).
class HmsPushBridge {
  const HmsPushBridge({
    this.channel = const MethodChannel('yallapp_business/hms_push'),
    this.eventChannel = const EventChannel('yallapp_business/hms_push/events'),
  });

  final MethodChannel channel;
  final EventChannel eventChannel;

  /// Google Play services and Huawei Mobile Services on this phone. When the
  /// question can't be answered, Google Play is assumed (Firebase, as before).
  Future<PushAvailability> availability() async {
    try {
      final status = await channel.invokeMapMethod<String, Object?>(
        'availability',
      );
      return (
        googlePlay: status?['googlePlay'] != false,
        huawei: status?['huawei'] == true,
      );
    } on MissingPluginException {
      return (googlePlay: true, huawei: false);
    } on PlatformException {
      return (googlePlay: true, huawei: false);
    }
  }

  /// A Push Kit token for the app, or null (it may then come as an event).
  /// Also asks for the notification permission (Android 13 and later).
  Future<String?> token(String appId) async {
    try {
      final token = await channel.invokeMethod<String>('token', {
        'appId': appId,
      });
      return token == null || token.isEmpty ? null : token;
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    }
  }

  /// The data of the notification that opened the app, if any.
  Future<Map<String, dynamic>?> initialMessage() async {
    try {
      final data = await channel.invokeMapMethod<String, Object?>(
        'initialMessage',
      );
      final message = data == null ? null : messageData(data);
      // Only a push of ours: the launch may carry other extras.
      return message != null && message.containsKey('type') ? message : null;
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    }
  }

  /// New tokens (`{"type": "token", "token": …}`) and tapped notifications
  /// (`{"type": "opened", "data": {…}}`) while the app runs.
  Stream<Map<String, Object?>> get events => eventChannel
      .receiveBroadcastStream()
      .where((event) => event is Map)
      .map((event) => Map<String, Object?>.from(event as Map))
      .handleError((Object _) {});

  /// A push's data with string values, as Firebase gives them. Push Kit may
  /// send the data as one JSON string, under `data`. Pure.
  static Map<String, dynamic> messageData(Map<Object?, Object?> raw) {
    final data = <String, dynamic>{};
    for (final entry in raw.entries) {
      final key = '${entry.key}';
      if (key.startsWith('_') || key.startsWith('android.')) continue;
      final value = entry.value;
      if (key == 'data' && value is String && value.trim().startsWith('{')) {
        try {
          final decoded = jsonDecode(value);
          if (decoded is Map) {
            for (final inner in decoded.entries) {
              data['${inner.key}'] = '${inner.value}';
            }
            continue;
          }
        } on FormatException {
          // Not JSON: kept as it is below.
        }
      }
      data[key] = '$value';
    }
    return data;
  }
}

/// 65 Pushes through Huawei Push Kit, on Huawei phones without Google Play.
/// Huawei's system shows them, also while the app is open (so nothing comes
/// on [foreground]); tapping one opens the app with its data.
class HmsPushService implements PushService {
  HmsPushService(this._bridge, this._appId);

  final HmsPushBridge _bridge;
  final String _appId;
  bool _ready = false;

  @override
  bool get available => _ready;

  @override
  PushProvider get provider => PushProvider.hms;

  @override
  Future<void> init() async {
    _ready = (await _bridge.availability()).huawei;
  }

  @override
  Future<String?> token() async => _ready ? _bridge.token(_appId) : null;

  @override
  Stream<String> get tokenRefreshes => _ready
      ? _bridge.events
            .where((e) => e['type'] == 'token' && e['token'] is String)
            .map((e) => e['token']! as String)
      : const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get opened => _ready
      ? _bridge.events
            .where((e) => e['type'] == 'opened' && e['data'] is Map)
            .map((e) => HmsPushBridge.messageData(e['data']! as Map))
            .where((data) => data.containsKey('type'))
      : const Stream.empty();

  @override
  Stream<RemoteNotice> get foreground => const Stream.empty();

  @override
  Future<Map<String, dynamic>?> initial() async =>
      _ready ? _bridge.initialMessage() : null;
}
