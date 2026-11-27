import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';

/// 232 Yallapp Community's Firebase project: the options of its Android and
/// iOS apps, from dart-defines (`YC_FIREBASE_*`). Firebase's client keys are
/// public by design, but no config file is kept in the repository; a build
/// without them simply has no push.
class FirebaseConfig {
  const FirebaseConfig({
    required this.projectId,
    required this.senderId,
    required this.apiKey,
    required this.appId,
  });

  static FirebaseConfig? fromEnvironment() {
    const projectId = String.fromEnvironment('YC_FIREBASE_PROJECT_ID');
    const senderId = String.fromEnvironment('YC_FIREBASE_SENDER_ID');
    final ios = defaultTargetPlatform == TargetPlatform.iOS;
    final apiKey = ios
        ? const String.fromEnvironment('YC_FIREBASE_API_KEY_IOS')
        : const String.fromEnvironment('YC_FIREBASE_API_KEY_ANDROID');
    final appId = ios
        ? const String.fromEnvironment('YC_FIREBASE_APP_ID_IOS')
        : const String.fromEnvironment('YC_FIREBASE_APP_ID_ANDROID');
    if ([projectId, senderId, apiKey, appId].any((v) => v.trim().isEmpty)) {
      return null;
    }
    return FirebaseConfig(
      projectId: projectId,
      senderId: senderId,
      apiKey: apiKey,
      appId: appId,
    );
  }

  final String projectId;
  final String senderId;
  final String apiKey;
  final String appId;
}

/// A push that arrived while the app is open.
class RemoteNotice {
  const RemoteNotice({
    required this.title,
    required this.body,
    required this.data,
  });

  final String title;
  final String body;
  final Map<String, dynamic> data;
}

/// Pushes to the member's phone. Off (every call answers nothing) in a
/// build without Firebase options, and in tests.
abstract class PushService {
  bool get available;
  Future<void> init();

  /// Asks for permission (iOS, Android 13+) and answers the device token.
  Future<String?> token();
  Stream<String> get tokenRefreshes;

  /// The data of a push tapped while the app was in the background.
  Stream<Map<String, dynamic>> get opened;

  /// A push that arrived while the app is open.
  Stream<RemoteNotice> get foreground;

  /// The push that launched the app, if any.
  Future<Map<String, dynamic>?> initial();
}

class FirebasePushService implements PushService {
  FirebasePushService(this._config);

  final FirebaseConfig _config;
  bool _ready = false;

  @override
  bool get available => _ready;

  @override
  Future<void> init() async {
    try {
      await Firebase.initializeApp(
        options: FirebaseOptions(
          apiKey: _config.apiKey,
          appId: _config.appId,
          messagingSenderId: _config.senderId,
          projectId: _config.projectId,
          iosBundleId: 'tr.com.yallapp.community',
        ),
      );
      await FirebaseMessaging.instance
          .setForegroundNotificationPresentationOptions(
            alert: false,
            badge: true,
            sound: false,
          );
      _ready = true;
    } on Object catch (e) {
      debugPrint('Push is off: $e');
    }
  }

  @override
  Future<String?> token() async {
    if (!_ready) return null;
    try {
      final settings = await FirebaseMessaging.instance.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        return null;
      }
      return await FirebaseMessaging.instance.getToken();
    } on Object {
      return null;
    }
  }

  @override
  Stream<String> get tokenRefreshes =>
      _ready ? FirebaseMessaging.instance.onTokenRefresh : const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get opened => _ready
      ? FirebaseMessaging.onMessageOpenedApp.map((m) => m.data)
      : const Stream.empty();

  @override
  Stream<RemoteNotice> get foreground => _ready
      ? FirebaseMessaging.onMessage.map(
          (m) => RemoteNotice(
            title: m.notification?.title ?? '',
            body: m.notification?.body ?? '',
            data: m.data,
          ),
        )
      : const Stream.empty();

  @override
  Future<Map<String, dynamic>?> initial() async {
    if (!_ready) return null;
    try {
      return (await FirebaseMessaging.instance.getInitialMessage())?.data;
    } on Object {
      return null;
    }
  }
}

/// For tests and the demo: [deliver] and [tap] stand for Firebase.
class FakePushService implements PushService {
  FakePushService({this.deviceToken = 'demo-push-token', this.launch});

  final String? deviceToken;
  final Map<String, dynamic>? launch;
  final _opened = StreamController<Map<String, dynamic>>.broadcast();
  final _foreground = StreamController<RemoteNotice>.broadcast();
  final _refreshes = StreamController<String>.broadcast();

  @override
  bool get available => true;

  @override
  Future<void> init() async {}

  @override
  Future<String?> token() async => deviceToken;

  @override
  Stream<String> get tokenRefreshes => _refreshes.stream;

  @override
  Stream<Map<String, dynamic>> get opened => _opened.stream;

  @override
  Stream<RemoteNotice> get foreground => _foreground.stream;

  @override
  Future<Map<String, dynamic>?> initial() async => launch;

  void tap(Map<String, dynamic> data) => _opened.add(data);
  void deliver(RemoteNotice notice) => _foreground.add(notice);
  void refresh(String token) => _refreshes.add(token);
}

final pushServiceProvider = Provider<PushService>((ref) {
  if (ref.watch(configProvider).demo) return FakePushService();
  final config = FirebaseConfig.fromEnvironment();
  return config == null ? _NoPush() : FirebasePushService(config);
});

/// A build without Firebase options.
class _NoPush implements PushService {
  @override
  bool get available => false;
  @override
  Future<void> init() async {}
  @override
  Future<String?> token() async => null;
  @override
  Stream<String> get tokenRefreshes => const Stream.empty();
  @override
  Stream<Map<String, dynamic>> get opened => const Stream.empty();
  @override
  Stream<RemoteNotice> get foreground => const Stream.empty();
  @override
  Future<Map<String, dynamic>?> initial() async => null;
}
