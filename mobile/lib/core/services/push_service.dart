import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';
import '../config/build_config.dart';
import '../routing/paths.dart';

/// Push notifications through Firebase Cloud Messaging, or (36) Huawei Push
/// Kit on Huawei phones without Google Play services.
///
/// Active only when the build config listed the client's Firebase files
/// (`tool/apply_config.dart` turns them into [FirebaseOptionsData]), or for
/// Huawei its agconnect-services.json. Otherwise every method is a no-op.
abstract class PushService {
  bool get isAvailable;

  /// Where the tokens are from; sent with them to the site.
  PushProvider get provider;

  /// Initialises Firebase. Safe to call when push is off.
  Future<void> init();

  /// Asks for permission (iOS, Android 13+) and returns the FCM token.
  Future<String?> token();

  /// New tokens after rotation.
  Stream<String> get tokenRefreshes;

  /// The `data` of notifications the student taps while the app runs in
  /// the background.
  Stream<Map<String, dynamic>> get openedMessages;

  /// The `data` of the notification that launched the app, if any.
  Future<Map<String, dynamic>?> initialMessage();
}

/// Where tapping a notification goes, from its `data`:
/// - `new_lesson` opens the lesson;
/// - `enrolled`, or `announcement` with a course, opens the course;
/// - `article` (breaking news, 23) opens the article;
/// - 26 one with an `order_id` (a restaurant's order moved on) opens the order;
/// - `event` (a change to an event the user holds tickets to, 28) opens it;
/// - `campaign_update` (29) opens the campaign;
/// - anything else opens Home.
String pushTargetLocation(Map<String, dynamic> data) {
  int? id(String key) => int.tryParse('${data[key] ?? ''}'.trim());
  final type = data['type'];
  final course = id('course_id');
  final order = id('order_id');
  if (order != null) return Paths.order(order);
  switch (type) {
    case 'new_lesson':
      final lesson = id('lesson_id');
      if (lesson != null) return Paths.lesson(lesson);
      if (course != null) return Paths.course(course);
    case 'qna_answer':
      final question = id('question_id');
      if (question != null) return Paths.question(question);
      if (course != null) return Paths.course(course);
    case 'enrolled':
    case 'announcement':
      if (course != null) return Paths.course(course);
    case 'article':
      final article = '${data['article_id'] ?? ''}'.trim();
      if (article.isNotEmpty) return Paths.article(article);
    case 'event':
      final event = id('event_id');
      if (event != null) return Paths.event(event);
    case 'campaign_update':
      final campaign = id('campaign_id');
      if (campaign != null) return Paths.campaign(campaign);
  }
  return Paths.home;
}

class NoopPushService implements PushService {
  const NoopPushService();

  @override
  bool get isAvailable => false;

  @override
  PushProvider get provider => PushProvider.fcm;

  @override
  Future<void> init() async {}

  @override
  Future<String?> token() async => null;

  @override
  Stream<String> get tokenRefreshes => const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get openedMessages => const Stream.empty();

  @override
  Future<Map<String, dynamic>?> initialMessage() async => null;
}

class FirebasePushService implements PushService {
  FirebasePushService(this._options);

  final FirebaseOptionsData _options;
  bool _ready = false;

  @override
  bool get isAvailable => _ready;

  @override
  PushProvider get provider => PushProvider.fcm;

  @override
  Future<void> init() async {
    try {
      await Firebase.initializeApp(
        options: FirebaseOptions(
          apiKey: _options.apiKey,
          appId: _options.appId,
          messagingSenderId: _options.messagingSenderId,
          projectId: _options.projectId,
          storageBucket: _options.storageBucket,
          iosBundleId: _options.iosBundleId,
        ),
      );
      _ready = true;
    } on Object catch (e) {
      debugPrint('Push notifications are off: $e');
      _ready = false;
    }
  }

  @override
  Future<String?> token() async {
    if (!_ready) return null;
    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        return null;
      }
      return await messaging.getToken();
    } on Object {
      return null;
    }
  }

  @override
  Stream<String> get tokenRefreshes =>
      _ready ? FirebaseMessaging.instance.onTokenRefresh : const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get openedMessages => _ready
      ? FirebaseMessaging.onMessageOpenedApp.map((m) => m.data)
      : const Stream.empty();

  @override
  Future<Map<String, dynamic>?> initialMessage() async {
    if (!_ready) return null;
    try {
      return (await FirebaseMessaging.instance.getInitialMessage())?.data;
    } on Object {
      return null;
    }
  }
}

/// Picks the Firebase push service for this platform from the build config.
PushService createPushService(BuildConfigData build, DevicePlatform platform) {
  final options = platform == DevicePlatform.ios
      ? build.firebaseIos
      : build.firebaseAndroid;
  if (options == null) return const NoopPushService();
  return FirebasePushService(options);
}

/// 36 Which push services an Android phone has.
typedef PushAvailability = ({bool googlePlay, bool huawei});

/// 36 Which service a device's push goes through, or null for none:
/// Firebase on iPhones and on Android phones with Google Play services, and
/// Huawei Push Kit on Android phones without them that have Huawei Mobile
/// Services, when the build includes Huawei push. Pure.
PushProvider? choosePushProvider({
  required DevicePlatform platform,
  required bool hasFirebase,
  required bool hasHuawei,
  required PushAvailability availability,
}) {
  if (platform == DevicePlatform.android &&
      hasHuawei &&
      !availability.googlePlay &&
      availability.huawei) {
    return PushProvider.hms;
  }
  return hasFirebase ? PushProvider.fcm : null;
}

/// 36 Picks the push service at start-up: Huawei Push Kit when
/// [choosePushProvider] says so, else Firebase as before.
Future<PushService> choosePushService(
  BuildConfigData build,
  DevicePlatform platform, {
  HmsPushBridge bridge = const HmsPushBridge(),
}) async {
  final appId = build.huaweiAppId;
  if (platform == DevicePlatform.android && appId != null) {
    final provider = choosePushProvider(
      platform: platform,
      hasFirebase: build.firebaseAndroid != null,
      hasHuawei: true,
      availability: await bridge.availability(),
    );
    if (provider == PushProvider.hms) return HmsPushService(bridge, appId);
  }
  return createPushService(build, platform);
}

/// 36 The app's own channel to Huawei's push SDK (android/hms_push), which
/// the Android build includes only with the client's agconnect-services.json.
/// Without it every call answers as if the phone had no Huawei services.
class HmsPushBridge {
  const HmsPushBridge({
    this.channel = const MethodChannel('yallapp/hms_push'),
    this.eventChannel = const EventChannel('yallapp/hms_push/events'),
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
      // Only a notification of ours: the launch may carry other extras.
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

  /// A notification's data with string values, as FCM gives them. Push Kit
  /// may send the data as one JSON string, under `data`. Pure.
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

/// 36 Push through Huawei Push Kit, on Huawei phones without Google Play.
class HmsPushService implements PushService {
  HmsPushService(this._bridge, this._appId);

  final HmsPushBridge _bridge;
  final String _appId;
  bool _ready = false;

  @override
  bool get isAvailable => _ready;

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
  Stream<Map<String, dynamic>> get openedMessages => _ready
      ? _bridge.events
            .where((e) => e['type'] == 'opened' && e['data'] is Map)
            .map((e) => HmsPushBridge.messageData(e['data']! as Map))
            .where((data) => data.containsKey('type'))
      : const Stream.empty();

  @override
  Future<Map<String, dynamic>?> initialMessage() async =>
      _ready ? _bridge.initialMessage() : null;
}

/// Must be overridden with the instance created at start-up.
final pushServiceProvider = Provider<PushService>(
  (ref) => const NoopPushService(),
);
