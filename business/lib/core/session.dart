import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/api_exception.dart';
import 'api/models.dart';
import 'providers.dart';
import 'services/biometrics.dart';

/// 59 Who is using the app and what they may see.
sealed class SessionState {
  const SessionState();
}

class SessionLoading extends SessionState {
  const SessionLoading();
}

class SignedOut extends SessionState {
  const SignedOut({this.expired = false});

  /// The session ended on its own (signed out on another phone, password
  /// changed): the sign-in screen says so.
  final bool expired;
}

/// Signed in, waiting for fingerprint or face.
class Locked extends SessionState {
  const Locked();
}

/// Signed in, but Yallapp can't be reached to load the account.
class Unreachable extends SessionState {
  const Unreachable(this.error);
  final Object error;
}

class SignedIn extends SessionState {
  const SignedIn(this.me);
  final Me me;
}

class SessionController extends Notifier<SessionState> {
  StreamSubscription<void>? _ended;
  StreamSubscription<String>? _tokenRefreshes;

  @override
  SessionState build() {
    _ended = ref.read(tokenManagerProvider).sessionEnded.listen((_) {
      _stopPush();
      state = const SignedOut(expired: true);
    });
    ref.onDispose(() {
      _ended?.cancel();
      _stopPush();
    });
    Future.microtask(_restore);
    return const SessionLoading();
  }

  Future<void> _restore() async {
    if (!await ref.read(tokenManagerProvider).hasSession) {
      state = const SignedOut();
      return;
    }
    if (await _lockOn()) {
      state = const Locked();
      return;
    }
    await load();
  }

  /// 132 On once the person turned it on: a phone whose screen lock was
  /// removed since stays locked (the lock screen says to sign out and use
  /// the password), never opens without it.
  Future<bool> _lockOn() async =>
      ref.read(settingsProvider).biometricLock == true;

  /// 132 The system's prompt is up: the app leaving the screen for it isn't
  /// the person leaving the app. It counts until the app is back in front.
  bool _authenticating = false;
  bool _settling = false;

  /// Whether the app is in the middle of an unlock (or not back from it yet).
  bool get authenticating => _authenticating || _settling;

  /// The app is in front again after an unlock.
  void settled() => _settling = false;

  /// 132 Asks the phone, without changing the session (turning the lock on
  /// or off in Settings asks first).
  Future<UnlockResult> confirmWithPhone(
    String reason, {
    bool pinOnly = false,
  }) async {
    _authenticating = true;
    try {
      return await ref
          .read(biometricsProvider)
          .unlock(reason, pinOnly: pinOnly);
    } finally {
      _authenticating = false;
      // The prompt took the screen: the app comes back in front next.
      final now = WidgetsBinding.instance.lifecycleState;
      _settling = now != null && now != AppLifecycleState.resumed;
    }
  }

  /// 132 Turns the app lock on or off, after the phone said it's them.
  Future<UnlockResult> setLock(bool on, String reason) async {
    final result = await confirmWithPhone(reason);
    if (result == UnlockResult.success) {
      await ref.read(settingsProvider).setBiometricLock(on);
      await ref.read(privacyProvider).setSecure(on);
    }
    return result;
  }

  /// Loads the account (after sign-in, unlock, or to refresh it).
  Future<void> load() async {
    try {
      final me = await ref.read(apiProvider).me();
      _apply(me);
      // 132 The lock screen names the business before the account loads.
      unawaited(ref.read(settingsProvider).setBusinessName(me.business?.name));
      state = SignedIn(me);
      unawaited(_registerPush());
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        await ref.read(tokenManagerProvider).clear();
        state = const SignedOut(expired: true);
      } else if (state is! SignedIn) {
        state = Unreachable(e);
      }
    }
  }

  /// Reloads the account quietly (pull to refresh, after a 403 that says
  /// the account isn't active).
  Future<void> refreshMe() async {
    if (state is! SignedIn) return;
    await load();
  }

  void _apply(Me me) {
    // The dashboard language the person chose follows them here.
    final language = me.user.language;
    if (language != null && language != ref.read(languageProvider)) {
      ref.read(languageProvider.notifier).set(language);
    }
    final selected = ref.read(selectedAppProvider);
    if (selected != null && !me.apps.any((a) => a.id == selected)) {
      ref.read(selectedAppProvider.notifier).select(null);
    }
  }

  /// 70 [otp]: the authenticator app's code, for an account with two-step
  /// sign-in (asked after a `two_factor_required` answer).
  ///
  /// 132 [lockReason]: after the first sign-in on a phone that can use the
  /// lock, the phone asks once (the lock is turned on only when it's them).
  Future<void> signIn(
    String email,
    String password, {
    String? otp,
    String? lockReason,
  }) async {
    final device = await ref.read(deviceInfoProvider)();
    final session = await ref
        .read(apiProvider)
        .signIn(email: email, password: password, device: device, otp: otp);
    await ref.read(tokenManagerProvider).save(session);
    final settings = ref.read(settingsProvider);
    // The lock turns on after the first sign-in on a phone that can use it,
    // once the phone said it's them; Settings turns it off (asking again).
    if (settings.biometricLock == null &&
        lockReason != null &&
        await ref.read(biometricsProvider).available()) {
      final result = await setLock(true, lockReason);
      if (result != UnlockResult.success) {
        await settings.setBiometricLock(false);
      }
    }
    await load();
  }

  /// 132 Unlocks with a face or a fingerprint (the phone's PIN as the
  /// fallback, or [pinOnly]); the account loads only once it succeeded.
  Future<UnlockResult> unlock(String reason, {bool pinOnly = false}) async {
    if (state is! Locked) return UnlockResult.success;
    final result = await confirmWithPhone(reason, pinOnly: pinOnly);
    if (result == UnlockResult.success) await load();
    return result;
  }

  /// Locks again when the app comes back after a while in the background.
  Future<void> lockIfOn() async {
    if (state is SignedIn && await _lockOn()) state = const Locked();
  }

  Future<void> signOut() async {
    _stopPush();
    try {
      await ref.read(apiProvider).signOut();
    } on Object {
      // Offline: the device stays listed until signed out from another one.
    }
    await _forget();
  }

  Future<void> signOutEverywhere() async {
    // 206 Offline, it fails here and the phone stays signed in with its pushes.
    await ref.read(apiProvider).signOutAll();
    _stopPush();
    await _forget();
  }

  Future<void> _forget() async {
    await ref.read(tokenManagerProvider).clear();
    await ref.read(settingsProvider).clearAccount();
    ref.read(selectedAppProvider.notifier).select(null);
    state = const SignedOut();
  }

  /// 60 This phone works on another business the person is on.
  Future<void> setBusiness(String businessId) async {
    final me = await ref.read(apiProvider).setBusiness(businessId);
    ref.read(selectedAppProvider.notifier).select(null);
    _apply(me);
    state = SignedIn(me);
  }

  Future<void> setLanguage(String? code) async {
    ref.read(languageProvider.notifier).set(code);
    if (state case SignedIn()) {
      try {
        final me = await ref.read(apiProvider).setLanguage(code);
        state = SignedIn(me);
      } on ApiException {
        // Kept on this phone; the dashboard keeps its own until next time.
      }
    }
  }

  Future<void> _registerPush() async {
    final push = ref.read(pushServiceProvider);
    if (!push.available) return;
    final api = ref.read(apiProvider);
    final token = await push.token();
    if (token != null) {
      try {
        await api.setPushToken(token);
        // 206 And the phone's ringtones, so its pushes ring with them.
        await ref.read(ringSettingsProvider.notifier).sendToServer();
      } on ApiException {
        // Tried again on the next start.
      }
    }
    await _tokenRefreshes?.cancel();
    _tokenRefreshes = push.tokenRefreshes.listen((token) async {
      try {
        await ref.read(apiProvider).setPushToken(token);
      } on ApiException {
        // Tried again on the next start.
      }
    });
  }

  void _stopPush() {
    _tokenRefreshes?.cancel();
    _tokenRefreshes = null;
  }
}

final sessionProvider = NotifierProvider<SessionController, SessionState>(
  SessionController.new,
);

final meProvider = Provider<Me?>((ref) {
  final state = ref.watch(sessionProvider);
  return state is SignedIn ? state.me : null;
});

/// The app the owner is looking at (the app switcher).
class SelectedAppController extends Notifier<String?> {
  @override
  String? build() => ref.watch(settingsProvider).selectedApp;

  void select(String? id) {
    state = id;
    ref.read(settingsProvider).setSelectedApp(id);
  }
}

final selectedAppProvider = NotifierProvider<SelectedAppController, String?>(
  SelectedAppController.new,
);

/// The current app: the chosen one, or the only one.
final currentAppProvider = Provider<AppSummary?>((ref) {
  final me = ref.watch(meProvider);
  if (me == null || me.apps.isEmpty) return null;
  final id = ref.watch(selectedAppProvider);
  for (final app in me.apps) {
    if (app.id == id) return app;
  }
  return me.apps.length == 1 ? me.apps.first : null;
});

/// The current app's ID, for the data providers (they're never built
/// without one: the router keeps the owner on the switcher until then).
final appIdProvider = Provider<String>(
  (ref) => ref.watch(currentAppProvider)?.id ?? '',
);
