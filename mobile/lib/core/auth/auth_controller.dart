import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../api/models/models.dart';
import '../api/offline_cache.dart';
import '../api/yallapp_api.dart';
import '../providers.dart';
import '../storage/local_settings.dart';

sealed class AuthState {
  const AuthState();
  User? get user => null;
  bool get isSignedIn => false;
}

class AuthChecking extends AuthState {
  const AuthChecking();
}

class SignedOut extends AuthState {
  const SignedOut();
}

class SignedIn extends AuthState {
  const SignedIn([this.user]);

  /// Null until `GET /me` answers (for example when offline at start).
  @override
  final User? user;

  @override
  bool get isSignedIn => true;
}

/// The outcome of entering the code.
sealed class VerifyOutcome {
  const VerifyOutcome();
}

class VerifySignedIn extends VerifyOutcome {
  const VerifySignedIn(this.user);
  final User user;
}

class VerifyNeedsSignup extends VerifyOutcome {
  const VerifyNeedsSignup(this.signup);
  final SignupRequired signup;
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

/// Sign-in with a one-time code, sign-up, sign-out and the current student.
class AuthController extends Notifier<AuthState> {
  StreamSubscription<void>? _expired;

  YallappApi get _api => ref.read(yallappApiProvider);

  @override
  AuthState build() {
    final tokens = ref.watch(tokenManagerProvider);
    _expired?.cancel();
    _expired = tokens.sessionExpired.listen((_) => _signedOutLocally());
    ref.onDispose(() => _expired?.cancel());
    Future.microtask(_restore);
    return const AuthChecking();
  }

  Future<void> _restore() async {
    final tokens = ref.read(tokenManagerProvider);
    if (!await tokens.hasSession) {
      state = const SignedOut();
      return;
    }
    state = const SignedIn();
    await reloadUser();
  }

  /// Fetches `GET /me`. Network errors keep the current state.
  Future<void> reloadUser() async {
    try {
      final user = await _api.getMe();
      if (state.isSignedIn) state = SignedIn(user);
    } on ApiException catch (e) {
      if (e.isUnauthorized) _signedOutLocally();
    }
  }

  Future<OtpRequestResult> requestCode({
    required String countryCode,
    required String phone,
  }) => _api.requestOtp(countryCode: countryCode, phone: phone);

  /// 18 Sends a sign-in code by email.
  Future<OtpRequestResult> requestEmailCode({required String email}) =>
      _api.requestEmailCode(email: email);

  /// 18 Signs in with the email and password of an existing account.
  Future<User> signInWithPassword({
    required String email,
    required String password,
  }) async {
    final env = ref.read(appEnvironmentProvider);
    final session = await _api.signInWithPassword(
      email: email,
      password: password,
      device: env.deviceInput,
    );
    await _startSession(session);
    return session.user;
  }

  Future<VerifyOutcome> verifyCode({
    required String requestId,
    required String code,
  }) async {
    final env = ref.read(appEnvironmentProvider);
    final result = await _api.verifyOtp(
      requestId: requestId,
      code: code,
      device: env.deviceInput,
    );
    switch (result) {
      case Session():
        await _startSession(result);
        return VerifySignedIn(result.user);
      case SignupRequired():
        return VerifyNeedsSignup(result);
    }
  }

  Future<User> register({
    required String signupToken,
    required String name,
    String? email,
    String? city,
  }) async {
    final env = ref.read(appEnvironmentProvider);
    final session = await _api.register(
      RegisterInput(
        signupToken: signupToken,
        name: name,
        email: email,
        city: city,
        device: env.deviceInput,
      ),
    );
    await _startSession(session);
    return session.user;
  }

  Future<void> _startSession(Session session) async {
    await ref.read(tokenManagerProvider).save(session.tokens);
    ref.read(localSettingsProvider.notifier).setGuestMode(false);
    state = SignedIn(session.user);
  }

  void updateUser(User user) {
    if (state.isSignedIn) state = SignedIn(user);
  }

  /// Signs this device out on the server (best effort) and locally.
  Future<void> signOut() async {
    try {
      await _api.logout();
    } on ApiException {
      // Already signed out on the server, or offline: sign out locally anyway.
    }
    await ref.read(tokenManagerProvider).clear();
    await _forgetOffline();
    state = const SignedOut();
  }

  /// Deletes the account on the server, then signs out locally.
  Future<void> deleteAccount() async {
    await _api.deleteMe();
    await ref.read(tokenManagerProvider).clear();
    await _forgetOffline();
    state = const SignedOut();
  }

  void _signedOutLocally() {
    unawaited(ref.read(tokenManagerProvider).clear());
    unawaited(_forgetOffline());
    state = const SignedOut();
  }

  /// What offline mode kept may be this user's own: never show it to the next one.
  Future<void> _forgetOffline() async {
    try {
      await ref.read(offlineCacheProvider).clear();
    } on Object {
      // No preferences (tests without them): nothing was kept.
    }
  }
}
