import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api/api_exception.dart';
import 'api/fake_owner_api.dart';
import 'api/http_owner_api.dart';
import 'api/models.dart';
import 'api/owner_api.dart';
import 'auth/token_manager.dart';
import 'auth/token_store.dart';
import 'config.dart';
import 'services/biometrics.dart';
import 'services/chime.dart';
import 'services/device.dart';
import 'services/links.dart';
import 'services/media_picker.dart';
import 'services/push.dart';
import 'services/settings.dart';
import 'session.dart';

/// 59 The app's wiring. `main.dart` overrides the first ones with the real
/// services; the widget tests with fakes.

final configProvider = Provider<AppConfig>(
  (ref) => AppConfig.fromEnvironment(),
);

final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('Overridden in main()'),
);

final settingsProvider = Provider<LocalSettings>(
  (ref) => LocalSettings(ref.watch(sharedPreferencesProvider)),
);

final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());

final biometricsProvider = Provider<Biometrics>((ref) => LocalBiometrics());

final pushServiceProvider = Provider<PushService>(
  (ref) => const NoPushService(),
);

final openExternalProvider = Provider<OpenExternal>((ref) => openExternal);

final chimeProvider = Provider<Chime>((ref) => AssetChime());

final mediaPickerProvider = Provider<MediaPicker>(
  (ref) => ImagePickerMediaPicker(),
);

final deviceInfoProvider = Provider<Future<DeviceInfo> Function()>(
  (ref) => loadDeviceInfo,
);

final appVersionProvider = FutureProvider<String>((ref) => loadAppVersion());

/// The demo's in-memory API (also what the tests use).
final fakeApiProvider = Provider<FakeOwnerApi>((ref) => FakeOwnerApi());

final Provider<TokenManager> tokenManagerProvider = Provider<TokenManager>((
  ref,
) {
  final manager = TokenManager(
    store: ref.watch(tokenStoreProvider),
    refresh: (token) => ref.read(apiProvider).refresh(token),
  );
  ref.onDispose(manager.dispose);
  return manager;
});

final Provider<OwnerApi> apiProvider = Provider<OwnerApi>((ref) {
  final config = ref.watch(configProvider);
  if (config.demo) return ref.watch(fakeApiProvider);
  return HttpOwnerApi(
    baseUrl: config.apiBaseUrl,
    language: () => ref.read(languageCodeProvider),
    tokens: ref.watch(tokenManagerProvider),
    // A data call answered 403 account_pending or account_suspended: load
    // the account again, which shows its state.
    onAccountBlocked: (_) => ref.read(sessionProvider.notifier).refreshMe(),
  );
});

final uploadTransportProvider = Provider<UploadTransport>((ref) {
  final config = ref.watch(configProvider);
  if (config.demo) return ref.watch(fakeApiProvider).transport;
  return HttpUploadTransport();
});

const supportedLanguages = ['en', 'ar', 'tr'];

/// The language picked in Settings (or on the sign-in screen); null follows
/// the phone.
class LanguageController extends Notifier<String?> {
  @override
  String? build() => ref.watch(settingsProvider).language;

  void set(String? code) {
    state = supportedLanguages.contains(code) ? code : null;
    ref.read(settingsProvider).setLanguage(state);
  }
}

final languageProvider = NotifierProvider<LanguageController, String?>(
  LanguageController.new,
);

/// The language the app shows: the choice, else the phone's when it's one
/// of ours, else English.
final languageCodeProvider = Provider<String>((ref) {
  final chosen = ref.watch(languageProvider);
  if (chosen != null) return chosen;
  final device = PlatformDispatcher.instance.locale.languageCode;
  return supportedLanguages.contains(device) ? device : 'en';
});

final localeProvider = Provider<Locale>(
  (ref) => Locale(ref.watch(languageCodeProvider)),
);

/// Shows errors as text the owner can act on.
String errorText(Object error, String Function(String code) local) {
  final e = unwrapError(error);
  if (e is ApiException) {
    if (e.message.isNotEmpty && !e.isOffline) return e.message;
    return local(e.code);
  }
  return local(ApiException.serverError);
}
