import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../config.dart';
import '../routing/paths.dart';

/// 59 Pushes to the owner's phone from Yallapp Business's own Firebase
/// project. Off (every method a no-op) in builds without Firebase options.
abstract class PushService {
  bool get available;
  Future<void> init();

  /// Asks for permission (iOS, Android 13+) and returns the token.
  Future<String?> token();
  Stream<String> get tokenRefreshes;

  /// The `data` of a push tapped while the app was in the background.
  Stream<Map<String, dynamic>> get opened;

  /// A push that arrived while the app is open.
  Stream<RemoteNotice> get foreground;

  /// The push that launched the app, if any.
  Future<Map<String, dynamic>?> initial();
}

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

/// Where a tapped push goes: the app it is about, and the screen.
class PushTarget {
  const PushTarget({required this.location, this.appId, this.kind});

  final String? appId;
  final String location;
  final String? kind;
}

/// Reads a push's data (`type: owner`, `kind`, `app_id` and the item's ID).
PushTarget pushTarget(Map<String, dynamic> data) {
  String? value(String key) {
    final v = '${data[key] ?? ''}'.trim();
    return v.isEmpty ? null : v;
  }

  int? id(String key) => int.tryParse(value(key) ?? '');
  final appId = value('app_id');
  final kind = value('kind');
  final order = id('order_id');
  final appointment = value('appointment_id');
  final inquiry = id('inquiry_id');
  // 63 A course question opens itself; a review, the Inbox's reviews.
  final question = id('question_id');
  final review = value('review_id');
  final location = order != null
      ? Paths.order(order)
      : appointment != null
      ? Paths.appointments
      : inquiry != null
      ? Paths.inquiry(inquiry)
      : question != null
      ? Paths.question(question)
      : review != null
      ? Paths.inboxTab('reviews')
      : value('build_id') != null
      ? Paths.builds
      : value('donation_id') != null
      ? Paths.donations
      : value('update_key') != null
      ? Paths.updates
      : switch (kind) {
          'new_order' => Paths.orders,
          'new_booking' => Paths.appointments,
          'new_message' || 'new_review' => Paths.inbox,
          'build_finished' => Paths.builds,
          'yallapp_updates' || 'account_notices' => Paths.updates,
          'payment_received' => Paths.updates,
          _ => Paths.today,
        };
  return PushTarget(location: location, appId: appId, kind: kind);
}

class NoPushService implements PushService {
  const NoPushService();

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
          iosBundleId: 'tr.com.yallapp.business',
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
