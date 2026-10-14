import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';
import '../config/build_config.dart';
import '../routing/paths.dart';

/// Push notifications through Firebase Cloud Messaging.
///
/// Active only when the build config listed the client's Firebase files
/// (`tool/apply_config.dart` turns them into [FirebaseOptionsData]).
/// Otherwise every method is a no-op.
abstract class PushService {
  bool get isAvailable;

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
/// - anything else opens Home.
String pushTargetLocation(Map<String, dynamic> data) {
  int? id(String key) => int.tryParse('${data[key] ?? ''}'.trim());
  final type = data['type'];
  final course = id('course_id');
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
  }
  return Paths.home;
}

class NoopPushService implements PushService {
  const NoopPushService();

  @override
  bool get isAvailable => false;

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

/// Picks the push service for this platform from the build config.
PushService createPushService(BuildConfigData build, DevicePlatform platform) {
  final options = platform == DevicePlatform.ios
      ? build.firebaseIos
      : build.firebaseAndroid;
  if (options == null) return const NoopPushService();
  return FirebasePushService(options);
}

/// Must be overridden with the instance created at start-up.
final pushServiceProvider = Provider<PushService>(
  (ref) => const NoopPushService(),
);
