import 'package:flutter/foundation.dart';

/// 59 How this build of Yallapp Business is set up, from `--dart-define`s
/// (or `--dart-define-from-file=config/firebase.json`). Nothing here is a
/// secret: Firebase's client keys are public by design.
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.websiteUrl,
    this.demo = false,
    this.firebase,
  });

  factory AppConfig.fromEnvironment() {
    const api = String.fromEnvironment(
      'YB_API_URL',
      defaultValue: 'https://yallapp.com.tr/api/owner/v1',
    );
    const website = String.fromEnvironment(
      'YB_WEBSITE_URL',
      defaultValue: 'https://yallapp.com.tr',
    );
    return AppConfig(
      apiBaseUrl: _trim(api),
      websiteUrl: _trim(website),
      demo: const bool.fromEnvironment('YB_DEMO'),
      firebase: FirebaseConfig.fromEnvironment(),
    );
  }

  /// The Owner API (docs/api/owner.yaml), without a trailing slash.
  final String apiBaseUrl;

  /// yallapp.com.tr: the website, the dashboard and the legal pages.
  final String websiteUrl;

  /// Runs on the in-memory API with sample apps (`--dart-define=YB_DEMO=true`).
  final bool demo;

  /// Push notifications; null when this build has no Firebase options.
  final FirebaseConfig? firebase;

  /// A page of the website in the person's language (`/ar/…`, `/tr/…`).
  String websitePage(String path, String language) {
    final prefix = language == 'en' ? '' : '/$language';
    if (path == '/') return prefix.isEmpty ? websiteUrl : '$websiteUrl$prefix';
    return '$websiteUrl$prefix$path';
  }

  static String _trim(String url) {
    var value = url.trim();
    while (value.endsWith('/')) {
      value = value.substring(0, value.length - 1);
    }
    return value;
  }
}

/// The Firebase project of Yallapp Business (not a client's): the options
/// of its Android and iOS apps.
class FirebaseConfig {
  const FirebaseConfig({
    required this.projectId,
    required this.senderId,
    required this.apiKey,
    required this.appId,
  });

  static FirebaseConfig? fromEnvironment() {
    const projectId = String.fromEnvironment('YB_FIREBASE_PROJECT_ID');
    const senderId = String.fromEnvironment('YB_FIREBASE_SENDER_ID');
    final ios = defaultTargetPlatform == TargetPlatform.iOS;
    final apiKey = ios
        ? const String.fromEnvironment('YB_FIREBASE_API_KEY_IOS')
        : const String.fromEnvironment('YB_FIREBASE_API_KEY_ANDROID');
    final appId = ios
        ? const String.fromEnvironment('YB_FIREBASE_APP_ID_IOS')
        : const String.fromEnvironment('YB_FIREBASE_APP_ID_ANDROID');
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
