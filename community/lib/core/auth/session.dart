import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../api/models.dart';
import '../providers.dart';

/// Where the member is: still restoring the saved session, signed out, or
/// signed in as [me].
sealed class AuthState {
  const AuthState();
}

class AuthRestoring extends AuthState {
  const AuthRestoring();
}

class SignedOut extends AuthState {
  const SignedOut();
}

class SignedInState extends AuthState {
  const SignedInState(this.me, {this.isNew = false});

  final Profile me;

  /// Joined just now (the profile asks for the rest).
  final bool isNew;
}

/// The member's session: restored at launch from the token store, set by
/// any of the sign-in ways, renewed when the access token runs out, ended
/// by Log out (or a refresh token the server refuses).
class SessionController extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(_restore);
    return const AuthRestoring();
  }

  Future<void> _restore() async {
    final saved = await ref.read(tokenStoreProvider).read();
    if (saved == null) {
      state = const SignedOut();
      return;
    }
    ref.read(accessTokenProvider.notifier).set(saved.accessToken);
    try {
      final me = await ref.read(communityApiProvider).me();
      if (state is AuthRestoring) state = SignedInState(me);
    } on ApiException catch (e) {
      if (e.code == ApiException.invalidToken) {
        await _clear();
      } else if (state is AuthRestoring) {
        // Offline: stay signed out of the UI until the next launch; the
        // tokens are kept.
        state = const SignedOut();
      }
    }
  }

  /// After any way of signing in. The account's language and theme become
  /// the app's.
  Future<void> signedIn(SignedIn result) async {
    await ref.read(tokenStoreProvider).write(result.session);
    ref.read(accessTokenProvider.notifier).set(result.session.accessToken);
    _adopt(result.me.account);
    state = SignedInState(result.me, isNew: result.isNew);
  }

  void _adopt(Account? account) {
    if (account == null) return;
    ref.read(languageProvider.notifier).set(account.language);
    ref.read(themeModeProvider.notifier).set(switch (account.theme) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    });
  }

  Future<bool>? _renewing;

  /// New tokens from the refresh token (the API client calls this after a
  /// 401). False, and signed out, when the server refuses it.
  Future<bool> renew() =>
      _renewing ??= _renew().whenComplete(() => _renewing = null);

  Future<bool> _renew() async {
    final store = ref.read(tokenStoreProvider);
    final refresh = (await store.read())?.refreshToken;
    if (refresh == null) {
      await _clear();
      return false;
    }
    try {
      final result = await ref.read(communityApiProvider).refresh(refresh);
      await store.write(result.session);
      ref.read(accessTokenProvider.notifier).set(result.session.accessToken);
      if (state is SignedInState) state = SignedInState(result.me);
      return true;
    } on ApiException catch (e) {
      if (e.code == ApiException.invalidToken ||
          e.code == ApiException.suspended) {
        await _clear();
      }
      return false;
    }
  }

  /// The member's profile, fetched again (after an edit, a link).
  Future<void> refresh() async {
    if (state is! SignedInState) return;
    final me = await ref.read(communityApiProvider).me();
    if (state is SignedInState) state = SignedInState(me);
  }

  void replace(Profile me) {
    if (state is SignedInState) state = SignedInState(me);
  }

  Future<void> signOut() async {
    try {
      await ref.read(communityApiProvider).signOut();
    } on ApiException {
      // Signed out on this phone all the same.
    }
    await _clear();
  }

  /// After the account is deleted.
  Future<void> forget() => _clear();

  Future<void> _clear() async {
    await ref.read(tokenStoreProvider).clear();
    ref.read(accessTokenProvider.notifier).set(null);
    state = const SignedOut();
  }
}

final sessionProvider = NotifierProvider<SessionController, AuthState>(
  SessionController.new,
);

/// The signed-in member, or null.
final meProvider = Provider<Profile?>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedInState ? s.me : null;
});
