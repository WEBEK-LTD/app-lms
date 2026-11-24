import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api/api_client.dart';
import 'api/community_api.dart';
import 'api/fake_community_api.dart';
import 'api/json.dart';
import 'api/models.dart';
import 'auth/social_sign_in.dart';
import 'config.dart';

/// The app's wiring. `main.dart` overrides [sharedPreferencesProvider]; the
/// widget tests override the API, the token store and the sign-in providers
/// with fakes.

final configProvider = Provider<AppConfig>(
  (ref) => AppConfig.fromEnvironment(),
);

final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('Overridden in main()'),
);

/// The three languages; English is the default, whatever the phone's.
const supportedLanguages = ['en', 'ar', 'tr'];

/// The language picked (on the welcome screen or in Settings), English
/// until then.
class LanguageController extends Notifier<String> {
  static const _key = 'community.language';

  @override
  String build() {
    final saved = ref.watch(sharedPreferencesProvider).getString(_key);
    return supportedLanguages.contains(saved) ? saved! : 'en';
  }

  void set(String code) {
    if (!supportedLanguages.contains(code)) return;
    state = code;
    ref.read(sharedPreferencesProvider).setString(_key, code);
  }
}

final languageProvider = NotifierProvider<LanguageController, String>(
  LanguageController.new,
);

/// Light or dark: the phone's until picked in the menu or Settings.
class ThemeModeController extends Notifier<ThemeMode> {
  static const _key = 'community.theme';

  @override
  ThemeMode build() =>
      switch (ref.watch(sharedPreferencesProvider).getString(_key)) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      };

  void set(ThemeMode mode) {
    state = mode;
    final prefs = ref.read(sharedPreferencesProvider);
    switch (mode) {
      case ThemeMode.light:
        prefs.setString(_key, 'light');
      case ThemeMode.dark:
        prefs.setString(_key, 'dark');
      case ThemeMode.system:
        prefs.remove(_key);
    }
  }
}

final themeModeProvider = NotifierProvider<ThemeModeController, ThemeMode>(
  ThemeModeController.new,
);

/// Where the session's tokens live between launches.
abstract class TokenStore {
  Future<Session?> read();
  Future<void> write(Session session);
  Future<void> clear();
}

/// The phone's keychain (iOS) or encrypted storage (Android).
class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'yallapp_community.session';
  final FlutterSecureStorage _storage;

  @override
  Future<Session?> read() async {
    try {
      final raw = await _storage.read(key: _key);
      return raw == null ? null : Session.fromJson(asJson(jsonDecode(raw)));
    } on Object {
      return null;
    }
  }

  @override
  Future<void> write(Session session) =>
      _storage.write(key: _key, value: jsonEncode(session.toJson()));

  @override
  Future<void> clear() => _storage.delete(key: _key);
}

/// For tests and the demo.
class MemoryTokenStore implements TokenStore {
  MemoryTokenStore([this.session]);

  Session? session;

  @override
  Future<Session?> read() async => session;

  @override
  Future<void> write(Session session) async => this.session = session;

  @override
  Future<void> clear() async => session = null;
}

final tokenStoreProvider = Provider<TokenStore>(
  (ref) =>
      ref.watch(configProvider).demo ? MemoryTokenStore() : SecureTokenStore(),
);

/// The access token of this launch (kept in memory for every call).
class AccessToken extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String? token) => state = token;
}

final accessTokenProvider = NotifierProvider<AccessToken, String?>(
  AccessToken.new,
);

/// The one HTTP client (lib/core/api/api_client.dart): every feature's API is
/// built on it.
final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(baseUrl: ref.watch(configProvider).apiBaseUrl);
  client.token = () => ref.read(accessTokenProvider);
  client.language = () => ref.read(languageProvider);
  return client;
});

final communityApiProvider = Provider<CommunityApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeCommunityApi()
      : HttpCommunityApi(ref.watch(apiClientProvider)),
);

/// Sign in with Apple and Google (each provider's own sheet).
final appleSignInProvider = Provider<SocialSignIn>(
  (ref) => ref.watch(configProvider).demo
      ? const FakeSocialSignIn('demo-apple')
      : AppleSignIn(),
);
final googleSignInProvider = Provider<SocialSignIn>(
  (ref) => ref.watch(configProvider).demo
      ? const FakeSocialSignIn('demo-google')
      : GoogleSignIn(ref.watch(configProvider)),
);

/// Opens a page outside the app (the website, a linked app).
typedef OpenExternal = Future<bool> Function(Uri uri);

final openExternalProvider = Provider<OpenExternal>(
  (ref) => (uri) async {
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } on Object {
      return false;
    }
  },
);
