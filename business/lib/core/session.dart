import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/api_exception.dart';
import 'api/models.dart';
import 'providers.dart';

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

  Future<bool> _lockOn() async =>
      ref.read(settingsProvider).biometricLock == true &&
      await ref.read(biometricsProvider).available();

  /// Loads the account (after sign-in, unlock, or to refresh it).
  Future<void> load() async {
    try {
      final me = await ref.read(apiProvider).me();
      _apply(me);
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

  Future<void> signIn(String email, String password) async {
    final device = await ref.read(deviceInfoProvider)();
    final session = await ref
        .read(apiProvider)
        .signIn(email: email, password: password, device: device);
    await ref.read(tokenManagerProvider).save(session);
    final settings = ref.read(settingsProvider);
    // The lock turns on after the first sign-in on a phone that can use it;
    // Settings turns it off.
    if (settings.biometricLock == null &&
        await ref.read(biometricsProvider).available()) {
      await settings.setBiometricLock(true);
    }
    await load();
  }

  Future<bool> unlock(String reason) async {
    final ok = await ref.read(biometricsProvider).authenticate(reason);
    if (ok) await load();
    return ok;
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
    _stopPush();
    await ref.read(apiProvider).signOutAll();
    await _forget();
  }

  Future<void> _forget() async {
    await ref.read(tokenManagerProvider).clear();
    await ref.read(settingsProvider).clearAccount();
    ref.read(selectedAppProvider.notifier).select(null);
    state = const SignedOut();
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
