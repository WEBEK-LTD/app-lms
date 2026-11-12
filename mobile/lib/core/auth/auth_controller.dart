import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../api/models/models.dart';
import '../api/offline_cache.dart';
import '../api/yallapp_api.dart';
import '../providers.dart';
import '../storage/local_settings.dart';
import '../web/web_view.dart';

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

/// 118 A forgotten password's code was right: choose the new password.
class VerifyNeedsNewPassword extends VerifyOutcome {
  const VerifyNeedsNewPassword(this.resetToken);
  final String resetToken;
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

  /// 18 Signs in with the email and password of an existing account; 118 in
  /// a Studio app also with the phone number or the username.
  Future<User> signInWithPassword({
    String? email,
    String? countryCode,
    String? phone,
    String? username,
    required String password,
  }) async {
    final env = ref.read(appEnvironmentProvider);
    final session = await _api.signInWithPassword(
      email: email,
      countryCode: countryCode,
      phone: phone,
      username: username,
      password: password,
      device: env.deviceInput,
    );
    await _startSession(session);
    return session.user;
  }

  /// 118 [reset]: the code is for a forgotten password.
  Future<VerifyOutcome> verifyCode({
    required String requestId,
    required String code,
    bool reset = false,
  }) async {
    final env = ref.read(appEnvironmentProvider);
    final result = await _api.verifyOtp(
      requestId: requestId,
      code: code,
      device: env.deviceInput,
      reset: reset,
    );
    switch (result) {
      case Session():
        await _startSession(result);
        return VerifySignedIn(result.user);
      case SignupRequired():
        return VerifyNeedsSignup(result);
      case PasswordReset():
        return VerifyNeedsNewPassword(result.resetToken);
    }
  }

  /// 118 Sets the new password after a forgotten password's code, and signs in.
  Future<User> resetPassword({
    required String resetToken,
    required String password,
  }) async {
    final env = ref.read(appEnvironmentProvider);
    final session = await _api.resetPassword(
      resetToken: resetToken,
      password: password,
      device: env.deviceInput,
    );
    await _startSession(session);
    return session.user;
  }

  /// 118 Changes the password; the account's other phones are signed out.
  Future<void> changePassword({
    required String currentPassword,
    required String password,
  }) =>
      _api.changePassword(currentPassword: currentPassword, password: password);

  Future<User> register({
    required String signupToken,
    required String name,
    String? email,
    String? city,
    String? username,
    String? password,
  }) async {
    final env = ref.read(appEnvironmentProvider);
    final session = await _api.register(
      RegisterInput(
        signupToken: signupToken,
        name: name,
        email: email,
        city: city,
        username: username,
        password: password,
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
    // 124.9 The website the app's pages signed them in to signs them out too.
    await clearWebSessions();
    try {
      await ref.read(offlineCacheProvider).clear();
      // 28 Their tickets too.
      await ref.read(sharedPreferencesProvider).remove(ticketWalletKey);
      // 63 And their member codes.
      await ref.read(sharedPreferencesProvider).remove(membershipWalletKey);
      // 112.1 And their Home, Work and recent places.
      await ref.read(sharedPreferencesProvider).remove(savedPlacesKey);
    } on Object {
      // No preferences (tests without them): nothing was kept.
    }
  }
}
