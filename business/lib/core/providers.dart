import 'dart:async';
import 'dart:convert';

import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/foundation.dart' show mapEquals;
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
import 'services/home_widget.dart';
import 'services/links.dart';
import 'services/live_activity.dart';
import 'services/media_picker.dart';
import 'services/privacy.dart';
import 'services/push.dart';
import 'services/ringtones.dart';
import 'services/screen_wake.dart';
import 'services/settings.dart';
import 'session.dart';
import 'theme/pharaonic.dart' show AppTheme;

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

/// 132 Hidden in the app switcher while the lock is on.
final privacyProvider = Provider<PrivacyGuard>(
  (ref) => const PlatformPrivacyGuard(),
);

final pushServiceProvider = Provider<PushService>(
  (ref) => const NoPushService(),
);

final openExternalProvider = Provider<OpenExternal>((ref) => openExternal);

final chimeProvider = Provider<Chime>(
  (ref) => AssetChime(
    ref.watch(ringerProvider),
    () => ref.read(ringSettingsProvider),
  ),
);

/// 207 The ringtones: the native side (Android shows its pushes itself),
/// the in-app ringer, and the choices.
final ringNativeProvider = Provider<RingNative>((ref) => const NoRingNative());

final ringerProvider = Provider<Ringer>((ref) => AssetRinger());

/// 214 The home-screen widget (Android's AppWidget, iOS's WidgetKit).
final homeWidgetProvider = Provider<HomeWidget>((ref) => const NoHomeWidget());

/// 214 A new order's Live Activity (iPhones).
final liveActivitiesProvider = Provider<LiveActivities>(
  (ref) => const NoLiveActivities(),
);

/// 214 A new order was accepted (or moved on, or refused) in the app: its
/// ongoing notification goes and the home-screen widget reads again.
void orderAnswered(WidgetRef ref, Map<String, String> data) {
  unawaited(ref.read(ringNativeProvider).orderDone(data));
  unawaited(ref.read(homeWidgetProvider).refresh());
}

class RingSettingsController extends Notifier<RingSettings> {
  Map<String, String> _words = const {};

  @override
  RingSettings build() => ref.watch(settingsProvider).ringSettings;

  /// Saves a change on this phone, hands it to Android, and sends it to
  /// the server (tried again at the next start when that fails).
  Future<void> set(RingSettings next) async {
    final before = state;
    state = next;
    // The in-app volume is this phone's alone: nothing to send for it.
    final same = jsonEncode(before.toApiJson()) == jsonEncode(next.toApiJson());
    await ref.read(settingsProvider).setRingSettings(next, sent: same);
    await ref.read(ringNativeProvider).configure(next, _words);
    if (!same) await sendToServer();
  }

  /// The words of Android's channels and actions, in the app's language.
  Future<void> setWords(Map<String, String> words) async {
    if (mapEquals(words, _words)) return;
    _words = words;
    await ref.read(ringNativeProvider).configure(state, words);
  }

  /// Sends the choices unless the server has them (after sign-in, and after
  /// each change while signed in).
  Future<void> sendToServer({bool force = false}) async {
    final settings = ref.read(settingsProvider);
    if (!force && settings.ringSettingsSent) return;
    if (ref.read(sessionProvider) is! SignedIn) return;
    try {
      final zone = await ref.read(ringNativeProvider).timeZone();
      await ref
          .read(apiProvider)
          .setPushSounds(state.toApiJson(timeZone: zone));
      await settings.setRingSettingsSent(true);
    } on Object {
      // Tried again at the next start.
    }
  }
}

final ringSettingsProvider =
    NotifierProvider<RingSettingsController, RingSettings>(
      RingSettingsController.new,
    );

/// 61 Kitchen mode keeps the screen on.
final screenWakeProvider = Provider<ScreenWake>((ref) => WakelockScreenWake());

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

/// 61 Light or dark: the phone's setting unless chosen in Settings ›
/// Appearance (kept on this phone).
class ThemeModeController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() => switch (ref.watch(settingsProvider).theme) {
    'light' => ThemeMode.light,
    'dark' => ThemeMode.dark,
    _ => ThemeMode.system,
  };

  void set(ThemeMode mode) {
    state = mode;
    ref.read(settingsProvider).setTheme(switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => null,
    });
  }
}

final themeModeProvider = NotifierProvider<ThemeModeController, ThemeMode>(
  ThemeModeController.new,
);

/// 215 The app's theme: the default look unless Pharaonic is chosen in
/// Settings › Appearance (kept on this phone).
class AppThemeController extends Notifier<AppTheme> {
  @override
  AppTheme build() => AppTheme.parse(ref.watch(settingsProvider).appTheme);

  void set(AppTheme theme) {
    state = theme;
    ref
        .read(settingsProvider)
        .setAppTheme(theme == AppTheme.standard ? null : theme.name);
  }
}

final appThemeProvider = NotifierProvider<AppThemeController, AppTheme>(
  AppThemeController.new,
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
